import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  Activity,
  AlertOctagon,
  AlertTriangle,
  Radio,
  ArrowLeft,
  ChevronRight,
  Cpu,
  RefreshCw,
  Clock,
  Sparkles
} from 'lucide-react';
import { getAssetById } from '../../api/assets';
import { PageHeader, StatusBadge, RiskBadge, LoadingState, EmptyState } from '../common/UIComponents';

export default function AssetInspectionView({ assetId, onBack, onSelectComponent }) {
  const [assetData, setAssetData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    if (!assetId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getAssetById(assetId);
      setAssetData(data);
    } catch (err) {
      console.error('Failed to load asset inspection data:', err);
      setError(err.message || `Unable to retrieve asset diagnostics for ${assetId}`);
    } finally {
      setLoading(false);
    }
  }, [assetId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="fleet-view-container">
        <div style={{ marginBottom: '16px' }}>
          <button className="secondary-btn" onClick={onBack}>
            <ArrowLeft size={14} />
            <span>Back to Fleet Assets</span>
          </button>
        </div>
        <LoadingState
          message={`Loading Asset Inspection Diagnostics for ${assetId}...`}
          subtext="Fetching live component predictions, failure probabilities, and health scores from Neon database."
          minHeight="320px"
        />
      </div>
    );
  }

  if (error || !assetData) {
    return (
      <div className="fleet-view-container">
        <div style={{ marginBottom: '16px' }}>
          <button className="secondary-btn" onClick={onBack}>
            <ArrowLeft size={14} />
            <span>Back to Fleet Assets</span>
          </button>
        </div>
        <div className="error-card" style={{ padding: '24px', backgroundColor: 'var(--color-bg-subtle)', borderRadius: '8px', border: '1px solid var(--color-danger-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-danger)', marginBottom: '8px' }}>
            <AlertOctagon size={20} />
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Inspection Diagnostics Unavailable</h3>
          </div>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', margin: '0 0 16px' }}>{error || 'No asset record returned from backend.'}</p>
          <button className="primary-btn" onClick={loadData}>
            <RefreshCw size={14} />
            <span>Retry Inspection</span>
          </button>
        </div>
      </div>
    );
  }

  const {
    asset_id,
    asset_name,
    asset_type,
    status,
    critical_component_count,
    high_priority_component_count,
    anomalous_component_count,
    calculated_at,
    components = []
  } = assetData;

  const formattedDate = calculated_at ? new Date(calculated_at).toLocaleString() : '--';

  return (
    <div className="fleet-view-container">
      {/* Top Navigation Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <button className="secondary-btn" onClick={onBack}>
          <ArrowLeft size={14} />
          <span>Back to Fleet Assets</span>
        </button>

        <button className="secondary-btn" onClick={loadData} title="Refresh Asset Diagnostics">
          <RefreshCw size={14} />
          <span>Refresh Diagnostics</span>
        </button>
      </div>

      {/* Asset Identity Banner */}
      <div className="sentinel-card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div className="brand-shield-box" style={{ width: '48px', height: '48px' }}>
              <Shield size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 style={{ fontSize: '22px', fontWeight: 800, fontFamily: 'var(--font-family-mono)', margin: 0 }}>
                  {asset_id}
                </h2>
                <StatusBadge status={status} size="md" />
              </div>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', margin: '4px 0 0' }}>
                {asset_name} &bull; <span style={{ color: 'var(--color-text-muted)' }}>{asset_type}</span>
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block' }}>
                Last Diagnostic Assessment
              </span>
              <span style={{ fontSize: '13px', fontFamily: 'var(--font-family-mono)', color: 'var(--color-text)' }}>
                {formattedDate}
              </span>
            </div>
          </div>
        </div>

        {/* Risk Indicators Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--color-border)' }}>
          <div style={{ padding: '10px 14px', backgroundColor: 'var(--color-bg-subtle)', borderRadius: '6px', borderLeft: '3px solid var(--color-danger)' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Critical Components</span>
            <div style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'var(--font-family-mono)', color: critical_component_count > 0 ? 'var(--color-danger)' : 'var(--color-text)' }}>
              {critical_component_count}
            </div>
          </div>

          <div style={{ padding: '10px 14px', backgroundColor: 'var(--color-bg-subtle)', borderRadius: '6px', borderLeft: '3px solid #f97316' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>High Priority Warnings</span>
            <div style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'var(--font-family-mono)', color: high_priority_component_count > 0 ? '#f97316' : 'var(--color-text)' }}>
              {high_priority_component_count}
            </div>
          </div>

          <div style={{ padding: '10px 14px', backgroundColor: 'var(--color-bg-subtle)', borderRadius: '6px', borderLeft: '3px solid var(--color-warning)' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Active Anomalies</span>
            <div style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'var(--font-family-mono)', color: anomalous_component_count > 0 ? 'var(--color-warning)' : 'var(--color-text)' }}>
              {anomalous_component_count}
            </div>
          </div>

          <div style={{ padding: '10px 14px', backgroundColor: 'var(--color-bg-subtle)', borderRadius: '6px', borderLeft: '3px solid var(--color-success)' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Monitored Assemblies</span>
            <div style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'var(--font-family-mono)', color: 'var(--color-text)' }}>
              {components.length}
            </div>
          </div>
        </div>
      </div>

      {/* Components Grid Header */}
      <div className="card-header-row" style={{ marginBottom: '14px' }}>
        <div>
          <h3 className="card-title">Subsystem Components &amp; ML Diagnostics</h3>
          <p className="card-subtitle">Select any component assembly below for deep TreeSHAP attribution and historical telemetry.</p>
        </div>
      </div>

      {/* Components 4-Card Grid */}
      {components.length === 0 ? (
        <EmptyState
          title="No Components Found"
          description={`No registered components found for asset ${assetId}.`}
          icon={Cpu}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          {components.map((comp) => {
            const isCritical = comp.priority_level === 'CRITICAL';
            const isHigh = comp.priority_level === 'HIGH';

            return (
              <div
                key={comp.component_id}
                className="sentinel-card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  border: isCritical ? '1px solid var(--color-danger-border)' : isHigh ? '1px solid rgba(249, 115, 22, 0.35)' : '1px solid var(--color-border)',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s, transform 0.2s',
                }}
                onClick={() => onSelectComponent && onSelectComponent(comp.component_id)}
                title={`Click to analyze ${comp.component_id}`}
              >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {comp.component_type}
                    </span>
                    <h4 style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'var(--font-family-mono)', margin: '2px 0 0', color: 'var(--color-text)' }}>
                      {comp.component_id}
                    </h4>
                  </div>
                  <RiskBadge risk={comp.priority_level} size="sm" />
                </div>

                {/* Primary Metrics */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', margin: '8px 0 14px' }}>
                  <div style={{ padding: '10px', backgroundColor: 'var(--color-bg-subtle)', borderRadius: '6px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'block' }}>Health Score</span>
                    <span style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'var(--font-family-mono)', color: comp.health_score < 50 ? 'var(--color-danger)' : comp.health_score < 75 ? 'var(--color-warning)' : 'var(--color-success)' }}>
                      {comp.health_score !== null && comp.health_score !== undefined ? `${comp.health_score}` : '--'}
                      <small style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>/100</small>
                    </span>
                  </div>

                  <div style={{ padding: '10px', backgroundColor: 'var(--color-bg-subtle)', borderRadius: '6px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'block' }}>Failure Risk</span>
                    <span style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'var(--font-family-mono)', color: comp.failure_probability >= 70 ? 'var(--color-danger)' : comp.failure_probability >= 30 ? '#f97316' : 'var(--color-text)' }}>
                      {comp.failure_probability !== null && comp.failure_probability !== undefined ? `${comp.failure_probability}%` : '--'}
                    </span>
                  </div>

                  <div style={{ padding: '10px', backgroundColor: 'var(--color-bg-subtle)', borderRadius: '6px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'block' }}>Anomaly Severity</span>
                    <span style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'var(--font-family-mono)', color: comp.anomaly_prediction === 1 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                      {comp.anomaly_prediction === 1 ? `Detected (${comp.anomaly_probability}%)` : `Nominal (${comp.anomaly_probability}%)`}
                    </span>
                  </div>

                  <div style={{ padding: '10px', backgroundColor: 'var(--color-bg-subtle)', borderRadius: '6px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'block' }}>Trend Risk</span>
                    <span style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'var(--font-family-mono)', color: 'var(--color-text)' }}>
                      {comp.trend_risk !== null && comp.trend_risk !== undefined ? `${comp.trend_risk} / 100` : '--'}
                    </span>
                  </div>
                </div>

                {/* TreeSHAP Causal Reason */}
                <div style={{ marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid var(--color-border)', fontSize: '12px' }}>
                  <div style={{ color: 'var(--color-text-muted)', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Sparkles size={12} />
                    <span>TreeSHAP Attribution:</span>
                  </div>
                  <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                    {comp.primary_reason || 'Operating within baseline envelope.'}
                  </div>
                  {comp.secondary_reason && (
                    <div style={{ color: 'var(--color-text-secondary)', fontSize: '11px', marginTop: '2px' }}>
                      Secondary: {comp.secondary_reason}
                    </div>
                  )}
                </div>

                {/* Action CTA */}
                <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'flex-end' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600, color: 'var(--color-primary)' }}>
                    <span>Deep Component Analysis</span>
                    <ChevronRight size={14} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
