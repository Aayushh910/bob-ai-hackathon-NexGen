import React, { useState, useMemo, useEffect } from 'react';
import { Activity, Thermometer, Gauge, Zap, Waves, Disc, AlertTriangle, ShieldCheck } from 'lucide-react';
import ThemeDropdown from '../common/ThemeDropdown';

export const METRIC_CONFIGS = {
  temperature:         { label: 'Temperature',        unit: '°C',       color: '#f59e0b', lightColor: '#d97706', icon: Thermometer },
  vibration:           { label: 'Vibration',           unit: 'g',        color: '#ef4444', lightColor: '#dc2626', icon: Waves },
  oil_pressure:        { label: 'Oil Pressure',        unit: 'psi',      color: '#10b981', lightColor: '#059669', icon: Gauge },
  fuel_pressure:       { label: 'Fuel Pressure',       unit: 'psi',      color: '#f97316', lightColor: '#ea580c', icon: Zap },
  hydraulic_pressure:  { label: 'Hydraulic Pressure',  unit: 'psi',      color: '#06b6d4', lightColor: '#0284c7', icon: Activity },
  rpm:                 { label: 'Engine RPM',           unit: 'RPM',      color: '#8b5cf6', lightColor: '#7c3aed', icon: Disc },
};

export const OPERATIONAL_THRESHOLDS = {
  temperature:        { ucl: 85.0, nominal: 68.0, label: 'UCL: 85.0°C' },
  vibration:          { ucl: 2.50, nominal: 1.20, label: 'UCL: 2.50 g' },
  oil_pressure:       { ucl: 85.0, lcl: 45.0, nominal: 65.0, label: 'UCL: 85.0 psi' },
  fuel_pressure:      { ucl: 65.0, lcl: 30.0, nominal: 48.0, label: 'UCL: 65.0 psi' },
  hydraulic_pressure: { ucl: 3200, lcl: 2200, nominal: 2800, label: 'UCL: 3200 psi' },
  rpm:                { ucl: 2400, nominal: 2100, label: 'UCL: 2400 RPM' },
};

export default function TelemetryChart({
  readings = [],
  activeMetric: propActiveMetric,
  onMetricChange,
  showControls = false
}) {
  const [internalMetric, setInternalMetric] = useState('temperature');
  const activeMetric = propActiveMetric || internalMetric;
  const setActiveMetric = onMetricChange || setInternalMetric;

  const [hoveredPoint, setHoveredPoint] = useState(null);

  // Dynamic Theme Detection
  const [isLightTheme, setIsLightTheme] = useState(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.getAttribute('data-theme') === 'light';
    }
    return false;
  });

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const observer = new MutationObserver(() => {
      setIsLightTheme(document.documentElement.getAttribute('data-theme') === 'light');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  // Sort readings chronologically
  const sortedReadings = useMemo(() => {
    return [...readings].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }, [readings]);

  // Identify which metrics have actual data
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

  useEffect(() => {
    if (availableMetrics.size > 0 && !availableMetrics.has(activeMetric)) {
      const firstAvail = Array.from(availableMetrics)[0];
      if (firstAvail) {
        setActiveMetric(firstAvail);
      }
    }
  }, [availableMetrics, activeMetric, setActiveMetric]);

  const rawConfig = METRIC_CONFIGS[activeMetric] || METRIC_CONFIGS.temperature;
  const strokeColor = isLightTheme ? rawConfig.lightColor : rawConfig.color;
  const threshold = OPERATIONAL_THRESHOLDS[activeMetric];

  // Filter valid readings
  const validReadings = useMemo(() => {
    return sortedReadings.filter(
      (r) => r[activeMetric] !== null && r[activeMetric] !== undefined && !isNaN(Number(r[activeMetric]))
    );
  }, [sortedReadings, activeMetric]);

  // SVG Coordinates & Boundaries
  const { points, minVal, maxVal, avgVal, pathD, areaD, uclY, nominalY, breachedCount, xTimeLabels } = useMemo(() => {
    if (validReadings.length === 0) {
      return { points: [], minVal: null, maxVal: null, avgVal: null, pathD: '', areaD: '', uclY: null, nominalY: null, breachedCount: 0, xTimeLabels: [] };
    }

    const values = validReadings.map((r) => Number(r[activeMetric]));
    let min = Math.min(...values);
    let max = Math.max(...values);
    const avg = values.reduce((sum, v) => sum + v, 0) / values.length;

    if (threshold?.ucl) {
      max = Math.max(max, threshold.ucl * 1.05);
    }
    if (threshold?.nominal) {
      min = Math.min(min, threshold.nominal * 0.95);
    }

    const width = 640;
    const height = 240;
    const paddingLeft = 46;
    const paddingRight = 24;
    const paddingTop = 28;
    const paddingBottom = 34;

    const plotW = width - paddingLeft - paddingRight;
    const plotH = height - paddingTop - paddingBottom;
    const range = max - min === 0 ? 1 : max - min;

    let breached = 0;
    const pts = validReadings.map((reading, index) => {
      const val = Number(reading[activeMetric]);
      const isBreached = threshold?.ucl !== undefined && val > threshold.ucl;
      if (isBreached) breached++;

      const x = paddingLeft + (index / (validReadings.length - 1 || 1)) * plotW;
      const y = paddingTop + plotH - ((val - min) / range) * plotH;
      return { x, y, val, timestamp: reading.timestamp, isBreached };
    });

    const linePath = pts.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x},${pt.y}`, '');
    const firstPt = pts[0];
    const lastPt = pts[pts.length - 1];
    const baseY = paddingTop + plotH;
    const areaPath = `${linePath} L ${lastPt.x},${baseY} L ${firstPt.x},${baseY} Z`;

    let computedUclY = null;
    let computedNominalY = null;

    if (threshold?.ucl !== undefined) {
      computedUclY = paddingTop + plotH - ((threshold.ucl - min) / range) * plotH;
    }
    if (threshold?.nominal !== undefined) {
      computedNominalY = paddingTop + plotH - ((threshold.nominal - min) / range) * plotH;
    }

    // Time markers for X axis
    const timeLabels = [];
    if (pts.length > 0) {
      timeLabels.push({ x: firstPt.x, label: new Date(firstPt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
      if (pts.length > 2) {
        const midIdx = Math.floor(pts.length / 2);
        timeLabels.push({ x: pts[midIdx].x, label: new Date(pts[midIdx].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
      }
      timeLabels.push({ x: lastPt.x, label: new Date(lastPt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
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
      breachedCount: breached,
      xTimeLabels: timeLabels
    };
  }, [validReadings, activeMetric, threshold]);

  // Color tokens based on theme
  const gridColor = isLightTheme ? 'rgba(0, 0, 0, 0.07)' : 'rgba(255, 255, 255, 0.07)';
  const axisColor = isLightTheme ? 'rgba(0, 0, 0, 0.16)' : 'rgba(255, 255, 255, 0.14)';
  const textColor = isLightTheme ? '#64748b' : '#a1a1aa';
  const canvasBg = isLightTheme ? '#f8fafc' : '#08080a';
  const canvasBorder = isLightTheme ? '#e2e8f0' : '#1f1f23';

  if (sortedReadings.length === 0) {
    return (
      <div style={{ padding: '36px 20px', textAlign: 'center', backgroundColor: canvasBg, borderRadius: '8px', border: `1px solid ${canvasBorder}` }}>
        <Activity size={28} style={{ color: textColor, margin: '0 auto 8px' }} />
        <p style={{ color: textColor, fontSize: '13px', margin: 0 }}>
          No historical sensor readings available for this component.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
      {/* Optional Top Metric Controls (if standalone) */}
      {showControls && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Sensor Channel:</span>
            <ThemeDropdown
              value={activeMetric}
              onChange={(val) => setActiveMetric(val)}
              placeholder="Select Metric..."
              minWidth="180px"
              options={Object.entries(METRIC_CONFIGS).map(([k, cfg]) => ({
                value: k,
                label: `${cfg.label} (${cfg.unit}) ${!availableMetrics.has(k) ? '(N/A)' : ''}`
              }))}
            />
          </div>

          <div>
            {breachedCount > 0 ? (
              <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', backgroundColor: 'var(--color-danger-dim)', color: 'var(--color-danger)', border: '1px solid var(--color-danger-border)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <AlertTriangle size={11} />
                {breachedCount} LIMIT BREACHES
              </span>
            ) : (
              <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', backgroundColor: 'var(--color-success-dim)', color: 'var(--color-success)', border: '1px solid var(--color-success-border)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <ShieldCheck size={11} />
                WITHIN NOMINAL BAND
              </span>
            )}
          </div>
        </div>
      )}

      {/* Main Waveform SVG Container (Proportional, Non-Stretchy) */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          backgroundColor: canvasBg,
          borderRadius: '8px',
          border: `1px solid ${canvasBorder}`,
          padding: '8px',
          boxSizing: 'border-box'
        }}
      >
        <svg
          viewBox="0 0 640 240"
          preserveAspectRatio="xMidYMid meet"
          style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
        >
          <defs>
            <linearGradient id={`grad-telemetry-${activeMetric}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity={isLightTheme ? 0.35 : 0.45} />
              <stop offset="100%" stopColor={strokeColor} stopOpacity={0.0} />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1="46" y1="28" x2="616" y2="28" stroke={gridColor} strokeDasharray="3 3" />
          <line x1="46" y1="88" x2="616" y2="88" stroke={gridColor} strokeDasharray="3 3" />
          <line x1="46" y1="148" x2="616" y2="148" stroke={gridColor} strokeDasharray="3 3" />
          <line x1="46" y1="206" x2="616" y2="206" stroke={axisColor} strokeWidth="1.5" />

          {/* Y Axis line */}
          <line x1="46" y1="20" x2="46" y2="206" stroke={axisColor} strokeWidth="1.5" />

          {/* Nominal Reference Line */}
          {nominalY !== null && nominalY >= 25 && nominalY <= 200 && (
            <g>
              <line
                x1="46"
                y1={nominalY}
                x2="616"
                y2={nominalY}
                stroke={isLightTheme ? '#16a34a' : '#22c55e'}
                strokeWidth="1.5"
                strokeDasharray="5 4"
                strokeOpacity="0.8"
              />
              <text
                x="612"
                y={nominalY - 4}
                fill={isLightTheme ? '#16a34a' : '#22c55e'}
                fontSize="9"
                fontFamily="var(--font-family-mono, monospace)"
                textAnchor="end"
                fontWeight="700"
              >
                Nominal: {threshold.nominal} {rawConfig.unit}
              </text>
            </g>
          )}

          {/* Upper Critical Limit (UCL) Line */}
          {uclY !== null && uclY >= 25 && uclY <= 200 && (
            <g>
              <line
                x1="46"
                y1={uclY}
                x2="616"
                y2={uclY}
                stroke={isLightTheme ? '#dc2626' : '#ef4444'}
                strokeWidth="1.8"
                strokeDasharray="4 3"
                strokeOpacity="0.9"
              />
              <text
                x="612"
                y={uclY - 4}
                fill={isLightTheme ? '#dc2626' : '#ef4444'}
                fontSize="9"
                fontFamily="var(--font-family-mono, monospace)"
                textAnchor="end"
                fontWeight="800"
              >
                CRITICAL LIMIT ({threshold.ucl} {rawConfig.unit})
              </text>
            </g>
          )}

          {/* Shaded Area */}
          {areaD && (
            <path d={areaD} fill={`url(#grad-telemetry-${activeMetric})`} />
          )}

          {/* Main Waveform Path */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke={strokeColor}
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Data Points */}
          {points.map((pt, i) => {
            const isBreached = pt.isBreached;
            const isHovered = hoveredPoint === pt;
            return (
              <g key={i}>
                {isBreached && (
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isHovered ? 8 : 5}
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="1.5"
                    strokeOpacity="0.75"
                  />
                )}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 4.5 : isBreached ? 3 : 2}
                  fill={isBreached ? '#ef4444' : isHovered ? (isLightTheme ? '#0f172a' : '#ffffff') : strokeColor}
                  stroke={isBreached ? '#991b1b' : strokeColor}
                  strokeWidth="1.5"
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredPoint(pt)}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
              </g>
            );
          })}

          {/* X Axis Time Labels */}
          {xTimeLabels.map((lbl, idx) => (
            <text
              key={idx}
              x={lbl.x}
              y="222"
              fill={textColor}
              fontSize="9"
              fontFamily="var(--font-family-mono, monospace)"
              textAnchor={idx === 0 ? 'start' : idx === xTimeLabels.length - 1 ? 'end' : 'middle'}
            >
              {lbl.label}
            </text>
          ))}
        </svg>

        {/* Floating Tooltip */}
        {hoveredPoint && (
          <div
            style={{
              position: 'absolute',
              left: `${(hoveredPoint.x / 640) * 100}%`,
              top: `${(hoveredPoint.y / 240) * 100}%`,
              transform: 'translate(-50%, -125%)',
              backgroundColor: isLightTheme ? '#ffffff' : '#141418',
              border: `1px solid ${isLightTheme ? '#cbd5e1' : '#2e2e36'}`,
              borderRadius: '6px',
              padding: '6px 10px',
              boxShadow: isLightTheme ? '0 4px 16px rgba(0,0,0,0.1)' : '0 6px 20px rgba(0,0,0,0.6)',
              pointerEvents: 'none',
              zIndex: 10,
              whiteSpace: 'nowrap'
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 700, color: hoveredPoint.isBreached ? '#ef4444' : (isLightTheme ? '#0f172a' : '#ffffff'), fontFamily: 'var(--font-family-mono)' }}>
              {hoveredPoint.val} {rawConfig.unit} {hoveredPoint.isBreached ? '⚠️ LIMIT BREACH' : ''}
            </div>
            <div style={{ fontSize: '10px', color: textColor, marginTop: '2px' }}>
              {new Date(hoveredPoint.timestamp).toLocaleString()}
            </div>
          </div>
        )}
      </div>

      {/* Visual Legend */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: textColor, padding: '2px 4px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '12px', height: '3px', backgroundColor: strokeColor, display: 'inline-block', borderRadius: '1px' }}></span>
            <span>{rawConfig.label} Curve</span>
          </div>
          {threshold?.ucl && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '12px', height: '2px', borderTop: '2px dashed #ef4444', display: 'inline-block' }}></span>
              <span style={{ color: isLightTheme ? '#dc2626' : '#ef4444' }}>UCL ({threshold.ucl} {rawConfig.unit})</span>
            </div>
          )}
          {threshold?.nominal && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '12px', height: '2px', borderTop: '2px dashed #16a34a', display: 'inline-block' }}></span>
              <span style={{ color: isLightTheme ? '#16a34a' : '#22c55e' }}>Nominal</span>
            </div>
          )}
        </div>

        <div style={{ fontSize: '10px', fontFamily: 'var(--font-family-mono)' }}>
          {validReadings.length} data points logged
        </div>
      </div>
    </div>
  );
}
