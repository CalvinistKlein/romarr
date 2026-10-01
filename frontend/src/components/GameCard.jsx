import React, { useState } from 'react';
import {
  Search,
  Trash2,
  Check,
  Clock,
  Download,
  RefreshCw,
  ArrowDown,
  Archive,
  FolderSync,
  AlertCircle,
  Image as ImageIcon,
  ExternalLink
} from 'lucide-react';
import { api } from '../services/api';

export default function GameCard({
  game,
  queueItem,
  onOpenReleases,
  onOpenCoverModal,
  onSelectGame,
  onDelete
}) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDownloading(true);
    try {
      await api.downloadRom(game.id);
    } catch (err) {
      alert(`Download error: ${err.message}`);
    } finally {
      setTimeout(() => setDownloading(false), 2000);
    }
  };

  const formatSpeed = (bytesPerSec) => {
    if (!bytesPerSec || bytesPerSec <= 0) return '0 KB/s';
    if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
    return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
  };

  const formatEta = (seconds) => {
    if (!seconds || seconds <= 0) return 'Done';
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const isItemActive = queueItem && queueItem.status !== 'completed';

  const getStatusTag = () => {
    if (isItemActive) {
      if (queueItem.status === 'extracting') {
        return (
          <span className="bg-[#8a6d3b] text-[#fcf8e3] px-1.5 py-0.5 text-[10px] font-bold border border-[#66512c] inline-flex items-center gap-1 animate-pulse">
            <Archive className="w-2.5 h-2.5" /> EXTRACTING
          </span>
        );
      }
      if (queueItem.status === 'organizing') {
        return (
          <span className="bg-[#1b4366] text-[#bce8f1] px-1.5 py-0.5 text-[10px] font-bold border border-[#337ab7] inline-flex items-center gap-1 animate-pulse">
            <FolderSync className="w-2.5 h-2.5" /> ORGANIZING
          </span>
        );
      }
      if (queueItem.status === 'failed') {
        return (
          <span className="bg-[#a94442] text-[#f2dede] px-1.5 py-0.5 text-[10px] font-bold border border-[#843534] inline-flex items-center gap-1">
            <AlertCircle className="w-2.5 h-2.5" /> FAILED
          </span>
        );
      }
      return (
        <span className="bg-[#204d74] text-[#d9edf7] px-1.5 py-0.5 text-[10px] font-bold border border-[#1b4366] inline-flex items-center gap-1">
          <ArrowDown className="w-2.5 h-2.5 text-[#5bc0de]" /> DOWNLOADING
        </span>
      );
    }

    switch (game.status) {
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
    <div className="bg-[#22262a] border border-[#2d3238] flex flex-col text-xs group/card hover:border-[#4e555b] transition-colors">
      {/* Poster Image with flat border */}
      <div
        className="relative aspect-[3/4] w-full bg-[#16181a] border-b border-[#2d3238] overflow-hidden cursor-pointer"
        onClick={() => onSelectGame && onSelectGame(game)}
      >
        {game.cover_url ? (
          <img
            src={game.cover_url}
            alt={game.title}
            className="w-full h-full object-cover group-hover/card:scale-102 transition-transform duration-200"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-[#8c939d] p-2 text-center">
            <span className="font-bold">{game.title}</span>
          </div>
        )}

        {/* Hover Action Overlay to Open Details or Change Art */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/card:opacity-100 flex flex-col items-center justify-center text-white font-bold gap-1.5 transition-opacity duration-150 z-10">
          <span className="text-[11px] bg-[#337ab7] text-white px-2.5 py-1 border border-[#2e6da4] flex items-center gap-1 shadow">
            View Details
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onOpenCoverModal) onOpenCoverModal(game);
            }}
            className="text-[10px] bg-[#16181a]/90 hover:bg-[#22262a] text-[#5bc0de] px-2 py-0.5 border border-[#2d3238] flex items-center gap-1"
          >
            <ImageIcon className="w-3 h-3" /> Change Art
          </button>
        </div>

        {/* Flat Top Badges */}
        <div className="absolute top-1 left-1 right-1 flex items-center justify-between pointer-events-none z-20">
          <span className="bg-[#111315] text-[#e6e6e6] px-1.5 py-0.5 text-[10px] font-bold uppercase border border-[#2d3238]">
            {game.platform_id}
          </span>
          {getRegionBadge(game.preferred_region)}
        </div>

        {/* Live Progress Overlay Banner on Poster (if downloading or organizing) */}
        {isItemActive && (
          <div className="absolute bottom-0 inset-x-0 bg-[#111315]/90 border-t border-[#2d3238] p-1.5 space-y-1 z-20">
            <div className="w-full bg-[#16181a] border border-[#2d3238] h-3.5 relative overflow-hidden">
              {queueItem.status === 'extracting' ? (
                <div className="bg-gradient-to-r from-[#8a6d3b] via-[#f0ad4e] to-[#8a6d3b] h-full w-full animate-pulse" />
              ) : queueItem.status === 'organizing' ? (
                <div className="bg-gradient-to-r from-[#204d74] via-[#5bc0de] to-[#204d74] h-full w-full animate-pulse" />
              ) : (
                <div
                  className="bg-[#337ab7] h-full transition-all duration-300"
                  style={{ width: `${queueItem.progress || 0}%` }}
                />
              )}
              <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white drop-shadow">
                {queueItem.status === 'extracting'
                  ? 'Extracting...'
                  : queueItem.status === 'organizing'
                  ? 'Organizing...'
                  : `${queueItem.progress || 0}%`}
              </span>
            </div>

            {queueItem.status === 'downloading' && (
              <div className="flex items-center justify-between text-[9px] text-[#8c939d]">
                <span>{formatSpeed(queueItem.download_speed)}</span>
                <span>ETA: {formatEta(queueItem.eta_seconds)}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="p-2.5 flex-1 flex flex-col justify-between">
        <div>
          <h3
            className="font-bold text-[#e6e6e6] hover:text-[#5bc0de] cursor-pointer truncate"
            title={game.title}
            onClick={() => onSelectGame && onSelectGame(game)}
          >
            {game.title}
          </h3>
          <p className="text-[11px] text-[#8c939d] mt-0.5">
            {game.release_year || 'Unknown'} &bull; {game.developer || 'Retro'}
          </p>
        </div>

        <div className="mt-2 pt-2 border-t border-[#2d3238] flex items-center justify-between">
          {getStatusTag()}
          {game.file_size_bytes ? (
            <span className="text-[10px] text-[#8c939d]">
              {(game.file_size_bytes / (1024 * 1024)).toFixed(0)} MB
            </span>
          ) : null}
        </div>

        {/* Flat Action Buttons */}
        <div className="mt-2.5 pt-2 border-t border-[#2d3238] space-y-1.5">
          {game.status === 'downloaded' && (
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="w-full bg-[#3c763d] hover:bg-[#2b542c] text-white py-1 text-[11px] font-bold flex items-center justify-center gap-1 border border-[#2b542c]"
              title="Download ROM file from Romarr to this device"
            >
              {downloading ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>Starting Download…</span>
                </>
              ) : (
                <>
                  <Download className="w-3 h-3" />
                  <span>Download From Romarr</span>
                </>
              )}
            </button>
          )}

          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => onOpenReleases(game)}
              className="bg-[#337ab7] hover:bg-[#286090] text-white py-1 text-[11px] font-bold flex items-center justify-center gap-1 border border-[#2e6da4]"
              title="Search and grab torrent releases"
            >
              <Search className="w-3 h-3" />
              <span>Releases</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenCoverModal && onOpenCoverModal(game)}
              className="bg-[#2e3338] hover:bg-[#3e444c] text-[#e6e6e6] py-1 text-[11px] font-bold flex items-center justify-center gap-1 border border-[#4e555b]"
              title="Re-search or change cover art from IGDB"
            >
              <ImageIcon className="w-3 h-3 text-[#5bc0de]" />
              <span>Cover</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => onDelete(game.id)}
            className="w-full bg-[#a94442]/20 hover:bg-[#a94442] text-[#ebccd1] hover:text-white py-0.5 text-[10px] font-bold flex items-center justify-center gap-1 border border-[#843534]/40"
            title="Delete game from library"
          >
            <Trash2 className="w-2.5 h-2.5" />
            <span>Delete</span>
          </button>
        </div>
      </div>
    </div>
  );
}
