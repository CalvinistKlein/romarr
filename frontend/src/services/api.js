/**
 * Romarr API client with automatic authentication discovery.
 */

const API_BASE = '/api';

let cachedKey = '';

export function getApiKey() {
  if (import.meta.env.VITE_ROMARR_API_KEY) {
    return import.meta.env.VITE_ROMARR_API_KEY;
  }
  return cachedKey || localStorage.getItem('romarr_api_key') || '';
}

export function setApiKey(key) {
  if (key) {
    cachedKey = key.trim();
    localStorage.setItem('romarr_api_key', cachedKey);
  } else {
    cachedKey = '';
    localStorage.removeItem('romarr_api_key');
  }
}

export async function ensureApiKey() {
  let key = getApiKey();
  if (!key) {
    try {
      const res = await fetch(`${API_BASE}/auth/key`);
      if (res.ok) {
        const data = await res.json();
        if (data.api_key) {
          setApiKey(data.api_key);
          key = data.api_key;
        }
      }
    } catch (_) {}
  }
  return key;
}

// Automatically resolve key on module load
ensureApiKey();

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
    await ensureApiKey();
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
    await ensureApiKey();
    const res = await fetch(`${API_BASE}/games/${id}`, {
      headers: buildHeaders({ 'Content-Type': undefined }),
    });
    return handleResponse(res);
  },

  addGame: async (gameData) => {
    await ensureApiKey();
    const res = await fetch(`${API_BASE}/games`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(gameData),
    });
    return handleResponse(res);
  },

  updateGame: async (id, gameData) => {
    await ensureApiKey();
    const res = await fetch(`${API_BASE}/games/${id}`, {
      method: 'PUT',
      headers: buildHeaders(),
      body: JSON.stringify(gameData),
    });
    return handleResponse(res);
  },

  getCoverOptions: async (id, query = '') => {
    await ensureApiKey();
    const params = new URLSearchParams();
    if (query) params.append('query', query);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE}/games/${id}/cover-options${qs}`, {
      headers: buildHeaders({ 'Content-Type': undefined }),
    });
    return handleResponse(res);
  },

  deleteGame: async (id) => {
    await ensureApiKey();
    const res = await fetch(`${API_BASE}/games/${id}`, {
      method: 'DELETE',
      headers: buildHeaders({ 'Content-Type': undefined }),
    });
    return handleResponse(res);
  },

  // Metadata Search
  searchCatalog: async (query, platform_id = '') => {
    await ensureApiKey();
    const params = new URLSearchParams({ query });
    if (platform_id) params.append('platform_id', platform_id);
    const res = await fetch(`${API_BASE}/search?${params.toString()}`, {
      headers: buildHeaders({ 'Content-Type': undefined }),
    });
    return handleResponse(res);
  },

  // Releases (Prowlarr & Torznab)
  getReleases: async (gameId, region = '') => {
    await ensureApiKey();
    const params = new URLSearchParams({ game_id: gameId });
    if (region && region !== 'ALL') params.append('region', region);
    const res = await fetch(`${API_BASE}/releases?${params.toString()}`, {
      headers: buildHeaders({ 'Content-Type': undefined }),
    });
    return handleResponse(res);
  },

  grabRelease: async (releaseData) => {
    await ensureApiKey();
    const res = await fetch(`${API_BASE}/releases/grab`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(releaseData),
    });
    return handleResponse(res);
  },

  // Queue
  getQueue: async () => {
    await ensureApiKey();
    const res = await fetch(`${API_BASE}/queue`, {
      headers: buildHeaders({ 'Content-Type': undefined }),
    });
    return handleResponse(res);
  },

  cancelQueueItem: async (id) => {
    await ensureApiKey();
    const res = await fetch(`${API_BASE}/queue/${id}`, {
      method: 'DELETE',
      headers: buildHeaders({ 'Content-Type': undefined }),
    });
    return handleResponse(res);
  },

  // Platforms
  getPlatforms: async () => {
    await ensureApiKey();
    const res = await fetch(`${API_BASE}/platforms`, {
      headers: buildHeaders({ 'Content-Type': undefined }),
    });
    return handleResponse(res);
  },

  // Settings
  getSettings: async () => {
    await ensureApiKey();
    const res = await fetch(`${API_BASE}/settings`, {
      headers: buildHeaders({ 'Content-Type': undefined }),
    });
    return handleResponse(res);
  },

  saveSettings: async (settings) => {
    await ensureApiKey();
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: buildHeaders(),
      body: JSON.stringify(settings),
    });
    return handleResponse(res);
  },

  testProwlarr: async () => {
    await ensureApiKey();
    const res = await fetch(`${API_BASE}/settings/test-prowlarr`, {
      method: 'POST',
      headers: buildHeaders({ 'Content-Type': undefined }),
    });
    return handleResponse(res);
  },

  testQBittorrent: async () => {
    await ensureApiKey();
    const res = await fetch(`${API_BASE}/settings/test-qbittorrent`, {
      method: 'POST',
      headers: buildHeaders({ 'Content-Type': undefined }),
    });
    return handleResponse(res);
  },

  testIGDB: async () => {
    await ensureApiKey();
    const res = await fetch(`${API_BASE}/settings/test-igdb`, {
      method: 'POST',
      headers: buildHeaders({ 'Content-Type': undefined }),
    });
    return handleResponse(res);
  },

  getSystemStatus: async () => {
    await ensureApiKey();
    const res = await fetch(`${API_BASE}/settings/system-status`, {
      headers: buildHeaders({ 'Content-Type': undefined }),
    });
    return handleResponse(res);
  },

  rebuildRomLinks: async () => {
    await ensureApiKey();
    const res = await fetch(`${API_BASE}/settings/rebuild-links`, {
      method: 'POST',
      headers: buildHeaders({ 'Content-Type': undefined }),
    });
    return handleResponse(res);
  },

  // Import
  getImportPlatforms: async () => {
    await ensureApiKey();
    const res = await fetch(`${API_BASE}/import/platforms`, {
      headers: buildHeaders({ 'Content-Type': undefined }),
    });
    return handleResponse(res);
  },

  uploadRoms: async (formData, onProgress) => {
    await ensureApiKey();
    const key = getApiKey();

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE}/import/upload`);

      if (key) {
        xhr.setRequestHeader('X-Api-Key', key);
      }

      let startTime = Date.now();
      let lastLoaded = 0;
      let lastTime = startTime;
      let currentSpeed = 0;

      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const now = Date.now();
            const elapsed = (now - lastTime) / 1000;
            if (elapsed > 0.25) {
              currentSpeed = (event.loaded - lastLoaded) / elapsed;
              lastLoaded = event.loaded;
              lastTime = now;
            }
            const percent = Math.min(100, Math.round((event.loaded * 100) / event.total));
            const remainingBytes = event.total - event.loaded;
            const eta = currentSpeed > 0 ? Math.round(remainingBytes / currentSpeed) : 0;

            onProgress({
              loaded: event.loaded,
              total: event.total,
              percent,
              speed: currentSpeed,
              eta,
              state: percent >= 100 ? 'processing' : 'uploading'
            });
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            resolve(data);
          } catch (e) {
            resolve({ success: true, message: xhr.responseText });
          }
        } else {
          let detail = `HTTP ${xhr.status}`;
          try {
            const data = JSON.parse(xhr.responseText);
            detail = data.detail || data.message || detail;
          } catch (_) {}
          reject(new Error(detail));
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network error occurred during ROM upload.'));
      };

      xhr.onabort = () => {
        reject(new Error('Upload aborted by user.'));
      };

      xhr.send(formData);
    });
  },

  scanFolder: async (scanData) => {
    await ensureApiKey();
    const res = await fetch(`${API_BASE}/import/scan`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(scanData),
    });
    return handleResponse(res);
  },

  getGameDownloadUrl: (gameId) => {
    const key = getApiKey();
    const q = key ? `?api_key=${encodeURIComponent(key)}` : '';
    return `${API_BASE}/games/${gameId}/download${q}`;
  },

  downloadRom: async (gameId) => {
    await ensureApiKey();
    const key = getApiKey();
    const q = key ? `?api_key=${encodeURIComponent(key)}` : '';
    const url = `${API_BASE}/games/${gameId}/download${q}`;

    const link = document.createElement('a');
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },
};

