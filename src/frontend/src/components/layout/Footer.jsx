import React from 'react';

export default function Footer() {
  return (
    <footer className="footer-container">
      <div className="footer-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
        <img src="/logo.png" alt="SentinelAI" style={{ width: '16px', height: '16px', objectFit: 'contain' }} />
        <span>SentinelAI &mdash; Mission Readiness &amp; Command Intelligence Platform</span>
        <span className="footer-separator">&bull;</span>
        <span>Neon DB &bull; FastAPI &bull; React &bull; Enterprise Edition</span>
      </div>
    </footer>
  );
}
