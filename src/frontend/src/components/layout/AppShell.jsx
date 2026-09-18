import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './Sidebar';
import TopHeader from './TopHeader';
import NotificationCenter from './NotificationCenter';
import CommandPalette from './CommandPalette';
import { getCriticalComponents } from '../../api/dashboard';
import { getAssets } from '../../api/assets';

export default function AppShell({
  activeTab,
  onTabChange,
  user,
  onLogout,
  systemHealthy = true,
  onInspectAsset,
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

  // Sync theme attribute to <html>
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('sentinel_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const getReadNotificationIds = () => {
    try {
      const saved = localStorage.getItem('sentinel_read_notifications');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch (e) {
      return new Set();
    }
  };

  // Load real critical component notifications and assets for quick jump
  const loadNotifications = useCallback(async () => {
    try {
      const [critRes, assetsRes] = await Promise.allSettled([
        getCriticalComponents(),
        getAssets({ limit: 100 })
      ]);

      const readIds = getReadNotificationIds();
      const items = [];

      if (critRes.status === 'fulfilled') {
        const critList = Array.isArray(critRes.value)
          ? critRes.value
          : (Array.isArray(critRes.value?.components) ? critRes.value.components : []);
        critList.forEach((c) => {
          const id = `crit-${c.component_id}`;
          if (readIds.has(id)) return;
          items.push({
            id,
            asset_id: c.asset_id,
            asset_code: c.asset_id,
            title: `Critical Failure Risk: ${c.component_id}`,
            description: `${c.component_type} failure probability ${c.failure_probability}% — ${c.primary_reason || 'Imminent risk'}.`,
            severity: 'CRITICAL',
            timestamp: c.timestamp,
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
    const interval = setInterval(loadNotifications, 60000);
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
  }, [notifications]);

  const handleDismissNotification = useCallback((id) => {
    const readIds = getReadNotificationIds();
    readIds.add(id);
    try {
      localStorage.setItem('sentinel_read_notifications', JSON.stringify(Array.from(readIds)));
    } catch (e) {}
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const handleSelectAsset = (assetId) => {
    if (onInspectAsset) {
      onInspectAsset(assetId);
    }
  };

  const unreadAlertCount = notifications.length;

  return (
    <div className="sentinel-shell">
      {/* Persistent Left Sidebar with 6 Target Navigation Items */}
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
          onMobileMenuToggle={() => setMobileMenuOpen((prev) => !prev)}
          searchAssets={searchAssets}
          onInspectAsset={onInspectAsset}
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
        onInspectAsset={handleSelectAsset}
        onReadAll={handleReadAllNotifications}
        onDismiss={handleDismissNotification}
        onViewAllAlerts={() => {
          onTabChange('predictions');
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
        onInspectAsset={handleSelectAsset}
      />
    </div>
  );
}
