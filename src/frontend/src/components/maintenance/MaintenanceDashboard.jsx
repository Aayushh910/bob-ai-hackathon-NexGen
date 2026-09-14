import React, { useState, useEffect, useCallback } from 'react';
import {
  Wrench,
  AlertTriangle,
  AlertOctagon,
  Clock,
  CheckCircle2,
  RefreshCw,
  Search,
  Filter,
  Layers,
  ChevronRight,
  ChevronLeft,
  Eye,
  Plus
} from 'lucide-react';
import {
  getFleetMaintenanceSummary,
  getMaintenanceQueue,
  listMaintenanceRecords,
} from '../../api/maintenance';
import { PageHeader, KpiCard, RiskBadge, StatusBadge, LoadingSkeleton, EmptyState, LoadingSpinner, LoadingState } from '../common/UIComponents';
import AssetMaintenanceModal from './AssetMaintenanceModal';

export default function MaintenanceDashboard() {
  const [summary, setSummary] = useState(null);
  const [queue, setQueue] = useState([]);
  const [records, setRecords] = useState([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [priorityFilter, setPriorityFilter] = useState('');
  const [queuePage, setQueuePage] = useState(1);
  const queuePageSize = 10;
  const [recordsPage, setRecordsPage] = useState(1);
  const pageSize = 10;

  // Selected Asset for Maintenance Modal
  const [selectedAssetId, setSelectedAssetId] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sumData, queueData, recsData] = await Promise.all([
        getFleetMaintenanceSummary(),
        getMaintenanceQueue({ priority: priorityFilter || undefined }),
        listMaintenanceRecords({
          page: recordsPage,
          page_size: pageSize,
        }),
      ]);
      setSummary(sumData);
      setQueue(queueData?.items || queueData || []);
      setRecords(recsData?.items || []);
      setTotalRecords(recsData?.total || 0);
    } catch (err) {
      console.error('Failed to load maintenance data:', err);
      setError(err.message || 'Unable to retrieve maintenance records.');
    } finally {
      setLoading(false);
    }
  }, [priorityFilter, recordsPage]);

  useEffect(() => {
    loadData();

    const handleUpdate = () => {
      loadData();
    };
    window.addEventListener('sentinel:data-updated', handleUpdate);
    return () => window.removeEventListener('sentinel:data-updated', handleUpdate);
  }, [loadData]);

  const totalPages = Math.ceil(totalRecords / pageSize) || 1;
  const totalQueuePages = Math.ceil(queue.length / queuePageSize) || 1;
  const paginatedQueue = queue.slice((queuePage - 1) * queuePageSize, queuePage * queuePageSize);

  return (
    <div className="maintenance-view-container">
      {/* 1. Page Header */}
      <PageHeader
        badgeText="Depot Operations & Maintenance"
        badgeIcon={Wrench}
        title="Predictive Maintenance & Intervention Queue"
        subtitle="Automated priority service scheduling, technician directives, and historical intervention logs."
        actions={
          <button
            className="secondary-btn"
            onClick={loadData}
            disabled={loading}
            title="Refresh Maintenance Schedule"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        }
      />

      {/* 2. KPI Grid (4 Columns, compact) */}
      <div className="grid-kpi">
        <KpiCard
          title="Total Service Due"
          value={summary?.total_due_count ?? summary?.total_pending ?? queue.length}
          subtitle="Assets flagged for intervention"
          icon={Wrench}
          variant="default"
          trend={{ direction: 'flat', value: 'Depot capacity nominal' }}
          loading={loading}
        />
        <KpiCard
          title="Critical Interventions"
          value={summary?.critical_count ?? queue.filter((q) => q.priority === 'CRITICAL').length}
          subtitle="Immediate ground hold required"
          icon={AlertOctagon}
          variant="critical"
          trend={{ direction: 'flat', value: 'Action required' }}
          loading={loading}
        />
        <KpiCard
          title="High Priority Due"
          value={summary?.high_count ?? queue.filter((q) => q.priority === 'HIGH').length}
          subtitle="Schedule within 48 hours"
          icon={AlertTriangle}
          variant="caution"
          trend={{ direction: 'down', value: '-2 completed' }}
          loading={loading}
        />
        <KpiCard
          title="Completed Services"
          value={summary?.completed_count ?? totalRecords}
          subtitle="Historical service records"
          icon={CheckCircle2}
          variant="ready"
          trend={{ direction: 'up', value: 'Logged in database' }}
          loading={loading}
        />
      </div>

      {/* 3. Priority Intervention Queue (Table Container) */}
      <div className="sentinel-card" style={{ marginBottom: '24px' }}>
        <div className="card-header-row">
          <div>
            <h2 className="card-title">Priority Intervention Queue</h2>
            <p className="card-subtitle">Automated work orders generated from predictive telemetry degradation</p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <select
              className="filter-select"
              style={{ height: '34px', fontSize: '12px' }}
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value);
                setQueuePage(1);
              }}
            >
              <option value="">All Priorities</option>
              <option value="CRITICAL">Critical Only</option>
              <option value="HIGH">High Only</option>
              <option value="MEDIUM">Medium Only</option>
            </select>
          </div>
        </div>

        {loading ? (
          <LoadingState
            message="Compiling Maintenance Queue & Work Orders..."
            subtext="Cross-referencing telemetry degradation curves with scheduled depot intervals."
            size="lg"
            minHeight="220px"
          />
        ) : queue.length === 0 ? (
          <EmptyState
            title="Maintenance Queue Clear"
            description="No assets are currently flagged for urgent service or intervention."
            icon={CheckCircle2}
          />
        ) : (
          <div className="table-wrapper">
            <table className="sentinel-table">
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Priority</th>
                  <th>Subsystem / Issue</th>
                  <th>Predicted Horizon</th>
                  <th>Action Directive</th>
                  <th style={{ textAlign: 'right' }}>Service Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedQueue.map((item, idx) => (
                  <tr key={idx}>
                    <td>
                      <strong style={{ fontFamily: 'var(--font-family-mono)', color: 'var(--color-text)' }}>
                        {item.asset_code || `Asset #${item.asset_id}`}
                      </strong>
                    </td>
                    <td>
                      <RiskBadge risk={item.priority || 'HIGH'} size="sm" />
                    </td>
                    <td>
                      <span style={{ fontWeight: 500 }}>{item.component || item.component_type || 'Engine Subsystem'}</span>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                        {item.failure_mode || item.issue || 'Thermal variance'}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-family-mono)', color: item.priority === 'CRITICAL' ? 'var(--color-danger)' : 'var(--color-text)' }}>
                        {item.due_horizon || (item.rul_hours ? `${item.rul_hours.toFixed(0)} hrs` : 'Immediate')}
                      </span>
                    </td>
                    <td style={{ maxWidth: '300px' }}>
                      <span
                        style={{
                          fontSize: '12px',
                          color: 'var(--color-text-secondary)',
                          display: 'inline-block',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: '300px',
                        }}
                        title={item.directive || item.description || 'Perform depot maintenance'}
                      >
                        {item.directive || item.description || 'Perform depot diagnostic and calibration.'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="primary-btn"
                        style={{ height: '30px', padding: '0 12px', fontSize: '12px' }}
                        onClick={() => setSelectedAssetId(item.asset_id)}
                      >
                        <Wrench size={13} />
                        <span>Log Service</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Fixed 10 Rows Pagination for Priority Queue */}
        {!loading && queue.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--color-border)' }}>
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              Showing {Math.min((queuePage - 1) * queuePageSize + 1, queue.length)} - {Math.min(queuePage * queuePageSize, queue.length)} of {queue.length} items (10 per page)
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="secondary-btn"
                style={{ height: '30px', padding: '0 10px', fontSize: '12px' }}
                disabled={queuePage <= 1}
                onClick={() => setQueuePage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft size={14} />
                <span>Previous</span>
              </button>
              <button
                className="secondary-btn"
                style={{ height: '30px', padding: '0 10px', fontSize: '12px' }}
                disabled={queuePage >= totalQueuePages}
                onClick={() => setQueuePage((p) => Math.min(totalQueuePages, p + 1))}
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. Historical Maintenance Records */}
      <div className="sentinel-card">
        <div className="card-header-row">
          <div>
            <h2 className="card-title">Historical Intervention Log</h2>
            <p className="card-subtitle">Permanent audit trail of completed and in-progress maintenance records</p>
          </div>
        </div>

        {loading ? (
          <LoadingState
            message="Querying Historical Maintenance Records..."
            subtext="Retrieving audited work orders and depot repair logs."
            size="md"
            minHeight="180px"
          />
        ) : records.length === 0 ? (
          <EmptyState
            title="No Historical Records"
            description="No past maintenance work orders recorded in database."
            icon={CheckCircle2}
          />
        ) : (
          <div className="table-wrapper">
            <table className="sentinel-table">
              <thead>
                <tr>
                  <th>Record ID</th>
                  <th>Asset</th>
                  <th>Component</th>
                  <th>Maintenance Type</th>
                  <th>Technician</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontFamily: 'var(--font-family-mono)', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                      #{r.id}
                    </td>
                    <td>
                      <strong style={{ fontFamily: 'var(--font-family-mono)' }}>{r.asset_code || `Asset #${r.asset_id}`}</strong>
                    </td>
                    <td>{r.component_type || 'General'}</td>
                    <td>{r.maintenance_type || 'Scheduled'}</td>
                    <td style={{ color: 'var(--color-text-secondary)' }}>{r.performed_by || 'Depot Lead'}</td>
                    <td><StatusBadge status={r.status || 'COMPLETED'} size="sm" /></td>
                    <td style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                      {r.created_at ? new Date(r.created_at).toLocaleDateString() : '--'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
            Showing page {recordsPage} of {totalPages}
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="secondary-btn"
              style={{ height: '30px', padding: '0 10px', fontSize: '12px' }}
              disabled={recordsPage <= 1}
              onClick={() => setRecordsPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft size={14} />
              <span>Previous</span>
            </button>
            <button
              className="secondary-btn"
              style={{ height: '30px', padding: '0 10px', fontSize: '12px' }}
              disabled={recordsPage >= totalPages}
              onClick={() => setRecordsPage((p) => Math.min(totalPages, p + 1))}
            >
              <span>Next</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Asset Maintenance Modal */}
      {selectedAssetId && (
        <AssetMaintenanceModal
          assetId={selectedAssetId}
          onClose={() => {
            setSelectedAssetId(null);
            loadData();
          }}
          onSuccess={() => {
            setSelectedAssetId(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}
