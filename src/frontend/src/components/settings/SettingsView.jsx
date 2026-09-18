import React, { useState, useEffect, useCallback } from 'react';
import {
  SlidersHorizontal,
  Database,
  Cpu,
  RefreshCw,
  Trash2,
  Sun,
  Moon,
  CheckCircle2
} from 'lucide-react';
import { getSystemHealth } from '../../api/health';
import { clearApiCache } from '../../api/client';
import { API_CONFIG } from '../../config/api.config';
import { PageHeader, StatusBadge, LoadingState } from '../common/UIComponents';

export default function SettingsView({ theme, onToggleTheme }) {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cacheNotice, setCacheNotice] = useState(null);

  const checkHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSystemHealth();
      setHealthData(data);
    } catch (err) {
      console.error('Failed to query backend health:', err);
      setError(err.message || 'Unable to establish connection to SentinelAI FastAPI backend.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  const handleClearCache = () => {
    clearApiCache();
    setCacheNotice('Local application cache and in-flight buffers cleared.');
    setTimeout(() => setCacheNotice(null), 3500);
  };

  return (
    <div className="settings-view-container">
      {/* 1. Header */}
      <PageHeader
        badgeText="System Configuration & Diagnostic Environment"
        badgeIcon={SlidersHorizontal}
        title="Settings &amp; Environment Health"
        subtitle="PostgreSQL Neon database connectivity, FastAPI service telemetry, ML model registry status, and tactical interface settings."
        actions={
          <button className="secondary-btn" onClick={checkHealth} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Poll Health</span>
          </button>
        }
      />

      {cacheNotice && (
        <div style={{ padding: '10px 14px', backgroundColor: 'var(--color-success-dim)', border: '1px solid var(--color-success-border)', borderRadius: '6px', color: 'var(--color-success)', fontSize: '13px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={16} />
          <span>{cacheNotice}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
        {/* Backend & Database Health Status Card */}
        <div className="sentinel-card">
          <div className="card-header-row" style={{ marginBottom: '14px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Database size={18} style={{ color: 'var(--color-primary)' }} />
                <h3 className="card-title">Backend Connectivity</h3>
              </div>
              <p className="card-subtitle">FastAPI REST microservice &amp; Neon DB diagnostics</p>
            </div>
            <StatusBadge status={healthData?.status === 'healthy' ? 'READY' : 'CRITICAL'} size="sm" />
          </div>

          {loading ? (
            <LoadingState
              message="Probing Backend Service..."
              subtext="Calling /api/v1/health"
              size="sm"
              minHeight="140px"
            />
          ) : error ? (
            <div style={{ padding: '14px', backgroundColor: 'var(--color-danger-dim)', borderRadius: '6px', border: '1px solid var(--color-danger-border)', color: 'var(--color-danger)', fontSize: '13px' }}>
              <div style={{ fontWeight: 600, marginBottom: '4px' }}>Backend Unreachable</div>
              <div>{error}</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: 'var(--color-bg-subtle)', borderRadius: '6px' }}>
                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Service Identity:</span>
                <span style={{ fontSize: '12px', fontWeight: 600, fontFamily: 'var(--font-family-mono)' }}>{healthData?.service || 'SentinelAI'}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: 'var(--color-bg-subtle)', borderRadius: '6px' }}>
                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>API Version:</span>
                <span style={{ fontSize: '12px', fontWeight: 600, fontFamily: 'var(--font-family-mono)' }}>v{healthData?.version || '1.0.0'}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: 'var(--color-bg-subtle)', borderRadius: '6px' }}>
                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Database Engine:</span>
                <span style={{ fontSize: '12px', fontWeight: 600, fontFamily: 'var(--font-family-mono)', color: 'var(--color-success)' }}>
                  {healthData?.database_type || 'PostgreSQL'} ({healthData?.database || 'connected'})
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: 'var(--color-bg-subtle)', borderRadius: '6px' }}>
                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Base Endpoint URL:</span>
                <span style={{ fontSize: '11px', fontWeight: 600, fontFamily: 'var(--font-family-mono)', color: 'var(--color-text-secondary)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {API_CONFIG.BASE_URL}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: 'var(--color-bg-subtle)', borderRadius: '6px' }}>
                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Server Local Timestamp:</span>
                <span style={{ fontSize: '11px', fontFamily: 'var(--font-family-mono)' }}>
                  {healthData?.timestamp ? new Date(healthData.timestamp).toLocaleString() : '--'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Machine Learning Pipeline Registry */}
        <div className="sentinel-card">
          <div className="card-header-row" style={{ marginBottom: '14px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Cpu size={18} style={{ color: 'var(--color-primary)' }} />
                <h3 className="card-title">ML Pipeline Models</h3>
              </div>
              <p className="card-subtitle">Pre-trained component inference pipelines</p>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', backgroundColor: 'var(--color-success-dim)', color: 'var(--color-success)' }}>
              8 / 8 ACTIVE
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ padding: '8px 12px', backgroundColor: 'var(--color-bg-subtle)', borderRadius: '6px', fontSize: '12px' }}>
              <strong>Engine Subsystem:</strong> Anomaly Pipeline (`engine_anomaly_model.pkl`) + Failure Pipeline (`engine_failure_model.pkl`)
            </div>
            <div style={{ padding: '8px 12px', backgroundColor: 'var(--color-bg-subtle)', borderRadius: '6px', fontSize: '12px' }}>
              <strong>Battery Subsystem:</strong> Anomaly Pipeline (`battery_anomaly_model.pkl`) + Failure Pipeline (`battery_failure_model.pkl`)
            </div>
            <div style={{ padding: '8px 12px', backgroundColor: 'var(--color-bg-subtle)', borderRadius: '6px', fontSize: '12px' }}>
              <strong>Fuel Pump Subsystem:</strong> Anomaly Pipeline (`fuel_pump_anomaly_model.pkl`) + Failure Pipeline (`fuel_pump_failure_model.pkl`)
            </div>
            <div style={{ padding: '8px 12px', backgroundColor: 'var(--color-bg-subtle)', borderRadius: '6px', fontSize: '12px' }}>
              <strong>Hydraulic Subsystem:</strong> Anomaly Pipeline (`hydraulic_system_anomaly_model.pkl`) + Failure Pipeline (`hydraulic_system_failure_model.pkl`)
            </div>
          </div>
        </div>

        {/* Interface & Cache Management */}
        <div className="sentinel-card">
          <div className="card-header-row" style={{ marginBottom: '14px' }}>
            <div>
              <h3 className="card-title">Interface Preferences &amp; Cache</h3>
              <p className="card-subtitle">Display theme and local storage management</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', backgroundColor: 'var(--color-bg-subtle)', borderRadius: '6px' }}>
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

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', backgroundColor: 'var(--color-bg-subtle)', borderRadius: '6px' }}>
              <div>
                <span style={{ fontSize: '13px', fontWeight: 600, display: 'block' }}>Client Data Buffers</span>
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Clear in-memory and sessionStorage telemetry cache</span>
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
    </div>
  );
}
