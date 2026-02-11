import React, { useState, useEffect } from 'react';
import {
  Card, Row, Col, Table, Button, Input, Select, Tag, Space, Modal, Form,
  InputNumber, message, Statistic, Avatar, Typography, Descriptions,
  Empty, Spin, Tooltip, Badge,
} from 'antd';
import {
  TeamOutlined, PlusOutlined, SearchOutlined, EditOutlined,
  EyeOutlined, MailOutlined, PhoneOutlined, SyncOutlined, UserOutlined,
} from '@ant-design/icons';
import { workspaceApi } from '../../../services/api.service';

const { Text } = Typography;
const { Option } = Select;

interface Customer {
  id: number;
  customer_id?: number;
  company_name?: string;
  customer_name?: string;
  name?: string;
  customer_type: string;
  email: string;
  phone: string;
  contact_person?: string;
  vat_number?: string;
  credit_limit: number;
  payment_terms?: number;
  status: string;
  billing_address?: string;
  shipping_address?: string;
  created_at?: string;
}

const CustomerManagement: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => { fetchCustomers(); }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      // Direct fetch to bypass any abstraction issues
      const token = localStorage.getItem('token') || localStorage.getItem('authToken') || '';
      const tenantId = localStorage.getItem('tenantId') || localStorage.getItem('workspaceId') || '';
      console.log('[CustomerManagement] token exists:', !!token, 'tenantId:', tenantId);
      
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (tenantId) headers['X-Tenant-ID'] = tenantId;
      
      const rawResponse = await fetch('/api/sales/customers?limit=200', { method: 'GET', headers });
      console.log('[CustomerManagement] HTTP status:', rawResponse.status);
      
      const json = await rawResponse.json();
      console.log('[CustomerManagement] Raw JSON keys:', Object.keys(json), 'success:', json.success);
      
      // Extract list from any possible response shape
      let list: any[] = [];
      if (Array.isArray(json)) {
        list = json;
      } else if (Array.isArray(json?.data)) {
        list = json.data;
      } else if (Array.isArray(json?.customers)) {
        list = json.customers;
      }
      
      console.log('[CustomerManagement] Extracted', list.length, 'customers');
      if (list.length === 0) {
        message.warning(`API returned ${rawResponse.status} with keys: ${Object.keys(json).join(', ')} — data type: ${typeof json.data} — check console`);
      }
      
      setCustomers(list.map((c: any) => ({
        ...c,
        id: c.customer_id || c.id,
        name: c.company_name || c.customer_name || c.name || 'Unnamed',
      })));
    } catch (err: any) {
      console.error('[CustomerManagement] Fetch error:', err);
      message.error(`Failed to load customers: ${err?.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      await workspaceApi.sales.createCustomer({
        company_name: values.company_name,
        customer_name: values.company_name,
        email: values.email,
        phone: values.phone,
        customer_type: values.customer_type,
        contact_person: values.contact_person,
        vat_number: values.vat_number,
        credit_limit: values.credit_limit,
        payment_terms: values.payment_terms,
        billing_address: values.billing_address,
      });
      message.success('Customer created successfully');
      setShowModal(false);
      form.resetFields();
      fetchCustomers();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.message || 'Failed to save customer');
    } finally {
      setSaving(false);
    }
  };

  const openCreate = () => {
    setSelectedCustomer(null);
    form.resetFields();
    form.setFieldsValue({ customer_type: 'corporate', payment_terms: 30, credit_limit: 0 });
    setShowModal(true);
  };

  const getName = (c: Customer) => c.company_name || c.customer_name || c.name || 'Unnamed';
  const formatCurrency = (v: number) => `R ${(v || 0).toLocaleString('en-ZA')}`;

  const filtered = customers.filter(c => {
    const name = getName(c).toLowerCase();
    const matchSearch = !searchTerm || name.includes(searchTerm.toLowerCase()) || (c.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = !filterType || (c.customer_type || '').toLowerCase() === filterType.toLowerCase();
    return matchSearch && matchType;
  });

  const typeColors: Record<string, string> = { corporate: 'blue', business: 'blue', individual: 'green', government: 'purple' };

  const columns = [
    {
      title: 'Customer',
      key: 'name',
      render: (_: any, r: Customer) => (
        <Space>
          <Avatar style={{ backgroundColor: '#667eea' }}>{getName(r).charAt(0)}</Avatar>
          <div>
            <Text strong>{getName(r)}</Text>
            {r.email && <div><Text type="secondary" style={{ fontSize: 12 }}>{r.email}</Text></div>}
          </div>
        </Space>
      ),
      sorter: (a: Customer, b: Customer) => getName(a).localeCompare(getName(b)),
    },
    {
      title: 'Type',
      dataIndex: 'customer_type',
      key: 'type',
      width: 120,
      render: (t: string) => <Tag color={typeColors[(t || '').toLowerCase()] || 'default'}>{t || 'General'}</Tag>,
    },
    {
      title: 'Contact',
      key: 'contact',
      width: 200,
      render: (_: any, r: Customer) => (
        <Space direction="vertical" size={0}>
          {r.phone && <Text style={{ fontSize: 12 }}><PhoneOutlined style={{ marginRight: 4 }} />{r.phone}</Text>}
          {r.contact_person && <Text type="secondary" style={{ fontSize: 12 }}>{r.contact_person}</Text>}
        </Space>
      ),
    },
    {
      title: 'Credit Limit',
      dataIndex: 'credit_limit',
      key: 'credit_limit',
      width: 130,
      render: (v: number) => formatCurrency(v),
      sorter: (a: Customer, b: Customer) => (a.credit_limit || 0) - (b.credit_limit || 0),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (s: string) => <Badge status={(s || '').toLowerCase() === 'active' ? 'success' : 'default'} text={s || 'Active'} />,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_: any, r: Customer) => (
        <Space size="small">
          <Tooltip title="View"><Button type="text" size="small" icon={<EyeOutlined />} onClick={() => { setSelectedCustomer(r); setShowDetailModal(true); }} /></Tooltip>
          <Tooltip title="Edit"><Button type="text" size="small" icon={<EditOutlined />} onClick={() => { setSelectedCustomer(r); form.setFieldsValue({ company_name: getName(r), email: r.email, phone: r.phone, customer_type: r.customer_type, contact_person: r.contact_person, vat_number: r.vat_number, credit_limit: r.credit_limit, payment_terms: r.payment_terms }); setShowModal(true); }} /></Tooltip>
        </Space>
      ),
    },
  ];

  const totalCustomers = customers.length;
  const corporateCount = customers.filter(c => (c.customer_type || '').toLowerCase() === 'corporate').length;
  const individualCount = totalCustomers - corporateCount;

  return (
    <>
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={6}><Card><Statistic title="Total Customers" value={totalCustomers} prefix={<TeamOutlined style={{ color: '#667eea' }} />} /></Card></Col>
        <Col span={6}><Card><Statistic title="Corporate" value={corporateCount} valueStyle={{ color: '#1890ff' }} /></Card></Col>
        <Col span={6}><Card><Statistic title="Individual" value={individualCount} valueStyle={{ color: '#52c41a' }} /></Card></Col>
        <Col span={6}><Card><Statistic title="Total Credit" value={customers.reduce((s, c) => s + (parseFloat(String(c.credit_limit)) || 0), 0)} prefix="R" valueStyle={{ color: '#667eea' }} /></Card></Col>
      </Row>

      <Card
        title={<Space><TeamOutlined style={{ color: '#667eea' }} /><span>All Customers</span></Space>}
        extra={
          <Space>
            <Input placeholder="Search..." prefix={<SearchOutlined />} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ width: 220 }} allowClear />
            <Select placeholder="All Types" value={filterType || undefined} onChange={v => setFilterType(v || '')} style={{ width: 130 }} allowClear>
              <Option value="corporate">Corporate</Option>
              <Option value="individual">Individual</Option>
            </Select>
            <Button icon={<SyncOutlined />} onClick={fetchCustomers} loading={loading} />
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>New Customer</Button>
          </Space>
        }
      >
        <Table dataSource={filtered} columns={columns} rowKey="id" loading={loading}
          pagination={{ pageSize: 15, showSizeChanger: true, showTotal: t => `${t} customers` }} size="middle"
          locale={{ emptyText: <Empty description="No customers yet" /> }}
        />
      </Card>

      {/* Create/Edit Modal */}
      <Modal title={selectedCustomer ? 'Edit Customer' : '➕ New Customer'} open={showModal}
        onCancel={() => { setShowModal(false); setSelectedCustomer(null); }}
        onOk={handleSave} okText={selectedCustomer ? 'Update' : 'Create'} confirmLoading={saving} width={700}>
        <Form layout="vertical" form={form}>
          <Row gutter={16}>
            <Col span={16}><Form.Item label="Company / Customer Name" name="company_name" rules={[{ required: true }]}><Input placeholder="e.g. Acme Trading" /></Form.Item></Col>
            <Col span={8}><Form.Item label="Type" name="customer_type"><Select><Option value="corporate">Corporate</Option><Option value="individual">Individual</Option><Option value="government">Government</Option></Select></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}><Form.Item label="Email" name="email" rules={[{ type: 'email', message: 'Invalid' }]}><Input prefix={<MailOutlined />} placeholder="email@co.com" /></Form.Item></Col>
            <Col span={8}><Form.Item label="Phone" name="phone"><Input prefix={<PhoneOutlined />} placeholder="+27 ..." /></Form.Item></Col>
            <Col span={8}><Form.Item label="Contact Person" name="contact_person"><Input placeholder="John Smith" /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}><Form.Item label="VAT Number" name="vat_number"><Input /></Form.Item></Col>
            <Col span={8}><Form.Item label="Credit Limit" name="credit_limit"><InputNumber style={{ width: '100%' }} prefix="R" min={0} step={1000} /></Form.Item></Col>
            <Col span={8}><Form.Item label="Payment Terms" name="payment_terms"><Select><Option value={7}>7 Days</Option><Option value={14}>14 Days</Option><Option value={30}>30 Days</Option><Option value={60}>60 Days</Option></Select></Form.Item></Col>
          </Row>
          <Form.Item label="Billing Address" name="billing_address"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>

      {/* Detail Modal */}
      <Modal title={selectedCustomer ? getName(selectedCustomer) : 'Customer'} open={showDetailModal}
        onCancel={() => setShowDetailModal(false)} footer={<Button onClick={() => setShowDetailModal(false)}>Close</Button>} width={600}>
        {selectedCustomer && (
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="Name" span={2}>{getName(selectedCustomer)}</Descriptions.Item>
            <Descriptions.Item label="Type"><Tag color={typeColors[(selectedCustomer.customer_type || '').toLowerCase()]}>{selectedCustomer.customer_type}</Tag></Descriptions.Item>
            <Descriptions.Item label="Status"><Badge status="success" text={selectedCustomer.status || 'Active'} /></Descriptions.Item>
            <Descriptions.Item label="Email">{selectedCustomer.email || '—'}</Descriptions.Item>
            <Descriptions.Item label="Phone">{selectedCustomer.phone || '—'}</Descriptions.Item>
            <Descriptions.Item label="Contact">{selectedCustomer.contact_person || '—'}</Descriptions.Item>
            <Descriptions.Item label="VAT">{selectedCustomer.vat_number || '—'}</Descriptions.Item>
            <Descriptions.Item label="Credit Limit">{formatCurrency(selectedCustomer.credit_limit)}</Descriptions.Item>
            <Descriptions.Item label="Payment Terms">{selectedCustomer.payment_terms || 30} days</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </>
  );
};

export default CustomerManagement;
