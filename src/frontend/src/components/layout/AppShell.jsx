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

  // Helper to retrieve read notification IDs from localStorage
  const getReadNotificationIds = () => {
    try {
      const saved = localStorage.getItem('sentinel_read_notifications');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch (e) {
      return new Set();
    }
  };

  // Load notifications and assets for quick jump
  const loadNotifications = useCallback(async () => {
    try {
      const [anomRes, recRes, assetsRes] = await Promise.allSettled([
        getFleetAnomalies({ limit: 12 }),
        getRecommendations({ status: 'OPEN', limit: 15 }),
        getAssets({ limit: 150 })
      ]);

      const readIds = getReadNotificationIds();
      const items = [];
      const seen = new Set();

      if (anomRes.status === 'fulfilled' && anomRes.value?.items) {
        anomRes.value.items.forEach((a) => {
          const id = `anom-${a.id}`;
          const key = `anom-${a.asset_id}-${a.component_id}`;
          if (readIds.has(id) || seen.has(key)) return;
          seen.add(key);
          items.push({
            id,
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
          const id = `rec-${r.id}`;
          const key = `rec-${r.asset_id}-${r.action_directive}`;
          if (readIds.has(id) || seen.has(key)) return;
          seen.add(key);
          items.push({
            id,
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

  const handleReadAllNotifications = useCallback(() => {
    const readIds = getReadNotificationIds();
    notifications.forEach((n) => readIds.add(n.id));
    try {
      localStorage.setItem('sentinel_read_notifications', JSON.stringify(Array.from(readIds)));
    } catch (e) {}
    setNotifications([]);
    window.dispatchEvent(new CustomEvent('sentinel:data-updated'));
  }, [notifications]);

  const handleDismissNotification = useCallback((id, recId) => {
    const readIds = getReadNotificationIds();
    readIds.add(id);
    try {
      localStorage.setItem('sentinel_read_notifications', JSON.stringify(Array.from(readIds)));
    } catch (e) {}
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (recId) {
      updateRecommendationStatus(recId, 'ACKNOWLEDGED').catch(() => {});
    }
    window.dispatchEvent(new CustomEvent('sentinel:data-updated'));
  }, []);

  const handleAcknowledgeRecommendation = async (recId) => {
    try {
      await updateRecommendationStatus(recId, 'ACKNOWLEDGED');
      handleDismissNotification(`rec-${recId}`, recId);
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
        onReadAll={handleReadAllNotifications}
        onDismiss={handleDismissNotification}
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
