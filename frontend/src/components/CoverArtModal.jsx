import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  Image as ImageIcon,
  Check,
  RefreshCw,
  ExternalLink,
  Sliders,
  Sparkles,
  Layers,
  Monitor,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';

export default function CoverArtModal({ game, isOpen, onClose, onCoverUpdated }) {
  if (!isOpen || !game) return null;

  const [query, setQuery] = useState(game.title || '');
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'cover' | 'artwork' | 'screenshot'
  const [customUrl, setCustomUrl] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);

  useEffect(() => {
    if (isOpen && game) {
      setQuery(game.title || '');
      setCustomUrl('');
      setError(null);
      setStatusMessage(null);
      fetchCovers(game.title || '');
    }
  }, [isOpen, game?.id]);

  const fetchCovers = async (searchQuery) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getCoverOptions(game.id, searchQuery);
      setOptions(data.options || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch cover options from IGDB.');
      setOptions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    fetchCovers(query.trim());
  };

  const handleApplyCover = async (imageUrl, optionId) => {
    setSavingId(optionId);
    setStatusMessage(null);
    try {
      const updated = await api.updateGame(game.id, { cover_url: imageUrl });
      setStatusMessage({ type: 'success', text: 'Cover art updated successfully!' });
      if (onCoverUpdated) {
        onCoverUpdated(updated);
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: `Failed to update cover: ${err.message}` });
    } finally {
      setSavingId(null);
      setTimeout(() => setStatusMessage(null), 3500);
    }
  };

  const handleApplyBanner = async (imageUrl, optionId) => {
    setSavingId(optionId);
    setStatusMessage(null);
    try {
      const updated = await api.updateGame(game.id, { banner_url: imageUrl });
      setStatusMessage({ type: 'success', text: 'Backdrop banner updated successfully!' });
      if (onCoverUpdated) {
        onCoverUpdated(updated);
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: `Failed to update banner: ${err.message}` });
    } finally {
      setSavingId(null);
      setTimeout(() => setStatusMessage(null), 3500);
    }
  };

  const handleApplyCustomUrl = async (e) => {
    e.preventDefault();
    if (!customUrl.trim()) return;
    await handleApplyCover(customUrl.trim(), 'custom');
  };

  // Filter options by category
  const filteredOptions = options.filter(opt => {
    if (activeTab === 'all') return true;
    if (activeTab === 'cover') return opt.type === 'cover';
    if (activeTab === 'artwork') return opt.type === 'artwork';
    if (activeTab === 'screenshot') return opt.type === 'screenshot';
    return true;
  });

  const coverCount = options.filter(o => o.type === 'cover').length;
  const artworkCount = options.filter(o => o.type === 'artwork').length;
  const screenshotCount = options.filter(o => o.type === 'screenshot').length;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-[#22262a] border border-[#2d3238] w-full max-w-5xl text-xs max-h-[92vh] flex flex-col shadow-2xl">
        
        {/* 2015 Classic Flat Header */}
        <div className="bg-[#1b1e21] border-b border-[#2d3238] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-[#337ab7]" />
            <h2 className="text-sm font-bold text-white truncate max-w-md">
              Choose Artwork &bull; <span className="text-[#e6e6e6]">{game.title}</span>
            </h2>
            <span className="bg-[#111315] text-[#8c939d] px-1.5 py-0.5 text-[10px] font-bold uppercase border border-[#2d3238]">
              {game.platform_id}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-[#8c939d] hover:text-white p-1 hover:bg-[#2d3238]"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status Toast Banner */}
        {statusMessage && (
          <div className={`px-4 py-2 text-xs font-bold border-b ${
            statusMessage.type === 'success' 
              ? 'bg-[#3c763d] text-[#dff0d8] border-[#2b542c]' 
              : 'bg-[#a94442] text-[#f2dede] border-[#843534]'
          }`}>
            {statusMessage.text}
          </div>
        )}

        {/* Search & Custom URL Controls */}
        <div className="bg-[#16181a] border-b border-[#2d3238] p-3 space-y-2.5">
          {/* Main Search Query Bar */}
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search IGDB for cover art title (e.g. Shadow of the Colossus, Wander...)"
                className="w-full bg-[#22262a] border border-[#2d3238] text-white px-3 py-1.5 text-xs focus:outline-none focus:border-[#337ab7]"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8c939d] hover:text-white text-[11px]"
                >
                  Clear
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="bg-[#337ab7] hover:bg-[#286090] disabled:opacity-50 text-white px-3 py-1.5 font-bold flex items-center gap-1.5 border border-[#2e6da4]"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>Searching…</span>
                </>
              ) : (
                <>
                  <Search className="w-3 h-3" />
                  <span>Search IGDB</span>
                </>
              )}
            </button>
          </form>

          {/* Direct Custom Image URL Input */}
          <form onSubmit={handleApplyCustomUrl} className="flex items-center gap-2 pt-1 border-t border-[#22262a]">
            <span className="text-[11px] text-[#8c939d] whitespace-nowrap">Or Direct URL:</span>
            <input
              type="url"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="https://images.example.com/custom-boxart.jpg"
              className="flex-1 bg-[#22262a] border border-[#2d3238] text-white px-2.5 py-1 text-[11px] focus:outline-none focus:border-[#337ab7]"
            />
            <button
              type="submit"
              disabled={!customUrl.trim() || savingId === 'custom'}
              className="bg-[#3c763d] hover:bg-[#2b542c] disabled:opacity-50 text-white px-2.5 py-1 text-[11px] font-bold flex items-center gap-1 border border-[#2b542c]"
            >
              {savingId === 'custom' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              <span>Set Custom Cover</span>
            </button>
          </form>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 pt-1 text-[11px]">
            <span className="text-[#8c939d] font-semibold mr-1">Filter:</span>
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-2 py-0.5 font-bold border ${
                activeTab === 'all'
                  ? 'bg-[#337ab7] text-white border-[#2e6da4]'
                  : 'bg-[#22262a] text-[#8c939d] hover:text-white border-[#2d3238]'
              }`}
            >
              All ({options.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('cover')}
              className={`px-2 py-0.5 font-bold border ${
                activeTab === 'cover'
                  ? 'bg-[#337ab7] text-white border-[#2e6da4]'
                  : 'bg-[#22262a] text-[#8c939d] hover:text-white border-[#2d3238]'
              }`}
            >
              Box Covers ({coverCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('artwork')}
              className={`px-2 py-0.5 font-bold border ${
                activeTab === 'artwork'
                  ? 'bg-[#337ab7] text-white border-[#2e6da4]'
                  : 'bg-[#22262a] text-[#8c939d] hover:text-white border-[#2d3238]'
              }`}
            >
              Artworks ({artworkCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('screenshot')}
              className={`px-2 py-0.5 font-bold border ${
                activeTab === 'screenshot'
                  ? 'bg-[#337ab7] text-white border-[#2e6da4]'
                  : 'bg-[#22262a] text-[#8c939d] hover:text-white border-[#2d3238]'
              }`}
            >
              Screenshots ({screenshotCount})
            </button>
          </div>
        </div>

        {/* Main Artwork Grid */}
        <div className="p-4 flex-1 overflow-y-auto min-h-[360px] bg-[#1a1d20]">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-[#8c939d] space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin text-[#337ab7]" />
              <p className="font-bold text-[#e6e6e6]">Searching IGDB for cover art and media…</p>
              <p className="text-[11px]">Fetching official releases, regional variations, and high-res artwork</p>
            </div>
          ) : error ? (
            <div className="bg-[#22262a] border border-[#a94442] p-4 text-[#f2dede] flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-[#a94442] shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-white">Search Error</p>
                <p className="text-xs mt-0.5">{error}</p>
                <p className="text-[11px] text-[#8c939d] mt-2">
                  Tip: Check your Twitch/IGDB API credentials in Settings, or use the Direct URL input above.
                </p>
              </div>
            </div>
          ) : filteredOptions.length === 0 ? (
            <div className="py-16 text-center text-[#8c939d] bg-[#22262a] border border-[#2d3238] p-6">
              <ImageIcon className="w-8 h-8 mx-auto mb-2 text-[#8c939d]/60" />
              <p className="font-bold text-[#e6e6e6]">No matching cover art found for "{query}".</p>
              <p className="text-[11px] mt-1 mb-3">Try searching with an alternate title (e.g. without subtitles or with Japanese title).</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
              {filteredOptions.map((opt) => {
                const isCurrentCover = game.cover_url === opt.url || game.cover_url === opt.url_hd;
                const isCurrentBanner = game.banner_url === opt.url_hd || game.banner_url === opt.url;
                const isSaving = savingId === opt.id;

                return (
                  <div
                    key={opt.id}
                    className={`bg-[#22262a] border flex flex-col justify-between transition-all ${
                      isCurrentCover ? 'border-[#3c763d] ring-1 ring-[#3c763d]' : 'border-[#2d3238] hover:border-[#337ab7]'
                    }`}
                  >
                    {/* Image Preview */}
                    <div className="relative aspect-[3/4] w-full bg-[#16181a] overflow-hidden group">
                      <img
                        src={opt.url}
                        alt={opt.label}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        onError={(e) => {
                          if (opt.url_hd && e.target.src !== opt.url_hd) {
                            e.target.src = opt.url_hd;
                          }
                        }}
                      />

                      {/* Top Badges */}
                      <div className="absolute top-1 left-1 right-1 flex items-center justify-between gap-1">
                        <span className={`px-1 py-0.5 text-[9px] font-bold uppercase border ${
                          opt.type === 'cover'
                            ? 'bg-[#204d74] text-[#d9edf7] border-[#1b4366]'
                            : opt.type === 'artwork'
                            ? 'bg-[#8a6d3b] text-[#fcf8e3] border-[#66512c]'
                            : 'bg-[#3e444c] text-[#e6e6e6] border-[#4e555b]'
                        }`}>
                          {opt.type}
                        </span>

                        {opt.width && opt.height && (
                          <span className="bg-[#111315]/90 text-[#8c939d] px-1 py-0.5 text-[9px] border border-[#2d3238]">
                            {opt.width}×{opt.height}
                          </span>
                        )}
                      </div>

                      {/* Active Status Overlay */}
                      {isCurrentCover && (
                        <div className="absolute bottom-1 right-1 bg-[#3c763d] text-[#dff0d8] px-1.5 py-0.5 text-[9px] font-bold border border-[#2b542c] flex items-center gap-1 shadow">
                          <Check className="w-2.5 h-2.5" /> Active Cover
                        </div>
                      )}
                    </div>

                    {/* Metadata & Actions */}
                    <div className="p-2 space-y-2 flex-1 flex flex-col justify-between">
                      <div>
                        <p className="font-bold text-[#e6e6e6] text-[11px] truncate" title={opt.label}>
                          {opt.label}
                        </p>
                        {opt.release_year && (
                          <p className="text-[10px] text-[#8c939d] mt-0.5">
                            Year: {opt.release_year}
                          </p>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="pt-1.5 border-t border-[#2d3238] space-y-1">
                        <button
                          type="button"
                          onClick={() => handleApplyCover(opt.url_hd || opt.url, opt.id)}
                          disabled={isSaving || isCurrentCover}
                          className={`w-full py-1 text-[10px] font-bold flex items-center justify-center gap-1 border ${
                            isCurrentCover
                              ? 'bg-[#255625] text-[#d6e9c6] border-[#3c763d] cursor-default'
                              : 'bg-[#337ab7] hover:bg-[#286090] text-white border-[#2e6da4]'
                          }`}
                        >
                          {isSaving ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : isCurrentCover ? (
                            <>
                              <Check className="w-3 h-3" />
                              <span>Current Cover</span>
                            </>
                          ) : (
                            <>
                              <ImageIcon className="w-3 h-3" />
                              <span>Set as Cover</span>
                            </>
                          )}
                        </button>

                        {(opt.type === 'artwork' || opt.type === 'screenshot') && (
                          <button
                            type="button"
                            onClick={() => handleApplyBanner(opt.url_hd || opt.url, opt.id)}
                            disabled={isSaving || isCurrentBanner}
                            className={`w-full py-0.5 text-[10px] font-bold flex items-center justify-center gap-1 border ${
                              isCurrentBanner
                                ? 'bg-[#255625] text-[#d6e9c6] border-[#3c763d]'
                                : 'bg-[#22262a] hover:bg-[#2d3238] text-[#8c939d] hover:text-white border-[#2d3238]'
                            }`}
                          >
                            <Monitor className="w-2.5 h-2.5" />
                            <span>{isCurrentBanner ? 'Active Banner' : 'Set as Banner'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 2015 Modal Footer */}
        <div className="bg-[#1b1e21] border-t border-[#2d3238] px-4 py-2.5 flex items-center justify-between text-[#8c939d]">
          <span className="text-[11px]">
            Showing {filteredOptions.length} available cover options for <strong>{game.title}</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="bg-[#22262a] hover:bg-[#2d3238] text-white px-3 py-1 text-xs font-bold border border-[#2d3238]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
