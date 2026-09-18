import React from 'react';
import {
  LayoutDashboard,
  Boxes,
  Crosshair,
  Activity,
  Bot,
  FileSpreadsheet,
  Sliders,
  ChevronLeft,
  ChevronRight,
  LogOut
} from 'lucide-react';

export default function Sidebar({
  activeTab,
  onTabChange,
  isCollapsed,
  onToggleCollapse,
  user,
  onLogout
}) {
  const navigationGroups = [
    {
      title: 'Operational Command',
      items: [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
      ]
    },
    {
      title: 'Monitoring',
      items: [
        { id: 'fleet', label: 'Fleet Assets', icon: Boxes },
        { id: 'predictions', label: 'Predictions', icon: Crosshair },
        { id: 'trends', label: 'Trends & Health', icon: Activity },
      ]
    },
    {
      title: 'Intelligence',
      items: [
        { id: 'copilot', label: 'AI Copilot', icon: Bot, badge: 'AI' },
        { id: 'reports', label: 'Reports', icon: FileSpreadsheet },
      ]
    },
    {
      title: 'System',
      items: [
        { id: 'settings', label: 'Settings', icon: Sliders },
      ]
    }
  ];

  return (
    <aside
      className={`sentinel-sidebar ${isCollapsed ? 'collapsed' : ''}`}
      aria-label="Application Primary Navigation"
    >
      {/* Brand & Identity */}
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <div className="brand-shield-box">
            <img src="/logo.png" alt="SentinelAI Logo" className="brand-logo-img" />
            <span className="brand-pulse-dot" title="Telemetry Live Stream Active" />
          </div>
          <div className="brand-identity-text">
            <span className="brand-main-title">SENTINELAI</span>
            <span className="brand-dept-tag">Mission Readiness</span>
          </div>
        </div>
      </div>

      {/* Nav Groups with Minimal Spacing */}
      <div className="sidebar-scroll-content" style={{ padding: '8px 10px', gap: '8px' }}>
        {navigationGroups.map((group, gIdx) => (
          <div key={gIdx} className="nav-group" style={{ marginBottom: '10px' }}>
            <div
              className="nav-group-title"
              style={{
                fontSize: '10px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--color-text-muted)',
                padding: '4px 10px 4px',
                display: isCollapsed ? 'none' : 'block'
              }}
            >
              {group.title}
            </div>
            <ul className="sidebar-nav-list" role="menu">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <li key={item.id} role="none" style={{ marginBottom: '2px' }}>
                    <button
                      role="menuitem"
                      className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                      onClick={() => onTabChange(item.id)}
                      data-tooltip={item.label}
                      aria-current={isActive ? 'page' : undefined}
                      style={{ height: '36px', padding: '0 10px' }}
                    >
                      <Icon size={17} className="sidebar-item-icon" aria-hidden="true" />
                      <span className="sidebar-item-label" style={{ fontSize: '13px' }}>{item.label}</span>
                      {item.badge && (
                        <span
                          className="sidebar-item-badge"
                          style={{
                            fontSize: '10px',
                            fontWeight: 800,
                            padding: '1px 5px',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(34, 197, 94, 0.15)',
                            color: 'var(--color-success)',
                            border: '1px solid rgba(34, 197, 94, 0.3)'
                          }}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* Footer Profile & Parallel Collapse / Red Logout Buttons */}
      <div className="sidebar-footer" style={{ padding: isCollapsed ? '10px 6px' : '12px 10px', borderTop: '1px solid var(--color-border)' }}>
        {user && !isCollapsed && (
          <div
            className="user-profile-card"
            style={{ marginBottom: '10px', padding: '6px 10px' }}
            title={`${user.name || 'Commander'} (${user.role || 'Officer'})`}
          >
            <div className="user-avatar-initials" style={{ width: '28px', height: '28px', fontSize: '11px' }}>
              {(user.name || 'SA').slice(0, 2).toUpperCase()}
            </div>
            <div className="user-info-text">
              <span className="user-name-line" style={{ fontSize: '12px', fontWeight: 600 }}>{user.name || 'Commander'}</span>
              <span className="user-role-badge" style={{ fontSize: '10px' }}>{user.role || 'Operational Command'}</span>
            </div>
          </div>
        )}

        <div className="sidebar-footer-actions-parallel">
          <button
            className="sidebar-collapse-btn-parallel"
            onClick={onToggleCollapse}
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            aria-label={isCollapsed ? 'Expand navigation sidebar' : 'Collapse navigation sidebar'}
          >
            {isCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
            {!isCollapsed && <span>Collapse</span>}
          </button>

          <button
            className="sidebar-logout-btn-parallel"
            onClick={onLogout}
            title="Secure Logout from Tactical System"
            aria-label="Secure Logout"
          >
            <LogOut size={14} />
            {!isCollapsed && <span>Logout</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}
