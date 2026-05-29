import React, { useRef, useState, useCallback } from 'react';

const ACCEPTED_TYPES = new Set(['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/wave', 'audio/x-wav', 'audio/mp4', 'audio/m4a', 'audio/x-m4a']);
const ACCEPTED_EXTS = ['.mp3', '.wav', '.m4a'];
const MAX_FILES = 20;

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isAccepted(file) {
  if (ACCEPTED_TYPES.has(file.type)) return true;
  const ext = '.' + file.name.split('.').pop().toLowerCase();
  return ACCEPTED_EXTS.includes(ext);
}

export default function DropZone({ files, onFiles, disabled }) {
  const inputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);

  const addFiles = useCallback((incoming) => {
    const valid = Array.from(incoming).filter(isAccepted);
    onFiles(prev => {
      const combined = [...prev, ...valid];
      return combined.slice(0, MAX_FILES);
    });
  }, [onFiles]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragActive(false);
    if (disabled) return;
    addFiles(e.dataTransfer.files);
  }, [disabled, addFiles]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    if (!disabled) setDragActive(true);
  }, [disabled]);

  const handleDragLeave = useCallback(() => setDragActive(false), []);

  const handleChange = (e) => {
    addFiles(e.target.files);
    e.target.value = '';
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
  };

  const removeFile = (idx) => {
    onFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const hasFiles = files.length > 0;

  return (
    <div className="dropzone-wrapper">
      <div
        className={`dropzone${dragActive ? ' drag-active' : ''}${hasFiles ? ' has-file' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={handleKeyDown}
        tabIndex={disabled ? -1 : 0}
        role="button"
        aria-label="Audio file drop zone"
      >
        <input
          ref={inputRef}
          type="file"
          accept=".mp3,.wav,.m4a,audio/*"
          multiple
          onChange={handleChange}
          disabled={disabled}
        />

        {!hasFiles ? (
          <>
            <span className="dropzone-icon">🎙️</span>
            <div className="dropzone-title">
              {dragActive ? 'Drop them!' : 'Drag & drop your audio files here'}
            </div>
            <div className="dropzone-subtitle">
              or <span>click to browse</span> &nbsp;·&nbsp; MP3, WAV, M4A &nbsp;·&nbsp; up to {MAX_FILES} files &nbsp;·&nbsp; 25 MB each
            </div>
          </>
        ) : (
          <>
            <span className="dropzone-icon">🎵</span>
            <div className="dropzone-title">
              {files.length} file{files.length > 1 ? 's' : ''} ready
              {files.length < MAX_FILES && <span className="dropzone-add-hint"> — drop more to add</span>}
            </div>
          </>
        )}
      </div>

      {hasFiles && (
        <ul className="file-list" onClick={(e) => e.stopPropagation()}>
          {files.map((file, idx) => (
            <li key={`${file.name}-${idx}`} className="file-chip">
              <span className="file-icon">🎧</span>
              <span className="file-name" title={file.name}>{file.name}</span>
              <span className="file-size">{formatBytes(file.size)}</span>
              <button
                className="remove-file-btn"
                onClick={() => removeFile(idx)}
                title="Remove file"
                disabled={disabled}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
