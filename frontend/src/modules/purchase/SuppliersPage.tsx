import React, { useState, useEffect } from 'react';
import '../../styles/erp-ui.css';

interface Supplier {
  id: string;
  code: string;
  name: string;
  contact_person: string;
  email: string;
  phone: string;
  status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED' | 'PROSPECT';
  total_spend: number;
  outstanding_balance: number;
  payment_terms: string;
  credit_limit: number;
  on_time_delivery: number;
  quality_score: number;
  last_order_date: string;
}

const SuppliersPage: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      // Mock data
      const mockSuppliers: Supplier[] = [
        {
          id: 'SUP001',
          code: 'TSI-001',
          name: 'Tech Supplies International',
          contact_person: 'Thabo Mkhize',
          email: 'thabo@techsupplies.co.za',
          phone: '+27 11 456 7890',
          status: 'ACTIVE',
          total_spend: 485600,
          outstanding_balance: 82400,
          payment_terms: '30 Days',
          credit_limit: 150000,
          on_time_delivery: 95,
          quality_score: 92,
          last_order_date: '2025-01-10'
        },
        {
          id: 'SUP002',
          code: 'OEL-002',
          name: 'Office Equipment Ltd',
          contact_person: 'Sarah van der Merwe',
          email: 'sarah@officeequip.co.za',
          phone: '+27 21 345 6789',
          status: 'ACTIVE',
          total_spend: 362400,
          outstanding_balance: 45200,
          payment_terms: '60 Days',
          credit_limit: 100000,
          on_time_delivery: 88,
          quality_score: 85,
          last_order_date: '2025-01-08'
        },
        {
          id: 'SUP003',
          code: 'IPC-003',
          name: 'Industrial Parts Co',
          contact_person: 'Johan Botha',
          email: 'johan@industrialparts.co.za',
          phone: '+27 31 234 5678',
          status: 'ACTIVE',
          total_spend: 298800,
          outstanding_balance: 67800,
          payment_terms: '45 Days',
          credit_limit: 120000,
          on_time_delivery: 78,
          quality_score: 80,
          last_order_date: '2025-01-12'
        },
        {
          id: 'SUP004',
          code: 'BSL-004',
          name: 'Building Supplies Ltd',
          contact_person: 'Nomvula Dlamini',
          email: 'nomvula@buildingsupplies.co.za',
          phone: '+27 12 123 4567',
          status: 'INACTIVE',
          total_spend: 125400,
          outstanding_balance: 0,
          payment_terms: '30 Days',
          credit_limit: 80000,
          on_time_delivery: 92,
          quality_score: 88,
          last_order_date: '2024-11-15'
        },
        {
          id: 'SUP005',
          code: 'CWH-005',
          name: 'Chemical Warehouse',
          contact_person: 'Pieter Kruger',
          email: 'pieter@chemwarehouse.co.za',
          phone: '+27 41 987 6543',
          status: 'PROSPECT',
          total_spend: 0,
          outstanding_balance: 0,
          payment_terms: '30 Days',
          credit_limit: 50000,
          on_time_delivery: 0,
          quality_score: 0,
          last_order_date: '-'
        }
      ];

      setSuppliers(mockSuppliers);
    } catch (err) {
      console.error('Error fetching suppliers:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      'ACTIVE': 'green',
      'INACTIVE': 'gray',
      'BLOCKED': 'red',
      'PROSPECT': 'blue'
    };
    return colors[status] || 'gray';
  };

  const getPerformanceColor = (score: number): string => {
    if (score >= 90) return 'green';
    if (score >= 75) return 'orange';
    return 'red';
  };

  const filteredSuppliers = suppliers.filter(supplier => {
    const matchesSearch = 
      supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.contact_person.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'ALL' || supplier.status === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  const totalSuppliers = suppliers.length;
  const activeSuppliers = suppliers.filter(s => s.status === 'ACTIVE').length;
  const totalSpend = suppliers.reduce((sum, s) => sum + s.total_spend, 0);
  const totalOutstanding = suppliers.reduce((sum, s) => sum + s.outstanding_balance, 0);
  const avgDeliveryPerformance = suppliers.filter(s => s.on_time_delivery > 0).length > 0
    ? suppliers.filter(s => s.on_time_delivery > 0).reduce((sum, s) => sum + s.on_time_delivery, 0) / 
      suppliers.filter(s => s.on_time_delivery > 0).length
    : 0;

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading suppliers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="content-card">
        <div className="card-header">
          <h2>🏢 Supplier Management</h2>
          <button className="btn-primary">+ New Supplier</button>
        </div>

        <div className="filters-section">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search suppliers by name, code, or contact..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="filter-buttons">
            <button 
              className={filterStatus === 'ALL' ? 'filter-btn active' : 'filter-btn'}
              onClick={() => setFilterStatus('ALL')}
            >
              All
            </button>
            <button 
              className={filterStatus === 'ACTIVE' ? 'filter-btn active' : 'filter-btn'}
              onClick={() => setFilterStatus('ACTIVE')}
            >
              Active
            </button>
            <button 
              className={filterStatus === 'INACTIVE' ? 'filter-btn active' : 'filter-btn'}
              onClick={() => setFilterStatus('INACTIVE')}
            >
              Inactive
            </button>
            <button 
              className={filterStatus === 'PROSPECT' ? 'filter-btn active' : 'filter-btn'}
              onClick={() => setFilterStatus('PROSPECT')}
            >
              Prospects
            </button>
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Supplier Name</th>
                <th>Contact Person</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Total Spend</th>
                <th>Outstanding</th>
                <th>On-Time %</th>
                <th>Quality</th>
                <th>Payment Terms</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSuppliers.map((supplier) => (
                <tr key={supplier.id}>
                  <td className="code-cell">{supplier.code}</td>
                  <td className="name-cell">
                    <div className="supplier-name">{supplier.name}</div>
                    <div className="supplier-email">{supplier.email}</div>
                  </td>
                  <td>{supplier.contact_person}</td>
                  <td>{supplier.phone}</td>
                  <td>
                    <span className={`status-badge status-${getStatusColor(supplier.status)}`}>
                      {supplier.status}
                    </span>
                  </td>
                  <td className="amount-cell">{formatCurrency(supplier.total_spend)}</td>
                  <td className="amount-cell">
                    <span className={supplier.outstanding_balance > 0 ? 'text-warning' : ''}>
                      {formatCurrency(supplier.outstanding_balance)}
                    </span>
                  </td>
                  <td>
                    {supplier.on_time_delivery > 0 ? (
                      <span className={`performance-badge badge-${getPerformanceColor(supplier.on_time_delivery)}`}>
                        {supplier.on_time_delivery}%
                      </span>
                    ) : (
                      <span className="text-muted">-</span>
                    )}
                  </td>
                  <td>
                    {supplier.quality_score > 0 ? (
                      <span className={`performance-badge badge-${getPerformanceColor(supplier.quality_score)}`}>
                        {supplier.quality_score}%
                      </span>
                    ) : (
                      <span className="text-muted">-</span>
                    )}
                  </td>
                  <td>{supplier.payment_terms}</td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn-icon" title="View Details">👁️</button>
                      <button className="btn-icon" title="Edit">✏️</button>
                      <button className="btn-icon" title="Create PO">📦</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredSuppliers.length === 0 && (
          <div className="empty-state">
            <p>No suppliers found matching your criteria.</p>
          </div>
        )}
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Total Suppliers</div>
          <div className="metric-value">{totalSuppliers}</div>
          <div className="metric-detail">{activeSuppliers} active</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Total Spend</div>
          <div className="metric-value">{formatCurrency(totalSpend)}</div>
          <div className="metric-detail">Current period</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Outstanding Balance</div>
          <div className="metric-value">{formatCurrency(totalOutstanding)}</div>
          <div className="metric-detail">Accounts payable</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Avg Delivery Performance</div>
          <div className="metric-value">{avgDeliveryPerformance.toFixed(1)}%</div>
          <div className="metric-detail">On-time delivery</div>
        </div>
      </div>
    </div>
  );
};

export default SuppliersPage;
