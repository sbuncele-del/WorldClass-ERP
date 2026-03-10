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

import React, { useState, useEffect } from 'react';
import {
  Card, Row, Col, Statistic, Progress, Table, Tag, Button, Space, Badge,
  Input, Select, DatePicker, Modal, Form, Typography, Avatar,
  Descriptions, Tooltip, Switch, Alert,
  List, Divider, Tabs, Upload, message, Checkbox, Empty, ColorPicker, Spin
} from 'antd';
import apiClient from '../../services/api';
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
  const [accountantModalVisible, setAccountantModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [companyForm] = Form.useForm();
  const [settingsForm] = Form.useForm();
  const [accountantForm] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [savingCompany, setSavingCompany] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [invitingUser, setInvitingUser] = useState(false);
  const [invitingAccountant, setInvitingAccountant] = useState(false);

  // Data state
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  
  // Company settings state
  const [companySettings, setCompanySettings] = useState<any>(null);

  // Theme state
  const [themeSettings, setThemeSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('erp_theme');
      return saved ? JSON.parse(saved) : { primaryColor: '#1890ff', accentColor: '#52c41a', mode: 'light', sidebar: 'default', fontSize: 'medium' };
    } catch { return { primaryColor: '#1890ff', accentColor: '#52c41a', mode: 'light', sidebar: 'default', fontSize: 'medium' }; }
  });

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [usersRes, auditLogsRes, tenantRes] = await Promise.all([
          apiClient.get('/api/v2/admin/users'),
          apiClient.get('/api/v2/admin/audit-log').catch(() => ({ data: { data: [] } })),
          apiClient.get('/api/v2/settings/tenant')
        ]);
        setUsers(usersRes.data?.users || usersRes.data?.data || usersRes.data || []);
        setAuditLogs(auditLogsRes.data?.data || auditLogsRes.data?.auditLogs || auditLogsRes.data || []);
        // Set placeholder integrations
        setIntegrations([
          { id: '1', name: 'SARS eFiling', type: 'Tax', status: 'disconnected', description: 'South African Revenue Service integration' },
          { id: '2', name: 'Bank Feeds', type: 'Banking', status: 'disconnected', description: 'Automated bank statement imports' },
          { id: '3', name: 'Payroll (PaySpace)', type: 'Payroll', status: 'disconnected', description: 'Payroll processing integration' }
        ] as any[]);
        
        // Load company settings
        if (tenantRes.data?.success && tenantRes.data?.data) {
          const tenant = tenantRes.data.data;
          setCompanySettings(tenant);
          // Set form values
          companyForm.setFieldsValue({
            companyName: tenant.business_name || tenant.name || '',
            tradingAs: tenant.name || '',
            registrationNumber: tenant.registration_number || '',
            vatNumber: tenant.vat_number || '',
            taxNumber: tenant.tax_number || '',
            bbbeeLevel: tenant.bbbee_level || '4',
            address: tenant.address || '',
            postalAddress: tenant.postal_address || '',
            phone: tenant.phone || '',
            email: tenant.email || '',
            website: tenant.website || ''
          });
        }
      } catch (error) {
        console.error('Failed to fetch admin data:', error);
        message.error('Failed to load admin data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [companyForm]);
  
  // Save company settings
  const handleSaveCompany = async () => {
    try {
      setSavingCompany(true);
      const values = companyForm.getFieldsValue();
      
      await apiClient.put('/api/v2/settings/tenant', {
        businessName: values.companyName,
        registrationNumber: values.registrationNumber,
        vatNumber: values.vatNumber,
        taxNumber: values.taxNumber,
        address: values.address,
        phone: values.phone,
        email: values.email,
        website: values.website
      });
      
      // Update localStorage tenant info so header updates
      const existingTenant = localStorage.getItem('tenant');
      if (existingTenant) {
        const tenant = JSON.parse(existingTenant);
        tenant.name = values.companyName || values.tradingAs;
        tenant.registration_number = values.registrationNumber;
        localStorage.setItem('tenant', JSON.stringify(tenant));
      }
      
      message.success('Company settings saved successfully');
    } catch (error) {
      console.error('Failed to save company settings:', error);
      message.error('Failed to save company settings');
    } finally {
      setSavingCompany(false);
    }
  };

  // Invite user handler
  const handleInviteUser = async () => {
    try {
      const values = await form.validateFields();
      setInvitingUser(true);
      await apiClient.post('/api/v2/admin/users/invite', {
        email: values.email,
        first_name: values.firstName,
        last_name: values.lastName,
        role_id: values.role,
      });
      message.success(`Invitation sent to ${values.email}`);
      setUserModalVisible(false);
      form.resetFields();
      // Refresh users
      const usersRes = await apiClient.get('/api/v2/admin/users');
      setUsers(usersRes.data?.users || usersRes.data?.data || usersRes.data || []);
    } catch (error: any) {
      if (error.errorFields) return; // form validation
      message.error(error.response?.data?.message || 'Failed to send invitation');
    } finally {
      setInvitingUser(false);
    }
  };

  // Invite accountant handler
  const handleInviteAccountant = async (values: any) => {
    setInvitingAccountant(true);
    try {
      const response = await apiClient.post('/api/v2/admin/invite-accountant', values);
      if (response.data.success) {
        message.success(response.data.message || `Invitation sent to ${values.email}`);
        setAccountantModalVisible(false);
        accountantForm.resetFields();
      } else {
        message.error(response.data.message || 'Failed to invite accountant');
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to invite accountant');
    } finally {
      setInvitingAccountant(false);
    }
  };

  // Save system settings handler
  const handleSaveSettings = async () => {
    try {
      setSavingSettings(true);
      const values = settingsForm.getFieldsValue();
      await apiClient.put('/api/v2/settings/tenant', {
        timezone: values.timezone,
        dateFormat: values.dateFormat,
        currency: values.currency,
        language: values.language,
        requireMfa: values.requireMfa,
        sessionTimeout: values.sessionTimeout,
      });
      message.success('System settings saved successfully');
    } catch (error) {
      console.error('Failed to save settings:', error);
      message.error('Failed to save system settings');
    } finally {
      setSavingSettings(false);
    }
  };

  // Calculations
  const activeUsers = users.filter((u: any) => u.status === 'active' || u.is_active !== false).length;
  const mfaEnabledUsers = users.filter((u: any) => u.mfaEnabled || u.mfa_enabled).length;
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
            <Progress percent={users.length > 0 ? Math.round((mfaEnabledUsers / users.length) * 100) : 0} size="small" />
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
        <Form form={companyForm} layout="vertical" onFinish={handleSaveCompany}>
          <Row gutter={24}>
            <Col span={12}>
              <Form.Item label="Company Name" name="companyName">
                <Input placeholder="Enter company name" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Trading As" name="tradingAs">
                <Input placeholder="Trading name" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={24}>
            <Col span={12}>
              <Form.Item label="Registration Number (CIPC)" name="registrationNumber">
                <Input placeholder="2024/123456/07" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="VAT Number" name="vatNumber">
                <Input placeholder="4123456789" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={24}>
            <Col span={12}>
              <Form.Item label="Tax Number" name="taxNumber">
                <Input placeholder="9123456789" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="B-BBEE Level" name="bbbeeLevel">
                <Select placeholder="Select B-BBEE Level">
                  <Option value="1">Level 1</Option>
                  <Option value="2">Level 2</Option>
                  <Option value="3">Level 3</Option>
                  <Option value="4">Level 4</Option>
                  <Option value="5">Level 5</Option>
                  <Option value="6">Level 6</Option>
                  <Option value="7">Level 7</Option>
                  <Option value="8">Level 8</Option>
                  <Option value="nc">Non-Compliant</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Divider />
          <Title level={5}>Contact Details</Title>
          <Row gutter={24}>
            <Col span={12}>
              <Form.Item label="Physical Address" name="address">
                <TextArea rows={3} placeholder="123 Main Street\nSandton\nJohannesburg\n2196" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Postal Address" name="postalAddress">
                <TextArea rows={3} placeholder="PO Box 12345\nSandton\n2146" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={24}>
            <Col span={8}>
              <Form.Item label="Phone" name="phone">
                <Input placeholder="+27 11 123 4567" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Email" name="email">
                <Input placeholder="info@company.co.za" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Website" name="website">
                <Input placeholder="www.company.co.za" />
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
          <Button type="primary" htmlType="submit" loading={savingCompany}>
            Save Changes
          </Button>
        </Form>
      </Card>
    </div>
  );

  // User Management Tab
  const renderUserManagement = () => (
    <div style={{ padding: '24px' }}>
      {/* Invite Accountant Card */}
      <Card
        style={{
          marginBottom: 16,
          background: 'linear-gradient(135deg, #f0f7ff 0%, #e8f4f8 100%)',
          border: '1px solid #91caff',
          borderRadius: 12,
        }}
      >
        <Row align="middle" gutter={16}>
          <Col flex="none">
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: 'linear-gradient(135deg, #0a1f3e, #1e3a5f)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <SafetyCertificateOutlined style={{ fontSize: 24, color: '#fff' }} />
            </div>
          </Col>
          <Col flex="auto">
            <Text strong style={{ fontSize: 15 }}>Invite My Accountant</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 13 }}>
              Give your accountant direct access to your books. If they're already on SiyaBusa, they'll be auto-linked.
            </Text>
          </Col>
          <Col flex="none">
            <Button
              type="primary"
              icon={<SafetyCertificateOutlined />}
              onClick={() => setAccountantModalVisible(true)}
              style={{ background: '#0a1f3e', borderColor: '#0a1f3e' }}
            >
              Invite Accountant
            </Button>
          </Col>
        </Row>
      </Card>

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
          rowKey={(record: any) => record.id || record.user_id || record.email}
          columns={[
            {
              title: 'User',
              key: 'user',
              render: (_: any, record: any) => {
                const name = record.display_name || record.name || `${record.first_name || ''} ${record.last_name || ''}`.trim() || record.email;
                const isActive = record.status === 'active' || record.is_active !== false;
                return (
                  <Space>
                    <Avatar style={{ background: isActive ? '#1890ff' : '#999' }}>
                      {name ? name.split(' ').map((n: string) => n[0]).join('').substring(0, 2) : '?'}
                    </Avatar>
                    <div>
                      <Text strong>{name}</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 12 }}>{record.email}</Text>
                    </div>
                  </Space>
                );
              }
            },
            {
              title: 'Role',
              key: 'role',
              render: (_: any, record: any) => {
                const roles = record.roles || [];
                const role = roles.length > 0 ? roles[0].role_name : record.role || 'User';
                return <Tag color="blue">{role}</Tag>;
              }
            },
            {
              title: 'Status',
              key: 'status',
              render: (_: any, record: any) => {
                if (record.status === 'invited') return <Badge status="processing" text="Pending Invite" />;
                const active = record.status === 'active' || record.is_active !== false;
                return <Badge status={active ? 'success' : 'default'} text={active ? 'Active' : 'Inactive'} />;
              }
            },
            {
              title: 'MFA',
              key: 'mfa',
              render: (_: any, record: any) => {
                const enabled = record.mfaEnabled || record.mfa_enabled;
                return enabled ? <Tag color="green"><LockOutlined /> Enabled</Tag> : <Tag>Disabled</Tag>;
              }
            },
            {
              title: 'Last Login',
              key: 'lastLogin',
              render: (_: any, record: any) => {
                const login = record.lastLogin || record.last_login_at;
                return login ? new Date(login).toLocaleDateString() : '-';
              }
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
            <Title level={2} style={{ color: '#fff', margin: 0 }}>R 1,499</Title>
            <Text style={{ color: 'rgba(255,255,255,0.7)' }}>per month</Text>
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card>
            <Statistic title="Current Period" value={`${new Date(new Date().getFullYear(), new Date().getMonth(), 1).toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' })} - ${new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toLocaleDateString('en-ZA', { month: 'short', day: 'numeric', year: 'numeric' })}`} prefix={<CalendarOutlined />} />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Statistic title="Next Payment" value="R 1,499" prefix={<DollarOutlined />} />
            <Text type="secondary">Due: {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toLocaleDateString('en-ZA', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Statistic title="Payment Method" value="EFT / Bank Transfer" prefix={<BankOutlined />} />
            <Text type="secondary">Masaphokati Technologies • Standard Bank</Text>
          </Card>
        </Col>
      </Row>

      <Card style={{ marginTop: 16 }}>
        <Title level={5}><BankOutlined /> Banking Details for EFT Payment</Title>
        <Descriptions bordered column={1} size="small">
          <Descriptions.Item label="Account Holder">Masaphokati Technologies (Pty) Ltd</Descriptions.Item>
          <Descriptions.Item label="Bank">Standard Bank</Descriptions.Item>
          <Descriptions.Item label="Account Number">310341434</Descriptions.Item>
          <Descriptions.Item label="Branch Code">051 001</Descriptions.Item>
          <Descriptions.Item label="Account Type">Business Current</Descriptions.Item>
          <Descriptions.Item label="Reference">Your Company Name / Tenant ID</Descriptions.Item>
        </Descriptions>
        <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
          Please use your company name as the payment reference. Payments are due on the 1st of each month.
        </Text>
      </Card>

      <Card title={<><HistoryOutlined /> Billing History</>} style={{ marginTop: 16 }}>
        <Table
          dataSource={(() => {
            const invoices = [];
            const now = new Date();
            for (let i = 0; i < 3; i++) {
              const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
              invoices.push({ id: `INV-${String(invoices.length + 1).padStart(3, '0')}`, date: d.toISOString().slice(0, 10), amount: 1499, status: 'paid' });
            }
            return invoices;
          })()}
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
                <ColorPicker value={themeSettings.primaryColor} onChange={(_, hex) => setThemeSettings((p: any) => ({ ...p, primaryColor: typeof hex === 'string' ? hex : '#1890ff' }))} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Accent Color">
                <ColorPicker value={themeSettings.accentColor} onChange={(_, hex) => setThemeSettings((p: any) => ({ ...p, accentColor: typeof hex === 'string' ? hex : '#52c41a' }))} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={24}>
            <Col span={12}>
              <Form.Item label="Theme Mode">
                <Select value={themeSettings.mode} onChange={(v) => setThemeSettings((p: any) => ({ ...p, mode: v }))}>
                  <Option value="light">Light Mode</Option>
                  <Option value="dark">Dark Mode</Option>
                  <Option value="auto">System Default</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Sidebar Style">
                <Select value={themeSettings.sidebar} onChange={(v) => setThemeSettings((p: any) => ({ ...p, sidebar: v }))}>
                  <Option value="default">Default</Option>
                  <Option value="compact">Compact</Option>
                  <Option value="collapsed">Collapsed by Default</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Font Size">
            <Select value={themeSettings.fontSize} onChange={(v) => setThemeSettings((p: any) => ({ ...p, fontSize: v }))}>
              <Option value="small">Small</Option>
              <Option value="medium">Medium</Option>
              <Option value="large">Large</Option>
            </Select>
          </Form.Item>
          <Divider />
          <Button type="primary" onClick={() => {
            localStorage.setItem('erp_theme', JSON.stringify(themeSettings));
            const root = document.documentElement;
            root.style.setProperty('--primary-color', themeSettings.primaryColor);
            root.style.setProperty('--accent-color', themeSettings.accentColor);
            const fontMap: Record<string, string> = { small: '13px', medium: '14px', large: '16px' };
            root.style.fontSize = fontMap[themeSettings.fontSize] || '14px';
            if (themeSettings.mode === 'dark') {
              document.body.classList.add('dark-theme');
              document.body.classList.remove('light-theme');
            } else {
              document.body.classList.remove('dark-theme');
              document.body.classList.add('light-theme');
            }
            message.success('Theme applied successfully!');
          }}>Apply Theme</Button>
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
          <Button type="primary" loading={savingSettings} onClick={handleSaveSettings}>Save Settings</Button>
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
          { title: 'MFA Enabled', value: users.length > 0 ? `${Math.round((mfaEnabledUsers / users.length) * 100)}%` : '0%' },
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

      {/* Invite Accountant Modal */}
      <Modal
        title={<><SafetyCertificateOutlined /> Invite My Accountant</>}
        open={accountantModalVisible}
        onCancel={() => { setAccountantModalVisible(false); accountantForm.resetFields(); }}
        footer={null}
        destroyOnClose
        width={520}
      >
        <Alert
          message="Your accountant will manage your books from their Accountant Portal"
          description="If they already have a SiyaBusa account, they'll be auto-linked instantly."
          type="info"
          showIcon
          style={{ marginBottom: 20 }}
        />
        <Form form={accountantForm} layout="vertical" onFinish={handleInviteAccountant}>
          <Form.Item name="email" label="Accountant's Email" rules={[{ required: true, type: 'email', message: 'Enter a valid email' }]}>
            <Input placeholder="accountant@firm.co.za" prefix={<MailOutlined />} size="large" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="Contact Name">
                <Input placeholder="e.g. James Mokoena" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="firm_name" label="Firm Name">
                <Input placeholder="e.g. JM Accounting" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="engagement_type" label="Engagement Type" initialValue="full_service">
            <Select>
              <Option value="full_service">Full Service (GL, Tax, Payroll)</Option>
              <Option value="tax_only">Tax Only</Option>
              <Option value="bookkeeping">Bookkeeping</Option>
              <Option value="audit">Audit</Option>
              <Option value="advisory">Advisory</Option>
            </Select>
          </Form.Item>
          <Form.Item name="message" label="Personal Message (Optional)">
            <TextArea rows={3} placeholder="Hi, we'd like you to manage our accounts..." />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => { setAccountantModalVisible(false); accountantForm.resetFields(); }}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={invitingAccountant} icon={<SendOutlined />}
                style={{ background: '#0a1f3e', borderColor: '#0a1f3e' }}>Send Invitation</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Add User Modal */}
      <Modal
        title={<><UserOutlined /> Add New User</>}
        open={userModalVisible}
        onCancel={() => { setUserModalVisible(false); form.resetFields(); }}
        footer={[
          <Button key="cancel" onClick={() => { setUserModalVisible(false); form.resetFields(); }}>Cancel</Button>,
          <Button key="invite" type="primary" icon={<SendOutlined />} loading={invitingUser} onClick={handleInviteUser}>
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
