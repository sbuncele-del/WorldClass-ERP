import React, { useState, useRef, useEffect } from 'react';
import { Card, Button, Space, Select, Tag, Avatar, Tooltip, DatePicker, Row, Col, Badge } from 'antd';
import { 
  ZoomInOutlined, ZoomOutOutlined, FullscreenOutlined, FilterOutlined,
  LeftOutlined, RightOutlined, TodayOutlined, DownloadOutlined
} from '@ant-design/icons';
import './GanttView.css';

const { RangePicker } = DatePicker;

interface GanttTask {
  id: string;
  name: string;
  project: string;
  projectColor: string;
  start: Date;
  end: Date;
  progress: number;
  assignee: string;
  status: 'not-started' | 'in-progress' | 'completed' | 'delayed';
  dependencies?: string[];
  type: 'task' | 'milestone' | 'project';
}

// Sample data
const sampleTasks: GanttTask[] = [
  {
    id: '1',
    name: 'Website Redesign',
    project: 'Website Redesign',
    projectColor: '#1890ff',
    start: new Date('2024-01-15'),
    end: new Date('2024-03-30'),
    progress: 65,
    assignee: 'Sarah Johnson',
    status: 'in-progress',
    type: 'project'
  },
  {
    id: '2',
    name: 'Design Phase',
    project: 'Website Redesign',
    projectColor: '#1890ff',
    start: new Date('2024-01-15'),
    end: new Date('2024-02-01'),
    progress: 100,
    assignee: 'Emily Chen',
    status: 'completed',
    type: 'task'
  },
  {
    id: '3',
    name: 'Design Approval',
    project: 'Website Redesign',
    projectColor: '#1890ff',
    start: new Date('2024-02-01'),
    end: new Date('2024-02-01'),
    progress: 100,
    assignee: 'Sarah Johnson',
    status: 'completed',
    type: 'milestone',
    dependencies: ['2']
  },
  {
    id: '4',
    name: 'Frontend Development',
    project: 'Website Redesign',
    projectColor: '#1890ff',
    start: new Date('2024-02-02'),
    end: new Date('2024-03-01'),
    progress: 70,
    assignee: 'Mike Wilson',
    status: 'in-progress',
    type: 'task',
    dependencies: ['3']
  },
  {
    id: '5',
    name: 'Backend API',
    project: 'Website Redesign',
    projectColor: '#1890ff',
    start: new Date('2024-02-05'),
    end: new Date('2024-02-28'),
    progress: 50,
    assignee: 'David Lee',
    status: 'in-progress',
    type: 'task'
  },
  {
    id: '6',
    name: 'Testing & QA',
    project: 'Website Redesign',
    projectColor: '#1890ff',
    start: new Date('2024-03-01'),
    end: new Date('2024-03-20'),
    progress: 0,
    assignee: 'Sarah Johnson',
    status: 'not-started',
    type: 'task',
    dependencies: ['4', '5']
  },
  {
    id: '7',
    name: 'Launch',
    project: 'Website Redesign',
    projectColor: '#1890ff',
    start: new Date('2024-03-30'),
    end: new Date('2024-03-30'),
    progress: 0,
    assignee: 'Sarah Johnson',
    status: 'not-started',
    type: 'milestone',
    dependencies: ['6']
  },
  {
    id: '8',
    name: 'Mobile App Development',
    project: 'Mobile App',
    projectColor: '#52c41a',
    start: new Date('2024-02-01'),
    end: new Date('2024-06-30'),
    progress: 40,
    assignee: 'Mike Wilson',
    status: 'in-progress',
    type: 'project'
  },
  {
    id: '9',
    name: 'UI/UX Design',
    project: 'Mobile App',
    projectColor: '#52c41a',
    start: new Date('2024-02-01'),
    end: new Date('2024-02-28'),
    progress: 100,
    assignee: 'Emily Chen',
    status: 'completed',
    type: 'task'
  },
  {
    id: '10',
    name: 'iOS Development',
    project: 'Mobile App',
    projectColor: '#52c41a',
    start: new Date('2024-03-01'),
    end: new Date('2024-05-15'),
    progress: 30,
    assignee: 'Alex Turner',
    status: 'in-progress',
    type: 'task',
    dependencies: ['9']
  },
  {
    id: '11',
    name: 'Android Development',
    project: 'Mobile App',
    projectColor: '#52c41a',
    start: new Date('2024-03-01'),
    end: new Date('2024-05-15'),
    progress: 25,
    assignee: 'Lisa Park',
    status: 'delayed',
    type: 'task',
    dependencies: ['9']
  }
];

const statusColors = {
  'not-started': '#d9d9d9',
  'in-progress': '#1890ff',
  'completed': '#52c41a',
  'delayed': '#ff4d4f'
};

const GanttView: React.FC = () => {
  const [tasks] = useState<GanttTask[]>(sampleTasks);
  const [zoom, setZoom] = useState<'day' | 'week' | 'month'>('week');
  const [viewStart, setViewStart] = useState(new Date('2024-01-01'));
  const chartRef = useRef<HTMLDivElement>(null);

  // Calculate timeline
  const getViewEnd = () => {
    const end = new Date(viewStart);
    if (zoom === 'day') end.setDate(end.getDate() + 30);
    else if (zoom === 'week') end.setDate(end.getDate() + 90);
    else end.setMonth(end.getMonth() + 12);
    return end;
  };

  const viewEnd = getViewEnd();

  // Generate date headers
  const generateDateHeaders = () => {
    const headers: { date: Date; label: string }[] = [];
    const current = new Date(viewStart);
    
    while (current <= viewEnd) {
      if (zoom === 'day') {
        headers.push({ date: new Date(current), label: current.toLocaleDateString('en-US', { day: 'numeric', weekday: 'short' }) });
        current.setDate(current.getDate() + 1);
      } else if (zoom === 'week') {
        headers.push({ date: new Date(current), label: `${current.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` });
        current.setDate(current.getDate() + 7);
      } else {
        headers.push({ date: new Date(current), label: current.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }) });
        current.setMonth(current.getMonth() + 1);
      }
    }
    return headers;
  };

  const dateHeaders = generateDateHeaders();

  // Calculate bar position
  const getBarPosition = (task: GanttTask) => {
    const totalDays = (viewEnd.getTime() - viewStart.getTime()) / (1000 * 60 * 60 * 24);
    const startOffset = Math.max(0, (task.start.getTime() - viewStart.getTime()) / (1000 * 60 * 60 * 24));
    const duration = (task.end.getTime() - task.start.getTime()) / (1000 * 60 * 60 * 24);
    
    return {
      left: `${(startOffset / totalDays) * 100}%`,
      width: task.type === 'milestone' ? '20px' : `${Math.max(1, (duration / totalDays) * 100)}%`
    };
  };

  const navigateTimeline = (direction: 'prev' | 'next') => {
    const newStart = new Date(viewStart);
    if (zoom === 'day') newStart.setDate(newStart.getDate() + (direction === 'next' ? 14 : -14));
    else if (zoom === 'week') newStart.setDate(newStart.getDate() + (direction === 'next' ? 30 : -30));
    else newStart.setMonth(newStart.getMonth() + (direction === 'next' ? 3 : -3));
    setViewStart(newStart);
  };

  const goToToday = () => {
    const today = new Date();
    if (zoom === 'day') today.setDate(today.getDate() - 7);
    else if (zoom === 'week') today.setDate(today.getDate() - 30);
    else today.setMonth(today.getMonth() - 1);
    setViewStart(today);
  };

  // Group tasks by project
  const groupedTasks = tasks.reduce((acc, task) => {
    if (!acc[task.project]) acc[task.project] = [];
    acc[task.project].push(task);
    return acc;
  }, {} as Record<string, GanttTask[]>);

  return (
    <div className="gantt-view">
      {/* Header */}
      <div className="gantt-header">
        <h1>Gantt Chart</h1>
        <Space>
          <Button.Group>
            <Button icon={<LeftOutlined />} onClick={() => navigateTimeline('prev')} />
            <Button icon={<TodayOutlined />} onClick={goToToday}>Today</Button>
            <Button icon={<RightOutlined />} onClick={() => navigateTimeline('next')} />
          </Button.Group>
          <Select value={zoom} onChange={setZoom} style={{ width: 100 }}>
            <Select.Option value="day">Day</Select.Option>
            <Select.Option value="week">Week</Select.Option>
            <Select.Option value="month">Month</Select.Option>
          </Select>
          <Button icon={<FilterOutlined />}>Filter</Button>
          <Button icon={<DownloadOutlined />}>Export</Button>
        </Space>
      </div>

      {/* Legend */}
      <Row gutter={16} className="gantt-legend">
        <Col>
          <Badge color="#52c41a" text="Completed" />
        </Col>
        <Col>
          <Badge color="#1890ff" text="In Progress" />
        </Col>
        <Col>
          <Badge color="#d9d9d9" text="Not Started" />
        </Col>
        <Col>
          <Badge color="#ff4d4f" text="Delayed" />
        </Col>
        <Col>
          <span className="legend-item"><span className="milestone-icon">◆</span> Milestone</span>
        </Col>
      </Row>

      {/* Gantt Chart */}
      <Card className="gantt-card" bodyStyle={{ padding: 0 }}>
        <div className="gantt-container" ref={chartRef}>
          {/* Timeline Header */}
          <div className="gantt-timeline">
            <div className="timeline-task-col">Task / Project</div>
            <div className="timeline-dates">
              {dateHeaders.map((header, idx) => (
                <div key={idx} className="timeline-date-cell">
                  {header.label}
                </div>
              ))}
            </div>
          </div>

          {/* Tasks */}
          <div className="gantt-body">
            {Object.entries(groupedTasks).map(([project, projectTasks]) => (
              <div key={project} className="gantt-project-group">
                {projectTasks.map((task) => (
                  <div key={task.id} className={`gantt-row ${task.type === 'project' ? 'project-row' : ''}`}>
                    <div className="gantt-task-info">
                      <div className="task-name-col">
                        <span 
                          className="task-indicator" 
                          style={{ backgroundColor: task.projectColor }}
                        />
                        <span className={`task-name ${task.type === 'project' ? 'project-name' : ''}`}>
                          {task.name}
                        </span>
                        {task.type === 'milestone' && <span className="milestone-badge">◆</span>}
                      </div>
                      <Avatar size="small" className="task-avatar">{task.assignee[0]}</Avatar>
                    </div>
                    <div className="gantt-task-bar-container">
                      {/* Grid lines */}
                      <div className="gantt-grid">
                        {dateHeaders.map((_, idx) => (
                          <div key={idx} className="grid-line" />
                        ))}
                      </div>
                      {/* Task bar */}
                      <Tooltip title={
                        <div>
                          <div><strong>{task.name}</strong></div>
                          <div>Progress: {task.progress}%</div>
                          <div>Assignee: {task.assignee}</div>
                          <div>{task.start.toLocaleDateString()} - {task.end.toLocaleDateString()}</div>
                        </div>
                      }>
                        <div 
                          className={`gantt-bar ${task.type}`}
                          style={{
                            ...getBarPosition(task),
                            backgroundColor: task.type === 'milestone' ? 'transparent' : statusColors[task.status]
                          }}
                        >
                          {task.type !== 'milestone' && (
                            <>
                              <div 
                                className="gantt-bar-progress" 
                                style={{ width: `${task.progress}%` }}
                              />
                              {task.type === 'project' && (
                                <span className="bar-label">{task.progress}%</span>
                              )}
                            </>
                          )}
                          {task.type === 'milestone' && (
                            <div className="milestone-diamond" style={{ backgroundColor: statusColors[task.status] }} />
                          )}
                        </div>
                      </Tooltip>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default GanttView;
