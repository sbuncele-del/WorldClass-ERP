import React from 'react';
import EnterpriseLayout from '../../components/layout/EnterpriseLayout';
import '../../styles/erp-ui.css';

const LogisticsReports: React.FC = () => {
  const tabs = [
    { id: 'command', label: '🎯 Command Center', path: '/logistics/dashboard' },
    { id: 'planner', label: '📋 Load Planner', path: '/logistics/planner' },
    { id: 'trips', label: '🚚 Trip Management', path: '/logistics/trips' },
    { id: 'fleet', label: '🚛 Fleet', path: '/logistics/fleet' },
    { id: 'drivers', label: '👨‍✈️ Drivers', path: '/logistics/drivers' },
    { id: 'fuel', label: '⛽ Fuel', path: '/logistics/fuel' },
    { id: 'reports', label: '📊 Analytics', path: '/logistics/reports' }
  ];

  const breadcrumbs = [
    { label: 'Logistics', path: '/logistics' },
    { label: 'Reports & Analytics' }
  ];

  const reports = [
    {
      title: 'Fleet Performance Report',
      description: 'Comprehensive analysis of vehicle utilization, maintenance costs, and downtime',
      icon: '🚚',
      frequency: 'Monthly',
      lastGenerated: '2025-11-01'
    },
    {
      title: 'Driver Performance Scorecard',
      description: 'On-time delivery rates, incidents, and efficiency metrics by driver',
      icon: '👨‍✈️',
      frequency: 'Weekly',
      lastGenerated: '2025-11-07'
    },
    {
      title: 'Fuel Consumption Analysis',
      description: 'Fuel costs, efficiency trends, and anomaly detection across the fleet',
      icon: '⛽',
      frequency: 'Monthly',
      lastGenerated: '2025-11-01'
    },
    {
      title: 'Trip Summary Report',
      description: 'Completed trips, POD status, delivery performance, and customer satisfaction',
      icon: '📦',
      frequency: 'Daily',
      lastGenerated: '2025-11-10'
    },
    {
      title: 'Maintenance Schedule',
      description: 'Upcoming services, overdue maintenance, and license renewals',
      icon: '🔧',
      frequency: 'Weekly',
      lastGenerated: '2025-11-07'
    },
    {
      title: 'Cost Analysis',
      description: 'Total cost of ownership, cost per km, and budget variance analysis',
      icon: '💰',
      frequency: 'Monthly',
      lastGenerated: '2025-11-01'
    },
  ];

  return (
    <EnterpriseLayout
      moduleTitle="Reports & Analytics"
      moduleSubtitle="Performance dashboards and business intelligence"
      breadcrumbs={breadcrumbs}
      tabs={tabs}
    >
      <div className="metrics-grid">
        <div className="metric-card" style={{ borderLeftColor: '#667eea' }}>
          <div className="metric-header">
            <span className="metric-label">Available Reports</span>
            <span className="metric-icon" style={{ fontSize: '1.5rem' }}>📊</span>
          </div>
          <div className="metric-value">{reports.length}</div>
          <div className="metric-footer">
            <span className="metric-change">Automated generation</span>
          </div>
        </div>

        <div className="metric-card" style={{ borderLeftColor: '#10b981' }}>
          <div className="metric-header">
            <span className="metric-label">Daily Reports</span>
            <span className="metric-icon" style={{ fontSize: '1.5rem' }}>📅</span>
          </div>
          <div className="metric-value">1</div>
          <div className="metric-footer">
            <span className="metric-change success">Auto-sent at 7 AM</span>
          </div>
        </div>

        <div className="metric-card" style={{ borderLeftColor: '#f59e0b' }}>
          <div className="metric-header">
            <span className="metric-label">Weekly Reports</span>
            <span className="metric-icon" style={{ fontSize: '1.5rem' }}>📆</span>
          </div>
          <div className="metric-value">2</div>
          <div className="metric-footer">
            <span className="metric-change">Every Monday</span>
          </div>
        </div>

        <div className="metric-card" style={{ borderLeftColor: '#8b5cf6' }}>
          <div className="metric-header">
            <span className="metric-label">Monthly Reports</span>
            <span className="metric-icon" style={{ fontSize: '1.5rem' }}>📈</span>
          </div>
          <div className="metric-value">3</div>
          <div className="metric-footer">
            <span className="metric-change">1st of each month</span>
          </div>
        </div>
      </div>

      <div className="content-card">
        <div className="card-header">
          <h2 className="card-title">Report Catalog</h2>
        </div>
        <div className="card-content">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
            {reports.map((report, index) => (
              <div
                key={index}
                style={{
                  padding: '1.5rem',
                  border: '2px solid #e2e8f0',
                  borderRadius: '0.75rem',
                  background: 'white',
                  transition: 'all 0.2s',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#667eea';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(102, 126, 234, 0.2)';
                  e.currentTarget.style.transform = 'translateY(-4px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{
                    fontSize: '2.5rem',
                    width: '60px',
                    height: '60px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: '0.75rem'
                  }}>
                    {report.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }}>
                      {report.title}
                    </h3>
                    <span style={{
                      padding: '0.25rem 0.625rem',
                      borderRadius: '0.375rem',
                      background: '#f1f5f9',
                      color: '#475569',
                      fontSize: '0.75rem',
                      fontWeight: 600
                    }}>
                      {report.frequency}
                    </span>
                  </div>
                </div>
                <p style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: '1.6', marginBottom: '1rem' }}>
                  {report.description}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    Last: {new Date(report.lastGenerated).toLocaleDateString('en-ZA')}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="action-button" style={{ padding: '0.5rem 0.875rem', fontSize: '0.8125rem' }}>
                      📥 Download
                    </button>
                    <button className="action-button primary" style={{ padding: '0.5rem 0.875rem', fontSize: '0.8125rem' }}>
                      🔄 Generate
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="content-card">
        <div className="card-header">
          <h2 className="card-title">Quick Insights</h2>
        </div>
        <div className="card-content">
          <div style={{ display: 'grid', gap: '1rem' }}>
            {[
              { insight: 'Fleet utilization increased by 12% this month', icon: '📈', color: '#10b981' },
              { insight: 'Average fuel efficiency improved to 3.8 km/L (+0.2)', icon: '⛽', color: '#10b981' },
              { insight: '2 vehicles require maintenance this week', icon: '🔧', color: '#f59e0b' },
              { insight: 'On-time delivery rate: 92.5% (target: 95%)', icon: '📦', color: '#f59e0b' },
            ].map((item, index) => (
              <div
                key={index}
                style={{
                  padding: '1rem 1.25rem',
                  border: '2px solid #e2e8f0',
                  borderRadius: '0.75rem',
                  background: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem'
                }}
              >
                <div style={{
                  fontSize: '2rem',
                  width: '48px',
                  height: '48px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: item.color + '20',
                  borderRadius: '0.5rem'
                }}>
                  {item.icon}
                </div>
                <div style={{ flex: 1, fontSize: '0.9375rem', fontWeight: 500, color: '#475569' }}>
                  {item.insight}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </EnterpriseLayout>
  );
};

export default LogisticsReports;
