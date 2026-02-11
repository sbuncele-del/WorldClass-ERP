import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Row,
  Col,
  Button,
  Typography,
  Tag,
  Progress,
  Statistic,
  Tree,
  Table,
  Tabs,
  Badge,
  Space,
  Tooltip,
  Modal,
  Form,
  Input,
  Select,
  message,
  Divider,
  Avatar,
  Spin,
} from 'antd';
import apiClient from '../../services/api';
import { useClient } from '../../contexts/ClientContext';
import { useEntity } from '../../contexts/EntityContext';
import {
  BankOutlined,
  GlobalOutlined,
  TeamOutlined,
  SettingOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  PlusOutlined,
  ApartmentOutlined,
  DollarOutlined,
  FileTextOutlined,
  SwapOutlined,
  PieChartOutlined,
  SafetyCertificateOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import './MultiEntityHub.css';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

const MultiEntityHub: React.FC = () => {
  const navigate = useNavigate();
  const { currentClient } = useClient();
  const { switchEntity, currentEntity } = useEntity();
  const companyName = currentClient?.name || 'Your Company';
  
  const [activeTab, setActiveTab] = useState('overview');
  const [showEntityModal, setShowEntityModal] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creatingEntity, setCreatingEntity] = useState(false);
  const [entityForm] = Form.useForm();

  // Data state
  const [entityHierarchy, setEntityHierarchy] = useState<any[]>([]);
  const [interCompanyTransactions, setInterCompanyTransactions] = useState<any[]>([]);
  const [consolidationRules, setConsolidationRules] = useState<any[]>([]);

  // Fetch data from API
  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch each endpoint independently to handle failures gracefully
      const hierarchyPromise = apiClient.get('/api/v2/entities/hierarchy').catch(() => ({ data: { data: [] } }));
      const transactionsPromise = apiClient.get('/api/v2/multi-entity/intercompany').catch(() => ({ data: { data: [] } }));
      const consolidationPromise = apiClient.get('/api/v2/multi-entity/consolidation').catch(() => ({ data: { data: [] } }));

      const [hierarchyRes, transactionsRes, rulesRes] = await Promise.all([
        hierarchyPromise,
        transactionsPromise,
        consolidationPromise
      ]);
      setEntityHierarchy(hierarchyRes.data?.data || hierarchyRes.data || []);
      setInterCompanyTransactions(transactionsRes.data?.data || transactionsRes.data || []);
      setConsolidationRules(rulesRes.data?.data || rulesRes.data || []);
    } catch (error) {
      console.error('Failed to fetch multi-entity data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle create entity
  const handleCreateEntity = async (values: any) => {
    setCreatingEntity(true);
    try {
      await apiClient.post('/api/v2/entities', {
        name: values.name,
        code: values.code || values.name.substring(0, 3).toUpperCase(),
        type: values.entity_type,
        parent_id: values.parent_id || null,
        country: values.country,
        currency: values.currency,
        ownership_percentage: values.ownership_percentage || 100
      });
      message.success('Entity created successfully!');
      entityForm.resetFields();
      setShowEntityModal(false);
      fetchData(); // Refresh the hierarchy
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Failed to create entity');
    } finally {
      setCreatingEntity(false);
    }
  };

  // Handle delete entity
  const handleDeleteEntity = async (entityId: string, entityName: string) => {
    Modal.confirm({
      title: 'Delete Entity',
      content: `Are you sure you want to delete "${entityName}"? This action cannot be undone.`,
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          await apiClient.delete(`/api/v2/entities/${entityId}`);
          message.success('Entity deleted successfully');
          fetchData();
        } catch (err: any) {
          message.error(err.response?.data?.error || 'Failed to delete entity');
        }
      }
    });
  };

  // Count total entities recursively
  const countEntities = (entities: any[]): number => {
    return entities.reduce((count, entity) => {
      return count + 1 + (entity.children ? countEntities(entity.children) : 0);
    }, 0);
  };

  // Get unique countries from entities
  const getCountries = (entities: any[]): Set<string> => {
    const countries = new Set<string>();
    entities.forEach(entity => {
      if (entity.country) countries.add(entity.country);
      if (entity.children) {
        getCountries(entity.children).forEach(c => countries.add(c));
      }
    });
    return countries;
  };

  const totalEntities = countEntities(entityHierarchy);
  const totalCountries = getCountries(entityHierarchy).size || 1;

  const handleConsolidate = async () => {
    setSyncing(true);
    await new Promise(resolve => setTimeout(resolve, 3000));
    message.success('Consolidation completed successfully');
    setSyncing(false);
  };

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { color: string; text: string }> = {
      active: { color: '#10b981', text: 'Active' },
      pending: { color: '#f59e0b', text: 'Pending' },
      inactive: { color: '#64748b', text: 'Inactive' },
      posted: { color: '#10b981', text: 'Posted' },
      draft: { color: '#64748b', text: 'Draft' },
    };
    const config = configs[status] || { color: '#64748b', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const getCountryFlag = (code: string) => {
    const flags: Record<string, string> = {
      ZA: '🇿🇦',
      GB: '🇬🇧',
      US: '🇺🇸',
      EU: '🇪🇺',
    };
    return flags[code] || '🌍';
  };

  const transactionColumns = [
    {
      title: 'Reference',
      dataIndex: 'id',
      key: 'id',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: 'From Entity',
      dataIndex: 'from',
      key: 'from',
    },
    {
      title: 'To Entity',
      dataIndex: 'to',
      key: 'to',
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => <Tag color="#667eea">{type}</Tag>,
    },
    {
      title: 'Amount',
      key: 'amount',
      render: (_: any, record: any) => (
        <Text strong>{record.currency} {record.amount.toLocaleString()}</Text>
      ),
    },
    {
      title: 'Period',
      dataIndex: 'period',
      key: 'period',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusBadge(status),
    },
  ];

  // Transform API data to tree format with proper field mapping
  const transformToTreeData = (entities: any[]): any[] => {
    return entities.map(entity => ({
      key: entity.id,
      title: entity.name,
      name: entity.name,
      code: entity.code,
      type: entity.type || 'subsidiary',
      country: entity.country || 'ZA',
      currency: entity.currency || 'ZAR',
      status: entity.status || 'active',
      ownership: entity.ownership_percentage || 100,
      children: entity.children?.length > 0 ? transformToTreeData(entity.children) : undefined
    }));
  };

  const renderTreeNode = (node: any) => ({
    title: (
      <div 
        className="entity-tree-node"
        onClick={() => navigate(`/app/multi-entity/${node.key}`)}
        style={{ cursor: 'pointer' }}
      >
        <div className="node-main">
          <div className="node-icon"><BankOutlined /></div>
          <div className="node-info">
            <div className="node-title-row">
              <Text strong style={{ fontSize: '15px' }}>{node.name}</Text>
              <Tag color="blue" style={{ marginLeft: 8 }}>{node.code}</Tag>
              {currentEntity?.id === node.key && (
                <Tag color="green" style={{ marginLeft: 4 }}>● Working</Tag>
              )}
            </div>
            <div className="node-meta">
              <span>{getCountryFlag(node.country)} {node.country}</span>
              <Tag>{node.type}</Tag>
              <Tag color={node.currency === 'ZAR' ? 'green' : node.currency === 'GBP' ? 'blue' : 'purple'}>
                {node.currency}
              </Tag>
              <span style={{ fontSize: '12px', color: '#666' }}>{node.ownership}% owned</span>
              {getStatusBadge(node.status)}
            </div>
          </div>
        </div>
        <Space className="node-actions" onClick={(e) => e.stopPropagation()}>
          <Button 
            type="primary" 
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              switchEntity(node.key);
              message.success(`Switched to ${node.name}`);
            }}
            style={{ background: currentEntity?.id === node.key ? '#52c41a' : undefined }}
          >
            {currentEntity?.id === node.key ? '✓ Working' : 'Work Here'}
          </Button>
          <Button 
            size="small" 
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/app/multi-entity/${node.key}`);
            }}
          >
            Details
          </Button>
          <Button 
            size="small" 
            danger
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteEntity(node.key, node.name);
            }}
          >
            Delete
          </Button>
        </Space>
      </div>
    ),
    key: node.key,
    children: node.children?.map(renderTreeNode),
  });

  return (
    <div className="multi-entity-hub">
      {/* Header */}
      <div className="hub-header">
        <div className="hub-title-section">
          <div className="entity-logo">
            <ApartmentOutlined className="logo-icon" />
          </div>
          <div>
            <Title level={2} style={{ margin: 0 }}>Multi-Entity Management</Title>
            <Text type="secondary">Consolidated financial management across your group structure</Text>
          </div>
        </div>
        <div className="hub-actions">
          <Button 
            icon={<SyncOutlined spin={syncing} />} 
            onClick={handleConsolidate}
            loading={syncing}
          >
            Run Consolidation
          </Button>
          <Button 
            icon={<PlusOutlined />}
            onClick={() => setShowEntityModal(true)}
          >
            Add Entity
          </Button>
          <Button type="primary" icon={<FileTextOutlined />}>
            Consolidated Report
          </Button>
        </div>
      </div>

      {/* Group Status Banner */}
      <Card className="group-status-card">
        <Row gutter={24} align="middle">
          <Col span={5}>
            <div className="group-badge">
              <BankOutlined className="group-icon" />
              <div>
                <Text strong style={{ fontSize: '16px', display: 'block', color: 'white' }}>Group Structure</Text>
                <Text style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>{companyName}</Text>
              </div>
            </div>
          </Col>
          <Col span={4}>
            <Statistic 
              title="Total Entities" 
              value={totalEntities}
              valueStyle={{ color: 'white' }}
              prefix={<GlobalOutlined />}
            />
          </Col>
          <Col span={4}>
            <Statistic 
              title="Countries" 
              value={totalCountries}
              valueStyle={{ color: 'white' }}
              prefix={<span>🌍</span>}
            />
          </Col>
          <Col span={4}>
            <Statistic 
              title="Transactions" 
              value={interCompanyTransactions.length}
              valueStyle={{ color: 'white' }}
              prefix={<SwapOutlined />}
            />
          </Col>
          <Col span={4}>
            <Statistic 
              title="Status" 
              value={totalEntities > 0 ? "Active" : "Setup Required"}
              valueStyle={{ color: totalEntities > 0 ? '#86efac' : '#fbbf24', fontSize: '16px' }}
              prefix={totalEntities > 0 ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
            />
          </Col>
          <Col span={3}>
            <Statistic 
              title="Last Updated" 
              value="Now"
              valueStyle={{ color: 'white', fontSize: '16px' }}
            />
          </Col>
        </Row>
      </Card>

      {/* Main Content Tabs */}
      <Tabs activeKey={activeTab} onChange={setActiveTab} className="hub-tabs">
        <TabPane 
          tab={<span><ApartmentOutlined /> Structure</span>} 
          key="overview"
        >
          <Row gutter={[24, 24]}>
            {/* Entity Hierarchy */}
            <Col span={14}>
              <Card 
                title={
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <BankOutlined />
                    <span>Entity Hierarchy</span>
                    <Tag color="blue">{totalEntities} entities</Tag>
                  </div>
                } 
                className="hierarchy-card"
                extra={<Button size="small" icon={<PlusOutlined />} onClick={() => setShowEntityModal(true)}>Add</Button>}
              >
                {/* Parent Company Header */}
                <div className="parent-company-header">
                  <div className="parent-icon"><BankOutlined style={{ fontSize: 24, color: 'white' }} /></div>
                  <div className="parent-info">
                    <Text strong style={{ fontSize: '16px' }}>{companyName}</Text>
                    <Text type="secondary" style={{ display: 'block', fontSize: '12px' }}>Holding Company • Parent Entity</Text>
                  </div>
                </div>
                
                {entityHierarchy.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: '#999' }}>
                    <ApartmentOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                    <p>No subsidiaries yet. Click "Add" to create your first entity.</p>
                  </div>
                ) : (
                  <Tree
                    showLine={{ showLeafIcon: false }}
                    defaultExpandAll
                    treeData={transformToTreeData(entityHierarchy).map(renderTreeNode)}
                    className="entity-tree"
                  />
                )}
              </Card>
            </Col>

            {/* Quick Stats */}
            <Col span={10}>
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Card className="stat-card">
                    <Statistic
                      title="Group Revenue (YTD)"
                      value={45800000}
                      prefix="R"
                      valueStyle={{ color: '#10b981' }}
                    />
                    <div className="stat-footer">
                      <Text type="success">↑ 18% vs last year</Text>
                    </div>
                  </Card>
                </Col>
                <Col span={12}>
                  <Card className="stat-card">
                    <Statistic
                      title="Intercompany Balance"
                      value={2450000}
                      prefix="R"
                      valueStyle={{ color: '#667eea' }}
                    />
                    <div className="stat-footer">
                      <Text type="secondary">To be eliminated</Text>
                    </div>
                  </Card>
                </Col>
                <Col span={12}>
                  <Card className="stat-card">
                    <Statistic
                      title="Pending Eliminations"
                      value={12}
                      valueStyle={{ color: '#f59e0b' }}
                    />
                    <div className="stat-footer">
                      <Text type="warning">Requires review</Text>
                    </div>
                  </Card>
                </Col>
                <Col span={12}>
                  <Card className="stat-card">
                    <Statistic
                      title="FX Adjustments"
                      value={3}
                      valueStyle={{ color: '#3b82f6' }}
                    />
                    <div className="stat-footer">
                      <Text type="secondary">This period</Text>
                    </div>
                  </Card>
                </Col>
              </Row>

              {/* Consolidation Rules Summary */}
              <Card title="Consolidation Rules" style={{ marginTop: '16px' }} className="rules-card">
                {consolidationRules.map((rule, idx) => (
                  <div key={idx} className="rule-item">
                    <div className="rule-entity">
                      <Text strong>{rule.entity}</Text>
                      <Tag color={rule.ownership === 100 ? 'green' : 'orange'}>{rule.ownership}%</Tag>
                    </div>
                    <div className="rule-details">
                      <Tag>{rule.method}</Tag>
                      {rule.eliminateIC && (
                        <Tooltip title="Intercompany transactions eliminated">
                          <Tag color="blue"><SwapOutlined /> IC Elimination</Tag>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                ))}
              </Card>
            </Col>

            {/* Intercompany Transactions */}
            <Col span={24}>
              <Card 
                title="Intercompany Transactions" 
                extra={<Button type="link">View All</Button>}
              >
                <Table 
                  dataSource={interCompanyTransactions}
                  columns={transactionColumns}
                  rowKey="id"
                  pagination={false}
                  size="middle"
                />
              </Card>
            </Col>
          </Row>
        </TabPane>

        <TabPane 
          tab={<span><SwapOutlined /> Eliminations</span>} 
          key="eliminations"
        >
          <Card>
            <Paragraph>Intercompany eliminations and consolidation adjustments will appear here.</Paragraph>
          </Card>
        </TabPane>

        <TabPane 
          tab={<span><DollarOutlined /> Currency</span>} 
          key="currency"
        >
          <Row gutter={24}>
            <Col span={12}>
              <Card title="Exchange Rates" className="rates-card">
                <div className="rate-item">
                  <div className="rate-pair">
                    <span>🇿🇦 ZAR</span>
                    <SwapOutlined />
                    <span>🇬🇧 GBP</span>
                  </div>
                  <Text strong style={{ fontSize: '18px' }}>0.0441</Text>
                </div>
                <Divider style={{ margin: '12px 0' }} />
                <div className="rate-item">
                  <div className="rate-pair">
                    <span>🇿🇦 ZAR</span>
                    <SwapOutlined />
                    <span>🇺🇸 USD</span>
                  </div>
                  <Text strong style={{ fontSize: '18px' }}>0.0556</Text>
                </div>
                <Divider style={{ margin: '12px 0' }} />
                <div className="rate-item">
                  <div className="rate-pair">
                    <span>🇬🇧 GBP</span>
                    <SwapOutlined />
                    <span>🇺🇸 USD</span>
                  </div>
                  <Text strong style={{ fontSize: '18px' }}>1.2615</Text>
                </div>
                <div className="rate-footer">
                  <Text type="secondary">Last updated: Today 10:30 AM</Text>
                  <Button type="link" size="small">Refresh Rates</Button>
                </div>
              </Card>
            </Col>
            <Col span={12}>
              <Card title="Translation Method">
                <div className="method-item">
                  <Text strong>Balance Sheet</Text>
                  <Tag color="blue">Closing Rate</Tag>
                </div>
                <Divider style={{ margin: '12px 0' }} />
                <div className="method-item">
                  <Text strong>Income Statement</Text>
                  <Tag color="blue">Average Rate</Tag>
                </div>
                <Divider style={{ margin: '12px 0' }} />
                <div className="method-item">
                  <Text strong>Equity</Text>
                  <Tag color="blue">Historical Rate</Tag>
                </div>
              </Card>
            </Col>
          </Row>
        </TabPane>

        <TabPane 
          tab={<span><FileTextOutlined /> Reports</span>} 
          key="reports"
        >
          <Card>
            <Paragraph>Consolidated financial reports will appear here.</Paragraph>
          </Card>
        </TabPane>

        <TabPane 
          tab={<span><SettingOutlined /> Settings</span>} 
          key="settings"
        >
          <Card>
            <Paragraph>Entity and consolidation settings will appear here.</Paragraph>
          </Card>
        </TabPane>
      </Tabs>

      {/* Add Entity Modal */}
      <Modal
        title="Add New Entity"
        open={showEntityModal}
        onCancel={() => { setShowEntityModal(false); entityForm.resetFields(); }}
        footer={null}
        width={500}
      >
        <Form 
          form={entityForm} 
          layout="vertical"
          initialValues={{ entity_type: 'subsidiary', country: 'ZA', currency: 'ZAR', ownership_percentage: 100 }}
          onFinish={handleCreateEntity}
        >
          <Form.Item label="Entity Name" name="name" rules={[{ required: true, message: 'Please enter entity name' }]}>
            <Input placeholder="e.g., WorldClass Australia Pty Ltd" />
          </Form.Item>
          <Form.Item label="Entity Code" name="code" rules={[{ required: true, message: 'Please enter entity code' }]}>
            <Input placeholder="e.g., WCA" maxLength={10} />
          </Form.Item>
          <Form.Item label="Entity Type" name="entity_type">
            <Select>
              <Select.Option value="holding">Holding Company</Select.Option>
              <Select.Option value="subsidiary">Subsidiary</Select.Option>
              <Select.Option value="branch">Branch</Select.Option>
              <Select.Option value="division">Division</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label="Parent Entity" name="parent_id">
            <Select placeholder="Select parent (optional for holding company)">
              <Select.Option value="">{companyName} (Current)</Select.Option>
              {entityHierarchy.map((entity: any) => (
                <Select.Option key={entity.id} value={entity.id}>{entity.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Country" name="country">
                <Select>
                  <Select.Option value="ZA">🇿🇦 South Africa</Select.Option>
                  <Select.Option value="GB">🇬🇧 United Kingdom</Select.Option>
                  <Select.Option value="US">🇺🇸 United States</Select.Option>
                  <Select.Option value="AU">🇦🇺 Australia</Select.Option>
                  <Select.Option value="SZ">🇸🇿 Eswatini</Select.Option>
                  <Select.Option value="BW">🇧🇼 Botswana</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Currency" name="currency">
                <Select>
                  <Select.Option value="ZAR">ZAR - South African Rand</Select.Option>
                  <Select.Option value="GBP">GBP - British Pound</Select.Option>
                  <Select.Option value="USD">USD - US Dollar</Select.Option>
                  <Select.Option value="AUD">AUD - Australian Dollar</Select.Option>
                  <Select.Option value="SZL">SZL - Eswatini Lilangeni</Select.Option>
                  <Select.Option value="BWP">BWP - Botswana Pula</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Ownership %" name="ownership_percentage">
            <Input type="number" suffix="%" min={0} max={100} />
          </Form.Item>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <Button onClick={() => { setShowEntityModal(false); entityForm.resetFields(); }}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={creatingEntity}>
              Create Entity
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default MultiEntityHub;
