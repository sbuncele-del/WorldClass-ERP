import React from 'react';
import { Card, Row, Col, Statistic, Button, Tag, List, Space } from 'antd';
import {
  DownloadOutlined,
  SyncOutlined,
  FileTextOutlined,
  BarChartOutlined,
  CalendarOutlined,
  RiseOutlined,
  ToolOutlined,
  CarOutlined
} from '@ant-design/icons';
import EnterpriseLayout from '../../components/layout/EnterpriseLayout';
import './logistics-enterprise.css';

interface Report {
  title: string;
  description: string;
  icon: React.ReactNode;
  frequency: string;
  lastGenerated: string;
  color: string;
}

const LogisticsReports: React.FC = () => {
  const tabs = [
    { id: 'command', label: '🎯 Command Center', path: '/logistics/dashboard' },
    { id: 'planner', label: '📋 Load Planner', path: '/logistics/planner' },
    { id: 'trips', label: '🚚 Trip Management', path: '/logistics/trips' },
    { id: 'fleet', label: '🚛 Fleet', path: '/logistics/fleet' },
    { id: 'drivers', label: '👨‍✈️ Drivers', path: '/logistics/drivers' },
    { id: 'routes', label: '🗺️ Routes', path: '/logistics/routes' },
    { id: 'incidents', label: '⚠️ Incidents', path: '/logistics/incidents' },
    { id: 'geofences', label: '📍 Geofences', path: '/logistics/geofences' },
    { id: 'fuel', label: '⛽ Fuel', path: '/logistics/fuel' },
    { id: 'reports', label: '📊 Reports', path: '/logistics/reports' },
  ];

  const breadcrumbs = [
    { label: 'Logistics', path: '/logistics' },
    { label: 'Reports & Analytics' }
  ];

  const reports: Report[] = [
    {
      title: 'Fleet Performance Report',
      description: 'Comprehensive analysis of vehicle utilization, maintenance costs, and downtime',
      icon: <CarOutlined style={{ fontSize: 24 }} />,
      frequency: 'Monthly',
      lastGenerated: '2025-11-01',
      color: '#667eea'
    },
    {
      title: 'Driver Performance Scorecard',
      description: 'On-time delivery rates, incidents, and efficiency metrics by driver',
      icon: <BarChartOutlined style={{ fontSize: 24 }} />,
      frequency: 'Weekly',
      lastGenerated: '2025-11-07',
      color: '#10b981'
    },
    {
      title: 'Fuel Consumption Analysis',
      description: 'Fuel costs, efficiency trends, and anomaly detection across the fleet',
      icon: <RiseOutlined style={{ fontSize: 24 }} />,
      frequency: 'Monthly',
      lastGenerated: '2025-11-01',
      color: '#f59e0b'
    },
    {
      title: 'Trip Summary Report',
      description: 'Completed trips, POD status, delivery performance, and customer satisfaction',
      icon: <FileTextOutlined style={{ fontSize: 24 }} />,
      frequency: 'Daily',
      lastGenerated: '2025-11-10',
      color: '#8b5cf6'
    },
    {
      title: 'Maintenance Schedule',
      description: 'Upcoming services, overdue maintenance, and license renewals',
      icon: <ToolOutlined style={{ fontSize: 24 }} />,
      frequency: 'Weekly',
      lastGenerated: '2025-11-07',
      color: '#ef4444'
    },
    {
      title: 'Cost Analysis',
      description: 'Total cost of ownership, cost per km, and budget variance analysis',
      icon: <BarChartOutlined style={{ fontSize: 24 }} />,
      frequency: 'Monthly',
      lastGenerated: '2025-11-01',
      color: '#06b6d4'
    },
  ];

  const insights = [
    { text: 'Fleet utilization increased by 12% this month', type: 'success' as const, icon: <RiseOutlined /> },
    { text: 'Average fuel efficiency improved to 3.8 km/L (+0.2)', type: 'success' as const, icon: <RiseOutlined /> },
    { text: '2 vehicles require maintenance this week', type: 'warning' as const, icon: <ToolOutlined /> },
    { text: 'On-time delivery rate: 92.5% (target: 95%)', type: 'warning' as const, icon: <CalendarOutlined /> },
  ];

  const getFrequencyColor = (frequency: string) => {
    switch (frequency) {
      case 'Daily': return 'blue';
      case 'Weekly': return 'green';
      case 'Monthly': return 'purple';
      default: return 'default';
    }
  };

  return (
    <EnterpriseLayout
      moduleTitle="Reports & Analytics"
      moduleSubtitle="Performance dashboards and business intelligence"
      breadcrumbs={breadcrumbs}
      tabs={tabs}
    >
      {/* Stats Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Available Reports"
              value={reports.length}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#667eea' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Daily Reports"
              value={1}
              prefix={<CalendarOutlined />}
              valueStyle={{ color: '#10b981' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Weekly Reports"
              value={2}
              prefix={<CalendarOutlined />}
              valueStyle={{ color: '#f59e0b' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Monthly Reports"
              value={3}
              prefix={<BarChartOutlined />}
              valueStyle={{ color: '#8b5cf6' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Report Catalog */}
      <Card title="Report Catalog" style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]}>
          {reports.map((report, index) => (
            <Col xs={24} md={12} lg={8} key={index}>
              <Card
                hoverable
                style={{ height: '100%' }}
                actions={[
                  <Button icon={<DownloadOutlined />} key="download">Download</Button>,
                  <Button type="primary" icon={<SyncOutlined />} key="generate">Generate</Button>
                ]}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 16 }}>
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: 8,
                    background: `${report.color}20`,
                    color: report.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {report.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{report.title}</h4>
                    <Tag color={getFrequencyColor(report.frequency)} style={{ marginTop: 4 }}>
                      {report.frequency}
                    </Tag>
                  </div>
                </div>
                <p style={{ color: '#64748b', fontSize: 13, marginBottom: 12, minHeight: 40 }}>
                  {report.description}
                </p>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>
                  Last generated: {new Date(report.lastGenerated).toLocaleDateString('en-ZA')}
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      {/* Quick Insights */}
      <Card title="Quick Insights">
        <List
          dataSource={insights}
          renderItem={(item) => (
            <List.Item>
              <Space>
                <Tag color={item.type === 'success' ? 'green' : 'orange'} icon={item.icon}>
                  {item.type === 'success' ? 'Positive' : 'Attention'}
                </Tag>
                <span style={{ fontSize: 14 }}>{item.text}</span>
              </Space>
            </List.Item>
          )}
        />
      </Card>
    </EnterpriseLayout>
  );
};

export default LogisticsReports;
