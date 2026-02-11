import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, Row, Col, Button, message, InputNumber } from 'antd';
import apiClient from '../../services/api';
import { purchaseService } from '../../services/purchase.service';
import '../../styles/erp-ui.css';

interface Supplier {
  id: string;
  code: string;
  name: string;
  trading_name?: string;
  contact_person: string;
  email: string;
  phone: string;
  mobile?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED' | 'PROSPECT';
  supplier_type?: string;
  total_spend: number;
  outstanding_balance: number;
  payment_terms: string;
  credit_limit: number;
  on_time_delivery: number;
  quality_score: number;
  last_order_date: string;
  registration_number?: string;
  tax_number?: string;
  notes?: string;
  is_active?: boolean;
}

const SuppliersPage: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/api/purchase/suppliers');
      const data = response.data?.data || response.data || [];
      setSuppliers(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Error fetching suppliers:', err);
      setError(err.response?.data?.message || 'Failed to load suppliers');
      setSuppliers([]);
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
    }).format(amount || 0);
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

  // ── Create / Edit ──────────────────────────────────────────────────────
  const openCreateModal = () => {
    setEditingSupplier(null);
    form.resetFields();
    setShowModal(true);
  };

  const openEditModal = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    form.setFieldsValue({
      name: supplier.name,
      code: supplier.code,
      trading_name: supplier.trading_name,
      contact_person: supplier.contact_person,
      email: supplier.email,
      phone: supplier.phone,
      mobile: supplier.mobile,
      supplier_type: supplier.supplier_type || 'company',
      payment_terms: supplier.payment_terms,
      registration_number: supplier.registration_number,
      tax_number: supplier.tax_number,
      notes: supplier.notes,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      if (editingSupplier) {
        await purchaseService.updateSupplier(editingSupplier.id, {
          name: values.name,
          code: values.code,
          trading_name: values.trading_name,
          contact_person: values.contact_person,
          email: values.email,
          phone: values.phone,
          mobile: values.mobile,
          supplier_type: values.supplier_type,
          payment_terms: values.payment_terms,
          registration_number: values.registration_number,
          tax_number: values.tax_number,
          notes: values.notes,
        });
        message.success('Supplier updated successfully');
      } else {
        await purchaseService.createSupplier({
          name: values.name,
          code: values.code || values.name.substring(0, 6).toUpperCase().replace(/\s/g, ''),
          trading_name: values.trading_name,
          contact_person: values.contact_person,
          email: values.email,
          phone: values.phone,
          mobile: values.mobile,
          supplier_type: values.supplier_type || 'company',
          payment_terms: values.payment_terms,
          registration_number: values.registration_number,
          tax_number: values.tax_number,
          notes: values.notes,
        });
        message.success('Supplier created successfully');
      }

      setShowModal(false);
      form.resetFields();
      setEditingSupplier(null);
      fetchSuppliers();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.message || err?.message || 'Failed to save supplier');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────
  const handleDelete = async (supplier: Supplier) => {
    if (!window.confirm(`Are you sure you want to delete supplier "${supplier.name}"?`)) return;
    try {
      await purchaseService.deleteSupplier(supplier.id);
      message.success('Supplier deleted successfully');
      fetchSuppliers();
    } catch (err: any) {
      message.error(err?.response?.data?.message || err?.message || 'Failed to delete supplier');
    }
  };

  // ── Deactivate / Activate ─────────────────────────────────────────────
  const handleToggleStatus = async (supplier: Supplier) => {
    const newActive = supplier.status === 'ACTIVE' ? false : true;
    const action = newActive ? 'activate' : 'deactivate';
    if (!window.confirm(`Are you sure you want to ${action} "${supplier.name}"?`)) return;
    try {
      await purchaseService.updateSupplier(supplier.id, {
        is_active: newActive,
        status: newActive ? 'ACTIVE' : 'INACTIVE',
      } as any);
      message.success(`Supplier ${action}d successfully`);
      fetchSuppliers();
    } catch (err: any) {
      message.error(err?.response?.data?.message || `Failed to ${action} supplier`);
    }
  };

  const filteredSuppliers = suppliers.filter(supplier => {
    const matchesSearch =
      (supplier.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (supplier.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (supplier.contact_person || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = filterStatus === 'ALL' || supplier.status === filterStatus;

    return matchesSearch && matchesFilter;
  });

  const totalSuppliers = suppliers.length;
  const activeSuppliers = suppliers.filter(s => s.status === 'ACTIVE').length;
  const totalSpend = suppliers.reduce((sum, s) => sum + (s.total_spend || 0), 0);
  const totalOutstanding = suppliers.reduce((sum, s) => sum + (s.outstanding_balance || 0), 0);
  const activeWithDelivery = suppliers.filter(s => s.on_time_delivery > 0);
  const avgDeliveryPerformance = activeWithDelivery.length > 0
    ? activeWithDelivery.reduce((sum, s) => sum + s.on_time_delivery, 0) / activeWithDelivery.length
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
      {error && (
        <div style={{ padding: '12px 16px', marginBottom: 16, background: '#fff2f0', border: '1px solid #ffccc7', borderRadius: 8, color: '#cf1322' }}>
          {error}
        </div>
      )}

      <div className="content-card">
        <div className="card-header">
          <h2>Supplier Management</h2>
          <button className="btn-primary" onClick={openCreateModal}>+ New Supplier</button>
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
            {['ALL', 'ACTIVE', 'INACTIVE', 'PROSPECT'].map(status => (
              <button
                key={status}
                className={filterStatus === status ? 'filter-btn active' : 'filter-btn'}
                onClick={() => setFilterStatus(status)}
              >
                {status === 'ALL' ? 'All' : status.charAt(0) + status.slice(1).toLowerCase()}
              </button>
            ))}
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
                      <button className="btn-icon" title="Edit" onClick={() => openEditModal(supplier)}>&#9998;</button>
                      <button className="btn-icon" title={supplier.status === 'ACTIVE' ? 'Deactivate' : 'Activate'} onClick={() => handleToggleStatus(supplier)}>
                        {supplier.status === 'ACTIVE' ? '&#x23F8;' : '&#9654;'}
                      </button>
                      <button className="btn-icon" title="Delete" onClick={() => handleDelete(supplier)}>&#128465;</button>
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

      {/* Create / Edit Supplier Modal */}
      <Modal
        title={editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
        open={showModal}
        onCancel={() => { setShowModal(false); form.resetFields(); setEditingSupplier(null); }}
        footer={[
          <Button key="cancel" onClick={() => { setShowModal(false); form.resetFields(); setEditingSupplier(null); }}>Cancel</Button>,
          <Button key="save" type="primary" onClick={handleSave} loading={saving}>
            {editingSupplier ? 'Update Supplier' : 'Add Supplier'}
          </Button>
        ]}
        width={650}
      >
        <Form layout="vertical" form={form}>
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item label="Company Name" name="name" rules={[{ required: true, message: 'Please enter company name' }]}>
                <Input placeholder="Enter company name" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Supplier Code" name="code">
                <Input placeholder="Auto-generated" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Trading Name" name="trading_name">
                <Input placeholder="Trading as..." />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Supplier Type" name="supplier_type">
                <Select placeholder="Select type">
                  <Select.Option value="company">Company</Select.Option>
                  <Select.Option value="individual">Individual</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Registration Number" name="registration_number">
                <Input placeholder="e.g., 2020/123456/07" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="VAT Number" name="tax_number">
                <Input placeholder="e.g., 4123456789" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Contact Person" name="contact_person">
                <Input placeholder="Primary contact name" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Email" name="email" rules={[{ type: 'email', message: 'Please enter a valid email' }]}>
                <Input placeholder="contact@supplier.co.za" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Phone" name="phone">
                <Input placeholder="Phone number" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Mobile" name="mobile">
                <Input placeholder="Mobile number" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Payment Terms" name="payment_terms">
                <Select placeholder="Select payment terms">
                  <Select.Option value="COD">Cash on Delivery</Select.Option>
                  <Select.Option value="Net 30">Net 30</Select.Option>
                  <Select.Option value="Net 60">Net 60</Select.Option>
                  <Select.Option value="Net 90">Net 90</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Notes" name="notes">
                <Input.TextArea placeholder="Additional notes" rows={1} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default SuppliersPage;
