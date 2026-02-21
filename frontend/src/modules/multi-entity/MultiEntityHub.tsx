import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Row,
  Col,
  Button,
  Typography,
  Tag,
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
  Spin,
  DatePicker,
  InputNumber,
  Empty,
  Alert,
  Descriptions,
  Popconfirm,
} from 'antd';
import apiClient from '../../services/api';
import { useClient } from '../../contexts/ClientContext';
import { useEntity } from '../../contexts/EntityContext';
import {
  BankOutlined,
  GlobalOutlined,
  SettingOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  PlusOutlined,
  ApartmentOutlined,
  DollarOutlined,
  FileTextOutlined,
  SwapOutlined,
  PieChartOutlined,
  SafetyCertificateOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import './MultiEntityHub.css';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;
const { RangePicker } = DatePicker;

// ============================================================================
// TYPES
// ============================================================================

interface DashboardStats {
  totalEntities: number;
  activeEntities: number;
  totalTransactions: number;
  totalTransactionAmount: number;
  pendingTransactions: number;
}

interface ExchangeRate {
  base_currency: string;
  target_currency: string;
  rate: number;
  inverse_rate?: number;
  source: string;
}

interface ConsolidationRule {
  id: string;
  code: string;
  name: string;
  rule_type: string;
  entity_ids: string[] | null;
  transaction_types: string[] | null;
  source_account_pattern: string;
  target_account: string;
  percentage: number;
  is_active: boolean;
  created_at: string;
}

interface ConsolidationPeriod {
  id: string;
  period_start: string;
  period_end: string;
  period_name: string;
  status: string;
  consolidated_at: string;
  total_eliminations: number;
}

// ============================================================================
// COMPONENT
// ============================================================================

const MultiEntityHub: React.FC = () => {
  const navigate = useNavigate();
  const { currentClient } = useClient();
  const { switchEntity, currentEntity } = useEntity();
  const companyName = currentClient?.name || 'Your Company';

  const [activeTab, setActiveTab] = useState('overview');
  const [showEntityModal, setShowEntityModal] = useState(false);
  const [showIntercoModal, setShowIntercoModal] = useState(false);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [showConsolidateModal, setShowConsolidateModal] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creatingEntity, setCreatingEntity] = useState(false);
  const [creatingTransaction, setCreatingTransaction] = useState(false);
  const [entityForm] = Form.useForm();
  const [intercoForm] = Form.useForm();
  const [ruleForm] = Form.useForm();

  // Data state
  const [entityHierarchy, setEntityHierarchy] = useState<any[]>([]);
  const [flatEntities, setFlatEntities] = useState<any[]>([]);
  const [interCompanyTransactions, setInterCompanyTransactions] = useState<any[]>([]);
  const [consolidationRules, setConsolidationRules] = useState<ConsolidationRule[]>([]);
  const [consolidationPeriods, setConsolidationPeriods] = useState<ConsolidationPeriod[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalEntities: 0, activeEntities: 0, totalTransactions: 0,
    totalTransactionAmount: 0, pendingTransactions: 0,
  });
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
  const [ratesLastUpdated, setRatesLastUpdated] = useState<string>('');

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [hierarchyRes, transactionsRes, rulesRes, statsRes, ratesRes, periodsRes] = await Promise.all([
        apiClient.get('/api/v2/entities/hierarchy').catch(() => ({ data: { data: [] } })),
        apiClient.get('/api/v2/multi-entity/intercompany').catch(() => ({ data: { data: [] } })),
        apiClient.get('/api/v2/multi-entity/consolidation-rules').catch(() => ({ data: { data: [] } })),
        apiClient.get('/api/v2/multi-entity/stats').catch(() => ({ data: { data: {} } })),
        apiClient.get('/api/v2/multi-entity/exchange-rates').catch(() => ({ data: { data: { rates: [], lastUpdated: '' } } })),
        apiClient.get('/api/v2/multi-entity/consolidation/periods').catch(() => ({ data: { data: [] } })),
      ]);

      const hierarchy = hierarchyRes.data?.data || hierarchyRes.data || [];
      setEntityHierarchy(hierarchy);

      const flat: any[] = [];
      const flattenEntities = (nodes: any[]) => {
        nodes.forEach((n: any) => {
          flat.push({ id: n.id, name: n.name, code: n.code, country: n.country, currency: n.currency });
          if (n.children) flattenEntities(n.children);
        });
      };
      flattenEntities(hierarchy);
      setFlatEntities(flat);

      setInterCompanyTransactions(transactionsRes.data?.data || transactionsRes.data || []);
      setConsolidationRules(rulesRes.data?.data || rulesRes.data || []);

      const stats = statsRes.data?.data || {};
      setDashboardStats({
        totalEntities: stats.totalEntities || 0,
        activeEntities: stats.activeEntities || 0,
        totalTransactions: stats.totalTransactions || 0,
        totalTransactionAmount: parseFloat(stats.totalTransactionAmount) || 0,
        pendingTransactions: stats.pendingTransactions || 0,
      });

      const ratesData = ratesRes.data?.data || {};
      setExchangeRates(ratesData.rates || []);
      setRatesLastUpdated(ratesData.lastUpdated || '');
      setConsolidationPeriods(periodsRes.data?.data || periodsRes.data || []);
    } catch (error) {
      console.error('Failed to fetch multi-entity data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

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
        ownership_percentage: values.ownership_percentage || 100,
      });
      message.success('Entity created successfully!');
      entityForm.resetFields();
      setShowEntityModal(false);
      fetchData();
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Failed to create entity');
    } finally {
      setCreatingEntity(false);
    }
  };

  const handleDeleteEntity = async (entityId: string, entityName: string) => {
    Modal.confirm({
      title: 'Delete Entity',
      content: `Are you sure you want to delete "${entityName}"? This action cannot be undone.`,
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          await apiClient.delete(`/api/v2/entities/${entityId}`);
          message.success('Entity deleted');
          fetchData();
        } catch (err: any) {
          message.error(err.response?.data?.error || 'Failed to delete entity');
        }
      },
    });
  };

  const handleCreateIntercoTransaction = async (values: any) => {
    setCreatingTransaction(true);
    try {
      await apiClient.post('/api/v2/multi-entity/intercompany', {
        source_entity_id: values.source_entity_id,
        target_entity_id: values.target_entity_id,
        transaction_type: values.transaction_type,
        transaction_date: values.transaction_date?.format('YYYY-MM-DD') || new Date().toISOString().split('T')[0],
        amount: values.amount,
        currency: values.currency || 'ZAR',
        description: values.description,
      });
      message.success('Intercompany transaction created');
      intercoForm.resetFields();
      setShowIntercoModal(false);
      fetchData();
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Failed to create transaction');
    } finally {
      setCreatingTransaction(false);
    }
  };

  const handleCreateRule = async (values: any) => {
    try {
      await apiClient.post('/api/v2/multi-entity/consolidation-rules', {
        code: values.code, name: values.name, rule_type: values.rule_type,
        source_account_pattern: values.source_account_pattern || null,
        target_account: values.target_account || null,
        percentage: values.percentage || 100,
      });
      message.success('Consolidation rule created');
      ruleForm.resetFields();
      setShowRuleModal(false);
      fetchData();
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Failed to create rule');
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    try {
      await apiClient.delete(`/api/v2/multi-entity/consolidation-rules/${ruleId}`);
      message.success('Rule deleted');
      fetchData();
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Failed to delete rule');
    }
  };

  const handleConsolidate = async (periodStart: string, periodEnd: string) => {
    setSyncing(true);
    try {
      const res = await apiClient.post('/api/v2/multi-entity/consolidation/run', { periodStart, periodEnd });
      if (res.data.success) {
        const data = res.data.data || {};
        message.success(
          `Consolidation completed: ${data.transactionsEliminated || 0} transactions eliminated | R ${(data.totalEliminations || 0).toLocaleString()}`
        );
        setShowConsolidateModal(false);
        fetchData();
      } else {
        message.error(res.data.error || 'Consolidation failed');
      }
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Consolidation failed');
    } finally {
      setSyncing(false);
    }
  };

  // ============================================================================
  // HELPERS
  // ============================================================================

  const countEntities = (entities: any[]): number =>
    entities.reduce((c, e) => c + 1 + (e.children ? countEntities(e.children) : 0), 0);

  const getCountries = (entities: any[]): Set<string> => {
    const countries = new Set<string>();
    entities.forEach(e => {
      if (e.country) countries.add(e.country);
      if (e.children) getCountries(e.children).forEach(c => countries.add(c));
    });
    return countries;
  };

  const totalEntities = dashboardStats.totalEntities || countEntities(entityHierarchy);
  const totalCountries = getCountries(entityHierarchy).size || 1;

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { color: string; text: string }> = {
      active: { color: '#10b981', text: 'Active' },
      pending: { color: '#f59e0b', text: 'Pending' },
      inactive: { color: '#64748b', text: 'Inactive' },
      posted: { color: '#10b981', text: 'Posted' },
      approved: { color: '#10b981', text: 'Approved' },
      completed: { color: '#10b981', text: 'Completed' },
      draft: { color: '#64748b', text: 'Draft' },
      eliminated: { color: '#8b5cf6', text: 'Eliminated' },
      rejected: { color: '#ef4444', text: 'Rejected' },
    };
    const config = configs[status?.toLowerCase()] || { color: '#64748b', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const getCountryFlag = (code: string) => {
    const flags: Record<string, string> = {
      ZA: '\u{1F1FF}\u{1F1E6}', GB: '\u{1F1EC}\u{1F1E7}', US: '\u{1F1FA}\u{1F1F8}',
      EU: '\u{1F1EA}\u{1F1FA}', AU: '\u{1F1E6}\u{1F1FA}', SZ: '\u{1F1F8}\u{1F1FF}', BW: '\u{1F1E7}\u{1F1FC}',
    };
    return flags[code] || '\u{1F30D}';
  };

  const pendingEliminations = interCompanyTransactions.filter(
    (t: any) => t.elimination_status === 'pending' || (!t.elimination_status && t.status === 'pending')
  );

  // ============================================================================
  // TABLE COLUMNS
  // ============================================================================

  const transactionColumns = [
    { title: 'Date', dataIndex: 'transaction_date', key: 'date', width: 110,
      render: (d: string) => d ? new Date(d).toLocaleDateString() : '-' },
    { title: 'From', key: 'from',
      render: (_: any, r: any) => <Text>{r.source_entity_name || r.source_entity_id?.substring(0, 8)}</Text> },
    { title: 'To', key: 'to',
      render: (_: any, r: any) => <Text>{r.target_entity_name || r.target_entity_id?.substring(0, 8)}</Text> },
    { title: 'Type', dataIndex: 'transaction_type', key: 'type',
      render: (t: string) => <Tag color="#667eea">{t || 'transfer'}</Tag> },
    { title: 'Amount', key: 'amount', align: 'right' as const,
      render: (_: any, r: any) => <Text strong>{r.currency || 'ZAR'} {parseFloat(r.amount || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</Text> },
    { title: 'Elimination', dataIndex: 'elimination_status', key: 'elimination',
      render: (s: string) => getStatusBadge(s || 'pending') },
    { title: 'Status', dataIndex: 'status', key: 'status',
      render: (s: string) => getStatusBadge(s || 'pending') },
  ];

  const ruleColumns = [
    { title: 'Code', dataIndex: 'code', key: 'code', render: (t: string) => <Text strong>{t}</Text> },
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Type', dataIndex: 'rule_type', key: 'type',
      render: (t: string) => <Tag color={t === 'elimination' ? 'purple' : t === 'adjustment' ? 'blue' : 'orange'}>{t}</Tag> },
    { title: 'Source', dataIndex: 'source_account_pattern', key: 'src' },
    { title: 'Target', dataIndex: 'target_account', key: 'tgt' },
    { title: '%', dataIndex: 'percentage', key: 'pct', render: (p: number) => `${p}%` },
    { title: 'Active', dataIndex: 'is_active', key: 'active',
      render: (a: boolean) => <Tag color={a ? 'green' : 'red'}>{a ? 'Yes' : 'No'}</Tag> },
    { title: '', key: 'actions',
      render: (_: any, r: ConsolidationRule) => (
        <Popconfirm title="Delete this rule?" onConfirm={() => handleDeleteRule(r.id)}>
          <Button size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ) },
  ];

  const periodColumns = [
    { title: 'Period', dataIndex: 'period_name', key: 'name' },
    { title: 'Start', dataIndex: 'period_start', key: 'start',
      render: (d: string) => d ? new Date(d).toLocaleDateString() : '-' },
    { title: 'End', dataIndex: 'period_end', key: 'end',
      render: (d: string) => d ? new Date(d).toLocaleDateString() : '-' },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s: string) => getStatusBadge(s) },
    { title: 'Eliminations', dataIndex: 'total_eliminations', key: 'elim', align: 'right' as const,
      render: (a: number) => `R ${parseFloat(String(a || 0)).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}` },
    { title: 'Run Date', dataIndex: 'consolidated_at', key: 'run',
      render: (d: string) => d ? new Date(d).toLocaleString() : '-' },
  ];

  // ============================================================================
  // TREE
  // ============================================================================

  const transformToTreeData = (entities: any[]): any[] =>
    entities.map(e => ({
      key: e.id, title: e.name, name: e.name, code: e.code,
      type: e.type || 'subsidiary', country: e.country || 'ZA',
      currency: e.currency || 'ZAR', status: e.status || 'active',
      ownership: e.ownership_percentage || 100,
      children: e.children?.length > 0 ? transformToTreeData(e.children) : undefined,
    }));

  const renderTreeNode = (node: any) => ({
    title: (
      <div className="entity-tree-node" onClick={() => navigate(`/app/multi-entity/${node.key}`)} style={{ cursor: 'pointer' }}>
        <div className="node-main">
          <div className="node-icon"><BankOutlined /></div>
          <div className="node-info">
            <div className="node-title-row">
              <Text strong style={{ fontSize: '15px' }}>{node.name}</Text>
              <Tag color="blue" style={{ marginLeft: 8 }}>{node.code}</Tag>
              {currentEntity?.id === node.key && <Tag color="green" style={{ marginLeft: 4 }}>● Working</Tag>}
            </div>
            <div className="node-meta">
              <span>{getCountryFlag(node.country)} {node.country}</span>
              <Tag>{node.type}</Tag>
              <Tag color={node.currency === 'ZAR' ? 'green' : node.currency === 'GBP' ? 'blue' : 'purple'}>{node.currency}</Tag>
              <span style={{ fontSize: '12px', color: '#666' }}>{node.ownership}% owned</span>
              {getStatusBadge(node.status)}
            </div>
          </div>
        </div>
        <Space className="node-actions" onClick={(e) => e.stopPropagation()}>
          <Button type="primary" size="small"
            onClick={(e) => { e.stopPropagation(); switchEntity(node.key); message.success(`Switched to ${node.name}`); }}
            style={{ background: currentEntity?.id === node.key ? '#52c41a' : undefined }}>
            {currentEntity?.id === node.key ? '✓ Working' : 'Work Here'}
          </Button>
          <Button size="small" onClick={(e) => { e.stopPropagation(); navigate(`/app/multi-entity/${node.key}`); }}>Details</Button>
          <Button size="small" danger onClick={(e) => { e.stopPropagation(); handleDeleteEntity(node.key, node.name); }}>Delete</Button>
        </Space>
      </div>
    ),
    key: node.key,
    children: node.children?.map(renderTreeNode),
  });

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="multi-entity-hub">
      {/* Header */}
      <div className="hub-header">
        <div className="hub-title-section">
          <div className="entity-logo"><ApartmentOutlined className="logo-icon" /></div>
          <div>
            <Title level={2} style={{ margin: 0 }}>Multi-Entity Management</Title>
            <Text type="secondary">Consolidated financial management across your group structure</Text>
          </div>
        </div>
        <div className="hub-actions">
          <Button icon={<SyncOutlined spin={syncing} />} onClick={() => setShowConsolidateModal(true)} loading={syncing}>Run Consolidation</Button>
          <Button icon={<PlusOutlined />} onClick={() => setShowEntityModal(true)}>Add Entity</Button>
          <Button icon={<SwapOutlined />} onClick={() => setShowIntercoModal(true)}>New IC Transaction</Button>
          <Button type="primary" icon={<FileTextOutlined />} onClick={() => setActiveTab('reports')}>Consolidated Report</Button>
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
            <Statistic title="Total Entities" value={totalEntities} valueStyle={{ color: 'white' }} prefix={<GlobalOutlined />} />
          </Col>
          <Col span={3}>
            <Statistic title="Countries" value={totalCountries} valueStyle={{ color: 'white' }} prefix={<span>{'\u{1F30D}'}</span>} />
          </Col>
          <Col span={4}>
            <Statistic title="IC Transactions" value={dashboardStats.totalTransactions} valueStyle={{ color: 'white' }} prefix={<SwapOutlined />} />
          </Col>
          <Col span={4}>
            <Statistic title="Pending Eliminations" value={pendingEliminations.length}
              valueStyle={{ color: pendingEliminations.length > 0 ? '#fbbf24' : '#86efac', fontSize: '20px' }}
              prefix={pendingEliminations.length > 0 ? <WarningOutlined /> : <CheckCircleOutlined />} />
          </Col>
          <Col span={4}>
            <Statistic title="IC Total" value={dashboardStats.totalTransactionAmount} prefix="R" precision={0} valueStyle={{ color: 'white', fontSize: '16px' }} />
          </Col>
        </Row>
      </Card>

      {/* Tabs */}
      <Tabs activeKey={activeTab} onChange={setActiveTab} className="hub-tabs">

        {/* ===== STRUCTURE ===== */}
        <TabPane tab={<span><ApartmentOutlined /> Structure</span>} key="overview">
          <Row gutter={[24, 24]}>
            <Col span={14}>
              <Card title={<div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><BankOutlined /><span>Entity Hierarchy</span><Tag color="blue">{totalEntities} entities</Tag></div>}
                className="hierarchy-card" extra={<Button size="small" icon={<PlusOutlined />} onClick={() => setShowEntityModal(true)}>Add</Button>}>
                <div className="parent-company-header">
                  <div className="parent-icon"><BankOutlined style={{ fontSize: 24, color: 'white' }} /></div>
                  <div className="parent-info">
                    <Text strong style={{ fontSize: '16px' }}>{companyName}</Text>
                    <Text type="secondary" style={{ display: 'block', fontSize: '12px' }}>Holding Company &bull; Parent Entity</Text>
                  </div>
                </div>
                {entityHierarchy.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: '#999' }}>
                    <ApartmentOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                    <p>No subsidiaries yet. Click &quot;Add&quot; to create your first entity.</p>
                  </div>
                ) : (
                  <Tree showLine={{ showLeafIcon: false }} defaultExpandAll
                    treeData={transformToTreeData(entityHierarchy).map(renderTreeNode)} className="entity-tree" />
                )}
              </Card>
            </Col>
            <Col span={10}>
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Card className="stat-card">
                    <Statistic title="Active Entities" value={dashboardStats.activeEntities || totalEntities} valueStyle={{ color: '#10b981' }} prefix={<BankOutlined />} />
                    <div className="stat-footer"><Text type="secondary">{totalCountries} {totalCountries === 1 ? 'country' : 'countries'}</Text></div>
                  </Card>
                </Col>
                <Col span={12}>
                  <Card className="stat-card">
                    <Statistic title="IC Balance" value={dashboardStats.totalTransactionAmount} prefix="R" precision={0} valueStyle={{ color: '#667eea' }} />
                    <div className="stat-footer"><Text type="secondary">{dashboardStats.totalTransactions} transactions</Text></div>
                  </Card>
                </Col>
                <Col span={12}>
                  <Card className="stat-card">
                    <Statistic title="Pending Eliminations" value={pendingEliminations.length}
                      valueStyle={{ color: pendingEliminations.length > 0 ? '#f59e0b' : '#10b981' }} />
                    <div className="stat-footer">{pendingEliminations.length > 0 ? <Text type="warning">Requires review</Text> : <Text type="success">All clear</Text>}</div>
                  </Card>
                </Col>
                <Col span={12}>
                  <Card className="stat-card">
                    <Statistic title="Consolidation Rules" value={consolidationRules.filter(r => r.is_active).length} valueStyle={{ color: '#3b82f6' }} />
                    <div className="stat-footer"><Text type="secondary">{consolidationRules.length} total rules</Text></div>
                  </Card>
                </Col>
              </Row>
              <Card title="Consolidation Rules" style={{ marginTop: 16 }} className="rules-card"
                extra={<Button size="small" icon={<PlusOutlined />} onClick={() => setShowRuleModal(true)}>Add</Button>}>
                {consolidationRules.length === 0 ? (
                  <Empty description="No consolidation rules" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ) : consolidationRules.slice(0, 5).map(rule => (
                  <div key={rule.id || rule.code} className="rule-item">
                    <div className="rule-entity"><Text strong>{rule.name}</Text><Tag color={rule.is_active ? 'green' : 'red'}>{rule.is_active ? 'Active' : 'Off'}</Tag></div>
                    <div className="rule-details"><Tag color={rule.rule_type === 'elimination' ? 'purple' : 'blue'}>{rule.rule_type}</Tag><Text type="secondary">{rule.percentage}%</Text></div>
                  </div>
                ))}
              </Card>
            </Col>
            <Col span={24}>
              <Card title={<span><SwapOutlined style={{ marginRight: 8 }} />Intercompany Transactions<Tag color="blue" style={{ marginLeft: 8 }}>{interCompanyTransactions.length}</Tag></span>}
                extra={<Space><Button icon={<PlusOutlined />} onClick={() => setShowIntercoModal(true)}>New Transaction</Button><Button type="link" onClick={() => setActiveTab('eliminations')}>View All</Button></Space>}>
                <Table dataSource={interCompanyTransactions} columns={transactionColumns}
                  rowKey={(r: any) => r.id || r.transaction_id || Math.random().toString()}
                  pagination={{ pageSize: 10 }} size="middle"
                  locale={{ emptyText: <Empty description="No intercompany transactions yet" /> }} />
              </Card>
            </Col>
          </Row>
        </TabPane>

        {/* ===== ELIMINATIONS ===== */}
        <TabPane tab={<span><SwapOutlined /> Eliminations <Badge count={pendingEliminations.length} style={{ marginLeft: 4 }} /></span>} key="eliminations">
          <Row gutter={[24, 24]}>
            <Col span={24}>
              <Alert message="Intercompany Elimination"
                description="ICT entries must be eliminated during consolidation to avoid double-counting revenue/expenses between group entities. Use 'Run Consolidation' to process pending eliminations."
                type="info" showIcon style={{ marginBottom: 16 }} />
            </Col>
            <Col span={8}><Card><Statistic title="Pending Eliminations" value={pendingEliminations.length} valueStyle={{ color: '#f59e0b' }} prefix={<WarningOutlined />} /></Card></Col>
            <Col span={8}><Card><Statistic title="Pending Amount" value={pendingEliminations.reduce((s: number, t: any) => s + parseFloat(t.amount || 0), 0)} prefix="R" precision={2} valueStyle={{ color: '#ef4444' }} /></Card></Col>
            <Col span={8}><Card><Statistic title="Eliminated" value={interCompanyTransactions.filter((t: any) => t.elimination_status === 'eliminated').length} valueStyle={{ color: '#10b981' }} prefix={<CheckCircleOutlined />} /></Card></Col>
            <Col span={24}>
              <Card title="All Intercompany Transactions"
                extra={<Space>
                  <Button type="primary" icon={<PlayCircleOutlined />} onClick={() => setShowConsolidateModal(true)} loading={syncing}>Run Elimination</Button>
                  <Button icon={<PlusOutlined />} onClick={() => setShowIntercoModal(true)}>Add Transaction</Button>
                </Space>}>
                <Table dataSource={interCompanyTransactions} columns={transactionColumns}
                  rowKey={(r: any) => r.id || r.transaction_id || Math.random().toString()}
                  pagination={{ pageSize: 20, showTotal: (t) => `${t} transactions` }} size="middle"
                  locale={{ emptyText: <Empty description="No intercompany transactions" /> }} />
              </Card>
            </Col>
          </Row>
        </TabPane>

        {/* ===== CURRENCY ===== */}
        <TabPane tab={<span><DollarOutlined /> Currency</span>} key="currency">
          <Row gutter={24}>
            <Col span={12}>
              <Card title="Exchange Rates" className="rates-card" extra={<Button icon={<ReloadOutlined />} size="small" onClick={fetchData}>Refresh</Button>}>
                {exchangeRates.length === 0 ? <Empty description="No exchange rates available" /> : exchangeRates.map((rate, idx) => (
                  <React.Fragment key={idx}>
                    {idx > 0 && <Divider style={{ margin: '12px 0' }} />}
                    <div className="rate-item">
                      <div className="rate-pair">
                        <span>{getCountryFlag(rate.base_currency === 'ZAR' ? 'ZA' : rate.base_currency === 'GBP' ? 'GB' : 'US')} {rate.base_currency}</span>
                        <SwapOutlined />
                        <span>{getCountryFlag(rate.target_currency === 'ZAR' ? 'ZA' : rate.target_currency === 'GBP' ? 'GB' : rate.target_currency === 'USD' ? 'US' : 'EU')} {rate.target_currency}</span>
                      </div>
                      <Text strong style={{ fontSize: '18px' }}>{rate.rate?.toFixed(4)}</Text>
                    </div>
                  </React.Fragment>
                ))}
                <div className="rate-footer" style={{ marginTop: 16 }}>
                  <Text type="secondary">Last updated: {ratesLastUpdated ? new Date(ratesLastUpdated).toLocaleString() : 'Default rates'}</Text>
                  {exchangeRates.some(r => r.source === 'default') && <Tag color="orange" style={{ marginLeft: 8 }}>Using default rates</Tag>}
                </div>
              </Card>
            </Col>
            <Col span={12}>
              <Card title="Translation Method">
                <div className="method-item"><Text strong>Balance Sheet</Text><Tag color="blue">Closing Rate</Tag></div>
                <Divider style={{ margin: '12px 0' }} />
                <div className="method-item"><Text strong>Income Statement</Text><Tag color="blue">Average Rate</Tag></div>
                <Divider style={{ margin: '12px 0' }} />
                <div className="method-item"><Text strong>Equity</Text><Tag color="blue">Historical Rate</Tag></div>
              </Card>
              <Card title="Entity Currencies" style={{ marginTop: 16 }}>
                {flatEntities.map((e, i) => (
                  <div key={e.id || i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < flatEntities.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                    <Text>{getCountryFlag(e.country || 'ZA')} {e.name}</Text>
                    <Tag color={e.currency === 'ZAR' ? 'green' : e.currency === 'GBP' ? 'blue' : 'purple'}>{e.currency || 'ZAR'}</Tag>
                  </div>
                ))}
                {flatEntities.length === 0 && <Empty description="No entities" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
              </Card>
            </Col>
          </Row>
        </TabPane>

        {/* ===== REPORTS ===== */}
        <TabPane tab={<span><FileTextOutlined /> Reports</span>} key="reports">
          <Row gutter={[24, 24]}>
            <Col span={24}>
              <Alert message="Consolidated Reporting"
                description="Generate consolidated financial reports across all entities. Reports include intercompany elimination adjustments."
                type="info" showIcon style={{ marginBottom: 16 }} />
            </Col>
            <Col span={8}>
              <Card hoverable onClick={() => setShowConsolidateModal(true)}>
                <Statistic title="Consolidated P&L" value="Generate" valueStyle={{ color: '#667eea', fontSize: '18px' }} prefix={<PieChartOutlined />} />
                <Text type="secondary">Profit &amp; Loss across all entities with IC eliminations</Text>
              </Card>
            </Col>
            <Col span={8}>
              <Card hoverable onClick={() => setShowConsolidateModal(true)}>
                <Statistic title="Consolidated Balance Sheet" value="Generate" valueStyle={{ color: '#10b981', fontSize: '18px' }} prefix={<FileTextOutlined />} />
                <Text type="secondary">Group balance sheet with minority interests</Text>
              </Card>
            </Col>
            <Col span={8}>
              <Card hoverable onClick={() => setActiveTab('eliminations')}>
                <Statistic title="Elimination Report" value="View" valueStyle={{ color: '#8b5cf6', fontSize: '18px' }} prefix={<SwapOutlined />} />
                <Text type="secondary">All intercompany eliminations and adjustments</Text>
              </Card>
            </Col>
            <Col span={24}>
              <Card title="Consolidation History">
                <Table dataSource={consolidationPeriods} columns={periodColumns}
                  rowKey={(r: any) => r.id || Math.random().toString()}
                  pagination={{ pageSize: 10 }} size="middle"
                  locale={{ emptyText: <Empty description="No consolidation runs yet. Click 'Run Consolidation' to begin." /> }} />
              </Card>
            </Col>
          </Row>
        </TabPane>

        {/* ===== SETTINGS ===== */}
        <TabPane tab={<span><SettingOutlined /> Settings</span>} key="settings">
          <Row gutter={[24, 24]}>
            <Col span={24}>
              <Card title={<span><SafetyCertificateOutlined style={{ marginRight: 8 }} />Consolidation Elimination Rules</span>}
                extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setShowRuleModal(true)}>Add Rule</Button>}>
                <Table dataSource={consolidationRules} columns={ruleColumns}
                  rowKey={(r: any) => r.id || r.code} pagination={false} size="middle"
                  locale={{ emptyText: <Empty description="No elimination rules configured. Add rules to automate intercompany eliminations." /> }} />
              </Card>
            </Col>
            <Col span={12}>
              <Card title="Consolidation Settings">
                <Descriptions column={1} bordered size="small">
                  <Descriptions.Item label="Base Currency">ZAR (South African Rand)</Descriptions.Item>
                  <Descriptions.Item label="Reporting Standard">IFRS</Descriptions.Item>
                  <Descriptions.Item label="Consolidation Method">Full Consolidation</Descriptions.Item>
                  <Descriptions.Item label="Minority Interest">Proportional Method</Descriptions.Item>
                  <Descriptions.Item label="IC Elimination">Automatic (rule-based)</Descriptions.Item>
                </Descriptions>
              </Card>
            </Col>
            <Col span={12}>
              <Card title="Entity Configuration">
                <Paragraph type="secondary" style={{ marginBottom: 16 }}>
                  Configure individual entity settings by navigating to an entity&apos;s Settings tab.
                </Paragraph>
                {flatEntities.slice(0, 5).map(entity => (
                  <div key={entity.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                    <Space><BankOutlined /><Text>{entity.name}</Text><Tag>{entity.currency}</Tag></Space>
                    <Button size="small" onClick={() => navigate(`/app/multi-entity/${entity.id}`)}>Configure</Button>
                  </div>
                ))}
              </Card>
            </Col>
          </Row>
        </TabPane>
      </Tabs>

      {/* ===== MODALS ===== */}

      {/* Add Entity */}
      <Modal title="Add New Entity" open={showEntityModal}
        onCancel={() => { setShowEntityModal(false); entityForm.resetFields(); }} footer={null} width={500}>
        <Form form={entityForm} layout="vertical"
          initialValues={{ entity_type: 'subsidiary', country: 'ZA', currency: 'ZAR', ownership_percentage: 100 }}
          onFinish={handleCreateEntity}>
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
            <Select placeholder="Select parent (optional)">
              <Select.Option value="">{companyName} (Current)</Select.Option>
              {flatEntities.map(e => <Select.Option key={e.id} value={e.id}>{e.name}</Select.Option>)}
            </Select>
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Country" name="country">
                <Select>
                  <Select.Option value="ZA">{'\u{1F1FF}\u{1F1E6}'} South Africa</Select.Option>
                  <Select.Option value="GB">{'\u{1F1EC}\u{1F1E7}'} United Kingdom</Select.Option>
                  <Select.Option value="US">{'\u{1F1FA}\u{1F1F8}'} United States</Select.Option>
                  <Select.Option value="AU">{'\u{1F1E6}\u{1F1FA}'} Australia</Select.Option>
                  <Select.Option value="SZ">{'\u{1F1F8}\u{1F1FF}'} Eswatini</Select.Option>
                  <Select.Option value="BW">{'\u{1F1E7}\u{1F1FC}'} Botswana</Select.Option>
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
            <InputNumber min={0} max={100} style={{ width: '100%' }} />
          </Form.Item>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
            <Button onClick={() => { setShowEntityModal(false); entityForm.resetFields(); }}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={creatingEntity}>Create Entity</Button>
          </div>
        </Form>
      </Modal>

      {/* Intercompany Transaction */}
      <Modal title="New Intercompany Transaction" open={showIntercoModal}
        onCancel={() => { setShowIntercoModal(false); intercoForm.resetFields(); }} footer={null} width={550}>
        <Form form={intercoForm} layout="vertical"
          initialValues={{ currency: 'ZAR', transaction_type: 'TRANSFER' }}
          onFinish={handleCreateIntercoTransaction}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="From Entity" name="source_entity_id" rules={[{ required: true, message: 'Select source' }]}>
                <Select placeholder="Select source">
                  {flatEntities.map(e => <Select.Option key={e.id} value={e.id}>{e.name} ({e.code})</Select.Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="To Entity" name="target_entity_id" rules={[{ required: true, message: 'Select target' }]}>
                <Select placeholder="Select target">
                  {flatEntities.map(e => <Select.Option key={e.id} value={e.id}>{e.name} ({e.code})</Select.Option>)}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Type" name="transaction_type" rules={[{ required: true }]}>
                <Select>
                  <Select.Option value="TRANSFER">Transfer</Select.Option>
                  <Select.Option value="SALE">IC Sale</Select.Option>
                  <Select.Option value="PURCHASE">IC Purchase</Select.Option>
                  <Select.Option value="LOAN">Loan</Select.Option>
                  <Select.Option value="ALLOCATION">Cost Allocation</Select.Option>
                  <Select.Option value="DIVIDEND">Dividend</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Date" name="transaction_date"><DatePicker style={{ width: '100%' }} /></Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Amount" name="amount" rules={[{ required: true, message: 'Enter amount' }]}>
                <InputNumber min={0.01} style={{ width: '100%' }} precision={2} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Currency" name="currency">
                <Select><Select.Option value="ZAR">ZAR</Select.Option><Select.Option value="USD">USD</Select.Option><Select.Option value="GBP">GBP</Select.Option><Select.Option value="EUR">EUR</Select.Option></Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Description" name="description">
            <Input.TextArea rows={2} placeholder="Transaction description..." />
          </Form.Item>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
            <Button onClick={() => { setShowIntercoModal(false); intercoForm.resetFields(); }}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={creatingTransaction}>Create Transaction</Button>
          </div>
        </Form>
      </Modal>

      {/* Consolidation Rule */}
      <Modal title="Add Consolidation Rule" open={showRuleModal}
        onCancel={() => { setShowRuleModal(false); ruleForm.resetFields(); }} footer={null} width={500}>
        <Form form={ruleForm} layout="vertical" initialValues={{ rule_type: 'elimination', percentage: 100 }} onFinish={handleCreateRule}>
          <Row gutter={16}>
            <Col span={12}><Form.Item label="Rule Code" name="code" rules={[{ required: true }]}><Input placeholder="e.g., ELIM-IC-SALES" /></Form.Item></Col>
            <Col span={12}>
              <Form.Item label="Rule Type" name="rule_type" rules={[{ required: true }]}>
                <Select><Select.Option value="elimination">Elimination</Select.Option><Select.Option value="adjustment">Adjustment</Select.Option><Select.Option value="reclassification">Reclassification</Select.Option></Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Rule Name" name="name" rules={[{ required: true }]}><Input placeholder="e.g., Eliminate IC Sales Revenue" /></Form.Item>
          <Row gutter={16}>
            <Col span={12}><Form.Item label="Source Account Pattern" name="source_account_pattern"><Input placeholder="e.g., 4000-*" /></Form.Item></Col>
            <Col span={12}><Form.Item label="Target Account" name="target_account"><Input placeholder="e.g., 9100" /></Form.Item></Col>
          </Row>
          <Form.Item label="Elimination %" name="percentage"><InputNumber min={0} max={100} style={{ width: '100%' }} /></Form.Item>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
            <Button onClick={() => { setShowRuleModal(false); ruleForm.resetFields(); }}>Cancel</Button>
            <Button type="primary" htmlType="submit">Create Rule</Button>
          </div>
        </Form>
      </Modal>

      {/* Run Consolidation */}
      <Modal title="Run Consolidation" open={showConsolidateModal} onCancel={() => setShowConsolidateModal(false)} footer={null} width={450}>
        <Form layout="vertical" onFinish={(values) => {
          const [start, end] = values.period || [];
          if (start && end) handleConsolidate(start.format('YYYY-MM-DD'), end.format('YYYY-MM-DD'));
          else message.warning('Please select a consolidation period');
        }}>
          <Alert message={`${pendingEliminations.length} pending elimination(s) will be processed`}
            type={pendingEliminations.length > 0 ? 'warning' : 'success'} showIcon style={{ marginBottom: 16 }} />
          <Form.Item label="Consolidation Period" name="period" rules={[{ required: true, message: 'Select period' }]}>
            <RangePicker style={{ width: '100%' }} />
          </Form.Item>
          <Descriptions column={1} size="small" style={{ marginBottom: 16 }}>
            <Descriptions.Item label="Active Rules">{consolidationRules.filter(r => r.is_active).length}</Descriptions.Item>
            <Descriptions.Item label="Pending Transactions">{pendingEliminations.length}</Descriptions.Item>
            <Descriptions.Item label="Total Entities">{totalEntities}</Descriptions.Item>
          </Descriptions>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <Button onClick={() => setShowConsolidateModal(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={syncing} icon={<PlayCircleOutlined />}>Run Consolidation</Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default MultiEntityHub;
