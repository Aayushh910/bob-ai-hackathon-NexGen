import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, RefreshCw, Shield, ChevronRight, AlertTriangle, Layers, MapPin, Calendar, Activity } from 'lucide-react';
import { getAssets } from '../../api/assets';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorMessage from '../common/ErrorMessage';
import AssetDetailModal from './AssetDetailModal';

export default function FleetOverview() {
  const [assets, setAssets] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Selected Asset for Detail Modal
  const [selectedAsset, setSelectedAsset] = useState(null);

  const fetchAssets = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const skip = (currentPage - 1) * pageSize;
      const res = await getAssets({
        skip,
        limit: pageSize,
        search: searchQuery.trim() || undefined,
        status: statusFilter || undefined,
        asset_type: typeFilter || undefined,
      });
      setAssets(res.items || []);
      setTotalCount(res.total || 0);
    } catch (err) {
      console.error('Failed to fetch assets:', err);
      setError(err.message || 'Unable to retrieve fleet assets from PostgreSQL.');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, searchQuery, statusFilter, typeFilter]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchAssets();
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('');
    setTypeFilter('');
    setCurrentPage(1);
  };

  return (
    <div className="fleet-container">
      {/* Fleet Header */}
      <div className="fleet-header-row">
        <div>
          <div className="hero-badge">
            <Shield size={14} />
            <span>Phase 2 — Active Fleet Registry</span>
          </div>
          <h2 className="fleet-title">Fleet Asset Telemetry Intelligence</h2>
          <p className="fleet-subtitle">
            PostgreSQL-backed operational equipment inventory and HUMS telemetry health monitoring.
          </p>
        </div>

        <button
          className="refresh-btn"
          onClick={fetchAssets}
          disabled={isLoading}
          title="Refresh Fleet Data"
        >
          <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="fleet-filter-bar">
        <form className="search-form" onSubmit={handleSearchSubmit}>
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search by code (e.g. A001), model, base..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
          />
        </form>

        <div className="filter-controls">
          <div className="select-wrapper">
            <Filter size={14} className="filter-icon" />
            <select
              className="filter-select"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="MAINTENANCE">MAINTENANCE</option>
              <option value="INACTIVE">INACTIVE</option>
              <option value="RETIRED">RETIRED</option>
            </select>
          </div>

          <div className="select-wrapper">
            <Layers size={14} className="filter-icon" />
            <select
              className="filter-select"
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">All Asset Types</option>
              <option value="Heavy Equipment">Heavy Equipment</option>
              <option value="Main Battle Tank">Main Battle Tank</option>
              <option value="Armored Carrier">Armored Carrier</option>
            </select>
          </div>

          {(searchQuery || statusFilter || typeFilter) && (
            <button className="reset-filter-btn" onClick={handleResetFilters}>
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Fleet Assets Content */}
      {isLoading ? (
        <LoadingSpinner message="Querying PostgreSQL fleet database..." />
      ) : error ? (
        <ErrorMessage message={error} onRetry={fetchAssets} />
      ) : assets.length === 0 ? (
        <div className="empty-fleet-card">
          <AlertTriangle size={36} className="empty-icon" />
          <h3>No Fleet Assets Found</h3>
          <p>No equipment matches your specified filter or search criteria.</p>
          <button className="primary-btn" onClick={handleResetFilters}>
            Reset Filters
          </button>
        </div>
      ) : (
        <>
          {/* Asset Grid */}
          <div className="asset-grid">
            {assets.map((asset) => (
              <div
                key={asset.id}
                className="asset-card"
                onClick={() => setSelectedAsset(asset)}
              >
                <div className="asset-card-top">
                  <div className="asset-identity">
                    <div className="asset-icon-box">
                      <Shield size={20} />
                    </div>
                    <div>
                      <h4 className="asset-code">{asset.asset_code}</h4>
                      <span className="asset-type-tag">{asset.asset_type}</span>
                    </div>
                  </div>
                  <span className={`status-pill pill-${asset.status.toLowerCase()}`}>
                    {asset.status}
                  </span>
                </div>

                <div className="asset-card-details">
                  <div className="asset-meta-row">
                    <span className="meta-label">Model:</span>
                    <span className="meta-val">{asset.model}</span>
                  </div>
                  <div className="asset-meta-row">
                    <span className="meta-label">Location:</span>
                    <span className="meta-val">
                      <MapPin size={12} /> {asset.location}
                    </span>
                  </div>
                  <div className="asset-meta-row">
                    <span className="meta-label">Year:</span>
                    <span className="meta-val">
                      <Calendar size={12} /> {asset.year || '2024'}
                    </span>
                  </div>
                </div>

                <div className="asset-card-footer">
                  <span className="telemetry-action-hint">
                    <Activity size={14} /> Telemetry & HUMS Diagnostics
                  </span>
                  <ChevronRight size={16} className="action-arrow" />
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="fleet-pagination-bar">
            <span className="pagination-count-info">
              Showing {(currentPage - 1) * pageSize + 1} &ndash; {Math.min(currentPage * pageSize, totalCount)} of {totalCount} assets
            </span>

            <div className="pagination-controls">
              <button
                className="pagination-btn"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <span className="page-indicator">
                Page {currentPage} of {totalPages}
              </span>
              <button
                className="pagination-btn"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      {/* Asset Detail & Telemetry Modal */}
      {selectedAsset && (
        <AssetDetailModal
          asset={selectedAsset}
          onClose={() => setSelectedAsset(null)}
        />
      )}
    </div>
  );
}
