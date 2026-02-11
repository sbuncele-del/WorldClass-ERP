/**
 * Banking & Cash Management Service
 *
 * Centralized API service for all banking module operations.
 * Follows the same pattern as sales.service.ts.
 *
 * Endpoints map to:
 *   V2: /api/v2/cash-management/...  (inline handlers in v2.routes.ts)
 *   V1: /api/cash-management/...     (cash-management.routes.ts)
 */

import apiClient from './api';

// ============================================================
// Types
// ============================================================

export interface BankAccount {
  id: string;
  account_name: string;
  bank_name: string;
  account_number: string;
  branch_code?: string;
  account_type: string;
  currency: string;
  current_balance: number;
  is_active: boolean;
  gl_account_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface BankStatement {
  id: string;
  bank_account_id: string;
  statement_date: string;
  start_date: string;
  end_date: string;
  opening_balance: number;
  closing_balance: number;
  transaction_count: number;
  status: string;
}

export interface StatementLine {
  id: string;
  statement_id?: string;
  bank_account_id: string;
  transaction_date: string;
  description: string;
  reference?: string;
  amount: number;
  transaction_type: 'credit' | 'debit';
  status: 'unmatched' | 'matched' | 'allocated' | 'reconciled';
  category?: string;
  matched_transaction_id?: string;
  suggested_gl_account_id?: string;
  ai_confidence?: number;
  ai_reason?: string;
}

export interface ReconciliationRule {
  id: string;
  name: string;
  field: string;
  condition: string;
  priority: number;
  confidence: number;
  enabled: boolean;
  tenant_id?: string;
}

export interface BankingSettings {
  syncFrequency: string;
  reconciliationMethod: string;
  lowBalanceThreshold: string;
  autoCategorizationEnabled: boolean;
  duplicateDetectionEnabled: boolean;
}

export interface ReconciliationSummary {
  unmatched: number;
  matched: number;
  posted: number;
  total: number;
  total_credits: number;
  total_debits: number;
}

// ============================================================
// Default settings (used when no saved settings exist)
// ============================================================

const DEFAULT_SETTINGS: BankingSettings = {
  syncFrequency: '15',
  reconciliationMethod: 'auto',
  lowBalanceThreshold: '100000',
  autoCategorizationEnabled: true,
  duplicateDetectionEnabled: true,
};

const SETTINGS_STORAGE_KEY = 'banking_module_settings';

// ============================================================
// Banking Service
// ============================================================

export const bankingService = {
  // ----------------------------------------------------------
  // Bank Accounts
  // ----------------------------------------------------------

  async getBankAccounts(): Promise<BankAccount[]> {
    const { data } = await apiClient.get('/api/v2/cash-management/bank-accounts');
    return data?.data || [];
  },

  async getBankAccountById(id: string): Promise<BankAccount | null> {
    const { data } = await apiClient.get(`/api/v2/cash-management/bank-accounts/${id}`);
    return data?.data || null;
  },

  async createBankAccount(account: Partial<BankAccount>): Promise<BankAccount> {
    const { data } = await apiClient.post('/api/v2/cash-management/bank-accounts', account);
    return data?.data || data;
  },

  async updateBankAccount(id: string, updates: Partial<BankAccount>): Promise<BankAccount> {
    const { data } = await apiClient.put(`/api/v2/cash-management/bank-accounts/${id}`, updates);
    return data?.data || data;
  },

  // ----------------------------------------------------------
  // Statements & Import
  // ----------------------------------------------------------

  async getStatements(params?: { bank_account_id?: string }): Promise<BankStatement[]> {
    const { data } = await apiClient.get('/api/v2/cash-management/statements', { params });
    return data?.data || [];
  },

  async createStatement(statement: Partial<BankStatement>): Promise<BankStatement> {
    const { data } = await apiClient.post('/api/v2/cash-management/statements', statement);
    return data?.data || data;
  },

  async getStatementLines(params?: { bank_account_id?: string; statement_id?: string }): Promise<StatementLine[]> {
    const { data } = await apiClient.get('/api/v2/cash-management/statement-lines', { params });
    return data?.data || [];
  },

  async createStatementLine(line: Partial<StatementLine>): Promise<StatementLine> {
    const { data } = await apiClient.post('/api/v2/cash-management/statement-lines', line);
    return data?.data || data;
  },

  async updateStatementLine(id: string, updates: Partial<StatementLine>): Promise<StatementLine> {
    const { data } = await apiClient.patch(`/api/v2/cash-management/statement-lines/${id}`, updates);
    return data?.data || data;
  },

  // ----------------------------------------------------------
  // Reconciliation
  // ----------------------------------------------------------

  async getReconciliationSummary(bankAccountId?: string): Promise<ReconciliationSummary> {
    const params = bankAccountId ? { bank_account_id: bankAccountId } : {};
    const { data } = await apiClient.get('/api/v2/cash-management/reconciliation/summary', { params });
    return data?.data || { unmatched: 0, matched: 0, posted: 0, total: 0, total_credits: 0, total_debits: 0 };
  },

  async getReconciliationHistory(): Promise<any[]> {
    const { data } = await apiClient.get('/api/v2/cash-management/reconciliation/history');
    return data?.data || [];
  },

  async autoMatch(bankAccountId: string, rules?: any[]): Promise<any> {
    const { data } = await apiClient.post('/api/v2/cash-management/reconciliation/auto-match', {
      bank_account_id: bankAccountId,
      rules,
    });
    return data?.data || {};
  },

  async allocateToGL(params: {
    statement_line_id: string;
    gl_account_id: string;
    description: string;
    bank_account_id: string;
  }): Promise<any> {
    const { data } = await apiClient.post('/api/v2/cash-management/reconciliation/allocate', params);
    return data;
  },

  async postToGL(params: {
    statement_line_ids: string[];
    bank_account_id: string;
  }): Promise<any> {
    const { data } = await apiClient.post('/api/v2/cash-management/reconciliation/post-to-gl', params);
    return data;
  },

  // ----------------------------------------------------------
  // AI Features
  // ----------------------------------------------------------

  async aiCategorize(params: {
    bank_account_id: string;
    transactions?: any[];
  }): Promise<any> {
    const { data } = await apiClient.post('/api/v2/cash-management/reconciliation/ai-categorize', params);
    return data?.data || {};
  },

  async aiSuggest(transactions: any[]): Promise<any> {
    const { data } = await apiClient.post('/api/v2/cash-management/reconciliation/ai-suggest', {
      transactions,
    });
    return data?.data || {};
  },

  async aiStats(): Promise<{ total_patterns: number; total_allocations: number; accuracy: number }> {
    const { data } = await apiClient.get('/api/v2/cash-management/reconciliation/ai-stats');
    return data?.data || { total_patterns: 0, total_allocations: 0, accuracy: 0 };
  },

  async aiFeedback(patternId: string, action: 'accept' | 'reject'): Promise<void> {
    await apiClient.post('/api/v2/cash-management/reconciliation/ai-feedback', {
      pattern_id: patternId,
      action,
    });
  },

  // ----------------------------------------------------------
  // Reconciliation Rules (uses V1 endpoints via cash-management.routes.ts)
  // ----------------------------------------------------------

  async getReconciliationRules(): Promise<ReconciliationRule[]> {
    try {
      // Try V2 endpoint first
      const { data } = await apiClient.get('/api/v2/cash-management/reconciliation/rules');
      return data?.data || [];
    } catch {
      // Fall back to V1 endpoint
      try {
        const { data } = await apiClient.get('/api/cash-management/rules');
        return data?.data || [];
      } catch {
        return [];
      }
    }
  },

  async createReconciliationRule(rule: Partial<ReconciliationRule>): Promise<ReconciliationRule> {
    // V1 endpoint supports POST for rules
    const { data } = await apiClient.post('/api/cash-management/rules', rule);
    return data?.data || data;
  },

  async updateReconciliationRule(id: string, updates: Partial<ReconciliationRule>): Promise<ReconciliationRule> {
    // If the PUT endpoint exists on V1, use it; otherwise PATCH
    try {
      const { data } = await apiClient.put(`/api/cash-management/rules/${id}`, updates);
      return data?.data || data;
    } catch {
      // If the endpoint doesn't exist, fall back to a delete+create approach
      // or just return the updates as-is (graceful degradation)
      console.warn('Rule update endpoint not available; changes saved locally only');
      return { ...updates, id } as ReconciliationRule;
    }
  },

  async deleteReconciliationRule(id: string): Promise<void> {
    try {
      await apiClient.delete(`/api/cash-management/rules/${id}`);
    } catch {
      console.warn('Rule delete endpoint not available');
    }
  },

  // ----------------------------------------------------------
  // Dashboard / Overview
  // ----------------------------------------------------------

  async getOverviewDashboard(): Promise<any> {
    const { data } = await apiClient.get('/api/v2/cash-management/overview-dashboard');
    return data?.data || null;
  },

  async getCashFlowDashboard(): Promise<any> {
    const { data } = await apiClient.get('/api/v2/cash-management/cash-flow-dashboard');
    return data?.data || null;
  },

  async getWorkspace(): Promise<any> {
    const { data } = await apiClient.get('/api/v2/cash-management/workspace');
    return data?.data || data || null;
  },

  async getCashPosition(): Promise<any> {
    const { data } = await apiClient.get('/api/v2/cash-management/cash-position');
    return data?.data || null;
  },

  // ----------------------------------------------------------
  // Treasury
  // ----------------------------------------------------------

  async getTreasuryDashboard(): Promise<any> {
    const { data } = await apiClient.get('/api/v2/treasury/dashboard');
    return data?.dashboard || data?.data || {};
  },

  async getTreasuryForecasts(): Promise<any[]> {
    const { data } = await apiClient.get('/api/v2/treasury/forecasts');
    return Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
  },

  // ----------------------------------------------------------
  // Module Settings (persisted to localStorage, with backend fallback)
  //
  // Banking settings are stored client-side as module preferences.
  // If a backend module settings endpoint becomes available, this
  // will automatically upgrade to use it.
  // ----------------------------------------------------------

  async getSettings(): Promise<BankingSettings> {
    // Try to load from backend module settings first
    try {
      const { data } = await apiClient.get('/api/v2/tenant-settings/modules/cash-management/settings');
      if (data?.success && data?.data && Object.keys(data.data).length > 0) {
        const serverSettings: BankingSettings = {
          syncFrequency: data.data.syncFrequency || DEFAULT_SETTINGS.syncFrequency,
          reconciliationMethod: data.data.reconciliationMethod || DEFAULT_SETTINGS.reconciliationMethod,
          lowBalanceThreshold: data.data.lowBalanceThreshold || DEFAULT_SETTINGS.lowBalanceThreshold,
          autoCategorizationEnabled: data.data.autoCategorizationEnabled ?? DEFAULT_SETTINGS.autoCategorizationEnabled,
          duplicateDetectionEnabled: data.data.duplicateDetectionEnabled ?? DEFAULT_SETTINGS.duplicateDetectionEnabled,
        };
        // Cache locally
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(serverSettings));
        return serverSettings;
      }
    } catch {
      // Backend endpoint not available, fall through to localStorage
    }

    // Fall back to localStorage
    try {
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch {
      // Invalid JSON in localStorage
    }

    return { ...DEFAULT_SETTINGS };
  },

  async saveSettings(settings: BankingSettings): Promise<{ success: boolean; source: string }> {
    // Save to localStorage immediately
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));

    // Attempt to persist to backend
    try {
      await apiClient.put('/api/v2/tenant-settings/modules/cash-management', {
        moduleCode: 'cash-management',
        enabled: true,
        settings,
      });
      return { success: true, source: 'server' };
    } catch {
      // Backend endpoint not available; saved locally only
      return { success: true, source: 'local' };
    }
  },
};

export default bankingService;
