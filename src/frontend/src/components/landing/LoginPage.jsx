import React, { useState } from 'react';
import {
  Shield,
  Eye,
  EyeOff,
  Lock,
  User,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Key
} from 'lucide-react';
import TacticalBackground from './TacticalBackground';

export default function LoginPage({ onLogin, onBack }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [showQuickAccess, setShowQuickAccess] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMsg('Please enter both your username/email and password.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    setTimeout(() => {
      setIsLoading(false);
      const isAdm = username.trim().toLowerCase() === 'admin';

      onLogin({
        name: isAdm ? 'Administrator Core' : `Major ${username.trim()}`,
        username: username.trim(),
        role: isAdm ? 'Enterprise Administrator' : 'Operations Commander',
        clearance: isAdm ? 'TOP SECRET / SCI' : 'SECRET',
      });
    }, 500);
  };

  const handleApplyAdmin = () => {
    setUsername('admin');
    setPassword('admin123');
    setErrorMsg(null);
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

          {errorMsg && (
            <div className="auth-error-banner" role="alert">
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-form-group">
              <label className="auth-label" htmlFor="auth-username">
                Username or Official Email
              </label>
              <div className="auth-input-wrap">
                <input
                  id="auth-username"
                  type="text"
                  className="auth-input"
                  placeholder="e.g. admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div className="auth-form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="auth-label" htmlFor="auth-password">
                  Security Password
                </label>
                <button
                  type="button"
                  style={{ fontSize: '11px', color: '#737373' }}
                  onClick={() => alert('Please contact your SentinelAI System Administrator for credential resets.')}
                >
                  Forgot password?
                </button>
              </div>

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
                />
                <button
                  type="button"
                  className="auth-eye-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="primary-btn"
              disabled={isLoading}
              style={{ width: '100%', height: '44px', marginTop: '8px' }}
            >
              {isLoading ? 'Authenticating...' : 'Sign In to Command Center'}
              <ArrowRight size={16} />
            </button>
          </form>

          {/* Discreet Single Quick Access (Admin Only, Toggleable, Low Opacity) */}
          <div className="quick-access-section">
            <button
              type="button"
              className="quick-access-trigger-btn"
              onClick={() => setShowQuickAccess((prev) => !prev)}
              title="Reveal quick demo access credentials"
            >
              <Key size={12} />
              <span>{showQuickAccess ? 'Hide Quick Access' : 'Quick Access (Demo)'}</span>
            </button>

            {showQuickAccess && (
              <div className="admin-quick-access-card" onClick={handleApplyAdmin} role="button" tabIndex={0}>
                <div className="admin-quick-access-info">
                  <span className="admin-quick-badge">ADMIN ONLY</span>
                  <div className="admin-cred-text">
                    <span>User: <strong>admin</strong></span>
                    <span style={{ color: '#444' }}>&bull;</span>
                    <span>Pass: <strong>admin123</strong></span>
                  </div>
                </div>
                <span className="admin-fill-cta">Auto-Fill</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
