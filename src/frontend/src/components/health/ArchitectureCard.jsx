import React from 'react';
import { ArrowRight, Check, Shield, Server, Database, BrainCircuit, Terminal } from 'lucide-react';

export default function ArchitectureCard() {
  const tiers = [
    {
      name: 'Frontend Foundation',
      tech: 'React 19 + Vite 6',
      desc: 'Centralized API client, reactive state, modular UI shell',
      path: 'src/frontend/',
      icon: Shield,
      phase: 'Phase 1 Active'
    },
    {
      name: 'Backend API Foundation',
      tech: 'FastAPI + Pydantic v2',
      desc: 'REST API v1 routing, CORS, JWT security & exception handling',
      path: 'src/backend/',
      icon: Server,
      phase: 'Phase 1 Active'
    },
    {
      name: 'Relational Database',
      tech: 'PostgreSQL + SQLAlchemy 2.0',
      desc: 'Connection pooling, 6 domain models, Alembic migrations',
      path: 'src/backend/alembic/',
      icon: Database,
      phase: 'Phase 1 Active'
    },
    {
      name: 'ML Foundation Layer',
      tech: 'Scikit-Learn + Joblib',
      desc: 'Datasets, preprocessing pipelines, model artifacts preserved',
      path: 'src/ML/',
      icon: BrainCircuit,
      phase: 'Preserved / Phase 2+ Ready'
    }
  ];

  return (
    <div className="architecture-section">
      <div className="section-header">
        <div>
          <h2 className="section-title">SentinelAI Architecture Overview</h2>
          <p className="section-subtitle">
            Established project structure and verified communication paths
          </p>
        </div>
      </div>

      <div className="architecture-flow">
        {tiers.map((tier, idx) => {
          const Icon = tier.icon;
          return (
            <React.Fragment key={idx}>
              <div className="tier-card">
                <div className="tier-header">
                  <div className="tier-icon-circle">
                    <Icon size={18} />
                  </div>
                  <span className="tier-badge">{tier.phase}</span>
                </div>
                <h4 className="tier-name">{tier.name}</h4>
                <div className="tier-tech">{tier.tech}</div>
                <p className="tier-desc">{tier.desc}</p>
                <div className="tier-path">
                  <Terminal size={12} />
                  <code>{tier.path}</code>
                </div>
              </div>
              {idx < tiers.length - 1 && (
                <div className="tier-arrow">
                  <ArrowRight size={20} />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
