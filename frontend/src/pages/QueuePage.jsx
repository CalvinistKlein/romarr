import React from 'react';
import {
  DownloadCloud,
  Trash2,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  HardDrive,
  Activity,
  ArrowDown,
  Layers,
  Download,
  Clock,
  Archive,
  FolderSync
} from 'lucide-react';
import { api } from '../services/api';

export default function QueuePage({ queue = [], onRefresh }) {
  const handleCancel = async (id) => {
    if (!confirm('Cancel this download task?')) return;
    try {
      await api.cancelQueueItem(id);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Failed to cancel task:', err);
    }
  };

  const formatSpeed = (bytesPerSec) => {
    if (!bytesPerSec || bytesPerSec <= 0) return '0 KB/s';
    if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
    return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 MB';
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const formatEta = (seconds) => {
    if (!seconds || seconds <= 0) return 'Done';
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const activeItems = queue.filter(q => q.status !== 'completed');
  const completedItems = queue.filter(q => q.status === 'completed');

  const totalSpeed = activeItems.reduce((acc, curr) => acc + (curr.download_speed || 0), 0);
  const organizingCount = activeItems.filter(q => q.status === 'extracting' || q.status === 'organizing').length;

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'downloading':
        return (
          <span className="bg-[#204d74] text-[#d9edf7] px-2 py-0.5 text-[10px] font-bold border border-[#1b4366] inline-flex items-center gap-1">
            <ArrowDown className="w-3 h-3 text-[#5bc0de]" />
            DOWNLOADING
          </span>
        );
      case 'extracting':
        return (
          <span className="bg-[#8a6d3b] text-[#fcf8e3] px-2 py-0.5 text-[10px] font-bold border border-[#66512c] inline-flex items-center gap-1 animate-pulse">
            <Archive className="w-3 h-3 text-[#f0ad4e]" />
            EXTRACTING
          </span>
        );
      case 'organizing':
        return (
          <span className="bg-[#1b4366] text-[#bce8f1] px-2 py-0.5 text-[10px] font-bold border border-[#337ab7] inline-flex items-center gap-1 animate-pulse">
            <FolderSync className="w-3 h-3 text-[#5bc0de]" />
            ORGANIZING
          </span>
        );
      case 'failed':
        return (
          <span className="bg-[#a94442] text-[#f2dede] px-2 py-0.5 text-[10px] font-bold border border-[#843534] inline-flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-[#d9534f]" />
            FAILED
          </span>
        );
      default:
        return (
          <span className="bg-[#3e444c] text-[#d9d9d9] px-2 py-0.5 text-[10px] font-bold border border-[#4e555b] inline-flex items-center gap-1">
            <Clock className="w-3 h-3" />
            QUEUED
          </span>
        );
    }
  };

  const renderProgressBar = (item) => {
    if (item.status === 'extracting') {
      return (
        <div className="space-y-1">
          <div className="w-full bg-[#16181a] border border-[#8a6d3b] h-5 relative overflow-hidden">
            <div className="bg-gradient-to-r from-[#8a6d3b] via-[#f0ad4e] to-[#8a6d3b] h-full w-full animate-pulse" />
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white drop-shadow">
              Unpacking Archive &amp; Extracting ROM...
            </span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-[#8c939d]">
            <span>Post-Processing</span>
            <span className="text-[#f0ad4e]">Extracting inner files</span>
          </div>
        </div>
      );
    }

    if (item.status === 'organizing') {
      return (
        <div className="space-y-1">
          <div className="w-full bg-[#16181a] border border-[#337ab7] h-5 relative overflow-hidden">
            <div className="bg-gradient-to-r from-[#204d74] via-[#5bc0de] to-[#204d74] h-full w-full animate-pulse" />
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white drop-shadow">
              Organizing into /roms/ &amp; Creating Symlinks...
            </span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-[#8c939d]">
            <span>Post-Processing</span>
            <span className="text-[#5bc0de]">Creating portable ROM link</span>
          </div>
        </div>
      );
    }

    if (item.status === 'failed') {
      return (
        <div className="space-y-1">
          <div className="w-full bg-[#16181a] border border-[#a94442] h-5 relative">
            <div className="bg-[#a94442] h-full w-full" />
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">
              Error occurred
            </span>
          </div>
          {item.error_message && (
            <p className="text-[10px] text-[#d9534f] truncate" title={item.error_message}>
              {item.error_message}
            </p>
          )}
        </div>
      );
    }

    // Standard downloading / queued
    return (
      <div className="space-y-1">
        <div className="w-full bg-[#16181a] border border-[#2d3238] h-5 relative overflow-hidden">
          <div
            className="bg-[#337ab7] h-full transition-all duration-300"
            style={{ width: `${item.progress}%` }}
          />
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white drop-shadow">
            {item.progress}%
          </span>
        </div>
        <div className="flex items-center justify-between text-[10px] text-[#8c939d]">
          <span>{formatSpeed(item.download_speed)}</span>
          <span>ETA: {formatEta(item.eta_seconds)}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#2d3238] gap-2">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <DownloadCloud className="w-5 h-5 text-[#337ab7]" />
            Activity &amp; Download Queue
          </h1>
          <p className="text-[#8c939d]">
            Live tracking for Prowlarr/Torznab torrent downloads, archive extraction, and ROM organization.
          </p>
        </div>

        {onRefresh && (
          <button
            onClick={onRefresh}
            className="bg-[#22262a] hover:bg-[#2d3238] text-white px-3 py-1.5 border border-[#2d3238] flex items-center gap-1.5 self-start sm:self-auto font-semibold"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#5bc0de]" />
            <span>Refresh Queue</span>
          </button>
        )}
      </div>

      {/* Summary Statistics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#22262a] border border-[#2d3238] p-3">
          <div className="text-[#8c939d] uppercase font-semibold text-[10px] flex items-center gap-1">
            <Activity className="w-3.5 h-3.5 text-[#337ab7]" /> Active Downloads
          </div>
          <div className="text-xl font-bold text-white mt-1">{activeItems.length}</div>
        </div>

        <div className="bg-[#22262a] border border-[#2d3238] p-3">
          <div className="text-[#8c939d] uppercase font-semibold text-[10px] flex items-center gap-1">
            <ArrowDown className="w-3.5 h-3.5 text-[#5cb85c]" /> Total Download Speed
          </div>
          <div className="text-xl font-bold text-[#5cb85c] mt-1">{formatSpeed(totalSpeed)}</div>
        </div>

        <div className="bg-[#22262a] border border-[#2d3238] p-3">
          <div className="text-[#8c939d] uppercase font-semibold text-[10px] flex items-center gap-1">
            <Archive className="w-3.5 h-3.5 text-[#f0ad4e]" /> Extracting / Organizing
          </div>
          <div className="text-xl font-bold text-[#f0ad4e] mt-1">{organizingCount}</div>
        </div>

        <div className="bg-[#22262a] border border-[#2d3238] p-3">
          <div className="text-[#8c939d] uppercase font-semibold text-[10px] flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#5bc0de]" /> Completed
          </div>
          <div className="text-xl font-bold text-white mt-1">{completedItems.length}</div>
        </div>
      </div>

      {/* Active Tasks Table */}
      <div className="space-y-2">
        <h2 className="text-sm font-bold text-[#e6e6e6] uppercase flex items-center gap-2">
          <DownloadCloud className="w-4 h-4 text-[#337ab7]" />
          <span>Active Downloads &amp; Organization ({activeItems.length})</span>
        </h2>

        {activeItems.length === 0 ? (
          <div className="bg-[#22262a] border border-[#2d3238] p-8 text-center text-[#8c939d]">
            <DownloadCloud className="w-8 h-8 text-[#3e444c] mx-auto mb-2" />
            <p className="font-semibold text-white">No downloads currently active.</p>
            <p className="text-[11px] mt-0.5">Search for games in your Library to grab releases from Prowlarr.</p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-[#2d3238]">
            <table className="w-full text-left border-collapse bg-[#22262a]">
              <thead className="bg-[#16181a] text-[#8c939d] border-b border-[#2d3238]">
                <tr>
                  <th className="p-2.5 border-r border-[#2d3238]">Game Title</th>
                  <th className="p-2.5 border-r border-[#2d3238]">Release Name</th>
                  <th className="p-2.5 border-r border-[#2d3238] w-24">Region</th>
                  <th className="p-2.5 border-r border-[#2d3238] w-28">Status</th>
                  <th className="p-2.5 border-r border-[#2d3238] w-56">Progress &amp; Speed</th>
                  <th className="p-2.5 border-r border-[#2d3238] w-20">Size</th>
                  <th className="p-2.5 border-r border-[#2d3238] w-24">Indexer</th>
                  <th className="p-2.5 w-16 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2d3238]">
                {activeItems.map((item) => (
                  <tr key={item.id} className="hover:bg-[#1a1d20]">
                    <td className="p-2.5 border-r border-[#2d3238] font-bold text-white">
                      <div className="flex items-center gap-2">
                        {item.cover_url && (
                          <img src={item.cover_url} alt="" className="w-6 h-8 object-cover border border-[#2d3238] shrink-0" />
                        )}
                        <span>{item.game_title}</span>
                      </div>
                    </td>
                    <td className="p-2.5 border-r border-[#2d3238] text-[#8c939d] truncate max-w-xs" title={item.release_title}>
                      {item.release_title}
                    </td>
                    <td className="p-2.5 border-r border-[#2d3238]">
                      <span className="bg-[#16181a] border border-[#2d3238] text-[#5bc0de] px-1.5 py-0.5 font-semibold text-[10px]">
                        {item.region || 'USA'}
                      </span>
                    </td>
                    <td className="p-2.5 border-r border-[#2d3238]">
                      {renderStatusBadge(item.status)}
                    </td>
                    <td className="p-2.5 border-r border-[#2d3238]">
                      {renderProgressBar(item)}
                    </td>
                    <td className="p-2.5 border-r border-[#2d3238] font-mono text-[#8c939d]">
                      {formatBytes(item.size_bytes)}
                    </td>
                    <td className="p-2.5 border-r border-[#2d3238] text-[#8c939d]">
                      {item.indexer || 'Prowlarr'}
                    </td>
                    <td className="p-2.5 text-center">
                      <button
                        onClick={() => handleCancel(item.id)}
                        className="bg-[#d9534f] hover:bg-[#c9302c] text-white px-2 py-1 text-xs font-bold border border-[#d43f3a]"
                        title="Cancel download and remove task"
                      >
                        Cancel
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Completed & Organized Downloads Table */}
      {completedItems.length > 0 && (
        <div className="space-y-2 pt-4">
          <h2 className="text-sm font-bold text-[#e6e6e6] uppercase flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#5cb85c]" />
            <span>Completed &amp; Organized in Library ({completedItems.length})</span>
          </h2>

          <div className="overflow-x-auto border border-[#2d3238]">
            <table className="w-full text-left border-collapse bg-[#22262a]">
              <thead className="bg-[#16181a] text-[#8c939d] border-b border-[#2d3238]">
                <tr>
                  <th className="p-2.5 border-r border-[#2d3238]">Game Title</th>
                  <th className="p-2.5 border-r border-[#2d3238]">Release Title</th>
                  <th className="p-2.5 border-r border-[#2d3238] w-24">Region</th>
                  <th className="p-2.5 border-r border-[#2d3238] w-24">Size</th>
                  <th className="p-2.5 border-r border-[#2d3238] w-28">Status</th>
                  <th className="p-2.5 border-r border-[#2d3238] w-36">Completed</th>
                  <th className="p-2.5 w-24 text-center">Download</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2d3238]">
                {completedItems.map((item) => (
                  <tr key={item.id} className="hover:bg-[#1a1d20]">
                    <td className="p-2.5 border-r border-[#2d3238] font-bold text-white">{item.game_title}</td>
                    <td className="p-2.5 border-r border-[#2d3238] text-[#8c939d] truncate max-w-sm" title={item.release_title}>
                      {item.release_title}
                    </td>
                    <td className="p-2.5 border-r border-[#2d3238] text-[#5bc0de] font-semibold">{item.region}</td>
                    <td className="p-2.5 border-r border-[#2d3238] font-mono text-[#8c939d]">
                      {formatBytes(item.size_bytes)}
                    </td>
                    <td className="p-2.5 border-r border-[#2d3238]">
                      <span className="bg-[#3c763d] text-[#dff0d8] px-2 py-0.5 text-[10px] font-bold border border-[#2b542c] inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        ORGANIZED
                      </span>
                    </td>
                    <td className="p-2.5 border-r border-[#2d3238] text-[#8c939d]">
                      {item.completed_at ? new Date(item.completed_at).toLocaleString() : 'Recently'}
                    </td>
                    <td className="p-2.5 text-center">
                      {item.game_id && (
                        <a
                          href={api.getGameDownloadUrl(item.game_id)}
                          download
                          className="bg-[#22262a] hover:bg-[#2d3238] text-white px-2.5 py-1 border border-[#2d3238] text-[11px] inline-flex items-center gap-1 font-semibold"
                        >
                          <Download className="w-3 h-3" />
                          <span>ROM</span>
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
