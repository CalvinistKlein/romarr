import logging
import re
from pathlib import Path
from typing import List, Optional
from pydantic import BaseModel, field_validator

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.app.core.database import get_db
from backend.app.core.auth import require_api_key
from backend.app.models.models import Game, DownloadQueueItem
from backend.app.services.platforms import PLATFORMS
from backend.app.services.settings_service import get_app_settings
from backend.app.services.prowlarr import ProwlarrClient
from backend.app.services.qbit import QBitClient
from backend.app.services.region_parser import parse_release_title

log = logging.getLogger("romarr.api.games")

router = APIRouter(prefix="/games", tags=["Games"], dependencies=[Depends(require_api_key)])

_SAFE_URL_RE = re.compile(r"^https://", re.IGNORECASE)


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

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("title must not be empty.")
        if len(v) > 255:
            raise ValueError("title must be 255 characters or fewer.")
        return v

    @field_validator("summary")
    @classmethod
    def validate_summary(cls, v: Optional[str]) -> Optional[str]:
        if v and len(v) > 5000:
            raise ValueError("summary must be 5000 characters or fewer.")
        return v

    @field_validator("cover_url", "banner_url")
    @classmethod
    def validate_image_url(cls, v: Optional[str]) -> Optional[str]:
        if v and not v.startswith("https://"):
            raise ValueError("Image URLs must use HTTPS.")
        return v

    @field_validator("release_year")
    @classmethod
    def validate_year(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and not (1950 <= v <= 2100):
            raise ValueError("release_year must be between 1950 and 2100.")
        return v

    @field_validator("platform_id")
    @classmethod
    def validate_platform_id(cls, v: str) -> str:
        if len(v) > 50:
            raise ValueError("platform_id too long.")
        return v.lower().strip()


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
    log.info("Added game '%s' (platform=%s, id=%d).", game.title, game.platform_id, game.id)

    if data.auto_search_on_add:
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

            qbit = QBitClient(
                base_url=app_settings.get("qbittorrent_url", ""),
                username=app_settings.get("qbittorrent_username", ""),
                password=app_settings.get("qbittorrent_password", "")
            )
            dl_url = best_release.get("download_url", "")
            if dl_url and not dl_url.startswith("magnet:?xt=urn:btih:mock"):
                await qbit.add_download(dl_url)

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
    log.info("Deleted game '%s' (id=%d).", game.title, game_id)
    return {"message": f"Game '{game.title}' removed from library."}


@router.get("/{game_id}/download")
async def download_game_file(game_id: int, db: AsyncSession = Depends(get_db)):
    """Download the ROM file for a game directly to the browsing device."""
    from fastapi.responses import FileResponse
    result = await db.execute(select(Game).where(Game.id == game_id))
    game = result.scalars().first()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    if not game.file_path:
        raise HTTPException(status_code=404, detail="No ROM file found in library for this game.")

    p = Path(game.file_path)
    if not p.exists() or not p.is_file():
        raise HTTPException(status_code=404, detail=f"ROM file '{p.name}' does not exist on disk.")

    return FileResponse(
        path=str(p),
        filename=p.name,
        media_type="application/octet-stream",
    )
