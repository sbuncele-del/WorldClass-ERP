import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Table,
  Card,
  Statistic,
  Tag,
  Button,
  Input,
  Space,
  Row,
  Col,
  Tooltip,
  Progress,
  Dropdown,
  Alert,
  Empty,
  Spin,
  Badge
} from 'antd';
import type { MenuProps } from 'antd';
import {
  UserOutlined,
  SafetyOutlined,
  TrophyOutlined,
  WarningOutlined,
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  FileTextOutlined,
  MoreOutlined,
  ExportOutlined,
  FilterOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CarOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import EnterpriseLayout from '../../components/layout/EnterpriseLayout';
import { driversAPI } from '../../services/logistics.api';
import './logistics-enterprise.css';

interface Driver {
  driver_id: number;
  name: string;
  employee_id: string;
  id_number: string;
  license_type: string;
  license_number: string;
  license_expiry: string;
  prdp_expiry: string;
  medical_expiry: string;
  status: string;
  phone: string;
  email: string;
  total_trips?: number;
  on_time_rate?: number;
  incidents?: number;
  current_trip_id?: string;
  created_at?: string;
  updated_at?: string;
}

interface DriverStats {
  total: number;
  active: number;
  onTrip: number;
  onLeave: number;
  expiryAlerts: number;
  avgOnTimeRate: number;
}

const DriverManagementEnterprise: React.FC = () => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [filteredDrivers, setFilteredDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [licenseFilter, setLicenseFilter] = useState<string>('ALL');
  const [stats, setStats] = useState<DriverStats>({
    total: 0,
    active: 0,
    onTrip: 0,
    onLeave: 0,
    expiryAlerts: 0,
    avgOnTimeRate: 0
  });

  const tabs = [
    { id: 'command', label: '🎯 Command Center', path: '/logistics/dashboard' },
    { id: 'planner', label: '📋 Load Planner', path: '/logistics/planner' },
    { id: 'trips', label: '🚚 Trip Management', path: '/logistics/trips' },
    { id: 'fleet', label: '🚛 Fleet', path: '/logistics/fleet' },
    { id: 'drivers', label: '👨‍✈️ Drivers', path: '/logistics/drivers' },
    { id: 'fuel', label: '⛽ Fuel', path: '/logistics/fuel' },
    { id: 'reports', label: '📊 Analytics', path: '/logistics/reports' }
  ];

  const breadcrumbs = [
    { label: 'Logistics', path: '/logistics' },
    { label: 'Driver Management' }
  ];

  useEffect(() => {
    fetchDrivers();
  }, []);

  useEffect(() => {
    filterDrivers();
  }, [drivers, searchTerm, statusFilter, licenseFilter]);

  const fetchDrivers = async () => {
    setLoading(true);
    try {
      const response = await driversAPI.getDrivers();
      setDrivers(response.drivers);
      calculateStats(response.drivers);
    } catch (error) {
      console.error('Error fetching drivers:', error);
      setDrivers([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (driverList: Driver[]) => {
    const total = driverList.length;
    const active = driverList.filter(d => d.status === 'ACTIVE').length;
    const onTrip = driverList.filter(d => d.status === 'ON_TRIP').length;
    const onLeave = driverList.filter(d => d.status === 'ON_LEAVE').length;

    // Calculate expiry alerts (within 30 days or expired)
    const expiryAlerts = driverList.filter(d => {
      const licenseDays = getExpiryDays(d.license_expiry);
      const prdpDays = getExpiryDays(d.prdp_expiry);
      const medicalDays = getExpiryDays(d.medical_expiry);
      return licenseDays <= 30 || prdpDays <= 30 || medicalDays <= 30;
    }).length;

    // Calculate average on-time rate
    const driversWithRates = driverList.filter(d => d.on_time_rate !== undefined && d.on_time_rate !== null);
    const avgOnTimeRate = driversWithRates.length > 0
      ? driversWithRates.reduce((sum, d) => sum + (d.on_time_rate || 0), 0) / driversWithRates.length
      : 0;

    setStats({
      total,
      active,
      onTrip,
      onLeave,
      expiryAlerts,
      avgOnTimeRate
    });
  };

  const filterDrivers = () => {
    let filtered = [...drivers];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        d =>
          d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          d.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          d.id_number.includes(searchTerm) ||
          d.phone?.includes(searchTerm) ||
          d.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(d => d.status === statusFilter);
    }

    // License filter
    if (licenseFilter !== 'ALL') {
      filtered = filtered.filter(d => d.license_type === licenseFilter);
    }

    setFilteredDrivers(filtered);
  };

  const getExpiryDays = (expiryDate: string): number => {
    return Math.ceil((new Date(expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  };

  const getExpiryStatus = (days: number): 'success' | 'warning' | 'error' => {
    if (days < 0) return 'error';
    if (days <= 14) return 'error';
    if (days <= 30) return 'warning';
    return 'success';
  };

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      ACTIVE: 'success',
      ON_TRIP: 'processing',
      ON_LEAVE: 'warning',
      INACTIVE: 'default',
      SUSPENDED: 'error'
    };
    return colors[status] || 'default';
  };

  const actionMenuItems = (driver: Driver): MenuProps['items'] => [
    {
      key: 'edit',
      icon: <EditOutlined />,
      label: 'Edit Details'
    },
    {
      key: 'documents',
      icon: <FileTextOutlined />,
      label: 'View Documents'
    },
    {
      key: 'trips',
      icon: <CarOutlined />,
      label: 'Trip History'
    },
    {
      key: 'export',
      icon: <ExportOutlined />,
      label: 'Export Report'
    }
  ];

  const columns: ColumnsType<Driver> = [
    {
      title: 'Driver',
      key: 'driver',
      fixed: 'left',
      width: 220,
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: '14px', color: '#1e293b' }}>
            {record.name}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            ID: {record.employee_id}
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8' }}>
            {record.id_number}
          </div>
        </div>
      )
    },
    {
      title: 'License',
      key: 'license',
      width: 180,
      render: (_, record) => (
        <div>
          <Tag color="blue">{record.license_type}</Tag>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
            {record.license_number}
          </div>
        </div>
      ),
      filters: [
        { text: 'Code 08', value: 'CODE_08' },
        { text: 'Code 10', value: 'CODE_10' },
        { text: 'Code 14', value: 'CODE_14' }
      ],
      onFilter: (value, record) => record.license_type === value
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status: string) => {
        let icon = null;
        let text = status.replace('_', ' ');
        
        switch (status) {
          case 'ACTIVE':
            icon = <CheckCircleOutlined />;
            break;
          case 'ON_TRIP':
            icon = <CarOutlined />;
            text = 'On Trip';
            break;
          case 'ON_LEAVE':
            icon = <ClockCircleOutlined />;
            text = 'On Leave';
            break;
          default:
            break;
        }
        
        return (
          <Tag color={getStatusColor(status)} icon={icon}>
            {text}
          </Tag>
        );
      },
      filters: [
        { text: 'Active', value: 'ACTIVE' },
        { text: 'On Trip', value: 'ON_TRIP' },
        { text: 'On Leave', value: 'ON_LEAVE' },
        { text: 'Inactive', value: 'INACTIVE' }
      ],
      onFilter: (value, record) => record.status === value
    },
    {
      title: 'License Expiry',
      dataIndex: 'license_expiry',
      key: 'license_expiry',
      width: 160,
      render: (date: string) => {
        const days = getExpiryDays(date);
        const status = getExpiryStatus(days);
        
        return (
          <Tooltip title={days < 0 ? 'EXPIRED!' : `${days} days remaining`}>
            <div>
              <div style={{ 
                fontSize: '13px',
                color: status === 'error' ? '#ef4444' : status === 'warning' ? '#f59e0b' : '#10b981',
                fontWeight: days <= 30 ? 600 : 400
              }}>
                {new Date(date).toLocaleDateString('en-ZA')}
              </div>
              <Tag 
                color={status} 
                style={{ fontSize: '11px', marginTop: '2px' }}
                icon={days <= 14 ? <WarningOutlined /> : null}
              >
                {days < 0 ? 'EXPIRED' : `${days}d`}
              </Tag>
            </div>
          </Tooltip>
        );
      },
      sorter: (a, b) => new Date(a.license_expiry).getTime() - new Date(b.license_expiry).getTime()
    },
    {
      title: 'PrDP Expiry',
      dataIndex: 'prdp_expiry',
      key: 'prdp_expiry',
      width: 160,
      render: (date: string) => {
        const days = getExpiryDays(date);
        const status = getExpiryStatus(days);
        
        return (
          <Tooltip title={days < 0 ? 'EXPIRED!' : `${days} days remaining`}>
            <div>
              <div style={{ 
                fontSize: '13px',
                color: status === 'error' ? '#ef4444' : status === 'warning' ? '#f59e0b' : '#10b981',
                fontWeight: days <= 30 ? 600 : 400
              }}>
                {new Date(date).toLocaleDateString('en-ZA')}
              </div>
              <Tag 
                color={status} 
                style={{ fontSize: '11px', marginTop: '2px' }}
                icon={days <= 14 ? <WarningOutlined /> : null}
              >
                {days < 0 ? 'EXPIRED' : `${days}d`}
              </Tag>
            </div>
          </Tooltip>
        );
      },
      sorter: (a, b) => new Date(a.prdp_expiry).getTime() - new Date(b.prdp_expiry).getTime()
    },
    {
      title: 'Medical Expiry',
      dataIndex: 'medical_expiry',
      key: 'medical_expiry',
      width: 160,
      render: (date: string) => {
        const days = getExpiryDays(date);
        const status = getExpiryStatus(days);
        
        return (
          <Tooltip title={days < 0 ? 'EXPIRED!' : `${days} days remaining`}>
            <div>
              <div style={{ 
                fontSize: '13px',
                color: status === 'error' ? '#ef4444' : status === 'warning' ? '#f59e0b' : '#10b981',
                fontWeight: days <= 30 ? 600 : 400
              }}>
                {new Date(date).toLocaleDateString('en-ZA')}
              </div>
              <Tag 
                color={status} 
                style={{ fontSize: '11px', marginTop: '2px' }}
                icon={days <= 14 ? <WarningOutlined /> : null}
              >
                {days < 0 ? 'EXPIRED' : `${days}d`}
              </Tag>
            </div>
          </Tooltip>
        );
      },
      sorter: (a, b) => new Date(a.medical_expiry).getTime() - new Date(b.medical_expiry).getTime()
    },
    {
      title: 'Performance',
      key: 'performance',
      width: 200,
      render: (_, record) => (
        <div>
          <div style={{ marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Trips: </span>
            <span style={{ fontWeight: 600 }}>{record.total_trips || 0}</span>
          </div>
          <div style={{ marginBottom: '4px' }}>
            <span style={{ fontSize: '12px', color: '#64748b' }}>On-Time Rate</span>
          </div>
          <Progress
            percent={record.on_time_rate || 0}
            size="small"
            status={
              (record.on_time_rate || 0) >= 98 ? 'success' :
              (record.on_time_rate || 0) >= 95 ? 'normal' : 'exception'
            }
            format={percent => `${percent?.toFixed(1)}%`}
          />
          {record.incidents !== undefined && record.incidents > 0 && (
            <div style={{ marginTop: '4px' }}>
              <Tag color="error" style={{ fontSize: '11px' }}>
                {record.incidents} incident{record.incidents > 1 ? 's' : ''}
              </Tag>
            </div>
          )}
        </div>
      ),
      sorter: (a, b) => (a.on_time_rate || 0) - (b.on_time_rate || 0)
    },
    {
      title: 'Contact',
      key: 'contact',
      width: 180,
      render: (_, record) => (
        <div>
          <div style={{ fontSize: '12px', marginBottom: '2px' }}>
            📞 {record.phone || 'N/A'}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>
            ✉️ {record.email || 'N/A'}
          </div>
        </div>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 100,
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<EditOutlined />}
            onClick={() => console.log('Edit', record.driver_id)}
          >
            Edit
          </Button>
          <Dropdown menu={{ items: actionMenuItems(record) }} trigger={['click']}>
            <Button size="small" icon={<MoreOutlined />} />
          </Dropdown>
        </Space>
      )
    }
  ];

  return (
    <EnterpriseLayout moduleTitle="Driver Management" tabs={tabs} breadcrumbs={breadcrumbs}>
      <div style={{ padding: '24px' }}>
        {/* Alert for expiring documents */}
        {stats.expiryAlerts > 0 && (
          <Alert
            message="Driver Document Expiry Warnings"
            description={`${stats.expiryAlerts} driver(s) have licenses, PrDPs, or medical certificates expiring within 30 days. Please review and renew immediately.`}
            type="error"
            showIcon
            icon={<WarningOutlined />}
            closable
            style={{ marginBottom: '24px' }}
          />
        )}

        {/* KPI Cards */}
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col xs={24} sm={12} lg={6}>
            <Card className="kpi-card">
              <Statistic
                title="Total Drivers"
                value={stats.total}
                prefix={<UserOutlined style={{ color: '#667eea' }} />}
                suffix="drivers"
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="kpi-card">
              <Statistic
                title="Active Drivers"
                value={stats.active}
                valueStyle={{ color: '#10b981' }}
                prefix={<CheckCircleOutlined />}
              />
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#64748b' }}>
                {stats.onTrip} currently on trips
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="kpi-card">
              <Statistic
                title="Avg On-Time Rate"
                value={stats.avgOnTimeRate}
                precision={1}
                suffix="%"
                valueStyle={{ color: stats.avgOnTimeRate >= 98 ? '#10b981' : '#f59e0b' }}
                prefix={<TrophyOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="kpi-card">
              <Statistic
                title="Expiry Alerts"
                value={stats.expiryAlerts}
                valueStyle={{ color: '#ef4444' }}
                prefix={<WarningOutlined />}
              />
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#64748b' }}>
                Documents expiring soon
              </div>
            </Card>
          </Col>
        </Row>

        {/* Filters and Actions */}
        <Card style={{ marginBottom: '16px' }}>
          <Row gutter={[16, 16]} align="middle">
            <Col flex="auto">
              <Input
                placeholder="Search by name, employee ID, ID number, phone, or email..."
                prefix={<SearchOutlined />}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                size="large"
                allowClear
              />
            </Col>
            <Col>
              <Space>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  size="large"
                  onClick={() => console.log('Add driver')}
                >
                  Add Driver
                </Button>
                <Button
                  icon={<FilterOutlined />}
                  size="large"
                >
                  Advanced Filters
                </Button>
                <Button
                  icon={<ExportOutlined />}
                  size="large"
                >
                  Export
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>

        {/* Drivers Table */}
        <Card>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px' }}>
              <Spin size="large" />
              <div style={{ marginTop: '16px', color: '#64748b' }}>
                Loading driver data...
              </div>
            </div>
          ) : filteredDrivers.length === 0 ? (
            <Empty
              description={
                searchTerm || statusFilter !== 'ALL' || licenseFilter !== 'ALL'
                  ? 'No drivers match your filters'
                  : 'No drivers registered'
              }
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              {!searchTerm && statusFilter === 'ALL' && licenseFilter === 'ALL' && (
                <Button type="primary" icon={<PlusOutlined />}>
                  Add First Driver
                </Button>
              )}
            </Empty>
          ) : (
            <Table
              columns={columns}
              dataSource={filteredDrivers}
              rowKey="driver_id"
              pagination={{
                pageSize: 20,
                showSizeChanger: true,
                showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} drivers`,
                position: ['bottomCenter']
              }}
              scroll={{ x: 1600 }}
              className="live-vehicle-table"
            />
          )}
        </Card>
      </div>
    </EnterpriseLayout>
  );
};

export default DriverManagementEnterprise;
