import React, { useState } from 'react';
import { 
  Card, List, Button, Space, Input, Avatar, Tag, Typography, 
  Modal, Form, Select, message, Row, Col, Badge
} from 'antd';
import { 
  PlusOutlined, BellOutlined, PushpinOutlined, CalendarOutlined,
  TeamOutlined, NotificationOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

interface Announcement {
  id: string;
  title: string;
  content: string;
  author: { name: string; avatar?: string };
  date: string;
  priority: 'normal' | 'important' | 'urgent';
  pinned: boolean;
  audience: string;
  readBy: number;
  totalAudience: number;
}

const sampleAnnouncements: Announcement[] = [
  {
    id: '1',
    title: 'Company All-Hands Meeting Next Friday',
    content: 'Please join us for our quarterly all-hands meeting on Friday, March 1st at 2:00 PM. We will be discussing Q1 results, upcoming initiatives, and recognizing outstanding team members.',
    author: { name: 'CEO Office' },
    date: '2024-02-20',
    priority: 'important',
    pinned: true,
    audience: 'All Employees',
    readBy: 38,
    totalAudience: 45
  },
  {
    id: '2',
    title: 'New Project Management Tool Rollout',
    content: 'We are excited to announce the rollout of our new project management tool starting next week. Training sessions will be held throughout the week. Please check your calendar for your assigned session.',
    author: { name: 'IT Department' },
    date: '2024-02-19',
    priority: 'normal',
    pinned: true,
    audience: 'All Employees',
    readBy: 42,
    totalAudience: 45
  },
  {
    id: '3',
    title: 'Urgent: System Maintenance Tonight',
    content: 'Our systems will undergo scheduled maintenance tonight from 11 PM to 3 AM. Please save all work and log out before 11 PM. We apologize for any inconvenience.',
    author: { name: 'IT Department' },
    date: '2024-02-18',
    priority: 'urgent',
    pinned: false,
    audience: 'All Employees',
    readBy: 45,
    totalAudience: 45
  },
  {
    id: '4',
    title: 'Q1 Sales Targets Achieved! 🎉',
    content: 'Congratulations to the entire sales team for exceeding our Q1 targets by 15%! This is a tremendous achievement and reflects the hard work and dedication of everyone involved.',
    author: { name: 'Sales Leadership' },
    date: '2024-02-15',
    priority: 'normal',
    pinned: false,
    audience: 'Sales Team',
    readBy: 12,
    totalAudience: 12
  },
  {
    id: '5',
    title: 'Updated Travel & Expense Policy',
    content: 'Please review the updated travel and expense policy effective March 1st. Key changes include updated per diem rates and new approval workflows for international travel.',
    author: { name: 'HR Department' },
    date: '2024-02-14',
    priority: 'normal',
    pinned: false,
    audience: 'All Employees',
    readBy: 30,
    totalAudience: 45
  }
];

const priorityConfig = {
  normal: { color: 'default', label: 'Normal' },
  important: { color: 'blue', label: 'Important' },
  urgent: { color: 'red', label: 'Urgent' }
};

const Announcements: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>(sampleAnnouncements);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [form] = Form.useForm();

  const pinnedAnnouncements = announcements.filter(a => a.pinned);
  const recentAnnouncements = announcements.filter(a => !a.pinned);

  const handleCreate = (values: any) => {
    const newAnnouncement: Announcement = {
      id: String(Date.now()),
      title: values.title,
      content: values.content,
      author: { name: 'You' },
      date: new Date().toISOString().split('T')[0],
      priority: values.priority,
      pinned: false,
      audience: values.audience,
      readBy: 0,
      totalAudience: 45
    };
    setAnnouncements([newAnnouncement, ...announcements]);
    setCreateModalVisible(false);
    form.resetFields();
    message.success('Announcement published');
  };

  const renderAnnouncement = (announcement: Announcement) => (
    <Card 
      key={announcement.id}
      className="announcement-card"
      style={{ marginBottom: 16 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <Space>
          {announcement.pinned && <PushpinOutlined style={{ color: '#1890ff' }} />}
          <Tag color={priorityConfig[announcement.priority].color}>
            {priorityConfig[announcement.priority].label}
          </Tag>
        </Space>
        <Text type="secondary"><CalendarOutlined /> {announcement.date}</Text>
      </div>
      
      <Title level={5} style={{ margin: '8px 0' }}>{announcement.title}</Title>
      <Paragraph style={{ marginBottom: 16 }}>{announcement.content}</Paragraph>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <Avatar size="small">{announcement.author.name[0]}</Avatar>
          <Text type="secondary">{announcement.author.name}</Text>
        </Space>
        <Space>
          <Tag><TeamOutlined /> {announcement.audience}</Tag>
          <Text type="secondary">
            <BellOutlined /> {announcement.readBy}/{announcement.totalAudience} read
          </Text>
        </Space>
      </div>
    </Card>
  );

  return (
    <div style={{ padding: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>Announcements</Title>
          <Text type="secondary">Company-wide and team announcements</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalVisible(true)}>
          New Announcement
        </Button>
      </div>

      {/* Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={8}>
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Avatar style={{ background: '#1890ff' }}><NotificationOutlined /></Avatar>
              <div>
                <Text type="secondary">Total</Text>
                <div style={{ fontSize: 20, fontWeight: 600 }}>{announcements.length}</div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={8}>
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Avatar style={{ background: '#52c41a' }}><PushpinOutlined /></Avatar>
              <div>
                <Text type="secondary">Pinned</Text>
                <div style={{ fontSize: 20, fontWeight: 600 }}>{pinnedAnnouncements.length}</div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={8}>
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Avatar style={{ background: '#ff4d4f' }}><BellOutlined /></Avatar>
              <div>
                <Text type="secondary">Urgent</Text>
                <div style={{ fontSize: 20, fontWeight: 600 }}>
                  {announcements.filter(a => a.priority === 'urgent').length}
                </div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Pinned */}
      {pinnedAnnouncements.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <Title level={5}><PushpinOutlined /> Pinned Announcements</Title>
          {pinnedAnnouncements.map(renderAnnouncement)}
        </div>
      )}

      {/* Recent */}
      <div>
        <Title level={5}>Recent Announcements</Title>
        {recentAnnouncements.map(renderAnnouncement)}
      </div>

      {/* Create Modal */}
      <Modal
        title="Create Announcement"
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="title" label="Title" rules={[{ required: true }]}>
            <Input placeholder="Announcement title" />
          </Form.Item>
          <Form.Item name="content" label="Content" rules={[{ required: true }]}>
            <Input.TextArea rows={5} placeholder="Write your announcement..." />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="priority" label="Priority" rules={[{ required: true }]}>
                <Select placeholder="Select priority">
                  <Select.Option value="normal">Normal</Select.Option>
                  <Select.Option value="important">Important</Select.Option>
                  <Select.Option value="urgent">Urgent</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="audience" label="Audience" rules={[{ required: true }]}>
                <Select placeholder="Select audience">
                  <Select.Option value="All Employees">All Employees</Select.Option>
                  <Select.Option value="Engineering">Engineering</Select.Option>
                  <Select.Option value="Sales Team">Sales Team</Select.Option>
                  <Select.Option value="HR">HR</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setCreateModalVisible(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit">Publish</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Announcements;
