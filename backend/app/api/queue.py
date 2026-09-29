from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from backend.app.core.database import get_db
from backend.app.models.models import DownloadQueueItem, Game
from backend.app.services.settings_service import get_app_settings
from backend.app.services.qbit import QBitClient

router = APIRouter(prefix="/queue", tags=["Queue"])

@router.get("")
async def list_queue(db: AsyncSession = Depends(get_db)):
    stmt = (
        select(DownloadQueueItem, Game.title.label("game_title"), Game.platform_id, Game.cover_url)
        .outerjoin(Game, DownloadQueueItem.game_id == Game.id)
        .order_by(DownloadQueueItem.added_at.desc())
    )
    result = await db.execute(stmt)
    rows = result.all()

    queue_items = []
    for item, game_title, platform_id, cover_url in rows:
        queue_items.append({
            "id": item.id,
            "game_id": item.game_id,
            "game_title": game_title or "Unknown Game",
            "platform_id": platform_id or "unknown",
            "cover_url": cover_url,
            "release_title": item.release_title,
            "status": item.status,
            "progress": round(item.progress, 1),
            "download_speed": item.download_speed,
            "eta_seconds": item.eta_seconds,
            "size_bytes": item.size_bytes,
            "region": item.region,
            "format": item.format,
            "indexer": item.indexer,
            "added_at": item.added_at,
            "completed_at": item.completed_at,
            "error_message": item.error_message
        })

    return queue_items

@router.delete("/{queue_id}")
async def cancel_queue_item(queue_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DownloadQueueItem).where(DownloadQueueItem.id == queue_id))
    item = result.scalars().first()
    if not item:
        raise HTTPException(status_code=404, detail="Queue item not found")

    settings = await get_app_settings(db)
    if item.download_id and not item.download_id.startswith("mock"):
        qbit = QBitClient(
            base_url=settings.get("qbittorrent_url", ""),
            username=settings.get("qbittorrent_username", ""),
            password=settings.get("qbittorrent_password", "")
        )
        await qbit.delete_download(item.download_id, delete_files=True)

    # Revert game status if needed
    if item.game_id:
        g_res = await db.execute(select(Game).where(Game.id == item.game_id))
        game = g_res.scalars().first()
        if game and game.status == "downloading":
            game.status = "wanted"

    await db.delete(item)
    await db.commit()
    return {"message": "Queue item removed."}
