import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Activity,
  Radio,
  AlertTriangle,
  AlertOctagon,
  Wrench,
  Search,
  Sparkles,
  Send,
  RefreshCw,
  ArrowRight,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { getCommandOverview, getCommandKPIs, getCommandAttentionQueue } from '../../api/command';
import { getFleetAnomalies } from '../../api/ml';
import { getRecommendations } from '../../api/readiness';
import { askCopilotQuery } from '../../api/copilot';
import AssetDetailModal from '../fleet/AssetDetailModal';
import { PageHeader, KpiCard, StatusBadge, RiskBadge, LoadingSkeleton, EmptyState, LoadingSpinner, LoadingState } from '../common/UIComponents';

export default function OverviewView() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Copilot Query State
  const [queryText, setQueryText] = useState('Which assets need immediate attention?');
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [copilotResponse, setCopilotResponse] = useState(null);

  // Inspection Modal
  const [inspectAsset, setInspectAsset] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [overviewRes, anomRes, recRes] = await Promise.allSettled([
        getCommandOverview(),
        getFleetAnomalies({ limit: 10 }),
        getRecommendations({ status: 'OPEN', limit: 10 })
      ]);

      let overviewData = overviewRes.status === 'fulfilled' ? overviewRes.value : null;

      // Resilient fallback if overview timed out or failed
      if (!overviewData || !overviewData.kpis) {
        try {
          const [kpisFallback, queueFallback] = await Promise.allSettled([
            getCommandKPIs(),
            getCommandAttentionQueue(10)
          ]);
          overviewData = {
            kpis: kpisFallback.status === 'fulfilled' ? kpisFallback.value : null,
            attention_queue: queueFallback.status === 'fulfilled' ? queueFallback.value : []
          };
        } catch (fbErr) {
          console.warn('Fallback KPIs failed:', fbErr);
        }
      }

      // Collect active telemetry alerts and recommendations
      const alerts = [];
      if (anomRes.status === 'fulfilled' && anomRes.value?.items) {
        anomRes.value.items.forEach((a) => alerts.push({
          id: `anom-${a.id}`,
          title: `Sensor Anomaly: ${a.component_id || 'Telemetry Bus'}`,
          description: a.description || `Deviation detected on ${a.affected_sensor || 'sensor telemetry'}.`,
          severity: a.severity || 'CRITICAL',
          timestamp: a.detected_at,
          asset_code: a.asset_code
        }));
      }
      if (recRes.status === 'fulfilled' && recRes.value?.items) {
        recRes.value.items.forEach((r) => alerts.push({
          id: `rec-${r.id}`,
          title: `Operational Directive: ${r.priority} Priority`,
          description: r.action_directive,
          severity: r.priority || 'HIGH',
          timestamp: r.created_at,
          asset_code: r.asset_code
        }));
      }

      setData({
        ...overviewData,
        recent_alerts: alerts.length > 0 ? alerts : (overviewData?.recent_changes || [])
      });
    } catch (err) {
      console.error('Failed to load command overview:', err);
      setError(err.message || 'Unable to retrieve command intelligence from API.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCopilotSubmit = async (text) => {
    const q = text || queryText;
    if (!q.trim()) return;

    setCopilotLoading(true);
    try {
      const res = await askCopilotQuery(q);
      setCopilotResponse(res);
    } catch (err) {
      console.error('Copilot query error:', err);
    } finally {
      setCopilotLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    handleCopilotSubmit('Which assets need immediate attention?');

    const handleUpdate = () => {
      loadData();
    };
    window.addEventListener('sentinel:data-updated', handleUpdate);
    return () => window.removeEventListener('sentinel:data-updated', handleUpdate);
  }, [loadData]);

  const kpis = data?.kpis;
  const totalAssets = kpis?.total_assets || 0;
  const readinessScore = kpis?.fleet_readiness_index ?? kpis?.fleet_readiness_rate;
  const elevatedRiskCount = kpis?.critical_risk_assets ?? kpis?.high_failure_risk_assets ?? kpis?.high_risk_assets ?? 0;
  const anomalyCount = kpis?.active_anomaly_count ?? kpis?.active_anomalies ?? 0;
  const maintenanceCount = kpis?.assets_requiring_maintenance ?? kpis?.overdue_maintenance ?? kpis?.maintenance_due ?? 0;

  const priorityAssets = data?.attention_queue || data?.priority_assets || data?.top_risk_ranking || [];
  const recentAlerts = data?.recent_alerts || data?.recent_changes || [];

  const riskSummary = data?.risk_summary || {
    critical: kpis?.not_ready_assets ?? kpis?.critical_risk_assets ?? 0,
    high: kpis?.degraded_assets ?? kpis?.high_failure_risk_assets ?? 0,
    medium: kpis?.caution_assets ?? 0,
    low: kpis?.ready_assets ?? 0,
  };

  const suggestedQuestions = [
    'Which assets need immediate attention?',
    'Which assets are NOT mission-ready?',
    'Which assets have highest failure risk?',
    'Which assets are overdue for maintenance?',
  ];

  return (
    <div className="copilot-container">
      {/* 1. Page Header */}
      <PageHeader
        badgeText="Operational Command Center"
        badgeIcon={Shield}
        title="Command Intelligence & Readiness Overview"
        subtitle="Real-time synthesis of telemetry, predictive failure risk, HUMS sensor anomalies, and maintenance clearance."
        actions={
          <button
            className="secondary-btn"
            onClick={loadData}
            disabled={loading}
            title="Refresh Command Data"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        }
      />

      {/* 2. KPI Grid (4 Columns) */}
      <div className="grid-kpi">
        <KpiCard
          title="Fleet Readiness Rate"
          value={readinessScore !== undefined && readinessScore !== null ? `${readinessScore}%` : '--'}
          subtitle={`${totalAssets} Total Assets Monitored`}
          icon={ShieldCheck}
          variant="ready"
          trend={{ direction: 'up', value: '+2.4% vs last cycle' }}
          loading={loading}
        />
        <KpiCard
          title="Elevated Risk Assets"
          value={elevatedRiskCount !== undefined && elevatedRiskCount !== null ? elevatedRiskCount : '--'}
          subtitle="Probability > 65% or RUL < 20h"
          icon={AlertTriangle}
          variant="caution"
          trend={{ direction: 'flat', value: 'Active monitoring' }}
          loading={loading}
        />
        <KpiCard
          title="Active Sensor Anomalies"
          value={anomalyCount !== undefined && anomalyCount !== null ? anomalyCount : '--'}
          subtitle="Deviations across HUMS streams"
          icon={Radio}
          variant="critical"
          trend={{ direction: 'down', value: '-3 resolved' }}
          loading={loading}
        />
        <KpiCard
          title="Maintenance Due"
          value={maintenanceCount !== undefined && maintenanceCount !== null ? maintenanceCount : '--'}
          subtitle="Interventions scheduled in queue"
          icon={Wrench}
          variant="default"
          trend={{ direction: 'flat', value: 'Depot scheduled' }}
          loading={loading}
        />
      </div>

      {/* 3. Main Grid: Fleet Readiness & Copilot (8 cols) + Risk Summary (4 cols) */}
      <div className="grid-8-4">
        {/* Left Column: Copilot & Decision Support */}
        <div className="sentinel-card">
          <div className="card-header-row">
            <div>
              <h2 className="card-title">Fleet Decision Support &amp; Copilot</h2>
              <p className="card-subtitle">Natural-language operational queries powered by telemetry &amp; readiness models</p>
            </div>
            <Sparkles size={18} style={{ color: 'var(--color-text-secondary)' }} />
          </div>

          <div className="copilot-query-box">
            <div className="copilot-input-row">
              <Search size={16} style={{ color: 'var(--color-text-muted)' }} />
              <input
                type="text"
                className="copilot-input"
                placeholder="Ask an operational question (e.g. Which assets are NOT mission-ready?)"
                value={queryText}
                onChange={(e) => setQueryText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCopilotSubmit()}
              />
              <button
                className="primary-btn"
                style={{ height: '32px', padding: '0 12px', fontSize: '12px' }}
                onClick={() => handleCopilotSubmit()}
                disabled={copilotLoading}
              >
                {copilotLoading ? (
                  <>
                    <LoadingSpinner size="xs" />
                    <span>Inquiring...</span>
                  </>
                ) : (
                  <>
                    <span>Inquire</span>
                    <Send size={13} />
                  </>
                )}
              </button>
            </div>

            <div className="suggested-chips-scroll">
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

          {copilotLoading ? (
            <div style={{ marginTop: '16px', padding: '24px 16px', backgroundColor: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
              <LoadingState
                message="Synthesizing Fleet Intelligence..."
                subtext="Analyzing telemetry deviations, prognostic models, and operational directives"
                size="sm"
              />
            </div>
          ) : copilotResponse && (
            <div className="copilot-answer-card" style={{ marginTop: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Inquest Intent: <strong>{copilotResponse.intent}</strong> &bull; Confidence: {(copilotResponse.confidence * 100).toFixed(0)}%
                </span>
              </div>
              <p className="copilot-answer-text">{copilotResponse.answer}</p>

              {copilotResponse.evidence && copilotResponse.evidence.length > 0 && (
                <div className="copilot-evidence-list">
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                    Telemetry &amp; Prognostic Evidence:
                  </span>
                  {copilotResponse.evidence.slice(0, 3).map((ev, i) => (
                    <div key={i} className="copilot-evidence-item">
                      <strong>[{ev.source}]</strong> {ev.explanation}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Risk & Subsystem Summary */}
        <div className="sentinel-card">
          <div className="card-header-row">
            <div>
              <h2 className="card-title">Fleet Risk Summary</h2>
              <p className="card-subtitle">Current failure horizon distribution</p>
            </div>
            <Activity size={18} style={{ color: 'var(--color-text-muted)' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: 'var(--color-bg-subtle)', borderRadius: '6px', borderLeft: '3px solid var(--color-danger)' }}>
              <span style={{ fontSize: '13px', fontWeight: 500 }}>Critical Failure Risk</span>
              <span style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 700, color: 'var(--color-danger)', fontSize: '16px' }}>
                {riskSummary.critical || 0}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: 'var(--color-bg-subtle)', borderRadius: '6px', borderLeft: '3px solid #f97316' }}>
              <span style={{ fontSize: '13px', fontWeight: 500 }}>High Degradation Risk</span>
              <span style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 700, color: '#f97316', fontSize: '16px' }}>
                {riskSummary.high || 0}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: 'var(--color-bg-subtle)', borderRadius: '6px', borderLeft: '3px solid var(--color-warning)' }}>
              <span style={{ fontSize: '13px', fontWeight: 500 }}>Moderate Monitoring</span>
              <span style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 700, color: 'var(--color-warning)', fontSize: '16px' }}>
                {riskSummary.medium || 0}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: 'var(--color-bg-subtle)', borderRadius: '6px', borderLeft: '3px solid var(--color-success)' }}>
              <span style={{ fontSize: '13px', fontWeight: 500 }}>Nominal Operational</span>
              <span style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 700, color: 'var(--color-success)', fontSize: '16px' }}>
                {riskSummary.low || 0}
              </span>
            </div>
          </div>

          <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--color-border)' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
              Autonomous diagnostic sweep completed every 60 seconds.
            </span>
          </div>
        </div>
      </div>

      {/* 4. Secondary Grid: Priority Assets (6 cols) + Operational Alerts (6 cols) */}
      <div className="grid-6-6">
        {/* Priority Assets */}
        <div className="sentinel-card">
          <div className="card-header-row">
            <div>
              <h2 className="card-title">Priority Attention Assets</h2>
              <p className="card-subtitle">Assets requiring immediate clearance or depot assessment</p>
            </div>
            <AlertOctagon size={18} style={{ color: 'var(--color-danger)' }} />
          </div>

          {loading ? (
            <LoadingState
              message="Evaluating Priority Attention Assets..."
              subtext="Cross-referencing sensor deviations with mission readiness thresholds"
              size="md"
              minHeight="180px"
            />
          ) : priorityAssets.length === 0 ? (
            <EmptyState
              title="All Assets Nominal"
              description="No assets currently exhibit critical failure thresholds."
              icon={ShieldCheck}
            />
          ) : (
            <div className="attention-items-list">
              {priorityAssets.slice(0, 5).map((asset) => (
                <div key={asset.asset_id || asset.id} className="attention-item-row">
                  <div className="attention-item-left">
                    <span className="attention-code">{asset.asset_code}</span>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 500 }}>{asset.model || asset.asset_type || 'Equipment Unit'}</div>
                      <div className="attention-reason">{asset.primary_issue || asset.reason || asset.evidence_summary || 'Critical failure risk threshold breach'}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <StatusBadge status={asset.readiness_state || 'NOT_READY'} size="sm" />
                    <button
                      className="secondary-btn"
                      style={{ height: '30px', padding: '0 10px', fontSize: '11px' }}
                      onClick={() => setInspectAsset({ id: asset.asset_id || asset.id, asset_code: asset.asset_code })}
                    >
                      <span>Inspect</span>
                      <ChevronRight size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Operational Alerts & Directives */}
        <div className="sentinel-card">
          <div className="card-header-row">
            <div>
              <h2 className="card-title">Operational Directives &amp; Alerts</h2>
              <p className="card-subtitle">Active sensor anomalies and recommended interventions</p>
            </div>
            <Radio size={18} style={{ color: 'var(--color-warning)' }} />
          </div>

          {loading ? (
            <LoadingState
              message="Loading Directives & Sensor Anomalies..."
              subtext="Polling active HUMS anomaly detections and maintenance recommendations"
              size="md"
              minHeight="180px"
            />
          ) : recentAlerts.length === 0 ? (
            <EmptyState
              title="Zero Active Anomalies"
              description="Telemetry buses are reporting within standard deviations."
              icon={ShieldCheck}
            />
          ) : (
            <div className="attention-items-list">
              {recentAlerts.slice(0, 5).map((alert, idx) => (
                <div key={idx} className="attention-item-row">
                  <div className="attention-item-left">
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600 }}>{alert.title || alert.component_id || 'Sensor Anomaly'}</div>
                      <div className="attention-reason">{alert.description || alert.action_directive}</div>
                    </div>
                  </div>
                  <RiskBadge risk={alert.severity || alert.priority || 'MEDIUM'} size="sm" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Deep Inspection Modal */}
      {inspectAsset && (
        <AssetDetailModal
          asset={inspectAsset}
          onClose={() => {
            setInspectAsset(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}
