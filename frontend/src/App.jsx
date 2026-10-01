import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import LibraryPage from './pages/LibraryPage';
import QueuePage from './pages/QueuePage';
import PlatformsPage from './pages/PlatformsPage';
import SettingsPage from './pages/SettingsPage';
import ImportPage from './pages/ImportPage';
import AddGameModal from './components/AddGameModal';
import ReleaseModal from './components/ReleaseModal';
import CoverArtModal from './components/CoverArtModal';
import GameDetailPage from './pages/GameDetailPage';
import { api } from './services/api';

export default function App() {
  const [currentTab, setCurrentTab] = useState('library');
  const [games, setGames] = useState([]);
  const [queue, setQueue] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [systemStatus, setSystemStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals & Navigation
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedGameForReleases, setSelectedGameForReleases] = useState(null);
  const [selectedGameForCover, setSelectedGameForCover] = useState(null);
  const [selectedGameDetailId, setSelectedGameDetailId] = useState(null);

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

  const activeQueueItems = queue.filter(q => q.status !== 'completed');
  const activeSpeed = activeQueueItems.reduce((acc, curr) => acc + (curr.download_speed || 0), 0);

  return (
    <div className="min-h-screen bg-[#1a1d20] text-[#e6e6e6] flex flex-col font-sans">
      {/* 2015 Classic Flat Top Navbar */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        queueCount={activeQueueItems.length}
        activeSpeed={activeSpeed}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        systemStatus={systemStatus}
        onRefresh={handleManualRefresh}
        isRefreshing={isRefreshing}
      />

      {/* Main Page Content */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-3 sm:p-4 md:p-6 pb-20 md:pb-6">
        {currentTab === 'library' && (
          <LibraryPage
            games={games}
            platforms={platforms}
            queue={queue}
            onOpenAddModal={() => setIsAddModalOpen(true)}
            onOpenReleases={(game) => setSelectedGameForReleases(game)}
            onOpenCoverModal={(game) => setSelectedGameForCover(game)}
            onSelectGame={(game) => {
              setSelectedGameDetailId(game.id);
              setCurrentTab('game-detail');
            }}
            onDeleteGame={handleDeleteGame}
            loading={loading}
          />
        )}

        {currentTab === 'game-detail' && selectedGameDetailId && (
          <GameDetailPage
            gameId={selectedGameDetailId}
            queue={queue}
            platforms={platforms}
            onBack={() => {
              setSelectedGameDetailId(null);
              setCurrentTab('library');
              fetchGames();
            }}
            onOpenReleases={(game) => setSelectedGameForReleases(game)}
            onOpenCoverModal={(game) => setSelectedGameForCover(game)}
            onDeleteGame={handleDeleteGame}
            onGameUpdated={(updatedGame) => {
              setGames(prev => prev.map(g => (g.id === updatedGame.id ? updatedGame : g)));
            }}
          />
        )}

        {currentTab === 'import' && (
          <ImportPage
            onNavigateToLibrary={() => {
              setCurrentTab('library');
              fetchGames();
              fetchPlatforms();
            }}
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
      <footer className="hidden md:flex bg-[#111315] border-t border-[#2d3238] px-4 py-2 text-[11px] text-[#8c939d] items-center justify-between">
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
          queue={queue}
          onClose={() => setSelectedGameForReleases(null)}
          onReleaseGrabbed={() => {
            fetchQueue();
            fetchGames();
          }}
        />
      )}

      {selectedGameForCover && (
        <CoverArtModal
          game={selectedGameForCover}
          isOpen={!!selectedGameForCover}
          onClose={() => setSelectedGameForCover(null)}
          onCoverUpdated={(updatedGame) => {
            setGames(prev => prev.map(g => (g.id === updatedGame.id ? updatedGame : g)));
            setSelectedGameForCover(updatedGame);
          }}
        />
      )}
    </div>
  );
}
