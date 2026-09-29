from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any, List
from pydantic import BaseModel
import shutil
from pathlib import Path

from backend.app.core.database import get_db
from backend.app.services.settings_service import get_app_settings, update_settings
from backend.app.services.prowlarr import ProwlarrClient
from backend.app.services.qbit import QBitClient

router = APIRouter(prefix="/settings", tags=["Settings"])

class SettingsUpdate(BaseModel):
    prowlarr_url: str
    prowlarr_api_key: str
    qbittorrent_url: str
    qbittorrent_username: str
    qbittorrent_password: str
    qbittorrent_category: str
    roms_root_dir: str
    downloads_dir: str
    os_structure: str # "batocera", "retropie", "recalbox", "es-de"
    preferred_regions: List[str]
    auto_extract_archives: bool
    delete_archive_after_extraction: bool
    igdb_client_id: str
    igdb_client_secret: str

@router.get("")
async def get_settings(db: AsyncSession = Depends(get_db)):
    return await get_app_settings(db)

@router.put("")
async def save_settings(data: SettingsUpdate, db: AsyncSession = Depends(get_db)):
    updated = await update_settings(db, data.model_dump())
    return updated

@router.post("/test-prowlarr")
async def test_prowlarr(db: AsyncSession = Depends(get_db)):
    settings = await get_app_settings(db)
    client = ProwlarrClient(
        base_url=settings.get("prowlarr_url", ""),
        api_key=settings.get("prowlarr_api_key", "")
    )
    res = await client.test_connection()
    return res

@router.post("/test-qbittorrent")
async def test_qbittorrent(db: AsyncSession = Depends(get_db)):
    settings = await get_app_settings(db)
    client = QBitClient(
        base_url=settings.get("qbittorrent_url", ""),
        username=settings.get("qbittorrent_username", ""),
        password=settings.get("qbittorrent_password", "")
    )
    res = await client.test_connection()
    return res

@router.get("/system-status")
async def system_status(db: AsyncSession = Depends(get_db)):
    settings = await get_app_settings(db)
    roms_path = Path(settings.get("roms_root_dir", "/roms"))
    
    # Calculate disk usage
    disk_total = 0
    disk_used = 0
    disk_free = 0
    try:
        usage = shutil.disk_usage(roms_path if roms_path.exists() else "/")
        disk_total = usage.total
        disk_used = usage.used
        disk_free = usage.free
    except Exception:
        pass

    return {
        "roms_dir": str(roms_path),
        "os_structure": settings.get("os_structure", "batocera"),
        "disk_total_bytes": disk_total,
        "disk_used_bytes": disk_used,
        "disk_free_bytes": disk_free,
        "preferred_regions": settings.get("preferred_regions", ["USA", "EUR", "JPN"])
    }
