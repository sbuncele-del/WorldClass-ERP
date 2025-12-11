import React, { useState } from 'react';
import { 
  Card, Table, Button, Space, Select, DatePicker, Tag, Avatar, 
  Statistic, Row, Col, Modal, Form, Input, InputNumber, message, 
  Progress, Tabs
} from 'antd';
import { 
  PlusOutlined, PlayCircleOutlined, PauseCircleOutlined, 
  ClockCircleOutlined, CalendarOutlined, DownloadOutlined,
  FilterOutlined, BarChartOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import './TimeTracking.css';

const { RangePicker } = DatePicker;

interface TimeEntry {
  id: string;
  project: string;
  projectColor: string;
  task: string;
  user: string;
  date: string;
  hours: number;
  description: string;
  billable: boolean;
  rate?: number;
  status: 'draft' | 'submitted' | 'approved';
}

interface TimerState {
  running: boolean;
  project: string;
  task: string;
  startTime: Date | null;
  elapsed: number;
}

// Sample data
const sampleEntries: TimeEntry[] = [
  {
    id: '1',
    project: 'Website Redesign',
    projectColor: '#1890ff',
    task: 'Frontend Development',
    user: 'Mike Wilson',
    date: '2024-02-20',
    hours: 6.5,
    description: 'Implemented responsive header and navigation components',
    billable: true,
    rate: 125,
    status: 'approved'
  },
  {
    id: '2',
    project: 'Website Redesign',
    projectColor: '#1890ff',
    task: 'Code Review',
    user: 'Sarah Johnson',
    date: '2024-02-20',
    hours: 2,
    description: 'Reviewed pull requests and provided feedback',
    billable: true,
    rate: 150,
    status: 'approved'
  },
  {
    id: '3',
    project: 'Mobile App',
    projectColor: '#52c41a',
    task: 'iOS Development',
    user: 'Alex Turner',
    date: '2024-02-20',
    hours: 8,
    description: 'Built user authentication flow and profile screen',
    billable: true,
    rate: 135,
    status: 'submitted'
  },
  {
    id: '4',
    project: 'Website Redesign',
    projectColor: '#1890ff',
    task: 'Design Updates',
    user: 'Emily Chen',
    date: '2024-02-19',
    hours: 4,
    description: 'Updated design system components in Figma',
    billable: true,
    rate: 110,
    status: 'approved'
  },
  {
    id: '5',
    project: 'Internal',
    projectColor: '#722ed1',
    task: 'Team Meeting',
    user: 'Sarah Johnson',
    date: '2024-02-19',
    hours: 1.5,
    description: 'Weekly team standup and planning',
    billable: false,
    status: 'draft'
  },
  {
    id: '6',
    project: 'Mobile App',
    projectColor: '#52c41a',
    task: 'Bug Fixes',
    user: 'David Lee',
    date: '2024-02-19',
    hours: 3,
    description: 'Fixed crash on app launch for older devices',
    billable: true,
    rate: 125,
    status: 'approved'
  }
];

const TimeTracking: React.FC = () => {
  const [entries, setEntries] = useState<TimeEntry[]>(sampleEntries);
  const [timer, setTimer] = useState<TimerState>({
    running: false,
    project: '',
    task: '',
    startTime: null,
    elapsed: 0
  });
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [form] = Form.useForm();

  // Calculate stats
  const todayHours = entries.filter(e => e.date === '2024-02-20').reduce((sum, e) => sum + e.hours, 0);
  const weekHours = entries.reduce((sum, e) => sum + e.hours, 0);
  const billableHours = entries.filter(e => e.billable).reduce((sum, e) => sum + e.hours, 0);
  const totalBillable = entries.filter(e => e.billable && e.rate).reduce((sum, e) => sum + (e.hours * (e.rate || 0)), 0);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const startTimer = () => {
    if (!timer.project || !timer.task) {
      message.warning('Please select a project and task first');
      return;
    }
    setTimer({
      ...timer,
      running: true,
      startTime: new Date()
    });
    message.success('Timer started');
  };

  const stopTimer = () => {
    if (timer.startTime) {
      const hours = timer.elapsed / 3600;
      const newEntry: TimeEntry = {
        id: String(Date.now()),
        project: timer.project,
        projectColor: '#1890ff',
        task: timer.task,
        user: 'Current User',
        date: new Date().toISOString().split('T')[0],
        hours: Math.round(hours * 100) / 100,
        description: '',
        billable: true,
        status: 'draft'
      };
      setEntries([newEntry, ...entries]);
    }
    setTimer({
      running: false,
      project: '',
      task: '',
      startTime: null,
      elapsed: 0
    });
    message.success('Time entry saved');
  };

  // Update timer every second
  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer.running && timer.startTime) {
      interval = setInterval(() => {
        setTimer(prev => ({
          ...prev,
          elapsed: Math.floor((new Date().getTime() - (prev.startTime?.getTime() || 0)) / 1000)
        }));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer.running, timer.startTime]);

  const handleAddEntry = (values: any) => {
    const newEntry: TimeEntry = {
      id: String(Date.now()),
      project: values.project,
      projectColor: '#1890ff',
      task: values.task,
      user: 'Current User',
      date: values.date.format('YYYY-MM-DD'),
      hours: values.hours,
      description: values.description || '',
      billable: values.billable || false,
      rate: values.rate,
      status: 'draft'
    };
    setEntries([newEntry, ...entries]);
    setAddModalVisible(false);
    form.resetFields();
    message.success('Time entry added');
  };

  const columns: ColumnsType<TimeEntry> = [
    {
      title: 'Project',
      dataIndex: 'project',
      key: 'project',
      render: (project, record) => (
        <div className="project-cell">
          <span className="project-indicator" style={{ backgroundColor: record.projectColor }} />
          {project}
        </div>
      )
    },
    {
      title: 'Task',
      dataIndex: 'task',
      key: 'task'
    },
    {
      title: 'Team Member',
      dataIndex: 'user',
      key: 'user',
      render: (user) => (
        <Space>
          <Avatar size="small">{user[0]}</Avatar>
          {user}
        </Space>
      )
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      sorter: (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    },
    {
      title: 'Hours',
      dataIndex: 'hours',
      key: 'hours',
      render: (hours) => <strong>{hours}h</strong>,
      sorter: (a, b) => a.hours - b.hours
    },
    {
      title: 'Billable',
      key: 'billable',
      render: (_, record) => (
        record.billable ? (
          <span className="billable-amount">
            ${((record.rate || 0) * record.hours).toLocaleString()}
          </span>
        ) : (
          <Tag>Non-billable</Tag>
        )
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const colors = { draft: 'default', submitted: 'processing', approved: 'success' };
        return <Tag color={colors[status as keyof typeof colors]}>{status.toUpperCase()}</Tag>;
      }
    }
  ];

  // Project breakdown
  const projectBreakdown = entries.reduce((acc, entry) => {
    if (!acc[entry.project]) {
      acc[entry.project] = { hours: 0, color: entry.projectColor };
    }
    acc[entry.project].hours += entry.hours;
    return acc;
  }, {} as Record<string, { hours: number; color: string }>);

  return (
    <div className="time-tracking">
      {/* Header */}
      <div className="page-header">
        <h1>Time Tracking</h1>
        <Space>
          <RangePicker />
          <Button icon={<FilterOutlined />}>Filter</Button>
          <Button icon={<DownloadOutlined />}>Export</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddModalVisible(true)}>
            Add Entry
          </Button>
        </Space>
      </div>

      {/* Timer Widget */}
      <Card className="timer-card">
        <Row gutter={[24, 16]} align="middle">
          <Col xs={24} md={10}>
            <Space size="large">
              <Select
                placeholder="Select Project"
                style={{ width: 180 }}
                value={timer.project || undefined}
                onChange={(val) => setTimer({ ...timer, project: val })}
                disabled={timer.running}
              >
                <Select.Option value="Website Redesign">Website Redesign</Select.Option>
                <Select.Option value="Mobile App">Mobile App</Select.Option>
                <Select.Option value="Internal">Internal</Select.Option>
              </Select>
              <Input
                placeholder="What are you working on?"
                value={timer.task}
                onChange={(e) => setTimer({ ...timer, task: e.target.value })}
                disabled={timer.running}
                style={{ width: 250 }}
              />
            </Space>
          </Col>
          <Col xs={24} md={8} style={{ textAlign: 'center' }}>
            <div className="timer-display">
              <ClockCircleOutlined style={{ marginRight: 8 }} />
              {formatTime(timer.elapsed)}
            </div>
          </Col>
          <Col xs={24} md={6} style={{ textAlign: 'right' }}>
            {!timer.running ? (
              <Button 
                type="primary" 
                size="large" 
                icon={<PlayCircleOutlined />}
                onClick={startTimer}
              >
                Start Timer
              </Button>
            ) : (
              <Button 
                danger 
                size="large" 
                icon={<PauseCircleOutlined />}
                onClick={stopTimer}
              >
                Stop Timer
              </Button>
            )}
          </Col>
        </Row>
      </Card>

      {/* Stats */}
      <Row gutter={[16, 16]} className="stats-row">
        <Col xs={12} sm={6}>
          <Card>
            <Statistic title="Today" value={todayHours} suffix="hours" prefix={<ClockCircleOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic title="This Week" value={weekHours} suffix="hours" />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic title="Billable Hours" value={billableHours} suffix="hours" valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic title="Billable Amount" value={totalBillable} prefix="$" valueStyle={{ color: '#1890ff' }} />
          </Card>
        </Col>
      </Row>

      {/* Main Content */}
      <Row gutter={24}>
        <Col xs={24} lg={18}>
          <Card title="Time Entries">
            <Table
              columns={columns}
              dataSource={entries}
              rowKey="id"
              pagination={{ pageSize: 10 }}
            />
          </Card>
        </Col>
        <Col xs={24} lg={6}>
          <Card title="By Project" extra={<BarChartOutlined />}>
            {Object.entries(projectBreakdown).map(([project, data]) => (
              <div key={project} className="project-breakdown-item">
                <div className="breakdown-header">
                  <span className="breakdown-indicator" style={{ backgroundColor: data.color }} />
                  <span className="breakdown-name">{project}</span>
                  <span className="breakdown-hours">{data.hours}h</span>
                </div>
                <Progress 
                  percent={Math.round((data.hours / weekHours) * 100)} 
                  showInfo={false}
                  strokeColor={data.color}
                  size="small"
                />
              </div>
            ))}
          </Card>
        </Col>
      </Row>

      {/* Add Entry Modal */}
      <Modal
        title="Add Time Entry"
        open={addModalVisible}
        onCancel={() => setAddModalVisible(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleAddEntry}>
          <Form.Item name="project" label="Project" rules={[{ required: true }]}>
            <Select placeholder="Select project">
              <Select.Option value="Website Redesign">Website Redesign</Select.Option>
              <Select.Option value="Mobile App">Mobile App</Select.Option>
              <Select.Option value="Internal">Internal</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="task" label="Task" rules={[{ required: true }]}>
            <Input placeholder="What did you work on?" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="date" label="Date" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="hours" label="Hours" rules={[{ required: true }]}>
                <InputNumber min={0.25} step={0.25} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="billable" valuePropName="checked">
                <Select placeholder="Billable?">
                  <Select.Option value={true}>Billable</Select.Option>
                  <Select.Option value={false}>Non-billable</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="rate" label="Hourly Rate">
                <InputNumber prefix="$" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setAddModalVisible(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit">Add Entry</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TimeTracking;
