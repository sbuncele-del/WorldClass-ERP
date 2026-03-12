/**
 * AI Tool Registry
 * Defines all tools the AI assistant can call — using OpenAI function-calling format.
 * Tools are categorized as READ (safe) or WRITE (requires confirmation).
 */

export type ToolCategory = 'sales' | 'finance' | 'inventory' | 'hr' | 'crm' | 'reports' | 'cash' | 'purchasing';
export type ToolAction = 'read' | 'write';

export interface AITool {
  name: string;
  description: string;
  category: ToolCategory;
  action: ToolAction;
  parameters: {
    type: 'object';
    properties: Record<string, { type: string; description: string; enum?: string[] }>;
    required: string[];
  };
}

// ─── READ TOOLS (Safe — no confirmation needed) ───────────────────────

const lookupCustomer: AITool = {
  name: 'lookup_customer',
  description: 'Search for a customer by name, email, or phone. Returns customer details including credit limit, outstanding balance, and contact info.',
  category: 'crm',
  action: 'read',
  parameters: {
    type: 'object',
    properties: {
      search: { type: 'string', description: 'Customer name, email, or phone to search for' },
    },
    required: ['search'],
  },
};

const getCustomerBalance: AITool = {
  name: 'get_customer_balance',
  description: 'Get a customer\'s current outstanding balance, credit limit, and payment history summary.',
  category: 'crm',
  action: 'read',
  parameters: {
    type: 'object',
    properties: {
      customer_id: { type: 'string', description: 'The customer ID' },
    },
    required: ['customer_id'],
  },
};

const listInvoices: AITool = {
  name: 'list_invoices',
  description: 'List invoices with optional filters. Returns invoice number, customer, amount, status, and due date.',
  category: 'sales',
  action: 'read',
  parameters: {
    type: 'object',
    properties: {
      status: { type: 'string', description: 'Filter by status', enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'] },
      customer_id: { type: 'string', description: 'Filter by customer ID' },
      date_from: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
      date_to: { type: 'string', description: 'End date (YYYY-MM-DD)' },
      limit: { type: 'string', description: 'Max results (default 10)' },
    },
    required: [],
  },
};

const getInvoice: AITool = {
  name: 'get_invoice',
  description: 'Get full details of a specific invoice by invoice number or ID, including line items and payment status.',
  category: 'sales',
  action: 'read',
  parameters: {
    type: 'object',
    properties: {
      invoice_number: { type: 'string', description: 'Invoice number (e.g., INV-2026-001)' },
    },
    required: ['invoice_number'],
  },
};

const getAccountBalance: AITool = {
  name: 'get_account_balance',
  description: 'Get the current balance of a general ledger account by account code or name.',
  category: 'finance',
  action: 'read',
  parameters: {
    type: 'object',
    properties: {
      account_code: { type: 'string', description: 'GL account code (e.g., 1100, 4000)' },
      account_name: { type: 'string', description: 'Account name to search for (e.g., "Accounts Receivable")' },
    },
    required: [],
  },
};

const getTrialBalance: AITool = {
  name: 'get_trial_balance',
  description: 'Get the trial balance showing all account balances. Optionally filter by date range.',
  category: 'finance',
  action: 'read',
  parameters: {
    type: 'object',
    properties: {
      as_at_date: { type: 'string', description: 'Date for trial balance (YYYY-MM-DD). Defaults to today.' },
    },
    required: [],
  },
};

const getIncomeStatement: AITool = {
  name: 'get_income_statement',
  description: 'Get the income statement (profit & loss) for a period. Shows revenue, expenses, and net profit.',
  category: 'reports',
  action: 'read',
  parameters: {
    type: 'object',
    properties: {
      date_from: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
      date_to: { type: 'string', description: 'End date (YYYY-MM-DD)' },
    },
    required: [],
  },
};

const getBalanceSheet: AITool = {
  name: 'get_balance_sheet',
  description: 'Get the balance sheet as at a specific date. Shows assets, liabilities, and equity.',
  category: 'reports',
  action: 'read',
  parameters: {
    type: 'object',
    properties: {
      as_at_date: { type: 'string', description: 'Date for balance sheet (YYYY-MM-DD). Defaults to today.' },
    },
    required: [],
  },
};

const checkStockLevel: AITool = {
  name: 'check_stock_level',
  description: 'Check current stock quantity for an item across all warehouses.',
  category: 'inventory',
  action: 'read',
  parameters: {
    type: 'object',
    properties: {
      item_name: { type: 'string', description: 'Item name or SKU to search for' },
    },
    required: ['item_name'],
  },
};

const listProducts: AITool = {
  name: 'list_products',
  description: 'List inventory items/products with optional search. Returns name, SKU, price, and stock quantity.',
  category: 'inventory',
  action: 'read',
  parameters: {
    type: 'object',
    properties: {
      search: { type: 'string', description: 'Search by product name or SKU' },
      category: { type: 'string', description: 'Filter by product category' },
      low_stock: { type: 'string', description: 'Set to "true" to only show items below reorder level' },
    },
    required: [],
  },
};

const listEmployees: AITool = {
  name: 'list_employees',
  description: 'List employees with optional filters. Returns name, position, department, and status.',
  category: 'hr',
  action: 'read',
  parameters: {
    type: 'object',
    properties: {
      department: { type: 'string', description: 'Filter by department name' },
      status: { type: 'string', description: 'Filter by status', enum: ['active', 'inactive', 'on_leave'] },
      search: { type: 'string', description: 'Search by employee name' },
    },
    required: [],
  },
};

const getBankBalance: AITool = {
  name: 'get_bank_balance',
  description: 'Get current bank account balance(s). Shows all bank accounts with their balances.',
  category: 'cash',
  action: 'read',
  parameters: {
    type: 'object',
    properties: {
      account_name: { type: 'string', description: 'Specific bank account name (optional — omit for all)' },
    },
    required: [],
  },
};

const getOverdueInvoices: AITool = {
  name: 'get_overdue_invoices',
  description: 'Get all overdue invoices with customer details and days overdue. Useful for collections.',
  category: 'sales',
  action: 'read',
  parameters: {
    type: 'object',
    properties: {
      days_overdue: { type: 'string', description: 'Minimum days overdue (default: 1)' },
    },
    required: [],
  },
};

const getSupplierList: AITool = {
  name: 'get_supplier_list',
  description: 'List suppliers/vendors. Returns name, contact info, and outstanding balance.',
  category: 'purchasing',
  action: 'read',
  parameters: {
    type: 'object',
    properties: {
      search: { type: 'string', description: 'Search by supplier name' },
    },
    required: [],
  },
};

const getCashFlowSummary: AITool = {
  name: 'get_cash_flow_summary',
  description: 'Get cash inflows and outflows for a period. Shows net cash position.',
  category: 'cash',
  action: 'read',
  parameters: {
    type: 'object',
    properties: {
      date_from: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
      date_to: { type: 'string', description: 'End date (YYYY-MM-DD)' },
    },
    required: [],
  },
};

// ─── WRITE TOOLS (Require confirmation) ───────────────────────────────

const createInvoice: AITool = {
  name: 'create_invoice',
  description: 'Create a new sales invoice for a customer. REQUIRES CONFIRMATION before executing. Will calculate VAT automatically.',
  category: 'sales',
  action: 'write',
  parameters: {
    type: 'object',
    properties: {
      customer_id: { type: 'string', description: 'Customer ID to invoice' },
      items: { type: 'string', description: 'JSON array of line items: [{description, quantity, unit_price}]' },
      notes: { type: 'string', description: 'Invoice notes or memo' },
      due_days: { type: 'string', description: 'Payment terms in days (default: 30)' },
    },
    required: ['customer_id', 'items'],
  },
};

const createQuote: AITool = {
  name: 'create_quote',
  description: 'Create a new quotation for a customer. REQUIRES CONFIRMATION before executing.',
  category: 'sales',
  action: 'write',
  parameters: {
    type: 'object',
    properties: {
      customer_id: { type: 'string', description: 'Customer ID' },
      items: { type: 'string', description: 'JSON array of line items: [{description, quantity, unit_price}]' },
      valid_days: { type: 'string', description: 'Quote validity in days (default: 30)' },
      notes: { type: 'string', description: 'Quote notes' },
    },
    required: ['customer_id', 'items'],
  },
};

const recordPayment: AITool = {
  name: 'record_payment',
  description: 'Record a payment received against an invoice. REQUIRES CONFIRMATION. Creates journal entries automatically.',
  category: 'sales',
  action: 'write',
  parameters: {
    type: 'object',
    properties: {
      invoice_id: { type: 'string', description: 'Invoice ID or number to apply payment to' },
      amount: { type: 'string', description: 'Payment amount in ZAR' },
      payment_method: { type: 'string', description: 'Payment method', enum: ['eft', 'cash', 'card', 'cheque'] },
      reference: { type: 'string', description: 'Payment reference number' },
    },
    required: ['invoice_id', 'amount'],
  },
};

const createJournalEntry: AITool = {
  name: 'create_journal_entry',
  description: 'Create a manual journal entry with debit and credit lines. REQUIRES CONFIRMATION. Must balance.',
  category: 'finance',
  action: 'write',
  parameters: {
    type: 'object',
    properties: {
      description: { type: 'string', description: 'Journal entry description/memo' },
      date: { type: 'string', description: 'Journal date (YYYY-MM-DD). Defaults to today.' },
      lines: { type: 'string', description: 'JSON array of journal lines: [{account_code, description, debit, credit}]' },
    },
    required: ['description', 'lines'],
  },
};

const createPurchaseOrder: AITool = {
  name: 'create_purchase_order',
  description: 'Create a purchase order to a supplier. REQUIRES CONFIRMATION.',
  category: 'purchasing',
  action: 'write',
  parameters: {
    type: 'object',
    properties: {
      supplier_id: { type: 'string', description: 'Supplier ID' },
      items: { type: 'string', description: 'JSON array: [{description, quantity, unit_price}]' },
      notes: { type: 'string', description: 'PO notes' },
    },
    required: ['supplier_id', 'items'],
  },
};

const adjustStock: AITool = {
  name: 'adjust_stock',
  description: 'Adjust stock quantity for an item (increase or decrease). REQUIRES CONFIRMATION. Creates audit trail.',
  category: 'inventory',
  action: 'write',
  parameters: {
    type: 'object',
    properties: {
      item_id: { type: 'string', description: 'Item/product ID' },
      quantity: { type: 'string', description: 'Adjustment quantity (positive to add, negative to subtract)' },
      reason: { type: 'string', description: 'Reason for adjustment' },
      warehouse_id: { type: 'string', description: 'Warehouse ID (optional — uses default)' },
    },
    required: ['item_id', 'quantity', 'reason'],
  },
};

// ─── TOOL REGISTRY ────────────────────────────────────────────────────

export const AI_TOOLS: AITool[] = [
  // Read tools
  lookupCustomer,
  getCustomerBalance,
  listInvoices,
  getInvoice,
  getAccountBalance,
  getTrialBalance,
  getIncomeStatement,
  getBalanceSheet,
  checkStockLevel,
  listProducts,
  listEmployees,
  getBankBalance,
  getOverdueInvoices,
  getSupplierList,
  getCashFlowSummary,
  // Write tools
  createInvoice,
  createQuote,
  recordPayment,
  createJournalEntry,
  createPurchaseOrder,
  adjustStock,
];

/** Get tools in OpenAI function-calling format */
export function getOpenAITools(): OpenAI.Chat.Completions.ChatCompletionTool[] {
  return AI_TOOLS.map(tool => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}

/** Check if a tool requires user confirmation */
export function requiresConfirmation(toolName: string): boolean {
  const tool = AI_TOOLS.find(t => t.name === toolName);
  return tool?.action === 'write';
}

/** Get tool definition by name */
export function getTool(name: string): AITool | undefined {
  return AI_TOOLS.find(t => t.name === name);
}

// Type import for OpenAI format
import type OpenAI from 'openai';
