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
  Cpu,
  BarChart3,
  Layers,
  Lock,
  ChevronRight
} from 'lucide-react';
import TacticalBackground from './TacticalBackground';

export default function LandingPage({ onEnter }) {
  // Live simulated telemetry reading for the Hero preview card
  const [telemetry, setTelemetry] = useState({
    vibration: 1.4,
    temp: 82.5,
    pressure: 2150,
    rpm: 1850,
    hydraulics: 152,
    voltage: 24.2,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTelemetry({
        vibration: +(1.2 + Math.random() * 0.4).toFixed(2),
        temp: +(81 + Math.random() * 3).toFixed(1),
        pressure: Math.floor(2120 + Math.random() * 60),
        rpm: Math.floor(1830 + Math.random() * 40),
        hydraulics: Math.floor(150 + Math.random() * 5),
        voltage: +(24.0 + Math.random() * 0.4).toFixed(1),
      });
    }, 1800);
    return () => clearInterval(timer);
  }, []);

  const capabilities = [
    {
      icon: Shield,
      title: 'Fleet Readiness Tracking',
      desc: 'Deterministic operational clearance scoring across land, aviation, and naval assets with automated ground-truth validation.'
    },
    {
      icon: TrendingUp,
      title: 'Predictive Failure Risk',
      desc: 'Remaining Useful Life (RUL) horizon forecasting and early degradation warning prior to mission-critical subsystem lockup.'
    },
    {
      icon: Radio,
      title: 'Real-Time Anomaly Detection',
      desc: 'Continuous multi-variate sensor telemetry evaluation isolating thermal spikes, pressure decays, and harmonic deviations.'
    },
    {
      icon: Wrench,
      title: 'Maintenance Intelligence',
      desc: 'Prescriptive depot-level work orders, priority service queues, and automated technician intervention roadmaps.'
    },
    {
      icon: Activity,
      title: 'Subsystem Health Diagnostics',
      desc: 'Comprehensive structural analysis covering powertrain, hydraulics, avionics, electrical, and propulsion subsystems.'
    },
    {
      icon: BarChart3,
      title: 'Operational Analytics',
      desc: 'Fleet-wide reliability trends, MTBF benchmarking, and mission availability metrics exportable for command review.'
    }
  ];

  const workflowSteps = [
    {
      step: '01',
      title: 'Telemetry Ingestion',
      desc: 'Real-time HUMS streams, vibration harmonics, thermal sensors, and pressure bus data captured at high frequency.'
    },
    {
      step: '02',
      title: 'Health Intelligence',
      desc: 'Real-time baseline calibration, variance isolation, and subsystem operational state attribution.'
    },
    {
      step: '03',
      title: 'Risk Prediction',
      desc: 'Machine-learning prognostic inference calculating failure probability and Remaining Useful Life (RUL).'
    },
    {
      step: '04',
      title: 'Actionable Maintenance',
      desc: 'Automated work-order generation, depot clearance directives, and preventative component dispatching.'
    }
  ];

  return (
    <div className="landing-shell">
      {/* Tactical Dynamic Background Animation */}
      <TacticalBackground />

      {/* Top Navigation */}
      <header className="landing-nav">
        <div className="landing-brand">
          <div className="brand-shield-box">
            <Shield size={20} />
            <span className="brand-pulse-dot" />
          </div>
          <span className="landing-brand-title">SENTINELAI</span>
        </div>

        <nav className="landing-nav-links" aria-label="Main Navigation">
          <a href="#capabilities" className="landing-nav-link">Capabilities</a>
          <a href="#workflow" className="landing-nav-link">Architecture</a>
          <a href="#readiness" className="landing-nav-link">Readiness Model</a>
        </nav>

        <button className="primary-btn" onClick={onEnter}>
          Sign In
          <ChevronRight size={16} />
        </button>
      </header>

      {/* Hero Section */}
      <section className="landing-hero-section">
        <div className="hero-left-col">
          <div className="hero-pill-badge">
            <Activity size={13} style={{ color: 'var(--color-success)' }} />
            <span>Mission Readiness Platform</span>
          </div>

          <h1 className="hero-main-heading">
            Mission Readiness,<br />Powered by Intelligence.
          </h1>

          <p className="hero-subtext">
            Continuous equipment health monitoring, predictive failure detection,
            maintenance intelligence, and real-time operational availability visibility
            for defence and enterprise fleet operations.
          </p>

          <div className="hero-cta-row">
            <button className="hero-cta-btn primary" onClick={onEnter}>
              Sign In to Command Center
              <ArrowRight size={16} />
            </button>
            <a href="#capabilities" className="hero-cta-btn secondary">
              Explore Platform
            </a>
          </div>

          <div className="hero-metrics-strip">
            <div className="hero-metric-item">
              <span className="hero-metric-num">99.4%</span>
              <span className="hero-metric-lbl">Mission Readiness Target</span>
            </div>
            <div className="hero-metric-item">
              <span className="hero-metric-num">&lt; 150ms</span>
              <span className="hero-metric-lbl">Telemetry Inference Latency</span>
            </div>
            <div className="hero-metric-item">
              <span className="hero-metric-num">50+ Hrs</span>
              <span className="hero-metric-lbl">Early Warning Horizon</span>
            </div>
          </div>
        </div>

        {/* Hero Right: Live Telemetry Preview Card */}
        <div className="hero-preview-card">
          <div className="preview-card-header">
            <div>
              <span className="preview-title">ASSET #A001 &bull; Sentinel-HUMS-V1</span>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Main Depot Sector 4 &bull; Active HUMS Stream</div>
            </div>
            <div className="preview-pill">
              <CheckCircle2 size={12} />
              <span>MISSION READY</span>
            </div>
          </div>

          <div className="preview-gauges-grid">
            <div className="preview-gauge-card">
              <span className="gauge-lbl">Vibration</span>
              <span className="gauge-val">{telemetry.vibration} <span style={{ fontSize: '12px', color: '#737373' }}>g</span></span>
              <span className="gauge-status-text" style={{ color: 'var(--color-success)' }}>Nominal Baseline</span>
            </div>

            <div className="preview-gauge-card">
              <span className="gauge-lbl">Core Temp</span>
              <span className="gauge-val">{telemetry.temp} <span style={{ fontSize: '12px', color: '#737373' }}>°C</span></span>
              <span className="gauge-status-text" style={{ color: 'var(--color-success)' }}>Thermal Equilibrium</span>
            </div>

            <div className="preview-gauge-card">
              <span className="gauge-lbl">Oil Pressure</span>
              <span className="gauge-val">{telemetry.pressure} <span style={{ fontSize: '12px', color: '#737373' }}>psi</span></span>
              <span className="gauge-status-text" style={{ color: 'var(--color-success)' }}>Optimal Flow</span>
            </div>

            <div className="preview-gauge-card">
              <span className="gauge-lbl">Hydraulics</span>
              <span className="gauge-val">{telemetry.hydraulics} <span style={{ fontSize: '12px', color: '#737373' }}>bar</span></span>
              <span className="gauge-status-text" style={{ color: 'var(--color-success)' }}>Bus Nominal</span>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #1a1a1a', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#737373' }}>Readiness Score: <strong style={{ color: '#ffffff' }}>94 / 100</strong></span>
            <span style={{ fontSize: '12px', color: '#737373' }}>Predicted RUL: <strong style={{ color: '#22c55e' }}>240+ Hours</strong></span>
          </div>
        </div>
      </section>

      {/* Trust / Value Strip */}
      <section className="landing-value-strip">
        <div className="value-strip-container">
          <div className="value-strip-item">
            <div className="value-icon-box"><Activity size={20} /></div>
            <div>
              <div className="value-item-title">Real-time Health</div>
              <div className="value-item-desc">Continuous telemetry synthesis across all mechanical and electrical subsystems.</div>
            </div>
          </div>

          <div className="value-strip-item">
            <div className="value-icon-box"><TrendingUp size={20} /></div>
            <div>
              <div className="value-item-title">Predictive Risk</div>
              <div className="value-item-desc">Multi-horizon prognostic models isolating catastrophic failure probabilities.</div>
            </div>
          </div>

          <div className="value-strip-item">
            <div className="value-icon-box"><Wrench size={20} /></div>
            <div>
              <div className="value-item-title">Intelligent Maintenance</div>
              <div className="value-item-desc">Automated work orders and depot directives prioritized by mission impact.</div>
            </div>
          </div>

          <div className="value-strip-item">
            <div className="value-icon-box"><Shield size={20} /></div>
            <div>
              <div className="value-item-title">Mission Readiness</div>
              <div className="value-item-desc">Objective operational clearance gates preventing in-field breakdowns.</div>
            </div>
          </div>
        </div>
      </section>

      {/* How SentinelAI Works (4-step flow) */}
      <section id="workflow" className="landing-section">
        <div className="section-head">
          <div className="section-tag">Operational Pipeline</div>
          <h2 className="section-main-title">How SentinelAI Works</h2>
          <p className="section-main-sub">
            From sensor bus ingestion to commanding depot interventions — a closed-loop intelligence architecture.
          </p>
        </div>

        <div className="workflow-steps-grid">
          {workflowSteps.map((step) => (
            <div key={step.step} className="workflow-step-card">
              <div className="step-num-badge">{step.step}</div>
              <h3 className="step-card-title">{step.title}</h3>
              <p className="step-card-desc">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Core Capabilities (6 cards) */}
      <section id="capabilities" className="landing-section" style={{ backgroundColor: '#050505', borderTop: '1px solid #1a1a1a', borderBottom: '1px solid #1a1a1a' }}>
        <div className="section-head">
          <div className="section-tag">Enterprise Capabilities</div>
          <h2 className="section-main-title">Built for Mission-Critical Reliability</h2>
          <p className="section-main-sub">
            Engineered specifically for fleet commanders, maintenance crews, and reliability engineers.
          </p>
        </div>

        <div className="capabilities-grid">
          {capabilities.map((cap, idx) => {
            const Icon = cap.icon;
            return (
              <div key={idx} className="capability-card">
                <div className="capability-icon-wrap">
                  <Icon size={22} />
                </div>
                <h3 className="capability-title">{cap.title}</h3>
                <p className="capability-desc">{cap.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Readiness Progression Section */}
      <section id="readiness" className="landing-section">
        <div className="section-head">
          <div className="section-tag">Operational Maturity</div>
          <h2 className="section-main-title">The Evolution to Mission Readiness</h2>
          <p className="section-main-sub">
            Transforming legacy break-fix maintenance into proactive operational assurance.
          </p>
        </div>

        <div className="progression-flow">
          <div className="progression-tier">
            <span className="tier-state-tag" style={{ color: '#737373' }}>Phase 1</span>
            <h4 className="tier-title">Reactive Maintenance</h4>
            <p className="tier-desc">Unplanned downtime, high emergency repair costs, and in-service mission failures.</p>
          </div>

          <div className="progression-tier">
            <span className="tier-state-tag" style={{ color: '#eab308' }}>Phase 2</span>
            <h4 className="tier-title">Condition Awareness</h4>
            <p className="tier-desc">Threshold alarms and visual telemetry dashboards without predictive horizon forecasting.</p>
          </div>

          <div className="progression-tier">
            <span className="tier-state-tag" style={{ color: '#f97316' }}>Phase 3</span>
            <h4 className="tier-title">Predictive Maintenance</h4>
            <p className="tier-desc">Remaining Useful Life estimation and degradation curve modeling before damage cascades.</p>
          </div>

          <div className="progression-tier current">
            <span className="tier-state-tag" style={{ color: '#22c55e' }}>Phase 4 &bull; Active</span>
            <h4 className="tier-title">Mission Readiness</h4>
            <p className="tier-desc">Deterministic clearance certification, automated depot orchestration, and zero surprise failures.</p>
          </div>
        </div>
      </section>

      {/* Final Call to Action Banner */}
      <section className="landing-cta-banner">
        <h2 className="cta-banner-heading">Ready to Secure Fleet Availability?</h2>
        <p className="cta-banner-sub">
          Deploy SentinelAI for real-time telemetry diagnostics, predictive risk horizons, and operational certainty.
        </p>
        <button className="hero-cta-btn primary" onClick={onEnter} style={{ margin: '0 auto' }}>
          Access SentinelAI Platform
          <ArrowRight size={16} />
        </button>
      </section>

      {/* Enterprise Footer */}
      <footer className="landing-footer">
        <div className="footer-inner">
          <div className="landing-brand">
            <Shield size={18} />
            <span style={{ fontWeight: 700, letterSpacing: '0.05em' }}>SENTINELAI</span>
          </div>

          <div className="footer-copy">
            &copy; 2026 SentinelAI Defence &amp; Fleet Systems. All rights reserved.
          </div>

          <div className="footer-links">
            <button onClick={onEnter} style={{ color: '#a3a3a3' }}>Sign In</button>
            <span style={{ color: '#333333' }}>&bull;</span>
            <span style={{ color: '#737373' }}>Security Classification: RESTRICTED</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
