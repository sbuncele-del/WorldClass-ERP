import React, { useState } from 'react';
import './Construction.css';

const Construction: React.FC = () => {
  const [activeTab, setActiveTab] = useState('projects');

  const projects = [
    { id: 'PRJ001', name: 'Downtown Office Complex', client: 'ABC Corp', status: 'In Progress', completion: 65, budget: 'R 45M', spent: 'R 28M', deadline: '2026-03-15', manager: 'John Smith' },
    { id: 'PRJ002', name: 'Residential Estate Phase 2', client: 'XYZ Developers', status: 'In Progress', completion: 42, budget: 'R 32M', spent: 'R 12M', deadline: '2026-06-30', manager: 'Sarah Jones' },
    { id: 'PRJ003', name: 'Shopping Mall Renovation', client: 'Retail Holdings', status: 'Planning', completion: 15, budget: 'R 18M', spent: 'R 2M', deadline: '2025-12-20', manager: 'Mike Brown' },
    { id: 'PRJ004', name: 'Highway Bridge Construction', client: 'Government', status: 'In Progress', completion: 78, budget: 'R 67M', spent: 'R 51M', deadline: '2025-11-30', manager: 'Emily Davis' },
  ];

  const equipment = [
    { id: 'EQ001', name: 'Excavator CAT 320', type: 'Heavy Machinery', status: 'Active', location: 'Project PRJ001', utilization: '85%', lastService: '2025-10-15', nextService: '2025-12-15' },
    { id: 'EQ002', name: 'Concrete Mixer', type: 'Equipment', status: 'Active', location: 'Project PRJ002', utilization: '72%', lastService: '2025-11-01', nextService: '2026-01-01' },
    { id: 'EQ003', name: 'Tower Crane', type: 'Heavy Machinery', status: 'Maintenance', location: 'Yard', utilization: '0%', lastService: '2025-11-08', nextService: '2025-11-20' },
    { id: 'EQ004', name: 'Dump Truck Fleet (5)', type: 'Transport', status: 'Active', location: 'Project PRJ004', utilization: '90%', lastService: '2025-10-20', nextService: '2025-12-20' },
  ];

  const subcontractors = [
    { id: 'SUB001', name: 'Elite Electrical Solutions', trade: 'Electrical', projects: 3, rating: 4.8, totalValue: 'R 8.5M', outstanding: 'R 1.2M', status: 'Active' },
    { id: 'SUB002', name: 'Premium Plumbing Co', trade: 'Plumbing', projects: 2, rating: 4.6, totalValue: 'R 5.2M', outstanding: 'R 800K', status: 'Active' },
    { id: 'SUB003', name: 'Master Painters Ltd', trade: 'Painting', projects: 4, rating: 4.9, totalValue: 'R 3.8M', outstanding: 'R 0', status: 'Active' },
    { id: 'SUB004', name: 'Steel & Iron Works', trade: 'Metalwork', projects: 2, rating: 4.7, totalValue: 'R 12.5M', outstanding: 'R 2.5M', status: 'Active' },
  ];

  const materials = [
    { id: 'MAT001', name: 'Concrete Grade 40', category: 'Raw Material', stock: '450 m³', allocated: '320 m³', unit: 'm³', supplier: 'ConCrete Suppliers', lastOrder: '2025-11-05', status: 'In Stock' },
    { id: 'MAT002', name: 'Steel Rebar 16mm', category: 'Structural', stock: '2,400 kg', allocated: '1,800 kg', unit: 'kg', supplier: 'Steel Merchants', lastOrder: '2025-11-08', status: 'In Stock' },
    { id: 'MAT003', name: 'Bricks Standard', category: 'Masonry', stock: '8,500 units', allocated: '6,200 units', unit: 'units', supplier: 'Brick Factory', lastOrder: '2025-10-28', status: 'Low Stock' },
    { id: 'MAT004', name: 'Cement 50kg bags', category: 'Raw Material', stock: '850 bags', allocated: '620 bags', unit: 'bags', supplier: 'Cement Depot', lastOrder: '2025-11-10', status: 'In Stock' },
  ];

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': case 'in progress': case 'in stock': return '#10b981';
      case 'planning': case 'maintenance': case 'low stock': return '#f59e0b';
      case 'on hold': case 'out of stock': return '#ef4444';
      default: return '#64748b';
    }
  };

  return (
    <div className="construction-page">
      <div className="page-header">
        <div className="header-content">
          <h1>🏗️ Construction Management</h1>
          <p>Project tracking, equipment management, subcontractor coordination, and materials inventory</p>
        </div>
        <div className="header-actions">
          <button className="btn-primary">➕ New Project</button>
          <button className="btn-secondary">📊 View Reports</button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>🏗️</div>
          <div className="metric-details">
            <div className="metric-value">12</div>
            <div className="metric-label">Active Projects</div>
            <div className="metric-change positive">3 ahead of schedule</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>💰</div>
          <div className="metric-details">
            <div className="metric-value">R 162M</div>
            <div className="metric-label">Total Project Value</div>
            <div className="metric-change neutral">R 93M spent (57%)</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon" style={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' }}>🚜</div>
          <div className="metric-details">
            <div className="metric-value">45</div>
            <div className="metric-label">Equipment Units</div>
            <div className="metric-change positive">82% utilization</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>👷</div>
          <div className="metric-details">
            <div className="metric-value">28</div>
            <div className="metric-label">Active Subcontractors</div>
            <div className="metric-change neutral">4.7 avg rating</div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="tabs-container">
        <div className="tabs-nav">
          <button className={`tab ${activeTab === 'projects' ? 'active' : ''}`} onClick={() => setActiveTab('projects')}>
            🏗️ Projects
          </button>
          <button className={`tab ${activeTab === 'equipment' ? 'active' : ''}`} onClick={() => setActiveTab('equipment')}>
            🚜 Equipment
          </button>
          <button className={`tab ${activeTab === 'subcontractors' ? 'active' : ''}`} onClick={() => setActiveTab('subcontractors')}>
            👷 Subcontractors
          </button>
          <button className={`tab ${activeTab === 'materials' ? 'active' : ''}`} onClick={() => setActiveTab('materials')}>
            📦 Materials
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'projects' && (
            <div className="data-section">
              <div className="section-header">
                <h2>Project Portfolio</h2>
                <div className="section-actions">
                  <input type="text" placeholder="Search projects..." className="search-input" />
                  <button className="btn-icon">🔍</button>
                  <button className="btn-icon">📊</button>
                </div>
              </div>
              <div className="projects-grid">
                {projects.map(project => (
                  <div key={project.id} className="project-card">
                    <div className="project-header">
                      <div>
                        <h3>{project.name}</h3>
                        <p className="project-client">Client: {project.client}</p>
                      </div>
                      <span className="status-badge" style={{ background: getStatusColor(project.status) }}>{project.status}</span>
                    </div>
                    <div className="project-progress">
                      <div className="progress-header">
                        <span>Completion</span>
                        <strong>{project.completion}%</strong>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${project.completion}%` }}></div>
                      </div>
                    </div>
                    <div className="project-stats">
                      <div className="stat-item">
                        <span className="stat-label">Budget</span>
                        <span className="stat-value">{project.budget}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Spent</span>
                        <span className="stat-value">{project.spent}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Deadline</span>
                        <span className="stat-value">{project.deadline}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Manager</span>
                        <span className="stat-value">{project.manager}</span>
                      </div>
                    </div>
                    <div className="project-actions">
                      <button className="btn-table">View Details</button>
                      <button className="btn-table">Update Progress</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'equipment' && (
            <div className="data-section">
              <div className="section-header">
                <h2>Equipment Fleet</h2>
                <div className="section-actions">
                  <select className="filter-select">
                    <option>All Equipment</option>
                    <option>Heavy Machinery</option>
                    <option>Transport</option>
                    <option>Tools</option>
                  </select>
                  <button className="btn-icon">➕</button>
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
                      <th>Utilization</th>
                      <th>Last Service</th>
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
                        <td><strong>{item.utilization}</strong></td>
                        <td>{item.lastService}</td>
                        <td>{item.nextService}</td>
                        <td>
                          <button className="btn-table">Schedule</button>
                          <button className="btn-table">Transfer</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'subcontractors' && (
            <div className="data-section">
              <div className="section-header">
                <h2>Subcontractor Management</h2>
                <div className="section-actions">
                  <input type="text" placeholder="Search subcontractors..." className="search-input" />
                  <button className="btn-icon">➕</button>
                </div>
              </div>
              <div className="data-table">
                <table>
                  <thead>
                    <tr>
                      <th>Subcontractor ID</th>
                      <th>Company Name</th>
                      <th>Trade</th>
                      <th>Active Projects</th>
                      <th>Rating</th>
                      <th>Total Contract Value</th>
                      <th>Outstanding</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subcontractors.map(sub => (
                      <tr key={sub.id}>
                        <td><strong>{sub.id}</strong></td>
                        <td>{sub.name}</td>
                        <td>{sub.trade}</td>
                        <td>{sub.projects}</td>
                        <td><strong>⭐ {sub.rating}</strong></td>
                        <td><strong>{sub.totalValue}</strong></td>
                        <td>{sub.outstanding}</td>
                        <td><span className="status-badge" style={{ background: getStatusColor(sub.status) }}>{sub.status}</span></td>
                        <td>
                          <button className="btn-table">View</button>
                          <button className="btn-table">Pay</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'materials' && (
            <div className="data-section">
              <div className="section-header">
                <h2>Materials Inventory</h2>
                <div className="section-actions">
                  <select className="filter-select">
                    <option>All Materials</option>
                    <option>Raw Material</option>
                    <option>Structural</option>
                    <option>Finishing</option>
                  </select>
                  <button className="btn-icon">📥</button>
                </div>
              </div>
              <div className="data-table">
                <table>
                  <thead>
                    <tr>
                      <th>Material ID</th>
                      <th>Name</th>
                      <th>Category</th>
                      <th>Stock</th>
                      <th>Allocated</th>
                      <th>Unit</th>
                      <th>Supplier</th>
                      <th>Last Order</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {materials.map(mat => (
                      <tr key={mat.id}>
                        <td><strong>{mat.id}</strong></td>
                        <td>{mat.name}</td>
                        <td>{mat.category}</td>
                        <td><strong>{mat.stock}</strong></td>
                        <td>{mat.allocated}</td>
                        <td>{mat.unit}</td>
                        <td>{mat.supplier}</td>
                        <td>{mat.lastOrder}</td>
                        <td><span className="status-badge" style={{ background: getStatusColor(mat.status) }}>{mat.status}</span></td>
                        <td>
                          <button className="btn-table">Order</button>
                          <button className="btn-table">Allocate</button>
                        </td>
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

export default Construction;
