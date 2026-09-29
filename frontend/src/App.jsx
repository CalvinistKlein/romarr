import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import LibraryPage from './pages/LibraryPage';
import QueuePage from './pages/QueuePage';
import PlatformsPage from './pages/PlatformsPage';
import SettingsPage from './pages/SettingsPage';
import AddGameModal from './components/AddGameModal';
import ReleaseModal from './components/ReleaseModal';
import { api } from './services/api';

export default function App() {
  const [currentTab, setCurrentTab] = useState('library');
  const [games, setGames] = useState([]);
  const [queue, setQueue] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [systemStatus, setSystemStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedGameForReleases, setSelectedGameForReleases] = useState(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchQueue();
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    await Promise.all([
      fetchGames(),
      fetchQueue(),
      fetchPlatforms(),
      fetchSystemStatus()
    ]);
    setLoading(false);
  };

  const fetchGames = async () => {
    try {
      const data = await api.getGames();
      setGames(data || []);
    } catch (err) {
      console.error('Failed to load games:', err);
    }
  };

  const fetchQueue = async () => {
    try {
      const data = await api.getQueue();
      setQueue(data || []);
      if (Array.isArray(data) && data.some(d => d.status === 'completed')) {
        fetchGames();
      }
    } catch (err) {
      console.error('Failed to load queue:', err);
    }
  };

  const fetchPlatforms = async () => {
    try {
      const data = await api.getPlatforms();
      setPlatforms(data || []);
    } catch (err) {
      console.error('Failed to load platforms:', err);
    }
  };

  const fetchSystemStatus = async () => {
    try {
      const data = await api.getSystemStatus();
      setSystemStatus(data);
    } catch (err) {
      console.error('Failed to load status:', err);
    }
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchGames(), fetchQueue(), fetchPlatforms(), fetchSystemStatus()]);
    setIsRefreshing(false);
  };

  const handleDeleteGame = async (id) => {
    if (!confirm('Are you sure you want to remove this game from library?')) return;
    try {
      await api.deleteGame(id);
      fetchGames();
      fetchPlatforms();
    } catch (err) {
      console.error('Failed to delete game:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#1a1d20] text-[#e6e6e6] flex flex-col font-sans">
      {/* 2015 Classic Flat Top Navbar */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        queueCount={queue.filter(q => q.status !== 'completed').length}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        systemStatus={systemStatus}
        onRefresh={handleManualRefresh}
        isRefreshing={isRefreshing}
      />

      {/* Main Page Content */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 sm:p-6">
        {currentTab === 'library' && (
          <LibraryPage
            games={games}
            platforms={platforms}
            onOpenAddModal={() => setIsAddModalOpen(true)}
            onOpenReleases={(game) => setSelectedGameForReleases(game)}
            onDeleteGame={handleDeleteGame}
            loading={loading}
          />
        )}

        {currentTab === 'queue' && (
          <QueuePage
            queue={queue}
            onRefresh={fetchQueue}
          />
        )}

        {currentTab === 'platforms' && (
          <PlatformsPage
            platforms={platforms}
          />
        )}

        {currentTab === 'settings' && (
          <SettingsPage />
        )}
      </main>

      {/* 2015 Footer Status Bar */}
      <footer className="bg-[#111315] border-t border-[#2d3238] px-4 py-2 text-[11px] text-[#8c939d] flex items-center justify-between">
        <div>
          Target Storage: <code className="text-[#5bc0de] bg-[#16181a] px-1.5 py-0.5 border border-[#2d3238]">Batocera Native (/roms/&lt;system&gt;)</code>
        </div>
        <div>
          Romarr v1.0.0 &bull; 2015 Flat Edition
        </div>
      </footer>

      {/* Modals */}
      <AddGameModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        platforms={platforms}
        onGameAdded={() => {
          fetchGames();
          fetchPlatforms();
          fetchQueue();
        }}
      />

      {selectedGameForReleases && (
        <ReleaseModal
          game={selectedGameForReleases}
          onClose={() => setSelectedGameForReleases(null)}
          onReleaseGrabbed={() => {
            fetchQueue();
            fetchGames();
          }}
        />
      )}
    </div>
  );
}
