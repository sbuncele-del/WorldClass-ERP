/**
 * ProposalsHub - Unified Proposals & Quotations Interface
 * 
 * Features:
 * - Proposal Dashboard with Pipeline
 * - Template Library
 * - Pricing Library
 * - E-Signature Integration
 * - Client Portal
 * - Analytics & Win Rate
 * - Financial Integration
 */

import React, { useState } from 'react';
import {
  Card, Row, Col, Statistic, Progress, Table, Tag, Button, Space, Badge,
  Input, Select, DatePicker, Modal, Form, Typography, Avatar,
  Timeline, Descriptions, Tooltip, Dropdown, InputNumber, Switch, Alert,
  List, Tabs, Divider, Steps, Upload, message, Checkbox
} from 'antd';
import {
  FileTextOutlined, TeamOutlined, CalendarOutlined, ClockCircleOutlined,
  DollarOutlined, BarChartOutlined, CheckCircleOutlined, WarningOutlined,
  PlusOutlined, SearchOutlined, FilterOutlined, ExportOutlined,
  SettingOutlined, SyncOutlined, FlagOutlined, SendOutlined,
  UserOutlined, BellOutlined, ThunderboltOutlined, CopyOutlined,
  SafetyCertificateOutlined, AuditOutlined, BankOutlined, RocketOutlined,
  EyeOutlined, EditOutlined, DeleteOutlined, MoreOutlined, HomeOutlined,
  FileDoneOutlined, TrophyOutlined, PieChartOutlined, LineChartOutlined,
  MailOutlined, LinkOutlined, CheckOutlined, CloseOutlined,
  UploadOutlined, DownloadOutlined, StarOutlined, FormOutlined
} from '@ant-design/icons';
import { HubLayout, HubHeader, StatusBanner, HubTabs } from '../../components/hub';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { TextArea } = Input;
const { Step } = Steps;

// Interfaces
interface Proposal {
  id: string;
  title: string;
  client: string;
  clientContact: string;
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'declined' | 'expired';
  value: number;
  validUntil: string;
  createdDate: string;
  sentDate?: string;
  template: string;
  owner: string;
  probability: number;
  viewCount: number;
  lastViewed?: string;
  signed: boolean;
}

interface Template {
  id: string;
  name: string;
  category: string;
  description: string;
  usageCount: number;
  winRate: number;
  lastUsed: string;
  sections: string[];
  previewImage?: string;
  preview?: string;
  deckSlides?: string[];
}

interface PricingItem {
  id: string;
  name: string;
  category: string;
  description: string;
  unitPrice: number;
  unit: string;
  margin: number;
  taxable: boolean;
}

// Sample Data
const sampleProposals: Proposal[] = [
  {
    id: 'PROP-001',
    title: 'ERP Implementation Services',
    client: 'Shoprite Holdings',
    clientContact: 'John van der Berg',
    status: 'sent',
    value: 2500000,
    validUntil: '2024-07-15',
    createdDate: '2024-06-01',
    sentDate: '2024-06-05',
    template: 'IT Services',
    owner: 'Sarah Johnson',
    probability: 75,
    viewCount: 12,
    lastViewed: '2024-06-10',
    signed: false
  },
  {
    id: 'PROP-002',
    title: 'Annual Audit Services 2024',
    client: 'Discovery Limited',
    clientContact: 'Nadia Patel',
    status: 'accepted',
    value: 850000,
    validUntil: '2024-06-30',
    createdDate: '2024-05-15',
    sentDate: '2024-05-18',
    template: 'Audit Services',
    owner: 'Michael Chen',
    probability: 100,
    viewCount: 8,
    lastViewed: '2024-05-25',
    signed: true
  },
  {
    id: 'PROP-003',
    title: 'Cloud Migration Project',
    client: 'Standard Bank',
    clientContact: 'Themba Ndlovu',
    status: 'viewed',
    value: 4200000,
    validUntil: '2024-07-30',
    createdDate: '2024-06-08',
    sentDate: '2024-06-10',
    template: 'IT Services',
    owner: 'Sarah Johnson',
    probability: 60,
    viewCount: 5,
    lastViewed: '2024-06-12',
    signed: false
  },
  {
    id: 'PROP-004',
    title: 'Tax Advisory Services',
    client: 'Pick n Pay',
    clientContact: 'Linda Mokoena',
    status: 'draft',
    value: 320000,
    validUntil: '2024-08-15',
    createdDate: '2024-06-12',
    template: 'Tax Services',
    owner: 'David Williams',
    probability: 50,
    viewCount: 0,
    signed: false
  },
  {
    id: 'PROP-005',
    title: 'Financial System Upgrade',
    client: 'Woolworths',
    clientContact: 'Peter Smith',
    status: 'declined',
    value: 1800000,
    validUntil: '2024-06-01',
    createdDate: '2024-04-20',
    sentDate: '2024-04-25',
    template: 'IT Services',
    owner: 'Emily Davis',
    probability: 0,
    viewCount: 15,
    lastViewed: '2024-05-28',
    signed: false
  }
];

const sampleTemplates: Template[] = [
  { id: 'TPL-001', name: 'IT Services Proposal', category: 'Technology', description: 'Standard IT consulting and implementation', usageCount: 45, winRate: 68, lastUsed: '2024-06-10', sections: ['Executive Summary', 'Scope', 'Timeline', 'Pricing', 'Terms'], previewImage: 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?w=640', preview: 'Modular IT consulting deck covering scope, delivery plan, and pricing with optional managed services.' },
  { id: 'TPL-002', name: 'Audit Services', category: 'Professional', description: 'Annual audit and assurance services', usageCount: 32, winRate: 82, lastUsed: '2024-06-08', sections: ['Introduction', 'Methodology', 'Team', 'Fees', 'Engagement Letter'], previewImage: 'https://images.unsplash.com/photo-1454165205744-3b78555e5572?w=640', preview: 'Clean assurance proposal with audit scope, deliverables, and ISA-based methodology.' },
  { id: 'TPL-003', name: 'Tax Advisory', category: 'Professional', description: 'Tax planning and advisory services', usageCount: 28, winRate: 71, lastUsed: '2024-06-05', sections: ['Scope', 'Services', 'Deliverables', 'Fees', 'Terms'], previewImage: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=640', preview: 'Advisory pack with tax planning roadmap, compliance calendar, and retainer options.' },
  { id: 'TPL-004', name: 'Construction Tender', category: 'Construction', description: 'CIDB compliant construction tender', usageCount: 15, winRate: 45, lastUsed: '2024-05-28', sections: ['Tender Summary', 'BOQ', 'Schedule', 'Safety', 'BBBEE'], previewImage: 'https://images.unsplash.com/photo-1433838552652-f9a46b332c40?w=640', preview: 'CIDB aligned tender with BOQ, programme, safety plan, and BBBEE credentials.' },
  { id: 'TPL-005', name: 'Software Development', category: 'Technology', description: 'Custom software development project', usageCount: 22, winRate: 58, lastUsed: '2024-06-01', sections: ['Requirements', 'Solution', 'Tech Stack', 'Timeline', 'Pricing'], previewImage: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=640', preview: 'Agile delivery plan with sprints, backlog, QA approach, and acceptance criteria.' },
  { id: 'TPL-006', name: 'Investor Pitch Deck', category: 'Pitch Deck', description: '11-slide VC-ready pitch deck with visuals', usageCount: 18, winRate: 64, lastUsed: '2024-06-09', sections: ['Problem', 'Solution', 'Market', 'Business Model', 'Traction', 'Roadmap', 'Team'], previewImage: 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?w=640', preview: 'Covers story arc, traction highlights, GTM, and financial asks.', deckSlides: ['Title & Vision', 'Problem / Opportunity', 'Solution & Product', 'Market Size (TAM/SAM/SOM)', 'Business Model', 'Traction & KPIs', 'Product Roadmap', 'GTM Strategy', 'Competition', 'Team', 'Financials & Ask'] }
];

const samplePricing: PricingItem[] = [
  { id: 'PRC-001', name: 'Senior Consultant', category: 'Professional Services', description: 'Senior-level consulting hours', unitPrice: 1500, unit: 'hour', margin: 40, taxable: true },
  { id: 'PRC-002', name: 'Junior Consultant', category: 'Professional Services', description: 'Junior-level consulting hours', unitPrice: 850, unit: 'hour', margin: 35, taxable: true },
  { id: 'PRC-003', name: 'Project Manager', category: 'Professional Services', description: 'Project management', unitPrice: 1800, unit: 'hour', margin: 45, taxable: true },
  { id: 'PRC-004', name: 'Software License', category: 'Software', description: 'Annual software license', unitPrice: 25000, unit: 'license', margin: 20, taxable: true },
  { id: 'PRC-005', name: 'Cloud Hosting', category: 'Infrastructure', description: 'Monthly cloud hosting', unitPrice: 5000, unit: 'month', margin: 25, taxable: true },
  { id: 'PRC-006', name: 'Training Session', category: 'Training', description: 'Full-day training session', unitPrice: 8500, unit: 'day', margin: 50, taxable: true }
];

const ProposalsHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [proposalModalVisible, setProposalModalVisible] = useState(false);
  const [templateModalVisible, setTemplateModalVisible] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [pricingModalVisible, setPricingModalVisible] = useState(false);
  const [proposals] = useState<Proposal[]>(sampleProposals);
  const [templates] = useState<Template[]>(sampleTemplates);
  const [pricing] = useState<PricingItem[]>(samplePricing);
  const [form] = Form.useForm();

  // Calculate stats
  const proposalStats = {
    total: proposals.length,
    draft: proposals.filter(p => p.status === 'draft').length,
    sent: proposals.filter(p => p.status === 'sent').length,
    viewed: proposals.filter(p => p.status === 'viewed').length,
    accepted: proposals.filter(p => p.status === 'accepted').length,
    declined: proposals.filter(p => p.status === 'declined').length,
    totalValue: proposals.reduce((sum, p) => sum + p.value, 0),
    wonValue: proposals.filter(p => p.status === 'accepted').reduce((sum, p) => sum + p.value, 0),
    pipelineValue: proposals.filter(p => ['sent', 'viewed'].includes(p.status)).reduce((sum, p) => sum + p.value, 0),
    winRate: Math.round((proposals.filter(p => p.status === 'accepted').length / proposals.filter(p => ['accepted', 'declined'].includes(p.status)).length) * 100) || 0
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'default', sent: 'processing', viewed: 'warning',
      accepted: 'success', declined: 'error', expired: 'default'
    };
    return colors[status] || 'default';
  };

  const openTemplatePreview = (template: Template) => {
    setPreviewTemplate(template);
    setPreviewVisible(true);
  };

  // Dashboard
  const renderDashboard = () => (
    <div style={{ padding: '24px' }}>
      {/* Key Metrics */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Pipeline Value"
              value={proposalStats.pipelineValue}
              prefix="R"
              valueStyle={{ color: '#1890ff' }}
              formatter={(value) => `${(Number(value) / 1000000).toFixed(2)}M`}
            />
            <Text type="secondary">{proposalStats.sent + proposalStats.viewed} active proposals</Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Won This Month"
              value={proposalStats.wonValue}
              prefix="R"
              valueStyle={{ color: '#52c41a' }}
              formatter={(value) => `${(Number(value) / 1000).toFixed(0)}K`}
            />
            <Text type="secondary">{proposalStats.accepted} accepted</Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Win Rate"
              value={proposalStats.winRate}
              suffix="%"
              prefix={<TrophyOutlined />}
              valueStyle={{ color: proposalStats.winRate >= 50 ? '#52c41a' : '#faad14' }}
            />
            <Progress percent={proposalStats.winRate} showInfo={false} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Avg. Response Time"
              value={2.5}
              suffix="days"
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
            <Text type="secondary">From view to decision</Text>
          </Card>
        </Col>
      </Row>

      {/* Pipeline Funnel */}
      <Card title={<><PieChartOutlined /> Proposal Pipeline</>} style={{ marginTop: 24 }}>
        <Row gutter={16}>
          <Col span={4}>
            <Card size="small" style={{ textAlign: 'center', background: '#f0f0f0' }}>
              <Statistic title="Draft" value={proposalStats.draft} />
            </Card>
          </Col>
          <Col span={1} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>→</Col>
          <Col span={4}>
            <Card size="small" style={{ textAlign: 'center', background: '#e6f7ff' }}>
              <Statistic title="Sent" value={proposalStats.sent} valueStyle={{ color: '#1890ff' }} />
            </Card>
          </Col>
          <Col span={1} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>→</Col>
          <Col span={4}>
            <Card size="small" style={{ textAlign: 'center', background: '#fff7e6' }}>
              <Statistic title="Viewed" value={proposalStats.viewed} valueStyle={{ color: '#faad14' }} />
            </Card>
          </Col>
          <Col span={1} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>→</Col>
          <Col span={4}>
            <Card size="small" style={{ textAlign: 'center', background: '#f6ffed' }}>
              <Statistic title="Accepted" value={proposalStats.accepted} valueStyle={{ color: '#52c41a' }} />
            </Card>
          </Col>
          <Col span={1} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>|</Col>
          <Col span={4}>
            <Card size="small" style={{ textAlign: 'center', background: '#fff2f0' }}>
              <Statistic title="Declined" value={proposalStats.declined} valueStyle={{ color: '#ff4d4f' }} />
            </Card>
          </Col>
        </Row>
      </Card>

      {/* Recent Proposals & Activity */}
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={16}>
          <Card 
            title={<><FileTextOutlined /> Recent Proposals</>}
            extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setProposalModalVisible(true)}>New Proposal</Button>}
          >
            <Table
              dataSource={proposals.slice(0, 5)}
              rowKey="id"
              size="small"
              pagination={false}
              columns={[
                {
                  title: 'Proposal',
                  key: 'proposal',
                  render: (_, record) => (
                    <div>
                      <Text strong>{record.title}</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 12 }}>{record.id} • {record.client}</Text>
                    </div>
                  )
                },
                {
                  title: 'Status',
                  dataIndex: 'status',
                  key: 'status',
                  render: (status: string) => <Tag color={getStatusColor(status)}>{status.toUpperCase()}</Tag>
                },
                {
                  title: 'Value',
                  dataIndex: 'value',
                  key: 'value',
                  render: (value: number) => `R${(value / 1000).toFixed(0)}K`
                },
                {
                  title: 'Views',
                  dataIndex: 'viewCount',
                  key: 'viewCount',
                  render: (views: number) => <Tag icon={<EyeOutlined />}>{views}</Tag>
                },
                {
                  title: 'Valid Until',
                  dataIndex: 'validUntil',
                  key: 'validUntil'
                },
                {
                  title: 'Actions',
                  key: 'actions',
                  render: (_, record) => (
                    <Space>
                      <Button size="small" icon={<EyeOutlined />} />
                      <Button size="small" icon={<SendOutlined />} disabled={record.status !== 'draft'} />
                    </Space>
                  )
                }
              ]}
            />
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title={<><BellOutlined /> Activity Feed</>}>
            <Timeline
              items={[
                {
                  color: 'blue',
                  children: (
                    <>
                      <Text strong>Proposal Viewed</Text>
                      <br />
                      <Text type="secondary">Standard Bank viewed Cloud Migration</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 11 }}>10 minutes ago</Text>
                    </>
                  )
                },
                {
                  color: 'green',
                  children: (
                    <>
                      <Text strong>Proposal Accepted</Text>
                      <br />
                      <Text type="secondary">Discovery - Annual Audit Services</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 11 }}>2 hours ago</Text>
                    </>
                  )
                },
                {
                  color: 'orange',
                  children: (
                    <>
                      <Text strong>Proposal Sent</Text>
                      <br />
                      <Text type="secondary">Shoprite - ERP Implementation</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 11 }}>Yesterday</Text>
                    </>
                  )
                },
                {
                  color: 'red',
                  children: (
                    <>
                      <Text strong>Expiring Soon</Text>
                      <br />
                      <Text type="secondary">Pick n Pay proposal expires in 3 days</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 11 }}>Alert</Text>
                    </>
                  )
                }
              ]}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );

  // Proposals List
  const renderProposals = () => (
    <div style={{ padding: '24px' }}>
      <Card
        title="All Proposals"
        extra={
          <Space>
            <Input placeholder="Search..." prefix={<SearchOutlined />} style={{ width: 200 }} />
            <Select defaultValue="all" style={{ width: 120 }}>
              <Option value="all">All Status</Option>
              <Option value="draft">Draft</Option>
              <Option value="sent">Sent</Option>
              <Option value="viewed">Viewed</Option>
              <Option value="accepted">Accepted</Option>
              <Option value="declined">Declined</Option>
            </Select>
            <Button icon={<FilterOutlined />}>Filter</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setProposalModalVisible(true)}>
              New Proposal
            </Button>
          </Space>
        }
      >
        <Table
          dataSource={proposals}
          rowKey="id"
          columns={[
            {
              title: 'Proposal',
              key: 'proposal',
              render: (_, record) => (
                <div>
                  <Text strong>{record.title}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>{record.id}</Text>
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
                  <Text type="secondary" style={{ fontSize: 12 }}>{record.clientContact}</Text>
                </div>
              )
            },
            {
              title: 'Status',
              dataIndex: 'status',
              key: 'status',
              render: (status: string, record) => (
                <Space direction="vertical" size="small">
                  <Tag color={getStatusColor(status)}>{status.toUpperCase()}</Tag>
                  {record.signed && <Tag color="green" icon={<CheckCircleOutlined />}>Signed</Tag>}
                </Space>
              )
            },
            {
              title: 'Value',
              dataIndex: 'value',
              key: 'value',
              render: (value: number) => <Text strong>R{value.toLocaleString()}</Text>
            },
            {
              title: 'Probability',
              dataIndex: 'probability',
              key: 'probability',
              render: (prob: number) => (
                <Progress 
                  percent={prob} 
                  size="small" 
                  style={{ width: 80 }}
                  strokeColor={prob >= 70 ? '#52c41a' : prob >= 40 ? '#faad14' : '#ff4d4f'}
                />
              )
            },
            {
              title: 'Views',
              dataIndex: 'viewCount',
              key: 'viewCount',
              render: (views: number, record) => (
                <Tooltip title={record.lastViewed ? `Last: ${record.lastViewed}` : 'Not viewed'}>
                  <Tag icon={<EyeOutlined />}>{views}</Tag>
                </Tooltip>
              )
            },
            {
              title: 'Valid Until',
              dataIndex: 'validUntil',
              key: 'validUntil',
              render: (date: string) => {
                const isExpiring = new Date(date) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
                return <Tag color={isExpiring ? 'orange' : 'default'}>{date}</Tag>;
              }
            },
            {
              title: 'Owner',
              dataIndex: 'owner',
              key: 'owner',
              render: (owner: string) => (
                <Space>
                  <Avatar size="small" icon={<UserOutlined />} />
                  {owner}
                </Space>
              )
            },
            {
              title: 'Actions',
              key: 'actions',
              render: (_, record) => (
                <Dropdown
                  menu={{
                    items: [
                      { key: 'view', label: 'View/Edit', icon: <EyeOutlined /> },
                      { key: 'duplicate', label: 'Duplicate', icon: <CopyOutlined /> },
                      { key: 'send', label: 'Send', icon: <SendOutlined />, disabled: record.status !== 'draft' },
                      { key: 'download', label: 'Download PDF', icon: <DownloadOutlined /> },
                      { type: 'divider' },
                      { key: 'delete', label: 'Delete', icon: <DeleteOutlined />, danger: true }
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

  // Templates
  const renderTemplates = () => (
    <div style={{ padding: '24px' }}>
      <Card
        title={<><FormOutlined /> Proposal Templates</>}
        extra={
          <Space>
            <Input placeholder="Search templates..." prefix={<SearchOutlined />} style={{ width: 200 }} />
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setTemplateModalVisible(true)}>
              New Template
            </Button>
          </Space>
        }
      >
        <Row gutter={[16, 16]}>
          {templates.map(template => (
            <Col key={template.id} xs={24} sm={12} md={8}>
              <Card
                hoverable
                cover={template.previewImage ? (
                  <img src={template.previewImage} alt={template.name} style={{ height: 140, objectFit: 'cover' }} />
                ) : undefined}
                actions={[
                  <Tooltip key="preview" title="Preview"><Button type="link" icon={<EyeOutlined />} onClick={() => openTemplatePreview(template)}>Preview</Button></Tooltip>,
                  <Tooltip key="use" title="Use Template"><Button type="link" icon={<PlusOutlined />} onClick={() => message.success(`Using ${template.name}`)}>Use</Button></Tooltip>,
                  <Tooltip key="duplicate" title="Duplicate"><Button type="link" icon={<CopyOutlined />} onClick={() => message.success(`Duplicated ${template.name}`)} /></Tooltip>
                ]}
              >
                <Card.Meta
                  title={template.name}
                  description={
                    <>
                      <Tag color="blue">{template.category}</Tag>
                      <br /><br />
                      <Text type="secondary">{template.description}</Text>
                      {template.preview && (
                        <Paragraph ellipsis={{ rows: 2 }} style={{ marginTop: 8, marginBottom: 8 }}>
                          {template.preview}
                        </Paragraph>
                      )}
                      <Divider style={{ margin: '12px 0' }} />
                      <Row gutter={8}>
                        <Col span={12}>
                          <Statistic title="Uses" value={template.usageCount} valueStyle={{ fontSize: 16 }} />
                        </Col>
                        <Col span={12}>
                          <Statistic 
                            title="Win Rate" 
                            value={template.winRate} 
                            suffix="%" 
                            valueStyle={{ fontSize: 16, color: template.winRate >= 60 ? '#52c41a' : '#faad14' }} 
                          />
                        </Col>
                      </Row>
                      <br />
                      <Text type="secondary" style={{ fontSize: 11 }}>Sections: {template.sections.join(', ')}</Text>
                    </>
                  }
                />
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      <Modal
        title={previewTemplate ? previewTemplate.name : 'Template Preview'}
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={[
          <Button key="close" onClick={() => setPreviewVisible(false)}>Close</Button>,
          previewTemplate && <Button key="use" type="primary" icon={<PlusOutlined />} onClick={() => { message.success(`Using ${previewTemplate.name}`); setPreviewVisible(false); }}>Use Template</Button>
        ]}
        width={720}
      >
        {previewTemplate && (
          <div>
            {previewTemplate.previewImage && (
              <img src={previewTemplate.previewImage} alt={previewTemplate.name} style={{ width: '100%', height: 220, objectFit: 'cover', borderRadius: 8, marginBottom: 12 }} />
            )}
            <Text type="secondary">{previewTemplate.description}</Text>
            {previewTemplate.preview && <Paragraph style={{ marginTop: 8 }}>{previewTemplate.preview}</Paragraph>}
            <Divider />
            <Text strong>Sections</Text>
            <List
              size="small"
              dataSource={previewTemplate.sections}
              renderItem={(item) => <List.Item><CheckOutlined /> {item}</List.Item>}
            />
            {previewTemplate.deckSlides && previewTemplate.deckSlides.length > 0 && (
              <>
                <Divider />
                <Text strong>Pitch Deck Slides</Text>
                <List
                  size="small"
                  dataSource={previewTemplate.deckSlides}
                  renderItem={(slide, idx) => <List.Item>{idx + 1}. {slide}</List.Item>}
                />
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );

  // Pricing Library
  const renderPricing = () => (
    <div style={{ padding: '24px' }}>
      <Card
        title={<><DollarOutlined /> Pricing Library</>}
        extra={
          <Space>
            <Input placeholder="Search items..." prefix={<SearchOutlined />} style={{ width: 200 }} />
            <Select defaultValue="all" style={{ width: 150 }}>
              <Option value="all">All Categories</Option>
              <Option value="services">Professional Services</Option>
              <Option value="software">Software</Option>
              <Option value="infrastructure">Infrastructure</Option>
              <Option value="training">Training</Option>
            </Select>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setPricingModalVisible(true)}>
              Add Item
            </Button>
          </Space>
        }
      >
        <Table
          dataSource={pricing}
          rowKey="id"
          columns={[
            { title: 'Item', dataIndex: 'name', key: 'name', render: (name: string) => <Text strong>{name}</Text> },
            { title: 'Category', dataIndex: 'category', key: 'category', render: (cat: string) => <Tag>{cat}</Tag> },
            { title: 'Description', dataIndex: 'description', key: 'description' },
            { 
              title: 'Unit Price', 
              dataIndex: 'unitPrice', 
              key: 'unitPrice',
              render: (price: number) => <Text strong>R{price.toLocaleString()}</Text>
            },
            { title: 'Unit', dataIndex: 'unit', key: 'unit' },
            { 
              title: 'Margin', 
              dataIndex: 'margin', 
              key: 'margin',
              render: (margin: number) => <Tag color={margin >= 40 ? 'green' : 'orange'}>{margin}%</Tag>
            },
            {
              title: 'VAT',
              dataIndex: 'taxable',
              key: 'taxable',
              render: (taxable: boolean) => taxable ? <Tag color="blue">15%</Tag> : <Tag>Exempt</Tag>
            },
            {
              title: 'Actions',
              key: 'actions',
              render: () => (
                <Space>
                  <Button size="small" icon={<EditOutlined />} />
                  <Button size="small" icon={<DeleteOutlined />} danger />
                </Space>
              )
            }
          ]}
        />
      </Card>
    </div>
  );

  // Analytics
  const renderAnalytics = () => (
    <div style={{ padding: '24px' }}>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card title="Win/Loss Analysis">
            <Row gutter={16}>
              <Col span={12}>
                <Statistic title="Total Won" value={proposalStats.accepted} suffix="deals" valueStyle={{ color: '#52c41a' }} />
                <Text type="secondary">R{(proposalStats.wonValue / 1000000).toFixed(2)}M value</Text>
              </Col>
              <Col span={12}>
                <Statistic title="Total Lost" value={proposalStats.declined} suffix="deals" valueStyle={{ color: '#ff4d4f' }} />
              </Col>
            </Row>
            <Divider />
            <Text strong>Win Rate by Template</Text>
            {templates.slice(0, 3).map(t => (
              <div key={t.id} style={{ marginTop: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>{t.name}</Text>
                  <Text>{t.winRate}%</Text>
                </div>
                <Progress percent={t.winRate} showInfo={false} strokeColor={t.winRate >= 60 ? '#52c41a' : '#faad14'} />
              </div>
            ))}
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card title="Conversion Metrics">
            <Row gutter={16}>
              <Col span={8}>
                <Statistic title="Sent → Viewed" value={75} suffix="%" />
              </Col>
              <Col span={8}>
                <Statistic title="Viewed → Accepted" value={45} suffix="%" />
              </Col>
              <Col span={8}>
                <Statistic title="Avg. Deal Size" value={1.2} prefix="R" suffix="M" />
              </Col>
            </Row>
            <Divider />
            <Text strong>Response Time Distribution</Text>
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text>Same Day</Text>
                <Text>25%</Text>
              </div>
              <Progress percent={25} showInfo={false} strokeColor="#52c41a" />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text>1-3 Days</Text>
                <Text>45%</Text>
              </div>
              <Progress percent={45} showInfo={false} strokeColor="#1890ff" />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text>4-7 Days</Text>
                <Text>20%</Text>
              </div>
              <Progress percent={20} showInfo={false} strokeColor="#faad14" />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text>7+ Days</Text>
                <Text>10%</Text>
              </div>
              <Progress percent={10} showInfo={false} strokeColor="#ff4d4f" />
            </div>
          </Card>
        </Col>

        <Col xs={24}>
          <Card title="Monthly Performance">
            <Row gutter={16}>
              {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((month, i) => (
                <Col key={month} span={4}>
                  <Card size="small">
                    <Statistic 
                      title={month} 
                      value={[8, 12, 10, 15, 18, 14][i]} 
                      suffix="sent"
                    />
                    <Text type="secondary">{[3, 5, 4, 7, 9, 6][i]} won</Text>
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );

  // Settings
  const renderSettings = () => (
    <div style={{ padding: '24px' }}>
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={12}>
          <Card title="Proposal Settings">
            <Form layout="vertical">
              <Form.Item label="Auto-generate Proposal Numbers">
                <Switch defaultChecked />
              </Form.Item>
              <Form.Item label="Proposal Number Prefix">
                <Input defaultValue="PROP" />
              </Form.Item>
              <Form.Item label="Default Validity Period">
                <Select defaultValue="30">
                  <Option value="14">14 Days</Option>
                  <Option value="30">30 Days</Option>
                  <Option value="60">60 Days</Option>
                  <Option value="90">90 Days</Option>
                </Select>
              </Form.Item>
              <Form.Item label="Require E-Signature">
                <Switch defaultChecked />
              </Form.Item>
              <Button type="primary">Save Settings</Button>
            </Form>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Financial Integration">
            <Form layout="vertical">
              <Form.Item label="Revenue Account (Accepted)">
                <Select defaultValue="4000">
                  <Option value="4000">4000 - Service Revenue</Option>
                  <Option value="4100">4100 - Consulting Revenue</Option>
                </Select>
              </Form.Item>
              <Form.Item label="Accounts Receivable">
                <Select defaultValue="1100">
                  <Option value="1100">1100 - Trade Debtors</Option>
                  <Option value="1110">1110 - Contract Debtors</Option>
                </Select>
              </Form.Item>
              <Form.Item label="Default VAT Rate">
                <Select defaultValue="15">
                  <Option value="15">15% (Standard)</Option>
                  <Option value="0">0% (Zero-rated)</Option>
                </Select>
              </Form.Item>
              <Form.Item label="Auto-create Invoice on Acceptance">
                <Switch />
              </Form.Item>
              <Button type="primary">Save Settings</Button>
            </Form>
          </Card>
        </Col>

        <Col xs={24}>
          <Card title={<><MailOutlined /> Email & Notifications</>}>
            <Form layout="vertical">
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="Send Notifications When">
                    <Checkbox.Group style={{ width: '100%' }}>
                      <Row>
                        <Col span={12}><Checkbox value="viewed">Proposal Viewed</Checkbox></Col>
                        <Col span={12}><Checkbox value="accepted" defaultChecked>Proposal Accepted</Checkbox></Col>
                        <Col span={12}><Checkbox value="declined" defaultChecked>Proposal Declined</Checkbox></Col>
                        <Col span={12}><Checkbox value="expiring" defaultChecked>Expiring Soon (3 days)</Checkbox></Col>
                      </Row>
                    </Checkbox.Group>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Email Template">
                    <Select defaultValue="default">
                      <Option value="default">Default Template</Option>
                      <Option value="formal">Formal Template</Option>
                      <Option value="casual">Casual Template</Option>
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
        title="Proposals Hub"
        subtitle="Proposals, Quotations & Client Engagement"
        icon={<FileTextOutlined />}
        gradient="cyan"
        actions={
          <>
            <Button icon={<SyncOutlined />}>Refresh</Button>
            <Button icon={<ExportOutlined />}>Export</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setProposalModalVisible(true)}>
              New Proposal
            </Button>
          </>
        }
      />

      <StatusBanner
        gradient="cyan"
        icon={<TrophyOutlined />}
        title="Sales Pipeline"
        subtitle="Proposals & Win Rate"
        stats={[
          { title: 'Pipeline Value', value: `R${(proposalStats.pipelineValue / 1000000).toFixed(1)}M`, span: 4 },
          { title: 'Won This Month', value: `R${(proposalStats.wonValue / 1000).toFixed(0)}K`, valueStyle: { color: '#86efac' }, span: 4 },
          { title: 'Win Rate', value: `${proposalStats.winRate}%`, span: 4 },
          { title: 'Active Proposals', value: proposalStats.sent + proposalStats.viewed, span: 4 },
          { title: 'Pending Review', value: proposalStats.draft, span: 4 },
        ]}
      />

      <HubTabs
        theme="cyan"
        tabs={[
          { key: 'dashboard', label: 'Dashboard', icon: <HomeOutlined />, children: renderDashboard() },
          { key: 'proposals', label: 'Proposals', icon: <FileTextOutlined />, children: renderProposals() },
          { key: 'templates', label: 'Templates', icon: <FormOutlined />, children: renderTemplates() },
          { key: 'pricing', label: 'Pricing Library', icon: <DollarOutlined />, children: renderPricing() },
          { key: 'analytics', label: 'Analytics', icon: <LineChartOutlined />, children: renderAnalytics() },
          { key: 'settings', label: 'Settings', icon: <SettingOutlined />, children: renderSettings() }
        ]}
        activeKey={activeTab}
        onChange={setActiveTab}
      />

      {/* New Proposal Modal */}
      <Modal
        title="Create New Proposal"
        open={proposalModalVisible}
        onCancel={() => setProposalModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setProposalModalVisible(false)}>Cancel</Button>,
          <Button key="draft">Save Draft</Button>,
          <Button key="create" type="primary">Create & Edit</Button>
        ]}
        width={700}
      >
        <Form form={form} layout="vertical">
          <Form.Item label="Proposal Title" name="title" rules={[{ required: true }]}>
            <Input placeholder="Enter proposal title" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Client" name="client" rules={[{ required: true }]}>
                <Select placeholder="Select client">
                  <Option value="shoprite">Shoprite Holdings</Option>
                  <Option value="discovery">Discovery Limited</Option>
                  <Option value="standardbank">Standard Bank</Option>
                  <Option value="pnp">Pick n Pay</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Contact Person" name="contact">
                <Input placeholder="Contact name" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Template" name="template">
                <Select placeholder="Select template">
                  {templates.map(t => <Option key={t.id} value={t.id}>{t.name}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Valid Until" name="validUntil" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Estimated Value" name="value">
                <InputNumber
                  style={{ width: '100%' }}
                  formatter={value => `R ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={value => value!.replace(/R\s?|(,*)/g, '')}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Probability" name="probability">
                <Select defaultValue={50}>
                  <Option value={25}>25% - Early Stage</Option>
                  <Option value={50}>50% - Qualified</Option>
                  <Option value={75}>75% - Likely</Option>
                  <Option value={90}>90% - Almost Certain</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </HubLayout>
  );
};

export default ProposalsHub;
