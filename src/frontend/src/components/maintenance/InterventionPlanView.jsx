import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Wrench,
  AlertOctagon,
  Clock,
  Cpu,
  RefreshCw,
  Plus,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { getMaintenanceQueue, generateInterventionPlan } from '../../api/maintenance';
import { PageHeader, KpiCard, StatusBadge, RiskBadge, LoadingSkeleton, EmptyState, LoadingSpinner, LoadingState } from '../common/UIComponents';
import AssetMaintenanceModal from './AssetMaintenanceModal';

export default function InterventionPlanView() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAssetId, setSelectedAssetId] = useState(null);
  const [planGeneratedNotice, setPlanGeneratedNotice] = useState(null);
  const [generatingForAsset, setGeneratingForAsset] = useState(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const totalPages = Math.ceil(queue.length / pageSize) || 1;
  const paginatedQueue = queue.slice((page - 1) * pageSize, page * pageSize);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMaintenanceQueue();
      setQueue(data || []);
    } catch (err) {
      console.error('Failed to load maintenance planning queue:', err);
      setError(err.message || 'Unable to retrieve maintenance planning queue.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQueue();

    const handleUpdate = () => {
      loadQueue();
    };
    window.addEventListener('sentinel:data-updated', handleUpdate);
    return () => window.removeEventListener('sentinel:data-updated', handleUpdate);
  }, [loadQueue]);

  const handleGeneratePlan = async (assetId, assetCode, e) => {
    e.stopPropagation();
    setGeneratingForAsset(assetId);
    setPlanGeneratedNotice(null);
    try {
      await generateInterventionPlan(assetId);
      setPlanGeneratedNotice(`Targeted intervention plan compiled for ${assetCode}.`);
      await loadQueue();
    } catch (err) {
      console.error('Failed to generate intervention plan:', err);
    } finally {
      setGeneratingForAsset(null);
    }
  };

  const urgentItems = queue.filter((q) => q.priority === 'CRITICAL' || q.due_status === 'OVERDUE');
  const routineItems = queue.filter((q) => q.priority !== 'CRITICAL' && q.due_status !== 'OVERDUE');

  return (
    <div className="planning-container">
      <PageHeader
        badgeText="Depot Resource Allocation & Planning"
        badgeIcon={Calendar}
        title="Intervention Planning & Depot Scheduling"
        subtitle="Automated sequencing of preventive overhauls, parts staging, and technician resource allocation."
        actions={
          <button className="secondary-btn" onClick={loadQueue} disabled={loading}>
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Recalculate Schedule</span>
          </button>
        }
      />

      {planGeneratedNotice && (
        <div style={{ padding: '8px 14px', backgroundColor: 'var(--color-success-dim)', border: '1px solid var(--color-success-border)', borderRadius: '6px', color: 'var(--color-success)', fontSize: '12px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={14} />
          <span>{planGeneratedNotice}</span>
        </div>
      )}

      {/* KPI Cards (4 columns) */}
      <div className="grid-kpi">
        <KpiCard
          title="Scheduled Interventions"
          value={queue.length}
          subtitle="Active depot servicing pipeline"
          icon={Calendar}
          variant="default"
          loading={loading}
        />
        <KpiCard
          title="Immediate Grounding Action"
          value={urgentItems.length}
          subtitle="Critical risk or overdue inspection"
          icon={AlertOctagon}
          variant="critical"
          loading={loading}
        />
        <KpiCard
          title="Routine Preventive Work"
          value={routineItems.length}
          subtitle="Operating within scheduled envelopes"
          icon={Wrench}
          variant="ready"
          loading={loading}
        />
        <KpiCard
          title="Depot Staging Status"
          value="Optimal"
          subtitle="Required components verified"
          icon={ShieldCheck}
          variant="ready"
          loading={loading}
        />
      </div>

      {/* Prioritized Planning Pipeline */}
      <div className="sentinel-card">
        <div className="card-header-row">
          <div>
            <h2 className="card-title">Active Depot Intervention Sequencing</h2>
            <p className="card-subtitle">Targeted intervention procedures ordered by operational risk severity</p>
          </div>
        </div>

        {loading ? (
          <LoadingState
            message="Compiling Depot Intervention Plans..."
            subtext="Sequencing preventive component overhauls based on multi-axis telemetry degradation."
            size="lg"
            minHeight="220px"
          />
        ) : queue.length === 0 ? (
          <EmptyState
            title="All Assets Fully Serviced"
            description="No equipment currently requires urgent depot interventions."
          />
        ) : (
          <div className="table-wrapper">
            <table className="sentinel-table">
              <thead>
                <tr>
                  <th>Priority</th>
                  <th>Asset Code</th>
                  <th>Model / Location</th>
                  <th>Target Subsystem</th>
                  <th>Due Status</th>
                  <th>Prescribed Directive</th>
                  <th style={{ textAlign: 'right' }}>Planning Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedQueue.map((item) => (
                  <tr key={item.asset_id}>
                    <td>
                      <RiskBadge risk={item.priority || 'MEDIUM'} size="sm" />
                    </td>
                    <td>
                      <strong style={{ fontFamily: 'var(--font-family-mono)' }}>{item.asset_code}</strong>
                    </td>
                    <td>
                      <div>{item.model}</div>
                      <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{item.location}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Cpu size={14} style={{ color: 'var(--color-text-muted)' }} />
                        <span>{item.target_component}</span>
                      </div>
                    </td>
                    <td>
                      <StatusBadge status={item.due_status || 'NOMINAL'} size="sm" />
                    </td>
                    <td style={{ maxWidth: '280px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'block' }}>
                        {item.recommended_action}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          className="secondary-btn"
                          style={{ height: '28px', fontSize: '11px', padding: '0 8px' }}
                          disabled={generatingForAsset === item.asset_id}
                          onClick={(e) => handleGeneratePlan(item.asset_id, item.asset_code, e)}
                        >
                          <Wrench size={12} />
                          <span>{generatingForAsset === item.asset_id ? 'Compiling...' : 'Auto-Plan'}</span>
                        </button>
                        <button
                          className="primary-btn"
                          style={{ height: '28px', fontSize: '11px', padding: '0 8px' }}
                          onClick={() => setSelectedAssetId(item.asset_id)}
                        >
                          <span>Log Service</span>
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

        {/* Fixed 10 Rows Pagination */}
        {!loading && queue.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--color-border)' }}>
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              Showing {Math.min((page - 1) * pageSize + 1, queue.length)} - {Math.min(page * pageSize, queue.length)} of {queue.length} items (10 per page)
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="secondary-btn"
                style={{ height: '30px', padding: '0 10px', fontSize: '12px' }}
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft size={14} />
                <span>Previous</span>
              </button>
              <button
                className="secondary-btn"
                style={{ height: '30px', padding: '0 10px', fontSize: '12px' }}
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Asset Maintenance Service Modal */}
      {selectedAssetId && (
        <AssetMaintenanceModal
          assetId={selectedAssetId}
          onClose={() => setSelectedAssetId(null)}
          onSuccess={() => {
            loadQueue();
            setSelectedAssetId(null);
          }}
        />
      )}
    </div>
  );
}
