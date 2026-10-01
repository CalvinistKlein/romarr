import React, { useState, useEffect } from 'react';
import { Save, Check, AlertTriangle, Key, ShieldCheck } from 'lucide-react';
import { api, getApiKey, setApiKey } from '../services/api';

const AVAILABLE_REGIONS = [
  { id: 'USA', label: 'USA / North America 🇺🇸' },
  { id: 'EUR', label: 'Europe / PAL 🇪🇺' },
  { id: 'JPN', label: 'Japan / NTSC-J 🇯🇵' },
  { id: 'WORLD', label: 'World / Global 🌐' },
  { id: 'TRANSLATION', label: 'Translations 🈳' },
];

export default function SettingsPage() {
  const [clientApiKey, setClientApiKey] = useState(getApiKey());
  const [apiKeySaveStatus, setApiKeySaveStatus] = useState(null);

  const [formData, setFormData] = useState({
    prowlarr_url: 'http://host.docker.internal:9696',
    prowlarr_api_key: '',
    qbittorrent_url: 'http://host.docker.internal:8089',
    qbittorrent_username: 'calvin',
    qbittorrent_password: '••••••••',
    qbittorrent_category: 'romarr',
    roms_root_dir: '/roms',
    downloads_dir: '/downloads',
    os_structure: 'batocera',
    preferred_regions: ['USA', 'EUR', 'JPN', 'WORLD', 'TRANSLATION'],
    auto_extract_archives: true,
    delete_archive_after_extraction: true,
    igdb_client_id: '',
    igdb_client_secret: '',
    enable_rom_links: true,
    rom_links_dir_name: 'ROM_links',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);

  const [prowlarrTest, setProwlarrTest] = useState(null);
  const [qbitTest, setQbitTest] = useState(null);
  const [rebuildStatus, setRebuildStatus] = useState(null);
  const [rebuilding, setRebuilding] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const data = await api.getSettings();
      setFormData(prev => ({ ...prev, ...data }));
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveApiKey = (e) => {
    e.preventDefault();
    setApiKey(clientApiKey);
    setApiKeySaveStatus({ type: 'success', message: 'API key saved to browser session.' });
    setTimeout(() => setApiKeySaveStatus(null), 3000);
    fetchSettings();
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveStatus(null);
    try {
      await api.saveSettings(formData);
      setSaveStatus({ type: 'success', message: 'Settings saved successfully.' });
      setTimeout(() => setSaveStatus(null), 4000);
    } catch (err) {
      setSaveStatus({ type: 'error', message: 'Failed to save settings: ' + err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleTestProwlarr = async () => {
    setProwlarrTest({ status: 'testing', message: 'Testing connection to Prowlarr...' });
    try {
      const res = await api.testProwlarr();
      setProwlarrTest({ status: res.success ? 'success' : 'error', message: res.message });
    } catch (err) {
      setProwlarrTest({ status: 'error', message: 'Connection failed: ' + err.message });
    }
  };

  const handleTestQbit = async () => {
    setQbitTest({ status: 'testing', message: 'Testing connection to qBittorrent...' });
    try {
      const res = await api.testQBittorrent();
      setQbitTest({ status: res.success ? 'success' : 'error', message: res.message });
    } catch (err) {
      setQbitTest({ status: 'error', message: 'Connection failed: ' + err.message });
    }
  };

  const handleRebuildLinks = async () => {
    setRebuilding(true);
    setRebuildStatus({ status: 'running', message: 'Rebuilding ROM links…' });
    try {
      const res = await api.rebuildRomLinks();
      setRebuildStatus({
        status: res.success ? 'success' : 'error',
        message: res.message,
      });
    } catch (err) {
      setRebuildStatus({ status: 'error', message: `Rebuild failed: ${err.message}` });
    } finally {
      setRebuilding(false);
    }
  };

  const moveRegion = (index, direction) => {
    const list = [...formData.preferred_regions];
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;
    setFormData(prev => ({ ...prev, preferred_regions: list }));
  };

  return (
    <div className="space-y-6 max-w-4xl text-xs">
      {/* 0. Romarr Client API Key Setup */}
      <div className="bg-[#22262a] border border-[#2d3238] p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-[#2d3238] pb-1.5">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-[#337ab7]" />
            <h2 className="text-sm font-bold text-white uppercase">Romarr API Key (Browser Authentication)</h2>
          </div>
          {clientApiKey ? (
            <span className="flex items-center gap-1 text-[#5cb85c] font-semibold text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5" /> Authenticated
            </span>
          ) : (
            <span className="text-[#a94442] font-semibold text-[11px]">Key Not Set</span>
          )}
        </div>
        <p className="text-[#8c939d]">
          If API requests return 403 Forbidden, enter the Romarr API key generated in <code className="text-[#e6c07b]">config/api_key.txt</code>:
        </p>

        <form onSubmit={handleSaveApiKey} className="flex gap-2">
          <input
            type="password"
            value={clientApiKey}
            onChange={(e) => setClientApiKey(e.target.value)}
            placeholder="Paste your Romarr API key here..."
            className="flex-1 bg-[#16181a] border border-[#2d3238] text-white px-2.5 py-1.5 focus:outline-none"
          />
          <button
            type="submit"
            className="bg-[#337ab7] hover:bg-[#286090] text-white font-bold px-3 py-1.5 border border-[#2e6da4] flex items-center gap-1"
          >
            <span>Save Key</span>
          </button>
        </form>

        {apiKeySaveStatus && (
          <div className="p-2 text-xs border bg-[#3c763d] text-[#dff0d8] border-[#2b542c]">
            {apiKeySaveStatus.message}
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-[#2d3238]">
          <div>
            <h1 className="text-xl font-bold text-white">Application Configuration</h1>
            <p className="text-[#8c939d]">Manage indexers, region sorting priority, and downloader clients</p>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="bg-[#337ab7] hover:bg-[#286090] text-white font-bold px-4 py-1.5 border border-[#2e6da4] flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>

      {saveStatus && (
        <div className={`p-2.5 text-xs font-semibold border ${
          saveStatus.type === 'success'
            ? 'bg-[#3c763d] text-[#dff0d8] border-[#2b542c]'
            : 'bg-[#a94442] text-[#f2dede] border-[#843534]'
        }`}>
          {saveStatus.message}
        </div>
      )}

      {/* 1. Region Priority Section */}
      <div className="bg-[#22262a] border border-[#2d3238] p-4 space-y-3">
        <h2 className="text-sm font-bold text-white uppercase border-b border-[#2d3238] pb-1.5">
          1. Region Priority Hierarchy (Auto-Search Sorting)
        </h2>
        <p className="text-[#8c939d]">
          Releases with higher-ranked regions will be sorted first and automatically grabbed during automated searches.
        </p>

        <table className="w-full text-left border-collapse border border-[#2d3238]">
          <thead className="bg-[#16181a] text-[#8c939d]">
            <tr>
              <th className="p-2 border-r border-[#2d3238] w-16">Rank</th>
              <th className="p-2 border-r border-[#2d3238]">Region Name</th>
              <th className="p-2 w-36 text-center">Order Controls</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2d3238]">
            {formData.preferred_regions.map((regionId, idx) => {
              const regInfo = AVAILABLE_REGIONS.find(r => r.id === regionId) || { id: regionId, label: regionId };
              return (
                <tr key={regionId} className="bg-[#1a1d20]">
                  <td className="p-2 border-r border-[#2d3238] font-bold text-[#337ab7]">#{idx + 1}</td>
                  <td className="p-2 border-r border-[#2d3238] font-semibold text-white">{regInfo.label}</td>
                  <td className="p-2 text-center space-x-1">
                    <button
                      type="button"
                      onClick={() => moveRegion(idx, -1)}
                      disabled={idx === 0}
                      className="bg-[#22262a] hover:bg-[#2d3238] disabled:opacity-30 text-white px-2 py-0.5 border border-[#2d3238] text-[11px]"
                    >
                      ▲ Up
                    </button>
                    <button
                      type="button"
                      onClick={() => moveRegion(idx, 1)}
                      disabled={idx === formData.preferred_regions.length - 1}
                      className="bg-[#22262a] hover:bg-[#2d3238] disabled:opacity-30 text-white px-2 py-0.5 border border-[#2d3238] text-[11px]"
                    >
                      ▼ Down
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 2. Prowlarr Section */}
      <div className="bg-[#22262a] border border-[#2d3238] p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-[#2d3238] pb-1.5">
          <h2 className="text-sm font-bold text-white uppercase">2. Prowlarr / Torznab Indexer</h2>
          <button
            type="button"
            onClick={handleTestProwlarr}
            className="bg-[#22262a] hover:bg-[#2d3238] text-white px-2.5 py-1 text-xs border border-[#2d3238]"
          >
            Test Connection
          </button>
        </div>

        {prowlarrTest && (
          <div className={`p-2 text-xs border ${
            prowlarrTest.status === 'success' ? 'bg-[#3c763d] text-[#dff0d8] border-[#2b542c]' : 'bg-[#a94442] text-[#f2dede] border-[#843534]'
          }`}>
            {prowlarrTest.message}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[#8c939d] mb-1 font-semibold">Prowlarr URL:</label>
            <input
              type="text"
              value={formData.prowlarr_url}
              onChange={(e) => setFormData({ ...formData, prowlarr_url: e.target.value })}
              className="w-full bg-[#16181a] border border-[#2d3238] text-white px-2.5 py-1.5 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[#8c939d] mb-1 font-semibold">Prowlarr API Key:</label>
            <input
              type="password"
              value={formData.prowlarr_api_key}
              onChange={(e) => setFormData({ ...formData, prowlarr_api_key: e.target.value })}
              placeholder="Paste API Key"
              className="w-full bg-[#16181a] border border-[#2d3238] text-white px-2.5 py-1.5 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* 3. qBittorrent Section */}
      <div className="bg-[#22262a] border border-[#2d3238] p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-[#2d3238] pb-1.5">
          <h2 className="text-sm font-bold text-white uppercase">3. Download Client (qBittorrent)</h2>
          <button
            type="button"
            onClick={handleTestQbit}
            className="bg-[#22262a] hover:bg-[#2d3238] text-white px-2.5 py-1 text-xs border border-[#2d3238]"
          >
            Test Connection
          </button>
        </div>

        {qbitTest && (
          <div className={`p-2 text-xs border ${
            qbitTest.status === 'success' ? 'bg-[#3c763d] text-[#dff0d8] border-[#2b542c]' : 'bg-[#a94442] text-[#f2dede] border-[#843534]'
          }`}>
            {qbitTest.message}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[#8c939d] mb-1 font-semibold">Web UI Host:</label>
            <input
              type="text"
              value={formData.qbittorrent_url}
              onChange={(e) => setFormData({ ...formData, qbittorrent_url: e.target.value })}
              className="w-full bg-[#16181a] border border-[#2d3238] text-white px-2.5 py-1.5 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[#8c939d] mb-1 font-semibold">Category:</label>
            <input
              type="text"
              value={formData.qbittorrent_category}
              onChange={(e) => setFormData({ ...formData, qbittorrent_category: e.target.value })}
              className="w-full bg-[#16181a] border border-[#2d3238] text-white px-2.5 py-1.5 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[#8c939d] mb-1 font-semibold">Username:</label>
            <input
              type="text"
              value={formData.qbittorrent_username}
              onChange={(e) => setFormData({ ...formData, qbittorrent_username: e.target.value })}
              className="w-full bg-[#16181a] border border-[#2d3238] text-white px-2.5 py-1.5 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[#8c939d] mb-1 font-semibold">Password:</label>
            <input
              type="password"
              value={formData.qbittorrent_password}
              onChange={(e) => setFormData({ ...formData, qbittorrent_password: e.target.value })}
              className="w-full bg-[#16181a] border border-[#2d3238] text-white px-2.5 py-1.5 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* 4. Target Structure */}
      <div className="bg-[#22262a] border border-[#2d3238] p-4 space-y-3">
        <h2 className="text-sm font-bold text-white uppercase border-b border-[#2d3238] pb-1.5">
          4. Storage Paths & Target ROM Structure
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[#8c939d] mb-1 font-semibold">ROMs Root Directory:</label>
            <input
              type="text"
              value={formData.roms_root_dir}
              onChange={(e) => setFormData({ ...formData, roms_root_dir: e.target.value })}
              className="w-full bg-[#16181a] border border-[#2d3238] text-white px-2.5 py-1.5 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[#8c939d] mb-1 font-semibold">Target OS Layout:</label>
            <select
              value={formData.os_structure}
              onChange={(e) => setFormData({ ...formData, os_structure: e.target.value })}
              className="w-full bg-[#16181a] border border-[#2d3238] text-white px-2.5 py-1.5 focus:outline-none"
            >
              <option value="batocera">Batocera Linux (/roms/snes, /roms/ps2, etc.)</option>
              <option value="retropie">RetroPie (/roms/snes, /roms/gc, etc.)</option>
              <option value="recalbox">Recalbox</option>
              <option value="es-de">EmulationStation Desktop Edition (ES-DE)</option>
            </select>
          </div>
        </div>

        <div className="pt-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.auto_extract_archives}
              onChange={(e) => setFormData({ ...formData, auto_extract_archives: e.target.checked })}
              className="w-3.5 h-3.5 bg-[#16181a] border-[#2d3238] text-[#337ab7]"
            />
            <span className="text-[#e6e6e6]">Automatically extract compressed archives (.zip, .7z, .rar)</span>
          </label>
        </div>
      </div>

      {/* 5. ROM Links */}
      <div className="bg-[#22262a] border border-[#2d3238] p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-[#2d3238] pb-1.5">
          <div>
            <h2 className="text-sm font-bold text-white uppercase">5. Flat ROM Links Directory</h2>
            <p className="text-[#8c939d] mt-0.5">
              Creates a folder at{' '}
              <code className="text-[#e6c07b]">{formData.roms_root_dir}/{formData.rom_links_dir_name || 'ROM_links'}/</code>{' '}
              containing relative symlinks to every organized ROM — one per game, named{' '}
              <code className="text-[#e6c07b]">Title (Region) [platform].ext</code>.
              Point emulators that don&apos;t understand platform subfolders here.
            </p>
          </div>
          <button
            type="button"
            onClick={handleRebuildLinks}
            disabled={rebuilding || !formData.enable_rom_links}
            className="ml-4 shrink-0 bg-[#22262a] hover:bg-[#2d3238] disabled:opacity-30 text-white px-2.5 py-1 text-xs border border-[#2d3238]"
          >
            {rebuilding ? 'Rebuilding…' : '↻ Rebuild Now'}
          </button>
        </div>

        {rebuildStatus && (
          <div className={`p-2 text-xs border ${
            rebuildStatus.status === 'success'
              ? 'bg-[#3c763d] text-[#dff0d8] border-[#2b542c]'
              : rebuildStatus.status === 'running'
              ? 'bg-[#2e4a6e] text-[#d9edf7] border-[#1e3a5a]'
              : 'bg-[#a94442] text-[#f2dede] border-[#843534]'
          }`}>
            {rebuildStatus.message}
          </div>
        )}

        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.enable_rom_links}
              onChange={(e) => setFormData({ ...formData, enable_rom_links: e.target.checked })}
              className="w-3.5 h-3.5 bg-[#16181a] border-[#2d3238] text-[#337ab7]"
            />
            <span className="text-[#e6e6e6]">Enable flat ROM_links directory (symlinks to all organized ROMs)</span>
          </label>

          {formData.enable_rom_links && (
            <div className="mt-2">
              <label className="block text-[#8c939d] mb-1 font-semibold">
                Folder name <span className="text-[#8c939d] font-normal">(created inside ROMs Root)</span>:
              </label>
              <input
                type="text"
                value={formData.rom_links_dir_name}
                onChange={(e) => setFormData({ ...formData, rom_links_dir_name: e.target.value })}
                placeholder="ROM_links"
                className="w-full sm:w-64 bg-[#16181a] border border-[#2d3238] text-white px-2.5 py-1.5 focus:outline-none"
              />
              <p className="text-[#8c939d] mt-1">
                Full path:{' '}
                <code className="text-[#e6c07b]">{formData.roms_root_dir}/{formData.rom_links_dir_name || 'ROM_links'}/</code>
              </p>
            </div>
          )}
        </div>
      </div>
    </form>
  </div>
  );
}
