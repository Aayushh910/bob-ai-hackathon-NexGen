import React, { useState, useEffect, useCallback } from 'react';
import {
  Cpu,
  ArrowLeft,
  Activity,
  AlertTriangle,
  AlertOctagon,
  ShieldCheck,
  TrendingUp,
  Radio,
  Sparkles,
  RefreshCw,
  Clock,
  Layers,
  BarChart2,
  Info
} from 'lucide-react';
import {
  getComponentById,
  getComponentHistory,
  getComponentExplanation
} from '../../api/components';
import { PageHeader, StatusBadge, RiskBadge, LoadingState, EmptyState } from '../common/UIComponents';
import TelemetryChart from '../fleet/TelemetryChart';

export default function ComponentAnalysisView({ componentId, onBack, onInspectParentAsset }) {
  const [componentData, setComponentData] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [explanationData, setExplanationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    if (!componentId) return;
    setLoading(true);
    setError(null);
    try {
      const [compRes, histRes, explRes] = await Promise.all([
        getComponentById(componentId),
        getComponentHistory(componentId, { limit: 50 }),
        getComponentExplanation(componentId)
      ]);

      const safeHist = Array.isArray(histRes)
        ? histRes
        : (Array.isArray(histRes?.readings) ? histRes.readings : []);

      setComponentData(compRes);
      setHistoryData(safeHist);
      setExplanationData(explRes);
    } catch (err) {
      console.error('Failed to load component analysis:', err);
      setError(err.message || `Unable to retrieve diagnostics for component ${componentId}`);
    } finally {
      setLoading(false);
    }
  }, [componentId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="fleet-view-container">
        <div style={{ marginBottom: '16px' }}>
          <button className="secondary-btn" onClick={onBack}>
            <ArrowLeft size={14} />
            <span>Back</span>
          </button>
        </div>
        <LoadingState
          message={`Loading Component Analysis Diagnostics for ${componentId}...`}
          subtext="Fetching TreeSHAP feature attributions, anomaly status, failure risk, and telemetry history from Neon database."
          minHeight="340px"
        />
      </div>
    );
  }

  if (error || !componentData) {
    return (
      <div className="fleet-view-container">
        <div style={{ marginBottom: '16px' }}>
          <button className="secondary-btn" onClick={onBack}>
            <ArrowLeft size={14} />
            <span>Back</span>
          </button>
        </div>
        <div className="error-card" style={{ padding: '24px', backgroundColor: 'var(--color-bg-subtle)', borderRadius: '8px', border: '1px solid var(--color-danger-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-danger)', marginBottom: '8px' }}>
            <AlertOctagon size={20} />
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Diagnostics Unavailable</h3>
          </div>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', margin: '0 0 16px' }}>{error || 'No component records found.'}</p>
          <button className="primary-btn" onClick={loadData}>
            <RefreshCw size={14} />
            <span>Retry Analysis</span>
          </button>
        </div>
      </div>
    );
  }

  const {
    component_id,
    component_type,
    asset_id,
    latest_prediction = {}
  } = componentData;

  const pred = latest_prediction || {};
  const {
    timestamp,
    anomaly_prediction = 0,
    anomaly_probability = 0,
    failure_prediction = 0,
    failure_probability = 0,
    primary_reason,
    secondary_reason,
    trend_risk = 0,
    anomaly_severity = 0,
    health_score = 100,
    maintenance_priority = 0,
    priority_level = 'LOW'
  } = pred;

  const explanations = explanationData?.feature_contributions || explanationData?.explanations || [];
  const formattedTimestamp = timestamp ? new Date(timestamp).toLocaleString() : '--';

  return (
    <div className="fleet-view-container">
      {/* Navigation Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="secondary-btn" onClick={onBack}>
            <ArrowLeft size={14} />
            <span>Back</span>
          </button>
          {asset_id && onInspectParentAsset && (
            <button className="secondary-btn" onClick={() => onInspectParentAsset(asset_id)}>
              <span>View Parent Asset ({asset_id})</span>
            </button>
          )}
        </div>

        <button className="secondary-btn" onClick={loadData} title="Refresh Diagnostics">
          <RefreshCw size={14} />
          <span>Refresh Analysis</span>
        </button>
      </div>

      {/* Component Title & Identity Banner */}
      <div className="sentinel-card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div className="brand-shield-box" style={{ width: '48px', height: '48px' }}>
              <Cpu size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 style={{ fontSize: '22px', fontWeight: 800, fontFamily: 'var(--font-family-mono)', margin: 0 }}>
                  {component_id}
                </h2>
                <RiskBadge risk={priority_level} size="md" />
              </div>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', margin: '4px 0 0' }}>
                Assembly Type: <strong>{component_type}</strong> &bull; Parent Asset: <strong>{asset_id}</strong>
              </p>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block' }}>
              Inference Evaluated At
            </span>
            <span style={{ fontSize: '13px', fontFamily: 'var(--font-family-mono)', color: 'var(--color-text)' }}>
              {formattedTimestamp}
            </span>
          </div>
        </div>

        {/* 5 Distinct Operational Dimensions Required by SentinelAI */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--color-border)' }}>
          {/* 1. Health Score */}
          <div style={{ padding: '12px 14px', backgroundColor: 'var(--color-bg-subtle)', borderRadius: '6px' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block' }}>
              Health Score
            </span>
            <div style={{ fontSize: '24px', fontWeight: 800, fontFamily: 'var(--font-family-mono)', color: health_score < 50 ? 'var(--color-danger)' : health_score < 75 ? 'var(--color-warning)' : 'var(--color-success)', margin: '4px 0 2px' }}>
              {health_score} <small style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>/ 100</small>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
              Integrated Multi-Factor Index
            </span>
          </div>

          {/* 2. Current Anomaly */}
          <div style={{ padding: '12px 14px', backgroundColor: 'var(--color-bg-subtle)', borderRadius: '6px' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block' }}>
              Current Anomaly State
            </span>
            <div style={{ fontSize: '24px', fontWeight: 800, fontFamily: 'var(--font-family-mono)', color: anomaly_prediction === 1 ? 'var(--color-danger)' : 'var(--color-success)', margin: '4px 0 2px' }}>
              {anomaly_prediction === 1 ? 'ANOMALOUS' : 'NOMINAL'}
            </div>
            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
              Probability: {anomaly_probability}% (Sev: {anomaly_severity})
            </span>
          </div>

          {/* 3. Failure Risk */}
          <div style={{ padding: '12px 14px', backgroundColor: 'var(--color-bg-subtle)', borderRadius: '6px' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block' }}>
              Failure Risk Probability
            </span>
            <div style={{ fontSize: '24px', fontWeight: 800, fontFamily: 'var(--font-family-mono)', color: failure_probability >= 70 ? 'var(--color-danger)' : failure_probability >= 30 ? '#f97316' : 'var(--color-text)', margin: '4px 0 2px' }}>
              {failure_probability}%
            </div>
            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
              Trigger Flag: {failure_prediction === 1 ? 'TRIGGERED' : 'CLEAR'}
            </span>
          </div>

          {/* 4. Trend Risk */}
          <div style={{ padding: '12px 14px', backgroundColor: 'var(--color-bg-subtle)', borderRadius: '6px' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block' }}>
              4-Signal Trend Risk
            </span>
            <div style={{ fontSize: '24px', fontWeight: 800, fontFamily: 'var(--font-family-mono)', color: 'var(--color-text)', margin: '4px 0 2px' }}>
              {trend_risk} <small style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>/ 100</small>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
              RoC + Persistence + Degradation
            </span>
          </div>

          {/* 5. Maintenance Priority */}
          <div style={{ padding: '12px 14px', backgroundColor: 'var(--color-bg-subtle)', borderRadius: '6px' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block' }}>
              Maintenance Priority
            </span>
            <div style={{ fontSize: '24px', fontWeight: 800, fontFamily: 'var(--font-family-mono)', color: priority_level === 'CRITICAL' ? 'var(--color-danger)' : priority_level === 'HIGH' ? '#f97316' : 'var(--color-text)', margin: '4px 0 2px' }}>
              {maintenance_priority}
            </div>
            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
              Level: {priority_level}
            </span>
          </div>
        </div>
      </div>

      {/* TreeSHAP Explanation Section */}
      <div className="sentinel-card" style={{ marginBottom: '20px' }}>
        <div className="card-header-row" style={{ marginBottom: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={18} style={{ color: 'var(--color-primary)' }} />
              <h3 className="card-title">TreeSHAP Explainability &amp; Causal Attribution</h3>
            </div>
            <p className="card-subtitle">
              Granular feature attributions explaining the exact mechanical drivers of anomaly and failure risk.
            </p>
          </div>
        </div>

        {/* Primary and Secondary Reasons Callout */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', marginBottom: '20px' }}>
          <div style={{ padding: '14px', backgroundColor: 'var(--color-bg-subtle)', borderRadius: '6px', borderLeft: '4px solid var(--color-danger)' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Primary Driving Factor
            </span>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text)', marginTop: '4px' }}>
              {explanationData?.primary_reason || primary_reason || 'Nominal Sensor Baseline'}
            </div>
            <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'block', marginTop: '4px' }}>
              Highest relative contribution to anomalous or failure risk prediction.
            </span>
          </div>

          <div style={{ padding: '14px', backgroundColor: 'var(--color-bg-subtle)', borderRadius: '6px', borderLeft: '4px solid #f97316' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Secondary Driving Factor
            </span>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text)', marginTop: '4px' }}>
              {explanationData?.secondary_reason || secondary_reason || 'None Identified (Nominal)'}
            </div>
            <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'block', marginTop: '4px' }}>
              Secondary mechanical deviation contributing to risk score.
            </span>
          </div>
        </div>

        {/* Ranked SHAP Feature Breakdown */}
        {explanations.length > 0 ? (
          <div>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '10px' }}>
              Ranked Feature Contributions
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {explanations.map((item, idx) => {
                const isPositive = item.contribution_direction === 'POSITIVE' || item.shap_value > 0;
                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      backgroundColor: 'var(--color-bg-subtle)',
                      borderRadius: '6px',
                      border: '1px solid var(--color-border-subtle)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '11px', fontFamily: 'var(--font-family-mono)', color: 'var(--color-text-muted)', width: '20px' }}>
                        #{item.rank || idx + 1}
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text)' }}>
                        {item.feature_name.replace(/_/g, ' ').toUpperCase()}
                      </span>
                      {item.feature_value !== undefined && item.feature_value !== null && (
                        <span style={{ fontSize: '12px', fontFamily: 'var(--font-family-mono)', color: 'var(--color-text-secondary)' }}>
                          (Value: {Number(item.feature_value).toFixed(2)})
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: isPositive ? 'var(--color-danger-dim)' : 'var(--color-success-dim)',
                          color: isPositive ? 'var(--color-danger)' : 'var(--color-success)',
                          border: `1px solid ${isPositive ? 'var(--color-danger-border)' : 'var(--color-success-border)'}`
                        }}
                      >
                        {isPositive ? '+RISK' : '-RISK'}
                      </span>
                      <span style={{ fontFamily: 'var(--font-family-mono)', fontSize: '13px', fontWeight: 700, color: 'var(--color-text)', minWidth: '70px', textAlign: 'right' }}>
                        {Number(item.shap_value) > 0 ? `+${Number(item.shap_value).toFixed(4)}` : Number(item.shap_value).toFixed(4)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div style={{ padding: '14px', backgroundColor: 'var(--color-bg-subtle)', borderRadius: '6px', fontSize: '13px', color: 'var(--color-text-muted)' }}>
            Feature attributions available from telemetry baseline.
          </div>
        )}
      </div>

      {/* Historical Telemetry & Sensor Readings */}
      <div className="sentinel-card">
        <div className="card-header-row" style={{ marginBottom: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={18} style={{ color: 'var(--color-primary)' }} />
              <h3 className="card-title">Chronological Sensor Telemetry</h3>
            </div>
            <p className="card-subtitle">
              Live HUMS sensor readings persisted in PostgreSQL for {component_id} ({historyData.length} records available).
            </p>
          </div>
        </div>

        {/* Telemetry Chart Component */}
        {historyData.length > 0 ? (
          <>
            <div style={{ marginBottom: '20px' }}>
              <TelemetryChart readings={historyData} />
            </div>

            {/* Telemetry Readings Table */}
            <div className="table-wrapper" style={{ maxHeight: '300px', overflowY: 'auto' }}>
              <table className="sentinel-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Temperature (°C)</th>
                    <th>Vibration (g)</th>
                    <th>Oil Pressure (psi)</th>
                    <th>Fuel Pressure (psi)</th>
                    <th>Hydraulic Pressure (psi)</th>
                    <th>RPM</th>
                    <th>Battery Voltage (V)</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {historyData.slice(0, 15).map((row, i) => (
                    <tr key={i}>
                      <td style={{ fontSize: '12px', fontFamily: 'var(--font-family-mono)', color: 'var(--color-text-muted)' }}>
                        {row.timestamp ? new Date(row.timestamp).toLocaleTimeString() : '--'}
                      </td>
                      <td>{row.temperature !== null ? `${row.temperature}°C` : '--'}</td>
                      <td>{row.vibration !== null ? `${row.vibration}` : '--'}</td>
                      <td>{row.oil_pressure !== null ? `${row.oil_pressure} psi` : '--'}</td>
                      <td>{row.fuel_pressure !== null ? `${row.fuel_pressure} psi` : '--'}</td>
                      <td>{row.hydraulic_pressure !== null ? `${row.hydraulic_pressure} psi` : '--'}</td>
                      <td>{row.rpm !== null ? `${row.rpm}` : '--'}</td>
                      <td>{row.battery_voltage !== null ? `${row.battery_voltage} V` : '--'}</td>
                      <td>
                        <StatusBadge status={row.sensor_status || 'READY'} size="sm" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <EmptyState
            title="No Telemetry History"
            description={`No sensor records currently logged for component ${componentId}.`}
            icon={Radio}
          />
        )}
      </div>
    </div>
  );
}
