"""
Authentication & API Key Guard.

Romarr generates a random API key on first startup and saves it to
<DATA_DIR>/api_key.txt  (mode 0600).

You can also supply a fixed key via the ROMARR_API_KEY environment variable
(useful for Docker secrets / docker-compose).

Every request to the API must include:
    X-Api-Key: <your-key>

To retrieve your key after first boot:
    docker exec romarr cat /app/data/api_key.txt
"""

import secrets
import logging
from pathlib import Path
from functools import lru_cache

from fastapi import Security, HTTPException, status
from fastapi.security.api_key import APIKeyHeader, APIKeyQuery

log = logging.getLogger("romarr.auth")

API_KEY_HEADER_NAME = "X-Api-Key"
_api_key_header = APIKeyHeader(name=API_KEY_HEADER_NAME, auto_error=False)
_api_key_query = APIKeyQuery(name="api_key", auto_error=False)


@lru_cache(maxsize=1)
def _resolve_api_key() -> str:
    """
    Load-or-generate the active API key exactly once per process.
    Priority: ROMARR_API_KEY env var → DATA_DIR/api_key.txt → generate new.
    """
    # Lazy import to avoid circular dependencies with config
    from backend.app.core.config import settings

    # 1. Environment variable (highest priority)
    if settings.ROMARR_API_KEY:
        log.info("API key loaded from ROMARR_API_KEY environment variable.")
        return settings.ROMARR_API_KEY

    key_file = Path(settings.DATA_DIR) / "api_key.txt"

    # 2. Persisted key file
    if key_file.exists():
        key = key_file.read_text().strip()
        if key:
            return key

    # 3. Generate a new key and persist it
    new_key = secrets.token_hex(32)
    key_file.parent.mkdir(parents=True, exist_ok=True)
    key_file.write_text(new_key)
    key_file.chmod(0o600)
    log.warning(
        "╔══════════════════════════════════════════════════════════════╗\n"
        "║  Romarr generated a new API key on first startup.           ║\n"
        "║  Retrieve it with:  cat %s  ║\n"
        "║  Or set ROMARR_API_KEY env var to use a fixed key.          ║\n"
        "╚══════════════════════════════════════════════════════════════╝",
        str(key_file),
    )
    return new_key


async def require_api_key(
    header_key: str = Security(_api_key_header),
    query_key: str = Security(_api_key_query),
) -> str:
    """FastAPI dependency — accepts X-Api-Key header or ?api_key= query parameter."""
    active = _resolve_api_key()
    if not active:
        return ""
    key = header_key or query_key
    if not key or not secrets.compare_digest(key, active):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid or missing API key. Set the X-Api-Key header or ?api_key= query parameter.",
        )
    return key
