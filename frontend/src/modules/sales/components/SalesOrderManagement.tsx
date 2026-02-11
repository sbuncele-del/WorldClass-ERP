import React, { useState, useEffect } from 'react';
import {
  Card, Row, Col, Table, Button, Input, Select, Tag, Space, Modal, Form,
  InputNumber, message, Statistic, Typography, Empty, Tooltip, DatePicker, Divider,
} from 'antd';
import {
  ShoppingCartOutlined, PlusOutlined, SearchOutlined, EyeOutlined,
  SyncOutlined, CheckCircleOutlined, ClockCircleOutlined,
} from '@ant-design/icons';
import { workspaceApi } from '../../../services/api.service';

const { Text } = Typography;
const { Option } = Select;

interface SalesOrder {
  id: number;
  order_number?: string;
  customer_id?: number;
  customer_name?: string;
  order_date?: string;
  total_amount?: number;
  status: string;
  order_status?: string;
  items_count?: number;
  created_at?: string;
}

const SalesOrderManagement: React.FC = () => {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const [allCustomers, setAllCustomers] = useState<{ id: number; name: string }[]>([]);

  useEffect(() => { fetchOrders(); loadCustomers(); }, []);

  const extractList = (response: any, ...keys: string[]) => {
    if (Array.isArray(response)) return response;
    for (const k of keys) { if (Array.isArray(response?.[k])) return response[k]; }
    for (const k of keys) { if (Array.isArray(response?.data?.[k])) return response.data[k]; }
    if (Array.isArray(response?.data)) return response.data;
    return [];
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response: any = await workspaceApi.sales.getOrders({ limit: 100 });
      console.log('[Orders] response:', JSON.stringify(response).slice(0, 300));
      const list = extractList(response, 'data', 'orders');
      setOrders(list.map((o: any) => ({
        ...o, id: o.order_id || o.id,
        order_number: o.order_number || `SO-${o.id}`,
        status: o.order_status || o.status || 'pending',
      })));
    } catch (err) { console.error('[Orders] error:', err); message.error('Failed to load orders'); }
    finally { setLoading(false); }
  };

  const loadCustomers = async () => {
    try {
      const res: any = await workspaceApi.sales.getCustomers({ limit: 200 });
      const list = extractList(res, 'data', 'customers');
      setAllCustomers(list.map((c: any) => ({
        id: c.customer_id || c.id, name: c.company_name || c.customer_name || c.name || 'Unnamed',
      })));
    } catch { /* ignore */ }
  };

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      await workspaceApi.sales.createOrder({
        customer_id: values.customer_id,
        order_date: values.order_date?.toDate?.()?.toISOString() || new Date().toISOString(),
        total_amount: values.total_amount,
        order_status: values.order_status || 'pending',
      });
      message.success('Order created successfully');
      setShowModal(false); form.resetFields(); fetchOrders();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.message || 'Failed to create order');
    } finally { setSaving(false); }
  };

  const formatCurrency = (v: number) => `R ${(v || 0).toLocaleString('en-ZA')}`;

  const statusColors: Record<string, string> = {
    pending: 'default', processing: 'processing', shipped: 'cyan',
    delivered: 'success', invoiced: 'purple', cancelled: 'error',
  };
  const statusIcons: Record<string, React.ReactNode> = {
    pending: <ClockCircleOutlined />, delivered: <CheckCircleOutlined />,
  };

  const filtered = orders.filter(o => {
    const matchSearch = !searchTerm || (o.order_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = !filterStatus || (o.status || '').toLowerCase() === filterStatus.toLowerCase();
    return matchSearch && matchStatus;
  });

  const columns = [
    {
      title: 'Order #', dataIndex: 'order_number', key: 'num', width: 140,
      render: (t: string) => <Text strong style={{ color: '#10b981' }}>{t}</Text>,
    },
    { title: 'Customer', dataIndex: 'customer_name', key: 'customer', ellipsis: true },
    {
      title: 'Date', key: 'date', width: 110,
      render: (_: any, r: SalesOrder) => r.order_date ? new Date(r.order_date).toLocaleDateString('en-ZA') : '—',
    },
    {
      title: 'Amount', dataIndex: 'total_amount', key: 'amount', width: 140,
      render: (v: number) => <Text strong>{formatCurrency(v)}</Text>,
      sorter: (a: SalesOrder, b: SalesOrder) => (a.total_amount || 0) - (b.total_amount || 0),
    },
    {
      title: 'Status', dataIndex: 'status', key: 'status', width: 120,
      render: (s: string) => <Tag color={statusColors[(s || '').toLowerCase()] || 'default'} icon={statusIcons[(s || '').toLowerCase()]}>
        {(s || 'Pending').charAt(0).toUpperCase() + (s || 'Pending').slice(1)}
      </Tag>,
    },
    {
      title: 'Actions', key: 'actions', width: 80,
      render: (_: any, r: SalesOrder) => (
        <Tooltip title="View"><Button type="text" size="small" icon={<EyeOutlined />} onClick={() => { setSelectedOrder(r); setShowDetailModal(true); }} /></Tooltip>
      ),
    },
  ];

  const totalValue = orders.reduce((s, o) => s + (o.total_amount || 0), 0);
  const pendingCount = orders.filter(o => (o.status || '').toLowerCase() === 'pending').length;
  const deliveredCount = orders.filter(o => (o.status || '').toLowerCase() === 'delivered').length;

  return (
    <>
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={6}><Card><Statistic title="Total Orders" value={orders.length} prefix={<ShoppingCartOutlined style={{ color: '#10b981' }} />} /></Card></Col>
        <Col span={6}><Card><Statistic title="Total Value" value={totalValue} prefix="R" valueStyle={{ color: '#10b981' }} /></Card></Col>
        <Col span={6}><Card><Statistic title="Pending" value={pendingCount} valueStyle={{ color: '#faad14' }} /></Card></Col>
        <Col span={6}><Card><Statistic title="Delivered" value={deliveredCount} valueStyle={{ color: '#52c41a' }} /></Card></Col>
      </Row>

      <Card
        title={<Space><ShoppingCartOutlined style={{ color: '#10b981' }} /><span>Sales Orders</span></Space>}
        extra={
          <Space>
            <Input placeholder="Search..." prefix={<SearchOutlined />} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ width: 220 }} allowClear />
            <Select placeholder="All Status" value={filterStatus || undefined} onChange={v => setFilterStatus(v || '')} style={{ width: 130 }} allowClear>
              <Option value="pending">Pending</Option><Option value="processing">Processing</Option>
              <Option value="shipped">Shipped</Option><Option value="delivered">Delivered</Option>
            </Select>
            <Button icon={<SyncOutlined />} onClick={fetchOrders} loading={loading} />
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); form.setFieldsValue({ order_status: 'pending' }); setShowModal(true); }}>New Order</Button>
          </Space>
        }
      >
        <Table dataSource={filtered} columns={columns} rowKey="id" loading={loading}
          pagination={{ pageSize: 15, showSizeChanger: true, showTotal: t => `${t} orders` }} size="middle"
          locale={{ emptyText: <Empty description="No orders yet" /> }}
        />
      </Card>

      {/* Create Modal */}
      <Modal title="🛒 Create Sales Order" open={showModal}
        onCancel={() => setShowModal(false)} onOk={handleCreate} okText="Create Order" confirmLoading={saving} width={600}>
        <Form layout="vertical" form={form}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Customer" name="customer_id" rules={[{ required: true }]}>
                <Select placeholder="Select customer..." showSearch optionFilterProp="children">
                  {allCustomers.map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Order Date" name="order_date" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Total Amount (R)" name="total_amount" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} prefix="R" min={0} step={100} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Status" name="order_status">
                <Select>
                  <Option value="pending">Pending</Option><Option value="processing">Processing</Option>
                  <Option value="shipped">Shipped</Option><Option value="delivered">Delivered</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Detail Modal */}
      <Modal title={selectedOrder ? `Order ${selectedOrder.order_number}` : 'Order'} open={showDetailModal}
        onCancel={() => setShowDetailModal(false)} footer={<Button onClick={() => setShowDetailModal(false)}>Close</Button>} width={500}>
        {selectedOrder && (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Row gutter={16}>
              <Col span={12}><Text type="secondary">Customer</Text><br /><Text strong>{selectedOrder.customer_name || '—'}</Text></Col>
              <Col span={12}><Text type="secondary">Status</Text><br /><Tag color={statusColors[(selectedOrder.status || '').toLowerCase()]}>{selectedOrder.status}</Tag></Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}><Text type="secondary">Date</Text><br /><Text>{selectedOrder.order_date ? new Date(selectedOrder.order_date).toLocaleDateString('en-ZA') : '—'}</Text></Col>
              <Col span={12}><Statistic title="Total Amount" value={selectedOrder.total_amount || 0} prefix="R" valueStyle={{ color: '#10b981', fontWeight: 700 }} /></Col>
            </Row>
          </Space>
        )}
      </Modal>
    </>
  );
};

export default SalesOrderManagement;
