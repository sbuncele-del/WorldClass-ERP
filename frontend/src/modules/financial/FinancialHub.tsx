import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  InputNumber,
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
  DeleteOutlined,
  AppstoreOutlined,
  EyeOutlined,
  UndoOutlined,
  SendOutlined,
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
import type { FinancialStats, JournalEntry, TrialBalanceEntry, Account, CostCenter, Department, Project, Product, Location } from '../../services/financial.service';
import dayjs from 'dayjs';

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
  journalId: string;
  date: string;
  description: string;
  debit: number;
  credit: number;
  status: string;
  createdBy: string;
}

interface FinancialReport {
  name: string;
  code: string;
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
  { name: 'Income Statement', code: 'income-statement', period: 'January 2026', status: 'ready', icon: <BarChartOutlined /> },
  { name: 'Balance Sheet', code: 'balance-sheet', period: 'January 2026', status: 'ready', icon: <PieChartOutlined /> },
  { name: 'Cash Flow Statement', code: 'cash-flow', period: 'January 2026', status: 'ready', icon: <DollarOutlined /> },
  { name: 'Trial Balance', code: 'trial-balance', period: 'January 2026', status: 'ready', icon: <FileTextOutlined /> },
  { name: 'General Ledger', code: 'general-ledger', period: 'January 2026', status: 'ready', icon: <BookOutlined /> },
  { name: 'Aged Receivables', code: 'aged-receivables', period: 'January 2026', status: 'ready', icon: <CalendarOutlined /> },
  { name: 'Aged Payables', code: 'aged-payables', period: 'January 2026', status: 'ready', icon: <CalendarOutlined /> },
  { name: 'VAT Report', code: 'vat-report', period: 'January 2026', status: 'ready', icon: <SafetyCertificateOutlined /> },
];

const FinancialHub: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showJournalModal, setShowJournalModal] = useState(false);
  const [journalForm] = Form.useForm();
  const [journalSubmitting, setJournalSubmitting] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [journalLines, setJournalLines] = useState<Array<{ 
    key: number; 
    account: string; 
    debit: number; 
    credit: number;
    costCenterId?: string;
    departmentId?: string;
    projectId?: string;
    productId?: string;
    locationId?: string;
    description?: string;
  }>>([
    { key: 1, account: '', debit: 0, credit: 0 },
    { key: 2, account: '', debit: 0, credit: 0 },
  ]);

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
  const [ledgerEntries, setLedgerEntries] = useState<any[]>([]);
  const [recentJournals, setRecentJournals] = useState<JournalItem[]>([]);
  const [financialReports] = useState<FinancialReport[]>(defaultFinancialReports);
  const [showReportPreview, setShowReportPreview] = useState(false);
  const [reportPreviewData, setReportPreviewData] = useState<{ title: string; content: string; reportCode: string; data: any } | null>(null);
  const [reportPreviewLoading, setReportPreviewLoading] = useState(false);
  const [reportPeriodStart, setReportPeriodStart] = useState<dayjs.Dayjs>(dayjs().startOf('year'));
  const [reportPeriodEnd, setReportPeriodEnd] = useState<dayjs.Dayjs>(dayjs());
  const [periodStatuses, setPeriodStatuses] = useState<PeriodStatus[]>([
    { period: 'October 2025', status: 'closed', closedDate: '2025-11-10' },
    { period: 'November 2025', status: 'closed', closedDate: '2025-12-08' },
    { period: 'December 2025', status: 'open', closedDate: null },
    { period: 'January 2026', status: 'future', closedDate: null },
  ]);
  const [fiscalYearData, setFiscalYearData] = useState<any>(null);
  const [closingPeriod, setClosingPeriod] = useState(false);
  const [journalActionLoading, setJournalActionLoading] = useState<string | null>(null);
  const [showJournalDetailModal, setShowJournalDetailModal] = useState(false);
  const [journalDetailData, setJournalDetailData] = useState<any>(null);
  const [journalDetailLoading, setJournalDetailLoading] = useState(false);

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
          netIncome: Math.round((parseFloat(stats.net_income) || (revenue - expenses)) * 100) / 100,
          grossMargin: revenue > 0 ? Math.round(((revenue - expenses) / revenue) * 10000) / 100 : 0,
          totalAssets: assets,
          totalLiabilities: liabilities,
          equity: parseFloat(stats.equity) || (assets - liabilities),
          cashBalance: parseFloat(stats.cash_balance) || 0,
          receivables: parseFloat(stats.receivables) || 0,
          payables: parseFloat(stats.payables) || 0,
          currentPeriod: new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }),
          periodStatus: 'open',
          closingDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 15).toISOString().split('T')[0],
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
            setRecentJournals(journalsResponse.data.map((j: any) => ({
              id: j.entry_number || j.journal_number || j.id,
              journalId: j.id,
              date: j.entry_date || j.journal_date || j.created_at,
              description: j.description || j.notes || 'No description',
              debit: parseFloat(j.total_debit) || 0,
              credit: parseFloat(j.total_credit) || 0,
              status: (j.status || 'posted').toLowerCase(),
              createdBy: j.created_by || 'System',
            })));
          }
        } catch (err) {
          console.error('Failed to fetch journal entries:', err);
          setRecentJournals([]);
        }

        // Fetch general ledger entries
        try {
          const glResponse = await financialService.getGeneralLedger({ limit: 200 });
          if (glResponse?.data && Array.isArray(glResponse.data)) {
            setLedgerEntries(glResponse.data);
          }
        } catch (err) {
          console.error('Failed to fetch general ledger:', err);
          setLedgerEntries([]);
        }

        // Fetch fiscal year data (includes periods + summary)
        try {
          const fiscalResponse = await financialService.getFiscalCurrentYear();
          if (fiscalResponse.data) {
            setFiscalYearData(fiscalResponse.data);
            // Also populate periodStatuses from fiscal data
            const periods = fiscalResponse.data.periods || [];
            setPeriodStatuses(periods.map((p: any) => ({
              period: p.period_name || p.period || 'Unknown',
              status: (p.status || 'unknown').toLowerCase(),
              closedDate: p.closed_at || p.closed_date || null,
              periodId: p.period_id,
            })));
          }
        } catch {
          // Fallback to old periods endpoint
          try {
            const periodsResponse = await financialService.getPeriods();
            if (periodsResponse.data && Array.isArray(periodsResponse.data)) {
              setPeriodStatuses(periodsResponse.data.map((p: any) => ({
                period: p.period || p.period_name || 'Unknown',
                status: (p.status || 'unknown').toLowerCase(),
                closedDate: p.closed_date || p.closed_at || null,
              })));
            }
          } catch {
            // Keep defaults
          }
        }

        // Fetch accounts for journal entry dropdown
        try {
          const accountsResponse = await financialService.getChartOfAccounts({ limit: 200 });
          if (accountsResponse.data && Array.isArray(accountsResponse.data)) {
            // Filter out inactive accounts and those without valid IDs
            setAccounts(accountsResponse.data.filter((a: Account) => 
              a.is_active !== false && (a.id || a.account_id)
            ));
          }
        } catch {
          // Will use empty accounts list
        }

        // Fetch dimensions for journal entry dropdowns
        try {
          const dimensions = await financialService.getAllDimensions();
          setCostCenters(dimensions.costCenters.filter(d => d.is_active !== false));
          setDepartments(dimensions.departments.filter(d => d.is_active !== false));
          setProjects(dimensions.projects.filter(d => d.is_active !== false));
          setProducts(dimensions.products.filter(d => d.is_active !== false));
          setLocations(dimensions.locations.filter(d => d.is_active !== false));
        } catch {
          // Will use empty dimension lists
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

  // Handle journal entry submission
  const handleJournalSubmit = async () => {
    try {
      const values = await journalForm.validateFields();
      
      // Validate lines
      const validLines = journalLines.filter(line => line.account && (line.debit > 0 || line.credit > 0));
      if (validLines.length < 2) {
        message.error('Please add at least 2 journal lines with accounts and amounts');
        return;
      }

      // Check debits = credits
      const totalDebit = validLines.reduce((sum, line) => sum + (line.debit || 0), 0);
      const totalCredit = validLines.reduce((sum, line) => sum + (line.credit || 0), 0);
      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        message.error(`Debits (R${totalDebit.toFixed(2)}) must equal Credits (R${totalCredit.toFixed(2)})`);
        return;
      }

      setJournalSubmitting(true);

      const payload = {
        entry_date: values.entry_date.format('YYYY-MM-DD'),
        description: values.description,
        lines: validLines.map(line => ({
          account_id: line.account,
          debit_amount: line.debit || 0,
          credit_amount: line.credit || 0,
          cost_center_id: line.costCenterId || null,
          department_id: line.departmentId || null,
          project_id: line.projectId || null,
          product_id: line.productId || null,
          location_id: line.locationId || null,
          description: line.description || null,
        })),
      };

      const result = await financialService.createJournalEntry(payload);
      
      if (result.success) {
        message.success(`Journal Entry ${result.data?.entry_number || ''} created successfully!`);
        setShowJournalModal(false);
        journalForm.resetFields();
        setJournalLines([
          { key: 1, account: '', debit: 0, credit: 0 },
          { key: 2, account: '', debit: 0, credit: 0 },
        ]);
        // Refresh journal entries list
        const journalsResponse = await financialService.getJournalEntries({ limit: 10 });
        if (journalsResponse.data && Array.isArray(journalsResponse.data)) {
          setRecentJournals(journalsResponse.data.map((j: any) => ({
            id: j.entry_number || j.journal_number || j.id,
            journalId: j.id,
            date: j.entry_date || j.journal_date || j.created_at,
            description: j.description || j.notes || 'No description',
            debit: parseFloat(j.total_debit) || 0,
            credit: parseFloat(j.total_credit) || 0,
            status: (j.status || 'posted').toLowerCase(),
            createdBy: j.created_by || 'System',
          })));
        }
      } else {
        message.error(result.message || 'Failed to create journal entry');
      }
    } catch (err: unknown) {
      console.error('Journal entry error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create journal entry';
      message.error(errorMessage);
    } finally {
      setJournalSubmitting(false);
    }
  };

  // Journal line handlers
  const addJournalLine = () => {
    const newKey = Math.max(...journalLines.map(l => l.key)) + 1;
    setJournalLines([...journalLines, { key: newKey, account: '', debit: 0, credit: 0 }]);
  };

  const removeJournalLine = (key: number) => {
    if (journalLines.length > 2) {
      setJournalLines(journalLines.filter(l => l.key !== key));
    }
  };

  const updateJournalLine = (key: number, field: string, value: string | number) => {
    setJournalLines(journalLines.map(l => 
      l.key === key ? { ...l, [field]: value } : l
    ));
  };

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

  // Shared helper to refresh journal entries list
  const refreshJournalEntries = async () => {
    try {
      const journalsResponse = await financialService.getJournalEntries({ limit: 10 });
      if (journalsResponse.data && Array.isArray(journalsResponse.data)) {
        setRecentJournals(journalsResponse.data.map((j: any) => ({
          id: j.entry_number || j.journal_number || j.id,
          journalId: j.id,
          date: j.entry_date || j.journal_date || j.created_at,
          description: j.description || j.notes || 'No description',
          debit: parseFloat(j.total_debit) || 0,
          credit: parseFloat(j.total_credit) || 0,
          status: (j.status || 'posted').toLowerCase(),
          createdBy: j.created_by || 'System',
        })));
      }
    } catch {
      // Keep existing list on refresh failure
    }
  };

  // Post a journal entry (change status from draft/pending to posted)
  const handlePostJournal = async (record: JournalItem) => {
    if (record.status === 'posted') {
      message.info('This entry is already posted');
      return;
    }
    try {
      setJournalActionLoading(record.journalId);
      const result = await financialService.postJournalEntry(record.journalId);
      if (result.success) {
        message.success(result.message || `Journal entry ${record.id} posted successfully`);
        await refreshJournalEntries();
      } else {
        message.error(result.message || 'Failed to post journal entry');
      }
    } catch (err: any) {
      message.error(err?.response?.data?.message || err?.message || 'Failed to post journal entry');
    } finally {
      setJournalActionLoading(null);
    }
  };

  // Reverse a posted journal entry
  const handleReverseJournal = async (record: JournalItem) => {
    if (record.status !== 'posted') {
      message.warning('Only posted entries can be reversed');
      return;
    }
    if (!window.confirm(`Are you sure you want to reverse journal entry ${record.id}? This will create a reversing entry.`)) {
      return;
    }
    try {
      setJournalActionLoading(record.journalId);
      const result = await financialService.reverseJournalEntry(record.journalId);
      if (result.success) {
        message.success(result.message || `Journal entry ${record.id} reversed successfully`);
        await refreshJournalEntries();
      } else {
        message.error(result.message || 'Failed to reverse journal entry');
      }
    } catch (err: any) {
      message.error(err?.response?.data?.message || err?.message || 'Failed to reverse journal entry');
    } finally {
      setJournalActionLoading(null);
    }
  };

  // View journal entry details (with lines)
  const handleViewJournalDetail = async (record: JournalItem) => {
    setShowJournalDetailModal(true);
    setJournalDetailLoading(true);
    setJournalDetailData(null);
    try {
      const result = await financialService.getJournalEntry(record.journalId);
      if (result.success && result.data) {
        setJournalDetailData(result.data);
      } else {
        message.error('Failed to load journal entry details');
      }
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Failed to load journal entry details');
    } finally {
      setJournalDetailLoading(false);
    }
  };

  // Download report as CSV
  const handleDownloadReport = async (reportCode: string, reportName: string) => {
    try {
      message.loading({ content: `Generating ${reportName}...`, key: 'download' });
      
      const params = {
        startDate: reportPeriodStart.format('YYYY-MM-DD'),
        endDate: reportPeriodEnd.format('YYYY-MM-DD'),
        asOfDate: reportPeriodEnd.format('YYYY-MM-DD'),
      };
      const response = await financialService.downloadReport(reportCode, params);
      
      if (!response.success || !response.data) {
        message.error({ content: `No data available for ${reportName}`, key: 'download' });
        return;
      }

      // Generate CSV based on report type
      let csvContent = '';
      const dateStr = new Date().toISOString().split('T')[0];
      
      if (reportCode === 'balance-sheet') {
        csvContent = generateBalanceSheetCSV(response.data);
      } else if (reportCode === 'income-statement') {
        csvContent = generateIncomeStatementCSV(response.data);
      } else if (reportCode === 'trial-balance') {
        csvContent = generateTrialBalanceCSV(response.data);
      } else if (reportCode === 'cash-flow') {
        csvContent = generateCashFlowCSV(response.data);
      } else if (reportCode === 'general-ledger') {
        csvContent = generateGeneralLedgerCSV(response.data);
      } else if (reportCode === 'aged-receivables') {
        csvContent = generateAgedReceivablesCSV(response.data);
      } else if (reportCode === 'aged-payables') {
        csvContent = generateAgedPayablesCSV(response.data);
      } else if (reportCode === 'vat-report') {
        csvContent = generateVATReportCSV(response.data);
      } else {
        csvContent = `Report: ${reportName}\nGenerated: ${dateStr}\n\nReport data not available in CSV format yet.\nPlease check back as this report is being developed.`;
      }

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${reportCode}_${dateStr}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
      
      message.success({ content: `${reportName} downloaded!`, key: 'download' });
    } catch (err) {
      console.error('Download error:', err);
      message.error({ content: `Failed to download ${reportName}`, key: 'download' });
    }
  };

  // View report in modal
  const handleViewReport = async (reportCode: string, reportName: string) => {
    setReportPreviewLoading(true);
    setShowReportPreview(true);
    setReportPreviewData({ title: reportName, content: '', reportCode, data: null });
    try {
      const params = {
        startDate: reportPeriodStart.format('YYYY-MM-DD'),
        endDate: reportPeriodEnd.format('YYYY-MM-DD'),
        asOfDate: reportPeriodEnd.format('YYYY-MM-DD'),
      };
      const response = await financialService.downloadReport(reportCode, params);
      if (!response.success || !response.data) {
        setReportPreviewData({ title: reportName, content: 'No data available for this report.', reportCode, data: null });
        return;
      }
      // Store the raw data for structured rendering
      let csvContent = '';
      if (reportCode === 'balance-sheet') csvContent = generateBalanceSheetCSV(response.data);
      else if (reportCode === 'income-statement') csvContent = generateIncomeStatementCSV(response.data);
      else if (reportCode === 'trial-balance') csvContent = generateTrialBalanceCSV(response.data);
      else if (reportCode === 'cash-flow') csvContent = generateCashFlowCSV(response.data);
      else if (reportCode === 'general-ledger') csvContent = generateGeneralLedgerCSV(response.data);
      else if (reportCode === 'aged-receivables') csvContent = generateAgedReceivablesCSV(response.data);
      else if (reportCode === 'aged-payables') csvContent = generateAgedPayablesCSV(response.data);
      else if (reportCode === 'vat-report') csvContent = generateVATReportCSV(response.data);
      else csvContent = 'Report preview not yet available for this report type.';
      setReportPreviewData({ title: reportName, content: csvContent, reportCode, data: response.data });
    } catch {
      setReportPreviewData({ title: reportName, content: 'Failed to load report data.', reportCode, data: null });
    } finally {
      setReportPreviewLoading(false);
    }
  };

  // Generate CSV for Balance Sheet
  const generateBalanceSheetCSV = (data: any) => {
    let csv = `Balance Sheet\nAs of: ${data.as_of_date || new Date().toISOString().split('T')[0]}\n\n`;
    
    csv += 'ASSETS\n';
    csv += 'Account,Balance\n';
    if (data.current_assets?.accounts?.length > 0) {
      csv += 'Current Assets\n';
      data.current_assets.accounts.forEach((acc: any) => {
        csv += `"${acc.account_name || acc.name}",${acc.balance || 0}\n`;
      });
      csv += `Current Assets Subtotal,${data.current_assets.subtotal || 0}\n`;
    }
    if (data.non_current_assets?.accounts?.length > 0) {
      csv += 'Non-Current Assets\n';
      data.non_current_assets.accounts.forEach((acc: any) => {
        csv += `"${acc.account_name || acc.name}",${acc.balance || 0}\n`;
      });
      csv += `Non-Current Assets Subtotal,${data.non_current_assets.subtotal || 0}\n`;
    }
    csv += `TOTAL ASSETS,${data.total_assets || 0}\n\n`;
    
    csv += 'LIABILITIES\n';
    if (data.current_liabilities?.accounts?.length > 0) {
      csv += 'Current Liabilities\n';
      data.current_liabilities.accounts.forEach((acc: any) => {
        csv += `"${acc.account_name || acc.name}",${acc.balance || 0}\n`;
      });
      csv += `Current Liabilities Subtotal,${data.current_liabilities.subtotal || 0}\n`;
    }
    if (data.non_current_liabilities?.accounts?.length > 0) {
      csv += 'Non-Current Liabilities\n';
      data.non_current_liabilities.accounts.forEach((acc: any) => {
        csv += `"${acc.account_name || acc.name}",${acc.balance || 0}\n`;
      });
      csv += `Non-Current Liabilities Subtotal,${data.non_current_liabilities.subtotal || 0}\n`;
    }
    csv += `TOTAL LIABILITIES,${data.total_liabilities || 0}\n\n`;
    
    csv += 'EQUITY\n';
    if (data.equity?.accounts?.length > 0) {
      data.equity.accounts.forEach((acc: any) => {
        csv += `"${acc.account_name || acc.name}",${acc.balance || 0}\n`;
      });
    }
    csv += `TOTAL EQUITY,${data.total_equity || 0}\n\n`;
    csv += `TOTAL LIABILITIES & EQUITY,${data.total_liabilities_equity || 0}\n`;
    
    return csv;
  };

  // Generate CSV for Income Statement
  const generateIncomeStatementCSV = (data: any) => {
    const periodLabel = data.period?.label || data.period || 'Current';
    let csv = `Income Statement\nPeriod: ${periodLabel}\n\n`;
    
    csv += 'REVENUE\n';
    csv += 'Account Code,Account Name,Amount\n';
    const revenueAccounts = data.revenue?.accounts || (Array.isArray(data.revenue) ? data.revenue : []);
    revenueAccounts.forEach((acc: any) => {
      csv += `"${acc.code || acc.account_code || ''}","${acc.name || acc.account_name || ''}",${acc.balance || acc.amount || 0}\n`;
    });
    const totalRevenue = data.revenue_total || data.total_revenue || data.revenue?.subtotal || data.revenue?.total || 0;
    csv += `,,${totalRevenue}\n\n`;
    
    csv += 'COST OF SALES\n';
    const cosAccounts = data.cost_of_sales?.accounts || [];
    cosAccounts.forEach((acc: any) => {
      csv += `"${acc.code || acc.account_code || ''}","${acc.name || acc.account_name || ''}",${acc.balance || acc.amount || 0}\n`;
    });
    csv += `,,${data.cost_of_sales?.subtotal || 0}\n\n`;
    
    csv += `GROSS PROFIT,,${data.gross_profit || totalRevenue}\n\n`;
    
    csv += 'OPERATING EXPENSES\n';
    const expenseAccounts = data.operating_expenses?.accounts || data.expenses?.accounts || (Array.isArray(data.expenses) ? data.expenses : []);
    expenseAccounts.forEach((acc: any) => {
      csv += `"${acc.code || acc.account_code || ''}","${acc.name || acc.account_name || ''}",${acc.balance || acc.amount || 0}\n`;
    });
    const totalExpenses = data.expenses_total || data.total_expenses || data.operating_expenses?.subtotal || data.expenses?.total || 0;
    csv += `,,${totalExpenses}\n\n`;
    
    csv += `OPERATING PROFIT,,${data.operating_profit || data.net_income || 0}\n`;
    csv += `NET PROFIT AFTER TAX,,${data.net_profit_after_tax || data.net_income || 0}\n`;
    
    return csv;
  };

  // Generate CSV for Trial Balance
  const generateTrialBalanceCSV = (data: any) => {
    let csv = `Trial Balance\nAs of: ${new Date().toISOString().split('T')[0]}\n\n`;
    csv += 'Account Code,Account Name,Debit,Credit\n';
    
    const accounts = data.accounts || data.data || data;
    if (Array.isArray(accounts)) {
      accounts.forEach((acc: any) => {
        const debit = acc.debit || acc.debit_balance || 0;
        const credit = acc.credit || acc.credit_balance || 0;
        csv += `"${acc.account_code || acc.code}","${acc.account_name || acc.name}",${debit},${credit}\n`;
      });
    }
    
    csv += `\nTOTALS,${data.totals?.debit || ''},${data.totals?.credit || ''}\n`;
    
    return csv;
  };

  // Generate CSV for Cash Flow Statement
  const generateCashFlowCSV = (data: any) => {
    const periodLabel = data.period?.label || 'Current';
    let csv = `Cash Flow Statement\nPeriod: ${periodLabel}\n\n`;
    
    csv += 'OPERATING ACTIVITIES\n';
    csv += 'Account Code,Account Name,Amount\n';
    const operatingItems = data.operating?.items || data.operating_activities || [];
    operatingItems.forEach((item: any) => {
      csv += `"${item.account_code || ''}","${item.account_name || item.description || ''}",${item.net_amount || item.amount || 0}\n`;
    });
    const operatingTotal = data.operating?.total || data.totals?.operating || 0;
    csv += `,,${operatingTotal}\n\n`;
    
    csv += 'INVESTING ACTIVITIES\n';
    const investingItems = data.investing?.items || data.investing_activities || [];
    investingItems.forEach((item: any) => {
      csv += `"${item.account_code || ''}","${item.account_name || item.description || ''}",${item.net_amount || item.amount || 0}\n`;
    });
    const investingTotal = data.investing?.total || data.totals?.investing || 0;
    csv += `,,${investingTotal}\n\n`;
    
    csv += 'FINANCING ACTIVITIES\n';
    const financingItems = data.financing?.items || data.financing_activities || [];
    financingItems.forEach((item: any) => {
      csv += `"${item.account_code || ''}","${item.account_name || item.description || ''}",${item.net_amount || item.amount || 0}\n`;
    });
    const financingTotal = data.financing?.total || data.totals?.financing || 0;
    csv += `,,${financingTotal}\n\n`;
    
    const netCashFlow = data.net_change || data.totals?.net_cash_flow || (operatingTotal + investingTotal + financingTotal);
    csv += `NET CHANGE IN CASH,,${netCashFlow}\n`;
    if (data.beginning_cash !== undefined) csv += `Beginning Cash,,${data.beginning_cash}\n`;
    if (data.ending_cash !== undefined) csv += `Ending Cash,,${data.ending_cash}\n`;
    
    return csv;
  };

  // Generate CSV for General Ledger
  const generateGeneralLedgerCSV = (data: any) => {
    let csv = `General Ledger\nGenerated: ${new Date().toISOString().split('T')[0]}\n\n`;
    csv += 'Date,Document Number,Account Code,Account Name,Account Type,Description,Debit,Credit\n';
    
    // Handle flat array of transactions (from v2 controller)
    const entries = Array.isArray(data) ? data : data.data || data.entries || data.accounts || [];
    
    if (Array.isArray(entries) && entries.length > 0 && entries[0].transaction_date !== undefined) {
      // Flat transaction format from v2 controller
      let totalDebits = 0;
      let totalCredits = 0;
      entries.forEach((txn: any) => {
        const debit = parseFloat(txn.debit_amount || txn.debit || 0);
        const credit = parseFloat(txn.credit_amount || txn.credit || 0);
        totalDebits += debit;
        totalCredits += credit;
        csv += `"${txn.transaction_date || ''}","${txn.document_number || ''}","${txn.account_code || ''}","${txn.account_name || ''}","${txn.account_type || ''}","${txn.line_description || txn.entry_description || ''}",${debit},${credit}\n`;
      });
      csv += `\nTOTALS,,,,,${totalDebits.toFixed(2)},${totalCredits.toFixed(2)}\n`;
    } else {
      // Grouped-by-account format (legacy)
      entries.forEach((account: any) => {
        csv += `\n${account.accountCode || account.account_code || ''} - ${account.accountName || account.account_name || ''}\n`;
        const transactions = account.transactions || [];
        transactions.forEach((txn: any) => {
          csv += `"${txn.date || ''}","${txn.entryNumber || txn.entry_number || ''}","${account.accountCode || account.account_code || ''}","${account.accountName || account.account_name || ''}","","${txn.description || ''}",${txn.debit || 0},${txn.credit || 0}\n`;
        });
      });
    }
    
    return csv;
  };

  // Generate CSV for Aged Receivables
  const generateAgedReceivablesCSV = (data: any) => {
    let csv = `Aged Receivables Report\nAs of: ${data.asOfDate || data.as_of_date || new Date().toISOString().split('T')[0]}\n\n`;
    csv += 'Customer,Current (0-30),31-60 Days,61-90 Days,Over 90 Days,Total Outstanding\n';
    
    const customers = data.customers || data.data || [];
    customers.forEach((customer: any) => {
      csv += `"${customer.customerName || customer.customer_name || customer.name || ''}",${customer.current || customer.bucket_0_30 || 0},${customer.days1_30 || customer.days_31_60 || customer.bucket_31_60 || 0},${customer.days31_60 || customer.days_61_90 || customer.bucket_61_90 || 0},${customer.days61_90 || customer.over_90 || customer.bucket_90_plus || 0},${customer.over90 || 0},${customer.total || 0}\n`;
    });
    
    csv += `\nTOTALS,${data.totals?.current || data.summary?.bucket_0_30 || 0},${data.totals?.days1_30 || data.totals?.days_31_60 || data.summary?.bucket_31_60 || 0},${data.totals?.days31_60 || data.totals?.days_61_90 || data.summary?.bucket_61_90 || 0},${data.totals?.days61_90 || data.totals?.over_90 || data.summary?.bucket_90_plus || 0},${data.totals?.over90 || 0},${data.totals?.total || data.summary?.total_outstanding || 0}\n`;
    
    return csv;
  };

  // Generate CSV for Aged Payables
  const generateAgedPayablesCSV = (data: any) => {
    let csv = `Aged Payables Report\nAs of: ${data.asOfDate || data.as_of_date || new Date().toISOString().split('T')[0]}\n\n`;
    csv += 'Vendor,Current (0-30),31-60 Days,61-90 Days,Over 90 Days,Total Outstanding\n';
    
    const vendors = data.vendors || data.suppliers || data.data || [];
    vendors.forEach((vendor: any) => {
      csv += `"${vendor.vendorName || vendor.vendor_name || vendor.supplier_name || vendor.name || ''}",${vendor.current || vendor.bucket_0_30 || 0},${vendor.days1_30 || vendor.days_31_60 || vendor.bucket_31_60 || 0},${vendor.days31_60 || vendor.days_61_90 || vendor.bucket_61_90 || 0},${vendor.days61_90 || vendor.over_90 || vendor.bucket_90_plus || 0},${vendor.over90 || 0},${vendor.total || 0}\n`;
    });
    
    csv += `\nTOTALS,${data.totals?.current || data.summary?.bucket_0_30 || 0},${data.totals?.days1_30 || data.totals?.days_31_60 || data.summary?.bucket_31_60 || 0},${data.totals?.days31_60 || data.totals?.days_61_90 || data.summary?.bucket_61_90 || 0},${data.totals?.days61_90 || data.totals?.over_90 || data.summary?.bucket_90_plus || 0},${data.totals?.over90 || 0},${data.totals?.total || data.summary?.total_outstanding || 0}\n`;
    
    return csv;
  };

  // Generate CSV for VAT Report
  const generateVATReportCSV = (data: any) => {
    let csv = `VAT Report\nPeriod: ${data.period?.fromDate || ''} to ${data.period?.toDate || ''}\n\n`;
    
    csv += 'OUTPUT VAT (Collected on Sales)\n';
    csv += 'Date,Entry Number,Reference,Description,Amount\n';
    const outputTxns = data.outputVat?.transactions || data.output_vat?.items || [];
    outputTxns.forEach((item: any) => {
      csv += `"${item.date || ''}","${item.entryNumber || item.entry_number || ''}","${item.reference || ''}","${item.description || item.name || ''}",${item.amount || item.vat_amount || 0}\n`;
    });
    csv += `Total Output VAT,,,,${data.outputVat?.total || data.output_vat?.total || data.total_output_vat || 0}\n\n`;
    
    csv += 'INPUT VAT (Paid on Purchases)\n';
    csv += 'Date,Entry Number,Reference,Description,Amount\n';
    const inputTxns = data.inputVat?.transactions || data.input_vat?.items || [];
    inputTxns.forEach((item: any) => {
      csv += `"${item.date || ''}","${item.entryNumber || item.entry_number || ''}","${item.reference || ''}","${item.description || item.name || ''}",${item.amount || item.vat_amount || 0}\n`;
    });
    csv += `Total Input VAT,,,,${data.inputVat?.total || data.input_vat?.total || data.total_input_vat || 0}\n\n`;
    
    csv += `VAT Rate:,${data.summary?.vatRate || 15}%\n`;
    csv += `NET VAT PAYABLE/(REFUND):,R ${data.summary?.netVatPayable || data.net_vat || data.vat_payable || 0}\n`;
    
    return csv;
  };

  const formatCurrency = (amount: number) => { const val = Number(amount) || 0; return `R ${val.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`; };

  const getStatusTag = (status: string) => {
    const configs: Record<string, { color: string; text: string; icon?: React.ReactNode }> = {
      'posted': { color: 'green', text: 'Posted', icon: <CheckCircleOutlined /> },
      'pending': { color: 'orange', text: 'Pending', icon: <ClockCircleOutlined /> },
      'draft': { color: 'default', text: 'Draft' },
      'reversed': { color: 'red', text: 'Reversed', icon: <UndoOutlined /> },
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
    {
      title: 'Actions',
      key: 'actions',
      width: 180,
      render: (_: any, record: JournalItem) => (
        <Space size="small">
          <Tooltip title="View Details">
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleViewJournalDetail(record)}
            />
          </Tooltip>
          {record.status !== 'posted' && (
            <Tooltip title="Post Entry">
              <Button
                type="link"
                size="small"
                icon={<SendOutlined />}
                loading={journalActionLoading === record.journalId}
                onClick={() => handlePostJournal(record)}
              />
            </Tooltip>
          )}
          {record.status === 'posted' && (
            <Tooltip title="Reverse Entry">
              <Button
                type="link"
                size="small"
                danger
                icon={<UndoOutlined />}
                loading={journalActionLoading === record.journalId}
                onClick={() => handleReverseJournal(record)}
              />
            </Tooltip>
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
          {/* Left Column - Key Metrics */}
          <Col span={16}>
            {/* P&L Summary */}
            <Card title="Profit & Loss Summary" style={{ marginBottom: 24 }}>
              <Row gutter={24}>
                <Col span={8}>
                  <Statistic
                    title="Revenue"
                    value={financialStats.revenue}
                    precision={2}
                    prefix="R"
                    valueStyle={{ color: '#10b981' }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="Expenses"
                    value={financialStats.expenses}
                    precision={2}
                    prefix="R"
                    valueStyle={{ color: '#ef4444' }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="Net Income"
                    value={financialStats.netIncome}
                    precision={2}
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
                  format={(percent) => `${percent?.toFixed(1)}%`}
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
            <Card 
              title={<span>Period Status {fiscalYearData?.summary && <Tag color="blue" style={{ marginLeft: 8 }}>{fiscalYearData.summary.percentComplete}% Complete</Tag>}</span>}
              style={{ marginTop: 24 }}
              extra={fiscalYearData?.fiscalYear && <Text type="secondary" style={{ fontSize: 12 }}>{fiscalYearData.fiscalYear.year_name}</Text>}
            >
              {periodStatuses.slice().sort((a: any, b: any) => {
                // Show open first, then closed (most recent first)
                if (a.status === 'open' && b.status !== 'open') return -1;
                if (b.status === 'open' && a.status !== 'open') return 1;
                return 0;
              }).slice(0, 6).map((p, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: idx < Math.min(periodStatuses.length, 6) - 1 ? '1px solid #f1f5f9' : 'none' }}>
                  <div>
                    <Text strong={p.status === 'open'}>{p.period}</Text>
                    {p.closedDate && <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>Closed {dayjs(p.closedDate).format('DD MMM YYYY')}</Text>}
                  </div>
                  {getStatusTag(p.status)}
                </div>
              ))}
              {periodStatuses.length > 6 && (
                <div style={{ textAlign: 'center', paddingTop: 8 }}>
                  <Button type="link" size="small" onClick={() => setActiveTab('fiscal')}>View all {periodStatuses.length} periods →</Button>
                </div>
              )}
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
          <Col span={24}>
            {/* Period Selector */}
            <Card size="small" style={{ marginBottom: 16 }}>
              <Row align="middle" gutter={16}>
                <Col>
                  <Text strong style={{ marginRight: 8 }}>Reporting Period:</Text>
                </Col>
                <Col>
                  <DatePicker 
                    value={reportPeriodStart} 
                    onChange={(d) => d && setReportPeriodStart(d)} 
                    format="YYYY-MM-DD"
                    size="small"
                    style={{ width: 140 }}
                  />
                </Col>
                <Col><Text type="secondary">to</Text></Col>
                <Col>
                  <DatePicker 
                    value={reportPeriodEnd} 
                    onChange={(d) => d && setReportPeriodEnd(d)} 
                    format="YYYY-MM-DD"
                    size="small"
                    style={{ width: 140 }}
                  />
                </Col>
                <Col>
                  <Space size="small">
                    <Button size="small" onClick={() => { setReportPeriodStart(dayjs().startOf('month')); setReportPeriodEnd(dayjs().endOf('month')); }}>This Month</Button>
                    <Button size="small" onClick={() => { setReportPeriodStart(dayjs().subtract(1, 'month').startOf('month')); setReportPeriodEnd(dayjs().subtract(1, 'month').endOf('month')); }}>Last Month</Button>
                    <Button size="small" onClick={() => { setReportPeriodStart(dayjs().startOf('quarter')); setReportPeriodEnd(dayjs().endOf('quarter')); }}>This Quarter</Button>
                    <Button size="small" onClick={() => { setReportPeriodStart(dayjs().startOf('year')); setReportPeriodEnd(dayjs()); }}>YTD</Button>
                    <Button size="small" onClick={() => { setReportPeriodStart(dayjs('2025-01-01')); setReportPeriodEnd(dayjs()); }}>All Time</Button>
                  </Space>
                </Col>
              </Row>
            </Card>
          </Col>
          <Col span={16}>
            <Card title={<span><FileTextOutlined style={{ marginRight: 8 }} />Financial Reports</span>} extra={
              <Text type="secondary" style={{ fontSize: 12 }}>{reportPeriodStart.format('DD MMM YYYY')} — {reportPeriodEnd.format('DD MMM YYYY')}</Text>
            }>
              <List
                dataSource={financialReports}
                renderItem={item => (
                  <List.Item
                    style={{ padding: '12px 0' }}
                    actions={[
                      <Tooltip title="Preview Report" key="view">
                        <Button 
                          type="link" 
                          icon={<EyeOutlined />}
                          onClick={() => handleViewReport(item.code, item.name)}
                        >
                          View
                        </Button>
                      </Tooltip>,
                      <Button 
                        type="link" 
                        icon={<DownloadOutlined />} 
                        key="download"
                        onClick={() => handleDownloadReport(item.code, item.name)}
                      >
                        Download
                      </Button>,
                      <Button type="link" icon={<PrinterOutlined />} key="print"
                        onClick={() => {
                          handleViewReport(item.code, item.name);
                        }}
                      >Print</Button>,
                    ]}
                  >
                    <List.Item.Meta
                      avatar={<span style={{ fontSize: 24, color: '#667eea' }}>{item.icon}</span>}
                      title={<Text strong>{item.name}</Text>}
                      description={`${reportPeriodStart.format('DD MMM YYYY')} — ${reportPeriodEnd.format('DD MMM YYYY')}`}
                    />
                    {getStatusTag('ready')}
                  </List.Item>
                )}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card title="Quick Reports" style={{ marginBottom: 16 }}>
              <List size="small">
                <List.Item>
                  <Button type="link" icon={<EyeOutlined />} onClick={() => handleViewReport('trial-balance', 'Trial Balance')} style={{ padding: 0 }}>
                    Trial Balance
                  </Button>
                </List.Item>
                <List.Item>
                  <Button type="link" icon={<EyeOutlined />} onClick={() => handleViewReport('income-statement', 'Income Statement')} style={{ padding: 0 }}>
                    Income Statement
                  </Button>
                </List.Item>
                <List.Item>
                  <Button type="link" icon={<EyeOutlined />} onClick={() => handleViewReport('balance-sheet', 'Balance Sheet')} style={{ padding: 0 }}>
                    Balance Sheet
                  </Button>
                </List.Item>
              </List>
            </Card>
            <Card title="Report Info">
              <Paragraph type="secondary">
                All reports are generated from live GL data. Click <EyeOutlined /> to preview or <DownloadOutlined /> to export as CSV.
              </Paragraph>
              <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                Reports comply with IFRS presentation standards and South African regulatory requirements.
              </Paragraph>
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
        <Card title="General Ledger" extra={
          <Space>
            <Button icon={<SyncOutlined />} onClick={async () => {
              try {
                setLoading(true);
                const response = await financialService.getGeneralLedger();
                if (response?.data && Array.isArray(response.data)) {
                  setLedgerEntries(response.data);
                }
              } catch { /* ignore */ } finally { setLoading(false); }
            }}>Refresh</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowJournalModal(true)}>New Entry</Button>
          </Space>
        }>
          {ledgerEntries.length > 0 ? (
            <Table
              dataSource={ledgerEntries}
              columns={[
                { title: 'Date', dataIndex: 'transaction_date', key: 'date', width: 120,
                  render: (v: string) => v ? dayjs(v).format('YYYY-MM-DD') : '-' },
                { title: 'Document #', dataIndex: 'document_number', key: 'doc', width: 180,
                  render: (v: string) => <Text copyable={{ text: v || '' }}>{v || '-'}</Text> },
                { title: 'Account', key: 'account', width: 200,
                  render: (_: any, r: any) => (
                    <span>
                      <Tag color="blue">{r.account_code || '-'}</Tag>
                      <Text>{r.account_name || '-'}</Text>
                    </span>
                  )},
                { title: 'Description', dataIndex: 'line_description', key: 'desc', ellipsis: true,
                  render: (v: string, r: any) => v || r.entry_description || '-' },
                { title: 'Debit', dataIndex: 'debit_amount', key: 'debit', align: 'right' as const, width: 120,
                  render: (v: number) => v > 0 ? <Text style={{ color: '#10b981' }}>{formatCurrency(v)}</Text> : '-' },
                { title: 'Credit', dataIndex: 'credit_amount', key: 'credit', align: 'right' as const, width: 120,
                  render: (v: number) => v > 0 ? <Text style={{ color: '#ef4444' }}>{formatCurrency(v)}</Text> : '-' },
              ]}
              rowKey={(r, i) => `${r.journal_entry_id || ''}-${i}`}
              pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (total) => `${total} entries` }}
              size="small"
              summary={(data) => {
                const totalDebit = data.reduce((s, r) => s + (parseFloat(r.debit_amount) || 0), 0);
                const totalCredit = data.reduce((s, r) => s + (parseFloat(r.credit_amount) || 0), 0);
                return (
                  <Table.Summary>
                    <Table.Summary.Row style={{ background: '#f8fafc', fontWeight: 'bold' }}>
                      <Table.Summary.Cell index={0} colSpan={4}><Text strong>Totals</Text></Table.Summary.Cell>
                      <Table.Summary.Cell index={4} align="right"><Text strong style={{ color: '#10b981' }}>{formatCurrency(totalDebit)}</Text></Table.Summary.Cell>
                      <Table.Summary.Cell index={5} align="right"><Text strong style={{ color: '#ef4444' }}>{formatCurrency(totalCredit)}</Text></Table.Summary.Cell>
                    </Table.Summary.Row>
                  </Table.Summary>
                );
              }}
            />
          ) : (
            <Empty description="No general ledger entries found. Journal entries will appear here when posted." />
          )}

          <Divider />
          <Title level={5}>Trial Balance — IFRS Compliant</Title>
          <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            As at {new Date().toLocaleDateString('en-ZA', { day: '2-digit', month: 'long', year: 'numeric' })} | 
            Presented in accordance with IAS 1 — Presentation of Financial Statements
          </Text>
          {(() => {
            // Group trial balance by account type (IFRS ordering)
            const typeOrder = ['asset', 'liability', 'equity', 'revenue', 'expense'];
            const typeLabels: Record<string, string> = {
              asset: 'ASSETS (Non-Current & Current)',
              liability: 'LIABILITIES (Non-Current & Current)',
              equity: 'EQUITY',
              revenue: 'REVENUE',
              expense: 'EXPENSES',
            };
            const grouped: Record<string, TrialBalanceItem[]> = {};
            trialBalance.forEach(item => {
              const type = (item.type || 'asset').toLowerCase();
              if (!grouped[type]) grouped[type] = [];
              grouped[type].push(item);
            });

            let totalDebit = 0;
            let totalCredit = 0;

            return (
              <div>
                {typeOrder.map(type => {
                  const items = grouped[type];
                  if (!items || items.length === 0) return null;
                  const sectionDebit = items.reduce((s, i) => s + (i.debit || 0), 0);
                  const sectionCredit = items.reduce((s, i) => s + (i.credit || 0), 0);
                  totalDebit += sectionDebit;
                  totalCredit += sectionCredit;
                  return (
                    <div key={type} style={{ marginBottom: 16 }}>
                      <div style={{ 
                        background: type === 'asset' ? '#ecfdf5' : type === 'liability' ? '#fef2f2' : type === 'equity' ? '#eff6ff' : type === 'revenue' ? '#f0fdf4' : '#fefce8',
                        padding: '8px 16px', 
                        borderRadius: 6,
                        borderLeft: `4px solid ${type === 'asset' ? '#10b981' : type === 'liability' ? '#ef4444' : type === 'equity' ? '#3b82f6' : type === 'revenue' ? '#22c55e' : '#eab308'}`,
                        marginBottom: 4,
                      }}>
                        <Text strong style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          {typeLabels[type] || type}
                        </Text>
                      </div>
                      <Table
                        dataSource={items.sort((a, b) => a.code.localeCompare(b.code))}
                        columns={[
                          { title: 'Code', dataIndex: 'code', key: 'code', width: 100,
                            render: (t: string) => <Text code style={{ fontSize: 12 }}>{t}</Text> },
                          { title: 'Account Name', dataIndex: 'name', key: 'name',
                            render: (t: string) => <Text>{t}</Text> },
                          { title: 'Debit (R)', dataIndex: 'debit', key: 'debit', align: 'right' as const, width: 150,
                            render: (v: number) => v > 0 ? <Text style={{ color: '#10b981' }}>{formatCurrency(v)}</Text> : '-' },
                          { title: 'Credit (R)', dataIndex: 'credit', key: 'credit', align: 'right' as const, width: 150,
                            render: (v: number) => v > 0 ? <Text style={{ color: '#ef4444' }}>{formatCurrency(v)}</Text> : '-' },
                        ]}
                        rowKey="code"
                        pagination={false}
                        size="small"
                        showHeader={type === typeOrder.find(t => grouped[t]?.length)}
                        summary={() => (
                          <Table.Summary>
                            <Table.Summary.Row style={{ background: '#f8fafc' }}>
                              <Table.Summary.Cell index={0} />
                              <Table.Summary.Cell index={1}>
                                <Text strong style={{ fontSize: 12 }}>Subtotal — {typeLabels[type]?.split(' (')[0] || type}</Text>
                              </Table.Summary.Cell>
                              <Table.Summary.Cell index={2} align="right">
                                <Text strong style={{ color: '#10b981' }}>{sectionDebit > 0 ? formatCurrency(sectionDebit) : '-'}</Text>
                              </Table.Summary.Cell>
                              <Table.Summary.Cell index={3} align="right">
                                <Text strong style={{ color: '#ef4444' }}>{sectionCredit > 0 ? formatCurrency(sectionCredit) : '-'}</Text>
                              </Table.Summary.Cell>
                            </Table.Summary.Row>
                          </Table.Summary>
                        )}
                      />
                    </div>
                  );
                })}
                {/* Grand Total */}
                <div style={{ 
                  background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                  padding: '12px 16px',
                  borderRadius: 8,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: 8,
                }}>
                  <Text strong style={{ color: 'white', fontSize: 14 }}>TOTAL</Text>
                  <div style={{ display: 'flex', gap: 48 }}>
                    <div>
                      <Text style={{ color: '#94a3b8', fontSize: 11 }}>Total Debits</Text>
                      <br />
                      <Text strong style={{ color: '#86efac', fontSize: 16 }}>{formatCurrency(totalDebit)}</Text>
                    </div>
                    <div>
                      <Text style={{ color: '#94a3b8', fontSize: 11 }}>Total Credits</Text>
                      <br />
                      <Text strong style={{ color: '#fca5a5', fontSize: 16 }}>{formatCurrency(totalCredit)}</Text>
                    </div>
                    <div>
                      <Text style={{ color: '#94a3b8', fontSize: 11 }}>Difference</Text>
                      <br />
                      <Text strong style={{ 
                        color: Math.abs(totalDebit - totalCredit) < 0.01 ? '#86efac' : '#fbbf24', 
                        fontSize: 16 
                      }}>
                        {Math.abs(totalDebit - totalCredit) < 0.01 ? '✓ Balanced' : formatCurrency(Math.abs(totalDebit - totalCredit))}
                      </Text>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
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
              <Button 
                type="primary" 
                icon={<SettingOutlined />}
                onClick={() => navigate('/app/financial/chart-of-accounts')}
              >
                Configure Accounts
              </Button>
            </Card>
          </Col>
          <Col span={12}>
            <Card title="Dimensions">
              <Paragraph>Configure cost centers, departments, and tracking dimensions.</Paragraph>
              <Button 
                type="primary" 
                icon={<AppstoreOutlined />}
                onClick={() => navigate('/app/financial/dimensions')}
              >
                Manage Dimensions
              </Button>
            </Card>
          </Col>
        </Row>
      ),
    },
    {
      key: 'fiscal',
      label: 'Fiscal Settings',
      icon: <CalendarOutlined />,
      children: (
        <Row gutter={24}>
          {/* Fiscal Year Overview */}
          <Col span={24}>
            <Card style={{ marginBottom: 24 }}>
              <Row gutter={24} align="middle">
                <Col span={8}>
                  <Statistic 
                    title="Current Fiscal Year" 
                    value={fiscalYearData?.fiscalYear?.year_name || 'Not Configured'} 
                    valueStyle={{ fontSize: 18, color: '#1890ff' }}
                  />
                  {fiscalYearData?.fiscalYear && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {dayjs(fiscalYearData.fiscalYear.start_date).format('DD MMM YYYY')} — {dayjs(fiscalYearData.fiscalYear.end_date).format('DD MMM YYYY')}
                    </Text>
                  )}
                </Col>
                <Col span={4}>
                  <Statistic 
                    title="Current Period" 
                    value={fiscalYearData?.summary?.currentPeriod || 'N/A'}
                    valueStyle={{ fontSize: 16, color: '#52c41a' }}
                  />
                </Col>
                <Col span={3}>
                  <Statistic title="Closed" value={fiscalYearData?.summary?.closedCount || 0} suffix={`/ ${fiscalYearData?.summary?.totalPeriods || 12}`} />
                </Col>
                <Col span={3}>
                  <Statistic title="Progress" value={fiscalYearData?.summary?.percentComplete || 0} suffix="%" valueStyle={{ color: '#1890ff' }} />
                </Col>
                <Col span={6} style={{ textAlign: 'right' }}>
                  <Space>
                    <Tag color={fiscalYearData?.fiscalYear?.start_month === 3 ? 'blue' : 'default'}>
                      {fiscalYearData?.fiscalYear?.start_month === 3 ? 'RSA Standard (March)' : 
                       fiscalYearData?.fiscalYear?.start_month === 1 ? 'Calendar Year (January)' :
                       fiscalYearData?.fiscalYear?.start_month === 7 ? 'July Start' : 
                       `Month ${fiscalYearData?.fiscalYear?.start_month || '?'}`}
                    </Tag>
                    <Tag color={fiscalYearData?.fiscalYear?.status === 'OPEN' ? 'green' : 'default'}>
                      {fiscalYearData?.fiscalYear?.status || 'N/A'}
                    </Tag>
                  </Space>
                </Col>
              </Row>
            </Card>
          </Col>

          {/* Period Table */}
          <Col span={16}>
            <Card title="Fiscal Periods" extra={
              <Space>
                {(() => {
                  const openPeriod = periodStatuses.find(p => p.status === 'open');
                  return openPeriod ? (
                    <Button 
                      type="primary" 
                      icon={<CheckCircleOutlined />}
                      loading={closingPeriod}
                      onClick={async () => {
                        const pid = (openPeriod as any).periodId;
                        if (!pid) { message.warning('Period ID not found'); return; }
                        try {
                          setClosingPeriod(true);
                          const result = await financialService.closePeriod(pid);
                          if (result.success) {
                            message.success(result.message || `${openPeriod.period} closed successfully`);
                            handleRefresh();
                          } else {
                            message.error(result.message || 'Failed to close period');
                          }
                        } catch (err: any) {
                          message.error(err?.response?.data?.message || 'Failed to close period');
                        } finally {
                          setClosingPeriod(false);
                        }
                      }}
                    >
                      Close {openPeriod.period}
                    </Button>
                  ) : null;
                })()}
              </Space>
            }>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #f0f0f0' }}>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, fontSize: 13, color: '#8c8c8c' }}>Period</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, fontSize: 13, color: '#8c8c8c' }}>Date Range</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, fontSize: 13, color: '#8c8c8c' }}>Status</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, fontSize: 13, color: '#8c8c8c' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(fiscalYearData?.periods || []).map((p: any, idx: number) => (
                    <tr key={p.period_id || idx} style={{ 
                      borderBottom: '1px solid #f5f5f5',
                      background: p.status === 'OPEN' ? '#f0f9ff' : p.status === 'CLOSED' ? 'transparent' : '#fafafa',
                    }}>
                      <td style={{ padding: '10px 12px' }}>
                        <Text strong={p.status === 'OPEN'}>
                          {p.period_code} — {p.period_name}
                        </Text>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {dayjs(p.start_date).format('DD MMM')} – {dayjs(p.end_date).format('DD MMM YYYY')}
                        </Text>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        {getStatusTag(p.status.toLowerCase())}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        {p.status === 'CLOSED' && (
                          <Button 
                            size="small" 
                            type="link" 
                            onClick={async () => {
                              try {
                                setClosingPeriod(true);
                                const result = await financialService.reopenPeriod(p.period_id);
                                if (result.success) {
                                  message.success(result.message || `${p.period_name} reopened`);
                                  handleRefresh();
                                } else {
                                  message.error(result.message || 'Failed to reopen');
                                }
                              } catch (err: any) {
                                message.error(err?.response?.data?.message || 'Failed to reopen period');
                              } finally {
                                setClosingPeriod(false);
                              }
                            }}
                          >
                            Reopen
                          </Button>
                        )}
                        {p.status === 'OPEN' && <Tag color="processing" icon={<SyncOutlined spin />}>Current</Tag>}
                        {p.closed_at && (
                          <Text type="secondary" style={{ fontSize: 11, marginLeft: 4 }}>
                            {dayjs(p.closed_at).format('DD MMM')}
                          </Text>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(!fiscalYearData?.periods || fiscalYearData.periods.length === 0) && (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <Text type="secondary">No fiscal periods configured. Contact your system administrator.</Text>
                </div>
              )}
            </Card>
          </Col>

          {/* Fiscal Year Info Sidebar */}
          <Col span={8}>
            <Card title="Fiscal Year Configuration" style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 16 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Year Start Month</Text>
                <div style={{ marginTop: 4 }}>
                  <Tag color="blue" style={{ fontSize: 14, padding: '4px 12px' }}>
                    {fiscalYearData?.fiscalYear?.start_month === 3 ? '📅 March (RSA Standard)' : 
                     fiscalYearData?.fiscalYear?.start_month === 1 ? '📅 January (Calendar)' :
                     fiscalYearData?.fiscalYear?.start_month === 7 ? '📅 July' : 
                     `📅 Month ${fiscalYearData?.fiscalYear?.start_month || '?'}`}
                  </Tag>
                </div>
              </div>
              <Divider style={{ margin: '12px 0' }} />
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text type="secondary">Year Code</Text>
                  <Text strong>{fiscalYearData?.fiscalYear?.year_code || 'N/A'}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text type="secondary">Start Date</Text>
                  <Text>{fiscalYearData?.fiscalYear?.start_date ? dayjs(fiscalYearData.fiscalYear.start_date).format('DD MMM YYYY') : 'N/A'}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text type="secondary">End Date</Text>
                  <Text>{fiscalYearData?.fiscalYear?.end_date ? dayjs(fiscalYearData.fiscalYear.end_date).format('DD MMM YYYY') : 'N/A'}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text type="secondary">Status</Text>
                  <Tag color={fiscalYearData?.fiscalYear?.status === 'OPEN' ? 'green' : 'default'}>{fiscalYearData?.fiscalYear?.status || 'N/A'}</Tag>
                </div>
              </div>
            </Card>

            <Card title="Period Summary" size="small">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text type="secondary">Total Periods</Text>
                <Text strong>{fiscalYearData?.summary?.totalPeriods || 0}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text type="secondary">Periods Closed</Text>
                <Text strong style={{ color: '#8c8c8c' }}>{fiscalYearData?.summary?.closedCount || 0}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text type="secondary">Periods Open</Text>
                <Text strong style={{ color: '#52c41a' }}>{fiscalYearData?.summary?.openCount || 0}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text type="secondary">Periods Future</Text>
                <Text strong style={{ color: '#1890ff' }}>{fiscalYearData?.summary?.futureCount || 0}</Text>
              </div>
              <Divider style={{ margin: '12px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary">Current Period</Text>
                <Text strong style={{ color: '#52c41a' }}>{fiscalYearData?.summary?.currentPeriod || 'None'}</Text>
              </div>
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
            <Button icon={<SyncOutlined />} onClick={handleRefresh} loading={loading}>Refresh</Button>
            <Button icon={<DownloadOutlined />} onClick={() => {
              const reportCode = activeTab === 'general-ledger' ? 'general-ledger' : 'trial-balance';
              handleDownloadReport(reportCode, reportCode.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase()));
            }}>Export</Button>
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
          { title: 'Revenue', value: financialStats.revenue, prefix: 'R', precision: 2, span: 4 },
          { title: 'Net Income', value: financialStats.netIncome, prefix: 'R', precision: 2, valueStyle: { color: '#86efac' }, span: 4 },
          { title: 'Cash Balance', value: financialStats.cashBalance, prefix: 'R', precision: 2, span: 4 },
          { title: 'Receivables', value: financialStats.receivables, prefix: 'R', precision: 2, span: 4 },
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
        onCancel={() => {
          setShowJournalModal(false);
          journalForm.resetFields();
          setJournalLines([
            { key: 1, account: '', debit: 0, credit: 0 },
            { key: 2, account: '', debit: 0, credit: 0 },
          ]);
        }}
        footer={[
          <Button key="cancel" onClick={() => setShowJournalModal(false)}>Cancel</Button>,
          <Button 
            key="post" 
            type="primary" 
            loading={journalSubmitting}
            onClick={handleJournalSubmit}
          >
            Post Entry
          </Button>
        ]}
        width={900}
      >
        <Form form={journalForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item 
                name="entry_date" 
                label="Date" 
                rules={[{ required: true, message: 'Please select a date' }]}
                initialValue={dayjs()}
              >
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Reference">
                <Input placeholder="Auto-generated" disabled />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item 
            name="description" 
            label="Description" 
            rules={[{ required: true, message: 'Please enter a description' }]}
          >
            <Input placeholder="Enter journal description" />
          </Form.Item>
          
          <Divider>Journal Lines</Divider>
          
          {/* Totals Summary */}
          <Row gutter={16} style={{ marginBottom: 16, background: '#f5f5f5', padding: '8px 16px', borderRadius: 4 }}>
            <Col span={10}>
              <Text strong>Totals:</Text>
            </Col>
            <Col span={6} style={{ textAlign: 'right' }}>
              <Text strong style={{ color: '#1890ff' }}>
                Debit: R {journalLines.reduce((sum, l) => sum + (l.debit || 0), 0).toFixed(2)}
              </Text>
            </Col>
            <Col span={6} style={{ textAlign: 'right' }}>
              <Text strong style={{ color: '#52c41a' }}>
                Credit: R {journalLines.reduce((sum, l) => sum + (l.credit || 0), 0).toFixed(2)}
              </Text>
            </Col>
            <Col span={2}>
              {Math.abs(journalLines.reduce((sum, l) => sum + (l.debit || 0), 0) - 
                       journalLines.reduce((sum, l) => sum + (l.credit || 0), 0)) < 0.01 ? (
                <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 18 }} />
              ) : (
                <ExclamationCircleOutlined style={{ color: '#ff4d4f', fontSize: 18 }} />
              )}
            </Col>
          </Row>

          {journalLines.map((line, index) => (
            <div key={line.key} style={{ marginBottom: 16, padding: 12, background: '#fafafa', borderRadius: 4, border: '1px solid #e8e8e8' }}>
              <Row gutter={16} style={{ marginBottom: 8 }}>
                <Col span={10}>
                  <Select 
                    placeholder="Select account"
                    style={{ width: '100%' }}
                    showSearch
                    optionFilterProp="children"
                    value={line.account || undefined}
                    onChange={(value) => updateJournalLine(line.key, 'account', value)}
                    filterOption={(input, option) =>
                      (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
                    }
                  >
                    {accounts.map(acc => (
                      <Select.Option key={acc.id || acc.account_id} value={acc.id || acc.account_id}>
                        {acc.account_number || acc.account_code} - {acc.name || acc.account_name}
                      </Select.Option>
                    ))}
                  </Select>
                </Col>
                <Col span={6}>
                  <InputNumber
                    style={{ width: '100%' }}
                    prefix="R"
                    placeholder="Debit"
                    min={0}
                    precision={2}
                    value={line.debit || undefined}
                    onChange={(value) => updateJournalLine(line.key, 'debit', value || 0)}
                  />
                </Col>
                <Col span={6}>
                  <InputNumber
                    style={{ width: '100%' }}
                    prefix="R"
                    placeholder="Credit"
                    min={0}
                    precision={2}
                    value={line.credit || undefined}
                    onChange={(value) => updateJournalLine(line.key, 'credit', value || 0)}
                  />
                </Col>
                <Col span={2}>
                  <Button 
                    type="text" 
                    danger 
                    icon={<DeleteOutlined />}
                    disabled={journalLines.length <= 2}
                    onClick={() => removeJournalLine(line.key)}
                  />
                </Col>
              </Row>
              {/* Dimensions Row */}
              <Row gutter={8} style={{ marginTop: 8 }}>
                <Col span={4}>
                  <Select
                    placeholder="Cost Center"
                    style={{ width: '100%' }}
                    allowClear
                    size="small"
                    value={line.costCenterId || undefined}
                    onChange={(value) => updateJournalLine(line.key, 'costCenterId', value || '')}
                  >
                    {costCenters.map(cc => (
                      <Select.Option key={cc.id} value={cc.id}>
                        {cc.code} - {cc.name}
                      </Select.Option>
                    ))}
                  </Select>
                </Col>
                <Col span={4}>
                  <Select
                    placeholder="Department"
                    style={{ width: '100%' }}
                    allowClear
                    size="small"
                    value={line.departmentId || undefined}
                    onChange={(value) => updateJournalLine(line.key, 'departmentId', value || '')}
                  >
                    {departments.map(d => (
                      <Select.Option key={d.id} value={d.id}>
                        {d.code} - {d.name}
                      </Select.Option>
                    ))}
                  </Select>
                </Col>
                <Col span={4}>
                  <Select
                    placeholder="Project"
                    style={{ width: '100%' }}
                    allowClear
                    size="small"
                    value={line.projectId || undefined}
                    onChange={(value) => updateJournalLine(line.key, 'projectId', value || '')}
                  >
                    {projects.map(p => (
                      <Select.Option key={p.id} value={p.id}>
                        {p.code} - {p.name}
                      </Select.Option>
                    ))}
                  </Select>
                </Col>
                <Col span={4}>
                  <Select
                    placeholder="Product"
                    style={{ width: '100%' }}
                    allowClear
                    size="small"
                    value={line.productId || undefined}
                    onChange={(value) => updateJournalLine(line.key, 'productId', value || '')}
                  >
                    {products.map(pr => (
                      <Select.Option key={pr.id} value={pr.id}>
                        {pr.code} - {pr.name}
                      </Select.Option>
                    ))}
                  </Select>
                </Col>
                <Col span={4}>
                  <Select
                    placeholder="Location"
                    style={{ width: '100%' }}
                    allowClear
                    size="small"
                    value={line.locationId || undefined}
                    onChange={(value) => updateJournalLine(line.key, 'locationId', value || '')}
                  >
                    {locations.map(loc => (
                      <Select.Option key={loc.id} value={loc.id}>
                        {loc.code} - {loc.name}
                      </Select.Option>
                    ))}
                  </Select>
                </Col>
                <Col span={4}>
                  <Input
                    placeholder="Line description"
                    size="small"
                    value={line.description || ''}
                    onChange={(e) => updateJournalLine(line.key, 'description', e.target.value)}
                  />
                </Col>
              </Row>
            </div>
          ))}
          
          <Button 
            type="dashed" 
            icon={<PlusOutlined />} 
            style={{ width: '100%', marginTop: 8 }}
            onClick={addJournalLine}
          >
            Add Line
          </Button>
        </Form>
      </Modal>

      {/* Report Preview Modal - Structured Report Rendering */}
      <Modal
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: 32 }}>
            <span>{reportPreviewData?.title || 'Report Preview'}</span>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {reportPeriodStart.format('DD MMM YYYY')} — {reportPeriodEnd.format('DD MMM YYYY')}
            </Text>
          </div>
        }
        open={showReportPreview}
        onCancel={() => { setShowReportPreview(false); setReportPreviewData(null); }}
        footer={[
          <Button key="close" onClick={() => setShowReportPreview(false)}>Close</Button>,
          <Button key="download" type="primary" icon={<DownloadOutlined />} onClick={() => {
            if (reportPreviewData?.content) {
              const blob = new Blob([reportPreviewData.content], { type: 'text/csv;charset=utf-8;' });
              const link = document.createElement('a');
              link.href = URL.createObjectURL(blob);
              link.download = `${reportPreviewData.title.replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`;
              link.click();
              URL.revokeObjectURL(link.href);
            }
          }}>Download CSV</Button>,
        ]}
        width={900}
      >
        {reportPreviewLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" tip="Loading report..." /></div>
        ) : reportPreviewData?.data && reportPreviewData.reportCode === 'trial-balance' ? (
          /* ===== TRIAL BALANCE ===== */
          <div style={{ padding: '0 8px' }}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <Title level={4} style={{ marginBottom: 4 }}>Trial Balance</Title>
              <Text type="secondary">For the period {reportPreviewData.data.periodStart} to {reportPreviewData.data.periodEnd}</Text>
            </div>
            <Table
              dataSource={(reportPreviewData.data.accounts || []).map((a: any, i: number) => ({ ...a, key: i }))}
              columns={[
                { title: 'Code', dataIndex: 'code', key: 'code', width: 80, render: (v: string) => <Text strong>{v}</Text> },
                { title: 'Account Name', dataIndex: 'name', key: 'name', render: (v: string, r: any) => <span>{v} <Tag color={r.accountType === 'asset' ? 'blue' : r.accountType === 'liability' ? 'orange' : r.accountType === 'equity' ? 'purple' : r.accountType === 'revenue' ? 'green' : 'red'} style={{ fontSize: 10, marginLeft: 4 }}>{r.accountType}</Tag></span> },
                { title: 'Period Debits', dataIndex: 'periodDebits', key: 'pd', align: 'right' as const, render: (v: number) => v ? formatCurrency(v) : '—' },
                { title: 'Period Credits', dataIndex: 'periodCredits', key: 'pc', align: 'right' as const, render: (v: number) => v ? formatCurrency(v) : '—' },
                { title: 'Debit Balance', dataIndex: 'debitBalance', key: 'db', align: 'right' as const, render: (v: number) => v ? <Text strong style={{ color: '#2563eb' }}>{formatCurrency(v)}</Text> : '—' },
                { title: 'Credit Balance', dataIndex: 'creditBalance', key: 'cb', align: 'right' as const, render: (v: number) => v ? <Text strong style={{ color: '#059669' }}>{formatCurrency(v)}</Text> : '—' },
              ]}
              pagination={false}
              size="small"
              bordered
              summary={() => {
                const totals = reportPreviewData.data.totals;
                return (
                  <Table.Summary fixed>
                    <Table.Summary.Row style={{ background: '#f8fafc', fontWeight: 'bold' }}>
                      <Table.Summary.Cell index={0} colSpan={4} align="right"><Text strong>TOTALS</Text></Table.Summary.Cell>
                      <Table.Summary.Cell index={4} align="right"><Text strong style={{ color: '#2563eb' }}>{formatCurrency(totals.totalDebits)}</Text></Table.Summary.Cell>
                      <Table.Summary.Cell index={5} align="right"><Text strong style={{ color: '#059669' }}>{formatCurrency(totals.totalCredits)}</Text></Table.Summary.Cell>
                    </Table.Summary.Row>
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={6}>
                        {totals.isBalanced ? (
                          <Tag color="green" icon={<CheckCircleOutlined />}>Trial balance is in balance</Tag>
                        ) : (
                          <Tag color="red" icon={<ExclamationCircleOutlined />}>Out of balance by {formatCurrency(Math.abs(totals.difference))}</Tag>
                        )}
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  </Table.Summary>
                );
              }}
            />
          </div>
        ) : reportPreviewData?.data && reportPreviewData.reportCode === 'balance-sheet' ? (
          /* ===== BALANCE SHEET ===== */
          <div style={{ padding: '0 8px' }}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <Title level={4} style={{ marginBottom: 4 }}>Balance Sheet</Title>
              <Text type="secondary">As at {reportPreviewData.data.asOfDate}</Text>
            </div>
            <Row gutter={24}>
              {/* ASSETS */}
              <Col span={12}>
                <Title level={5} style={{ color: '#2563eb', borderBottom: '2px solid #2563eb', paddingBottom: 4 }}>ASSETS</Title>
                
                {(reportPreviewData.data.sections?.assets?.currentAssets?.accounts || []).length > 0 && (
                  <>
                    <Text strong style={{ display: 'block', margin: '12px 0 8px', color: '#475569' }}>Current Assets</Text>
                    {reportPreviewData.data.sections.assets.currentAssets.accounts.map((a: any) => (
                      <div key={a.code} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0 4px 16px', borderBottom: '1px solid #f1f5f9' }}>
                        <Text style={{ fontSize: 13 }}>{a.code} — {a.name}</Text>
                        <Text strong style={{ fontSize: 13 }}>{formatCurrency(a.balance)}</Text>
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: '1px solid #cbd5e1' }}>
                      <Text strong style={{ color: '#475569' }}>Total Current Assets</Text>
                      <Text strong>{formatCurrency(reportPreviewData.data.sections.assets.currentAssets.total)}</Text>
                    </div>
                  </>
                )}
                
                {(reportPreviewData.data.sections?.assets?.nonCurrentAssets?.accounts || []).length > 0 && (
                  <>
                    <Text strong style={{ display: 'block', margin: '12px 0 8px', color: '#475569' }}>Non-Current Assets</Text>
                    {reportPreviewData.data.sections.assets.nonCurrentAssets.accounts.map((a: any) => (
                      <div key={a.code} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0 4px 16px', borderBottom: '1px solid #f1f5f9' }}>
                        <Text style={{ fontSize: 13 }}>{a.code} — {a.name}</Text>
                        <Text strong style={{ fontSize: 13 }}>{formatCurrency(a.balance)}</Text>
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: '1px solid #cbd5e1' }}>
                      <Text strong style={{ color: '#475569' }}>Total Non-Current Assets</Text>
                      <Text strong>{formatCurrency(reportPreviewData.data.sections.assets.nonCurrentAssets.total)}</Text>
                    </div>
                  </>
                )}
                
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: '2px solid #2563eb', marginTop: 8 }}>
                  <Title level={5} style={{ margin: 0, color: '#2563eb' }}>TOTAL ASSETS</Title>
                  <Title level={5} style={{ margin: 0, color: '#2563eb' }}>{formatCurrency(reportPreviewData.data.sections.assets.totalAssets)}</Title>
                </div>
              </Col>
              
              {/* LIABILITIES & EQUITY */}
              <Col span={12}>
                <Title level={5} style={{ color: '#dc2626', borderBottom: '2px solid #dc2626', paddingBottom: 4 }}>LIABILITIES</Title>
                
                {(reportPreviewData.data.sections?.liabilities?.currentLiabilities?.accounts || []).length > 0 && (
                  <>
                    <Text strong style={{ display: 'block', margin: '12px 0 8px', color: '#475569' }}>Current Liabilities</Text>
                    {reportPreviewData.data.sections.liabilities.currentLiabilities.accounts.map((a: any) => (
                      <div key={a.code} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0 4px 16px', borderBottom: '1px solid #f1f5f9' }}>
                        <Text style={{ fontSize: 13 }}>{a.code} — {a.name}</Text>
                        <Text strong style={{ fontSize: 13 }}>{formatCurrency(a.balance)}</Text>
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: '1px solid #cbd5e1' }}>
                      <Text strong style={{ color: '#475569' }}>Total Current Liabilities</Text>
                      <Text strong>{formatCurrency(reportPreviewData.data.sections.liabilities.currentLiabilities.total)}</Text>
                    </div>
                  </>
                )}
                
                {(reportPreviewData.data.sections?.liabilities?.nonCurrentLiabilities?.accounts || []).length > 0 && (
                  <>
                    <Text strong style={{ display: 'block', margin: '12px 0 8px', color: '#475569' }}>Non-Current Liabilities</Text>
                    {reportPreviewData.data.sections.liabilities.nonCurrentLiabilities.accounts.map((a: any) => (
                      <div key={a.code} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0 4px 16px', borderBottom: '1px solid #f1f5f9' }}>
                        <Text style={{ fontSize: 13 }}>{a.code} — {a.name}</Text>
                        <Text strong style={{ fontSize: 13 }}>{formatCurrency(a.balance)}</Text>
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: '1px solid #cbd5e1' }}>
                      <Text strong style={{ color: '#475569' }}>Total Non-Current Liabilities</Text>
                      <Text strong>{formatCurrency(reportPreviewData.data.sections.liabilities.nonCurrentLiabilities.total)}</Text>
                    </div>
                  </>
                )}
                
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: '1px solid #cbd5e1', marginTop: 4 }}>
                  <Text strong style={{ color: '#dc2626' }}>Total Liabilities</Text>
                  <Text strong style={{ color: '#dc2626' }}>{formatCurrency(reportPreviewData.data.sections.liabilities.totalLiabilities)}</Text>
                </div>

                <Title level={5} style={{ color: '#7c3aed', borderBottom: '2px solid #7c3aed', paddingBottom: 4, marginTop: 16 }}>EQUITY</Title>
                {(reportPreviewData.data.sections?.equity?.accounts || []).map((a: any) => (
                  <div key={a.code} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0 4px 16px', borderBottom: '1px solid #f1f5f9' }}>
                    <Text style={{ fontSize: 13 }}>{a.code} — {a.name}</Text>
                    <Text strong style={{ fontSize: 13 }}>{formatCurrency(a.balance)}</Text>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0 4px 16px', borderBottom: '1px solid #f1f5f9' }}>
                  <Text style={{ fontSize: 13, fontStyle: 'italic' }}>Net Income (Current Period)</Text>
                  <Text strong style={{ fontSize: 13, color: reportPreviewData.data.sections.equity.netIncome >= 0 ? '#059669' : '#dc2626' }}>
                    {formatCurrency(reportPreviewData.data.sections.equity.netIncome)}
                  </Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: '1px solid #cbd5e1' }}>
                  <Text strong style={{ color: '#7c3aed' }}>Total Equity</Text>
                  <Text strong style={{ color: '#7c3aed' }}>{formatCurrency(reportPreviewData.data.sections.equity.totalEquity)}</Text>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: '2px solid #1e293b', marginTop: 8 }}>
                  <Title level={5} style={{ margin: 0 }}>TOTAL LIABILITIES & EQUITY</Title>
                  <Title level={5} style={{ margin: 0 }}>{formatCurrency(reportPreviewData.data.totals.totalLiabilitiesAndEquity)}</Title>
                </div>
                {reportPreviewData.data.totals.isBalanced ? (
                  <Tag color="green" icon={<CheckCircleOutlined />} style={{ marginTop: 4 }}>Balance sheet is balanced</Tag>
                ) : (
                  <Tag color="red" icon={<ExclamationCircleOutlined />} style={{ marginTop: 4 }}>
                    Difference: {formatCurrency(Math.abs(reportPreviewData.data.totals.difference))}
                  </Tag>
                )}
              </Col>
            </Row>
          </div>
        ) : reportPreviewData?.data && reportPreviewData.reportCode === 'income-statement' ? (
          /* ===== INCOME STATEMENT ===== */
          <div style={{ padding: '0 8px' }}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <Title level={4} style={{ marginBottom: 4 }}>Income Statement</Title>
              <Text type="secondary">For the period {reportPreviewData.data.periodStart} to {reportPreviewData.data.periodEnd}</Text>
            </div>
            
            {/* Revenue */}
            <Title level={5} style={{ color: '#059669', borderBottom: '2px solid #059669', paddingBottom: 4, marginTop: 16 }}>REVENUE</Title>
            {(reportPreviewData.data.sections?.revenue?.accounts || []).map((a: any) => (
              <div key={a.code} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0 4px 16px', borderBottom: '1px solid #f1f5f9' }}>
                <Text style={{ fontSize: 13 }}>{a.code} — {a.name}</Text>
                <Text strong style={{ color: '#059669' }}>{formatCurrency(a.balance)}</Text>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid #cbd5e1' }}>
              <Text strong>Total Revenue</Text>
              <Text strong style={{ color: '#059669' }}>{formatCurrency(reportPreviewData.data.sections.revenue.total)}</Text>
            </div>

            {/* Cost of Sales */}
            {(reportPreviewData.data.sections?.costOfSales?.accounts || []).length > 0 && (
              <>
                <Title level={5} style={{ color: '#dc2626', borderBottom: '1px solid #dc2626', paddingBottom: 4, marginTop: 16 }}>COST OF SALES</Title>
                {reportPreviewData.data.sections.costOfSales.accounts.map((a: any) => (
                  <div key={a.code} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0 4px 16px', borderBottom: '1px solid #f1f5f9' }}>
                    <Text style={{ fontSize: 13 }}>{a.code} — {a.name}</Text>
                    <Text strong style={{ color: '#dc2626' }}>({formatCurrency(a.balance)})</Text>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid #cbd5e1' }}>
                  <Text strong>Total Cost of Sales</Text>
                  <Text strong style={{ color: '#dc2626' }}>({formatCurrency(reportPreviewData.data.sections.costOfSales.total)})</Text>
                </div>
              </>
            )}
            
            {/* Gross Profit */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', background: '#f0fdf4', borderRadius: 6, paddingLeft: 12, paddingRight: 12, marginTop: 8 }}>
              <Title level={5} style={{ margin: 0, color: '#059669' }}>GROSS PROFIT</Title>
              <Title level={5} style={{ margin: 0, color: '#059669' }}>{formatCurrency(reportPreviewData.data.sections.grossProfit)}</Title>
            </div>

            {/* Operating Expenses */}
            <Title level={5} style={{ color: '#dc2626', borderBottom: '1px solid #dc2626', paddingBottom: 4, marginTop: 16 }}>OPERATING EXPENSES</Title>
            {(reportPreviewData.data.sections?.operatingExpenses?.accounts || []).map((a: any) => (
              <div key={a.code} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0 4px 16px', borderBottom: '1px solid #f1f5f9' }}>
                <Text style={{ fontSize: 13 }}>{a.code} — {a.name}</Text>
                <Text strong style={{ color: '#dc2626' }}>({formatCurrency(Math.abs(a.balance))})</Text>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid #cbd5e1' }}>
              <Text strong>Total Operating Expenses</Text>
              <Text strong style={{ color: '#dc2626' }}>({formatCurrency(Math.abs(reportPreviewData.data.sections.operatingExpenses.total))})</Text>
            </div>

            {/* Operating Profit */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', background: '#f0f9ff', borderRadius: 6, paddingLeft: 12, paddingRight: 12, marginTop: 8 }}>
              <Title level={5} style={{ margin: 0, color: '#2563eb' }}>OPERATING PROFIT</Title>
              <Title level={5} style={{ margin: 0, color: reportPreviewData.data.sections.operatingProfit >= 0 ? '#059669' : '#dc2626' }}>{formatCurrency(reportPreviewData.data.sections.operatingProfit)}</Title>
            </div>

            {/* Other Income */}
            {(reportPreviewData.data.sections?.otherIncome?.accounts || []).length > 0 && (
              <>
                <Title level={5} style={{ color: '#475569', borderBottom: '1px solid #cbd5e1', paddingBottom: 4, marginTop: 16 }}>OTHER INCOME / (EXPENSES)</Title>
                {reportPreviewData.data.sections.otherIncome.accounts.map((a: any) => (
                  <div key={a.code} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0 4px 16px', borderBottom: '1px solid #f1f5f9' }}>
                    <Text style={{ fontSize: 13 }}>{a.code} — {a.name}</Text>
                    <Text strong>{formatCurrency(a.balance)}</Text>
                  </div>
                ))}
              </>
            )}

            {/* Net Income */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: reportPreviewData.data.netIncome >= 0 ? '#dcfce7' : '#fef2f2', borderRadius: 6, marginTop: 16, border: `2px solid ${reportPreviewData.data.netIncome >= 0 ? '#059669' : '#dc2626'}` }}>
              <Title level={4} style={{ margin: 0 }}>NET INCOME</Title>
              <Title level={4} style={{ margin: 0, color: reportPreviewData.data.netIncome >= 0 ? '#059669' : '#dc2626' }}>{formatCurrency(reportPreviewData.data.netIncome)}</Title>
            </div>
          </div>
        ) : reportPreviewData?.data && reportPreviewData.reportCode === 'general-ledger' ? (
          /* ===== GENERAL LEDGER ===== */
          <div style={{ padding: '0 8px', maxHeight: 500, overflow: 'auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <Title level={4} style={{ marginBottom: 4 }}>General Ledger</Title>
              <Text type="secondary">For the period {reportPreviewData.data.periodStart} to {reportPreviewData.data.periodEnd}</Text>
              <br /><Text type="secondary">{reportPreviewData.data.summary?.totalAccounts} accounts, {reportPreviewData.data.summary?.totalTransactions} transactions</Text>
            </div>
            {(reportPreviewData.data.accounts || []).map((acct: any) => (
              <Card key={acct.accountCode} size="small" title={
                <span><Text strong>{acct.accountCode}</Text> — {acct.accountName} <Tag>{acct.accountType}</Tag></span>
              } style={{ marginBottom: 12 }} extra={
                <Text strong>Balance: {formatCurrency(acct.closingBalance)}</Text>
              }>
                <Table
                  dataSource={(acct.transactions || []).map((t: any, i: number) => ({ ...t, key: i }))}
                  columns={[
                    { title: 'Date', dataIndex: 'date', key: 'date', width: 100, render: (v: string) => v ? dayjs(v).format('YYYY-MM-DD') : '—' },
                    { title: 'Journal #', dataIndex: 'journalNumber', key: 'jn', width: 100 },
                    { title: 'Description', dataIndex: 'description', key: 'desc', ellipsis: true },
                    { title: 'Debit', dataIndex: 'debit', key: 'dr', align: 'right' as const, width: 100, render: (v: number) => v ? formatCurrency(v) : '—' },
                    { title: 'Credit', dataIndex: 'credit', key: 'cr', align: 'right' as const, width: 100, render: (v: number) => v ? formatCurrency(v) : '—' },
                    { title: 'Balance', dataIndex: 'balance', key: 'bal', align: 'right' as const, width: 110, render: (v: number) => <Text strong>{formatCurrency(v)}</Text> },
                  ]}
                  pagination={false}
                  size="small"
                  bordered
                />
              </Card>
            ))}
          </div>
        ) : reportPreviewData?.data && reportPreviewData.reportCode === 'cash-flow' ? (
          /* ===== CASH FLOW STATEMENT ===== */
          <div style={{ padding: '0 8px' }}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <Title level={4} style={{ marginBottom: 4 }}>Cash Flow Statement</Title>
              <Text type="secondary">For the period {reportPreviewData.data.periodStart} to {reportPreviewData.data.periodEnd}</Text>
            </div>
            
            <Title level={5} style={{ color: '#2563eb', borderBottom: '2px solid #2563eb', paddingBottom: 4 }}>OPERATING ACTIVITIES</Title>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0 4px 16px' }}>
              <Text>Net Income</Text>
              <Text strong>{formatCurrency(reportPreviewData.data.sections.operating.netIncome)}</Text>
            </div>
            {(reportPreviewData.data.sections.operating.adjustments || []).map((a: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0 4px 16px', borderBottom: '1px solid #f1f5f9' }}>
                <Text style={{ fontSize: 13 }}>{a.detail}</Text>
                <Text strong style={{ fontSize: 13 }}>{formatCurrency(a.amount)}</Text>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid #cbd5e1', background: '#f0f9ff', paddingLeft: 12, paddingRight: 8, borderRadius: 4 }}>
              <Text strong>Net Cash from Operating</Text>
              <Text strong style={{ color: '#2563eb' }}>{formatCurrency(reportPreviewData.data.sections.operating.totalOperating)}</Text>
            </div>

            <Title level={5} style={{ color: '#7c3aed', borderBottom: '2px solid #7c3aed', paddingBottom: 4, marginTop: 16 }}>INVESTING ACTIVITIES</Title>
            {(reportPreviewData.data.sections.investing.items || []).length === 0 ? (
              <Text type="secondary" style={{ display: 'block', padding: '4px 16px' }}>No investing activities</Text>
            ) : (reportPreviewData.data.sections.investing.items || []).map((a: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0 4px 16px', borderBottom: '1px solid #f1f5f9' }}>
                <Text style={{ fontSize: 13 }}>{a.detail}</Text>
                <Text strong style={{ fontSize: 13 }}>{formatCurrency(a.amount)}</Text>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid #cbd5e1' }}>
              <Text strong>Net Cash from Investing</Text>
              <Text strong style={{ color: '#7c3aed' }}>{formatCurrency(reportPreviewData.data.sections.investing.totalInvesting)}</Text>
            </div>

            <Title level={5} style={{ color: '#059669', borderBottom: '2px solid #059669', paddingBottom: 4, marginTop: 16 }}>FINANCING ACTIVITIES</Title>
            {(reportPreviewData.data.sections.financing.items || []).length === 0 ? (
              <Text type="secondary" style={{ display: 'block', padding: '4px 16px' }}>No financing activities</Text>
            ) : (reportPreviewData.data.sections.financing.items || []).map((a: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0 4px 16px', borderBottom: '1px solid #f1f5f9' }}>
                <Text style={{ fontSize: 13 }}>{a.detail}</Text>
                <Text strong style={{ fontSize: 13 }}>{formatCurrency(a.amount)}</Text>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid #cbd5e1' }}>
              <Text strong>Net Cash from Financing</Text>
              <Text strong style={{ color: '#059669' }}>{formatCurrency(reportPreviewData.data.sections.financing.totalFinancing)}</Text>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: '#f8fafc', borderRadius: 6, marginTop: 16, border: '2px solid #1e293b' }}>
              <Title level={4} style={{ margin: 0 }}>NET CHANGE IN CASH</Title>
              <Title level={4} style={{ margin: 0, color: reportPreviewData.data.netCashChange >= 0 ? '#059669' : '#dc2626' }}>{formatCurrency(reportPreviewData.data.netCashChange)}</Title>
            </div>
          </div>
        ) : reportPreviewData?.data && reportPreviewData.reportCode === 'vat-report' ? (
          /* ===== VAT REPORT ===== */
          <div style={{ padding: '0 8px' }}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <Title level={4} style={{ marginBottom: 4 }}>VAT Report (SA VAT201)</Title>
              <Text type="secondary">{reportPreviewData.data.periodStart} to {reportPreviewData.data.periodEnd} · Rate: {reportPreviewData.data.vatRate}</Text>
            </div>
            
            <Card size="small" title="Output VAT (Sales)" style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <Text>Total Sales (Incl. VAT)</Text><Text strong>{formatCurrency(reportPreviewData.data.output.totalSalesInclVat)}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <Text>Total Sales (Excl. VAT)</Text><Text>{formatCurrency(reportPreviewData.data.output.totalSalesExclVat)}</Text>
              </div>
              <Divider style={{ margin: '8px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <Text strong>Output VAT</Text><Text strong style={{ color: '#dc2626' }}>{formatCurrency(reportPreviewData.data.output.outputVat)}</Text>
              </div>
            </Card>

            <Card size="small" title="Input VAT (Purchases)" style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <Text>Total Purchases (Incl. VAT)</Text><Text strong>{formatCurrency(reportPreviewData.data.input.totalPurchasesInclVat)}</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <Text>Total Purchases (Excl. VAT)</Text><Text>{formatCurrency(reportPreviewData.data.input.totalPurchasesExclVat)}</Text>
              </div>
              <Divider style={{ margin: '8px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <Text strong>Input VAT</Text><Text strong style={{ color: '#059669' }}>{formatCurrency(reportPreviewData.data.input.inputVat)}</Text>
              </div>
            </Card>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: reportPreviewData.data.netVat >= 0 ? '#fef2f2' : '#f0fdf4', borderRadius: 6, border: `2px solid ${reportPreviewData.data.netVat >= 0 ? '#dc2626' : '#059669'}` }}>
              <Title level={4} style={{ margin: 0 }}>{reportPreviewData.data.netVat >= 0 ? 'VAT PAYABLE TO SARS' : 'VAT REFUND FROM SARS'}</Title>
              <Title level={4} style={{ margin: 0, color: reportPreviewData.data.netVat >= 0 ? '#dc2626' : '#059669' }}>{formatCurrency(Math.abs(reportPreviewData.data.netVat))}</Title>
            </div>
          </div>
        ) : reportPreviewData?.data && (reportPreviewData.reportCode === 'aged-receivables' || reportPreviewData.reportCode === 'aged-payables') ? (
          /* ===== AGED RECEIVABLES / PAYABLES ===== */
          <div style={{ padding: '0 8px' }}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <Title level={4} style={{ marginBottom: 4 }}>{reportPreviewData.title}</Title>
              <Text type="secondary">As at {reportPreviewData.data.asOfDate}</Text>
            </div>
            <Table
              dataSource={[
                { bucket: 'Current (0-30 days)', amount: reportPreviewData.data.aging?.current || 0 },
                { bucket: '31-60 days', amount: reportPreviewData.data.aging?.days30 || 0 },
                { bucket: '61-90 days', amount: reportPreviewData.data.aging?.days60 || 0 },
                { bucket: '91-120 days', amount: reportPreviewData.data.aging?.days90 || 0 },
                { bucket: 'Over 120 days', amount: reportPreviewData.data.aging?.over90 || 0 },
              ].map((r, i) => ({ ...r, key: i }))}
              columns={[
                { title: 'Aging Bucket', dataIndex: 'bucket', key: 'bucket' },
                { title: 'Amount', dataIndex: 'amount', key: 'amount', align: 'right' as const, render: (v: number) => <Text strong>{formatCurrency(v)}</Text> },
              ]}
              pagination={false}
              size="small"
              bordered
              summary={() => (
                <Table.Summary.Row style={{ background: '#f8fafc', fontWeight: 'bold' }}>
                  <Table.Summary.Cell index={0}><Text strong>TOTAL</Text></Table.Summary.Cell>
                  <Table.Summary.Cell index={1} align="right"><Text strong>{formatCurrency(reportPreviewData.data.aging?.total || 0)}</Text></Table.Summary.Cell>
                </Table.Summary.Row>
              )}
            />
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">{reportPreviewData.data.transactionCount || 0} transactions analysed</Text>
            </div>
          </div>
        ) : (
          /* ===== FALLBACK: Raw CSV ===== */
          <pre style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            padding: 20,
            maxHeight: 500,
            overflow: 'auto',
            fontSize: 13,
            lineHeight: 1.6,
            fontFamily: "'Courier New', Courier, monospace",
            whiteSpace: 'pre-wrap',
          }}>
            {reportPreviewData?.content || 'No data'}
          </pre>
        )}
      </Modal>

      {/* Journal Entry Detail Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <FileTextOutlined style={{ fontSize: 20, color: '#667eea' }} />
            <span>Journal Entry Details</span>
            {journalDetailData?.status && getStatusTag(journalDetailData.status.toLowerCase())}
          </div>
        }
        open={showJournalDetailModal}
        onCancel={() => { setShowJournalDetailModal(false); setJournalDetailData(null); }}
        footer={[
          <Button key="close" onClick={() => setShowJournalDetailModal(false)}>Close</Button>,
          ...(journalDetailData?.status && journalDetailData.status.toLowerCase() !== 'posted' ? [
            <Button
              key="post"
              type="primary"
              icon={<SendOutlined />}
              loading={journalActionLoading === journalDetailData?.id}
              onClick={async () => {
                try {
                  setJournalActionLoading(journalDetailData.id);
                  const result = await financialService.postJournalEntry(journalDetailData.id);
                  if (result.success) {
                    message.success(result.message || 'Journal entry posted successfully');
                    setShowJournalDetailModal(false);
                    setJournalDetailData(null);
                    await refreshJournalEntries();
                  } else {
                    message.error(result.message || 'Failed to post');
                  }
                } catch (err: any) {
                  message.error(err?.response?.data?.message || 'Failed to post');
                } finally {
                  setJournalActionLoading(null);
                }
              }}
            >
              Post Entry
            </Button>
          ] : []),
          ...(journalDetailData?.status && journalDetailData.status.toLowerCase() === 'posted' ? [
            <Button
              key="reverse"
              danger
              icon={<UndoOutlined />}
              loading={journalActionLoading === journalDetailData?.id}
              onClick={async () => {
                if (!window.confirm('Are you sure you want to reverse this journal entry?')) return;
                try {
                  setJournalActionLoading(journalDetailData.id);
                  const result = await financialService.reverseJournalEntry(journalDetailData.id);
                  if (result.success) {
                    message.success(result.message || 'Journal entry reversed successfully');
                    setShowJournalDetailModal(false);
                    setJournalDetailData(null);
                    await refreshJournalEntries();
                  } else {
                    message.error(result.message || 'Failed to reverse');
                  }
                } catch (err: any) {
                  message.error(err?.response?.data?.message || 'Failed to reverse');
                } finally {
                  setJournalActionLoading(null);
                }
              }}
            >
              Reverse Entry
            </Button>
          ] : []),
        ]}
        width={800}
      >
        {journalDetailLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" tip="Loading journal entry..." /></div>
        ) : journalDetailData ? (
          <div>
            {/* Header info */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={8}>
                <Text type="secondary" style={{ fontSize: 12 }}>Entry Number</Text>
                <div><Text strong>{journalDetailData.entry_number || journalDetailData.journal_number || journalDetailData.id}</Text></div>
              </Col>
              <Col span={8}>
                <Text type="secondary" style={{ fontSize: 12 }}>Date</Text>
                <div><Text>{dayjs(journalDetailData.entry_date || journalDetailData.journal_date || journalDetailData.created_at).format('YYYY-MM-DD')}</Text></div>
              </Col>
              <Col span={8}>
                <Text type="secondary" style={{ fontSize: 12 }}>Created By</Text>
                <div><Text>{journalDetailData.created_by || 'System'}</Text></div>
              </Col>
            </Row>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={24}>
                <Text type="secondary" style={{ fontSize: 12 }}>Description</Text>
                <div><Text>{journalDetailData.description || journalDetailData.notes || 'No description'}</Text></div>
              </Col>
            </Row>

            <Divider style={{ margin: '12px 0' }}>Journal Lines</Divider>

            {/* Lines table */}
            <Table
              dataSource={(journalDetailData.lines || journalDetailData.journal_lines || []).map((line: any, idx: number) => ({
                ...line,
                key: line.id || idx,
              }))}
              columns={[
                {
                  title: 'Account',
                  key: 'account',
                  render: (_: any, line: any) => (
                    <span>
                      <Tag color="blue" style={{ fontSize: 11 }}>{line.account_code || line.account_number || '-'}</Tag>
                      <Text>{line.account_name || '-'}</Text>
                    </span>
                  ),
                },
                {
                  title: 'Description',
                  dataIndex: 'description',
                  key: 'description',
                  ellipsis: true,
                  render: (v: string) => v || '-',
                },
                {
                  title: 'Debit (R)',
                  dataIndex: 'debit_amount',
                  key: 'debit',
                  align: 'right' as const,
                  width: 130,
                  render: (v: number) => {
                    const val = parseFloat(v as any) || 0;
                    return val > 0 ? <Text style={{ color: '#10b981' }}>{formatCurrency(val)}</Text> : '-';
                  },
                },
                {
                  title: 'Credit (R)',
                  dataIndex: 'credit_amount',
                  key: 'credit',
                  align: 'right' as const,
                  width: 130,
                  render: (v: number) => {
                    const val = parseFloat(v as any) || 0;
                    return val > 0 ? <Text style={{ color: '#ef4444' }}>{formatCurrency(val)}</Text> : '-';
                  },
                },
              ]}
              pagination={false}
              size="small"
              bordered
              summary={(data) => {
                const totalDebit = data.reduce((s, r) => s + (parseFloat(r.debit_amount) || 0), 0);
                const totalCredit = data.reduce((s, r) => s + (parseFloat(r.credit_amount) || 0), 0);
                return (
                  <Table.Summary>
                    <Table.Summary.Row style={{ background: '#f8fafc', fontWeight: 'bold' }}>
                      <Table.Summary.Cell index={0} colSpan={2}><Text strong>Totals</Text></Table.Summary.Cell>
                      <Table.Summary.Cell index={2} align="right"><Text strong style={{ color: '#10b981' }}>{formatCurrency(totalDebit)}</Text></Table.Summary.Cell>
                      <Table.Summary.Cell index={3} align="right"><Text strong style={{ color: '#ef4444' }}>{formatCurrency(totalCredit)}</Text></Table.Summary.Cell>
                    </Table.Summary.Row>
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={4}>
                        {Math.abs(totalDebit - totalCredit) < 0.01 ? (
                          <Tag color="green" icon={<CheckCircleOutlined />}>Debits equal Credits - Entry is balanced</Tag>
                        ) : (
                          <Tag color="red" icon={<ExclamationCircleOutlined />}>
                            Out of balance by {formatCurrency(Math.abs(totalDebit - totalCredit))}
                          </Tag>
                        )}
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  </Table.Summary>
                );
              }}
            />
          </div>
        ) : (
          <Empty description="No journal entry data available" />
        )}
      </Modal>
    </HubLayout>
  );
};

export default FinancialHub;
