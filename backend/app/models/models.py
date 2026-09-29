from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, Float, Boolean, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

def _utcnow():
    return datetime.now(timezone.utc)

class Game(Base):
    __tablename__ = "games"
    __table_args__ = (
        UniqueConstraint("title", "platform_id", name="uq_game_title_platform"),
    )

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False, index=True)
    slug = Column(String(255), nullable=False, index=True)
    platform_id = Column(String(50), nullable=False, index=True) # e.g. "ps2", "snes"
    platform_name = Column(String(100), nullable=False)
    igdb_id = Column(Integer, nullable=True, index=True)
    summary = Column(Text, nullable=True)
    cover_url = Column(String(500), nullable=True)
    banner_url = Column(String(500), nullable=True)
    release_year = Column(Integer, nullable=True)
    developer = Column(String(150), nullable=True)
    publisher = Column(String(150), nullable=True)
    genres = Column(String(255), nullable=True) # comma-separated
    status = Column(String(50), default="wanted", index=True) # wanted, queued, downloading, downloaded, missing
    preferred_region = Column(String(20), default="USA")
    file_path = Column(String(1000), nullable=True)
    file_size_bytes = Column(Integer, nullable=True)
    
    created_at = Column(DateTime, default=_utcnow)
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow)

    queue_items = relationship("DownloadQueueItem", back_populates="game", cascade="all, delete-orphan")


class DownloadQueueItem(Base):
    __tablename__ = "download_queue"

    id = Column(Integer, primary_key=True, index=True)
    game_id = Column(Integer, ForeignKey("games.id", ondelete="CASCADE"), nullable=True)
    release_title = Column(String(500), nullable=False)
    download_client = Column(String(50), default="qbittorrent")
    download_id = Column(String(255), nullable=True, index=True) # Torrent info_hash or client ID
    status = Column(String(50), default="queued") # queued, downloading, extracting, organizing, completed, failed
    progress = Column(Float, default=0.0)
    download_speed = Column(Integer, default=0) # bytes/sec
    eta_seconds = Column(Integer, default=0)
    size_bytes = Column(Integer, default=0)
    region = Column(String(50), default="UNKNOWN")
    format = Column(String(50), default="ROM")
    indexer = Column(String(100), default="Prowlarr")
    download_url = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)
    
    added_at = Column(DateTime, default=_utcnow)
    completed_at = Column(DateTime, nullable=True)

    game = relationship("Game", back_populates="queue_items")


class AppSetting(Base):
    __tablename__ = "settings"

    key = Column(String(100), primary_key=True, index=True)
    value = Column(Text, nullable=False) # JSON encoded string


class IndexerConfig(Base):
    __tablename__ = "indexer_configs"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    url = Column(String(500), nullable=False)
    api_key = Column(String(255), nullable=True)
    type = Column(String(50), default="prowlarr") # prowlarr, torznab
    enabled = Column(Boolean, default=True)
    categories = Column(String(255), default="1000,1010,1020,1030,1040,1050,1060,1070,1080,1090,1110,1120,1140")
