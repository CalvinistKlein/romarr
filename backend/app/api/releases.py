import logging
from urllib.parse import urlparse
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from pydantic import BaseModel, field_validator

from backend.app.core.database import get_db
from backend.app.core.auth import require_api_key
from backend.app.models.models import Game, DownloadQueueItem
from backend.app.services.settings_service import get_app_settings
from backend.app.services.prowlarr import ProwlarrClient
from backend.app.services.qbit import QBitClient
from backend.app.services.region_parser import parse_release_title

log = logging.getLogger("romarr.api.releases")

router = APIRouter(prefix="/releases", tags=["Releases"], dependencies=[Depends(require_api_key)])

_ALLOWED_URL_SCHEMES = {"http", "https", "magnet"}


def _validate_download_url(url: str) -> str:
    """
    Allow only http/https/magnet schemes and basic structural checks.
    This prevents arbitrary SSRF payloads being injected into qBittorrent.
    """
    if not url:
        raise HTTPException(status_code=400, detail="download_url must not be empty.")
    parsed = urlparse(url)
    if parsed.scheme not in _ALLOWED_URL_SCHEMES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid download_url scheme '{parsed.scheme}'. Allowed: {sorted(_ALLOWED_URL_SCHEMES)}."
        )
    if parsed.scheme == "magnet":
        if not url.startswith("magnet:?xt=urn:btih:"):
            raise HTTPException(status_code=400, detail="Malformed magnet link.")
    elif parsed.scheme in {"http", "https"}:
        if not parsed.netloc:
            raise HTTPException(status_code=400, detail="download_url has no host.")
    return url


class GrabReleaseRequest(BaseModel):
    game_id: int
    release_title: str
    download_url: str
    info_hash: Optional[str] = None
    size_bytes: Optional[int] = 0
    indexer: Optional[str] = "Prowlarr"

    @field_validator("download_url")
    @classmethod
    def validate_url(cls, v: str) -> str:
        parsed = urlparse(v)
        if parsed.scheme not in _ALLOWED_URL_SCHEMES:
            raise ValueError(f"Invalid URL scheme '{parsed.scheme}'.")
        if parsed.scheme == "magnet" and not v.startswith("magnet:?xt=urn:btih:"):
            raise ValueError("Malformed magnet link.")
        if parsed.scheme in {"http", "https"} and not parsed.netloc:
            raise ValueError("URL has no host.")
        return v

    @field_validator("release_title")
    @classmethod
    def validate_title(cls, v: str) -> str:
        if len(v) > 500:
            raise ValueError("release_title too long (max 500 chars).")
        return v


@router.get("")
async def search_releases(
    game_id: int,
    region: Optional[str] = None,
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

    app_settings = await get_app_settings(db)
    prowlarr = ProwlarrClient(
        base_url=app_settings.get("prowlarr_url", ""),
        api_key=app_settings.get("prowlarr_api_key", "")
    )

    pref_regions = [game.preferred_region] + [
        r for r in app_settings.get("preferred_regions", []) if r != game.preferred_region
    ]

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

    # Re-validate URL (defence-in-depth even though Pydantic already validated)
    _validate_download_url(data.download_url)

    parsed = parse_release_title(data.release_title)
    app_settings = await get_app_settings(db)

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

    # Send to qBittorrent if configured and URL is not a mock
    qbit = QBitClient(
        base_url=app_settings.get("qbittorrent_url", ""),
        username=app_settings.get("qbittorrent_username", ""),
        password=app_settings.get("qbittorrent_password", "")
    )
    if data.download_url and not data.download_url.startswith("magnet:?xt=urn:btih:mock"):
        await qbit.add_download(data.download_url)
        log.info("Dispatched '%s' (game_id=%d) to qBittorrent.", data.release_title, game.id)

    return {
        "message": f"Grabbed release '{data.release_title}'",
        "queue_id": queue_item.id
    }
