import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  AlertOctagon,
  Activity,
  CheckCircle2,
  Clock,
  Search,
  RefreshCw,
  SlidersHorizontal,
  ChevronRight,
  ExternalLink,
  ChevronLeft
} from 'lucide-react';
import { getFleetReadiness, getAttentionQueue } from '../../api/readiness';
import AssetDetailModal from '../fleet/AssetDetailModal';
import { PageHeader, KpiCard, StatusBadge, RiskBadge, LoadingSkeleton, EmptyState, LoadingSpinner, LoadingState } from '../common/UIComponents';

export default function MissionReadinessDashboard() {
  const [readinessData, setReadinessData] = useState(null);
  const [attentionQueue, setAttentionQueue] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedRisk, setSelectedRisk] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 15;

  // Modal inspection
  const [selectedAssetForModal, setSelectedAssetForModal] = useState(null);

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [fleetRes, queueRes] = await Promise.all([
        getFleetReadiness({
          state: selectedState,
          risk_level: selectedRisk,
          search: debouncedSearch,
          skip: page * pageSize,
          limit: pageSize
        }),
        getAttentionQueue(6)
      ]);
      setReadinessData(fleetRes);
      setAttentionQueue(queueRes || []);
    } catch (err) {
      console.error('Failed to load mission readiness data:', err);
      setError(err.message || 'Unable to retrieve mission readiness telemetry.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedState, selectedRisk, debouncedSearch, page]);

  useEffect(() => {
    loadData();

    const handleUpdate = () => {
      loadData();
    };
    window.addEventListener('sentinel:data-updated', handleUpdate);
    return () => window.removeEventListener('sentinel:data-updated', handleUpdate);
  }, [loadData]);

  const summary = readinessData?.summary;
  const items = readinessData?.items || [];
  const totalItems = readinessData?.total || 0;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  return (
    <div className="readiness-view-container">
      {/* 1. Header */}
      <PageHeader
        badgeText="Mission Clearance Engine"
        badgeIcon={ShieldCheck}
        title="Mission Readiness Command & Clearance"
        subtitle="Deterministic mission deployment clearance derived from validated multi-model telemetry (Failure Probability, HUMS Anomalies, RUL, and Subsystem Health)."
        actions={
          <button
            className="secondary-btn"
            onClick={loadData}
            disabled={isLoading}
            title="Refresh readiness clearance"
          >
            <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh Clearance</span>
          </button>
        }
      />

      {/* 2. KPI Cards (4 columns) */}
      <div className="grid-kpi">
        <KpiCard
          title="Total Fleet Monitored"
          value={summary?.total_assets ?? '--'}
          subtitle="Registered operational equipment"
          icon={Activity}
          variant="default"
          loading={isLoading}
        />
        <KpiCard
          title="Mission Ready Units"
          value={summary?.ready_count ?? '--'}
          subtitle="Cleared for sortie deployment"
          icon={CheckCircle2}
          variant="ready"
          trend={{ value: 'Nominal', direction: 'up' }}
          loading={isLoading}
        />
        <KpiCard
          title="Caution Advisory"
          value={summary?.caution_count ?? '--'}
          subtitle="Subsystem variance detected"
          icon={AlertTriangle}
          variant="caution"
          loading={isLoading}
        />
        <KpiCard
          title="Degraded / Grounded"
          value={(summary?.degraded_count || 0) + (summary?.not_ready_count || 0)}
          subtitle="Grounded or restricted"
          icon={AlertOctagon}
          variant="critical"
          loading={isLoading}
        />
      </div>

      {/* 3. Priority Attention Queue */}
      {attentionQueue.length > 0 && (
        <div className="sentinel-card" style={{ marginBottom: '24px' }}>
          <div className="card-header-row">
            <div>
              <h2 className="card-title">Priority Operational Attention Queue</h2>
              <p className="card-subtitle">Ranked by risk severity and required operational intervention</p>
            </div>
          </div>

          <div className="grid-3-col">
            {attentionQueue.map((item) => (
              <div key={item.asset_id} className="sentinel-card" style={{ backgroundColor: 'var(--color-bg-subtle)' }}>
                <div className="card-header-row">
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>#{item.urgency_rank} PRIORITY</span>
                    <h3 style={{ fontSize: '15px', fontWeight: 700, fontFamily: 'var(--font-family-mono)' }}>{item.asset_code}</h3>
                  </div>
                  <StatusBadge status={item.readiness_state} size="sm" />
                </div>

                <div style={{ fontSize: '12px', margin: '8px 0', color: 'var(--color-text-secondary)' }}>
                  <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>Trigger:</div>
                  <div>{item.primary_trigger}</div>
                </div>

                <div style={{ fontSize: '12px', margin: '8px 0', color: 'var(--color-text-secondary)' }}>
                  <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>Directive:</div>
                  <div>{item.recommended_action}</div>
                </div>

                <button
                  className="secondary-btn"
                  style={{ width: '100%', height: '32px', marginTop: 'auto' }}
                  onClick={() => setSelectedAssetForModal({ id: item.asset_id, asset_code: item.asset_code })}
                >
                  <span>Inspect Asset Diagnostics</span>
                  <ChevronRight size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Filter & Search Bar */}
      <div className="filter-bar">
        <form className="search-form" onSubmit={(e) => e.preventDefault()}>
          <Search size={15} style={{ color: 'var(--color-text-muted)' }} />
          <input
            type="text"
            className="search-input"
            placeholder="Search assets by code, model, location..."
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
            value={selectedState}
            onChange={(e) => {
              setSelectedState(e.target.value);
              setPage(0);
            }}
          >
            <option value="">All Mission States</option>
            <option value="READY">Ready</option>
            <option value="CAUTION">Caution</option>
            <option value="DEGRADED">Degraded</option>
            <option value="NOT_READY">Not Ready</option>
          </select>

          <select
            className="filter-select"
            value={selectedRisk}
            onChange={(e) => {
              setSelectedRisk(e.target.value);
              setPage(0);
            }}
          >
            <option value="">All Risk Levels</option>
            <option value="LOW">Low Risk</option>
            <option value="MEDIUM">Medium Risk</option>
            <option value="HIGH">High Risk</option>
            <option value="CRITICAL">Critical Risk</option>
          </select>

          {(selectedState || selectedRisk || searchTerm) && (
            <button
              className="secondary-btn"
              onClick={() => {
                setSelectedState('');
                setSelectedRisk('');
                setSearchTerm('');
                setPage(0);
              }}
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* 5. Readiness Clearance Table */}
      {isLoading ? (
        <LoadingState
          message="Evaluating Fleet Mission Readiness..."
          subtext="Aggregating ML prognostic risk models, sensor anomaly signals, and operational clearance certificates."
          size="lg"
          minHeight="260px"
        />
      ) : items.length === 0 ? (
        <EmptyState
          title="No Matching Assets"
          description="No fleet assets match the specified clearance state or risk filter."
        />
      ) : (
        <div className="table-wrapper">
          <table className="sentinel-table">
            <thead>
              <tr>
                <th>Asset Code</th>
                <th>Model / Type</th>
                <th>Mission State</th>
                <th>Score</th>
                <th>Risk Level</th>
                <th>Failure Prob</th>
                <th>Predicted RUL</th>
                <th>Subsystem Health</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.asset_id}>
                  <td>
                    <strong style={{ fontFamily: 'var(--font-family-mono)' }}>{row.asset_code}</strong>
                  </td>
                  <td>
                    <span>{row.model || row.asset_type || 'Sentinel Equipment'}</span>
                  </td>
                  <td>
                    <StatusBadge status={row.readiness_state} size="sm" />
                  </td>
                  <td>
                    <span style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 700 }}>
                      {Math.round(row.readiness_score)} / 100
                    </span>
                  </td>
                  <td>
                    <RiskBadge risk={row.risk_level || 'LOW'} size="sm" />
                  </td>
                  <td>
                    <span style={{ fontFamily: 'var(--font-family-mono)' }}>
                      {row.failure_probability !== null ? `${(row.failure_probability * 100).toFixed(1)}%` : '--'}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontFamily: 'var(--font-family-mono)' }}>
                      {row.rul_hours !== null ? `${row.rul_hours.toFixed(1)} hrs` : '--'}
                    </span>
                  </td>
                  <td>
                    <StatusBadge status={row.is_anomaly ? 'DEGRADED' : 'READY'} size="sm" />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="secondary-btn"
                      style={{ height: '28px', padding: '0 10px', fontSize: '11px' }}
                      onClick={() => setSelectedAssetForModal({ id: row.asset_id, asset_code: row.asset_code })}
                    >
                      <ExternalLink size={12} />
                      <span>Assess</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px' }}>
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
            Showing page {page + 1} of {totalPages} ({totalItems} total assets)
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="secondary-btn"
              style={{ height: '30px', padding: '0 10px', fontSize: '12px' }}
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft size={14} />
              <span>Previous</span>
            </button>
            <button
              className="secondary-btn"
              style={{ height: '30px', padding: '0 10px', fontSize: '12px' }}
              disabled={page >= totalPages - 1}
              onClick={() => setPage(page + 1)}
            >
              <span>Next</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Asset Detail & Mission Readiness Modal */}
      {selectedAssetForModal && (
        <AssetDetailModal
          asset={selectedAssetForModal}
          onClose={() => {
            setSelectedAssetForModal(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}
