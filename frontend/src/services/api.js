/**
 * Romarr API client.
 *
 * The API key is read from the VITE_ROMARR_API_KEY environment variable at
 * build time, or falls back to the value stored in localStorage under the
 * key 'romarr_api_key'.  Set either before building / starting the dev server.
 *
 * Development: create frontend/.env.local with:
 *   VITE_ROMARR_API_KEY=<your-key-from-/app/data/api_key.txt>
 */

const API_BASE = '/api';

export function getApiKey() {
  if (import.meta.env.VITE_ROMARR_API_KEY) {
    return import.meta.env.VITE_ROMARR_API_KEY;
  }
  return localStorage.getItem('romarr_api_key') || '';
}

export function setApiKey(key) {
  if (key) {
    localStorage.setItem('romarr_api_key', key.trim());
  } else {
    localStorage.removeItem('romarr_api_key');
  }
}

function buildHeaders(extra = {}) {
  const key = getApiKey();
  const headers = { 'Content-Type': 'application/json', ...extra };
  if (key) headers['X-Api-Key'] = key;
  return headers;
}

async function handleResponse(res) {
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      detail = body.detail || body.message || detail;
    } catch (_) {}
    throw new Error(detail);
  }
  return res.json();
}

export const api = {
  // Games
  getGames: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.platform_id) query.append('platform_id', params.platform_id);
    if (params.status) query.append('status', params.status);
    if (params.query) query.append('query', params.query);
    if (params.region) query.append('region', params.region);

    const res = await fetch(`${API_BASE}/games?${query.toString()}`, {
      headers: buildHeaders({ 'Content-Type': undefined }),
    });
    return handleResponse(res);
  },

  getGame: async (id) => {
    const res = await fetch(`${API_BASE}/games/${id}`, {
      headers: buildHeaders({ 'Content-Type': undefined }),
    });
    return handleResponse(res);
  },

  addGame: async (gameData) => {
    const res = await fetch(`${API_BASE}/games`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(gameData),
    });
    return handleResponse(res);
  },

  deleteGame: async (id) => {
    const res = await fetch(`${API_BASE}/games/${id}`, {
      method: 'DELETE',
      headers: buildHeaders({ 'Content-Type': undefined }),
    });
    return handleResponse(res);
  },

  // Metadata Search
  searchCatalog: async (query, platform_id = '') => {
    const params = new URLSearchParams({ query });
    if (platform_id) params.append('platform_id', platform_id);
    const res = await fetch(`${API_BASE}/search?${params.toString()}`, {
      headers: buildHeaders({ 'Content-Type': undefined }),
    });
    return handleResponse(res);
  },

  // Releases (Prowlarr & Torznab)
  getReleases: async (gameId, region = '') => {
    const params = new URLSearchParams({ game_id: gameId });
    if (region && region !== 'ALL') params.append('region', region);
    const res = await fetch(`${API_BASE}/releases?${params.toString()}`, {
      headers: buildHeaders({ 'Content-Type': undefined }),
    });
    return handleResponse(res);
  },

  grabRelease: async (releaseData) => {
    const res = await fetch(`${API_BASE}/releases/grab`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(releaseData),
    });
    return handleResponse(res);
  },

  // Queue
  getQueue: async () => {
    const res = await fetch(`${API_BASE}/queue`, {
      headers: buildHeaders({ 'Content-Type': undefined }),
    });
    return handleResponse(res);
  },

  cancelQueueItem: async (id) => {
    const res = await fetch(`${API_BASE}/queue/${id}`, {
      method: 'DELETE',
      headers: buildHeaders({ 'Content-Type': undefined }),
    });
    return handleResponse(res);
  },

  // Platforms
  getPlatforms: async () => {
    const res = await fetch(`${API_BASE}/platforms`, {
      headers: buildHeaders({ 'Content-Type': undefined }),
    });
    return handleResponse(res);
  },

  // Settings
  getSettings: async () => {
    const res = await fetch(`${API_BASE}/settings`, {
      headers: buildHeaders({ 'Content-Type': undefined }),
    });
    return handleResponse(res);
  },

  saveSettings: async (settings) => {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: buildHeaders(),
      body: JSON.stringify(settings),
    });
    return handleResponse(res);
  },

  testProwlarr: async () => {
    const res = await fetch(`${API_BASE}/settings/test-prowlarr`, {
      method: 'POST',
      headers: buildHeaders({ 'Content-Type': undefined }),
    });
    return handleResponse(res);
  },

  testQBittorrent: async () => {
    const res = await fetch(`${API_BASE}/settings/test-qbittorrent`, {
      method: 'POST',
      headers: buildHeaders({ 'Content-Type': undefined }),
    });
    return handleResponse(res);
  },

  getSystemStatus: async () => {
    const res = await fetch(`${API_BASE}/settings/system-status`, {
      headers: buildHeaders({ 'Content-Type': undefined }),
    });
    return handleResponse(res);
  },

  rebuildRomLinks: async () => {
    const res = await fetch(`${API_BASE}/settings/rebuild-links`, {
      method: 'POST',
      headers: buildHeaders({ 'Content-Type': undefined }),
    });
    return handleResponse(res);
  },

  // Import
  getImportPlatforms: async () => {
    const res = await fetch(`${API_BASE}/import/platforms`, {
      headers: buildHeaders({ 'Content-Type': undefined }),
    });
    return handleResponse(res);
  },

  uploadRoms: async (formData) => {
    const key = getApiKey();
    const headers = {};
    if (key) headers['X-Api-Key'] = key;

    const res = await fetch(`${API_BASE}/import/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });
    return handleResponse(res);
  },

  getGameDownloadUrl: (gameId) => {
    const key = getApiKey();
    const q = key ? `?api_key=${encodeURIComponent(key)}` : '';
    return `${API_BASE}/games/${gameId}/download${q}`;
  },
};
