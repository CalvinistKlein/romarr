from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List

from backend.app.core.database import get_db
from backend.app.models.models import Game
from backend.app.services.platforms import PLATFORMS

router = APIRouter(prefix="/platforms", tags=["Platforms"])

@router.get("")
async def list_platforms(db: AsyncSession = Depends(get_db)):
    # Count games per platform in library
    stmt = select(Game.platform_id, func.count(Game.id)).group_by(Game.platform_id)
    result = await db.execute(stmt)
    counts = dict(result.all())

    platform_list = []
    for p_id, p_info in PLATFORMS.items():
        platform_list.append({
            "id": p_info.id,
            "name": p_info.name,
            "manufacturer": p_info.manufacturer,
            "batocera_folder": p_info.batocera_folder,
            "retropie_folder": p_info.retropie_folder,
            "recalbox_folder": p_info.recalbox_folder,
            "extensions": p_info.extensions,
            "preferred_format": p_info.preferred_format,
            "icon": p_info.icon,
            "game_count": counts.get(p_info.id, 0)
        })

    return platform_list
