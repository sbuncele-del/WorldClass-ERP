import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Row, Col, Statistic, Tag, Button, Avatar, Space, Spin,
  Typography, List, message, Tooltip, Badge, Alert, Input, Select, Empty,
} from 'antd';
import {
  TeamOutlined, BankOutlined, PlusOutlined, SendOutlined,
  FileTextOutlined, ClockCircleOutlined, DollarOutlined,
  CheckCircleOutlined, UserOutlined, ArrowRightOutlined,
  ReloadOutlined, SearchOutlined, PauseCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;
const { Option } = Select;

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json',
});

const fmt = (n: number) =>
  new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(n);

const relativeTime = (iso: string) => {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const engagementLabel: Record<string, string> = {
  full_service: 'Full Service',
  bookkeeping: 'Bookkeeping',
  tax_only: 'Tax Only',
  payroll_only: 'Payroll',
  audit: 'Audit',
  consulting: 'Consulting',
};

const statusTag = (s: string) => {
  const map: Record<string, { color: string; icon: React.ReactNode }> = {
    active: { color: 'success', icon: <CheckCircleOutlined /> },
    paused: { color: 'warning', icon: <PauseCircleOutlined /> },
    terminated: { color: 'error', icon: <ClockCircleOutlined /> },
  };
  const cfg = map[s] || { color: 'default', icon: null };
  return (
    <Tag color={cfg.color} icon={cfg.icon} style={{ fontSize: 11 }}>
      {s}
    </Tag>
  );
};

const AccountantDashboard: React.FC = () => {
  const navigate = useNavigate();

  const [loadingDash, setLoadingDash] = useState(true);
  const [loadingClients, setLoadingClients] = useState(true);
  const [dashError, setDashError] = useState<string | null>(null);
  const [switching, setSwitching] = useState<string | null>(null);

  const [firm, setFirm] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [pendingInvitations, setPendingInvitations] = useState(0);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);

  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchDashboard = useCallback(async () => {
    setLoadingDash(true);
    setDashError(null);
    try {
      const res = await fetch('/api/v2/accountant-portal/dashboard', { headers: authHeaders() });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || json.message || 'Dashboard load failed');
      const d = json.data;
      setFirm(d.firm);
      setStats(d.stats);
      setPendingInvitations(d.pending_invitations ?? 0);
      setRecentActivity(d.recent_activity ?? []);
    } catch (err: any) {
      setDashError(err.message);
    } finally {
      setLoadingDash(false);
    }
  }, []);

  const fetchClients = useCallback(async () => {
    setLoadingClients(true);
    try {
      const res = await fetch('/api/v2/accountant-portal/clients', { headers: authHeaders() });
      const json = await res.json();
      if (res.ok && json.success) setClients(json.data ?? []);
    } catch {
      // non-fatal
    } finally {
      setLoadingClients(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    fetchClients();
  }, [fetchDashboard, fetchClients]);

  const handleSwitch = async (clientTenantId: string, clientName: string) => {
    setSwitching(clientTenantId);
    try {
      const res = await fetch(`/api/v2/accountant-portal/switch/${clientTenantId}`, {
        method: 'POST',
        headers: authHeaders(),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || json.message || 'Switch failed');

      const d = json.data;
      if (!localStorage.getItem('firmToken')) {
        localStorage.setItem('firmToken', localStorage.getItem('token') ?? '');
      }
      localStorage.setItem('token', d.access_token);
      localStorage.setItem(
        'accountantClientContext',
        JSON.stringify({
          clientTenantId,
          clientName: d.client_tenant?.name ?? clientName,
          firmTenantId: d.firm_tenant_id,
        }),
      );
      window.location.href = '/app';
    } catch (err: any) {
      message.error(err.message ?? 'Failed to switch client');
      setSwitching(null);
    }
  };

  const filteredClients = clients.filter((c) => {
    const name = (c.client_name ?? '').toLowerCase();
    const matchSearch = !searchText || name.includes(searchText.toLowerCase());
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (loadingDash && loadingClients) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <Space direction="vertical" align="center">
          <Spin size="large" />
          <Text type="secondary">Loading your practice…</Text>
        </Space>
      </div>
    );
  }

  if (dashError) {
    return (
      <Alert
        type="error"
        showIcon
        message="Could not load dashboard"
        description={dashError}
        action={
          <Button size="small" onClick={() => { fetchDashboard(); fetchClients(); }}>
            Retry
          </Button>
        }
      />
    );
  }

  const totalClients  = Number(stats?.total_clients  ?? clients.length);
  const activeClients = Number(stats?.active_clients ?? clients.filter((c) => c.status === 'active').length);
  const totalBilling  = clients.reduce((sum, c) => sum + Number(c.billing_rate ?? 0), 0);

  return (
    <div style={{ paddingBottom: 40 }}>

      {/* Firm Banner */}
      <Card
        style={{ marginBottom: 20, background: 'linear-gradient(135deg, #003a8c 0%, #1890ff 100%)', border: 'none', borderRadius: 8 }}
        bodyStyle={{ padding: '20px 28px' }}
      >
        <Row align="middle" justify="space-between">
          <Col>
            <Space size={16}>
              <Avatar size={52} icon={<BankOutlined />} style={{ background: 'rgba(255,255,255,0.2)', fontSize: 24 }} />
              <div>
                <Title level={4} style={{ margin: 0, color: '#fff' }}>
                  {firm?.firm_name ?? 'Your Practice'}
                </Title>
                <Space size={12} style={{ marginTop: 4 }}>
                  {firm?.subscription_tier && (
                    <Tag style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', fontSize: 11 }}>
                      {firm.subscription_tier}
                    </Tag>
                  )}
                  <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>
                    {totalClients} client{totalClients !== 1 ? 's' : ''} under management
                  </Text>
                </Space>
              </div>
            </Space>
          </Col>
          <Col>
            <Space>
              <Button
                icon={<PlusOutlined />}
                onClick={() => navigate('/app/accountant-portal/invitations')}
                style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.4)', color: '#fff' }}
              >
                Add Client
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => { fetchDashboard(); fetchClients(); }}
                style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff' }}
              />
            </Space>
          </Col>
        </Row>
      </Card>

      {/* KPI Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card hoverable onClick={() => navigate('/app/accountant-portal/clients')} bodyStyle={{ padding: '16px 20px' }}>
            <Statistic
              title={<Text style={{ fontSize: 12, color: '#8c8c8c' }}>Total Clients</Text>}
              value={totalClients}
              prefix={<TeamOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ fontSize: 26, fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card bodyStyle={{ padding: '16px 20px' }}>
            <Statistic
              title={<Text style={{ fontSize: 12, color: '#8c8c8c' }}>Active Engagements</Text>}
              value={activeClients}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ fontSize: 26, fontWeight: 700, color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card hoverable onClick={() => navigate('/app/accountant-portal/invitations')} bodyStyle={{ padding: '16px 20px' }}>
            <Statistic
              title={<Text style={{ fontSize: 12, color: '#8c8c8c' }}>Pending Invitations</Text>}
              value={pendingInvitations}
              prefix={<SendOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ fontSize: 26, fontWeight: 700, color: pendingInvitations > 0 ? '#faad14' : undefined }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card bodyStyle={{ padding: '16px 20px' }}>
            <Statistic
              title={<Text style={{ fontSize: 12, color: '#8c8c8c' }}>Monthly Billing</Text>}
              value={totalBilling}
              prefix={<DollarOutlined style={{ color: '#722ed1' }} />}
              valueStyle={{ fontSize: 26, fontWeight: 700 }}
              formatter={(v) => fmt(Number(v))}
            />
          </Card>
        </Col>
      </Row>

      {/* Client Portfolio + Activity */}
      <Row gutter={24}>

        {/* Client List */}
        <Col xs={24} lg={16}>
          <Card
            title={
              <Space>
                <TeamOutlined />
                <span style={{ fontWeight: 600 }}>Client Portfolio</span>
                <Badge count={clients.length} style={{ backgroundColor: '#1890ff' }} />
              </Space>
            }
            extra={
              <Button type="link" size="small" onClick={() => navigate('/app/accountant-portal/clients')}>
                Manage all →
              </Button>
            }
            bodyStyle={{ padding: 0 }}
          >
            <div style={{ padding: '10px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', gap: 8 }}>
              <Input
                placeholder="Search clients…"
                allowClear
                style={{ flex: 1 }}
                prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                onChange={(e) => setSearchText(e.target.value)}
              />
              <Select value={statusFilter} onChange={setStatusFilter} style={{ width: 130 }}>
                <Option value="all">All Status</Option>
                <Option value="active">Active</Option>
                <Option value="paused">Paused</Option>
                <Option value="terminated">Terminated</Option>
              </Select>
            </div>

            {loadingClients ? (
              <div style={{ padding: 40, textAlign: 'center' }}><Spin /></div>
            ) : filteredClients.length === 0 ? (
              <Empty
                style={{ padding: 40 }}
                description={
                  clients.length === 0
                    ? 'No clients yet. Click "Add Client" to invite your first client.'
                    : 'No clients match your filter.'
                }
              >
                {clients.length === 0 && (
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/app/accountant-portal/invitations')}>
                    Invite First Client
                  </Button>
                )}
              </Empty>
            ) : (
              <List
                dataSource={filteredClients}
                renderItem={(client) => (
                  <List.Item
                    style={{ padding: '14px 20px', borderBottom: '1px solid #f5f5f5' }}
                    actions={[
                      <Tooltip title={`Open ${client.client_name}'s ERP`} key="open">
                        <Button
                          type="primary"
                          size="small"
                          icon={<ArrowRightOutlined />}
                          loading={switching === client.client_tenant_id}
                          onClick={() => handleSwitch(client.client_tenant_id, client.client_name)}
                        >
                          Open
                        </Button>
                      </Tooltip>,
                    ]}
                  >
                    <List.Item.Meta
                      avatar={
                        <Avatar
                          size={40}
                          style={{ background: '#e6f7ff', color: '#1890ff', fontWeight: 700, fontSize: 16 }}
                        >
                          {(client.client_name ?? 'C')[0].toUpperCase()}
                        </Avatar>
                      }
                      title={
                        <Space size={8}>
                          <Text strong style={{ fontSize: 14 }}>{client.client_name}</Text>
                          {statusTag(client.status)}
                          {client.engagement_type && (
                            <Tag color="geekblue" style={{ fontSize: 11 }}>
                              {engagementLabel[client.engagement_type] ?? client.engagement_type}
                            </Tag>
                          )}
                        </Space>
                      }
                      description={
                        <Space size={16}>
                          {client.access_level && (
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              Access: {client.access_level.replace(/_/g, ' ')}
                            </Text>
                          )}
                          {Number(client.billing_rate) > 0 && (
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {fmt(Number(client.billing_rate))}/mo
                            </Text>
                          )}
                          {client.updated_at && (
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              Updated {relativeTime(client.updated_at)}
                            </Text>
                          )}
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>

        {/* Right Column */}
        <Col xs={24} lg={8}>

          {/* Recent Activity */}
          <Card
            title={
              <Space>
                <ClockCircleOutlined />
                <span style={{ fontWeight: 600 }}>Recent Activity</span>
              </Space>
            }
            extra={
              <Button type="link" size="small" onClick={() => navigate('/app/accountant-portal/activity')}>
                View all →
              </Button>
            }
            bodyStyle={{ padding: 0 }}
          >
            {recentActivity.length === 0 ? (
              <Empty style={{ padding: 32 }} description="No activity yet" />
            ) : (
              <List
                dataSource={recentActivity.slice(0, 12)}
                renderItem={(item) => (
                  <List.Item style={{ padding: '10px 16px', borderBottom: '1px solid #fafafa' }}>
                    <List.Item.Meta
                      avatar={
                        <Avatar size={30} icon={<UserOutlined />} style={{ background: '#f0f0f0', color: '#595959' }} />
                      }
                      title={
                        <Text style={{ fontSize: 12 }}>
                          <Text strong>
                            {item.first_name ? `${item.first_name} ${item.last_name ?? ''}`.trim() : 'System'}
                          </Text>{' '}
                          <Text type="secondary">{(item.action ?? '').replace(/_/g, ' ')}</Text>
                        </Text>
                      }
                      description={
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {item.client_name ? `${item.client_name} · ` : ''}{relativeTime(item.created_at)}
                        </Text>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>

          {/* Quick Actions */}
          <Card title={<span style={{ fontWeight: 600 }}>Quick Actions</span>} style={{ marginTop: 16 }} bodyStyle={{ padding: 12 }}>
            <Space direction="vertical" style={{ width: '100%' }} size={8}>
              <Button block icon={<PlusOutlined />} onClick={() => navigate('/app/accountant-portal/invitations')}>
                Invite Client
              </Button>
              <Button block icon={<FileTextOutlined />} onClick={() => navigate('/app/accountant-portal/jobs')}>
                View Jobs
              </Button>
              <Button block icon={<ClockCircleOutlined />} onClick={() => navigate('/app/accountant-portal/time')}>
                Log Time
              </Button>
              <Button block icon={<TeamOutlined />} onClick={() => navigate('/app/accountant-portal/clients')}>
                Manage Clients
              </Button>
            </Space>
          </Card>

        </Col>
      </Row>
    </div>
  );
};

export default AccountantDashboard;
