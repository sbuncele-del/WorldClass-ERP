/**
 * SupportTicketsHub — Internal support ticket system
 * Users can create, view, and manage support tickets
 */
import React, { useState, useEffect } from 'react';
import {
  Card, Row, Col, Table, Button, Tag, Space, Modal, Form, Input,
  Select, Badge, Statistic, Empty, message, Tooltip, Avatar, Timeline, Spin
} from 'antd';
import {
  PlusOutlined, SearchOutlined, FilterOutlined, MessageOutlined,
  CheckCircleOutlined, ClockCircleOutlined, ExclamationCircleOutlined,
  UserOutlined, PaperClipOutlined, SendOutlined, ReloadOutlined
} from '@ant-design/icons';
import HubLayout from '../../components/hub/HubLayout';
import apiClient from '../../services/api';

const { TextArea } = Input;
const { Option } = Select;

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
  assigned_to_name?: string;
  replies_count: number;
}

interface TicketReply {
  id: string;
  message: string;
  created_at: string;
  author_name: string;
  is_staff: boolean;
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
  const [form] = Form.useForm();
  const [replyForm] = Form.useForm();

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
      // If endpoint doesn't exist yet, show empty state
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleCreateTicket = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      await apiClient.post('/api/v2/support-tickets', values);
      message.success('Ticket created successfully');
      setCreateModalVisible(false);
      form.resetFields();
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
      message.success('Reply sent');
      replyForm.resetFields();
      // Refresh replies
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

  const filteredTickets = tickets.filter(t => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (searchText && !t.subject.toLowerCase().includes(searchText.toLowerCase()) &&
        !t.ticket_number?.toLowerCase().includes(searchText.toLowerCase())) return false;
    return true;
  });

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
      width: 130,
      render: (cat: string) => <Tag>{cat || 'General'}</Tag>,
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 140,
      render: (date: string) => date ? new Date(date).toLocaleDateString('en-ZA') : '-',
    },
    {
      title: 'Replies',
      dataIndex: 'replies_count',
      key: 'replies',
      width: 80,
      align: 'center' as const,
      render: (count: number) => <Badge count={count || 0} showZero style={{ backgroundColor: count ? '#1890ff' : '#d9d9d9' }} />,
    },
    {
      title: '',
      key: 'actions',
      width: 100,
      render: (_: any, record: Ticket) => (
        <Button type="link" onClick={() => handleViewTicket(record)}>View</Button>
      ),
    },
  ];

  return (
    <HubLayout
      title="Support Tickets"
      subtitle="Create and track support requests"
      icon="🎫"
      tabs={[]}
      activeKey="tickets"
      onChange={() => {}}
    >
      {/* Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic title="Open" value={stats.open} prefix={<ExclamationCircleOutlined style={{ color: '#1890ff' }} />} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic title="In Progress" value={stats.in_progress} prefix={<ClockCircleOutlined style={{ color: '#fa8c16' }} />} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic title="Resolved" value={stats.resolved} prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic title="Total" value={stats.total} prefix={<MessageOutlined />} />
          </Card>
        </Col>
      </Row>

      {/* Toolbar */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <Input
                placeholder="Search tickets..."
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                style={{ width: 250 }}
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
          <Col>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={fetchTickets}>Refresh</Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalVisible(true)}>
                New Ticket
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Tickets Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={filteredTickets}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 15, showSizeChanger: true }}
          locale={{ emptyText: <Empty description="No support tickets yet. Create one to get started." /> }}
        />
      </Card>

      {/* Create Ticket Modal */}
      <Modal
        title={<><PlusOutlined /> New Support Ticket</>}
        open={createModalVisible}
        onCancel={() => { setCreateModalVisible(false); form.resetFields(); }}
        footer={[
          <Button key="cancel" onClick={() => { setCreateModalVisible(false); form.resetFields(); }}>Cancel</Button>,
          <Button key="submit" type="primary" loading={submitting} onClick={handleCreateTicket} icon={<SendOutlined />}>
            Submit Ticket
          </Button>
        ]}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item label="Subject" name="subject" rules={[{ required: true, message: 'Please enter a subject' }]}>
            <Input placeholder="Brief description of the issue" maxLength={200} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Category" name="category" rules={[{ required: true }]}>
                <Select placeholder="Select category">
                  <Option value="technical">Technical Issue</Option>
                  <Option value="billing">Billing</Option>
                  <Option value="feature_request">Feature Request</Option>
                  <Option value="access">Access / Permissions</Option>
                  <Option value="data">Data Issue</Option>
                  <Option value="general">General Query</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Priority" name="priority" initialValue="medium" rules={[{ required: true }]}>
                <Select>
                  <Option value="low">Low</Option>
                  <Option value="medium">Medium</Option>
                  <Option value="high">High</Option>
                  <Option value="critical">Critical</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Description" name="description" rules={[{ required: true, message: 'Please describe the issue' }]}>
            <TextArea rows={5} placeholder="Describe the issue in detail. Include steps to reproduce if applicable." maxLength={5000} showCount />
          </Form.Item>
        </Form>
      </Modal>

      {/* View Ticket Modal */}
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
        width={700}
      >
        {selectedTicket && (
          <div>
            <h3 style={{ marginBottom: 8 }}>{selectedTicket.subject}</h3>
            <div style={{ color: '#666', fontSize: 12, marginBottom: 16 }}>
              Created by {selectedTicket.created_by_name || 'Unknown'} on {new Date(selectedTicket.created_at).toLocaleString('en-ZA')}
              {selectedTicket.assigned_to_name && <> • Assigned to {selectedTicket.assigned_to_name}</>}
            </div>
            <Card size="small" style={{ marginBottom: 16, background: '#fafafa' }}>
              <p style={{ whiteSpace: 'pre-wrap' }}>{selectedTicket.description}</p>
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

            {/* Replies */}
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
                  <TextArea rows={3} placeholder="Type your reply..." maxLength={5000} />
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
