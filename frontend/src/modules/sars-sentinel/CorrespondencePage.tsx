import React, { useState, useEffect } from 'react';
import '../../styles/erp-ui.css';

interface Correspondence {
  id: string;
  reference_number: string;
  client_name: string;
  client_tax_number: string;
  document_type: string;
  received_date: string;
  deadline: string;
  days_remaining: number;
  urgency_level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'NEW' | 'IN_PROGRESS' | 'AWAITING_CLIENT' | 'RESOLVED' | 'OVERDUE';
  assigned_to: string;
  description: string;
}

const CorrespondencePage: React.FC = () => {
  const [correspondence, setCorrespondence] = useState<Correspondence[]>([]);
  const [filter, setFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchCorrespondence();
  }, []);

  const fetchCorrespondence = async () => {
    // Mock data - replace with actual API call
    const mockData: Correspondence[] = [
      {
        id: '1',
        reference_number: 'RFI-2025-1234',
        client_name: 'ABC Trading (Pty) Ltd',
        client_tax_number: '9012345678',
        document_type: 'Request for Information',
        received_date: '2025-11-01',
        deadline: '2025-11-15',
        days_remaining: 7,
        urgency_level: 'HIGH',
        status: 'IN_PROGRESS',
        assigned_to: 'John Smith',
        description: 'SARS requesting supporting documentation for VAT input claims for period ending October 2025'
      },
      {
        id: '2',
        reference_number: 'ADR-2025-5678',
        client_name: 'XYZ Manufacturing CC',
        client_tax_number: '9087654321',
        document_type: 'Additional Document Request',
        received_date: '2025-10-28',
        deadline: '2025-11-08',
        days_remaining: 0,
        urgency_level: 'CRITICAL',
        status: 'OVERDUE',
        assigned_to: 'Sarah Johnson',
        description: 'Additional documentation required for PAYE reconciliation discrepancy'
      },
      {
        id: '3',
        reference_number: 'AUD-2025-9012',
        client_name: 'Tech Solutions Ltd',
        client_tax_number: '9034567890',
        document_type: 'Audit Notice',
        received_date: '2025-11-05',
        deadline: '2025-11-25',
        days_remaining: 17,
        urgency_level: 'CRITICAL',
        status: 'NEW',
        assigned_to: 'Unassigned',
        description: 'Notice of selection for comprehensive audit - 2023/2024 tax year'
      },
      {
        id: '4',
        reference_number: 'ITR-2025-3456',
        client_name: 'Retail Group SA',
        client_tax_number: '9056789012',
        document_type: 'IT14 Query',
        received_date: '2025-11-06',
        deadline: '2025-11-20',
        days_remaining: 12,
        urgency_level: 'MEDIUM',
        status: 'AWAITING_CLIENT',
        assigned_to: 'Michael Brown',
        description: 'Query regarding foreign dividend withholding tax calculation'
      },
      {
        id: '5',
        reference_number: 'VAT-2025-7890',
        client_name: 'Import Export Co',
        client_tax_number: '9078901234',
        document_type: 'VAT Verification',
        received_date: '2025-10-15',
        deadline: '2025-11-10',
        days_remaining: 2,
        urgency_level: 'HIGH',
        status: 'IN_PROGRESS',
        assigned_to: 'Lisa Anderson',
        description: 'Verification of imported goods VAT treatment and customs documentation'
      }
    ];

    setCorrespondence(mockData);
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'CRITICAL':
        return '#ef4444';
      case 'HIGH':
        return '#f59e0b';
      case 'MEDIUM':
        return '#eab308';
      case 'LOW':
        return '#10b981';
      default:
        return '#64748b';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'NEW':
        return '#3b82f6';
      case 'IN_PROGRESS':
        return '#8b5cf6';
      case 'AWAITING_CLIENT':
        return '#f59e0b';
      case 'RESOLVED':
        return '#10b981';
      case 'OVERDUE':
        return '#ef4444';
      default:
        return '#64748b';
    }
  };

  const filteredCorrespondence = correspondence.filter((item) => {
    const matchesFilter = filter === 'ALL' || item.status === filter;
    const matchesSearch =
      searchTerm === '' ||
      item.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.reference_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.document_type.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">📥 SARS Correspondence</h1>
          <p className="dashboard-subtitle">Manage all SARS communications in one place</p>
        </div>
        <button className="action-button primary">+ New Correspondence</button>
      </div>

      {/* Filters */}
      <div className="content-card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-content">
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '300px' }}>
              <input
                type="text"
                placeholder="🔍 Search by client, reference, or document type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem'
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {['ALL', 'NEW', 'IN_PROGRESS', 'AWAITING_CLIENT', 'OVERDUE', 'RESOLVED'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className="filter-button"
                  style={{
                    padding: '0.5rem 1rem',
                    border: filter === status ? '2px solid #667eea' : '1px solid #e2e8f0',
                    borderRadius: '0.5rem',
                    background: filter === status ? '#eff6ff' : 'white',
                    color: filter === status ? '#667eea' : '#64748b',
                    fontSize: '0.875rem',
                    fontWeight: filter === status ? 600 : 400,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {status.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Correspondence List */}
      <div className="content-card">
        <div className="card-content">
          {filteredCorrespondence.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 2rem', color: '#64748b' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
              <h3 style={{ marginBottom: '0.5rem' }}>No correspondence found</h3>
              <p>Try adjusting your filters or search terms</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {filteredCorrespondence.map((item) => (
                <div
                  key={item.id}
                  className="correspondence-item"
                  style={{
                    border: '1px solid #e2e8f0',
                    borderLeft: `4px solid ${getUrgencyColor(item.urgency_level)}`,
                    borderRadius: '0.5rem',
                    padding: '1.5rem',
                    background: 'white',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                        {item.document_type}
                      </h3>
                      <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
                        {item.client_name} • Tax No: {item.client_tax_number}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                      <span
                        className="status-badge"
                        style={{
                          backgroundColor: getUrgencyColor(item.urgency_level) + '20',
                          color: getUrgencyColor(item.urgency_level),
                          padding: '0.25rem 0.75rem',
                          borderRadius: '0.25rem',
                          fontSize: '0.75rem',
                          fontWeight: 600
                        }}
                      >
                        {item.urgency_level}
                      </span>
                      <span
                        className="status-badge"
                        style={{
                          backgroundColor: getStatusColor(item.status) + '20',
                          color: getStatusColor(item.status),
                          padding: '0.25rem 0.75rem',
                          borderRadius: '0.25rem',
                          fontSize: '0.75rem',
                          fontWeight: 600
                        }}
                      >
                        {item.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  <p style={{ color: '#475569', fontSize: '0.875rem', marginBottom: '1rem' }}>
                    {item.description}
                  </p>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                      gap: '1rem',
                      padding: '1rem',
                      background: '#f8fafc',
                      borderRadius: '0.5rem',
                      marginBottom: '1rem'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>
                        Reference
                      </div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{item.reference_number}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>
                        Received
                      </div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                        {new Date(item.received_date).toLocaleDateString('en-ZA')}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>
                        Deadline
                      </div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                        {new Date(item.deadline).toLocaleDateString('en-ZA')}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>
                        Days Remaining
                      </div>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: '0.875rem',
                          color: item.days_remaining <= 0 ? '#ef4444' : item.days_remaining <= 3 ? '#f59e0b' : '#10b981'
                        }}
                      >
                        {item.days_remaining <= 0 ? `${Math.abs(item.days_remaining)} days overdue` : `${item.days_remaining} days`}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>
                        Assigned To
                      </div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{item.assigned_to}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button className="action-button">📄 View Details</button>
                    <button className="action-button">🔄 Create Workflow</button>
                    <button className="action-button">👤 Assign</button>
                    <button className="action-button">💬 Add Note</button>
                    <button className="action-button success">✅ Mark Resolved</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CorrespondencePage;
