import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, Card, Button, Modal, Form, Input, Select, DatePicker,
  Tag, Space, message, Spin, Empty, Typography, Row, Col,
  Statistic, Tooltip, Popconfirm, InputNumber, Switch, Divider,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined,
  ClockCircleOutlined, DollarOutlined, CheckCircleOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

// ─── Types ────────────────────────────────────────────────────────────────────

interface TimeEntry {
  id: string;
  client_tenant_id: string;
  client_name: string;
  job_id: string | null;
  job_title: string | null;
  user_id: string;
  user_name: string;
  date: string;
  hours: number;
  description: string;
  billable: boolean;
  rate: number | null;
  amount: number | null;
  invoiced: boolean;
  created_at: string;
}

interface WipRow {
  client_tenant_id: string;
  client_name: string;
  total_hours: number;
  unbilled_hours: number;
  unbilled_amount: number;
}

interface Client { id: string; tenant_id: string; company_name: string; }
interface Job    { id: string; title: string; client_tenant_id: string; }

// ─── Helpers ──────────────────────────────────────────────────────────────────

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json',
});

const fmtZAR = (v: number | null) =>
  v !== null && v !== undefined
    ? new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 2 }).format(v)
    : '—';

// ─── Component ────────────────────────────────────────────────────────────────

const TimeTrackingPage: React.FC = () => {
  const [entries, setEntries]   = useState<TimeEntry[]>([]);
  const [wip, setWip]           = useState<WipRow[]>([]);
  const [clients, setClients]   = useState<Client[]>([]);
  const [jobs, setJobs]         = useState<Job[]>([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [modalOpen, setModal]   = useState(false);
  const [editEntry, setEdit]    = useState<TimeEntry | null>(null);
  const [form]                  = Form.useForm();

  // Filters
  const [filterClient, setFilterClient]   = useState<string | undefined>();
  const [filterJob, setFilterJob]         = useState<string | undefined>();
  const [filterBillable, setFilterBillable] = useState<string | undefined>();
  const [filterInvoiced, setFilterInvoiced] = useState<string | undefined>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '300' });
      if (filterClient)   params.set('client_tenant_id', filterClient);
      if (filterJob)      params.set('job_id', filterJob);
      if (filterBillable !== undefined && filterBillable !== '') params.set('billable', filterBillable);
      if (filterInvoiced !== undefined && filterInvoiced !== '') params.set('invoiced', filterInvoiced);

      const res = await fetch(`/api/v2/accountant-portal/time-entries?${params}`, { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to load time entries');
      const json = await res.json();
      setEntries(json.data?.entries ?? []);
      setWip(json.data?.wip ?? []);
      setTotal(json.data?.total ?? 0);
    } catch (err) {
      console.error(err);
      message.error('Failed to load time entries');
    } finally {
      setLoading(false);
    }
  }, [filterClient, filterJob, filterBillable, filterInvoiced]);

  const loadClients = async () => {
    try {
      const res = await fetch('/api/v2/accountant-portal/clients', { headers: authHeaders() });
      if (!res.ok) return;
      const json = await res.json();
      setClients(json.data?.clients ?? json.data ?? []);
    } catch { /* ignore */ }
  };

  const loadJobs = async (clientId?: string) => {
    try {
      const params = clientId ? `?client_tenant_id=${clientId}` : '';
      const res = await fetch(`/api/v2/accountant-portal/jobs${params}`, { headers: authHeaders() });
      if (!res.ok) return;
      const json = await res.json();
      setJobs(json.data?.jobs ?? []);
    } catch { /* ignore */ }
  };

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadClients(); loadJobs(); }, []);

  const openCreate = () => {
    setEdit(null);
    form.resetFields();
    form.setFieldsValue({ date: dayjs(), billable: true });
    setModal(true);
  };

  const openEdit = (entry: TimeEntry) => {
    setEdit(entry);
    form.setFieldsValue({
      ...entry,
      date: dayjs(entry.date),
    });
    loadJobs(entry.client_tenant_id);
    setModal(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      const payload = {
        ...values,
        date: values.date ? values.date.format('YYYY-MM-DD') : undefined,
        hours: parseFloat(values.hours),
        rate: values.rate ? parseFloat(values.rate) : undefined,
      };

      const url    = editEntry ? `/api/v2/accountant-portal/time-entries/${editEntry.id}` : '/api/v2/accountant-portal/time-entries';
      const method = editEntry ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save');

      message.success(editEntry ? 'Entry updated' : 'Time logged');
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
      const res = await fetch(`/api/v2/accountant-portal/time-entries/${id}`, { method: 'DELETE', headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to delete');
      message.success('Entry deleted');
      load();
    } catch (err: any) {
      message.error(err.message);
    }
  };

  const handleMarkInvoiced = async (entry: TimeEntry) => {
    try {
      const res = await fetch(`/api/v2/accountant-portal/time-entries/${entry.id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ invoiced: !entry.invoiced }),
      });
      if (!res.ok) throw new Error('Failed to update');
      message.success(entry.invoiced ? 'Marked as not invoiced' : 'Marked as invoiced');
      load();
    } catch (err: any) {
      message.error(err.message);
    }
  };

  // Aggregates
  const totalHours   = entries.reduce((s, e) => s + parseFloat(String(e.hours)), 0);
  const billableHours = entries.filter(e => e.billable).reduce((s, e) => s + parseFloat(String(e.hours)), 0);
  const unbilledAmt   = wip.reduce((s, w) => s + parseFloat(String(w.unbilled_amount ?? 0)), 0);

  const columns: ColumnsType<TimeEntry> = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      width: 110,
      render: (v: string) => dayjs(v).format('DD MMM YYYY'),
      sorter: (a, b) => dayjs(a.date).unix() - dayjs(b.date).unix(),
      defaultSortOrder: 'descend',
    },
    {
      title: 'Client',
      dataIndex: 'client_name',
      key: 'client_name',
      width: 150,
      render: (v: string) => <Text strong>{v}</Text>,
    },
    {
      title: 'Job',
      dataIndex: 'job_title',
      key: 'job_title',
      width: 160,
      render: (v: string | null) => v ? <Text>{v}</Text> : <Text type="secondary">—</Text>,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      render: (v: string) => <Text>{v}</Text>,
    },
    {
      title: 'Hours',
      dataIndex: 'hours',
      key: 'hours',
      width: 75,
      align: 'right',
      render: (v: number) => <Text strong>{parseFloat(String(v)).toFixed(2)}</Text>,
    },
    {
      title: 'Rate',
      dataIndex: 'rate',
      key: 'rate',
      width: 90,
      align: 'right',
      render: (v: number | null) => v ? fmtZAR(v) : <Text type="secondary">—</Text>,
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      width: 100,
      align: 'right',
      render: (v: number | null) => v ? <Text strong>{fmtZAR(v)}</Text> : <Text type="secondary">—</Text>,
    },
    {
      title: 'Billable',
      dataIndex: 'billable',
      key: 'billable',
      width: 80,
      align: 'center',
      render: (v: boolean) => v ? <Tag color="green">Yes</Tag> : <Tag color="default">No</Tag>,
    },
    {
      title: 'Invoiced',
      dataIndex: 'invoiced',
      key: 'invoiced',
      width: 90,
      align: 'center',
      render: (v: boolean, rec: TimeEntry) => (
        <Tooltip title={v ? 'Mark as not invoiced' : 'Mark as invoiced'}>
          <Tag
            color={v ? 'success' : 'default'}
            style={{ cursor: 'pointer' }}
            onClick={() => handleMarkInvoiced(rec)}
            icon={v ? <CheckCircleOutlined /> : undefined}
          >
            {v ? 'Invoiced' : 'WIP'}
          </Tag>
        </Tooltip>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 70,
      render: (_: any, rec: TimeEntry) => (
        <Space>
          <Tooltip title="Edit">
            <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(rec)} />
          </Tooltip>
          <Popconfirm title="Delete this time entry?" onConfirm={() => handleDelete(rec.id)} okType="danger" okText="Delete">
            <Tooltip title="Delete">
              <Button size="small" icon={<DeleteOutlined />} danger />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const wipColumns: ColumnsType<WipRow> = [
    { title: 'Client', dataIndex: 'client_name', key: 'client_name', render: (v: string) => <Text strong>{v}</Text> },
    { title: 'Total Hours', dataIndex: 'total_hours', key: 'total_hours', align: 'right', render: (v: number) => <Text>{parseFloat(String(v)).toFixed(1)}h</Text> },
    { title: 'Unbilled Hours', dataIndex: 'unbilled_hours', key: 'unbilled_hours', align: 'right', render: (v: number) => <Text type={parseFloat(String(v)) > 0 ? 'warning' : undefined}>{parseFloat(String(v)).toFixed(1)}h</Text> },
    { title: 'Unbilled Amount', dataIndex: 'unbilled_amount', key: 'unbilled_amount', align: 'right', render: (v: number) => <Text strong style={{ color: parseFloat(String(v)) > 0 ? '#faad14' : undefined }}>{fmtZAR(parseFloat(String(v)))}</Text> },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Time Tracking</Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>Refresh</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Log Time</Button>
        </Space>
      </div>

      {/* Stats */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={8}>
          <Card size="small" style={{ borderLeft: '3px solid #1890ff' }}>
            <Statistic title="Total Hours (filtered)" value={totalHours.toFixed(1)} suffix="h" prefix={<ClockCircleOutlined style={{ color: '#1890ff' }} />} />
          </Card>
        </Col>
        <Col xs={12} sm={8}>
          <Card size="small" style={{ borderLeft: '3px solid #52c41a' }}>
            <Statistic title="Billable Hours" value={billableHours.toFixed(1)} suffix="h" prefix={<ClockCircleOutlined style={{ color: '#52c41a' }} />} />
          </Card>
        </Col>
        <Col xs={12} sm={8}>
          <Card size="small" style={{ borderLeft: '3px solid #faad14' }}>
            <Statistic title="Total WIP (Unbilled)" value={fmtZAR(unbilledAmt)} prefix={<DollarOutlined style={{ color: '#faad14' }} />} valueStyle={{ fontSize: 18 }} />
          </Card>
        </Col>
      </Row>

      {/* WIP Summary */}
      {wip.length > 0 && (
        <Card
          title={<Space><DollarOutlined />Work in Progress (Unbilled)</Space>}
          size="small"
          style={{ marginBottom: 16 }}
        >
          <Table
            dataSource={wip}
            columns={wipColumns}
            rowKey="client_tenant_id"
            size="small"
            pagination={false}
          />
        </Card>
      )}

      {/* Filters */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={12} align="middle">
          <Col><FilterOutlined style={{ color: '#8c8c8c' }} /></Col>
          <Col xs={24} sm={5}>
            <Select allowClear placeholder="All Clients" style={{ width: '100%' }} value={filterClient} onChange={v => { setFilterClient(v); setFilterJob(undefined); }}>
              {clients.map(c => <Option key={c.tenant_id} value={c.tenant_id}>{c.company_name}</Option>)}
            </Select>
          </Col>
          <Col xs={24} sm={4}>
            <Select allowClear placeholder="All Jobs" style={{ width: '100%' }} value={filterJob} onChange={setFilterJob}>
              {jobs.filter(j => !filterClient || j.client_tenant_id === filterClient).map(j => <Option key={j.id} value={j.id}>{j.title}</Option>)}
            </Select>
          </Col>
          <Col xs={24} sm={4}>
            <Select allowClear placeholder="Billable?" style={{ width: '100%' }} value={filterBillable} onChange={setFilterBillable}>
              <Option value="true">Billable</Option>
              <Option value="false">Non-billable</Option>
            </Select>
          </Col>
          <Col xs={24} sm={4}>
            <Select allowClear placeholder="Invoiced?" style={{ width: '100%' }} value={filterInvoiced} onChange={setFilterInvoiced}>
              <Option value="false">WIP (not invoiced)</Option>
              <Option value="true">Invoiced</Option>
            </Select>
          </Col>
        </Row>
      </Card>

      {/* Table */}
      <Card>
        {loading ? (
          <Spin size="large" style={{ display: 'block', margin: '60px auto' }} />
        ) : entries.length === 0 ? (
          <Empty description="No time entries yet" image={Empty.PRESENTED_IMAGE_SIMPLE}>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Log Time</Button>
          </Empty>
        ) : (
          <Table
            dataSource={entries}
            columns={columns}
            rowKey="id"
            size="small"
            scroll={{ x: 1000 }}
            pagination={{ pageSize: 25, showTotal: t => `${t} entries` }}
            summary={pageData => {
              const hrs = pageData.reduce((s, e) => s + parseFloat(String(e.hours)), 0);
              const amt = pageData.reduce((s, e) => s + (parseFloat(String(e.amount ?? 0)) || 0), 0);
              return (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={4}><Text strong>Page Total</Text></Table.Summary.Cell>
                  <Table.Summary.Cell index={4} align="right"><Text strong>{hrs.toFixed(2)}h</Text></Table.Summary.Cell>
                  <Table.Summary.Cell index={5} />
                  <Table.Summary.Cell index={6} align="right"><Text strong>{fmtZAR(amt)}</Text></Table.Summary.Cell>
                  <Table.Summary.Cell index={7} colSpan={3} />
                </Table.Summary.Row>
              );
            }}
          />
        )}
      </Card>

      {/* Log Time Modal */}
      <Modal
        title={editEntry ? 'Edit Time Entry' : 'Log Time'}
        open={modalOpen}
        onCancel={() => setModal(false)}
        onOk={handleSave}
        confirmLoading={saving}
        okText={editEntry ? 'Save Changes' : 'Log Time'}
        width={560}
        destroyOnClose
      >
        <Form form={form} layout="vertical" requiredMark="optional">
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="client_tenant_id" label="Client" rules={[{ required: true }]}>
                <Select
                  placeholder="Select client"
                  showSearch
                  optionFilterProp="children"
                  onChange={clientId => { form.setFieldValue('job_id', undefined); loadJobs(clientId); }}
                >
                  {clients.map(c => <Option key={c.tenant_id} value={c.tenant_id}>{c.company_name}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="job_id" label="Job (optional)">
                <Select allowClear placeholder="Link to a job (optional)" showSearch optionFilterProp="children">
                  {jobs.map(j => <Option key={j.id} value={j.id}>{j.title}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="date" label="Date" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} format="DD MMM YYYY" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="hours" label="Hours" rules={[{ required: true }]}>
                <InputNumber min={0.1} max={24} step={0.25} style={{ width: '100%' }} placeholder="1.5" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="description" label="Description" rules={[{ required: true, whitespace: true }]}>
                <TextArea rows={2} placeholder="What did you work on?" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="billable" label="Billable" valuePropName="checked" initialValue={true}>
                <Switch checkedChildren="Yes" unCheckedChildren="No" />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item name="rate" label="Hourly Rate (ZAR, optional)">
                <InputNumber min={0} style={{ width: '100%' }} prefix="R" placeholder="Leave blank to use client rate" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default TimeTrackingPage;
