"""
qBittorrent Web API and Download Manager Service.
Handles sending torrents/magnets, tracking download progress, and notifying the organizer.
Compatible with qBittorrent v4.x and v5.x (supporting both 200 and 204 auth responses,
QBT_SID session cookies, and CSRF origin headers).
"""

import logging
from typing import List, Dict, Any, Optional

import httpx

log = logging.getLogger("romarr.qbit")


class QBitClient:
    def __init__(
        self,
        base_url: str = "http://localhost:8080",
        username: str = "admin",
        password: str = "adminadmin",
        category: str = "romarr"
    ):
        self.base_url = base_url.rstrip("/")
        self.username = username
        self.password = password
        self.category = category
        self.cookies: Dict[str, str] = {}
        self.headers: Dict[str, str] = {
            "Referer": self.base_url,
            "Origin": self.base_url,
            "User-Agent": "Romarr/1.0"
        }

    async def login(self) -> bool:
        """Authenticate with qBittorrent Web UI (v4.x and v5.x compatible)."""
        if not self.base_url:
            return False

        url = f"{self.base_url}/api/v2/auth/login"
        data = {"username": self.username, "password": self.password}

        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            try:
                res = await client.post(url, data=data, headers=self.headers)

                # qBittorrent returns 200 (v4) with "Ok." or 204 (v5) on success.
                # If authentication fails, it returns 401 Unauthorized or 200 with "Fails."
                if res.status_code in (200, 204) and res.text.strip() != "Fails.":
                    # Extract cookies from httpx client jar
                    for k, v in res.cookies.items():
                        self.cookies[k] = v

                    # Also explicitly check set-cookie headers for QBT_SID / SID
                    for cookie_header in res.headers.get_list("set-cookie"):
                        parts = cookie_header.split(";")
                        if parts:
                            name_val = parts[0].split("=", 1)
                            if len(name_val) == 2:
                                self.cookies[name_val[0].strip()] = name_val[1].strip()

                    log.debug("Authenticated with qBittorrent successfully (status=%d, cookies=%s).",
                              res.status_code, list(self.cookies.keys()))
                    return True

                log.warning("qBittorrent login failed: HTTP %d %s", res.status_code, res.text[:100])
                return False
            except Exception as exc:
                log.error("qBittorrent login error: %s", exc)
                return False

    async def test_connection(self) -> Dict[str, Any]:
        """Test connection and authentication to qBittorrent."""
        if not self.base_url:
            return {"success": False, "message": "qBittorrent Web UI Host URL is missing."}

        logged_in = await self.login()
        if not logged_in:
            return {
                "success": False,
                "message": f"Could not authenticate with qBittorrent at {self.base_url}. Check username and password."
            }

        url = f"{self.base_url}/api/v2/app/version"
        async with httpx.AsyncClient(timeout=8.0, cookies=self.cookies, headers=self.headers) as client:
            try:
                res = await client.get(url)
                if res.status_code == 200:
                    version = res.text.strip()
                    return {
                        "success": True,
                        "version": version,
                        "message": f"Successfully connected to qBittorrent v{version}"
                    }
                return {"success": False, "message": f"Status check failed: HTTP {res.status_code}"}
            except Exception as exc:
                log.error("qBittorrent connection check error: %s", exc)
                return {"success": False, "message": f"Connection error: {exc}"}

    async def add_download(self, url_or_magnet: str, save_path: Optional[str] = None) -> bool:
        """Add a torrent or magnet link to qBittorrent."""
        if not await self.login():
            return False

        url = f"{self.base_url}/api/v2/torrents/add"
        data: Dict[str, str] = {
            "urls": url_or_magnet,
            "category": self.category,
            "tags": "Romarr",
            "paused": "false",
        }
        if save_path:
            data["savepath"] = save_path

        async with httpx.AsyncClient(timeout=10.0, cookies=self.cookies, headers=self.headers) as client:
            try:
                res = await client.post(url, data=data)
                return res.status_code in (200, 204) or res.text == "Ok."
            except Exception as exc:
                log.error("qBittorrent add_download error: %s", exc)
                return False

    async def get_active_downloads(self) -> List[Dict[str, Any]]:
        """Get all torrents under Romarr category."""
        if not await self.login():
            return []

        url = f"{self.base_url}/api/v2/torrents/info"
        params = {"category": self.category}

        async with httpx.AsyncClient(timeout=10.0, cookies=self.cookies, headers=self.headers) as client:
            try:
                res = await client.get(url, params=params)
                if res.status_code == 200:
                    return res.json()
            except Exception as exc:
                log.error("qBittorrent get_active_downloads error: %s", exc)
        return []

    async def pause_download(self, info_hash: str) -> bool:
        if not await self.login():
            return False
        url = f"{self.base_url}/api/v2/torrents/pause"
        async with httpx.AsyncClient(timeout=8.0, cookies=self.cookies, headers=self.headers) as client:
            res = await client.post(url, data={"hashes": info_hash})
            return res.status_code in (200, 204)

    async def resume_download(self, info_hash: str) -> bool:
        if not await self.login():
            return False
        url = f"{self.base_url}/api/v2/torrents/resume"
        async with httpx.AsyncClient(timeout=8.0, cookies=self.cookies, headers=self.headers) as client:
            res = await client.post(url, data={"hashes": info_hash})
            return res.status_code in (200, 204)

    async def delete_download(self, info_hash: str, delete_files: bool = True) -> bool:
        if not await self.login():
            return False
        url = f"{self.base_url}/api/v2/torrents/delete"
        async with httpx.AsyncClient(timeout=8.0, cookies=self.cookies, headers=self.headers) as client:
            res = await client.post(url, data={
                "hashes": info_hash,
                "deleteFiles": "true" if delete_files else "false"
            })
            return res.status_code in (200, 204)
