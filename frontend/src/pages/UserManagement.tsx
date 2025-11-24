import React, { useState } from 'react';
import './Healthcare.css';

const UserManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState('users');

  const users = [
    { id: 'USR001', name: 'John Smith', email: 'john.smith@company.com', role: 'Admin', status: 'Active', lastLogin: '2025-11-11 09:45', department: 'IT' },
    { id: 'USR002', name: 'Sarah Johnson', email: 'sarah.j@company.com', role: 'Manager', status: 'Active', lastLogin: '2025-11-11 10:20', department: 'Sales' },
    { id: 'USR003', name: 'Mike Brown', email: 'mike.b@company.com', role: 'User', status: 'Active', lastLogin: '2025-11-10 16:30', department: 'Finance' },
    { id: 'USR004', name: 'Emily Davis', email: 'emily.d@company.com', role: 'Manager', status: 'Inactive', lastLogin: '2025-10-28 14:15', department: 'HR' },
  ];

  return (
    <div className="healthcare-page">
      <div className="page-header">
        <div className="header-content">
          <h1>👥 User Management</h1>
          <p>Manage users, roles, permissions, and access control</p>
        </div>
        <div className="header-actions">
          <button className="btn-primary">➕ Add User</button>
          <button className="btn-secondary">🔐 Manage Roles</button>
        </div>
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>👥</div>
          <div className="metric-details">
            <div className="metric-value">124</div>
            <div className="metric-label">Total Users</div>
            <div className="metric-change positive">118 active</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>🔐</div>
          <div className="metric-details">
            <div className="metric-value">12</div>
            <div className="metric-label">Roles Defined</div>
            <div className="metric-change neutral">Custom permissions</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>✅</div>
          <div className="metric-details">
            <div className="metric-value">98</div>
            <div className="metric-label">Active Sessions</div>
            <div className="metric-change positive">Currently online</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon" style={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' }}>🔒</div>
          <div className="metric-details">
            <div className="metric-value">100%</div>
            <div className="metric-label">2FA Enabled</div>
            <div className="metric-change positive">Security enforced</div>
          </div>
        </div>
      </div>

      <div className="tabs-container">
        <div className="tabs-nav">
          <button className={`tab ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>👥 Users</button>
          <button className={`tab ${activeTab === 'roles' ? 'active' : ''}`} onClick={() => setActiveTab('roles')}>🔐 Roles & Permissions</button>
          <button className={`tab ${activeTab === 'activity' ? 'active' : ''}`} onClick={() => setActiveTab('activity')}>📊 Activity Log</button>
        </div>

        <div className="tab-content">
          <div className="data-section">
            <div className="section-header">
              <h2>User Directory</h2>
              <div className="section-actions">
                <input type="text" placeholder="Search users..." className="search-input" />
                <button className="btn-icon">🔍</button>
              </div>
            </div>
            <div className="data-table">
              <table>
                <thead>
                  <tr>
                    <th>User ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Department</th>
                    <th>Last Login</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id}>
                      <td><strong>{user.id}</strong></td>
                      <td>{user.name}</td>
                      <td>{user.email}</td>
                      <td><span className="status-badge" style={{ background: '#667eea' }}>{user.role}</span></td>
                      <td>{user.department}</td>
                      <td>{user.lastLogin}</td>
                      <td><span className="status-badge" style={{ background: user.status === 'Active' ? '#10b981' : '#ef4444' }}>{user.status}</span></td>
                      <td>
                        <button className="btn-table">Edit</button>
                        <button className="btn-table">Disable</button>
                      </td>
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

export default UserManagement;
