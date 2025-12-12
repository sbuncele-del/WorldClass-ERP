/**
 * ConstructionHub - Construction Industry Management
 * 
 * Features:
 * - Project Costing & BOQ (Bills of Quantities)
 * - CIDB Compliance (Construction Industry Development Board)
 * - Subcontractor Management
 * - Site Progress Tracking
 * - Variation Orders
 * - Retention Management
 * - Payment Certificates
 * - Health & Safety Compliance
 * - BBBEE Scoring
 * - Financial Integration (Contract Revenue IAS 15)
 */

import React, { useState } from 'react';
import {
  Card, Row, Col, Statistic, Progress, Table, Tag, Button, Space, Badge,
  Input, Select, DatePicker, Modal, Form, Typography, Avatar,
  Timeline, Descriptions, Tooltip, Dropdown, InputNumber, Switch, Alert,
  List, Tabs, Divider, Steps, Upload, message, Collapse
} from 'antd';
import {
  HomeOutlined, TeamOutlined, CalendarOutlined, ClockCircleOutlined,
  DollarOutlined, BarChartOutlined, CheckCircleOutlined, WarningOutlined,
  PlusOutlined, SearchOutlined, FilterOutlined, ExportOutlined,
  SettingOutlined, SyncOutlined, FlagOutlined, SafetyCertificateOutlined,
  UserOutlined, BellOutlined, ThunderboltOutlined, ToolOutlined,
  AuditOutlined, BankOutlined, RocketOutlined, BuildOutlined,
  EyeOutlined, EditOutlined, DeleteOutlined, MoreOutlined, FileProtectOutlined,
  FileDoneOutlined, TrophyOutlined, PieChartOutlined, LineChartOutlined,
  EnvironmentOutlined, AlertOutlined, ContainerOutlined, ScheduleOutlined,
  SolutionOutlined, ProfileOutlined, CarOutlined, FileTextOutlined,
  CalculatorOutlined
} from '@ant-design/icons';
import { HubLayout, HubHeader, StatusBanner, HubTabs } from '../../components/hub';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { TextArea } = Input;
const { Panel } = Collapse;

// Interfaces
interface ConstructionProject {
  id: string;
  name: string;
  code: string;
  client: string;
  site: string;
  status: 'tender' | 'awarded' | 'active' | 'practical-completion' | 'final-completion' | 'defects-liability';
  cidbGrade: string;
  contractType: 'JBCC' | 'NEC' | 'FIDIC' | 'GCC';
  contractValue: number;
  currentValue: number; // Including variations
  certified: number;
  retention: number;
  startDate: string;
  practicalCompletion: string;
  finalCompletion: string;
  progress: number;
  principalAgent: string;
  siteAgent: string;
}

interface BOQItem {
  id: string;
  section: string;
  itemNo: string;
  description: string;
  unit: string;
  quantity: number;
  rate: number;
  amount: number;
  completed: number;
  percentComplete: number;
}

interface Subcontractor {
  id: string;
  name: string;
  cidbGrade: string;
  trade: string;
  bbbeeLevel: number;
  contractValue: number;
  certified: number;
  retentionHeld: number;
  status: 'active' | 'complete' | 'terminated';
  contact: string;
  email: string;
}

interface PaymentCertificate {
  id: string;
  project: string;
  certNo: number;
  period: string;
  grossAmount: number;
  retention: number;
  previousCertified: number;
  thisCertificate: number;
  vatAmount: number;
  totalDue: number;
  status: 'draft' | 'submitted' | 'approved' | 'paid';
  submittedDate?: string;
  approvedDate?: string;
  paidDate?: string;
}

interface VariationOrder {
  id: string;
  project: string;
  voNumber: string;
  description: string;
  type: 'addition' | 'omission';
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  submittedDate: string;
  approvedDate?: string;
  instructedBy: string;
}

// Sample Data
const sampleProjects: ConstructionProject[] = [
  {
    id: 'CON-001',
    name: 'Mall of Africa Extension Phase 2',
    code: 'MOA-EXT-P2',
    client: 'Attacq Limited',
    site: 'Waterfall City, Midrand',
    status: 'active',
    cidbGrade: '9CE',
    contractType: 'JBCC',
    contractValue: 250000000,
    currentValue: 268500000,
    certified: 134250000,
    retention: 13425000,
    startDate: '2024-01-15',
    practicalCompletion: '2025-06-30',
    finalCompletion: '2025-12-31',
    progress: 52,
    principalAgent: 'MDS Architecture',
    siteAgent: 'Michael Ndlovu'
  },
  {
    id: 'CON-002',
    name: 'N1 Highway Upgrade - Polokwane',
    code: 'N1-POL-UPG',
    client: 'SANRAL',
    site: 'N1 Highway, Limpopo',
    status: 'active',
    cidbGrade: '9CE',
    contractType: 'GCC',
    contractValue: 480000000,
    currentValue: 495000000,
    certified: 297000000,
    retention: 29700000,
    startDate: '2023-06-01',
    practicalCompletion: '2025-12-31',
    finalCompletion: '2026-06-30',
    progress: 62,
    principalAgent: 'SANRAL Engineering',
    siteAgent: 'Thabo Mthembu'
  },
  {
    id: 'CON-003',
    name: 'Cape Town Convention Centre Expansion',
    code: 'CTICC-EXP',
    client: 'City of Cape Town',
    site: 'Foreshore, Cape Town',
    status: 'tender',
    cidbGrade: '9GB',
    contractType: 'FIDIC',
    contractValue: 180000000,
    currentValue: 180000000,
    certified: 0,
    retention: 0,
    startDate: '2024-09-01',
    practicalCompletion: '2026-03-31',
    finalCompletion: '2026-09-30',
    progress: 0,
    principalAgent: 'dhk Architects',
    siteAgent: 'TBA'
  },
  {
    id: 'CON-004',
    name: 'Sandton Office Tower',
    code: 'SDT-OFC-01',
    client: 'Growthpoint Properties',
    site: 'Sandton CBD',
    status: 'practical-completion',
    cidbGrade: '9GB',
    contractType: 'JBCC',
    contractValue: 320000000,
    currentValue: 335000000,
    certified: 318250000,
    retention: 31825000,
    startDate: '2022-03-01',
    practicalCompletion: '2024-06-15',
    finalCompletion: '2024-12-15',
    progress: 98,
    principalAgent: 'Paragon Architects',
    siteAgent: 'David Mokoena'
  }
];

const sampleBOQ: BOQItem[] = [
  { id: 'BOQ-001', section: 'Preliminaries', itemNo: '1.1', description: 'Site establishment', unit: 'Item', quantity: 1, rate: 2500000, amount: 2500000, completed: 1, percentComplete: 100 },
  { id: 'BOQ-002', section: 'Preliminaries', itemNo: '1.2', description: 'Site management', unit: 'Month', quantity: 18, rate: 450000, amount: 8100000, completed: 9, percentComplete: 50 },
  { id: 'BOQ-003', section: 'Earthworks', itemNo: '2.1', description: 'Bulk excavation', unit: 'm³', quantity: 45000, rate: 85, amount: 3825000, completed: 45000, percentComplete: 100 },
  { id: 'BOQ-004', section: 'Earthworks', itemNo: '2.2', description: 'Fill and compaction', unit: 'm³', quantity: 12000, rate: 120, amount: 1440000, completed: 10800, percentComplete: 90 },
  { id: 'BOQ-005', section: 'Concrete', itemNo: '3.1', description: 'Foundations - 35MPa concrete', unit: 'm³', quantity: 2500, rate: 2800, amount: 7000000, completed: 2500, percentComplete: 100 },
  { id: 'BOQ-006', section: 'Concrete', itemNo: '3.2', description: 'Suspended slabs - 30MPa concrete', unit: 'm³', quantity: 8500, rate: 3200, amount: 27200000, completed: 5100, percentComplete: 60 },
  { id: 'BOQ-007', section: 'Steel', itemNo: '4.1', description: 'Structural steel', unit: 'Ton', quantity: 1200, rate: 28000, amount: 33600000, completed: 720, percentComplete: 60 },
  { id: 'BOQ-008', section: 'Brickwork', itemNo: '5.1', description: 'Face brick walls', unit: 'm²', quantity: 15000, rate: 850, amount: 12750000, completed: 6000, percentComplete: 40 }
];

const sampleSubcontractors: Subcontractor[] = [
  { id: 'SUB-001', name: 'Concrete Solutions SA', cidbGrade: '7CE', trade: 'Concrete Works', bbbeeLevel: 1, contractValue: 35000000, certified: 21000000, retentionHeld: 2100000, status: 'active', contact: 'James Botha', email: 'james@concretesa.co.za' },
  { id: 'SUB-002', name: 'Steelcraft Engineering', cidbGrade: '6ME', trade: 'Structural Steel', bbbeeLevel: 2, contractValue: 28000000, certified: 16800000, retentionHeld: 1680000, status: 'active', contact: 'Peter Steyn', email: 'peter@steelcraft.co.za' },
  { id: 'SUB-003', name: 'Electrical Installations (Pty) Ltd', cidbGrade: '6EB', trade: 'Electrical', bbbeeLevel: 1, contractValue: 22000000, certified: 8800000, retentionHeld: 880000, status: 'active', contact: 'Johan Meyer', email: 'johan@elecinstall.co.za' },
  { id: 'SUB-004', name: 'Plumbing Masters', cidbGrade: '5EP', trade: 'Plumbing', bbbeeLevel: 3, contractValue: 12000000, certified: 4800000, retentionHeld: 480000, status: 'active', contact: 'David Nkosi', email: 'david@plumbingmasters.co.za' },
  { id: 'SUB-005', name: 'Brick & Block Contractors', cidbGrade: '6GB', trade: 'Masonry', bbbeeLevel: 1, contractValue: 18000000, certified: 7200000, retentionHeld: 720000, status: 'active', contact: 'Sipho Dlamini', email: 'sipho@brickblock.co.za' }
];

const sampleCertificates: PaymentCertificate[] = [
  { id: 'CERT-001', project: 'CON-001', certNo: 12, period: 'May 2024', grossAmount: 18500000, retention: 1850000, previousCertified: 115750000, thisCertificate: 16650000, vatAmount: 2497500, totalDue: 19147500, status: 'approved', submittedDate: '2024-06-05', approvedDate: '2024-06-12' },
  { id: 'CERT-002', project: 'CON-001', certNo: 13, period: 'June 2024', grossAmount: 15200000, retention: 1520000, previousCertified: 132400000, thisCertificate: 13680000, vatAmount: 2052000, totalDue: 15732000, status: 'submitted', submittedDate: '2024-07-05' },
  { id: 'CERT-003', project: 'CON-002', certNo: 18, period: 'June 2024', grossAmount: 22000000, retention: 2200000, previousCertified: 275000000, thisCertificate: 19800000, vatAmount: 2970000, totalDue: 22770000, status: 'draft' }
];

const sampleVariations: VariationOrder[] = [
  { id: 'VO-001', project: 'CON-001', voNumber: 'VO-001', description: 'Additional parking basement level', type: 'addition', amount: 12500000, status: 'approved', submittedDate: '2024-03-15', approvedDate: '2024-04-01', instructedBy: 'Principal Agent' },
  { id: 'VO-002', project: 'CON-001', voNumber: 'VO-002', description: 'Upgraded facade cladding', type: 'addition', amount: 6000000, status: 'approved', submittedDate: '2024-05-10', approvedDate: '2024-05-25', instructedBy: 'Client' },
  { id: 'VO-003', project: 'CON-002', voNumber: 'VO-001', description: 'Additional lane widening', type: 'addition', amount: 15000000, status: 'pending', submittedDate: '2024-06-01', instructedBy: 'Engineer' },
  { id: 'VO-004', project: 'CON-001', voNumber: 'VO-003', description: 'Omission of water feature', type: 'omission', amount: -2500000, status: 'approved', submittedDate: '2024-04-20', approvedDate: '2024-05-05', instructedBy: 'Client' }
];

const ConstructionHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [projectModalVisible, setProjectModalVisible] = useState(false);
  const [certificateModalVisible, setCertificateModalVisible] = useState(false);
  const [variationModalVisible, setVariationModalVisible] = useState(false);
  const [projects] = useState<ConstructionProject[]>(sampleProjects);
  const [boqItems] = useState<BOQItem[]>(sampleBOQ);
  const [subcontractors] = useState<Subcontractor[]>(sampleSubcontractors);
  const [certificates] = useState<PaymentCertificate[]>(sampleCertificates);
  const [variations] = useState<VariationOrder[]>(sampleVariations);
  const [form] = Form.useForm();

  // Calculate stats
  const constructionStats = {
    totalProjects: projects.length,
    activeProjects: projects.filter(p => p.status === 'active').length,
    totalContractValue: projects.reduce((sum, p) => sum + p.contractValue, 0),
    totalCurrentValue: projects.reduce((sum, p) => sum + p.currentValue, 0),
    totalCertified: projects.reduce((sum, p) => sum + p.certified, 0),
    totalRetention: projects.reduce((sum, p) => sum + p.retention, 0),
    pendingCertificates: certificates.filter(c => c.status === 'submitted').length,
    pendingVariations: variations.filter(v => v.status === 'pending').length
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      tender: 'blue', awarded: 'cyan', active: 'green',
      'practical-completion': 'orange', 'final-completion': 'purple', 
      'defects-liability': 'gold'
    };
    return colors[status] || 'default';
  };

  // Dashboard
  const renderDashboard = () => (
    <div style={{ padding: '24px' }}>
      {/* Key Metrics */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Contract Value"
              value={constructionStats.totalContractValue}
              prefix="R"
              valueStyle={{ color: '#1890ff' }}
              formatter={(value) => `${(Number(value) / 1000000000).toFixed(2)}B`}
            />
            <Text type="secondary">{constructionStats.activeProjects} active projects</Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Certified to Date"
              value={constructionStats.totalCertified}
              prefix="R"
              valueStyle={{ color: '#52c41a' }}
              formatter={(value) => `${(Number(value) / 1000000).toFixed(0)}M`}
            />
            <Progress percent={Math.round((constructionStats.totalCertified / constructionStats.totalCurrentValue) * 100)} showInfo={false} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Retention Held"
              value={constructionStats.totalRetention}
              prefix="R"
              valueStyle={{ color: '#faad14' }}
              formatter={(value) => `${(Number(value) / 1000000).toFixed(1)}M`}
            />
            <Text type="secondary">10% of certified</Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Pending Approvals"
              value={constructionStats.pendingCertificates + constructionStats.pendingVariations}
              prefix={<AlertOutlined />}
              valueStyle={{ color: constructionStats.pendingCertificates > 0 ? '#ff4d4f' : '#52c41a' }}
            />
            <Text type="secondary">{constructionStats.pendingCertificates} certs, {constructionStats.pendingVariations} VOs</Text>
          </Card>
        </Col>
      </Row>

      {/* CIDB Compliance Alert */}
      <Alert
        message="CIDB Compliance Status"
        description={
          <Space>
            <Tag color="green">Registration: Valid until Dec 2025</Tag>
            <Tag color="green">Grade 9CE: Active</Tag>
            <Tag color="green">Grade 9GB: Active</Tag>
            <Tag color="blue">BBBEE Level 1</Tag>
          </Space>
        }
        type="success"
        showIcon
        icon={<SafetyCertificateOutlined />}
        style={{ marginTop: 16, marginBottom: 16 }}
      />

      {/* Active Projects */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card 
            title={<><BuildOutlined /> Active Projects</>}
            extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setProjectModalVisible(true)}>New Project</Button>}
          >
            <Table
              dataSource={projects.filter(p => ['active', 'practical-completion'].includes(p.status))}
              rowKey="id"
              size="small"
              pagination={false}
              columns={[
                {
                  title: 'Project',
                  key: 'project',
                  render: (_, record) => (
                    <div>
                      <Text strong>{record.name}</Text>
                      <br />
                      <Space size="small">
                        <Tag>{record.code}</Tag>
                        <Tag color="purple">CIDB {record.cidbGrade}</Tag>
                        <Tag color="blue">{record.contractType}</Tag>
                      </Space>
                    </div>
                  )
                },
                {
                  title: 'Progress',
                  dataIndex: 'progress',
                  key: 'progress',
                  width: 120,
                  render: (progress: number) => (
                    <Progress percent={progress} size="small" />
                  )
                },
                {
                  title: 'Contract Value',
                  key: 'value',
                  render: (_, record) => (
                    <div>
                      <Text>R{(record.currentValue / 1000000).toFixed(1)}M</Text>
                      {record.currentValue !== record.contractValue && (
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          <br />Original: R{(record.contractValue / 1000000).toFixed(1)}M
                        </Text>
                      )}
                    </div>
                  )
                },
                {
                  title: 'Certified',
                  key: 'certified',
                  render: (_, record) => (
                    <Text type="success">R{(record.certified / 1000000).toFixed(1)}M</Text>
                  )
                },
                {
                  title: 'Completion',
                  dataIndex: 'practicalCompletion',
                  key: 'practicalCompletion',
                  render: (date: string) => <Tag icon={<CalendarOutlined />}>{date}</Tag>
                }
              ]}
            />
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title={<><FileTextOutlined /> Pending Actions</>}>
            <List
              size="small"
              dataSource={[
                { type: 'certificate', title: 'Payment Certificate #13', project: 'MOA-EXT-P2', status: 'Awaiting Approval', color: 'orange' },
                { type: 'variation', title: 'VO-001: Lane Widening', project: 'N1-POL-UPG', status: 'Pending Review', color: 'blue' },
                { type: 'safety', title: 'Monthly H&S Inspection', project: 'All Sites', status: 'Due in 3 days', color: 'red' },
                { type: 'retention', title: 'Retention Release', project: 'SDT-OFC-01', status: 'Due at Final Completion', color: 'green' }
              ]}
              renderItem={item => (
                <List.Item>
                  <div style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text strong>{item.title}</Text>
                      <Tag color={item.color}>{item.status}</Tag>
                    </div>
                    <Text type="secondary" style={{ fontSize: 12 }}>{item.project}</Text>
                  </div>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      {/* Cash Flow */}
      <Card title={<><DollarOutlined /> Cash Flow Summary</>} style={{ marginTop: 16 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic title="Outstanding Claims" value={35412000} prefix="R" formatter={(v) => `${(Number(v)/1000000).toFixed(1)}M`} />
          </Col>
          <Col span={6}>
            <Statistic title="Retention Held (by us)" value={constructionStats.totalRetention} prefix="R" formatter={(v) => `${(Number(v)/1000000).toFixed(1)}M`} />
          </Col>
          <Col span={6}>
            <Statistic title="Subcontractor Retention" value={5860000} prefix="R" formatter={(v) => `${(Number(v)/1000000).toFixed(1)}M`} />
          </Col>
          <Col span={6}>
            <Statistic title="Net Cash Position" value={28500000} prefix="R" valueStyle={{ color: '#52c41a' }} formatter={(v) => `${(Number(v)/1000000).toFixed(1)}M`} />
          </Col>
        </Row>
      </Card>

      {/* WIP Accounting - IAS 11 / IFRS 15 Construction Contracts */}
      <Card 
        title={<><CalculatorOutlined /> Work in Progress (WIP) Accounting</>} 
        style={{ marginTop: 16 }}
        extra={<Tag color="blue">IAS 11 / IFRS 15</Tag>}
      >
        <Alert
          message="WIP Recognition Method: Percentage of Completion"
          description="Revenue and costs are recognized based on certified progress. WIP represents costs incurred in excess of certified amounts (unbilled revenue) or certified amounts in excess of costs (deferred revenue)."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={16}>
            <Table
              dataSource={projects.filter(p => p.status === 'active')}
              rowKey="id"
              size="small"
              pagination={false}
              columns={[
                {
                  title: 'Project',
                  key: 'project',
                  render: (_, record) => (
                    <div>
                      <Text strong>{record.code}</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 11 }}>{record.name}</Text>
                    </div>
                  )
                },
                {
                  title: 'Contract Value',
                  dataIndex: 'currentValue',
                  key: 'currentValue',
                  render: (value: number) => <Text>R{(value / 1000000).toFixed(1)}M</Text>
                },
                {
                  title: 'Costs Incurred',
                  key: 'costsIncurred',
                  render: (_, record) => {
                    // Simulate costs at ~85% of certified amount
                    const costsIncurred = record.certified * 0.85;
                    return <Text>R{(costsIncurred / 1000000).toFixed(1)}M</Text>;
                  }
                },
                {
                  title: 'Revenue Certified',
                  key: 'certified',
                  render: (_, record) => <Text type="success">R{(record.certified / 1000000).toFixed(1)}M</Text>
                },
                {
                  title: 'WIP Balance',
                  key: 'wip',
                  render: (_, record) => {
                    const costsIncurred = record.certified * 0.85;
                    const wipBalance = costsIncurred - record.certified;
                    return (
                      <Text type={wipBalance > 0 ? 'warning' : 'success'}>
                        R{(Math.abs(wipBalance) / 1000000).toFixed(2)}M
                        {wipBalance > 0 ? ' (Unbilled)' : ' (Deferred)'}
                      </Text>
                    );
                  }
                },
                {
                  title: 'GL Account',
                  key: 'gl',
                  render: () => <Tag>1300 - WIP</Tag>
                }
              ]}
              summary={() => {
                const totalCosts = projects.filter(p => p.status === 'active').reduce((sum, p) => sum + p.certified * 0.85, 0);
                const totalCertified = projects.filter(p => p.status === 'active').reduce((sum, p) => sum + p.certified, 0);
                const totalWIP = totalCosts - totalCertified;
                return (
                  <Table.Summary fixed>
                    <Table.Summary.Row style={{ background: '#fafafa' }}>
                      <Table.Summary.Cell index={0}><Text strong>TOTAL</Text></Table.Summary.Cell>
                      <Table.Summary.Cell index={1} />
                      <Table.Summary.Cell index={2}><Text strong>R{(totalCosts / 1000000).toFixed(1)}M</Text></Table.Summary.Cell>
                      <Table.Summary.Cell index={3}><Text strong type="success">R{(totalCertified / 1000000).toFixed(1)}M</Text></Table.Summary.Cell>
                      <Table.Summary.Cell index={4}>
                        <Text strong type={totalWIP > 0 ? 'warning' : 'success'}>
                          R{(Math.abs(totalWIP) / 1000000).toFixed(2)}M
                        </Text>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={5} />
                    </Table.Summary.Row>
                  </Table.Summary>
                );
              }}
            />
          </Col>
          <Col xs={24} lg={8}>
            <Card size="small" title="WIP Journal Entries">
              <Timeline
                items={[
                  {
                    color: 'blue',
                    children: (
                      <div>
                        <Text strong>Record Costs Incurred</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>DR: WIP (1300)</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>CR: Materials/Labour</Text>
                      </div>
                    )
                  },
                  {
                    color: 'green',
                    children: (
                      <div>
                        <Text strong>Progress Certification</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>DR: Accounts Receivable</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>CR: WIP (1300)</Text>
                      </div>
                    )
                  },
                  {
                    color: 'orange',
                    children: (
                      <div>
                        <Text strong>Revenue Recognition</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>DR: Cost of Sales</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>CR: Revenue</Text>
                      </div>
                    )
                  }
                ]}
              />
            </Card>
            <Card size="small" title="WIP Aging" style={{ marginTop: 8 }}>
              <Progress percent={60} size="small" format={() => 'Current: R258M'} />
              <Progress percent={25} size="small" status="active" format={() => '30-60 days: R108M'} style={{ marginTop: 8 }} />
              <Progress percent={15} size="small" status="exception" format={() => '60+ days: R64M'} style={{ marginTop: 8 }} />
            </Card>
          </Col>
        </Row>
      </Card>
    </div>
  );

  // Projects List
  const renderProjects = () => (
    <div style={{ padding: '24px' }}>
      <Card
        title="Construction Projects"
        extra={
          <Space>
            <Input placeholder="Search..." prefix={<SearchOutlined />} style={{ width: 200 }} />
            <Select defaultValue="all" style={{ width: 150 }}>
              <Option value="all">All Status</Option>
              <Option value="tender">Tender</Option>
              <Option value="active">Active</Option>
              <Option value="practical-completion">Practical Completion</Option>
            </Select>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setProjectModalVisible(true)}>
              New Project
            </Button>
          </Space>
        }
      >
        <Table
          dataSource={projects}
          rowKey="id"
          columns={[
            {
              title: 'Project',
              key: 'project',
              render: (_, record) => (
                <div>
                  <Text strong>{record.name}</Text>
                  <br />
                  <Space size="small">
                    <Tag>{record.code}</Tag>
                    <Tag color="purple">CIDB {record.cidbGrade}</Tag>
                  </Space>
                </div>
              )
            },
            {
              title: 'Client',
              key: 'client',
              render: (_, record) => (
                <div>
                  <Text>{record.client}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}><EnvironmentOutlined /> {record.site}</Text>
                </div>
              )
            },
            {
              title: 'Status',
              dataIndex: 'status',
              key: 'status',
              render: (status: string) => <Tag color={getStatusColor(status)}>{status.toUpperCase().replace('-', ' ')}</Tag>
            },
            {
              title: 'Contract',
              key: 'contract',
              render: (_, record) => (
                <div>
                  <Text strong>R{(record.currentValue / 1000000).toFixed(1)}M</Text>
                  <br />
                  <Tag>{record.contractType}</Tag>
                </div>
              )
            },
            {
              title: 'Progress',
              dataIndex: 'progress',
              key: 'progress',
              render: (progress: number) => <Progress percent={progress} size="small" style={{ width: 100 }} />
            },
            {
              title: 'Certified',
              key: 'certified',
              render: (_, record) => (
                <div>
                  <Text type="success">R{(record.certified / 1000000).toFixed(1)}M</Text>
                  <Progress 
                    percent={Math.round((record.certified / record.currentValue) * 100)} 
                    size="small" 
                    showInfo={false}
                    style={{ width: 80 }}
                  />
                </div>
              )
            },
            {
              title: 'Practical Completion',
              dataIndex: 'practicalCompletion',
              key: 'practicalCompletion'
            },
            {
              title: 'Actions',
              key: 'actions',
              render: () => (
                <Dropdown
                  menu={{
                    items: [
                      { key: 'view', label: 'View Details', icon: <EyeOutlined /> },
                      { key: 'boq', label: 'View BOQ', icon: <ProfileOutlined /> },
                      { key: 'certificates', label: 'Payment Certificates', icon: <FileDoneOutlined /> },
                      { key: 'variations', label: 'Variation Orders', icon: <FileTextOutlined /> },
                      { type: 'divider' },
                      { key: 'progress', label: 'Update Progress', icon: <BarChartOutlined /> }
                    ]
                  }}
                >
                  <Button icon={<MoreOutlined />} />
                </Dropdown>
              )
            }
          ]}
        />
      </Card>
    </div>
  );

  // BOQ Management
  const renderBOQ = () => (
    <div style={{ padding: '24px' }}>
      <Card
        title={<><ProfileOutlined /> Bills of Quantities</>}
        extra={
          <Space>
            <Select defaultValue="CON-001" style={{ width: 300 }}>
              {projects.map(p => <Option key={p.id} value={p.id}>{p.name}</Option>)}
            </Select>
            <Button icon={<ExportOutlined />}>Export to Excel</Button>
            <Button type="primary" icon={<PlusOutlined />}>Add Item</Button>
          </Space>
        }
      >
        <Alert
          message="BOQ Progress Summary"
          description={
            <Row gutter={16}>
              <Col span={6}><Statistic title="Total Items" value={boqItems.length} /></Col>
              <Col span={6}><Statistic title="Contract Sum" value={boqItems.reduce((sum, i) => sum + i.amount, 0)} prefix="R" formatter={(v) => `${(Number(v)/1000000).toFixed(1)}M`} /></Col>
              <Col span={6}><Statistic title="Completed Value" value={boqItems.reduce((sum, i) => sum + (i.amount * i.percentComplete / 100), 0)} prefix="R" formatter={(v) => `${(Number(v)/1000000).toFixed(1)}M`} /></Col>
              <Col span={6}><Statistic title="Overall Progress" value={Math.round(boqItems.reduce((sum, i) => sum + i.percentComplete, 0) / boqItems.length)} suffix="%" /></Col>
            </Row>
          }
          type="info"
          style={{ marginBottom: 16 }}
        />

        <Collapse defaultActiveKey={['Preliminaries', 'Earthworks', 'Concrete']}>
          {['Preliminaries', 'Earthworks', 'Concrete', 'Steel', 'Brickwork'].map(section => (
            <Panel 
              header={
                <Space>
                  <Text strong>{section}</Text>
                  <Tag>R{(boqItems.filter(i => i.section === section).reduce((sum, i) => sum + i.amount, 0) / 1000000).toFixed(1)}M</Tag>
                  <Progress 
                    percent={Math.round(boqItems.filter(i => i.section === section).reduce((sum, i) => sum + i.percentComplete, 0) / boqItems.filter(i => i.section === section).length || 0)} 
                    size="small" 
                    style={{ width: 100 }}
                  />
                </Space>
              } 
              key={section}
            >
              <Table
                dataSource={boqItems.filter(i => i.section === section)}
                rowKey="id"
                size="small"
                pagination={false}
                columns={[
                  { title: 'Item No', dataIndex: 'itemNo', key: 'itemNo', width: 80 },
                  { title: 'Description', dataIndex: 'description', key: 'description' },
                  { title: 'Unit', dataIndex: 'unit', key: 'unit', width: 60 },
                  { title: 'Qty', dataIndex: 'quantity', key: 'quantity', width: 80, render: (q: number) => q.toLocaleString() },
                  { title: 'Rate', dataIndex: 'rate', key: 'rate', width: 100, render: (r: number) => `R${r.toLocaleString()}` },
                  { title: 'Amount', dataIndex: 'amount', key: 'amount', width: 120, render: (a: number) => `R${a.toLocaleString()}` },
                  { title: 'Completed', dataIndex: 'completed', key: 'completed', width: 80, render: (c: number) => c.toLocaleString() },
                  { 
                    title: '% Complete', 
                    dataIndex: 'percentComplete', 
                    key: 'percentComplete', 
                    width: 120,
                    render: (p: number) => <Progress percent={p} size="small" />
                  }
                ]}
              />
            </Panel>
          ))}
        </Collapse>
      </Card>
    </div>
  );

  // Payment Certificates
  const renderCertificates = () => (
    <div style={{ padding: '24px' }}>
      <Card
        title={<><FileDoneOutlined /> Payment Certificates</>}
        extra={
          <Space>
            <Select defaultValue="all" style={{ width: 200 }}>
              <Option value="all">All Projects</Option>
              {projects.map(p => <Option key={p.id} value={p.id}>{p.name}</Option>)}
            </Select>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCertificateModalVisible(true)}>
              New Certificate
            </Button>
          </Space>
        }
      >
        <Table
          dataSource={certificates}
          rowKey="id"
          columns={[
            { 
              title: 'Certificate', 
              key: 'cert',
              render: (_, record) => (
                <div>
                  <Text strong>Certificate #{record.certNo}</Text>
                  <br />
                  <Text type="secondary">{record.period}</Text>
                </div>
              )
            },
            { title: 'Project', dataIndex: 'project', key: 'project' },
            { 
              title: 'Gross Amount', 
              dataIndex: 'grossAmount', 
              key: 'grossAmount',
              render: (amount: number) => `R${(amount / 1000000).toFixed(2)}M`
            },
            { 
              title: 'Retention', 
              dataIndex: 'retention', 
              key: 'retention',
              render: (amount: number) => <Text type="warning">-R{(amount / 1000000).toFixed(2)}M</Text>
            },
            { 
              title: 'This Certificate', 
              dataIndex: 'thisCertificate', 
              key: 'thisCertificate',
              render: (amount: number) => <Text strong>R{(amount / 1000000).toFixed(2)}M</Text>
            },
            { 
              title: 'VAT', 
              dataIndex: 'vatAmount', 
              key: 'vatAmount',
              render: (amount: number) => `R${(amount / 1000000).toFixed(2)}M`
            },
            { 
              title: 'Total Due', 
              dataIndex: 'totalDue', 
              key: 'totalDue',
              render: (amount: number) => <Text strong type="success">R{(amount / 1000000).toFixed(2)}M</Text>
            },
            {
              title: 'Status',
              dataIndex: 'status',
              key: 'status',
              render: (status: string) => {
                const colors: Record<string, string> = { draft: 'default', submitted: 'processing', approved: 'success', paid: 'green' };
                return <Tag color={colors[status]}>{status.toUpperCase()}</Tag>;
              }
            },
            {
              title: 'Actions',
              key: 'actions',
              render: (_, record) => (
                <Space>
                  <Button size="small" icon={<EyeOutlined />} />
                  <Button size="small" icon={<ExportOutlined />} />
                  {record.status === 'draft' && <Button size="small" type="primary">Submit</Button>}
                </Space>
              )
            }
          ]}
        />
      </Card>
    </div>
  );

  // Subcontractors
  const renderSubcontractors = () => (
    <div style={{ padding: '24px' }}>
      <Card
        title={<><TeamOutlined /> Subcontractor Management</>}
        extra={
          <Space>
            <Input placeholder="Search..." prefix={<SearchOutlined />} style={{ width: 200 }} />
            <Button type="primary" icon={<PlusOutlined />}>Add Subcontractor</Button>
          </Space>
        }
      >
        <Alert
          message="BBBEE Subcontractor Spend"
          description={
            <Row gutter={16}>
              <Col span={6}><Statistic title="Level 1-4 Spend" value={85} suffix="%" valueStyle={{ color: '#52c41a' }} /></Col>
              <Col span={6}><Statistic title="Target" value={80} suffix="%" /></Col>
              <Col span={6}><Statistic title="EME/QSE Spend" value={32} suffix="%" valueStyle={{ color: '#1890ff' }} /></Col>
              <Col span={6}><Statistic title="Black-Owned" value={45} suffix="%" /></Col>
            </Row>
          }
          type="success"
          showIcon
          icon={<TrophyOutlined />}
          style={{ marginBottom: 16 }}
        />

        <Table
          dataSource={subcontractors}
          rowKey="id"
          columns={[
            {
              title: 'Subcontractor',
              key: 'sub',
              render: (_, record) => (
                <div>
                  <Text strong>{record.name}</Text>
                  <br />
                  <Space size="small">
                    <Tag color="purple">CIDB {record.cidbGrade}</Tag>
                    <Tag color={record.bbbeeLevel <= 2 ? 'green' : record.bbbeeLevel <= 4 ? 'blue' : 'orange'}>
                      Level {record.bbbeeLevel}
                    </Tag>
                  </Space>
                </div>
              )
            },
            { title: 'Trade', dataIndex: 'trade', key: 'trade' },
            { 
              title: 'Contract Value', 
              dataIndex: 'contractValue', 
              key: 'contractValue',
              render: (value: number) => `R${(value / 1000000).toFixed(1)}M`
            },
            { 
              title: 'Certified', 
              dataIndex: 'certified', 
              key: 'certified',
              render: (value: number) => <Text type="success">R{(value / 1000000).toFixed(1)}M</Text>
            },
            { 
              title: 'Retention Held', 
              dataIndex: 'retentionHeld', 
              key: 'retentionHeld',
              render: (value: number) => <Text type="warning">R{(value / 1000).toFixed(0)}K</Text>
            },
            {
              title: 'Status',
              dataIndex: 'status',
              key: 'status',
              render: (status: string) => <Tag color={status === 'active' ? 'green' : status === 'complete' ? 'blue' : 'red'}>{status}</Tag>
            },
            {
              title: 'Contact',
              key: 'contact',
              render: (_, record) => (
                <div>
                  <Text>{record.contact}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 11 }}>{record.email}</Text>
                </div>
              )
            },
            {
              title: 'Actions',
              key: 'actions',
              render: () => (
                <Space>
                  <Button size="small" icon={<EyeOutlined />} />
                  <Button size="small" icon={<FileDoneOutlined />}>Certificate</Button>
                </Space>
              )
            }
          ]}
        />
      </Card>
    </div>
  );

  // Variations
  const renderVariations = () => (
    <div style={{ padding: '24px' }}>
      <Card
        title={<><FileTextOutlined /> Variation Orders</>}
        extra={
          <Space>
            <Select defaultValue="all" style={{ width: 200 }}>
              <Option value="all">All Projects</Option>
              {projects.map(p => <Option key={p.id} value={p.id}>{p.name}</Option>)}
            </Select>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setVariationModalVisible(true)}>
              New Variation
            </Button>
          </Space>
        }
      >
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card size="small">
              <Statistic title="Total Additions" value={variations.filter(v => v.type === 'addition' && v.status === 'approved').reduce((sum, v) => sum + v.amount, 0)} prefix="R" valueStyle={{ color: '#52c41a' }} formatter={(v) => `${(Number(v)/1000000).toFixed(1)}M`} />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic title="Total Omissions" value={Math.abs(variations.filter(v => v.type === 'omission' && v.status === 'approved').reduce((sum, v) => sum + v.amount, 0))} prefix="R" valueStyle={{ color: '#ff4d4f' }} formatter={(v) => `${(Number(v)/1000000).toFixed(1)}M`} />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic title="Net Variation" value={variations.filter(v => v.status === 'approved').reduce((sum, v) => sum + v.amount, 0)} prefix="R" valueStyle={{ color: '#1890ff' }} formatter={(v) => `${(Number(v)/1000000).toFixed(1)}M`} />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic title="Pending Approval" value={variations.filter(v => v.status === 'pending').length} valueStyle={{ color: '#faad14' }} />
            </Card>
          </Col>
        </Row>

        <Table
          dataSource={variations}
          rowKey="id"
          columns={[
            { title: 'VO Number', dataIndex: 'voNumber', key: 'voNumber' },
            { title: 'Project', dataIndex: 'project', key: 'project' },
            { title: 'Description', dataIndex: 'description', key: 'description' },
            {
              title: 'Type',
              dataIndex: 'type',
              key: 'type',
              render: (type: string) => <Tag color={type === 'addition' ? 'green' : 'red'}>{type.toUpperCase()}</Tag>
            },
            {
              title: 'Amount',
              dataIndex: 'amount',
              key: 'amount',
              render: (amount: number) => (
                <Text style={{ color: amount >= 0 ? '#52c41a' : '#ff4d4f' }}>
                  {amount >= 0 ? '+' : ''}R{(amount / 1000000).toFixed(2)}M
                </Text>
              )
            },
            {
              title: 'Status',
              dataIndex: 'status',
              key: 'status',
              render: (status: string) => {
                const colors: Record<string, string> = { pending: 'processing', approved: 'success', rejected: 'error' };
                return <Tag color={colors[status]}>{status.toUpperCase()}</Tag>;
              }
            },
            { title: 'Instructed By', dataIndex: 'instructedBy', key: 'instructedBy' },
            { title: 'Submitted', dataIndex: 'submittedDate', key: 'submittedDate' },
            {
              title: 'Actions',
              key: 'actions',
              render: (_, record) => (
                <Space>
                  <Button size="small" icon={<EyeOutlined />} />
                  {record.status === 'pending' && (
                    <>
                      <Button size="small" type="primary">Approve</Button>
                      <Button size="small" danger>Reject</Button>
                    </>
                  )}
                </Space>
              )
            }
          ]}
        />
      </Card>
    </div>
  );

  // Health & Safety
  const renderSafety = () => (
    <div style={{ padding: '24px' }}>
      <Alert
        message="Health & Safety Status"
        description="All sites compliant with OHS Act. Next audit due: 15 July 2024"
        type="success"
        showIcon
        icon={<SafetyCertificateOutlined />}
        style={{ marginBottom: 16 }}
      />

      <Row gutter={[16, 16]}>
        <Col span={8}>
          <Card>
            <Statistic title="Days Without LTI" value={245} valueStyle={{ color: '#52c41a' }} />
            <Text type="secondary">Lost Time Injury Free</Text>
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="Near Misses (MTD)" value={3} valueStyle={{ color: '#faad14' }} />
            <Text type="secondary">All investigated</Text>
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="Safety Score" value={96} suffix="%" valueStyle={{ color: '#52c41a' }} />
            <Progress percent={96} showInfo={false} strokeColor="#52c41a" />
          </Card>
        </Col>
      </Row>

      <Card title="Site Safety Inspections" style={{ marginTop: 16 }}>
        <Table
          dataSource={[
            { site: 'MOA-EXT-P2', lastInspection: '2024-06-08', score: 95, issues: 2, status: 'compliant' },
            { site: 'N1-POL-UPG', lastInspection: '2024-06-05', score: 92, issues: 4, status: 'compliant' },
            { site: 'SDT-OFC-01', lastInspection: '2024-06-10', score: 98, issues: 0, status: 'compliant' }
          ]}
          rowKey="site"
          columns={[
            { title: 'Site', dataIndex: 'site', key: 'site' },
            { title: 'Last Inspection', dataIndex: 'lastInspection', key: 'lastInspection' },
            { title: 'Score', dataIndex: 'score', key: 'score', render: (s: number) => <Progress percent={s} size="small" style={{ width: 100 }} /> },
            { title: 'Open Issues', dataIndex: 'issues', key: 'issues', render: (i: number) => <Tag color={i === 0 ? 'green' : 'orange'}>{i}</Tag> },
            { title: 'Status', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color="green">{s.toUpperCase()}</Tag> },
            { title: 'Actions', key: 'actions', render: () => <Button size="small">View Report</Button> }
          ]}
        />
      </Card>
    </div>
  );

  // Settings
  const renderSettings = () => (
    <div style={{ padding: '24px' }}>
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={12}>
          <Card title={<><SafetyCertificateOutlined /> CIDB Registration</>}>
            <Form layout="vertical">
              <Form.Item label="CIDB Registration Number">
                <Input defaultValue="CIDB-12345678" />
              </Form.Item>
              <Form.Item label="Grading">
                <Select mode="multiple" defaultValue={['9CE', '9GB']}>
                  <Option value="9CE">Grade 9 CE (Civil Engineering)</Option>
                  <Option value="9GB">Grade 9 GB (General Building)</Option>
                  <Option value="8ME">Grade 8 ME (Mechanical Engineering)</Option>
                  <Option value="7EB">Grade 7 EB (Electrical Building)</Option>
                </Select>
              </Form.Item>
              <Form.Item label="Expiry Date">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
              <Button type="primary">Update Registration</Button>
            </Form>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Financial Integration">
            <Form layout="vertical">
              <Form.Item label="Contract Revenue Account">
                <Select defaultValue="4000">
                  <Option value="4000">4000 - Contract Revenue</Option>
                  <Option value="4100">4100 - Construction Revenue</Option>
                </Select>
              </Form.Item>
              <Form.Item label="WIP Account">
                <Select defaultValue="1300">
                  <Option value="1300">1300 - Work in Progress</Option>
                  <Option value="1310">1310 - Construction WIP</Option>
                </Select>
              </Form.Item>
              <Form.Item label="Retention Receivable">
                <Select defaultValue="1150">
                  <Option value="1150">1150 - Retention Receivable</Option>
                </Select>
              </Form.Item>
              <Form.Item label="Retention Payable">
                <Select defaultValue="2150">
                  <Option value="2150">2150 - Retention Payable</Option>
                </Select>
              </Form.Item>
              <Button type="primary">Save Settings</Button>
            </Form>
          </Card>
        </Col>

        <Col xs={24}>
          <Card title="Default Contract Terms">
            <Form layout="vertical">
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item label="Default Retention %">
                    <InputNumber defaultValue={10} min={0} max={15} formatter={v => `${v}%`} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="Retention Release at PC">
                    <InputNumber defaultValue={50} min={0} max={100} formatter={v => `${v}%`} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="Defects Liability Period">
                    <Select defaultValue="12">
                      <Option value="6">6 Months</Option>
                      <Option value="12">12 Months</Option>
                      <Option value="24">24 Months</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </Card>
        </Col>
      </Row>
    </div>
  );

  return (
    <HubLayout>
      <HubHeader
        title="Construction Hub"
        subtitle="Project Costing, BOQ & Contract Management"
        icon={<BuildOutlined />}
        gradient="orange"
        actions={
          <>
            <Button icon={<SyncOutlined />}>Refresh</Button>
            <Button icon={<ExportOutlined />}>Export</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setProjectModalVisible(true)}>
              New Project
            </Button>
          </>
        }
      />

      <StatusBanner
        gradient="orange"
        icon={<BuildOutlined />}
        title="Portfolio Overview"
        subtitle="Contract Value & Progress"
        stats={[
          { title: 'Contract Value', value: `R${(constructionStats.totalCurrentValue / 1000000000).toFixed(2)}B`, span: 4 },
          { title: 'Certified', value: `R${(constructionStats.totalCertified / 1000000).toFixed(0)}M`, valueStyle: { color: '#86efac' }, span: 4 },
          { title: 'Active Projects', value: constructionStats.activeProjects, span: 4 },
          { title: 'Retention Held', value: `R${(constructionStats.totalRetention / 1000000).toFixed(1)}M`, span: 4 },
          { title: 'Pending', value: `${constructionStats.pendingCertificates} Certs`, span: 4 },
        ]}
      />

      <HubTabs
        theme="orange"
        tabs={[
          { key: 'dashboard', label: 'Dashboard', icon: <HomeOutlined />, children: renderDashboard() },
          { key: 'projects', label: 'Projects', icon: <BuildOutlined />, children: renderProjects() },
          { key: 'boq', label: 'BOQ', icon: <ProfileOutlined />, children: renderBOQ() },
          { key: 'certificates', label: 'Certificates', icon: <FileDoneOutlined />, children: renderCertificates() },
          { key: 'subcontractors', label: 'Subcontractors', icon: <TeamOutlined />, children: renderSubcontractors() },
          { key: 'variations', label: 'Variations', icon: <FileTextOutlined />, children: renderVariations() },
          { key: 'safety', label: 'H&S', icon: <SafetyCertificateOutlined />, children: renderSafety() },
          { key: 'settings', label: 'Settings', icon: <SettingOutlined />, children: renderSettings() }
        ]}
        activeKey={activeTab}
        onChange={setActiveTab}
      />

      {/* Modals would go here */}
    </HubLayout>
  );
};

export default ConstructionHub;
