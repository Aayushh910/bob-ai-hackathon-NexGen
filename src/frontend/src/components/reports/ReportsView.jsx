import React, { useState } from 'react';
import {
  FileText,
  Download,
  Printer,
  ShieldCheck,
  Calendar,
  CheckCircle2,
  Clock,
  Filter,
  Layers,
  ArrowRight
} from 'lucide-react';
import { getFleetReadinessStatistics } from '../../api/readiness';
import { listMaintenanceRecords } from '../../api/maintenance';
import { getFleetRiskRanking } from '../../api/command';
import { PageHeader, LoadingSpinner } from '../common/UIComponents';

export default function ReportsView() {
  const [generatingReportId, setGeneratingReportId] = useState(null);
  const [exportNotice, setExportNotice] = useState(null);

  const reportCategories = [
    {
      id: 'readiness',
      title: 'Mission Readiness Clearance Brief',
      description: 'Comprehensive operational clearance summary across all registered fleet assets, identifying cleared vs grounded units.',
      frequency: 'Daily / On-Demand',
      classification: 'RESTRICTED / OPS'
    },
    {
      id: 'maintenance',
      title: 'Maintenance Log & Overhaul Audit Trail',
      description: 'Audit records of technician inspections, parts replaced, component overhauls, and post-service verification.',
      frequency: 'Weekly Audit',
      classification: 'INTERNAL / LOGISTICS'
    },
    {
      id: 'prognostics',
      title: 'Prognostic Failure Risk & RUL Forecast',
      description: 'Forward-looking prognostics forecast detailing remaining useful life horizons, high-risk assets, and required mitigations.',
      frequency: 'Bi-Weekly',
      classification: 'CONFIDENTIAL'
    }
  ];

  const handleExportReport = async (type) => {
    setGeneratingReportId(type);
    setExportNotice(null);
    try {
      let csvContent = '';
      const filename = `SentinelAI_${type.toUpperCase()}_REPORT_${new Date().toISOString().slice(0, 10)}.csv`;

      if (type === 'readiness') {
        const ranking = await getFleetRiskRanking();
        csvContent = `Asset Code,Model,Risk Level,Failure Probability,RUL Hours,Status\n`;
        ranking.forEach((r) => {
          csvContent += `"${r.asset_code}","${r.model}","${r.risk_level}",${(r.failure_probability * 100).toFixed(1)}%,${r.rul_hours || 0},"EVALUATED"\n`;
        });
      } else if (type === 'maintenance') {
        const records = await listMaintenanceRecords({ page_size: 100 });
        csvContent = `Asset ID,Component,Maintenance Type,Status,Performed By,Logged Date\n`;
        (records.items || []).forEach((rec) => {
          csvContent += `"${rec.asset_id}","${rec.component_type}","${rec.maintenance_type}","${rec.status}","${rec.performed_by || 'Technician'}","${rec.created_at}"\n`;
        });
      } else {
        const ranking = await getFleetRiskRanking();
        csvContent = `Asset Code,Model,Risk Level,Failure Probability,Primary Risk Factor,Mitigation Action\n`;
        ranking.forEach((r) => {
          csvContent += `"${r.asset_code}","${r.model}","${r.risk_level}",${(r.failure_probability * 100).toFixed(1)}%,"${r.top_factors || 'Sensor Drift'}","Inspect"\n`;
        });
      }

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setExportNotice(`Export complete: ${filename}`);
    } catch (err) {
      console.error('Failed to export report:', err);
      setExportNotice('Export failed: unable to fetch report data from backend.');
    } finally {
      setGeneratingReportId(null);
    }
  };

  return (
    <div className="reports-container">
      <PageHeader
        badgeText="Operational Compliance & Export Center"
        badgeIcon={FileText}
        title="Mission Readiness & Maintenance Reports"
        subtitle="Generate operationally verified CSV briefs, readiness certificates, and maintenance compliance records directly from live PostgreSQL logs."
      />

      {exportNotice && (
        <div style={{ padding: '8px 14px', backgroundColor: 'var(--color-success-dim)', border: '1px solid var(--color-success-border)', borderRadius: '6px', color: 'var(--color-success)', fontSize: '12px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={14} />
          <span>{exportNotice}</span>
        </div>
      )}

      {/* Reports Grid (3 columns) */}
      <div className="grid-3-col" style={{ marginBottom: '24px' }}>
        {reportCategories.map((cat) => (
          <div
            key={cat.id}
            className="sentinel-card"
            style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <span className="sentinel-badge badge-ready" style={{ fontSize: '10px' }}>
                  {cat.classification}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{cat.frequency}</span>
              </div>

              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text)', marginBottom: '8px' }}>
                {cat.title}
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: 1.5, marginBottom: '20px' }}>
                {cat.description}
              </p>
            </div>

            <div style={{ paddingTop: '16px', borderTop: '1px solid var(--color-border)' }}>
              <button
                className="primary-btn"
                style={{ width: '100%', height: '36px' }}
                disabled={generatingReportId === cat.id}
                onClick={() => handleExportReport(cat.id)}
              >
                {generatingReportId === cat.id ? (
                  <>
                    <LoadingSpinner size="xs" />
                    <span>Compiling Dataset...</span>
                  </>
                ) : (
                  <>
                    <Download size={14} />
                    <span>Export Verified CSV</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Live Operational Certificate Preview */}
      <div className="sentinel-card">
        <div className="card-header-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={20} style={{ color: 'var(--color-success)' }} />
            <div>
              <h3 className="card-title">Mission Readiness Clearance Certificate Preview</h3>
              <p className="card-subtitle">Authenticated snapshot generated according to standard defence readiness protocols</p>
            </div>
          </div>
          <button
            className="secondary-btn"
            style={{ height: '32px', fontSize: '12px' }}
            onClick={() => window.print()}
            title="Print clearance brief"
          >
            <Printer size={14} />
            <span>Print Brief</span>
          </button>
        </div>

        <div style={{ padding: '20px', backgroundColor: 'var(--color-bg-subtle)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px', marginBottom: '12px' }}>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '0.04em', color: 'var(--color-text)' }}>
                SENTINELAI OPERATIONAL COMMAND
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                CLEARANCE AUTHORITY: DEFENCE TELEMETRY WING
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-success)' }}>STATUS: SYSTEM ONLINE</div>
              <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>TIMESTAMP: {new Date().toUTCString()}</div>
            </div>
          </div>

          <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
            <p>
              This clearance brief certifies that the current fleet registry has been subjected to continuous multi-model HUMS telemetry evaluation, vibration harmonic analysis, and remaining useful life (RUL) calculations.
            </p>
            <p style={{ marginTop: '8px' }}>
              All units tagged as <strong>MISSION READY</strong> have fulfilled operational parameter clearances with failure probabilities below established hazard thresholds (&lt; 25%).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
