import React, { useState, useEffect } from 'react';
import '../../styles/erp-ui.css';

interface LeaveRequest {
  id: string;
  employee_name: string;
  employee_number: string;
  leave_type: 'ANNUAL' | 'SICK' | 'FAMILY_RESPONSIBILITY' | 'MATERNITY' | 'STUDY' | 'UNPAID';
  start_date: string;
  end_date: string;
  days: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  reason: string;
  approver: string;
  balance_before: number;
  balance_after: number;
}

const LeavePage: React.FC = () => {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  useEffect(() => {
    fetchLeaveRequests();
  }, []);

  const fetchLeaveRequests = async () => {
    setLoading(true);
    try {
      const mockRequests: LeaveRequest[] = [
        {
          id: 'LR001',
          employee_name: 'Thabo Mkhize',
          employee_number: 'E2023-001',
          leave_type: 'ANNUAL',
          start_date: '2025-12-20',
          end_date: '2026-01-05',
          days: 12,
          status: 'PENDING',
          reason: 'Year-end family holiday',
          approver: 'Sarah van der Merwe',
          balance_before: 15,
          balance_after: 3
        },
        {
          id: 'LR002',
          employee_name: 'Nomvula Dlamini',
          employee_number: 'E2024-015',
          leave_type: 'SICK',
          start_date: '2025-11-05',
          end_date: '2025-11-06',
          days: 2,
          status: 'APPROVED',
          reason: 'Medical certificate attached',
          approver: 'Johan Botha',
          balance_before: 10,
          balance_after: 8
        },
        {
          id: 'LR003',
          employee_name: 'Pieter Kruger',
          employee_number: 'E2024-022',
          leave_type: 'FAMILY_RESPONSIBILITY',
          start_date: '2025-11-10',
          end_date: '2025-11-10',
          days: 1,
          status: 'APPROVED',
          reason: 'Child illness',
          approver: 'Sarah van der Merwe',
          balance_before: 3,
          balance_after: 2
        }
      ];

      setRequests(mockRequests);
    } catch (err) {
      console.error('Error fetching leave requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      'PENDING': 'orange',
      'APPROVED': 'green',
      'REJECTED': 'red',
      'CANCELLED': 'gray'
    };
    return colors[status] || 'gray';
  };

  const getLeaveTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      'ANNUAL': 'green',
      'SICK': 'blue',
      'FAMILY_RESPONSIBILITY': 'purple',
      'MATERNITY': 'pink',
      'STUDY': 'orange',
      'UNPAID': 'gray'
    };
    return colors[type] || 'gray';
  };

  const filteredRequests = requests.filter(req => {
    const matchesSearch = 
      req.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.employee_number.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'ALL' || req.status === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading leave requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="content-card">
        <div className="card-header">
          <h2>🏖️ Leave Management - BCEA Compliant</h2>
          <button className="btn-primary">+ New Leave Request</button>
        </div>

        <div className="filters-section">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search by employee name or number..."
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
              className={filterStatus === 'PENDING' ? 'filter-btn active' : 'filter-btn'}
              onClick={() => setFilterStatus('PENDING')}
            >
              Pending
            </button>
            <button 
              className={filterStatus === 'APPROVED' ? 'filter-btn active' : 'filter-btn'}
              onClick={() => setFilterStatus('APPROVED')}
            >
              Approved
            </button>
            <button 
              className={filterStatus === 'REJECTED' ? 'filter-btn active' : 'filter-btn'}
              onClick={() => setFilterStatus('REJECTED')}
            >
              Rejected
            </button>
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Leave Type</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Days</th>
                <th>Status</th>
                <th>Balance After</th>
                <th>Approver</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((req) => (
                <tr key={req.id}>
                  <td>
                    <div className="employee-name">{req.employee_name}</div>
                    <div className="employee-number">{req.employee_number}</div>
                  </td>
                  <td>
                    <span className={`status-badge status-${getLeaveTypeColor(req.leave_type)}`}>
                      {req.leave_type.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td>{new Date(req.start_date).toLocaleDateString('en-ZA')}</td>
                  <td>{new Date(req.end_date).toLocaleDateString('en-ZA')}</td>
                  <td className="text-center">{req.days}</td>
                  <td>
                    <span className={`status-badge status-${getStatusColor(req.status)}`}>
                      {req.status}
                    </span>
                  </td>
                  <td className="text-center">{req.balance_after} days</td>
                  <td>{req.approver}</td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn-icon" title="View">👁️</button>
                      {req.status === 'PENDING' && (
                        <>
                          <button className="btn-icon" title="Approve">✅</button>
                          <button className="btn-icon" title="Reject">❌</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="content-card" style={{marginTop: '2rem'}}>
        <h3>📋 RSA Leave Entitlements (BCEA)</h3>
        <div style={{padding: '1.5rem', lineHeight: '1.8'}}>
          <div style={{marginBottom: '1rem'}}>
            <strong>✅ Annual Leave:</strong> 21 consecutive days per year (or 1 day per 17 days worked)
          </div>
          <div style={{marginBottom: '1rem'}}>
            <strong>✅ Sick Leave:</strong> 30 days per 3-year cycle (6 weeks)
          </div>
          <div style={{marginBottom: '1rem'}}>
            <strong>✅ Family Responsibility Leave:</strong> 3 days per year (after 4 months employment)
          </div>
          <div style={{marginBottom: '1rem'}}>
            <strong>✅ Maternity Leave:</strong> 4 consecutive months (UIF benefits available)
          </div>
          <div>
            <strong>✅ Public Holidays:</strong> 12 paid public holidays per year
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeavePage;
