import React, { useState, useEffect } from 'react';
import {
  Card, Row, Col, Table, Button, Input, Select, Tag, Space, Modal, Form,
  InputNumber, message, Statistic, Typography, Empty, Tooltip, DatePicker, Divider, Badge,
} from 'antd';
import {
  FileTextOutlined, PlusOutlined, SearchOutlined, EyeOutlined,
  SyncOutlined, SendOutlined, ShoppingCartOutlined, DollarOutlined, DeleteOutlined,
} from '@ant-design/icons';
import { workspaceApi } from '../../../services/api.service';

const { Text } = Typography;
const { Option } = Select;

interface Quotation {
  id: number;
  quotation_number?: string;
  quote_number?: string;
  customer_id?: number;
  customer_name?: string;
  quotation_date?: string;
  valid_until?: string;
  subtotal?: number;
  tax_amount?: number;
  total_amount?: number;
  status: string;
  notes?: string;
  created_at?: string;
}

const QuotationManagement: React.FC = () => {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<Quotation | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const [allCustomers, setAllCustomers] = useState<{ id: number; name: string }[]>([]);
  const [lines, setLines] = useState<{ description: string; qty: number; rate: number; unit: string }[]>([]);

  useEffect(() => { fetchQuotations(); loadCustomers(); }, []);

  const extractList = (response: any, ...keys: string[]) => {
    if (Array.isArray(response)) return response;
    for (const k of keys) { if (Array.isArray(response?.[k])) return response[k]; }
    for (const k of keys) { if (Array.isArray(response?.data?.[k])) return response.data[k]; }
    if (Array.isArray(response?.data)) return response.data;
    return [];
  };

  const fetchQuotations = async () => {
    setLoading(true);
    try {
      const response: any = await workspaceApi.sales.getQuotations({ limit: 100 });
      console.log('[Quotations] response:', JSON.stringify(response).slice(0, 300));
      const list = extractList(response, 'data', 'quotations');
      setQuotations(list.map((q: any) => ({
        total_amount: q.total_amount ?? q.total,
        tax_amount: q.tax_amount ?? q.vat_amount,
        ...q, id: q.quotation_id || q.id,
        quotation_number: q.quotation_number || q.quote_number || `Q-${q.id}`,
      })));
    } catch (err) { console.error('[Quotations] error:', err); message.error('Failed to load quotations'); }
    finally { setLoading(false); }
  };

  const loadCustomers = async () => {
    try {
      const res: any = await workspaceApi.sales.getCustomers({ limit: 200 });
      const list = extractList(res, 'data', 'customers');
      setAllCustomers(list.map((c: any) => ({
        id: c.customer_id || c.id,
        name: c.company_name || c.customer_name || c.name || 'Unnamed',
      })));
    } catch { /* ignore */ }
  };

  const handleCreate = async (asDraft = true) => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const lineTotal = lines.reduce((s, l) => s + l.qty * l.rate, 0);
      const tax = lineTotal * 0.15;
      await workspaceApi.sales.createQuotation({
        customer_id: values.customer_id,
        valid_until: values.valid_until?.toDate?.()?.toISOString() || values.valid_until?.toISOString?.(),
        subtotal: lineTotal, tax_amount: tax, total_amount: lineTotal + tax,
        notes: values.notes, status: asDraft ? 'draft' : 'sent',
        lines: lines.map((l, i) => ({
          line_number: i + 1, description: l.description, quantity: l.qty,
          unit_of_measure: l.unit, unit_price: l.rate, discount_percentage: 0,
          tax_rate: 15, line_total: l.qty * l.rate * 1.15,
        })),
      });
      message.success(asDraft ? 'Quote saved as draft' : 'Quote created & sent');
      setShowModal(false); form.resetFields(); setLines([]); fetchQuotations();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.message || 'Failed to create quote');
    } finally { setSaving(false); }
  };

  const formatCurrency = (v: number) => `R ${(v || 0).toLocaleString('en-ZA')}`;

  const statusColors: Record<string, string> = {
    draft: 'default', sent: 'processing', viewed: 'purple', accepted: 'success',
    rejected: 'error', expired: 'warning', converted: 'cyan',
  };

  const filtered = quotations.filter(q => {
    const matchSearch = !searchTerm || (q.quotation_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (q.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = !filterStatus || (q.status || '').toLowerCase() === filterStatus.toLowerCase();
    return matchSearch && matchStatus;
  });

  const columns = [
    {
      title: 'Quote #', dataIndex: 'quotation_number', key: 'num', width: 140,
      render: (t: string) => <Text strong style={{ color: '#667eea' }}>{t}</Text>,
      sorter: (a: Quotation, b: Quotation) => (a.quotation_number || '').localeCompare(b.quotation_number || ''),
    },
    { title: 'Customer', dataIndex: 'customer_name', key: 'customer', ellipsis: true },
    {
      title: 'Date', key: 'date', width: 110,
      render: (_: any, r: Quotation) => r.quotation_date ? new Date(r.quotation_date).toLocaleDateString('en-ZA') : '—',
      sorter: (a: Quotation, b: Quotation) => (a.quotation_date || '').localeCompare(b.quotation_date || ''),
    },
    {
      title: 'Valid Until', key: 'valid', width: 110,
      render: (_: any, r: Quotation) => r.valid_until ? new Date(r.valid_until).toLocaleDateString('en-ZA') : '—',
    },
    {
      title: 'Amount', dataIndex: 'total_amount', key: 'amount', width: 140,
      render: (v: number) => <Text strong>{formatCurrency(v)}</Text>,
      sorter: (a: Quotation, b: Quotation) => (a.total_amount || 0) - (b.total_amount || 0),
    },
    {
      title: 'Status', dataIndex: 'status', key: 'status', width: 110,
      render: (s: string) => <Tag color={statusColors[(s || '').toLowerCase()] || 'default'}>{(s || 'Draft').toUpperCase()}</Tag>,
    },
    {
      title: 'Actions', key: 'actions', width: 120,
      render: (_: any, r: Quotation) => (
        <Space size="small">
          <Tooltip title="View"><Button type="text" size="small" icon={<EyeOutlined />} onClick={() => { setSelectedQuote(r); setShowDetailModal(true); }} /></Tooltip>
          {(r.status || '').toLowerCase() === 'draft' && (
            <Tooltip title="Send">
              <Button type="text" size="small" icon={<SendOutlined />} style={{ color: '#1890ff' }} onClick={async () => {
                try {
                  await workspaceApi.sales.sendQuotation(r.id);
                  message.success(`Quote ${r.quotation_number} sent`);
                  fetchQuotations();
                } catch (e: any) { message.error(e?.message || 'Failed to send quote'); }
              }} />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  const totalValue = quotations.reduce((s, q) => s + (q.total_amount || 0), 0);
  const draftCount = quotations.filter(q => (q.status || '').toLowerCase() === 'draft').length;
  const sentCount = quotations.filter(q => (q.status || '').toLowerCase() === 'sent').length;

  return (
    <>
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={6}><Card><Statistic title="Total Quotations" value={quotations.length} prefix={<FileTextOutlined style={{ color: '#667eea' }} />} /></Card></Col>
        <Col span={6}><Card><Statistic title="Total Value" value={totalValue} prefix="R" valueStyle={{ color: '#667eea' }} /></Card></Col>
        <Col span={6}><Card><Statistic title="Drafts" value={draftCount} valueStyle={{ color: '#8c8c8c' }} /></Card></Col>
        <Col span={6}><Card><Statistic title="Sent / Pending" value={sentCount} valueStyle={{ color: '#1890ff' }} /></Card></Col>
      </Row>

      <Card
        title={<Space><FileTextOutlined style={{ color: '#667eea' }} /><span>All Quotations</span></Space>}
        extra={
          <Space>
            <Input placeholder="Search..." prefix={<SearchOutlined />} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ width: 220 }} allowClear />
            <Select placeholder="All Status" value={filterStatus || undefined} onChange={v => setFilterStatus(v || '')} style={{ width: 130 }} allowClear>
              <Option value="draft">Draft</Option><Option value="sent">Sent</Option>
              <Option value="accepted">Accepted</Option><Option value="expired">Expired</Option>
            </Select>
            <Button icon={<SyncOutlined />} onClick={fetchQuotations} loading={loading} />
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { setLines([]); form.resetFields(); setShowModal(true); }}>New Quotation</Button>
          </Space>
        }
      >
        <Table dataSource={filtered} columns={columns} rowKey="id" loading={loading}
          pagination={{ pageSize: 15, showSizeChanger: true, showTotal: t => `${t} quotations` }} size="middle"
          locale={{ emptyText: <Empty description="No quotations yet" /> }}
        />
      </Card>

      {/* Create Modal */}
      <Modal title="📝 Create Quotation" open={showModal}
        onCancel={() => { setShowModal(false); setLines([]); }}
        footer={[
          <Button key="c" onClick={() => setShowModal(false)}>Cancel</Button>,
          <Button key="d" onClick={() => handleCreate(true)} loading={saving}>Save Draft</Button>,
          <Button key="s" type="primary" onClick={() => handleCreate(false)} loading={saving} icon={<SendOutlined />}>Send Quote</Button>,
        ]} width={800}>
        <Form layout="vertical" form={form}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Customer" name="customer_id" rules={[{ required: true }]}>
                <Select placeholder="Select customer..." showSearch optionFilterProp="children">
                  {allCustomers.map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Valid Until" name="valid_until" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Notes / Terms" name="notes"><Input.TextArea rows={2} /></Form.Item>
          <Divider>Line Items</Divider>
          {lines.map((line, idx) => (
            <Row gutter={8} key={idx} align="middle" style={{ marginBottom: 8 }}>
              <Col span={9}><Input placeholder="Description" value={line.description} onChange={e => { const u = [...lines]; u[idx].description = e.target.value; setLines(u); }} /></Col>
              <Col span={3}><InputNumber min={0.01} step={0.5} value={line.qty} onChange={v => { const u = [...lines]; u[idx].qty = v || 1; setLines(u); }} style={{ width: '100%' }} /></Col>
              <Col span={3}><Select value={line.unit} onChange={v => { const u = [...lines]; u[idx].unit = v; setLines(u); }} style={{ width: '100%' }}>
                <Option value="service">Service</Option><Option value="hrs">Hours</Option><Option value="days">Days</Option>
                <Option value="EA">Each</Option><Option value="month">Monthly</Option><Option value="fixed">Fixed</Option>
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
      <Modal title={selectedQuote ? `Quote ${selectedQuote.quotation_number}` : 'Quote'} open={showDetailModal}
        onCancel={() => setShowDetailModal(false)} footer={<Button onClick={() => setShowDetailModal(false)}>Close</Button>} width={500}>
        {selectedQuote && (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Row gutter={16}>
              <Col span={12}><Text type="secondary">Customer</Text><br /><Text strong>{selectedQuote.customer_name || '—'}</Text></Col>
              <Col span={12}><Text type="secondary">Status</Text><br /><Tag color={statusColors[(selectedQuote.status || '').toLowerCase()]}>{(selectedQuote.status || 'Draft').toUpperCase()}</Tag></Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}><Text type="secondary">Date</Text><br /><Text>{selectedQuote.quotation_date ? new Date(selectedQuote.quotation_date).toLocaleDateString('en-ZA') : '—'}</Text></Col>
              <Col span={12}><Text type="secondary">Valid Until</Text><br /><Text>{selectedQuote.valid_until ? new Date(selectedQuote.valid_until).toLocaleDateString('en-ZA') : '—'}</Text></Col>
            </Row>
            <Divider />
            <Row gutter={16}>
              <Col span={8}><Statistic title="Subtotal" value={selectedQuote.subtotal || 0} prefix="R" /></Col>
              <Col span={8}><Statistic title="VAT" value={selectedQuote.tax_amount || 0} prefix="R" /></Col>
              <Col span={8}><Statistic title="Total" value={selectedQuote.total_amount || 0} prefix="R" valueStyle={{ color: '#10b981', fontWeight: 700 }} /></Col>
            </Row>
          </Space>
        )}
      </Modal>
    </>
  );
};

export default QuotationManagement;
