import React, { useState } from 'react';
import './Healthcare.css';

const AuditLogs: React.FC = () => {
  const logs = [
    { id: 'LOG001', timestamp: '2025-11-11 10:45:23', user: 'John Smith', action: 'Created Sales Order', module: 'Sales', details: 'Order #SO-2025-1147', ipAddress: '192.168.1.45', status: 'Success' },
    { id: 'LOG002', timestamp: '2025-11-11 10:42:15', user: 'Sarah Johnson', action: 'Updated Customer', module: 'CRM', details: 'Customer #CUS-5678', ipAddress: '192.168.1.52', status: 'Success' },
    { id: 'LOG003', timestamp: '2025-11-11 10:38:07', user: 'Mike Brown', action: 'Login Attempt', module: 'Security', details: 'Failed - Invalid password', ipAddress: '192.168.1.89', status: 'Failed' },
    { id: 'LOG004', timestamp: '2025-11-11 10:35:42', user: 'Emily Davis', action: 'Generated Report', module: 'Finance', details: 'Balance Sheet FY2025', ipAddress: '192.168.1.63', status: 'Success' },
    { id: 'LOG005', timestamp: '2025-11-11 10:30:18', user: 'John Smith', action: 'Updated Settings', module: 'Administration', details: 'Changed company info', ipAddress: '192.168.1.45', status: 'Success' },
  ];

  return (
    <div className="healthcare-page">
      <div className="page-header">
        <div className="header-content">
          <h1>🔍 Audit Logs</h1>
          <p>Complete system activity tracking and audit trail</p>
        </div>
        <div className="header-actions">
          <button className="btn-primary">📥 Export Logs</button>
          <button className="btn-secondary">🔍 Advanced Filter</button>
        </div>
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>📝</div>
          <div className="metric-details">
            <div className="metric-value">28,547</div>
            <div className="metric-label">Total Events</div>
            <div className="metric-change positive">Last 30 days</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>✅</div>
          <div className="metric-details">
            <div className="metric-value">27,982</div>
            <div className="metric-label">Successful</div>
            <div className="metric-change positive">98.0% success rate</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon" style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}>⚠️</div>
          <div className="metric-details">
            <div className="metric-value">565</div>
            <div className="metric-label">Failed Events</div>
            <div className="metric-change warning">Requires review</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>👤</div>
          <div className="metric-details">
            <div className="metric-value">124</div>
            <div className="metric-label">Active Users</div>
            <div className="metric-change neutral">This period</div>
          </div>
        </div>
      </div>

      <div className="tabs-container">
        <div className="tab-content">
          <div className="data-section">
            <div className="section-header">
              <h2>Activity Log</h2>
              <div className="section-actions">
                <select className="filter-select">
                  <option>All Modules</option>
                  <option>Sales</option>
                  <option>Finance</option>
                  <option>Security</option>
                  <option>Administration</option>
                </select>
                <select className="filter-select">
                  <option>Last 24 Hours</option>
                  <option>Last 7 Days</option>
                  <option>Last 30 Days</option>
                  <option>Custom Range</option>
                </select>
                <input type="text" placeholder="Search logs..." className="search-input" />
                <button className="btn-icon">🔍</button>
              </div>
            </div>
            <div className="data-table">
              <table>
                <thead>
                  <tr>
                    <th>Log ID</th>
                    <th>Timestamp</th>
                    <th>User</th>
                    <th>Action</th>
                    <th>Module</th>
                    <th>Details</th>
                    <th>IP Address</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id}>
                      <td><strong>{log.id}</strong></td>
                      <td>{log.timestamp}</td>
                      <td>{log.user}</td>
                      <td>{log.action}</td>
                      <td><span className="status-badge" style={{ background: '#667eea' }}>{log.module}</span></td>
                      <td>{log.details}</td>
                      <td><code style={{ fontSize: '0.875rem', color: '#64748b' }}>{log.ipAddress}</code></td>
                      <td><span className="status-badge" style={{ background: log.status === 'Success' ? '#10b981' : '#ef4444' }}>{log.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditLogs;
