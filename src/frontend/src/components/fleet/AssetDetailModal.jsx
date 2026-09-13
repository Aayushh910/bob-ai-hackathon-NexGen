import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, Shield, Activity, Thermometer, Gauge, Zap, Disc, 
  BatteryCharging, Clock, Layers, AlertCircle, BrainCircuit, 
  CheckCircle2, AlertTriangle, AlertOctagon, RefreshCw, Cpu, 
  Check, ArrowRight, ShieldCheck, ShieldAlert
} from 'lucide-react';
import { getAssetTelemetry, getLatestAssetTelemetry } from '../../api/telemetry';
import { getLatestPrediction, runPrediction, getAssetAnomalies, runAnomalyDetection } from '../../api/ml';
import { getAssetReadiness, assessAssetReadiness, updateRecommendationStatus } from '../../api/readiness';
import TelemetryChart from './TelemetryChart';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorMessage from '../common/ErrorMessage';

export default function AssetDetailModal({ asset, onClose }) {
  const [latestTelemetry, setLatestTelemetry] = useState(null);
  const [telemetryHistory, setTelemetryHistory] = useState([]);
  const [prediction, setPrediction] = useState(null);
  const [anomalyResult, setAnomalyResult] = useState(null);
  const [assetAnomalies, setAssetAnomalies] = useState([]);
  const [readiness, setReadiness] = useState(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isInferring, setIsInferring] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState(null);
  const [error, setError] = useState(null);
  const [historyPage, setHistoryPage] = useState(0);

  const fetchAssetData = useCallback(async () => {
    if (!asset) return;
    setIsLoading(true);
    setError(null);
    try {
      const [latest, history, pred, anomalies, readData] = await Promise.all([
        getLatestAssetTelemetry(asset.id).catch(() => null),
        getAssetTelemetry(asset.id, { limit: 40, order_desc: true }).catch(() => ({ items: [] })),
        getLatestPrediction(asset.id).catch(() => null),
        getAssetAnomalies(asset.id).catch(() => ({ items: [] })),
        getAssetReadiness(asset.id).catch(() => null),
      ]);
      setLatestTelemetry(latest);
      setTelemetryHistory(history.items || []);
      setPrediction(pred);
      setAssetAnomalies(anomalies.items || []);
      setReadiness(readData);
    } catch (err) {
      console.error('Failed to load asset telemetry/diagnostics:', err);
      setError(err.message || 'Unable to retrieve telemetry or ML diagnostics for this asset.');
    } finally {
      setIsLoading(false);
    }
  }, [asset]);

  useEffect(() => {
    fetchAssetData();
  }, [fetchAssetData]);

  const handleRunFullAssessment = async () => {
    if (!asset) return;
    setIsInferring(true);
    setError(null);
    setActionSuccessMsg(null);
    try {
      // Runs fresh ML inference & re-evaluates mission readiness in one call
      const freshReadiness = await assessAssetReadiness(asset.id);
      setReadiness(freshReadiness);

      // Refresh telemetry & predictions
      const [pred, anom] = await Promise.all([
        getLatestPrediction(asset.id).catch(() => null),
        getAssetAnomalies(asset.id).catch(() => ({ items: [] })),
      ]);
      setPrediction(pred);
      setAssetAnomalies(anom.items || []);
      setActionSuccessMsg('Mission readiness assessment updated successfully!');
      setTimeout(() => setActionSuccessMsg(null), 3000);
    } catch (err) {
      console.error('Inference error:', err);
      setError(err.message || 'Failed to execute mission readiness assessment.');
    } finally {
      setIsInferring(false);
    }
  };

  const handleUpdateRecStatus = async (recId, newStatus) => {
    try {
      await updateRecommendationStatus(recId, newStatus);
      // Refresh readiness to reflect resolved recommendation
      const fresh = await getAssetReadiness(asset.id);
      setReadiness(fresh);
      setActionSuccessMsg(`Directive marked as ${newStatus}!`);
      setTimeout(() => setActionSuccessMsg(null), 3000);
    } catch (err) {
      console.error('Failed to update recommendation status:', err);
      setError('Unable to update directive status.');
    }
  };

  if (!asset) return null;

  const failProbPercent = readiness?.failure_probability !== undefined && readiness.failure_probability !== null
    ? (readiness.failure_probability * 100).toFixed(1)
    : (prediction?.failure_probability !== undefined ? (prediction.failure_probability * 100).toFixed(1) : null);

  const riskLevel = readiness?.risk_level || prediction?.risk_level || 'LOW';
  const readinessState = readiness?.readiness_state || 'READY';
  const readinessScore = readiness?.readiness_score !== undefined ? readiness.readiness_score : 100;

  const getScoreColor = (score) => {
    if (score >= 80) return '#10B981';
    if (score >= 60) return '#F59E0B';
    if (score >= 40) return '#F97316';
    return '#F43F5E';
  };

  const getStateClass = (st) => {
    switch (st) {
      case 'READY': return 'state-box-ready';
      case 'CAUTION': return 'state-box-caution';
      case 'DEGRADED': return 'state-box-degraded';
      case 'NOT_READY': return 'state-box-not-ready';
      default: return '';
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-window" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-asset-identity">
            <div className="modal-shield-badge">
              <Shield size={24} />
            </div>
            <div>
              <div className="modal-title-row">
                <h3 className="modal-title">{asset.asset_code}</h3>
                <span className="asset-type-badge">{asset.asset_type}</span>
                <span className={`status-pill pill-${asset.status?.toLowerCase() || 'active'}`}>
                  {asset.status || 'ACTIVE'}
                </span>
              </div>
              <div className="modal-sub">
                {asset.model} &bull; {asset.location} &bull; ID: #{asset.id}
              </div>
            </div>
          </div>

          <div className="modal-header-actions">
            <button
              className="run-inference-btn"
              onClick={handleRunFullAssessment}
              disabled={isInferring}
              title="Run fresh ML inference & re-evaluate mission readiness"
            >
              <RefreshCw size={15} className={isInferring ? 'animate-spin' : ''} />
              <span>{isInferring ? 'Evaluating...' : 'Assess Mission Readiness'}</span>
            </button>
            <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {error && <ErrorMessage message={error} onRetry={fetchAssetData} />}
          {actionSuccessMsg && <div className="action-success-banner">{actionSuccessMsg}</div>}

          {isLoading && !latestTelemetry && !readiness ? (
            <LoadingSpinner message="Retrieving real-time telemetry and decision layer..." />
          ) : (
            <>
              {/* =========================================================================
                  SECTION 1: AI MISSION READINESS OVERVIEW (PHASE 4 PRIMARY FOCUS)
                  ========================================================================= */}
              <div className={`readiness-overview-card ${getStateClass(readinessState)}`}>
                <div className="readiness-top-row">
                  <div className="state-identity-block">
                    <div className="state-icon-wrapper">
                      {readinessState === 'READY' ? (
                        <ShieldCheck size={28} className="text-emerald" />
                      ) : readinessState === 'CAUTION' ? (
                        <AlertTriangle size={28} className="text-amber" />
                      ) : readinessState === 'DEGRADED' ? (
                        <AlertOctagon size={28} className="text-orange" />
                      ) : (
                        <ShieldAlert size={28} className="text-rose" />
                      )}
                    </div>
                    <div>
                      <div className="state-status-label">MISSION READINESS CLEARANCE</div>
                      <div className="state-status-title">
                        {readinessState.replace('_', ' ')}
                      </div>
                    </div>
                  </div>

                  {/* Readiness Score Ring */}
                  <div className="readiness-score-block">
                    <div className="score-ring-val" style={{ color: getScoreColor(readinessScore) }}>
                      {readinessScore}
                      <span className="score-ring-max">/100</span>
                    </div>
                    <div className="score-ring-label">Readiness Index</div>
                    <div className="score-ring-track">
                      <div
                        className="score-ring-fill"
                        style={{
                          width: `${readinessScore}%`,
                          backgroundColor: getScoreColor(readinessScore)
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Primary Reason Banner */}
                {readiness?.primary_reason && (
                  <div className="primary-reason-banner">
                    <span className="reason-bold">Decision Assessment:</span> {readiness.primary_reason}
                  </div>
                )}

                {/* Contributing Factors Breakdown (if any points deducted) */}
                {readiness?.contributing_factors && readiness.contributing_factors.length > 0 && (
                  <div className="contributing-factors-list">
                    <span className="contributions-title">Score Contributing Factors:</span>
                    <div className="contributions-tags">
                      {readiness.contributing_factors.map((cf, idx) => (
                        <span key={idx} className="contribution-pill">
                          <strong>{cf.name}:</strong> {cf.score_impact > 0 ? '+' : ''}{cf.score_impact} pts ({cf.reason})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* =========================================================================
                  SECTION 2: WHY? — ACTIVE RISK FACTORS ENGINE
                  ========================================================================= */}
              <div className="why-risk-factors-section">
                <div className="section-title-bar">
                  <AlertCircle size={18} className="text-cyan" />
                  <h4 className="section-title-heading">Why is this asset in this state? (Risk Factor Engine)</h4>
                </div>

                {!readiness?.risk_factors || readiness.risk_factors.length === 0 ? (
                  <div className="no-risk-box">
                    <CheckCircle2 size={20} className="text-emerald" />
                    <span>No active operational risk factors. Telemetry, failure probabilities, and wear metrics are nominal.</span>
                  </div>
                ) : (
                  <div className="risk-factors-grid">
                    {readiness.risk_factors.map((rf, idx) => (
                      <div key={idx} className={`risk-factor-card card-sev-${rf.severity.toLowerCase()}`}>
                        <div className="factor-top">
                          <span className="factor-type-tag">{rf.factor_type.replace('_', ' ')}</span>
                          <span className={`factor-severity-pill pill-sev-${rf.severity.toLowerCase()}`}>
                            {rf.severity}
                          </span>
                        </div>
                        <div className="factor-title">{rf.title}</div>
                        <div className="factor-explanation">{rf.explanation}</div>
                        <div className="factor-footer">
                          <span className="factor-source">Source: {rf.source}</span>
                          {rf.supporting_value && (
                            <span className="factor-value">Metric: {rf.supporting_value}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* =========================================================================
                  SECTION 3: WHAT SHOULD I DO? — ACTIONABLE OPERATIONAL RECOMMENDATIONS
                  ========================================================================= */}
              <div className="recommendations-action-section">
                <div className="section-title-bar">
                  <ArrowRight size={18} className="text-amber" />
                  <h4 className="section-title-heading">What should the operator do? (Actionable Directives)</h4>
                </div>

                {!readiness?.recommendations || readiness.recommendations.length === 0 ? (
                  <div className="no-risk-box">
                    <Check size={20} className="text-emerald" />
                    <span>No pending maintenance or inspection directives. Cleared for standard operations.</span>
                  </div>
                ) : (
                  <div className="recommendations-grid">
                    {readiness.recommendations.map((rec) => (
                      <div key={rec.id} className="rec-card">
                        <div className="rec-card-top">
                          <span className={`rec-priority-badge prio-${rec.priority.toLowerCase()}`}>
                            {rec.priority} PRIORITY
                          </span>
                          <span className={`rec-status-badge status-${rec.status.toLowerCase()}`}>
                            {rec.status}
                          </span>
                        </div>
                        <div className="rec-instruction">{rec.recommendation}</div>
                        {rec.reason && (
                          <div className="rec-reason-text">
                            <strong>Underlying Cause:</strong> {rec.reason}
                          </div>
                        )}
                        <div className="rec-card-actions">
                          {rec.status === 'OPEN' && (
                            <button
                              className="rec-action-btn ack-btn"
                              onClick={() => handleUpdateRecStatus(rec.id, 'ACKNOWLEDGED')}
                            >
                              Acknowledge Directive
                            </button>
                          )}
                          {rec.status !== 'RESOLVED' && (
                            <button
                              className="rec-action-btn resolve-btn"
                              onClick={() => handleUpdateRecStatus(rec.id, 'RESOLVED')}
                            >
                              Mark Resolved
                            </button>
                          )}
                          {rec.status === 'RESOLVED' && (
                            <span className="resolved-text">Directive Resolved</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* =========================================================================
                  SECTION 4: ML INFERENCE METRICS (MODELS A, B, C & ANOMALY)
                  ========================================================================= */}
              <div className="ml-diagnostics-card">
                <div className="ml-diagnostics-header">
                  <div className="ml-title-group">
                    <BrainCircuit size={18} className="text-cyan" />
                    <span className="chart-title">Telemetry ML Inference Layer</span>
                  </div>
                  {prediction?.prediction_timestamp && (
                    <span className="inference-ts">
                      Timestamp: {new Date(prediction.prediction_timestamp).toLocaleTimeString()}
                    </span>
                  )}
                </div>

                <div className="ml-metrics-grid">
                  {/* Failure Probability */}
                  <div className="ml-metric-box">
                    <div className="ml-metric-label">Failure Probability (50h)</div>
                    <div className="ml-metric-value">
                      {failProbPercent !== null ? `${failProbPercent}%` : '--'}
                      <span className={`status-pill-risk-${riskLevel.toLowerCase()}`}>
                        {riskLevel}
                      </span>
                    </div>
                    <div className="risk-progress-bar">
                      <div
                        className="risk-bar-fill"
                        style={{
                          width: `${Math.min(100, Math.max(5, failProbPercent || 0))}%`,
                          backgroundColor: getScoreColor(100 - (failProbPercent || 0))
                        }}
                      />
                    </div>
                    <div className="ml-metric-sub">Model A (Logistic Regression)</div>
                  </div>

                  {/* Remaining Useful Life */}
                  <div className="ml-metric-box">
                    <div className="ml-metric-label">Remaining Useful Life (RUL)</div>
                    <div className="ml-metric-value">
                      {readiness?.rul_hours !== null && readiness?.rul_hours !== undefined
                        ? `${readiness.rul_hours.toFixed(1)} hrs`
                        : (prediction?.rul_hours ? `${prediction.rul_hours.toFixed(1)} hrs` : '--')}
                    </div>
                    <div className="ml-metric-sub">Model B (Gradient Boosting)</div>
                  </div>

                  {/* Failure Mode Diagnosis */}
                  <div className="ml-metric-box">
                    <div className="ml-metric-label">Diagnosed Failure Mode</div>
                    <div className="ml-metric-value">
                      <span className="mode-badge">
                        {readiness?.predicted_failure_mode || prediction?.predicted_failure_mode || 'No Failure'}
                      </span>
                    </div>
                    <div className="ml-metric-sub">Model C (Classifier)</div>
                  </div>

                  {/* Anomaly Detection Status */}
                  <div className="ml-metric-box">
                    <div className="ml-metric-label">HUMS Anomaly Status</div>
                    <div className="ml-metric-value">
                      {readiness?.is_anomaly || anomalyResult?.is_anomaly ? (
                        <span className="status-pill-anomaly-alert">ANOMALOUS</span>
                      ) : (
                        <span className="status-pill-anomaly-normal">NOMINAL</span>
                      )}
                    </div>
                    <div className="ml-metric-sub">RF Classifier (150 trees)</div>
                  </div>
                </div>

                {/* Sensor Attributions if anomalous */}
                {anomalyResult?.attributed_sensors && anomalyResult.attributed_sensors.some(a => a.is_anomaly_cause) && (
                  <div className="attribution-panel">
                    <span className="attribution-title">
                      <AlertTriangle size={14} /> Attributed Sensor Deviations (&ge; 1.8&sigma; Threshold):
                    </span>
                    <div className="attribution-tags">
                      {anomalyResult.attributed_sensors.filter(a => a.is_anomaly_cause).map((a, i) => (
                        <span key={i} className="attribution-pill anomaly">
                          {a.sensor}: {a.value} ({a.sigma_deviation > 0 ? '+' : ''}{a.sigma_deviation}&sigma;)
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* =========================================================================
                  SECTION 5: LIVE TELEMETRY SNAPSHOT & HISTORICAL HUMS CHARTS
                  ========================================================================= */}
              <div className="telemetry-gauges-section">
                <h4 className="sub-heading">Live Telemetry Snapshot (PostgreSQL)</h4>
                {latestTelemetry ? (
                  <div className="gauge-grid">
                    <div className="gauge-card">
                      <div className="gauge-icon-box temp-icon">
                        <Thermometer size={18} />
                      </div>
                      <div className="gauge-data">
                        <span className="gauge-label">Temperature</span>
                        <span className="gauge-val">{latestTelemetry.temperature?.toFixed(1) ?? 'N/A'} &deg;C</span>
                      </div>
                    </div>

                    <div className="gauge-card">
                      <div className="gauge-icon-box vib-icon">
                        <Activity size={18} />
                      </div>
                      <div className="gauge-data">
                        <span className="gauge-label">Vibration</span>
                        <span className="gauge-val">{latestTelemetry.vibration?.toFixed(2) ?? 'N/A'} mm/s</span>
                      </div>
                    </div>

                    <div className="gauge-card">
                      <div className="gauge-icon-box oil-icon">
                        <Gauge size={18} />
                      </div>
                      <div className="gauge-data">
                        <span className="gauge-label">Oil Pressure</span>
                        <span className="gauge-val">{latestTelemetry.oil_pressure?.toFixed(1) ?? 'N/A'} psi</span>
                      </div>
                    </div>

                    <div className="gauge-card">
                      <div className="gauge-icon-box fuel-icon">
                        <Zap size={18} />
                      </div>
                      <div className="gauge-data">
                        <span className="gauge-label">Fuel Pressure</span>
                        <span className="gauge-val">{latestTelemetry.fuel_pressure?.toFixed(1) ?? 'N/A'} psi</span>
                      </div>
                    </div>

                    <div className="gauge-card">
                      <div className="gauge-icon-box hyd-icon">
                        <Layers size={18} />
                      </div>
                      <div className="gauge-data">
                        <span className="gauge-label">Hydraulic Press.</span>
                        <span className="gauge-val">{latestTelemetry.hydraulic_pressure?.toFixed(1) ?? 'N/A'} psi</span>
                      </div>
                    </div>

                    <div className="gauge-card">
                      <div className="gauge-icon-box rpm-icon">
                        <Disc size={18} />
                      </div>
                      <div className="gauge-data">
                        <span className="gauge-label">Engine RPM</span>
                        <span className="gauge-val">{latestTelemetry.rpm?.toFixed(0) ?? 'N/A'} RPM</span>
                      </div>
                    </div>

                    <div className="gauge-card">
                      <div className="gauge-icon-box bat-icon">
                        <BatteryCharging size={18} />
                      </div>
                      <div className="gauge-data">
                        <span className="gauge-label">Battery Voltage</span>
                        <span className="gauge-val">{latestTelemetry.battery_voltage?.toFixed(1) ?? 'N/A'} V</span>
                      </div>
                    </div>

                    <div className="gauge-card">
                      <div className="gauge-icon-box hours-icon">
                        <Clock size={18} />
                      </div>
                      <div className="gauge-data">
                        <span className="gauge-label">Operating Hours</span>
                        <span className="gauge-val">{latestTelemetry.operating_hours?.toFixed(0) ?? 'N/A'} hrs</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="ml-no-data">No telemetry recorded for this asset yet.</div>
                )}
              </div>

              {/* Historical Telemetry Chart */}
              <div className="telemetry-chart-section">
                <h4 className="sub-heading">HUMS Sensor History & Trend Monitoring</h4>
                <TelemetryChart telemetryData={telemetryHistory} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
