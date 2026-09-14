import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('SentinelAI UI Error Boundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div
          style={{
            padding: '24px',
            backgroundColor: '#0a0a0a',
            border: '1px solid #dc2626',
            borderRadius: '8px',
            margin: '16px',
            color: '#f3f4f6',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444' }}>
            <AlertTriangle size={20} />
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>
              {this.props.title || 'Component Diagnostic Alert'}
            </h3>
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: '#9ca3af' }}>
            {this.state.error?.message || 'An unexpected runtime anomaly occurred in this tactical view.'}
          </p>
          <div>
            <button
              onClick={this.handleReset}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={12} />
              Re-initialize View
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
