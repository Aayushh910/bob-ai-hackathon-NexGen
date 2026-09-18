import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  AlertOctagon,
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  ChevronRight,
  Eye,
  Cpu,
  Sparkles
} from 'lucide-react';
import { getCriticalComponents, getHighPriorityComponents } from '../../api/dashboard';
import { PageHeader, KpiCard, RiskBadge, LoadingState, EmptyState } from '../common/UIComponents';

export default function PredictionsView({ onAnalyzeComponent, onInspectAsset }) {
  const [criticalItems, setCriticalItems] = useState([]);
  const [highPriorityItems, setHighPriorityItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [critRes, highRes] = await Promise.all([
        getCriticalComponents(),
        getHighPriorityComponents()
      ]);
      const safeCrit = Array.isArray(critRes)
        ? critRes
        : (Array.isArray(critRes?.components) ? critRes.components : []);
      const safeHigh = Array.isArray(highRes)
        ? highRes
        : (Array.isArray(highRes?.components) ? highRes.components : []);

      setCriticalItems(safeCrit);
      setHighPriorityItems(safeHigh);
    } catch (err) {
      console.error('Failed to load predictions queue:', err);
      setError(err.message || 'Unable to retrieve failure risk predictions from backend.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener('sentinel:data-updated', handleUpdate);
    return () => window.removeEventListener('sentinel:data-updated', handleUpdate);
  }, [loadData]);

  // Combine and deduplicate safely
  const safeCritItems = Array.isArray(criticalItems) ? criticalItems : [];
  const safeHighItems = Array.isArray(highPriorityItems) ? highPriorityItems : [];
  const allPredictedComponents = [...safeCritItems, ...safeHighItems];
  const uniqueComponentsMap = new Map();
  allPredictedComponents.forEach((c) => {
    if (c && c.component_id && !uniqueComponentsMap.has(c.component_id)) {
      uniqueComponentsMap.set(c.component_id, c);
    }
  });
  const allItems = Array.from(uniqueComponentsMap.values());

  // Filter items
  const filtered = allItems.filter((item) => {
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      const compMatch = (item.component_id || '').toLowerCase().includes(q);
      const assetMatch = (item.asset_id || '').toLowerCase().includes(q);
      const reasonMatch = (item.primary_reason || '').toLowerCase().includes(q);
      if (!compMatch && !assetMatch && !reasonMatch) return false;
    }

    if (typeFilter && item.component_type !== typeFilter) {
      return false;
    }

    if (priorityFilter && item.priority_level !== priorityFilter) {
      return false;
    }

    return true;
  });

  return (
    <div className="predictions-view-container">
      {/* 1. Header */}
      <PageHeader
        badgeText="Predictive Failure Intelligence"
        badgeIcon={TrendingUp}
        title="Failure Prognostics &amp; Risk Hierarchy"
        subtitle="Active components evaluated by 8 specialized anomaly and failure pipelines, ranked by maintenance priority with TreeSHAP attributions."
        actions={
          <button className="secondary-btn" onClick={loadData} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        }
      />

      {/* 2. Real Backend Metrics Summary */}
      <div className="grid-kpi">
        <KpiCard
          title="Critical Priority Components"
          value={criticalItems.length}
          subtitle="Failure prob &ge; 70% or severe anomaly"
          icon={AlertOctagon}
          variant="critical"
          loading={loading}
        />
        <KpiCard
          title="High Priority Warnings"
          value={highPriorityItems.length}
          subtitle="Imminent failure horizon elevated"
          icon={AlertTriangle}
          variant="caution"
          loading={loading}
        />
        <KpiCard
          title="Engine &amp; Hydraulic Alerts"
          value={allItems.filter((c) => c.component_type === 'Engine' || c.component_type === 'Hydraulic System').length}
          subtitle="Primary mechanical powertrain units"
          icon={Cpu}
          variant="default"
          loading={loading}
        />
        <KpiCard
          title="Battery &amp; Pump Alerts"
          value={allItems.filter((c) => c.component_type === 'Battery' || c.component_type === 'Fuel Pump').length}
          subtitle="Auxiliary &amp; electrical subsystems"
          icon={TrendingUp}
          variant="default"
          loading={loading}
        />
      </div>

      {/* 3. Filter Bar */}
      <div className="sentinel-card" style={{ marginBottom: '16px', padding: '14px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'space-between', alignItems: 'center' }}>
          {/* Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '260px', flex: '1', backgroundColor: 'var(--color-bg)', padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
            <Search size={15} style={{ color: 'var(--color-text-muted)' }} />
            <input
              type="text"
              placeholder="Search component (e.g. A035-HYD), asset, or reason..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: 'var(--color-text)', outline: 'none', width: '100%', fontSize: '13px' }}
            />
          </div>

          {/* Component Type Filters */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {['', 'Engine', 'Battery', 'Fuel Pump', 'Hydraulic System'].map((type) => (
              <button
                key={type}
                className={`tab-btn ${typeFilter === type ? 'active' : ''}`}
                style={{ padding: '6px 12px', fontSize: '12px' }}
                onClick={() => setTypeFilter(type)}
              >
                {type || 'All Subsystems'}
              </button>
            ))}
          </div>

          {/* Priority Filters */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              className={`tab-btn ${priorityFilter === '' ? 'active' : ''}`}
              style={{ padding: '6px 10px', fontSize: '12px' }}
              onClick={() => setPriorityFilter('')}
            >
              All Priorities
            </button>
            <button
              className={`tab-btn ${priorityFilter === 'CRITICAL' ? 'active' : ''}`}
              style={{ padding: '6px 10px', fontSize: '12px' }}
              onClick={() => setPriorityFilter('CRITICAL')}
            >
              CRITICAL
            </button>
            <button
              className={`tab-btn ${priorityFilter === 'HIGH' ? 'active' : ''}`}
              style={{ padding: '6px 10px', fontSize: '12px' }}
              onClick={() => setPriorityFilter('HIGH')}
            >
              HIGH
            </button>
          </div>
        </div>
      </div>

      {/* 4. Prognostic Table */}
      {loading ? (
        <LoadingState
          message="Loading Prognostic Predictions from ML Pipelines..."
          subtext="Retrieving failure probabilities, anomaly severities, and SHAP causal attributions from Neon database"
          minHeight="320px"
        />
      ) : error ? (
        <div className="error-card" style={{ padding: '24px', backgroundColor: 'var(--color-bg-subtle)', borderRadius: '8px', border: '1px solid var(--color-danger-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-danger)', marginBottom: '8px' }}>
            <AlertOctagon size={20} />
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Prognostics Unavailable</h3>
          </div>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', margin: '0 0 16px' }}>{error}</p>
          <button className="primary-btn" onClick={loadData}>
            <RefreshCw size={14} />
            <span>Retry Connection</span>
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No Matching Predictions"
          description="No components match your search and filter criteria."
          icon={ShieldCheck}
          actionText="Reset Filters"
          onAction={() => { setSearchTerm(''); setTypeFilter(''); setPriorityFilter(''); }}
        />
      ) : (
        <div className="sentinel-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-wrapper">
            <table className="sentinel-table">
              <thead>
                <tr>
                  <th>Component ID</th>
                  <th>Subsystem Type</th>
                  <th>Parent Asset</th>
                  <th>Failure Risk</th>
                  <th>Anomaly Prob</th>
                  <th>Health Score</th>
                  <th>Priority Level</th>
                  <th>TreeSHAP Primary Reason</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const isCrit = item.priority_level === 'CRITICAL';

                  return (
                    <tr
                      key={item.component_id}
                      onClick={() => onAnalyzeComponent && onAnalyzeComponent(item.component_id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>
                        <strong style={{ fontFamily: 'var(--font-family-mono)', color: 'var(--color-text)', fontSize: '14px' }}>
                          {item.component_id}
                        </strong>
                      </td>
                      <td>{item.component_type}</td>
                      <td>
                        <button
                          className="btn-link"
                          style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 600 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onInspectAsset && onInspectAsset(item.asset_id);
                          }}
                        >
                          {item.asset_id}
                        </button>
                      </td>
                      <td>
                        <span style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 800, color: isCrit ? 'var(--color-danger)' : '#f97316' }}>
                          {item.failure_probability}%
                        </span>
                      </td>
                      <td>
                        <span style={{ fontFamily: 'var(--font-family-mono)' }}>
                          {item.anomaly_probability}%
                        </span>
                      </td>
                      <td>
                        <span style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 700, color: item.health_score < 50 ? 'var(--color-danger)' : 'var(--color-warning)' }}>
                          {item.health_score} / 100
                        </span>
                      </td>
                      <td>
                        <RiskBadge risk={item.priority_level} size="sm" />
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Sparkles size={13} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text)' }}>
                            {item.primary_reason}
                          </span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="secondary-btn"
                          style={{ height: '28px', padding: '0 10px', fontSize: '11px' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onAnalyzeComponent && onAnalyzeComponent(item.component_id);
                          }}
                        >
                          <Eye size={12} />
                          <span>Analyze</span>
                          <ChevronRight size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
