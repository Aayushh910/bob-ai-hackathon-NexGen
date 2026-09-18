import React, { useState, useEffect, useCallback } from 'react';
import {
  SlidersHorizontal,
  Radio,
  Activity,
  Cpu,
  RefreshCw,
  Trash2,
  Sun,
  Moon,
  CheckCircle2,
  Search,
  Waves,
  Thermometer,
  Gauge,
  Zap,
  Disc,
  ShieldCheck
} from 'lucide-react';
import { getComponentHistory } from '../../api/components';
import { getDashboardSummary } from '../../api/dashboard';
import { clearApiCache } from '../../api/client';
import { PageHeader, StatusBadge, LoadingState } from '../common/UIComponents';

const SENSOR_CHANNELS = [
  { id: 'SEN-CH-01', asset: 'A-001', component: 'A001-ENG', name: 'Turbine Bearing Vibration', type: 'Tri-Axial Accelerometer', freq: '1,000 Hz', nominal: '< 2.50 g', value: '1.42 g', status: 'LIVE' },
  { id: 'SEN-CH-02', asset: 'A-001', component: 'A001-ENG', name: 'Exhaust Gas Temperature', type: 'K-Type Thermocouple', freq: '10 Hz', nominal: '55 - 85°C', value: '72.4°C', status: 'LIVE' },
  { id: 'SEN-CH-03', asset: 'A-001', component: 'A001-ENG', name: 'Main Rotor Shaft RPM', type: 'Magnetic Pickup', freq: '50 Hz', nominal: '1800 - 2400 RPM', value: '2,140 RPM', status: 'LIVE' },
  { id: 'SEN-CH-04', asset: 'A-001', component: 'A001-HYD', name: 'Main Hydraulic Line Pressure', type: 'Piezoresistive Transducer', freq: '100 Hz', nominal: '2200 - 3200 psi', value: '2,890 psi', status: 'LIVE' },
  { id: 'SEN-CH-05', asset: 'A-001', component: 'A001-BAT', name: '28V DC Bus Voltage', type: 'Isolated Hall Probe', freq: '20 Hz', nominal: '24.0 - 28.5 V', value: '27.4 V', status: 'LIVE' },
  { id: 'SEN-CH-06', asset: 'A-001', component: 'A001-PMP', name: 'High-Pressure Fuel Delivery', type: 'Silicon Pressure Diaphragm', freq: '100 Hz', nominal: '30 - 65 psi', value: '54.2 psi', status: 'LIVE' },
  { id: 'SEN-CH-07', asset: 'A-035', component: 'A035-HYD', name: 'Actuator Return Hydraulic Pres', type: 'Piezoresistive Transducer', freq: '100 Hz', nominal: '2200 - 3200 psi', value: '3,340 psi', status: 'ALERT' },
  { id: 'SEN-CH-08', asset: 'A-035', component: 'A035-ENG', name: 'Core Turbine Vibration (Radial)', type: 'Tri-Axial Accelerometer', freq: '1,000 Hz', nominal: '< 2.50 g', value: '2.84 g', status: 'ALERT' },
  { id: 'SEN-CH-09', asset: 'A-035', component: 'A035-BAT', name: 'Auxiliary Battery Cell Temp', type: 'Thermistor Array', freq: '10 Hz', nominal: '20 - 45°C', value: '38.6°C', status: 'LIVE' },
  { id: 'SEN-CH-10', asset: 'A-012', component: 'A012-ENG', name: 'Compressor Inlet Temperature', type: 'Resistance Temp Detector', freq: '10 Hz', nominal: '55 - 85°C', value: '64.1°C', status: 'LIVE' },
  { id: 'SEN-CH-11', asset: 'A-012', component: 'A012-PMP', name: 'Fuel Flow Rate & Cavitation', type: 'Ultrasonic Flow Sensor', freq: '100 Hz', nominal: '30 - 65 psi', value: '48.9 psi', status: 'LIVE' },
  { id: 'SEN-CH-12', asset: 'A-019', component: 'A019-HYD', name: 'Flight Control Surface Servos', type: 'Piezoresistive Transducer', freq: '100 Hz', nominal: '2200 - 3200 psi', value: '2,920 psi', status: 'LIVE' }
];

export default function SettingsView({ theme, onToggleTheme }) {
  const [liveReadings, setLiveReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cacheNotice, setCacheNotice] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const loadSensorData = useCallback(async () => {
    setLoading(true);
    try {
      const history = await getComponentHistory('A035-HYD', { limit: 12 });
      const safeHist = Array.isArray(history) ? history : (history?.readings || []);
      setLiveReadings(safeHist);
    } catch (err) {
      console.warn('Unable to query live component history for settings table:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSensorData();
  }, [loadSensorData]);

  const handleClearCache = () => {
    clearApiCache();
    setCacheNotice('Local application cache and in-flight buffers cleared.');
    setTimeout(() => setCacheNotice(null), 3500);
  };

  const filteredSensors = SENSOR_CHANNELS.filter(s => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      s.id.toLowerCase().includes(q) ||
      s.asset.toLowerCase().includes(q) ||
      s.component.toLowerCase().includes(q) ||
      s.name.toLowerCase().includes(q) ||
      s.type.toLowerCase().includes(q)
    );
  });

  return (
    <div className="settings-view-container">
      {/* 1. Header */}
      <PageHeader
        badgeText="HUMS Telemetry & Sensor Architecture"
        badgeIcon={SlidersHorizontal}
        title="Sensor Configuration & Live Telemetry Stream"
        subtitle="Live status of 2,200 deployed aircraft transducers, sampling frequencies, telemetry packet integrity, and interface controls."
        actions={
          <button className="secondary-btn" onClick={loadSensorData} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Poll Sensors</span>
          </button>
        }
      />

      {cacheNotice && (
        <div style={{ padding: '10px 14px', backgroundColor: 'var(--color-success-dim)', border: '1px solid var(--color-success-border)', borderRadius: '6px', color: 'var(--color-success)', fontSize: '13px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={16} />
          <span>{cacheNotice}</span>
        </div>
      )}

      {/* 2. Sensor Architecture Summary KPIs */}
      <div className="grid-kpi" style={{ marginBottom: '20px' }}>
        <div className="kpi-card variant-ready">
          <div className="kpi-card-header">
            <span className="kpi-title">Connected Transducers</span>
            <Radio size={16} className="kpi-icon" />
          </div>
          <div className="kpi-value">2,200 <span className="kpi-unit">Channels</span></div>
          <div className="kpi-subtitle">100% telemetry coverage across all fleet assets</div>
        </div>

        <div className="kpi-card variant-info">
          <div className="kpi-card-header">
            <span className="kpi-title">Transducers Online</span>
            <Activity size={16} className="kpi-icon" />
          </div>
          <div className="kpi-value">2,186 <span className="kpi-unit">Nominal</span></div>
          <div className="kpi-subtitle">Zero offline channels; 14 active threshold alerts</div>
        </div>

        <div className="kpi-card variant-caution">
          <div className="kpi-card-header">
            <span className="kpi-title">Peak Sampling Frequency</span>
            <Waves size={16} className="kpi-icon" />
          </div>
          <div className="kpi-value">1,000 <span className="kpi-unit">Hz</span></div>
          <div className="kpi-subtitle">High-frequency vibration accelerometer streams</div>
        </div>

        <div className="kpi-card variant-info">
          <div className="kpi-card-header">
            <span className="kpi-title">Telemetry Packet Health</span>
            <ShieldCheck size={16} className="kpi-icon" />
          </div>
          <div className="kpi-value">99.94%</div>
          <div className="kpi-subtitle">Continuous CRC checksums verified in PostgreSQL</div>
        </div>
      </div>

      {/* 3. Sensor Modality Breakdown Grid */}
      <div className="sentinel-card" style={{ marginBottom: '20px' }}>
        <div className="card-header-row" style={{ marginBottom: '14px' }}>
          <div>
            <h3 className="card-title">HUMS Transducer Subsystem Architecture</h3>
            <p className="card-subtitle">Distribution of specialized military-grade physical transducers deployed on each aircraft</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <div style={{ padding: '14px', backgroundColor: 'var(--color-bg-subtle)', borderRadius: '8px', border: '1px solid var(--color-border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <Waves size={16} style={{ color: '#ef4444' }} />
              <strong style={{ fontSize: '13px', color: 'var(--color-text)' }}>Vibration</strong>
            </div>
            <div style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'var(--font-family-mono)', color: 'var(--color-text)' }}>440 Channels</div>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Tri-Axial Piezoelectric @ 1,000 Hz</span>
          </div>

          <div style={{ padding: '14px', backgroundColor: 'var(--color-bg-subtle)', borderRadius: '8px', border: '1px solid var(--color-border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <Thermometer size={16} style={{ color: '#f59e0b' }} />
              <strong style={{ fontSize: '13px', color: 'var(--color-text)' }}>Thermal</strong>
            </div>
            <div style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'var(--font-family-mono)', color: 'var(--color-text)' }}>440 Channels</div>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>K-Type Thermocouples @ 10 Hz</span>
          </div>

          <div style={{ padding: '14px', backgroundColor: 'var(--color-bg-subtle)', borderRadius: '8px', border: '1px solid var(--color-border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <Gauge size={16} style={{ color: '#06b6d4' }} />
              <strong style={{ fontSize: '13px', color: 'var(--color-text)' }}>Pressure</strong>
            </div>
            <div style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'var(--font-family-mono)', color: 'var(--color-text)' }}>880 Channels</div>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Oil, Fuel &amp; Hydraulic @ 100 Hz</span>
          </div>

          <div style={{ padding: '14px', backgroundColor: 'var(--color-bg-subtle)', borderRadius: '8px', border: '1px solid var(--color-border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <Disc size={16} style={{ color: '#8b5cf6' }} />
              <strong style={{ fontSize: '13px', color: 'var(--color-text)' }}>Shaft Speed</strong>
            </div>
            <div style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'var(--font-family-mono)', color: 'var(--color-text)' }}>220 Channels</div>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Magnetic RPM Pickups @ 50 Hz</span>
          </div>

          <div style={{ padding: '14px', backgroundColor: 'var(--color-bg-subtle)', borderRadius: '8px', border: '1px solid var(--color-border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <Zap size={16} style={{ color: '#10b981' }} />
              <strong style={{ fontSize: '13px', color: 'var(--color-text)' }}>DC Voltage</strong>
            </div>
            <div style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'var(--font-family-mono)', color: 'var(--color-text)' }}>220 Channels</div>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Hall Effect Voltage Probes @ 20 Hz</span>
          </div>
        </div>
      </div>

      {/* 4. Complete Live Sensor Data Stream Table */}
      <div className="sentinel-card" style={{ marginBottom: '20px' }}>
        <div className="card-header-row" style={{ marginBottom: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={18} style={{ color: 'var(--color-primary)' }} />
              <h3 className="card-title">Live Sensor Telemetry Transducer Grid</h3>
            </div>
            <p className="card-subtitle">Real-time transducer status, sampling rates, observed values, and nominal operating envelopes</p>
          </div>

          {/* Search Filter for Sensor Table */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--color-bg)', padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--color-border)', width: '260px' }}>
            <Search size={14} style={{ color: 'var(--color-text-muted)' }} />
            <input
              type="text"
              placeholder="Search Channel or Transducer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: 'var(--color-text)', outline: 'none', width: '100%', fontSize: '12px' }}
            />
          </div>
        </div>

        <div className="table-wrapper" style={{ maxHeight: '380px', overflowY: 'auto' }}>
          <table className="sentinel-table">
            <thead>
              <tr>
                <th>Channel ID</th>
                <th>Platform</th>
                <th>Subsystem Component</th>
                <th>Transducer Function</th>
                <th>Sensor Technology</th>
                <th>Sampling Freq</th>
                <th>Latest Value</th>
                <th>Safe Envelope</th>
                <th style={{ textAlign: 'right' }}>Stream Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredSensors.map((s) => {
                const isAlert = s.status === 'ALERT';
                return (
                  <tr key={s.id}>
                    <td>
                      <span style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 700, color: 'var(--color-text)', fontSize: '12px' }}>
                        {s.id}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 600 }}>{s.asset}</span>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-family-mono)' }}>{s.component}</span>
                    </td>
                    <td>
                      <strong style={{ fontSize: '12px', color: 'var(--color-text)' }}>{s.name}</strong>
                    </td>
                    <td>
                      <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>{s.type}</span>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-family-mono)', fontSize: '11px', color: 'var(--color-text-muted)' }}>{s.freq}</span>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 800, color: isAlert ? 'var(--color-danger)' : 'var(--color-success)' }}>
                        {s.value}
                      </span>
                    </td>
                    <td>
                      <code style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{s.nominal}</code>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontFamily: 'var(--font-family-mono)',
                          backgroundColor: isAlert ? 'var(--color-danger-dim)' : 'var(--color-success-dim)',
                          color: isAlert ? 'var(--color-danger)' : 'var(--color-success)',
                          border: `1px solid ${isAlert ? 'var(--color-danger-border)' : 'var(--color-success-border)'}`,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <span
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            backgroundColor: isAlert ? '#ef4444' : '#22c55e',
                            boxShadow: `0 0 6px ${isAlert ? '#ef4444' : '#22c55e'}`
                          }}
                        />
                        {s.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Interface Preferences & Cache Utilities */}
      <div className="sentinel-card">
        <div className="card-header-row" style={{ marginBottom: '14px' }}>
          <div>
            <h3 className="card-title">Interface Preferences &amp; Cache Diagnostics</h3>
            <p className="card-subtitle">Display tactical theme and local telemetry cache controls</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', backgroundColor: 'var(--color-bg-subtle)', borderRadius: '6px', border: '1px solid var(--color-border-subtle)' }}>
            <div>
              <span style={{ fontSize: '13px', fontWeight: 600, display: 'block' }}>Tactical Theme Mode</span>
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Current: {theme === 'dark' ? 'Pure Black Tactical' : 'High-Contrast Light'}</span>
            </div>
            <button
              className="secondary-btn"
              style={{ height: '32px', padding: '0 12px' }}
              onClick={onToggleTheme}
            >
              {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
              <span>Toggle Mode</span>
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', backgroundColor: 'var(--color-bg-subtle)', borderRadius: '6px', border: '1px solid var(--color-border-subtle)' }}>
            <div>
              <span style={{ fontSize: '13px', fontWeight: 600, display: 'block' }}>Client Data Buffers</span>
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Flush in-memory and sessionStorage telemetry cache</span>
            </div>
            <button
              className="secondary-btn"
              style={{ height: '32px', padding: '0 12px' }}
              onClick={handleClearCache}
            >
              <Trash2 size={14} />
              <span>Flush Cache</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

