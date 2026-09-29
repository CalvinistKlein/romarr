from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from backend.app.core.database import get_db
from backend.app.services.settings_service import get_app_settings
from backend.app.services.metadata import search_metadata

router = APIRouter(prefix="/search", tags=["Search"])

@router.get("")
async def search_games_catalog(
    query: str = Query(..., min_length=1),
    platform_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Search for games across IGDB and the built-in catalog."""
    settings = await get_app_settings(db)
    client_id = settings.get("igdb_client_id", "")
    client_secret = settings.get("igdb_client_secret", "")

    results = await search_metadata(
        query=query,
        platform_id=platform_id,
        client_id=client_id,
        client_secret=client_secret
    )
    return results
