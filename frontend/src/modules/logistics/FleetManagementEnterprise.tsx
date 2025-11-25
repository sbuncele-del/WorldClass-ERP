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
  Spin
} from 'antd';
import type { MenuProps } from 'antd';
import {
  TruckOutlined,
  ToolOutlined,
  WarningOutlined,
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  FileTextOutlined,
  MoreOutlined,
  ExportOutlined,
  FilterOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import EnterpriseLayout from '../../components/layout/EnterpriseLayout';
import { vehiclesAPI } from '../../services/logistics.api';
import './logistics-enterprise.css';

interface Vehicle {
  vehicle_id: number;
  vehicle_number: string;
  registration_number: string;
  make: string;
  model: string;
  vehicle_type: string;
  year_of_manufacture: number;
  status: string;
  current_driver: string;
  last_service_date: string;
  next_service_date: string;
  next_service_km: number;
  current_odometer: number;
  license_expiry: string;
  roadworthy_expiry: string;
  insurance_expiry: string;
}

interface FleetStats {
  total: number;
  active: number;
  maintenance: number;
  alerts: number;
  utilization: number;
  avgAge: number;
}

const FleetManagementEnhanced: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [filteredVehicles, setFilteredVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [stats, setStats] = useState<FleetStats>({
    total: 0,
    active: 0,
    maintenance: 0,
    alerts: 0,
    utilization: 0,
    avgAge: 0
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
    { label: 'Fleet Management' }
  ];

  useEffect(() => {
    fetchVehicles();
  }, []);

  useEffect(() => {
    filterVehicles();
  }, [vehicles, searchTerm, statusFilter, typeFilter]);

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const response = await vehiclesAPI.getVehicles();
      setVehicles(response.vehicles);
      calculateStats(response.vehicles);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      // Fallback to empty array or show error
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (vehicleList: Vehicle[]) => {
    const total = vehicleList.length;
    const active = vehicleList.filter(v => v.status === 'ACTIVE').length;
    const maintenance = vehicleList.filter(v => v.status === 'MAINTENANCE').length;
    
    // Calculate alerts (expiring documents within 30 days)
    const alerts = vehicleList.filter(v => {
      const licenseDays = Math.ceil(
        (new Date(v.license_expiry).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );
      const roadworthyDays = Math.ceil(
        (new Date(v.roadworthy_expiry).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );
      const insuranceDays = Math.ceil(
        (new Date(v.insurance_expiry).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );
      return licenseDays <= 30 || roadworthyDays <= 30 || insuranceDays <= 30;
    }).length;

    const utilization = total > 0 ? (active / total) * 100 : 0;
    const avgAge = total > 0 
      ? vehicleList.reduce((sum, v) => sum + (new Date().getFullYear() - v.year_of_manufacture), 0) / total
      : 0;

    setStats({
      total,
      active,
      maintenance,
      alerts,
      utilization,
      avgAge
    });
  };

  const filterVehicles = () => {
    let filtered = [...vehicles];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        v =>
          v.vehicle_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          v.registration_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          v.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
          v.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
          v.current_driver.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(v => v.status === statusFilter);
    }

    // Type filter
    if (typeFilter !== 'ALL') {
      filtered = filtered.filter(v => v.vehicle_type === typeFilter);
    }

    setFilteredVehicles(filtered);
  };

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      ACTIVE: '#10b981',
      MAINTENANCE: '#f59e0b',
      INACTIVE: '#64748b',
      BREAKDOWN: '#ef4444'
    };
    return colors[status] || '#94a3b8';
  };

  const getExpiryDays = (expiryDate: string): number => {
    return Math.ceil((new Date(expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  };

  const getExpiryStatus = (days: number): 'success' | 'warning' | 'error' => {
    if (days < 0) return 'error';
    if (days <= 30) return 'warning';
    return 'success';
  };

  const actionMenuItems = (vehicle: Vehicle): MenuProps['items'] => [
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
      key: 'service',
      icon: <ToolOutlined />,
      label: 'Service History'
    },
    {
      key: 'export',
      icon: <ExportOutlined />,
      label: 'Export Report'
    }
  ];

  const columns: ColumnsType<Vehicle> = [
    {
      title: 'Vehicle',
      key: 'vehicle',
      fixed: 'left',
      width: 200,
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: '14px', color: '#1e293b' }}>
            {record.vehicle_number}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            {record.registration_number}
          </div>
        </div>
      )
    },
    {
      title: 'Make & Model',
      key: 'model',
      width: 200,
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.make}</div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            {record.model} ({record.year_of_manufacture})
          </div>
        </div>
      )
    },
    {
      title: 'Type',
      dataIndex: 'vehicle_type',
      key: 'vehicle_type',
      width: 120,
      render: (type: string) => <Tag color="blue">{type}</Tag>,
      filters: [
        { text: 'Truck', value: 'TRUCK' },
        { text: 'Van', value: 'VAN' },
        { text: 'Flatbed', value: 'FLATBED' },
        { text: 'Refrigerated', value: 'REFRIGERATED' }
      ],
      onFilter: (value, record) => record.vehicle_type === value
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status: string) => {
        let color = 'default';
        let icon = null;
        
        switch (status) {
          case 'ACTIVE':
            color = 'success';
            icon = <CheckCircleOutlined />;
            break;
          case 'MAINTENANCE':
            color = 'warning';
            icon = <ToolOutlined />;
            break;
          case 'BREAKDOWN':
            color = 'error';
            icon = <WarningOutlined />;
            break;
          default:
            color = 'default';
        }
        
        return (
          <Tag color={color} icon={icon}>
            {status.replace('_', ' ')}
          </Tag>
        );
      },
      filters: [
        { text: 'Active', value: 'ACTIVE' },
        { text: 'Maintenance', value: 'MAINTENANCE' },
        { text: 'Inactive', value: 'INACTIVE' },
        { text: 'Breakdown', value: 'BREAKDOWN' }
      ],
      onFilter: (value, record) => record.status === value
    },
    {
      title: 'Current Driver',
      dataIndex: 'current_driver',
      key: 'current_driver',
      width: 160
    },
    {
      title: 'Odometer',
      dataIndex: 'current_odometer',
      key: 'current_odometer',
      width: 120,
      render: (km: number) => (
        <div style={{ fontWeight: 600 }}>
          {km.toLocaleString()} km
        </div>
      ),
      sorter: (a, b) => a.current_odometer - b.current_odometer
    },
    {
      title: 'Next Service',
      key: 'next_service',
      width: 180,
      render: (_, record) => {
        const kmToService = record.next_service_km - record.current_odometer;
        const daysToService = Math.ceil(
          (new Date(record.next_service_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );
        
        return (
          <div>
            <div style={{ fontSize: '13px', marginBottom: '4px' }}>
              {new Date(record.next_service_date).toLocaleDateString('en-ZA')}
            </div>
            <Progress
              percent={Math.min(100, ((record.next_service_km - record.current_odometer) / 10000) * 100)}
              size="small"
              status={kmToService < 1000 ? 'exception' : 'normal'}
              format={() => `${kmToService.toLocaleString()} km`}
            />
          </div>
        );
      }
    },
    {
      title: 'License Expiry',
      dataIndex: 'license_expiry',
      key: 'license_expiry',
      width: 150,
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
              <Tag color={status} style={{ fontSize: '11px', marginTop: '2px' }}>
                {days < 0 ? 'EXPIRED' : `${days}d`}
              </Tag>
            </div>
          </Tooltip>
        );
      },
      sorter: (a, b) => new Date(a.license_expiry).getTime() - new Date(b.license_expiry).getTime()
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
            onClick={() => console.log('Edit', record.vehicle_id)}
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
    <EnterpriseLayout moduleTitle="Fleet Management" tabs={tabs} breadcrumbs={breadcrumbs}>
      <div style={{ padding: '24px' }}>
        {/* Alert for expiring documents */}
        {stats.alerts > 0 && (
          <Alert
            message="Document Expiry Warnings"
            description={`${stats.alerts} vehicle(s) have documents expiring within 30 days. Please review and renew.`}
            type="warning"
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
                title="Total Fleet"
                value={stats.total}
                prefix={<TruckOutlined style={{ color: '#667eea' }} />}
                suffix="vehicles"
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="kpi-card">
              <Statistic
                title="Active Vehicles"
                value={stats.active}
                valueStyle={{ color: '#10b981' }}
                prefix={<CheckCircleOutlined />}
              />
              <Progress
                percent={stats.utilization}
                size="small"
                status="success"
                format={percent => `${percent?.toFixed(1)}%`}
                style={{ marginTop: '8px' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="kpi-card">
              <Statistic
                title="In Maintenance"
                value={stats.maintenance}
                valueStyle={{ color: '#f59e0b' }}
                prefix={<ToolOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="kpi-card">
              <Statistic
                title="Expiry Alerts"
                value={stats.alerts}
                valueStyle={{ color: '#ef4444' }}
                prefix={<WarningOutlined />}
              />
            </Card>
          </Col>
        </Row>

        {/* Filters and Actions */}
        <Card style={{ marginBottom: '16px' }}>
          <Row gutter={[16, 16]} align="middle">
            <Col flex="auto">
              <Input
                placeholder="Search by vehicle number, registration, make, model, or driver..."
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
                  onClick={() => console.log('Add vehicle')}
                >
                  Add Vehicle
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

        {/* Fleet Table */}
        <Card>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px' }}>
              <Spin size="large" />
              <div style={{ marginTop: '16px', color: '#64748b' }}>
                Loading fleet data...
              </div>
            </div>
          ) : filteredVehicles.length === 0 ? (
            <Empty
              description={
                searchTerm || statusFilter !== 'ALL' || typeFilter !== 'ALL'
                  ? 'No vehicles match your filters'
                  : 'No vehicles in fleet'
              }
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              {!searchTerm && statusFilter === 'ALL' && typeFilter === 'ALL' && (
                <Button type="primary" icon={<PlusOutlined />}>
                  Add First Vehicle
                </Button>
              )}
            </Empty>
          ) : (
            <Table
              columns={columns}
              dataSource={filteredVehicles}
              rowKey="vehicle_id"
              pagination={{
                pageSize: 20,
                showSizeChanger: true,
                showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} vehicles`,
                position: ['bottomCenter']
              }}
              scroll={{ x: 1400 }}
              className="live-vehicle-table"
            />
          )}
        </Card>
      </div>
    </EnterpriseLayout>
  );
};

export default FleetManagementEnhanced;
