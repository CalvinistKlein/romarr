"""
Advanced Region, Format, and Release Title Parser and Sorter.
Categorizes ROM/ISO releases into USA, Europe, Japan, World, Translations, etc.
"""

import re
from enum import Enum
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

class Region(str, Enum):
    USA = "USA"
    EUR = "EUR"
    JPN = "JPN"
    WORLD = "WORLD"
    ASIA = "ASIA"
    AUS = "AUS"
    TRANSLATION = "TRANSLATION"
    UNKNOWN = "UNKNOWN"

class ParsedRelease(BaseModel):
    raw_title: str
    clean_title: str
    region: Region
    region_display: str
    region_flag: str
    languages: List[str] = []
    format: str
    revision: Optional[str] = None
    disc: Optional[str] = None
    is_translation: bool = False
    is_hack_or_homebrew: bool = False
    score: int = 0

# Regex patterns for regions
REGION_PATTERNS = [
    # Translation patterns
    (r"\[T[-+](?:En|Eng|English)[^\]]*\]|\bT-En\b|\bEng(?:lish)?\s+Trans(?:lation)?\b", Region.TRANSLATION, "English Translation", "🈳"),
    
    # USA / North America
    (r"\b(?:USA|US|NTSC-U|North\s+America|U)\b|\(USA\)|\(US\)", Region.USA, "USA / North America", "🇺🇸"),
    
    # Europe / PAL
    (r"\b(?:EUR|Europe|European|PAL|E)\b|\(EUR(?:ope)?\)|\(PAL\)", Region.EUR, "Europe / PAL", "🇪🇺"),
    
    # Japan / NTSC-J
    (r"\b(?:JPN|Japan|Japanese|NTSC-J|J)\b|\(JPN?\)|\(Japan\)", Region.JPN, "Japan / NTSC-J", "🇯🇵"),
    
    # World / Global
    (r"\b(?:World|Global)\b|\(World\)", Region.WORLD, "World / Global", "🌐"),
    
    # Asia
    (r"\b(?:Asia|Korea|KOR|China|CHN|Hong\s+Kong|HK)\b", Region.ASIA, "Asia", "🌏"),
    
    # Australia
    (r"\b(?:Australia|AUS|AU)\b|\(Australia\)", Region.AUS, "Australia", "🇦🇺"),
]

# Common language codes
LANG_PATTERNS = [
    (r"\bEn\b|English", "English"),
    (r"\bJa\b|Japanese", "Japanese"),
    (r"\bFr\b|French", "French"),
    (r"\bDe\b|German", "German"),
    (r"\bEs\b|Spanish", "Spanish"),
    (r"\bIt\b|Italian", "Italian"),
    (r"\bPt\b|Portuguese", "Portuguese"),
]

# File formats / extensions
FORMAT_PATTERNS = [
    (r"\.chd\b|\bCHD\b", "CHD"),
    (r"\.rvz\b|\bRVZ\b", "RVZ"),
    (r"\.iso\b|\bISO\b", "ISO"),
    (r"\.cso\b|\bCSO\b", "CSO"),
    (r"\.nsp\b|\bNSP\b", "NSP"),
    (r"\.xci\b|\bXCI\b", "XCI"),
    (r"\.nsz\b|\bNSZ\b", "NSZ"),
    (r"\.wbfs\b|\bWBFS\b", "WBFS"),
    (r"\.wua\b|\bWUA\b", "WUA"),
    (r"\.cia\b|\bCIA\b", "CIA"),
    (r"\.3ds\b|\b3DS\b", "3DS"),
    (r"\.nds\b|\bNDS\b", "NDS"),
    (r"\.gba\b|\bGBA\b", "GBA"),
    (r"\.gbc\b|\bGBC\b", "GBC"),
    (r"\.gb\b|\bGB\b", "GB"),
    (r"\.sfc\b|\.smc\b|\bSNES\b", "SFC/SMC"),
    (r"\.nes\b|\bNES\b", "NES"),
    (r"\.z64\b|\.n64\b|\.v64\b|\bN64\b", "N64/Z64"),
    (r"\.bin\b|\.cue\b|\bBIN/CUE\b", "BIN/CUE"),
    (r"\.pbp\b|\bPBP\b", "PBP"),
    (r"\.7z\b|\b7Z\b", "7Z"),
    (r"\.zip\b|\bZIP\b", "ZIP"),
    (r"\.rar\b|\bRAR\b", "RAR"),
]

def parse_release_title(title: str) -> ParsedRelease:
    """Parse raw release title into structured metadata."""
    region = Region.UNKNOWN
    region_display = "Unknown Region"
    region_flag = "🏳️"
    is_translation = False
    
    # Check for translations first
    if re.search(r"\[T[-+](?:En|Eng|English)[^\]]*\]|\bT-En\b|\bEng(?:lish)?\s+Trans(?:lation)?\b", title, re.IGNORECASE):
        region = Region.TRANSLATION
        region_display = "English Translation"
        region_flag = "🈳"
        is_translation = True
    else:
        # Check standard region patterns
        for pattern, reg, display, flag in REGION_PATTERNS:
            if re.search(pattern, title, re.IGNORECASE):
                region = reg
                region_display = display
                region_flag = flag
                break

    # Parse Languages
    languages = []
    for pat, lang in LANG_PATTERNS:
        if re.search(pat, title, re.IGNORECASE):
            languages.append(lang)

    # Parse Format
    format_found = "ROM/Archive"
    for pat, fmt in FORMAT_PATTERNS:
        if re.search(pat, title, re.IGNORECASE):
            format_found = fmt
            break

    # Parse Revision / Version
    rev_match = re.search(r"\((?:Rev|v|Version)\s*([A-Za-z0-9.]+)\)", title, re.IGNORECASE)
    revision = rev_match.group(0) if rev_match else None

    # Parse Disc Number
    disc_match = re.search(r"\((?:Disc|CD|Disk)\s*([0-9]+(?:\s*of\s*[0-9]+)?)\)", title, re.IGNORECASE)
    disc = disc_match.group(0) if disc_match else None

    # Clean game title
    clean_title = re.sub(r"\(.*?\)|\[.*?\]", "", title).strip()
    clean_title = re.sub(r"[\._]", " ", clean_title).strip()

    # Check for homebrew or hack
    is_hack = bool(re.search(r"\b(?:Hack|Homebrew|Mod|Trainer)\b", title, re.IGNORECASE))

    return ParsedRelease(
        raw_title=title,
        clean_title=clean_title,
        region=region,
        region_display=region_display,
        region_flag=region_flag,
        languages=languages,
        format=format_found,
        revision=revision,
        disc=disc,
        is_translation=is_translation,
        is_hack_or_homebrew=is_hack,
        score=0
    )

def score_and_sort_releases(
    releases: List[Dict[str, Any]],
    preferred_regions: List[str] = None,
    preferred_format: Optional[str] = None,
    selected_region_filter: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Score and sort a list of releases based on region preferences, seeders, and format.
    Also supports filtering down to a specific region (e.g. 'USA', 'EUR', 'JPN').
    """
    if preferred_regions is None:
        preferred_regions = ["USA", "EUR", "JPN", "WORLD", "TRANSLATION"]

    scored_releases = []
    
    for rel in releases:
        title = rel.get("title", "")
        parsed = parse_release_title(title)
        
        # Apply region filter if specified
        if selected_region_filter and selected_region_filter.upper() != "ALL":
            filter_up = selected_region_filter.upper()
            if parsed.region.value != filter_up:
                # Special case: translation can also count if base region matches or if TRANSLATION is chosen
                if filter_up == "TRANSLATION" and not parsed.is_translation:
                    continue
                elif filter_up != "TRANSLATION":
                    continue

        # Calculate score
        score = 1000

        # Region score weight
        reg_val = parsed.region.value
        if reg_val in preferred_regions:
            # Higher priority given to earlier items in the list
            priority_idx = preferred_regions.index(reg_val)
            score += (10 - priority_idx) * 100
        elif parsed.is_translation and "TRANSLATION" in preferred_regions:
            score += 850
        else:
            score += 10 # Unknown or other

        # Format bonus (e.g. CHD or RVZ)
        if preferred_format and preferred_format.upper().replace(".", "") == parsed.format.upper():
            score += 150

        # Seeders weight
        seeders = rel.get("seeders", 0) or 0
        score += min(seeders * 5, 200)

        # Penalize hacks if not searching specifically for hacks
        if parsed.is_hack_or_homebrew:
            score -= 300

        # Create enriched object
        rel_copy = dict(rel)
        rel_copy["parsed"] = parsed.model_dump()
        rel_copy["score"] = score
        scored_releases.append(rel_copy)

    # Sort descending by score, then seeders
    scored_releases.sort(key=lambda x: (x["score"], x.get("seeders", 0)), reverse=True)
    return scored_releases
