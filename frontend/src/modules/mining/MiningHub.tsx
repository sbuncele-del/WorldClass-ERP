import React, { useState, useEffect } from 'react';
import apiClient from '../../services/api';
import {
  Card,
  Row,
  Col,
  Table,
  Button,
  Tag,
  Space,
  Progress,
  Statistic,
  Badge,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Divider,
  Timeline,
  Alert,
  Tooltip,
  Switch,
  DatePicker,
  List,
  Avatar,
  Typography,
  Descriptions,
  Tabs,
} from 'antd';
import {
  HomeOutlined,
  SafetyCertificateOutlined,
  FileProtectOutlined,
  AlertOutlined,
  AuditOutlined,
  ExperimentOutlined,
  ToolOutlined,
  TeamOutlined,
  DollarOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  PlusOutlined,
  SyncOutlined,
  DownloadOutlined,
  SettingOutlined,
  DashboardOutlined,
  BarChartOutlined,
  LineChartOutlined,
  FundOutlined,
  BankOutlined,
  FileTextOutlined,
  LockOutlined,
  EyeOutlined,
  FireOutlined,
  ThunderboltOutlined,
  BugOutlined,
  MedicineBoxOutlined,
  CarOutlined,
  BuildOutlined,
  GoldOutlined,
  ContainerOutlined,
  DatabaseOutlined,
  NodeIndexOutlined,
  RadarChartOutlined,
  ProfileOutlined,
} from '@ant-design/icons';
import {
  HubLayout,
  HubHeader,
  StatusBanner,
  HubTabs,
} from '../../components/hub';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

// ===========================================
// SOUTH AFRICAN MINING REGULATORY FRAMEWORK
// ===========================================
// MPRDA - Mineral and Petroleum Resources Development Act
// MHSA - Mine Health and Safety Act
// SAMREC - South African Code for Reporting of Exploration Results
// SAMVAL - South African Code for Valuation of Mineral Assets
// DMR - Department of Mineral Resources compliance

const MiningHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [incidentModalVisible, setIncidentModalVisible] = useState(false);
  const [productionModalVisible, setProductionModalVisible] = useState(false);
  const [complianceModalVisible, setComplianceModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form] = Form.useForm();

  // Mining KPIs
  const [miningStats, setMiningStats] = useState({
    totalProduction: 0,
    goldRecovery: 0,
    operatingCosts: 0,
    safetyIncidents: 0,
    fatalityFreeShifts: 0,
    environmentalScore: 0,
    complianceScore: 0,
    employeeCount: 0
  });

  // Compliance Status - MPRDA, MHSA, Environmental
  const [complianceItems, setComplianceItems] = useState<any[]>([]);

  // Safety Incidents - MHSA Compliance
  const [safetyIncidents, setSafetyIncidents] = useState<any[]>([]);

  // Production Data - SAMREC Compliant
  const [productionData, setProductionData] = useState<any[]>([]);

  // Mineral Resources - SAMREC Compliant Reporting
  const [mineralResources, setMineralResources] = useState<any[]>([]);

  // Environmental Monitoring
  const [environmentalData, setEnvironmentalData] = useState<any[]>([]);

  // Workforce - MHSA & SLP Compliance
  const [workforceStats, setWorkforceStats] = useState({
    totalEmployees: 0,
    contractors: 0,
    hdsa: 0,
    women: 0,
    localCommunity: 0,
    trainingHours: 0
  });

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [statsRes, operationsRes, safetyRes, productionRes] = await Promise.all([
          apiClient.get('/api/mining/stats'),
          apiClient.get('/api/mining/operations'),
          apiClient.get('/api/mining/safety'),
          apiClient.get('/api/mining/production')
        ]);

        // Update stats
        if (statsRes.data) {
          setMiningStats(statsRes.data.stats || statsRes.data);
          if (statsRes.data.workforce) {
            setWorkforceStats(statsRes.data.workforce);
          }
        }

        // Update operations data
        if (operationsRes.data) {
          setComplianceItems(operationsRes.data.compliance || []);
          setMineralResources(operationsRes.data.resources || []);
          setEnvironmentalData(operationsRes.data.environmental || []);
        }

        // Update safety data
        if (safetyRes.data) {
          setSafetyIncidents(safetyRes.data.incidents || safetyRes.data || []);
        }

        // Update production data
        if (productionRes.data) {
          setProductionData(productionRes.data.production || productionRes.data || []);
        }
      } catch (error) {
        console.error('Error fetching mining data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Compliance columns
  const complianceColumns = [
    { title: 'ID', dataIndex: 'id', key: 'id' },
    { title: 'Regulation', dataIndex: 'regulation', key: 'regulation', render: (text: string) => <strong>{text}</strong> },
    { title: 'Reference', dataIndex: 'reference', key: 'reference', render: (ref: string) => <Tag>{ref}</Tag> },
    { title: 'Authority', dataIndex: 'authority', key: 'authority' },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (status: string) => (
      <Tag color={status === 'compliant' ? 'success' : status === 'attention' ? 'warning' : 'error'}>
        {status.toUpperCase()}
      </Tag>
    )},
    { title: 'Expiry', dataIndex: 'expiryDate', key: 'expiryDate' },
    { title: 'Next Audit', dataIndex: 'nextAudit', key: 'nextAudit' },
    { title: 'Actions', key: 'actions', render: () => (
      <Space>
        <Button size="small" icon={<EyeOutlined />}>View</Button>
        <Button size="small" icon={<DownloadOutlined />}>Docs</Button>
      </Space>
    )}
  ];

  // Safety columns
  const safetyColumns = [
    { title: 'Incident ID', dataIndex: 'id', key: 'id', render: (text: string) => <a>{text}</a> },
    { title: 'Date', dataIndex: 'date', key: 'date' },
    { title: 'Type', dataIndex: 'type', key: 'type', render: (type: string) => {
      const colors: Record<string, string> = { 'Fatality': 'red', 'LTI': 'orange', 'First Aid': 'blue', 'Near Miss': 'default' };
      return <Tag color={colors[type]}>{type}</Tag>;
    }},
    { title: 'Category', dataIndex: 'category', key: 'category' },
    { title: 'Severity', dataIndex: 'severity', key: 'severity', render: (sev: string) => (
      <Tag color={sev === 'high' ? 'red' : sev === 'medium' ? 'orange' : 'green'}>{sev.toUpperCase()}</Tag>
    )},
    { title: 'Location', dataIndex: 'location', key: 'location' },
    { title: 'DMR Reported', dataIndex: 'dmrReported', key: 'dmrReported', render: (reported: boolean) => (
      reported ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> : <ClockCircleOutlined style={{ color: '#faad14' }} />
    )},
    { title: 'Status', dataIndex: 'status', key: 'status', render: (status: string) => (
      <Tag color={status === 'closed' ? 'success' : status === 'investigating' ? 'processing' : 'warning'}>{status}</Tag>
    )},
    { title: 'Actions', key: 'actions', render: () => (
      <Space>
        <Button size="small">View</Button>
        <Button size="small">Report</Button>
      </Space>
    )}
  ];

  // Production columns
  const productionColumns = [
    { title: 'Date', dataIndex: 'date', key: 'date' },
    { title: 'Shaft', dataIndex: 'shaft', key: 'shaft', render: (s: string) => <Tag color="blue">{s}</Tag> },
    { title: 'Level', dataIndex: 'level', key: 'level' },
    { title: 'Tons Milled', dataIndex: 'tons', key: 'tons', render: (t: number) => t.toLocaleString() },
    { title: 'Grade (g/t)', dataIndex: 'grade', key: 'grade' },
    { title: 'Gold (oz)', dataIndex: 'goldOz', key: 'goldOz', render: (oz: number) => <strong>{oz.toLocaleString()}</strong> },
    { title: 'Recovery', dataIndex: 'recoveryRate', key: 'recoveryRate', render: (r: number) => (
      <Progress percent={r} size="small" status={r >= 94 ? 'success' : 'normal'} />
    )},
    { title: 'Status', dataIndex: 'status', key: 'status', render: (status: string) => (
      <Tag color={status === 'completed' ? 'success' : 'processing'}>{status === 'completed' ? 'Completed' : 'In Progress'}</Tag>
    )}
  ];

  // Resource columns (SAMREC)
  const resourceColumns = [
    { title: 'Category', dataIndex: 'category', key: 'category', render: (cat: string) => {
      const colors: Record<string, string> = { 'Measured': 'green', 'Indicated': 'blue', 'Inferred': 'orange' };
      return <Tag color={colors[cat]}>{cat}</Tag>;
    }},
    { title: 'Tonnage (Mt)', dataIndex: 'tons', key: 'tons', render: (t: number) => `${(t/1000000).toFixed(1)} Mt` },
    { title: 'Grade (g/t)', dataIndex: 'grade', key: 'grade' },
    { title: 'Contained Gold (koz)', dataIndex: 'goldOz', key: 'goldOz', render: (oz: number) => `${(oz/1000).toFixed(0)} koz` },
    { title: 'Confidence', dataIndex: 'confidence', key: 'confidence', render: (c: string) => (
      <Tag color={c === 'High' ? 'green' : c === 'Moderate' ? 'blue' : 'orange'}>{c}</Tag>
    )},
    { title: 'Competent Person', dataIndex: 'competentPerson', key: 'competentPerson' },
    { title: 'Last Update', dataIndex: 'lastUpdate', key: 'lastUpdate' }
  ];

  // Environmental columns
  const envColumns = [
    { title: 'Parameter', dataIndex: 'parameter', key: 'parameter', render: (p: string) => <strong>{p}</strong> },
    { title: 'Location', dataIndex: 'location', key: 'location' },
    { title: 'Value', dataIndex: 'value', key: 'value' },
    { title: 'Unit', dataIndex: 'unit', key: 'unit' },
    { title: 'Limit', dataIndex: 'limit', key: 'limit' },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (status: string) => (
      <Tag color={status === 'compliant' ? 'success' : 'error'}>{status.toUpperCase()}</Tag>
    )},
    { title: 'Trend', dataIndex: 'trend', key: 'trend', render: (trend: string) => (
      <Tag color={trend === 'improving' ? 'green' : trend === 'stable' ? 'blue' : 'red'}>{trend}</Tag>
    )}
  ];

  // Render Dashboard
  const renderDashboard = () => (
    <div style={{ padding: '24px' }}>
      {/* Safety First Banner */}
      <Alert
        message={<><SafetyCertificateOutlined /> Safety First - {miningStats.fatalityFreeShifts.toLocaleString()} Fatality-Free Shifts</>}
        description="MHSA Compliance: All personnel certified. Next safety drill scheduled for Dec 15, 2024."
        type="success"
        showIcon
        style={{ marginBottom: 24 }}
      />

      {/* KPI Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Production (MTD)"
              value={miningStats.totalProduction}
              suffix="tons"
              prefix={<GoldOutlined />}
              valueStyle={{ color: '#d4af37' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Gold Recovery"
              value={miningStats.goldRecovery}
              suffix="g/t"
              prefix={<ExperimentOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Compliance Score"
              value={miningStats.complianceScore}
              suffix="%"
              prefix={<FileProtectOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
            <Progress percent={miningStats.complianceScore} showInfo={false} strokeColor="#52c41a" />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Environmental Score"
              value={miningStats.environmentalScore}
              suffix="%"
              prefix={<EnvironmentOutlined />}
              valueStyle={{ color: '#13c2c2' }}
            />
            <Progress percent={miningStats.environmentalScore} showInfo={false} strokeColor="#13c2c2" />
          </Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]}>
        {/* Compliance Overview */}
        <Col xs={24} lg={16}>
          <Card title={<><FileProtectOutlined /> Regulatory Compliance Status</>} extra={<Button type="link">View All</Button>}>
            <Row gutter={[8, 8]} style={{ marginBottom: 16 }}>
              {complianceItems.slice(0, 4).map(item => (
                <Col span={6} key={item.id}>
                  <Card size="small" style={{ borderLeft: `4px solid ${item.status === 'compliant' ? '#52c41a' : '#faad14'}` }}>
                    <div style={{ fontSize: 12, color: '#666' }}>{item.regulation}</div>
                    <div style={{ marginTop: 4 }}>
                      <Tag color={item.status === 'compliant' ? 'success' : 'warning'}>{item.status}</Tag>
                    </div>
                    <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>Next: {item.nextAudit}</div>
                  </Card>
                </Col>
              ))}
            </Row>
            
            <Divider />
            
            {/* Recent Production */}
            <Title level={5}>Today's Production</Title>
            <Table 
              dataSource={productionData.filter(p => p.status === 'in_progress')} 
              columns={[
                { title: 'Shaft', dataIndex: 'shaft', key: 'shaft' },
                { title: 'Tons', dataIndex: 'tons', key: 'tons' },
                { title: 'Grade', dataIndex: 'grade', key: 'grade' },
                { title: 'Gold (oz)', dataIndex: 'goldOz', key: 'goldOz' },
                { title: 'Recovery', key: 'recovery', render: (_: unknown, r: typeof productionData[0]) => `${r.recoveryRate}%` }
              ]}
              rowKey={(r, i) => `${r.shaft}-${i}`}
              pagination={false}
              size="small"
            />
          </Card>
        </Col>

        {/* Quick Actions & Alerts */}
        <Col xs={24} lg={8}>
          <Card title="Quick Actions" style={{ marginBottom: 24 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button type="primary" icon={<AlertOutlined />} block onClick={() => setIncidentModalVisible(true)}>
                Report Incident
              </Button>
              <Button icon={<GoldOutlined />} block onClick={() => setProductionModalVisible(true)}>
                Log Production
              </Button>
              <Button icon={<AuditOutlined />} block onClick={() => setComplianceModalVisible(true)}>
                Compliance Check
              </Button>
              <Button icon={<DownloadOutlined />} block>
                DMR Reports
              </Button>
            </Space>
          </Card>

          <Card title="Safety Alerts">
            <Timeline
              items={[
                {
                  color: 'green',
                  children: (
                    <>
                      <div><strong>Section 54 Clear</strong></div>
                      <div style={{ fontSize: 12, color: '#999' }}>All shafts operational • 2 hours ago</div>
                    </>
                  )
                },
                {
                  color: 'blue',
                  children: (
                    <>
                      <div><strong>Safety Meeting</strong> completed</div>
                      <div style={{ fontSize: 12, color: '#999' }}>Shaft 1 - Day Shift • 6 hours ago</div>
                    </>
                  )
                },
                {
                  color: 'orange',
                  children: (
                    <>
                      <div><strong>Equipment inspection</strong> due</div>
                      <div style={{ fontSize: 12, color: '#999' }}>Winder - Shaft 2 • Tomorrow</div>
                    </>
                  )
                }
              ]}
            />
          </Card>
        </Col>
      </Row>

      {/* Financial Integration */}
      <Card 
        title={<><BankOutlined /> Financial Integration</>} 
        style={{ marginTop: 24 }}
        extra={<Button type="link">View GL Entries</Button>}
      >
        <Row gutter={24}>
          <Col span={6}>
            <Statistic title="Revenue (MTD)" value={125000000} prefix="R" valueStyle={{ color: '#52c41a' }} />
          </Col>
          <Col span={6}>
            <Statistic title="Operating Costs" value={miningStats.operatingCosts} prefix="R" suffix="/kg" valueStyle={{ color: '#ff4d4f' }} />
          </Col>
          <Col span={6}>
            <Statistic title="Rehabilitation Fund" value={45000000} prefix="R" />
          </Col>
          <Col span={6}>
            <Statistic title="Royalties Payable" value={8500000} prefix="R" valueStyle={{ color: '#722ed1' }} />
          </Col>
        </Row>
        <Alert
          message="Automatic Financial Postings"
          description="Production revenue posts to GL 4000, rehabilitation provisions to GL 2800 (IFRS compliant), and mining royalties to GL 5600"
          type="info"
          showIcon
          style={{ marginTop: 16 }}
        />
      </Card>
    </div>
  );

  // Render Compliance
  const renderCompliance = () => (
    <div style={{ padding: '24px' }}>
      <Alert
        message="MPRDA & MHSA Compliance Dashboard"
        description="All mining operations must comply with the Mineral and Petroleum Resources Development Act and Mine Health and Safety Act. Non-compliance may result in Section 54 stoppages."
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Card 
        title="Regulatory Compliance Status"
        extra={
          <Space>
            <Button icon={<DownloadOutlined />}>Export Report</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setComplianceModalVisible(true)}>
              Add Compliance Item
            </Button>
          </Space>
        }
      >
        <Table 
          dataSource={complianceItems} 
          columns={complianceColumns} 
          rowKey="id"
          pagination={false}
        />
      </Card>

      {/* Compliance Alerts */}
      <Row gutter={24} style={{ marginTop: 24 }}>
        <Col span={12}>
          <Card title="Upcoming Audits">
            <List
              size="small"
              dataSource={complianceItems.filter(c => new Date(c.nextAudit) < new Date('2025-06-01'))}
              renderItem={item => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<Avatar icon={<AuditOutlined />} style={{ backgroundColor: '#1890ff' }} />}
                    title={item.regulation}
                    description={`Due: ${item.nextAudit} • Authority: ${item.authority}`}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="Attention Required">
            {complianceItems.filter(c => c.status === 'attention').map(item => (
              <Alert
                key={item.id}
                message={item.regulation}
                description={`Reference: ${item.reference} - Review required before ${item.nextAudit}`}
                type="warning"
                showIcon
                style={{ marginBottom: 8 }}
              />
            ))}
            {complianceItems.filter(c => c.status === 'attention').length === 0 && (
              <Alert message="All compliance items in good standing" type="success" showIcon />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );

  // Render Safety
  const renderSafety = () => (
    <div style={{ padding: '24px' }}>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card style={{ background: '#f6ffed', border: '1px solid #b7eb8f' }}>
            <Statistic 
              title="Fatality-Free Shifts" 
              value={miningStats.fatalityFreeShifts} 
              valueStyle={{ color: '#52c41a' }}
              prefix={<SafetyCertificateOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title="LTIFR" 
              value={0.85} 
              suffix="per million hours"
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title="Incidents (MTD)" 
              value={miningStats.safetyIncidents} 
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title="Near Misses (MTD)" 
              value={8} 
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

      <Card 
        title="Safety Incidents - MHSA Reporting"
        extra={
          <Space>
            <Button icon={<DownloadOutlined />}>DMR Report</Button>
            <Button type="primary" danger icon={<AlertOutlined />} onClick={() => setIncidentModalVisible(true)}>
              Report Incident
            </Button>
          </Space>
        }
      >
        <Table 
          dataSource={safetyIncidents} 
          columns={safetyColumns} 
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* Safety Categories */}
      <Card title="Incident Categories (12 months)" style={{ marginTop: 24 }}>
        <Row gutter={24}>
          <Col span={6}>
            <Card size="small">
              <Statistic title="Fall of Ground" value={3} prefix={<WarningOutlined />} />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic title="Equipment" value={5} prefix={<ToolOutlined />} />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic title="Slip/Trip" value={8} prefix={<CarOutlined />} />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic title="Electrical" value={2} prefix={<ThunderboltOutlined />} />
            </Card>
          </Col>
        </Row>
      </Card>
    </div>
  );

  // Render Production
  const renderProduction = () => (
    <div style={{ padding: '24px' }}>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic title="Tons Milled (MTD)" value={miningStats.totalProduction} suffix="t" />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="Head Grade" value={miningStats.goldRecovery} suffix="g/t" valueStyle={{ color: '#d4af37' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="Gold Produced (MTD)" value={1868} suffix="oz" valueStyle={{ color: '#d4af37' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="Recovery Rate" value={94.2} suffix="%" valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
      </Row>

      <Card 
        title="Production Log"
        extra={
          <Space>
            <Button icon={<DownloadOutlined />}>Export</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setProductionModalVisible(true)}>
              Log Production
            </Button>
          </Space>
        }
      >
        <Table 
          dataSource={productionData} 
          columns={productionColumns} 
          rowKey={(r, i) => `${r.date}-${r.shaft}-${i}`}
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  );

  // Render Resources (SAMREC)
  const renderResources = () => (
    <div style={{ padding: '24px' }}>
      <Alert
        message="SAMREC Compliant Mineral Resource Statement"
        description="All mineral resource estimates comply with the South African Code for Reporting of Exploration Results, Mineral Resources and Mineral Reserves (SAMREC Code, 2016 Edition)"
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Card title="Mineral Resources (as at 30 September 2024)">
        <Table 
          dataSource={mineralResources} 
          columns={resourceColumns} 
          rowKey="category"
          pagination={false}
          summary={() => (
            <Table.Summary>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0}><strong>Total</strong></Table.Summary.Cell>
                <Table.Summary.Cell index={1}><strong>26.2 Mt</strong></Table.Summary.Cell>
                <Table.Summary.Cell index={2}><strong>4.2 g/t</strong></Table.Summary.Cell>
                <Table.Summary.Cell index={3}><strong>3,576 koz</strong></Table.Summary.Cell>
                <Table.Summary.Cell index={4}></Table.Summary.Cell>
                <Table.Summary.Cell index={5}></Table.Summary.Cell>
                <Table.Summary.Cell index={6}></Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          )}
        />
      </Card>

      <Card title="Competent Person Statement" style={{ marginTop: 24 }}>
        <Descriptions bordered column={2}>
          <Descriptions.Item label="Competent Person">J. van Wyk (Pr.Sci.Nat)</Descriptions.Item>
          <Descriptions.Item label="Registration">400123/08</Descriptions.Item>
          <Descriptions.Item label="Professional Body">SACNASP</Descriptions.Item>
          <Descriptions.Item label="Experience">25+ years in gold exploration</Descriptions.Item>
          <Descriptions.Item label="Sign-off Date" span={2}>30 September 2024</Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );

  // Render Environmental
  const renderEnvironmental = () => (
    <div style={{ padding: '24px' }}>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small" style={{ background: '#f6ffed' }}>
            <Statistic title="Environmental Score" value={miningStats.environmentalScore} suffix="%" valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="Water Recycled" value={85} suffix="%" />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="Rehabilitation Area" value={45} suffix="ha" />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="Carbon Offset" value={12500} suffix="t CO₂" />
          </Card>
        </Col>
      </Row>

      <Card title="Environmental Monitoring - EMP Compliance">
        <Table 
          dataSource={environmentalData} 
          columns={envColumns} 
          rowKey="parameter"
          pagination={false}
        />
      </Card>

      <Card title="Rehabilitation Trust Fund" style={{ marginTop: 24 }}>
        <Row gutter={24}>
          <Col span={8}>
            <Statistic title="Current Balance" value={45000000} prefix="R" />
          </Col>
          <Col span={8}>
            <Statistic title="Required Provision" value={42000000} prefix="R" />
          </Col>
          <Col span={8}>
            <Statistic title="Surplus" value={3000000} prefix="R" valueStyle={{ color: '#52c41a' }} />
          </Col>
        </Row>
        <Alert
          message="IFRS Compliant - IAS 37 Provisions"
          description="Rehabilitation provision calculated per DMRE guidelines and recognized as a liability with corresponding asset under IFRS"
          type="info"
          showIcon
          style={{ marginTop: 16 }}
        />
      </Card>
    </div>
  );

  // Render Settings
  const renderSettings = () => (
    <div style={{ padding: '24px' }}>
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={12}>
          <Card title="Compliance Settings">
            <Form layout="vertical">
              <Form.Item label="DMR Submission Mode">
                <Select defaultValue="electronic">
                  <Option value="electronic">Electronic (SAMRAD)</Option>
                  <Option value="manual">Manual Submission</Option>
                </Select>
              </Form.Item>
              <Form.Item label="Auto-generate Section 54 Alerts">
                <Switch defaultChecked />
              </Form.Item>
              <Form.Item label="Incident Reporting Threshold">
                <Select defaultValue="all">
                  <Option value="all">All Incidents</Option>
                  <Option value="lti">LTI and Above</Option>
                  <Option value="fatal">Fatalities Only</Option>
                </Select>
              </Form.Item>
              <Button type="primary">Save Settings</Button>
            </Form>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Financial Integration">
            <Form layout="vertical">
              <Form.Item label="Revenue Account">
                <Select defaultValue="4000">
                  <Option value="4000">4000 - Gold Sales Revenue</Option>
                  <Option value="4100">4100 - By-product Revenue</Option>
                </Select>
              </Form.Item>
              <Form.Item label="Rehabilitation Provision Account">
                <Select defaultValue="2800">
                  <Option value="2800">2800 - Environmental Provisions (IAS 37)</Option>
                </Select>
              </Form.Item>
              <Form.Item label="Royalties Account">
                <Select defaultValue="5600">
                  <Option value="5600">5600 - Mining Royalties</Option>
                </Select>
              </Form.Item>
              <Form.Item label="Auto-post to GL">
                <Switch defaultChecked />
              </Form.Item>
              <Button type="primary">Save Settings</Button>
            </Form>
          </Card>
        </Col>

        <Col xs={24}>
          <Card title="SAMREC Reporting">
            <Alert
              message="Competent Person Required"
              description="All mineral resource and reserve statements must be signed off by a registered Competent Person (SACNASP/ECSA) in accordance with SAMREC Code requirements"
              type="warning"
              showIcon
            />
          </Card>
        </Col>
      </Row>
    </div>
  );

  return (
    <HubLayout>
      <HubHeader
        title="Mining Hub"
        subtitle="MPRDA & MHSA Compliant Mining Operations Management"
        icon={<GoldOutlined />}
        gradient="red"
        actions={
          <>
            <Button icon={<SyncOutlined />}>Refresh</Button>
            <Button icon={<DownloadOutlined />}>DMR Reports</Button>
            <Button type="primary" danger icon={<AlertOutlined />} onClick={() => setIncidentModalVisible(true)}>
              Report Incident
            </Button>
          </>
        }
      />

      <StatusBanner
        gradient="red"
        icon={<SafetyCertificateOutlined />}
        title="Operations Overview"
        subtitle={`${miningStats.fatalityFreeShifts.toLocaleString()} Fatality-Free Shifts`}
        stats={[
          { title: 'Production (t)', value: miningStats.totalProduction.toLocaleString(), span: 4 },
          { title: 'Grade (g/t)', value: miningStats.goldRecovery.toString(), span: 4 },
          { title: 'Compliance', value: `${miningStats.complianceScore}%`, valueStyle: { color: '#86efac' }, span: 4 },
          { title: 'Environmental', value: `${miningStats.environmentalScore}%`, span: 4 },
          { title: 'Employees', value: miningStats.employeeCount.toLocaleString(), span: 4 },
        ]}
      />

      <HubTabs 
        theme="red"
        tabs={[
          { key: 'dashboard', label: 'Dashboard', icon: <HomeOutlined />, children: renderDashboard() },
          { key: 'compliance', label: 'Compliance', icon: <FileProtectOutlined />, children: renderCompliance() },
          { key: 'safety', label: 'Safety', icon: <SafetyCertificateOutlined />, children: renderSafety() },
          { key: 'production', label: 'Production', icon: <GoldOutlined />, children: renderProduction() },
          { key: 'resources', label: 'Resources', icon: <DatabaseOutlined />, children: renderResources() },
          { key: 'environmental', label: 'Environmental', icon: <EnvironmentOutlined />, children: renderEnvironmental() },
          { key: 'settings', label: 'Settings', icon: <SettingOutlined />, children: renderSettings() }
        ]}
        activeKey={activeTab}
        onChange={setActiveTab}
      />

      {/* Incident Report Modal */}
      <Modal
        title={<><AlertOutlined style={{ color: '#ff4d4f' }} /> Report Safety Incident</>}
        open={incidentModalVisible}
        onCancel={() => setIncidentModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setIncidentModalVisible(false)}>Cancel</Button>,
          <Button key="draft">Save Draft</Button>,
          <Button key="submit" type="primary" danger>Submit to DMR</Button>
        ]}
        width={700}
      >
        <Alert
          message="MHSA Section 23 Reporting"
          description="All incidents must be reported to the DMR within 24 hours as per MHSA requirements"
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Incident Type" name="type" rules={[{ required: true }]}>
                <Select placeholder="Select type">
                  <Option value="fatality">Fatality</Option>
                  <Option value="lti">Lost Time Injury (LTI)</Option>
                  <Option value="firstaid">First Aid</Option>
                  <Option value="nearmiss">Near Miss</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Category" name="category" rules={[{ required: true }]}>
                <Select placeholder="Select category">
                  <Option value="fog">Fall of Ground</Option>
                  <Option value="equipment">Equipment</Option>
                  <Option value="electrical">Electrical</Option>
                  <Option value="slip">Slip/Trip/Fall</Option>
                  <Option value="fire">Fire/Explosion</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Location" name="location" rules={[{ required: true }]}>
                <Input placeholder="e.g., Shaft 2 - Level 45" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Date & Time" name="datetime" rules={[{ required: true }]}>
                <DatePicker showTime style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Description" name="description" rules={[{ required: true }]}>
            <Input.TextArea rows={4} placeholder="Detailed description of the incident..." />
          </Form.Item>
          <Form.Item label="Immediate Actions Taken" name="actions">
            <Input.TextArea rows={2} placeholder="Actions taken immediately after the incident..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Production Log Modal */}
      <Modal
        title="Log Production"
        open={productionModalVisible}
        onCancel={() => setProductionModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setProductionModalVisible(false)}>Cancel</Button>,
          <Button key="submit" type="primary">Submit</Button>
        ]}
        width={600}
      >
        <Form layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Shaft" name="shaft" rules={[{ required: true }]}>
                <Select placeholder="Select shaft">
                  <Option value="shaft1">Shaft 1</Option>
                  <Option value="shaft2">Shaft 2</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Level" name="level" rules={[{ required: true }]}>
                <Input placeholder="e.g., 42-45" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="Tons Milled" name="tons" rules={[{ required: true }]}>
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Head Grade (g/t)" name="grade" rules={[{ required: true }]}>
                <InputNumber min={0} step={0.1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Recovery (%)" name="recovery">
                <InputNumber min={0} max={100} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Compliance Check Modal */}
      <Modal
        title="Add Compliance Item"
        open={complianceModalVisible}
        onCancel={() => setComplianceModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setComplianceModalVisible(false)}>Cancel</Button>,
          <Button key="submit" type="primary">Add Item</Button>
        ]}
        width={600}
      >
        <Form layout="vertical">
          <Form.Item label="Regulation" name="regulation" rules={[{ required: true }]}>
            <Select placeholder="Select regulation">
              <Option value="mprda">MPRDA Mining Right</Option>
              <Option value="mhsa">MHSA Certificate</Option>
              <Option value="emp">Environmental Management Plan</Option>
              <Option value="wul">Water Use License</Option>
              <Option value="slp">Social & Labour Plan</Option>
            </Select>
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Reference Number" name="reference" rules={[{ required: true }]}>
                <Input placeholder="e.g., MR-2021/0045" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Authority" name="authority" rules={[{ required: true }]}>
                <Select placeholder="Select authority">
                  <Option value="dmr">DMR</Option>
                  <Option value="dws">DWS</Option>
                  <Option value="dtic">dtic</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Expiry Date" name="expiry">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Next Audit Date" name="nextAudit">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </HubLayout>
  );
};

export default MiningHub;
