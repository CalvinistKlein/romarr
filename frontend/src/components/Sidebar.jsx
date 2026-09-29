import React from 'react';
import { Gamepad2, Library, DownloadCloud, Layers, Settings, Sparkles, FolderArchive } from 'lucide-react';

export default function Sidebar({ currentTab, setCurrentTab, queueCount = 0 }) {
  const navItems = [
    { id: 'library', label: 'Library', icon: Library },
    { id: 'queue', label: 'Activity / Queue', icon: DownloadCloud, badge: queueCount },
    { id: 'platforms', label: 'Consoles & Systems', icon: Layers },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-dark-900 border-r border-dark-800 flex flex-col shrink-0">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 gap-3 border-b border-dark-800">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <Gamepad2 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-lg text-white tracking-wider flex items-center gap-1.5">
            ROMARR
            <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-400 border border-brand-500/30">
              BETA
            </span>
          </h1>
          <p className="text-xs text-slate-400">Game & ISO Manager</p>
        </div>
      </div>

      {/* Navigation items */}
      <nav className="p-4 space-y-1.5 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-dark-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge > 0 && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  isActive ? 'bg-white text-brand-600' : 'bg-brand-500 text-white animate-pulse'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer / System Flavor status */}
      <div className="p-4 border-t border-dark-800">
        <div className="bg-dark-850 p-3 rounded-xl border border-dark-700/50">
          <div className="flex items-center gap-2 text-xs text-slate-300 font-medium mb-1">
            <FolderArchive className="w-4 h-4 text-cyan-400" />
            <span>Target Structure</span>
          </div>
          <p className="text-[11px] text-slate-400 truncate">
            Batocera / RetroPie Native
          </p>
        </div>
      </div>
    </aside>
  );
}
