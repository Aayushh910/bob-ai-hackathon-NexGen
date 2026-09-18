import React, { useState, useEffect, useCallback } from 'react';
import {
  Radio,
  Activity,
  TrendingUp,
  Cpu,
  Layers,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  AlertOctagon,
  AlertTriangle,
  X,
  Eye,
  CheckCircle2,
  Sliders,
  SlidersHorizontal
} from 'lucide-react';
import { getCriticalComponents, getHighPriorityComponents, getDashboardSummary } from '../../api/dashboard';
import { getComponentHistory } from '../../api/components';
import { PageHeader, KpiCard, StatusBadge, RiskBadge, LoadingState, EmptyState, ThemeDropdown } from '../common/UIComponents';
import TelemetryChart, { METRIC_CONFIGS, OPERATIONAL_THRESHOLDS } from '../fleet/TelemetryChart';

export default function TrendsHealthView({ onAnalyzeComponent, onInspectAsset }) {
  const [summary, setSummary] = useState(null);
  const [criticalList, setCriticalList] = useState([]);
  const [highPriorityList, setHighPriorityList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Selected component for deep telemetry curve inspection
  const [selectedCompId, setSelectedCompId] = useState('A035-HYD');
  const [activeMetric, setActiveMetric] = useState('temperature');
  const [compHistory, setCompHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Asset/component search input
  const [assetSearch, setAssetSearch] = useState('');

  // Pagination for ranking table
  const [rankingPage, setRankingPage] = useState(1);
  const rankingPageSize = 10;

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

  useEffect(() => {
    setRankingPage(1);
  }, [assetSearch]);

  // Ranking table pagination
  const totalRankingPages = Math.ceil(filteredComponents.length / rankingPageSize) || 1;
  const paginatedRanking = filteredComponents.slice((rankingPage - 1) * rankingPageSize, rankingPage * rankingPageSize);

  // Active metric diagnostic statistics for side-by-side panel
  const validMetricReadings = compHistory.filter(
    (r) => r[activeMetric] !== null && r[activeMetric] !== undefined && !isNaN(Number(r[activeMetric]))
  );
  const metricValues = validMetricReadings.map((r) => Number(r[activeMetric]));
  const metricMin = metricValues.length > 0 ? Math.min(...metricValues).toFixed(2) : '--';
  const metricMax = metricValues.length > 0 ? Math.max(...metricValues).toFixed(2) : '--';
  const metricAvg = metricValues.length > 0 ? (metricValues.reduce((a, b) => a + b, 0) / metricValues.length).toFixed(2) : '--';
  const activeCfg = METRIC_CONFIGS[activeMetric] || METRIC_CONFIGS.temperature;
  const activeThreshold = OPERATIONAL_THRESHOLDS[activeMetric];
  const metricBreaches = activeThreshold?.ucl
    ? metricValues.filter((v) => v > activeThreshold.ucl).length
    : 0;

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

      {/* 2. Trend & Health Specific Metrics */}
      <div className="grid-kpi">
        <div className="kpi-card variant-info">
          <div className="kpi-card-header">
            <span className="kpi-title">Telemetry Drift Rate</span>
            <Activity size={16} className="kpi-icon" />
          </div>
          <div className="kpi-value">3.8%</div>
          <div className="kpi-subtitle">Telemetry cycles exhibiting multi-cycle out-of-envelope drift</div>
        </div>

        <div className="kpi-card variant-critical">
          <div className="kpi-card-header">
            <span className="kpi-title">Active Signal Divergences</span>
            <AlertOctagon size={16} className="kpi-icon" />
          </div>
          <div className="kpi-value">{safeCriticalList.length} <span className="kpi-unit">Signals</span></div>
          <div className="kpi-subtitle">Critical channels exceeding Upper Critical Limit (UCL)</div>
        </div>

        <div className="kpi-card variant-caution">
          <div className="kpi-card-header">
            <span className="kpi-title">Rate of Change (RoC) Index</span>
            <TrendingUp size={16} className="kpi-icon" />
          </div>
          <div className="kpi-value">+12.4% <span className="kpi-unit">/ cycle</span></div>
          <div className="kpi-subtitle">Mean degradation acceleration vector across monitored assemblies</div>
        </div>

        <div className="kpi-card variant-ready">
          <div className="kpi-card-header">
            <span className="kpi-title">Monitored HUMS Channels</span>
            <Radio size={16} className="kpi-icon" />
          </div>
          <div className="kpi-value">2,200 <span className="kpi-unit">Sensors</span></div>
          <div className="kpi-subtitle">High-frequency vibration, thermal, and pressure transducers</div>
        </div>
      </div>

      {/* 3. Deep Telemetry Visualizer Card (Side-by-Side Filter & Visual) */}
      <div className="sentinel-card" style={{ marginBottom: '24px' }}>
        <div className="card-header-row" style={{ marginBottom: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={18} style={{ color: 'var(--color-primary)' }} />
              <h3 className="card-title">Live Sensor Telemetry Waveform: {selectedCompId}</h3>
            </div>
            <p className="card-subtitle">
              Inspect historical sensor variance with operational limit boundaries from PostgreSQL telemetry tables.
            </p>
          </div>

          {/* Quick Component Search input */}
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
        </div>

        {/* Side-by-Side Grid: Filters & Telemetry Panel (Left) + Waveform Visualization (Right) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 320px) 1fr', gap: '20px', alignItems: 'start' }}>
          {/* Left Column: Dropdown Controls & Operational Boundary Readouts */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: 'var(--color-bg-subtle)', padding: '16px', borderRadius: '8px', border: '1px solid var(--color-border-subtle)' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                Monitored Assembly
              </label>
              <ThemeDropdown
                value={selectedCompId}
                onChange={(val) => setSelectedCompId(val)}
                placeholder="Select Assembly..."
                minWidth="100%"
                options={filteredComponents.map((c) => ({
                  value: c.component_id,
                  label: `${c.component_id} • ${c.component_type} (${c.asset_id})`
                }))}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                Telemetry Channel Metric
              </label>
              <ThemeDropdown
                value={activeMetric}
                onChange={(val) => setActiveMetric(val)}
                placeholder="Select Channel..."
                minWidth="100%"
                options={Object.entries(METRIC_CONFIGS).map(([k, cfg]) => ({
                  value: k,
                  label: `${cfg.label} (${cfg.unit})`
                }))}
              />
            </div>

            {/* Threshold Breach Status Strip */}
            <div
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                backgroundColor: metricBreaches > 0 ? 'var(--color-danger-dim)' : 'var(--color-success-dim)',
                border: `1px solid ${metricBreaches > 0 ? 'var(--color-danger-border)' : 'var(--color-success-border)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: '4px'
              }}
            >
              <span style={{ fontSize: '11px', fontWeight: 700, color: metricBreaches > 0 ? 'var(--color-danger)' : 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                {metricBreaches > 0 ? <AlertTriangle size={13} /> : <ShieldCheck size={13} />}
                {metricBreaches > 0 ? `${metricBreaches} THRESHOLD BREACHES` : 'WITHIN NOMINAL BAND'}
              </span>
              <span style={{ fontSize: '11px', fontFamily: 'var(--font-family-mono)', color: 'var(--color-text-secondary)' }}>
                {validMetricReadings.length} Samples
              </span>
            </div>

            {/* Operational Boundaries & Stat Readouts */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginTop: '4px' }}>
              <div style={{ padding: '8px 10px', backgroundColor: 'var(--color-surface)', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
                <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Observed Avg</span>
                <div style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-family-mono)', color: 'var(--color-text)', marginTop: '2px' }}>
                  {metricAvg} {activeCfg.unit}
                </div>
              </div>

              <div style={{ padding: '8px 10px', backgroundColor: 'var(--color-surface)', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
                <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Observed Max</span>
                <div style={{ fontSize: '13px', fontWeight: 800, fontFamily: 'var(--font-family-mono)', color: metricBreaches > 0 ? 'var(--color-danger)' : 'var(--color-text)', marginTop: '2px' }}>
                  {metricMax} {activeCfg.unit}
                </div>
              </div>

              {activeThreshold?.ucl && (
                <div style={{ padding: '8px 10px', backgroundColor: 'var(--color-surface)', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
                  <span style={{ fontSize: '10px', color: 'var(--color-danger)', textTransform: 'uppercase' }}>UCL Limit</span>
                  <div style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-family-mono)', color: 'var(--color-danger)', marginTop: '2px' }}>
                    {activeThreshold.ucl} {activeCfg.unit}
                  </div>
                </div>
              )}

              {activeThreshold?.nominal && (
                <div style={{ padding: '8px 10px', backgroundColor: 'var(--color-surface)', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
                  <span style={{ fontSize: '10px', color: 'var(--color-success)', textTransform: 'uppercase' }}>Nominal</span>
                  <div style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-family-mono)', color: 'var(--color-success)', marginTop: '2px' }}>
                    {activeThreshold.nominal} {activeCfg.unit}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Proportional Telemetry Waveform */}
          <div style={{ minWidth: 0, width: '100%' }}>
            {loadingHistory ? (
              <LoadingState
                message={`Loading historical sensor readings for ${selectedCompId}...`}
                subtext="Querying Neon sensor_readings table"
                size="sm"
                minHeight="220px"
              />
            ) : compHistory.length > 0 ? (
              <TelemetryChart
                readings={compHistory}
                activeMetric={activeMetric}
                onMetricChange={setActiveMetric}
              />
            ) : (
              <EmptyState
                title="No Sensor Readings"
                description={`No sensor records found in history for ${selectedCompId}.`}
                icon={Radio}
              />
            )}
          </div>
        </div>
      </div>

      {/* 4. Streamlined 4-Signal Component Trend Risk Ranking Table with Pagination Limit */}
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
          <>
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
                  {paginatedRanking.map((c) => {
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

            {/* Pagination Controls */}
            {totalRankingPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', padding: '8px 4px' }}>
                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                  Showing {(rankingPage - 1) * rankingPageSize + 1} - {Math.min(rankingPage * rankingPageSize, filteredComponents.length)} of {filteredComponents.length} components
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="secondary-btn"
                    onClick={() => setRankingPage((p) => Math.max(p - 1, 1))}
                    disabled={rankingPage === 1}
                    style={{ height: '30px', padding: '0 10px', fontSize: '12px' }}
                  >
                    <ChevronLeft size={14} />
                    <span>Prev</span>
                  </button>
                  <span style={{ display: 'flex', alignItems: 'center', padding: '0 8px', fontSize: '12px', fontFamily: 'var(--font-family-mono)', color: 'var(--color-text)' }}>
                    Page {rankingPage} of {totalRankingPages}
                  </span>
                  <button
                    className="secondary-btn"
                    onClick={() => setRankingPage((p) => Math.min(p + 1, totalRankingPages))}
                    disabled={rankingPage === totalRankingPages}
                    style={{ height: '30px', padding: '0 10px', fontSize: '12px' }}
                  >
                    <span>Next</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
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
                <div style={{ fontSize: '20px', fontFamily: 'var(--font-family-mono)', fontWeight: 800, color: summaryModalItem.failure_probability >= 70 ? 'var(--color-danger)' : 'var(--color-warning)', marginTop: '2px' }}>
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

