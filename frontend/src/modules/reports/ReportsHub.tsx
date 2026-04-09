/**
 * ReportsHub — Proper Hub for Reports & Analytics
 * 
 * Tabs:
 *  1. Dashboard — Quick-launch cards for core financial reports
 *  2. Financial Statements — Income Statement, Balance Sheet, Cash Flow, Trial Balance, GL
 *  3. Custom Reports — User-built report templates (ReportLibrary)
 *  4. Aged Analysis — Aged Debtors & Creditors (StatementsPage)
 */
import React, { useState } from 'react';
import { Card, Row, Col, Typography, Button, Space, Tag, Statistic, Divider } from 'antd';
import {
  BarChartOutlined,
  FileTextOutlined,
  FundOutlined,
  DollarOutlined,
  BankOutlined,
  AuditOutlined,
  CalculatorOutlined,
  PieChartOutlined,
  LineChartOutlined,
  AreaChartOutlined,
  ProfileOutlined,
  BookOutlined,
  SyncOutlined,
  StarOutlined,
  ClockCircleOutlined,
  RiseOutlined,
  FallOutlined,
  FileDoneOutlined,
  AccountBookOutlined,
} from '@ant-design/icons';
import { HubLayout, HubHeader, StatusBanner, HubTabs } from '../../components/hub';

// Financial report components (already exist in financial module)
import IncomeStatement from '../financial/components/IncomeStatement';
import BalanceSheet from '../financial/components/BalanceSheet';
import CashFlow from '../financial/components/CashFlow';
import TrialBalance from '../financial/components/TrialBalance';
import GLExplorer from '../financial/components/GLExplorer';
import BudgetVsActual from '../financial/components/BudgetVsActual';
import ReportLibrary from '../financial/components/ReportLibrary';
import StatementsPage from '../financial/components/StatementsPage';

const { Title, Text, Paragraph } = Typography;

// ── Dashboard Tab ──────────────────────────────────────────────
const ReportsDashboard: React.FC = () => {
  const reportCards = [
    {
      title: 'Income Statement',
      subtitle: 'Profit & Loss',
      icon: <RiseOutlined style={{ fontSize: 28, color: '#10b981' }} />,
      description: 'Revenue, expenses, and net profit for any period.',
      color: '#f0fdf4',
      border: '#bbf7d0',
      tag: 'IFRS',
    },
    {
      title: 'Balance Sheet',
      subtitle: 'Financial Position',
      icon: <BankOutlined style={{ fontSize: 28, color: '#6366f1' }} />,
      description: 'Assets, liabilities, and equity at a point in time.',
      color: '#eef2ff',
      border: '#c7d2fe',
      tag: 'IFRS',
    },
    {
      title: 'Cash Flow Statement',
      subtitle: 'Operating / Investing / Financing',
      icon: <FundOutlined style={{ fontSize: 28, color: '#06b6d4' }} />,
      description: 'Cash inflows and outflows by activity.',
      color: '#ecfeff',
      border: '#a5f3fc',
      tag: 'IAS 7',
    },
    {
      title: 'Trial Balance',
      subtitle: 'Debit & Credit Verification',
      icon: <CalculatorOutlined style={{ fontSize: 28, color: '#f59e0b' }} />,
      description: 'All account balances with debit/credit totals.',
      color: '#fffbeb',
      border: '#fde68a',
      tag: 'Core',
    },
    {
      title: 'General Ledger',
      subtitle: 'Transaction Detail',
      icon: <BookOutlined style={{ fontSize: 28, color: '#8b5cf6' }} />,
      description: 'All journal entries grouped by account.',
      color: '#faf5ff',
      border: '#ddd6fe',
      tag: 'Core',
    },
    {
      title: 'Aged Debtors',
      subtitle: 'Accounts Receivable Aging',
      icon: <ProfileOutlined style={{ fontSize: 28, color: '#ef4444' }} />,
      description: 'Outstanding customer balances by aging bucket.',
      color: '#fef2f2',
      border: '#fecaca',
      tag: 'AR',
    },
    {
      title: 'Aged Creditors',
      subtitle: 'Accounts Payable Aging',
      icon: <AccountBookOutlined style={{ fontSize: 28, color: '#ec4899' }} />,
      description: 'Outstanding supplier balances by aging bucket.',
      color: '#fdf2f8',
      border: '#fbcfe8',
      tag: 'AP',
    },
    {
      title: 'VAT Return',
      subtitle: 'Output VAT − Input VAT',
      icon: <AuditOutlined style={{ fontSize: 28, color: '#14b8a6' }} />,
      description: 'VAT collected vs paid for SARS submission.',
      color: '#f0fdfa',
      border: '#99f6e4',
      tag: 'Tax',
    },
    {
      title: 'Budget vs Actual',
      subtitle: 'Variance Analysis',
      icon: <AreaChartOutlined style={{ fontSize: 28, color: '#f97316' }} />,
      description: 'Compare actual results against budget.',
      color: '#fff7ed',
      border: '#fed7aa',
      tag: 'Analysis',
    },
  ];

  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={24}>
          <Text type="secondary" style={{ fontSize: 14 }}>
            Quick access to all financial reports. Click any report to open it in the Financial Statements tab.
          </Text>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        {reportCards.map((report, index) => (
          <Col xs={24} sm={12} lg={8} key={index}>
            <Card
              hoverable
              style={{
                background: report.color,
                border: `1px solid ${report.border}`,
                borderRadius: 12,
                height: '100%',
              }}
              bodyStyle={{ padding: '20px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                {report.icon}
                <Tag color="default" style={{ fontSize: 11 }}>{report.tag}</Tag>
              </div>
              <Title level={5} style={{ margin: 0, marginBottom: 2 }}>{report.title}</Title>
              <Text type="secondary" style={{ fontSize: 12 }}>{report.subtitle}</Text>
              <Paragraph type="secondary" style={{ fontSize: 13, marginTop: 8, marginBottom: 0 }}>
                {report.description}
              </Paragraph>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
};

// ── Financial Statements Tab (sub-selector) ───────────────────
const FinancialStatementsTab: React.FC = () => {
  const [activeStatement, setActiveStatement] = useState<string>('income-statement');

  const statements = [
    { key: 'income-statement', label: 'Income Statement', icon: <RiseOutlined /> },
    { key: 'balance-sheet', label: 'Balance Sheet', icon: <BankOutlined /> },
    { key: 'cash-flow', label: 'Cash Flow', icon: <FundOutlined /> },
    { key: 'trial-balance', label: 'Trial Balance', icon: <CalculatorOutlined /> },
    { key: 'general-ledger', label: 'General Ledger', icon: <BookOutlined /> },
    { key: 'budget-vs-actual', label: 'Budget vs Actual', icon: <AreaChartOutlined /> },
  ];

  const renderStatement = () => {
    switch (activeStatement) {
      case 'income-statement': return <IncomeStatement />;
      case 'balance-sheet': return <BalanceSheet />;
      case 'cash-flow': return <CashFlow />;
      case 'trial-balance': return <TrialBalance />;
      case 'general-ledger': return <GLExplorer />;
      case 'budget-vs-actual': return <BudgetVsActual />;
      default: return <IncomeStatement />;
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {statements.map(s => (
          <Button
            key={s.key}
            type={activeStatement === s.key ? 'primary' : 'default'}
            icon={s.icon}
            onClick={() => setActiveStatement(s.key)}
            size="middle"
          >
            {s.label}
          </Button>
        ))}
      </div>
      <div>{renderStatement()}</div>
    </div>
  );
};

// ── Main Hub ──────────────────────────────────────────────────
const ReportsHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  const tabs = [
    {
      key: 'dashboard',
      label: 'Dashboard',
      icon: <PieChartOutlined />,
      children: <ReportsDashboard />,
    },
    {
      key: 'statements',
      label: 'Financial Statements',
      icon: <FileTextOutlined />,
      children: <FinancialStatementsTab />,
    },
    {
      key: 'custom-reports',
      label: 'Custom Reports',
      icon: <BarChartOutlined />,
      children: <ReportLibrary />,
    },
    {
      key: 'aged-analysis',
      label: 'Aged Analysis',
      icon: <ClockCircleOutlined />,
      children: <StatementsPage />,
    },
  ];

  return (
    <HubLayout>
      <HubHeader
        title="Reports & Analytics"
        subtitle="Financial Statements, Analytics & Custom Reports"
        icon={<BarChartOutlined />}
        gradient="purple"
        actions={
          <>
            <Button icon={<SyncOutlined />}>Refresh</Button>
            <Button type="primary" icon={<FileTextOutlined />} onClick={() => setActiveTab('statements')}>
              Financial Statements
            </Button>
          </>
        }
      />

      <StatusBanner
        gradient="purple"
        icon={<LineChartOutlined />}
        title="Reports Overview"
        subtitle="Analytics & Insights"
        stats={[
          { title: 'Financial Reports', value: 9, span: 5 },
          { title: 'Custom Reports', value: 'Builder', span: 5 },
          { title: 'Statements', value: 'Debtors & Creditors', span: 7 },
          { title: 'Compliance', value: 'IFRS / IAS', span: 5 },
        ]}
      />

      <HubTabs
        theme="purple"
        tabs={tabs}
        activeKey={activeTab}
        onChange={setActiveTab}
      />
    </HubLayout>
  );
};

export default ReportsHub;
