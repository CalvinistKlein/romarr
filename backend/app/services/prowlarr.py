"""
Prowlarr & Torznab Integration Service.
Queries indexers for ROM/ISO releases, integrates region parsing, and calculates relevance scores.
"""

import logging
import re
import urllib.parse
from typing import List, Dict, Any, Optional

import httpx

from backend.app.services.platforms import PLATFORMS
from backend.app.services.region_parser import parse_release_title, score_and_sort_releases

log = logging.getLogger("romarr.prowlarr")


def _extract_info_hash(info_hash: Optional[str], magnet_url: Optional[str]) -> Optional[str]:
    """Extract or normalize torrent info_hash."""
    if info_hash and len(info_hash) in (40, 32) and not info_hash.startswith("mock"):
        return info_hash.lower()
    if magnet_url:
        m = re.search(r"urn:btih:([a-fA-F0-9]{40}|[a-zA-Z2-7]{32})", magnet_url)
        if m:
            return m.group(1).lower()
    return None


class ProwlarrClient:
    def __init__(self, base_url: str = "http://localhost:9696", api_key: str = ""):
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key

    async def test_connection(self) -> Dict[str, Any]:
        """Test connectivity to Prowlarr API."""
        if not self.base_url or not self.api_key:
            return {"success": False, "message": "Prowlarr URL or API Key is missing."}

        url = f"{self.base_url}/api/v1/system/status"
        headers = {"X-Api-Key": self.api_key}

        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                res = await client.get(url, headers=headers)
                if res.status_code == 200:
                    data = res.json()
                    return {
                        "success": True,
                        "version": data.get("version", "Unknown"),
                        "message": f"Successfully connected to Prowlarr v{data.get('version', '')}"
                    }
                return {"success": False, "message": f"Prowlarr returned HTTP {res.status_code}"}
            except Exception as exc:
                log.warning("Prowlarr connection test failed: %s", exc)
                return {"success": False, "message": f"Connection failed: {exc}"}

    async def search_releases(
        self,
        query: str,
        platform_id: Optional[str] = None,
        preferred_regions: Optional[List[str]] = None,
        region_filter: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Search Prowlarr indexers for a game title and platform."""
        raw_releases: List[Dict[str, Any]] = []

        preferred_format = None
        categories = []
        if platform_id and platform_id in PLATFORMS:
            p_info = PLATFORMS[platform_id]
            categories = list(p_info.torznab_categories or [])
            preferred_format = p_info.preferred_format

        clean_query = query.strip()

        if self.base_url and self.api_key and clean_query:
            url = f"{self.base_url}/api/v1/search"
            headers = {"X-Api-Key": self.api_key}

            # Attempt 1: Search with categories if configured
            params = {
                "query": clean_query,
                "type": "search"
            }
            if categories:
                params["categories"] = categories

            async with httpx.AsyncClient(timeout=45.0) as client:
                try:
                    res = await client.get(url, headers=headers, params=params)
                    if res.status_code == 200:
                        items = res.json()
                        for item in items:
                            mag = item.get("magnetUrl")
                            dl = item.get("downloadUrl") or mag
                            h = _extract_info_hash(item.get("infoHash"), mag)
                            raw_releases.append({
                                "title": item.get("title", ""),
                                "download_url": dl,
                                "magnet_url": mag,
                                "info_hash": h,
                                "size_bytes": item.get("size", 0),
                                "seeders": item.get("seeders", 0),
                                "leechers": item.get("leechers", 0),
                                "indexer": item.get("indexer", "Prowlarr"),
                                "publish_date": item.get("publishDate")
                            })
                except Exception as exc:
                    log.error("Prowlarr search error: %s", exc)

                # Attempt 2: If categories returned 0 results, fall back to global search
                if not raw_releases and categories:
                    try:
                        log.info("Categories search returned 0 items; falling back to global search for '%s'", clean_query)
                        fallback_params = {"query": clean_query, "type": "search"}
                        res2 = await client.get(url, headers=headers, params=fallback_params)
                        if res2.status_code == 200:
                            for item in res2.json():
                                mag = item.get("magnetUrl")
                                dl = item.get("downloadUrl") or mag
                                h = _extract_info_hash(item.get("infoHash"), mag)
                                raw_releases.append({
                                    "title": item.get("title", ""),
                                    "download_url": dl,
                                    "magnet_url": mag,
                                    "info_hash": h,
                                    "size_bytes": item.get("size", 0),
                                    "seeders": item.get("seeders", 0),
                                    "leechers": item.get("leechers", 0),
                                    "indexer": item.get("indexer", "Prowlarr"),
                                    "publish_date": item.get("publishDate")
                                })
                    except Exception as exc2:
                        log.error("Prowlarr fallback search error: %s", exc2)

        if not raw_releases:
            return []

        return score_and_sort_releases(
            releases=raw_releases,
            preferred_regions=preferred_regions or ["USA", "EUR", "JPN", "WORLD", "TRANSLATION"],
            preferred_format=preferred_format,
            selected_region_filter=region_filter
        )
