const API_BASE = '/api';

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
    
    const res = await fetch(`${API_BASE}/games?${query.toString()}`);
    return handleResponse(res);
  },

  getGame: async (id) => {
    const res = await fetch(`${API_BASE}/games/${id}`);
    return handleResponse(res);
  },

  addGame: async (gameData) => {
    const res = await fetch(`${API_BASE}/games`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(gameData)
    });
    return handleResponse(res);
  },

  deleteGame: async (id) => {
    const res = await fetch(`${API_BASE}/games/${id}`, { method: 'DELETE' });
    return handleResponse(res);
  },

  // Metadata Search
  searchCatalog: async (query, platform_id = '') => {
    const params = new URLSearchParams({ query });
    if (platform_id) params.append('platform_id', platform_id);
    const res = await fetch(`${API_BASE}/search?${params.toString()}`);
    return handleResponse(res);
  },

  // Releases (Prowlarr & Torznab)
  getReleases: async (gameId, region = '') => {
    const params = new URLSearchParams({ game_id: gameId });
    if (region && region !== 'ALL') params.append('region', region);
    const res = await fetch(`${API_BASE}/releases?${params.toString()}`);
    return handleResponse(res);
  },

  grabRelease: async (releaseData) => {
    const res = await fetch(`${API_BASE}/releases/grab`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(releaseData)
    });
    return handleResponse(res);
  },

  // Queue
  getQueue: async () => {
    const res = await fetch(`${API_BASE}/queue`);
    return handleResponse(res);
  },

  cancelQueueItem: async (id) => {
    const res = await fetch(`${API_BASE}/queue/${id}`, { method: 'DELETE' });
    return handleResponse(res);
  },

  // Platforms
  getPlatforms: async () => {
    const res = await fetch(`${API_BASE}/platforms`);
    return handleResponse(res);
  },

  // Settings
  getSettings: async () => {
    const res = await fetch(`${API_BASE}/settings`);
    return handleResponse(res);
  },

  saveSettings: async (settings) => {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    return handleResponse(res);
  },

  testProwlarr: async () => {
    const res = await fetch(`${API_BASE}/settings/test-prowlarr`, { method: 'POST' });
    return handleResponse(res);
  },

  testQBittorrent: async () => {
    const res = await fetch(`${API_BASE}/settings/test-qbittorrent`, { method: 'POST' });
    return handleResponse(res);
  },

  getSystemStatus: async () => {
    const res = await fetch(`${API_BASE}/settings/system-status`);
    return handleResponse(res);
  }
};
