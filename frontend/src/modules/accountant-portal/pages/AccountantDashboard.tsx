import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Tag,
  Button,
  Avatar,
  Space,
  Spin,
  Empty,
  Typography,
  List,
  Divider,
  message,
  Tooltip,
  Badge,
} from 'antd';
import {
  TeamOutlined,
  BankOutlined,
  SwapOutlined,
  PlusOutlined,
  SendOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  RiseOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
  UserOutlined,
  ArrowRightOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Text, Paragraph } = Typography;

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface FirmInfo {
  id: string;
  name: string;
  type: string;
  email: string;
  phone: string;
  practice_number: string;
}

interface DashboardStats {
  totalClients: number;
  activeEngagements: number;
  pendingInvitations: number;
  monthlyRevenue: number;
}

interface ClientCard {
  id: string;
  tenant_id: string;
  company_name: string;
  industry: string;
  status: string;
  engagement_type: string;
  last_accessed: string;
  financial_health: 'good' | 'warning' | 'critical' | 'unknown';
}

interface ActivityItem {
  id: string;
  action: string;
  resource_type: string;
  client_name: string;
  user_name: string;
  created_at: string;
  details: string;
}

interface DashboardData {
  firm: FirmInfo;
  stats: DashboardStats;
  clients: ClientCard[];
  recentActivity: ActivityItem[];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const healthConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  good: { color: '#52c41a', icon: <CheckCircleOutlined />, label: 'Healthy' },
  warning: { color: '#faad14', icon: <ExclamationCircleOutlined />, label: 'Needs Attention' },
  critical: { color: '#ff4d4f', icon: <WarningOutlined />, label: 'Critical' },
  unknown: { color: '#d9d9d9', icon: <ClockCircleOutlined />, label: 'No Data' },
};

const statusColor: Record<string, string> = {
  active: 'green',
  onboarding: 'blue',
  suspended: 'orange',
  terminated: 'red',
};

const formatDate = (iso: string) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(val);

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const AccountantDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v2/accountant-portal/dashboard', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) throw new Error('Failed to load dashboard');
      const json = await response.json();
      setData(json.data);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      message.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  /* ---------- switch ---------- */
  const handleSwitchToClient = async (clientTenantId: string, clientName: string) => {
    try {
      const response = await fetch(`/api/v2/accountant-portal/switch/${clientTenantId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });
      const result = await response.json();
      if (result.success) {
        localStorage.setItem('firmToken', localStorage.getItem('token') || '');
        localStorage.setItem('token', result.data.accessToken);
        localStorage.setItem(
          'accountantClientContext',
          JSON.stringify({
            clientTenantId,
            clientName: result.data.tenant?.name || clientName,
            firmTenantId: result.data.firmTenantId,
          }),
        );
        window.location.href = '/app';
      } else {
        message.error(result.message || 'Failed to switch to client');
      }
    } catch (err) {
      console.error('Switch error:', err);
      message.error('Failed to switch to client');
    }
  };

  /* ---------- render ---------- */
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <Spin size="large" tip="Loading dashboard…" />
      </div>
    );
  }

  if (!data) {
    return <Empty description="No dashboard data available" />;
  }

  const { firm, stats, clients, recentActivity } = data;

  return (
    <div style={{ padding: '0 0 32px' }}>
      {/* -------- Firm Info -------- */}
      <Card
        style={{ marginBottom: 24, borderLeft: '4px solid #1890ff' }}
        bodyStyle={{ padding: '16px 24px' }}
      >
        <Row align="middle" gutter={24}>
          <Col>
            <Avatar size={56} icon={<BankOutlined />} style={{ backgroundColor: '#1890ff' }} />
          </Col>
          <Col flex="auto">
            <Title level={4} style={{ margin: 0 }}>{firm?.name || 'Your Firm'}</Title>
            <Space size="middle" style={{ marginTop: 4 }}>
              {firm?.type && <Tag color="blue">{firm.type}</Tag>}
              {firm?.practice_number && <Text type="secondary">Practice #{firm.practice_number}</Text>}
              {firm?.email && <Text type="secondary">{firm.email}</Text>}
              {firm?.phone && <Text type="secondary">{firm.phone}</Text>}
            </Space>
          </Col>
          <Col>
            <Button icon={<ReloadOutlined />} onClick={fetchDashboard}>Refresh</Button>
          </Col>
        </Row>
      </Card>

      {/* -------- Stats -------- */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable onClick={() => navigate('/app/accountant-portal/clients')}>
            <Statistic
              title="Total Clients"
              value={stats?.totalClients ?? 0}
              prefix={<TeamOutlined style={{ color: '#1890ff' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Active Engagements"
              value={stats?.activeEngagements ?? 0}
              prefix={<FileTextOutlined style={{ color: '#52c41a' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable onClick={() => navigate('/app/accountant-portal/invitations')}>
            <Statistic
              title="Pending Invitations"
              value={stats?.pendingInvitations ?? 0}
              prefix={<SendOutlined style={{ color: '#faad14' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Monthly Revenue"
              value={stats?.monthlyRevenue ?? 0}
              prefix={<DollarOutlined style={{ color: '#722ed1' }} />}
              formatter={(v) => formatCurrency(Number(v))}
            />
          </Card>
        </Col>
      </Row>

      {/* -------- Quick Actions -------- */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/app/accountant-portal/invitations')}
          >
            Invite Client
          </Button>
        </Col>
        <Col>
          <Button icon={<TeamOutlined />} onClick={() => navigate('/app/accountant-portal/clients')}>
            View All Clients
          </Button>
        </Col>
        <Col>
          <Button icon={<RiseOutlined />}>View Reports</Button>
        </Col>
      </Row>

      <Divider />

      {/* -------- Client Cards + Activity -------- */}
      <Row gutter={24}>
        {/* Client Cards */}
        <Col xs={24} lg={16}>
          <Title level={5} style={{ marginBottom: 16 }}>Client Overview</Title>
          {(!clients || clients.length === 0) ? (
            <Empty description="No clients yet. Invite your first client to get started!" />
          ) : (
            <Row gutter={[16, 16]}>
              {clients.slice(0, 6).map((client) => {
                const health = healthConfig[client.financial_health] || healthConfig.unknown;
                return (
                  <Col xs={24} sm={12} xl={8} key={client.id}>
                    <Card
                      hoverable
                      size="small"
                      style={{ height: '100%' }}
                      actions={[
                        <Tooltip title="Switch to Client" key="switch">
                          <SwapOutlined
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSwitchToClient(client.tenant_id, client.company_name);
                            }}
                          />
                        </Tooltip>,
                        <Tooltip title="View Details" key="details">
                          <ArrowRightOutlined
                            onClick={() => navigate(`/app/accountant-portal/clients/${client.tenant_id}`)}
                          />
                        </Tooltip>,
                      ]}
                    >
                      <Card.Meta
                        avatar={
                          <Avatar style={{ backgroundColor: '#1890ff' }} icon={<BankOutlined />} />
                        }
                        title={
                          <Space>
                            <span>{client.company_name}</span>
                            <Tag color={statusColor[client.status] || 'default'} style={{ fontSize: 11 }}>
                              {client.status}
                            </Tag>
                          </Space>
                        }
                        description={
                          <Space direction="vertical" size={2} style={{ width: '100%' }}>
                            {client.industry && <Text type="secondary">{client.industry}</Text>}
                            {client.engagement_type && (
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {client.engagement_type}
                              </Text>
                            )}
                            <Space style={{ marginTop: 4 }}>
                              <Badge color={health.color} text={<Text style={{ fontSize: 12 }}>{health.label}</Text>} />
                            </Space>
                            <Text type="secondary" style={{ fontSize: 11 }}>
                              Last accessed: {formatDate(client.last_accessed)}
                            </Text>
                          </Space>
                        }
                      />
                    </Card>
                  </Col>
                );
              })}
            </Row>
          )}
          {clients && clients.length > 6 && (
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <Button type="link" onClick={() => navigate('/app/accountant-portal/clients')}>
                View all {clients.length} clients →
              </Button>
            </div>
          )}
        </Col>

        {/* Recent Activity */}
        <Col xs={24} lg={8}>
          <Title level={5} style={{ marginBottom: 16 }}>Recent Activity</Title>
          {(!recentActivity || recentActivity.length === 0) ? (
            <Empty description="No recent activity" />
          ) : (
            <List
              size="small"
              dataSource={recentActivity.slice(0, 10)}
              renderItem={(item) => (
                <List.Item style={{ padding: '8px 0' }}>
                  <List.Item.Meta
                    avatar={<Avatar size="small" icon={<UserOutlined />} />}
                    title={
                      <Text style={{ fontSize: 13 }}>
                        <Text strong>{item.user_name}</Text>{' '}
                        <Text type="secondary">{item.action}</Text>
                      </Text>
                    }
                    description={
                      <Space direction="vertical" size={0}>
                        {item.client_name && (
                          <Text style={{ fontSize: 12 }}>{item.client_name}</Text>
                        )}
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {formatDate(item.created_at)}
                        </Text>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          )}
          <div style={{ textAlign: 'center', marginTop: 8 }}>
            <Button type="link" size="small" onClick={() => navigate('/app/accountant-portal/activity')}>
              View full activity log →
            </Button>
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default AccountantDashboard;
