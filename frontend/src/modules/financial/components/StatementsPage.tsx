/**
 * Account Statements Page
 * View Customer and Supplier statements with transaction history,
 * running balance, and aging analysis.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Card, Table, Typography, Row, Col, Statistic, Select, DatePicker, Button,
  Space, Tag, Tabs, Spin, message, Alert, Descriptions, Divider,
} from 'antd';
import {
  PrinterOutlined, TeamOutlined, ShopOutlined, FileTextOutlined,
  SearchOutlined, ReloadOutlined, DollarOutlined, CalendarOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { statementsService } from '../../../services/statements.service';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { RangePicker } = DatePicker;

interface Transaction {
  type: string;
  reference: string;
  date: string;
  due_date: string;
  description: string;
  debit: number | null;
  credit: number | null;
  balance: number;
  status: string;
}

interface Aging {
  current: number;
  days30: number;
  days60: number;
  days90: number;
  days120Plus: number;
  total: number;
}

interface StatementData {
  customer?: any;
  supplier?: any;
  period: { from: string; to: string };
  openingBalance: number;
  closingBalance: number;
  transactions: Transaction[];
  aging: Aging;
  totalDebit: number;
  totalCredit: number;
}

interface SummaryRow {
  id: string;
  customer_code?: string;
  vendor_code?: string;
  company_name: string;
  email: string;
  opening_balance: number;
  total_invoiced: number;
  total_paid: number;
  total_credited?: number;
  balance: number;
}

const fmt = (v: number) =>
  `R ${Math.abs(v).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const StatementsPage: React.FC = () => {
  const [mode, setMode] = useState<'customers' | 'suppliers'>('customers');
  const [summaryList, setSummaryList] = useState<SummaryRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statement, setStatement] = useState<StatementData | null>(null);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().startOf('year'),
    dayjs(),
  ]);
  const [loading, setLoading] = useState(false);
  const [loadingStatement, setLoadingStatement] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  /* ── Load summary list ── */
  const loadSummary = useCallback(async () => {
    try {
      setLoading(true);
      const result = mode === 'customers'
        ? await statementsService.listCustomerStatements()
        : await statementsService.listSupplierStatements();
      if (result.success) setSummaryList(result.data);
    } catch (err) {
      message.error('Failed to load statement list');
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    loadSummary();
    setSelectedId(null);
    setStatement(null);
  }, [loadSummary]);

  /* ── Load individual statement ── */
  const loadStatement = useCallback(async () => {
    if (!selectedId) return;
    try {
      setLoadingStatement(true);
      const from = dateRange[0].format('YYYY-MM-DD');
      const to = dateRange[1].format('YYYY-MM-DD');
      const result = mode === 'customers'
        ? await statementsService.getCustomerStatement(selectedId, from, to)
        : await statementsService.getSupplierStatement(selectedId, from, to);
      if (result.success) setStatement(result.data);
    } catch (err) {
      message.error('Failed to load statement');
    } finally {
      setLoadingStatement(false);
    }
  }, [selectedId, dateRange, mode]);

  useEffect(() => {
    if (selectedId) loadStatement();
  }, [selectedId, loadStatement]);

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Account Statement</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
        table { width: 100%; border-collapse: collapse; margin: 16px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
        th { background: #f5f5f5; font-weight: 600; }
        .text-right { text-align: right; }
        .aging-table td { text-align: center; }
        h2 { margin: 0 0 4px 0; }
        .header { margin-bottom: 20px; }
        .totals { font-weight: bold; background: #f9f9f9; }
        @media print { body { padding: 0; } }
      </style></head><body>
      ${content.innerHTML}
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  /* ── Summary columns ── */
  const summaryColumns = [
    {
      title: 'Code',
      key: 'code',
      width: 100,
      render: (_: any, r: SummaryRow) => r.customer_code || r.vendor_code,
    },
    { title: 'Name', dataIndex: 'company_name', key: 'name', ellipsis: true },
    { title: 'Invoiced', key: 'inv', width: 130, render: (_: any, r: SummaryRow) => fmt(r.total_invoiced), align: 'right' as const },
    { title: 'Paid', key: 'paid', width: 130, render: (_: any, r: SummaryRow) => fmt(r.total_paid), align: 'right' as const },
    {
      title: 'Balance',
      key: 'bal',
      width: 130,
      render: (_: any, r: SummaryRow) => (
        <Text strong style={{ color: r.balance > 0 ? '#ff4d4f' : '#52c41a' }}>
          {fmt(r.balance)}
        </Text>
      ),
      align: 'right' as const,
      sorter: (a: SummaryRow, b: SummaryRow) => a.balance - b.balance,
    },
    {
      title: '',
      key: 'action',
      width: 100,
      render: (_: any, r: SummaryRow) => (
        <Button size="small" type="link" icon={<FileTextOutlined />} onClick={() => setSelectedId(r.id)}>
          View
        </Button>
      ),
    },
  ];

  /* ── Transaction columns ── */
  const txColumns = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      width: 110,
      render: (d: string) => d ? dayjs(d).format('DD MMM YYYY') : '-',
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 110,
      render: (t: string) => {
        const colors: Record<string, string> = { INVOICE: 'blue', PAYMENT: 'green', CREDIT_NOTE: 'orange' };
        return <Tag color={colors[t] || 'default'}>{t.replace('_', ' ')}</Tag>;
      },
    },
    { title: 'Reference', dataIndex: 'reference', key: 'ref', width: 140 },
    { title: 'Description', dataIndex: 'description', key: 'desc', ellipsis: true },
    {
      title: 'Debit',
      dataIndex: 'debit',
      key: 'debit',
      width: 120,
      align: 'right' as const,
      render: (v: number | null) => v ? fmt(v) : '-',
    },
    {
      title: 'Credit',
      dataIndex: 'credit',
      key: 'credit',
      width: 120,
      align: 'right' as const,
      render: (v: number | null) => v ? fmt(v) : '-',
    },
    {
      title: 'Balance',
      dataIndex: 'balance',
      key: 'balance',
      width: 130,
      align: 'right' as const,
      render: (v: number) => <Text strong>{fmt(v)}</Text>,
    },
  ];

  /* ── Aging bar ── */
  const renderAging = (aging: Aging) => (
    <Card size="small" title="Aging Analysis" style={{ marginTop: 16 }}>
      <Row gutter={16}>
        {[
          { label: 'Current', value: aging.current, color: '#52c41a' },
          { label: '30 Days', value: aging.days30, color: '#faad14' },
          { label: '60 Days', value: aging.days60, color: '#fa8c16' },
          { label: '90 Days', value: aging.days90, color: '#f5222d' },
          { label: '120+ Days', value: aging.days120Plus, color: '#722ed1' },
          { label: 'Total', value: aging.total, color: '#1890ff' },
        ].map((item) => (
          <Col key={item.label} xs={12} sm={8} md={4}>
            <Statistic title={item.label} value={item.value} precision={2} prefix="R" valueStyle={{ color: item.color, fontSize: 16 }} />
          </Col>
        ))}
      </Row>
    </Card>
  );

  /* ── Statement detail view ── */
  const renderStatementDetail = () => {
    if (loadingStatement) return <Spin style={{ display: 'block', margin: '40px auto' }} />;
    if (!statement) return null;

    const entity = statement.customer || statement.supplier;

    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <Button onClick={() => { setSelectedId(null); setStatement(null); }}>
            ← Back to List
          </Button>
          <Space>
            <RangePicker
              value={dateRange}
              onChange={(dates) => { if (dates && dates[0] && dates[1]) setDateRange([dates[0], dates[1]]); }}
            />
            <Button icon={<ReloadOutlined />} onClick={loadStatement}>Refresh</Button>
            <Button type="primary" icon={<PrinterOutlined />} onClick={handlePrint}>Print</Button>
          </Space>
        </div>

        <div ref={printRef}>
          <Card>
            <Row gutter={24}>
              <Col span={12}>
                <Title level={4} style={{ margin: 0 }}>Account Statement</Title>
                <Text type="secondary">{mode === 'customers' ? 'Customer' : 'Supplier'} Statement</Text>
              </Col>
              <Col span={12} style={{ textAlign: 'right' }}>
                <Text type="secondary">Period: {dayjs(statement.period.from).format('DD MMM YYYY')} — {dayjs(statement.period.to).format('DD MMM YYYY')}</Text>
              </Col>
            </Row>

            <Divider />

            <Descriptions column={2} size="small">
              <Descriptions.Item label="Name">{entity?.name}</Descriptions.Item>
              <Descriptions.Item label="Code">{entity?.code}</Descriptions.Item>
              <Descriptions.Item label="Email">{entity?.email}</Descriptions.Item>
              <Descriptions.Item label="Phone">{entity?.phone}</Descriptions.Item>
              <Descriptions.Item label="Address" span={2}>{entity?.address}</Descriptions.Item>
            </Descriptions>

            <Row gutter={16} style={{ margin: '16px 0' }}>
              <Col span={6}>
                <Statistic title="Opening Balance" value={statement.openingBalance} precision={2} prefix="R" />
              </Col>
              <Col span={6}>
                <Statistic title="Total Debits" value={statement.totalDebit} precision={2} prefix="R" valueStyle={{ color: '#1890ff' }} />
              </Col>
              <Col span={6}>
                <Statistic title="Total Credits" value={statement.totalCredit} precision={2} prefix="R" valueStyle={{ color: '#52c41a' }} />
              </Col>
              <Col span={6}>
                <Statistic title="Closing Balance" value={statement.closingBalance} precision={2} prefix="R" valueStyle={{ color: statement.closingBalance > 0 ? '#ff4d4f' : '#52c41a', fontWeight: 'bold' }} />
              </Col>
            </Row>

            <Table
              columns={txColumns}
              dataSource={statement.transactions}
              rowKey={(r, i) => `${r.reference}-${i}`}
              size="small"
              pagination={false}
              scroll={{ y: 400 }}
              summary={() => (
                <Table.Summary fixed>
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={4}><Text strong>Totals</Text></Table.Summary.Cell>
                    <Table.Summary.Cell index={4} align="right"><Text strong>{fmt(statement.totalDebit)}</Text></Table.Summary.Cell>
                    <Table.Summary.Cell index={5} align="right"><Text strong>{fmt(statement.totalCredit)}</Text></Table.Summary.Cell>
                    <Table.Summary.Cell index={6} align="right"><Text strong>{fmt(statement.closingBalance)}</Text></Table.Summary.Cell>
                  </Table.Summary.Row>
                </Table.Summary>
              )}
            />

            {renderAging(statement.aging)}
          </Card>
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>
          <FileTextOutlined /> Account Statements
        </Title>
        <Text type="secondary">
          View customer and supplier account statements with transaction history, running balance, and aging.
        </Text>
      </div>

      <Tabs activeKey={mode} onChange={(k) => setMode(k as 'customers' | 'suppliers')}>
        <TabPane tab={<span><TeamOutlined /> Customer Statements</span>} key="customers" />
        <TabPane tab={<span><ShopOutlined /> Supplier Statements</span>} key="suppliers" />
      </Tabs>

      {selectedId ? (
        renderStatementDetail()
      ) : (
        <Card>
          <div style={{ marginBottom: 16, textAlign: 'right' }}>
            <Button icon={<ReloadOutlined />} onClick={loadSummary}>Refresh</Button>
          </div>
          <Table
            columns={summaryColumns}
            dataSource={summaryList}
            rowKey="id"
            size="small"
            loading={loading}
            pagination={{ pageSize: 25, showSizeChanger: true, showTotal: (t) => `${t} records` }}
          />
        </Card>
      )}
    </div>
  );
};

export default StatementsPage;
