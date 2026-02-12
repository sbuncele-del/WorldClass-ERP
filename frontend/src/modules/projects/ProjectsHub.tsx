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
  List, Checkbox, Spin, Divider, Slider, Drawer, message
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
import { apiGet } from '../../services/api.service';
import apiClient from '../../services/api';
import { projectService } from '../../services/project.service';

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

// Helpers to keep UI math resilient when APIs return empty or partial data
const safePercent = (numerator: number, denominator: number): number => {
  if (!denominator || !Number.isFinite(numerator) || !Number.isFinite(denominator)) return 0;
  return Math.round((numerator / denominator) * 100);
};

const safeRatioString = (numerator: number, denominator: number, precision = 1): string => {
  if (!denominator || !Number.isFinite(numerator) || !Number.isFinite(denominator)) return (0).toFixed(precision);
  return ((numerator / denominator) * 100).toFixed(precision);
};

const toNumber = (value: any): number => (Number.isFinite(Number(value)) ? Number(value) : 0);

const ProjectsHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [projectModalVisible, setProjectModalVisible] = useState(false);
  const [taskModalVisible, setTaskModalVisible] = useState(false);
  const [timeEntryModalVisible, setTimeEntryModalVisible] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [ganttTasks, setGanttTasks] = useState<GanttTask[]>([]);
  const [form] = Form.useForm();
  const [taskForm] = Form.useForm();
  const [timeEntryForm] = Form.useForm();

  // Search & filter state
  const [projectSearch, setProjectSearch] = useState('');
  const [projectStatusFilter, setProjectStatusFilter] = useState('all');
  const [editingTimeEntry, setEditingTimeEntry] = useState<TimeEntry | null>(null);

  // Loading and API data states
  const [loading, setLoading] = useState(true);
  const [apiStats, setApiStats] = useState<any>(null);
  const [apiLoading, setApiLoading] = useState(true);
  const [resources, setResources] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [teamCount, setTeamCount] = useState(0);
  const [weeklySummary, setWeeklySummary] = useState({ totalHours: 0, billableHours: 0, billableAmount: 0 });
  const [salesCustomers, setSalesCustomers] = useState<any[]>([]);
  const [projectUpdates, setProjectUpdates] = useState<any[]>([]);
  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [updateForm] = Form.useForm();
  
  // ── Helper: transform raw API project to the component Project interface ──
  const transformProject = (p: any): Project => ({
    id: p.project_id || p.id,
    name: p.project_name,
    code: p.project_number,
    client: p.client_name || p.customer_name || 'Internal',
    status: (p.status || 'planning').toLowerCase().replace(' ', '-') as Project['status'],
    priority: (p.priority || 'medium').toLowerCase() as Project['priority'],
    progress: toNumber(p.progress_percentage) || toNumber(p.completion_percentage) || safePercent(toNumber(p.completed_tasks), toNumber(p.total_tasks) || 1),
    startDate: p.start_date ? new Date(p.start_date).toLocaleDateString() : '-',
    endDate: p.end_date ? new Date(p.end_date).toLocaleDateString() : '-',
    budget: toNumber(p.budget),
    spent: toNumber(p.actual_cost),
    manager: p.manager_name || 'Unassigned',
    team: p.team_size || 0,
    tasks: { total: p.total_tasks || 0, completed: p.completed_tasks || 0 },
    milestones: { total: 0, completed: 0 },
    type: p.project_type || 'internal',
  });

  // ── Fetch all data ──────────────────────────────────────────────────────
  const fetchAllData = async () => {
    setLoading(true);
    try {
      // Fetch workspace/stats
      const workspaceData = await projectService.getWorkspace().catch((error) => {
        console.error('Workspace fetch failed', error);
        return null;
      });
      if (workspaceData) {
        setApiStats(workspaceData.summary || workspaceData);
      }

      // Fetch projects list
      const projectsRes = await projectService.getProjects().catch((error) => {
        console.error('Projects fetch failed', error);
        return { data: [] };
      });
      const projectsData = Array.isArray(projectsRes?.data) ? projectsRes.data : [];
      if (projectsData.length > 0) {
        setProjects(projectsData.map(transformProject));
      } else {
        setProjects([]);
      }

      // Fetch tasks
      const tasksRes = await projectService.getTasks().catch((error) => {
        console.error('Tasks fetch failed', error);
        return { data: [] };
      });
      const taskData = Array.isArray(tasksRes?.data)
        ? tasksRes.data
        : Array.isArray(tasksRes)
          ? tasksRes
          : [];
      setTasks(taskData);

      // Fetch team resources (users in tenant)
      const usersResponse = await apiClient.get('/api/v2/admin/users').catch((error) => {
        console.error('Users fetch failed', error);
        return { data: { users: [] } };
      });
      const userData = Array.isArray(usersResponse?.data?.users) ? usersResponse.data.users : [];
      if (userData.length > 0) {
        // Calculate per-user project counts from fetched projects data
        const managerProjectCounts: Record<string, number> = {};
        projectsData.forEach((p: any) => {
          if (p.project_manager_id) {
            managerProjectCounts[p.project_manager_id] = (managerProjectCounts[p.project_manager_id] || 0) + 1;
          }
        });
        const activeProjectCount = projectsData.filter((p: any) => (p.status || '').toLowerCase() === 'active').length;

        const teamResources = userData.map((u: any) => {
          const uid = u.user_id || u.id;
          const userProjects = managerProjectCounts[uid] || 0;
          // Utilization: each active project counts as ~25%
          const utilization = Math.min(100, userProjects * 25);
          const isActive = u.is_active !== false && !u.account_suspended;
          return {
            id: uid,
            name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email,
            role: u.roles?.[0]?.role_name || 'Team Member',
            projects: userProjects,
            utilization,
            availability: !isActive ? 'Unavailable' : utilization >= 100 ? 'Fully Booked' : 'Available',
          };
        });
        setResources(teamResources);
        setTeamCount(teamResources.length);
      }

      // Fetch time entries
      const timeRes = await projectService.getTimeEntries().catch((error) => {
        console.error('Time entries fetch failed', error);
        return { data: [] };
      });
      const entries = Array.isArray(timeRes?.entries)
        ? timeRes.entries
        : Array.isArray(timeRes?.data)
          ? timeRes.data
          : Array.isArray(timeRes)
            ? timeRes
            : [];
      setTimeEntries(entries);

      // Calculate weekly summary from time entries
      if (Array.isArray(entries) && entries.length > 0) {
        const totalHours = entries.reduce((sum: number, t: any) => sum + (parseFloat(t.hours) || 0), 0);
        const billableHours = entries.filter((t: any) => t.billable).reduce((sum: number, t: any) => sum + (parseFloat(t.hours) || 0), 0);
        const billableAmount = entries.filter((t: any) => t.billable).reduce((sum: number, t: any) => sum + ((parseFloat(t.hours) || 0) * (parseFloat(t.rate) || 0)), 0);
        setWeeklySummary({ totalHours, billableHours, billableAmount });
      }

      // Build gantt tasks from projects
      const ganttFromProjects = projectsData.map((p: any) => ({
        id: p.project_id,
        projectId: p.project_id,
        name: p.project_name,
        owner: p.manager_name || 'Unassigned',
        start: p.start_date || new Date().toISOString().split('T')[0],
        end: p.end_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        progress: p.progress_percentage || 0,
        status: p.status === 'Completed' ? 'done' as const : p.status === 'Active' ? 'in-progress' as const : 'not-started' as const
      }));
      setGanttTasks(ganttFromProjects);

      // Recent activity - populated from project updates below

      // Fetch Sales customers for the New Project modal
      const customersResponse = await apiClient.get('/api/sales/customers', { params: { limit: 100 } }).catch(() => ({ data: { customers: [] } }));
      const custList = customersResponse?.data?.customers || customersResponse?.data?.data || [];
      if (Array.isArray(custList)) {
        setSalesCustomers(custList);
      }

      // Fetch project updates for activity feed
      const updatesRes = await projectService.getProjectUpdates({ limit: 50 }).catch(() => ({ data: [] }));
      const updatesData = Array.isArray(updatesRes?.data) ? updatesRes.data : [];
      setProjectUpdates(updatesData);

      // Also populate recent activity from updates
      if (updatesData.length > 0) {
        setRecentActivity(updatesData.slice(0, 5).map((u: any) => ({
          title: u.title,
          description: `${u.project_name || 'Project'} — ${u.content?.substring(0, 80) || ''}`,
          time: new Date(u.created_at).toLocaleString(),
          type: u.update_type === 'milestone' ? 'milestone' : u.update_type === 'status_change' ? 'completed' : 'update',
        })));
      }

    } catch (err) {
      console.error('Failed to fetch projects data:', err);
      setProjects([]);
      setTasks([]);
      setGanttTasks([]);
      setTimeEntries([]);
      setResources([]);
    } finally {
      setLoading(false);
      setApiLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Calculate stats - use API data if available, otherwise fall back to mock data
  const projectStats = apiStats ? {
    total: toNumber(apiStats.totalProjects) || projects.length,
    active: toNumber(apiStats.activeProjects) || projects.filter(p => p.status === 'active').length,
    onTrack: projects.filter(p => p.progress >= 40).length,
    atRisk: toNumber(apiStats.onHoldProjects) || projects.filter(p => p.priority === 'critical' && p.progress < 50).length,
    totalBudget: toNumber(apiStats.totalBudget) || projects.reduce((sum, p) => sum + p.budget, 0),
    totalSpent: toNumber(apiStats.totalSpent) || projects.reduce((sum, p) => sum + p.spent, 0),
    totalTasks: toNumber(apiStats.totalTasks) || projects.reduce((sum, p) => sum + p.tasks.total, 0),
    completedTasks: toNumber(apiStats.totalTasks) && toNumber(apiStats.openTasks) >= 0
      ? toNumber(apiStats.totalTasks) - toNumber(apiStats.openTasks)
      : projects.reduce((sum, p) => sum + p.tasks.completed, 0)
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

  const handleProjectAction = async (action: string, project: Project) => {
    if (action === 'view') {
      setSelectedProject(project);
    } else if (action === 'edit') {
      setSelectedProject(null);
      // Pre-fill the project form and open the modal for editing
      form.setFieldsValue({
        name: project.name,
        client: project.client === 'Internal' ? 'internal' : project.client,
        priority: project.priority,
        description: '',
      });
      setProjectModalVisible(true);
    } else if (action === 'gantt') {
      setActiveTab('gantt');
    } else if (action === 'archive') {
      Modal.confirm({
        title: 'Delete Project',
        content: `Are you sure you want to delete "${project.name}" (${project.code})? This will set its status to Cancelled.`,
        okText: 'Delete',
        okType: 'danger',
        cancelText: 'Cancel',
        onOk: async () => {
          try {
            await projectService.deleteProject(project.id);
            message.success(`Project "${project.name}" has been deleted.`);
            // Refresh the projects list
            const projectsRes = await projectService.getProjects().catch(() => ({ data: [] }));
            const projectsData = Array.isArray(projectsRes?.data) ? projectsRes.data : [];
            setProjects(projectsData.map(transformProject));
          } catch (error: any) {
            message.error(error.response?.data?.message || 'Failed to delete project. Please try again.');
          }
        },
      });
    }
  };

  const handleStatusChange = async (projectId: string, newStatus: string) => {
    try {
      await projectService.updateProject(projectId, { status: newStatus });
      message.success(`Project status updated to ${newStatus}`);
      // Update local state
      setProjects(prev => prev.map(p => 
        p.id === projectId ? { ...p, status: newStatus.toLowerCase().replace(' ', '-') as Project['status'] } : p
      ));
      // Update selectedProject if it's the one being changed
      if (selectedProject?.id === projectId) {
        setSelectedProject(prev => prev ? { ...prev, status: newStatus.toLowerCase().replace(' ', '-') as Project['status'] } : null);
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to update status');
    }
  };

  const handleGanttDateChange = (id: string, dates: [Dayjs, Dayjs]) => {
    setGanttTasks(prev => prev.map(task => task.id === id ? { ...task, start: dates[0].format('YYYY-MM-DD'), end: dates[1].format('YYYY-MM-DD') } : task));
    // Persist to backend
    projectService.updateProject(id, { start_date: dates[0].format('YYYY-MM-DD'), end_date: dates[1].format('YYYY-MM-DD') }).catch(() => {});
  };

  const handleGanttProgressChange = (id: string, value: number) => {
    setGanttTasks(prev => prev.map(task => task.id === id ? { ...task, progress: value, status: value >= 90 ? 'done' : value >= 50 ? 'in-progress' : 'at-risk' } : task));
    // Persist to backend
    const statusLabel = value >= 100 ? 'Completed' : value >= 50 ? 'Active' : 'Planning';
    projectService.updateProject(id, { status: statusLabel }).catch(() => {});
  };

  // ── Export projects to CSV ───────────────────────────────────────────────
  const handleExport = () => {
    if (projects.length === 0) {
      message.warning('No projects to export');
      return;
    }
    const headers = ['Code', 'Name', 'Client', 'Status', 'Priority', 'Progress %', 'Budget', 'Spent', 'Manager', 'Start Date', 'End Date'];
    const rows = projects.map(p => [p.code, p.name, p.client, p.status, p.priority, p.progress, p.budget, p.spent, p.manager, p.startDate, p.endDate]);
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `projects-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    message.success('Projects exported successfully');
  };

  // ── Time entry edit/delete handlers ──────────────────────────────────────
  const handleEditTimeEntry = (entry: TimeEntry) => {
    setEditingTimeEntry(entry);
    timeEntryForm.setFieldsValue({
      project: entry.project,
      task: entry.task,
      date: entry.date ? dayjs(entry.date) : undefined,
      hours: entry.hours,
      description: entry.description,
      billable: entry.billable,
    });
    setTimeEntryModalVisible(true);
  };

  const handleDeleteTimeEntry = async (entry: TimeEntry) => {
    Modal.confirm({
      title: 'Delete Time Entry',
      content: `Delete ${entry.hours}h entry for "${entry.project}"?`,
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          await projectService.deleteTimeEntry(entry.id);
          message.success('Time entry deleted');
          setTimeEntries(prev => prev.filter(t => t.id !== entry.id));
        } catch {
          message.error('Failed to delete time entry');
        }
      },
    });
  };

  // ── Kanban drag-and-drop ─────────────────────────────────────────────────
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    if (!draggedTask || draggedTask.status === newStatus) {
      setDraggedTask(null);
      return;
    }
    // Update local state immediately
    setTasks(prev => prev.map(t => t.id === draggedTask.id ? { ...t, status: newStatus as Task['status'] } : t));
    // Persist to backend
    try {
      await projectService.updateTaskStatus(draggedTask.id, newStatus);
    } catch {
      // Revert on failure
      setTasks(prev => prev.map(t => t.id === draggedTask.id ? { ...t, status: draggedTask.status } : t));
      message.error('Failed to update task status');
    }
    setDraggedTask(null);
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
            <Progress percent={safePercent(projectStats.active, projectStats.total)} showInfo={false} />
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
              percent={safePercent(projectStats.completedTasks, projectStats.totalTasks)} 
              showInfo={false}
              status="success"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Budget Utilized"
              value={safeRatioString(projectStats.totalSpent, projectStats.totalBudget)}
              suffix="%"
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
            <Text type="secondary">R{projectStats.totalSpent.toLocaleString()} / R{projectStats.totalBudget.toLocaleString()}</Text>
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
                      <Button size="small" icon={<BarChartOutlined />} onClick={() => setActiveTab('gantt')} />
                    </Space>
                  )
                }
              ]}
            />
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title={<><ClockCircleOutlined /> Recent Activity</>}>
            {recentActivity.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <ClockCircleOutlined style={{ fontSize: 32, color: '#d9d9d9' }} />
                <br /><br />
                <Text type="secondary">No recent activity</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>Activity will appear here as you work on projects</Text>
              </div>
            ) : (
              <Timeline
                items={recentActivity.map((activity: any) => ({
                  color: activity.type === 'completed' ? 'green' : activity.type === 'milestone' ? 'blue' : 'orange',
                  children: (
                    <>
                      <Text strong>{activity.title}</Text>
                      <br />
                      <Text type="secondary">{activity.description}</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 11 }}>{activity.time}</Text>
                    </>
                  )
                }))}
              />
            )}
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
            <Input placeholder="Search projects..." prefix={<SearchOutlined />} style={{ width: 250 }} value={projectSearch} onChange={(e) => setProjectSearch(e.target.value)} />
            <Select value={projectStatusFilter} style={{ width: 120 }} onChange={(v) => setProjectStatusFilter(v)}>
              <Option value="all">All Status</Option>
              <Option value="active">Active</Option>
              <Option value="planning">Planning</Option>
              <Option value="completed">Completed</Option>
              <Option value="on-hold">On Hold</Option>
            </Select>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setProjectModalVisible(true)}>
              New Project
            </Button>
          </Space>
        }
      >
        <Table
          dataSource={projects.filter(p => {
            const matchSearch = !projectSearch || p.name.toLowerCase().includes(projectSearch.toLowerCase()) || p.code.toLowerCase().includes(projectSearch.toLowerCase()) || p.client.toLowerCase().includes(projectSearch.toLowerCase());
            const matchStatus = projectStatusFilter === 'all' || p.status === projectStatusFilter;
            return matchSearch && matchStatus;
          })}
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
                  <Text>R{record.budget >= 1000000 ? `${(record.budget / 1000000).toFixed(1)}M` : record.budget.toLocaleString()}</Text>
                  <Progress 
                    percent={safePercent(record.spent, record.budget)} 
                    size="small" 
                    showInfo={false}
                    status={record.budget && record.spent / record.budget > 0.9 ? 'exception' : 'active'}
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
                      { key: 'status-active', label: 'Set Active', icon: <CheckCircleOutlined />, disabled: record.status === 'active' },
                      { key: 'status-on-hold', label: 'Set On Hold', icon: <ClockCircleOutlined />, disabled: record.status === 'on-hold' },
                      { key: 'status-completed', label: 'Set Completed', icon: <CarryOutOutlined />, disabled: record.status === 'completed' },
                      { type: 'divider' },
                      { key: 'archive', label: 'Archive', icon: <DeleteOutlined />, danger: true }
                    ],
                    onClick: ({ key }) => {
                      if (key.startsWith('status-')) {
                        const statusMap: Record<string, string> = {
                          'status-active': 'Active',
                          'status-on-hold': 'On Hold',
                          'status-completed': 'Completed'
                        };
                        handleStatusChange(record.id, statusMap[key]);
                      } else {
                        handleProjectAction(key, record);
                      }
                    }
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
                  style={{ background: draggedTask ? '#f0f5ff' : '#fafafa', minHeight: 500, transition: 'background 0.2s' }}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, status)}
                >
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {tasks.filter(t => t.status === status).map(task => (
                      <Card
                        key={task.id}
                        size="small"
                        hoverable
                        draggable
                        onDragStart={(e) => handleDragStart(e, task)}
                        style={{ marginBottom: 8, cursor: 'grab', opacity: draggedTask?.id === task.id ? 0.5 : 1 }}
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

  // Gantt Chart (real data)
  const renderGantt = () => (
    <div style={{ padding: '24px' }}>
      <Card title={<><BarChartOutlined /> Gantt Chart</>}>
        {ganttTasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px' }}>
            <BarChartOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
            <Title level={4} type="secondary">No Projects to Display</Title>
            <Text type="secondary">Create a project with start and end dates to see the Gantt chart.</Text>
            <br /><br />
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setProjectModalVisible(true)}>
              Create Project
            </Button>
          </div>
        ) : (
          <>
            <Alert
              message="Project Timeline"
              description="Visual timeline of all projects. Progress bars show completion status."
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
            
            {/* Gantt Chart */}
            <div style={{ overflowX: 'auto' }}>
              <div style={{ minWidth: 1200, padding: '16px 0' }}>
                {/* Header with dates */}
                <div style={{ display: 'flex', marginBottom: 16, borderBottom: '1px solid #f0f0f0', paddingBottom: 8 }}>
                  <div style={{ width: 250, fontWeight: 'bold' }}>Project</div>
                  <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', paddingRight: 20 }}>
                    <Text type="secondary">{ganttBounds.minStart.format('MMM DD')}</Text>
                    <Text type="secondary">{ganttBounds.minStart.add(Math.floor(ganttBounds.totalDays/4), 'day').format('MMM DD')}</Text>
                    <Text type="secondary">{ganttBounds.minStart.add(Math.floor(ganttBounds.totalDays/2), 'day').format('MMM DD')}</Text>
                    <Text type="secondary">{ganttBounds.minStart.add(Math.floor(3*ganttBounds.totalDays/4), 'day').format('MMM DD')}</Text>
                    <Text type="secondary">{ganttBounds.maxEnd.format('MMM DD')}</Text>
                  </div>
                </div>
                
                {ganttTasks.map(task => {
                  const taskStart = dayjs(task.start);
                  const taskEnd = dayjs(task.end);
                  const startOffset = Math.max(0, taskStart.diff(ganttBounds.minStart, 'day') / ganttBounds.totalDays * 100);
                  const duration = Math.max(5, taskEnd.diff(taskStart, 'day') / ganttBounds.totalDays * 100);
                  
                  return (
                    <div key={task.id} style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                        <div style={{ width: 250 }}>
                          <Text strong>{task.name}</Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: 11 }}>{task.owner}</Text>
                        </div>
                        <div style={{ flex: 1, height: 30, background: '#f5f5f5', borderRadius: 4, position: 'relative' }}>
                          <Tooltip title={`${task.name}: ${task.progress}% complete (${taskStart.format('MMM DD')} - ${taskEnd.format('MMM DD')})`}>
                            <div 
                              style={{ 
                                position: 'absolute',
                                left: `${startOffset}%`,
                                width: `${duration}%`,
                                height: '100%',
                                background: task.progress >= 80 ? '#52c41a' : task.progress >= 50 ? '#1890ff' : task.progress > 0 ? '#faad14' : '#d9d9d9',
                                borderRadius: 4,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.3s'
                              }}
                            >
                              <Text style={{ color: 'white', fontSize: 11, fontWeight: 500 }}>{task.progress}%</Text>
                            </div>
                          </Tooltip>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Timeline Legend */}
            <div style={{ marginTop: 16, display: 'flex', gap: 24 }}>
              <Space><div style={{ width: 16, height: 16, background: '#52c41a', borderRadius: 2 }} /> Completed (&gt;80%)</Space>
              <Space><div style={{ width: 16, height: 16, background: '#1890ff', borderRadius: 2 }} /> On Track (50-80%)</Space>
              <Space><div style={{ width: 16, height: 16, background: '#faad14', borderRadius: 2 }} /> At Risk (1-50%)</Space>
              <Space><div style={{ width: 16, height: 16, background: '#d9d9d9', borderRadius: 2 }} /> Not Started (0%)</Space>
            </div>
          </>
        )}
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
                  render: (_: any, record: TimeEntry) => (
                    <Space>
                      <Button size="small" icon={<EditOutlined />} onClick={() => handleEditTimeEntry(record)} />
                      <Button size="small" icon={<DeleteOutlined />} danger onClick={() => handleDeleteTimeEntry(record)} />
                    </Space>
                  )
                }
              ]}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card title="Weekly Summary">
            <Statistic title="Total Hours" value={weeklySummary.totalHours.toFixed(1)} suffix="hrs" />
            <Divider />
            <Statistic title="Billable Hours" value={weeklySummary.billableHours.toFixed(1)} suffix="hrs" valueStyle={{ color: '#52c41a' }} />
            <Progress percent={weeklySummary.totalHours > 0 ? Math.round((weeklySummary.billableHours / weeklySummary.totalHours) * 100) : 0} />
            <Divider />
            <Statistic title="Billable Amount" value={weeklySummary.billableAmount} prefix="R" valueStyle={{ color: '#722ed1' }} />
          </Card>
        </Col>
      </Row>
    </div>
  );

  // Resources
  const renderResources = () => (
    <div style={{ padding: '24px' }}>
      <Card 
        title={<><TeamOutlined /> Team Resources</>}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => window.open('/app/admin/users', '_blank')}>
            Add Resource
          </Button>
        }
      >
        {resources.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <TeamOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
            <Title level={4} type="secondary">No Team Resources</Title>
            <Text type="secondary">Add team members to your organization to assign them to projects.</Text>
            <br /><br />
            <Button type="primary" onClick={() => window.location.href = '/settings/users'}>
              Go to User Management
            </Button>
          </div>
        ) : (
          <Table
            dataSource={resources}
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
                render: (_: any, record: any) => <Button size="small" onClick={() => { setProjectStatusFilter('all'); setProjectSearch(record.name); setActiveTab('projects'); }}>View Projects</Button>
              }
            ]}
          />
        )}
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
                  percent={safePercent(record.spent, record.budget)} 
                  size="small"
                  status={record.budget && record.spent / record.budget > 0.9 ? 'exception' : 'active'}
                />
              )
            },
            {
              title: 'GL Account',
              key: 'gl',
              render: (_: any, record: any) => <Tag color="purple">WIP {record.type === 'construction' ? '1310' : '1300'}</Tag>
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
              <Button type="primary" onClick={() => message.success('Project settings saved')}>Save Settings</Button>
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
              <Button type="primary" onClick={() => message.success('Financial integration settings saved')}>Save Settings</Button>
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
                    <Input placeholder="Enter CIDB registration number" />
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

  // Updates / Activity Feed (client-visible project updates)
  const renderUpdates = () => {
    const updateTypeColors: Record<string, string> = {
      general: 'blue', milestone: 'green', status_change: 'orange',
      budget: 'purple', risk: 'red', deliverable: 'cyan'
    };

    return (
      <div style={{ padding: '24px' }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={16}>
            <Card
              title={<><BellOutlined /> Project Updates</>}
              extra={
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setUpdateModalVisible(true)}>
                  Post Update
                </Button>
              }
            >
              {projectUpdates.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <BellOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
                  <Title level={4} type="secondary">No Updates Yet</Title>
                  <Text type="secondary">Post your first project update to keep clients and team members informed.</Text>
                  <br /><br />
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => setUpdateModalVisible(true)}>
                    Post First Update
                  </Button>
                </div>
              ) : (
                <Timeline
                  items={projectUpdates.map((update: any) => ({
                    color: updateTypeColors[update.update_type] || 'blue',
                    children: (
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <Space>
                              <Tag color={updateTypeColors[update.update_type] || 'blue'}>{(update.update_type || 'general').replace('_', ' ')}</Tag>
                              <Text strong>{update.title}</Text>
                              {update.is_client_visible && <Tag color="green" style={{ fontSize: 10 }}>Client Visible</Tag>}
                            </Space>
                            <br />
                            <Text>{update.content}</Text>
                            <br />
                            <Text type="secondary" style={{ fontSize: 11 }}>
                              {update.project_name} • by {update.author_name || 'System'} • {new Date(update.created_at).toLocaleString()}
                            </Text>
                          </div>
                          <Button
                            size="small"
                            icon={<DeleteOutlined />}
                            danger
                            type="text"
                            onClick={() => {
                              Modal.confirm({
                                title: 'Delete Update',
                                content: 'Are you sure you want to delete this update?',
                                okText: 'Delete',
                                okType: 'danger',
                                onOk: async () => {
                                  try {
                                    await projectService.deleteProjectUpdate(update.id);
                                    setProjectUpdates(prev => prev.filter(u => u.id !== update.id));
                                    message.success('Update deleted');
                                  } catch {
                                    message.error('Failed to delete update');
                                  }
                                },
                              });
                            }}
                          />
                        </div>
                      </div>
                    )
                  }))}
                />
              )}
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card title="Update Summary">
              <Statistic title="Total Updates" value={projectUpdates.length} />
              <Divider />
              <Statistic title="Client-Visible" value={projectUpdates.filter((u: any) => u.is_client_visible).length} valueStyle={{ color: '#52c41a' }} />
              <Divider />
              <Statistic title="This Week" value={projectUpdates.filter((u: any) => {
                const d = new Date(u.created_at);
                const now = new Date();
                return d >= new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
              }).length} valueStyle={{ color: '#1890ff' }} />
            </Card>
            <Card title="Update Types" style={{ marginTop: 16 }}>
              {['general', 'milestone', 'status_change', 'budget', 'risk', 'deliverable'].map(type => {
                const count = projectUpdates.filter((u: any) => u.update_type === type).length;
                return count > 0 ? (
                  <div key={type} style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                    <Tag color={updateTypeColors[type]}>{type.replace('_', ' ')}</Tag>
                    <Text strong>{count}</Text>
                  </div>
                ) : null;
              })}
            </Card>
          </Col>
        </Row>
      </div>
    );
  };

  return (
    <HubLayout>
      <HubHeader
        title="Projects Hub"
        subtitle="Project Management, Task Tracking & Resource Planning"
        icon={<ProjectOutlined />}
        gradient="purple"
        actions={
          <>
            <Button icon={<SyncOutlined />} onClick={() => fetchAllData()}>Refresh</Button>
            <Button icon={<ExportOutlined />} onClick={handleExport}>Export</Button>
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
          { title: 'Team Members', value: teamCount, span: 4 },
          { title: 'Budget Utilized', value: `${safeRatioString(projectStats.totalSpent, projectStats.totalBudget, 0)}%`, span: 4 },
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
          { key: 'updates', label: 'Updates', icon: <BellOutlined />, children: renderUpdates() },
          { key: 'settings', label: 'Settings', icon: <SettingOutlined />, children: renderSettings() }
        ]}
        activeKey={activeTab}
        onChange={setActiveTab}
      />

      {/* New Project Modal */}
      <Modal
        title="Create New Project"
        open={projectModalVisible}
        onCancel={() => { setProjectModalVisible(false); form.resetFields(); }}
        footer={[
          <Button key="cancel" onClick={() => { setProjectModalVisible(false); form.resetFields(); }}>Cancel</Button>,
          <Button key="create" type="primary" onClick={async () => {
            try {
              const values = await form.validateFields();
              const projectData = {
                project_name: values.name,
                project_type: values.type || 'Internal',
                customer_id: values.client !== 'internal' ? values.client : null,
                project_manager_id: values.manager || null,
                start_date: values.startDate?.format('YYYY-MM-DD'),
                end_date: values.endDate?.format('YYYY-MM-DD'),
                budget: values.budget,
                priority: values.priority || 'Medium',
                description: values.description,
                status: 'Planning'
              };
              await projectService.createProject(projectData);
              message.success('Project created successfully!');
              setProjectModalVisible(false);
              form.resetFields();
              // Refresh projects list
              const projectsRes = await projectService.getProjects().catch(() => ({ data: [] }));
              const projectsData = Array.isArray(projectsRes?.data) ? projectsRes.data : [];
              setProjects(projectsData.map(transformProject));
            } catch (error: any) {
              message.error(error.response?.data?.message || 'Failed to create project. Please try again.');
            }
          }}>Create Project</Button>
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
                <Select placeholder="Select client" showSearch optionFilterProp="children">
                  <Option value="internal">Internal Project</Option>
                  {salesCustomers.map((c: any) => (
                    <Option key={c.id || c.customer_id} value={c.id || c.customer_id}>
                      {c.customer_name || c.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Project Manager" name="manager" rules={[{ required: true }]}>
                <Select placeholder="Select manager" showSearch optionFilterProp="children">
                  {resources.map(r => (
                    <Option key={r.id} value={r.id}>{r.name}</Option>
                  ))}
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

      {/* Add Task Modal */}
      <Modal
        title="Add Task"
        open={taskModalVisible}
        onCancel={() => { setTaskModalVisible(false); taskForm.resetFields(); }}
        footer={[
          <Button key="cancel" onClick={() => { setTaskModalVisible(false); taskForm.resetFields(); }}>Cancel</Button>,
          <Button key="create" type="primary" onClick={async () => {
            try {
              const values = await taskForm.validateFields();
              const taskData = {
                project_id: values.projectId,
                task_name: values.title,
                description: values.description,
                assigned_to: values.assignee || null,
                priority: values.priority || 'Medium',
                estimated_hours: values.estimatedHours || 0,
                due_date: values.dueDate?.format('YYYY-MM-DD') || null,
                status: 'Not Started',
              };
              await projectService.createTask(taskData);
              message.success('Task created successfully!');
              setTaskModalVisible(false);
              taskForm.resetFields();
              // Refresh tasks list
              const tasksRes = await projectService.getTasks().catch(() => ({ data: [] }));
              const taskItems = Array.isArray(tasksRes?.data)
                ? tasksRes.data
                : Array.isArray(tasksRes) ? tasksRes : [];
              setTasks(taskItems);
            } catch (error: any) {
              if (error.errorFields) {
                // Form validation error -- Ant Design will highlight fields
                return;
              }
              message.error(error.response?.data?.message || 'Failed to create task. Please try again.');
            }
          }}>Add Task</Button>
        ]}
      >
        <Form form={taskForm} layout="vertical">
          <Form.Item label="Task Title" name="title" rules={[{ required: true, message: 'Please enter a task title' }]}>
            <Input placeholder="Enter task title" />
          </Form.Item>
          <Form.Item label="Project" name="projectId" rules={[{ required: true, message: 'Please select a project' }]}>
            <Select placeholder="Select project">
              {projects.map(p => <Option key={p.id} value={p.id}>{p.name}</Option>)}
            </Select>
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Assignee" name="assignee">
                <Select placeholder="Select team member" allowClear>
                  {resources.map(r => <Option key={r.id} value={r.id}>{r.name}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Priority" name="priority" initialValue="medium">
                <Select>
                  <Option value="low">Low</Option>
                  <Option value="medium">Medium</Option>
                  <Option value="high">High</Option>
                  <Option value="critical">Critical</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Due Date" name="dueDate">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Estimated Hours" name="estimatedHours">
                <InputNumber min={0.5} step={0.5} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Description" name="description">
            <TextArea rows={2} placeholder="Task description..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Time Entry Modal */}
      <Modal
        title={editingTimeEntry ? 'Edit Time Entry' : 'Log Time'}
        open={timeEntryModalVisible}
        onCancel={() => { setTimeEntryModalVisible(false); timeEntryForm.resetFields(); setEditingTimeEntry(null); }}
        footer={[
          <Button key="cancel" onClick={() => { setTimeEntryModalVisible(false); timeEntryForm.resetFields(); setEditingTimeEntry(null); }}>Cancel</Button>,
          <Button key="save" type="primary" onClick={async () => {
            try {
              const values = await timeEntryForm.validateFields();
              const entryData = {
                project_id: values.project,
                task_id: values.task || null,
                entry_date: values.date?.format('YYYY-MM-DD'),
                hours: values.hours,
                description: values.description,
                is_billable: values.billable !== false,
              };
              if (editingTimeEntry) {
                await projectService.updateTimeEntry(editingTimeEntry.id, entryData);
                message.success('Time entry updated!');
              } else {
                await projectService.createTimeEntry(entryData);
                message.success('Time entry logged successfully!');
              }
              setTimeEntryModalVisible(false);
              timeEntryForm.resetFields();
              setEditingTimeEntry(null);
              // Refresh time entries
              const timeRes = await projectService.getTimeEntries().catch(() => ({ data: [] }));
              const entries = Array.isArray(timeRes?.entries)
                ? timeRes.entries
                : Array.isArray(timeRes?.data)
                  ? timeRes.data
                  : Array.isArray(timeRes) ? timeRes : [];
              setTimeEntries(entries);
            } catch (error: any) {
              if (error.errorFields) return;
              message.error(error.response?.data?.message || 'Failed to log time entry. Please try again.');
            }
          }}>Save Entry</Button>
        ]}
      >
        <Form form={timeEntryForm} layout="vertical">
          <Form.Item label="Project" name="project" rules={[{ required: true, message: 'Please select a project' }]}>
            <Select placeholder="Select project">
              {projects.map(p => <Option key={p.id} value={p.id}>{p.name}</Option>)}
            </Select>
          </Form.Item>
          <Form.Item label="Task" name="task">
            <Select placeholder="Select task" allowClear>
              {tasks.map(t => <Option key={t.id} value={t.id}>{t.title}</Option>)}
            </Select>
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Date" name="date" rules={[{ required: true, message: 'Please select a date' }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Hours" name="hours" rules={[{ required: true, message: 'Please enter hours' }]}>
                <InputNumber min={0.25} max={24} step={0.25} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Description" name="description">
            <TextArea rows={2} placeholder="What did you work on?" />
          </Form.Item>
          <Form.Item label="Billable" name="billable" valuePropName="checked" initialValue={true}>
            <Switch defaultChecked />
          </Form.Item>
        </Form>
      </Modal>

      {/* Post Update Modal */}
      <Modal
        title="Post Project Update"
        open={updateModalVisible}
        onCancel={() => { setUpdateModalVisible(false); updateForm.resetFields(); }}
        footer={[
          <Button key="cancel" onClick={() => { setUpdateModalVisible(false); updateForm.resetFields(); }}>Cancel</Button>,
          <Button key="post" type="primary" onClick={async () => {
            try {
              const values = await updateForm.validateFields();
              const updateData = {
                project_id: values.project_id,
                update_type: values.update_type || 'general',
                title: values.title,
                content: values.content || '',
                is_client_visible: values.is_client_visible !== false,
              };
              const newUpdate = await projectService.createProjectUpdate(updateData);
              message.success('Update posted successfully!');
              setUpdateModalVisible(false);
              updateForm.resetFields();
              // Add to local state
              setProjectUpdates(prev => [newUpdate, ...prev]);
              // Also update recent activity
              setRecentActivity(prev => [{
                title: updateData.title,
                description: `${projects.find(p => p.id === updateData.project_id)?.name || 'Project'} — ${updateData.content.substring(0, 80)}`,
                time: new Date().toLocaleString(),
                type: updateData.update_type === 'milestone' ? 'milestone' : 'update',
              }, ...prev].slice(0, 5));
            } catch (error: any) {
              if (error.errorFields) return;
              message.error(error.response?.data?.message || 'Failed to post update');
            }
          }}>Post Update</Button>
        ]}
        width={600}
      >
        <Form form={updateForm} layout="vertical">
          <Form.Item label="Project" name="project_id" rules={[{ required: true, message: 'Select a project' }]}>
            <Select placeholder="Select project" showSearch optionFilterProp="children">
              {projects.map(p => <Option key={p.id} value={p.id}>{p.name}</Option>)}
            </Select>
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Update Type" name="update_type" initialValue="general">
                <Select>
                  <Option value="general">General Update</Option>
                  <Option value="milestone">Milestone Reached</Option>
                  <Option value="status_change">Status Change</Option>
                  <Option value="budget">Budget Update</Option>
                  <Option value="risk">Risk Alert</Option>
                  <Option value="deliverable">Deliverable</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Client Visible" name="is_client_visible" valuePropName="checked" initialValue={true}>
                <Switch defaultChecked />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Title" name="title" rules={[{ required: true, message: 'Enter a title' }]}>
            <Input placeholder="e.g. Phase 1 completed ahead of schedule" />
          </Form.Item>
          <Form.Item label="Details" name="content">
            <TextArea rows={4} placeholder="Describe the update in detail..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Project Detail Drawer */}
      <Drawer 
        title={selectedProject?.name || 'Project Details'}
        open={!!selectedProject}
        onClose={() => setSelectedProject(null)}
        width={640}
        extra={
          <Space>
            <Select 
              value={selectedProject?.status} 
              onChange={(v) => selectedProject && handleStatusChange(selectedProject.id, v)}
              style={{ width: 140 }}
            >
              <Option value="Planning">Planning</Option>
              <Option value="Active">Active</Option>
              <Option value="On Hold">On Hold</Option>
              <Option value="Completed">Completed</Option>
              <Option value="Cancelled">Cancelled</Option>
            </Select>
          </Space>
        }
      >
        {selectedProject && (
          <div>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Project Code">{selectedProject.code}</Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={getStatusColor(selectedProject.status)}>{selectedProject.status.toUpperCase()}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Client">{selectedProject.client}</Descriptions.Item>
              <Descriptions.Item label="Priority">
                <Tag color={getPriorityColor(selectedProject.priority)}>{selectedProject.priority}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Manager">
                <Space><Avatar size="small" icon={<UserOutlined />} /> {selectedProject.manager}</Space>
              </Descriptions.Item>
              <Descriptions.Item label="Type">{selectedProject.type}</Descriptions.Item>
              <Descriptions.Item label="Start Date">{selectedProject.startDate}</Descriptions.Item>
              <Descriptions.Item label="End Date">{selectedProject.endDate}</Descriptions.Item>
              <Descriptions.Item label="Budget">R{selectedProject.budget.toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="Spent">R{selectedProject.spent.toLocaleString()}</Descriptions.Item>
            </Descriptions>

            <Card size="small" title="Progress" style={{ marginBottom: 16 }}>
              <Progress percent={selectedProject.progress} status={selectedProject.progress >= 100 ? 'success' : 'active'} />
            </Card>

            <Card size="small" title="Tasks" style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={12}>
                  <Statistic title="Total Tasks" value={selectedProject.tasks.total} />
                </Col>
                <Col span={12}>
                  <Statistic title="Completed" value={selectedProject.tasks.completed} />
                </Col>
              </Row>
              <Divider style={{ margin: '12px 0' }} />
              <List
                size="small"
                dataSource={tasks.filter(t => t.project_id === selectedProject.id)}
                locale={{ emptyText: 'No tasks yet' }}
                renderItem={(task: any) => (
                  <List.Item>
                    <Space>
                      <Tag color={getTaskStatusColor(task.status?.toLowerCase() || 'todo')}>
                        {task.status || 'Pending'}
                      </Tag>
                      <Text>{task.task_name}</Text>
                    </Space>
                    <Text type="secondary">{task.assigned_to_name || ''}</Text>
                  </List.Item>
                )}
              />
              <Button 
                type="dashed" 
                block 
                icon={<PlusOutlined />} 
                onClick={() => { 
                  setSelectedProject(null); 
                  taskForm.setFieldsValue({ projectId: selectedProject.id }); 
                  setTaskModalVisible(true); 
                }}
                style={{ marginTop: 8 }}
              >
                Add Task
              </Button>
            </Card>

            <Space>
              <Button 
                type="primary" 
                icon={<EditOutlined />}
                onClick={() => {
                  handleProjectAction('edit', selectedProject);
                }}
              >
                Edit Project
              </Button>
              <Button 
                icon={<BarChartOutlined />}
                onClick={() => { setSelectedProject(null); setActiveTab('gantt'); }}
              >
                Gantt Chart
              </Button>
            </Space>
          </div>
        )}
      </Drawer>
    </HubLayout>
  );
};

export default ProjectsHub;
