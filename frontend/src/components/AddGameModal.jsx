import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Search,
  Plus,
  Check,
  UploadCloud,
  FolderUp,
  FileArchive,
  File,
  Trash2,
  RefreshCw,
  Archive,
  FolderSync,
  AlertCircle,
  CheckCircle2,
  Layers,
  ArrowRight,
  HardDrive
} from 'lucide-react';
import { api } from '../services/api';

const REGIONS = [
  { id: 'USA', label: 'USA / North America 🇺🇸' },
  { id: 'EUR', label: 'Europe / PAL 🇪🇺' },
  { id: 'JPN', label: 'Japan / NTSC-J 🇯🇵' },
  { id: 'WORLD', label: 'World / Global 🌐' },
  { id: 'TRANSLATION', label: 'English Translation 🈳' },
];

export default function AddGameModal({ isOpen, onClose, onGameAdded, platforms = [] }) {
  const [activeTab, setActiveTab] = useState('search'); // 'search' | 'upload'
  
  // ── Search State ──
  const [query, setQuery] = useState('');
  const [platformId, setPlatformId] = useState('');
  const [preferredRegion, setPreferredRegion] = useState('USA');
  const [autoSearch, setAutoSearch] = useState(true);
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [addingMap, setAddingMap] = useState({});

  // ── Upload & Import State ──
  const [selectedFiles, setSelectedFiles] = useState([]); // { file, relPath, status }
  const [uploadPlatform, setUploadPlatform] = useState('auto');
  const [autoExtract, setAutoExtract] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({
    loaded: 0,
    total: 0,
    percent: 0,
    speed: 0,
    eta: 0,
    state: 'idle', // 'idle' | 'uploading' | 'processing' | 'done'
    stageText: ''
  });
  const [importResult, setImportResult] = useState(null);
  const [uploadError, setUploadError] = useState(null);

  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);
  const zipInputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
      setAddingMap({});
      setSelectedFiles([]);
      setImportResult(null);
      setUploadError(null);
      setUploadProgress({ loaded: 0, total: 0, percent: 0, speed: 0, eta: 0, state: 'idle', stageText: '' });
      return;
    }
    if (activeTab === 'search') {
      handleSearch('Mario');
    }
  }, [isOpen]);

  // ── Search Handlers ──
  const handleSearch = async (searchQuery = query) => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const data = await api.searchCatalog(searchQuery, platformId);
      setResults(data || []);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleAddGame = async (game) => {
    try {
      setAddingMap(prev => ({ ...prev, [game.slug]: 'adding' }));
      await api.addGame({
        title: game.title,
        slug: game.slug,
        platform_id: game.platform_id,
        igdb_id: game.igdb_id,
        summary: game.summary,
        cover_url: game.cover_url,
        banner_url: game.banner_url,
        release_year: game.release_year,
        developer: game.developer,
        publisher: game.publisher,
        genres: game.genres,
        preferred_region: preferredRegion,
        auto_search_on_add: autoSearch
      });
      setAddingMap(prev => ({ ...prev, [game.slug]: 'added' }));
      if (onGameAdded) onGameAdded();
    } catch (err) {
      alert(err.message || 'Failed to add game');
      setAddingMap(prev => ({ ...prev, [game.slug]: 'error' }));
    }
  };

  // ── Upload & File Handlers ──
  const handleFilesAdded = (filesList) => {
    const newItems = [];
    for (let i = 0; i < filesList.length; i++) {
      const file = filesList[i];
      if (file.name.startsWith('.') || file.name === '__MACOSX') continue;
      const relPath = file.webkitRelativePath || file.name;
      newItems.push({ file, relPath, status: 'ready' });
    }
    setSelectedFiles(prev => [...prev, ...newItems]);
    setImportResult(null);
    setUploadError(null);
    setUploadProgress({ loaded: 0, total: 0, percent: 0, speed: 0, eta: 0, state: 'idle', stageText: '' });
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    setUploadError(null);

    const items = e.dataTransfer.items;
    if (items && items.length > 0) {
      const filesFound = [];
      const readEntry = async (entry, currentPath = '') => {
        if (entry.isFile) {
          return new Promise((resolve) => {
            entry.file((file) => {
              const fullRel = currentPath ? `${currentPath}/${file.name}` : file.name;
              filesFound.push({ file, relPath: fullRel, status: 'ready' });
              resolve();
            }, () => resolve());
          });
        } else if (entry.isDirectory) {
          const dirReader = entry.createReader();
          const nextPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
          return new Promise((resolve) => {
            const readEntriesBatch = () => {
              dirReader.readEntries(async (entries) => {
                if (entries.length === 0) {
                  resolve();
                } else {
                  for (const subEntry of entries) {
                    await readEntry(subEntry, nextPath);
                  }
                  readEntriesBatch();
                }
              }, () => resolve());
            };
            readEntriesBatch();
          });
        }
      };

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.webkitGetAsEntry) {
          const entry = item.webkitGetAsEntry();
          if (entry) await readEntry(entry);
        } else if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) filesFound.push({ file, relPath: file.name, status: 'ready' });
        }
      }

      if (filesFound.length > 0) {
        setSelectedFiles(prev => [...prev, ...filesFound]);
        setActiveTab('upload');
      }
    } else if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesAdded(e.dataTransfer.files);
      setActiveTab('upload');
    }
  };

  const handleStartUpload = async () => {
    if (selectedFiles.length === 0) return;
    setIsUploading(true);
    setUploadError(null);
    setImportResult(null);

    const totalBytes = selectedFiles.reduce((acc, curr) => acc + curr.file.size, 0);

    setUploadProgress({
      loaded: 0,
      total: totalBytes,
      percent: 0,
      speed: 0,
      eta: 0,
      state: 'uploading',
      stageText: 'Uploading ROM files to server...'
    });

    const formData = new FormData();
    const pathsArray = [];

    selectedFiles.forEach((item) => {
      formData.append('files', item.file);
      pathsArray.push(item.relPath);
    });

    formData.append('paths', JSON.stringify(pathsArray));
    formData.append('auto_extract', autoExtract ? 'true' : 'false');
    if (uploadPlatform && uploadPlatform !== 'auto') {
      formData.append('platform_id', uploadPlatform);
    }

    try {
      const result = await api.uploadRoms(formData, (prog) => {
        setUploadProgress({
          loaded: prog.loaded,
          total: prog.total,
          percent: prog.percent,
          speed: prog.speed,
          eta: prog.eta,
          state: prog.percent >= 100 ? 'processing' : 'uploading',
          stageText: prog.percent >= 100
            ? 'Unpacking archives, detecting consoles & organizing library on server...'
            : `Uploading files (${prog.percent}%)...`
        });
      });

      setImportResult(result);
      setUploadProgress(prev => ({
        ...prev,
        percent: 100,
        state: 'done',
        stageText: 'Import complete!'
      }));
      setSelectedFiles([]);
      if (onGameAdded) onGameAdded();
    } catch (err) {
      setUploadError(err.message || 'Import failed. Check server logs.');
      setUploadProgress(prev => ({ ...prev, state: 'idle', stageText: '' }));
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const formatSpeed = (bytesPerSec) => {
    if (!bytesPerSec || bytesPerSec <= 0) return '0 KB/s';
    if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
    return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
  };

  const formatEta = (seconds) => {
    if (!seconds || seconds <= 0) return '0s';
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-2 sm:p-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
        onDrop={handleDrop}
        className={`bg-[#22262a] border ${
          isDragging ? 'border-[#337ab7] ring-2 ring-[#337ab7]' : 'border-[#2d3238]'
        } w-full max-w-4xl flex flex-col max-h-[92vh] text-xs shadow-2xl`}
      >
        {/* Modal Header */}
        <div className="p-3 bg-[#111315] border-b border-[#2d3238] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#337ab7]" />
              <span>Add Game &bull; Search Indexers or Upload ROMs</span>
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-[#8c939d] hover:text-white bg-[#1a1d20] border border-[#2d3238] p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Navigation Tabs */}
        <div className="flex items-center border-b border-[#2d3238] bg-[#16181a] px-3 pt-2 gap-1 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('search')}
            className={`px-4 py-2 font-bold border-t-2 flex items-center gap-1.5 ${
              activeTab === 'search'
                ? 'bg-[#22262a] text-white border-[#337ab7] border-b-transparent border-x border-[#2d3238]'
                : 'text-[#8c939d] hover:text-white border-transparent'
            }`}
          >
            <Search className="w-3.5 h-3.5 text-[#337ab7]" />
            <span>Search &amp; Add by Title</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-2 font-bold border-t-2 flex items-center gap-1.5 ${
              activeTab === 'upload'
                ? 'bg-[#22262a] text-white border-[#337ab7] border-b-transparent border-x border-[#2d3238]'
                : 'text-[#8c939d] hover:text-white border-transparent'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5 text-[#5bc0de]" />
            <span>Upload &amp; Import ROMs</span>
            {selectedFiles.length > 0 && (
              <span className="bg-[#337ab7] text-white text-[10px] px-1.5 rounded-full font-bold">
                {selectedFiles.length}
              </span>
            )}
          </button>
        </div>

        {/* ── TAB 1: SEARCH & INDEXERS ── */}
        {activeTab === 'search' && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Quick Upload Bar Strip inside Search Window */}
            <div className="bg-[#1b1e21] border-b border-[#2d3238] p-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-[#8c939d] text-[11px] truncate">
                <UploadCloud className="w-4 h-4 text-[#5bc0de] shrink-0" />
                <span className="truncate">Have existing ROM files or archives (.zip, .chd, .iso)?</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => { setActiveTab('upload'); fileInputRef.current?.click(); }}
                  className="bg-[#22262a] hover:bg-[#2d3238] text-white px-2.5 py-1 text-[11px] font-semibold border border-[#2d3238] flex items-center gap-1"
                >
                  <File className="w-3 h-3 text-[#5bc0de]" />
                  <span>Choose File</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab('upload'); folderInputRef.current?.click(); }}
                  className="bg-[#22262a] hover:bg-[#2d3238] text-white px-2.5 py-1 text-[11px] font-semibold border border-[#2d3238] flex items-center gap-1"
                >
                  <FolderUp className="w-3 h-3 text-[#f0ad4e]" />
                  <span>Choose Folder</span>
                </button>
              </div>
            </div>

            {/* 2015 Flat Form Toolbar */}
            <div className="p-3 bg-[#1a1d20] border-b border-[#2d3238] space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search game title (e.g. Chrono Trigger, Metroid, Shadow of the Colossus)..."
                  className="flex-1 bg-[#16181a] border border-[#2d3238] text-white text-xs px-3 py-1.5 focus:outline-none focus:border-[#337ab7]"
                />
                <button
                  onClick={() => handleSearch()}
                  disabled={searching}
                  className="bg-[#337ab7] hover:bg-[#286090] text-white px-4 py-1.5 text-xs font-bold border border-[#2e6da4] flex items-center gap-1.5"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>{searching ? 'Searching...' : 'Search'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-[#8c939d] mb-1 font-semibold">Console Filter:</label>
                  <select
                    value={platformId}
                    onChange={(e) => setPlatformId(e.target.value)}
                    className="w-full bg-[#16181a] border border-[#2d3238] text-white px-2 py-1 text-xs focus:outline-none"
                  >
                    <option value="">All Supported Consoles</option>
                    {platforms.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[#8c939d] mb-1 font-semibold">Preferred Region:</label>
                  <select
                    value={preferredRegion}
                    onChange={(e) => setPreferredRegion(e.target.value)}
                    className="w-full bg-[#16181a] border border-[#2d3238] text-white px-2 py-1 text-xs focus:outline-none"
                  >
                    {REGIONS.map(r => (
                      <option key={r.id} value={r.id}>{r.label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-4">
                  <input
                    type="checkbox"
                    id="autoSearch"
                    checked={autoSearch}
                    onChange={(e) => setAutoSearch(e.target.checked)}
                    className="w-3.5 h-3.5 bg-[#16181a] border-[#2d3238] text-[#337ab7]"
                  />
                  <label htmlFor="autoSearch" className="text-[#e6e6e6] text-xs font-medium cursor-pointer">
                    Auto-search &amp; queue top release
                  </label>
                </div>
              </div>
            </div>

            {/* Results List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {searching ? (
                <div className="py-16 text-center text-[#8c939d]">
                  <Search className="w-6 h-6 text-[#337ab7] animate-spin mx-auto mb-2" />
                  <p>Searching game catalog...</p>
                </div>
              ) : results.length === 0 ? (
                <div className="py-12 text-center text-[#8c939d]">
                  <p>No games found for this query.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {results.map((game, idx) => {
                    const state = addingMap[game.slug];
                    return (
                      <div
                        key={idx}
                        className="bg-[#22262a] border border-[#2d3238] p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-12 h-16 bg-[#16181a] border border-[#2d3238] shrink-0 flex items-center justify-center">
                            {game.cover_url ? (
                              <img src={game.cover_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-[10px] text-[#8c939d]">ROM</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="bg-[#111315] text-[#e6e6e6] border border-[#2d3238] px-1.5 py-0.2 text-[10px] font-bold uppercase">
                                {game.platform_name}
                              </span>
                              <span className="text-[#8c939d] text-xs">{game.release_year}</span>
                            </div>
                            <h3 className="font-bold text-white text-sm truncate mt-0.5">{game.title}</h3>
                            <p className="text-[#8c939d] text-xs line-clamp-1 mt-0.5">{game.summary || 'No description available.'}</p>
                          </div>
                        </div>

                        <button
                          onClick={() => handleAddGame(game)}
                          disabled={state === 'adding' || state === 'added'}
                          className={`px-3 py-1.5 text-xs font-bold border shrink-0 ${
                            state === 'added'
                              ? 'bg-[#3c763d] text-[#dff0d8] border-[#2b542c]'
                              : state === 'adding'
                              ? 'bg-[#204d74] text-white border-[#337ab7]'
                              : 'bg-[#337ab7] hover:bg-[#286090] text-white border-[#2e6da4]'
                          }`}
                        >
                          {state === 'added' ? '✓ Added' : state === 'adding' ? 'Adding...' : '+ Add to Library'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 2: UPLOAD & IMPORT ROMS ── */}
        {activeTab === 'upload' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-4 space-y-4">
            
            {/* Hidden Input Pickers */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => e.target.files && handleFilesAdded(e.target.files)}
              multiple
              className="hidden"
            />
            <input
              type="file"
              ref={folderInputRef}
              onChange={(e) => e.target.files && handleFilesAdded(e.target.files, true)}
              webkitdirectory=""
              directory=""
              multiple
              className="hidden"
            />
            <input
              type="file"
              ref={zipInputRef}
              onChange={(e) => e.target.files && handleFilesAdded(e.target.files)}
              accept=".zip,.7z,.rar,.tar,.gz,.chd,.iso,.rvz"
              multiple
              className="hidden"
            />

            {/* Drag and Drop Zone */}
            <div
              className={`border-2 border-dashed p-6 text-center transition-colors ${
                isDragging
                  ? 'border-[#337ab7] bg-[#16202c]'
                  : 'border-[#2d3238] bg-[#16181a] hover:border-[#4e555b]'
              }`}
            >
              <UploadCloud className="w-10 h-10 text-[#337ab7] mx-auto mb-2" />
              <p className="font-bold text-white text-sm">
                Drag &amp; drop ROM files, archives (.zip, .7z, .rar) or complete folders here
              </p>
              <p className="text-[11px] text-[#8c939d] mt-1 mb-4">
                Romarr automatically extracts archives and matches games to the right console folder.
              </p>

              {/* Action Buttons */}
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-[#337ab7] hover:bg-[#286090] text-white px-3 py-1.5 font-bold flex items-center gap-1.5 border border-[#2e6da4]"
                >
                  <File className="w-3.5 h-3.5" />
                  <span>Choose Files</span>
                </button>
                <button
                  type="button"
                  onClick={() => folderInputRef.current?.click()}
                  className="bg-[#22262a] hover:bg-[#2d3238] text-white px-3 py-1.5 font-bold flex items-center gap-1.5 border border-[#2d3238]"
                >
                  <FolderUp className="w-3.5 h-3.5 text-[#f0ad4e]" />
                  <span>Choose Folder</span>
                </button>
                <button
                  type="button"
                  onClick={() => zipInputRef.current?.click()}
                  className="bg-[#22262a] hover:bg-[#2d3238] text-white px-3 py-1.5 font-bold flex items-center gap-1.5 border border-[#2d3238]"
                >
                  <FileArchive className="w-3.5 h-3.5 text-[#5bc0de]" />
                  <span>Choose Archive (.zip/.7z/.rar)</span>
                </button>
              </div>
            </div>

            {/* Target Console & Extract Options */}
            <div className="bg-[#1a1d20] border border-[#2d3238] p-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[#8c939d] mb-1 font-semibold">Target Console:</label>
                <select
                  value={uploadPlatform}
                  onChange={(e) => setUploadPlatform(e.target.value)}
                  className="w-full bg-[#16181a] border border-[#2d3238] text-white px-2.5 py-1 text-xs focus:outline-none"
                >
                  <option value="auto">Auto-detect from extension &amp; folder name</option>
                  {platforms.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.id})</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-4">
                <input
                  type="checkbox"
                  id="modalAutoExtract"
                  checked={autoExtract}
                  onChange={(e) => setAutoExtract(e.target.checked)}
                  className="w-3.5 h-3.5 bg-[#16181a] border-[#2d3238] text-[#337ab7]"
                />
                <label htmlFor="modalAutoExtract" className="text-[#e6e6e6] text-xs font-medium cursor-pointer">
                  Automatically unpack compressed archives (.zip, .7z, .rar)
                </label>
              </div>
            </div>

            {/* Progress Bar (if uploading/processing) */}
            {uploadProgress.state !== 'idle' && (
              <div className="bg-[#16181a] border border-[#2d3238] p-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    {uploadProgress.state === 'processing' ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#f0ad4e]" />
                    ) : (
                      <UploadCloud className="w-3.5 h-3.5 text-[#5bc0de]" />
                    )}
                    <span>{uploadProgress.stageText}</span>
                  </span>
                  <span className="font-mono text-[#5bc0de] font-bold">
                    {uploadProgress.percent}%
                  </span>
                </div>

                <div className="w-full bg-[#111315] border border-[#2d3238] h-4 relative overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      uploadProgress.state === 'processing'
                        ? 'bg-gradient-to-r from-[#204d74] via-[#5bc0de] to-[#204d74] animate-pulse'
                        : 'bg-[#337ab7]'
                    }`}
                    style={{ width: `${uploadProgress.percent}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#8c939d]">
                  <span>Speed: {formatSpeed(uploadProgress.speed)}</span>
                  <span>ETA: {formatEta(uploadProgress.eta)}</span>
                  <span>Size: {formatFileSize(uploadProgress.loaded)} / {formatFileSize(uploadProgress.total)}</span>
                </div>
              </div>
            )}

            {/* Selected Files Queue */}
            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">
                    Files to Upload &amp; Import ({selectedFiles.length} files &bull; {formatFileSize(selectedFiles.reduce((acc, c) => acc + c.file.size, 0))})
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedFiles([])}
                    className="text-[#d9534f] hover:underline text-[11px]"
                  >
                    Clear All
                  </button>
                </div>

                <div className="bg-[#16181a] border border-[#2d3238] max-h-48 overflow-y-auto divide-y divide-[#2d3238]">
                  {selectedFiles.map((item, idx) => (
                    <div key={idx} className="p-2 flex items-center justify-between text-[11px]">
                      <span className="text-white truncate max-w-lg font-mono">{item.relPath}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[#8c939d]">{formatFileSize(item.file.size)}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== idx))}
                          className="text-[#8c939d] hover:text-[#d9534f]"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleStartUpload}
                  disabled={isUploading}
                  className="w-full bg-[#3c763d] hover:bg-[#2b542c] disabled:opacity-50 text-white py-2 font-bold text-xs border border-[#2b542c] flex items-center justify-center gap-2 shadow"
                >
                  {isUploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                  <span>{isUploading ? 'Uploading & Importing…' : `Start Upload & Import (${selectedFiles.length} Files)`}</span>
                </button>
              </div>
            )}

            {/* Success Results Banner */}
            {importResult && (
              <div className="bg-[#22262a] border border-[#3c763d] p-3 text-[#dff0d8] space-y-2">
                <div className="flex items-center gap-2 font-bold text-white">
                  <CheckCircle2 className="w-4 h-4 text-[#5cb85c]" />
                  <span>Import Completed Successfully!</span>
                </div>
                <p className="text-xs">{importResult.message || `Processed ${importResult.imported_games?.length || 0} ROMs.`}</p>
              </div>
            )}

            {/* Error Banner */}
            {uploadError && (
              <div className="bg-[#22262a] border border-[#a94442] p-3 text-[#f2dede] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#d9534f] shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

          </div>
        )}

        {/* Modal Footer */}
        <div className="p-2.5 bg-[#111315] border-t border-[#2d3238] flex justify-between items-center text-[#8c939d]">
          <span className="text-[11px]">
            {activeTab === 'search' ? 'Search indexers or drop ROMs directly' : 'Supports .zip, .7z, .rar, .chd, .iso, .rvz and folder drops'}
          </span>
          <button
            onClick={onClose}
            className="bg-[#22262a] hover:bg-[#2d3238] text-[#e6e6e6] border border-[#2d3238] px-3 py-1 text-xs font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
