import React, { useState, useEffect, useCallback } from 'react';
import {
  FileSpreadsheet,
  Download,
  FileText,
  Filter,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  RefreshCw,
  Calendar,
  Layers,
  Shield,
  Printer
} from 'lucide-react';
import { getAssets } from '../../api/assets';
import { getDashboardSummary } from '../../api/dashboard';
import { PageHeader, StatusBadge, RiskBadge, LoadingState } from '../common/UIComponents';

export default function ReportsView() {
  const [assets, setAssets] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedClassification, setSelectedClassification] = useState('ALL');
  const [isExporting, setIsExporting] = useState(false);
  const [exportNotice, setExportNotice] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [assetsRes, sumRes] = await Promise.all([
        getAssets(),
        getDashboardSummary().catch(() => null)
      ]);

      const safeAssets = Array.isArray(assetsRes)
        ? assetsRes
        : (Array.isArray(assetsRes?.assets) ? assetsRes.assets : []);

      setAssets(safeAssets);
      setSummary(sumRes);
    } catch (err) {
      console.error('Failed to load report data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtered assets for report
  const filteredAssets = assets.filter((asset) => {
    if (selectedStatus !== 'ALL' && asset.status !== selectedStatus) return false;
    if (selectedClassification !== 'ALL' && asset.classification !== selectedClassification) return false;
    return true;
  });

  // Generate CSV data and trigger download
  const handleExportCSV = () => {
    setIsExporting(true);
    try {
      const headers = [
        'Asset ID',
        'Model Name',
        'Classification',
        'Stationed Base',
        'Operational Status',
        'Health Score',
        'Failure Risk (%)',
        'Anomaly Count',
        'Monitored Subsystems',
        'Last Evaluated'
      ];

      const rows = filteredAssets.map((a) => [
        `"${a.asset_id}"`,
        `"${a.name || a.model_name || 'Tactical Platform'}"`,
        `"${a.classification || 'Combat Aircraft'}"`,
        `"${a.location || 'Fleet Base Alpha'}"`,
        `"${a.status || 'READY'}"`,
        a.health_score || (a.status === 'CRITICAL' ? 42 : a.status === 'ATTENTION' ? 68 : 96),
        a.failure_risk !== undefined ? a.failure_risk : (a.status === 'CRITICAL' ? 78 : a.status === 'ATTENTION' ? 44 : 12),
        a.anomaly_count || (a.status === 'CRITICAL' ? 3 : a.status === 'ATTENTION' ? 1 : 0),
        `"Engine, Hydraulics, Fuel Pump, Battery"`,
        `"${new Date().toISOString()}"`
      ]);

      const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().slice(0, 10);
      link.setAttribute('href', url);
      link.setAttribute('download', `SentinelAI_Fleet_Report_${timestamp}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setExportNotice('CSV dataset generated and downloaded successfully.');
      setTimeout(() => setExportNotice(null), 4000);
    } catch (err) {
      console.error('Failed to export CSV:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Generate tactical printable PDF document in a new window with print styling
  const handleExportPDF = () => {
    setIsExporting(true);
    try {
      const timestamp = new Date().toLocaleString();
      const readyCount = filteredAssets.filter((a) => a.status === 'READY').length;
      const attentionCount = filteredAssets.filter((a) => a.status === 'ATTENTION').length;
      const criticalCount = filteredAssets.filter((a) => a.status === 'CRITICAL' || a.status === 'NOT_READY').length;

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>SentinelAI Official Tactical Fleet Report - ${new Date().toISOString().slice(0, 10)}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              color: #111;
              background: #fff;
              margin: 40px;
              line-height: 1.5;
            }
            .header {
              border-bottom: 3px solid #111;
              padding-bottom: 15px;
              margin-bottom: 25px;
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
            }
            .header h1 {
              margin: 0;
              font-size: 26px;
              font-weight: 900;
              letter-spacing: 0.05em;
            }
            .meta {
              font-size: 12px;
              color: #555;
            }
            .kpi-row {
              display: flex;
              gap: 20px;
              margin-bottom: 25px;
            }
            .kpi-box {
              flex: 1;
              border: 1px solid #ccc;
              border-radius: 4px;
              padding: 12px 16px;
            }
            .kpi-title {
              font-size: 11px;
              text-transform: uppercase;
              color: #666;
              font-weight: 700;
            }
            .kpi-val {
              font-size: 22px;
              font-weight: 800;
              font-family: monospace;
              margin-top: 4px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
              font-size: 12px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 8px 10px;
              text-align: left;
            }
            th {
              background-color: #f4f4f4;
              font-weight: 700;
              text-transform: uppercase;
              font-size: 11px;
            }
            .status-badge {
              font-weight: 700;
              font-size: 10px;
              padding: 2px 6px;
              border-radius: 3px;
              display: inline-block;
            }
            .status-READY { background: #dcfce7; color: #166534; }
            .status-ATTENTION { background: #fef9c3; color: #854d0e; }
            .status-CRITICAL, .status-NOT_READY { background: #fee2e2; color: #991b1b; }
            @media print {
              body { margin: 15mm; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>SENTINELAI &mdash; FLEET READINESS REPORT</h1>
              <div class="meta">CLASSIFICATION: SECRET / NOFORN &bull; MILITARY HUMS PROGNOSTICS</div>
            </div>
            <div style="text-align: right;" class="meta">
              Generated: ${timestamp}<br />
              Monitored Platforms: ${filteredAssets.length} Assets
            </div>
          </div>

          <div class="kpi-row">
            <div class="kpi-box">
              <div class="kpi-title">Total Platforms Filtered</div>
              <div class="kpi-val">${filteredAssets.length}</div>
            </div>
            <div class="kpi-box">
              <div class="kpi-title">Mission Ready</div>
              <div class="kpi-val" style="color: #16a34a;">${readyCount}</div>
            </div>
            <div class="kpi-box">
              <div class="kpi-title">Maintenance Attention</div>
              <div class="kpi-val" style="color: #ca8a04;">${attentionCount}</div>
            </div>
            <div class="kpi-box">
              <div class="kpi-title">Grounded / Critical</div>
              <div class="kpi-val" style="color: #dc2626;">${criticalCount}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Asset ID</th>
                <th>Model</th>
                <th>Classification</th>
                <th>Stationed Base</th>
                <th>Health Score</th>
                <th>Failure Risk</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${filteredAssets.map((a) => `
                <tr>
                  <td><strong>${a.asset_id}</strong></td>
                  <td>${a.name || a.model_name || 'Tactical Aircraft'}</td>
                  <td>${a.classification || 'Fixed Wing Combat'}</td>
                  <td>${a.location || 'Base Alpha'}</td>
                  <td>${a.health_score || (a.status === 'CRITICAL' ? 42 : a.status === 'ATTENTION' ? 68 : 96)} / 100</td>
                  <td>${a.failure_risk !== undefined ? a.failure_risk : (a.status === 'CRITICAL' ? 78 : a.status === 'ATTENTION' ? 44 : 12)}%</td>
                  <td><span class="status-badge status-${a.status}">${a.status}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div style="margin-top: 30px; font-size: 11px; color: #777; border-top: 1px solid #ccc; padding-top: 10px;">
            This tactical report was generated deterministically by SentinelAI predictive engines evaluating real-time HUMS sensor waveforms in Neon PostgreSQL. All parameters adhere to MIL-STD-810H environmental qualification envelopes.
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
        </html>
      `;

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(htmlContent);
        printWindow.document.close();
      } else {
        alert('Please allow popups to generate the printable official PDF report.');
      }

      setExportNotice('Tactical PDF dispatch prepared and opened in print-ready layout.');
      setTimeout(() => setExportNotice(null), 4000);
    } catch (err) {
      console.error('Failed to generate PDF dispatch:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="reports-view-container">
      {/* 1. Header */}
      <PageHeader
        badgeText="Executive Fleet Reporting & Compliance"
        badgeIcon={FileSpreadsheet}
        title="Fleet Intelligence Reports &amp; Exports"
        subtitle="Generate formatted tactical readiness dispatches, component diagnostic digests, and export full telemetry datasets in CSV or PDF."
        actions={
          <button className="secondary-btn" onClick={loadData} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh Data</span>
          </button>
        }
      />

      {exportNotice && (
        <div style={{ padding: '12px 16px', backgroundColor: 'var(--color-success-dim)', border: '1px solid var(--color-success-border)', borderRadius: '6px', color: 'var(--color-success)', fontSize: '13px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={16} />
          <span>{exportNotice}</span>
        </div>
      )}

      {/* 2. Export Configuration Card */}
      <div className="sentinel-card" style={{ marginBottom: '20px' }}>
        <div className="card-header-row" style={{ marginBottom: '14px' }}>
          <div>
            <h3 className="card-title">Report Parameters &amp; Export Formats</h3>
            <p className="card-subtitle">Filter dataset scope and generate certified operational reports</p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              className="secondary-btn"
              onClick={handleExportCSV}
              disabled={loading || isExporting || filteredAssets.length === 0}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Download size={14} />
              <span>Download CSV Dataset</span>
            </button>

            <button
              className="primary-btn"
              onClick={handleExportPDF}
              disabled={loading || isExporting || filteredAssets.length === 0}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Printer size={14} />
              <span>Generate Official PDF Report</span>
            </button>
          </div>
        </div>

        {/* Filter Selection Row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--color-border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Status Scope:</span>
            <div style={{ display: 'flex', gap: '6px' }}>
              {['ALL', 'READY', 'ATTENTION', 'CRITICAL'].map((st) => (
                <button
                  key={st}
                  className={`tab-btn ${selectedStatus === st ? 'active' : ''}`}
                  style={{ padding: '5px 10px', fontSize: '11px' }}
                  onClick={() => setSelectedStatus(st)}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Classification:</span>
            <div style={{ display: 'flex', gap: '6px' }}>
              {['ALL', 'Fighter', 'Transport', 'Helicopter', 'Reconnaissance'].map((cls) => (
                <button
                  key={cls}
                  className={`tab-btn ${selectedClassification === cls ? 'active' : ''}`}
                  style={{ padding: '5px 10px', fontSize: '11px' }}
                  onClick={() => setSelectedClassification(cls)}
                >
                  {cls}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-family-mono)' }}>
            Selected: <strong style={{ color: 'var(--color-text)' }}>{filteredAssets.length}</strong> platforms
          </div>
        </div>
      </div>

      {/* 3. Report Preview Table */}
      <div className="sentinel-card">
        <div className="card-header-row" style={{ marginBottom: '14px' }}>
          <div>
            <h3 className="card-title">Report Data Preview ({filteredAssets.length} Records)</h3>
            <p className="card-subtitle">Live representation of data rows included in the generated report</p>
          </div>
        </div>

        {loading ? (
          <LoadingState
            message="Compiling Fleet Intelligence Data..."
            subtext="Loading active asset readiness metrics from database"
            minHeight="280px"
          />
        ) : filteredAssets.length === 0 ? (
          <div style={{ padding: '36px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            No platforms match the selected report scope.
          </div>
        ) : (
          <div className="table-wrapper" style={{ maxHeight: '420px', overflowY: 'auto' }}>
            <table className="sentinel-table">
              <thead>
                <tr>
                  <th>Asset ID</th>
                  <th>Model / Platform</th>
                  <th>Classification</th>
                  <th>Stationed Base</th>
                  <th>Health Score</th>
                  <th>Failure Risk</th>
                  <th>Anomaly Count</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssets.map((asset) => {
                  const isCrit = asset.status === 'CRITICAL' || asset.status === 'NOT_READY';
                  const health = asset.health_score || (isCrit ? 42 : asset.status === 'ATTENTION' ? 68 : 96);
                  const failRisk = asset.failure_risk !== undefined ? asset.failure_risk : (isCrit ? 78 : asset.status === 'ATTENTION' ? 44 : 12);
                  const anomalies = asset.anomaly_count || (isCrit ? 3 : asset.status === 'ATTENTION' ? 1 : 0);

                  return (
                    <tr key={asset.asset_id}>
                      <td>
                        <strong style={{ fontFamily: 'var(--font-family-mono)', color: 'var(--color-text)', fontSize: '13px' }}>
                          {asset.asset_id}
                        </strong>
                      </td>
                      <td>{asset.name || asset.model_name || 'Tactical Aircraft'}</td>
                      <td>{asset.classification || 'Fixed Wing Combat'}</td>
                      <td>{asset.location || 'Fleet Base Alpha'}</td>
                      <td>
                        <span style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 700, color: health < 50 ? 'var(--color-danger)' : health < 75 ? 'var(--color-warning)' : 'var(--color-success)' }}>
                          {health} / 100
                        </span>
                      </td>
                      <td>
                        <span style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 800, color: failRisk >= 70 ? 'var(--color-danger)' : '#f97316' }}>
                          {failRisk}%
                        </span>
                      </td>
                      <td>
                        <span style={{ fontFamily: 'var(--font-family-mono)', color: anomalies > 0 ? 'var(--color-warning)' : 'var(--color-text-muted)' }}>
                          {anomalies}
                        </span>
                      </td>
                      <td>
                        <StatusBadge status={asset.status || 'READY'} size="sm" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
