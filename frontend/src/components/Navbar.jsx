import React from 'react';
import {
  Plus,
  RefreshCw,
  HardDrive,
  Gamepad2,
  DownloadCloud,
  Library,
  Layers,
  Settings,
  UploadCloud,
  ArrowDown
} from 'lucide-react';

export default function Navbar({
  currentTab,
  setCurrentTab,
  queueCount = 0,
  activeSpeed = 0,
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

  const formatSpeed = (bytesPerSec) => {
    if (!bytesPerSec || bytesPerSec <= 0) return '';
    if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
    return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
  };

  const navLinks = [
    { id: 'library', label: 'Library', icon: Library },
    { id: 'import', label: 'Import', icon: UploadCloud },
    { id: 'queue', label: 'Activity', icon: DownloadCloud, count: queueCount },
    { id: 'platforms', label: 'Consoles', icon: Layers },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Top Navbar */}
      <header className="bg-[#111315] border-b border-[#2d3238] px-3 sm:px-4 h-12 flex items-center justify-between shrink-0 select-none text-xs sticky top-0 z-40">
        {/* Brand & Desktop Nav Links */}
        <div className="flex items-center gap-4 lg:gap-6">
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => setCurrentTab('library')}
            title="Romarr Home"
          >
            <div className="bg-[#337ab7] text-white p-1 rounded-sm">
              <Gamepad2 className="w-4 h-4" />
            </div>
            <span className="font-bold text-sm tracking-wider text-white">ROMARR</span>
          </div>

          {/* Desktop 2015 Tab Nav Links (hidden on mobile, visible md+) */}
          <nav className="hidden md:flex items-center h-12">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id || (currentTab === 'game-detail' && item.id === 'library');
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentTab(item.id)}
                  className={`h-12 px-3 lg:px-3.5 flex items-center gap-1.5 lg:gap-2 font-medium border-b-2 transition-none ${
                    isActive
                      ? 'bg-[#1a1d20] text-white border-[#337ab7]'
                      : 'text-[#8c939d] hover:text-[#e6e6e6] hover:bg-[#16181a] border-transparent'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                  {item.count > 0 && (
                    <span className="bg-[#337ab7] text-white text-[10px] font-bold px-1.5 py-0.2 rounded-sm flex items-center gap-1">
                      <span>{item.count}</span>
                      {activeSpeed > 0 && item.id === 'queue' && (
                        <span className="hidden lg:inline font-mono text-[9px] text-[#bce8f1]">
                          ({formatSpeed(activeSpeed)})
                        </span>
                      )}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {activeSpeed > 0 && (
            <div className="flex items-center gap-1 bg-[#16181a] border border-[#204d74] px-2 py-0.5 sm:px-2.5 sm:py-1 text-[#5bc0de] font-mono text-[10px] sm:text-[11px] rounded-sm animate-pulse">
              <ArrowDown className="w-3 h-3 text-[#5bc0de]" />
              <span>{formatSpeed(activeSpeed)}</span>
            </div>
          )}

          {systemStatus && systemStatus.disk_total_bytes > 0 && (
            <div className="text-[#8c939d] hidden lg:flex items-center gap-1.5 bg-[#16181a] border border-[#2d3238] px-2.5 py-1 rounded-sm">
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
            className="bg-[#337ab7] hover:bg-[#286090] text-white font-semibold px-2.5 sm:px-3 py-1.5 rounded-sm flex items-center gap-1 sm:gap-1.5 border border-[#2e6da4]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="inline">Add Game</span>
          </button>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (visible only on mobile screens < md) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-[#111315] border-t border-[#2d3238] h-14 flex items-center justify-around z-50 select-none shadow-2xl">
        {navLinks.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id || (currentTab === 'game-detail' && item.id === 'library');
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`flex-1 flex flex-col items-center justify-center h-full gap-0.5 relative transition-none ${
                isActive ? 'text-[#5bc0de] bg-[#1a1d20]' : 'text-[#8c939d] hover:text-[#e6e6e6]'
              }`}
            >
              <div className="relative">
                <Icon className="w-4 h-4" />
                {item.count > 0 && (
                  <span className="absolute -top-1 -right-2.5 bg-[#337ab7] text-white text-[9px] font-bold px-1 rounded-full border border-[#111315]">
                    {item.count}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium tracking-tight">{item.label}</span>
              {isActive && (
                <div className="absolute top-0 inset-x-0 h-0.5 bg-[#337ab7]" />
              )}
            </button>
          );
        })}
      </nav>
    </>
  );
}
