import React, { useState } from 'react';
import { Search, Plus, LayoutGrid, List, ArrowDown, Archive, FolderSync, Download, RefreshCw } from 'lucide-react';
import GameCard from '../components/GameCard';
import { api } from '../services/api';

export default function LibraryPage({
  games = [],
  platforms = [],
  queue = [],
  onOpenAddModal,
  onOpenReleases,
  onOpenCoverModal,
  onSelectGame,
  onDeleteGame,
  loading = false
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [viewMode, setViewMode] = useState('grid');

  // Map active queue items by game_id
  const queueMap = {};
  if (Array.isArray(queue)) {
    queue.forEach(item => {
      if (item.game_id && item.status !== 'completed') {
        queueMap[item.game_id] = item;
      }
    });
  }

  const formatSpeed = (bytesPerSec) => {
    if (!bytesPerSec || bytesPerSec <= 0) return '0 KB/s';
    if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
    return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
  };

  const filteredGames = games.filter((g) => {
    if (searchQuery && !g.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (platformFilter && g.platform_id !== platformFilter) return false;
    if (regionFilter && g.preferred_region !== regionFilter) return false;
    if (statusFilter && g.status !== statusFilter) return false;
    return true;
  });

  const renderTableStatus = (game) => {
    const activeQ = queueMap[game.id];
    if (activeQ) {
      if (activeQ.status === 'extracting') {
        return (
          <div className="space-y-1 min-w-[130px]">
            <span className="bg-[#8a6d3b] text-[#fcf8e3] px-1.5 py-0.5 text-[9px] font-bold border border-[#66512c] inline-flex items-center gap-1 animate-pulse">
              <Archive className="w-2.5 h-2.5" /> EXTRACTING
            </span>
            <div className="w-full bg-[#16181a] border border-[#8a6d3b] h-2 relative overflow-hidden">
              <div className="bg-gradient-to-r from-[#8a6d3b] via-[#f0ad4e] to-[#8a6d3b] h-full w-full animate-pulse" />
            </div>
          </div>
        );
      }
      if (activeQ.status === 'organizing') {
        return (
          <div className="space-y-1 min-w-[130px]">
            <span className="bg-[#1b4366] text-[#bce8f1] px-1.5 py-0.5 text-[9px] font-bold border border-[#337ab7] inline-flex items-center gap-1 animate-pulse">
              <FolderSync className="w-2.5 h-2.5" /> ORGANIZING
            </span>
            <div className="w-full bg-[#16181a] border border-[#337ab7] h-2 relative overflow-hidden">
              <div className="bg-gradient-to-r from-[#204d74] via-[#5bc0de] to-[#204d74] h-full w-full animate-pulse" />
            </div>
          </div>
        );
      }
      return (
        <div className="space-y-1 min-w-[140px]">
          <div className="flex items-center justify-between text-[10px]">
            <span className="bg-[#204d74] text-[#d9edf7] px-1.5 py-0.2 font-bold border border-[#1b4366]">
              {activeQ.progress || 0}%
            </span>
            <span className="text-[#8c939d]">{formatSpeed(activeQ.download_speed)}</span>
          </div>
          <div className="w-full bg-[#16181a] border border-[#2d3238] h-2 relative overflow-hidden">
            <div
              className="bg-[#337ab7] h-full transition-all duration-300"
              style={{ width: `${activeQ.progress || 0}%` }}
            />
          </div>
        </div>
      );
    }

    if (game.status === 'downloaded') {
      return (
        <span className="bg-[#3c763d] text-[#dff0d8] px-1.5 py-0.5 text-[10px] font-bold border border-[#2b542c]">
          DOWNLOADED
        </span>
      );
    }

    if (game.status === 'downloading') {
      return (
        <span className="bg-[#204d74] text-[#d9edf7] px-1.5 py-0.5 text-[10px] font-bold border border-[#1b4366]">
          DOWNLOADING
        </span>
      );
    }

    return (
      <span className="bg-[#8a6d3b] text-[#fcf8e3] px-1.5 py-0.5 text-[10px] font-bold border border-[#66512c]">
        WANTED
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* 2015 Header & Action Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#2d3238] gap-2">
        <div>
          <h1 className="text-xl font-bold text-white">Game Collection</h1>
          <p className="text-xs text-[#8c939d]">
            Managing {games.length} total titles across all consoles
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="inline-flex border border-[#2d3238]">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 border-r border-[#2d3238] ${viewMode === 'grid' ? 'bg-[#337ab7] text-white' : 'bg-[#16181a] text-[#8c939d] hover:text-white'}`}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 ${viewMode === 'table' ? 'bg-[#337ab7] text-white' : 'bg-[#16181a] text-[#8c939d] hover:text-white'}`}
              title="Table View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 2015 Flat Filter Toolbar */}
      <div className="bg-[#22262a] border border-[#2d3238] p-2.5 flex flex-wrap items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <span className="text-[#8c939d] font-semibold">Filter:</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title..."
            className="flex-1 bg-[#16181a] border border-[#2d3238] text-white px-2.5 py-1 focus:outline-none focus:border-[#337ab7]"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="bg-[#16181a] border border-[#2d3238] text-white px-2 py-1 focus:outline-none"
          >
            <option value="">All Consoles</option>
            {platforms.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            className="bg-[#16181a] border border-[#2d3238] text-white px-2 py-1 focus:outline-none"
          >
            <option value="">All Regions</option>
            <option value="USA">USA / North America 🇺🇸</option>
            <option value="EUR">Europe / PAL 🇪🇺</option>
            <option value="JPN">Japan / NTSC-J 🇯🇵</option>
            <option value="WORLD">World / Global 🌐</option>
            <option value="TRANSLATION">Translations 🈳</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#16181a] border border-[#2d3238] text-white px-2 py-1 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="downloaded">Downloaded</option>
            <option value="downloading">Downloading</option>
            <option value="wanted">Wanted</option>
          </select>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="py-20 text-center text-[#8c939d]">
          <p>Loading game library...</p>
        </div>
      ) : filteredGames.length === 0 ? (
        <div className="bg-[#22262a] border border-[#2d3238] p-8 text-center text-[#8c939d]">
          <p className="font-bold text-[#e6e6e6] text-sm">No games found.</p>
          <p className="text-xs mt-1 mb-4">Click "Add Game" to search indexers and build your collection.</p>
          <button
            onClick={onOpenAddModal}
            className="bg-[#337ab7] hover:bg-[#286090] text-white px-3 py-1.5 text-xs font-bold border border-[#2e6da4] inline-flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Game</span>
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {filteredGames.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              queueItem={queueMap[game.id]}
              onOpenReleases={onOpenReleases}
              onOpenCoverModal={onOpenCoverModal}
              onSelectGame={onSelectGame}
              onDelete={onDeleteGame}
            />
          ))}
        </div>
      ) : (
        /* Table View */
        <table className="w-full text-left border-collapse border border-[#2d3238] text-xs">
          <thead className="bg-[#16181a] text-[#8c939d] border-b border-[#2d3238]">
            <tr>
              <th className="p-2 border-r border-[#2d3238]">Title</th>
              <th className="p-2 border-r border-[#2d3238] w-28">Console</th>
              <th className="p-2 border-r border-[#2d3238] w-24">Region</th>
              <th className="p-2 border-r border-[#2d3238] w-20">Year</th>
              <th className="p-2 border-r border-[#2d3238] w-40">Status / Progress</th>
              <th className="p-2 w-44 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2d3238]">
            {filteredGames.map((game) => (
              <tr key={game.id} className="hover:bg-[#1a1d20] bg-[#22262a]">
                <td className="p-2 border-r border-[#2d3238] font-bold text-white flex items-center gap-2">
                  <div
                    onClick={() => onOpenCoverModal && onOpenCoverModal(game)}
                    className="cursor-pointer group/thumb relative shrink-0"
                    title="Click to change cover art"
                  >
                    {game.cover_url ? (
                      <img src={game.cover_url} alt="" className="w-6 h-8 object-cover border border-[#2d3238] group-hover/thumb:border-[#5bc0de]" />
                    ) : (
                      <div className="w-6 h-8 bg-[#16181a] border border-[#2d3238] flex items-center justify-center text-[8px] text-[#8c939d]">ROM</div>
                    )}
                  </div>
                  <span
                    className="truncate hover:text-[#5bc0de] cursor-pointer"
                    title="Click to view game details"
                    onClick={() => onSelectGame && onSelectGame(game)}
                  >
                    {game.title}
                  </span>
                </td>
                <td className="p-2 border-r border-[#2d3238] font-semibold text-[#8c939d] uppercase">{game.platform_id}</td>
                <td className="p-2 border-r border-[#2d3238] font-semibold text-[#337ab7]">{game.preferred_region}</td>
                <td className="p-2 border-r border-[#2d3238] text-[#8c939d]">{game.release_year || '—'}</td>
                <td className="p-2 border-r border-[#2d3238]">
                  {renderTableStatus(game)}
                </td>
                <td className="p-2 text-center space-x-1">
                  <button
                    onClick={() => onOpenReleases(game)}
                    className="bg-[#337ab7] hover:bg-[#286090] text-white px-2 py-0.5 text-[11px] font-bold border border-[#2e6da4]"
                    title="Search Releases"
                  >
                    Releases
                  </button>
                  <button
                    onClick={() => onOpenCoverModal && onOpenCoverModal(game)}
                    className="bg-[#2e3338] hover:bg-[#3e444c] text-[#e6e6e6] px-2 py-0.5 text-[11px] font-bold border border-[#4e555b]"
                    title="Change Cover Art"
                  >
                    Cover
                  </button>
                  <button
                    onClick={() => onDeleteGame(game.id)}
                    className="bg-[#d9534f] hover:bg-[#c9302c] text-white px-2 py-0.5 text-[11px] font-bold border border-[#d43f3a]"
                    title="Delete Game"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
