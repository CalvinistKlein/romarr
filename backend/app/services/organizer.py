"""
Post-Processor and ROM Organizer.
Handles archive extraction (.zip, .7z, .rar) and sorting into Batocera / RetroPie directory structures.

After every real-file organization, if `enable_rom_links` is set, a relative
symlink is created (or refreshed) in:

    <roms_root_dir>/<rom_links_dir_name>/

The link name format is:
    <title> (<region>) [<platform_id>]<ext>

The [platform_id] bracket disambiguates games with the same title on different
platforms (e.g. "Rayman (USA) [psx].chd" vs "Rayman (USA) [ps2].iso").

The symlink is relative, so it survives if the entire roms_root_dir tree is
moved as a unit (e.g. to a new drive letter on Windows or a different mount
point on Linux).
"""

import logging
import os
import re
import shutil
import zipfile
import py7zr
import rarfile
from pathlib import Path
from typing import List, Optional, Tuple
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.models.models import Game, DownloadQueueItem
from backend.app.services.platforms import PLATFORMS, get_platform_folder
from backend.app.services.region_parser import parse_release_title
from backend.app.services.settings_service import get_app_settings

log = logging.getLogger("romarr.organizer")

ARCHIVE_EXTENSIONS = {".zip", ".7z", ".rar", ".tar", ".gz"}
_MAX_TITLE_LEN = 180
_SAFE_FILENAME_RE = re.compile(r"[^\w\s\-\(\)\[\]'\.,&!#]")


# ── Filename sanitization ─────────────────────────────────────────────────────

def _sanitize_filename_part(text: str) -> str:
    """
    Strip characters that could be used for path traversal or shell injection
    and enforce a maximum length.  Applied to any user-supplied string that
    ends up in a filesystem path.
    """
    cleaned = _SAFE_FILENAME_RE.sub("", text).strip()
    cleaned = re.sub(r"\s+", " ", cleaned).lstrip(".")
    return cleaned[:_MAX_TITLE_LEN]


def _assert_within(dest: Path, base: Path) -> None:
    """
    Raise ValueError if *dest* is not strictly under *base* (path-escape guard).
    Call with resolved paths only.
    """
    try:
        dest.relative_to(base)
    except ValueError:
        raise ValueError(f"Path escape detected: {dest} is not under {base}")


# ── Zip Slip-safe extractors ──────────────────────────────────────────────────

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


# ── ROM link helpers ──────────────────────────────────────────────────────────

def _link_name(safe_title: str, region_str: str, platform_id: str, suffix: str) -> str:
    """Build the canonical symlink filename for a ROM."""
    safe_platform = _sanitize_filename_part(platform_id)
    return f"{safe_title} ({region_str}) [{safe_platform}]{suffix}"


def _upsert_symlink(target: Path, link: Path) -> None:
    """
    Create or refresh a symlink at *link* pointing to *target*.
    Uses a relative path so the tree is portable.
    Silently replaces stale or broken links.
    """
    try:
        rel = Path(os.path.relpath(target, link.parent))
        if link.is_symlink():
            if link.resolve() == target.resolve():
                return  # Already correct — nothing to do
            link.unlink()
        elif link.exists():
            # A real file somehow occupies the link path — don't clobber it
            log.warning("ROM_links slot already occupied by a real file: %s", link)
            return
        link.symlink_to(rel)
        log.info("ROM link: %s → %s", link.name, rel)
    except Exception as exc:
        log.warning("Failed to create ROM link %s: %s", link, exc)


def _remove_symlink(link: Path) -> None:
    """Remove a symlink if it exists and is indeed a symlink."""
    if link.is_symlink():
        try:
            link.unlink()
            log.info("Removed ROM link: %s", link.name)
        except Exception as exc:
            log.warning("Failed to remove ROM link %s: %s", link, exc)


# ─────────────────────────────────────────────────────────────────────────────

class RomOrganizer:
    def __init__(
        self,
        roms_root_dir: str,
        os_structure: str = "batocera",
        auto_extract: bool = True,
        enable_rom_links: bool = True,
        rom_links_dir_name: str = "ROM_links",
    ):
        self.roms_root_dir = Path(roms_root_dir).resolve()
        self.os_structure = os_structure
        self.auto_extract = auto_extract
        self.enable_rom_links = enable_rom_links
        self.rom_links_dir_name = _sanitize_filename_part(rom_links_dir_name) or "ROM_links"

    @property
    def links_dir(self) -> Path:
        """Absolute path to the ROM_links directory."""
        return self.roms_root_dir / self.rom_links_dir_name

    def _ensure_links_dir(self) -> Optional[Path]:
        """
        Create the ROM_links directory if it doesn't exist.
        Returns the directory path, or None if links are disabled.
        """
        if not self.enable_rom_links:
            return None
        d = self.links_dir
        d.mkdir(parents=True, exist_ok=True)
        return d

    def _add_link(self, rom_file: Path, safe_title: str, region_str: str, platform_id: str) -> None:
        """Create / refresh a symlink for *rom_file* in the ROM_links directory."""
        links_dir = self._ensure_links_dir()
        if links_dir is None:
            return
        link_name = _link_name(safe_title, region_str, platform_id, rom_file.suffix)
        link_path = links_dir / link_name
        _upsert_symlink(rom_file, link_path)

    def _remove_link(self, safe_title: str, region_str: str, platform_id: str, suffix: str) -> None:
        """Remove the symlink for a ROM (called when a game is deleted/replaced)."""
        if not self.enable_rom_links:
            return
        link_name = _link_name(safe_title, region_str, platform_id, suffix)
        link_path = self.links_dir / link_name
        _remove_symlink(link_path)

    async def rebuild_all_rom_links(self, db: AsyncSession) -> Tuple[int, int]:
        """
        Walk every game with a file_path in the DB and rebuild the ROM_links
        directory from scratch.  Returns (created, removed) counts.

        Existing links that no longer correspond to any DB entry are pruned.
        """
        links_dir = self._ensure_links_dir()
        if links_dir is None:
            return 0, 0

        # Collect all current links (keyed by name) before we start
        existing_link_names = {
            p.name for p in links_dir.iterdir() if p.is_symlink()
        }
        expected_link_names: set[str] = set()
        created = 0

        result = await db.execute(select(Game).where(Game.file_path.isnot(None)))
        games = result.scalars().all()

        for game in games:
            if not game.file_path:
                continue
            rom_path = Path(game.file_path)
            if not rom_path.exists():
                continue

            safe_title = _sanitize_filename_part(game.title) or f"game_{game.id}"
            region_str = _sanitize_filename_part(
                game.preferred_region if game.preferred_region else "UNKNOWN"
            )

            link_name = _link_name(safe_title, region_str, game.platform_id, rom_path.suffix)
            expected_link_names.add(link_name)
            link_path = links_dir / link_name
            _upsert_symlink(rom_path, link_path)
            created += 1

        # Remove stale links that are no longer in the DB
        stale = existing_link_names - expected_link_names
        removed = 0
        for stale_name in stale:
            stale_path = links_dir / stale_name
            _remove_symlink(stale_path)
            removed += 1

        log.info("ROM links rebuild complete: %d created/updated, %d stale removed.", created, removed)
        return created, removed

    # ── Main organize entry point ─────────────────────────────────────────────

    async def organize_game_file(
        self,
        db: AsyncSession,
        game_id: int,
        source_path: str,
        release_title: str,
        queue_item: Optional[DownloadQueueItem] = None,
    ) -> Tuple[bool, str]:
        """
        Extracts (if needed) and sorts a downloaded file into the appropriate
        platform folder.  All path components derived from user data are
        sanitised before use.  A ROM link is created/refreshed after each
        successful file placement.
        """
        result = await db.execute(select(Game).where(Game.id == game_id))
        game = result.scalars().first()
        if not game:
            if queue_item:
                queue_item.status = "failed"
                queue_item.error_message = f"Game ID {game_id} not found."
                await db.commit()
            return False, f"Game ID {game_id} not found."

        safe_title = _sanitize_filename_part(game.title)
        if not safe_title:
            safe_title = f"game_{game_id}"

        source = Path(source_path)

        # ── Verify source file path ───────────────────────────────────────────
        if not source.exists():
            log.warning("Source path '%s' does not exist on disk for game '%s'", source_path, game.title)
            if queue_item:
                queue_item.status = "failed"
                queue_item.error_message = f"Downloaded source file not found at '{source_path}'."
                await db.commit()
            return False, f"Source file '{source_path}' does not exist on disk."

        # ── Real file path ────────────────────────────────────────────────────
        target_folder = get_platform_folder(game.platform_id, self.os_structure)
        target_dir = (self.roms_root_dir / target_folder).resolve()
        _assert_within(target_dir, self.roms_root_dir)
        target_dir.mkdir(parents=True, exist_ok=True)

        parsed = parse_release_title(release_title)
        region_str = _sanitize_filename_part(
            parsed.region.value if parsed.region.value != "UNKNOWN" else "USA"
        )

        p_info = PLATFORMS.get(game.platform_id)
        valid_extensions = p_info.extensions if p_info else [".iso", ".chd", ".bin", ".cue", ".zip"]

        files_to_move: List[Path] = []

        if source.is_dir():
            # Torrent downloaded as a directory
            if queue_item:
                queue_item.status = "organizing"
                await db.commit()

            # Check if directory contains archives or raw roms
            for item in source.rglob("*"):
                if not item.is_file() or item.name.startswith("."):
                    continue
                suffix = item.suffix.lower()
                if suffix in ARCHIVE_EXTENSIONS and self.auto_extract:
                    if queue_item:
                        queue_item.status = "extracting"
                        await db.commit()
                    extract_temp = item.parent / f"_extract_{item.stem}"
                    extract_temp.mkdir(exist_ok=True)
                    try:
                        if suffix == ".zip":
                            _safe_extract_zip(item, extract_temp)
                        elif suffix == ".7z":
                            _safe_extract_7z(item, extract_temp)
                        elif suffix == ".rar":
                            _safe_extract_rar(item, extract_temp)
                        for f in extract_temp.rglob("*"):
                            if f.is_file() and f.suffix.lower() in valid_extensions:
                                files_to_move.append(f)
                    except Exception as exc:
                        log.error("Folder archive extraction failed for %s: %s", item, exc)
                elif suffix in valid_extensions:
                    files_to_move.append(item)
        else:
            is_archive = source.suffix.lower() in ARCHIVE_EXTENSIONS
            if is_archive and self.auto_extract:
                if queue_item:
                    queue_item.status = "extracting"
                    await db.commit()

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

                    for f in extract_temp.rglob("*"):
                        if f.is_file() and f.suffix.lower() in valid_extensions:
                            files_to_move.append(f)

                except ValueError as exc:
                    log.error("Archive path-escape blocked: %s", exc)
                    if queue_item:
                        queue_item.status = "failed"
                        queue_item.error_message = f"Blocked unsafe archive: {exc}"
                        await db.commit()
                    return False, f"Blocked unsafe archive: {exc}"
                except Exception as exc:
                    log.error("Archive extraction failed for %s: %s", source, exc)
                    files_to_move = [source]
            else:
                files_to_move = [source]

        if not files_to_move:
            if source.is_file():
                files_to_move = [source]
            else:
                log.warning("No valid ROM files found inside directory %s for platform %s", source, game.platform_id)
                if queue_item:
                    queue_item.status = "failed"
                    queue_item.error_message = f"No valid ROM files found for platform '{game.platform_id}'."
                    await db.commit()
                return False, f"No valid ROM files found in {source}"

        if queue_item:
            queue_item.status = "organizing"
            await db.commit()

        final_path = ""
        total_bytes = 0

        for f_path in files_to_move:
            dest_name = f"{safe_title} ({region_str}){f_path.suffix}"
            dest_file = (target_dir / dest_name).resolve()

            try:
                _assert_within(dest_file, self.roms_root_dir)
            except ValueError as exc:
                log.error("Blocked write outside roms root: %s", exc)
                continue

            try:
                shutil.move(str(f_path), str(dest_file))
                final_path = str(dest_file)
                total_bytes += dest_file.stat().st_size
                # ── Create / refresh ROM link ─────────────────────────────────
                self._add_link(dest_file, safe_title, region_str, game.platform_id)
            except Exception as exc:
                log.error("Error moving file %s → %s: %s", f_path, dest_file, exc)

        if not final_path or not Path(final_path).exists():
            log.error("Failed to move/organize any valid file for game '%s'", game.title)
            if queue_item:
                queue_item.status = "failed"
                queue_item.error_message = f"Failed to place organized ROM file in {target_dir}."
                await db.commit()
            return False, f"Could not move valid ROM file for {game.title}"

        game.status = "downloaded"
        game.file_path = final_path
        game.file_size_bytes = total_bytes
        if queue_item:
            queue_item.status = "completed"
            queue_item.progress = 100.0
            queue_item.completed_at = datetime.now(timezone.utc)
        await db.commit()

        log.info("Organized '%s' → %s", game.title, final_path)
        return True, f"Successfully organized {game.title} to {final_path}"
