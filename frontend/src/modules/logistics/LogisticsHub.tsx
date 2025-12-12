import React, { useState, lazy, Suspense } from 'react';
import {
  Card,
  Row,
  Col,
  Table,
  Button,
  Tag,
  Space,
  Progress,
  Statistic,
  Badge,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Divider,
  Timeline,
  Alert,
  Tooltip,
  Switch,
  DatePicker,
  List,
  Avatar,
  Typography,
  Descriptions,
  Steps,
  Spin,
  QRCode,
} from 'antd';
import {
  HomeOutlined,
  CarOutlined,
  EnvironmentOutlined,
  TeamOutlined,
  DollarOutlined,
  ToolOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  PlusOutlined,
  SyncOutlined,
  DownloadOutlined,
  SettingOutlined,
  GlobalOutlined,
  AimOutlined,
  DashboardOutlined,
  ThunderboltOutlined,
  SafetyCertificateOutlined,
  FileProtectOutlined,
  BarChartOutlined,
  LineChartOutlined,
  RocketOutlined,
  AlertOutlined,
  FundOutlined,
  ApiOutlined,
  CloudOutlined,
  NodeIndexOutlined,
  SendOutlined,
  ShopOutlined,
  GoldOutlined,
  ContainerOutlined,
  TruckOutlined,
  CompassOutlined,
  FieldTimeOutlined,
  ProfileOutlined,
  BankOutlined,
  MobileOutlined,
  QrcodeOutlined,
  RadarChartOutlined,
} from '@ant-design/icons';
import {
  HubLayout,
  HubHeader,
  StatusBanner,
  HubTabs,
} from '../../components/hub';

// Lazy load the VehicleTrackingMap for performance
const VehicleTrackingMap = lazy(() => import('./VehicleTrackingMap'));

const { Title, Text } = Typography;
const { Option } = Select;

const LogisticsHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [tripModalVisible, setTripModalVisible] = useState(false);
  const [vehicleModalVisible, setVehicleModalVisible] = useState(false);
  const [fuelModalVisible, setFuelModalVisible] = useState(false);
  const [driverAppModalVisible, setDriverAppModalVisible] = useState(false);
  const [form] = Form.useForm();

  // Mobile Driver App URL
  const driverAppUrl = `${window.location.origin}/driver-app`;

  // Logistics KPIs
  const logisticsStats = {
    activeTrips: 24,
    totalVehicles: 45,
    availableVehicles: 18,
    driversOnDuty: 28,
    deliveriesToday: 156,
    onTimeRate: 94.2,
    fuelCostMTD: 425000,
    revenueGenerated: 2850000
  };

  // Active Trips
  const activeTrips = [
    { 
      id: 'TRP-2024-0456', 
      driver: 'John Sibanda', 
      vehicle: 'TRK-015',
      route: 'JHB → Durban',
      customer: 'Shoprite Holdings',
      cargo: 'FMCG Goods',
      weight: 28.5,
      status: 'in_transit',
      progress: 65,
      eta: '2024-12-11 16:30',
      lastLocation: 'Harrismith Toll Plaza'
    },
    { 
      id: 'TRP-2024-0457', 
      driver: 'Peter Mokoena', 
      vehicle: 'TRK-022',
      route: 'Cape Town → Bloemfontein',
      customer: 'Pick n Pay',
      cargo: 'Fresh Produce',
      weight: 22.0,
      status: 'in_transit',
      progress: 45,
      eta: '2024-12-11 18:00',
      lastLocation: 'Beaufort West'
    },
    { 
      id: 'TRP-2024-0458', 
      driver: 'Sarah Nkosi', 
      vehicle: 'TRK-008',
      route: 'Pretoria → Polokwane',
      customer: 'Massmart',
      cargo: 'Electronics',
      weight: 15.2,
      status: 'loading',
      progress: 0,
      eta: '2024-12-11 14:00',
      lastLocation: 'Pretoria Depot'
    },
    { 
      id: 'TRP-2024-0459', 
      driver: 'Mike van der Berg', 
      vehicle: 'TRK-031',
      route: 'Durban → East London',
      customer: 'Clicks Group',
      cargo: 'Pharmaceuticals',
      weight: 12.8,
      status: 'delivered',
      progress: 100,
      eta: '-',
      lastLocation: 'East London DC'
    }
  ];

  // Fleet Vehicles
  const vehicles = [
    { id: 'TRK-015', registration: 'GP 123 456', type: 'Truck', capacity: 30, status: 'on_trip', driver: 'John Sibanda', lastService: '2024-11-15', nextService: '2024-12-15', fuelLevel: 75 },
    { id: 'TRK-022', registration: 'WC 789 012', type: 'Truck', capacity: 28, status: 'on_trip', driver: 'Peter Mokoena', lastService: '2024-11-20', nextService: '2024-12-20', fuelLevel: 60 },
    { id: 'TRK-008', registration: 'GP 345 678', type: 'Truck', capacity: 25, status: 'loading', driver: 'Sarah Nkosi', lastService: '2024-11-10', nextService: '2024-12-10', fuelLevel: 95 },
    { id: 'TRK-031', registration: 'KZN 901 234', type: 'Truck', capacity: 20, status: 'available', driver: '-', lastService: '2024-11-25', nextService: '2024-12-25', fuelLevel: 80 },
    { id: 'VAN-005', registration: 'GP 567 890', type: 'Van', capacity: 5, status: 'maintenance', driver: '-', lastService: '2024-12-01', nextService: '2025-01-01', fuelLevel: 45 },
    { id: 'TRK-042', registration: 'FS 234 567', type: 'Truck', capacity: 32, status: 'available', driver: '-', lastService: '2024-11-28', nextService: '2024-12-28', fuelLevel: 100 }
  ];

  // Drivers
  const drivers = [
    { id: 'DRV-001', name: 'John Sibanda', license: 'EC', licenseExpiry: '2025-06-15', status: 'on_duty', currentTrip: 'TRP-2024-0456', hoursThisWeek: 38, rating: 4.8 },
    { id: 'DRV-002', name: 'Peter Mokoena', license: 'EC', licenseExpiry: '2025-03-20', status: 'on_duty', currentTrip: 'TRP-2024-0457', hoursThisWeek: 42, rating: 4.6 },
    { id: 'DRV-003', name: 'Sarah Nkosi', license: 'C1', licenseExpiry: '2025-09-10', status: 'on_duty', currentTrip: 'TRP-2024-0458', hoursThisWeek: 35, rating: 4.9 },
    { id: 'DRV-004', name: 'Mike van der Berg', license: 'EC', licenseExpiry: '2024-12-30', status: 'available', currentTrip: '-', hoursThisWeek: 40, rating: 4.7 },
    { id: 'DRV-005', name: 'Thabo Dlamini', license: 'C', licenseExpiry: '2025-08-05', status: 'off_duty', currentTrip: '-', hoursThisWeek: 45, rating: 4.5 }
  ];

  // Fuel Records
  const fuelRecords = [
    { id: 'FUEL-2024-0890', date: '2024-12-11', vehicle: 'TRK-015', driver: 'John Sibanda', liters: 250, pricePerLiter: 22.50, total: 5625, odometer: 245680, location: 'Shell Midrand' },
    { id: 'FUEL-2024-0889', date: '2024-12-11', vehicle: 'TRK-022', driver: 'Peter Mokoena', liters: 280, pricePerLiter: 22.45, total: 6286, odometer: 198450, location: 'Engen N1' },
    { id: 'FUEL-2024-0888', date: '2024-12-10', vehicle: 'TRK-008', driver: 'Sarah Nkosi', liters: 200, pricePerLiter: 22.50, total: 4500, odometer: 156230, location: 'Caltex Centurion' },
    { id: 'FUEL-2024-0887', date: '2024-12-10', vehicle: 'TRK-031', driver: 'Mike van der Berg', liters: 320, pricePerLiter: 22.40, total: 7168, odometer: 312890, location: 'BP Durban' }
  ];

  // Route Analysis
  const routeAnalysis = [
    { route: 'JHB → Durban', distance: 580, avgTime: '6.5 hrs', trips: 45, revenue: 450000, fuelCost: 85000, profit: 365000, profitMargin: 81.1 },
    { route: 'Cape Town → Bloemfontein', distance: 1000, avgTime: '10 hrs', trips: 28, revenue: 380000, fuelCost: 95000, profit: 285000, profitMargin: 75.0 },
    { route: 'Pretoria → Polokwane', distance: 290, avgTime: '3.5 hrs', trips: 62, revenue: 310000, fuelCost: 45000, profit: 265000, profitMargin: 85.5 },
    { route: 'Durban → East London', distance: 640, avgTime: '7 hrs', trips: 35, revenue: 280000, fuelCost: 72000, profit: 208000, profitMargin: 74.3 }
  ];

  // Trip columns
  const tripColumns = [
    { title: 'Trip ID', dataIndex: 'id', key: 'id', render: (text: string) => <a>{text}</a> },
    { title: 'Driver', dataIndex: 'driver', key: 'driver' },
    { title: 'Vehicle', dataIndex: 'vehicle', key: 'vehicle', render: (v: string) => <Tag>{v}</Tag> },
    { title: 'Route', dataIndex: 'route', key: 'route' },
    { title: 'Customer', dataIndex: 'customer', key: 'customer' },
    { title: 'Weight (t)', dataIndex: 'weight', key: 'weight' },
    { title: 'Progress', key: 'progress', render: (_: unknown, record: typeof activeTrips[0]) => (
      <Progress percent={record.progress} size="small" status={record.progress === 100 ? 'success' : 'active'} />
    )},
    { title: 'Status', dataIndex: 'status', key: 'status', render: (status: string) => {
      const config: Record<string, { color: string; label: string }> = {
        'in_transit': { color: 'processing', label: 'In Transit' },
        'loading': { color: 'warning', label: 'Loading' },
        'delivered': { color: 'success', label: 'Delivered' },
        'delayed': { color: 'error', label: 'Delayed' }
      };
      const { color, label } = config[status] || { color: 'default', label: status };
      return <Tag color={color}>{label}</Tag>;
    }},
    { title: 'ETA', dataIndex: 'eta', key: 'eta' },
    { title: 'Actions', key: 'actions', render: (_: unknown, record: typeof activeTrips[0]) => (
      <Space>
        <Button size="small" icon={<AimOutlined />}>Track</Button>
        <Button size="small">Details</Button>
      </Space>
    )}
  ];

  // Vehicle columns
  const vehicleColumns = [
    { title: 'Vehicle ID', dataIndex: 'id', key: 'id', render: (text: string) => <strong>{text}</strong> },
    { title: 'Registration', dataIndex: 'registration', key: 'registration' },
    { title: 'Type', dataIndex: 'type', key: 'type', render: (type: string) => <Tag>{type}</Tag> },
    { title: 'Capacity (t)', dataIndex: 'capacity', key: 'capacity' },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (status: string) => {
      const config: Record<string, { color: string; label: string }> = {
        'on_trip': { color: 'processing', label: 'On Trip' },
        'available': { color: 'success', label: 'Available' },
        'loading': { color: 'warning', label: 'Loading' },
        'maintenance': { color: 'error', label: 'Maintenance' }
      };
      const { color, label } = config[status] || { color: 'default', label: status };
      return <Tag color={color}>{label}</Tag>;
    }},
    { title: 'Driver', dataIndex: 'driver', key: 'driver' },
    { title: 'Fuel Level', key: 'fuelLevel', render: (_: unknown, record: typeof vehicles[0]) => (
      <Progress 
        percent={record.fuelLevel} 
        size="small" 
        status={record.fuelLevel < 25 ? 'exception' : 'normal'}
        strokeColor={record.fuelLevel < 25 ? '#ff4d4f' : record.fuelLevel < 50 ? '#faad14' : '#52c41a'}
      />
    )},
    { title: 'Next Service', dataIndex: 'nextService', key: 'nextService' },
    { title: 'Actions', key: 'actions', render: () => (
      <Space>
        <Button size="small">Details</Button>
        <Button size="small" icon={<ToolOutlined />}>Service</Button>
      </Space>
    )}
  ];

  // Driver columns
  const driverColumns = [
    { title: 'ID', dataIndex: 'id', key: 'id' },
    { title: 'Name', dataIndex: 'name', key: 'name', render: (name: string) => <strong>{name}</strong> },
    { title: 'License', dataIndex: 'license', key: 'license', render: (l: string) => <Tag color="blue">{l}</Tag> },
    { title: 'License Expiry', dataIndex: 'licenseExpiry', key: 'licenseExpiry', render: (date: string) => {
      const isExpiringSoon = new Date(date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      return <span style={{ color: isExpiringSoon ? '#ff4d4f' : 'inherit' }}>{date}</span>;
    }},
    { title: 'Status', dataIndex: 'status', key: 'status', render: (status: string) => {
      const config: Record<string, { color: string; label: string }> = {
        'on_duty': { color: 'success', label: 'On Duty' },
        'available': { color: 'processing', label: 'Available' },
        'off_duty': { color: 'default', label: 'Off Duty' }
      };
      const { color, label } = config[status] || { color: 'default', label: status };
      return <Tag color={color}>{label}</Tag>;
    }},
    { title: 'Current Trip', dataIndex: 'currentTrip', key: 'currentTrip' },
    { title: 'Hours/Week', dataIndex: 'hoursThisWeek', key: 'hoursThisWeek', render: (hours: number) => (
      <span style={{ color: hours > 45 ? '#ff4d4f' : 'inherit' }}>{hours}h</span>
    )},
    { title: 'Rating', dataIndex: 'rating', key: 'rating', render: (r: number) => (
      <Tag color={r >= 4.5 ? 'green' : r >= 4 ? 'blue' : 'orange'}>{r.toFixed(1)} ★</Tag>
    )},
    { title: 'Actions', key: 'actions', render: () => (
      <Space>
        <Button size="small">Profile</Button>
        <Button size="small">Assign</Button>
      </Space>
    )}
  ];

  // Fuel columns
  const fuelColumns = [
    { title: 'Record ID', dataIndex: 'id', key: 'id' },
    { title: 'Date', dataIndex: 'date', key: 'date' },
    { title: 'Vehicle', dataIndex: 'vehicle', key: 'vehicle', render: (v: string) => <Tag>{v}</Tag> },
    { title: 'Driver', dataIndex: 'driver', key: 'driver' },
    { title: 'Liters', dataIndex: 'liters', key: 'liters' },
    { title: 'Price/L', dataIndex: 'pricePerLiter', key: 'pricePerLiter', render: (p: number) => `R ${p.toFixed(2)}` },
    { title: 'Total', dataIndex: 'total', key: 'total', render: (t: number) => <strong>R {t.toLocaleString()}</strong> },
    { title: 'Odometer', dataIndex: 'odometer', key: 'odometer', render: (o: number) => `${o.toLocaleString()} km` },
    { title: 'Location', dataIndex: 'location', key: 'location' }
  ];

  // Route analysis columns
  const routeColumns = [
    { title: 'Route', dataIndex: 'route', key: 'route', render: (r: string) => <strong>{r}</strong> },
    { title: 'Distance', dataIndex: 'distance', key: 'distance', render: (d: number) => `${d} km` },
    { title: 'Avg Time', dataIndex: 'avgTime', key: 'avgTime' },
    { title: 'Trips MTD', dataIndex: 'trips', key: 'trips' },
    { title: 'Revenue', dataIndex: 'revenue', key: 'revenue', render: (r: number) => `R ${(r/1000).toFixed(0)}k` },
    { title: 'Fuel Cost', dataIndex: 'fuelCost', key: 'fuelCost', render: (c: number) => `R ${(c/1000).toFixed(0)}k` },
    { title: 'Profit', dataIndex: 'profit', key: 'profit', render: (p: number) => <Text type="success">R {(p/1000).toFixed(0)}k</Text> },
    { title: 'Margin', dataIndex: 'profitMargin', key: 'profitMargin', render: (m: number) => (
      <Tag color={m >= 80 ? 'green' : m >= 70 ? 'blue' : 'orange'}>{m.toFixed(1)}%</Tag>
    )}
  ];

  // Render Dashboard
  const renderDashboard = () => (
    <div style={{ padding: '24px' }}>
      {/* KPI Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Active Trips"
              value={logisticsStats.activeTrips}
              prefix={<TruckOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
            <Progress percent={(logisticsStats.activeTrips / logisticsStats.totalVehicles) * 100} showInfo={false} strokeColor="#1890ff" />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="On-Time Delivery"
              value={logisticsStats.onTimeRate}
              suffix="%"
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
            <Progress percent={logisticsStats.onTimeRate} showInfo={false} strokeColor="#52c41a" />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Deliveries Today"
              value={logisticsStats.deliveriesToday}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Revenue MTD"
              value={logisticsStats.revenueGenerated}
              prefix="R"
              valueStyle={{ color: '#13c2c2' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]}>
        {/* Fleet Status */}
        <Col xs={24} lg={16}>
          <Card title="Fleet Overview" extra={<Button type="link">View All</Button>}>
            <Row gutter={[16, 16]}>
              <Col span={6}>
                <Card size="small" style={{ background: '#e6f7ff', border: 'none' }}>
                  <Statistic title="On Trip" value={vehicles.filter(v => v.status === 'on_trip').length} valueStyle={{ color: '#1890ff' }} />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small" style={{ background: '#f6ffed', border: 'none' }}>
                  <Statistic title="Available" value={vehicles.filter(v => v.status === 'available').length} valueStyle={{ color: '#52c41a' }} />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small" style={{ background: '#fff7e6', border: 'none' }}>
                  <Statistic title="Loading" value={vehicles.filter(v => v.status === 'loading').length} valueStyle={{ color: '#fa8c16' }} />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small" style={{ background: '#fff1f0', border: 'none' }}>
                  <Statistic title="Maintenance" value={vehicles.filter(v => v.status === 'maintenance').length} valueStyle={{ color: '#ff4d4f' }} />
                </Card>
              </Col>
            </Row>
            
            <Divider />
            
            <Table 
              dataSource={activeTrips.filter(t => t.status !== 'delivered').slice(0, 3)} 
              columns={[
                { title: 'Trip', dataIndex: 'id', key: 'id' },
                { title: 'Route', dataIndex: 'route', key: 'route' },
                { title: 'Driver', dataIndex: 'driver', key: 'driver' },
                { title: 'Progress', key: 'progress', render: (_: unknown, r: typeof activeTrips[0]) => <Progress percent={r.progress} size="small" /> },
                { title: 'ETA', dataIndex: 'eta', key: 'eta' }
              ]}
              rowKey="id"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>

        {/* Quick Actions & Alerts */}
        <Col xs={24} lg={8}>
          <Card title="Quick Actions" style={{ marginBottom: 24 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button type="primary" icon={<PlusOutlined />} block onClick={() => setTripModalVisible(true)}>
                Create Trip
              </Button>
              <Button icon={<CarOutlined />} block onClick={() => setVehicleModalVisible(true)}>
                Add Vehicle
              </Button>
              <Button icon={<GoldOutlined />} block onClick={() => setFuelModalVisible(true)}>
                Log Fuel
              </Button>
              <Button icon={<AimOutlined />} block>
                Live Tracking
              </Button>
            </Space>
          </Card>

          <Card title="Alerts">
            <Timeline
              items={[
                {
                  color: 'orange',
                  children: (
                    <>
                      <div><strong>DRV-004</strong> license expiring</div>
                      <div style={{ fontSize: 12, color: '#999' }}>Mike van der Berg • 19 days</div>
                    </>
                  )
                },
                {
                  color: 'red',
                  children: (
                    <>
                      <div><strong>VAN-005</strong> in maintenance</div>
                      <div style={{ fontSize: 12, color: '#999' }}>Expected back Dec 13</div>
                    </>
                  )
                },
                {
                  color: 'blue',
                  children: (
                    <>
                      <div><strong>TRK-008</strong> service due</div>
                      <div style={{ fontSize: 12, color: '#999' }}>Schedule by Dec 10</div>
                    </>
                  )
                }
              ]}
            />
          </Card>
        </Col>
      </Row>

      {/* Financial Integration Card */}
      <Card 
        title={<><BankOutlined /> Financial Integration</>} 
        style={{ marginTop: 24 }}
        extra={<Button type="link">View GL Entries</Button>}
      >
        <Row gutter={24}>
          <Col span={6}>
            <Statistic title="Revenue (MTD)" value={2850000} prefix="R" valueStyle={{ color: '#52c41a' }} />
          </Col>
          <Col span={6}>
            <Statistic title="Fuel Costs (MTD)" value={425000} prefix="R" valueStyle={{ color: '#ff4d4f' }} />
          </Col>
          <Col span={6}>
            <Statistic title="Maintenance (MTD)" value={85000} prefix="R" valueStyle={{ color: '#fa8c16' }} />
          </Col>
          <Col span={6}>
            <Statistic title="Gross Margin" value={82.1} suffix="%" valueStyle={{ color: '#1890ff' }} />
          </Col>
        </Row>
        <Alert
          message="Auto-posting to Financial Module"
          description="Trip revenue and fuel costs are automatically posted to GL accounts 4000 (Revenue) and 5100 (Fuel Expense)"
          type="info"
          showIcon
          style={{ marginTop: 16 }}
        />
      </Card>
    </div>
  );

  // Render Trips
  const renderTrips = () => (
    <div style={{ padding: '24px' }}>
      <Card 
        title="Trip Management"
        extra={
          <Space>
            <Input.Search placeholder="Search trips..." style={{ width: 250 }} />
            <Button icon={<DownloadOutlined />}>Export</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setTripModalVisible(true)}>
              Create Trip
            </Button>
          </Space>
        }
      >
        <Table 
          dataSource={activeTrips} 
          columns={tripColumns} 
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  );

  // Render Fleet
  const renderFleet = () => (
    <div style={{ padding: '24px' }}>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic title="Total Fleet" value={logisticsStats.totalVehicles} prefix={<CarOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="Available" value={logisticsStats.availableVehicles} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="On Trip" value={vehicles.filter(v => v.status === 'on_trip').length} valueStyle={{ color: '#1890ff' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="Utilization" value={60} suffix="%" />
          </Card>
        </Col>
      </Row>

      <Card 
        title="Fleet Vehicles"
        extra={
          <Space>
            <Button icon={<ToolOutlined />}>Schedule Service</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setVehicleModalVisible(true)}>
              Add Vehicle
            </Button>
          </Space>
        }
      >
        <Table 
          dataSource={vehicles} 
          columns={vehicleColumns} 
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  );

  // Render Drivers
  const renderDrivers = () => (
    <div style={{ padding: '24px' }}>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic title="Total Drivers" value={drivers.length} prefix={<TeamOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="On Duty" value={logisticsStats.driversOnDuty} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="Available" value={drivers.filter(d => d.status === 'available').length} valueStyle={{ color: '#1890ff' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="Avg Rating" value={4.7} suffix="★" valueStyle={{ color: '#fa8c16' }} />
          </Card>
        </Col>
      </Row>

      <Card 
        title="Driver Management"
        extra={
          <Space>
            <Button icon={<SafetyCertificateOutlined />}>License Renewals</Button>
            <Button type="primary" icon={<PlusOutlined />}>Add Driver</Button>
          </Space>
        }
      >
        <Alert
          message="License Expiring Soon"
          description="Mike van der Berg (DRV-004) - License expires Dec 30, 2024"
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Table 
          dataSource={drivers} 
          columns={driverColumns} 
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  );

  // Render Fuel
  const renderFuel = () => (
    <div style={{ padding: '24px' }}>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic title="Fuel Cost (MTD)" value={logisticsStats.fuelCostMTD} prefix="R" valueStyle={{ color: '#ff4d4f' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="Liters (MTD)" value={18500} suffix="L" />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="Avg Price/L" value={22.47} prefix="R" />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="Cost per KM" value={2.35} prefix="R" />
          </Card>
        </Col>
      </Row>

      <Card 
        title="Fuel Records"
        extra={
          <Space>
            <Button icon={<DownloadOutlined />}>Export</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setFuelModalVisible(true)}>
              Log Fuel
            </Button>
          </Space>
        }
      >
        <Table 
          dataSource={fuelRecords} 
          columns={fuelColumns} 
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* Financial Posting */}
      <Card title="Financial Integration" style={{ marginTop: 24 }}>
        <Alert
          message="Automatic GL Posting"
          description="Fuel purchases are automatically posted to GL Account 5100 (Fuel & Oil Expense) with VAT split to 2300 (Input VAT)"
          type="info"
          showIcon
        />
      </Card>
    </div>
  );

  // Render Analytics
  const renderAnalytics = () => (
    <div style={{ padding: '24px' }}>
      <Card title="Route Profitability Analysis" style={{ marginBottom: 24 }}>
        <Table 
          dataSource={routeAnalysis} 
          columns={routeColumns} 
          rowKey="route"
          pagination={false}
        />
      </Card>

      <Row gutter={24}>
        <Col span={12}>
          <Card title="Performance Metrics">
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Statistic title="Avg Trip Duration" value={6.2} suffix="hrs" />
              </Col>
              <Col span={12}>
                <Statistic title="Avg Distance/Trip" value={485} suffix="km" />
              </Col>
              <Col span={12}>
                <Statistic title="Fuel Efficiency" value={2.8} suffix="km/L" />
              </Col>
              <Col span={12}>
                <Statistic title="Load Factor" value={85} suffix="%" />
              </Col>
            </Row>
          </Card>
        </Col>
        <Col span={12}>
          <Card title="Cost Analysis">
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Statistic title="Cost/KM" value={2.35} prefix="R" />
              </Col>
              <Col span={12}>
                <Statistic title="Revenue/KM" value={12.80} prefix="R" />
              </Col>
              <Col span={12}>
                <Statistic title="Profit/KM" value={10.45} prefix="R" valueStyle={{ color: '#52c41a' }} />
              </Col>
              <Col span={12}>
                <Statistic title="ROI" value={445} suffix="%" valueStyle={{ color: '#52c41a' }} />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );

  // Render Live Tracking
  const renderLiveTracking = () => (
    <div style={{ padding: '24px' }}>
      {/* Live Tracking Header */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic 
              title="Vehicles Online" 
              value={28} 
              suffix={`/ ${logisticsStats.totalVehicles}`}
              valueStyle={{ color: '#52c41a' }}
              prefix={<Badge status="success" />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic 
              title="In Transit" 
              value={logisticsStats.activeTrips} 
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic 
              title="Idle Vehicles" 
              value={8} 
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic 
              title="Alerts" 
              value={3} 
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<AlertOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Live Map - Only render when tab is active */}
      <Card 
        title={<><RadarChartOutlined /> Live Vehicle Tracking</>}
        extra={
          <Space>
            <Button icon={<MobileOutlined />} onClick={() => setDriverAppModalVisible(true)}>
              Driver App
            </Button>
            <Button icon={<SyncOutlined />}>Refresh</Button>
            <Button type="primary" icon={<AimOutlined />}>Center All</Button>
          </Space>
        }
      >
        {activeTab === 'tracking' && (
          <Suspense fallback={
            <div style={{ height: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Spin size="large" tip="Loading map..." />
            </div>
          }>
            <VehicleTrackingMap 
              key="logistics-live-tracking-map"
              height="500px"
              showStats={false}
              initialCenter={[-26.2041, 28.0473]}
              initialZoom={10}
            />
          </Suspense>
        )}
        
        {/* Connection Status */}
        <Alert
          message={<><Badge status="success" /> WebSocket Connected - Real-time updates active</>}
          description="Vehicle positions update automatically via WebSocket connection. IoT events from GPS trackers are processed in real-time."
          type="success"
          showIcon={false}
          style={{ marginTop: 16 }}
        />
      </Card>

      {/* Tracking Provider Integration */}
      <Card title={<><ApiOutlined /> Tracking Provider Integration</>} style={{ marginTop: 24 }}>
        <Alert
          message="Multi-Provider Support"
          description="Connect your existing fleet tracking provider to consolidate all vehicle data in one dashboard."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        
        <Row gutter={[16, 16]}>
          {/* MiX Telematics */}
          <Col span={8}>
            <Card size="small" hoverable>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ width: 40, height: 40, background: '#1890ff', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <CarOutlined style={{ color: 'white', fontSize: 20 }} />
                </div>
                <div>
                  <Title level={5} style={{ margin: 0 }}>MiX Telematics</Title>
                  <Tag color="green">Connected</Tag>
                </div>
              </div>
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Vehicles">23</Descriptions.Item>
                <Descriptions.Item label="Last Sync">2 min ago</Descriptions.Item>
                <Descriptions.Item label="API Status"><Badge status="success" text="Active" /></Descriptions.Item>
              </Descriptions>
              <Button type="link" size="small">Configure →</Button>
            </Card>
          </Col>

          {/* Netstar */}
          <Col span={8}>
            <Card size="small" hoverable>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ width: 40, height: 40, background: '#722ed1', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <GlobalOutlined style={{ color: 'white', fontSize: 20 }} />
                </div>
                <div>
                  <Title level={5} style={{ margin: 0 }}>Netstar</Title>
                  <Tag color="green">Connected</Tag>
                </div>
              </div>
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Vehicles">12</Descriptions.Item>
                <Descriptions.Item label="Last Sync">1 min ago</Descriptions.Item>
                <Descriptions.Item label="API Status"><Badge status="success" text="Active" /></Descriptions.Item>
              </Descriptions>
              <Button type="link" size="small">Configure →</Button>
            </Card>
          </Col>

          {/* Ctrack */}
          <Col span={8}>
            <Card size="small" hoverable>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ width: 40, height: 40, background: '#13c2c2', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <AimOutlined style={{ color: 'white', fontSize: 20 }} />
                </div>
                <div>
                  <Title level={5} style={{ margin: 0 }}>Ctrack</Title>
                  <Tag color="orange">Pending Setup</Tag>
                </div>
              </div>
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Vehicles">-</Descriptions.Item>
                <Descriptions.Item label="Last Sync">-</Descriptions.Item>
                <Descriptions.Item label="API Status"><Badge status="warning" text="Setup Required" /></Descriptions.Item>
              </Descriptions>
              <Button type="primary" size="small">Connect →</Button>
            </Card>
          </Col>

          {/* Tracker */}
          <Col span={8}>
            <Card size="small" hoverable>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ width: 40, height: 40, background: '#eb2f96', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <RadarChartOutlined style={{ color: 'white', fontSize: 20 }} />
                </div>
                <div>
                  <Title level={5} style={{ margin: 0 }}>Tracker SA</Title>
                  <Tag color="orange">Pending Setup</Tag>
                </div>
              </div>
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Vehicles">-</Descriptions.Item>
                <Descriptions.Item label="Last Sync">-</Descriptions.Item>
                <Descriptions.Item label="API Status"><Badge status="warning" text="Setup Required" /></Descriptions.Item>
              </Descriptions>
              <Button type="primary" size="small">Connect →</Button>
            </Card>
          </Col>

          {/* Cartrack */}
          <Col span={8}>
            <Card size="small" hoverable>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ width: 40, height: 40, background: '#52c41a', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <EnvironmentOutlined style={{ color: 'white', fontSize: 20 }} />
                </div>
                <div>
                  <Title level={5} style={{ margin: 0 }}>Cartrack</Title>
                  <Tag color="orange">Pending Setup</Tag>
                </div>
              </div>
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Vehicles">-</Descriptions.Item>
                <Descriptions.Item label="Last Sync">-</Descriptions.Item>
                <Descriptions.Item label="API Status"><Badge status="warning" text="Setup Required" /></Descriptions.Item>
              </Descriptions>
              <Button type="primary" size="small">Connect →</Button>
            </Card>
          </Col>

          {/* Generic API */}
          <Col span={8}>
            <Card size="small" hoverable>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ width: 40, height: 40, background: '#8c8c8c', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <ApiOutlined style={{ color: 'white', fontSize: 20 }} />
                </div>
                <div>
                  <Title level={5} style={{ margin: 0 }}>Custom API</Title>
                  <Tag>Add Provider</Tag>
                </div>
              </div>
              <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
                Connect any tracking provider via REST API or webhook
              </Text>
              <Button type="dashed" size="small" icon={<PlusOutlined />}>Add Custom</Button>
            </Card>
          </Col>
        </Row>
      </Card>

      {/* Active Vehicle List */}
      <Card title="Active Vehicles" style={{ marginTop: 24 }}>
        <Table 
          dataSource={vehicles.slice(0, 5).map(v => ({
            ...v,
            currentLocation: 'N1 Highway, Midrand',
            speed: Math.floor(Math.random() * 80) + 40,
            lastUpdate: '2 min ago'
          }))}
          columns={[
            { title: 'Vehicle', dataIndex: 'registration', key: 'registration', render: (reg: string) => <Tag color="blue">{reg}</Tag> },
            { title: 'Driver', dataIndex: 'driver', key: 'driver' },
            { title: 'Current Location', dataIndex: 'currentLocation', key: 'currentLocation' },
            { title: 'Speed', dataIndex: 'speed', key: 'speed', render: (s: number) => `${s} km/h` },
            { title: 'Status', key: 'status', render: () => <Badge status="success" text="Active" /> },
            { title: 'Last Update', dataIndex: 'lastUpdate', key: 'lastUpdate' },
            { title: 'Actions', key: 'actions', render: () => (
              <Space>
                <Button size="small" icon={<AimOutlined />}>Track</Button>
                <Button size="small">Details</Button>
              </Space>
            )}
          ]}
          rowKey="id"
          pagination={false}
          size="small"
        />
      </Card>

      {/* API Endpoints Reference */}
      <Card title={<><SettingOutlined /> API Endpoints</>} style={{ marginTop: 24 }}>
        <Row gutter={24}>
          <Col span={8}>
            <Descriptions column={1} size="small" title="REST Endpoints">
              <Descriptions.Item label="Get Vehicles">/api/logistics/vehicles</Descriptions.Item>
              <Descriptions.Item label="Get Trips">/api/logistics/trips</Descriptions.Item>
              <Descriptions.Item label="IoT Events">/api/logistics/enterprise/iot/events</Descriptions.Item>
              <Descriptions.Item label="Track Vehicle">/api/logistics/tracking/:vehicleId</Descriptions.Item>
            </Descriptions>
          </Col>
          <Col span={8}>
            <Descriptions column={1} size="small" title="WebSocket">
              <Descriptions.Item label="Live Positions">ws://api/logistics/tracking</Descriptions.Item>
              <Descriptions.Item label="Alerts">ws://api/logistics/alerts</Descriptions.Item>
              <Descriptions.Item label="Update Freq">5 seconds</Descriptions.Item>
            </Descriptions>
          </Col>
          <Col span={8}>
            <Descriptions column={1} size="small" title="Webhooks (Incoming)">
              <Descriptions.Item label="MiX">/webhooks/mix-telematics</Descriptions.Item>
              <Descriptions.Item label="Netstar">/webhooks/netstar</Descriptions.Item>
              <Descriptions.Item label="Generic">/webhooks/tracking</Descriptions.Item>
            </Descriptions>
          </Col>
        </Row>
      </Card>
    </div>
  );

  // Render Settings
  const renderSettings = () => (
    <div style={{ padding: '24px' }}>
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={12}>
          <Card title="Trip Settings">
            <Form layout="vertical">
              <Form.Item label="Auto-generate Trip Numbers">
                <Switch defaultChecked />
              </Form.Item>
              <Form.Item label="Trip Number Prefix">
                <Input defaultValue="TRP" />
              </Form.Item>
              <Form.Item label="Default Trip Status">
                <Select defaultValue="scheduled">
                  <Option value="draft">Draft</Option>
                  <Option value="scheduled">Scheduled</Option>
                </Select>
              </Form.Item>
              <Form.Item label="Require POD (Proof of Delivery)">
                <Switch defaultChecked />
              </Form.Item>
              <Button type="primary">Save Settings</Button>
            </Form>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Financial Integration">
            <Form layout="vertical">
              <Form.Item label="Revenue Account">
                <Select defaultValue="4000">
                  <Option value="4000">4000 - Transport Revenue</Option>
                  <Option value="4100">4100 - Logistics Services</Option>
                </Select>
              </Form.Item>
              <Form.Item label="Fuel Expense Account">
                <Select defaultValue="5100">
                  <Option value="5100">5100 - Fuel & Oil</Option>
                  <Option value="5110">5110 - Vehicle Running Costs</Option>
                </Select>
              </Form.Item>
              <Form.Item label="Maintenance Account">
                <Select defaultValue="5200">
                  <Option value="5200">5200 - Vehicle Maintenance</Option>
                  <Option value="5210">5210 - Repairs & Servicing</Option>
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
          <Card title="Compliance & Safety">
            <Row gutter={24}>
              <Col span={8}>
                <Form.Item label="Max Driving Hours/Day">
                  <InputNumber defaultValue={9} min={1} max={12} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="Max Driving Hours/Week">
                  <InputNumber defaultValue={45} min={1} max={60} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="License Expiry Warning (Days)">
                  <InputNumber defaultValue={30} min={7} max={90} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );

  return (
    <HubLayout>
      <HubHeader
        title="Logistics Hub"
        subtitle="Fleet Management, Trip Tracking & Route Optimization"
        icon={<TruckOutlined />}
        gradient="orange"
        actions={
          <>
            <Button icon={<SyncOutlined />}>Refresh</Button>
            <Button icon={<AimOutlined />}>Live Track</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setTripModalVisible(true)}>
              New Trip
            </Button>
          </>
        }
      />

      <StatusBanner
        gradient="orange"
        icon={<GlobalOutlined />}
        title="Operations Overview"
        subtitle="Real-time Fleet Status"
        stats={[
          { title: 'Active Trips', value: logisticsStats.activeTrips, span: 4 },
          { title: 'On-Time Rate', value: `${logisticsStats.onTimeRate}%`, valueStyle: { color: '#86efac' }, span: 4 },
          { title: 'Deliveries Today', value: logisticsStats.deliveriesToday, span: 4 },
          { title: 'Fleet Available', value: `${logisticsStats.availableVehicles}/${logisticsStats.totalVehicles}`, span: 4 },
          { title: 'Revenue MTD', value: `R${(logisticsStats.revenueGenerated/1000000).toFixed(1)}M`, span: 4 },
        ]}
      />

      <HubTabs 
        theme="orange"
        tabs={[
          { key: 'dashboard', label: 'Dashboard', icon: <HomeOutlined />, children: renderDashboard() },
          { key: 'tracking', label: 'Live Tracking', icon: <RadarChartOutlined />, children: renderLiveTracking() },
          { key: 'trips', label: 'Trips', icon: <CompassOutlined />, children: renderTrips() },
          { key: 'fleet', label: 'Fleet', icon: <CarOutlined />, children: renderFleet() },
          { key: 'drivers', label: 'Drivers', icon: <TeamOutlined />, children: renderDrivers() },
          { key: 'fuel', label: 'Fuel', icon: <GoldOutlined />, children: renderFuel() },
          { key: 'analytics', label: 'Analytics', icon: <BarChartOutlined />, children: renderAnalytics() },
          { key: 'settings', label: 'Settings', icon: <SettingOutlined />, children: renderSettings() }
        ]}
        activeKey={activeTab}
        onChange={setActiveTab}
      />

      {/* Create Trip Modal */}
      <Modal
        title="Create New Trip"
        open={tripModalVisible}
        onCancel={() => setTripModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setTripModalVisible(false)}>Cancel</Button>,
          <Button key="draft">Save as Draft</Button>,
          <Button key="create" type="primary">Create Trip</Button>
        ]}
        width={700}
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Customer" name="customer" rules={[{ required: true }]}>
                <Select placeholder="Select customer">
                  <Option value="shoprite">Shoprite Holdings</Option>
                  <Option value="pnp">Pick n Pay</Option>
                  <Option value="massmart">Massmart</Option>
                  <Option value="clicks">Clicks Group</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Vehicle" name="vehicle" rules={[{ required: true }]}>
                <Select placeholder="Select vehicle">
                  {vehicles.filter(v => v.status === 'available').map(v => (
                    <Option key={v.id} value={v.id}>{v.id} - {v.registration}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Driver" name="driver" rules={[{ required: true }]}>
                <Select placeholder="Select driver">
                  {drivers.filter(d => d.status === 'available').map(d => (
                    <Option key={d.id} value={d.name}>{d.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Cargo Type" name="cargo" rules={[{ required: true }]}>
                <Select placeholder="Select cargo type">
                  <Option value="fmcg">FMCG Goods</Option>
                  <Option value="fresh">Fresh Produce</Option>
                  <Option value="electronics">Electronics</Option>
                  <Option value="pharma">Pharmaceuticals</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Origin" name="origin" rules={[{ required: true }]}>
                <Input placeholder="e.g., Johannesburg Depot" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Destination" name="destination" rules={[{ required: true }]}>
                <Input placeholder="e.g., Durban DC" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="Weight (tons)" name="weight">
                <InputNumber min={0} style={{ width: '100%' }} placeholder="0.0" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Departure Date" name="departureDate">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Expected Arrival" name="arrivalDate">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Add Vehicle Modal */}
      <Modal
        title="Add Vehicle"
        open={vehicleModalVisible}
        onCancel={() => setVehicleModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setVehicleModalVisible(false)}>Cancel</Button>,
          <Button key="create" type="primary">Add Vehicle</Button>
        ]}
        width={600}
      >
        <Form layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Vehicle ID" name="vehicleId" rules={[{ required: true }]}>
                <Input placeholder="e.g., TRK-050" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Registration" name="registration" rules={[{ required: true }]}>
                <Input placeholder="e.g., GP 123 456" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Vehicle Type" name="type" rules={[{ required: true }]}>
                <Select placeholder="Select type">
                  <Option value="truck">Truck</Option>
                  <Option value="van">Van</Option>
                  <Option value="trailer">Trailer</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Capacity (tons)" name="capacity" rules={[{ required: true }]}>
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Log Fuel Modal */}
      <Modal
        title="Log Fuel Purchase"
        open={fuelModalVisible}
        onCancel={() => setFuelModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setFuelModalVisible(false)}>Cancel</Button>,
          <Button key="create" type="primary">Log Fuel</Button>
        ]}
        width={600}
      >
        <Form layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Vehicle" name="vehicle" rules={[{ required: true }]}>
                <Select placeholder="Select vehicle">
                  {vehicles.map(v => (
                    <Option key={v.id} value={v.id}>{v.id} - {v.registration}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Driver" name="driver" rules={[{ required: true }]}>
                <Select placeholder="Select driver">
                  {drivers.map(d => (
                    <Option key={d.id} value={d.name}>{d.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="Liters" name="liters" rules={[{ required: true }]}>
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Price per Liter" name="price" rules={[{ required: true }]}>
                <InputNumber min={0} prefix="R" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Odometer" name="odometer" rules={[{ required: true }]}>
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Fuel Station" name="station">
            <Input placeholder="e.g., Shell Midrand" />
          </Form.Item>
          <Alert
            message="This will auto-post to GL Account 5100 (Fuel Expense)"
            type="info"
            showIcon
          />
        </Form>
      </Modal>

      {/* Driver Mobile App Modal */}
      <Modal
        title={<><MobileOutlined /> Driver Mobile App</>}
        open={driverAppModalVisible}
        onCancel={() => setDriverAppModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDriverAppModalVisible(false)}>Close</Button>
        ]}
        width={600}
      >
        <Alert
          message="Mobile App for Drivers"
          description="Drivers can use the mobile app to receive trip assignments, update delivery status, capture POD signatures, and report incidents in real-time."
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />

        <Row gutter={24}>
          <Col span={12} style={{ textAlign: 'center' }}>
            <Card>
              <Title level={5}>Scan QR Code</Title>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                <QRCode value={driverAppUrl} size={180} />
              </div>
              <Text type="secondary">Scan with phone camera to open app</Text>
            </Card>
          </Col>
          <Col span={12}>
            <Card>
              <Title level={5}>App Features</Title>
              <List
                size="small"
                dataSource={[
                  'View assigned trips',
                  'GPS location tracking',
                  'Trip status updates',
                  'POD capture with signature',
                  'Photo documentation',
                  'Incident reporting',
                  'Fuel log entries',
                  'Vehicle inspections',
                  'Offline mode support'
                ]}
                renderItem={item => (
                  <List.Item>
                    <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                    {item}
                  </List.Item>
                )}
              />
            </Card>
          </Col>
        </Row>

        <Divider />

        <Row gutter={16}>
          <Col span={12}>
            <Button type="primary" icon={<DownloadOutlined />} block>
              Download Android APK
            </Button>
          </Col>
          <Col span={12}>
            <Button icon={<DownloadOutlined />} block>
              Download iOS (TestFlight)
            </Button>
          </Col>
        </Row>

        <Alert
          message="Driver Login"
          description="Drivers log in with their employee ID and PIN. Trip data syncs automatically when online."
          type="success"
          showIcon
          style={{ marginTop: 16 }}
        />
      </Modal>
    </HubLayout>
  );
};

export default LogisticsHub;
