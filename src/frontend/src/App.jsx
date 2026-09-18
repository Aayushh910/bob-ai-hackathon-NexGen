import React, { useState, useEffect, useCallback } from 'react';
import AppShell from './components/layout/AppShell';
import OverviewView from './components/overview/OverviewView';
import FleetOverview from './components/fleet/FleetOverview';
import AssetInspectionView from './components/fleet/AssetInspectionView';
import ComponentAnalysisView from './components/components/ComponentAnalysisView';
import PredictionsView from './components/predictions/PredictionsView';
import TrendsHealthView from './components/trends/TrendsHealthView';
import MLCopilotView from './components/copilot/MLCopilotView';
import SettingsView from './components/settings/SettingsView';
import LandingPage from './components/landing/LandingPage';
import LoginPage from './components/landing/LoginPage';
import ErrorBoundary from './components/common/ErrorBoundary';
import { getSystemHealth } from './api/health';

const VALID_TABS = [
  'overview',
  'fleet',
  'predictions',
  'trends',
  'copilot',
  'settings'
];

const getInitialPage = () => {
  const hash = window.location.hash.replace(/^#/, '');
  if (VALID_TABS.includes(hash)) {
    return 'dashboard';
  }
  return localStorage.getItem('sentinel_page') || 'landing';
};

const getInitialTab = () => {
  const hash = window.location.hash.replace(/^#/, '');
  if (VALID_TABS.includes(hash)) {
    return hash;
  }
  const saved = localStorage.getItem('sentinel_tab');
  if (saved && VALID_TABS.includes(saved)) {
    return saved;
  }
  return 'overview';
};

const getInitialUser = () => {
  try {
    const saved = localStorage.getItem('sentinel_user');
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.warn('Failed to parse saved user:', e);
  }
  return {
    name: 'Major Alex Vance',
    role: 'Operations Commander',
    clearance: 'TOP SECRET / SCI'
  };
};

export default function App() {
  const [page, setPage] = useState(getInitialPage); // 'landing' | 'login' | 'dashboard'
  const [user, setUser] = useState(getInitialUser);
  const [activeTab, setActiveTab] = useState(getInitialTab);

  // Contextual views state
  const [inspectingAssetId, setInspectingAssetId] = useState(null);
  const [analyzingComponentId, setAnalyzingComponentId] = useState(null);

  // Keep-alive cache
  const [visitedTabs, setVisitedTabs] = useState(() => new Set(['overview', getInitialTab()]));
  const [healthData, setHealthData] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem('sentinel_theme') || 'dark');

  // Persist page state to localStorage
  useEffect(() => {
    localStorage.setItem('sentinel_page', page);
  }, [page]);

  // Persist user to localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem('sentinel_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('sentinel_user');
    }
  }, [user]);

  // Persist activeTab and sync with URL hash
  useEffect(() => {
    if (page === 'dashboard') {
      localStorage.setItem('sentinel_tab', activeTab);
      window.history.replaceState(null, '', `#${activeTab}`);
    }
  }, [activeTab, page]);

  // Handle browser back/forward buttons with hash
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#/, '');
      if (VALID_TABS.includes(hash)) {
        setActiveTab(hash);
        setInspectingAssetId(null);
        setAnalyzingComponentId(null);
        setPage('dashboard');
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    setVisitedTabs((prev) => {
      if (prev.has(activeTab)) return prev;
      const next = new Set(prev);
      next.add(activeTab);
      return next;
    });
  }, [activeTab]);

  const fetchHealth = useCallback(async () => {
    try {
      const data = await getSystemHealth();
      setHealthData(data);
    } catch (err) {
      console.warn('Health check warning:', err);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    const timer = setInterval(fetchHealth, 45000);
    return () => clearInterval(timer);
  }, [fetchHealth]);

  const handleLogin = (userData) => {
    const loggedUser = userData || {
      name: 'Commander',
      role: 'Operations Command',
      clearance: 'SECRET'
    };
    setUser(loggedUser);
    setPage('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('sentinel_page');
    localStorage.removeItem('sentinel_user');
    localStorage.removeItem('sentinel_tab');
    window.history.replaceState(null, '', window.location.pathname);
    setUser(null);
    setPage('landing');
  };

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('sentinel_theme', next);
      return next;
    });
  };

  // Contextual view navigation handlers
  const handleInspectAsset = (assetId) => {
    setInspectingAssetId(assetId);
    setAnalyzingComponentId(null);
    setActiveTab('fleet');
  };

  const handleAnalyzeComponent = (componentId) => {
    setAnalyzingComponentId(componentId);
  };

  const handleBackFromAsset = () => {
    setInspectingAssetId(null);
    setAnalyzingComponentId(null);
  };

  const handleBackFromComponent = () => {
    setAnalyzingComponentId(null);
  };

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    setInspectingAssetId(null);
    setAnalyzingComponentId(null);
  };

  if (page === 'landing') return <LandingPage onEnter={() => setPage('login')} />;
  if (page === 'login') return <LoginPage onLogin={handleLogin} onBack={() => setPage('landing')} />;

  const isHealthy = healthData?.status === 'healthy';

  return (
    <AppShell
      activeTab={activeTab}
      onTabChange={handleTabChange}
      user={user}
      onLogout={handleLogout}
      systemHealthy={isHealthy}
      onInspectAsset={handleInspectAsset}
    >
      {/* If a component is actively selected, show ComponentAnalysisView */}
      {analyzingComponentId ? (
        <ErrorBoundary title="Component Analysis">
          <ComponentAnalysisView
            componentId={analyzingComponentId}
            onBack={handleBackFromComponent}
            onInspectParentAsset={handleInspectAsset}
          />
        </ErrorBoundary>
      ) : activeTab === 'fleet' && inspectingAssetId ? (
        /* If an asset is actively selected inside Fleet, show AssetInspectionView */
        <ErrorBoundary title="Asset Inspection">
          <AssetInspectionView
            assetId={inspectingAssetId}
            onBack={handleBackFromAsset}
            onSelectComponent={handleAnalyzeComponent}
          />
        </ErrorBoundary>
      ) : (
        /* Standard 6 Top-Level Views */
        <>
          {visitedTabs.has('overview') && (
            <div style={{ display: activeTab === 'overview' ? 'block' : 'none', width: '100%' }}>
              <ErrorBoundary title="Overview">
                <OverviewView
                  onInspectAsset={handleInspectAsset}
                  onAnalyzeComponent={handleAnalyzeComponent}
                  onNavigateCopilot={() => setActiveTab('copilot')}
                />
              </ErrorBoundary>
            </div>
          )}

          {visitedTabs.has('fleet') && (
            <div style={{ display: activeTab === 'fleet' ? 'block' : 'none', width: '100%' }}>
              <ErrorBoundary title="Fleet Assets">
                <FleetOverview onInspectAsset={handleInspectAsset} />
              </ErrorBoundary>
            </div>
          )}

          {visitedTabs.has('predictions') && (
            <div style={{ display: activeTab === 'predictions' ? 'block' : 'none', width: '100%' }}>
              <ErrorBoundary title="Predictions">
                <PredictionsView
                  onAnalyzeComponent={handleAnalyzeComponent}
                  onInspectAsset={handleInspectAsset}
                />
              </ErrorBoundary>
            </div>
          )}

          {visitedTabs.has('trends') && (
            <div style={{ display: activeTab === 'trends' ? 'block' : 'none', width: '100%' }}>
              <ErrorBoundary title="Trends & Health">
                <TrendsHealthView
                  onAnalyzeComponent={handleAnalyzeComponent}
                  onInspectAsset={handleInspectAsset}
                />
              </ErrorBoundary>
            </div>
          )}

          {visitedTabs.has('copilot') && (
            <div style={{ display: activeTab === 'copilot' ? 'block' : 'none', width: '100%' }}>
              <ErrorBoundary title="AI Copilot">
                <MLCopilotView onInspectAsset={handleInspectAsset} />
              </ErrorBoundary>
            </div>
          )}

          {visitedTabs.has('settings') && (
            <div style={{ display: activeTab === 'settings' ? 'block' : 'none', width: '100%' }}>
              <ErrorBoundary title="Settings">
                <SettingsView theme={theme} onToggleTheme={toggleTheme} />
              </ErrorBoundary>
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}
