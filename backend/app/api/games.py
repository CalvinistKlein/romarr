from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import re

from backend.app.core.database import get_db
from backend.app.models.models import Game, DownloadQueueItem
from backend.app.services.platforms import PLATFORMS
from backend.app.services.settings_service import get_app_settings
from backend.app.services.prowlarr import ProwlarrClient
from backend.app.services.qbit import QBitClient
from backend.app.services.region_parser import parse_release_title

router = APIRouter(prefix="/games", tags=["Games"])

class GameCreate(BaseModel):
    title: str
    slug: Optional[str] = None
    platform_id: str
    igdb_id: Optional[int] = None
    summary: Optional[str] = None
    cover_url: Optional[str] = None
    banner_url: Optional[str] = None
    release_year: Optional[int] = None
    developer: Optional[str] = None
    publisher: Optional[str] = None
    genres: Optional[List[str]] = []
    preferred_region: Optional[str] = "USA"
    auto_search_on_add: Optional[bool] = True

class GameUpdate(BaseModel):
    preferred_region: Optional[str] = None
    status: Optional[str] = None

@router.get("")
async def list_games(
    platform_id: Optional[str] = None,
    status: Optional[str] = None,
    query: Optional[str] = None,
    region: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Game)
    if platform_id:
        stmt = stmt.where(Game.platform_id == platform_id)
    if status:
        stmt = stmt.where(Game.status == status)
    if query:
        stmt = stmt.where(Game.title.ilike(f"%{query}%"))
    if region:
        stmt = stmt.where(Game.preferred_region == region)
    
    stmt = stmt.order_by(Game.title.asc())
    result = await db.execute(stmt)
    games = result.scalars().all()

    return [
        {
            "id": g.id,
            "title": g.title,
            "slug": g.slug,
            "platform_id": g.platform_id,
            "platform_name": g.platform_name,
            "igdb_id": g.igdb_id,
            "summary": g.summary,
            "cover_url": g.cover_url,
            "banner_url": g.banner_url,
            "release_year": g.release_year,
            "developer": g.developer,
            "publisher": g.publisher,
            "genres": g.genres.split(", ") if g.genres else [],
            "status": g.status,
            "preferred_region": g.preferred_region,
            "file_path": g.file_path,
            "file_size_bytes": g.file_size_bytes,
            "created_at": g.created_at,
        }
        for g in games
    ]

@router.post("")
async def add_game(data: GameCreate, db: AsyncSession = Depends(get_db)):
    # Check if game already exists for this platform
    result = await db.execute(
        select(Game).where(Game.title == data.title, Game.platform_id == data.platform_id)
    )
    existing = result.scalars().first()
    if existing:
        raise HTTPException(status_code=400, detail="Game already exists in library for this platform.")

    p_info = PLATFORMS.get(data.platform_id)
    p_name = p_info.name if p_info else data.platform_id.upper()
    slug = data.slug or re.sub(r"[^a-z0-9\-]", "", data.title.lower().replace(" ", "-").replace(":", "").replace("'", ""))

    game = Game(
        title=data.title,
        slug=slug,
        platform_id=data.platform_id,
        platform_name=p_name,
        igdb_id=data.igdb_id,
        summary=data.summary,
        cover_url=data.cover_url,
        banner_url=data.banner_url,
        release_year=data.release_year,
        developer=data.developer,
        publisher=data.publisher,
        genres=", ".join(data.genres) if data.genres else "",
        status="wanted",
        preferred_region=data.preferred_region or "USA"
    )
    db.add(game)
    await db.commit()
    await db.refresh(game)

    # If auto search requested, perform search and grab highest ranked release
    if data.auto_search_on_add:
        app_settings = await get_app_settings(db)
        prowlarr = ProwlarrClient(
            base_url=app_settings.get("prowlarr_url", ""),
            api_key=app_settings.get("prowlarr_api_key", "")
        )
        pref_regions = [game.preferred_region] + [r for r in app_settings.get("preferred_regions", []) if r != game.preferred_region]
        
        releases = await prowlarr.search_releases(
            query=game.title,
            platform_id=game.platform_id,
            preferred_regions=pref_regions
        )

        if releases:
            best_release = releases[0]
            parsed = parse_release_title(best_release["title"])
            
            queue_item = DownloadQueueItem(
                game_id=game.id,
                release_title=best_release["title"],
                download_client="qbittorrent",
                download_id=best_release.get("info_hash") or f"mock_{game.id}",
                status="downloading",
                progress=5.0,
                size_bytes=best_release.get("size_bytes", 0),
                region=parsed.region.value,
                format=parsed.format,
                indexer=best_release.get("indexer", "Prowlarr"),
                download_url=best_release.get("download_url")
            )
            db.add(queue_item)
            game.status = "downloading"
            await db.commit()
            await db.refresh(game)

            # Dispatch to real qBittorrent if available
            qbit = QBitClient(
                base_url=app_settings.get("qbittorrent_url", ""),
                username=app_settings.get("qbittorrent_username", ""),
                password=app_settings.get("qbittorrent_password", "")
            )
            if best_release.get("download_url"):
                await qbit.add_download(best_release["download_url"])

    return {"message": "Game added successfully", "game_id": game.id}

@router.get("/{game_id}")
async def get_game(game_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Game).where(Game.id == game_id))
    game = result.scalars().first()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    return {
        "id": game.id,
        "title": game.title,
        "slug": game.slug,
        "platform_id": game.platform_id,
        "platform_name": game.platform_name,
        "igdb_id": game.igdb_id,
        "summary": game.summary,
        "cover_url": game.cover_url,
        "banner_url": game.banner_url,
        "release_year": game.release_year,
        "developer": game.developer,
        "publisher": game.publisher,
        "genres": game.genres.split(", ") if game.genres else [],
        "status": game.status,
        "preferred_region": game.preferred_region,
        "file_path": game.file_path,
        "file_size_bytes": game.file_size_bytes,
        "created_at": game.created_at,
    }

@router.delete("/{game_id}")
async def delete_game(game_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Game).where(Game.id == game_id))
    game = result.scalars().first()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    await db.delete(game)
    await db.commit()
    return {"message": f"Game '{game.title}' removed from library."}
