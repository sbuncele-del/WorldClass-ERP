/**
 * Accountant Portal Controller V2
 * QuickBooks-style multi-client management for accounting firms.
 *
 * Allows external accountants to:
 * - Register their firm
 * - Manage client tenants
 * - Switch context into client tenants with scoped JWT tokens
 * - Invite clients & team members
 * - View consolidated financial summaries
 *
 * IMPORTANT: Uses TenantRequest for typed tenant context from middleware.
 */

import { Response } from 'express';
import { TenantRequest } from '../types';
import pool from '../config/database';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// ============================================================================
// HELPERS
// ============================================================================

function getTenantContext(req: TenantRequest): { tenantId: string; userId: string } {
  const tenantId = req.tenant?.id || req.tenantId;
  const userId = req.user?.id || req.userId;
  if (!tenantId) throw new Error('Tenant ID not found');
  if (!userId) throw new Error('User ID not found');
  return { tenantId, userId };
}

/** Log an accountant action. Fire-and-forget — never blocks the response. */
async function logActivity(
  firmId: string,
  userId: string,
  clientTenantId: string | null,
  action: string,
  resourceType: string | null,
  resourceId: string | null,
  details: Record<string, any> = {},
  ipAddress?: string
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO accountant_activity_log
        (firm_id, user_id, client_tenant_id, action, resource_type, resource_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [firmId, userId, clientTenantId, action, resourceType, resourceId, JSON.stringify(details), ipAddress || null]
    );
  } catch (err) {
    console.error('Failed to log accountant activity:', err);
  }
}

/** Resolve the firm row for the current tenant. Returns null when not found. */
async function getFirmForTenant(tenantId: string) {
  const result = await pool.query(
    'SELECT * FROM accountant_firms WHERE tenant_id = $1 AND is_active = TRUE',
    [tenantId]
  );
  return result.rows[0] || null;
}

// ============================================================================
// FIRM MANAGEMENT
// ============================================================================

/**
 * GET /accountant-portal/firm
 * Retrieve the accountant firm profile for the current tenant.
 */
export const getFirmProfile = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { tenantId } = getTenantContext(req);

    const result = await pool.query(
      `SELECT af.*, t.name AS tenant_name, t.slug AS tenant_slug,
              (SELECT COUNT(*) FROM accountant_client_mappings acm WHERE acm.firm_id = af.id AND acm.status = 'active') AS active_clients,
              (SELECT COUNT(*) FROM accountant_invitations ai WHERE ai.firm_id = af.id AND ai.status = 'pending') AS pending_invitations
       FROM accountant_firms af
       JOIN tenants t ON af.tenant_id = t.id
       WHERE af.tenant_id = $1`,
      [tenantId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Accountant firm not found for this tenant' });
      return;
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    console.error('getFirmProfile error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * PUT /accountant-portal/firm
 * Create or update the accountant firm profile.
 */
export const createOrUpdateFirm = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { tenantId, userId } = getTenantContext(req);
    const {
      firm_name, registration_number, tax_number, practice_number,
      firm_type, contact_email, contact_phone, website,
      address, city, province, postal_code, country,
      logo_url, subscription_tier, max_clients, settings
    } = req.body;

    if (!firm_name || firm_name.trim().length === 0) {
      res.status(400).json({ success: false, error: 'firm_name is required' });
      return;
    }

    // Check if firm already exists for this tenant
    const existing = await pool.query(
      'SELECT id FROM accountant_firms WHERE tenant_id = $1',
      [tenantId]
    );

    let result;
    if (existing.rows.length > 0) {
      // Update
      result = await pool.query(
        `UPDATE accountant_firms SET
          firm_name = COALESCE($2, firm_name),
          registration_number = COALESCE($3, registration_number),
          tax_number = COALESCE($4, tax_number),
          practice_number = COALESCE($5, practice_number),
          firm_type = COALESCE($6, firm_type),
          contact_email = COALESCE($7, contact_email),
          contact_phone = COALESCE($8, contact_phone),
          website = COALESCE($9, website),
          address = COALESCE($10, address),
          city = COALESCE($11, city),
          province = COALESCE($12, province),
          postal_code = COALESCE($13, postal_code),
          country = COALESCE($14, country),
          logo_url = COALESCE($15, logo_url),
          subscription_tier = COALESCE($16, subscription_tier),
          max_clients = COALESCE($17, max_clients),
          settings = COALESCE($18, settings),
          updated_at = NOW()
        WHERE tenant_id = $1
        RETURNING *`,
        [
          tenantId, firm_name, registration_number, tax_number, practice_number,
          firm_type, contact_email, contact_phone, website,
          address, city, province, postal_code, country,
          logo_url, subscription_tier, max_clients,
          settings ? JSON.stringify(settings) : null
        ]
      );
    } else {
      // Create
      result = await pool.query(
        `INSERT INTO accountant_firms
          (tenant_id, firm_name, registration_number, tax_number, practice_number,
           firm_type, contact_email, contact_phone, website,
           address, city, province, postal_code, country,
           logo_url, subscription_tier, max_clients, settings)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
        RETURNING *`,
        [
          tenantId, firm_name, registration_number || null, tax_number || null, practice_number || null,
          firm_type || 'accounting', contact_email || null, contact_phone || null, website || null,
          address || null, city || null, province || null, postal_code || null, country || 'South Africa',
          logo_url || null, subscription_tier || 'professional', max_clients || 50,
          settings ? JSON.stringify(settings) : '{}'
        ]
      );
    }

    const firm = result.rows[0];
    await logActivity(firm.id, userId, null, existing.rows.length ? 'firm_updated' : 'firm_created', 'accountant_firms', firm.id, { firm_name }, req.ip);

    res.json({ success: true, data: firm });
  } catch (err: any) {
    console.error('createOrUpdateFirm error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /accountant-portal/dashboard
 * Firm dashboard — client count, revenue metrics, upcoming deadlines.
 */
export const getFirmDashboard = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { tenantId } = getTenantContext(req);

    const firm = await getFirmForTenant(tenantId);
    if (!firm) {
      res.status(404).json({ success: false, error: 'Accountant firm not found' });
      return;
    }

    // Client statistics
    const clientStats = await pool.query(
      `SELECT
        COUNT(*) FILTER (WHERE status = 'active')      AS active_clients,
        COUNT(*) FILTER (WHERE status = 'paused')       AS paused_clients,
        COUNT(*) FILTER (WHERE status = 'terminated')   AS terminated_clients,
        COUNT(*)                                         AS total_clients
       FROM accountant_client_mappings
       WHERE firm_id = $1`,
      [firm.id]
    );

    // Revenue by engagement type
    const revenueByType = await pool.query(
      `SELECT engagement_type,
              COUNT(*) AS client_count,
              SUM(billing_rate) AS total_billing
       FROM accountant_client_mappings
       WHERE firm_id = $1 AND status = 'active'
       GROUP BY engagement_type`,
      [firm.id]
    );

    // Pending invitations
    const pendingInvitations = await pool.query(
      `SELECT COUNT(*) AS count FROM accountant_invitations
       WHERE firm_id = $1 AND status = 'pending' AND expires_at > NOW()`,
      [firm.id]
    );

    // Recent activity
    const recentActivity = await pool.query(
      `SELECT aal.*, u.first_name, u.last_name, u.email AS user_email
       FROM accountant_activity_log aal
       JOIN users u ON aal.user_id = u.id
       WHERE aal.firm_id = $1
       ORDER BY aal.created_at DESC
       LIMIT 20`,
      [firm.id]
    );

    res.json({
      success: true,
      data: {
        firm: {
          id: firm.id,
          firm_name: firm.firm_name,
          subscription_tier: firm.subscription_tier,
          max_clients: firm.max_clients
        },
        stats: clientStats.rows[0],
        revenue_by_type: revenueByType.rows,
        pending_invitations: parseInt(pendingInvitations.rows[0]?.count || '0', 10),
        recent_activity: recentActivity.rows
      }
    });
  } catch (err: any) {
    console.error('getFirmDashboard error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ============================================================================
// CLIENT MANAGEMENT
// ============================================================================

/**
 * GET /accountant-portal/clients
 * List all clients for the firm with tenant details.
 */
export const getClients = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { tenantId } = getTenantContext(req);

    const firm = await getFirmForTenant(tenantId);
    if (!firm) {
      res.status(404).json({ success: false, error: 'Accountant firm not found' });
      return;
    }

    const { status, engagement_type, search } = req.query;

    let sql = `
      SELECT acm.*,
             t.name    AS client_name,
             t.slug    AS client_slug,
             t.status  AS tenant_status,
             u.first_name AS accountant_first_name,
             u.last_name  AS accountant_last_name,
             u.email       AS accountant_email
      FROM accountant_client_mappings acm
      JOIN tenants t ON acm.client_tenant_id = t.id
      LEFT JOIN users u ON acm.assigned_accountant_id = u.id
      WHERE acm.firm_id = $1
    `;
    const params: any[] = [firm.id];
    let paramIdx = 2;

    if (status && status !== 'all') {
      sql += ` AND acm.status = $${paramIdx}`;
      params.push(status);
      paramIdx++;
    }

    if (engagement_type) {
      sql += ` AND acm.engagement_type = $${paramIdx}`;
      params.push(engagement_type);
      paramIdx++;
    }

    if (search) {
      sql += ` AND (t.name ILIKE $${paramIdx} OR t.slug ILIKE $${paramIdx})`;
      params.push(`%${search}%`);
      paramIdx++;
    }

    sql += ' ORDER BY t.name ASC';

    const result = await pool.query(sql, params);
    res.json({ success: true, data: result.rows, total: result.rowCount });
  } catch (err: any) {
    console.error('getClients error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /accountant-portal/clients/:clientTenantId
 * Get client detail with financial summary.
 */
export const getClientDetail = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { tenantId } = getTenantContext(req);
    const { clientTenantId } = req.params;

    if (!clientTenantId) {
      res.status(400).json({ success: false, error: 'clientTenantId is required' });
      return;
    }

    const firm = await getFirmForTenant(tenantId);
    if (!firm) {
      res.status(404).json({ success: false, error: 'Accountant firm not found' });
      return;
    }

    // Verify mapping exists
    const mapping = await pool.query(
      `SELECT acm.*, t.name AS client_name, t.slug AS client_slug, t.status AS tenant_status,
              u.first_name AS accountant_first_name, u.last_name AS accountant_last_name
       FROM accountant_client_mappings acm
       JOIN tenants t ON acm.client_tenant_id = t.id
       LEFT JOIN users u ON acm.assigned_accountant_id = u.id
       WHERE acm.firm_id = $1 AND acm.client_tenant_id = $2`,
      [firm.id, clientTenantId]
    );

    if (mapping.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Client not found for this firm' });
      return;
    }

    // Attempt to pull basic financial summary from the client tenant
    let financialSummary: any = null;
    try {
      const glSummary = await pool.query(
        `SELECT
          (SELECT COUNT(*) FROM journal_entries WHERE tenant_id = $1) AS total_journal_entries,
          (SELECT COUNT(*) FROM journal_entries WHERE tenant_id = $1 AND status = 'POSTED') AS posted_entries,
          (SELECT COUNT(*) FROM journal_entries WHERE tenant_id = $1 AND status = 'DRAFT') AS draft_entries,
          (SELECT COUNT(*) FROM invoices WHERE tenant_id = $1) AS total_invoices,
          (SELECT COUNT(*) FROM invoices WHERE tenant_id = $1 AND status = 'paid') AS paid_invoices,
          (SELECT COUNT(*) FROM invoices WHERE tenant_id = $1 AND status IN ('sent','overdue')) AS outstanding_invoices
        `,
        [clientTenantId]
      );
      financialSummary = glSummary.rows[0];
    } catch {
      // Tables may not exist for this tenant — non-critical
      financialSummary = null;
    }

    // Recent activity for this client
    const recentActivity = await pool.query(
      `SELECT aal.*, u.first_name, u.last_name
       FROM accountant_activity_log aal
       JOIN users u ON aal.user_id = u.id
       WHERE aal.firm_id = $1 AND aal.client_tenant_id = $2
       ORDER BY aal.created_at DESC
       LIMIT 20`,
      [firm.id, clientTenantId]
    );

    res.json({
      success: true,
      data: {
        mapping: mapping.rows[0],
        financial_summary: financialSummary,
        recent_activity: recentActivity.rows
      }
    });
  } catch (err: any) {
    console.error('getClientDetail error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * POST /accountant-portal/clients
 * Map an existing tenant as a client of this firm.
 */
export const addExistingClient = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { tenantId, userId } = getTenantContext(req);
    const {
      client_tenant_id, assigned_accountant_id, engagement_type,
      access_level, billing_rate, billing_currency, notes, permissions
    } = req.body;

    if (!client_tenant_id) {
      res.status(400).json({ success: false, error: 'client_tenant_id is required' });
      return;
    }

    const firm = await getFirmForTenant(tenantId);
    if (!firm) {
      res.status(404).json({ success: false, error: 'Accountant firm not found' });
      return;
    }

    // Check client limit
    const clientCount = await pool.query(
      `SELECT COUNT(*) AS count FROM accountant_client_mappings WHERE firm_id = $1 AND status = 'active'`,
      [firm.id]
    );
    if (parseInt(clientCount.rows[0].count, 10) >= firm.max_clients) {
      res.status(400).json({ success: false, error: `Client limit reached (${firm.max_clients}). Upgrade your subscription to add more clients.` });
      return;
    }

    // Verify the target tenant exists
    const clientTenant = await pool.query('SELECT id, name FROM tenants WHERE id = $1', [client_tenant_id]);
    if (clientTenant.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Client tenant not found' });
      return;
    }

    // Prevent self-mapping
    if (client_tenant_id === tenantId) {
      res.status(400).json({ success: false, error: 'Cannot add your own tenant as a client' });
      return;
    }

    // Upsert mapping
    const result = await pool.query(
      `INSERT INTO accountant_client_mappings
        (firm_id, client_tenant_id, assigned_accountant_id, engagement_type, access_level,
         billing_rate, billing_currency, notes, permissions)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (firm_id, client_tenant_id)
       DO UPDATE SET
         assigned_accountant_id = COALESCE(EXCLUDED.assigned_accountant_id, accountant_client_mappings.assigned_accountant_id),
         engagement_type = COALESCE(EXCLUDED.engagement_type, accountant_client_mappings.engagement_type),
         access_level = COALESCE(EXCLUDED.access_level, accountant_client_mappings.access_level),
         billing_rate = COALESCE(EXCLUDED.billing_rate, accountant_client_mappings.billing_rate),
         billing_currency = COALESCE(EXCLUDED.billing_currency, accountant_client_mappings.billing_currency),
         notes = COALESCE(EXCLUDED.notes, accountant_client_mappings.notes),
         permissions = COALESCE(EXCLUDED.permissions, accountant_client_mappings.permissions),
         status = 'active',
         updated_at = NOW()
       RETURNING *`,
      [
        firm.id, client_tenant_id, assigned_accountant_id || null,
        engagement_type || 'full_service', access_level || 'financial',
        billing_rate || null, billing_currency || 'ZAR',
        notes || null,
        permissions ? JSON.stringify(permissions) : '["gl","ap","ar","reports","tax","bank_reconciliation"]'
      ]
    );

    await logActivity(firm.id, userId, client_tenant_id, 'client_added', 'accountant_client_mappings', result.rows[0].id, {
      client_name: clientTenant.rows[0].name,
      engagement_type: engagement_type || 'full_service'
    }, req.ip);

    res.json({ success: true, data: result.rows[0], message: 'Client added successfully' });
  } catch (err: any) {
    console.error('addExistingClient error:', err);
    if (err.code === '23505') {
      res.status(409).json({ success: false, error: 'This client is already mapped to your firm' });
      return;
    }
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * DELETE /accountant-portal/clients/:clientTenantId
 * Soft-remove: set mapping status to 'terminated'.
 */
export const removeClient = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { tenantId, userId } = getTenantContext(req);
    const { clientTenantId } = req.params;

    const firm = await getFirmForTenant(tenantId);
    if (!firm) {
      res.status(404).json({ success: false, error: 'Accountant firm not found' });
      return;
    }

    const result = await pool.query(
      `UPDATE accountant_client_mappings
       SET status = 'terminated', end_date = CURRENT_DATE, updated_at = NOW()
       WHERE firm_id = $1 AND client_tenant_id = $2 AND status != 'terminated'
       RETURNING *`,
      [firm.id, clientTenantId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Active client mapping not found' });
      return;
    }

    await logActivity(firm.id, userId, clientTenantId, 'client_removed', 'accountant_client_mappings', result.rows[0].id, {}, req.ip);

    res.json({ success: true, data: result.rows[0], message: 'Client removed successfully' });
  } catch (err: any) {
    console.error('removeClient error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * PUT /accountant-portal/clients/:clientTenantId
 * Update engagement type, access level, billing, notes, etc.
 */
export const updateClientEngagement = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { tenantId, userId } = getTenantContext(req);
    const { clientTenantId } = req.params;
    const {
      assigned_accountant_id, engagement_type, access_level,
      status, billing_rate, billing_currency, notes, permissions
    } = req.body;

    const firm = await getFirmForTenant(tenantId);
    if (!firm) {
      res.status(404).json({ success: false, error: 'Accountant firm not found' });
      return;
    }

    const result = await pool.query(
      `UPDATE accountant_client_mappings SET
        assigned_accountant_id = COALESCE($3, assigned_accountant_id),
        engagement_type = COALESCE($4, engagement_type),
        access_level = COALESCE($5, access_level),
        status = COALESCE($6, status),
        billing_rate = COALESCE($7, billing_rate),
        billing_currency = COALESCE($8, billing_currency),
        notes = COALESCE($9, notes),
        permissions = COALESCE($10, permissions),
        updated_at = NOW()
       WHERE firm_id = $1 AND client_tenant_id = $2
       RETURNING *`,
      [
        firm.id, clientTenantId,
        assigned_accountant_id || null, engagement_type || null, access_level || null,
        status || null, billing_rate || null, billing_currency || null,
        notes || null, permissions ? JSON.stringify(permissions) : null
      ]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Client mapping not found' });
      return;
    }

    await logActivity(firm.id, userId, clientTenantId, 'client_engagement_updated', 'accountant_client_mappings', result.rows[0].id, req.body, req.ip);

    res.json({ success: true, data: result.rows[0], message: 'Client engagement updated' });
  } catch (err: any) {
    console.error('updateClientEngagement error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ============================================================================
// CLIENT CONTEXT SWITCHING
// ============================================================================

/**
 * POST /accountant-portal/switch/:clientTenantId
 * Generate a scoped JWT for the accountant to operate within a client's tenant.
 */
export const switchToClient = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { tenantId, userId } = getTenantContext(req);
    const { clientTenantId } = req.params;

    if (!clientTenantId) {
      res.status(400).json({ success: false, error: 'clientTenantId is required' });
      return;
    }

    // Verify the firm has an active mapping to this client
    const mapping = await pool.query(
      `SELECT acm.* FROM accountant_client_mappings acm
       JOIN accountant_firms af ON acm.firm_id = af.id
       WHERE af.tenant_id = $1 AND acm.client_tenant_id = $2 AND acm.status = 'active'`,
      [tenantId, clientTenantId]
    );

    if (mapping.rows.length === 0) {
      res.status(403).json({ success: false, error: 'No active client mapping found. Access denied.' });
      return;
    }

    // Get client tenant info
    const clientTenant = await pool.query('SELECT * FROM tenants WHERE id = $1', [clientTenantId]);
    if (clientTenant.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Client tenant not found' });
      return;
    }

    const client = clientTenant.rows[0];
    const mappingRow = mapping.rows[0];

    // Generate cross-tenant scoped token
    const accessToken = jwt.sign(
      {
        userId,
        tenantId: clientTenantId,          // Client's tenant — enables cross-tenant work
        email: req.user?.email,
        role: 'accountant',
        type: 'access',
        firmTenantId: tenantId,            // Remember firm's own tenant
        isAccountantAccess: true,
        accessLevel: mappingRow.access_level,
        permissions: mappingRow.permissions
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Log the switch
    const firm = await getFirmForTenant(tenantId);
    if (firm) {
      await logActivity(firm.id, userId, clientTenantId, 'switch_to_client', 'tenants', clientTenantId, {
        client_name: client.name,
        access_level: mappingRow.access_level
      }, req.ip);
    }

    res.json({
      success: true,
      data: {
        access_token: accessToken,
        client_tenant: {
          id: client.id,
          name: client.name,
          slug: client.slug,
          status: client.status
        },
        access_level: mappingRow.access_level,
        permissions: mappingRow.permissions,
        firm_tenant_id: tenantId
      },
      message: `Switched to client: ${client.name}`
    });
  } catch (err: any) {
    console.error('switchToClient error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * POST /accountant-portal/switch-back
 * Generate a token back to the accountant's firm tenant.
 */
export const switchBackToFirm = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id || req.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    // firmTenantId can come from the JWT claim (set during switchToClient)
    const firmTenantId = (req as any).user?.firmTenantId || req.body.firm_tenant_id;
    if (!firmTenantId) {
      res.status(400).json({ success: false, error: 'firm_tenant_id is required (pass in body or use the accountant-scoped token)' });
      return;
    }

    // Verify the firm tenant exists
    const firmTenant = await pool.query('SELECT * FROM tenants WHERE id = $1', [firmTenantId]);
    if (firmTenant.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Firm tenant not found' });
      return;
    }

    // Get user data from firm tenant
    const userResult = await pool.query(
      'SELECT id, email, role FROM users WHERE id = $1 AND tenant_id = $2',
      [userId, firmTenantId]
    );

    const userRow = userResult.rows[0];
    const userRole = userRow?.role || 'accountant';
    const userEmail = userRow?.email || req.user?.email;

    const accessToken = jwt.sign(
      {
        userId,
        tenantId: firmTenantId,
        email: userEmail,
        role: userRole,
        type: 'access'
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      data: {
        access_token: accessToken,
        firm_tenant: {
          id: firmTenant.rows[0].id,
          name: firmTenant.rows[0].name,
          slug: firmTenant.rows[0].slug
        }
      },
      message: `Switched back to firm: ${firmTenant.rows[0].name}`
    });
  } catch (err: any) {
    console.error('switchBackToFirm error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ============================================================================
// INVITATIONS
// ============================================================================

/**
 * POST /accountant-portal/invitations/client
 * Invite a client business to be managed by this firm.
 */
export const inviteClient = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { tenantId, userId } = getTenantContext(req);
    const { email, name, company, engagement_type, message } = req.body;

    if (!email) {
      res.status(400).json({ success: false, error: 'email is required' });
      return;
    }

    const firm = await getFirmForTenant(tenantId);
    if (!firm) {
      res.status(404).json({ success: false, error: 'Accountant firm not found' });
      return;
    }

    // Check if invitation already pending for this email
    const existingInv = await pool.query(
      `SELECT id FROM accountant_invitations
       WHERE firm_id = $1 AND invitee_email = $2 AND status = 'pending' AND expires_at > NOW()`,
      [firm.id, email.toLowerCase()]
    );
    if (existingInv.rows.length > 0) {
      res.status(409).json({ success: false, error: 'A pending invitation already exists for this email' });
      return;
    }

    const token = crypto.randomUUID();

    const result = await pool.query(
      `INSERT INTO accountant_invitations
        (firm_id, invitation_type, invitee_email, invitee_name, invitee_company,
         invited_by, token, engagement_type, message)
       VALUES ($1, 'client', $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [firm.id, email.toLowerCase(), name || null, company || null, userId, token, engagement_type || 'full_service', message || null]
    );

    await logActivity(firm.id, userId, null, 'client_invited', 'accountant_invitations', result.rows[0].id, {
      invitee_email: email,
      invitee_company: company
    }, req.ip);

    // In production, send email here (e.g. via Resend or SES)
    // For now, return the invitation with the token
    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: `Invitation sent to ${email}`,
      invitation_link: `/accountant-portal/invitations/accept?token=${token}`
    });
  } catch (err: any) {
    console.error('inviteClient error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * POST /accountant-portal/invitations/team
 * Invite an accountant to join the firm's tenant.
 */
export const inviteTeamMember = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { tenantId, userId } = getTenantContext(req);
    const { email, name, message } = req.body;

    if (!email) {
      res.status(400).json({ success: false, error: 'email is required' });
      return;
    }

    const firm = await getFirmForTenant(tenantId);
    if (!firm) {
      res.status(404).json({ success: false, error: 'Accountant firm not found' });
      return;
    }

    // Check if invitation already pending
    const existingInv = await pool.query(
      `SELECT id FROM accountant_invitations
       WHERE firm_id = $1 AND invitee_email = $2 AND invitation_type = 'team'
             AND status = 'pending' AND expires_at > NOW()`,
      [firm.id, email.toLowerCase()]
    );
    if (existingInv.rows.length > 0) {
      res.status(409).json({ success: false, error: 'A pending team invitation already exists for this email' });
      return;
    }

    const token = crypto.randomUUID();

    const result = await pool.query(
      `INSERT INTO accountant_invitations
        (firm_id, invitation_type, invitee_email, invitee_name, invited_by, token, message)
       VALUES ($1, 'team', $2, $3, $4, $5, $6)
       RETURNING *`,
      [firm.id, email.toLowerCase(), name || null, userId, token, message || null]
    );

    await logActivity(firm.id, userId, null, 'team_member_invited', 'accountant_invitations', result.rows[0].id, {
      invitee_email: email
    }, req.ip);

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: `Team invitation sent to ${email}`,
      invitation_link: `/accountant-portal/invitations/accept?token=${token}`
    });
  } catch (err: any) {
    console.error('inviteTeamMember error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /accountant-portal/invitations
 * List all invitations for the firm.
 */
export const getInvitations = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { tenantId } = getTenantContext(req);

    const firm = await getFirmForTenant(tenantId);
    if (!firm) {
      res.status(404).json({ success: false, error: 'Accountant firm not found' });
      return;
    }

    const { status, invitation_type } = req.query;

    let sql = `
      SELECT ai.*, u.first_name AS invited_by_first_name, u.last_name AS invited_by_last_name
      FROM accountant_invitations ai
      JOIN users u ON ai.invited_by = u.id
      WHERE ai.firm_id = $1
    `;
    const params: any[] = [firm.id];
    let paramIdx = 2;

    if (status) {
      sql += ` AND ai.status = $${paramIdx}`;
      params.push(status);
      paramIdx++;
    }

    if (invitation_type) {
      sql += ` AND ai.invitation_type = $${paramIdx}`;
      params.push(invitation_type);
      paramIdx++;
    }

    sql += ' ORDER BY ai.created_at DESC';

    const result = await pool.query(sql, params);
    res.json({ success: true, data: result.rows, total: result.rowCount });
  } catch (err: any) {
    console.error('getInvitations error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * DELETE /accountant-portal/invitations/:id
 * Cancel a pending invitation.
 */
export const cancelInvitation = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { tenantId, userId } = getTenantContext(req);
    const { id } = req.params;

    const firm = await getFirmForTenant(tenantId);
    if (!firm) {
      res.status(404).json({ success: false, error: 'Accountant firm not found' });
      return;
    }

    const result = await pool.query(
      `UPDATE accountant_invitations
       SET status = 'expired'
       WHERE id = $1 AND firm_id = $2 AND status = 'pending'
       RETURNING *`,
      [id, firm.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Pending invitation not found' });
      return;
    }

    await logActivity(firm.id, userId, null, 'invitation_cancelled', 'accountant_invitations', id, {
      invitee_email: result.rows[0].invitee_email
    }, req.ip);

    res.json({ success: true, data: result.rows[0], message: 'Invitation cancelled' });
  } catch (err: any) {
    console.error('cancelInvitation error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * POST /accountant-portal/invitations/accept
 * PUBLIC endpoint — no auth middleware.
 * Accept an invitation by token.
 */
export const acceptInvitation = async (req: TenantRequest, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const { token } = req.body;

    if (!token) {
      res.status(400).json({ success: false, error: 'token is required' });
      return;
    }

    await client.query('BEGIN');

    // Find the invitation
    const invResult = await client.query(
      `SELECT ai.*, af.tenant_id AS firm_tenant_id, af.firm_name
       FROM accountant_invitations ai
       JOIN accountant_firms af ON ai.firm_id = af.id
       WHERE ai.token = $1`,
      [token]
    );

    if (invResult.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ success: false, error: 'Invitation not found' });
      return;
    }

    const invitation = invResult.rows[0];

    if (invitation.status !== 'pending') {
      await client.query('ROLLBACK');
      res.status(400).json({ success: false, error: `Invitation has already been ${invitation.status}` });
      return;
    }

    if (new Date(invitation.expires_at) < new Date()) {
      await client.query(
        `UPDATE accountant_invitations SET status = 'expired' WHERE id = $1`,
        [invitation.id]
      );
      await client.query('COMMIT');
      res.status(410).json({ success: false, error: 'Invitation has expired' });
      return;
    }

    if (invitation.invitation_type === 'client') {
      // --- CLIENT INVITATION ---
      // Check if invitee already has a tenant
      const existingUser = await client.query(
        'SELECT u.id, u.tenant_id FROM users u WHERE u.email = $1 LIMIT 1',
        [invitation.invitee_email]
      );

      let clientTenantId: string;

      if (existingUser.rows.length > 0) {
        // Existing user — map their tenant
        clientTenantId = existingUser.rows[0].tenant_id;
      } else {
        // New user — create tenant + user
        const slug = (invitation.invitee_company || invitation.invitee_email.split('@')[0])
          .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

        const newTenant = await client.query(
          `INSERT INTO tenants (name, slug, status, subscription_plan)
           VALUES ($1, $2, 'active', 'professional')
           RETURNING id`,
          [invitation.invitee_company || invitation.invitee_name || invitation.invitee_email, slug]
        );
        clientTenantId = newTenant.rows[0].id;

        // Create user with a temporary password hash (user must reset)
        const tempPasswordHash = '$2b$10$placeholder_hash_requires_reset';
        await client.query(
          `INSERT INTO users (tenant_id, email, first_name, role, password_hash, is_active)
           VALUES ($1, $2, $3, 'admin', $4, TRUE)`,
          [clientTenantId, invitation.invitee_email, invitation.invitee_name || '', tempPasswordHash]
        );
      }

      // Create the mapping
      await client.query(
        `INSERT INTO accountant_client_mappings
          (firm_id, client_tenant_id, engagement_type, status)
         VALUES ($1, $2, $3, 'active')
         ON CONFLICT (firm_id, client_tenant_id) DO UPDATE SET status = 'active', updated_at = NOW()`,
        [invitation.firm_id, clientTenantId, invitation.engagement_type || 'full_service']
      );

      // Mark invitation as accepted
      await client.query(
        `UPDATE accountant_invitations SET status = 'accepted', accepted_at = NOW(), client_tenant_id = $2 WHERE id = $1`,
        [invitation.id, clientTenantId]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        message: `Invitation accepted! Your business is now managed by ${invitation.firm_name}.`,
        data: {
          firm_name: invitation.firm_name,
          client_tenant_id: clientTenantId,
          engagement_type: invitation.engagement_type
        }
      });
    } else if (invitation.invitation_type === 'team') {
      // --- TEAM INVITATION ---
      // Create user under the firm's tenant with role 'accountant'
      const existingUser = await client.query(
        'SELECT id FROM users WHERE email = $1 AND tenant_id = $2',
        [invitation.invitee_email, invitation.firm_tenant_id]
      );

      if (existingUser.rows.length > 0) {
        await client.query('ROLLBACK');
        res.status(409).json({ success: false, error: 'User already exists in this firm' });
        return;
      }

      const tempPasswordHash = '$2b$10$placeholder_hash_requires_reset';
      await client.query(
        `INSERT INTO users (tenant_id, email, first_name, role, password_hash, is_active)
         VALUES ($1, $2, $3, 'accountant', $4, TRUE)`,
        [invitation.firm_tenant_id, invitation.invitee_email, invitation.invitee_name || '', tempPasswordHash]
      );

      // Mark invitation as accepted
      await client.query(
        `UPDATE accountant_invitations SET status = 'accepted', accepted_at = NOW() WHERE id = $1`,
        [invitation.id]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        message: `Welcome to ${invitation.firm_name}! Your account has been created. Please set your password.`,
        data: {
          firm_name: invitation.firm_name,
          email: invitation.invitee_email,
          role: 'accountant'
        }
      });
    } else {
      await client.query('ROLLBACK');
      res.status(400).json({ success: false, error: `Unknown invitation type: ${invitation.invitation_type}` });
    }
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('acceptInvitation error:', err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
};

// ============================================================================
// ACTIVITY & REPORTS
// ============================================================================

/**
 * GET /accountant-portal/activity
 * Audit log of accountant actions across clients.
 */
export const getActivityLog = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { tenantId } = getTenantContext(req);

    const firm = await getFirmForTenant(tenantId);
    if (!firm) {
      res.status(404).json({ success: false, error: 'Accountant firm not found' });
      return;
    }

    // Support both camelCase (frontend) and snake_case (legacy) param names
    const clientTenantId = (req.query.clientTenantId || req.query.client_tenant_id) as string | undefined;
    const userId = req.query.user_id as string | undefined;
    const action = req.query.action as string | undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    const search = req.query.search as string | undefined;

    // Support page-based pagination (frontend) and offset-based (legacy)
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 20, 500);
    const offset = req.query.offset !== undefined
      ? parseInt(req.query.offset as string, 10) || 0
      : (page - 1) * limit;

    const params: any[] = [firm.id];
    let paramIdx = 2;
    let whereClause = `WHERE aal.firm_id = $1`;

    if (clientTenantId) {
      whereClause += ` AND aal.client_tenant_id = $${paramIdx++}`;
      params.push(clientTenantId);
    }

    if (userId) {
      whereClause += ` AND aal.user_id = $${paramIdx++}`;
      params.push(userId);
    }

    if (action) {
      whereClause += ` AND aal.action = $${paramIdx++}`;
      params.push(action);
    }

    if (startDate) {
      whereClause += ` AND aal.created_at >= $${paramIdx++}`;
      params.push(startDate);
    }

    if (endDate) {
      whereClause += ` AND aal.created_at <= $${paramIdx++}`;
      params.push(endDate);
    }

    if (search) {
      whereClause += ` AND (aal.details::text ILIKE $${paramIdx} OR COALESCE(u.first_name,'') ILIKE $${paramIdx} OR COALESCE(u.last_name,'') ILIKE $${paramIdx} OR COALESCE(t.name,'') ILIKE $${paramIdx})`;
      params.push(`%${search}%`);
      paramIdx++;
    }

    const sql = `
      SELECT
        aal.id,
        aal.created_at AS timestamp,
        COALESCE(u.first_name || ' ' || u.last_name, u.email, 'Unknown') AS user_name,
        u.email AS user_email,
        t.name AS client_name,
        aal.client_tenant_id,
        aal.action,
        aal.resource_type,
        aal.resource_id,
        aal.details::text AS details,
        aal.ip_address
      FROM accountant_activity_log aal
      LEFT JOIN users u ON aal.user_id = u.id
      LEFT JOIN tenants t ON aal.client_tenant_id = t.id
      ${whereClause}
      ORDER BY aal.created_at DESC
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
    `;
    params.push(limit, offset);

    const result = await pool.query(sql, params);

    // Count with same filters (without pagination params)
    const countParams = params.slice(0, -2);
    const countSql = `
      SELECT COUNT(*)
      FROM accountant_activity_log aal
      LEFT JOIN users u ON aal.user_id = u.id
      LEFT JOIN tenants t ON aal.client_tenant_id = t.id
      ${whereClause}
    `;
    const countResult = await pool.query(countSql, countParams);

    res.json({
      success: true,
      data: {
        entries: result.rows,
        total: parseInt(countResult.rows[0].count, 10),
      }
    });
  } catch (err: any) {
    console.error('getActivityLog error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /accountant-portal/financial-summary
 * Pull financial data across all active clients.
 */
export const getClientFinancialSummary = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { tenantId } = getTenantContext(req);

    const firm = await getFirmForTenant(tenantId);
    if (!firm) {
      res.status(404).json({ success: false, error: 'Accountant firm not found' });
      return;
    }

    // Get all active client tenant IDs
    const mappings = await pool.query(
      `SELECT acm.client_tenant_id, t.name AS client_name
       FROM accountant_client_mappings acm
       JOIN tenants t ON acm.client_tenant_id = t.id
       WHERE acm.firm_id = $1 AND acm.status = 'active'`,
      [firm.id]
    );

    if (mappings.rows.length === 0) {
      res.json({ success: true, data: [], message: 'No active clients' });
      return;
    }

    const clientSummaries = [];

    for (const row of mappings.rows) {
      const cid = row.client_tenant_id;
      let summary: any = {
        client_tenant_id: cid,
        client_name: row.client_name
      };

      try {
        // Journal entries summary
        const jeSummary = await pool.query(
          `SELECT
             COUNT(*) FILTER (WHERE status = 'POSTED')  AS posted_entries,
             COUNT(*) FILTER (WHERE status = 'DRAFT')   AS draft_entries,
             COUNT(*)                                     AS total_entries
           FROM journal_entries WHERE tenant_id = $1`,
          [cid]
        );
        summary = { ...summary, ...jeSummary.rows[0] };
      } catch {
        // table may not exist
      }

      try {
        // Invoices summary
        const invSummary = await pool.query(
          `SELECT
             COUNT(*)                                          AS total_invoices,
             COUNT(*) FILTER (WHERE status = 'paid')           AS paid_invoices,
             COUNT(*) FILTER (WHERE status IN ('sent','overdue')) AS outstanding_invoices,
             COALESCE(SUM(total_amount) FILTER (WHERE status IN ('sent','overdue')), 0) AS outstanding_amount
           FROM invoices WHERE tenant_id = $1`,
          [cid]
        );
        summary = { ...summary, ...invSummary.rows[0] };
      } catch {
        // table may not exist
      }

      try {
        // Bills / AP summary
        const billsSummary = await pool.query(
          `SELECT
             COUNT(*)                                       AS total_bills,
             COUNT(*) FILTER (WHERE status = 'paid')        AS paid_bills,
             COUNT(*) FILTER (WHERE status IN ('pending','overdue')) AS unpaid_bills,
             COALESCE(SUM(total_amount) FILTER (WHERE status IN ('pending','overdue')), 0) AS unpaid_amount
           FROM bills WHERE tenant_id = $1`,
          [cid]
        );
        summary = { ...summary, ...billsSummary.rows[0] };
      } catch {
        // table may not exist
      }

      clientSummaries.push(summary);
    }

    res.json({ success: true, data: clientSummaries, total: clientSummaries.length });
  } catch (err: any) {
    console.error('getClientFinancialSummary error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ============================================================================
// JOBS / WORK MANAGEMENT
// ============================================================================

/**
 * GET /accountant-portal/jobs
 * List all jobs for the firm, with optional filters.
 */
export const getJobs = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { tenantId } = getTenantContext(req);
    const firm = await getFirmForTenant(tenantId);
    if (!firm) { res.status(404).json({ success: false, error: 'Firm not found' }); return; }

    const { status, client_tenant_id, job_type, priority, assigned_to, search, limit = '100', offset = '0' } = req.query as Record<string, string>;

    const conditions: string[] = ['j.firm_id = $1'];
    const params: any[] = [firm.id];
    let p = 2;

    if (status)           { conditions.push(`j.status = $${p++}`); params.push(status); }
    if (client_tenant_id) { conditions.push(`j.client_tenant_id = $${p++}`); params.push(client_tenant_id); }
    if (job_type)         { conditions.push(`j.job_type = $${p++}`); params.push(job_type); }
    if (priority)         { conditions.push(`j.priority = $${p++}`); params.push(priority); }
    if (assigned_to)      { conditions.push(`j.assigned_to = $${p++}`); params.push(assigned_to); }
    if (search)           { conditions.push(`j.title ILIKE $${p++}`); params.push(`%${search}%`); }

    const where = conditions.join(' AND ');

    const result = await pool.query(
      `SELECT
         j.*,
         t.name AS client_name,
         COALESCE(u.first_name || ' ' || u.last_name, u.email) AS assigned_to_name,
         (SELECT COALESCE(SUM(te.hours), 0) FROM accountant_time_entries te WHERE te.job_id = j.id) AS logged_hours,
         (SELECT COALESCE(SUM(te.hours), 0) FROM accountant_time_entries te WHERE te.job_id = j.id AND te.billable = TRUE AND te.invoiced = FALSE) AS unbilled_hours
       FROM accountant_jobs j
       JOIN tenants t ON j.client_tenant_id = t.id
       LEFT JOIN users u ON j.assigned_to = u.id
       WHERE ${where}
       ORDER BY
         CASE j.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
         j.due_date ASC NULLS LAST,
         j.created_at DESC
       LIMIT $${p++} OFFSET $${p++}`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM accountant_jobs j WHERE ${where}`,
      params
    );

    res.json({ success: true, data: { jobs: result.rows, total: parseInt(countResult.rows[0].count) } });
  } catch (err: any) {
    console.error('getJobs error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * POST /accountant-portal/jobs
 * Create a new job.
 */
export const createJob = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { tenantId, userId } = getTenantContext(req);
    const firm = await getFirmForTenant(tenantId);
    if (!firm) { res.status(404).json({ success: false, error: 'Firm not found' }); return; }

    const {
      client_tenant_id, title, job_type = 'other', description, status = 'not_started',
      priority = 'medium', due_date, start_date, period_start, period_end,
      estimated_hours, billing_type = 'hourly', billing_rate, fixed_fee,
      assigned_to, notes
    } = req.body;

    if (!client_tenant_id) { res.status(400).json({ success: false, error: 'client_tenant_id is required' }); return; }
    if (!title || !title.trim()) { res.status(400).json({ success: false, error: 'title is required' }); return; }

    const result = await pool.query(
      `INSERT INTO accountant_jobs
         (firm_id, client_tenant_id, assigned_to, created_by, title, job_type, description,
          status, priority, due_date, start_date, period_start, period_end,
          estimated_hours, billing_type, billing_rate, fixed_fee, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
       RETURNING *`,
      [
        firm.id, client_tenant_id, assigned_to || null, userId,
        title.trim(), job_type, description || null,
        status, priority, due_date || null, start_date || null,
        period_start || null, period_end || null,
        estimated_hours || null, billing_type,
        billing_rate || null, fixed_fee || null, notes || null
      ]
    );

    const job = result.rows[0];
    await logActivity(firm.id, userId, client_tenant_id, 'job_created', 'accountant_jobs', job.id, { title, job_type }, req.ip);
    res.status(201).json({ success: true, data: job });
  } catch (err: any) {
    console.error('createJob error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * PUT /accountant-portal/jobs/:id
 * Update a job.
 */
export const updateJob = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { tenantId, userId } = getTenantContext(req);
    const firm = await getFirmForTenant(tenantId);
    if (!firm) { res.status(404).json({ success: false, error: 'Firm not found' }); return; }

    const { id } = req.params;
    const {
      title, job_type, description, status, priority,
      due_date, start_date, period_start, period_end,
      estimated_hours, billing_type, billing_rate, fixed_fee,
      assigned_to, notes
    } = req.body;

    const completedAt = status === 'completed' ? 'NOW()' : 'completed_at';

    const result = await pool.query(
      `UPDATE accountant_jobs SET
         title           = COALESCE($3, title),
         job_type        = COALESCE($4, job_type),
         description     = COALESCE($5, description),
         status          = COALESCE($6, status),
         priority        = COALESCE($7, priority),
         due_date        = COALESCE($8::date, due_date),
         start_date      = COALESCE($9::date, start_date),
         period_start    = COALESCE($10::date, period_start),
         period_end      = COALESCE($11::date, period_end),
         estimated_hours = COALESCE($12, estimated_hours),
         billing_type    = COALESCE($13, billing_type),
         billing_rate    = COALESCE($14, billing_rate),
         fixed_fee       = COALESCE($15, fixed_fee),
         assigned_to     = COALESCE($16::uuid, assigned_to),
         notes           = COALESCE($17, notes),
         completed_at    = CASE WHEN $6 = 'completed' AND completed_at IS NULL THEN NOW() ELSE completed_at END,
         updated_at      = NOW()
       WHERE id = $1 AND firm_id = $2
       RETURNING *`,
      [
        id, firm.id,
        title || null, job_type || null, description || null, status || null,
        priority || null, due_date || null, start_date || null,
        period_start || null, period_end || null,
        estimated_hours || null, billing_type || null,
        billing_rate || null, fixed_fee || null,
        assigned_to || null, notes || null
      ]
    );

    if (result.rows.length === 0) { res.status(404).json({ success: false, error: 'Job not found' }); return; }

    const job = result.rows[0];
    await logActivity(firm.id, userId, job.client_tenant_id, 'job_updated', 'accountant_jobs', id, { status, title }, req.ip);
    res.json({ success: true, data: job });
  } catch (err: any) {
    console.error('updateJob error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * DELETE /accountant-portal/jobs/:id
 * Delete a job.
 */
export const deleteJob = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { tenantId, userId } = getTenantContext(req);
    const firm = await getFirmForTenant(tenantId);
    if (!firm) { res.status(404).json({ success: false, error: 'Firm not found' }); return; }

    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM accountant_jobs WHERE id = $1 AND firm_id = $2 RETURNING client_tenant_id, title',
      [id, firm.id]
    );
    if (result.rows.length === 0) { res.status(404).json({ success: false, error: 'Job not found' }); return; }

    const { client_tenant_id, title } = result.rows[0];
    await logActivity(firm.id, userId, client_tenant_id, 'job_deleted', 'accountant_jobs', id, { title }, req.ip);
    res.json({ success: true, message: 'Job deleted' });
  } catch (err: any) {
    console.error('deleteJob error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ============================================================================
// TIME TRACKING / WIP
// ============================================================================

/**
 * GET /accountant-portal/time-entries
 * List time entries for the firm, with WIP summary.
 */
export const getTimeEntries = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { tenantId } = getTenantContext(req);
    const firm = await getFirmForTenant(tenantId);
    if (!firm) { res.status(404).json({ success: false, error: 'Firm not found' }); return; }

    const {
      client_tenant_id, job_id, user_id, billable, invoiced,
      start_date, end_date, limit = '200', offset = '0'
    } = req.query as Record<string, string>;

    const conditions: string[] = ['te.firm_id = $1'];
    const params: any[] = [firm.id];
    let p = 2;

    if (client_tenant_id) { conditions.push(`te.client_tenant_id = $${p++}`); params.push(client_tenant_id); }
    if (job_id)           { conditions.push(`te.job_id = $${p++}`); params.push(job_id); }
    if (user_id)          { conditions.push(`te.user_id = $${p++}`); params.push(user_id); }
    if (billable !== undefined) { conditions.push(`te.billable = $${p++}`); params.push(billable === 'true'); }
    if (invoiced !== undefined) { conditions.push(`te.invoiced = $${p++}`); params.push(invoiced === 'true'); }
    if (start_date)       { conditions.push(`te.date >= $${p++}::date`); params.push(start_date); }
    if (end_date)         { conditions.push(`te.date <= $${p++}::date`); params.push(end_date); }

    const where = conditions.join(' AND ');

    const [entries, countRes, wipRes] = await Promise.all([
      pool.query(
        `SELECT
           te.*,
           t.name AS client_name,
           j.title AS job_title,
           COALESCE(u.first_name || ' ' || u.last_name, u.email) AS user_name
         FROM accountant_time_entries te
         JOIN tenants t ON te.client_tenant_id = t.id
         LEFT JOIN accountant_jobs j ON te.job_id = j.id
         LEFT JOIN users u ON te.user_id = u.id
         WHERE ${where}
         ORDER BY te.date DESC, te.created_at DESC
         LIMIT $${p} OFFSET $${p + 1}`,
        [...params, parseInt(limit), parseInt(offset)]
      ),
      pool.query(`SELECT COUNT(*) FROM accountant_time_entries te WHERE ${where}`, params),
      pool.query(
        `SELECT
           te.client_tenant_id,
           t.name AS client_name,
           COALESCE(SUM(te.hours), 0)  AS total_hours,
           COALESCE(SUM(CASE WHEN te.billable AND NOT te.invoiced THEN te.hours ELSE 0 END), 0) AS unbilled_hours,
           COALESCE(SUM(CASE WHEN te.billable AND NOT te.invoiced THEN te.amount ELSE 0 END), 0) AS unbilled_amount
         FROM accountant_time_entries te
         JOIN tenants t ON te.client_tenant_id = t.id
         WHERE te.firm_id = $1
         GROUP BY te.client_tenant_id, t.name
         ORDER BY unbilled_amount DESC`,
        [firm.id]
      )
    ]);

    res.json({
      success: true,
      data: {
        entries: entries.rows,
        total: parseInt(countRes.rows[0].count),
        wip: wipRes.rows
      }
    });
  } catch (err: any) {
    console.error('getTimeEntries error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * POST /accountant-portal/time-entries
 * Log a time entry.
 */
export const createTimeEntry = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { tenantId, userId } = getTenantContext(req);
    const firm = await getFirmForTenant(tenantId);
    if (!firm) { res.status(404).json({ success: false, error: 'Firm not found' }); return; }

    const { client_tenant_id, job_id, date, hours, description, billable = true, rate } = req.body;

    if (!client_tenant_id) { res.status(400).json({ success: false, error: 'client_tenant_id is required' }); return; }
    if (!hours || parseFloat(hours) <= 0) { res.status(400).json({ success: false, error: 'hours must be positive' }); return; }
    if (!description || !description.trim()) { res.status(400).json({ success: false, error: 'description is required' }); return; }

    const amount = rate ? (parseFloat(hours) * parseFloat(rate)).toFixed(2) : null;

    const result = await pool.query(
      `INSERT INTO accountant_time_entries
         (firm_id, job_id, client_tenant_id, user_id, date, hours, description, billable, rate, amount)
       VALUES ($1,$2,$3,$4,$5::date,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        firm.id, job_id || null, client_tenant_id, userId,
        date || 'today', parseFloat(hours), description.trim(),
        billable === false || billable === 'false' ? false : true,
        rate ? parseFloat(rate) : null, amount
      ]
    );

    const entry = result.rows[0];
    await logActivity(firm.id, userId, client_tenant_id, 'time_entry_created', 'accountant_time_entries', entry.id, { hours, description }, req.ip);
    res.status(201).json({ success: true, data: entry });
  } catch (err: any) {
    console.error('createTimeEntry error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * PUT /accountant-portal/time-entries/:id
 * Update a time entry.
 */
export const updateTimeEntry = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { tenantId, userId } = getTenantContext(req);
    const firm = await getFirmForTenant(tenantId);
    if (!firm) { res.status(404).json({ success: false, error: 'Firm not found' }); return; }

    const { id } = req.params;
    const { job_id, date, hours, description, billable, rate, invoiced } = req.body;

    const newRate = rate !== undefined ? parseFloat(rate) : null;
    const newHours = hours !== undefined ? parseFloat(hours) : null;
    const newAmount = newRate !== null && newHours !== null ? (newHours * newRate).toFixed(2) : null;

    const result = await pool.query(
      `UPDATE accountant_time_entries SET
         job_id      = COALESCE($3::uuid, job_id),
         date        = COALESCE($4::date, date),
         hours       = COALESCE($5, hours),
         description = COALESCE($6, description),
         billable    = COALESCE($7, billable),
         rate        = COALESCE($8, rate),
         amount      = CASE WHEN $5 IS NOT NULL OR $8 IS NOT NULL
                            THEN COALESCE($5, hours) * COALESCE($8, rate)
                            ELSE amount END,
         invoiced    = COALESCE($9, invoiced),
         updated_at  = NOW()
       WHERE id = $1 AND firm_id = $2
       RETURNING *`,
      [id, firm.id, job_id || null, date || null, newHours, description || null,
       billable !== undefined ? (billable === true || billable === 'true') : null,
       newRate, invoiced !== undefined ? (invoiced === true || invoiced === 'true') : null]
    );

    if (result.rows.length === 0) { res.status(404).json({ success: false, error: 'Time entry not found' }); return; }
    res.json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    console.error('updateTimeEntry error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * DELETE /accountant-portal/time-entries/:id
 * Delete a time entry.
 */
export const deleteTimeEntry = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { tenantId } = getTenantContext(req);
    const firm = await getFirmForTenant(tenantId);
    if (!firm) { res.status(404).json({ success: false, error: 'Firm not found' }); return; }

    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM accountant_time_entries WHERE id = $1 AND firm_id = $2 RETURNING id',
      [id, firm.id]
    );
    if (result.rows.length === 0) { res.status(404).json({ success: false, error: 'Time entry not found' }); return; }
    res.json({ success: true, message: 'Time entry deleted' });
  } catch (err: any) {
    console.error('deleteTimeEntry error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ============================================================================
// COMPLIANCE CALENDAR
// ============================================================================

/**
 * GET /accountant-portal/compliance
 * List compliance items with overdue / due-soon highlighting.
 */
export const getComplianceItems = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { tenantId } = getTenantContext(req);
    const firm = await getFirmForTenant(tenantId);
    if (!firm) { res.status(404).json({ success: false, error: 'Firm not found' }); return; }

    const {
      client_tenant_id, compliance_type, status, assigned_to,
      start_date, end_date, limit = '200', offset = '0'
    } = req.query as Record<string, string>;

    const conditions: string[] = ['ci.firm_id = $1'];
    const params: any[] = [firm.id];
    let p = 2;

    if (client_tenant_id) { conditions.push(`ci.client_tenant_id = $${p++}`); params.push(client_tenant_id); }
    if (compliance_type)  { conditions.push(`ci.compliance_type = $${p++}`); params.push(compliance_type); }
    if (status)           { conditions.push(`ci.status = $${p++}`); params.push(status); }
    if (assigned_to)      { conditions.push(`ci.assigned_to = $${p++}`); params.push(assigned_to); }
    if (start_date)       { conditions.push(`ci.due_date >= $${p++}::date`); params.push(start_date); }
    if (end_date)         { conditions.push(`ci.due_date <= $${p++}::date`); params.push(end_date); }

    const where = conditions.join(' AND ');

    const [items, countRes, summaryRes] = await Promise.all([
      pool.query(
        `SELECT
           ci.*,
           t.name AS client_name,
           COALESCE(u.first_name || ' ' || u.last_name, u.email) AS assigned_to_name,
           j.title AS job_title,
           CASE
             WHEN ci.status IN ('completed','submitted','na') THEN 'done'
             WHEN ci.due_date < CURRENT_DATE THEN 'overdue'
             WHEN ci.due_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'due_soon'
             WHEN ci.due_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'upcoming'
             ELSE 'future'
           END AS urgency
         FROM accountant_compliance_items ci
         JOIN tenants t ON ci.client_tenant_id = t.id
         LEFT JOIN users u ON ci.assigned_to = u.id
         LEFT JOIN accountant_jobs j ON ci.job_id = j.id
         WHERE ${where}
         ORDER BY
           CASE WHEN ci.status NOT IN ('completed','submitted','na') AND ci.due_date < CURRENT_DATE THEN 0 ELSE 1 END,
           ci.due_date ASC
         LIMIT $${p} OFFSET $${p + 1}`,
        [...params, parseInt(limit), parseInt(offset)]
      ),
      pool.query(`SELECT COUNT(*) FROM accountant_compliance_items ci WHERE ${where}`, params),
      pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE status NOT IN ('completed','submitted','na') AND due_date < CURRENT_DATE) AS overdue,
           COUNT(*) FILTER (WHERE status NOT IN ('completed','submitted','na') AND due_date >= CURRENT_DATE AND due_date <= CURRENT_DATE + INTERVAL '7 days') AS due_this_week,
           COUNT(*) FILTER (WHERE status NOT IN ('completed','submitted','na') AND due_date > CURRENT_DATE + INTERVAL '7 days' AND due_date <= CURRENT_DATE + INTERVAL '30 days') AS due_this_month,
           COUNT(*) FILTER (WHERE status IN ('completed','submitted')) AS completed
         FROM accountant_compliance_items
         WHERE firm_id = $1`,
        [firm.id]
      )
    ]);

    res.json({
      success: true,
      data: {
        items: items.rows,
        total: parseInt(countRes.rows[0].count),
        summary: summaryRes.rows[0]
      }
    });
  } catch (err: any) {
    console.error('getComplianceItems error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * POST /accountant-portal/compliance
 * Create a compliance item.
 */
export const createComplianceItem = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { tenantId, userId } = getTenantContext(req);
    const firm = await getFirmForTenant(tenantId);
    if (!firm) { res.status(404).json({ success: false, error: 'Firm not found' }); return; }

    const {
      client_tenant_id, compliance_type = 'other', title, description,
      due_date, period_start, period_end, status = 'pending',
      assigned_to, notes, job_id
    } = req.body;

    if (!client_tenant_id) { res.status(400).json({ success: false, error: 'client_tenant_id is required' }); return; }
    if (!title || !title.trim()) { res.status(400).json({ success: false, error: 'title is required' }); return; }
    if (!due_date) { res.status(400).json({ success: false, error: 'due_date is required' }); return; }

    const result = await pool.query(
      `INSERT INTO accountant_compliance_items
         (firm_id, client_tenant_id, assigned_to, compliance_type, title, description,
          due_date, period_start, period_end, status, notes, job_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7::date,$8::date,$9::date,$10,$11,$12)
       RETURNING *`,
      [
        firm.id, client_tenant_id, assigned_to || null,
        compliance_type, title.trim(), description || null,
        due_date, period_start || null, period_end || null,
        status, notes || null, job_id || null
      ]
    );

    const item = result.rows[0];
    await logActivity(firm.id, userId, client_tenant_id, 'compliance_item_created', 'accountant_compliance_items', item.id, { title, compliance_type, due_date }, req.ip);
    res.status(201).json({ success: true, data: item });
  } catch (err: any) {
    console.error('createComplianceItem error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * PUT /accountant-portal/compliance/:id
 * Update a compliance item (including mark submitted/completed).
 */
export const updateComplianceItem = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { tenantId, userId } = getTenantContext(req);
    const firm = await getFirmForTenant(tenantId);
    if (!firm) { res.status(404).json({ success: false, error: 'Firm not found' }); return; }

    const { id } = req.params;
    const {
      compliance_type, title, description, due_date, period_start, period_end,
      status, assigned_to, notes, job_id, submission_reference
    } = req.body;

    const result = await pool.query(
      `UPDATE accountant_compliance_items SET
         compliance_type      = COALESCE($3, compliance_type),
         title                = COALESCE($4, title),
         description          = COALESCE($5, description),
         due_date             = COALESCE($6::date, due_date),
         period_start         = COALESCE($7::date, period_start),
         period_end           = COALESCE($8::date, period_end),
         status               = COALESCE($9, status),
         assigned_to          = COALESCE($10::uuid, assigned_to),
         notes                = COALESCE($11, notes),
         job_id               = COALESCE($12::uuid, job_id),
         submission_reference = COALESCE($13, submission_reference),
         updated_at           = NOW()
       WHERE id = $1 AND firm_id = $2
       RETURNING *`,
      [
        id, firm.id,
        compliance_type || null, title || null, description || null,
        due_date || null, period_start || null, period_end || null,
        status || null, assigned_to || null, notes || null,
        job_id || null, submission_reference || null
      ]
    );

    if (result.rows.length === 0) { res.status(404).json({ success: false, error: 'Compliance item not found' }); return; }

    const item = result.rows[0];
    await logActivity(firm.id, userId, item.client_tenant_id, 'compliance_item_updated', 'accountant_compliance_items', id, { status, title }, req.ip);
    res.json({ success: true, data: item });
  } catch (err: any) {
    console.error('updateComplianceItem error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * DELETE /accountant-portal/compliance/:id
 */
export const deleteComplianceItem = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { tenantId } = getTenantContext(req);
    const firm = await getFirmForTenant(tenantId);
    if (!firm) { res.status(404).json({ success: false, error: 'Firm not found' }); return; }

    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM accountant_compliance_items WHERE id = $1 AND firm_id = $2 RETURNING id',
      [id, firm.id]
    );
    if (result.rows.length === 0) { res.status(404).json({ success: false, error: 'Item not found' }); return; }
    res.json({ success: true, message: 'Compliance item deleted' });
  } catch (err: any) {
    console.error('deleteComplianceItem error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default {
  getFirmProfile,
  createOrUpdateFirm,
  getFirmDashboard,
  getClients,
  getClientDetail,
  addExistingClient,
  removeClient,
  updateClientEngagement,
  switchToClient,
  switchBackToFirm,
  inviteClient,
  inviteTeamMember,
  getInvitations,
  cancelInvitation,
  acceptInvitation,
  getActivityLog,
  getClientFinancialSummary,
  // Jobs
  getJobs,
  createJob,
  updateJob,
  deleteJob,
  // Time Tracking
  getTimeEntries,
  createTimeEntry,
  updateTimeEntry,
  deleteTimeEntry,
  // Compliance Calendar
  getComplianceItems,
  createComplianceItem,
  updateComplianceItem,
  deleteComplianceItem,
};
