import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  Search,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
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
  ShieldAlert
} from 'lucide-react';
import { getAssets } from '../../api/assets';
import { getDashboardSummary } from '../../api/dashboard';
import { PageHeader, StatusBadge, RiskBadge, LoadingState, EmptyState, KpiCard } from '../common/UIComponents';

export default function FleetOverview({ onInspectAsset }) {
  const [assets, setAssets] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters, Search & View Mode
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [filterCriticalOnly, setFilterCriticalOnly] = useState(false);
  const [filterAnomalousOnly, setFilterAnomalousOnly] = useState(false);
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table'
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  const fetchFleetData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [assetsRes, summaryRes] = await Promise.all([
        getAssets({ limit: 100 }),
        getDashboardSummary().catch(() => null)
      ]);

      const items = Array.isArray(assetsRes?.items)
        ? assetsRes.items
        : (Array.isArray(assetsRes) ? assetsRes : []);

      setAssets(items);
      if (summaryRes) {
        setSummary(summaryRes);
      }
    } catch (err) {
      console.error('Failed to fetch fleet assets:', err);
      setError(err.message || 'Unable to retrieve fleet assets from PostgreSQL.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFleetData();
    const handleUpdate = () => fetchFleetData();
    window.addEventListener('sentinel:data-updated', handleUpdate);
    return () => window.removeEventListener('sentinel:data-updated', handleUpdate);
  }, [fetchFleetData]);

  // Filtering: asset_id, asset_name, asset_type, status, critical, anomalous
  const filteredAssets = assets.filter((a) => {
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

  const totalCount = filteredAssets.length;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const paginatedAssets = filteredAssets.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Status counts
  const readyCount = assets.filter((a) => a.status === 'READY').length;
  const attentionCount = assets.filter((a) => a.status === 'ATTENTION').length;
  const notReadyCount = assets.filter((a) => a.status === 'NOT_READY').length;

  // Readiness rate from backend summary (or derived directly from exact asset counts)
  const fleetReadinessPercent = summary?.readiness_rate_percent !== undefined
    ? Number(summary.readiness_rate_percent).toFixed(1)
    : (assets.length > 0 ? ((readyCount / assets.length) * 100).toFixed(1) : '0.0');

  return (
    <div className="fleet-view-container">
      {/* 1. Page Header */}
      <PageHeader
        badgeText="Tactical Fleet Inventory"
        badgeIcon={Shield}
        title="Fleet Assets &amp; Operational Posture"
        subtitle="Complete tactical equipment registry with real-time operational status, component risk metrics, and deep diagnostic access."
        actions={
          <button className="secondary-btn" onClick={fetchFleetData} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        }
      />

      {/* 2. Top-Level Fleet Readiness Banner (Percentage-Based Real Data) */}
      <div className="grid-kpi" style={{ marginBottom: '16px' }}>
        <KpiCard
          title="Fleet Readiness Rate"
          value={`${fleetReadinessPercent}%`}
          subtitle={`${readyCount} of ${assets.length || 50} tactical assets mission ready`}
          icon={ShieldCheck}
          variant="ready"
          loading={loading}
        />
        <KpiCard
          title="Total Registered Assets"
          value={summary?.total_assets ?? (loading ? '—' : assets.length)}
          subtitle={`${attentionCount} Attention • ${notReadyCount} Grounded`}
          icon={Layers}
          variant="default"
          loading={loading}
        />
        <KpiCard
          title="Monitored Subsystems"
          value={summary?.total_components ?? (loading ? '—' : (assets.length * 4))}
          subtitle="Engine, Battery, Fuel Pump, Hydraulic"
          icon={Activity}
          variant="default"
          loading={loading}
        />
        <KpiCard
          title="Subsystems Requiring Service"
          value={summary?.component_risk_summary?.critical_components ?? (loading ? '—' : 0)}
          subtitle={`${summary?.component_risk_summary?.high_priority_components ?? 0} High Priority Maintenance`}
          icon={AlertOctagon}
          variant="critical"
          loading={loading}
        />
      </div>

      {/* 3. Operational Filter Toolbar */}
      <div className="fleet-filter-bar sentinel-card" style={{ marginBottom: '16px', padding: '14px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'space-between', alignItems: 'center' }}>
          {/* Search Box */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '280px', flex: '1', backgroundColor: 'var(--color-bg)', padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
            <Search size={15} style={{ color: 'var(--color-text-muted)' }} />
            <input
              type="text"
              placeholder="Search by Asset ID (e.g. A001, A035), name, or type..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              style={{ background: 'transparent', border: 'none', color: 'var(--color-text)', outline: 'none', width: '100%', fontSize: '13px' }}
            />
          </div>

          {/* Status Tabs */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              className={`tab-btn ${statusFilter === '' ? 'active' : ''}`}
              style={{ padding: '6px 12px', fontSize: '12px' }}
              onClick={() => { setStatusFilter(''); setCurrentPage(1); }}
            >
              All ({assets.length})
            </button>
            <button
              className={`tab-btn ${statusFilter === 'READY' ? 'active' : ''}`}
              style={{ padding: '6px 12px', fontSize: '12px' }}
              onClick={() => { setStatusFilter('READY'); setCurrentPage(1); }}
            >
              READY ({readyCount})
            </button>
            <button
              className={`tab-btn ${statusFilter === 'ATTENTION' ? 'active' : ''}`}
              style={{ padding: '6px 12px', fontSize: '12px' }}
              onClick={() => { setStatusFilter('ATTENTION'); setCurrentPage(1); }}
            >
              ATTENTION ({attentionCount})
            </button>
            <button
              className={`tab-btn ${statusFilter === 'NOT_READY' ? 'active' : ''}`}
              style={{ padding: '6px 12px', fontSize: '12px' }}
              onClick={() => { setStatusFilter('NOT_READY'); setCurrentPage(1); }}
            >
              NOT READY ({notReadyCount})
            </button>
          </div>

          {/* Quick Risk Toggles & View Mode Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              className={`secondary-btn ${filterCriticalOnly ? 'active' : ''}`}
              style={{
                fontSize: '11px',
                padding: '4px 8px',
                borderColor: filterCriticalOnly ? 'var(--color-critical)' : undefined,
                color: filterCriticalOnly ? 'var(--color-critical)' : undefined
              }}
              onClick={() => {
                setFilterCriticalOnly(!filterCriticalOnly);
                setCurrentPage(1);
              }}
            >
              <AlertOctagon size={12} />
              <span>Critical Only</span>
            </button>

            <button
              className={`secondary-btn ${filterAnomalousOnly ? 'active' : ''}`}
              style={{
                fontSize: '11px',
                padding: '4px 8px',
                borderColor: filterAnomalousOnly ? 'var(--color-caution)' : undefined,
                color: filterAnomalousOnly ? 'var(--color-caution)' : undefined
              }}
              onClick={() => {
                setFilterAnomalousOnly(!filterAnomalousOnly);
                setCurrentPage(1);
              }}
            >
              <Radio size={12} />
              <span>Anomalies Only</span>
            </button>

            {/* View Mode Toggle */}
            <div style={{ display: 'flex', border: '1px solid var(--color-border)', borderRadius: '6px', overflow: 'hidden' }}>
              <button
                style={{
                  background: viewMode === 'cards' ? 'var(--color-surface-hover)' : 'var(--color-bg)',
                  border: 'none',
                  color: viewMode === 'cards' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  padding: '5px 8px',
                  cursor: 'pointer'
                }}
                onClick={() => setViewMode('cards')}
                title="Tactical Cards View"
              >
                <LayoutGrid size={14} />
              </button>
              <button
                style={{
                  background: viewMode === 'table' ? 'var(--color-surface-hover)' : 'var(--color-bg)',
                  border: 'none',
                  color: viewMode === 'table' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  padding: '5px 8px',
                  cursor: 'pointer'
                }}
                onClick={() => setViewMode('table')}
                title="Compact Table View"
              >
                <List size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Content Area: Loading, Error, Empty, Cards or Table */}
      {loading ? (
        <LoadingState
          message="Loading Fleet Assets from Neon PostgreSQL..."
          subtext="Retrieving real-time readiness status, critical component tallies, and HUMS telemetry indicators"
          minHeight="320px"
        />
      ) : error ? (
        <div className="error-card" style={{ padding: '24px', backgroundColor: 'var(--color-bg-subtle)', borderRadius: '8px', border: '1px solid var(--color-danger-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-danger)', marginBottom: '8px' }}>
            <AlertOctagon size={20} />
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Connection Error</h3>
          </div>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', margin: '0 0 16px' }}>{error}</p>
          <button className="primary-btn" onClick={fetchFleetData}>
            <RefreshCw size={14} />
            <span>Retry Connection</span>
          </button>
        </div>
      ) : filteredAssets.length === 0 ? (
        <EmptyState
          title="No Assets Match Filter"
          description="No fleet assets match your search criteria. Clear filters to see all assets."
          icon={Shield}
          actionText="Reset Filters"
          onAction={() => {
            setSearchQuery('');
            setStatusFilter('');
            setFilterCriticalOnly(false);
            setFilterAnomalousOnly(false);
            setCurrentPage(1);
          }}
        />
      ) : viewMode === 'cards' ? (
        /* Tactical Card Grid Layout */
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '16px',
          marginBottom: '20px'
        }}>
          {paginatedAssets.map((asset) => {
            const hasCrit = (asset.critical_component_count || 0) > 0;
            const hasHigh = (asset.high_priority_component_count || 0) > 0;
            const hasAnom = (asset.anomalous_component_count || 0) > 0;

            const directiveText = asset.status === 'READY'
              ? 'Operational envelope nominal. Cleared for sortie deployment.'
              : asset.status === 'ATTENTION'
                ? 'Elevated sensor deviation. Pre-flight inspection recommended.'
                : 'Immediate ground hold. Critical subsystem failure risk detected.';

            return (
              <div
                key={asset.asset_id}
                className="sentinel-card hoverable"
                onClick={() => onInspectAsset && onInspectAsset(asset.asset_id)}
                style={{
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '16px',
                  backgroundColor: 'var(--color-surface)',
                  border: hasCrit ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--color-border)',
                  borderRadius: '8px',
                  transition: 'all 0.15s ease'
                }}
              >
                <div>
                  {/* Top Bar: Asset Code + Status */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        fontFamily: 'var(--font-family-mono)',
                        fontSize: '16px',
                        fontWeight: 700,
                        color: 'var(--color-text)',
                        letterSpacing: '0.04em'
                      }}>
                        {asset.asset_id}
                      </span>
                      <span style={{
                        fontSize: '11px',
                        color: 'var(--color-text-muted)',
                        backgroundColor: 'var(--color-bg)',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        border: '1px solid var(--color-border)'
                      }}>
                        {asset.asset_type || 'Ground Vehicle'}
                      </span>
                    </div>
                    <StatusBadge status={asset.status} size="sm" />
                  </div>

                  {/* Asset Name */}
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '14px' }}>
                    {asset.asset_name || `Tactical Asset ${asset.asset_id}`}
                  </div>

                  {/* Operational Metrics Hierarchy */}
                  <div style={{
                    backgroundColor: 'var(--color-bg)',
                    borderRadius: '6px',
                    padding: '10px 12px',
                    border: '1px solid var(--color-border)',
                    marginBottom: '12px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '12px' }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>Subsystems Monitored:</span>
                      <span style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 600, color: 'var(--color-text)' }}>
                        4 Total
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '12px' }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>Sensor Deviations:</span>
                      <span style={{
                        fontFamily: 'var(--font-family-mono)',
                        fontWeight: 600,
                        color: hasAnom ? 'var(--color-caution)' : 'var(--color-text-muted)'
                      }}>
                        {asset.anomalous_component_count || 0} Anomalous
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>Maintenance Priority:</span>
                      <span style={{
                        fontFamily: 'var(--font-family-mono)',
                        fontWeight: 700,
                        color: hasCrit ? 'var(--color-critical)' : (hasHigh ? '#f97316' : 'var(--color-ready)')
                      }}>
                        {hasCrit ? `${asset.critical_component_count} Critical` : (hasHigh ? `${asset.high_priority_component_count} High Priority` : 'Low / Nominal')}
                      </span>
                    </div>
                  </div>

                  {/* Directive Summary */}
                  <div style={{
                    fontSize: '11px',
                    lineHeight: '1.4',
                    color: hasCrit ? 'var(--color-critical)' : 'var(--color-text-muted)',
                    backgroundColor: hasCrit ? 'rgba(239, 68, 68, 0.06)' : 'transparent',
                    padding: hasCrit ? '6px 8px' : '0',
                    borderRadius: '4px',
                    marginBottom: '12px'
                  }}>
                    {directiveText}
                  </div>
                </div>

                {/* Card Action Row */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: '10px',
                  borderTop: '1px solid var(--color-border)'
                }}>
                  <span style={{ fontSize: '11px', fontFamily: 'var(--font-family-mono)', color: 'var(--color-text-muted)' }}>
                    {asset.calculated_at ? new Date(asset.calculated_at).toLocaleTimeString() : 'Active'}
                  </span>

                  <button
                    className="secondary-btn"
                    style={{ height: '28px', padding: '0 10px', fontSize: '11px' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onInspectAsset && onInspectAsset(asset.asset_id);
                    }}
                  >
                    <Eye size={12} />
                    <span>Inspect Diagnostics</span>
                    <ChevronRight size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Compact Matrix Table View */
        <div className="sentinel-card" style={{ padding: '0', overflow: 'hidden', marginBottom: '20px' }}>
          <div className="table-wrapper">
            <table className="sentinel-table">
              <thead>
                <tr>
                  <th>Asset ID</th>
                  <th>Asset Name</th>
                  <th>Classification</th>
                  <th>Operational Status</th>
                  <th>Critical Subsystems</th>
                  <th>High Priority</th>
                  <th>Anomalies</th>
                  <th>Last Evaluated</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedAssets.map((asset) => {
                  const hasCrit = (asset.critical_component_count || 0) > 0;
                  const hasHigh = (asset.high_priority_component_count || 0) > 0;
                  const hasAnom = (asset.anomalous_component_count || 0) > 0;

                  return (
                    <tr
                      key={asset.asset_id}
                      onClick={() => onInspectAsset && onInspectAsset(asset.asset_id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>
                        <strong style={{ fontFamily: 'var(--font-family-mono)', color: 'var(--color-text)', fontSize: '14px' }}>
                          {asset.asset_id}
                        </strong>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600 }}>{asset.asset_name}</span>
                      </td>
                      <td>
                        <span style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>{asset.asset_type}</span>
                      </td>
                      <td>
                        <StatusBadge status={asset.status} size="sm" />
                      </td>
                      <td>
                        <span style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 700, color: hasCrit ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>
                          {asset.critical_component_count || 0}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 700, color: hasHigh ? '#f97316' : 'var(--color-text-muted)' }}>
                          {asset.high_priority_component_count || 0}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 700, color: hasAnom ? 'var(--color-warning)' : 'var(--color-text-muted)' }}>
                          {asset.anomalous_component_count || 0}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '11px', fontFamily: 'var(--font-family-mono)', color: 'var(--color-text-muted)' }}>
                          {asset.calculated_at ? new Date(asset.calculated_at).toLocaleTimeString() : '--'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="secondary-btn"
                          style={{ height: '28px', padding: '0 10px', fontSize: '11px' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onInspectAsset && onInspectAsset(asset.asset_id);
                          }}
                        >
                          <Eye size={12} />
                          <span>Inspect</span>
                          <ChevronRight size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Pagination Bar */}
      {filteredAssets.length > pageSize && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          border: '1px solid var(--color-border)',
          borderRadius: '6px',
          backgroundColor: 'var(--color-surface)',
          marginTop: '12px'
        }}>
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
            Showing {((currentPage - 1) * pageSize) + 1} &ndash; {Math.min(currentPage * pageSize, totalCount)} of {totalCount} assets
          </span>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="secondary-btn"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              style={{ padding: '4px 10px', fontSize: '12px' }}
            >
              <ChevronLeft size={14} />
              <span>Previous</span>
            </button>
            <span style={{ display: 'flex', alignItems: 'center', padding: '0 8px', fontSize: '12px', fontFamily: 'var(--font-family-mono)' }}>
              {currentPage} / {totalPages}
            </span>
            <button
              className="secondary-btn"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              style={{ padding: '4px 10px', fontSize: '12px' }}
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
