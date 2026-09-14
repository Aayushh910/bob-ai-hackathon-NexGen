import React, { useState, useEffect, useCallback } from 'react';
import {
  BrainCircuit,
  Shield,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Cpu,
  Activity,
  RefreshCw,
  Layers,
  ArrowRight,
  Clock,
  HelpCircle,
  Search,
  SlidersHorizontal,
  Send,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Compass,
  FileText,
  Wrench,
  ChevronRight
} from 'lucide-react';
import { getCommandOverview, getCommandKPIs } from '../../api/command';
import { askCopilotQuery, getSupportedIntents } from '../../api/copilot';
import AssetDetailModal from '../fleet/AssetDetailModal';
import { LoadingSpinner, LoadingState } from '../common/UIComponents';
import ErrorMessage from '../common/ErrorMessage';

export default function MLCopilotView() {
  const [commandData, setCommandData] = useState(null);
  const [copilotResponse, setCopilotResponse] = useState(null);
  const [queryInput, setQueryInput] = useState('Which assets need immediate attention?');
  const [isLoadingQuery, setIsLoadingQuery] = useState(false);
  const [isLoadingOverview, setIsLoadingOverview] = useState(true);
  const [error, setError] = useState(null);

  // Selected asset for deep inspection modal
  const [selectedAssetModal, setSelectedAssetModal] = useState(null);

  // Suggested operational question chips
  const suggestedQuestions = [
    'What is happening across the fleet?',
    'Which assets need immediate attention?',
    'Which assets are NOT mission-ready?',
    'Which assets have highest failure risk?',
    'Which assets have active anomalies?',
    'Which assets have low RUL?',
    'Which assets are overdue for maintenance?',
    'How is fleet readiness changing?',
    'What changed recently?',
    'Why is asset A002 not ready?',
  ];

  const loadOverview = useCallback(async () => {
    setIsLoadingOverview(true);
    setError(null);
    try {
      const data = await getCommandOverview();
      setCommandData(data);
    } catch (err) {
      console.error('Failed to load command overview:', err);
      setError(err.message || 'Failed to load command intelligence.');
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
      console.error('Failed to query copilot:', err);
      setError(err.message || 'Failed to process copilot inquest.');
    } finally {
      setIsLoadingQuery(false);
    }
  };

  useEffect(() => {
    loadOverview();
    // Run initial query
    handleRunQuery('Which assets need immediate attention?');
  }, []);

  const kpis = commandData?.kpis;

  return (
    <div className="copilot-container">
      {/* Header Bar */}
      <div className="fleet-header">
        <div>
          <div className="hero-badge">
            <BrainCircuit size={14} />
            <span>Operational Decision Support Core</span>
          </div>
          <h2 className="fleet-title">SentinelAI Command Intelligence & Operational Copilot</h2>
          <p className="fleet-subtitle">
            Deterministic operational decision intelligence synthesizing multi-sensor telemetry, ML predictions, HUMS anomalies, mission readiness, and predictive maintenance.
          </p>
        </div>

        <button
          className="refresh-btn"
          onClick={() => {
            loadOverview();
            handleRunQuery(queryInput);
          }}
          disabled={isLoadingOverview || isLoadingQuery}
          title="Refresh Command Intelligence"
        >
          <RefreshCw size={15} className={isLoadingOverview || isLoadingQuery ? 'animate-spin' : ''} />
          <span>Refresh Intelligence</span>
        </button>
      </div>

      {error && <ErrorMessage message={error} onRetry={() => handleRunQuery(queryInput)} />}

      {/* Centralized Fleet Command KPIs */}
      <div className="command-kpi-bar glassmorphism">
        <div className="command-kpi-item">
          <span className="kpi-label">Fleet Readiness Index</span>
          <div className="kpi-val-row">
            <span className="kpi-main-val text-cyan">
              {kpis ? `${kpis.fleet_readiness_index}%` : '--'}
            </span>
            <ShieldCheck size={20} className="text-cyan" />
          </div>
          <span className="kpi-meta">
            {kpis ? `${kpis.ready_assets} Ready / ${kpis.not_ready_assets} Not Ready` : 'Aggregating...'}
          </span>
        </div>

        <div className="command-kpi-item">
          <span className="kpi-label">Readiness States</span>
          <div className="readiness-state-pills">
            <span className="state-pill state-ready">{kpis ? kpis.ready_assets : '--'} READY</span>
            <span className="state-pill state-caution">{kpis ? kpis.caution_assets : '--'} CAUTION</span>
            <span className="state-pill state-degraded">{kpis ? kpis.degraded_assets : '--'} DEGRADED</span>
            <span className="state-pill state-not-ready">{kpis ? kpis.not_ready_assets : '--'} NOT READY</span>
          </div>
          <span className="kpi-meta">Total Assets: {kpis ? kpis.total_assets : '--'}</span>
        </div>

        <div className="command-kpi-item">
          <span className="kpi-label">Critical Attention</span>
          <div className="kpi-val-row">
            <span className="kpi-main-val text-danger">
              {kpis ? kpis.critical_risk_assets : '--'}
            </span>
            <AlertOctagon size={20} className="text-danger" />
          </div>
          <span className="kpi-meta">High failure risk: {kpis ? kpis.high_failure_risk_assets : '--'}</span>
        </div>

        <div className="command-kpi-item">
          <span className="kpi-label">Maintenance Urgency</span>
          <div className="kpi-val-row">
            <span className="kpi-main-val text-caution">
              {kpis ? `${kpis.critical_interventions}` : '--'}
            </span>
            <Wrench size={20} className="text-caution" />
          </div>
          <span className="kpi-meta">
            {kpis ? `${kpis.overdue_maintenance} overdue, ${kpis.assets_requiring_maintenance} due/urgent` : 'Evaluating...'}
          </span>
        </div>

        <div className="command-kpi-item">
          <span className="kpi-label">Active Anomalies</span>
          <div className="kpi-val-row">
            <span className="kpi-main-val text-accent">
              {kpis ? kpis.active_anomaly_count : '--'}
            </span>
            <Activity size={20} className="text-accent" />
          </div>
          <span className="kpi-meta">Open directives: {kpis ? kpis.open_recommendations : '--'}</span>
        </div>
      </div>

      {/* Interactive Copilot Query Section */}
      <div className="copilot-query-card glassmorphism">
        <div className="query-card-header">
          <Sparkles size={20} className="text-cyan" />
          <div>
            <h3 className="query-card-title">Operational Copilot Inquest Bar</h3>
            <p className="query-card-sub">
              Ask natural mission readiness, maintenance, or asset-specific questions. Answers are mathematically backed by database evidence.
            </p>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleRunQuery(queryInput);
          }}
          className="copilot-search-form"
        >
          <div className="search-input-wrap">
            <Search size={18} className="search-icon text-muted" />
            <input
              type="text"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="e.g. Which assets need immediate attention? Why is asset A002 not ready?"
              className="copilot-text-input"
            />
          </div>
          <button
            type="submit"
            disabled={isLoadingQuery}
            className="btn-copilot-send"
          >
            {isLoadingQuery ? (
              <LoadingSpinner size="xs" />
            ) : (
              <Send size={16} />
            )}
            <span>{isLoadingQuery ? 'Synthesizing...' : 'Execute Inquest'}</span>
          </button>
        </form>

        {/* Suggested Quick Question Chips */}
        <div className="suggested-chips-bar">
          <span className="chips-label">Command Inquests:</span>
          <div className="chips-scroll-wrap">
            {suggestedQuestions.map((sq, idx) => (
              <button
                key={idx}
                className={`inquest-chip ${queryInput === sq ? 'active-chip' : ''}`}
                onClick={() => {
                  setQueryInput(sq);
                  handleRunQuery(sq);
                }}
              >
                {sq}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Copilot Synthesized Response Box */}
      {isLoadingQuery ? (
        <div className="copilot-answer-panel glassmorphism" style={{ padding: '32px' }}>
          <LoadingState
            message="Synthesizing Operational Inquest..."
            subtext="Interrogating multi-sensor telemetry, ML predictions, and readiness database."
            size="md"
            minHeight="140px"
          />
        </div>
      ) : copilotResponse && (
        <div className="copilot-answer-panel glassmorphism">
          <div className="answer-panel-header">
            <div className="answer-intent-tag">
              <span className="intent-label">INTENT:</span>
              <span className="intent-name">{copilotResponse.intent}</span>
              <span className="intent-conf">
                {(copilotResponse.confidence * 100).toFixed(0)}% Match
              </span>
            </div>
            <span className="answer-timestamp">
              {new Date(copilotResponse.timestamp).toLocaleTimeString()}
            </span>
          </div>

          <div className="answer-body-box">
            <p className="answer-text">{copilotResponse.answer}</p>
          </div>

          {/* Evidence Grid */}
          {copilotResponse.evidence && copilotResponse.evidence.length > 0 && (
            <div className="copilot-evidence-section">
              <div className="evidence-header">
                <FileText size={16} className="text-cyan" />
                <h4>Structured Evidence Package</h4>
              </div>
              <div className="evidence-cards-grid">
                {copilotResponse.evidence.map((ev, i) => (
                  <div key={i} className="evidence-card">
                    <div className="evidence-top">
                      <span className="evidence-source-tag">{ev.source}</span>
                      <span className="evidence-metric-name">{ev.metric}</span>
                    </div>
                    <div className="evidence-val">{String(ev.value)}</div>
                    <div className="evidence-expl">{ev.explanation}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommended Next Actions */}
          {copilotResponse.recommended_actions && copilotResponse.recommended_actions.length > 0 && (
            <div className="copilot-actions-section">
              <div className="actions-header">
                <CheckCircle2 size={16} className="text-success" />
                <h4>Prescribed Operational Actions</h4>
              </div>
              <ul className="actions-list">
                {copilotResponse.recommended_actions.map((act, i) => (
                  <li key={i} className="action-item">
                    <ArrowRight size={14} className="text-cyan" />
                    <span>{act}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Related Assets Cards */}
          {copilotResponse.related_assets && copilotResponse.related_assets.length > 0 && (
            <div className="copilot-related-assets-section">
              <div className="related-assets-header">
                <ShieldAlert size={16} className="text-danger" />
                <h4>Associated Operational Assets ({copilotResponse.related_assets.length})</h4>
              </div>
              <div className="related-assets-grid">
                {copilotResponse.related_assets.map((ast) => (
                  <div key={ast.asset_id} className="related-asset-card">
                    <div className="ast-card-top">
                      <div>
                        <span className="ast-code">{ast.asset_code}</span>
                        <span className="ast-model">{ast.model}</span>
                      </div>
                      <span className={`status-pill-risk-${(ast.priority || 'medium').toLowerCase()}`}>
                        {ast.readiness_state}
                      </span>
                    </div>
                    <div className="ast-metrics-row">
                      <span className="ast-chip">Score: {ast.readiness_score.toFixed(1)}%</span>
                      {ast.failure_probability !== null && (
                        <span className="ast-chip">Risk: {(ast.failure_probability * 100).toFixed(1)}%</span>
                      )}
                      {ast.rul_hours !== null && (
                        <span className="ast-chip">RUL: {ast.rul_hours.toFixed(1)}h</span>
                      )}
                    </div>
                    <div className="ast-card-footer">
                      <span className="ast-loc">{ast.location}</span>
                      <button
                        className="btn-inspect-clean"
                        onClick={() => setSelectedAssetModal({ id: ast.asset_id, asset_code: ast.asset_code })}
                      >
                        <span>Deep Inspect</span>
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Command Attention Queue & Subsystem Reliability Grid */}
      <div className="command-panels-grid">
        {/* Command Attention Queue */}
        <div className="command-panel-card glassmorphism">
          <div className="panel-card-header">
            <div className="panel-title-wrap">
              <AlertOctagon size={18} className="text-danger" />
              <h3>Command Attention Queue</h3>
            </div>
            <span className="panel-badge-count">
              {commandData?.attention_queue?.length || 0} Assets
            </span>
          </div>
          <div className="attention-queue-list">
            {commandData?.attention_queue?.slice(0, 6).map((item) => (
              <div
                key={item.asset_id}
                className="attention-queue-item"
                onClick={() => setSelectedAssetModal({ id: item.asset_id, asset_code: item.asset_code })}
              >
                <div className="queue-rank-badge">#{item.rank}</div>
                <div className="queue-item-content">
                  <div className="queue-item-top">
                    <span className="queue-item-code">{item.asset_code}</span>
                    <span className={`status-badge badge-${item.attention_priority.toLowerCase()}`}>
                      {item.attention_priority}
                    </span>
                  </div>
                  <div className="queue-item-issue">{item.primary_issue}</div>
                  <div className="queue-item-action">{item.recommended_next_action}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Subsystem Reliability Analytics */}
        <div className="command-panel-card glassmorphism">
          <div className="panel-card-header">
            <div className="panel-title-wrap">
              <Layers size={18} className="text-cyan" />
              <h3>Subsystem Reliability Breakdown</h3>
            </div>
            <span className="panel-badge-subtext">Verified PostgreSQL Logs</span>
          </div>
          <div className="subsystems-grid">
            {commandData?.subsystem_metrics?.map((sub, i) => (
              <div key={i} className="subsystem-kpi-card">
                <div className="sub-card-header">
                  <h4>{sub.subsystem_name}</h4>
                  <span className={`sub-anom-tag ${sub.active_anomaly_count > 0 ? 'text-danger' : 'text-success'}`}>
                    {sub.active_anomaly_count} Anom
                  </span>
                </div>
                <div className="sub-stat-row">
                  <div>
                    <span className="sub-label">Serviced</span>
                    <span className="sub-val">{sub.serviced_count}</span>
                  </div>
                  <div>
                    <span className="sub-label">Failures</span>
                    <span className={`sub-val ${sub.historical_failures > 0 ? 'text-danger' : ''}`}>
                      {sub.historical_failures}
                    </span>
                  </div>
                  <div>
                    <span className="sub-label">Interventions</span>
                    <span className="sub-val text-cyan">{sub.target_intervention_count}</span>
                  </div>
                </div>
                <div className="sub-parts-list">
                  <span className="parts-label">Common Parts:</span>
                  <span className="parts-text">
                    {sub.common_parts_replaced.length > 0 ? sub.common_parts_replaced.join(', ') : 'None'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chronological Recent Operational Changes Stream */}
      {commandData?.recent_changes && commandData.recent_changes.length > 0 && (
        <div className="changes-timeline-card glassmorphism">
          <div className="panel-card-header">
            <div className="panel-title-wrap">
              <Clock size={18} className="text-cyan" />
              <h3>Recent Operational Timeline & State Transitions</h3>
            </div>
            <span className="panel-badge-subtext">Chronological Event Stream</span>
          </div>

          <div className="timeline-items-list">
            {commandData.recent_changes.slice(0, 8).map((ch, idx) => (
              <div key={idx} className="timeline-item">
                <div className="timeline-dot"></div>
                <div className="timeline-content">
                  <div className="timeline-top">
                    <span className="timeline-code">{ch.asset_code}</span>
                    <span className="timeline-type">{ch.change_type.replace('_', ' ')}</span>
                    <span className="timeline-time">
                      {new Date(ch.detected_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="timeline-trigger">{ch.trigger_evidence}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Asset Deep Inspection Modal */}
      {selectedAssetModal && (
        <AssetDetailModal
          asset={selectedAssetModal}
          onClose={() => {
            setSelectedAssetModal(null);
            loadOverview();
          }}
        />
      )}
    </div>
  );
}
