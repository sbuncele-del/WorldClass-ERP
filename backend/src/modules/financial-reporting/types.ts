/**
 * Siyabusa Financial Reporting Platform - Type Definitions
 * Module: reporting.siyabusaerp.co.za
 */

// ============================================================================
// ENGAGEMENT (Client File)
// ============================================================================

export type LegalForm = 
  | 'private_company' 
  | 'close_corporation' 
  | 'sole_proprietor' 
  | 'trust' 
  | 'npo' 
  | 'npc' 
  | 'partnership' 
  | 'body_corporate';

export type ReportingFramework = 
  | 'ifrs_full' 
  | 'ifrs_sme' 
  | 'ifrs_sme_plus' 
  | 'ifrs_micro';

export type WorkingPaperType = 
  | 'compilation' 
  | 'review' 
  | 'audit' 
  | 'agreed_upon' 
  | 'accounting_officer'
  | 'legal_practitioner'
  | 'property_practitioner';

export type EngagementStatus = 
  | 'draft' 
  | 'in_progress' 
  | 'review' 
  | 'approved' 
  | 'submitted' 
  | 'archived';

export type CurrencyRounding = 'decimals' | 'units' | 'thousands' | 'millions';
export type CashFlowMethod = 'direct' | 'indirect';
export type SociPresentation = 'function' | 'nature';

export interface Address {
  line1?: string;
  line2?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  country?: string;
}

export interface Director {
  name: string;
  designation?: string;
  id_number?: string;
  appointed_date?: string;
  resigned_date?: string;
  is_active: boolean;
}

export interface PreparerContact {
  name?: string;
  address?: Address;
  phone?: string;
  email?: string;
  registration_number?: string;
  professional_body?: string;
  signatory_name?: string;
  signatory_designation?: string;
}

export interface Engagement {
  id: string;
  tenant_id: string;
  entity_name: string;
  trading_as?: string;
  registration_number?: string;
  tax_number?: string;
  vat_number?: string;
  legal_form: LegalForm;
  nature_of_business?: string;
  country: string;
  
  financial_year_end: string;
  financial_year_start: string;
  comparative_year_end?: string;
  comparative_year_start?: string;
  
  reporting_framework: ReportingFramework;
  working_paper_type: WorkingPaperType;
  
  engagement_label?: string;
  engagement_letter_date?: string;
  date_of_signature?: string;
  financial_statements_approval_date?: string;
  agm_date?: string;
  
  business_commencement?: string;
  business_address: Address;
  postal_address: Address;
  bankers?: string;
  
  directors: Director[];
  preparer_firm_name?: string;
  preparer_contact: PreparerContact;
  
  currency: string;
  currency_rounding: CurrencyRounding;
  cash_flow_method: CashFlowMethod;
  soci_presentation: SociPresentation;
  materiality: number;
  performance_materiality: number;
  
  status: EngagementStatus;
  locked_at?: string;
  locked_by?: string;
  
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export type CreateEngagementInput = Omit<Engagement, 
  'id' | 'tenant_id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by' | 'locked_at' | 'locked_by'
>;

// ============================================================================
// ACCOUNT LINKS (Trial Balance)
// ============================================================================

export type AccountCategory = 
  | 'current_assets' 
  | 'non_current_assets' 
  | 'current_liabilities' 
  | 'non_current_liabilities' 
  | 'equity' 
  | 'revenue' 
  | 'cost_of_sales' 
  | 'expenses' 
  | 'other_income' 
  | 'taxation';

export type FinancialStatementType = 'balance_sheet' | 'income_statement';

export interface AccountLink {
  id: string;
  tenant_id: string;
  engagement_id: string;
  account_code: string;
  account_name: string;
  link_number?: string;
  link_description?: string;
  category: AccountCategory;
  fs_type: FinancialStatementType;
  lead_schedule?: string;
  lead_schedule_sub?: string;
  wp_ref?: string;
  opening_balance: number;
  transactions: number;
  adjustments: number;
  closing_balance: number;
  prior_year_balance: number;
  is_active: boolean;
  is_linked: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface TrialBalanceRow extends AccountLink {
  computed_closing: number;  // opening + transactions + adjustments
  variance: number;          // closing - prior_year
}

export interface TrialBalanceSummary {
  total_debits: number;
  total_credits: number;
  is_balanced: boolean;
  difference: number;
  account_count: number;
  linked_count: number;
  unlinked_count: number;
}

// ============================================================================
// LINK MAPPINGS
// ============================================================================

export type StatementType = 
  | 'sofp' 
  | 'soci' 
  | 'soce' 
  | 'scf' 
  | 'notes' 
  | 'detailed_is' 
  | 'tax_computation';

export interface LinkMapping {
  id: string;
  framework: ReportingFramework;
  link_number: string;
  description: string;
  statement: StatementType;
  section?: string;
  line_item?: string;
  parent_link?: string;
  indent_level: number;
  is_subtotal: boolean;
  is_total: boolean;
  sort_order: number;
  normal_balance: 'debit' | 'credit';
  sign_convention: 1 | -1;
}

// ============================================================================
// ADJUSTING ENTRIES
// ============================================================================

export type AdjustingEntryType = 
  | 'adjusting' 
  | 'reclassifying' 
  | 'correcting' 
  | 'tax' 
  | 'consolidation';

export type AdjustingEntryStatus = 
  | 'draft' 
  | 'posted' 
  | 'reviewed' 
  | 'approved' 
  | 'void';

export interface AdjustingEntry {
  id: string;
  tenant_id: string;
  engagement_id: string;
  entry_number?: string;
  entry_date: string;
  description: string;
  reference?: string;
  entry_type: AdjustingEntryType;
  status: AdjustingEntryStatus;
  total_debit: number;
  total_credit: number;
  lines: AdjustingEntryLine[];
  posted_by?: string;
  posted_at?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AdjustingEntryLine {
  id: string;
  entry_id: string;
  engagement_id: string;
  account_code: string;
  account_name?: string;
  description?: string;
  debit_amount: number;
  credit_amount: number;
  sort_order: number;
}

// ============================================================================
// LEAD SCHEDULES
// ============================================================================

export type LeadScheduleStatus = 
  | 'not_started' 
  | 'in_progress' 
  | 'prepared' 
  | 'reviewed' 
  | 'partner_reviewed' 
  | 'exception';

export interface Tickmark {
  symbol: string;
  description: string;
  created_by?: string;
  created_at?: string;
}

export interface LeadSchedule {
  id: string;
  tenant_id: string;
  engagement_id: string;
  schedule_ref: string;
  title: string;
  content: Record<string, unknown>;
  narrative?: string;
  prepared_by?: string;
  prepared_at?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  partner_reviewed_by?: string;
  partner_reviewed_at?: string;
  status: LeadScheduleStatus;
  tickmarks: Tickmark[];
  notes: Array<{ text: string; author?: string; date?: string }>;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// DISCLOSURE CHECKLIST
// ============================================================================

export interface DisclosureItem {
  id: string;
  tenant_id: string;
  engagement_id: string;
  standard_ref?: string;
  section: string;
  detail?: string;
  is_applicable: boolean;
  is_compliant?: boolean;
  effective_date?: string;
  comments?: string;
  sign_off?: string;
  sort_order: number;
}

// ============================================================================
// FINANCIAL STATEMENT OUTPUT
// ============================================================================

export interface StatementLineItem {
  label: string;
  note_ref?: number;
  current_year: number;
  prior_year?: number;
  indent: number;
  is_bold: boolean;
  is_total: boolean;
  is_subtotal: boolean;
  is_blank_line: boolean;
  link_numbers: string[];
}

export interface FinancialStatementSection {
  title: string;
  items: StatementLineItem[];
  subtotal?: number;
  prior_subtotal?: number;
}

export interface StatementOfFinancialPosition {
  entity_name: string;
  registration_number?: string;
  period_end: string;
  framework: string;
  currency: string;
  
  non_current_assets: FinancialStatementSection;
  current_assets: FinancialStatementSection;
  total_assets: number;
  prior_total_assets?: number;
  
  equity: FinancialStatementSection;
  non_current_liabilities: FinancialStatementSection;
  current_liabilities: FinancialStatementSection;
  total_equity_and_liabilities: number;
  prior_total_equity_and_liabilities?: number;
}

export interface StatementOfComprehensiveIncome {
  entity_name: string;
  registration_number?: string;
  period_start: string;
  period_end: string;
  framework: string;
  currency: string;
  presentation: SociPresentation;
  
  revenue: FinancialStatementSection;
  cost_of_sales: FinancialStatementSection;
  gross_profit: number;
  prior_gross_profit?: number;
  
  operating_expenses: FinancialStatementSection;
  operating_profit: number;
  prior_operating_profit?: number;
  
  finance_section: FinancialStatementSection;
  profit_before_tax: number;
  prior_profit_before_tax?: number;
  
  taxation: FinancialStatementSection;
  profit_for_year: number;
  prior_profit_for_year?: number;
  
  other_comprehensive_income?: FinancialStatementSection;
  total_comprehensive_income: number;
  prior_total_comprehensive_income?: number;
}

export interface StatementOfChangesInEquity {
  entity_name: string;
  period_start: string;
  period_end: string;
  columns: string[];  // e.g. ['Share capital', 'Retained income', 'Total']
  rows: Array<{
    label: string;
    values: number[];
    is_bold: boolean;
    is_total: boolean;
  }>;
}

export interface StatementOfCashFlows {
  entity_name: string;
  period_start: string;
  period_end: string;
  method: CashFlowMethod;
  
  operating_activities: FinancialStatementSection;
  investing_activities: FinancialStatementSection;
  financing_activities: FinancialStatementSection;
  
  net_change: number;
  opening_cash: number;
  closing_cash: number;
}

// ============================================================================
// IMPORT / EXPORT
// ============================================================================

export type ImportSource = 
  | 'manual' 
  | 'csv' 
  | 'excel' 
  | 'sage' 
  | 'xero' 
  | 'quickbooks' 
  | 'siyabusa_gl' 
  | 'pastel' 
  | 'caseware';

export interface ImportHistory {
  id: string;
  tenant_id: string;
  engagement_id: string;
  source: ImportSource;
  file_name?: string;
  accounts_imported: number;
  accounts_matched: number;
  accounts_unmatched: number;
  total_debits: number;
  total_credits: number;
  is_balanced: boolean;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'rolled_back';
  error_log?: string;
  imported_at: string;
  imported_by?: string;
}

// ============================================================================
// STATEMENT SNAPSHOTS
// ============================================================================

export type SnapshotStatementType = 
  | 'full_set' 
  | 'sofp' 
  | 'soci' 
  | 'soce' 
  | 'scf' 
  | 'notes' 
  | 'detailed_is' 
  | 'tax_computation' 
  | 'directors_report' 
  | 'compilation_report';

export interface StatementSnapshot {
  id: string;
  tenant_id: string;
  engagement_id: string;
  version: number;
  statement_type: SnapshotStatementType;
  rendered_html?: string;
  rendered_data?: Record<string, unknown>;
  pdf_url?: string;
  generated_at: string;
  generated_by?: string;
  is_draft: boolean;
  watermark?: string;
  notes?: string;
}

// ============================================================================
// FINANCIAL NOTES
// ============================================================================

export interface FinancialNote {
  id: string;
  tenant_id: string;
  engagement_id: string;
  note_number: number;
  title: string;
  structured_data: Record<string, unknown>;
  narrative?: string;
  is_applicable: boolean;
  is_auto_generated: boolean;
  source_links: string[];
  sort_order: number;
}

// ============================================================================
// XBRL
// ============================================================================

export interface XbrlMapping {
  id: string;
  framework: string;
  link_number?: string;
  xbrl_element: string;
  xbrl_namespace?: string;
  xbrl_period_type?: 'instant' | 'duration';
  xbrl_balance_type?: 'debit' | 'credit';
  taxonomy_version?: string;
}

// ============================================================================
// API Response types
// ============================================================================

export interface ReportingApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  meta?: {
    total?: number;
    page?: number;
    per_page?: number;
  };
}
