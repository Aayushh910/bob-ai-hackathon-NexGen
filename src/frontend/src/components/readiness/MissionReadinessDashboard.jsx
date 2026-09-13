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
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorMessage from '../common/ErrorMessage';

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
  }, [loadData]);

  const summary = readinessData?.summary;
  const items = readinessData?.items || [];
  const totalItems = readinessData?.total || 0;
  const totalPages = Math.ceil(totalItems / pageSize);

  const getStateBadgeClass = (state) => {
    switch (state) {
      case 'READY': return 'readiness-pill-ready';
      case 'CAUTION': return 'readiness-pill-caution';
      case 'DEGRADED': return 'readiness-pill-degraded';
      case 'NOT_READY': return 'readiness-pill-not-ready';
      default: return 'readiness-pill-neutral';
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#10B981';
    if (score >= 60) return '#F59E0B';
    if (score >= 40) return '#F97316';
    return '#F43F5E';
  };

  return (
    <div className="content-container">
      {/* Header Banner */}
      <div className="readiness-header-row">
        <div>
          <div className="hero-badge">
            <ShieldCheck size={14} />
            <span>Phase 4 — Operational Decision & Mission Readiness Layer</span>
          </div>
          <h1 className="hero-title">Mission Readiness Command</h1>
          <p className="hero-description">
            Deterministic mission deployment clearance derived from validated multi-model telemetry (Failure Probability, HUMS Anomalies, RUL, and Failure Modes).
          </p>
        </div>
        <button
          className="refresh-btn"
          onClick={loadData}
          disabled={isLoading}
          title="Refresh readiness data"
        >
          <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
          <span>Refresh Clearance</span>
        </button>
      </div>

      {error && <ErrorMessage message={error} onRetry={loadData} />}

      {/* KPI Summary Cards */}
      <div className="readiness-kpi-grid">
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Total Fleet Assets</span>
            <Activity size={18} className="kpi-icon text-blue" />
          </div>
          <div className="kpi-value">{summary?.total_assets ?? '--'}</div>
          <div className="kpi-sub">Registered operational units</div>
        </div>

        <div className="kpi-card card-glow-emerald">
          <div className="kpi-header">
            <span className="kpi-title">Mission Ready</span>
            <CheckCircle2 size={18} className="kpi-icon text-emerald" />
          </div>
          <div className="kpi-value text-emerald">{summary?.ready_count ?? '--'}</div>
          <div className="kpi-sub">Cleared for operational deployment</div>
        </div>

        <div className="kpi-card card-glow-amber">
          <div className="kpi-header">
            <span className="kpi-title">Caution Advisory</span>
            <AlertTriangle size={18} className="kpi-icon text-amber" />
          </div>
          <div className="kpi-value text-amber">{summary?.caution_count ?? '--'}</div>
          <div className="kpi-sub">Minor wear / isolated variance</div>
        </div>

        <div className="kpi-card card-glow-orange">
          <div className="kpi-header">
            <span className="kpi-title">Degraded Envelope</span>
            <AlertOctagon size={18} className="kpi-icon text-orange" />
          </div>
          <div className="kpi-value text-orange">{summary?.degraded_count ?? '--'}</div>
          <div className="kpi-sub">Operating with flight/power constraints</div>
        </div>

        <div className="kpi-card card-glow-rose">
          <div className="kpi-header">
            <span className="kpi-title">Not Ready / Grounded</span>
            <ShieldAlert size={18} className="kpi-icon text-rose" />
          </div>
          <div className="kpi-value text-rose">{summary?.not_ready_count ?? '--'}</div>
          <div className="kpi-sub">High failure risk or depleted RUL</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Fleet Readiness Index</span>
            <Shield size={18} className="kpi-icon text-cyan" />
          </div>
          <div className="kpi-value" style={{ color: getScoreColor(summary?.average_readiness_score || 0) }}>
            {summary?.average_readiness_score ?? '--'}
            <span className="kpi-unit">/100</span>
          </div>
          <div className="kpi-sub">Fleet-wide health baseline</div>
        </div>
      </div>

      {/* Priority Operational Attention Queue */}
      {attentionQueue.length > 0 && (
        <div className="attention-queue-section">
          <div className="section-header-row">
            <div className="section-title">
              <AlertTriangle className="text-amber" size={18} />
              <span>Priority Operational Attention Queue</span>
            </div>
            <span className="queue-subtitle">Ranked by risk severity and operational impact</span>
          </div>

          <div className="attention-queue-grid">
            {attentionQueue.map((item) => (
              <div key={item.asset_id} className="attention-card">
                <div className="attention-card-top">
                  <div className="attention-identity">
                    <span className="rank-badge">#{item.urgency_rank}</span>
                    <span className="asset-name">{item.asset_code}</span>
                    <span className="asset-type-label">{item.asset_type}</span>
                  </div>
                  <span className={`readiness-pill-sm ${getStateBadgeClass(item.readiness_state)}`}>
                    {item.readiness_state.replace('_', ' ')}
                  </span>
                </div>

                <div className="attention-trigger">
                  <div className="trigger-label">PRIMARY OPERATIONAL TRIGGER</div>
                  <div className="trigger-text">{item.primary_trigger}</div>
                </div>

                <div className="attention-action-box">
                  <div className="action-label">RECOMMENDED DIRECTIVE</div>
                  <div className="action-text">{item.recommended_action}</div>
                </div>

                <div className="attention-card-footer">
                  <div className="critical-metric-pill">{item.critical_factor}</div>
                  <button
                    className="inspect-btn"
                    onClick={() => setSelectedAssetForModal({ id: item.asset_id, asset_code: item.asset_code })}
                  >
                    <span>Inspect</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="readiness-filter-bar">
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search assets by code, model, location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <div className="state-pills-group">
            {[
              { id: '', label: 'All States' },
              { id: 'READY', label: 'Ready' },
              { id: 'CAUTION', label: 'Caution' },
              { id: 'DEGRADED', label: 'Degraded' },
              { id: 'NOT_READY', label: 'Not Ready' },
            ].map((btn) => (
              <button
                key={btn.id}
                className={`state-filter-pill ${selectedState === btn.id ? 'active' : ''}`}
                onClick={() => {
                  setSelectedState(btn.id);
                  setPage(0);
                }}
              >
                {btn.label}
              </button>
            ))}
          </div>

          <div className="select-wrapper">
            <SlidersHorizontal size={14} className="filter-icon" />
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
          </div>
        </div>
      </div>

      {/* Fleet Readiness Table */}
      <div className="readiness-table-card">
        {isLoading && !readinessData ? (
          <LoadingSpinner message="Evaluating fleet mission readiness assessments..." />
        ) : items.length === 0 ? (
          <div className="empty-state-box">
            <ShieldAlert size={36} className="text-muted" />
            <div className="empty-title">No matching assets found</div>
            <div className="empty-sub">Adjust your filter parameters or search query.</div>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="readiness-table">
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Mission State</th>
                  <th>Readiness Score</th>
                  <th>Risk Level</th>
                  <th>Failure Prob</th>
                  <th>RUL</th>
                  <th>Anomaly State</th>
                  <th>Failure Mode</th>
                  <th>Active Actions</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.asset_id} className="readiness-row">
                    <td>
                      <div className="table-asset-cell">
                        <span className="asset-code-bold">{row.asset_code}</span>
                        <span className="asset-type-sub">{row.asset_type} &bull; {row.model}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`readiness-pill-sm ${getStateBadgeClass(row.readiness_state)}`}>
                        {row.readiness_state.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <div className="score-cell">
                        <span className="score-num" style={{ color: getScoreColor(row.readiness_score) }}>
                          {row.readiness_score}
                        </span>
                        <div className="score-bar-bg">
                          <div
                            className="score-bar-fill"
                            style={{
                              width: `${row.readiness_score}%`,
                              backgroundColor: getScoreColor(row.readiness_score)
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`status-pill-risk-${(row.risk_level || 'low').toLowerCase()}`}>
                        {row.risk_level}
                      </span>
                    </td>
                    <td className="font-mono">
                      {row.failure_probability !== null ? `${(row.failure_probability * 100).toFixed(1)}%` : '--'}
                    </td>
                    <td className="font-mono">
                      {row.rul_hours !== null ? `${row.rul_hours.toFixed(1)} hrs` : '--'}
                    </td>
                    <td>
                      {row.is_anomaly ? (
                        <span className="anomaly-tag alert">ANOMALY</span>
                      ) : (
                        <span className="anomaly-tag normal">NOMINAL</span>
                      )}
                    </td>
                    <td>
                      <span className="mode-tag-sm">{row.predicted_failure_mode || 'None'}</span>
                    </td>
                    <td>
                      <span className="rec-count-badge">
                        {row.open_recommendations_count} open
                      </span>
                    </td>
                    <td>
                      <button
                        className="table-action-btn"
                        onClick={() => setSelectedAssetForModal({ id: row.asset_id, asset_code: row.asset_code })}
                        title="View Full Mission Diagnostics"
                      >
                        <ExternalLink size={14} />
                        <span>Assess</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Pagination */}
        {totalPages > 1 && (
          <div className="table-pagination-row">
            <span className="pagination-summary">
              Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, totalItems)} of {totalItems} assets
            </span>
            <div className="pagination-buttons">
              <button
                className="pag-btn"
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft size={14} />
                <span>Prev</span>
              </button>
              <span className="page-current">Page {page + 1} of {totalPages}</span>
              <button
                className="pag-btn"
                disabled={page >= totalPages - 1}
                onClick={() => setPage(page + 1)}
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Asset Detail & AI Mission Readiness Modal */}
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
