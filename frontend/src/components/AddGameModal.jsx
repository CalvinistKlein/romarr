import React, { useState, useEffect } from 'react';
import { X, Search, Plus, Check } from 'lucide-react';
import { api } from '../services/api';

const REGIONS = [
  { id: 'USA', label: 'USA / North America 🇺🇸' },
  { id: 'EUR', label: 'Europe / PAL 🇪🇺' },
  { id: 'JPN', label: 'Japan / NTSC-J 🇯🇵' },
  { id: 'WORLD', label: 'World / Global 🌐' },
  { id: 'TRANSLATION', label: 'English Translation 🈳' },
];

export default function AddGameModal({ isOpen, onClose, onGameAdded, platforms = [] }) {
  const [query, setQuery] = useState('');
  const [platformId, setPlatformId] = useState('');
  const [preferredRegion, setPreferredRegion] = useState('USA');
  const [autoSearch, setAutoSearch] = useState(true);
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [addingMap, setAddingMap] = useState({});

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
      setAddingMap({});
      return;
    }
    handleSearch('Mario');
  }, [isOpen]);

  const handleSearch = async (searchQuery = query) => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const data = await api.searchCatalog(searchQuery, platformId);
      setResults(data || []);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleAddGame = async (game) => {
    try {
      setAddingMap(prev => ({ ...prev, [game.slug]: 'adding' }));
      await api.addGame({
        title: game.title,
        slug: game.slug,
        platform_id: game.platform_id,
        igdb_id: game.igdb_id,
        summary: game.summary,
        cover_url: game.cover_url,
        banner_url: game.banner_url,
        release_year: game.release_year,
        developer: game.developer,
        publisher: game.publisher,
        genres: game.genres,
        preferred_region: preferredRegion,
        auto_search_on_add: autoSearch
      });
      setAddingMap(prev => ({ ...prev, [game.slug]: 'added' }));
      if (onGameAdded) onGameAdded();
    } catch (err) {
      alert(err.message || 'Failed to add game');
      setAddingMap(prev => ({ ...prev, [game.slug]: 'error' }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-[#22262a] border border-[#2d3238] w-full max-w-4xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-3 bg-[#111315] border-b border-[#2d3238] flex items-center justify-between">
          <h2 className="text-sm font-bold text-white">Add New Game to Collection</h2>
          <button
            onClick={onClose}
            className="text-[#8c939d] hover:text-white bg-[#1a1d20] border border-[#2d3238] p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2015 Flat Form Toolbar */}
        <div className="p-3 bg-[#1a1d20] border-b border-[#2d3238] space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search title (e.g. Chrono Trigger, Metroid, Zelda)..."
              className="flex-1 bg-[#16181a] border border-[#2d3238] text-white text-xs px-3 py-1.5 focus:outline-none focus:border-[#337ab7]"
            />
            <button
              onClick={() => handleSearch()}
              disabled={searching}
              className="bg-[#337ab7] hover:bg-[#286090] text-white px-4 py-1.5 text-xs font-bold border border-[#2e6da4] flex items-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5" />
              <span>{searching ? 'Searching...' : 'Search'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block text-[#8c939d] mb-1 font-semibold">Console Filter:</label>
              <select
                value={platformId}
                onChange={(e) => setPlatformId(e.target.value)}
                className="w-full bg-[#16181a] border border-[#2d3238] text-white px-2 py-1 text-xs focus:outline-none"
              >
                <option value="">All Supported Consoles</option>
                {platforms.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[#8c939d] mb-1 font-semibold">Preferred Region:</label>
              <select
                value={preferredRegion}
                onChange={(e) => setPreferredRegion(e.target.value)}
                className="w-full bg-[#16181a] border border-[#2d3238] text-white px-2 py-1 text-xs focus:outline-none"
              >
                {REGIONS.map(r => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 pt-4">
              <input
                type="checkbox"
                id="autoSearch"
                checked={autoSearch}
                onChange={(e) => setAutoSearch(e.target.checked)}
                className="w-3.5 h-3.5 bg-[#16181a] border-[#2d3238] text-[#337ab7]"
              />
              <label htmlFor="autoSearch" className="text-[#e6e6e6] text-xs font-medium cursor-pointer">
                Auto-search & queue top release
              </label>
            </div>
          </div>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {searching ? (
            <div className="py-16 text-center text-[#8c939d]">
              <Search className="w-6 h-6 text-[#337ab7] animate-spin mx-auto mb-2" />
              <p>Searching game catalog...</p>
            </div>
          ) : results.length === 0 ? (
            <div className="py-12 text-center text-[#8c939d]">
              <p>No games found for this query.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {results.map((game, idx) => {
                const state = addingMap[game.slug];
                return (
                  <div
                    key={idx}
                    className="bg-[#22262a] border border-[#2d3238] p-2.5 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-16 bg-[#16181a] border border-[#2d3238] shrink-0 flex items-center justify-center">
                        {game.cover_url ? (
                          <img src={game.cover_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[10px] text-[#8c939d]">ROM</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="bg-[#111315] text-[#e6e6e6] border border-[#2d3238] px-1.5 py-0.2 text-[10px] font-bold uppercase">
                            {game.platform_name}
                          </span>
                          <span className="text-[#8c939d] text-xs">{game.release_year}</span>
                        </div>
                        <h3 className="font-bold text-white text-sm truncate mt-0.5">{game.title}</h3>
                        <p className="text-[#8c939d] text-xs line-clamp-1 mt-0.5">{game.summary || 'No description available.'}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleAddGame(game)}
                      disabled={state === 'adding' || state === 'added'}
                      className={`px-3 py-1.5 text-xs font-bold border shrink-0 ${
                        state === 'added'
                          ? 'bg-[#3c763d] text-[#dff0d8] border-[#2b542c]'
                          : state === 'adding'
                          ? 'bg-[#204d74] text-white border-[#337ab7]'
                          : 'bg-[#337ab7] hover:bg-[#286090] text-white border-[#2e6da4]'
                      }`}
                    >
                      {state === 'added' ? '✓ Added' : state === 'adding' ? 'Adding...' : '+ Add to Library'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-2.5 bg-[#111315] border-t border-[#2d3238] flex justify-end">
          <button
            onClick={onClose}
            className="bg-[#22262a] hover:bg-[#2d3238] text-[#e6e6e6] border border-[#2d3238] px-3 py-1 text-xs"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
