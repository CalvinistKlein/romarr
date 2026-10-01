"""
Background Queue Scheduler & Progress Monitor.
Polls download clients (qBittorrent / simulated tasks), updates queue states, and dispatches organization.
"""

import asyncio
import logging
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.database import AsyncSessionLocal
from backend.app.models.models import DownloadQueueItem, Game
from backend.app.services.settings_service import get_app_settings
from backend.app.services.qbit import QBitClient
from backend.app.services.organizer import RomOrganizer

log = logging.getLogger("romarr.scheduler")


async def update_download_queue_task():
    """Periodic background worker to update download progress and trigger completion."""
    async with AsyncSessionLocal() as db:
        try:
            app_settings = await get_app_settings(db)

            result = await db.execute(
                select(DownloadQueueItem).where(
                    DownloadQueueItem.status.in_(["queued", "downloading", "extracting"])
                )
            )
            active_items = result.scalars().all()
            if not active_items:
                return

            qbit = QBitClient(
                base_url=app_settings.get("qbittorrent_url", "http://localhost:8080"),
                username=app_settings.get("qbittorrent_username", "admin"),
                password=app_settings.get("qbittorrent_password", "adminadmin"),
                category=app_settings.get("qbittorrent_category", "romarr")
            )

            organizer = RomOrganizer(
                roms_root_dir=app_settings.get("roms_root_dir", "/roms"),
                os_structure=app_settings.get("os_structure", "batocera"),
                auto_extract=app_settings.get("auto_extract_archives", True),
                enable_rom_links=app_settings.get("enable_rom_links", True),
                rom_links_dir_name=app_settings.get("rom_links_dir_name", "ROM_links"),
            )

            for item in active_items:
                if item.download_id and item.download_id.startswith("mock"):
                    # Simulate smooth progress for demonstration / offline use
                    item.status = "downloading"
                    item.progress = min(100.0, item.progress + 25.0)
                    item.download_speed = 15 * 1024 * 1024  # 15 MB/s
                    item.eta_seconds = max(0, int((100.0 - item.progress) / 25 * 3))

                    if item.progress >= 100.0:
                        item.status = "completed"
                        item.completed_at = datetime.now(timezone.utc)
                        if item.game_id:
                            await organizer.organize_game_file(
                                db=db,
                                game_id=item.game_id,
                                source_path=f"/downloads/{item.release_title}",
                                release_title=item.release_title
                            )
                else:
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

        except Exception as exc:
            log.error("Scheduler error updating queue: %s", exc, exc_info=True)


async def start_scheduler_loop():
    """Continuous async loop running every 4 seconds."""
    log.info("Queue scheduler started.")
    while True:
        await update_download_queue_task()
        await asyncio.sleep(4)
