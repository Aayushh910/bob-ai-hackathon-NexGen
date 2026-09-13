import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import HealthStatusCard from './components/health/HealthStatusCard';
import ArchitectureCard from './components/health/ArchitectureCard';
import LoadingSpinner from './components/common/LoadingSpinner';
import ErrorMessage from './components/common/ErrorMessage';
import FleetOverview from './components/fleet/FleetOverview';
import MLCopilotView from './components/copilot/MLCopilotView';
import MissionReadinessDashboard from './components/readiness/MissionReadinessDashboard';
import MaintenanceDashboard from './components/maintenance/MaintenanceDashboard';
import { getSystemHealth } from './api/health';
import { ShieldCheck, Info } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('copilot');
  const [healthData, setHealthData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchHealth = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getSystemHealth();
      setHealthData(data);
    } catch (err) {
      console.error('Failed to fetch system health:', err);
      setError(err.message || 'Unable to connect to SentinelAI Backend API.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  return (
    <div className="app-layout">
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="main-content">
        {activeTab === 'copilot' ? (
          <MLCopilotView />
        ) : activeTab === 'readiness' ? (
          <MissionReadinessDashboard />
        ) : activeTab === 'maintenance' ? (
          <MaintenanceDashboard />
        ) : activeTab === 'fleet' ? (
          <FleetOverview />
        ) : (
          <div className="content-container">
            <div className="hero-banner">
              <div className="hero-badge">
                <ShieldCheck size={14} />
                <span>Phase 7 — Production Ready & Fully Operational</span>
              </div>
              <h1 className="hero-title">SentinelAI Mission Readiness & Operational Copilot</h1>
              <p className="hero-description">
                Enterprise asset telemetry intelligence, HUMS health diagnostics, predictive intervention planning, and evidence-backed operational decision support.
              </p>
            </div>

            {isLoading && !healthData ? (
              <LoadingSpinner message="Checking backend and PostgreSQL connectivity..." />
            ) : error ? (
              <ErrorMessage message={error} onRetry={fetchHealth} />
            ) : (
              <>
                <HealthStatusCard
                  healthData={healthData}
                  isLoading={isLoading}
                  onRefresh={fetchHealth}
                />
                <ArchitectureCard />
              </>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

