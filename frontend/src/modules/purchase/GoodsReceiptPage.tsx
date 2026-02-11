import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, Row, Col, Button, message, InputNumber, DatePicker } from 'antd';
import apiClient from '../../services/api';
import { purchaseService } from '../../services/purchase.service';
import '../../styles/erp-ui.css';

interface GoodsReceipt {
  id: string;
  grn_number: string;
  po_number: string;
  supplier_name: string;
  supplier_code: string;
  receipt_date: string;
  received_by: string;
  status: 'PENDING' | 'RECEIVED' | 'QUALITY_CHECK' | 'APPROVED' | 'REJECTED';
  total_items: number;
  received_items: number;
  rejected_items: number;
  storage_location: string;
  quality_score: number | null;
  notes: string;
}

interface PurchaseOrderOption {
  id: string;
  po_number: string;
  supplier_name: string;
  supplier_code: string;
  status: string;
  item_count: number;
  lines?: Array<{
    id: string;
    item_code?: string;
    description: string;
    quantity: number;
    unit_of_measure?: string;
  }>;
}

const GoodsReceiptPage: React.FC = () => {
  const [receipts, setReceipts] = useState<GoodsReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Create modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createForm] = Form.useForm();
  const [orders, setOrders] = useState<PurchaseOrderOption[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrderOption | null>(null);
  const [lineItems, setLineItems] = useState<Array<{ po_line_id: string; description: string; ordered_qty: number; quantity_received: number; unit_of_measure?: string; notes: string }>>([]);

  useEffect(() => {
    fetchGoodsReceipts();
  }, []);

  const fetchGoodsReceipts = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/api/purchase/goods-receipts');
      setReceipts(response.data?.data || response.data || []);
    } catch (err) {
      console.error('Error fetching goods receipts:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await apiClient.get('/api/purchase/orders');
      const data = response.data?.data || response.data || [];
      // Only show orders that can receive goods
      const receivableOrders = Array.isArray(data)
        ? data.filter((o: any) => ['CONFIRMED', 'SENT', 'PARTIALLY_RECEIVED'].includes(o.status))
        : [];
      setOrders(receivableOrders);
    } catch (err) {
      console.error('Error fetching purchase orders:', err);
      setOrders([]);
    }
  };

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      'PENDING': 'gray',
      'RECEIVED': 'blue',
      'QUALITY_CHECK': 'orange',
      'APPROVED': 'green',
      'REJECTED': 'red'
    };
    return colors[status] || 'gray';
  };

  const getQualityColor = (score: number): string => {
    if (score >= 90) return 'green';
    if (score >= 75) return 'orange';
    return 'red';
  };

  // ── Create GRN ──────────────────────────────────────────────────────────
  const openCreateModal = () => {
    createForm.resetFields();
    setSelectedOrder(null);
    setLineItems([]);
    fetchOrders();
    setShowCreateModal(true);
  };

  const handleOrderSelect = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId) || null;
    setSelectedOrder(order);

    if (order) {
      // If the order has line items, populate them for quantity entry
      if (order.lines && order.lines.length > 0) {
        setLineItems(order.lines.map(line => ({
          po_line_id: line.id,
          description: line.description,
          ordered_qty: line.quantity,
          quantity_received: line.quantity,
          unit_of_measure: line.unit_of_measure,
          notes: '',
        })));
      } else {
        // Fallback: create a single generic line based on item_count
        const count = order.item_count || 1;
        const items = [];
        for (let i = 0; i < count; i++) {
          items.push({
            po_line_id: `line-${i}`,
            description: `Item ${i + 1}`,
            ordered_qty: 1,
            quantity_received: 1,
            unit_of_measure: 'EA',
            notes: '',
          });
        }
        setLineItems(items);
      }
    } else {
      setLineItems([]);
    }
  };

  const updateLineQuantity = (index: number, qty: number) => {
    setLineItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], quantity_received: qty };
      return updated;
    });
  };

  const updateLineNotes = (index: number, notes: string) => {
    setLineItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], notes };
      return updated;
    });
  };

  const handleCreateReceipt = async () => {
    try {
      const values = await createForm.validateFields();
      setSaving(true);

      const payload: any = {
        order_id: values.order_id,
        gr_date: values.gr_date ? values.gr_date.format('YYYY-MM-DD') : new Date().toISOString().split('T')[0],
        notes: values.notes || '',
        line_items: lineItems.map(item => ({
          po_line_id: item.po_line_id,
          quantity_received: item.quantity_received,
          notes: item.notes || '',
        })),
      };

      await purchaseService.createGoodsReceipt(payload);
      message.success('Goods receipt created successfully');
      setShowCreateModal(false);
      createForm.resetFields();
      setSelectedOrder(null);
      setLineItems([]);
      fetchGoodsReceipts();
    } catch (err: any) {
      if (err?.errorFields) return; // form validation error
      message.error(err?.response?.data?.message || err?.message || 'Failed to create goods receipt');
    } finally {
      setSaving(false);
    }
  };

  // ── Confirm Receipt ─────────────────────────────────────────────────────
  const handleConfirmReceipt = async (receipt: GoodsReceipt) => {
    if (!window.confirm(`Confirm receipt "${receipt.grn_number}"? This will update inventory quantities.`)) return;
    try {
      await purchaseService.confirmGoodsReceipt(receipt.id);
      message.success(`Receipt ${receipt.grn_number} confirmed successfully`);
      fetchGoodsReceipts();
    } catch (err: any) {
      message.error(err?.response?.data?.message || err?.message || 'Failed to confirm receipt');
    }
  };

  // ── Delete Receipt ──────────────────────────────────────────────────────
  const handleDeleteReceipt = async (receipt: GoodsReceipt) => {
    if (!window.confirm(`Are you sure you want to delete receipt "${receipt.grn_number}"?`)) return;
    try {
      await purchaseService.deleteGoodsReceipt(receipt.id);
      message.success(`Receipt ${receipt.grn_number} deleted successfully`);
      fetchGoodsReceipts();
    } catch (err: any) {
      message.error(err?.response?.data?.message || err?.message || 'Failed to delete receipt');
    }
  };

  const filteredReceipts = receipts.filter(receipt => {
    const matchesSearch =
      receipt.grn_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receipt.po_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receipt.supplier_name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = filterStatus === 'ALL' || receipt.status === filterStatus;

    return matchesSearch && matchesFilter;
  });

  const totalReceipts = receipts.length;
  const pendingQC = receipts.filter(r => r.status === 'QUALITY_CHECK').length;
  const approved = receipts.filter(r => r.status === 'APPROVED').length;
  const rejected = receipts.filter(r => r.status === 'REJECTED').length;
  const avgQualityScore = receipts.filter(r => r.quality_score !== null).length > 0
    ? receipts.filter(r => r.quality_score !== null).reduce((sum, r) => sum + (r.quality_score || 0), 0) /
      receipts.filter(r => r.quality_score !== null).length
    : 0;

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading goods receipts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="content-card">
        <div className="card-header">
          <h2>Goods Receipt Notes</h2>
          <button className="btn-primary" onClick={openCreateModal}>+ New GRN</button>
        </div>

        <div className="filters-section">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search receipts by GRN, PO number, or supplier..."
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
              className={filterStatus === 'RECEIVED' ? 'filter-btn active' : 'filter-btn'}
              onClick={() => setFilterStatus('RECEIVED')}
            >
              Received
            </button>
            <button
              className={filterStatus === 'QUALITY_CHECK' ? 'filter-btn active' : 'filter-btn'}
              onClick={() => setFilterStatus('QUALITY_CHECK')}
            >
              QC
            </button>
            <button
              className={filterStatus === 'APPROVED' ? 'filter-btn active' : 'filter-btn'}
              onClick={() => setFilterStatus('APPROVED')}
            >
              Approved
            </button>
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>GRN Number</th>
                <th>Receipt Date</th>
                <th>PO Number</th>
                <th>Supplier</th>
                <th>Status</th>
                <th>Items Received</th>
                <th>Rejected</th>
                <th>Quality Score</th>
                <th>Storage Location</th>
                <th>Received By</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredReceipts.map((receipt) => (
                <tr key={receipt.id}>
                  <td className="code-cell">{receipt.grn_number}</td>
                  <td>{new Date(receipt.receipt_date).toLocaleDateString('en-ZA')}</td>
                  <td>
                    <a href={`/purchase/orders?po=${receipt.po_number}`} className="link-text">
                      {receipt.po_number}
                    </a>
                  </td>
                  <td>
                    <div className="supplier-info">
                      <div className="supplier-name">{receipt.supplier_name}</div>
                      <div className="supplier-code">{receipt.supplier_code}</div>
                    </div>
                  </td>
                  <td>
                    <span className={`status-badge status-${getStatusColor(receipt.status)}`}>
                      {receipt.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="text-center">
                    {receipt.received_items > 0 ? (
                      <span className="text-success">{receipt.received_items}/{receipt.total_items}</span>
                    ) : (
                      <span className="text-muted">-</span>
                    )}
                  </td>
                  <td className="text-center">
                    {receipt.rejected_items > 0 ? (
                      <span className="text-danger">{receipt.rejected_items}</span>
                    ) : (
                      <span className="text-muted">0</span>
                    )}
                  </td>
                  <td>
                    {receipt.quality_score !== null ? (
                      <span className={`performance-badge badge-${getQualityColor(receipt.quality_score)}`}>
                        {receipt.quality_score}%
                      </span>
                    ) : (
                      <span className="text-muted">Pending</span>
                    )}
                  </td>
                  <td>{receipt.storage_location || <span className="text-muted">-</span>}</td>
                  <td>{receipt.received_by}</td>
                  <td>
                    <div className="action-buttons">
                      {receipt.status === 'PENDING' && (
                        <button className="btn-icon" title="Confirm Receipt" onClick={() => handleConfirmReceipt(receipt)}>&#10003;</button>
                      )}
                      {receipt.status === 'QUALITY_CHECK' && (
                        <>
                          <button className="btn-icon" title="Approve" onClick={() => handleConfirmReceipt(receipt)}>&#10003;</button>
                        </>
                      )}
                      {(receipt.status === 'PENDING' || receipt.status === 'RECEIVED') && (
                        <button className="btn-icon" title="Delete" onClick={() => handleDeleteReceipt(receipt)}>&#128465;</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredReceipts.length === 0 && (
          <div className="empty-state">
            <p>No goods receipts found matching your criteria.</p>
          </div>
        )}
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Total Receipts</div>
          <div className="metric-value">{totalReceipts}</div>
          <div className="metric-detail">All statuses</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Pending QC</div>
          <div className="metric-value">{pendingQC}</div>
          <div className="metric-detail">Awaiting inspection</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Approved</div>
          <div className="metric-value">{approved}</div>
          <div className="metric-detail">{rejected} rejected</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Avg Quality Score</div>
          <div className="metric-value">{avgQualityScore.toFixed(1)}%</div>
          <div className="metric-detail">Quality performance</div>
        </div>
      </div>

      {/* Create Goods Receipt Modal */}
      <Modal
        title="Create Goods Receipt"
        open={showCreateModal}
        onCancel={() => { setShowCreateModal(false); createForm.resetFields(); setSelectedOrder(null); setLineItems([]); }}
        footer={[
          <Button key="cancel" onClick={() => { setShowCreateModal(false); createForm.resetFields(); setSelectedOrder(null); setLineItems([]); }}>Cancel</Button>,
          <Button key="save" type="primary" onClick={handleCreateReceipt} loading={saving}>
            Create Receipt
          </Button>
        ]}
        width={750}
      >
        <Form layout="vertical" form={createForm}>
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item label="Purchase Order" name="order_id" rules={[{ required: true, message: 'Please select a purchase order' }]}>
                <Select
                  placeholder="Select a purchase order"
                  showSearch
                  optionFilterProp="children"
                  onChange={handleOrderSelect}
                >
                  {orders.map(order => (
                    <Select.Option key={order.id} value={order.id}>
                      {order.po_number} - {order.supplier_name} ({order.status})
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Receipt Date" name="gr_date" rules={[{ required: true, message: 'Please select receipt date' }]}>
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
          </Row>

          {selectedOrder && (
            <div style={{ marginBottom: 16, padding: '8px 12px', background: '#f5f5f5', borderRadius: 6 }}>
              <strong>Supplier:</strong> {selectedOrder.supplier_name} ({selectedOrder.supplier_code})
            </div>
          )}

          {lineItems.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <h4 style={{ marginBottom: 8 }}>Line Items - Enter Received Quantities</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e8e8e8', textAlign: 'left' }}>
                    <th style={{ padding: '8px 4px' }}>Description</th>
                    <th style={{ padding: '8px 4px', width: 80 }}>Ordered</th>
                    <th style={{ padding: '8px 4px', width: 120 }}>Received</th>
                    <th style={{ padding: '8px 4px', width: 80 }}>UOM</th>
                    <th style={{ padding: '8px 4px', width: 150 }}>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item, index) => (
                    <tr key={item.po_line_id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '6px 4px' }}>{item.description}</td>
                      <td style={{ padding: '6px 4px', textAlign: 'center' }}>{item.ordered_qty}</td>
                      <td style={{ padding: '6px 4px' }}>
                        <InputNumber
                          min={0}
                          max={item.ordered_qty}
                          value={item.quantity_received}
                          onChange={(val) => updateLineQuantity(index, val || 0)}
                          style={{ width: '100%' }}
                        />
                      </td>
                      <td style={{ padding: '6px 4px', textAlign: 'center' }}>{item.unit_of_measure || 'EA'}</td>
                      <td style={{ padding: '6px 4px' }}>
                        <Input
                          placeholder="Line notes"
                          value={item.notes}
                          onChange={(e) => updateLineNotes(index, e.target.value)}
                          size="small"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item label="Notes" name="notes">
                <Input.TextArea placeholder="Additional notes about this receipt (e.g., delivery condition, discrepancies)" rows={3} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default GoodsReceiptPage;
