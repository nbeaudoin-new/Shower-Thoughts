import React, { useState } from 'react';

function buildContextMd(items) {
  const lines = [];
  lines.push('# context.md');
  lines.push('');
  lines.push(`_Generated from ${items.length} recording${items.length !== 1 ? 's' : ''}_`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // Group by organization
  const groups = {};
  for (const item of items) {
    const org = item.result.organization || 'Unknown';
    if (!groups[org]) groups[org] = [];
    groups[org].push(item);
  }

  for (const [org, groupItems] of Object.entries(groups)) {
    lines.push(`## ${org}`);
    lines.push('');

    for (const item of groupItems) {
      lines.push(`### ${item.file.name.replace(/\.[^.]+$/, '')}`);
      lines.push('');

      if (item.result.clients && item.result.clients.length > 0) {
        lines.push(`**Clients:** ${item.result.clients.join(', ')}`);
        lines.push('');
      }

      lines.push(item.result.transcript.trim());
      lines.push('');
      lines.push('---');
      lines.push('');
    }
  }

  return lines.join('\n').trimEnd();
}

export default function ContextPanel({ items }) {
  const [markdown, setMarkdown] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = () => {
    const md = buildContextMd(items);
    setMarkdown(md);
    setCopied(false);

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'context.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
    } catch {
      const el = document.createElement('textarea');
      el.value = markdown;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="context-panel">
      {!markdown ? (
        <button className="generate-btn" onClick={handleGenerate}>
          📄 Generate context.md
        </button>
      ) : (
        <>
          <div className="context-toolbar">
            <span className="context-filename">context.md</span>
            <div className="context-toolbar-actions">
              <button className="generate-btn secondary" onClick={handleGenerate}>
                ↺ Regenerate
              </button>
              <button className={`copy-btn large${copied ? ' copied' : ''}`} onClick={handleCopy}>
                {copied ? '✓ Copied!' : '⎘ Copy'}
              </button>
            </div>
          </div>
          <pre className="context-preview">{markdown}</pre>
        </>
      )}
    </div>
  );
}
