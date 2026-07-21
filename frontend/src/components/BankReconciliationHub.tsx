/**
 * BankReconciliation - Enterprise Bank Reconciliation with AI
 * 
 * Features:
 * - AI-powered auto-matching with confidence scores
 * - AP/AR invoice integration
 * - Real-time reconciliation
 * - Statement import (CSV, OFX, QIF, MT940)
 * - Multi-currency support
 * - Audit trail
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import apiClient from '../services/api';
import {
  Card, Row, Col, Table, Tag, Button, Space, Statistic,
  Typography, Tabs, Progress, Badge, Input, Select,
  DatePicker, Modal, Upload, message, Tooltip, Drawer,
  Timeline, Alert, Checkbox, Divider, Spin, Result,
  List, Avatar, Form, InputNumber, Switch, Popconfirm
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { UploadFile } from 'antd/es/upload/interface';
import {
  BankOutlined, SwapOutlined, CheckCircleOutlined,
  CloseCircleOutlined, ClockCircleOutlined, SearchOutlined,
  UploadOutlined, DownloadOutlined, FilterOutlined,
  SyncOutlined, LinkOutlined, DisconnectOutlined, FileTextOutlined,
  HistoryOutlined, WarningOutlined, PlusOutlined,
  ArrowUpOutlined, ArrowDownOutlined, EyeOutlined,
  ThunderboltOutlined, SettingOutlined, ReloadOutlined,
  RobotOutlined, FileExcelOutlined, FilePdfOutlined,
  DollarOutlined, TeamOutlined, ShopOutlined,
  CheckOutlined, LoadingOutlined, BulbOutlined,
  SafetyCertificateOutlined, AuditOutlined, InboxOutlined
} from '@ant-design/icons';
import {
  HubLayout, HubHeader, StatusBanner, HubTabs
} from './hub';

const { Title, Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;
const { Dragger } = Upload;

// Types
interface BankTransaction {
  id: string;
  date: string;
  description: string;
  reference: string;
  amount: number;
  type: 'credit' | 'debit';
  status: 'unmatched' | 'matched' | 'partial' | 'excluded' | 'ai-suggested' | 'reconciled';
  matchedWith?: string[];
  confidence?: number;
  aiSuggestion?: string;
  category?: string;
  suggestedGlAccount?: string;
  suggestedGlAccountName?: string;
  aiCategoryConfidence?: number;
}

interface BookEntry {
  id: string;
  date: string;
  description: string;
  reference: string;
  amount: number;
  type: 'credit' | 'debit';
  status: 'unmatched' | 'matched' | 'partial';
  account: string;
  matchedWith?: string;
  source: 'ap' | 'ar' | 'gl' | 'manual';
  documentType?: 'invoice' | 'payment' | 'receipt' | 'journal';
  vendorClient?: string;
}

interface AIMatch {
  bankTxnId: string;
  bookEntryId: string;
  confidence: number;
  matchReason: string;
  ruleApplied: string;
  // Backend may return these alternative field names
  statement_line_id?: string;
  gl_entry_id?: string;
  match_reason?: string;
  reason?: string;
}

interface ImportedStatement {
  filename: string;
  transactions: number;
  startDate: string;
  endDate: string;
  status: 'processing' | 'completed' | 'error';
}

// GL Account interface for allocation
interface GLAccount {
  id: string;
  code: string;
  name: string;
  type: string;
}

const BankReconciliation: React.FC = () => {
  // State
  const [selectedBankAccount, setSelectedBankAccount] = useState('fnb-current');
  const [isAutoMatching, setIsAutoMatching] = useState(false);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [selectedBankTxn, setSelectedBankTxn] = useState<BankTransaction | null>(null);
  const [selectedBookEntries, setSelectedBookEntries] = useState<string[]>([]);
  const [showImportDrawer, setShowImportDrawer] = useState(false);
  const [showAIInsights, setShowAIInsights] = useState(false);
  const [activeTab, setActiveTab] = useState('reconcile');
  const [suggestionOverrides, setSuggestionOverrides] = useState<Map<string, string>>(new Map());

  // Create-GL-account-inline state, for when nothing in the existing chart
  // of accounts fits an "Unknown"/low-confidence transaction and the AI
  // Suggestions review screen otherwise gave no way to add one without
  // leaving the page. Mirrors the equivalent flow already built into the
  // manual "Allocate to GL" modal (newAccountCode/newAccountName/etc below).
  const [showCreateAccountForTxn, setShowCreateAccountForTxn] = useState<string | null>(null);
  const [createAcctCode, setCreateAcctCode] = useState('');
  const [createAcctName, setCreateAcctName] = useState('');
  const [createAcctType, setCreateAcctType] = useState('EXPENSE');
  const [creatingAcctForTxn, setCreatingAcctForTxn] = useState(false);
  const [aiMatches, setAiMatches] = useState<AIMatch[]>([]);
  const [isProcessingImport, setIsProcessingImport] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadFile[]>([]);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>([]);
  const [bookEntries, setBookEntries] = useState<BookEntry[]>([]);
  const [bankAccounts, setBankAccounts] = useState<Array<{id: string, name: string, balance: number, number: string, currency: string}>>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Reconciliation history from database
  const [reconciliationHistory, setReconciliationHistory] = useState<any[]>([]);
  
  // AI Rules state - fed to the AI Auto-Match request, though the backend
  // endpoint doesn't currently read it (see the AI Rules tab for why editing
  // isn't exposed - there's nowhere for edits to actually go yet)
  const [aiRules, setAiRules] = useState<any[]>([]);

  // GL Allocation state - direct GL posting for non-invoice transactions
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [allocatingTxn, setAllocatingTxn] = useState<BankTransaction | null>(null);
  const [glAccounts, setGLAccounts] = useState<GLAccount[]>([]);
  const [selectedGLAccount, setSelectedGLAccount] = useState<string>('');
  const [allocateDescription, setAllocateDescription] = useState('');
  const [isAllocating, setIsAllocating] = useState(false);
  // Tracks which single row's Accept button is in flight, separately from
  // isAllocating (bulk/batch actions) - without this, every row's Accept
  // button shared the same boolean and all lit up as "running" whenever any
  // one of them was clicked.
  const [allocatingTxnId, setAllocatingTxnId] = useState<string | null>(null);

  // Inline account creation state
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [newAccountCode, setNewAccountCode] = useState('');
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountType, setNewAccountType] = useState<string>('EXPENSE');
  const [newAccountSubtype, setNewAccountSubtype] = useState<string>('');
  const [newAccountDescription, setNewAccountDescription] = useState('');
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);

  // AI Categorization state - Groq-powered intelligent GL suggestions
  const [isAICategorizing, setIsAICategorizing] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<Map<string, { accountId: string; accountCode: string; accountName: string; confidence: number; reason: string; patternId?: string; humanConfirmed?: boolean }>>(new Map());
  const [aiProvider, setAiProvider] = useState<string>('');
  
  // AI Learning stats
  const [aiLearningStats, setAiLearningStats] = useState<{ total_patterns: number; total_allocations: number; accuracy: number }>({ total_patterns: 0, total_allocations: 0, accuracy: 0 });

  // Fetch AI learning stats
  const fetchAIStats = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/api/v2/cash-management/reconciliation/ai-stats');
      if (data.success && data.data) {
        setAiLearningStats(data.data);
      }
    } catch (e) {
      // silent - stats are non-critical
    }
  }, []);

  // Loads statement lines for ONE bank account. Bank Balance and everything
  // else on this screen is only meaningful scoped to a single account being
  // reconciled - this used to fetch every account's lines mixed together
  // (the API call never passed bank_account_id), which is why Bank Balance
  // showed the sum of ALL bank accounts combined instead of just the
  // selected one, producing numbers that couldn't be reconciled against
  // anything.
  const loadStatementLines = useCallback(async (accountId: string) => {
    const statementsRes = await apiClient
      .get('/api/v2/cash-management/statement-lines', { params: { bank_account_id: accountId } })
      .catch(() => ({ data: { data: [] } }));
    const statements = statementsRes.data?.data || [];

    if (statements.length > 0) {
      // Build AI suggestions map from DB-persisted suggestions
      const savedSuggestions = new Map<string, { accountId: string; accountCode: string; accountName: string; confidence: number; reason: string; patternId?: string; humanConfirmed?: boolean }>();

      const mappedTxns = statements.map((stmt: any) => {
        // Map DB status to frontend status - normalise to lowercase first
        let uiStatus = (stmt.status || 'unmatched').toLowerCase();
        if (uiStatus === 'allocated') uiStatus = 'matched';
        if (uiStatus === 'reconciled') uiStatus = 'matched';

        // If DB has a saved AI suggestion and txn is unmatched, show as ai-suggested
        const hasSavedSuggestion = stmt.suggested_gl_account_id && uiStatus === 'unmatched';
        if (hasSavedSuggestion) {
          uiStatus = 'ai-suggested';
          savedSuggestions.set(stmt.id, {
            accountId: stmt.suggested_gl_account_id,
            accountCode: stmt.suggested_gl_account_code || '',
            accountName: stmt.suggested_gl_account_name || stmt.suggested_account_name_resolved || '',
            confidence: parseFloat(stmt.ai_confidence) || 0,
            reason: stmt.ai_reason || 'AI suggested',
            patternId: stmt.pattern_id || undefined,
            humanConfirmed: !!stmt.human_confirmed
          });
        }

        return {
          id: stmt.id,
          date: stmt.transaction_date || stmt.date,
          description: stmt.description || '',
          reference: stmt.reference || '',
          amount: Math.abs(parseFloat(stmt.amount) || 0),
          signedAmount: parseFloat(stmt.amount) || 0,
          originalStatus: stmt.status || 'unmatched',
          type: parseFloat(stmt.amount) >= 0 ? 'credit' : 'debit',
          status: uiStatus as 'unmatched' | 'matched' | 'partial' | 'excluded' | 'ai-suggested' | 'reconciled',
          category: stmt.category || stmt.allocated_account_name || '',
          matchedWith: stmt.matched_transaction_id ? [stmt.matched_transaction_id] : [],
          suggestedGlAccountName: stmt.allocated_account_name || stmt.suggested_gl_account_name || stmt.suggested_account_name_resolved || undefined,
          confidence: hasSavedSuggestion ? parseFloat(stmt.ai_confidence) || 0 : undefined,
          aiSuggestion: hasSavedSuggestion ? `${stmt.suggested_gl_account_code || ''} - ${stmt.suggested_gl_account_name || stmt.suggested_account_name_resolved || ''}: ${stmt.ai_reason || 'AI suggested'}` : undefined,
        };
      });
      setBankTransactions(mappedTxns);

      // Restore AI suggestions map so the UI shows suggestion badges
      setAiSuggestions(savedSuggestions);
      if (savedSuggestions.size > 0) {
        setAiProvider(statements.find((s: any) => s.ai_provider)?.ai_provider || 'rules');
      }
    } else {
      setBankTransactions([]);
      setAiSuggestions(new Map());
    }
  }, []);

  // Reload statement lines whenever the selected bank account changes (the
  // initial mount's fetch below handles the first load itself, so this
  // effect skips its first run to avoid double-fetching).
  const skippedFirstAccountLoad = useRef(false);
  useEffect(() => {
    if (!skippedFirstAccountLoad.current) {
      skippedFirstAccountLoad.current = true;
      return;
    }
    if (selectedBankAccount) loadStatementLines(selectedBankAccount);
  }, [selectedBankAccount, loadStatementLines]);

  // Fetch real bank accounts and transactions from API
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // These 6 requests are all independent - fetching them one at a time
        // (as this used to do) serialized ~2-3s each into a 15-30s page load.
        // Firing them together cuts load time to whichever single request is
        // slowest, instead of the sum of all of them. Statement lines are
        // fetched separately below since they depend on knowing the default
        // account first (see loadStatementLines).
        const [accountsRes, apRes, arRes, glRes, historyRes, rulesRes] = await Promise.all([
          apiClient.get('/api/v2/cash-management/bank-accounts').catch(() => ({ data: { data: [] } })),
          apiClient.get('/api/v2/purchase/invoices?status=pending').catch(() => ({ data: { data: [] } })),
          apiClient.get('/api/v2/sales/invoices?status=pending').catch(() => ({ data: { data: [] } })),
          apiClient.get('/api/v2/financial/accounts').catch(() => ({ data: { data: [] } })),
          apiClient.get('/api/v2/cash-management/reconciliation/history').catch(() => ({ data: { data: [] } })),
          apiClient.get('/api/v2/cash-management/reconciliation/rules').catch(() => ({ data: { data: [] } })),
        ]);

        // Fetch bank accounts
        const accounts = accountsRes.data?.data || [];
        let defaultAccountId = '';

        if (accounts.length > 0) {
          const mappedAccounts = accounts.map((acc: any) => ({
            id: acc.id,
            name: acc.account_name || 'Bank Account',
            balance: parseFloat(acc.current_balance) || 0,
            number: acc.account_number ? `****${String(acc.account_number).replace(/\D/g, '').slice(-4) || String(acc.account_number).slice(-4)}` : '****',
            currency: acc.currency || 'ZAR',
            gl_account_code: acc.gl_account_code || '',
            gl_book_balance: acc.gl_book_balance
          }));
          setBankAccounts(mappedAccounts);
          defaultAccountId = mappedAccounts[0]?.id || '';
          setSelectedBankAccount(defaultAccountId);
        } else {
          // No bank accounts - show empty state
          setBankAccounts([]);
        }

        // Statement lines/transactions, scoped to the default account
        if (defaultAccountId) {
          await loadStatementLines(defaultAccountId);
        } else {
          setBankTransactions([]);
        }

        // Book entries would come from AP/AR - unpaid invoices
        const apInvoices = (apRes.data?.data || []).map((inv: any) => ({
          id: inv.id,
          date: inv.invoice_date || inv.date,
          description: `Invoice from ${inv.vendor_name || inv.supplier_name || 'Vendor'}`,
          reference: inv.invoice_number || inv.reference,
          amount: parseFloat(inv.total_amount || inv.total) || 0,
          type: 'debit' as const,
          status: 'unmatched' as const,
          account: 'Accounts Payable',
          source: 'ap' as const,
          documentType: 'invoice' as const,
          vendorClient: inv.vendor_name || inv.supplier_name
        }));

        const arInvoices = (arRes.data?.data || []).map((inv: any) => ({
          id: inv.id,
          date: inv.invoice_date || inv.date,
          description: `Invoice to ${inv.customer_name || inv.client_name || 'Customer'}`,
          reference: inv.invoice_number || inv.reference,
          amount: parseFloat(inv.total_amount || inv.total) || 0,
          type: 'credit' as const,
          status: 'unmatched' as const,
          account: 'Accounts Receivable',
          source: 'ar' as const,
          documentType: 'invoice' as const,
          vendorClient: inv.customer_name || inv.client_name
        }));

        setBookEntries([...apInvoices, ...arInvoices]);
        setAiMatches([]);

        // GL accounts for allocation (expense accounts, income accounts, etc.)
        const allAccounts = glRes.data?.data || glRes.data?.accounts || [];
        if (allAccounts.length > 0) {
          // Filter to postable accounts only (not headers, must be active - the allocate
          // endpoint rejects inactive accounts, so an inactive account showing here as
          // selectable would always fail on submit)
          const mappedGL = allAccounts
            .filter((acc: any) => !acc.is_header && acc.is_active !== false)
            .map((acc: any) => ({
              id: acc.id || acc.account_number, // Some accounts don't have UUID id
              code: acc.account_number || acc.account_code || acc.code || '',
              name: acc.name || acc.account_name || '',
              type: acc.account_type || acc.type || ''
            }));
          setGLAccounts(mappedGL);
        }

        // Reconciliation history
        const history = historyRes.data?.data || [];
        setReconciliationHistory(history);

        // AI matching rules
        const rules = rulesRes.data?.data || [];
        // Set default rules if none exist
        if (rules.length === 0) {
          setAiRules([
            { id: '1', name: 'Invoice Reference Match', field: 'Reference', condition: 'Contains invoice number', priority: 1, confidence: 95, enabled: true },
            { id: '2', name: 'Exact Amount + Date', field: 'Amount & Date', condition: 'Amount exact, ±2 days', priority: 2, confidence: 90, enabled: true },
            { id: '3', name: 'Company Name Match', field: 'Description', condition: 'Contains vendor/client name', priority: 3, confidence: 85, enabled: true },
          ]);
        } else {
          setAiRules(rules);
        }
        
      } catch (error) {
        console.error('Error fetching reconciliation data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
    fetchAIStats();
  }, [fetchAIStats]);

  // Calculate stats - use real data only
  const selectedAccount = bankAccounts.find(a => a.id === selectedBankAccount);
  // Money math in floating point accumulates binary rounding error over many
  // additions (classic 0.1 + 0.2 territory) - round every running total to
  // the cent so display never leaks noise like "-220790.08000000002".
  const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

  // Bank Balance = sum of this account's statement lines (bankTransactions
  // is now fetched scoped to selectedBankAccount, not every account mixed
  // together - see loadStatementLines)
  const bankBalance = round2(bankTransactions.reduce((sum, t) => sum + ((t as any).signedAmount || (t.type === 'debit' ? -t.amount : t.amount)), 0));
  // Book Balance = GL balance for the linked bank GL account (if available), otherwise sum of reconciled lines
  const glBookBalance = selectedAccount && parseFloat((selectedAccount as any).gl_book_balance || '0');
  const hasGLLink = selectedAccount && (selectedAccount as any).gl_account_code && glBookBalance !== undefined;
  const reconciledBalance = round2(bankTransactions
    .filter(t => t.status === 'matched' || (t as any).originalStatus === 'allocated' || (t as any).originalStatus === 'reconciled')
    .reduce((sum, t) => sum + ((t as any).signedAmount || (t.type === 'debit' ? -t.amount : t.amount)), 0));
  const bookBalance = hasGLLink && glBookBalance !== 0 ? round2(glBookBalance) : reconciledBalance;
  const stats = {
    bankBalance,
    bookBalance,
    difference: 0,
    matchedCount: bankTransactions.filter(t => t.status === 'matched').length,
    unmatchedCount: bankTransactions.filter(t => t.status === 'unmatched').length,
    aiSuggestedCount: bankTransactions.filter(t => t.status === 'ai-suggested').length,
    partialCount: bankTransactions.filter(t => t.status === 'partial').length,
    matchRate: bankTransactions.length > 0 ? Math.round((bankTransactions.filter(t => t.status === 'matched').length / bankTransactions.length) * 100) : 0
  };
  stats.difference = round2(stats.bankBalance - stats.bookBalance);

  // AI Auto-Match Function - intelligent matching using rules
  const runAIAutoMatch = useCallback(async () => {
    if (!selectedBankAccount) {
      message.warning('Please select a bank account first');
      return;
    }

    if (bankTransactions.length === 0) {
      message.warning('No bank transactions to match. Import a statement first.');
      return;
    }

    setIsAutoMatching(true);
    message.loading({ content: 'AI is analyzing transactions...', key: 'automatch' });

    try {
      // First try the API
      const response = await apiClient.post('/api/v2/cash-management/reconciliation/auto-match', {
        bank_account_id: selectedBankAccount,
        rules: aiRules.filter(r => r.enabled)
      }).catch(() => null);

      const apiMatches = response?.data?.data?.matches || [];
      
      // Also run local intelligent matching against AP/AR invoices
      const localMatches: AIMatch[] = [];
      
      for (const txn of bankTransactions.filter(t => t.status === 'unmatched')) {
        for (const entry of bookEntries.filter(e => e.status === 'unmatched')) {
          let confidence = 0;
          let matchReason = '';
          
          // Rule 1: Exact amount match (most reliable)
          const amountMatch = Math.abs(txn.amount - entry.amount) < 0.01;
          if (amountMatch) {
            confidence += 40;
            matchReason = 'Amount matches exactly';
          }
          
          // Rule 2: Amount within tolerance (±R50)
          const amountClose = Math.abs(txn.amount - entry.amount) <= 50;
          if (!amountMatch && amountClose) {
            confidence += 25;
            matchReason = 'Amount within R50 tolerance';
          }
          
          // Rule 3: Reference/invoice number in description
          const refInDesc = entry.reference && txn.description.toLowerCase().includes(entry.reference.toLowerCase());
          const descInRef = txn.reference && entry.reference?.toLowerCase().includes(txn.reference.toLowerCase());
          if (refInDesc || descInRef) {
            confidence += 35;
            matchReason += (matchReason ? ' + ' : '') + 'Reference matches';
          }
          
          // Rule 4: Vendor/client name in description
          if (entry.vendorClient) {
            const vendorWords = entry.vendorClient.toLowerCase().split(' ').filter(w => w.length > 3);
            const descLower = txn.description.toLowerCase();
            const nameMatch = vendorWords.some(word => descLower.includes(word));
            if (nameMatch) {
              confidence += 20;
              matchReason += (matchReason ? ' + ' : '') + 'Name found in description';
            }
          }
          
          // Rule 5: Type match (debit should match AP, credit should match AR)
          const typeMatch = (txn.type === 'debit' && entry.source === 'ap') || 
                           (txn.type === 'credit' && entry.source === 'ar');
          if (typeMatch) {
            confidence += 5;
          }
          
          // If confidence is high enough, add as a match
          if (confidence >= 60) {
            localMatches.push({
              bankTxnId: txn.id,
              bookEntryId: entry.id,
              confidence,
              matchReason: matchReason || 'Multiple factors matched',
              ruleApplied: 'Local Rule Engine'
            });
          }
        }
      }
      
      // Combine API matches with local matches and apply
      const allMatches: AIMatch[] = [...(apiMatches as AIMatch[]), ...localMatches];
      
      // Also get AI learned suggestions for unmatched transactions
      const unmatchedAfterRules = bankTransactions.filter(t => 
        t.status === 'unmatched' && !allMatches.some(m => (m.bankTxnId || m.statement_line_id) === t.id)
      );
      
      if (unmatchedAfterRules.length > 0) {
        try {
          const learnedResponse = await apiClient.post('/api/v2/cash-management/reconciliation/ai-suggest', {
            transactions: unmatchedAfterRules.map(t => ({
              id: t.id,
              description: t.description,
              amount: t.amount,
              is_debit: t.type === 'debit'
            }))
          }).catch(() => null);
          
          const learnedSuggestions = learnedResponse?.data?.data?.suggestions || {};
          
          // Add learned suggestions as AI matches (GL account suggestions)
          for (const [txnId, suggestions] of Object.entries(learnedSuggestions)) {
            const topSuggestion = (suggestions as any[])[0];
            if (topSuggestion && topSuggestion.confidence >= 50) {
              allMatches.push({
                bankTxnId: txnId,
                bookEntryId: topSuggestion.gl_account_id,
                confidence: topSuggestion.confidence,
                matchReason: `🧠 AI Learned: ${topSuggestion.gl_account_name} (${topSuggestion.match_reason})`,
                ruleApplied: 'AI Learning Engine',
                pattern_id: topSuggestion.pattern_id,
                gl_account_id: topSuggestion.gl_account_id,
                gl_account_name: topSuggestion.gl_account_name,
                gl_account_code: topSuggestion.gl_account_code,
              } as any);
            }
          }
        } catch (err) {
          console.warn('AI learning suggestions unavailable:', err);
        }
      }

      if (allMatches.length > 0) {
        // Group by bank transaction, keep best match per transaction
        const bestMatches = new Map<string, AIMatch>();
        for (const match of allMatches) {
          const txnId = match.bankTxnId || match.statement_line_id || '';
          const existing = bestMatches.get(txnId);
          if (!existing || match.confidence > existing.confidence) {
            bestMatches.set(txnId, match);
          }
        }
        
        // Apply matches - set as ai-suggested so user can confirm
        setBankTransactions(prev => prev.map(txn => {
          const match = bestMatches.get(txn.id);
          if (match && txn.status === 'unmatched') {
            return {
              ...txn,
              status: 'ai-suggested' as const,
              matchedWith: [match.bookEntryId || match.gl_entry_id || ''],
              confidence: match.confidence,
              aiSuggestion: match.matchReason || match.reason || match.match_reason || 'AI suggested match'
            };
          }
          return txn;
        }));
        
        // Update aiMatches state for accept/reject functionality
        setAiMatches(Array.from(bestMatches.values()).map(m => ({
          bankTxnId: m.bankTxnId || m.statement_line_id || '',
          bookEntryId: m.bookEntryId || m.gl_entry_id || '',
          confidence: m.confidence,
          matchReason: m.matchReason || m.reason || m.match_reason || '',
          ruleApplied: m.ruleApplied || 'AI Analysis'
        })));

        message.success({ 
          content: `✨ AI found ${bestMatches.size} potential matches! Review and confirm each.`, 
          key: 'automatch', 
          duration: 4 
        });
      } else {
        message.info({ 
          content: 'No automatic matches found. Transactions may not have matching invoices - use "Allocate" or "AI Categorize" for direct GL posting.', 
          key: 'automatch', 
          duration: 5 
        });
      }
    } catch (error) {
      console.error('Auto-match error:', error);
      message.error({ content: 'AI matching failed. Please try again.', key: 'automatch' });
    }

    setIsAutoMatching(false);
  }, [selectedBankAccount, bankTransactions, bookEntries, aiRules]);

  // AI Categorize Function - Uses Groq AI to suggest GL accounts for unmatched transactions.
  // Sent in batches: a single request with thousands of transactions blows past the LLM's
  // context/rate limits and can time out on the backend, which silently looks like "AI
  // categorization is broken" when it's really just an unbatched request.
  const AI_CATEGORIZE_BATCH_SIZE = 40;

  const runAICategorize = useCallback(async () => {
    if (!selectedBankAccount) {
      message.warning('Please select a bank account first');
      return;
    }

    const unmatchedTxns = bankTransactions.filter(t => t.status === 'unmatched' || t.status === 'ai-suggested');
    if (unmatchedTxns.length === 0) {
      message.info('No unmatched transactions to categorize');
      return;
    }

    setIsAICategorizing(true);

    const batches: typeof unmatchedTxns[] = [];
    for (let i = 0; i < unmatchedTxns.length; i += AI_CATEGORIZE_BATCH_SIZE) {
      batches.push(unmatchedTxns.slice(i, i + AI_CATEGORIZE_BATCH_SIZE));
    }

    const accumulatedSuggestions = new Map<string, { accountId: string; accountCode: string; accountName: string; confidence: number; reason: string; patternId?: string; humanConfirmed?: boolean }>();
    let totalCategorized = 0;
    let lastProvider = 'rules';
    let failedBatches = 0;

    for (let b = 0; b < batches.length; b++) {
      const batch = batches[b];
      message.loading({
        content: `🤖 Categorizing ${Math.min((b + 1) * AI_CATEGORIZE_BATCH_SIZE, unmatchedTxns.length)}/${unmatchedTxns.length} transactions (batch ${b + 1}/${batches.length})...`,
        key: 'aicategorize',
        duration: 0
      });

      try {
        const response = await apiClient.post('/api/v2/cash-management/reconciliation/ai-categorize', {
          bank_account_id: selectedBankAccount,
          transactions: batch.map(t => ({
            id: t.id,
            description: t.description,
            amount: t.amount,
            type: t.type,
            date: t.date,
            reference: t.reference || ''
          }))
        });

        const data = response.data?.data || {};
        const suggestions = data.suggestions || [];
        lastProvider = data.ai_provider || lastProvider;

        suggestions.forEach((s: any) => {
          if (s.suggested_account_id) {
            accumulatedSuggestions.set(s.line_id, {
              accountId: s.suggested_account_id,
              accountCode: s.suggested_account_code,
              accountName: s.suggested_account_name,
              confidence: s.confidence,
              reason: s.reason,
              patternId: s.pattern_id || undefined,
              humanConfirmed: !!s.human_confirmed
            });
            totalCategorized++;
          }
        });

        // Update state incrementally so progress is visible batch-by-batch rather
        // than the UI sitting frozen until every batch finishes.
        const newSuggestionsSnapshot = new Map(accumulatedSuggestions);
        setAiSuggestions(newSuggestionsSnapshot);
        setBankTransactions(prev => prev.map(txn => {
          const suggestion = newSuggestionsSnapshot.get(txn.id);
          if (suggestion && (txn.status === 'unmatched' || txn.status === 'ai-suggested')) {
            return {
              ...txn,
              status: 'ai-suggested' as const,
              confidence: suggestion.confidence,
              aiSuggestion: `${suggestion.accountCode} - ${suggestion.accountName}: ${suggestion.reason}`,
              category: `${suggestion.accountCode} - ${suggestion.accountName}`
            };
          }
          return txn;
        }));
      } catch (batchError) {
        console.error(`AI categorize batch ${b + 1}/${batches.length} failed:`, batchError);
        failedBatches++;
        // Keep going - one bad batch shouldn't abort categorizing everything else
      }
    }

    setAiProvider(lastProvider);
    const providerEmoji = lastProvider === 'groq+claude' ? '🚀🧠 Groq + Claude' : lastProvider === 'groq' ? '🚀 Groq AI' : lastProvider === 'claude' ? '🧠 Claude' : (lastProvider === 'grok' ? '🤖 Grok' : '📋 Rules');

    if (totalCategorized > 0) {
      message.success({
        content: `✨ ${providerEmoji} categorized ${totalCategorized}/${unmatchedTxns.length} transactions${failedBatches > 0 ? ` (${failedBatches} batch(es) failed - retry to fill gaps)` : ''}! Review and allocate.`,
        key: 'aicategorize',
        duration: 6
      });
    } else {
      message.info({
        content: failedBatches > 0
          ? `AI categorization failed on all ${failedBatches} batch(es). Please try again.`
          : 'AI could not suggest categories. Please allocate manually.',
        key: 'aicategorize',
        duration: 5
      });
    }

    setIsAICategorizing(false);
  }, [selectedBankAccount, bankTransactions]);

  // Accept AI category suggestion and allocate to GL. Pass overrideAccount to
  // recategorize before accepting (used by the AI Suggestions review screen)
  // instead of always taking whatever the AI originally suggested.
  const acceptAICategorySuggestion = async (txnId: string, overrideAccount?: { id: string; code: string; name: string }) => {
    const suggestion = aiSuggestions.get(txnId);
    const txn = bankTransactions.find(t => t.id === txnId);
    const target = overrideAccount || (suggestion ? { id: suggestion.accountId, code: suggestion.accountCode, name: suggestion.accountName } : null);

    if (!target || !txn) {
      message.warning('No AI suggestion found for this transaction');
      return;
    }

    setAllocatingTxnId(txnId);
    message.loading({ content: 'Creating GL entry...', key: 'allocate-ai' });

    try {
      const response = await apiClient.post('/api/v2/cash-management/reconciliation/allocate', {
        statement_line_id: txn.id,
        gl_account_id: target.id,
        description: txn.description,
        bank_account_id: selectedBankAccount
      });

      if (response.data?.success) {
        setBankTransactions(prev => prev.map(t =>
          t.id === txnId
            ? {
                ...t,
                status: 'matched' as const,
                category: `${target.code} - ${target.name}`,
                matchedWith: [response.data?.data?.journal_entry_id],
                confidence: 100
              }
            : t
        ));

        // Every accept is a training signal, not just an allocation: accepting
        // the suggestion as-is reinforces the learned pattern that produced it;
        // overriding to a different account means that pattern's guess was
        // wrong here, so it should be pushed down even though the corrected
        // account still gets learned separately via the allocation itself.
        if (suggestion?.patternId) {
          const wasOverridden = !!overrideAccount && overrideAccount.id !== suggestion.accountId;
          apiClient.post('/api/v2/cash-management/reconciliation/ai-feedback', {
            pattern_id: suggestion.patternId,
            action: wasOverridden ? 'reject' : 'accept'
          }).catch(() => {}); // Non-critical
        }

        // Remove from suggestions
        setAiSuggestions(prev => {
          const newMap = new Map(prev);
          newMap.delete(txnId);
          return newMap;
        });

        message.success({
          content: `✅ Allocated to ${target.code} - ${target.name}`,
          key: 'allocate-ai',
          duration: 3
        });
      } else {
        message.error({ content: response.data?.error || 'Failed to create GL entry', key: 'allocate-ai' });
      }
    } catch (error: any) {
      console.error('Accept AI category error:', error);
      message.error({
        content: error.response?.data?.error || 'Failed to allocate to GL',
        key: 'allocate-ai'
      });
    }

    setAllocatingTxnId(null);
  };

  // Accept ALL high-confidence AI category suggestions. Requires both a very
  // high confidence score (97%+) AND that the underlying pattern has been
  // manually confirmed at least once before (humanConfirmed) - raw AI-provider
  // or first-time rule guesses never qualify, however confident, since a
  // confidence score alone already proved capable of being wrong.
  const acceptAllHighConfidenceSuggestions = async () => {
    const highConfidenceTxns = bankTransactions.filter(t => {
      const suggestion = aiSuggestions.get(t.id);
      return suggestion && suggestion.confidence >= 97 && suggestion.humanConfirmed && t.status === 'ai-suggested';
    });

    if (highConfidenceTxns.length === 0) {
      message.info('No suggestions meet the bar for bulk accept yet (97%+ confidence, previously-confirmed pattern)');
      return;
    }

    setIsAllocating(true);
    message.loading({ content: `Allocating ${highConfidenceTxns.length} transactions...`, key: 'allocate-all' });

    let successCount = 0;
    let failCount = 0;

    for (const txn of highConfidenceTxns) {
      const suggestion = aiSuggestions.get(txn.id);
      if (!suggestion) continue;

      try {
        const response = await apiClient.post('/api/v2/cash-management/reconciliation/allocate', {
          statement_line_id: txn.id,
          gl_account_id: suggestion.accountId,
          description: txn.description,
          bank_account_id: selectedBankAccount
        });

        if (response.data?.success) {
          // Update transaction status
          setBankTransactions(prev => prev.map(t =>
            t.id === txn.id
              ? { 
                  ...t, 
                  status: 'matched' as const, 
                  category: `${suggestion.accountCode} - ${suggestion.accountName}`,
                  confidence: 100
                }
              : t
          ));

          // Remove from suggestions
          setAiSuggestions(prev => {
            const newMap = new Map(prev);
            newMap.delete(txn.id);
            return newMap;
          });

          successCount++;
        } else {
          failCount++;
        }
      } catch (error) {
        failCount++;
        console.error(`Failed to allocate ${txn.id}:`, error);
      }
    }

    setIsAllocating(false);
    
    if (successCount > 0 && failCount === 0) {
      message.success({ content: `✅ Successfully allocated ${successCount} transactions!`, key: 'allocate-all', duration: 4 });
    } else if (successCount > 0 && failCount > 0) {
      message.warning({ content: `Allocated ${successCount} transactions, ${failCount} failed`, key: 'allocate-all', duration: 4 });
    } else {
      message.error({ content: `Failed to allocate transactions. Make sure GL accounts exist.`, key: 'allocate-all', duration: 4 });
    }
  };

  // Accept AI suggestion
  const acceptAISuggestion = (bankTxnId: string) => {
    const aiMatch = aiMatches.find(m => m.bankTxnId === bankTxnId);
    if (!aiMatch) return;

    setBankTransactions(prev => prev.map(txn => 
      txn.id === bankTxnId 
        ? { ...txn, status: 'matched' as const, matchedWith: [aiMatch.bookEntryId], confidence: 100 }
        : txn
    ));

    setBookEntries(prev => prev.map(entry =>
      entry.id === aiMatch.bookEntryId
        ? { ...entry, status: 'matched' as const, matchedWith: bankTxnId }
        : entry
    ));

    message.success('Match confirmed!');
  };

  // Reject AI suggestion - sends negative feedback to improve learning
  const rejectAISuggestion = (bankTxnId: string) => {
    // Send rejection feedback to server for AI learning (non-blocking)
    const suggestion = aiSuggestions.get(bankTxnId);
    if (suggestion?.patternId) {
      apiClient.post('/api/v2/cash-management/reconciliation/ai-feedback', {
        pattern_id: suggestion.patternId,
        action: 'reject'
      }).catch(() => {}); // Non-critical
    }

    setBankTransactions(prev => prev.map(txn =>
      txn.id === bankTxnId
        ? { ...txn, status: 'unmatched' as const, confidence: undefined, aiSuggestion: undefined }
        : txn
    ));
    setAiSuggestions(prev => {
      const newMap = new Map(prev);
      newMap.delete(bankTxnId);
      return newMap;
    });
    message.info('Suggestion rejected — AI will learn from this');
  };

  // Post to GL - creates journal entries for matched/unmatched transactions
  const [isPostingToGL, setIsPostingToGL] = useState(false);
  
  const postToGL = async () => {
    if (!selectedBankAccount) {
      message.warning('Please select a bank account first');
      return;
    }

    // Get all unmatched transactions (those not yet posted to GL)
    const unmatchedTxns = bankTransactions.filter(t => t.status === 'unmatched' || t.status === 'matched');
    const transactionIds = unmatchedTxns.map(t => t.id);

    if (transactionIds.length === 0) {
      message.info('No transactions to post');
      return;
    }

    setIsPostingToGL(true);
    message.loading({ content: 'Posting transactions to General Ledger...', key: 'postgl' });

    try {
      const response = await apiClient.post('/api/v2/cash-management/reconciliation/post-to-gl', {
        statement_line_ids: transactionIds,
        bank_account_id: selectedBankAccount
      });

      const result = response.data;
      if (result.success) {
        // Update local state to mark as posted
        setBankTransactions(prev => prev.map(txn => 
          transactionIds.includes(txn.id)
            ? { ...txn, status: 'reconciled' as const }
            : txn
        ));
        
        message.success({ 
          content: `✅ ${result.data?.posted_count || transactionIds.length} transactions posted to GL!`, 
          key: 'postgl', 
          duration: 4 
        });
      } else {
        message.error({ content: result.error || 'Failed to post to GL', key: 'postgl' });
      }
    } catch (error: any) {
      console.error('Post to GL error:', error);
      message.error({ 
        content: error.response?.data?.error || 'Failed to post transactions to GL', 
        key: 'postgl' 
      });
    }

    setIsPostingToGL(false);
  };

  // Manual match
  const handleManualMatch = (bankTxn: BankTransaction) => {
    setSelectedBankTxn(bankTxn);
    setSelectedBookEntries([]);
    setShowMatchModal(true);
  };

  const confirmManualMatch = () => {
    if (!selectedBankTxn || selectedBookEntries.length === 0) {
      message.warning('Please select at least one book entry to match');
      return;
    }

    setBankTransactions(prev => prev.map(txn =>
      txn.id === selectedBankTxn.id
        ? { ...txn, status: 'matched' as const, matchedWith: selectedBookEntries, confidence: 100 }
        : txn
    ));

    setBookEntries(prev => prev.map(entry =>
      selectedBookEntries.includes(entry.id)
        ? { ...entry, status: 'matched' as const, matchedWith: selectedBankTxn.id }
        : entry
    ));

    setShowMatchModal(false);
    setSelectedBankTxn(null);
    setSelectedBookEntries([]);
    message.success('Transactions matched successfully!');
  };

  // Unmatch / Unreconcile - persists to database
  const handleUnmatch = async (bankTxnId: string) => {
    const txn = bankTransactions.find(t => t.id === bankTxnId);
    
    try {
      // Update the DB - set status back to unmatched and clear allocation fields
      await apiClient.patch(`/api/v2/cash-management/statement-lines/${bankTxnId}`, {
        status: 'unmatched',
        matched_transaction_id: null,
        category: null
      });

      // Update local state
      setBankTransactions(prev => prev.map(t =>
        t.id === bankTxnId
          ? { ...t, status: 'unmatched' as const, matchedWith: undefined, confidence: undefined, category: '', suggestedGlAccountName: undefined }
          : t
      ));

      if (txn?.matchedWith) {
        setBookEntries(prev => prev.map(entry =>
          txn.matchedWith?.includes(entry.id)
            ? { ...entry, status: 'unmatched' as const, matchedWith: undefined }
            : entry
        ));
      }

      message.success('Transaction unreconciled and moved back to Reconcile tab');
    } catch (error: any) {
      console.error('Unmatch error:', error);
      message.error('Failed to unreconcile. Please try again.');
    }
  };

  // Allocate transaction directly to GL account (for transactions without matching invoices)
  const openAllocateModal = (txn: BankTransaction) => {
    setAllocatingTxn(txn);
    setSelectedGLAccount('');
    setAllocateDescription(txn.description);
    setShowAllocateModal(true);
  };

  // Refresh all data
  const handleRefreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Re-fetch bank accounts
      const accountsRes = await apiClient.get('/api/v2/cash-management/bank-accounts').catch(() => ({ data: { data: [] } }));
      const accounts = accountsRes.data?.data || [];
      if (accounts.length > 0) {
        setBankAccounts(accounts.map((acc: any) => ({
          id: acc.id,
          name: acc.account_name || 'Bank Account',
          balance: parseFloat(acc.current_balance) || 0,
          number: acc.account_number ? acc.account_number.replace(/\d(?=\d{4})/g, 'X') : 'XXXXXXXX',
          currency: acc.currency || 'ZAR',
          gl_account_code: acc.gl_account_code || '',
          gl_book_balance: acc.gl_book_balance
        })));
      }

      // Re-fetch statement lines for whichever account is currently selected
      if (selectedBankAccount) await loadStatementLines(selectedBankAccount);

      message.success('Data refreshed');
    } catch (err) {
      console.error('Refresh error:', err);
      message.error('Failed to refresh data');
    } finally {
      setIsLoading(false);
    }
  }, [selectedBankAccount, loadStatementLines]);

  const handleAllocateToGL = async () => {
    if (!allocatingTxn || !selectedGLAccount) {
      message.warning('Please select a GL account');
      return;
    }

    setIsAllocating(true);
    message.loading({ content: 'Creating GL entry...', key: 'allocate' });

    const selectedAccount = glAccounts.find(a => a.id === selectedGLAccount);

    try {
      // Use the dedicated allocation endpoint - it handles double-entry bookkeeping
      const response = await apiClient.post('/api/v2/cash-management/reconciliation/allocate', {
        statement_line_id: allocatingTxn.id,
        gl_account_id: selectedGLAccount,
        description: allocateDescription || allocatingTxn.description,
        bank_account_id: selectedBankAccount
      });

      if (response.data?.success) {
        // Update local state - mark as allocated
        setBankTransactions(prev => prev.map(txn =>
          txn.id === allocatingTxn.id
            ? { 
                ...txn, 
                status: 'matched' as const, 
                category: `${selectedAccount?.code} - ${selectedAccount?.name}`,
                matchedWith: [response.data?.data?.journal_entry_id]
              }
            : txn
        ));

        message.success({ 
          content: `✅ Allocated to ${selectedAccount?.code} - ${selectedAccount?.name}`, 
          key: 'allocate', 
          duration: 3 
        });

        setShowAllocateModal(false);
        setAllocatingTxn(null);
        setSelectedGLAccount('');
        setAllocateDescription('');
        
        // Refresh AI learning stats (learning happens server-side on allocate)
        fetchAIStats();
      } else {
        message.error({ content: response.data?.error || 'Failed to create GL entry', key: 'allocate' });
      }
    } catch (error: any) {
      console.error('Allocate to GL error:', error);
      message.error({ 
        content: error.response?.data?.error || 'Failed to allocate to GL', 
        key: 'allocate' 
      });
    }

    setIsAllocating(false);
  };

  // Parse CSV content
  const parseCSVContent = (content: string): { headers: string[], rows: string[][] } => {
    const lines = content.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const rows = lines.slice(1).map(line => {
      // Handle quoted values with commas inside
      const values: string[] = [];
      let current = '';
      let inQuotes = false;
      for (const char of line) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim().replace(/^"|"$/g, ''));
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim().replace(/^"|"$/g, ''));
      return values;
    });
    return { headers, rows };
  };

  // Column mapping modal state
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [csvData, setCsvData] = useState<{ headers: string[], rows: string[][] } | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [columnMapping, setColumnMapping] = useState<{
    date: string;
    description: string;
    reference: string;
    debit: string;
    credit: string;
    amount: string;
    balance: string;
  }>({ date: '', description: '', reference: '', debit: '', credit: '', amount: '', balance: '' });

  // Import statement handling - now actually parses CSV
  const handleImportStatement = async (file: File) => {
    setIsProcessingImport(true);
    message.loading({ content: 'Reading file...', key: 'import' });

    try {
      const content = await file.text();
      const parsed = parseCSVContent(content);
      
      if (parsed.headers.length === 0 || parsed.rows.length === 0) {
        message.error({ content: 'Invalid CSV file - no data found', key: 'import' });
        setIsProcessingImport(false);
        return;
      }

      // Auto-detect column mapping
      const headerLower = parsed.headers.map(h => h.toLowerCase());
      const autoMapping = {
        date: parsed.headers.find((h, i) => headerLower[i].includes('date')) || '',
        description: parsed.headers.find((h, i) => headerLower[i].includes('description') || headerLower[i].includes('narrative')) || '',
        reference: parsed.headers.find((h, i) => headerLower[i].includes('reference') || headerLower[i].includes('ref')) || '',
        debit: parsed.headers.find((h, i) => headerLower[i].includes('debit') || headerLower[i] === 'dr') || '',
        credit: parsed.headers.find((h, i) => headerLower[i].includes('credit') || headerLower[i] === 'cr') || '',
        amount: parsed.headers.find((h, i) => headerLower[i].includes('amount') && !headerLower[i].includes('balance')) || '',
        balance: parsed.headers.find((h, i) => headerLower[i].includes('balance')) || '',
      };

      setCsvData(parsed);
      setPendingFile(file);
      setColumnMapping(autoMapping);
      setShowMappingModal(true);
      setIsProcessingImport(false);
      message.destroy('import');
    } catch (error) {
      console.error('Error reading CSV:', error);
      message.error({ content: 'Failed to read file', key: 'import' });
      setIsProcessingImport(false);
    }
  };

  // Process import after column mapping
  const processImportWithMapping = async () => {
    if (!csvData || !selectedBankAccount) {
      message.error('Please select a bank account first');
      return;
    }

    setIsProcessingImport(true);
    message.loading({ content: 'Importing transactions...', key: 'import' });

    // Parse various date formats to YYYY-MM-DD
    const parseDate = (dateStr: string): string => {
      if (!dateStr) return new Date().toISOString().split('T')[0];
      
      const cleaned = dateStr.trim();
      
      // YYYYMMDD format (Standard Bank) - e.g., 20250811
      if (/^\d{8}$/.test(cleaned)) {
        return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}-${cleaned.slice(6, 8)}`;
      }
      
      // DD/MM/YYYY or DD-MM-YYYY
      const dmyMatch = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
      if (dmyMatch) {
        return `${dmyMatch[3]}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[1].padStart(2, '0')}`;
      }
      
      // YYYY/MM/DD or YYYY-MM-DD
      const ymdMatch = cleaned.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
      if (ymdMatch) {
        return `${ymdMatch[1]}-${ymdMatch[2].padStart(2, '0')}-${ymdMatch[3].padStart(2, '0')}`;
      }
      
      // MM/DD/YYYY (US format)
      const mdyMatch = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
      if (mdyMatch) {
        // Assume DD/MM/YYYY for South African banks
        return `${mdyMatch[3]}-${mdyMatch[2].padStart(2, '0')}-${mdyMatch[1].padStart(2, '0')}`;
      }
      
      // Try native Date parsing as fallback
      const parsed = new Date(cleaned);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
      }
      
      // Return as-is if we can't parse it
      return cleaned;
    };

    try {
      // Convert CSV rows to transactions
      const transactions: BankTransaction[] = [];
      const { headers, rows } = csvData;
      
      const dateIdx = headers.indexOf(columnMapping.date);
      const descIdx = headers.indexOf(columnMapping.description);
      const refIdx = headers.indexOf(columnMapping.reference);
      const debitIdx = headers.indexOf(columnMapping.debit);
      const creditIdx = headers.indexOf(columnMapping.credit);
      const amountIdx = headers.indexOf(columnMapping.amount);

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (row.length < 2) continue; // Skip empty rows

        let amount = 0;
        let type: 'credit' | 'debit' = 'credit';

        // Parse amount - handle debit/credit columns or single amount column
        if (debitIdx >= 0 && creditIdx >= 0) {
          const debitVal = parseFloat(row[debitIdx]?.replace(/[^\d.-]/g, '') || '0');
          const creditVal = parseFloat(row[creditIdx]?.replace(/[^\d.-]/g, '') || '0');
          if (debitVal > 0) {
            amount = debitVal;
            type = 'debit';
          } else if (creditVal > 0) {
            amount = creditVal;
            type = 'credit';
          }
        } else if (amountIdx >= 0) {
          const amountVal = parseFloat(row[amountIdx]?.replace(/[^\d.-]/g, '') || '0');
          amount = Math.abs(amountVal);
          type = amountVal < 0 ? 'debit' : 'credit';
        }

        if (amount === 0) continue; // Skip zero amount rows

        // Parse the date properly
        const rawDate = dateIdx >= 0 ? row[dateIdx] : '';
        const parsedDate = parseDate(rawDate);

        const txn: BankTransaction = {
          id: `IMP-${Date.now()}-${i}`,
          date: parsedDate,
          description: row[descIdx] || 'No description',
          reference: refIdx >= 0 ? row[refIdx] || '' : '',
          amount,
          type,
          status: 'unmatched',
          category: ''
        };
        transactions.push(txn);
      }

      if (transactions.length === 0) {
        message.error({ content: 'No valid transactions found in file', key: 'import' });
        setIsProcessingImport(false);
        return;
      }

      // Call API to save statement
      const statementData = {
        bank_account_id: selectedBankAccount,
        statement_date: new Date().toISOString().split('T')[0],
        start_date: transactions[0]?.date,
        end_date: transactions[transactions.length - 1]?.date,
        opening_balance: 0,
        closing_balance: 0,
        transaction_count: transactions.length,
        status: 'imported'
      };

      // Create statement (optional - transactions can be saved without it)
      const stmtResponse = await apiClient.post('/api/v2/cash-management/statements', statementData).catch((err) => {
        console.warn('Statement creation failed, saving transactions without statement:', err);
        return null;
      });
      const statementId = stmtResponse?.data?.data?.id || null;

      // Save statement lines to API and get real UUIDs back - ALWAYS save even without statementId
      const savedTransactions: BankTransaction[] = [];
      for (const txn of transactions) {
        try {
          const lineResponse = await apiClient.post('/api/v2/cash-management/statement-lines', {
            statement_id: statementId, // Can be null - backend handles this
            bank_account_id: selectedBankAccount,
            transaction_date: txn.date,
            description: txn.description,
            reference: txn.reference,
            amount: txn.type === 'debit' ? -txn.amount : txn.amount,
            transaction_type: txn.type,
            status: 'unmatched'
          });
          // Use the real UUID from database instead of temp ID
          const savedId = lineResponse?.data?.data?.id || lineResponse?.data?.id;
          if (savedId) {
            savedTransactions.push({
              ...txn,
              id: savedId
            });
          } else {
            console.warn('No ID returned for transaction, using temp:', txn.id);
            savedTransactions.push(txn);
          }
        } catch (err) {
          console.error('Error saving line:', err);
          savedTransactions.push(txn); // Keep original if save fails
        }
      }

      // Update local state with real database UUIDs
      setBankTransactions(prev => [...prev, ...savedTransactions]);
      setShowMappingModal(false);
      setShowImportDrawer(false);
      setCsvData(null);
      setPendingFile(null);
      setIsProcessingImport(false);
      
      message.success({ 
        content: `✅ Successfully imported ${transactions.length} transactions from ${pendingFile?.name}`, 
        key: 'import', 
        duration: 5 
      });
    } catch (error) {
      console.error('Import error:', error);
      message.error({ content: 'Failed to import transactions', key: 'import' });
      setIsProcessingImport(false);
    }
  };

  // Status tag renderer
  const getStatusTag = (status: string, confidence?: number) => {
    switch (status) {
      case 'matched':
        return <Tag color="green" icon={<CheckCircleOutlined />}>Matched</Tag>;
      case 'ai-suggested':
        return (
          <Tooltip title={`AI Confidence: ${confidence}%`}>
            <Tag color="purple" icon={<RobotOutlined />}>AI Match ({confidence}%)</Tag>
          </Tooltip>
        );
      case 'partial':
        return <Tag color="orange" icon={<WarningOutlined />}>Partial</Tag>;
      case 'excluded':
        return <Tag color="default" icon={<CloseCircleOutlined />}>Excluded</Tag>;
      default:
        return <Tooltip title="This transaction hasn't been linked to a GL account yet. Use AI Categorize or Allocate to assign it."><Tag color="blue" icon={<ClockCircleOutlined />}>Unmatched</Tag></Tooltip>;
    }
  };

  // Source badge
  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'ap': return <Tag color="red">AP</Tag>;
      case 'ar': return <Tag color="green">AR</Tag>;
      case 'gl': return <Tag color="blue">GL</Tag>;
      default: return <Tag>Manual</Tag>;
    }
  };

  // Bank transactions columns
  const bankTxnColumns: ColumnsType<BankTransaction> = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      width: 100,
      sorter: (a, b) => a.date.localeCompare(b.date),
      render: (date) => {
        try {
          const d = new Date(date);
          return <Text style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{d.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>;
        } catch {
          return <Text style={{ fontSize: 12 }}>{date}</Text>;
        }
      }
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: false,
      render: (text, record) => (
        <div style={{ minWidth: 200, lineHeight: 1.5 }}>
          <div><Text strong style={{ fontSize: 13 }}>{text}</Text></div>
          {record.reference && (
            <div><Text type="secondary" style={{ fontSize: 11 }}>Ref: {record.reference}</Text></div>
          )}
          {record.aiSuggestion && record.status === 'ai-suggested' && (
            <div style={{ marginTop: 2, padding: '2px 6px', background: '#f9f0ff', borderRadius: 4, border: '1px solid #d3adf7' }}>
              <Text style={{ fontSize: 11, color: '#722ed1' }}>
                <RobotOutlined /> AI suggests: {record.aiSuggestion}
              </Text>
            </div>
          )}
          {record.suggestedGlAccountName && record.status !== 'ai-suggested' && (
            <div style={{ marginTop: 2 }}>
              <Tag color="purple" style={{ fontSize: 10 }}>🧠 {record.suggestedGlAccountName}</Tag>
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      align: 'right',
      sorter: (a, b) => a.amount - b.amount,
      render: (amount, record) => (
        <Text strong style={{ color: record.type === 'credit' ? '#10b981' : '#ef4444', fontSize: 13, whiteSpace: 'nowrap' }}>
          {record.type === 'credit' ? '+' : '-'} R {amount.toLocaleString()}
        </Text>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      filters: [
        { text: 'Unmatched', value: 'unmatched' },
        { text: 'AI Suggested', value: 'ai-suggested' },
        { text: 'Matched', value: 'matched' },
        { text: 'Excluded', value: 'excluded' },
      ],
      onFilter: (value, record) => record.status === value,
      render: (status, record) => getStatusTag(status, record.confidence)
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 140,
      render: (_, record) => (
        <Space size={4}>
          {record.status === 'ai-suggested' && aiSuggestions.has(record.id) && (
            <>
              <Tooltip title={`Accept: ${aiSuggestions.get(record.id)?.accountCode} - ${aiSuggestions.get(record.id)?.accountName}`}>
                <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => acceptAICategorySuggestion(record.id)} loading={allocatingTxnId === record.id} style={{ fontSize: 11 }} />
              </Tooltip>
              <Tooltip title="Reject">
                <Button size="small" icon={<CloseCircleOutlined />} onClick={() => rejectAISuggestion(record.id)} style={{ fontSize: 11 }} />
              </Tooltip>
            </>
          )}
          {record.status === 'ai-suggested' && !aiSuggestions.has(record.id) && (
            <>
              <Tooltip title="Accept AI Match">
                <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => acceptAISuggestion(record.id)} style={{ fontSize: 11 }} />
              </Tooltip>
              <Tooltip title="Reject">
                <Button size="small" icon={<CloseCircleOutlined />} onClick={() => rejectAISuggestion(record.id)} style={{ fontSize: 11 }} />
              </Tooltip>
            </>
          )}
          {record.status === 'unmatched' && (
            <>
              <Tooltip title="Match to invoice/entry">
                <Button size="small" type="primary" icon={<LinkOutlined />} onClick={() => handleManualMatch(record)} />
              </Tooltip>
              <Tooltip title="Allocate to GL">
                <Button size="small" icon={<DollarOutlined />} onClick={() => openAllocateModal(record)} style={{ borderColor: '#52c41a', color: '#52c41a' }} />
              </Tooltip>
            </>
          )}
          {record.status === 'matched' && (
            <Popconfirm title="Unmatch?" onConfirm={() => handleUnmatch(record.id)} placement="left">
              <Tooltip title="Unmatch">
                <Button size="small" icon={<DisconnectOutlined />} danger />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      )
    }
  ];

  // Book entries columns
  const bookEntriesColumns: ColumnsType<BookEntry> = [
    {
      title: 'Source',
      dataIndex: 'source',
      key: 'source',
      width: 60,
      render: (source) => getSourceBadge(source)
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      width: 90
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (text, record) => (
        <div>
          <Text style={{ fontSize: 13 }}>{text}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 11 }}>{record.vendorClient || record.account}</Text>
        </div>
      )
    },
    {
      title: 'Reference',
      dataIndex: 'reference',
      key: 'reference',
      width: 110,
      render: (ref) => <Text code style={{ fontSize: 11 }}>{ref}</Text>
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      width: 110,
      align: 'right',
      render: (amount, record) => (
        <Text strong style={{ color: record.type === 'credit' ? '#10b981' : '#ef4444', fontSize: 13 }}>
          R {amount.toLocaleString()}
        </Text>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => getStatusTag(status)
    }
  ];

  // Show loading spinner while fetching data
  if (isLoading) {
    return (
      <HubLayout>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
          <Spin size="large" tip="Loading reconciliation data..." />
        </div>
      </HubLayout>
    );
  }

  // Show empty state if no bank accounts
  if (bankAccounts.length === 0) {
    return (
      <HubLayout>
        <HubHeader
          title="Bank Reconciliation"
          subtitle="AI-powered matching with AP/AR integration"
          icon={<BankOutlined />}
          gradient="blue"
        />
        <Card style={{ marginTop: 24 }}>
          <Result
            icon={<BankOutlined style={{ color: '#667eea' }} />}
            title="No Bank Accounts Found"
            subTitle="Add a bank account first to start reconciling your transactions."
            extra={
              <Button type="primary" icon={<PlusOutlined />} onClick={() => message.info('Go to Banking Hub → Connect Account → Add Bank Account')}>
                Add Bank Account
              </Button>
            }
          />
        </Card>
      </HubLayout>
    );
  }

  const currentSelectedAccount = bankAccounts.find(a => a.id === selectedBankAccount);

  return (
    <HubLayout>
      {/* Hub Header */}
      <HubHeader
        title="Bank Reconciliation"
        subtitle="AI-powered matching with learning engine"
        icon={<BankOutlined />}
        gradient="blue"
        actions={
          <Space>
            <Tooltip title={aiLearningStats.total_patterns > 0 
              ? `AI has learned ${aiLearningStats.total_allocations} allocation patterns across ${aiLearningStats.total_patterns} rules (${aiLearningStats.accuracy}% accuracy)` 
              : 'AI learning engine active — allocate transactions to teach it your patterns'}>
              <Tag color={aiLearningStats.total_patterns > 0 ? 'purple' : 'blue'} style={{ cursor: 'help', marginRight: 0 }}>
                🧠 {aiLearningStats.total_patterns > 0 
                  ? `${aiLearningStats.total_allocations} learned · ${aiLearningStats.accuracy}%` 
                  : 'AI Learning'}
              </Tag>
            </Tooltip>
            <Button size="small" icon={<UploadOutlined />} onClick={() => setShowImportDrawer(true)}>
              Import
            </Button>
            <Tooltip title="Match bank transactions to existing invoices (AP/AR)">
              <Button 
                size="small"
                icon={isAutoMatching ? <LoadingOutlined /> : <RobotOutlined />}
                onClick={runAIAutoMatch}
                loading={isAutoMatching}
              >
                AI Match
              </Button>
            </Tooltip>
            <Tooltip title="AI suggests GL accounts for direct allocation (powered by Groq)">
              <Button 
                size="small"
                type="primary" 
                icon={isAICategorizing ? <LoadingOutlined /> : <BulbOutlined />}
                onClick={runAICategorize}
                loading={isAICategorizing}
                style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
              >
                AI Categorize
              </Button>
            </Tooltip>
          </Space>
        }
      />

      {/* Status Banner */}
      <StatusBanner
        gradient="blue"
        icon={<SafetyCertificateOutlined />}
        title="Reconciliation Status"
        subtitle={currentSelectedAccount?.name || 'Select Account'}
        stats={[
          { title: 'Bank Balance', value: `R ${stats.bankBalance.toLocaleString()}`, prefix: <BankOutlined /> },
          {
            // gl_account_code is the raw code stored on the bank account - for
            // Xero-synced accounts that's the Xero account UUID (no short code
            // exists), so showing it directly reads as garbage data. Only show
            // it when it's actually a short, human-readable code.
            title: (hasGLLink && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test((selectedAccount as any).gl_account_code || ''))
              ? `Book Balance (GL: ${(selectedAccount as any).gl_account_code})`
              : 'Book Balance',
            value: `R ${stats.bookBalance.toLocaleString()}`,
            prefix: <FileTextOutlined />
          },
          { title: 'Difference', value: `R ${stats.difference.toLocaleString()}`, prefix: <SwapOutlined /> },
          { title: 'Match Rate', value: `${stats.matchRate}%`, prefix: <CheckCircleOutlined /> },
        ]}
      />

      {/* Account Selector and Filters */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <Space size="large" wrap>
              <Select
                value={selectedBankAccount}
                onChange={setSelectedBankAccount}
                style={{ width: 280 }}
                size="large"
              >
                {bankAccounts.map(acc => (
                  <Select.Option key={acc.id} value={acc.id}>
                    <Space>
                      <BankOutlined />
                      <div>
                        <div style={{ fontWeight: 500 }}>{acc.name}</div>
                        <Text type="secondary" style={{ fontSize: 11 }}>{acc.number} • {acc.currency}</Text>
                      </div>
                    </Space>
                  </Select.Option>
                ))}
              </Select>
              <RangePicker size="large" />
              <Select placeholder="Filter Status" style={{ width: 150 }} allowClear>
                <Select.Option value="unmatched">Unmatched</Select.Option>
                <Select.Option value="ai-suggested">AI Suggested</Select.Option>
                <Select.Option value="matched">Matched</Select.Option>
                <Select.Option value="excluded">Excluded</Select.Option>
              </Select>
            </Space>
          </Col>
          <Col>
            <Space>
              <Button icon={<SyncOutlined spin={isLoading} />} onClick={handleRefreshData} loading={isLoading}>Refresh</Button>
              <Button icon={<DownloadOutlined />} onClick={() => {
                const csvRows = ['Date,Description,Reference,Amount,Type,Status,Category'];
                bankTransactions.forEach(t => {
                  csvRows.push(`"${t.date}","${t.description}","${t.reference}","${t.amount}","${t.type}","${t.status}","${t.category || ''}"`);
                });
                const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `reconciliation-export-${new Date().toISOString().split('T')[0]}.csv`;
                a.click();
                URL.revokeObjectURL(url);
                message.success('Reconciliation data exported');
              }}>Export</Button>
              <Button 
                type="primary" 
                icon={isPostingToGL ? <LoadingOutlined /> : <CheckCircleOutlined />}
                onClick={postToGL}
                loading={isPostingToGL}
                disabled={bankTransactions.filter(t => t.status === 'unmatched' || t.status === 'matched').length === 0}
              >
                Post to GL
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* AI Insights Alert */}
      {stats.aiSuggestedCount > 0 && (
        <Alert
          message={
            <Space>
              <RobotOutlined />
              <Text strong>AI found {stats.aiSuggestedCount} potential matches</Text>
            </Space>
          }
          description={`${stats.aiSuggestedCount} transactions have been analyzed and suggestions are ready for review. Click 'Accept All' to allocate previously-confirmed, near-certain matches (97%+) or review individually.`}
          type="info"
          showIcon={false}
          style={{ marginBottom: 16, background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)', border: '1px solid rgba(102, 126, 234, 0.3)' }}
          action={
            <Space>
              <Button 
                type="primary" 
                size="small" 
                onClick={acceptAllHighConfidenceSuggestions} 
                icon={<ThunderboltOutlined />}
                loading={isAllocating}
              >
                Accept All (confirmed, 97%+)
              </Button>
            </Space>
          }
        />
      )}

      {/* Stats Cards */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Matched"
              value={stats.matchedCount}
              valueStyle={{ color: '#10b981' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="AI Suggested"
              value={stats.aiSuggestedCount}
              valueStyle={{ color: '#722ed1' }}
              prefix={<RobotOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Unmatched"
              value={stats.unmatchedCount}
              valueStyle={{ color: '#3b82f6' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <div style={{ marginBottom: 8 }}>
              <Text type="secondary">Progress</Text>
            </div>
            <Progress
              percent={stats.matchRate}
              strokeColor={{ '0%': '#667eea', '100%': '#10b981' }}
              format={(p) => <Text strong>{p}%</Text>}
            />
          </Card>
        </Col>
      </Row>

      {/* Main Reconciliation Tabs */}
      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <Tabs.TabPane tab={<span><SwapOutlined /> Reconcile <Badge count={bankTransactions.filter(t => t.status !== 'matched' && t.status !== 'reconciled').length} style={{ backgroundColor: '#3b82f6', marginLeft: 4 }} /></span>} key="reconcile">
            {/* AI Guidance - show when there are unmatched transactions */}
            {bankTransactions.filter(t => t.status === 'unmatched').length > 0 && aiSuggestions.size === 0 && (
              <Alert
                message={<span><RobotOutlined /> <strong>AI can help!</strong> Click "AI Categorize" above to let AI suggest GL accounts for your {bankTransactions.filter(t => t.status === 'unmatched').length} unmatched transactions.</span>}
                type="info"
                showIcon={false}
                banner
                style={{ marginBottom: 12, borderRadius: 8, background: 'linear-gradient(135deg, #f0f5ff 0%, #f9f0ff 100%)', border: '1px solid #d3adf7' }}
                action={
                  <Button 
                    size="small" 
                    type="primary"
                    icon={<BulbOutlined />}
                    onClick={runAICategorize}
                    loading={isAICategorizing}
                    style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
                  >
                    Run AI Categorize
                  </Button>
                }
              />
            )}

            {/* Full-width Bank Transactions Table */}
            <Card
              title={
                <Space>
                  <BankOutlined style={{ color: '#3b82f6' }} />
                  <span>Bank Transactions</span>
                  <Badge count={stats.unmatchedCount + stats.aiSuggestedCount} style={{ backgroundColor: '#3b82f6' }} />
                </Space>
              }
              size="small"
              extra={
                <Space>
                  <Input placeholder="Search transactions..." prefix={<SearchOutlined />} style={{ width: 220 }} allowClear />
                  {bookEntries.length > 0 && (
                    <Tag color="geekblue">{bookEntries.filter(e => e.status !== 'matched').length} AP/AR entries available</Tag>
                  )}
                </Space>
              }
            >
              <Table
                dataSource={bankTransactions.filter(t => t.status !== 'matched' && t.status !== 'reconciled')}
                columns={bankTxnColumns}
                rowKey="id"
                size="small"
                pagination={{ pageSize: 15, showSizeChanger: true, pageSizeOptions: ['10', '15', '25', '50'], showTotal: (total) => `${total} transactions` }}
                scroll={{ x: 600 }}
                locale={{ emptyText: <Result icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />} title="All Matched!" subTitle="All bank transactions have been reconciled. Check History tab for details." /> }}
                rowClassName={(record) =>
                  record.status === 'ai-suggested' ? 'ai-suggested-row' :
                  record.status === 'excluded' ? 'excluded-row' : ''
                }
              />
            </Card>

          </Tabs.TabPane>

          <Tabs.TabPane
            tab={<span><RobotOutlined /> AI Suggestions <Badge count={bankTransactions.filter(t => t.status === 'ai-suggested').length} style={{ backgroundColor: '#8b5cf6', marginLeft: 4 }} /></span>}
            key="ai-suggestions"
          >
            {(() => {
              const pending = bankTransactions
                .filter(t => t.status === 'ai-suggested' && aiSuggestions.has(t.id))
                .sort((a, b) => (aiSuggestions.get(b.id)?.confidence || 0) - (aiSuggestions.get(a.id)?.confidence || 0));

              if (pending.length === 0) {
                return (
                  <Result
                    icon={<RobotOutlined style={{ color: '#8b5cf6' }} />}
                    title="No AI suggestions waiting for review"
                    subTitle='Run "AI Categorize" from the Reconcile tab to get suggestions for your unmatched transactions.'
                  />
                );
              }

              const confidenceColor = (c: number) => c >= 90 ? '#10b981' : c >= 70 ? '#3b82f6' : '#f59e0b';

              return (
                <>
                  <Alert
                    style={{ marginBottom: 16, borderRadius: 8 }}
                    type="info"
                    showIcon
                    message={
                      <Space wrap>
                        <span><strong>{pending.length}</strong> suggestion{pending.length === 1 ? '' : 's'} waiting for review</span>
                        <Button
                          size="small"
                          type="primary"
                          icon={<ThunderboltOutlined />}
                          onClick={acceptAllHighConfidenceSuggestions}
                          loading={isAllocating}
                        >
                          Accept All (confirmed, 97%+)
                        </Button>
                      </Space>
                    }
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {pending.map(txn => {
                      const suggestion = aiSuggestions.get(txn.id)!;
                      const overrideId = suggestionOverrides.get(txn.id);
                      const selectedAccount = overrideId
                        ? glAccounts.find(a => a.id === overrideId)
                        : { id: suggestion.accountId, code: suggestion.accountCode, name: suggestion.accountName };

                      return (
                        <Card key={txn.id} size="small" style={{ borderRadius: 10, borderLeft: `4px solid ${confidenceColor(suggestion.confidence)}` }}>
                          <Row gutter={16} align="middle">
                            <Col flex="1 1 260px">
                              <Text strong>{txn.description}</Text>
                              <br />
                              <Space size={12}>
                                <Text type="secondary" style={{ fontSize: 12 }}>{(() => { try { return new Date(txn.date).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return txn.date; } })()}</Text>
                                {txn.reference && <Text type="secondary" style={{ fontSize: 12 }}>Ref: {txn.reference}</Text>}
                                <Text strong style={{ color: txn.type === 'credit' ? '#10b981' : '#ef4444' }}>
                                  {txn.type === 'credit' ? '+' : '-'} R {txn.amount.toLocaleString()}
                                </Text>
                              </Space>
                            </Col>
                            <Col flex="0 0 130px">
                              <Tag color={confidenceColor(suggestion.confidence)} style={{ margin: 0 }}>
                                {suggestion.confidence}% confident
                              </Tag>
                              {suggestion.confidence >= 97 && suggestion.humanConfirmed && (
                                <Tag color="purple" style={{ margin: '4px 0 0' }}>Auto-eligible</Tag>
                              )}
                            </Col>
                            <Col flex="1 1 260px">
                              <Select
                                value={selectedAccount?.id}
                                style={{ width: '100%' }}
                                showSearch
                                optionFilterProp="label"
                                filterOption={(input, option) => (option?.label as string)?.toLowerCase().includes(input.toLowerCase())}
                                onChange={(val) => setSuggestionOverrides(prev => new Map(prev).set(txn.id, val))}
                                options={glAccounts.map(a => ({ value: a.id, label: `${a.code} - ${a.name}` }))}
                                dropdownRender={(menu) => (
                                  <>
                                    {menu}
                                    <Divider style={{ margin: '4px 0' }} />
                                    <Button
                                      type="text"
                                      block
                                      icon={<PlusOutlined />}
                                      onMouseDown={(e) => e.preventDefault()} // keep dropdown open through the click
                                      onClick={() => {
                                        setCreateAcctName(txn.description.slice(0, 100));
                                        setShowCreateAccountForTxn(txn.id);
                                      }}
                                    >
                                      Create new account
                                    </Button>
                                  </>
                                )}
                              />
                              <Text type="secondary" style={{ fontSize: 11 }}>{suggestion.reason}</Text>
                            </Col>
                            <Col flex="0 0 auto">
                              <Space>
                                <Tooltip title="Accept and post to GL">
                                  <Button
                                    type="primary"
                                    icon={<CheckOutlined />}
                                    loading={allocatingTxnId === txn.id}
                                    onClick={() => acceptAICategorySuggestion(txn.id, overrideId ? {
                                      id: selectedAccount!.id, code: selectedAccount!.code!, name: selectedAccount!.name!
                                    } : undefined)}
                                  >
                                    Accept
                                  </Button>
                                </Tooltip>
                                <Tooltip title="Reject this suggestion">
                                  <Button
                                    danger
                                    icon={<CloseCircleOutlined />}
                                    onClick={() => rejectAISuggestion(txn.id)}
                                  />
                                </Tooltip>
                              </Space>
                            </Col>
                          </Row>
                        </Card>
                      );
                    })}
                  </div>
                </>
              );
            })()}
          </Tabs.TabPane>

          <Tabs.TabPane tab={<span><HistoryOutlined /> History <Badge count={bankTransactions.filter(t => t.status === 'matched' || t.status === 'reconciled').length} style={{ backgroundColor: '#52c41a', marginLeft: 4 }} /></span>} key="history">
            {bankTransactions.filter(t => t.status === 'matched' || t.status === 'reconciled').length > 0 ? (
              <>
                <Alert
                  message="Reconciled Transactions"
                  description="These transactions have been matched to GL accounts or invoices. You can unreconcile them to move them back to the Reconcile tab."
                  type="success"
                  showIcon
                  style={{ marginBottom: 16 }}
                />
                <Table
                  dataSource={bankTransactions.filter(t => t.status === 'matched' || t.status === 'reconciled')}
                  columns={[
                    {
                      title: 'Date', dataIndex: 'date', key: 'date', width: 100,
                      sorter: (a, b) => a.date.localeCompare(b.date),
                      render: (date) => {
                        try { return <Text style={{ fontSize: 12 }}>{new Date(date).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>; }
                        catch { return <Text style={{ fontSize: 12 }}>{date}</Text>; }
                      }
                    },
                    {
                      title: 'Description', dataIndex: 'description', key: 'description',
                      render: (text, record) => (
                        <div>
                          <div><Text strong style={{ fontSize: 13 }}>{text}</Text></div>
                          {record.reference && <div><Text type="secondary" style={{ fontSize: 11 }}>Ref: {record.reference}</Text></div>}
                          {record.category && <div><Tag color="green" style={{ fontSize: 10, marginTop: 2 }}>{record.category}</Tag></div>}
                        </div>
                      )
                    },
                    {
                      title: 'Amount', dataIndex: 'amount', key: 'amount', width: 120, align: 'right' as const,
                      render: (amount, record) => (
                        <Text strong style={{ color: record.type === 'credit' ? '#10b981' : '#ef4444', fontSize: 13 }}>
                          {record.type === 'credit' ? '+' : '-'} R {amount.toLocaleString()}
                        </Text>
                      )
                    },
                    {
                      title: 'Status', dataIndex: 'status', key: 'status', width: 110,
                      render: () => <Tag color="green" icon={<CheckCircleOutlined />}>Reconciled</Tag>
                    },
                    {
                      title: 'Actions', key: 'action', width: 130,
                      render: (_, record) => (
                        <Popconfirm
                          title="Unreconcile this transaction?"
                          description="This will move the transaction back to the Reconcile tab as unmatched."
                          onConfirm={() => handleUnmatch(record.id)}
                          okText="Yes, Unreconcile"
                          cancelText="Cancel"
                          placement="left"
                        >
                          <Button size="small" icon={<DisconnectOutlined />} danger>Unreconcile</Button>
                        </Popconfirm>
                      )
                    }
                  ]}
                  rowKey="id"
                  size="small"
                  pagination={{ pageSize: 15, showSizeChanger: true, showTotal: (total) => `${total} reconciled` }}
                />
              </>
            ) : (
              <Result
                icon={<HistoryOutlined style={{ color: '#d9d9d9' }} />}
                title="No Reconciled Transactions Yet"
                subTitle="Once you match or allocate bank transactions to GL accounts, they'll appear here. Use AI Categorize or manual allocation from the Reconcile tab."
              />
            )}
          </Tabs.TabPane>

          <Tabs.TabPane tab={<span><RobotOutlined /> AI Rules</span>} key="rules">
            {/* This tab's Add/Edit/Delete/Toggle actions had no backend behind
                them at all (no route exists to persist a rule change), and the
                3 rows shown were hardcoded fallback data, not anything real -
                editing/deleting them did nothing beyond the current browser
                session. Rather than leave broken buttons and fabricated rows,
                this now explains what this tab is actually for (which is
                different from GL allocation) and points to the two features
                that do work. */}
            <Alert
              message="This is about matching, not allocating"
              description={
                <>
                  <Paragraph style={{ marginBottom: 8 }}>
                    "AI Rules" here would control matching a bank transaction to an <strong>existing</strong> invoice
                    or expense already recorded elsewhere (e.g. by reference number or exact amount+date) — a
                    different job from deciding which GL account an unmatched transaction belongs to.
                  </Paragraph>
                  <Paragraph style={{ marginBottom: 0 }}>
                    <strong>To allocate a transaction to a GL account</strong>, use "AI Categorize" on the Reconcile
                    tab, then review and accept suggestions on the <strong>AI Suggestions</strong> tab — that's
                    where GL allocation actually happens.
                  </Paragraph>
                </>
              }
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
            <Result
              icon={<SettingOutlined style={{ color: '#94a3b8' }} />}
              title="Custom matching rules aren't available yet"
              subTitle={`"AI Auto-Match" already runs a built-in exact-match check (reference number, amount + date) against your existing invoices - there just isn't a way to configure custom rules for it yet.`}
            />
          </Tabs.TabPane>
        </Tabs>
      </Card>

      {/* Manual Match Modal */}
      <Modal
        title={<><LinkOutlined /> Match Transaction</>}
        open={showMatchModal}
        onCancel={() => setShowMatchModal(false)}
        onOk={confirmManualMatch}
        width={800}
        okText="Confirm Match"
      >
        {selectedBankTxn && (
          <>
            <Alert
              message={
                <Space>
                  <BankOutlined />
                  <Text strong>{selectedBankTxn.description}</Text>
                  <Text type={selectedBankTxn.type === 'credit' ? 'success' : 'danger'} strong>
                    {selectedBankTxn.type === 'credit' ? '+' : '-'} R {selectedBankTxn.amount.toLocaleString()}
                  </Text>
                </Space>
              }
              type="info"
              style={{ marginBottom: 16 }}
            />
            <Text strong style={{ marginBottom: 12, display: 'block' }}>Select AP/AR/GL entries to match:</Text>
            <Table
              dataSource={bookEntries.filter(e => e.status === 'unmatched')}
              rowSelection={{
                selectedRowKeys: selectedBookEntries,
                onChange: (keys) => setSelectedBookEntries(keys as string[])
              }}
              columns={[
                { title: 'Source', dataIndex: 'source', key: 'source', width: 60, render: (s) => getSourceBadge(s) },
                { title: 'Date', dataIndex: 'date', key: 'date', width: 100 },
                { title: 'Description', dataIndex: 'description', key: 'description' },
                { title: 'Vendor/Client', dataIndex: 'vendorClient', key: 'vendorClient', width: 150 },
                { title: 'Reference', dataIndex: 'reference', key: 'reference', width: 120 },
                { title: 'Amount', dataIndex: 'amount', key: 'amount', width: 110, render: (v, r) => (
                  <Text style={{ color: r.type === 'credit' ? '#10b981' : '#ef4444' }}>R {v.toLocaleString()}</Text>
                )}
              ]}
              rowKey="id"
              size="small"
              pagination={false}
            />
          </>
        )}
      </Modal>

      {/* Import Statement Drawer */}
      <Drawer
        title={<><UploadOutlined /> Import Bank Statement</>}
        placement="right"
        width={500}
        open={showImportDrawer}
        onClose={() => setShowImportDrawer(false)}
      >
        <Alert
          message="Supported Formats"
          description="CSV, OFX, QIF, MT940 (SWIFT), PDF (with OCR)"
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />

        <Dragger
          accept=".csv,.ofx,.qif,.txt,.pdf"
          multiple={false}
          beforeUpload={(file) => {
            handleImportStatement(file);
            return false;
          }}
          disabled={isProcessingImport}
          style={{ marginBottom: 24 }}
        >
          {isProcessingImport ? (
            <div style={{ padding: 40 }}>
              <Spin size="large" />
              <p style={{ marginTop: 16 }}>Processing statement...</p>
            </div>
          ) : (
            <>
              <p className="ant-upload-drag-icon">
                <InboxOutlined style={{ fontSize: 48, color: '#667eea' }} />
              </p>
              <p className="ant-upload-text">Click or drag file to upload</p>
              <p className="ant-upload-hint">
                Supports CSV, OFX, QIF, MT940, and PDF formats
              </p>
            </>
          )}
        </Dragger>

        <Divider>Or connect bank (Coming Soon)</Divider>

        <Space direction="vertical" style={{ width: '100%' }}>
          <Button block icon={<BankOutlined />} disabled>
            <Space>Connect via Yodlee <Tag>Coming Soon</Tag></Space>
          </Button>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Direct bank feeds will be available after Yodlee integration in Phase 2.
          </Text>
        </Space>
      </Drawer>

      {/* Column Mapping Modal */}
      <Modal
        title={<><FileTextOutlined /> Map CSV Columns</>}
        open={showMappingModal}
        onCancel={() => { setShowMappingModal(false); setCsvData(null); setPendingFile(null); }}
        onOk={processImportWithMapping}
        okText="Import Transactions"
        okButtonProps={{ loading: isProcessingImport }}
        width={700}
      >
        <Alert
          message={`Found ${csvData?.rows.length || 0} rows in ${pendingFile?.name || 'file'}`}
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        
        <Text strong style={{ display: 'block', marginBottom: 12 }}>
          Map your CSV columns to the required fields:
        </Text>
        
        <Row gutter={[16, 16]}>
          <Col span={12}>
            <Form.Item label="Date Column" required style={{ marginBottom: 8 }}>
              <Select
                value={columnMapping.date}
                onChange={(v) => setColumnMapping(prev => ({ ...prev, date: v }))}
                placeholder="Select date column"
                style={{ width: '100%' }}
              >
                {csvData?.headers.map(h => (
                  <Select.Option key={h} value={h}>{h}</Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Description Column" required style={{ marginBottom: 8 }}>
              <Select
                value={columnMapping.description}
                onChange={(v) => setColumnMapping(prev => ({ ...prev, description: v }))}
                placeholder="Select description column"
                style={{ width: '100%' }}
              >
                {csvData?.headers.map(h => (
                  <Select.Option key={h} value={h}>{h}</Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Reference Column" style={{ marginBottom: 8 }}>
              <Select
                value={columnMapping.reference}
                onChange={(v) => setColumnMapping(prev => ({ ...prev, reference: v }))}
                placeholder="Select reference column (optional)"
                allowClear
                style={{ width: '100%' }}
              >
                {csvData?.headers.map(h => (
                  <Select.Option key={h} value={h}>{h}</Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Balance Column" style={{ marginBottom: 8 }}>
              <Select
                value={columnMapping.balance}
                onChange={(v) => setColumnMapping(prev => ({ ...prev, balance: v }))}
                placeholder="Select balance column (optional)"
                allowClear
                style={{ width: '100%' }}
              >
                {csvData?.headers.map(h => (
                  <Select.Option key={h} value={h}>{h}</Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Divider>Amount Columns</Divider>
        <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
          Choose either separate Debit/Credit columns OR a single Amount column:
        </Text>
        
        <Row gutter={[16, 16]}>
          <Col span={8}>
            <Form.Item label="Debit Column" style={{ marginBottom: 8 }}>
              <Select
                value={columnMapping.debit}
                onChange={(v) => setColumnMapping(prev => ({ ...prev, debit: v, amount: '' }))}
                placeholder="Debit"
                allowClear
                style={{ width: '100%' }}
              >
                {csvData?.headers.map(h => (
                  <Select.Option key={h} value={h}>{h}</Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Credit Column" style={{ marginBottom: 8 }}>
              <Select
                value={columnMapping.credit}
                onChange={(v) => setColumnMapping(prev => ({ ...prev, credit: v, amount: '' }))}
                placeholder="Credit"
                allowClear
                style={{ width: '100%' }}
              >
                {csvData?.headers.map(h => (
                  <Select.Option key={h} value={h}>{h}</Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="OR Amount Column" style={{ marginBottom: 8 }}>
              <Select
                value={columnMapping.amount}
                onChange={(v) => setColumnMapping(prev => ({ ...prev, amount: v, debit: '', credit: '' }))}
                placeholder="Single amount"
                allowClear
                style={{ width: '100%' }}
              >
                {csvData?.headers.map(h => (
                  <Select.Option key={h} value={h}>{h}</Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        {csvData && csvData.rows.length > 0 && (
          <>
            <Divider>Preview (First 3 Rows)</Divider>
            <Table
              dataSource={csvData.rows.slice(0, 3).map((row, idx) => {
                const obj: Record<string, string> = { key: String(idx) };
                csvData.headers.forEach((h, i) => { obj[h] = row[i] || ''; });
                return obj;
              })}
              columns={csvData.headers.slice(0, 6).map(h => ({
                title: h,
                dataIndex: h,
                key: h,
                ellipsis: true,
                width: 100
              }))}
              size="small"
              pagination={false}
              scroll={{ x: true }}
            />
          </>
        )}
      </Modal>

      {/* Allocate to GL Modal - Direct GL posting */}
      <Modal
        title={<><DollarOutlined /> Allocate to GL Account</>}
        open={showAllocateModal}
        onCancel={() => { setShowAllocateModal(false); setAllocatingTxn(null); setShowCreateAccount(false); }}
        onOk={handleAllocateToGL}
        okText="Allocate & Post"
        okButtonProps={{ loading: isAllocating, disabled: !selectedGLAccount }}
        width={650}
      >
        {allocatingTxn && (
          <>
            <Alert
              message={
                <Space direction="vertical" size={0}>
                  <Text strong>{allocatingTxn.description}</Text>
                  <Space>
                    <Text type="secondary">Date: {(() => { try { return new Date(allocatingTxn.date).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return allocatingTxn.date; } })()}</Text>
                    {allocatingTxn.reference && <Text type="secondary">Ref: {allocatingTxn.reference}</Text>}
                  </Space>
                </Space>
              }
              description={
                <Text style={{ 
                  fontSize: 24, 
                  fontWeight: 600,
                  color: allocatingTxn.type === 'credit' ? '#10b981' : '#ef4444'
                }}>
                  {allocatingTxn.type === 'credit' ? '+' : '-'} R {allocatingTxn.amount.toLocaleString()}
                </Text>
              }
              type={allocatingTxn.type === 'credit' ? 'success' : 'warning'}
              showIcon
              icon={allocatingTxn.type === 'credit' ? <ArrowDownOutlined /> : <ArrowUpOutlined />}
              style={{ marginBottom: 24 }}
            />

            <Form layout="vertical">
              <Form.Item 
                label={<Text strong>Select GL Account</Text>}
                required
                help={!showCreateAccount ? "Can't find the right account? Click '+ Create New Account' below." : undefined}
              >
                <Select
                  value={selectedGLAccount}
                  onChange={(val) => { setSelectedGLAccount(val); setShowCreateAccount(false); }}
                  placeholder="Search accounts by code or name..."
                  showSearch
                  optionFilterProp="label"
                  filterOption={(input, option) =>
                    (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
                  }
                  style={{ width: '100%' }}
                  size="large"
                  options={[
                    ...glAccounts.map(acc => ({
                      value: acc.id,
                      label: `${acc.code} - ${acc.name} (${acc.type})`
                    }))
                  ]}
                  notFoundContent={
                    <div style={{ padding: 8, textAlign: 'center' }}>
                      <Text type="secondary">No matching accounts found</Text>
                      <br />
                      <Button type="link" icon={<PlusOutlined />} onClick={() => setShowCreateAccount(true)}>
                        Create a new GL account
                      </Button>
                    </div>
                  }
                />
              </Form.Item>

              {!showCreateAccount && (
                <div style={{ marginBottom: 16 }}>
                  <Button
                    type="dashed"
                    icon={<PlusOutlined />}
                    onClick={() => setShowCreateAccount(true)}
                    block
                    style={{ borderColor: '#722ed1', color: '#722ed1' }}
                  >
                    + Create New Account
                  </Button>
                </div>
              )}

              {showCreateAccount && (
                <Card
                  size="small"
                  title={<Text strong><PlusOutlined /> New GL Account</Text>}
                  style={{ marginBottom: 16, border: '1px solid #d3adf7', background: '#faf5ff' }}
                  extra={<Button type="text" size="small" onClick={() => setShowCreateAccount(false)}>Cancel</Button>}
                >
                  <Row gutter={12}>
                    <Col span={12}>
                      <Form.Item label="Account Type" required style={{ marginBottom: 12 }}>
                        <Select
                          value={newAccountType}
                          onChange={(val) => {
                            setNewAccountType(val);
                            setNewAccountSubtype('');
                            // Auto-suggest code range
                            const ranges: Record<string, string> = { ASSET: '1', LIABILITY: '2', EQUITY: '3', REVENUE: '4', EXPENSE: '6' };
                            if (!newAccountCode || /^[1-6]$/.test(newAccountCode)) {
                              setNewAccountCode(ranges[val] || '');
                            }
                          }}
                          options={[
                            { value: 'EXPENSE', label: '💰 Expense (6000s)' },
                            { value: 'REVENUE', label: '📈 Revenue (4000s)' },
                            { value: 'ASSET', label: '🏦 Asset (1000s)' },
                            { value: 'LIABILITY', label: '📋 Liability (2000s)' },
                            { value: 'EQUITY', label: '🏛️ Equity (3000s)' },
                          ]}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="Sub-category" style={{ marginBottom: 12 }}>
                        <Select
                          value={newAccountSubtype}
                          onChange={setNewAccountSubtype}
                          placeholder="Optional"
                          allowClear
                          options={
                            newAccountType === 'EXPENSE' ? [
                              { value: 'operating_expense', label: 'Operating Expense' },
                              { value: 'cost_of_sales', label: 'Cost of Sales (5000s)' },
                              { value: 'administrative', label: 'Administrative' },
                              { value: 'selling_expense', label: 'Selling & Marketing' },
                              { value: 'depreciation', label: 'Depreciation' },
                              { value: 'finance_cost', label: 'Finance Costs' },
                            ] : newAccountType === 'REVENUE' ? [
                              { value: 'operating_revenue', label: 'Operating Revenue' },
                              { value: 'other_income', label: 'Other Income' },
                            ] : newAccountType === 'ASSET' ? [
                              { value: 'current_asset', label: 'Current Asset' },
                              { value: 'fixed_asset', label: 'Fixed Asset (1500s)' },
                              { value: 'bank', label: 'Bank & Cash' },
                            ] : newAccountType === 'LIABILITY' ? [
                              { value: 'current_liability', label: 'Current Liability' },
                              { value: 'long_term', label: 'Long-term Liability' },
                              { value: 'tax_liability', label: 'Tax Liability' },
                            ] : [
                              { value: 'share_capital', label: 'Share Capital' },
                              { value: 'retained_earnings', label: 'Retained Earnings' },
                            ]
                          }
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Row gutter={12}>
                    <Col span={8}>
                      <Form.Item 
                        label="Account Code" 
                        required 
                        style={{ marginBottom: 12 }}
                        help={(() => {
                          const ranges: Record<string, string> = { ASSET: '1000-1999', LIABILITY: '2000-2999', EQUITY: '3000-3999', REVENUE: '4000-4999', EXPENSE: '5000-6999' };
                          return `Range: ${ranges[newAccountType] || '?'}`;
                        })()}
                      >
                        <Input
                          value={newAccountCode}
                          onChange={(e) => setNewAccountCode(e.target.value.replace(/[^0-9]/g, ''))}
                          placeholder="e.g. 6510"
                          maxLength={6}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={16}>
                      <Form.Item label="Account Name" required style={{ marginBottom: 12 }}>
                        <Input
                          value={newAccountName}
                          onChange={(e) => setNewAccountName(e.target.value)}
                          placeholder="e.g. Office Supplies"
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Form.Item label="Description" style={{ marginBottom: 12 }}>
                    <Input
                      value={newAccountDescription}
                      onChange={(e) => setNewAccountDescription(e.target.value)}
                      placeholder="Optional description..."
                    />
                  </Form.Item>
                  <Button
                    type="primary"
                    icon={<CheckOutlined />}
                    loading={isCreatingAccount}
                    disabled={!newAccountCode || !newAccountName || newAccountCode.length < 4}
                    onClick={async () => {
                      // Validate code is in correct range for type
                      const codeNum = parseInt(newAccountCode);
                      const typeRanges: Record<string, [number, number]> = {
                        ASSET: [1000, 1999],
                        LIABILITY: [2000, 2999],
                        EQUITY: [3000, 3999],
                        REVENUE: [4000, 4999],
                        EXPENSE: [5000, 6999],
                      };
                      const [min, max] = typeRanges[newAccountType] || [1000, 9999];
                      if (codeNum < min || codeNum > max) {
                        message.error(`Account code for ${newAccountType} must be between ${min} and ${max}`);
                        return;
                      }
                      // Check if code already exists locally
                      if (glAccounts.some(a => a.code === newAccountCode)) {
                        message.error(`Account code ${newAccountCode} already exists`);
                        return;
                      }

                      setIsCreatingAccount(true);
                      try {
                        const response = await apiClient.post('/api/v2/financial/chart-of-accounts', {
                          account_code: newAccountCode,
                          account_name: newAccountName,
                          account_type: newAccountType,
                          description: newAccountDescription || undefined,
                          is_header: false,
                        });

                        if (response.data?.success) {
                          const newAcc = response.data.data;
                          const mappedAcc: GLAccount = {
                            id: newAcc.id,
                            code: newAcc.code || newAcc.account_code || newAccountCode,
                            name: newAcc.name || newAcc.account_name || newAccountName,
                            type: newAcc.account_type || newAccountType,
                          };
                          // Add to GL accounts list and auto-select it
                          setGLAccounts(prev => [...prev, mappedAcc].sort((a, b) => a.code.localeCompare(b.code)));
                          setSelectedGLAccount(mappedAcc.id);
                          setShowCreateAccount(false);
                          // Reset form
                          setNewAccountCode('');
                          setNewAccountName('');
                          setNewAccountType('EXPENSE');
                          setNewAccountSubtype('');
                          setNewAccountDescription('');
                          message.success(`✅ Account ${mappedAcc.code} - ${mappedAcc.name} created and selected!`);
                        } else {
                          message.error(response.data?.message || 'Failed to create account');
                        }
                      } catch (error: any) {
                        console.error('Create account error:', error);
                        message.error(error.response?.data?.message || 'Failed to create account');
                      }
                      setIsCreatingAccount(false);
                    }}
                    block
                  >
                    Create Account & Select
                  </Button>
                </Card>
              )}

              <Form.Item 
                label={<Text strong>Description</Text>}
                help="Update the description for the GL entry if needed"
              >
                <Input.TextArea
                  value={allocateDescription}
                  onChange={(e) => setAllocateDescription(e.target.value)}
                  placeholder="Enter description..."
                  rows={2}
                />
              </Form.Item>
            </Form>

            <Divider />

            <Alert
              message="What happens when you allocate?"
              description={
                <ul style={{ paddingLeft: 20, margin: 0 }}>
                  <li>A journal entry is created in the General Ledger</li>
                  <li>Debit: {allocatingTxn.type === 'debit' ? 'Selected GL Account' : 'Bank Account'}</li>
                  <li>Credit: {allocatingTxn.type === 'credit' ? 'Selected GL Account' : 'Bank Account'}</li>
                  <li>Transaction is marked as allocated/reconciled</li>
                </ul>
              }
              type="info"
              showIcon
              icon={<BulbOutlined />}
            />
          </>
        )}
      </Modal>

      {/* Create GL Account - reached from the AI Suggestions review screen when
          nothing in the existing chart of accounts fits an "Unknown" transaction */}
      <Modal
        title={<><PlusOutlined /> Create GL Account</>}
        open={!!showCreateAccountForTxn}
        onCancel={() => {
          setShowCreateAccountForTxn(null);
          setCreateAcctCode('');
          setCreateAcctName('');
          setCreateAcctType('EXPENSE');
        }}
        onOk={async () => {
          if (!createAcctCode || !createAcctName) {
            message.warning('Account code and name are required');
            return;
          }
          if (glAccounts.some(a => a.code === createAcctCode)) {
            message.error(`Account code ${createAcctCode} already exists`);
            return;
          }
          setCreatingAcctForTxn(true);
          try {
            const response = await apiClient.post('/api/v2/financial/chart-of-accounts', {
              account_code: createAcctCode,
              account_name: createAcctName,
              account_type: createAcctType,
              is_header: false,
            });
            if (response.data?.success) {
              const newAcc = response.data.data;
              const mappedAcc: GLAccount = {
                id: newAcc.id,
                code: newAcc.code || newAcc.account_code || createAcctCode,
                name: newAcc.name || newAcc.account_name || createAcctName,
                type: newAcc.account_type || createAcctType,
              };
              setGLAccounts(prev => [...prev, mappedAcc].sort((a, b) => a.code.localeCompare(b.code)));
              if (showCreateAccountForTxn) {
                setSuggestionOverrides(prev => new Map(prev).set(showCreateAccountForTxn, mappedAcc.id));
              }
              message.success(`✅ Account ${mappedAcc.code} - ${mappedAcc.name} created and selected`);
              setShowCreateAccountForTxn(null);
              setCreateAcctCode('');
              setCreateAcctName('');
              setCreateAcctType('EXPENSE');
            } else {
              message.error(response.data?.message || 'Failed to create account');
            }
          } catch (error: any) {
            console.error('Create account error:', error);
            message.error(error.response?.data?.message || 'Failed to create account');
          }
          setCreatingAcctForTxn(false);
        }}
        okText="Create & Select"
        okButtonProps={{ loading: creatingAcctForTxn, disabled: !createAcctCode || !createAcctName }}
        width={480}
      >
        <Form layout="vertical">
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="Account Type" style={{ marginBottom: 12 }}>
                <Select
                  value={createAcctType}
                  onChange={setCreateAcctType}
                  options={[
                    { value: 'ASSET', label: 'Asset' },
                    { value: 'LIABILITY', label: 'Liability' },
                    { value: 'EQUITY', label: 'Equity' },
                    { value: 'REVENUE', label: 'Revenue' },
                    { value: 'EXPENSE', label: 'Expense' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Account Code" required style={{ marginBottom: 12 }}>
                <Input
                  value={createAcctCode}
                  onChange={(e) => setCreateAcctCode(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="e.g. 6510"
                  maxLength={6}
                />
              </Form.Item>
            </Col>
            <Col span={8} />
          </Row>
          <Form.Item label="Account Name" required style={{ marginBottom: 0 }}>
            <Input
              value={createAcctName}
              onChange={(e) => setCreateAcctName(e.target.value)}
              placeholder="e.g. Office Supplies"
            />
          </Form.Item>
        </Form>
      </Modal>

      <style>{`
        .matched-row { background-color: rgba(16, 185, 129, 0.05) !important; }
        .ai-suggested-row { background-color: rgba(114, 46, 209, 0.05) !important; }
        .excluded-row { background-color: rgba(0, 0, 0, 0.02) !important; opacity: 0.7; }
      `}</style>
    </HubLayout>
  );
};

export default BankReconciliation;
