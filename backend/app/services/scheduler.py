"""
Background Queue Scheduler & Progress Monitor.
Polls download clients (qBittorrent), updates queue states, and dispatches organization.
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
            result = await db.execute(
                select(DownloadQueueItem).where(
                    DownloadQueueItem.status.in_(["queued", "downloading", "extracting", "organizing"])
                )
            )
            active_items = result.scalars().all()
            if not active_items:
                return

            app_settings = await get_app_settings(db)

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

            torrents = await qbit.get_active_downloads()

            for item in active_items:
                # Find matching torrent in qBittorrent
                matched = None
                if item.download_id and not item.download_id.startswith("mock") and not item.download_id.startswith("qbit_"):
                    matched = next((t for t in torrents if t.get("hash", "").lower() == item.download_id.lower()), None)

                # Fallback matching by torrent release title / name
                if not matched and torrents:
                    for t in torrents:
                        t_name = (t.get("name") or "").strip().lower()
                        i_title = (item.release_title or "").strip().lower()
                        if t_name and i_title and (t_name == i_title or t_name in i_title or i_title in t_name):
                            matched = t
                            break

                if matched:
                    # Sync info_hash if we didn't have it yet
                    t_hash = matched.get("hash")
                    if t_hash and item.download_id != t_hash:
                        item.download_id = t_hash

                    progress = round(matched.get("progress", 0.0) * 100, 1)
                    item.progress = progress
                    item.download_speed = matched.get("dlspeed", 0)
                    eta = matched.get("eta", 0)
                    item.eta_seconds = eta if (eta and eta < 8640000) else 0
                    state = matched.get("state", "downloading")

                    # Check completion state
                    is_complete = progress >= 100.0 or state in ["uploading", "pausedUP", "stoppedUP", "forcedUP", "complete"]

                    if not is_complete:
                        if item.status != "downloading":
                            item.status = "downloading"
                    else:
                        # Torrent complete — start organization/importing
                        item.progress = 100.0
                        item.download_speed = 0
                        item.eta_seconds = 0
                        item.status = "organizing"
                        await db.commit()

                        if item.game_id:
                            content_path = matched.get("content_path") or f"/downloads/{matched.get('name', item.release_title)}"
                            log.info("Triggering organizer for game_id=%d, content_path=%s", item.game_id, content_path)
                            await organizer.organize_game_file(
                                db=db,
                                game_id=item.game_id,
                                source_path=content_path,
                                release_title=item.release_title,
                                queue_item=item
                            )
                else:
                    # No matched torrent found yet; keep queued or check if failed
                    log.debug("No active qBittorrent download matched for item '%s' (hash=%s)", item.release_title, item.download_id)

            await db.commit()

        except Exception as exc:
            log.error("Scheduler error updating queue: %s", exc, exc_info=True)


async def start_scheduler_loop():
    """Continuous async loop running every 4 seconds."""
    log.info("Queue scheduler started.")
    while True:
        await update_download_queue_task()
        await asyncio.sleep(4)
