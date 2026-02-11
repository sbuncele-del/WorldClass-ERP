import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Typography,
  Table,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  message,
  Space,
  Statistic,
  Switch,
  Dropdown,
  Tabs,
} from 'antd';
import {
  PlusOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
  DeleteOutlined,
  EditOutlined,
  MoreOutlined,
  DollarOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import apiClient from '../../../services/api';
import { practiceService } from '../../../services/practice.service';

const { Text } = Typography;
const { Option } = Select;

const TimeTrackingPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [showNewModal, setShowNewModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState('entries');
  const [stats, setStats] = useState({ totalHours: 0, billableHours: 0, pendingCount: 0 });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [entriesRes, projectsRes, pendingRes] = await Promise.all([
        apiClient.get('/api/v2/practice/time-entries', { params: { limit: 50 } }).catch(() => ({ data: { data: [] } })),
        apiClient.get('/api/v2/practice/projects').catch(() => ({ data: { data: [] } })),
        apiClient.get('/api/v2/practice/pending-approvals').catch(() => ({ data: { data: [] } })),
      ]);

      const entryList = entriesRes.data?.data || entriesRes.data?.time_entries || [];
      if (Array.isArray(entryList)) {
        setEntries(entryList);
        const totalH = entryList.reduce((sum: number, e: any) => sum + Number(e.hours || 0), 0);
        const billH = entryList.filter((e: any) => e.is_billable).reduce((sum: number, e: any) => sum + Number(e.hours || 0), 0);
        setStats(prev => ({ ...prev, totalHours: totalH, billableHours: billH }));
      }

      const projList = projectsRes.data?.data || projectsRes.data?.projects || [];
      if (Array.isArray(projList)) setProjects(projList);

      const pendList = pendingRes.data?.data || pendingRes.data?.pending || [];
      if (Array.isArray(pendList)) {
        setPendingApprovals(pendList);
        setStats(prev => ({ ...prev, pendingCount: pendList.length }));
      }
    } catch (err) {
      console.error('Error fetching time entries:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        project_id: values.project,
        entry_date: values.date?.format('YYYY-MM-DD') || new Date().toISOString().slice(0, 10),
        hours: Number(values.hours),
        description: values.description,
        is_billable: values.billable ?? true,
      };
      if (editingEntry) {
        const entryId = editingEntry.entry_id || editingEntry.id;
        await practiceService.updateTimeEntry(entryId, payload);
        message.success('Time entry updated');
      } else {
        await practiceService.createTimeEntry(payload);
        message.success('Time entry logged');
      }
      setShowNewModal(false);
      setEditingEntry(null);
      form.resetFields();
      fetchData();
    } catch (err: any) {
      if (err.errorFields) return;
      message.error(editingEntry ? 'Failed to update time entry' : 'Failed to log time entry');
    }
  };

  const openEditEntry = (record: any) => {
    setEditingEntry(record);
    form.setFieldsValue({
      project: record.project_id || record.matter_id,
      hours: record.hours,
      description: record.description,
      billable: record.is_billable,
      // Date would require dayjs conversion -- left blank for manual re-entry
    });
    setShowNewModal(true);
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this time entry?');
    if (!confirmed) return;
    try {
      await practiceService.deleteTimeEntry(id);
      message.success('Time entry deleted');
      fetchData();
    } catch {
      message.error('Failed to delete entry');
    }
  };

  const handleApprove = async (ids: string[]) => {
    try {
      await practiceService.approveTimeEntries(ids);
      message.success(`${ids.length} entries approved`);
      fetchData();
    } catch {
      message.error('Failed to approve entries');
    }
  };

  const entryColumns = [
    {
      title: 'Date',
      key: 'date',
      width: 110,
      render: (_: any, r: any) => <Text>{(r.entry_date || r.date || '').slice(0, 10)}</Text>,
    },
    {
      title: 'Project / Engagement',
      key: 'project',
      render: (_: any, r: any) => (
        <div>
          <Text strong>{r.project_name || r.matter_name || '—'}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>{r.client_name || r.customer_name || ''}</Text>
        </div>
      ),
    },
    {
      title: 'Description',
      key: 'description',
      ellipsis: true,
      render: (_: any, r: any) => <Text>{r.description || '—'}</Text>,
    },
    {
      title: 'Hours',
      key: 'hours',
      width: 90,
      render: (_: any, r: any) => <Text strong>{Number(r.hours || 0).toFixed(1)}h</Text>,
    },
    {
      title: 'Billable',
      key: 'billable',
      width: 80,
      render: (_: any, r: any) => (
        <Tag color={r.is_billable ? 'green' : 'default'}>
          {r.is_billable ? 'Yes' : 'No'}
        </Tag>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      width: 100,
      render: (_: any, r: any) => {
        const s = (r.status || 'pending').toLowerCase();
        return <Tag color={s === 'approved' ? 'green' : s === 'rejected' ? 'red' : 'orange'}>{r.status || 'Pending'}</Tag>;
      },
    },
    {
      title: '',
      key: 'actions',
      width: 50,
      render: (_: any, r: any) => (
        <Dropdown
          menu={{
            items: [
              { key: 'edit', icon: <EditOutlined />, label: 'Edit', onClick: () => openEditEntry(r) },
              { key: 'delete', icon: <DeleteOutlined />, label: 'Delete', danger: true, onClick: () => handleDelete(r.entry_id || r.id) },
            ],
          }}
          trigger={['click']}
        >
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
      ),
    },
  ];

  const pendingColumns = [
    {
      title: 'Employee',
      key: 'employee',
      render: (_: any, r: any) => <Text strong>{r.employee_name || r.user_name || '—'}</Text>,
    },
    {
      title: 'Project',
      key: 'project',
      render: (_: any, r: any) => <Text>{r.project_name || '—'}</Text>,
    },
    {
      title: 'Date',
      key: 'date',
      render: (_: any, r: any) => <Text>{(r.entry_date || '').slice(0, 10)}</Text>,
    },
    {
      title: 'Hours',
      key: 'hours',
      render: (_: any, r: any) => <Text strong>{Number(r.hours || 0).toFixed(1)}h</Text>,
    },
    {
      title: 'Description',
      key: 'desc',
      ellipsis: true,
      render: (_: any, r: any) => <Text>{r.description || '—'}</Text>,
    },
    {
      title: 'Action',
      key: 'action',
      width: 120,
      render: (_: any, r: any) => (
        <Button type="primary" size="small" icon={<CheckCircleOutlined />} onClick={() => handleApprove([r.entry_id || r.id])}>
          Approve
        </Button>
      ),
    },
  ];

  return (
    <div>
      {/* Stats */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card>
            <Statistic title="Total Hours (Period)" value={stats.totalHours.toFixed(1)} suffix="h" prefix={<ClockCircleOutlined />} valueStyle={{ color: '#667eea' }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="Billable Hours" value={stats.billableHours.toFixed(1)} suffix="h" prefix={<DollarOutlined />} valueStyle={{ color: '#10b981' }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="Pending Approvals" value={stats.pendingCount} prefix={<CalendarOutlined />} valueStyle={{ color: '#f59e0b' }} />
          </Card>
        </Col>
      </Row>

      <Card
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchData}>Refresh</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingEntry(null); form.resetFields(); setShowNewModal(true); }}>
              Log Time
            </Button>
          </Space>
        }
      >
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
          {
            key: 'entries',
            label: <><ClockCircleOutlined /> My Time Entries</>,
            children: (
              <Table
                dataSource={entries}
                columns={entryColumns}
                rowKey={(r) => r.entry_id || r.id || Math.random()}
                loading={loading}
                pagination={{ pageSize: 15 }}
                locale={{ emptyText: 'No time entries yet — log your first entry' }}
              />
            ),
          },
          {
            key: 'approvals',
            label: (
              <Space>
                <CheckCircleOutlined /> Pending Approvals
                {stats.pendingCount > 0 && <Tag color="orange">{stats.pendingCount}</Tag>}
              </Space>
            ),
            children: (
              <Table
                dataSource={pendingApprovals}
                columns={pendingColumns}
                rowKey={(r) => r.entry_id || r.id || Math.random()}
                loading={loading}
                pagination={{ pageSize: 15 }}
                locale={{ emptyText: 'No pending approvals' }}
              />
            ),
          },
        ]} />
      </Card>

      {/* Log/Edit Time Modal */}
      <Modal
        title={editingEntry ? 'Edit Time Entry' : 'Log Time Entry'}
        open={showNewModal}
        onCancel={() => { setShowNewModal(false); setEditingEntry(null); form.resetFields(); }}
        onOk={handleCreate}
        okText={editingEntry ? 'Update Entry' : 'Log Time'}
        width={520}
      >
        <Form form={form} layout="vertical" initialValues={{ billable: true }}>
          <Form.Item label="Project / Engagement" name="project" rules={[{ required: true, message: 'Select a project' }]}>
            <Select placeholder="Select project" showSearch optionFilterProp="children">
              {projects.map((p: any) => (
                <Option key={p.project_id || p.id} value={p.project_id || p.id}>
                  {p.project_name || p.name} {p.client_name ? `(${p.client_name})` : ''}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Date" name="date" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Hours" name="hours" rules={[{ required: true, message: 'Enter hours' }]}>
                <Input type="number" step="0.5" min="0.5" max="24" placeholder="0.0" suffix="h" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Description" name="description" rules={[{ required: true, message: 'Describe the work' }]}>
            <Input.TextArea rows={3} placeholder="What did you work on?" />
          </Form.Item>
          <Form.Item label="Billable" name="billable" valuePropName="checked">
            <Switch checkedChildren="Billable" unCheckedChildren="Non-billable" defaultChecked />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TimeTrackingPage;
