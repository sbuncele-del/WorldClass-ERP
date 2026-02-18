import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Typography,
  Tag,
  Progress,
  Statistic,
  Table,
  Tabs,
  Badge,
  Space,
  Avatar,
  Timeline,
  Tooltip,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  message,
  Divider,
  List,
  Alert,
  Steps,
  Collapse,
  Spin,
  Empty,
} from 'antd';
import {
  TeamOutlined,
  UserOutlined,
  UserAddOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  DollarOutlined,
  PlusOutlined,
  HeartOutlined,
  SmileOutlined,
  TrophyOutlined,
  GiftOutlined,
  SettingOutlined,
  BellOutlined,
  LineChartOutlined,
  SafetyCertificateOutlined,
  RiseOutlined,
  FallOutlined,
  IdcardOutlined,
  BankOutlined,
  AuditOutlined,
  FileDoneOutlined,
  SendOutlined,
  SyncOutlined,
  WarningOutlined,
  FileSearchOutlined,
  CalculatorOutlined,
  CloudUploadOutlined,
  LinkOutlined,
  DownloadOutlined,
  PrinterOutlined,
  MailOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import { hrService } from '../../services/hr.service';
import type { HRStats, Employee, Department, LeaveType, LeaveRequest } from '../../services/hr.service';
import './HRHub.css';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;
const { Panel } = Collapse;

// Types for state
interface HRStatsState {
  totalEmployees: number;
  activeEmployees: number;
  onLeave: number;
  openPositions: number;
  newHires: number;
  turnoverRate: number;
  avgTenure: number;
  grossPayroll: number;
  netPayroll: number;
  payeDeducted: number;
  uifDeducted: number;
  sdlPayable: number;
  irp5Generated: number;
  irp5Pending: number;
  emp201Status: string;
  emp501Status: string;
}

interface EmployeeRecord {
  id: string;
  name: string;
  idNumber: string;
  taxNumber: string;
  position: string;
  department: string;
  startDate: string;
  status: string;
  taxStatus: string;
}

interface LeaveRequestRecord extends LeaveRequest {
  key: string;
  employee_name: string;
}

interface StatutoryDeductionRow {
  name: string;
  rate: string;
  ytdAmount: number;
  currentMonth: number;
  status: string;
}

// Default compliance calendar (these typically don't come from API)
const defaultComplianceCalendar = [
  { 
    type: 'EMP201', 
    description: 'Monthly PAYE Reconciliation', 
    dueDate: '2025-12-07', 
    period: 'November 2025',
    status: 'submitted',
    submittedDate: '2025-12-05',
    amount: 0,
  },
  { 
    type: 'EMP201', 
    description: 'Monthly PAYE Reconciliation', 
    dueDate: '2026-01-07', 
    period: 'December 2025',
    status: 'preparing',
    amount: 0,
  },
];

// Default payroll runs
const defaultPayrollRuns = [
  {
    id: 'PR-2025-12',
    period: 'December 2025',
    runDate: '2025-12-25',
    status: 'processing',
    employees: 0,
    grossPay: 0,
    paye: 0,
    uif: 0,
    sdl: 0,
    pension: 0,
    medical: 0,
    netPay: 0,
    payslipsGenerated: 0,
  },
];

// Default tax certificates
const defaultTaxCertificates = [
  { type: 'IRP5', description: 'Employee Tax Certificate', generated: 0, pending: 0, total: 0 },
  { type: 'IT3(a)', description: 'Interest Certificate', generated: 0, pending: 0, total: 0 },
];

// Leave balances (policy data, not from API)
const leaveTypes = [
  { type: 'Annual Leave', statutory: '15 days min', companyPolicy: '21 days', carryOver: '5 days max' },
  { type: 'Sick Leave', statutory: '30 days / 3 years', companyPolicy: '30 days cycle', carryOver: 'No' },
  { type: 'Family Responsibility', statutory: '3 days', companyPolicy: '5 days', carryOver: 'No' },
  { type: 'Maternity Leave', statutory: '4 months', companyPolicy: '4 months', carryOver: 'N/A' },
  { type: 'Paternity Leave', statutory: '10 days', companyPolicy: '10 days', carryOver: 'No' },
];

const HRHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [showPayrollModal, setShowPayrollModal] = useState(false);
  const [showEMP201Modal, setShowEMP201Modal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [processingPayroll, setProcessingPayroll] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  // API State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hrStats, setHrStats] = useState<HRStatsState>({
    totalEmployees: 0,
    activeEmployees: 0,
    onLeave: 0,
    openPositions: 0,
    newHires: 0,
    turnoverRate: 0,
    avgTenure: 0,
    grossPayroll: 0,
    netPayroll: 0,
    payeDeducted: 0,
    uifDeducted: 0,
    sdlPayable: 0,
    irp5Generated: 0,
    irp5Pending: 0,
    emp201Status: 'preparing',
    emp501Status: 'not-due',
  });
  const [recentEmployees, setRecentEmployees] = useState<EmployeeRecord[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [complianceCalendar, setComplianceCalendar] = useState(defaultComplianceCalendar);
  const [payrollRuns, setPayrollRuns] = useState(defaultPayrollRuns);
  const [taxCertificates, setTaxCertificates] = useState(defaultTaxCertificates);
  const [statutoryDeductions, setStatutoryDeductions] = useState<StatutoryDeductionRow[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestRecord[]>([]);
  const [leaveTypeOptions, setLeaveTypeOptions] = useState<LeaveType[]>([]);
  const [payrollPeriods, setPayrollPeriods] = useState<any[]>([]);
  const [selectedComplianceReturn, setSelectedComplianceReturn] = useState<any | null>(null);
  const [submittingToSars, setSubmittingToSars] = useState(false);

  const [addEmployeeForm] = Form.useForm();
  const [payrollForm] = Form.useForm();
  const [leaveForm] = Form.useForm();
  const [payrollSettingsForm] = Form.useForm();
  const [sarsSettingsForm] = Form.useForm();

  const toNumber = (value: unknown): number => Number(value || 0);

  const loadHRData = async (showToast = false) => {
    setLoading(true);
    setError(null);

    try {
      const [
        stats,
        employeesResponse,
        departmentsResponse,
        payrollRunsResponse,
        leaveTypesResponse,
        leaveRequestsResponse,
        payrollPeriodsResponse,
        hrSettingsResponse,
      ] = await Promise.all([
        hrService.getStats(),
        hrService.getEmployees({ limit: 50 }),
        hrService.getDepartments(),
        hrService.getPayrollRuns({ year: new Date().getFullYear() }),
        hrService.getLeaveTypes(),
        hrService.getLeaveRequests(),
        hrService.getPayrollPeriods({ year: new Date().getFullYear() }),
        hrService.getHRModuleSettings().catch(() => ({})),
      ]);

      const totalEmp = parseInt(stats.total_employees) || 0;
      const onLeave = parseInt(stats.on_leave_today) || 0;
      const payroll = parseFloat(stats.payroll_this_month) || 0;

      const employeeRows = employeesResponse?.data || [];
      setRecentEmployees(employeeRows.map((emp: Employee) => ({
        id: String(emp.employee_id || emp.employee_number),
        name: `${emp.first_name} ${emp.last_name}`,
        idNumber: emp.id_number || 'Not provided',
        taxNumber: emp.tax_number || 'Not provided',
        position: emp.position_title || emp.position || 'Employee',
        department: emp.department_name || 'General',
        startDate: emp.hire_date || '',
        status: (emp.employment_status || 'active').toLowerCase(),
        taxStatus: emp.tax_number ? 'registered' : 'pending',
      })));

      setDepartments(departmentsResponse?.data || []);

      const payrollRunRows = payrollRunsResponse?.data || [];
      const mappedPayrollRuns = payrollRunRows.map((run: any) => {
        const gross = toNumber(run.total_gross) || (toNumber(run.total_basic_salary) + toNumber(run.total_allowances));
        const deductions = toNumber(run.total_deductions);
        const paye = toNumber(run.total_paye);
        const uif = toNumber(run.total_uif);
        const sdl = toNumber(run.total_sdl);
        const net = toNumber(run.total_net_pay) || toNumber(run.total_net) || (gross - deductions);
        const remainingDeductions = Math.max(deductions - paye - uif - sdl, 0);
        return {
          id: run.run_number || `PR-${run.run_id}`,
          period: run.period_name || run.payroll_period || `Period ${run.period_id || ''}`,
          runDate: run.run_date,
          status: String(run.status || 'draft').toLowerCase(),
          employees: toNumber(run.total_employees),
          grossPay: gross,
          paye,
          uif,
          sdl,
          pension: remainingDeductions,
          medical: 0,
          netPay: net,
          payslipsGenerated: 0,
          run_id: run.run_id,
        };
      });
      setPayrollRuns(mappedPayrollRuns);

      const latestRun = mappedPayrollRuns[0];
      const grossPayroll = latestRun ? latestRun.grossPay : payroll;
      const netPayroll = latestRun ? latestRun.netPay : (payroll - (payroll * 0.19));
      const payeDue = latestRun ? latestRun.paye : (payroll * 0.18);
      const uifDue = latestRun ? latestRun.uif : (payroll * 0.01);
      const sdlDue = latestRun ? toNumber(latestRun.sdl) : (payroll * 0.01);
      const payrollEmployees = latestRun ? latestRun.employees : totalEmp;

      setHrStats(prev => ({
        ...prev,
        totalEmployees: payrollEmployees,
        activeEmployees: Math.max(totalEmp - onLeave, 0),
        onLeave,
        grossPayroll,
        netPayroll,
        payeDeducted: payeDue,
        uifDeducted: uifDue,
        sdlPayable: sdlDue,
      }));

      setStatutoryDeductions([
        { name: 'PAYE (Pay As You Earn)', rate: '18% - 45%', ytdAmount: payeDue, currentMonth: payeDue, status: payeDue > 0 ? 'calculated' : 'pending' },
        { name: 'UIF (Unemployment Insurance)', rate: '1% (max R177.12)', ytdAmount: uifDue, currentMonth: uifDue, status: uifDue > 0 ? 'calculated' : 'pending' },
        { name: 'SDL (Skills Development)', rate: '1% of payroll', ytdAmount: sdlDue, currentMonth: sdlDue, status: sdlDue > 0 ? 'calculated' : 'pending' },
        { name: 'Pension Fund', rate: '7.5% employee', ytdAmount: latestRun?.pension || 0, currentMonth: latestRun?.pension || 0, status: latestRun?.pension > 0 ? 'calculated' : 'pending' },
        { name: 'Medical Aid', rate: 'Per scheme', ytdAmount: latestRun?.medical || 0, currentMonth: latestRun?.medical || 0, status: latestRun?.medical > 0 ? 'calculated' : 'pending' },
      ]);

      setComplianceCalendar(prev => prev.map((item) =>
        item.status === 'preparing'
          ? { ...item, amount: payeDue + uifDue + sdlDue }
          : item
      ));

      setLeaveTypeOptions(leaveTypesResponse?.data || []);

      const leaveRows = leaveRequestsResponse?.data || [];
      setLeaveRequests(leaveRows.map((request: LeaveRequest) => ({
        ...request,
        key: String(request.request_id),
        employee_name: `${request.first_name || ''} ${request.last_name || ''}`.trim() || request.employee_number || 'Employee',
      })));

      setPayrollPeriods(payrollPeriodsResponse?.data || []);

      setTaxCertificates(prev => prev.map(cert => ({
        ...cert,
        total: totalEmp,
        generated: totalEmp,
        pending: 0,
      })));

      const settings = hrSettingsResponse || {};
      payrollSettingsForm.setFieldsValue({
        taxYear: settings.taxYear || String(new Date().getFullYear()),
        payFrequency: settings.payFrequency || 'monthly',
        uifReference: settings.uifReference || 'U123456789',
        sdlNumber: settings.sdlNumber || 'L987654321',
      });
      sarsSettingsForm.setFieldsValue({
        sarsEmployerReference: settings.sarsEmployerReference || '7123456789',
        easyfileUsername: settings.easyfileUsername || 'employer@company.co.za',
        autoSubmitEmp201: settings.autoSubmitEmp201 || 'manual',
      });

      if (showToast) {
        message.success('HR data refreshed');
      }
    } catch (err) {
      console.error('Failed to fetch HR data:', err);
      const errorMessage = (err as any)?.response?.data?.message || (err as Error)?.message || 'Failed to load HR data';
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHRData();
  }, []);

  const handleRefresh = () => loadHRData(true);

  const handleCreateEmployee = async () => {
    try {
      const values = await addEmployeeForm.validateFields();
      const employeeCount = recentEmployees.length + 1;
      const employeeNumber = `EMP-${String(employeeCount).padStart(3, '0')}-${Date.now().toString().slice(-4)}`;

      await hrService.createEmployee({
        employee_number: employeeNumber,
        first_name: values.first_name,
        last_name: values.last_name,
        id_number: values.id_number,
        tax_number: values.tax_number,
        department_id: values.department_id,
        hire_date: values.hire_date?.format('YYYY-MM-DD'),
        basic_salary: Number(values.basic_salary || 0),
        employment_status: 'Active',
        email: values.email,
      });

      message.success('Employee added successfully');
      setShowAddEmployee(false);
      addEmployeeForm.resetFields();
      await loadHRData();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.message || 'Failed to add employee');
    }
  };

  const handleOpenPayrollModal = () => {
    setShowPayrollModal(true);
  };

  const handleRunPayroll = async () => {
    try {
      const values = await payrollForm.validateFields();
      setProcessingPayroll(true);

      let periodId = values.period_id;
      if (!periodId) {
        const createdPeriod = await hrService.createPayrollPeriod({
          period_name: values.period_name || 'Monthly Payroll',
          period_start_date: values.period_start_date.format('YYYY-MM-DD'),
          period_end_date: values.period_end_date.format('YYYY-MM-DD'),
          payment_date: values.payment_date.format('YYYY-MM-DD'),
          frequency: 'monthly',
        });
        periodId = createdPeriod.period_id || createdPeriod.data?.period_id;
      }

      await hrService.processPayroll(periodId);
      message.success('Payroll run processed successfully');
      setShowPayrollModal(false);
      payrollForm.resetFields();
      await loadHRData();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.message || 'Failed to run payroll');
    } finally {
      setProcessingPayroll(false);
    }
  };

  const handleCreateLeaveRequest = async () => {
    try {
      const values = await leaveForm.validateFields();
      const startDate = values.start_date;
      const endDate = values.end_date;
      const daysRequested = endDate.diff(startDate, 'day') + 1;

      await hrService.createLeaveRequest({
        employee_id: String(values.employee_id),
        leave_type_id: String(values.leave_type_id),
        start_date: startDate.format('YYYY-MM-DD'),
        end_date: endDate.format('YYYY-MM-DD'),
        days_requested: daysRequested,
        reason: values.reason,
      });

      message.success('Leave request submitted');
      setShowLeaveModal(false);
      leaveForm.resetFields();
      await loadHRData();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.message || 'Failed to submit leave request');
    }
  };

  const handleProcessLeaveRequest = async (requestId: string, action: 'Approved' | 'Rejected') => {
    try {
      await hrService.processLeaveRequest(requestId, action);
      message.success(`Leave request ${action.toLowerCase()}`);
      await loadHRData();
    } catch (err: any) {
      message.error(err?.response?.data?.message || `Failed to ${action.toLowerCase()} leave request`);
    }
  };

  const handleSavePayrollSettings = async () => {
    try {
      setSavingSettings(true);
      const values = await payrollSettingsForm.validateFields();
      const existing = await hrService.getHRModuleSettings().catch(() => ({}));
      await hrService.saveHRModuleSettings({ ...existing, ...values });
      message.success('Payroll settings saved');
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Failed to save payroll settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSaveSarsSettings = async () => {
    try {
      setSavingSettings(true);
      const values = await sarsSettingsForm.validateFields();
      const existing = await hrService.getHRModuleSettings().catch(() => ({}));
      await hrService.saveHRModuleSettings({ ...existing, ...values });
      message.success('SARS settings saved');
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Failed to save SARS settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const downloadJson = (filename: string, data: unknown) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getCurrentTaxYearStart = () => {
    const now = new Date();
    return now.getMonth() >= 2 ? now.getFullYear() : now.getFullYear() - 1;
  };

  const handleOpenSarsSentinel = () => {
    window.open('/app/sars-sentinel', '_blank');
  };

  const handleGenerateAllIRP5 = async () => {
    try {
      if (recentEmployees.length === 0) {
        message.warning('No employees available for IRP5 generation');
        return;
      }
      const taxYear = getCurrentTaxYearStart();
      const certificates = await Promise.all(
        recentEmployees.map(async (employee) => ({
          employee: employee.name,
          employee_id: employee.id,
          certificate: await hrService.getIRP5(employee.id, taxYear),
        }))
      );
      downloadJson(`irp5-certificates-${taxYear}.json`, certificates);
      message.success(`Generated IRP5 certificates for ${certificates.length} employees`);
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Failed to generate IRP5 certificates');
    }
  };

  const handleGenerateEMP501 = async () => {
    try {
      const taxYear = getCurrentTaxYearStart();
      const report = await hrService.getEMP501(taxYear);
      downloadJson(`emp501-${taxYear}.json`, report);
      message.success('EMP501 generated successfully');
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Failed to generate EMP501');
    }
  };

  const handleGenerateComplianceReport = async () => {
    try {
      const report = await hrService.getComplianceReport();
      downloadJson(`hr-compliance-report-${new Date().toISOString().slice(0, 10)}.json`, report);
      message.success('Compliance report generated');
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Failed to generate compliance report');
    }
  };

  const handleOpenSubmitSarsModal = (record?: any) => {
    const defaultRecord = record || complianceCalendar.find((item: any) => String(item.status).toLowerCase() === 'preparing') || complianceCalendar[0];
    setSelectedComplianceReturn(defaultRecord || null);
    setShowEMP201Modal(true);
  };

  const handleSubmitToSARS = async () => {
    if (!selectedComplianceReturn) {
      message.warning('No return selected for submission');
      return;
    }

    try {
      setSubmittingToSars(true);
      const payload = await hrService.getComplianceReport();
      downloadJson(`sars-submission-${new Date().toISOString().slice(0, 10)}.json`, {
        return: selectedComplianceReturn,
        payload,
      });

      setComplianceCalendar((prev: any[]) => prev.map((item: any) => {
        if (item.type === selectedComplianceReturn.type && item.period === selectedComplianceReturn.period) {
          return {
            ...item,
            status: 'submitted',
            submittedDate: new Date().toISOString().slice(0, 10),
          };
        }
        return item;
      }));

      message.success('Submission package prepared and marked as submitted');
      setShowEMP201Modal(false);
      setSelectedComplianceReturn(null);
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Failed to prepare SARS submission');
    } finally {
      setSubmittingToSars(false);
    }
  };

  const handleViewPayrollRun = async (record: any) => {
    try {
      const runId = record.run_id || record.id;
      if (!runId) {
        message.warning('Run ID not available for this row');
        return;
      }
      const details = await hrService.getPayrollRunDetails(runId);
      Modal.info({
        title: `Payroll Run ${record.id}`,
        width: 640,
        content: (
          <div>
            <p><strong>Period:</strong> {record.period}</p>
            <p><strong>Employees:</strong> {details?.employees?.length || record.employees || 0}</p>
            <p><strong>Gross:</strong> {formatCurrency(record.grossPay || 0)}</p>
            <p><strong>Net:</strong> {formatCurrency(record.netPay || 0)}</p>
          </div>
        ),
      });
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Failed to fetch payroll run details');
    }
  };

  const handleGeneratePayslipsForRun = async (record: any) => {
    try {
      const runId = record.run_id || record.id;
      if (!runId) {
        message.warning('Run ID not available for this row');
        return;
      }
      const details = await hrService.getPayrollRunDetails(runId);
      const firstEmployee = details?.employees?.[0];
      if (!firstEmployee) {
        message.warning('No employees found in this payroll run');
        return;
      }

      const payslip = await hrService.getPayslipHtml(firstEmployee.employee_id, runId);
      const html = payslip?.html || payslip?.data?.html;
      if (!html) {
        message.warning('Payslip HTML not available for this run');
        return;
      }

      const win = window.open('', '_blank');
      if (win) {
        win.document.open();
        win.document.write(html);
        win.document.close();
      }
      message.success('Payslip opened in a new tab');
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Failed to generate payslips');
    }
  };

  const handlePostPayrollRunToGL = async (record: any) => {
    try {
      const runId = record.run_id || record.id;
      if (!runId) {
        message.warning('Run ID not available for this row');
        return;
      }
      await hrService.postPayrollToGL(runId);
      message.success('Payroll posted to GL successfully');
      await loadHRData();
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Failed to post payroll to GL');
    }
  };

  const handleGenerateReport = async (reportName: string) => {
    if (reportName === 'EMP501 Return') {
      await handleGenerateEMP501();
      return;
    }
    if (reportName === 'IRP5 Certificates') {
      await handleGenerateAllIRP5();
      return;
    }
    if (reportName === 'Payroll Summary') {
      downloadJson('payroll-summary.json', payrollRuns);
      message.success('Payroll summary exported');
      return;
    }
    if (reportName === 'Employee Register') {
      downloadJson('employee-register.json', recentEmployees);
      message.success('Employee register exported');
      return;
    }
    if (reportName === 'Leave Balances') {
      downloadJson('leave-requests.json', leaveRequests);
      message.success('Leave report exported');
      return;
    }

    if (reportName === 'EMP201 Return') {
      await handleGenerateComplianceReport();
      return;
    }

    if (reportName === 'Payslips') {
      const latestRun = payrollRuns[0];
      if (!latestRun) {
        message.warning('No payroll run available for payslips export');
        return;
      }
      downloadJson('payslip-batch.json', { run: latestRun, employees: recentEmployees });
      message.success('Payslip batch exported');
      return;
    }

    if (reportName === 'Deductions Report') {
      downloadJson('deductions-report.json', {
        statutory: statutoryDeductions,
        payrollRuns,
      });
      message.success('Deductions report exported');
      return;
    }

    if (reportName === 'Cost to Company') {
      const latestRun = payrollRuns[0];
      const totalCost = toNumber(latestRun?.grossPay) + toNumber(latestRun?.sdl);
      downloadJson('cost-to-company.json', {
        period: latestRun?.period || 'N/A',
        grossPayroll: toNumber(latestRun?.grossPay),
        sdl: toNumber(latestRun?.sdl),
        totalCost,
      });
      message.success('Cost to company report exported');
      return;
    }

    if (reportName === 'Bank Payment File') {
      downloadJson('bank-payment-file.json', {
        generatedAt: new Date().toISOString(),
        payrollRun: payrollRuns[0] || null,
        totalEmployees: recentEmployees.length,
      });
      message.success('Bank payment export generated');
      return;
    }

    if (reportName === 'Headcount Report') {
      const departmentBreakdown = recentEmployees.reduce((acc: Record<string, number>, employee) => {
        acc[employee.department] = (acc[employee.department] || 0) + 1;
        return acc;
      }, {});
      downloadJson('headcount-report.json', {
        totalEmployees: recentEmployees.length,
        departmentBreakdown,
      });
      message.success('Headcount report exported');
      return;
    }

    if (reportName === 'Turnover Report') {
      downloadJson('turnover-report.json', {
        turnoverRate: hrStats.turnoverRate,
        activeEmployees: hrStats.activeEmployees,
        onLeave: hrStats.onLeave,
      });
      message.success('Turnover report exported');
      return;
    }

    if (reportName === 'Skills Audit') {
      downloadJson('skills-audit.json', {
        employees: recentEmployees.map((employee) => ({
          employee: employee.name,
          position: employee.position,
          department: employee.department,
        })),
      });
      message.success('Skills audit exported');
      return;
    }

    message.info(`${reportName} export is queued for next enhancement`);
  };

  const getStatusTag = (status: string) => {
    const configs: Record<string, { color: string; text: string; icon?: React.ReactNode }> = {
      'active': { color: 'green', text: 'Active' },
      'submitted': { color: 'green', text: 'Submitted', icon: <CheckCircleOutlined /> },
      'preparing': { color: 'blue', text: 'Preparing', icon: <SyncOutlined spin /> },
      'due': { color: 'orange', text: 'Due Soon', icon: <ClockCircleOutlined /> },
      'overdue': { color: 'red', text: 'Overdue', icon: <WarningOutlined /> },
      'not-due': { color: 'default', text: 'Not Due' },
      'completed': { color: 'green', text: 'Completed', icon: <CheckCircleOutlined /> },
      'processing': { color: 'blue', text: 'Processing', icon: <SyncOutlined spin /> },
      'registered': { color: 'green', text: 'SARS Registered' },
      'pending': { color: 'orange', text: 'Pending' },
      'calculated': { color: 'green', text: 'Calculated' },
    };
    const config = configs[status] || { color: 'default', text: status };
    return <Tag color={config.color} icon={config.icon}>{config.text}</Tag>;
  };

  const formatCurrency = (amount: number) => `R ${amount.toLocaleString('en-ZA')}`;

  const payrollColumns = [
    {
      title: 'Period',
      dataIndex: 'period',
      key: 'period',
      render: (text: string, record: any) => (
        <div>
          <Text strong>{text}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>{record.id}</Text>
        </div>
      ),
    },
    {
      title: 'Employees',
      dataIndex: 'employees',
      key: 'employees',
      align: 'center' as const,
    },
    {
      title: 'Gross Pay',
      dataIndex: 'grossPay',
      key: 'grossPay',
      render: (v: number) => formatCurrency(v),
    },
    {
      title: 'PAYE',
      dataIndex: 'paye',
      key: 'paye',
      render: (v: number) => <Text type="danger">{formatCurrency(v)}</Text>,
    },
    {
      title: 'UIF',
      dataIndex: 'uif',
      key: 'uif',
      render: (v: number) => <Text type="warning">{formatCurrency(v)}</Text>,
    },
    {
      title: 'Net Pay',
      dataIndex: 'netPay',
      key: 'netPay',
      render: (v: number) => <Text strong style={{ color: '#10b981' }}>{formatCurrency(v)}</Text>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusTag(status),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Tooltip title="View Details">
            <Button type="link" size="small" icon={<FileSearchOutlined />} onClick={() => handleViewPayrollRun(record)} />
          </Tooltip>
          <Tooltip title="Generate Payslips">
            <Button type="link" size="small" icon={<PrinterOutlined />} onClick={() => handleGeneratePayslipsForRun(record)} disabled={!['processed', 'posted', 'completed'].includes(record.status)} />
          </Tooltip>
          <Tooltip title="Export to SARS">
            <Button type="link" size="small" icon={<SendOutlined />} onClick={() => handlePostPayrollRunToGL(record)} disabled={record.status === 'posted'} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const complianceColumns = [
    {
      title: 'Return Type',
      key: 'type',
      render: (_: any, record: any) => (
        <div>
          <Tag color={
            record.type === 'EMP201' ? 'blue' : 
            record.type === 'EMP501' ? 'purple' : 
            record.type === 'UIF' ? 'cyan' : 'orange'
          }>
            {record.type}
          </Tag>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>{record.description}</Text>
        </div>
      ),
    },
    {
      title: 'Period',
      dataIndex: 'period',
      key: 'period',
    },
    {
      title: 'Due Date',
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (date: string) => {
        const isOverdue = new Date(date) < new Date();
        return <Text type={isOverdue ? 'danger' : undefined}>{date}</Text>;
      },
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (v: number) => v ? formatCurrency(v) : '-',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusTag(status),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          {record.status === 'submitted' ? (
            <Button type="link" size="small" icon={<DownloadOutlined />}>Receipt</Button>
          ) : record.status === 'preparing' ? (
            <Button type="primary" size="small" icon={<SendOutlined />} onClick={() => handleOpenSubmitSarsModal(record)}>Submit to SARS</Button>
          ) : (
            <Button type="link" size="small" disabled>N/A</Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="hr-hub">
      {/* Header */}
      <div className="hub-header">
        <div className="hub-title-section">
          <div className="hr-logo">
            <TeamOutlined className="logo-icon" />
          </div>
          <div>
            <Title level={2} style={{ margin: 0 }}>HR & Payroll</Title>
            <Text type="secondary">RSA-Compliant Payroll, SARS Integration & Workforce Management</Text>
          </div>
        </div>
        <div className="hub-actions">
          <Button icon={<SyncOutlined />} onClick={handleRefresh} loading={loading}>Sync with SARS</Button>
          <Button icon={<CalculatorOutlined />} onClick={handleOpenPayrollModal}>
            Run Payroll
          </Button>
          <Button type="primary" icon={<UserAddOutlined />} onClick={() => setShowAddEmployee(true)}>
            Add Employee
          </Button>
        </div>
      </div>

      {/* Compliance Alert Banner */}
      <Alert
        message="SARS Compliance Status"
        description={
          <Space size="large">
            <span><CheckCircleOutlined style={{ color: '#10b981' }} /> EMP201 Nov 2025: Submitted</span>
            <span><SyncOutlined spin style={{ color: '#3b82f6' }} /> EMP201 Dec 2025: Preparing</span>
            <span><ClockCircleOutlined style={{ color: '#f59e0b' }} /> EMP501 Annual: Due May 2026</span>
            <Button type="link" size="small" icon={<LinkOutlined />} onClick={handleOpenSarsSentinel}>
              Open SARS Sentinel →
            </Button>
          </Space>
        }
        type="info"
        showIcon
        icon={<SafetyCertificateOutlined />}
        style={{ marginBottom: 24, borderRadius: 12 }}
      />

      {/* HR Summary Banner */}
      <Card className="hr-status-card">
        <Row gutter={24} align="middle">
          <Col span={4}>
            <div className="hr-badge">
              <BankOutlined className="hr-icon" />
              <div>
                <Text strong style={{ fontSize: '14px', display: 'block', color: 'white' }}>Payroll Overview</Text>
                <Text style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>{new Date().toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })}</Text>
              </div>
            </div>
          </Col>
          <Col span={3}>
            <Statistic 
              title="Employees" 
              value={hrStats.totalEmployees}
              valueStyle={{ color: 'white' }}
              prefix={<TeamOutlined />}
            />
          </Col>
          <Col span={4}>
            <Statistic 
              title="Gross Payroll" 
              value={hrStats.grossPayroll}
              prefix="R"
              valueStyle={{ color: 'white', fontSize: '18px' }}
            />
          </Col>
          <Col span={3}>
            <Statistic 
              title="PAYE Due" 
              value={hrStats.payeDeducted}
              prefix="R"
              valueStyle={{ color: '#fbbf24', fontSize: '16px' }}
            />
          </Col>
          <Col span={3}>
            <Statistic 
              title="UIF Due" 
              value={hrStats.uifDeducted}
              prefix="R"
              valueStyle={{ color: '#fbbf24', fontSize: '16px' }}
            />
          </Col>
          <Col span={3}>
            <Statistic 
              title="SDL Due" 
              value={hrStats.sdlPayable}
              prefix="R"
              valueStyle={{ color: '#fbbf24', fontSize: '16px' }}
            />
          </Col>
          <Col span={4}>
            <Statistic 
              title="Net Payroll" 
              value={hrStats.netPayroll}
              prefix="R"
              valueStyle={{ color: '#86efac', fontSize: '18px' }}
            />
          </Col>
        </Row>
      </Card>

      {/* Main Content Tabs */}
      <Tabs activeKey={activeTab} onChange={setActiveTab} className="hub-tabs">
        <TabPane 
          tab={<span><DollarOutlined /> Payroll</span>} 
          key="dashboard"
        >
          <Row gutter={24}>
            {/* Payroll Runs */}
            <Col span={16}>
              <Card 
                title="Payroll Runs" 
                extra={
                  <Space>
                    <Button icon={<CalculatorOutlined />} onClick={() => message.info('Tax calculator integration is next in Phase 3')}>Calculate Tax</Button>
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenPayrollModal}>New Payroll Run</Button>
                  </Space>
                }
                className="payroll-card"
              >
                <Table 
                  dataSource={payrollRuns}
                  columns={payrollColumns}
                  rowKey="id"
                  pagination={false}
                  size="middle"
                />
              </Card>

              {/* Statutory Deductions */}
              <Card title="Statutory Deductions Summary" style={{ marginTop: 24 }}>
                <Table
                  dataSource={statutoryDeductions}
                  columns={[
                    { title: 'Deduction Type', dataIndex: 'name', key: 'name', render: (t: string) => <Text strong>{t}</Text> },
                    { title: 'Rate', dataIndex: 'rate', key: 'rate' },
                    { title: 'Current Month', dataIndex: 'currentMonth', key: 'currentMonth', render: (v: number) => formatCurrency(v) },
                    { title: 'YTD Amount', dataIndex: 'ytdAmount', key: 'ytdAmount', render: (v: number) => <Text strong>{formatCurrency(v)}</Text> },
                    { title: 'Status', dataIndex: 'status', key: 'status', render: (s: string) => getStatusTag(s) },
                  ]}
                  rowKey="name"
                  pagination={false}
                  size="small"
                />
              </Card>
            </Col>

            {/* Side Panel */}
            <Col span={8}>
              {/* Tax Certificates */}
              <Card title="Tax Certificates (IRP5/IT3)" className="certificates-card" style={{ marginBottom: 24 }}>
                {taxCertificates.map(cert => (
                  <div key={cert.type} className="certificate-item">
                    <div className="cert-info">
                      <Text strong>{cert.type}</Text>
                      <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>{cert.description}</Text>
                    </div>
                    <div className="cert-progress">
                      <Progress 
                        percent={cert.total > 0 ? Math.round((cert.generated / cert.total) * 100) : 0} 
                        size="small"
                        format={() => `${cert.generated}/${cert.total}`}
                        strokeColor={cert.pending > 0 ? '#f59e0b' : '#10b981'}
                      />
                      {cert.pending > 0 && (
                        <Text type="warning" style={{ fontSize: '11px' }}>{cert.pending} pending</Text>
                      )}
                    </div>
                  </div>
                ))}
                <Divider style={{ margin: '12px 0' }} />
                <Space>
                  <Button icon={<FileDoneOutlined />} size="small" onClick={handleGenerateAllIRP5}>Generate All IRP5s</Button>
                  <Button icon={<MailOutlined />} size="small" onClick={() => message.info('Bulk employee email distribution will be enabled next')}>Email to Employees</Button>
                </Space>
              </Card>

              {/* Quick Actions */}
              <Card title="Payroll Quick Actions" className="actions-card">
                <div className="quick-actions-grid">
                  <Button className="action-btn" icon={<CalculatorOutlined />}>
                    Tax Calculator
                  </Button>
                  <Button className="action-btn" icon={<PrinterOutlined />}>
                    Bulk Payslips
                  </Button>
                  <Button className="action-btn" icon={<CloudUploadOutlined />}>
                    Import Data
                  </Button>
                  <Button className="action-btn" icon={<DownloadOutlined />} onClick={() => handleGenerateReport('Payroll Summary')}>
                    Export Reports
                  </Button>
                </div>
              </Card>
            </Col>
          </Row>
        </TabPane>

        <TabPane 
          tab={<span><SafetyCertificateOutlined /> SARS Compliance</span>} 
          key="compliance"
        >
          <Row gutter={24}>
            {/* Compliance Calendar */}
            <Col span={16}>
              <Card 
                title="SARS Returns & Submissions" 
                extra={
                  <Space>
                    <Button icon={<SyncOutlined />} onClick={handleRefresh}>Refresh Status</Button>
                    <Button type="primary" icon={<LinkOutlined />} onClick={handleOpenSarsSentinel}>Open SARS Sentinel</Button>
                  </Space>
                }
              >
                <Table 
                  dataSource={complianceCalendar}
                  columns={complianceColumns}
                  rowKey={(r) => `${r.type}-${r.period}`}
                  pagination={false}
                />
              </Card>

              {/* EMP201 Preparation Workflow */}
              <Card title="EMP201 Monthly Reconciliation Workflow" style={{ marginTop: 24 }}>
                <Steps current={2} size="small">
                  <Steps.Step title="Calculate PAYE" description="Auto-calculated" status="finish" />
                  <Steps.Step title="Verify Employees" description="152 employees" status="finish" />
                  <Steps.Step title="Generate Return" description="In progress" status="process" />
                  <Steps.Step title="Submit to SARS" description="Via e@syFile" status="wait" />
                  <Steps.Step title="Get Receipt" description="Confirmation" status="wait" />
                </Steps>
                <Divider />
                <Space>
                  <Button type="primary" icon={<FileDoneOutlined />} onClick={handleGenerateComplianceReport}>Generate EMP201</Button>
                  <Button icon={<DownloadOutlined />} onClick={handleGenerateComplianceReport}>Download CSV</Button>
                  <Button icon={<SendOutlined />} onClick={() => handleOpenSubmitSarsModal()}>Submit via SARS Sentinel</Button>
                </Space>
              </Card>
            </Col>

            {/* Compliance Summary */}
            <Col span={8}>
              <Card title="Compliance Dashboard" className="compliance-summary-card">
                <div className="compliance-stat">
                  <div className="stat-header">
                    <Text strong>EMP201 (Monthly PAYE)</Text>
                    <Tag color="green">Up to Date</Tag>
                  </div>
                  <Progress percent={100} strokeColor="#10b981" showInfo={false} />
                  <Text type="secondary" style={{ fontSize: '12px' }}>Last submitted: 5 Dec 2025</Text>
                </div>
                <Divider style={{ margin: '16px 0' }} />
                <div className="compliance-stat">
                  <div className="stat-header">
                    <Text strong>EMP501 (Bi-Annual)</Text>
                    <Tag color="blue">Interim Done</Tag>
                  </div>
                  <Progress percent={50} strokeColor="#3b82f6" showInfo={false} />
                  <Text type="secondary" style={{ fontSize: '12px' }}>Annual due: 31 May 2026</Text>
                </div>
                <Divider style={{ margin: '16px 0' }} />
                <div className="compliance-stat">
                  <div className="stat-header">
                    <Text strong>UIF Declarations</Text>
                    <Tag color="green">Current</Tag>
                  </div>
                  <Progress percent={100} strokeColor="#10b981" showInfo={false} />
                  <Text type="secondary" style={{ fontSize: '12px' }}>Monthly submission active</Text>
                </div>
                <Divider style={{ margin: '16px 0' }} />
                <div className="compliance-stat">
                  <div className="stat-header">
                    <Text strong>IRP5 Certificates</Text>
                    <Tag color="orange">4 Pending</Tag>
                  </div>
                  <Progress percent={97} strokeColor="#f59e0b" />
                  <Text type="secondary" style={{ fontSize: '12px' }}>148 of 152 generated</Text>
                </div>
              </Card>

              {/* SARS Integration Status */}
              <Card title="SARS Integration" style={{ marginTop: 24 }}>
                <div className="integration-status">
                  <div className="integration-item">
                    <CheckCircleOutlined style={{ color: '#10b981', fontSize: 20 }} />
                    <div>
                      <Text strong>e@syFile Employer</Text>
                      <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>Connected</Text>
                    </div>
                  </div>
                  <div className="integration-item">
                    <CheckCircleOutlined style={{ color: '#10b981', fontSize: 20 }} />
                    <div>
                      <Text strong>SARS eFiling</Text>
                      <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>API Active</Text>
                    </div>
                  </div>
                  <div className="integration-item">
                    <CheckCircleOutlined style={{ color: '#10b981', fontSize: 20 }} />
                    <div>
                      <Text strong>UIF uFiling</Text>
                      <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>Linked</Text>
                    </div>
                  </div>
                </div>
              </Card>
            </Col>
          </Row>
        </TabPane>

        <TabPane 
          tab={<span><FileTextOutlined /> Reports</span>} 
          key="reports"
        >
          <Row gutter={24}>
            <Col span={8}>
              <Card title="SARS Reports" className="report-category-card">
                <List
                  dataSource={[
                    { name: 'EMP201 Return', desc: 'Monthly PAYE reconciliation', icon: <AuditOutlined /> },
                    { name: 'EMP501 Return', desc: 'Bi-annual reconciliation', icon: <AuditOutlined /> },
                    { name: 'IRP5 Certificates', desc: 'Employee tax certificates', icon: <FileDoneOutlined /> },
                    { name: 'IT3(a) Certificates', desc: 'Interest income certs', icon: <FileDoneOutlined /> },
                    { name: 'Tax Directive Request', desc: 'Bonus/commission directive', icon: <FileTextOutlined /> },
                  ]}
                  renderItem={item => (
                    <List.Item className="report-item">
                      <Space>
                        {item.icon}
                        <div>
                          <Text strong>{item.name}</Text>
                          <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>{item.desc}</Text>
                        </div>
                      </Space>
                      <Button type="link" size="small" icon={<DownloadOutlined />} onClick={() => handleGenerateReport(item.name)}>Generate</Button>
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card title="Payroll Reports" className="report-category-card">
                <List
                  dataSource={[
                    { name: 'Payroll Summary', desc: 'Monthly payroll totals', icon: <DollarOutlined /> },
                    { name: 'Payslips', desc: 'Individual employee payslips', icon: <FileTextOutlined /> },
                    { name: 'Deductions Report', desc: 'All deductions breakdown', icon: <CalculatorOutlined /> },
                    { name: 'Cost to Company', desc: 'Total employment cost', icon: <BankOutlined /> },
                    { name: 'Bank Payment File', desc: 'Salary payment export', icon: <BankOutlined /> },
                  ]}
                  renderItem={item => (
                    <List.Item className="report-item">
                      <Space>
                        {item.icon}
                        <div>
                          <Text strong>{item.name}</Text>
                          <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>{item.desc}</Text>
                        </div>
                      </Space>
                      <Button type="link" size="small" icon={<DownloadOutlined />} onClick={() => handleGenerateReport(item.name)}>Generate</Button>
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card title="HR Reports" className="report-category-card">
                <List
                  dataSource={[
                    { name: 'Employee Register', desc: 'Full employee listing', icon: <TeamOutlined /> },
                    { name: 'Leave Balances', desc: 'All leave entitlements', icon: <CalendarOutlined /> },
                    { name: 'Headcount Report', desc: 'Staffing analysis', icon: <LineChartOutlined /> },
                    { name: 'Turnover Report', desc: 'Employee movement', icon: <RiseOutlined /> },
                    { name: 'Skills Audit', desc: 'SDL reporting', icon: <TrophyOutlined /> },
                  ]}
                  renderItem={item => (
                    <List.Item className="report-item">
                      <Space>
                        {item.icon}
                        <div>
                          <Text strong>{item.name}</Text>
                          <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>{item.desc}</Text>
                        </div>
                      </Space>
                      <Button type="link" size="small" icon={<DownloadOutlined />} onClick={() => handleGenerateReport(item.name)}>Generate</Button>
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
          </Row>
        </TabPane>

        <TabPane 
          tab={<span><TeamOutlined /> Employees</span>} 
          key="employees"
        >
          <Card 
            title="Employee Directory"
            extra={<Button type="primary" icon={<UserAddOutlined />} onClick={() => setShowAddEmployee(true)}>Add Employee</Button>}
          >
            <Table
              dataSource={recentEmployees}
              columns={[
                { 
                  title: 'Employee', 
                  key: 'name',
                  render: (_: any, r: any) => (
                    <Space>
                      <Avatar style={{ backgroundColor: '#667eea' }}>{r.name.split(' ').map((n: string) => n[0]).join('')}</Avatar>
                      <div>
                        <Text strong>{r.name}</Text>
                        <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>{r.id}</Text>
                      </div>
                    </Space>
                  )
                },
                { title: 'ID Number', dataIndex: 'idNumber', key: 'idNumber' },
                { title: 'Tax Number', dataIndex: 'taxNumber', key: 'taxNumber' },
                { title: 'Position', dataIndex: 'position', key: 'position' },
                { title: 'Department', dataIndex: 'department', key: 'department' },
                { title: 'Tax Status', dataIndex: 'taxStatus', key: 'taxStatus', render: (s: string) => getStatusTag(s) },
                { title: 'Status', dataIndex: 'status', key: 'status', render: (s: string) => getStatusTag(s) },
              ]}
              rowKey="id"
              pagination={{ pageSize: 10 }}
            />
          </Card>
        </TabPane>

        <TabPane 
          tab={<span><CalendarOutlined /> Leave</span>} 
          key="leave"
        >
          <Row gutter={24}>
            <Col span={16}>
              <Card
                title="Leave Requests"
                extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setShowLeaveModal(true)}>New Leave Request</Button>}
              >
                <Table
                  dataSource={leaveRequests}
                  rowKey="key"
                  pagination={{ pageSize: 8 }}
                  locale={{ emptyText: <Empty description="No leave requests" /> }}
                  columns={[
                    {
                      title: 'Employee',
                      key: 'employee_name',
                      render: (_: any, record: LeaveRequestRecord) => (
                        <div>
                          <Text strong>{record.employee_name}</Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: 12 }}>{record.employee_number || ''}</Text>
                        </div>
                      ),
                    },
                    {
                      title: 'Period',
                      key: 'period',
                      render: (_: any, record: LeaveRequestRecord) => (
                        <Text>{record.start_date} → {record.end_date}</Text>
                      ),
                    },
                    {
                      title: 'Days',
                      dataIndex: 'days_requested',
                      key: 'days_requested',
                    },
                    {
                      title: 'Status',
                      dataIndex: 'status',
                      key: 'status',
                      render: (status: string) => getStatusTag(String(status || '').toLowerCase()),
                    },
                    {
                      title: 'Actions',
                      key: 'actions',
                      render: (_: any, record: LeaveRequestRecord) => (
                        <Space>
                          <Button
                            size="small"
                            type="link"
                            disabled={String(record.status || '').toLowerCase() !== 'pending'}
                            onClick={() => handleProcessLeaveRequest(String(record.request_id), 'Approved')}
                          >
                            Approve
                          </Button>
                          <Button
                            size="small"
                            type="link"
                            danger
                            disabled={String(record.status || '').toLowerCase() !== 'pending'}
                            onClick={() => handleProcessLeaveRequest(String(record.request_id), 'Rejected')}
                          >
                            Reject
                          </Button>
                        </Space>
                      ),
                    },
                  ]}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card title="Leave Policy (BCEA Compliant)">
                <Table
                  dataSource={leaveTypes}
                  columns={[
                    { title: 'Leave Type', dataIndex: 'type', key: 'type' },
                    { title: 'Statutory', dataIndex: 'statutory', key: 'statutory' },
                    { title: 'Company', dataIndex: 'companyPolicy', key: 'companyPolicy' },
                  ]}
                  rowKey="type"
                  pagination={false}
                  size="small"
                />
              </Card>
            </Col>
          </Row>
        </TabPane>

        <TabPane 
          tab={<span><SettingOutlined /> Settings</span>} 
          key="settings"
        >
          <Row gutter={24}>
            <Col span={12}>
              <Card title="Payroll Settings">
                <Form form={payrollSettingsForm} layout="vertical">
                  <Form.Item label="Tax Year" name="taxYear">
                    <Select>
                      <Select.Option value="2026">2025/2026 (Mar 2025 - Feb 2026)</Select.Option>
                      <Select.Option value="2025">2024/2025 (Mar 2024 - Feb 2025)</Select.Option>
                    </Select>
                  </Form.Item>
                  <Form.Item label="Pay Frequency" name="payFrequency">
                    <Select>
                      <Select.Option value="weekly">Weekly</Select.Option>
                      <Select.Option value="fortnightly">Fortnightly</Select.Option>
                      <Select.Option value="monthly">Monthly</Select.Option>
                    </Select>
                  </Form.Item>
                  <Form.Item label="UIF Reference Number" name="uifReference">
                    <Input />
                  </Form.Item>
                  <Form.Item label="SDL Number" name="sdlNumber">
                    <Input />
                  </Form.Item>
                  <Button type="primary" loading={savingSettings} onClick={handleSavePayrollSettings}>Save Settings</Button>
                </Form>
              </Card>
            </Col>
            <Col span={12}>
              <Card title="SARS Integration Settings">
                <Form form={sarsSettingsForm} layout="vertical">
                  <Form.Item label="SARS Employer Reference" name="sarsEmployerReference">
                    <Input />
                  </Form.Item>
                  <Form.Item label="e@syFile Username" name="easyfileUsername">
                    <Input />
                  </Form.Item>
                  <Form.Item label="Auto-Submit EMP201" name="autoSubmitEmp201">
                    <Select>
                      <Select.Option value="auto">Automatic (7th of month)</Select.Option>
                      <Select.Option value="manual">Manual Approval</Select.Option>
                    </Select>
                  </Form.Item>
                  <Button type="primary" loading={savingSettings} onClick={handleSaveSarsSettings}>Save SARS Settings</Button>
                </Form>
              </Card>
            </Col>
          </Row>
        </TabPane>
      </Tabs>

      {/* Payroll Run Modal */}
      <Modal
        title="Submit to SARS"
        open={showEMP201Modal}
        onCancel={() => {
          setShowEMP201Modal(false);
          setSelectedComplianceReturn(null);
        }}
        onOk={handleSubmitToSARS}
        okText="Prepare & Mark Submitted"
        confirmLoading={submittingToSars}
      >
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <Text>Return Type: <Text strong>{selectedComplianceReturn?.type || 'EMP201'}</Text></Text>
          <Text>Period: <Text strong>{selectedComplianceReturn?.period || 'Current period'}</Text></Text>
          <Text>Amount: <Text strong>{formatCurrency(toNumber(selectedComplianceReturn?.amount || (hrStats.payeDeducted + hrStats.uifDeducted + hrStats.sdlPayable)))}</Text></Text>
          <Alert
            type="info"
            showIcon
            message="This action prepares the submission package and marks it submitted in HR Hub."
            description="Final filing remains in SARS Sentinel/e@syFile."
          />
        </Space>
      </Modal>

      <Modal
        title="Run Payroll"
        open={showPayrollModal}
        onCancel={() => setShowPayrollModal(false)}
        onOk={handleRunPayroll}
        confirmLoading={processingPayroll}
        okText="Process Payroll"
        width={640}
      >
        <Form form={payrollForm} layout="vertical">
          <Form.Item label="Use Existing Payroll Period" name="period_id">
            <Select allowClear placeholder="Select existing period (optional)">
              {payrollPeriods.map((period: any) => (
                <Select.Option key={period.period_id} value={period.period_id}>
                  {period.period_name} ({period.start_date} to {period.end_date})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Divider plain>OR Create New Period</Divider>
          <Form.Item label="Period Name" name="period_name">
            <Input placeholder="e.g. February 2026 Payroll" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="Start Date"
                name="period_start_date"
                rules={[
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (getFieldValue('period_id') || value) return Promise.resolve();
                      return Promise.reject(new Error('Start date is required when no period is selected'));
                    },
                  }),
                ]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="End Date"
                name="period_end_date"
                rules={[
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (getFieldValue('period_id') || value) return Promise.resolve();
                      return Promise.reject(new Error('End date is required when no period is selected'));
                    },
                  }),
                ]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="Payment Date"
                name="payment_date"
                rules={[
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (getFieldValue('period_id') || value) return Promise.resolve();
                      return Promise.reject(new Error('Payment date is required when no period is selected'));
                    },
                  }),
                ]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Leave Request Modal */}
      <Modal
        title="New Leave Request"
        open={showLeaveModal}
        onCancel={() => setShowLeaveModal(false)}
        onOk={handleCreateLeaveRequest}
        okText="Submit Request"
      >
        <Form form={leaveForm} layout="vertical">
          <Form.Item name="employee_id" label="Employee" rules={[{ required: true, message: 'Select employee' }]}>
            <Select showSearch placeholder="Select employee">
              {recentEmployees.map((employee) => (
                <Select.Option key={employee.id} value={employee.id}>
                  {employee.name} ({employee.id})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="leave_type_id" label="Leave Type" rules={[{ required: true, message: 'Select leave type' }]}>
            <Select placeholder="Select leave type">
              {leaveTypeOptions.map((leaveType) => (
                <Select.Option key={leaveType.leave_type_id} value={leaveType.leave_type_id}>
                  {leaveType.leave_type_name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="start_date" label="Start Date" rules={[{ required: true, message: 'Select start date' }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="end_date" label="End Date" rules={[{ required: true, message: 'Select end date' }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="reason" label="Reason">
            <Input.TextArea rows={3} placeholder="Optional reason" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Add Employee Modal */}
      <Modal
        title="Add New Employee (RSA)"
        open={showAddEmployee}
        onCancel={() => setShowAddEmployee(false)}
        footer={[
          <Button key="cancel" onClick={() => setShowAddEmployee(false)}>Cancel</Button>,
          <Button key="create" type="primary" onClick={handleCreateEmployee}>
            Add Employee
          </Button>
        ]}
        width={700}
      >
        <Form form={addEmployeeForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="First Name" name="first_name" rules={[{ required: true, message: 'First name is required' }]}>
                <Input placeholder="Enter first name" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Last Name" name="last_name" rules={[{ required: true, message: 'Last name is required' }]}>
                <Input placeholder="Enter last name" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="SA ID Number" name="id_number" rules={[{ required: true, message: 'ID number is required' }]}>
                <Input placeholder="13-digit ID number" maxLength={13} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="SARS Tax Number" name="tax_number">
                <Input placeholder="10-digit tax number" maxLength={10} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Department" name="department_id" rules={[{ required: true, message: 'Department is required' }]}>
                <Select placeholder="Select department">
                  {departments.map((department) => (
                    <Select.Option key={department.department_id} value={department.department_id}>
                      {department.department_name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Position" name="position" rules={[{ required: true, message: 'Position is required' }]}>
                <Input placeholder="Job title" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="Start Date" name="hire_date" rules={[{ required: true, message: 'Start date is required' }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Basic Salary" name="basic_salary" rules={[{ required: true, message: 'Basic salary is required' }]}>
                <Input prefix="R" placeholder="Monthly salary" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Tax Status">
                <Select defaultValue="A">
                  <Select.Option value="A">Code A - Normal</Select.Option>
                  <Select.Option value="B">Code B - Director</Select.Option>
                  <Select.Option value="C">Code C - Seasonal</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Email Address" name="email">
            <Input placeholder="employee@company.com" />
          </Form.Item>
          <Divider>Statutory Registrations</Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="UIF Contributor">
                <Select defaultValue="yes">
                  <Select.Option value="yes">Yes</Select.Option>
                  <Select.Option value="no">No (Exempt)</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Pension Fund">
                <Select placeholder="Select fund">
                  <Select.Option value="company">Company Fund (7.5%)</Select.Option>
                  <Select.Option value="ra">Retirement Annuity</Select.Option>
                  <Select.Option value="none">None</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Medical Aid">
                <Select placeholder="Select scheme">
                  <Select.Option value="discovery">Discovery Health</Select.Option>
                  <Select.Option value="bonitas">Bonitas</Select.Option>
                  <Select.Option value="none">None</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default HRHub;
