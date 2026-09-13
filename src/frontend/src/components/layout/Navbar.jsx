import React from 'react';
import { Shield, Activity, Database, Cpu, Radio, Wrench } from 'lucide-react';

export default function Navbar({ activeTab, onTabChange }) {
  const navItems = [
    { id: 'copilot', label: 'Command Copilot', icon: Cpu, badge: 'OPERATIONAL' },
    { id: 'readiness', label: 'Mission Readiness', icon: Shield, badge: 'PRIMARY' },
    { id: 'maintenance', label: 'Maintenance', icon: Wrench },
    { id: 'fleet', label: 'Fleet Assets', icon: Activity },
    { id: 'health', label: 'System Health', icon: Radio },
  ];

  return (
    <header className="navbar-container">
      <div className="navbar-brand">
        <div className="brand-icon-wrapper">
          <Shield className="brand-icon" size={24} />
          <span className="pulse-indicator"></span>
        </div>
        <div className="brand-text">
          <div className="brand-title">SentinelAI</div>
          <div className="brand-subtitle">Mission Readiness & Command Copilot</div>
        </div>
      </div>

      <nav className="navbar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isCurrent = activeTab === item.id;
          return (
            <button
              key={item.id}
              className={`nav-link ${isCurrent ? 'nav-link-active' : ''}`}
              onClick={() => onTabChange(item.id)}
            >
              <Icon size={16} />
              <span>{item.label}</span>
              {item.badge && <span className="nav-badge">{item.badge}</span>}
            </button>
          );
        })}
      </nav>

      <div className="navbar-actions">
        <span className="env-pill">Phase 7: Production Ready</span>
      </div>
    </header>
  );
}
