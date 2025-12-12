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
  Space,
  Tooltip,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  message,
  Divider,
  List,
  Alert,
  Badge,
  Avatar,
} from 'antd';
import {
  ShoppingCartOutlined,
  UserOutlined,
  FileTextOutlined,
  BarChartOutlined,
  PieChartOutlined,
  RiseOutlined,
  FallOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  PlusOutlined,
  DownloadOutlined,
  PrinterOutlined,
  SyncOutlined,
  SettingOutlined,
  CalendarOutlined,
  PhoneOutlined,
  MailOutlined,
  DollarOutlined,
  TeamOutlined,
  TrophyOutlined,
  LineChartOutlined,
  StarOutlined,
} from '@ant-design/icons';
import {
  HubLayout,
  HubHeader,
  StatusBanner,
  HubTabs,
  StatCard,
  QuickActionsCard,
  StatusIndicator,
  ProgressCard,
} from '../../components/hub';

const { Title, Text, Paragraph } = Typography;

// Sales Statistics
const salesStats = {
  totalSales: 18500000,
  pipelineValue: 42000000,
  quotesOpen: 28,
  ordersThisMonth: 145,
  avgDealSize: 320000,
  winRate: 68,
  targetProgress: 78,
  targetAmount: 24000000,
};

// Pipeline by Stage
const pipelineStages = [
  { stage: 'Lead', count: 45, value: 8500000, color: '#667eea' },
  { stage: 'Qualified', count: 28, value: 12000000, color: '#06b6d4' },
  { stage: 'Proposal', count: 15, value: 9500000, color: '#f59e0b' },
  { stage: 'Negotiation', count: 8, value: 7000000, color: '#ec4899' },
  { stage: 'Won', count: 12, value: 5000000, color: '#10b981' },
];

// Top Customers
const topCustomers = [
  { name: 'Sasol Limited', revenue: 4500000, orders: 24, segment: 'Energy', avatar: 'S' },
  { name: 'Vodacom Group', revenue: 3200000, orders: 18, segment: 'Telecom', avatar: 'V' },
  { name: 'Pick n Pay', revenue: 2800000, orders: 32, segment: 'Retail', avatar: 'P' },
  { name: 'Standard Bank', revenue: 2500000, orders: 15, segment: 'Banking', avatar: 'S' },
  { name: 'Discovery Health', revenue: 2100000, orders: 12, segment: 'Healthcare', avatar: 'D' },
];

// Recent Quotes
const recentQuotes = [
  {
    id: 'QT-2025-0892',
    customer: 'Eskom Holdings',
    amount: 1250000,
    validUntil: '2025-12-25',
    status: 'sent',
    daysLeft: 14,
  },
  {
    id: 'QT-2025-0891',
    customer: 'Netcare Limited',
    amount: 890000,
    validUntil: '2025-12-20',
    status: 'viewed',
    daysLeft: 9,
  },
  {
    id: 'QT-2025-0890',
    customer: 'MTN Group',
    amount: 2150000,
    validUntil: '2025-12-18',
    status: 'accepted',
    daysLeft: 7,
  },
  {
    id: 'QT-2025-0889',
    customer: 'Shoprite Holdings',
    amount: 675000,
    validUntil: '2025-12-15',
    status: 'expired',
    daysLeft: 0,
  },
];

// Recent Orders
const recentOrders = [
  {
    id: 'SO-2025-4521',
    customer: 'Sasol Limited',
    amount: 450000,
    date: '2025-12-11',
    status: 'processing',
    items: 8,
  },
  {
    id: 'SO-2025-4520',
    customer: 'Standard Bank',
    amount: 125000,
    date: '2025-12-10',
    status: 'shipped',
    items: 3,
  },
  {
    id: 'SO-2025-4519',
    customer: 'Vodacom Group',
    amount: 890000,
    date: '2025-12-10',
    status: 'delivered',
    items: 12,
  },
  {
    id: 'SO-2025-4518',
    customer: 'Pick n Pay',
    amount: 235000,
    date: '2025-12-09',
    status: 'invoiced',
    items: 5,
  },
];

// Sales Team Performance
const salesTeam = [
  { name: 'Sarah Chen', target: 5000000, achieved: 4200000, deals: 18, winRate: 72 },
  { name: 'Michael Brown', target: 4500000, achieved: 3800000, deals: 15, winRate: 65 },
  { name: 'Thandi Nkosi', target: 4000000, achieved: 3500000, deals: 22, winRate: 78 },
  { name: 'David Williams', target: 3500000, achieved: 2900000, deals: 12, winRate: 58 },
];

const SalesHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);

  const formatCurrency = (amount: number) => `R ${amount.toLocaleString('en-ZA')}`;

  const getStatusTag = (status: string) => {
    const configs: Record<string, { color: string; text: string; icon?: React.ReactNode }> = {
      'sent': { color: 'blue', text: 'Sent', icon: <MailOutlined /> },
      'viewed': { color: 'purple', text: 'Viewed' },
      'accepted': { color: 'green', text: 'Accepted', icon: <CheckCircleOutlined /> },
      'expired': { color: 'red', text: 'Expired' },
      'processing': { color: 'blue', text: 'Processing', icon: <SyncOutlined spin /> },
      'shipped': { color: 'cyan', text: 'Shipped' },
      'delivered': { color: 'green', text: 'Delivered', icon: <CheckCircleOutlined /> },
      'invoiced': { color: 'purple', text: 'Invoiced' },
    };
    const config = configs[status] || { color: 'default', text: status };
    return <Tag color={config.color} icon={config.icon}>{config.text}</Tag>;
  };

  const quoteColumns = [
    {
      title: 'Quote #',
      dataIndex: 'id',
      key: 'id',
      render: (text: string) => <Text strong style={{ color: '#667eea' }}>{text}</Text>,
    },
    {
      title: 'Customer',
      dataIndex: 'customer',
      key: 'customer',
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (v: number) => <Text strong>{formatCurrency(v)}</Text>,
    },
    {
      title: 'Valid Until',
      dataIndex: 'validUntil',
      key: 'validUntil',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusTag(status),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: typeof recentQuotes[0]) => (
        <Space>
          <Button type="link" size="small">View</Button>
          {record.status !== 'accepted' && record.status !== 'expired' && (
            <Button type="link" size="small">Convert to Order</Button>
          )}
        </Space>
      ),
    },
  ];

  const orderColumns = [
    {
      title: 'Order #',
      dataIndex: 'id',
      key: 'id',
      render: (text: string) => <Text strong style={{ color: '#10b981' }}>{text}</Text>,
    },
    {
      title: 'Customer',
      dataIndex: 'customer',
      key: 'customer',
    },
    {
      title: 'Items',
      dataIndex: 'items',
      key: 'items',
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (v: number) => <Text strong>{formatCurrency(v)}</Text>,
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusTag(status),
    },
  ];

  const tabs = [
    {
      key: 'dashboard',
      label: 'Dashboard',
      icon: <BarChartOutlined />,
      children: (
        <Row gutter={24}>
          {/* Main Content */}
          <Col span={16}>
            {/* Sales Target Progress */}
            <Card style={{ marginBottom: 24 }}>
              <Row gutter={24} align="middle">
                <Col span={16}>
                  <Text type="secondary">Monthly Sales Target</Text>
                  <Title level={3} style={{ margin: '8px 0' }}>
                    {formatCurrency(salesStats.totalSales)} / {formatCurrency(salesStats.targetAmount)}
                  </Title>
                  <Progress 
                    percent={salesStats.targetProgress} 
                    strokeColor={{ from: '#667eea', to: '#764ba2' }}
                    strokeWidth={12}
                  />
                </Col>
                <Col span={8} style={{ textAlign: 'center' }}>
                  <Statistic
                    title="Days Remaining"
                    value={20}
                    valueStyle={{ color: '#667eea', fontSize: 32 }}
                    suffix="days"
                  />
                </Col>
              </Row>
            </Card>

            {/* Pipeline Stages */}
            <Card title="Sales Pipeline" style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', gap: 16 }}>
                {pipelineStages.map(stage => (
                  <div key={stage.stage} style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{
                      width: '100%',
                      height: 8,
                      background: stage.color,
                      borderRadius: 4,
                      marginBottom: 12,
                    }} />
                    <Text strong>{stage.stage}</Text>
                    <div>
                      <Badge count={stage.count} style={{ backgroundColor: stage.color }} />
                    </div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {formatCurrency(stage.value)}
                    </Text>
                  </div>
                ))}
              </div>
            </Card>

            {/* Recent Quotes */}
            <Card 
              title="Recent Quotes"
              extra={
                <Space>
                  <Button icon={<PlusOutlined />} onClick={() => setShowQuoteModal(true)}>New Quote</Button>
                  <Button type="link">View All</Button>
                </Space>
              }
            >
              <Table
                dataSource={recentQuotes}
                columns={quoteColumns}
                rowKey="id"
                pagination={false}
                size="middle"
              />
            </Card>
          </Col>

          {/* Right Sidebar */}
          <Col span={8}>
            {/* Key Metrics */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
              <Col span={12}>
                <Card>
                  <Statistic
                    title="Win Rate"
                    value={salesStats.winRate}
                    suffix="%"
                    prefix={<TrophyOutlined style={{ color: '#f59e0b' }} />}
                    valueStyle={{ color: '#10b981' }}
                  />
                </Card>
              </Col>
              <Col span={12}>
                <Card>
                  <Statistic
                    title="Avg Deal Size"
                    value={salesStats.avgDealSize}
                    prefix="R"
                    valueStyle={{ color: '#667eea' }}
                  />
                </Card>
              </Col>
            </Row>

            {/* Top Customers */}
            <Card title="Top Customers" style={{ marginBottom: 24 }}>
              <List
                dataSource={topCustomers.slice(0, 4)}
                renderItem={(customer, idx) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={
                        <Avatar style={{ backgroundColor: ['#667eea', '#10b981', '#f59e0b', '#ec4899'][idx] }}>
                          {customer.avatar}
                        </Avatar>
                      }
                      title={customer.name}
                      description={customer.segment}
                    />
                    <Text strong>{formatCurrency(customer.revenue)}</Text>
                  </List.Item>
                )}
              />
            </Card>

            {/* Quick Actions */}
            <QuickActionsCard
              title="Quick Actions"
              actions={[
                { icon: <FileTextOutlined />, label: 'New Quote', onClick: () => setShowQuoteModal(true) },
                { icon: <ShoppingCartOutlined />, label: 'New Order', onClick: () => setShowOrderModal(true) },
                { icon: <UserOutlined />, label: 'Add Customer' },
                { icon: <LineChartOutlined />, label: 'Sales Report' },
              ]}
            />
          </Col>
        </Row>
      ),
    },
    {
      key: 'quotes',
      label: 'Quotes',
      icon: <FileTextOutlined />,
      children: (
        <Card 
          title="All Quotations"
          extra={<Button type="primary" icon={<PlusOutlined />}>New Quote</Button>}
        >
          <Table
            dataSource={recentQuotes}
            columns={quoteColumns}
            rowKey="id"
            pagination={{ pageSize: 10 }}
          />
        </Card>
      ),
    },
    {
      key: 'orders',
      label: 'Orders',
      icon: <ShoppingCartOutlined />,
      children: (
        <Card 
          title="Sales Orders"
          extra={<Button type="primary" icon={<PlusOutlined />}>New Order</Button>}
        >
          <Table
            dataSource={recentOrders}
            columns={orderColumns}
            rowKey="id"
            pagination={{ pageSize: 10 }}
          />
        </Card>
      ),
    },
    {
      key: 'customers',
      label: 'Customers',
      icon: <TeamOutlined />,
      children: (
        <Card title="Customer Management">
          <List
            dataSource={topCustomers}
            renderItem={customer => (
              <List.Item
                actions={[
                  <Button type="link" key="view">View Profile</Button>,
                  <Button type="link" key="quote">Create Quote</Button>,
                ]}
              >
                <List.Item.Meta
                  avatar={<Avatar size={48} style={{ backgroundColor: '#667eea' }}>{customer.avatar}</Avatar>}
                  title={<Text strong>{customer.name}</Text>}
                  description={
                    <Space>
                      <Tag>{customer.segment}</Tag>
                      <Text type="secondary">{customer.orders} orders</Text>
                    </Space>
                  }
                />
                <Statistic value={customer.revenue} prefix="R" valueStyle={{ fontSize: 16 }} />
              </List.Item>
            )}
          />
        </Card>
      ),
    },
    {
      key: 'team',
      label: 'Sales Team',
      icon: <TrophyOutlined />,
      children: (
        <Card title="Team Performance">
          <Table
            dataSource={salesTeam}
            columns={[
              { 
                title: 'Name', 
                dataIndex: 'name', 
                key: 'name',
                render: (text: string) => (
                  <Space>
                    <Avatar style={{ backgroundColor: '#667eea' }}>{text.charAt(0)}</Avatar>
                    <Text strong>{text}</Text>
                  </Space>
                ),
              },
              { 
                title: 'Target', 
                dataIndex: 'target', 
                key: 'target',
                render: (v: number) => formatCurrency(v),
              },
              { 
                title: 'Achieved', 
                dataIndex: 'achieved', 
                key: 'achieved',
                render: (v: number) => <Text strong style={{ color: '#10b981' }}>{formatCurrency(v)}</Text>,
              },
              { 
                title: 'Progress', 
                key: 'progress',
                render: (_: unknown, record: typeof salesTeam[0]) => (
                  <Progress 
                    percent={Math.round((record.achieved / record.target) * 100)} 
                    strokeColor="#667eea"
                    size="small"
                  />
                ),
              },
              { 
                title: 'Deals', 
                dataIndex: 'deals', 
                key: 'deals',
              },
              { 
                title: 'Win Rate', 
                dataIndex: 'winRate', 
                key: 'winRate',
                render: (v: number) => <Tag color={v >= 70 ? 'green' : v >= 60 ? 'orange' : 'red'}>{v}%</Tag>,
              },
            ]}
            rowKey="name"
            pagination={false}
          />
        </Card>
      ),
    },
    {
      key: 'settings',
      label: 'Settings',
      icon: <SettingOutlined />,
      children: (
        <Row gutter={24}>
          <Col span={12}>
            <Card title="Sales Configuration">
              <Form layout="vertical">
                <Form.Item label="Default Payment Terms">
                  <Select defaultValue="30">
                    <Select.Option value="7">7 Days</Select.Option>
                    <Select.Option value="14">14 Days</Select.Option>
                    <Select.Option value="30">30 Days</Select.Option>
                    <Select.Option value="60">60 Days</Select.Option>
                  </Select>
                </Form.Item>
                <Form.Item label="Quote Validity (Days)">
                  <InputNumber defaultValue={30} style={{ width: '100%' }} />
                </Form.Item>
                <Button type="primary">Save Settings</Button>
              </Form>
            </Card>
          </Col>
          <Col span={12}>
            <Card title="Commission Structure">
              <Paragraph>Configure sales commission rates and tiers.</Paragraph>
              <Button type="primary" icon={<SettingOutlined />}>Configure Commissions</Button>
            </Card>
          </Col>
        </Row>
      ),
    },
  ];

  return (
    <HubLayout>
      <HubHeader
        title="Sales & CRM"
        subtitle="Quotes, Orders & Customer Relationship Management"
        icon={<ShoppingCartOutlined />}
        gradient="cyan"
        actions={
          <>
            <Button icon={<SyncOutlined />}>Refresh</Button>
            <Button icon={<DownloadOutlined />}>Export</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowQuoteModal(true)}>
              New Quote
            </Button>
          </>
        }
      />

      <StatusBanner
        gradient="cyan"
        icon={<LineChartOutlined />}
        title="Sales Performance"
        subtitle="December 2025"
        stats={[
          { title: 'Total Sales', value: salesStats.totalSales, prefix: 'R', span: 4 },
          { title: 'Pipeline Value', value: salesStats.pipelineValue, prefix: 'R', span: 4 },
          { title: 'Open Quotes', value: salesStats.quotesOpen, span: 3 },
          { title: 'Orders This Month', value: salesStats.ordersThisMonth, span: 4 },
          { title: 'Win Rate', value: `${salesStats.winRate}%`, valueStyle: { color: '#86efac' }, span: 3 },
        ]}
      />

      <HubTabs 
        theme="cyan"
        tabs={tabs}
        activeKey={activeTab}
        onChange={setActiveTab}
      />

      {/* New Quote Modal */}
      <Modal
        title="Create New Quote"
        open={showQuoteModal}
        onCancel={() => setShowQuoteModal(false)}
        footer={[
          <Button key="cancel" onClick={() => setShowQuoteModal(false)}>Cancel</Button>,
          <Button key="draft">Save as Draft</Button>,
          <Button key="send" type="primary" onClick={() => { message.success('Quote created'); setShowQuoteModal(false); }}>
            Send Quote
          </Button>
        ]}
        width={700}
      >
        <Form layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Customer" required>
                <Select placeholder="Select customer">
                  {topCustomers.map(c => (
                    <Select.Option key={c.name} value={c.name}>{c.name}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Valid Until" required>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Divider>Line Items</Divider>
          <Button type="dashed" icon={<PlusOutlined />} style={{ width: '100%' }}>
            Add Product
          </Button>
        </Form>
      </Modal>
    </HubLayout>
  );
};

export default SalesHub;
