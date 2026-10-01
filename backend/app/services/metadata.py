"""
Game Metadata Service.
Integrates with IGDB (Twitch API) and includes a rich fallback provider for instant search.
Supports comprehensive cover art, artwork, and screenshot re-searching.
"""

import httpx
import asyncio
import time
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from backend.app.services.platforms import PLATFORMS, get_platform_by_name_or_id

class GameSearchResult(BaseModel):
    title: str
    slug: str
    platform_id: str
    platform_name: str
    igdb_id: Optional[int] = None
    summary: Optional[str] = None
    cover_url: Optional[str] = None
    banner_url: Optional[str] = None
    release_year: Optional[int] = None
    developer: Optional[str] = None
    publisher: Optional[str] = None
    genres: List[str] = []

class CoverOption(BaseModel):
    id: str
    url: str
    url_hd: str
    thumbnail_url: str
    type: str  # "cover", "artwork", "screenshot", "edition_cover"
    label: str
    width: Optional[int] = None
    height: Optional[int] = None
    platforms: List[str] = []
    release_year: Optional[int] = None

class IGDBClient:
    def __init__(self, client_id: str = "", client_secret: str = ""):
        self.client_id = client_id
        self.client_secret = client_secret
        self.access_token: Optional[str] = None
        self.token_expiry: float = 0

    async def get_token(self) -> Optional[str]:
        if not self.client_id or not self.client_secret:
            return None
        
        if self.access_token and time.time() < self.token_expiry:
            return self.access_token

        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                res = await client.post(
                    "https://id.twitch.tv/oauth2/token",
                    params={
                        "client_id": self.client_id,
                        "client_secret": self.client_secret,
                        "grant_type": "client_credentials",
                    },
                )
                if res.status_code == 200:
                    data = res.json()
                    self.access_token = data.get("access_token")
                    self.token_expiry = time.time() + data.get("expires_in", 3600) - 60
                    return self.access_token
            except Exception as e:
                print(f"[IGDB] Failed to obtain token: {e}")
        return None

    async def search_games(self, query: str, platform_id: Optional[str] = None, limit: int = 20) -> List[GameSearchResult]:
        token = await self.get_token()
        if not token:
            return []

        platform_filter = ""
        if platform_id and platform_id in PLATFORMS:
            p_info = PLATFORMS[platform_id]
            if p_info.igdb_id:
                platform_filter = f" & platforms = ({p_info.igdb_id})"

        clean_query = query.replace('"', '\\"')
        body = f"""
        search "{clean_query}";
        fields name, slug, summary, cover.image_id, screenshots.image_id, first_release_date, genres.name, platforms.name, platforms.id, involved_companies.company.name, involved_companies.developer, involved_companies.publisher;
        where category = (0, 8, 9, 10){platform_filter};
        limit {limit};
        """

        headers = {
            "Client-ID": self.client_id,
            "Authorization": f"Bearer {token}",
            "Accept": "application/json"
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                res = await client.post("https://api.igdb.com/v4/games", headers=headers, content=body)
                if res.status_code == 200:
                    data = res.json()
                    results = []
                    for item in data:
                        cover_url = None
                        if "cover" in item and "image_id" in item["cover"]:
                            cover_url = f"https://images.igdb.com/igdb/image/upload/t_cover_big/{item['cover']['image_id']}.jpg"
                        
                        banner_url = None
                        if "screenshots" in item and len(item["screenshots"]) > 0:
                            banner_url = f"https://images.igdb.com/igdb/image/upload/t_1080p/{item['screenshots'][0]['image_id']}.jpg"

                        release_year = None
                        if "first_release_date" in item:
                            release_year = time.gmtime(item["first_release_date"]).tm_year

                        genres = [g["name"] for g in item.get("genres", [])]

                        developer = None
                        publisher = None
                        for comp in item.get("involved_companies", []):
                            c_name = comp.get("company", {}).get("name")
                            if comp.get("developer") and not developer:
                                developer = c_name
                            if comp.get("publisher") and not publisher:
                                publisher = c_name

                        for p in item.get("platforms", []):
                            p_igdb_id = p.get("id")
                            matched_platform_id = "other"
                            matched_platform_name = p.get("name", "Unknown")
                            for k, v in PLATFORMS.items():
                                if v.igdb_id == p_igdb_id:
                                    matched_platform_id = v.id
                                    matched_platform_name = v.name
                                    break
                            
                            if platform_id and matched_platform_id != platform_id:
                                continue

                            results.append(GameSearchResult(
                                title=item.get("name", ""),
                                slug=item.get("slug", ""),
                                platform_id=matched_platform_id,
                                platform_name=matched_platform_name,
                                igdb_id=item.get("id"),
                                summary=item.get("summary"),
                                cover_url=cover_url,
                                banner_url=banner_url,
                                release_year=release_year,
                                developer=developer,
                                publisher=publisher,
                                genres=genres
                            ))
                    return results
            except Exception as e:
                print(f"[IGDB] Search query error: {e}")
        return []

    async def get_cover_options(
        self,
        query: str,
        igdb_id: Optional[int] = None,
        platform_id: Optional[str] = None
    ) -> List[CoverOption]:
        """Search and collect all available cover art, artworks, and screenshots from IGDB."""
        token = await self.get_token()
        if not token:
            return []

        headers = {
            "Client-ID": self.client_id,
            "Authorization": f"Bearer {token}",
            "Accept": "application/json"
        }

        options: List[CoverOption] = []
        seen_image_ids = set()

        async with httpx.AsyncClient(timeout=15.0) as client:
            # 1. If igdb_id is known, query specific covers and artworks for this game
            if igdb_id:
                try:
                    c_body = f"fields image_id, width, height, alpha_channel; where game = {igdb_id}; limit 20;"
                    c_res = await client.post("https://api.igdb.com/v4/covers", headers=headers, content=c_body)
                    if c_res.status_code == 200:
                        for idx, c in enumerate(c_res.json()):
                            img_id = c.get("image_id")
                            if img_id and img_id not in seen_image_ids:
                                seen_image_ids.add(img_id)
                                options.append(CoverOption(
                                    id=f"cover_{img_id}",
                                    url=f"https://images.igdb.com/igdb/image/upload/t_cover_big/{img_id}.jpg",
                                    url_hd=f"https://images.igdb.com/igdb/image/upload/t_1080p/{img_id}.jpg",
                                    thumbnail_url=f"https://images.igdb.com/igdb/image/upload/t_cover_small/{img_id}.jpg",
                                    type="cover",
                                    label=f"Official Cover #{idx+1}",
                                    width=c.get("width"),
                                    height=c.get("height")
                                ))
                except Exception as e:
                    print(f"[IGDB] Specific covers fetch error: {e}")

                try:
                    a_body = f"fields image_id, width, height; where game = {igdb_id}; limit 20;"
                    a_res = await client.post("https://api.igdb.com/v4/artworks", headers=headers, content=a_body)
                    if a_res.status_code == 200:
                        for idx, a in enumerate(a_res.json()):
                            img_id = a.get("image_id")
                            if img_id and img_id not in seen_image_ids:
                                seen_image_ids.add(img_id)
                                options.append(CoverOption(
                                    id=f"art_{img_id}",
                                    url=f"https://images.igdb.com/igdb/image/upload/t_1080p/{img_id}.jpg",
                                    url_hd=f"https://images.igdb.com/igdb/image/upload/t_1080p/{img_id}.jpg",
                                    thumbnail_url=f"https://images.igdb.com/igdb/image/upload/t_cover_small/{img_id}.jpg",
                                    type="artwork",
                                    label=f"Official Artwork #{idx+1}",
                                    width=a.get("width"),
                                    height=a.get("height")
                                ))
                except Exception as e:
                    print(f"[IGDB] Specific artworks fetch error: {e}")

            # 2. Search IGDB games with query to find all related editions, releases, and screenshots
            if query:
                try:
                    clean_query = query.replace('"', '\\"')
                    g_body = f"""
                    search "{clean_query}";
                    fields name, cover.image_id, cover.width, cover.height, artworks.image_id, artworks.width, artworks.height, screenshots.image_id, screenshots.width, screenshots.height, platforms.name, first_release_date;
                    limit 15;
                    """
                    g_res = await client.post("https://api.igdb.com/v4/games", headers=headers, content=g_body)
                    if g_res.status_code == 200:
                        for game_item in g_res.json():
                            g_name = game_item.get("name", "")
                            p_names = [p.get("name") for p in game_item.get("platforms", []) if p.get("name")]
                            year = None
                            if "first_release_date" in game_item:
                                year = time.gmtime(game_item["first_release_date"]).tm_year

                            # Edition Cover
                            cov = game_item.get("cover")
                            if cov and cov.get("image_id"):
                                img_id = cov["image_id"]
                                if img_id not in seen_image_ids:
                                    seen_image_ids.add(img_id)
                                    options.append(CoverOption(
                                        id=f"ed_cover_{img_id}",
                                        url=f"https://images.igdb.com/igdb/image/upload/t_cover_big/{img_id}.jpg",
                                        url_hd=f"https://images.igdb.com/igdb/image/upload/t_1080p/{img_id}.jpg",
                                        thumbnail_url=f"https://images.igdb.com/igdb/image/upload/t_cover_small/{img_id}.jpg",
                                        type="cover",
                                        label=f"{g_name} ({', '.join(p_names[:2]) or 'Edition'})",
                                        width=cov.get("width"),
                                        height=cov.get("height"),
                                        platforms=p_names,
                                        release_year=year
                                    ))

                            # Artworks
                            for idx, art in enumerate(game_item.get("artworks", [])):
                                img_id = art.get("image_id")
                                if img_id and img_id not in seen_image_ids:
                                    seen_image_ids.add(img_id)
                                    options.append(CoverOption(
                                        id=f"art_{img_id}",
                                        url=f"https://images.igdb.com/igdb/image/upload/t_1080p/{img_id}.jpg",
                                        url_hd=f"https://images.igdb.com/igdb/image/upload/t_1080p/{img_id}.jpg",
                                        thumbnail_url=f"https://images.igdb.com/igdb/image/upload/t_cover_small/{img_id}.jpg",
                                        type="artwork",
                                        label=f"{g_name} Artwork #{idx+1}",
                                        width=art.get("width"),
                                        height=art.get("height"),
                                        platforms=p_names,
                                        release_year=year
                                    ))

                            # Screenshots
                            for idx, sc in enumerate(game_item.get("screenshots", [])[:4]):
                                img_id = sc.get("image_id")
                                if img_id and img_id not in seen_image_ids:
                                    seen_image_ids.add(img_id)
                                    options.append(CoverOption(
                                        id=f"sc_{img_id}",
                                        url=f"https://images.igdb.com/igdb/image/upload/t_1080p/{img_id}.jpg",
                                        url_hd=f"https://images.igdb.com/igdb/image/upload/t_1080p/{img_id}.jpg",
                                        thumbnail_url=f"https://images.igdb.com/igdb/image/upload/t_cover_small/{img_id}.jpg",
                                        type="screenshot",
                                        label=f"{g_name} Screenshot #{idx+1}",
                                        width=sc.get("width"),
                                        height=sc.get("height"),
                                        platforms=p_names,
                                        release_year=year
                                    ))
                except Exception as e:
                    print(f"[IGDB] Games query for cover search error: {e}")

        return options


# Open / fallback database of popular games across platforms for instantaneous search without API keys
FALLBACK_DATABASE = [
    # SNES
    {"title": "Super Mario World", "platform_id": "snes", "year": 1990, "developer": "Nintendo", "genres": ["Platform", "Adventure"], "cover": "https://images.igdb.com/igdb/image/upload/t_cover_big/co1x77.jpg", "summary": "Mario and Luigi embark on a journey across Dinosaur Land to rescue Princess Toadstool and defeat Bowser."},
    {"title": "The Legend of Zelda: A Link to the Past", "platform_id": "snes", "year": 1991, "developer": "Nintendo", "genres": ["Action", "Adventure", "RPG"], "cover": "https://images.igdb.com/igdb/image/upload/t_cover_big/co1x76.jpg", "summary": "Link must travel between the Light World and the Dark World to stop the dark wizard Agahnim and defeat Ganon."},
    {"title": "Super Metroid", "platform_id": "snes", "year": 1994, "developer": "Nintendo", "genres": ["Action", "Platform", "Sci-Fi"], "cover": "https://images.igdb.com/igdb/image/upload/t_cover_big/co1x6f.jpg", "summary": "Samus Aran returns to the planet Zebes to retrieve an abducted infant Metroid from Ridley and the Space Pirates."},
    {"title": "Chrono Trigger", "platform_id": "snes", "year": 1995, "developer": "Square", "genres": ["RPG", "Turn-based"], "cover": "https://images.igdb.com/igdb/image/upload/t_cover_big/co1x82.jpg", "summary": "A group of adventurers travel through time to prevent the global catastrophe caused by the alien parasite Lavos."},
    {"title": "Donkey Kong Country", "platform_id": "snes", "year": 1994, "developer": "Rare", "genres": ["Platform"], "cover": "https://images.igdb.com/igdb/image/upload/t_cover_big/co1x78.jpg", "summary": "Donkey Kong and Diddy Kong set out to recover their stolen banana hoard from King K. Rool."},
    
    # N64
    {"title": "Super Mario 64", "platform_id": "n64", "year": 1996, "developer": "Nintendo", "genres": ["Platform", "3D"], "cover": "https://images.igdb.com/igdb/image/upload/t_cover_big/co1x7d.jpg", "summary": "Mario explores Peach's castle and jumps into paintings to collect Power Stars and save Princess Peach."},
    {"title": "The Legend of Zelda: Ocarina of Time", "platform_id": "n64", "year": 1998, "developer": "Nintendo", "genres": ["Action", "Adventure"], "cover": "https://images.igdb.com/igdb/image/upload/t_cover_big/co1x7c.jpg", "summary": "Link travels through time using the Ocarina of Time to stop Ganondorf from obtaining the Triforce."},
    {"title": "GoldenEye 007", "platform_id": "n64", "year": 1997, "developer": "Rare", "genres": ["Shooter", "FPS"], "cover": "https://images.igdb.com/igdb/image/upload/t_cover_big/co1x7a.jpg", "summary": "James Bond operates behind enemy lines to prevent the misuse of the GoldenEye satellite weapon."},
    {"title": "Super Smash Bros.", "platform_id": "n64", "year": 1999, "developer": "HAL Laboratory", "genres": ["Fighting"], "cover": "https://images.igdb.com/igdb/image/upload/t_cover_big/co1x79.jpg", "summary": "Nintendo's iconic characters battle in vibrant arenas across the Nintendo multiverse."},

    # PS1
    {"title": "Final Fantasy VII", "platform_id": "psx", "year": 1997, "developer": "Square", "genres": ["RPG", "JRPG"], "cover": "https://images.igdb.com/igdb/image/upload/t_cover_big/co1x75.jpg", "summary": "Mercenary Cloud Strife joins eco-terrorist group AVALANCHE to stop Shinra and the enigmatic Sephiroth."},
    {"title": "Metal Gear Solid", "platform_id": "psx", "year": 1998, "developer": "Konami", "genres": ["Stealth", "Action"], "cover": "https://images.igdb.com/igdb/image/upload/t_cover_big/co1x73.jpg", "summary": "Solid Snake infiltrates a nuclear weapons facility on Shadow Moses Island to neutralize rogue FOXHOUND agents."},
    {"title": "Castlevania: Symphony of the Night", "platform_id": "psx", "year": 1997, "developer": "Konami", "genres": ["Action", "Metroidvania", "RPG"], "cover": "https://images.igdb.com/igdb/image/upload/t_cover_big/co1x74.jpg", "summary": "Alucard awakens to explore Dracula's resurrected castle and put an end to the dark curse."},
    {"title": "Crash Bandicoot 3: Warped", "platform_id": "psx", "year": 1998, "developer": "Naughty Dog", "genres": ["Platform"], "cover": "https://images.igdb.com/igdb/image/upload/t_cover_big/co1x72.jpg", "summary": "Crash and Coco travel across time periods to collect Power Crystals before Dr. Neo Cortex and Uka Uka."},

    # PS2
    {"title": "Grand Theft Auto: San Andreas", "platform_id": "ps2", "year": 2004, "developer": "Rockstar North", "genres": ["Action", "Open World"], "cover": "https://images.igdb.com/igdb/image/upload/t_cover_big/co1x6n.jpg", "summary": "Carl 'CJ' Johnson returns home to Los Santos to clear his name and save his family and neighborhood."},
    {"title": "God of War II", "platform_id": "ps2", "year": 2007, "developer": "Santa Monica Studio", "genres": ["Action", "Hack & Slash"], "cover": "https://images.igdb.com/igdb/image/upload/t_cover_big/co1x6p.jpg", "summary": "Kratos journeys to the edge of the Earth to change his fate and exact revenge on Zeus."},
    {"title": "Shadow of the Colossus", "platform_id": "ps2", "year": 2005, "developer": "Team Ico", "genres": ["Action", "Adventure"], "cover": "https://images.igdb.com/igdb/image/upload/t_cover_big/co1x6q.jpg", "summary": "Wander travels to the Forbidden Land on horseback to defeat 16 colossal beings to resurrect Mono."},
    {"title": "Kingdom Hearts II", "platform_id": "ps2", "year": 2005, "developer": "Square Enix", "genres": ["Action", "RPG"], "cover": "https://images.igdb.com/igdb/image/upload/t_cover_big/co1x6r.jpg", "summary": "Sora, Donald, and Goofy continue their quest against Organization XIII across Disney worlds."},

    # GameCube
    {"title": "Super Smash Bros. Melee", "platform_id": "gamecube", "year": 2001, "developer": "HAL Laboratory", "genres": ["Fighting"], "cover": "https://images.igdb.com/igdb/image/upload/t_cover_big/co1x6z.jpg", "summary": "Fast-paced platform fighter featuring classic Nintendo mascots and competitive physics."},
    {"title": "The Legend of Zelda: The Wind Waker", "platform_id": "gamecube", "year": 2002, "developer": "Nintendo", "genres": ["Action", "Adventure"], "cover": "https://images.igdb.com/igdb/image/upload/t_cover_big/co1x70.jpg", "summary": "Link sails across the Great Sea with the Talking Boat King of Red Lions to rescue his sister Aryll."},
    {"title": "Metroid Prime", "platform_id": "gamecube", "year": 2002, "developer": "Retro Studios", "genres": ["Action", "First-Person Adventure"], "cover": "https://images.igdb.com/igdb/image/upload/t_cover_big/co1x71.jpg", "summary": "Samus explores the ruined planet Tallon IV to investigate Phazon contamination and Space Pirate activity."},

    # GBA
    {"title": "Pokemon Emerald Version", "platform_id": "gba", "year": 2004, "developer": "Game Freak", "genres": ["RPG"], "cover": "https://images.igdb.com/igdb/image/upload/t_cover_big/co1x6m.jpg", "summary": "Journey through the Hoenn region, battle Team Aqua and Team Magma, and awaken the legendary Rayquaza."},
    {"title": "The Legend of Zelda: The Minish Cap", "platform_id": "gba", "year": 2004, "developer": "Capcom / Flagship", "genres": ["Action", "Adventure"], "cover": "https://images.igdb.com/igdb/image/upload/t_cover_big/co1x6l.jpg", "summary": "Link shrinks down to Minish size with talking cap Ezlo to forge the Four Sword and defeat Vaati."},
    {"title": "Castlevania: Aria of Sorrow", "platform_id": "gba", "year": 2003, "developer": "Konami", "genres": ["Action", "Metroidvania"], "cover": "https://images.igdb.com/igdb/image/upload/t_cover_big/co1x6k.jpg", "summary": "Soma Cruz absorbs the souls of monsters inside Dracula's solar eclipse castle to uncover his true destiny."},

    # Sega Genesis / Dreamcast
    {"title": "Sonic the Hedgehog 2", "platform_id": "megadrive", "year": 1992, "developer": "Sega", "genres": ["Platform"], "cover": "https://images.igdb.com/igdb/image/upload/t_cover_big/co1x6j.jpg", "summary": "Sonic and his new sidekick Tails team up to stop Dr. Robotnik from launching the Death Egg."},
    {"title": "Shenmue", "platform_id": "dreamcast", "year": 1999, "developer": "Sega AM2", "genres": ["Adventure", "Action"], "cover": "https://images.igdb.com/igdb/image/upload/t_cover_big/co1x6i.jpg", "summary": "Ryo Hazuki investigates his father's murder in 1986 Yokosuka, Japan."},
]

async def search_metadata(
    query: str,
    platform_id: Optional[str] = None,
    client_id: str = "",
    client_secret: str = ""
) -> List[GameSearchResult]:
    """Search for game metadata using IGDB if configured, or the fallback database."""
    # 1. Try IGDB first if keys provided
    if client_id and client_secret:
        igdb = IGDBClient(client_id=client_id, client_secret=client_secret)
        igdb_results = await igdb.search_games(query=query, platform_id=platform_id)
        if igdb_results:
            return igdb_results

    # 2. Match against fallback DB
    q_clean = query.lower().strip()
    matches = []
    
    for item in FALLBACK_DATABASE:
        if platform_id and item["platform_id"] != platform_id:
            continue
        
        if q_clean in item["title"].lower() or item["title"].lower() in q_clean:
            p_info = PLATFORMS.get(item["platform_id"])
            p_name = p_info.name if p_info else item["platform_id"]
            
            matches.append(GameSearchResult(
                title=item["title"],
                slug=item["title"].lower().replace(" ", "-").replace(":", "").replace("'", ""),
                platform_id=item["platform_id"],
                platform_name=p_name,
                summary=item.get("summary"),
                cover_url=item.get("cover"),
                release_year=item.get("year"),
                developer=item.get("developer"),
                genres=item.get("genres", [])
            ))

    if not matches and q_clean:
        title = query.strip().title()
        slug_base = query.strip().lower().replace(" ", "-").replace(":", "").replace("'", "")

        if platform_id:
            p_info = PLATFORMS.get(platform_id)
            p_name = p_info.name if p_info else platform_id.upper()
            matches.append(GameSearchResult(
                title=title,
                slug=slug_base,
                platform_id=platform_id,
                platform_name=p_name,
                summary=f"Custom entry for {title} on {p_name}.",
                cover_url=None,
                release_year=None,
                developer="Unknown",
                genres=["Action", "Retro"]
            ))
        else:
            COMMON_PLATFORMS = [
                "nes", "snes", "n64", "gamecube", "wii",
                "gb", "gbc", "gba", "nds",
                "psx", "ps2", "psp",
                "megadrive", "saturn", "dreamcast",
                "xbox", "xbox360",
                "arcade", "neogeo",
            ]
            for p_id in COMMON_PLATFORMS:
                p_info = PLATFORMS.get(p_id)
                if not p_info:
                    continue
                matches.append(GameSearchResult(
                    title=title,
                    slug=f"{slug_base}-{p_id}",
                    platform_id=p_id,
                    platform_name=p_info.name,
                    summary=f"Custom entry for {title} on {p_info.name}.",
                    cover_url=None,
                    release_year=None,
                    developer="Unknown",
                    genres=["Action", "Retro"]
                ))

    return matches


async def search_cover_metadata(
    query: str,
    igdb_id: Optional[int] = None,
    platform_id: Optional[str] = None,
    client_id: str = "",
    client_secret: str = ""
) -> List[CoverOption]:
    """Search for cover art and artwork options from IGDB or fallback DB."""
    if client_id and client_secret:
        igdb = IGDBClient(client_id=client_id, client_secret=client_secret)
        igdb_covers = await igdb.get_cover_options(query=query, igdb_id=igdb_id, platform_id=platform_id)
        if igdb_covers:
            return igdb_covers

    # Fallback to local database if IGDB not configured or returned nothing
    options: List[CoverOption] = []
    q_clean = query.lower().strip()
    for item in FALLBACK_DATABASE:
        if q_clean in item["title"].lower() or item["title"].lower() in q_clean:
            if item.get("cover"):
                options.append(CoverOption(
                    id=f"fallback_{item['platform_id']}_{item['title']}",
                    url=item["cover"],
                    url_hd=item["cover"],
                    thumbnail_url=item["cover"],
                    type="cover",
                    label=f"{item['title']} (Default Cover)",
                    platforms=[item["platform_id"]],
                    release_year=item.get("year")
                ))

    return options
