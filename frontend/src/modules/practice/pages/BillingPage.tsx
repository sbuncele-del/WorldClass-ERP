import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Row,
  Col,
  Button,
  Typography,
  Table,
  Tag,
  Statistic,
  Space,
  Spin,
  Progress,
  Divider,
} from 'antd';
import {
  DollarOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  ArrowRightOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import apiClient from '../../../services/api';

const { Text, Title } = Typography;

const BillingPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [timeEntries, setTimeEntries] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalBillable: 0,
    totalNonBillable: 0,
    wipValue: 0,
    invoicedValue: 0,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [entriesRes, projectsRes] = await Promise.all([
        apiClient.get('/api/v2/practice/time-entries', { params: { limit: 100 } }).catch(() => ({ data: { data: [] } })),
        apiClient.get('/api/v2/practice/projects').catch(() => ({ data: { data: [] } })),
      ]);

      const entryList = entriesRes.data?.data || entriesRes.data?.time_entries || [];
      if (Array.isArray(entryList)) {
        setTimeEntries(entryList);
        const billable = entryList.filter((e: any) => e.is_billable);
        const nonBillable = entryList.filter((e: any) => !e.is_billable);
        const billableHours = billable.reduce((s: number, e: any) => s + Number(e.hours || 0), 0);
        const nonBillableHours = nonBillable.reduce((s: number, e: any) => s + Number(e.hours || 0), 0);
        // Estimate WIP using a default rate of R1500/hr
        const estimatedWIP = billable
          .filter((e: any) => (e.status || 'pending').toLowerCase() !== 'invoiced')
          .reduce((s: number, e: any) => s + Number(e.hours || 0) * Number(e.rate || 1500), 0);
        setStats(prev => ({
          ...prev,
          totalBillable: billableHours,
          totalNonBillable: nonBillableHours,
          wipValue: estimatedWIP,
        }));
      }

      const projList = projectsRes.data?.data || projectsRes.data?.projects || [];
      if (Array.isArray(projList)) setProjects(projList);
    } catch (err) {
      console.error('Error fetching billing data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Aggregate billing by project
  const projectBilling = projects.map((p: any) => {
    const projEntries = timeEntries.filter((e: any) =>
      (e.project_id || e.matter_id) === (p.project_id || p.id)
    );
    const billableHrs = projEntries.filter((e: any) => e.is_billable).reduce((s: number, e: any) => s + Number(e.hours || 0), 0);
    const totalHrs = projEntries.reduce((s: number, e: any) => s + Number(e.hours || 0), 0);
    const wipAmount = billableHrs * Number(p.billing_rate || 1500);
    return {
      ...p,
      billableHours: billableHrs,
      totalHours: totalHrs,
      wipAmount,
      utilization: totalHrs > 0 ? Math.round((billableHrs / totalHrs) * 100) : 0,
    };
  }).filter(p => p.totalHours > 0);

  const columns = [
    {
      title: 'Project / Engagement',
      key: 'name',
      render: (_: any, r: any) => (
        <div>
          <Text strong>{r.project_name || r.name}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>{r.client_name || r.customer_name || 'Internal'}</Text>
        </div>
      ),
    },
    {
      title: 'Billable Hours',
      key: 'billable',
      render: (_: any, r: any) => (
        <Text strong style={{ color: '#10b981' }}>{r.billableHours.toFixed(1)}h</Text>
      ),
    },
    {
      title: 'Total Hours',
      key: 'total',
      render: (_: any, r: any) => <Text>{r.totalHours.toFixed(1)}h</Text>,
    },
    {
      title: 'Utilization',
      key: 'util',
      width: 120,
      render: (_: any, r: any) => (
        <Progress
          percent={r.utilization}
          size="small"
          strokeColor={r.utilization >= 80 ? '#10b981' : r.utilization >= 60 ? '#f59e0b' : '#ef4444'}
        />
      ),
    },
    {
      title: 'WIP Value',
      key: 'wip',
      render: (_: any, r: any) => (
        <Text strong>R {r.wipAmount.toLocaleString('en-ZA')}</Text>
      ),
    },
    {
      title: 'Budget',
      key: 'budget',
      render: (_: any, r: any) => {
        const budget = Number(r.budget || 0);
        const pct = budget > 0 ? Math.round((r.wipAmount / budget) * 100) : 0;
        return (
          <div>
            <Text>R {budget.toLocaleString('en-ZA')}</Text>
            {budget > 0 && (
              <Progress
                percent={Math.min(pct, 100)}
                size="small"
                strokeColor={pct > 90 ? '#ef4444' : pct > 70 ? '#f59e0b' : '#10b981'}
                format={() => `${pct}%`}
              />
            )}
          </div>
        );
      },
    },
    {
      title: '',
      key: 'action',
      width: 120,
      render: (_: any, r: any) => (
        <Button
          type="link"
          icon={<FileTextOutlined />}
          onClick={() => navigate('/app/sales-hub/invoices')}
        >
          Invoice
        </Button>
      ),
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
      {/* Stats */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Billable Hours"
              value={stats.totalBillable.toFixed(1)}
              suffix="h"
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#10b981' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Non-Billable Hours"
              value={stats.totalNonBillable.toFixed(1)}
              suffix="h"
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#64748b' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Work in Progress"
              value={stats.wipValue}
              prefix="R"
              valueStyle={{ color: '#667eea' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Utilization Rate"
              value={stats.totalBillable + stats.totalNonBillable > 0
                ? Math.round((stats.totalBillable / (stats.totalBillable + stats.totalNonBillable)) * 100) : 0}
              suffix="%"
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#f59e0b' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Project Billing Table */}
      <Card
        title={<><DollarOutlined /> Billing by Project</>}
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchData}>Refresh</Button>
            <Button type="primary" icon={<FileTextOutlined />} onClick={() => navigate('/app/sales-hub/invoices')}>
              Create Invoice <ArrowRightOutlined />
            </Button>
          </Space>
        }
      >
        <Table
          dataSource={projectBilling}
          columns={columns}
          rowKey={(r) => r.project_id || r.id || Math.random()}
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: 'No billable projects yet — log time against engagements first' }}
          summary={(data) => {
            const totalBillable = data.reduce((s, r) => s + r.billableHours, 0);
            const totalWIP = data.reduce((s, r) => s + r.wipAmount, 0);
            return data.length > 0 ? (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0}><Text strong>Totals</Text></Table.Summary.Cell>
                <Table.Summary.Cell index={1}><Text strong style={{ color: '#10b981' }}>{totalBillable.toFixed(1)}h</Text></Table.Summary.Cell>
                <Table.Summary.Cell index={2} />
                <Table.Summary.Cell index={3} />
                <Table.Summary.Cell index={4}><Text strong>R {totalWIP.toLocaleString('en-ZA')}</Text></Table.Summary.Cell>
                <Table.Summary.Cell index={5} />
                <Table.Summary.Cell index={6} />
              </Table.Summary.Row>
            ) : null;
          }}
        />
      </Card>
    </div>
  );
};

export default BillingPage;
