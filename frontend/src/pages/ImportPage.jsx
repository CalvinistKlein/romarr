import React, { useState, useEffect, useRef } from 'react';
import {
  UploadCloud,
  FolderUp,
  FileArchive,
  File,
  CheckCircle2,
  AlertCircle,
  XCircle,
  HelpCircle,
  RefreshCw,
  Layers,
  ArrowRight,
  Download,
  Trash2,
  FolderSearch,
  HardDrive,
  Activity,
  Zap,
  Check,
  Clock
} from 'lucide-react';
import { api } from '../services/api';

export default function ImportPage({ onNavigateToLibrary }) {
  const [activeMode, setActiveMode] = useState('upload'); // 'upload' | 'scan'
  const [platforms, setPlatforms] = useState([]);
  const [selectedPlatform, setSelectedPlatform] = useState('auto');
  const [autoExtract, setAutoExtract] = useState(true);

  // Upload Mode State
  const [selectedFiles, setSelectedFiles] = useState([]); // { file, relPath, status }
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({
    loaded: 0,
    total: 0,
    percent: 0,
    speed: 0,
    eta: 0,
    state: 'idle', // 'uploading' | 'processing' | 'done'
    stageText: ''
  });

  // Server Scan Mode State
  const [serverScanPath, setServerScanPath] = useState('/downloads');
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgressText, setScanProgressText] = useState('');

  // Results & Errors
  const [importResult, setImportResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);
  const zipInputRef = useRef(null);

  useEffect(() => {
    fetchPlatforms();
  }, []);

  const fetchPlatforms = async () => {
    try {
      const data = await api.getImportPlatforms();
      setPlatforms(data || []);
    } catch (err) {
      console.error('Failed to load platforms:', err);
    }
  };

  const handleFilesAdded = (filesList, isFolder = false) => {
    const newItems = [];
    for (let i = 0; i < filesList.length; i++) {
      const file = filesList[i];
      // Skip Mac OS metadata files
      if (file.name.startsWith('.') || file.name === '__MACOSX') continue;
      const relPath = file.webkitRelativePath || file.name;
      newItems.push({ file, relPath, status: 'ready' });
    }
    setSelectedFiles(prev => [...prev, ...newItems]);
    setImportResult(null);
    setErrorMessage(null);
    setUploadProgress({ loaded: 0, total: 0, percent: 0, speed: 0, eta: 0, state: 'idle', stageText: '' });
  };

  // Drag and drop handler supporting folders via DataTransferItem webkitGetAsEntry
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    setErrorMessage(null);

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
        setImportResult(null);
      }
    } else if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesAdded(e.dataTransfer.files);
    }
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, idx) => idx !== index));
  };

  const clearAllFiles = () => {
    setSelectedFiles([]);
    setImportResult(null);
    setErrorMessage(null);
    setUploadProgress({ loaded: 0, total: 0, percent: 0, speed: 0, eta: 0, state: 'idle', stageText: '' });
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

  const totalBytes = selectedFiles.reduce((acc, curr) => acc + curr.file.size, 0);

  // ── Browser Upload & Import ───────────────────────────────────────────────
  const handleStartImport = async () => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    setErrorMessage(null);
    setImportResult(null);

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
    if (selectedPlatform && selectedPlatform !== 'auto') {
      formData.append('platform_id', selectedPlatform);
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
    } catch (err) {
      setErrorMessage(err.message || 'Import failed. Please check server logs.');
      setUploadProgress(prev => ({ ...prev, state: 'idle', stageText: '' }));
    } finally {
      setIsUploading(false);
    }
  };

  // ── Server Folder Scan & Import ───────────────────────────────────────────
  const handleStartServerScan = async () => {
    if (!serverScanPath.trim()) return;

    setIsScanning(true);
    setErrorMessage(null);
    setImportResult(null);
    setScanProgressText('Scanning server directory, unpacking archives, and organizing ROMs...');

    try {
      const result = await api.scanFolder({
        folder_path: serverScanPath.trim(),
        platform_id: selectedPlatform !== 'auto' ? selectedPlatform : null,
        auto_extract: autoExtract
      });
      setImportResult(result);
      setScanProgressText('Server folder scan completed successfully!');
    } catch (err) {
      setErrorMessage(err.message || 'Server folder scan failed. Check directory path.');
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#2d3238] gap-3">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-[#337ab7]" />
            ROM &amp; Archive Importer
          </h1>
          <p className="text-[#8c939d]">
            Upload local ROMs/archives from your computer or scan server folders directly into your Batocera/RetroPie library.
          </p>
        </div>

        {/* Mode Selector Tabs */}
        <div className="inline-flex border border-[#2d3238] shrink-0 self-start sm:self-auto">
          <button
            onClick={() => { setActiveMode('upload'); setErrorMessage(null); setImportResult(null); }}
            className={`px-3 py-1.5 font-bold flex items-center gap-1.5 ${
              activeMode === 'upload'
                ? 'bg-[#337ab7] text-white'
                : 'bg-[#16181a] text-[#8c939d] hover:text-white hover:bg-[#22262a]'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Upload Files / Folders</span>
          </button>
          <button
            onClick={() => { setActiveMode('scan'); setErrorMessage(null); setImportResult(null); }}
            className={`px-3 py-1.5 font-bold flex items-center gap-1.5 border-l border-[#2d3238] ${
              activeMode === 'scan'
                ? 'bg-[#337ab7] text-white'
                : 'bg-[#16181a] text-[#8c939d] hover:text-white hover:bg-[#22262a]'
            }`}
          >
            <FolderSearch className="w-3.5 h-3.5" />
            <span>Scan Server Folder</span>
          </button>
        </div>
      </div>

      {/* Configuration Bar */}
      <div className="bg-[#22262a] border border-[#2d3238] p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-[#8c939d] mb-1 font-semibold">Target Platform / Console:</label>
          <select
            value={selectedPlatform}
            onChange={(e) => setSelectedPlatform(e.target.value)}
            disabled={isUploading || isScanning}
            className="w-full bg-[#16181a] border border-[#2d3238] text-white px-2.5 py-1.5 focus:outline-none"
          >
            <option value="auto">⚡ Auto-Detect Console from Folders / File Extensions</option>
            {platforms.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.extensions.join(', ')})
              </option>
            ))}
          </select>
          <p className="text-[#8c939d] mt-1 text-[11px]">
            Leave on Auto-Detect when uploading mixed folders (e.g. <code>/snes/</code>, <code>/ps2/</code>) or standard ROM formats.
          </p>
        </div>

        <div>
          <label className="block text-[#8c939d] mb-1 font-semibold">Archive Extraction (.zip, .7z, .rar):</label>
          <label className="flex items-center gap-2 cursor-pointer mt-2">
            <input
              type="checkbox"
              checked={autoExtract}
              onChange={(e) => setAutoExtract(e.target.checked)}
              disabled={isUploading || isScanning}
              className="w-3.5 h-3.5 bg-[#16181a] border-[#2d3238] text-[#337ab7]"
            />
            <span className="text-white font-medium">Extract archives and sort inner ROM files</span>
          </label>
          <p className="text-[#8c939d] mt-1 text-[11px]">
            Unpacks compressed archives into their proper console folders automatically.
          </p>
        </div>
      </div>

      {/* Mode 1: Browser Drag & Drop Upload */}
      {activeMode === 'upload' && (
        <>
          {/* Hidden File Inputs */}
          <input
            type="file"
            ref={fileInputRef}
            multiple
            onChange={(e) => e.target.files && handleFilesAdded(e.target.files)}
            className="hidden"
          />
          <input
            type="file"
            ref={folderInputRef}
            webkitdirectory="true"
            directory="true"
            multiple
            onChange={(e) => e.target.files && handleFilesAdded(e.target.files, true)}
            className="hidden"
          />
          <input
            type="file"
            ref={zipInputRef}
            accept=".zip,.7z,.rar,.tar,.gz"
            multiple
            onChange={(e) => e.target.files && handleFilesAdded(e.target.files)}
            className="hidden"
          />

          {/* Drag & Drop Dropzone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed p-8 text-center transition-colors ${
              isDragging
                ? 'border-[#337ab7] bg-[#1a2938]'
                : 'border-[#2d3238] bg-[#22262a] hover:border-[#3e444c]'
            }`}
          >
            <UploadCloud className={`w-12 h-12 mx-auto mb-3 ${isDragging ? 'text-[#5bc0de]' : 'text-[#8c939d]'}`} />
            <h3 className="text-base font-bold text-white mb-1">
              Drag &amp; Drop ROM Files, Folders, or Archives Here
            </h3>
            <p className="text-[#8c939d] max-w-md mx-auto mb-4">
              Drop files directly from your desktop. Subfolders and archive hierarchies will be parsed and organized into your Batocera/RetroPie library.
            </p>

            {/* Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="bg-[#337ab7] hover:bg-[#286090] text-white font-bold px-3.5 py-2 border border-[#2e6da4] flex items-center gap-1.5"
              >
                <File className="w-3.5 h-3.5" />
                <span>Select Files</span>
              </button>

              <button
                type="button"
                onClick={() => folderInputRef.current?.click()}
                disabled={isUploading}
                className="bg-[#22262a] hover:bg-[#2d3238] text-white font-bold px-3.5 py-2 border border-[#2d3238] flex items-center gap-1.5"
              >
                <FolderUp className="w-3.5 h-3.5 text-[#5bc0de]" />
                <span>Select Entire Folder</span>
              </button>

              <button
                type="button"
                onClick={() => zipInputRef.current?.click()}
                disabled={isUploading}
                className="bg-[#22262a] hover:bg-[#2d3238] text-white font-bold px-3.5 py-2 border border-[#2d3238] flex items-center gap-1.5"
              >
                <FileArchive className="w-3.5 h-3.5 text-[#f0ad4e]" />
                <span>Select ZIP / 7Z / RAR</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Mode 2: Server Directory Scanner */}
      {activeMode === 'scan' && (
        <div className="bg-[#22262a] border border-[#2d3238] p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-[#2d3238] pb-3">
            <FolderSearch className="w-5 h-5 text-[#5bc0de]" />
            <div>
              <h2 className="text-sm font-bold text-white uppercase">Scan &amp; Organize Local Server Directory</h2>
              <p className="text-[#8c939d]">
                Scan unorganized ROMs already downloaded on your server / NAS mount (e.g. <code>/downloads</code> or <code>/downloads/roms</code>).
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[#8c939d] mb-1 font-semibold">Server Directory Absolute Path:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={serverScanPath}
                  onChange={(e) => setServerScanPath(e.target.value)}
                  disabled={isScanning}
                  placeholder="/downloads"
                  className="flex-1 bg-[#16181a] border border-[#2d3238] text-white px-3 py-2 font-mono text-xs focus:outline-none focus:border-[#337ab7]"
                />
                <button
                  onClick={handleStartServerScan}
                  disabled={isScanning || !serverScanPath.trim()}
                  className="bg-[#5cb85c] hover:bg-[#449d44] disabled:opacity-50 text-white font-bold px-5 py-2 border border-[#4cae4c] flex items-center gap-2 shrink-0"
                >
                  {isScanning ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Scanning &amp; Importing…</span>
                    </>
                  ) : (
                    <>
                      <FolderSearch className="w-4 h-4" />
                      <span>Scan Directory Now</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-[#8c939d] mt-1 text-[11px]">
                Common locations: <code>/downloads</code> (shared qBittorrent folder), <code>/roms/unorganized</code>, or mounted drives.
              </p>
            </div>

            {/* Server Scanning Live Progress Bar */}
            {isScanning && (
              <div className="p-4 bg-[#1a1d20] border border-[#337ab7] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-[#337ab7] animate-spin" />
                    <span>Processing Server Files…</span>
                  </span>
                  <span className="text-[11px] text-[#5bc0de] font-mono">Status: In Progress</span>
                </div>

                {/* Animated Pulsing Progress Bar */}
                <div className="w-full bg-[#16181a] border border-[#2d3238] h-5 relative overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-[#337ab7] via-[#5bc0de] to-[#337ab7] h-full w-full animate-pulse"
                  />
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white tracking-wider">
                    SCANNING &bull; EXTRACTING &bull; ORGANIZING
                  </span>
                </div>

                <p className="text-[11px] text-[#8c939d]">
                  {scanProgressText || 'Discovering ROM files, unpacking nested archives, and structuring directories...'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-3 bg-[#a94442] text-[#f2dede] border border-[#843534] flex items-center gap-2 font-semibold">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Live Upload & Processing Progress Bar */}
      {isUploading && (
        <div className="bg-[#22262a] border border-[#337ab7] p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-[#2d3238] pb-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#337ab7] animate-pulse" />
              <span className="text-sm font-bold text-white uppercase">
                {uploadProgress.state === 'processing' ? 'Server Processing' : 'Uploading ROM Files'}
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-[#8c939d]">
              {uploadProgress.speed > 0 && (
                <span>Speed: <strong className="text-white">{formatSpeed(uploadProgress.speed)}</strong></span>
              )}
              {uploadProgress.eta > 0 && (
                <span>ETA: <strong className="text-white">{formatEta(uploadProgress.eta)}</strong></span>
              )}
              <span>Transferred: <strong className="text-white">{formatFileSize(uploadProgress.loaded)} / {formatFileSize(uploadProgress.total || totalBytes)}</strong></span>
            </div>
          </div>

          {/* Main Dynamic Progress Bar */}
          <div className="w-full bg-[#16181a] border border-[#2d3238] h-6 relative overflow-hidden">
            <div
              className={`h-full transition-all duration-200 ${
                uploadProgress.state === 'processing'
                  ? 'bg-gradient-to-r from-[#337ab7] via-[#5bc0de] to-[#337ab7] animate-pulse'
                  : 'bg-[#337ab7]'
              }`}
              style={{
                width: uploadProgress.state === 'processing' ? '100%' : `${uploadProgress.percent}%`
              }}
            />
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow">
              {uploadProgress.state === 'processing'
                ? 'Processing & Organizing on Server (Extracting archives, matching platforms)...'
                : `${uploadProgress.percent}% (${formatFileSize(uploadProgress.loaded)} / ${formatFileSize(uploadProgress.total || totalBytes)})`}
            </span>
          </div>

          {/* Step Progression Indicators */}
          <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
            <div className={`p-2 border flex items-center gap-1.5 font-semibold ${
              uploadProgress.percent < 100
                ? 'bg-[#1a2938] text-[#5bc0de] border-[#337ab7]'
                : 'bg-[#1a2e1d] text-[#5cb85c] border-[#3c763d]'
            }`}>
              {uploadProgress.percent >= 100 ? <Check className="w-3.5 h-3.5 text-[#5cb85c]" /> : <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>1. Upload Files ({uploadProgress.percent}%)</span>
            </div>

            <div className={`p-2 border flex items-center gap-1.5 font-semibold ${
              uploadProgress.state === 'processing'
                ? 'bg-[#1a2938] text-[#5bc0de] border-[#337ab7]'
                : uploadProgress.state === 'done'
                ? 'bg-[#1a2e1d] text-[#5cb85c] border-[#3c763d]'
                : 'bg-[#1a1d20] text-[#8c939d] border-[#2d3238]'
            }`}>
              {uploadProgress.state === 'done' ? (
                <Check className="w-3.5 h-3.5 text-[#5cb85c]" />
              ) : uploadProgress.state === 'processing' ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Clock className="w-3.5 h-3.5" />
              )}
              <span>2. Unpack &amp; Organize</span>
            </div>

            <div className={`p-2 border flex items-center gap-1.5 font-semibold ${
              uploadProgress.state === 'done'
                ? 'bg-[#1a2e1d] text-[#5cb85c] border-[#3c763d]'
                : 'bg-[#1a1d20] text-[#8c939d] border-[#2d3238]'
            }`}>
              {uploadProgress.state === 'done' ? <Check className="w-3.5 h-3.5 text-[#5cb85c]" /> : <Clock className="w-3.5 h-3.5" />}
              <span>3. Library Ready</span>
            </div>
          </div>
        </div>
      )}

      {/* Staged Files Queue (Upload Mode) */}
      {activeMode === 'upload' && selectedFiles.length > 0 && (
        <div className="bg-[#22262a] border border-[#2d3238] p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-[#2d3238] pb-2">
            <div>
              <h2 className="text-sm font-bold text-white uppercase">
                Staged for Import ({selectedFiles.length} files &bull; {formatFileSize(totalBytes)})
              </h2>
              <p className="text-[#8c939d]">Review the staged items below and click Start Import when ready.</p>
            </div>

            <div className="flex items-center gap-2">
              {!isUploading && (
                <button
                  onClick={clearAllFiles}
                  className="bg-[#22262a] hover:bg-[#2d3238] text-[#e6e6e6] px-3 py-1.5 border border-[#2d3238] flex items-center gap-1.5 font-semibold text-xs"
                >
                  <Trash2 className="w-3.5 h-3.5 text-[#d9534f]" />
                  <span>Clear</span>
                </button>
              )}

              <button
                onClick={handleStartImport}
                disabled={isUploading}
                className="bg-[#5cb85c] hover:bg-[#449d44] disabled:opacity-50 text-white font-bold px-4 py-2 border border-[#4cae4c] flex items-center gap-2 text-xs"
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Importing ({uploadProgress.percent}%)…</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" />
                    <span>Start Import ({selectedFiles.length})</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto border border-[#2d3238] divide-y divide-[#2d3238]">
            {selectedFiles.map((item, idx) => (
              <div key={idx} className="bg-[#1a1d20] p-2 flex items-center justify-between">
                <div className="flex items-center gap-2 truncate pr-2">
                  <span className="text-[#8c939d] font-mono text-[11px] w-8">#{idx + 1}</span>
                  <span className="text-white font-medium truncate" title={item.relPath}>
                    {item.relPath}
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[#8c939d] font-mono text-[11px]">
                    {formatFileSize(item.file.size)}
                  </span>
                  {!isUploading && (
                    <button
                      onClick={() => removeFile(idx)}
                      className="text-[#8c939d] hover:text-[#d9534f]"
                      title="Remove"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Import Result Summary */}
      {importResult && (
        <div className="space-y-4">
          <div className="p-3.5 bg-[#3c763d] text-[#dff0d8] border border-[#2b542c] flex flex-wrap items-center justify-between gap-3 font-semibold">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>
                Import complete: <strong>{importResult.imported_count}</strong> games organized, <strong>{importResult.skipped_count}</strong> skipped, <strong>{importResult.errors_count}</strong> errors.
              </span>
            </div>
            {onNavigateToLibrary && (
              <button
                onClick={onNavigateToLibrary}
                className="bg-[#2b542c] hover:bg-[#1e3b1f] text-white px-3.5 py-1.5 border border-[#1e3b1f] flex items-center gap-1.5 text-xs font-bold"
              >
                <span>View in Library</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Imported Games Table */}
          {importResult.imported && importResult.imported.length > 0 && (
            <div className="bg-[#22262a] border border-[#2d3238] p-4 space-y-2">
              <h3 className="text-sm font-bold text-white uppercase border-b border-[#2d3238] pb-1.5 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#5cb85c]" />
                Successfully Organized &amp; Linked ROMs ({importResult.imported.length})
              </h3>
              <table className="w-full text-left border-collapse border border-[#2d3238]">
                <thead className="bg-[#16181a] text-[#8c939d]">
                  <tr>
                    <th className="p-2 border-r border-[#2d3238]">Game Title</th>
                    <th className="p-2 border-r border-[#2d3238]">Console / Platform</th>
                    <th className="p-2 border-r border-[#2d3238]">Region</th>
                    <th className="p-2 border-r border-[#2d3238]">File Size</th>
                    <th className="p-2 text-center w-28">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2d3238]">
                  {importResult.imported.map((g) => (
                    <tr key={g.id} className="bg-[#1a1d20] hover:bg-[#22262a]">
                      <td className="p-2 border-r border-[#2d3238] font-bold text-white">{g.title}</td>
                      <td className="p-2 border-r border-[#2d3238] text-[#5bc0de] font-semibold">{g.platform}</td>
                      <td className="p-2 border-r border-[#2d3238] font-semibold">{g.region}</td>
                      <td className="p-2 border-r border-[#2d3238] font-mono text-[#8c939d]">
                        {formatFileSize(g.size_bytes)}
                      </td>
                      <td className="p-2 text-center">
                        <a
                          href={api.getGameDownloadUrl(g.id)}
                          download
                          className="bg-[#22262a] hover:bg-[#2d3238] text-white px-2.5 py-1 border border-[#2d3238] text-[11px] inline-flex items-center gap-1 font-semibold"
                        >
                          <Download className="w-3 h-3" />
                          <span>ROM</span>
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Skipped Items */}
          {importResult.skipped && importResult.skipped.length > 0 && (
            <div className="bg-[#22262a] border border-[#8a6d3b] p-3 text-xs space-y-1">
              <h4 className="font-bold text-[#f0ad4e] uppercase flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5" /> Skipped Files ({importResult.skipped.length})
              </h4>
              <ul className="list-disc list-inside text-[#8c939d] space-y-0.5">
                {importResult.skipped.map((s, idx) => (
                  <li key={idx}>
                    <strong className="text-white">{s.filename}:</strong> {s.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Errors */}
          {importResult.errors && importResult.errors.length > 0 && (
            <div className="bg-[#22262a] border border-[#a94442] p-3 text-xs space-y-1">
              <h4 className="font-bold text-[#d9534f] uppercase flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" /> Import Errors ({importResult.errors.length})
              </h4>
              <ul className="list-disc list-inside text-[#e6e6e6] space-y-0.5">
                {importResult.errors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
