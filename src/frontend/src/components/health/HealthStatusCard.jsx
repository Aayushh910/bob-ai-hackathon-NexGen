import React from 'react';
import { CheckCircle2, XCircle, Server, Database, Layers, Cpu, Clock, RefreshCw } from 'lucide-react';

export default function HealthStatusCard({ healthData, isLoading, onRefresh }) {
  const isHealthy = healthData?.status === 'healthy';
  const isDbConnected = healthData?.database === 'connected';

  const cards = [
    {
      title: 'Frontend Application',
      subtitle: 'React 19 + Vite 6 Shell',
      status: 'Operational',
      isOk: true,
      icon: Layers,
      details: [
        { label: 'Framework', value: 'Vite + React' },
        { label: 'Environment', value: 'Local Development' },
        { label: 'API Base', value: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000' },
      ]
    },
    {
      title: 'Backend REST API',
      subtitle: 'FastAPI Service Engine',
      status: isHealthy ? 'Healthy (200 OK)' : 'Offline / Error',
      isOk: isHealthy,
      icon: Server,
      details: [
        { label: 'Service', value: healthData?.service || 'SentinelAI' },
        { label: 'Endpoint', value: '/api/v1/health' },
        { label: 'API Version', value: healthData?.version || '1.0.0' },
      ]
    },
    {
      title: 'PostgreSQL Database',
      subtitle: 'Relational Telemetry Store',
      status: isDbConnected ? 'Connected' : 'Disconnected',
      isOk: isDbConnected,
      icon: Database,
      details: [
        { label: 'Engine', value: 'PostgreSQL 14+' },
        { label: 'Database Name', value: 'SentinelAI' },
        { label: 'Status', value: isDbConnected ? 'Active Connection Pool' : 'Unreachable' },
      ]
    },
    {
      title: 'ML Foundation Layer',
      subtitle: 'Model Artifacts & Pipelines',
      status: 'Foundation Ready',
      isOk: true,
      icon: Cpu,
      details: [
        { label: 'Location', value: 'src/ML/' },
        { label: 'Artifacts', value: 'Models & Scalers Preserved' },
        { label: 'Inference', value: 'Phase 2+ Integration' },
      ]
    }
  ];

  return (
    <div className="health-section">
      <div className="section-header">
        <div>
          <h2 className="section-title">System Infrastructure Status</h2>
          <p className="section-subtitle">
            Live technical foundation connectivity and health diagnostics
          </p>
        </div>
        <button
          className="refresh-btn"
          onClick={onRefresh}
          disabled={isLoading}
          title="Refresh health status"
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          <span>{isLoading ? 'Checking...' : 'Check Status'}</span>
        </button>
      </div>

      <div className="grid-cards">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className={`status-card ${card.isOk ? 'card-ok' : 'card-err'}`}>
              <div className="card-top">
                <div className="card-icon-container">
                  <Icon size={22} className="card-primary-icon" />
                </div>
                <div className={`status-badge ${card.isOk ? 'badge-ok' : 'badge-err'}`}>
                  {card.isOk ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                  <span>{card.status}</span>
                </div>
              </div>

              <div className="card-content">
                <h3 className="card-title">{card.title}</h3>
                <p className="card-sub">{card.subtitle}</p>

                <div className="card-details-list">
                  {card.details.map((d, dIdx) => (
                    <div key={dIdx} className="detail-row">
                      <span className="detail-label">{d.label}:</span>
                      <span className="detail-val">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {healthData?.timestamp && (
        <div className="timestamp-bar">
          <Clock size={14} />
          <span>Last Verified: {new Date(healthData.timestamp).toLocaleString()} (UTC: {healthData.timestamp})</span>
        </div>
      )}
    </div>
  );
}
