import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { workspaceApi } from '../../services/api.service';
import apiClient from '../../services/api';
import { bankingService, type BankingSettings } from '../../services/banking.service';
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
  Tooltip,
  Modal,
  Form,
  Input,
  Select,
  message,
  Divider,
  List,
  Avatar,
  Spin,
  Alert,
  Upload,
  Switch,
} from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
import {
  BankOutlined,
  CreditCardOutlined,
  SwapOutlined,
  SyncOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  LinkOutlined,
  SettingOutlined,
  SafetyCertificateOutlined,
  DownloadOutlined,
  UploadOutlined,
  WalletOutlined,
  ThunderboltOutlined,
  EyeOutlined,
  FileTextOutlined,
  InboxOutlined,
  SaveOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import './BankingHub.css';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

// Default empty arrays for API data
const defaultBankConnections: any[] = [];

const defaultTransactions: any[] = [];
const defaultCashFlowForecast: any[] = [];

// Lazy load the enhanced AI-powered reconciliation component
const BankReconciliation = lazy(() => import('../../components/BankReconciliationHub'));

const BankingHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showAddBankModal, setShowAddBankModal] = useState(false);
  const [addingBank, setAddingBank] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [bankForm] = Form.useForm();
  
  // Fetch live API data for banking/cash management
  const [apiData, setApiData] = useState<any>(null);
  const [apiLoading, setApiLoading] = useState(true);
  const [bankConnections, setBankConnections] = useState<any[]>(defaultBankConnections);
  const [recentTransactions, setRecentTransactions] = useState<any[]>(defaultTransactions);
  const [cashFlowForecast, setCashFlowForecast] = useState<any[]>(defaultCashFlowForecast);
  const [reconStats, setReconStats] = useState({ unreconciled: 0, matched: 0, total: 0, lastSync: null as string | null });
  const [cashFlowData, setCashFlowData] = useState<any>(null);
  const [cashFlowLoading, setCashFlowLoading] = useState(false);
  const [overviewData, setOverviewData] = useState<any>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);

  // Settings state
  const [settingsForm] = Form.useForm();
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // Statement import state
  const [showStatementImportModal, setShowStatementImportModal] = useState(false);
  const [importingStatement, setImportingStatement] = useState(false);
  const [importFileList, setImportFileList] = useState<UploadFile[]>([]);

  // Bank Transactions tab state
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [txnLoading, setTxnLoading] = useState(false);
  const [txnFilter, setTxnFilter] = useState<string>('all');
  const [txnSearch, setTxnSearch] = useState<string>('');
  const [txnAccountFilter, setTxnAccountFilter] = useState<string>('all');
  
  useEffect(() => {
    const fetchBankingData = async () => {
      try {
        // Fetch from V2 cash-management endpoints
        const [workspaceResult, bankAccountsRes, dashboardRes, forecastRes] = await Promise.all([
          workspaceApi.cashManagement.getWorkspace().catch(() => null),
          apiClient.get('/api/v2/cash-management/bank-accounts').catch(() => ({ data: { data: [] } })),
          apiClient.get('/api/v2/treasury/dashboard').catch(() => ({ data: { data: {} } })),
          apiClient.get('/api/v2/treasury/forecasts').catch(() => ({ data: { data: [] } })),
        ]);
        
        // Handle workspace data
        if (workspaceResult) {
          if ((workspaceResult as any)?.data) {
            setApiData((workspaceResult as any).data);
          } else {
            setApiData(workspaceResult);
          }
        }
        
        // Handle bank accounts from cash-management
        const bankAccountsData = bankAccountsRes.data?.data || bankAccountsRes.data || [];
        const dashboardData = dashboardRes.data?.dashboard || dashboardRes.data?.data || {};
        const forecastData = Array.isArray(forecastRes.data?.data) ? forecastRes.data.data : 
                            Array.isArray(forecastRes.data) ? forecastRes.data : [];
        
        // Map bank accounts to connection format for display
        if (bankAccountsData.length > 0) {
          const bankConnectionsFromAPI = bankAccountsData.map((acc: any) => ({
            id: acc.id || acc.account_id,
            bank: acc.bank_name || 'Bank Account',
            accountName: acc.account_name || 'Account',
            accountNumber: acc.account_number ? `****${acc.account_number.slice(-4)}` : '****0000',
            balance: parseFloat(acc.current_balance) || 0,
            available: parseFloat(acc.current_balance) || 0,
            currency: acc.currency || 'ZAR',
            status: acc.is_active ? 'connected' : 'disconnected',
            type: acc.account_type || 'Current',
            logo: '🏦',
            feedType: 'Manual',
            lastSync: acc.updated_at || new Date().toISOString(),
          }));
          setBankConnections(bankConnectionsFromAPI);
        }
        
        // Map forecasts for cash flow
        if (forecastData.length > 0) {
          setCashFlowForecast(forecastData);
        }
        
        // Extract recent transactions if available in dashboard
        if (dashboardData.recentTransactions) {
          setRecentTransactions(dashboardData.recentTransactions);
        }

        // Fetch statement lines to compute reconciliation stats
        const firstAccountId = bankAccountsData[0]?.id || bankAccountsData[0]?.account_id;
        if (firstAccountId) {
          try {
            const stmtRes = await apiClient.get(`/api/v2/cash-management/statement-lines?bank_account_id=${firstAccountId}`);
            const lines = stmtRes.data?.data || [];
            const unreconciled = lines.filter((l: any) => l.status === 'unmatched').length;
            const matched = lines.filter((l: any) => l.status === 'allocated' || l.status === 'reconciled').length;
            const lastUpdated = bankAccountsData[0]?.updated_at || null;
            setReconStats({ unreconciled, matched, total: lines.length, lastSync: lastUpdated });
          } catch {
            // Keep defaults
          }
        }
      } catch (err) {
        console.log('Using local mock data for banking');
      } finally {
        setApiLoading(false);
        // Fetch overview data after initial load
        fetchOverviewData();
      }
    };
    fetchBankingData();
  }, []);

  // Fetch overview dashboard data
  const fetchOverviewData = async () => {
    setOverviewLoading(true);
    try {
      const res = await apiClient.get('/api/v2/cash-management/overview-dashboard');
      if (res.data?.success && res.data?.data) {
        const raw = res.data.data;
        // Ensure monthSummary and reconciliation always have safe defaults
        const safeData = {
          ...raw,
          monthSummary: {
            totalTransactions: 0,
            totalCredits: 0,
            totalDebits: 0,
            creditCount: 0,
            debitCount: 0,
            ...(raw.monthSummary || {}),
          },
          reconciliation: {
            reconPercent: 0,
            allocated: 0,
            total: 0,
            unmatched: 0,
            ...(raw.reconciliation || {}),
          },
          recentTransactions: raw.recentTransactions || [],
          topSpending: raw.topSpending || [],
          topIncome: raw.topIncome || [],
        };
        setOverviewData(safeData);
        // Also populate recentTransactions for backward compatibility
        if (res.data.data.recentTransactions?.length > 0) {
          setRecentTransactions(res.data.data.recentTransactions.map((t: any) => ({
            id: t.id,
            date: t.transaction_date?.split('T')[0],
            description: t.description,
            amount: parseFloat(t.amount),
            currency: 'ZAR',
            status: t.status === 'allocated' ? 'cleared' : 'pending',
            reconciled: t.status === 'allocated',
            account: 'Standard Bank',
          })));
        }
      }
    } catch (err) {
      console.error('Overview fetch error:', err);
    } finally {
      setOverviewLoading(false);
    }
  };

  // Fetch cash flow dashboard data
  const fetchCashFlowData = async () => {
    setCashFlowLoading(true);
    try {
      const res = await apiClient.get('/api/v2/cash-management/cash-flow-dashboard');
      if (res.data?.success && res.data?.data) {
        const raw = res.data.data;
        // Transform monthly data: add month_label from month ("2025-08" → "Aug 2025")
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const monthlyFlow = (raw.monthly || []).map((m: any) => {
          const [y, mo] = (m.month || '').split('-');
          return { ...m, month_label: `${months[parseInt(mo,10)-1] || mo} ${y}` };
        });
        // Calculate averages from last 90 days of data
        const totalInflows = monthlyFlow.reduce((s: number, m: any) => s + (parseFloat(m.inflows) || 0), 0);
        const totalOutflows = monthlyFlow.reduce((s: number, m: any) => s + (parseFloat(m.outflows) || 0), 0);
        const numMonths = monthlyFlow.length || 1;
        const avgDailyInflow = Math.round((totalInflows / (numMonths * 30)) * 100) / 100;
        const avgDailyOutflow = Math.round((totalOutflows / (numMonths * 30)) * 100) / 100;
        const currentBal = parseFloat(raw.currentBalance) || 0;
        const netPerDay = avgDailyInflow - avgDailyOutflow;
        const projected30d = Math.round((currentBal + netPerDay * 30) * 100) / 100;
        const changePercent = currentBal !== 0 ? Math.round(((projected30d - currentBal) / Math.abs(currentBal)) * 10000) / 100 : 0;
        // Generate 4-week projections
        const weeklyProjections = [1,2,3,4].map(w => {
          const weekIn = Math.round(avgDailyInflow * 7 * 100) / 100;
          const weekOut = Math.round(avgDailyOutflow * 7 * 100) / 100;
          const weekNet = Math.round((weekIn - weekOut) * 100) / 100;
          const closing = Math.round((currentBal + netPerDay * 7 * w) * 100) / 100;
          return { period: `Week ${w}`, inflow: weekIn, outflow: weekOut, net: weekNet, closing };
        });
        setCashFlowData({
          currentCashPosition: currentBal,
          projectedBalance30d: projected30d,
          changePercent,
          avgDailyInflow,
          avgDailyOutflow,
          monthlyFlow,
          weeklyProjections,
          recurringPatterns: raw.recurringPatterns || [],
          alerts: raw.alerts || [],
          significantTransactions: raw.significantTransactions || [],
          categories: raw.categories || [],
        });
      }
    } catch (err) {
      console.error('Cash flow fetch error:', err);
    } finally {
      setCashFlowLoading(false);
    }
  };

  // Fetch all bank transactions for the Transactions tab
  const fetchAllTransactions = useCallback(async () => {
    setTxnLoading(true);
    try {
      // Fetch statement lines for all accounts
      const promises = bankConnections.map(acc =>
        apiClient.get(`/api/v2/cash-management/statement-lines?bank_account_id=${acc.id}&limit=5000`).catch(() => ({ data: { data: [] } }))
      );
      const results = await Promise.all(promises);
      const allLines: any[] = [];
      results.forEach((res, idx) => {
        const lines = res.data?.data || [];
        lines.forEach((l: any) => {
          allLines.push({
            ...l,
            _accountName: bankConnections[idx]?.accountName || 'Unknown',
            _currency: bankConnections[idx]?.currency || 'ZAR',
          });
        });
      });
      // Sort by date desc
      allLines.sort((a, b) => new Date(b.transaction_date || b.date || 0).getTime() - new Date(a.transaction_date || a.date || 0).getTime());
      setAllTransactions(allLines);
    } catch (err) {
      console.error('Error fetching transactions:', err);
    } finally {
      setTxnLoading(false);
    }
  }, [bankConnections]);

  // Load transactions when tab becomes active or bankConnections change
  useEffect(() => {
    if (activeTab === 'transactions' && bankConnections.length > 0 && allTransactions.length === 0) {
      fetchAllTransactions();
    }
  }, [activeTab, bankConnections, fetchAllTransactions]);

  // Load banking settings
  const loadSettings = useCallback(async () => {
    setSettingsLoading(true);
    try {
      const settings = await bankingService.getSettings();
      settingsForm.setFieldsValue(settings);
      setSettingsLoaded(true);
    } catch (err) {
      console.error('Error loading banking settings:', err);
      // Use defaults on error
      settingsForm.setFieldsValue({
        syncFrequency: '15',
        reconciliationMethod: 'auto',
        lowBalanceThreshold: '100000',
        autoCategorizationEnabled: true,
        duplicateDetectionEnabled: true,
      });
      setSettingsLoaded(true);
    } finally {
      setSettingsLoading(false);
    }
  }, [settingsForm]);

  // Load data when tab switches
  useEffect(() => {
    if (activeTab === 'cashflow' && !cashFlowData) {
      fetchCashFlowData();
    }
    if (activeTab === 'settings' && !settingsLoaded) {
      loadSettings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Save banking settings
  const handleSaveSettings = async () => {
    setSettingsSaving(true);
    try {
      const values = await settingsForm.validateFields();
      const result = await bankingService.saveSettings(values as BankingSettings);
      if (result.source === 'server') {
        message.success('Settings saved successfully');
      } else {
        message.success('Settings saved locally');
      }
    } catch (err: any) {
      if (err.errorFields) {
        message.error('Please fill in all required fields');
      } else {
        message.error('Failed to save settings');
        console.error('Save settings error:', err);
      }
    } finally {
      setSettingsSaving(false);
    }
  };

  // Handle statement import from the Connect modal
  const handleStatementImport = async (file: File) => {
    if (!file) return;

    // If no bank accounts exist yet, warn the user
    if (bankConnections.length === 0) {
      message.warning('Please add a bank account first before importing statements');
      return;
    }

    setImportingStatement(true);
    message.loading({ content: 'Importing statement...', key: 'stmt-import' });

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bank_account_id', bankConnections[0]?.id || '');

      // Try the V2 statement import endpoint
      const response = await apiClient.post('/api/v2/cash-management/statements', {
        bank_account_id: bankConnections[0]?.id || '',
        statement_date: new Date().toISOString().split('T')[0],
        status: 'imported',
      }).catch(() => null);

      if (response?.data?.success || response?.data?.data) {
        message.success({
          content: 'Statement created. Switch to Reconciliation tab to import transaction lines.',
          key: 'stmt-import',
          duration: 4,
        });
        setShowStatementImportModal(false);
        setShowConnectModal(false);
        setActiveTab('reconciliation');
      } else {
        // Redirect to reconciliation tab which has the full import workflow
        message.info({
          content: 'Redirecting to Reconciliation tab for full import workflow...',
          key: 'stmt-import',
          duration: 3,
        });
        setShowStatementImportModal(false);
        setShowConnectModal(false);
        setActiveTab('reconciliation');
      }
    } catch (err: any) {
      console.error('Statement import error:', err);
      message.info({
        content: 'Use the Reconciliation tab for detailed CSV/OFX import with column mapping.',
        key: 'stmt-import',
        duration: 4,
      });
      setShowStatementImportModal(false);
      setShowConnectModal(false);
      setActiveTab('reconciliation');
    } finally {
      setImportingStatement(false);
      setImportFileList([]);
    }
  };

  const refreshBankAccounts = async () => {
    try {
      const res = await apiClient.get('/api/v2/cash-management/bank-accounts');
      const accounts = res.data?.data || [];
      if (accounts.length > 0) {
        const mapped = accounts.map((acc: any) => ({
          id: acc.id || acc.account_id,
          bank: acc.bank_name || 'Bank Account',
          accountName: acc.account_name || 'Account',
          accountNumber: acc.account_number ? `****${acc.account_number.slice(-4)}` : '****0000',
          balance: parseFloat(acc.current_balance) || 0,
          available: parseFloat(acc.current_balance) || 0,
          currency: acc.currency || 'ZAR',
          status: acc.is_active ? 'connected' : 'disconnected',
          type: acc.account_type || 'Current',
          logo: '🏦',
          feedType: 'Manual',
          lastSync: acc.updated_at || new Date().toISOString(),
        }));
        setBankConnections(mapped);
      }
    } catch (err) {
      console.error('Error refreshing bank accounts:', err);
    }
  };

  const handleAddBankAccount = async (values: any) => {
    setAddingBank(true);
    try {
      await apiClient.post('/api/v2/cash-management/bank-accounts', {
        account_name: values.accountName,
        bank_name: values.bankName,
        account_number: values.accountNumber,
        branch_code: values.branchCode,
        account_type: values.accountType,
        currency: values.currency || 'ZAR',
        current_balance: parseFloat(values.openingBalance) || 0,
      });
      message.success('Bank account added successfully!');
      bankForm.resetFields();
      setShowAddBankModal(false);
      refreshBankAccounts();
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Failed to add bank account');
    } finally {
      setAddingBank(false);
    }
  };

  const handleSyncAll = async () => {
    setSyncing(true);
    try {
      // Fetch updated bank accounts
      const res = await apiClient.get('/api/v2/cash-management/bank-accounts').catch(() => null);
      if (res?.data?.data && res.data.data.length > 0) {
        const accounts = res.data.data;
        setBankConnections(accounts.map((acc: any) => ({
          id: acc.id,
          bank: acc.bank_name || 'Bank',
          accountName: acc.account_name || 'Account',
          accountNumber: acc.account_number ? `****${acc.account_number.slice(-4)}` : '****',
          type: acc.account_type || 'checking',
          balance: parseFloat(acc.current_balance) || 0,
          currency: acc.currency || 'ZAR',
          status: acc.is_active ? 'connected' : 'disconnected',
          lastSync: acc.updated_at || new Date().toISOString(),
        })));
      }

      // Update reconciliation stats
      const stmtRes = await apiClient.get('/api/v2/cash-management/statement-lines').catch(() => null);
      if (stmtRes?.data?.data) {
        const lines = stmtRes.data.data;
        const unreconciled = lines.filter((l: any) => l.status === 'unmatched').length;
        const matched = lines.filter((l: any) => ['matched', 'allocated', 'reconciled'].includes(l.status)).length;
        setReconStats(prev => ({
          ...prev,
          unreconciled,
          matched,
          total: lines.length,
          lastSync: new Date().toISOString(),
        }));
      }

      // Refresh overview data if we have overviewData
      if (overviewData) {
        fetchOverviewData();
      }

      message.success('All bank feeds synchronized');
    } catch (err) {
      console.error('Sync error:', err);
      message.error('Failed to sync bank feeds');
    } finally {
      setSyncing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { color: string; text: string; icon: React.ReactNode }> = {
      connected: { color: '#10b981', text: 'Connected', icon: <CheckCircleOutlined /> },
      pending: { color: '#f59e0b', text: 'Pending', icon: <ClockCircleOutlined /> },
      disconnected: { color: '#ef4444', text: 'Disconnected', icon: <CloseCircleOutlined /> },
      cleared: { color: '#10b981', text: 'Cleared', icon: <CheckCircleOutlined /> },
    };
    const config = configs[status] || { color: '#64748b', text: status, icon: null };
    return <Tag color={config.color} icon={config.icon}>{config.text}</Tag>;
  };

  const formatCurrency = (amount: number, currency: string = 'ZAR') => {
    const val = Number(amount) || 0;
    const symbols: Record<string, string> = { ZAR: 'R', USD: '$', GBP: '£', EUR: '€' };
    const symbol = symbols[currency] || currency;
    const formatted = Math.abs(val).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${val < 0 ? '-' : ''}${symbol} ${formatted}`;
  };

  const getTotalBalance = () => {
    // GL balances (current_balance) are already in reporting currency (ZAR)
    // No currency conversion needed - avoids double-converting foreign currency accounts
    return bankConnections
      .filter(b => b.status === 'connected')
      .reduce((sum, b) => sum + b.balance, 0);
  };

  const transactionColumns = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      width: 100,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: 'Account',
      dataIndex: 'account',
      key: 'account',
      render: (text: string) => <Text type="secondary">{text}</Text>,
    },
    {
      title: 'Amount',
      key: 'amount',
      render: (_: any, record: any) => (
        <Text strong style={{ color: record.amount >= 0 ? '#10b981' : '#ef4444' }}>
          {formatCurrency(record.amount, record.currency)}
        </Text>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusBadge(status),
    },
    {
      title: 'Reconciled',
      dataIndex: 'reconciled',
      key: 'reconciled',
      render: (reconciled: boolean) => (
        reconciled 
          ? <Tag color="green" icon={<CheckCircleOutlined />}>Yes</Tag>
          : <Tag color="default">No</Tag>
      ),
    },
  ];

  return (
    <div className="banking-hub">
      {/* Header */}
      <div className="hub-header">
        <div className="hub-title-section">
          <div className="banking-logo">
            <WalletOutlined className="logo-icon" />
          </div>
          <div>
            <Title level={2} style={{ margin: 0 }}>Banking & Treasury</Title>
            <Text type="secondary">Connected accounts, cash management, and reconciliation</Text>
          </div>
        </div>
        <div className="hub-actions">
          <Button 
            icon={<SyncOutlined spin={syncing} />} 
            onClick={handleSyncAll}
            loading={syncing}
          >
            Sync All Feeds
          </Button>
          <Button 
            icon={<PlusOutlined />}
            onClick={() => setShowConnectModal(true)}
          >
            Connect Account
          </Button>
          <Button type="primary" icon={<SwapOutlined />}>
            New Transfer
          </Button>
        </div>
      </div>

      {/* Treasury Summary Banner */}
      <Card className="treasury-status-card">
        <Row gutter={24} align="middle">
          <Col span={5}>
            <div className="treasury-badge">
              <BankOutlined className="treasury-icon" />
              <div>
                <Text strong style={{ fontSize: '16px', display: 'block', color: 'white' }}>Treasury Overview</Text>
                <Text style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>Real-time balances</Text>
              </div>
            </div>
          </Col>
          <Col span={5}>
            <Statistic 
              title="Total Cash Position" 
              value={getTotalBalance()}
              prefix="R"
              valueStyle={{ color: 'white', fontSize: '20px' }}
            />
          </Col>
          <Col span={4}>
            <Statistic 
              title="Accounts" 
              value={bankConnections.filter(b => b.status === 'connected').length}
              suffix={`/ ${bankConnections.length}`}
              valueStyle={{ color: 'white' }}
              prefix={<BankOutlined />}
            />
          </Col>
          <Col span={4}>
            <Statistic 
              title="Unreconciled" 
              value={reconStats.unreconciled}
              valueStyle={{ color: reconStats.unreconciled > 0 ? '#fbbf24' : '#86efac' }}
              prefix={<ClockCircleOutlined />}
            />
          </Col>
          <Col span={3}>
            <Statistic 
              title="Feed Status" 
              value={bankConnections.length > 0 && bankConnections.some(b => b.status === 'connected') ? 'Connected' : 'No Feed'}
              valueStyle={{ color: bankConnections.some(b => b.status === 'connected') ? '#86efac' : '#fbbf24', fontSize: '16px' }}
              prefix={bankConnections.some(b => b.status === 'connected') ? <CheckCircleOutlined /> : <ClockCircleOutlined />}
            />
          </Col>
          <Col span={3}>
            <Statistic 
              title="Last Sync" 
              value={reconStats.lastSync ? (() => {
                const diff = Date.now() - new Date(reconStats.lastSync).getTime();
                const mins = Math.floor(diff / 60000);
                if (mins < 1) return 'Just now';
                if (mins < 60) return `${mins} min`;
                const hrs = Math.floor(mins / 60);
                if (hrs < 24) return `${hrs}h ago`;
                const days = Math.floor(hrs / 24);
                return `${days}d ago`;
              })() : 'Never'}
              valueStyle={{ color: 'white', fontSize: '16px' }}
            />
          </Col>
        </Row>
      </Card>

      {/* Main Content Tabs */}
      <Tabs activeKey={activeTab} onChange={setActiveTab} className="hub-tabs">
        <TabPane 
          tab={<span><BankOutlined /> Overview</span>} 
          key="overview"
        >
          <Row gutter={[16, 16]}>
            {/* Bank Accounts Grid */}
            <Col span={24}>
              <div className="accounts-grid">
                {bankConnections.map(account => (
                  <Card 
                    key={account.id} 
                    className={`account-card ${account.status}`}
                    hoverable
                  >
                    <div className="account-header">
                      <div className="account-bank">
                        <span className="bank-logo">{account.logo}</span>
                        <div>
                          <Text strong>{account.bank}</Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: '12px' }}>{account.feedType}</Text>
                        </div>
                      </div>
                      {getStatusBadge(account.status)}
                    </div>
                    <Divider style={{ margin: '12px 0' }} />
                    <div className="account-details">
                      <Text type="secondary">{account.accountName}</Text>
                      <Text style={{ fontSize: '12px' }}>{account.accountNumber}</Text>
                    </div>
                    <div className="account-balance">
                      <div>
                        <Text type="secondary" style={{ fontSize: '11px' }}>BALANCE</Text>
                        <div className="balance-amount" style={{ color: account.balance >= 0 ? '#10b981' : '#ef4444' }}>
                          {formatCurrency(account.balance, account.currency)}
                        </div>
                      </div>
                      <div>
                        <Text type="secondary" style={{ fontSize: '11px' }}>AVAILABLE</Text>
                        <div className="available-amount">
                          {formatCurrency(account.available, account.currency)}
                        </div>
                      </div>
                    </div>
                    <div className="account-footer">
                      <Tag>{account.type}</Tag>
                      <Tag color="blue">{account.currency}</Tag>
                      {account.lastSync && (
                        <Text type="secondary" style={{ fontSize: '11px' }}>
                          Synced: {new Date(account.lastSync).toLocaleTimeString()}
                        </Text>
                      )}
                    </div>
                    <div className="account-actions">
                      <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => setActiveTab('reconciliation')}>View</Button>
                      <Button type="link" size="small" icon={<SyncOutlined />} onClick={handleSyncAll}>Sync</Button>
                      <Button type="link" size="small" icon={<SettingOutlined />} onClick={() => setActiveTab('settings')}>Settings</Button>
                    </div>
                  </Card>
                ))}
              </div>
            </Col>

            {/* This Month Summary Cards */}
            {overviewData && (
            <>
              <Col span={6}>
                <Card size="small">
                  <Statistic
                    title="This Month Transactions"
                    value={overviewData?.monthSummary?.totalTransactions ?? 0}
                    valueStyle={{ color: '#3b82f6' }}
                    prefix={<SwapOutlined />}
                  />
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {overviewData?.monthSummary?.creditCount ?? 0} in · {overviewData?.monthSummary?.debitCount ?? 0} out
                  </Text>
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic
                    title="Money In (This Month)"
                    value={overviewData?.monthSummary?.totalCredits ?? 0}
                    precision={2}
                    prefix="R"
                    valueStyle={{ color: '#10b981' }}
                  />
                  <Text type="secondary" style={{ fontSize: 11 }}>{overviewData?.monthSummary?.creditCount ?? 0} deposits</Text>
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic
                    title="Money Out (This Month)"
                    value={overviewData?.monthSummary?.totalDebits ?? 0}
                    precision={2}
                    prefix="R"
                    valueStyle={{ color: '#ef4444' }}
                  />
                  <Text type="secondary" style={{ fontSize: 11 }}>{overviewData?.monthSummary?.debitCount ?? 0} payments</Text>
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic
                    title="Reconciliation"
                    value={overviewData?.reconciliation?.reconPercent ?? 0}
                    suffix="%"
                    valueStyle={{ color: (overviewData?.reconciliation?.reconPercent ?? 0) >= 80 ? '#10b981' : '#f59e0b' }}
                    prefix={<CheckCircleOutlined />}
                  />
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {overviewData?.reconciliation?.allocated ?? 0}/{overviewData?.reconciliation?.total ?? 0} matched
                    {(overviewData?.reconciliation?.unmatched ?? 0) > 0 && (
                      <Tag color="orange" style={{ marginLeft: 4, fontSize: 10 }}>{overviewData?.reconciliation?.unmatched ?? 0} pending</Tag>
                    )}
                  </Text>
                </Card>
              </Col>
            </>
            )}

            {/* Recent Transactions + Insights Sidebar */}
            <Col span={16}>
              <Card 
                title="Recent Transactions" 
                extra={
                  <Space>
                    <Button icon={<SyncOutlined />} size="small" onClick={fetchOverviewData}>Refresh</Button>
                    <Button icon={<DownloadOutlined />} size="small" onClick={() => {
                      if (!overviewData?.recentTransactions) return;
                      const csv = 'Date,Description,Amount,Type,Status\n' +
                        overviewData.recentTransactions.map((t: any) =>
                          `${t.transaction_date?.split('T')[0]},"${t.description}",${t.amount},${t.transaction_type},${t.status}`
                        ).join('\n');
                      const blob = new Blob([csv], { type: 'text/csv' });
                      const link = document.createElement('a'); link.href = URL.createObjectURL(blob);
                      link.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`; link.click();
                      message.success('Transactions exported');
                    }}>Export</Button>
                  </Space>
                }
              >
                {overviewLoading ? (
                  <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
                ) : (
                  <Table 
                    dataSource={(overviewData?.recentTransactions || []).map((t: any) => ({
                      ...t,
                      parsedAmount: parseFloat(t.amount),
                      date: t.transaction_date?.split('T')[0],
                    }))}
                    columns={[
                      { title: 'Date', dataIndex: 'date', key: 'date', width: 100,
                        render: (d: string) => <Text type="secondary">{d}</Text> },
                      { title: 'Description', dataIndex: 'description', key: 'desc',
                        render: (v: string) => <Text strong>{v}</Text> },
                      { title: 'Amount', dataIndex: 'parsedAmount', key: 'amount', align: 'right' as const,
                        render: (v: number, record: any) => (
                          <Text strong style={{ color: record.transaction_type === 'credit' ? '#10b981' : '#ef4444' }}>
                            {record.transaction_type === 'credit' ? '+' : ''}{formatCurrency(v)}
                          </Text>
                        ) },
                      { title: 'Type', dataIndex: 'transaction_type', key: 'type', width: 80,
                        render: (v: string) => <Tag color={v === 'credit' ? 'green' : 'red'}>{v === 'credit' ? 'IN' : 'OUT'}</Tag> },
                      { title: 'Status', dataIndex: 'status', key: 'status', width: 100,
                        render: (s: string) => <Tag color={s === 'allocated' ? 'green' : 'orange'}>{s === 'allocated' ? 'Reconciled' : 'Unmatched'}</Tag> },
                    ]}
                    rowKey="id"
                    pagination={false}
                    size="small"
                  />
                )}
              </Card>
            </Col>

            {/* Right Sidebar - Spending & Income Insights */}
            <Col span={8}>
              {/* Top Spending */}
              {overviewData && (
                <Card title="Where Money Goes" size="small" style={{ marginBottom: 16 }}>
                  {(overviewData.topSpending || []).map((item: any, idx: number) => {
                    const maxTotal = parseFloat((overviewData.topSpending || [])[0]?.total || 1);
                    const pct = Math.round((parseFloat(item.total) / maxTotal) * 100);
                    return (
                      <div key={idx} style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                          <Text style={{ fontSize: 12 }} ellipsis>{item.description}</Text>
                          <Text strong style={{ color: '#ef4444', fontSize: 12, whiteSpace: 'nowrap' }}>{formatCurrency(parseFloat(item.total))}</Text>
                        </div>
                        <Progress percent={pct} showInfo={false} strokeColor="#ef4444" trailColor="#fef2f2" size="small" />
                        <Text type="secondary" style={{ fontSize: 10 }}>{item.cnt} transactions (90d)</Text>
                      </div>
                    );
                  })}
                </Card>
              )}

              {/* Top Income */}
              {overviewData && (
                <Card title="Where Money Comes From" size="small" style={{ marginBottom: 16 }}>
                  {(overviewData.topIncome || []).length === 0 ? (
                    <Text type="secondary">No incoming payments in last 90 days.</Text>
                  ) : (
                    (overviewData.topIncome || []).map((item: any, idx: number) => {
                      const maxTotal = parseFloat((overviewData.topIncome || [])[0]?.total || 1);
                      const pct = Math.round((parseFloat(item.total) / maxTotal) * 100);
                      return (
                        <div key={idx} style={{ marginBottom: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                            <Text style={{ fontSize: 12 }} ellipsis>{item.description}</Text>
                            <Text strong style={{ color: '#10b981', fontSize: 12, whiteSpace: 'nowrap' }}>{formatCurrency(parseFloat(item.total))}</Text>
                          </div>
                          <Progress percent={pct} showInfo={false} strokeColor="#10b981" trailColor="#f0fdf4" size="small" />
                          <Text type="secondary" style={{ fontSize: 10 }}>{item.cnt} transactions (90d)</Text>
                        </div>
                      );
                    })
                  )}
                </Card>
              )}

              {/* Quick Reconciliation Status */}
              {overviewData && overviewData.reconciliation?.unmatched > 0 && (
                <Card size="small">
                  <Alert
                    message={`${overviewData.reconciliation.unmatched} Unmatched Transactions`}
                    description="These transactions need to be allocated to GL accounts in the Reconciliation tab."
                    type="warning"
                    showIcon
                    action={
                      <Button size="small" type="primary" onClick={() => setActiveTab('reconciliation')}>
                        Reconcile Now
                      </Button>
                    }
                  />
                </Card>
              )}
            </Col>
          </Row>
        </TabPane>

        <TabPane
          tab={<span><FileTextOutlined /> Transactions <Badge count={allTransactions.length} style={{ backgroundColor: '#3b82f6', marginLeft: 4 }} overflowCount={9999} /></span>}
          key="transactions"
        >
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <Input
                  placeholder="Search transactions..."
                  prefix={<EyeOutlined />}
                  value={txnSearch}
                  onChange={(e) => setTxnSearch(e.target.value)}
                  style={{ width: 280 }}
                  allowClear
                />
                <Select value={txnFilter} onChange={setTxnFilter} style={{ width: 150 }}>
                  <Select.Option value="all">All Types</Select.Option>
                  <Select.Option value="credit">Money In (Credit)</Select.Option>
                  <Select.Option value="debit">Money Out (Debit)</Select.Option>
                </Select>
                <Select value={txnAccountFilter} onChange={setTxnAccountFilter} style={{ width: 200 }}>
                  <Select.Option value="all">All Accounts</Select.Option>
                  {bankConnections.map(acc => (
                    <Select.Option key={acc.id} value={acc.id}>{acc.accountName}</Select.Option>
                  ))}
                </Select>
              </div>
              <Space>
                <Button icon={<SyncOutlined />} onClick={fetchAllTransactions} loading={txnLoading}>
                  Refresh
                </Button>
                <Button icon={<DownloadOutlined />} onClick={() => {
                  const filtered = allTransactions.filter(t => {
                    const matchType = txnFilter === 'all' || (txnFilter === 'credit' ? parseFloat(t.credit_amount || 0) > 0 : parseFloat(t.debit_amount || 0) > 0);
                    const matchSearch = !txnSearch || (t.description || '').toLowerCase().includes(txnSearch.toLowerCase()) || (t.reference || '').toLowerCase().includes(txnSearch.toLowerCase());
                    const matchAcct = txnAccountFilter === 'all' || t._accountName === bankConnections.find(b => b.id === txnAccountFilter)?.accountName;
                    return matchType && matchSearch && matchAcct;
                  });
                  const csv = ['Date,Description,Reference,Debit,Credit,Balance,Status,Account']
                    .concat(filtered.map(t => [
                      t.transaction_date?.split('T')[0] || '',
                      `"${(t.description || '').replace(/"/g, '""')}"`,
                      t.reference || '',
                      t.debit_amount || 0,
                      t.credit_amount || 0,
                      t.balance || '',
                      t.status || '',
                      t._accountName || '',
                    ].join(',')))
                    .join('\n');
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const a = document.createElement('a');
                  a.href = URL.createObjectURL(blob);
                  a.download = 'bank-transactions.csv';
                  a.click();
                }}>
                  Export CSV
                </Button>
              </Space>
            </div>

            {/* Summary Bar */}
            {allTransactions.length > 0 && (
              <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={6}>
                  <Statistic title="Total Transactions" value={allTransactions.length} valueStyle={{ fontSize: 18 }} />
                </Col>
                <Col span={6}>
                  <Statistic title="Total Inflows (Credits)" prefix="R"
                    value={allTransactions.reduce((s, t) => s + parseFloat(t.debit_amount || 0), 0)}
                    precision={2} valueStyle={{ color: '#10b981', fontSize: 18 }} />
                </Col>
                <Col span={6}>
                  <Statistic title="Total Outflows (Debits)" prefix="R"
                    value={allTransactions.reduce((s, t) => s + parseFloat(t.credit_amount || 0), 0)}
                    precision={2} valueStyle={{ color: '#ef4444', fontSize: 18 }} />
                </Col>
                <Col span={6}>
                  <Statistic title="Allocated" suffix={`/ ${allTransactions.length}`}
                    value={allTransactions.filter(t => t.status === 'allocated' || t.status === 'reconciled').length}
                    valueStyle={{ fontSize: 18 }} />
                </Col>
              </Row>
            )}

            <Table
              dataSource={allTransactions.filter(t => {
                const matchType = txnFilter === 'all' || (txnFilter === 'credit' ? parseFloat(t.debit_amount || 0) > 0 : parseFloat(t.credit_amount || 0) > 0);
                const matchSearch = !txnSearch || (t.description || '').toLowerCase().includes(txnSearch.toLowerCase()) || (t.reference || '').toLowerCase().includes(txnSearch.toLowerCase());
                const matchAcct = txnAccountFilter === 'all' || t._accountName === bankConnections.find(b => b.id === txnAccountFilter)?.accountName;
                return matchType && matchSearch && matchAcct;
              })}
              columns={[
                {
                  title: 'Date', dataIndex: 'transaction_date', key: 'date', width: 110,
                  sorter: (a: any, b: any) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime(),
                  render: (d: string) => {
                    try { return <Text style={{ fontSize: 12 }}>{new Date(d).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>; }
                    catch { return <Text style={{ fontSize: 12 }}>{d}</Text>; }
                  }
                },
                {
                  title: 'Description', dataIndex: 'description', key: 'description',
                  render: (text: string, record: any) => (
                    <div>
                      <div><Text strong style={{ fontSize: 13 }}>{text}</Text></div>
                      {record.reference && <div><Text type="secondary" style={{ fontSize: 11 }}>Ref: {record.reference}</Text></div>}
                    </div>
                  )
                },
                {
                  title: 'Money In', dataIndex: 'debit_amount', key: 'credit', width: 130, align: 'right' as const,
                  sorter: (a: any, b: any) => parseFloat(a.debit_amount || 0) - parseFloat(b.debit_amount || 0),
                  render: (v: string) => {
                    const amt = parseFloat(v || '0');
                    return amt > 0 ? <Text strong style={{ color: '#10b981' }}>R {amt.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</Text> : <Text type="secondary">-</Text>;
                  }
                },
                {
                  title: 'Money Out', dataIndex: 'credit_amount', key: 'debit', width: 130, align: 'right' as const,
                  sorter: (a: any, b: any) => parseFloat(a.credit_amount || 0) - parseFloat(b.credit_amount || 0),
                  render: (v: string) => {
                    const amt = parseFloat(v || '0');
                    return amt > 0 ? <Text strong style={{ color: '#ef4444' }}>R {amt.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</Text> : <Text type="secondary">-</Text>;
                  }
                },
                {
                  title: 'Balance', dataIndex: 'balance', key: 'balance', width: 140, align: 'right' as const,
                  render: (v: string) => {
                    const amt = parseFloat(v || '0');
                    return <Text strong>R {amt.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</Text>;
                  }
                },
                {
                  title: 'Status', dataIndex: 'status', key: 'status', width: 110,
                  filters: [
                    { text: 'Allocated', value: 'allocated' },
                    { text: 'Unmatched', value: 'unmatched' },
                    { text: 'Reconciled', value: 'reconciled' },
                  ],
                  onFilter: (value: any, record: any) => record.status === value,
                  render: (s: string) => {
                    const color = s === 'allocated' || s === 'reconciled' ? 'green' : s === 'unmatched' ? 'orange' : 'default';
                    return <Tag color={color}>{(s || 'unknown').charAt(0).toUpperCase() + (s || 'unknown').slice(1)}</Tag>;
                  }
                },
                {
                  title: 'Account', key: 'account', width: 160,
                  render: (_: any, record: any) => <Text type="secondary" style={{ fontSize: 11 }}>{record._accountName}</Text>
                },
              ]}
              rowKey={(r: any) => r.line_id || r.id || `${r.transaction_date}-${r.description}-${Math.random()}`}
              size="small"
              loading={txnLoading}
              pagination={{ pageSize: 50, showSizeChanger: true, pageSizeOptions: ['25', '50', '100', '200'], showTotal: (total: number) => `${total} transactions` }}
              scroll={{ y: 600 }}
              summary={(data) => {
                const totalIn = data.reduce((s, r: any) => s + parseFloat(r.debit_amount || 0), 0);
                const totalOut = data.reduce((s, r: any) => s + parseFloat(r.credit_amount || 0), 0);
                return (
                  <Table.Summary fixed>
                    <Table.Summary.Row style={{ background: '#f8fafc', fontWeight: 'bold' }}>
                      <Table.Summary.Cell index={0} colSpan={2}><Text strong>Page Totals</Text></Table.Summary.Cell>
                      <Table.Summary.Cell index={2} align="right"><Text strong style={{ color: '#10b981' }}>R {totalIn.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</Text></Table.Summary.Cell>
                      <Table.Summary.Cell index={3} align="right"><Text strong style={{ color: '#ef4444' }}>R {totalOut.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</Text></Table.Summary.Cell>
                      <Table.Summary.Cell index={4} colSpan={3} />
                    </Table.Summary.Row>
                  </Table.Summary>
                );
              }}
            />
          </Card>
        </TabPane>

        <TabPane 
          tab={<span><SwapOutlined /> Reconciliation</span>} 
          key="reconciliation"
        >
          <Suspense fallback={<div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" tip="Loading Reconciliation..." /></div>}>
            <BankReconciliation />
          </Suspense>
        </TabPane>

        <TabPane 
          tab={<span><DollarOutlined /> Cash Flow</span>} 
          key="cashflow"
        >
          {cashFlowLoading ? (
            <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" tip="Loading cash flow data..." /></div>
          ) : !cashFlowData ? (
            <div style={{ textAlign: 'center', padding: 80 }}>
              <Button type="primary" onClick={fetchCashFlowData}>Load Cash Flow Data</Button>
            </div>
          ) : (
          <Row gutter={[16, 16]}>
            {/* Cash Position Overview */}
            <Col span={24}>
              <Card className="cash-flow-header">
                <Row gutter={24} align="middle">
                  <Col span={6}>
                    <Statistic
                      title="Current Cash Position"
                      value={cashFlowData.currentCashPosition}
                      precision={2}
                      prefix="R"
                      valueStyle={{ color: cashFlowData.currentCashPosition >= 0 ? '#10b981' : '#ef4444', fontSize: 28 }}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title="30-Day Projected"
                      value={cashFlowData.projectedBalance30d}
                      precision={2}
                      prefix="R"
                      valueStyle={{ color: cashFlowData.projectedBalance30d >= 0 ? '#3b82f6' : '#ef4444', fontSize: 24 }}
                      suffix={<Tag color={cashFlowData.changePercent >= 0 ? 'green' : 'red'}>{cashFlowData.changePercent >= 0 ? '+' : ''}{cashFlowData.changePercent}%</Tag>}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title="Avg Daily Inflows"
                      value={cashFlowData.avgDailyInflow}
                      precision={2}
                      prefix="R"
                      valueStyle={{ color: '#10b981', fontSize: 20 }}
                    />
                    <Text type="secondary" style={{ fontSize: 11 }}>Based on 90-day average</Text>
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title="Avg Daily Outflows"
                      value={cashFlowData.avgDailyOutflow}
                      precision={2}
                      prefix="R"
                      valueStyle={{ color: '#ef4444', fontSize: 20 }}
                    />
                    <Text type="secondary" style={{ fontSize: 11 }}>Based on 90-day average</Text>
                  </Col>
                </Row>
              </Card>
            </Col>

            {/* Monthly Cash Flow Chart */}
            <Col span={16}>
              <Card title="Cash Flow by Month" extra={
                <Space>
                  <Button icon={<SyncOutlined />} size="small" onClick={fetchCashFlowData}>Refresh</Button>
                  <Button icon={<DownloadOutlined />} size="small" onClick={() => {
                    const csv = 'Month,Inflows,Outflows,Net\n' + 
                      (cashFlowData.monthlyFlow || []).map((m: any) => `${m.month_label},${m.inflows},${m.outflows},${m.net}`).join('\n');
                    const blob = new Blob([csv], { type: 'text/csv' });
                    const link = document.createElement('a'); link.href = URL.createObjectURL(blob);
                    link.download = `cash-flow-${new Date().toISOString().split('T')[0]}.csv`; link.click();
                    message.success('Cash flow exported');
                  }}>Export</Button>
                </Space>
              }>
                {/* Visual Chart Area */}
                <div style={{ 
                  background: 'linear-gradient(180deg, rgba(16, 185, 129, 0.05) 0%, rgba(239, 68, 68, 0.03) 100%)',
                  borderRadius: 8,
                  padding: 24,
                  minHeight: 220,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}>
                  {/* Monthly bar chart */}
                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', height: 160, gap: 8 }}>
                    {(cashFlowData.monthlyFlow || []).map((m: any, i: number) => {
                      const maxVal = Math.max(...(cashFlowData.monthlyFlow || []).map((x: any) => Math.max(parseFloat(x.inflows || 0), parseFloat(x.outflows || 0))));
                      const inflowH = maxVal > 0 ? Math.max((parseFloat(m.inflows) / maxVal) * 140, 4) : 4;
                      const outflowH = maxVal > 0 ? Math.max((parseFloat(m.outflows) / maxVal) * 140, 4) : 4;
                      return (
                        <Tooltip key={i} title={
                          <div>
                            <div>{m.month_label}</div>
                            <div style={{ color: '#86efac' }}>In: {formatCurrency(parseFloat(m.inflows))}</div>
                            <div style={{ color: '#fca5a5' }}>Out: {formatCurrency(parseFloat(m.outflows))}</div>
                            <div style={{ color: parseFloat(m.net) >= 0 ? '#86efac' : '#fca5a5' }}>Net: {formatCurrency(parseFloat(m.net))}</div>
                          </div>
                        }>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                            <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end' }}>
                              <div style={{ width: 20, height: inflowH, background: '#10b981', borderRadius: '3px 3px 0 0', transition: 'height 0.3s' }} />
                              <div style={{ width: 20, height: outflowH, background: '#ef4444', borderRadius: '3px 3px 0 0', transition: 'height 0.3s' }} />
                            </div>
                            <Text type="secondary" style={{ fontSize: 10 }}>{m.month_label?.split(' ')[0]}</Text>
                          </div>
                        </Tooltip>
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginTop: 12 }}>
                    <Space><div style={{ width: 12, height: 12, background: '#10b981', borderRadius: 2 }} /><Text type="secondary" style={{ fontSize: 12 }}>Inflows</Text></Space>
                    <Space><div style={{ width: 12, height: 12, background: '#ef4444', borderRadius: 2 }} /><Text type="secondary" style={{ fontSize: 12 }}>Outflows</Text></Space>
                  </div>
                </div>

                {/* Weekly Projection Table */}
                <Divider style={{ margin: '16px 0 8px' }} />
                <Title level={5} style={{ marginBottom: 12 }}>4-Week Projection</Title>
                <Table
                  dataSource={cashFlowData.weeklyProjections || []}
                  columns={[
                    { title: 'Period', dataIndex: 'period', key: 'period', render: (v: string) => <Text strong>{v}</Text> },
                    { title: 'Projected Inflow', dataIndex: 'inflow', key: 'inflow', align: 'right' as const,
                      render: (v: number) => <Text style={{ color: '#10b981' }}>{formatCurrency(v)}</Text> },
                    { title: 'Projected Outflow', dataIndex: 'outflow', key: 'outflow', align: 'right' as const,
                      render: (v: number) => <Text style={{ color: '#ef4444' }}>{formatCurrency(v)}</Text> },
                    { title: 'Net', dataIndex: 'net', key: 'net', align: 'right' as const,
                      render: (v: number) => <Text strong style={{ color: v >= 0 ? '#10b981' : '#ef4444' }}>{formatCurrency(v)}</Text> },
                    { title: 'Projected Closing', dataIndex: 'closing', key: 'closing', align: 'right' as const,
                      render: (v: number) => <Text strong style={{ color: v >= 0 ? '#1e293b' : '#ef4444' }}>{formatCurrency(v)}</Text> },
                  ]}
                  pagination={false}
                  rowKey="period"
                  size="small"
                />

                {/* Monthly Detail Table */}
                <Divider style={{ margin: '16px 0 8px' }} />
                <Title level={5} style={{ marginBottom: 12 }}>Monthly History (Last 6 Months)</Title>
                <Table
                  dataSource={(cashFlowData.monthlyFlow || []).map((m: any) => ({
                    ...m,
                    inflows: parseFloat(m.inflows),
                    outflows: parseFloat(m.outflows),
                    net: parseFloat(m.net),
                  }))}
                  columns={[
                    { title: 'Month', dataIndex: 'month_label', key: 'month', render: (v: string) => <Text strong>{v}</Text> },
                    { title: 'Inflows', dataIndex: 'inflows', key: 'inflows', align: 'right' as const,
                      render: (v: number) => <Text style={{ color: '#10b981' }}>{formatCurrency(v)}</Text> },
                    { title: 'Outflows', dataIndex: 'outflows', key: 'outflows', align: 'right' as const,
                      render: (v: number) => <Text style={{ color: '#ef4444' }}>{formatCurrency(v)}</Text> },
                    { title: 'Net Cash Flow', dataIndex: 'net', key: 'net', align: 'right' as const,
                      render: (v: number) => <Text strong style={{ color: v >= 0 ? '#10b981' : '#ef4444' }}>{v >= 0 ? '+' : ''}{formatCurrency(v)}</Text> },
                  ]}
                  pagination={false}
                  rowKey="month"
                  size="small"
                  summary={(data) => {
                    const totalIn = data.reduce((s, r) => s + (r.inflows || 0), 0);
                    const totalOut = data.reduce((s, r) => s + (r.outflows || 0), 0);
                    const totalNet = data.reduce((s, r) => s + (r.net || 0), 0);
                    return (
                      <Table.Summary>
                        <Table.Summary.Row style={{ background: '#f8fafc', fontWeight: 'bold' }}>
                          <Table.Summary.Cell index={0}><Text strong>Total</Text></Table.Summary.Cell>
                          <Table.Summary.Cell index={1} align="right"><Text strong style={{ color: '#10b981' }}>{formatCurrency(totalIn)}</Text></Table.Summary.Cell>
                          <Table.Summary.Cell index={2} align="right"><Text strong style={{ color: '#ef4444' }}>{formatCurrency(totalOut)}</Text></Table.Summary.Cell>
                          <Table.Summary.Cell index={3} align="right"><Text strong style={{ color: totalNet >= 0 ? '#10b981' : '#ef4444' }}>{totalNet >= 0 ? '+' : ''}{formatCurrency(totalNet)}</Text></Table.Summary.Cell>
                        </Table.Summary.Row>
                      </Table.Summary>
                    );
                  }}
                />
              </Card>
            </Col>

            {/* Right sidebar */}
            <Col span={8}>
              {/* Recurring Patterns */}
              <Card title="Recurring Transactions" style={{ marginBottom: 16 }}>
                {(cashFlowData.recurringPatterns || []).length === 0 ? (
                  <Text type="secondary">No recurring patterns detected yet.</Text>
                ) : (
                  <List
                    size="small"
                    dataSource={cashFlowData.recurringPatterns || []}
                    renderItem={(item: any) => (
                      <List.Item>
                        <List.Item.Meta
                          avatar={
                            <Avatar size="small" style={{ background: item.type === 'credit' ? '#10b981' : '#ef4444' }}>
                              {item.type === 'credit' ? '+' : '-'}
                            </Avatar>
                          }
                          title={<Text style={{ fontSize: 13 }}>{item.description}</Text>}
                          description={
                            <Space size={4}>
                              <Text strong style={{ color: item.type === 'credit' ? '#10b981' : '#ef4444', fontSize: 12 }}>
                                {formatCurrency(Math.abs(item.avgAmount))}
                              </Text>
                              <Text type="secondary" style={{ fontSize: 11 }}>· {item.frequency}x in 90d</Text>
                            </Space>
                          }
                        />
                      </List.Item>
                    )}
                  />
                )}
              </Card>

              {/* Cash Alerts */}
              <Card title="Cash Alerts" style={{ marginBottom: 16 }}>
                {(cashFlowData.alerts || []).length === 0 ? (
                  <Alert message="All Clear" description="No cash flow alerts at this time." type="success" showIcon />
                ) : (
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {(cashFlowData.alerts || []).map((alert: any, idx: number) => (
                      <Alert
                        key={idx}
                        message={alert.title}
                        description={alert.message}
                        type={alert.type as 'error' | 'warning' | 'info' | 'success'}
                        showIcon
                      />
                    ))}
                  </Space>
                )}
              </Card>

              {/* Recent Significant Transactions */}
              <Card title="Significant Transactions (30d)" size="small">
                {(cashFlowData.recentSignificant || []).length === 0 ? (
                  <Text type="secondary">No significant transactions found.</Text>
                ) : (
                  <List
                    size="small"
                    dataSource={(cashFlowData.recentSignificant || []).slice(0, 6)}
                    renderItem={(item: any) => (
                      <List.Item style={{ padding: '6px 0' }}>
                        <div style={{ width: '100%' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ fontSize: 12 }} ellipsis>{item.description}</Text>
                            <Text strong style={{ 
                              color: item.transaction_type === 'credit' ? '#10b981' : '#ef4444',
                              fontSize: 12,
                              whiteSpace: 'nowrap',
                              marginLeft: 8,
                            }}>
                              {formatCurrency(Math.abs(parseFloat(item.amount)))}
                            </Text>
                          </div>
                          <Text type="secondary" style={{ fontSize: 10 }}>
                            {new Date(item.transaction_date).toLocaleDateString('en-ZA')}
                            {item.status !== 'allocated' && <Tag color="orange" style={{ marginLeft: 4, fontSize: 10 }}>{item.status}</Tag>}
                          </Text>
                        </div>
                      </List.Item>
                    )}
                  />
                )}
              </Card>
            </Col>
          </Row>
          )}
        </TabPane>

        <TabPane
          tab={<span><SettingOutlined /> Settings</span>}
          key="settings"
        >
          {settingsLoading ? (
            <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" tip="Loading settings..." /></div>
          ) : (
          <Card title="Bank Feed Settings" extra={
            <Button type="primary" icon={<SaveOutlined />} onClick={handleSaveSettings} loading={settingsSaving}>
              Save Settings
            </Button>
          }>
            <Form form={settingsForm} layout="vertical" style={{ maxWidth: 600 }}
              initialValues={{
                syncFrequency: '15',
                reconciliationMethod: 'auto',
                lowBalanceThreshold: '100000',
                autoCategorizationEnabled: true,
                duplicateDetectionEnabled: true,
              }}
            >
              <Form.Item name="syncFrequency" label="Auto-Sync Frequency" rules={[{ required: true, message: 'Please select sync frequency' }]}>
                <Select>
                  <Select.Option value="5">Every 5 minutes</Select.Option>
                  <Select.Option value="15">Every 15 minutes</Select.Option>
                  <Select.Option value="30">Every 30 minutes</Select.Option>
                  <Select.Option value="60">Every hour</Select.Option>
                  <Select.Option value="manual">Manual only</Select.Option>
                </Select>
              </Form.Item>
              <Form.Item name="reconciliationMethod" label="Default Reconciliation Method" rules={[{ required: true, message: 'Please select reconciliation method' }]}>
                <Select>
                  <Select.Option value="auto">Auto-match (AI-powered)</Select.Option>
                  <Select.Option value="manual">Manual matching only</Select.Option>
                  <Select.Option value="hybrid">Hybrid (AI suggests, you confirm)</Select.Option>
                </Select>
              </Form.Item>
              <Form.Item name="lowBalanceThreshold" label="Low Balance Alert Threshold (ZAR)" rules={[{ required: true, message: 'Please enter alert threshold' }]}>
                <Input prefix="R" type="number" step="1000" />
              </Form.Item>
              <Form.Item name="autoCategorizationEnabled" label="AI Auto-Categorization" valuePropName="checked">
                <Switch checkedChildren="Enabled" unCheckedChildren="Disabled" />
              </Form.Item>
              <Form.Item name="duplicateDetectionEnabled" label="Duplicate Detection" valuePropName="checked">
                <Switch checkedChildren="Enabled" unCheckedChildren="Disabled" />
              </Form.Item>
              <Divider />
              <Button type="primary" icon={<SaveOutlined />} onClick={handleSaveSettings} loading={settingsSaving}>
                Save Settings
              </Button>
            </Form>
          </Card>
          )}
        </TabPane>
      </Tabs>

      {/* Connect Bank Modal */}
      <Modal
        title="Connect Bank Account"
        open={showConnectModal}
        onCancel={() => setShowConnectModal(false)}
        footer={null}
        width={500}
      >
        <div className="bank-connect-options">
          <Card className="connect-option" hoverable onClick={() => message.info('Open Banking coming soon')}>
            <ThunderboltOutlined style={{ fontSize: '32px', color: '#10b981' }} />
            <Title level={5}>Open Banking</Title>
            <Text type="secondary">Instant secure connection via API</Text>
            <Tag color="green">Recommended</Tag>
          </Card>
          <Card className="connect-option" hoverable onClick={() => {
            setShowConnectModal(false);
            if (bankConnections.length === 0) {
              message.warning('Please add a bank account first, then use Reconciliation tab to import statements');
              setShowAddBankModal(true);
            } else {
              setShowStatementImportModal(true);
            }
          }}>
            <UploadOutlined style={{ fontSize: '32px', color: '#3b82f6' }} />
            <Title level={5}>Statement Import</Title>
            <Text type="secondary">Upload bank statements (CSV, OFX)</Text>
          </Card>
          <Card className="connect-option" hoverable onClick={() => { setShowConnectModal(false); setShowAddBankModal(true); }}>
            <FileTextOutlined style={{ fontSize: '32px', color: '#64748b' }} />
            <Title level={5}>Add Bank Account</Title>
            <Text type="secondary">Manually add a bank account</Text>
          </Card>
        </div>
        <Divider>Supported Banks (Open Banking)</Divider>
        <div className="supported-banks">
          <Tag>🏦 FNB</Tag>
          <Tag>🏛️ Standard Bank</Tag>
          <Tag>🏧 Nedbank</Tag>
          <Tag>🔴 ABSA</Tag>
          <Tag>💚 Capitec</Tag>
          <Tag>🌍 Investec</Tag>
        </div>
      </Modal>

      {/* Add Bank Account Modal */}
      <Modal
        title="Add Bank Account"
        open={showAddBankModal}
        onCancel={() => setShowAddBankModal(false)}
        footer={null}
        width={600}
      >
        <Form
          form={bankForm}
          layout="vertical"
          onFinish={handleAddBankAccount}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="bankName"
                label="Bank Name"
                rules={[{ required: true, message: 'Please select a bank' }]}
              >
                <Select placeholder="Select bank">
                  <Select.Option value="Standard Bank">Standard Bank</Select.Option>
                  <Select.Option value="First National Bank">First National Bank (FNB)</Select.Option>
                  <Select.Option value="ABSA">ABSA</Select.Option>
                  <Select.Option value="Nedbank">Nedbank</Select.Option>
                  <Select.Option value="Capitec">Capitec</Select.Option>
                  <Select.Option value="Investec">Investec</Select.Option>
                  <Select.Option value="African Bank">African Bank</Select.Option>
                  <Select.Option value="Discovery Bank">Discovery Bank</Select.Option>
                  <Select.Option value="TymeBank">TymeBank</Select.Option>
                  <Select.Option value="Other">Other</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="accountName"
                label="Account Name"
                rules={[{ required: true, message: 'Please enter account name' }]}
              >
                <Input placeholder="e.g. Main Operating Account" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="accountNumber"
                label="Account Number"
                rules={[{ required: true, message: 'Please enter account number' }]}
              >
                <Input placeholder="e.g. 10012345678" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="branchCode"
                label="Branch Code"
              >
                <Input placeholder="e.g. 051001" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="accountType"
                label="Account Type"
                rules={[{ required: true, message: 'Please select account type' }]}
              >
                <Select placeholder="Select type">
                  <Select.Option value="checking">Current / Cheque Account</Select.Option>
                  <Select.Option value="savings">Savings Account</Select.Option>
                  <Select.Option value="credit">Credit Card</Select.Option>
                  <Select.Option value="money_market">Money Market</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="currency"
                label="Currency"
                initialValue="ZAR"
              >
                <Select>
                  <Select.Option value="ZAR">ZAR - South African Rand</Select.Option>
                  <Select.Option value="USD">USD - US Dollar</Select.Option>
                  <Select.Option value="EUR">EUR - Euro</Select.Option>
                  <Select.Option value="GBP">GBP - British Pound</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="openingBalance"
            label="Opening Balance"
            rules={[{ required: true, message: 'Please enter opening balance' }]}
          >
            <Input prefix="R" placeholder="0.00" type="number" step="0.01" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={addingBank}>
                Add Bank Account
              </Button>
              <Button onClick={() => setShowAddBankModal(false)}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Statement Import Modal */}
      <Modal
        title="Import Bank Statement"
        open={showStatementImportModal}
        onCancel={() => { setShowStatementImportModal(false); setImportFileList([]); }}
        footer={null}
        width={500}
      >
        <Alert
          message="Supported Formats"
          description="CSV, OFX, QIF. The Reconciliation tab provides advanced column mapping for CSV files."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        {bankConnections.length > 0 && (
          <Alert
            message={`Importing to: ${bankConnections[0]?.bank} - ${bankConnections[0]?.accountName}`}
            type="success"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Upload.Dragger
          accept=".csv,.ofx,.qif,.txt"
          multiple={false}
          fileList={importFileList}
          beforeUpload={(file) => {
            handleStatementImport(file);
            return false;
          }}
          onChange={({ fileList }) => setImportFileList(fileList.slice(-1))}
          disabled={importingStatement}
          style={{ marginBottom: 16 }}
        >
          {importingStatement ? (
            <div style={{ padding: 24 }}>
              <Spin size="large" />
              <p style={{ marginTop: 12 }}>Processing statement...</p>
            </div>
          ) : (
            <>
              <p className="ant-upload-drag-icon">
                <InboxOutlined style={{ fontSize: 40, color: '#3b82f6' }} />
              </p>
              <p className="ant-upload-text">Click or drag file to upload</p>
              <p className="ant-upload-hint">CSV, OFX, or QIF format</p>
            </>
          )}
        </Upload.Dragger>

        <Divider />
        <Space direction="vertical" style={{ width: '100%' }}>
          <Button
            block
            type="primary"
            icon={<SwapOutlined />}
            onClick={() => {
              setShowStatementImportModal(false);
              setActiveTab('reconciliation');
              message.info('Use the Import button in the Reconciliation view for advanced CSV import with column mapping');
            }}
          >
            Advanced Import (Reconciliation Tab)
          </Button>
          <Text type="secondary" style={{ fontSize: 12, textAlign: 'center', display: 'block' }}>
            The Reconciliation tab supports detailed column mapping, preview, and auto-detection for South African bank formats.
          </Text>
        </Space>
      </Modal>
    </div>
  );
};

export default BankingHub;
