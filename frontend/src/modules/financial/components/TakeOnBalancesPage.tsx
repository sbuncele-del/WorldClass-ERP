/**
 * Take-on Balances Page
 * Allows businesses to enter opening balances for GL, AR, AP, and bank accounts
 * during ERP migration.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Tabs, Table, InputNumber, Button, Space, Typography, Alert, Statistic,
  Row, Col, Tag, message, Spin, Modal, DatePicker, Tooltip, Input,
} from 'antd';
import {
  SaveOutlined, CheckCircleOutlined, WarningOutlined, BankOutlined,
  DollarOutlined, TeamOutlined, ShopOutlined, ReloadOutlined,
  SearchOutlined, FileTextOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { takeOnBalancesService } from '../../../services/take-on-balances.service';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

interface GLAccount {
  id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  account_sub_type: string;
  opening_balance: number;
  is_active: boolean;
}

interface CustomerBalance {
  id: string;
  customer_code: string;
  company_name: string;
  contact_person: string;
  email: string;
  opening_balance: number;
  is_active: boolean;
}

interface SupplierBalance {
  id: string;
  vendor_code: string;
  company_name: string;
  contact_person: string;
  email: string;
  opening_balance: number;
  is_active: boolean;
}

interface BankBalance {
  id: string;
  account_name: string;
  bank_name: string;
  account_number: string;
  account_type: string;
  opening_balance: number;
  opening_balance_date: string;
  currency: string;
  is_active: boolean;
}

interface Summary {
  gl: { accountsWithBalance: number; totalAccounts: number; totalDebits: number; totalCredits: number; isBalanced: boolean; difference: number };
  customers: { withBalance: number; total: number; totalBalance: number };
  suppliers: { withBalance: number; total: number; totalBalance: number };
  bankAccounts: { withBalance: number; total: number; totalBalance: number };
}

const TakeOnBalancesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('summary');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [glAccounts, setGlAccounts] = useState<GLAccount[]>([]);
  const [customers, setCustomers] = useState<CustomerBalance[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierBalance[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankBalance[]>([]);
  const [editedGL, setEditedGL] = useState<Record<string, number>>({});
  const [editedCustomers, setEditedCustomers] = useState<Record<string, number>>({});
  const [editedSuppliers, setEditedSuppliers] = useState<Record<string, number>>({});
  const [editedBanks, setEditedBanks] = useState<Record<string, { amount: number; date?: string }>>({});
  const [searchText, setSearchText] = useState('');

  const loadSummary = useCallback(async () => {
    try {
      setLoading(true);
      const result = await takeOnBalancesService.getSummary();
      if (result.success) setSummary(result.data);
    } catch (err) {
      message.error('Failed to load summary');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadGL = useCallback(async () => {
    try {
      setLoading(true);
      const result = await takeOnBalancesService.getGLBalances();
      if (result.success) setGlAccounts(result.data);
    } catch (err) {
      message.error('Failed to load GL accounts');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const result = await takeOnBalancesService.getCustomerBalances();
      if (result.success) setCustomers(result.data);
    } catch (err) {
      message.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      const result = await takeOnBalancesService.getSupplierBalances();
      if (result.success) setSuppliers(result.data);
    } catch (err) {
      message.error('Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadBanks = useCallback(async () => {
    try {
      setLoading(true);
      const result = await takeOnBalancesService.getBankBalances();
      if (result.success) setBankAccounts(result.data);
    } catch (err) {
      message.error('Failed to load bank accounts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSummary(); }, [loadSummary]);

  useEffect(() => {
    if (activeTab === 'gl') loadGL();
    else if (activeTab === 'customers') loadCustomers();
    else if (activeTab === 'suppliers') loadSuppliers();
    else if (activeTab === 'banks') loadBanks();
    else if (activeTab === 'summary') loadSummary();
  }, [activeTab, loadGL, loadCustomers, loadSuppliers, loadBanks, loadSummary]);

  /* ── Save handlers ── */
  const saveGL = async () => {
    const entries = Object.entries(editedGL);
    if (entries.length === 0) { message.info('No changes to save'); return; }
    try {
      setSaving(true);
      const balances = entries.map(([id, opening_balance]) => ({ id, opening_balance }));
      const result = await takeOnBalancesService.saveGLBalances(balances);
      if (result.success) {
        message.success(result.message);
        setEditedGL({});
        loadGL();
        loadSummary();
      }
    } catch (err) {
      message.error('Failed to save GL balances');
    } finally {
      setSaving(false);
    }
  };

  const saveCustomers = async () => {
    const entries = Object.entries(editedCustomers);
    if (entries.length === 0) { message.info('No changes to save'); return; }
    try {
      setSaving(true);
      const balances = entries.map(([id, opening_balance]) => ({ id, opening_balance }));
      const result = await takeOnBalancesService.saveCustomerBalances(balances);
      if (result.success) {
        message.success(result.message);
        setEditedCustomers({});
        loadCustomers();
        loadSummary();
      }
    } catch (err) {
      message.error('Failed to save customer balances');
    } finally {
      setSaving(false);
    }
  };

  const saveSuppliers = async () => {
    const entries = Object.entries(editedSuppliers);
    if (entries.length === 0) { message.info('No changes to save'); return; }
    try {
      setSaving(true);
      const balances = entries.map(([id, opening_balance]) => ({ id, opening_balance }));
      const result = await takeOnBalancesService.saveSupplierBalances(balances);
      if (result.success) {
        message.success(result.message);
        setEditedSuppliers({});
        loadSuppliers();
        loadSummary();
      }
    } catch (err) {
      message.error('Failed to save supplier balances');
    } finally {
      setSaving(false);
    }
  };

  const saveBanks = async () => {
    const entries = Object.entries(editedBanks);
    if (entries.length === 0) { message.info('No changes to save'); return; }
    try {
      setSaving(true);
      const balances = entries.map(([id, val]) => ({
        id,
        opening_balance: val.amount,
        opening_balance_date: val.date,
      }));
      const result = await takeOnBalancesService.saveBankBalances(balances);
      if (result.success) {
        message.success(result.message);
        setEditedBanks({});
        loadBanks();
        loadSummary();
      }
    } catch (err) {
      message.error('Failed to save bank balances');
    } finally {
      setSaving(false);
    }
  };

  const handleFinalize = async () => {
    Modal.confirm({
      title: 'Finalize Opening Balances',
      content: (
        <div>
          <p>This will create a <strong>posted journal entry</strong> recording all GL opening balances.</p>
          <p>Please ensure your trial balance is in balance before continuing.</p>
        </div>
      ),
      okText: 'Finalize & Post',
      okType: 'primary',
      onOk: async () => {
        try {
          const result = await takeOnBalancesService.finalize();
          if (result.success) {
            message.success(result.message);
            loadSummary();
          } else {
            message.error(result.message);
          }
        } catch (err: any) {
          message.error(err?.response?.data?.message || 'Failed to finalize');
        }
      },
    });
  };

  const fmt = (v: number) => `R ${v.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  /* ── Filter helper ── */
  const filterBySearch = (records: any[], fields: string[]) => {
    if (!searchText) return records;
    const lower = searchText.toLowerCase();
    return records.filter(r => fields.some(f => String(r[f] || '').toLowerCase().includes(lower)));
  };

  /* ── GL Columns ── */
  const glColumns = [
    { title: 'Code', dataIndex: 'account_code', key: 'code', width: 100, sorter: (a: GLAccount, b: GLAccount) => a.account_code.localeCompare(b.account_code) },
    { title: 'Account Name', dataIndex: 'account_name', key: 'name', ellipsis: true },
    { title: 'Type', dataIndex: 'account_type', key: 'type', width: 120, render: (t: string) => <Tag color={t === 'Asset' ? 'blue' : t === 'Liability' ? 'orange' : t === 'Equity' ? 'purple' : t === 'Revenue' ? 'green' : 'red'}>{t}</Tag> },
    { title: 'Sub Type', dataIndex: 'account_sub_type', key: 'subtype', width: 150 },
    {
      title: 'Opening Balance',
      key: 'balance',
      width: 200,
      render: (_: any, record: GLAccount) => (
        <InputNumber
          value={editedGL[record.id] !== undefined ? editedGL[record.id] : record.opening_balance}
          onChange={(val) => setEditedGL(prev => ({ ...prev, [record.id]: val || 0 }))}
          formatter={(val) => `R ${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
          parser={(val) => Number((val || '').replace(/R\s?|(,*)/g, ''))}
          style={{ width: '100%' }}
          step={0.01}
        />
      ),
    },
  ];

  /* ── Customer Columns ── */
  const customerColumns = [
    { title: 'Code', dataIndex: 'customer_code', key: 'code', width: 100 },
    { title: 'Company Name', dataIndex: 'company_name', key: 'name', ellipsis: true },
    { title: 'Contact', dataIndex: 'contact_person', key: 'contact', width: 160 },
    { title: 'Email', dataIndex: 'email', key: 'email', width: 200, ellipsis: true },
    {
      title: 'Opening Balance',
      key: 'balance',
      width: 200,
      render: (_: any, record: CustomerBalance) => (
        <InputNumber
          value={editedCustomers[record.id] !== undefined ? editedCustomers[record.id] : record.opening_balance}
          onChange={(val) => setEditedCustomers(prev => ({ ...prev, [record.id]: val || 0 }))}
          formatter={(val) => `R ${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
          parser={(val) => Number((val || '').replace(/R\s?|(,*)/g, ''))}
          style={{ width: '100%' }}
          step={0.01}
        />
      ),
    },
  ];

  /* ── Supplier Columns ── */
  const supplierColumns = [
    { title: 'Code', dataIndex: 'vendor_code', key: 'code', width: 100 },
    { title: 'Company Name', dataIndex: 'company_name', key: 'name', ellipsis: true },
    { title: 'Contact', dataIndex: 'contact_person', key: 'contact', width: 160 },
    { title: 'Email', dataIndex: 'email', key: 'email', width: 200, ellipsis: true },
    {
      title: 'Opening Balance',
      key: 'balance',
      width: 200,
      render: (_: any, record: SupplierBalance) => (
        <InputNumber
          value={editedSuppliers[record.id] !== undefined ? editedSuppliers[record.id] : record.opening_balance}
          onChange={(val) => setEditedSuppliers(prev => ({ ...prev, [record.id]: val || 0 }))}
          formatter={(val) => `R ${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
          parser={(val) => Number((val || '').replace(/R\s?|(,*)/g, ''))}
          style={{ width: '100%' }}
          step={0.01}
        />
      ),
    },
  ];

  /* ── Bank Columns ── */
  const bankColumns = [
    { title: 'Account Name', dataIndex: 'account_name', key: 'name', ellipsis: true },
    { title: 'Bank', dataIndex: 'bank_name', key: 'bank', width: 140 },
    { title: 'Account #', dataIndex: 'account_number', key: 'accnum', width: 140 },
    { title: 'Currency', dataIndex: 'currency', key: 'currency', width: 80 },
    {
      title: 'Opening Balance',
      key: 'balance',
      width: 200,
      render: (_: any, record: BankBalance) => (
        <InputNumber
          value={editedBanks[record.id]?.amount !== undefined ? editedBanks[record.id].amount : record.opening_balance}
          onChange={(val) => setEditedBanks(prev => ({ ...prev, [record.id]: { ...prev[record.id], amount: val || 0 } }))}
          formatter={(val) => `R ${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
          parser={(val) => Number((val || '').replace(/R\s?|(,*)/g, ''))}
          style={{ width: '100%' }}
          step={0.01}
        />
      ),
    },
    {
      title: 'Balance Date',
      key: 'date',
      width: 160,
      render: (_: any, record: BankBalance) => (
        <DatePicker
          value={editedBanks[record.id]?.date ? dayjs(editedBanks[record.id].date) : record.opening_balance_date ? dayjs(record.opening_balance_date) : null}
          onChange={(date) => setEditedBanks(prev => ({
            ...prev,
            [record.id]: { amount: prev[record.id]?.amount ?? record.opening_balance, date: date?.format('YYYY-MM-DD') },
          }))}
          style={{ width: '100%' }}
        />
      ),
    },
  ];

  /* ── Summary Tab ── */
  const renderSummary = () => {
    if (!summary) return <Spin />;
    const { gl, customers: cs, suppliers: sp, bankAccounts: ba } = summary;
    return (
      <div>
        {!gl.isBalanced && gl.totalDebits + gl.totalCredits > 0 && (
          <Alert
            type="warning"
            showIcon
            icon={<WarningOutlined />}
            message="Trial Balance Out of Balance"
            description={`Debits exceed credits by ${fmt(gl.difference)}. Please correct before finalizing.`}
            style={{ marginBottom: 24 }}
          />
        )}
        {gl.isBalanced && gl.totalDebits > 0 && (
          <Alert
            type="success"
            showIcon
            icon={<CheckCircleOutlined />}
            message="Trial Balance is in Balance"
            description="Your GL opening balances are balanced. You can finalize when ready."
            style={{ marginBottom: 24 }}
          />
        )}

        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic title="GL Accounts" value={gl.accountsWithBalance} suffix={`/ ${gl.totalAccounts}`} prefix={<DollarOutlined />} />
              <Text type="secondary">with opening balances</Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic title="Customers (AR)" value={cs.withBalance} suffix={`/ ${cs.total}`} prefix={<TeamOutlined />} />
              <Text type="secondary">{fmt(cs.totalBalance)} total</Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic title="Suppliers (AP)" value={sp.withBalance} suffix={`/ ${sp.total}`} prefix={<ShopOutlined />} />
              <Text type="secondary">{fmt(sp.totalBalance)} total</Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic title="Bank Accounts" value={ba.withBalance} suffix={`/ ${ba.total}`} prefix={<BankOutlined />} />
              <Text type="secondary">{fmt(ba.totalBalance)} total</Text>
            </Card>
          </Col>
        </Row>

        <Card style={{ marginTop: 24 }} title="GL Trial Balance">
          <Row gutter={24}>
            <Col span={8}>
              <Statistic title="Total Debits" value={gl.totalDebits} precision={2} prefix="R" valueStyle={{ color: '#1890ff' }} />
            </Col>
            <Col span={8}>
              <Statistic title="Total Credits" value={gl.totalCredits} precision={2} prefix="R" valueStyle={{ color: '#52c41a' }} />
            </Col>
            <Col span={8}>
              <Statistic
                title="Difference"
                value={Math.abs(gl.difference)}
                precision={2}
                prefix="R"
                valueStyle={{ color: gl.isBalanced ? '#52c41a' : '#ff4d4f' }}
              />
            </Col>
          </Row>
          {gl.isBalanced && gl.totalDebits > 0 && (
            <div style={{ marginTop: 24, textAlign: 'right' }}>
              <Button type="primary" icon={<CheckCircleOutlined />} size="large" onClick={handleFinalize}>
                Finalize & Post Opening Balances
              </Button>
            </div>
          )}
        </Card>
      </div>
    );
  };

  /* ── Table rendering helper ── */
  const renderTable = (
    tab: string,
    data: any[],
    columns: any[],
    searchFields: string[],
    editedCount: number,
    onSave: () => void,
  ) => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Input
          placeholder="Search..."
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 300 }}
          allowClear
        />
        <Space>
          <Tag color={editedCount > 0 ? 'orange' : 'default'}>{editedCount} unsaved changes</Tag>
          <Button icon={<ReloadOutlined />} onClick={() => {
            if (tab === 'gl') loadGL();
            else if (tab === 'customers') loadCustomers();
            else if (tab === 'suppliers') loadSuppliers();
            else if (tab === 'banks') loadBanks();
          }}>Refresh</Button>
          <Button type="primary" icon={<SaveOutlined />} onClick={onSave} loading={saving} disabled={editedCount === 0}>
            Save Changes
          </Button>
        </Space>
      </div>
      <Table
        columns={columns}
        dataSource={filterBySearch(data, searchFields)}
        rowKey="id"
        size="small"
        pagination={{ pageSize: 50, showSizeChanger: true, showTotal: (total) => `${total} records` }}
        scroll={{ y: 500 }}
        loading={loading}
      />
    </div>
  );

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>
          <FileTextOutlined /> Take-on Balances
        </Title>
        <Text type="secondary">
          Enter opening balances for your GL accounts, customers, suppliers, and bank accounts.
          Once your trial balance is in balance, finalize to post the opening balance journal entry.
        </Text>
      </div>

      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab={<span><DollarOutlined /> Summary</span>} key="summary">
          {renderSummary()}
        </TabPane>
        <TabPane tab={<span><DollarOutlined /> GL Accounts</span>} key="gl">
          {renderTable('gl', glAccounts, glColumns, ['account_code', 'account_name'], Object.keys(editedGL).length, saveGL)}
        </TabPane>
        <TabPane tab={<span><TeamOutlined /> Customers (AR)</span>} key="customers">
          {renderTable('customers', customers, customerColumns, ['customer_code', 'company_name', 'email'], Object.keys(editedCustomers).length, saveCustomers)}
        </TabPane>
        <TabPane tab={<span><ShopOutlined /> Suppliers (AP)</span>} key="suppliers">
          {renderTable('suppliers', suppliers, supplierColumns, ['vendor_code', 'company_name', 'email'], Object.keys(editedSuppliers).length, saveSuppliers)}
        </TabPane>
        <TabPane tab={<span><BankOutlined /> Bank Accounts</span>} key="banks">
          {renderTable('banks', bankAccounts, bankColumns, ['account_name', 'bank_name', 'account_number'], Object.keys(editedBanks).length, saveBanks)}
        </TabPane>
      </Tabs>
    </div>
  );
};

export default TakeOnBalancesPage;
