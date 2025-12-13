/**
 * ProjectsHub - Unified Project Management Interface
 * 
 * Features:
 * - Project Dashboard with KPIs
 * - Kanban Task Board
 * - Gantt Chart Timeline
 * - Resource Management
 * - Time Tracking
 * - Budget & Cost Control
 * - CIDB Compliance (South Africa)
 * - Financial Integration (GL posting)
 */

import React, { useState, useEffect, lazy, Suspense } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import {
  Card, Row, Col, Statistic, Progress, Table, Tag, Button, Space, Badge,
  Input, Select, DatePicker, Modal, Form, Typography, Tabs, Avatar,
  Timeline, Descriptions, Tooltip, Dropdown, InputNumber, Switch, Alert,
  List, Checkbox, Spin, Divider, Slider, message
} from 'antd';
import {
  ProjectOutlined, TeamOutlined, CalendarOutlined, ClockCircleOutlined,
  DollarOutlined, BarChartOutlined, CheckCircleOutlined, WarningOutlined,
  PlusOutlined, SearchOutlined, FilterOutlined, ExportOutlined,
  FileTextOutlined, SettingOutlined, SyncOutlined, FlagOutlined,
  UserOutlined, BellOutlined, ThunderboltOutlined, ApartmentOutlined,
  SafetyCertificateOutlined, AuditOutlined, BankOutlined, RocketOutlined,
  EyeOutlined, EditOutlined, DeleteOutlined, MoreOutlined, HomeOutlined,
  FieldTimeOutlined, AppstoreOutlined, NodeIndexOutlined, PieChartOutlined,
  FundOutlined, FileDoneOutlined, ScheduleOutlined, CarryOutOutlined
} from '@ant-design/icons';
import { HubLayout, HubHeader, StatusBanner, HubTabs } from '../../components/hub';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { TextArea } = Input;

// Interfaces
interface Project {
  id: string;
  name: string;
  code: string;
  client: string;
  status: 'planning' | 'active' | 'on-hold' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  progress: number;
  startDate: string;
  endDate: string;
  budget: number;
  spent: number;
  manager: string;
  team: number;
  tasks: { total: number; completed: number };
  milestones: { total: number; completed: number };
  cidbGrade?: string;
  type: 'internal' | 'client' | 'construction';
}

interface Task {
  id: string;
  title: string;
  project: string;
  assignee: string;
  status: 'todo' | 'in-progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'critical';
  dueDate: string;
  estimatedHours: number;
  actualHours: number;
  tags: string[];
}

interface TimeEntry {
  id: string;
  project: string;
  task: string;
  user: string;
  date: string;
  hours: number;
  description: string;
  billable: boolean;
  rate: number;
}

interface GanttTask {
  id: string;
  projectId: string;
  name: string;
  owner: string;
  start: string;
  end: string;
  progress: number;
  dependency?: string;
  status: 'not-started' | 'in-progress' | 'at-risk' | 'done';
}

// Sample Data
const sampleProjects: Project[] = [
  {
    id: 'PRJ-001',
    name: 'ERP System Implementation',
    code: 'ERP-2024',
    client: 'Internal',
    status: 'active',
    priority: 'high',
    progress: 65,
    startDate: '2024-01-15',
    endDate: '2024-12-31',
    budget: 2500000,
    spent: 1625000,
    manager: 'Sarah Johnson',
    team: 8,
    tasks: { total: 156, completed: 98 },
    milestones: { total: 12, completed: 7 },
    type: 'internal'
  },
  {
    id: 'PRJ-002',
    name: 'Mall of Africa Extension',
    code: 'MOA-EXT',
    client: 'Attacq Limited',
    status: 'active',
    priority: 'critical',
    progress: 42,
    startDate: '2024-03-01',
    endDate: '2025-06-30',
    budget: 85000000,
    spent: 35700000,
    manager: 'Michael Ndlovu',
    team: 45,
    tasks: { total: 520, completed: 218 },
    milestones: { total: 24, completed: 10 },
    cidbGrade: '9CE',
    type: 'construction'
  },
  {
    id: 'PRJ-003',
    name: 'Mobile Banking App',
    code: 'MBA-V2',
    client: 'First National Bank',
    status: 'active',
    priority: 'high',
    progress: 78,
    startDate: '2024-02-01',
    endDate: '2024-09-30',
    budget: 4500000,
    spent: 3510000,
    manager: 'Emily Chen',
    team: 12,
    tasks: { total: 89, completed: 69 },
    milestones: { total: 8, completed: 6 },
    type: 'client'
  },
  {
    id: 'PRJ-004',
    name: 'Warehouse Automation',
    code: 'WH-AUTO',
    client: 'Shoprite Holdings',
    status: 'planning',
    priority: 'medium',
    progress: 15,
    startDate: '2024-06-01',
    endDate: '2025-02-28',
    budget: 12000000,
    spent: 1800000,
    manager: 'David Mokoena',
    team: 6,
    tasks: { total: 45, completed: 7 },
    milestones: { total: 10, completed: 1 },
    type: 'client'
  },
  {
    id: 'PRJ-005',
    name: 'Road Infrastructure Upgrade',
    code: 'RIU-GP',
    client: 'Gauteng Province',
    status: 'active',
    priority: 'high',
    progress: 55,
    startDate: '2024-01-01',
    endDate: '2025-12-31',
    budget: 250000000,
    spent: 137500000,
    manager: 'Thabo Mthembu',
    team: 120,
    tasks: { total: 890, completed: 490 },
    milestones: { total: 36, completed: 20 },
    cidbGrade: '9CE',
    type: 'construction'
  }
];

const sampleTasks: Task[] = [
  { id: 'TSK-001', title: 'Database schema design', project: 'PRJ-001', assignee: 'John Smith', status: 'done', priority: 'high', dueDate: '2024-06-15', estimatedHours: 40, actualHours: 38, tags: ['backend', 'database'] },
  { id: 'TSK-002', title: 'API endpoint development', project: 'PRJ-001', assignee: 'Sarah Chen', status: 'in-progress', priority: 'high', dueDate: '2024-06-20', estimatedHours: 80, actualHours: 45, tags: ['backend', 'api'] },
  { id: 'TSK-003', title: 'UI component library', project: 'PRJ-001', assignee: 'Mike Johnson', status: 'in-progress', priority: 'medium', dueDate: '2024-06-25', estimatedHours: 60, actualHours: 32, tags: ['frontend', 'ui'] },
  { id: 'TSK-004', title: 'Authentication flow', project: 'PRJ-001', assignee: 'Emily Davis', status: 'review', priority: 'critical', dueDate: '2024-06-18', estimatedHours: 24, actualHours: 26, tags: ['security', 'auth'] },
  { id: 'TSK-005', title: 'Testing & QA', project: 'PRJ-001', assignee: 'Alex Turner', status: 'todo', priority: 'medium', dueDate: '2024-07-01', estimatedHours: 40, actualHours: 0, tags: ['testing', 'qa'] },
  { id: 'TSK-006', title: 'Foundation pour - Block A', project: 'PRJ-002', assignee: 'Site Team A', status: 'done', priority: 'critical', dueDate: '2024-05-15', estimatedHours: 160, actualHours: 172, tags: ['construction', 'foundation'] },
  { id: 'TSK-007', title: 'Steel framework erection', project: 'PRJ-002', assignee: 'Site Team B', status: 'in-progress', priority: 'high', dueDate: '2024-06-30', estimatedHours: 320, actualHours: 180, tags: ['construction', 'steel'] },
  { id: 'TSK-008', title: 'Electrical rough-in', project: 'PRJ-002', assignee: 'Electrical Sub', status: 'todo', priority: 'medium', dueDate: '2024-07-15', estimatedHours: 200, actualHours: 0, tags: ['electrical', 'mep'] }
];

const sampleTimeEntries: TimeEntry[] = [
  { id: 'TE-001', project: 'PRJ-001', task: 'TSK-002', user: 'Sarah Chen', date: '2024-06-10', hours: 8, description: 'API development - user endpoints', billable: true, rate: 850 },
  { id: 'TE-002', project: 'PRJ-001', task: 'TSK-003', user: 'Mike Johnson', date: '2024-06-10', hours: 7.5, description: 'Component library setup', billable: true, rate: 750 },
  { id: 'TE-003', project: 'PRJ-003', task: 'Mobile UI', user: 'Emily Chen', date: '2024-06-10', hours: 8, description: 'Dashboard screens', billable: true, rate: 900 },
  { id: 'TE-004', project: 'PRJ-002', task: 'TSK-007', user: 'Site Team B', date: '2024-06-10', hours: 10, description: 'Steel erection - Level 2', billable: false, rate: 0 }
];

const sampleGanttTasks: GanttTask[] = [
  { id: 'GNT-001', projectId: 'PRJ-001', name: 'Architecture & Design', owner: 'Sarah Johnson', start: '2024-01-15', end: '2024-03-15', progress: 95, status: 'done' },
  { id: 'GNT-002', projectId: 'PRJ-001', name: 'API Development', owner: 'Emily Chen', start: '2024-03-01', end: '2024-07-15', progress: 68, dependency: 'GNT-001', status: 'in-progress' },
  { id: 'GNT-003', projectId: 'PRJ-001', name: 'Frontend UI', owner: 'Mike Johnson', start: '2024-03-20', end: '2024-08-15', progress: 54, dependency: 'GNT-001', status: 'in-progress' },
  { id: 'GNT-004', projectId: 'PRJ-002', name: 'Enabling Works', owner: 'Site Team A', start: '2024-02-10', end: '2024-04-30', progress: 100, status: 'done' },
  { id: 'GNT-005', projectId: 'PRJ-002', name: 'Structural Steel', owner: 'Site Team B', start: '2024-05-01', end: '2024-09-30', progress: 45, dependency: 'GNT-004', status: 'at-risk' },
  { id: 'GNT-006', projectId: 'PRJ-002', name: 'Mechanical & Electrical', owner: 'Electrical Sub', start: '2024-07-01', end: '2024-12-15', progress: 20, dependency: 'GNT-005', status: 'not-started' }
];

const ProjectsHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [projectModalVisible, setProjectModalVisible] = useState(false);
  const [taskModalVisible, setTaskModalVisible] = useState(false);
  const [timeEntryModalVisible, setTimeEntryModalVisible] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projects] = useState<Project[]>(sampleProjects);
  const [tasks] = useState<Task[]>(sampleTasks);
  const [timeEntries] = useState<TimeEntry[]>(sampleTimeEntries);
  const [ganttTasks, setGanttTasks] = useState<GanttTask[]>(sampleGanttTasks);
  const [form] = Form.useForm();
  
  // Fetch live API data
  const [apiStats, setApiStats] = useState<any>(null);
  const [apiLoading, setApiLoading] = useState(true);
  
  useEffect(() => {
    const fetchWorkspaceData = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const response = await fetch(`${API_URL}/api/v1/projects/workspace`);
        const result = await response.json();
        if (result.success && result.data?.summary) {
          setApiStats(result.data.summary);
        }
      } catch (err) {
        console.log('Using local mock data for projects');
      } finally {
        setApiLoading(false);
      }
    };
    fetchWorkspaceData();
  }, []);

  // Calculate stats - use API data if available, otherwise fall back to mock data
  const projectStats = apiStats ? {
    total: apiStats.totalProjects || projects.length,
    active: apiStats.activeProjects || projects.filter(p => p.status === 'active').length,
    onTrack: projects.filter(p => p.progress >= 40).length,
    atRisk: apiStats.onHoldProjects || projects.filter(p => p.priority === 'critical' && p.progress < 50).length,
    totalBudget: apiStats.totalBudget || projects.reduce((sum, p) => sum + p.budget, 0),
    totalSpent: apiStats.totalSpent || projects.reduce((sum, p) => sum + p.spent, 0),
    totalTasks: apiStats.totalTasks || projects.reduce((sum, p) => sum + p.tasks.total, 0),
    completedTasks: (apiStats.totalTasks - apiStats.openTasks) || projects.reduce((sum, p) => sum + p.tasks.completed, 0)
  } : {
    total: projects.length,
    active: projects.filter(p => p.status === 'active').length,
    onTrack: projects.filter(p => p.progress >= 40).length,
    atRisk: projects.filter(p => p.priority === 'critical' && p.progress < 50).length,
    totalBudget: projects.reduce((sum, p) => sum + p.budget, 0),
    totalSpent: projects.reduce((sum, p) => sum + p.spent, 0),
    totalTasks: projects.reduce((sum, p) => sum + p.tasks.total, 0),
    completedTasks: projects.reduce((sum, p) => sum + p.tasks.completed, 0)
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      planning: 'blue', active: 'green', 'on-hold': 'orange',
      completed: 'cyan', cancelled: 'red'
    };
    return colors[status] || 'default';
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'default', medium: 'blue', high: 'orange', critical: 'red'
    };
    return colors[priority] || 'default';
  };

  const getTaskStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      todo: 'default', 'in-progress': 'processing', review: 'warning', done: 'success'
    };
    return colors[status] || 'default';
  };

  const handleProjectAction = (action: string, project: Project) => {
    const labelMap: Record<string, string> = {
      view: 'View Details',
      edit: 'Edit Project',
      gantt: 'Open Gantt',
      archive: 'Archive'
    };
    message.info(`${labelMap[action] || action} - connect to API (Project ${project.code})`);
    if (action === 'gantt') {
      setActiveTab('gantt');
    }
  };

  const handleGanttDateChange = (id: string, dates: [Dayjs, Dayjs]) => {
    setGanttTasks(prev => prev.map(task => task.id === id ? { ...task, start: dates[0].format('YYYY-MM-DD'), end: dates[1].format('YYYY-MM-DD') } : task));
  };

  const handleGanttProgressChange = (id: string, value: number) => {
    setGanttTasks(prev => prev.map(task => task.id === id ? { ...task, progress: value, status: value >= 90 ? 'done' : value >= 50 ? 'in-progress' : 'at-risk' } : task));
  };

  const ganttBounds = (() => {
    const starts = ganttTasks.map(t => dayjs(t.start));
    const ends = ganttTasks.map(t => dayjs(t.end));
    const fallback = dayjs();
    const minStart = starts.reduce((min, current) => current.isBefore(min) ? current : min, starts[0] || fallback);
    const maxEnd = ends.reduce((max, current) => current.isAfter(max) ? current : max, ends[0] || fallback);
    const totalDays = Math.max(maxEnd.diff(minStart, 'day'), 1);
    return { minStart, maxEnd, totalDays };
  })();

  // Dashboard Content
  const renderDashboard = () => (
    <div style={{ padding: '24px' }}>
      {/* Key Metrics */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Active Projects"
              value={projectStats.active}
              suffix={`/ ${projectStats.total}`}
              prefix={<ProjectOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
            <Progress percent={Math.round((projectStats.active / projectStats.total) * 100)} showInfo={false} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Tasks Completed"
              value={projectStats.completedTasks}
              suffix={`/ ${projectStats.totalTasks}`}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
            <Progress 
              percent={Math.round((projectStats.completedTasks / projectStats.totalTasks) * 100)} 
              showInfo={false}
              status="success"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Budget Utilized"
              value={(projectStats.totalSpent / projectStats.totalBudget * 100).toFixed(1)}
              suffix="%"
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
            <Text type="secondary">R{(projectStats.totalSpent / 1000000).toFixed(1)}M / R{(projectStats.totalBudget / 1000000).toFixed(1)}M</Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="At Risk"
              value={projectStats.atRisk}
              prefix={<WarningOutlined />}
              valueStyle={{ color: projectStats.atRisk > 0 ? '#ff4d4f' : '#52c41a' }}
            />
            <Text type="secondary">{projectStats.atRisk === 0 ? 'All projects on track' : 'Requires attention'}</Text>
          </Card>
        </Col>
      </Row>

      {/* Project Timeline & Recent Activity */}
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={16}>
          <Card 
            title={<><ProjectOutlined /> Active Projects</>}
            extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setProjectModalVisible(true)}>New Project</Button>}
          >
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
                      <Text strong>{record.name}</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 12 }}>{record.code} • {record.client}</Text>
                    </div>
                  )
                },
                {
                  title: 'Progress',
                  dataIndex: 'progress',
                  key: 'progress',
                  width: 150,
                  render: (progress: number) => (
                    <Progress 
                      percent={progress} 
                      size="small"
                      status={progress >= 80 ? 'success' : progress >= 50 ? 'active' : 'exception'}
                    />
                  )
                },
                {
                  title: 'Budget',
                  key: 'budget',
                  render: (_, record) => (
                    <div>
                      <Text>R{(record.spent / 1000000).toFixed(1)}M</Text>
                      <Text type="secondary"> / R{(record.budget / 1000000).toFixed(1)}M</Text>
                    </div>
                  )
                },
                {
                  title: 'Team',
                  dataIndex: 'team',
                  key: 'team',
                  render: (team: number) => <Tag icon={<TeamOutlined />}>{team}</Tag>
                },
                {
                  title: 'Due',
                  dataIndex: 'endDate',
                  key: 'endDate',
                  render: (date: string) => <Tag icon={<CalendarOutlined />}>{date}</Tag>
                },
                {
                  title: 'Actions',
                  key: 'actions',
                  render: (_, record) => (
                    <Space>
                      <Button size="small" icon={<EyeOutlined />} onClick={() => setSelectedProject(record)} />
                      <Button size="small" icon={<BarChartOutlined />} />
                    </Space>
                  )
                }
              ]}
            />
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title={<><ClockCircleOutlined /> Recent Activity</>}>
            <Timeline
              items={[
                {
                  color: 'green',
                  children: (
                    <>
                      <Text strong>Task Completed</Text>
                      <br />
                      <Text type="secondary">Foundation pour - Block A</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 11 }}>2 hours ago</Text>
                    </>
                  )
                },
                {
                  color: 'blue',
                  children: (
                    <>
                      <Text strong>Milestone Reached</Text>
                      <br />
                      <Text type="secondary">API Development Phase 1</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 11 }}>5 hours ago</Text>
                    </>
                  )
                },
                {
                  color: 'orange',
                  children: (
                    <>
                      <Text strong>Budget Alert</Text>
                      <br />
                      <Text type="secondary">PRJ-003 at 78% budget utilized</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 11 }}>Yesterday</Text>
                    </>
                  )
                },
                {
                  color: 'green',
                  children: (
                    <>
                      <Text strong>New Team Member</Text>
                      <br />
                      <Text type="secondary">Alex joined PRJ-001</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 11 }}>2 days ago</Text>
                    </>
                  )
                }
              ]}
            />
          </Card>
        </Col>
      </Row>

      {/* Task Overview */}
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} md={12}>
          <Card title={<><CarryOutOutlined /> Tasks by Status</>}>
            <Row gutter={16}>
              <Col span={6}>
                <Statistic title="To Do" value={tasks.filter(t => t.status === 'todo').length} valueStyle={{ color: '#8c8c8c' }} />
              </Col>
              <Col span={6}>
                <Statistic title="In Progress" value={tasks.filter(t => t.status === 'in-progress').length} valueStyle={{ color: '#1890ff' }} />
              </Col>
              <Col span={6}>
                <Statistic title="Review" value={tasks.filter(t => t.status === 'review').length} valueStyle={{ color: '#faad14' }} />
              </Col>
              <Col span={6}>
                <Statistic title="Done" value={tasks.filter(t => t.status === 'done').length} valueStyle={{ color: '#52c41a' }} />
              </Col>
            </Row>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title={<><FieldTimeOutlined /> Time Logged Today</>}>
            <Row gutter={16}>
              <Col span={8}>
                <Statistic 
                  title="Billable Hours" 
                  value={timeEntries.filter(t => t.billable).reduce((sum, t) => sum + t.hours, 0)} 
                  suffix="hrs"
                  valueStyle={{ color: '#52c41a' }} 
                />
              </Col>
              <Col span={8}>
                <Statistic 
                  title="Non-Billable" 
                  value={timeEntries.filter(t => !t.billable).reduce((sum, t) => sum + t.hours, 0)} 
                  suffix="hrs"
                  valueStyle={{ color: '#8c8c8c' }} 
                />
              </Col>
              <Col span={8}>
                <Statistic 
                  title="Revenue" 
                  value={timeEntries.filter(t => t.billable).reduce((sum, t) => sum + (t.hours * t.rate), 0)} 
                  prefix="R"
                  valueStyle={{ color: '#722ed1' }} 
                />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );

  // Projects List
  const renderProjects = () => (
    <div style={{ padding: '24px' }}>
      <Card
        title="All Projects"
        extra={
          <Space>
            <Input placeholder="Search projects..." prefix={<SearchOutlined />} style={{ width: 250 }} />
            <Select defaultValue="all" style={{ width: 120 }}>
              <Option value="all">All Status</Option>
              <Option value="active">Active</Option>
              <Option value="planning">Planning</Option>
              <Option value="completed">Completed</Option>
            </Select>
            <Button icon={<FilterOutlined />}>Filter</Button>
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
                    {record.cidbGrade && <Tag color="purple">CIDB {record.cidbGrade}</Tag>}
                  </Space>
                </div>
              )
            },
            {
              title: 'Client',
              dataIndex: 'client',
              key: 'client'
            },
            {
              title: 'Status',
              dataIndex: 'status',
              key: 'status',
              render: (status: string) => <Tag color={getStatusColor(status)}>{status.toUpperCase()}</Tag>
            },
            {
              title: 'Priority',
              dataIndex: 'priority',
              key: 'priority',
              render: (priority: string) => <Tag color={getPriorityColor(priority)}>{priority}</Tag>
            },
            {
              title: 'Progress',
              dataIndex: 'progress',
              key: 'progress',
              render: (progress: number) => <Progress percent={progress} size="small" style={{ width: 100 }} />
            },
            {
              title: 'Budget',
              key: 'budget',
              render: (_, record) => (
                <div>
                  <Text>R{(record.budget / 1000000).toFixed(1)}M</Text>
                  <Progress 
                    percent={Math.round((record.spent / record.budget) * 100)} 
                    size="small" 
                    showInfo={false}
                    status={(record.spent / record.budget) > 0.9 ? 'exception' : 'active'}
                  />
                </div>
              )
            },
            {
              title: 'Manager',
              dataIndex: 'manager',
              key: 'manager',
              render: (manager: string) => (
                <Space>
                  <Avatar size="small" icon={<UserOutlined />} />
                  {manager}
                </Space>
              )
            },
            {
              title: 'Timeline',
              key: 'timeline',
              render: (_, record) => (
                <Text type="secondary">{record.startDate} → {record.endDate}</Text>
              )
            },
            {
              title: 'Actions',
              key: 'actions',
              render: (_, record) => (
                <Dropdown
                  menu={{
                    items: [
                      { key: 'view', label: 'View Details', icon: <EyeOutlined /> },
                      { key: 'edit', label: 'Edit Project', icon: <EditOutlined /> },
                      { key: 'gantt', label: 'Gantt Chart', icon: <BarChartOutlined /> },
                      { type: 'divider' },
                      { key: 'archive', label: 'Archive', icon: <DeleteOutlined />, danger: true }
                    ],
                    onClick: ({ key }) => handleProjectAction(key, record)
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

  // Kanban Board
  const renderKanban = () => {
    const columns = ['todo', 'in-progress', 'review', 'done'];
    const columnTitles: Record<string, string> = {
      'todo': 'To Do',
      'in-progress': 'In Progress',
      'review': 'Review',
      'done': 'Done'
    };

    return (
      <div style={{ padding: '24px' }}>
        <Card
          title={<><AppstoreOutlined /> Task Board</>}
          extra={
            <Space>
              <Select defaultValue="all" style={{ width: 200 }}>
                <Option value="all">All Projects</Option>
                {projects.map(p => <Option key={p.id} value={p.id}>{p.name}</Option>)}
              </Select>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setTaskModalVisible(true)}>
                Add Task
              </Button>
            </Space>
          }
        >
          <Row gutter={16}>
            {columns.map(status => (
              <Col key={status} span={6}>
                <Card
                  size="small"
                  title={
                    <Space>
                      <Badge status={getTaskStatusColor(status) as any} />
                      {columnTitles[status]}
                      <Tag>{tasks.filter(t => t.status === status).length}</Tag>
                    </Space>
                  }
                  style={{ background: '#fafafa', minHeight: 500 }}
                >
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {tasks.filter(t => t.status === status).map(task => (
                      <Card
                        key={task.id}
                        size="small"
                        hoverable
                        style={{ marginBottom: 8 }}
                      >
                        <div style={{ marginBottom: 8 }}>
                          <Text strong>{task.title}</Text>
                        </div>
                        <Space wrap size="small">
                          <Tag color={getPriorityColor(task.priority)}>{task.priority}</Tag>
                          {task.tags.map(tag => <Tag key={tag}>{tag}</Tag>)}
                        </Space>
                        <Divider style={{ margin: '8px 0' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Space>
                            <Avatar size="small" icon={<UserOutlined />} />
                            <Text type="secondary" style={{ fontSize: 12 }}>{task.assignee}</Text>
                          </Space>
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            <ClockCircleOutlined /> {task.actualHours}/{task.estimatedHours}h
                          </Text>
                        </div>
                      </Card>
                    ))}
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        </Card>
      </div>
    );
  };

  // Gantt Chart (placeholder)
  const renderGantt = () => (
    <div style={{ padding: '24px' }}>
      <Card title={<><BarChartOutlined /> Gantt Chart</>}>
        <Alert
          message="Interactive Gantt Chart"
          description="The Gantt chart provides a visual timeline of all project tasks, dependencies, and milestones. Drag and drop to reschedule tasks."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        
        {/* Simplified Gantt representation */}
        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: 1200, padding: '16px 0' }}>
            {projects.slice(0, 3).map(project => (
              <div key={project.id} style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ width: 250 }}>
                    <Text strong>{project.name}</Text>
                  </div>
                  <div style={{ flex: 1, height: 30, background: '#f0f0f0', borderRadius: 4, position: 'relative' }}>
                    <div 
                      style={{ 
                        position: 'absolute',
                        left: '10%',
                        width: `${project.progress}%`,
                        height: '100%',
                        background: project.progress >= 80 ? '#52c41a' : project.progress >= 50 ? '#1890ff' : '#faad14',
                        borderRadius: 4,
                        display: 'flex',
                        alignItems: 'center',
                        paddingLeft: 8
                      }}
                    >
                      <Text style={{ color: 'white', fontSize: 11 }}>{project.progress}%</Text>
                    </div>
                  </div>
                </div>
                {/* Sub-tasks */}
                {tasks.filter(t => t.project === project.id).slice(0, 3).map(task => (
                  <div key={task.id} style={{ display: 'flex', alignItems: 'center', marginBottom: 4, paddingLeft: 20 }}>
                    <div style={{ width: 230 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>↳ {task.title}</Text>
                    </div>
                    <div style={{ flex: 1, height: 20, background: '#fafafa', borderRadius: 2, position: 'relative' }}>
                      <div 
                        style={{ 
                          position: 'absolute',
                          left: '15%',
                          width: task.status === 'done' ? '40%' : task.status === 'in-progress' ? '25%' : '20%',
                          height: '100%',
                          background: task.status === 'done' ? '#95de64' : task.status === 'in-progress' ? '#69c0ff' : '#d9d9d9',
                          borderRadius: 2
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
        
        {/* Timeline Legend */}
        <div style={{ marginTop: 16, display: 'flex', gap: 24 }}>
          <Space><div style={{ width: 16, height: 16, background: '#52c41a', borderRadius: 2 }} /> Completed (&gt;80%)</Space>
          <Space><div style={{ width: 16, height: 16, background: '#1890ff', borderRadius: 2 }} /> On Track (50-80%)</Space>
          <Space><div style={{ width: 16, height: 16, background: '#faad14', borderRadius: 2 }} /> At Risk (&lt;50%)</Space>
        </div>
      </Card>
    </div>
  );

  // Time Tracking
  const renderTimeTracking = () => (
    <div style={{ padding: '24px' }}>
      <Row gutter={[16, 16]}>
        <Col span={16}>
          <Card
            title={<><FieldTimeOutlined /> Time Entries</>}
            extra={
              <Space>
                <RangePicker />
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setTimeEntryModalVisible(true)}>
                  Log Time
                </Button>
              </Space>
            }
          >
            <Table
              dataSource={timeEntries}
              rowKey="id"
              columns={[
                { title: 'Date', dataIndex: 'date', key: 'date' },
                { title: 'Project', dataIndex: 'project', key: 'project' },
                { title: 'Task', dataIndex: 'task', key: 'task' },
                { title: 'User', dataIndex: 'user', key: 'user' },
                { 
                  title: 'Hours', 
                  dataIndex: 'hours', 
                  key: 'hours',
                  render: (hours: number) => <Tag color="blue">{hours}h</Tag>
                },
                { title: 'Description', dataIndex: 'description', key: 'description' },
                {
                  title: 'Billable',
                  key: 'billable',
                  render: (_, record) => (
                    record.billable 
                      ? <Tag color="green">R{(record.hours * record.rate).toLocaleString()}</Tag>
                      : <Tag>Non-billable</Tag>
                  )
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
        </Col>
        <Col span={8}>
          <Card title="Weekly Summary">
            <Statistic title="Total Hours" value={33.5} suffix="hrs" />
            <Divider />
            <Statistic title="Billable Hours" value={23.5} suffix="hrs" valueStyle={{ color: '#52c41a' }} />
            <Progress percent={70} />
            <Divider />
            <Statistic title="Billable Amount" value={19975} prefix="R" valueStyle={{ color: '#722ed1' }} />
          </Card>
        </Col>
      </Row>
    </div>
  );

  // Resources
  const renderResources = () => (
    <div style={{ padding: '24px' }}>
      <Card title={<><TeamOutlined /> Team Resources</>}>
        <Table
          dataSource={[
            { id: 1, name: 'Sarah Johnson', role: 'Project Manager', projects: 3, utilization: 85, availability: 'Available' },
            { id: 2, name: 'Mike Wilson', role: 'Senior Developer', projects: 2, utilization: 95, availability: 'Fully Booked' },
            { id: 3, name: 'Emily Chen', role: 'UI/UX Designer', projects: 4, utilization: 78, availability: 'Available' },
            { id: 4, name: 'David Mokoena', role: 'Site Engineer', projects: 2, utilization: 100, availability: 'On Leave' },
            { id: 5, name: 'Alex Turner', role: 'QA Engineer', projects: 3, utilization: 65, availability: 'Available' }
          ]}
          rowKey="id"
          columns={[
            {
              title: 'Team Member',
              key: 'member',
              render: (_, record) => (
                <Space>
                  <Avatar icon={<UserOutlined />} />
                  <div>
                    <Text strong>{record.name}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>{record.role}</Text>
                  </div>
                </Space>
              )
            },
            { title: 'Projects', dataIndex: 'projects', key: 'projects' },
            {
              title: 'Utilization',
              dataIndex: 'utilization',
              key: 'utilization',
              render: (util: number) => (
                <Progress 
                  percent={util} 
                  size="small" 
                  status={util >= 90 ? 'exception' : util >= 70 ? 'active' : 'success'}
                  style={{ width: 100 }}
                />
              )
            },
            {
              title: 'Availability',
              dataIndex: 'availability',
              key: 'availability',
              render: (status: string) => (
                <Tag color={status === 'Available' ? 'green' : status === 'Fully Booked' ? 'orange' : 'red'}>
                  {status}
                </Tag>
              )
            },
            {
              title: 'Actions',
              key: 'actions',
              render: () => <Button size="small">View Schedule</Button>
            }
          ]}
        />
      </Card>
    </div>
  );

  // Budget & Costs
  const renderBudget = () => (
    <div style={{ padding: '24px' }}>
      <Row gutter={[16, 16]}>
        <Col span={8}>
          <Card>
            <Statistic 
              title="Total Portfolio Budget" 
              value={projectStats.totalBudget} 
              prefix="R" 
              formatter={(value) => `${(Number(value) / 1000000).toFixed(1)}M`}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic 
              title="Total Spent" 
              value={projectStats.totalSpent} 
              prefix="R" 
              valueStyle={{ color: '#faad14' }}
              formatter={(value) => `${(Number(value) / 1000000).toFixed(1)}M`}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic 
              title="Remaining" 
              value={projectStats.totalBudget - projectStats.totalSpent} 
              prefix="R" 
              valueStyle={{ color: '#52c41a' }}
              formatter={(value) => `${(Number(value) / 1000000).toFixed(1)}M`}
            />
          </Card>
        </Col>
      </Row>

      <Card title="Budget by Project" style={{ marginTop: 16 }}>
        <Table
          dataSource={projects}
          rowKey="id"
          columns={[
            { title: 'Project', dataIndex: 'name', key: 'name' },
            { 
              title: 'Budget', 
              dataIndex: 'budget', 
              key: 'budget',
              render: (budget: number) => `R${(budget / 1000000).toFixed(2)}M`
            },
            { 
              title: 'Spent', 
              dataIndex: 'spent', 
              key: 'spent',
              render: (spent: number) => `R${(spent / 1000000).toFixed(2)}M`
            },
            {
              title: 'Variance',
              key: 'variance',
              render: (_, record) => {
                const remaining = record.budget - record.spent;
                return (
                  <Text style={{ color: remaining > 0 ? '#52c41a' : '#ff4d4f' }}>
                    R{(remaining / 1000000).toFixed(2)}M
                  </Text>
                );
              }
            },
            {
              title: 'Utilization',
              key: 'utilization',
              render: (_, record) => (
                <Progress 
                  percent={Math.round((record.spent / record.budget) * 100)} 
                  size="small"
                  status={(record.spent / record.budget) > 0.9 ? 'exception' : 'active'}
                />
              )
            },
            {
              title: 'GL Account',
              key: 'gl',
              render: () => <Tag color="purple">WIP 1300</Tag>
            }
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
          <Card title="Project Settings">
            <Form layout="vertical">
              <Form.Item label="Auto-generate Project Codes">
                <Switch defaultChecked />
              </Form.Item>
              <Form.Item label="Project Code Prefix">
                <Input defaultValue="PRJ" />
              </Form.Item>
              <Form.Item label="Default Project Status">
                <Select defaultValue="planning">
                  <Option value="planning">Planning</Option>
                  <Option value="active">Active</Option>
                </Select>
              </Form.Item>
              <Form.Item label="Require Budget Approval">
                <Switch defaultChecked />
              </Form.Item>
              <Button type="primary">Save Settings</Button>
            </Form>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Financial Integration">
            <Form layout="vertical">
              <Form.Item label="WIP Account">
                <Select defaultValue="1300">
                  <Option value="1300">1300 - Work in Progress</Option>
                  <Option value="1310">1310 - Contract WIP</Option>
                </Select>
              </Form.Item>
              <Form.Item label="Revenue Account">
                <Select defaultValue="4000">
                  <Option value="4000">4000 - Project Revenue</Option>
                  <Option value="4100">4100 - Contract Revenue</Option>
                </Select>
              </Form.Item>
              <Form.Item label="Cost Account">
                <Select defaultValue="5000">
                  <Option value="5000">5000 - Project Costs</Option>
                  <Option value="5100">5100 - Direct Costs</Option>
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
          <Card title={<><SafetyCertificateOutlined /> CIDB Compliance (Construction)</>}>
            <Alert
              message="Construction Industry Development Board"
              description="For construction projects, maintain CIDB grading compliance. Projects exceeding grade limits require joint venture or upgraded registration."
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
            <Form layout="vertical">
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item label="Company CIDB Grade">
                    <Select defaultValue="9CE">
                      <Option value="9CE">Grade 9 CE (Civil Engineering) - Unlimited</Option>
                      <Option value="9GB">Grade 9 GB (General Building) - Unlimited</Option>
                      <Option value="8CE">Grade 8 CE - Up to R130M</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="CIDB Registration Number">
                    <Input defaultValue="CIDB-12345678" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="Expiry Date">
                    <DatePicker style={{ width: '100%' }} />
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
        title="Projects Hub"
        subtitle="Project Management, Task Tracking & Resource Planning"
        icon={<ProjectOutlined />}
        gradient="purple"
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
        gradient="purple"
        icon={<RocketOutlined />}
        title="Portfolio Overview"
        subtitle="Active Projects & Resources"
        stats={[
          { title: 'Active Projects', value: projectStats.active, span: 4 },
          { title: 'Tasks Completed', value: `${projectStats.completedTasks}/${projectStats.totalTasks}`, span: 4 },
          { title: 'Team Members', value: 45, span: 4 },
          { title: 'Budget Utilized', value: `${((projectStats.totalSpent / projectStats.totalBudget) * 100).toFixed(0)}%`, span: 4 },
          { title: 'On Track', value: `${projectStats.onTrack}/${projectStats.total}`, valueStyle: { color: '#86efac' }, span: 4 },
        ]}
      />

      <HubTabs
        theme="purple"
        tabs={[
          { key: 'dashboard', label: 'Dashboard', icon: <HomeOutlined />, children: renderDashboard() },
          { key: 'projects', label: 'Projects', icon: <ProjectOutlined />, children: renderProjects() },
          { key: 'kanban', label: 'Task Board', icon: <AppstoreOutlined />, children: renderKanban() },
          { key: 'gantt', label: 'Gantt Chart', icon: <BarChartOutlined />, children: renderGantt() },
          { key: 'time', label: 'Time Tracking', icon: <FieldTimeOutlined />, children: renderTimeTracking() },
          { key: 'resources', label: 'Resources', icon: <TeamOutlined />, children: renderResources() },
          { key: 'budget', label: 'Budget', icon: <DollarOutlined />, children: renderBudget() },
          { key: 'settings', label: 'Settings', icon: <SettingOutlined />, children: renderSettings() }
        ]}
        activeKey={activeTab}
        onChange={setActiveTab}
      />

      {/* New Project Modal */}
      <Modal
        title="Create New Project"
        open={projectModalVisible}
        onCancel={() => setProjectModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setProjectModalVisible(false)}>Cancel</Button>,
          <Button key="create" type="primary">Create Project</Button>
        ]}
        width={700}
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item label="Project Name" name="name" rules={[{ required: true }]}>
                <Input placeholder="Enter project name" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Project Code" name="code">
                <Input placeholder="Auto-generated" disabled />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Client" name="client" rules={[{ required: true }]}>
                <Select placeholder="Select client">
                  <Option value="internal">Internal</Option>
                  <Option value="fnb">First National Bank</Option>
                  <Option value="shoprite">Shoprite Holdings</Option>
                  <Option value="attacq">Attacq Limited</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Project Manager" name="manager" rules={[{ required: true }]}>
                <Select placeholder="Select manager">
                  <Option value="sarah">Sarah Johnson</Option>
                  <Option value="michael">Michael Ndlovu</Option>
                  <Option value="emily">Emily Chen</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Start Date" name="startDate" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="End Date" name="endDate" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Budget" name="budget" rules={[{ required: true }]}>
                <InputNumber
                  style={{ width: '100%' }}
                  formatter={value => `R ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={value => value!.replace(/R\s?|(,*)/g, '')}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Priority" name="priority">
                <Select defaultValue="medium">
                  <Option value="low">Low</Option>
                  <Option value="medium">Medium</Option>
                  <Option value="high">High</Option>
                  <Option value="critical">Critical</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Description" name="description">
            <TextArea rows={3} placeholder="Project description..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Time Entry Modal */}
      <Modal
        title="Log Time"
        open={timeEntryModalVisible}
        onCancel={() => setTimeEntryModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setTimeEntryModalVisible(false)}>Cancel</Button>,
          <Button key="save" type="primary">Save Entry</Button>
        ]}
      >
        <Form layout="vertical">
          <Form.Item label="Project" name="project" rules={[{ required: true }]}>
            <Select placeholder="Select project">
              {projects.map(p => <Option key={p.id} value={p.id}>{p.name}</Option>)}
            </Select>
          </Form.Item>
          <Form.Item label="Task" name="task">
            <Select placeholder="Select task">
              {tasks.map(t => <Option key={t.id} value={t.id}>{t.title}</Option>)}
            </Select>
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Date" name="date" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Hours" name="hours" rules={[{ required: true }]}>
                <InputNumber min={0.25} max={24} step={0.25} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Description" name="description">
            <TextArea rows={2} placeholder="What did you work on?" />
          </Form.Item>
          <Form.Item label="Billable" name="billable" valuePropName="checked">
            <Switch defaultChecked />
          </Form.Item>
        </Form>
      </Modal>
    </HubLayout>
  );
};

export default ProjectsHub;
