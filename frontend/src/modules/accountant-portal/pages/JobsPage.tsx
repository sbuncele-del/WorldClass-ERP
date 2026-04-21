import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, Card, Button, Modal, Form, Input, Select, DatePicker,
  Tag, Space, message, Spin, Empty, Typography, Row, Col,
  Statistic, Tooltip, Popconfirm, InputNumber, Progress, Badge,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined,
  ClockCircleOutlined, CheckCircleOutlined, ExclamationCircleOutlined,
  WarningOutlined, PauseCircleOutlined, CloseCircleOutlined,
  FilterOutlined, UserOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

// ─── Types ────────────────────────────────────────────────────────────────────

interface Job {
  id: string;
  client_tenant_id: string;
  client_name: string;
  title: string;
  job_type: string;
  status: string;
  priority: string;
  due_date: string | null;
  start_date: string | null;
  period_start: string | null;
  period_end: string | null;
  estimated_hours: number | null;
  billing_type: string;
  billing_rate: number | null;
  fixed_fee: number | null;
  assigned_to: string | null;
  assigned_to_name: string | null;
  notes: string | null;
  logged_hours: number;
  unbilled_hours: number;
  completed_at: string | null;
  created_at: string;
}

interface Client { id: string; tenant_id: string; company_name: string; }

// ─── Constants ────────────────────────────────────────────────────────────────

const JOB_TYPES = [
  { value: 'annual_accounts',      label: 'Annual Accounts' },
  { value: 'tax_return',           label: 'Tax Return' },
  { value: 'vat_return',           label: 'VAT Return' },
  { value: 'management_accounts',  label: 'Management Accounts' },
  { value: 'payroll',              label: 'Payroll' },
  { value: 'audit',                label: 'Audit' },
  { value: 'bookkeeping',          label: 'Bookkeeping' },
  { value: 'advisory',             label: 'Advisory' },
  { value: 'other',                label: 'Other' },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  not_started: { label: 'Not Started',  color: 'default',   icon: <ClockCircleOutlined /> },
  in_progress:  { label: 'In Progress',  color: 'processing', icon: <ClockCircleOutlined /> },
  review:       { label: 'In Review',    color: 'warning',    icon: <ExclamationCircleOutlined /> },
  on_hold:      { label: 'On Hold',      color: 'orange',     icon: <PauseCircleOutlined /> },
  completed:    { label: 'Completed',    color: 'success',    icon: <CheckCircleOutlined /> },
  cancelled:    { label: 'Cancelled',    color: 'error',      icon: <CloseCircleOutlined /> },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  low:    { label: 'Low',    color: '#8c8c8c' },
  medium: { label: 'Medium', color: '#1890ff' },
  high:   { label: 'High',   color: '#faad14' },
  urgent: { label: 'Urgent', color: '#ff4d4f' },
};

const BILLING_TYPES = [
  { value: 'hourly',   label: 'Hourly' },
  { value: 'fixed',    label: 'Fixed Fee' },
  { value: 'included', label: 'Included' },
  { value: 'none',     label: 'No Charge' },
];

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json',
});

const fmt = (iso: string | null) =>
  iso ? dayjs(iso).format('DD MMM YYYY') : '—';

// ─── Component ────────────────────────────────────────────────────────────────

const JobsPage: React.FC = () => {
  const [jobs, setJobs]           = useState<Job[]>([]);
  const [clients, setClients]     = useState<Client[]>([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editJob, setEditJob]     = useState<Job | null>(null);
  const [form]                    = Form.useForm();

  // Filters
  const [filterStatus, setFilterStatus]   = useState<string | undefined>();
  const [filterClient, setFilterClient]   = useState<string | undefined>();
  const [filterType, setFilterType]       = useState<string | undefined>();
  const [filterPriority, setFilterPriority] = useState<string | undefined>();

  // Stats
  const active   = jobs.filter(j => j.status === 'in_progress').length;
  const overdue  = jobs.filter(j => j.due_date && dayjs(j.due_date).isBefore(dayjs(), 'day') && !['completed','cancelled'].includes(j.status)).length;
  const review   = jobs.filter(j => j.status === 'review').length;
  const done     = jobs.filter(j => j.status === 'completed').length;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '300' });
      if (filterStatus)   params.set('status', filterStatus);
      if (filterClient)   params.set('client_tenant_id', filterClient);
      if (filterType)     params.set('job_type', filterType);
      if (filterPriority) params.set('priority', filterPriority);

      const res = await fetch(`/api/v2/accountant-portal/jobs?${params}`, { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to load jobs');
      const json = await res.json();
      setJobs(json.data?.jobs ?? []);
      setTotal(json.data?.total ?? 0);
    } catch (err) {
      console.error(err);
      message.error('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterClient, filterType, filterPriority]);

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
    setEditJob(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (job: Job) => {
    setEditJob(job);
    form.setFieldsValue({
      ...job,
      due_date:    job.due_date    ? dayjs(job.due_date)    : null,
      start_date:  job.start_date  ? dayjs(job.start_date)  : null,
      period_start: job.period_start ? dayjs(job.period_start) : null,
      period_end:   job.period_end   ? dayjs(job.period_end)   : null,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      const payload = {
        ...values,
        due_date:    values.due_date    ? values.due_date.format('YYYY-MM-DD')    : null,
        start_date:  values.start_date  ? values.start_date.format('YYYY-MM-DD')  : null,
        period_start: values.period_start ? values.period_start.format('YYYY-MM-DD') : null,
        period_end:   values.period_end   ? values.period_end.format('YYYY-MM-DD')   : null,
      };

      const url    = editJob ? `/api/v2/accountant-portal/jobs/${editJob.id}` : '/api/v2/accountant-portal/jobs';
      const method = editJob ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save');

      message.success(editJob ? 'Job updated' : 'Job created');
      setModalOpen(false);
      load();
    } catch (err: any) {
      if (err?.errorFields) return; // form validation error
      message.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/v2/accountant-portal/jobs/${id}`, { method: 'DELETE', headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to delete');
      message.success('Job deleted');
      load();
    } catch (err: any) {
      message.error(err.message);
    }
  };

  const handleStatusChange = async (job: Job, newStatus: string) => {
    try {
      const res = await fetch(`/api/v2/accountant-portal/jobs/${job.id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      message.success('Status updated');
      load();
    } catch (err: any) {
      message.error(err.message);
    }
  };

  const columns: ColumnsType<Job> = [
    {
      title: 'Client',
      dataIndex: 'client_name',
      key: 'client_name',
      width: 160,
      render: (v: string) => <Text strong>{v}</Text>,
    },
    {
      title: 'Job',
      dataIndex: 'title',
      key: 'title',
      render: (v: string, rec: Job) => (
        <div>
          <div style={{ fontWeight: 500 }}>{v}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {JOB_TYPES.find(t => t.value === rec.job_type)?.label ?? rec.job_type}
          </Text>
        </div>
      ),
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      width: 90,
      render: (v: string) => {
        const cfg = PRIORITY_CONFIG[v] ?? PRIORITY_CONFIG.medium;
        return <Tag color={cfg.color} style={{ borderRadius: 4 }}>{cfg.label}</Tag>;
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (v: string, rec: Job) => {
        const cfg = STATUS_CONFIG[v] ?? STATUS_CONFIG.not_started;
        return (
          <Select
            value={v}
            size="small"
            style={{ width: 130 }}
            onChange={val => handleStatusChange(rec, val)}
            onClick={e => e.stopPropagation()}
          >
            {Object.entries(STATUS_CONFIG).map(([key, s]) => (
              <Option key={key} value={key}>
                <Tag color={s.color} style={{ margin: 0 }}>{s.label}</Tag>
              </Option>
            ))}
          </Select>
        );
      },
    },
    {
      title: 'Due Date',
      dataIndex: 'due_date',
      key: 'due_date',
      width: 120,
      render: (v: string | null, rec: Job) => {
        if (!v) return <Text type="secondary">—</Text>;
        const overdue = dayjs(v).isBefore(dayjs(), 'day') && !['completed', 'cancelled'].includes(rec.status);
        return (
          <Text type={overdue ? 'danger' : undefined} style={{ fontWeight: overdue ? 600 : 400 }}>
            {overdue && <WarningOutlined style={{ marginRight: 4 }} />}
            {dayjs(v).format('DD MMM YYYY')}
          </Text>
        );
      },
    },
    {
      title: 'Period',
      key: 'period',
      width: 160,
      render: (_: any, rec: Job) =>
        rec.period_start && rec.period_end
          ? <Text type="secondary">{fmt(rec.period_start)} – {fmt(rec.period_end)}</Text>
          : <Text type="secondary">—</Text>,
    },
    {
      title: 'Hours',
      key: 'hours',
      width: 120,
      render: (_: any, rec: Job) => {
        const logged = parseFloat(String(rec.logged_hours)) || 0;
        const estimated = rec.estimated_hours ? parseFloat(String(rec.estimated_hours)) : 0;
        const pct = estimated > 0 ? Math.min(Math.round((logged / estimated) * 100), 100) : 0;
        return (
          <div>
            <Text>{logged.toFixed(1)}h {estimated > 0 ? `/ ${estimated}h` : ''}</Text>
            {estimated > 0 && (
              <Progress
                percent={pct}
                size="small"
                showInfo={false}
                strokeColor={pct >= 100 ? '#ff4d4f' : '#1890ff'}
                style={{ marginBottom: 0 }}
              />
            )}
          </div>
        );
      },
    },
    {
      title: 'Assigned',
      dataIndex: 'assigned_to_name',
      key: 'assigned_to_name',
      width: 140,
      render: (v: string | null) =>
        v ? (
          <Space>
            <UserOutlined />
            <Text>{v}</Text>
          </Space>
        ) : <Text type="secondary">Unassigned</Text>,
    },
    {
      title: '',
      key: 'actions',
      width: 80,
      render: (_: any, rec: Job) => (
        <Space>
          <Tooltip title="Edit">
            <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(rec)} />
          </Tooltip>
          <Popconfirm title="Delete this job?" onConfirm={() => handleDelete(rec.id)} okType="danger" okText="Delete">
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
        <Title level={4} style={{ margin: 0 }}>Work / Jobs</Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>Refresh</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>New Job</Button>
        </Space>
      </div>

      {/* Stats */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderLeft: '3px solid #1890ff' }}>
            <Statistic title="In Progress" value={active} prefix={<ClockCircleOutlined style={{ color: '#1890ff' }} />} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderLeft: '3px solid #ff4d4f' }}>
            <Statistic title="Overdue" value={overdue} prefix={<WarningOutlined style={{ color: '#ff4d4f' }} />} valueStyle={{ color: overdue > 0 ? '#ff4d4f' : undefined }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderLeft: '3px solid #faad14' }}>
            <Statistic title="In Review" value={review} prefix={<ExclamationCircleOutlined style={{ color: '#faad14' }} />} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderLeft: '3px solid #52c41a' }}>
            <Statistic title="Completed" value={done} prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />} />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={12} align="middle">
          <Col><FilterOutlined style={{ color: '#8c8c8c' }} /></Col>
          <Col xs={24} sm={5}>
            <Select
              allowClear placeholder="All Clients" style={{ width: '100%' }}
              value={filterClient} onChange={setFilterClient}
            >
              {clients.map(c => <Option key={c.tenant_id} value={c.tenant_id}>{c.company_name}</Option>)}
            </Select>
          </Col>
          <Col xs={24} sm={4}>
            <Select
              allowClear placeholder="All Statuses" style={{ width: '100%' }}
              value={filterStatus} onChange={setFilterStatus}
            >
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <Option key={k} value={k}><Tag color={v.color}>{v.label}</Tag></Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={4}>
            <Select
              allowClear placeholder="All Types" style={{ width: '100%' }}
              value={filterType} onChange={setFilterType}
            >
              {JOB_TYPES.map(t => <Option key={t.value} value={t.value}>{t.label}</Option>)}
            </Select>
          </Col>
          <Col xs={24} sm={4}>
            <Select
              allowClear placeholder="All Priorities" style={{ width: '100%' }}
              value={filterPriority} onChange={setFilterPriority}
            >
              {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
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
        ) : jobs.length === 0 ? (
          <Empty
            description="No jobs yet"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Create First Job</Button>
          </Empty>
        ) : (
          <Table
            dataSource={jobs}
            columns={columns}
            rowKey="id"
            size="small"
            scroll={{ x: 1000 }}
            pagination={{ pageSize: 20, showTotal: (t) => `${t} jobs` }}
          />
        )}
      </Card>

      {/* Create / Edit Modal */}
      <Modal
        title={editJob ? `Edit Job — ${editJob.title}` : 'New Job'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSave}
        confirmLoading={saving}
        okText={editJob ? 'Save Changes' : 'Create Job'}
        width={700}
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
            <Col span={16}>
              <Form.Item name="title" label="Job Title" rules={[{ required: true, whitespace: true }]}>
                <Input placeholder="e.g. Annual Tax Return 2025" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="job_type" label="Type" rules={[{ required: true }]} initialValue="other">
                <Select>
                  {JOB_TYPES.map(t => <Option key={t.value} value={t.value}>{t.label}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="status" label="Status" initialValue="not_started">
                <Select>
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                    <Option key={k} value={k}><Tag color={v.color}>{v.label}</Tag></Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="priority" label="Priority" initialValue="medium">
                <Select>
                  {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                    <Option key={k} value={k}>{v.label}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="due_date" label="Due Date">
                <DatePicker style={{ width: '100%' }} format="DD MMM YYYY" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="period_start" label="Period Start">
                <DatePicker style={{ width: '100%' }} format="DD MMM YYYY" picker="date" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="period_end" label="Period End">
                <DatePicker style={{ width: '100%' }} format="DD MMM YYYY" picker="date" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="estimated_hours" label="Estimated Hours">
                <InputNumber min={0} step={0.5} style={{ width: '100%' }} placeholder="0.0" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="billing_type" label="Billing Type" initialValue="hourly">
                <Select>
                  {BILLING_TYPES.map(b => <Option key={b.value} value={b.value}>{b.label}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                noStyle
                shouldUpdate={(prev, cur) => prev.billing_type !== cur.billing_type}
              >
                {({ getFieldValue }) =>
                  getFieldValue('billing_type') === 'fixed' ? (
                    <Form.Item name="fixed_fee" label="Fixed Fee (ZAR)">
                      <InputNumber min={0} style={{ width: '100%' }} prefix="R" />
                    </Form.Item>
                  ) : (
                    <Form.Item name="billing_rate" label="Hourly Rate (ZAR)">
                      <InputNumber min={0} style={{ width: '100%' }} prefix="R" />
                    </Form.Item>
                  )
                }
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="description" label="Description">
                <TextArea rows={2} placeholder="Brief description of the work..." />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="notes" label="Internal Notes">
                <TextArea rows={2} placeholder="Internal notes (not visible to client)..." />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default JobsPage;
