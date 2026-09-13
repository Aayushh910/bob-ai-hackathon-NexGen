import React, { useState, useEffect, useCallback } from 'react';
import {
  Wrench,
  AlertTriangle,
  AlertOctagon,
  Clock,
  Cpu,
  CheckCircle2,
  RefreshCw,
  Search,
  Filter,
  Layers,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  SlidersHorizontal,
  FileText
} from 'lucide-react';
import {
  getFleetMaintenanceSummary,
  getMaintenanceQueue,
  listMaintenanceRecords
} from '../../api/maintenance';
import AssetMaintenanceModal from './AssetMaintenanceModal';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorMessage from '../common/ErrorMessage';

export default function MaintenanceDashboard() {
  const [summary, setSummary] = useState(null);
  const [queue, setQueue] = useState([]);
  const [records, setRecords] = useState([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Queue Priority Filter
  const [selectedPriority, setSelectedPriority] = useState('');

  // Historical Records Filters & Pagination
  const [recordsPage, setRecordsPage] = useState(1);
  const recordsPageSize = 10;
  const [selectedComponent, setSelectedComponent] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Modal inspection
  const [selectedAssetId, setSelectedAssetId] = useState(null);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sumData, queueData, recsData] = await Promise.all([
        getFleetMaintenanceSummary(),
        getMaintenanceQueue({ priority: selectedPriority || undefined }),
        listMaintenanceRecords({
          component_type: selectedComponent || undefined,
          maintenance_type: selectedType || undefined,
          status: selectedStatus || undefined,
          page: recordsPage,
          page_size: recordsPageSize,
        }),
      ]);

      setSummary(sumData);
      setQueue(queueData || []);
      setRecords(recsData.items || []);
      setTotalRecords(recsData.total || 0);
    } catch (err) {
      setError(err.message || 'Failed to load maintenance intelligence dashboard.');
    } finally {
      setLoading(false);
    }
  }, [selectedPriority, selectedComponent, selectedType, selectedStatus, recordsPage]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleMaintenanceCompleted = () => {
    // Refresh fleet dashboard data when maintenance is completed in modal
    loadDashboardData();
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'CRITICAL':
        return <span className="status-badge badge-critical">CRITICAL</span>;
      case 'HIGH':
        return <span className="status-badge badge-caution">HIGH</span>;
      case 'MEDIUM':
        return <span className="status-badge badge-medium">MEDIUM</span>;
      case 'LOW':
      default:
        return <span className="status-badge badge-ready">LOW</span>;
    }
  };

  const getDueStatusBadge = (due) => {
    switch (due) {
      case 'URGENT':
        return <span className="badge-micro badge-critical">URGENT</span>;
      case 'OVERDUE':
        return <span className="badge-micro badge-critical">OVERDUE</span>;
      case 'DUE':
        return <span className="badge-micro badge-caution">DUE</span>;
      case 'UPCOMING':
        return <span className="badge-micro badge-medium">UPCOMING</span>;
      default:
        return <span className="badge-micro badge-ready">NOT DUE</span>;
    }
  };

  return (
    <div className="maintenance-dashboard-container">
      {/* Top Banner / Navigation Header */}
      <div className="dashboard-header">
        <div>
          <div className="title-row">
            <div className="icon-header-glow">
              <Wrench size={24} className="text-cyan" />
            </div>
            <h1 className="dashboard-title">Predictive Maintenance & Intervention Planning</h1>
          </div>
          <p className="dashboard-subtitle">
            Autonomous intervention prioritization, component-level distress diagnostics, and post-service readiness reassessment
          </p>
        </div>

        <div className="header-actions">
          <button
            onClick={loadDashboardData}
            disabled={loading}
            className="btn-refresh"
            title="Refresh Maintenance Data"
          >
            <RefreshCw size={16} className={loading ? 'spin-icon' : ''} />
            <span>Refresh Fleet</span>
          </button>
        </div>
      </div>

      {error && <ErrorMessage message={error} onRetry={loadDashboardData} />}

      {/* Fleet KPI Metric Cards */}
      <div className="kpi-grid">
        <div className="kpi-card glassmorphism">
          <div className="kpi-header">
            <span className="kpi-title">Assets Requiring Service</span>
            <AlertTriangle size={18} className="text-caution" />
          </div>
          <div className="kpi-value">
            {summary ? summary.total_assets_requiring_maintenance : '--'}
          </div>
          <div className="kpi-subtext">Active fleet intervention threshold</div>
        </div>

        <div className="kpi-card glassmorphism">
          <div className="kpi-header">
            <span className="kpi-title">Critical Urgency</span>
            <AlertOctagon size={18} className="text-danger" />
          </div>
          <div className="kpi-value text-danger">
            {summary ? summary.critical_interventions : '--'}
          </div>
          <div className="kpi-subtext">Depot grounding or severe RUL breach</div>
        </div>

        <div className="kpi-card glassmorphism">
          <div className="kpi-header">
            <span className="kpi-title">High Priority Queue</span>
            <Clock size={18} className="text-caution" />
          </div>
          <div className="kpi-value text-caution">
            {summary ? summary.high_priority_interventions : '--'}
          </div>
          <div className="kpi-subtext">48h inspection or active anomalies</div>
        </div>

        <div className="kpi-card glassmorphism">
          <div className="kpi-header">
            <span className="kpi-title">Due & Overdue Intervals</span>
            <Wrench size={18} className="text-cyan" />
          </div>
          <div className="kpi-value text-cyan">
            {summary ? `${summary.due_count + summary.overdue_count}` : '--'}
          </div>
          <div className="kpi-subtext">
            {summary ? `${summary.overdue_count} overdue, ${summary.due_count} due` : 'Evaluating...'}
          </div>
        </div>

        <div className="kpi-card glassmorphism">
          <div className="kpi-header">
            <span className="kpi-title">Most Serviced Subsystem</span>
            <Cpu size={18} className="text-accent" />
          </div>
          <div className="kpi-value text-accent" style={{ fontSize: '1.4rem' }}>
            {summary ? summary.most_serviced_component || 'Engine' : '--'}
          </div>
          <div className="kpi-subtext">Historical maintenance frequency</div>
        </div>

        <div className="kpi-card glassmorphism">
          <div className="kpi-header">
            <span className="kpi-title">Historical Work Logs</span>
            <FileText size={18} className="text-muted" />
          </div>
          <div className="kpi-value">
            {summary ? summary.total_historical_records : '--'}
          </div>
          <div className="kpi-subtext">Verified PostgreSQL logs</div>
        </div>
      </div>

      {/* Main Content Area: Prioritized Intervention Queue */}
      <div className="dashboard-section-panel glassmorphism">
        <div className="section-panel-header">
          <div className="panel-title-wrap">
            <AlertOctagon size={20} className="text-cyan" />
            <div>
              <h2 className="panel-title">Fleet Maintenance Intervention Queue</h2>
              <p className="panel-subtitle">
                Ranked by operational urgency to direct ground support crews and depot specialists
              </p>
            </div>
          </div>

          {/* Priority filter pills */}
          <div className="filter-pill-group">
            <button
              className={`filter-pill ${selectedPriority === '' ? 'active' : ''}`}
              onClick={() => setSelectedPriority('')}
            >
              All Assets ({queue.length})
            </button>
            <button
              className={`filter-pill pill-critical ${selectedPriority === 'CRITICAL' ? 'active' : ''}`}
              onClick={() => setSelectedPriority('CRITICAL')}
            >
              Critical
            </button>
            <button
              className={`filter-pill pill-high ${selectedPriority === 'HIGH' ? 'active' : ''}`}
              onClick={() => setSelectedPriority('HIGH')}
            >
              High Priority
            </button>
            <button
              className={`filter-pill pill-medium ${selectedPriority === 'MEDIUM' ? 'active' : ''}`}
              onClick={() => setSelectedPriority('MEDIUM')}
            >
              Medium
            </button>
            <button
              className={`filter-pill pill-low ${selectedPriority === 'LOW' ? 'active' : ''}`}
              onClick={() => setSelectedPriority('LOW')}
            >
              Routine
            </button>
          </div>
        </div>

        {/* Priority Intervention Table */}
        <div className="table-responsive">
          <table className="sentinel-table">
            <thead>
              <tr>
                <th>Priority</th>
                <th>Asset Code</th>
                <th>Model / Base</th>
                <th>Due Status</th>
                <th>Target Subsystem</th>
                <th>Prognostics (RUL / Risk)</th>
                <th>Prescribed Action Directive</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && queue.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-5">
                    <LoadingSpinner />
                    <p className="text-muted mt-2">Prioritizing fleet maintenance requirements...</p>
                  </td>
                </tr>
              ) : queue.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-5 text-muted">
                    No assets matching priority filter: {selectedPriority || 'All'}.
                  </td>
                </tr>
              ) : (
                queue.map((item) => (
                  <tr
                    key={item.asset_id}
                    className={`queue-row ${item.priority === 'CRITICAL' ? 'row-critical-border' : ''}`}
                  >
                    <td>{getPriorityBadge(item.priority)}</td>
                    <td>
                      <strong className="asset-code-link" onClick={() => setSelectedAssetId(item.asset_id)}>
                        {item.asset_code}
                      </strong>
                    </td>
                    <td>
                      <span className="text-muted">{item.model}</span>
                      <div className="location-micro">{item.location}</div>
                    </td>
                    <td>{getDueStatusBadge(item.due_status)}</td>
                    <td>
                      <span className="target-component-chip">
                        <Cpu size={14} className="text-accent" />
                        <span>{item.target_component}</span>
                      </span>
                    </td>
                    <td>
                      <div className="prognostics-cell">
                        <span className="rul-tag">
                          RUL: <strong>{item.rul_hours ? `${item.rul_hours.toFixed(1)}h` : 'Nominal'}</strong>
                        </span>
                        <span className={`risk-tag ${item.failure_probability >= 0.5 ? 'text-danger' : 'text-success'}`}>
                          Risk: {(item.failure_probability * 100).toFixed(1)}%
                        </span>
                        {item.is_anomaly && (
                          <span className="anomaly-warning-micro">Active Anomaly</span>
                        )}
                      </div>
                    </td>
                    <td className="action-directive-cell">
                      <p className="directive-snippet" title={item.recommended_action}>
                        {item.recommended_action}
                      </p>
                    </td>
                    <td className="text-right">
                      <button
                        className="btn-action-service"
                        onClick={() => setSelectedAssetId(item.asset_id)}
                      >
                        <Wrench size={14} />
                        <span>Service Asset</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Historical Maintenance Logs Explorer */}
      <div className="dashboard-section-panel glassmorphism mt-4">
        <div className="section-panel-header">
          <div className="panel-title-wrap">
            <Layers size={20} className="text-cyan" />
            <div>
              <h2 className="panel-title">Historical Maintenance Records Database</h2>
              <p className="panel-subtitle">
                Complete audit trail of inspections, component overhauls, parts replaced, and technician actions
              </p>
            </div>
          </div>

          {/* Filtering Controls */}
          <div className="table-filter-bar">
            <select
              value={selectedComponent}
              onChange={(e) => {
                setSelectedComponent(e.target.value);
                setRecordsPage(1);
              }}
              className="filter-select"
            >
              <option value="">All Components</option>
              <option value="Engine">Engine</option>
              <option value="Hydraulic System">Hydraulic System</option>
              <option value="Fuel Pump">Fuel Pump</option>
              <option value="Battery">Battery</option>
            </select>

            <select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                setRecordsPage(1);
              }}
              className="filter-select"
            >
              <option value="">All Types</option>
              <option value="Inspection">Inspection</option>
              <option value="Corrective">Corrective</option>
              <option value="Preventive">Preventive</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setRecordsPage(1);
              }}
              className="filter-select"
            >
              <option value="">All Statuses</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="PLANNED">PLANNED</option>
              <option value="IDENTIFIED">IDENTIFIED</option>
            </select>
          </div>
        </div>

        {/* Historical Table */}
        <div className="table-responsive">
          <table className="sentinel-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Asset ID</th>
                <th>Component</th>
                <th>Type</th>
                <th>Condition</th>
                <th>Parts Replaced</th>
                <th>Failure Occurred</th>
                <th>Technician</th>
                <th>Cost</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-4 text-muted">
                    No historical maintenance records found matching filters.
                  </td>
                </tr>
              ) : (
                records.map((rec) => (
                  <tr key={rec.id}>
                    <td>{new Date(rec.maintenance_date).toLocaleDateString()}</td>
                    <td>
                      <button
                        className="btn-link-clean"
                        onClick={() => setSelectedAssetId(rec.asset_id)}
                      >
                        Asset #{rec.asset_id}
                      </button>
                    </td>
                    <td>
                      <strong>{rec.component_type}</strong>
                    </td>
                    <td>
                      <span className="badge-type">{rec.maintenance_type}</span>
                    </td>
                    <td>
                      <span className={`badge-condition condition-${(rec.component_condition || 'good').toLowerCase()}`}>
                        {rec.component_condition || 'Good'}
                      </span>
                    </td>
                    <td>{rec.parts_replaced || 'None'}</td>
                    <td>
                      {rec.failure_occurred ? (
                        <span className="text-danger font-weight-bold">Yes ({rec.failure_type})</span>
                      ) : (
                        <span className="text-muted">No</span>
                      )}
                    </td>
                    <td>{rec.technician || 'Staff Tech'}</td>
                    <td>{rec.cost ? `$${rec.cost.toFixed(0)}` : '--'}</td>
                    <td>
                      <span className="badge-status-completed">{rec.maintenance_status}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="pagination-bar">
          <span className="text-muted">
            Showing records {(recordsPage - 1) * recordsPageSize + 1} -{' '}
            {Math.min(recordsPage * recordsPageSize, totalRecords)} of {totalRecords}
          </span>
          <div className="pagination-controls">
            <button
              disabled={recordsPage <= 1}
              onClick={() => setRecordsPage((p) => Math.max(1, p - 1))}
              className="btn-pagination"
            >
              Previous
            </button>
            <span className="page-indicator">Page {recordsPage}</span>
            <button
              disabled={recordsPage * recordsPageSize >= totalRecords}
              onClick={() => setRecordsPage((p) => p + 1)}
              className="btn-pagination"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Asset Maintenance Intervention Modal */}
      {selectedAssetId && (
        <AssetMaintenanceModal
          assetId={selectedAssetId}
          onClose={() => setSelectedAssetId(null)}
          onMaintenanceCompleted={handleMaintenanceCompleted}
        />
      )}
    </div>
  );
}
