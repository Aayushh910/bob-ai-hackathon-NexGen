import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Bell,
  Sun,
  Moon,
  Shield,
  Activity,
  Menu,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronRight,
  Boxes,
  Cpu
} from 'lucide-react';

export default function TopHeader({
  activeTab,
  onOpenSearch,
  onToggleNotifications,
  unreadCount = 0,
  theme = 'dark',
  onToggleTheme,
  systemHealthy = true,
  onMobileMenuToggle,
  searchAssets = [],
  onInspectAsset
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const searchRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getTabBreadcrumb = () => {
    switch (activeTab) {
      case 'overview': return 'Operational Command Overview';
      case 'fleet': return 'Fleet Assets & Readiness';
      case 'predictions': return 'Prognostics & Failure Risk';
      case 'trends': return 'Sensor Telemetry & Health Trends';
      case 'copilot': return 'AI Copilot Decision Support';
      case 'reports': return 'Mission Readiness Reports';
      case 'settings': return 'Environment & Sensor Grid';
      case 'inspection': return 'Asset Inspection';
      case 'component': return 'Component Analysis';
      default: return 'Operational Command';
    }
  };

  // Filter recommendations based on input
  const query = searchTerm.trim().toLowerCase();
  const matchedAssets = query
    ? (searchAssets || [])
        .filter(
          (a) =>
            (a.asset_id || '').toLowerCase().includes(query) ||
            (a.asset_name || '').toLowerCase().includes(query) ||
            (a.asset_type || '').toLowerCase().includes(query)
        )
        .slice(0, 6)
    : [];

  const matchedSubsystems = query
    ? ['Engine', 'Battery', 'Fuel Pump', 'Hydraulic System']
        .filter((s) => s.toLowerCase().includes(query))
        .slice(0, 3)
    : [];

  return (
    <header className="sentinel-topheader" role="banner">
      <div className="header-left">
        <button
          className="mobile-menu-toggle"
          onClick={onMobileMenuToggle}
          aria-label="Toggle navigation menu"
        >
          <Menu size={20} />
        </button>

        <nav aria-label="Breadcrumbs" className="header-breadcrumbs">
          <div className="breadcrumb-root" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <img
              src="/logo.png"
              alt="SentinelAI Logo"
              style={{ width: '22px', height: '22px', objectFit: 'contain' }}
            />
            <span style={{ fontWeight: 800, fontSize: '15px', letterSpacing: '0.04em', color: 'var(--color-text)' }}>
              SENTINELAI
            </span>
          </div>
          <span className="breadcrumb-sep">/</span>
          <span className="breadcrumb-current" style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
            {getTabBreadcrumb()}
          </span>
        </nav>
      </div>

      <div className="header-right">
        {/* ── Real-Time Single-Line Search Bar with Dropdown Recommendations ── */}
        <div className="header-search-container" ref={searchRef}>
          <div className="header-search-input-box">
            <Search size={14} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} aria-hidden="true" />
            <input
              type="text"
              className="header-search-input"
              placeholder="Search assets, subsystems (e.g. A035, HYD)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => setIsFocused(true)}
              aria-label="Search assets and subsystems"
            />
            {searchTerm && (
              <button
                type="button"
                className="header-search-clear-btn"
                onClick={() => setSearchTerm('')}
                title="Clear Search"
              >
                <X size={12} />
              </button>
            )}
            {!searchTerm && <kbd className="search-kbd-shortcut">Ctrl K</kbd>}
          </div>

          {/* Autocomplete Recommendations Dropdown */}
          {isFocused && query.length > 0 && (
            <div className="header-search-dropdown" role="listbox">
              {matchedAssets.length === 0 && matchedSubsystems.length === 0 ? (
                <div style={{ padding: '12px', fontSize: '12px', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                  No matching assets or subsystems for "{searchTerm}"
                </div>
              ) : (
                <>
                  {matchedAssets.length > 0 && (
                    <div>
                      <div className="search-dropdown-section-title">Matching Assets</div>
                      {matchedAssets.map((asset) => (
                        <div
                          key={asset.asset_id}
                          className="search-recommendation-item"
                          onClick={() => {
                            if (onInspectAsset) {
                              onInspectAsset(asset.asset_id);
                            }
                            setIsFocused(false);
                            setSearchTerm('');
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Boxes size={14} style={{ color: 'var(--color-primary)' }} />
                            <span style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 700, fontSize: '13px', color: 'var(--color-text)' }}>
                              {asset.asset_id}
                            </span>
                            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                              {asset.asset_name || asset.asset_type}
                            </span>
                          </div>
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor:
                                asset.status === 'READY'
                                  ? 'var(--color-success-dim)'
                                  : asset.status === 'NOT_READY'
                                  ? 'var(--color-danger-dim)'
                                  : 'var(--color-warning-dim)',
                              color:
                                asset.status === 'READY'
                                  ? 'var(--color-success)'
                                  : asset.status === 'NOT_READY'
                                  ? 'var(--color-danger)'
                                  : 'var(--color-warning)',
                            }}
                          >
                            {asset.status || 'READY'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {matchedSubsystems.length > 0 && (
                    <div style={{ marginTop: '4px', borderTop: '1px solid var(--color-border)' }}>
                      <div className="search-dropdown-section-title">Subsystem Categories</div>
                      {matchedSubsystems.map((subsystem) => (
                        <div
                          key={subsystem}
                          className="search-recommendation-item"
                          onClick={() => {
                            setSearchTerm(subsystem);
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Cpu size={14} style={{ color: 'var(--color-text-secondary)' }} />
                            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text)' }}>
                              {subsystem}
                            </span>
                          </div>
                          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Filter Subsystem</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Live System Heartbeat with Pulsing Green Beacon ── */}
        <div
          className="system-heartbeat-pill"
          title={systemHealthy ? 'PostgreSQL Neon DB & ML Pipelines Active' : 'Service Connecting / Degraded'}
        >
          <span className="heartbeat-beacon" />
          <span>{systemHealthy ? 'LIVE HUMS FEED' : 'RECONNECTING'}</span>
        </div>

        {/* Theme Toggle (Dark / Light) */}
        <button
          className="header-action-btn"
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* Notification Bell */}
        <button
          className="header-action-btn"
          onClick={onToggleNotifications}
          title={`${unreadCount} operational alerts`}
          aria-label={`Notifications (${unreadCount} unread)`}
        >
          <Bell size={16} />
          {unreadCount > 0 && (
            <span className="notification-count-badge">{unreadCount}</span>
          )}
        </button>
      </div>
    </header>
  );
}
