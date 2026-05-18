import React, { useState, useRef, useCallback } from 'react';
import {
  Upload, FileSpreadsheet, CheckCircle, AlertTriangle, ArrowRight, ArrowLeft,
  Download, X, Loader2, Users, Receipt, BookOpen, Package, Wallet, Building2, Database
} from 'lucide-react';
import './MigrationWizard.css';

// Types
interface ColumnMapping {
  sourceColumn: string;
  targetField: string;
  confidence: number;
  preview: string[];
}

interface ValidationResult {
  totalRows: number;
  validRows: number;
  warningRows: number;
  errorRows: number;
  errors: Array<{ row: number; field: string; message: string }>;
  warnings: Array<{ row: number; field: string; message: string }>;
}

interface ImportFile {
  file: File;
  type: string;
  name: string;
  rows: number;
  columns: string[];
  mappings: ColumnMapping[];
  validation: ValidationResult | null;
  status: 'pending' | 'mapped' | 'validated' | 'imported' | 'error';
}

type DataType = 'chart-of-accounts' | 'customers' | 'suppliers' | 'invoices' | 'bills' | 'products' | 'bank-transactions' | 'employees' | 'assets' | 'opening-balances';

const dataTypes: Array<{ id: DataType; label: string; icon: React.ReactNode; desc: string; template: string; recommended?: boolean }> = [
  { id: 'opening-balances', label: 'Opening Balances', icon: <Database size={20} />, desc: 'Trial balance & opening entries', template: 'opening-balances-template.csv', recommended: true },
  { id: 'chart-of-accounts', label: 'Chart of Accounts', icon: <BookOpen size={20} />, desc: 'GL accounts, types, categories', template: 'chart-of-accounts-template.csv', recommended: true },
  { id: 'customers', label: 'Customers', icon: <Users size={20} />, desc: 'Customer contacts & details', template: 'customers-template.csv', recommended: true },
  { id: 'suppliers', label: 'Suppliers', icon: <Users size={20} />, desc: 'Supplier contacts & details', template: 'suppliers-template.csv', recommended: true },
  { id: 'invoices', label: 'Invoices', icon: <Receipt size={20} />, desc: 'Sales invoices & credit notes', template: 'invoices-template.csv' },
  { id: 'bills', label: 'Bills', icon: <Receipt size={20} />, desc: 'Purchase bills & expenses', template: 'bills-template.csv' },
  { id: 'products', label: 'Products & Inventory', icon: <Package size={20} />, desc: 'Items, prices, stock', template: 'products-template.csv' },
  { id: 'bank-transactions', label: 'Bank Transactions', icon: <Wallet size={20} />, desc: 'Bank feeds & reconciled txns', template: 'bank-transactions-template.csv' },
  { id: 'employees', label: 'Employees', icon: <Users size={20} />, desc: 'Staff records & payroll', template: 'employees-template.csv' },
  { id: 'assets', label: 'Fixed Assets', icon: <Building2 size={20} />, desc: 'Asset register & depreciation', template: 'assets-template.csv' },
];

// Target field mappings per data type
const targetFields: Record<DataType, Array<{ field: string; label: string; required: boolean }>> = {
  'opening-balances': [
    { field: 'account_code', label: 'Account Code', required: true },
    { field: 'account_name', label: 'Account Name', required: false },
    { field: 'debit', label: 'Debit Amount', required: false },
    { field: 'credit', label: 'Credit Amount', required: false },
    { field: 'balance', label: 'Balance (signed)', required: false },
    { field: 'date', label: 'Balance Date', required: false },
    { field: 'currency', label: 'Currency', required: false },
    { field: 'description', label: 'Description / Notes', required: false },
  ],
  'chart-of-accounts': [
    { field: 'account_code', label: 'Account Code', required: true },
    { field: 'account_name', label: 'Account Name', required: true },
    { field: 'account_type', label: 'Account Type', required: true },
    { field: 'parent_code', label: 'Parent Account Code', required: false },
    { field: 'tax_code', label: 'Tax Code', required: false },
    { field: 'currency', label: 'Currency', required: false },
    { field: 'description', label: 'Description', required: false },
  ],
  customers: [
    { field: 'name', label: 'Company/Customer Name', required: true },
    { field: 'contact_name', label: 'Contact Person', required: false },
    { field: 'email', label: 'Email', required: false },
    { field: 'phone', label: 'Phone', required: false },
    { field: 'tax_number', label: 'VAT/Tax Number', required: false },
    { field: 'address_line1', label: 'Address Line 1', required: false },
    { field: 'city', label: 'City', required: false },
    { field: 'payment_terms', label: 'Payment Terms (days)', required: false },
  ],
  suppliers: [
    { field: 'name', label: 'Company/Supplier Name', required: true },
    { field: 'contact_name', label: 'Contact Person', required: false },
    { field: 'email', label: 'Email', required: false },
    { field: 'phone', label: 'Phone', required: false },
    { field: 'tax_number', label: 'VAT/Tax Number', required: false },
    { field: 'address_line1', label: 'Address Line 1', required: false },
    { field: 'city', label: 'City', required: false },
    { field: 'payment_terms', label: 'Payment Terms (days)', required: false },
  ],
  invoices: [
    { field: 'invoice_number', label: 'Invoice Number', required: true },
    { field: 'customer_name', label: 'Customer Name', required: true },
    { field: 'date', label: 'Invoice Date', required: true },
    { field: 'due_date', label: 'Due Date', required: false },
    { field: 'description', label: 'Line Description', required: false },
    { field: 'amount', label: 'Amount (excl VAT)', required: true },
    { field: 'tax_amount', label: 'VAT Amount', required: false },
    { field: 'status', label: 'Status (paid/unpaid)', required: false },
    { field: 'account_code', label: 'Revenue Account Code', required: false },
  ],
  bills: [
    { field: 'bill_number', label: 'Bill/Reference Number', required: true },
    { field: 'supplier_name', label: 'Supplier Name', required: true },
    { field: 'date', label: 'Bill Date', required: true },
    { field: 'due_date', label: 'Due Date', required: false },
    { field: 'description', label: 'Line Description', required: false },
    { field: 'amount', label: 'Amount (excl VAT)', required: true },
    { field: 'tax_amount', label: 'VAT Amount', required: false },
    { field: 'status', label: 'Status (paid/unpaid)', required: false },
    { field: 'account_code', label: 'Expense Account Code', required: false },
  ],
  products: [
    { field: 'sku', label: 'SKU/Item Code', required: true },
    { field: 'name', label: 'Product Name', required: true },
    { field: 'description', label: 'Description', required: false },
    { field: 'category', label: 'Category', required: false },
    { field: 'unit_price', label: 'Selling Price', required: false },
    { field: 'cost_price', label: 'Cost Price', required: false },
    { field: 'quantity_on_hand', label: 'Stock on Hand', required: false },
    { field: 'tax_code', label: 'Tax Code', required: false },
  ],
  'bank-transactions': [
    { field: 'date', label: 'Transaction Date', required: true },
    { field: 'description', label: 'Description/Payee', required: true },
    { field: 'amount', label: 'Amount', required: true },
    { field: 'reference', label: 'Reference', required: false },
    { field: 'type', label: 'Type (debit/credit)', required: false },
    { field: 'bank_account', label: 'Bank Account', required: false },
    { field: 'category', label: 'Category', required: false },
  ],
  employees: [
    { field: 'employee_id', label: 'Employee Number', required: true },
    { field: 'first_name', label: 'First Name', required: true },
    { field: 'last_name', label: 'Last Name', required: true },
    { field: 'email', label: 'Email', required: false },
    { field: 'id_number', label: 'SA ID Number', required: false },
    { field: 'tax_number', label: 'Tax Reference', required: false },
    { field: 'department', label: 'Department', required: false },
    { field: 'basic_salary', label: 'Basic Salary', required: false },
    { field: 'start_date', label: 'Start Date', required: false },
  ],
  assets: [
    { field: 'asset_code', label: 'Asset Code', required: true },
    { field: 'name', label: 'Asset Name', required: true },
    { field: 'category', label: 'Asset Category', required: false },
    { field: 'purchase_date', label: 'Purchase Date', required: true },
    { field: 'purchase_cost', label: 'Purchase Cost', required: true },
    { field: 'accumulated_depreciation', label: 'Accumulated Depreciation', required: false },
    { field: 'useful_life_years', label: 'Useful Life (years)', required: false },
    { field: 'depreciation_method', label: 'Depreciation Method', required: false },
    { field: 'location', label: 'Location', required: false },
  ],
};

// Platform-specific column aliases (QuickBooks, Xero, Sage, Pastel export formats)
const platformAliases: Record<string, Record<string, string[]>> = {
  quickbooks: {
    account_code: ['account', 'accountno', 'num', 'number'],
    account_name: ['accountname', 'fullyqualifiedname', 'name'],
    account_type: ['type', 'accounttype', 'classification', 'detailtype'],
    description: ['memo', 'note'],
    amount: ['amount', 'total', 'nettotal', 'netamount'],
    date: ['date', 'txndate', 'transactiondate'],
    due_date: ['duedate', 'dueon'],
    invoice_number: ['num', 'docnumber', 'txnnumber'],
    customer_name: ['name', 'customername', 'customer'],
    supplier_name: ['name', 'vendorname', 'vendor'],
    name: ['name', 'fullname', 'displayname', 'companyname'],
    email: ['primaryemailaddr', 'email', 'emailaddress'],
    phone: ['primaryphone', 'phone'],
    debit: ['debit', 'dr'],
    credit: ['credit', 'cr'],
    balance: ['runningbalance', 'balance', 'amount'],
    sku: ['sku', 'itemcode', 'item'],
    unit_price: ['unitprice', 'salesprice', 'rate'],
    cost_price: ['purchasecost', 'cost'],
    quantity_on_hand: ['qtyonhand', 'quantityonhand', 'qty'],
  },
  xero: {
    account_code: ['code', 'accountcode'],
    account_name: ['name', 'accountname'],
    account_type: ['type', 'accounttype'],
    description: ['description', 'lineamounttype'],
    amount: ['lineamount', 'subtotal', 'nettotal', 'unitamount'],
    tax_amount: ['taxamount', 'totaltax'],
    date: ['date', 'invoicedate'],
    due_date: ['duedate', 'duedatestring'],
    invoice_number: ['invoicenumber', 'reference'],
    bill_number: ['reference', 'invoicenumber'],
    customer_name: ['contactname', 'name'],
    supplier_name: ['contactname', 'name'],
    name: ['name', 'contactname', 'firstname', 'lastname'],
    email: ['emailaddress', 'email'],
    phone: ['phone', 'phonedevice'],
    tax_number: ['taxnumber', 'vatnumber'],
    debit: ['debit', 'dr', 'netdebit'],
    credit: ['credit', 'cr', 'netcredit'],
    balance: ['ytdamount', 'balance'],
    sku: ['code', 'itemcode'],
    unit_price: ['salesprice', 'unitprice'],
    cost_price: ['purchaseprice', 'unitcost'],
    quantity_on_hand: ['quantityonhand', 'purchasedescription'],
  },
  sage: {
    account_code: ['accountno', 'glaccountno', 'accountcode', 'code'],
    account_name: ['description', 'accountdescription', 'name'],
    account_type: ['mainaccountcategory', 'category', 'type'],
    description: ['description', 'memo', 'reference', 'narration'],
    amount: ['nettamount', 'grossamount', 'amount', 'total'],
    tax_amount: ['taxamount', 'vatamount', 'vat'],
    date: ['transactiondate', 'documentdate', 'date'],
    due_date: ['duedate', 'paymentduedate'],
    invoice_number: ['documentno', 'invoicenumber', 'docno'],
    customer_name: ['customer', 'customername', 'debtorname', 'name'],
    supplier_name: ['supplier', 'suppliername', 'creditorname', 'name'],
    name: ['company', 'customername', 'suppliername', 'name'],
    email: ['emailaddress', 'email'],
    phone: ['telephonenumber', 'telephone', 'phone'],
    tax_number: ['vatnumber', 'taxnumber', 'taxref'],
    debit: ['debit', 'dr'],
    credit: ['credit', 'cr'],
    balance: ['balance', 'closingbalance'],
    sku: ['stockcode', 'itemcode', 'code'],
    unit_price: ['unitsellingprice', 'price', 'sellingprice'],
    cost_price: ['unitcost', 'costprice', 'averagecost'],
    quantity_on_hand: ['quantityonhand', 'qtyonhand', 'stockonhand'],
  },
  pastel: {
    account_code: ['glaccountno', 'accountno', 'code', 'accno'],
    account_name: ['description', 'accountdescription'],
    account_type: ['category', 'mainaccountcategory', 'type'],
    description: ['description', 'memo', 'reference'],
    amount: ['amount', 'nettamount', 'total'],
    tax_amount: ['taxamount', 'vatamount'],
    date: ['date', 'transactiondate'],
    due_date: ['duedate'],
    invoice_number: ['invoicenumber', 'docnumber'],
    customer_name: ['customername', 'customer', 'name'],
    supplier_name: ['suppliername', 'supplier', 'name'],
    name: ['company', 'name', 'customername'],
    email: ['email', 'emailaddress'],
    phone: ['telephone', 'phone'],
    tax_number: ['vatnumber', 'vatno'],
    debit: ['debit', 'dr'],
    credit: ['credit', 'cr'],
    balance: ['balance', 'closingbalance'],
    sku: ['stockcode', 'itemcode', 'code'],
    unit_price: ['price', 'unitprice', 'sellingprice'],
    cost_price: ['costprice', 'cost'],
    quantity_on_hand: ['qtyonhand', 'stockonhand'],
  },
};

// Per-platform export instructions shown in the upload step
const exportGuides: Record<string, { title: string; steps: string[] }> = {
  quickbooks: {
    title: 'Exporting from QuickBooks Online',
    steps: [
      'Go to Reports → click "Export" on any report, or use the Gear icon → Export Data.',
      'For Chart of Accounts: Accounting → Chart of Accounts → Export to Excel.',
      'For Customers/Suppliers: Sales → Customers (or Expenses → Vendors) → Export to Excel.',
      'For Invoices: Sales → Invoices → Export, then save as CSV.',
      'For bank transactions: Banking → select account → Export transactions as CSV.',
      'Save each file and upload below. QuickBooks column names are auto-detected.',
    ],
  },
  xero: {
    title: 'Exporting from Xero',
    steps: [
      'Go to Accounting → Reports → Trial Balance → Export as CSV or Excel.',
      'For Chart of Accounts: Accounting → Chart of Accounts → Export.',
      'For Contacts: Contacts → All Contacts → Import/Export → Export Contacts.',
      'For Invoices: Accounts → Sales → All → Export.',
      'For bank transactions: Accounting → Bank Accounts → select account → Export.',
      'Xero columns like *ContactName, *InvoiceNumber are mapped automatically.',
    ],
  },
  sage: {
    title: 'Exporting from Sage Business Cloud',
    steps: [
      'From any list view (Customers, Suppliers, Accounts), click Export → CSV.',
      'For the Trial Balance: Reporting → Trial Balance → Export.',
      'For Chart of Accounts: Accounting → Chart of Accounts → Export.',
      'For Invoices: Sales → Tax Invoices → select all → Export.',
      'Sage column headers like Account No, Description are auto-mapped.',
    ],
  },
  pastel: {
    title: 'Exporting from Sage Pastel Partner / Xpress',
    steps: [
      'Go to File → Export → select the data type (Customers, Suppliers, etc.).',
      'For Ledger Accounts: General Ledger → Account Maintenance → File → Export.',
      'For the Trial Balance: Reports → Trial Balance → Export to Excel, then save as CSV.',
      'For Inventory: Inventory → Stock Items → File → Export.',
      'Pastel uses column names like Account No, Description — mapped automatically.',
    ],
  },
  freshbooks: {
    title: 'Exporting from FreshBooks',
    steps: [
      'Go to Invoices → select all → Export (top right corner).',
      'For Clients: Clients → select all → Export.',
      'For Expenses: Expenses → select all → Export.',
      'FreshBooks exports as CSV — upload directly after download.',
    ],
  },
  csv: {
    title: 'Uploading a custom CSV or Excel file',
    steps: [
      'Ensure your file has a header row as the first row.',
      'Column names can be anything — you will map them to SiyaBusa fields in the next step.',
      'Accepted formats: CSV (.csv), Excel (.xlsx, .xls).',
      'Download a template below to see the expected field names.',
    ],
  },
};

// Auto-mapping heuristics — platform-aware
function autoMapColumns(sourceColumns: string[], dataType: DataType, platform?: string): ColumnMapping[] {
  const targets = targetFields[dataType];
  const mappings: ColumnMapping[] = [];
  const platAliases = platform ? (platformAliases[platform] || {}) : {};

  for (const col of sourceColumns) {
    const normalised = col.toLowerCase().replace(/[^a-z0-9]/g, '');
    let bestMatch = '';
    let bestConfidence = 0;

    for (const target of targets) {
      const targetNorm = target.field.replace(/_/g, '');
      const labelNorm = target.label.toLowerCase().replace(/[^a-z0-9]/g, '');

      // Exact match against field name or label
      if (normalised === targetNorm || normalised === labelNorm) {
        bestMatch = target.field;
        bestConfidence = 1;
        break;
      }

      // Platform-specific aliases (highest secondary confidence)
      const platFieldAliases = platAliases[target.field] || [];
      if (platFieldAliases.some(a => normalised === a.replace(/[^a-z0-9]/g, ''))) {
        if (0.95 > bestConfidence) { bestMatch = target.field; bestConfidence = 0.95; }
        continue;
      }
      if (platFieldAliases.some(a => {
        const an = a.replace(/[^a-z0-9]/g, '');
        return normalised.includes(an) || an.includes(normalised);
      })) {
        if (0.85 > bestConfidence) { bestMatch = target.field; bestConfidence = 0.85; }
      }

      // Contains match
      if (normalised.includes(targetNorm) || targetNorm.includes(normalised) ||
          normalised.includes(labelNorm) || labelNorm.includes(normalised)) {
        if (0.7 > bestConfidence) { bestMatch = target.field; bestConfidence = 0.7; }
      }

      // Generic cross-platform aliases
      const aliases: Record<string, string[]> = {
        account_code: ['accountno', 'accno', 'glcode', 'glaccount', 'accountnumber', 'code'],
        account_name: ['accountname', 'name', 'description', 'accountdescription'],
        account_type: ['type', 'accounttype', 'category', 'classification'],
        name: ['company', 'companyname', 'businessname', 'customername', 'suppliername', 'vendorname'],
        email: ['emailaddress', 'mail', 'contactemail'],
        phone: ['telephone', 'tel', 'contactphone', 'mobile', 'cell'],
        amount: ['total', 'value', 'sum', 'subtotal', 'netamount', 'grossamount'],
        date: ['transactiondate', 'invoicedate', 'billdate', 'purchasedate', 'txndate'],
        due_date: ['duedate', 'paymentdue', 'dueby'],
        description: ['memo', 'note', 'details', 'linedescription', 'narrative', 'particulars'],
        reference: ['ref', 'refno', 'referencenumber', 'transref'],
        sku: ['itemcode', 'productcode', 'barcode', 'itemno'],
        invoice_number: ['invoiceno', 'invno', 'docnumber', 'documentnumber'],
        bill_number: ['billno', 'documentno', 'refno', 'billreference'],
        tax_number: ['vatnumber', 'vatno', 'taxref', 'taxreference'],
        debit: ['dr', 'debitamount', 'debitside'],
        credit: ['cr', 'creditamount', 'creditside'],
        balance: ['closingbalance', 'runningbalance', 'ytdamount'],
      };

      const fieldAliases = aliases[target.field] || [];
      if (fieldAliases.some(a => normalised.includes(a) || a.includes(normalised))) {
        if (0.8 > bestConfidence) { bestMatch = target.field; bestConfidence = 0.8; }
      }
    }

    mappings.push({
      sourceColumn: col,
      targetField: bestMatch,
      confidence: bestConfidence,
      preview: [],
    });
  }

  return mappings;
}

// Parse CSV
function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map(parseLine);
  return { headers, rows };
}

// Wizard steps
const wizardSteps = [
  { label: 'Source', desc: 'Choose your platform' },
  { label: 'Upload', desc: 'Upload your files' },
  { label: 'Map', desc: 'Map columns' },
  { label: 'Review', desc: 'Validate & confirm' },
  { label: 'Import', desc: 'Import data' },
];

const sourcePlatforms = [
  { id: 'quickbooks', name: 'QuickBooks', color: '#2CA01C' },
  { id: 'xero', name: 'Xero', color: '#13B5EA' },
  { id: 'sage', name: 'Sage', color: '#00DC00' },
  { id: 'pastel', name: 'Pastel', color: '#E4002B' },
  { id: 'freshbooks', name: 'FreshBooks', color: '#0075DD' },
  { id: 'csv', name: 'CSV / Excel', color: '#64748b' },
];

const MigrationWizard: React.FC = () => {
  const [step, setStep] = useState(0);
  const [sourcePlatform, setSourcePlatform] = useState('');
  const [showExportGuide, setShowExportGuide] = useState(true);
  const [selectedDataType, setSelectedDataType] = useState<DataType>('chart-of-accounts');
  const [files, setFiles] = useState<ImportFile[]>([]);
  const [currentFile, setCurrentFile] = useState<ImportFile | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<Array<{ type: string; success: boolean; imported: number; errors: number }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const { headers, rows } = parseCSV(text);

    if (headers.length === 0) return;

    const mappings = autoMapColumns(headers, selectedDataType, sourcePlatform);
    // Add preview data to mappings
    mappings.forEach((m, i) => {
      m.preview = rows.slice(0, 3).map(r => r[i] || '');
    });

    const importFile: ImportFile = {
      file,
      type: selectedDataType,
      name: file.name,
      rows: rows.length,
      columns: headers,
      mappings,
      validation: null,
      status: 'mapped',
    };

    setFiles(prev => [...prev.filter(f => f.type !== selectedDataType), importFile]);
    setCurrentFile(importFile);

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [selectedDataType]);

  const updateMapping = (sourceCol: string, newTarget: string) => {
    if (!currentFile) return;
    const updated = {
      ...currentFile,
      mappings: currentFile.mappings.map(m =>
        m.sourceColumn === sourceCol ? { ...m, targetField: newTarget, confidence: newTarget ? 1 : 0 } : m
      ),
    };
    setCurrentFile(updated);
    setFiles(prev => prev.map(f => f.type === updated.type ? updated : f));
  };

  const validateFile = (f: ImportFile): ValidationResult => {
    const required = targetFields[f.type as DataType].filter(t => t.required).map(t => t.field);
    const mapped = f.mappings.filter(m => m.targetField).map(m => m.targetField);
    const missingRequired = required.filter(r => !mapped.includes(r));
    const errors: ValidationResult['errors'] = [];
    const warnings: ValidationResult['warnings'] = [];

    if (missingRequired.length > 0) {
      missingRequired.forEach(field => {
        errors.push({ row: 0, field, message: `Required field "${field}" is not mapped to any column` });
      });
    }

    // Check for empty values in required fields
    const unmappedCount = f.mappings.filter(m => !m.targetField).length;
    if (unmappedCount > 0) {
      warnings.push({ row: 0, field: '', message: `${unmappedCount} columns are not mapped and will be ignored` });
    }

    return {
      totalRows: f.rows,
      validRows: f.rows - errors.length,
      warningRows: warnings.length,
      errorRows: errors.length,
      errors,
      warnings,
    };
  };

  const handleValidateAll = () => {
    const validatedFiles = files.map(f => ({
      ...f,
      validation: validateFile(f),
      status: 'validated' as const,
    }));
    setFiles(validatedFiles);
    if (currentFile) {
      const updated = validatedFiles.find(f => f.type === currentFile.type);
      if (updated) setCurrentFile(updated);
    }
  };

  const handleImport = async () => {
    setImporting(true);
    const results: typeof importResults = [];

    for (const f of files) {
      // Build the mapped data payload 
      const mappedFields = f.mappings
        .filter(m => m.targetField)
        .map(m => ({ source: m.sourceColumn, target: m.targetField }));

      try {
        const token = localStorage.getItem('token');
        const formData = new FormData();
        formData.append('file', f.file);
        formData.append('dataType', f.type);
        formData.append('sourcePlatform', sourcePlatform);
        formData.append('mappings', JSON.stringify(mappedFields));

        const resp = await fetch('/api/v1/migration/import', {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        });

        if (resp.ok) {
          const data = await resp.json();
          results.push({ type: f.type, success: true, imported: data.imported || f.rows, errors: data.errors || 0 });
        } else {
          results.push({ type: f.type, success: false, imported: 0, errors: f.rows });
        }
      } catch {
        results.push({ type: f.type, success: false, imported: 0, errors: f.rows });
      }
    }

    setImportResults(results);
    setImporting(false);
    setStep(4);
  };

  const canProceed = () => {
    switch (step) {
      case 0: return !!sourcePlatform;
      case 1: return files.length > 0;
      case 2: return files.every(f => f.mappings.some(m => m.targetField));
      case 3: return files.every(f => f.validation && f.validation.errorRows === 0);
      default: return false;
    }
  };

  return (
    <div className="migration-wizard">
      {/* Progress bar */}
      <div className="mw-progress">
        {wizardSteps.map((s, i) => (
          <div key={i} className={`mw-step ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}>
            <div className="mw-step-num">
              {i < step ? <CheckCircle size={16} /> : i + 1}
            </div>
            <div className="mw-step-info">
              <span className="mw-step-label">{s.label}</span>
              <span className="mw-step-desc">{s.desc}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="mw-content">
        {/* Step 0: Source platform */}
        {step === 0 && (
          <div className="mw-section">
            <h2>Where are you migrating from?</h2>
            <p className="mw-subtitle">Select your current accounting platform so we can optimise the import.</p>
            <div className="mw-platform-grid">
              {sourcePlatforms.map(p => (
                <button
                  key={p.id}
                  className={`mw-platform-btn ${sourcePlatform === p.id ? 'active' : ''}`}
                  onClick={() => setSourcePlatform(p.id)}
                >
                  <div className="mw-platform-logo" style={{ background: p.color }}>{p.name.slice(0, 2)}</div>
                  <span>{p.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: Upload files */}
        {step === 1 && (
          <div className="mw-section">
            <h2>Upload your data files</h2>
            <p className="mw-subtitle">
              Select a data type and upload the corresponding CSV export from {sourcePlatforms.find(p => p.id === sourcePlatform)?.name || 'your platform'}.
            </p>

            {/* Export guide */}
            {exportGuides[sourcePlatform] && (
              <div className="mw-export-guide">
                <div className="mw-export-guide-header" onClick={() => setShowExportGuide(v => !v)}>
                  <FileSpreadsheet size={16} />
                  <strong>{exportGuides[sourcePlatform].title}</strong>
                  <span className="mw-guide-toggle">{showExportGuide ? '▲ Hide' : '▼ Show'}</span>
                </div>
                {showExportGuide && (
                  <ol className="mw-export-steps">
                    {exportGuides[sourcePlatform].steps.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ol>
                )}
              </div>
            )}

            <div className="mw-upload-layout">
              <div className="mw-data-types">
                {dataTypes.map(dt => {
                  const uploaded = files.find(f => f.type === dt.id);
                  return (
                    <button
                      key={dt.id}
                      className={`mw-dtype-btn ${selectedDataType === dt.id ? 'active' : ''} ${uploaded ? 'has-file' : ''}`}
                      onClick={() => setSelectedDataType(dt.id)}
                    >
                      <div className="mw-dtype-icon">{dt.icon}</div>
                      <div className="mw-dtype-info">
                        <strong>{dt.label}{dt.recommended && !uploaded ? <span className="mw-recommended"> ★</span> : null}</strong>
                        <span>{uploaded ? `${uploaded.name} (${uploaded.rows} rows)` : dt.desc}</span>
                      </div>
                      {uploaded && <CheckCircle size={16} className="mw-dtype-check" />}
                    </button>
                  );
                })}
              </div>

              <div className="mw-upload-area">
                <div
                  className="mw-dropzone"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={32} />
                  <p><strong>Click to upload</strong> or drag & drop</p>
                  <span>CSV, Excel (.xlsx) — max 50MB</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />
                </div>

                <div className="mw-template-link">
                  <Download size={14} />
                  <span>Download {dataTypes.find(d => d.id === selectedDataType)?.label} template</span>
                </div>

                {files.length > 0 && (
                  <div className="mw-file-list">
                    <h4>Uploaded files ({files.length})</h4>
                    {files.map(f => (
                      <div key={f.type} className="mw-file-item">
                        <FileSpreadsheet size={16} />
                        <div>
                          <strong>{dataTypes.find(d => d.id === f.type)?.label}</strong>
                          <span>{f.name} — {f.rows} rows, {f.columns.length} columns</span>
                        </div>
                        <button className="mw-file-remove" onClick={() => {
                          setFiles(prev => prev.filter(pf => pf.type !== f.type));
                          if (currentFile?.type === f.type) setCurrentFile(null);
                        }}>
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Column mapping */}
        {step === 2 && (
          <div className="mw-section">
            <h2>Map your columns</h2>
            <p className="mw-subtitle">
              We auto-detected most mappings. Review and correct any that need adjustment.
            </p>

            <div className="mw-map-tabs">
              {files.map(f => (
                <button
                  key={f.type}
                  className={`mw-map-tab ${currentFile?.type === f.type ? 'active' : ''}`}
                  onClick={() => setCurrentFile(f)}
                >
                  {dataTypes.find(d => d.id === f.type)?.label}
                </button>
              ))}
            </div>

            {currentFile && (
              <div className="mw-mapping-table">
                <div className="mw-map-header">
                  <span>Your Column</span>
                  <span>Maps To</span>
                  <span>Confidence</span>
                  <span>Preview</span>
                </div>
                {currentFile.mappings.map((m) => (
                  <div key={m.sourceColumn} className="mw-map-row">
                    <div className="mw-map-source">{m.sourceColumn}</div>
                    <div className="mw-map-target">
                      <select
                        value={m.targetField}
                        onChange={(e) => updateMapping(m.sourceColumn, e.target.value)}
                      >
                        <option value="">-- skip --</option>
                        {targetFields[currentFile.type as DataType].map(t => (
                          <option key={t.field} value={t.field}>
                            {t.label} {t.required ? '*' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="mw-map-confidence">
                      <div className={`mw-conf-badge ${m.confidence >= 0.8 ? 'high' : m.confidence >= 0.5 ? 'med' : 'low'}`}>
                        {m.confidence >= 0.8 ? 'Auto' : m.confidence >= 0.5 ? 'Review' : m.targetField ? 'Manual' : '—'}
                      </div>
                    </div>
                    <div className="mw-map-preview">
                      {m.preview.slice(0, 2).map((v, i) => (
                        <span key={i} className="mw-preview-val">{v || '(empty)'}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Review & validate */}
        {step === 3 && (
          <div className="mw-section">
            <h2>Review & confirm import</h2>
            <p className="mw-subtitle">We've validated your data. Review the results below.</p>

            {files.map(f => (
              <div key={f.type} className="mw-validation-card">
                <div className="mw-val-header">
                  <strong>{dataTypes.find(d => d.id === f.type)?.label}</strong>
                  <span className="mw-val-file">{f.name}</span>
                </div>
                {f.validation && (
                  <div className="mw-val-stats">
                    <div className="mw-val-stat ok">
                      <CheckCircle size={16} />
                      {f.validation.validRows} valid rows
                    </div>
                    {f.validation.warningRows > 0 && (
                      <div className="mw-val-stat warn">
                        <AlertTriangle size={16} />
                        {f.validation.warningRows} warnings
                      </div>
                    )}
                    {f.validation.errorRows > 0 && (
                      <div className="mw-val-stat err">
                        <X size={16} />
                        {f.validation.errorRows} errors
                      </div>
                    )}
                  </div>
                )}
                {f.validation?.errors.map((e, i) => (
                  <div key={i} className="mw-val-error">
                    <AlertTriangle size={14} />
                    {e.message}
                  </div>
                ))}
                {f.validation?.warnings.map((w, i) => (
                  <div key={i} className="mw-val-warning">
                    <AlertTriangle size={14} />
                    {w.message}
                  </div>
                ))}
              </div>
            ))}

            <button className="mw-validate-btn" onClick={handleValidateAll}>
              <CheckCircle size={16} /> Validate All Files
            </button>
          </div>
        )}

        {/* Step 4: Results */}
        {step === 4 && (
          <div className="mw-section mw-results">
            <div className="mw-results-icon">
              {importResults.every(r => r.success) ? (
                <CheckCircle size={48} className="text-success" />
              ) : (
                <AlertTriangle size={48} className="text-warning" />
              )}
            </div>
            <h2>{importResults.every(r => r.success) ? 'Migration complete!' : 'Migration finished with some issues'}</h2>
            <p className="mw-subtitle">Here's a summary of what was imported.</p>

            <div className="mw-results-list">
              {importResults.map((r, i) => (
                <div key={i} className={`mw-result-item ${r.success ? 'ok' : 'err'}`}>
                  {r.success ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
                  <div>
                    <strong>{dataTypes.find(d => d.id === r.type)?.label}</strong>
                    <span>{r.imported} records imported{r.errors > 0 ? `, ${r.errors} errors` : ''}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      {step < 4 && (
        <div className="mw-nav">
          {step > 0 && (
            <button className="mw-nav-btn secondary" onClick={() => setStep(s => s - 1)}>
              <ArrowLeft size={16} /> Back
            </button>
          )}
          <div style={{ flex: 1 }} />
          {step < 3 && (
            <button
              className="mw-nav-btn primary"
              disabled={!canProceed()}
              onClick={() => {
                if (step === 2) handleValidateAll();
                setStep(s => s + 1);
              }}
            >
              Next <ArrowRight size={16} />
            </button>
          )}
          {step === 3 && (
            <button
              className="mw-nav-btn primary"
              disabled={importing || !canProceed()}
              onClick={handleImport}
            >
              {importing ? <><Loader2 size={16} className="spin" /> Importing...</> : <>Import All Data <ArrowRight size={16} /></>}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default MigrationWizard;
