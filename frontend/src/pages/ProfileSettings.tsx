import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Avatar, Select, Switch, Tabs, Tag, 
         message, Divider, Typography, Space, Row, Col, Spin } from 'antd';
import { UserOutlined, LockOutlined, BellOutlined, MailOutlined, 
         SaveOutlined, SafetyOutlined } from '@ant-design/icons';
import { useUser } from '../contexts/UserContext';
import apiClient from '../services/api';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const ProfileSettings: React.FC = () => {
  const { currentUser } = useUser();
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [notifPrefs, setNotifPrefs] = useState({
    paymentNotifications: true,
    inventoryAlerts: true,
    teamNotifications: true,
    systemNotifications: true,
    securityAlerts: true,
    productUpdates: true,
    digestFrequency: 'daily',
  });

  const [avatarUrl, setAvatarUrl] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get('/api/v2/profile');
        if (res.data?.success && res.data.data) {
          const p = res.data.data;
          profileForm.setFieldsValue({
            name: p.full_name || p.name || `${p.first_name || ''} ${p.last_name || ''}`.trim(),
            email: p.email || '',
            phone: p.phone || '',
            role: p.role || '',
            timezone: p.timezone || 'Africa/Johannesburg',
            language: p.language || 'en',
          });
          setAvatarUrl(p.avatar_url || p.avatar || '');
        }
      } catch {
        if (currentUser) {
          profileForm.setFieldsValue({
            name: currentUser.fullName || `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim(),
            email: currentUser.email || '',
            phone: (currentUser as any).phone || '',
            role: typeof currentUser.role === 'string' ? currentUser.role : (currentUser.role as any)?.name || '',
            timezone: 'Africa/Johannesburg',
            language: 'en',
          });
        }
      }

      try {
        const prefsRes = await apiClient.get('/api/v2/profile/notifications');
        if (prefsRes.data?.success && prefsRes.data.data) {
          setNotifPrefs(prev => ({ ...prev, ...prefsRes.data.data }));
        }
      } catch { /* use defaults */ }

      setLoading(false);
    };
    loadProfile();
  }, [currentUser, profileForm]);

  const handleSaveProfile = async (values: any) => {
    setSaving(true);
    try {
      const res = await apiClient.put('/api/v2/profile', {
        name: values.name,
        phone: values.phone,
        timezone: values.timezone,
        language: values.language,
      });
      if (res.data?.success) {
        message.success('Profile updated successfully!');
      } else {
        message.error(res.data?.message || 'Failed to update profile');
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (values: any) => {
    if (values.newPassword !== values.confirmPassword) {
      message.error('New passwords do not match');
      return;
    }
    setChangingPassword(true);
    try {
      const res = await apiClient.put('/api/v2/profile/password', {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      if (res.data?.success) {
        message.success('Password changed successfully!');
        passwordForm.resetFields();
      } else {
        message.error(res.data?.message || 'Failed to change password');
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSaveNotifications = async () => {
    setSaving(true);
    try {
      await apiClient.put('/api/v2/profile/notifications', notifPrefs);
      message.success('Notification preferences saved!');
    } catch {
      message.error('Failed to save notification preferences');
    } finally {
      setSaving(false);
    }
  };

  const userInitials = () => {
    const name = profileForm.getFieldValue('name') || currentUser?.fullName || '';
    const parts = name.split(' ');
    return `${parts[0]?.[0] || ''}${parts[1]?.[0] || ''}`.toUpperCase() || 'U';
  };

  const roleDisplay = typeof currentUser?.role === 'object' 
    ? (currentUser?.role as any)?.displayName || (currentUser?.role as any)?.name || 'User'
    : String(currentUser?.role || profileForm.getFieldValue('role') || 'User');

  const roleColor: Record<string, string> = {
    super_admin: '#e11d48', admin: '#667eea', director: '#667eea',
    manager: '#f59e0b', accountant: '#3b82f6', staff: '#8b5cf6', user: '#8b5cf6',
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Spin size="large" tip="Loading profile..." />
      </div>
    );
  }

  const profileTab = (
    <Form form={profileForm} layout="vertical" onFinish={handleSaveProfile}>
      <Card style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 24 }}>
          <Avatar 
            size={80}
            src={avatarUrl || undefined}
            style={{ 
              background: `linear-gradient(135deg, ${roleColor[roleDisplay.toLowerCase()] || '#667eea'} 0%, #764ba2 100%)`,
              fontSize: 28
            }}
          >
            {!avatarUrl && userInitials()}
          </Avatar>
          <div>
            <Title level={4} style={{ margin: 0 }}>{profileForm.getFieldValue('name') || currentUser?.fullName || 'User'}</Title>
            <Text type="secondary">{profileForm.getFieldValue('email') || currentUser?.email}</Text>
            <br />
            <Tag color={roleColor[roleDisplay.toLowerCase()] || '#667eea'} style={{ marginTop: 4 }}>
              {roleDisplay}
            </Tag>
          </div>
        </div>
      </Card>

      <Card title="Personal Information">
        <Row gutter={24}>
          <Col xs={24} md={12}>
            <Form.Item name="name" label="Full Name" rules={[{ required: true, message: 'Name is required' }]}>
              <Input size="large" placeholder="Your full name" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="email" label="Email Address">
              <Input size="large" disabled suffix={<MailOutlined />} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="phone" label="Phone Number">
              <Input size="large" placeholder="+27 XX XXX XXXX" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="role" label="Role">
              <Input size="large" disabled />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="timezone" label="Timezone">
              <Select size="large">
                <Option value="Africa/Johannesburg">South Africa (SAST, GMT+2)</Option>
                <Option value="Europe/London">London (GMT)</Option>
                <Option value="America/New_York">New York (EST, GMT-5)</Option>
                <Option value="Asia/Dubai">Dubai (GST, GMT+4)</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="language" label="Language">
              <Select size="large">
                <Option value="en">English</Option>
                <Option value="af">Afrikaans</Option>
                <Option value="zu">isiZulu</Option>
                <Option value="xh">isiXhosa</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>
        <div style={{ textAlign: 'right', marginTop: 16 }}>
          <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving} size="large">
            Save Changes
          </Button>
        </div>
      </Card>
    </Form>
  );

  const securityTab = (
    <div>
      <Card title="Change Password" style={{ marginBottom: 24 }}>
        <Form form={passwordForm} layout="vertical" onFinish={handleChangePassword} style={{ maxWidth: 500 }}>
          <Form.Item name="currentPassword" label="Current Password" rules={[{ required: true }]}>
            <Input.Password size="large" placeholder="Enter current password" />
          </Form.Item>
          <Form.Item name="newPassword" label="New Password" rules={[{ required: true, min: 8, message: 'Min 8 characters' }]}>
            <Input.Password size="large" placeholder="Enter new password" />
          </Form.Item>
          <Form.Item name="confirmPassword" label="Confirm New Password" rules={[{ required: true }]}>
            <Input.Password size="large" placeholder="Confirm new password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" icon={<LockOutlined />} loading={changingPassword} size="large">
            Change Password
          </Button>
        </Form>
      </Card>

      <Card title="Security Status">
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Text strong>Email Verification</Text>
              <br /><Text type="secondary">Your email address verification status</Text>
            </div>
            <Tag color="green" icon={<SafetyOutlined />}>Verified</Tag>
          </div>
          <Divider style={{ margin: '8px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Text strong>Two-Factor Authentication</Text>
              <br /><Text type="secondary">Add an extra layer of security to your account</Text>
            </div>
            <Tag color="default">Coming Soon</Tag>
          </div>
          <Divider style={{ margin: '8px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Text strong>Last Login</Text>
              <br /><Text type="secondary">{new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
            </div>
            <Tag color="blue">Active Session</Tag>
          </div>
        </Space>
      </Card>
    </div>
  );

  const notificationsTab = (
    <Card title="Notification Preferences">
      <Paragraph type="secondary" style={{ marginBottom: 24 }}>
        Choose which notifications you want to receive. Security alerts cannot be disabled.
      </Paragraph>
      <Space direction="vertical" size={0} style={{ width: '100%' }}>
        {[
          { key: 'securityAlerts', label: 'Security Alerts', desc: 'Login attempts, password changes', disabled: true },
          { key: 'paymentNotifications', label: 'Payment Notifications', desc: 'Payment confirmations, receipts, billing' },
          { key: 'inventoryAlerts', label: 'Inventory Alerts', desc: 'Low stock warnings, reorder notifications' },
          { key: 'teamNotifications', label: 'Team Notifications', desc: 'Invitations, mentions, collaborations' },
          { key: 'systemNotifications', label: 'System Notifications', desc: 'Account updates, maintenance notices' },
          { key: 'productUpdates', label: 'Product Updates', desc: 'New features, improvements, release notes' },
        ].map(item => (
          <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid #f0f0f0' }}>
            <div>
              <Text strong>{item.label}</Text>
              <br /><Text type="secondary" style={{ fontSize: 13 }}>{item.desc}</Text>
            </div>
            <Switch 
              checked={(notifPrefs as any)[item.key]} 
              disabled={item.disabled}
              onChange={(checked) => setNotifPrefs(prev => ({ ...prev, [item.key]: checked }))} 
            />
          </div>
        ))}

        <div style={{ marginTop: 20 }}>
          <Text strong>Email Digest Frequency</Text>
          <br />
          <Select 
            value={notifPrefs.digestFrequency} 
            onChange={(v) => setNotifPrefs(prev => ({ ...prev, digestFrequency: v }))}
            style={{ width: 300, marginTop: 8 }}
            size="large"
          >
            <Option value="instant">Instant (as they happen)</Option>
            <Option value="daily">Daily Digest</Option>
            <Option value="weekly">Weekly Digest</Option>
            <Option value="never">Never (disable all)</Option>
          </Select>
        </div>

        <div style={{ textAlign: 'right', marginTop: 24 }}>
          <Button type="primary" icon={<SaveOutlined />} onClick={handleSaveNotifications} loading={saving} size="large">
            Save Preferences
          </Button>
        </div>
      </Space>
    </Card>
  );

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px' }}>
      <div style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
        borderRadius: 12, padding: '32px 40px', marginBottom: 24, color: '#fff' 
      }}>
        <Title level={2} style={{ color: '#fff', margin: 0 }}>Profile Settings</Title>
        <Text style={{ color: 'rgba(255,255,255,0.8)' }}>Manage your account settings and preferences</Text>
      </div>

      <Tabs
        defaultActiveKey="profile"
        size="large"
        items={[
          { key: 'profile', label: <span><UserOutlined /> Profile</span>, children: profileTab },
          { key: 'security', label: <span><LockOutlined /> Security</span>, children: securityTab },
          { key: 'notifications', label: <span><BellOutlined /> Notifications</span>, children: notificationsTab },
        ]}
      />
    </div>
  );
};

export default ProfileSettings;
