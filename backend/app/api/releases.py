from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from pydantic import BaseModel

from backend.app.core.database import get_db
from backend.app.models.models import Game, DownloadQueueItem
from backend.app.services.settings_service import get_app_settings
from backend.app.services.prowlarr import ProwlarrClient
from backend.app.services.qbit import QBitClient
from backend.app.services.region_parser import parse_release_title

router = APIRouter(prefix="/releases", tags=["Releases"])

class GrabReleaseRequest(BaseModel):
    game_id: int
    release_title: str
    download_url: str
    info_hash: Optional[str] = None
    size_bytes: Optional[int] = 0
    indexer: Optional[str] = "Prowlarr"

@router.get("")
async def search_releases(
    game_id: int,
    region: Optional[str] = Query(None, description="Region filter: USA, EUR, JPN, WORLD, TRANSLATION, ALL"),
    db: AsyncSession = Depends(get_db)
):
    """
    Search indexers (Prowlarr/Torznab) for releases of a specific game.
    Supports filtering and ranking by region (USA, Europe, Japan, etc.).
    """
    result = await db.execute(select(Game).where(Game.id == game_id))
    game = result.scalars().first()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    settings = await get_app_settings(db)
    prowlarr = ProwlarrClient(
        base_url=settings.get("prowlarr_url", ""),
        api_key=settings.get("prowlarr_api_key", "")
    )

    # Use game's preferred region as top priority, followed by global region preferences
    pref_regions = [game.preferred_region] + [r for r in settings.get("preferred_regions", []) if r != game.preferred_region]

    releases = await prowlarr.search_releases(
        query=game.title,
        platform_id=game.platform_id,
        preferred_regions=pref_regions,
        region_filter=region
    )

    return {
        "game_id": game.id,
        "game_title": game.title,
        "platform_id": game.platform_id,
        "region_filter_applied": region or "ALL",
        "total_results": len(releases),
        "releases": releases
    }

@router.post("/grab")
async def grab_release(data: GrabReleaseRequest, db: AsyncSession = Depends(get_db)):
    """Add a specific release to the download queue and client."""
    result = await db.execute(select(Game).where(Game.id == data.game_id))
    game = result.scalars().first()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    # Prevent duplicate queue entries for the same game
    existing_q = await db.execute(
        select(DownloadQueueItem).where(
            DownloadQueueItem.game_id == data.game_id,
            DownloadQueueItem.status.in_(["queued", "downloading", "extracting"])
        )
    )
    if existing_q.scalars().first():
        raise HTTPException(status_code=409, detail="An active download already exists for this game.")

    parsed = parse_release_title(data.release_title)
    settings = await get_app_settings(db)

    # Create queue item
    queue_item = DownloadQueueItem(
        game_id=game.id,
        release_title=data.release_title,
        download_client="qbittorrent",
        download_id=data.info_hash or f"mock_{game.id}",
        status="downloading",
        progress=5.0,
        size_bytes=data.size_bytes,
        region=parsed.region.value,
        format=parsed.format,
        indexer=data.indexer or "Prowlarr",
        download_url=data.download_url
    )
    db.add(queue_item)
    game.status = "downloading"
    await db.commit()
    await db.refresh(queue_item)

    # Send to qBittorrent if configured
    qbit = QBitClient(
        base_url=settings.get("qbittorrent_url", ""),
        username=settings.get("qbittorrent_username", ""),
        password=settings.get("qbittorrent_password", "")
    )
    if data.download_url and not data.download_url.startswith("magnet:?xt=urn:btih:mock"):
        await qbit.add_download(data.download_url)

    return {
        "message": f"Grabbed release '{data.release_title}'",
        "queue_id": queue_item.id
    }
