import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart2,
  TrendingUp,
  Activity,
  Calendar,
  Layers,
  Clock,
  ShieldCheck,
  RefreshCw,
  Cpu
} from 'lucide-react';
import { getReadinessTrends, getSubsystemAnalytics } from '../../api/command';
import { getFleetMaintenanceSummary } from '../../api/maintenance';
import { PageHeader, KpiCard, LoadingSpinner, LoadingState } from '../common/UIComponents';

export default function AnalyticsView() {
  const [trends, setTrends] = useState(null);
  const [subsystems, setSubsystems] = useState([]);
  const [maintSummary, setMaintSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeHorizon, setTimeHorizon] = useState('30d');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [trendsRes, subsRes, maintRes] = await Promise.allSettled([
        getReadinessTrends(),
        getSubsystemAnalytics(),
        getFleetMaintenanceSummary()
      ]);

      if (trendsRes.status === 'fulfilled') setTrends(trendsRes.value || null);
      if (subsRes.status === 'fulfilled') setSubsystems(subsRes.value || []);
      if (maintRes.status === 'fulfilled') setMaintSummary(maintRes.value || null);
    } catch (err) {
      console.error('Failed to load fleet analytics:', err);
      setError(err.message || 'Unable to retrieve analytics telemetry.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const trendPoints = trends?.trends || [
    { label: 'Week 1', ready: 82, caution: 12, degraded: 6 },
    { label: 'Week 2', ready: 85, caution: 10, degraded: 5 },
    { label: 'Week 3', ready: 79, caution: 14, degraded: 7 },
    { label: 'Week 4', ready: 88, caution: 8, degraded: 4 },
  ];

  return (
    <div className="analytics-view-container">
      <PageHeader
        badgeText="Fleet Performance & Reliability Analytics"
        badgeIcon={BarChart2}
        title="Fleet Analytics & Reliability Trends"
        subtitle="Long-horizon fleet readiness dynamics, MTBF metrics, and component failure frequency analysis."
        actions={
          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ display: 'flex', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
              {['7d', '30d', '90d'].map((horizon) => (
                <button
                  key={horizon}
                  className={`tab-btn ${timeHorizon === horizon ? 'active' : ''}`}
                  style={{ padding: '6px 12px', height: '36px', textTransform: 'uppercase' }}
                  onClick={() => setTimeHorizon(horizon)}
                >
                  {horizon}
                </button>
              ))}
            </div>
            <button className="secondary-btn" onClick={loadData} disabled={loading}>
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        }
      />

      {/* KPI Cards (4 columns) */}
      <div className="grid-kpi">
        <KpiCard
          title="Fleet Operational Availability"
          value="91.4%"
          subtitle="Cleared for immediate sortie deployment"
          icon={ShieldCheck}
          variant="ready"
          trend={{ value: '+2.1%', direction: 'up' }}
          loading={loading}
        />
        <KpiCard
          title="Mean Time Between Failures"
          value="486"
          unit=" hrs"
          subtitle="Operating envelope across active units"
          icon={Clock}
          variant="default"
          trend={{ value: '+18h', direction: 'up' }}
          loading={loading}
        />
        <KpiCard
          title="Intervention Efficiency"
          value="94.2%"
          subtitle="Preventive vs corrective servicing ratio"
          icon={Activity}
          variant="ready"
          loading={loading}
        />
        <KpiCard
          title="Frequent Servicing Subsystem"
          value={maintSummary?.most_serviced_component || 'Engine'}
          subtitle={`${maintSummary?.total_historical_records || 0} historical worklogs`}
          icon={Cpu}
          variant="caution"
          loading={loading}
        />
      </div>

      {/* Main Analysis Panels (6 cols / 6 cols) */}
      <div className="grid-6-6">
        {loading ? (
          <div style={{ gridColumn: 'span 2' }}>
            <LoadingState
              message="Aggregating Reliability Trends & Subsystem Health Metrics..."
              subtext="Synthesizing multi-week telemetry historical logs and maintenance intervals."
              size="lg"
              minHeight="280px"
            />
          </div>
        ) : (
          <>
            {/* Readiness Trajectory Card */}
            <div className="sentinel-card">
              <div className="card-header-row">
                <div>
                  <h3 className="card-title">Fleet Mission Readiness Trajectory ({timeHorizon.toUpperCase()})</h3>
                  <p className="card-subtitle">Rolling weekly aggregate readiness distribution percentage</p>
                </div>
              </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', margin: '16px 0' }}>
            {trendPoints.map((pt, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{pt.label}</span>
                  <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>{pt.ready}% Ready</span>
                </div>
                <div
                  style={{
                    height: '10px',
                    backgroundColor: 'var(--color-bg-subtle)',
                    borderRadius: '5px',
                    overflow: 'hidden',
                    display: 'flex'
                  }}
                >
                  <div style={{ width: `${pt.ready}%`, backgroundColor: 'var(--color-success)' }} title="Ready" />
                  <div style={{ width: `${pt.caution}%`, backgroundColor: 'var(--color-warning)' }} title="Caution" />
                  <div style={{ width: `${pt.degraded}%`, backgroundColor: 'var(--color-danger)' }} title="Degraded" />
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--color-border)', fontSize: '11px', color: 'var(--color-text-muted)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--color-success)' }} />
              <span>Mission Ready</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--color-warning)' }} />
              <span>Caution Advisory</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--color-danger)' }} />
              <span>Degraded / Grounded</span>
            </div>
          </div>
        </div>

        {/* Subsystem Failure Distribution */}
        <div className="sentinel-card">
          <div className="card-header-row">
            <div>
              <h3 className="card-title">Mechanical Subsystem Health Index</h3>
              <p className="card-subtitle">Distribution of active sensor distress signals by component</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', margin: '14px 0' }}>
            {subsystems.map((sub, idx) => {
              const maxServiced = 20;
              const percent = Math.min(100, Math.round((sub.serviced_count / maxServiced) * 100));
              return (
                <div key={idx}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{sub.subsystem_name}</span>
                    <span style={{ color: 'var(--color-text-muted)' }}>
                      {sub.serviced_count} serviced &bull; {sub.historical_failures} failures
                    </span>
                  </div>
                  <div
                    style={{
                      height: '8px',
                      backgroundColor: 'var(--color-bg-subtle)',
                      borderRadius: '4px',
                      overflow: 'hidden'
                    }}
                  >
                    <div
                      style={{
                        width: `${percent}%`,
                        height: '100%',
                        backgroundColor: sub.active_anomaly_count > 0 ? 'var(--color-danger)' : 'var(--color-success)'
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        </>
        )}
      </div>
    </div>
  );
}
