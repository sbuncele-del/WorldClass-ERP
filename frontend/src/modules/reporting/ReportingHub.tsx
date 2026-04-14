/**
 * Siyabusa Financial Reporting Platform - Main Hub
 * Entry point for reporting.siyabusaerp.co.za
 * 
 * Workflow: Client Files → Trial Balance → Link Accounts → View Financials → Export/XBRL
 */

import { useState, useEffect, useCallback } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { engagementApi } from './services/reporting.api';
import EngagementList from './components/EngagementList';
import EngagementWorkspace from './components/EngagementWorkspace';
import ClientSetup from './components/ClientSetup';
import './styles/reporting.css';

interface Engagement {
  id: string;
  entity_name: string;
  registration_number?: string;
  financial_year_end: string;
  reporting_framework: string;
  working_paper_type: string;
  status: string;
  updated_at: string;
}

export default function ReportingHub() {
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const fetchEngagements = useCallback(async () => {
    try {
      setLoading(true);
      const result = await engagementApi.list({ search: searchTerm || undefined });
      if (result.success) {
        setEngagements(result.data as Engagement[]);
      }
    } catch (error) {
      console.error('Error fetching engagements:', error);
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    fetchEngagements();
  }, [fetchEngagements]);

  const handleCreateNew = () => {
    navigate('new');
  };

  const handleOpenEngagement = (id: string) => {
    navigate(id);
  };

  const isWorkspace = location.pathname.includes('/reporting/') && 
    !location.pathname.endsWith('/reporting') &&
    !location.pathname.endsWith('/reporting/');

  if (isWorkspace) {
    return (
      <Routes>
        <Route path="new" element={<ClientSetup onCreated={(id) => navigate(id)} />} />
        <Route path=":engagementId/*" element={<EngagementWorkspace onBack={() => navigate('/app/reporting')} />} />
      </Routes>
    );
  }

  return (
    <div className="reporting-hub">
      {/* Header */}
      <div className="reporting-hub-header">
        <div className="reporting-hub-title-section">
          <h1 className="reporting-hub-title">Financial Reporting</h1>
          <p className="reporting-hub-subtitle">
            Prepare IFRS-compliant financial statements, working papers, and XBRL submissions
          </p>
        </div>
        <button className="btn-primary reporting-create-btn" onClick={handleCreateNew}>
          + New Client File
        </button>
      </div>

      {/* Quick Stats */}
      <div className="reporting-stats-grid">
        <div className="reporting-stat-card">
          <span className="reporting-stat-value">{engagements.length}</span>
          <span className="reporting-stat-label">Total Files</span>
        </div>
        <div className="reporting-stat-card">
          <span className="reporting-stat-value">
            {engagements.filter(e => e.status === 'draft').length}
          </span>
          <span className="reporting-stat-label">Drafts</span>
        </div>
        <div className="reporting-stat-card">
          <span className="reporting-stat-value">
            {engagements.filter(e => e.status === 'in_progress').length}
          </span>
          <span className="reporting-stat-label">In Progress</span>
        </div>
        <div className="reporting-stat-card">
          <span className="reporting-stat-value">
            {engagements.filter(e => e.status === 'approved' || e.status === 'submitted').length}
          </span>
          <span className="reporting-stat-label">Completed</span>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="reporting-toolbar">
        <input
          type="text"
          className="reporting-search-input"
          placeholder="Search by entity name or registration number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Engagement List */}
      <EngagementList
        engagements={engagements}
        loading={loading}
        onOpen={handleOpenEngagement}
        onRefresh={fetchEngagements}
      />
    </div>
  );
}
