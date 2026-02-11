import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Row,
  Col,
  Button,
  Typography,
  Table,
  Tag,
  Progress,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  message,
  Space,
  Statistic,
  Spin,
  Badge,
  Tooltip,
  Dropdown,
} from 'antd';
import {
  PlusOutlined,
  ProjectOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  EditOutlined,
  DeleteOutlined,
  MoreOutlined,
  ReloadOutlined,
  FireOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import apiClient from '../../../services/api';
import { practiceService } from '../../../services/practice.service';

const { Title, Text } = Typography;
const { Option } = Select;

const EngagementsPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<any[]>([]);
  const [salesCustomers, setSalesCustomers] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [showNewModal, setShowNewModal] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [form] = Form.useForm();
  const [stats, setStats] = useState({ total: 0, active: 0, completed: 0, planning: 0 });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [projRes, custRes, usersRes] = await Promise.all([
        apiClient.get('/api/v2/practice/projects').catch(() => ({ data: { data: [] } })),
        apiClient.get('/api/sales/customers', { params: { limit: 100 } }).catch(() => ({ data: { customers: [] } })),
        apiClient.get('/api/v2/admin/users').catch(() => ({ data: { data: [] } })),
      ]);

      const projList = projRes.data?.data || projRes.data?.projects || [];
      if (Array.isArray(projList)) {
        setProjects(projList);
        setStats({
          total: projList.length,
          active: projList.filter((p: any) => ['active', 'in_progress'].includes((p.status || '').toLowerCase())).length,
          completed: projList.filter((p: any) => (p.status || '').toLowerCase() === 'completed').length,
          planning: projList.filter((p: any) => (p.status || '').toLowerCase() === 'planning').length,
        });
      }

      const custList = custRes.data?.customers || custRes.data?.data || [];
      if (Array.isArray(custList)) setSalesCustomers(custList);

      const usersList = usersRes.data?.data || usersRes.data?.users || [];
      if (Array.isArray(usersList)) setTeamMembers(usersList);
    } catch (err) {
      console.error('Error fetching engagements:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreateEngagement = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        project_name: values.name,
        customer_id: values.client,
        status: editingProject ? values.status || editingProject.status : 'planning',
        start_date: values.startDate?.format('YYYY-MM-DD'),
        end_date: values.endDate?.format('YYYY-MM-DD'),
        budget: Number(values.budget || 0),
        description: values.description,
        project_type: values.type,
      };
      if (editingProject) {
        const projectId = editingProject.project_id || editingProject.id;
        await practiceService.updateProject(projectId, payload);
        message.success('Engagement updated successfully');
      } else {
        await practiceService.createProject(payload);
        message.success('Engagement created successfully');
      }
      setShowNewModal(false);
      setEditingProject(null);
      form.resetFields();
      fetchData();
    } catch (err: any) {
      if (err.errorFields) return; // validation error
      message.error(editingProject ? 'Failed to update engagement' : 'Failed to create engagement');
      console.error(err);
    }
  };

  const openEditEngagement = (record: any) => {
    setEditingProject(record);
    form.setFieldsValue({
      name: record.project_name || record.name,
      client: record.customer_id || record.client_id,
      type: record.project_type || record.type,
      status: record.status,
      budget: record.budget,
      description: record.description,
      // Dates would require dayjs/moment conversion -- left blank for manual re-entry
    });
    setShowNewModal(true);
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm('Are you sure you want to cancel this engagement? It will be marked as cancelled.');
    if (!confirmed) return;
    try {
      await practiceService.updateProject(id, { status: 'cancelled' });
      message.success('Engagement cancelled');
      fetchData();
    } catch {
      message.error('Failed to cancel engagement');
    }
  };

  const getPriorityTag = (priority: string) => {
    const configs: Record<string, { color: string; icon: React.ReactNode }> = {
      high: { color: '#ef4444', icon: <FireOutlined /> },
      medium: { color: '#f59e0b', icon: <ExclamationCircleOutlined /> },
      low: { color: '#10b981', icon: <CheckCircleOutlined /> },
    };
    const config = configs[(priority || 'medium').toLowerCase()] || { color: '#64748b', icon: null };
    return <Tag color={config.color} icon={config.icon} style={{ textTransform: 'capitalize' }}>{priority || 'Medium'}</Tag>;
  };

  const columns = [
    {
      title: 'Engagement',
      key: 'name',
      render: (_: any, r: any) => (
        <div>
          <Text strong>{r.project_name || r.name}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>{r.project_type || r.type || '—'}</Text>
        </div>
      ),
    },
    {
      title: 'Client',
      key: 'client',
      render: (_: any, r: any) => <Text>{r.client_name || r.customer_name || 'Internal'}</Text>,
    },
    {
      title: 'Status',
      key: 'status',
      render: (_: any, r: any) => {
        const s = (r.status || 'active').toLowerCase();
        const color = s === 'completed' ? 'green' : s === 'in_progress' || s === 'active' ? 'blue' : s === 'planning' ? 'orange' : s === 'cancelled' ? 'red' : 'default';
        return <Tag color={color}>{(r.status || 'Active').replace(/_/g, ' ')}</Tag>;
      },
    },
    {
      title: 'Progress',
      key: 'progress',
      width: 160,
      render: (_: any, r: any) => {
        const pct = Number(r.progress || r.completion_percentage || 0);
        return <Progress percent={pct} size="small" strokeColor={pct >= 80 ? '#10b981' : '#667eea'} />;
      },
    },
    {
      title: 'Budget',
      key: 'budget',
      render: (_: any, r: any) => <Text>R {Number(r.budget || 0).toLocaleString('en-ZA')}</Text>,
    },
    {
      title: 'Period',
      key: 'dates',
      render: (_: any, r: any) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {(r.start_date || '').slice(0, 10)} — {(r.end_date || '').slice(0, 10)}
        </Text>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 50,
      render: (_: any, r: any) => (
        <Dropdown
          menu={{
            items: [
              { key: 'edit', icon: <EditOutlined />, label: 'Edit Engagement', onClick: () => openEditEngagement(r) },
              { key: 'time', icon: <ClockCircleOutlined />, label: 'Log Time', onClick: () => navigate(
                (window.location.pathname.startsWith('/app/practice-hub') ? '/app/practice-hub' : '/app/practice') + '/time-tracking'
              )},
              { type: 'divider' as const },
              { key: 'delete', icon: <DeleteOutlined />, label: 'Cancel', danger: true, onClick: () => handleDelete(r.project_id || r.id) },
            ],
          }}
          trigger={['click']}
        >
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
      ),
    },
  ];

  return (
    <div>
      {/* Stats */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic title="Total Engagements" value={stats.total} prefix={<ProjectOutlined />} valueStyle={{ color: '#667eea' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Active" value={stats.active} prefix={<ClockCircleOutlined />} valueStyle={{ color: '#3b82f6' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Planning" value={stats.planning} prefix={<ExclamationCircleOutlined />} valueStyle={{ color: '#f59e0b' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Completed" value={stats.completed} prefix={<CheckCircleOutlined />} valueStyle={{ color: '#10b981' }} />
          </Card>
        </Col>
      </Row>

      {/* Engagements Table */}
      <Card
        title={<><ProjectOutlined /> Engagements</>}
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchData}>Refresh</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingProject(null); form.resetFields(); setShowNewModal(true); }}>
              New Engagement
            </Button>
          </Space>
        }
      >
        <Table
          dataSource={projects}
          columns={columns}
          rowKey={(r) => r.project_id || r.id || Math.random()}
          loading={loading}
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: 'No engagements yet — create your first, or convert a Sales quotation.' }}
        />
      </Card>

      {/* New Engagement Modal */}
      <Modal
        title={editingProject ? 'Edit Engagement' : 'Create New Engagement'}
        open={showNewModal}
        onCancel={() => { setShowNewModal(false); setEditingProject(null); form.resetFields(); }}
        onOk={handleCreateEngagement}
        okText={editingProject ? 'Update Engagement' : 'Create Engagement'}
        width={640}
      >
        <Form form={form} layout="vertical">
          <Form.Item label="Engagement Name" name="name" rules={[{ required: true, message: 'Please enter a name' }]}>
            <Input placeholder="e.g., 2026 Annual Audit — Acme Corp" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Client" name="client" rules={[{ required: true, message: 'Please select a client' }]}>
                <Select placeholder="Select client" showSearch optionFilterProp="children">
                  <Option value="internal">Internal Project</Option>
                  {salesCustomers.map((c: any) => (
                    <Option key={c.id || c.customer_id} value={c.id || c.customer_id}>
                      {c.customer_name || c.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Engagement Type" name="type" rules={[{ required: true }]}>
                <Select placeholder="Select type">
                  <Option value="audit">Annual Audit</Option>
                  <Option value="review">Review</Option>
                  <Option value="tax">Tax Services</Option>
                  <Option value="advisory">Advisory</Option>
                  <Option value="accounting">Monthly Accounting</Option>
                  <Option value="consulting">Consulting</Option>
                  <Option value="compliance">Compliance</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Start Date" name="startDate">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="End Date" name="endDate">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Budget" name="budget">
                <Input prefix="R" placeholder="0" type="number" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Assigned To" name="assignee">
                <Select placeholder="Select team member" showSearch optionFilterProp="children" allowClear>
                  {teamMembers.map((u: any) => (
                    <Option key={u.id || u.user_id} value={u.id || u.user_id}>
                      {u.full_name || u.name || u.email}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Description" name="description">
            <Input.TextArea rows={3} placeholder="Scope, deliverables, and notes..." />
          </Form.Item>
          {editingProject && (
            <Form.Item label="Status" name="status">
              <Select placeholder="Select status">
                <Option value="planning">Planning</Option>
                <Option value="active">Active</Option>
                <Option value="in_progress">In Progress</Option>
                <Option value="completed">Completed</Option>
                <Option value="on_hold">On Hold</Option>
                <Option value="cancelled">Cancelled</Option>
              </Select>
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default EngagementsPage;
