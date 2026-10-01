import asyncio
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from backend.app.core.config import settings
from backend.app.core.logging_config import configure_logging
from backend.app.core.database import init_db, AsyncSessionLocal
from backend.app.core.seeder import seed_initial_data
from backend.app.core.auth import _resolve_api_key, auth_router
from backend.app.services.scheduler import start_scheduler_loop

from backend.app.api.games import router as games_router
from backend.app.api.search import router as search_router
from backend.app.api.releases import router as releases_router
from backend.app.api.queue import router as queue_router
from backend.app.api.settings import router as settings_router
from backend.app.api.platforms import router as platforms_router
from backend.app.api.import_roms import router as import_router

# Configure structured logging before anything else
configure_logging(settings.LOG_LEVEL)

import logging
log = logging.getLogger("romarr.main")

# Rate limiter (applied per-route via @limiter.limit decorators)
limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize database tables
    await init_db()
    
    # Seed initial demo games if table is empty
    async with AsyncSessionLocal() as db:
        await seed_initial_data(db)

    # Resolve / generate the API key now so it prints at startup
    active_key = _resolve_api_key()
    log.info("Romarr API key loaded (length=%d).", len(active_key))

    # Start background queue scheduler loop
    scheduler_task = asyncio.create_task(start_scheduler_loop())
    
    yield
    
    # Shutdown: cancel background scheduler
    scheduler_task.cancel()

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan
)

# Attach rate-limiter state and its exception handler
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS — credentials are NOT used (no cookies/sessions), so allow_credentials
# is removed.  Restrict origins in production via the ROMARR_CORS_ORIGINS env var.
import os
_cors_origins = os.getenv("ROMARR_CORS_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _cors_origins],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "X-Api-Key"],
)

# Register API Routers
app.include_router(auth_router, prefix=settings.API_PREFIX)
app.include_router(games_router, prefix=settings.API_PREFIX)
app.include_router(search_router, prefix=settings.API_PREFIX)
app.include_router(releases_router, prefix=settings.API_PREFIX)
app.include_router(queue_router, prefix=settings.API_PREFIX)
app.include_router(settings_router, prefix=settings.API_PREFIX)
app.include_router(platforms_router, prefix=settings.API_PREFIX)
app.include_router(import_router, prefix=settings.API_PREFIX)

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "app": settings.APP_NAME, "version": settings.APP_VERSION}

# Mount static frontend build if it exists (for production / Docker)
frontend_dist = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if frontend_dist.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="frontend")
