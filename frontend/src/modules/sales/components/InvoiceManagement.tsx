import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Card, Row, Col, Table, Button, Input, Select, Tag, Space, Modal, Form,
  InputNumber, message, Statistic, Typography, Empty, Tooltip, DatePicker, Divider,
  Switch, Descriptions, Alert, Dropdown,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  DollarOutlined, PlusOutlined, SearchOutlined, EyeOutlined,
  SyncOutlined, FileTextOutlined, SendOutlined, PrinterOutlined,
  CheckCircleOutlined, CloseCircleOutlined, DownloadOutlined,
  MoreOutlined, SwapOutlined, ExclamationCircleOutlined,
} from '@ant-design/icons';
import { workspaceApi } from '../../../services/api.service';

const { Text } = Typography;
const { Option } = Select;

// ─── Types ──────────────────────────────────────────────────────────────────
interface InvoiceLine {
  description: string;
  qty: number;
  rate: number;
  unit: string;
  vat_rate: number;
}

interface Invoice {
  id: number;
  invoice_id?: number;
  invoice_number?: string;
  customer_id?: number;
  customer_name?: string;
  invoice_date?: string;
  due_date?: string;
  subtotal?: number;
  tax_amount?: number;
  vat_amount?: number;
  total_amount?: number;
  amount_paid?: number;
  amount_due?: number;
  status: string;
  payment_status?: string;
  invoice_type?: string;
  notes?: string;
  terms_conditions?: string;
  reference?: string;
  created_at?: string;
  lines?: any[];
}

interface CompanyInfo {
  company_name?: string;
  business_name?: string;
  trading_as?: string;
  registration_number?: string;
  vat_number?: string;
  tax_number?: string;
  address?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  bank_name?: string;
  account_name?: string;
  account_number?: string;
  branch_code?: string;
}

interface ServiceItem {
  id: number;
  item_code?: string;
  item_name?: string;
  description?: string;
  selling_price?: number;
  unit_of_measure?: string;
}

// ─── Component ──────────────────────────────────────────────────────────────
const InvoiceManagement: React.FC = () => {
  // Data state
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [allCustomers, setAllCustomers] = useState<{ id: number; name: string; vat_number?: string; email?: string; address?: string }[]>([]);
  const [serviceItems, setServiceItems] = useState<ServiceItem[]>([]);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({});

  // UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [saving, setSaving] = useState(false);
  const [invoiceType, setInvoiceType] = useState<'invoice' | 'proforma'>('invoice');
  const [isVatRegistered, setIsVatRegistered] = useState(true);
  const [form] = Form.useForm();
  const [lines, setLines] = useState<InvoiceLine[]>([]);
  const printRef = useRef<HTMLDivElement>(null);

  // ─── Data Loading ──────────────────────────────────────────────────────
  useEffect(() => {
    fetchInvoices();
    loadCustomers();
    loadServices();
    loadCompanyInfo();
  }, []);

  const extractList = (response: any, ...keys: string[]) => {
    if (Array.isArray(response)) return response;
    for (const k of keys) { if (Array.isArray(response?.[k])) return response[k]; }
    for (const k of keys) { if (Array.isArray(response?.data?.[k])) return response.data[k]; }
    if (Array.isArray(response?.data)) return response.data;
    return [];
  };

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const response: any = await workspaceApi.sales.getInvoices({ limit: 200 });
      const list = extractList(response, 'data', 'invoices');
      setInvoices(list.map((inv: any) => ({
        ...inv,
        id: inv.invoice_id || inv.id,
        invoice_number: inv.invoice_number || `INV-${inv.invoice_id || inv.id}`,
      })));
    } catch (err) {
      console.error('[Invoices] error:', err);
      message.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const loadCustomers = async () => {
    try {
      const res: any = await workspaceApi.sales.getCustomers({ limit: 500 });
      const list = extractList(res, 'data', 'customers');
      setAllCustomers(list.map((c: any) => ({
        id: c.customer_id || c.id,
        name: c.company_name || c.customer_name || c.name || 'Unnamed',
        vat_number: c.vat_number,
        email: c.email || c.primary_email,
        address: c.address || [c.street, c.city, c.province].filter(Boolean).join(', '),
      })));
    } catch (err) {
      console.error('[Customers] Failed to load:', err);
    }
  };

  const loadServices = async () => {
    try {
      const res: any = await workspaceApi.inventory.getProducts({ limit: 500 });
      const list = extractList(res, 'data', 'products', 'items');
      setServiceItems(list.map((item: any) => ({
        id: item.item_id || item.id,
        item_code: item.item_code || item.sku,
        item_name: item.item_name || item.name || item.product_name,
        description: item.description,
        selling_price: parseFloat(item.selling_price || item.price || 0),
        unit_of_measure: item.unit_of_measure || 'EA',
      })));
    } catch (err) {
      console.error('[Services] Failed to load:', err);
    }
  };

  const loadCompanyInfo = async () => {
    try {
      const res: any = await workspaceApi.sales.getCompanySettings();
      const data = res?.data || res?.settings || res || {};
      setCompanyInfo({
        company_name: data.company_name || data.business_name || data.name || '',
        trading_as: data.trading_as || '',
        registration_number: data.registration_number || data.company_registration || '',
        vat_number: data.vat_number || data.tax_number || '',
        tax_number: data.tax_number || '',
        address: data.address || '',
        city: data.city || '',
        province: data.province || data.state || '',
        postal_code: data.postal_code || '',
        country: data.country || 'South Africa',
        phone: data.phone || data.primary_phone || '',
        email: data.email || data.primary_email || '',
        website: data.website || '',
        bank_name: data.bank_name || '',
        account_name: data.account_name || '',
        account_number: data.account_number || '',
        branch_code: data.branch_code || '',
      });
      // Check if company is VAT registered
      if (!data.vat_number && !data.tax_number) {
        setIsVatRegistered(false);
      }
    } catch (err) {
      console.error('[Company] Failed to load:', err);
    }
  };

  // ─── Invoice Actions ──────────────────────────────────────────────────
  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      const vatRate = isVatRegistered ? 15 : 0;
      const lineTotal = lines.reduce((s, l) => s + l.qty * l.rate, 0);
      const taxTotal = isVatRegistered
        ? lines.reduce((s, l) => s + (l.qty * l.rate * (l.vat_rate / 100)), 0)
        : 0;

      await workspaceApi.sales.createInvoice({
        customer_id: values.customer_id,
        invoice_date: values.invoice_date?.format?.('YYYY-MM-DD') || values.invoice_date?.toDate?.()?.toISOString() || new Date().toISOString(),
        due_date: values.due_date?.format?.('YYYY-MM-DD') || values.due_date?.toDate?.()?.toISOString(),
        reference: values.reference,
        notes: values.notes,
        terms_conditions: values.terms_conditions,
        invoice_type: invoiceType,
        is_vat_registered: isVatRegistered,
        vat_rate: vatRate,
        subtotal: lineTotal,
        tax_amount: taxTotal,
        total_amount: lineTotal + taxTotal,
        status: invoiceType === 'proforma' ? 'proforma' : 'draft',
        lines: lines.map((l, i) => ({
          line_number: i + 1,
          description: l.description,
          quantity: l.qty,
          unit_of_measure: l.unit,
          unit_price: l.rate,
          tax_rate: isVatRegistered ? l.vat_rate : 0,
          vat_rate: isVatRegistered ? l.vat_rate : 0,
          vat_amount: isVatRegistered ? (l.qty * l.rate * l.vat_rate / 100) : 0,
          line_total: l.qty * l.rate,
        })),
      });

      message.success(invoiceType === 'proforma' ? 'Pro-forma invoice created' : 'Invoice created');
      setShowModal(false);
      form.resetFields();
      setLines([]);
      fetchInvoices();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.message || 'Failed to create invoice');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (inv: Invoice) => {
    try {
      await workspaceApi.sales.approveInvoice(inv.id);
      message.success('Invoice approved');
      fetchInvoices();
      if (selectedInvoice?.id === inv.id) {
        setSelectedInvoice({ ...inv, status: 'approved' });
      }
    } catch (err: any) {
      message.error(err?.message || 'Failed to approve');
    }
  };

  const handleSend = async (inv: Invoice) => {
    try {
      await workspaceApi.sales.sendInvoice(inv.id);
      message.success('Invoice sent');
      fetchInvoices();
    } catch (err: any) {
      message.error(err?.message || 'Failed to send');
    }
  };

  const handleVoid = async (inv: Invoice) => {
    Modal.confirm({
      title: 'Void Invoice',
      icon: <ExclamationCircleOutlined />,
      content: `Are you sure you want to void invoice ${inv.invoice_number}? This cannot be undone.`,
      okText: 'Void',
      okType: 'danger',
      onOk: async () => {
        try {
          await workspaceApi.sales.voidInvoice(inv.id, 'Voided by user');
          message.success('Invoice voided');
          fetchInvoices();
          setShowDetailModal(false);
        } catch (err: any) {
          message.error(err?.message || 'Failed to void');
        }
      },
    });
  };

  const handleConvertProforma = async (inv: Invoice) => {
    Modal.confirm({
      title: 'Convert Pro-forma to Tax Invoice',
      icon: <SwapOutlined />,
      content: (
        <div>
          <p>Converting this pro-forma to a tax invoice means:</p>
          <ul>
            <li><strong>Revenue will be recognised</strong> — the amount moves from Deferred Revenue to Revenue</li>
            <li>The invoice becomes a binding tax invoice per SARS requirements</li>
            <li>The customer can now claim input VAT (if applicable)</li>
          </ul>
          <p>Only convert after the service/goods have been delivered.</p>
        </div>
      ),
      okText: 'Convert to Tax Invoice',
      onOk: async () => {
        try {
          await workspaceApi.sales.convertProforma(inv.id);
          message.success('Pro-forma converted to tax invoice. Revenue recognised.');
          fetchInvoices();
          setShowDetailModal(false);
        } catch (err: any) {
          message.error(err?.message || 'Failed to convert');
        }
      },
    });
  };

  const handlePrint = useCallback(() => {
    if (!printRef.current) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) { message.error('Pop-up blocked. Please allow pop-ups.'); return; }
    printWindow.document.write(
      '<!DOCTYPE html><html><head><title>Invoice</title>' +
      '<style>' +
      "body { font-family: 'Segoe UI', Tahoma, sans-serif; color: #1e293b; margin: 0; padding: 2cm; }" +
      'table { width: 100%; border-collapse: collapse; }' +
      'th { background: #1e293b; color: white; text-align: left; padding: 10px; font-size: 13px; }' +
      'td { padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }' +
      '@media print { body { padding: 1cm; } }' +
      '</style>' +
      '</head><body>' + printRef.current.innerHTML + '</body></html>'
    );
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 500);
  }, []);

  const handleDownloadPDF = useCallback(() => {
    handlePrint();
    message.info('Use "Save as PDF" in the print dialog to download');
  }, [handlePrint]);

  // ─── View Invoice Detail (fetch with lines) ───────────────────────────
  const viewInvoice = async (inv: Invoice) => {
    setSelectedInvoice(inv);
    setShowDetailModal(true);
    try {
      const res: any = await workspaceApi.sales.getInvoice(inv.id);
      const fullInvoice = res?.data || res;
      if (fullInvoice) {
        setSelectedInvoice({
          ...inv,
          ...fullInvoice,
          id: inv.id,
          invoice_number: fullInvoice.invoice_number || inv.invoice_number,
          lines: fullInvoice.lines || [],
        });
      }
    } catch (err) {
      console.error('Failed to load invoice details:', err);
    }
  };

  // ─── Helpers ──────────────────────────────────────────────────────────
  const formatCurrency = (v: number) => 'R ' + (v || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const statusColors: Record<string, string> = {
    draft: 'default', approved: 'blue', sent: 'processing', posted: 'cyan',
    paid: 'success', partial: 'warning', overdue: 'error',
    cancelled: 'error', proforma: 'purple', void: 'default',
  };

  const getStatusLabel = (s: string) => {
    const labels: Record<string, string> = {
      draft: 'DRAFT', approved: 'APPROVED', sent: 'SENT', posted: 'POSTED',
      paid: 'PAID', partial: 'PARTIAL', overdue: 'OVERDUE',
      cancelled: 'CANCELLED', proforma: 'PRO-FORMA', void: 'VOID',
    };
    return labels[(s || '').toLowerCase()] || (s || 'DRAFT').toUpperCase();
  };

  const getInvoiceTypeLabel = (inv: Invoice) => {
    if (inv.invoice_type === 'proforma' || (inv.status || '').toLowerCase() === 'proforma') return 'Pro-forma';
    return 'Tax Invoice';
  };

  const isProforma = (inv: Invoice) =>
    inv.invoice_type === 'proforma' || (inv.status || '').toLowerCase() === 'proforma';

  // Line item helpers
  const addLine = () => setLines([...lines, { description: '', qty: 1, rate: 0, unit: 'service', vat_rate: isVatRegistered ? 15 : 0 }]);
  const removeLine = (idx: number) => setLines(lines.filter((_, i) => i !== idx));
  const updateLine = (idx: number, field: keyof InvoiceLine, value: any) => {
    const u = [...lines];
    (u[idx] as any)[field] = value;
    setLines(u);
  };

  const lineSubtotal = lines.reduce((s, l) => s + l.qty * l.rate, 0);
  const lineVatTotal = isVatRegistered ? lines.reduce((s, l) => s + (l.qty * l.rate * l.vat_rate / 100), 0) : 0;
  const lineGrandTotal = lineSubtotal + lineVatTotal;

  // Select service item -> populate line
  const handleSelectService = (idx: number, itemId: number) => {
    const item = serviceItems.find(s => s.id === itemId);
    if (item) {
      const u = [...lines];
      u[idx] = {
        ...u[idx],
        description: item.item_name || item.description || '',
        rate: item.selling_price || 0,
        unit: item.unit_of_measure || 'service',
      };
      setLines(u);
    }
  };

  // ─── Filtered Data ────────────────────────────────────────────────────
  const filtered = invoices.filter(inv => {
    const matchSearch = !searchTerm ||
      (inv.invoice_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = !filterStatus || (inv.status || '').toLowerCase() === filterStatus.toLowerCase();
    return matchSearch && matchStatus;
  });

  // ─── Action Menu per Row ──────────────────────────────────────────────
  const getRowActions = (inv: Invoice): MenuProps['items'] => {
    const status = (inv.status || '').toLowerCase();
    const items: MenuProps['items'] = [
      { key: 'view', label: 'View Details', icon: <EyeOutlined /> },
      { key: 'preview', label: 'Preview SARS Invoice', icon: <FileTextOutlined /> },
    ];
    if (status === 'draft') {
      items.push(
        { key: 'approve', label: 'Approve', icon: <CheckCircleOutlined /> },
        { key: 'void', label: 'Void', icon: <CloseCircleOutlined />, danger: true },
      );
    }
    if (status === 'approved' || status === 'draft') {
      items.push({ key: 'send', label: 'Send to Customer', icon: <SendOutlined /> });
    }
    if (isProforma(inv)) {
      items.push({ key: 'convert', label: 'Convert to Tax Invoice', icon: <SwapOutlined /> });
    }
    items.push(
      { type: 'divider' },
      { key: 'print', label: 'Print', icon: <PrinterOutlined /> },
      { key: 'download', label: 'Download PDF', icon: <DownloadOutlined /> },
    );
    return items;
  };

  const handleRowAction = (key: string, inv: Invoice) => {
    switch (key) {
      case 'view': viewInvoice(inv); break;
      case 'preview': viewInvoice(inv).then(() => setShowPreviewModal(true)); break;
      case 'approve': handleApprove(inv); break;
      case 'send': handleSend(inv); break;
      case 'void': handleVoid(inv); break;
      case 'convert': handleConvertProforma(inv); break;
      case 'print': viewInvoice(inv).then(() => { setShowPreviewModal(true); setTimeout(handlePrint, 500); }); break;
      case 'download': viewInvoice(inv).then(() => { setShowPreviewModal(true); setTimeout(handleDownloadPDF, 500); }); break;
    }
  };

  // ─── Table Columns ────────────────────────────────────────────────────
  const columns = [
    {
      title: 'Invoice #', dataIndex: 'invoice_number', key: 'num', width: 140,
      render: (t: string, r: Invoice) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ color: '#667eea' }}>{t}</Text>
          {isProforma(r) && <Tag color="purple" style={{ fontSize: 10, margin: 0 }}>PRO-FORMA</Tag>}
        </Space>
      ),
    },
    { title: 'Customer', dataIndex: 'customer_name', key: 'customer', ellipsis: true },
    {
      title: 'Date', key: 'date', width: 110,
      render: (_: any, r: Invoice) => r.invoice_date ? new Date(r.invoice_date).toLocaleDateString('en-ZA') : '\u2014',
    },
    {
      title: 'Due Date', key: 'due', width: 110,
      render: (_: any, r: Invoice) => {
        if (!r.due_date) return '\u2014';
        const due = new Date(r.due_date);
        const overdue = due < new Date() && !['paid', 'void', 'cancelled'].includes((r.status || '').toLowerCase());
        return <Text type={overdue ? 'danger' : undefined}>{due.toLocaleDateString('en-ZA')}</Text>;
      },
    },
    {
      title: 'Amount', dataIndex: 'total_amount', key: 'amount', width: 140,
      render: (v: number) => <Text strong>{formatCurrency(v)}</Text>,
      sorter: (a: Invoice, b: Invoice) => (a.total_amount || 0) - (b.total_amount || 0),
    },
    {
      title: 'Status', dataIndex: 'status', key: 'status', width: 120,
      render: (s: string) => <Tag color={statusColors[(s || '').toLowerCase()] || 'default'}>{getStatusLabel(s)}</Tag>,
      filters: [
        { text: 'Draft', value: 'draft' }, { text: 'Approved', value: 'approved' },
        { text: 'Sent', value: 'sent' }, { text: 'Paid', value: 'paid' },
        { text: 'Pro-forma', value: 'proforma' }, { text: 'Overdue', value: 'overdue' },
      ],
      onFilter: (v: any, r: Invoice) => (r.status || '').toLowerCase() === v,
    },
    {
      title: 'Actions', key: 'actions', width: 100,
      render: (_: any, r: Invoice) => (
        <Space>
          <Tooltip title="View">
            <Button type="text" size="small" icon={<EyeOutlined />} onClick={() => viewInvoice(r)} />
          </Tooltip>
          <Dropdown menu={{
            items: getRowActions(r),
            onClick: ({ key }) => handleRowAction(key, r),
          }} trigger={['click']}>
            <Button type="text" size="small" icon={<MoreOutlined />} />
          </Dropdown>
        </Space>
      ),
    },
  ];

  // ─── Summary Statistics ────────────────────────────────────────────────
  const totalValue = invoices.reduce((s, inv) => s + (inv.total_amount || 0), 0);
  const paidCount = invoices.filter(inv => (inv.status || '').toLowerCase() === 'paid').length;
  const overdueCount = invoices.filter(inv => {
    if (!inv.due_date) return false;
    return new Date(inv.due_date) < new Date() && !['paid', 'void', 'cancelled'].includes((inv.status || '').toLowerCase());
  }).length;
  const proformaCount = invoices.filter(inv => isProforma(inv)).length;

  // ─── Company full address ─────────────────────────────────────────────
  const companyFullAddress = [companyInfo.address, companyInfo.city, companyInfo.province, companyInfo.postal_code].filter(Boolean).join(', ');

  // ─── SARS Invoice Preview Content ─────────────────────────────────────
  const renderSARSInvoice = (inv: Invoice) => {
    const customer = allCustomers.find(c => c.id === inv.customer_id);
    const invLines = inv.lines || [];
    const subtotal = inv.subtotal || invLines.reduce((s: number, l: any) => s + ((l.quantity || l.qty || 1) * (l.unit_price || l.rate || 0)), 0);
    const vatAmount = inv.tax_amount || inv.vat_amount || 0;
    const total = inv.total_amount || subtotal + vatAmount;
    const isVat = !!companyInfo.vat_number;
    const invoiceLabel = isProforma(inv) ? 'PRO-FORMA INVOICE' : 'TAX INVOICE';

    return (
      <div ref={printRef} style={{ fontFamily: "'Segoe UI', Tahoma, sans-serif", color: '#1e293b', maxWidth: '210mm' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24, paddingBottom: 16, borderBottom: '2px solid #1e293b' }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 'bold', color: '#1e293b', marginBottom: 4, marginTop: 0 }}>
              {invoiceLabel}
            </h1>
            {isProforma(inv) && (
              <div style={{ color: '#7c3aed', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
                This is not a tax invoice. No VAT may be claimed from this document.
              </div>
            )}
            <div style={{ fontSize: 14, color: '#64748b' }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{companyInfo.company_name || companyInfo.trading_as || 'Your Company'}</div>
              {companyInfo.trading_as && companyInfo.company_name !== companyInfo.trading_as && (
                <div>t/a {companyInfo.trading_as}</div>
              )}
              <div>{companyFullAddress}</div>
              {companyInfo.phone && <div>Tel: {companyInfo.phone}</div>}
              {companyInfo.email && <div>Email: {companyInfo.email}</div>}
              {companyInfo.website && <div>Web: {companyInfo.website}</div>}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            {isVat && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>VAT Registration No:</div>
                <div style={{ fontWeight: 'bold', fontSize: 16 }}>{companyInfo.vat_number}</div>
              </div>
            )}
            {companyInfo.registration_number && (
              <div>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>Company Reg No:</div>
                <div style={{ fontWeight: 600 }}>{companyInfo.registration_number}</div>
              </div>
            )}
          </div>
        </div>

        {/* Customer + Invoice Details */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
          <div>
            <h3 style={{ fontSize: 13, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 8, color: '#1e293b' }}>Bill To:</h3>
            <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ fontWeight: 'bold', fontSize: 15, marginBottom: 6 }}>{inv.customer_name || customer?.name || '\u2014'}</div>
              {customer?.vat_number && <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>VAT No: {customer.vat_number}</div>}
              {customer?.address && <div style={{ fontSize: 13, color: '#64748b' }}>{customer.address}</div>}
              {customer?.email && <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>Email: {customer.email}</div>}
            </div>
          </div>
          <div>
            <h3 style={{ fontSize: 13, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 8, color: '#1e293b' }}>Invoice Details:</h3>
            <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: '#64748b', fontSize: 13 }}>Invoice Number:</span>
                <span style={{ fontWeight: 'bold' }}>{inv.invoice_number}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: '#64748b', fontSize: 13 }}>Invoice Date:</span>
                <span style={{ fontWeight: 600 }}>{inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString('en-ZA') : '\u2014'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: '#64748b', fontSize: 13 }}>Due Date:</span>
                <span style={{ fontWeight: 600, color: '#ef4444' }}>{inv.due_date ? new Date(inv.due_date).toLocaleDateString('en-ZA') : '\u2014'}</span>
              </div>
              {inv.reference && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b', fontSize: 13 }}>Reference:</span>
                  <span style={{ fontWeight: 600 }}>{inv.reference}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Line Items */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
          <thead>
            <tr style={{ background: '#1e293b', color: 'white' }}>
              <th style={{ padding: 10, textAlign: 'left', fontSize: 13 }}>Description</th>
              <th style={{ padding: 10, textAlign: 'center', fontSize: 13 }}>Qty</th>
              <th style={{ padding: 10, textAlign: 'right', fontSize: 13 }}>Unit Price</th>
              {isVat && <th style={{ padding: 10, textAlign: 'right', fontSize: 13 }}>VAT %</th>}
              <th style={{ padding: 10, textAlign: 'right', fontSize: 13 }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {invLines.length > 0 ? invLines.map((item: any, idx: number) => {
              const qty = item.quantity || item.qty || 1;
              const price = item.unit_price || item.rate || 0;
              const amount = qty * price;
              return (
                <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: 12, fontSize: 13 }}>{item.description}</td>
                  <td style={{ padding: 12, textAlign: 'center', fontSize: 13 }}>{qty}</td>
                  <td style={{ padding: 12, textAlign: 'right', fontSize: 13 }}>R {parseFloat(String(price)).toFixed(2)}</td>
                  {isVat && <td style={{ padding: 12, textAlign: 'right', fontSize: 13 }}>{item.vat_rate || item.tax_rate || 15}%</td>}
                  <td style={{ padding: 12, textAlign: 'right', fontWeight: 600, fontSize: 13 }}>R {amount.toFixed(2)}</td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan={isVat ? 5 : 4} style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>
                  Line items will appear here
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
          <div style={{ width: 300, background: '#f8fafc', padding: 20, borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid #cbd5e1' }}>
              <span style={{ fontSize: 13, color: '#64748b' }}>Subtotal (excl VAT):</span>
              <span style={{ fontWeight: 600 }}>R {subtotal.toFixed(2)}</span>
            </div>
            {isVat ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid #cbd5e1' }}>
                <span style={{ fontSize: 13, color: '#64748b' }}>VAT (15%):</span>
                <span style={{ fontWeight: 600 }}>R {vatAmount.toFixed(2)}</span>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid #cbd5e1' }}>
                <span style={{ fontSize: 13, color: '#64748b' }}>VAT:</span>
                <span style={{ fontWeight: 600, color: '#94a3b8' }}>Not VAT Registered</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10 }}>
              <span style={{ fontSize: 16, fontWeight: 'bold', color: '#1e293b' }}>TOTAL:</span>
              <span style={{ fontSize: 18, fontWeight: 'bold', color: '#667eea' }}>R {total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Banking Details */}
        {(companyInfo.bank_name || companyInfo.account_number) && (
          <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', padding: 20, borderRadius: 8, marginBottom: 24 }}>
            <h3 style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 12, marginTop: 0 }}>Banking Details for Payment:</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              {companyInfo.bank_name && <div><div style={{ fontSize: 11, opacity: 0.9, marginBottom: 2 }}>Bank Name:</div><div style={{ fontWeight: 600 }}>{companyInfo.bank_name}</div></div>}
              {companyInfo.account_name && <div><div style={{ fontSize: 11, opacity: 0.9, marginBottom: 2 }}>Account Name:</div><div style={{ fontWeight: 600 }}>{companyInfo.account_name}</div></div>}
              {companyInfo.account_number && <div><div style={{ fontSize: 11, opacity: 0.9, marginBottom: 2 }}>Account Number:</div><div style={{ fontWeight: 600 }}>{companyInfo.account_number}</div></div>}
              {companyInfo.branch_code && <div><div style={{ fontSize: 11, opacity: 0.9, marginBottom: 2 }}>Branch Code:</div><div style={{ fontWeight: 600 }}>{companyInfo.branch_code}</div></div>}
            </div>
          </div>
        )}

        {/* Notes */}
        {inv.notes && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: 12, borderRadius: 8, marginBottom: 16 }}>
            <h4 style={{ fontSize: 13, fontWeight: 'bold', color: '#166534', marginBottom: 4, marginTop: 0 }}>Notes:</h4>
            <p style={{ fontSize: 12, color: '#15803d', whiteSpace: 'pre-wrap', margin: 0 }}>{inv.notes}</p>
          </div>
        )}

        {/* Terms */}
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: 12, borderRadius: 8, marginBottom: 16 }}>
          <h4 style={{ fontSize: 13, fontWeight: 'bold', color: '#92400e', marginBottom: 6, marginTop: 0 }}>Payment Terms:</h4>
          <ul style={{ fontSize: 11, color: '#78350f', marginLeft: 20, lineHeight: 1.8, marginBottom: 0, paddingLeft: 0 }}>
            <li>Payment due within 30 days from invoice date</li>
            <li>Please use invoice number as payment reference</li>
            <li>Interest of 2% per month will be charged on overdue accounts</li>
          </ul>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', paddingTop: 12, borderTop: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>
            This is a computer-generated document and is valid without signature
          </div>
          {isVat && !isProforma(inv) && (
            <div style={{ fontSize: 11, color: '#64748b' }}>
              <strong>SARS Tax Compliance:</strong> This invoice complies with the requirements of Section 20 of the VAT Act, 1991
            </div>
          )}
          {isProforma(inv) && (
            <div style={{ fontSize: 11, color: '#7c3aed', fontWeight: 600 }}>
              This pro-forma invoice is not a demand for payment. Revenue is not recognised until goods/services are delivered.
            </div>
          )}
        </div>
      </div>
    );
  };

  // ─── RENDER ────────────────────────────────────────────────────────────
  return (
    <>
      {/* VAT Registration Notice */}
      {!isVatRegistered && !companyInfo.vat_number && (
        <Alert
          message="Your company is not VAT registered"
          description="Invoices will be created without VAT. You can update your VAT registration in Admin Settings."
          type="info"
          showIcon
          closable
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Summary Cards */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={6}>
          <Card size="small"><Statistic title="Total Invoices" value={invoices.length} prefix={<DollarOutlined style={{ color: '#667eea' }} />} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small"><Statistic title="Total Value" value={totalValue} prefix="R" precision={2} valueStyle={{ color: '#667eea' }} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small"><Statistic title="Paid" value={paidCount} valueStyle={{ color: '#52c41a' }} suffix={proformaCount > 0 ? <Tag color="purple" style={{ fontSize: 10, marginLeft: 4 }}>{proformaCount} pro-forma</Tag> : undefined} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small"><Statistic title="Overdue" value={overdueCount} valueStyle={{ color: '#ff4d4f' }} /></Card>
        </Col>
      </Row>

      {/* Invoice List */}
      <Card
        title={<Space><DollarOutlined style={{ color: '#667eea' }} /><span>All Invoices</span></Space>}
        extra={
          <Space wrap>
            <Input placeholder="Search..." prefix={<SearchOutlined />} value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)} style={{ width: 200 }} allowClear />
            <Select placeholder="All Status" value={filterStatus || undefined}
              onChange={v => setFilterStatus(v || '')} style={{ width: 130 }} allowClear>
              <Option value="draft">Draft</Option>
              <Option value="approved">Approved</Option>
              <Option value="sent">Sent</Option>
              <Option value="paid">Paid</Option>
              <Option value="proforma">Pro-forma</Option>
              <Option value="overdue">Overdue</Option>
            </Select>
            <Button icon={<SyncOutlined />} onClick={fetchInvoices} loading={loading} />
            <Button icon={<FileTextOutlined />}
              onClick={() => { setInvoiceType('proforma'); setLines([]); form.resetFields(); setShowModal(true); }}>
              Pro-forma
            </Button>
            <Button type="primary" icon={<PlusOutlined />}
              onClick={() => { setInvoiceType('invoice'); setLines([]); form.resetFields(); setShowModal(true); }}>
              New Invoice
            </Button>
          </Space>
        }
      >
        <Table
          dataSource={filtered}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 15, showSizeChanger: true, showTotal: t => `${t} invoices` }}
          size="middle"
          locale={{ emptyText: <Empty description="No invoices yet. Create your first invoice!" /> }}
        />
      </Card>

      {/* ================================================================ */}
      {/* CREATE INVOICE MODAL                                             */}
      {/* ================================================================ */}
      <Modal
        title={invoiceType === 'proforma' ? 'Create Pro-forma Invoice' : 'Create Tax Invoice'}
        open={showModal}
        onCancel={() => { setShowModal(false); setLines([]); }}
        onOk={handleCreate}
        okText={invoiceType === 'proforma' ? 'Create Pro-forma' : 'Create Invoice'}
        confirmLoading={saving}
        width={900}
        destroyOnClose
      >
        {/* Invoice Type Toggle */}
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <Button
              type={invoiceType === 'invoice' ? 'primary' : 'default'}
              onClick={() => setInvoiceType('invoice')}
              icon={<DollarOutlined />}
            >
              Tax Invoice
            </Button>
            <Button
              type={invoiceType === 'proforma' ? 'primary' : 'default'}
              onClick={() => setInvoiceType('proforma')}
              icon={<FileTextOutlined />}
              style={invoiceType === 'proforma' ? { background: '#7c3aed', borderColor: '#7c3aed' } : {}}
            >
              Pro-forma
            </Button>
          </Space>
          <Space>
            <Text type="secondary">VAT Registered:</Text>
            <Switch
              checked={isVatRegistered}
              onChange={setIsVatRegistered}
              checkedChildren="Yes"
              unCheckedChildren="No"
            />
          </Space>
        </div>

        {/* Pro-forma explanation */}
        {invoiceType === 'proforma' && (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message="Pro-forma Invoice"
            description={
              <span>
                A pro-forma invoice is issued <strong>before</strong> delivering goods/services.
                Accounting: <strong>DR Accounts Receivable, CR Money Received in Advance (Deferred Revenue)</strong>.
                Revenue is only recognised once services are delivered and you convert this to a tax invoice.
              </span>
            }
          />
        )}

        <Form layout="vertical" form={form}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="Customer" name="customer_id" rules={[{ required: true, message: 'Select a customer' }]}>
                <Select placeholder="Select customer..." showSearch optionFilterProp="children" size="large">
                  {allCustomers.map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={5}>
              <Form.Item label="Invoice Date" name="invoice_date" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={5}>
              <Form.Item label="Due Date" name="due_date" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="Reference" name="reference">
                <Input placeholder="PO / Ref number" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Notes" name="notes">
            <Input.TextArea rows={2} placeholder="Additional notes for customer..." />
          </Form.Item>

          <Divider>Line Items</Divider>

          {/* Line Items */}
          {lines.map((line, idx) => (
            <Row gutter={8} key={idx} align="middle" style={{ marginBottom: 8 }}>
              <Col span={serviceItems.length > 0 ? 7 : 9}>
                <Input
                  placeholder="Description"
                  value={line.description}
                  onChange={e => updateLine(idx, 'description', e.target.value)}
                />
              </Col>
              {serviceItems.length > 0 && (
                <Col span={4}>
                  <Select
                    placeholder="Select service..."
                    onChange={(v: number) => handleSelectService(idx, v)}
                    showSearch
                    optionFilterProp="children"
                    allowClear
                    style={{ width: '100%' }}
                    size="small"
                  >
                    {serviceItems.map(s => (
                      <Option key={s.id} value={s.id}>
                        {s.item_name} {s.selling_price ? '(R' + s.selling_price + ')' : ''}
                      </Option>
                    ))}
                  </Select>
                </Col>
              )}
              <Col span={2}>
                <InputNumber
                  min={0.01} step={0.5} value={line.qty}
                  onChange={v => updateLine(idx, 'qty', v || 1)}
                  style={{ width: '100%' }} placeholder="Qty"
                />
              </Col>
              <Col span={3}>
                <Select value={line.unit} onChange={v => updateLine(idx, 'unit', v)} style={{ width: '100%' }}>
                  <Option value="service">Service</Option>
                  <Option value="hrs">Hours</Option>
                  <Option value="days">Days</Option>
                  <Option value="EA">Each</Option>
                  <Option value="month">Monthly</Option>
                  <Option value="km">per KM</Option>
                  <Option value="trip">per Trip</Option>
                </Select>
              </Col>
              <Col span={3}>
                <InputNumber
                  prefix="R" min={0} step={100} value={line.rate}
                  onChange={v => updateLine(idx, 'rate', v || 0)}
                  style={{ width: '100%' }}
                />
              </Col>
              {isVatRegistered && (
                <Col span={2}>
                  <InputNumber
                    min={0} max={100} value={line.vat_rate}
                    onChange={v => updateLine(idx, 'vat_rate', v ?? 15)}
                    style={{ width: '100%' }}
                    formatter={v => v + '%'}
                    parser={v => parseFloat((v || '').replace('%', '')) as any}
                  />
                </Col>
              )}
              <Col span={2}>
                <Text strong style={{ color: '#10b981', fontSize: 12 }}>
                  R {(line.qty * line.rate).toLocaleString('en-ZA')}
                </Text>
              </Col>
              <Col span={1}>
                <Button type="text" danger size="small" onClick={() => removeLine(idx)}>x</Button>
              </Col>
            </Row>
          ))}

          <Button type="dashed" icon={<PlusOutlined />} onClick={addLine} style={{ width: '100%' }}>
            + Add Line Item
          </Button>

          {/* Totals Summary */}
          {lines.length > 0 && (
            <div style={{
              textAlign: 'right', marginTop: 16, padding: '16px 20px',
              background: invoiceType === 'proforma' ? '#faf5ff' : '#f6ffed',
              borderRadius: 8, border: '1px solid ' + (invoiceType === 'proforma' ? '#e9d5ff' : '#b7eb8f'),
            }}>
              <Row justify="end">
                <Col>
                  <div style={{ marginBottom: 4 }}>
                    <Text>Subtotal: </Text>
                    <Text strong>R {lineSubtotal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</Text>
                  </div>
                  {isVatRegistered ? (
                    <div style={{ marginBottom: 4 }}>
                      <Text>VAT (15%): </Text>
                      <Text strong>R {lineVatTotal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</Text>
                    </div>
                  ) : (
                    <div style={{ marginBottom: 4 }}>
                      <Text type="secondary">VAT: Not VAT Registered</Text>
                    </div>
                  )}
                  <div style={{ fontSize: 16, marginTop: 4 }}>
                    <Text>Total: </Text>
                    <Text strong style={{ color: invoiceType === 'proforma' ? '#7c3aed' : '#10b981', fontSize: 20 }}>
                      R {lineGrandTotal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                    </Text>
                  </div>
                </Col>
              </Row>
            </div>
          )}
        </Form>
      </Modal>

      {/* ================================================================ */}
      {/* INVOICE DETAIL MODAL                                             */}
      {/* ================================================================ */}
      <Modal
        title={
          <Space>
            <span>{selectedInvoice ? getInvoiceTypeLabel(selectedInvoice) + ' \u2014 ' + selectedInvoice.invoice_number : 'Invoice'}</span>
            {selectedInvoice && <Tag color={statusColors[(selectedInvoice.status || '').toLowerCase()]}>{getStatusLabel(selectedInvoice.status)}</Tag>}
          </Space>
        }
        open={showDetailModal}
        onCancel={() => setShowDetailModal(false)}
        width={700}
        footer={
          selectedInvoice ? (
            <Space wrap>
              {(selectedInvoice.status || '').toLowerCase() === 'draft' && (
                <Button type="primary" icon={<CheckCircleOutlined />} onClick={() => handleApprove(selectedInvoice)}>
                  Approve
                </Button>
              )}
              {['draft', 'approved'].includes((selectedInvoice.status || '').toLowerCase()) && (
                <Button icon={<SendOutlined />} onClick={() => handleSend(selectedInvoice)}>
                  Send to Customer
                </Button>
              )}
              {isProforma(selectedInvoice) && (
                <Button icon={<SwapOutlined />} onClick={() => handleConvertProforma(selectedInvoice)}
                  style={{ borderColor: '#7c3aed', color: '#7c3aed' }}>
                  Convert to Tax Invoice
                </Button>
              )}
              <Button icon={<PrinterOutlined />} onClick={() => { setShowPreviewModal(true); }}>
                Print / PDF
              </Button>
              {(selectedInvoice.status || '').toLowerCase() === 'draft' && (
                <Button danger icon={<CloseCircleOutlined />} onClick={() => handleVoid(selectedInvoice)}>
                  Void
                </Button>
              )}
              <Button onClick={() => setShowDetailModal(false)}>Close</Button>
            </Space>
          ) : <Button onClick={() => setShowDetailModal(false)}>Close</Button>
        }
      >
        {selectedInvoice && (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            {isProforma(selectedInvoice) && (
              <Alert
                type="warning"
                showIcon
                message="Pro-forma Invoice \u2014 Revenue Not Yet Recognised"
                description="This is a pro-forma invoice. The amount is recorded as Deferred Revenue (liability) until services/goods are delivered. Convert to a tax invoice to recognise revenue."
              />
            )}

            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="Type">{getInvoiceTypeLabel(selectedInvoice)}</Descriptions.Item>
              <Descriptions.Item label="Customer">{selectedInvoice.customer_name || '\u2014'}</Descriptions.Item>
              <Descriptions.Item label="Invoice Date">
                {selectedInvoice.invoice_date ? new Date(selectedInvoice.invoice_date).toLocaleDateString('en-ZA') : '\u2014'}
              </Descriptions.Item>
              <Descriptions.Item label="Due Date">
                {selectedInvoice.due_date ? new Date(selectedInvoice.due_date).toLocaleDateString('en-ZA') : '\u2014'}
              </Descriptions.Item>
              {selectedInvoice.reference && (
                <Descriptions.Item label="Reference" span={2}>{selectedInvoice.reference}</Descriptions.Item>
              )}
            </Descriptions>

            {/* Line Items */}
            {selectedInvoice.lines && selectedInvoice.lines.length > 0 && (
              <Card size="small" title="Line Items">
                <Table
                  dataSource={selectedInvoice.lines}
                  pagination={false}
                  size="small"
                  rowKey={(_: any, i: any) => 'line-' + i}
                  columns={[
                    { title: 'Description', dataIndex: 'description', key: 'desc' },
                    { title: 'Qty', dataIndex: 'quantity', key: 'qty', width: 70, render: (v: number) => v || 1 },
                    { title: 'Unit Price', dataIndex: 'unit_price', key: 'price', width: 110, render: (v: number) => formatCurrency(v) },
                    { title: 'VAT %', dataIndex: 'vat_rate', key: 'vat', width: 70, render: (v: number) => (v || 0) + '%' },
                    { title: 'Amount', key: 'total', width: 120, render: (_: any, r: any) => <Text strong>{formatCurrency((r.quantity || 1) * (r.unit_price || 0))}</Text> },
                  ]}
                />
              </Card>
            )}

            <Row gutter={16}>
              <Col span={8}><Statistic title="Subtotal" value={selectedInvoice.subtotal || 0} prefix="R" precision={2} /></Col>
              <Col span={8}><Statistic title="VAT" value={selectedInvoice.tax_amount || selectedInvoice.vat_amount || 0} prefix="R" precision={2} /></Col>
              <Col span={8}>
                <Statistic
                  title="Total"
                  value={selectedInvoice.total_amount || 0}
                  prefix="R"
                  precision={2}
                  valueStyle={{ color: isProforma(selectedInvoice) ? '#7c3aed' : '#10b981', fontWeight: 700 }}
                />
              </Col>
            </Row>

            {selectedInvoice.notes && (
              <div>
                <Text type="secondary">Notes:</Text>
                <div style={{ background: '#f9fafb', padding: 8, borderRadius: 4, marginTop: 4, whiteSpace: 'pre-wrap' }}>
                  {selectedInvoice.notes}
                </div>
              </div>
            )}
          </Space>
        )}
      </Modal>

      {/* ================================================================ */}
      {/* SARS INVOICE PREVIEW / PRINT MODAL                               */}
      {/* ================================================================ */}
      <Modal
        title={
          <Space>
            <FileTextOutlined />
            <span>Invoice Preview {selectedInvoice ? '\u2014 ' + selectedInvoice.invoice_number : ''}</span>
          </Space>
        }
        open={showPreviewModal}
        onCancel={() => setShowPreviewModal(false)}
        width={900}
        footer={
          <Space>
            <Button icon={<PrinterOutlined />} onClick={handlePrint}>
              Print
            </Button>
            <Button icon={<DownloadOutlined />} onClick={handleDownloadPDF}>
              Download PDF
            </Button>
            <Button type="primary" icon={<SendOutlined />} onClick={() => selectedInvoice && handleSend(selectedInvoice)}>
              Send to Customer
            </Button>
            <Button onClick={() => setShowPreviewModal(false)}>Close</Button>
          </Space>
        }
      >
        {selectedInvoice && renderSARSInvoice(selectedInvoice)}
      </Modal>
    </>
  );
};

export default InvoiceManagement;
