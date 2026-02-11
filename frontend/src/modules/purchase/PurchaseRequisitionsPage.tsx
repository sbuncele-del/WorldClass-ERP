import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, Row, Col, Button, message, InputNumber } from 'antd';
import apiClient from '../../services/api';
import { purchaseService } from '../../services/purchase.service';
import '../../styles/erp-ui.css';

interface Requisition {
  id: string;
  number: string;
  requester: string;
  department: string;
  date: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CONVERTED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  estimated_value: number;
  item_count: number;
  approver: string;
  approval_date: string | null;
  po_number: string | null;
  notes: string;
}

interface LineItem {
  description: string;
  quantity: number;
  unit_of_measure: string;
  estimated_unit_price: number;
}

const emptyLineItem = (): LineItem => ({
  description: '',
  quantity: 1,
  unit_of_measure: 'each',
  estimated_unit_price: 0,
});

const PurchaseRequisitionsPage: React.FC = () => {
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Create modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm] = Form.useForm();
  const [lineItems, setLineItems] = useState<LineItem[]>([emptyLineItem()]);
  const [saving, setSaving] = useState(false);

  // Reject modal state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectForm] = Form.useForm();
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  useEffect(() => {
    fetchRequisitions();
  }, []);

  const fetchRequisitions = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/api/purchase/requisitions');
      setRequisitions(response.data?.data || response.data || []);
    } catch (err) {
      console.error('Error fetching requisitions:', err);
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
      'SUBMITTED': 'blue',
      'APPROVED': 'green',
      'REJECTED': 'red',
      'CONVERTED': 'purple'
    };
    return colors[status] || 'gray';
  };

  const getPriorityColor = (priority: string): string => {
    const colors: Record<string, string> = {
      'LOW': 'gray',
      'MEDIUM': 'blue',
      'HIGH': 'orange',
      'URGENT': 'red'
    };
    return colors[priority] || 'gray';
  };

  // ── Line Item Helpers ──────────────────────────────────────────────────

  const handleLineItemChange = (index: number, field: keyof LineItem, value: string | number) => {
    setLineItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addLineItem = () => {
    setLineItems(prev => [...prev, emptyLineItem()]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length <= 1) return;
    setLineItems(prev => prev.filter((_, i) => i !== index));
  };

  const lineItemsTotal = lineItems.reduce(
    (sum, item) => sum + item.quantity * item.estimated_unit_price,
    0
  );

  // ── CRUD Handlers ──────────────────────────────────────────────────────

  const handleCreateRequisition = async () => {
    try {
      const values = await createForm.validateFields();

      // Validate line items
      const validLineItems = lineItems.filter(li => li.description.trim() !== '');
      if (validLineItems.length === 0) {
        message.error('Please add at least one line item with a description.');
        return;
      }

      for (let i = 0; i < validLineItems.length; i++) {
        const li = validLineItems[i];
        if (li.quantity <= 0) {
          message.error(`Line item ${i + 1}: quantity must be greater than zero.`);
          return;
        }
        if (li.estimated_unit_price < 0) {
          message.error(`Line item ${i + 1}: unit price cannot be negative.`);
          return;
        }
      }

      setSaving(true);

      const payload = {
        department: values.department,
        status: 'draft',
        priority: values.priority,
        notes: values.notes || '',
        line_items: validLineItems.map(li => ({
          description: li.description,
          quantity: li.quantity,
          unit_of_measure: li.unit_of_measure || 'each',
          estimated_unit_price: li.estimated_unit_price,
        })),
      };

      await purchaseService.createRequisition(payload);
      message.success('Purchase requisition created successfully.');
      setShowCreateModal(false);
      createForm.resetFields();
      setLineItems([emptyLineItem()]);
      fetchRequisitions();
    } catch (err: any) {
      if (err?.errorFields) {
        // antd form validation error -- do nothing, form shows inline errors
        return;
      }
      console.error('Error creating requisition:', err);
      message.error(err?.response?.data?.message || 'Failed to create requisition.');
    } finally {
      setSaving(false);
    }
  };

  const handleApproveRequisition = async (id: string) => {
    try {
      await purchaseService.approveRequisition(id);
      message.success('Requisition approved successfully.');
      fetchRequisitions();
    } catch (err: any) {
      console.error('Error approving requisition:', err);
      message.error(err?.response?.data?.message || 'Failed to approve requisition.');
    }
  };

  const openRejectModal = (id: string) => {
    setRejectingId(id);
    rejectForm.resetFields();
    setShowRejectModal(true);
  };

  const handleRejectRequisition = async () => {
    try {
      const values = await rejectForm.validateFields();
      if (!rejectingId) return;

      setSaving(true);
      await purchaseService.rejectRequisition(rejectingId, values.rejection_reason);
      message.success('Requisition rejected.');
      setShowRejectModal(false);
      setRejectingId(null);
      rejectForm.resetFields();
      fetchRequisitions();
    } catch (err: any) {
      if (err?.errorFields) return;
      console.error('Error rejecting requisition:', err);
      message.error(err?.response?.data?.message || 'Failed to reject requisition.');
    } finally {
      setSaving(false);
    }
  };

  // ── Filtering ──────────────────────────────────────────────────────────

  const filteredRequisitions = requisitions.filter(req => {
    const matchesSearch =
      req.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.requester.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.department.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = filterStatus === 'ALL' || req.status === filterStatus;

    return matchesSearch && matchesFilter;
  });

  const totalRequisitions = requisitions.length;
  const pendingApproval = requisitions.filter(r => r.status === 'SUBMITTED').length;
  const approved = requisitions.filter(r => r.status === 'APPROVED').length;
  const totalValue = requisitions.reduce((sum, r) => sum + r.estimated_value, 0);

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading requisitions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="content-card">
        <div className="card-header">
          <h2>Purchase Requisitions</h2>
          <button className="btn-primary" onClick={() => setShowCreateModal(true)}>+ New Requisition</button>
        </div>

        <div className="filters-section">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search requisitions by number, requester, or department..."
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
              className={filterStatus === 'SUBMITTED' ? 'filter-btn active' : 'filter-btn'}
              onClick={() => setFilterStatus('SUBMITTED')}
            >
              Submitted
            </button>
            <button
              className={filterStatus === 'APPROVED' ? 'filter-btn active' : 'filter-btn'}
              onClick={() => setFilterStatus('APPROVED')}
            >
              Approved
            </button>
            <button
              className={filterStatus === 'CONVERTED' ? 'filter-btn active' : 'filter-btn'}
              onClick={() => setFilterStatus('CONVERTED')}
            >
              Converted
            </button>
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Requisition #</th>
                <th>Date</th>
                <th>Requester</th>
                <th>Department</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Items</th>
                <th>Estimated Value</th>
                <th>Approver</th>
                <th>PO Number</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequisitions.map((req) => (
                <tr key={req.id}>
                  <td className="code-cell">{req.number}</td>
                  <td>{new Date(req.date).toLocaleDateString('en-ZA')}</td>
                  <td>{req.requester}</td>
                  <td>{req.department}</td>
                  <td>
                    <span className={`status-badge status-${getPriorityColor(req.priority)}`}>
                      {req.priority}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge status-${getStatusColor(req.status)}`}>
                      {req.status}
                    </span>
                  </td>
                  <td className="text-center">{req.item_count}</td>
                  <td className="amount-cell">{formatCurrency(req.estimated_value)}</td>
                  <td>{req.approver || <span className="text-muted">-</span>}</td>
                  <td>
                    {req.po_number ? (
                      <a href={`/purchase/orders?po=${req.po_number}`} className="link-text">
                        {req.po_number}
                      </a>
                    ) : (
                      <span className="text-muted">-</span>
                    )}
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn-icon" title="View Details">
                        <span role="img" aria-label="View">👁️</span>
                      </button>
                      {req.status === 'DRAFT' && (
                        <button className="btn-icon" title="Edit">
                          <span role="img" aria-label="Edit">✏️</span>
                        </button>
                      )}
                      {req.status === 'SUBMITTED' && (
                        <>
                          <button
                            className="btn-icon"
                            title="Approve"
                            onClick={() => handleApproveRequisition(req.id)}
                          >
                            <span role="img" aria-label="Approve">✅</span>
                          </button>
                          <button
                            className="btn-icon"
                            title="Reject"
                            onClick={() => openRejectModal(req.id)}
                          >
                            <span role="img" aria-label="Reject">❌</span>
                          </button>
                        </>
                      )}
                      {req.status === 'APPROVED' && (
                        <button className="btn-icon" title="Convert to PO">
                          <span role="img" aria-label="Convert">📦</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredRequisitions.length === 0 && (
          <div className="empty-state">
            <p>No requisitions found matching your criteria.</p>
          </div>
        )}
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Total Requisitions</div>
          <div className="metric-value">{totalRequisitions}</div>
          <div className="metric-detail">All statuses</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Pending Approval</div>
          <div className="metric-value">{pendingApproval}</div>
          <div className="metric-detail">Awaiting review</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Approved</div>
          <div className="metric-value">{approved}</div>
          <div className="metric-detail">Ready to convert</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Total Value</div>
          <div className="metric-value">{formatCurrency(totalValue)}</div>
          <div className="metric-detail">Estimated spend</div>
        </div>
      </div>

      {/* ── Create Requisition Modal ─────────────────────────────────────── */}
      <Modal
        title="Create Purchase Requisition"
        open={showCreateModal}
        onCancel={() => {
          setShowCreateModal(false);
          createForm.resetFields();
          setLineItems([emptyLineItem()]);
        }}
        onOk={handleCreateRequisition}
        confirmLoading={saving}
        okText="Create Requisition"
        width={800}
        destroyOnClose
      >
        <Form form={createForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="department"
                label="Department"
                rules={[{ required: true, message: 'Please enter the department' }]}
              >
                <Input placeholder="e.g. Finance, IT, Operations" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="priority"
                label="Priority"
                rules={[{ required: true, message: 'Please select a priority' }]}
                initialValue="MEDIUM"
              >
                <Select>
                  <Select.Option value="LOW">Low</Select.Option>
                  <Select.Option value="MEDIUM">Medium</Select.Option>
                  <Select.Option value="HIGH">High</Select.Option>
                  <Select.Option value="URGENT">Urgent</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} placeholder="Additional notes or justification..." />
          </Form.Item>
        </Form>

        {/* ── Line Items ──────────────────────────────────────────────────── */}
        <div style={{ marginTop: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <strong>Line Items</strong>
            <Button type="dashed" size="small" onClick={addLineItem}>
              + Add Line Item
            </Button>
          </div>

          {lineItems.map((item, index) => (
            <Row gutter={8} key={index} style={{ marginBottom: 8 }} align="middle">
              <Col span={8}>
                <Input
                  placeholder="Description"
                  value={item.description}
                  onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                />
              </Col>
              <Col span={4}>
                <InputNumber
                  placeholder="Qty"
                  min={1}
                  value={item.quantity}
                  onChange={(val) => handleLineItemChange(index, 'quantity', val ?? 1)}
                  style={{ width: '100%' }}
                />
              </Col>
              <Col span={4}>
                <Select
                  value={item.unit_of_measure}
                  onChange={(val) => handleLineItemChange(index, 'unit_of_measure', val)}
                  style={{ width: '100%' }}
                >
                  <Select.Option value="each">Each</Select.Option>
                  <Select.Option value="box">Box</Select.Option>
                  <Select.Option value="pack">Pack</Select.Option>
                  <Select.Option value="kg">Kg</Select.Option>
                  <Select.Option value="litre">Litre</Select.Option>
                  <Select.Option value="metre">Metre</Select.Option>
                  <Select.Option value="hour">Hour</Select.Option>
                </Select>
              </Col>
              <Col span={5}>
                <InputNumber
                  placeholder="Unit Price"
                  min={0}
                  step={0.01}
                  value={item.estimated_unit_price}
                  onChange={(val) => handleLineItemChange(index, 'estimated_unit_price', val ?? 0)}
                  style={{ width: '100%' }}
                  prefix="R"
                />
              </Col>
              <Col span={3} style={{ textAlign: 'right' }}>
                {lineItems.length > 1 && (
                  <Button type="link" danger size="small" onClick={() => removeLineItem(index)}>
                    Remove
                  </Button>
                )}
              </Col>
            </Row>
          ))}

          <div style={{ textAlign: 'right', marginTop: 8, fontWeight: 600 }}>
            Estimated Total: {formatCurrency(lineItemsTotal)}
          </div>
        </div>
      </Modal>

      {/* ── Reject Requisition Modal ─────────────────────────────────────── */}
      <Modal
        title="Reject Requisition"
        open={showRejectModal}
        onCancel={() => {
          setShowRejectModal(false);
          setRejectingId(null);
          rejectForm.resetFields();
        }}
        onOk={handleRejectRequisition}
        confirmLoading={saving}
        okText="Reject Requisition"
        okButtonProps={{ danger: true }}
        destroyOnClose
      >
        <Form form={rejectForm} layout="vertical">
          <Form.Item
            name="rejection_reason"
            label="Rejection Reason"
            rules={[{ required: true, message: 'Please provide a reason for rejection' }]}
          >
            <Input.TextArea
              rows={4}
              placeholder="Please explain why this requisition is being rejected..."
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PurchaseRequisitionsPage;
