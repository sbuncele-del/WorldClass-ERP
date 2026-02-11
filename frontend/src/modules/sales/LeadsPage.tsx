import React, { useState, useEffect } from 'react';
import {
  Card, Row, Col, Table, Button, Input, Select, Tag, Space, Modal, Form,
  InputNumber, message, Statistic, Typography, Empty, Tooltip, Progress, Popconfirm,
} from 'antd';
import {
  AimOutlined, PlusOutlined, SearchOutlined, EyeOutlined,
  SyncOutlined, PhoneOutlined, MailOutlined, RocketOutlined, SendOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { workspaceApi } from '../../services/api.service';

const { Text } = Typography;
const { Option } = Select;

// DB field names from sales.leads table
interface Lead {
  id: number;
  lead_id?: number;
  lead_number?: string;
  company_name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  source: string;
  industry?: string;
  lead_value?: number;
  probability?: number;
  status: string;
  assigned_to?: string;
  notes?: string;
  next_follow_up?: string;
  converted_to_opportunity_id?: number;
  converted_at?: string;
  created_at?: string;
  updated_at?: string;
}

const buildHeaders = () => {
  const token = localStorage.getItem('token') || localStorage.getItem('authToken') || '';
  const tenantId = localStorage.getItem('tenantId') || localStorage.getItem('workspaceId') || '';
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  if (tenantId) h['X-Tenant-ID'] = tenantId;
  return h;
};

const LeadsPage: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [saving, setSaving] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [form] = Form.useForm();
  const [emailForm] = Form.useForm();

  useEffect(() => { fetchLeads(); }, []);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/sales/leads?limit=200', { method: 'GET', headers: buildHeaders() });
      const json = await res.json();
      const list = Array.isArray(json?.data) ? json.data : Array.isArray(json?.leads) ? json.leads : [];
      setLeads(list.map((l: any) => ({ ...l, id: l.lead_id || l.id })));
    } catch (err) {
      console.error('[Leads] error:', err);
      message.error('Failed to load leads');
    } finally { setLoading(false); }
  };

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const res = await fetch('/api/sales/leads', {
        method: 'POST', headers: buildHeaders(),
        body: JSON.stringify({
          company_name: values.company_name,
          contact_person: values.contact_person,
          email: values.email,
          phone: values.phone,
          source: values.source || 'WEBSITE',
          industry: values.industry,
          lead_value: values.lead_value || 0,
          probability: values.probability || 50,
          status: 'NEW',
          notes: values.notes,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Failed to create lead');
      message.success('Lead created successfully!');
      setShowModal(false); form.resetFields(); fetchLeads();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.message || 'Failed to create lead');
    } finally { setSaving(false); }
  };

  const handleConvert = async (lead: Lead) => {
    try {
      const res = await fetch(`/api/sales/leads/${lead.id}/convert`, {
        method: 'POST', headers: buildHeaders(),
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Failed to convert');
      message.success('Lead converted to opportunity! Check the Opportunities tab.');
      fetchLeads();
    } catch (err: any) {
      message.error(err?.message || 'Failed to convert lead');
    }
  };

  const handleUpdateStatus = async (lead: Lead, newStatus: string) => {
    try {
      await fetch(`/api/sales/leads/${lead.id}`, {
        method: 'PUT', headers: buildHeaders(),
        body: JSON.stringify({ status: newStatus }),
      });
      message.success(`Lead marked as ${newStatus}`);
      fetchLeads();
    } catch { message.error('Failed to update lead'); }
  };

  const handleSendEmail = async () => {
    try {
      const values = await emailForm.validateFields();
      setSendingEmail(true);
      const res = await fetch('/api/v2/communications/email/send', {
        method: 'POST', headers: buildHeaders(),
        body: JSON.stringify({
          to: values.to,
          subject: values.subject,
          content: values.content,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || json.message || 'Email service not configured');
      message.success('Email sent successfully!');
      setShowEmailModal(false); emailForm.resetFields();
    } catch (err: any) {
      message.error(err?.message || 'Email service not configured. Ask admin to set RESEND_API_KEY.');
    } finally { setSendingEmail(false); }
  };

  const openEmailForLead = (lead: Lead) => {
    emailForm.resetFields();
    emailForm.setFieldsValue({
      to: lead.email || '',
      subject: `Following up — ${lead.company_name}`,
      content: `Hi ${lead.contact_person || 'there'},\n\nThank you for your interest. I'd like to discuss how we can work together.\n\nPlease let me know a convenient time for a call.\n\nKind regards`,
    });
    setShowEmailModal(true);
  };

  const fmt = (v: number) => `R ${(v || 0).toLocaleString('en-ZA')}`;
  const statusColors: Record<string, string> = { NEW: 'blue', CONTACTED: 'orange', QUALIFIED: 'green', UNQUALIFIED: 'red', CONVERTED: 'purple' };
  const sourceColors: Record<string, string> = { WEBSITE: 'cyan', REFERRAL: 'green', COLD_CALL: 'orange', TRADE_SHOW: 'purple', SOCIAL_MEDIA: 'blue', LINKEDIN: 'geekblue', Referral: 'green' };

  const filtered = leads.filter(l => {
    const name = (l.company_name || '').toLowerCase();
    const matchSearch = !searchTerm || name.includes(searchTerm.toLowerCase()) ||
      (l.contact_person || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = !filterStatus || (l.status || '').toUpperCase() === filterStatus.toUpperCase();
    return matchSearch && matchStatus;
  });

  const columns: any[] = [
    {
      title: 'Lead', key: 'name',
      render: (_: any, r: Lead) => (
        <div>
          <Text strong>{r.company_name || 'Unnamed'}</Text>
          {r.contact_person && <div><Text type="secondary" style={{ fontSize: 12 }}>{r.contact_person}</Text></div>}
          {r.lead_number && <div><Text type="secondary" style={{ fontSize: 11 }}>{r.lead_number}</Text></div>}
        </div>
      ),
      sorter: (a: Lead, b: Lead) => (a.company_name || '').localeCompare(b.company_name || ''),
    },
    {
      title: 'Contact', key: 'contact', width: 220,
      render: (_: any, r: Lead) => (
        <Space direction="vertical" size={0}>
          {r.email && <Text style={{ fontSize: 12 }}><MailOutlined style={{ marginRight: 4, color: '#667eea' }} />{r.email}</Text>}
          {r.phone && <Text style={{ fontSize: 12 }}><PhoneOutlined style={{ marginRight: 4 }} />{r.phone}</Text>}
        </Space>
      ),
    },
    { title: 'Source', dataIndex: 'source', key: 'source', width: 120, render: (s: string) => <Tag color={sourceColors[s] || 'default'}>{s || '—'}</Tag> },
    {
      title: 'Probability', dataIndex: 'probability', key: 'prob', width: 110,
      render: (v: number) => <Progress percent={v || 0} size="small" strokeColor={v >= 70 ? '#52c41a' : v >= 40 ? '#faad14' : '#ff4d4f'} format={p => `${p}%`} />,
      sorter: (a: Lead, b: Lead) => (a.probability || 0) - (b.probability || 0),
    },
    {
      title: 'Value', dataIndex: 'lead_value', key: 'value', width: 130,
      render: (v: any) => <Text>{fmt(parseFloat(v) || 0)}</Text>,
      sorter: (a: Lead, b: Lead) => (parseFloat(String(a.lead_value)) || 0) - (parseFloat(String(b.lead_value)) || 0),
    },
    { title: 'Status', dataIndex: 'status', key: 'status', width: 120, render: (s: string) => <Tag color={statusColors[s] || 'default'}>{(s || 'NEW')}</Tag> },
    {
      title: 'Actions', key: 'actions', width: 180,
      render: (_: any, r: Lead) => (
        <Space size="small">
          <Tooltip title="View"><Button type="text" size="small" icon={<EyeOutlined />} onClick={() => { setSelectedLead(r); setShowDetailModal(true); }} /></Tooltip>
          {r.email && <Tooltip title="Send Email"><Button type="text" size="small" icon={<MailOutlined style={{ color: '#667eea' }} />} onClick={() => { setSelectedLead(r); openEmailForLead(r); }} /></Tooltip>}
          {(r.status || '').toUpperCase() !== 'CONVERTED' && (
            <Tooltip title="Convert to Opportunity">
              <Popconfirm title="Convert this lead to an opportunity?" onConfirm={() => handleConvert(r)} okText="Convert">
                <Button type="text" size="small" icon={<RocketOutlined style={{ color: '#722ed1' }} />} />
              </Popconfirm>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  const totalLeads = leads.length;
  const newCount = leads.filter(l => (l.status || '').toUpperCase() === 'NEW').length;
  const qualifiedCount = leads.filter(l => (l.status || '').toUpperCase() === 'QUALIFIED').length;
  const totalValue = leads.reduce((s, l) => s + (parseFloat(String(l.lead_value)) || 0), 0);

  return (
    <>
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={6}><Card><Statistic title="Total Leads" value={totalLeads} prefix={<AimOutlined style={{ color: '#667eea' }} />} /></Card></Col>
        <Col span={6}><Card><Statistic title="New" value={newCount} valueStyle={{ color: '#1890ff' }} /></Card></Col>
        <Col span={6}><Card><Statistic title="Qualified" value={qualifiedCount} valueStyle={{ color: '#52c41a' }} /></Card></Col>
        <Col span={6}><Card><Statistic title="Pipeline Value" value={totalValue} prefix="R" valueStyle={{ color: '#667eea' }} /></Card></Col>
      </Row>

      <Card title={<Space><AimOutlined style={{ color: '#667eea' }} /><span>Lead Management</span></Space>}
        extra={<Space>
          <Input placeholder="Search..." prefix={<SearchOutlined />} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ width: 220 }} allowClear />
          <Select placeholder="All Status" value={filterStatus || undefined} onChange={v => setFilterStatus(v || '')} style={{ width: 130 }} allowClear>
            <Option value="NEW">New</Option><Option value="CONTACTED">Contacted</Option>
            <Option value="QUALIFIED">Qualified</Option><Option value="CONVERTED">Converted</Option>
          </Select>
          <Button icon={<SyncOutlined />} onClick={fetchLeads} loading={loading} />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); form.setFieldsValue({ source: 'REFERRAL', probability: 50, lead_value: 0 }); setShowModal(true); }} style={{ background: '#667eea' }}>New Lead</Button>
        </Space>}>
        <Table dataSource={filtered} columns={columns} rowKey="id" loading={loading}
          pagination={{ pageSize: 15, showSizeChanger: true, showTotal: t => `${t} leads` }} size="middle"
          locale={{ emptyText: <Empty description="No leads yet. Click 'New Lead' to add one." /> }} />
      </Card>

      {/* Create Lead Modal */}
      <Modal title="🎯 New Lead" open={showModal} onCancel={() => setShowModal(false)} onOk={handleCreate} okText="Create Lead" confirmLoading={saving} width={700}>
        <Form layout="vertical" form={form}>
          <Row gutter={16}>
            <Col span={12}><Form.Item label="Company / Lead Name" name="company_name" rules={[{ required: true, message: 'Required' }]}><Input placeholder="e.g. Boikago Events Creatives" /></Form.Item></Col>
            <Col span={12}><Form.Item label="Industry" name="industry"><Input placeholder="e.g. Events, Technology" /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}><Form.Item label="Contact Person" name="contact_person"><Input placeholder="e.g. Keagile Kwakwa" /></Form.Item></Col>
            <Col span={8}><Form.Item label="Email" name="email" rules={[{ type: 'email', message: 'Invalid email' }]}><Input prefix={<MailOutlined />} placeholder="email@company.co.za" /></Form.Item></Col>
            <Col span={8}><Form.Item label="Phone" name="phone"><Input prefix={<PhoneOutlined />} placeholder="081 443 0590" /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}><Form.Item label="Source" name="source"><Select><Option value="REFERRAL">Referral</Option><Option value="WEBSITE">Website</Option><Option value="COLD_CALL">Cold Call</Option><Option value="TRADE_SHOW">Trade Show</Option><Option value="SOCIAL_MEDIA">Social Media</Option><Option value="LINKEDIN">LinkedIn</Option></Select></Form.Item></Col>
            <Col span={8}><Form.Item label="Probability (%)" name="probability"><InputNumber style={{ width: '100%' }} min={0} max={100} /></Form.Item></Col>
            <Col span={8}><Form.Item label="Est. Value (R)" name="lead_value"><InputNumber style={{ width: '100%' }} prefix="R" min={0} step={500} /></Form.Item></Col>
          </Row>
          <Form.Item label="Notes" name="notes"><Input.TextArea rows={2} placeholder="Context about this lead..." /></Form.Item>
        </Form>
      </Modal>

      {/* Lead Detail Modal */}
      <Modal title={selectedLead ? `🎯 ${selectedLead.company_name}` : 'Lead'} open={showDetailModal} onCancel={() => setShowDetailModal(false)}
        footer={<Space>
          <Button onClick={() => setShowDetailModal(false)}>Close</Button>
          {selectedLead?.email && <Button icon={<MailOutlined />} onClick={() => { setShowDetailModal(false); openEmailForLead(selectedLead!); }}>Send Email</Button>}
          {selectedLead && (selectedLead.status || '').toUpperCase() === 'NEW' && <Button icon={<CheckCircleOutlined />} onClick={() => { handleUpdateStatus(selectedLead, 'CONTACTED'); setShowDetailModal(false); }}>Mark Contacted</Button>}
          {selectedLead && (selectedLead.status || '').toUpperCase() === 'CONTACTED' && <Button type="primary" style={{ background: '#52c41a' }} icon={<CheckCircleOutlined />} onClick={() => { handleUpdateStatus(selectedLead, 'QUALIFIED'); setShowDetailModal(false); }}>Mark Qualified</Button>}
          {selectedLead && (selectedLead.status || '').toUpperCase() !== 'CONVERTED' && <Button type="primary" icon={<RocketOutlined />} style={{ background: '#722ed1' }} onClick={() => { setShowDetailModal(false); handleConvert(selectedLead); }}>Convert to Opportunity</Button>}
        </Space>} width={550}>
        {selectedLead && (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Row gutter={16}>
              <Col span={12}><Text type="secondary">Company</Text><br /><Text strong style={{ fontSize: 16 }}>{selectedLead.company_name || '—'}</Text></Col>
              <Col span={12}><Text type="secondary">Status</Text><br /><Tag color={statusColors[selectedLead.status]} style={{ fontSize: 14 }}>{selectedLead.status}</Tag></Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}><Text type="secondary">Contact Person</Text><br /><Text>{selectedLead.contact_person || '—'}</Text></Col>
              <Col span={12}><Text type="secondary">Lead Number</Text><br /><Text>{selectedLead.lead_number || '—'}</Text></Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}><Text type="secondary">Email</Text><br />{selectedLead.email ? <a href={`mailto:${selectedLead.email}`}>{selectedLead.email}</a> : <Text>—</Text>}</Col>
              <Col span={12}><Text type="secondary">Phone</Text><br />{selectedLead.phone ? <a href={`tel:${selectedLead.phone}`}>{selectedLead.phone}</a> : <Text>—</Text>}</Col>
            </Row>
            <Row gutter={16}>
              <Col span={8}><Text type="secondary">Source</Text><br /><Tag color={sourceColors[selectedLead.source]}>{selectedLead.source}</Tag></Col>
              <Col span={8}><Text type="secondary">Probability</Text><br /><Progress percent={selectedLead.probability || 0} size="small" /></Col>
              <Col span={8}><Statistic title="Est. Value" value={parseFloat(String(selectedLead.lead_value)) || 0} prefix="R" /></Col>
            </Row>
            {selectedLead.industry && <><Text type="secondary">Industry</Text><br /><Text>{selectedLead.industry}</Text></>}
            {selectedLead.notes && <><Text type="secondary">Notes</Text><br /><Text>{selectedLead.notes}</Text></>}
            <Text type="secondary" style={{ fontSize: 11 }}>Created: {selectedLead.created_at ? new Date(selectedLead.created_at).toLocaleDateString('en-ZA') : '—'}</Text>
          </Space>
        )}
      </Modal>

      {/* Email Compose Modal */}
      <Modal title="✉️ Send Email" open={showEmailModal} onCancel={() => setShowEmailModal(false)} onOk={handleSendEmail}
        okText="Send" okButtonProps={{ icon: <SendOutlined /> }} confirmLoading={sendingEmail} width={650}>
        <Form layout="vertical" form={emailForm}>
          <Form.Item label="To" name="to" rules={[{ required: true, type: 'email', message: 'Enter recipient email' }]}><Input prefix={<MailOutlined />} placeholder="recipient@company.co.za" /></Form.Item>
          <Form.Item label="Subject" name="subject" rules={[{ required: true, message: 'Enter subject' }]}><Input placeholder="Subject line" /></Form.Item>
          <Form.Item label="Message" name="content" rules={[{ required: true, message: 'Enter message' }]}><Input.TextArea rows={6} placeholder="Type your message..." /></Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default LeadsPage;
