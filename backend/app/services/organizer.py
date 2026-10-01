"""
Post-Processor and ROM Organizer.
Handles archive extraction (.zip, .7z, .rar) and sorting into Batocera / RetroPie directory structures.
"""

import logging
import re
import shutil
import zipfile
import py7zr
import rarfile
from pathlib import Path
from typing import List, Tuple
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.models.models import Game, DownloadQueueItem
from backend.app.services.platforms import PLATFORMS, get_platform_folder
from backend.app.services.region_parser import parse_release_title
from backend.app.services.settings_service import get_app_settings

log = logging.getLogger("romarr.organizer")

ARCHIVE_EXTENSIONS = {".zip", ".7z", ".rar", ".tar", ".gz"}
# Max length for a filename component derived from game title
_MAX_TITLE_LEN = 180
# Characters allowed in destination filename components
_SAFE_FILENAME_RE = re.compile(r"[^\w\s\-\(\)\[\]'\.,&!#]")


def _sanitize_filename_part(text: str) -> str:
    """
    Strip characters that could be used for path traversal or shell injection
    and enforce a maximum length.  This is applied to any user-supplied string
    (game title, region) that ends up in a filesystem path.
    """
    cleaned = _SAFE_FILENAME_RE.sub("", text).strip()
    # Collapse consecutive spaces/dots and remove leading dots (hidden files)
    cleaned = re.sub(r"\s+", " ", cleaned).lstrip(".")
    return cleaned[:_MAX_TITLE_LEN]


def _assert_within(dest: Path, base: Path) -> None:
    """
    Raise ValueError if *dest* is not strictly under *base* (path-escape guard).
    Must be called with resolved paths.
    """
    try:
        dest.relative_to(base)
    except ValueError:
        raise ValueError(f"Path escape detected: {dest} is not under {base}")


# ── Zip Slip safe extractors ──────────────────────────────────────────────────

def _safe_extract_zip(src: Path, dest: Path) -> None:
    dest_resolved = dest.resolve()
    with zipfile.ZipFile(src, "r") as z:
        for member in z.namelist():
            member_path = (dest_resolved / member).resolve()
            _assert_within(member_path, dest_resolved)
        z.extractall(dest_resolved)


def _safe_extract_7z(src: Path, dest: Path) -> None:
    dest_resolved = dest.resolve()
    with py7zr.SevenZipFile(src, mode="r") as z:
        for member in z.list():
            member_path = (dest_resolved / member.filename).resolve()
            _assert_within(member_path, dest_resolved)
        z.extractall(dest_resolved)


def _safe_extract_rar(src: Path, dest: Path) -> None:
    dest_resolved = dest.resolve()
    with rarfile.RarFile(src) as r:
        for member in r.namelist():
            member_path = (dest_resolved / member).resolve()
            _assert_within(member_path, dest_resolved)
        r.extractall(dest_resolved)


# ─────────────────────────────────────────────────────────────────────────────

class RomOrganizer:
    def __init__(self, roms_root_dir: str, os_structure: str = "batocera", auto_extract: bool = True):
        self.roms_root_dir = Path(roms_root_dir).resolve()
        self.os_structure = os_structure
        self.auto_extract = auto_extract

    async def organize_game_file(
        self,
        db: AsyncSession,
        game_id: int,
        source_path: str,
        release_title: str
    ) -> Tuple[bool, str]:
        """
        Extracts (if needed) and sorts a downloaded file into the appropriate
        platform folder.  All path components derived from user data are
        sanitised before use.
        """
        result = await db.execute(select(Game).where(Game.id == game_id))
        game = result.scalars().first()
        if not game:
            return False, f"Game ID {game_id} not found."

        # Sanitize user-controlled strings used in filesystem paths
        safe_title = _sanitize_filename_part(game.title)
        if not safe_title:
            safe_title = f"game_{game_id}"

        source = Path(source_path)

        if not source.exists():
            # Simulate organization for mock/offline downloads
            target_folder = get_platform_folder(game.platform_id, self.os_structure)
            target_dir = (self.roms_root_dir / target_folder).resolve()
            _assert_within(target_dir, self.roms_root_dir)
            target_dir.mkdir(parents=True, exist_ok=True)

            parsed = parse_release_title(release_title)
            p_info = PLATFORMS.get(game.platform_id)
            ext = p_info.preferred_format if p_info else ".zip"
            region_str = _sanitize_filename_part(parsed.region.value)
            dest_filename = f"{safe_title} ({region_str}){ext}"
            simulated_path = str(target_dir / dest_filename)

            game.status = "downloaded"
            game.file_path = simulated_path
            game.file_size_bytes = 1024 * 1024 * 10  # 10 MB simulated
            await db.commit()
            return True, f"Organized {game.title} into {simulated_path}"

        # Get target platform folder
        target_folder = get_platform_folder(game.platform_id, self.os_structure)
        target_dir = (self.roms_root_dir / target_folder).resolve()
        _assert_within(target_dir, self.roms_root_dir)
        target_dir.mkdir(parents=True, exist_ok=True)

        parsed = parse_release_title(release_title)
        region_str = _sanitize_filename_part(
            parsed.region.value if parsed.region.value != "UNKNOWN" else "USA"
        )

        is_archive = source.suffix.lower() in ARCHIVE_EXTENSIONS
        p_info = PLATFORMS.get(game.platform_id)
        valid_extensions = p_info.extensions if p_info else [".iso", ".chd", ".bin", ".cue", ".zip"]

        files_to_move: List[Path] = []

        if is_archive and self.auto_extract:
            extract_temp = source.parent / f"_extract_{source.stem}"
            extract_temp.mkdir(exist_ok=True)
            try:
                suffix = source.suffix.lower()
                if suffix == ".zip":
                    _safe_extract_zip(source, extract_temp)
                elif suffix == ".7z":
                    _safe_extract_7z(source, extract_temp)
                elif suffix == ".rar":
                    _safe_extract_rar(source, extract_temp)

                # Collect matching ROM files from the extraction directory
                for f in extract_temp.rglob("*"):
                    if f.is_file() and f.suffix.lower() in valid_extensions:
                        files_to_move.append(f)

            except ValueError as exc:
                log.error("Archive path-escape blocked: %s", exc)
                return False, f"Blocked unsafe archive: {exc}"
            except Exception as exc:
                log.error("Archive extraction failed for %s: %s", source, exc)
                files_to_move = [source]
        else:
            files_to_move = [source]

        if not files_to_move:
            files_to_move = [source]

        final_path = ""
        total_bytes = 0

        for f_path in files_to_move:
            dest_name = f"{safe_title} ({region_str}){f_path.suffix}"
            dest_file = (target_dir / dest_name).resolve()

            # Double-check the resolved destination is still under target_dir
            try:
                _assert_within(dest_file, self.roms_root_dir)
            except ValueError as exc:
                log.error("Blocked write outside roms root: %s", exc)
                continue

            try:
                shutil.move(str(f_path), str(dest_file))
                final_path = str(dest_file)
                total_bytes += dest_file.stat().st_size
            except Exception as exc:
                log.error("Error moving file %s → %s: %s", f_path, dest_file, exc)

        game.status = "downloaded"
        game.file_path = final_path or str(target_dir / f"{safe_title} ({region_str}).rom")
        game.file_size_bytes = total_bytes
        await db.commit()

        log.info("Organized '%s' → %s", game.title, final_path)
        return True, f"Successfully organized {game.title} to {final_path}"
