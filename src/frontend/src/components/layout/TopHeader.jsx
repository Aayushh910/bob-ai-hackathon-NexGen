import React from 'react';
import {
  Search,
  Bell,
  Sun,
  Moon,
  Shield,
  Activity,
  Menu,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function TopHeader({
  activeTab,
  onOpenSearch,
  onToggleNotifications,
  unreadCount = 0,
  theme = 'dark',
  onToggleTheme,
  systemHealthy = true,
  user,
  onMobileMenuToggle
}) {
  const getTabBreadcrumb = () => {
    switch (activeTab) {
      case 'overview': return 'Operational Command Overview';
      case 'fleet': return 'Fleet Assets & Readiness';
      case 'predictions': return 'Prognostics & Failure Risk';
      case 'trends': return 'Sensor Telemetry & Health Trends';
      case 'copilot': return 'AI Copilot Decision Support';
      case 'settings': return 'Environment & Settings';
      case 'inspection': return 'Asset Inspection';
      case 'component': return 'Component Analysis';
      default: return 'Operational Command';
    }
  };

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
          <span className="breadcrumb-root" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <img src="/logo.png" alt="SentinelAI" style={{ width: '18px', height: '18px', objectFit: 'contain' }} />
            SentinelAI
          </span>
          <span className="breadcrumb-sep">/</span>
          <span className="breadcrumb-current">{getTabBreadcrumb()}</span>
        </nav>
      </div>

      <div className="header-right">
        {/* Quick Search Bar */}
        <button
          className="header-search-trigger"
          onClick={onOpenSearch}
          title="Search assets and commands (Ctrl+K)"
          aria-label="Open command palette search"
        >
          <Search size={14} aria-hidden="true" />
          <span>Search assets, telemetry...</span>
          <kbd className="search-kbd-shortcut">Ctrl K</kbd>
        </button>

        {/* Live System Heartbeat Pill */}
        <div
          className="system-heartbeat-pill"
          title={systemHealthy ? 'PostgreSQL Database & API Online' : 'Service Connecting / Degraded'}
        >
          <span
            className="heartbeat-dot"
            style={{ backgroundColor: systemHealthy ? 'var(--green)' : 'var(--red)' }}
          />
          <span>{systemHealthy ? 'LIVE HUMS FEED' : 'RECONNECTING'}</span>
        </div>

        {/* Theme Toggle (Dark / Light) */}
        <button
          className="header-action-btn"
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        {/* Notification Bell */}
        <button
          className="header-action-btn"
          onClick={onToggleNotifications}
          title={`${unreadCount} operational alerts`}
          aria-label={`Notifications (${unreadCount} unread)`}
        >
          <Bell size={17} />
          {unreadCount > 0 && (
            <span className="notification-count-badge">{unreadCount}</span>
          )}
        </button>

        {/* User Identity Chip */}
        {user && (
          <div
            className="user-avatar-initials"
            style={{ cursor: 'pointer', width: '34px', height: '34px', fontSize: '13px' }}
            title={`${user.name} &bull; ${user.role}`}
          >
            {(user.name || 'CM').slice(0, 2).toUpperCase()}
          </div>
        )}
      </div>
    </header>
  );
}
