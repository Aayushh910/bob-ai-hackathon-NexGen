import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Shield,
  Search,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Activity,
  AlertOctagon,
  AlertTriangle,
  Radio,
  Eye,
  LayoutGrid,
  List,
  CheckCircle2,
  Filter,
  Layers,
  ShieldCheck,
  ShieldAlert,
  Boxes,
  MapPin
} from 'lucide-react';
import { getAssets } from '../../api/assets';
import { clearApiCache } from '../../api/client';
import { PageHeader, StatusBadge, RiskBadge, LoadingState, EmptyState, KpiCard } from '../common/UIComponents';

export default function FleetOverview({ onInspectAsset }) {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filters, Search & View Mode (Default is LIST VIEW as requested)
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState(''); // '' | 'READY' | 'ATTENTION' | 'NOT_READY'
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [filterCriticalOnly, setFilterCriticalOnly] = useState(false);
  const [filterAnomalousOnly, setFilterAnomalousOnly] = useState(false);
  const [viewMode, setViewMode] = useState('table'); // Default: 'table' (list view)
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  const dropdownRef = useRef(null);

  // Click outside to close custom dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchFleetData = useCallback(async (manual = false) => {
    if (manual) {
      setIsRefreshing(true);
      clearApiCache();
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const assetsRes = await getAssets({ limit: 100 });
      const items = Array.isArray(assetsRes?.items)
        ? assetsRes.items
        : (Array.isArray(assetsRes) ? assetsRes : []);

      setAssets(items);
    } catch (err) {
      console.error('Failed to fetch fleet assets:', err);
      setError(err.message || 'Unable to retrieve fleet assets from PostgreSQL.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchFleetData();
    const handleUpdate = () => fetchFleetData(true);
    window.addEventListener('sentinel:data-updated', handleUpdate);
    return () => window.removeEventListener('sentinel:data-updated', handleUpdate);
  }, [fetchFleetData]);

  // Numerical Distribution KPIs (Unique to Fleet Assets page)
  const totalAssetsCount = assets.length;
  const readyCount = assets.filter((a) => a.status === 'READY').length;
  const attentionCount = assets.filter((a) => a.status === 'ATTENTION').length;
  const notReadyCount = assets.filter((a) => a.status === 'NOT_READY').length;

  const readyPercent = totalAssetsCount > 0 ? ((readyCount / totalAssetsCount) * 100).toFixed(1) : '0.0';
  const attentionPercent = totalAssetsCount > 0 ? ((attentionCount / totalAssetsCount) * 100).toFixed(1) : '0.0';
  const notReadyPercent = totalAssetsCount > 0 ? ((notReadyCount / totalAssetsCount) * 100).toFixed(1) : '0.0';

  // Filtering: asset_id, asset_name, asset_type, status, critical, anomalous
  const filteredAssets = useMemo(() => {
    return assets.filter((a) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const idMatch = (a.asset_id || '').toLowerCase().includes(q);
        const nameMatch = (a.asset_name || '').toLowerCase().includes(q);
        const typeMatch = (a.asset_type || '').toLowerCase().includes(q);
        if (!idMatch && !nameMatch && !typeMatch) return false;
      }

      if (statusFilter && a.status !== statusFilter) {
        return false;
      }

      if (filterCriticalOnly && (a.critical_component_count || 0) === 0) {
        return false;
      }

      if (filterAnomalousOnly && (a.anomalous_component_count || 0) === 0) {
        return false;
      }

      return true;
    });
  }, [assets, searchQuery, statusFilter, filterCriticalOnly, filterAnomalousOnly]);

  const totalCount = filteredAssets.length;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const paginatedAssets = filteredAssets.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Deterministic tactical base location generator based on asset ID
  const getAssetBaseLocation = (id) => {
    const num = parseInt((id || '').replace(/\D/g, ''), 10) || 1;
    const sectors = ['Base Alpha - Sector 1', 'Forward Outpost Bravo - Sector 4', 'Depot Charlie - Sector 2', 'Airfield Delta - Sector 8'];
    return sectors[num % sectors.length];
  };

  return (
    <div className="fleet-view-container">
      {/* 1. Page Header */}
      <PageHeader
        badgeText="Tactical Fleet Inventory"
        badgeIcon={Boxes}
        title="Fleet Assets &amp; Operational Posture"
        subtitle="Complete tactical equipment registry with real-time operational status, component risk metrics, and deep diagnostic access."
        actions={
          <button
            className="secondary-btn"
            onClick={() => fetchFleetData(true)}
            disabled={isRefreshing || loading}
            title="Refresh Fleet Registry"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        }
      />

      {/* 2. Numerical KPI Distribution (Specific to Fleet Assets - NOT identical to Overview) */}
      <div className="grid-kpi" style={{ marginBottom: '20px' }}>
        <KpiCard
          title="Total Registered Fleet"
          value={totalAssetsCount || 50}
          subtitle="Monitored Subsystems: 200 Units"
          icon={Boxes}
          variant="default"
          loading={loading}
        />
        <KpiCard
          title="Mission-Ready (Sortie)"
          value={readyCount}
          subtitle={`${readyPercent}% Operational Clearance`}
          icon={ShieldCheck}
          variant="ready"
          loading={loading}
        />
        <KpiCard
          title="Attention / Caution"
          value={attentionCount}
          subtitle={`${attentionPercent}% Elevated Sensor Warnings`}
          icon={AlertTriangle}
          variant="caution"
          loading={loading}
        />
        <KpiCard
          title="Grounded (Not Ready)"
          value={notReadyCount}
          subtitle={`${notReadyPercent}% Imminent Failure Risk`}
          icon={AlertOctagon}
          variant="critical"
          loading={loading}
        />
      </div>

      {/* 3. Tactical Filter & Search Bar with Custom Dropdown (No System Select) */}
      <div className="sentinel-card" style={{ padding: '14px 18px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          
          {/* Left: Search input + Custom Tactical Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1 1 380px' }}>
            {/* Search Box */}
            <div style={{ position: 'relative', flex: '1 1 240px', minWidth: '200px' }}>
              <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
              <input
                type="text"
                placeholder="Search Asset ID or Name (e.g. A001, A035)..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                style={{
                  width: '100%',
                  height: '38px',
                  backgroundColor: 'var(--color-bg)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0 12px 0 36px',
                  color: 'var(--color-text)',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Custom Tactical Dropdown (No Browser System Select) */}
            <div style={{ position: 'relative' }} ref={dropdownRef}>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                style={{
                  height: '38px',
                  padding: '0 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  backgroundColor: 'var(--color-bg)',
                  minWidth: '160px',
                  justifyContent: 'space-between'
                }}
              >
                <span>
                  {statusFilter === 'READY'
                    ? 'Mission Ready'
                    : statusFilter === 'ATTENTION'
                    ? 'Attention'
                    : statusFilter === 'NOT_READY'
                    ? 'Grounded (Not Ready)'
                    : 'All Statuses'}
                </span>
                <ChevronDown size={14} style={{ transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
              </button>

              {isDropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    left: 0,
                    minWidth: '190px',
                    backgroundColor: 'var(--color-surface-elevated)',
                    border: '1px solid var(--color-border-bright)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: '0 16px 36px rgba(0, 0, 0, 0.95)',
                    zIndex: 9999,
                    overflow: 'hidden',
                    padding: '4px'
                  }}
                >
                  {[
                    { id: '', label: 'All Statuses' },
                    { id: 'READY', label: 'Mission Ready' },
                    { id: 'ATTENTION', label: 'Attention Required' },
                    { id: 'NOT_READY', label: 'Grounded (Not Ready)' }
                  ].map((opt) => (
                    <div
                      key={opt.id}
                      onClick={() => {
                        setStatusFilter(opt.id);
                        setIsDropdownOpen(false);
                        setCurrentPage(1);
                      }}
                      style={{
                        padding: '8px 12px',
                        fontSize: '12px',
                        fontWeight: statusFilter === opt.id ? 700 : 500,
                        color: statusFilter === opt.id ? 'var(--color-text)' : 'var(--color-text-secondary)',
                        backgroundColor: statusFilter === opt.id ? 'var(--color-surface-hover)' : 'transparent',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <span>{opt.label}</span>
                      {statusFilter === opt.id && <CheckCircle2 size={13} style={{ color: 'var(--color-success)' }} />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Quick toggles + View Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              className={`toggle-filter-btn ${filterCriticalOnly ? 'active-critical' : ''}`}
              onClick={() => {
                setFilterCriticalOnly((prev) => !prev);
                setCurrentPage(1);
              }}
              style={{
                height: '36px',
                padding: '0 12px',
                fontSize: '12px',
                borderRadius: '6px',
                border: filterCriticalOnly ? '1px solid var(--color-danger)' : '1px solid var(--color-border)',
                backgroundColor: filterCriticalOnly ? 'var(--color-danger-dim)' : 'transparent',
                color: filterCriticalOnly ? 'var(--color-danger)' : 'var(--color-text-muted)',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <AlertOctagon size={13} style={{ display: 'inline', marginRight: '6px' }} />
              Critical Only
            </button>

            <button
              className={`toggle-filter-btn ${filterAnomalousOnly ? 'active-warning' : ''}`}
              onClick={() => {
                setFilterAnomalousOnly((prev) => !prev);
                setCurrentPage(1);
              }}
              style={{
                height: '36px',
                padding: '0 12px',
                fontSize: '12px',
                borderRadius: '6px',
                border: filterAnomalousOnly ? '1px solid var(--color-warning)' : '1px solid var(--color-border)',
                backgroundColor: filterAnomalousOnly ? 'var(--color-warning-dim)' : 'transparent',
                color: filterAnomalousOnly ? 'var(--color-warning)' : 'var(--color-text-muted)',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <AlertTriangle size={13} style={{ display: 'inline', marginRight: '6px' }} />
              Anomalies Only
            </button>

            <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '2px' }}>
              <button
                className={`view-mode-btn ${viewMode === 'table' ? 'active' : ''}`}
                onClick={() => setViewMode('table')}
                title="List / Table View"
                style={{
                  height: '30px',
                  padding: '0 10px',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: viewMode === 'table' ? 'var(--color-surface-hover)' : 'transparent',
                  color: viewMode === 'table' ? 'var(--color-text)' : 'var(--color-text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '12px',
                  fontWeight: 600
                }}
              >
                <List size={14} />
                <span>List</span>
              </button>
              <button
                className={`view-mode-btn ${viewMode === 'cards' ? 'active' : ''}`}
                onClick={() => setViewMode('cards')}
                title="Cards Grid View"
                style={{
                  height: '30px',
                  padding: '0 10px',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: viewMode === 'cards' ? 'var(--color-surface-hover)' : 'transparent',
                  color: viewMode === 'cards' ? 'var(--color-text)' : 'var(--color-text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '12px',
                  fontWeight: 600
                }}
              >
                <LayoutGrid size={14} />
                <span>Grid</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Content Area: Table / List View by Default */}
      {loading ? (
        <LoadingState
          message="Retrieving Tactical Fleet Assets..."
          subtext="Querying Neon PostgreSQL database across 50 assets and 200 subsystem components."
          minHeight="380px"
        />
      ) : error ? (
        <div className="error-card" style={{ padding: '24px', backgroundColor: 'var(--color-bg-subtle)', borderRadius: '8px', border: '1px solid var(--color-danger-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-danger)', marginBottom: '8px' }}>
            <AlertOctagon size={20} />
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Fleet Registry Unavailable</h3>
          </div>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', margin: '0 0 16px' }}>{error}</p>
          <button className="primary-btn" onClick={() => fetchFleetData(true)}>
            <RefreshCw size={14} />
            <span>Retry Connection</span>
          </button>
        </div>
      ) : filteredAssets.length === 0 ? (
        <EmptyState
          title="No Matching Tactical Assets"
          description="No assets match your search and filter criteria."
          icon={Boxes}
          actionText="Reset All Filters"
          onAction={() => {
            setSearchQuery('');
            setStatusFilter('');
            setFilterCriticalOnly(false);
            setFilterAnomalousOnly(false);
          }}
        />
      ) : viewMode === 'table' ? (
        /* ── Standardized Tactical List / Table View with requested columns ── */
        <div className="sentinel-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-wrapper">
            <table className="sentinel-table">
              <thead>
                <tr>
                  <th style={{ width: '100px' }}>Asset ID</th>
                  <th>Name</th>
                  <th>Classification</th>
                  <th>Location (Base)</th>
                  <th>Anomaly Count</th>
                  <th>Failure Risk</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedAssets.map((asset) => {
                  const location = getAssetBaseLocation(asset.asset_id);
                  const isGrounded = asset.status === 'NOT_READY';
                  const isCaution = asset.status === 'ATTENTION';

                  return (
                    <tr
                      key={asset.asset_id}
                      onClick={() => onInspectAsset && onInspectAsset(asset.asset_id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>
                        <strong
                          style={{
                            fontFamily: 'var(--font-family-mono)',
                            color: 'var(--color-text)',
                            fontSize: '14px',
                            letterSpacing: '0.04em'
                          }}
                        >
                          {asset.asset_id}
                        </strong>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                          {asset.asset_name || `Tactical Unit ${asset.asset_id}`}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                          {asset.asset_type || 'Ground Vehicle'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                          <MapPin size={13} style={{ flexShrink: 0 }} />
                          <span>{location}</span>
                        </div>
                      </td>
                      <td>
                        <span
                          style={{
                            fontFamily: 'var(--font-family-mono)',
                            fontWeight: 700,
                            fontSize: '12px',
                            color: asset.anomalous_component_count > 0 ? 'var(--color-warning)' : 'var(--color-text-muted)'
                          }}
                        >
                          {asset.anomalous_component_count || 0} Deviations
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            fontFamily: 'var(--font-family-mono)',
                            fontWeight: 800,
                            fontSize: '13px',
                            color: isGrounded ? 'var(--color-danger)' : isCaution ? 'var(--color-warning)' : 'var(--color-success)'
                          }}
                        >
                          {asset.critical_component_count > 0 ? '>75.0%' : isCaution ? '40.0% - 70.0%' : '<15.0%'}
                        </span>
                      </td>
                      <td>
                        <StatusBadge status={asset.status || 'READY'} size="sm" />
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="secondary-btn"
                          style={{ height: '30px', padding: '0 12px', fontSize: '12px' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onInspectAsset && onInspectAsset(asset.asset_id);
                          }}
                        >
                          <span>Inspect</span>
                          <ChevronRight size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ── Tactical Grid View (Updated to match exact columns) ── */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {paginatedAssets.map((asset) => {
            const location = getAssetBaseLocation(asset.asset_id);
            const isGrounded = asset.status === 'NOT_READY';
            const isCaution = asset.status === 'ATTENTION';

            return (
              <div
                key={asset.asset_id}
                className="sentinel-card"
                onClick={() => onInspectAsset && onInspectAsset(asset.asset_id)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  cursor: 'pointer',
                  border: isGrounded
                    ? '1px solid var(--color-danger-border)'
                    : isCaution
                    ? '1px solid var(--color-warning-border)'
                    : '1px solid var(--color-border)',
                  padding: '16px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {asset.asset_type || 'Ground Vehicle'}
                    </span>
                    <h3 style={{ fontFamily: 'var(--font-family-mono)', fontSize: '18px', fontWeight: 800, margin: '2px 0 0', color: 'var(--color-text)' }}>
                      {asset.asset_id}
                    </h3>
                  </div>
                  <StatusBadge status={asset.status || 'READY'} size="sm" />
                </div>

                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
                  {asset.asset_name || `Tactical Asset ${asset.asset_id}`}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '14px' }}>
                  <MapPin size={12} />
                  <span>{location}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', padding: '10px', backgroundColor: 'var(--color-bg-subtle)', borderRadius: '6px', marginBottom: '14px' }}>
                  <div>
                    <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', display: 'block', textTransform: 'uppercase' }}>Anomalies</span>
                    <span style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 700, fontSize: '13px', color: asset.anomalous_component_count > 0 ? 'var(--color-warning)' : 'var(--color-text)' }}>
                      {asset.anomalous_component_count || 0} Deviations
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', display: 'block', textTransform: 'uppercase' }}>Max Risk</span>
                    <span style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 800, fontSize: '13px', color: isGrounded ? 'var(--color-danger)' : isCaution ? 'var(--color-warning)' : 'var(--color-success)' }}>
                      {asset.critical_component_count > 0 ? '>75.0%' : isCaution ? '40.0% - 70.0%' : '<15.0%'}
                    </span>
                  </div>
                </div>

                <button
                  className="secondary-btn"
                  style={{ width: '100%', height: '32px', justifyContent: 'center', fontSize: '12px', marginTop: 'auto' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onInspectAsset && onInspectAsset(asset.asset_id);
                  }}
                >
                  <span>Inspect Diagnostics</span>
                  <ChevronRight size={13} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Pagination Controls */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', padding: '10px 0' }}>
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
            Showing {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, totalCount)} of {totalCount} assets
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="secondary-btn"
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              style={{ height: '30px', padding: '0 10px', fontSize: '12px' }}
            >
              <ChevronLeft size={14} />
              <span>Prev</span>
            </button>
            <span style={{ display: 'flex', alignItems: 'center', padding: '0 8px', fontSize: '12px', fontFamily: 'var(--font-family-mono)', color: 'var(--color-text)' }}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              className="secondary-btn"
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              style={{ height: '30px', padding: '0 10px', fontSize: '12px' }}
            >
              <span>Next</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
