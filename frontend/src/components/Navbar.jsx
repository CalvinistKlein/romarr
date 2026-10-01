import React from 'react';
import { Plus, RefreshCw, HardDrive, Gamepad2, DownloadCloud, Library, Layers, Settings, UploadCloud } from 'lucide-react';

export default function Navbar({
  currentTab,
  setCurrentTab,
  queueCount = 0,
  onOpenAddModal,
  systemStatus,
  onRefresh,
  isRefreshing
}) {
  const formatBytes = (bytes) => {
    if (!bytes) return '0 GB';
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(1)} GB`;
  };

  const navLinks = [
    { id: 'library', label: 'Library', icon: Library },
    { id: 'import', label: 'Import', icon: UploadCloud },
    { id: 'queue', label: 'Activity', icon: DownloadCloud, count: queueCount },
    { id: 'platforms', label: 'Consoles', icon: Layers },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <header className="bg-[#111315] border-b border-[#2d3238] px-4 h-12 flex items-center justify-between shrink-0 select-none text-xs">
      {/* Brand & Main Nav */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentTab('library')}>
          <div className="bg-[#337ab7] text-white p-1 rounded-sm">
            <Gamepad2 className="w-4 h-4" />
          </div>
          <span className="font-bold text-sm tracking-wider text-white">ROMARR</span>
        </div>

        {/* 2015 Tab Nav Links */}
        <nav className="flex items-center h-12">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`h-12 px-3.5 flex items-center gap-2 font-medium border-b-2 transition-none ${
                  isActive
                    ? 'bg-[#1a1d20] text-white border-[#337ab7]'
                    : 'text-[#8c939d] hover:text-[#e6e6e6] hover:bg-[#16181a] border-transparent'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
                {item.count > 0 && (
                  <span className="bg-[#337ab7] text-white text-[10px] font-bold px-1.5 py-0.2 rounded-sm">
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {systemStatus && systemStatus.disk_total_bytes > 0 && (
          <div className="text-[#8c939d] hidden md:flex items-center gap-1.5 bg-[#16181a] border border-[#2d3238] px-2.5 py-1 rounded-sm">
            <HardDrive className="w-3.5 h-3.5 text-[#5bc0de]" />
            <span>Disk Free: <strong className="text-[#5cb85c]">{formatBytes(systemStatus.disk_free_bytes)}</strong></span>
          </div>
        )}

        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Refresh"
          className="bg-[#22262a] hover:bg-[#2d3238] text-[#e6e6e6] border border-[#2d3238] p-1.5 rounded-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#337ab7]' : ''}`} />
        </button>

        <button
          onClick={onOpenAddModal}
          className="bg-[#337ab7] hover:bg-[#286090] text-white font-semibold px-3 py-1.5 rounded-sm flex items-center gap-1.5 border border-[#2e6da4]"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Game</span>
        </button>
      </div>
    </header>
  );
}
