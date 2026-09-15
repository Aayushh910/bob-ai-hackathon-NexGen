import React, { useEffect } from 'react';
import {
  Bell,
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Clock,
  X,
  ChevronRight,
  ShieldAlert,
  Check,
  CheckCheck
} from 'lucide-react';

export default function NotificationCenter({
  isOpen,
  onClose,
  notifications = [],
  onAcknowledge,
  onInspectAsset,
  onViewAllAlerts,
  onReadAll,
  onDismiss
}) {
  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const criticalCount = notifications.filter(
    (n) => n.severity === 'CRITICAL' || n.priority === 'CRITICAL'
  ).length;

  return (
    <>
      {/* Click-outside dismissal backdrop */}
      <div
        className="notification-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className="notification-popover"
        role="dialog"
        aria-modal="true"
        aria-label="Operational Notifications"
      >
        {/* Header */}
        <div className="notification-header">
          <div className="notification-header-left">
            <Bell size={16} className="notification-header-icon" />
            <span className="notification-title">Operational Notifications</span>
            {notifications.length > 0 && (
              <span className={`notification-header-count ${criticalCount > 0 ? 'has-critical' : ''}`}>
                {notifications.length}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {notifications.length > 0 && onReadAll && (
              <button
                type="button"
                className="notification-read-all-header-btn"
                onClick={onReadAll}
                title="Mark all notifications as read"
              >
                <CheckCheck size={13} />
                <span>Read All</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="notification-close-btn"
              aria-label="Close notifications"
              title="Close (Esc)"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="notification-list">
          {notifications.length === 0 ? (
            <div className="notification-empty-state">
              <CheckCircle2 size={32} style={{ color: 'var(--color-success)', marginBottom: '8px' }} />
              <div className="notification-empty-title">All Systems Nominal</div>
              <div className="notification-empty-sub">
                No active sensor deviations or unread maintenance directives.
              </div>
            </div>
          ) : (
            notifications.map((notif) => {
              const isCritical = notif.severity === 'CRITICAL' || notif.priority === 'CRITICAL';
              const isWarning = notif.severity === 'HIGH' || notif.priority === 'HIGH';

              return (
                <div
                  key={notif.id}
                  className={`notification-item ${isCritical ? 'critical' : isWarning ? 'warning' : 'info'}`}
                  onClick={() => {
                    if (notif.asset_id && onInspectAsset) {
                      onInspectAsset(notif.asset_id, notif.asset_code);
                      onClose();
                    }
                  }}
                >
                  <div className="notification-item-content">
                    <div className="notification-item-header">
                      <div className="notification-item-title-group">
                        {notif.asset_code && (
                          <span className="notification-asset-badge">
                            {notif.asset_code}
                          </span>
                        )}
                        <span className="notification-item-title">
                          {notif.title || notif.type || 'Operational Advisory'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                        <span className={`notification-severity-tag ${isCritical ? 'critical' : isWarning ? 'warning' : 'info'}`}>
                          {isCritical ? 'CRITICAL' : isWarning ? 'HIGH' : 'INFO'}
                        </span>
                        {onDismiss && (
                          <button
                            type="button"
                            className="notification-dismiss-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDismiss(notif.id, notif.recommendation_id);
                            }}
                            title="Dismiss notification"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="notification-item-desc">
                      {notif.description || notif.message || notif.recommended_action}
                    </p>

                    <div className="notification-item-footer">
                      <span className="notification-item-time">
                        <Clock size={11} style={{ display: 'inline', marginRight: '4px' }} />
                        {notif.timestamp ? new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active'}
                      </span>

                      <div className="notification-item-actions">
                        {notif.asset_id && (
                          <button
                            type="button"
                            className="notification-item-action-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              onInspectAsset(notif.asset_id, notif.asset_code);
                              onClose();
                            }}
                          >
                            <span>Inspect</span>
                            <ChevronRight size={12} />
                          </button>
                        )}

                        {onAcknowledge && notif.recommendation_id && (
                          <button
                            type="button"
                            className="notification-item-action-btn ack"
                            onClick={(e) => {
                              e.stopPropagation();
                              onAcknowledge(notif.recommendation_id);
                            }}
                            title="Acknowledge Directive"
                          >
                            <Check size={12} />
                            <span>Ack</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Bar with Read All and View All Action */}
        <div className="notification-footer-bar">
          {notifications.length > 0 && onReadAll && (
            <button
              type="button"
              className="notification-read-all-btn"
              onClick={onReadAll}
            >
              <CheckCheck size={14} />
              <span>Mark All as Read &amp; Clear</span>
            </button>
          )}
          {onViewAllAlerts && (
            <button
              type="button"
              className="notification-view-all-btn"
              onClick={onViewAllAlerts}
            >
              <span>View All Directives &amp; Alerts</span>
              <ChevronRight size={14} />
            </button>
          )}
        </div>
      </div>
    </>
  );
}
