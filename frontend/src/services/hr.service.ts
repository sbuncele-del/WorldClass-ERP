import apiClient from './api';

const HR_API_BASE = '/api/v2/hr';
const HR_SETTINGS_STORAGE_KEY = 'hr_module_settings';

// ─── Types ────────────────────────────────────────────────────────────────

export interface HRStats {
  total_employees: string;
  total_departments: string;
  on_leave_today: string;
  payroll_this_month: string;
}

export interface Employee {
  employee_id: string;
  employee_number: string;
  first_name: string;
  last_name: string;
  id_number?: string;
  email?: string;
  phone_mobile?: string;
  department_id?: string | number;
  department_name?: string;
  position_id?: string | number;
  position?: string;
  position_title?: string;
  employment_status?: string;
  employment_type?: string;
  hire_date?: string;
  termination_date?: string;
  basic_salary?: number;
  tax_number?: string;
  bank_name?: string;
  bank_account_number?: string;
  bank_branch_code?: string;
}

export interface Department {
  department_id: string;
  department_code?: string;
  department_name: string;
  parent_department_id?: string;
  parent_department_name?: string;
  manager_id?: string;
  manager_name?: string;
  cost_center_code?: string;
  description?: string;
  is_active?: boolean;
  employee_count: number;
}

export interface Position {
  position_id: string;
  position_code?: string;
  position_title: string;
  department_id?: string;
  job_level?: string;
  job_category?: string;
  description?: string;
  is_active?: boolean;
}

export interface LeaveRequest {
  request_id: string;
  employee_id: string;
  employee_number?: string;
  first_name?: string;
  last_name?: string;
  department_name?: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  days_requested: number;
  reason?: string;
  status: string;
  approver_comments?: string;
}

export interface LeaveType {
  leave_type_id: string;
  leave_type_name: string;
  is_active: boolean;
}

export interface LeaveBalance {
  leave_name: string;
  opening_balance: number;
  accrued: number;
  taken: number;
  pending: number;
  closing_balance: number;
}

// ─── Helper ───────────────────────────────────────────────────────────────

const extractData = (response: any): any => {
  return response.data?.data || response.data || response;
};

// ─── Service ──────────────────────────────────────────────────────────────

export const hrService = {
  // ── Dashboard / Stats ─────────────────────────────────────────────────
  async getStats(): Promise<HRStats> {
    const { data } = await apiClient.get('/api/hr/workspace');
    return data.data?.summary || data.summary || data;
  },

  async getDashboard(): Promise<any> {
    const { data } = await apiClient.get('/api/hr/dashboard');
    return extractData({ data });
  },

  // ── Employees ─────────────────────────────────────────────────────────
  async getEmployees(params?: { limit?: number; department_id?: string; status?: string; search?: string; page?: number }): Promise<{ data: Employee[]; total: number }> {
    const { data } = await apiClient.get(`${HR_API_BASE}/employees`, { params });
    return data;
  },

  async getEmployee(id: string | number): Promise<Employee> {
    const { data } = await apiClient.get(`${HR_API_BASE}/employees/${id}`);
    return extractData({ data });
  },

  async createEmployee(employee: Partial<Employee>): Promise<Employee> {
    const { data } = await apiClient.post(`${HR_API_BASE}/employees`, employee);
    return extractData({ data });
  },

  async updateEmployee(id: string | number, employee: Partial<Employee>): Promise<Employee> {
    const { data } = await apiClient.put(`${HR_API_BASE}/employees/${id}`, employee);
    return extractData({ data });
  },

  async deleteEmployee(id: string | number): Promise<void> {
    await apiClient.delete(`${HR_API_BASE}/employees/${id}`);
  },

  // ── Departments ───────────────────────────────────────────────────────
  async getDepartments(params?: { include_inactive?: boolean }): Promise<{ data: Department[]; total: number }> {
    const { data } = await apiClient.get(`${HR_API_BASE}/departments`, { params });
    return data;
  },

  async getDepartment(id: string | number): Promise<Department> {
    const { data } = await apiClient.get(`${HR_API_BASE}/departments/${id}`);
    return extractData({ data });
  },

  async createDepartment(department: Partial<Department>): Promise<Department> {
    const { data } = await apiClient.post(`${HR_API_BASE}/departments`, department);
    return extractData({ data });
  },

  async updateDepartment(id: string | number, department: Partial<Department>): Promise<Department> {
    const { data } = await apiClient.put(`${HR_API_BASE}/departments/${id}`, department);
    return extractData({ data });
  },

  async deleteDepartment(id: string | number): Promise<void> {
    await apiClient.delete(`${HR_API_BASE}/departments/${id}`);
  },

  // ── Positions ─────────────────────────────────────────────────────────
  async getPositions(params?: { include_inactive?: boolean }): Promise<{ data: Position[] }> {
    const { data } = await apiClient.get(`${HR_API_BASE}/positions`, { params });
    return data;
  },

  async createPosition(position: Partial<Position>): Promise<Position> {
    const { data } = await apiClient.post(`${HR_API_BASE}/positions`, position);
    return extractData({ data });
  },

  // ── Leave Types ───────────────────────────────────────────────────────
  async getLeaveTypes(): Promise<{ data: LeaveType[] }> {
    const { data } = await apiClient.get(`${HR_API_BASE}/leave-types`);
    return data;
  },

  // ── Leave Requests ────────────────────────────────────────────────────
  async getLeaveRequests(params?: { employee_id?: string; status?: string; from_date?: string; to_date?: string }): Promise<{ data: LeaveRequest[] }> {
    const { data } = await apiClient.get(`${HR_API_BASE}/leave-requests`, { params });
    return data;
  },

  async createLeaveRequest(leaveRequest: {
    employee_id: string;
    leave_type_id: string;
    start_date: string;
    end_date: string;
    days_requested?: number;
    reason?: string;
  }): Promise<LeaveRequest> {
    const { data } = await apiClient.post(`${HR_API_BASE}/leave-requests`, leaveRequest);
    return extractData({ data });
  },

  async processLeaveRequest(requestId: string | number, action: 'Approved' | 'Rejected', approver_comments?: string): Promise<any> {
    const { data } = await apiClient.put(`${HR_API_BASE}/leave-requests/${requestId}/process`, { action, approver_comments });
    return extractData({ data });
  },

  async getLeaveBalances(employeeId: string | number): Promise<{ data: LeaveBalance[] }> {
    const { data } = await apiClient.get(`${HR_API_BASE}/leave-balances/${employeeId}`);
    return data;
  },

  // ── Attendance ────────────────────────────────────────────────────────
  async recordAttendance(employeeId: string, clockType: 'In' | 'Out'): Promise<any> {
    const { data } = await apiClient.post(`${HR_API_BASE}/attendance`, { employee_id: employeeId, clock_type: clockType });
    return extractData({ data });
  },

  async getAttendanceRecords(params?: { employee_id?: string; from_date?: string; to_date?: string }): Promise<any> {
    const { data } = await apiClient.get(`${HR_API_BASE}/attendance`, { params });
    return data;
  },

  // ── Payroll ───────────────────────────────────────────────────────────
  async getPayrollPeriods(params?: { year?: number; status?: string }): Promise<any> {
    const { data } = await apiClient.get(`${HR_API_BASE}/payroll/periods`, { params });
    return data;
  },

  async createPayrollPeriod(period: {
    period_code?: string;
    period_name?: string;
    period_start_date: string;
    period_end_date: string;
    payment_date: string;
    frequency?: string;
    period_type?: string;
  }): Promise<any> {
    const { data } = await apiClient.post(`${HR_API_BASE}/payroll/periods`, period);
    return extractData({ data });
  },

  async processPayroll(periodId: string | number, employeeIds?: string[]): Promise<any> {
    const { data } = await apiClient.post(`${HR_API_BASE}/payroll/process`, { period_id: periodId, employee_ids: employeeIds });
    return extractData({ data });
  },

  async getPayrollRunDetails(runId: string | number): Promise<any> {
    const { data } = await apiClient.get(`${HR_API_BASE}/payroll/${runId}`);
    return extractData({ data });
  },

  async getPayrollRuns(params?: { status?: string; year?: number; month?: number }): Promise<any> {
    const { data } = await apiClient.get(`${HR_API_BASE}/payroll-runs`, { params });
    return data;
  },

  async postPayrollToGL(runId: string | number): Promise<any> {
    const { data } = await apiClient.post(`${HR_API_BASE}/payroll/post-to-gl`, { run_id: runId });
    return extractData({ data });
  },

  // ── Compliance & Reports (V1 HR routes currently host these endpoints) ──
  async getIRP5(employeeId: string | number, taxYear: number): Promise<any> {
    const { data } = await apiClient.get(`/api/hr/compliance/irp5/${employeeId}/${taxYear}`);
    return extractData({ data });
  },

  async getEMP501(taxYear: number): Promise<any> {
    const { data } = await apiClient.get(`/api/hr/compliance/emp501/${taxYear}`);
    return extractData({ data });
  },

  async getComplianceReport(): Promise<any> {
    const { data } = await apiClient.get('/api/hr/compliance/report');
    return extractData({ data });
  },

  async getPayslipHtml(employeeId: string | number, runId: string | number): Promise<any> {
    const { data } = await apiClient.get(`/api/hr/payslips/${employeeId}/${runId}/html`);
    return extractData({ data });
  },

  // ── HR Module Settings ────────────────────────────────────────────────
  async getHRModuleSettings(): Promise<any> {
    const localSettingsRaw = localStorage.getItem(HR_SETTINGS_STORAGE_KEY);
    const localSettings = localSettingsRaw ? JSON.parse(localSettingsRaw) : {};

    try {
      const { data } = await apiClient.get('/api/v2/settings/tenant/modules/hr');
      const serverSettings = extractData({ data }) || {};
      const merged = { ...localSettings, ...serverSettings };
      localStorage.setItem(HR_SETTINGS_STORAGE_KEY, JSON.stringify(merged));
      return merged;
    } catch {
      return localSettings;
    }
  },

  async saveHRModuleSettings(settings: Record<string, any>): Promise<any> {
    localStorage.setItem(HR_SETTINGS_STORAGE_KEY, JSON.stringify(settings));

    try {
      const { data } = await apiClient.put('/api/v2/settings/tenant/modules', {
        moduleCode: 'hr',
        enabled: true,
        settings,
      });
      return extractData({ data }) || settings;
    } catch {
      return settings;
    }
  },
};
