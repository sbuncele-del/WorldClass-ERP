/**
 * Executive Dashboard - Premium Role-Based Dashboard
 * 
 * THE WOW FACTOR for investor presentations.
 * Clean, modern, data-driven with AI insights.
 * 
 * Roles:
 * - Director: Strategic KPIs, Board-Level Metrics, Risk Overview
 * - Executive: Financial Performance, Approvals, Team Metrics
 * - Manager: Operations, Team Tasks, Project Progress
 * - Accountant: GL, Reconciliations, Compliance
 * - Staff: My Tasks, Time Tracking, Personal Metrics
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, Row, Col, Statistic, Progress, Table, Tag, Avatar, Space,
  Typography, Button, List, Timeline, Badge, Tooltip, Spin, message,
  Select, Skeleton, Divider
} from 'antd';
import {
  DollarOutlined, RiseOutlined, FallOutlined,
  BankOutlined, TeamOutlined, ProjectOutlined, FileTextOutlined,
  CheckCircleOutlined, ClockCircleOutlined, WarningOutlined,
  CalendarOutlined, BellOutlined, RightOutlined, SettingOutlined,
  PieChartOutlined, BarChartOutlined, LineChartOutlined,
  SafetyCertificateOutlined, AuditOutlined, SyncOutlined,
  ThunderboltOutlined, StarOutlined, PlusOutlined,
  ArrowUpOutlined, ArrowDownOutlined,
  UserOutlined, CrownOutlined, TrophyOutlined, FireOutlined,
  WalletOutlined, ExclamationCircleOutlined, RobotOutlined,
  MessageOutlined, ReloadOutlined
} from '@ant-design/icons';
import '../styles/executive-dashboard.css';
import { useUser } from '../contexts/UserContext';

const { Title, Text, Paragraph } = Typography;

type UserRole = 'director' | 'executive' | 'manager' | 'accountant' | 'staff' | 'admin';

interface DashboardData {
  user: {
    name: string;
    role: string;
    greeting: string;
  };
  summary: {
    date: string;
    lastUpdated: string;
  };
  kpis: KPI[];
  financial: FinancialMetrics;
  operational: OperationalMetrics;
  pendingActions: PendingAction[];
  recentActivity: Activity[];
  aiInsights: AIInsight[];
  revenueTrend: { month: string; revenue: number }[];
  compliance: ComplianceStatus;
  team: TeamMetrics;
}

interface KPI {
  key: string;
  label: string;
  value: number;
  format: 'currency' | 'percent' | 'number' | 'hours';
  trend?: number;
  icon: string;
}

interface FinancialMetrics {
  revenue: { mtd: number; ytd: number; trend: number; invoiceCount: number };
  expenses: { mtd: number; ytd: number; trend: number };
  profit: { mtd: number; ytd: number; margin: number };
  cashPosition: { total: number; trend: number };
  receivables: { total: number; overdueCount: number };
  payables: { total: number };
}

interface OperationalMetrics {
  projects: { total: number; active: number; completedMTD: number };
  tasks: { total: number; completed: number; completionRate: number; dueToday: number; overdue: number };
  customers: { total: number; newMTD: number };
}

interface PendingAction {
  id: string;
  type: string;
  title: string;
  count: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  link: string;
}

interface Activity {
  id: string;
  action: string;
  entity: string;
  description: string;
  user: string;
  timeAgo: string;
}

interface AIInsight {
  id: string;
  type: 'positive' | 'warning' | 'info' | 'critical';
  icon: string;
  title: string;
  message: string;
  action: string;
  link: string;
}

interface ComplianceStatus {
  vatStatus: string;
  payeStatus: string;
  citStatus: string;
  nextDeadline: string;
  nextDeadlineType: string;
  overallScore: number;
}

interface TeamMetrics {
  totalEmployees: number;
  presentToday: number;
  onLeave: number;
  departments: { name: string; count: number }[];
}

const ExecutiveDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useUser();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>('director');
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/v2/executive-dashboard', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success) {
        const dashData = result.data;
        // Override API user name with actual logged-in user name
        const firstName = currentUser?.firstName || dashData.user?.name || 'there';
        const hour = new Date().getHours();
        const greetWord = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
        dashData.user = {
          ...dashData.user,
          name: firstName,
          greeting: `${greetWord}, ${firstName}`
        };
        setData(dashData);
        // Set role from API response
        if (result.data.user?.role) {
          let role = result.data.user.role.toLowerCase();
          // Map super_admin to director view (top-level dashboard)
          if (role === 'super_admin') role = 'director';
          if (['director', 'executive', 'manager', 'accountant', 'staff', 'admin'].includes(role)) {
            setSelectedRole(role as UserRole);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
      message.error('Failed to load dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchDashboard, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  // Format currency in ZAR — compact for cards
  const formatCurrency = (value: number) => {
    const abs = Math.abs(value);
    const sign = value < 0 ? '-' : '';
    if (abs >= 1000000) {
      return `${sign}R${(abs / 1000000).toFixed(1)}M`;
    }
    // Show full number with thousands separator, no decimals for whole numbers
    const formatted = abs % 1 === 0 
      ? abs.toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
      : abs.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${sign}R${formatted}`;
  };

  // Full currency format (not abbreviated)
  const formatCurrencyFull = (value: number) => {
    const sign = value < 0 ? '-' : '';
    return `${sign}R ${Math.abs(value).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Format KPI value based on type
  const formatKPIValue = (kpi: KPI) => {
    switch (kpi.format) {
      case 'currency':
        return formatCurrency(kpi.value);
      case 'percent':
        return `${kpi.value.toFixed(1)}%`;
      case 'hours':
        return `${kpi.value}h`;
      default:
        return kpi.value.toLocaleString();
    }
  };

  // Get icon component for KPI
  const getKPIIcon = (icon: string) => {
    const icons: Record<string, React.ReactNode> = {
      dollar: <DollarOutlined />,
      rise: <RiseOutlined />,
      bank: <BankOutlined />,
      pie: <PieChartOutlined />,
      clock: <ClockCircleOutlined />,
      project: <ProjectOutlined />,
      check: <CheckCircleOutlined />,
      calendar: <CalendarOutlined />,
      team: <TeamOutlined />,
      warning: <WarningOutlined />,
      wallet: <WalletOutlined />,
      safety: <SafetyCertificateOutlined />,
      trophy: <TrophyOutlined />
    };
    return icons[icon] || <StarOutlined />;
  };

  // Get activity icon
  const getActivityIcon = (action: string) => {
    const icons: Record<string, React.ReactNode> = {
      created: <PlusOutlined style={{ color: '#10b981' }} />,
      approved: <CheckCircleOutlined style={{ color: '#3b82f6' }} />,
      completed: <CheckCircleOutlined style={{ color: '#10b981' }} />,
      submitted: <FileTextOutlined style={{ color: '#667eea' }} />,
      updated: <SyncOutlined style={{ color: '#f59e0b' }} />,
      deleted: <ClockCircleOutlined style={{ color: '#ef4444' }} />
    };
    return icons[action] || <FileTextOutlined style={{ color: '#6b7280' }} />;
  };

  // Get insight type color
  const getInsightColor = (type: string) => {
    const colors: Record<string, string> = {
      positive: '#10b981',
      warning: '#f59e0b',
      info: '#3b82f6',
      critical: '#ef4444'
    };
    return colors[type] || '#6b7280';
  };

  // Get priority tag color
  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      critical: 'red',
      high: 'orange',
      medium: 'blue',
      low: 'default'
    };
    return colors[priority] || 'default';
  };

  // Role configuration
  const roleConfig: Record<UserRole, { gradient: string; icon: React.ReactNode; title: string }> = {
    director: { gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', icon: <CrownOutlined />, title: 'Director Dashboard' },
    admin: { gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', icon: <CrownOutlined />, title: 'Admin Dashboard' },
    executive: { gradient: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', icon: <TrophyOutlined />, title: 'Executive Dashboard' },
    manager: { gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)', icon: <TeamOutlined />, title: 'Manager Dashboard' },
    accountant: { gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', icon: <BarChartOutlined />, title: 'Accountant Dashboard' },
    staff: { gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', icon: <UserOutlined />, title: 'My Workspace' }
  };

  const config = roleConfig[selectedRole];

  if (loading) {
    return (
      <div className="executive-dashboard">
        <div className="dashboard-loading">
          <Spin size="large" />
          <Text style={{ marginTop: 16 }}>Loading your personalized dashboard...</Text>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="executive-dashboard">
        <Card>
          <Text type="danger">Failed to load dashboard data. Please refresh.</Text>
          <Button onClick={handleRefresh} style={{ marginLeft: 16 }}>Retry</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="executive-dashboard">
      {/* Header */}
      <div className="dashboard-header" style={{ background: config.gradient }}>
        <div className="header-content">
          <div className="header-left">
            <div className="header-icon">{config.icon}</div>
            <div className="header-text">
              <Title level={2} style={{ color: 'white', margin: 0 }}>
                {data.user.greeting}
              </Title>
              <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 16 }}>
                {data.summary.date}
              </Text>
            </div>
          </div>
          <div className="header-right">
            <Button 
              icon={<ReloadOutlined spin={refreshing} />} 
              onClick={handleRefresh}
              style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none' }}
            >
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-section">
        <Row gutter={[16, 16]}>
          {data.kpis.map((kpi) => (
            <Col xs={12} sm={12} md={6} key={kpi.key}>
              <Card className="kpi-card" hoverable>
                <div className="kpi-icon" style={{ background: config.gradient }}>
                  {getKPIIcon(kpi.icon)}
                </div>
                <div className="kpi-content">
                  <Text className="kpi-label">{kpi.label}</Text>
                  <div className="kpi-value">{formatKPIValue(kpi)}</div>
                  {kpi.trend !== undefined && (
                    <div className={`kpi-trend ${kpi.trend >= 0 ? 'positive' : 'negative'}`}>
                      {kpi.trend >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                      <span>{Math.abs(kpi.trend).toFixed(1)}%</span>
                    </div>
                  )}
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </div>

      {/* Main Content */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        {/* Left Column - Actions & Insights */}
        <Col xs={24} lg={8}>
          {/* AI Insights */}
          <Card 
            title={
              <Space>
                <RobotOutlined style={{ color: '#667eea' }} />
                <span>AI Insights</span>
              </Space>
            }
            className="insights-card"
            extra={<Badge dot color="#10b981" />}
          >
            <List
              dataSource={data.aiInsights}
              renderItem={(insight) => (
                <List.Item className="insight-item">
                  <div className="insight-indicator" style={{ background: getInsightColor(insight.type) }} />
                  <div className="insight-content">
                    <Text strong>{insight.title}</Text>
                    <Paragraph type="secondary" style={{ margin: '4px 0', fontSize: 13 }}>
                      {insight.message}
                    </Paragraph>
                    <Button 
                      type="link" 
                      size="small" 
                      onClick={() => navigate(insight.link)}
                      style={{ padding: 0, height: 'auto' }}
                    >
                      {insight.action} <RightOutlined />
                    </Button>
                  </div>
                </List.Item>
              )}
            />
          </Card>

          {/* Pending Actions */}
          <Card 
            title={
              <Space>
                <BellOutlined style={{ color: '#f59e0b' }} />
                <span>Pending Actions</span>
              </Space>
            }
            className="actions-card"
            style={{ marginTop: 16 }}
            extra={<Badge count={data.pendingActions.reduce((sum, a) => sum + a.count, 0)} />}
          >
            <List
              dataSource={data.pendingActions}
              renderItem={(action) => (
                <List.Item 
                  className="action-item"
                  onClick={() => navigate(action.link)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="action-left">
                    <Badge count={action.count} size="small" style={{ backgroundColor: getPriorityColor(action.priority) === 'red' ? '#ef4444' : '#3b82f6' }} />
                    <Text style={{ marginLeft: 12 }}>{action.title}</Text>
                  </div>
                  <Tag color={getPriorityColor(action.priority)}>{action.priority}</Tag>
                </List.Item>
              )}
            />
          </Card>

          {/* Compliance Status */}
          <Card 
            title={
              <Space>
                <SafetyCertificateOutlined style={{ color: '#10b981' }} />
                <span>Compliance Status</span>
              </Space>
            }
            style={{ marginTop: 16 }}
          >
            <div className="compliance-score">
              <Progress 
                type="circle" 
                percent={data.compliance.overallScore} 
                strokeColor="#10b981"
                width={100}
                format={(percent) => `${percent}%`}
              />
              <Text style={{ marginTop: 8, display: 'block', textAlign: 'center' }}>
                Compliance Score
              </Text>
            </div>
            <Divider />
            <Space direction="vertical" style={{ width: '100%' }}>
              <div className="compliance-item">
                <Text>VAT</Text>
                <Tag color="success">Compliant</Tag>
              </div>
              <div className="compliance-item">
                <Text>PAYE</Text>
                <Tag color="success">Compliant</Tag>
              </div>
              <div className="compliance-item">
                <Text>Next Deadline</Text>
                <Text strong>{data.compliance.nextDeadlineType}</Text>
              </div>
            </Space>
          </Card>
        </Col>

        {/* Middle Column - Charts & Financial */}
        <Col xs={24} lg={8}>
          {/* Financial Summary */}
          <Card 
            title={
              <Space>
                <DollarOutlined style={{ color: '#10b981' }} />
                <span>Financial Summary</span>
              </Space>
            }
            className="financial-card"
          >
            <div className="financial-grid">
              <div className="financial-item">
                <Text type="secondary">Revenue MTD</Text>
                <div className="financial-value positive">
                  {formatCurrency(data.financial.revenue.mtd)}
                </div>
                <div className="financial-trend">
                  {data.financial.revenue.invoiceCount} invoice(s)
                </div>
              </div>
              <div className="financial-item">
                <Text type="secondary">Expenses MTD</Text>
                <div className="financial-value">
                  {formatCurrency(data.financial.expenses.mtd)}
                </div>
              </div>
              <div className="financial-item highlight">
                <Text type="secondary">Net Profit MTD</Text>
                <div className={`financial-value ${data.financial.profit.mtd >= 0 ? 'positive' : 'negative'}`}>
                  {formatCurrency(data.financial.profit.mtd)}
                </div>
                {data.financial.profit.margin !== 0 && (
                  <div className="financial-trend">
                    {data.financial.profit.margin.toFixed(1)}% margin
                  </div>
                )}
              </div>
              <div className="financial-item">
                <Text type="secondary">Cash Position</Text>
                <div className={`financial-value ${data.financial.cashPosition.total >= 0 ? '' : 'negative'}`}>
                  {formatCurrency(data.financial.cashPosition.total)}
                </div>
              </div>
            </div>
            <Divider />
            <Row gutter={16}>
              <Col span={12}>
                <Statistic 
                  title="Receivables" 
                  value={data.financial.receivables.total}
                  formatter={(val) => formatCurrency(val as number)}
                  valueStyle={{ fontSize: 16 }}
                />
                {data.financial.receivables.overdueCount > 0 && (
                  <Tag color="orange" style={{ marginTop: 4 }}>
                    {data.financial.receivables.overdueCount} overdue
                  </Tag>
                )}
              </Col>
              <Col span={12}>
                <Statistic 
                  title="Payables" 
                  value={data.financial.payables.total}
                  formatter={(val) => formatCurrency(val as number)}
                  valueStyle={{ fontSize: 16 }}
                />
              </Col>
            </Row>
          </Card>

          {/* Revenue Trend Chart */}
          <Card 
            title={
              <Space>
                <LineChartOutlined style={{ color: '#667eea' }} />
                <span>Revenue Trend (6 Months)</span>
              </Space>
            }
            style={{ marginTop: 16 }}
            className="revenue-trend-card"
          >
            {(() => {
              const trend = data.revenueTrend || [];
              if (trend.length === 0) return <Text type="secondary">No revenue data yet</Text>;
              const maxVal = Math.max(...trend.map(t => t.revenue), 1);
              const chartH = 160;
              const chartW = 100; // percentage-based
              const padBottom = 30;
              const padTop = 10;
              const usableH = chartH - padBottom - padTop;
              const stepX = chartW / (trend.length - 1 || 1);
              const points = trend.map((t, i) => ({
                x: i * stepX,
                y: padTop + usableH - (t.revenue / maxVal) * usableH,
                ...t
              }));
              const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
              const areaPath = `${linePath} L ${points[points.length - 1].x} ${chartH - padBottom} L ${points[0].x} ${chartH - padBottom} Z`;
              return (
                <div style={{ position: 'relative' }}>
                  <svg viewBox={`-2 0 ${chartW + 4} ${chartH}`} style={{ width: '100%', height: chartH }} preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="revGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#667eea" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#667eea" stopOpacity="0.02" />
                      </linearGradient>
                    </defs>
                    {/* Grid lines */}
                    {[0.25, 0.5, 0.75].map(f => (
                      <line key={f} x1="0" y1={padTop + usableH * (1 - f)} x2={chartW} y2={padTop + usableH * (1 - f)} stroke="#e5e7eb" strokeWidth="0.3" strokeDasharray="2,2" />
                    ))}
                    {/* Area */}
                    <path d={areaPath} fill="url(#revGrad)" />
                    {/* Line */}
                    <path d={linePath} fill="none" stroke="#667eea" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    {/* Data points */}
                    {points.map((p, i) => (
                      <circle key={i} cx={p.x} cy={p.y} r="2" fill="#667eea" stroke="white" strokeWidth="1" />
                    ))}
                  </svg>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                    {trend.map((t, i) => (
                      <div key={i} style={{ textAlign: 'center', flex: 1 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: t.revenue > 0 ? '#667eea' : '#9ca3af' }}>
                          {t.revenue >= 1000 ? `R${(t.revenue / 1000).toFixed(0)}K` : t.revenue > 0 ? `R${t.revenue}` : '-'}
                        </div>
                        <div style={{ fontSize: 10, color: '#9ca3af' }}>{t.month}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </Card>

          {/* Quick Actions */}
          <Card 
            title={
              <Space>
                <ThunderboltOutlined style={{ color: '#f59e0b' }} />
                <span>Quick Actions</span>
              </Space>
            }
            style={{ marginTop: 16 }}
          >
            <Row gutter={[8, 8]}>
              <Col span={12}>
                <Button 
                  block 
                  icon={<PlusOutlined />}
                  onClick={() => navigate('/app/sales-hub')}
                  className="quick-action-btn"
                >
                  New Invoice
                </Button>
              </Col>
              <Col span={12}>
                <Button 
                  block 
                  icon={<FileTextOutlined />}
                  onClick={() => navigate('/app/sales-hub')}
                  className="quick-action-btn"
                >
                  Create Quote
                </Button>
              </Col>
              <Col span={12}>
                <Button 
                  block 
                  icon={<BankOutlined />}
                  onClick={() => navigate('/app/banking-hub')}
                  className="quick-action-btn"
                >
                  Bank Recon
                </Button>
              </Col>
              <Col span={12}>
                <Button 
                  block 
                  icon={<BarChartOutlined />}
                  onClick={() => navigate('/app/financial-hub')}
                  className="quick-action-btn"
                >
                  Reports
                </Button>
              </Col>
              <Col span={12}>
                <Button 
                  block 
                  icon={<SafetyCertificateOutlined />}
                  onClick={() => navigate('/app/sars-sentinel')}
                  className="quick-action-btn"
                >
                  SARS Sentinel
                </Button>
              </Col>
              <Col span={12}>
                <Button 
                  block 
                  icon={<MessageOutlined />}
                  onClick={() => navigate('/app/communications')}
                  className="quick-action-btn"
                >
                  Messages
                </Button>
              </Col>
            </Row>
          </Card>

          {/* Team Overview — only show if employees exist */}
          {data.team.totalEmployees > 0 && (
            <Card 
              title={
                <Space>
                  <TeamOutlined style={{ color: '#3b82f6' }} />
                  <span>Team Overview</span>
                </Space>
              }
              style={{ marginTop: 16 }}
            >
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic 
                    title="Total" 
                    value={data.team.totalEmployees}
                    valueStyle={{ color: '#3b82f6' }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic 
                    title="Present" 
                    value={data.team.presentToday}
                    valueStyle={{ color: '#10b981' }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic 
                    title="On Leave" 
                    value={data.team.onLeave}
                    valueStyle={{ color: '#f59e0b' }}
                  />
                </Col>
              </Row>
            </Card>
          )}
        </Col>

        {/* Right Column - Activity & Tasks */}
        <Col xs={24} lg={8}>
          {/* Recent Activity */}
          <Card 
            title={
              <Space>
                <ClockCircleOutlined style={{ color: '#6b7280' }} />
                <span>Recent Activity</span>
              </Space>
            }
            className="activity-card"
          >
            <Timeline
              items={data.recentActivity.map((activity) => ({
                dot: getActivityIcon(activity.action),
                children: (
                  <div className="activity-item">
                    <Text>{activity.description}</Text>
                    <div className="activity-meta">
                      <Text type="secondary">{activity.user}</Text>
                      <Text type="secondary">{activity.timeAgo}</Text>
                    </div>
                  </div>
                )
              }))}
            />
          </Card>

          {/* Operational Metrics */}
          <Card 
            title={
              <Space>
                <ProjectOutlined style={{ color: '#667eea' }} />
                <span>Operations</span>
              </Space>
            }
            style={{ marginTop: 16 }}
          >
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <div className="ops-metric">
                  <Text type="secondary">Active Projects</Text>
                  <div className="ops-value">{data.operational.projects.active}</div>
                </div>
              </Col>
              <Col span={12}>
                <div className="ops-metric">
                  <Text type="secondary">Total Projects</Text>
                  <div className="ops-value">{data.operational.projects.total}</div>
                </div>
              </Col>
              <Col span={12}>
                <div className="ops-metric">
                  <Text type="secondary">Total Customers</Text>
                  <div className="ops-value">{data.operational.customers.total}</div>
                </div>
              </Col>
              <Col span={12}>
                <div className="ops-metric">
                  <Text type="secondary">Suppliers</Text>
                  <div className="ops-value">{(data.operational as any).suppliers?.total || 0}</div>
                </div>
              </Col>
            </Row>
            <Divider />
            <Row gutter={16}>
              <Col span={12}>
                <div className="ops-metric">
                  <Text type="secondary">Journal Entries</Text>
                  <div className="ops-value">{data.operational.tasks.total}</div>
                </div>
              </Col>
              <Col span={12}>
                <div className="ops-metric">
                  <Text type="secondary">New Customers MTD</Text>
                  <div className="ops-value positive">+{data.operational.customers.newMTD}</div>
                </div>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ExecutiveDashboard;
