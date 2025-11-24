import React, { useState } from 'react';
import './Healthcare.css';

const Mining: React.FC = () => {
  const [activeTab, setActiveTab] = useState('operations');

  const operations = [
    { id: 'MINE001', name: 'Platinum Mine - Shaft 3', location: 'Rustenburg', status: 'Active', production: '4,200 oz/month', depth: '1,850m', workers: 450, safety: 'Excellent' },
    { id: 'MINE002', name: 'Gold Mine - North Pit', location: 'Witwatersrand', status: 'Active', production: '850 kg/month', depth: '2,400m', workers: 620, safety: 'Good' },
    { id: 'MINE003', name: 'Coal Mine - Open Cast', location: 'Mpumalanga', status: 'Active', production: '125,000 tons/month', depth: '180m', workers: 280, safety: 'Excellent' },
    { id: 'MINE004', name: 'Diamond Mine - Kimberlite', location: 'Kimberley', status: 'Maintenance', production: '12,500 carats/month', depth: '780m', workers: 340, safety: 'Good' },
  ];

  const equipment = [
    { id: 'EQ001', name: 'Continuous Miner CM-800', type: 'Mining Machine', status: 'Active', location: 'Shaft 3', hoursUsed: '8,240 hrs', utilization: '92%', nextService: '2025-11-20' },
    { id: 'EQ002', name: 'Haul Truck CAT 797F', type: 'Transport', status: 'Active', location: 'North Pit', hoursUsed: '12,450 hrs', utilization: '88%', nextService: '2025-11-25' },
    { id: 'EQ003', name: 'Drilling Rig Atlas Copco', type: 'Drilling', status: 'Maintenance', location: 'Workshop', hoursUsed: '6,830 hrs', utilization: '0%', nextService: '2025-11-15' },
    { id: 'EQ004', name: 'Conveyor System CS-2400', type: 'Processing', status: 'Active', location: 'Coal Mine', hoursUsed: '15,600 hrs', utilization: '95%', nextService: '2025-12-01' },
  ];

  const safety = [
    { id: 'SAF001', date: '2025-11-11', shift: 'Morning', location: 'Shaft 3', incident: 'Minor Slip', severity: 'Low', status: 'Resolved', reportedBy: 'Safety Officer A' },
    { id: 'SAF002', date: '2025-11-10', shift: 'Afternoon', location: 'North Pit', incident: 'Equipment Malfunction', severity: 'Medium', status: 'Under Review', reportedBy: 'Supervisor B' },
    { id: 'SAF003', date: '2025-11-09', shift: 'Night', location: 'Coal Mine', incident: 'Near Miss - Falling Rock', severity: 'Medium', status: 'Resolved', reportedBy: 'Safety Officer C' },
  ];

  const production = [
    { month: 'Nov 2025', platinum: '4,200 oz', gold: '850 kg', coal: '125,000 tons', diamonds: '12,500 carats', revenue: 'R 145M', target: 'R 140M', status: 'Above Target' },
    { month: 'Oct 2025', platinum: '4,100 oz', gold: '820 kg', coal: '118,000 tons', diamonds: '11,800 carats', revenue: 'R 138M', target: 'R 135M', status: 'Above Target' },
    { month: 'Sep 2025', platinum: '3,950 oz', gold: '795 kg', coal: '112,000 tons', diamonds: '10,900 carats', revenue: 'R 128M', target: 'R 135M', status: 'Below Target' },
  ];

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': case 'resolved': case 'excellent': case 'above target': return '#10b981';
      case 'maintenance': case 'under review': case 'good': case 'medium': return '#f59e0b';
      case 'critical': case 'high': case 'below target': return '#ef4444';
      default: return '#64748b';
    }
  };

  return (
    <div className="healthcare-page">
      <div className="page-header">
        <div className="header-content">
          <h1>⛏️ Mining Operations</h1>
          <p>Mine management, equipment tracking, safety monitoring, and production analytics</p>
        </div>
        <div className="header-actions">
          <button className="btn-primary">➕ New Operation</button>
          <button className="btn-secondary">📊 Production Report</button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>⛏️</div>
          <div className="metric-details">
            <div className="metric-value">8</div>
            <div className="metric-label">Active Mines</div>
            <div className="metric-change positive">4 above production target</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>💰</div>
          <div className="metric-details">
            <div className="metric-value">R 145M</div>
            <div className="metric-label">Monthly Revenue</div>
            <div className="metric-change positive">+5.1% vs target</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>👷</div>
          <div className="metric-details">
            <div className="metric-value">1,690</div>
            <div className="metric-label">Workforce</div>
            <div className="metric-change positive">All shifts covered</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>🛡️</div>
          <div className="metric-details">
            <div className="metric-value">98.5%</div>
            <div className="metric-label">Safety Score</div>
            <div className="metric-change positive">0 major incidents</div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="tabs-container">
        <div className="tabs-nav">
          <button className={`tab ${activeTab === 'operations' ? 'active' : ''}`} onClick={() => setActiveTab('operations')}>
            ⛏️ Operations
          </button>
          <button className={`tab ${activeTab === 'equipment' ? 'active' : ''}`} onClick={() => setActiveTab('equipment')}>
            🚜 Equipment
          </button>
          <button className={`tab ${activeTab === 'safety' ? 'active' : ''}`} onClick={() => setActiveTab('safety')}>
            🛡️ Safety & Compliance
          </button>
          <button className={`tab ${activeTab === 'production' ? 'active' : ''}`} onClick={() => setActiveTab('production')}>
            📊 Production Analytics
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'operations' && (
            <div className="data-section">
              <div className="section-header">
                <h2>Mining Operations</h2>
                <div className="section-actions">
                  <input type="text" placeholder="Search operations..." className="search-input" />
                  <button className="btn-icon">🔍</button>
                </div>
              </div>
              <div className="data-table">
                <table>
                  <thead>
                    <tr>
                      <th>Mine ID</th>
                      <th>Name</th>
                      <th>Location</th>
                      <th>Status</th>
                      <th>Production</th>
                      <th>Depth</th>
                      <th>Workers</th>
                      <th>Safety Rating</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {operations.map(mine => (
                      <tr key={mine.id}>
                        <td><strong>{mine.id}</strong></td>
                        <td>{mine.name}</td>
                        <td>{mine.location}</td>
                        <td><span className="status-badge" style={{ background: getStatusColor(mine.status) }}>{mine.status}</span></td>
                        <td><strong>{mine.production}</strong></td>
                        <td>{mine.depth}</td>
                        <td>{mine.workers}</td>
                        <td><span className="status-badge" style={{ background: getStatusColor(mine.safety) }}>{mine.safety}</span></td>
                        <td>
                          <button className="btn-table">View</button>
                          <button className="btn-table">Reports</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'equipment' && (
            <div className="data-section">
              <div className="section-header">
                <h2>Mining Equipment Fleet</h2>
                <div className="section-actions">
                  <select className="filter-select">
                    <option>All Equipment</option>
                    <option>Mining Machines</option>
                    <option>Transport</option>
                    <option>Drilling</option>
                  </select>
                  <button className="btn-icon">🔧</button>
                </div>
              </div>
              <div className="data-table">
                <table>
                  <thead>
                    <tr>
                      <th>Equipment ID</th>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Location</th>
                      <th>Hours Used</th>
                      <th>Utilization</th>
                      <th>Next Service</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {equipment.map(item => (
                      <tr key={item.id}>
                        <td><strong>{item.id}</strong></td>
                        <td>{item.name}</td>
                        <td>{item.type}</td>
                        <td><span className="status-badge" style={{ background: getStatusColor(item.status) }}>{item.status}</span></td>
                        <td>{item.location}</td>
                        <td><strong>{item.hoursUsed}</strong></td>
                        <td>{item.utilization}</td>
                        <td>{item.nextService}</td>
                        <td>
                          <button className="btn-table">Schedule</button>
                          <button className="btn-table">Maintain</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'safety' && (
            <div className="data-section">
              <div className="section-header">
                <h2>Safety & Compliance Log</h2>
                <div className="section-actions">
                  <button className="btn-icon">➕</button>
                  <button className="btn-icon">📋</button>
                </div>
              </div>
              <div className="data-table">
                <table>
                  <thead>
                    <tr>
                      <th>Incident ID</th>
                      <th>Date</th>
                      <th>Shift</th>
                      <th>Location</th>
                      <th>Incident</th>
                      <th>Severity</th>
                      <th>Status</th>
                      <th>Reported By</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {safety.map(incident => (
                      <tr key={incident.id}>
                        <td><strong>{incident.id}</strong></td>
                        <td>{incident.date}</td>
                        <td>{incident.shift}</td>
                        <td>{incident.location}</td>
                        <td>{incident.incident}</td>
                        <td><span className="status-badge" style={{ background: getStatusColor(incident.severity) }}>{incident.severity}</span></td>
                        <td><span className="status-badge" style={{ background: getStatusColor(incident.status) }}>{incident.status}</span></td>
                        <td>{incident.reportedBy}</td>
                        <td>
                          <button className="btn-table">View</button>
                          <button className="btn-table">Follow-up</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'production' && (
            <div className="data-section">
              <div className="section-header">
                <h2>Production Analytics</h2>
                <div className="section-actions">
                  <select className="filter-select">
                    <option>Last 3 Months</option>
                    <option>Last 6 Months</option>
                    <option>Year to Date</option>
                  </select>
                </div>
              </div>
              <div className="data-table">
                <table>
                  <thead>
                    <tr>
                      <th>Period</th>
                      <th>Platinum</th>
                      <th>Gold</th>
                      <th>Coal</th>
                      <th>Diamonds</th>
                      <th>Revenue</th>
                      <th>Target</th>
                      <th>Performance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {production.map((period, idx) => (
                      <tr key={idx}>
                        <td><strong>{period.month}</strong></td>
                        <td>{period.platinum}</td>
                        <td>{period.gold}</td>
                        <td>{period.coal}</td>
                        <td>{period.diamonds}</td>
                        <td><strong>{period.revenue}</strong></td>
                        <td>{period.target}</td>
                        <td><span className="status-badge" style={{ background: getStatusColor(period.status) }}>{period.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Mining;
