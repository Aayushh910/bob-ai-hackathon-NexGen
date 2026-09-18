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
  Sparkles,
  Zap,
  Disc,
  Droplet,
  CheckCircle2
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
    asset_name,
    asset_type,
    status,
    critical_component_count = 0,
    high_priority_component_count = 0,
    anomalous_component_count = 0,
    calculated_at,
    components = []
  } = assetData;

  const isGrounded = status === 'NOT_READY';
  const isCaution = status === 'ATTENTION';
  const isAssetReady = status === 'READY';

  const getSubsystemIcon = (type) => {
    switch (type) {
      case 'Engine': return Disc;
      case 'Battery': return Zap;
      case 'Fuel Pump': return Droplet;
      case 'Hydraulic System': return Activity;
      default: return Cpu;
    }
  };

  return (
    <div className="fleet-view-container">
      {/* Navigation Return Button */}
      <div style={{ marginBottom: '16px' }}>
        <button className="secondary-btn" onClick={onBack}>
          <ArrowLeft size={14} />
          <span>Back to Fleet Assets</span>
        </button>
      </div>

      {/* 1. Asset Identity & Operational Status Hero Card */}
      <div
        className="sentinel-card"
        style={{
          marginBottom: '24px',
          borderLeft: isGrounded
            ? '4px solid var(--color-danger)'
            : isCaution
            ? '4px solid var(--color-warning)'
            : '4px solid var(--color-success)',
          padding: '24px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <span style={{ fontFamily: 'var(--font-family-mono)', fontSize: '24px', fontWeight: 800, color: 'var(--color-text)' }}>
                {assetId}
              </span>
              <StatusBadge status={status || 'READY'} size="md" />
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 4px', color: 'var(--color-text)' }}>
              {asset_name || `Tactical Unit ${assetId}`}
            </h2>
            <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
              <span>Type: <strong>{asset_type || 'Ground Vehicle'}</strong></span>
              <span>&bull;</span>
              <span>
                Last Evaluated: <strong>{calculated_at ? new Date(calculated_at).toLocaleString() : 'Live Pipeline'}</strong>
              </span>
            </div>
          </div>

          {/* Operational Posture Banner */}
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Operational Directive
            </span>
            <div style={{ fontSize: '14px', fontWeight: 700, marginTop: '2px', color: isGrounded ? 'var(--color-danger)' : isCaution ? 'var(--color-warning)' : 'var(--color-success)' }}>
              {isGrounded
                ? 'GROUND HOLD: CRITICAL SUBSYSTEM REPAIR REQUIRED'
                : isCaution
                ? 'PRE-FLIGHT INSPECTION: SENSOR DEVIATION DETECTED'
                : 'MISSION CLEARANCE APPROVED: NOMINAL POSTURE'}
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

      {/* 2. Subsystem Components & ML Diagnostics (Eye-Catching Tactical List Layout, Not Cramped Grid) */}
      <div className="card-header-row" style={{ marginBottom: '14px' }}>
        <div>
          <h3 className="card-title">Subsystem Components &amp; ML Diagnostics</h3>
          <p className="card-subtitle">Comprehensive status of all 4 monitored assemblies. Select any subsystem to access deep causal attributions and sensor telemetry.</p>
        </div>
      </div>

      {components.length === 0 ? (
        <EmptyState
          title="No Components Found"
          description={`No registered components found for asset ${assetId}.`}
          icon={Cpu}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {components.map((comp) => {
            const Icon = getSubsystemIcon(comp.component_type);
            const isCritical = comp.priority_level === 'CRITICAL';
            const isHigh = comp.priority_level === 'HIGH';
            const isNominal = isAssetReady || comp.priority_level === 'LOW';

            return (
              <div
                key={comp.component_id}
                className="sentinel-card"
                onClick={() => onSelectComponent && onSelectComponent(comp.component_id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '16px',
                  padding: '18px 22px',
                  borderLeft: isCritical
                    ? '4px solid var(--color-danger)'
                    : isHigh
                    ? '4px solid #f97316'
                    : '4px solid var(--color-success)',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease'
                }}
              >
                {/* Left: Subsystem Type & ID */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: '220px' }}>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '8px',
                      backgroundColor: isCritical ? 'var(--color-danger-dim)' : isHigh ? 'rgba(249, 115, 22, 0.15)' : 'var(--color-success-dim)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isCritical ? 'var(--color-danger)' : isHigh ? '#f97316' : 'var(--color-success)',
                      border: `1px solid ${isCritical ? 'var(--color-danger-border)' : isHigh ? 'rgba(249, 115, 22, 0.3)' : 'var(--color-success-border)'}`
                    }}
                  >
                    <Icon size={22} />
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
                      {comp.component_type}
                    </span>
                    <h4 style={{ fontSize: '17px', fontWeight: 800, fontFamily: 'var(--font-family-mono)', margin: '2px 0 0', color: 'var(--color-text)' }}>
                      {comp.component_id}
                    </h4>
                  </div>
                </div>

                {/* Center: Health Score & Failure Probability Gauges */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '28px', flex: '1 1 300px' }}>
                  {/* Health Score */}
                  <div style={{ minWidth: '100px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'block', marginBottom: '2px' }}>Health Score</span>
                    <span style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'var(--font-family-mono)', color: comp.health_score < 50 ? 'var(--color-danger)' : comp.health_score < 75 ? 'var(--color-warning)' : 'var(--color-success)' }}>
                      {comp.health_score !== null && comp.health_score !== undefined ? `${comp.health_score}` : '--'}
                      <small style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>/100</small>
                    </span>
                  </div>

                  {/* Failure Probability */}
                  <div style={{ minWidth: '110px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'block', marginBottom: '2px' }}>Failure Risk</span>
                    <span style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'var(--font-family-mono)', color: comp.failure_probability >= 70 ? 'var(--color-danger)' : comp.failure_probability >= 30 ? '#f97316' : 'var(--color-success)' }}>
                      {comp.failure_probability !== null && comp.failure_probability !== undefined ? `${comp.failure_probability}%` : '--'}
                    </span>
                  </div>

                  {/* Primary Diagnostic Driver Note */}
                  <div style={{ flex: 1, minWidth: '180px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'block', marginBottom: '2px' }}>
                      Diagnostic Rationale
                    </span>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: isNominal ? 'var(--color-success)' : 'var(--color-text)' }}>
                      {isNominal ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <CheckCircle2 size={13} style={{ color: 'var(--color-success)' }} />
                          All operational parameters nominal — No degradation drivers detected
                        </span>
                      ) : (
                        <span>{comp.primary_reason || 'Critical sensor deviation detected'}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Priority Level Badge & Direct Action Button */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
                  <RiskBadge risk={comp.priority_level} size="md" />
                  <button
                    type="button"
                    className="secondary-btn"
                    style={{ height: '34px', padding: '0 14px', fontSize: '12px', fontWeight: 600 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectComponent && onSelectComponent(comp.component_id);
                    }}
                  >
                    <span>Analyze Component</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
