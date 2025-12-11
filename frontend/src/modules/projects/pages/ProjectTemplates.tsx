import React, { useState } from 'react';
import { 
  Card, Button, Space, Row, Col, Tag, Modal, Form, Input, Select, 
  message, Tooltip, Badge, Checkbox
} from 'antd';
import { 
  PlusOutlined, CopyOutlined, EditOutlined, DeleteOutlined, 
  StarOutlined, StarFilled, FolderOutlined, CheckSquareOutlined,
  CalendarOutlined, TeamOutlined, BarChartOutlined
} from '@ant-design/icons';
import './ProjectTemplates.css';

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  tasks: number;
  milestones: number;
  duration: string;
  favorite: boolean;
  usageCount: number;
  lastUsed?: string;
  features: string[];
}

// Sample data
const sampleTemplates: Template[] = [
  {
    id: '1',
    name: 'Software Development',
    description: 'Complete software development lifecycle from planning to deployment',
    category: 'Development',
    tasks: 45,
    milestones: 8,
    duration: '3 months',
    favorite: true,
    usageCount: 12,
    lastUsed: '2024-02-15',
    features: ['Agile sprints', 'Code review checkpoints', 'Testing phases', 'Deployment workflow']
  },
  {
    id: '2',
    name: 'Website Redesign',
    description: 'Website redesign project with UX research and development phases',
    category: 'Design',
    tasks: 32,
    milestones: 6,
    duration: '2 months',
    favorite: true,
    usageCount: 8,
    lastUsed: '2024-02-10',
    features: ['UX audit', 'Wireframing', 'Visual design', 'Development', 'Launch']
  },
  {
    id: '3',
    name: 'Marketing Campaign',
    description: 'End-to-end marketing campaign from strategy to execution',
    category: 'Marketing',
    tasks: 28,
    milestones: 5,
    duration: '6 weeks',
    favorite: false,
    usageCount: 15,
    lastUsed: '2024-02-18',
    features: ['Strategy', 'Content creation', 'Channel planning', 'Launch', 'Analytics']
  },
  {
    id: '4',
    name: 'Product Launch',
    description: 'Comprehensive product launch checklist and workflow',
    category: 'Product',
    tasks: 52,
    milestones: 10,
    duration: '2 months',
    favorite: false,
    usageCount: 6,
    features: ['Market research', 'Go-to-market strategy', 'Launch prep', 'Post-launch review']
  },
  {
    id: '5',
    name: 'Client Onboarding',
    description: 'Structured onboarding process for new clients',
    category: 'Operations',
    tasks: 18,
    milestones: 4,
    duration: '2 weeks',
    favorite: true,
    usageCount: 22,
    lastUsed: '2024-02-19',
    features: ['Discovery call', 'Setup & config', 'Training', 'Handoff']
  },
  {
    id: '6',
    name: 'Event Planning',
    description: 'Corporate event planning from concept to execution',
    category: 'Operations',
    tasks: 40,
    milestones: 7,
    duration: '6 weeks',
    favorite: false,
    usageCount: 4,
    features: ['Venue selection', 'Vendor management', 'Marketing', 'Day-of coordination']
  },
  {
    id: '7',
    name: 'Mobile App Development',
    description: 'Native or cross-platform mobile app development workflow',
    category: 'Development',
    tasks: 55,
    milestones: 9,
    duration: '4 months',
    favorite: false,
    usageCount: 7,
    features: ['Design', 'iOS development', 'Android development', 'QA', 'App store submission']
  },
  {
    id: '8',
    name: 'Bug Fix Sprint',
    description: 'Quick sprint template for addressing critical bugs',
    category: 'Development',
    tasks: 12,
    milestones: 2,
    duration: '1 week',
    favorite: false,
    usageCount: 18,
    features: ['Triage', 'Fix', 'Test', 'Deploy']
  }
];

const categoryColors: Record<string, string> = {
  'Development': '#1890ff',
  'Design': '#722ed1',
  'Marketing': '#fa541c',
  'Product': '#13c2c2',
  'Operations': '#52c41a'
};

const ProjectTemplates: React.FC = () => {
  const [templates, setTemplates] = useState<Template[]>(sampleTemplates);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [useTemplateModal, setUseTemplateModal] = useState<Template | null>(null);
  const [form] = Form.useForm();

  const categories = [...new Set(templates.map(t => t.category))];

  const filteredTemplates = templates.filter(t => {
    const matchesCategory = !categoryFilter || t.category === categoryFilter;
    const matchesFavorites = !showFavoritesOnly || t.favorite;
    return matchesCategory && matchesFavorites;
  });

  const toggleFavorite = (id: string) => {
    setTemplates(templates.map(t => 
      t.id === id ? { ...t, favorite: !t.favorite } : t
    ));
  };

  const handleUseTemplate = (values: any) => {
    message.success(`Project "${values.name}" created from template "${useTemplateModal?.name}"`);
    setUseTemplateModal(null);
  };

  const handleCreateTemplate = (values: any) => {
    const newTemplate: Template = {
      id: String(Date.now()),
      name: values.name,
      description: values.description,
      category: values.category,
      tasks: 0,
      milestones: 0,
      duration: values.duration,
      favorite: false,
      usageCount: 0,
      features: values.features?.split(',').map((f: string) => f.trim()) || []
    };
    setTemplates([newTemplate, ...templates]);
    setCreateModalVisible(false);
    form.resetFields();
    message.success('Template created');
  };

  const handleDeleteTemplate = (id: string) => {
    Modal.confirm({
      title: 'Delete Template',
      content: 'Are you sure you want to delete this template?',
      okText: 'Delete',
      okType: 'danger',
      onOk: () => {
        setTemplates(templates.filter(t => t.id !== id));
        message.success('Template deleted');
      }
    });
  };

  return (
    <div className="project-templates">
      {/* Header */}
      <div className="page-header">
        <h1>Project Templates</h1>
        <Space>
          <Checkbox 
            checked={showFavoritesOnly} 
            onChange={(e) => setShowFavoritesOnly(e.target.checked)}
          >
            <StarFilled style={{ color: '#faad14' }} /> Favorites only
          </Checkbox>
          <Select
            placeholder="All Categories"
            allowClear
            style={{ width: 150 }}
            value={categoryFilter}
            onChange={setCategoryFilter}
          >
            {categories.map(c => <Select.Option key={c} value={c}>{c}</Select.Option>)}
          </Select>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalVisible(true)}>
            Create Template
          </Button>
        </Space>
      </div>

      {/* Template Grid */}
      <Row gutter={[16, 16]}>
        {filteredTemplates.map(template => (
          <Col xs={24} sm={12} lg={8} xl={6} key={template.id}>
            <Card 
              className="template-card"
              actions={[
                <Tooltip title="Use Template">
                  <Button type="text" icon={<CopyOutlined />} onClick={() => setUseTemplateModal(template)}>
                    Use
                  </Button>
                </Tooltip>,
                <Tooltip title="Edit">
                  <Button type="text" icon={<EditOutlined />} />
                </Tooltip>,
                <Tooltip title="Delete">
                  <Button type="text" icon={<DeleteOutlined />} onClick={() => handleDeleteTemplate(template.id)} />
                </Tooltip>
              ]}
            >
              <div className="template-header">
                <Tag color={categoryColors[template.category]}>{template.category}</Tag>
                <Button 
                  type="text" 
                  size="small"
                  icon={template.favorite ? <StarFilled style={{ color: '#faad14' }} /> : <StarOutlined />}
                  onClick={() => toggleFavorite(template.id)}
                />
              </div>
              <h3 className="template-name">{template.name}</h3>
              <p className="template-description">{template.description}</p>
              
              <div className="template-meta">
                <span><CheckSquareOutlined /> {template.tasks} tasks</span>
                <span><FolderOutlined /> {template.milestones} milestones</span>
                <span><CalendarOutlined /> {template.duration}</span>
              </div>

              <div className="template-features">
                {template.features.slice(0, 3).map((feature, idx) => (
                  <Tag key={idx} className="feature-tag">{feature}</Tag>
                ))}
                {template.features.length > 3 && (
                  <Tag>+{template.features.length - 3} more</Tag>
                )}
              </div>

              <div className="template-footer">
                <Badge status="default" text={`Used ${template.usageCount} times`} />
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {filteredTemplates.length === 0 && (
        <div className="empty-state">
          <FolderOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
          <p>No templates found</p>
        </div>
      )}

      {/* Use Template Modal */}
      <Modal
        title={`Create Project from "${useTemplateModal?.name}"`}
        open={!!useTemplateModal}
        onCancel={() => setUseTemplateModal(null)}
        footer={null}
      >
        <Form layout="vertical" onFinish={handleUseTemplate}>
          <Form.Item name="name" label="Project Name" rules={[{ required: true }]}>
            <Input placeholder="Enter project name" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} placeholder="Project description" />
          </Form.Item>
          <Form.Item name="startDate" label="Start Date" rules={[{ required: true }]}>
            <Input type="date" />
          </Form.Item>
          
          {useTemplateModal && (
            <div className="template-preview">
              <h4>Template includes:</h4>
              <ul>
                <li><CheckSquareOutlined /> {useTemplateModal.tasks} tasks</li>
                <li><FolderOutlined /> {useTemplateModal.milestones} milestones</li>
                <li><CalendarOutlined /> Est. duration: {useTemplateModal.duration}</li>
              </ul>
            </div>
          )}

          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setUseTemplateModal(null)}>Cancel</Button>
              <Button type="primary" htmlType="submit">Create Project</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Create Template Modal */}
      <Modal
        title="Create New Template"
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateTemplate}>
          <Form.Item name="name" label="Template Name" rules={[{ required: true }]}>
            <Input placeholder="Enter template name" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} placeholder="Describe this template" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="category" label="Category" rules={[{ required: true }]}>
                <Select placeholder="Select category">
                  {categories.map(c => <Select.Option key={c} value={c}>{c}</Select.Option>)}
                  <Select.Option value="Other">Other</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="duration" label="Est. Duration">
                <Input placeholder="e.g., 2 weeks" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="features" label="Key Features (comma separated)">
            <Input placeholder="e.g., Planning, Design, Development" />
          </Form.Item>
          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setCreateModalVisible(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit">Create Template</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ProjectTemplates;
