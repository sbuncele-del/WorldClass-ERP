import React, { useState } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Typography,
  Tag,
  Progress,
  Statistic,
  Table,
  Tabs,
  Badge,
  Space,
  Avatar,
  Timeline,
  Tooltip,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  message,
  Divider,
  List,
} from 'antd';
import {
  TeamOutlined,
  ProjectOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  UserOutlined,
  PlusOutlined,
  RocketOutlined,
  TrophyOutlined,
  FireOutlined,
  BarChartOutlined,
  SettingOutlined,
  BellOutlined,
  StarOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import './PracticeHub.css';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

// Practice stats
const practiceStats = {
  activeClients: 47,
  activeEngagements: 68,
  teamMembers: 12,
  utilization: 78,
  wipValue: 1250000,
  arBalance: 890000,
  monthlyRevenue: 2450000,
  targetRevenue: 3000000,
};

// Active engagements
const activeEngagements = [
  {
    id: 'ENG-001',
    client: 'Stellar Holdings Ltd',
    type: 'Annual Audit',
    partner: 'John Matthews',
    manager: 'Sarah Chen',
    status: 'in-progress',
    progress: 65,
    deadline: '2025-12-31',
    budget: 450000,
    wip: 292500,
    priority: 'high',
  },
  {
    id: 'ENG-002',
    client: 'TechVentures Inc',
    type: 'Tax Planning',
    partner: 'John Matthews',
    manager: 'Michael Brown',
    status: 'in-progress',
    progress: 40,
    deadline: '2025-12-20',
    budget: 125000,
    wip: 50000,
    priority: 'medium',
  },
  {
    id: 'ENG-003',
    client: 'Global Manufacturing',
    type: 'Advisory',
    partner: 'Lisa Wang',
    manager: 'David Kim',
    status: 'review',
    progress: 90,
    deadline: '2025-12-15',
    budget: 280000,
    wip: 252000,
    priority: 'high',
  },
  {
    id: 'ENG-004',
    client: 'Retail Solutions',
    type: 'Monthly Accounting',
    partner: 'Lisa Wang',
    manager: 'Emma Wilson',
    status: 'in-progress',
    progress: 100,
    deadline: '2025-12-10',
    budget: 35000,
    wip: 35000,
    priority: 'low',
  },
  {
    id: 'ENG-005',
    client: 'Fintech Startup',
    type: 'Due Diligence',
    partner: 'John Matthews',
    manager: 'Sarah Chen',
    status: 'pending',
    progress: 0,
    deadline: '2026-01-15',
    budget: 180000,
    wip: 0,
    priority: 'medium',
  },
];

// Team members
const teamMembers = [
  { id: 1, name: 'John Matthews', role: 'Partner', avatar: 'JM', utilization: 85, billable: 142, target: 160, color: '#667eea' },
  { id: 2, name: 'Lisa Wang', role: 'Partner', avatar: 'LW', utilization: 82, billable: 138, target: 160, color: '#764ba2' },
  { id: 3, name: 'Sarah Chen', role: 'Manager', avatar: 'SC', utilization: 92, billable: 152, target: 165, color: '#10b981' },
  { id: 4, name: 'Michael Brown', role: 'Manager', avatar: 'MB', utilization: 75, billable: 128, target: 165, color: '#f59e0b' },
  { id: 5, name: 'David Kim', role: 'Senior', avatar: 'DK', utilization: 88, billable: 145, target: 165, color: '#3b82f6' },
  { id: 6, name: 'Emma Wilson', role: 'Associate', avatar: 'EW', utilization: 65, billable: 110, target: 170, color: '#ec4899' },
];

// Upcoming deadlines
const upcomingDeadlines = [
  { client: 'Retail Solutions', engagement: 'Monthly Accounting', date: '2025-12-10', daysLeft: 0, type: 'urgent' },
  { client: 'Global Manufacturing', engagement: 'Advisory', date: '2025-12-15', daysLeft: 4, type: 'warning' },
  { client: 'TechVentures Inc', engagement: 'Tax Planning', date: '2025-12-20', daysLeft: 9, type: 'normal' },
  { client: 'Stellar Holdings', engagement: 'Annual Audit', date: '2025-12-31', daysLeft: 20, type: 'normal' },
];

const PracticeHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showNewEngagement, setShowNewEngagement] = useState(false);

  const getStatusTag = (status: string) => {
    const configs: Record<string, { color: string; text: string }> = {
      'in-progress': { color: 'blue', text: 'In Progress' },
      'review': { color: 'purple', text: 'In Review' },
      'pending': { color: 'default', text: 'Pending' },
      'completed': { color: 'green', text: 'Completed' },
    };
    const config = configs[status] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const getPriorityTag = (priority: string) => {
    const configs: Record<string, { color: string; icon: React.ReactNode }> = {
      'high': { color: '#ef4444', icon: <FireOutlined /> },
      'medium': { color: '#f59e0b', icon: <ExclamationCircleOutlined /> },
      'low': { color: '#10b981', icon: <CheckCircleOutlined /> },
    };
    const config = configs[priority] || { color: '#64748b', icon: null };
    return (
      <Tag color={config.color} icon={config.icon} style={{ textTransform: 'capitalize' }}>
        {priority}
      </Tag>
    );
  };

  const engagementColumns = [
    {
      title: 'Client / Engagement',
      key: 'client',
      render: (_: any, record: any) => (
        <div>
          <Text strong>{record.client}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>{record.type}</Text>
        </div>
      ),
    },
    {
      title: 'Team',
      key: 'team',
      render: (_: any, record: any) => (
        <div>
          <Text style={{ fontSize: '12px' }}>Partner: {record.partner}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>Manager: {record.manager}</Text>
        </div>
      ),
    },
    {
      title: 'Progress',
      key: 'progress',
      width: 180,
      render: (_: any, record: any) => (
        <div>
          <Progress 
            percent={record.progress} 
            size="small" 
            status={record.progress === 100 ? 'success' : 'active'}
            strokeColor={record.progress >= 80 ? '#10b981' : '#667eea'}
          />
        </div>
      ),
    },
    {
      title: 'WIP',
      key: 'wip',
      render: (_: any, record: any) => (
        <Text strong>R {record.wip.toLocaleString()}</Text>
      ),
    },
    {
      title: 'Deadline',
      key: 'deadline',
      render: (_: any, record: any) => (
        <div>
          <Text>{record.deadline}</Text>
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusTag(status),
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      render: (priority: string) => getPriorityTag(priority),
    },
  ];

  return (
    <div className="practice-hub">
      {/* Header */}
      <div className="hub-header">
        <div className="hub-title-section">
          <div className="practice-logo">
            <RocketOutlined className="logo-icon" />
          </div>
          <div>
            <Title level={2} style={{ margin: 0 }}>Practice Management</Title>
            <Text type="secondary">Engagements, team performance, and billing</Text>
          </div>
        </div>
        <div className="hub-actions">
          <Badge count={3}>
            <Button icon={<BellOutlined />}>Notifications</Button>
          </Badge>
          <Button icon={<BarChartOutlined />}>Reports</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowNewEngagement(true)}>
            New Engagement
          </Button>
        </div>
      </div>

      {/* Practice Performance Banner */}
      <Card className="practice-status-card">
        <Row gutter={24} align="middle">
          <Col span={5}>
            <div className="practice-badge">
              <TrophyOutlined className="practice-icon" />
              <div>
                <Text strong style={{ fontSize: '16px', display: 'block', color: 'white' }}>Practice Performance</Text>
                <Text style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>December 2025</Text>
              </div>
            </div>
          </Col>
          <Col span={4}>
            <Statistic 
              title="Active Clients" 
              value={practiceStats.activeClients}
              valueStyle={{ color: 'white' }}
              prefix={<TeamOutlined />}
            />
          </Col>
          <Col span={4}>
            <Statistic 
              title="Engagements" 
              value={practiceStats.activeEngagements}
              valueStyle={{ color: 'white' }}
              prefix={<ProjectOutlined />}
            />
          </Col>
          <Col span={4}>
            <Statistic 
              title="Team Utilization" 
              value={practiceStats.utilization}
              suffix="%"
              valueStyle={{ color: '#86efac' }}
              prefix={<ClockCircleOutlined />}
            />
          </Col>
          <Col span={4}>
            <Statistic 
              title="WIP Value" 
              value={practiceStats.wipValue}
              prefix="R"
              valueStyle={{ color: '#fbbf24', fontSize: '18px' }}
            />
          </Col>
          <Col span={3}>
            <div style={{ textAlign: 'center' }}>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px', display: 'block' }}>Revenue Target</Text>
              <Progress 
                type="circle" 
                percent={Math.round((practiceStats.monthlyRevenue / practiceStats.targetRevenue) * 100)} 
                width={50}
                strokeColor="#86efac"
                trailColor="rgba(255,255,255,0.2)"
                format={percent => <span style={{ color: 'white', fontSize: '12px' }}>{percent}%</span>}
              />
            </div>
          </Col>
        </Row>
      </Card>

      {/* Main Content Tabs */}
      <Tabs activeKey={activeTab} onChange={setActiveTab} className="hub-tabs">
        <TabPane 
          tab={<span><ProjectOutlined /> Dashboard</span>} 
          key="dashboard"
        >
          <Row gutter={24}>
            {/* Active Engagements */}
            <Col span={16}>
              <Card 
                title="Active Engagements" 
                extra={<Button type="link">View All</Button>}
                className="engagements-card"
              >
                <Table 
                  dataSource={activeEngagements}
                  columns={engagementColumns}
                  rowKey="id"
                  pagination={false}
                  size="middle"
                />
              </Card>
            </Col>

            {/* Side Panel */}
            <Col span={8}>
              {/* Upcoming Deadlines */}
              <Card title="Upcoming Deadlines" className="deadlines-card" style={{ marginBottom: 24 }}>
                <List
                  dataSource={upcomingDeadlines}
                  renderItem={item => (
                    <List.Item className={`deadline-item ${item.type}`}>
                      <div className="deadline-content">
                        <div>
                          <Text strong>{item.client}</Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: '12px' }}>{item.engagement}</Text>
                        </div>
                        <div className="deadline-date">
                          <CalendarOutlined style={{ marginRight: 4 }} />
                          <Text>{item.date}</Text>
                          {item.daysLeft <= 3 && (
                            <Tag color={item.type === 'urgent' ? 'red' : 'orange'} style={{ marginLeft: 8 }}>
                              {item.daysLeft === 0 ? 'Today!' : `${item.daysLeft}d`}
                            </Tag>
                          )}
                        </div>
                      </div>
                    </List.Item>
                  )}
                />
              </Card>

              {/* Quick Stats */}
              <Card title="Billing Summary" className="billing-card">
                <div className="billing-stats">
                  <div className="billing-item">
                    <Text type="secondary">Work in Progress</Text>
                    <Text strong className="amount">R 1,250,000</Text>
                  </div>
                  <Divider style={{ margin: '12px 0' }} />
                  <div className="billing-item">
                    <Text type="secondary">Accounts Receivable</Text>
                    <Text strong className="amount">R 890,000</Text>
                  </div>
                  <Divider style={{ margin: '12px 0' }} />
                  <div className="billing-item">
                    <Text type="secondary">Billed This Month</Text>
                    <Text strong className="amount success">R 2,450,000</Text>
                  </div>
                  <Divider style={{ margin: '12px 0' }} />
                  <div className="billing-item">
                    <Text type="secondary">Collected This Month</Text>
                    <Text strong className="amount">R 2,180,000</Text>
                  </div>
                </div>
              </Card>
            </Col>
          </Row>
        </TabPane>

        <TabPane 
          tab={<span><TeamOutlined /> Team</span>} 
          key="team"
        >
          <div className="team-grid">
            {teamMembers.map(member => (
              <Card key={member.id} className="team-card" hoverable>
                <div className="team-header">
                  <Avatar size={48} style={{ backgroundColor: member.color }}>
                    {member.avatar}
                  </Avatar>
                  <div>
                    <Text strong>{member.name}</Text>
                    <br />
                    <Tag color="blue">{member.role}</Tag>
                  </div>
                </div>
                <Divider style={{ margin: '16px 0' }} />
                <div className="team-stats">
                  <div className="team-stat">
                    <Text type="secondary">Utilization</Text>
                    <Progress 
                      percent={member.utilization} 
                      size="small"
                      strokeColor={member.utilization >= 80 ? '#10b981' : member.utilization >= 60 ? '#f59e0b' : '#ef4444'}
                    />
                  </div>
                  <div className="team-stat">
                    <Text type="secondary">Billable Hours</Text>
                    <div className="hours-display">
                      <Text strong>{member.billable}</Text>
                      <Text type="secondary"> / {member.target} hrs</Text>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabPane>

        <TabPane 
          tab={<span><DollarOutlined /> Billing</span>} 
          key="billing"
        >
          <Card>
            <Paragraph>Time & billing, invoicing, and collections management.</Paragraph>
          </Card>
        </TabPane>

        <TabPane 
          tab={<span><FileTextOutlined /> Reports</span>} 
          key="reports"
        >
          <Card>
            <Paragraph>Practice analytics, utilization reports, and KPIs.</Paragraph>
          </Card>
        </TabPane>

        <TabPane 
          tab={<span><SettingOutlined /> Settings</span>} 
          key="settings"
        >
          <Card title="Practice Settings">
            <Form layout="vertical" style={{ maxWidth: 500 }}>
              <Form.Item label="Default Billing Rate (per hour)">
                <Input prefix="R" defaultValue="1500" />
              </Form.Item>
              <Form.Item label="Utilization Target (%)">
                <Input suffix="%" defaultValue="80" />
              </Form.Item>
              <Form.Item label="Invoice Terms">
                <Select defaultValue="30">
                  <Select.Option value="15">Net 15</Select.Option>
                  <Select.Option value="30">Net 30</Select.Option>
                  <Select.Option value="45">Net 45</Select.Option>
                  <Select.Option value="60">Net 60</Select.Option>
                </Select>
              </Form.Item>
              <Button type="primary">Save Settings</Button>
            </Form>
          </Card>
        </TabPane>
      </Tabs>

      {/* New Engagement Modal */}
      <Modal
        title="Create New Engagement"
        open={showNewEngagement}
        onCancel={() => setShowNewEngagement(false)}
        footer={[
          <Button key="cancel" onClick={() => setShowNewEngagement(false)}>Cancel</Button>,
          <Button key="create" type="primary" onClick={() => { message.success('Engagement created'); setShowNewEngagement(false); }}>
            Create Engagement
          </Button>
        ]}
        width={600}
      >
        <Form layout="vertical">
          <Form.Item label="Client" required>
            <Select placeholder="Select client">
              <Select.Option value="stellar">Stellar Holdings Ltd</Select.Option>
              <Select.Option value="tech">TechVentures Inc</Select.Option>
              <Select.Option value="global">Global Manufacturing</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label="Engagement Type" required>
            <Select placeholder="Select type">
              <Select.Option value="audit">Annual Audit</Select.Option>
              <Select.Option value="tax">Tax Planning</Select.Option>
              <Select.Option value="advisory">Advisory</Select.Option>
              <Select.Option value="accounting">Monthly Accounting</Select.Option>
            </Select>
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Partner">
                <Select placeholder="Assign partner">
                  <Select.Option value="jm">John Matthews</Select.Option>
                  <Select.Option value="lw">Lisa Wang</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Manager">
                <Select placeholder="Assign manager">
                  <Select.Option value="sc">Sarah Chen</Select.Option>
                  <Select.Option value="mb">Michael Brown</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Budget">
                <Input prefix="R" placeholder="Enter budget" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Deadline">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default PracticeHub;
