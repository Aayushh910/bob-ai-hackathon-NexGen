import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  AlertOctagon,
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  Zap,
  Eye,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';
import { getFleetRiskRanking } from '../../api/command';
import { runPrediction } from '../../api/ml';
import { PageHeader, KpiCard, RiskBadge, StatusBadge, LoadingSkeleton, EmptyState, LoadingSpinner, LoadingState } from '../common/UIComponents';
import AssetDetailModal from '../fleet/AssetDetailModal';

export default function PredictionsView() {
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState('');

  // Actions state
  const [runningAssetId, setRunningAssetId] = useState(null);
  const [selectedAssetModal, setSelectedAssetModal] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getFleetRiskRanking();
      setRanking(data || []);
    } catch (err) {
      console.error('Failed to load predictions ranking:', err);
      setError(err.message || 'Unable to retrieve prognostic risk ranking.');
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

  const handleTriggerInference = async (assetId) => {
    setRunningAssetId(assetId);
    try {
      await runPrediction(assetId);
      window.dispatchEvent(new CustomEvent('sentinel:data-updated'));
      await loadData();
    } catch (err) {
      console.error('Failed to trigger inference:', err);
    } finally {
      setRunningAssetId(null);
    }
  };

  // Filtered Assets
  const filtered = ranking.filter((item) => {
    const matchesSearch =
      !searchTerm ||
      (item.asset_code && item.asset_code.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.model && item.model.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.location && item.location.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesRisk =
      !riskFilter ||
      (item.risk_level && item.risk_level.toUpperCase() === riskFilter.toUpperCase());

    return matchesSearch && matchesRisk;
  });

  // Calculate Risk Distribution Counts
  const criticalCount = ranking.filter((r) => r.risk_level === 'CRITICAL').length;
  const highCount = ranking.filter((r) => r.risk_level === 'HIGH').length;
  const moderateCount = ranking.filter((r) => r.risk_level === 'MEDIUM' || r.risk_level === 'MODERATE').length;
  const lowCount = ranking.filter((r) => r.risk_level === 'LOW').length;

  return (
    <div className="predictions-view-container">
      {/* 1. Page Header */}
      <PageHeader
        badgeText="Predictive Failure Intelligence"
        badgeIcon={TrendingUp}
        title="Prognostics & Failure Horizon Analysis"
        subtitle="Machine-learning Remaining Useful Life (RUL) horizon forecasting, failure probabilities, and risk ranking across fleet assets."
        actions={
          <button
            className="secondary-btn"
            onClick={loadData}
            disabled={loading}
            title="Refresh Prognostics Data"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        }
      />

      {/* 2. Risk KPI Grid */}
      <div className="grid-kpi">
        <KpiCard
          title="Critical Risk Assets"
          value={criticalCount}
          subtitle="Imminent failure horizon (< 24 hrs)"
          icon={AlertOctagon}
          variant="critical"
          trend={{ direction: 'flat', value: 'Immediate depot hold' }}
          loading={loading}
        />
        <KpiCard
          title="Elevated / High Risk"
          value={highCount}
          subtitle="Failure probability > 65%"
          icon={AlertTriangle}
          variant="caution"
          trend={{ direction: 'down', value: 'Requires inspection' }}
          loading={loading}
        />
        <KpiCard
          title="Moderate Degradation"
          value={moderateCount}
          subtitle="Monitored subsystem variance"
          icon={TrendingUp}
          variant="default"
          trend={{ direction: 'flat', value: 'Scheduled inspection' }}
          loading={loading}
        />
        <KpiCard
          title="Nominal / Cleared"
          value={lowCount}
          subtitle="Standard operational margins"
          icon={ShieldCheck}
          variant="ready"
          trend={{ direction: 'up', value: 'Mission cleared' }}
          loading={loading}
        />
      </div>

      {/* 3. Filters Bar */}
      <div className="filter-bar">
        <form className="search-form" onSubmit={(e) => e.preventDefault()}>
          <Search size={15} style={{ color: 'var(--color-text-muted)' }} />
          <input
            type="text"
            className="search-input"
            placeholder="Search by asset code, model, or base location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              type="button"
              style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}
              onClick={() => setSearchTerm('')}
            >
              Clear
            </button>
          )}
        </form>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <select
            className="filter-select"
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
          >
            <option value="">All Risk Levels</option>
            <option value="CRITICAL">Critical Risk Only</option>
            <option value="HIGH">High Risk Only</option>
            <option value="MEDIUM">Medium / Moderate</option>
            <option value="LOW">Low / Nominal</option>
          </select>

          {(searchTerm || riskFilter) && (
            <button
              className="secondary-btn"
              onClick={() => {
                setSearchTerm('');
                setRiskFilter('');
              }}
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* 4. Prediction Risk Ranking Table (Bounded Container) */}
      {loading ? (
        <div style={{ padding: '60px 0', display: 'flex', justifyContent: 'center' }}>
          <LoadingState
            message="Calculating Prognostic Failure Horizons..."
            subtext="Evaluating Remaining Useful Life (RUL) and multi-factor failure probability rankings"
            size="lg"
          />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No Matching Risk Profiles"
          description="No fleet assets match the active search or risk filter criteria."
          icon={ShieldCheck}
          actionText="Reset Filters"
          onAction={() => {
            setSearchTerm('');
            setRiskFilter('');
          }}
        />
      ) : (
        <div className="table-wrapper">
          <table className="sentinel-table">
            <thead>
              <tr>
                <th>Asset Code</th>
                <th>Model / Type</th>
                <th>Depot Location</th>
                <th>Risk Classification</th>
                <th>Failure Probability</th>
                <th>Remaining Useful Life</th>
                <th>Leading Contributing Factors</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const failPct = (item.failure_probability * 100).toFixed(1);
                const rulVal = item.rul_hours ? `${item.rul_hours.toFixed(1)} hrs` : 'N/A';
                const isRunning = runningAssetId === item.asset_id;

                return (
                  <tr key={item.asset_id}>
                    <td>
                      <strong style={{ fontFamily: 'var(--font-family-mono)', color: 'var(--color-text)' }}>
                        {item.asset_code}
                      </strong>
                    </td>
                    <td>
                      <span style={{ fontWeight: 500 }}>{item.model || 'Heavy Equipment'}</span>
                    </td>
                    <td>
                      <span style={{ color: 'var(--color-text-muted)' }}>{item.location || 'Depot Alpha'}</span>
                    </td>
                    <td>
                      <RiskBadge risk={item.risk_level || 'LOW'} size="sm" />
                    </td>
                    <td>
                      <span
                        style={{
                          fontFamily: 'var(--font-family-mono)',
                          fontWeight: 700,
                          color: item.failure_probability > 0.6 ? 'var(--color-danger)' : 'var(--color-text)',
                        }}
                      >
                        {failPct}%
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          fontFamily: 'var(--font-family-mono)',
                          fontWeight: 600,
                          color: item.rul_hours < 24 ? 'var(--color-danger)' : 'var(--color-text)',
                        }}
                      >
                        {rulVal}
                      </span>
                    </td>
                    <td style={{ maxWidth: '240px' }}>
                      <span
                        style={{
                          fontSize: '12px',
                          color: 'var(--color-text-secondary)',
                          display: 'inline-block',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: '240px',
                        }}
                        title={item.top_factors || 'Sensor baseline nominal'}
                      >
                        {item.top_factors || 'Sensor baseline nominal'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          className="secondary-btn"
                          style={{ height: '30px', padding: '0 10px', fontSize: '12px' }}
                          onClick={() => handleTriggerInference(item.asset_id)}
                          disabled={isRunning}
                          title="Run fresh ML inference on latest sensor bus"
                        >
                          {isRunning ? <LoadingSpinner size="xs" /> : <Zap size={12} />}
                          <span>{isRunning ? 'Inferring...' : 'Re-evaluate'}</span>
                        </button>

                        <button
                          className="secondary-btn"
                          style={{ height: '30px', padding: '0 10px', fontSize: '12px' }}
                          onClick={() =>
                            setSelectedAssetModal({
                              id: item.asset_id,
                              asset_code: item.asset_code,
                              model: item.model,
                              location: item.location,
                            })
                          }
                          title="Open Asset Diagnostic Inspector"
                        >
                          <Eye size={12} />
                          <span>Inspect</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Deep Inspection Modal */}
      {selectedAssetModal && (
        <AssetDetailModal
          asset={selectedAssetModal}
          onClose={() => {
            setSelectedAssetModal(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}
