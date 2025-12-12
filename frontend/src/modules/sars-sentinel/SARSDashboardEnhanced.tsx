import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import EnterpriseLayout from '../../components/layout/EnterpriseLayout';
import type { SecondaryNavSection } from '../../components/layout/SecondaryNav';
import { FileText, Calendar, Shield, Users, AlertCircle, CheckCircle, Upload, Download } from 'lucide-react';
import '../../styles/erp-ui.css';

interface SARSStats {
  correspondence: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    overdue: number;
    due_this_week: number;
    total_active: number;
  };
  tax_submissions: {
    emp201_pending: number;
    emp501_due: number;
    vat201_pending: number;
    it14_pending: number;
  };
  client_compliance: {
    total_clients: number;
    fully_compliant: number;
    at_risk: number;
    non_compliant: number;
  };
  upcoming_deadlines: Array<{
    type: string;
    due_date: string;
    days_remaining: number;
    client_count: number;
  }>;
}

const SARSDashboardEnhanced: React.FC = () => {
  const [stats, setStats] = useState<SARSStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Mock data - replace with actual API call
      setStats({
        correspondence: {
          critical: 8,
          high: 15,
          medium: 23,
          low: 12,
          overdue: 3,
          due_this_week: 18,
          total_active: 58
        },
        tax_submissions: {
          emp201_pending: 42,
          emp501_due: 5,
          vat201_pending: 38,
          it14_pending: 12
        },
        client_compliance: {
          total_clients: 247,
          fully_compliant: 198,
          at_risk: 35,
          non_compliant: 14
        },
        upcoming_deadlines: [
          { type: 'EMP201', due_date: '2025-11-07', days_remaining: -1, client_count: 42 },
          { type: 'VAT201', due_date: '2025-11-25', days_remaining: 17, client_count: 38 },
          { type: 'PAYE Monthly', due_date: '2025-11-07', days_remaining: -1, client_count: 42 },
          { type: 'IRP5/IT3(a)', due_date: '2026-05-31', days_remaining: 204, client_count: 127 }
        ]
      });
    } catch (error) {
      console.error('Error fetching SARS dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0
    }).format(value);
  };

  const getCompliancePercentage = () => {
    if (!stats) return 0;
    const { total_clients, fully_compliant } = stats.client_compliance;
    return total_clients > 0 ? Math.round((fully_compliant / total_clients) * 100) : 0;
  };

  const getUrgencyColor = (daysRemaining: number) => {
    if (daysRemaining < 0) return '#ef4444'; // Red - overdue
    if (daysRemaining <= 3) return '#f59e0b'; // Orange - critical
    if (daysRemaining <= 7) return '#eab308'; // Yellow - warning
    return '#10b981'; // Green - ok
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <p>Loading SARS Sentinel dashboard...</p>
        </div>
      </div>
    );
  }

  const sarsTabs = [
    { id: 'dashboard', label: 'Dashboard', path: '/sars/dashboard' },
    { id: 'correspondence', label: 'Correspondence', path: '/sars/correspondence' },
    { id: 'integration', label: '🔗 API Integration', path: '/sars/integration' },
    { id: 'submissions', label: 'Tax Submissions', path: '/sars/submissions' },
    { id: 'clients', label: 'Client Compliance', path: '/sars/clients' },
    { id: 'deadlines', label: 'Deadline Calendar', path: '/sars/deadlines' },
    { id: 'audit', label: 'Audit Shield', path: '/sars/audit' },
  ];

  const secondaryNav: SecondaryNavSection[] = [
    {
      title: 'Quick Actions',
      items: [
        { id: 'new-correspondence', label: 'New Correspondence', path: '/sars/correspondence/new', icon: <FileText size={16} /> },
        { id: 'submit-returns', label: 'Submit Returns', path: '/sars/submissions/new', icon: <Upload size={16} /> },
        { id: 'download-forms', label: 'Download Forms', path: '/sars/forms', icon: <Download size={16} /> }
      ]
    },
    {
      title: 'Tax Submissions',
      items: [
        { id: 'emp201', label: 'EMP201 Monthly', path: '/sars/submissions/emp201', icon: <Calendar size={16} /> },
        { id: 'vat201', label: 'VAT201 Returns', path: '/sars/submissions/vat201', icon: <Calendar size={16} /> },
        { id: 'it14', label: 'IT14 Provisional', path: '/sars/submissions/it14', icon: <Calendar size={16} /> },
        { id: 'emp501', label: 'EMP501 Annual', path: '/sars/submissions/emp501', icon: <Calendar size={16} /> }
      ]
    },
    {
      title: 'Reports',
      items: [
        { id: 'compliance-report', label: 'Compliance Report', path: '/sars/reports/compliance', icon: <Shield size={16} /> },
        { id: 'client-summary', label: 'Client Summary', path: '/sars/reports/clients', icon: <Users size={16} /> },
        { id: 'deadline-report', label: 'Deadline Report', path: '/sars/reports/deadlines', icon: <AlertCircle size={16} /> }
      ]
    }
  ];

  return (
    <EnterpriseLayout
      moduleTitle="SARS Sentinel"
      moduleSubtitle="Compliance Command Center - Never miss a SARS deadline again"
      breadcrumbs={[
        { label: 'Dashboard', path: '/' },
        { label: 'SARS Sentinel', path: '/sars/dashboard' }
      ]}
      tabs={sarsTabs}
      secondaryNav={secondaryNav}
      actionButtons={[
        {
          label: 'New Correspondence',
          icon: <FileText size={18} />,
          variant: 'secondary'
        },
        {
          label: 'Submit Returns',
          icon: <Upload size={18} />,
          variant: 'primary'
        }
      ]}
    >
      <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">🇿🇦 SARS Sentinel Dashboard</h1>
          <p className="dashboard-subtitle">
            Compliance Command Center - Never miss a SARS deadline again
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link to="/sars/correspondence" className="action-button">
            📥 New Correspondence
          </Link>
          <Link to="/sars/submissions" className="action-button primary">
            📤 Submit Returns
          </Link>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="metrics-grid">
        <div className="metric-card" style={{ borderLeftColor: '#ef4444' }}>
          <div className="metric-header">
            <span className="metric-label">Critical Items</span>
            <span className="metric-icon">🔴</span>
          </div>
          <div className="metric-value">{stats?.correspondence.critical || 0}</div>
          <div className="metric-footer">
            <span className="metric-change danger">
              {stats?.correspondence.overdue || 0} overdue
            </span>
          </div>
        </div>

        <div className="metric-card" style={{ borderLeftColor: '#f59e0b' }}>
          <div className="metric-header">
            <span className="metric-label">Due This Week</span>
            <span className="metric-icon">⏰</span>
          </div>
          <div className="metric-value">{stats?.correspondence.due_this_week || 0}</div>
          <div className="metric-footer">
            <span className="metric-change warning">
              Across {stats?.client_compliance.total_clients || 0} clients
            </span>
          </div>
        </div>

        <div className="metric-card" style={{ borderLeftColor: '#8b5cf6' }}>
          <div className="metric-header">
            <span className="metric-label">Active Correspondence</span>
            <span className="metric-icon">📧</span>
          </div>
          <div className="metric-value">{stats?.correspondence.total_active || 0}</div>
          <div className="metric-footer">
            <span className="metric-change">
              {stats?.correspondence.high || 0} high priority
            </span>
          </div>
        </div>

        <div className="metric-card" style={{ borderLeftColor: '#10b981' }}>
          <div className="metric-header">
            <span className="metric-label">Compliance Rate</span>
            <span className="metric-icon">✅</span>
          </div>
          <div className="metric-value">{getCompliancePercentage()}%</div>
          <div className="metric-footer">
            <span className="metric-change success">
              {stats?.client_compliance.fully_compliant || 0} of {stats?.client_compliance.total_clients || 0} clients
            </span>
          </div>
        </div>
      </div>

      {/* Tax Submissions Overview */}
      <div className="content-card">
        <div className="card-header">
          <h2 className="card-title">📊 Pending Tax Submissions</h2>
        </div>
        <div className="card-content">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
            <div className="submission-stat">
              <div className="submission-type">EMP201 Monthly</div>
              <div className="submission-count">{stats?.tax_submissions.emp201_pending || 0}</div>
              <div className="submission-label">clients pending</div>
            </div>
            <div className="submission-stat">
              <div className="submission-type">VAT201 Returns</div>
              <div className="submission-count">{stats?.tax_submissions.vat201_pending || 0}</div>
              <div className="submission-label">clients pending</div>
            </div>
            <div className="submission-stat">
              <div className="submission-type">EMP501 Annual</div>
              <div className="submission-count">{stats?.tax_submissions.emp501_due || 0}</div>
              <div className="submission-label">due soon</div>
            </div>
            <div className="submission-stat">
              <div className="submission-type">IT14 Returns</div>
              <div className="submission-count">{stats?.tax_submissions.it14_pending || 0}</div>
              <div className="submission-label">clients pending</div>
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Deadlines */}
      <div className="content-card">
        <div className="card-header">
          <h2 className="card-title">📅 Critical Upcoming Deadlines</h2>
        </div>
        <div className="card-content">
          <div className="data-table">
            <table>
              <thead>
                <tr>
                  <th>Submission Type</th>
                  <th>Due Date</th>
                  <th>Days Remaining</th>
                  <th>Affected Clients</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {stats?.upcoming_deadlines.map((deadline, index) => (
                  <tr key={index}>
                    <td>
                      <strong>{deadline.type}</strong>
                    </td>
                    <td>{new Date(deadline.due_date).toLocaleDateString('en-ZA')}</td>
                    <td>
                      <span
                        style={{
                          color: getUrgencyColor(deadline.days_remaining),
                          fontWeight: 600
                        }}
                      >
                        {deadline.days_remaining < 0
                          ? `${Math.abs(deadline.days_remaining)} days overdue`
                          : `${deadline.days_remaining} days`}
                      </span>
                    </td>
                    <td>{deadline.client_count} clients</td>
                    <td>
                      <span
                        className="status-badge"
                        style={{
                          backgroundColor: getUrgencyColor(deadline.days_remaining) + '20',
                          color: getUrgencyColor(deadline.days_remaining)
                        }}
                      >
                        {deadline.days_remaining < 0
                          ? 'OVERDUE'
                          : deadline.days_remaining <= 3
                          ? 'CRITICAL'
                          : deadline.days_remaining <= 7
                          ? 'URGENT'
                          : 'ON TRACK'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Client Compliance Overview */}
      <div className="content-card">
        <div className="card-header">
          <h2 className="card-title">🛡️ Client Compliance Overview</h2>
        </div>
        <div className="card-content">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#10b981' }}>
                {stats?.client_compliance.fully_compliant || 0}
              </div>
              <div style={{ color: '#64748b', fontSize: '0.875rem' }}>Fully Compliant</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#f59e0b' }}>
                {stats?.client_compliance.at_risk || 0}
              </div>
              <div style={{ color: '#64748b', fontSize: '0.875rem' }}>At Risk</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#ef4444' }}>
                {stats?.client_compliance.non_compliant || 0}
              </div>
              <div style={{ color: '#64748b', fontSize: '0.875rem' }}>Non-Compliant</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#667eea' }}>
                {stats?.client_compliance.total_clients || 0}
              </div>
              <div style={{ color: '#64748b', fontSize: '0.875rem' }}>Total Clients</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="content-card">
        <div className="card-header">
          <h2 className="card-title">⚡ Quick Actions</h2>
        </div>
        <div className="card-content">
          <div className="quick-actions-grid">
            <Link to="/sars/correspondence" className="quick-action-card">
              <div className="quick-action-icon">📥</div>
              <div className="quick-action-title">Manage Correspondence</div>
              <div className="quick-action-description">
                View and respond to SARS letters
              </div>
            </Link>

            <Link to="/sars/submissions" className="quick-action-card">
              <div className="quick-action-icon">📤</div>
              <div className="quick-action-title">Submit Tax Returns</div>
              <div className="quick-action-description">
                File EMP201, VAT201, IT14, etc.
              </div>
            </Link>

            <Link to="/sars/clients" className="quick-action-card">
              <div className="quick-action-icon">👥</div>
              <div className="quick-action-title">Client Compliance</div>
              <div className="quick-action-description">
                Monitor client tax compliance
              </div>
            </Link>

            <Link to="/sars/deadlines" className="quick-action-card">
              <div className="quick-action-icon">📅</div>
              <div className="quick-action-title">Deadline Calendar</div>
              <div className="quick-action-description">
                View all upcoming SARS deadlines
              </div>
            </Link>

            <Link to="/sars/audit" className="quick-action-card">
              <div className="quick-action-icon">🛡️</div>
              <div className="quick-action-title">Audit Shield</div>
              <div className="quick-action-description">
                Continuous risk monitoring
              </div>
            </Link>

            <Link to="/sars/reports" className="quick-action-card">
              <div className="quick-action-icon">📊</div>
              <div className="quick-action-title">Compliance Reports</div>
              <div className="quick-action-description">
                Generate compliance reports
              </div>
            </Link>
          </div>
        </div>
      </div>

      <style>{`
        .submission-stat {
          text-align: center;
          padding: 1.5rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 0.75rem;
          color: white;
        }

        .submission-type {
          font-size: 0.875rem;
          opacity: 0.9;
          margin-bottom: 0.5rem;
        }

        .submission-count {
          font-size: 2.5rem;
          font-weight: bold;
          margin-bottom: 0.25rem;
        }

        .submission-label {
          font-size: 0.75rem;
          opacity: 0.8;
        }
      `}</style>
      </div>
    </EnterpriseLayout>
  );
};

export default SARSDashboardEnhanced;
