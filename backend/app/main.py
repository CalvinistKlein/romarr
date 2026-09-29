import asyncio
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.app.core.config import settings
from backend.app.core.database import init_db, AsyncSessionLocal
from backend.app.core.seeder import seed_initial_data
from backend.app.services.scheduler import start_scheduler_loop

from backend.app.api.games import router as games_router
from backend.app.api.search import router as search_router
from backend.app.api.releases import router as releases_router
from backend.app.api.queue import router as queue_router
from backend.app.api.settings import router as settings_router
from backend.app.api.platforms import router as platforms_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize database tables
    await init_db()
    
    # Seed initial demo games if table is empty
    async with AsyncSessionLocal() as db:
        await seed_initial_data(db)
    
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

# CORS middleware for development frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(games_router, prefix=settings.API_PREFIX)
app.include_router(search_router, prefix=settings.API_PREFIX)
app.include_router(releases_router, prefix=settings.API_PREFIX)
app.include_router(queue_router, prefix=settings.API_PREFIX)
app.include_router(settings_router, prefix=settings.API_PREFIX)
app.include_router(platforms_router, prefix=settings.API_PREFIX)

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "app": settings.APP_NAME, "version": settings.APP_VERSION}

# Mount static frontend build if it exists (for production / Docker)
frontend_dist = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if frontend_dist.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="frontend")
