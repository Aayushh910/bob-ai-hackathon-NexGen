import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Activity,
  Cpu,
  TrendingUp,
  Radio,
  BrainCircuit,
  SlidersHorizontal,
  X,
  ChevronRight
} from 'lucide-react';
import { StatusBadge } from '../common/UIComponents';

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

  // Search filtered assets by real fields: asset_id, asset_name, asset_type
  const matchedAssets = assets
    .filter(
      (a) =>
        !q ||
        a.asset_id?.toLowerCase().includes(q) ||
        a.asset_name?.toLowerCase().includes(q) ||
        a.asset_type?.toLowerCase().includes(q)
    )
    .slice(0, 5);

  const navigationCommands = [
    { id: 'overview', label: 'Overview — Operational Command & Readiness', icon: Cpu },
    { id: 'fleet', label: 'Fleet Assets — Active Equipment Registry', icon: Activity },
    { id: 'predictions', label: 'Predictions — Failure Prognostics & TreeSHAP', icon: TrendingUp },
    { id: 'trends', label: 'Trends & Health — Subsystem Telemetry Curves', icon: Radio },
    { id: 'copilot', label: 'AI Copilot — Operational Inquest Engine', icon: BrainCircuit },
    { id: 'settings', label: 'Settings — Database Diagnostics & Configuration', icon: SlidersHorizontal },
  ].filter((cmd) => !q || cmd.label.toLowerCase().includes(q));

  return (
    <div className="command-palette-backdrop" onClick={() => onClose(false)}>
      <div className="command-palette-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="command-palette-input-box">
          <Search size={18} style={{ color: 'var(--color-text-muted)' }} />
          <input
            ref={inputRef}
            type="text"
            className="command-palette-input"
            placeholder="Search assets (e.g. A001, A035), commands, or jump to view..."
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
                  key={asset.asset_id}
                  className="command-result-row"
                  onClick={() => {
                    onInspectAsset(asset.asset_id);
                    onClose(false);
                  }}
                >
                  <div className="command-result-left">
                    <Activity size={16} style={{ color: 'var(--color-text-secondary)' }} />
                    <div>
                      <strong style={{ color: 'var(--color-text)', fontFamily: 'var(--font-family-mono)' }}>
                        {asset.asset_id}
                      </strong>
                      <span style={{ marginLeft: '8px', color: 'var(--color-text-muted)', fontSize: '12px' }}>
                        {asset.asset_name} &bull; {asset.asset_type}
                      </span>
                    </div>
                  </div>
                  <StatusBadge status={asset.status} size="sm" />
                </div>
              ))}
            </div>
          )}

          {navigationCommands.length > 0 && (
            <div style={{ marginTop: matchedAssets.length > 0 ? '12px' : 0 }}>
              <div className="command-group-heading">Navigation Views</div>
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
                      <Icon size={16} style={{ color: 'var(--color-text-secondary)' }} />
                      <span style={{ fontSize: '13px', color: 'var(--color-text)' }}>{cmd.label}</span>
                    </div>
                    <ChevronRight size={14} style={{ color: 'var(--color-text-muted)' }} />
                  </div>
                );
              })}
            </div>
          )}

          {matchedAssets.length === 0 && navigationCommands.length === 0 && (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>
              No matching assets or operational views found for "{query}".
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
