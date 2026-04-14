/**
 * Engagement Workspace - The main working area for a single client file
 * Tabbed interface: Setup | Trial Balance | Link Accounts | Financials | Notes | Disclosures
 * 
 * This is the Siyabusa equivalent of Draftworx's tabbed workspace
 * but designed for a modern web-first experience.
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { engagementApi } from '../services/reporting.api';
import WorkingTrialBalance from './WorkingTrialBalance';
import FinancialStatements from './FinancialStatements';
import EngagementSetup from './EngagementSetup';
import NotesEditor from './NotesEditor';
import DisclosureChecklist from './DisclosureChecklist';

interface Engagement {
  id: string;
  entity_name: string;
  registration_number?: string;
  financial_year_end: string;
  financial_year_start: string;
  reporting_framework: string;
  working_paper_type: string;
  status: string;
  locked_at?: string;
  [key: string]: unknown;
}

type Tab = 'setup' | 'trial-balance' | 'financials' | 'notes' | 'disclosures';

interface Props {
  onBack: () => void;
}

export default function EngagementWorkspace({ onBack }: Props) {
  const { engagementId } = useParams<{ engagementId: string }>();
  const [engagement, setEngagement] = useState<Engagement | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('trial-balance');
  const [loading, setLoading] = useState(true);

  const fetchEngagement = useCallback(async () => {
    if (!engagementId) return;
    try {
      setLoading(true);
      const result = await engagementApi.get(engagementId);
      if (result.success) {
        setEngagement(result.data as Engagement);
      }
    } catch (error) {
      console.error('Error fetching engagement:', error);
    } finally {
      setLoading(false);
    }
  }, [engagementId]);

  useEffect(() => {
    fetchEngagement();
  }, [fetchEngagement]);

  if (loading) {
    return (
      <div className="reporting-loading">
        <div className="reporting-spinner" />
        <p>Loading engagement...</p>
      </div>
    );
  }

  if (!engagement) {
    return (
      <div className="reporting-error">
        <h3>Engagement not found</h3>
        <button className="btn-secondary" onClick={onBack}>← Back to Files</button>
      </div>
    );
  }

  const isLocked = !!engagement.locked_at;
  const yearEnd = new Date(engagement.financial_year_end).toLocaleDateString('en-ZA', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'setup', label: 'Client Setup', icon: '⚙️' },
    { id: 'trial-balance', label: 'Trial Balance', icon: '📊' },
    { id: 'financials', label: 'View Financials', icon: '📄' },
    { id: 'notes', label: 'Notes', icon: '📝' },
    { id: 'disclosures', label: 'Disclosures', icon: '✅' },
  ];

  return (
    <div className="engagement-workspace">
      {/* Workspace Header */}
      <div className="workspace-header">
        <div className="workspace-header-left">
          <button className="btn-back" onClick={onBack}>← Back</button>
          <div className="workspace-title-group">
            <h2 className="workspace-entity-name">{engagement.entity_name}</h2>
            <span className="workspace-meta">
              {engagement.registration_number && `(${engagement.registration_number})`}
              {' · '}Year ended {yearEnd}
            </span>
          </div>
        </div>
        <div className="workspace-header-right">
          {isLocked && (
            <span className="workspace-locked-badge">🔒 Locked</span>
          )}
          <span className={`status-badge status-${engagement.status}`}>
            {engagement.status.replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="workspace-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`workspace-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="workspace-content">
        {activeTab === 'setup' && (
          <EngagementSetup
            engagement={engagement}
            isLocked={isLocked}
            onUpdated={fetchEngagement}
          />
        )}

        {activeTab === 'trial-balance' && (
          <WorkingTrialBalance
            engagementId={engagement.id}
            isLocked={isLocked}
          />
        )}

        {activeTab === 'financials' && (
          <FinancialStatements
            engagementId={engagement.id}
            entityName={engagement.entity_name}
            registrationNumber={engagement.registration_number}
          />
        )}

        {activeTab === 'notes' && (
          <NotesEditor
            engagementId={engagement.id}
            isLocked={isLocked}
          />
        )}

        {activeTab === 'disclosures' && (
          <DisclosureChecklist
            engagementId={engagement.id}
            isLocked={isLocked}
          />
        )}
      </div>

      {/* Status Bar */}
      <div className="workspace-statusbar">
        <span>Framework: {engagement.reporting_framework.replace(/_/g, ' ').toUpperCase()}</span>
        <span>Working Paper: {engagement.working_paper_type.replace(/_/g, ' ')}</span>
        <span>Currency: ZAR</span>
      </div>
    </div>
  );
}
