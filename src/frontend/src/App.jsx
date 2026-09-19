import React, { useState, useEffect, useCallback } from 'react';
import AppShell from './components/layout/AppShell';
import OverviewView from './components/overview/OverviewView';
import FleetOverview from './components/fleet/FleetOverview';
import AssetInspectionView from './components/fleet/AssetInspectionView';
import ComponentAnalysisView from './components/components/ComponentAnalysisView';
import PredictionsView from './components/predictions/PredictionsView';
import TrendsHealthView from './components/trends/TrendsHealthView';
import MLCopilotView from './components/copilot/MLCopilotView';
import ReportsView from './components/reports/ReportsView';
import SettingsView from './components/settings/SettingsView';
import LandingPage from './components/landing/LandingPage';
import LoginPage from './components/landing/LoginPage';
import ErrorBoundary from './components/common/ErrorBoundary';
import { getSystemHealth } from './api/health';
import { checkSession, logout } from './api/auth';

const VALID_TABS = [
  'overview',
  'fleet',
  'predictions',
  'trends',
  'copilot',
  'reports',
  'settings'
];

export default function App() {
  const [isInitializing, setIsInitializing] = useState(true);
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('landing'); // 'landing' | 'login' | 'dashboard'
  const [sessionNotice, setSessionNotice] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Contextual views state
  const [inspectingAssetId, setInspectingAssetId] = useState(null);
  const [analyzingComponentId, setAnalyzingComponentId] = useState(null);

  // Keep-alive cache
  const [visitedTabs, setVisitedTabs] = useState(() => new Set(['overview']));
  const [healthData, setHealthData] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem('sentinel_theme') || 'dark');

  // 1. Initial Authentication Check on Mount
  useEffect(() => {
    let isMounted = true;
    async function verifyInitialSession() {
      try {
        const session = await checkSession();
        if (!isMounted) return;

        const hash = window.location.hash.replace(/^#/, '');

        if (session?.authenticated && session?.user) {
          setUser(session.user);
          if (hash === 'landing') {
            setPage('landing');
          } else {
            setPage('dashboard');
            if (VALID_TABS.includes(hash)) {
              setActiveTab(hash);
            } else {
              setActiveTab('overview');
              window.history.replaceState(null, '', '#overview');
            }
          }
        } else {
          setUser(null);
          // If user specifically requested login or a protected tab, direct to login
          if (hash === 'login') {
            setPage('login');
          } else if (VALID_TABS.includes(hash)) {
            setPage('login');
            setSessionNotice('Please sign in to access the SentinelAI Command Center.');
            window.history.replaceState(null, '', '#login');
          } else {
            // Default to public landing page
            setPage('landing');
            window.history.replaceState(null, '', window.location.pathname);
          }
        }
      } catch (err) {
        if (!isMounted) return;
        setUser(null);
        setPage('landing');
        window.history.replaceState(null, '', window.location.pathname);
      } finally {
        if (isMounted) {
          setIsInitializing(false);
        }
      }
    }

    verifyInitialSession();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Global Session Expiration Listener (triggered on 401s from apiClient)
  useEffect(() => {
    const handleSessionExpired = (event) => {
      setUser(null);
      setPage('login');
      setSessionNotice(event.detail?.message || 'Your session has expired. Please sign in again.');
      window.history.replaceState(null, '', '#login');
    };

    window.addEventListener('sentinel:session-expired', handleSessionExpired);
    return () => {
      window.removeEventListener('sentinel:session-expired', handleSessionExpired);
    };
  }, []);

  // 3. Browser Back/Forward navigation with hash guard
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#/, '');

      if (!user) {
        if (hash === 'login') {
          setPage('login');
        } else if (VALID_TABS.includes(hash)) {
          // Reject direct access to protected dashboard tabs if not logged in
          setPage('login');
          setSessionNotice('Please sign in to access the SentinelAI Command Center.');
          window.history.replaceState(null, '', '#login');
        } else {
          setPage('landing');
        }
        return;
      }

      // If authenticated:
      if (hash === 'landing') {
        setPage('landing');
      } else if (hash === 'login') {
        // Authenticated users don't need login, route to dashboard
        setPage('dashboard');
        window.history.replaceState(null, '', `#${activeTab}`);
      } else if (VALID_TABS.includes(hash)) {
        setActiveTab(hash);
        setInspectingAssetId(null);
        setAnalyzingComponentId(null);
        setPage('dashboard');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [user, activeTab]);

  // 4. Track visited tabs for keep-alive DOM rendering
  useEffect(() => {
    if (page === 'dashboard') {
      setVisitedTabs((prev) => {
        if (prev.has(activeTab)) return prev;
        const next = new Set(prev);
        next.add(activeTab);
        return next;
      });
      window.history.replaceState(null, '', `#${activeTab}`);
    }
  }, [activeTab, page]);

  // 5. System Health Polling (only run when authenticated)
  const fetchHealth = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getSystemHealth();
      setHealthData(data);
    } catch (err) {
      console.warn('Health check warning:', err);
    }
  }, [user]);

  useEffect(() => {
    if (user && page === 'dashboard') {
      fetchHealth();
      const timer = setInterval(fetchHealth, 45000);
      return () => clearInterval(timer);
    }
  }, [user, page, fetchHealth]);

  // 6. Authentication Actions
  const handleLogin = (adminUser) => {
    setUser(adminUser);
    setSessionNotice(null);
    setPage('dashboard');

    const hash = window.location.hash.replace(/^#/, '');
    const targetTab = VALID_TABS.includes(hash) ? hash : 'overview';
    setActiveTab(targetTab);
    window.history.replaceState(null, '', `#${targetTab}`);
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setPage('landing');
    setSessionNotice(null);
    setInspectingAssetId(null);
    setAnalyzingComponentId(null);
    window.history.replaceState(null, '', window.location.pathname);
  };

  const handleBackToLanding = () => {
    setPage('landing');
    setSessionNotice(null);
    window.history.replaceState(null, '', window.location.pathname);
  };

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('sentinel_theme', next);
      return next;
    });
  };

  // 7. Contextual view navigation handlers
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

  // ── Initial Security Loading State ──
  if (isInitializing) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          backgroundColor: '#050505',
          color: '#ffffff',
          fontFamily: 'Inter, -apple-system, sans-serif'
        }}
      >
        <div style={{ width: '44px', height: '44px', marginBottom: '16px' }}>
          <img src="/logo.png" alt="SentinelAI" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
        <div style={{ fontSize: '12px', fontWeight: 600, color: '#737373', letterSpacing: '0.08em' }}>
          INITIALIZING SECURITY CLEARANCE...
        </div>
      </div>
    );
  }

  // ── Landing Page (Accessible to all users) ──
  if (page === 'landing') {
    return (
      <LandingPage
        onEnter={() => {
          if (user) {
            setPage('dashboard');
            window.history.replaceState(null, '', `#${activeTab}`);
          } else {
            setPage('login');
            window.history.replaceState(null, '', '#login');
          }
        }}
      />
    );
  }

  // ── Sign-in / Login Page (with Back to Landing Page button) ──
  if (page === 'login' || !user) {
    return (
      <LoginPage
        onLogin={handleLogin}
        onBack={handleBackToLanding}
        sessionExpiredNotice={sessionNotice}
      />
    );
  }

  // ── Authenticated State: Protected SentinelAI App Shell ──
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
            onNavigateTrends={() => {
              setActiveTab('trends');
              setAnalyzingComponentId(null);
              setInspectingAssetId(null);
            }}
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
        /* Standard 7 Protected Top-Level Views */
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
            <div style={{ display: activeTab === 'copilot' ? 'flex' : 'none', width: '100%', height: '100%', flexDirection: 'column', flex: 1 }}>
              <ErrorBoundary title="AI Copilot">
                <MLCopilotView
                  onInspectAsset={handleInspectAsset}
                  onNavigateTab={handleTabChange}
                  user={user}
                  theme={theme}
                  onToggleTheme={toggleTheme}
                />
              </ErrorBoundary>
            </div>
          )}

          {visitedTabs.has('reports') && (
            <div style={{ display: activeTab === 'reports' ? 'block' : 'none', width: '100%' }}>
              <ErrorBoundary title="Reports">
                <ReportsView />
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
