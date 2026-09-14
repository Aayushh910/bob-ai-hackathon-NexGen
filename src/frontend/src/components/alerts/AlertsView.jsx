import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Search,
  RefreshCw,
  Clock,
  Activity,
  Check,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import { getFleetAnomalies } from '../../api/ml';
import { getRecommendations, updateRecommendationStatus } from '../../api/readiness';
import { PageHeader, KpiCard, StatusBadge, RiskBadge, LoadingSkeleton, EmptyState, LoadingSpinner, LoadingState } from '../common/UIComponents';
import AssetDetailModal from '../fleet/AssetDetailModal';

export default function AlertsView() {
  const [anomalies, setAnomalies] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAssetModal, setSelectedAssetModal] = useState(null);
  const [actionInProgress, setActionInProgress] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [anomRes, recRes] = await Promise.allSettled([
        getFleetAnomalies({ limit: 50 }),
        getRecommendations({ limit: 50 })
      ]);

      if (anomRes.status === 'fulfilled') {
        setAnomalies(anomRes.value?.items || []);
      }
      if (recRes.status === 'fulfilled') {
        setRecommendations(recRes.value?.items || []);
      }
    } catch (err) {
      console.error('Failed to load alert directives:', err);
      setError(err.message || 'Unable to retrieve alert telemetry.');
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

  const handleUpdateStatus = async (recId, newStatus) => {
    setActionInProgress(recId);
    try {
      await updateRecommendationStatus(recId, newStatus);
      window.dispatchEvent(new CustomEvent('sentinel:data-updated'));
      await loadData();
    } catch (err) {
      console.error('Failed to update recommendation status:', err);
    } finally {
      setActionInProgress(null);
    }
  };

  const formatTimestamp = (ts) => {
    if (!ts) return 'Live Telemetry';
    const d = new Date(ts);
    if (isNaN(d.getTime())) return String(ts);
    const datePart = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    const timePart = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    return `${datePart} ${timePart}`;
  };

  // Combine recommendations and anomalies into a coherent operational alerts view (deduplicated)
  const combinedAlerts = [];
  const seenKeys = new Set();

  // 1. Process Operational Directives
  recommendations.forEach((rec) => {
    const rawTitle = rec.action_directive || rec.recommendation || 'Operational Intervention Directive';
    const rawDesc = rec.rationale || rec.reason || 'Depot engineering assessment requested based on ML telemetry failure forecast.';
    const dedupeKey = `rec-${rec.asset_id}-${rec.priority}-${rawTitle.trim().toLowerCase()}`;
    
    if (seenKeys.has(dedupeKey)) return;
    seenKeys.add(dedupeKey);

    combinedAlerts.push({
      id: `rec-${rec.id}`,
      recId: rec.id,
      type: 'Operational Directive',
      asset_id: rec.asset_id,
      asset_code: rec.asset_code || `Asset #${rec.asset_id}`,
      severity: rec.priority || 'MEDIUM',
      title: rawTitle,
      description: rawDesc,
      status: rec.status || 'OPEN',
      timestamp: rec.generated_at || rec.created_at,
      isRecommendation: true
    });
  });

  // 2. Process Telemetry Anomalies
  anomalies.forEach((anom) => {
    const componentName = anom.component_id || 'Telemetry Subsystem';
    const dedupeKey = `anom-${anom.asset_id}-${componentName.trim().toLowerCase()}-${anom.severity}`;

    if (seenKeys.has(dedupeKey)) return;
    seenKeys.add(dedupeKey);

    combinedAlerts.push({
      id: `anom-${anom.id}`,
      anomId: anom.id,
      type: 'Sensor Anomaly',
      asset_id: anom.asset_id,
      asset_code: anom.asset_code || `Asset #${anom.asset_id}`,
      severity: anom.severity || 'CRITICAL',
      title: `${componentName} Variance Limit Exceeded`,
      description: anom.description || `Sensor signal variance exceeded statistical sigma threshold limit.`,
      status: anom.is_active ? 'OPEN' : 'RESOLVED',
      timestamp: anom.detected_at,
      isRecommendation: false
    });
  });

  const filteredAlerts = combinedAlerts.filter((item) => {
    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
    const matchesSeverity = !severityFilter || item.severity === severityFilter;
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      item.asset_code?.toLowerCase().includes(q) ||
      item.title?.toLowerCase().includes(q) ||
      item.description?.toLowerCase().includes(q);
    return matchesStatus && matchesSeverity && matchesSearch;
  });

  const openCount = combinedAlerts.filter((a) => a.status === 'OPEN').length;
  const criticalCount = combinedAlerts.filter((a) => a.severity === 'CRITICAL').length;
  const ackCount = combinedAlerts.filter((a) => a.status === 'ACKNOWLEDGED').length;

  return (
    <div className="alerts-container">
      <PageHeader
        badgeText="Centralized Operational Alert Center"
        badgeIcon={ShieldAlert}
        title="Alerts & Operational Directives"
        subtitle="Active sensor threshold breaches, HUMS anomaly alerts, and automated engineering mitigation directives."
        actions={
          <button className="secondary-btn" onClick={loadData} disabled={loading}>
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Refresh Alerts</span>
          </button>
        }
      />

      {/* KPI Cards (4 columns) */}
      <div className="grid-kpi">
        <KpiCard
          title="Active Operational Alerts"
          value={openCount}
          subtitle="Pending review or engineering triage"
          icon={AlertOctagon}
          variant="caution"
          loading={loading}
        />
        <KpiCard
          title="Critical Severities"
          value={criticalCount}
          subtitle="Potential grounding or component breach"
          icon={AlertTriangle}
          variant="critical"
          loading={loading}
        />
        <KpiCard
          title="Acknowledged Directives"
          value={ackCount}
          subtitle="Triage initiated by engineering crews"
          icon={Activity}
          variant="default"
          loading={loading}
        />
        <KpiCard
          title="Total Monitored Directives"
          value={combinedAlerts.length}
          subtitle="Full PostgreSQL audit trace"
          icon={CheckCircle2}
          variant="ready"
          loading={loading}
        />
      </div>

      {/* Search & Filter Bar */}
      <div className="filter-bar">
        <form className="search-form" onSubmit={(e) => e.preventDefault()}>
          <Search size={15} style={{ color: 'var(--color-text-muted)' }} />
          <input
            type="text"
            className="search-input"
            placeholder="Search by asset code, alert title, directive..."
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
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open Only</option>
            <option value="ACKNOWLEDGED">Acknowledged</option>
            <option value="RESOLVED">Resolved</option>
          </select>

          <select
            className="filter-select"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
          >
            <option value="">All Severities</option>
            <option value="CRITICAL">Critical Only</option>
            <option value="HIGH">High Only</option>
            <option value="MEDIUM">Medium Only</option>
          </select>

          {(statusFilter !== 'ALL' || severityFilter || searchTerm) && (
            <button
              className="secondary-btn"
              onClick={() => {
                setStatusFilter('ALL');
                setSeverityFilter('');
                setSearchTerm('');
              }}
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* 3. Alerts & Directives Table */}
      {loading ? (
        <div style={{ padding: '60px 0', display: 'flex', justifyContent: 'center' }}>
          <LoadingState
            message="Aggregating Directives & Telemetry Alerts..."
            subtext="Querying active sensor anomalies, threshold exceptions, and maintenance directives"
            size="lg"
          />
        </div>
      ) : filteredAlerts.length === 0 ? (
        <EmptyState
          title="No Alerts Found"
          description="No active alerts or directives match your current filter parameters."
          actionText="Reset Filters"
          onAction={() => {
            setStatusFilter('ALL');
            setSeverityFilter('');
            setSearchTerm('');
          }}
        />
      ) : (
        <div className="table-wrapper">
          <table className="sentinel-table">
            <thead>
              <tr>
                <th>Severity</th>
                <th>Asset Code</th>
                <th>Alert Type</th>
                <th>Directive / Description</th>
                <th>Status</th>
                <th>Detected Timestamp</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAlerts.map((alert) => (
                <tr key={alert.id}>
                  <td>
                    <RiskBadge risk={alert.severity} size="sm" />
                  </td>
                  <td>
                    <strong style={{ fontFamily: 'var(--font-family-mono)' }}>{alert.asset_code}</strong>
                  </td>
                  <td>
                    <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                      {alert.type}
                    </span>
                  </td>
                  <td style={{ maxWidth: '340px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text)' }}>
                      {alert.title}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                      {alert.description}
                    </div>
                  </td>
                  <td>
                    <StatusBadge status={alert.status} size="sm" />
                  </td>
                  <td style={{ fontSize: '12px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={13} />
                      <span style={{ fontFamily: 'var(--font-family-mono)' }}>{formatTimestamp(alert.timestamp)}</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      {alert.isRecommendation && alert.status === 'OPEN' && (
                        <button
                          className="secondary-btn"
                          style={{ height: '28px', fontSize: '11px', padding: '0 8px' }}
                          disabled={actionInProgress === alert.recId}
                          onClick={() => handleUpdateStatus(alert.recId, 'ACKNOWLEDGED')}
                        >
                          <Check size={12} />
                          <span>Acknowledge</span>
                        </button>
                      )}
                      {alert.isRecommendation && alert.status === 'ACKNOWLEDGED' && (
                        <button
                          className="primary-btn"
                          style={{ height: '28px', fontSize: '11px', padding: '0 8px' }}
                          disabled={actionInProgress === alert.recId}
                          onClick={() => handleUpdateStatus(alert.recId, 'RESOLVED')}
                        >
                          <CheckCircle2 size={12} />
                          <span>Resolve</span>
                        </button>
                      )}
                      <button
                        className="secondary-btn"
                        style={{ height: '28px', fontSize: '11px', padding: '0 8px' }}
                        onClick={() => setSelectedAssetModal({ id: alert.asset_id, asset_code: alert.asset_code })}
                      >
                        <span>Inspect</span>
                        <ChevronRight size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
