import React, { useState, useEffect, useCallback } from 'react';
import {
  Radio,
  Activity,
  TrendingUp,
  Cpu,
  Layers,
  RefreshCw,
  Search,
  ChevronRight,
  ShieldCheck,
  AlertOctagon,
  AlertTriangle
} from 'lucide-react';
import { getCriticalComponents, getHighPriorityComponents, getDashboardSummary } from '../../api/dashboard';
import { getComponentHistory } from '../../api/components';
import { PageHeader, KpiCard, StatusBadge, RiskBadge, LoadingState, EmptyState } from '../common/UIComponents';
import TelemetryChart from '../fleet/TelemetryChart';

export default function TrendsHealthView({ onAnalyzeComponent, onInspectAsset }) {
  const [summary, setSummary] = useState(null);
  const [criticalList, setCriticalList] = useState([]);
  const [highPriorityList, setHighPriorityList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Selected component for deep telemetry curve inspection
  const [selectedCompId, setSelectedCompId] = useState('A035-HYD');
  const [compHistory, setCompHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sumData, critData, highData] = await Promise.all([
        getDashboardSummary(),
        getCriticalComponents(),
        getHighPriorityComponents()
      ]);

      const safeCrit = Array.isArray(critData)
        ? critData
        : (Array.isArray(critData?.components) ? critData.components : []);
      const safeHigh = Array.isArray(highData)
        ? highData
        : (Array.isArray(highData?.components) ? highData.components : []);

      setSummary(sumData);
      setCriticalList(safeCrit);
      setHighPriorityList(safeHigh);

      // If available, set initial selected component
      if (safeCrit.length > 0) {
        setSelectedCompId(safeCrit[0].component_id);
      } else if (safeHigh.length > 0) {
        setSelectedCompId(safeHigh[0].component_id);
      }
    } catch (err) {
      console.error('Failed to load trends data:', err);
      setError(err.message || 'Unable to retrieve trends and health metrics from backend.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadComponentHistory = useCallback(async (cid) => {
    if (!cid) return;
    setLoadingHistory(true);
    try {
      const history = await getComponentHistory(cid, { limit: 50 });
      const safeHistory = Array.isArray(history)
        ? history
        : (Array.isArray(history?.readings) ? history.readings : []);
      setCompHistory(safeHistory);
    } catch (err) {
      console.error('Failed to load history for component:', err);
      setCompHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (selectedCompId) {
      loadComponentHistory(selectedCompId);
    }
  }, [selectedCompId, loadComponentHistory]);

  const safeCriticalList = Array.isArray(criticalList) ? criticalList : [];
  const safeHighPriorityList = Array.isArray(highPriorityList) ? highPriorityList : [];
  const allRanked = [...safeCriticalList, ...safeHighPriorityList];

  return (
    <div className="trends-view-container">
      {/* 1. Header */}
      <PageHeader
        badgeText="Subsystem Sensor Dynamics"
        badgeIcon={Radio}
        title="Telemetry Trends & Subsystem Health"
        subtitle="Continuous 4-signal trend risk evaluations (Rate of Change, Degradation, Persistence, Multi-Sensor) synthesized from real-time HUMS streams."
        actions={
          <button className="secondary-btn" onClick={loadData} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh Trends</span>
          </button>
        }
      />

      {error && (
        <div className="error-banner" style={{
          marginBottom: '16px',
          padding: '12px 16px',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid var(--color-critical)',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: 'var(--color-critical)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertOctagon size={16} />
            <span>{error}</span>
          </div>
          <button
            className="secondary-btn"
            onClick={loadData}
            style={{ fontSize: '12px', padding: '4px 8px' }}
          >
            Retry
          </button>
        </div>
      )}

      {/* 2. Real Metrics Overview */}
      <div className="grid-kpi">
        <KpiCard
          title="Monitored Subsystems"
          value={summary?.total_components ?? (loading ? '—' : 0)}
          subtitle="Engine, Battery, Fuel Pump, Hydraulic"
          icon={Layers}
          variant="default"
          loading={loading}
        />
        <KpiCard
          title="Telemetry Deviations"
          value={summary?.component_risk_summary?.anomalous_components ?? (loading ? '—' : 0)}
          subtitle="Out-of-envelope sensor anomalies"
          icon={Radio}
          variant="caution"
          loading={loading}
        />
        <KpiCard
          title="Critical Trend Alerts"
          value={safeCriticalList.length}
          subtitle="Accelerating degradation vectors"
          icon={AlertOctagon}
          variant="critical"
          loading={loading}
        />
        <KpiCard
          title="Tactical Fleet Size"
          value={summary?.total_assets ?? (loading ? '—' : 0)}
          subtitle="Registered assets in database"
          icon={ShieldCheck}
          variant="ready"
          loading={loading}
        />
      </div>

      {/* 3. Deep Telemetry Visualizer Card */}
      <div className="sentinel-card" style={{ marginBottom: '20px' }}>
        <div className="card-header-row" style={{ marginBottom: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={18} style={{ color: 'var(--color-primary)' }} />
              <h3 className="card-title">Live Sensor Telemetry Curve: {selectedCompId}</h3>
            </div>
            <p className="card-subtitle">
              Inspect historical sensor variance (Vibration, Temperature, Pressure, RPM) from PostgreSQL telemetry tables.
            </p>
          </div>

          {/* Quick Component Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Focus Component:</span>
            <select
              value={selectedCompId}
              onChange={(e) => setSelectedCompId(e.target.value)}
              className="sentinel-select"
              style={{
                backgroundColor: 'var(--color-bg)',
                color: 'var(--color-text)',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                padding: '6px 10px',
                fontSize: '12px',
                fontFamily: 'var(--font-family-mono)'
              }}
            >
              {allRanked.slice(0, 15).map((c) => (
                <option key={c.component_id} value={c.component_id}>
                  {c.component_id} ({c.component_type} - {c.priority_level})
                </option>
              ))}
            </select>
          </div>
        </div>

        {loadingHistory ? (
          <LoadingState
            message={`Loading historical sensor readings for ${selectedCompId}...`}
            subtext="Querying Neon sensor_readings table"
            size="sm"
            minHeight="200px"
          />
        ) : compHistory.length > 0 ? (
          <TelemetryChart readings={compHistory} />
        ) : (
          <EmptyState
            title="No Sensor Readings"
            description={`No sensor records found in history for ${selectedCompId}.`}
            icon={Radio}
          />
        )}
      </div>

      {/* 4. Active Subsystem Trend Risk Table */}
      <div className="sentinel-card">
        <div className="card-header-row" style={{ marginBottom: '14px' }}>
          <div>
            <h3 className="card-title">4-Signal Component Trend Risk Ranking</h3>
            <p className="card-subtitle">
              Rule-based trend risk score evaluated from rate of change and persistence over recent telemetry cycles.
            </p>
          </div>
        </div>

        {loading ? (
          <LoadingState
            message="Evaluating Trend Dynamics..."
            subtext="Loading verified component risk scores"
            minHeight="240px"
          />
        ) : allRanked.length === 0 ? (
          <EmptyState
            title="All Component Trends Nominal"
            description="No active components exhibit elevated degradation trends."
            icon={ShieldCheck}
          />
        ) : (
          <div className="table-wrapper">
            <table className="sentinel-table">
              <thead>
                <tr>
                  <th>Component ID</th>
                  <th>Subsystem Type</th>
                  <th>Parent Asset</th>
                  <th>Trend Risk Score</th>
                  <th>Failure Risk</th>
                  <th>Health Score</th>
                  <th>Priority Level</th>
                  <th>SHAP Attribution</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {allRanked.slice(0, 12).map((c) => (
                  <tr
                    key={c.component_id}
                    onClick={() => setSelectedCompId(c.component_id)}
                    style={{ cursor: 'pointer', backgroundColor: selectedCompId === c.component_id ? 'var(--color-surface-hover)' : 'transparent' }}
                  >
                    <td>
                      <strong style={{ fontFamily: 'var(--font-family-mono)', color: 'var(--color-text)' }}>
                        {c.component_id}
                      </strong>
                    </td>
                    <td>{c.component_type}</td>
                    <td>
                      <button
                        className="btn-link"
                        style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 600 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onInspectAsset && onInspectAsset(c.asset_id);
                        }}
                      >
                        {c.asset_id}
                      </button>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 700, color: 'var(--color-text)' }}>
                        {c.trend_risk !== undefined ? `${c.trend_risk} / 100` : '--'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 800, color: c.failure_probability >= 70 ? 'var(--color-danger)' : '#f97316' }}>
                        {c.failure_probability}%
                      </span>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 700, color: c.health_score < 50 ? 'var(--color-danger)' : 'var(--color-warning)' }}>
                        {c.health_score} / 100
                      </span>
                    </td>
                    <td>
                      <RiskBadge risk={c.priority_level} size="sm" />
                    </td>
                    <td>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text)' }}>
                        {c.primary_reason}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          className="secondary-btn"
                          style={{ height: '28px', padding: '0 8px', fontSize: '11px' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCompId(c.component_id);
                          }}
                          title="Plot Sensor Curve"
                        >
                          <span>Plot</span>
                        </button>
                        <button
                          className="secondary-btn"
                          style={{ height: '28px', padding: '0 8px', fontSize: '11px' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onAnalyzeComponent && onAnalyzeComponent(c.component_id);
                          }}
                          title="Analyze Component"
                        >
                          <ChevronRight size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
