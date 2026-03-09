import React, { useState, useRef, useCallback } from 'react';
import {
  Upload, FileSpreadsheet, CheckCircle, AlertTriangle, ArrowRight, ArrowLeft,
  Download, X, Loader2, Users, Receipt, BookOpen, Package, Wallet, Building2
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

type DataType = 'chart-of-accounts' | 'customers' | 'suppliers' | 'invoices' | 'bills' | 'products' | 'bank-transactions' | 'employees' | 'assets';

const dataTypes: Array<{ id: DataType; label: string; icon: React.ReactNode; desc: string; template: string }> = [
  { id: 'chart-of-accounts', label: 'Chart of Accounts', icon: <BookOpen size={20} />, desc: 'GL accounts, types, categories', template: 'chart-of-accounts-template.csv' },
  { id: 'customers', label: 'Customers', icon: <Users size={20} />, desc: 'Customer contacts & details', template: 'customers-template.csv' },
  { id: 'suppliers', label: 'Suppliers', icon: <Users size={20} />, desc: 'Supplier contacts & details', template: 'suppliers-template.csv' },
  { id: 'invoices', label: 'Invoices', icon: <Receipt size={20} />, desc: 'Sales invoices & credit notes', template: 'invoices-template.csv' },
  { id: 'bills', label: 'Bills', icon: <Receipt size={20} />, desc: 'Purchase bills & expenses', template: 'bills-template.csv' },
  { id: 'products', label: 'Products & Inventory', icon: <Package size={20} />, desc: 'Items, prices, stock', template: 'products-template.csv' },
  { id: 'bank-transactions', label: 'Bank Transactions', icon: <Wallet size={20} />, desc: 'Bank feeds & reconciled txns', template: 'bank-transactions-template.csv' },
  { id: 'employees', label: 'Employees', icon: <Users size={20} />, desc: 'Staff records & payroll', template: 'employees-template.csv' },
  { id: 'assets', label: 'Fixed Assets', icon: <Building2 size={20} />, desc: 'Asset register & depreciation', template: 'assets-template.csv' },
];

// Target field mappings per data type
const targetFields: Record<DataType, Array<{ field: string; label: string; required: boolean }>> = {
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

// Auto-mapping heuristics
function autoMapColumns(sourceColumns: string[], dataType: DataType): ColumnMapping[] {
  const targets = targetFields[dataType];
  const mappings: ColumnMapping[] = [];

  for (const col of sourceColumns) {
    const normalised = col.toLowerCase().replace(/[^a-z0-9]/g, '');
    let bestMatch = '';
    let bestConfidence = 0;

    for (const target of targets) {
      const targetNorm = target.field.replace(/_/g, '');
      const labelNorm = target.label.toLowerCase().replace(/[^a-z0-9]/g, '');

      // Exact match
      if (normalised === targetNorm || normalised === labelNorm) {
        bestMatch = target.field;
        bestConfidence = 1;
        break;
      }

      // Contains match
      if (normalised.includes(targetNorm) || targetNorm.includes(normalised) ||
          normalised.includes(labelNorm) || labelNorm.includes(normalised)) {
        const conf = 0.7;
        if (conf > bestConfidence) {
          bestMatch = target.field;
          bestConfidence = conf;
        }
      }

      // Common aliases
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
      };

      const fieldAliases = aliases[target.field] || [];
      if (fieldAliases.some(a => normalised.includes(a) || a.includes(normalised))) {
        const conf = 0.8;
        if (conf > bestConfidence) {
          bestMatch = target.field;
          bestConfidence = conf;
        }
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

    const mappings = autoMapColumns(headers, selectedDataType);
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
                        <strong>{dt.label}</strong>
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
