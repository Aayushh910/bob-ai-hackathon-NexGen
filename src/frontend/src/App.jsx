import React, { useState, useEffect, useCallback } from 'react';
import AppShell from './components/layout/AppShell';
import OverviewView from './components/overview/OverviewView';
import FleetOverview from './components/fleet/FleetOverview';
import HealthView from './components/health/HealthView';
import PredictionsView from './components/predictions/PredictionsView';
import AlertsView from './components/alerts/AlertsView';
import MaintenanceDashboard from './components/maintenance/MaintenanceDashboard';
import InterventionPlanView from './components/maintenance/InterventionPlanView';
import AnalyticsView from './components/analytics/AnalyticsView';
import ReportsView from './components/reports/ReportsView';
import MissionReadinessDashboard from './components/readiness/MissionReadinessDashboard';
import LandingPage from './components/landing/LandingPage';
import LoginPage from './components/landing/LoginPage';
import ErrorBoundary from './components/common/ErrorBoundary';
import { getSystemHealth } from './api/health';

export default function App() {
  const [page, setPage] = useState('landing'); // 'landing' | 'login' | 'dashboard'
  const [user, setUser] = useState({
    name: 'Major Alex Vance',
    role: 'Operations Commander',
    clearance: 'TOP SECRET / SCI'
  });
  const [activeTab, setActiveTab] = useState('overview');
  // Keep-alive cache: track visited tabs so they mount lazily on first access, but stay mounted in memory
  const [visitedTabs, setVisitedTabs] = useState(() => new Set(['overview']));
  const [healthData, setHealthData] = useState(null);
  const [isLoadingHealth, setIsLoadingHealth] = useState(true);
  const [systemError, setSystemError] = useState(null);

  useEffect(() => {
    setVisitedTabs((prev) => {
      if (prev.has(activeTab)) return prev;
      const next = new Set(prev);
      next.add(activeTab);
      return next;
    });
  }, [activeTab]);

  const fetchHealth = useCallback(async () => {
    setIsLoadingHealth(true);
    setSystemError(null);
    try {
      const data = await getSystemHealth();
      setHealthData(data);
    } catch (err) {
      console.warn('System health polling warning:', err);
      setSystemError(err.message || 'Unable to establish connection to SentinelAI Backend API.');
    } finally {
      setIsLoadingHealth(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    const timer = setInterval(fetchHealth, 60000);
    return () => clearInterval(timer);
  }, [fetchHealth]);

  const handleLogin = (userData) => {
    setUser(userData || {
      name: 'Commander',
      role: 'Operations Command',
      clearance: 'SECRET'
    });
    setPage('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    setPage('landing');
  };

  if (page === 'landing') return <LandingPage onEnter={() => setPage('login')} />;
  if (page === 'login') return <LoginPage onLogin={handleLogin} />;

  const isHealthy = healthData?.status === 'healthy';

  const renderTab = (tabId, Component, props = {}) => {
    if (!visitedTabs.has(tabId)) return null;
    const isVisible = activeTab === tabId;
    return (
      <div
        key={tabId}
        style={{
          display: isVisible ? 'block' : 'none',
          width: '100%',
        }}
        aria-hidden={!isVisible}
      >
        <ErrorBoundary title={`${tabId.toUpperCase()} View`}>
          <Component {...props} />
        </ErrorBoundary>
      </div>
    );
  };

  return (
    <AppShell
      activeTab={activeTab}
      onTabChange={setActiveTab}
      user={user}
      onLogout={handleLogout}
      systemHealthy={isHealthy}
    >
      {renderTab('overview', OverviewView)}
      {renderTab('fleet', FleetOverview)}
      {renderTab('health', HealthView)}
      {renderTab('predictions', PredictionsView)}
      {renderTab('alerts', AlertsView)}
      {renderTab('maintenance', MaintenanceDashboard)}
      {renderTab('planning', InterventionPlanView)}
      {renderTab('analytics', AnalyticsView)}
      {renderTab('reports', ReportsView)}
      {renderTab('readiness', MissionReadinessDashboard)}
    </AppShell>
  );
}
