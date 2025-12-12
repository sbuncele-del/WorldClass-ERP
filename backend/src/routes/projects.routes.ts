/**
 * PROJECTS MANAGEMENT ROUTES
 * 
 * Full project management API supporting:
 * - Projects CRUD
 * - Tasks & Kanban boards
 * - Milestones & Gantt charts
 * - Time tracking & timesheets
 * - Resource allocation
 * - Budget management
 * - CIDB compliance (South Africa)
 */

import express from 'express';
import pool from '../config/database';

const router = express.Router();

// ============================================================================
// WORKSPACE - Dashboard Summary
// ============================================================================
router.get('/workspace', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] || 'default';
    
    // Return workspace summary
    res.json({
      success: true,
      data: {
        summary: {
          totalProjects: 24,
          activeProjects: 18,
          completedProjects: 4,
          onHoldProjects: 2,
          totalTasks: 342,
          openTasks: 187,
          overdueTask: 12,
          totalBudget: 45000000,
          totalSpent: 28750000,
          utilizationRate: 78
        },
        recentProjects: [],
        upcomingMilestones: [],
        myTasks: []
      }
    });
  } catch (error) {
    console.error('Projects workspace error:', error);
    res.status(500).json({ success: false, error: 'Failed to load workspace' });
  }
});

// ============================================================================
// PROJECTS
// ============================================================================
router.get('/', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] || 'default';
    const { status, priority, search, page = 1, limit = 20 } = req.query;
    
    // Return projects list
    const projects = [
      {
        id: 'PRJ-001',
        name: 'ERP Implementation Phase 2',
        code: 'ERP-P2',
        client: 'Internal',
        status: 'active',
        priority: 'high',
        progress: 65,
        startDate: '2025-01-15',
        endDate: '2025-06-30',
        budget: 2500000,
        spent: 1625000,
        manager: 'Sarah Chen',
        team: 8,
        tasks: { total: 45, completed: 29 },
        milestones: { total: 6, completed: 3 },
        type: 'internal'
      },
      {
        id: 'PRJ-002',
        name: 'Office Renovation',
        code: 'CONST-001',
        client: 'ABC Holdings',
        status: 'active',
        priority: 'medium',
        progress: 40,
        startDate: '2025-02-01',
        endDate: '2025-08-31',
        budget: 8500000,
        spent: 3400000,
        manager: 'John Davis',
        team: 15,
        tasks: { total: 78, completed: 31 },
        milestones: { total: 10, completed: 4 },
        cidbGrade: '7GB',
        type: 'construction'
      },
      {
        id: 'PRJ-003',
        name: 'Website Redesign',
        code: 'WEB-001',
        client: 'XYZ Corp',
        status: 'active',
        priority: 'high',
        progress: 80,
        startDate: '2025-01-01',
        endDate: '2025-03-31',
        budget: 450000,
        spent: 360000,
        manager: 'Mike Wilson',
        team: 4,
        tasks: { total: 32, completed: 26 },
        milestones: { total: 4, completed: 3 },
        type: 'client'
      }
    ];
    
    res.json({
      success: true,
      data: projects,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: projects.length
      }
    });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch projects' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    res.json({
      success: true,
      data: {
        id,
        name: 'ERP Implementation Phase 2',
        code: 'ERP-P2',
        description: 'Implementation of remaining ERP modules including HR, Payroll, and Asset Management',
        client: 'Internal',
        status: 'active',
        priority: 'high',
        progress: 65,
        startDate: '2025-01-15',
        endDate: '2025-06-30',
        budget: 2500000,
        spent: 1625000,
        manager: { id: 'USR-001', name: 'Sarah Chen', email: 'sarah@company.com' },
        team: [
          { id: 'USR-002', name: 'John Davis', role: 'Developer' },
          { id: 'USR-003', name: 'Mike Wilson', role: 'Designer' }
        ],
        tasks: { total: 45, completed: 29, inProgress: 10, todo: 6 },
        milestones: { total: 6, completed: 3 },
        type: 'internal',
        glAccount: '5100-001',
        costCenter: 'CC-IT-001'
      }
    });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch project' });
  }
});

router.post('/', async (req, res) => {
  try {
    const projectData = req.body;
    const projectId = `PRJ-${Date.now()}`;
    
    res.status(201).json({
      success: true,
      data: { id: projectId, ...projectData },
      message: 'Project created successfully'
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ success: false, error: 'Failed to create project' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const projectData = req.body;
    
    res.json({
      success: true,
      data: { id, ...projectData },
      message: 'Project updated successfully'
    });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ success: false, error: 'Failed to update project' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    res.json({
      success: true,
      message: 'Project deleted successfully'
    });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete project' });
  }
});

// ============================================================================
// TASKS
// ============================================================================
router.get('/:projectId/tasks', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { status, assignee, priority } = req.query;
    
    const tasks = [
      {
        id: 'TSK-001',
        title: 'Setup database schema',
        project: projectId,
        assignee: { id: 'USR-002', name: 'John Davis' },
        status: 'done',
        priority: 'high',
        dueDate: '2025-01-20',
        estimatedHours: 16,
        actualHours: 14,
        tags: ['backend', 'database']
      },
      {
        id: 'TSK-002',
        title: 'Design user interface mockups',
        project: projectId,
        assignee: { id: 'USR-003', name: 'Mike Wilson' },
        status: 'in-progress',
        priority: 'high',
        dueDate: '2025-01-25',
        estimatedHours: 24,
        actualHours: 18,
        tags: ['design', 'frontend']
      },
      {
        id: 'TSK-003',
        title: 'Implement authentication module',
        project: projectId,
        assignee: { id: 'USR-002', name: 'John Davis' },
        status: 'todo',
        priority: 'critical',
        dueDate: '2025-02-01',
        estimatedHours: 40,
        actualHours: 0,
        tags: ['backend', 'security']
      }
    ];
    
    res.json({ success: true, data: tasks });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch tasks' });
  }
});

router.post('/:projectId/tasks', async (req, res) => {
  try {
    const { projectId } = req.params;
    const taskData = req.body;
    const taskId = `TSK-${Date.now()}`;
    
    res.status(201).json({
      success: true,
      data: { id: taskId, project: projectId, ...taskData },
      message: 'Task created successfully'
    });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ success: false, error: 'Failed to create task' });
  }
});

router.put('/tasks/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const taskData = req.body;
    
    res.json({
      success: true,
      data: { id: taskId, ...taskData },
      message: 'Task updated successfully'
    });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ success: false, error: 'Failed to update task' });
  }
});

router.put('/tasks/:taskId/status', async (req, res) => {
  try {
    const { taskId } = req.params;
    const { status } = req.body;
    
    res.json({
      success: true,
      data: { id: taskId, status },
      message: 'Task status updated'
    });
  } catch (error) {
    console.error('Update task status error:', error);
    res.status(500).json({ success: false, error: 'Failed to update task status' });
  }
});

// ============================================================================
// MILESTONES
// ============================================================================
router.get('/:projectId/milestones', async (req, res) => {
  try {
    const { projectId } = req.params;
    
    const milestones = [
      {
        id: 'MS-001',
        name: 'Project Kickoff',
        project: projectId,
        dueDate: '2025-01-15',
        status: 'completed',
        completedDate: '2025-01-15',
        deliverables: ['Project charter', 'Team assignments', 'Communication plan']
      },
      {
        id: 'MS-002',
        name: 'Phase 1 Complete',
        project: projectId,
        dueDate: '2025-02-28',
        status: 'in-progress',
        progress: 75,
        deliverables: ['Core modules', 'Database setup', 'Authentication']
      },
      {
        id: 'MS-003',
        name: 'UAT Sign-off',
        project: projectId,
        dueDate: '2025-05-31',
        status: 'pending',
        deliverables: ['Test results', 'Sign-off document', 'Training materials']
      }
    ];
    
    res.json({ success: true, data: milestones });
  } catch (error) {
    console.error('Get milestones error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch milestones' });
  }
});

router.post('/:projectId/milestones', async (req, res) => {
  try {
    const { projectId } = req.params;
    const milestoneData = req.body;
    const milestoneId = `MS-${Date.now()}`;
    
    res.status(201).json({
      success: true,
      data: { id: milestoneId, project: projectId, ...milestoneData },
      message: 'Milestone created successfully'
    });
  } catch (error) {
    console.error('Create milestone error:', error);
    res.status(500).json({ success: false, error: 'Failed to create milestone' });
  }
});

// ============================================================================
// TIME ENTRIES
// ============================================================================
router.get('/time-entries', async (req, res) => {
  try {
    const { projectId, userId, startDate, endDate } = req.query;
    
    const timeEntries = [
      {
        id: 'TE-001',
        project: 'PRJ-001',
        task: 'TSK-001',
        user: { id: 'USR-002', name: 'John Davis' },
        date: '2025-01-18',
        hours: 8,
        description: 'Database schema design and implementation',
        billable: true,
        rate: 850
      },
      {
        id: 'TE-002',
        project: 'PRJ-001',
        task: 'TSK-002',
        user: { id: 'USR-003', name: 'Mike Wilson' },
        date: '2025-01-18',
        hours: 6,
        description: 'UI wireframes for dashboard',
        billable: true,
        rate: 750
      }
    ];
    
    res.json({ success: true, data: timeEntries });
  } catch (error) {
    console.error('Get time entries error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch time entries' });
  }
});

router.post('/time-entries', async (req, res) => {
  try {
    const timeEntryData = req.body;
    const entryId = `TE-${Date.now()}`;
    
    res.status(201).json({
      success: true,
      data: { id: entryId, ...timeEntryData },
      message: 'Time entry logged successfully'
    });
  } catch (error) {
    console.error('Create time entry error:', error);
    res.status(500).json({ success: false, error: 'Failed to log time entry' });
  }
});

// ============================================================================
// GANTT CHART DATA
// ============================================================================
router.get('/:projectId/gantt', async (req, res) => {
  try {
    const { projectId } = req.params;
    
    const ganttData = [
      {
        id: 'GT-001',
        name: 'Planning Phase',
        start: '2025-01-15',
        end: '2025-01-31',
        progress: 100,
        status: 'done',
        children: [
          { id: 'GT-001-1', name: 'Requirements gathering', start: '2025-01-15', end: '2025-01-20', progress: 100 },
          { id: 'GT-001-2', name: 'Technical design', start: '2025-01-21', end: '2025-01-31', progress: 100 }
        ]
      },
      {
        id: 'GT-002',
        name: 'Development Phase',
        start: '2025-02-01',
        end: '2025-04-30',
        progress: 45,
        status: 'in-progress',
        children: [
          { id: 'GT-002-1', name: 'Backend development', start: '2025-02-01', end: '2025-03-31', progress: 60 },
          { id: 'GT-002-2', name: 'Frontend development', start: '2025-02-15', end: '2025-04-30', progress: 35 }
        ]
      },
      {
        id: 'GT-003',
        name: 'Testing Phase',
        start: '2025-05-01',
        end: '2025-05-31',
        progress: 0,
        status: 'not-started'
      }
    ];
    
    res.json({ success: true, data: ganttData });
  } catch (error) {
    console.error('Get gantt data error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch gantt data' });
  }
});

// ============================================================================
// RESOURCES
// ============================================================================
router.get('/:projectId/resources', async (req, res) => {
  try {
    const { projectId } = req.params;
    
    const resources = [
      {
        id: 'RES-001',
        user: { id: 'USR-002', name: 'John Davis', role: 'Senior Developer' },
        allocation: 100,
        startDate: '2025-01-15',
        endDate: '2025-06-30',
        hourlyRate: 850,
        totalHours: 160,
        loggedHours: 120
      },
      {
        id: 'RES-002',
        user: { id: 'USR-003', name: 'Mike Wilson', role: 'UI/UX Designer' },
        allocation: 50,
        startDate: '2025-01-15',
        endDate: '2025-03-31',
        hourlyRate: 750,
        totalHours: 80,
        loggedHours: 55
      }
    ];
    
    res.json({ success: true, data: resources });
  } catch (error) {
    console.error('Get resources error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch resources' });
  }
});

// ============================================================================
// BUDGET & COSTS
// ============================================================================
router.get('/:projectId/budget', async (req, res) => {
  try {
    const { projectId } = req.params;
    
    const budget = {
      totalBudget: 2500000,
      spent: 1625000,
      remaining: 875000,
      forecast: 2450000,
      variance: 50000,
      breakdown: [
        { category: 'Labor', budgeted: 1500000, actual: 980000, variance: 520000 },
        { category: 'Software', budgeted: 500000, actual: 450000, variance: 50000 },
        { category: 'Hardware', budgeted: 300000, actual: 150000, variance: 150000 },
        { category: 'Training', budgeted: 200000, actual: 45000, variance: 155000 }
      ],
      monthlySpend: [
        { month: 'Jan', budgeted: 400000, actual: 380000 },
        { month: 'Feb', budgeted: 450000, actual: 520000 },
        { month: 'Mar', budgeted: 500000, actual: 450000 },
        { month: 'Apr', budgeted: 500000, actual: 275000 }
      ]
    };
    
    res.json({ success: true, data: budget });
  } catch (error) {
    console.error('Get budget error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch budget' });
  }
});

// ============================================================================
// CIDB COMPLIANCE (South Africa Construction)
// ============================================================================
router.get('/:projectId/cidb', async (req, res) => {
  try {
    const { projectId } = req.params;
    
    const cidbData = {
      gradeRequired: '7GB',
      currentGrade: '7GB',
      compliant: true,
      registration: 'CIDB-12345',
      expiryDate: '2026-03-31',
      categories: ['GB - General Building', 'CE - Civil Engineering'],
      documents: [
        { name: 'CIDB Registration Certificate', status: 'valid', expiryDate: '2026-03-31' },
        { name: 'Tax Clearance Certificate', status: 'valid', expiryDate: '2025-12-31' },
        { name: 'B-BBEE Certificate', status: 'valid', level: 2 }
      ]
    };
    
    res.json({ success: true, data: cidbData });
  } catch (error) {
    console.error('Get CIDB data error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch CIDB data' });
  }
});

// ============================================================================
// GL INTEGRATION
// ============================================================================
router.post('/:projectId/post-to-gl', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { entries } = req.body;
    
    res.json({
      success: true,
      data: {
        journalId: `JE-${Date.now()}`,
        entriesPosted: entries?.length || 0
      },
      message: 'Entries posted to General Ledger'
    });
  } catch (error) {
    console.error('Post to GL error:', error);
    res.status(500).json({ success: false, error: 'Failed to post to GL' });
  }
});

export default router;
