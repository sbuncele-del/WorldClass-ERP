import React, { useState } from 'react';
import './Healthcare.css';

const Healthcare: React.FC = () => {
  const [activeTab, setActiveTab] = useState('patients');

  const patients = [
    { id: 'PT001', name: 'John Smith', age: 45, condition: 'Diabetes Type 2', lastVisit: '2025-11-08', nextAppointment: '2025-11-15', status: 'Active' },
    { id: 'PT002', name: 'Sarah Johnson', age: 32, condition: 'Hypertension', lastVisit: '2025-11-10', nextAppointment: '2025-11-18', status: 'Active' },
    { id: 'PT003', name: 'Michael Brown', age: 58, condition: 'Heart Disease', lastVisit: '2025-11-05', nextAppointment: '2025-11-20', status: 'Follow-up' },
    { id: 'PT004', name: 'Emily Davis', age: 28, condition: 'Asthma', lastVisit: '2025-11-09', nextAppointment: '2025-12-01', status: 'Active' },
  ];

  const appointments = [
    { id: 'AP001', patient: 'John Smith', doctor: 'Dr. Williams', time: '09:00 AM', date: '2025-11-15', type: 'Follow-up', status: 'Scheduled' },
    { id: 'AP002', patient: 'Sarah Johnson', doctor: 'Dr. Martinez', time: '10:30 AM', date: '2025-11-15', type: 'Check-up', status: 'Scheduled' },
    { id: 'AP003', patient: 'Michael Brown', doctor: 'Dr. Williams', time: '02:00 PM', date: '2025-11-15', type: 'Consultation', status: 'Scheduled' },
    { id: 'AP004', patient: 'Emily Davis', doctor: 'Dr. Lee', time: '03:30 PM', date: '2025-11-15', type: 'Therapy', status: 'Scheduled' },
  ];

  const inventory = [
    { id: 'MED001', name: 'Insulin', category: 'Medication', stock: 45, minStock: 20, unit: 'Vials', expiry: '2026-03-15', status: 'In Stock' },
    { id: 'MED002', name: 'Antibiotics', category: 'Medication', stock: 120, minStock: 50, unit: 'Boxes', expiry: '2025-12-30', status: 'In Stock' },
    { id: 'SUP001', name: 'Surgical Gloves', category: 'Supplies', stock: 15, minStock: 30, unit: 'Boxes', expiry: '2026-06-01', status: 'Low Stock' },
    { id: 'EQP001', name: 'Blood Pressure Monitor', category: 'Equipment', stock: 8, minStock: 5, unit: 'Units', expiry: 'N/A', status: 'In Stock' },
  ];

  const billing = [
    { id: 'INV001', patient: 'John Smith', date: '2025-11-08', amount: 'R 2,450', services: 'Consultation + Lab Tests', status: 'Paid', paymentMethod: 'Medical Aid' },
    { id: 'INV002', patient: 'Sarah Johnson', date: '2025-11-10', amount: 'R 1,850', services: 'Check-up + Prescription', status: 'Paid', paymentMethod: 'Cash' },
    { id: 'INV003', patient: 'Michael Brown', date: '2025-11-05', amount: 'R 3,200', services: 'ECG + Consultation', status: 'Pending', paymentMethod: 'Medical Aid' },
    { id: 'INV004', patient: 'Emily Davis', date: '2025-11-09', amount: 'R 1,200', services: 'Therapy Session', status: 'Paid', paymentMethod: 'Card' },
  ];

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': case 'scheduled': case 'in stock': case 'paid': return '#10b981';
      case 'low stock': case 'pending': case 'follow-up': return '#f59e0b';
      case 'critical': case 'overdue': case 'out of stock': return '#ef4444';
      default: return '#64748b';
    }
  };

  return (
    <div className="healthcare-page">
      <div className="page-header">
        <div className="header-content">
          <h1>🏥 Healthcare Management</h1>
          <p>Complete patient care, appointments, billing, and inventory management</p>
        </div>
        <div className="header-actions">
          <button className="btn-primary">➕ New Patient</button>
          <button className="btn-secondary">📅 Schedule Appointment</button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>👥</div>
          <div className="metric-details">
            <div className="metric-value">1,247</div>
            <div className="metric-label">Active Patients</div>
            <div className="metric-change positive">+8.2% from last month</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>📅</div>
          <div className="metric-details">
            <div className="metric-value">24</div>
            <div className="metric-label">Today's Appointments</div>
            <div className="metric-change neutral">4 completed, 20 pending</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>💰</div>
          <div className="metric-details">
            <div className="metric-value">R 847K</div>
            <div className="metric-label">Revenue This Month</div>
            <div className="metric-change positive">+12.5% vs target</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon" style={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' }}>📦</div>
          <div className="metric-details">
            <div className="metric-value">8</div>
            <div className="metric-label">Low Stock Items</div>
            <div className="metric-change warning">Requires attention</div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="tabs-container">
        <div className="tabs-nav">
          <button className={`tab ${activeTab === 'patients' ? 'active' : ''}`} onClick={() => setActiveTab('patients')}>
            👥 Patients
          </button>
          <button className={`tab ${activeTab === 'appointments' ? 'active' : ''}`} onClick={() => setActiveTab('appointments')}>
            📅 Appointments
          </button>
          <button className={`tab ${activeTab === 'inventory' ? 'active' : ''}`} onClick={() => setActiveTab('inventory')}>
            📦 Inventory
          </button>
          <button className={`tab ${activeTab === 'billing' ? 'active' : ''}`} onClick={() => setActiveTab('billing')}>
            💰 Billing
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'patients' && (
            <div className="data-section">
              <div className="section-header">
                <h2>Patient Records</h2>
                <div className="section-actions">
                  <input type="text" placeholder="Search patients..." className="search-input" />
                  <button className="btn-icon">🔍</button>
                  <button className="btn-icon">📊</button>
                </div>
              </div>
              <div className="data-table">
                <table>
                  <thead>
                    <tr>
                      <th>Patient ID</th>
                      <th>Name</th>
                      <th>Age</th>
                      <th>Condition</th>
                      <th>Last Visit</th>
                      <th>Next Appointment</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patients.map(patient => (
                      <tr key={patient.id}>
                        <td><strong>{patient.id}</strong></td>
                        <td>{patient.name}</td>
                        <td>{patient.age}</td>
                        <td>{patient.condition}</td>
                        <td>{patient.lastVisit}</td>
                        <td>{patient.nextAppointment}</td>
                        <td><span className="status-badge" style={{ background: getStatusColor(patient.status) }}>{patient.status}</span></td>
                        <td>
                          <button className="btn-table">View</button>
                          <button className="btn-table">Edit</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'appointments' && (
            <div className="data-section">
              <div className="section-header">
                <h2>Appointment Schedule</h2>
                <div className="section-actions">
                  <select className="filter-select">
                    <option>Today</option>
                    <option>This Week</option>
                    <option>This Month</option>
                  </select>
                  <button className="btn-icon">📅</button>
                </div>
              </div>
              <div className="data-table">
                <table>
                  <thead>
                    <tr>
                      <th>Appointment ID</th>
                      <th>Patient</th>
                      <th>Doctor</th>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.map(apt => (
                      <tr key={apt.id}>
                        <td><strong>{apt.id}</strong></td>
                        <td>{apt.patient}</td>
                        <td>{apt.doctor}</td>
                        <td>{apt.date}</td>
                        <td>{apt.time}</td>
                        <td>{apt.type}</td>
                        <td><span className="status-badge" style={{ background: getStatusColor(apt.status) }}>{apt.status}</span></td>
                        <td>
                          <button className="btn-table">Reschedule</button>
                          <button className="btn-table">Cancel</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'inventory' && (
            <div className="data-section">
              <div className="section-header">
                <h2>Medical Inventory</h2>
                <div className="section-actions">
                  <select className="filter-select">
                    <option>All Categories</option>
                    <option>Medication</option>
                    <option>Supplies</option>
                    <option>Equipment</option>
                  </select>
                  <button className="btn-icon">➕</button>
                </div>
              </div>
              <div className="data-table">
                <table>
                  <thead>
                    <tr>
                      <th>Item ID</th>
                      <th>Name</th>
                      <th>Category</th>
                      <th>Stock</th>
                      <th>Min Stock</th>
                      <th>Unit</th>
                      <th>Expiry Date</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.map(item => (
                      <tr key={item.id}>
                        <td><strong>{item.id}</strong></td>
                        <td>{item.name}</td>
                        <td>{item.category}</td>
                        <td><strong>{item.stock}</strong></td>
                        <td>{item.minStock}</td>
                        <td>{item.unit}</td>
                        <td>{item.expiry}</td>
                        <td><span className="status-badge" style={{ background: getStatusColor(item.status) }}>{item.status}</span></td>
                        <td>
                          <button className="btn-table">Reorder</button>
                          <button className="btn-table">Adjust</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'billing' && (
            <div className="data-section">
              <div className="section-header">
                <h2>Billing & Invoices</h2>
                <div className="section-actions">
                  <select className="filter-select">
                    <option>All Invoices</option>
                    <option>Paid</option>
                    <option>Pending</option>
                    <option>Overdue</option>
                  </select>
                  <button className="btn-icon">💵</button>
                </div>
              </div>
              <div className="data-table">
                <table>
                  <thead>
                    <tr>
                      <th>Invoice ID</th>
                      <th>Patient</th>
                      <th>Date</th>
                      <th>Services</th>
                      <th>Amount</th>
                      <th>Payment Method</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billing.map(invoice => (
                      <tr key={invoice.id}>
                        <td><strong>{invoice.id}</strong></td>
                        <td>{invoice.patient}</td>
                        <td>{invoice.date}</td>
                        <td>{invoice.services}</td>
                        <td><strong>{invoice.amount}</strong></td>
                        <td>{invoice.paymentMethod}</td>
                        <td><span className="status-badge" style={{ background: getStatusColor(invoice.status) }}>{invoice.status}</span></td>
                        <td>
                          <button className="btn-table">View</button>
                          <button className="btn-table">Print</button>
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

export default Healthcare;
