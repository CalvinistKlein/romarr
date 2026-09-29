import React from 'react';
import { DownloadCloud, Trash2, CheckCircle2 } from 'lucide-react';
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
    if (!bytesPerSec) return '0 KB/s';
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

  return (
    <div className="space-y-6">
      <div className="pb-3 border-b border-[#2d3238]">
        <h1 className="text-xl font-bold text-white">Activity & Download Queue</h1>
        <p className="text-xs text-[#8c939d]">
          qBittorrent active downloads and post-processor organization status
        </p>
      </div>

      {/* Active Tasks */}
      <div className="space-y-2">
        <h2 className="text-sm font-bold text-[#e6e6e6] uppercase">
          Active Downloads ({activeItems.length})
        </h2>

        {activeItems.length === 0 ? (
          <div className="bg-[#22262a] border border-[#2d3238] p-4 text-center text-[#8c939d] text-xs">
            No active downloads.
          </div>
        ) : (
          <table className="w-full text-left border-collapse border border-[#2d3238] text-xs">
            <thead className="bg-[#16181a] text-[#8c939d] border-b border-[#2d3238]">
              <tr>
                <th className="p-2 border-r border-[#2d3238]">Game Title</th>
                <th className="p-2 border-r border-[#2d3238]">Release File</th>
                <th className="p-2 border-r border-[#2d3238] w-24">Region</th>
                <th className="p-2 border-r border-[#2d3238] w-48">Progress</th>
                <th className="p-2 border-r border-[#2d3238] w-24">Speed</th>
                <th className="p-2 border-r border-[#2d3238] w-20">ETA</th>
                <th className="p-2 border-r border-[#2d3238] w-20">Size</th>
                <th className="p-2 w-16 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2d3238]">
              {activeItems.map((item) => (
                <tr key={item.id} className="bg-[#22262a]">
                  <td className="p-2 border-r border-[#2d3238] font-bold text-white">{item.game_title}</td>
                  <td className="p-2 border-r border-[#2d3238] text-[#8c939d] truncate max-w-xs">{item.release_title}</td>
                  <td className="p-2 border-r border-[#2d3238] font-semibold text-[#337ab7]">{item.region}</td>
                  <td className="p-2 border-r border-[#2d3238]">
                    <div className="w-full bg-[#16181a] border border-[#2d3238] h-4 relative">
                      <div
                        className="bg-[#337ab7] h-full transition-all duration-300"
                        style={{ width: `${item.progress}%` }}
                      />
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">
                        {item.progress}%
                      </span>
                    </div>
                  </td>
                  <td className="p-2 border-r border-[#2d3238]">{formatSpeed(item.download_speed)}</td>
                  <td className="p-2 border-r border-[#2d3238]">{formatEta(item.eta_seconds)}</td>
                  <td className="p-2 border-r border-[#2d3238]">{formatBytes(item.size_bytes)}</td>
                  <td className="p-2 text-center">
                    <button
                      onClick={() => handleCancel(item.id)}
                      className="bg-[#d9534f] hover:bg-[#c9302c] text-white px-2 py-0.5 text-xs font-bold border border-[#d43f3a]"
                    >
                      Cancel
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* History Table */}
      {completedItems.length > 0 && (
        <div className="space-y-2 pt-4">
          <h2 className="text-sm font-bold text-[#e6e6e6] uppercase">
            Completed & Organized ({completedItems.length})
          </h2>

          <table className="w-full text-left border-collapse border border-[#2d3238] text-xs">
            <thead className="bg-[#16181a] text-[#8c939d] border-b border-[#2d3238]">
              <tr>
                <th className="p-2 border-r border-[#2d3238]">Game</th>
                <th className="p-2 border-r border-[#2d3238]">Release Title</th>
                <th className="p-2 border-r border-[#2d3238] w-24">Region</th>
                <th className="p-2 border-r border-[#2d3238] w-28">Status</th>
                <th className="p-2 w-32">Completed Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2d3238]">
              {completedItems.map((item) => (
                <tr key={item.id} className="bg-[#22262a]">
                  <td className="p-2 border-r border-[#2d3238] font-bold text-white">{item.game_title}</td>
                  <td className="p-2 border-r border-[#2d3238] text-[#8c939d] truncate max-w-sm">{item.release_title}</td>
                  <td className="p-2 border-r border-[#2d3238] text-[#337ab7] font-semibold">{item.region}</td>
                  <td className="p-2 border-r border-[#2d3238]">
                    <span className="bg-[#3c763d] text-[#dff0d8] px-1.5 py-0.5 text-[10px] font-bold border border-[#2b542c]">
                      ORGANIZED
                    </span>
                  </td>
                  <td className="p-2 text-[#8c939d]">
                    {item.completed_at ? new Date(item.completed_at).toLocaleTimeString() : 'Recently'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
