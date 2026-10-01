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
  Trash2
} from 'lucide-react';
import { api } from '../services/api';

export default function ImportPage({ onNavigateToLibrary }) {
  const [platforms, setPlatforms] = useState([]);
  const [selectedPlatform, setSelectedPlatform] = useState('auto');
  const [autoExtract, setAutoExtract] = useState(true);

  const [selectedFiles, setSelectedFiles] = useState([]); // { file, relPath }
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
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
      newItems.push({ file, relPath });
    }
    setSelectedFiles(prev => [...prev, ...newItems]);
    setImportResult(null);
    setErrorMessage(null);
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
              filesFound.push({ file, relPath: fullRel });
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
          if (file) filesFound.push({ file, relPath: file.name });
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
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const totalBytes = selectedFiles.reduce((acc, curr) => acc + curr.file.size, 0);

  const handleStartImport = async () => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    setErrorMessage(null);
    setImportResult(null);

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
      const result = await api.uploadRoms(formData);
      setImportResult(result);
      setSelectedFiles([]);
    } catch (err) {
      setErrorMessage(err.message || 'Import failed. Please check server logs.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl text-xs">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#2d3238]">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-[#337ab7]" />
            ROM &amp; Archive Importer
          </h1>
          <p className="text-[#8c939d]">
            Upload individual ROM files, ZIP/7Z/RAR archives, or entire folder structures to import directly into your library.
          </p>
        </div>

        {selectedFiles.length > 0 && !isUploading && (
          <button
            onClick={clearAllFiles}
            className="bg-[#22262a] hover:bg-[#2d3238] text-[#e6e6e6] px-3 py-1.5 border border-[#2d3238] flex items-center gap-1.5 font-semibold"
          >
            <Trash2 className="w-3.5 h-3.5 text-[#d9534f]" />
            <span>Clear Queue ({selectedFiles.length})</span>
          </button>
        )}
      </div>

      {/* Configuration Bar */}
      <div className="bg-[#22262a] border border-[#2d3238] p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-[#8c939d] mb-1 font-semibold">Target Platform / Console:</label>
          <select
            value={selectedPlatform}
            onChange={(e) => setSelectedPlatform(e.target.value)}
            disabled={isUploading}
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
              disabled={isUploading}
              className="w-3.5 h-3.5 bg-[#16181a] border-[#2d3238] text-[#337ab7]"
            />
            <span className="text-white font-medium">Extract archives and sort inner ROM files</span>
          </label>
          <p className="text-[#8c939d] mt-1 text-[11px]">
            Unpacks compressed archives into their proper console folders automatically.
          </p>
        </div>
      </div>

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

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-3 bg-[#a94442] text-[#f2dede] border border-[#843534] flex items-center gap-2 font-semibold">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Staged Files Queue */}
      {selectedFiles.length > 0 && (
        <div className="bg-[#22262a] border border-[#2d3238] p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-[#2d3238] pb-2">
            <div>
              <h2 className="text-sm font-bold text-white uppercase">
                Staged for Import ({selectedFiles.length} files &bull; {formatFileSize(totalBytes)})
              </h2>
              <p className="text-[#8c939d]">Review the list below and click Start Import when ready.</p>
            </div>

            <button
              onClick={handleStartImport}
              disabled={isUploading}
              className="bg-[#5cb85c] hover:bg-[#449d44] disabled:opacity-50 text-white font-bold px-4 py-2 border border-[#4cae4c] flex items-center gap-2 text-xs"
            >
              {isUploading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Importing Files…</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>Start Import ({selectedFiles.length})</span>
                </>
              )}
            </button>
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
          <div className="p-3 bg-[#3c763d] text-[#dff0d8] border border-[#2b542c] flex items-center justify-between font-semibold">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>
                Import complete: {importResult.imported_count} games added/updated, {importResult.skipped_count} skipped, {importResult.errors_count} errors.
              </span>
            </div>
            {onNavigateToLibrary && (
              <button
                onClick={onNavigateToLibrary}
                className="bg-[#2b542c] hover:bg-[#1e3b1f] text-white px-3 py-1 border border-[#1e3b1f] flex items-center gap-1 text-xs"
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
                Successfully Organized &amp; Linked ROMs
              </h3>
              <table className="w-full text-left border-collapse border border-[#2d3238]">
                <thead className="bg-[#16181a] text-[#8c939d]">
                  <tr>
                    <th className="p-2 border-r border-[#2d3238]">Game Title</th>
                    <th className="p-2 border-r border-[#2d3238]">Console / Platform</th>
                    <th className="p-2 border-r border-[#2d3238]">Region</th>
                    <th className="p-2 border-r border-[#2d3238]">File Size</th>
                    <th className="p-2 text-center w-24">Download</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2d3238]">
                  {importResult.imported.map((g) => (
                    <tr key={g.id} className="bg-[#1a1d20]">
                      <td className="p-2 border-r border-[#2d3238] font-bold text-white">{g.title}</td>
                      <td className="p-2 border-r border-[#2d3238] text-[#5bc0de]">{g.platform}</td>
                      <td className="p-2 border-r border-[#2d3238] font-semibold">{g.region}</td>
                      <td className="p-2 border-r border-[#2d3238] font-mono text-[#8c939d]">
                        {formatFileSize(g.size_bytes)}
                      </td>
                      <td className="p-2 text-center">
                        <a
                          href={api.getGameDownloadUrl(g.id)}
                          download
                          className="bg-[#22262a] hover:bg-[#2d3238] text-white px-2 py-0.5 border border-[#2d3238] text-[11px] inline-flex items-center gap-1"
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
              <ul className="list-disc list-inside text-[#8c939d]">
                {importResult.skipped.map((s, idx) => (
                  <li key={idx}>
                    <strong className="text-white">{s.filename}:</strong> {s.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
