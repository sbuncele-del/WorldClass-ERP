import React, { useState, useEffect } from 'react';
import '../../styles/erp-ui.css';

interface PayrollRun {
  id: string;
  run_number: string;
  period: string;
  status: 'DRAFT' | 'PROCESSING' | 'APPROVED' | 'PAID' | 'SUBMITTED_SARS';
  employee_count: number;
  gross_total: number;
  paye_total: number;
  uif_total: number;
  sdl_total: number;
  net_total: number;
  payment_date: string;
  processed_by: string;
  notes: string;
}

const PayrollPage: React.FC = () => {
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  useEffect(() => {
    fetchPayrollRuns();
  }, []);

  const fetchPayrollRuns = async () => {
    setLoading(true);
    try {
      const mockRuns: PayrollRun[] = [
        {
          id: 'PR001',
          run_number: 'PAY-2025-11',
          period: 'November 2025',
          status: 'PROCESSING',
          employee_count: 124,
          gross_total: 6420800,
          paye_total: 1284160,
          uif_total: 64208,
          sdl_total: 64208,
          net_total: 5008224,
          payment_date: '2025-11-25',
          processed_by: 'Sarah van der Merwe',
          notes: 'Regular monthly payroll'
        },
        {
          id: 'PR002',
          run_number: 'PAY-2025-10',
          period: 'October 2025',
          status: 'SUBMITTED_SARS',
          employee_count: 122,
          gross_total: 6258400,
          paye_total: 1251680,
          uif_total: 62584,
          sdl_total: 62584,
          net_total: 4881552,
          payment_date: '2025-10-25',
          processed_by: 'Sarah van der Merwe',
          notes: 'EMP201 submitted to SARS'
        },
        {
          id: 'PR003',
          run_number: 'PAY-2025-09',
          period: 'September 2025',
          status: 'PAID',
          employee_count: 120,
          gross_total: 6144000,
          paye_total: 1228800,
          uif_total: 61440,
          sdl_total: 61440,
          net_total: 4792320,
          payment_date: '2025-09-25',
          processed_by: 'Thabo Mkhize',
          notes: 'All payments completed'
        },
        {
          id: 'PR004',
          run_number: 'BONUS-2025-Q3',
          period: 'Q3 2025 Bonus',
          status: 'APPROVED',
          employee_count: 115,
          gross_total: 1840000,
          paye_total: 552000,
          uif_total: 18400,
          sdl_total: 18400,
          net_total: 1251200,
          payment_date: '2025-10-15',
          processed_by: 'Sarah van der Merwe',
          notes: 'Quarterly performance bonus'
        }
      ];

      setPayrollRuns(mockRuns);
    } catch (err) {
      console.error('Error fetching payroll runs:', err);
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
      'DRAFT': 'gray',
      'PROCESSING': 'blue',
      'APPROVED': 'orange',
      'PAID': 'green',
      'SUBMITTED_SARS': 'purple'
    };
    return colors[status] || 'gray';
  };

  const filteredRuns = payrollRuns.filter(run => {
    const matchesSearch = 
      run.run_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      run.period.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'ALL' || run.status === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  const totalRuns = payrollRuns.length;
  const totalPaid = payrollRuns.filter(r => r.status === 'PAID' || r.status === 'SUBMITTED_SARS')
    .reduce((sum, r) => sum + r.net_total, 0);
  const totalPAYE = payrollRuns.reduce((sum, r) => sum + r.paye_total, 0);
  const totalUIF = payrollRuns.reduce((sum, r) => sum + r.uif_total, 0);

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading payroll runs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="content-card">
        <div className="card-header">
          <h2>💰 Payroll Processing - RSA Compliant</h2>
          <button className="btn-primary">+ New Payroll Run</button>
        </div>

        <div className="filters-section">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search payroll runs by number or period..."
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
              className={filterStatus === 'PROCESSING' ? 'filter-btn active' : 'filter-btn'}
              onClick={() => setFilterStatus('PROCESSING')}
            >
              Processing
            </button>
            <button 
              className={filterStatus === 'APPROVED' ? 'filter-btn active' : 'filter-btn'}
              onClick={() => setFilterStatus('APPROVED')}
            >
              Approved
            </button>
            <button 
              className={filterStatus === 'PAID' ? 'filter-btn active' : 'filter-btn'}
              onClick={() => setFilterStatus('PAID')}
            >
              Paid
            </button>
            <button 
              className={filterStatus === 'SUBMITTED_SARS' ? 'filter-btn active' : 'filter-btn'}
              onClick={() => setFilterStatus('SUBMITTED_SARS')}
            >
              SARS Submitted
            </button>
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Run Number</th>
                <th>Period</th>
                <th>Status</th>
                <th>Employees</th>
                <th>Gross Total</th>
                <th>PAYE</th>
                <th>UIF (1%)</th>
                <th>SDL (1%)</th>
                <th>Net Total</th>
                <th>Payment Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRuns.map((run) => (
                <tr key={run.id}>
                  <td className="code-cell">{run.run_number}</td>
                  <td>{run.period}</td>
                  <td>
                    <span className={`status-badge status-${getStatusColor(run.status)}`}>
                      {run.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="text-center">{run.employee_count}</td>
                  <td className="amount-cell">{formatCurrency(run.gross_total)}</td>
                  <td className="amount-cell text-danger">{formatCurrency(run.paye_total)}</td>
                  <td className="amount-cell text-warning">{formatCurrency(run.uif_total)}</td>
                  <td className="amount-cell text-warning">{formatCurrency(run.sdl_total)}</td>
                  <td className="amount-cell text-success">{formatCurrency(run.net_total)}</td>
                  <td>{new Date(run.payment_date).toLocaleDateString('en-ZA')}</td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn-icon" title="View Details">👁️</button>
                      {run.status === 'DRAFT' && (
                        <button className="btn-icon" title="Process">⚙️</button>
                      )}
                      {run.status === 'PROCESSING' && (
                        <button className="btn-icon" title="Approve">✅</button>
                      )}
                      {run.status === 'APPROVED' && (
                        <button className="btn-icon" title="Pay">💳</button>
                      )}
                      {run.status === 'PAID' && (
                        <button className="btn-icon" title="Submit EMP201">📄</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredRuns.length === 0 && (
          <div className="empty-state">
            <p>No payroll runs found matching your criteria.</p>
          </div>
        )}
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Total Payroll Runs</div>
          <div className="metric-value">{totalRuns}</div>
          <div className="metric-detail">This year</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Total Paid Out</div>
          <div className="metric-value">{formatCurrency(totalPaid)}</div>
          <div className="metric-detail">Net payments</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Total PAYE</div>
          <div className="metric-value">{formatCurrency(totalPAYE)}</div>
          <div className="metric-detail">Due to SARS</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Total UIF</div>
          <div className="metric-value">{formatCurrency(totalUIF)}</div>
          <div className="metric-detail">Employer contribution</div>
        </div>
      </div>

      <div className="content-card" style={{marginTop: '2rem'}}>
        <h3>📋 RSA Payroll Compliance Checklist</h3>
        <div style={{padding: '1.5rem', lineHeight: '1.8'}}>
          <div style={{marginBottom: '1rem'}}>
            <strong>✅ PAYE (Pay-As-You-Earn):</strong> Calculated per SARS tax tables, deducted monthly
          </div>
          <div style={{marginBottom: '1rem'}}>
            <strong>✅ UIF (Unemployment Insurance Fund):</strong> 1% employee + 1% employer = 2% total
          </div>
          <div style={{marginBottom: '1rem'}}>
            <strong>✅ SDL (Skills Development Levy):</strong> 1% of payroll (exempt if payroll {'<'} R500k/year)
          </div>
          <div style={{marginBottom: '1rem'}}>
            <strong>✅ EMP201:</strong> Monthly reconciliation submitted to SARS by 7th of following month
          </div>
          <div style={{marginBottom: '1rem'}}>
            <strong>✅ IRP5/IT3(a):</strong> Annual employee tax certificates issued by end of tax year
          </div>
          <div>
            <strong>✅ EMP501:</strong> Annual employer reconciliation submitted to SARS by May 31st
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayrollPage;
