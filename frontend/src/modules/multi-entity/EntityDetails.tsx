import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Typography,
  Tag,
  Statistic,
  Table,
  Tabs,
  Space,
  Spin,
  Empty,
  Modal,
  Form,
  Input,
  Select,
  message,
  Breadcrumb,
  Descriptions,
  Avatar,
} from 'antd';
import { useParams, useNavigate, Link } from 'react-router-dom';
import apiClient from '../../services/api';
import { useEntity } from '../../contexts/EntityContext';
import {
  BankOutlined,
  GlobalOutlined,
  ArrowLeftOutlined,
  EditOutlined,
  DollarOutlined,
  PlusOutlined,
  HomeOutlined,
  SafetyCertificateOutlined,
  FileTextOutlined,
  TeamOutlined,
  CreditCardOutlined,
  SwapOutlined,
  SettingOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ApartmentOutlined,
} from '@ant-design/icons';
import './MultiEntityHub.css';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

interface Entity {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  type: string;
  registration_number: string | null;
  vat_number: string | null;
  tax_number: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  country: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  currency: string;
  fiscal_year_end: string;
  parent_id: string | null;
  level: number;
  status: string;
  is_default: boolean;
  ownership_percentage: string;
  created_at: string;
  updated_at: string;
}

interface BankAccount {
  id: string;
  account_code: string;
  account_name: string;
  bank_name: string;
  account_number: string;
  branch_code: string;
  account_type: string;
  currency: string;
  current_balance: string;
  is_active: boolean;
}

const EntityDetails: React.FC = () => {
  const { entityId } = useParams<{ entityId: string }>();
  const navigate = useNavigate();
  const { switchEntity, currentEntity } = useEntity();
  
  const [entity, setEntity] = useState<Entity | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showBankModal, setShowBankModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [creatingBank, setCreatingBank] = useState(false);
  
  const [bankForm] = Form.useForm();
  const [editForm] = Form.useForm();

  const fetchEntityData = async () => {
    setLoading(true);
    try {
      // Fetch entity details
      const entityResponse = await apiClient.get(`/api/v2/entities/${entityId}`);
      if (entityResponse.data.success) {
        setEntity(entityResponse.data.data);
        editForm.setFieldsValue(entityResponse.data.data);
      }

      // Fetch bank accounts for this entity
      const bankResponse = await apiClient.get('/api/v2/cash-management/bank-accounts');
      if (bankResponse.data.success) {
        // Filter bank accounts for this entity (if entity_id field exists)
        const entityBanks = bankResponse.data.data.filter(
          (acc: any) => acc.entity_id === entityId
        );
        setBankAccounts(entityBanks.length > 0 ? entityBanks : bankResponse.data.data);
      }
    } catch (error) {
      console.error('Error fetching entity data:', error);
      message.error('Failed to load entity data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (entityId) {
      fetchEntityData();
    }
  }, [entityId]);

  const handleAddBankAccount = async (values: any) => {
    setCreatingBank(true);
    try {
      const response = await apiClient.post('/api/v2/cash-management/bank-accounts', {
        ...values,
        entity_id: entityId,
      });
      if (response.data.success) {
        message.success('Bank account created successfully!');
        setShowBankModal(false);
        bankForm.resetFields();
        fetchEntityData();
      }
    } catch (error: any) {
      message.error(error.response?.data?.error || 'Failed to create bank account');
    } finally {
      setCreatingBank(false);
    }
  };

  const handleUpdateEntity = async (values: any) => {
    try {
      const response = await apiClient.put(`/api/v2/entities/${entityId}`, values);
      if (response.data.success) {
        message.success('Entity updated successfully!');
        setShowEditModal(false);
        fetchEntityData();
      }
    } catch (error: any) {
      message.error(error.response?.data?.error || 'Failed to update entity');
    }
  };

  const getCountryFlag = (code: string) => {
    const flags: { [key: string]: string } = {
      'ZA': '🇿🇦',
      'GB': '🇬🇧',
      'US': '🇺🇸',
      'AU': '🇦🇺',
      'SZ': '🇸🇿',
      'BW': '🇧🇼',
    };
    return flags[code] || '🌍';
  };

  const getEntityTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      holding: 'gold',
      subsidiary: 'blue',
      branch: 'green',
      division: 'purple',
    };
    return colors[type] || 'default';
  };

  const bankColumns = [
    {
      title: 'Account Name',
      dataIndex: 'account_name',
      key: 'account_name',
      render: (text: string, record: BankAccount) => (
        <Space>
          <Avatar style={{ backgroundColor: '#1890ff' }} icon={<BankOutlined />} />
          <div>
            <Text strong>{text}</Text>
            <br />
            <Text type="secondary">{record.account_code}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Bank',
      dataIndex: 'bank_name',
      key: 'bank_name',
    },
    {
      title: 'Account Number',
      dataIndex: 'account_number',
      key: 'account_number',
      render: (text: string) => <Text code>****{text.slice(-4)}</Text>,
    },
    {
      title: 'Balance',
      dataIndex: 'current_balance',
      key: 'current_balance',
      render: (balance: string, record: BankAccount) => (
        <Text strong style={{ color: parseFloat(balance) >= 0 ? '#52c41a' : '#ff4d4f' }}>
          {record.currency} {parseFloat(balance).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
        </Text>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (active: boolean) => (
        <Tag color={active ? 'green' : 'red'}>
          {active ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!entity) {
    return (
      <Empty
        description="Entity not found"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      >
        <Button type="primary" onClick={() => navigate('/multi-entity')}>
          Back to Multi-Entity Hub
        </Button>
      </Empty>
    );
  }

  return (
    <div className="multi-entity-hub">
      {/* Breadcrumb Navigation */}
      <Breadcrumb style={{ marginBottom: 16 }}>
        <Breadcrumb.Item>
          <Link to="/dashboard"><HomeOutlined /> Dashboard</Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <Link to="/multi-entity"><BankOutlined /> Multi-Entity</Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>{entity.name}</Breadcrumb.Item>
      </Breadcrumb>

      {/* Header */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/multi-entity')}>
              Back
            </Button>
            <div>
              <Title level={2} style={{ margin: 0 }}>
                {getCountryFlag(entity.country)} {entity.name}
              </Title>
              <Space>
                <Tag color={getEntityTypeColor(entity.type)}>{entity.type.toUpperCase()}</Tag>
                <Tag color={entity.status === 'active' ? 'green' : 'red'}>
                  {entity.status === 'active' ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
                  {' '}{entity.status}
                </Tag>
                <Text type="secondary">Code: {entity.code}</Text>
              </Space>
            </div>
          </Space>
        </Col>
        <Col>
          <Space>
            <Button 
              type="primary"
              size="large"
              icon={<ApartmentOutlined />}
              style={{ 
                background: currentEntity?.id === entityId 
                  ? '#52c41a' 
                  : 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)',
                borderColor: '#52c41a'
              }}
              onClick={() => {
                switchEntity(entityId!);
                message.success(`Now working in ${entity.name}`);
                navigate('/app/dashboard');
              }}
            >
              {currentEntity?.id === entityId ? '✓ Currently Working Here' : `Work in ${entity.name}`}
            </Button>
            <Button icon={<EditOutlined />} onClick={() => setShowEditModal(true)}>
              Edit Entity
            </Button>
            <Button type="default" icon={<PlusOutlined />} onClick={() => setShowBankModal(true)}>
              Add Bank Account
            </Button>
          </Space>
        </Col>
      </Row>

      {/* Stats Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Bank Accounts"
              value={bankAccounts.length}
              prefix={<CreditCardOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Balance"
              value={bankAccounts.reduce((sum, acc) => sum + parseFloat(acc.current_balance || '0'), 0)}
              prefix={<DollarOutlined />}
              precision={2}
              valueStyle={{ color: '#52c41a' }}
              suffix={entity.currency}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Ownership"
              value={parseFloat(entity.ownership_percentage)}
              suffix="%"
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Fiscal Year End"
              value={entity.fiscal_year_end}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Tabs */}
      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab={<span><BankOutlined /> Overview</span>} key="overview">
            <Row gutter={24}>
              <Col span={12}>
                <Card title="Entity Information" bordered={false}>
                  <Descriptions column={1}>
                    <Descriptions.Item label="Name">{entity.name}</Descriptions.Item>
                    <Descriptions.Item label="Code">{entity.code}</Descriptions.Item>
                    <Descriptions.Item label="Type">
                      <Tag color={getEntityTypeColor(entity.type)}>{entity.type}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Country">
                      {getCountryFlag(entity.country)} {entity.country}
                    </Descriptions.Item>
                    <Descriptions.Item label="Currency">{entity.currency}</Descriptions.Item>
                    <Descriptions.Item label="Ownership">{entity.ownership_percentage}%</Descriptions.Item>
                    <Descriptions.Item label="Status">
                      <Tag color={entity.status === 'active' ? 'green' : 'red'}>{entity.status}</Tag>
                    </Descriptions.Item>
                  </Descriptions>
                </Card>
              </Col>
              <Col span={12}>
                <Card title="Registration Details" bordered={false}>
                  <Descriptions column={1}>
                    <Descriptions.Item label="Registration Number">
                      {entity.registration_number || <Text type="secondary">Not set</Text>}
                    </Descriptions.Item>
                    <Descriptions.Item label="VAT Number">
                      {entity.vat_number || <Text type="secondary">Not set</Text>}
                    </Descriptions.Item>
                    <Descriptions.Item label="Tax Number">
                      {entity.tax_number || <Text type="secondary">Not set</Text>}
                    </Descriptions.Item>
                    <Descriptions.Item label="Email">
                      {entity.email || <Text type="secondary">Not set</Text>}
                    </Descriptions.Item>
                    <Descriptions.Item label="Phone">
                      {entity.phone || <Text type="secondary">Not set</Text>}
                    </Descriptions.Item>
                  </Descriptions>
                </Card>
              </Col>
            </Row>
          </TabPane>

          <TabPane tab={<span><CreditCardOutlined /> Bank Accounts ({bankAccounts.length})</span>} key="banking">
            <div style={{ marginBottom: 16 }}>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowBankModal(true)}>
                Add Bank Account
              </Button>
            </div>
            {bankAccounts.length === 0 ? (
              <Empty description="No bank accounts yet. Add one to get started.">
                <Button type="primary" onClick={() => setShowBankModal(true)}>
                  Add Bank Account
                </Button>
              </Empty>
            ) : (
              <Table
                columns={bankColumns}
                dataSource={bankAccounts}
                rowKey="id"
                pagination={false}
              />
            )}
          </TabPane>

          <TabPane tab={<span><SwapOutlined /> Transactions</span>} key="transactions">
            <Empty description="Transaction history will appear here">
              <Paragraph type="secondary">
                Import bank statements or record transactions to see history.
              </Paragraph>
            </Empty>
          </TabPane>

          <TabPane tab={<span><FileTextOutlined /> Documents</span>} key="documents">
            <Empty description="Entity documents will appear here">
              <Paragraph type="secondary">
                Upload registration certificates, tax clearances, and other entity documents.
              </Paragraph>
            </Empty>
          </TabPane>

          <TabPane tab={<span><SettingOutlined /> Settings</span>} key="settings">
            <Card title="Entity Settings" bordered={false}>
              <Form layout="vertical">
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item label="Default Currency">
                      <Select defaultValue={entity.currency} disabled>
                        <Select.Option value="ZAR">ZAR - South African Rand</Select.Option>
                        <Select.Option value="USD">USD - US Dollar</Select.Option>
                        <Select.Option value="GBP">GBP - British Pound</Select.Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="Fiscal Year End">
                      <Input value={entity.fiscal_year_end} disabled />
                    </Form.Item>
                  </Col>
                </Row>
                <Button type="primary" icon={<EditOutlined />} onClick={() => setShowEditModal(true)}>
                  Edit Entity Settings
                </Button>
              </Form>
            </Card>
          </TabPane>
        </Tabs>
      </Card>

      {/* Add Bank Account Modal */}
      <Modal
        title="Add Bank Account"
        open={showBankModal}
        onCancel={() => { setShowBankModal(false); bankForm.resetFields(); }}
        footer={null}
        width={500}
      >
        <Form
          form={bankForm}
          layout="vertical"
          onFinish={handleAddBankAccount}
          initialValues={{ account_type: 'checking', currency: entity.currency }}
        >
          <Form.Item
            label="Account Name"
            name="account_name"
            rules={[{ required: true, message: 'Please enter account name' }]}
          >
            <Input placeholder="e.g., SGBS Construction - Standard Bank" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Bank Name"
                name="bank_name"
                rules={[{ required: true, message: 'Please select bank' }]}
              >
                <Select placeholder="Select bank">
                  <Select.Option value="Standard Bank">Standard Bank</Select.Option>
                  <Select.Option value="FNB">FNB</Select.Option>
                  <Select.Option value="ABSA">ABSA</Select.Option>
                  <Select.Option value="Nedbank">Nedbank</Select.Option>
                  <Select.Option value="Capitec">Capitec</Select.Option>
                  <Select.Option value="Investec">Investec</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Account Type"
                name="account_type"
              >
                <Select>
                  <Select.Option value="checking">Checking / Current</Select.Option>
                  <Select.Option value="savings">Savings</Select.Option>
                  <Select.Option value="money_market">Money Market</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Account Number"
                name="account_number"
                rules={[{ required: true, message: 'Please enter account number' }]}
              >
                <Input placeholder="e.g., 410012345678" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Branch Code"
                name="branch_code"
                rules={[{ required: true, message: 'Please enter branch code' }]}
              >
                <Input placeholder="e.g., 051001" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Currency" name="currency">
            <Select>
              <Select.Option value="ZAR">ZAR - South African Rand</Select.Option>
              <Select.Option value="USD">USD - US Dollar</Select.Option>
              <Select.Option value="GBP">GBP - British Pound</Select.Option>
            </Select>
          </Form.Item>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <Button onClick={() => { setShowBankModal(false); bankForm.resetFields(); }}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={creatingBank}>
              Add Bank Account
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Edit Entity Modal */}
      <Modal
        title="Edit Entity"
        open={showEditModal}
        onCancel={() => setShowEditModal(false)}
        footer={null}
        width={600}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleUpdateEntity}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Entity Name" name="name" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Entity Code" name="code" rules={[{ required: true }]}>
                <Input disabled />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Registration Number" name="registration_number">
                <Input placeholder="e.g., 2024/123456/07" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="VAT Number" name="vat_number">
                <Input placeholder="e.g., 4012345678" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Tax Number" name="tax_number">
                <Input placeholder="e.g., 9012345678" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Email" name="email">
                <Input type="email" placeholder="e.g., info@company.co.za" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Phone" name="phone">
                <Input placeholder="e.g., +27 11 123 4567" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Website" name="website">
                <Input placeholder="e.g., https://www.company.co.za" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Address" name="address">
            <Input.TextArea rows={2} placeholder="Street address" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="City" name="city">
                <Input placeholder="e.g., Johannesburg" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Province" name="province">
                <Input placeholder="e.g., Gauteng" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Postal Code" name="postal_code">
                <Input placeholder="e.g., 2000" />
              </Form.Item>
            </Col>
          </Row>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <Button onClick={() => setShowEditModal(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit">
              Save Changes
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default EntityDetails;
