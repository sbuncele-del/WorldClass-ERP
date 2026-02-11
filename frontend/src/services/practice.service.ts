import apiClient from './api';

// ─── Types ────────────────────────────────────────────────────────────────

export interface PracticeStats {
  total_clients: string;
  active_matters: string;
  billable_hours_this_month: string;
  total_revenue_this_month: string;
}

export interface Client {
  client_id: string;
  client_number: string;
  client_name: string;
  email: string;
  total_matters: number;
  total_billed: number;
}

export interface Project {
  project_id?: string;
  id?: string;
  project_name?: string;
  name?: string;
  customer_id?: string | number;
  client_name?: string;
  customer_name?: string;
  project_type?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  budget?: number;
  budget_hours?: number;
  description?: string;
  progress?: number;
  completion_percentage?: number;
  billing_rate?: number;
}

export interface TimeEntry {
  entry_id?: string;
  id?: string;
  project_id?: string | number;
  entry_date?: string;
  hours?: number;
  description?: string;
  is_billable?: boolean;
  status?: string;
  rate?: number;
  employee_name?: string;
  project_name?: string;
  matter_name?: string;
}

export interface PracticeTask {
  task_id?: string;
  id?: string;
  project_id?: string | number;
  title?: string;
  description?: string;
  assigned_to?: string | number;
  status?: string;
  priority?: string;
  due_date?: string;
}

// ─── Helper ───────────────────────────────────────────────────────────────

const extractData = (response: any): any => {
  return response.data?.data || response.data || response;
};

// ─── Service ──────────────────────────────────────────────────────────────

export const practiceService = {
  // ── Dashboard / Stats ─────────────────────────────────────────────────
  async getStats(): Promise<PracticeStats> {
    const { data } = await apiClient.get('/api/practice/workspace');
    return data.data?.summary || data.summary || data;
  },

  async getWorkspace(): Promise<any> {
    const { data } = await apiClient.get('/api/v2/practice/projects/dashboard');
    return extractData({ data });
  },

  // ── Clients (via Sales Customers) ─────────────────────────────────────
  async getClients(params?: { limit?: number; search?: string }): Promise<any> {
    const { data } = await apiClient.get('/api/sales/customers', { params });
    return data;
  },

  async getClient(id: string | number): Promise<any> {
    const { data } = await apiClient.get(`/api/sales/customers/${id}`);
    return extractData({ data });
  },

  async createClient(client: Record<string, any>): Promise<any> {
    const { data } = await apiClient.post('/api/sales/customers', client);
    return extractData({ data });
  },

  async updateClient(id: string | number, client: Record<string, any>): Promise<any> {
    const { data } = await apiClient.put(`/api/sales/customers/${id}`, client);
    return extractData({ data });
  },

  async deleteClient(id: string | number): Promise<void> {
    await apiClient.delete(`/api/sales/customers/${id}`);
  },

  // ── Projects / Engagements ────────────────────────────────────────────
  async getProjects(params?: { limit?: number; status?: string; customer_id?: string }): Promise<any> {
    const { data } = await apiClient.get('/api/v2/practice/projects', { params });
    return data;
  },

  async getProject(id: string | number): Promise<Project> {
    const { data } = await apiClient.get(`/api/v2/practice/projects/${id}`);
    return extractData({ data });
  },

  async createProject(project: Partial<Project>): Promise<Project> {
    const { data } = await apiClient.post('/api/v2/practice/projects', project);
    return extractData({ data });
  },

  async updateProject(id: string | number, project: Partial<Project>): Promise<Project> {
    const { data } = await apiClient.put(`/api/v2/practice/projects/${id}`, project);
    return extractData({ data });
  },

  // ── Tasks ─────────────────────────────────────────────────────────────
  async getTasks(params?: { limit?: number; project_id?: string; status?: string }): Promise<any> {
    const { data } = await apiClient.get('/api/v2/practice/tasks', { params });
    return data;
  },

  async getMyTasks(): Promise<any> {
    const { data } = await apiClient.get('/api/v2/practice/tasks/my-tasks');
    return extractData({ data });
  },

  async createTask(task: Partial<PracticeTask>): Promise<PracticeTask> {
    const { data } = await apiClient.post('/api/v2/practice/tasks', task);
    return extractData({ data });
  },

  async updateTask(id: string | number, task: Partial<PracticeTask>): Promise<PracticeTask> {
    const { data } = await apiClient.put(`/api/v2/practice/tasks/${id}`, task);
    return extractData({ data });
  },

  async deleteTask(id: string | number): Promise<void> {
    await apiClient.delete(`/api/v2/practice/tasks/${id}`);
  },

  async updateTaskStatus(id: string | number, status: string): Promise<any> {
    const { data } = await apiClient.put(`/api/v2/practice/tasks/${id}/status`, { status });
    return extractData({ data });
  },

  // ── Time Entries ──────────────────────────────────────────────────────
  async getTimeEntries(params?: { limit?: number; project_id?: string }): Promise<any> {
    const { data } = await apiClient.get('/api/v2/practice/time-entries', { params });
    return data;
  },

  async getTimeEntry(id: string | number): Promise<TimeEntry> {
    const { data } = await apiClient.get(`/api/v2/practice/time-entries/${id}`);
    return extractData({ data });
  },

  async createTimeEntry(entry: Partial<TimeEntry>): Promise<TimeEntry> {
    const { data } = await apiClient.post('/api/v2/practice/time-entries', entry);
    return extractData({ data });
  },

  async updateTimeEntry(id: string | number, entry: Partial<TimeEntry>): Promise<TimeEntry> {
    const { data } = await apiClient.put(`/api/v2/practice/time-entries/${id}`, entry);
    return extractData({ data });
  },

  async deleteTimeEntry(id: string | number): Promise<void> {
    await apiClient.delete(`/api/v2/practice/time-entries/${id}`);
  },

  async approveTimeEntries(entryIds: string[]): Promise<any> {
    const { data } = await apiClient.post('/api/v2/practice/time-entries/approve', { entry_ids: entryIds });
    return extractData({ data });
  },

  async rejectTimeEntries(entryIds: string[]): Promise<any> {
    const { data } = await apiClient.post('/api/v2/practice/time-entries/reject', { entry_ids: entryIds });
    return extractData({ data });
  },

  async getTimesheetSummary(): Promise<any> {
    const { data } = await apiClient.get('/api/v2/practice/time-entries/summary');
    return extractData({ data });
  },

  // ── Client Health ─────────────────────────────────────────────────────
  async getClientHealthScores(): Promise<any> {
    const { data } = await apiClient.get('/api/v2/practice/clients/health-scores');
    return data;
  },

  async getAtRiskClients(): Promise<any> {
    const { data } = await apiClient.get('/api/v2/practice/clients/at-risk');
    return data;
  },

  async getClientHealthDashboard(): Promise<any> {
    const { data } = await apiClient.get('/api/v2/practice/clients/dashboard');
    return extractData({ data });
  },

  async getClient360(id: string | number): Promise<any> {
    const { data } = await apiClient.get(`/api/v2/practice/clients/${id}/360`);
    return extractData({ data });
  },

  async updateClientHealthScore(id: string | number, healthScore: number): Promise<any> {
    const { data } = await apiClient.put(`/api/v2/practice/clients/${id}/health-score`, { health_score: healthScore });
    return extractData({ data });
  },

  async getClientInteractions(id: string | number): Promise<any> {
    const { data } = await apiClient.get(`/api/v2/practice/clients/${id}/interactions`);
    return data;
  },

  async logClientInteraction(id: string | number, interaction: Record<string, any>): Promise<any> {
    const { data } = await apiClient.post(`/api/v2/practice/clients/${id}/interactions`, interaction);
    return extractData({ data });
  },
};
