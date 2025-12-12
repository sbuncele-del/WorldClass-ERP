/**
 * PropertyHub - Property Management Industry
 * 
 * Features:
 * - Property Portfolio Management
 * - Lease Management (IFRS 16 Compliant)
 * - Tenant Management
 * - Rental Billing & Collections
 * - Body Corporate Management
 * - Maintenance Management
 * - Utility Management (Electricity, Water)
 * - EAAB Compliance (Estate Agency Affairs Board)
 * - Trust Account Management
 * - Financial Integration (IFRS 16 Leases)
 */

import React, { useState } from 'react';
import {
  Card, Row, Col, Statistic, Progress, Table, Tag, Button, Space, Badge,
  Input, Select, DatePicker, Modal, Form, Typography, Avatar,
  Timeline, Descriptions, Tooltip, Dropdown, InputNumber, Switch, Alert,
  List, Tabs, Divider, Steps, Upload, message, Collapse
} from 'antd';
import {
  HomeOutlined, TeamOutlined, CalendarOutlined, ClockCircleOutlined,
  DollarOutlined, BarChartOutlined, CheckCircleOutlined, WarningOutlined,
  PlusOutlined, SearchOutlined, FilterOutlined, ExportOutlined,
  SettingOutlined, SyncOutlined, FlagOutlined, SafetyCertificateOutlined,
  UserOutlined, BellOutlined, ThunderboltOutlined, BankOutlined,
  AuditOutlined, RocketOutlined, ShopOutlined, BuildOutlined,
  EyeOutlined, EditOutlined, DeleteOutlined, MoreOutlined, FileProtectOutlined,
  FileDoneOutlined, TrophyOutlined, PieChartOutlined, LineChartOutlined,
  FileTextOutlined, SolutionOutlined, ProfileOutlined, ScheduleOutlined,
  EnvironmentOutlined, ToolOutlined, AppstoreOutlined, KeyOutlined,
  WalletOutlined, MailOutlined, PhoneOutlined, CalculatorOutlined
} from '@ant-design/icons';
import { HubLayout, HubHeader, StatusBanner, HubTabs } from '../../components/hub';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { TextArea } = Input;
const { Panel } = Collapse;

// Interfaces
interface Property {
  id: string;
  name: string;
  code: string;
  type: 'residential' | 'commercial' | 'industrial' | 'retail' | 'mixed-use';
  address: string;
  suburb: string;
  city: string;
  province: string;
  erfNumber: string;
  totalUnits: number;
  occupiedUnits: number;
  monthlyRental: number;
  marketValue: number;
  lastValuation: string;
  manager?: string;
  imageUrl?: string;
  images?: string[];
}

interface Unit {
  id: string;
  propertyId: string;
  unitNumber: string;
  type: 'apartment' | 'office' | 'warehouse' | 'retail' | 'parking';
  size: number; // m²
  bedrooms?: number;
  bathrooms?: number;
  monthlyRental: number;
  deposit: number;
  status: 'vacant' | 'occupied' | 'maintenance' | 'reserved';
  currentTenant?: string;
  leaseEnd?: string;
}

interface Tenant {
  id: string;
  name: string;
  idNumber?: string; // Optional for companies
  type: 'individual' | 'company';
  companyReg?: string;
  email: string;
  cellphone: string;
  unit: string;
  property: string;
  leaseStart: string;
  leaseEnd: string;
  monthlyRental: number;
  deposit: number;
  depositHeld: number;
  balance: number;
  status: 'active' | 'in-arrears' | 'notice' | 'vacated';
}

interface Lease {
  id: string;
  leaseNumber: string;
  tenant: string;
  unit: string;
  property: string;
  type: 'residential' | 'commercial';
  startDate: string;
  endDate: string;
  monthlyRental: number;
  escalation: number; // %
  escalationDate: string;
  deposit: number;
  status: 'draft' | 'active' | 'expired' | 'terminated';
  ifrs16ROU?: number; // Right of Use Asset value
  ifrs16Liability?: number; // Lease Liability
}

interface MaintenanceRequest {
  id: string;
  ticketNo: string;
  property: string;
  unit: string;
  tenant: string;
  category: 'plumbing' | 'electrical' | 'hvac' | 'structural' | 'general';
  priority: 'low' | 'medium' | 'high' | 'emergency';
  description: string;
  status: 'open' | 'assigned' | 'in-progress' | 'completed' | 'closed';
  reportedDate: string;
  assignedTo?: string;
  completedDate?: string;
  cost?: number;
}

interface Invoice {
  id: string;
  invoiceNo: string;
  tenant: string;
  property: string;
  unit: string;
  month: string;
  rental: number;
  utilities: number;
  levies: number;
  otherCharges: number;
  total: number;
  paid: number;
  balance: number;
  status: 'draft' | 'sent' | 'partial' | 'paid' | 'overdue';
  dueDate: string;
}

// Sample Data
const sampleProperties: Property[] = [
  { id: 'PROP-001', name: 'Sandton Square Apartments', code: 'SSA', type: 'residential', address: '123 Sandton Drive', suburb: 'Sandton', city: 'Johannesburg', province: 'Gauteng', erfNumber: 'ERF 12345', totalUnits: 48, occupiedUnits: 45, monthlyRental: 850000, marketValue: 85000000, lastValuation: '2024-01-15', manager: 'John van der Berg', imageUrl: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&h=300&fit=crop', images: ['https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800', 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800'] },
  { id: 'PROP-002', name: 'Midrand Business Park', code: 'MBP', type: 'commercial', address: '456 Old Pretoria Road', suburb: 'Midrand', city: 'Johannesburg', province: 'Gauteng', erfNumber: 'ERF 67890', totalUnits: 24, occupiedUnits: 20, monthlyRental: 480000, marketValue: 65000000, lastValuation: '2024-03-01', manager: 'Sarah Mokoena', imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=300&fit=crop', images: ['https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800'] },
  { id: 'PROP-003', name: 'Cape Quarter Mall', code: 'CQM', type: 'retail', address: '27 Somerset Road', suburb: 'Green Point', city: 'Cape Town', province: 'Western Cape', erfNumber: 'ERF 34567', totalUnits: 35, occupiedUnits: 32, monthlyRental: 1250000, marketValue: 180000000, lastValuation: '2023-11-20', imageUrl: 'https://images.unsplash.com/photo-1519567241046-7f570eee3ce6?w=400&h=300&fit=crop', images: ['https://images.unsplash.com/photo-1519567241046-7f570eee3ce6?w=800'] },
  { id: 'PROP-004', name: 'Centurion Industrial Park', code: 'CIP', type: 'industrial', address: '89 Industrial Avenue', suburb: 'Centurion', city: 'Pretoria', province: 'Gauteng', erfNumber: 'ERF 78901', totalUnits: 12, occupiedUnits: 10, monthlyRental: 620000, marketValue: 95000000, lastValuation: '2024-02-10', manager: 'David Nkosi', imageUrl: 'https://images.unsplash.com/photo-1565793298595-6a879b1d9492?w=400&h=300&fit=crop', images: ['https://images.unsplash.com/photo-1565793298595-6a879b1d9492?w=800'] }
];

const sampleUnits: Unit[] = [
  { id: 'UNIT-001', propertyId: 'PROP-001', unitNumber: 'A101', type: 'apartment', size: 85, bedrooms: 2, bathrooms: 2, monthlyRental: 18500, deposit: 37000, status: 'occupied', currentTenant: 'T-001', leaseEnd: '2025-03-31' },
  { id: 'UNIT-002', propertyId: 'PROP-001', unitNumber: 'A102', type: 'apartment', size: 65, bedrooms: 1, bathrooms: 1, monthlyRental: 14500, deposit: 29000, status: 'occupied', currentTenant: 'T-002', leaseEnd: '2024-12-31' },
  { id: 'UNIT-003', propertyId: 'PROP-001', unitNumber: 'A103', type: 'apartment', size: 95, bedrooms: 3, bathrooms: 2, monthlyRental: 22000, deposit: 44000, status: 'vacant' },
  { id: 'UNIT-004', propertyId: 'PROP-002', unitNumber: 'B01', type: 'office', size: 250, monthlyRental: 45000, deposit: 90000, status: 'occupied', currentTenant: 'T-003', leaseEnd: '2026-06-30' },
  { id: 'UNIT-005', propertyId: 'PROP-003', unitNumber: 'GF-01', type: 'retail', size: 150, monthlyRental: 65000, deposit: 130000, status: 'occupied', currentTenant: 'T-004', leaseEnd: '2027-02-28' }
];

const sampleTenants: Tenant[] = [
  { id: 'T-001', name: 'Michael Smith', idNumber: '8501015800089', type: 'individual', email: 'michael@email.com', cellphone: '0821234567', unit: 'A101', property: 'Sandton Square Apartments', leaseStart: '2023-04-01', leaseEnd: '2025-03-31', monthlyRental: 18500, deposit: 37000, depositHeld: 37000, balance: 0, status: 'active' },
  { id: 'T-002', name: 'Lisa Johnson', idNumber: '9003150800087', type: 'individual', email: 'lisa@email.com', cellphone: '0839876543', unit: 'A102', property: 'Sandton Square Apartments', leaseStart: '2024-01-01', leaseEnd: '2024-12-31', monthlyRental: 14500, deposit: 29000, depositHeld: 29000, balance: 14500, status: 'in-arrears' },
  { id: 'T-003', name: 'Tech Solutions (Pty) Ltd', type: 'company', companyReg: '2018/123456/07', email: 'accounts@techsolutions.co.za', cellphone: '0114567890', unit: 'B01', property: 'Midrand Business Park', leaseStart: '2024-07-01', leaseEnd: '2026-06-30', monthlyRental: 45000, deposit: 90000, depositHeld: 90000, balance: 0, status: 'active' },
  { id: 'T-004', name: 'Fashion Retail Group', type: 'company', companyReg: '2015/789012/07', email: 'accounts@fashionretail.co.za', cellphone: '0216789012', unit: 'GF-01', property: 'Cape Quarter Mall', leaseStart: '2022-03-01', leaseEnd: '2027-02-28', monthlyRental: 65000, deposit: 130000, depositHeld: 130000, balance: -5500, status: 'active' }
];

const sampleLeases: Lease[] = [
  { id: 'LEASE-001', leaseNumber: 'LSE-2023-0001', tenant: 'Michael Smith', unit: 'A101', property: 'Sandton Square Apartments', type: 'residential', startDate: '2023-04-01', endDate: '2025-03-31', monthlyRental: 18500, escalation: 8, escalationDate: '2024-04-01', deposit: 37000, status: 'active' },
  { id: 'LEASE-002', leaseNumber: 'LSE-2024-0001', tenant: 'Lisa Johnson', unit: 'A102', property: 'Sandton Square Apartments', type: 'residential', startDate: '2024-01-01', endDate: '2024-12-31', monthlyRental: 14500, escalation: 7, escalationDate: '2025-01-01', deposit: 29000, status: 'active' },
  { id: 'LEASE-003', leaseNumber: 'LSE-2024-0002', tenant: 'Tech Solutions (Pty) Ltd', unit: 'B01', property: 'Midrand Business Park', type: 'commercial', startDate: '2024-07-01', endDate: '2026-06-30', monthlyRental: 45000, escalation: 6, escalationDate: '2025-07-01', deposit: 90000, status: 'active', ifrs16ROU: 1080000, ifrs16Liability: 1050000 },
  { id: 'LEASE-004', leaseNumber: 'LSE-2022-0001', tenant: 'Fashion Retail Group', unit: 'GF-01', property: 'Cape Quarter Mall', type: 'commercial', startDate: '2022-03-01', endDate: '2027-02-28', monthlyRental: 65000, escalation: 8, escalationDate: '2023-03-01', deposit: 130000, status: 'active', ifrs16ROU: 3900000, ifrs16Liability: 3650000 }
];

const sampleMaintenance: MaintenanceRequest[] = [
  { id: 'MNT-001', ticketNo: 'TKT-2024-0001', property: 'Sandton Square Apartments', unit: 'A105', tenant: 'David Mokoena', category: 'plumbing', priority: 'high', description: 'Leaking geyser', status: 'in-progress', reportedDate: '2024-06-10', assignedTo: 'ABC Plumbers' },
  { id: 'MNT-002', ticketNo: 'TKT-2024-0002', property: 'Midrand Business Park', unit: 'B03', tenant: 'XYZ Company', category: 'electrical', priority: 'medium', description: 'Faulty light switch', status: 'assigned', reportedDate: '2024-06-12', assignedTo: 'Quick Electric' },
  { id: 'MNT-003', ticketNo: 'TKT-2024-0003', property: 'Cape Quarter Mall', unit: 'GF-05', tenant: 'Coffee Shop Co', category: 'hvac', priority: 'high', description: 'Air conditioning not working', status: 'open', reportedDate: '2024-06-13' },
  { id: 'MNT-004', ticketNo: 'TKT-2024-0004', property: 'Sandton Square Apartments', unit: 'A201', tenant: 'Jane Smith', category: 'general', priority: 'low', description: 'Kitchen cabinet door loose', status: 'completed', reportedDate: '2024-06-05', assignedTo: 'Handy Man Services', completedDate: '2024-06-08', cost: 450 }
];

const sampleInvoices: Invoice[] = [
  { id: 'INV-001', invoiceNo: 'INV-2024-06-001', tenant: 'Michael Smith', property: 'Sandton Square Apartments', unit: 'A101', month: 'June 2024', rental: 18500, utilities: 850, levies: 1200, otherCharges: 0, total: 20550, paid: 20550, balance: 0, status: 'paid', dueDate: '2024-06-01' },
  { id: 'INV-002', invoiceNo: 'INV-2024-06-002', tenant: 'Lisa Johnson', property: 'Sandton Square Apartments', unit: 'A102', month: 'June 2024', rental: 14500, utilities: 680, levies: 950, otherCharges: 0, total: 16130, paid: 0, balance: 16130, status: 'overdue', dueDate: '2024-06-01' },
  { id: 'INV-003', invoiceNo: 'INV-2024-06-003', tenant: 'Tech Solutions (Pty) Ltd', property: 'Midrand Business Park', unit: 'B01', month: 'June 2024', rental: 45000, utilities: 2500, levies: 0, otherCharges: 1500, total: 49000, paid: 49000, balance: 0, status: 'paid', dueDate: '2024-06-07' }
];

const PropertyHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [propertyModalVisible, setPropertyModalVisible] = useState(false);
  const [tenantModalVisible, setTenantModalVisible] = useState(false);
  const [leaseModalVisible, setLeaseModalVisible] = useState(false);
  const [maintenanceModalVisible, setMaintenanceModalVisible] = useState(false);
  const [properties] = useState<Property[]>(sampleProperties);
  const [units] = useState<Unit[]>(sampleUnits);
  const [tenants] = useState<Tenant[]>(sampleTenants);
  const [leases] = useState<Lease[]>(sampleLeases);
  const [maintenance] = useState<MaintenanceRequest[]>(sampleMaintenance);
  const [invoices] = useState<Invoice[]>(sampleInvoices);
  const [form] = Form.useForm();

  // Calculate stats
  const propertyStats = {
    totalProperties: properties.length,
    totalUnits: properties.reduce((sum, p) => sum + p.totalUnits, 0),
    occupiedUnits: properties.reduce((sum, p) => sum + p.occupiedUnits, 0),
    occupancyRate: Math.round((properties.reduce((sum, p) => sum + p.occupiedUnits, 0) / properties.reduce((sum, p) => sum + p.totalUnits, 0)) * 100),
    monthlyRental: properties.reduce((sum, p) => sum + p.monthlyRental, 0),
    portfolioValue: properties.reduce((sum, p) => sum + p.marketValue, 0),
    tenantsInArrears: tenants.filter(t => t.balance > 0).length,
    arrearsAmount: tenants.filter(t => t.balance > 0).reduce((sum, t) => sum + t.balance, 0),
    openMaintenance: maintenance.filter(m => ['open', 'assigned', 'in-progress'].includes(m.status)).length
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      vacant: 'red', occupied: 'green', maintenance: 'orange', reserved: 'blue',
      active: 'green', 'in-arrears': 'red', notice: 'orange', vacated: 'default',
      draft: 'default', sent: 'blue', partial: 'orange', paid: 'green', overdue: 'red'
    };
    return colors[status] || 'default';
  };

  // Dashboard
  const renderDashboard = () => (
    <div style={{ padding: '24px' }}>
      {/* Key Metrics */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Portfolio Value"
              value={propertyStats.portfolioValue}
              prefix="R"
              valueStyle={{ color: '#1890ff' }}
              formatter={(value) => `${(Number(value) / 1000000).toFixed(0)}M`}
            />
            <Text type="secondary">{propertyStats.totalProperties} properties</Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Monthly Rental"
              value={propertyStats.monthlyRental}
              prefix="R"
              valueStyle={{ color: '#52c41a' }}
              formatter={(value) => `${(Number(value) / 1000).toFixed(0)}K`}
            />
            <Progress percent={propertyStats.occupancyRate} showInfo={false} strokeColor="#52c41a" />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Occupancy Rate"
              value={propertyStats.occupancyRate}
              suffix="%"
              valueStyle={{ color: propertyStats.occupancyRate >= 90 ? '#52c41a' : '#faad14' }}
            />
            <Text type="secondary">{propertyStats.occupiedUnits} / {propertyStats.totalUnits} units</Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Arrears"
              value={propertyStats.arrearsAmount}
              prefix="R"
              valueStyle={{ color: '#ff4d4f' }}
              formatter={(value) => `${(Number(value) / 1000).toFixed(1)}K`}
            />
            <Text type="secondary">{propertyStats.tenantsInArrears} tenants</Text>
          </Card>
        </Col>
      </Row>

      {/* EAAB Compliance Alert */}
      <Alert
        message="EAAB Compliance Status"
        description={
          <Space wrap>
            <Tag color="green">FFC: Valid until March 2025</Tag>
            <Tag color="green">Trust Account: Compliant</Tag>
            <Tag color="blue">PI Insurance: R5M Cover</Tag>
            <Tag color="cyan">Audit: Up to date</Tag>
          </Space>
        }
        type="success"
        showIcon
        icon={<SafetyCertificateOutlined />}
        style={{ marginTop: 16, marginBottom: 16 }}
      />

      {/* Portfolio Overview & Alerts */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card 
            title={<><ShopOutlined /> Property Portfolio</>}
            extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setPropertyModalVisible(true)}>Add Property</Button>}
          >
            <Table
              dataSource={properties}
              rowKey="id"
              size="small"
              pagination={false}
              columns={[
                {
                  title: 'Property',
                  key: 'property',
                  render: (_, record) => (
                    <div>
                      <Text strong>{record.name}</Text>
                      <br />
                      <Tag color={record.type === 'residential' ? 'green' : record.type === 'commercial' ? 'blue' : record.type === 'retail' ? 'purple' : 'orange'}>
                        {record.type}
                      </Tag>
                      <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>{record.suburb}, {record.city}</Text>
                    </div>
                  )
                },
                {
                  title: 'Occupancy',
                  key: 'occupancy',
                  render: (_, record) => (
                    <div>
                      <Progress 
                        percent={Math.round((record.occupiedUnits / record.totalUnits) * 100)} 
                        size="small" 
                        style={{ width: 80 }}
                      />
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {record.occupiedUnits}/{record.totalUnits}
                      </Text>
                    </div>
                  )
                },
                {
                  title: 'Monthly Rental',
                  dataIndex: 'monthlyRental',
                  key: 'monthlyRental',
                  render: (rental: number) => `R${(rental / 1000).toFixed(0)}K`
                },
                {
                  title: 'Value',
                  dataIndex: 'marketValue',
                  key: 'marketValue',
                  render: (value: number) => `R${(value / 1000000).toFixed(0)}M`
                }
              ]}
            />
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card title={<><BellOutlined /> Alerts & Actions</>}>
            <List
              size="small"
              dataSource={[
                { type: 'arrears', title: 'Arrears Alert', description: `${propertyStats.tenantsInArrears} tenants in arrears`, color: 'red', icon: <WarningOutlined /> },
                { type: 'lease', title: 'Leases Expiring', description: '3 leases expire in next 30 days', color: 'orange', icon: <CalendarOutlined /> },
                { type: 'maintenance', title: 'Open Tickets', description: `${propertyStats.openMaintenance} maintenance requests open`, color: 'blue', icon: <ToolOutlined /> },
                { type: 'vacant', title: 'Vacant Units', description: `${propertyStats.totalUnits - propertyStats.occupiedUnits} units available`, color: 'purple', icon: <HomeOutlined /> }
              ]}
              renderItem={item => (
                <List.Item>
                  <Space>
                    <Avatar icon={item.icon} style={{ backgroundColor: item.color === 'red' ? '#ff4d4f' : item.color === 'orange' ? '#faad14' : item.color === 'blue' ? '#1890ff' : '#722ed1' }} size="small" />
                    <div>
                      <Text strong>{item.title}</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 12 }}>{item.description}</Text>
                    </div>
                  </Space>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      {/* Collections Summary */}
      <Card title={<><DollarOutlined /> Collections Summary - June 2024</>} style={{ marginTop: 16 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic title="Billed" value={3200000} prefix="R" formatter={(v) => `${(Number(v)/1000).toFixed(0)}K`} />
          </Col>
          <Col span={6}>
            <Statistic title="Collected" value={2850000} prefix="R" valueStyle={{ color: '#52c41a' }} formatter={(v) => `${(Number(v)/1000).toFixed(0)}K`} />
          </Col>
          <Col span={6}>
            <Statistic title="Outstanding" value={350000} prefix="R" valueStyle={{ color: '#faad14' }} formatter={(v) => `${(Number(v)/1000).toFixed(0)}K`} />
          </Col>
          <Col span={6}>
            <Statistic title="Collection Rate" value={89} suffix="%" valueStyle={{ color: '#1890ff' }} />
          </Col>
        </Row>
        <Progress percent={89} showInfo={false} strokeColor="#52c41a" style={{ marginTop: 16 }} />
      </Card>

      {/* Property Development WIP */}
      <Card 
        title={<><CalculatorOutlined /> Property Development WIP</>} 
        style={{ marginTop: 16 }}
        extra={<Tag color="purple">IAS 2 / IAS 40</Tag>}
      >
        <Alert
          message="Property Under Development - Capitalisation Policy"
          description="Development costs are capitalised to the property asset until practical completion. Land and building costs, professional fees, finance costs (where permitted), and direct development costs are included in WIP."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Table
          size="small"
          pagination={false}
          dataSource={[
            { id: 'DEV-001', name: 'Waterfall Business Park Phase 3', status: 'Under Construction', landCost: 45000000, constructionCost: 85000000, professionalFees: 8500000, financeCost: 6200000, totalWIP: 144700000, completionDate: '2025-06-30', progress: 35 },
            { id: 'DEV-002', name: 'Sandton View Apartments', status: 'Planning', landCost: 32000000, constructionCost: 0, professionalFees: 3200000, financeCost: 1800000, totalWIP: 37000000, completionDate: '2026-03-31', progress: 5 },
            { id: 'DEV-003', name: 'Century City Retail Extension', status: 'Foundation', landCost: 28000000, constructionCost: 15000000, professionalFees: 4300000, financeCost: 2100000, totalWIP: 49400000, completionDate: '2025-09-30', progress: 18 }
          ]}
          columns={[
            {
              title: 'Development Project',
              key: 'project',
              render: (_, record) => (
                <div>
                  <Text strong>{record.name}</Text>
                  <br />
                  <Space size="small">
                    <Tag>{record.id}</Tag>
                    <Tag color={record.status === 'Under Construction' ? 'blue' : record.status === 'Planning' ? 'orange' : 'green'}>
                      {record.status}
                    </Tag>
                  </Space>
                </div>
              )
            },
            { title: 'Land Cost', dataIndex: 'landCost', key: 'landCost', render: (v: number) => <Text>R{(v/1000000).toFixed(1)}M</Text> },
            { title: 'Construction', dataIndex: 'constructionCost', key: 'constructionCost', render: (v: number) => <Text>{v > 0 ? `R${(v/1000000).toFixed(1)}M` : '-'}</Text> },
            { title: 'Prof. Fees', dataIndex: 'professionalFees', key: 'professionalFees', render: (v: number) => <Text>R{(v/1000000).toFixed(1)}M</Text> },
            { title: 'Finance Cost', dataIndex: 'financeCost', key: 'financeCost', render: (v: number) => <Text>R{(v/1000000).toFixed(1)}M</Text> },
            { title: 'Total WIP', dataIndex: 'totalWIP', key: 'totalWIP', render: (v: number) => <Text strong type="warning">R{(v/1000000).toFixed(1)}M</Text> },
            { title: 'Progress', dataIndex: 'progress', key: 'progress', render: (v: number) => <Progress percent={v} size="small" style={{ width: 60 }} /> },
            { title: 'Completion', dataIndex: 'completionDate', key: 'completionDate', render: (d: string) => <Tag icon={<CalendarOutlined />}>{d}</Tag> }
          ]}
          summary={() => (
            <Table.Summary fixed>
              <Table.Summary.Row style={{ background: '#fafafa' }}>
                <Table.Summary.Cell index={0}><Text strong>TOTAL WIP</Text></Table.Summary.Cell>
                <Table.Summary.Cell index={1}><Text strong>R105.0M</Text></Table.Summary.Cell>
                <Table.Summary.Cell index={2}><Text strong>R100.0M</Text></Table.Summary.Cell>
                <Table.Summary.Cell index={3}><Text strong>R16.0M</Text></Table.Summary.Cell>
                <Table.Summary.Cell index={4}><Text strong>R10.1M</Text></Table.Summary.Cell>
                <Table.Summary.Cell index={5}><Text strong type="warning">R231.1M</Text></Table.Summary.Cell>
                <Table.Summary.Cell index={6} />
                <Table.Summary.Cell index={7} />
              </Table.Summary.Row>
            </Table.Summary>
          )}
        />
        <Divider />
        <Row gutter={16}>
          <Col span={6}>
            <Card size="small">
              <Statistic title="Total WIP Balance" value={231100000} prefix="R" formatter={(v) => `${(Number(v)/1000000).toFixed(1)}M`} />
              <Text type="secondary">GL Account: 1350</Text>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic title="Capitalized Interest (YTD)" value={10100000} prefix="R" formatter={(v) => `${(Number(v)/1000000).toFixed(1)}M`} />
              <Text type="secondary">IAS 23 Borrowing Costs</Text>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic title="Expected Value on Completion" value={425000000} prefix="R" formatter={(v) => `${(Number(v)/1000000).toFixed(0)}M`} />
              <Text type="secondary">Fair Value (IAS 40)</Text>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic title="Development Profit (Est.)" value={193900000} prefix="R" valueStyle={{ color: '#52c41a' }} formatter={(v) => `${(Number(v)/1000000).toFixed(0)}M`} />
              <Text type="secondary">45.6% Margin</Text>
            </Card>
          </Col>
        </Row>
      </Card>
    </div>
  );

  // Properties List
  const renderProperties = () => (
    <div style={{ padding: '24px' }}>
      <Card
        title="Property Management"
        extra={
          <Space>
            <Input placeholder="Search..." prefix={<SearchOutlined />} style={{ width: 200 }} />
            <Select defaultValue="all" style={{ width: 150 }}>
              <Option value="all">All Types</Option>
              <Option value="residential">Residential</Option>
              <Option value="commercial">Commercial</Option>
              <Option value="retail">Retail</Option>
              <Option value="industrial">Industrial</Option>
            </Select>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setPropertyModalVisible(true)}>
              Add Property
            </Button>
          </Space>
        }
      >
        <Table
          dataSource={properties}
          rowKey="id"
          columns={[
            {
              title: 'Image',
              key: 'image',
              width: 80,
              render: (_, record) => (
                record.imageUrl ? (
                  <img 
                    src={record.imageUrl} 
                    alt={record.name} 
                    style={{ width: 60, height: 45, objectFit: 'cover', borderRadius: 4 }}
                  />
                ) : (
                  <div style={{ width: 60, height: 45, background: '#f0f0f0', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <HomeOutlined style={{ color: '#999', fontSize: 20 }} />
                  </div>
                )
              )
            },
            {
              title: 'Property',
              key: 'property',
              render: (_, record) => (
                <div>
                  <Text strong>{record.name}</Text>
                  <br />
                  <Space size="small">
                    <Tag>{record.code}</Tag>
                    <Tag color={record.type === 'residential' ? 'green' : record.type === 'commercial' ? 'blue' : 'purple'}>
                      {record.type}
                    </Tag>
                  </Space>
                </div>
              )
            },
            {
              title: 'Location',
              key: 'location',
              render: (_, record) => (
                <div>
                  <Text>{record.address}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 11 }}>{record.suburb}, {record.city}</Text>
                </div>
              )
            },
            { title: 'ERF No', dataIndex: 'erfNumber', key: 'erfNumber' },
            {
              title: 'Units',
              key: 'units',
              render: (_, record) => (
                <div>
                  <Text>{record.occupiedUnits} / {record.totalUnits}</Text>
                  <Progress percent={Math.round((record.occupiedUnits / record.totalUnits) * 100)} size="small" showInfo={false} />
                </div>
              )
            },
            {
              title: 'Monthly Rental',
              dataIndex: 'monthlyRental',
              key: 'monthlyRental',
              render: (rental: number) => <Text type="success">R{rental.toLocaleString()}</Text>
            },
            {
              title: 'Market Value',
              dataIndex: 'marketValue',
              key: 'marketValue',
              render: (value: number) => `R${(value / 1000000).toFixed(1)}M`
            },
            {
              title: 'Manager',
              dataIndex: 'manager',
              key: 'manager',
              render: (manager: string) => manager || '-'
            },
            {
              title: 'Actions',
              key: 'actions',
              render: () => (
                <Dropdown
                  menu={{
                    items: [
                      { key: 'view', label: 'View Details', icon: <EyeOutlined /> },
                      { key: 'units', label: 'Manage Units', icon: <AppstoreOutlined /> },
                      { key: 'tenants', label: 'View Tenants', icon: <TeamOutlined /> },
                      { key: 'maintenance', label: 'Maintenance', icon: <ToolOutlined /> },
                      { type: 'divider' },
                      { key: 'edit', label: 'Edit Property', icon: <EditOutlined /> }
                    ]
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

  // Tenants
  const renderTenants = () => (
    <div style={{ padding: '24px' }}>
      <Card
        title={<><TeamOutlined /> Tenant Management</>}
        extra={
          <Space>
            <Input placeholder="Search tenants..." prefix={<SearchOutlined />} style={{ width: 200 }} />
            <Select defaultValue="all" style={{ width: 150 }}>
              <Option value="all">All Status</Option>
              <Option value="active">Active</Option>
              <Option value="in-arrears">In Arrears</Option>
              <Option value="notice">Notice Given</Option>
            </Select>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setTenantModalVisible(true)}>
              Add Tenant
            </Button>
          </Space>
        }
      >
        <Table
          dataSource={tenants}
          rowKey="id"
          columns={[
            {
              title: 'Tenant',
              key: 'tenant',
              render: (_, record) => (
                <Space>
                  <Avatar icon={<UserOutlined />} style={{ backgroundColor: record.type === 'individual' ? '#1890ff' : '#722ed1' }} />
                  <div>
                    <Text strong>{record.name}</Text>
                    <br />
                    <Tag color={record.type === 'individual' ? 'blue' : 'purple'}>{record.type}</Tag>
                  </div>
                </Space>
              )
            },
            {
              title: 'Property / Unit',
              key: 'unit',
              render: (_, record) => (
                <div>
                  <Text>{record.property}</Text>
                  <br />
                  <Tag><KeyOutlined /> {record.unit}</Tag>
                </div>
              )
            },
            {
              title: 'Contact',
              key: 'contact',
              render: (_, record) => (
                <div>
                  <Text><PhoneOutlined /> {record.cellphone}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 11 }}><MailOutlined /> {record.email}</Text>
                </div>
              )
            },
            {
              title: 'Lease Period',
              key: 'lease',
              render: (_, record) => (
                <div>
                  <Text>{record.leaseStart} - {record.leaseEnd}</Text>
                </div>
              )
            },
            {
              title: 'Monthly Rental',
              dataIndex: 'monthlyRental',
              key: 'monthlyRental',
              render: (rental: number) => `R${rental.toLocaleString()}`
            },
            {
              title: 'Balance',
              dataIndex: 'balance',
              key: 'balance',
              render: (balance: number) => (
                <Text style={{ color: balance > 0 ? '#ff4d4f' : balance < 0 ? '#52c41a' : undefined }}>
                  R{balance.toLocaleString()}
                </Text>
              )
            },
            {
              title: 'Status',
              dataIndex: 'status',
              key: 'status',
              render: (status: string) => <Tag color={getStatusColor(status)}>{status.toUpperCase()}</Tag>
            },
            {
              title: 'Actions',
              key: 'actions',
              render: () => (
                <Space>
                  <Button size="small" icon={<EyeOutlined />} />
                  <Button size="small" icon={<FileTextOutlined />}>Invoice</Button>
                </Space>
              )
            }
          ]}
        />
      </Card>
    </div>
  );

  // Leases
  const renderLeases = () => (
    <div style={{ padding: '24px' }}>
      <Card
        title={<><FileDoneOutlined /> Lease Management</>}
        extra={
          <Space>
            <Select defaultValue="all" style={{ width: 150 }}>
              <Option value="all">All Status</Option>
              <Option value="active">Active</Option>
              <Option value="expired">Expired</Option>
              <Option value="draft">Draft</Option>
            </Select>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setLeaseModalVisible(true)}>
              New Lease
            </Button>
          </Space>
        }
      >
        <Alert
          message="IFRS 16 Lease Accounting"
          description="Commercial leases are automatically calculated for IFRS 16 Right-of-Use Assets and Lease Liabilities"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Table
          dataSource={leases}
          rowKey="id"
          columns={[
            { title: 'Lease #', dataIndex: 'leaseNumber', key: 'leaseNumber' },
            { title: 'Tenant', dataIndex: 'tenant', key: 'tenant' },
            {
              title: 'Property / Unit',
              key: 'unit',
              render: (_, record) => (
                <div>
                  <Text>{record.property}</Text>
                  <br />
                  <Tag>{record.unit}</Tag>
                </div>
              )
            },
            {
              title: 'Type',
              dataIndex: 'type',
              key: 'type',
              render: (type: string) => <Tag color={type === 'residential' ? 'green' : 'blue'}>{type}</Tag>
            },
            { title: 'Start', dataIndex: 'startDate', key: 'startDate' },
            { title: 'End', dataIndex: 'endDate', key: 'endDate' },
            {
              title: 'Monthly',
              dataIndex: 'monthlyRental',
              key: 'monthlyRental',
              render: (rental: number) => `R${rental.toLocaleString()}`
            },
            {
              title: 'Escalation',
              key: 'escalation',
              render: (_, record) => <Tag>{record.escalation}% on {record.escalationDate}</Tag>
            },
            {
              title: 'Status',
              dataIndex: 'status',
              key: 'status',
              render: (status: string) => <Tag color={getStatusColor(status)}>{status.toUpperCase()}</Tag>
            },
            {
              title: 'IFRS 16',
              key: 'ifrs16',
              render: (_, record) => record.ifrs16ROU ? (
                <Tooltip title={`ROU: R${record.ifrs16ROU?.toLocaleString()} | Liability: R${record.ifrs16Liability?.toLocaleString()}`}>
                  <Tag color="cyan">IFRS 16</Tag>
                </Tooltip>
              ) : '-'
            },
            {
              title: 'Actions',
              key: 'actions',
              render: () => (
                <Space>
                  <Button size="small" icon={<EyeOutlined />} />
                  <Button size="small" icon={<ExportOutlined />}>PDF</Button>
                </Space>
              )
            }
          ]}
        />
      </Card>
    </div>
  );

  // Billing
  const renderBilling = () => (
    <div style={{ padding: '24px' }}>
      <Card
        title={<><DollarOutlined /> Rental Billing</>}
        extra={
          <Space>
            <Select defaultValue="june-2024" style={{ width: 150 }}>
              <Option value="june-2024">June 2024</Option>
              <Option value="may-2024">May 2024</Option>
              <Option value="apr-2024">April 2024</Option>
            </Select>
            <Button icon={<SyncOutlined />}>Generate Invoices</Button>
            <Button type="primary" icon={<MailOutlined />}>Send Statements</Button>
          </Space>
        }
      >
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card size="small">
              <Statistic title="Total Invoiced" value={invoices.reduce((sum, i) => sum + i.total, 0)} prefix="R" formatter={(v) => v.toLocaleString()} />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic title="Collected" value={invoices.reduce((sum, i) => sum + i.paid, 0)} prefix="R" valueStyle={{ color: '#52c41a' }} formatter={(v) => v.toLocaleString()} />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic title="Outstanding" value={invoices.reduce((sum, i) => sum + i.balance, 0)} prefix="R" valueStyle={{ color: '#faad14' }} formatter={(v) => v.toLocaleString()} />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic title="Overdue" value={invoices.filter(i => i.status === 'overdue').reduce((sum, i) => sum + i.balance, 0)} prefix="R" valueStyle={{ color: '#ff4d4f' }} formatter={(v) => v.toLocaleString()} />
            </Card>
          </Col>
        </Row>

        <Table
          dataSource={invoices}
          rowKey="id"
          columns={[
            { title: 'Invoice #', dataIndex: 'invoiceNo', key: 'invoiceNo' },
            { title: 'Tenant', dataIndex: 'tenant', key: 'tenant' },
            { title: 'Property', dataIndex: 'property', key: 'property' },
            { title: 'Unit', dataIndex: 'unit', key: 'unit' },
            { title: 'Month', dataIndex: 'month', key: 'month' },
            { title: 'Rental', dataIndex: 'rental', key: 'rental', render: (r: number) => `R${r.toLocaleString()}` },
            { title: 'Total', dataIndex: 'total', key: 'total', render: (t: number) => <Text strong>R{t.toLocaleString()}</Text> },
            { title: 'Paid', dataIndex: 'paid', key: 'paid', render: (p: number) => <Text type="success">R{p.toLocaleString()}</Text> },
            { 
              title: 'Balance', 
              dataIndex: 'balance', 
              key: 'balance', 
              render: (b: number) => <Text style={{ color: b > 0 ? '#ff4d4f' : '#52c41a' }}>R{b.toLocaleString()}</Text> 
            },
            {
              title: 'Status',
              dataIndex: 'status',
              key: 'status',
              render: (status: string) => <Tag color={getStatusColor(status)}>{status.toUpperCase()}</Tag>
            },
            {
              title: 'Actions',
              key: 'actions',
              render: () => (
                <Space>
                  <Button size="small" icon={<EyeOutlined />} />
                  <Button size="small" icon={<MailOutlined />} />
                  <Button size="small" icon={<WalletOutlined />}>Receipt</Button>
                </Space>
              )
            }
          ]}
        />
      </Card>
    </div>
  );

  // Maintenance
  const renderMaintenance = () => (
    <div style={{ padding: '24px' }}>
      <Card
        title={<><ToolOutlined /> Maintenance Management</>}
        extra={
          <Space>
            <Select defaultValue="all" style={{ width: 150 }}>
              <Option value="all">All Status</Option>
              <Option value="open">Open</Option>
              <Option value="in-progress">In Progress</Option>
              <Option value="completed">Completed</Option>
            </Select>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setMaintenanceModalVisible(true)}>
              Log Request
            </Button>
          </Space>
        }
      >
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card size="small">
              <Statistic title="Open" value={maintenance.filter(m => m.status === 'open').length} valueStyle={{ color: '#ff4d4f' }} />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic title="In Progress" value={maintenance.filter(m => m.status === 'in-progress').length} valueStyle={{ color: '#1890ff' }} />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic title="Completed (MTD)" value={maintenance.filter(m => m.status === 'completed').length} valueStyle={{ color: '#52c41a' }} />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic title="MTD Cost" value={maintenance.reduce((sum, m) => sum + (m.cost || 0), 0)} prefix="R" />
            </Card>
          </Col>
        </Row>

        <Table
          dataSource={maintenance}
          rowKey="id"
          columns={[
            { title: 'Ticket #', dataIndex: 'ticketNo', key: 'ticketNo' },
            { title: 'Property', dataIndex: 'property', key: 'property' },
            { title: 'Unit', dataIndex: 'unit', key: 'unit' },
            { title: 'Tenant', dataIndex: 'tenant', key: 'tenant' },
            {
              title: 'Category',
              dataIndex: 'category',
              key: 'category',
              render: (cat: string) => <Tag>{cat}</Tag>
            },
            {
              title: 'Priority',
              dataIndex: 'priority',
              key: 'priority',
              render: (priority: string) => {
                const colors: Record<string, string> = { low: 'default', medium: 'blue', high: 'orange', emergency: 'red' };
                return <Tag color={colors[priority]}>{priority.toUpperCase()}</Tag>;
              }
            },
            { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true },
            {
              title: 'Status',
              dataIndex: 'status',
              key: 'status',
              render: (status: string) => {
                const colors: Record<string, string> = { open: 'red', assigned: 'blue', 'in-progress': 'cyan', completed: 'green', closed: 'default' };
                return <Tag color={colors[status]}>{status.toUpperCase()}</Tag>;
              }
            },
            { title: 'Assigned', dataIndex: 'assignedTo', key: 'assignedTo', render: (a: string) => a || '-' },
            {
              title: 'Actions',
              key: 'actions',
              render: (_, record) => (
                <Space>
                  <Button size="small" icon={<EyeOutlined />} />
                  {record.status === 'open' && <Button size="small" type="primary">Assign</Button>}
                  {record.status === 'in-progress' && <Button size="small" type="primary">Complete</Button>}
                </Space>
              )
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
          <Card title={<><SafetyCertificateOutlined /> EAAB Compliance</>}>
            <Form layout="vertical">
              <Form.Item label="FFC Number">
                <Input defaultValue="FFC-12345" />
              </Form.Item>
              <Form.Item label="FFC Expiry Date">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item label="Trust Account Number">
                <Input defaultValue="62123456789" />
              </Form.Item>
              <Form.Item label="Trust Account Bank">
                <Select defaultValue="fnb">
                  <Option value="fnb">First National Bank</Option>
                  <Option value="sbsa">Standard Bank</Option>
                  <Option value="absa">ABSA</Option>
                  <Option value="nedbank">Nedbank</Option>
                </Select>
              </Form.Item>
              <Button type="primary">Update Compliance</Button>
            </Form>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Financial Integration">
            <Form layout="vertical">
              <Form.Item label="Rental Income Account">
                <Select defaultValue="4100">
                  <Option value="4100">4100 - Rental Income</Option>
                  <Option value="4110">4110 - Residential Rental</Option>
                  <Option value="4120">4120 - Commercial Rental</Option>
                </Select>
              </Form.Item>
              <Form.Item label="Accounts Receivable">
                <Select defaultValue="1100">
                  <Option value="1100">1100 - Trade Receivables</Option>
                  <Option value="1110">1110 - Tenant Receivables</Option>
                </Select>
              </Form.Item>
              <Form.Item label="Deposits Held Account">
                <Select defaultValue="2200">
                  <Option value="2200">2200 - Deposits Held</Option>
                  <Option value="2210">2210 - Tenant Deposits</Option>
                </Select>
              </Form.Item>
              <Form.Item label="IFRS 16 ROU Asset">
                <Select defaultValue="1500">
                  <Option value="1500">1500 - Right of Use Assets</Option>
                </Select>
              </Form.Item>
              <Form.Item label="IFRS 16 Lease Liability">
                <Select defaultValue="2300">
                  <Option value="2300">2300 - Lease Liabilities</Option>
                </Select>
              </Form.Item>
              <Button type="primary">Save Settings</Button>
            </Form>
          </Card>
        </Col>

        <Col xs={24}>
          <Card title="Default Lease Terms">
            <Form layout="vertical">
              <Row gutter={16}>
                <Col span={6}>
                  <Form.Item label="Standard Lease Period">
                    <Select defaultValue="12">
                      <Option value="6">6 Months</Option>
                      <Option value="12">12 Months</Option>
                      <Option value="24">24 Months</Option>
                      <Option value="36">36 Months</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item label="Default Deposit">
                    <Select defaultValue="2">
                      <Option value="1">1 Month</Option>
                      <Option value="2">2 Months</Option>
                      <Option value="3">3 Months</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item label="Default Escalation">
                    <InputNumber defaultValue={8} min={0} max={15} formatter={v => `${v}%`} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item label="Payment Due Day">
                    <InputNumber defaultValue={1} min={1} max={28} style={{ width: '100%' }} />
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
        title="Property Hub"
        subtitle="Property Portfolio & Lease Management"
        icon={<ShopOutlined />}
        gradient="purple"
        actions={
          <>
            <Button icon={<SyncOutlined />}>Refresh</Button>
            <Button icon={<ExportOutlined />}>Export</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setPropertyModalVisible(true)}>
              Add Property
            </Button>
          </>
        }
      />

      <StatusBanner
        gradient="purple"
        icon={<ShopOutlined />}
        title="Portfolio Summary"
        subtitle="Properties & Occupancy"
        stats={[
          { title: 'Portfolio Value', value: `R${(propertyStats.portfolioValue / 1000000).toFixed(0)}M`, span: 4 },
          { title: 'Monthly Rental', value: `R${(propertyStats.monthlyRental / 1000).toFixed(0)}K`, valueStyle: { color: '#86efac' }, span: 4 },
          { title: 'Occupancy', value: `${propertyStats.occupancyRate}%`, span: 4 },
          { title: 'Properties', value: propertyStats.totalProperties, span: 4 },
          { title: 'Arrears', value: `R${(propertyStats.arrearsAmount / 1000).toFixed(1)}K`, valueStyle: { color: '#fca5a5' }, span: 4 },
        ]}
      />

      <HubTabs
        theme="purple"
        tabs={[
          { key: 'dashboard', label: 'Dashboard', icon: <HomeOutlined />, children: renderDashboard() },
          { key: 'properties', label: 'Properties', icon: <ShopOutlined />, children: renderProperties() },
          { key: 'tenants', label: 'Tenants', icon: <TeamOutlined />, children: renderTenants() },
          { key: 'leases', label: 'Leases', icon: <FileDoneOutlined />, children: renderLeases() },
          { key: 'billing', label: 'Billing', icon: <DollarOutlined />, children: renderBilling() },
          { key: 'maintenance', label: 'Maintenance', icon: <ToolOutlined />, children: renderMaintenance() },
          { key: 'settings', label: 'Settings', icon: <SettingOutlined />, children: renderSettings() }
        ]}
        activeKey={activeTab}
        onChange={setActiveTab}
      />
    </HubLayout>
  );
};

export default PropertyHub;
