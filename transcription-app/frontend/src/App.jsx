import React, { useState, useCallback } from 'react';
import DropZone from './components/DropZone.jsx';
import TranscriptView from './components/TranscriptView.jsx';
import ContextPanel from './components/ContextPanel.jsx';

async function transcribeFile(file) {
  const formData = new FormData();
  formData.append('audio', file);
  const res = await fetch('/api/transcribe', { method: 'POST', body: formData });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Server error: ${res.status}`);
  return data;
}

// status: 'pending' | 'processing' | 'done' | 'error'
function makeItem(file) {
  return { file, status: 'pending', result: null, error: null };
}

export default function App() {
  const [files, setFiles] = useState([]);
  const [items, setItems] = useState(null); // null = not started
  const [running, setRunning] = useState(false);

  const handleTranscribe = useCallback(async () => {
    if (!files.length || running) return;
    setRunning(true);

    const initial = files.map(makeItem);
    setItems(initial);

    for (let i = 0; i < initial.length; i++) {
      setItems(prev => prev.map((it, idx) =>
        idx === i ? { ...it, status: 'processing' } : it
      ));

      try {
        const result = await transcribeFile(initial[i].file);
        setItems(prev => prev.map((it, idx) =>
          idx === i ? { ...it, status: 'done', result } : it
        ));
      } catch (err) {
        setItems(prev => prev.map((it, idx) =>
          idx === i ? { ...it, status: 'error', error: err.message || 'Unexpected error' } : it
        ));
      }
    }

    setRunning(false);
  }, [files, running]);

  const handleReset = () => {
    setFiles([]);
    setItems(null);
    setRunning(false);
  };

  const allDone = items && !running;
  const doneCount = items ? items.filter(it => it.status === 'done').length : 0;
  const total = items ? items.length : 0;

  return (
    <div className="app">
      <header className="app-header">
        <div className="logo">🚿</div>
        <h1>Shower Thoughts</h1>
        <p>Voice memo transcription</p>
      </header>

      {!items && (
        <>
          <DropZone files={files} onFiles={setFiles} disabled={running} />
          <button
            className="transcribe-btn"
            onClick={handleTranscribe}
            disabled={!files.length}
          >
            <span>🎙️</span>
            Transcribe {files.length > 1 ? `${files.length} Recordings` : 'Recording'}
          </button>
        </>
      )}

      {items && (
        <div className="batch-view">
          <div className="batch-header">
            <h2>
              {running
                ? `Transcribing… (${doneCount}/${total})`
                : `Done — ${doneCount} of ${total} succeeded`}
            </h2>
            {allDone && (
              <button className="reset-btn" onClick={handleReset}>← Start over</button>
            )}
          </div>

          <ul className="batch-list">
            {items.map((item, idx) => (
              <li key={idx} className={`batch-item status-${item.status}`}>
                <div className="batch-item-header">
                  <StatusIcon status={item.status} />
                  <span className="batch-item-name" title={item.file.name}>
                    {item.file.name}
                  </span>
                </div>
                {item.status === 'error' && (
                  <div className="batch-item-error">{item.error}</div>
                )}
                {item.status === 'done' && item.result && (
                  <TranscriptView result={item.result} inline />
                )}
              </li>
            ))}
          </ul>

          {allDone && doneCount > 0 && (
            <ContextPanel items={items.filter(it => it.status === 'done')} />
          )}
        </div>
      )}
    </div>
  );
}

function StatusIcon({ status }) {
  if (status === 'pending')    return <span className="status-icon pending">○</span>;
  if (status === 'processing') return <span className="status-icon processing">⟳</span>;
  if (status === 'done')       return <span className="status-icon done">✓</span>;
  if (status === 'error')      return <span className="status-icon error">✕</span>;
  return null;
}
