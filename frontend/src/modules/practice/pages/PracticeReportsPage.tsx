import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Table,
  Tag,
  Statistic,
  Progress,
  Select,
  Space,
  Spin,
  Divider,
  Empty,
} from 'antd';
import {
  BarChartOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  ProjectOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import apiClient from '../../../services/api';

const { Text, Title } = Typography;
const { Option } = Select;

const PracticeReportsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<any[]>([]);
  const [timeEntries, setTimeEntries] = useState<any[]>([]);
  const [clientHealth, setClientHealth] = useState<any[]>([]);
  const [reportType, setReportType] = useState('utilization');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [projRes, timeRes, healthRes] = await Promise.all([
          apiClient.get('/api/v2/practice/projects').catch(() => ({ data: { data: [] } })),
          apiClient.get('/api/v2/practice/time-entries', { params: { limit: 200 } }).catch(() => ({ data: { data: [] } })),
          apiClient.get('/api/v2/practice/clients/health').catch(() => ({ data: { data: [] } })),
        ]);

        const pl = projRes.data?.data || projRes.data?.projects || [];
        if (Array.isArray(pl)) setProjects(pl);

        const tl = timeRes.data?.data || timeRes.data?.time_entries || [];
        if (Array.isArray(tl)) setTimeEntries(tl);

        const hl = healthRes.data?.data || healthRes.data?.clients || [];
        if (Array.isArray(hl)) setClientHealth(hl);
      } catch (err) {
        console.error('Error fetching report data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Compute utilization by project
  const projectUtil = projects.map((p: any) => {
    const projEntries = timeEntries.filter((e: any) =>
      (e.project_id || e.matter_id) === (p.project_id || p.id)
    );
    const totalHrs = projEntries.reduce((s: number, e: any) => s + Number(e.hours || 0), 0);
    const billableHrs = projEntries.filter((e: any) => e.is_billable).reduce((s: number, e: any) => s + Number(e.hours || 0), 0);
    const budget = Number(p.budget || 0);
    const wipValue = billableHrs * Number(p.billing_rate || 1500);
    return {
      name: p.project_name || p.name,
      client: p.client_name || p.customer_name || 'Internal',
      status: p.status || 'Active',
      totalHours: totalHrs,
      billableHours: billableHrs,
      utilization: totalHrs > 0 ? Math.round((billableHrs / totalHrs) * 100) : 0,
      budget,
      wipValue,
      budgetUsed: budget > 0 ? Math.round((wipValue / budget) * 100) : 0,
    };
  });

  // Summary
  const totalHours = timeEntries.reduce((s, e) => s + Number(e.hours || 0), 0);
  const billableHours = timeEntries.filter(e => e.is_billable).reduce((s, e) => s + Number(e.hours || 0), 0);
  const overallUtilization = totalHours > 0 ? Math.round((billableHours / totalHours) * 100) : 0;
  const totalWIP = projectUtil.reduce((s, p) => s + p.wipValue, 0);

  const utilizationColumns = [
    {
      title: 'Project',
      key: 'name',
      render: (_: any, r: any) => (
        <div>
          <Text strong>{r.name}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>{r.client}</Text>
        </div>
      ),
    },
    {
      title: 'Total Hours',
      key: 'total',
      render: (_: any, r: any) => <Text>{r.totalHours.toFixed(1)}h</Text>,
      sorter: (a: any, b: any) => a.totalHours - b.totalHours,
    },
    {
      title: 'Billable',
      key: 'billable',
      render: (_: any, r: any) => <Text style={{ color: '#10b981' }}>{r.billableHours.toFixed(1)}h</Text>,
      sorter: (a: any, b: any) => a.billableHours - b.billableHours,
    },
    {
      title: 'Utilization',
      key: 'util',
      width: 150,
      render: (_: any, r: any) => (
        <Progress
          percent={r.utilization}
          size="small"
          strokeColor={r.utilization >= 80 ? '#10b981' : r.utilization >= 60 ? '#f59e0b' : '#ef4444'}
        />
      ),
      sorter: (a: any, b: any) => a.utilization - b.utilization,
    },
    {
      title: 'WIP Value',
      key: 'wip',
      render: (_: any, r: any) => <Text strong>R {r.wipValue.toLocaleString('en-ZA')}</Text>,
      sorter: (a: any, b: any) => a.wipValue - b.wipValue,
    },
    {
      title: 'Budget Used',
      key: 'budgetUsed',
      width: 130,
      render: (_: any, r: any) => (
        r.budget > 0 ? (
          <Progress
            percent={Math.min(r.budgetUsed, 100)}
            size="small"
            strokeColor={r.budgetUsed > 90 ? '#ef4444' : r.budgetUsed > 70 ? '#f59e0b' : '#10b981'}
            format={() => `${r.budgetUsed}%`}
          />
        ) : <Text type="secondary">—</Text>
      ),
    },
  ];

  const healthColumns = [
    {
      title: 'Client',
      key: 'name',
      render: (_: any, r: any) => <Text strong>{r.client_name || r.name}</Text>,
    },
    {
      title: 'Health Score',
      key: 'score',
      width: 160,
      render: (_: any, r: any) => {
        const score = Number(r.health_score || 0);
        return (
          <Progress
            percent={score}
            size="small"
            strokeColor={score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444'}
          />
        );
      },
      sorter: (a: any, b: any) => Number(a.health_score || 0) - Number(b.health_score || 0),
    },
    {
      title: 'Risk Level',
      key: 'risk',
      render: (_: any, r: any) => {
        const score = Number(r.health_score || 0);
        if (score >= 80) return <Tag color="green">Low Risk</Tag>;
        if (score >= 60) return <Tag color="orange">Medium Risk</Tag>;
        return <Tag color="red">High Risk</Tag>;
      },
    },
    {
      title: 'Last Contact',
      key: 'contact',
      render: (_: any, r: any) => <Text type="secondary">{(r.last_contact_date || r.last_interaction || '—').slice(0, 10)}</Text>,
    },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', minHeight: 300, alignItems: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      {/* Report Selector + Summary */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic title="Overall Utilization" value={overallUtilization} suffix="%" prefix={<BarChartOutlined />}
              valueStyle={{ color: overallUtilization >= 80 ? '#10b981' : '#f59e0b' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Total Hours" value={totalHours.toFixed(1)} suffix="h" prefix={<ClockCircleOutlined />} valueStyle={{ color: '#667eea' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Billable Hours" value={billableHours.toFixed(1)} suffix="h" prefix={<DollarOutlined />} valueStyle={{ color: '#10b981' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Total WIP" value={totalWIP} prefix="R" valueStyle={{ color: '#764ba2' }} />
          </Card>
        </Col>
      </Row>

      {/* Report Type Selector */}
      <Card
        title={<><BarChartOutlined /> Practice Reports</>}
        extra={
          <Select value={reportType} onChange={setReportType} style={{ width: 200 }}>
            <Option value="utilization">Utilization Report</Option>
            <Option value="health">Client Health Report</Option>
          </Select>
        }
      >
        {reportType === 'utilization' ? (
          <Table
            dataSource={projectUtil}
            columns={utilizationColumns}
            rowKey={(r) => r.name + r.client}
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: <Empty description="No project data available. Create engagements and log time to see reports." /> }}
          />
        ) : (
          <Table
            dataSource={clientHealth}
            columns={healthColumns}
            rowKey={(r) => r.client_id || r.id || r.client_name || Math.random()}
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: <Empty description="No client health data. Health scores are calculated from client interactions and project activity." /> }}
          />
        )}
      </Card>
    </div>
  );
};

export default PracticeReportsPage;
