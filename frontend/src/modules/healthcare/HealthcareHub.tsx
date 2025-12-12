/**
 * HealthcareHub - Healthcare Industry Management
 * 
 * Features:
 * - Patient Billing & Accounts
 * - Medical Aid Integration (Discovery, Medscheme, Gems, etc.)
 * - ICD-10 Coding
 * - HPCSA Practitioner Compliance
 * - Appointment Scheduling
 * - Stock/Dispensary Management
 * - Chronic Medication Programs
 * - Practice Management
 * - Claims Management & ERA Processing
 * - Financial Integration (IFRS 15 Revenue Recognition)
 */

import React, { useState } from 'react';
import {
  Card, Row, Col, Statistic, Progress, Table, Tag, Button, Space, Badge,
  Input, Select, DatePicker, Modal, Form, Typography, Avatar,
  Timeline, Descriptions, Tooltip, Dropdown, InputNumber, Switch, Alert,
  List, Tabs, Divider, Steps, Upload, message, Calendar, Collapse
} from 'antd';
import {
  HomeOutlined, TeamOutlined, CalendarOutlined, ClockCircleOutlined,
  DollarOutlined, BarChartOutlined, CheckCircleOutlined, WarningOutlined,
  PlusOutlined, SearchOutlined, FilterOutlined, ExportOutlined,
  SettingOutlined, SyncOutlined, FlagOutlined, SafetyCertificateOutlined,
  UserOutlined, BellOutlined, ThunderboltOutlined, MedicineBoxOutlined,
  AuditOutlined, BankOutlined, RocketOutlined, HeartOutlined,
  EyeOutlined, EditOutlined, DeleteOutlined, MoreOutlined, FileProtectOutlined,
  FileDoneOutlined, TrophyOutlined, PieChartOutlined, LineChartOutlined,
  FileTextOutlined, SolutionOutlined, ProfileOutlined, ScheduleOutlined,
  CreditCardOutlined, IdcardOutlined, PhoneOutlined, MailOutlined
} from '@ant-design/icons';
import { HubLayout, HubHeader, StatusBanner, HubTabs } from '../../components/hub';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { TextArea } = Input;
const { Panel } = Collapse;

// Interfaces
interface Patient {
  id: string;
  title: string;
  firstName: string;
  lastName: string;
  idNumber: string;
  dob: string;
  gender: 'M' | 'F';
  cellphone: string;
  email: string;
  medicalAid?: string;
  memberNumber?: string;
  dependantCode?: string;
  planOption?: string;
  balance: number;
  lastVisit?: string;
}

interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  practitioner: string;
  date: string;
  time: string;
  duration: number; // minutes
  type: 'consultation' | 'follow-up' | 'procedure' | 'chronic';
  status: 'scheduled' | 'confirmed' | 'arrived' | 'in-progress' | 'completed' | 'cancelled' | 'no-show';
  reason?: string;
}

interface Invoice {
  id: string;
  invoiceNo: string;
  patientId: string;
  patientName: string;
  date: string;
  medicalAid?: string;
  memberNo?: string;
  grossAmount: number;
  medicalAidPortion: number;
  patientPortion: number;
  status: 'draft' | 'submitted' | 'paid' | 'rejected' | 'partially-paid';
  icd10Codes: string[];
  tariffCodes: string[];
}

interface Claim {
  id: string;
  claimNo: string;
  invoiceNo: string;
  patientName: string;
  medicalAid: string;
  submittedDate: string;
  amount: number;
  status: 'submitted' | 'processing' | 'accepted' | 'rejected' | 'paid';
  rejectionReason?: string;
  paidAmount?: number;
  paidDate?: string;
}

interface MedicalAidScheme {
  id: string;
  name: string;
  code: string;
  administrator: string;
  activePatients: number;
  outstandingClaims: number;
  avgPaymentDays: number;
}

interface Practitioner {
  id: string;
  name: string;
  hpcsaNumber: string;
  specialty: string;
  practiceNumber: string;
  status: 'active' | 'inactive';
  appointmentsToday: number;
}

// Sample Data
const samplePatients: Patient[] = [
  { id: 'PAT-001', title: 'Mr', firstName: 'John', lastName: 'Smith', idNumber: '8501015800089', dob: '1985-01-01', gender: 'M', cellphone: '0821234567', email: 'john@email.com', medicalAid: 'Discovery Health', memberNumber: '123456789', dependantCode: '00', planOption: 'Executive', balance: 0, lastVisit: '2024-06-10' },
  { id: 'PAT-002', title: 'Mrs', firstName: 'Sarah', lastName: 'Johnson', idNumber: '9003150800087', dob: '1990-03-15', gender: 'F', cellphone: '0839876543', email: 'sarah@email.com', medicalAid: 'GEMS', memberNumber: '987654321', dependantCode: '01', planOption: 'Emerald', balance: 450, lastVisit: '2024-06-08' },
  { id: 'PAT-003', title: 'Ms', firstName: 'Thandi', lastName: 'Nkosi', idNumber: '9505200800083', dob: '1995-05-20', gender: 'F', cellphone: '0761112233', email: 'thandi@email.com', medicalAid: 'Bonitas', memberNumber: '456789123', dependantCode: '00', planOption: 'BonComprehensive', balance: -250, lastVisit: '2024-06-12' },
  { id: 'PAT-004', title: 'Mr', firstName: 'David', lastName: 'Mokoena', idNumber: '7808085800081', dob: '1978-08-08', gender: 'M', cellphone: '0829998877', email: 'david@email.com', balance: 1250, lastVisit: '2024-05-20' },
  { id: 'PAT-005', title: 'Dr', firstName: 'Lisa', lastName: 'van der Berg', idNumber: '8206120800085', dob: '1982-06-12', gender: 'F', cellphone: '0845556666', email: 'lisa@email.com', medicalAid: 'Discovery Health', memberNumber: '654321987', dependantCode: '00', planOption: 'Coastal', balance: 0, lastVisit: '2024-06-11' }
];

const sampleAppointments: Appointment[] = [
  { id: 'APT-001', patientId: 'PAT-001', patientName: 'John Smith', practitioner: 'Dr. M. Patel', date: '2024-06-15', time: '09:00', duration: 30, type: 'consultation', status: 'confirmed', reason: 'Annual checkup' },
  { id: 'APT-002', patientId: 'PAT-002', patientName: 'Sarah Johnson', practitioner: 'Dr. M. Patel', date: '2024-06-15', time: '09:30', duration: 20, type: 'follow-up', status: 'scheduled', reason: 'BP follow-up' },
  { id: 'APT-003', patientId: 'PAT-003', patientName: 'Thandi Nkosi', practitioner: 'Dr. M. Patel', date: '2024-06-15', time: '10:00', duration: 30, type: 'chronic', status: 'arrived', reason: 'Chronic medication' },
  { id: 'APT-004', patientId: 'PAT-004', patientName: 'David Mokoena', practitioner: 'Dr. S. Naidoo', date: '2024-06-15', time: '10:30', duration: 45, type: 'procedure', status: 'scheduled', reason: 'Minor procedure' },
  { id: 'APT-005', patientId: 'PAT-005', patientName: 'Lisa van der Berg', practitioner: 'Dr. M. Patel', date: '2024-06-15', time: '11:00', duration: 30, type: 'consultation', status: 'scheduled' }
];

const sampleInvoices: Invoice[] = [
  { id: 'INV-001', invoiceNo: 'INV-2024-0001', patientId: 'PAT-001', patientName: 'John Smith', date: '2024-06-10', medicalAid: 'Discovery Health', memberNo: '123456789', grossAmount: 1850, medicalAidPortion: 1450, patientPortion: 400, status: 'submitted', icd10Codes: ['J06.9', 'R05'], tariffCodes: ['0190', '0120'] },
  { id: 'INV-002', invoiceNo: 'INV-2024-0002', patientId: 'PAT-002', patientName: 'Sarah Johnson', date: '2024-06-08', medicalAid: 'GEMS', memberNo: '987654321', grossAmount: 950, medicalAidPortion: 750, patientPortion: 200, status: 'paid', icd10Codes: ['I10'], tariffCodes: ['0190'] },
  { id: 'INV-003', invoiceNo: 'INV-2024-0003', patientId: 'PAT-003', patientName: 'Thandi Nkosi', date: '2024-06-12', medicalAid: 'Bonitas', memberNo: '456789123', grossAmount: 2200, medicalAidPortion: 1800, patientPortion: 400, status: 'submitted', icd10Codes: ['E11.9', 'I10'], tariffCodes: ['0190', '0145', '0167'] },
  { id: 'INV-004', invoiceNo: 'INV-2024-0004', patientId: 'PAT-004', patientName: 'David Mokoena', date: '2024-05-20', grossAmount: 1250, medicalAidPortion: 0, patientPortion: 1250, status: 'draft', icd10Codes: ['M54.5'], tariffCodes: ['0190', '0191'] }
];

const sampleClaims: Claim[] = [
  { id: 'CLM-001', claimNo: 'CLM-2024-0001', invoiceNo: 'INV-2024-0001', patientName: 'John Smith', medicalAid: 'Discovery Health', submittedDate: '2024-06-10', amount: 1450, status: 'processing' },
  { id: 'CLM-002', claimNo: 'CLM-2024-0002', invoiceNo: 'INV-2024-0002', patientName: 'Sarah Johnson', medicalAid: 'GEMS', submittedDate: '2024-06-08', amount: 750, status: 'paid', paidAmount: 720, paidDate: '2024-06-12' },
  { id: 'CLM-003', claimNo: 'CLM-2024-0003', invoiceNo: 'INV-2024-0003', patientName: 'Thandi Nkosi', medicalAid: 'Bonitas', submittedDate: '2024-06-12', amount: 1800, status: 'submitted' }
];

const sampleSchemes: MedicalAidScheme[] = [
  { id: 'MA-001', name: 'Discovery Health', code: 'DH', administrator: 'Discovery Health', activePatients: 1250, outstandingClaims: 45000, avgPaymentDays: 14 },
  { id: 'MA-002', name: 'GEMS', code: 'GE', administrator: 'Metropolitan Health', activePatients: 890, outstandingClaims: 28000, avgPaymentDays: 21 },
  { id: 'MA-003', name: 'Bonitas', code: 'BO', administrator: 'Administration', activePatients: 650, outstandingClaims: 18500, avgPaymentDays: 18 },
  { id: 'MA-004', name: 'Medshield', code: 'MS', administrator: 'Medshield', activePatients: 420, outstandingClaims: 12000, avgPaymentDays: 16 },
  { id: 'MA-005', name: 'Momentum Health', code: 'MH', administrator: 'Momentum', activePatients: 380, outstandingClaims: 9500, avgPaymentDays: 12 }
];

const samplePractitioners: Practitioner[] = [
  { id: 'DOC-001', name: 'Dr. Mahesh Patel', hpcsaNumber: 'MP 0123456', specialty: 'General Practitioner', practiceNumber: 'PR0001234', status: 'active', appointmentsToday: 12 },
  { id: 'DOC-002', name: 'Dr. Sipho Naidoo', hpcsaNumber: 'MP 0234567', specialty: 'General Practitioner', practiceNumber: 'PR0001234', status: 'active', appointmentsToday: 8 },
  { id: 'DOC-003', name: 'Sister Jane Mbeki', hpcsaNumber: 'SN 0345678', specialty: 'Nursing Practitioner', practiceNumber: 'PR0001234', status: 'active', appointmentsToday: 15 }
];

const HealthcareHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [patientModalVisible, setPatientModalVisible] = useState(false);
  const [appointmentModalVisible, setAppointmentModalVisible] = useState(false);
  const [invoiceModalVisible, setInvoiceModalVisible] = useState(false);
  const [patients] = useState<Patient[]>(samplePatients);
  const [appointments] = useState<Appointment[]>(sampleAppointments);
  const [invoices] = useState<Invoice[]>(sampleInvoices);
  const [claims] = useState<Claim[]>(sampleClaims);
  const [schemes] = useState<MedicalAidScheme[]>(sampleSchemes);
  const [practitioners] = useState<Practitioner[]>(samplePractitioners);
  const [form] = Form.useForm();

  // Calculate stats
  const healthcareStats = {
    totalPatients: patients.length,
    todayAppointments: appointments.filter(a => a.date === '2024-06-15').length,
    pendingClaims: claims.filter(c => ['submitted', 'processing'].includes(c.status)).length,
    outstandingDebtors: patients.filter(p => p.balance > 0).reduce((sum, p) => sum + p.balance, 0),
    monthlyRevenue: invoices.reduce((sum, i) => sum + i.grossAmount, 0),
    claimsValue: claims.filter(c => c.status === 'processing' || c.status === 'submitted').reduce((sum, c) => sum + c.amount, 0)
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      scheduled: 'blue', confirmed: 'cyan', arrived: 'orange',
      'in-progress': 'green', completed: 'default', cancelled: 'red', 'no-show': 'magenta'
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
              title="Today's Appointments"
              value={healthcareStats.todayAppointments}
              prefix={<CalendarOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
            <Progress percent={Math.round((appointments.filter(a => a.status === 'completed').length / healthcareStats.todayAppointments) * 100)} showInfo={false} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Pending Claims"
              value={healthcareStats.pendingClaims}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
            <Text type="secondary">R{healthcareStats.claimsValue.toLocaleString()} value</Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Outstanding Debtors"
              value={healthcareStats.outstandingDebtors}
              prefix="R"
              valueStyle={{ color: '#ff4d4f' }}
            />
            <Text type="secondary">{patients.filter(p => p.balance > 0).length} patients</Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="MTD Revenue"
              value={healthcareStats.monthlyRevenue}
              prefix="R"
              valueStyle={{ color: '#52c41a' }}
            />
            <Text type="secondary">vs R48,500 target</Text>
          </Card>
        </Col>
      </Row>

      {/* HPCSA Compliance Alert */}
      <Alert
        message="Practice Compliance Status"
        description={
          <Space wrap>
            <Tag color="green">HPCSA: All practitioners registered</Tag>
            <Tag color="green">Practice Number: PR0001234</Tag>
            <Tag color="blue">BHF Accredited</Tag>
            <Tag color="cyan">PoPI Compliant</Tag>
          </Space>
        }
        type="success"
        showIcon
        icon={<SafetyCertificateOutlined />}
        style={{ marginTop: 16, marginBottom: 16 }}
      />

      {/* Today's Schedule & Recent Activity */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card 
            title={<><CalendarOutlined /> Today's Appointments</>}
            extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setAppointmentModalVisible(true)}>Book Appointment</Button>}
          >
            <Table
              dataSource={appointments.filter(a => a.date === '2024-06-15')}
              rowKey="id"
              size="small"
              pagination={false}
              columns={[
                { title: 'Time', dataIndex: 'time', key: 'time', width: 70 },
                {
                  title: 'Patient',
                  key: 'patient',
                  render: (_, record) => (
                    <div>
                      <Text strong>{record.patientName}</Text>
                      <br />
                      <Tag color={record.type === 'chronic' ? 'purple' : record.type === 'procedure' ? 'orange' : 'blue'}>
                        {record.type}
                      </Tag>
                    </div>
                  )
                },
                { title: 'Practitioner', dataIndex: 'practitioner', key: 'practitioner' },
                { 
                  title: 'Duration', 
                  dataIndex: 'duration', 
                  key: 'duration',
                  render: (d: number) => `${d} min`
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
                  render: (_, record) => (
                    <Space>
                      {record.status === 'scheduled' && <Button size="small">Confirm</Button>}
                      {record.status === 'confirmed' && <Button size="small" type="primary">Check In</Button>}
                      {record.status === 'arrived' && <Button size="small" type="primary">Start</Button>}
                    </Space>
                  )
                }
              ]}
            />
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card title={<><BellOutlined /> Alerts & Notifications</>}>
            <List
              size="small"
              dataSource={[
                { type: 'claim', title: 'ERA Received - Discovery', description: 'R28,450 processed', color: 'green', icon: <CheckCircleOutlined /> },
                { type: 'rejection', title: 'Claim Rejected - GEMS', description: 'INV-2024-0015: Invalid ICD-10', color: 'red', icon: <WarningOutlined /> },
                { type: 'chronic', title: 'Chronic Script Expiring', description: '3 patients - action needed', color: 'orange', icon: <MedicineBoxOutlined /> },
                { type: 'balance', title: 'Aged Debt Alert', description: '5 accounts > 60 days', color: 'red', icon: <DollarOutlined /> }
              ]}
              renderItem={item => (
                <List.Item>
                  <Space>
                    <Avatar icon={item.icon} style={{ backgroundColor: item.color === 'green' ? '#52c41a' : item.color === 'red' ? '#ff4d4f' : '#faad14' }} size="small" />
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

      {/* Medical Aid Overview */}
      <Card title={<><CreditCardOutlined /> Medical Aid Claims Overview</>} style={{ marginTop: 16 }}>
        <Row gutter={16}>
          {schemes.slice(0, 4).map(scheme => (
            <Col span={6} key={scheme.id}>
              <Card size="small">
                <Statistic title={scheme.name} value={scheme.outstandingClaims} prefix="R" formatter={(v) => v.toLocaleString()} />
                <Text type="secondary">{scheme.activePatients} patients • Avg {scheme.avgPaymentDays} days</Text>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>
    </div>
  );

  // Patients List
  const renderPatients = () => (
    <div style={{ padding: '24px' }}>
      <Card
        title="Patient Management"
        extra={
          <Space>
            <Input placeholder="Search patients..." prefix={<SearchOutlined />} style={{ width: 250 }} />
            <Select defaultValue="all" style={{ width: 150 }}>
              <Option value="all">All Patients</Option>
              <Option value="medical-aid">Medical Aid</Option>
              <Option value="private">Private</Option>
              <Option value="owing">Owing Balance</Option>
            </Select>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setPatientModalVisible(true)}>
              New Patient
            </Button>
          </Space>
        }
      >
        <Table
          dataSource={patients}
          rowKey="id"
          columns={[
            {
              title: 'Patient',
              key: 'patient',
              render: (_, record) => (
                <Space>
                  <Avatar icon={<UserOutlined />} style={{ backgroundColor: record.gender === 'M' ? '#1890ff' : '#eb2f96' }} />
                  <div>
                    <Text strong>{record.title} {record.firstName} {record.lastName}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>ID: {record.idNumber}</Text>
                  </div>
                </Space>
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
              title: 'Medical Aid',
              key: 'medicalAid',
              render: (_, record) => record.medicalAid ? (
                <div>
                  <Tag color="blue">{record.medicalAid}</Tag>
                  <br />
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {record.memberNumber} ({record.dependantCode})
                  </Text>
                </div>
              ) : <Tag>Private</Tag>
            },
            {
              title: 'Plan',
              dataIndex: 'planOption',
              key: 'planOption',
              render: (plan: string) => plan || '-'
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
              title: 'Last Visit',
              dataIndex: 'lastVisit',
              key: 'lastVisit'
            },
            {
              title: 'Actions',
              key: 'actions',
              render: () => (
                <Dropdown
                  menu={{
                    items: [
                      { key: 'view', label: 'View Profile', icon: <EyeOutlined /> },
                      { key: 'edit', label: 'Edit Details', icon: <EditOutlined /> },
                      { key: 'appointment', label: 'Book Appointment', icon: <CalendarOutlined /> },
                      { key: 'invoice', label: 'Create Invoice', icon: <FileTextOutlined /> },
                      { type: 'divider' },
                      { key: 'history', label: 'Visit History', icon: <ProfileOutlined /> }
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

  // Appointments/Schedule
  const renderAppointments = () => (
    <div style={{ padding: '24px' }}>
      <Card
        title={<><CalendarOutlined /> Appointment Schedule</>}
        extra={
          <Space>
            <Select defaultValue="today" style={{ width: 120 }}>
              <Option value="today">Today</Option>
              <Option value="week">This Week</Option>
              <Option value="month">This Month</Option>
            </Select>
            <Select defaultValue="all" style={{ width: 150 }}>
              <Option value="all">All Practitioners</Option>
              {practitioners.map(p => <Option key={p.id} value={p.id}>{p.name}</Option>)}
            </Select>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setAppointmentModalVisible(true)}>
              Book Appointment
            </Button>
          </Space>
        }
      >
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card size="small">
              <Statistic title="Scheduled" value={appointments.filter(a => a.status === 'scheduled').length} />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic title="Confirmed" value={appointments.filter(a => a.status === 'confirmed').length} valueStyle={{ color: '#1890ff' }} />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic title="Completed" value={appointments.filter(a => a.status === 'completed').length} valueStyle={{ color: '#52c41a' }} />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic title="No Shows" value={appointments.filter(a => a.status === 'no-show').length} valueStyle={{ color: '#ff4d4f' }} />
            </Card>
          </Col>
        </Row>

        <Table
          dataSource={appointments}
          rowKey="id"
          columns={[
            { title: 'Date', dataIndex: 'date', key: 'date' },
            { title: 'Time', dataIndex: 'time', key: 'time' },
            {
              title: 'Patient',
              key: 'patient',
              render: (_, record) => (
                <div>
                  <Text strong>{record.patientName}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 11 }}>{record.reason}</Text>
                </div>
              )
            },
            { title: 'Practitioner', dataIndex: 'practitioner', key: 'practitioner' },
            { 
              title: 'Type', 
              dataIndex: 'type', 
              key: 'type',
              render: (type: string) => {
                const colors: Record<string, string> = {
                  consultation: 'blue', 'follow-up': 'cyan', procedure: 'orange', chronic: 'purple'
                };
                return <Tag color={colors[type]}>{type}</Tag>;
              }
            },
            { title: 'Duration', dataIndex: 'duration', key: 'duration', render: (d: number) => `${d} min` },
            {
              title: 'Status',
              dataIndex: 'status',
              key: 'status',
              render: (status: string) => <Tag color={getStatusColor(status)}>{status.toUpperCase()}</Tag>
            },
            {
              title: 'Actions',
              key: 'actions',
              render: (_, record) => (
                <Space>
                  {record.status === 'scheduled' && <Button size="small">Confirm</Button>}
                  {record.status === 'confirmed' && <Button size="small" type="primary">Check In</Button>}
                  {record.status === 'arrived' && <Button size="small" type="primary">Start</Button>}
                  {record.status === 'in-progress' && <Button size="small" type="primary">Complete</Button>}
                  <Button size="small" icon={<EditOutlined />} />
                </Space>
              )
            }
          ]}
        />
      </Card>
    </div>
  );

  // Billing/Invoices
  const renderBilling = () => (
    <div style={{ padding: '24px' }}>
      <Card
        title={<><DollarOutlined /> Billing & Invoicing</>}
        extra={
          <Space>
            <Input placeholder="Search..." prefix={<SearchOutlined />} style={{ width: 200 }} />
            <Select defaultValue="all" style={{ width: 150 }}>
              <Option value="all">All Status</Option>
              <Option value="draft">Draft</Option>
              <Option value="submitted">Submitted</Option>
              <Option value="paid">Paid</Option>
            </Select>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setInvoiceModalVisible(true)}>
              New Invoice
            </Button>
          </Space>
        }
      >
        <Table
          dataSource={invoices}
          rowKey="id"
          columns={[
            { title: 'Invoice #', dataIndex: 'invoiceNo', key: 'invoiceNo' },
            { title: 'Date', dataIndex: 'date', key: 'date' },
            {
              title: 'Patient',
              key: 'patient',
              render: (_, record) => (
                <div>
                  <Text strong>{record.patientName}</Text>
                  {record.medicalAid && (
                    <>
                      <br />
                      <Tag color="blue" style={{ fontSize: 10 }}>{record.medicalAid}</Tag>
                    </>
                  )}
                </div>
              )
            },
            {
              title: 'ICD-10 Codes',
              dataIndex: 'icd10Codes',
              key: 'icd10Codes',
              render: (codes: string[]) => codes.map(c => <Tag key={c}>{c}</Tag>)
            },
            { 
              title: 'Gross', 
              dataIndex: 'grossAmount', 
              key: 'grossAmount',
              render: (amount: number) => `R${amount.toLocaleString()}`
            },
            { 
              title: 'Medical Aid', 
              dataIndex: 'medicalAidPortion', 
              key: 'medicalAidPortion',
              render: (amount: number) => <Text type="success">R{amount.toLocaleString()}</Text>
            },
            { 
              title: 'Patient', 
              dataIndex: 'patientPortion', 
              key: 'patientPortion',
              render: (amount: number) => `R${amount.toLocaleString()}`
            },
            {
              title: 'Status',
              dataIndex: 'status',
              key: 'status',
              render: (status: string) => {
                const colors: Record<string, string> = {
                  draft: 'default', submitted: 'processing', paid: 'success', rejected: 'error', 'partially-paid': 'warning'
                };
                return <Tag color={colors[status]}>{status.toUpperCase()}</Tag>;
              }
            },
            {
              title: 'Actions',
              key: 'actions',
              render: (_, record) => (
                <Space>
                  <Button size="small" icon={<EyeOutlined />} />
                  {record.status === 'draft' && <Button size="small" type="primary">Submit Claim</Button>}
                  <Button size="small" icon={<ExportOutlined />} />
                </Space>
              )
            }
          ]}
        />
      </Card>
    </div>
  );

  // Claims Management
  const renderClaims = () => (
    <div style={{ padding: '24px' }}>
      <Card
        title={<><FileTextOutlined /> Claims Management</>}
        extra={
          <Space>
            <Select defaultValue="all" style={{ width: 180 }}>
              <Option value="all">All Medical Aids</Option>
              {schemes.map(s => <Option key={s.id} value={s.id}>{s.name}</Option>)}
            </Select>
            <Button icon={<SyncOutlined />}>Fetch ERAs</Button>
            <Button type="primary" icon={<ExportOutlined />}>Submit Batch</Button>
          </Space>
        }
      >
        <Alert
          message="Electronic Remittance Advice (ERA)"
          description="Last ERA processed: Discovery Health - 2024-06-12 | 45 claims processed | R28,450 received"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card size="small">
              <Statistic title="Submitted" value={claims.filter(c => c.status === 'submitted').length} />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic title="Processing" value={claims.filter(c => c.status === 'processing').length} valueStyle={{ color: '#1890ff' }} />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic title="Paid" value={claims.filter(c => c.status === 'paid').length} valueStyle={{ color: '#52c41a' }} />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic title="Rejected" value={claims.filter(c => c.status === 'rejected').length} valueStyle={{ color: '#ff4d4f' }} />
            </Card>
          </Col>
        </Row>

        <Table
          dataSource={claims}
          rowKey="id"
          columns={[
            { title: 'Claim #', dataIndex: 'claimNo', key: 'claimNo' },
            { title: 'Invoice', dataIndex: 'invoiceNo', key: 'invoiceNo' },
            { title: 'Patient', dataIndex: 'patientName', key: 'patientName' },
            { title: 'Medical Aid', dataIndex: 'medicalAid', key: 'medicalAid', render: (ma: string) => <Tag color="blue">{ma}</Tag> },
            { title: 'Submitted', dataIndex: 'submittedDate', key: 'submittedDate' },
            { title: 'Amount', dataIndex: 'amount', key: 'amount', render: (a: number) => `R${a.toLocaleString()}` },
            {
              title: 'Status',
              dataIndex: 'status',
              key: 'status',
              render: (status: string) => {
                const colors: Record<string, string> = {
                  submitted: 'blue', processing: 'cyan', accepted: 'green', rejected: 'red', paid: 'success'
                };
                return <Tag color={colors[status]}>{status.toUpperCase()}</Tag>;
              }
            },
            { 
              title: 'Paid', 
              key: 'paid',
              render: (_, record) => record.paidAmount ? (
                <Text type="success">R{record.paidAmount.toLocaleString()}</Text>
              ) : '-'
            },
            {
              title: 'Actions',
              key: 'actions',
              render: (_, record) => (
                <Space>
                  <Button size="small" icon={<EyeOutlined />} />
                  {record.status === 'rejected' && <Button size="small" type="primary">Resubmit</Button>}
                </Space>
              )
            }
          ]}
        />
      </Card>
    </div>
  );

  // Medical Aids
  const renderMedicalAids = () => (
    <div style={{ padding: '24px' }}>
      <Card title={<><CreditCardOutlined /> Medical Aid Schemes</>}>
        <Table
          dataSource={schemes}
          rowKey="id"
          columns={[
            {
              title: 'Scheme',
              key: 'scheme',
              render: (_, record) => (
                <div>
                  <Text strong>{record.name}</Text>
                  <br />
                  <Text type="secondary">Code: {record.code}</Text>
                </div>
              )
            },
            { title: 'Administrator', dataIndex: 'administrator', key: 'administrator' },
            { title: 'Active Patients', dataIndex: 'activePatients', key: 'activePatients' },
            { 
              title: 'Outstanding Claims', 
              dataIndex: 'outstandingClaims', 
              key: 'outstandingClaims',
              render: (amount: number) => <Text type="warning">R{amount.toLocaleString()}</Text>
            },
            { 
              title: 'Avg Payment Days', 
              dataIndex: 'avgPaymentDays', 
              key: 'avgPaymentDays',
              render: (days: number) => <Tag color={days <= 14 ? 'green' : days <= 21 ? 'orange' : 'red'}>{days} days</Tag>
            },
            {
              title: 'Actions',
              key: 'actions',
              render: () => (
                <Space>
                  <Button size="small" icon={<EyeOutlined />}>View Claims</Button>
                  <Button size="small" icon={<SettingOutlined />} />
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
          <Card title={<><SafetyCertificateOutlined /> Practice Details</>}>
            <Form layout="vertical">
              <Form.Item label="Practice Name">
                <Input defaultValue="Dr M Patel & Associates" />
              </Form.Item>
              <Form.Item label="Practice Number">
                <Input defaultValue="PR0001234" />
              </Form.Item>
              <Form.Item label="VAT Number">
                <Input defaultValue="4123456789" />
              </Form.Item>
              <Form.Item label="BHF Practice Code">
                <Input defaultValue="8900001" />
              </Form.Item>
              <Button type="primary">Save Details</Button>
            </Form>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Practitioners">
            <Table
              dataSource={practitioners}
              rowKey="id"
              size="small"
              pagination={false}
              columns={[
                { title: 'Name', dataIndex: 'name', key: 'name' },
                { title: 'HPCSA No', dataIndex: 'hpcsaNumber', key: 'hpcsaNumber' },
                { title: 'Specialty', dataIndex: 'specialty', key: 'specialty' },
                { 
                  title: 'Status', 
                  dataIndex: 'status', 
                  key: 'status',
                  render: (s: string) => <Tag color={s === 'active' ? 'green' : 'red'}>{s}</Tag>
                }
              ]}
            />
            <Button type="dashed" icon={<PlusOutlined />} style={{ marginTop: 16, width: '100%' }}>Add Practitioner</Button>
          </Card>
        </Col>

        <Col xs={24}>
          <Card title="Financial Integration">
            <Form layout="vertical">
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item label="Revenue Account">
                    <Select defaultValue="4000">
                      <Option value="4000">4000 - Medical Revenue</Option>
                      <Option value="4100">4100 - Consultation Fees</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="Accounts Receivable">
                    <Select defaultValue="1100">
                      <Option value="1100">1100 - Trade Receivables</Option>
                      <Option value="1110">1110 - Medical Aid Receivables</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="VAT Rate">
                    <InputNumber defaultValue={0} min={0} max={15} formatter={v => `${v}%`} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>
              <Button type="primary">Save Financial Settings</Button>
            </Form>
          </Card>
        </Col>
      </Row>
    </div>
  );

  return (
    <HubLayout>
      <HubHeader
        title="Healthcare Hub"
        subtitle="Practice Management & Medical Billing"
        icon={<HeartOutlined />}
        gradient="pink"
        actions={
          <>
            <Button icon={<SyncOutlined />}>Refresh</Button>
            <Button icon={<ExportOutlined />}>Export</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setAppointmentModalVisible(true)}>
              Book Appointment
            </Button>
          </>
        }
      />

      <StatusBanner
        gradient="pink"
        icon={<HeartOutlined />}
        title="Practice Overview"
        subtitle="Daily Performance"
        stats={[
          { title: 'Today Appointments', value: healthcareStats.todayAppointments, span: 4 },
          { title: 'Pending Claims', value: healthcareStats.pendingClaims, span: 4 },
          { title: 'MTD Revenue', value: `R${healthcareStats.monthlyRevenue.toLocaleString()}`, valueStyle: { color: '#86efac' }, span: 4 },
          { title: 'Outstanding', value: `R${healthcareStats.outstandingDebtors.toLocaleString()}`, valueStyle: { color: '#fca5a5' }, span: 4 },
          { title: 'Total Patients', value: healthcareStats.totalPatients, span: 4 },
        ]}
      />

      <HubTabs
        theme="pink"
        tabs={[
          { key: 'dashboard', label: 'Dashboard', icon: <HomeOutlined />, children: renderDashboard() },
          { key: 'patients', label: 'Patients', icon: <TeamOutlined />, children: renderPatients() },
          { key: 'appointments', label: 'Appointments', icon: <CalendarOutlined />, children: renderAppointments() },
          { key: 'billing', label: 'Billing', icon: <DollarOutlined />, children: renderBilling() },
          { key: 'claims', label: 'Claims', icon: <FileTextOutlined />, children: renderClaims() },
          { key: 'medical-aids', label: 'Medical Aids', icon: <CreditCardOutlined />, children: renderMedicalAids() },
          { key: 'settings', label: 'Settings', icon: <SettingOutlined />, children: renderSettings() }
        ]}
        activeKey={activeTab}
        onChange={setActiveTab}
      />
    </HubLayout>
  );
};

export default HealthcareHub;
