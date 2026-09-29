"""
Background Queue Scheduler & Progress Monitor.
Polls download clients (qBittorrent / simulated tasks), updates queue states, and dispatches organization.
"""

import asyncio
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.database import AsyncSessionLocal
from backend.app.models.models import DownloadQueueItem, Game
from backend.app.services.settings_service import get_app_settings
from backend.app.services.qbit import QBitClient
from backend.app.services.organizer import RomOrganizer

async def update_download_queue_task():
    """Periodic background worker to update download progress and trigger completion."""
    async with AsyncSessionLocal() as db:
        try:
            settings = await get_app_settings(db)
            
            # Fetch active queue items
            result = await db.execute(
                select(DownloadQueueItem).where(
                    DownloadQueueItem.status.in_(["queued", "downloading", "extracting"])
                )
            )
            active_items = result.scalars().all()
            if not active_items:
                return

            qbit = QBitClient(
                base_url=settings.get("qbittorrent_url", "http://localhost:8080"),
                username=settings.get("qbittorrent_username", "admin"),
                password=settings.get("qbittorrent_password", "adminadmin"),
                category=settings.get("qbittorrent_category", "romarr")
            )

            organizer = RomOrganizer(
                roms_root_dir=settings.get("roms_root_dir", "/roms"),
                os_structure=settings.get("os_structure", "batocera"),
                auto_extract=settings.get("auto_extract_archives", True)
            )

            for item in active_items:
                if item.download_id and item.download_id.startswith("mock"):
                    # Simulate smooth progress for demonstration / offline use
                    item.status = "downloading"
                    item.progress = min(100.0, item.progress + 25.0)
                    item.download_speed = 15 * 1024 * 1024 # 15 MB/s
                    item.eta_seconds = max(0, int((100.0 - item.progress) / 25 * 3))

                    if item.progress >= 100.0:
                        item.status = "completed"
                        item.completed_at = datetime.now(timezone.utc)
                        # Trigger organizer
                        if item.game_id:
                            await organizer.organize_game_file(
                                db=db,
                                game_id=item.game_id,
                                source_path=f"/downloads/{item.release_title}",
                                release_title=item.release_title
                            )
                else:
                    # Real qBittorrent check
                    torrents = await qbit.get_active_downloads()
                    matched = next((t for t in torrents if t.get("hash") == item.download_id), None)
                    if matched:
                        item.progress = round(matched.get("progress", 0.0) * 100, 1)
                        item.download_speed = matched.get("dlspeed", 0)
                        item.eta_seconds = matched.get("eta", 0)
                        state = matched.get("state", "downloading")

                        if item.progress >= 100.0 or state in ["uploading", "pausedUP", "complete"]:
                            item.status = "completed"
                            item.completed_at = datetime.now(timezone.utc)
                            if item.game_id:
                                await organizer.organize_game_file(
                                    db=db,
                                    game_id=item.game_id,
                                    source_path=matched.get("content_path", f"/downloads/{item.release_title}"),
                                    release_title=item.release_title
                                )

            await db.commit()
        except Exception as e:
            print(f"[Scheduler] Error updating queue: {e}")

async def start_scheduler_loop():
    """Continuous async loop running every 5 seconds."""
    while True:
        await update_download_queue_task()
        await asyncio.sleep(4)
