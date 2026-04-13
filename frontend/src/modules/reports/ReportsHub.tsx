/**
 * ReportsHub — World-Class Reports & Analytics Centre
 * 
 * Tabs:
 *  1. Dashboard — Live KPIs, financial snapshot, quick-launch report cards
 *  2. Financial Statements — Income Statement, Balance Sheet, Cash Flow, Trial Balance, GL
 *  3. Tax & VAT — VAT201 calculation, tax reconciliation
 *  4. Receivables & Payables — Aged analysis, customer/supplier statements
 *  5. Custom Reports — User-built report templates (ReportLibrary)
 */
import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Typography, Button, Space, Tag, Statistic, Divider, Spin, Table, Progress, Alert } from 'antd';
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
  ArrowUpOutlined,
  ArrowDownOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  SafetyCertificateOutlined,
  WalletOutlined,
  TeamOutlined,
  ShopOutlined,
  PrinterOutlined,
} from '@ant-design/icons';
import { HubLayout, HubHeader, StatusBanner, HubTabs } from '../../components/hub';
import { apiGet } from '../../services/api.service';

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

// ── Live Dashboard Tab ──────────────────────────────────────────────
const ReportsDashboard: React.FC<{ onNavigate: (tab: string, sub?: string) => void }> = ({ onNavigate }) => {
  const [kpis, setKpis] = useState<any>(null);
  const [trialBalance, setTrialBalance] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [tbRes] = await Promise.all([
        apiGet<any>('/api/financial/reports/trial-balance', { as_of_date: new Date().toISOString().split('T')[0] }).catch(() => null),
      ]);

      if (tbRes?.success && tbRes.data) {
        setTrialBalance(tbRes.data);
        // Extract KPIs from trial balance
        const accounts = Array.isArray(tbRes.data) ? tbRes.data : (tbRes.data.accounts || []);
        const findAccount = (code: string) => accounts.find((a: any) => a.account_code === code);
        const getBalance = (code: string) => {
          const acc = findAccount(code);
          return acc ? Math.abs(parseFloat(acc.balance || acc.total_debits || 0) - parseFloat(acc.total_credits || 0)) : 0;
        };
        const getDebit = (code: string) => parseFloat(findAccount(code)?.debit || findAccount(code)?.total_debits || 0);
        const getCredit = (code: string) => parseFloat(findAccount(code)?.credit || findAccount(code)?.total_credits || 0);

        // Calculate from real GL data
        const revenue = getCredit('4100');
        const cogs = getDebit('5100');
        const tradeDebtors = getDebit('1210');
        const tradeCreditors = getCredit('2111');
        const vatOutput = getCredit('2115');
        const vatInput = getDebit('1230');
        const grossProfit = revenue - cogs;
        const netVat = vatOutput - (vatInput - getCredit('1230'));

        setKpis({
          revenue,
          cogs,
          grossProfit,
          grossMargin: revenue > 0 ? (grossProfit / revenue * 100) : 0,
          netProfit: grossProfit,
          tradeDebtors,
          tradeCreditors,
          vatOutput,
          vatInput: getDebit('1230') - getCredit('1230'),
          netVat,
        });
      }
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-ZA', {
    style: 'currency', currency: 'ZAR', minimumFractionDigits: 0, maximumFractionDigits: 0
  }).format(val);

  const reportCategories = [
    {
      title: 'Financial Statements',
      description: 'Core IFRS-compliant financial reports',
      color: '#6366f1',
      bg: '#eef2ff',
      border: '#c7d2fe',
      reports: [
        { name: 'Income Statement (P&L)', tag: 'IFRS', icon: <RiseOutlined />, action: () => onNavigate('statements', 'income-statement') },
        { name: 'Balance Sheet', tag: 'IFRS', icon: <BankOutlined />, action: () => onNavigate('statements', 'balance-sheet') },
        { name: 'Cash Flow Statement', tag: 'IAS 7', icon: <FundOutlined />, action: () => onNavigate('statements', 'cash-flow') },
        { name: 'Trial Balance', tag: 'Core', icon: <CalculatorOutlined />, action: () => onNavigate('statements', 'trial-balance') },
        { name: 'General Ledger', tag: 'Core', icon: <BookOutlined />, action: () => onNavigate('statements', 'general-ledger') },
        { name: 'Budget vs Actual', tag: 'Analysis', icon: <AreaChartOutlined />, action: () => onNavigate('statements', 'budget-vs-actual') },
      ]
    },
    {
      title: 'Tax & VAT',
      description: 'SARS-compliant tax reports',
      color: '#14b8a6',
      bg: '#f0fdfa',
      border: '#99f6e4',
      reports: [
        { name: 'VAT Return (VAT201)', tag: 'SARS', icon: <AuditOutlined />, action: () => onNavigate('vat') },
        { name: 'VAT Liability Report', tag: 'Tax', icon: <SafetyCertificateOutlined />, action: () => onNavigate('vat') },
      ]
    },
    {
      title: 'Receivables & Payables',
      description: 'Customer and supplier aging analysis',
      color: '#ef4444',
      bg: '#fef2f2',
      border: '#fecaca',
      reports: [
        { name: 'Aged Debtors (Receivables)', tag: 'AR', icon: <TeamOutlined />, action: () => onNavigate('aged-analysis') },
        { name: 'Aged Creditors (Payables)', tag: 'AP', icon: <ShopOutlined />, action: () => onNavigate('aged-analysis') },
        { name: 'Customer Statements', tag: 'AR', icon: <ProfileOutlined />, action: () => onNavigate('aged-analysis') },
        { name: 'Supplier Statements', tag: 'AP', icon: <AccountBookOutlined />, action: () => onNavigate('aged-analysis') },
      ]
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text type="secondary">Loading financial dashboard...</Text>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* KPI Cards */}
      {kpis && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} md={6}>
            <Card style={{ borderRadius: 12, borderLeft: '4px solid #10b981' }}>
              <Statistic
                title={<span style={{ fontSize: 12, color: '#6b7280' }}>Revenue (YTD)</span>}
                value={kpis.revenue}
                formatter={(val: any) => formatCurrency(val as number)}
                valueStyle={{ color: '#10b981', fontSize: 20, fontWeight: 700 }}
                prefix={<RiseOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card style={{ borderRadius: 12, borderLeft: '4px solid #6366f1' }}>
              <Statistic
                title={<span style={{ fontSize: 12, color: '#6b7280' }}>Gross Profit</span>}
                value={kpis.grossProfit}
                formatter={(val: any) => formatCurrency(val as number)}
                valueStyle={{ color: '#6366f1', fontSize: 20, fontWeight: 700 }}
                suffix={<Tag color="blue" style={{ fontSize: 10, marginLeft: 4 }}>{kpis.grossMargin.toFixed(1)}%</Tag>}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card style={{ borderRadius: 12, borderLeft: '4px solid #f59e0b' }}>
              <Statistic
                title={<span style={{ fontSize: 12, color: '#6b7280' }}>Trade Debtors</span>}
                value={kpis.tradeDebtors}
                formatter={(val: any) => formatCurrency(val as number)}
                valueStyle={{ color: '#f59e0b', fontSize: 20, fontWeight: 700 }}
                prefix={<WalletOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card style={{ borderRadius: 12, borderLeft: '4px solid #ef4444' }}>
              <Statistic
                title={<span style={{ fontSize: 12, color: '#6b7280' }}>Trade Creditors</span>}
                value={kpis.tradeCreditors}
                formatter={(val: any) => formatCurrency(val as number)}
                valueStyle={{ color: '#ef4444', fontSize: 20, fontWeight: 700 }}
                prefix={<ShopOutlined />}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* VAT Summary Row */}
      {kpis && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={8}>
            <Card size="small" style={{ borderRadius: 12, background: '#f0fdfa', border: '1px solid #99f6e4' }}>
              <Statistic
                title={<span style={{ fontSize: 11 }}>VAT Output (Collected)</span>}
                value={kpis.vatOutput}
                formatter={(val: any) => formatCurrency(val as number)}
                valueStyle={{ fontSize: 16, color: '#14b8a6' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card size="small" style={{ borderRadius: 12, background: '#eff6ff', border: '1px solid #bfdbfe' }}>
              <Statistic
                title={<span style={{ fontSize: 11 }}>VAT Input (Paid)</span>}
                value={kpis.vatInput}
                formatter={(val: any) => formatCurrency(val as number)}
                valueStyle={{ fontSize: 16, color: '#3b82f6' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card size="small" style={{ borderRadius: 12, background: kpis.netVat >= 0 ? '#fef2f2' : '#f0fdf4', border: `1px solid ${kpis.netVat >= 0 ? '#fecaca' : '#bbf7d0'}` }}>
              <Statistic
                title={<span style={{ fontSize: 11 }}>Net VAT {kpis.netVat >= 0 ? '(Payable to SARS)' : '(Refundable)'}</span>}
                value={Math.abs(kpis.netVat)}
                formatter={(val: any) => formatCurrency(val as number)}
                valueStyle={{ fontSize: 16, color: kpis.netVat >= 0 ? '#ef4444' : '#10b981' }}
                prefix={kpis.netVat >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Report Categories */}
      <Row gutter={[16, 16]}>
        {reportCategories.map((cat, idx) => (
          <Col xs={24} lg={8} key={idx}>
            <Card
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: cat.color }} />
                  <span style={{ fontSize: 15, fontWeight: 600 }}>{cat.title}</span>
                </div>
              }
              extra={<Text type="secondary" style={{ fontSize: 11 }}>{cat.reports.length} reports</Text>}
              style={{ borderRadius: 12, height: '100%', border: `1px solid ${cat.border}` }}
              bodyStyle={{ padding: '8px 16px' }}
              headStyle={{ borderBottom: `2px solid ${cat.color}` }}
            >
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>{cat.description}</Text>
              {cat.reports.map((report, rIdx) => (
                <div
                  key={rIdx}
                  onClick={report.action}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 4px',
                    cursor: 'pointer',
                    borderBottom: rIdx < cat.reports.length - 1 ? '1px solid #f3f4f6' : 'none',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = cat.bg)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <Space size={8}>
                    <span style={{ color: cat.color }}>{report.icon}</span>
                    <Text style={{ fontSize: 13 }}>{report.name}</Text>
                  </Space>
                  <Tag style={{ fontSize: 10, margin: 0 }}>{report.tag}</Tag>
                </div>
              ))}
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
};

// ── Financial Statements Tab (sub-selector) ───────────────────
const FinancialStatementsTab: React.FC<{ initialStatement?: string }> = ({ initialStatement }) => {
  const [activeStatement, setActiveStatement] = useState<string>(initialStatement || 'income-statement');

  useEffect(() => {
    if (initialStatement) setActiveStatement(initialStatement);
  }, [initialStatement]);

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

// ── VAT & Tax Tab ─────────────────────────────────────────────
const VATReportTab: React.FC = () => {
  const [vatData, setVatData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('annual');
  const [customStart, setCustomStart] = useState('2025-01-01');
  const [customEnd, setCustomEnd] = useState('2025-12-31');

  useEffect(() => {
    fetchVatReport();
  }, [period]);

  const fetchVatReport = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { period };
      if (period === 'custom') {
        params.start_date = customStart;
        params.end_date = customEnd;
      }
      // Try V2 route first, fall back to module route
      let result = await apiGet<any>('/api/financial/reports/vat-report', params).catch(() => null);
      if (!result?.success) {
        result = await apiGet<any>('/api/financial/vat-report', { fromDate: customStart, toDate: customEnd });
      }
      if (result?.success) {
        setVatData(result.data);
      }
    } catch (err) {
      console.error('VAT report error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-ZA', {
    style: 'currency', currency: 'ZAR', minimumFractionDigits: 2
  }).format(val);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /><div style={{ marginTop: 16 }}>Generating VAT Report...</div></div>;
  }

  if (!vatData) {
    return <Alert message="No VAT data available for this period" type="info" showIcon />;
  }

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <Text strong>Period:</Text>
        {['monthly', 'quarterly', 'annual', 'custom'].map(p => (
          <Button key={p} size="small" type={period === p ? 'primary' : 'default'} onClick={() => setPeriod(p)}>
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </Button>
        ))}
        {period === 'custom' && (
          <>
            <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #d9d9d9' }} />
            <span>to</span>
            <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #d9d9d9' }} />
            <Button size="small" type="primary" onClick={fetchVatReport}>Apply</Button>
          </>
        )}
      </div>

      <Card style={{ borderRadius: 12, marginBottom: 16 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={3} style={{ margin: 0 }}>VAT201 Return Calculation</Title>
          <Text type="secondary">South African Revenue Service</Text>
          <br />
          <Text type="secondary">{vatData.period?.label || `${vatData.period?.start_date} to ${vatData.period?.end_date}`}</Text>
        </div>

        <Row gutter={[24, 16]}>
          <Col xs={24} md={8}>
            <Card size="small" style={{ borderRadius: 8, background: '#f0fdfa', border: '1px solid #99f6e4', textAlign: 'center' }}>
              <Statistic
                title="Output VAT (On Sales)"
                value={vatData.output_vat?.total || 0}
                formatter={(val: any) => formatCurrency(val as number)}
                valueStyle={{ color: '#14b8a6', fontWeight: 700 }}
              />
              <Text type="secondary" style={{ fontSize: 11 }}>
                Taxable Sales: {formatCurrency(vatData.summary?.total_sales_excl_vat || 0)}
              </Text>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card size="small" style={{ borderRadius: 8, background: '#eff6ff', border: '1px solid #bfdbfe', textAlign: 'center' }}>
              <Statistic
                title="Input VAT (On Purchases)"
                value={vatData.input_vat?.total || 0}
                formatter={(val: any) => formatCurrency(val as number)}
                valueStyle={{ color: '#3b82f6', fontWeight: 700 }}
              />
              <Text type="secondary" style={{ fontSize: 11 }}>
                Taxable Purchases: {formatCurrency(vatData.summary?.total_purchases_excl_vat || 0)}
              </Text>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card 
              size="small" 
              style={{ 
                borderRadius: 8, 
                background: vatData.vat_position === 'payable' ? '#fef2f2' : '#f0fdf4',
                border: `1px solid ${vatData.vat_position === 'payable' ? '#fecaca' : '#bbf7d0'}`,
                textAlign: 'center'
              }}
            >
              <Statistic
                title={`Net VAT ${vatData.vat_position === 'payable' ? 'Payable' : 'Refundable'}`}
                value={Math.abs(vatData.net_vat || 0)}
                formatter={(val: any) => formatCurrency(val as number)}
                valueStyle={{ color: vatData.vat_position === 'payable' ? '#ef4444' : '#10b981', fontWeight: 700 }}
                prefix={vatData.vat_position === 'payable' ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
              />
              <Text type="secondary" style={{ fontSize: 11 }}>
                {vatData.vat_position === 'payable' ? 'Amount due to SARS' : 'Refund due from SARS'}
              </Text>
            </Card>
          </Col>
        </Row>

        <Divider />

        {/* VAT Calculation Breakdown */}
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ textAlign: 'left', padding: '8px 0', fontSize: 13 }}>Description</th>
                <th style={{ textAlign: 'right', padding: '8px 0', fontSize: 13 }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {(vatData.output_vat?.accounts || []).map((acc: any, i: number) => (
                <tr key={`out-${i}`} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '6px 0', fontSize: 13, paddingLeft: 16 }}>
                    <span style={{ color: '#6b7280', marginRight: 8 }}>{acc.account_code}</span>
                    {acc.account_name}
                  </td>
                  <td style={{ textAlign: 'right', padding: '6px 0', fontSize: 13 }}>{formatCurrency(acc.amount)}</td>
                </tr>
              ))}
              <tr style={{ borderBottom: '1px solid #d1d5db', fontWeight: 600 }}>
                <td style={{ padding: '8px 0', fontSize: 13 }}>Total Output VAT (A)</td>
                <td style={{ textAlign: 'right', padding: '8px 0', fontSize: 13, color: '#14b8a6' }}>{formatCurrency(vatData.output_vat?.total || 0)}</td>
              </tr>
              {(vatData.input_vat?.accounts || []).map((acc: any, i: number) => (
                <tr key={`in-${i}`} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '6px 0', fontSize: 13, paddingLeft: 16 }}>
                    <span style={{ color: '#6b7280', marginRight: 8 }}>{acc.account_code}</span>
                    {acc.account_name}
                  </td>
                  <td style={{ textAlign: 'right', padding: '6px 0', fontSize: 13 }}>({formatCurrency(acc.amount)})</td>
                </tr>
              ))}
              <tr style={{ borderBottom: '1px solid #d1d5db', fontWeight: 600 }}>
                <td style={{ padding: '8px 0', fontSize: 13 }}>Total Input VAT (B)</td>
                <td style={{ textAlign: 'right', padding: '8px 0', fontSize: 13, color: '#3b82f6' }}>({formatCurrency(vatData.input_vat?.total || 0)})</td>
              </tr>
              <tr style={{ fontWeight: 700, fontSize: 15, borderTop: '3px double #1f2937' }}>
                <td style={{ padding: '12px 0' }}>VAT {vatData.vat_position === 'payable' ? 'Payable' : 'Refundable'} (A - B)</td>
                <td style={{ textAlign: 'right', padding: '12px 0', color: vatData.vat_position === 'payable' ? '#ef4444' : '#10b981' }}>
                  {formatCurrency(Math.abs(vatData.net_vat || 0))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

// ── Main Hub ──────────────────────────────────────────────────
const ReportsHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [subStatement, setSubStatement] = useState<string | undefined>(undefined);

  const handleNavigate = (tab: string, sub?: string) => {
    setActiveTab(tab);
    if (sub) setSubStatement(sub);
  };

  const tabs = [
    {
      key: 'dashboard',
      label: 'Dashboard',
      icon: <PieChartOutlined />,
      children: <ReportsDashboard onNavigate={handleNavigate} />,
    },
    {
      key: 'statements',
      label: 'Financial Statements',
      icon: <FileTextOutlined />,
      children: <FinancialStatementsTab initialStatement={subStatement} />,
    },
    {
      key: 'vat',
      label: 'Tax & VAT',
      icon: <AuditOutlined />,
      children: <VATReportTab />,
    },
    {
      key: 'aged-analysis',
      label: 'Receivables & Payables',
      icon: <ClockCircleOutlined />,
      children: <StatementsPage />,
    },
    {
      key: 'custom-reports',
      label: 'Custom Reports',
      icon: <BarChartOutlined />,
      children: <ReportLibrary />,
    },
  ];

  return (
    <HubLayout>
      <HubHeader
        title="Reports & Analytics"
        subtitle="IFRS-Compliant Financial Reports, Tax & VAT, Analytics"
        icon={<BarChartOutlined />}
        gradient="purple"
        actions={
          <>
            <Button icon={<SyncOutlined />} onClick={() => setActiveTab('dashboard')}>Refresh</Button>
            <Button icon={<PrinterOutlined />}>Print</Button>
            <Button type="primary" icon={<FileTextOutlined />} onClick={() => setActiveTab('statements')}>
              Financial Statements
            </Button>
          </>
        }
      />

      <StatusBanner
        gradient="purple"
        icon={<LineChartOutlined />}
        title="Financial Reporting Centre"
        subtitle="Real-time • IFRS • SARS Compliant"
        stats={[
          { title: 'Core Reports', value: 6, span: 4 },
          { title: 'Tax Reports', value: 'VAT201', span: 5 },
          { title: 'Statements', value: 'AR & AP', span: 5 },
          { title: 'Custom', value: 'Builder', span: 5 },
          { title: 'Standard', value: 'IFRS / IAS', span: 5 },
        ]}
      />

      <HubTabs
        theme="purple"
        tabs={tabs}
        activeKey={activeTab}
        onChange={(key) => { setActiveTab(key); setSubStatement(undefined); }}
      />
    </HubLayout>
  );
};

export default ReportsHub;
