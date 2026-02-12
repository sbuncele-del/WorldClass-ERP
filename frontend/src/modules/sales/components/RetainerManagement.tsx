import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Row, Col, Table, Button, Input, Select, Tag, Space, Modal, Form,
  InputNumber, message, Statistic, Typography, Empty, Tooltip, DatePicker, Divider,
  Progress, Badge, Descriptions, Alert,
} from 'antd';
import {
  DollarOutlined, PlusOutlined, SearchOutlined, SyncOutlined,
  CheckCircleOutlined, ClockCircleOutlined, ExclamationCircleOutlined,
  CalendarOutlined, PlayCircleOutlined, PauseCircleOutlined,
  DeleteOutlined, FileTextOutlined, EyeOutlined, EditOutlined,
} from '@ant-design/icons';
import { workspaceApi } from '../../../services/api.service';

const { Text, Title, Paragraph } = Typography;
const { Option } = Select;

// ─── Types ──────────────────────────────────────────────────────────────────
interface Retainer {
  id: number;
  customer_id: number;
  customer_name: string;
  retainer_name: string;
  description: string;
  service_type: string;
  amount: number;
  billing_frequency: string;
  hours_included: number;
  hours_used: number;
  start_date: string;
  end_date: string | null;
  next_invoice_date: string | null;
  auto_invoice: boolean;
  status: string;
  created_at: string;
}

interface Customer {
  id: number;
  name: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────
const formatCurrency = (v: number) =>
  `R ${(v || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const statusColors: Record<string, string> = {
  active: 'green',
  paused: 'orange',
  cancelled: 'red',
  expired: 'default',
  draft: 'blue',
};

// ─── Component ──────────────────────────────────────────────────────────────
const RetainerManagement: React.FC = () => {
  const [retainers, setRetainers] = useState<Retainer[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRetainer, setSelectedRetainer] = useState<Retainer | null>(null);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // ─── Data Loading ────────────────────────────────────────────────────────
  const loadRetainers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await workspaceApi.sales.getRetainers();
      setRetainers(res.data || res.retainers || []);
    } catch (err) {
      console.warn('Failed to load retainers:', err);
      message.error('Failed to load retainers');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCustomers = useCallback(async () => {
    try {
      const res = await workspaceApi.sales.getCustomers({ limit: 200 });
      setCustomers(res.customers || res.data || []);
    } catch {
      // Customers list is supplementary
    }
  }, []);

  useEffect(() => {
    loadRetainers();
    loadCustomers();
  }, [loadRetainers, loadCustomers]);

  // ─── CRUD Handlers ───────────────────────────────────────────────────────
  const handleCreateOrUpdate = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const payload = {
        ...values,
        start_date: values.start_date?.format('YYYY-MM-DD'),
        end_date: values.end_date?.format('YYYY-MM-DD') || null,
      };

      if (editMode && selectedRetainer) {
        await workspaceApi.sales.updateRetainer(selectedRetainer.id, payload);
        message.success('Retainer updated successfully');
      } else {
        await workspaceApi.sales.createRetainer(payload);
        message.success('Retainer created successfully');
      }
      setShowModal(false);
      form.resetFields();
      setEditMode(false);
      setSelectedRetainer(null);
      loadRetainers();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.message || 'Failed to save retainer');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateInvoice = (record: Retainer) => {
    Modal.confirm({
      title: 'Generate Invoice',
      content: `Generate a new invoice for "${record.retainer_name}"? This will create an approved invoice and advance the next billing date.`,
      okText: 'Generate Invoice',
      okType: 'primary',
      onOk: async () => {
        try {
          const res = await workspaceApi.sales.generateRetainerInvoice(record.id);
          message.success(res.message || 'Invoice generated successfully');
          loadRetainers();
        } catch (err: any) {
          message.error(err?.response?.data?.message || 'Failed to generate invoice');
        }
      },
    });
  };

  const handleToggleStatus = async (id: number, action: string) => {
    try {
      await workspaceApi.sales.toggleRetainerStatus(id, action);
      message.success(`Retainer ${action}d successfully`);
      loadRetainers();
    } catch (err: any) {
      message.error(err?.response?.data?.message || `Failed to ${action} retainer`);
    }
  };

  const handleDelete = (id: number) => {
    Modal.confirm({
      title: 'Delete Retainer',
      content: 'Are you sure you want to delete this retainer? This action cannot be undone.',
      okText: 'Delete',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await workspaceApi.sales.deleteRetainer(id);
          message.success('Retainer deleted');
          loadRetainers();
        } catch (err: any) {
          message.error(err?.response?.data?.message || 'Failed to delete retainer');
        }
      },
    });
  };

  const openCreate = () => {
    setEditMode(false);
    setSelectedRetainer(null);
    form.resetFields();
    setShowModal(true);
  };

  const openEdit = (record: Retainer) => {
    setEditMode(true);
    setSelectedRetainer(record);
    form.setFieldsValue({
      customer_id: record.customer_id,
      retainer_name: record.retainer_name,
      description: record.description,
      service_type: record.service_type || 'monthly',
      amount: Number(record.amount),
      billing_frequency: record.billing_frequency || 'monthly',
      hours_included: record.hours_included || 0,
      auto_invoice: record.auto_invoice,
    });
    setShowModal(true);
  };

  const openDetail = async (record: Retainer) => {
    try {
      const res = await workspaceApi.sales.getRetainer(record.id);
      setSelectedRetainer(res.retainer || res.data || record);
    } catch {
      setSelectedRetainer(record);
    }
    setShowDetailModal(true);
  };

  // ─── Stats ────────────────────────────────────────────────────────────────
  const activeRetainers = retainers.filter(r => r.status === 'active');
  const monthlyRecurring = activeRetainers
    .filter(r => r.billing_frequency === 'monthly')
    .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const quarterlyRecurring = activeRetainers
    .filter(r => r.billing_frequency === 'quarterly')
    .reduce((sum, r) => sum + (Number(r.amount) || 0) / 3, 0);
  const annualRecurring = activeRetainers
    .filter(r => r.billing_frequency === 'annual')
    .reduce((sum, r) => sum + (Number(r.amount) || 0) / 12, 0);
  const totalMRR = monthlyRecurring + quarterlyRecurring + annualRecurring;
  const pausedCount = retainers.filter(r => r.status === 'paused').length;

  // ─── Filter ───────────────────────────────────────────────────────────────
  const filteredRetainers = retainers.filter(r => {
    const matchSearch = !searchTerm ||
      r.retainer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.customer_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // ─── Columns ──────────────────────────────────────────────────────────────
  const columns = [
    {
      title: 'Client',
      dataIndex: 'customer_name',
      key: 'customer_name',
      sorter: (a: Retainer, b: Retainer) => (a.customer_name || '').localeCompare(b.customer_name || ''),
      render: (text: string) => <Text strong>{text || 'Unknown'}</Text>,
    },
    {
      title: 'Service',
      dataIndex: 'retainer_name',
      key: 'retainer_name',
      render: (text: string, record: Retainer) => (
        <div>
          <Text strong>{text}</Text>
          {record.description && (
            <div><Text type="secondary" style={{ fontSize: 12 }}>{record.description.substring(0, 60)}{record.description.length > 60 ? '...' : ''}</Text></div>
          )}
        </div>
      ),
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      sorter: (a: Retainer, b: Retainer) => (Number(a.amount) || 0) - (Number(b.amount) || 0),
      render: (v: number) => <Text strong>{formatCurrency(Number(v) || 0)}</Text>,
    },
    {
      title: 'Frequency',
      dataIndex: 'billing_frequency',
      key: 'billing_frequency',
      render: (v: string) => (
        <Tag color="blue">
          {(v || 'monthly').charAt(0).toUpperCase() + (v || 'monthly').slice(1)}
        </Tag>
      ),
    },
    {
      title: 'Hours',
      key: 'hours',
      render: (_: any, record: Retainer) =>
        record.hours_included > 0 ? (
          <Tooltip title={`${record.hours_used || 0}h used of ${record.hours_included}h`}>
            <Progress
              percent={Math.round(((record.hours_used || 0) / record.hours_included) * 100)}
              size="small"
              strokeColor={((record.hours_used || 0) / record.hours_included) > 0.8 ? '#ff4d4f' : '#667eea'}
            />
          </Tooltip>
        ) : (
          <Text type="secondary">N/A</Text>
        ),
    },
    {
      title: 'Next Invoice',
      dataIndex: 'next_invoice_date',
      key: 'next_invoice_date',
      sorter: (a: Retainer, b: Retainer) => (a.next_invoice_date || '').localeCompare(b.next_invoice_date || ''),
      render: (v: string) => v ? new Date(v).toLocaleDateString('en-ZA') : '-',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (v: string) => (
        <Tag color={statusColors[v] || 'default'}>
          {(v || 'active').toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      render: (_: any, record: Retainer) => (
        <Space size="small">
          <Tooltip title="View Details">
            <Button type="link" size="small" icon={<EyeOutlined />}
              onClick={() => openDetail(record)} />
          </Tooltip>
          <Tooltip title="Edit">
            <Button type="link" size="small" icon={<EditOutlined />}
              onClick={() => openEdit(record)} />
          </Tooltip>
          {record.status === 'active' && (
            <>
              <Tooltip title="Generate Invoice">
                <Button type="link" size="small" icon={<DollarOutlined />}
                  onClick={() => handleGenerateInvoice(record)} />
              </Tooltip>
              <Tooltip title="Pause">
                <Button type="link" size="small" icon={<PauseCircleOutlined />}
                  onClick={() => handleToggleStatus(record.id, 'pause')} />
              </Tooltip>
            </>
          )}
          {record.status === 'paused' && (
            <Tooltip title="Resume">
              <Button type="link" size="small" icon={<PlayCircleOutlined />}
                onClick={() => handleToggleStatus(record.id, 'resume')} />
            </Tooltip>
          )}
          {['active', 'paused'].includes(record.status) && (
            <Tooltip title="Cancel">
              <Button type="link" size="small" danger icon={<ExclamationCircleOutlined />}
                onClick={() => handleToggleStatus(record.id, 'cancel')} />
            </Tooltip>
          )}
          <Tooltip title="Delete">
            <Button type="link" size="small" danger icon={<DeleteOutlined />}
              onClick={() => handleDelete(record.id)} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Stats Row */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Active Retainers"
              value={activeRetainers.length}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Monthly Recurring Revenue"
              value={totalMRR}
              prefix="R"
              precision={2}
              valueStyle={{ color: '#667eea' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Retainers"
              value={retainers.length}
              prefix={<CalendarOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Paused"
              value={pausedCount}
              prefix={<ClockCircleOutlined style={{ color: '#fa8c16' }} />}
              valueStyle={{ color: pausedCount > 0 ? '#fa8c16' : '#8c8c8c' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Main Table */}
      <Card
        title={
          <Space>
            <CalendarOutlined />
            <span>Retainer Services</span>
            <Badge count={activeRetainers.length} style={{ backgroundColor: '#52c41a' }} />
          </Space>
        }
        extra={
          <Space>
            <Input
              placeholder="Search retainers..."
              prefix={<SearchOutlined />}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ width: 220 }}
              allowClear
            />
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 140 }}
            >
              <Option value="all">All Status</Option>
              <Option value="active">Active</Option>
              <Option value="paused">Paused</Option>
              <Option value="cancelled">Cancelled</Option>
              <Option value="expired">Expired</Option>
              <Option value="draft">Draft</Option>
            </Select>
            <Button icon={<SyncOutlined />} onClick={loadRetainers} loading={loading}>
              Refresh
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              New Retainer
            </Button>
          </Space>
        }
      >
        {filteredRetainers.length === 0 && !loading ? (
          <Empty
            description={
              retainers.length === 0
                ? 'No retainers yet. Create a retainer to set up recurring billing for your clients.'
                : 'No retainers match your search criteria.'
            }
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            {retainers.length === 0 && (
              <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                Create First Retainer
              </Button>
            )}
          </Empty>
        ) : (
          <Table
            dataSource={filteredRetainers}
            columns={columns}
            loading={loading}
            rowKey="id"
            pagination={{ pageSize: 15, showSizeChanger: true, showTotal: (t) => `${t} retainers` }}
          />
        )}
      </Card>

      {/* Create/Edit Retainer Modal */}
      <Modal
        title={editMode ? 'Edit Retainer Service' : 'Create Retainer Service'}
        open={showModal}
        onCancel={() => { setShowModal(false); form.resetFields(); setEditMode(false); setSelectedRetainer(null); }}
        footer={[
          <Button key="cancel" onClick={() => { setShowModal(false); form.resetFields(); setEditMode(false); }}>
            Cancel
          </Button>,
          <Button key="save" type="primary" loading={saving} onClick={handleCreateOrUpdate}>
            {editMode ? 'Update Retainer' : 'Create Retainer'}
          </Button>,
        ]}
        width={700}
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="customer_id" label="Client" rules={[{ required: true, message: 'Select a client' }]}>
                <Select placeholder="Select client" showSearch optionFilterProp="children">
                  {customers.map(c => (
                    <Option key={c.id} value={c.id}>{c.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="retainer_name" label="Service Name" rules={[{ required: true, message: 'Enter service name' }]}>
                <Input placeholder="e.g. Monthly IT Support" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="amount" label="Amount (excl. VAT)" rules={[{ required: true, message: 'Enter amount' }]}>
                <InputNumber prefix="R" min={0} step={100} style={{ width: '100%' }} placeholder="5000" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="billing_frequency" label="Billing Frequency" initialValue="monthly">
                <Select>
                  <Option value="monthly">Monthly</Option>
                  <Option value="quarterly">Quarterly</Option>
                  <Option value="bi-annual">Bi-Annual</Option>
                  <Option value="annual">Annual</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="service_type" label="Service Type" initialValue="monthly">
                <Select>
                  <Option value="monthly">Monthly Retainer</Option>
                  <Option value="project">Project-Based</Option>
                  <Option value="hourly">Hourly Retainer</Option>
                  <Option value="custom">Custom</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="start_date" label="Start Date" rules={[{ required: true, message: 'Select start date' }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="end_date" label="End Date (Optional)">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="hours_included" label="Hours Included" initialValue={0}>
                <InputNumber min={0} style={{ width: '100%' }} placeholder="0 = unlimited" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} placeholder="Describe the retainer service..." />
          </Form.Item>
          <Form.Item name="auto_invoice" label="Auto-Generate Invoices" initialValue={true}>
            <Select>
              <Option value={true}>Yes - Auto-generate invoices</Option>
              <Option value={false}>No - Manual invoicing</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Detail Modal */}
      <Modal
        title={`Retainer: ${selectedRetainer?.retainer_name || ''}`}
        open={showDetailModal}
        onCancel={() => { setShowDetailModal(false); setSelectedRetainer(null); }}
        footer={[
          <Button key="close" onClick={() => setShowDetailModal(false)}>Close</Button>,
          selectedRetainer?.status === 'active' && (
            <Button key="invoice" type="primary" icon={<DollarOutlined />}
              onClick={() => { setShowDetailModal(false); handleGenerateInvoice(selectedRetainer!); }}>
              Generate Invoice
            </Button>
          ),
        ]}
        width={700}
      >
        {selectedRetainer && (
          <div>
            <Descriptions bordered column={2} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Client">{selectedRetainer.customer_name || 'Unknown'}</Descriptions.Item>
              <Descriptions.Item label="Service">{selectedRetainer.retainer_name}</Descriptions.Item>
              <Descriptions.Item label="Amount">{formatCurrency(Number(selectedRetainer.amount))}</Descriptions.Item>
              <Descriptions.Item label="Frequency">
                <Tag color="blue">{(selectedRetainer.billing_frequency || 'monthly').charAt(0).toUpperCase() + (selectedRetainer.billing_frequency || 'monthly').slice(1)}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Service Type">{selectedRetainer.service_type || 'Monthly Retainer'}</Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={statusColors[selectedRetainer.status] || 'default'}>
                  {(selectedRetainer.status || 'active').toUpperCase()}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Start Date">
                {selectedRetainer.start_date ? new Date(selectedRetainer.start_date).toLocaleDateString('en-ZA') : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="End Date">
                {selectedRetainer.end_date ? new Date(selectedRetainer.end_date).toLocaleDateString('en-ZA') : 'Ongoing'}
              </Descriptions.Item>
              <Descriptions.Item label="Next Invoice">
                {selectedRetainer.next_invoice_date ? new Date(selectedRetainer.next_invoice_date).toLocaleDateString('en-ZA') : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Auto Invoice">
                <Tag color={selectedRetainer.auto_invoice ? 'green' : 'default'}>
                  {selectedRetainer.auto_invoice ? 'Yes' : 'No'}
                </Tag>
              </Descriptions.Item>
              {selectedRetainer.hours_included > 0 && (
                <>
                  <Descriptions.Item label="Hours Included">{selectedRetainer.hours_included}h</Descriptions.Item>
                  <Descriptions.Item label="Hours Used">
                    {selectedRetainer.hours_used || 0}h
                    <Progress
                      percent={Math.round(((selectedRetainer.hours_used || 0) / selectedRetainer.hours_included) * 100)}
                      size="small"
                      style={{ marginTop: 4 }}
                      strokeColor={((selectedRetainer.hours_used || 0) / selectedRetainer.hours_included) > 0.8 ? '#ff4d4f' : '#667eea'}
                    />
                  </Descriptions.Item>
                </>
              )}
            </Descriptions>
            {selectedRetainer.description && (
              <div style={{ marginTop: 12 }}>
                <Text type="secondary">Description:</Text>
                <Paragraph style={{ marginTop: 4 }}>{selectedRetainer.description}</Paragraph>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default RetainerManagement;
