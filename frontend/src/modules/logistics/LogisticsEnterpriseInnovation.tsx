import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Card, Col, Row, Statistic, Tag, Table, Typography, Space, Alert, Button, Progress, Skeleton, List } from 'antd';
import { ThunderboltOutlined, RocketOutlined, ExperimentOutlined, FundOutlined } from '@ant-design/icons';
import EnterpriseLayout from '../../components/layout/EnterpriseLayout';
import { useFeatureFlags } from '../../contexts/FeatureFlagContext';
import logisticsEnterpriseAPI from '../../services/logisticsEnterprise.api';
import { customColors } from '../../theme/antd.theme';
import './logistics-enterprise.css';

const { Title, Text } = Typography;

interface TransportationPlanSummary {
  plan_id: string;
  plan_number: string;
  plan_type: string;
  status: string;
  service_level_target: number;
  updated_at: string;
}

interface YardOverviewResponse {
  zones: Array<{ zone_id: string; zone_name: string; zone_type: string; capacity: number; slots: any[] }>;
  recentMovements: any[];
}

interface BenchmarkSnapshot {
  throughputPerDispatcher: { ours: number; sap: number; oracle: number; dynamics: number };
  planningLatencyMinutes: { ours: number; sap: number; oracle: number; dynamics: number };
  revenueRecognitionLagMinutes: { ours: number; sap: number; oracle: number; dynamics: number };
  aiRouteAccuracy: { ours: number; sap: number; oracle: number; dynamics: number };
  carbonOptimizationPercent: { ours: number; sap: number; oracle: number; dynamics: number };
  lastValidatedAt: string;
}

const LogisticsEnterpriseInnovation: React.FC = () => {
  const featureFlags = useFeatureFlags();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<TransportationPlanSummary[]>([]);
  const [yard, setYard] = useState<YardOverviewResponse | null>(null);
  const [benchmarks, setBenchmarks] = useState<BenchmarkSnapshot | null>(null);
  const [error, setError] = useState<string>();

  const tabs = [
    { id: 'dashboard', label: '🎯 Dashboard', path: '/logistics/dashboard' },
    { id: 'enterprise', label: '🚀 Enterprise AI', path: '/logistics/enterprise' },
    { id: 'fleet', label: '🚛 Fleet', path: '/logistics/fleet' },
    { id: 'drivers', label: '👨‍✈️ Drivers', path: '/logistics/drivers' },
    { id: 'trips', label: '🚚 Trips', path: '/logistics/trips' },
    { id: 'planner', label: '📋 Load Planner', path: '/logistics/planner' },
    { id: 'routes', label: '🗺️ Routes', path: '/logistics/routes' },
    { id: 'incidents', label: '⚠️ Incidents', path: '/logistics/incidents' },
    { id: 'geofences', label: '📍 Geofences', path: '/logistics/geofences' },
    { id: 'fuel', label: '⛽ Fuel', path: '/logistics/fuel' },
    { id: 'reports', label: '📊 Reports', path: '/logistics/reports' },
  ];

  const breadcrumbs = [
    { label: 'Home', path: '/' },
    { label: 'Logistics', path: '/logistics' },
    { label: 'Enterprise AI' },
  ];

  const featureMatrix = useMemo(
    () => [
      {
        name: 'Advanced Transportation Management',
        key: 'logistics_atms',
        sap: 'Premium Add-on (TM)',
        oracle: 'Oracle OTM Cloud',
        dynamics: 'ISV Extension',
      },
      {
        name: 'Yard + Dock Digital Twin',
        key: 'logistics_yard_management',
        sap: 'Yard Logistics (extra license)',
        oracle: 'Not native',
        dynamics: 'Manual spreadsheets',
      },
      {
        name: 'Freight Audit & Carrier Scorecards',
        key: 'logistics_freight_audit',
        sap: 'Consulting project',
        oracle: 'Limited rules',
        dynamics: '3rd-party vendor',
      },
      {
        name: 'Revenue Recognition on Delivery',
        key: 'logistics_delivery_revenue',
        sap: 'Finance integration',
        oracle: 'Manual GL job',
        dynamics: 'Not available',
      },
      {
        name: 'AI Route Optimization',
        key: 'logistics_ai_route_optimization',
        sap: 'Rule engine only',
        oracle: 'External optimization',
        dynamics: 'Not provided',
      },
    ],
    []
  );

  const loadEnterpriseData = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const requests: Promise<void>[] = [];

      if (featureFlags.isEnabled('logistics_atms')) {
        requests.push(
          logisticsEnterpriseAPI.listTransportationPlans().then((data) => {
            setPlans(data.plans || []);
          })
        );
      }

      if (featureFlags.isEnabled('logistics_yard_management')) {
        requests.push(
          logisticsEnterpriseAPI
            .getYardOverview({ includeMovements: true })
            .then((data) => setYard(data))
        );
      }

      requests.push(
        logisticsEnterpriseAPI.getBenchmarks().then((data) => setBenchmarks(data))
      );

      await Promise.all(requests);
    } catch (err: any) {
      console.error('Failed to load enterprise data', err);
      setError(err?.message || 'Failed to load enterprise data');
    } finally {
      setLoading(false);
    }
  }, [featureFlags.flags]);

  useEffect(() => {
    loadEnterpriseData();
  }, [loadEnterpriseData]);

  const renderFeatureStatus = (key: string) => (
    <Tag color={featureFlags.isEnabled(key) ? 'green' : 'default'}>
      {featureFlags.isEnabled(key) ? 'Enabled' : 'Upgrade Available'}
    </Tag>
  );

  const parityColumns = [
    {
      title: 'Innovation Area',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: { key: string }) => (
        <Space>
          <Text strong>{text}</Text>
          {renderFeatureStatus(record.key)}
        </Space>
      ),
    },
    { title: 'SAP S/4HANA', dataIndex: 'sap', key: 'sap' },
    { title: 'Oracle NetSuite/OTM', dataIndex: 'oracle', key: 'oracle' },
    { title: 'Microsoft Dynamics 365', dataIndex: 'dynamics', key: 'dynamics' },
    {
      title: 'WorldClass ERP',
      key: 'ours',
      render: (_: unknown, record: { key: string }) => (
        <Text type={featureFlags.isEnabled(record.key) ? 'success' : 'secondary'}>
          {featureFlags.isEnabled(record.key) ? 'Activated' : 'Flagged'}
        </Text>
      ),
    },
  ];

  const upgradeItems = Object.entries(featureFlags.upgradePaths).map(([key, note]) => ({
    key,
    note,
    enabled: featureFlags.isEnabled(key),
  }));

  return (
    <EnterpriseLayout
      moduleTitle="Enterprise Logistics"
      moduleSubtitle="SAP/Oracle/Dynamics parity with AI-native differentiators"
      tabs={tabs}
      breadcrumbs={breadcrumbs}
      actionButtons={[
        {
          label: 'Re-run Benchmarks',
          icon: <ThunderboltOutlined />,
          variant: 'secondary',
          onClick: () => {
            loadEnterpriseData();
            featureFlags.refresh();
          },
        },
      ]}
    >
      <div className="logistics-page-content">
        {error && <Alert type="error" message={error} showIcon closable style={{ marginBottom: 16 }} />}

        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Card>
              <Space align="center">
                <RocketOutlined style={{ fontSize: 32, color: customColors.gradient.primary }} />
                <div>
                  <Title level={4}>AI-Native Coverage</Title>
                  <Text>{featureFlags.featureCount} / {Object.keys(featureFlags.upgradePaths).length} enterprise levers active</Text>
                </div>
              </Space>
              <Progress
                percent={Math.round(
                  (featureFlags.featureCount / Math.max(1, Object.keys(featureFlags.upgradePaths).length)) * 100
                )}
                strokeColor={customColors.gradient.primary}
                style={{ marginTop: 16 }}
              />
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card>
              <Space align="center">
                <ExperimentOutlined style={{ fontSize: 32, color: customColors.gradient.secondary }} />
                <div>
                  <Title level={4}>Innovation Readiness</Title>
                  <Text>Tenant Plan: {featureFlags.tenantPlan || 'Unknown'}</Text>
                </div>
              </Space>
            </Card>
          </Col>
        </Row>

        <Card className="logistics-section" title="ERP Parity Matrix">
          {loading ? (
            <Skeleton active />
          ) : (
            <Table
              columns={parityColumns}
              dataSource={featureMatrix}
              pagination={false}
              rowKey="name"
            />
          )}
        </Card>

        {featureFlags.isEnabled('logistics_atms') && (
          <Card className="logistics-section" title="Advanced Transportation Plans">
            {loading ? (
              <Skeleton active />
            ) : (
              <Table
                columns={[
                  { title: 'Plan #', dataIndex: 'plan_number', key: 'plan_number' },
                  { title: 'Type', dataIndex: 'plan_type', key: 'plan_type' },
                  { title: 'Status', dataIndex: 'status', key: 'status' },
                  {
                    title: 'SLA Target',
                    dataIndex: 'service_level_target',
                    key: 'service_level_target',
                    render: (value: number) => `${value}%`,
                  },
                  { title: 'Updated', dataIndex: 'updated_at', key: 'updated_at' },
                ]}
                dataSource={plans}
                rowKey="plan_id"
                pagination={{ pageSize: 5 }}
              />
            )}
          </Card>
        )}

        {featureFlags.isEnabled('logistics_yard_management') && yard && (
          <Card className="logistics-section" title="Yard Digital Twin">
            <Row gutter={[16, 16]}>
              {yard.zones.map((zone) => (
                <Col xs={24} md={12} lg={8} key={zone.zone_id}>
                  <Card size="small">
                    <Title level={5}>{zone.zone_name}</Title>
                    <Text type="secondary">{zone.zone_type} · Capacity {zone.capacity}</Text>
                    <Progress
                      percent={Math.round(
                        ((zone.slots || []).filter((slot) => slot.slot_status === 'OCCUPIED').length /
                          Math.max((zone.slots || []).length, 1)) *
                          100
                      )}
                      strokeColor={customColors.gradient.primary}
                      style={{ marginTop: 8 }}
                    />
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>
        )}

        {benchmarks && (
          <Card className="logistics-section" title="Performance Benchmarks vs SAP S/4HANA">
            <Row gutter={[16, 16]}>
              <Col xs={24} md={12} lg={6}>
                <Statistic
                  title="Trips / Dispatcher"
                  value={benchmarks.throughputPerDispatcher.ours}
                  suffix={(benchmarks.throughputPerDispatcher.ours - benchmarks.throughputPerDispatcher.sap).toFixed(0) + ' vs SAP'}
                  prefix={<FundOutlined />}
                />
              </Col>
              <Col xs={24} md={12} lg={6}>
                <Statistic
                  title="Planning Latency"
                  value={benchmarks.planningLatencyMinutes.ours}
                  suffix={`min (< SAP ${benchmarks.planningLatencyMinutes.sap})`}
                />
              </Col>
              <Col xs={24} md={12} lg={6}>
                <Statistic
                  title="Revenue Recognition Lag"
                  value={benchmarks.revenueRecognitionLagMinutes.ours}
                  suffix={`min vs SAP ${benchmarks.revenueRecognitionLagMinutes.sap}`}
                />
              </Col>
              <Col xs={24} md={12} lg={6}>
                <Statistic
                  title="AI Route Accuracy"
                  value={benchmarks.aiRouteAccuracy.ours}
                  suffix="%"
                />
              </Col>
            </Row>
            <Text type="secondary">Validated: {new Date(benchmarks.lastValidatedAt).toLocaleString()}</Text>
          </Card>
        )}

        <Card className="logistics-section" title="Upgrade Paths">
          <List
            dataSource={upgradeItems}
            renderItem={(item) => (
              <List.Item actions={[renderFeatureStatus(item.key)]}>
                <List.Item.Meta
                  title={item.key.replace('logistics_', '').replace(/_/g, ' ').toUpperCase()}
                  description={item.note}
                />
              </List.Item>
            )}
          />
        </Card>

        {!featureFlags.isEnabled('logistics_process_genome') && (
          <Alert
            type="info"
            showIcon
            message="Process Genome Locked"
            description="Enable the Process Genome feature to activate AI-native orchestration that none of SAP/Oracle/Dynamics provide natively."
            action={<Button type="primary">Talk to Sales</Button>}
          />
        )}
      </div>
    </EnterpriseLayout>
  );
};

export default LogisticsEnterpriseInnovation;
