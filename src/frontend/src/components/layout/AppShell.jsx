import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './Sidebar';
import TopHeader from './TopHeader';
import NotificationCenter from './NotificationCenter';
import CommandPalette from './CommandPalette';
import AssetDetailModal from '../fleet/AssetDetailModal';
import { getFleetAnomalies } from '../../api/ml';
import { getRecommendations, updateRecommendationStatus } from '../../api/readiness';
import { getAssets } from '../../api/assets';

export default function AppShell({
  activeTab,
  onTabChange,
  user,
  onLogout,
  systemHealthy = true,
  children
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('sentinel_theme') || 'dark');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Global notifications & assets for search
  const [notifications, setNotifications] = useState([]);
  const [searchAssets, setSearchAssets] = useState([]);
  const [selectedInspectAsset, setSelectedInspectAsset] = useState(null);

  // Sync theme attribute to <html>
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('sentinel_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Load notifications and assets for quick jump
  const loadNotifications = useCallback(async () => {
    try {
      const [anomRes, recRes, assetsRes] = await Promise.allSettled([
        getFleetAnomalies({ limit: 8 }),
        getRecommendations({ status: 'OPEN', limit: 8 }),
        getAssets({ limit: 100 })
      ]);

      const items = [];

      if (anomRes.status === 'fulfilled' && anomRes.value?.items) {
        anomRes.value.items.forEach((a) => {
          items.push({
            id: `anom-${a.id}`,
            asset_id: a.asset_id,
            asset_code: a.asset_code || `Asset #${a.asset_id}`,
            title: `Sensor Anomaly: ${a.component_id || 'Telemetry'}`,
            description: a.description || `Deviation detected in sensor readings.`,
            severity: a.severity || 'CRITICAL',
            timestamp: a.detected_at,
          });
        });
      }

      if (recRes.status === 'fulfilled' && recRes.value?.items) {
        recRes.value.items.forEach((r) => {
          items.push({
            id: `rec-${r.id}`,
            recommendation_id: r.id,
            asset_id: r.asset_id,
            asset_code: r.asset_code || `Asset #${r.asset_id}`,
            title: `Operational Directive: ${r.priority} Priority`,
            description: r.action_directive,
            severity: r.priority,
            priority: r.priority,
            timestamp: r.created_at,
          });
        });
      }

      setNotifications(items);

      if (assetsRes.status === 'fulfilled' && assetsRes.value?.items) {
        setSearchAssets(assetsRes.value.items);
      }
    } catch (err) {
      console.warn('Could not load global notification streams:', err);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
    const handleUpdate = () => loadNotifications();
    window.addEventListener('sentinel:data-updated', handleUpdate);
    const interval = setInterval(loadNotifications, 45000);
    return () => {
      window.removeEventListener('sentinel:data-updated', handleUpdate);
      clearInterval(interval);
    };
  }, [loadNotifications]);

  const handleAcknowledgeRecommendation = async (recId) => {
    try {
      await updateRecommendationStatus(recId, 'ACKNOWLEDGED');
      setNotifications((prev) => prev.filter((n) => n.recommendation_id !== recId));
      window.dispatchEvent(new CustomEvent('sentinel:data-updated'));
    } catch (err) {
      console.error('Failed to acknowledge recommendation:', err);
    }
  };

  const handleInspectAsset = (assetId, assetCode) => {
    setSelectedInspectAsset({ id: assetId, asset_code: assetCode });
  };

  const unreadAlertCount = notifications.length;
  const criticalCount = notifications.filter(
    (n) => n.severity === 'CRITICAL' || n.priority === 'CRITICAL'
  ).length;

  return (
    <div className="sentinel-shell">
      {/* Persistent Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={(tab) => {
          onTabChange(tab);
          setMobileMenuOpen(false);
        }}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed((prev) => !prev)}
        user={user}
        onLogout={onLogout}
        unreadAlertCount={unreadAlertCount}
        urgentMaintenanceCount={criticalCount}
      />

      {/* Main Content Area with Header */}
      <div className="sentinel-main-wrapper">
        <TopHeader
          activeTab={activeTab}
          onOpenSearch={() => setIsSearchOpen(true)}
          onToggleNotifications={() => setIsNotificationsOpen((prev) => !prev)}
          unreadCount={unreadAlertCount}
          theme={theme}
          onToggleTheme={toggleTheme}
          systemHealthy={systemHealthy}
          user={user}
          onMobileMenuToggle={() => setMobileMenuOpen((prev) => !prev)}
        />

        {/* Active View Container */}
        <main className="sentinel-main-content">
          {children}
        </main>
      </div>

      {/* Notification Dropdown Center */}
      <NotificationCenter
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        onAcknowledge={handleAcknowledgeRecommendation}
        onInspectAsset={handleInspectAsset}
        onViewAllAlerts={() => {
          onTabChange('alerts');
          setIsNotificationsOpen(false);
        }}
      />

      {/* Global Quick Jump Palette (Ctrl+K) */}
      <CommandPalette
        isOpen={isSearchOpen}
        onClose={setIsSearchOpen}
        assets={searchAssets}
        onNavigate={(tab) => {
          onTabChange(tab);
          setIsSearchOpen(false);
        }}
        onInspectAsset={handleInspectAsset}
      />

      {/* Deep Inspection Modal */}
      {selectedInspectAsset && (
        <AssetDetailModal
          asset={selectedInspectAsset}
          onClose={() => {
            setSelectedInspectAsset(null);
            loadNotifications();
          }}
        />
      )}
    </div>
  );
}
