import React, { useState } from 'react';
import {
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Info
} from 'lucide-react';
import TacticalBackground from './TacticalBackground';
import { login } from '../../api/auth';

export default function LoginPage({ onLogin, onBack, sessionExpiredNotice = null }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      setErrorMsg('Please enter both your official email and security password.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const response = await login({ email: cleanEmail, password: cleanPassword });
      if (response?.authenticated && response?.user) {
        onLogin(response.user);
      } else {
        setErrorMsg(response?.message || 'Invalid email or password.');
      }
    } catch (err) {
      const message = err?.details?.detail || err?.message || 'Invalid email or password.';
      setErrorMsg(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page-shell">
      {/* Tactical Dynamic Background Animation */}
      <TacticalBackground />

      {/* Back to Landing Page Button */}
      {onBack && (
        <div className="auth-back-nav">
          <button type="button" className="auth-back-btn" onClick={onBack}>
            <ArrowLeft size={14} />
            <span>Back to Landing Page</span>
          </button>
        </div>
      )}

      <div className="auth-split-card">
        {/* Left Side: Brand & Product Value */}
        <div className="auth-left-brand-panel">
          <div>
            <div className="auth-brand-head">
              <div className="brand-shield-box">
                <img src="/logo.png" alt="SentinelAI Logo" className="brand-logo-img" />
                <span className="brand-pulse-dot" />
              </div>
              <span className="auth-brand-name">SENTINELAI</span>
            </div>

            <h1 className="auth-headline">
              Mission Readiness Intelligence
            </h1>

            <p className="auth-description">
              Deterministic health diagnostics, prognostics, and automated maintenance orchestration for high-readiness fleet operations.
            </p>

            <div className="auth-value-bullets">
              <div className="auth-bullet-item">
                <CheckCircle2 size={16} className="auth-bullet-icon" />
                <span>Continuous multi-axis HUMS telemetry synthesis</span>
              </div>
              <div className="auth-bullet-item">
                <CheckCircle2 size={16} className="auth-bullet-icon" />
                <span>RUL failure horizon forecasting prior to breakdown</span>
              </div>
              <div className="auth-bullet-item">
                <CheckCircle2 size={16} className="auth-bullet-icon" />
                <span>Prescriptive depot-level work order directives</span>
              </div>
            </div>
          </div>

          <div className="auth-clearance-notice">
            <ShieldCheck size={14} style={{ color: 'var(--color-success)' }} />
            <span>Authorized Personnel Only &bull; End-to-End Cryptographic Audit</span>
          </div>
        </div>

        {/* Right Side: Sign-in Form */}
        <div className="auth-right-form-panel">
          <h2 className="auth-form-title">Sign in to SentinelAI</h2>
          <p className="auth-form-sub">Enter your security credentials to access the command platform.</p>

          {/* Session Expiration Notice */}
          {sessionExpiredNotice && !errorMsg && (
            <div
              className="auth-error-banner"
              role="status"
              style={{
                backgroundColor: 'rgba(234, 179, 8, 0.1)',
                borderColor: 'rgba(234, 179, 8, 0.3)',
                color: '#eab308',
                marginBottom: '14px'
              }}
            >
              <Info size={15} style={{ flexShrink: 0 }} />
              <span>{sessionExpiredNotice}</span>
            </div>
          )}

          {/* Error Banner */}
          {errorMsg && (
            <div className="auth-error-banner" role="alert" style={{ marginBottom: '14px' }}>
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-form-group">
              <label className="auth-label" htmlFor="auth-email">
                Official Email
              </label>
              <div className="auth-input-wrap">
                <input
                  id="auth-email"
                  type="email"
                  className="auth-input"
                  placeholder="admin@sentinelai.internal"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="auth-form-group">
              <label className="auth-label" htmlFor="auth-password">
                Password
              </label>

              <div className="auth-input-wrap">
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  className="auth-input"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="auth-eye-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="primary-btn"
              disabled={isLoading}
              style={{ width: '100%', height: '44px', marginTop: '12px' }}
            >
              {isLoading ? 'Authenticating...' : 'Sign In'}
              {!isLoading && <ArrowRight size={16} />}
            </button>
          </form>

          <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '11px', color: '#555555' }}>
            <Lock size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-top' }} />
            Single-operator restricted environment &bull; IP-monitored rate limiting
          </div>
        </div>
      </div>
    </div>
  );
}
