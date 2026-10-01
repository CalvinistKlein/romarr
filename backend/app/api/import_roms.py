"""
ROM Import & File Upload API.
Supports uploading single files, ZIP/7Z/RAR archives, and entire directory structures.
Auto-detects console/platform from folder paths and file extensions, extracts archives safely,
organizes ROMs into /roms/<platform>/, and creates flat symlinks in /roms/ROM_links/.
"""

import os
import re
import json
import shutil
import logging
from pathlib import Path
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from backend.app.core.database import get_db
from backend.app.core.auth import require_api_key
from backend.app.core.config import settings
from backend.app.models.models import Game
from backend.app.services.platforms import PLATFORMS, get_platform_folder
from backend.app.services.region_parser import parse_release_title
from backend.app.services.settings_service import get_app_settings
from backend.app.services.organizer import RomOrganizer, _safe_extract_zip, _safe_extract_7z, _safe_extract_rar, _sanitize_filename_part

log = logging.getLogger("romarr.api.import")

router = APIRouter(prefix="/import", tags=["Import"], dependencies=[Depends(require_api_key)])

ARCHIVE_EXTS = {".zip", ".7z", ".rar", ".tar", ".gz"}

# Distinctive extension to platform mapping
EXTENSION_TO_PLATFORM = {
    ".sfc": "snes",
    ".smc": "snes",
    ".nes": "nes",
    ".fds": "nes",
    ".z64": "n64",
    ".n64": "n64",
    ".v64": "n64",
    ".rvz": "gamecube",
    ".gcm": "gamecube",
    ".gcz": "gamecube",
    ".wbfs": "wii",
    ".wua": "wiiu",
    ".rpx": "wiiu",
    ".wud": "wiiu",
    ".wux": "wiiu",
    ".nsp": "switch",
    ".xci": "switch",
    ".nsz": "switch",
    ".gb": "gb",
    ".gbc": "gbc",
    ".gba": "gba",
    ".nds": "nds",
    ".3ds": "3ds",
    ".cia": "3ds",
    ".cxi": "3ds",
    ".vpk": "psvita",
    ".sms": "mastersystem",
    ".md": "megadrive",
    ".gen": "megadrive",
    ".cdi": "dreamcast",
    ".gdi": "dreamcast",
    ".gg": "gamegear",
    ".xbe": "xbox",
    ".god": "xbox360",
    ".xex": "xbox360",
    ".pce": "pcengine",
    ".neo": "neogeo",
}

# Folder keywords to platform ID
FOLDER_HINTS = {
    "snes": "snes",
    "super nintendo": "snes",
    "nes": "nes",
    "nintendo": "nes",
    "n64": "n64",
    "nintendo 64": "n64",
    "gamecube": "gamecube",
    "gc": "gamecube",
    "wii": "wii",
    "wiiu": "wiiu",
    "wii u": "wiiu",
    "switch": "switch",
    "nswitch": "switch",
    "gb": "gb",
    "game boy": "gb",
    "gameboy": "gb",
    "gbc": "gbc",
    "game boy color": "gbc",
    "gba": "gba",
    "game boy advance": "gba",
    "nds": "nds",
    "nintendo ds": "nds",
    "3ds": "3ds",
    "nintendo 3ds": "3ds",
    "psx": "psx",
    "ps1": "psx",
    "playstation": "psx",
    "ps2": "ps2",
    "playstation 2": "ps2",
    "ps3": "ps3",
    "playstation 3": "ps3",
    "ps4": "ps4",
    "psp": "psp",
    "psvita": "psvita",
    "vita": "psvita",
    "genesis": "megadrive",
    "megadrive": "megadrive",
    "mega drive": "megadrive",
    "segacd": "segacd",
    "sega cd": "segacd",
    "saturn": "saturn",
    "sega saturn": "saturn",
    "dreamcast": "dreamcast",
    "mastersystem": "mastersystem",
    "master system": "mastersystem",
    "gamegear": "gamegear",
    "game gear": "gamegear",
    "xbox": "xbox",
    "xbox360": "xbox360",
    "xbox 360": "xbox360",
    "arcade": "arcade",
    "mame": "arcade",
    "fbneo": "arcade",
    "neogeo": "neogeo",
    "neo geo": "neogeo",
    "pcengine": "pcengine",
    "pc engine": "pcengine",
    "tg16": "pcengine",
    "turbografx": "pcengine",
}


def detect_platform(filename: str, folder_hint: str = "") -> Optional[str]:
    """Detect platform from folder path hint or unique file extension."""
    suffix = Path(filename).suffix.lower()

    # 1. Check folder hint first
    if folder_hint:
        # Normalize folder hint
        parts = re.split(r"[/\\_\-\s]+", folder_hint.lower())
        for part in reversed(parts):
            if part in FOLDER_HINTS:
                return FOLDER_HINTS[part]
        for key, p_id in FOLDER_HINTS.items():
            if key in folder_hint.lower():
                return p_id

    # 2. Check unique extension
    if suffix in EXTENSION_TO_PLATFORM:
        return EXTENSION_TO_PLATFORM[suffix]

    # 3. For .chd, .iso, .cue, .bin, check if filename contains platform cues
    fn_lower = filename.lower()
    for key, p_id in FOLDER_HINTS.items():
        if f"[{key}]" in fn_lower or f"({key})" in fn_lower:
            return p_id

    # 4. Default fallbacks for disc images
    if suffix in {".chd", ".cue", ".bin", ".pbp"}:
        return "psx"
    if suffix in {".iso", ".cso"}:
        return "ps2"

    return None


class ScanFolderRequest(BaseModel):
    folder_path: str
    platform_id: Optional[str] = None
    auto_extract: bool = True


@router.get("/platforms")
async def get_import_platforms():
    """Return available platforms for the manual selector in the Import UI."""
    return [
        {"id": p.id, "name": p.name, "extensions": p.extensions, "icon": p.icon}
        for p in PLATFORMS.values()
    ]


@router.post("/upload")
async def upload_and_import_roms(
    files: List[UploadFile] = File(...),
    paths: Optional[str] = Form(None),
    platform_id: Optional[str] = Form(None),
    auto_extract: bool = Form(True),
    db: AsyncSession = Depends(get_db)
):
    """
    Upload and import ROM files, ZIP/7Z/RAR archives, or complete directory trees.
    """
    app_settings = await get_app_settings(db)
    roms_root = app_settings.get("roms_root_dir", "/roms")
    os_structure = app_settings.get("os_structure", "batocera")
    enable_rom_links = app_settings.get("enable_rom_links", True)
    rom_links_dir_name = app_settings.get("rom_links_dir_name", "ROM_links")

    organizer = RomOrganizer(
        roms_root_dir=roms_root,
        os_structure=os_structure,
        auto_extract=auto_extract,
        enable_rom_links=enable_rom_links,
        rom_links_dir_name=rom_links_dir_name,
    )

    # Parse relative paths mapping if provided (JSON array from folder upload)
    rel_paths_list: List[str] = []
    if paths:
        try:
            rel_paths_list = json.loads(paths)
        except Exception:
            rel_paths_list = []

    # Temporary staging directory
    temp_dir = Path(settings.DATA_DIR) / "temp_imports" / os.urandom(8).hex()
    temp_dir.mkdir(parents=True, exist_ok=True)

    imported_items = []
    skipped_items = []
    errors = []

    try:
        # 1. Save uploaded files to staging
        staged_files: List[Dict[str, Any]] = []
        for idx, file_item in enumerate(files):
            rel_path = rel_paths_list[idx] if idx < len(rel_paths_list) else file_item.filename
            safe_rel = rel_path.lstrip("/\\")

            target_staged_path = temp_dir / safe_rel
            target_staged_path.parent.mkdir(parents=True, exist_ok=True)

            with target_staged_path.open("wb") as buffer:
                shutil.copyfileobj(file_item.file, buffer)

            folder_hint = str(Path(safe_rel).parent) if str(Path(safe_rel).parent) != "." else ""
            staged_files.append({
                "path": target_staged_path,
                "orig_filename": file_item.filename,
                "folder_hint": folder_hint,
            })

        # 2. Process archives and files
        files_to_organize: List[Dict[str, Any]] = []

        for item in staged_files:
            p = item["path"]
            suffix = p.suffix.lower()

            if suffix in ARCHIVE_EXTS and auto_extract:
                extract_dest = p.parent / f"_extracted_{p.stem}"
                extract_dest.mkdir(parents=True, exist_ok=True)
                try:
                    if suffix == ".zip":
                        _safe_extract_zip(p, extract_dest)
                    elif suffix == ".7z":
                        _safe_extract_7z(p, extract_dest)
                    elif suffix == ".rar":
                        _safe_extract_rar(p, extract_dest)

                    for extracted_file in extract_dest.rglob("*"):
                        if extracted_file.is_file() and extracted_file.suffix.lower() not in ARCHIVE_EXTS:
                            inner_hint = str(extracted_file.parent.relative_to(extract_dest))
                            combo_hint = f"{item['folder_hint']}/{inner_hint}" if item['folder_hint'] else inner_hint
                            files_to_organize.append({
                                "path": extracted_file,
                                "orig_filename": extracted_file.name,
                                "folder_hint": combo_hint,
                            })
                except Exception as exc:
                    log.error("Failed to extract %s: %s", p.name, exc)
                    errors.append(f"Failed to extract {p.name}: {str(exc)}")
                    # Still try to import the archive as-is if supported
                    files_to_organize.append(item)
            else:
                files_to_organize.append(item)

        # 3. Import each ROM file into the library
        for rom_info in files_to_organize:
            f_path = rom_info["path"]
            suffix = f_path.suffix.lower()

            # Ignore non-game metadata or system files
            if suffix in {".txt", ".nfo", ".jpg", ".png", ".srm", ".state", ".db", ".ds_store"} or f_path.name.startswith("."):
                continue

            # Determine platform
            chosen_platform = platform_id
            if not chosen_platform or chosen_platform == "auto":
                chosen_platform = detect_platform(f_path.name, rom_info["folder_hint"])

            if not chosen_platform or chosen_platform not in PLATFORMS:
                skipped_items.append({
                    "filename": f_path.name,
                    "reason": "Could not auto-detect console/platform. Select a platform to force import."
                })
                continue

            p_info = PLATFORMS[chosen_platform]
            parsed = parse_release_title(f_path.stem)
            game_title = parsed.clean_title or f_path.stem
            region_str = parsed.region.value if parsed.region.value != "UNKNOWN" else "USA"

            # Check if game already exists
            res = await db.execute(
                select(Game).where(Game.title == game_title, Game.platform_id == chosen_platform)
            )
            game = res.scalars().first()

            if not game:
                game = Game(
                    title=game_title,
                    slug=re.sub(r"[^a-z0-9\-]", "", game_title.lower().replace(" ", "-").replace(":", "")),
                    platform_id=chosen_platform,
                    platform_name=p_info.name,
                    summary=f"Imported ROM: {f_path.name}",
                    status="downloaded",
                    preferred_region=region_str,
                )
                db.add(game)
                await db.commit()
                await db.refresh(game)

            # Organize file to /roms/<platform>/
            success, msg = await organizer.organize_game_file(
                db=db,
                game_id=game.id,
                source_path=str(f_path),
                release_title=f_path.name
            )

            if success:
                imported_items.append({
                    "id": game.id,
                    "title": game.title,
                    "platform": p_info.name,
                    "platform_id": chosen_platform,
                    "region": region_str,
                    "file_name": Path(game.file_path).name if game.file_path else f_path.name,
                    "size_bytes": game.file_size_bytes,
                })
            else:
                errors.append(f"Failed to organize {game_title}: {msg}")

    finally:
        # Clean up staging directory
        try:
            shutil.rmtree(temp_dir, ignore_errors=True)
        except Exception:
            pass

    return {
        "success": True,
        "imported_count": len(imported_items),
        "skipped_count": len(skipped_items),
        "errors_count": len(errors),
        "imported": imported_items,
        "skipped": skipped_items,
        "errors": errors,
    }
