/**
 * SalesDashboardPage — Sales & CRM Dashboard
 * 
 * A proper standalone page with:
 * - Sales KPIs (revenue, pipeline, orders, win rate)
 * - Sales Pipeline visualization
 * - Recent Quotes & Orders tables
 * - Top Customers list
 * - Quick Actions to navigate to sub-modules
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Card, Row, Col, Button, Typography, Tag, Progress, Statistic,
  Table, Space, Tooltip, Badge, Avatar, List, Alert, Spin, message,
} from 'antd';
import {
  ShoppingCartOutlined, UserOutlined, FileTextOutlined,
  BarChartOutlined, RiseOutlined, CheckCircleOutlined,
  PlusOutlined, DownloadOutlined, SyncOutlined,
  DollarOutlined, TeamOutlined, TrophyOutlined,
  LineChartOutlined, MailOutlined, AimOutlined, RocketOutlined,
} from '@ant-design/icons';
import {
  HubLayout, HubHeader, StatusBanner, QuickActionsCard,
} from '../../../components/hub';
import { salesService } from '../../../services/sales.service';
import { workspaceApi } from '../../../services/api.service';

const { Title, Text } = Typography;

interface SalesStatsState {
  totalSales: number;
  pipelineValue: number;
  quotesOpen: number;
  ordersThisMonth: number;
  avgDealSize: number;
  winRate: number;
  targetProgress: number;
  targetAmount: number;
}

interface PipelineStage {
  stage: string;
  count: number;
  value: number;
  color: string;
}

interface TopCustomer {
  id?: string;
  name: string;
  revenue: number;
  orders: number;
  segment: string;
  avatar: string;
  email?: string;
  phone?: string;
}

interface Quote {
  id: string;
  customer: string;
  amount: number;
  validUntil: string;
  status: string;
}

interface Order {
  id: string;
  customer: string;
  amount: number;
  date: string;
  status: string;
  items: number;
}

const defaultPipelineStages: PipelineStage[] = [
  { stage: 'Lead', count: 0, value: 0, color: '#667eea' },
  { stage: 'Qualified', count: 0, value: 0, color: '#06b6d4' },
  { stage: 'Proposal', count: 0, value: 0, color: '#f59e0b' },
  { stage: 'Negotiation', count: 0, value: 0, color: '#ec4899' },
  { stage: 'Won', count: 0, value: 0, color: '#10b981' },
];

const SalesDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = location.pathname.includes('/sales-hub') ? '/app/sales-hub' : '/app/sales';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [salesStats, setSalesStats] = useState<SalesStatsState>({
    totalSales: 0, pipelineValue: 0, quotesOpen: 0, ordersThisMonth: 0,
    avgDealSize: 0, winRate: 0, targetProgress: 0, targetAmount: 0,
  });
  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>(defaultPipelineStages);
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([]);
  const [recentQuotes, setRecentQuotes] = useState<Quote[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);

  useEffect(() => {
    fetchSalesData();
  }, []);

  const fetchSalesData = async () => {
    setLoading(true);
    setError(null);
    try {
      const workspace = await salesService.getStats();
      setSalesStats({
        totalSales: parseFloat(workspace.total_revenue) || 0,
        pipelineValue: parseFloat((workspace as any).pipeline_value) || 0,
        quotesOpen: parseInt((workspace as any).pending_quotes) || 0,
        ordersThisMonth: parseInt(workspace.total_orders) || 0,
        avgDealSize: parseFloat(workspace.average_order_value) || parseFloat((workspace as any).avg_deal_size) || 0,
        winRate: parseFloat((workspace as any).win_rate) || 0,
        targetProgress: 0,
        targetAmount: 0,
      });

      // Map API stage names to display names
      const stageMap: Record<string, { display: string; color: string }> = {
        lead: { display: 'Lead', color: '#667eea' },
        qualification: { display: 'Qualified', color: '#06b6d4' },
        qualified: { display: 'Qualified', color: '#06b6d4' },
        proposal: { display: 'Proposal', color: '#f59e0b' },
        negotiation: { display: 'Negotiation', color: '#ec4899' },
        won: { display: 'Won', color: '#10b981' },
        closed_won: { display: 'Won', color: '#10b981' },
      };

      // Always start with the 5 default stages, then overlay API data
      const mergedPipeline: PipelineStage[] = [
        { stage: 'Lead', count: 0, value: 0, color: '#667eea' },
        { stage: 'Qualified', count: 0, value: 0, color: '#06b6d4' },
        { stage: 'Proposal', count: 0, value: 0, color: '#f59e0b' },
        { stage: 'Negotiation', count: 0, value: 0, color: '#ec4899' },
        { stage: 'Won', count: 0, value: 0, color: '#10b981' },
      ];

      if (Array.isArray((workspace as any)?.pipeline) && (workspace as any).pipeline.length > 0) {
        (workspace as any).pipeline.forEach((apiStage: any) => {
          const key = (apiStage.stage || '').toLowerCase();
          const mapped = stageMap[key];
          if (mapped) {
            const target = mergedPipeline.find(s => s.stage === mapped.display);
            if (target) {
              target.count += Number(apiStage.opportunity_count || apiStage.count || 0);
              target.value += Number(apiStage.total_value || 0);
            }
          }
        });
      }
      setPipelineStages(mergedPipeline);

      if (Array.isArray((workspace as any)?.top_customers)) {
        setTopCustomers(
          (workspace as any).top_customers.map((c: any) => ({
            id: c.id || c.customer_id,
            name: c.name || c.customer_name,
            revenue: c.total_revenue || c.total_spent || 0,
            orders: c.order_count || c.total_orders || 0,
            segment: c.customer_type || 'General',
            avatar: (c.name || c.customer_name || 'C').charAt(0),
          }))
        );
      }

      // Fetch quotes
      try {
        const qRes: any = await workspaceApi.sales.getQuotations({ limit: 5 });
        const qList = qRes?.data || qRes?.quotations || qRes?.quotes || [];
        if (Array.isArray(qList)) {
          setRecentQuotes(qList.map((q: any) => ({
            id: q.quotation_number || q.quote_number || q.id || 'QUOTE',
            customer: q.customer_name || q.customer || 'Customer',
            amount: Number(q.total_amount ?? q.amount ?? 0),
            validUntil: q.valid_until || q.expiry_date || '—',
            status: (q.status || 'draft').toLowerCase(),
          })));
        }
      } catch { /* quotes endpoint optional */ }

      // Fetch orders
      try {
        const oRes: any = await workspaceApi.sales.getOrders({ limit: 5 });
        const oList = oRes?.data || oRes?.orders || [];
        if (Array.isArray(oList)) {
          setRecentOrders(oList.map((o: any) => ({
            id: o.order_number || o.order_id || o.id || 'ORDER',
            customer: o.customer_name || o.customer || 'Customer',
            amount: Number(o.total_amount ?? o.total ?? 0),
            date: o.order_date || o.created_at || '',
            status: (o.order_status || o.status || 'pending').toLowerCase(),
            items: o.items_count || 1,
          })));
        }
      } catch { /* orders endpoint optional */ }

      // Fetch customers
      try {
        const cRes: any = await workspaceApi.sales.getCustomers({ limit: 10 });
        const cList = cRes?.data || cRes?.customers || [];
        if (Array.isArray(cList) && cList.length > 0) {
          setTopCustomers(cList.map((c: any) => ({
            id: c.customer_id || c.id,
            name: c.customer_name || c.name,
            revenue: Number(c.total_spent ?? 0),
            orders: c.total_orders ?? c.order_count ?? 0,
            segment: c.customer_type || 'General',
            avatar: (c.customer_name || c.name || 'C').charAt(0),
            email: c.email,
            phone: c.phone,
          })));
        }
      } catch { /* customers endpoint optional */ }

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load sales data';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchSalesData();
    message.success('Refreshing data...');
  };

  const handleExport = () => {
    try {
      const now = new Date().toISOString().split('T')[0];
      let csvContent = 'Metric,Value\n';
      csvContent += `Total Sales,${salesStats.totalSales}\n`;
      csvContent += `Pipeline Value,${salesStats.pipelineValue}\n`;
      csvContent += `Open Quotes,${salesStats.quotesOpen}\n`;
      csvContent += `Orders This Month,${salesStats.ordersThisMonth}\n`;
      csvContent += `Average Deal Size,${salesStats.avgDealSize}\n`;
      csvContent += `Win Rate,${salesStats.winRate}%\n`;
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.setAttribute('href', URL.createObjectURL(blob));
      link.setAttribute('download', `sales-summary-${now}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      message.success('Summary exported!');
    } catch {
      message.error('Export failed');
    }
  };

  const formatCurrency = (amount: number) => `R ${amount.toLocaleString('en-ZA')}`;

  const getStatusTag = (status: string) => {
    const configs: Record<string, { color: string; text: string }> = {
      sent: { color: 'blue', text: 'Sent' },
      viewed: { color: 'purple', text: 'Viewed' },
      accepted: { color: 'green', text: 'Accepted' },
      expired: { color: 'red', text: 'Expired' },
      draft: { color: 'default', text: 'Draft' },
      processing: { color: 'blue', text: 'Processing' },
      shipped: { color: 'cyan', text: 'Shipped' },
      delivered: { color: 'green', text: 'Delivered' },
      invoiced: { color: 'purple', text: 'Invoiced' },
      pending: { color: 'orange', text: 'Pending' },
      won: { color: 'green', text: 'Won' },
      lost: { color: 'red', text: 'Lost' },
    };
    const config = configs[status] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // Loading state
  if (loading) {
    return (
      <HubLayout>
        <HubHeader
          title="Sales & CRM"
          subtitle="Quotes, Orders & Customer Relationship Management"
          icon={<ShoppingCartOutlined />}
          gradient="cyan"
        />
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
          <Spin size="large" tip="Loading sales data..." />
        </div>
      </HubLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <HubLayout>
        <HubHeader
          title="Sales & CRM"
          subtitle="Quotes, Orders & Customer Relationship Management"
          icon={<ShoppingCartOutlined />}
          gradient="cyan"
        />
        <Alert
          message="Failed to Load Data"
          description={error}
          type="error"
          showIcon
          style={{ margin: 24 }}
          action={<Button onClick={() => window.location.reload()}>Retry</Button>}
        />
      </HubLayout>
    );
  }

  const quoteColumns = [
    { title: 'Quote #', dataIndex: 'id', key: 'id', render: (t: string) => <Text strong style={{ color: '#667eea' }}>{t}</Text> },
    { title: 'Customer', dataIndex: 'customer', key: 'customer' },
    { title: 'Amount', dataIndex: 'amount', key: 'amount', render: (v: number) => <Text strong>{formatCurrency(v)}</Text> },
    { title: 'Valid Until', dataIndex: 'validUntil', key: 'validUntil' },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s: string) => getStatusTag(s) },
    {
      title: 'Actions', key: 'actions',
      render: () => (
        <Button type="link" size="small" onClick={() => navigate(`${basePath}/quotations`)}>View All</Button>
      ),
    },
  ];

  const orderColumns = [
    { title: 'Order #', dataIndex: 'id', key: 'id', render: (t: string) => <Text strong style={{ color: '#10b981' }}>{t}</Text> },
    { title: 'Customer', dataIndex: 'customer', key: 'customer' },
    { title: 'Items', dataIndex: 'items', key: 'items' },
    { title: 'Amount', dataIndex: 'amount', key: 'amount', render: (v: number) => <Text strong>{formatCurrency(v)}</Text> },
    { title: 'Date', dataIndex: 'date', key: 'date' },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s: string) => getStatusTag(s) },
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
            <Button icon={<SyncOutlined />} onClick={handleRefresh} loading={loading}>Refresh</Button>
            <Button icon={<DownloadOutlined />} onClick={handleExport}>Export</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate(`${basePath}/quotations`)}>
              New Quote
            </Button>
          </>
        }
      />

      <StatusBanner
        gradient="cyan"
        icon={<LineChartOutlined />}
        title="Sales Performance"
        subtitle={new Date().toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })}
        stats={[
          { title: 'Total Sales', value: salesStats.totalSales, prefix: 'R', span: 4 },
          { title: 'Pipeline Value', value: salesStats.pipelineValue, prefix: 'R', span: 4 },
          { title: 'Open Quotes', value: salesStats.quotesOpen, span: 3 },
          { title: 'Orders This Month', value: salesStats.ordersThisMonth, span: 4 },
          { title: 'Avg Deal Size', value: salesStats.avgDealSize, prefix: 'R', span: 4 },
        ]}
      />

      <Row gutter={24} style={{ marginTop: 24 }}>
        {/* Main Content */}
        <Col span={16}>
          {/* Sales Pipeline */}
          <Card title="Sales Pipeline" style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', gap: 16 }}>
              {pipelineStages.map(stage => (
                <div key={stage.stage} style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{
                    width: '100%', height: 8, background: stage.color,
                    borderRadius: 4, marginBottom: 12,
                  }} />
                  <Text strong>{stage.stage}</Text>
                  <div><Badge count={stage.count} style={{ backgroundColor: stage.color }} /></div>
                  <Text type="secondary" style={{ fontSize: 12 }}>{formatCurrency(stage.value)}</Text>
                </div>
              ))}
            </div>
          </Card>

          {/* Recent Quotes */}
          <Card
            title="Recent Quotes"
            style={{ marginBottom: 24 }}
            extra={
              <Space>
                <Button icon={<PlusOutlined />} onClick={() => navigate(`${basePath}/quotations`)}>New Quote</Button>
                <Button type="link" onClick={() => navigate(`${basePath}/quotations`)}>View All</Button>
              </Space>
            }
          >
            <Table
              dataSource={recentQuotes}
              columns={quoteColumns}
              rowKey="id"
              pagination={false}
              size="middle"
              locale={{ emptyText: 'No quotes yet — create your first quotation!' }}
            />
          </Card>

          {/* Recent Orders */}
          <Card
            title="Recent Orders"
            extra={
              <Space>
                <Button icon={<PlusOutlined />} onClick={() => navigate(`${basePath}/orders`)}>New Order</Button>
                <Button type="link" onClick={() => navigate(`${basePath}/orders`)}>View All</Button>
              </Space>
            }
          >
            <Table
              dataSource={recentOrders}
              columns={orderColumns}
              rowKey="id"
              pagination={false}
              size="middle"
              locale={{ emptyText: 'No orders yet' }}
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
          <Card title="Top Customers" style={{ marginBottom: 24 }}
            extra={<Button type="link" onClick={() => navigate(`${basePath}/customers`)}>View All</Button>}
          >
            <List
              dataSource={topCustomers.slice(0, 5)}
              locale={{ emptyText: 'No customers yet' }}
              renderItem={(customer, idx) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={
                      <Avatar style={{ backgroundColor: ['#667eea', '#10b981', '#f59e0b', '#ec4899', '#6366f1'][idx % 5] }}>
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
              { icon: <FileTextOutlined />, label: 'New Quotation', onClick: () => navigate(`${basePath}/quotations`) },
              { icon: <ShoppingCartOutlined />, label: 'New Order', onClick: () => navigate(`${basePath}/orders`) },
              { icon: <TeamOutlined />, label: 'Manage Customers', onClick: () => navigate(`${basePath}/customers`) },
              { icon: <DollarOutlined />, label: 'Invoices', onClick: () => navigate(`${basePath}/invoices`) },
              { icon: <AimOutlined />, label: 'Leads', onClick: () => navigate(`${basePath}/leads`) },
              { icon: <RocketOutlined />, label: 'Opportunities', onClick: () => navigate(`${basePath}/opportunities`) },
            ]}
          />
        </Col>
      </Row>
    </HubLayout>
  );
};

export default SalesDashboardPage;
