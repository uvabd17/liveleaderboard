'use client';

import { useEffect, useState } from 'react';

export default function LeaderboardEmbedPage() {
  const [embedCode, setEmbedCode] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => {
    const baseUrl = window.location.origin;
    const embedUrl = `${baseUrl}/leaderboard`;
    setPreviewUrl(embedUrl);
    
    const code = `<iframe src="${embedUrl}" width="100%" height="600" frameborder="0" style="border: 1px solid #ccc; border-radius: 8px;"></iframe>`;
    setEmbedCode(code);
  }, []);

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Embed Leaderboard</h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        Embed the live leaderboard on your website using the code below.
      </p>

      <div style={{ marginBottom: '2rem' }}>
        <h2>Embed Code</h2>
        <div style={{ position: 'relative' }}>
          <textarea
            readOnly
            value={embedCode}
            style={{
              width: '100%',
              padding: '1rem',
              background: '#0e1730',
              color: 'var(--text)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              minHeight: '120px',
              resize: 'vertical',
            }}
          />
          <button
            onClick={() => {
              navigator.clipboard.writeText(embedCode);
              alert('Embed code copied to clipboard!');
            }}
            style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              padding: '0.5rem 1rem',
              background: 'var(--accent)',
              color: 'var(--bg)',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            Copy Code
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h2>Preview</h2>
        <div style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', overflow: 'hidden' }}>
          <iframe
            src={previewUrl}
            width="100%"
            height="600"
            style={{ border: 'none', display: 'block' }}
            title="Leaderboard Embed Preview"
          />
        </div>
      </div>

      <div>
        <h2>Customization Options</h2>
        <p style={{ color: '#666', marginBottom: '1rem' }}>
          You can customize the iframe dimensions by modifying the <code>width</code> and <code>height</code> attributes:
        </p>
        <ul style={{ color: '#666' }}>
          <li>Standard: width="100%" height="600"</li>
          <li>Compact: width="100%" height="400"</li>
          <li>Full Screen: width="100%" height="800"</li>
        </ul>
      </div>
    </div>
  );
}
