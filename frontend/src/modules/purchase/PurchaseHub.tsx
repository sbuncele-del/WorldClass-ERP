import React, { useState, useEffect } from 'react';
import VendorInvoicesPage from './VendorInvoicesPage';
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
  Space,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  message,
  Divider,
  List,
  Badge,
  Avatar,
  Spin,
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
  SyncOutlined,
  SettingOutlined,
  UserOutlined,
  TeamOutlined,
  TruckOutlined,
  AuditOutlined,
  InboxOutlined,
  StarOutlined,
  GlobalOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import {
  HubLayout,
  HubHeader,
  StatusBanner,
  HubTabs,
  QuickActionsCard,
} from '../../components/hub';
import apiClient from '../../services/api';
import { purchaseService } from '../../services/purchase.service';
import StatementsPage from '../financial/components/StatementsPage';

const { Title, Text, Paragraph } = Typography;

interface PurchaseStats {
  totalOrders: number;
  totalSpend: number;
  pendingOrders: number;
  ordersThisMonth: number;
  avgOrderValue: number;
  onTimeDelivery: number;
  activeSuppliers: number;
  pendingApprovals: number;
}

interface Supplier {
  id: string;
  name: string;
  spend: number;
  orders: number;
  rating: number;
  status: string;
  avatar: string;
}

interface PurchaseOrder {
  id: string;
  supplier: string;
  amount: number;
  date: string;
  status: string;
  items: number;
  expectedDelivery: string;
}

interface PendingApproval {
  id: string;
  supplier: string;
  amount: number;
  requestedBy: string;
  date: string;
}

interface SpendCategory {
  category: string;
  spend: number;
  percentage: number;
  trend: string;
}

interface POLine {
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
}

const PurchaseHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [creatingSupplier, setCreatingSupplier] = useState(false);

  const [orderForm] = Form.useForm();
  const [supplierForm] = Form.useForm();
  const [poLines, setPoLines] = useState<POLine[]>([]);

  // State for API data
  const [purchaseStats, setPurchaseStats] = useState<PurchaseStats>({
    totalOrders: 0,
    totalSpend: 0,
    pendingOrders: 0,
    ordersThisMonth: 0,
    avgOrderValue: 0,
    onTimeDelivery: 0,
    activeSuppliers: 0,
    pendingApprovals: 0,
  });
  const [topSuppliers, setTopSuppliers] = useState<Supplier[]>([]);
  const [recentOrders, setRecentOrders] = useState<PurchaseOrder[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [spendByCategory, setSpendByCategory] = useState<SpendCategory[]>([]);
  const [allSuppliers, setAllSuppliers] = useState<any[]>([]);

  const fetchPurchaseData = async () => {
    setLoading(true);
    try {
      const [statsRes, suppliersRes, ordersRes, approvalsRes, categoriesRes, suppliersListRes] = await Promise.all([
        apiClient.get('/api/purchase/stats').catch(() => ({ data: null })),
        apiClient.get('/api/purchase/suppliers/top').catch(() => ({ data: [] })),
        apiClient.get('/api/purchase/orders/recent').catch(() => ({ data: [] })),
        apiClient.get('/api/purchase/approvals/pending').catch(() => ({ data: [] })),
        apiClient.get('/api/purchase/spend/categories').catch(() => ({ data: [] })),
        apiClient.get('/api/purchase/suppliers').catch(() => ({ data: [] })),
      ]);

      if (statsRes.data) {
        setPurchaseStats(statsRes.data.data || statsRes.data);
      }

      const suppliers = suppliersRes.data?.data || suppliersRes.data || [];
      setTopSuppliers(suppliers.map((s: any) => ({
        ...s,
        avatar: s.avatar || s.name?.charAt(0) || 'S'
      })));

      setRecentOrders(ordersRes.data?.data || ordersRes.data || []);
      setPendingApprovals(approvalsRes.data?.data || approvalsRes.data || []);
      setSpendByCategory(categoriesRes.data?.data || categoriesRes.data || []);

      const suppliersList = suppliersListRes.data?.data || suppliersListRes.data || [];
      setAllSuppliers(Array.isArray(suppliersList) ? suppliersList : []);
    } catch (error) {
      console.error('Error fetching purchase data:', error);
      message.error('Failed to load purchase data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchaseData();
  }, []);

  const formatCurrency = (amount: number) => `R ${(amount || 0).toLocaleString('en-ZA')}`;

  // ── Create Purchase Order ──────────────────────────────────────────────
  const handleCreateOrder = async (asDraft = false) => {
    try {
      const values = await orderForm.validateFields();
      setCreatingOrder(true);

      const subtotal = poLines.reduce((sum, l) => sum + (l.quantity * l.unit_price), 0);
      const vatAmount = subtotal * 0.15;

      await purchaseService.createOrder({
        supplier_id: values.supplier_id,
        expected_date: values.expected_date?.toISOString(),
        delivery_date: values.expected_date?.toISOString(),
        payment_terms: values.payment_terms,
        notes: values.notes,
        status: asDraft ? 'draft' : 'sent',
        subtotal,
        vat_amount: vatAmount,
        vat_rate: 15,
        total: subtotal + vatAmount,
        lines: poLines.map((line, i) => ({
          line_number: i + 1,
          description: line.description,
          quantity: line.quantity,
          unit_of_measure: line.unit,
          unit_price: line.unit_price,
          vat_rate: 15,
          line_total: line.quantity * line.unit_price * 1.15,
        })),
      });

      message.success(asDraft ? 'Purchase order saved as draft' : 'Purchase order created and sent');
      setShowOrderModal(false);
      orderForm.resetFields();
      setPoLines([]);
      fetchPurchaseData();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.message || err?.message || 'Failed to create purchase order');
    } finally {
      setCreatingOrder(false);
    }
  };

  // ── Create Supplier ────────────────────────────────────────────────────
  const handleCreateSupplier = async () => {
    try {
      const values = await supplierForm.validateFields();
      setCreatingSupplier(true);

      await purchaseService.createSupplier({
        name: values.name,
        code: values.code || values.name.substring(0, 6).toUpperCase().replace(/\s/g, ''),
        registration_number: values.registration_number,
        tax_number: values.tax_number,
        contact_person: values.contact_person,
        email: values.email,
        phone: values.phone,
        supplier_type: values.supplier_type || 'company',
        notes: values.bbee_level ? `B-BBEE Level ${values.bbee_level}` : undefined,
      });

      message.success('Supplier added successfully');
      setShowSupplierModal(false);
      supplierForm.resetFields();
      fetchPurchaseData();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.message || err?.message || 'Failed to create supplier');
    } finally {
      setCreatingSupplier(false);
    }
  };

  // ── PO Line Items ──────────────────────────────────────────────────────
  const addPoLine = () => {
    setPoLines([...poLines, { description: '', quantity: 1, unit: 'each', unit_price: 0 }]);
  };

  const updatePoLine = (index: number, field: string, value: any) => {
    const updated = [...poLines];
    (updated[index] as any)[field] = value;
    setPoLines(updated);
  };

  const removePoLine = (index: number) => {
    setPoLines(poLines.filter((_, i) => i !== index));
  };

  // ── Approve / Reject pending approvals ─────────────────────────────────
  const handleApproveOrder = async (orderId: string) => {
    try {
      await purchaseService.sendOrder(orderId);
      message.success('Purchase order approved');
      fetchPurchaseData();
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Failed to approve order');
    }
  };

  const handleRejectOrder = async (orderId: string) => {
    try {
      await purchaseService.cancelOrder(orderId);
      message.success('Purchase order rejected');
      fetchPurchaseData();
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Failed to reject order');
    }
  };

  // Export function
  const handleExport = () => {
    try {
      let csvContent = '';
      let filename = '';
      const now = new Date().toISOString().split('T')[0];

      if (activeTab === 'suppliers') {
        csvContent = 'Supplier,Total Spend,Orders,Rating,Status\n';
        topSuppliers.forEach(s => {
          csvContent += `"${s.name}",${s.spend},${s.orders},${s.rating},"${s.status}"\n`;
        });
        filename = `suppliers-${now}.csv`;
      } else if (activeTab === 'orders') {
        csvContent = 'PO Number,Supplier,Amount,Date,Status,Items,Expected Delivery\n';
        recentOrders.forEach(o => {
          csvContent += `"${o.id}","${o.supplier}",${o.amount},"${o.date}","${o.status}",${o.items},"${o.expectedDelivery}"\n`;
        });
        filename = `purchase-orders-${now}.csv`;
      } else {
        csvContent = 'Metric,Value\n';
        csvContent += `Total Orders,${purchaseStats.totalOrders}\n`;
        csvContent += `Total Spend,R ${purchaseStats.totalSpend.toLocaleString()}\n`;
        csvContent += `Pending Orders,${purchaseStats.pendingOrders}\n`;
        csvContent += `Orders This Month,${purchaseStats.ordersThisMonth}\n`;
        csvContent += `On-Time Delivery,${purchaseStats.onTimeDelivery}%\n`;
        csvContent += `Active Suppliers,${purchaseStats.activeSuppliers}\n`;
        filename = `purchase-summary-${now}.csv`;
      }

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);
      message.success(`Exported ${filename}`);
    } catch (err) {
      message.error('Export failed');
    }
  };

  const getStatusTag = (status: string) => {
    const configs: Record<string, { color: string; text: string; icon?: React.ReactNode }> = {
      'pending_approval': { color: 'orange', text: 'Pending Approval', icon: <ClockCircleOutlined /> },
      'approved': { color: 'blue', text: 'Approved', icon: <CheckCircleOutlined /> },
      'sent': { color: 'cyan', text: 'Sent to Supplier' },
      'received': { color: 'green', text: 'Received', icon: <CheckCircleOutlined /> },
      'invoiced': { color: 'purple', text: 'Invoiced' },
      'cancelled': { color: 'red', text: 'Cancelled' },
      'preferred': { color: 'gold', text: 'Preferred' },
      'draft': { color: 'default', text: 'Draft' },
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
            <>
              <Button type="link" size="small" onClick={() => handleApproveOrder(record.id)}>Approve</Button>
              <Button type="link" size="small" danger onClick={() => handleRejectOrder(record.id)}>Reject</Button>
            </>
          )}
          {record.status === 'draft' && (
            <Button type="link" size="small" onClick={() => handleApproveOrder(record.id)}>Send</Button>
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
                        <Button type="primary" size="small" key="approve" onClick={() => handleApproveOrder(item.id)}>Approve</Button>,
                        <Button size="small" danger key="reject" onClick={() => handleRejectOrder(item.id)}>Reject</Button>,
                      ]}
                    >
                      <List.Item.Meta
                        avatar={<Avatar style={{ backgroundColor: '#667eea' }}>{item.supplier.charAt(0)}</Avatar>}
                        title={<Text strong>{item.id}</Text>}
                        description={`${item.supplier} - Requested by ${item.requestedBy}`}
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
                  <Button type="link" onClick={() => setActiveTab('orders')}>View All</Button>
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
                          <Tag color="green">&#9733; {supplier.rating}</Tag>
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
                { icon: <AuditOutlined />, label: 'Approvals', onClick: () => setActiveTab('dashboard') },
                { icon: <DownloadOutlined />, label: 'Reports', onClick: () => setActiveTab('reports') },
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
          extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setShowOrderModal(true)}>Create PO</Button>}
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
      key: 'invoices',
      label: 'Vendor Invoices',
      icon: <FileTextOutlined />,
      children: <VendorInvoicesPage />,
    },
    {
      key: 'requisitions',
      label: 'Requisitions',
      icon: <InboxOutlined />,
      children: (
        <Card title="Purchase Requisitions">
          <Table
            dataSource={recentOrders.filter(o => o.status === 'pending_approval' || o.status === 'draft')}
            columns={orderColumns}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: 'No requisitions found' }}
          />
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
          extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setShowSupplierModal(true)}>Add Supplier</Button>}
        >
          <List
            dataSource={topSuppliers}
            renderItem={supplier => (
              <List.Item
                actions={[
                  <Button type="link" key="view">View Profile</Button>,
                  <Button type="link" key="order" onClick={() => setShowOrderModal(true)}>Create PO</Button>,
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
                      <Tag color="green">&#9733; {supplier.rating}</Tag>
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
      key: 'statements',
      label: 'Statements',
      icon: <FileTextOutlined />,
      children: <StatementsPage defaultMode="suppliers" />,
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
                    parser={value => Number(value!.replace(/R\s?|(,*)/g, '')) as unknown as number}
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
            <Button icon={<SyncOutlined spin={loading} />} onClick={() => fetchPurchaseData()}>Refresh</Button>
            <Button icon={<DownloadOutlined />} onClick={handleExport}>Export</Button>
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

      {loading ? (
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>Loading purchase data...</div>
        </div>
      ) : (
        <HubTabs
          theme="purple"
          tabs={tabs}
          activeKey={activeTab}
          onChange={setActiveTab}
        />
      )}

      {/* New Purchase Order Modal */}
      <Modal
        title="Create Purchase Order"
        open={showOrderModal}
        onCancel={() => { setShowOrderModal(false); orderForm.resetFields(); setPoLines([]); }}
        footer={[
          <Button key="cancel" onClick={() => { setShowOrderModal(false); orderForm.resetFields(); setPoLines([]); }}>Cancel</Button>,
          <Button key="draft" onClick={() => handleCreateOrder(true)} loading={creatingOrder}>Save as Draft</Button>,
          <Button key="create" type="primary" onClick={() => handleCreateOrder(false)} loading={creatingOrder}>
            Create & Send
          </Button>
        ]}
        width={800}
      >
        <Form layout="vertical" form={orderForm}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Supplier" name="supplier_id" rules={[{ required: true, message: 'Please select a supplier' }]}>
                <Select placeholder="Select supplier" showSearch optionFilterProp="children">
                  {allSuppliers.map((s: any) => (
                    <Select.Option key={s.id} value={s.id}>{s.name || s.trading_name}</Select.Option>
                  ))}
                  {topSuppliers.filter(ts => !allSuppliers.find(a => a.id === ts.id)).map(s => (
                    <Select.Option key={s.id} value={s.id}>{s.name}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Expected Delivery" name="expected_date" rules={[{ required: true, message: 'Please select delivery date' }]}>
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
                  onChange={e => updatePoLine(idx, 'description', e.target.value)}
                />
              </Col>
              <Col span={3}>
                <InputNumber
                  placeholder="Qty"
                  value={line.quantity}
                  min={1}
                  onChange={v => updatePoLine(idx, 'quantity', v || 1)}
                  style={{ width: '100%' }}
                />
              </Col>
              <Col span={4}>
                <Select value={line.unit} onChange={v => updatePoLine(idx, 'unit', v)} style={{ width: '100%' }}>
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
                  onChange={v => updatePoLine(idx, 'unit_price', v || 0)}
                  style={{ width: '100%' }}
                  formatter={v => `R ${v}`}
                  parser={v => Number(v!.replace(/R\s?/g, '')) as unknown as number}
                />
              </Col>
              <Col span={3}>
                <Text strong>R {(line.quantity * line.unit_price).toLocaleString('en-ZA')}</Text>
              </Col>
              <Col span={2}>
                <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removePoLine(idx)} />
              </Col>
            </Row>
          ))}
          <Button type="dashed" icon={<PlusOutlined />} style={{ width: '100%' }} onClick={addPoLine}>
            Add Item
          </Button>
          {poLines.length > 0 && (
            <div style={{ textAlign: 'right', marginTop: 16, padding: '12px 16px', background: '#f0f5ff', borderRadius: 8 }}>
              <Text>Subtotal: <Text strong>R {poLines.reduce((s, l) => s + l.quantity * l.unit_price, 0).toLocaleString('en-ZA')}</Text></Text>
              <br />
              <Text>VAT (15%): <Text strong>R {(poLines.reduce((s, l) => s + l.quantity * l.unit_price, 0) * 0.15).toLocaleString('en-ZA')}</Text></Text>
              <br />
              <Text style={{ fontSize: 16 }}>Total: <Text strong style={{ color: '#667eea', fontSize: 18 }}>
                R {(poLines.reduce((s, l) => s + l.quantity * l.unit_price, 0) * 1.15).toLocaleString('en-ZA')}
              </Text></Text>
            </div>
          )}
        </Form>
      </Modal>

      {/* New Supplier Modal */}
      <Modal
        title="Add New Supplier"
        open={showSupplierModal}
        onCancel={() => { setShowSupplierModal(false); supplierForm.resetFields(); }}
        footer={[
          <Button key="cancel" onClick={() => { setShowSupplierModal(false); supplierForm.resetFields(); }}>Cancel</Button>,
          <Button key="create" type="primary" onClick={handleCreateSupplier} loading={creatingSupplier}>
            Add Supplier
          </Button>
        ]}
        width={600}
      >
        <Form layout="vertical" form={supplierForm}>
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item label="Company Name" name="name" rules={[{ required: true, message: 'Please enter company name' }]}>
                <Input placeholder="Enter company name" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Supplier Code" name="code">
                <Input placeholder="Auto-generated" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Registration Number" name="registration_number">
                <Input placeholder="e.g., 2020/123456/07" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="VAT Number" name="tax_number">
                <Input placeholder="e.g., 4123456789" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Contact Person" name="contact_person">
                <Input placeholder="Primary contact name" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Email" name="email" rules={[{ type: 'email', message: 'Please enter a valid email' }]}>
                <Input placeholder="contact@supplier.co.za" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Phone" name="phone">
                <Input placeholder="Phone number" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Supplier Type" name="supplier_type">
                <Select placeholder="Select type">
                  <Select.Option value="company">Company</Select.Option>
                  <Select.Option value="individual">Individual</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="B-BBEE Status" name="bbee_level">
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
