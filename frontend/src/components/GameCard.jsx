import React from 'react';
import { Search, Trash2, Check, Clock, Download } from 'lucide-react';

export default function GameCard({ game, onOpenReleases, onDelete }) {
  const getStatusTag = (status) => {
    switch (status) {
      case 'downloaded':
        return (
          <span className="bg-[#3c763d] text-[#dff0d8] px-1.5 py-0.5 text-[10px] font-bold border border-[#2b542c]">
            DOWNLOADED
          </span>
        );
      case 'downloading':
        return (
          <span className="bg-[#204d74] text-[#d9edf7] px-1.5 py-0.5 text-[10px] font-bold border border-[#1b4366]">
            DOWNLOADING
          </span>
        );
      default:
        return (
          <span className="bg-[#8a6d3b] text-[#fcf8e3] px-1.5 py-0.5 text-[10px] font-bold border border-[#66512c]">
            WANTED
          </span>
        );
    }
  };

  const getRegionBadge = (region) => {
    switch (region) {
      case 'USA': return <span className="bg-[#204d74] text-[#bce8f1] px-1.5 py-0.5 text-[10px] font-bold border border-[#337ab7]">USA 🇺🇸</span>;
      case 'EUR': return <span className="bg-[#66512c] text-[#faebcc] px-1.5 py-0.5 text-[10px] font-bold border border-[#8a6d3b]">EUR 🇪🇺</span>;
      case 'JPN': return <span className="bg-[#6b2424] text-[#ebccd1] px-1.5 py-0.5 text-[10px] font-bold border border-[#a94442]">JPN 🇯🇵</span>;
      case 'TRANSLATION': return <span className="bg-[#255625] text-[#d6e9c6] px-1.5 py-0.5 text-[10px] font-bold border border-[#3c763d]">TRANS 🈳</span>;
      default: return <span className="bg-[#3e444c] text-[#d9d9d9] px-1.5 py-0.5 text-[10px] font-bold border border-[#4e555b]">{region || 'WORLD'} 🌐</span>;
    }
  };

  return (
    <div className="bg-[#22262a] border border-[#2d3238] flex flex-col text-xs">
      {/* Poster Image with flat border */}
      <div className="relative aspect-[3/4] w-full bg-[#16181a] border-b border-[#2d3238]">
        {game.cover_url ? (
          <img
            src={game.cover_url}
            alt={game.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-[#8c939d] p-2 text-center">
            <span className="font-bold">{game.title}</span>
          </div>
        )}

        {/* Flat Top Badges */}
        <div className="absolute top-1 left-1 right-1 flex items-center justify-between">
          <span className="bg-[#111315] text-[#e6e6e6] px-1.5 py-0.5 text-[10px] font-bold uppercase border border-[#2d3238]">
            {game.platform_id}
          </span>
          {getRegionBadge(game.preferred_region)}
        </div>
      </div>

      {/* Info Section */}
      <div className="p-2.5 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-bold text-[#e6e6e6] truncate" title={game.title}>
            {game.title}
          </h3>
          <p className="text-[11px] text-[#8c939d] mt-0.5">
            {game.release_year || 'Unknown'} &bull; {game.developer || 'Retro'}
          </p>
        </div>

        <div className="mt-2 pt-2 border-t border-[#2d3238] flex items-center justify-between">
          {getStatusTag(game.status)}
          {game.file_size_bytes ? (
            <span className="text-[10px] text-[#8c939d]">
              {(game.file_size_bytes / (1024 * 1024)).toFixed(0)} MB
            </span>
          ) : null}
        </div>

        {/* Flat Action Buttons */}
        <div className="mt-2.5 pt-2 border-t border-[#2d3238] grid grid-cols-2 gap-1.5">
          <button
            onClick={() => onOpenReleases(game)}
            className="bg-[#337ab7] hover:bg-[#286090] text-white py-1 text-[11px] font-bold flex items-center justify-center gap-1 border border-[#2e6da4]"
          >
            <Search className="w-3 h-3" />
            <span>Releases</span>
          </button>
          <button
            onClick={() => onDelete(game.id)}
            className="bg-[#d9534f] hover:bg-[#c9302c] text-white py-1 text-[11px] font-bold flex items-center justify-center gap-1 border border-[#d43f3a]"
          >
            <Trash2 className="w-3 h-3" />
            <span>Delete</span>
          </button>
        </div>
      </div>
    </div>
  );
}
