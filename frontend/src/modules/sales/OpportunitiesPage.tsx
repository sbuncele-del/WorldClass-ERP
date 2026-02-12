import React, { useState, useEffect } from 'react';
import {
  Card, Row, Col, Table, Button, Input, Select, Tag, Space, Modal, Form,
  InputNumber, message, Statistic, Typography, Empty, Tooltip, DatePicker, Badge,
} from 'antd';
import {
  RocketOutlined, PlusOutlined, SearchOutlined, EyeOutlined,
  SyncOutlined, MailOutlined, SendOutlined, PhoneOutlined,
} from '@ant-design/icons';

const { Text } = Typography;
const { Option } = Select;

// DB fields from sales.opportunities
interface Opportunity {
  id: number;
  opportunity_id?: number;
  opportunity_number?: string;
  opportunity_name: string;      // DB column
  lead_id?: number;
  contact_person?: string;
  email?: string;
  phone?: string;
  value: number;
  stage: string;
  probability?: number;
  expected_close_date?: string;
  source?: string;
  assigned_to?: string;
  status?: string;
  notes?: string;
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

const OpportunitiesPage: React.FC = () => {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStage, setFilterStage] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);
  const [saving, setSaving] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [form] = Form.useForm();
  const [emailForm] = Form.useForm();

  useEffect(() => { fetchOpportunities(); }, []);

  const fetchOpportunities = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/sales/opportunities?limit=200', { method: 'GET', headers: buildHeaders() });
      const json = await res.json();
      const list = Array.isArray(json?.data) ? json.data : Array.isArray(json?.opportunities) ? json.opportunities : [];
      setOpportunities(list.map((o: any) => ({
        ...o,
        id: o.opportunity_id || o.id,
        opportunity_name: o.opportunity_name || o.name || 'Unnamed',
      })));
    } catch (err) {
      console.error('[Opportunities] error:', err);
      message.error('Failed to load opportunities');
    } finally { setLoading(false); }
  };

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const res = await fetch('/api/sales/opportunities', {
        method: 'POST', headers: buildHeaders(),
        body: JSON.stringify({
          opportunity_name: values.opportunity_name,    // correct DB field
          contact_person: values.contact_person,
          email: values.email,
          phone: values.phone,
          value: values.value || 0,
          stage: values.stage || 'QUALIFICATION',
          probability: values.probability || 25,
          expected_close_date: values.expected_close_date?.format?.('YYYY-MM-DD'),
          source: values.source,
          notes: values.notes,
          address: values.address,
          city: values.city,
          province: values.province,
          postal_code: values.postal_code,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Failed to create opportunity');
      message.success('Opportunity created!');
      setShowModal(false); form.resetFields(); fetchOpportunities();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.message || 'Failed to create opportunity');
    } finally { setSaving(false); }
  };

  const handleUpdateStage = async (opp: Opportunity, newStage: string) => {
    try {
      const res = await fetch(`/api/sales/opportunities/${opp.id}`, {
        method: 'PUT', headers: buildHeaders(),
        body: JSON.stringify({ stage: newStage }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Failed to update');

      if (newStage === 'CLOSED_WON') {
        // Show rich success message for won deals
        Modal.success({
          title: '🎉 Deal Won!',
          content: (
            <div>
              <p><strong>{opp.opportunity_name}</strong> has been marked as Won!</p>
              {json.customerCreated && (
                <p style={{ color: '#10b981' }}>✅ Customer "<strong>{json.customerCreated.company_name}</strong>" was automatically created.</p>
              )}
              <p style={{ marginTop: 12 }}>Next steps:</p>
              <ol>
                <li>Go to <strong>Quotations</strong> tab to create a quote</li>
                <li>Convert the quote to a <strong>Sales Order</strong></li>
                <li>Generate an <strong>Invoice</strong></li>
              </ol>
            </div>
          ),
          okText: 'Got it!',
        });
      } else {
        message.success(json.message || `Stage updated to ${newStage}`);
      }
      fetchOpportunities();
    } catch (err: any) { message.error(err?.message || 'Failed to update stage'); }
  };

  const handleSendEmail = async () => {
    try {
      const values = await emailForm.validateFields();
      setSendingEmail(true);
      const res = await fetch('/api/v2/communications/email/send', {
        method: 'POST', headers: buildHeaders(),
        body: JSON.stringify({ to: values.to, subject: values.subject, content: values.content }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || json.message || 'Email not configured');
      message.success('Email sent!');
      setShowEmailModal(false); emailForm.resetFields();
    } catch (err: any) {
      message.error(err?.message || 'Email service not configured');
    } finally { setSendingEmail(false); }
  };

  const openEmailForOpp = (opp: Opportunity) => {
    emailForm.resetFields();
    emailForm.setFieldsValue({
      to: opp.email || '',
      subject: `Regarding ${opp.opportunity_name}`,
      content: `Hi ${opp.contact_person || 'there'},\n\nI wanted to follow up on our discussion regarding ${opp.opportunity_name}.\n\nLooking forward to your response.\n\nKind regards`,
    });
    setShowEmailModal(true);
  };

  const fmt = (v: number) => `R ${(v || 0).toLocaleString('en-ZA')}`;

  const stageColors: Record<string, string> = {
    QUALIFICATION: 'cyan', PROPOSAL: 'orange', NEGOTIATION: 'magenta', CLOSED_WON: 'green', CLOSED_LOST: 'red',
    qualification: 'cyan', proposal: 'orange', negotiation: 'magenta', closed_won: 'green', closed_lost: 'red',
  };
  const stageLabels: Record<string, string> = {
    QUALIFICATION: 'Qualification', PROPOSAL: 'Proposal', NEGOTIATION: 'Negotiation', CLOSED_WON: 'Won', CLOSED_LOST: 'Lost',
    qualification: 'Qualification', proposal: 'Proposal', negotiation: 'Negotiation', closed_won: 'Won', closed_lost: 'Lost',
  };

  const filtered = opportunities.filter(o => {
    const matchSearch = !searchTerm || (o.opportunity_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.contact_person || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchStage = !filterStage || (o.stage || '').toUpperCase() === filterStage.toUpperCase();
    return matchSearch && matchStage;
  });

  const columns: any[] = [
    {
      title: 'Opportunity', key: 'name',
      render: (_: any, r: Opportunity) => (
        <div>
          <Text strong>{r.opportunity_name}</Text>
          {r.contact_person && <div><Text type="secondary" style={{ fontSize: 12 }}>{r.contact_person}</Text></div>}
          {r.opportunity_number && <div><Text type="secondary" style={{ fontSize: 11 }}>{r.opportunity_number}</Text></div>}
        </div>
      ),
      sorter: (a: Opportunity, b: Opportunity) => (a.opportunity_name || '').localeCompare(b.opportunity_name || ''),
    },
    {
      title: 'Value', dataIndex: 'value', key: 'value', width: 140,
      render: (v: any) => <Text strong style={{ color: '#667eea' }}>{fmt(parseFloat(v) || 0)}</Text>,
      sorter: (a: Opportunity, b: Opportunity) => (parseFloat(String(a.value)) || 0) - (parseFloat(String(b.value)) || 0),
    },
    {
      title: 'Stage', dataIndex: 'stage', key: 'stage', width: 130,
      render: (s: string) => <Tag color={stageColors[s] || 'default'}>{stageLabels[s] || s}</Tag>,
    },
    { title: 'Probability', dataIndex: 'probability', key: 'prob', width: 100, render: (v: number) => <Text>{v || 0}%</Text> },
    {
      title: 'Expected Close', key: 'close', width: 120,
      render: (_: any, r: Opportunity) => r.expected_close_date ? new Date(r.expected_close_date).toLocaleDateString('en-ZA') : '—',
    },
    {
      title: 'Contact', key: 'contact', width: 180,
      render: (_: any, r: Opportunity) => (
        <Space direction="vertical" size={0}>
          {r.email && <Text style={{ fontSize: 12 }}><MailOutlined style={{ marginRight: 4, color: '#667eea' }} />{r.email}</Text>}
          {r.phone && <Text style={{ fontSize: 12 }}><PhoneOutlined style={{ marginRight: 4 }} />{r.phone}</Text>}
        </Space>
      ),
    },
    {
      title: 'Actions', key: 'actions', width: 100,
      render: (_: any, r: Opportunity) => (
        <Space size="small">
          <Tooltip title="View"><Button type="text" size="small" icon={<EyeOutlined />} onClick={() => { setSelectedOpp(r); setShowDetailModal(true); }} /></Tooltip>
          {r.email && <Tooltip title="Send Email"><Button type="text" size="small" icon={<MailOutlined style={{ color: '#667eea' }} />} onClick={() => openEmailForOpp(r)} /></Tooltip>}
        </Space>
      ),
    },
  ];

  const totalValue = opportunities.reduce((s, o) => s + (parseFloat(String(o.value)) || 0), 0);
  const openCount = opportunities.filter(o => !['CLOSED_WON', 'CLOSED_LOST'].includes((o.stage || '').toUpperCase())).length;
  const wonCount = opportunities.filter(o => (o.stage || '').toUpperCase() === 'CLOSED_WON').length;

  return (
    <>
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={6}><Card><Statistic title="Total Opportunities" value={opportunities.length} prefix={<RocketOutlined style={{ color: '#667eea' }} />} /></Card></Col>
        <Col span={6}><Card><Statistic title="Pipeline Value" value={totalValue} prefix="R" valueStyle={{ color: '#667eea' }} /></Card></Col>
        <Col span={6}><Card><Statistic title="Open" value={openCount} valueStyle={{ color: '#1890ff' }} /></Card></Col>
        <Col span={6}><Card><Statistic title="Won" value={wonCount} valueStyle={{ color: '#52c41a' }} /></Card></Col>
      </Row>

      <Card title={<Space><RocketOutlined style={{ color: '#667eea' }} /><span>Opportunities</span></Space>}
        extra={<Space>
          <Input placeholder="Search..." prefix={<SearchOutlined />} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ width: 220 }} allowClear />
          <Select placeholder="All Stages" value={filterStage || undefined} onChange={v => setFilterStage(v || '')} style={{ width: 140 }} allowClear>
            <Option value="QUALIFICATION">Qualification</Option><Option value="PROPOSAL">Proposal</Option>
            <Option value="NEGOTIATION">Negotiation</Option><Option value="CLOSED_WON">Won</Option>
          </Select>
          <Button icon={<SyncOutlined />} onClick={fetchOpportunities} loading={loading} />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); form.setFieldsValue({ stage: 'QUALIFICATION', probability: 25, value: 0 }); setShowModal(true); }} style={{ background: '#667eea' }}>New Opportunity</Button>
        </Space>}>
        <Table dataSource={filtered} columns={columns} rowKey="id" loading={loading}
          pagination={{ pageSize: 15, showSizeChanger: true, showTotal: t => `${t} opportunities` }} size="middle"
          locale={{ emptyText: <Empty description="No opportunities yet. Convert a lead or create one directly." /> }} />
      </Card>

      {/* Create Modal */}
      <Modal title="🚀 New Opportunity" open={showModal} onCancel={() => setShowModal(false)} onOk={handleCreate} okText="Create" confirmLoading={saving} width={700}>
        <Form layout="vertical" form={form}>
          <Row gutter={16}>
            <Col span={16}><Form.Item label="Opportunity Name" name="opportunity_name" rules={[{ required: true, message: 'Required' }]}><Input placeholder="e.g. Boikago Events — Event Management System" /></Form.Item></Col>
            <Col span={8}><Form.Item label="Value (R)" name="value" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} prefix="R" min={0} step={1000} /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}><Form.Item label="Contact Person" name="contact_person"><Input placeholder="Name" /></Form.Item></Col>
            <Col span={8}><Form.Item label="Email" name="email"><Input prefix={<MailOutlined />} placeholder="email@company.co.za" /></Form.Item></Col>
            <Col span={8}><Form.Item label="Phone" name="phone"><Input prefix={<PhoneOutlined />} placeholder="081 000 0000" /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="Stage" name="stage" rules={[{ required: true }]}>
                <Select>
                  <Option value="QUALIFICATION"><Space><Badge color="#06b6d4" />Qualification</Space></Option>
                  <Option value="PROPOSAL"><Space><Badge color="#f59e0b" />Proposal</Space></Option>
                  <Option value="NEGOTIATION"><Space><Badge color="#ec4899" />Negotiation</Space></Option>
                  <Option value="CLOSED_WON"><Space><Badge color="#10b981" />Won</Space></Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}><Form.Item label="Probability (%)" name="probability"><InputNumber style={{ width: '100%' }} min={0} max={100} /></Form.Item></Col>
            <Col span={8}><Form.Item label="Expected Close" name="expected_close_date"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}><Form.Item label="Source" name="source"><Select placeholder="Source" allowClear><Option value="REFERRAL">Referral</Option><Option value="WEBSITE">Website</Option><Option value="COLD_CALL">Cold Call</Option><Option value="LINKEDIN">LinkedIn</Option></Select></Form.Item></Col>
            <Col span={16}><Form.Item label="Notes" name="notes"><Input.TextArea rows={1} /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}><Form.Item label="Street Address" name="address"><Input placeholder="123 Main Street" /></Form.Item></Col>
            <Col span={4}><Form.Item label="City" name="city"><Input placeholder="Johannesburg" /></Form.Item></Col>
            <Col span={4}><Form.Item label="Province" name="province"><Input placeholder="Gauteng" /></Form.Item></Col>
            <Col span={4}><Form.Item label="Postal Code" name="postal_code"><Input placeholder="2000" /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>

      {/* Detail Modal */}
      <Modal title={selectedOpp ? `🚀 ${selectedOpp.opportunity_name}` : 'Opportunity'} open={showDetailModal} onCancel={() => setShowDetailModal(false)}
        footer={<Space>
          <Button onClick={() => setShowDetailModal(false)}>Close</Button>
          {selectedOpp?.email && <Button icon={<MailOutlined />} onClick={() => { setShowDetailModal(false); openEmailForOpp(selectedOpp!); }}>Send Email</Button>}
          {selectedOpp && (selectedOpp.stage || '').toUpperCase() === 'QUALIFICATION' && <Button onClick={() => { handleUpdateStage(selectedOpp, 'PROPOSAL'); setShowDetailModal(false); }}>→ Proposal</Button>}
          {selectedOpp && (selectedOpp.stage || '').toUpperCase() === 'PROPOSAL' && <Button onClick={() => { handleUpdateStage(selectedOpp, 'NEGOTIATION'); setShowDetailModal(false); }}>→ Negotiation</Button>}
          {selectedOpp && (selectedOpp.stage || '').toUpperCase() === 'NEGOTIATION' && <Button type="primary" style={{ background: '#52c41a' }} onClick={() => { handleUpdateStage(selectedOpp, 'CLOSED_WON'); setShowDetailModal(false); }}>🎉 Won!</Button>}
        </Space>} width={550}>
        {selectedOpp && (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Row gutter={16}>
              <Col span={12}><Text type="secondary">Opportunity</Text><br /><Text strong style={{ fontSize: 16 }}>{selectedOpp.opportunity_name}</Text></Col>
              <Col span={12}><Text type="secondary">Stage</Text><br /><Tag color={stageColors[selectedOpp.stage]} style={{ fontSize: 14 }}>{stageLabels[selectedOpp.stage] || selectedOpp.stage}</Tag></Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}><Text type="secondary">Contact</Text><br /><Text>{selectedOpp.contact_person || '—'}</Text></Col>
              <Col span={12}><Text type="secondary">Number</Text><br /><Text>{selectedOpp.opportunity_number || '—'}</Text></Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}><Text type="secondary">Email</Text><br />{selectedOpp.email ? <a href={`mailto:${selectedOpp.email}`}>{selectedOpp.email}</a> : <Text>—</Text>}</Col>
              <Col span={12}><Text type="secondary">Phone</Text><br />{selectedOpp.phone ? <a href={`tel:${selectedOpp.phone}`}>{selectedOpp.phone}</a> : <Text>—</Text>}</Col>
            </Row>
            <Row gutter={16}>
              <Col span={8}><Statistic title="Value" value={parseFloat(String(selectedOpp.value)) || 0} prefix="R" valueStyle={{ color: '#667eea' }} /></Col>
              <Col span={8}><Statistic title="Probability" value={selectedOpp.probability || 0} suffix="%" /></Col>
              <Col span={8}><Text type="secondary">Expected Close</Text><br /><Text>{selectedOpp.expected_close_date ? new Date(selectedOpp.expected_close_date).toLocaleDateString('en-ZA') : '—'}</Text></Col>
            </Row>
            {selectedOpp.source && <><Text type="secondary">Source</Text><br /><Tag>{selectedOpp.source}</Tag></>}
            {selectedOpp.notes && <><Text type="secondary">Notes</Text><br /><Text>{selectedOpp.notes}</Text></>}
            <Text type="secondary" style={{ fontSize: 11 }}>Created: {selectedOpp.created_at ? new Date(selectedOpp.created_at).toLocaleDateString('en-ZA') : '—'}</Text>
          </Space>
        )}
      </Modal>

      {/* Email Compose Modal */}
      <Modal title="✉️ Send Email" open={showEmailModal} onCancel={() => setShowEmailModal(false)} onOk={handleSendEmail}
        okText="Send" okButtonProps={{ icon: <SendOutlined /> }} confirmLoading={sendingEmail} width={650}>
        <Form layout="vertical" form={emailForm}>
          <Form.Item label="To" name="to" rules={[{ required: true, type: 'email' }]}><Input prefix={<MailOutlined />} /></Form.Item>
          <Form.Item label="Subject" name="subject" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item label="Message" name="content" rules={[{ required: true }]}><Input.TextArea rows={6} /></Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default OpportunitiesPage;
