import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any, List
from pydantic import BaseModel, field_validator
import shutil
from pathlib import Path

from backend.app.core.database import get_db
from backend.app.core.auth import require_api_key
from backend.app.core.config import settings
from backend.app.core.security import mask_settings_for_response
from backend.app.services.settings_service import get_app_settings, update_settings
from backend.app.services.prowlarr import ProwlarrClient
from backend.app.services.qbit import QBitClient

log = logging.getLogger("romarr.api.settings")

router = APIRouter(prefix="/settings", tags=["Settings"], dependencies=[Depends(require_api_key)])

_ALLOWED_OS_STRUCTURES = {"batocera", "retropie", "recalbox", "es-de"}


class SettingsUpdate(BaseModel):
    prowlarr_url: str
    prowlarr_api_key: str
    qbittorrent_url: str
    qbittorrent_username: str
    qbittorrent_password: str
    qbittorrent_category: str
    roms_root_dir: str
    downloads_dir: str
    os_structure: str  # "batocera", "retropie", "recalbox", "es-de"
    preferred_regions: List[str]
    auto_extract_archives: bool
    delete_archive_after_extraction: bool
    igdb_client_id: str
    igdb_client_secret: str

    @field_validator("os_structure")
    @classmethod
    def validate_os_structure(cls, v: str) -> str:
        if v not in _ALLOWED_OS_STRUCTURES:
            raise ValueError(f"os_structure must be one of {sorted(_ALLOWED_OS_STRUCTURES)}")
        return v

    @field_validator("roms_root_dir", "downloads_dir")
    @classmethod
    def validate_path_prefix(cls, v: str) -> str:
        """Block attempts to set storage paths outside allowed prefixes."""
        resolved = str(Path(v).resolve())
        allowed = settings.ALLOWED_PATH_PREFIXES
        if not any(resolved.startswith(prefix) for prefix in allowed):
            raise ValueError(
                f"Path '{v}' is outside allowed directories: {allowed}. "
                "Update ALLOWED_PATH_PREFIXES in config to add new roots."
            )
        return resolved


@router.get("")
async def get_settings_endpoint(db: AsyncSession = Depends(get_db)):
    """Return settings with sensitive values masked."""
    raw = await get_app_settings(db)
    return mask_settings_for_response(raw)


@router.put("")
async def save_settings(data: SettingsUpdate, db: AsyncSession = Depends(get_db)):
    """Save settings. Redacted placeholder values are ignored (existing value kept)."""
    updated = await update_settings(db, data.model_dump())
    return mask_settings_for_response(updated)


@router.post("/test-prowlarr")
async def test_prowlarr(db: AsyncSession = Depends(get_db)):
    app_settings = await get_app_settings(db)
    client = ProwlarrClient(
        base_url=app_settings.get("prowlarr_url", ""),
        api_key=app_settings.get("prowlarr_api_key", "")
    )
    return await client.test_connection()


@router.post("/test-qbittorrent")
async def test_qbittorrent(db: AsyncSession = Depends(get_db)):
    app_settings = await get_app_settings(db)
    client = QBitClient(
        base_url=app_settings.get("qbittorrent_url", ""),
        username=app_settings.get("qbittorrent_username", ""),
        password=app_settings.get("qbittorrent_password", "")
    )
    return await client.test_connection()


@router.get("/system-status")
async def system_status(db: AsyncSession = Depends(get_db)):
    app_settings = await get_app_settings(db)
    roms_path = Path(app_settings.get("roms_root_dir", "/roms"))

    disk_total = disk_used = disk_free = 0
    try:
        usage = shutil.disk_usage(roms_path if roms_path.exists() else "/")
        disk_total = usage.total
        disk_used = usage.used
        disk_free = usage.free
    except Exception as exc:
        log.warning("Failed to read disk usage for %s: %s", roms_path, exc)

    return {
        "roms_dir": str(roms_path),
        "os_structure": app_settings.get("os_structure", "batocera"),
        "disk_total_bytes": disk_total,
        "disk_used_bytes": disk_used,
        "disk_free_bytes": disk_free,
        "preferred_regions": app_settings.get("preferred_regions", ["USA", "EUR", "JPN"])
    }
