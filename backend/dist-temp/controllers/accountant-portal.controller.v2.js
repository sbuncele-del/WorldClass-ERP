"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getClientFinancialSummary = exports.getActivityLog = exports.acceptInvitation = exports.cancelInvitation = exports.getInvitations = exports.inviteTeamMember = exports.inviteClient = exports.switchBackToFirm = exports.switchToClient = exports.updateClientEngagement = exports.removeClient = exports.addExistingClient = exports.getClientDetail = exports.getClients = exports.getFirmDashboard = exports.createOrUpdateFirm = exports.getFirmProfile = void 0;
const database_1 = __importDefault(require("../config/database"));
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
// ============================================================================
// HELPERS
// ============================================================================
function getTenantContext(req) {
    const tenantId = req.tenant?.id || req.tenantId;
    const userId = req.user?.id || req.userId;
    if (!tenantId)
        throw new Error('Tenant ID not found');
    if (!userId)
        throw new Error('User ID not found');
    return { tenantId, userId };
}
/** Log an accountant action. Fire-and-forget — never blocks the response. */
async function logActivity(firmId, userId, clientTenantId, action, resourceType, resourceId, details = {}, ipAddress) {
    try {
        await database_1.default.query(`INSERT INTO accountant_activity_log
        (firm_id, user_id, client_tenant_id, action, resource_type, resource_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [firmId, userId, clientTenantId, action, resourceType, resourceId, JSON.stringify(details), ipAddress || null]);
    }
    catch (err) {
        console.error('Failed to log accountant activity:', err);
    }
}
/** Resolve the firm row for the current tenant. Returns null when not found. */
async function getFirmForTenant(tenantId) {
    const result = await database_1.default.query('SELECT * FROM accountant_firms WHERE tenant_id = $1 AND is_active = TRUE', [tenantId]);
    return result.rows[0] || null;
}
// ============================================================================
// FIRM MANAGEMENT
// ============================================================================
/**
 * GET /accountant-portal/firm
 * Retrieve the accountant firm profile for the current tenant.
 */
const getFirmProfile = async (req, res) => {
    try {
        const { tenantId } = getTenantContext(req);
        const result = await database_1.default.query(`SELECT af.*, t.name AS tenant_name, t.slug AS tenant_slug,
              (SELECT COUNT(*) FROM accountant_client_mappings acm WHERE acm.firm_id = af.id AND acm.status = 'active') AS active_clients,
              (SELECT COUNT(*) FROM accountant_invitations ai WHERE ai.firm_id = af.id AND ai.status = 'pending') AS pending_invitations
       FROM accountant_firms af
       JOIN tenants t ON af.tenant_id = t.id
       WHERE af.tenant_id = $1`, [tenantId]);
        if (result.rows.length === 0) {
            res.status(404).json({ success: false, error: 'Accountant firm not found for this tenant' });
            return;
        }
        res.json({ success: true, data: result.rows[0] });
    }
    catch (err) {
        console.error('getFirmProfile error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};
exports.getFirmProfile = getFirmProfile;
/**
 * PUT /accountant-portal/firm
 * Create or update the accountant firm profile.
 */
const createOrUpdateFirm = async (req, res) => {
    try {
        const { tenantId, userId } = getTenantContext(req);
        const { firm_name, registration_number, tax_number, practice_number, firm_type, contact_email, contact_phone, website, address, city, province, postal_code, country, logo_url, subscription_tier, max_clients, settings } = req.body;
        if (!firm_name || firm_name.trim().length === 0) {
            res.status(400).json({ success: false, error: 'firm_name is required' });
            return;
        }
        // Check if firm already exists for this tenant
        const existing = await database_1.default.query('SELECT id FROM accountant_firms WHERE tenant_id = $1', [tenantId]);
        let result;
        if (existing.rows.length > 0) {
            // Update
            result = await database_1.default.query(`UPDATE accountant_firms SET
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
        RETURNING *`, [
                tenantId, firm_name, registration_number, tax_number, practice_number,
                firm_type, contact_email, contact_phone, website,
                address, city, province, postal_code, country,
                logo_url, subscription_tier, max_clients,
                settings ? JSON.stringify(settings) : null
            ]);
        }
        else {
            // Create
            result = await database_1.default.query(`INSERT INTO accountant_firms
          (tenant_id, firm_name, registration_number, tax_number, practice_number,
           firm_type, contact_email, contact_phone, website,
           address, city, province, postal_code, country,
           logo_url, subscription_tier, max_clients, settings)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
        RETURNING *`, [
                tenantId, firm_name, registration_number || null, tax_number || null, practice_number || null,
                firm_type || 'accounting', contact_email || null, contact_phone || null, website || null,
                address || null, city || null, province || null, postal_code || null, country || 'South Africa',
                logo_url || null, subscription_tier || 'professional', max_clients || 50,
                settings ? JSON.stringify(settings) : '{}'
            ]);
        }
        const firm = result.rows[0];
        await logActivity(firm.id, userId, null, existing.rows.length ? 'firm_updated' : 'firm_created', 'accountant_firms', firm.id, { firm_name }, req.ip);
        res.json({ success: true, data: firm });
    }
    catch (err) {
        console.error('createOrUpdateFirm error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};
exports.createOrUpdateFirm = createOrUpdateFirm;
/**
 * GET /accountant-portal/dashboard
 * Firm dashboard — client count, revenue metrics, upcoming deadlines.
 */
const getFirmDashboard = async (req, res) => {
    try {
        const { tenantId } = getTenantContext(req);
        const firm = await getFirmForTenant(tenantId);
        if (!firm) {
            res.status(404).json({ success: false, error: 'Accountant firm not found' });
            return;
        }
        // Client statistics
        const clientStats = await database_1.default.query(`SELECT
        COUNT(*) FILTER (WHERE status = 'active')      AS active_clients,
        COUNT(*) FILTER (WHERE status = 'paused')       AS paused_clients,
        COUNT(*) FILTER (WHERE status = 'terminated')   AS terminated_clients,
        COUNT(*)                                         AS total_clients
       FROM accountant_client_mappings
       WHERE firm_id = $1`, [firm.id]);
        // Revenue by engagement type
        const revenueByType = await database_1.default.query(`SELECT engagement_type,
              COUNT(*) AS client_count,
              SUM(billing_rate) AS total_billing
       FROM accountant_client_mappings
       WHERE firm_id = $1 AND status = 'active'
       GROUP BY engagement_type`, [firm.id]);
        // Pending invitations
        const pendingInvitations = await database_1.default.query(`SELECT COUNT(*) AS count FROM accountant_invitations
       WHERE firm_id = $1 AND status = 'pending' AND expires_at > NOW()`, [firm.id]);
        // Recent activity
        const recentActivity = await database_1.default.query(`SELECT aal.*, u.first_name, u.last_name, u.email AS user_email
       FROM accountant_activity_log aal
       JOIN users u ON aal.user_id = u.id
       WHERE aal.firm_id = $1
       ORDER BY aal.created_at DESC
       LIMIT 20`, [firm.id]);
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
    }
    catch (err) {
        console.error('getFirmDashboard error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};
exports.getFirmDashboard = getFirmDashboard;
// ============================================================================
// CLIENT MANAGEMENT
// ============================================================================
/**
 * GET /accountant-portal/clients
 * List all clients for the firm with tenant details.
 */
const getClients = async (req, res) => {
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
        const params = [firm.id];
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
        const result = await database_1.default.query(sql, params);
        res.json({ success: true, data: result.rows, total: result.rowCount });
    }
    catch (err) {
        console.error('getClients error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};
exports.getClients = getClients;
/**
 * GET /accountant-portal/clients/:clientTenantId
 * Get client detail with financial summary.
 */
const getClientDetail = async (req, res) => {
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
        const mapping = await database_1.default.query(`SELECT acm.*, t.name AS client_name, t.slug AS client_slug, t.status AS tenant_status,
              u.first_name AS accountant_first_name, u.last_name AS accountant_last_name
       FROM accountant_client_mappings acm
       JOIN tenants t ON acm.client_tenant_id = t.id
       LEFT JOIN users u ON acm.assigned_accountant_id = u.id
       WHERE acm.firm_id = $1 AND acm.client_tenant_id = $2`, [firm.id, clientTenantId]);
        if (mapping.rows.length === 0) {
            res.status(404).json({ success: false, error: 'Client not found for this firm' });
            return;
        }
        // Attempt to pull basic financial summary from the client tenant
        let financialSummary = null;
        try {
            const glSummary = await database_1.default.query(`SELECT
          (SELECT COUNT(*) FROM journal_entries WHERE tenant_id = $1) AS total_journal_entries,
          (SELECT COUNT(*) FROM journal_entries WHERE tenant_id = $1 AND status = 'POSTED') AS posted_entries,
          (SELECT COUNT(*) FROM journal_entries WHERE tenant_id = $1 AND status = 'DRAFT') AS draft_entries,
          (SELECT COUNT(*) FROM invoices WHERE tenant_id = $1) AS total_invoices,
          (SELECT COUNT(*) FROM invoices WHERE tenant_id = $1 AND status = 'paid') AS paid_invoices,
          (SELECT COUNT(*) FROM invoices WHERE tenant_id = $1 AND status IN ('sent','overdue')) AS outstanding_invoices
        `, [clientTenantId]);
            financialSummary = glSummary.rows[0];
        }
        catch {
            // Tables may not exist for this tenant — non-critical
            financialSummary = null;
        }
        // Recent activity for this client
        const recentActivity = await database_1.default.query(`SELECT aal.*, u.first_name, u.last_name
       FROM accountant_activity_log aal
       JOIN users u ON aal.user_id = u.id
       WHERE aal.firm_id = $1 AND aal.client_tenant_id = $2
       ORDER BY aal.created_at DESC
       LIMIT 20`, [firm.id, clientTenantId]);
        res.json({
            success: true,
            data: {
                mapping: mapping.rows[0],
                financial_summary: financialSummary,
                recent_activity: recentActivity.rows
            }
        });
    }
    catch (err) {
        console.error('getClientDetail error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};
exports.getClientDetail = getClientDetail;
/**
 * POST /accountant-portal/clients
 * Map an existing tenant as a client of this firm.
 */
const addExistingClient = async (req, res) => {
    try {
        const { tenantId, userId } = getTenantContext(req);
        const { client_tenant_id, assigned_accountant_id, engagement_type, access_level, billing_rate, billing_currency, notes, permissions } = req.body;
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
        const clientCount = await database_1.default.query(`SELECT COUNT(*) AS count FROM accountant_client_mappings WHERE firm_id = $1 AND status = 'active'`, [firm.id]);
        if (parseInt(clientCount.rows[0].count, 10) >= firm.max_clients) {
            res.status(400).json({ success: false, error: `Client limit reached (${firm.max_clients}). Upgrade your subscription to add more clients.` });
            return;
        }
        // Verify the target tenant exists
        const clientTenant = await database_1.default.query('SELECT id, name FROM tenants WHERE id = $1', [client_tenant_id]);
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
        const result = await database_1.default.query(`INSERT INTO accountant_client_mappings
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
       RETURNING *`, [
            firm.id, client_tenant_id, assigned_accountant_id || null,
            engagement_type || 'full_service', access_level || 'financial',
            billing_rate || null, billing_currency || 'ZAR',
            notes || null,
            permissions ? JSON.stringify(permissions) : '["gl","ap","ar","reports","tax","bank_reconciliation"]'
        ]);
        await logActivity(firm.id, userId, client_tenant_id, 'client_added', 'accountant_client_mappings', result.rows[0].id, {
            client_name: clientTenant.rows[0].name,
            engagement_type: engagement_type || 'full_service'
        }, req.ip);
        res.json({ success: true, data: result.rows[0], message: 'Client added successfully' });
    }
    catch (err) {
        console.error('addExistingClient error:', err);
        if (err.code === '23505') {
            res.status(409).json({ success: false, error: 'This client is already mapped to your firm' });
            return;
        }
        res.status(500).json({ success: false, error: err.message });
    }
};
exports.addExistingClient = addExistingClient;
/**
 * DELETE /accountant-portal/clients/:clientTenantId
 * Soft-remove: set mapping status to 'terminated'.
 */
const removeClient = async (req, res) => {
    try {
        const { tenantId, userId } = getTenantContext(req);
        const { clientTenantId } = req.params;
        const firm = await getFirmForTenant(tenantId);
        if (!firm) {
            res.status(404).json({ success: false, error: 'Accountant firm not found' });
            return;
        }
        const result = await database_1.default.query(`UPDATE accountant_client_mappings
       SET status = 'terminated', end_date = CURRENT_DATE, updated_at = NOW()
       WHERE firm_id = $1 AND client_tenant_id = $2 AND status != 'terminated'
       RETURNING *`, [firm.id, clientTenantId]);
        if (result.rows.length === 0) {
            res.status(404).json({ success: false, error: 'Active client mapping not found' });
            return;
        }
        await logActivity(firm.id, userId, clientTenantId, 'client_removed', 'accountant_client_mappings', result.rows[0].id, {}, req.ip);
        res.json({ success: true, data: result.rows[0], message: 'Client removed successfully' });
    }
    catch (err) {
        console.error('removeClient error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};
exports.removeClient = removeClient;
/**
 * PUT /accountant-portal/clients/:clientTenantId
 * Update engagement type, access level, billing, notes, etc.
 */
const updateClientEngagement = async (req, res) => {
    try {
        const { tenantId, userId } = getTenantContext(req);
        const { clientTenantId } = req.params;
        const { assigned_accountant_id, engagement_type, access_level, status, billing_rate, billing_currency, notes, permissions } = req.body;
        const firm = await getFirmForTenant(tenantId);
        if (!firm) {
            res.status(404).json({ success: false, error: 'Accountant firm not found' });
            return;
        }
        const result = await database_1.default.query(`UPDATE accountant_client_mappings SET
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
       RETURNING *`, [
            firm.id, clientTenantId,
            assigned_accountant_id || null, engagement_type || null, access_level || null,
            status || null, billing_rate || null, billing_currency || null,
            notes || null, permissions ? JSON.stringify(permissions) : null
        ]);
        if (result.rows.length === 0) {
            res.status(404).json({ success: false, error: 'Client mapping not found' });
            return;
        }
        await logActivity(firm.id, userId, clientTenantId, 'client_engagement_updated', 'accountant_client_mappings', result.rows[0].id, req.body, req.ip);
        res.json({ success: true, data: result.rows[0], message: 'Client engagement updated' });
    }
    catch (err) {
        console.error('updateClientEngagement error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};
exports.updateClientEngagement = updateClientEngagement;
// ============================================================================
// CLIENT CONTEXT SWITCHING
// ============================================================================
/**
 * POST /accountant-portal/switch/:clientTenantId
 * Generate a scoped JWT for the accountant to operate within a client's tenant.
 */
const switchToClient = async (req, res) => {
    try {
        const { tenantId, userId } = getTenantContext(req);
        const { clientTenantId } = req.params;
        if (!clientTenantId) {
            res.status(400).json({ success: false, error: 'clientTenantId is required' });
            return;
        }
        // Verify the firm has an active mapping to this client
        const mapping = await database_1.default.query(`SELECT acm.* FROM accountant_client_mappings acm
       JOIN accountant_firms af ON acm.firm_id = af.id
       WHERE af.tenant_id = $1 AND acm.client_tenant_id = $2 AND acm.status = 'active'`, [tenantId, clientTenantId]);
        if (mapping.rows.length === 0) {
            res.status(403).json({ success: false, error: 'No active client mapping found. Access denied.' });
            return;
        }
        // Get client tenant info
        const clientTenant = await database_1.default.query('SELECT * FROM tenants WHERE id = $1', [clientTenantId]);
        if (clientTenant.rows.length === 0) {
            res.status(404).json({ success: false, error: 'Client tenant not found' });
            return;
        }
        const client = clientTenant.rows[0];
        const mappingRow = mapping.rows[0];
        // Generate cross-tenant scoped token
        const accessToken = jsonwebtoken_1.default.sign({
            userId,
            tenantId: clientTenantId, // Client's tenant — enables cross-tenant work
            email: req.user?.email,
            role: 'accountant',
            type: 'access',
            firmTenantId: tenantId, // Remember firm's own tenant
            isAccountantAccess: true,
            accessLevel: mappingRow.access_level,
            permissions: mappingRow.permissions
        }, JWT_SECRET, { expiresIn: '24h' });
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
    }
    catch (err) {
        console.error('switchToClient error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};
exports.switchToClient = switchToClient;
/**
 * POST /accountant-portal/switch-back
 * Generate a token back to the accountant's firm tenant.
 */
const switchBackToFirm = async (req, res) => {
    try {
        const userId = req.user?.id || req.userId;
        if (!userId) {
            res.status(401).json({ success: false, error: 'User not authenticated' });
            return;
        }
        // firmTenantId can come from the JWT claim (set during switchToClient)
        const firmTenantId = req.user?.firmTenantId || req.body.firm_tenant_id;
        if (!firmTenantId) {
            res.status(400).json({ success: false, error: 'firm_tenant_id is required (pass in body or use the accountant-scoped token)' });
            return;
        }
        // Verify the firm tenant exists
        const firmTenant = await database_1.default.query('SELECT * FROM tenants WHERE id = $1', [firmTenantId]);
        if (firmTenant.rows.length === 0) {
            res.status(404).json({ success: false, error: 'Firm tenant not found' });
            return;
        }
        // Get user data from firm tenant
        const userResult = await database_1.default.query('SELECT id, email, role FROM users WHERE id = $1 AND tenant_id = $2', [userId, firmTenantId]);
        const userRow = userResult.rows[0];
        const userRole = userRow?.role || 'accountant';
        const userEmail = userRow?.email || req.user?.email;
        const accessToken = jsonwebtoken_1.default.sign({
            userId,
            tenantId: firmTenantId,
            email: userEmail,
            role: userRole,
            type: 'access'
        }, JWT_SECRET, { expiresIn: '24h' });
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
    }
    catch (err) {
        console.error('switchBackToFirm error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};
exports.switchBackToFirm = switchBackToFirm;
// ============================================================================
// INVITATIONS
// ============================================================================
/**
 * POST /accountant-portal/invitations/client
 * Invite a client business to be managed by this firm.
 */
const inviteClient = async (req, res) => {
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
        const existingInv = await database_1.default.query(`SELECT id FROM accountant_invitations
       WHERE firm_id = $1 AND invitee_email = $2 AND status = 'pending' AND expires_at > NOW()`, [firm.id, email.toLowerCase()]);
        if (existingInv.rows.length > 0) {
            res.status(409).json({ success: false, error: 'A pending invitation already exists for this email' });
            return;
        }
        const token = crypto_1.default.randomUUID();
        const result = await database_1.default.query(`INSERT INTO accountant_invitations
        (firm_id, invitation_type, invitee_email, invitee_name, invitee_company,
         invited_by, token, engagement_type, message)
       VALUES ($1, 'client', $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`, [firm.id, email.toLowerCase(), name || null, company || null, userId, token, engagement_type || 'full_service', message || null]);
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
    }
    catch (err) {
        console.error('inviteClient error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};
exports.inviteClient = inviteClient;
/**
 * POST /accountant-portal/invitations/team
 * Invite an accountant to join the firm's tenant.
 */
const inviteTeamMember = async (req, res) => {
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
        const existingInv = await database_1.default.query(`SELECT id FROM accountant_invitations
       WHERE firm_id = $1 AND invitee_email = $2 AND invitation_type = 'team'
             AND status = 'pending' AND expires_at > NOW()`, [firm.id, email.toLowerCase()]);
        if (existingInv.rows.length > 0) {
            res.status(409).json({ success: false, error: 'A pending team invitation already exists for this email' });
            return;
        }
        const token = crypto_1.default.randomUUID();
        const result = await database_1.default.query(`INSERT INTO accountant_invitations
        (firm_id, invitation_type, invitee_email, invitee_name, invited_by, token, message)
       VALUES ($1, 'team', $2, $3, $4, $5, $6)
       RETURNING *`, [firm.id, email.toLowerCase(), name || null, userId, token, message || null]);
        await logActivity(firm.id, userId, null, 'team_member_invited', 'accountant_invitations', result.rows[0].id, {
            invitee_email: email
        }, req.ip);
        res.status(201).json({
            success: true,
            data: result.rows[0],
            message: `Team invitation sent to ${email}`,
            invitation_link: `/accountant-portal/invitations/accept?token=${token}`
        });
    }
    catch (err) {
        console.error('inviteTeamMember error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};
exports.inviteTeamMember = inviteTeamMember;
/**
 * GET /accountant-portal/invitations
 * List all invitations for the firm.
 */
const getInvitations = async (req, res) => {
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
        const params = [firm.id];
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
        const result = await database_1.default.query(sql, params);
        res.json({ success: true, data: result.rows, total: result.rowCount });
    }
    catch (err) {
        console.error('getInvitations error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};
exports.getInvitations = getInvitations;
/**
 * DELETE /accountant-portal/invitations/:id
 * Cancel a pending invitation.
 */
const cancelInvitation = async (req, res) => {
    try {
        const { tenantId, userId } = getTenantContext(req);
        const { id } = req.params;
        const firm = await getFirmForTenant(tenantId);
        if (!firm) {
            res.status(404).json({ success: false, error: 'Accountant firm not found' });
            return;
        }
        const result = await database_1.default.query(`UPDATE accountant_invitations
       SET status = 'expired'
       WHERE id = $1 AND firm_id = $2 AND status = 'pending'
       RETURNING *`, [id, firm.id]);
        if (result.rows.length === 0) {
            res.status(404).json({ success: false, error: 'Pending invitation not found' });
            return;
        }
        await logActivity(firm.id, userId, null, 'invitation_cancelled', 'accountant_invitations', id, {
            invitee_email: result.rows[0].invitee_email
        }, req.ip);
        res.json({ success: true, data: result.rows[0], message: 'Invitation cancelled' });
    }
    catch (err) {
        console.error('cancelInvitation error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};
exports.cancelInvitation = cancelInvitation;
/**
 * POST /accountant-portal/invitations/accept
 * PUBLIC endpoint — no auth middleware.
 * Accept an invitation by token.
 */
const acceptInvitation = async (req, res) => {
    const client = await database_1.default.connect();
    try {
        const { token } = req.body;
        if (!token) {
            res.status(400).json({ success: false, error: 'token is required' });
            return;
        }
        await client.query('BEGIN');
        // Find the invitation
        const invResult = await client.query(`SELECT ai.*, af.tenant_id AS firm_tenant_id, af.firm_name
       FROM accountant_invitations ai
       JOIN accountant_firms af ON ai.firm_id = af.id
       WHERE ai.token = $1`, [token]);
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
            await client.query(`UPDATE accountant_invitations SET status = 'expired' WHERE id = $1`, [invitation.id]);
            await client.query('COMMIT');
            res.status(410).json({ success: false, error: 'Invitation has expired' });
            return;
        }
        if (invitation.invitation_type === 'client') {
            // --- CLIENT INVITATION ---
            // Check if invitee already has a tenant
            const existingUser = await client.query('SELECT u.id, u.tenant_id FROM users u WHERE u.email = $1 LIMIT 1', [invitation.invitee_email]);
            let clientTenantId;
            if (existingUser.rows.length > 0) {
                // Existing user — map their tenant
                clientTenantId = existingUser.rows[0].tenant_id;
            }
            else {
                // New user — create tenant + user
                const slug = (invitation.invitee_company || invitation.invitee_email.split('@')[0])
                    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                const newTenant = await client.query(`INSERT INTO tenants (name, slug, status, subscription_plan)
           VALUES ($1, $2, 'active', 'professional')
           RETURNING id`, [invitation.invitee_company || invitation.invitee_name || invitation.invitee_email, slug]);
                clientTenantId = newTenant.rows[0].id;
                // Create user with a temporary password hash (user must reset)
                const tempPasswordHash = '$2b$10$placeholder_hash_requires_reset';
                await client.query(`INSERT INTO users (tenant_id, email, first_name, role, password_hash, is_active)
           VALUES ($1, $2, $3, 'admin', $4, TRUE)`, [clientTenantId, invitation.invitee_email, invitation.invitee_name || '', tempPasswordHash]);
            }
            // Create the mapping
            await client.query(`INSERT INTO accountant_client_mappings
          (firm_id, client_tenant_id, engagement_type, status)
         VALUES ($1, $2, $3, 'active')
         ON CONFLICT (firm_id, client_tenant_id) DO UPDATE SET status = 'active', updated_at = NOW()`, [invitation.firm_id, clientTenantId, invitation.engagement_type || 'full_service']);
            // Mark invitation as accepted
            await client.query(`UPDATE accountant_invitations SET status = 'accepted', accepted_at = NOW(), client_tenant_id = $2 WHERE id = $1`, [invitation.id, clientTenantId]);
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
        }
        else if (invitation.invitation_type === 'team') {
            // --- TEAM INVITATION ---
            // Create user under the firm's tenant with role 'accountant'
            const existingUser = await client.query('SELECT id FROM users WHERE email = $1 AND tenant_id = $2', [invitation.invitee_email, invitation.firm_tenant_id]);
            if (existingUser.rows.length > 0) {
                await client.query('ROLLBACK');
                res.status(409).json({ success: false, error: 'User already exists in this firm' });
                return;
            }
            const tempPasswordHash = '$2b$10$placeholder_hash_requires_reset';
            await client.query(`INSERT INTO users (tenant_id, email, first_name, role, password_hash, is_active)
         VALUES ($1, $2, $3, 'accountant', $4, TRUE)`, [invitation.firm_tenant_id, invitation.invitee_email, invitation.invitee_name || '', tempPasswordHash]);
            // Mark invitation as accepted
            await client.query(`UPDATE accountant_invitations SET status = 'accepted', accepted_at = NOW() WHERE id = $1`, [invitation.id]);
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
        }
        else {
            await client.query('ROLLBACK');
            res.status(400).json({ success: false, error: `Unknown invitation type: ${invitation.invitation_type}` });
        }
    }
    catch (err) {
        await client.query('ROLLBACK');
        console.error('acceptInvitation error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
    finally {
        client.release();
    }
};
exports.acceptInvitation = acceptInvitation;
// ============================================================================
// ACTIVITY & REPORTS
// ============================================================================
/**
 * GET /accountant-portal/activity
 * Audit log of accountant actions across clients.
 */
const getActivityLog = async (req, res) => {
    try {
        const { tenantId } = getTenantContext(req);
        const firm = await getFirmForTenant(tenantId);
        if (!firm) {
            res.status(404).json({ success: false, error: 'Accountant firm not found' });
            return;
        }
        const { client_tenant_id, user_id, action, limit: qLimit, offset: qOffset } = req.query;
        const limit = Math.min(parseInt(qLimit, 10) || 50, 500);
        const offset = parseInt(qOffset, 10) || 0;
        let sql = `
      SELECT aal.*,
             u.first_name, u.last_name, u.email AS user_email,
             t.name AS client_name
      FROM accountant_activity_log aal
      JOIN users u ON aal.user_id = u.id
      LEFT JOIN tenants t ON aal.client_tenant_id = t.id
      WHERE aal.firm_id = $1
    `;
        const params = [firm.id];
        let paramIdx = 2;
        if (client_tenant_id) {
            sql += ` AND aal.client_tenant_id = $${paramIdx}`;
            params.push(client_tenant_id);
            paramIdx++;
        }
        if (user_id) {
            sql += ` AND aal.user_id = $${paramIdx}`;
            params.push(user_id);
            paramIdx++;
        }
        if (action) {
            sql += ` AND aal.action = $${paramIdx}`;
            params.push(action);
            paramIdx++;
        }
        sql += ` ORDER BY aal.created_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
        params.push(limit, offset);
        const result = await database_1.default.query(sql, params);
        // Total count for pagination
        const countSql = `SELECT COUNT(*) FROM accountant_activity_log WHERE firm_id = $1`;
        const countResult = await database_1.default.query(countSql, [firm.id]);
        res.json({
            success: true,
            data: result.rows,
            pagination: {
                total: parseInt(countResult.rows[0].count, 10),
                limit,
                offset
            }
        });
    }
    catch (err) {
        console.error('getActivityLog error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};
exports.getActivityLog = getActivityLog;
/**
 * GET /accountant-portal/financial-summary
 * Pull financial data across all active clients.
 */
const getClientFinancialSummary = async (req, res) => {
    try {
        const { tenantId } = getTenantContext(req);
        const firm = await getFirmForTenant(tenantId);
        if (!firm) {
            res.status(404).json({ success: false, error: 'Accountant firm not found' });
            return;
        }
        // Get all active client tenant IDs
        const mappings = await database_1.default.query(`SELECT acm.client_tenant_id, t.name AS client_name
       FROM accountant_client_mappings acm
       JOIN tenants t ON acm.client_tenant_id = t.id
       WHERE acm.firm_id = $1 AND acm.status = 'active'`, [firm.id]);
        if (mappings.rows.length === 0) {
            res.json({ success: true, data: [], message: 'No active clients' });
            return;
        }
        const clientSummaries = [];
        for (const row of mappings.rows) {
            const cid = row.client_tenant_id;
            let summary = {
                client_tenant_id: cid,
                client_name: row.client_name
            };
            try {
                // Journal entries summary
                const jeSummary = await database_1.default.query(`SELECT
             COUNT(*) FILTER (WHERE status = 'POSTED')  AS posted_entries,
             COUNT(*) FILTER (WHERE status = 'DRAFT')   AS draft_entries,
             COUNT(*)                                     AS total_entries
           FROM journal_entries WHERE tenant_id = $1`, [cid]);
                summary = { ...summary, ...jeSummary.rows[0] };
            }
            catch {
                // table may not exist
            }
            try {
                // Invoices summary
                const invSummary = await database_1.default.query(`SELECT
             COUNT(*)                                          AS total_invoices,
             COUNT(*) FILTER (WHERE status = 'paid')           AS paid_invoices,
             COUNT(*) FILTER (WHERE status IN ('sent','overdue')) AS outstanding_invoices,
             COALESCE(SUM(total_amount) FILTER (WHERE status IN ('sent','overdue')), 0) AS outstanding_amount
           FROM invoices WHERE tenant_id = $1`, [cid]);
                summary = { ...summary, ...invSummary.rows[0] };
            }
            catch {
                // table may not exist
            }
            try {
                // Bills / AP summary
                const billsSummary = await database_1.default.query(`SELECT
             COUNT(*)                                       AS total_bills,
             COUNT(*) FILTER (WHERE status = 'paid')        AS paid_bills,
             COUNT(*) FILTER (WHERE status IN ('pending','overdue')) AS unpaid_bills,
             COALESCE(SUM(total_amount) FILTER (WHERE status IN ('pending','overdue')), 0) AS unpaid_amount
           FROM bills WHERE tenant_id = $1`, [cid]);
                summary = { ...summary, ...billsSummary.rows[0] };
            }
            catch {
                // table may not exist
            }
            clientSummaries.push(summary);
        }
        res.json({ success: true, data: clientSummaries, total: clientSummaries.length });
    }
    catch (err) {
        console.error('getClientFinancialSummary error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};
exports.getClientFinancialSummary = getClientFinancialSummary;
// ============================================================================
// DEFAULT EXPORT
// ============================================================================
exports.default = {
    getFirmProfile: exports.getFirmProfile,
    createOrUpdateFirm: exports.createOrUpdateFirm,
    getFirmDashboard: exports.getFirmDashboard,
    getClients: exports.getClients,
    getClientDetail: exports.getClientDetail,
    addExistingClient: exports.addExistingClient,
    removeClient: exports.removeClient,
    updateClientEngagement: exports.updateClientEngagement,
    switchToClient: exports.switchToClient,
    switchBackToFirm: exports.switchBackToFirm,
    inviteClient: exports.inviteClient,
    inviteTeamMember: exports.inviteTeamMember,
    getInvitations: exports.getInvitations,
    cancelInvitation: exports.cancelInvitation,
    acceptInvitation: exports.acceptInvitation,
    getActivityLog: exports.getActivityLog,
    getClientFinancialSummary: exports.getClientFinancialSummary
};
