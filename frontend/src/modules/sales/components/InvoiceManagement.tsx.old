import React, { useState, useEffect } from 'react';
import {
  Card, Row, Col, Table, Button, Input, Select, Tag, Space, Modal, Form,
  InputNumber, message, Statistic, Typography, Empty, Tooltip, DatePicker, Divider,
} from 'antd';
import {
  DollarOutlined, PlusOutlined, SearchOutlined, EyeOutlined,
  SyncOutlined, FileTextOutlined, SendOutlined,
} from '@ant-design/icons';
import { workspaceApi } from '../../../services/api.service';

const { Text } = Typography;
const { Option } = Select;

interface Invoice {
  id: number;
  invoice_number?: string;
  customer_id?: number;
  customer_name?: string;
  invoice_date?: string;
  due_date?: string;
  subtotal?: number;
  tax_amount?: number;
  total_amount?: number;
  amount_paid?: number;
  amount_due?: number;
  status: string;
  payment_status?: string;
  invoice_type?: string;
  notes?: string;
  created_at?: string;
}

const InvoiceManagement: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [saving, setSaving] = useState(false);
  const [invoiceType, setInvoiceType] = useState<'invoice' | 'proforma'>('invoice');
  const [form] = Form.useForm();
  const [allCustomers, setAllCustomers] = useState<{ id: number; name: string }[]>([]);
  const [lines, setLines] = useState<{ description: string; qty: number; rate: number; unit: string }[]>([]);

  useEffect(() => { fetchInvoices(); loadCustomers(); }, []);

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
      const response: any = await workspaceApi.sales.getInvoices({ limit: 100 });
      console.log('[Invoices] response:', JSON.stringify(response).slice(0, 300));
      const list = extractList(response, 'data', 'invoices');
      setInvoices(list.map((inv: any) => ({
        ...inv, id: inv.invoice_id || inv.id,
        invoice_number: inv.invoice_number || `INV-${inv.id}`,
      })));
    } catch (err) { console.error('[Invoices] error:', err); message.error('Failed to load invoices'); }
    finally { setLoading(false); }
  };

  const loadCustomers = async () => {
    try {
      const res: any = await workspaceApi.sales.getCustomers({ limit: 200 });
      console.log('[Customers] response:', JSON.stringify(res).slice(0, 300));
      const list = extractList(res, 'data', 'customers');
      console.log('[Customers] extracted list:', list.length, 'customers');
      setAllCustomers(list.map((c: any) => ({
        id: c.customer_id || c.id, name: c.company_name || c.customer_name || c.name || 'Unnamed',
      })));
    } catch (err) {
      console.error('[Customers] Failed to load customers:', err);
    }
  };

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const lineTotal = lines.reduce((s, l) => s + l.qty * l.rate, 0);
      const tax = lineTotal * 0.15;
      await workspaceApi.sales.createInvoice({
        customer_id: values.customer_id,
        invoice_date: values.invoice_date?.toDate?.()?.toISOString() || new Date().toISOString(),
        due_date: values.due_date?.toDate?.()?.toISOString(),
        subtotal: lineTotal, tax_amount: tax, total_amount: lineTotal + tax,
        notes: values.notes, invoice_type: invoiceType,
        status: invoiceType === 'proforma' ? 'proforma' : 'draft',
        lines: lines.map((l, i) => ({
          line_number: i + 1, description: l.description, quantity: l.qty,
          unit_of_measure: l.unit, unit_price: l.rate, tax_rate: 15, line_total: l.qty * l.rate * 1.15,
        })),
      });
      message.success(invoiceType === 'proforma' ? 'Pro-forma created' : 'Invoice created');
      setShowModal(false); form.resetFields(); setLines([]); fetchInvoices();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.message || 'Failed to create invoice');
    } finally { setSaving(false); }
  };

  const formatCurrency = (v: number) => `R ${(v || 0).toLocaleString('en-ZA')}`;

  const statusColors: Record<string, string> = {
    draft: 'default', sent: 'processing', paid: 'success', partial: 'warning',
    overdue: 'error', cancelled: 'error', proforma: 'purple', void: 'default',
  };

  const filtered = invoices.filter(inv => {
    const matchSearch = !searchTerm || (inv.invoice_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = !filterStatus || (inv.status || '').toLowerCase() === filterStatus.toLowerCase();
    return matchSearch && matchStatus;
  });

  const columns = [
    {
      title: 'Invoice #', dataIndex: 'invoice_number', key: 'num', width: 140,
      render: (t: string) => <Text strong style={{ color: '#667eea' }}>{t}</Text>,
    },
    { title: 'Customer', dataIndex: 'customer_name', key: 'customer', ellipsis: true },
    {
      title: 'Date', key: 'date', width: 110,
      render: (_: any, r: Invoice) => r.invoice_date ? new Date(r.invoice_date).toLocaleDateString('en-ZA') : '—',
    },
    {
      title: 'Due Date', key: 'due', width: 110,
      render: (_: any, r: Invoice) => {
        if (!r.due_date) return '—';
        const due = new Date(r.due_date);
        const overdue = due < new Date() && (r.status || '').toLowerCase() !== 'paid';
        return <Text type={overdue ? 'danger' : undefined}>{due.toLocaleDateString('en-ZA')}</Text>;
      },
    },
    {
      title: 'Amount', dataIndex: 'total_amount', key: 'amount', width: 130,
      render: (v: number) => <Text strong>{formatCurrency(v)}</Text>,
      sorter: (a: Invoice, b: Invoice) => (a.total_amount || 0) - (b.total_amount || 0),
    },
    {
      title: 'Status', dataIndex: 'status', key: 'status', width: 110,
      render: (s: string) => <Tag color={statusColors[(s || '').toLowerCase()] || 'default'}>{(s || 'Draft').toUpperCase()}</Tag>,
    },
    {
      title: 'Actions', key: 'actions', width: 80,
      render: (_: any, r: Invoice) => (
        <Tooltip title="View"><Button type="text" size="small" icon={<EyeOutlined />} onClick={() => { setSelectedInvoice(r); setShowDetailModal(true); }} /></Tooltip>
      ),
    },
  ];

  const totalValue = invoices.reduce((s, inv) => s + (inv.total_amount || 0), 0);
  const paidCount = invoices.filter(inv => (inv.status || '').toLowerCase() === 'paid').length;
  const overdueCount = invoices.filter(inv => {
    if (!inv.due_date) return false;
    return new Date(inv.due_date) < new Date() && (inv.status || '').toLowerCase() !== 'paid';
  }).length;

  return (
    <>
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={6}><Card><Statistic title="Total Invoices" value={invoices.length} prefix={<DollarOutlined style={{ color: '#667eea' }} />} /></Card></Col>
        <Col span={6}><Card><Statistic title="Total Value" value={totalValue} prefix="R" valueStyle={{ color: '#667eea' }} /></Card></Col>
        <Col span={6}><Card><Statistic title="Paid" value={paidCount} valueStyle={{ color: '#52c41a' }} /></Card></Col>
        <Col span={6}><Card><Statistic title="Overdue" value={overdueCount} valueStyle={{ color: '#ff4d4f' }} /></Card></Col>
      </Row>

      <Card
        title={<Space><DollarOutlined style={{ color: '#667eea' }} /><span>All Invoices</span></Space>}
        extra={
          <Space>
            <Input placeholder="Search..." prefix={<SearchOutlined />} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ width: 220 }} allowClear />
            <Select placeholder="All Status" value={filterStatus || undefined} onChange={v => setFilterStatus(v || '')} style={{ width: 130 }} allowClear>
              <Option value="draft">Draft</Option><Option value="sent">Sent</Option>
              <Option value="paid">Paid</Option><Option value="overdue">Overdue</Option>
            </Select>
            <Button icon={<SyncOutlined />} onClick={fetchInvoices} loading={loading} />
            <Button onClick={() => { setInvoiceType('proforma'); setLines([]); form.resetFields(); setShowModal(true); }}>Pro-forma</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { setInvoiceType('invoice'); setLines([]); form.resetFields(); setShowModal(true); }}>New Invoice</Button>
          </Space>
        }
      >
        <Table dataSource={filtered} columns={columns} rowKey="id" loading={loading}
          pagination={{ pageSize: 15, showSizeChanger: true, showTotal: t => `${t} invoices` }} size="middle"
          locale={{ emptyText: <Empty description="No invoices yet" /> }}
        />
      </Card>

      {/* Create Modal */}
      <Modal title={invoiceType === 'proforma' ? '📋 Create Pro-forma Invoice' : '📄 Create Invoice'} open={showModal}
        onCancel={() => { setShowModal(false); setLines([]); }}
        onOk={handleCreate} okText={invoiceType === 'proforma' ? 'Create Pro-forma' : 'Create Invoice'} confirmLoading={saving} width={800}>
        <div style={{ marginBottom: 16 }}>
          <Space>
            <Button type={invoiceType === 'invoice' ? 'primary' : 'default'} onClick={() => setInvoiceType('invoice')} icon={<DollarOutlined />}>Tax Invoice</Button>
            <Button type={invoiceType === 'proforma' ? 'primary' : 'default'} onClick={() => setInvoiceType('proforma')} icon={<FileTextOutlined />}>Pro-forma</Button>
          </Space>
        </div>
        <Form layout="vertical" form={form}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="Customer" name="customer_id" rules={[{ required: true }]}>
                <Select placeholder="Select customer..." showSearch optionFilterProp="children">
                  {allCustomers.map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}><Form.Item label="Invoice Date" name="invoice_date" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={8}><Form.Item label="Due Date" name="due_date" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
          </Row>
          <Form.Item label="Notes" name="notes"><Input.TextArea rows={2} /></Form.Item>
          <Divider>Line Items</Divider>
          {lines.map((line, idx) => (
            <Row gutter={8} key={idx} align="middle" style={{ marginBottom: 8 }}>
              <Col span={9}><Input placeholder="Description" value={line.description} onChange={e => { const u = [...lines]; u[idx].description = e.target.value; setLines(u); }} /></Col>
              <Col span={3}><InputNumber min={0.01} step={0.5} value={line.qty} onChange={v => { const u = [...lines]; u[idx].qty = v || 1; setLines(u); }} style={{ width: '100%' }} /></Col>
              <Col span={3}><Select value={line.unit} onChange={v => { const u = [...lines]; u[idx].unit = v; setLines(u); }} style={{ width: '100%' }}>
                <Option value="service">Service</Option><Option value="hrs">Hours</Option><Option value="days">Days</Option>
                <Option value="EA">Each</Option><Option value="month">Monthly</Option>
              </Select></Col>
              <Col span={4}><InputNumber prefix="R" min={0} step={100} value={line.rate} onChange={v => { const u = [...lines]; u[idx].rate = v || 0; setLines(u); }} style={{ width: '100%' }} /></Col>
              <Col span={3}><Text strong style={{ color: '#10b981' }}>R {(line.qty * line.rate).toLocaleString('en-ZA')}</Text></Col>
              <Col span={2}><Button type="text" danger size="small" onClick={() => setLines(lines.filter((_, i) => i !== idx))}>✕</Button></Col>
            </Row>
          ))}
          <Button type="dashed" icon={<PlusOutlined />} onClick={() => setLines([...lines, { description: '', qty: 1, rate: 0, unit: 'service' }])} style={{ width: '100%' }}>+ Add Item</Button>
          {lines.length > 0 && (
            <div style={{ textAlign: 'right', marginTop: 16, padding: '12px 16px', background: '#f6ffed', borderRadius: 8 }}>
              <Text>Subtotal: <Text strong>R {lines.reduce((s, l) => s + l.qty * l.rate, 0).toLocaleString('en-ZA')}</Text></Text><br />
              <Text>VAT (15%): <Text strong>R {(lines.reduce((s, l) => s + l.qty * l.rate, 0) * 0.15).toLocaleString('en-ZA')}</Text></Text><br />
              <Text style={{ fontSize: 16 }}>Total: <Text strong style={{ color: '#10b981', fontSize: 18 }}>R {(lines.reduce((s, l) => s + l.qty * l.rate, 0) * 1.15).toLocaleString('en-ZA')}</Text></Text>
            </div>
          )}
        </Form>
      </Modal>

      {/* Detail Modal */}
      <Modal title={selectedInvoice ? `Invoice ${selectedInvoice.invoice_number}` : 'Invoice'} open={showDetailModal}
        onCancel={() => setShowDetailModal(false)} footer={<Button onClick={() => setShowDetailModal(false)}>Close</Button>} width={500}>
        {selectedInvoice && (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Row gutter={16}>
              <Col span={12}><Text type="secondary">Customer</Text><br /><Text strong>{selectedInvoice.customer_name || '—'}</Text></Col>
              <Col span={12}><Text type="secondary">Status</Text><br /><Tag color={statusColors[(selectedInvoice.status || '').toLowerCase()]}>{(selectedInvoice.status || 'Draft').toUpperCase()}</Tag></Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}><Text type="secondary">Invoice Date</Text><br /><Text>{selectedInvoice.invoice_date ? new Date(selectedInvoice.invoice_date).toLocaleDateString('en-ZA') : '—'}</Text></Col>
              <Col span={12}><Text type="secondary">Due Date</Text><br /><Text>{selectedInvoice.due_date ? new Date(selectedInvoice.due_date).toLocaleDateString('en-ZA') : '—'}</Text></Col>
            </Row>
            <Divider />
            <Row gutter={16}>
              <Col span={8}><Statistic title="Subtotal" value={selectedInvoice.subtotal || 0} prefix="R" /></Col>
              <Col span={8}><Statistic title="VAT" value={selectedInvoice.tax_amount || 0} prefix="R" /></Col>
              <Col span={8}><Statistic title="Total" value={selectedInvoice.total_amount || 0} prefix="R" valueStyle={{ color: '#10b981', fontWeight: 700 }} /></Col>
            </Row>
          </Space>
        )}
      </Modal>
    </>
  );
};

export default InvoiceManagement;
