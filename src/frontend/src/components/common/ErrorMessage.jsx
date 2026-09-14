import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function ErrorMessage({ message, onRetry }) {
  return (
    <div className="error-card">
      <div className="error-header">
        <AlertTriangle className="error-icon" size={22} />
        <h4 className="error-title">Connection Error</h4>
      </div>
      <p className="error-message">{message}</p>
      {onRetry && (
        <button className="retry-btn" onClick={onRetry}>
          <RefreshCw size={15} />
          <span>Retry Connection</span>
        </button>
      )}
    </div>
  );
}
