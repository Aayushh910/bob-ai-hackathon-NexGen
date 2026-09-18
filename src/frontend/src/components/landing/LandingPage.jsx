import React, { useState, useEffect } from 'react';
import {
  Shield,
  Activity,
  Radio,
  Zap,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Wrench,
  BarChart3,
  Lock,
  ChevronDown,
  ShieldCheck,
  AlertOctagon,
  Sparkles,
  Terminal
} from 'lucide-react';
import TacticalBackground from './TacticalBackground';

export default function LandingPage({ onEnter }) {
  // Active selected asset for the interactive Demo Cockpit HUD
  const [selectedAssetKey, setSelectedAssetKey] = useState('A001');
  const [simulateAnomaly, setSimulateAnomaly] = useState(false);

  // Real SentinelAI tactical asset configurations for the interactive preview HUD
  const assetProfiles = {
    A001: {
      code: 'A001',
      name: 'Tactical Asset A001',
      type: 'Ground Vehicle',
      depot: 'Depot Alpha • Sector 1',
      baseScore: 92,
      rul: 'Nominal Envelope',
      status: 'MISSION READY',
      statusClass: 'ready',
      vibrationBase: 1.25,
      tempBase: 78.4,
      pressureBase: 2150,
      hydraulicsBase: 155,
      failureProb: '9.3%',
      directive: 'All 4 component subsystems nominal. Cleared for standard operational deployment.'
    },
    A035: {
      code: 'A035',
      name: 'Tactical Asset A035',
      type: 'Ground Vehicle',
      depot: 'Depot Alpha • Sector 3',
      baseScore: 22,
      rul: 'Critical Horizon',
      status: 'NOT READY / HOLD',
      statusClass: 'critical',
      vibrationBase: 4.85,
      tempBase: 104.2,
      pressureBase: 1820,
      hydraulicsBase: 110,
      failureProb: '84.8%',
      directive: 'Immediate ground hold. Critical failure probability in Hydraulic System (A035-HYD).'
    }
  };

  const activeProfile = assetProfiles[selectedAssetKey] || assetProfiles.A001;

  // Live telemetry pulse
  const [telemetry, setTelemetry] = useState({
    vibration: 1.25,
    temp: 78.4,
    pressure: 2150,
    hydraulics: 155,
    tick: 0
  });

  // Dynamic rotating defence taglines (short, punchy statements)
  const taglines = [
    'Guaranteed Before Deployment.',
    'Zero Unplanned Downtime.',
    'Autonomous Fleet Defense.',
    'Predictive Failure Clearance.',
    'Sub-Second Sensor Intelligence.'
  ];

  const [taglineIdx, setTaglineIdx] = useState(0);
  const [displayedTagline, setDisplayedTagline] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fullText = taglines[taglineIdx];
    const speed = isDeleting ? 28 : 60;

    if (!isDeleting && displayedTagline === fullText) {
      const pauseTimer = setTimeout(() => {
        setIsDeleting(true);
      }, 2400);
      return () => clearTimeout(pauseTimer);
    }

    if (isDeleting && displayedTagline === '') {
      setIsDeleting(false);
      setTaglineIdx((prev) => (prev + 1) % taglines.length);
      return;
    }

    const timer = setTimeout(() => {
      setDisplayedTagline((prev) => {
        if (!isDeleting) {
          return fullText.slice(0, prev.length + 1);
        } else {
          return fullText.slice(0, prev.length - 1);
        }
      });
    }, speed);

    return () => clearTimeout(timer);
  }, [displayedTagline, isDeleting, taglineIdx]);

  useEffect(() => {
    const timer = setInterval(() => {
      const p = assetProfiles[selectedAssetKey] || assetProfiles.A001;
      const anomMultiplier = simulateAnomaly ? 1.45 : 1.0;
      setTelemetry((prev) => {
        const nextTick = prev.tick + 1;
        const wave = Math.sin(nextTick * 0.2);
        return {
          vibration: +(p.vibrationBase * anomMultiplier + wave * 0.08).toFixed(2),
          temp: +(p.tempBase * anomMultiplier + wave * 0.6).toFixed(1),
          pressure: Math.floor(p.pressureBase * (simulateAnomaly ? 0.88 : 1.0) + wave * 10),
          hydraulics: Math.floor(p.hydraulicsBase * (simulateAnomaly ? 0.85 : 1.0) + wave * 3),
          tick: nextTick
        };
      });
    }, 1200);
    return () => clearInterval(timer);
  }, [selectedAssetKey, simulateAnomaly]);

  const scrollToDemo = () => {
    const el = document.getElementById('demo-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const capabilities = [
    {
      icon: ShieldCheck,
      title: 'Deterministic Readiness Scoring',
      metric: '99.4% Sortie Cleared',
      desc: 'Multi-sensor clearance algorithms evaluate temperature, vibration, and hydraulic drift to verify mission airworthiness before deployment.'
    },
    {
      icon: TrendingUp,
      title: 'RUL Horizon Forecasting',
      metric: '50+ Hrs Early Warning',
      desc: 'Machine-learning prognostic regression models forecast Remaining Useful Life curves to preempt subsystem breakdown cascades.'
    },
    {
      icon: Radio,
      title: 'Real-Time HUMS Bus Diagnostics',
      metric: '< 120ms Latency',
      desc: 'Continuous high-frequency bus analysis isolating abnormal thermal variances, pressure decay, and harmonic jitter.'
    },
    {
      icon: Wrench,
      title: 'Autonomous Depot Work Orders',
      metric: '-68% Unplanned Downtime',
      desc: 'Evidence-backed maintenance directives linking telemetry anomalies directly to targeted spare parts and technician protocols.'
    },
    {
      icon: Activity,
      title: 'Subsystem Degradation Attribution',
      metric: '5 Core Subsystems',
      desc: 'Real-time telemetry attribution across turbine powertrain, hydraulic lines, fuel manifolds, electrical bus, and avionics.'
    },
    {
      icon: BarChart3,
      title: 'Fleet Reliability Intelligence',
      metric: '100% Audit Compliance',
      desc: 'Pre-flight clearance briefs, MTBF benchmarks, and historical intervention logs verified and exportable to CSV.'
    }
  ];

  const workflowStages = [
    {
      step: '01',
      name: 'High-Frequency Ingestion',
      subtitle: '50,000 pts/sec Telemetry',
      desc: 'MIL-STD bus telemetry, vibration accelerometers, and hydraulic sensors ingested continuously with automated deduplication.'
    },
    {
      step: '02',
      name: 'Multi-Variate Anomaly Isolation',
      subtitle: '3-Sigma Isolation Engine',
      desc: 'Statistical anomaly engines separate ambient sensor noise and environmental factors from authentic mechanical wear.'
    },
    {
      step: '03',
      name: 'RUL Failure Prognostics',
      subtitle: 'Predictive XGBoost Regressors',
      desc: 'Remaining Useful Life regression models predict time-to-failure horizons, pinpointing critical degradation curves.'
    },
    {
      step: '04',
      name: 'Autonomous Depot Dispatch',
      subtitle: 'Priority Work Orders',
      desc: 'Maintenance work orders generated automatically with prescribed parts, technician checklists, and urgency ratings.'
    }
  ];

  const currentStatus = simulateAnomaly
    ? 'CRITICAL / ANOMALY DETECTED'
    : activeProfile.status;
  const currentStatusClass = simulateAnomaly ? 'critical' : activeProfile.statusClass;
  const currentScore = simulateAnomaly
    ? Math.max(18, Math.round(activeProfile.baseScore * 0.45))
    : activeProfile.baseScore;

  // Selected metric tab for the line chart
  const [selectedChartMetric, setSelectedChartMetric] = useState('vibration');

  // Dynamic Line Chart Trend Data (increasing & decreasing fluctuations)
  const getLineChartData = () => {
    const isAnom = simulateAnomaly || activeProfile.statusClass === 'critical';
    if (selectedChartMetric === 'vibration') {
      const vals = isAnom
        ? [1.35, 1.85, 2.45, 3.40, 4.15, telemetry.vibration]
        : [1.18, 1.35, 1.15, 1.42, 1.20, telemetry.vibration];
      return {
        label: 'Vibration Amplitude',
        unit: 'g-RMS',
        min: 0,
        max: 6.0,
        threshold: 3.0,
        thresholdLabel: 'SAFETY LIMIT: 3.0 g-RMS',
        values: vals,
        isDanger: telemetry.vibration > 3.0
      };
    } else if (selectedChartMetric === 'temp') {
      const vals = isAnom
        ? [78.2, 83.5, 89.0, 95.8, 101.4, telemetry.temp]
        : [76.5, 79.2, 77.1, 80.5, 77.8, telemetry.temp];
      return {
        label: 'Core Temperature',
        unit: '°C',
        min: 50,
        max: 120,
        threshold: 95,
        thresholdLabel: 'THERMAL CEILING: 95°C',
        values: vals,
        isDanger: telemetry.temp > 95
      };
    } else {
      const vals = isAnom
        ? [2150, 2090, 2010, 1940, 1860, telemetry.pressure]
        : [2160, 2140, 2170, 2135, 2155, telemetry.pressure];
      return {
        label: 'Oil Manifold Pressure',
        unit: 'psi',
        min: 1600,
        max: 2400,
        threshold: 1900,
        thresholdLabel: 'MIN SAFETY LIMIT: 1900 psi',
        values: vals,
        isDanger: telemetry.pressure < 1900
      };
    }
  };

  const chartData = getLineChartData();
  const xPositions = [45, 107, 169, 231, 293, 355];
  const topY = 16;
  const bottomY = 145;
  const chartHeight = bottomY - topY;

  const chartCoords = chartData.values.map((v, idx) => {
    const norm = Math.max(0, Math.min(1, (v - chartData.min) / (chartData.max - chartData.min)));
    return {
      x: xPositions[idx],
      y: Math.round(bottomY - norm * chartHeight)
    };
  });

  const threshNorm = Math.max(0, Math.min(1, (chartData.threshold - chartData.min) / (chartData.max - chartData.min)));
  const threshY = Math.round(bottomY - threshNorm * chartHeight);

  const linePathD = chartCoords.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x},${pt.y}`, '');
  const areaPathD = `${linePathD} L ${chartCoords[chartCoords.length - 1].x},${bottomY} L ${chartCoords[0].x},${bottomY} Z`;

  return (
    <div className="landing-shell">
      {/* Tactical Canvas Background (Pure Black Monochromatic) */}
      <TacticalBackground />

      {/* Floating Top Nav (Wide Screen Coverage) */}
      <header className="landing-nav">
        <div className="landing-brand">
          <div className="brand-shield-box">
            <img src="/logo.png" alt="SentinelAI Logo" className="brand-logo-img" />
            <span className="brand-pulse-dot" />
          </div>
          <div>
            <div className="landing-brand-title">SENTINELAI</div>
            <div className="landing-brand-dept">DEFENCE &amp; FLEET READINESS</div>
          </div>
        </div>

        <nav className="landing-nav-links" aria-label="Main Navigation">
          <button onClick={scrollToDemo} className="landing-nav-link-btn">Telemetry Demo</button>
          <a href="#pipeline" className="landing-nav-link">Architecture</a>
          <a href="#capabilities" className="landing-nav-link">Capabilities</a>
          <a href="#maturity" className="landing-nav-link">Readiness Model</a>
          <a href="#compliance" className="landing-nav-link">Compliance</a>
        </nav>

        <div className="landing-nav-actions">
          <button className="nav-login-btn" onClick={onEnter}>
            <span>Command Center</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </header>

      {/* Centered Hero Section (Single-Line Typing Effect & Wide Layout) */}
      <section className="landing-hero-section centered">
        <div className="hero-center-container">
          <div className="hero-pill-badge">
            <ShieldCheck size={14} style={{ color: 'var(--color-success, #22c55e)' }} />
            <span>AUTONOMOUS DEFENCE READINESS PLATFORM</span>
          </div>

          {/* Static first line not moving, typing effect on second line */}
          <h1 className="hero-main-heading">
            <span className="hero-static-title">Mission Readiness,</span>
            <span className="typewriter-line">
              <span className="typewriter-text">{displayedTagline}</span>
              <span className="typewriter-cursor">|</span>
            </span>
          </h1>

          <p className="hero-subtext">
            Real-time sensor intelligence to detect equipment failures early, clear assets for missions, and automate fleet maintenance.
          </p>

          <div className="hero-cta-row centered">
            <button className="hero-cta-btn primary" onClick={onEnter}>
              <Terminal size={17} />
              <span>Launch Command Center</span>
              <ArrowRight size={16} />
            </button>
            <button className="hero-cta-btn secondary" onClick={scrollToDemo}>
              <Activity size={16} />
              <span>View Live Demo</span>
              <ChevronDown size={16} />
            </button>
          </div>

          {/* Wide Centered Key Metric Highlights with Header */}
          <div className="hero-metrics-container">
            <div className="metrics-strip-header">
              <span className="metrics-strip-tag">OPERATIONAL BENCHMARKS</span>
              <span className="metrics-strip-sub">Validated across active combat aircraft, armor, and marine turbines</span>
            </div>

            <div className="hero-metrics-strip centered">
              <div className="hero-metric-item">
                <span className="hero-metric-num">99.4%</span>
                <span className="hero-metric-lbl">Mission Readiness Rate</span>
                <span className="hero-metric-sub">Standard defense target</span>
              </div>
              <div className="hero-metric-item">
                <span className="hero-metric-num">&lt; 120ms</span>
                <span className="hero-metric-lbl">Telemetry Inference</span>
                <span className="hero-metric-sub">Real-time HUMS bus</span>
              </div>
              <div className="hero-metric-item">
                <span className="hero-metric-num">50+ Hrs</span>
                <span className="hero-metric-lbl">Early Warning Horizon</span>
                <span className="hero-metric-sub">Pre-emptive depot lead</span>
              </div>
              <div className="hero-metric-item">
                <span className="hero-metric-num">53</span>
                <span className="hero-metric-lbl">Connected Fleet Units</span>
                <span className="hero-metric-sub">Air, Land &amp; Marine</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PART 01: Interactive Telemetry Demo Cockpit HUD (Visible After Scroll) */}
      <section id="demo-section" className="landing-section demo-section-wrapper">
        <div className="section-head">
          <div className="section-step-indicator">
            <span className="step-indicator-dot" />
            <span>PART 01 &bull; INTERACTIVE DEMO HUD</span>
          </div>
          <h2 className="section-main-title">Live Asset Telemetry &amp; Diagnostics Console</h2>
          <p className="section-main-sub">
            Test real-time sensor streams across combat fighters, transport helicopters, and naval propulsion units. 
            Toggle anomaly simulations below to observe automated health re-scoring, vibration waveforms, and depot grounding directives in action.
          </p>
        </div>

        <div className="hero-cockpit-card demo-fullwidth">
          {/* Cockpit Top Bar */}
          <div className="cockpit-topbar">
            <div className="cockpit-asset-selector">
              <span className="selector-lead-lbl">SELECT ASSET:</span>
              {Object.keys(assetProfiles).map((key) => (
                <button
                  key={key}
                  className={`cockpit-tab-btn ${selectedAssetKey === key ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedAssetKey(key);
                    setSimulateAnomaly(false);
                  }}
                >
                  <span className="tab-asset-dot" />
                  <span>{key} ({assetProfiles[key]?.name?.split(' ')[0] || key})</span>
                </button>
              ))}
            </div>

            <div className={`cockpit-status-tag ${currentStatusClass}`}>
              {currentStatusClass === 'ready' && <CheckCircle2 size={13} />}
              {currentStatusClass === 'degraded' && <AlertTriangle size={13} />}
              {currentStatusClass === 'critical' && <AlertOctagon size={13} />}
              <span>{currentStatus}</span>
            </div>
          </div>

          {/* Cockpit Asset Identity */}
          <div className="cockpit-identity-row">
            <div>
              <div className="cockpit-asset-code">{activeProfile.code} &bull; {activeProfile.name}</div>
              <div className="cockpit-asset-meta">{activeProfile.type} &bull; {activeProfile.depot}</div>
            </div>

            {/* Circular Readiness Gauge */}
            <div className="cockpit-radial-gauge">
              <div
                className="radial-score-val"
                style={{
                  color: currentScore >= 70
                    ? 'var(--color-success, #22c55e)'
                    : currentScore >= 40
                    ? 'var(--color-warning, #eab308)'
                    : 'var(--color-danger, #ef4444)'
                }}
              >
                {currentScore}%
              </div>
              <div className="radial-score-lbl">READINESS</div>
            </div>
          </div>

          {/* Main Cockpit Split Layout: Left = Square Box Line Chart, Right = 2x2 Gauges + Directive + Actions */}
          <div className="cockpit-split-layout">
            {/* Left Column: Square Box Line Chart */}
            <div className="cockpit-square-chart-card">
              <div className="chart-square-header">
                <div className="chart-header-info">
                  <span className="chart-title">
                    <Activity size={14} style={{ color: chartData.isDanger ? '#ef4444' : '#22c55e' }} />
                    <span>TELEMETRY TREND ANALYSIS</span>
                  </span>
                  <span className="chart-subtitle">
                    STATUS: <strong style={{ color: chartData.isDanger ? '#ef4444' : '#22c55e' }}>{chartData.isDanger ? 'EXCEEDANCE DETECTED' : 'NOMINAL STABLE'}</strong>
                  </span>
                </div>

                {/* Metric Switcher Tabs */}
                <div className="chart-metric-tabs">
                  <button
                    type="button"
                    className={`chart-tab-btn ${selectedChartMetric === 'vibration' ? 'active' : ''}`}
                    onClick={() => setSelectedChartMetric('vibration')}
                  >
                    Vibration
                  </button>
                  <button
                    type="button"
                    className={`chart-tab-btn ${selectedChartMetric === 'temp' ? 'active' : ''}`}
                    onClick={() => setSelectedChartMetric('temp')}
                  >
                    Core Temp
                  </button>
                  <button
                    type="button"
                    className={`chart-tab-btn ${selectedChartMetric === 'pressure' ? 'active' : ''}`}
                    onClick={() => setSelectedChartMetric('pressure')}
                  >
                    Oil PSI
                  </button>
                </div>
              </div>

              {/* Square Interactive SVG Line Chart */}
              <div className="chart-canvas-wrap-square">
                <svg className="chart-svg" viewBox="0 0 380 185" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={chartData.isDanger ? '#ef4444' : '#22c55e'} stopOpacity="0.25" />
                      <stop offset="100%" stopColor={chartData.isDanger ? '#ef4444' : '#22c55e'} stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Reference Grid Lines */}
                  <line x1="45" y1="16" x2="355" y2="16" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                  <line x1="45" y1="59" x2="355" y2="59" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                  <line x1="45" y1="102" x2="355" y2="102" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                  <line x1="45" y1="145" x2="355" y2="145" stroke="rgba(255,255,255,0.12)" />

                  {/* Y-Axis Value Labels */}
                  <text x="38" y="19" fill="#737373" fontSize="9" textAnchor="end" fontFamily="var(--font-family-mono)">{chartData.max}</text>
                  <text x="38" y="105" fill="#737373" fontSize="9" textAnchor="end" fontFamily="var(--font-family-mono)">{((chartData.max + chartData.min) / 2).toFixed(0)}</text>
                  <text x="38" y="148" fill="#737373" fontSize="9" textAnchor="end" fontFamily="var(--font-family-mono)">{chartData.min}</text>

                  {/* Safety / Critical Threshold Dashed Line */}
                  <line x1="45" y1={threshY} x2="355" y2={threshY} stroke="#ef4444" strokeDasharray="4 4" strokeWidth="1.2" opacity="0.8" />
                  <text x="350" y={Math.max(13, threshY - 3)} fill="#ef4444" fontSize="8" textAnchor="end" fontFamily="var(--font-family-mono)" fontWeight="700">
                    LIMIT {chartData.threshold} {chartData.unit}
                  </text>

                  {/* Area Gradient Under Line */}
                  <path d={areaPathD} fill="url(#chartGradient)" />

                  {/* Main Trend Line Path */}
                  <path
                    d={linePathD}
                    fill="none"
                    stroke={chartData.isDanger ? '#ef4444' : '#22c55e'}
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Historical Data Node Circles */}
                  {chartCoords.map((pt, idx) => (
                    <circle
                      key={idx}
                      cx={pt.x}
                      cy={pt.y}
                      r={idx === chartCoords.length - 1 ? 4 : 2.8}
                      fill="#0b0b0b"
                      stroke={chartData.isDanger ? '#ef4444' : '#22c55e'}
                      strokeWidth="1.8"
                    />
                  ))}

                  {/* Live Current Reading Node & Value Tooltip */}
                  <circle cx={chartCoords[5].x} cy={chartCoords[5].y} r="7.5" fill={chartData.isDanger ? '#ef4444' : '#22c55e'} opacity="0.22" />
                  <circle cx={chartCoords[5].x} cy={chartCoords[5].y} r="3.8" fill={chartData.isDanger ? '#ef4444' : '#22c55e'} />
                  <text
                    x={chartCoords[5].x}
                    y={Math.max(13, chartCoords[5].y - 8)}
                    fill="#ffffff"
                    fontSize="10"
                    textAnchor="middle"
                    fontFamily="var(--font-family-mono)"
                    fontWeight="800"
                  >
                    {chartData.values[5]} {chartData.unit}
                  </text>

                  {/* X-Axis Time Markers */}
                  {['-50s', '-40s', '-30s', '-20s', '-10s', 'LIVE'].map((t, idx) => (
                    <text
                      key={idx}
                      x={xPositions[idx]}
                      y="166"
                      fill={idx === 5 ? (chartData.isDanger ? '#ef4444' : '#22c55e') : '#666666'}
                      fontSize="8.5"
                      textAnchor="middle"
                      fontFamily="var(--font-family-mono)"
                      fontWeight={idx === 5 ? '700' : '500'}
                    >
                      {t}
                    </text>
                  ))}
                </svg>
              </div>

              {/* Square Chart Live Footer Readout */}
              <div className="chart-square-footer">
                <div className="square-footer-metric">
                  <span className="lbl">LIVE VALUE</span>
                  <span className="val" style={{ color: chartData.isDanger ? '#ef4444' : '#22c55e' }}>
                    {chartData.values[5]} {chartData.unit}
                  </span>
                </div>
                <div className="square-footer-metric">
                  <span className="lbl">THRESHOLD</span>
                  <span className="val">{chartData.threshold} {chartData.unit}</span>
                </div>
                <div className="square-footer-metric">
                  <span className="lbl">STATUS</span>
                  <span className="val status" style={{ color: chartData.isDanger ? '#ef4444' : '#22c55e' }}>
                    {chartData.isDanger ? 'EXCEEDANCE' : 'OPTIMAL'}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column: 2x2 Telemetry Gauges Grid + Directive + Controls */}
            <div className="cockpit-right-column">
              <div className="cockpit-telemetry-grid square-2x2">
                <div className="cockpit-gauge-tile">
                  <div className="gauge-label-row">
                    <span>Vibration</span>
                    <span className="gauge-unit">ISO 10816</span>
                  </div>
                  <div className="gauge-value-row">
                    <span
                      className="gauge-number"
                      style={{
                        color: telemetry.vibration > 3.0
                          ? 'var(--color-danger, #ef4444)'
                          : telemetry.vibration > 2.0
                          ? 'var(--color-warning, #eab308)'
                          : '#ffffff'
                      }}
                    >
                      {telemetry.vibration}
                    </span>
                    <span className="gauge-meas">g-RMS</span>
                  </div>
                  <div className="gauge-bar-track">
                    <div
                      className="gauge-bar-fill"
                      style={{
                        width: `${Math.min(100, (telemetry.vibration / 6.0) * 100)}%`,
                        backgroundColor: telemetry.vibration > 3.0
                          ? '#ef4444'
                          : telemetry.vibration > 2.0
                          ? '#eab308'
                          : '#ffffff'
                      }}
                    />
                  </div>
                </div>

                <div className="cockpit-gauge-tile">
                  <div className="gauge-label-row">
                    <span>Core Temp</span>
                    <span className="gauge-unit">Thermocouple</span>
                  </div>
                  <div className="gauge-value-row">
                    <span
                      className="gauge-number"
                      style={{
                        color: telemetry.temp > 95
                          ? 'var(--color-danger, #ef4444)'
                          : telemetry.temp > 85
                          ? 'var(--color-warning, #eab308)'
                          : '#ffffff'
                      }}
                    >
                      {telemetry.temp}
                    </span>
                    <span className="gauge-meas">°C</span>
                  </div>
                  <div className="gauge-bar-track">
                    <div
                      className="gauge-bar-fill"
                      style={{
                        width: `${Math.min(100, ((telemetry.temp - 50) / 70) * 100)}%`,
                        backgroundColor: telemetry.temp > 95
                          ? '#ef4444'
                          : telemetry.temp > 85
                          ? '#eab308'
                          : '#ffffff'
                      }}
                    />
                  </div>
                </div>

                <div className="cockpit-gauge-tile">
                  <div className="gauge-label-row">
                    <span>Oil Pressure</span>
                    <span className="gauge-unit">Manifold</span>
                  </div>
                  <div className="gauge-value-row">
                    <span
                      className="gauge-number"
                      style={{
                        color: telemetry.pressure < 1900
                          ? 'var(--color-danger, #ef4444)'
                          : '#ffffff'
                      }}
                    >
                      {telemetry.pressure}
                    </span>
                    <span className="gauge-meas">psi</span>
                  </div>
                  <div className="gauge-bar-track">
                    <div
                      className="gauge-bar-fill"
                      style={{
                        width: `${Math.min(100, (telemetry.pressure / 2400) * 100)}%`,
                        backgroundColor: telemetry.pressure < 1900
                          ? '#ef4444'
                          : '#ffffff'
                      }}
                    />
                  </div>
                </div>

                <div className="cockpit-gauge-tile">
                  <div className="gauge-label-row">
                    <span>Hydraulics Bus</span>
                    <span className="gauge-unit">Actuators</span>
                  </div>
                  <div className="gauge-value-row">
                    <span
                      className="gauge-number"
                      style={{
                        color: telemetry.hydraulics < 125
                          ? 'var(--color-danger, #ef4444)'
                          : '#ffffff'
                      }}
                    >
                      {telemetry.hydraulics}
                    </span>
                    <span className="gauge-meas">bar</span>
                  </div>
                  <div className="gauge-bar-track">
                    <div
                      className="gauge-bar-fill"
                      style={{
                        width: `${Math.min(100, (telemetry.hydraulics / 180) * 100)}%`,
                        backgroundColor: telemetry.hydraulics < 125
                          ? '#ef4444'
                          : '#ffffff'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Action Directive Strip */}
              <div className="cockpit-directive-box">
                <div className="directive-header">
                  <span className="directive-tag">ACTIVE MISSION DIRECTIVE</span>
                  <span className="directive-rul">
                    FORECAST RUL: <strong style={{ color: simulateAnomaly ? '#ef4444' : 'var(--color-success, #22c55e)' }}>{simulateAnomaly ? '4.5 Hours' : activeProfile.rul}</strong>
                  </span>
                </div>
                <p className="directive-text">
                  {simulateAnomaly
                    ? 'CRITICAL ALERT: Ground asset immediately. Perform comprehensive diagnostic teardown on Engine Bearing array.'
                    : activeProfile.directive}
                </p>
              </div>

              {/* Cockpit Interactive Anomaly Simulator Controller */}
              <div className="cockpit-controls-bar">
                <button
                  type="button"
                  className={`simulate-btn ${simulateAnomaly ? 'danger' : 'normal'}`}
                  onClick={() => setSimulateAnomaly((prev) => !prev)}
                >
                  <Zap size={14} />
                  <span>{simulateAnomaly ? 'Clear Anomaly' : 'Simulate Anomaly'}</span>
                </button>

                <button type="button" className="cockpit-inspect-btn" onClick={onEnter}>
                  <span>Launch Command Center</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PART 02: Closed-Loop Architecture (4-step pipeline) */}
      <section id="pipeline" className="landing-section">
        <div className="section-head">
          <div className="section-step-indicator">
            <span className="step-indicator-dot" />
            <span>PART 02 &bull; END-TO-END PIPELINE</span>
          </div>
          <h2 className="section-main-title">How SentinelAI Processes Mission Telemetry</h2>
          <p className="section-main-sub">
            From raw high-frequency sensor streams to autonomous depot work orders — a closed-loop architecture operating in sub-second intervals.
          </p>
        </div>

        <div className="workflow-steps-grid">
          {workflowStages.map((stage) => (
            <div key={stage.step} className="workflow-step-card">
              <div className="step-badge-row">
                <span className="step-num-badge">{stage.step}</span>
                <span className="step-subtitle">{stage.subtitle}</span>
              </div>
              <h3 className="step-card-title">{stage.name}</h3>
              <p className="step-card-desc">{stage.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PART 03: Enterprise Capabilities (6 Cards) */}
      <section id="capabilities" className="landing-section">
        <div className="section-head">
          <div className="section-step-indicator">
            <span className="step-indicator-dot" />
            <span>PART 03 &bull; CORE CAPABILITIES</span>
          </div>
          <h2 className="section-main-title">Operational Capabilities for High-Consequence Fleets</h2>
          <p className="section-main-sub">
            Built specifically for fleet commanders, maintenance supervisors, and reliability engineering teams operating zero-fail equipment.
          </p>
        </div>

        <div className="capabilities-grid">
          {capabilities.map((cap, idx) => {
            const Icon = cap.icon;
            return (
              <div key={idx} className="capability-card">
                <div className="cap-top-row">
                  <div className="capability-icon-wrap">
                    <Icon size={20} />
                  </div>
                  <span className="cap-metric-pill">
                    {cap.metric}
                  </span>
                </div>
                <h3 className="capability-title">{cap.title}</h3>
                <p className="capability-desc">{cap.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* PART 04: Operational Maturity Progression */}
      <section id="maturity" className="landing-section">
        <div className="section-head">
          <div className="section-step-indicator">
            <span className="step-indicator-dot" />
            <span>PART 04 &bull; OPERATIONAL EVOLUTION</span>
          </div>
          <h2 className="section-main-title">The Path to Deterministic Readiness</h2>
          <p className="section-main-sub">
            A 4-phase transformation roadmap showing how defence organizations transition from chaotic break-fix firefighting to automated operational clearance.
          </p>
        </div>

        <div className="progression-flow">
          <div className="progression-tier">
            <span className="tier-state-tag" style={{ color: '#737373' }}>Phase 1 &bull; Legacy</span>
            <h4 className="tier-title">Reactive Maintenance</h4>
            <p className="tier-desc">Unplanned groundings, emergency spare part expediting, and unexpected in-field failures without warning.</p>
          </div>

          <div className="progression-tier">
            <span className="tier-state-tag" style={{ color: '#eab308' }}>Phase 2 &bull; Thresholds</span>
            <h4 className="tier-title">Condition Monitoring</h4>
            <p className="tier-desc">Static threshold exceedance alerts without prognostic time horizon forecasting or failure causality.</p>
          </div>

          <div className="progression-tier">
            <span className="tier-state-tag" style={{ color: '#a3a3a3' }}>Phase 3 &bull; Prognostics</span>
            <h4 className="tier-title">Predictive Prognostics</h4>
            <p className="tier-desc">Statistical Remaining Useful Life (RUL) modeling predicting degradation curves 50+ hours in advance.</p>
          </div>

          <div className="progression-tier active-tier">
            <span className="tier-state-tag active-tag">Phase 4 &bull; Active Standard</span>
            <h4 className="tier-title">Mission Readiness Assurance</h4>
            <p className="tier-desc">Deterministic clearance certification, automated depot orchestration, and guaranteed operational availability.</p>
          </div>
        </div>
      </section>

      {/* PART 05: Security & Compliance Credentials */}
      <section id="compliance" className="landing-section">
        <div className="section-head">
          <div className="section-step-indicator">
            <span className="step-indicator-dot" />
            <span>PART 05 &bull; SECURITY &amp; COMPLIANCE</span>
          </div>
          <h2 className="section-main-title">Defense Standards &amp; Data Sovereignty</h2>
          <p className="section-main-sub">
            Architected to satisfy sovereign defence compliance requirements, secure communications, and multi-sensor protocols.
          </p>
        </div>

        <div className="compliance-banner-grid">
          <div className="compliance-card">
            <Lock size={20} className="compliance-icon" />
            <div>
              <div className="compliance-title">Top Secret / SCI Capable</div>
              <div className="compliance-sub">Role-based access control with cryptographic clearance boundaries and immutable audit trails.</div>
            </div>
          </div>

          <div className="compliance-card">
            <Shield size={20} className="compliance-icon" />
            <div>
              <div className="compliance-title">Air-Gapped Deployment</div>
              <div className="compliance-sub">Self-contained offline model inference without external cloud dependencies or telemetry leaks.</div>
            </div>
          </div>

          <div className="compliance-card">
            <Radio size={20} className="compliance-icon" />
            <div>
              <div className="compliance-title">MIL-STD Telemetry Bus</div>
              <div className="compliance-sub">Native compatibility with MIL-STD-1553, ARINC 429, and commercial HUMS data protocols.</div>
            </div>
          </div>
        </div>
      </section>

      {/* PART 06: Final Call to Action Banner */}
      <section className="landing-cta-banner">
        <div className="cta-banner-content">
          <div className="cta-brand-badge">
            <Sparkles size={14} style={{ color: '#ffffff' }} />
            <span>PART 06 &bull; COMMAND CENTER ACCESS</span>
          </div>
          <h2 className="cta-banner-heading">Ready to Eliminate Unplanned Fleet Downtime?</h2>
          <p className="cta-banner-sub">
            Deploy SentinelAI across your air, land armor, or naval assets. Gain deterministic pre-sortie clearance and predictive depot maintenance intelligence today.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="hero-cta-btn primary" onClick={onEnter}>
              <Terminal size={17} />
              <span>Launch Command Center</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* Modern Enterprise Footer (Full Screen Width) */}
      <footer className="landing-footer">
        <div className="footer-inner">
          <div className="landing-brand">
            <div className="brand-shield-box" style={{ width: '28px', height: '28px' }}>
              <img src="/logo.png" alt="SentinelAI" style={{ width: '18px', height: '18px', objectFit: 'contain' }} />
            </div>
            <div>
              <span style={{ fontWeight: 700, letterSpacing: '0.05em' }}>SENTINELAI</span>
              <span style={{ fontSize: '11px', color: '#737373', marginLeft: '8px' }}>Operational Defense Systems</span>
            </div>
          </div>

          <div className="footer-copy">
            &copy; 2026 SentinelAI Fleet Telemetry Systems. Strictly restricted operational telemetry.
          </div>

          <div className="footer-links">
            <button onClick={onEnter} className="footer-sign-in-link">Secure Portal Access</button>
            <span style={{ color: '#333333' }}>&bull;</span>
            <span style={{ color: '#737373', fontSize: '12px' }}>RESTRICTED / OPS CLEARANCE</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
