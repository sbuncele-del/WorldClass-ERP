import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  Card,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Tag,
  Space,
  message,
  Spin,
  Empty,
  Typography,
  Row,
  Col,
  Descriptions,
  Tabs,
  Statistic,
  Avatar,
  Tooltip,
  Popconfirm,
  Badge,
} from 'antd';
import {
  PlusOutlined,
  SwapOutlined,
  SearchOutlined,
  DeleteOutlined,
  EditOutlined,
  BankOutlined,
  TeamOutlined,
  ReloadOutlined,
  ArrowLeftOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;
const { Option } = Select;

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Client {
  id: string;
  tenant_id: string;
  company_name: string;
  industry: string;
  engagement_type: string;
  status: string;
  assigned_accountant: string;
  last_accessed: string;
  financial_health: string;
  contact_email: string;
  contact_phone: string;
  created_at: string;
}

interface ClientDetail extends Client {
  address: string;
  tax_number: string;
  registration_number: string;
  notes: string;
  engagements: EngagementRecord[];
  financialSummary: FinancialSummary;
}

interface EngagementRecord {
  id: string;
  type: string;
  status: string;
  start_date: string;
  end_date: string;
  fee: number;
}

interface FinancialSummary {
  revenue: number;
  expenses: number;
  profit: number;
  outstanding_invoices: number;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const statusColor: Record<string, string> = {
  active: 'green',
  onboarding: 'blue',
  suspended: 'orange',
  terminated: 'red',
};

const healthConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  good: { color: '#52c41a', icon: <CheckCircleOutlined />, label: 'Healthy' },
  warning: { color: '#faad14', icon: <ExclamationCircleOutlined />, label: 'Attention' },
  critical: { color: '#ff4d4f', icon: <WarningOutlined />, label: 'Critical' },
  unknown: { color: '#d9d9d9', icon: <ClockCircleOutlined />, label: 'No Data' },
};

const formatDate = (iso: string) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(val || 0);

const authHeaders = () => ({
  'Authorization': `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json',
});

/* ------------------------------------------------------------------ */
/*  Client Detail (named export for lazy loading)                      */
/* ------------------------------------------------------------------ */

export const ClientDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<ClientDetail | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/v2/accountant-portal/clients/${id}`, { headers: authHeaders() });
        if (!res.ok) throw new Error('Failed to load client');
        const json = await res.json();
        setClient(json.data);
      } catch (err) {
        console.error('Client detail error:', err);
        message.error('Failed to load client details');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleSwitch = async () => {
    if (!id || !client) return;
    try {
      const res = await fetch(`/api/v2/accountant-portal/switch/${id}`, {
        method: 'POST',
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('firmToken', localStorage.getItem('token') || '');
        localStorage.setItem('token', data.data.accessToken);
        localStorage.setItem(
          'accountantClientContext',
          JSON.stringify({
            clientTenantId: id,
            clientName: data.data.tenant?.name || client.company_name,
            firmTenantId: data.data.firmTenantId,
          }),
        );
        // Always go to main domain for full ERP access
        const mainDomain = window.location.hostname.startsWith('accountant.')
          ? `https://${window.location.hostname.replace('accountant.', '')}/app`
          : '/app';
        window.location.href = mainDomain;
      } else {
        message.error(data.message || 'Failed to switch');
      }
    } catch {
      message.error('Failed to switch to client');
    }
  };

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />;
  if (!client) return <Empty description="Client not found" />;

  const health = healthConfig[client.financial_health] || healthConfig.unknown;

  return (
    <div>
      <Button
        type="link"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/app/accountant-portal/clients')}
        style={{ padding: 0, marginBottom: 16 }}
      >
        Back to Clients
      </Button>

      <Card style={{ marginBottom: 24 }}>
        <Row align="middle" gutter={16}>
          <Col>
            <Avatar size={64} icon={<BankOutlined />} style={{ backgroundColor: '#1890ff' }} />
          </Col>
          <Col flex="auto">
            <Title level={4} style={{ margin: 0 }}>{client.company_name}</Title>
            <Space style={{ marginTop: 4 }}>
              <Tag color={statusColor[client.status] || 'default'}>{client.status}</Tag>
              <Badge color={health.color} text={health.label} />
              {client.industry && <Tag>{client.industry}</Tag>}
            </Space>
          </Col>
          <Col>
            <Button type="primary" icon={<SwapOutlined />} onClick={handleSwitch}>
              Switch to Client
            </Button>
          </Col>
        </Row>
      </Card>

      <Tabs
        defaultActiveKey="overview"
        items={[
          {
            key: 'overview',
            label: 'Overview',
            children: (
              <Row gutter={24}>
                <Col xs={24} lg={12}>
                  <Card title="Client Information" size="small" style={{ marginBottom: 16 }}>
                    <Descriptions column={1} size="small">
                      <Descriptions.Item label="Company">{client.company_name}</Descriptions.Item>
                      <Descriptions.Item label="Industry">{client.industry || '—'}</Descriptions.Item>
                      <Descriptions.Item label="Registration #">{client.registration_number || '—'}</Descriptions.Item>
                      <Descriptions.Item label="Tax Number">{client.tax_number || '—'}</Descriptions.Item>
                      <Descriptions.Item label="Email">{client.contact_email || '—'}</Descriptions.Item>
                      <Descriptions.Item label="Phone">{client.contact_phone || '—'}</Descriptions.Item>
                      <Descriptions.Item label="Address">{client.address || '—'}</Descriptions.Item>
                      <Descriptions.Item label="Client Since">{formatDate(client.created_at)}</Descriptions.Item>
                    </Descriptions>
                  </Card>
                </Col>
                <Col xs={24} lg={12}>
                  <Card title="Financial Summary" size="small" style={{ marginBottom: 16 }}>
                    {client.financialSummary ? (
                      <Row gutter={16}>
                        <Col span={12}>
                          <Statistic title="Revenue" value={client.financialSummary.revenue} formatter={(v) => formatCurrency(Number(v))} />
                        </Col>
                        <Col span={12}>
                          <Statistic title="Expenses" value={client.financialSummary.expenses} formatter={(v) => formatCurrency(Number(v))} />
                        </Col>
                        <Col span={12} style={{ marginTop: 16 }}>
                          <Statistic title="Profit" value={client.financialSummary.profit} formatter={(v) => formatCurrency(Number(v))} />
                        </Col>
                        <Col span={12} style={{ marginTop: 16 }}>
                          <Statistic
                            title="Outstanding Invoices"
                            value={client.financialSummary.outstanding_invoices}
                            formatter={(v) => formatCurrency(Number(v))}
                          />
                        </Col>
                      </Row>
                    ) : (
                      <Empty description="No financial data" />
                    )}
                  </Card>
                  {client.notes && (
                    <Card title="Notes" size="small">
                      <Text>{client.notes}</Text>
                    </Card>
                  )}
                </Col>
              </Row>
            ),
          },
          {
            key: 'engagements',
            label: 'Engagements',
            children: (
              <Table
                dataSource={client.engagements || []}
                rowKey="id"
                pagination={false}
                locale={{ emptyText: <Empty description="No engagements" /> }}
                columns={[
                  { title: 'Type', dataIndex: 'type', key: 'type' },
                  {
                    title: 'Status',
                    dataIndex: 'status',
                    key: 'status',
                    render: (s: string) => <Tag color={statusColor[s] || 'default'}>{s}</Tag>,
                  },
                  { title: 'Start', dataIndex: 'start_date', key: 'start', render: formatDate },
                  { title: 'End', dataIndex: 'end_date', key: 'end', render: formatDate },
                  {
                    title: 'Fee',
                    dataIndex: 'fee',
                    key: 'fee',
                    render: (v: number) => formatCurrency(v),
                  },
                ]}
              />
            ),
          },
        ]}
      />
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Clients List (default export)                                      */
/* ------------------------------------------------------------------ */

const ClientsPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [searchText, setSearchText] = useState('');
  const [addForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v2/accountant-portal/clients', { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to load clients');
      const json = await res.json();
      setClients(json.data || []);
    } catch (err) {
      console.error('Clients fetch error:', err);
      message.error('Failed to load clients');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  /* ---------- actions ---------- */
  const handleSwitchToClient = async (clientTenantId: string, clientName: string) => {
    try {
      const res = await fetch(`/api/v2/accountant-portal/switch/${clientTenantId}`, {
        method: 'POST',
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('firmToken', localStorage.getItem('token') || '');
        localStorage.setItem('token', data.data.accessToken);
        localStorage.setItem(
          'accountantClientContext',
          JSON.stringify({
            clientTenantId,
            clientName: data.data.tenant?.name || clientName,
            firmTenantId: data.data.firmTenantId,
          }),
        );
        // Always go to main domain for full ERP access
        const mainDomain = window.location.hostname.startsWith('accountant.')
          ? `https://${window.location.hostname.replace('accountant.', '')}/app`
          : '/app';
        window.location.href = mainDomain;
      } else {
        message.error(data.message || 'Failed to switch to client');
      }
    } catch {
      message.error('Failed to switch to client');
    }
  };

  const handleAddClient = async (values: any) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/v2/accountant-portal/clients', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (json.success) {
        message.success('Client added successfully');
        setAddModalVisible(false);
        addForm.resetFields();
        fetchClients();
      } else {
        message.error(json.message || 'Failed to add client');
      }
    } catch {
      message.error('Failed to add client');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateEngagement = async (values: any) => {
    if (!selectedClient) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/v2/accountant-portal/clients/${selectedClient.tenant_id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (json.success) {
        message.success('Client updated successfully');
        setEditModalVisible(false);
        editForm.resetFields();
        setSelectedClient(null);
        fetchClients();
      } else {
        message.error(json.message || 'Failed to update client');
      }
    } catch {
      message.error('Failed to update client');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveClient = async (clientTenantId: string) => {
    try {
      const res = await fetch(`/api/v2/accountant-portal/clients/${clientTenantId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      const json = await res.json();
      if (json.success) {
        message.success('Client removed');
        fetchClients();
      } else {
        message.error(json.message || 'Failed to remove client');
      }
    } catch {
      message.error('Failed to remove client');
    }
  };

  /* ---------- filter ---------- */
  const filteredClients = clients.filter((c) =>
    !searchText ||
    c.company_name?.toLowerCase().includes(searchText.toLowerCase()) ||
    c.industry?.toLowerCase().includes(searchText.toLowerCase()) ||
    c.assigned_accountant?.toLowerCase().includes(searchText.toLowerCase()),
  );

  /* ---------- columns ---------- */
  const columns: ColumnsType<Client> = [
    {
      title: 'Company',
      dataIndex: 'company_name',
      key: 'company_name',
      sorter: (a, b) => (a.company_name || '').localeCompare(b.company_name || ''),
      render: (name: string, record) => (
        <Space>
          <Avatar size="small" icon={<BankOutlined />} style={{ backgroundColor: '#1890ff' }} />
          <Button
            type="link"
            style={{ padding: 0 }}
            onClick={() => navigate(`/app/accountant-portal/clients/${record.tenant_id}`)}
          >
            {name}
          </Button>
        </Space>
      ),
    },
    {
      title: 'Industry',
      dataIndex: 'industry',
      key: 'industry',
      responsive: ['md'],
      render: (v: string) => v || '—',
    },
    {
      title: 'Engagement',
      dataIndex: 'engagement_type',
      key: 'engagement_type',
      responsive: ['lg'],
      render: (v: string) => v ? <Tag>{v}</Tag> : '—',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      filters: [
        { text: 'Active', value: 'active' },
        { text: 'Onboarding', value: 'onboarding' },
        { text: 'Suspended', value: 'suspended' },
        { text: 'Terminated', value: 'terminated' },
      ],
      onFilter: (val, record) => record.status === val,
      render: (s: string) => <Tag color={statusColor[s] || 'default'}>{s || 'unknown'}</Tag>,
    },
    {
      title: 'Assigned',
      dataIndex: 'assigned_accountant',
      key: 'assigned_accountant',
      responsive: ['xl'],
      render: (v: string) => v || '—',
    },
    {
      title: 'Last Accessed',
      dataIndex: 'last_accessed',
      key: 'last_accessed',
      responsive: ['lg'],
      sorter: (a, b) => new Date(a.last_accessed).getTime() - new Date(b.last_accessed).getTime(),
      render: formatDate,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 180,
      render: (_: any, record) => (
        <Space size="small">
          <Tooltip title="Switch to Client">
            <Button
              type="primary"
              size="small"
              icon={<SwapOutlined />}
              onClick={() => handleSwitchToClient(record.tenant_id, record.company_name)}
            />
          </Tooltip>
          <Tooltip title="Edit Engagement">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => {
                setSelectedClient(record);
                editForm.setFieldsValue({
                  engagement_type: record.engagement_type,
                  status: record.status,
                  assigned_accountant: record.assigned_accountant,
                });
                setEditModalVisible(true);
              }}
            />
          </Tooltip>
          <Popconfirm
            title="Remove this client?"
            description="This will remove the client mapping. The client's data will not be deleted."
            onConfirm={() => handleRemoveClient(record.tenant_id)}
            okText="Remove"
            cancelText="Cancel"
          >
            <Tooltip title="Remove Client">
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            <TeamOutlined style={{ marginRight: 8 }} />
            Clients
          </Title>
        </Col>
        <Col>
          <Space>
            <Input
              placeholder="Search clients…"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
              style={{ width: 250 }}
            />
            <Button icon={<ReloadOutlined />} onClick={fetchClients} />
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddModalVisible(true)}>
              Add Client
            </Button>
          </Space>
        </Col>
      </Row>

      <Card bodyStyle={{ padding: 0 }}>
        <Table
          columns={columns}
          dataSource={filteredClients}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 15, showSizeChanger: true, showTotal: (t) => `${t} client(s)` }}
          locale={{ emptyText: <Empty description="No clients found" /> }}
          scroll={{ x: 800 }}
        />
      </Card>

      {/* ---- Add Client Modal ---- */}
      <Modal
        title="Add Client"
        open={addModalVisible}
        onCancel={() => { setAddModalVisible(false); addForm.resetFields(); }}
        footer={null}
        width={520}
      >
        <Form form={addForm} layout="vertical" onFinish={handleAddClient}>
          <Form.Item
            name="tenant_id"
            label="Client Tenant ID"
            rules={[{ required: true, message: 'Please enter the client tenant ID' }]}
            extra="The tenant ID of an existing company on the platform"
          >
            <Input placeholder="e.g., tenant_abc123" />
          </Form.Item>
          <Form.Item name="engagement_type" label="Engagement Type">
            <Select placeholder="Select engagement type" allowClear>
              <Option value="full_service">Full Service</Option>
              <Option value="tax_only">Tax Only</Option>
              <Option value="bookkeeping">Bookkeeping</Option>
              <Option value="audit">Audit</Option>
              <Option value="advisory">Advisory</Option>
              <Option value="payroll">Payroll</Option>
            </Select>
          </Form.Item>
          <Form.Item name="assigned_accountant" label="Assigned Accountant">
            <Input placeholder="Name of assigned accountant" />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={3} placeholder="Optional notes about this client relationship" />
          </Form.Item>
          <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
            <Space>
              <Button onClick={() => { setAddModalVisible(false); addForm.resetFields(); }}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={submitting}>Add Client</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* ---- Edit Engagement Modal ---- */}
      <Modal
        title={`Edit — ${selectedClient?.company_name || ''}`}
        open={editModalVisible}
        onCancel={() => { setEditModalVisible(false); editForm.resetFields(); setSelectedClient(null); }}
        footer={null}
        width={480}
      >
        <Form form={editForm} layout="vertical" onFinish={handleUpdateEngagement}>
          <Form.Item name="engagement_type" label="Engagement Type">
            <Select placeholder="Select engagement type" allowClear>
              <Option value="full_service">Full Service</Option>
              <Option value="tax_only">Tax Only</Option>
              <Option value="bookkeeping">Bookkeeping</Option>
              <Option value="audit">Audit</Option>
              <Option value="advisory">Advisory</Option>
              <Option value="payroll">Payroll</Option>
            </Select>
          </Form.Item>
          <Form.Item name="status" label="Status">
            <Select>
              <Option value="active">Active</Option>
              <Option value="onboarding">Onboarding</Option>
              <Option value="suspended">Suspended</Option>
              <Option value="terminated">Terminated</Option>
            </Select>
          </Form.Item>
          <Form.Item name="assigned_accountant" label="Assigned Accountant">
            <Input placeholder="Name of assigned accountant" />
          </Form.Item>
          <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
            <Space>
              <Button onClick={() => { setEditModalVisible(false); editForm.resetFields(); setSelectedClient(null); }}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={submitting}>Save Changes</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ClientsPage;
