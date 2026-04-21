import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, Card, Button, Modal, Form, Input, Select, DatePicker,
  Tag, Space, message, Spin, Empty, Typography, Row, Col,
  Statistic, Tooltip, Popconfirm, Badge,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined,
  WarningOutlined, CheckCircleOutlined, ExclamationCircleOutlined,
  ClockCircleOutlined, FilterOutlined, CalendarOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

// ─── Types ────────────────────────────────────────────────────────────────────

interface ComplianceItem {
  id: string;
  client_tenant_id: string;
  client_name: string;
  compliance_type: string;
  title: string;
  description: string | null;
  due_date: string;
  period_start: string | null;
  period_end: string | null;
  status: string;
  assigned_to: string | null;
  assigned_to_name: string | null;
  submission_reference: string | null;
  notes: string | null;
  job_id: string | null;
  job_title: string | null;
  urgency: string;
  created_at: string;
}

interface ComplianceSummary {
  overdue: number;
  due_this_week: number;
  due_this_month: number;
  completed: number;
}

interface Client { id: string; tenant_id: string; company_name: string; }

// ─── Constants ────────────────────────────────────────────────────────────────

const COMPLIANCE_TYPES = [
  { value: 'vat_201',          label: 'VAT 201 Return',           sars: true },
  { value: 'emp201',           label: 'EMP 201 (PAYE/UIF/SDL)',   sars: true },
  { value: 'emp501',           label: 'EMP 501 Reconciliation',   sars: true },
  { value: 'itr12',            label: 'ITR12 (Individual Tax)',    sars: true },
  { value: 'itr14',            label: 'ITR14 (Company Tax)',       sars: true },
  { value: 'provisional_tax',  label: 'Provisional Tax (IRP6)',    sars: true },
  { value: 'cipc_annual',      label: 'CIPC Annual Return',        sars: false },
  { value: 'annual_return',    label: 'Annual Financial Statements', sars: false },
  { value: 'payroll_filing',   label: 'Payroll / Wage Filing',    sars: false },
  { value: 'other',            label: 'Other',                    sars: false },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon?: React.ReactNode }> = {
  pending:     { label: 'Pending',    color: 'blue',    icon: <ClockCircleOutlined /> },
  in_progress: { label: 'In Progress', color: 'processing', icon: <ClockCircleOutlined /> },
  submitted:   { label: 'Submitted',  color: 'cyan',    icon: <CheckCircleOutlined /> },
  completed:   { label: 'Completed',  color: 'success', icon: <CheckCircleOutlined /> },
  overdue:     { label: 'Overdue',    color: 'error',   icon: <WarningOutlined /> },
  na:          { label: 'N/A',        color: 'default' },
};

const URGENCY_COLOR: Record<string, string> = {
  overdue:   '#ff4d4f',
  due_soon:  '#fa8c16',
  upcoming:  '#faad14',
  future:    '#1890ff',
  done:      '#52c41a',
};

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json',
});

const fmt = (iso: string | null) =>
  iso ? dayjs(iso).format('DD MMM YYYY') : '—';

// ─── Component ────────────────────────────────────────────────────────────────

const CompliancePage: React.FC = () => {
  const [items, setItems]       = useState<ComplianceItem[]>([]);
  const [summary, setSummary]   = useState<ComplianceSummary | null>(null);
  const [clients, setClients]   = useState<Client[]>([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [modalOpen, setModal]   = useState(false);
  const [editItem, setEdit]     = useState<ComplianceItem | null>(null);
  // Quick-mark submitted modal
  const [submitModal, setSubmitModal] = useState(false);
  const [submitItem, setSubmitItem]   = useState<ComplianceItem | null>(null);
  const [submitRef, setSubmitRef]     = useState('');
  const [form]                  = Form.useForm();

  // Filters
  const [filterClient, setFilterClient]         = useState<string | undefined>();
  const [filterType, setFilterType]             = useState<string | undefined>();
  const [filterStatus, setFilterStatus]         = useState<string | undefined>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '300' });
      if (filterClient) params.set('client_tenant_id', filterClient);
      if (filterType)   params.set('compliance_type', filterType);
      if (filterStatus) params.set('status', filterStatus);

      const res = await fetch(`/api/v2/accountant-portal/compliance?${params}`, { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to load compliance items');
      const json = await res.json();
      setItems(json.data?.items ?? []);
      setSummary(json.data?.summary ?? null);
      setTotal(json.data?.total ?? 0);
    } catch (err) {
      console.error(err);
      message.error('Failed to load compliance items');
    } finally {
      setLoading(false);
    }
  }, [filterClient, filterType, filterStatus]);

  const loadClients = async () => {
    try {
      const res = await fetch('/api/v2/accountant-portal/clients', { headers: authHeaders() });
      if (!res.ok) return;
      const json = await res.json();
      setClients(json.data?.clients ?? json.data ?? []);
    } catch { /* ignore */ }
  };

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadClients(); }, []);

  const openCreate = () => {
    setEdit(null);
    form.resetFields();
    setModal(true);
  };

  const openEdit = (item: ComplianceItem) => {
    setEdit(item);
    form.setFieldsValue({
      ...item,
      due_date:    item.due_date    ? dayjs(item.due_date)    : null,
      period_start: item.period_start ? dayjs(item.period_start) : null,
      period_end:   item.period_end   ? dayjs(item.period_end)   : null,
    });
    setModal(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      const payload = {
        ...values,
        due_date:    values.due_date    ? values.due_date.format('YYYY-MM-DD')    : undefined,
        period_start: values.period_start ? values.period_start.format('YYYY-MM-DD') : undefined,
        period_end:   values.period_end   ? values.period_end.format('YYYY-MM-DD')   : undefined,
      };

      const url    = editItem ? `/api/v2/accountant-portal/compliance/${editItem.id}` : '/api/v2/accountant-portal/compliance';
      const method = editItem ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save');

      message.success(editItem ? 'Item updated' : 'Compliance item created');
      setModal(false);
      load();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/v2/accountant-portal/compliance/${id}`, { method: 'DELETE', headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to delete');
      message.success('Item deleted');
      load();
    } catch (err: any) {
      message.error(err.message);
    }
  };

  const handleStatusChange = async (item: ComplianceItem, newStatus: string) => {
    try {
      const res = await fetch(`/api/v2/accountant-portal/compliance/${item.id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update');
      message.success('Status updated');
      load();
    } catch (err: any) {
      message.error(err.message);
    }
  };

  const openSubmitModal = (item: ComplianceItem) => {
    setSubmitItem(item);
    setSubmitRef('');
    setSubmitModal(true);
  };

  const handleMarkSubmitted = async () => {
    if (!submitItem) return;
    try {
      const res = await fetch(`/api/v2/accountant-portal/compliance/${submitItem.id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ status: 'submitted', submission_reference: submitRef }),
      });
      if (!res.ok) throw new Error('Failed to update');
      message.success('Marked as submitted');
      setSubmitModal(false);
      load();
    } catch (err: any) {
      message.error(err.message);
    }
  };

  const columns: ColumnsType<ComplianceItem> = [
    {
      title: '',
      key: 'urgency',
      width: 6,
      render: (_: any, rec: ComplianceItem) => (
        <div style={{ width: 4, height: 40, borderRadius: 2, background: URGENCY_COLOR[rec.urgency] ?? '#1890ff' }} />
      ),
    },
    {
      title: 'Client',
      dataIndex: 'client_name',
      key: 'client_name',
      width: 150,
      render: (v: string) => <Text strong>{v}</Text>,
    },
    {
      title: 'Compliance Item',
      key: 'item',
      render: (_: any, rec: ComplianceItem) => (
        <div>
          <div style={{ fontWeight: 500 }}>{rec.title}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {COMPLIANCE_TYPES.find(t => t.value === rec.compliance_type)?.label ?? rec.compliance_type}
            {rec.period_start && rec.period_end && ` · ${fmt(rec.period_start)} – ${fmt(rec.period_end)}`}
          </Text>
          {rec.submission_reference && (
            <div><Text type="secondary" style={{ fontSize: 11 }}>Ref: {rec.submission_reference}</Text></div>
          )}
        </div>
      ),
    },
    {
      title: 'Due Date',
      dataIndex: 'due_date',
      key: 'due_date',
      width: 120,
      sorter: (a, b) => dayjs(a.due_date).unix() - dayjs(b.due_date).unix(),
      defaultSortOrder: 'ascend',
      render: (v: string, rec: ComplianceItem) => {
        const isOverdue = rec.urgency === 'overdue';
        const isDueSoon = rec.urgency === 'due_soon';
        return (
          <Text
            type={isOverdue ? 'danger' : isDueSoon ? 'warning' : undefined}
            style={{ fontWeight: isOverdue || isDueSoon ? 600 : 400 }}
          >
            {isOverdue && <WarningOutlined style={{ marginRight: 4 }} />}
            {dayjs(v).format('DD MMM YYYY')}
          </Text>
        );
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      render: (v: string, rec: ComplianceItem) => (
        <Select
          value={v}
          size="small"
          style={{ width: 140 }}
          onChange={val => handleStatusChange(rec, val)}
          onClick={e => e.stopPropagation()}
        >
          {Object.entries(STATUS_CONFIG).map(([key, s]) => (
            <Option key={key} value={key}>
              <Tag color={s.color} style={{ margin: 0 }}>{s.label}</Tag>
            </Option>
          ))}
        </Select>
      ),
    },
    {
      title: 'Assigned',
      dataIndex: 'assigned_to_name',
      key: 'assigned_to_name',
      width: 130,
      render: (v: string | null) => v ? <Text>{v}</Text> : <Text type="secondary">—</Text>,
    },
    {
      title: '',
      key: 'actions',
      width: 120,
      render: (_: any, rec: ComplianceItem) => (
        <Space>
          {!['submitted', 'completed', 'na'].includes(rec.status) && (
            <Tooltip title="Mark as Submitted">
              <Button size="small" type="primary" ghost icon={<CheckCircleOutlined />} onClick={() => openSubmitModal(rec)}>
                Submit
              </Button>
            </Tooltip>
          )}
          <Tooltip title="Edit">
            <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(rec)} />
          </Tooltip>
          <Popconfirm title="Delete this item?" onConfirm={() => handleDelete(rec.id)} okType="danger" okText="Delete">
            <Tooltip title="Delete">
              <Button size="small" icon={<DeleteOutlined />} danger />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Compliance Calendar</Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>Refresh</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Add Deadline</Button>
        </Space>
      </div>

      {/* Summary stats */}
      {summary && (
        <Row gutter={16} style={{ marginBottom: 20 }}>
          <Col xs={12} sm={6}>
            <Card size="small" style={{ borderLeft: '3px solid #ff4d4f' }}>
              <Statistic
                title="Overdue"
                value={summary.overdue}
                prefix={<WarningOutlined style={{ color: '#ff4d4f' }} />}
                valueStyle={{ color: parseInt(String(summary.overdue)) > 0 ? '#ff4d4f' : undefined }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small" style={{ borderLeft: '3px solid #fa8c16' }}>
              <Statistic
                title="Due This Week"
                value={summary.due_this_week}
                prefix={<ExclamationCircleOutlined style={{ color: '#fa8c16' }} />}
                valueStyle={{ color: parseInt(String(summary.due_this_week)) > 0 ? '#fa8c16' : undefined }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small" style={{ borderLeft: '3px solid #faad14' }}>
              <Statistic
                title="Due This Month"
                value={summary.due_this_month}
                prefix={<CalendarOutlined style={{ color: '#faad14' }} />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small" style={{ borderLeft: '3px solid #52c41a' }}>
              <Statistic
                title="Completed"
                value={summary.completed}
                prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Filters */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={12} align="middle">
          <Col><FilterOutlined style={{ color: '#8c8c8c' }} /></Col>
          <Col xs={24} sm={6}>
            <Select allowClear placeholder="All Clients" style={{ width: '100%' }} value={filterClient} onChange={setFilterClient}>
              {clients.map(c => <Option key={c.tenant_id} value={c.tenant_id}>{c.company_name}</Option>)}
            </Select>
          </Col>
          <Col xs={24} sm={5}>
            <Select allowClear placeholder="All Types" style={{ width: '100%' }} value={filterType} onChange={setFilterType}>
              {COMPLIANCE_TYPES.map(t => <Option key={t.value} value={t.value}>{t.label}</Option>)}
            </Select>
          </Col>
          <Col xs={24} sm={4}>
            <Select allowClear placeholder="All Statuses" style={{ width: '100%' }} value={filterStatus} onChange={setFilterStatus}>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <Option key={k} value={k}><Tag color={v.color}>{v.label}</Tag></Option>
              ))}
            </Select>
          </Col>
        </Row>
      </Card>

      {/* Table */}
      <Card>
        {loading ? (
          <Spin size="large" style={{ display: 'block', margin: '60px auto' }} />
        ) : items.length === 0 ? (
          <Empty description="No compliance items yet" image={Empty.PRESENTED_IMAGE_SIMPLE}>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Add First Deadline</Button>
          </Empty>
        ) : (
          <Table
            dataSource={items}
            columns={columns}
            rowKey="id"
            size="small"
            scroll={{ x: 1000 }}
            pagination={{ pageSize: 25, showTotal: t => `${t} items` }}
            rowClassName={(rec) =>
              rec.urgency === 'overdue' ? 'compliance-row-overdue' :
              rec.urgency === 'due_soon' ? 'compliance-row-due-soon' : ''
            }
          />
        )}
      </Card>

      {/* Create / Edit Modal */}
      <Modal
        title={editItem ? 'Edit Compliance Item' : 'Add Compliance Deadline'}
        open={modalOpen}
        onCancel={() => setModal(false)}
        onOk={handleSave}
        confirmLoading={saving}
        okText={editItem ? 'Save Changes' : 'Add Item'}
        width={640}
        destroyOnClose
      >
        <Form form={form} layout="vertical" requiredMark="optional">
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="client_tenant_id" label="Client" rules={[{ required: true }]}>
                <Select placeholder="Select client" showSearch optionFilterProp="children">
                  {clients.map(c => <Option key={c.tenant_id} value={c.tenant_id}>{c.company_name}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="compliance_type" label="Compliance Type" rules={[{ required: true }]} initialValue="other">
                <Select showSearch optionFilterProp="children">
                  <Select.OptGroup label="SARS Submissions">
                    {COMPLIANCE_TYPES.filter(t => t.sars).map(t => <Option key={t.value} value={t.value}>{t.label}</Option>)}
                  </Select.OptGroup>
                  <Select.OptGroup label="Other">
                    {COMPLIANCE_TYPES.filter(t => !t.sars).map(t => <Option key={t.value} value={t.value}>{t.label}</Option>)}
                  </Select.OptGroup>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="status" label="Status" initialValue="pending">
                <Select>
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                    <Option key={k} value={k}><Tag color={v.color}>{v.label}</Tag></Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="title" label="Title" rules={[{ required: true, whitespace: true }]}>
                <Input placeholder="e.g. VAT 201 – Q4 2025 (Oct-Dec)" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="due_date" label="Due Date" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} format="DD MMM YYYY" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="period_start" label="Period Start">
                <DatePicker style={{ width: '100%' }} format="DD MMM YYYY" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="period_end" label="Period End">
                <DatePicker style={{ width: '100%' }} format="DD MMM YYYY" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="submission_reference" label="Submission Reference (e.g. SARS case/ref number)">
                <Input placeholder="Leave blank if not yet submitted" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="notes" label="Notes">
                <TextArea rows={2} placeholder="Any notes or comments..." />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Quick Submit Modal */}
      <Modal
        title={`Mark as Submitted — ${submitItem?.title}`}
        open={submitModal}
        onCancel={() => setSubmitModal(false)}
        onOk={handleMarkSubmitted}
        okText="Mark Submitted"
        okType="primary"
      >
        <p>Enter the submission or reference number (optional):</p>
        <Input
          placeholder="e.g. SARS reference, case number, filing ID"
          value={submitRef}
          onChange={e => setSubmitRef(e.target.value)}
        />
      </Modal>

      <style>{`
        .compliance-row-overdue td { background: #fff1f0 !important; }
        .compliance-row-due-soon td { background: #fff7e6 !important; }
      `}</style>
    </div>
  );
};

export default CompliancePage;
