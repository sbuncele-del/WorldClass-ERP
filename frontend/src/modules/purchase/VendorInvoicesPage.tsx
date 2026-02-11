import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, Row, Col, Button, message, InputNumber, DatePicker } from 'antd';
import apiClient from '../../services/api';
import { purchaseService } from '../../services/purchase.service';
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

interface Supplier {
  id: string;
  code: string;
  name: string;
}

const VendorInvoicesPage: React.FC = () => {
  const [invoices, setInvoices] = useState<VendorInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Create modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm] = Form.useForm();
  const [savingCreate, setSavingCreate] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // Pay modal state
  const [showPayModal, setShowPayModal] = useState(false);
  const [payForm] = Form.useForm();
  const [savingPay, setSavingPay] = useState(false);
  const [selectedInvoiceForPay, setSelectedInvoiceForPay] = useState<VendorInvoice | null>(null);

  // Action saving states
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  useEffect(() => {
    fetchVendorInvoices();
  }, []);

  const fetchVendorInvoices = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/api/purchase/invoices');
      setInvoices(response.data?.data || response.data || []);
    } catch (err) {
      console.error('Error fetching vendor invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await apiClient.get('/api/purchase/suppliers');
      const data = response.data?.data || response.data || [];
      setSuppliers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching suppliers:', err);
      setSuppliers([]);
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

  // ── Create Invoice ───────────────────────────────────────────────────────

  const openCreateModal = () => {
    fetchSuppliers();
    createForm.resetFields();
    createForm.setFieldsValue({ vat_rate: 15, status: 'draft' });
    setShowCreateModal(true);
  };

  const handleCreateInvoice = async () => {
    try {
      const values = await createForm.validateFields();
      setSavingCreate(true);

      const payload = {
        supplier_id: values.supplier_id,
        invoice_number: values.invoice_number,
        invoice_date: values.invoice_date?.format('YYYY-MM-DD'),
        due_date: values.due_date?.format('YYYY-MM-DD'),
        subtotal: values.subtotal || 0,
        vat_rate: values.vat_rate || 15,
        vat_amount: values.vat_amount || 0,
        total_amount: values.total_amount || 0,
        notes: values.notes || '',
        status: 'draft',
      };

      await purchaseService.createInvoice(payload);
      message.success('Invoice created successfully');
      setShowCreateModal(false);
      createForm.resetFields();
      fetchVendorInvoices();
    } catch (err: any) {
      if (err?.errorFields) return; // Form validation error, antd shows inline
      const errMsg = err?.response?.data?.message || err?.message || 'Failed to create invoice';
      message.error(errMsg);
    } finally {
      setSavingCreate(false);
    }
  };

  const handleSubtotalOrVatChange = () => {
    const subtotal = createForm.getFieldValue('subtotal') || 0;
    const vatRate = createForm.getFieldValue('vat_rate') || 0;
    const vatAmount = Math.round(subtotal * (vatRate / 100) * 100) / 100;
    const totalAmount = Math.round((subtotal + vatAmount) * 100) / 100;
    createForm.setFieldsValue({ vat_amount: vatAmount, total_amount: totalAmount });
  };

  // ── Approve Invoice ──────────────────────────────────────────────────────

  const handleApproveInvoice = async (invoice: VendorInvoice) => {
    setApprovingId(invoice.id);
    try {
      await purchaseService.approveInvoice(invoice.id);
      message.success(`Invoice ${invoice.invoice_number} approved successfully`);
      fetchVendorInvoices();
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || 'Failed to approve invoice';
      message.error(errMsg);
    } finally {
      setApprovingId(null);
    }
  };

  // ── Reject Invoice ───────────────────────────────────────────────────────

  const handleRejectInvoice = async (invoice: VendorInvoice) => {
    const confirmed = window.confirm(
      `Are you sure you want to reject invoice ${invoice.invoice_number}?`
    );
    if (!confirmed) return;

    setRejectingId(invoice.id);
    try {
      await purchaseService.rejectInvoice(invoice.id);
      message.success(`Invoice ${invoice.invoice_number} rejected`);
      fetchVendorInvoices();
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || 'Failed to reject invoice';
      message.error(errMsg);
    } finally {
      setRejectingId(null);
    }
  };

  // ── Pay Invoice ──────────────────────────────────────────────────────────

  const openPayModal = (invoice: VendorInvoice) => {
    setSelectedInvoiceForPay(invoice);
    payForm.resetFields();
    payForm.setFieldsValue({
      amount: invoice.outstanding,
      payment_method: 'EFT',
      reference: '',
    });
    setShowPayModal(true);
  };

  const handlePayInvoice = async () => {
    if (!selectedInvoiceForPay) return;

    try {
      const values = await payForm.validateFields();
      setSavingPay(true);

      const payload = {
        amount: values.amount,
        payment_method: values.payment_method,
        reference: values.reference || '',
      };

      await purchaseService.payInvoice(selectedInvoiceForPay.id, payload);
      message.success(`Payment of ${formatCurrency(values.amount)} recorded for ${selectedInvoiceForPay.invoice_number}`);
      setShowPayModal(false);
      setSelectedInvoiceForPay(null);
      payForm.resetFields();
      fetchVendorInvoices();
    } catch (err: any) {
      if (err?.errorFields) return;
      const errMsg = err?.response?.data?.message || err?.message || 'Failed to record payment';
      message.error(errMsg);
    } finally {
      setSavingPay(false);
    }
  };

  // ── Filtering ────────────────────────────────────────────────────────────

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch =
      invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.vendor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (invoice.po_number && invoice.po_number.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesFilter = filterStatus === 'ALL' || invoice.status === filterStatus;

    return matchesSearch && matchesFilter;
  });

  // ── Metrics ──────────────────────────────────────────────────────────────

  const totalInvoices = invoices.length;
  const pendingApproval = invoices.filter(i => i.status === 'MATCHED' || i.status === 'RECEIVED').length;
  const totalPayable = invoices.reduce((sum, i) => sum + i.outstanding, 0);
  const overdue = invoices.filter(i => i.days_overdue < 0 && i.outstanding > 0).length;
  const overdueAmount = invoices.filter(i => i.days_overdue < 0 && i.outstanding > 0)
    .reduce((sum, i) => sum + i.outstanding, 0);

  // ── Render ───────────────────────────────────────────────────────────────

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
          <h2>Vendor Invoices</h2>
          <button className="btn-primary" onClick={openCreateModal}>+ New Invoice</button>
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
              className={filterStatus === 'DRAFT' ? 'filter-btn active' : 'filter-btn'}
              onClick={() => setFilterStatus('DRAFT')}
            >
              Draft
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
                      {(invoice.status === 'MATCHED' || invoice.status === 'RECEIVED') && (
                        <button
                          className="btn-icon"
                          title="Approve"
                          disabled={approvingId === invoice.id}
                          onClick={() => handleApproveInvoice(invoice)}
                        >
                          {approvingId === invoice.id ? '...' : '✅'}
                        </button>
                      )}
                      {(invoice.status === 'MATCHED' || invoice.status === 'RECEIVED' || invoice.status === 'DRAFT') && (
                        <button
                          className="btn-icon"
                          title="Reject"
                          disabled={rejectingId === invoice.id}
                          onClick={() => handleRejectInvoice(invoice)}
                        >
                          {rejectingId === invoice.id ? '...' : '❌'}
                        </button>
                      )}
                      {invoice.status === 'APPROVED' && invoice.outstanding > 0 && (
                        <button
                          className="btn-icon"
                          title="Pay Invoice"
                          onClick={() => openPayModal(invoice)}
                        >
                          💳
                        </button>
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

      {/* ── Create Invoice Modal ─────────────────────────────────────────── */}
      <Modal
        title="Create Vendor Invoice"
        open={showCreateModal}
        onCancel={() => { setShowCreateModal(false); createForm.resetFields(); }}
        onOk={handleCreateInvoice}
        confirmLoading={savingCreate}
        okText="Create Invoice"
        width={720}
        destroyOnClose
      >
        <Form form={createForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="supplier_id"
                label="Supplier"
                rules={[{ required: true, message: 'Please select a supplier' }]}
              >
                <Select
                  placeholder="Select supplier"
                  showSearch
                  optionFilterProp="children"
                  filterOption={(input, option) =>
                    (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {suppliers.map((s) => (
                    <Select.Option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="invoice_number"
                label="Invoice Number"
                rules={[{ required: true, message: 'Please enter invoice number' }]}
              >
                <Input placeholder="e.g. INV-2026-001" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="invoice_date"
                label="Invoice Date"
                rules={[{ required: true, message: 'Please select invoice date' }]}
              >
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="due_date"
                label="Due Date"
                rules={[{ required: true, message: 'Please select due date' }]}
              >
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="subtotal"
                label="Subtotal"
                rules={[{ required: true, message: 'Please enter subtotal' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  precision={2}
                  prefix="R"
                  placeholder="0.00"
                  onChange={handleSubtotalOrVatChange}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="vat_rate"
                label="VAT Rate (%)"
                rules={[{ required: true, message: 'Please enter VAT rate' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  max={100}
                  precision={2}
                  placeholder="15"
                  onChange={handleSubtotalOrVatChange}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="vat_amount" label="VAT Amount">
                <InputNumber
                  style={{ width: '100%' }}
                  precision={2}
                  prefix="R"
                  disabled
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="total_amount" label="Total Amount">
                <InputNumber
                  style={{ width: '100%' }}
                  precision={2}
                  prefix="R"
                  disabled
                />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item name="notes" label="Notes">
                <Input.TextArea rows={2} placeholder="Optional notes..." />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* ── Pay Invoice Modal ────────────────────────────────────────────── */}
      <Modal
        title={`Pay Invoice ${selectedInvoiceForPay?.invoice_number || ''}`}
        open={showPayModal}
        onCancel={() => { setShowPayModal(false); setSelectedInvoiceForPay(null); payForm.resetFields(); }}
        onOk={handlePayInvoice}
        confirmLoading={savingPay}
        okText="Record Payment"
        width={520}
        destroyOnClose
      >
        {selectedInvoiceForPay && (
          <div style={{ marginBottom: 16, padding: '12px 16px', background: '#f5f5f5', borderRadius: 6 }}>
            <div><strong>Vendor:</strong> {selectedInvoiceForPay.vendor_name}</div>
            <div><strong>Invoice Total:</strong> {formatCurrency(selectedInvoiceForPay.amount)}</div>
            <div><strong>Outstanding:</strong> {formatCurrency(selectedInvoiceForPay.outstanding)}</div>
          </div>
        )}
        <Form form={payForm} layout="vertical">
          <Form.Item
            name="amount"
            label="Payment Amount"
            rules={[
              { required: true, message: 'Please enter payment amount' },
              {
                validator: (_, value) => {
                  if (value && selectedInvoiceForPay && value > selectedInvoiceForPay.outstanding) {
                    return Promise.reject('Amount cannot exceed outstanding balance');
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0.01}
              max={selectedInvoiceForPay?.outstanding}
              precision={2}
              prefix="R"
              placeholder="0.00"
            />
          </Form.Item>

          <Form.Item
            name="payment_method"
            label="Payment Method"
            rules={[{ required: true, message: 'Please select payment method' }]}
          >
            <Select placeholder="Select payment method">
              <Select.Option value="EFT">EFT (Electronic Funds Transfer)</Select.Option>
              <Select.Option value="CHEQUE">Cheque</Select.Option>
              <Select.Option value="CARD">Card Payment</Select.Option>
              <Select.Option value="CASH">Cash</Select.Option>
              <Select.Option value="DEBIT_ORDER">Debit Order</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="reference" label="Payment Reference">
            <Input placeholder="e.g. EFT ref, cheque number..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default VendorInvoicesPage;
