import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  Button,
  Card,
  Col,
  Input,
  Row,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
} from 'antd';
import {
  TeamOutlined,
  SafetyCertificateOutlined,
  LockOutlined,
  ReloadOutlined,
  UserAddOutlined,
} from '@ant-design/icons';
import { HubLayout, HubHeader, StatusBanner, HubTabs } from '../components/hub';
import { workspaceApi } from '../services/api.service';

interface AdminUser {
  user_id: string;
  email: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  phone?: string;
  avatar_url?: string;
  email_verified?: boolean;
  mfa_enabled?: boolean;
  last_login_at?: string;
  last_active_at?: string;
  is_active?: boolean;
  roles?: Array<{ role_id: string; role_name: string; role_code?: string }>;
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const loadUsers = async (query?: string) => {
    setLoading(true);
    setError(null);
    try {
      const term = query ?? search;
      const response: any = await workspaceApi.admin.getUsers({ limit: 200, search: term || undefined });
      const list = (response?.users || response?.data || []) as AdminUser[];
      setUsers(Array.isArray(list) ? list : []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter(u => u.is_active !== false).length;
    const mfa = users.filter(u => u.mfa_enabled).length;
    const roleNames = new Set<string>();
    users.forEach(u => (u.roles || []).forEach(r => roleNames.add(r.role_name)));
    return { total, active, mfa, roles: roleNames.size };
  }, [users]);

  const filteredUsers = useMemo(() => {
    const term = search.toLowerCase();
    if (!term) return users;
    return users.filter(u =>
      [u.display_name, u.first_name, u.last_name, u.email, u.username]
        .filter(Boolean)
        .some(val => val?.toLowerCase().includes(term))
    );
  }, [users, search]);

  const columns = [
    {
      title: 'User',
      key: 'user',
      render: (_: unknown, record: AdminUser) => {
        const name = record.display_name || `${record.first_name || ''} ${record.last_name || ''}`.trim() || record.email;
        return (
          <Space>
            <Avatar src={record.avatar_url}>{name?.charAt(0)}</Avatar>
            <div>
              <div style={{ fontWeight: 600 }}>{name}</div>
              <div style={{ color: '#64748b', fontSize: 12 }}>{record.email}</div>
            </div>
          </Space>
        );
      },
    },
    {
      title: 'Roles',
      dataIndex: 'roles',
      key: 'roles',
      render: (roles: AdminUser['roles']) =>
        roles && roles.length > 0 ? roles.map(r => <Tag key={r.role_id || r.role_name}>{r.role_name}</Tag>) : <Tag>—</Tag>,
    },
    {
      title: 'MFA',
      dataIndex: 'mfa_enabled',
      key: 'mfa_enabled',
      render: (enabled: boolean) => (enabled ? <Tag color="green">Enabled</Tag> : <Tag>Off</Tag>),
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (active: boolean) => <Tag color={active !== false ? 'green' : 'red'}>{active !== false ? 'Active' : 'Disabled'}</Tag>,
    },
    {
      title: 'Last Login',
      dataIndex: 'last_login_at',
      key: 'last_login_at',
      render: (val: string) => (val ? new Date(val).toLocaleString() : '—'),
    },
  ];

  const content = () => {
    if (loading) {
      return (
        <div style={{ padding: '48px 0', textAlign: 'center' }}>
          <Spin size="large" tip="Loading users..." />
        </div>
      );
    }

    if (error) {
      return (
        <Alert
          type="error"
          message="Failed to load users"
          description={error}
          action={<Button icon={<ReloadOutlined />} onClick={loadUsers}>Retry</Button>}
          showIcon
        />
      );
    }

    return (
      <>
        <Card style={{ marginBottom: 16 }}>
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Input.Search
              placeholder="Search users"
              allowClear
              value={search}
              onChange={e => setSearch(e.target.value)}
              onSearch={value => {
                setSearch(value);
                loadUsers(value);
              }}
              style={{ maxWidth: 320 }}
            />
            <Space>
              <Button icon={<ReloadOutlined />} onClick={loadUsers}>Refresh</Button>
              <Button type="primary" icon={<UserAddOutlined />}>Add User</Button>
            </Space>
          </Space>
        </Card>

        <Table
          rowKey={record => record.user_id || record.email}
          columns={columns}
          dataSource={filteredUsers}
          pagination={{ pageSize: 10, showSizeChanger: true }}
        />
      </>
    );
  };

  return (
    <HubLayout>
      <HubHeader
        title="User Management"
        subtitle="Manage users, roles, permissions, and access control"
        icon={<TeamOutlined />}
        gradient="blue"
      />

      <StatusBanner
        gradient="blue"
        icon={<SafetyCertificateOutlined />}
        title="Directory Overview"
        subtitle="Tenant-scoped users"
        stats={[
          { title: 'Total Users', value: stats.total, prefix: <TeamOutlined /> },
          { title: 'Active Users', value: stats.active, valueStyle: { color: '#22c55e' } },
          { title: 'MFA Enabled', value: stats.mfa, prefix: <LockOutlined /> },
          { title: 'Roles Defined', value: stats.roles },
        ]}
      />

      <HubTabs
        theme="blue"
        tabs={[
          {
            key: 'users',
            label: 'Users',
            icon: <TeamOutlined />,
            children: (
              <Row gutter={[16, 16]}>
                <Col span={24}>
                  <Card>
                    <Row gutter={16} style={{ marginBottom: 16 }}>
                      <Col xs={24} sm={12} md={6}>
                        <Statistic title="Total Users" value={stats.total} prefix={<TeamOutlined />} />
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <Statistic title="Active" value={stats.active} valueStyle={{ color: '#22c55e' }} />
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <Statistic title="MFA Enabled" value={stats.mfa} prefix={<LockOutlined />} />
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <Statistic title="Roles" value={stats.roles} />
                      </Col>
                    </Row>
                    {content()}
                  </Card>
                </Col>
              </Row>
            ),
          },
        ]}
      />
    </HubLayout>
  );
};

export default UserManagement;
