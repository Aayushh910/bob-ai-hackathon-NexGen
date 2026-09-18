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
  AlertTriangle,
  X,
  Eye,
  CheckCircle2,
  Sliders
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

  // Asset/component search input
  const [assetSearch, setAssetSearch] = useState('');

  // Diagnostic summary modal item (for action button)
  const [summaryModalItem, setSummaryModalItem] = useState(null);

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

  // Filtered components based on search bar
  const filteredComponents = allRanked.filter((c) => {
    if (!assetSearch.trim()) return true;
    const q = assetSearch.toLowerCase().trim();
    return (
      (c.component_id || '').toLowerCase().includes(q) ||
      (c.asset_id || '').toLowerCase().includes(q) ||
      (c.component_type || '').toLowerCase().includes(q)
    );
  });

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

      {/* 2. Trend & Health Specific Metrics (Not Duplicating Overview) */}
      <div className="grid-kpi">
        <div className="kpi-card" style={{ borderLeft: '3px solid #38bdf8' }}>
          <div className="kpi-card-header">
            <span className="kpi-title" style={{ color: '#38bdf8' }}>Telemetry Drift Rate</span>
            <Activity size={16} style={{ color: '#38bdf8' }} />
          </div>
          <div className="kpi-value" style={{ color: '#38bdf8' }}>3.8%</div>
          <div className="kpi-subtitle">Telemetry cycles exhibiting multi-cycle out-of-envelope drift</div>
        </div>

        <div className="kpi-card" style={{ borderLeft: '3px solid #ef4444' }}>
          <div className="kpi-card-header">
            <span className="kpi-title" style={{ color: '#ef4444' }}>Active Signal Divergences</span>
            <AlertOctagon size={16} style={{ color: '#ef4444' }} />
          </div>
          <div className="kpi-value" style={{ color: '#ef4444' }}>{safeCriticalList.length} <span style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>Signals</span></div>
          <div className="kpi-subtitle">Critical channels exceeding Upper Critical Limit (UCL)</div>
        </div>

        <div className="kpi-card" style={{ borderLeft: '3px solid #f97316' }}>
          <div className="kpi-card-header">
            <span className="kpi-title" style={{ color: '#f97316' }}>Rate of Change (RoC) Index</span>
            <TrendingUp size={16} style={{ color: '#f97316' }} />
          </div>
          <div className="kpi-value" style={{ color: '#f97316' }}>+12.4% <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>/ cycle</span></div>
          <div className="kpi-subtitle">Mean degradation acceleration vector across monitored assemblies</div>
        </div>

        <div className="kpi-card" style={{ borderLeft: '3px solid #22c55e' }}>
          <div className="kpi-card-header">
            <span className="kpi-title" style={{ color: '#22c55e' }}>Monitored HUMS Channels</span>
            <Radio size={16} style={{ color: '#22c55e' }} />
          </div>
          <div className="kpi-value" style={{ color: '#22c55e' }}>2,200 <span style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>Sensors</span></div>
          <div className="kpi-subtitle">High-frequency vibration, thermal, and pressure transducers</div>
        </div>
      </div>

      {/* 3. Deep Telemetry Visualizer Card */}
      <div className="sentinel-card" style={{ marginBottom: '20px' }}>
        <div className="card-header-row" style={{ marginBottom: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={18} style={{ color: 'var(--color-primary)' }} />
              <h3 className="card-title">Live Sensor Telemetry Waveform: {selectedCompId}</h3>
            </div>
            <p className="card-subtitle">
              Inspect historical sensor variance with operational limit boundaries from PostgreSQL telemetry tables.
            </p>
          </div>

          {/* Quick Component Search & Dropdown Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--color-bg)', padding: '5px 10px', borderRadius: '6px', border: '1px solid var(--color-border)', width: '220px' }}>
              <Search size={13} style={{ color: 'var(--color-text-muted)' }} />
              <input
                type="text"
                placeholder="Search Asset or Component..."
                value={assetSearch}
                onChange={(e) => setAssetSearch(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: 'var(--color-text)', outline: 'none', width: '100%', fontSize: '12px' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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
                  fontFamily: 'var(--font-family-mono)',
                  maxWidth: '220px'
                }}
              >
                {filteredComponents.map((c) => (
                  <option key={c.component_id} value={c.component_id}>
                    {c.component_id} ({c.asset_id} - {c.component_type})
                  </option>
                ))}
              </select>
            </div>
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

      {/* 4. Streamlined 4-Signal Component Trend Risk Ranking Table */}
      <div className="sentinel-card">
        <div className="card-header-row" style={{ marginBottom: '14px' }}>
          <div>
            <h3 className="card-title">4-Signal Component Trend Risk Ranking</h3>
            <p className="card-subtitle">
              Continuous trend risk score evaluated from rate of change, degradation trajectory, and persistence.
            </p>
          </div>
        </div>

        {loading ? (
          <LoadingState
            message="Evaluating Trend Dynamics..."
            subtext="Loading verified component risk scores"
            minHeight="240px"
          />
        ) : filteredComponents.length === 0 ? (
          <EmptyState
            title="All Component Trends Nominal"
            description="No active components match your search or exhibit elevated degradation trends."
            icon={ShieldCheck}
          />
        ) : (
          <div className="table-wrapper" style={{ overflowX: 'visible' }}>
            <table className="sentinel-table" style={{ tableLayout: 'fixed', width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: '18%' }}>Component ID</th>
                  <th style={{ width: '16%' }}>Subsystem</th>
                  <th style={{ width: '14%' }}>Parent Asset</th>
                  <th style={{ width: '14%' }}>Trend Score</th>
                  <th style={{ width: '14%' }}>Priority Level</th>
                  <th style={{ width: '12%' }}>Readiness</th>
                  <th style={{ width: '12%', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredComponents.slice(0, 12).map((c) => {
                  const isCrit = c.priority_level === 'CRITICAL';
                  const isReady = c.failure_probability < 35 && c.priority_level !== 'CRITICAL' && c.priority_level !== 'HIGH';

                  return (
                    <tr
                      key={c.component_id}
                      onClick={() => setSelectedCompId(c.component_id)}
                      style={{ cursor: 'pointer', backgroundColor: selectedCompId === c.component_id ? 'var(--color-surface-hover)' : 'transparent' }}
                    >
                      <td>
                        <strong style={{ fontFamily: 'var(--font-family-mono)', color: 'var(--color-text)', fontSize: '13px' }}>
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
                        <span style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 700, color: c.trend_risk >= 70 ? 'var(--color-danger)' : 'var(--color-text)' }}>
                          {c.trend_risk !== undefined ? `${c.trend_risk} / 100` : '--'}
                        </span>
                      </td>
                      <td>
                        <RiskBadge risk={c.priority_level} size="sm" />
                      </td>
                      <td>
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
                          {isReady ? 'READY' : 'NOT READY'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="secondary-btn"
                          style={{ height: '28px', padding: '0 10px', fontSize: '11px', whiteSpace: 'nowrap' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSummaryModalItem(c);
                          }}
                          title="View Diagnostic Details"
                        >
                          <Eye size={12} />
                          <span>Summary</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Action Button Diagnostic Summary Modal (Clean numerical summary, no trend visual as requested) */}
      {summaryModalItem && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999999,
            padding: '20px'
          }}
          onClick={() => setSummaryModalItem(null)}
        >
          <div
            className="sentinel-card"
            style={{
              maxWidth: '520px',
              width: '100%',
              backgroundColor: '#0d0d0d',
              border: '1px solid var(--color-border-bright)',
              borderRadius: '10px',
              padding: '24px',
              boxShadow: '0 12px 36px rgba(0,0,0,0.9)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Cpu size={20} style={{ color: 'var(--color-primary)' }} />
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--color-text)' }}>
                    Diagnostic Summary: {summaryModalItem.component_id}
                  </h3>
                  <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                    Parent Asset: <strong>{summaryModalItem.asset_id}</strong> &bull; Assembly: <strong>{summaryModalItem.component_type}</strong>
                  </span>
                </div>
              </div>

              <button
                className="secondary-btn"
                style={{ width: '28px', height: '28px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onClick={() => setSummaryModalItem(null)}
              >
                <X size={14} />
              </button>
            </div>

            {/* Numerical Diagnostic Summary Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '20px' }}>
              <div style={{ padding: '12px', backgroundColor: 'var(--color-bg-subtle)', borderRadius: '6px' }}>
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Trend Risk Score</span>
                <div style={{ fontSize: '20px', fontFamily: 'var(--font-family-mono)', fontWeight: 800, color: summaryModalItem.trend_risk >= 70 ? 'var(--color-danger)' : 'var(--color-text)', marginTop: '2px' }}>
                  {summaryModalItem.trend_risk !== undefined ? `${summaryModalItem.trend_risk} / 100` : '--'}
                </div>
              </div>

              <div style={{ padding: '12px', backgroundColor: 'var(--color-bg-subtle)', borderRadius: '6px' }}>
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Health Score</span>
                <div style={{ fontSize: '20px', fontFamily: 'var(--font-family-mono)', fontWeight: 800, color: summaryModalItem.health_score < 50 ? 'var(--color-danger)' : 'var(--color-success)', marginTop: '2px' }}>
                  {summaryModalItem.health_score} / 100
                </div>
              </div>

              <div style={{ padding: '12px', backgroundColor: 'var(--color-bg-subtle)', borderRadius: '6px' }}>
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Priority Level</span>
                <div style={{ marginTop: '4px' }}>
                  <RiskBadge risk={summaryModalItem.priority_level} size="md" />
                </div>
              </div>

              <div style={{ padding: '12px', backgroundColor: 'var(--color-bg-subtle)', borderRadius: '6px' }}>
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Failure Risk</span>
                <div style={{ fontSize: '20px', fontFamily: 'var(--font-family-mono)', fontWeight: 800, color: summaryModalItem.failure_probability >= 70 ? 'var(--color-danger)' : '#f97316', marginTop: '2px' }}>
                  {summaryModalItem.failure_probability}%
                </div>
              </div>
            </div>

            {/* Component Readiness Status Banner */}
            <div
              style={{
                padding: '14px 16px',
                borderRadius: '6px',
                backgroundColor: summaryModalItem.failure_probability < 35 && summaryModalItem.priority_level !== 'CRITICAL'
                  ? 'rgba(34, 197, 94, 0.1)'
                  : 'rgba(239, 68, 68, 0.1)',
                border: `1px solid ${summaryModalItem.failure_probability < 35 && summaryModalItem.priority_level !== 'CRITICAL' ? 'var(--color-success-border)' : 'var(--color-danger-border)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '20px'
              }}
            >
              <div>
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Operational Readiness</span>
                <div style={{ fontSize: '14px', fontWeight: 700, color: summaryModalItem.failure_probability < 35 && summaryModalItem.priority_level !== 'CRITICAL' ? 'var(--color-success)' : 'var(--color-danger)', marginTop: '2px' }}>
                  {summaryModalItem.failure_probability < 35 && summaryModalItem.priority_level !== 'CRITICAL' ? 'COMPONENT READY FOR SERVICE' : 'NOT READY — IMMEDIATE FIX REQUIRED'}
                </div>
              </div>
              {summaryModalItem.failure_probability < 35 && summaryModalItem.priority_level !== 'CRITICAL' ? (
                <CheckCircle2 size={24} style={{ color: 'var(--color-success)' }} />
              ) : (
                <AlertOctagon size={24} style={{ color: 'var(--color-danger)' }} />
              )}
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="secondary-btn" onClick={() => setSummaryModalItem(null)}>
                Close
              </button>
              <button
                className="primary-btn"
                onClick={() => {
                  const cid = summaryModalItem.component_id;
                  setSummaryModalItem(null);
                  onAnalyzeComponent && onAnalyzeComponent(cid);
                }}
              >
                <span>Deep Component Analysis</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

