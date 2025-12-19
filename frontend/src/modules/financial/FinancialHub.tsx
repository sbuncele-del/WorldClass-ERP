import React, { useState, useEffect } from 'react';
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
  message,
  Divider,
  List,
  Alert,
  Spin,
  Empty,
} from 'antd';
import {
  DollarOutlined,
  BankOutlined,
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
  AuditOutlined,
  CalculatorOutlined,
  FileDoneOutlined,
  SafetyCertificateOutlined,
  GlobalOutlined,
  BookOutlined,
  LoadingOutlined,
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
import { financialService } from '../../services/financial.service';
import type { FinancialStats, JournalEntry, TrialBalanceEntry } from '../../services/financial.service';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

// Types for state
interface FinancialStatsState {
  revenue: number;
  expenses: number;
  netIncome: number;
  grossMargin: number;
  totalAssets: number;
  totalLiabilities: number;
  equity: number;
  cashBalance: number;
  receivables: number;
  payables: number;
  currentPeriod: string;
  periodStatus: string;
  closingDate: string;
}

interface TrialBalanceItem {
  code: string;
  name: string;
  debit: number;
  credit: number;
  type: string;
}

interface JournalItem {
  id: string;
  date: string;
  description: string;
  debit: number;
  credit: number;
  status: string;
  createdBy: string;
}

interface FinancialReport {
  name: string;
  period: string;
  status: string;
  icon: React.ReactNode;
}

interface PeriodStatus {
  period: string;
  status: string;
  closedDate: string | null;
}

// Default financial reports (these are UI configs, not from API)
const defaultFinancialReports: FinancialReport[] = [
  { name: 'Income Statement', period: 'December 2025', status: 'ready', icon: <BarChartOutlined /> },
  { name: 'Balance Sheet', period: 'December 2025', status: 'ready', icon: <PieChartOutlined /> },
  { name: 'Cash Flow Statement', period: 'December 2025', status: 'generating', icon: <DollarOutlined /> },
  { name: 'Trial Balance', period: 'December 2025', status: 'ready', icon: <FileTextOutlined /> },
  { name: 'General Ledger', period: 'December 2025', status: 'ready', icon: <BookOutlined /> },
  { name: 'Aged Receivables', period: 'December 2025', status: 'ready', icon: <CalendarOutlined /> },
  { name: 'Aged Payables', period: 'December 2025', status: 'ready', icon: <CalendarOutlined /> },
  { name: 'VAT Report', period: 'November 2025', status: 'submitted', icon: <SafetyCertificateOutlined /> },
];

const FinancialHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showJournalModal, setShowJournalModal] = useState(false);

  // API State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [financialStats, setFinancialStats] = useState<FinancialStatsState>({
    revenue: 0,
    expenses: 0,
    netIncome: 0,
    grossMargin: 0,
    totalAssets: 0,
    totalLiabilities: 0,
    equity: 0,
    cashBalance: 0,
    receivables: 0,
    payables: 0,
    currentPeriod: 'December 2025',
    periodStatus: 'open',
    closingDate: '2026-01-15',
  });
  const [trialBalance, setTrialBalance] = useState<TrialBalanceItem[]>([]);
  const [recentJournals, setRecentJournals] = useState<JournalItem[]>([]);
  const [financialReports] = useState<FinancialReport[]>(defaultFinancialReports);
  const [periodStatuses, setPeriodStatuses] = useState<PeriodStatus[]>([
    { period: 'October 2025', status: 'closed', closedDate: '2025-11-10' },
    { period: 'November 2025', status: 'closed', closedDate: '2025-12-08' },
    { period: 'December 2025', status: 'open', closedDate: null },
    { period: 'January 2026', status: 'future', closedDate: null },
  ]);

  // Fetch data from API
  useEffect(() => {
    const fetchFinancialData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch stats
        const stats = await financialService.getStats();
        const revenue = parseFloat(stats.total_revenue) || 0;
        const expenses = parseFloat(stats.total_expenses) || 0;
        const assets = parseFloat(stats.total_assets) || 0;
        const liabilities = parseFloat(stats.total_liabilities) || 0;
        
        setFinancialStats({
          revenue,
          expenses,
          netIncome: parseFloat(stats.net_income) || (revenue - expenses),
          grossMargin: revenue > 0 ? ((revenue - expenses) / revenue) * 100 : 0,
          totalAssets: assets,
          totalLiabilities: liabilities,
          equity: parseFloat(stats.equity) || (assets - liabilities),
          cashBalance: parseFloat(stats.cash_balance) || 0,
          receivables: parseFloat(stats.receivables) || 0,
          payables: parseFloat(stats.payables) || 0,
          currentPeriod: 'December 2025',
          periodStatus: 'open',
          closingDate: '2026-01-15',
        });

        // Fetch trial balance
        try {
          const tbResponse = await financialService.getTrialBalance();
          if (tbResponse.data && Array.isArray(tbResponse.data)) {
            setTrialBalance(tbResponse.data.map((entry: TrialBalanceEntry) => ({
              code: entry.account_code,
              name: entry.account_name,
              debit: entry.debit || 0,
              credit: entry.credit || 0,
              type: entry.account_type?.toLowerCase() || 'asset',
            })));
          }
        } catch {
          // Use derived trial balance from stats if endpoint fails
          setTrialBalance([
            { code: '1000', name: 'Assets', debit: assets, credit: 0, type: 'asset' },
            { code: '2000', name: 'Liabilities', debit: 0, credit: liabilities, type: 'liability' },
            { code: '3000', name: 'Equity', debit: 0, credit: assets - liabilities, type: 'equity' },
            { code: '4000', name: 'Revenue', debit: 0, credit: revenue, type: 'revenue' },
            { code: '5000', name: 'Expenses', debit: expenses, credit: 0, type: 'expense' },
          ]);
        }

        // Fetch journal entries
        try {
          const journalsResponse = await financialService.getJournalEntries({ limit: 10 });
          if (journalsResponse.data && Array.isArray(journalsResponse.data)) {
            setRecentJournals(journalsResponse.data.map((j: JournalEntry) => ({
              id: j.journal_number || j.journal_id,
              date: j.entry_date,
              description: j.description,
              debit: j.total_debit,
              credit: j.total_credit,
              status: j.status?.toLowerCase() || 'posted',
              createdBy: j.created_by || 'System',
            })));
          }
        } catch {
          // Leave empty if no journals
          setRecentJournals([]);
        }

        // Fetch periods
        try {
          const periodsResponse = await financialService.getPeriods();
          if (periodsResponse.data && Array.isArray(periodsResponse.data)) {
            setPeriodStatuses(periodsResponse.data.map(p => ({
              period: p.period,
              status: p.status,
              closedDate: p.closed_date || null,
            })));
          }
        } catch {
          // Keep defaults
        }

      } catch (err: unknown) {
        console.error('Failed to fetch financial data:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to load financial data';
        setError(errorMessage);
        message.error('Failed to load financial data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchFinancialData();
  }, []);

  // Refresh data function
  const handleRefresh = () => {
    setLoading(true);
    financialService.getStats()
      .then(stats => {
        const revenue = parseFloat(stats.total_revenue) || 0;
        const expenses = parseFloat(stats.total_expenses) || 0;
        setFinancialStats(prev => ({
          ...prev,
          revenue,
          expenses,
          netIncome: revenue - expenses,
          cashBalance: parseFloat(stats.cash_balance) || 0,
        }));
        message.success('Data refreshed');
      })
      .catch(() => message.error('Failed to refresh'))
      .finally(() => setLoading(false));
  };

  const formatCurrency = (amount: number) => `R ${amount.toLocaleString('en-ZA')}`;

  const getStatusTag = (status: string) => {
    const configs: Record<string, { color: string; text: string; icon?: React.ReactNode }> = {
      'posted': { color: 'green', text: 'Posted', icon: <CheckCircleOutlined /> },
      'pending': { color: 'orange', text: 'Pending', icon: <ClockCircleOutlined /> },
      'draft': { color: 'default', text: 'Draft' },
      'ready': { color: 'green', text: 'Ready', icon: <CheckCircleOutlined /> },
      'generating': { color: 'blue', text: 'Generating', icon: <SyncOutlined spin /> },
      'submitted': { color: 'purple', text: 'Submitted' },
      'open': { color: 'green', text: 'Open' },
      'closed': { color: 'default', text: 'Closed' },
      'future': { color: 'blue', text: 'Future' },
    };
    const config = configs[status] || { color: 'default', text: status };
    return <Tag color={config.color} icon={config.icon}>{config.text}</Tag>;
  };

  const journalColumns = [
    {
      title: 'Reference',
      dataIndex: 'id',
      key: 'id',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'Debit',
      dataIndex: 'debit',
      key: 'debit',
      render: (v: number) => formatCurrency(v),
    },
    {
      title: 'Credit',
      dataIndex: 'credit',
      key: 'credit',
      render: (v: number) => formatCurrency(v),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusTag(status),
    },
    {
      title: 'Created By',
      dataIndex: 'createdBy',
      key: 'createdBy',
      render: (text: string) => <Text type="secondary">{text}</Text>,
    },
  ];

  const tabs = [
    {
      key: 'dashboard',
      label: 'Dashboard',
      icon: <BarChartOutlined />,
      children: (
        <Row gutter={24}>
          {/* Left Column - Key Metrics */}
          <Col span={16}>
            {/* P&L Summary */}
            <Card title="Profit & Loss Summary" style={{ marginBottom: 24 }}>
              <Row gutter={24}>
                <Col span={8}>
                  <Statistic
                    title="Revenue"
                    value={financialStats.revenue}
                    prefix="R"
                    valueStyle={{ color: '#10b981' }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="Expenses"
                    value={financialStats.expenses}
                    prefix="R"
                    valueStyle={{ color: '#ef4444' }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="Net Income"
                    value={financialStats.netIncome}
                    prefix="R"
                    valueStyle={{ color: '#667eea', fontWeight: 'bold' }}
                  />
                </Col>
              </Row>
              <Divider style={{ margin: '16px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text type="secondary">Gross Margin</Text>
                <Progress 
                  percent={financialStats.grossMargin} 
                  strokeColor="#667eea"
                  style={{ width: 200 }}
                />
              </div>
            </Card>

            {/* Recent Journal Entries */}
            <Card 
              title="Recent Journal Entries"
              extra={
                <Space>
                  <Button icon={<PlusOutlined />} onClick={() => setShowJournalModal(true)}>
                    New Entry
                  </Button>
                  <Button type="link">View All</Button>
                </Space>
              }
            >
              <Table
                dataSource={recentJournals}
                columns={journalColumns}
                rowKey="id"
                pagination={false}
                size="middle"
              />
            </Card>
          </Col>

          {/* Right Column */}
          <Col span={8}>
            {/* Balance Sheet Summary */}
            <Card title="Balance Sheet Summary" style={{ marginBottom: 24 }}>
              <div className="info-list-item" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text>Total Assets</Text>
                <Text strong>{formatCurrency(financialStats.totalAssets)}</Text>
              </div>
              <div className="info-list-item" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text>Total Liabilities</Text>
                <Text strong style={{ color: '#ef4444' }}>{formatCurrency(financialStats.totalLiabilities)}</Text>
              </div>
              <Divider style={{ margin: '12px 0' }} />
              <div className="info-list-item" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text strong>Shareholders' Equity</Text>
                <Text strong style={{ color: '#10b981' }}>{formatCurrency(financialStats.equity)}</Text>
              </div>
            </Card>

            {/* Quick Actions */}
            <QuickActionsCard
              title="Quick Actions"
              actions={[
                { icon: <PlusOutlined />, label: 'Journal Entry', onClick: () => setShowJournalModal(true) },
                { icon: <CalculatorOutlined />, label: 'Reconcile' },
                { icon: <PrinterOutlined />, label: 'Print Reports' },
                { icon: <AuditOutlined />, label: 'Period Close' },
              ]}
            />

            {/* Period Status */}
            <Card title="Period Status" style={{ marginTop: 24 }}>
              {periodStatuses.map((p, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: idx < periodStatuses.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                  <Text>{p.period}</Text>
                  {getStatusTag(p.status)}
                </div>
              ))}
            </Card>
          </Col>
        </Row>
      ),
    },
    {
      key: 'reports',
      label: 'Reports',
      icon: <FileTextOutlined />,
      children: (
        <Row gutter={24}>
          <Col span={16}>
            <Card title="Financial Reports">
              <List
                dataSource={financialReports}
                renderItem={item => (
                  <List.Item
                    actions={[
                      <Button type="link" icon={<DownloadOutlined />} key="download">Download</Button>,
                      <Button type="link" icon={<PrinterOutlined />} key="print">Print</Button>,
                    ]}
                  >
                    <List.Item.Meta
                      avatar={<span style={{ fontSize: 24, color: '#667eea' }}>{item.icon}</span>}
                      title={<Text strong>{item.name}</Text>}
                      description={item.period}
                    />
                    {getStatusTag(item.status)}
                  </List.Item>
                )}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card title="Report Schedule">
              <Paragraph>Automated report generation and distribution settings.</Paragraph>
            </Card>
          </Col>
        </Row>
      ),
    },
    {
      key: 'ledger',
      label: 'General Ledger',
      icon: <BookOutlined />,
      children: (
        <Card title="Trial Balance">
          <Table
            dataSource={trialBalance}
            columns={[
              { title: 'Code', dataIndex: 'code', key: 'code' },
              { title: 'Account', dataIndex: 'name', key: 'name', render: (t: string) => <Text strong>{t}</Text> },
              { title: 'Debit', dataIndex: 'debit', key: 'debit', render: (v: number) => v > 0 ? formatCurrency(v) : '-', align: 'right' as const },
              { title: 'Credit', dataIndex: 'credit', key: 'credit', render: (v: number) => v > 0 ? formatCurrency(v) : '-', align: 'right' as const },
            ]}
            rowKey="code"
            pagination={false}
            summary={() => (
              <Table.Summary>
                <Table.Summary.Row style={{ background: '#f8fafc' }}>
                  <Table.Summary.Cell index={0} />
                  <Table.Summary.Cell index={1}><Text strong>Total</Text></Table.Summary.Cell>
                  <Table.Summary.Cell index={2} align="right">
                    <Text strong>{formatCurrency(trialBalance.reduce((sum, r) => sum + r.debit, 0))}</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={3} align="right">
                    <Text strong>{formatCurrency(trialBalance.reduce((sum, r) => sum + r.credit, 0))}</Text>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              </Table.Summary>
            )}
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
            <Card title="Chart of Accounts">
              <Paragraph>Manage your account structure and categories.</Paragraph>
              <Button type="primary" icon={<SettingOutlined />}>Configure Accounts</Button>
            </Card>
          </Col>
          <Col span={12}>
            <Card title="Fiscal Year Settings">
              <Form layout="vertical">
                <Form.Item label="Fiscal Year Start">
                  <Select defaultValue="march">
                    <Select.Option value="january">January</Select.Option>
                    <Select.Option value="march">March (RSA Standard)</Select.Option>
                    <Select.Option value="july">July</Select.Option>
                  </Select>
                </Form.Item>
                <Button type="primary">Save Settings</Button>
              </Form>
            </Card>
          </Col>
        </Row>
      ),
    },
  ];

  return (
    <HubLayout>
      <HubHeader
        title="Financial Management"
        subtitle="General Ledger, Reporting & Period Management"
        icon={<DollarOutlined />}
        gradient="blue"
        actions={
          <>
            <Button icon={<SyncOutlined />}>Refresh</Button>
            <Button icon={<DownloadOutlined />}>Export</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowJournalModal(true)}>
              New Journal Entry
            </Button>
          </>
        }
      />

      <StatusBanner
        gradient="blue"
        icon={<BarChartOutlined />}
        title="Financial Overview"
        subtitle={financialStats.currentPeriod}
        stats={[
          { title: 'Revenue', value: financialStats.revenue, prefix: 'R', span: 4 },
          { title: 'Net Income', value: financialStats.netIncome, prefix: 'R', valueStyle: { color: '#86efac' }, span: 4 },
          { title: 'Cash Balance', value: financialStats.cashBalance, prefix: 'R', span: 4 },
          { title: 'Receivables', value: financialStats.receivables, prefix: 'R', span: 4 },
          { title: 'Period', value: 'Open', valueStyle: { color: '#86efac' }, span: 3 },
        ]}
      />

      <HubTabs 
        theme="blue"
        tabs={tabs}
        activeKey={activeTab}
        onChange={setActiveTab}
      />

      {/* New Journal Entry Modal */}
      <Modal
        title="New Journal Entry"
        open={showJournalModal}
        onCancel={() => setShowJournalModal(false)}
        footer={[
          <Button key="cancel" onClick={() => setShowJournalModal(false)}>Cancel</Button>,
          <Button key="draft">Save as Draft</Button>,
          <Button key="post" type="primary" onClick={() => { message.success('Journal entry posted'); setShowJournalModal(false); }}>
            Post Entry
          </Button>
        ]}
        width={700}
      >
        <Form layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Date" required>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Reference">
                <Input placeholder="Auto-generated" disabled />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Description" required>
            <Input placeholder="Enter journal description" />
          </Form.Item>
          <Divider>Journal Lines</Divider>
          <Row gutter={16}>
            <Col span={10}>
              <Form.Item label="Account">
                <Select placeholder="Select account">
                  <Select.Option value="1000">1000 - Assets</Select.Option>
                  <Select.Option value="2000">2000 - Liabilities</Select.Option>
                  <Select.Option value="4000">4000 - Revenue</Select.Option>
                  <Select.Option value="5000">5000 - Expenses</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={7}>
              <Form.Item label="Debit">
                <Input prefix="R" placeholder="0.00" />
              </Form.Item>
            </Col>
            <Col span={7}>
              <Form.Item label="Credit">
                <Input prefix="R" placeholder="0.00" />
              </Form.Item>
            </Col>
          </Row>
          <Button type="dashed" icon={<PlusOutlined />} style={{ width: '100%' }}>
            Add Line
          </Button>
        </Form>
      </Modal>
    </HubLayout>
  );
};

export default FinancialHub;
