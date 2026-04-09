/**
 * SupportTicketsHub — Client Service Desk
 * 
 * Proper Hub pattern with HubLayout > HubHeader + StatusBanner + HubTabs.
 * Tickets linked to customers (existing from Sales/CRM or new inline clients).
 * Email notifications sent to client & assigned staff on create/reply.
 */
import React, { useState, useEffect } from 'react';
import {
  Card, Row, Col, Table, Button, Tag, Space, Modal, Form, Input,
  Select, Badge, Empty, message, Avatar, Spin, Switch, Descriptions,
  Divider, Typography,
} from 'antd';
import {
  PlusOutlined, SearchOutlined, MessageOutlined,
  CheckCircleOutlined, ClockCircleOutlined, ExclamationCircleOutlined,
  UserOutlined, SendOutlined, ReloadOutlined, CustomerServiceOutlined,
  MailOutlined, PhoneOutlined, TeamOutlined,
} from '@ant-design/icons';
import { HubLayout, HubHeader, StatusBanner, HubTabs } from '../../components/hub';
import apiClient from '../../services/api';

const { TextArea } = Input;
const { Option } = Select;
const { Text } = Typography;

interface Ticket {
  id: string;
  ticket_number: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  created_at: string;
  updated_at: string;
  created_by_name: string;
  assigned_to: string | null;
  assigned_to_name?: string;
  customer_id: number | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  replies_count: number;
}

interface TicketReply {
  id: string;
  message: string;
  created_at: string;
  author_name: string;
  is_staff: boolean;
}

interface Customer {
  customer_id: number;
  company_name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
}

interface StaffUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

const statusConfig: Record<string, { color: string; label: string }> = {
  open: { color: 'blue', label: 'Open' },
  in_progress: { color: 'orange', label: 'In Progress' },
  waiting: { color: 'purple', label: 'Waiting' },
  resolved: { color: 'green', label: 'Resolved' },
  closed: { color: 'default', label: 'Closed' },
};

const priorityConfig: Record<string, { color: string; label: string }> = {
  low: { color: 'default', label: 'Low' },
  medium: { color: 'blue', label: 'Medium' },
  high: { color: 'orange', label: 'High' },
  critical: { color: 'red', label: 'Critical' },
};

const SupportTicketsHub: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [replies, setReplies] = useState<TicketReply[]>([]);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [form] = Form.useForm();
  const [replyForm] = Form.useForm();

  // Customer & staff data
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [isNewClient, setIsNewClient] = useState(false);

  // Stats
  const stats = {
    open: tickets.filter(t => t.status === 'open').length,
    in_progress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
    total: tickets.length,
  };

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/api/v2/support-tickets');
      const data = res.data?.tickets || res.data?.data || res.data || [];
      setTickets(Array.isArray(data) ? data : []);
    } catch {
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await apiClient.get('/api/v2/sales/customers?limit=500');
      const data = res.data?.customers || res.data?.data || res.data || [];
      setCustomers(Array.isArray(data) ? data : []);
    } catch {
      setCustomers([]);
    }
  };

  const fetchStaffUsers = async () => {
    try {
      const res = await apiClient.get('/api/v2/users?limit=100');
      const data = res.data?.users || res.data?.data || res.data || [];
      setStaffUsers(Array.isArray(data) ? data : []);
    } catch {
      setStaffUsers([]);
    }
  };

  useEffect(() => {
    fetchTickets();
    fetchCustomers();
    fetchStaffUsers();
  }, []);

  const handleCreateTicket = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const payload: any = {
        subject: values.subject,
        description: values.description,
        category: values.category,
        priority: values.priority,
        assigned_to: values.assigned_to || null,
      };

      if (isNewClient) {
        payload.customer_name = values.customer_name;
        payload.customer_email = values.customer_email;
        payload.customer_phone = values.customer_phone;
      } else if (values.customer_id) {
        payload.customer_id = values.customer_id;
      }

      await apiClient.post('/api/v2/support-tickets', payload);
      message.success('Ticket created — notifications sent');
      setCreateModalVisible(false);
      form.resetFields();
      setIsNewClient(false);
      fetchTickets();
    } catch (error: any) {
      if (error.errorFields) return;
      message.error(error.response?.data?.message || 'Failed to create ticket');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewTicket = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setViewModalVisible(true);
    setRepliesLoading(true);
    try {
      const res = await apiClient.get(`/api/v2/support-tickets/${ticket.id}/replies`);
      setReplies(res.data?.replies || res.data?.data || []);
    } catch {
      setReplies([]);
    } finally {
      setRepliesLoading(false);
    }
  };

  const handleReply = async () => {
    if (!selectedTicket) return;
    try {
      const values = await replyForm.validateFields();
      setSubmitting(true);
      await apiClient.post(`/api/v2/support-tickets/${selectedTicket.id}/replies`, values);
      message.success('Reply sent — client notified');
      replyForm.resetFields();
      const res = await apiClient.get(`/api/v2/support-tickets/${selectedTicket.id}/replies`);
      setReplies(res.data?.replies || res.data?.data || []);
    } catch (error: any) {
      if (error.errorFields) return;
      message.error('Failed to send reply');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    try {
      await apiClient.patch(`/api/v2/support-tickets/${ticketId}`, { status: newStatus });
      message.success(`Ticket ${newStatus.replace('_', ' ')}`);
      fetchTickets();
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(prev => prev ? { ...prev, status: newStatus as Ticket['status'] } : null);
      }
    } catch {
      message.error('Failed to update ticket status');
    }
  };

  // Filtered tickets based on tab + search + status filter
  const getFilteredTickets = (tabFilter?: string) => {
    let filtered = [...tickets];
    const tab = tabFilter || activeTab;

    // Tab-level filter
    if (tab === 'open') {
      filtered = filtered.filter(t => t.status === 'open' || t.status === 'in_progress' || t.status === 'waiting');
    } else if (tab === 'resolved') {
      filtered = filtered.filter(t => t.status === 'resolved' || t.status === 'closed');
    }

    // Status dropdown filter (within tab)
    if (statusFilter !== 'all') {
      filtered = filtered.filter(t => t.status === statusFilter);
    }

    // Search text
    if (searchText) {
      const term = searchText.toLowerCase();
      filtered = filtered.filter(t =>
        t.subject?.toLowerCase().includes(term) ||
        t.ticket_number?.toLowerCase().includes(term) ||
        t.customer_name?.toLowerCase().includes(term) ||
        t.customer_email?.toLowerCase().includes(term)
      );
    }

    return filtered;
  };

  const columns = [
    {
      title: 'Ticket',
      key: 'ticket',
      render: (_: any, record: Ticket) => (
        <div>
          <a onClick={() => handleViewTicket(record)} style={{ fontWeight: 500 }}>
            {record.ticket_number || `#${record.id?.slice(0, 8)}`}
          </a>
          <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{record.subject}</div>
        </div>
      ),
    },
    {
      title: 'Client',
      key: 'client',
      width: 180,
      render: (_: any, record: Ticket) => (
        <div>
          <Text strong style={{ fontSize: 13 }}>{record.customer_name || '—'}</Text>
          {record.customer_email && (
            <div style={{ fontSize: 11, color: '#888' }}>{record.customer_email}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => {
        const config = statusConfig[status] || statusConfig.open;
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      width: 100,
      render: (priority: string) => {
        const config = priorityConfig[priority] || priorityConfig.medium;
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (cat: string) => <Tag>{cat || 'General'}</Tag>,
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 110,
      render: (date: string) => date ? new Date(date).toLocaleDateString('en-ZA') : '-',
    },
    {
      title: 'Replies',
      dataIndex: 'replies_count',
      key: 'replies',
      width: 70,
      align: 'center' as const,
      render: (count: number) => <Badge count={count || 0} showZero style={{ backgroundColor: count ? '#1890ff' : '#d9d9d9' }} />,
    },
    {
      title: '',
      key: 'actions',
      width: 80,
      render: (_: any, record: Ticket) => (
        <Button type="link" onClick={() => handleViewTicket(record)}>View</Button>
      ),
    },
  ];

  // ── Ticket Table (shared between tabs) ───────────────────
  const TicketTable: React.FC<{ tabFilter?: string }> = ({ tabFilter }) => (
    <div>
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <Input
                placeholder="Search tickets, clients..."
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                style={{ width: 280 }}
                allowClear
              />
              <Select value={statusFilter} onChange={setStatusFilter} style={{ width: 140 }}>
                <Option value="all">All Status</Option>
                <Option value="open">Open</Option>
                <Option value="in_progress">In Progress</Option>
                <Option value="waiting">Waiting</Option>
                <Option value="resolved">Resolved</Option>
                <Option value="closed">Closed</Option>
              </Select>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card>
        <Table
          columns={columns}
          dataSource={getFilteredTickets(tabFilter)}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 15, showSizeChanger: true }}
          locale={{ emptyText: <Empty description="No tickets found" /> }}
        />
      </Card>
    </div>
  );

  // ── Hub Tabs ─────────────────────────────────────────────
  const tabs = [
    {
      key: 'all',
      label: 'All Tickets',
      icon: <CustomerServiceOutlined />,
      children: <TicketTable />,
    },
    {
      key: 'open',
      label: `Open (${stats.open + stats.in_progress})`,
      icon: <ExclamationCircleOutlined />,
      children: <TicketTable tabFilter="open" />,
    },
    {
      key: 'resolved',
      label: `Resolved (${stats.resolved})`,
      icon: <CheckCircleOutlined />,
      children: <TicketTable tabFilter="resolved" />,
    },
  ];

  return (
    <HubLayout>
      <HubHeader
        title="Support Tickets"
        subtitle="Client Service & Issue Tracking"
        icon={<CustomerServiceOutlined />}
        gradient="orange"
        actions={
          <>
            <Button icon={<ReloadOutlined />} onClick={fetchTickets}>Refresh</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { setCreateModalVisible(true); setIsNewClient(false); }}>
              New Ticket
            </Button>
          </>
        }
      />

      <StatusBanner
        gradient="orange"
        icon={<CustomerServiceOutlined />}
        title="Service Desk"
        subtitle="Client Tickets & Issues"
        stats={[
          { title: 'Open', value: stats.open, span: 5 },
          { title: 'In Progress', value: stats.in_progress, span: 5 },
          { title: 'Resolved', value: stats.resolved, span: 5 },
          { title: 'Total', value: stats.total, span: 5 },
        ]}
      />

      <HubTabs
        theme="orange"
        tabs={tabs}
        activeKey={activeTab}
        onChange={setActiveTab}
      />

      {/* ── Create Ticket Modal ─────────────────────────── */}
      <Modal
        title={<><PlusOutlined /> New Support Ticket</>}
        open={createModalVisible}
        onCancel={() => { setCreateModalVisible(false); form.resetFields(); setIsNewClient(false); }}
        footer={[
          <Button key="cancel" onClick={() => { setCreateModalVisible(false); form.resetFields(); setIsNewClient(false); }}>Cancel</Button>,
          <Button key="submit" type="primary" loading={submitting} onClick={handleCreateTicket} icon={<SendOutlined />}>
            Submit Ticket
          </Button>
        ]}
        width={680}
      >
        <Form form={form} layout="vertical">
          {/* Client Selection */}
          <Card size="small" style={{ marginBottom: 16, background: '#fafafa' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text strong><UserOutlined /> Client Information</Text>
              <Space>
                <Text type="secondary" style={{ fontSize: 12 }}>New client?</Text>
                <Switch
                  checked={isNewClient}
                  onChange={(checked) => {
                    setIsNewClient(checked);
                    if (checked) form.setFieldValue('customer_id', undefined);
                    else {
                      form.setFieldValue('customer_name', undefined);
                      form.setFieldValue('customer_email', undefined);
                      form.setFieldValue('customer_phone', undefined);
                    }
                  }}
                  size="small"
                />
              </Space>
            </div>

            {!isNewClient ? (
              <Form.Item label="Select Client" name="customer_id" rules={[{ required: true, message: 'Select a client' }]}>
                <Select
                  placeholder="Search by company name or email..."
                  showSearch
                  optionFilterProp="children"
                  filterOption={(input, option) =>
                    (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
                  }
                  allowClear
                >
                  {customers.map(c => (
                    <Option key={c.customer_id} value={c.customer_id}>
                      {c.company_name}{c.contact_person ? ` — ${c.contact_person}` : ''}{c.email ? ` (${c.email})` : ''}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            ) : (
              <>
                <Form.Item label="Client Name" name="customer_name" rules={[{ required: true, message: 'Enter client name' }]}>
                  <Input placeholder="Company or contact name" />
                </Form.Item>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item label="Email" name="customer_email" rules={[{ required: true, type: 'email', message: 'Valid email required' }]}>
                      <Input prefix={<MailOutlined />} placeholder="client@company.co.za" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="Phone" name="customer_phone">
                      <Input prefix={<PhoneOutlined />} placeholder="+27..." />
                    </Form.Item>
                  </Col>
                </Row>
              </>
            )}
          </Card>

          {/* Ticket Details */}
          <Form.Item label="Subject" name="subject" rules={[{ required: true, message: 'Enter a subject' }]}>
            <Input placeholder="Brief description of the issue" maxLength={200} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="Category" name="category" rules={[{ required: true }]}>
                <Select placeholder="Select">
                  <Option value="technical">Technical Issue</Option>
                  <Option value="billing">Billing</Option>
                  <Option value="feature_request">Feature Request</Option>
                  <Option value="access">Access / Permissions</Option>
                  <Option value="data">Data Issue</Option>
                  <Option value="general">General Query</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Priority" name="priority" initialValue="medium" rules={[{ required: true }]}>
                <Select>
                  <Option value="low">Low</Option>
                  <Option value="medium">Medium</Option>
                  <Option value="high">High</Option>
                  <Option value="critical">Critical</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Assign To" name="assigned_to">
                <Select placeholder="Select staff member" allowClear showSearch optionFilterProp="children">
                  {staffUsers.map(u => (
                    <Option key={u.id} value={u.id}>
                      {u.first_name} {u.last_name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Description" name="description" rules={[{ required: true, message: 'Describe the issue' }]}>
            <TextArea rows={4} placeholder="Describe the issue in detail. Include steps to reproduce if applicable." maxLength={5000} showCount />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── View Ticket Modal ───────────────────────────── */}
      <Modal
        title={
          selectedTicket ? (
            <Space>
              <span>{selectedTicket.ticket_number || `#${selectedTicket.id?.slice(0, 8)}`}</span>
              <Tag color={statusConfig[selectedTicket.status]?.color}>{statusConfig[selectedTicket.status]?.label}</Tag>
              <Tag color={priorityConfig[selectedTicket.priority]?.color}>{priorityConfig[selectedTicket.priority]?.label}</Tag>
            </Space>
          ) : 'Ticket'
        }
        open={viewModalVisible}
        onCancel={() => { setViewModalVisible(false); setSelectedTicket(null); setReplies([]); replyForm.resetFields(); }}
        footer={null}
        width={750}
      >
        {selectedTicket && (
          <div>
            {/* Client Info Card */}
            {(selectedTicket.customer_name || selectedTicket.customer_email) && (
              <Card size="small" style={{ marginBottom: 16, background: '#fff7ed', border: '1px solid #fed7aa' }}>
                <Descriptions size="small" column={3}>
                  <Descriptions.Item label={<><UserOutlined /> Client</>}>
                    <Text strong>{selectedTicket.customer_name || '—'}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label={<><MailOutlined /> Email</>}>
                    {selectedTicket.customer_email ? (
                      <a href={`mailto:${selectedTicket.customer_email}`}>{selectedTicket.customer_email}</a>
                    ) : '—'}
                  </Descriptions.Item>
                  <Descriptions.Item label={<><PhoneOutlined /> Phone</>}>
                    {selectedTicket.customer_phone || '—'}
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            )}

            <h3 style={{ marginBottom: 8 }}>{selectedTicket.subject}</h3>
            <div style={{ color: '#666', fontSize: 12, marginBottom: 16 }}>
              Created by {selectedTicket.created_by_name || 'Unknown'} on {new Date(selectedTicket.created_at).toLocaleString('en-ZA')}
              {selectedTicket.assigned_to_name && <> · Assigned to <Text strong>{selectedTicket.assigned_to_name}</Text></>}
            </div>
            <Card size="small" style={{ marginBottom: 16, background: '#fafafa' }}>
              <p style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}>{selectedTicket.description}</p>
            </Card>

            {/* Status actions */}
            <Space style={{ marginBottom: 16 }}>
              {selectedTicket.status === 'open' && (
                <Button size="small" onClick={() => handleStatusChange(selectedTicket.id, 'in_progress')}>Mark In Progress</Button>
              )}
              {(selectedTicket.status === 'open' || selectedTicket.status === 'in_progress') && (
                <Button size="small" type="primary" onClick={() => handleStatusChange(selectedTicket.id, 'resolved')}>Mark Resolved</Button>
              )}
              {selectedTicket.status === 'resolved' && (
                <Button size="small" onClick={() => handleStatusChange(selectedTicket.id, 'closed')}>Close Ticket</Button>
              )}
              {selectedTicket.status === 'resolved' && (
                <Button size="small" danger onClick={() => handleStatusChange(selectedTicket.id, 'open')}>Reopen</Button>
              )}
            </Space>

            <Divider style={{ margin: '12px 0' }} />

            {/* Replies / Conversation */}
            <h4 style={{ marginBottom: 12 }}>Conversation</h4>
            {repliesLoading ? (
              <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>
            ) : replies.length === 0 ? (
              <Empty description="No replies yet" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ margin: '16px 0' }} />
            ) : (
              <div style={{ maxHeight: 300, overflowY: 'auto', marginBottom: 16 }}>
                {replies.map(reply => (
                  <div key={reply.id} style={{ marginBottom: 12, padding: 12, background: reply.is_staff ? '#f0f5ff' : '#fafafa', borderRadius: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Space>
                        <Avatar size="small" icon={<UserOutlined />} style={reply.is_staff ? { background: '#1890ff' } : {}} />
                        <span style={{ fontWeight: 500 }}>{reply.author_name}</span>
                        {reply.is_staff && <Tag color="blue" style={{ fontSize: 10 }}>Staff</Tag>}
                      </Space>
                      <span style={{ fontSize: 11, color: '#999' }}>{new Date(reply.created_at).toLocaleString('en-ZA')}</span>
                    </div>
                    <p style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>{reply.message}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Reply form */}
            {selectedTicket.status !== 'closed' && (
              <Form form={replyForm} onFinish={handleReply}>
                <Form.Item name="message" rules={[{ required: true, message: 'Type a reply' }]}>
                  <TextArea rows={3} placeholder="Type your reply... (client will be notified by email)" maxLength={5000} />
                </Form.Item>
                <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                  <Button type="primary" htmlType="submit" loading={submitting} icon={<SendOutlined />}>
                    Send Reply
                  </Button>
                </Form.Item>
              </Form>
            )}
          </div>
        )}
      </Modal>
    </HubLayout>
  );
};

export default SupportTicketsHub;
