import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Row,
  Col,
  Statistic,
  Typography,
  Button,
  Tag,
  Table,
  Progress,
  Space,
  Avatar,
  Spin,
  List,
  Divider,
  Badge,
} from 'antd';
import {
  TeamOutlined,
  ProjectOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  PlusOutlined,
  RocketOutlined,
  TrophyOutlined,
  CalendarOutlined,
  FileTextOutlined,
  RiseOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import apiClient from '../../../services/api';

const { Title, Text } = Typography;

const PracticeDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activeClients: 0,
    activeProjects: 0,
    teamMembers: 0,
    utilization: 0,
    wipValue: 0,
    monthlyRevenue: 0,
    billableHours: 0,
    totalHours: 0,
  });
  const [recentProjects, setRecentProjects] = useState<any[]>([]);
  const [recentTimeEntries, setRecentTimeEntries] = useState<any[]>([]);
  const [clientHealth, setClientHealth] = useState<any[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const [workspaceRes, projectsRes, timeRes, healthRes] = await Promise.all([
          apiClient.get('/api/v2/practice/workspace').catch(() => ({ data: null })),
          apiClient.get('/api/v2/practice/projects', { params: { limit: 5 } }).catch(() => ({ data: { data: [] } })),
          apiClient.get('/api/v2/practice/time-entries', { params: { limit: 5 } }).catch(() => ({ data: { data: [] } })),
          apiClient.get('/api/v2/practice/clients/health').catch(() => ({ data: { data: [] } })),
        ]);

        // Parse workspace stats
        if (workspaceRes.data) {
          const ws = workspaceRes.data.data || workspaceRes.data;
          const summary = ws.summary || ws;
          setStats(prev => ({
            ...prev,
            activeClients: Number(summary.total_clients || summary.activeClients || 0),
            activeProjects: Number(summary.active_matters || summary.activeProjects || ws.projects?.length || 0),
            teamMembers: Number(summary.team_members || summary.teamMembers || 0),
            billableHours: Number(summary.billable_hours_this_month || summary.billableHours || 0),
            totalHours: Number(summary.total_hours || summary.totalHours || 0),
            monthlyRevenue: Number(summary.total_revenue_this_month || summary.monthlyRevenue || 0),
            wipValue: Number(summary.wip_value || summary.wipValue || 0),
            utilization: Number(summary.utilization || 0),
          }));
        }

        // Projects
        const projects = projectsRes.data?.data || projectsRes.data?.projects || [];
        if (Array.isArray(projects)) setRecentProjects(projects.slice(0, 5));

        // Time entries
        const entries = timeRes.data?.data || timeRes.data?.time_entries || [];
        if (Array.isArray(entries)) setRecentTimeEntries(entries.slice(0, 5));

        // Client health
        const health = healthRes.data?.data || healthRes.data?.clients || [];
        if (Array.isArray(health)) setClientHealth(health.slice(0, 5));
      } catch (err) {
        console.error('Error fetching practice dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const basePath = window.location.pathname.startsWith('/app/practice-hub') ? '/app/practice-hub' : '/app/practice';

  const projectColumns = [
    {
      title: 'Project',
      key: 'name',
      render: (_: any, r: any) => (
        <div>
          <Text strong>{r.project_name || r.name}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>{r.client_name || r.customer_name || '—'}</Text>
        </div>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      render: (_: any, r: any) => {
        const s = (r.status || 'active').toLowerCase();
        const color = s === 'completed' ? 'green' : s === 'in_progress' || s === 'active' ? 'blue' : s === 'planning' ? 'orange' : 'default';
        return <Tag color={color}>{(r.status || 'Active').replace(/_/g, ' ')}</Tag>;
      },
    },
    {
      title: 'Budget',
      key: 'budget',
      render: (_: any, r: any) => (
        <Text>R {Number(r.budget || 0).toLocaleString('en-ZA')}</Text>
      ),
    },
    {
      title: 'Progress',
      key: 'progress',
      width: 160,
      render: (_: any, r: any) => {
        const pct = Number(r.progress || r.completion_percentage || 0);
        return <Progress percent={pct} size="small" strokeColor={pct >= 80 ? '#10b981' : '#667eea'} />;
      },
    },
  ];

  const timeColumns = [
    {
      title: 'Date',
      key: 'date',
      render: (_: any, r: any) => <Text>{(r.entry_date || r.date || '').slice(0, 10)}</Text>,
    },
    {
      title: 'Project',
      key: 'project',
      render: (_: any, r: any) => <Text>{r.project_name || r.matter_name || '—'}</Text>,
    },
    {
      title: 'Hours',
      key: 'hours',
      render: (_: any, r: any) => (
        <Tag color={r.is_billable ? 'green' : 'default'}>
          {Number(r.hours || 0).toFixed(1)}h {r.is_billable ? '(Billable)' : ''}
        </Tag>
      ),
    },
    {
      title: 'Description',
      key: 'description',
      ellipsis: true,
      render: (_: any, r: any) => <Text type="secondary">{r.description || '—'}</Text>,
    },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <Spin size="large" tip="Loading practice data..." />
      </div>
    );
  }

  return (
    <div>
      {/* Performance Banner */}
      <Card
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: 16,
          marginBottom: 24,
          border: 'none',
        }}
      >
        <Row gutter={24} align="middle">
          <Col span={5}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <TrophyOutlined style={{ fontSize: 32, color: '#fbbf24' }} />
              <div>
                <Text strong style={{ fontSize: 16, display: 'block', color: 'white' }}>Practice Management</Text>
                <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>
                  {new Date().toLocaleString('en-ZA', { month: 'long', year: 'numeric' })}
                </Text>
              </div>
            </div>
          </Col>
          <Col span={4}>
            <Statistic title="Active Clients" value={stats.activeClients} valueStyle={{ color: 'white' }} prefix={<TeamOutlined />} />
          </Col>
          <Col span={4}>
            <Statistic title="Projects" value={stats.activeProjects} valueStyle={{ color: 'white' }} prefix={<ProjectOutlined />} />
          </Col>
          <Col span={4}>
            <Statistic
              title="Billable Hours"
              value={stats.billableHours}
              suffix="h"
              valueStyle={{ color: '#86efac' }}
              prefix={<ClockCircleOutlined />}
            />
          </Col>
          <Col span={4}>
            <Statistic
              title="Revenue (MTD)"
              value={stats.monthlyRevenue}
              prefix="R"
              valueStyle={{ color: '#fbbf24', fontSize: 18 }}
            />
          </Col>
          <Col span={3}>
            <div style={{ textAlign: 'center' }}>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, display: 'block' }}>WIP Value</Text>
              <Text strong style={{ color: 'white', fontSize: 20 }}>
                R {stats.wipValue.toLocaleString('en-ZA')}
              </Text>
            </div>
          </Col>
        </Row>
      </Card>

      {/* Quick Actions */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate(`${basePath}/engagements`)}>
            New Engagement
          </Button>
        </Col>
        <Col>
          <Button icon={<ClockCircleOutlined />} onClick={() => navigate(`${basePath}/time-tracking`)}>
            Log Time
          </Button>
        </Col>
        <Col>
          <Button icon={<TeamOutlined />} onClick={() => navigate(`${basePath}/clients`)}>
            Manage Clients
          </Button>
        </Col>
        <Col>
          <Button icon={<DollarOutlined />} onClick={() => navigate(`${basePath}/billing`)}>
            Billing
          </Button>
        </Col>
        <Col>
          <Button icon={<FileTextOutlined />} onClick={() => navigate('/app/sales-hub/invoices')}>
            Sales Invoices
          </Button>
        </Col>
      </Row>

      <Row gutter={24}>
        {/* Recent Projects */}
        <Col span={14}>
          <Card
            title={<><ProjectOutlined /> Recent Projects</>}
            extra={
              <Button type="link" onClick={() => navigate(`${basePath}/engagements`)}>
                View All <ArrowRightOutlined />
              </Button>
            }
            style={{ marginBottom: 24 }}
          >
            <Table
              dataSource={recentProjects}
              columns={projectColumns}
              rowKey={(r) => r.project_id || r.id || Math.random()}
              pagination={false}
              size="middle"
              locale={{ emptyText: 'No projects yet — create one from Sales quotations or the Engagements page' }}
            />
          </Card>

          {/* Recent Time Entries */}
          <Card
            title={<><ClockCircleOutlined /> Recent Time Entries</>}
            extra={
              <Button type="link" onClick={() => navigate(`${basePath}/time-tracking`)}>
                View All <ArrowRightOutlined />
              </Button>
            }
          >
            <Table
              dataSource={recentTimeEntries}
              columns={timeColumns}
              rowKey={(r) => r.entry_id || r.id || Math.random()}
              pagination={false}
              size="small"
              locale={{ emptyText: 'No time entries logged yet' }}
            />
          </Card>
        </Col>

        {/* Side Panel */}
        <Col span={10}>
          {/* Client Health */}
          <Card
            title={<><TeamOutlined /> Client Health</>}
            extra={
              <Button type="link" onClick={() => navigate(`${basePath}/clients`)}>
                All Clients <ArrowRightOutlined />
              </Button>
            }
            style={{ marginBottom: 24 }}
          >
            {clientHealth.length === 0 ? (
              <Text type="secondary">No client health data available yet</Text>
            ) : (
              <List
                dataSource={clientHealth}
                renderItem={(item: any) => (
                  <List.Item>
                    <div style={{ width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text strong>{item.client_name || item.name}</Text>
                        <Tag color={
                          Number(item.health_score || 0) >= 80 ? 'green' :
                          Number(item.health_score || 0) >= 60 ? 'orange' : 'red'
                        }>
                          {item.health_score || 0}/100
                        </Tag>
                      </div>
                      <Progress
                        percent={Number(item.health_score || 0)}
                        size="small"
                        showInfo={false}
                        strokeColor={
                          Number(item.health_score || 0) >= 80 ? '#10b981' :
                          Number(item.health_score || 0) >= 60 ? '#f59e0b' : '#ef4444'
                        }
                      />
                    </div>
                  </List.Item>
                )}
              />
            )}
          </Card>

          {/* Cross-Module Links */}
          <Card title={<><RocketOutlined /> Quick Links</>} style={{ marginBottom: 24 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button block icon={<ProjectOutlined />} onClick={() => navigate('/app/projects-hub')}>
                Projects Hub
              </Button>
              <Button block icon={<DollarOutlined />} onClick={() => navigate('/app/sales-hub')}>
                Sales & CRM
              </Button>
              <Button block icon={<FileTextOutlined />} onClick={() => navigate('/app/sales-hub/quotations')}>
                Quotations → Projects
              </Button>
              <Button block icon={<TeamOutlined />} onClick={() => navigate('/app/sales-hub/customers')}>
                Customer Directory
              </Button>
            </Space>
          </Card>

          {/* Module Stats */}
          <Card title="Practice Metrics">
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Statistic
                  title="Total Hours (MTD)"
                  value={stats.totalHours}
                  suffix="h"
                  valueStyle={{ fontSize: 18 }}
                  prefix={<ClockCircleOutlined />}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Team Members"
                  value={stats.teamMembers}
                  valueStyle={{ fontSize: 18 }}
                  prefix={<TeamOutlined />}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Utilization"
                  value={stats.utilization}
                  suffix="%"
                  valueStyle={{ fontSize: 18, color: stats.utilization >= 80 ? '#10b981' : '#f59e0b' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="WIP"
                  value={stats.wipValue}
                  prefix="R"
                  valueStyle={{ fontSize: 18, color: '#667eea' }}
                />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default PracticeDashboardPage;
