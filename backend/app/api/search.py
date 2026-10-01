import logging
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from backend.app.core.database import get_db
from backend.app.core.auth import require_api_key
from backend.app.services.settings_service import get_app_settings
from backend.app.services.metadata import search_metadata

log = logging.getLogger("romarr.api.search")

router = APIRouter(prefix="/search", tags=["Search"], dependencies=[Depends(require_api_key)])


@router.get("")
async def search_games_catalog(
    query: str = Query(..., min_length=1, max_length=200),
    platform_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Search for games across IGDB and the built-in catalog."""
    app_settings = await get_app_settings(db)
    client_id = app_settings.get("igdb_client_id", "")
    client_secret = app_settings.get("igdb_client_secret", "")

    return await search_metadata(
        query=query,
        platform_id=platform_id,
        client_id=client_id,
        client_secret=client_secret
    )
