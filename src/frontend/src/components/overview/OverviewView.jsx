import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Activity,
  AlertTriangle,
  AlertOctagon,
  RefreshCw,
  Search,
  Sparkles,
  ChevronRight,
  Cpu,
  Layers,
  Radio,
  Bot,
  Wrench,
  Boxes
} from 'lucide-react';
import {
  getDashboardSummary,
  getCriticalComponents,
  getHighPriorityComponents
} from '../../api/dashboard';
import { clearApiCache } from '../../api/client';
import { PageHeader, KpiCard, StatusBadge, RiskBadge, LoadingState, EmptyState } from '../common/UIComponents';

export default function OverviewView({ onInspectAsset, onAnalyzeComponent, onNavigateCopilot }) {
  const [summary, setSummary] = useState(null);
  const [criticalComponents, setCriticalComponents] = useState([]);
  const [highPriorityComponents, setHighPriorityComponents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const loadData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setIsRefreshing(true);
      clearApiCache();
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const [sumData, critData, highData] = await Promise.all([
        getDashboardSummary(),
        getCriticalComponents(),
        getHighPriorityComponents()
      ]);

      const safeCrit = Array.isArray(critData)
        ? critData
        : (Array.isArray(critData?.components) ? critData.components : []);
      const safeHigh = Array.isArray(highData)
        ? highData
        : (Array.isArray(highData?.components) ? highData.components : []);

      setSummary(sumData);
      setCriticalComponents(safeCrit);
      setHighPriorityComponents(safeHigh);
    } catch (err) {
      console.error('Failed to load dashboard overview data:', err);
      setError(err.message || 'Unable to retrieve fleet command overview from backend.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData(true);
    window.addEventListener('sentinel:data-updated', handleUpdate);
    return () => window.removeEventListener('sentinel:data-updated', handleUpdate);
  }, [loadData]);

  // Suggested questions for AI Copilot launcher
  const suggestedQuestions = [
    'Which assets need immediate attention?',
    'Which assets are NOT mission-ready?',
    'Which assets have highest failure risk?',
    'Explain the failure risk on hydraulic system'
  ];

  // 1. Numerical Anomaly Breakdown across the 4 Subsystems
  const { anomalyBySubsystem, mostAnomalousSubsystem, totalSubsystemAnomalies } = useMemo(() => {
    const counts = {
      'Hydraulic System': 0,
      'Engine': 0,
      'Fuel Pump': 0,
      'Battery': 0
    };

    [...criticalComponents, ...highPriorityComponents].forEach((c) => {
      if (c && c.component_type && counts[c.component_type] !== undefined) {
        counts[c.component_type] += 1;
      }
    });

    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const total = Object.values(counts).reduce((a, b) => a + b, 0);

    return {
      anomalyBySubsystem: counts,
      mostAnomalousSubsystem: entries[0] || ['Hydraulic System', 0],
      totalSubsystemAnomalies: total
    };
  }, [criticalComponents, highPriorityComponents]);

  // 2. Streamline Critical Components: Filter Top Assets that Need Fix First (sorted by Failure Risk desc)
  const topPriorityAssetsToFix = useMemo(() => {
    return [...criticalComponents]
      .sort((a, b) => (b.failure_probability || 0) - (a.failure_probability || 0))
      .slice(0, 6);
  }, [criticalComponents]);

  if (loading && !summary) {
    return (
      <div className="overview-container">
        <PageHeader
          badgeText="Operational Command Center"
          badgeIcon={Shield}
          title="Fleet Readiness & Command Overview"
          subtitle="Real-time telemetry, predictive failure risk, TreeSHAP causal attribution, and operational clearance."
        />
        <LoadingState
          message="Synchronizing SentinelAI Fleet Command..."
          subtext="Loading real-time readiness index, critical subsystems, and anomaly distributions from Neon PostgreSQL."
          minHeight="340px"
        />
      </div>
    );
  }

  if (error && !summary) {
    return (
      <div className="overview-container">
        <PageHeader
          badgeText="Operational Command Center"
          badgeIcon={Shield}
          title="Fleet Readiness & Command Overview"
          subtitle="Real-time telemetry, predictive failure risk, TreeSHAP causal attribution, and operational clearance."
        />
        <div className="error-card" style={{ padding: '24px', backgroundColor: 'var(--color-bg-subtle)', borderRadius: '8px', border: '1px solid var(--color-danger-border)', margin: '20px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-danger)', marginBottom: '8px' }}>
            <AlertOctagon size={20} />
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Command Engine Unreachable</h3>
          </div>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', margin: '0 0 16px' }}>{error}</p>
          <button className="primary-btn" onClick={() => loadData(true)}>
            <RefreshCw size={14} />
            <span>Retry Connection</span>
          </button>
        </div>
      </div>
    );
  }

  const dist = summary?.status_distribution || { READY: 0, ATTENTION: 0, NOT_READY: 0 };
  const riskSum = summary?.component_risk_summary || { critical_components: 0, high_priority_components: 0, anomalous_components: 0 };

  return (
    <div className="overview-container">
      {/* 1. Header with Working Manual Refresh */}
      <PageHeader
        badgeText="Operational Command Center"
        badgeIcon={Shield}
        title="Fleet Readiness & Command Overview"
        subtitle="Real-time telemetry, predictive failure risk, TreeSHAP causal attribution, and operational clearance."
        actions={
          <button
            className="secondary-btn"
            onClick={() => loadData(true)}
            disabled={isRefreshing || loading}
            title="Force refresh data directly from Neon database"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        }
      />

      {/* 2. Top-Level Fleet KPIs with Distinct Contrast Colors */}
      <div className="grid-kpi">
        <KpiCard
          title="Fleet Readiness Rate"
          value={summary?.readiness_rate_percent !== undefined ? `${summary.readiness_rate_percent}%` : '68.0%'}
          subtitle={`${summary?.total_assets || 50} Tactical Assets Registered`}
          icon={ShieldCheck}
          variant="ready"
          loading={loading}
        />
        <KpiCard
          title="Grounded (Not Ready)"
          value={dist.NOT_READY}
          subtitle="Ground Hold / Imminent Risk"
          icon={AlertOctagon}
          variant="critical"
          loading={loading}
        />
        <KpiCard
          title="Critical Subsystems"
          value={riskSum.critical_components}
          subtitle="Urgent depot intervention"
          icon={AlertTriangle}
          variant="caution"
          loading={loading}
        />
        <KpiCard
          title="Active Sensor Anomalies"
          value={riskSum.anomalous_components}
          subtitle="HUMS telemetry deviations"
          icon={Radio}
          variant="cyan"
          loading={loading}
        />
      </div>

      {/* 3. Main Grid: AI Copilot Suggestions Launcher + Anomaly Breakdown */}
      <div className="grid-8-4">
        {/* Left: AI Copilot Suggestions & Quick Navigation (No Inline Chatbot) */}
        <div className="sentinel-card">
          <div className="card-header-row">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} style={{ color: 'var(--color-primary)' }} />
                <h2 className="card-title">AI Copilot Decision Support</h2>
              </div>
              <p className="card-subtitle">
                Deterministic tactical decision support powered by Neon PostgreSQL &amp; TreeSHAP inference.
              </p>
            </div>
            <button
              className="primary-btn"
              onClick={() => onNavigateCopilot && onNavigateCopilot()}
              style={{ fontSize: '12px', padding: '6px 14px' }}
            >
              <Bot size={14} />
              <span>Launch AI Copilot</span>
              <ChevronRight size={14} />
            </button>
          </div>

          <div style={{ marginTop: '16px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)', display: 'block', marginBottom: '8px' }}>
              Select an Operational Question to Inquire:
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px' }}>
              {suggestedQuestions.map((q, idx) => (
                <div
                  key={idx}
                  className="suggested-inquest-card"
                  onClick={() => onNavigateCopilot && onNavigateCopilot(q)}
                  style={{
                    padding: '12px 14px',
                    backgroundColor: 'var(--color-bg-subtle)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.18s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px'
                  }}
                  title="Click to ask AI Copilot"
                >
                  <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text)' }}>
                    "{q}"
                  </span>
                  <ChevronRight size={14} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Subsystem Anomaly Numerical Breakdown */}
        <div className="sentinel-card">
          <div className="card-header-row">
            <div>
              <h2 className="card-title">Subsystem Anomaly Breakdown</h2>
              <p className="card-subtitle">Deviations by component architecture</p>
            </div>
            <Cpu size={18} style={{ color: 'var(--color-text-muted)' }} />
          </div>

          <div style={{ margin: '14px 0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {Object.entries(anomalyBySubsystem).map(([type, count]) => {
              const isTop = type === mostAnomalousSubsystem[0] && count > 0;
              const percent = totalSubsystemAnomalies > 0 ? Math.round((count / totalSubsystemAnomalies) * 100) : 0;

              return (
                <div
                  key={type}
                  style={{
                    padding: '10px 12px',
                    backgroundColor: 'var(--color-bg-subtle)',
                    borderRadius: '6px',
                    borderLeft: isTop ? '3px solid var(--color-danger)' : '3px solid var(--color-border-bright)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text)' }}>
                      {type}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 800, fontSize: '15px', color: isTop ? 'var(--color-danger)' : 'var(--color-text)' }}>
                        {count}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>({percent}%)</span>
                    </div>
                  </div>
                  <div style={{ width: '100%', height: '4px', backgroundColor: 'var(--color-border)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${percent}%`,
                        height: '100%',
                        backgroundColor: isTop ? 'var(--color-danger)' : 'var(--color-text-secondary)'
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid var(--color-border)', fontSize: '11px', color: 'var(--color-text-muted)' }}>
            <strong>Highest Vulnerability:</strong> {mostAnomalousSubsystem[0]} ({mostAnomalousSubsystem[1]} deviations).
          </div>
        </div>
      </div>

      {/* 4. Streamlined Priority Assets Requiring Immediate Fix (Fix First Table) */}
      <div className="sentinel-card" style={{ marginTop: '20px' }}>
        <div className="card-header-row" style={{ marginBottom: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertOctagon size={18} style={{ color: 'var(--color-danger)' }} />
              <h2 className="card-title">Priority Assets Requiring Immediate Fix</h2>
            </div>
            <p className="card-subtitle">
              Assets sorted by highest failure probability. Select an asset to immediately review and dispatch maintenance.
            </p>
          </div>
        </div>

        {topPriorityAssetsToFix.length === 0 ? (
          <EmptyState
            title="All Components Within Safe Envelope"
            description="Zero components currently trigger critical maintenance priority."
            icon={ShieldCheck}
          />
        ) : (
          <div className="table-wrapper">
            <table className="sentinel-table">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>Priority</th>
                  <th>Asset ID</th>
                  <th>Subsystem Component</th>
                  <th>Failure Risk</th>
                  <th>Primary Failure Reason</th>
                  <th style={{ textAlign: 'right' }}>Direct Action</th>
                </tr>
              </thead>
              <tbody>
                {topPriorityAssetsToFix.map((c, idx) => (
                  <tr key={c.component_id || idx}>
                    <td>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: 'var(--color-danger-dim)',
                          color: 'var(--color-danger)',
                          border: '1px solid var(--color-danger-border)',
                          fontFamily: 'var(--font-family-mono)'
                        }}
                      >
                        #{idx + 1} FIX
                      </span>
                    </td>
                    <td>
                      <strong style={{ fontFamily: 'var(--font-family-mono)', color: 'var(--color-text)', fontSize: '14px' }}>
                        {c.asset_id}
                      </strong>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 600 }}>{c.component_type}</span>
                        <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-family-mono)' }}>
                          ({c.component_id})
                        </span>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 800, color: 'var(--color-danger)', fontSize: '15px' }}>
                        {c.failure_probability}%
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text)' }}>
                        {c.primary_reason || 'Critical sensor degradation detected'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="primary-btn"
                        style={{ height: '30px', padding: '0 12px', fontSize: '12px' }}
                        onClick={() => onInspectAsset && onInspectAsset(c.asset_id)}
                      >
                        <span>Fix Asset</span>
                        <ChevronRight size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
