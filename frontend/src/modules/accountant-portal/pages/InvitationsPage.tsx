import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Tabs,
  Modal,
  Form,
  Input,
  Select,
  Tag,
  Space,
  message,
  Empty,
  Typography,
  Row,
  Col,
  Popconfirm,
  Tooltip,
} from 'antd';
import {
  SendOutlined,
  PlusOutlined,
  UserAddOutlined,
  ReloadOutlined,
  DeleteOutlined,
  RedoOutlined,
  MailOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Invitation {
  id: string;
  type: 'client' | 'team';
  email: string;
  first_name: string;
  last_name: string;
  company_name: string;
  role: string;
  status: string;
  engagement_type: string;
  sent_at: string;
  expires_at: string;
  accepted_at: string | null;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const statusColor: Record<string, string> = {
  pending: 'orange',
  accepted: 'green',
  expired: 'red',
  cancelled: 'default',
};

const formatDate = (iso: string) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
};

const authHeaders = () => ({
  'Authorization': `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json',
});

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const InvitationsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [clientModalVisible, setClientModalVisible] = useState(false);
  const [teamModalVisible, setTeamModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('client');
  const [clientForm] = Form.useForm();
  const [teamForm] = Form.useForm();

  const fetchInvitations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v2/accountant-portal/invitations', { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to load invitations');
      const json = await res.json();
      setInvitations(json.data || []);
    } catch (err) {
      console.error('Invitations fetch error:', err);
      message.error('Failed to load invitations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  /* ---------- actions ---------- */
  const handleInviteClient = async (values: any) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/v2/accountant-portal/invitations/client', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (json.success) {
        message.success('Client invitation sent successfully');
        setClientModalVisible(false);
        clientForm.resetFields();
        fetchInvitations();
      } else {
        message.error(json.message || 'Failed to send invitation');
      }
    } catch {
      message.error('Failed to send client invitation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInviteTeam = async (values: any) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/v2/accountant-portal/invitations/team', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (json.success) {
        message.success('Team invitation sent successfully');
        setTeamModalVisible(false);
        teamForm.resetFields();
        fetchInvitations();
      } else {
        message.error(json.message || 'Failed to send invitation');
      }
    } catch {
      message.error('Failed to send team invitation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id: string) => {
    try {
      const res = await fetch(`/api/v2/accountant-portal/invitations/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      const json = await res.json();
      if (json.success) {
        message.success('Invitation cancelled');
        fetchInvitations();
      } else {
        message.error(json.message || 'Failed to cancel invitation');
      }
    } catch {
      message.error('Failed to cancel invitation');
    }
  };

  const handleResend = async (invitation: Invitation) => {
    setSubmitting(true);
    try {
      const endpoint = invitation.type === 'client'
        ? '/api/v2/accountant-portal/invitations/client'
        : '/api/v2/accountant-portal/invitations/team';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          email: invitation.email,
          first_name: invitation.first_name,
          last_name: invitation.last_name,
          company_name: invitation.company_name,
          engagement_type: invitation.engagement_type,
          role: invitation.role,
        }),
      });
      const json = await res.json();
      if (json.success) {
        message.success('Invitation resent');
        fetchInvitations();
      } else {
        message.error(json.message || 'Failed to resend');
      }
    } catch {
      message.error('Failed to resend invitation');
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------- filtered lists ---------- */
  const clientInvitations = invitations.filter((i) => i.type === 'client');
  const teamInvitations = invitations.filter((i) => i.type === 'team');

  /* ---------- columns ---------- */
  const clientColumns: ColumnsType<Invitation> = [
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (v: string) => <Text copyable>{v}</Text>,
    },
    {
      title: 'Contact Name',
      key: 'name',
      render: (_: any, r) => [r.first_name, r.last_name].filter(Boolean).join(' ') || '—',
    },
    {
      title: 'Company',
      dataIndex: 'company_name',
      key: 'company_name',
      render: (v: string) => v || '—',
    },
    {
      title: 'Engagement',
      dataIndex: 'engagement_type',
      key: 'engagement_type',
      responsive: ['lg' as const],
      render: (v: string) => v ? <Tag>{v}</Tag> : '—',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      filters: [
        { text: 'Pending', value: 'pending' },
        { text: 'Accepted', value: 'accepted' },
        { text: 'Expired', value: 'expired' },
        { text: 'Cancelled', value: 'cancelled' },
      ],
      onFilter: (val, record) => record.status === val,
      render: (s: string) => <Tag color={statusColor[s] || 'default'}>{s}</Tag>,
    },
    {
      title: 'Sent',
      dataIndex: 'sent_at',
      key: 'sent_at',
      responsive: ['md' as const],
      render: formatDate,
    },
    {
      title: 'Expires',
      dataIndex: 'expires_at',
      key: 'expires_at',
      responsive: ['lg' as const],
      render: formatDate,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_: any, record) => (
        <Space size="small">
          {record.status === 'pending' && (
            <>
              <Tooltip title="Resend">
                <Button size="small" icon={<RedoOutlined />} onClick={() => handleResend(record)} />
              </Tooltip>
              <Popconfirm title="Cancel this invitation?" onConfirm={() => handleCancel(record.id)}>
                <Tooltip title="Cancel">
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Tooltip>
              </Popconfirm>
            </>
          )}
          {record.status === 'expired' && (
            <Tooltip title="Resend">
              <Button size="small" icon={<RedoOutlined />} onClick={() => handleResend(record)} />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  const teamColumns: ColumnsType<Invitation> = [
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (v: string) => <Text copyable>{v}</Text>,
    },
    {
      title: 'Name',
      key: 'name',
      render: (_: any, r) => [r.first_name, r.last_name].filter(Boolean).join(' ') || '—',
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (v: string) => v ? <Tag color="blue">{v}</Tag> : '—',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => <Tag color={statusColor[s] || 'default'}>{s}</Tag>,
    },
    {
      title: 'Sent',
      dataIndex: 'sent_at',
      key: 'sent_at',
      render: formatDate,
    },
    {
      title: 'Expires',
      dataIndex: 'expires_at',
      key: 'expires_at',
      responsive: ['md' as const],
      render: formatDate,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_: any, record) => (
        <Space size="small">
          {record.status === 'pending' && (
            <>
              <Tooltip title="Resend">
                <Button size="small" icon={<RedoOutlined />} onClick={() => handleResend(record)} />
              </Tooltip>
              <Popconfirm title="Cancel this invitation?" onConfirm={() => handleCancel(record.id)}>
                <Tooltip title="Cancel">
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Tooltip>
              </Popconfirm>
            </>
          )}
          {record.status === 'expired' && (
            <Tooltip title="Resend">
              <Button size="small" icon={<RedoOutlined />} onClick={() => handleResend(record)} />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            <SendOutlined style={{ marginRight: 8 }} />
            Invitations
          </Title>
        </Col>
        <Col>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchInvitations} />
            <Button icon={<UserAddOutlined />} onClick={() => setTeamModalVisible(true)}>
              Invite Team Member
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setClientModalVisible(true)}>
              Invite Client
            </Button>
          </Space>
        </Col>
      </Row>

      <Card bodyStyle={{ padding: 0 }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          tabBarStyle={{ padding: '0 16px' }}
          items={[
            {
              key: 'client',
              label: (
                <span>
                  <MailOutlined /> Client Invitations ({clientInvitations.length})
                </span>
              ),
              children: (
                <Table
                  columns={clientColumns}
                  dataSource={clientInvitations}
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 10, showSizeChanger: true }}
                  locale={{ emptyText: <Empty description="No client invitations yet" /> }}
                  scroll={{ x: 800 }}
                />
              ),
            },
            {
              key: 'team',
              label: (
                <span>
                  <TeamOutlined /> Team Invitations ({teamInvitations.length})
                </span>
              ),
              children: (
                <Table
                  columns={teamColumns}
                  dataSource={teamInvitations}
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 10, showSizeChanger: true }}
                  locale={{ emptyText: <Empty description="No team invitations yet" /> }}
                  scroll={{ x: 700 }}
                />
              ),
            },
          ]}
        />
      </Card>

      {/* ---- Invite Client Modal ---- */}
      <Modal
        title="Invite Client"
        open={clientModalVisible}
        onCancel={() => { setClientModalVisible(false); clientForm.resetFields(); }}
        footer={null}
        width={520}
      >
        <Form form={clientForm} layout="vertical" onFinish={handleInviteClient}>
          <Form.Item
            name="email"
            label="Email Address"
            rules={[
              { required: true, message: 'Email is required' },
              { type: 'email', message: 'Enter a valid email' },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="client@company.com" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="first_name" label="First Name">
                <Input placeholder="First name" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="last_name" label="Last Name">
                <Input placeholder="Last name" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="company_name" label="Company Name">
            <Input placeholder="Company name" />
          </Form.Item>
          <Form.Item name="engagement_type" label="Engagement Type">
            <Select placeholder="Select engagement type" allowClear>
              <Option value="full_service">Full Service</Option>
              <Option value="tax_only">Tax Only</Option>
              <Option value="bookkeeping">Bookkeeping</Option>
              <Option value="audit">Audit</Option>
              <Option value="advisory">Advisory</Option>
              <Option value="payroll">Payroll</Option>
            </Select>
          </Form.Item>
          <Form.Item name="message" label="Personal Message (optional)">
            <TextArea rows={3} placeholder="Include a personal message with the invitation…" />
          </Form.Item>
          <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
            <Space>
              <Button onClick={() => { setClientModalVisible(false); clientForm.resetFields(); }}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={submitting} icon={<SendOutlined />}>
                Send Invitation
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* ---- Invite Team Member Modal ---- */}
      <Modal
        title="Invite Team Member"
        open={teamModalVisible}
        onCancel={() => { setTeamModalVisible(false); teamForm.resetFields(); }}
        footer={null}
        width={480}
      >
        <Form form={teamForm} layout="vertical" onFinish={handleInviteTeam}>
          <Form.Item
            name="email"
            label="Email Address"
            rules={[
              { required: true, message: 'Email is required' },
              { type: 'email', message: 'Enter a valid email' },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="colleague@firm.com" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="first_name"
                label="First Name"
                rules={[{ required: true, message: 'First name is required' }]}
              >
                <Input placeholder="First name" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="last_name"
                label="Last Name"
                rules={[{ required: true, message: 'Last name is required' }]}
              >
                <Input placeholder="Last name" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="role"
            label="Role"
            rules={[{ required: true, message: 'Role is required' }]}
          >
            <Select placeholder="Select role">
              <Option value="partner">Partner</Option>
              <Option value="senior_accountant">Senior Accountant</Option>
              <Option value="accountant">Accountant</Option>
              <Option value="junior_accountant">Junior Accountant</Option>
              <Option value="bookkeeper">Bookkeeper</Option>
              <Option value="tax_specialist">Tax Specialist</Option>
              <Option value="audit_clerk">Audit Clerk</Option>
              <Option value="admin">Admin</Option>
            </Select>
          </Form.Item>
          <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
            <Space>
              <Button onClick={() => { setTeamModalVisible(false); teamForm.resetFields(); }}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={submitting} icon={<SendOutlined />}>
                Send Invitation
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default InvitationsPage;
