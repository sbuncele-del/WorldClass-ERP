import React, { useState, useEffect } from 'react';
import { 
  Card, Button, Space, Typography, Modal, Form, Input, Select, 
  DatePicker, Tag, Badge, Row, Col, Tooltip, Spin
} from 'antd';
import apiClient from '../../../services/api';
import { 
  PlusOutlined, LeftOutlined, RightOutlined,
  ClockCircleOutlined, EnvironmentOutlined,
  DeleteOutlined, ReloadOutlined,
  ProjectOutlined, CheckSquareOutlined, DollarOutlined,
  FlagOutlined, CalendarOutlined
} from '@ant-design/icons';
import './CalendarView.css';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  type: 'meeting' | 'task' | 'reminder' | 'holiday' | 'project';
  color: string;
  location?: string;
  attendees?: string[];
  isAllDay?: boolean;
  recurring?: boolean;
  source?: 'manual' | 'project_task' | 'milestone' | 'invoice' | 'project';
  status?: string;
  priority?: string;
  projectName?: string;
  amount?: number;
}

const sourceConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  project_task: { label: 'Task', icon: <CheckSquareOutlined />, color: '#fa541c' },
  milestone: { label: 'Milestone', icon: <FlagOutlined />, color: '#722ed1' },
  invoice: { label: 'Invoice', icon: <DollarOutlined />, color: '#faad14' },
  project: { label: 'Project', icon: <ProjectOutlined />, color: '#1890ff' },
  manual: { label: 'Event', icon: <CalendarOutlined />, color: '#1890ff' },
};

const CalendarView: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/v2/calendar/events');
      const eventsData = response.data?.data || response.data || [];
      const parsedEvents = eventsData.map((event: any) => ({
        ...event,
        start: new Date(event.start || event.start_date),
        end: new Date(event.end || event.end_date)
      }));
      setEvents(parsedEvents);
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async (values: any) => {
    try {
      setSaving(true);
      const [startDate, endDate] = values.dateRange;
      const eventData = {
        title: values.title,
        description: values.description || '',
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        location: values.location || '',
        eventType: values.type,
        attendees: [],
        isAllDay: false
      };
      await apiClient.post('/api/v2/calendar/events', eventData);
      await fetchEvents();
      setCreateModalVisible(false);
      form.resetFields();
    } catch (error) {
      console.error('Error creating event:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!eventId.startsWith('task-') && !eventId.startsWith('milestone-') && !eventId.startsWith('invoice-') && !eventId.startsWith('proj-')) {
      try {
        await apiClient.delete(`/api/v2/calendar/events/${eventId}`);
        await fetchEvents();
        setSelectedEvent(null);
      } catch (error) {
        console.error('Error deleting event:', error);
      }
    }
  };

  const filteredEvents = activeFilters.length === 0 
    ? events 
    : events.filter(e => activeFilters.includes(e.source || 'manual'));

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startingDayOfWeek = firstDay.getDay();
    const days: Date[] = [];
    for (let i = startingDayOfWeek - 1; i >= 0; i--) days.push(new Date(year, month, -i));
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) days.push(new Date(year, month + 1, i));
    return days;
  };

  const getWeekDays = (date: Date) => {
    const days: Date[] = [];
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    for (let i = 0; i < 7; i++) days.push(new Date(date.getFullYear(), date.getMonth(), diff + i));
    return days;
  };

  const getEventsForDay = (date: Date) => {
    return filteredEvents.filter(event => {
      const eventDate = new Date(event.start);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    else if (viewMode === 'week') newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    else newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    setCurrentDate(newDate);
  };

  const goToToday = () => setCurrentDate(new Date());

  const formatTime = (date: Date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const formatDateShort = (date: Date) => date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });

  const getSourceTag = (source?: string) => {
    const cfg = sourceConfig[source || 'manual'] || sourceConfig.manual;
    return (
      <Tag color={cfg.color} style={{ fontSize: 10, padding: '0 4px', lineHeight: '18px', margin: 0 }}>
        {cfg.icon} {cfg.label}
      </Tag>
    );
  };

  const toggleFilter = (source: string) => {
    setActiveFilters(prev => 
      prev.includes(source) ? prev.filter(s => s !== source) : [...prev, source]
    );
  };

  const days = viewMode === 'month' ? getDaysInMonth(currentDate) : getWeekDays(currentDate);
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const hours = Array.from({ length: 12 }, (_, i) => i + 7);

  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const upcomingEvents = filteredEvents
    .filter(e => new Date(e.start) >= now && new Date(e.start) <= weekFromNow)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    .slice(0, 8);

  const overdueEvents = filteredEvents
    .filter(e => new Date(e.start) < now && (e.source === 'project_task' || e.source === 'invoice') && e.status !== 'completed' && e.status !== 'paid')
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  const sourceCounts = events.reduce((acc, e) => {
    const s = e.source || 'manual';
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="calendar-view">
      {/* Header */}
      <div className="calendar-header">
        <div className="header-left">
          <Title level={3} style={{ margin: 0 }}>
            <CalendarOutlined style={{ marginRight: 8 }} />
            Calendar
          </Title>
          <Space style={{ marginLeft: 16 }}>
            <Button.Group>
              <Button icon={<LeftOutlined />} onClick={() => navigateDate('prev')} />
              <Button onClick={goToToday}>Today</Button>
              <Button icon={<RightOutlined />} onClick={() => navigateDate('next')} />
            </Button.Group>
            <Text strong style={{ fontSize: 16, marginLeft: 8 }}>
              {currentDate.toLocaleDateString('en-US', { 
                month: 'long', year: 'numeric',
                ...(viewMode === 'day' && { day: 'numeric' })
              })}
            </Text>
          </Space>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchEvents} loading={loading}>Sync</Button>
          <Button.Group>
            {(['day', 'week', 'month'] as const).map(mode => (
              <Button key={mode} type={viewMode === mode ? 'primary' : 'default'} onClick={() => setViewMode(mode)}>
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </Button>
            ))}
          </Button.Group>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalVisible(true)}>
            New Event
          </Button>
        </Space>
      </div>

      {/* Source filter bar */}
      <div style={{ padding: '8px 0', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <Text type="secondary" style={{ fontSize: 12, marginRight: 8 }}>Sources:</Text>
        {Object.entries(sourceConfig).map(([key, cfg]) => (
          <Tag
            key={key}
            color={activeFilters.length === 0 || activeFilters.includes(key) ? cfg.color : 'default'}
            style={{ cursor: 'pointer', opacity: activeFilters.length > 0 && !activeFilters.includes(key) ? 0.4 : 1 }}
            onClick={() => toggleFilter(key)}
          >
            {cfg.icon} {cfg.label} ({sourceCounts[key] || 0})
          </Tag>
        ))}
        {activeFilters.length > 0 && (
          <Button type="link" size="small" onClick={() => setActiveFilters([])}>Clear filters</Button>
        )}
      </div>

      <Row gutter={16}>
        {/* Calendar Grid */}
        <Col xs={24} lg={18}>
          <Card className="calendar-card" loading={loading}>
            {/* Week/Day View */}
            {(viewMode === 'week' || viewMode === 'day') && (
              <div className="week-view">
                {/* All-day events bar */}
                <div style={{ display: 'flex', borderBottom: '1px solid #f0f0f0', minHeight: 32 }}>
                  <div className="time-gutter" style={{ fontSize: 11, color: '#999', padding: '4px 8px' }}>All day</div>
                  {(viewMode === 'day' ? [currentDate] : days).map((day, idx) => {
                    const allDayEvents = getEventsForDay(day).filter(e => e.isAllDay);
                    return (
                      <div key={idx} style={{ flex: 1, padding: 2, borderLeft: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {allDayEvents.map(event => (
                          <Tooltip key={event.id} title={event.description || event.title}>
                            <div
                              className="event-block allday-event"
                              style={{ backgroundColor: event.color, padding: '2px 4px', borderRadius: 3, cursor: 'pointer', fontSize: 10, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                              onClick={() => setSelectedEvent(event)}
                            >
                              {event.title}
                            </div>
                          </Tooltip>
                        ))}
                      </div>
                    );
                  })}
                </div>

                <div className="week-header">
                  <div className="time-gutter"></div>
                  {(viewMode === 'day' ? [currentDate] : days).map((day, idx) => (
                    <div key={idx} className={`day-header ${day.toDateString() === new Date().toDateString() ? 'today' : ''}`}>
                      <div className="day-name">{dayNames[day.getDay()]}</div>
                      <div className="day-number">{day.getDate()}</div>
                    </div>
                  ))}
                </div>
                
                <div className="time-grid">
                  {hours.map(hour => (
                    <div key={hour} className="time-row">
                      <div className="time-label">
                        {hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                      </div>
                      {(viewMode === 'day' ? [currentDate] : days).map((day, dayIdx) => {
                        const dayEvents = getEventsForDay(day).filter(e => {
                          if (e.isAllDay) return false;
                          return new Date(e.start).getHours() === hour;
                        });
                        return (
                          <div key={dayIdx} className="time-cell">
                            {dayEvents.map(event => (
                              <Tooltip key={event.id} title={event.description || event.title}>
                                <div className="event-block" style={{ backgroundColor: event.color }} onClick={() => setSelectedEvent(event)}>
                                  <div className="event-time">{formatTime(event.start)}</div>
                                  <div className="event-title">{event.title}</div>
                                </div>
                              </Tooltip>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Month View */}
            {viewMode === 'month' && (
              <div className="month-view">
                <div className="month-header">
                  {dayNames.map(name => (
                    <div key={name} className="day-name-header">{name}</div>
                  ))}
                </div>
                <div className="month-grid">
                  {days.map((day, idx) => {
                    const dayEvents = getEventsForDay(day);
                    const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                    const isToday = day.toDateString() === new Date().toDateString();
                    return (
                      <div key={idx} className={`month-cell ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}`}>
                        <div className="cell-date">{day.getDate()}</div>
                        <div className="cell-events">
                          {dayEvents.slice(0, 3).map(event => (
                            <Tooltip key={event.id} title={event.description || event.title}>
                              <div className="event-dot" style={{ backgroundColor: event.color }} onClick={() => setSelectedEvent(event)}>
                                {event.title}
                              </div>
                            </Tooltip>
                          ))}
                          {dayEvents.length > 3 && (
                            <div className="more-events" onClick={() => { setCurrentDate(day); setViewMode('day'); }}>
                              +{dayEvents.length - 3} more
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>
        </Col>

        {/* Sidebar */}
        <Col xs={24} lg={6}>
          {/* Overdue Items */}
          {overdueEvents.length > 0 && (
            <Card 
              title={<span style={{ color: '#f5222d' }}>Overdue ({overdueEvents.length})</span>} 
              size="small" 
              style={{ marginBottom: 12, borderColor: '#ffccc7' }}
              styles={{ body: { padding: '8px 12px' } }}
            >
              {overdueEvents.slice(0, 4).map(event => (
                <div key={event.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, cursor: 'pointer' }} onClick={() => setSelectedEvent(event)}>
                  <div style={{ width: 4, height: 24, borderRadius: 2, backgroundColor: '#f5222d', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontSize: 12, display: 'block' }} ellipsis>{event.title}</Text>
                    <Text type="danger" style={{ fontSize: 10 }}>Due {formatDateShort(new Date(event.start))}</Text>
                  </div>
                  {getSourceTag(event.source)}
                </div>
              ))}
            </Card>
          )}

          {/* Upcoming This Week */}
          <Card title="Upcoming (7 days)" size="small" style={{ marginBottom: 12 }} styles={{ body: { padding: '8px 12px' } }}>
            {upcomingEvents.length === 0 ? (
              <Text type="secondary" style={{ fontSize: 12 }}>No upcoming events</Text>
            ) : (
              upcomingEvents.map(event => (
                <div key={event.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, cursor: 'pointer' }} onClick={() => setSelectedEvent(event)}>
                  <div style={{ width: 4, height: 28, borderRadius: 2, backgroundColor: event.color, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontSize: 12, display: 'block' }} ellipsis>{event.title}</Text>
                    <Text type="secondary" style={{ fontSize: 10 }}>
                      {formatDateShort(new Date(event.start))}
                      {!event.isAllDay && ` \u2022 ${formatTime(new Date(event.start))}`}
                    </Text>
                  </div>
                  {getSourceTag(event.source)}
                </div>
              ))
            )}
          </Card>

          {/* Jump to Date */}
          <Card title="Jump to Date" size="small" style={{ marginBottom: 12 }}>
            <DatePicker style={{ width: '100%' }} value={null} onChange={(date) => date && setCurrentDate(date.toDate())} />
          </Card>

          {/* Data Sources Legend */}
          <Card title="Data Sources" size="small">
            <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>Auto-synced from:</div>
            {Object.entries(sourceConfig).map(([key, cfg]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <Badge color={cfg.color} />
                <Text style={{ fontSize: 12 }}>{cfg.label}s</Text>
                <Text type="secondary" style={{ fontSize: 11, marginLeft: 'auto' }}>{sourceCounts[key] || 0}</Text>
              </div>
            ))}
          </Card>
        </Col>
      </Row>

      {/* Event Detail Modal */}
      <Modal
        title={
          selectedEvent ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 4, height: 20, borderRadius: 2, backgroundColor: selectedEvent.color }} />
              <span>{selectedEvent.title}</span>
            </div>
          ) : null
        }
        open={!!selectedEvent}
        onCancel={() => setSelectedEvent(null)}
        footer={[
          ...(selectedEvent && (selectedEvent.source === 'manual' || !selectedEvent.source) ? [
            <Button key="delete" danger icon={<DeleteOutlined />} onClick={() => selectedEvent && handleDeleteEvent(selectedEvent.id)}>Delete</Button>
          ] : []),
          <Button key="close" type="primary" onClick={() => setSelectedEvent(null)}>Close</Button>
        ]}
      >
        {selectedEvent && (
          <div className="event-details">
            <div style={{ marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {getSourceTag(selectedEvent.source)}
              {selectedEvent.status && (
                <Tag color={selectedEvent.status === 'completed' ? 'green' : selectedEvent.status === 'Not Started' ? 'orange' : 'blue'}>
                  {selectedEvent.status}
                </Tag>
              )}
              {selectedEvent.priority && (
                <Tag color={selectedEvent.priority === 'high' ? 'red' : selectedEvent.priority === 'medium' ? 'orange' : 'green'}>
                  {selectedEvent.priority} priority
                </Tag>
              )}
            </div>
            <div className="detail-row">
              <ClockCircleOutlined />
              <span>
                {selectedEvent.isAllDay ? 'All day' : `${formatTime(selectedEvent.start)} - ${formatTime(selectedEvent.end)}`}
                {' \u2022 '}
                {new Date(selectedEvent.start).toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
            {selectedEvent.location && (
              <div className="detail-row">
                <EnvironmentOutlined />
                <span>{selectedEvent.location}</span>
              </div>
            )}
            {selectedEvent.projectName && (
              <div className="detail-row">
                <ProjectOutlined />
                <span>Project: {selectedEvent.projectName}</span>
              </div>
            )}
            {selectedEvent.description && (
              <div className="detail-row" style={{ marginTop: 8 }}>
                <Text style={{ whiteSpace: 'pre-wrap' }}>{selectedEvent.description}</Text>
              </div>
            )}
            {selectedEvent.source && selectedEvent.source !== 'manual' && (
              <div style={{ marginTop: 12, padding: '8px 12px', background: '#f6f8fa', borderRadius: 6, fontSize: 12, color: '#666' }}>
                This event is auto-synced from {sourceConfig[selectedEvent.source]?.label || 'system'} data. Changes should be made in the source module.
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Create Event Modal */}
      <Modal
        title="Create New Event"
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        footer={null}
        width={500}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateEvent}>
          <Form.Item name="title" label="Event Title" rules={[{ required: true }]}>
            <Input placeholder="Add title" />
          </Form.Item>
          <Form.Item name="type" label="Event Type" rules={[{ required: true }]}>
            <Select placeholder="Select type">
              <Select.Option value="meeting">Meeting</Select.Option>
              <Select.Option value="task">Task</Select.Option>
              <Select.Option value="reminder">Reminder</Select.Option>
              <Select.Option value="project">Project Milestone</Select.Option>
              <Select.Option value="holiday">Holiday / Leave</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="dateRange" label="Date & Time" rules={[{ required: true }]}>
            <RangePicker showTime style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="location" label="Location">
            <Input prefix={<EnvironmentOutlined />} placeholder="Add location or video link" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} placeholder="Add description" />
          </Form.Item>
          <Form.Item name="reminder" label="Reminder">
            <Select placeholder="Set reminder" allowClear>
              <Select.Option value="5">5 minutes before</Select.Option>
              <Select.Option value="15">15 minutes before</Select.Option>
              <Select.Option value="30">30 minutes before</Select.Option>
              <Select.Option value="60">1 hour before</Select.Option>
              <Select.Option value="1440">1 day before</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setCreateModalVisible(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={saving}>Create Event</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CalendarView;
