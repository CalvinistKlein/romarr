import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Search,
  Download,
  Trash2,
  Edit3,
  Image as ImageIcon,
  Check,
  RefreshCw,
  Folder,
  HardDrive,
  Globe,
  Calendar,
  User,
  Film,
  Info,
  Layers,
  Tag,
  AlertCircle,
  ArrowDown,
  Archive,
  FolderSync,
  ExternalLink,
  Shield,
  Sliders
} from 'lucide-react';
import { api } from '../services/api';

export default function GameDetailPage({
  gameId,
  queue = [],
  platforms = [],
  onBack,
  onOpenReleases,
  onOpenCoverModal,
  onDeleteGame,
  onGameUpdated
}) {
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'releases' | 'media' | 'settings'
  const [releases, setReleases] = useState([]);
  const [releasesLoading, setReleasesLoading] = useState(false);
  const [regionFilter, setRegionFilter] = useState('ALL');
  const [mediaOptions, setMediaOptions] = useState([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saveStatus, setSaveStatus] = useState(null);

  useEffect(() => {
    if (gameId) {
      loadGameDetails();
    }
  }, [gameId]);

  const loadGameDetails = async () => {
    setLoading(true);
    try {
      const data = await api.getGame(gameId);
      setGame(data);
      setEditForm({
        title: data.title || '',
        preferred_region: data.preferred_region || 'USA',
        summary: data.summary || '',
        developer: data.developer || '',
        publisher: data.publisher || '',
        release_year: data.release_year || '',
        genres: (data.genres || []).join(', ')
      });
    } catch (err) {
      console.error('Failed to load game details:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadReleases = async () => {
    if (!game) return;
    setReleasesLoading(true);
    try {
      const data = await api.getReleases(game.id, regionFilter);
      setReleases(data.releases || []);
    } catch (err) {
      console.error('Failed to load releases:', err);
      setReleases([]);
    } finally {
      setReleasesLoading(false);
    }
  };

  const loadMedia = async () => {
    if (!game) return;
    setMediaLoading(true);
    try {
      const data = await api.getCoverOptions(game.id);
      setMediaOptions(data.options || []);
    } catch (err) {
      console.error('Failed to load media:', err);
      setMediaOptions([]);
    } finally {
      setMediaLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'releases' && game) {
      loadReleases();
    } else if (activeTab === 'media' && game) {
      loadMedia();
    }
  }, [activeTab, regionFilter, game?.id]);

  const handleDownloadRom = async () => {
    if (!game) return;
    setDownloading(true);
    try {
      await api.downloadRom(game.id);
    } catch (err) {
      alert(`Download error: ${err.message}`);
    } finally {
      setTimeout(() => setDownloading(false), 2000);
    }
  };

  const handleGrabRelease = async (release) => {
    try {
      await api.grabRelease({
        game_id: game.id,
        release_title: release.title,
        download_url: release.download_url,
        info_hash: release.info_hash,
        size_bytes: release.size_bytes,
        indexer: release.indexer
      });
      alert(`Release '${release.title}' grabbed and queued for download!`);
      loadGameDetails();
    } catch (err) {
      alert(`Failed to grab release: ${err.message}`);
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setSaveStatus({ type: 'loading', text: 'Saving changes…' });
    try {
      const payload = {
        title: editForm.title.trim(),
        preferred_region: editForm.preferred_region,
        summary: editForm.summary.trim(),
        developer: editForm.developer.trim(),
        publisher: editForm.publisher.trim(),
        release_year: editForm.release_year ? parseInt(editForm.release_year, 10) : null,
        genres: editForm.genres ? editForm.genres.split(',').map(s => s.trim()).filter(Boolean) : []
      };
      const updated = await api.updateGame(game.id, payload);
      setGame(updated);
      setIsEditing(false);
      setSaveStatus({ type: 'success', text: 'Game details saved successfully!' });
      if (onGameUpdated) onGameUpdated(updated);
    } catch (err) {
      setSaveStatus({ type: 'error', text: `Save error: ${err.message}` });
    } finally {
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const activeQueueItem = Array.isArray(queue) ? queue.find(q => q.game_id === game?.id && q.status !== 'completed') : null;

  const formatFileSize = (bytes) => {
    if (!bytes || bytes <= 0) return '0 MB';
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const formatSpeed = (bytesPerSec) => {
    if (!bytesPerSec || bytesPerSec <= 0) return '0 KB/s';
    if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
    return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
  };

  const getRegionBadge = (region) => {
    switch (region) {
      case 'USA': return <span className="bg-[#204d74] text-[#bce8f1] px-2 py-0.5 text-xs font-bold border border-[#337ab7]">USA 🇺🇸</span>;
      case 'EUR': return <span className="bg-[#66512c] text-[#faebcc] px-2 py-0.5 text-xs font-bold border border-[#8a6d3b]">EUR 🇪🇺</span>;
      case 'JPN': return <span className="bg-[#6b2424] text-[#ebccd1] px-2 py-0.5 text-xs font-bold border border-[#a94442]">JPN 🇯🇵</span>;
      case 'TRANSLATION': return <span className="bg-[#255625] text-[#d6e9c6] px-2 py-0.5 text-xs font-bold border border-[#3c763d]">TRANS 🈳</span>;
      default: return <span className="bg-[#3e444c] text-[#d9d9d9] px-2 py-0.5 text-xs font-bold border border-[#4e555b]">{region || 'WORLD'} 🌐</span>;
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-[#8c939d]">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-[#337ab7]" />
        <p className="font-bold text-[#e6e6e6]">Loading game information…</p>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="bg-[#22262a] border border-[#2d3238] p-8 text-center text-[#8c939d]">
        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-[#a94442]" />
        <p className="font-bold text-white text-base">Game not found</p>
        <button
          onClick={onBack}
          className="mt-4 bg-[#337ab7] hover:bg-[#286090] text-white px-3 py-1.5 text-xs font-bold border border-[#2e6da4] inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Collection
        </button>
      </div>
    );
  }

  const pInfo = platforms.find(p => p.id === game.platform_id) || { name: game.platform_name || game.platform_id?.toUpperCase() };

  return (
    <div className="space-y-4 text-xs">
      
      {/* 2015 Classic Flat Breadcrumb & Top Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-[#2d3238]">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="bg-[#22262a] hover:bg-[#2d3238] text-[#e6e6e6] px-2.5 py-1 text-xs font-bold border border-[#2d3238] inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Collection
          </button>
          <span className="text-[#8c939d]">/</span>
          <span className="font-bold text-white text-sm">{game.title}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpenReleases(game)}
            className="bg-[#337ab7] hover:bg-[#286090] text-white px-3 py-1 text-xs font-bold border border-[#2e6da4] inline-flex items-center gap-1.5"
            title="Search Indexers for Releases"
          >
            <Search className="w-3.5 h-3.5" /> Search Releases
          </button>
          <button
            onClick={() => onOpenCoverModal(game)}
            className="bg-[#2e3338] hover:bg-[#3e444c] text-[#e6e6e6] px-3 py-1 text-xs font-bold border border-[#4e555b] inline-flex items-center gap-1.5"
            title="Search IGDB for Cover Art & Media"
          >
            <ImageIcon className="w-3.5 h-3.5 text-[#5bc0de]" /> Change Cover
          </button>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="bg-[#22262a] hover:bg-[#2d3238] text-[#e6e6e6] px-2.5 py-1 text-xs font-bold border border-[#2d3238] inline-flex items-center gap-1.5"
            title="Edit metadata"
          >
            <Edit3 className="w-3.5 h-3.5" /> {isEditing ? 'Cancel Edit' : 'Edit Info'}
          </button>
          <button
            onClick={() => {
              if (confirm(`Remove '${game.title}' from your library?`)) {
                onDeleteGame(game.id);
                onBack();
              }
            }}
            className="bg-[#d9534f] hover:bg-[#c9302c] text-white px-2.5 py-1 text-xs font-bold border border-[#d43f3a] inline-flex items-center gap-1.5"
            title="Delete from Library"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
        </div>
      </div>

      {/* Save Notification Banner */}
      {saveStatus && (
        <div className={`p-2.5 font-bold border ${
          saveStatus.type === 'success'
            ? 'bg-[#3c763d] text-[#dff0d8] border-[#2b542c]'
            : saveStatus.type === 'loading'
            ? 'bg-[#204d74] text-[#d9edf7] border-[#1b4366]'
            : 'bg-[#a94442] text-[#f2dede] border-[#843534]'
        }`}>
          {saveStatus.text}
        </div>
      )}

      {/* Hero Banner / Backdrop Header Section */}
      <div className="relative bg-[#22262a] border border-[#2d3238] overflow-hidden">
        {/* Blurred / Dimmed Banner Backdrop */}
        {game.banner_url && (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-25 filter blur-xs"
            style={{ backgroundImage: `url(${game.banner_url})` }}
          />
        )}
        <div className="relative p-5 bg-gradient-to-r from-[#16181a] via-[#16181a]/95 to-[#16181a]/85 flex flex-col md:flex-row gap-6 items-start">
          
          {/* Left Poster Image */}
          <div className="relative w-40 sm:w-48 shrink-0 aspect-[3/4] bg-[#111315] border border-[#2d3238] shadow-md group">
            {game.cover_url ? (
              <img
                src={game.cover_url}
                alt={game.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center text-[#8c939d]">
                <Film className="w-8 h-8 mb-1 opacity-50" />
                <span className="font-bold">{game.title}</span>
              </div>
            )}
            <button
              onClick={() => onOpenCoverModal(game)}
              className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white font-bold gap-1 transition-opacity cursor-pointer"
            >
              <ImageIcon className="w-5 h-5 text-[#5bc0de]" />
              <span className="text-[10px] bg-[#111315]/90 px-2 py-0.5 border border-[#2d3238]">Change Art</span>
            </button>
          </div>

          {/* Right Hero Info */}
          <div className="flex-1 space-y-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="bg-[#111315] text-[#e6e6e6] px-2 py-0.5 text-xs font-bold uppercase border border-[#2d3238]">
                  {game.platform_id} &bull; {pInfo.name || game.platform_name}
                </span>
                {getRegionBadge(game.preferred_region)}
                {game.status === 'downloaded' ? (
                  <span className="bg-[#3c763d] text-[#dff0d8] px-2 py-0.5 text-xs font-bold border border-[#2b542c]">
                    DOWNLOADED
                  </span>
                ) : game.status === 'downloading' ? (
                  <span className="bg-[#204d74] text-[#d9edf7] px-2 py-0.5 text-xs font-bold border border-[#1b4366]">
                    DOWNLOADING
                  </span>
                ) : (
                  <span className="bg-[#8a6d3b] text-[#fcf8e3] px-2 py-0.5 text-xs font-bold border border-[#66512c]">
                    WANTED
                  </span>
                )}
              </div>

              <h1 className="text-2xl font-bold text-white tracking-wide">
                {game.title}
              </h1>

              <p className="text-xs text-[#8c939d] mt-1">
                {game.release_year ? `${game.release_year} • ` : ''}
                {game.developer ? `${game.developer} (Developer) • ` : ''}
                {game.publisher ? `${game.publisher} (Publisher)` : ''}
              </p>
            </div>

            {/* Genres Chips */}
            {game.genres && game.genres.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {game.genres.map((genre, idx) => (
                  <span
                    key={idx}
                    className="bg-[#22262a] text-[#8c939d] border border-[#2d3238] px-2 py-0.5 text-[11px]"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            )}

            {/* Active Download Progress Card (if downloading) */}
            {activeQueueItem && (
              <div className="bg-[#111315] border border-[#2d3238] p-3 space-y-2 max-w-xl">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-[#5bc0de] flex items-center gap-1">
                    <ArrowDown className="w-3 h-3" /> Downloading in qBittorrent
                  </span>
                  <span className="text-[#8c939d]">
                    Speed: {formatSpeed(activeQueueItem.download_speed)} &bull; Progress: {activeQueueItem.progress || 0}%
                  </span>
                </div>
                <div className="w-full bg-[#16181a] border border-[#2d3238] h-3 relative overflow-hidden">
                  <div
                    className="bg-[#337ab7] h-full transition-all duration-300"
                    style={{ width: `${activeQueueItem.progress || 0}%` }}
                  />
                </div>
              </div>
            )}

            {/* Primary Action Button Bar */}
            <div className="pt-2 flex items-center gap-2 flex-wrap">
              {game.status === 'downloaded' && (
                <button
                  onClick={handleDownloadRom}
                  disabled={downloading}
                  className="bg-[#3c763d] hover:bg-[#2b542c] text-white px-4 py-1.5 text-xs font-bold border border-[#2b542c] inline-flex items-center gap-1.5 shadow"
                  title="Download ROM file from Romarr to this device"
                >
                  {downloading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                  <span>{downloading ? 'Preparing Download…' : 'Download From Romarr'}</span>
                </button>
              )}
              <button
                onClick={() => setActiveTab('releases')}
                className="bg-[#337ab7] hover:bg-[#286090] text-white px-4 py-1.5 text-xs font-bold border border-[#2e6da4] inline-flex items-center gap-1.5"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Search Releases</span>
              </button>
              <button
                onClick={() => setActiveTab('media')}
                className="bg-[#22262a] hover:bg-[#2d3238] text-[#e6e6e6] px-3 py-1.5 text-xs font-bold border border-[#2d3238] inline-flex items-center gap-1.5"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Gallery & Box Art</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Inline Metadata Edit Form (if toggled) */}
      {isEditing && (
        <form onSubmit={handleSaveEdit} className="bg-[#22262a] border border-[#337ab7] p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#2d3238]">
            <h3 className="font-bold text-white flex items-center gap-1.5">
              <Edit3 className="w-4 h-4 text-[#337ab7]" /> Edit Game Metadata
            </h3>
            <span className="text-[#8c939d] text-[11px]">Modifying library entry</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[#8c939d] text-[11px] font-bold mb-1">Game Title</label>
              <input
                type="text"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                required
                className="w-full bg-[#16181a] border border-[#2d3238] text-white px-2.5 py-1 focus:outline-none focus:border-[#337ab7]"
              />
            </div>
            <div>
              <label className="block text-[#8c939d] text-[11px] font-bold mb-1">Preferred Region</label>
              <select
                value={editForm.preferred_region}
                onChange={(e) => setEditForm({ ...editForm, preferred_region: e.target.value })}
                className="w-full bg-[#16181a] border border-[#2d3238] text-white px-2 py-1 focus:outline-none focus:border-[#337ab7]"
              >
                <option value="USA">USA / North America 🇺🇸</option>
                <option value="EUR">Europe / PAL 🇪🇺</option>
                <option value="JPN">Japan / NTSC-J 🇯🇵</option>
                <option value="WORLD">World / Global 🌐</option>
                <option value="TRANSLATION">English Translation 🈳</option>
              </select>
            </div>
            <div>
              <label className="block text-[#8c939d] text-[11px] font-bold mb-1">Release Year</label>
              <input
                type="number"
                value={editForm.release_year}
                onChange={(e) => setEditForm({ ...editForm, release_year: e.target.value })}
                placeholder="2005"
                className="w-full bg-[#16181a] border border-[#2d3238] text-white px-2.5 py-1 focus:outline-none focus:border-[#337ab7]"
              />
            </div>
            <div>
              <label className="block text-[#8c939d] text-[11px] font-bold mb-1">Developer</label>
              <input
                type="text"
                value={editForm.developer}
                onChange={(e) => setEditForm({ ...editForm, developer: e.target.value })}
                placeholder="Team Ico"
                className="w-full bg-[#16181a] border border-[#2d3238] text-white px-2.5 py-1 focus:outline-none focus:border-[#337ab7]"
              />
            </div>
            <div>
              <label className="block text-[#8c939d] text-[11px] font-bold mb-1">Publisher</label>
              <input
                type="text"
                value={editForm.publisher}
                onChange={(e) => setEditForm({ ...editForm, publisher: e.target.value })}
                placeholder="Sony Computer Entertainment"
                className="w-full bg-[#16181a] border border-[#2d3238] text-white px-2.5 py-1 focus:outline-none focus:border-[#337ab7]"
              />
            </div>
            <div>
              <label className="block text-[#8c939d] text-[11px] font-bold mb-1">Genres (comma separated)</label>
              <input
                type="text"
                value={editForm.genres}
                onChange={(e) => setEditForm({ ...editForm, genres: e.target.value })}
                placeholder="Action, Adventure"
                className="w-full bg-[#16181a] border border-[#2d3238] text-white px-2.5 py-1 focus:outline-none focus:border-[#337ab7]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[#8c939d] text-[11px] font-bold mb-1">Full Summary / Synopsis</label>
            <textarea
              rows={3}
              value={editForm.summary}
              onChange={(e) => setEditForm({ ...editForm, summary: e.target.value })}
              className="w-full bg-[#16181a] border border-[#2d3238] text-white p-2 text-xs focus:outline-none focus:border-[#337ab7]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#2d3238]">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="bg-[#22262a] hover:bg-[#2d3238] text-[#8c939d] hover:text-white px-3 py-1 font-bold border border-[#2d3238]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-[#337ab7] hover:bg-[#286090] text-white px-4 py-1 font-bold border border-[#2e6da4] flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" /> Save Changes
            </button>
          </div>
        </form>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-[#2d3238] text-xs">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 font-bold border-t-2 ${
            activeTab === 'overview'
              ? 'bg-[#22262a] text-white border-[#337ab7] border-b-transparent border-x border-[#2d3238]'
              : 'text-[#8c939d] hover:text-white border-transparent'
          }`}
        >
          Overview & Details
        </button>
        <button
          onClick={() => setActiveTab('releases')}
          className={`px-4 py-2 font-bold border-t-2 ${
            activeTab === 'releases'
              ? 'bg-[#22262a] text-white border-[#337ab7] border-b-transparent border-x border-[#2d3238]'
              : 'text-[#8c939d] hover:text-white border-transparent'
          }`}
        >
          Releases & Indexers
        </button>
        <button
          onClick={() => setActiveTab('media')}
          className={`px-4 py-2 font-bold border-t-2 ${
            activeTab === 'media'
              ? 'bg-[#22262a] text-white border-[#337ab7] border-b-transparent border-x border-[#2d3238]'
              : 'text-[#8c939d] hover:text-white border-transparent'
          }`}
        >
          Media & Artworks
        </button>
      </div>

      {/* Tab Content: 1. OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          
          {/* Left 2 Cols: Description & Notes */}
          <div className="lg:col-span-2 space-y-4">
            {/* Summary Box */}
            <div className="bg-[#22262a] border border-[#2d3238] p-4 space-y-2">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider text-[#337ab7] flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" /> Game Overview & Synopsis
              </h2>
              <div className="text-xs text-[#d9d9d9] leading-relaxed whitespace-pre-line pt-1">
                {game.summary || 'No synopsis provided for this game.'}
              </div>
            </div>

            {/* Storage & ROM Placement Info */}
            <div className="bg-[#22262a] border border-[#2d3238] p-4 space-y-3">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider text-[#337ab7] flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5" /> Storage & File Information
              </h2>

              <div className="space-y-2 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-2 bg-[#16181a] border border-[#2d3238]">
                  <span className="text-[#8c939d] font-bold">Disk File Path:</span>
                  <code className="text-[#5bc0de] font-mono select-all truncate max-w-md">
                    {game.file_path || 'No ROM file placed yet'}
                  </code>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                  <div className="p-2 bg-[#16181a] border border-[#2d3238]">
                    <span className="block text-[10px] text-[#8c939d]">File Size</span>
                    <span className="font-bold text-white">{formatFileSize(game.file_size_bytes)}</span>
                  </div>
                  <div className="p-2 bg-[#16181a] border border-[#2d3238]">
                    <span className="block text-[10px] text-[#8c939d]">Console System</span>
                    <span className="font-bold text-white uppercase">{game.platform_id}</span>
                  </div>
                  <div className="p-2 bg-[#16181a] border border-[#2d3238]">
                    <span className="block text-[10px] text-[#8c939d]">Library Status</span>
                    <span className={`font-bold uppercase ${game.status === 'downloaded' ? 'text-[#5cb85c]' : 'text-[#f0ad4e]'}`}>
                      {game.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right 1 Col: Quick Metadata Sidebar */}
          <div className="space-y-4">
            <div className="bg-[#22262a] border border-[#2d3238] p-4 space-y-3">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider text-[#337ab7] flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" /> Metadata Details
              </h2>

              <div className="divide-y divide-[#2d3238] text-xs">
                <div className="py-2 flex items-center justify-between">
                  <span className="text-[#8c939d]">Platform</span>
                  <span className="font-bold text-white">{pInfo.name || game.platform_id}</span>
                </div>
                <div className="py-2 flex items-center justify-between">
                  <span className="text-[#8c939d]">Target Region</span>
                  <span className="font-bold text-[#337ab7]">{game.preferred_region}</span>
                </div>
                <div className="py-2 flex items-center justify-between">
                  <span className="text-[#8c939d]">Release Year</span>
                  <span className="font-bold text-white">{game.release_year || 'Unknown'}</span>
                </div>
                <div className="py-2 flex items-center justify-between">
                  <span className="text-[#8c939d]">Developer</span>
                  <span className="font-bold text-white">{game.developer || '—'}</span>
                </div>
                <div className="py-2 flex items-center justify-between">
                  <span className="text-[#8c939d]">Publisher</span>
                  <span className="font-bold text-white">{game.publisher || '—'}</span>
                </div>
                <div className="py-2 flex items-center justify-between">
                  <span className="text-[#8c939d]">IGDB ID</span>
                  <span className="font-mono text-[#8c939d]">{game.igdb_id || '—'}</span>
                </div>
                <div className="py-2 flex items-center justify-between">
                  <span className="text-[#8c939d]">Added to Library</span>
                  <span className="text-[#8c939d]">{game.created_at ? new Date(game.created_at).toLocaleDateString() : '—'}</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Tab Content: 2. RELEASES */}
      {activeTab === 'releases' && (
        <div className="bg-[#22262a] border border-[#2d3238] p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#2d3238]">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white">Torznab Indexer Releases:</span>
              <span className="text-[#8c939d]">({releases.length} found)</span>
            </div>

            {/* Region Filter */}
            <div className="flex items-center gap-2">
              <span className="text-[#8c939d]">Region Filter:</span>
              <select
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
                className="bg-[#16181a] border border-[#2d3238] text-white px-2 py-1 text-xs focus:outline-none"
              >
                <option value="ALL">All Regions</option>
                <option value="USA">USA / North America 🇺🇸</option>
                <option value="EUR">Europe / PAL 🇪🇺</option>
                <option value="JPN">Japan / NTSC-J 🇯🇵</option>
                <option value="WORLD">World / Global 🌐</option>
                <option value="TRANSLATION">Translations 🈳</option>
              </select>
              <button
                onClick={loadReleases}
                disabled={releasesLoading}
                className="bg-[#22262a] hover:bg-[#2d3238] text-white p-1 border border-[#2d3238]"
                title="Refresh Releases"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${releasesLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {releasesLoading ? (
            <div className="py-16 text-center text-[#8c939d]">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#337ab7]" />
              <p>Querying Prowlarr indexers for '{game.title}'…</p>
            </div>
          ) : releases.length === 0 ? (
            <div className="py-12 text-center text-[#8c939d]">
              <p className="font-bold text-white">No releases returned from Prowlarr indexers.</p>
              <p className="text-[11px] mt-1">Check indexers configuration in Prowlarr or try another region filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse border border-[#2d3238] text-xs">
                <thead className="bg-[#16181a] text-[#8c939d] border-b border-[#2d3238]">
                  <tr>
                    <th className="p-2 border-r border-[#2d3238]">Release Title</th>
                    <th className="p-2 border-r border-[#2d3238] w-24">Region</th>
                    <th className="p-2 border-r border-[#2d3238] w-20">Format</th>
                    <th className="p-2 border-r border-[#2d3238] w-24">Size</th>
                    <th className="p-2 border-r border-[#2d3238] w-20">Peers</th>
                    <th className="p-2 border-r border-[#2d3238] w-28">Indexer</th>
                    <th className="p-2 w-24 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2d3238]">
                  {releases.map((rel, idx) => (
                    <tr key={idx} className="hover:bg-[#1a1d20] bg-[#22262a]">
                      <td className="p-2 border-r border-[#2d3238] font-semibold text-[#e6e6e6]">
                        {rel.title}
                      </td>
                      <td className="p-2 border-r border-[#2d3238]">
                        {getRegionBadge(rel.parsed?.region || 'USA')}
                      </td>
                      <td className="p-2 border-r border-[#2d3238] text-[#8c939d]">
                        {rel.parsed?.format || 'ROM'}
                      </td>
                      <td className="p-2 border-r border-[#2d3238] text-[#8c939d]">
                        {formatFileSize(rel.size_bytes)}
                      </td>
                      <td className="p-2 border-r border-[#2d3238]">
                        <span className="text-[#5cb85c] font-bold">{rel.seeders || 0}</span>
                        <span className="text-[#8c939d]"> / </span>
                        <span className="text-[#d9534f]">{rel.leechers || 0}</span>
                      </td>
                      <td className="p-2 border-r border-[#2d3238] text-[#8c939d] truncate max-w-[120px]">
                        {rel.indexer}
                      </td>
                      <td className="p-2 text-center">
                        <button
                          onClick={() => handleGrabRelease(rel)}
                          className="bg-[#337ab7] hover:bg-[#286090] text-white px-2.5 py-0.5 text-[11px] font-bold border border-[#2e6da4] inline-flex items-center gap-1"
                        >
                          <Download className="w-3 h-3" /> Grab
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab Content: 3. MEDIA & ARTWORKS */}
      {activeTab === 'media' && (
        <div className="bg-[#22262a] border border-[#2d3238] p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#2d3238]">
            <div>
              <h2 className="font-bold text-white">Media, Box Covers & Backdrops</h2>
              <p className="text-[11px] text-[#8c939d]">High-resolution promotional and in-game media assets</p>
            </div>
            <button
              onClick={() => onOpenCoverModal(game)}
              className="bg-[#337ab7] hover:bg-[#286090] text-white px-3 py-1 font-bold border border-[#2e6da4] inline-flex items-center gap-1.5 text-xs"
            >
              <Search className="w-3 h-3" /> Search More on IGDB
            </button>
          </div>

          {mediaLoading ? (
            <div className="py-16 text-center text-[#8c939d]">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#337ab7]" />
              <p>Fetching artwork assets from IGDB…</p>
            </div>
          ) : mediaOptions.length === 0 ? (
            <div className="py-12 text-center text-[#8c939d]">
              <p className="font-bold text-white">No media assets cached.</p>
              <button
                onClick={() => onOpenCoverModal(game)}
                className="mt-2 bg-[#337ab7] text-white px-3 py-1 text-xs font-bold"
              >
                Search IGDB
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {mediaOptions.map((opt) => (
                <div key={opt.id} className="bg-[#16181a] border border-[#2d3238] flex flex-col justify-between">
                  <div className="relative aspect-[3/4] w-full bg-[#111315] overflow-hidden">
                    <img src={opt.url} alt={opt.label} className="w-full h-full object-cover" />
                    <span className="absolute top-1 left-1 bg-[#111315]/90 text-white px-1 py-0.5 text-[9px] font-bold uppercase border border-[#2d3238]">
                      {opt.type}
                    </span>
                  </div>
                  <div className="p-2 space-y-1.5">
                    <p className="font-bold text-white text-[11px] truncate" title={opt.label}>{opt.label}</p>
                    <button
                      onClick={async () => {
                        await api.updateGame(game.id, { cover_url: opt.url_hd || opt.url });
                        loadGameDetails();
                        alert('Cover updated!');
                      }}
                      className="w-full bg-[#337ab7] hover:bg-[#286090] text-white py-1 text-[10px] font-bold border border-[#2e6da4]"
                    >
                      Set as Cover
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
