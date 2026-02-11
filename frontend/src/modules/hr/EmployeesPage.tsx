import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Input,
  Select,
  Modal,
  Form,
  Row,
  Col,
  DatePicker,
  InputNumber,
  message,
  Typography,
  Statistic,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ReloadOutlined,
  TeamOutlined,
  DollarOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { hrService } from '../../services/hr.service';
import type { Employee, Department, Position } from '../../services/hr.service';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const EmployeesPage: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchEmployees();
    fetchDepartments();
    fetchPositions();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const response = await hrService.getEmployees({ limit: 500 });
      const data = response.data || [];
      setEmployees(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Error fetching employees:', err);
      message.error(err.response?.data?.message || 'Failed to load employees');
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await hrService.getDepartments();
      const data = response.data || [];
      setDepartments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching departments:', err);
    }
  };

  const fetchPositions = async () => {
    try {
      const response = await hrService.getPositions();
      const data = response.data || [];
      setPositions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching positions:', err);
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      'Active': 'green',
      'ACTIVE': 'green',
      'Probation': 'blue',
      'PROBATION': 'blue',
      'On Leave': 'orange',
      'NOTICE': 'orange',
      'Suspended': 'red',
      'SUSPENDED': 'red',
      'Terminated': 'default',
      'TERMINATED': 'default',
    };
    return colors[status] || 'default';
  };

  // ── Modal Handlers ──────────────────────────────────────────────────────

  const handleAdd = () => {
    setEditingEmployee(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    form.setFieldsValue({
      ...employee,
      hire_date: employee.hire_date ? dayjs(employee.hire_date) : undefined,
    });
    setModalVisible(true);
  };

  const handleDelete = async (employee: Employee) => {
    const confirmed = window.confirm(
      `Are you sure you want to terminate ${employee.first_name} ${employee.last_name}? This will set their status to Terminated.`
    );
    if (!confirmed) return;

    try {
      await hrService.deleteEmployee(employee.employee_id);
      message.success(`${employee.first_name} ${employee.last_name} has been terminated`);
      fetchEmployees();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to delete employee');
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      const payload = {
        ...values,
        hire_date: values.hire_date ? values.hire_date.format('YYYY-MM-DD') : undefined,
      };

      if (editingEmployee) {
        await hrService.updateEmployee(editingEmployee.employee_id, payload);
        message.success('Employee updated successfully');
      } else {
        await hrService.createEmployee(payload);
        message.success('Employee created successfully');
      }

      setModalVisible(false);
      form.resetFields();
      setEditingEmployee(null);
      fetchEmployees();
    } catch (err: any) {
      if (err.errorFields) return; // validation error, antd handles display
      message.error(err.response?.data?.message || 'Failed to save employee');
    } finally {
      setSaving(false);
    }
  };

  const handleModalCancel = () => {
    setModalVisible(false);
    form.resetFields();
    setEditingEmployee(null);
  };

  // ── Filtering ───────────────────────────────────────────────────────────

  const filteredEmployees = employees.filter(emp => {
    const name = `${emp.first_name || ''} ${emp.last_name || ''}`.toLowerCase();
    const number = (emp.employee_number || '').toLowerCase();
    const email = (emp.email || '').toLowerCase();
    const search = searchTerm.toLowerCase();

    const matchesSearch = name.includes(search) || number.includes(search) || email.includes(search);
    const matchesFilter = filterStatus === 'ALL' || (emp.employment_status || '').toUpperCase() === filterStatus;

    return matchesSearch && matchesFilter;
  });

  const totalEmployees = employees.length;
  const activeEmployees = employees.filter(e => (e.employment_status || '').toLowerCase() === 'active').length;
  const totalPayroll = employees
    .filter(e => (e.employment_status || '').toLowerCase() === 'active')
    .reduce((sum, e) => sum + (e.basic_salary || 0), 0);
  const deptCount = new Set(employees.map(e => e.department_name || e.department_id).filter(Boolean)).size;

  // ── Table Columns ───────────────────────────────────────────────────────

  const columns = [
    {
      title: 'Employee #',
      dataIndex: 'employee_number',
      key: 'employee_number',
      width: 120,
      render: (text: string) => <Text code>{text}</Text>,
    },
    {
      title: 'Name',
      key: 'name',
      render: (_: any, record: Employee) => (
        <div>
          <Text strong>{record.first_name} {record.last_name}</Text>
          {record.email && <div><Text type="secondary" style={{ fontSize: 12 }}>{record.email}</Text></div>}
        </div>
      ),
    },
    {
      title: 'Department',
      dataIndex: 'department_name',
      key: 'department_name',
      render: (text: string) => text || '-',
    },
    {
      title: 'Position',
      key: 'position',
      render: (_: any, record: Employee) => record.position_title || record.position || '-',
    },
    {
      title: 'Status',
      dataIndex: 'employment_status',
      key: 'employment_status',
      width: 120,
      render: (status: string) => (
        <Tag color={getStatusColor(status || '')}>{status || 'Unknown'}</Tag>
      ),
    },
    {
      title: 'Basic Salary',
      dataIndex: 'basic_salary',
      key: 'basic_salary',
      width: 140,
      align: 'right' as const,
      render: (val: number) => formatCurrency(val),
    },
    {
      title: 'Hire Date',
      dataIndex: 'hire_date',
      key: 'hire_date',
      width: 120,
      render: (date: string) => date ? new Date(date).toLocaleDateString('en-ZA') : '-',
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_: any, record: Employee) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
          />
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={3} style={{ margin: 0 }}>Employee Management</Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchEmployees}>Refresh</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            Add Employee
          </Button>
        </Space>
      </div>

      {/* Summary Stats */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic title="Total Employees" value={totalEmployees} prefix={<TeamOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="Active" value={activeEmployees} prefix={<UserOutlined />} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="Monthly Payroll" value={totalPayroll} prefix="R" precision={0} valueStyle={{ color: '#1890ff' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="Departments" value={deptCount} prefix={<DollarOutlined />} />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space size="middle">
          <Input
            placeholder="Search by name, number, or email..."
            prefix={<SearchOutlined />}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ width: 300 }}
            allowClear
          />
          <Select value={filterStatus} onChange={setFilterStatus} style={{ width: 150 }}>
            <Select.Option value="ALL">All Statuses</Select.Option>
            <Select.Option value="ACTIVE">Active</Select.Option>
            <Select.Option value="PROBATION">Probation</Select.Option>
            <Select.Option value="ON LEAVE">On Leave</Select.Option>
            <Select.Option value="TERMINATED">Terminated</Select.Option>
          </Select>
        </Space>
      </Card>

      {/* Employee Table */}
      <Card>
        <Table
          dataSource={filteredEmployees}
          columns={columns}
          rowKey={(r) => r.employee_id || r.employee_number}
          loading={loading}
          pagination={{ pageSize: 15, showSizeChanger: true, showTotal: (total) => `${total} employees` }}
          size="middle"
        />
      </Card>

      {/* Create/Edit Employee Modal */}
      <Modal
        title={editingEmployee ? 'Edit Employee' : 'Add New Employee'}
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        confirmLoading={saving}
        width={700}
        okText={editingEmployee ? 'Update' : 'Create'}
      >
        <Form form={form} layout="vertical" autoComplete="off">
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="employee_number"
                label="Employee Number"
                rules={[{ required: true, message: 'Required' }]}
              >
                <Input placeholder="e.g. EMP001" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="first_name"
                label="First Name"
                rules={[{ required: true, message: 'Required' }]}
              >
                <Input placeholder="First name" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="last_name"
                label="Last Name"
                rules={[{ required: true, message: 'Required' }]}
              >
                <Input placeholder="Last name" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="id_number" label="SA ID Number">
                <Input placeholder="13-digit ID" maxLength={13} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="email" label="Email">
                <Input placeholder="email@example.com" type="email" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="phone_mobile" label="Mobile Phone">
                <Input placeholder="072 000 0000" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="department_id" label="Department">
                <Select placeholder="Select department" allowClear>
                  {departments.map(d => (
                    <Select.Option key={d.department_id} value={d.department_id}>
                      {d.department_name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="position_id" label="Position">
                <Select placeholder="Select position" allowClear>
                  {positions.map(p => (
                    <Select.Option key={p.position_id} value={p.position_id}>
                      {p.position_title}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="hire_date"
                label="Hire Date"
                rules={[{ required: true, message: 'Required' }]}
              >
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="basic_salary" label="Basic Salary (ZAR)">
                <InputNumber
                  prefix="R"
                  style={{ width: '100%' }}
                  min={0}
                  step={500}
                  formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={value => value!.replace(/,/g, '') as any}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="employment_status" label="Status" initialValue="Active">
                <Select>
                  <Select.Option value="Active">Active</Select.Option>
                  <Select.Option value="Probation">Probation</Select.Option>
                  <Select.Option value="On Leave">On Leave</Select.Option>
                  <Select.Option value="Suspended">Suspended</Select.Option>
                  <Select.Option value="Terminated">Terminated</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="tax_number" label="SARS Tax Number">
                <Input placeholder="10-digit number" maxLength={10} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default EmployeesPage;
