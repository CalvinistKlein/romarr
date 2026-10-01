"""Centralised logging configuration for Romarr."""

import logging
import sys


def configure_logging(level: str = "INFO") -> None:
    """Configure root logger with a consistent format."""
    numeric_level = getattr(logging, level.upper(), logging.INFO)
    logging.basicConfig(
        stream=sys.stdout,
        level=numeric_level,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%SZ",
    )
    # Quieten noisy third-party loggers
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
