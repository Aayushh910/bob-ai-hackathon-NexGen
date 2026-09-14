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
  const [assets, setAssets] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Modal Inspection
  const [selectedAsset, setSelectedAsset] = useState(null);

  // Debounce search input to avoid multi-query thrashing on keystrokes
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const skip = (currentPage - 1) * pageSize;
      const res = await getAssets({
        skip,
        limit: pageSize,
        search: debouncedSearch.trim() || undefined,
        status: statusFilter || undefined,
        asset_type: typeFilter || undefined,
      });
      setAssets(res.items || []);
      setTotalCount(res.total || 0);
    } catch (err) {
      console.error('Failed to fetch assets:', err);
      setError(err.message || 'Unable to retrieve fleet assets from PostgreSQL.');
    } finally {
      setLoading(false);
    }
  }, [currentPage, debouncedSearch, statusFilter, typeFilter]);

  useEffect(() => {
    fetchAssets();

    const handleUpdate = () => {
      fetchAssets();
    };
    window.addEventListener('sentinel:data-updated', handleUpdate);
    return () => window.removeEventListener('sentinel:data-updated', handleUpdate);
  }, [fetchAssets]);

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchAssets();
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('');
    setTypeFilter('');
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
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}
              onClick={() => setSearchQuery('')}
            >
              Clear
            </button>
          )}
        </form>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">All Operational Conditions</option>
            <option value="ACTIVE">Active Deployment</option>
            <option value="MAINTENANCE">In Maintenance</option>
            <option value="INACTIVE">Inactive / Offline</option>
          </select>

          <select
            className="filter-select"
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">All Equipment Types</option>
            <option value="Heavy Equipment">Heavy Equipment</option>
            <option value="Vehicle">Vehicle</option>
            <option value="Aircraft">Aircraft</option>
            <option value="Turbine">Turbine</option>
          </select>

          {(searchQuery || statusFilter || typeFilter) && (
            <button className="secondary-btn" onClick={handleResetFilters} style={{ height: '40px' }}>
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* 3. Assets Display: Table or Grid */}
      {loading ? (
        <div style={{ padding: '60px 0', display: 'flex', justifyContent: 'center' }}>
          <LoadingState
            message="Querying Fleet Asset Registry..."
            subtext="Loading PostgreSQL equipment records and telemetry deployment statuses"
            size="lg"
          />
        </div>
      ) : assets.length === 0 ? (
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
              {assets.map((a) => {
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
          {assets.map((a) => {
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
          Showing <strong>{assets.length}</strong> of <strong>{totalCount}</strong> assets registered in database
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
