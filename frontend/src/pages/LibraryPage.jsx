import React, { useState } from 'react';
import { Search, Plus, LayoutGrid, List } from 'lucide-react';
import GameCard from '../components/GameCard';

export default function LibraryPage({
  games = [],
  platforms = [],
  onOpenAddModal,
  onOpenReleases,
  onDeleteGame,
  loading = false
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [viewMode, setViewMode] = useState('grid');

  const filteredGames = games.filter((g) => {
    if (searchQuery && !g.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (platformFilter && g.platform_id !== platformFilter) return false;
    if (regionFilter && g.preferred_region !== regionFilter) return false;
    if (statusFilter && g.status !== statusFilter) return false;
    return true;
  });

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
              onOpenReleases={onOpenReleases}
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
              <th className="p-2 border-r border-[#2d3238] w-28">Status</th>
              <th className="p-2 w-32 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2d3238]">
            {filteredGames.map((game) => (
              <tr key={game.id} className="hover:bg-[#1a1d20] bg-[#22262a]">
                <td className="p-2 border-r border-[#2d3238] font-bold text-white flex items-center gap-2">
                  {game.cover_url && <img src={game.cover_url} alt="" className="w-6 h-8 object-cover border border-[#2d3238]" />}
                  <span>{game.title}</span>
                </td>
                <td className="p-2 border-r border-[#2d3238] font-semibold text-[#8c939d] uppercase">{game.platform_id}</td>
                <td className="p-2 border-r border-[#2d3238] font-semibold text-[#337ab7]">{game.preferred_region}</td>
                <td className="p-2 border-r border-[#2d3238] text-[#8c939d]">{game.release_year || '—'}</td>
                <td className="p-2 border-r border-[#2d3238]">
                  <span className={`px-1.5 py-0.5 text-[10px] font-bold border ${
                    game.status === 'downloaded' ? 'bg-[#3c763d] text-[#dff0d8] border-[#2b542c]' :
                    game.status === 'downloading' ? 'bg-[#204d74] text-[#d9edf7] border-[#1b4366]' :
                    'bg-[#8a6d3b] text-[#fcf8e3] border-[#66512c]'
                  }`}>
                    {game.status.toUpperCase()}
                  </span>
                </td>
                <td className="p-2 text-center space-x-1.5">
                  <button
                    onClick={() => onOpenReleases(game)}
                    className="bg-[#337ab7] hover:bg-[#286090] text-white px-2 py-0.5 text-xs font-bold border border-[#2e6da4]"
                  >
                    Search
                  </button>
                  <button
                    onClick={() => onDeleteGame(game.id)}
                    className="bg-[#d9534f] hover:bg-[#c9302c] text-white px-2 py-0.5 text-xs font-bold border border-[#d43f3a]"
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
