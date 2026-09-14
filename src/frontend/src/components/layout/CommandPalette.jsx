import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Activity,
  AlertOctagon,
  Wrench,
  TrendingUp,
  Shield,
  FileText,
  X,
  ChevronRight
} from 'lucide-react';

export default function CommandPalette({
  isOpen,
  onClose,
  assets = [],
  onNavigate,
  onInspectAsset
}) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Keyboard shortcut Ctrl+K listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        onClose(!isOpen);
      } else if (e.key === 'Escape' && isOpen) {
        onClose(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const q = query.toLowerCase().trim();

  // Search filtered items
  const matchedAssets = assets
    .filter(
      (a) =>
        !q ||
        a.asset_code?.toLowerCase().includes(q) ||
        a.model?.toLowerCase().includes(q) ||
        a.location?.toLowerCase().includes(q)
    )
    .slice(0, 5);

  const navigationCommands = [
    { id: 'overview', label: 'Overview — Operational Command & Copilot', icon: Shield },
    { id: 'fleet', label: 'Fleet Assets — Active Equipment Registry', icon: Activity },
    { id: 'predictions', label: 'Predictions — ML Failure Risk & RUL', icon: TrendingUp },
    { id: 'maintenance', label: 'Maintenance Queue — Interventions & Service', icon: Wrench },
    { id: 'alerts', label: 'Alerts & Anomalies — Operational Directives', icon: AlertOctagon },
    { id: 'reports', label: 'Readiness Reports — Export Clearance Certificates', icon: FileText },
  ].filter((cmd) => !q || cmd.label.toLowerCase().includes(q));

  return (
    <div className="command-palette-backdrop" onClick={() => onClose(false)}>
      <div className="command-palette-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="command-palette-input-box">
          <Search size={18} className="text-muted" />
          <input
            ref={inputRef}
            type="text"
            className="command-palette-input"
            placeholder="Search assets, telemetry, commands, or jump to view..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="btn-inspect-clean" onClick={() => onClose(false)}>
            <X size={16} />
          </button>
        </div>

        <div className="command-results-list">
          {matchedAssets.length > 0 && (
            <div>
              <div className="command-group-heading">Fleet Assets</div>
              {matchedAssets.map((asset) => (
                <div
                  key={asset.id}
                  className="command-result-row"
                  onClick={() => {
                    onInspectAsset(asset.id, asset.asset_code);
                    onClose(false);
                  }}
                >
                  <div className="command-result-left">
                    <Activity size={16} className="text-cyan" />
                    <div>
                      <strong style={{ color: 'var(--text-primary)' }}>{asset.asset_code}</strong>
                      <span style={{ marginLeft: '8px', color: 'var(--text-muted)' }}>
                        {asset.model} &bull; {asset.location}
                      </span>
                    </div>
                  </div>
                  <span className={`status-pill pill-${(asset.status || 'active').toLowerCase()}`}>
                    {asset.status}
                  </span>
                </div>
              ))}
            </div>
          )}

          {navigationCommands.length > 0 && (
            <div style={{ marginTop: '8px' }}>
              <div className="command-group-heading">Operational Modules</div>
              {navigationCommands.map((cmd) => {
                const Icon = cmd.icon;
                return (
                  <div
                    key={cmd.id}
                    className="command-result-row"
                    onClick={() => {
                      onNavigate(cmd.id);
                      onClose(false);
                    }}
                  >
                    <div className="command-result-left">
                      <Icon size={16} className="text-muted" />
                      <span>{cmd.label}</span>
                    </div>
                    <ChevronRight size={14} className="text-muted" />
                  </div>
                );
              })}
            </div>
          )}

          {matchedAssets.length === 0 && navigationCommands.length === 0 && (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No assets or operational directives found matching "{query}".
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
