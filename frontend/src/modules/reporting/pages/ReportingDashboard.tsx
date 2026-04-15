/**
 * Reporting Dashboard — Premium landing page for the Financial Reporting Platform
 * Shows engagement overview, quick actions, recent files, and compliance summary
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { engagementApi } from '../services/reporting.api';

interface Engagement {
  id: string;
  entity_name: string;
  registration_number?: string;
  financial_year_end: string;
  reporting_framework: string;
  status: string;
  updated_at: string;
  created_at: string;
}

export default function ReportingDashboard() {
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const navigate = useNavigate();

  const fetchEngagements = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (searchTerm) params.search = searchTerm;
      if (filterStatus !== 'all') params.status = filterStatus;
      const result = await engagementApi.list(params);
      if (result.success) {
        setEngagements(result.data as Engagement[]);
      }
    } catch (error) {
      console.error('Failed to fetch engagements:', error);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, filterStatus]);

  useEffect(() => {
    fetchEngagements();
  }, [fetchEngagements]);

  const stats = {
    total: engagements.length,
    drafts: engagements.filter(e => e.status === 'draft').length,
    inProgress: engagements.filter(e => e.status === 'in_progress').length,
    review: engagements.filter(e => e.status === 'review').length,
    completed: engagements.filter(e => e.status === 'approved' || e.status === 'submitted').length,
  };

  const recentFiles = [...engagements]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 8);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'status-draft';
      case 'in_progress': return 'status-progress';
      case 'review': return 'status-review';
      case 'approved': case 'submitted': return 'status-complete';
      default: return 'status-draft';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const handleDeleteEngagement = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await engagementApi.delete(id);
      fetchEngagements();
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  return (
    <div className="rpt-dashboard">
      {/* Welcome Section */}
      <div className="rpt-welcome">
        <div className="rpt-welcome-text">
          <h1>Financial Reporting</h1>
          <p>Prepare IFRS-compliant financial statements, working papers, and XBRL submissions</p>
        </div>
        <button className="rpt-btn rpt-btn-primary rpt-btn-lg" onClick={() => navigate('new')}>
          <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          New Client File
        </button>
      </div>

      {/* Stats Grid */}
      <div className="rpt-stats-grid">
        <div className="rpt-stat-card" onClick={() => setFilterStatus('all')}>
          <div className="rpt-stat-icon rpt-stat-total">
            <svg viewBox="0 0 20 20" fill="currentColor" width="22" height="22">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
              <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="rpt-stat-info">
            <span className="rpt-stat-value">{stats.total}</span>
            <span className="rpt-stat-label">Total Files</span>
          </div>
        </div>
        <div className="rpt-stat-card" onClick={() => setFilterStatus('draft')}>
          <div className="rpt-stat-icon rpt-stat-drafts">
            <svg viewBox="0 0 20 20" fill="currentColor" width="22" height="22">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
          </div>
          <div className="rpt-stat-info">
            <span className="rpt-stat-value">{stats.drafts}</span>
            <span className="rpt-stat-label">Drafts</span>
          </div>
        </div>
        <div className="rpt-stat-card" onClick={() => setFilterStatus('in_progress')}>
          <div className="rpt-stat-icon rpt-stat-inprogress">
            <svg viewBox="0 0 20 20" fill="currentColor" width="22" height="22">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="rpt-stat-info">
            <span className="rpt-stat-value">{stats.inProgress}</span>
            <span className="rpt-stat-label">In Progress</span>
          </div>
        </div>
        <div className="rpt-stat-card" onClick={() => setFilterStatus('approved')}>
          <div className="rpt-stat-icon rpt-stat-complete">
            <svg viewBox="0 0 20 20" fill="currentColor" width="22" height="22">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="rpt-stat-info">
            <span className="rpt-stat-value">{stats.completed}</span>
            <span className="rpt-stat-label">Completed</span>
          </div>
        </div>
      </div>

      {/* Client Files Section */}
      <div className="rpt-section">
        <div className="rpt-section-header">
          <h2>Client Files</h2>
          <div className="rpt-toolbar">
            <div className="rpt-search-wrapper">
              <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" className="rpt-search-icon">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
              <input
                type="text"
                className="rpt-search-input"
                placeholder="Search by entity name or reg number..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              className="rpt-filter-select"
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="draft">Drafts</option>
              <option value="in_progress">In Progress</option>
              <option value="review">Review</option>
              <option value="approved">Completed</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="rpt-table-loading">
            <div className="rpt-loader-spinner" />
            <span>Loading client files...</span>
          </div>
        ) : recentFiles.length === 0 ? (
          <div className="rpt-empty-state">
            <div className="rpt-empty-icon">
              <svg viewBox="0 0 64 64" fill="none" width="64" height="64">
                <rect x="12" y="8" width="40" height="48" rx="4" stroke="#CBD5E1" strokeWidth="2" />
                <path d="M20 20h24M20 28h18M20 36h12" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
                <circle cx="44" cy="44" r="12" fill="#EEF2FF" stroke="#818CF8" strokeWidth="2" />
                <path d="M44 38v12M38 44h12" stroke="#818CF8" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <h3>No client files yet</h3>
            <p>Create your first client file to start preparing IFRS-compliant financial statements</p>
            <button className="rpt-btn rpt-btn-primary" onClick={() => navigate('new')}>
              Create First Client File
            </button>
          </div>
        ) : (
          <div className="rpt-table-container">
            <table className="rpt-table">
              <thead>
                <tr>
                  <th>Entity Name</th>
                  <th>Reg Number</th>
                  <th>Year End</th>
                  <th>Framework</th>
                  <th>Status</th>
                  <th>Last Updated</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {recentFiles.map(eng => (
                  <tr key={eng.id} className="rpt-table-row" onClick={() => navigate(eng.id)}>
                    <td className="rpt-entity-cell">
                      <div className="rpt-entity-avatar">
                        {eng.entity_name.charAt(0).toUpperCase()}
                      </div>
                      <span className="rpt-entity-name">{eng.entity_name}</span>
                    </td>
                    <td className="rpt-mono">{eng.registration_number || '—'}</td>
                    <td>{new Date(eng.financial_year_end).toLocaleDateString('en-ZA', { month: 'short', year: 'numeric' })}</td>
                    <td>
                      <span className="rpt-framework-badge">
                        {eng.reporting_framework.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <span className={`rpt-status-pill ${getStatusColor(eng.status)}`}>
                        {getStatusLabel(eng.status)}
                      </span>
                    </td>
                    <td className="rpt-date-cell">{formatDate(eng.updated_at)}</td>
                    <td>
                      <div className="rpt-row-actions" onClick={e => e.stopPropagation()}>
                        <button
                          className="rpt-action-btn rpt-action-open"
                          onClick={() => navigate(eng.id)}
                          title="Open"
                        >
                          Open
                        </button>
                        <button
                          className="rpt-action-btn rpt-action-delete"
                          onClick={() => handleDeleteEngagement(eng.id, eng.entity_name)}
                          title="Delete"
                        >
                          <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
