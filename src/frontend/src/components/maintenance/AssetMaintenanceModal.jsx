import React, { useState, useEffect, useCallback } from 'react';
import {
  Wrench,
  AlertTriangle,
  Clock,
  Cpu,
  RefreshCw,
  X,
  Layers,
  Sparkles,
  ClipboardList,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';
import {
  getAssetMaintenanceDetail,
  completeMaintenance
} from '../../api/maintenance';
import { LoadingSpinner, LoadingState } from '../common/UIComponents';

export default function AssetMaintenanceModal({ assetId, onClose, onMaintenanceCompleted, onSuccess }) {
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState(null);

  // Maintenance Completion Form State
  const [componentServiced, setComponentServiced] = useState('Engine');
  const [partsReplaced, setPartsReplaced] = useState('Bearing');
  const [technician, setTechnician] = useState('Lead Specialist Smith');
  const [notes, setNotes] = useState('Replaced worn component assemblies and completed diagnostic recalibration.');
  const [submitting, setSubmitting] = useState(false);
  const [completionResult, setCompletionResult] = useState(null);

  const loadAssetDetail = useCallback(async () => {
    if (!assetId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getAssetMaintenanceDetail(assetId);
      setDetail(data);
      if (data?.intervention_plan?.target_component) {
        setComponentServiced(data.intervention_plan.target_component);
      }
    } catch (err) {
      setError(err.message || 'Failed to load maintenance assessment for asset.');
    } finally {
      setLoading(false);
    }
  }, [assetId]);

  useEffect(() => {
    loadAssetDetail();
  }, [loadAssetDetail]);

  const handleCompleteMaintenance = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        asset_id: assetId,
        component_type: componentServiced,
        parts_replaced: partsReplaced,
        technician: technician,
        notes: notes
      };
      const result = await completeMaintenance(payload);
      setCompletionResult(result);
      if (onMaintenanceCompleted) {
        onMaintenanceCompleted(result);
      }
      if (onSuccess) {
        onSuccess(result);
      }
      // Notify all components across the app to reload data
      window.dispatchEvent(new CustomEvent('sentinel:data-updated', { detail: { assetId, result } }));
      // Reload asset detail to show fresh post-maintenance state
      await loadAssetDetail();
    } catch (err) {
      setError(err.message || 'Failed to complete maintenance execution.');
    } finally {
      setSubmitting(false);
    }
  };

  const getPriorityBadgeClass = (priority) => {
    switch (priority) {
      case 'CRITICAL':
        return 'badge-critical';
      case 'HIGH':
        return 'badge-caution';
      case 'MEDIUM':
        return 'badge-medium';
      case 'LOW':
      default:
        return 'badge-ready';
    }
  };

  const getDueBadgeClass = (due) => {
    switch (due) {
      case 'URGENT':
      case 'OVERDUE':
        return 'badge-critical';
      case 'DUE':
        return 'badge-caution';
      case 'UPCOMING':
        return 'badge-medium';
      default:
        return 'badge-ready';
    }
  };

  return (
    <div className="sentinel-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="sentinel-modal-container modal-maintenance" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="brand-shield-box">
              <Wrench size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'var(--font-family-mono)' }}>
                  Intervention Servicing: {detail ? detail.asset_code : `Asset #${assetId}`}
                </span>
                {detail?.operational_status && (
                  <span className="sentinel-badge badge-ready" style={{ fontSize: '10px' }}>
                    {detail.operational_status}
                  </span>
                )}
              </div>
              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                {detail ? `${detail.model || 'Heavy Equipment'} • ${detail.asset_type || 'Machinery'}` : 'Loading asset telemetry...'}
              </span>
            </div>
          </div>
          <button
            className="header-action-btn"
            style={{ width: '32px', height: '32px' }}
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {loading ? (
            <LoadingState
              message="Synthesizing Maintenance Plan & Telemetry..."
              subtext="Evaluating component wear metrics, degradation curves, and historical repair logs."
              size="lg"
              minHeight="320px"
            />
          ) : error ? (
            <div className="error-banner">
              <AlertTriangle size={20} />
              <span>{error}</span>
            </div>
          ) : detail ? (
            <div className="maintenance-modal-grid">
              {/* Success Notification on Post-Maintenance Reassessment */}
              {completionResult && (
                <div className="success-reassessment-banner">
                  <ShieldCheck size={24} className="text-success" />
                  <div className="reassessment-banner-body">
                    <h4>Maintenance Completed & Post-Service Reassessment Executed</h4>
                    <p>
                      {completionResult.message} • Asset status reset to <strong>ACTIVE</strong>.
                    </p>
                    <div className="reassessment-metrics-chip">
                      <span>
                        Updated Readiness State:{' '}
                        <strong>{completionResult.updated_readiness?.readiness_state || 'READY'}</strong>
                      </span>
                      <span>
                        Readiness Score:{' '}
                        <strong>{completionResult.updated_readiness?.readiness_score?.toFixed(1) || '100.0'}%</strong>
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Top Overview Cards */}
              <div className="maint-overview-row">
                <div className="maint-info-card">
                  <span className="card-label">Intervention Urgency</span>
                  <div className="card-val-row">
                    <span className={`status-badge ${getPriorityBadgeClass(detail.intervention_plan?.priority)}`}>
                      {detail.intervention_plan?.priority}
                    </span>
                    <span className={`status-badge ${getDueBadgeClass(detail.intervention_plan?.due_status)}`}>
                      {detail.intervention_plan?.due_status}
                    </span>
                  </div>
                  <span className="card-subtext">{detail.intervention_plan?.justification}</span>
                </div>

                <div className="maint-info-card">
                  <span className="card-label">Target Subsystem</span>
                  <div className="target-comp-row">
                    <Cpu size={20} className="text-accent" />
                    <span className="target-comp-name">{detail.intervention_plan?.target_component}</span>
                  </div>
                  <span className="card-subtext">
                    {detail.intervention_plan?.supporting_evidence?.target_component_reason || 'Component identified via telemetry distress attribution.'}
                  </span>
                </div>

                <div className="maint-info-card">
                  <span className="card-label">Operating vs Next Due</span>
                  <div className="card-val-row">
                    <span className="metric-large">
                      {detail.intervention_plan?.supporting_evidence?.current_operating_hours?.toFixed(0) || '0'}h
                    </span>
                    <ArrowRight size={16} className="text-muted" />
                    <span className="metric-large text-cyan">
                      {detail.intervention_plan?.supporting_evidence?.next_due_hours?.toFixed(0) || 'N/A'}h
                    </span>
                  </div>
                  <span className="card-subtext">
                    Buffer Remaining: {detail.intervention_plan?.supporting_evidence?.hours_until_due !== null
                      ? `${detail.intervention_plan.supporting_evidence.hours_until_due}h`
                      : 'Interval nominal'}
                  </span>
                </div>

                <div className="maint-info-card">
                  <span className="card-label">Prognostic Indicators</span>
                  <div className="prognostics-mini-row">
                    <div>
                      <span className="micro-label">Failure Prob</span>
                      <span className={`metric-mid ${detail.intervention_plan?.supporting_evidence?.failure_probability >= 0.5 ? 'text-danger' : 'text-success'}`}>
                        {((detail.intervention_plan?.supporting_evidence?.failure_probability || 0) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div>
                      <span className="micro-label">RUL Estimate</span>
                      <span className="metric-mid text-cyan">
                        {detail.intervention_plan?.supporting_evidence?.rul_hours?.toFixed(1) || 'Nominal'}h
                      </span>
                    </div>
                  </div>
                  <span className="card-subtext">
                    Diagnosed Mode: <strong>{detail.intervention_plan?.supporting_evidence?.diagnosed_mode || 'No Fault'}</strong>
                  </span>
                </div>
              </div>

              {/* Recommended Action Plan Directive */}
              <div className="maint-section-card highlight-card">
                <div className="section-card-header">
                  <ClipboardList size={18} className="text-cyan" />
                  <h3>Prescribed Maintenance Directive</h3>
                </div>
                <div className="directive-action-box">
                  <p className="directive-text">{detail.intervention_plan?.recommended_action}</p>
                </div>
                {detail.intervention_plan?.supporting_evidence?.attributed_sensors?.length > 0 && (
                  <div className="telemetry-anomaly-attribution">
                    <span className="attribution-label">Sensors Contributing to Distress:</span>
                    <div className="sensor-tag-list">
                      {detail.intervention_plan.supporting_evidence.attributed_sensors.map((s, i) => (
                        <span key={i} className="sensor-badge-danger">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Subsystems Health Matrix */}
              <div className="maint-section-card">
                <div className="section-card-header">
                  <Layers size={18} className="text-cyan" />
                  <h3>Asset Component Historical Reliability</h3>
                </div>
                <div className="component-insights-table-wrap">
                  <table className="subsystem-table">
                    <thead>
                      <tr>
                        <th>Subsystem</th>
                        <th>Correlated Sensors</th>
                        <th>Times Serviced</th>
                        <th>Past Failures</th>
                        <th>Last Condition</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.component_insights?.map((comp, idx) => (
                        <tr key={idx} className={comp.predicted_distress ? 'row-distress' : ''}>
                          <td>
                            <strong>{comp.component_type}</strong>
                            {comp.predicted_distress && (
                              <span className="tag-target-distress">Target Intervention</span>
                            )}
                          </td>
                          <td>
                            <div className="sensor-tags-compact">
                              {comp.correlated_sensors?.slice(0, 3).map((cs, ci) => (
                                <span key={ci} className="tag-sensor-micro">{cs}</span>
                              ))}
                            </div>
                          </td>
                          <td>{comp.serviced_count}</td>
                          <td>
                            <span className={comp.failure_count > 0 ? 'text-danger' : 'text-muted'}>
                              {comp.failure_count}
                            </span>
                          </td>
                          <td>
                            <span className={`badge-condition condition-${(comp.latest_condition || 'good').toLowerCase()}`}>
                              {comp.latest_condition}
                            </span>
                          </td>
                          <td>
                            {comp.active_anomaly_detected ? (
                              <span className="badge-critical-micro">Distress Anomaly</span>
                            ) : (
                              <span className="badge-nominal-micro">Nominal</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Maintenance Execution & Post-Maintenance Reassessment Form */}
              <div className="maint-section-card execution-card">
                <div className="section-card-header">
                  <Sparkles size={18} className="text-accent" />
                  <h3>Execute Maintenance & Post-Service Reassessment</h3>
                </div>
                <form onSubmit={handleCompleteMaintenance} className="maintenance-exec-form">
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Component Serviced</label>
                      <select
                        value={componentServiced}
                        onChange={(e) => setComponentServiced(e.target.value)}
                        className="form-select"
                        required
                      >
                        <option value="Engine">Engine</option>
                        <option value="Hydraulic System">Hydraulic System</option>
                        <option value="Fuel Pump">Fuel Pump</option>
                        <option value="Battery">Battery</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Parts Replaced / Overhauled</label>
                      <select
                        value={partsReplaced}
                        onChange={(e) => setPartsReplaced(e.target.value)}
                        className="form-select"
                      >
                        <option value="None">None (Inspection Only)</option>
                        <option value="Bearing">Bearing</option>
                        <option value="Seal">Seal</option>
                        <option value="Pump">Pump</option>
                        <option value="Battery">Battery</option>
                        <option value="Valve">Valve</option>
                        <option value="Filter">Filter</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Lead Technician / Operator</label>
                      <input
                        type="text"
                        value={technician}
                        onChange={(e) => setTechnician(e.target.value)}
                        className="form-input"
                        placeholder="e.g. Lead Tech Reynolds"
                        required
                      />
                    </div>

                    <div className="form-group full-width">
                      <label>Maintenance Action Log & Corrective Measures</label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="form-textarea"
                        rows={2}
                        placeholder="Detail the maintenance performed, parts verified, and diagnostic clearances..."
                        required
                      />
                    </div>
                  </div>

                  <div className="form-actions">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="btn-primary-glow btn-exec-maint"
                    >
                      {submitting ? (
                        <>
                          <LoadingSpinner size="xs" />
                          <span>Executing & Reassessing...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck size={16} />
                          <span>Complete Maintenance & Reassess Asset</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Historical Maintenance Log for this Asset */}
              <div className="maint-section-card">
                <div className="section-card-header">
                  <Clock size={18} className="text-cyan" />
                  <h3>Asset Maintenance History ({detail.maintenance_history?.length || 0} Records)</h3>
                </div>
                <div className="maint-history-table-wrap">
                  <table className="maint-history-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Component</th>
                        <th>Issue Detected</th>
                        <th>Parts Replaced</th>
                        <th>Condition</th>
                        <th>Tech</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.maintenance_history?.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="text-center text-muted py-3">
                            No historical records found for this asset.
                          </td>
                        </tr>
                      ) : (
                        detail.maintenance_history.map((h) => (
                          <tr key={h.id}>
                            <td>{new Date(h.maintenance_date).toLocaleDateString()}</td>
                            <td>
                              <span className="badge-type">{h.maintenance_type}</span>
                            </td>
                            <td>{h.component_type}</td>
                            <td className="truncate-text" title={h.issue_detected || h.description}>
                              {h.issue_detected || h.description}
                            </td>
                            <td>{h.parts_replaced}</td>
                            <td>
                              <span className={`badge-condition condition-${(h.component_condition || 'good').toLowerCase()}`}>
                                {h.component_condition}
                              </span>
                            </td>
                            <td>{h.technician}</td>
                            <td>
                              <span className="badge-status-completed">{h.maintenance_status}</span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
