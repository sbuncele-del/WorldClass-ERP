/**
 * Practice Management - Projects Controller V2
 * Tenant-aware handlers for client projects, engagements, and project lifecycle
 * 
 * IMPORTANT: Uses TenantRequest for typed tenant context from middleware.
 */

import { Response } from 'express';
import { TenantRequest } from '../../types';
import pool from '../../config/database';
import { emailService } from '../../services/email-production.service';

/**
 * Tenant context helper
 */
function getTenantContext(req: TenantRequest): { tenantId: string; userId?: string } {
  const tenantId = req.tenant?.id;
  if (!tenantId) {
    throw new Error('Tenant ID not found');
  }
  return {
    tenantId,
    userId: req.user?.id
  };
}

// ============================================================================
// GET ALL PROJECTS
// ============================================================================

export const getAllProjects = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId } = getTenantContext(req);
    const { 
      status, 
      search,
      page = '1',
      limit = '20'
    } = req.query;

    // Query from client_projects table (practice management projects)
    let query = `
      SELECT 
        cp.project_id as id,
        cp.project_id,
        cp.project_number,
        cp.project_name,
        cp.project_type,
        cp.status,
        cp.priority,
        cp.customer_id,
        cp.project_manager_id,
        cp.start_date,
        cp.end_date,
        cp.budget,
        cp.estimated_hours,
        cp.actual_hours,
        cp.description,
        cp.completion_percentage,
        cp.created_at,
        cp.updated_at,
        COALESCE(u.first_name || ' ' || u.last_name, 'Unassigned') as manager_name,
        COALESCE(sc.company_name, 'Internal') as client_name,
        COALESCE(task_counts.total_tasks, 0) as total_tasks,
        COALESCE(task_counts.completed_tasks, 0) as completed_tasks
      FROM client_projects cp
      LEFT JOIN users u ON cp.project_manager_id = u.id
      LEFT JOIN sales.customers sc ON cp.customer_id = sc.customer_id
      LEFT JOIN LATERAL (
        SELECT 
          COUNT(*) as total_tasks,
          COUNT(*) FILTER (WHERE pt.status IN ('done','Completed','completed','closed','Closed')) as completed_tasks
        FROM project_tasks pt WHERE pt.project_id = cp.project_id AND pt.tenant_id = cp.tenant_id
      ) task_counts ON true
      WHERE cp.tenant_id = $1
    `;

    const params: any[] = [tenantId];
    let paramCount = 2;

    if (status) {
      query += ` AND cp.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (search) {
      query += ` AND cp.project_name ILIKE $${paramCount}`;
      params.push(`%${search}%`);
      paramCount++;
    }

    query += ` ORDER BY cp.created_at DESC`;

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(parseInt(limit as string), offset);

    const result = await pool.query(query, params);

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM client_projects WHERE tenant_id = $1`,
      [tenantId]
    );

    res.json({
      success: true,
      data: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page as string),
      totalPages: Math.ceil(parseInt(countResult.rows[0].count) / parseInt(limit as string))
    });

  } catch (error: any) {
    if (error.message === 'Tenant ID not found') {
      return res.status(401).json({ success: false, message: 'Unauthorized - tenant not found' });
    }
    console.error('Error fetching projects:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch projects', error: error.message });
  }
};

// ============================================================================
// GET PROJECT BY ID
// ============================================================================

export const getProjectById = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId } = getTenantContext(req);
    const { id } = req.params;

    const result = await pool.query(`
      SELECT 
        cp.*,
        sc.company_name as customer_name,
        sc.customer_code,
        COALESCE(u1.first_name || ' ' || u1.last_name, 'Unassigned') as manager_name,
        COALESCE(u2.first_name || ' ' || u2.last_name, 'Unassigned') as partner_name
      FROM client_projects cp
      LEFT JOIN sales.customers sc ON cp.customer_id = sc.customer_id
      LEFT JOIN users u1 ON cp.project_manager_id = u1.id
      LEFT JOIN users u2 ON cp.project_partner_id = u2.id
      WHERE cp.project_id = $1 AND cp.tenant_id = $2
    `, [id, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Get team members
    const teamResult = await pool.query(`
      SELECT ptm.*, e.first_name, e.last_name, e.email
      FROM project_team_members ptm
      JOIN employees e ON ptm.employee_id = e.employee_id
      WHERE ptm.project_id = $1 AND ptm.tenant_id = $2 AND ptm.is_active = true
    `, [id, tenantId]);

    // Get tasks summary
    const tasksSummary = await pool.query(`
      SELECT 
        status, 
        COUNT(*) as count
      FROM project_tasks
      WHERE project_id = $1 AND tenant_id = $2
      GROUP BY status
    `, [id, tenantId]);

    res.json({
      success: true,
      data: {
        ...result.rows[0],
        team_members: teamResult.rows,
        tasks_summary: tasksSummary.rows
      }
    });

  } catch (error: any) {
    if (error.message === 'Tenant ID not found') {
      return res.status(401).json({ success: false, message: 'Unauthorized - tenant not found' });
    }
    console.error('Error fetching project:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch project', error: error.message });
  }
};

// ============================================================================
// CREATE PROJECT
// ============================================================================

export const createProject = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId, userId } = getTenantContext(req);
    const projectData = req.body;

    // Accept both manager_id and project_manager_id from frontend
    if (projectData.manager_id && !projectData.project_manager_id) {
      projectData.project_manager_id = projectData.manager_id;
    }

    // Generate project number
    const seqResult = await pool.query(`
      SELECT COALESCE(MAX(CAST(SUBSTRING(project_number FROM 5) AS INTEGER)), 0) + 1 as next_seq
      FROM client_projects
      WHERE tenant_id = $1 AND project_number LIKE 'PRJ-%'
    `, [tenantId]);
    const projectNumber = `PRJ-${String(seqResult.rows[0].next_seq).padStart(5, '0')}`;

    const result = await pool.query(`
      INSERT INTO client_projects (
        tenant_id, project_number, project_name, project_type, customer_id,
        project_manager_id, project_partner_id, status, priority,
        start_date, end_date, budget, estimated_hours, description,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `, [
      tenantId,
      projectNumber,
      projectData.project_name,
      projectData.project_type,
      projectData.customer_id,
      projectData.project_manager_id,
      projectData.project_partner_id,
      projectData.status || 'Planning',
      projectData.priority || 'Medium',
      projectData.start_date,
      projectData.end_date,
      projectData.budget,
      projectData.estimated_hours,
      projectData.description,
      userId
    ]);

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data: result.rows[0]
    });

  } catch (error: any) {
    if (error.message === 'Tenant ID not found') {
      return res.status(401).json({ success: false, message: 'Unauthorized - tenant not found' });
    }
    console.error('Error creating project:', error);
    res.status(500).json({ success: false, message: 'Failed to create project', error: error.message });
  }
};

// ============================================================================
// UPDATE PROJECT
// ============================================================================

export const updateProject = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId, userId } = getTenantContext(req);
    const { id } = req.params;
    const updateData = req.body;

    const result = await pool.query(`
      UPDATE client_projects SET
        project_name = COALESCE($1, project_name),
        project_type = COALESCE($2, project_type),
        status = COALESCE($3, status),
        priority = COALESCE($4, priority),
        project_manager_id = COALESCE($5, project_manager_id),
        project_partner_id = COALESCE($6, project_partner_id),
        start_date = COALESCE($7, start_date),
        end_date = COALESCE($8, end_date),
        budget = COALESCE($9, budget),
        estimated_hours = COALESCE($10, estimated_hours),
        description = COALESCE($11, description),
        updated_by = $12,
        updated_at = CURRENT_TIMESTAMP
      WHERE project_id = $13 AND tenant_id = $14
      RETURNING *
    `, [
      updateData.project_name,
      updateData.project_type,
      updateData.status,
      updateData.priority,
      updateData.project_manager_id,
      updateData.project_partner_id,
      updateData.start_date,
      updateData.end_date,
      updateData.budget,
      updateData.estimated_hours,
      updateData.description,
      userId,
      id,
      tenantId
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    res.json({
      success: true,
      message: 'Project updated successfully',
      data: result.rows[0]
    });

  } catch (error: any) {
    if (error.message === 'Tenant ID not found') {
      return res.status(401).json({ success: false, message: 'Unauthorized - tenant not found' });
    }
    console.error('Error updating project:', error);
    res.status(500).json({ success: false, message: 'Failed to update project', error: error.message });
  }
};

// ============================================================================
// TEAM MANAGEMENT
// ============================================================================

export const addTeamMember = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId, userId } = getTenantContext(req);
    const { id } = req.params;
    const memberData = req.body;

    // Verify project belongs to tenant
    const projectCheck = await pool.query(
      'SELECT project_id FROM client_projects WHERE project_id = $1 AND tenant_id = $2',
      [id, tenantId]
    );

    if (projectCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const result = await pool.query(`
      INSERT INTO project_team_members (
        tenant_id, project_id, employee_id, role, hourly_billing_rate,
        hourly_cost_rate, allocation_percentage, start_date, is_active, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9)
      RETURNING *
    `, [
      tenantId,
      id,
      memberData.employee_id,
      memberData.role,
      memberData.hourly_billing_rate,
      memberData.hourly_cost_rate,
      memberData.allocation_percentage || 100,
      memberData.start_date || new Date(),
      userId
    ]);

    res.status(201).json({
      success: true,
      message: 'Team member added successfully',
      data: result.rows[0]
    });

  } catch (error: any) {
    if (error.message === 'Tenant ID not found') {
      return res.status(401).json({ success: false, message: 'Unauthorized - tenant not found' });
    }
    console.error('Error adding team member:', error);
    res.status(500).json({ success: false, message: 'Failed to add team member', error: error.message });
  }
};

export const removeTeamMember = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId, userId } = getTenantContext(req);
    const { id, memberId } = req.params;

    const result = await pool.query(`
      UPDATE project_team_members 
      SET is_active = false, end_date = CURRENT_DATE, updated_by = $1, updated_at = CURRENT_TIMESTAMP
      WHERE assignment_id = $2 AND project_id = $3 AND tenant_id = $4
      RETURNING *
    `, [userId, memberId, id, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Team member not found' });
    }

    res.json({
      success: true,
      message: 'Team member removed successfully',
      data: result.rows[0]
    });

  } catch (error: any) {
    if (error.message === 'Tenant ID not found') {
      return res.status(401).json({ success: false, message: 'Unauthorized - tenant not found' });
    }
    console.error('Error removing team member:', error);
    res.status(500).json({ success: false, message: 'Failed to remove team member', error: error.message });
  }
};

// ============================================================================
// DASHBOARD
// ============================================================================

export const getProjectsDashboard = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId } = getTenantContext(req);

    // Project status summary
    const statusSummary = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM client_projects
      WHERE tenant_id = $1
      GROUP BY status
    `, [tenantId]);

    // Budget summary
    const budgetSummary = await pool.query(`
      SELECT 
        COUNT(*) as total_projects,
        COALESCE(SUM(budget), 0) as total_budget,
        COALESCE(SUM(estimated_hours), 0) as total_estimated_hours
      FROM client_projects
      WHERE tenant_id = $1 AND status IN ('Planning', 'Active')
    `, [tenantId]);

    // Upcoming deadlines
    const upcomingDeadlines = await pool.query(`
      SELECT project_id, project_name, project_number, end_date, status
      FROM client_projects
      WHERE tenant_id = $1 
      AND status = 'Active'
      AND end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
      ORDER BY end_date ASC
      LIMIT 5
    `, [tenantId]);

    res.json({
      success: true,
      data: {
        statusSummary: statusSummary.rows,
        budgetSummary: budgetSummary.rows[0],
        upcomingDeadlines: upcomingDeadlines.rows
      }
    });

  } catch (error: any) {
    if (error.message === 'Tenant ID not found') {
      return res.status(401).json({ success: false, message: 'Unauthorized - tenant not found' });
    }
    console.error('Error fetching dashboard:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard', error: error.message });
  }
};

// ============================================================================
// PROJECT UPDATES (client-facing activity feed)
// ============================================================================

export const getProjectUpdates = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId, userId } = getTenantContext(req);
    const { project_id, limit = '50' } = req.query;

    let query = `
      SELECT pu.*, 
        COALESCE(u.first_name || ' ' || u.last_name, u.email, 'System') as author_name,
        cp.project_name
      FROM project_updates pu
      LEFT JOIN users u ON u.id = pu.created_by AND u.tenant_id = pu.tenant_id
      LEFT JOIN client_projects cp ON cp.project_id = pu.project_id AND cp.tenant_id = pu.tenant_id
      WHERE pu.tenant_id = $1
    `;
    const params: any[] = [tenantId];

    if (project_id) {
      params.push(project_id);
      query += ` AND pu.project_id = $${params.length}`;
    }
    query += ` ORDER BY pu.created_at DESC LIMIT $${params.length + 1}`;
    params.push(Number(limit));

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    if (error.message === 'Tenant ID not found') {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    console.error('Error fetching project updates:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch updates' });
  }
};

export const createProjectUpdate = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId, userId } = getTenantContext(req);
    const { project_id, update_type, title, content, is_client_visible } = req.body;

    if (!project_id || !title) {
      return res.status(400).json({ success: false, message: 'project_id and title are required' });
    }

    const result = await pool.query(`
      INSERT INTO project_updates (tenant_id, project_id, update_type, title, content, is_client_visible, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [tenantId, project_id, update_type || 'general', title, content || '', is_client_visible !== false, userId]);

    // Also return author name
    const update = result.rows[0];
    let authorName = 'System';
    if (userId) {
      const userRes = await pool.query(`SELECT first_name, last_name, email FROM users WHERE id = $1 AND tenant_id = $2`, [userId, tenantId]);
      if (userRes.rows.length > 0) {
        const u = userRes.rows[0];
        authorName = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email;
        update.author_name = authorName;
      }
    }

    // Get project details for notifications
    const projectRes = await pool.query(`SELECT project_name, project_number FROM client_projects WHERE project_id = $1 AND tenant_id = $2`, [project_id, tenantId]);
    const projectName = projectRes.rows[0]?.project_name || 'Project';
    const projectNumber = projectRes.rows[0]?.project_number || '';

    // Internal notification: notify all tenant users via system notifications
    try {
      const allUsers = await pool.query(`SELECT id FROM users WHERE tenant_id = $1 AND id != $2`, [tenantId, userId]);
      for (const u of allUsers.rows) {
        await pool.query(`
          INSERT INTO user_notifications (tenant_id, user_id, notification_type, title, message, metadata, is_read)
          VALUES ($1, $2, 'project_update', $3, $4, $5, false)
        `, [
          tenantId,
          u.id,
          `${update_type === 'milestone' ? '🏆 Milestone' : '📋 Update'}: ${projectName}`,
          `${authorName}: ${title}`,
          JSON.stringify({ project_id, update_id: update.id, update_type })
        ]);
      }
    } catch (notifErr) {
      console.error('Failed to create notifications:', notifErr);
    }

    // External email: if update is client-visible, send HTML email
    if (is_client_visible !== false) {
      try {
        // Get client contact email from the project's customer
        const customerRes = await pool.query(`
          SELECT sc.email, sc.contact_person, sc.company_name 
          FROM client_projects cp
          JOIN sales.customers sc ON cp.customer_id = sc.customer_id
          WHERE cp.project_id = $1 AND cp.tenant_id = $2
        `, [project_id, tenantId]);
        
        if (customerRes.rows.length > 0 && customerRes.rows[0].email) {
          const customer = customerRes.rows[0];
          const tenantRes = await pool.query(`SELECT name, company_name FROM tenants WHERE id = $1`, [tenantId]);
          const companyName = tenantRes.rows[0]?.company_name || tenantRes.rows[0]?.name || 'WorldClass ERP';

          const updateTypeLabel = {
            general: 'General Update',
            milestone: 'Milestone Reached',
            status_change: 'Status Change',
            budget: 'Budget Update',
            risk: 'Risk Alert',
            deliverable: 'Deliverable'
          }[update_type || 'general'] || 'Update';

          const updateTypeColor = {
            general: '#1890ff',
            milestone: '#52c41a',
            status_change: '#722ed1',
            budget: '#fa8c16',
            risk: '#ff4d4f',
            deliverable: '#13c2c2'
          }[update_type || 'general'] || '#1890ff';

          const htmlEmail = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Project Update - ${projectName}</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:20px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:30px 40px;text-align:center;">
            <h1 style="color:#ffffff;margin:0;font-size:24px;">📋 Project Update</h1>
            <p style="color:rgba(255,255,255,0.9);margin:8px 0 0;font-size:14px;">${projectNumber} — ${projectName}</p>
          </td>
        </tr>
        <!-- Update Type Badge -->
        <tr>
          <td style="padding:24px 40px 0;">
            <span style="display:inline-block;background:${updateTypeColor};color:#fff;padding:4px 16px;border-radius:12px;font-size:13px;font-weight:600;">${updateTypeLabel}</span>
          </td>
        </tr>
        <!-- Content -->
        <tr>
          <td style="padding:20px 40px;">
            <h2 style="color:#1a1a2e;margin:0 0 12px;font-size:20px;">${title}</h2>
            <div style="color:#4a4a4a;font-size:15px;line-height:1.6;border-left:3px solid ${updateTypeColor};padding-left:16px;">
              ${(content || '').replace(/\n/g, '<br>')}
            </div>
          </td>
        </tr>
        <!-- Meta -->
        <tr>
          <td style="padding:0 40px 24px;">
            <table width="100%" style="background:#f8f9fa;border-radius:6px;padding:16px;">
              <tr>
                <td style="color:#666;font-size:13px;">
                  <strong>Posted by:</strong> ${authorName}<br>
                  <strong>Date:</strong> ${new Date().toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}<br>
                  <strong>Project:</strong> ${projectNumber} — ${projectName}
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f8f9fa;padding:20px 40px;text-align:center;border-top:1px solid #eee;">
            <p style="color:#999;font-size:12px;margin:0;">
              This update was sent from <strong>${companyName}</strong><br>
              <a href="https://siyabusaerp.co.za" style="color:#667eea;text-decoration:none;">Login to view full details</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

          // Get project manager email for CC
          let ccEmails: string[] = [];
          try {
            const pmRes = await pool.query(`
              SELECT u.email FROM client_projects cp
              JOIN users u ON cp.project_manager_id = u.id
              WHERE cp.project_id = $1 AND cp.tenant_id = $2 AND u.email IS NOT NULL
            `, [project_id, tenantId]);
            if (pmRes.rows.length > 0 && pmRes.rows[0].email) {
              // Don't CC the same person who posted (they already know)
              if (pmRes.rows[0].email !== customer.email) {
                ccEmails.push(pmRes.rows[0].email);
              }
            }
            // Also CC project partner if exists
            const partnerRes = await pool.query(`
              SELECT u.email FROM client_projects cp
              JOIN users u ON cp.project_partner_id = u.id
              WHERE cp.project_id = $1 AND cp.tenant_id = $2 AND u.email IS NOT NULL
            `, [project_id, tenantId]);
            if (partnerRes.rows.length > 0 && partnerRes.rows[0].email) {
              if (!ccEmails.includes(partnerRes.rows[0].email) && partnerRes.rows[0].email !== customer.email) {
                ccEmails.push(partnerRes.rows[0].email);
              }
            }
          } catch (ccErr) {
            console.error('Error fetching CC emails:', ccErr);
          }

          await emailService.send({
            to: customer.email,
            cc: ccEmails.length > 0 ? ccEmails : undefined,
            subject: `[${projectNumber}] ${updateTypeLabel}: ${title}`,
            html: htmlEmail,
            text: `${updateTypeLabel}: ${title}\n\n${content || ''}\n\nPosted by: ${authorName}\nProject: ${projectName} (${projectNumber})`
          }).catch((emailErr: any) => {
            console.error('Failed to send update email:', emailErr);
          });
        }
      } catch (emailErr) {
        console.error('Error preparing update email:', emailErr);
      }
    }

    res.status(201).json({ success: true, data: update });
  } catch (error: any) {
    if (error.message === 'Tenant ID not found') {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    console.error('Error creating project update:', error);
    res.status(500).json({ success: false, message: 'Failed to create update' });
  }
};

export const deleteProjectUpdate = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId } = getTenantContext(req);
    const { id } = req.params;

    await pool.query(`DELETE FROM project_updates WHERE id = $1 AND tenant_id = $2`, [id, tenantId]);
    res.json({ success: true, message: 'Update deleted' });
  } catch (error: any) {
    if (error.message === 'Tenant ID not found') {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    console.error('Error deleting project update:', error);
    res.status(500).json({ success: false, message: 'Failed to delete update' });
  }
};

// ============================================================================
// PROJECT MILESTONES
// ============================================================================

export const getProjectMilestones = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId } = getTenantContext(req);
    const { project_id } = req.query;

    let query = `
      SELECT pm.*, cp.project_name, cp.project_number
      FROM project_milestones pm
      JOIN client_projects cp ON pm.project_id = cp.project_id
      WHERE pm.tenant_id = $1
    `;
    const params: any[] = [tenantId];

    if (project_id) {
      params.push(project_id);
      query += ` AND pm.project_id = $${params.length}`;
    }
    query += ` ORDER BY pm.due_date ASC NULLS LAST, pm.created_at ASC`;

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    if (error.message === 'Tenant ID not found') {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    res.status(500).json({ success: false, message: 'Failed to fetch milestones' });
  }
};

export const createMilestone = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId, userId } = getTenantContext(req);
    const { project_id, title, description, due_date, weight } = req.body;

    if (!project_id || !title) {
      return res.status(400).json({ success: false, message: 'project_id and title required' });
    }

    const result = await pool.query(`
      INSERT INTO project_milestones (tenant_id, project_id, title, description, due_date, weight, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
    `, [tenantId, project_id, title, description || '', due_date || null, weight || 1, userId]);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('createMilestone error:', error.message, error.detail || '');
    if (error.message === 'Tenant ID not found') {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    res.status(500).json({ success: false, message: 'Failed to create milestone', error: error.message });
  }
};

export const updateMilestone = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId } = getTenantContext(req);
    const { id } = req.params;
    const { title, description, due_date, status, weight, completed_date } = req.body;

    const result = await pool.query(`
      UPDATE project_milestones SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        due_date = COALESCE($3, due_date),
        status = COALESCE($4, status),
        weight = COALESCE($5, weight),
        completed_date = COALESCE($6, completed_date),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7 AND tenant_id = $8
      RETURNING *
    `, [title, description, due_date, status, weight, completed_date, id, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Milestone not found' });
    }

    // If marking as completed, auto-create a project update
    if (status === 'completed') {
      const milestone = result.rows[0];
      await pool.query(`
        INSERT INTO project_updates (tenant_id, project_id, update_type, title, content, is_client_visible, created_by)
        VALUES ($1, $2, 'milestone', $3, $4, true, $5)
      `, [
        tenantId, milestone.project_id,
        `🏆 Milestone Completed: ${milestone.title}`,
        `The milestone "${milestone.title}" has been completed.${milestone.description ? ' — ' + milestone.description : ''}`,
        req.user?.id
      ]);
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    if (error.message === 'Tenant ID not found') {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    res.status(500).json({ success: false, message: 'Failed to update milestone' });
  }
};

export const deleteMilestone = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId } = getTenantContext(req);
    const { id } = req.params;
    await pool.query(`DELETE FROM project_milestones WHERE id = $1 AND tenant_id = $2`, [id, tenantId]);
    res.json({ success: true, message: 'Milestone deleted' });
  } catch (error: any) {
    if (error.message === 'Tenant ID not found') {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    res.status(500).json({ success: false, message: 'Failed to delete milestone' });
  }
};

export default {
  getAllProjects,
  getProjectById,
  createProject,
  updateProject,
  addTeamMember,
  removeTeamMember,
  getProjectsDashboard,
  getProjectUpdates,
  createProjectUpdate,
  deleteProjectUpdate,
  getProjectMilestones,
  createMilestone,
  updateMilestone,
  deleteMilestone
};
