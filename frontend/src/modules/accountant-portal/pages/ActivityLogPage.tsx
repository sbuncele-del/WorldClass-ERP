import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  DatePicker,
  Select,
  Input,
  Space,
  Tag,
  message,
  Empty,
  Typography,
  Row,
  Col,
} from 'antd';
import {
  HistoryOutlined,
  ReloadOutlined,
  DownloadOutlined,
  SearchOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ActivityEntry {
  id: string;
  timestamp: string;
  user_name: string;
  user_email: string;
  client_name: string;
  client_tenant_id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  details: string;
  ip_address: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const actionColors: Record<string, string> = {
  switch_to_client: 'blue',
  switch_back: 'geekblue',
  create: 'green',
  update: 'orange',
  delete: 'red',
  view: 'default',
  export: 'purple',
  login: 'cyan',
  invite: 'gold',
};

const formatDateTime = (iso: string) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const authHeaders = () => ({
  'Authorization': `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json',
});

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const ActivityLogPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Filters
  const [dateRange, setDateRange] = useState<[any, any] | null>(null);
  const [clientFilter, setClientFilter] = useState<string>('');
  const [actionFilter, setActionFilter] = useState<string>('');
  const [searchText, setSearchText] = useState('');

  const fetchActivity = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(pageSize));
      if (dateRange && dateRange[0] && dateRange[1]) {
        params.set('startDate', dateRange[0].toISOString());
        params.set('endDate', dateRange[1].toISOString());
      }
      if (clientFilter) params.set('clientTenantId', clientFilter);
      if (actionFilter) params.set('action', actionFilter);
      if (searchText) params.set('search', searchText);

      const res = await fetch(`/api/v2/accountant-portal/activity?${params.toString()}`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('Failed to load activity');
      const json = await res.json();
      setEntries(json.data?.entries || json.data || []);
      setTotal(json.data?.total || json.data?.length || 0);
    } catch (err) {
      console.error('Activity fetch error:', err);
      message.error('Failed to load activity log');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, dateRange, clientFilter, actionFilter, searchText]);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  /* ---------- export ---------- */
  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      params.set('format', 'csv');
      if (dateRange && dateRange[0] && dateRange[1]) {
        params.set('startDate', dateRange[0].toISOString());
        params.set('endDate', dateRange[1].toISOString());
      }
      if (clientFilter) params.set('clientTenantId', clientFilter);
      if (actionFilter) params.set('action', actionFilter);

      const res = await fetch(`/api/v2/accountant-portal/activity?${params.toString()}`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('Export failed');

      const json = await res.json();
      const data = json.data?.entries || json.data || [];

      // Build CSV
      const headers = ['Timestamp', 'User', 'Client', 'Action', 'Resource', 'Details'];
      const rows = data.map((e: ActivityEntry) => [
        e.timestamp,
        e.user_name,
        e.client_name,
        e.action,
        e.resource_type,
        `"${(e.details || '').replace(/"/g, '""')}"`,
      ]);
      const csv = [headers.join(','), ...rows.map((r: string[]) => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `activity-log-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      message.success('Activity log exported');
    } catch {
      message.error('Failed to export activity log');
    }
  };

  /* ---------- reset ---------- */
  const handleReset = () => {
    setDateRange(null);
    setClientFilter('');
    setActionFilter('');
    setSearchText('');
    setPage(1);
  };

  /* ---------- columns ---------- */
  const columns: ColumnsType<ActivityEntry> = [
    {
      title: 'Timestamp',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 180,
      sorter: (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      defaultSortOrder: 'descend',
      render: formatDateTime,
    },
    {
      title: 'User',
      dataIndex: 'user_name',
      key: 'user_name',
      width: 160,
      render: (v: string, r) => (
        <div>
          <Text strong style={{ fontSize: 13 }}>{v || '—'}</Text>
          {r.user_email && (
            <div><Text type="secondary" style={{ fontSize: 11 }}>{r.user_email}</Text></div>
          )}
        </div>
      ),
    },
    {
      title: 'Client',
      dataIndex: 'client_name',
      key: 'client_name',
      width: 160,
      render: (v: string) => v || <Text type="secondary">—</Text>,
    },
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
      width: 150,
      render: (v: string) => (
        <Tag color={actionColors[v] || 'default'}>{(v || '').replace(/_/g, ' ')}</Tag>
      ),
    },
    {
      title: 'Resource',
      dataIndex: 'resource_type',
      key: 'resource_type',
      width: 130,
      responsive: ['lg'],
      render: (v: string) => v ? <Tag>{v}</Tag> : '—',
    },
    {
      title: 'Details',
      dataIndex: 'details',
      key: 'details',
      ellipsis: true,
      render: (v: string) => v || '—',
    },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            <HistoryOutlined style={{ marginRight: 8 }} />
            Activity Log
          </Title>
        </Col>
        <Col>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchActivity} />
            <Button icon={<DownloadOutlined />} onClick={handleExport}>
              Export CSV
            </Button>
          </Space>
        </Col>
      </Row>

      {/* ---- Filters ---- */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <RangePicker
              value={dateRange as any}
              onChange={(dates) => { setDateRange(dates as any); setPage(1); }}
              style={{ width: '100%' }}
              placeholder={['Start date', 'End date']}
            />
          </Col>
          <Col xs={24} sm={12} md={5}>
            <Input
              placeholder="Filter by client…"
              prefix={<SearchOutlined />}
              value={clientFilter}
              onChange={(e) => { setClientFilter(e.target.value); setPage(1); }}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={5}>
            <Select
              placeholder="Action type"
              value={actionFilter || undefined}
              onChange={(v) => { setActionFilter(v || ''); setPage(1); }}
              allowClear
              style={{ width: '100%' }}
            >
              <Option value="switch_to_client">Switch to Client</Option>
              <Option value="switch_back">Switch Back</Option>
              <Option value="create">Create</Option>
              <Option value="update">Update</Option>
              <Option value="delete">Delete</Option>
              <Option value="view">View</Option>
              <Option value="export">Export</Option>
              <Option value="invite">Invite</Option>
              <Option value="login">Login</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={5}>
            <Input
              placeholder="Search details…"
              prefix={<FilterOutlined />}
              value={searchText}
              onChange={(e) => { setSearchText(e.target.value); setPage(1); }}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={3}>
            <Button block onClick={handleReset}>Reset</Button>
          </Col>
        </Row>
      </Card>

      {/* ---- Table ---- */}
      <Card bodyStyle={{ padding: 0 }}>
        <Table
          columns={columns}
          dataSource={entries}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (t) => `${t} entries`,
            onChange: (p, ps) => { setPage(p); setPageSize(ps); },
          }}
          locale={{ emptyText: <Empty description="No activity logged yet" /> }}
          scroll={{ x: 900 }}
          size="middle"
        />
      </Card>
    </div>
  );
};

export default ActivityLogPage;
