import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  Search,
  RefreshCw,
  SlidersHorizontal,
  ChevronRight,
  ChevronLeft,
  Activity,
  Layers,
  MapPin,
  Eye,
  LayoutGrid,
  List
} from 'lucide-react';
import { getAssets } from '../../api/assets';
import { PageHeader, StatusBadge, LoadingSkeleton, EmptyState, KpiCard, LoadingSpinner, LoadingState } from '../common/UIComponents';
import AssetDetailModal from './AssetDetailModal';
import ErrorBoundary from '../common/ErrorBoundary';

export default function FleetOverview() {
  const [allAssets, setAllAssets] = useState(() => {
    try {
      const saved = sessionStorage.getItem('sentinel_all_assets');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });
  const [loading, setLoading] = useState(() => allAssets.length === 0);
  const [error, setError] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [conditionFilter, setConditionFilter] = useState('');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Modal Inspection
  const [selectedAsset, setSelectedAsset] = useState(null);

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAssets({ limit: 150 });
      const items = res.items || [];
      setAllAssets(items);
      try {
        if (items.length > 0) sessionStorage.setItem('sentinel_all_assets', JSON.stringify(items));
      } catch (e) {}
    } catch (err) {
      console.error('Failed to fetch assets:', err);
      setError(err.message || 'Unable to retrieve fleet assets from PostgreSQL.');
      if (allAssets.length === 0) {
        try {
          const cached = sessionStorage.getItem('sentinel_all_assets');
          if (cached) setAllAssets(JSON.parse(cached));
        } catch (e) {}
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssets();

    const handleUpdate = () => {
      fetchAssets();
    };
    window.addEventListener('sentinel:data-updated', handleUpdate);
    return () => window.removeEventListener('sentinel:data-updated', handleUpdate);
  }, [fetchAssets]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setConditionFilter('');
    setCurrentPage(1);
  };

  const getAssetCondition = (asset) => {
    if (asset.status === 'MAINTENANCE' || asset.condition === 'MAINTENANCE') {
      return { label: 'Maintenance', badgeStatus: 'MAINTENANCE', score: asset.readiness_score ? Math.round(asset.readiness_score) : null };
    }
    if (asset.sensor_connected === false || asset.condition === 'OFFLINE') {
      return { label: 'Offline', badgeStatus: 'OFFLINE', score: null };
    }
    const score = asset.readiness_score !== undefined && asset.readiness_score !== null
      ? Math.round(asset.readiness_score)
      : null;

    if (score !== null) {
      if (score >= 70) {
        return { label: 'Operational / Ready', badgeStatus: 'READY', score };
      }
      if (score >= 40) {
        return { label: 'Degraded', badgeStatus: 'DEGRADED', score };
      }
      return { label: 'Critical / Not Ready', badgeStatus: 'NOT_READY', score };
    }

    return { label: 'Operational / Ready', badgeStatus: 'READY', score: 85 };
  };

  // Instantaneous multi-parameter filtering
  const filteredAssets = allAssets.filter((a) => {
    // 1. Search Query filter (code, model, location, manufacturer)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const codeMatch = (a.asset_code || '').toLowerCase().includes(q);
      const modelMatch = (a.model || '').toLowerCase().includes(q);
      const locMatch = (a.location || '').toLowerCase().includes(q);
      const mfrMatch = (a.manufacturer || '').toLowerCase().includes(q);
      const typeMatch = (a.asset_type || '').toLowerCase().includes(q);
      if (!codeMatch && !modelMatch && !locMatch && !mfrMatch && !typeMatch) {
        return false;
      }
    }

    // 2. Operational Condition filter
    if (conditionFilter) {
      const cond = getAssetCondition(a);
      if (conditionFilter === 'READY' && cond.badgeStatus !== 'READY') return false;
      if (conditionFilter === 'DEGRADED' && cond.badgeStatus !== 'DEGRADED') return false;
      if (conditionFilter === 'NOT_READY' && cond.badgeStatus !== 'NOT_READY') return false;
      if (conditionFilter === 'MAINTENANCE' && cond.badgeStatus !== 'MAINTENANCE') return false;
      if (conditionFilter === 'OFFLINE' && cond.badgeStatus !== 'OFFLINE') return false;
    }

    return true;
  });

  const totalCount = filteredAssets.length;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const paginatedAssets = filteredAssets.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="fleet-view-container">
      {/* 1. Page Header */}
      <PageHeader
        badgeText="Fleet Inventory & Asset Registry"
        badgeIcon={Shield}
        title="Fleet Assets & Telemetry Registry"
        subtitle="Comprehensive asset catalog, real-time readiness scoring, operational condition, and HUMS telemetry stream attribution."
        actions={
          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ display: 'flex', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
              <button
                className={`tab-btn ${viewMode === 'table' ? 'active' : ''}`}
                style={{ padding: '6px 12px', height: '36px' }}
                onClick={() => setViewMode('table')}
                title="Table View"
                aria-label="Table View"
              >
                <List size={16} />
              </button>
              <button
                className={`tab-btn ${viewMode === 'grid' ? 'active' : ''}`}
                style={{ padding: '6px 12px', height: '36px' }}
                onClick={() => setViewMode('grid')}
                title="Grid View"
                aria-label="Grid View"
              >
                <LayoutGrid size={16} />
              </button>
            </div>

            <button
              className="secondary-btn"
              onClick={fetchAssets}
              disabled={loading}
              title="Refresh Fleet Data"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        }
      />

      {/* 2. Filter & Search Bar */}
      <div className="filter-bar">
        <form className="search-form" onSubmit={handleSearchSubmit}>
          <Search size={15} style={{ color: 'var(--color-text-muted)' }} />
          <input
            type="text"
            className="search-input"
            placeholder="Search by asset code (e.g. A001), model, depot location..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
          />
          {searchQuery && (
            <button
              type="button"
              style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}
              onClick={() => {
                setSearchQuery('');
                setCurrentPage(1);
              }}
            >
              Clear
            </button>
          )}
        </form>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            className="filter-select"
            value={conditionFilter}
            onChange={(e) => {
              setConditionFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">All Operational Conditions</option>
            <option value="READY">Operational / Ready (Nominal)</option>
            <option value="DEGRADED">Degraded Subsystems</option>
            <option value="NOT_READY">Critical / Ground Hold</option>
            <option value="MAINTENANCE">In Maintenance Depot</option>
          </select>

          {(searchQuery || conditionFilter) && (
            <button className="secondary-btn" onClick={handleResetFilters} style={{ height: '40px' }}>
              Reset Filters
            </button>
          )}
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginLeft: 'auto' }}>
            {totalCount} {totalCount === 1 ? 'asset' : 'assets'} matching
          </span>
        </div>
      </div>

      {/* 3. Assets Display: Table or Grid */}
      {loading && allAssets.length === 0 ? (
        <div style={{ padding: '60px 0', display: 'flex', justifyContent: 'center' }}>
          <LoadingState
            message="Querying Fleet Asset Registry..."
            subtext="Loading PostgreSQL equipment records and telemetry deployment statuses"
            size="lg"
          />
        </div>
      ) : error && allAssets.length === 0 ? (
        <EmptyState
          title="Telemetry Connection Failed"
          description={error || "Could not retrieve fleet assets. Click retry to reconnect."}
          actionText="Retry Connection"
          onAction={fetchAssets}
        />
      ) : filteredAssets.length === 0 ? (
        <EmptyState
          title="No Matching Fleet Assets"
          description="No assets correspond to the specified search keywords or state filters."
          actionText="Clear All Filters"
          onAction={handleResetFilters}
        />
      ) : viewMode === 'table' ? (
        <div className="table-wrapper">
          <table className="sentinel-table">
            <thead>
              <tr>
                <th>Asset Code</th>
                <th>Model &amp; System</th>
                <th>Type</th>
                <th>Depot Location</th>
                <th>Readiness Score</th>
                <th>Condition</th>
                <th>Telemetry Link</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedAssets.map((a) => {
                const cond = getAssetCondition(a);
                return (
                  <tr key={a.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div className="brand-shield-box" style={{ width: '28px', height: '28px' }}>
                          <Activity size={14} />
                        </div>
                        <div>
                          <strong style={{ fontFamily: 'var(--font-family-mono)', color: 'var(--color-text)' }}>
                            {a.asset_code || `Asset #${a.id}`}
                          </strong>
                          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                            SN: {a.serial_number || `SN-${a.id.toString().padStart(4, '0')}`}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 500 }}>{a.model || 'Sentinel-HUMS'}</span>
                    </td>
                    <td>
                      <span style={{ color: 'var(--color-text-secondary)' }}>{a.asset_type || 'Industrial'}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-text-muted)' }}>
                        <MapPin size={13} />
                        <span>{a.location || 'Depot Alpha'}</span>
                      </div>
                    </td>
                    <td>
                      {cond.score !== null ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 700, fontSize: '13px', color: cond.score >= 70 ? 'var(--color-success)' : cond.score >= 40 ? 'var(--color-caution)' : 'var(--color-danger)' }}>
                            {cond.score}%
                          </span>
                          <div style={{ width: '48px', height: '4px', backgroundColor: 'var(--color-bg-subtle)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ width: `${cond.score}%`, height: '100%', backgroundColor: cond.score >= 70 ? 'var(--color-success)' : cond.score >= 40 ? 'var(--color-caution)' : 'var(--color-danger)' }} />
                          </div>
                        </div>
                      ) : (
                        <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>--</span>
                      )}
                    </td>
                    <td>
                      <StatusBadge status={cond.badgeStatus} size="sm" label={cond.label} />
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                        <span
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: a.sensor_connected !== false ? 'var(--color-success)' : 'var(--color-text-muted)',
                            boxShadow: a.sensor_connected !== false ? '0 0 6px var(--color-success)' : 'none',
                            display: 'inline-block'
                          }}
                        />
                        <span style={{ color: a.sensor_connected !== false ? 'var(--color-text-secondary)' : 'var(--color-text-muted)' }}>
                          {a.sensor_connected !== false ? 'Live Online' : 'No Signal'}
                        </span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="secondary-btn"
                        style={{ height: '30px', padding: '0 12px', fontSize: '12px' }}
                        onClick={() => setSelectedAsset({ id: a.id, asset_code: a.asset_code || `Asset #${a.id}` })}
                      >
                        <Eye size={13} />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid-3-col">
          {paginatedAssets.map((a) => {
            const cond = getAssetCondition(a);
            return (
              <div key={a.id} className="sentinel-card hoverable">
                <div className="card-header-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className="brand-shield-box" style={{ width: '32px', height: '32px' }}>
                      <Activity size={16} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '15px', fontWeight: 700, fontFamily: 'var(--font-family-mono)' }}>
                        {a.asset_code || `Asset #${a.id}`}
                      </h3>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{a.model}</div>
                    </div>
                  </div>
                  <StatusBadge status={cond.badgeStatus} size="sm" label={cond.label} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', color: 'var(--color-text-secondary)', margin: '12px 0 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>Readiness Score:</span>
                    <span style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 700, color: cond.score >= 70 ? 'var(--color-success)' : cond.score >= 40 ? 'var(--color-caution)' : 'var(--color-danger)' }}>
                      {cond.score !== null ? `${cond.score}%` : 'N/A'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>Type:</span>
                    <span>{a.asset_type || 'Equipment'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>Location:</span>
                    <span>{a.location || 'Depot Alpha'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>Telemetry:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor: a.sensor_connected !== false ? 'var(--color-success)' : 'var(--color-text-muted)',
                          display: 'inline-block'
                        }}
                      />
                      <span>{a.sensor_connected !== false ? 'Connected' : 'Offline'}</span>
                    </div>
                  </div>
                </div>

                <button
                  className="secondary-btn"
                  style={{ width: '100%', height: '34px', marginTop: 'auto' }}
                  onClick={() => setSelectedAsset({ id: a.id, asset_code: a.asset_code || `Asset #${a.id}` })}
                >
                  <Eye size={14} />
                  <span>Open Diagnostics &amp; Telemetry</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Pagination */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '20px', padding: '12px 0' }}>
        <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
          Showing <strong>{paginatedAssets.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} - {Math.min(currentPage * pageSize, totalCount)}</strong> of <strong>{totalCount}</strong> matching assets ({allAssets.length} total in fleet)
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            className="secondary-btn"
            style={{ height: '32px', padding: '0 10px' }}
            disabled={currentPage <= 1 || loading}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft size={15} />
            <span>Previous</span>
          </button>
          <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', padding: '0 6px' }}>
            Page {currentPage} of {totalPages}
          </span>
          <button
            className="secondary-btn"
            style={{ height: '32px', padding: '0 10px' }}
            disabled={currentPage >= totalPages || loading}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          >
            <span>Next</span>
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {/* Deep Inspection Modal */}
      {selectedAsset && (
        <ErrorBoundary title="Asset Diagnostics Modal">
          <AssetDetailModal
            asset={selectedAsset}
            onClose={() => {
              setSelectedAsset(null);
              fetchAssets();
            }}
          />
        </ErrorBoundary>
      )}
    </div>
  );
}
