import React, { useState, useMemo, useEffect } from 'react';
import { Activity, Thermometer, Gauge, Zap, Waves, Disc } from 'lucide-react';

const METRIC_CONFIGS = {
  temperature:         { label: 'Temperature',        unit: '°C',       color: '#FFB800', icon: Thermometer },
  vibration:           { label: 'Vibration',           unit: 'mm/s RMS', color: '#FF2222', icon: Waves },
  oil_pressure:        { label: 'Oil Pressure',        unit: 'psi',      color: '#00C851', icon: Gauge },
  fuel_pressure:       { label: 'Fuel Pressure',       unit: 'psi',      color: '#FF6600', icon: Zap },
  hydraulic_pressure:  { label: 'Hydraulic Pressure',  unit: 'psi',      color: '#FF4444', icon: Activity },
  rpm:                 { label: 'Engine RPM',           unit: 'RPM',      color: '#00E64D', icon: Disc },
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

  // Filter only readings where the active metric is non-null
  const validReadings = useMemo(() => {
    return sortedReadings.filter(
      (r) => r[activeMetric] !== null && r[activeMetric] !== undefined && !isNaN(Number(r[activeMetric]))
    );
  }, [sortedReadings, activeMetric]);

  // Compute stats and SVG coordinates strictly from valid readings
  const { points, minVal, maxVal, avgVal, pathD, areaD } = useMemo(() => {
    if (validReadings.length === 0) {
      return { points: [], minVal: null, maxVal: null, avgVal: null, pathD: '', areaD: '' };
    }

    const values = validReadings.map((r) => Number(r[activeMetric]));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((sum, v) => sum + v, 0) / values.length;

    const width = 800;
    const height = 240;
    const paddingX = 40;
    const paddingY = 30;

    const range = max - min === 0 ? 1 : max - min;

    const pts = validReadings.map((reading, index) => {
      const val = Number(reading[activeMetric]);
      const x = paddingX + (index / (validReadings.length - 1 || 1)) * (width - 2 * paddingX);
      const y = height - paddingY - ((val - min) / range) * (height - 2 * paddingY);
      return { x, y, val, timestamp: reading.timestamp };
    });

    if (pts.length === 0) {
      return { points: [], minVal: null, maxVal: null, avgVal: null, pathD: '', areaD: '' };
    }

    const linePath = pts.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x},${pt.y}`, '');
    const firstPt = pts[0];
    const lastPt = pts[pts.length - 1];
    const areaPath = `${linePath} L ${lastPt.x},${height - paddingY} L ${firstPt.x},${height - paddingY} Z`;

    return {
      points: pts,
      minVal: min.toFixed(2),
      maxVal: max.toFixed(2),
      avgVal: avg.toFixed(2),
      pathD: linePath,
      areaD: areaPath,
    };
  }, [validReadings, activeMetric]);

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
          <h4 className="chart-title">HUMS Sensor Telemetry Trends</h4>
          <p className="chart-subtitle">Real-time time-series telemetry persisted in PostgreSQL</p>
        </div>

        <div className="metric-toggle-group" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
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

      {/* If current metric has no valid data (NULL in DB), show explicit Unavailable message */}
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
              <span className="stat-label">Min {config.label}:</span>
              <span className="stat-value">{minVal !== null ? `${minVal} ${config.unit}` : 'Unavailable'}</span>
            </div>
            <div className="stat-pill">
              <span className="stat-label">Average:</span>
              <span className="stat-value">{avgVal !== null ? `${avgVal} ${config.unit}` : 'Unavailable'}</span>
            </div>
            <div className="stat-pill">
              <span className="stat-label">Max {config.label}:</span>
              <span className="stat-value">{maxVal !== null ? `${maxVal} ${config.unit}` : 'Unavailable'}</span>
            </div>
            <div className="stat-pill">
              <span className="stat-label">Valid Readings:</span>
              <span className="stat-value">{validReadings.length} readings</span>
            </div>
          </div>

          {/* SVG Canvas Line Graph */}
          <div className="svg-chart-container">
            <svg viewBox="0 0 800 240" className="telemetry-svg" preserveAspectRatio="none">
              <defs>
                <linearGradient id={`grad-${activeMetric}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={config.color} stopOpacity="0.4" />
                  <stop offset="100%" stopColor={config.color} stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid lines */}
              <line x1="40" y1="30" x2="760" y2="30" stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
              <line x1="40" y1="105" x2="760" y2="105" stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
              <line x1="40" y1="180" x2="760" y2="180" stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
              <line x1="40" y1="210" x2="760" y2="210" stroke="rgba(255,255,255,0.12)" />

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
              {points.map((pt, i) => (
                <circle
                  key={i}
                  cx={pt.x}
                  cy={pt.y}
                  r={hoveredPoint === pt ? 5 : 2.5}
                  fill={hoveredPoint === pt ? '#FFFFFF' : config.color}
                  stroke={config.color}
                  strokeWidth="1.5"
                  className="chart-point"
                  onMouseEnter={() => setHoveredPoint(pt)}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
              ))}
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
                <div className="tooltip-val">
                  {hoveredPoint.val} {config.unit}
                </div>
                <div className="tooltip-date">
                  {new Date(hoveredPoint.timestamp).toLocaleString()}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      <div className="chart-footer">
        <span>Oldest: {new Date(sortedReadings[0].timestamp).toLocaleDateString()}</span>
        <span>Latest: {new Date(sortedReadings[sortedReadings.length - 1].timestamp).toLocaleDateString()}</span>
      </div>
    </div>
  );
}
