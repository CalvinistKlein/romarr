"""
qBittorrent Web API and Download Manager Service.
Handles sending torrents/magnets, tracking download progress, and notifying the organizer.
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

    async def login(self) -> bool:
        """Authenticate with qBittorrent Web UI."""
        url = f"{self.base_url}/api/v2/auth/login"
        data = {"username": self.username, "password": self.password}
        async with httpx.AsyncClient(timeout=8.0) as client:
            try:
                res = await client.post(url, data=data)
                if res.status_code == 200 and "set-cookie" in res.headers:
                    for cookie_header in res.headers.get_list("set-cookie"):
                        if "SID=" in cookie_header:
                            sid = cookie_header.split(";")[0].split("=")[1]
                            self.cookies = {"SID": sid}
                            return True
                return res.text == "Ok."
            except Exception as exc:
                log.error("qBittorrent login error: %s", exc)
                return False

    async def test_connection(self) -> Dict[str, Any]:
        """Test connection and authentication to qBittorrent."""
        if not self.base_url:
            return {"success": False, "message": "qBittorrent URL is missing."}

        logged_in = await self.login()
        if not logged_in:
            return {"success": False, "message": "Could not authenticate with qBittorrent."}

        url = f"{self.base_url}/api/v2/app/version"
        async with httpx.AsyncClient(timeout=8.0, cookies=self.cookies) as client:
            try:
                res = await client.get(url)
                if res.status_code == 200:
                    return {
                        "success": True,
                        "version": res.text,
                        "message": f"Successfully connected to qBittorrent v{res.text}"
                    }
                return {"success": False, "message": f"Status check failed: HTTP {res.status_code}"}
            except Exception as exc:
                log.error("qBittorrent connection check error: %s", exc)
                return {"success": False, "message": f"Connection error: {exc}"}

    async def add_download(self, url_or_magnet: str, save_path: Optional[str] = None) -> bool:
        """Add a torrent or magnet link to qBittorrent."""
        await self.login()
        url = f"{self.base_url}/api/v2/torrents/add"
        data: Dict[str, str] = {
            "urls": url_or_magnet,
            "category": self.category,
            "tags": "Romarr",
            "paused": "false",
        }
        if save_path:
            data["savepath"] = save_path

        async with httpx.AsyncClient(timeout=10.0, cookies=self.cookies) as client:
            try:
                res = await client.post(url, data=data)
                return res.status_code == 200 or res.text == "Ok."
            except Exception as exc:
                log.error("qBittorrent add_download error: %s", exc)
                return False

    async def get_active_downloads(self) -> List[Dict[str, Any]]:
        """Get all torrents under Romarr category."""
        await self.login()
        url = f"{self.base_url}/api/v2/torrents/info"
        params = {"category": self.category}

        async with httpx.AsyncClient(timeout=10.0, cookies=self.cookies) as client:
            try:
                res = await client.get(url, params=params)
                if res.status_code == 200:
                    return res.json()
            except Exception as exc:
                log.error("qBittorrent get_active_downloads error: %s", exc)
        return []

    async def pause_download(self, info_hash: str) -> bool:
        await self.login()
        url = f"{self.base_url}/api/v2/torrents/pause"
        async with httpx.AsyncClient(timeout=8.0, cookies=self.cookies) as client:
            res = await client.post(url, data={"hashes": info_hash})
            return res.status_code == 200

    async def resume_download(self, info_hash: str) -> bool:
        await self.login()
        url = f"{self.base_url}/api/v2/torrents/resume"
        async with httpx.AsyncClient(timeout=8.0, cookies=self.cookies) as client:
            res = await client.post(url, data={"hashes": info_hash})
            return res.status_code == 200

    async def delete_download(self, info_hash: str, delete_files: bool = True) -> bool:
        await self.login()
        url = f"{self.base_url}/api/v2/torrents/delete"
        async with httpx.AsyncClient(timeout=8.0, cookies=self.cookies) as client:
            res = await client.post(url, data={
                "hashes": info_hash,
                "deleteFiles": "true" if delete_files else "false"
            })
            return res.status_code == 200
