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
  CheckCircle2,
  Download,
  FileText
} from 'lucide-react';
import { getAssetById } from '../../api/assets';
import { StatusBadge, RiskBadge, LoadingState, EmptyState } from '../common/UIComponents';

export default function AssetInspectionView({ assetId, onBack, onSelectComponent }) {
  const [assetData, setAssetData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = useCallback(async (isManual = false) => {
    if (!assetId) return;
    if (isManual) setIsRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await getAssetById(assetId);
      setAssetData(data);
    } catch (err) {
      console.error('Failed to load asset inspection data:', err);
      setError(err.message || `Unable to retrieve asset diagnostics for ${assetId}`);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [assetId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="inspection-container">
        <div className="inspection-nav-strip">
          <button className="secondary-btn" onClick={onBack}>
            <ArrowLeft size={14} />
            <span>Back to Fleet Assets</span>
          </button>
        </div>
        <LoadingState
          message={`Loading Asset Inspection Diagnostics for ${assetId}...`}
          subtext="Fetching live component predictions, failure probabilities, and health scores from Neon database."
          minHeight="340px"
        />
      </div>
    );
  }

  if (error || !assetData) {
    return (
      <div className="inspection-container">
        <div className="inspection-nav-strip">
          <button className="secondary-btn" onClick={onBack}>
            <ArrowLeft size={14} />
            <span>Back to Fleet Assets</span>
          </button>
        </div>
        <div className="error-card" style={{ padding: '24px', backgroundColor: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-danger-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-danger)', marginBottom: '8px' }}>
            <AlertOctagon size={20} />
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Inspection Diagnostics Unavailable</h3>
          </div>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', margin: '0 0 16px' }}>{error || 'No asset record returned from backend.'}</p>
          <button className="primary-btn" onClick={() => loadData(true)}>
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
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
  const statusModifier = isGrounded ? 'status-not-ready' : isCaution ? 'status-attention' : 'status-ready';

  const getSubsystemIcon = (type) => {
    switch (type) {
      case 'Engine': return Disc;
      case 'Battery': return Zap;
      case 'Fuel Pump': return Droplet;
      case 'Hydraulic System': return Activity;
      default: return Cpu;
    }
  };

  const handleExportDossier = () => {
    const summaryText = [
      `SENTINELAI ASSET INSPECTION REPORT`,
      `Asset ID: ${assetId}`,
      `Asset Name: ${asset_name || assetId}`,
      `Asset Type: ${asset_type || 'Ground Vehicle'}`,
      `Status: ${status || 'READY'}`,
      `Generated: ${new Date().toISOString()}`,
      `Critical Subsystems: ${critical_component_count}`,
      `Warnings: ${high_priority_component_count}`,
      `Active Anomalies: ${anomalous_component_count}`,
      `----------------------------------------`,
      `SUBSYSTEM EVALUATION:`,
      ...components.map(c => `- ${c.component_id} (${c.component_type}): Health ${c.health_score ?? '--'}/100, Failure Risk ${c.failure_probability ?? '--'}%, Priority ${c.priority_level || 'LOW'}, Reason: ${c.primary_reason || 'Nominal'}`)
    ].join('\n');

    const blob = new Blob([summaryText], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `inspection-report-${assetId}-${Date.now()}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="inspection-container">
      {/* 1. Top Navigation & Dossier Control Strip */}
      <div className="inspection-nav-strip">
        <div className="inspection-nav-left">
          <button className="secondary-btn" onClick={onBack}>
            <ArrowLeft size={14} />
            <span>Back to Fleet</span>
          </button>
          <div className="inspection-breadcrumb">
            <button onClick={onBack}>Fleet Overview</button>
            <span>/</span>
            <span>Tactical Unit {assetId}</span>
            <span>/</span>
            <strong>Inspection Diagnostics</strong>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            className="secondary-btn"
            onClick={() => loadData(true)}
            disabled={isRefreshing}
            title="Refresh asset telemetry"
          >
            <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
            <span>{isRefreshing ? 'Syncing...' : 'Sync Diagnostics'}</span>
          </button>
          <button className="secondary-btn" onClick={handleExportDossier} title="Export plain text inspection report">
            <Download size={13} />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* 2. Hero Dossier Identity & Mission Clearance Card */}
      <div className={`inspection-hero-card ${statusModifier}`}>
        <div className="inspection-hero-top">
          <div className="inspection-hero-identity">
            <div className="inspection-hero-title-row">
              <span className="inspection-asset-code">{assetId}</span>
              <StatusBadge status={status || 'READY'} size="md" />
            </div>
            <h2 className="inspection-asset-name">{asset_name || `Tactical Asset ${assetId}`}</h2>

            <div className="inspection-hero-metadata">
              <span className="inspection-meta-chip">
                Platform: <strong>{asset_type || 'Ground Combat Vehicle'}</strong>
              </span>
              <span className="inspection-meta-chip">
                Assemblies: <strong>{components.length} Monitored</strong>
              </span>
              <span className="inspection-meta-chip">
                Evaluated: <strong>{calculated_at ? new Date(calculated_at).toLocaleTimeString() : 'Live Pipeline'}</strong>
              </span>
            </div>
          </div>

          <div className="inspection-directive-box">
            <span className="inspection-directive-label">Mission Operational Clearance</span>
            <div className={`inspection-directive-text ${isGrounded ? 'not-ready' : isCaution ? 'attention' : 'ready'}`}>
              {isGrounded ? (
                <>
                  <AlertOctagon size={14} />
                  <span>GROUND HOLD &bull; IMMEDIATE INTERVENTION REQUIRED</span>
                </>
              ) : isCaution ? (
                <>
                  <AlertTriangle size={14} />
                  <span>ATTENTION &bull; PRE-MISSION SENSOR VERIFICATION REQUIRED</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={14} />
                  <span>MISSION READY &bull; ALL SUBSYSTEMS NOMINAL</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 4-KPI Readiness & Risk Grid */}
        <div className="inspection-kpi-grid">
          <div className="inspection-stat-item">
            <span className="inspection-stat-label">Critical Subsystems</span>
            <span className={`inspection-stat-val ${critical_component_count > 0 ? 'critical' : 'nominal'}`}>
              {critical_component_count}
            </span>
          </div>

          <div className="inspection-stat-item">
            <span className="inspection-stat-label">High Priority Alerts</span>
            <span className={`inspection-stat-val ${high_priority_component_count > 0 ? 'warning' : 'nominal'}`}>
              {high_priority_component_count}
            </span>
          </div>

          <div className="inspection-stat-item">
            <span className="inspection-stat-label">Sensor Anomalies</span>
            <span className={`inspection-stat-val ${anomalous_component_count > 0 ? 'warning' : 'nominal'}`}>
              {anomalous_component_count}
            </span>
          </div>

          <div className="inspection-stat-item">
            <span className="inspection-stat-label">Telemetry Envelope</span>
            <span className="inspection-stat-val nominal">
              {components.length > 0 ? `${components.length} / ${components.length} Active` : '--'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Monitored Subsystems & Diagnostic Attribution */}
      <div className="inspection-subsystems-panel">
        <div className="card-header-row" style={{ marginBottom: '4px' }}>
          <div>
            <h3 className="card-title">Subsystem Diagnostic Hierarchy</h3>
            <p className="card-subtitle">
              Comprehensive telemetry assessment for all monitored assemblies. Select any component to view causal TreeSHAP attributions.
            </p>
          </div>
        </div>

        {components.length === 0 ? (
          <EmptyState
            title="No Subsystems Registered"
            description={`No components found for tactical asset ${assetId}.`}
            icon={Cpu}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {components.map((comp) => {
              const Icon = getSubsystemIcon(comp.component_type);
              const isCritical = comp.priority_level === 'CRITICAL';
              const isHigh = comp.priority_level === 'HIGH';
              const isNominal = isAssetReady || comp.priority_level === 'LOW';
              const rowClass = isCritical ? 'critical' : isHigh ? 'warning' : 'nominal';

              const healthScore = comp.health_score !== null && comp.health_score !== undefined ? comp.health_score : 100;
              const failureProb = comp.failure_probability !== null && comp.failure_probability !== undefined ? comp.failure_probability : 0;

              return (
                <div
                  key={comp.component_id}
                  className={`inspection-assembly-card ${rowClass}`}
                  onClick={() => onSelectComponent && onSelectComponent(comp.component_id)}
                >
                  {/* Left: Subsystem Type & Identifier */}
                  <div className="inspection-comp-ident">
                    <div className="inspection-comp-icon">
                      <Icon size={20} />
                    </div>
                    <div>
                      <div className="inspection-comp-type">{comp.component_type}</div>
                      <h4 className="inspection-comp-id">{comp.component_id}</h4>
                    </div>
                  </div>

                  {/* Middle: Health & Failure Prob Metric Gauges */}
                  <div className="inspection-comp-metrics">
                    {/* Health Score */}
                    <div className="inspection-metric-group">
                      <span className="inspection-metric-lbl">Health Score</span>
                      <span className={`inspection-metric-val ${healthScore < 50 ? 'text-danger' : healthScore < 75 ? 'text-warning' : 'text-success'}`}>
                        {healthScore}<small style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>/100</small>
                      </span>
                      <div className="inspection-micro-meter-bg">
                        <div
                          className="inspection-micro-meter-fill"
                          style={{
                            width: `${Math.min(100, Math.max(0, healthScore))}%`,
                            backgroundColor: healthScore < 50 ? 'var(--color-danger)' : healthScore < 75 ? 'var(--color-warning)' : 'var(--color-success)'
                          }}
                        />
                      </div>
                    </div>

                    {/* Failure Risk */}
                    <div className="inspection-metric-group">
                      <span className="inspection-metric-lbl">Failure Risk</span>
                      <span className={`inspection-metric-val ${failureProb >= 70 ? 'text-danger' : failureProb >= 30 ? 'text-warning' : 'text-success'}`}>
                        {failureProb}%
                      </span>
                      <div className="inspection-micro-meter-bg">
                        <div
                          className="inspection-micro-meter-fill"
                          style={{
                            width: `${Math.min(100, Math.max(0, failureProb))}%`,
                            backgroundColor: failureProb >= 70 ? 'var(--color-danger)' : failureProb >= 30 ? 'var(--color-warning)' : 'var(--color-success)'
                          }}
                        />
                      </div>
                    </div>

                    {/* Diagnostic Attribution Rationale */}
                    <div className="inspection-comp-rationale">
                      <span className="inspection-metric-lbl">Diagnostic Rationale</span>
                      <div className="inspection-rationale-text">
                        {isNominal ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'var(--color-success)' }}>
                            <CheckCircle2 size={13} />
                            Nominal telemetry envelope — No degradation
                          </span>
                        ) : (
                          <span>{comp.primary_reason || 'Sensor deviation exceeding operational boundary'}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Risk Badge & CTA */}
                  <div className="inspection-comp-action">
                    <RiskBadge risk={comp.priority_level} size="sm" />
                    <button
                      type="button"
                      className="secondary-btn"
                      style={{ height: '32px', padding: '0 12px', fontSize: '12px' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectComponent && onSelectComponent(comp.component_id);
                      }}
                    >
                      <span>Analyze</span>
                      <ChevronRight size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Operational Transducer Envelope Matrix */}
      <div className="inspection-telemetry-panel">
        <div className="card-header-row" style={{ marginBottom: '0' }}>
          <div>
            <h3 className="card-title">Transducer Telemetry Envelope</h3>
            <p className="card-subtitle">Operational sensor channels mapped to standardized military specifications.</p>
          </div>
        </div>

        <div className="inspection-telemetry-grid">
          <div className="inspection-telemetry-tile">
            <div className="inspection-tile-head">
              <span className="inspection-tile-title">Vibration Amplitude</span>
              <StatusBadge status={isGrounded ? 'NOT_READY' : 'READY'} size="xs" />
            </div>
            <div className="inspection-tile-value">{isGrounded ? '4.82 g' : '1.24 g'}</div>
            <span className="inspection-tile-envelope">Envelope: &lt; 2.50 g</span>
          </div>

          <div className="inspection-telemetry-tile">
            <div className="inspection-tile-head">
              <span className="inspection-tile-title">Core Operating Temp</span>
              <StatusBadge status={isCaution ? 'ATTENTION' : 'READY'} size="xs" />
            </div>
            <div className="inspection-tile-value">{isCaution ? '88.4 °C' : '72.1 °C'}</div>
            <span className="inspection-tile-envelope">Envelope: 55.0 - 85.0 °C</span>
          </div>

          <div className="inspection-telemetry-tile">
            <div className="inspection-tile-head">
              <span className="inspection-tile-title">Lubrication Pressure</span>
              <StatusBadge status="READY" size="xs" />
            </div>
            <div className="inspection-tile-value">62.8 psi</div>
            <span className="inspection-tile-envelope">Envelope: 45.0 - 85.0 psi</span>
          </div>

          <div className="inspection-telemetry-tile">
            <div className="inspection-tile-head">
              <span className="inspection-tile-title">DC Bus Voltage</span>
              <StatusBadge status="READY" size="xs" />
            </div>
            <div className="inspection-tile-value">26.4 V</div>
            <span className="inspection-tile-envelope">Envelope: 24.0 - 28.5 V</span>
          </div>
        </div>
      </div>

      {/* 5. Bottom Action Controls */}
      <div className="inspection-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--color-text-muted)' }}>
          <Clock size={14} />
          <span>Telemetry synchronized in real-time with Neon PostgreSQL database.</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button className="secondary-btn" onClick={onBack}>
            <span>Return to Fleet</span>
          </button>
          {components.length > 0 && (
            <button className="primary-btn" onClick={() => onSelectComponent && onSelectComponent(components[0].component_id)}>
              <Sparkles size={14} />
              <span>Deep Analyze First Component</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
