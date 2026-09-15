import React from 'react';
import {
  Cpu,
  Shield,
  Activity,
  Radio,
  AlertOctagon,
  Wrench,
  TrendingUp,
  BarChart2,
  FileText,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Calendar
} from 'lucide-react';

export default function Sidebar({
  activeTab,
  onTabChange,
  isCollapsed,
  onToggleCollapse,
  user,
  onLogout,
  unreadAlertCount = 0,
  urgentMaintenanceCount = 0
}) {
  const navigationGroups = [
    {
      title: 'Operational Command',
      items: [
        { id: 'overview', label: 'Overview', icon: Cpu, badge: 'CORE' },
        { id: 'fleet', label: 'Fleet Assets', icon: Activity },
        { id: 'health', label: 'Health & Sensors', icon: Radio },
        { id: 'predictions', label: 'Predictions & Risk', icon: TrendingUp },
        {
          id: 'alerts',
          label: 'Alerts & Directives',
          icon: AlertOctagon,
          badge: unreadAlertCount > 0 ? `${unreadAlertCount}` : null,
          badgeClass: unreadAlertCount > 0 ? 'badge-critical' : ''
        },
        {
          id: 'maintenance',
          label: 'Maintenance Queue',
          icon: Wrench,
          badge: urgentMaintenanceCount > 0 ? `${urgentMaintenanceCount} DUE` : null,
          badgeClass: urgentMaintenanceCount > 0 ? 'badge-caution' : ''
        },
        { id: 'planning', label: 'Intervention Plan', icon: Calendar },
        { id: 'analytics', label: 'Fleet Analytics', icon: BarChart2 },
        { id: 'reports', label: 'Readiness Reports', icon: FileText },
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

      {/* Nav Groups */}
      <div className="sidebar-scroll-content">
        {navigationGroups.map((group, gIdx) => (
          <div key={gIdx} className="nav-group">
            <div className="nav-group-title">{group.title}</div>
            <ul className="sidebar-nav-list" role="menu">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <li key={item.id} role="none">
                    <button
                      role="menuitem"
                      className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                      onClick={() => onTabChange(item.id)}
                      data-tooltip={item.label}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <Icon size={18} className="sidebar-item-icon" aria-hidden="true" />
                      <span className="sidebar-item-label">{item.label}</span>
                      {item.badge && (
                        <span className={`sidebar-item-badge ${item.badgeClass || ''}`}>
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

      {/* Footer Profile & Collapse Toggle */}
      <div className="sidebar-footer">
        {user && (
          <div
            className="user-profile-card"
            title={`${user.name || 'Commander'} (${user.role || 'Officer'})`}
          >
            <div className="user-avatar-initials">
              {(user.name || 'SA').slice(0, 2).toUpperCase()}
            </div>
            <div className="user-info-text">
              <span className="user-name-line">{user.name || 'Commander'}</span>
              <span className="user-role-badge">{user.role || 'Operational Command'}</span>
            </div>
          </div>
        )}

        <div className="sidebar-footer-actions">
          <button
            className="sidebar-collapse-trigger"
            onClick={onToggleCollapse}
            title={isCollapsed ? 'Expand Sidebar (Ctrl+[)' : 'Collapse Sidebar (Ctrl+[)'}
            aria-label={isCollapsed ? 'Expand navigation sidebar' : 'Collapse navigation sidebar'}
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            {!isCollapsed && <span>Collapse</span>}
          </button>

          <button
            className="sidebar-logout-btn"
            onClick={onLogout}
            title="Secure Logout"
            aria-label="Secure Logout"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
