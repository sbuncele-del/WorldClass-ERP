import React from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Button,
  Table,
  Tag,
  Progress,
  Space,
  Typography,
  Avatar,
  Dropdown,
} from 'antd';
import {
  PlusOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  EyeOutlined,
  EditOutlined,
  MoreOutlined,
  CopyOutlined,
  SendOutlined,
  RiseOutlined,
  FileDoneOutlined,
  FileSearchOutlined,
  FileExclamationOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import type { MenuProps } from 'antd';
import './ProposalsDashboard.css';

const { Title, Text } = Typography;

interface Proposal {
  id: string;
  title: string;
  client: string;
  clientAvatar?: string;
  value: number;
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'declined' | 'expired';
  createdAt: string;
  sentAt?: string;
  viewedAt?: string;
  expiresAt?: string;
  template: string;
  owner: string;
}

const ProposalsDashboard: React.FC = () => {
  const navigate = useNavigate();

  // Sample statistics
  const stats = {
    totalProposals: 156,
    openProposals: 23,
    acceptedValue: 487500,
    winRate: 68,
    avgTimeToClose: 5.2,
    viewedToday: 8,
  };

  // Sample recent proposals
  const recentProposals: Proposal[] = [
    {
      id: '1',
      title: 'Enterprise Software Implementation',
      client: 'TechCorp Industries',
      value: 125000,
      status: 'sent',
      createdAt: '2024-01-12',
      sentAt: '2024-01-13',
      expiresAt: '2024-02-13',
      template: 'Enterprise Solution',
      owner: 'John Smith',
    },
    {
      id: '2',
      title: 'Annual Accounting Services',
      client: 'ABC Manufacturing',
      value: 48000,
      status: 'viewed',
      createdAt: '2024-01-10',
      sentAt: '2024-01-11',
      viewedAt: '2024-01-14',
      expiresAt: '2024-02-10',
      template: 'Professional Services',
      owner: 'Sarah Johnson',
    },
    {
      id: '3',
      title: 'Cloud Migration Project',
      client: 'Global Logistics Ltd',
      value: 85000,
      status: 'accepted',
      createdAt: '2024-01-08',
      sentAt: '2024-01-09',
      viewedAt: '2024-01-10',
      template: 'IT Services',
      owner: 'Mike Davis',
    },
    {
      id: '4',
      title: 'Marketing Strategy Consulting',
      client: 'Sunrise Brands',
      value: 35000,
      status: 'draft',
      createdAt: '2024-01-14',
      template: 'Consulting',
      owner: 'Emily Chen',
    },
    {
      id: '5',
      title: 'HR System Integration',
      client: 'Pacific Hotels Group',
      value: 62000,
      status: 'declined',
      createdAt: '2024-01-05',
      sentAt: '2024-01-06',
      viewedAt: '2024-01-08',
      template: 'Enterprise Solution',
      owner: 'John Smith',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'default';
      case 'sent': return 'processing';
      case 'viewed': return 'warning';
      case 'accepted': return 'success';
      case 'declined': return 'error';
      case 'expired': return 'default';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return <FileTextOutlined />;
      case 'sent': return <SendOutlined />;
      case 'viewed': return <EyeOutlined />;
      case 'accepted': return <CheckCircleOutlined />;
      case 'declined': return <FileExclamationOutlined />;
      case 'expired': return <ClockCircleOutlined />;
      default: return <FileTextOutlined />;
    }
  };

  const columns: ColumnsType<Proposal> = [
    {
      title: 'Proposal',
      key: 'proposal',
      render: (_, record) => (
        <div className="proposal-cell">
          <div className="proposal-title">{record.title}</div>
          <div className="proposal-client">
            <Avatar size="small">{record.client[0]}</Avatar>
            <span>{record.client}</span>
          </div>
        </div>
      ),
    },
    {
      title: 'Value',
      dataIndex: 'value',
      key: 'value',
      render: (value) => (
        <Text strong>${value.toLocaleString()}</Text>
      ),
      sorter: (a, b) => a.value - b.value,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={getStatusColor(status)} icon={getStatusIcon(status)}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Tag>
      ),
    },
    {
      title: 'Owner',
      dataIndex: 'owner',
      key: 'owner',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => {
        const menuItems: MenuProps['items'] = [
          { key: 'view', label: 'View', icon: <EyeOutlined /> },
          { key: 'edit', label: 'Edit', icon: <EditOutlined /> },
          { key: 'duplicate', label: 'Duplicate', icon: <CopyOutlined /> },
          { type: 'divider' },
          { key: 'send', label: 'Send to Client', icon: <SendOutlined /> },
        ];

        return (
          <Space>
            <Button 
              type="text" 
              icon={<EyeOutlined />}
              onClick={() => navigate(`/proposals/preview/${record.id}`)}
            />
            <Button 
              type="text" 
              icon={<EditOutlined />}
              onClick={() => navigate(`/proposals/edit/${record.id}`)}
            />
            <Dropdown menu={{ items: menuItems }}>
              <Button type="text" icon={<MoreOutlined />} />
            </Dropdown>
          </Space>
        );
      },
    },
  ];

  // Pipeline breakdown
  const pipeline = [
    { stage: 'Draft', count: 8, value: 156000, color: '#8c8c8c' },
    { stage: 'Sent', count: 12, value: 324000, color: '#1890ff' },
    { stage: 'Viewed', count: 6, value: 198000, color: '#faad14' },
    { stage: 'Negotiating', count: 4, value: 145000, color: '#722ed1' },
  ];

  const totalPipelineValue = pipeline.reduce((sum, s) => sum + s.value, 0);

  return (
    <div className="proposals-dashboard">
      <div className="page-header">
        <div>
          <Title level={4} style={{ margin: 0 }}>Proposal Builder</Title>
          <Text type="secondary">Create winning proposals with professional templates</Text>
        </div>
        <Space>
          <Button onClick={() => navigate('/proposals/templates')}>
            Browse Templates
          </Button>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => navigate('/proposals/new')}
          >
            Create Proposal
          </Button>
        </Space>
      </div>

      {/* Stats Row */}
      <Row gutter={16} className="stats-row">
        <Col xs={24} sm={12} lg={4}>
          <Card className="stat-card">
            <Statistic
              title="Total Proposals"
              value={stats.totalProposals}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <Card className="stat-card">
            <Statistic
              title="Open Proposals"
              value={stats.openProposals}
              prefix={<FileSearchOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <Card className="stat-card">
            <Statistic
              title="Accepted Value"
              value={stats.acceptedValue}
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#52c41a' }}
              formatter={(value) => `$${Number(value).toLocaleString()}`}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <Card className="stat-card">
            <Statistic
              title="Win Rate"
              value={stats.winRate}
              suffix="%"
              prefix={<RiseOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <Card className="stat-card">
            <Statistic
              title="Avg. Days to Close"
              value={stats.avgTimeToClose}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <Card className="stat-card">
            <Statistic
              title="Viewed Today"
              value={stats.viewedToday}
              prefix={<EyeOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={24}>
        {/* Pipeline */}
        <Col xs={24} lg={8}>
          <Card title="Proposal Pipeline" className="pipeline-card">
            <div className="pipeline-total">
              <Text type="secondary">Total Pipeline Value</Text>
              <Title level={3} style={{ margin: 0 }}>
                ${totalPipelineValue.toLocaleString()}
              </Title>
            </div>
            <div className="pipeline-stages">
              {pipeline.map((stage) => (
                <div key={stage.stage} className="pipeline-stage">
                  <div className="stage-header">
                    <div className="stage-info">
                      <div 
                        className="stage-dot" 
                        style={{ background: stage.color }}
                      />
                      <Text>{stage.stage}</Text>
                      <Tag>{stage.count}</Tag>
                    </div>
                    <Text strong>${stage.value.toLocaleString()}</Text>
                  </div>
                  <Progress 
                    percent={(stage.value / totalPipelineValue) * 100} 
                    showInfo={false}
                    strokeColor={stage.color}
                  />
                </div>
              ))}
            </div>
          </Card>

          {/* Quick Actions */}
          <Card title="Quick Actions" className="quick-actions-card">
            <div className="quick-actions">
              <Button 
                icon={<PlusOutlined />} 
                block
                onClick={() => navigate('/proposals/new')}
              >
                New Proposal
              </Button>
              <Button 
                icon={<FileDoneOutlined />} 
                block
                onClick={() => navigate('/proposals/templates')}
              >
                Use Template
              </Button>
              <Button 
                icon={<DollarOutlined />} 
                block
                onClick={() => navigate('/proposals/pricing')}
              >
                Pricing Library
              </Button>
            </div>
          </Card>
        </Col>

        {/* Recent Proposals */}
        <Col xs={24} lg={16}>
          <Card 
            title="Recent Proposals" 
            extra={
              <Button type="link" onClick={() => navigate('/proposals/list')}>
                View All
              </Button>
            }
          >
            <Table
              columns={columns}
              dataSource={recentProposals}
              rowKey="id"
              pagination={false}
              size="middle"
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ProposalsDashboard;
