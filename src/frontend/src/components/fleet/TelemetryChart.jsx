import React, { useState, useMemo, useEffect } from 'react';
import { Activity, Thermometer, Gauge, Zap, Waves, Disc, AlertTriangle, ShieldCheck } from 'lucide-react';

const METRIC_CONFIGS = {
  temperature:         { label: 'Temperature',        unit: '°C',       color: '#f59e0b', icon: Thermometer },
  vibration:           { label: 'Vibration',           unit: 'g',        color: '#ef4444', icon: Waves },
  oil_pressure:        { label: 'Oil Pressure',        unit: 'psi',      color: '#10b981', icon: Gauge },
  fuel_pressure:       { label: 'Fuel Pressure',       unit: 'psi',      color: '#f97316', icon: Zap },
  hydraulic_pressure:  { label: 'Hydraulic Pressure',  unit: 'psi',      color: '#06b6d4', icon: Activity },
  rpm:                 { label: 'Engine RPM',           unit: 'RPM',      color: '#8b5cf6', icon: Disc },
};

const OPERATIONAL_THRESHOLDS = {
  temperature:        { ucl: 85.0, nominal: 68.0, label: 'UCL: 85.0°C' },
  vibration:          { ucl: 2.50, nominal: 1.20, label: 'UCL: 2.50 g' },
  oil_pressure:       { ucl: 85.0, lcl: 45.0, nominal: 65.0, label: 'UCL: 85.0 psi' },
  fuel_pressure:      { ucl: 65.0, lcl: 30.0, nominal: 48.0, label: 'UCL: 65.0 psi' },
  hydraulic_pressure: { ucl: 3200, lcl: 2200, nominal: 2800, label: 'UCL: 3200 psi' },
  rpm:                { ucl: 2400, nominal: 2100, label: 'UCL: 2400 RPM' },
};

export default function TelemetryChart({ readings = [] }) {
  const [activeMetric, setActiveMetric] = useState('temperature');
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // Sort readings chronologically for charting
  const sortedReadings = useMemo(() => {
    return [...readings].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }, [readings]);

  // Identify which metrics have actual non-null sensor telemetry in this series
  const availableMetrics = useMemo(() => {
    const available = new Set();
    sortedReadings.forEach((r) => {
      Object.keys(METRIC_CONFIGS).forEach((k) => {
        if (r[k] !== null && r[k] !== undefined && !isNaN(Number(r[k]))) {
          available.add(k);
        }
      });
    });
    return available;
  }, [sortedReadings]);

  // Auto-switch to first available metric if activeMetric is unavailable for this subsystem
  useEffect(() => {
    if (availableMetrics.size > 0 && !availableMetrics.has(activeMetric)) {
      const firstAvail = Array.from(availableMetrics)[0];
      if (firstAvail) {
        setActiveMetric(firstAvail);
      }
    }
  }, [availableMetrics, activeMetric]);

  const config = METRIC_CONFIGS[activeMetric] || METRIC_CONFIGS.temperature;
  const threshold = OPERATIONAL_THRESHOLDS[activeMetric];

  // Filter only readings where the active metric is non-null
  const validReadings = useMemo(() => {
    return sortedReadings.filter(
      (r) => r[activeMetric] !== null && r[activeMetric] !== undefined && !isNaN(Number(r[activeMetric]))
    );
  }, [sortedReadings, activeMetric]);

  // Compute stats and SVG coordinates strictly from valid readings
  const { points, minVal, maxVal, avgVal, pathD, areaD, uclY, nominalY, breachedCount } = useMemo(() => {
    if (validReadings.length === 0) {
      return { points: [], minVal: null, maxVal: null, avgVal: null, pathD: '', areaD: '', uclY: null, nominalY: null, breachedCount: 0 };
    }

    const values = validReadings.map((r) => Number(r[activeMetric]));
    let min = Math.min(...values);
    let max = Math.max(...values);
    const avg = values.reduce((sum, v) => sum + v, 0) / values.length;

    // Expand bounds if threshold is outside current range so threshold lines render nicely
    if (threshold?.ucl) {
      max = Math.max(max, threshold.ucl * 1.05);
    }
    if (threshold?.nominal) {
      min = Math.min(min, threshold.nominal * 0.95);
    }

    const width = 800;
    const height = 240;
    const paddingX = 40;
    const paddingY = 32;

    const range = max - min === 0 ? 1 : max - min;

    let breached = 0;
    const pts = validReadings.map((reading, index) => {
      const val = Number(reading[activeMetric]);
      const isBreached = threshold?.ucl !== undefined && val > threshold.ucl;
      if (isBreached) breached++;

      const x = paddingX + (index / (validReadings.length - 1 || 1)) * (width - 2 * paddingX);
      const y = height - paddingY - ((val - min) / range) * (height - 2 * paddingY);
      return { x, y, val, timestamp: reading.timestamp, isBreached };
    });

    const linePath = pts.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x},${pt.y}`, '');
    const firstPt = pts[0];
    const lastPt = pts[pts.length - 1];
    const areaPath = `${linePath} L ${lastPt.x},${height - paddingY} L ${firstPt.x},${height - paddingY} Z`;

    // Compute threshold Y positions
    let computedUclY = null;
    let computedNominalY = null;

    if (threshold?.ucl !== undefined) {
      computedUclY = height - paddingY - ((threshold.ucl - min) / range) * (height - 2 * paddingY);
    }
    if (threshold?.nominal !== undefined) {
      computedNominalY = height - paddingY - ((threshold.nominal - min) / range) * (height - 2 * paddingY);
    }

    return {
      points: pts,
      minVal: Math.min(...values).toFixed(2),
      maxVal: Math.max(...values).toFixed(2),
      avgVal: avg.toFixed(2),
      pathD: linePath,
      areaD: areaPath,
      uclY: computedUclY,
      nominalY: computedNominalY,
      breachedCount: breached
    };
  }, [validReadings, activeMetric, threshold]);

  if (sortedReadings.length === 0) {
    return (
      <div className="chart-empty-state" style={{ padding: '32px', textAlign: 'center' }}>
        <Activity size={32} className="chart-empty-icon" />
        <p style={{ color: 'var(--color-text-secondary)', marginTop: '8px' }}>
          No historical telemetry available for this asset.
        </p>
      </div>
    );
  }

  return (
    <div className="telemetry-chart-card">
      <div className="chart-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h4 className="chart-title">HUMS Sensor Telemetry Trends &amp; Limit Boundaries</h4>
            {breachedCount > 0 ? (
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  color: '#ef4444',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <AlertTriangle size={11} />
                {breachedCount} THRESHOLD BREACHES
              </span>
            ) : (
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(34, 197, 94, 0.12)',
                  color: '#22c55e',
                  border: '1px solid rgba(34, 197, 94, 0.25)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <ShieldCheck size={11} />
                WITHIN NOMINAL BAND
              </span>
            )}
          </div>
          <p className="chart-subtitle">Real-time time-series telemetry persisted in PostgreSQL with MIL-STD-810H tolerance bands</p>
        </div>

        <div className="metric-toggle-group">
          {Object.entries(METRIC_CONFIGS).map(([key, cfg]) => {
            const Icon = cfg.icon;
            const isActive = activeMetric === key;
            const isAvailable = availableMetrics.has(key);
            return (
              <button
                key={key}
                className={`metric-btn ${isActive ? 'metric-btn-active' : ''}`}
                style={{
                  ...(isActive ? { borderColor: cfg.color, color: cfg.color } : {}),
                  ...(!isAvailable ? { opacity: 0.38, cursor: 'not-allowed' } : {})
                }}
                onClick={() => isAvailable && setActiveMetric(key)}
                title={isAvailable ? `${cfg.label} Telemetry` : `${cfg.label} Unavailable on this subsystem`}
                disabled={!isAvailable}
              >
                <Icon size={14} />
                <span>{cfg.label}</span>
                {!isAvailable && <span style={{ fontSize: '10px', opacity: 0.8 }}> (N/A)</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* If current metric has no valid data, show explicit message */}
      {validReadings.length === 0 ? (
        <div style={{ padding: '36px 20px', textAlign: 'center', backgroundColor: 'var(--color-bg-subtle)', borderRadius: '6px', margin: '16px 0' }}>
          <Activity size={24} style={{ color: 'var(--color-text-muted)', marginBottom: '8px' }} />
          <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '13px' }}>
            <strong>Unavailable:</strong> {config.label} telemetry is not logged for this subsystem architecture.
          </p>
        </div>
      ) : (
        <>
          {/* Stats Summary Bar */}
          <div className="chart-stats-bar">
            <div className="stat-pill">
              <span className="stat-label">Observed Min:</span>
              <span className="stat-value">{minVal !== null ? `${minVal} ${config.unit}` : 'Unavailable'}</span>
            </div>
            <div className="stat-pill">
              <span className="stat-label">Observed Avg:</span>
              <span className="stat-value">{avgVal !== null ? `${avgVal} ${config.unit}` : 'Unavailable'}</span>
            </div>
            <div className="stat-pill">
              <span className="stat-label">Observed Max:</span>
              <span className="stat-value" style={{ color: breachedCount > 0 ? '#ef4444' : 'var(--color-text)' }}>
                {maxVal !== null ? `${maxVal} ${config.unit}` : 'Unavailable'}
              </span>
            </div>
            {threshold?.ucl && (
              <div className="stat-pill" style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <span className="stat-label" style={{ color: '#ef4444' }}>Critical Threshold (UCL):</span>
                <span className="stat-value" style={{ color: '#ef4444' }}>{threshold.ucl} {config.unit}</span>
              </div>
            )}
            {threshold?.nominal && (
              <div className="stat-pill" style={{ backgroundColor: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                <span className="stat-label" style={{ color: '#22c55e' }}>Nominal Baseline:</span>
                <span className="stat-value" style={{ color: '#22c55e' }}>{threshold.nominal} {config.unit}</span>
              </div>
            )}
          </div>

          {/* SVG Canvas Line Graph with Operational Threshold Bands */}
          <div className="svg-chart-container">
            <svg viewBox="0 0 800 240" className="telemetry-svg" preserveAspectRatio="none">
              <defs>
                <linearGradient id={`grad-${activeMetric}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={config.color} stopOpacity="0.35" />
                  <stop offset="100%" stopColor={config.color} stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid lines */}
              <line x1="40" y1="32" x2="760" y2="32" stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
              <line x1="40" y1="104" x2="760" y2="104" stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
              <line x1="40" y1="176" x2="760" y2="176" stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
              <line x1="40" y1="208" x2="760" y2="208" stroke="rgba(255,255,255,0.12)" />

              {/* Nominal Baseline Reference Line (Emerald) */}
              {nominalY !== null && nominalY >= 30 && nominalY <= 210 && (
                <g>
                  <line
                    x1="40"
                    y1={nominalY}
                    x2="760"
                    y2={nominalY}
                    stroke="#22c55e"
                    strokeWidth="1.5"
                    strokeDasharray="6 4"
                    strokeOpacity="0.75"
                  />
                  <text
                    x="755"
                    y={nominalY - 5}
                    fill="#22c55e"
                    fontSize="10"
                    fontFamily="monospace"
                    textAnchor="end"
                    fontWeight="600"
                  >
                    Nominal: {threshold.nominal} {config.unit}
                  </text>
                </g>
              )}

              {/* Upper Critical Limit (UCL) Threshold Line (Crimson) */}
              {uclY !== null && uclY >= 25 && uclY <= 215 && (
                <g>
                  <line
                    x1="40"
                    y1={uclY}
                    x2="760"
                    y2={uclY}
                    stroke="#ef4444"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                    strokeOpacity="0.85"
                  />
                  <text
                    x="755"
                    y={uclY - 5}
                    fill="#ef4444"
                    fontSize="10"
                    fontFamily="monospace"
                    textAnchor="end"
                    fontWeight="700"
                  >
                    UPPER CRITICAL LIMIT ({threshold.ucl} {config.unit})
                  </text>
                </g>
              )}

              {/* Area fill */}
              {areaD && (
                <path d={areaD} fill={`url(#grad-${activeMetric})`} />
              )}

              {/* Line path */}
              {pathD && (
                <path
                  d={pathD}
                  fill="none"
                  stroke={config.color}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Interactive data points */}
              {points.map((pt, i) => {
                const isBreached = pt.isBreached;
                return (
                  <g key={i}>
                    {isBreached && (
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={hoveredPoint === pt ? 9 : 6}
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="1.5"
                        strokeOpacity="0.8"
                      />
                    )}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={hoveredPoint === pt ? 5 : isBreached ? 3.5 : 2.5}
                      fill={isBreached ? '#ef4444' : hoveredPoint === pt ? '#FFFFFF' : config.color}
                      stroke={isBreached ? '#b91c1c' : config.color}
                      strokeWidth="1.5"
                      className="chart-point"
                      onMouseEnter={() => setHoveredPoint(pt)}
                      onMouseLeave={() => setHoveredPoint(null)}
                    />
                  </g>
                );
              })}
            </svg>

            {/* Hover Tooltip */}
            {hoveredPoint && (
              <div
                className="chart-tooltip"
                style={{
                  left: `${(hoveredPoint.x / 800) * 100}%`,
                  top: `${(hoveredPoint.y / 240) * 100}%`,
                }}
              >
                <div className="tooltip-val" style={{ color: hoveredPoint.isBreached ? '#ef4444' : '#ffffff' }}>
                  {hoveredPoint.val} {config.unit} {hoveredPoint.isBreached ? '⚠️ LIMIT BREACHED' : ''}
                </div>
                <div className="tooltip-date">
                  {new Date(hoveredPoint.timestamp).toLocaleString()}
                </div>
              </div>
            )}
          </div>

          {/* Visual Legend */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', fontSize: '11px', color: 'var(--color-text-secondary)', padding: '4px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '14px', height: '3px', backgroundColor: config.color, display: 'inline-block', borderRadius: '1px' }}></span>
              <span>Observed Waveform ({config.label})</span>
            </div>
            {threshold?.ucl && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '14px', height: '2px', borderTop: '2px dashed #ef4444', display: 'inline-block' }}></span>
                <span style={{ color: '#ef4444' }}>Critical Limit ({threshold.ucl} {config.unit})</span>
              </div>
            )}
            {threshold?.nominal && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '14px', height: '2px', borderTop: '2px dashed #22c55e', display: 'inline-block' }}></span>
                <span style={{ color: '#22c55e' }}>Nominal Baseline</span>
              </div>
            )}
          </div>
        </>
      )}

      <div className="chart-footer">
        <span>Earliest Sample: {sortedReadings.length > 0 ? new Date(sortedReadings[0].timestamp).toLocaleString() : '--'}</span>
        <span>Latest Sample: {sortedReadings.length > 0 ? new Date(sortedReadings[sortedReadings.length - 1].timestamp).toLocaleString() : '--'}</span>
      </div>
    </div>
  );
}

