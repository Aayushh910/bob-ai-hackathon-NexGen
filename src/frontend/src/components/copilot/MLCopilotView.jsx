import React, { useState, useEffect, useCallback } from 'react';
import {
  BrainCircuit,
  Shield,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  AlertOctagon,
  Cpu,
  Activity,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  ChevronRight,
  Eye,
  CheckCircle2,
  Info
} from 'lucide-react';
import { getDashboardSummary } from '../../api/dashboard';
import { askCopilotQuery, getSupportedIntents } from '../../api/copilot';
import { PageHeader, KpiCard, StatusBadge, RiskBadge, LoadingState, EmptyState } from '../common/UIComponents';
import ErrorMessage from '../common/ErrorMessage';

export default function MLCopilotView({ onInspectAsset }) {
  const [summary, setSummary] = useState(null);
  const [copilotResponse, setCopilotResponse] = useState(null);
  const [queryInput, setQueryInput] = useState('Which assets need immediate attention?');
  const [isLoadingQuery, setIsLoadingQuery] = useState(false);
  const [isLoadingOverview, setIsLoadingOverview] = useState(true);
  const [error, setError] = useState(null);
  const [supportedIntents, setSupportedIntents] = useState([]);

  // Suggested operational question chips
  const suggestedQuestions = [
    'Which assets need immediate attention?',
    'Which assets are NOT mission-ready?',
    'Which assets have highest failure risk?',
    'What is happening across the fleet?',
    'Why is asset A035 not ready?'
  ];

  const loadOverview = useCallback(async () => {
    setIsLoadingOverview(true);
    setError(null);
    try {
      const [sumData, intentsData] = await Promise.all([
        getDashboardSummary(),
        getSupportedIntents().catch(() => ({ intents: [] }))
      ]);
      const safeIntents = Array.isArray(intentsData?.intents)
        ? intentsData.intents
        : (Array.isArray(intentsData) ? intentsData : []);
      setSummary(sumData);
      setSupportedIntents(safeIntents);
    } catch (err) {
      console.error('Failed to load summary for AI Copilot:', err);
      setError(err.message || 'Failed to load fleet command intelligence.');
    } finally {
      setIsLoadingOverview(false);
    }
  }, []);

  const handleRunQuery = async (queryText) => {
    const textToRun = queryText || queryInput;
    if (!textToRun.trim()) return;

    setIsLoadingQuery(true);
    setError(null);
    try {
      const result = await askCopilotQuery(textToRun);
      setCopilotResponse(result);
    } catch (err) {
      console.error('Failed to query AI Copilot:', err);
      setError(err.message || 'Failed to process AI Copilot inquest.');
    } finally {
      setIsLoadingQuery(false);
    }
  };

  useEffect(() => {
    loadOverview();
    handleRunQuery('Which assets need immediate attention?');
  }, [loadOverview]);

  const dist = summary?.status_distribution || { READY: 0, ATTENTION: 0, NOT_READY: 0 };
  const riskSum = summary?.component_risk_summary || { critical_components: 0, high_priority_components: 0, anomalous_components: 0 };

  return (
    <div className="copilot-container">
      {/* 1. Header */}
      <PageHeader
        badgeText="Operational Decision Support"
        badgeIcon={BrainCircuit}
        title="AI Copilot — Operational Command Support"
        subtitle="Deterministic decision intelligence synthesizing multi-sensor telemetry, ML predictions, HUMS anomalies, and TreeSHAP feature attributions."
        actions={
          <button
            className="secondary-btn"
            onClick={() => {
              loadOverview();
              handleRunQuery(queryInput);
            }}
            disabled={isLoadingOverview || isLoadingQuery}
            title="Refresh AI Copilot"
          >
            <RefreshCw size={14} className={isLoadingOverview || isLoadingQuery ? 'animate-spin' : ''} />
            <span>Refresh Intelligence</span>
          </button>
        }
      />

      {error && <ErrorMessage message={error} onRetry={() => handleRunQuery(queryInput)} />}

      {/* 2. Top Overview KPI Cards */}
      <div className="grid-kpi">
        <KpiCard
          title="Fleet Readiness Rate"
          value={summary?.readiness_rate_percent !== undefined ? `${summary.readiness_rate_percent}%` : '--'}
          subtitle={`${summary?.total_assets || 0} Total Assets Monitored`}
          icon={ShieldCheck}
          variant="ready"
          loading={isLoadingOverview}
        />
        <KpiCard
          title="Grounded / Not Ready"
          value={dist.NOT_READY}
          subtitle="Critical threshold breaches"
          icon={AlertOctagon}
          variant="critical"
          loading={isLoadingOverview}
        />
        <KpiCard
          title="Attention Queue"
          value={dist.ATTENTION}
          subtitle="Moderate warning indicators"
          icon={AlertTriangle}
          variant="caution"
          loading={isLoadingOverview}
        />
        <KpiCard
          title="Active Sensor Anomalies"
          value={riskSum.anomalous_components}
          subtitle="Out-of-envelope sensor streams"
          icon={Activity}
          variant="default"
          loading={isLoadingOverview}
        />
      </div>

      {/* 3. Interactive AI Copilot Query Box */}
      <div className="sentinel-card" style={{ marginBottom: '20px' }}>
        <div className="card-header-row" style={{ marginBottom: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={18} style={{ color: 'var(--color-primary)' }} />
              <h3 className="card-title">AI Copilot Natural Query Interface</h3>
            </div>
            <p className="card-subtitle">
              Ask operational mission readiness, failure horizon, or asset-specific diagnostic questions.
            </p>
          </div>
        </div>

        <div className="copilot-query-box">
          <div className="copilot-input-row">
            <Search size={16} style={{ color: 'var(--color-text-muted)' }} />
            <input
              type="text"
              className="copilot-input"
              placeholder="Ask an operational question (e.g. Which assets have highest failure risk?)"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRunQuery(queryInput)}
            />
            <button
              className="primary-btn"
              style={{ height: '34px', padding: '0 16px', fontSize: '12px' }}
              onClick={() => handleRunQuery(queryInput)}
              disabled={isLoadingQuery}
            >
              {isLoadingQuery ? 'Analyzing...' : 'Inquire'}
              <Send size={13} style={{ marginLeft: '6px' }} />
            </button>
          </div>

          <div className="suggested-chips-scroll" style={{ marginTop: '12px' }}>
            {suggestedQuestions.map((q, idx) => (
              <button
                key={idx}
                className="suggested-chip"
                onClick={() => {
                  setQueryInput(q);
                  handleRunQuery(q);
                }}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4. AI Copilot Answer & Evidence Breakdown */}
      {isLoadingQuery ? (
        <div className="sentinel-card">
          <LoadingState
            message="AI Copilot Evaluating Telemetry Evidence..."
            subtext="Cross-referencing real-time component failure risks and TreeSHAP attributions in PostgreSQL"
            size="md"
            minHeight="220px"
          />
        </div>
      ) : copilotResponse ? (
        <div className="sentinel-card">
          {/* Answer Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', paddingBottom: '12px', borderBottom: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={16} style={{ color: 'var(--color-primary)' }} />
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Operational Assessment &bull; Intent: <strong>{copilotResponse.intent}</strong>
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                Confidence: {(copilotResponse.confidence * 100).toFixed(0)}%
              </span>
              <span style={{ fontSize: '11px', fontFamily: 'var(--font-family-mono)', color: 'var(--color-text-muted)' }}>
                {new Date(copilotResponse.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </div>

          {/* Primary Copilot Answer */}
          <div style={{ padding: '16px', backgroundColor: 'var(--color-bg-subtle)', borderRadius: '6px', borderLeft: '4px solid var(--color-primary)', marginBottom: '20px' }}>
            <p style={{ fontSize: '15px', lineHeight: '1.6', margin: 0, color: 'var(--color-text)' }}>
              {copilotResponse.answer}
            </p>
          </div>

          {/* Evidence Attribution & Related Assets Split */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            {/* Left: Evidence Points */}
            <div>
              <h4 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '10px' }}>
                Mathematical Telemetry Evidence
              </h4>
              {Array.isArray(copilotResponse.evidence) && copilotResponse.evidence.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {copilotResponse.evidence.map((ev, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '10px 12px',
                        backgroundColor: 'var(--color-bg-subtle)',
                        borderRadius: '6px',
                        border: '1px solid var(--color-border-subtle)',
                        fontSize: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 700, color: 'var(--color-text)', fontFamily: 'var(--font-family-mono)' }}>
                          [{ev.source}]
                        </span>
                        <span style={{ color: 'var(--color-text-muted)' }}>
                          {ev.metric}: {String(ev.value)}
                        </span>
                      </div>
                      <span style={{ color: 'var(--color-text-secondary)' }}>{ev.explanation}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>No additional evidence items.</div>
              )}
            </div>

            {/* Right: Related Assets Identified */}
            <div>
              <h4 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '10px' }}>
                Related Assets Identified ({Array.isArray(copilotResponse.related_assets) ? copilotResponse.related_assets.length : 0})
              </h4>
              {Array.isArray(copilotResponse.related_assets) && copilotResponse.related_assets.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {copilotResponse.related_assets.slice(0, 5).map((a, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        backgroundColor: 'var(--color-bg-subtle)',
                        borderRadius: '6px',
                        border: '1px solid var(--color-border-subtle)'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <strong style={{ fontFamily: 'var(--font-family-mono)', color: 'var(--color-text)', fontSize: '13px' }}>
                            {a.asset_code || `Asset #${a.asset_id}`}
                          </strong>
                          <StatusBadge status={a.readiness_state || 'NOT_READY'} size="sm" />
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                          {a.model || 'Tactical Asset'} &bull; {a.location || 'Fleet Sector'}
                        </span>
                      </div>

                      {onInspectAsset && (
                        <button
                          className="secondary-btn"
                          style={{ height: '26px', padding: '0 8px', fontSize: '11px' }}
                          onClick={() => onInspectAsset(a.asset_code || a.asset_id)}
                        >
                          <span>Inspect</span>
                          <ChevronRight size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>No specific assets isolated.</div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
