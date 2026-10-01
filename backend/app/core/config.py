import os
from pathlib import Path
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "Romarr"
    APP_VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    
    # Base directories
    DATA_DIR: str = os.getenv("DATA_DIR", str(Path(__file__).resolve().parent.parent.parent / "data"))
    ROMS_DIR: str = os.getenv("ROMS_DIR", "/roms")
    DOWNLOADS_DIR: str = os.getenv("DOWNLOADS_DIR", "/downloads")
    
    # Database
    DATABASE_URL: str = ""

    # Defaults
    OS_STRUCTURE: str = os.getenv("OS_STRUCTURE", "batocera") # "batocera", "retropie", "recalbox", "es-de"
    PREFERRED_REGIONS: list[str] = ["USA", "EUR", "JPN", "WORLD"]

    # Security — API key auth (leave empty to auto-generate on first startup)
    ROMARR_API_KEY: str = os.getenv("ROMARR_API_KEY", "")

    # Logging
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")

    # Allowlisted path prefixes for roms_root_dir / downloads_dir settings
    ALLOWED_PATH_PREFIXES: list[str] = ["/roms", "/downloads", "/media", "/mnt", "/DATA", "/data"]

    class Config:
        env_file = ".env"
        extra = "allow"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Ensure data directory exists
        Path(self.DATA_DIR).mkdir(parents=True, exist_ok=True)
        if not self.DATABASE_URL:
            db_path = Path(self.DATA_DIR) / "romarr.db"
            self.DATABASE_URL = f"sqlite+aiosqlite:///{db_path}"

settings = Settings()
