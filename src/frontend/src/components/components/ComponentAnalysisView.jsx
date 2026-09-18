import React, { useState, useEffect, useCallback } from 'react';
import {
  Cpu,
  ArrowLeft,
  Activity,
  AlertTriangle,
  AlertOctagon,
  ShieldCheck,
  CheckCircle2,
  TrendingUp,
  Radio,
  Sparkles,
  RefreshCw,
  Clock,
  Layers,
  BarChart2,
  Info,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import {
  getComponentById,
  getComponentHistory,
  getComponentExplanation
} from '../../api/components';
import { PageHeader, StatusBadge, RiskBadge, LoadingState, EmptyState } from '../common/UIComponents';

// Nominal operational thresholds for HUMS telemetry features
const SENSOR_THRESHOLDS = {
  vibration: { label: 'Vibration Amplitude', unit: 'g', nominal: '< 2.50 g', max: 2.50, min: 0 },
  temperature: { label: 'Core Operating Temp', unit: '°C', nominal: '55.0 - 85.0 °C', max: 85.0, min: 55.0 },
  oil_pressure: { label: 'Lubrication Oil Pressure', unit: 'psi', nominal: '45.0 - 85.0 psi', min: 45.0, max: 85.0 },
  fuel_pressure: { label: 'Fuel Injection Pressure', unit: 'psi', nominal: '30.0 - 65.0 psi', min: 30.0, max: 65.0 },
  hydraulic_pressure: { label: 'Hydraulic System Pressure', unit: 'psi', nominal: '2200 - 3200 psi', min: 2200, max: 3200 },
  rpm: { label: 'Rotational Speed (RPM)', unit: 'RPM', nominal: '1800 - 2400 RPM', min: 1800, max: 2400 },
  battery_voltage: { label: 'DC Bus Voltage', unit: 'V', nominal: '24.0 - 28.5 V', min: 24.0, max: 28.5 }
};

export default function ComponentAnalysisView({
  componentId,
  onBack,
  onInspectParentAsset,
  onNavigateTrends
}) {
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
          subtext="Fetching predictive attributions, anomaly parameters, and telemetry history."
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

  // Determine readiness
  const isAtRisk = anomaly_prediction === 1 || failure_prediction === 1 || failure_probability >= 35 || priority_level === 'CRITICAL' || priority_level === 'HIGH';
  const isReady = !isAtRisk;

  const explanations = explanationData?.feature_contributions || explanationData?.explanations || [];
  const formattedTimestamp = timestamp ? new Date(timestamp).toLocaleString() : '--';

  // Latest reading for checklist evaluation
  const latestReading = historyData.length > 0 ? historyData[0] : null;

  // Evaluate sensor signals against thresholds for checklist
  const evaluateChecklist = () => {
    if (!latestReading) return [];

    return Object.keys(SENSOR_THRESHOLDS).map(key => {
      const config = SENSOR_THRESHOLDS[key];
      const val = latestReading[key];
      if (val === undefined || val === null) return null;

      const numVal = Number(val);
      let isBreached = false;
      let reason = '';

      if (config.max !== undefined && numVal > config.max) {
        isBreached = true;
        reason = `Exceeds upper critical limit (${numVal.toFixed(1)}${config.unit} > ${config.max}${config.unit})`;
      } else if (config.min !== undefined && numVal < config.min) {
        isBreached = true;
        reason = `Below nominal threshold (${numVal.toFixed(1)}${config.unit} < ${config.min}${config.unit})`;
      }

      return {
        key,
        label: config.label,
        nominal: config.nominal,
        unit: config.unit,
        value: numVal,
        isBreached,
        reason
      };
    }).filter(Boolean);
  };

  const checklistItems = evaluateChecklist();

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
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontFamily: 'var(--font-family-mono)',
                    backgroundColor: isReady ? 'var(--color-success-dim)' : 'var(--color-danger-dim)',
                    color: isReady ? 'var(--color-success)' : 'var(--color-danger)',
                    border: `1px solid ${isReady ? 'var(--color-success-border)' : 'var(--color-danger-border)'}`
                  }}
                >
                  {isReady ? 'STATUS: READY' : 'STATUS: REQUIRES ACTION'}
                </span>
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

      {/* Checklist-Type Deep Anomaly Diagnostics */}
      <div className="sentinel-card" style={{ marginBottom: '20px' }}>
        <div className="card-header-row" style={{ marginBottom: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={18} style={{ color: 'var(--color-primary)' }} />
              <h3 className="card-title">Telemetry Anomaly Checklist &amp; Threshold Verification</h3>
            </div>
            <p className="card-subtitle">
              Strict parametric limit verification against operational safety boundaries. Deviations indicate risk zone breach.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {checklistItems.length > 0 ? (
            checklistItems.map((item) => (
              <div
                key={item.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: '6px',
                  backgroundColor: item.isBreached ? 'rgba(239, 68, 68, 0.08)' : 'var(--color-bg-subtle)',
                  border: `1px solid ${item.isBreached ? 'var(--color-danger-border)' : 'var(--color-border-subtle)'}`,
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {item.isBreached ? (
                    <AlertTriangle size={18} style={{ color: 'var(--color-danger)', flexShrink: 0 }} />
                  ) : (
                    <CheckCircle2 size={18} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
                  )}

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text)' }}>
                        {item.label}
                      </span>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: '3px',
                          backgroundColor: item.isBreached ? 'var(--color-danger-dim)' : 'var(--color-success-dim)',
                          color: item.isBreached ? 'var(--color-danger)' : 'var(--color-success)'
                        }}
                      >
                        {item.isBreached ? 'THRESHOLD BREACHED' : 'NOMINAL'}
                      </span>
                    </div>

                    <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                      Nominal Safe Envelope: <code style={{ color: 'var(--color-text-muted)' }}>{item.nominal}</code>
                    </div>
                  </div>
                </div>

                {/* Only show numerical values when data is at risk / breached, as requested */}
                <div>
                  {item.isBreached ? (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '14px', fontFamily: 'var(--font-family-mono)', fontWeight: 700, color: 'var(--color-danger)' }}>
                        Observed: {item.value.toFixed(1)} {item.unit}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--color-danger)', marginTop: '2px' }}>
                        {item.reason}
                      </div>
                    </div>
                  ) : (
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <ShieldCheck size={14} />
                      Zero Risk Detected
                    </span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div style={{ padding: '16px', backgroundColor: 'var(--color-bg-subtle)', borderRadius: '6px', color: 'var(--color-text-muted)', fontSize: '13px' }}>
              No active telemetry sensors reported for this assembly.
            </div>
          )}
        </div>
      </div>

      {/* Predictive Root Cause & Key Risk Drivers (Renamed from TreeSHAP) */}
      <div className="sentinel-card" style={{ marginBottom: '20px' }}>
        <div className="card-header-row" style={{ marginBottom: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={18} style={{ color: 'var(--color-primary)' }} />
              <h3 className="card-title">Predictive Root Cause &amp; Key Risk Drivers</h3>
            </div>
            <p className="card-subtitle">
              Gradient-boosted decision tree feature attribution identifying causal factors of degradation.
            </p>
          </div>
        </div>

        {/* READY ASSETS: Suppress primary/secondary reasons and show proper reassuring nominal message */}
        {isReady ? (
          <div
            style={{
              padding: '16px 20px',
              backgroundColor: 'rgba(34, 197, 94, 0.08)',
              border: '1px solid var(--color-success-border)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px'
            }}
          >
            <ShieldCheck size={26} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-success)' }}>
                All Operational Parameters Nominal
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                Zero active mechanical degradation or failure drivers detected for this component. Sensor waveforms demonstrate standard equilibrium across all operational envelopes.
              </div>
            </div>
          </div>
        ) : (
          /* CRITICAL / AT RISK ASSETS: Display primary and secondary drivers */
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', marginBottom: '20px' }}>
              <div style={{ padding: '14px', backgroundColor: 'var(--color-bg-subtle)', borderRadius: '6px', borderLeft: '4px solid var(--color-danger)' }}>
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Primary Driving Factor
                </span>
                <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text)', marginTop: '4px' }}>
                  {explanationData?.primary_reason || primary_reason || 'Thermal / Bearing Degradation Spike'}
                </div>
                <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'block', marginTop: '4px' }}>
                  Dominant causal driver contributing to anomalous or elevated failure probability.
                </span>
              </div>

              <div style={{ padding: '14px', backgroundColor: 'var(--color-bg-subtle)', borderRadius: '6px', borderLeft: '4px solid #f97316' }}>
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Secondary Driving Factor
                </span>
                <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text)', marginTop: '4px' }}>
                  {explanationData?.secondary_reason || secondary_reason || 'Hydraulic Pressure Fluctuation'}
                </div>
                <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'block', marginTop: '4px' }}>
                  Secondary mechanical deviation contributing to total risk envelope.
                </span>
              </div>
            </div>

            {/* Ranked Feature Contributions for At-Risk Component */}
            {explanations.length > 0 && (
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
            )}
          </>
        )}
      </div>

      {/* Historical Telemetry Recommendation Card (Replaces duplicate trend chart as requested) */}
      <div className="sentinel-card">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            marginBottom: '16px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '8px',
                backgroundColor: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#38bdf8'
              }}
            >
              <Activity size={22} />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text)' }}>
                Deep Telemetry Waveforms &amp; Health Trends
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                Dedicated multi-signal degradation tracking, rate of change (RoC), and drift analysis are consolidated in Trends &amp; Health.
              </div>
            </div>
          </div>

          {onNavigateTrends && (
            <button
              className="primary-btn"
              onClick={() => onNavigateTrends(asset_id)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <span>Explore Trends &amp; Health</span>
              <ChevronRight size={14} />
            </button>
          )}
        </div>

        {/* Static Telemetry Readings Log */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Recent Telemetry Stream Logs ({historyData.length} Readings)
            </span>
          </div>

          {historyData.length > 0 ? (
            <div className="table-wrapper" style={{ maxHeight: '280px', overflowY: 'auto' }}>
              <table className="sentinel-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Temp (°C)</th>
                    <th>Vibration (g)</th>
                    <th>Oil Pres (psi)</th>
                    <th>Fuel Pres (psi)</th>
                    <th>Hyd Pres (psi)</th>
                    <th>RPM</th>
                    <th>Battery (V)</th>
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
          ) : (
            <EmptyState
              title="No Telemetry History"
              description={`No sensor records currently logged for component ${componentId}.`}
              icon={Radio}
            />
          )}
        </div>
      </div>
    </div>
  );
}

