import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, Row, Col, Button, message, InputNumber, DatePicker, Divider } from 'antd';
import apiClient from '../../services/api';
import { purchaseService } from '../../services/purchase.service';
import '../../styles/erp-ui.css';

interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_name: string;
  supplier_code: string;
  order_date: string;
  delivery_date: string;
  status: 'DRAFT' | 'SENT' | 'CONFIRMED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED';
  payment_terms: string;
  total_amount: number;
  item_count: number;
  received_items: number;
  requester: string;
  department: string;
  pr_number: string | null;
  notes: string;
}

interface Supplier {
  id: string;
  name: string;
  trading_name?: string;
  code?: string;
}

const PurchaseOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Modal / form state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [form] = Form.useForm();
  const [poLines, setPoLines] = useState<{ description: string; quantity: number; unit: string; unit_price: number }[]>([]);

  useEffect(() => {
    fetchPurchaseOrders();
    fetchSuppliers();
  }, []);

  const fetchPurchaseOrders = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/api/purchase/orders');
      setOrders(response.data?.data || response.data || []);
    } catch (err) {
      console.error('Error fetching purchase orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await apiClient.get('/api/purchase/suppliers');
      const list = response.data?.data || response.data || [];
      setSuppliers(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Error fetching suppliers:', err);
    }
  };

  // ── Line item helpers ─────────────────────────────────────────────────────

  const addPoLine = () => {
    setPoLines([...poLines, { description: '', quantity: 1, unit: 'each', unit_price: 0 }]);
  };

  const updatePoLine = (idx: number, field: string, value: any) => {
    const updated = [...poLines];
    (updated[idx] as any)[field] = value;
    setPoLines(updated);
  };

  const removePoLine = (idx: number) => {
    setPoLines(poLines.filter((_, i) => i !== idx));
  };

  // ── Create PO handler ─────────────────────────────────────────────────────

  const handleCreateOrder = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      const subtotal = poLines.reduce((sum, l) => sum + l.quantity * l.unit_price, 0);
      const vatRate = 15;
      const vatAmount = subtotal * (vatRate / 100);
      const total = subtotal + vatAmount;

      await purchaseService.createOrder({
        supplier_id: values.supplier_id,
        expected_date: values.expected_date?.toISOString(),
        delivery_date: values.expected_date?.toISOString(),
        payment_terms: values.payment_terms,
        notes: values.notes,
        status: 'DRAFT',
        subtotal,
        vat_rate: vatRate,
        vat_amount: vatAmount,
        total,
        lines: poLines.map((line) => ({
          description: line.description,
          quantity: line.quantity,
          unit_of_measure: line.unit,
          unit_price: line.unit_price,
          vat_rate: vatRate,
          line_total: line.quantity * line.unit_price * (1 + vatRate / 100),
        })),
      });

      message.success('Purchase order created successfully');
      setShowCreateModal(false);
      form.resetFields();
      setPoLines([]);
      fetchPurchaseOrders();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.message || err?.message || 'Failed to create purchase order');
    } finally {
      setSaving(false);
    }
  };

  // ── Send PO handler ───────────────────────────────────────────────────────

  const handleSendOrder = async (orderId: string) => {
    try {
      await purchaseService.sendOrder(orderId);
      message.success('Purchase order sent to supplier');
      fetchPurchaseOrders();
    } catch (err: any) {
      message.error(err?.response?.data?.message || err?.message || 'Failed to send purchase order');
    }
  };

  // ── Cancel PO handler ─────────────────────────────────────────────────────

  const handleCancelOrder = async (orderId: string) => {
    const confirmed = window.confirm('Are you sure you want to cancel this purchase order? This action cannot be undone.');
    if (!confirmed) return;

    try {
      await purchaseService.cancelOrder(orderId);
      message.success('Purchase order cancelled');
      fetchPurchaseOrders();
    } catch (err: any) {
      message.error(err?.response?.data?.message || err?.message || 'Failed to cancel purchase order');
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────

  const openCreateModal = () => {
    form.resetFields();
    setPoLines([]);
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    form.resetFields();
    setPoLines([]);
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
      'SENT': 'blue',
      'CONFIRMED': 'green',
      'PARTIALLY_RECEIVED': 'orange',
      'RECEIVED': 'purple',
      'CANCELLED': 'red'
    };
    return colors[status] || 'gray';
  };

  const getReceivingProgress = (received: number, total: number): number => {
    if (total === 0) return 0;
    return Math.round((received / total) * 100);
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch =
      order.po_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.supplier_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.requester.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = filterStatus === 'ALL' || order.status === filterStatus;

    return matchesSearch && matchesFilter;
  });

  const totalOrders = orders.length;
  const activeOrders = orders.filter(o => ['SENT', 'CONFIRMED', 'PARTIALLY_RECEIVED'].includes(o.status)).length;
  const totalValue = orders.reduce((sum, o) => sum + o.total_amount, 0);
  const pendingReceipt = orders.filter(o => o.status === 'CONFIRMED' || o.status === 'PARTIALLY_RECEIVED').length;

  const lineSubtotal = poLines.reduce((sum, l) => sum + l.quantity * l.unit_price, 0);
  const lineVat = lineSubtotal * 0.15;
  const lineTotal = lineSubtotal + lineVat;

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading purchase orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="content-card">
        <div className="card-header">
          <h2>Purchase Orders</h2>
          <button className="btn-primary" onClick={openCreateModal}>+ New PO</button>
        </div>

        <div className="filters-section">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search orders by PO number, supplier, or requester..."
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
              className={filterStatus === 'SENT' ? 'filter-btn active' : 'filter-btn'}
              onClick={() => setFilterStatus('SENT')}
            >
              Sent
            </button>
            <button
              className={filterStatus === 'CONFIRMED' ? 'filter-btn active' : 'filter-btn'}
              onClick={() => setFilterStatus('CONFIRMED')}
            >
              Confirmed
            </button>
            <button
              className={filterStatus === 'PARTIALLY_RECEIVED' ? 'filter-btn active' : 'filter-btn'}
              onClick={() => setFilterStatus('PARTIALLY_RECEIVED')}
            >
              Partial
            </button>
            <button
              className={filterStatus === 'RECEIVED' ? 'filter-btn active' : 'filter-btn'}
              onClick={() => setFilterStatus('RECEIVED')}
            >
              Received
            </button>
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>PO Number</th>
                <th>Order Date</th>
                <th>Supplier</th>
                <th>Delivery Date</th>
                <th>Status</th>
                <th>Receiving Progress</th>
                <th>Amount</th>
                <th>Payment Terms</th>
                <th>Requester</th>
                <th>PR Number</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id}>
                  <td className="code-cell">{order.po_number}</td>
                  <td>{new Date(order.order_date).toLocaleDateString('en-ZA')}</td>
                  <td>
                    <div className="supplier-info">
                      <div className="supplier-name">{order.supplier_name}</div>
                      <div className="supplier-code">{order.supplier_code}</div>
                    </div>
                  </td>
                  <td>{new Date(order.delivery_date).toLocaleDateString('en-ZA')}</td>
                  <td>
                    <span className={`status-badge status-${getStatusColor(order.status)}`}>
                      {order.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td>
                    <div className="progress-container">
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{width: `${getReceivingProgress(order.received_items, order.item_count)}%`}}
                        ></div>
                      </div>
                      <span className="progress-text">
                        {order.received_items}/{order.item_count} items
                      </span>
                    </div>
                  </td>
                  <td className="amount-cell">{formatCurrency(order.total_amount)}</td>
                  <td>{order.payment_terms}</td>
                  <td>{order.requester}</td>
                  <td>
                    {order.pr_number ? (
                      <a href={`/purchase/requisitions?pr=${order.pr_number}`} className="link-text">
                        {order.pr_number}
                      </a>
                    ) : (
                      <span className="text-muted">-</span>
                    )}
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn-icon" title="View Details">👁️</button>
                      {order.status === 'DRAFT' && (
                        <>
                          <button className="btn-icon" title="Edit">✏️</button>
                          <button className="btn-icon" title="Send to Supplier" onClick={() => handleSendOrder(order.id)}>📤</button>
                          <button className="btn-icon" title="Cancel Order" onClick={() => handleCancelOrder(order.id)}>❌</button>
                        </>
                      )}
                      {order.status === 'SENT' && (
                        <button className="btn-icon" title="Cancel Order" onClick={() => handleCancelOrder(order.id)}>❌</button>
                      )}
                      {(order.status === 'CONFIRMED' || order.status === 'PARTIALLY_RECEIVED') && (
                        <button className="btn-icon" title="Receive Goods">📥</button>
                      )}
                      <button className="btn-icon" title="Print PO">🖨️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredOrders.length === 0 && (
          <div className="empty-state">
            <p>No purchase orders found matching your criteria.</p>
          </div>
        )}
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Total Orders</div>
          <div className="metric-value">{totalOrders}</div>
          <div className="metric-detail">All statuses</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Active Orders</div>
          <div className="metric-value">{activeOrders}</div>
          <div className="metric-detail">In progress</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Total Value</div>
          <div className="metric-value">{formatCurrency(totalValue)}</div>
          <div className="metric-detail">All orders</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Pending Receipt</div>
          <div className="metric-value">{pendingReceipt}</div>
          <div className="metric-detail">Awaiting delivery</div>
        </div>
      </div>

      {/* ── Create Purchase Order Modal ──────────────────────────────────── */}
      <Modal
        title="Create Purchase Order"
        open={showCreateModal}
        onCancel={closeCreateModal}
        footer={[
          <Button key="cancel" onClick={closeCreateModal}>Cancel</Button>,
          <Button key="create" type="primary" onClick={handleCreateOrder} loading={saving}>
            Create Purchase Order
          </Button>,
        ]}
        width={800}
      >
        <Form layout="vertical" form={form}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Supplier" name="supplier_id" rules={[{ required: true, message: 'Please select a supplier' }]}>
                <Select placeholder="Select supplier" showSearch optionFilterProp="children">
                  {suppliers.map((s) => (
                    <Select.Option key={s.id} value={s.id}>{s.name || s.trading_name}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Expected Delivery Date" name="expected_date" rules={[{ required: true, message: 'Please select a delivery date' }]}>
                <DatePicker style={{ width: '100%' }} />
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
                <Input placeholder="Optional notes" />
              </Form.Item>
            </Col>
          </Row>

          <Divider>Line Items</Divider>

          {poLines.map((line, idx) => (
            <Row gutter={8} key={idx} align="middle" style={{ marginBottom: 8 }}>
              <Col span={8}>
                <Input
                  placeholder="Description"
                  value={line.description}
                  onChange={(e) => updatePoLine(idx, 'description', e.target.value)}
                />
              </Col>
              <Col span={3}>
                <InputNumber
                  placeholder="Qty"
                  value={line.quantity}
                  min={1}
                  onChange={(v) => updatePoLine(idx, 'quantity', v || 1)}
                  style={{ width: '100%' }}
                />
              </Col>
              <Col span={4}>
                <Select value={line.unit} onChange={(v) => updatePoLine(idx, 'unit', v)} style={{ width: '100%' }}>
                  <Select.Option value="each">Each</Select.Option>
                  <Select.Option value="box">Box</Select.Option>
                  <Select.Option value="kg">Kg</Select.Option>
                  <Select.Option value="litre">Litre</Select.Option>
                  <Select.Option value="meter">Meter</Select.Option>
                  <Select.Option value="pallet">Pallet</Select.Option>
                </Select>
              </Col>
              <Col span={4}>
                <InputNumber
                  placeholder="Unit Price"
                  value={line.unit_price}
                  min={0}
                  onChange={(v) => updatePoLine(idx, 'unit_price', v || 0)}
                  style={{ width: '100%' }}
                  formatter={(v) => `R ${v}`}
                  parser={(v) => Number(v!.replace(/R\s?/g, '')) as unknown as number}
                />
              </Col>
              <Col span={3}>
                <span style={{ fontWeight: 600 }}>R {(line.quantity * line.unit_price).toLocaleString('en-ZA')}</span>
              </Col>
              <Col span={2}>
                <Button type="primary" danger size="small" onClick={() => removePoLine(idx)}>X</Button>
              </Col>
            </Row>
          ))}

          <Button type="dashed" style={{ width: '100%' }} onClick={addPoLine}>
            + Add Line Item
          </Button>

          {poLines.length > 0 && (
            <div style={{ textAlign: 'right', marginTop: 16, padding: '12px 16px', background: '#f0f5ff', borderRadius: 8 }}>
              <div>Subtotal: <strong>R {lineSubtotal.toLocaleString('en-ZA')}</strong></div>
              <div>VAT (15%): <strong>R {lineVat.toLocaleString('en-ZA')}</strong></div>
              <div style={{ fontSize: 16, marginTop: 4 }}>
                Total: <strong style={{ color: '#667eea', fontSize: 18 }}>R {lineTotal.toLocaleString('en-ZA')}</strong>
              </div>
            </div>
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default PurchaseOrdersPage;
