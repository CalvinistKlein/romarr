import React, { useState, useEffect } from 'react';
import { X, Search, Download, Check, Globe } from 'lucide-react';
import { api } from '../services/api';

const REGION_BUTTONS = [
  { id: 'ALL', label: 'All Regions', flag: '🌐' },
  { id: 'USA', label: 'USA / North America', flag: '🇺🇸' },
  { id: 'EUR', label: 'Europe / PAL', flag: '🇪🇺' },
  { id: 'JPN', label: 'Japan / NTSC-J', flag: '🇯🇵' },
  { id: 'WORLD', label: 'World / Global', flag: '🌍' },
  { id: 'TRANSLATION', label: 'Translations', flag: '🈳' },
];

export default function ReleaseModal({ game, onClose, onReleaseGrabbed }) {
  const [releases, setReleases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState('ALL');
  const [sortBy, setSortBy] = useState('score');
  const [grabbedMap, setGrabbedMap] = useState({});

  const fetchReleases = async (regionFilter) => {
    setLoading(true);
    try {
      const data = await api.getReleases(game.id, regionFilter);
      setReleases(data.releases || []);
    } catch (err) {
      console.error('Failed to fetch releases:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (game) {
      fetchReleases(selectedRegion);
    }
  }, [game, selectedRegion]);

  const handleGrab = async (release) => {
    try {
      setGrabbedMap(prev => ({ ...prev, [release.title]: 'grabbing' }));
      await api.grabRelease({
        game_id: game.id,
        release_title: release.title,
        download_url: release.download_url,
        info_hash: release.info_hash,
        size_bytes: release.size_bytes,
        indexer: release.indexer
      });
      setGrabbedMap(prev => ({ ...prev, [release.title]: 'grabbed' }));
      if (onReleaseGrabbed) onReleaseGrabbed();
    } catch (err) {
      console.error('Failed to grab release:', err);
      setGrabbedMap(prev => ({ ...prev, [release.title]: 'error' }));
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const sortedReleases = [...releases].sort((a, b) => {
    if (sortBy === 'seeders') return (b.seeders || 0) - (a.seeders || 0);
    if (sortBy === 'size') return (b.size_bytes || 0) - (a.size_bytes || 0);
    if (sortBy === 'region') return (a.parsed?.region || '').localeCompare(b.parsed?.region || '');
    return (b.score || 0) - (a.score || 0);
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-[#22262a] border border-[#2d3238] w-full max-w-5xl flex flex-col max-h-[90vh]">
        {/* Flat Modal Header */}
        <div className="p-3 bg-[#111315] border-b border-[#2d3238] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold text-white">
              Search Releases: <span className="text-[#337ab7]">{game.title}</span> ({game.platform_name})
            </h2>
            <span className="text-[11px] text-[#8c939d]">
              Preferred Region: <strong>{game.preferred_region}</strong>
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-[#8c939d] hover:text-white bg-[#1a1d20] border border-[#2d3238] p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Flat 2015 Region Filter Button Group & Sort Bar */}
        <div className="p-2.5 bg-[#1a1d20] border-b border-[#2d3238] flex flex-wrap items-center justify-between gap-2">
          {/* Region Button Group */}
          <div className="inline-flex border border-[#2d3238] rounded-none">
            {REGION_BUTTONS.map((btn) => {
              const isActive = selectedRegion === btn.id;
              return (
                <button
                  key={btn.id}
                  onClick={() => setSelectedRegion(btn.id)}
                  className={`px-3 py-1.5 text-xs font-semibold border-r border-[#2d3238] last:border-r-0 ${
                    isActive
                      ? 'bg-[#337ab7] text-white'
                      : 'bg-[#16181a] text-[#8c939d] hover:text-[#e6e6e6] hover:bg-[#22262a]'
                  }`}
                >
                  <span className="mr-1">{btn.flag}</span>
                  <span>{btn.label}</span>
                </button>
              );
            })}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-[#8c939d]">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-[#16181a] border border-[#2d3238] text-[#e6e6e6] px-2 py-1 text-xs focus:outline-none"
            >
              <option value="score">Recommended (Region Match & Health)</option>
              <option value="seeders">Seeders (High to Low)</option>
              <option value="size">File Size (Largest First)</option>
              <option value="region">Region Code (A-Z)</option>
            </select>
          </div>
        </div>

        {/* 2015 Data Table */}
        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="py-16 text-center text-[#8c939d]">
              <Search className="w-6 h-6 text-[#337ab7] animate-spin mx-auto mb-2" />
              <p>Querying indexers for releases...</p>
            </div>
          ) : sortedReleases.length === 0 ? (
            <div className="py-12 text-center text-[#8c939d]">
              <p className="font-bold text-[#e6e6e6]">No releases found for this region filter.</p>
              <p className="text-[11px] mt-1">Switch to 'All Regions' or verify Prowlarr indexer configuration.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse border border-[#2d3238] text-xs">
              <thead className="bg-[#16181a] text-[#8c939d] border-b border-[#2d3238]">
                <tr>
                  <th className="p-2 border-r border-[#2d3238] w-24">Region</th>
                  <th className="p-2 border-r border-[#2d3238] w-16">Format</th>
                  <th className="p-2 border-r border-[#2d3238]">Release Title</th>
                  <th className="p-2 border-r border-[#2d3238] w-28">Indexer</th>
                  <th className="p-2 border-r border-[#2d3238] w-20">Size</th>
                  <th className="p-2 border-r border-[#2d3238] w-20">Peers (S/L)</th>
                  <th className="p-2 w-28 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2d3238]">
                {sortedReleases.map((rel, idx) => {
                  const parsed = rel.parsed || {};
                  const state = grabbedMap[rel.title];

                  return (
                    <tr key={idx} className="hover:bg-[#1a1d20] bg-[#22262a]">
                      <td className="p-2 border-r border-[#2d3238]">
                        <span className={`px-1.5 py-0.5 text-[10px] font-bold border ${
                          parsed.region === 'USA' ? 'bg-[#204d74] text-[#bce8f1] border-[#337ab7]' :
                          parsed.region === 'EUR' ? 'bg-[#66512c] text-[#faebcc] border-[#8a6d3b]' :
                          parsed.region === 'JPN' ? 'bg-[#6b2424] text-[#ebccd1] border-[#a94442]' :
                          parsed.region === 'TRANSLATION' ? 'bg-[#255625] text-[#d6e9c6] border-[#3c763d]' :
                          'bg-[#3e444c] text-[#d9d9d9] border-[#4e555b]'
                        }`}>
                          {parsed.region_flag} {parsed.region}
                        </span>
                      </td>
                      <td className="p-2 border-r border-[#2d3238] font-bold text-[#e6e6e6]">
                        {parsed.format || 'ROM'}
                      </td>
                      <td className="p-2 border-r border-[#2d3238]">
                        <div className="font-semibold text-white">{rel.title}</div>
                        {parsed.revision && <span className="text-[#f0ad4e] text-[10px] mr-2">[{parsed.revision}]</span>}
                        {parsed.disc && <span className="text-[#5bc0de] text-[10px]">[{parsed.disc}]</span>}
                      </td>
                      <td className="p-2 border-r border-[#2d3238] text-[#8c939d]">{rel.indexer || 'Prowlarr'}</td>
                      <td className="p-2 border-r border-[#2d3238]">{formatBytes(rel.size_bytes)}</td>
                      <td className="p-2 border-r border-[#2d3238]">
                        <span className="text-[#5cb85c] font-bold">{rel.seeders || 0}</span> / <span className="text-[#8c939d]">{rel.leechers || 0}</span>
                      </td>
                      <td className="p-2 text-center">
                        <button
                          onClick={() => handleGrab(rel)}
                          disabled={state === 'grabbing' || state === 'grabbed'}
                          className={`w-full py-1 text-[11px] font-bold border ${
                            state === 'grabbed'
                              ? 'bg-[#3c763d] text-[#dff0d8] border-[#2b542c]'
                              : state === 'grabbing'
                              ? 'bg-[#204d74] text-white border-[#337ab7]'
                              : 'bg-[#5cb85c] hover:bg-[#449d44] text-white border-[#4cae4c]'
                          }`}
                        >
                          {state === 'grabbed' ? '✓ Queued' : state === 'grabbing' ? 'Grabbing...' : 'Download'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Flat Modal Footer */}
        <div className="p-2.5 bg-[#111315] border-t border-[#2d3238] flex items-center justify-between text-xs">
          <span className="text-[#8c939d]">Total results: {releases.length}</span>
          <button
            onClick={onClose}
            className="bg-[#22262a] hover:bg-[#2d3238] text-[#e6e6e6] border border-[#2d3238] px-3 py-1 text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
