import React, { useState, useEffect } from 'react';
import '../../styles/erp-ui.css';

interface VendorInvoice {
  id: string;
  invoice_number: string;
  vendor_name: string;
  vendor_code: string;
  invoice_date: string;
  due_date: string;
  status: 'DRAFT' | 'RECEIVED' | 'MATCHED' | 'APPROVED' | 'PAID' | 'DISPUTED';
  po_number: string | null;
  grn_number: string | null;
  amount: number;
  outstanding: number;
  payment_terms: string;
  match_status: '3-WAY' | '2-WAY' | 'MANUAL' | 'PENDING';
  days_overdue: number;
  notes: string;
}

const VendorInvoicesPage: React.FC = () => {
  const [invoices, setInvoices] = useState<VendorInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  useEffect(() => {
    fetchVendorInvoices();
  }, []);

  const fetchVendorInvoices = async () => {
    setLoading(true);
    try {
      const mockInvoices: VendorInvoice[] = [
        {
          id: 'VI001',
          invoice_number: 'INV-TSI-2025-045',
          vendor_name: 'Tech Supplies International',
          vendor_code: 'TSI-001',
          invoice_date: '2025-01-08',
          due_date: '2025-02-07',
          status: 'MATCHED',
          po_number: 'PO-2025-018',
          grn_number: 'GRN-2025-015',
          amount: 127600,
          outstanding: 127600,
          payment_terms: '30 Days',
          match_status: '3-WAY',
          days_overdue: 0,
          notes: 'All documents matched successfully'
        },
        {
          id: 'VI002',
          invoice_number: 'INV-OEL-2025-128',
          vendor_name: 'Office Equipment Ltd',
          vendor_code: 'OEL-002',
          invoice_date: '2025-01-05',
          due_date: '2025-03-06',
          status: 'APPROVED',
          po_number: 'PO-2025-019',
          grn_number: 'GRN-2025-016',
          amount: 45800,
          outstanding: 45800,
          payment_terms: '60 Days',
          match_status: '3-WAY',
          days_overdue: 0,
          notes: 'Approved for payment'
        },
        {
          id: 'VI003',
          invoice_number: 'INV-IPC-2025-092',
          vendor_name: 'Industrial Parts Co',
          vendor_code: 'IPC-003',
          invoice_date: '2024-12-28',
          due_date: '2025-01-12',
          status: 'PAID',
          po_number: 'PO-2025-020',
          grn_number: 'GRN-2025-017',
          amount: 89200,
          outstanding: 0,
          payment_terms: '45 Days',
          match_status: '3-WAY',
          days_overdue: 0,
          notes: 'Payment completed on 2025-01-10'
        },
        {
          id: 'VI004',
          invoice_number: 'INV-TSI-2025-046',
          vendor_name: 'Tech Supplies International',
          vendor_code: 'TSI-001',
          invoice_date: '2024-12-20',
          due_date: '2025-01-19',
          status: 'APPROVED',
          po_number: 'PO-2025-021',
          grn_number: 'GRN-2025-018',
          amount: 34500,
          outstanding: 34500,
          payment_terms: '30 Days',
          match_status: '3-WAY',
          days_overdue: -5,
          notes: 'Payment overdue by 5 days'
        },
        {
          id: 'VI005',
          invoice_number: 'INV-CWH-2025-015',
          vendor_name: 'Chemical Warehouse',
          vendor_code: 'CWH-005',
          invoice_date: '2025-01-10',
          due_date: '2025-02-09',
          status: 'DISPUTED',
          po_number: 'PO-2024-198',
          grn_number: null,
          amount: 67400,
          outstanding: 67400,
          payment_terms: '30 Days',
          match_status: 'PENDING',
          days_overdue: 0,
          notes: 'Price discrepancy - vendor investigation in progress'
        },
        {
          id: 'VI006',
          invoice_number: 'INV-BSL-2025-073',
          vendor_name: 'Building Supplies Ltd',
          vendor_code: 'BSL-004',
          invoice_date: '2025-01-06',
          due_date: '2025-02-05',
          status: 'RECEIVED',
          po_number: 'PO-2025-022',
          grn_number: null,
          amount: 52300,
          outstanding: 52300,
          payment_terms: '30 Days',
          match_status: 'PENDING',
          days_overdue: 0,
          notes: 'Awaiting goods receipt'
        }
      ];

      setInvoices(mockInvoices);
    } catch (err) {
      console.error('Error fetching vendor invoices:', err);
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
      'RECEIVED': 'blue',
      'MATCHED': 'orange',
      'APPROVED': 'green',
      'PAID': 'purple',
      'DISPUTED': 'red'
    };
    return colors[status] || 'gray';
  };

  const getMatchStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      '3-WAY': 'green',
      '2-WAY': 'orange',
      'MANUAL': 'blue',
      'PENDING': 'gray'
    };
    return colors[status] || 'gray';
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = 
      invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.vendor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (invoice.po_number && invoice.po_number.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesFilter = filterStatus === 'ALL' || invoice.status === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  const totalInvoices = invoices.length;
  const pendingApproval = invoices.filter(i => i.status === 'MATCHED' || i.status === 'RECEIVED').length;
  const totalPayable = invoices.reduce((sum, i) => sum + i.outstanding, 0);
  const overdue = invoices.filter(i => i.days_overdue < 0 && i.outstanding > 0).length;
  const overdueAmount = invoices.filter(i => i.days_overdue < 0 && i.outstanding > 0)
    .reduce((sum, i) => sum + i.outstanding, 0);

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading vendor invoices...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="content-card">
        <div className="card-header">
          <h2>🧾 Vendor Invoices</h2>
          <button className="btn-primary">+ New Invoice</button>
        </div>

        <div className="filters-section">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search invoices by number, vendor, or PO..."
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
              className={filterStatus === 'RECEIVED' ? 'filter-btn active' : 'filter-btn'}
              onClick={() => setFilterStatus('RECEIVED')}
            >
              Received
            </button>
            <button 
              className={filterStatus === 'MATCHED' ? 'filter-btn active' : 'filter-btn'}
              onClick={() => setFilterStatus('MATCHED')}
            >
              Matched
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
              className={filterStatus === 'DISPUTED' ? 'filter-btn active' : 'filter-btn'}
              onClick={() => setFilterStatus('DISPUTED')}
            >
              Disputed
            </button>
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice Number</th>
                <th>Invoice Date</th>
                <th>Vendor</th>
                <th>PO Number</th>
                <th>Status</th>
                <th>Match Status</th>
                <th>Due Date</th>
                <th>Amount</th>
                <th>Outstanding</th>
                <th>Days Overdue</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td className="code-cell">{invoice.invoice_number}</td>
                  <td>{new Date(invoice.invoice_date).toLocaleDateString('en-ZA')}</td>
                  <td>
                    <div className="supplier-info">
                      <div className="supplier-name">{invoice.vendor_name}</div>
                      <div className="supplier-code">{invoice.vendor_code}</div>
                    </div>
                  </td>
                  <td>
                    {invoice.po_number ? (
                      <a href={`/purchase/orders?po=${invoice.po_number}`} className="link-text">
                        {invoice.po_number}
                      </a>
                    ) : (
                      <span className="text-muted">-</span>
                    )}
                  </td>
                  <td>
                    <span className={`status-badge status-${getStatusColor(invoice.status)}`}>
                      {invoice.status}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge status-${getMatchStatusColor(invoice.match_status)}`}>
                      {invoice.match_status}
                    </span>
                  </td>
                  <td>
                    {new Date(invoice.due_date).toLocaleDateString('en-ZA')}
                    {invoice.days_overdue < 0 && invoice.outstanding > 0 && (
                      <span className="overdue-badge">OVERDUE</span>
                    )}
                  </td>
                  <td className="amount-cell">{formatCurrency(invoice.amount)}</td>
                  <td className="amount-cell">
                    <span className={invoice.outstanding > 0 ? 'text-warning' : 'text-success'}>
                      {formatCurrency(invoice.outstanding)}
                    </span>
                  </td>
                  <td className="text-center">
                    {invoice.days_overdue < 0 && invoice.outstanding > 0 ? (
                      <span className="text-danger">{Math.abs(invoice.days_overdue)}</span>
                    ) : invoice.outstanding > 0 ? (
                      <span className="text-success">{invoice.days_overdue}</span>
                    ) : (
                      <span className="text-muted">-</span>
                    )}
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn-icon" title="View Details">👁️</button>
                      {invoice.status === 'MATCHED' && (
                        <button className="btn-icon" title="Approve">✅</button>
                      )}
                      {invoice.status === 'APPROVED' && invoice.outstanding > 0 && (
                        <button className="btn-icon" title="Pay Invoice">💳</button>
                      )}
                      {invoice.status === 'RECEIVED' && (
                        <button className="btn-icon" title="Match">🔗</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredInvoices.length === 0 && (
          <div className="empty-state">
            <p>No vendor invoices found matching your criteria.</p>
          </div>
        )}
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Total Invoices</div>
          <div className="metric-value">{totalInvoices}</div>
          <div className="metric-detail">All statuses</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Pending Approval</div>
          <div className="metric-value">{pendingApproval}</div>
          <div className="metric-detail">Awaiting approval</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Total Payable</div>
          <div className="metric-value">{formatCurrency(totalPayable)}</div>
          <div className="metric-detail">Outstanding balance</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Overdue Invoices</div>
          <div className="metric-value">{overdue}</div>
          <div className="metric-detail">{formatCurrency(overdueAmount)}</div>
        </div>
      </div>
    </div>
  );
};

export default VendorInvoicesPage;
