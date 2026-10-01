import os
import json
import logging
from typing import Any, Dict, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.models.models import AppSetting
from backend.app.core.config import settings
from backend.app.core.security import (
    SENSITIVE_SETTING_KEYS,
    encrypt_value,
    decrypt_value,
    is_redacted,
)

log = logging.getLogger("romarr.settings_service")

DEFAULT_SETTINGS = {
    "prowlarr_url": os.getenv("PROWLARR_URL", "http://host.docker.internal:9696"),
    "prowlarr_api_key": "",
    "qbittorrent_url": os.getenv("QBITTORRENT_URL", "http://host.docker.internal:8080"),
    "qbittorrent_username": "admin",
    "qbittorrent_password": "adminadmin",
    "qbittorrent_category": "romarr",
    "roms_root_dir": settings.ROMS_DIR,
    "downloads_dir": settings.DOWNLOADS_DIR,
    "os_structure": "batocera",  # batocera, retropie, recalbox, es-de
    "preferred_regions": ["USA", "EUR", "JPN", "WORLD", "TRANSLATION"],
    "auto_extract_archives": True,
    "delete_archive_after_extraction": True,
    "igdb_client_id": "",
    "igdb_client_secret": ""
}


async def get_app_settings(db: AsyncSession) -> Dict[str, Any]:
    """
    Retrieve all application settings combined with defaults.
    Sensitive values are decrypted transparently for internal use.
    Do NOT expose this dict directly to API responses — use
    security.mask_settings_for_response() first.
    """
    result = await db.execute(select(AppSetting))
    rows = result.scalars().all()

    current = dict(DEFAULT_SETTINGS)
    for row in rows:
        try:
            raw = json.loads(row.value)
        except Exception:
            raw = row.value

        # Decrypt sensitive values stored encrypted
        if row.key in SENSITIVE_SETTING_KEYS and isinstance(raw, str):
            raw = decrypt_value(raw)

        current[row.key] = raw

    return current


async def get_setting(db: AsyncSession, key: str, default: Any = None) -> Any:
    """Retrieve a single setting value (decrypted if sensitive)."""
    result = await db.execute(select(AppSetting).where(AppSetting.key == key))
    row = result.scalars().first()
    if not row:
        return DEFAULT_SETTINGS.get(key, default)
    try:
        raw = json.loads(row.value)
    except Exception:
        raw = row.value

    if key in SENSITIVE_SETTING_KEYS and isinstance(raw, str):
        raw = decrypt_value(raw)
    return raw


async def set_setting(db: AsyncSession, key: str, value: Any) -> None:
    """
    Set or update a single setting value.
    Sensitive values are encrypted before storage.
    If the caller sends back the redaction placeholder, the existing value
    is preserved (i.e. the update for that key is skipped).
    """
    if key in SENSITIVE_SETTING_KEYS and isinstance(value, str) and is_redacted(value):
        log.debug("Skipping update for %s — redaction placeholder received.", key)
        return

    # Encrypt sensitive string values
    if key in SENSITIVE_SETTING_KEYS and isinstance(value, str) and value:
        value = encrypt_value(value)

    result = await db.execute(select(AppSetting).where(AppSetting.key == key))
    row = result.scalars().first()
    json_val = json.dumps(value)

    if row:
        row.value = json_val
    else:
        new_row = AppSetting(key=key, value=json_val)
        db.add(new_row)
    await db.commit()


async def update_settings(db: AsyncSession, updates: Dict[str, Any]) -> Dict[str, Any]:
    """Batch update settings. Returns the full settings dict (with masked values)."""
    for key, value in updates.items():
        await set_setting(db, key, value)
    return await get_app_settings(db)
