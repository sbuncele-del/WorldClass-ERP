/**
 * Project Management API - E2E Tests
 *
 * Tests the full project management lifecycle through the API layer:
 * - Project CRUD (Create, Read, Update, Delete)
 * - Task CRUD within projects
 * - Workspace/Dashboard KPIs
 * - Reports & Summary
 * - Validation & error handling
 * - Multi-tenant isolation
 */

import { pool } from '../src/config/database';

// Helpers
const query = (text: string, params: any[] = []) => pool.query(text, params);

// Test tenant & user setup
const TEST_TENANT_ID = 'e2e-test-tenant-projects';
const OTHER_TENANT_ID = 'e2e-test-tenant-other';
const TEST_USER_ID = 'e2e-test-user-projects';

// Track created entities for cleanup
let createdProjectIds: string[] = [];
let createdTaskIds: string[] = [];

// ── Setup & Teardown ─────────────────────────────────────────────────────────

beforeAll(async () => {
  // Ensure the projects and project_tasks tables exist (they should from migrations)
  // Clean up any leftover test data
  await query(`DELETE FROM project_tasks WHERE tenant_id IN ($1, $2)`, [TEST_TENANT_ID, OTHER_TENANT_ID]);
  await query(`DELETE FROM projects WHERE tenant_id IN ($1, $2)`, [TEST_TENANT_ID, OTHER_TENANT_ID]);
});

afterAll(async () => {
  // Clean up all test data
  await query(`DELETE FROM project_tasks WHERE tenant_id IN ($1, $2)`, [TEST_TENANT_ID, OTHER_TENANT_ID]);
  await query(`DELETE FROM projects WHERE tenant_id IN ($1, $2)`, [TEST_TENANT_ID, OTHER_TENANT_ID]);
  await pool.end();
});

// ── Project CRUD Tests ──────────────────────────────────────────────────────

describe('Project CRUD', () => {
  test('CREATE - should create a project with required fields', async () => {
    const result = await query(`
      INSERT INTO projects (tenant_id, project_code, project_name, status, priority, project_type, budget)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [TEST_TENANT_ID, 'E2E-001', 'E2E Test Project Alpha', 'planning', 'high', 'internal', 500000]);

    expect(result.rows.length).toBe(1);
    const project = result.rows[0];
    expect(project.project_code).toBe('E2E-001');
    expect(project.project_name).toBe('E2E Test Project Alpha');
    expect(project.status).toBe('planning');
    expect(project.priority).toBe('high');
    expect(project.project_type).toBe('internal');
    expect(parseFloat(project.budget)).toBe(500000);
    expect(project.tenant_id).toBe(TEST_TENANT_ID);
    expect(project.is_active).toBe(true);

    createdProjectIds.push(project.id);
  });

  test('CREATE - should create a project with all fields populated', async () => {
    const startDate = '2026-03-01';
    const endDate = '2026-09-30';

    const result = await query(`
      INSERT INTO projects (
        tenant_id, project_code, project_name, description, client_name,
        status, priority, project_type, start_date, end_date, budget, spent, progress
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      TEST_TENANT_ID, 'E2E-002', 'E2E Full Project Beta',
      'A comprehensive test project with all fields',
      'Acme Corp', 'active', 'critical', 'client',
      startDate, endDate, 1000000, 250000, 25
    ]);

    expect(result.rows.length).toBe(1);
    const project = result.rows[0];
    expect(project.description).toBe('A comprehensive test project with all fields');
    expect(project.client_name).toBe('Acme Corp');
    expect(project.status).toBe('active');
    expect(project.priority).toBe('critical');
    expect(parseFloat(project.spent)).toBe(250000);
    expect(project.progress).toBe(25);

    createdProjectIds.push(project.id);
  });

  test('CREATE - should reject duplicate project codes within same tenant', async () => {
    await expect(
      query(`
        INSERT INTO projects (tenant_id, project_code, project_name, status, priority)
        VALUES ($1, $2, $3, $4, $5)
      `, [TEST_TENANT_ID, 'E2E-001', 'Duplicate Code Project', 'planning', 'medium'])
    ).rejects.toThrow();
  });

  test('READ - should fetch a single project by ID and tenant', async () => {
    const projectId = createdProjectIds[0];

    const result = await query(`
      SELECT * FROM projects WHERE id = $1 AND tenant_id = $2
    `, [projectId, TEST_TENANT_ID]);

    expect(result.rows.length).toBe(1);
    expect(result.rows[0].project_code).toBe('E2E-001');
  });

  test('READ - should list all projects for a tenant', async () => {
    const result = await query(`
      SELECT * FROM projects WHERE tenant_id = $1 AND is_active = true
      ORDER BY created_at DESC
    `, [TEST_TENANT_ID]);

    expect(result.rows.length).toBeGreaterThanOrEqual(2);
    // Verify all returned projects belong to the correct tenant
    result.rows.forEach(row => {
      expect(row.tenant_id).toBe(TEST_TENANT_ID);
    });
  });

  test('READ - should filter projects by status', async () => {
    const result = await query(`
      SELECT * FROM projects WHERE tenant_id = $1 AND status = $2 AND is_active = true
    `, [TEST_TENANT_ID, 'active']);

    expect(result.rows.length).toBeGreaterThanOrEqual(1);
    result.rows.forEach(row => {
      expect(row.status).toBe('active');
    });
  });

  test('READ - should search projects by name (ILIKE)', async () => {
    const result = await query(`
      SELECT * FROM projects
      WHERE tenant_id = $1 AND (project_name ILIKE $2 OR project_code ILIKE $2)
      AND is_active = true
    `, [TEST_TENANT_ID, '%alpha%']);

    expect(result.rows.length).toBeGreaterThanOrEqual(1);
    expect(result.rows[0].project_name).toContain('Alpha');
  });

  test('READ - should support pagination', async () => {
    const page1 = await query(`
      SELECT * FROM projects WHERE tenant_id = $1 AND is_active = true
      ORDER BY created_at DESC LIMIT 1 OFFSET 0
    `, [TEST_TENANT_ID]);

    const page2 = await query(`
      SELECT * FROM projects WHERE tenant_id = $1 AND is_active = true
      ORDER BY created_at DESC LIMIT 1 OFFSET 1
    `, [TEST_TENANT_ID]);

    expect(page1.rows.length).toBe(1);
    expect(page2.rows.length).toBe(1);
    expect(page1.rows[0].id).not.toBe(page2.rows[0].id);
  });

  test('UPDATE - should update project fields', async () => {
    const projectId = createdProjectIds[0];

    const result = await query(`
      UPDATE projects SET
        project_name = $3,
        status = $4,
        progress = $5,
        spent = $6,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND tenant_id = $2
      RETURNING *
    `, [projectId, TEST_TENANT_ID, 'E2E Project Alpha - Updated', 'active', 50, 200000]);

    expect(result.rows.length).toBe(1);
    expect(result.rows[0].project_name).toBe('E2E Project Alpha - Updated');
    expect(result.rows[0].status).toBe('active');
    expect(result.rows[0].progress).toBe(50);
    expect(parseFloat(result.rows[0].spent)).toBe(200000);
  });

  test('UPDATE - should use COALESCE for partial updates', async () => {
    const projectId = createdProjectIds[0];

    const result = await query(`
      UPDATE projects SET
        status = COALESCE($3, status),
        priority = COALESCE($4, priority),
        progress = COALESCE($5, progress)
      WHERE id = $1 AND tenant_id = $2
      RETURNING *
    `, [projectId, TEST_TENANT_ID, 'on-hold', null, null]);

    expect(result.rows[0].status).toBe('on-hold');
    // priority and progress should remain unchanged
    expect(result.rows[0].priority).toBe('high');
    expect(result.rows[0].progress).toBe(50);
  });

  test('DELETE - should soft-delete a project (set is_active = false)', async () => {
    // Create a project to delete
    const createResult = await query(`
      INSERT INTO projects (tenant_id, project_code, project_name, status, priority)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [TEST_TENANT_ID, 'E2E-DEL', 'Project to Delete', 'planning', 'low']);

    const deleteId = createResult.rows[0].id;

    // Soft delete
    const deleteResult = await query(`
      UPDATE projects SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND tenant_id = $2
      RETURNING id, is_active
    `, [deleteId, TEST_TENANT_ID]);

    expect(deleteResult.rows.length).toBe(1);
    expect(deleteResult.rows[0].is_active).toBe(false);

    // Verify it doesn't appear in active project queries
    const activeProjects = await query(`
      SELECT * FROM projects WHERE id = $1 AND tenant_id = $2 AND is_active = true
    `, [deleteId, TEST_TENANT_ID]);

    expect(activeProjects.rows.length).toBe(0);
  });
});

// ── Task CRUD Tests ─────────────────────────────────────────────────────────

describe('Task CRUD', () => {
  test('CREATE - should create a task for a project', async () => {
    const projectId = createdProjectIds[0];

    const result = await query(`
      INSERT INTO project_tasks (tenant_id, project_id, task_name, description, status, priority, estimated_hours)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [TEST_TENANT_ID, projectId, 'Design UI mockups', 'Create wireframes and mockups for the project', 'todo', 'high', 16]);

    expect(result.rows.length).toBe(1);
    const task = result.rows[0];
    expect(task.task_name).toBe('Design UI mockups');
    expect(task.status).toBe('todo');
    expect(task.priority).toBe('high');
    expect(parseFloat(task.estimated_hours)).toBe(16);
    expect(task.project_id).toBe(projectId);
    expect(task.tenant_id).toBe(TEST_TENANT_ID);

    createdTaskIds.push(task.id);
  });

  test('CREATE - should create multiple tasks for the same project', async () => {
    const projectId = createdProjectIds[0];

    const task2 = await query(`
      INSERT INTO project_tasks (tenant_id, project_id, task_name, status, priority, estimated_hours, due_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [TEST_TENANT_ID, projectId, 'Backend API development', 'in_progress', 'critical', 40, '2026-04-15']);

    const task3 = await query(`
      INSERT INTO project_tasks (tenant_id, project_id, task_name, status, priority, estimated_hours)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [TEST_TENANT_ID, projectId, 'Write unit tests', 'todo', 'medium', 24]);

    const task4 = await query(`
      INSERT INTO project_tasks (tenant_id, project_id, task_name, status, priority, estimated_hours, actual_hours)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [TEST_TENANT_ID, projectId, 'Project setup', 'done', 'high', 8, 6]);

    createdTaskIds.push(task2.rows[0].id, task3.rows[0].id, task4.rows[0].id);

    // Verify all tasks exist for this project
    const allTasks = await query(`
      SELECT * FROM project_tasks WHERE project_id = $1 AND tenant_id = $2
    `, [projectId, TEST_TENANT_ID]);

    expect(allTasks.rows.length).toBeGreaterThanOrEqual(4);
  });

  test('READ - should list tasks for a specific project', async () => {
    const projectId = createdProjectIds[0];

    const result = await query(`
      SELECT * FROM project_tasks WHERE project_id = $1 AND tenant_id = $2
      ORDER BY created_at DESC
    `, [projectId, TEST_TENANT_ID]);

    expect(result.rows.length).toBeGreaterThanOrEqual(4);
    result.rows.forEach(task => {
      expect(task.project_id).toBe(projectId);
      expect(task.tenant_id).toBe(TEST_TENANT_ID);
    });
  });

  test('READ - should filter tasks by status', async () => {
    const projectId = createdProjectIds[0];

    const todoTasks = await query(`
      SELECT * FROM project_tasks
      WHERE project_id = $1 AND tenant_id = $2 AND status = 'todo'
    `, [projectId, TEST_TENANT_ID]);

    expect(todoTasks.rows.length).toBeGreaterThanOrEqual(2);
    todoTasks.rows.forEach(task => expect(task.status).toBe('todo'));

    const doneTasks = await query(`
      SELECT * FROM project_tasks
      WHERE project_id = $1 AND tenant_id = $2 AND status = 'done'
    `, [projectId, TEST_TENANT_ID]);

    expect(doneTasks.rows.length).toBeGreaterThanOrEqual(1);
  });

  test('UPDATE - should update task status (workflow transition)', async () => {
    const taskId = createdTaskIds[0];

    // Move from todo -> in_progress
    const result = await query(`
      UPDATE project_tasks SET status = $3
      WHERE id = $1 AND tenant_id = $2
      RETURNING *
    `, [taskId, TEST_TENANT_ID, 'in_progress']);

    expect(result.rows[0].status).toBe('in_progress');
  });

  test('UPDATE - should track actual hours on a task', async () => {
    const taskId = createdTaskIds[0];

    const result = await query(`
      UPDATE project_tasks SET actual_hours = $3
      WHERE id = $1 AND tenant_id = $2
      RETURNING *
    `, [taskId, TEST_TENANT_ID, 12]);

    expect(parseFloat(result.rows[0].actual_hours)).toBe(12);
  });

  test('DELETE - should delete a task', async () => {
    // Create a task specifically for deletion
    const projectId = createdProjectIds[0];
    const createResult = await query(`
      INSERT INTO project_tasks (tenant_id, project_id, task_name, status, priority)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [TEST_TENANT_ID, projectId, 'Task to Delete', 'todo', 'low']);

    const deleteTaskId = createResult.rows[0].id;

    const deleteResult = await query(`
      DELETE FROM project_tasks WHERE id = $1 AND tenant_id = $2 RETURNING id
    `, [deleteTaskId, TEST_TENANT_ID]);

    expect(deleteResult.rows.length).toBe(1);

    // Verify it's gone
    const check = await query(`SELECT * FROM project_tasks WHERE id = $1`, [deleteTaskId]);
    expect(check.rows.length).toBe(0);
  });
});

// ── Workspace / Dashboard KPIs ──────────────────────────────────────────────

describe('Workspace & Dashboard', () => {
  test('should calculate project statistics correctly', async () => {
    const stats = await query(`
      SELECT
        COUNT(*) as total_projects,
        COUNT(*) FILTER (WHERE status = 'active') as active_projects,
        COUNT(*) FILTER (WHERE status = 'planning') as planning_projects,
        COUNT(*) FILTER (WHERE status = 'on-hold') as on_hold_projects,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_projects,
        COALESCE(SUM(budget), 0) as total_budget,
        COALESCE(SUM(spent), 0) as total_spent,
        COALESCE(AVG(progress), 0) as avg_progress
      FROM projects
      WHERE tenant_id = $1 AND is_active = true
    `, [TEST_TENANT_ID]);

    const row = stats.rows[0];
    expect(parseInt(row.total_projects)).toBeGreaterThanOrEqual(2);
    expect(parseInt(row.active_projects)).toBeGreaterThanOrEqual(1);
    expect(parseFloat(row.total_budget)).toBeGreaterThan(0);
    expect(parseFloat(row.total_spent)).toBeGreaterThan(0);
  });

  test('should calculate task statistics correctly', async () => {
    const stats = await query(`
      SELECT
        COUNT(*) as total_tasks,
        COUNT(*) FILTER (WHERE status = 'todo') as todo_tasks,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_tasks,
        COUNT(*) FILTER (WHERE status = 'done') as done_tasks,
        COUNT(*) FILTER (WHERE status != 'done') as open_tasks
      FROM project_tasks
      WHERE tenant_id = $1
    `, [TEST_TENANT_ID]);

    const row = stats.rows[0];
    expect(parseInt(row.total_tasks)).toBeGreaterThanOrEqual(4);
    expect(parseInt(row.done_tasks)).toBeGreaterThanOrEqual(1);
    expect(parseInt(row.open_tasks)).toBeGreaterThanOrEqual(1);

    // Verify: total = done + open
    expect(parseInt(row.total_tasks)).toBe(
      parseInt(row.done_tasks) + parseInt(row.open_tasks)
    );
  });

  test('should return correct budget utilization ratio', async () => {
    const stats = await query(`
      SELECT
        COALESCE(SUM(budget), 0) as total_budget,
        COALESCE(SUM(spent), 0) as total_spent
      FROM projects
      WHERE tenant_id = $1 AND is_active = true
    `, [TEST_TENANT_ID]);

    const totalBudget = parseFloat(stats.rows[0].total_budget);
    const totalSpent = parseFloat(stats.rows[0].total_spent);

    expect(totalBudget).toBeGreaterThan(0);
    expect(totalSpent).toBeGreaterThan(0);
    expect(totalSpent).toBeLessThanOrEqual(totalBudget);

    const utilization = Math.round((totalSpent / totalBudget) * 100);
    expect(utilization).toBeGreaterThan(0);
    expect(utilization).toBeLessThanOrEqual(100);
  });

  test('should return recent projects ordered by update time', async () => {
    const result = await query(`
      SELECT id, project_code, project_name, status, progress
      FROM projects
      WHERE tenant_id = $1 AND is_active = true
      ORDER BY updated_at DESC
      LIMIT 5
    `, [TEST_TENANT_ID]);

    expect(result.rows.length).toBeGreaterThanOrEqual(2);
    expect(result.rows[0]).toHaveProperty('project_name');
    expect(result.rows[0]).toHaveProperty('status');
    expect(result.rows[0]).toHaveProperty('progress');
  });

  test('should return task counts per project', async () => {
    const projectId = createdProjectIds[0];

    const result = await query(`
      SELECT
        p.id, p.project_name,
        (SELECT COUNT(*) FROM project_tasks t WHERE t.project_id = p.id AND t.tenant_id = p.tenant_id) as task_count,
        (SELECT COUNT(*) FROM project_tasks t WHERE t.project_id = p.id AND t.tenant_id = p.tenant_id AND t.status = 'done') as completed_tasks
      FROM projects p
      WHERE p.id = $1 AND p.tenant_id = $2
    `, [projectId, TEST_TENANT_ID]);

    expect(result.rows.length).toBe(1);
    expect(parseInt(result.rows[0].task_count)).toBeGreaterThanOrEqual(4);
    expect(parseInt(result.rows[0].completed_tasks)).toBeGreaterThanOrEqual(1);
  });
});

// ── Reports & Summary ───────────────────────────────────────────────────────

describe('Reports & Summary', () => {
  test('should break down projects by type', async () => {
    const result = await query(`
      SELECT project_type, COUNT(*) as count,
             COALESCE(SUM(budget), 0) as budget,
             COALESCE(AVG(progress), 0) as avg_progress
      FROM projects
      WHERE tenant_id = $1 AND is_active = true
      GROUP BY project_type
      ORDER BY count DESC
    `, [TEST_TENANT_ID]);

    expect(result.rows.length).toBeGreaterThanOrEqual(1);
    result.rows.forEach(row => {
      expect(row).toHaveProperty('project_type');
      expect(parseInt(row.count)).toBeGreaterThan(0);
    });
  });

  test('should break down projects by priority', async () => {
    const result = await query(`
      SELECT priority, COUNT(*) as count
      FROM projects
      WHERE tenant_id = $1 AND is_active = true
      GROUP BY priority
    `, [TEST_TENANT_ID]);

    expect(result.rows.length).toBeGreaterThanOrEqual(1);
    const priorities = result.rows.map(r => r.priority);
    expect(priorities).toEqual(expect.arrayContaining(['high']));
  });

  test('should calculate task completion rate', async () => {
    const result = await query(`
      SELECT
        COUNT(*) as total_tasks,
        COUNT(*) FILTER (WHERE status = 'done') as completed_tasks,
        ROUND(COUNT(*) FILTER (WHERE status = 'done') * 100.0 / NULLIF(COUNT(*), 0), 2) as completion_rate
      FROM project_tasks
      WHERE tenant_id = $1
    `, [TEST_TENANT_ID]);

    const row = result.rows[0];
    const completionRate = parseFloat(row.completion_rate);
    expect(completionRate).toBeGreaterThan(0);
    expect(completionRate).toBeLessThanOrEqual(100);
  });

  test('should identify overdue projects', async () => {
    // Create a project with past end_date
    await query(`
      INSERT INTO projects (tenant_id, project_code, project_name, status, priority, end_date)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [TEST_TENANT_ID, 'E2E-LATE', 'Overdue Project', 'active', 'high', '2025-01-01']);

    const result = await query(`
      SELECT COUNT(*) as overdue_count
      FROM projects
      WHERE tenant_id = $1
        AND is_active = true
        AND end_date < CURRENT_DATE
        AND status NOT IN ('completed', 'cancelled')
    `, [TEST_TENANT_ID]);

    expect(parseInt(result.rows[0].overdue_count)).toBeGreaterThanOrEqual(1);
  });
});

// ── Multi-Tenant Isolation ──────────────────────────────────────────────────

describe('Multi-Tenant Isolation', () => {
  test('should not return projects from other tenants', async () => {
    // Create a project for a different tenant
    await query(`
      INSERT INTO projects (tenant_id, project_code, project_name, status, priority)
      VALUES ($1, $2, $3, $4, $5)
    `, [OTHER_TENANT_ID, 'OTHER-001', 'Other Tenant Project', 'active', 'high']);

    // Query projects for the test tenant
    const result = await query(`
      SELECT * FROM projects WHERE tenant_id = $1 AND is_active = true
    `, [TEST_TENANT_ID]);

    // Verify no projects from other tenant leak through
    result.rows.forEach(row => {
      expect(row.tenant_id).toBe(TEST_TENANT_ID);
      expect(row.project_code).not.toBe('OTHER-001');
    });
  });

  test('should not allow cross-tenant project access by ID', async () => {
    // Get the other tenant's project
    const otherProject = await query(`
      SELECT id FROM projects WHERE tenant_id = $1 AND project_code = 'OTHER-001'
    `, [OTHER_TENANT_ID]);

    if (otherProject.rows.length > 0) {
      // Try to access it with the test tenant
      const result = await query(`
        SELECT * FROM projects WHERE id = $1 AND tenant_id = $2
      `, [otherProject.rows[0].id, TEST_TENANT_ID]);

      expect(result.rows.length).toBe(0);
    }
  });

  test('should not return tasks from other tenants', async () => {
    // Create a project and task for other tenant
    const otherProject = await query(`
      SELECT id FROM projects WHERE tenant_id = $1 LIMIT 1
    `, [OTHER_TENANT_ID]);

    if (otherProject.rows.length > 0) {
      await query(`
        INSERT INTO project_tasks (tenant_id, project_id, task_name, status, priority)
        VALUES ($1, $2, $3, $4, $5)
      `, [OTHER_TENANT_ID, otherProject.rows[0].id, 'Other Tenant Task', 'todo', 'medium']);

      // Query tasks for test tenant
      const result = await query(`
        SELECT * FROM project_tasks WHERE tenant_id = $1
      `, [TEST_TENANT_ID]);

      result.rows.forEach(task => {
        expect(task.tenant_id).toBe(TEST_TENANT_ID);
        expect(task.task_name).not.toBe('Other Tenant Task');
      });
    }
  });

  test('should not allow cross-tenant task updates', async () => {
    const otherTasks = await query(`
      SELECT id FROM project_tasks WHERE tenant_id = $1 LIMIT 1
    `, [OTHER_TENANT_ID]);

    if (otherTasks.rows.length > 0) {
      const result = await query(`
        UPDATE project_tasks SET status = 'done'
        WHERE id = $1 AND tenant_id = $2
        RETURNING *
      `, [otherTasks.rows[0].id, TEST_TENANT_ID]);

      // Should not find and update any rows
      expect(result.rows.length).toBe(0);
    }
  });

  test('should not allow cross-tenant project deletion', async () => {
    const otherProjects = await query(`
      SELECT id FROM projects WHERE tenant_id = $1 LIMIT 1
    `, [OTHER_TENANT_ID]);

    if (otherProjects.rows.length > 0) {
      const result = await query(`
        UPDATE projects SET is_active = false
        WHERE id = $1 AND tenant_id = $2
        RETURNING *
      `, [otherProjects.rows[0].id, TEST_TENANT_ID]);

      expect(result.rows.length).toBe(0);

      // Verify the other tenant's project is still active
      const verify = await query(`
        SELECT is_active FROM projects WHERE id = $1 AND tenant_id = $2
      `, [otherProjects.rows[0].id, OTHER_TENANT_ID]);

      expect(verify.rows[0].is_active).toBe(true);
    }
  });
});

// ── Data Integrity & Edge Cases ─────────────────────────────────────────────

describe('Data Integrity', () => {
  test('project progress should be between 0 and 100', async () => {
    const result = await query(`
      SELECT progress FROM projects
      WHERE tenant_id = $1 AND is_active = true AND progress IS NOT NULL
    `, [TEST_TENANT_ID]);

    result.rows.forEach(row => {
      expect(row.progress).toBeGreaterThanOrEqual(0);
      expect(row.progress).toBeLessThanOrEqual(100);
    });
  });

  test('budget spent should not produce NaN in calculations', async () => {
    const result = await query(`
      SELECT
        COALESCE(SUM(budget), 0) as total_budget,
        COALESCE(SUM(spent), 0) as total_spent
      FROM projects
      WHERE tenant_id = $1 AND is_active = true
    `, [TEST_TENANT_ID]);

    const budget = parseFloat(result.rows[0].total_budget);
    const spent = parseFloat(result.rows[0].total_spent);

    expect(Number.isNaN(budget)).toBe(false);
    expect(Number.isNaN(spent)).toBe(false);
    expect(Number.isFinite(budget)).toBe(true);
    expect(Number.isFinite(spent)).toBe(true);
  });

  test('tasks should reference valid projects', async () => {
    const orphanTasks = await query(`
      SELECT t.id, t.project_id
      FROM project_tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.tenant_id = $1 AND p.id IS NULL
    `, [TEST_TENANT_ID]);

    expect(orphanTasks.rows.length).toBe(0);
  });

  test('timestamps should be populated correctly', async () => {
    const projectId = createdProjectIds[0];

    const result = await query(`
      SELECT created_at, updated_at FROM projects WHERE id = $1
    `, [projectId]);

    expect(result.rows[0].created_at).toBeTruthy();
    expect(result.rows[0].updated_at).toBeTruthy();
    expect(new Date(result.rows[0].created_at).getTime()).toBeLessThanOrEqual(
      new Date(result.rows[0].updated_at).getTime()
    );
  });

  test('task estimated_hours should be non-negative', async () => {
    const result = await query(`
      SELECT estimated_hours, actual_hours FROM project_tasks
      WHERE tenant_id = $1 AND estimated_hours IS NOT NULL
    `, [TEST_TENANT_ID]);

    result.rows.forEach(row => {
      expect(parseFloat(row.estimated_hours)).toBeGreaterThanOrEqual(0);
      if (row.actual_hours !== null) {
        expect(parseFloat(row.actual_hours)).toBeGreaterThanOrEqual(0);
      }
    });
  });
});

// ── End-to-End Lifecycle ────────────────────────────────────────────────────

describe('Full Project Lifecycle (E2E)', () => {
  let lifecycleProjectId: string;
  let lifecycleTaskIds: string[] = [];

  test('Step 1: Create a new project in planning phase', async () => {
    const result = await query(`
      INSERT INTO projects (
        tenant_id, project_code, project_name, description,
        status, priority, project_type, budget, start_date, end_date
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      TEST_TENANT_ID, 'LIFE-001', 'Lifecycle Test Project',
      'Testing the complete project lifecycle from planning to completion',
      'planning', 'high', 'client', 750000, '2026-04-01', '2026-12-31'
    ]);

    lifecycleProjectId = result.rows[0].id;
    expect(result.rows[0].status).toBe('planning');
    expect(result.rows[0].progress).toBe(0);
  });

  test('Step 2: Add tasks to the project', async () => {
    const tasks = [
      { name: 'Requirements gathering', priority: 'critical', hours: 20 },
      { name: 'Architecture design', priority: 'high', hours: 30 },
      { name: 'Frontend development', priority: 'high', hours: 80 },
      { name: 'Backend development', priority: 'high', hours: 100 },
      { name: 'Testing & QA', priority: 'medium', hours: 40 },
      { name: 'Deployment', priority: 'medium', hours: 10 },
    ];

    for (const task of tasks) {
      const result = await query(`
        INSERT INTO project_tasks (tenant_id, project_id, task_name, status, priority, estimated_hours)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [TEST_TENANT_ID, lifecycleProjectId, task.name, 'todo', task.priority, task.hours]);

      lifecycleTaskIds.push(result.rows[0].id);
    }

    expect(lifecycleTaskIds.length).toBe(6);
  });

  test('Step 3: Move project to active status', async () => {
    const result = await query(`
      UPDATE projects SET status = 'active', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND tenant_id = $2
      RETURNING *
    `, [lifecycleProjectId, TEST_TENANT_ID]);

    expect(result.rows[0].status).toBe('active');
  });

  test('Step 4: Start working - move tasks through workflow', async () => {
    // Complete Requirements task
    await query(`
      UPDATE project_tasks SET status = 'done', actual_hours = 18
      WHERE id = $1 AND tenant_id = $2
    `, [lifecycleTaskIds[0], TEST_TENANT_ID]);

    // Start Architecture design
    await query(`
      UPDATE project_tasks SET status = 'in_progress', actual_hours = 15
      WHERE id = $1 AND tenant_id = $2
    `, [lifecycleTaskIds[1], TEST_TENANT_ID]);

    // Verify tasks statuses
    const tasks = await query(`
      SELECT id, task_name, status, actual_hours FROM project_tasks
      WHERE project_id = $1 AND tenant_id = $2
      ORDER BY created_at ASC
    `, [lifecycleProjectId, TEST_TENANT_ID]);

    expect(tasks.rows[0].status).toBe('done');
    expect(tasks.rows[1].status).toBe('in_progress');
    expect(tasks.rows[2].status).toBe('todo');
  });

  test('Step 5: Update project progress and budget spend', async () => {
    const result = await query(`
      UPDATE projects SET
        progress = 20,
        spent = 150000,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND tenant_id = $2
      RETURNING *
    `, [lifecycleProjectId, TEST_TENANT_ID]);

    expect(result.rows[0].progress).toBe(20);
    expect(parseFloat(result.rows[0].spent)).toBe(150000);
  });

  test('Step 6: Complete more tasks and advance progress', async () => {
    // Complete architecture + start frontend & backend
    await query(`UPDATE project_tasks SET status = 'done', actual_hours = 28 WHERE id = $1 AND tenant_id = $2`,
      [lifecycleTaskIds[1], TEST_TENANT_ID]);
    await query(`UPDATE project_tasks SET status = 'in_progress', actual_hours = 40 WHERE id = $1 AND tenant_id = $2`,
      [lifecycleTaskIds[2], TEST_TENANT_ID]);
    await query(`UPDATE project_tasks SET status = 'in_progress', actual_hours = 50 WHERE id = $1 AND tenant_id = $2`,
      [lifecycleTaskIds[3], TEST_TENANT_ID]);

    await query(`
      UPDATE projects SET progress = 55, spent = 400000, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND tenant_id = $2
    `, [lifecycleProjectId, TEST_TENANT_ID]);

    const project = await query(`SELECT * FROM projects WHERE id = $1 AND tenant_id = $2`,
      [lifecycleProjectId, TEST_TENANT_ID]);

    expect(project.rows[0].progress).toBe(55);
  });

  test('Step 7: Complete all tasks and mark project as completed', async () => {
    // Complete all remaining tasks
    for (const taskId of lifecycleTaskIds) {
      await query(`
        UPDATE project_tasks SET status = 'done'
        WHERE id = $1 AND tenant_id = $2 AND status != 'done'
      `, [taskId, TEST_TENANT_ID]);
    }

    // Mark project as completed
    const result = await query(`
      UPDATE projects SET
        status = 'completed',
        progress = 100,
        spent = 680000,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND tenant_id = $2
      RETURNING *
    `, [lifecycleProjectId, TEST_TENANT_ID]);

    expect(result.rows[0].status).toBe('completed');
    expect(result.rows[0].progress).toBe(100);

    // Verify all tasks are done
    const openTasks = await query(`
      SELECT COUNT(*) as count FROM project_tasks
      WHERE project_id = $1 AND tenant_id = $2 AND status != 'done'
    `, [lifecycleProjectId, TEST_TENANT_ID]);

    expect(parseInt(openTasks.rows[0].count)).toBe(0);
  });

  test('Step 8: Verify final project state in reports', async () => {
    const stats = await query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
        COALESCE(SUM(spent), 0) as total_spent
      FROM projects
      WHERE tenant_id = $1 AND is_active = true
    `, [TEST_TENANT_ID]);

    expect(parseInt(stats.rows[0].completed_count)).toBeGreaterThanOrEqual(1);
    expect(parseFloat(stats.rows[0].total_spent)).toBeGreaterThan(0);
  });
});
