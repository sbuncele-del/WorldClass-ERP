import React, { useState } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Typography,
  Space,
  Tag,
  Input,
  Select,
  Table,
  Modal,
  Form,
  InputNumber,
  Popconfirm,
  message,
  Tabs,
  Divider,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  FolderOutlined,
  DollarOutlined,
  TagOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import './PricingLibrary.css';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface PricingItem {
  id: string;
  name: string;
  description: string;
  category: string;
  unitPrice: number;
  unit: string;
  taxable: boolean;
  discount?: number;
  tags: string[];
}

interface PricingCategory {
  id: string;
  name: string;
  itemCount: number;
  color: string;
}

const PricingLibrary: React.FC = () => {
  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<PricingItem | null>(null);
  const [form] = Form.useForm();

  const categories: PricingCategory[] = [
    { id: '1', name: 'Implementation', itemCount: 12, color: '#1890ff' },
    { id: '2', name: 'Training', itemCount: 8, color: '#52c41a' },
    { id: '3', name: 'Support', itemCount: 6, color: '#722ed1' },
    { id: '4', name: 'Consulting', itemCount: 15, color: '#fa8c16' },
    { id: '5', name: 'Development', itemCount: 10, color: '#eb2f96' },
    { id: '6', name: 'Maintenance', itemCount: 4, color: '#13c2c2' },
  ];

  const pricingItems: PricingItem[] = [
    {
      id: '1',
      name: 'System Implementation - Basic',
      description: 'Standard system implementation including setup and configuration',
      category: 'Implementation',
      unitPrice: 25000,
      unit: 'project',
      taxable: true,
      tags: ['Popular', 'Standard'],
    },
    {
      id: '2',
      name: 'System Implementation - Enterprise',
      description: 'Full enterprise implementation with custom integrations',
      category: 'Implementation',
      unitPrice: 75000,
      unit: 'project',
      taxable: true,
      tags: ['Enterprise'],
    },
    {
      id: '3',
      name: 'User Training - Onsite',
      description: 'Full-day onsite training session for up to 20 users',
      category: 'Training',
      unitPrice: 2500,
      unit: 'day',
      taxable: true,
      tags: ['Training'],
    },
    {
      id: '4',
      name: 'User Training - Virtual',
      description: 'Half-day virtual training session',
      category: 'Training',
      unitPrice: 1200,
      unit: 'session',
      taxable: true,
      tags: ['Training', 'Virtual'],
    },
    {
      id: '5',
      name: 'Premium Support - Annual',
      description: '24/7 premium support with dedicated account manager',
      category: 'Support',
      unitPrice: 24000,
      unit: 'year',
      taxable: true,
      tags: ['Support', 'Premium'],
    },
    {
      id: '6',
      name: 'Standard Support - Annual',
      description: 'Business hours support via email and phone',
      category: 'Support',
      unitPrice: 12000,
      unit: 'year',
      taxable: true,
      tags: ['Support'],
    },
    {
      id: '7',
      name: 'Strategic Consulting',
      description: 'Business process analysis and optimization',
      category: 'Consulting',
      unitPrice: 350,
      unit: 'hour',
      taxable: true,
      tags: ['Consulting'],
    },
    {
      id: '8',
      name: 'Technical Consulting',
      description: 'Technical architecture and integration consulting',
      category: 'Consulting',
      unitPrice: 275,
      unit: 'hour',
      taxable: true,
      tags: ['Consulting', 'Technical'],
    },
    {
      id: '9',
      name: 'Custom Development',
      description: 'Custom feature development and customization',
      category: 'Development',
      unitPrice: 225,
      unit: 'hour',
      taxable: true,
      tags: ['Development'],
    },
    {
      id: '10',
      name: 'API Integration',
      description: 'Third-party API integration development',
      category: 'Development',
      unitPrice: 8500,
      unit: 'integration',
      taxable: true,
      discount: 10,
      tags: ['Development', 'Integration'],
    },
  ];

  const columns: ColumnsType<PricingItem> = [
    {
      title: 'Item',
      key: 'item',
      render: (_, record) => (
        <div className="item-info">
          <Text strong>{record.name}</Text>
          <Text type="secondary" className="item-description">
            {record.description}
          </Text>
          <div className="item-tags">
            {record.tags.map((tag) => (
              <Tag key={tag} color="blue">{tag}</Tag>
            ))}
          </div>
        </div>
      ),
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      width: 140,
      render: (category) => {
        const cat = categories.find(c => c.name === category);
        return <Tag color={cat?.color}>{category}</Tag>;
      },
      filters: categories.map(c => ({ text: c.name, value: c.name })),
      onFilter: (value, record) => record.category === value,
    },
    {
      title: 'Unit Price',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      width: 140,
      render: (price, record) => (
        <div>
          <Text strong>${price.toLocaleString()}</Text>
          <Text type="secondary"> / {record.unit}</Text>
        </div>
      ),
      sorter: (a, b) => a.unitPrice - b.unitPrice,
    },
    {
      title: 'Discount',
      dataIndex: 'discount',
      key: 'discount',
      width: 100,
      render: (discount) => discount ? <Tag color="green">{discount}% off</Tag> : '-',
    },
    {
      title: 'Taxable',
      dataIndex: 'taxable',
      key: 'taxable',
      width: 80,
      render: (taxable) => taxable ? 'Yes' : 'No',
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space>
          <Button 
            type="text" 
            icon={<EditOutlined />}
            onClick={() => {
              setEditingItem(record);
              form.setFieldsValue(record);
              setCreateModalVisible(true);
            }}
          />
          <Button type="text" icon={<CopyOutlined />} />
          <Popconfirm
            title="Delete this pricing item?"
            onConfirm={() => message.success('Item deleted')}
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const filteredItems = pricingItems.filter((item) => {
    const matchesSearch = 
      item.name.toLowerCase().includes(searchText.toLowerCase()) ||
      item.description.toLowerCase().includes(searchText.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const totalValue = pricingItems.reduce((sum, item) => sum + item.unitPrice, 0);

  return (
    <div className="pricing-library">
      <div className="page-header">
        <div>
          <Title level={4} style={{ margin: 0 }}>Pricing Library</Title>
          <Text type="secondary">Manage your products and services pricing</Text>
        </div>
        <Button 
          type="primary" 
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingItem(null);
            form.resetFields();
            setCreateModalVisible(true);
          }}
        >
          Add Pricing Item
        </Button>
      </div>

      {/* Stats Row */}
      <Row gutter={16} className="stats-row">
        <Col xs={24} sm={8}>
          <Card className="stat-card">
            <div className="stat-content">
              <div className="stat-icon">
                <DollarOutlined />
              </div>
              <div className="stat-info">
                <Text type="secondary">Total Items</Text>
                <Title level={3} style={{ margin: 0 }}>{pricingItems.length}</Title>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="stat-card">
            <div className="stat-content">
              <div className="stat-icon">
                <FolderOutlined />
              </div>
              <div className="stat-info">
                <Text type="secondary">Categories</Text>
                <Title level={3} style={{ margin: 0 }}>{categories.length}</Title>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="stat-card">
            <div className="stat-content">
              <div className="stat-icon">
                <TagOutlined />
              </div>
              <div className="stat-info">
                <Text type="secondary">With Discounts</Text>
                <Title level={3} style={{ margin: 0 }}>
                  {pricingItems.filter(i => i.discount).length}
                </Title>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Categories Overview */}
      <Card title="Categories" className="categories-card">
        <div className="categories-grid">
          {categories.map((category) => (
            <div 
              key={category.id}
              className={`category-chip ${categoryFilter === category.name ? 'active' : ''}`}
              style={{ borderColor: category.color }}
              onClick={() => setCategoryFilter(
                categoryFilter === category.name ? 'all' : category.name
              )}
            >
              <div 
                className="category-dot" 
                style={{ background: category.color }}
              />
              <div className="category-info">
                <Text strong>{category.name}</Text>
                <Text type="secondary">{category.itemCount} items</Text>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Items Table */}
      <Card>
        <div className="table-header">
          <Input
            placeholder="Search items..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 300 }}
          />
          <Select
            value={categoryFilter}
            onChange={setCategoryFilter}
            style={{ width: 180 }}
            options={[
              { value: 'all', label: 'All Categories' },
              ...categories.map(c => ({ value: c.name, label: c.name })),
            ]}
          />
        </div>

        <Table
          columns={columns}
          dataSource={filteredItems}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `${total} items`,
          }}
        />
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        title={editingItem ? 'Edit Pricing Item' : 'Add Pricing Item'}
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => {
            console.log('Save:', values);
            message.success(editingItem ? 'Item updated' : 'Item created');
            setCreateModalVisible(false);
          }}
        >
          <Form.Item
            name="name"
            label="Item Name"
            rules={[{ required: true, message: 'Please enter a name' }]}
          >
            <Input placeholder="e.g., System Implementation - Basic" />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <TextArea rows={3} placeholder="Describe the product or service" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="category"
                label="Category"
                rules={[{ required: true }]}
              >
                <Select
                  placeholder="Select category"
                  options={categories.map(c => ({ value: c.name, label: c.name }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="tags" label="Tags">
                <Select
                  mode="tags"
                  placeholder="Add tags"
                  options={[
                    { value: 'Popular', label: 'Popular' },
                    { value: 'Premium', label: 'Premium' },
                    { value: 'Standard', label: 'Standard' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="unitPrice"
                label="Unit Price"
                rules={[{ required: true }]}
              >
                <InputNumber
                  prefix="$"
                  style={{ width: '100%' }}
                  min={0}
                  formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(v) => parseFloat(v?.replace(/\$\s?|(,*)/g, '') || '0')}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="unit"
                label="Unit"
                rules={[{ required: true }]}
              >
                <Select
                  placeholder="Select unit"
                  options={[
                    { value: 'hour', label: 'Per Hour' },
                    { value: 'day', label: 'Per Day' },
                    { value: 'month', label: 'Per Month' },
                    { value: 'year', label: 'Per Year' },
                    { value: 'project', label: 'Per Project' },
                    { value: 'session', label: 'Per Session' },
                    { value: 'user', label: 'Per User' },
                    { value: 'integration', label: 'Per Integration' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="discount" label="Default Discount (%)">
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  max={100}
                  formatter={(v) => `${v}%`}
                  parser={(v) => parseFloat(v?.replace('%', '') || '0')}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="taxable" label="Taxable" valuePropName="checked">
            <Select defaultValue={true}>
              <Select.Option value={true}>Yes - Include in tax calculations</Select.Option>
              <Select.Option value={false}>No - Tax exempt</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setCreateModalVisible(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit">
                {editingItem ? 'Update' : 'Create'} Item
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PricingLibrary;
