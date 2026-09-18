import React, { useState, useEffect, useCallback } from 'react';
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
  Send,
  ChevronRight,
  Cpu,
  Layers,
  Radio
} from 'lucide-react';
import {
  getDashboardSummary,
  getCriticalComponents,
  getHighPriorityComponents
} from '../../api/dashboard';
import { askCopilotQuery } from '../../api/copilot';
import { PageHeader, KpiCard, StatusBadge, RiskBadge, LoadingState, EmptyState } from '../common/UIComponents';

export default function OverviewView({ onInspectAsset, onAnalyzeComponent, onNavigateCopilot }) {
  const [summary, setSummary] = useState(null);
  const [criticalComponents, setCriticalComponents] = useState([]);
  const [highPriorityComponents, setHighPriorityComponents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // AI Copilot Quick Query State
  const [queryText, setQueryText] = useState('');
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [copilotResponse, setCopilotResponse] = useState(null);
  const [copilotError, setCopilotError] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
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
    }
  }, []);

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener('sentinel:data-updated', handleUpdate);
    return () => window.removeEventListener('sentinel:data-updated', handleUpdate);
  }, [loadData]);

  const handleCopilotSubmit = async (text) => {
    const q = text || queryText;
    if (!q.trim()) return;

    setCopilotLoading(true);
    setCopilotError(null);
    try {
      const res = await askCopilotQuery(q);
      setCopilotResponse(res);
    } catch (err) {
      console.error('Copilot query error:', err);
      setCopilotError(err.message || 'AI Copilot query failed.');
    } finally {
      setCopilotLoading(false);
    }
  };

  const suggestedQuestions = [
    'Which assets need immediate attention?',
    'Which assets are NOT mission-ready?',
    'Which assets have highest failure risk?',
    'What is happening across the fleet?'
  ];

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
          message="Connecting to SentinelAI Fleet Engine..."
          subtext="Loading verified fleet summary, critical components, and operational readiness distribution."
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
        <div className="error-card" style={{ padding: '24px', backgroundColor: 'var(--color-bg-subtle)', borderRadius: '8px', border: '1px solid var(--color-danger-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-danger)', marginBottom: '8px' }}>
            <AlertOctagon size={20} />
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Fleet Telemetry Unavailable</h3>
          </div>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', margin: '0 0 16px' }}>{error}</p>
          <button className="primary-btn" onClick={loadData}>
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
      {/* 1. Header */}
      <PageHeader
        badgeText="Operational Command Center"
        badgeIcon={Shield}
        title="Fleet Readiness & Command Overview"
        subtitle="Real-time telemetry, predictive failure risk, TreeSHAP causal attribution, and operational clearance."
        actions={
          <button
            className="secondary-btn"
            onClick={loadData}
            disabled={loading}
            title="Refresh Fleet Data"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        }
      />

      {/* 2. Top-Level Fleet KPIs (Backend Driven) */}
      <div className="grid-kpi">
        <KpiCard
          title="Fleet Readiness Rate"
          value={summary?.readiness_rate_percent !== undefined ? `${summary.readiness_rate_percent}%` : '--'}
          subtitle={`${summary?.total_assets || 0} Total Tactical Assets`}
          icon={ShieldCheck}
          variant="ready"
          loading={loading}
        />
        <KpiCard
          title="Not Ready Assets"
          value={dist.NOT_READY}
          subtitle="Ground Hold / Imminent Risk"
          icon={AlertOctagon}
          variant="critical"
          loading={loading}
        />
        <KpiCard
          title="Critical Components"
          value={riskSum.critical_components}
          subtitle="Immediate depot intervention"
          icon={AlertTriangle}
          variant="caution"
          loading={loading}
        />
        <KpiCard
          title="Active Sensor Anomalies"
          value={riskSum.anomalous_components}
          subtitle="HUMS telemetry deviations"
          icon={Radio}
          variant="default"
          loading={loading}
        />
      </div>

      {/* 3. Main Grid: AI Copilot Inquest & Status Distribution */}
      <div className="grid-8-4">
        {/* Left: AI Copilot Inquest Module */}
        <div className="sentinel-card">
          <div className="card-header-row">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} style={{ color: 'var(--color-primary)' }} />
                <h2 className="card-title">AI Copilot &amp; Decision Support</h2>
              </div>
              <p className="card-subtitle">
                Natural-language operational queries answered directly from live PostgreSQL telemetry &amp; TreeSHAP models.
              </p>
            </div>
          </div>

          <div className="copilot-query-box" style={{ marginTop: '14px' }}>
            <div className="copilot-input-row">
              <Search size={16} style={{ color: 'var(--color-text-muted)' }} />
              <input
                type="text"
                className="copilot-input"
                placeholder="Ask an operational question (e.g. Which assets need immediate attention?)"
                value={queryText}
                onChange={(e) => setQueryText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCopilotSubmit()}
              />
              <button
                className="primary-btn"
                style={{ height: '32px', padding: '0 14px', fontSize: '12px' }}
                onClick={() => handleCopilotSubmit()}
                disabled={copilotLoading}
              >
                {copilotLoading ? 'Analyzing...' : 'Inquire'}
                <Send size={13} style={{ marginLeft: '6px' }} />
              </button>
            </div>

            <div className="suggested-chips-scroll" style={{ marginTop: '10px' }}>
              {suggestedQuestions.map((q, idx) => (
                <button
                  key={idx}
                  className="suggested-chip"
                  onClick={() => {
                    setQueryText(q);
                    handleCopilotSubmit(q);
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {copilotLoading && (
            <div style={{ marginTop: '16px' }}>
              <LoadingState
                message="AI Copilot Synthesizing Fleet Telemetry..."
                subtext="Evaluating failure probability horizons and component TreeSHAP attributions"
                size="sm"
              />
            </div>
          )}

          {copilotError && (
            <div style={{ marginTop: '14px', padding: '12px', backgroundColor: 'var(--color-danger-dim)', borderRadius: '6px', color: 'var(--color-danger)', fontSize: '13px' }}>
              {copilotError}
            </div>
          )}

          {copilotResponse && !copilotLoading && (
            <div className="copilot-answer-card" style={{ marginTop: '16px', padding: '16px', backgroundColor: 'var(--color-bg-subtle)', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Intent: <strong>{copilotResponse.intent}</strong> &bull; Confidence: {(copilotResponse.confidence * 100).toFixed(0)}%
                </span>
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                  {new Date(copilotResponse.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <p style={{ fontSize: '14px', lineHeight: '1.5', margin: '0 0 12px', color: 'var(--color-text)' }}>
                {copilotResponse.answer}
              </p>

              {copilotResponse.evidence && copilotResponse.evidence.length > 0 && (
                <div style={{ borderTop: '1px solid var(--color-border-subtle)', paddingTop: '10px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                    Evidence Attribution:
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {copilotResponse.evidence.slice(0, 3).map((ev, i) => (
                      <div key={i} style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                        <strong>[{ev.source}]</strong> {ev.explanation}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Real Status Distribution Breakdown */}
        <div className="sentinel-card">
          <div className="card-header-row">
            <div>
              <h2 className="card-title">Operational Readiness</h2>
              <p className="card-subtitle">Active fleet readiness posture</p>
            </div>
            <Activity size={18} style={{ color: 'var(--color-text-muted)' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', margin: '14px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: 'var(--color-bg-subtle)', borderRadius: '6px', borderLeft: '3px solid var(--color-success)' }}>
              <div>
                <span style={{ fontSize: '13px', fontWeight: 600, display: 'block' }}>READY</span>
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Full sortie clearance</span>
              </div>
              <span style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 800, color: 'var(--color-success)', fontSize: '20px' }}>
                {dist.READY}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: 'var(--color-bg-subtle)', borderRadius: '6px', borderLeft: '3px solid var(--color-warning)' }}>
              <div>
                <span style={{ fontSize: '13px', fontWeight: 600, display: 'block' }}>ATTENTION</span>
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Moderate warning detected</span>
              </div>
              <span style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 800, color: 'var(--color-warning)', fontSize: '20px' }}>
                {dist.ATTENTION}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: 'var(--color-bg-subtle)', borderRadius: '6px', borderLeft: '3px solid var(--color-danger)' }}>
              <div>
                <span style={{ fontSize: '13px', fontWeight: 600, display: 'block' }}>NOT READY</span>
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Critical threshold breach</span>
              </div>
              <span style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 800, color: 'var(--color-danger)', fontSize: '20px' }}>
                {dist.NOT_READY}
              </span>
            </div>
          </div>

          <div style={{ marginTop: 'auto', paddingTop: '14px', borderTop: '1px solid var(--color-border)', fontSize: '11px', color: 'var(--color-text-muted)' }}>
            Total 200 components across 50 assets monitored via Neon DB.
          </div>
        </div>
      </div>

      {/* 4. Priority Components Attention Queue */}
      <div className="sentinel-card" style={{ marginTop: '20px' }}>
        <div className="card-header-row" style={{ marginBottom: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertOctagon size={18} style={{ color: 'var(--color-danger)' }} />
              <h2 className="card-title">Critical Components Requiring Immediate Intervention</h2>
            </div>
            <p className="card-subtitle">
              Components identified by failure prediction models (&gt;75% failure risk or elevated vibration/thermal spikes).
            </p>
          </div>
        </div>

        {criticalComponents.length === 0 ? (
          <EmptyState
            title="All Components Within Tolerance"
            description="Zero components currently trigger critical maintenance priority."
            icon={ShieldCheck}
          />
        ) : (
          <div className="table-wrapper">
            <table className="sentinel-table">
              <thead>
                <tr>
                  <th>Component ID</th>
                  <th>Type</th>
                  <th>Parent Asset</th>
                  <th>Failure Risk</th>
                  <th>Health Score</th>
                  <th>Priority Level</th>
                  <th>Primary SHAP Driver</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {criticalComponents.slice(0, 8).map((c) => (
                  <tr key={c.component_id}>
                    <td>
                      <strong style={{ fontFamily: 'var(--font-family-mono)', color: 'var(--color-text)' }}>
                        {c.component_id}
                      </strong>
                    </td>
                    <td>{c.component_type}</td>
                    <td>
                      <button
                        className="btn-link"
                        style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 600 }}
                        onClick={() => onInspectAsset && onInspectAsset(c.asset_id)}
                      >
                        {c.asset_id}
                      </button>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 700, color: 'var(--color-danger)' }}>
                        {c.failure_probability}%
                      </span>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 700, color: c.health_score < 50 ? 'var(--color-danger)' : 'var(--color-warning)' }}>
                        {c.health_score} / 100
                      </span>
                    </td>
                    <td>
                      <RiskBadge risk={c.priority_level} size="sm" />
                    </td>
                    <td>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text)' }}>
                        {c.primary_reason}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="secondary-btn"
                        style={{ height: '28px', padding: '0 10px', fontSize: '11px' }}
                        onClick={() => onAnalyzeComponent && onAnalyzeComponent(c.component_id)}
                      >
                        <span>Analyze</span>
                        <ChevronRight size={13} />
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
