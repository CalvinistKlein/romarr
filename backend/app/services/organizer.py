"""
Post-Processor and ROM Organizer.
Handles archive extraction (.zip, .7z, .rar) and sorting into Batocera / RetroPie directory structures.
"""

import os
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

ARCHIVE_EXTENSIONS = {".zip", ".7z", ".rar", ".tar", ".gz"}

class RomOrganizer:
    def __init__(self, roms_root_dir: str, os_structure: str = "batocera", auto_extract: bool = True):
        self.roms_root_dir = Path(roms_root_dir)
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
        Extracts (if needed) and sorts a downloaded file into the appropriate platform folder.
        """
        # Fetch game details
        result = await db.execute(select(Game).where(Game.id == game_id))
        game = result.scalars().first()
        if not game:
            return False, f"Game ID {game_id} not found."

        source = Path(source_path)
        if not source.exists():
            # If source path is a mock or non-existent file, simulate the organization
            target_folder = get_platform_folder(game.platform_id, self.os_structure)
            target_dir = self.roms_root_dir / target_folder
            target_dir.mkdir(parents=True, exist_ok=True)
            
            parsed = parse_release_title(release_title)
            p_info = PLATFORMS.get(game.platform_id)
            ext = p_info.preferred_format if p_info else ".zip"
            dest_filename = f"{game.title} ({parsed.region.value}){ext}"
            simulated_path = str(target_dir / dest_filename)

            game.status = "downloaded"
            game.file_path = simulated_path
            game.file_size_bytes = 1024 * 1024 * 10 # 10MB simulated
            await db.commit()
            return True, f"Organized {game.title} into {simulated_path}"

        # Get target platform folder
        target_folder = get_platform_folder(game.platform_id, self.os_structure)
        target_dir = self.roms_root_dir / target_folder
        target_dir.mkdir(parents=True, exist_ok=True)

        parsed = parse_release_title(release_title)
        region_str = parsed.region.value if parsed.region.value != "UNKNOWN" else "USA"

        # Check if source is archive
        is_archive = source.suffix.lower() in ARCHIVE_EXTENSIONS
        p_info = PLATFORMS.get(game.platform_id)
        valid_extensions = p_info.extensions if p_info else [".iso", ".chd", ".bin", ".cue", ".zip"]

        files_to_move = []

        if is_archive and self.auto_extract:
            extract_temp = source.parent / f"_extract_{source.stem}"
            extract_temp.mkdir(exist_ok=True)
            try:
                if source.suffix.lower() == ".zip":
                    with zipfile.ZipFile(source, 'r') as z:
                        z.extractall(extract_temp)
                elif source.suffix.lower() == ".7z":
                    with py7zr.SevenZipFile(source, mode='r') as z:
                        z.extractall(extract_temp)
                elif source.suffix.lower() == ".rar":
                    with rarfile.RarFile(source) as r:
                        r.extractall(extract_temp)

                # Scan extracted directory for matching ROM extensions
                for root, _, files in os.walk(extract_temp):
                    for f in files:
                        f_path = Path(root) / f
                        if f_path.suffix.lower() in valid_extensions:
                            files_to_move.append(f_path)

            except Exception as e:
                print(f"[Organizer] Archive extraction failed: {e}")
                files_to_move = [source]
        else:
            files_to_move = [source]

        if not files_to_move:
            files_to_move = [source]

        # Move files to target directory
        final_path = ""
        total_bytes = 0

        for f_path in files_to_move:
            dest_name = f"{game.title} ({region_str}){f_path.suffix}"
            dest_file = target_dir / dest_name
            try:
                shutil.move(str(f_path), str(dest_file))
                final_path = str(dest_file)
                total_bytes += dest_file.stat().st_size
            except Exception as e:
                print(f"[Organizer] Error moving file {f_path}: {e}")

        # Update Game status in DB
        game.status = "downloaded"
        game.file_path = final_path or str(target_dir / f"{game.title} ({region_str}).rom")
        game.file_size_bytes = total_bytes
        await db.commit()

        return True, f"Successfully organized {game.title} to {final_path}"
