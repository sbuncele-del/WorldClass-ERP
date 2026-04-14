/**
 * Engagement List - Table/grid of client files
 */

import { useState } from 'react';
import { engagementApi } from '../services/reporting.api';

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

interface Props {
  engagements: Engagement[];
  loading: boolean;
  onOpen: (id: string) => void;
  onRefresh: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  draft: '#94a3b8',
  in_progress: '#3b82f6',
  review: '#f59e0b',
  approved: '#10b981',
  submitted: '#8b5cf6',
  archived: '#6b7280',
};

const FRAMEWORK_LABELS: Record<string, string> = {
  ifrs_full: 'IFRS Full',
  ifrs_sme: 'IFRS SME',
  ifrs_sme_plus: 'IFRS SME+',
  ifrs_micro: 'Micro',
};

const WP_LABELS: Record<string, string> = {
  compilation: 'Compilation',
  review: 'Review',
  audit: 'Audit',
  agreed_upon: 'Agreed-Upon',
  accounting_officer: 'Accounting Officer',
  legal_practitioner: 'Legal Practitioner',
  property_practitioner: 'Property Practitioner',
};

export default function EngagementList({ engagements, loading, onOpen, onRefresh }: Props) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this engagement? This cannot be undone.')) return;
    
    setDeletingId(id);
    try {
      await engagementApi.delete(id);
      onRefresh();
    } catch (error) {
      console.error('Delete failed:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const handleRollForward = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const result = await engagementApi.rollForward(id);
      if (result.success) {
        onRefresh();
      }
    } catch (error) {
      console.error('Roll forward failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="reporting-loading">
        <div className="reporting-spinner" />
        <p>Loading client files...</p>
      </div>
    );
  }

  if (engagements.length === 0) {
    return (
      <div className="reporting-empty-state">
        <div className="reporting-empty-icon">📋</div>
        <h3>No client files yet</h3>
        <p>Create your first client file to start preparing financial statements</p>
      </div>
    );
  }

  return (
    <div className="engagement-list">
      <table className="engagement-table">
        <thead>
          <tr>
            <th>Entity Name</th>
            <th>Reg. Number</th>
            <th>Year End</th>
            <th>Framework</th>
            <th>Working Paper</th>
            <th>Status</th>
            <th>Last Updated</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {engagements.map(eng => (
            <tr key={eng.id} onClick={() => onOpen(eng.id)} className="engagement-row">
              <td className="engagement-name">{eng.entity_name}</td>
              <td>{eng.registration_number || '—'}</td>
              <td>{new Date(eng.financial_year_end).toLocaleDateString('en-ZA')}</td>
              <td>
                <span className="framework-badge">
                  {FRAMEWORK_LABELS[eng.reporting_framework] || eng.reporting_framework}
                </span>
              </td>
              <td>{WP_LABELS[eng.working_paper_type] || eng.working_paper_type}</td>
              <td>
                <span
                  className="status-badge"
                  style={{ backgroundColor: STATUS_COLORS[eng.status] || '#94a3b8' }}
                >
                  {eng.status.replace(/_/g, ' ')}
                </span>
              </td>
              <td>{new Date(eng.updated_at).toLocaleDateString('en-ZA')}</td>
              <td className="engagement-actions" onClick={e => e.stopPropagation()}>
                <button
                  className="btn-icon"
                  title="Roll forward to next year"
                  onClick={(e) => handleRollForward(eng.id, e)}
                >
                  ⏭
                </button>
                <button
                  className="btn-icon btn-danger"
                  title="Delete"
                  onClick={(e) => handleDelete(eng.id, e)}
                  disabled={deletingId === eng.id}
                >
                  🗑
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
