"""
Platform mappings and configurations for Batocera, RetroPie, Recalbox, and ES-DE.
"""

from typing import Dict, List, Optional
from pydantic import BaseModel

class PlatformInfo(BaseModel):
    id: str                      # Slug, e.g. "ps2", "snes"
    name: str                    # Full Display Name, e.g. "Sony PlayStation 2"
    manufacturer: str            # "Sony", "Nintendo", "Sega", "Microsoft", "Arcade", "Other"
    batocera_folder: str         # Folder under /roms in Batocera
    retropie_folder: str         # Folder under /roms in RetroPie
    recalbox_folder: str         # Folder under /roms in Recalbox
    extensions: List[str]        # Supported file extensions
    preferred_format: str        # e.g. ".chd", ".rvz", ".iso", ".zip"
    torznab_categories: List[int] # Torznab / Prowlarr category IDs
    igdb_id: Optional[int] = None # IGDB Platform ID
    icon: str                    # Icon identifier or category

PLATFORMS: Dict[str, PlatformInfo] = {
    # --- Nintendo ---
    "nes": PlatformInfo(
        id="nes",
        name="Nintendo Entertainment System (NES)",
        manufacturer="Nintendo",
        batocera_folder="nes",
        retropie_folder="nes",
        recalbox_folder="nes",
        extensions=[".nes", ".zip", ".7z", ".fds"],
        preferred_format=".nes",
        torznab_categories=[1000, 1140],
        igdb_id=18,
        icon="nes"
    ),
    "snes": PlatformInfo(
        id="snes",
        name="Super Nintendo (SNES)",
        manufacturer="Nintendo",
        batocera_folder="snes",
        retropie_folder="snes",
        recalbox_folder="snes",
        extensions=[".sfc", ".smc", ".zip", ".7z"],
        preferred_format=".sfc",
        torznab_categories=[1000, 1140],
        igdb_id=19,
        icon="snes"
    ),
    "n64": PlatformInfo(
        id="n64",
        name="Nintendo 64",
        manufacturer="Nintendo",
        batocera_folder="n64",
        retropie_folder="n64",
        recalbox_folder="n64",
        extensions=[".z64", ".n64", ".v64", ".zip", ".7z"],
        preferred_format=".z64",
        torznab_categories=[1000, 1140],
        igdb_id=4,
        icon="n64"
    ),
    "gamecube": PlatformInfo(
        id="gamecube",
        name="Nintendo GameCube",
        manufacturer="Nintendo",
        batocera_folder="gamecube",
        retropie_folder="gc",
        recalbox_folder="gamecube",
        extensions=[".rvz", ".iso", ".gcm", ".gcz", ".cso", ".zip", ".7z"],
        preferred_format=".rvz",
        torznab_categories=[1000, 1030, 1140],
        igdb_id=21,
        icon="gamecube"
    ),
    "wii": PlatformInfo(
        id="wii",
        name="Nintendo Wii",
        manufacturer="Nintendo",
        batocera_folder="wii",
        retropie_folder="wii",
        recalbox_folder="wii",
        extensions=[".rvz", ".wbfs", ".iso", ".cso", ".zip", ".7z"],
        preferred_format=".rvz",
        torznab_categories=[1030, 1000],
        igdb_id=5,
        icon="wii"
    ),
    "wiiu": PlatformInfo(
        id="wiiu",
        name="Nintendo Wii U",
        manufacturer="Nintendo",
        batocera_folder="wiiu",
        retropie_folder="wiiu",
        recalbox_folder="wiiu",
        extensions=[".wua", ".rpx", ".wud", ".wux", ".zip"],
        preferred_format=".wua",
        torznab_categories=[1060, 1000],
        igdb_id=41,
        icon="wiiu"
    ),
    "switch": PlatformInfo(
        id="switch",
        name="Nintendo Switch",
        manufacturer="Nintendo",
        batocera_folder="switch",
        retropie_folder="switch",
        recalbox_folder="switch",
        extensions=[".nsp", ".xci", ".nsz"],
        preferred_format=".nsp",
        torznab_categories=[1090, 1000],
        igdb_id=130,
        icon="switch"
    ),
    "gb": PlatformInfo(
        id="gb",
        name="Game Boy",
        manufacturer="Nintendo",
        batocera_folder="gb",
        retropie_folder="gb",
        recalbox_folder="gb",
        extensions=[".gb", ".zip", ".7z"],
        preferred_format=".gb",
        torznab_categories=[1000, 1140],
        igdb_id=33,
        icon="gameboy"
    ),
    "gbc": PlatformInfo(
        id="gbc",
        name="Game Boy Color",
        manufacturer="Nintendo",
        batocera_folder="gbc",
        retropie_folder="gbc",
        recalbox_folder="gbc",
        extensions=[".gbc", ".zip", ".7z"],
        preferred_format=".gbc",
        torznab_categories=[1000, 1140],
        igdb_id=22,
        icon="gbc"
    ),
    "gba": PlatformInfo(
        id="gba",
        name="Game Boy Advance",
        manufacturer="Nintendo",
        batocera_folder="gba",
        retropie_folder="gba",
        recalbox_folder="gba",
        extensions=[".gba", ".zip", ".7z"],
        preferred_format=".gba",
        torznab_categories=[1000, 1140],
        igdb_id=24,
        icon="gba"
    ),
    "nds": PlatformInfo(
        id="nds",
        name="Nintendo DS",
        manufacturer="Nintendo",
        batocera_folder="nds",
        retropie_folder="nds",
        recalbox_folder="nds",
        extensions=[".nds", ".zip", ".7z"],
        preferred_format=".nds",
        torznab_categories=[1010, 1000],
        igdb_id=20,
        icon="nds"
    ),
    "3ds": PlatformInfo(
        id="3ds",
        name="Nintendo 3DS",
        manufacturer="Nintendo",
        batocera_folder="3ds",
        retropie_folder="3ds",
        recalbox_folder="3ds",
        extensions=[".3ds", ".cia", ".cxi", ".zip", ".7z"],
        preferred_format=".3ds",
        torznab_categories=[1110, 1000],
        igdb_id=37,
        icon="3ds"
    ),

    # --- Sony ---
    "psx": PlatformInfo(
        id="psx",
        name="Sony PlayStation (PS1)",
        manufacturer="Sony",
        batocera_folder="psx",
        retropie_folder="psx",
        recalbox_folder="psx",
        extensions=[".chd", ".cue", ".bin", ".iso", ".pbp", ".zip", ".7z"],
        preferred_format=".chd",
        torznab_categories=[1000, 1140],
        igdb_id=7,
        icon="psx"
    ),
    "ps2": PlatformInfo(
        id="ps2",
        name="Sony PlayStation 2",
        manufacturer="Sony",
        batocera_folder="ps2",
        retropie_folder="ps2",
        recalbox_folder="ps2",
        extensions=[".chd", ".iso", ".cso", ".bin", ".gz", ".zip", ".7z"],
        preferred_format=".chd",
        torznab_categories=[1000, 1140],
        igdb_id=8,
        icon="ps2"
    ),
    "ps3": PlatformInfo(
        id="ps3",
        name="Sony PlayStation 3",
        manufacturer="Sony",
        batocera_folder="ps3",
        retropie_folder="ps3",
        recalbox_folder="ps3",
        extensions=[".iso", ".pkg", ".zip"],
        preferred_format=".iso",
        torznab_categories=[1070, 1000],
        igdb_id=9,
        icon="ps3"
    ),
    "ps4": PlatformInfo(
        id="ps4",
        name="Sony PlayStation 4",
        manufacturer="Sony",
        batocera_folder="ps4",
        retropie_folder="ps4",
        recalbox_folder="ps4",
        extensions=[".pkg", ".iso"],
        preferred_format=".pkg",
        torznab_categories=[1080, 1000],
        igdb_id=48,
        icon="ps4"
    ),
    "psp": PlatformInfo(
        id="psp",
        name="PlayStation Portable (PSP)",
        manufacturer="Sony",
        batocera_folder="psp",
        retropie_folder="psp",
        recalbox_folder="psp",
        extensions=[".chd", ".cso", ".iso", ".pbp", ".zip", ".7z"],
        preferred_format=".chd",
        torznab_categories=[1020, 1000],
        igdb_id=38,
        icon="psp"
    ),
    "psvita": PlatformInfo(
        id="psvita",
        name="PlayStation Vita",
        manufacturer="Sony",
        batocera_folder="psvita",
        retropie_folder="psvita",
        recalbox_folder="psvita",
        extensions=[".vpk", ".zip", ".pkg"],
        preferred_format=".vpk",
        torznab_categories=[1120, 1000],
        igdb_id=46,
        icon="psvita"
    ),

    # --- Sega ---
    "mastersystem": PlatformInfo(
        id="mastersystem",
        name="Sega Master System",
        manufacturer="Sega",
        batocera_folder="mastersystem",
        retropie_folder="mastersystem",
        recalbox_folder="mastersystem",
        extensions=[".sms", ".zip", ".7z"],
        preferred_format=".sms",
        torznab_categories=[1000, 1140],
        igdb_id=64,
        icon="sega"
    ),
    "megadrive": PlatformInfo(
        id="megadrive",
        name="Sega Genesis / Mega Drive",
        manufacturer="Sega",
        batocera_folder="megadrive",
        retropie_folder="megadrive",
        recalbox_folder="megadrive",
        extensions=[".md", ".gen", ".bin", ".zip", ".7z"],
        preferred_format=".md",
        torznab_categories=[1000, 1140],
        igdb_id=29,
        icon="genesis"
    ),
    "segacd": PlatformInfo(
        id="segacd",
        name="Sega CD / Mega CD",
        manufacturer="Sega",
        batocera_folder="segacd",
        retropie_folder="segacd",
        recalbox_folder="segacd",
        extensions=[".chd", ".cue", ".bin", ".iso", ".zip"],
        preferred_format=".chd",
        torznab_categories=[1000, 1140],
        igdb_id=78,
        icon="segacd"
    ),
    "saturn": PlatformInfo(
        id="saturn",
        name="Sega Saturn",
        manufacturer="Sega",
        batocera_folder="saturn",
        retropie_folder="saturn",
        recalbox_folder="saturn",
        extensions=[".chd", ".cue", ".bin", ".iso", ".zip", ".7z"],
        preferred_format=".chd",
        torznab_categories=[1000, 1140],
        igdb_id=32,
        icon="saturn"
    ),
    "dreamcast": PlatformInfo(
        id="dreamcast",
        name="Sega Dreamcast",
        manufacturer="Sega",
        batocera_folder="dreamcast",
        retropie_folder="dreamcast",
        recalbox_folder="dreamcast",
        extensions=[".chd", ".cdi", ".gdi", ".cue", ".zip", ".7z"],
        preferred_format=".chd",
        torznab_categories=[1000, 1140],
        igdb_id=23,
        icon="dreamcast"
    ),
    "gamegear": PlatformInfo(
        id="gamegear",
        name="Sega Game Gear",
        manufacturer="Sega",
        batocera_folder="gamegear",
        retropie_folder="gamegear",
        recalbox_folder="gamegear",
        extensions=[".gg", ".zip", ".7z"],
        preferred_format=".gg",
        torznab_categories=[1000, 1140],
        igdb_id=35,
        icon="gamegear"
    ),

    # --- Microsoft ---
    "xbox": PlatformInfo(
        id="xbox",
        name="Microsoft Xbox",
        manufacturer="Microsoft",
        batocera_folder="xbox",
        retropie_folder="xbox",
        recalbox_folder="xbox",
        extensions=[".iso", ".xbe", ".zip", ".7z"],
        preferred_format=".iso",
        torznab_categories=[1040, 1000],
        igdb_id=11,
        icon="xbox"
    ),
    "xbox360": PlatformInfo(
        id="xbox360",
        name="Microsoft Xbox 360",
        manufacturer="Microsoft",
        batocera_folder="xbox360",
        retropie_folder="xbox360",
        recalbox_folder="xbox360",
        extensions=[".iso", ".god", ".xex", ".zip"],
        preferred_format=".iso",
        torznab_categories=[1050, 1000],
        igdb_id=12,
        icon="xbox360"
    ),

    # --- Arcade & Other ---
    "arcade": PlatformInfo(
        id="arcade",
        name="Arcade (MAME / FBNeo)",
        manufacturer="Arcade",
        batocera_folder="mame",
        retropie_folder="arcade",
        recalbox_folder="mame",
        extensions=[".zip", ".7z", ".chd"],
        preferred_format=".zip",
        torznab_categories=[1000, 1140],
        igdb_id=52,
        icon="arcade"
    ),
    "neogeo": PlatformInfo(
        id="neogeo",
        name="SNK Neo Geo",
        manufacturer="SNK",
        batocera_folder="neogeo",
        retropie_folder="neogeo",
        recalbox_folder="neogeo",
        extensions=[".zip", ".7z", ".neo"],
        preferred_format=".zip",
        torznab_categories=[1000, 1140],
        igdb_id=79,
        icon="neogeo"
    ),
    "pcengine": PlatformInfo(
        id="pcengine",
        name="PC Engine / TurboGrafx-16",
        manufacturer="NEC",
        batocera_folder="pcengine",
        retropie_folder="pcengine",
        recalbox_folder="pcengine",
        extensions=[".pce", ".chd", ".cue", ".zip", ".7z"],
        preferred_format=".pce",
        torznab_categories=[1000, 1140],
        igdb_id=86,
        icon="pcengine"
    ),
}

def get_platform_folder(platform_id: str, os_structure: str = "batocera") -> str:
    """Get the target folder name for a given platform and OS structure."""
    platform = PLATFORMS.get(platform_id.lower())
    if not platform:
        return platform_id.lower()
    
    if os_structure.lower() == "retropie":
        return platform.retropie_folder
    elif os_structure.lower() == "recalbox":
        return platform.recalbox_folder
    return platform.batocera_folder

def get_platform_by_name_or_id(query: str) -> Optional[PlatformInfo]:
    """Find a platform by slug or approximate name."""
    query_lower = query.lower().strip()
    if query_lower in PLATFORMS:
        return PLATFORMS[query_lower]
    
    for p in PLATFORMS.values():
        if query_lower == p.name.lower() or query_lower in p.name.lower():
            return p
    return None
