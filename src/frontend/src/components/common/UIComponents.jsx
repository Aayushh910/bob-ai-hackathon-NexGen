import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  ShieldCheck,
  ShieldAlert,
  Radio,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';

export function StatusBadge({ status = 'READY', size = 'md', label = null }) {
  const norm = String(status || '').toUpperCase().replace('-', '_');
  
  let badgeClass = 'badge-ready';
  let Icon = CheckCircle2;
  let text = label || norm;

  if (norm === 'READY' || norm === 'ACTIVE' || norm === 'NOMINAL' || norm === 'OPERATIONAL' || norm === 'HEALTHY' || norm === 'PASSED') {
    badgeClass = 'badge-ready';
    Icon = CheckCircle2;
  } else if (norm === 'ATTENTION' || norm === 'CAUTION' || norm === 'WARNING' || norm === 'ADVISORY') {
    badgeClass = 'badge-caution';
    Icon = AlertTriangle;
  } else if (norm === 'DEGRADED' || norm === 'CONSTRAINED') {
    badgeClass = 'badge-degraded';
    Icon = AlertTriangle;
  } else if (norm === 'CRITICAL' || norm === 'NOT_READY' || norm === 'GROUNDED' || norm === 'URGENT' || norm === 'FAILED') {
    badgeClass = 'badge-critical';
    Icon = AlertOctagon;
  } else {
    badgeClass = 'badge-offline';
    Icon = Radio;
  }

  const iconSize = size === 'sm' ? 12 : size === 'lg' ? 16 : 14;

  return (
    <span className={'sentinel-badge ' + badgeClass + ' sentinel-badge-' + size} role="status">
      <Icon size={iconSize} aria-hidden="true" />
      <span>{text.replace('_', ' ')}</span>
    </span>
  );
}

export function RiskBadge({ risk = 'LOW', size = 'md' }) {
  const norm = String(risk || '').toUpperCase();
  let badgeClass = 'badge-ready';
  let Icon = ShieldCheck;

  if (norm === 'CRITICAL') {
    badgeClass = 'badge-critical';
    Icon = ShieldAlert;
  } else if (norm === 'HIGH') {
    badgeClass = 'badge-degraded';
    Icon = AlertOctagon;
  } else if (norm === 'MEDIUM' || norm === 'MODERATE') {
    badgeClass = 'badge-caution';
    Icon = AlertTriangle;
  }

  const iconSize = size === 'sm' ? 12 : 14;

  return (
    <span className={'sentinel-badge ' + badgeClass + ' sentinel-badge-' + size} role="status">
      <Icon size={iconSize} aria-hidden="true" />
      <span>{norm} PRIORITY</span>
    </span>
  );
}

export function LoadingSpinner({ size = 'md', variant = 'default', className = '' }) {
  const sizeClass = `sentinel-spinner-${size}`;
  const variantClass = variant !== 'default' ? `sentinel-spinner-${variant}` : '';
  return (
    <div
      className={`sentinel-spinner ${sizeClass} ${variantClass} ${className}`.trim()}
      role="status"
      aria-label="Loading"
    />
  );
}

export function LoadingState({
  message = 'Loading operational telemetry...',
  subtext = 'Connecting to Neon PostgreSQL database and diagnostic services',
  size = 'md',
  minHeight = null,
  showPercentage = true,
  className = ''
}) {
  const [percent, setPercent] = useState(18);

  useEffect(() => {
    if (!showPercentage) return;
    const interval = setInterval(() => {
      setPercent((prev) => {
        if (prev >= 94) return 94;
        const jump = Math.floor(Math.random() * 12) + 6;
        return Math.min(prev + jump, 94);
      });
    }, 260);
    return () => clearInterval(interval);
  }, [showPercentage]);

  return (
    <div
      className={`sentinel-loading-state ${className}`.trim()}
      style={minHeight ? { minHeight } : undefined}
      role="status"
      aria-live="polite"
    >
      <LoadingSpinner size={size} />
      {message && <div className="loading-state-title" style={{ marginTop: '12px', fontWeight: 600 }}>{message}</div>}
      {subtext && <div className="loading-state-sub" style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{subtext}</div>}
      {showPercentage && (
        <div style={{ width: '220px', marginTop: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontFamily: 'var(--font-family-mono)', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
            <span>DATA PIPELINE</span>
            <span style={{ fontWeight: 700, color: 'var(--color-text)' }}>{percent}%</span>
          </div>
          <div style={{ width: '100%', height: '4px', backgroundColor: 'var(--color-border)', borderRadius: '2px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${percent}%`,
                height: '100%',
                backgroundColor: 'var(--color-success)',
                transition: 'width 0.26s ease-out'
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function KpiCard({
  title,
  value,
  unit,
  subtitle,
  icon: Icon,
  variant = 'default',
  trend = null,
  loading = false,
  className = ''
}) {
  const variantClass = variant && variant !== 'default' ? `kpi-variant-${variant}` : '';
  const cardClass = `kpi-card ${variantClass} ${className}`.trim();

  return (
    <div className={cardClass}>
      <div className="kpi-header">
        <span className="kpi-title">{title}</span>
        {Icon && <Icon size={18} className="kpi-icon" aria-hidden="true" />}
      </div>

      <div className="kpi-value" style={{ minHeight: '38px', display: 'flex', alignItems: 'center' }}>
        {loading ? (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <LoadingSpinner size="sm" />
            <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: 500, fontFamily: 'var(--font-family-base)' }}>
              Loading...
            </span>
          </div>
        ) : (
          <>
            {value !== null && value !== undefined ? value : '--'}
            {unit && <span className="kpi-unit">{unit}</span>}
          </>
        )}
      </div>

      <div className="kpi-footer-row">
        {subtitle && <span className="kpi-sub">{subtitle}</span>}
        {trend && !loading && (
          <span className={'kpi-trend-pill trend-' + trend.direction}>
            {trend.direction === 'up' && <ArrowUpRight size={12} />}
            {trend.direction === 'down' && <ArrowDownRight size={12} />}
            {trend.direction === 'flat' && <Minus size={12} />}
            <span>{trend.value}</span>
          </span>
        )}
      </div>
    </div>
  );
}

export function PageHeader({
  badgeText,
  badgeIcon: BadgeIcon = ShieldCheck,
  title,
  subtitle,
  actions = null,
  children = null
}) {
  return (
    <div className="fleet-header-row mb-6">
      <div>
        {badgeText && (
          <div className="hero-badge">
            <BadgeIcon size={14} aria-hidden="true" />
            <span>{badgeText}</span>
          </div>
        )}
        <h1 className="fleet-title">{title}</h1>
        {subtitle && <p className="fleet-subtitle">{subtitle}</p>}
        {children}
      </div>

      {actions && <div className="header-actions-wrap">{actions}</div>}
    </div>
  );
}

export function LoadingSkeleton({ variant = 'table', rows = 5 }) {
  if (variant === 'cards') {
    return (
      <div className="readiness-kpi-grid">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="kpi-card">
            <div className="skeleton-box" style={{ width: '40%', height: 14, marginBottom: 12 }} />
            <div className="skeleton-box" style={{ width: '60%', height: 32, marginBottom: 10 }} />
            <div className="skeleton-box" style={{ width: '80%', height: 12 }} />
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'chart') {
    return (
      <div className="kpi-card" style={{ minHeight: 280, display: 'flex', flexDirection: 'column' }}>
        <div className="skeleton-box" style={{ width: '30%', height: 16, marginBottom: 16 }} />
        <div className="skeleton-box" style={{ flex: 1, width: '100%', minHeight: 200 }} />
      </div>
    );
  }

  return (
    <div className="skeleton-table-wrap">
      {Array.from({ length: rows }).map((_, idx) => (
        <div key={idx} className="skeleton-table-row" style={{ display: 'flex', gap: 16, padding: '14px 0', borderBottom: '1px solid var(--border-color)' }}>
          <div className="skeleton-box" style={{ width: 60, height: 22 }} />
          <div className="skeleton-box" style={{ width: 120, height: 22 }} />
          <div className="skeleton-box" style={{ flex: 1, height: 22 }} />
          <div className="skeleton-box" style={{ width: 80, height: 22 }} />
          <div className="skeleton-box" style={{ width: 90, height: 22 }} />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  title = 'No Data Available',
  description = 'No operational items match the current filters or query.',
  icon: Icon = AlertTriangle,
  actionText = null,
  onAction = null
}) {
  return (
    <div className="sentinel-empty-state">
      <div className="empty-state-icon-wrap">
        <Icon size={28} aria-hidden="true" />
      </div>
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-desc">{description}</p>
      {actionText && onAction && (
        <button className="primary-btn" onClick={onAction}>
          {actionText}
        </button>
      )}
    </div>
  );
}

export { default as ThemeDropdown } from './ThemeDropdown';

