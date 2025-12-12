/**
 * AdminHub - Unified Administration & Settings Hub
 * 
 * Features:
 * - Company Setup & Configuration
 * - User Management
 * - Billing & Subscription
 * - System Settings
 * - Design System / Theming
 * - Audit Logs
 * - Security Settings
 * - Integration Management
 */

import React, { useState } from 'react';
import {
  Card, Row, Col, Statistic, Progress, Table, Tag, Button, Space, Badge,
  Input, Select, DatePicker, Modal, Form, Typography, Avatar,
  Descriptions, Tooltip, Switch, Alert,
  List, Divider, Tabs, Upload, message, Checkbox, Empty, ColorPicker
} from 'antd';
import {
  HomeOutlined, TeamOutlined, CalendarOutlined, ClockCircleOutlined,
  CheckCircleOutlined, WarningOutlined,
  PlusOutlined, SearchOutlined, FilterOutlined, ExportOutlined,
  SettingOutlined, SyncOutlined, SendOutlined,
  UserOutlined, BellOutlined, FileTextOutlined, MailOutlined,
  SafetyCertificateOutlined, BankOutlined, RocketOutlined,
  LockOutlined, EyeOutlined, DownloadOutlined, UploadOutlined,
  EditOutlined, DeleteOutlined, KeyOutlined, GlobalOutlined,
  CreditCardOutlined, DollarOutlined, ApiOutlined, DatabaseOutlined,
  CloudOutlined, MobileOutlined, DesktopOutlined, ShopOutlined,
  BgColorsOutlined, FormatPainterOutlined, HistoryOutlined,
  SecurityScanOutlined, AuditOutlined, IdcardOutlined
} from '@ant-design/icons';
import HubLayout from '../../components/hub/HubLayout';
import HubHeader from '../../components/hub/HubHeader';
import StatusBanner from '../../components/hub/StatusBanner';
import HubTabs from '../../components/hub/HubTabs';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

// Interfaces
interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  status: 'active' | 'inactive' | 'pending';
  lastLogin?: string;
  mfaEnabled: boolean;
  createdAt: string;
}

interface AuditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  module: string;
  details: string;
  ipAddress: string;
  status: 'success' | 'failed' | 'warning';
}

interface Integration {
  id: string;
  name: string;
  type: string;
  status: 'connected' | 'disconnected' | 'error';
  lastSync?: string;
  description: string;
}

const AdminHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [form] = Form.useForm();

  // Sample data
  const [users] = useState<User[]>([
    { id: 'USR-001', name: 'John Smith', email: 'john.smith@company.co.za', role: 'Administrator', department: 'IT', status: 'active', lastLogin: '2025-12-11 14:30', mfaEnabled: true, createdAt: '2024-01-15' },
    { id: 'USR-002', name: 'Sarah Jones', email: 'sarah.jones@company.co.za', role: 'Finance Manager', department: 'Finance', status: 'active', lastLogin: '2025-12-11 13:45', mfaEnabled: true, createdAt: '2024-02-20' },
    { id: 'USR-003', name: 'Michael Brown', email: 'michael.brown@company.co.za', role: 'Sales Rep', department: 'Sales', status: 'active', lastLogin: '2025-12-11 10:15', mfaEnabled: false, createdAt: '2024-03-10' },
    { id: 'USR-004', name: 'Linda Nkosi', email: 'linda.nkosi@company.co.za', role: 'HR Manager', department: 'HR', status: 'active', lastLogin: '2025-12-10 16:30', mfaEnabled: true, createdAt: '2024-04-05' },
    { id: 'USR-005', name: 'David Chen', email: 'david.chen@company.co.za', role: 'Accountant', department: 'Finance', status: 'inactive', lastLogin: '2025-11-28 09:00', mfaEnabled: false, createdAt: '2024-05-15' },
    { id: 'USR-006', name: 'New Employee', email: 'new.employee@company.co.za', role: 'Intern', department: 'Operations', status: 'pending', mfaEnabled: false, createdAt: '2025-12-10' }
  ]);

  const [auditLogs] = useState<AuditLogEntry[]>([
    { id: 'LOG-001', timestamp: '2025-12-11 14:32:15', user: 'john.smith@company.co.za', action: 'User Login', module: 'Authentication', details: 'Successful login from Chrome browser', ipAddress: '192.168.1.100', status: 'success' },
    { id: 'LOG-002', timestamp: '2025-12-11 14:28:44', user: 'sarah.jones@company.co.za', action: 'Invoice Created', module: 'Sales', details: 'Created invoice INV-2025-1234 for R 25,000', ipAddress: '192.168.1.101', status: 'success' },
    { id: 'LOG-003', timestamp: '2025-12-11 14:15:22', user: 'admin@company.co.za', action: 'User Permission Changed', module: 'Administration', details: 'Updated role for user michael.brown', ipAddress: '192.168.1.1', status: 'success' },
    { id: 'LOG-004', timestamp: '2025-12-11 13:55:08', user: 'unknown', action: 'Failed Login Attempt', module: 'Authentication', details: '3 failed attempts for admin@company.co.za', ipAddress: '41.185.22.101', status: 'failed' },
    { id: 'LOG-005', timestamp: '2025-12-11 13:45:33', user: 'sarah.jones@company.co.za', action: 'Report Generated', module: 'Reports', details: 'Generated Financial Statement Q4 2025', ipAddress: '192.168.1.101', status: 'success' },
    { id: 'LOG-006', timestamp: '2025-12-11 12:30:15', user: 'system', action: 'Backup Complete', module: 'System', details: 'Daily backup completed successfully', ipAddress: 'localhost', status: 'success' },
    { id: 'LOG-007', timestamp: '2025-12-11 11:22:44', user: 'john.smith@company.co.za', action: 'Settings Updated', module: 'Administration', details: 'Updated company email settings', ipAddress: '192.168.1.100', status: 'success' }
  ]);

  const [integrations] = useState<Integration[]>([
    { id: 'INT-001', name: 'SARS eFiling', type: 'Tax', status: 'connected', lastSync: '2025-12-11 06:00', description: 'Direct submission to SARS' },
    { id: 'INT-002', name: 'Nedbank Banking', type: 'Banking', status: 'connected', lastSync: '2025-12-11 08:30', description: 'Bank feeds and payments' },
    { id: 'INT-003', name: 'Sage Payroll', type: 'Payroll', status: 'connected', lastSync: '2025-12-10 18:00', description: 'Payroll data sync' },
    { id: 'INT-004', name: 'Microsoft 365', type: 'Productivity', status: 'connected', lastSync: '2025-12-11 14:00', description: 'Email and calendar sync' },
    { id: 'INT-005', name: 'Shopify', type: 'E-commerce', status: 'disconnected', description: 'Online store integration' },
    { id: 'INT-006', name: 'SMS Gateway', type: 'Communication', status: 'error', lastSync: '2025-12-09 10:00', description: 'Bulk SMS notifications' }
  ]);

  // Calculations
  const activeUsers = users.filter(u => u.status === 'active').length;
  const mfaEnabledUsers = users.filter(u => u.mfaEnabled).length;
  const connectedIntegrations = integrations.filter(i => i.status === 'connected').length;

  // Overview Tab
  const renderOverview = () => (
    <div style={{ padding: '24px' }}>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={6}>
          <Card>
            <Statistic 
              title="Total Users" 
              value={users.length}
              prefix={<TeamOutlined />} 
            />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card>
            <Statistic 
              title="Active Users" 
              value={activeUsers}
              valueStyle={{ color: '#52c41a' }}
              prefix={<UserOutlined />} 
            />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card>
            <Statistic 
              title="MFA Enabled" 
              value={mfaEnabledUsers}
              suffix={`/ ${users.length}`}
              prefix={<LockOutlined />} 
            />
            <Progress percent={Math.round((mfaEnabledUsers / users.length) * 100)} size="small" />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card>
            <Statistic 
              title="Active Integrations" 
              value={connectedIntegrations}
              suffix={`/ ${integrations.length}`}
              prefix={<ApiOutlined />} 
            />
          </Card>
        </Col>
      </Row>

      {/* Quick Actions */}
      <Card title={<><RocketOutlined /> Quick Actions</>} style={{ marginTop: 16 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Card size="small" hoverable onClick={() => setUserModalVisible(true)}>
              <Space>
                <Avatar style={{ background: '#1890ff' }} icon={<UserOutlined />} />
                <div>
                  <Text strong>Add User</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>Create new user account</Text>
                </div>
              </Space>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" hoverable>
              <Space>
                <Avatar style={{ background: '#52c41a' }} icon={<DownloadOutlined />} />
                <div>
                  <Text strong>Export Data</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>Download system backup</Text>
                </div>
              </Space>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" hoverable>
              <Space>
                <Avatar style={{ background: '#722ed1' }} icon={<SecurityScanOutlined />} />
                <div>
                  <Text strong>Security Scan</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>Run security audit</Text>
                </div>
              </Space>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" hoverable>
              <Space>
                <Avatar style={{ background: '#fa8c16' }} icon={<ApiOutlined />} />
                <div>
                  <Text strong>API Keys</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>Manage API access</Text>
                </div>
              </Space>
            </Card>
          </Col>
        </Row>
      </Card>

      {/* System Health */}
      <Card title={<><DesktopOutlined /> System Health</>} style={{ marginTop: 16 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Card size="small">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Badge status="success" text="Database" />
                <Text type="secondary">PostgreSQL - Healthy</Text>
                <Progress percent={45} size="small" status="active" />
              </Space>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Badge status="success" text="API Server" />
                <Text type="secondary">Response: 42ms</Text>
                <Progress percent={100} size="small" status="success" />
              </Space>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Badge status="success" text="Storage" />
                <Text type="secondary">120 GB / 500 GB</Text>
                <Progress percent={24} size="small" />
              </Space>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Badge status="processing" text="Last Backup" />
                <Text type="secondary">2025-12-11 06:00</Text>
                <Progress percent={100} size="small" status="success" />
              </Space>
            </Card>
          </Col>
        </Row>
      </Card>
    </div>
  );

  // Company Setup Tab
  const renderCompanySetup = () => (
    <div style={{ padding: '24px' }}>
      <Card title={<><ShopOutlined /> Company Information</>}>
        <Form layout="vertical">
          <Row gutter={24}>
            <Col span={12}>
              <Form.Item label="Company Name">
                <Input defaultValue="WorldClass ERP (Pty) Ltd" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Trading As">
                <Input defaultValue="WorldClass ERP" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={24}>
            <Col span={12}>
              <Form.Item label="Registration Number (CIPC)">
                <Input defaultValue="2020/123456/07" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="VAT Number">
                <Input defaultValue="4123456789" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={24}>
            <Col span={12}>
              <Form.Item label="Tax Number">
                <Input defaultValue="9123456789" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="B-BBEE Level">
                <Select defaultValue="3">
                  <Option value="1">Level 1</Option>
                  <Option value="2">Level 2</Option>
                  <Option value="3">Level 3</Option>
                  <Option value="4">Level 4</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Divider />
          <Title level={5}>Contact Details</Title>
          <Row gutter={24}>
            <Col span={12}>
              <Form.Item label="Physical Address">
                <TextArea rows={3} defaultValue="123 Main Street\nSandton\nJohannesburg\n2196" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Postal Address">
                <TextArea rows={3} defaultValue="PO Box 12345\nSandton\n2146" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={24}>
            <Col span={8}>
              <Form.Item label="Phone">
                <Input defaultValue="+27 11 123 4567" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Email">
                <Input defaultValue="info@worldclass-erp.co.za" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Website">
                <Input defaultValue="www.worldclass-erp.co.za" />
              </Form.Item>
            </Col>
          </Row>
          <Divider />
          <Form.Item label="Company Logo">
            <Upload listType="picture-card">
              <div>
                <UploadOutlined />
                <div style={{ marginTop: 8 }}>Upload</div>
              </div>
            </Upload>
          </Form.Item>
          <Button type="primary">Save Changes</Button>
        </Form>
      </Card>
    </div>
  );

  // User Management Tab
  const renderUserManagement = () => (
    <div style={{ padding: '24px' }}>
      <Card
        title={<><TeamOutlined /> User Management</>}
        extra={
          <Space>
            <Input.Search placeholder="Search users..." style={{ width: 250 }} />
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setUserModalVisible(true)}>
              Add User
            </Button>
          </Space>
        }
      >
        <Table
          dataSource={users}
          rowKey="id"
          columns={[
            {
              title: 'User',
              key: 'user',
              render: (_, record) => (
                <Space>
                  <Avatar style={{ background: record.status === 'active' ? '#1890ff' : '#999' }}>
                    {record.name.split(' ').map(n => n[0]).join('')}
                  </Avatar>
                  <div>
                    <Text strong>{record.name}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>{record.email}</Text>
                  </div>
                </Space>
              )
            },
            {
              title: 'Role',
              dataIndex: 'role',
              key: 'role',
              render: (role: string) => <Tag color="blue">{role}</Tag>
            },
            {
              title: 'Department',
              dataIndex: 'department',
              key: 'department'
            },
            {
              title: 'Status',
              dataIndex: 'status',
              key: 'status',
              render: (status: string) => (
                <Badge status={status === 'active' ? 'success' : status === 'pending' ? 'processing' : 'default'} text={status} />
              )
            },
            {
              title: 'MFA',
              dataIndex: 'mfaEnabled',
              key: 'mfa',
              render: (enabled: boolean) => (
                enabled ? <Tag color="green"><LockOutlined /> Enabled</Tag> : <Tag>Disabled</Tag>
              )
            },
            {
              title: 'Last Login',
              dataIndex: 'lastLogin',
              key: 'lastLogin',
              render: (login?: string) => login || '-'
            },
            {
              title: 'Actions',
              key: 'actions',
              render: () => (
                <Space>
                  <Button size="small" icon={<EditOutlined />} />
                  <Button size="small" icon={<KeyOutlined />} />
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Space>
              )
            }
          ]}
        />
      </Card>
    </div>
  );

  // Billing Tab
  const renderBilling = () => (
    <div style={{ padding: '24px' }}>
      <Card style={{ marginBottom: 16, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', border: 'none' }}>
        <Row align="middle" gutter={24}>
          <Col span={16}>
            <Title level={3} style={{ color: '#fff', margin: 0 }}>Enterprise Plan</Title>
            <Paragraph style={{ color: 'rgba(255,255,255,0.9)', marginBottom: 0 }}>
              Unlimited users • All modules • Priority support • Custom integrations
            </Paragraph>
          </Col>
          <Col span={8} style={{ textAlign: 'right' }}>
            <Title level={2} style={{ color: '#fff', margin: 0 }}>R 4,999</Title>
            <Text style={{ color: 'rgba(255,255,255,0.7)' }}>per month</Text>
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card>
            <Statistic title="Current Period" value="Dec 1 - Dec 31, 2025" prefix={<CalendarOutlined />} />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Statistic title="Next Payment" value="R 4,999" prefix={<DollarOutlined />} />
            <Text type="secondary">Due: Jan 1, 2026</Text>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Statistic title="Payment Method" value="•••• 4242" prefix={<CreditCardOutlined />} />
            <Text type="secondary">Visa</Text>
          </Card>
        </Col>
      </Row>

      <Card title={<><HistoryOutlined /> Billing History</>} style={{ marginTop: 16 }}>
        <Table
          dataSource={[
            { id: 'INV-001', date: '2025-12-01', amount: 4999, status: 'paid' },
            { id: 'INV-002', date: '2025-11-01', amount: 4999, status: 'paid' },
            { id: 'INV-003', date: '2025-10-01', amount: 4999, status: 'paid' }
          ]}
          rowKey="id"
          columns={[
            { title: 'Invoice', dataIndex: 'id', key: 'id' },
            { title: 'Date', dataIndex: 'date', key: 'date' },
            { title: 'Amount', dataIndex: 'amount', key: 'amount', render: (amt: number) => `R ${amt.toLocaleString()}` },
            { title: 'Status', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color="green">{s}</Tag> },
            { title: 'Actions', key: 'actions', render: () => <Button size="small" icon={<DownloadOutlined />}>Download</Button> }
          ]}
        />
      </Card>
    </div>
  );

  // Design System Tab
  const renderDesignSystem = () => (
    <div style={{ padding: '24px' }}>
      <Alert
        message="Design System"
        description="Customize the look and feel of your ERP system. Changes apply to all users in your organization."
        type="info"
        showIcon
        icon={<BgColorsOutlined />}
        style={{ marginBottom: 16 }}
      />

      <Card title={<><FormatPainterOutlined /> Theme Settings</>}>
        <Form layout="vertical">
          <Row gutter={24}>
            <Col span={12}>
              <Form.Item label="Primary Color">
                <ColorPicker defaultValue="#1890ff" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Accent Color">
                <ColorPicker defaultValue="#52c41a" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={24}>
            <Col span={12}>
              <Form.Item label="Theme Mode">
                <Select defaultValue="light">
                  <Option value="light">Light Mode</Option>
                  <Option value="dark">Dark Mode</Option>
                  <Option value="auto">System Default</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Sidebar Style">
                <Select defaultValue="default">
                  <Option value="default">Default</Option>
                  <Option value="compact">Compact</Option>
                  <Option value="collapsed">Collapsed by Default</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Font Size">
            <Select defaultValue="medium">
              <Option value="small">Small</Option>
              <Option value="medium">Medium</Option>
              <Option value="large">Large</Option>
            </Select>
          </Form.Item>
          <Divider />
          <Button type="primary">Apply Theme</Button>
        </Form>
      </Card>
    </div>
  );

  // Integrations Tab
  const renderIntegrations = () => (
    <div style={{ padding: '24px' }}>
      <Card
        title={<><ApiOutlined /> Integrations</>}
        extra={<Button type="primary" icon={<PlusOutlined />}>Add Integration</Button>}
      >
        <List
          dataSource={integrations}
          renderItem={integration => (
            <List.Item
              actions={[
                integration.status === 'connected' ? (
                  <Button size="small" icon={<SyncOutlined />}>Sync Now</Button>
                ) : (
                  <Button size="small" type="primary">Connect</Button>
                ),
                <Button size="small" icon={<SettingOutlined />}>Configure</Button>
              ]}
            >
              <List.Item.Meta
                avatar={
                  <Avatar style={{ 
                    background: integration.status === 'connected' ? '#52c41a' : 
                      integration.status === 'error' ? '#ff4d4f' : '#999' 
                  }} icon={<ApiOutlined />} />
                }
                title={
                  <Space>
                    <Text strong>{integration.name}</Text>
                    <Tag>{integration.type}</Tag>
                    <Badge 
                      status={integration.status === 'connected' ? 'success' : integration.status === 'error' ? 'error' : 'default'} 
                      text={integration.status} 
                    />
                  </Space>
                }
                description={
                  <div>
                    <Text type="secondary">{integration.description}</Text>
                    {integration.lastSync && <><br /><Text type="secondary" style={{ fontSize: 12 }}>Last sync: {integration.lastSync}</Text></>}
                  </div>
                }
              />
            </List.Item>
          )}
        />
      </Card>
    </div>
  );

  // Audit Logs Tab
  const renderAuditLogs = () => (
    <div style={{ padding: '24px' }}>
      <Card
        title={<><AuditOutlined /> Audit Logs</>}
        extra={
          <Space>
            <DatePicker.RangePicker />
            <Select defaultValue="all" style={{ width: 150 }}>
              <Option value="all">All Actions</Option>
              <Option value="auth">Authentication</Option>
              <Option value="data">Data Changes</Option>
              <Option value="admin">Administration</Option>
            </Select>
            <Button icon={<ExportOutlined />}>Export</Button>
          </Space>
        }
      >
        <Table
          dataSource={auditLogs}
          rowKey="id"
          columns={[
            {
              title: 'Timestamp',
              dataIndex: 'timestamp',
              key: 'timestamp',
              render: (ts: string) => <Text code>{ts}</Text>
            },
            {
              title: 'User',
              dataIndex: 'user',
              key: 'user',
              render: (user: string) => (
                <Space>
                  <Avatar size="small" icon={<UserOutlined />} />
                  {user}
                </Space>
              )
            },
            {
              title: 'Action',
              dataIndex: 'action',
              key: 'action'
            },
            {
              title: 'Module',
              dataIndex: 'module',
              key: 'module',
              render: (module: string) => <Tag>{module}</Tag>
            },
            {
              title: 'Details',
              dataIndex: 'details',
              key: 'details'
            },
            {
              title: 'IP Address',
              dataIndex: 'ipAddress',
              key: 'ipAddress',
              render: (ip: string) => <Text code>{ip}</Text>
            },
            {
              title: 'Status',
              dataIndex: 'status',
              key: 'status',
              render: (status: string) => (
                <Tag color={status === 'success' ? 'green' : status === 'failed' ? 'red' : 'orange'}>
                  {status}
                </Tag>
              )
            }
          ]}
        />
      </Card>
    </div>
  );

  // System Settings Tab
  const renderSystemSettings = () => (
    <div style={{ padding: '24px' }}>
      <Card title={<><SettingOutlined /> System Settings</>}>
        <Form layout="vertical">
          <Title level={5}>General</Title>
          <Row gutter={24}>
            <Col span={12}>
              <Form.Item label="Time Zone">
                <Select defaultValue="africa/johannesburg">
                  <Option value="africa/johannesburg">Africa/Johannesburg (SAST)</Option>
                  <Option value="utc">UTC</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Date Format">
                <Select defaultValue="dd/mm/yyyy">
                  <Option value="dd/mm/yyyy">DD/MM/YYYY</Option>
                  <Option value="mm/dd/yyyy">MM/DD/YYYY</Option>
                  <Option value="yyyy-mm-dd">YYYY-MM-DD</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={24}>
            <Col span={12}>
              <Form.Item label="Currency">
                <Select defaultValue="zar">
                  <Option value="zar">ZAR - South African Rand</Option>
                  <Option value="usd">USD - US Dollar</Option>
                  <Option value="eur">EUR - Euro</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Language">
                <Select defaultValue="en">
                  <Option value="en">English</Option>
                  <Option value="af">Afrikaans</Option>
                  <Option value="zu">isiZulu</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Divider />
          <Title level={5}>Security</Title>
          <Form.Item label="Require MFA for all users">
            <Switch /> <Text type="secondary">Enforce multi-factor authentication</Text>
          </Form.Item>
          <Form.Item label="Session Timeout">
            <Select defaultValue="30" style={{ width: 200 }}>
              <Option value="15">15 minutes</Option>
              <Option value="30">30 minutes</Option>
              <Option value="60">1 hour</Option>
              <Option value="120">2 hours</Option>
            </Select>
          </Form.Item>
          <Form.Item label="Password Policy">
            <Checkbox defaultChecked>Minimum 8 characters</Checkbox>
            <br />
            <Checkbox defaultChecked>Require uppercase letter</Checkbox>
            <br />
            <Checkbox defaultChecked>Require number</Checkbox>
            <br />
            <Checkbox>Require special character</Checkbox>
          </Form.Item>

          <Divider />
          <Title level={5}>Email Settings</Title>
          <Row gutter={24}>
            <Col span={12}>
              <Form.Item label="SMTP Server">
                <Input defaultValue="smtp.company.co.za" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="SMTP Port">
                <Input defaultValue="587" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="From Email">
            <Input defaultValue="noreply@worldclass-erp.co.za" />
          </Form.Item>

          <Divider />
          <Button type="primary">Save Settings</Button>
        </Form>
      </Card>
    </div>
  );

  return (
    <HubLayout>
      <HubHeader
        title="Administration"
        subtitle="System configuration, user management, and settings"
        icon={<SettingOutlined />}
        gradient="purple"
        actions={
          <Space>
            <Button icon={<SyncOutlined />}>Refresh</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setUserModalVisible(true)}>
              Add User
            </Button>
          </Space>
        }
      />

      <StatusBanner
        gradient="purple"
        icon={<SettingOutlined />}
        title="Administration Overview"
        subtitle="Users, billing, security"
        stats={[
          { title: 'Total Users', value: users.length },
          { title: 'Active Users', value: activeUsers },
          { title: 'MFA Enabled', value: `${Math.round((mfaEnabledUsers / users.length) * 100)}%` },
          { title: 'Integrations', value: `${connectedIntegrations}/${integrations.length}` },
          { title: 'System Status', value: 'Healthy' }
        ]}
      />

      <HubTabs
        theme="purple"
        activeKey={activeTab}
        tabs={[
          { key: 'overview', label: 'Overview', icon: <HomeOutlined />, children: renderOverview() },
          { key: 'company', label: 'Company Setup', icon: <ShopOutlined />, children: renderCompanySetup() },
          { key: 'users', label: 'User Management', icon: <TeamOutlined />, children: renderUserManagement() },
          { key: 'billing', label: 'Billing', icon: <CreditCardOutlined />, children: renderBilling() },
          { key: 'design', label: 'Design System', icon: <BgColorsOutlined />, children: renderDesignSystem() },
          { key: 'integrations', label: 'Integrations', icon: <ApiOutlined />, children: renderIntegrations() },
          { key: 'audit', label: 'Audit Logs', icon: <AuditOutlined />, children: renderAuditLogs() },
          { key: 'settings', label: 'System Settings', icon: <SettingOutlined />, children: renderSystemSettings() }
        ]}
        onChange={setActiveTab}
      />

      {/* Add User Modal */}
      <Modal
        title={<><UserOutlined /> Add New User</>}
        open={userModalVisible}
        onCancel={() => setUserModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setUserModalVisible(false)}>Cancel</Button>,
          <Button key="invite" type="primary" icon={<SendOutlined />} onClick={() => { message.success('Invitation sent!'); setUserModalVisible(false); }}>
            Send Invitation
          </Button>
        ]}
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="First Name" name="firstName" rules={[{ required: true }]}>
                <Input placeholder="John" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Last Name" name="lastName" rules={[{ required: true }]}>
                <Input placeholder="Smith" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Email Address" name="email" rules={[{ required: true, type: 'email' }]}>
            <Input placeholder="john.smith@company.co.za" />
          </Form.Item>
          <Form.Item label="Role" name="role" rules={[{ required: true }]}>
            <Select placeholder="Select role">
              <Option value="admin">Administrator</Option>
              <Option value="manager">Manager</Option>
              <Option value="user">Standard User</Option>
              <Option value="readonly">Read Only</Option>
            </Select>
          </Form.Item>
          <Form.Item label="Department" name="department">
            <Select placeholder="Select department">
              <Option value="finance">Finance</Option>
              <Option value="sales">Sales</Option>
              <Option value="hr">Human Resources</Option>
              <Option value="operations">Operations</Option>
              <Option value="it">IT</Option>
            </Select>
          </Form.Item>
          <Form.Item name="requireMfa" valuePropName="checked">
            <Checkbox>Require MFA setup on first login</Checkbox>
          </Form.Item>
        </Form>
      </Modal>
    </HubLayout>
  );
};

export default AdminHub;
