import React, { useState } from 'react';

function orgClass(organization) {
  if (!organization) return 'unknown';
  const lower = organization.toLowerCase();
  if (lower.includes('wavicle')) return 'org-a';
  if (lower.includes('caltech')) return 'org-b';
  return 'unknown';
}

function orgEmoji(cls) {
  if (cls === 'org-a') return '🌊';
  if (cls === 'org-b') return '🔬';
  return '🏢';
}

function renderMarkdown(text) {
  if (!text) return null;
  const lines = text.split('\n');
  const elements = [];
  let i = 0;
  let paragraphLines = [];

  const flushParagraph = () => {
    if (paragraphLines.length > 0) {
      const content = paragraphLines.join(' ').trim();
      if (content) {
        elements.push(
          <p key={`p-${i}`} dangerouslySetInnerHTML={{ __html: boldify(content) }} />
        );
      }
      paragraphLines = [];
    }
  };

  const boldify = (str) => str.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('### ')) {
      flushParagraph();
      elements.push(<h3 key={`h3-${i++}`}>{trimmed.slice(4)}</h3>);
    } else if (trimmed.startsWith('## ')) {
      flushParagraph();
      elements.push(<h2 key={`h2-${i++}`}>{trimmed.slice(3)}</h2>);
    } else if (trimmed.startsWith('# ')) {
      flushParagraph();
      elements.push(<h1 key={`h1-${i++}`}>{trimmed.slice(2)}</h1>);
    } else if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      flushParagraph();
      elements.push(<hr key={`hr-${i++}`} />);
    } else if (trimmed === '') {
      flushParagraph();
    } else {
      paragraphLines.push(trimmed);
    }
    i++;
  }
  flushParagraph();
  return elements;
}

export default function TranscriptView({ result, onReset, inline = false }) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(!inline);

  const { transcript, organization, clients } = result;
  const cls = orgClass(organization);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(transcript);
    } catch {
      const el = document.createElement('textarea');
      el.value = transcript;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (inline) {
    return (
      <div className="inline-transcript">
        <div className="inline-transcript-bar">
          <span className={`org-badge ${cls}`}>
            {orgEmoji(cls)} {organization || 'Unknown'}
          </span>
          {clients && clients.length > 0 && (
            <div className="client-chips inline">
              {clients.map((c) => (
                <span key={c} className="client-chip">{c}</span>
              ))}
            </div>
          )}
          <div className="inline-transcript-actions">
            <button className={`copy-btn${copied ? ' copied' : ''}`} onClick={handleCopy}>
              {copied ? '✓ Copied' : '⎘ Copy'}
            </button>
            <button className="expand-btn" onClick={() => setExpanded(e => !e)}>
              {expanded ? '▲ Collapse' : '▼ Expand'}
            </button>
          </div>
        </div>
        {expanded && (
          <div className="transcript-body inline-body">
            {renderMarkdown(transcript)}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="transcript-view">
      <div className="transcript-meta">
        <h2>Transcript</h2>
        <span className={`org-badge ${cls}`}>
          {orgEmoji(cls)} {organization || 'Unknown'}
        </span>
      </div>

      {clients && clients.length > 0 && (
        <div className="client-chips">
          <span className="client-chip-label">Clients:</span>
          {clients.map((c) => (
            <span key={c} className="client-chip">{c}</span>
          ))}
        </div>
      )}

      <div className="transcript-card">
        <div className="transcript-toolbar">
          <div className="transcript-toolbar-left">
            <div className="dot red" /><div className="dot yellow" /><div className="dot green" />
          </div>
          <button className={`copy-btn${copied ? ' copied' : ''}`} onClick={handleCopy}>
            {copied ? '✓ Copied!' : '⎘ Copy'}
          </button>
        </div>
        <div className="transcript-body">{renderMarkdown(transcript)}</div>
      </div>

      {onReset && (
        <div className="reset-row">
          <button className="reset-btn" onClick={onReset}>← Transcribe another file</button>
        </div>
      )}
    </div>
  );
}
