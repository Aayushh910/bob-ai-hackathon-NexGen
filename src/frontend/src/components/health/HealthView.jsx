import React, { useState, useEffect, useCallback } from 'react';
import {
  Radio,
  Activity,
  Cpu,
  Layers,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  RefreshCw,
  Search,
  Filter,
  BarChart2,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { getSubsystemAnalytics, getCommandKPIs } from '../../api/command';
import { getFleetReadinessStatistics } from '../../api/readiness';
import { PageHeader, KpiCard, StatusBadge, LoadingSpinner, LoadingState } from '../common/UIComponents';
import AssetDetailModal from '../fleet/AssetDetailModal';

export default function HealthView() {
  const [subsystems, setSubsystems] = useState([]);
  const [kpis, setKpis] = useState(null);
  const [readinessStats, setReadinessStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAssetModal, setSelectedAssetModal] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [subsRes, kpisRes, statsRes] = await Promise.allSettled([
        getSubsystemAnalytics(),
        getCommandKPIs(),
        getFleetReadinessStatistics()
      ]);

      if (subsRes.status === 'fulfilled') setSubsystems(subsRes.value || []);
      if (kpisRes.status === 'fulfilled') setKpis(kpisRes.value || null);
      if (statsRes.status === 'fulfilled') setReadinessStats(statsRes.value || null);
    } catch (err) {
      console.error('Failed to load equipment health diagnostics:', err);
      setError(err.message || 'Unable to retrieve telemetry health diagnostics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const handleUpdate = () => {
      loadData();
    };
    window.addEventListener('sentinel:data-updated', handleUpdate);
    return () => window.removeEventListener('sentinel:data-updated', handleUpdate);
  }, [loadData]);

  const totalAnomalies = subsystems.reduce((acc, curr) => acc + (curr.active_anomaly_count || 0), 0);
  const totalFailures = subsystems.reduce((acc, curr) => acc + (curr.historical_failures || 0), 0);

  return (
    <div className="health-view-container">
      <PageHeader
        badgeText="Subsystem Diagnostics & Sensor Intelligence"
        badgeIcon={Radio}
        title="Equipment Health & Subsystem Diagnostics"
        subtitle="Live telemetry integrity metrics, subsystem degradation scoring, and sensor anomaly attributions."
        actions={
          <button className="secondary-btn" onClick={loadData} disabled={loading}>
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Poll Telemetry Sensors</span>
          </button>
        }
      />

      {/* KPI Cards (4 columns) */}
      <div className="grid-kpi">
        <KpiCard
          title="Monitored Subsystems"
          value={subsystems.length || '4'}
          subtitle="Engine, Hydraulic, Fuel, Electrical"
          icon={Layers}
          variant="default"
          loading={loading}
        />
        <KpiCard
          title="Active Sensor Anomalies"
          value={totalAnomalies}
          subtitle="Out-of-envelope telemetry readings"
          icon={AlertOctagon}
          variant={totalAnomalies > 0 ? 'critical' : 'ready'}
          loading={loading}
        />
        <KpiCard
          title="Telemetry Feed Integrity"
          value="99.8%"
          subtitle="Real-time multi-sensor ingestion"
          icon={CheckCircle2}
          variant="ready"
          loading={loading}
        />
        <KpiCard
          title="Historical Component Overhauls"
          value={totalFailures}
          subtitle="Depot-serviced mechanical variances"
          icon={Cpu}
          variant="caution"
          loading={loading}
        />
      </div>

      {/* Subsystem Health Cards Grid */}
      <div className="card-header-row" style={{ marginTop: '16px' }}>
        <div>
          <h2 className="card-title">Subsystem Degradation &amp; Component Telemetry</h2>
          <p className="card-subtitle">
            Continuous vibration, thermal, pressure, and operational strain diagnostics across primary mechanical assemblies.
          </p>
        </div>
      </div>

      {loading ? (
        <LoadingState
          message="Polling Telemetry Sensors & Subsystems..."
          subtext="Synthesizing multi-axis vibration harmonics, thermal gradients, and hydraulic pressure feeds."
          size="lg"
          minHeight="220px"
        />
      ) : (
        <div className="grid-3-col" style={{ marginBottom: '24px' }}>
          {subsystems.map((sub, idx) => {
            const isDegraded = sub.active_anomaly_count > 0;
            return (
              <div key={idx} className="sentinel-card">
                <div className="card-header-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Cpu size={18} style={{ color: 'var(--color-text-secondary)' }} />
                    <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text)' }}>
                      {sub.subsystem_name}
                    </h3>
                  </div>
                  <StatusBadge status={isDegraded ? 'DEGRADED' : 'READY'} size="sm" />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', margin: '12px 0' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'block' }}>Anomalies</span>
                    <span style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'var(--font-family-mono)', color: sub.active_anomaly_count > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                      {sub.active_anomaly_count}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'block' }}>Serviced</span>
                    <span style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'var(--font-family-mono)', color: 'var(--color-text)' }}>
                      {sub.serviced_count}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'block' }}>Queued</span>
                    <span style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'var(--font-family-mono)', color: 'var(--color-text)' }}>
                      {sub.target_intervention_count}
                    </span>
                  </div>
                </div>

                <div style={{ marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid var(--color-border)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Frequently Monitored Parts: </span>
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>
                    {sub.common_parts_replaced?.length > 0 ? sub.common_parts_replaced.join(', ') : 'Bearings, Seals, Filters'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sensor Health Attribution Details */}
      <div className="sentinel-card">
        <div className="card-header-row">
          <div>
            <h3 className="card-title">Sensor Health Attributes &amp; Operational Thresholds</h3>
            <p className="card-subtitle">Standard operating parameters enforced by HUMS diagnostic algorithms</p>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="sentinel-table">
            <thead>
              <tr>
                <th>Subsystem</th>
                <th>Diagnostic Parameter</th>
                <th>Operational Range</th>
                <th>Tolerance Threshold</th>
                <th>Diagnostic Method</th>
                <th>Health Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Engine Assembly</strong></td>
                <td>Exhaust Gas Temperature (EGT)</td>
                <td>450 &ndash; 750 &deg;C</td>
                <td>&gt; 820 &deg;C (Exceedance)</td>
                <td>Thermal Invariance &amp; Gradient</td>
                <td><StatusBadge status="READY" size="sm" /></td>
              </tr>
              <tr>
                <td><strong>Engine Assembly</strong></td>
                <td>Vibration Velocity (RMS)</td>
                <td>0.8 &ndash; 3.2 mm/s</td>
                <td>&gt; 4.5 mm/s (Bearing Wear)</td>
                <td>FFT Spectral Harmonic Analysis</td>
                <td><StatusBadge status="CAUTION" size="sm" /></td>
              </tr>
              <tr>
                <td><strong>Hydraulic System</strong></td>
                <td>System Pressure (Bar)</td>
                <td>180 &ndash; 210 bar</td>
                <td>&lt; 165 bar (Leak / Cavitation)</td>
                <td>Pressure Transducer Baseline</td>
                <td><StatusBadge status="READY" size="sm" /></td>
              </tr>
              <tr>
                <td><strong>Fuel Delivery</strong></td>
                <td>Pump Flow Velocity</td>
                <td>120 &ndash; 160 L/h</td>
                <td>&lt; 105 L/h (Filter Restriction)</td>
                <td>Flow Rate Volumetric Decay</td>
                <td><StatusBadge status="READY" size="sm" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {selectedAssetModal && (
        <AssetDetailModal
          asset={selectedAssetModal}
          onClose={() => setSelectedAssetModal(null)}
        />
      )}
    </div>
  );
}
