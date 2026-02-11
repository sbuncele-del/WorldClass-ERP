import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../../services/api';
import { practiceService } from '../../../services/practice.service';
import {
  Card,
  Row,
  Col,
  Button,
  Typography,
  Input,
  Table,
  Tag,
  Modal,
  Form,
  Select,
  DatePicker,
  Tabs,
  Avatar,
  Progress,
  Statistic,
  Badge,
  Dropdown,
  Tooltip,
  Space,
  message,
  Drawer,
  Timeline,
  Divider,
  List,
  Spin,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  BankOutlined,
  TeamOutlined,
  FileTextOutlined,
  CalendarOutlined,
  DollarOutlined,
  MoreOutlined,
  EditOutlined,
  EyeOutlined,
  MailOutlined,
  PhoneOutlined,
  GlobalOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  FileProtectOutlined,
  AuditOutlined,
  CalculatorOutlined,
  SolutionOutlined,
  FolderOutlined,
  UserOutlined,
  RiseOutlined,
  StarOutlined,
  StarFilled,
  ProjectOutlined,
  HistoryOutlined,
  MessageOutlined,
} from '@ant-design/icons';
import './ClientManagement.css';

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;
const { Option } = Select;

const ClientManagement: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [clientsData, setClientsData] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEngagementModalOpen, setIsEngagementModalOpen] = useState(false);
  const [isProfileDrawerOpen, setIsProfileDrawerOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [searchText, setSearchText] = useState('');
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [form] = Form.useForm();
  const [engagementForm] = Form.useForm();
  const [editingClient, setEditingClient] = useState<any>(null);
  const [clientEngagements, setClientEngagements] = useState<any[]>([]);
  const [clientInteractions, setClientInteractions] = useState<any[]>([]);
  const [summaryStats, setSummaryStats] = useState({ total: 0, activeEngagements: 0, revenueYTD: 0, outstanding: 0 });

  const fetchClients = async () => {
    setLoading(true);
    try {
      // Fetch customers from Sales module (shared client base)
      const res = await apiClient.get('/api/sales/customers', { params: { limit: 200 } }).catch(() => ({ data: { customers: [] } }));
      const list = res.data?.customers || res.data?.data || [];
      if (Array.isArray(list)) {
        // Map Sales customer fields to the expected client shape
        const mapped = list.map((c: any) => ({
          id: c.id || c.customer_id,
          name: c.company_name || c.customer_name || c.name || 'Unknown',
          type: c.customer_type || c.type || 'Corporation',
          industry: c.industry || '—',
          status: c.status || 'Active',
          tier: c.tier || 'Growth',
          contactName: c.contact_person || c.contact_name || '—',
          contactEmail: c.email || '—',
          contactPhone: c.phone || '—',
          annualRevenue: Number(c.annual_revenue || 0),
          yearEnd: c.year_end || '—',
          services: c.services || [],
          lastContact: c.updated_at || c.last_contact || '—',
          billedYTD: Number(c.billed_ytd || 0),
          outstanding: Number(c.outstanding || c.balance || 0),
          healthScore: Number(c.health_score || 0),
          starred: c.starred || false,
          entities: Number(c.entities || 1),
          employees: Number(c.employees || 0),
        }));
        setClientsData(mapped);
        setSummaryStats({
          total: mapped.length,
          activeEngagements: mapped.filter((c: any) => c.status === 'Active').length,
          revenueYTD: mapped.reduce((s: number, c: any) => s + c.billedYTD, 0),
          outstanding: mapped.reduce((s: number, c: any) => s + c.outstanding, 0),
        });
      }
    } catch (err) {
      console.error('Error fetching clients:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchClientDetails = async (clientId: string) => {
    try {
      // Fetch linked projects/engagements
      const projRes = await apiClient.get('/api/v2/practice/projects', { params: { customer_id: clientId } }).catch(() => ({ data: { data: [] } }));
      const projList = projRes.data?.data || projRes.data?.projects || [];
      setClientEngagements(Array.isArray(projList) ? projList : []);

      // Fetch interactions
      const intRes = await apiClient.get('/api/v2/practice/interactions', { params: { client_id: clientId } }).catch(() => ({ data: { data: [] } }));
      const intList = intRes.data?.data || intRes.data?.interactions || [];
      setClientInteractions(Array.isArray(intList) ? intList : []);
    } catch (err) {
      console.error('Error fetching client details:', err);
    }
  };

  useEffect(() => { fetchClients(); }, []);

  const openClientProfile = (client: any) => {
    setSelectedClient(client);
    setIsProfileDrawerOpen(true);
    fetchClientDetails(client.id);
  };

  const openNewEngagement = (client: any) => {
    setSelectedClient(client);
    engagementForm.setFieldsValue({ clientName: client.name });
    setIsEngagementModalOpen(true);
  };

  const openEditClient = (client: any) => {
    setEditingClient(client);
    form.setFieldsValue({
      name: client.name,
      type: client.type,
      industry: client.industry !== '—' ? client.industry : undefined,
      tier: client.tier,
      contactName: client.contactName !== '—' ? client.contactName : undefined,
      contactEmail: client.contactEmail !== '—' ? client.contactEmail : undefined,
      phone: client.contactPhone !== '—' ? client.contactPhone : undefined,
      yearEnd: client.yearEnd !== '—' ? client.yearEnd : undefined,
      annualRevenue: client.annualRevenue || undefined,
      employees: client.employees || undefined,
      services: client.services || [],
    });
    setIsModalOpen(true);
  };

  const handleDeleteClient = async (client: any) => {
    const confirmed = window.confirm(`Are you sure you want to delete "${client.name}"? This action cannot be undone.`);
    if (!confirmed) return;
    try {
      await practiceService.deleteClient(client.id);
      message.success('Client deleted successfully');
      fetchClients();
    } catch (err) {
      message.error('Failed to delete client');
    }
  };

  const handleSaveClient = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        company_name: values.name,
        customer_type: values.type,
        industry: values.industry,
        tier: values.tier,
        contact_person: values.contactName,
        email: values.contactEmail,
        phone: values.phone,
        year_end: values.yearEnd,
        annual_revenue: values.annualRevenue,
        employees: values.employees,
        services: values.services,
      };
      if (editingClient) {
        await practiceService.updateClient(editingClient.id, payload);
        message.success('Client updated successfully');
      } else {
        await practiceService.createClient(payload);
        message.success('Client added successfully');
      }
      setIsModalOpen(false);
      setEditingClient(null);
      form.resetFields();
      fetchClients();
    } catch (err: any) {
      if (err.errorFields) return;
      message.error(editingClient ? 'Failed to update client' : 'Failed to add client');
    }
  };

  const filteredClients = clientsData.filter(client => {
    const matchesSearch = (client.name || '').toLowerCase().includes(searchText.toLowerCase()) ||
      (client.contactName || '').toLowerCase().includes(searchText.toLowerCase());
    const matchesTier = !selectedTier || client.tier === selectedTier;
    const matchesStatus = !selectedStatus || client.status === selectedStatus;
    return matchesSearch && matchesTier && matchesStatus;
  });

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Enterprise': return 'gold';
      case 'Premium': return 'purple';
      case 'Growth': return 'blue';
      case 'Starter': return 'default';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'success';
      case 'Prospect': return 'processing';
      case 'Inactive': return 'default';
      case 'At Risk': return 'error';
      default: return 'default';
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  };

  const columns = [
    {
      title: '',
      key: 'starred',
      width: 40,
      render: (record: any) => (
        <Button
          type="text"
          icon={record.starred ? <StarFilled style={{ color: '#fbbf24' }} /> : <StarOutlined />}
          size="small"
        />
      ),
    },
    {
      title: 'Client',
      key: 'client',
      render: (record: any) => (
        <div className="client-cell">
          <Avatar
            size={40}
            style={{ background: record.status === 'Active' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#94a3b8' }}
          >
            {record.name.charAt(0)}
          </Avatar>
          <div className="client-info">
            <Text strong>{record.name}</Text>
            <div className="client-meta">
              <Tag color={getTierColor(record.tier)} style={{ marginRight: 4 }}>{record.tier}</Tag>
              <Badge status={getStatusColor(record.status) as any} text={record.status} />
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Industry',
      dataIndex: 'industry',
      key: 'industry',
    },
    {
      title: 'Contact',
      key: 'contact',
      render: (record: any) => (
        <div className="contact-cell">
          <Text>{record.contactName}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{record.contactEmail}</Text>
        </div>
      ),
    },
    {
      title: 'Services',
      key: 'services',
      render: (record: any) => (
        <Space wrap size={[4, 4]}>
          {record.services.slice(0, 2).map((service: string, i: number) => (
            <Tag key={i}>{service}</Tag>
          ))}
          {record.services.length > 2 && <Tag>+{record.services.length - 2}</Tag>}
        </Space>
      ),
    },
    {
      title: 'Next Deadline',
      key: 'deadline',
      render: (record: any) => (
        <div className="deadline-cell">
          <Text>{record.nextDeadline}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{record.deadlineType}</Text>
        </div>
      ),
    },
    {
      title: 'Health',
      key: 'health',
      width: 100,
      render: (record: any) => (
        record.healthScore > 0 ? (
          <Progress
            percent={record.healthScore}
            size="small"
            strokeColor={getHealthColor(record.healthScore)}
            format={(percent) => `${percent}`}
          />
        ) : (
          <Text type="secondary">—</Text>
        )
      ),
    },
    {
      title: 'YTD Billed',
      key: 'billed',
      render: (record: any) => (
        <Text strong style={{ color: record.billedYTD > 0 ? '#10b981' : undefined }}>
          R {record.billedYTD.toLocaleString('en-ZA')}
        </Text>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 50,
      render: (record: any) => (
        <Dropdown
          menu={{
            items: [
              { key: 'view', icon: <EyeOutlined />, label: 'View Profile', onClick: () => openClientProfile(record) },
              { key: 'edit', icon: <EditOutlined />, label: 'Edit Client', onClick: () => openEditClient(record) },
              { key: 'email', icon: <MailOutlined />, label: 'Send Email' },
              { type: 'divider' },
              { key: 'engagement', icon: <FileTextOutlined />, label: 'New Engagement', onClick: () => openNewEngagement(record) },
              { key: 'task', icon: <CheckCircleOutlined />, label: 'Add Task' },
              { type: 'divider' },
              { key: 'delete', icon: <DeleteOutlined />, label: 'Delete Client', danger: true, onClick: () => handleDeleteClient(record) },
            ],
          }}
          trigger={['click']}
        >
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
      ),
    },
  ];

  return (
    <div className="client-management-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <Title level={2}>Client Management</Title>
          <Text type="secondary">Manage your client portfolio and engagements</Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="large"
          onClick={() => { setEditingClient(null); form.resetFields(); setIsModalOpen(true); }}
        >
          Add Client
        </Button>
      </div>

      {/* Stats */}
      <Row gutter={16} className="stats-row">
        <Col span={6}>
          <Card className="stat-card">
            <Statistic
              title="Total Clients"
              value={summaryStats.total}
              prefix={<BankOutlined />}
              valueStyle={{ color: '#667eea' }}
            />
            <div className="stat-trend">
              <RiseOutlined style={{ color: '#10b981' }} />
              <span style={{ color: '#10b981' }}>From Sales & CRM</span>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card">
            <Statistic
              title="Active Clients"
              value={summaryStats.activeEngagements}
              prefix={<FileProtectOutlined />}
              valueStyle={{ color: '#764ba2' }}
            />
            <div className="stat-trend">
              <span style={{ color: '#64748b' }}>Active status</span>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card">
            <Statistic
              title="Revenue YTD"
              value={summaryStats.revenueYTD}
              prefix="R"
              valueStyle={{ color: '#10b981' }}
              formatter={(value) => `${Number(value).toLocaleString('en-ZA')}`}
            />
            <div className="stat-trend">
              <RiseOutlined style={{ color: '#10b981' }} />
              <span style={{ color: '#10b981' }}>Year to date</span>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card">
            <Statistic
              title="Outstanding"
              value={summaryStats.outstanding}
              prefix="R"
              valueStyle={{ color: '#f59e0b' }}
              formatter={(value) => `${Number(value).toLocaleString('en-ZA')}`}
            />
            <div className="stat-trend">
              <span style={{ color: '#64748b' }}>Balance outstanding</span>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Main Content */}
      <Row gutter={24}>
        {/* Client List */}
        <Col span={17}>
          <Card className="clients-card">
            <div className="card-header">
              <Search
                placeholder="Search clients..."
                allowClear
                style={{ width: 300 }}
                onChange={(e) => setSearchText(e.target.value)}
              />
              <Space>
                <Select
                  placeholder="Tier"
                  allowClear
                  style={{ width: 120 }}
                  onChange={setSelectedTier}
                >
                  <Option value="Enterprise">Enterprise</Option>
                  <Option value="Premium">Premium</Option>
                  <Option value="Growth">Growth</Option>
                  <Option value="Starter">Starter</Option>
                </Select>
                <Select
                  placeholder="Status"
                  allowClear
                  style={{ width: 120 }}
                  onChange={setSelectedStatus}
                >
                  <Option value="Active">Active</Option>
                  <Option value="Prospect">Prospect</Option>
                  <Option value="At Risk">At Risk</Option>
                  <Option value="Inactive">Inactive</Option>
                </Select>
              </Space>
            </div>
            <Table
              columns={columns}
              dataSource={filteredClients}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              className="clients-table"
            />
          </Card>
        </Col>

        {/* Sidebar */}
        <Col span={7}>
          {/* Upcoming Deadlines */}
          <Card className="deadlines-card" title={<><CalendarOutlined /> Quick Navigation</>}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button block icon={<ProjectOutlined />} onClick={() => navigate(
                (window.location.pathname.startsWith('/app/practice-hub') ? '/app/practice-hub' : '/app/practice') + '/engagements'
              )}>
                View Engagements
              </Button>
              <Button block icon={<ClockCircleOutlined />} onClick={() => navigate(
                (window.location.pathname.startsWith('/app/practice-hub') ? '/app/practice-hub' : '/app/practice') + '/time-tracking'
              )}>
                Time Tracking
              </Button>
              <Button block icon={<DollarOutlined />} onClick={() => navigate('/app/sales-hub/invoices')}>
                Sales Invoices
              </Button>
              <Button block icon={<TeamOutlined />} onClick={() => navigate('/app/sales-hub/customers')}>
                Sales Customers
              </Button>
            </Space>
          </Card>

          {/* Quick Actions */}
          <Card className="quick-actions-card" title="Quick Actions">
            <div className="actions-grid">
              <Button icon={<AuditOutlined />} block>New Audit</Button>
              <Button icon={<CalculatorOutlined />} block>Tax Return</Button>
              <Button icon={<SolutionOutlined />} block>Advisory</Button>
              <Button icon={<FolderOutlined />} block>Documents</Button>
            </div>
          </Card>

          {/* Cross-Module Info */}
          <Card className="services-card" title="Practice Info">
            <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
              Clients are shared with the Sales & CRM module. Adding a client here also creates a Sales customer.
            </Text>
            <Divider style={{ margin: '12px 0' }} />
            <Text type="secondary">
              Use the Engagements page to create project engagements for clients, and Time Tracking to log billable hours.
            </Text>
          </Card>
        </Col>
      </Row>

      {/* Add/Edit Client Modal */}
      <Modal
        title={editingClient ? 'Edit Client' : 'Add New Client'}
        open={isModalOpen}
        onCancel={() => { setIsModalOpen(false); setEditingClient(null); form.resetFields(); }}
        footer={null}
        width={700}
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Client Name" name="name" rules={[{ required: true }]}>
                <Input placeholder="e.g., Acme Corporation" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Entity Type" name="type" rules={[{ required: true }]}>
                <Select placeholder="Select type">
                  <Option value="Corporation">Corporation</Option>
                  <Option value="Partnership">Partnership</Option>
                  <Option value="LLC">LLC</Option>
                  <Option value="Sole Proprietor">Sole Proprietor</Option>
                  <Option value="Non-Profit">Non-Profit</Option>
                  <Option value="Trust">Trust</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Industry" name="industry" rules={[{ required: true }]}>
                <Select placeholder="Select industry">
                  <Option value="Manufacturing">Manufacturing</Option>
                  <Option value="Financial Services">Financial Services</Option>
                  <Option value="Technology">Technology</Option>
                  <Option value="Healthcare">Healthcare</Option>
                  <Option value="Retail">Retail</Option>
                  <Option value="Real Estate">Real Estate</Option>
                  <Option value="Professional Services">Professional Services</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Client Tier" name="tier" rules={[{ required: true }]}>
                <Select placeholder="Select tier">
                  <Option value="Enterprise">Enterprise</Option>
                  <Option value="Premium">Premium</Option>
                  <Option value="Growth">Growth</Option>
                  <Option value="Starter">Starter</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Primary Contact Name" name="contactName">
                <Input placeholder="Full name" prefix={<UserOutlined />} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Contact Email" name="contactEmail">
                <Input placeholder="email@company.com" prefix={<MailOutlined />} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Phone" name="phone">
                <Input placeholder="+1 (555) 000-0000" prefix={<PhoneOutlined />} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Year End" name="yearEnd">
                <Select placeholder="Select month">
                  {['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                    <Option key={m} value={m}>{m}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Annual Revenue" name="annualRevenue">
                <Input placeholder="$0" prefix={<DollarOutlined />} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Number of Employees" name="employees">
                <Input placeholder="0" prefix={<TeamOutlined />} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Services Required" name="services">
            <Select mode="multiple" placeholder="Select services">
              <Option value="Annual Audit">Annual Audit</Option>
              <Option value="Quarterly Review">Quarterly Review</Option>
              <Option value="Tax Planning">Tax Planning</Option>
              <Option value="Tax Filing">Tax Filing</Option>
              <Option value="Bookkeeping">Bookkeeping</Option>
              <Option value="Payroll">Payroll</Option>
              <Option value="Advisory">Advisory Services</Option>
              <Option value="R&D Credits">R&D Tax Credits</Option>
              <Option value="Transfer Pricing">Transfer Pricing</Option>
            </Select>
          </Form.Item>
          <div className="modal-actions">
            <Button onClick={() => { setIsModalOpen(false); setEditingClient(null); form.resetFields(); }}>Cancel</Button>
            <Button type="primary" onClick={handleSaveClient}>
              {editingClient ? 'Update Client' : 'Add Client'}
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Client Profile Drawer */}
      <Drawer
        title={null}
        placement="right"
        width={680}
        onClose={() => setIsProfileDrawerOpen(false)}
        open={isProfileDrawerOpen}
        className="client-profile-drawer"
      >
        {selectedClient && (
          <div className="client-profile">
            {/* Header */}
            <div className="profile-header">
              <Avatar
                size={64}
                style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
              >
                {selectedClient.name.charAt(0)}
              </Avatar>
              <div className="profile-header-info">
                <Title level={4} style={{ margin: 0 }}>{selectedClient.name}</Title>
                <Space>
                  <Tag color={getTierColor(selectedClient.tier)}>{selectedClient.tier}</Tag>
                  <Badge status={getStatusColor(selectedClient.status) as any} text={selectedClient.status} />
                </Space>
              </div>
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={() => openNewEngagement(selectedClient)}
              >
                New Engagement
              </Button>
            </div>

            {/* Quick Stats */}
            <Row gutter={16} className="profile-stats">
              <Col span={6}>
                <Statistic title="YTD Billed" value={selectedClient.billedYTD} prefix="R" valueStyle={{ fontSize: 18 }} />
              </Col>
              <Col span={6}>
                <Statistic title="Outstanding" value={selectedClient.outstanding} prefix="R" valueStyle={{ fontSize: 18, color: selectedClient.outstanding > 0 ? '#f59e0b' : undefined }} />
              </Col>
              <Col span={6}>
                <Statistic title="Health Score" value={selectedClient.healthScore || '—'} suffix={selectedClient.healthScore ? '/100' : ''} valueStyle={{ fontSize: 18, color: getHealthColor(selectedClient.healthScore) }} />
              </Col>
              <Col span={6}>
                <Statistic title="Entities" value={selectedClient.entities} valueStyle={{ fontSize: 18 }} />
              </Col>
            </Row>

            <Divider />

            {/* Tabs */}
            <Tabs
              defaultActiveKey="engagements"
              items={[
                {
                  key: 'engagements',
                  label: <><ProjectOutlined /> Engagements ({clientEngagements.length})</>,
                  children: (
                    <div className="engagements-list">
                      {clientEngagements.length === 0 ? (
                        <div className="empty-engagements">
                          <FileTextOutlined style={{ fontSize: 48, color: '#d1d5db' }} />
                          <Text type="secondary">No engagements yet</Text>
                          <Button type="primary" icon={<PlusOutlined />} onClick={() => openNewEngagement(selectedClient)}>
                            Create First Engagement
                          </Button>
                        </div>
                      ) : (
                        <List
                          dataSource={clientEngagements}
                          renderItem={(item: any) => (
                            <List.Item className="engagement-item">
                              <div className="engagement-info">
                                <div className="engagement-header">
                                  <Text strong>{item.project_name || item.name}</Text>
                                  <Tag color={
                                    (item.status || '').toLowerCase() === 'active' || (item.status || '').toLowerCase() === 'in_progress' ? 'blue' :
                                    (item.status || '').toLowerCase() === 'completed' ? 'green' :
                                    (item.status || '').toLowerCase() === 'planning' ? 'orange' : 'default'
                                  }>{(item.status || 'Active').replace(/_/g, ' ')}</Tag>
                                </div>
                                <div className="engagement-meta">
                                  <Text type="secondary">{item.project_type || item.type || '—'}</Text>
                                </div>
                                <Progress 
                                  percent={Number(item.progress || item.completion_percentage || 0)} 
                                  size="small" 
                                  strokeColor={{ '0%': '#667eea', '100%': '#764ba2' }}
                                />
                                <div className="engagement-stats">
                                  <span><DollarOutlined /> R {Number(item.budget || 0).toLocaleString('en-ZA')} budget</span>
                                </div>
                              </div>
                            </List.Item>
                          )}
                        />
                      )}
                    </div>
                  ),
                },
                {
                  key: 'interactions',
                  label: <><HistoryOutlined /> Recent Activity</>,
                  children: (
                    <Timeline
                      items={clientInteractions.map((item: any) => ({
                        color: (item.interaction_type || item.type) === 'Call' ? 'blue' : (item.interaction_type || item.type) === 'Meeting' ? 'green' : 'gray',
                        children: (
                          <div className="interaction-item">
                            <div className="interaction-header">
                              <Tag>{item.interaction_type || item.type}</Tag>
                              <Text type="secondary">{(item.interaction_date || item.date || '').slice(0, 10)}</Text>
                            </div>
                            <Text>{item.notes || item.summary || '—'}</Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>by {item.employee_name || item.employee || '—'}</Text>
                          </div>
                        ),
                      }))}
                    />
                  ),
                },
                {
                  key: 'contacts',
                  label: <><UserOutlined /> Contacts</>,
                  children: (
                    <div className="contact-details">
                      <Card size="small">
                        <div className="contact-row">
                          <UserOutlined />
                          <div>
                            <Text strong>{selectedClient.contactName}</Text>
                            <Text type="secondary" style={{ display: 'block' }}>Primary Contact</Text>
                          </div>
                        </div>
                        <Divider style={{ margin: '12px 0' }} />
                        <div className="contact-row">
                          <MailOutlined />
                          <Text>{selectedClient.contactEmail}</Text>
                        </div>
                        <div className="contact-row">
                          <PhoneOutlined />
                          <Text>{selectedClient.contactPhone}</Text>
                        </div>
                      </Card>
                    </div>
                  ),
                },
              ]}
            />
          </div>
        )}
      </Drawer>

      {/* New Engagement Modal */}
      <Modal
        title={<><ProjectOutlined /> New Engagement for {selectedClient?.name}</>}
        open={isEngagementModalOpen}
        onCancel={() => setIsEngagementModalOpen(false)}
        footer={null}
        width={600}
      >
        <Form form={engagementForm} layout="vertical">
          <Form.Item label="Engagement Name" name="engagementName" rules={[{ required: true }]}>
            <Input placeholder="e.g., 2024 Annual Audit" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Engagement Type" name="engagementType" rules={[{ required: true }]}>
                <Select placeholder="Select type">
                  <Option value="Audit">Audit</Option>
                  <Option value="Review">Review</Option>
                  <Option value="Tax">Tax Services</Option>
                  <Option value="Advisory">Advisory</Option>
                  <Option value="Compliance">Compliance</Option>
                  <Option value="Consulting">Consulting</Option>
                  <Option value="Recurring">Recurring Service</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Project Manager" name="manager" rules={[{ required: true }]}>
                <Select placeholder="Select manager">
                  <Option value="john">John Smith</Option>
                  <Option value="sarah">Sarah Lee</Option>
                  <Option value="michael">Michael Brown</Option>
                  <Option value="emily">Emily Chen</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Start Date" name="startDate">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Target End Date" name="endDate">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Budget Hours" name="budgetHours">
                <Input type="number" placeholder="0" suffix="hours" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Budget Amount" name="budgetAmount">
                <Input prefix="R" placeholder="0" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Description" name="description">
            <Input.TextArea rows={3} placeholder="Engagement scope and deliverables..." />
          </Form.Item>
          <div className="modal-actions">
            <Button onClick={() => setIsEngagementModalOpen(false)}>Cancel</Button>
            <Button type="primary" onClick={async () => {
              try {
                const values = await engagementForm.validateFields();
                await apiClient.post('/api/v2/practice/projects', {
                  project_name: values.engagementName,
                  customer_id: selectedClient?.id,
                  project_type: values.engagementType,
                  start_date: values.startDate?.format('YYYY-MM-DD'),
                  end_date: values.endDate?.format('YYYY-MM-DD'),
                  budget: Number(values.budgetAmount || 0),
                  budget_hours: Number(values.budgetHours || 0),
                  description: values.description,
                  status: 'planning',
                });
                message.success('Engagement created and linked to client');
                setIsEngagementModalOpen(false);
                engagementForm.resetFields();
                if (selectedClient) fetchClientDetails(selectedClient.id);
              } catch (err: any) {
                if (err.errorFields) return;
                message.error('Failed to create engagement');
              }
            }}>
              Create Engagement
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default ClientManagement;
