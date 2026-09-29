"""
Initial Database Seeder.
Populates initial sample retro game entries and active queue tasks for immediate UI demonstration.
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.models.models import Game, DownloadQueueItem
from datetime import datetime, timezone

INITIAL_GAMES = [
    {
        "title": "Chrono Trigger",
        "slug": "chrono-trigger",
        "platform_id": "snes",
        "platform_name": "Super Nintendo (SNES)",
        "summary": "A group of adventurers travel through time to prevent the global catastrophe caused by the alien parasite Lavos.",
        "cover_url": "https://images.igdb.com/igdb/image/upload/t_cover_big/co1x82.jpg",
        "release_year": 1995,
        "developer": "Square",
        "publisher": "Square",
        "genres": "RPG, Turn-based",
        "status": "downloaded",
        "preferred_region": "USA",
        "file_path": "/roms/snes/Chrono Trigger (USA).sfc",
        "file_size_bytes": 4194304
    },
    {
        "title": "Metal Gear Solid",
        "slug": "metal-gear-solid",
        "platform_id": "psx",
        "platform_name": "Sony PlayStation (PS1)",
        "summary": "Solid Snake infiltrates a nuclear weapons facility on Shadow Moses Island to neutralize rogue FOXHOUND agents.",
        "cover_url": "https://images.igdb.com/igdb/image/upload/t_cover_big/co1x73.jpg",
        "release_year": 1998,
        "developer": "Konami",
        "publisher": "Konami",
        "genres": "Stealth, Action",
        "status": "downloading",
        "preferred_region": "USA",
        "file_path": None,
        "file_size_bytes": None
    },
    {
        "title": "Pokemon Emerald Version",
        "slug": "pokemon-emerald-version",
        "platform_id": "gba",
        "platform_name": "Game Boy Advance",
        "summary": "Journey through the Hoenn region, battle Team Aqua and Team Magma, and awaken the legendary Rayquaza.",
        "cover_url": "https://images.igdb.com/igdb/image/upload/t_cover_big/co1x6m.jpg",
        "release_year": 2004,
        "developer": "Game Freak",
        "publisher": "Nintendo",
        "genres": "RPG, Adventure",
        "status": "downloaded",
        "preferred_region": "USA",
        "file_path": "/roms/gba/Pokemon Emerald Version (USA).gba",
        "file_size_bytes": 16777216
    },
    {
        "title": "Super Mario 64",
        "slug": "super-mario-64",
        "platform_id": "n64",
        "platform_name": "Nintendo 64",
        "summary": "Mario explores Peach's castle and jumps into paintings to collect Power Stars and save Princess Peach.",
        "cover_url": "https://images.igdb.com/igdb/image/upload/t_cover_big/co1x7d.jpg",
        "release_year": 1996,
        "developer": "Nintendo",
        "publisher": "Nintendo",
        "genres": "Platform, 3D",
        "status": "wanted",
        "preferred_region": "EUR",
        "file_path": None,
        "file_size_bytes": None
    },
    {
        "title": "The Legend of Zelda: The Wind Waker",
        "slug": "the-legend-of-zelda-the-wind-waker",
        "platform_id": "gamecube",
        "platform_name": "Nintendo GameCube",
        "summary": "Link sails across the Great Sea with the King of Red Lions to rescue his sister Aryll.",
        "cover_url": "https://images.igdb.com/igdb/image/upload/t_cover_big/co1x70.jpg",
        "release_year": 2002,
        "developer": "Nintendo",
        "publisher": "Nintendo",
        "genres": "Action, Adventure",
        "status": "downloaded",
        "preferred_region": "USA",
        "file_path": "/roms/gamecube/The Legend of Zelda - The Wind Waker (USA).rvz",
        "file_size_bytes": 1415577600
    },
    {
        "title": "Grand Theft Auto: San Andreas",
        "slug": "grand-theft-auto-san-andreas",
        "platform_id": "ps2",
        "platform_name": "Sony PlayStation 2",
        "summary": "Carl 'CJ' Johnson returns home to Los Santos to clear his name and save his family.",
        "cover_url": "https://images.igdb.com/igdb/image/upload/t_cover_big/co1x6n.jpg",
        "release_year": 2004,
        "developer": "Rockstar North",
        "publisher": "Rockstar Games",
        "genres": "Action, Open World",
        "status": "wanted",
        "preferred_region": "USA",
        "file_path": None,
        "file_size_bytes": None
    },
    {
        "title": "Mother 3",
        "slug": "mother-3",
        "platform_id": "gba",
        "platform_name": "Game Boy Advance",
        "summary": "Lucas and his friends journey through the Nowhere Islands to defend against the Pigmask Army.",
        "cover_url": "https://images.igdb.com/igdb/image/upload/t_cover_big/co1x6k.jpg",
        "release_year": 2006,
        "developer": "Brownie Brown / HAL",
        "publisher": "Nintendo",
        "genres": "RPG, Turn-based",
        "status": "downloaded",
        "preferred_region": "TRANSLATION",
        "file_path": "/roms/gba/Mother 3 (Japan) [T-En by Tomato v1.3].gba",
        "file_size_bytes": 33554432
    },
    {
        "title": "Shenmue",
        "slug": "shenmue",
        "platform_id": "dreamcast",
        "platform_name": "Sega Dreamcast",
        "summary": "Ryo Hazuki investigates his father's murder in 1986 Yokosuka, Japan.",
        "cover_url": "https://images.igdb.com/igdb/image/upload/t_cover_big/co1x6i.jpg",
        "release_year": 1999,
        "developer": "Sega AM2",
        "publisher": "Sega",
        "genres": "Adventure, Action",
        "status": "wanted",
        "preferred_region": "JPN",
        "file_path": None,
        "file_size_bytes": None
    }
]

async def seed_initial_data(db: AsyncSession):
    """Seed initial demo games if the library is empty."""
    res = await db.execute(select(Game))
    existing = res.scalars().all()
    if existing:
        return

    # Add games
    for g_data in INITIAL_GAMES:
        game = Game(**g_data)
        db.add(game)
    await db.commit()

    # Add active queue item for the downloading game
    mgs_res = await db.execute(select(Game).where(Game.slug == "metal-gear-solid"))
    mgs = mgs_res.scalars().first()
    if mgs:
        q_item = DownloadQueueItem(
            game_id=mgs.id,
            release_title="Metal Gear Solid (USA) (Disc 1) (v1.1) [No-Intro].chd",
            download_client="qbittorrent",
            download_id="mock_seed_001",
            status="downloading",
            progress=45.0,
            download_speed=12582912, # 12 MB/s
            eta_seconds=120,
            size_bytes=587202560,
            region="USA",
            format="CHD",
            indexer="GazelleGames",
            added_at=datetime.now(timezone.utc)
        )
        db.add(q_item)
        await db.commit()
