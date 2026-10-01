"""
Credential encryption helpers using Fernet symmetric encryption.

If ROMARR_SECRET_KEY is set (64-char hex string), sensitive settings values
(passwords, API keys) are encrypted before being written to the SQLite DB and
decrypted transparently on read.

If the env var is NOT set, values are stored in plaintext with a startup
warning — useful for pure local / dev setups.

Generate a key:
    python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

Then add to docker-compose.yml:
    environment:
      - ROMARR_SECRET_KEY=<generated-key>
"""

import logging
import os
from typing import Optional

log = logging.getLogger("romarr.security")

# Sentinel so we can tell the difference between "not encrypted" and an empty value
_ENCRYPTED_PREFIX = "enc:"

_fernet = None
_fernet_loaded = False


def _get_fernet():
    global _fernet, _fernet_loaded
    if _fernet_loaded:
        return _fernet
    _fernet_loaded = True

    raw_key = os.getenv("ROMARR_SECRET_KEY", "")
    if not raw_key:
        log.warning(
            "ROMARR_SECRET_KEY is not set — sensitive settings (passwords, API keys) "
            "will be stored in plaintext in the SQLite database. "
            "Set ROMARR_SECRET_KEY to enable at-rest encryption."
        )
        return None

    try:
        from cryptography.fernet import Fernet
        _fernet = Fernet(raw_key.encode())
        log.info("At-rest encryption enabled (Fernet).")
    except Exception as exc:
        log.error("Failed to initialise Fernet encryption: %s — falling back to plaintext.", exc)
        _fernet = None
    return _fernet


# Keys that should be encrypted when stored
SENSITIVE_SETTING_KEYS = frozenset({
    "prowlarr_api_key",
    "qbittorrent_password",
    "igdb_client_id",
    "igdb_client_secret",
})

# Placeholder returned to callers for masked fields
REDACTED_PLACEHOLDER = "••••••••"


def encrypt_value(value: str) -> str:
    """Encrypt a string if a key is configured, otherwise return as-is."""
    f = _get_fernet()
    if not f or not value:
        return value
    return _ENCRYPTED_PREFIX + f.encrypt(value.encode()).decode()


def decrypt_value(value: str) -> str:
    """Decrypt an encrypted string; pass through plaintext values."""
    if not value or not value.startswith(_ENCRYPTED_PREFIX):
        return value
    f = _get_fernet()
    if not f:
        # Key removed after values were encrypted — return as-is (garbage)
        log.error("Encrypted value found but ROMARR_SECRET_KEY is not set.")
        return value
    try:
        return f.decrypt(value[len(_ENCRYPTED_PREFIX):].encode()).decode()
    except Exception as exc:
        log.error("Failed to decrypt setting value: %s", exc)
        return ""


def mask_settings_for_response(settings_dict: dict) -> dict:
    """
    Return a copy of settings_dict with sensitive values replaced by a
    redaction placeholder.  Used by GET /api/settings so credentials are
    never returned to the browser.
    """
    masked = dict(settings_dict)
    for key in SENSITIVE_SETTING_KEYS:
        if masked.get(key):
            masked[key] = REDACTED_PLACEHOLDER
    return masked


def is_redacted(value: str) -> bool:
    """Return True if the caller sent back the redaction placeholder unchanged."""
    return value == REDACTED_PLACEHOLDER
