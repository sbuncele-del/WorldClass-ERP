/**
 * Project Service - API layer for the Project Management module
 *
 * Covers two backend route groups:
 *   1. Practice projects  : /api/v2/practice/projects, /tasks, /time-entries
 *   2. Projects module    : /api/v2/projects (workspace, project & nested task CRUD)
 *
 * The ProjectsHub primarily uses the practice endpoints for project CRUD (since
 * that is where existing project data lives in client_projects) and the projects
 * module endpoint for workspace/dashboard and delete.
 */

import apiClient from './api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProjectData {
  project_name?: string;
  project_type?: string;
  customer_id?: string | number | null;
  start_date?: string;
  end_date?: string;
  budget?: number;
  estimated_hours?: number;
  priority?: string;
  description?: string;
  status?: string;
  project_manager_id?: string | number;
  project_partner_id?: string | number;
}

export interface TaskData {
  project_id?: string;
  task_name?: string;
  title?: string;
  description?: string;
  assigned_to?: string | number;
  assignee_id?: string | number;
  status?: string;
  priority?: string;
  estimated_hours?: number;
  due_date?: string;
}

export interface TimeEntryData {
  project_id?: string;
  task_id?: string;
  entry_date?: string;
  hours?: number;
  description?: string;
  is_billable?: boolean;
  rate?: number;
}

export interface TeamMemberData {
  employee_id: string | number;
  role?: string;
  hourly_billing_rate?: number;
  hourly_cost_rate?: number;
  allocation_percentage?: number;
  start_date?: string;
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

const extractData = (response: any): any => {
  return response.data?.data ?? response.data ?? response;
};

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const projectService = {
  // ── Workspace / Dashboard ───────────────────────────────────────────────

  /** GET /api/v2/projects/workspace - KPI dashboard for project module */
  async getWorkspace(): Promise<any> {
    const { data } = await apiClient.get('/api/v2/projects/workspace');
    return extractData({ data });
  },

  /** GET /api/v2/practice/projects/dashboard - Practice-based dashboard */
  async getPracticeDashboard(): Promise<any> {
    const { data } = await apiClient.get('/api/v2/practice/projects/dashboard');
    return extractData({ data });
  },

  // ── Projects (practice endpoints — client_projects table) ───────────────

  /** GET /api/v2/practice/projects */
  async getProjects(params?: {
    limit?: number;
    page?: number;
    status?: string;
    search?: string;
  }): Promise<any> {
    const { data } = await apiClient.get('/api/v2/practice/projects', { params });
    return data;
  },

  /** GET /api/v2/practice/projects/:id */
  async getProjectById(id: string | number): Promise<any> {
    const { data } = await apiClient.get(`/api/v2/practice/projects/${id}`);
    return extractData({ data });
  },

  /** POST /api/v2/practice/projects */
  async createProject(project: Partial<ProjectData>): Promise<any> {
    const { data } = await apiClient.post('/api/v2/practice/projects', project);
    return extractData({ data });
  },

  /** PUT /api/v2/practice/projects/:id */
  async updateProject(id: string | number, project: Partial<ProjectData>): Promise<any> {
    const { data } = await apiClient.put(`/api/v2/practice/projects/${id}`, project);
    return extractData({ data });
  },

  /**
   * "Delete" a project.
   * The practice endpoint has no DELETE route, so we set its status to
   * 'Cancelled'.  The projects-module endpoint (DELETE /api/v2/projects/:id)
   * does a soft-delete on the separate `projects` table instead.
   */
  async deleteProject(id: string | number): Promise<any> {
    const { data } = await apiClient.put(`/api/v2/practice/projects/${id}`, {
      status: 'Cancelled',
    });
    return extractData({ data });
  },

  // ── Tasks (practice endpoints — project_tasks table) ────────────────────

  /** GET /api/v2/practice/tasks */
  async getTasks(params?: {
    project_id?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<any> {
    const { data } = await apiClient.get('/api/v2/practice/tasks', { params });
    return data;
  },

  /** GET /api/v2/practice/tasks/my-tasks */
  async getMyTasks(): Promise<any> {
    const { data } = await apiClient.get('/api/v2/practice/tasks/my-tasks');
    return extractData({ data });
  },

  /** GET /api/v2/practice/tasks/:id */
  async getTaskById(id: string | number): Promise<any> {
    const { data } = await apiClient.get(`/api/v2/practice/tasks/${id}`);
    return extractData({ data });
  },

  /** POST /api/v2/practice/tasks */
  async createTask(task: Partial<TaskData>): Promise<any> {
    const { data } = await apiClient.post('/api/v2/practice/tasks', task);
    return extractData({ data });
  },

  /** PUT /api/v2/practice/tasks/:id */
  async updateTask(id: string | number, task: Partial<TaskData>): Promise<any> {
    const { data } = await apiClient.put(`/api/v2/practice/tasks/${id}`, task);
    return extractData({ data });
  },

  /** DELETE /api/v2/practice/tasks/:id */
  async deleteTask(id: string | number): Promise<any> {
    const { data } = await apiClient.delete(`/api/v2/practice/tasks/${id}`);
    return data;
  },

  /** PUT /api/v2/practice/tasks/:id/status */
  async updateTaskStatus(id: string | number, status: string): Promise<any> {
    const { data } = await apiClient.put(`/api/v2/practice/tasks/${id}/status`, { status });
    return extractData({ data });
  },

  // ── Tasks (projects-module nested endpoints) ────────────────────────────

  /** GET /api/v2/projects/:projectId/tasks */
  async getTasksByProject(projectId: string): Promise<any> {
    const { data } = await apiClient.get(`/api/v2/projects/${projectId}/tasks`);
    return data;
  },

  /** POST /api/v2/projects/:projectId/tasks */
  async createTaskForProject(
    projectId: string,
    task: Partial<TaskData>,
  ): Promise<any> {
    const { data } = await apiClient.post(`/api/v2/projects/${projectId}/tasks`, task);
    return extractData({ data });
  },

  /** PUT /api/v2/projects/:projectId/tasks/:taskId */
  async updateProjectTask(
    projectId: string,
    taskId: string,
    task: Partial<TaskData>,
  ): Promise<any> {
    const { data } = await apiClient.put(
      `/api/v2/projects/${projectId}/tasks/${taskId}`,
      task,
    );
    return extractData({ data });
  },

  /** DELETE /api/v2/projects/:projectId/tasks/:taskId */
  async deleteProjectTask(projectId: string, taskId: string): Promise<any> {
    const { data } = await apiClient.delete(
      `/api/v2/projects/${projectId}/tasks/${taskId}`,
    );
    return data;
  },

  // ── Time Entries ────────────────────────────────────────────────────────

  /** GET /api/v2/practice/time-entries */
  async getTimeEntries(params?: {
    project_id?: string;
    limit?: number;
  }): Promise<any> {
    const { data } = await apiClient.get('/api/v2/practice/time-entries', { params });
    return data;
  },

  /** GET /api/v2/practice/time-entries/:id */
  async getTimeEntryById(id: string | number): Promise<any> {
    const { data } = await apiClient.get(`/api/v2/practice/time-entries/${id}`);
    return extractData({ data });
  },

  /** POST /api/v2/practice/time-entries */
  async createTimeEntry(entry: Partial<TimeEntryData>): Promise<any> {
    const { data } = await apiClient.post('/api/v2/practice/time-entries', entry);
    return extractData({ data });
  },

  /** PUT /api/v2/practice/time-entries/:id */
  async updateTimeEntry(
    id: string | number,
    entry: Partial<TimeEntryData>,
  ): Promise<any> {
    const { data } = await apiClient.put(`/api/v2/practice/time-entries/${id}`, entry);
    return extractData({ data });
  },

  /** DELETE /api/v2/practice/time-entries/:id */
  async deleteTimeEntry(id: string | number): Promise<any> {
    const { data } = await apiClient.delete(`/api/v2/practice/time-entries/${id}`);
    return data;
  },

  /** GET /api/v2/practice/time-entries/summary */
  async getTimesheetSummary(): Promise<any> {
    const { data } = await apiClient.get('/api/v2/practice/time-entries/summary');
    return extractData({ data });
  },

  // ── Team Members ────────────────────────────────────────────────────────

  /** POST /api/v2/practice/projects/:id/team */
  async addTeamMember(
    projectId: string | number,
    member: Partial<TeamMemberData>,
  ): Promise<any> {
    const { data } = await apiClient.post(
      `/api/v2/practice/projects/${projectId}/team`,
      member,
    );
    return extractData({ data });
  },

  /** DELETE /api/v2/practice/projects/:id/team/:userId */
  async removeTeamMember(
    projectId: string | number,
    userId: string | number,
  ): Promise<any> {
    const { data } = await apiClient.delete(
      `/api/v2/practice/projects/${projectId}/team/${userId}`,
    );
    return data;
  },

  // ── Project Summary / Reports ───────────────────────────────────────────

  /** GET /api/v2/projects/:projectId/summary */
  async getProjectSummary(projectId: string): Promise<any> {
    const { data } = await apiClient.get(`/api/v2/projects/${projectId}/summary`);
    return extractData({ data });
  },

  // ── Project Updates (Activity Feed) ─────────────────────────────────────

  /** GET /api/v2/practice/projects/updates */
  async getProjectUpdates(params?: { project_id?: string; limit?: number }): Promise<any> {
    const { data } = await apiClient.get('/api/v2/practice/projects/updates', { params });
    return data;
  },

  /** POST /api/v2/practice/projects/updates */
  async createProjectUpdate(update: {
    project_id: string;
    update_type?: string;
    title: string;
    content?: string;
    is_client_visible?: boolean;
  }): Promise<any> {
    const { data } = await apiClient.post('/api/v2/practice/projects/updates', update);
    return extractData({ data });
  },

  /** DELETE /api/v2/practice/projects/updates/:id */
  async deleteProjectUpdate(id: string): Promise<any> {
    const { data } = await apiClient.delete(`/api/v2/practice/projects/updates/${id}`);
    return data;
  },
};

export default projectService;
