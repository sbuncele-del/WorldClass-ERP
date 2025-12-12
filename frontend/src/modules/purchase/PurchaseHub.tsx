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
  Timeline,
} from 'antd';
import {
  ShoppingOutlined,
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
  UserOutlined,
  DollarOutlined,
  TeamOutlined,
  TruckOutlined,
  AuditOutlined,
  InboxOutlined,
  FileDoneOutlined,
  StarOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import {
  HubLayout,
  HubHeader,
  StatusBanner,
  HubTabs,
  StatCard,
  QuickActionsCard,
  StatusIndicator,
  InfoListCard,
} from '../../components/hub';

const { Title, Text, Paragraph } = Typography;

// Purchase Statistics
const purchaseStats = {
  totalOrders: 1245,
  totalSpend: 42500000,
  pendingOrders: 28,
  ordersThisMonth: 89,
  avgOrderValue: 475000,
  onTimeDelivery: 94,
  activeSuppliers: 156,
  pendingApprovals: 12,
};

// Supplier Summary
const topSuppliers = [
  { name: 'Steel Corp RSA', spend: 8500000, orders: 45, rating: 4.8, status: 'preferred', avatar: 'S' },
  { name: 'Tech Components Ltd', spend: 6200000, orders: 32, rating: 4.5, status: 'approved', avatar: 'T' },
  { name: 'Industrial Supplies ZA', spend: 4800000, orders: 28, rating: 4.7, status: 'preferred', avatar: 'I' },
  { name: 'Packaging Solutions', spend: 3500000, orders: 65, rating: 4.2, status: 'approved', avatar: 'P' },
  { name: 'Chemical Traders', spend: 2900000, orders: 18, rating: 4.6, status: 'preferred', avatar: 'C' },
];

// Recent Purchase Orders
const recentOrders = [
  {
    id: 'PO-2025-3421',
    supplier: 'Steel Corp RSA',
    amount: 450000,
    date: '2025-12-11',
    status: 'pending_approval',
    items: 5,
    expectedDelivery: '2025-12-20',
  },
  {
    id: 'PO-2025-3420',
    supplier: 'Tech Components Ltd',
    amount: 890000,
    date: '2025-12-10',
    status: 'approved',
    items: 12,
    expectedDelivery: '2025-12-18',
  },
  {
    id: 'PO-2025-3419',
    supplier: 'Industrial Supplies ZA',
    amount: 125000,
    date: '2025-12-10',
    status: 'sent',
    items: 3,
    expectedDelivery: '2025-12-15',
  },
  {
    id: 'PO-2025-3418',
    supplier: 'Packaging Solutions',
    amount: 65000,
    date: '2025-12-09',
    status: 'received',
    items: 8,
    expectedDelivery: '2025-12-12',
  },
  {
    id: 'PO-2025-3417',
    supplier: 'Chemical Traders',
    amount: 340000,
    date: '2025-12-08',
    status: 'invoiced',
    items: 4,
    expectedDelivery: '2025-12-11',
  },
];

// Pending Approvals
const pendingApprovals = [
  { id: 'PO-2025-3421', supplier: 'Steel Corp RSA', amount: 450000, requestedBy: 'Michael Brown', date: '2025-12-11' },
  { id: 'PO-2025-3415', supplier: 'Heavy Equipment Co', amount: 1250000, requestedBy: 'Sarah Chen', date: '2025-12-10' },
  { id: 'PO-2025-3412', supplier: 'Logistics Partners', amount: 890000, requestedBy: 'Thandi Nkosi', date: '2025-12-09' },
];

// Spend by Category
const spendByCategory = [
  { category: 'Raw Materials', spend: 18500000, percentage: 43, trend: 'up' },
  { category: 'Equipment', spend: 8200000, percentage: 19, trend: 'down' },
  { category: 'Services', spend: 6500000, percentage: 15, trend: 'up' },
  { category: 'Consumables', spend: 5300000, percentage: 13, trend: 'stable' },
  { category: 'Other', spend: 4000000, percentage: 10, trend: 'down' },
];

const PurchaseHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);

  const formatCurrency = (amount: number) => `R ${amount.toLocaleString('en-ZA')}`;

  const getStatusTag = (status: string) => {
    const configs: Record<string, { color: string; text: string; icon?: React.ReactNode }> = {
      'pending_approval': { color: 'orange', text: 'Pending Approval', icon: <ClockCircleOutlined /> },
      'approved': { color: 'blue', text: 'Approved', icon: <CheckCircleOutlined /> },
      'sent': { color: 'cyan', text: 'Sent to Supplier' },
      'received': { color: 'green', text: 'Received', icon: <CheckCircleOutlined /> },
      'invoiced': { color: 'purple', text: 'Invoiced' },
      'cancelled': { color: 'red', text: 'Cancelled' },
      'preferred': { color: 'gold', text: 'Preferred' },
    };
    const config = configs[status] || { color: 'default', text: status };
    return <Tag color={config.color} icon={config.icon}>{config.text}</Tag>;
  };

  const orderColumns = [
    {
      title: 'PO Number',
      dataIndex: 'id',
      key: 'id',
      render: (text: string) => <Text strong style={{ color: '#667eea' }}>{text}</Text>,
    },
    {
      title: 'Supplier',
      dataIndex: 'supplier',
      key: 'supplier',
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
      title: 'Delivery',
      dataIndex: 'expectedDelivery',
      key: 'expectedDelivery',
      render: (date: string) => <Tag icon={<TruckOutlined />}>{date}</Tag>,
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
      render: (_: unknown, record: typeof recentOrders[0]) => (
        <Space>
          <Button type="link" size="small">View</Button>
          {record.status === 'pending_approval' && (
            <Button type="link" size="small">Approve</Button>
          )}
        </Space>
      ),
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
            {/* Key Metrics */}
            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="Total Spend (YTD)"
                    value={purchaseStats.totalSpend}
                    prefix="R"
                    valueStyle={{ color: '#667eea' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="Pending Orders"
                    value={purchaseStats.pendingOrders}
                    prefix={<ClockCircleOutlined style={{ color: '#f59e0b' }} />}
                    valueStyle={{ color: '#f59e0b' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="Pending Approvals"
                    value={purchaseStats.pendingApprovals}
                    prefix={<ExclamationCircleOutlined style={{ color: '#ef4444' }} />}
                    valueStyle={{ color: '#ef4444' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="On-Time Delivery"
                    value={purchaseStats.onTimeDelivery}
                    suffix="%"
                    prefix={<TruckOutlined style={{ color: '#10b981' }} />}
                    valueStyle={{ color: '#10b981' }}
                  />
                </Card>
              </Col>
            </Row>

            {/* Pending Approvals Alert */}
            {pendingApprovals.length > 0 && (
              <Card 
                title={
                  <Space>
                    <AuditOutlined style={{ color: '#f59e0b' }} />
                    Pending Approvals
                    <Badge count={pendingApprovals.length} />
                  </Space>
                }
                style={{ marginBottom: 24 }}
              >
                <List
                  dataSource={pendingApprovals}
                  renderItem={item => (
                    <List.Item
                      actions={[
                        <Button type="primary" size="small" key="approve">Approve</Button>,
                        <Button size="small" key="reject">Reject</Button>,
                      ]}
                    >
                      <List.Item.Meta
                        avatar={<Avatar style={{ backgroundColor: '#667eea' }}>{item.supplier.charAt(0)}</Avatar>}
                        title={<Text strong>{item.id}</Text>}
                        description={`${item.supplier} • Requested by ${item.requestedBy}`}
                      />
                      <Text strong style={{ color: '#667eea' }}>{formatCurrency(item.amount)}</Text>
                    </List.Item>
                  )}
                />
              </Card>
            )}

            {/* Recent Orders */}
            <Card 
              title="Recent Purchase Orders"
              extra={
                <Space>
                  <Button icon={<PlusOutlined />} onClick={() => setShowOrderModal(true)}>New Order</Button>
                  <Button type="link">View All</Button>
                </Space>
              }
            >
              <Table
                dataSource={recentOrders}
                columns={orderColumns}
                rowKey="id"
                pagination={false}
                size="middle"
              />
            </Card>
          </Col>

          {/* Right Sidebar */}
          <Col span={8}>
            {/* Top Suppliers */}
            <Card title="Top Suppliers" style={{ marginBottom: 24 }}>
              <List
                dataSource={topSuppliers.slice(0, 4)}
                renderItem={(supplier, idx) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={
                        <Avatar style={{ backgroundColor: ['#667eea', '#10b981', '#f59e0b', '#ec4899'][idx] }}>
                          {supplier.avatar}
                        </Avatar>
                      }
                      title={
                        <Space>
                          {supplier.name}
                          {supplier.status === 'preferred' && <StarOutlined style={{ color: '#f59e0b' }} />}
                        </Space>
                      }
                      description={
                        <Space>
                          <Tag>{supplier.orders} orders</Tag>
                          <Tag color="green">★ {supplier.rating}</Tag>
                        </Space>
                      }
                    />
                    <Text strong>{formatCurrency(supplier.spend)}</Text>
                  </List.Item>
                )}
              />
            </Card>

            {/* Quick Actions */}
            <QuickActionsCard
              title="Quick Actions"
              actions={[
                { icon: <PlusOutlined />, label: 'Create PO', onClick: () => setShowOrderModal(true) },
                { icon: <UserOutlined />, label: 'Add Supplier', onClick: () => setShowSupplierModal(true) },
                { icon: <AuditOutlined />, label: 'Approvals' },
                { icon: <DownloadOutlined />, label: 'Reports' },
              ]}
            />

            {/* Spend by Category */}
            <Card title="Spend by Category" style={{ marginTop: 24 }}>
              {spendByCategory.map(cat => (
                <div key={cat.category} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text>{cat.category}</Text>
                    <Space>
                      {cat.trend === 'up' && <RiseOutlined style={{ color: '#10b981' }} />}
                      {cat.trend === 'down' && <FallOutlined style={{ color: '#ef4444' }} />}
                      <Text type="secondary">{cat.percentage}%</Text>
                    </Space>
                  </div>
                  <Progress 
                    percent={cat.percentage} 
                    strokeColor="#667eea"
                    size="small"
                  />
                  <Text type="secondary" style={{ fontSize: 12 }}>{formatCurrency(cat.spend)}</Text>
                </div>
              ))}
            </Card>
          </Col>
        </Row>
      ),
    },
    {
      key: 'orders',
      label: 'Purchase Orders',
      icon: <FileTextOutlined />,
      children: (
        <Card 
          title="All Purchase Orders"
          extra={<Button type="primary" icon={<PlusOutlined />}>Create PO</Button>}
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
      key: 'requisitions',
      label: 'Requisitions',
      icon: <InboxOutlined />,
      children: (
        <Card title="Purchase Requisitions">
          <Alert
            message="Requisition Management"
            description="Create, approve, and convert purchase requisitions to purchase orders."
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <Button type="primary" icon={<PlusOutlined />}>New Requisition</Button>
        </Card>
      ),
    },
    {
      key: 'suppliers',
      label: 'Suppliers',
      icon: <TeamOutlined />,
      children: (
        <Card 
          title="Supplier Management"
          extra={<Button type="primary" icon={<PlusOutlined />}>Add Supplier</Button>}
        >
          <List
            dataSource={topSuppliers}
            renderItem={supplier => (
              <List.Item
                actions={[
                  <Button type="link" key="view">View Profile</Button>,
                  <Button type="link" key="order">Create PO</Button>,
                ]}
              >
                <List.Item.Meta
                  avatar={<Avatar size={48} style={{ backgroundColor: '#667eea' }}>{supplier.avatar}</Avatar>}
                  title={
                    <Space>
                      <Text strong>{supplier.name}</Text>
                      {getStatusTag(supplier.status)}
                    </Space>
                  }
                  description={
                    <Space>
                      <Tag>{supplier.orders} orders</Tag>
                      <Tag color="green">★ {supplier.rating}</Tag>
                    </Space>
                  }
                />
                <Statistic value={supplier.spend} prefix="R" valueStyle={{ fontSize: 16 }} />
              </List.Item>
            )}
          />
        </Card>
      ),
    },
    {
      key: 'receiving',
      label: 'Goods Receipt',
      icon: <TruckOutlined />,
      children: (
        <Card title="Goods Receipt">
          <Alert
            message="Receiving Queue"
            description="Process incoming deliveries and verify goods received against purchase orders."
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <Table
            dataSource={recentOrders.filter(o => o.status === 'sent' || o.status === 'approved')}
            columns={[
              { title: 'PO Number', dataIndex: 'id', key: 'id', render: (t: string) => <Text strong>{t}</Text> },
              { title: 'Supplier', dataIndex: 'supplier', key: 'supplier' },
              { title: 'Expected Delivery', dataIndex: 'expectedDelivery', key: 'expectedDelivery' },
              { title: 'Status', dataIndex: 'status', key: 'status', render: (s: string) => getStatusTag(s) },
              { title: 'Action', key: 'action', render: () => <Button type="primary" size="small">Receive</Button> },
            ]}
            rowKey="id"
            pagination={false}
          />
        </Card>
      ),
    },
    {
      key: 'reports',
      label: 'Reports',
      icon: <PieChartOutlined />,
      children: (
        <Row gutter={24}>
          <Col span={12}>
            <Card title="Purchase Reports">
              <List
                dataSource={[
                  'Supplier Spend Analysis',
                  'Purchase Order History',
                  'On-Time Delivery Report',
                  'Supplier Performance',
                  'Category Spend Report',
                ]}
                renderItem={item => (
                  <List.Item
                    actions={[<Button type="link" key="run">Generate</Button>]}
                  >
                    <Text>{item}</Text>
                  </List.Item>
                )}
              />
            </Card>
          </Col>
          <Col span={12}>
            <Card title="B-BBEE Reporting">
              <Paragraph>Track B-BBEE compliance and supplier diversity metrics.</Paragraph>
              <Button type="primary" icon={<GlobalOutlined />}>B-BBEE Dashboard</Button>
            </Card>
          </Col>
        </Row>
      ),
    },
    {
      key: 'settings',
      label: 'Settings',
      icon: <SettingOutlined />,
      children: (
        <Row gutter={24}>
          <Col span={12}>
            <Card title="Approval Workflow">
              <Form layout="vertical">
                <Form.Item label="Approval Threshold">
                  <InputNumber 
                    defaultValue={100000} 
                    style={{ width: '100%' }} 
                    formatter={value => `R ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={value => Number(value!.replace(/R\s?|(,*)/g, '')) as 100000}
                  />
                </Form.Item>
                <Form.Item label="Multi-Level Approval">
                  <Select defaultValue="yes">
                    <Select.Option value="yes">Enabled</Select.Option>
                    <Select.Option value="no">Disabled</Select.Option>
                  </Select>
                </Form.Item>
                <Button type="primary">Save Settings</Button>
              </Form>
            </Card>
          </Col>
          <Col span={12}>
            <Card title="Supplier Categories">
              <Paragraph>Manage supplier classification and preferred supplier lists.</Paragraph>
              <Button type="primary" icon={<SettingOutlined />}>Manage Categories</Button>
            </Card>
          </Col>
        </Row>
      ),
    },
  ];

  return (
    <HubLayout>
      <HubHeader
        title="Purchase Management"
        subtitle="Procurement, Suppliers & Requisitions"
        icon={<ShoppingOutlined />}
        gradient="purple"
        actions={
          <>
            <Button icon={<SyncOutlined />}>Refresh</Button>
            <Button icon={<DownloadOutlined />}>Export</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowOrderModal(true)}>
              Create PO
            </Button>
          </>
        }
      />

      <StatusBanner
        gradient="purple"
        icon={<ShoppingOutlined />}
        title="Procurement Overview"
        subtitle={`${purchaseStats.activeSuppliers} Active Suppliers`}
        stats={[
          { title: 'Total Spend YTD', value: purchaseStats.totalSpend, prefix: 'R', span: 4 },
          { title: 'Orders This Month', value: purchaseStats.ordersThisMonth, span: 3 },
          { title: 'Pending Orders', value: purchaseStats.pendingOrders, span: 3 },
          { title: 'Pending Approvals', value: purchaseStats.pendingApprovals, valueStyle: { color: '#fca5a5' }, span: 4 },
          { title: 'On-Time Delivery', value: `${purchaseStats.onTimeDelivery}%`, valueStyle: { color: '#86efac' }, span: 4 },
        ]}
      />

      <HubTabs 
        theme="purple"
        tabs={tabs}
        activeKey={activeTab}
        onChange={setActiveTab}
      />

      {/* New Purchase Order Modal */}
      <Modal
        title="Create Purchase Order"
        open={showOrderModal}
        onCancel={() => setShowOrderModal(false)}
        footer={[
          <Button key="cancel" onClick={() => setShowOrderModal(false)}>Cancel</Button>,
          <Button key="draft">Save as Draft</Button>,
          <Button key="submit" onClick={() => { message.success('PO submitted for approval'); setShowOrderModal(false); }}>
            Submit for Approval
          </Button>,
          <Button key="create" type="primary" onClick={() => { message.success('PO created'); setShowOrderModal(false); }}>
            Create & Send
          </Button>
        ]}
        width={700}
      >
        <Form layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Supplier" required>
                <Select placeholder="Select supplier">
                  {topSuppliers.map(s => (
                    <Select.Option key={s.name} value={s.name}>{s.name}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Expected Delivery" required>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Divider>Line Items</Divider>
          <Button type="dashed" icon={<PlusOutlined />} style={{ width: '100%' }}>
            Add Item
          </Button>
        </Form>
      </Modal>

      {/* New Supplier Modal */}
      <Modal
        title="Add New Supplier"
        open={showSupplierModal}
        onCancel={() => setShowSupplierModal(false)}
        footer={[
          <Button key="cancel" onClick={() => setShowSupplierModal(false)}>Cancel</Button>,
          <Button key="create" type="primary" onClick={() => { message.success('Supplier created'); setShowSupplierModal(false); }}>
            Add Supplier
          </Button>
        ]}
        width={600}
      >
        <Form layout="vertical">
          <Form.Item label="Company Name" required>
            <Input placeholder="Enter company name" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Registration Number">
                <Input placeholder="e.g., 2020/123456/07" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="VAT Number">
                <Input placeholder="e.g., 4123456789" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Contact Person">
                <Input placeholder="Primary contact name" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Email">
                <Input placeholder="contact@supplier.co.za" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="B-BBEE Status">
            <Select placeholder="Select B-BBEE Level">
              <Select.Option value="1">Level 1 (135%)</Select.Option>
              <Select.Option value="2">Level 2 (125%)</Select.Option>
              <Select.Option value="3">Level 3 (110%)</Select.Option>
              <Select.Option value="4">Level 4 (100%)</Select.Option>
              <Select.Option value="5">Level 5 (80%)</Select.Option>
              <Select.Option value="6">Level 6 (60%)</Select.Option>
              <Select.Option value="7">Level 7 (50%)</Select.Option>
              <Select.Option value="8">Level 8 (10%)</Select.Option>
              <Select.Option value="non">Non-Compliant</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </HubLayout>
  );
};

export default PurchaseHub;
