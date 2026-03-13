/**
 * Auditor Portal Controller
 * Handles communication between auditors and clients via the external auditor portal.
 * 
 * Features:
 * - Audit Packages (client pushes ERP data for auditor download)
 * - Information Requests (auditor asks client for documents/data)
 * - Messages (bidirectional, email-mirrored communication)
 * 
 * All messages and requests trigger email notifications via Resend.
 */

import { Response } from 'express';
import { TenantRequest } from '../types';
import { pool } from '../config/database';

// ─── Email helper via Resend ───
async function sendPortalEmail(to: string, subject: string, html: string) {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.FROM_EMAIL || 'noreply@siyabusaerp.co.za';
    if (!apiKey) { console.warn('RESEND_API_KEY not set — skipping email'); return; }
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: `SiyaBusa ERP <${fromEmail}>`, to: [to], subject, html }),
    });
    if (!resp.ok) console.error('Resend email failed:', await resp.text());
    else console.log(`Email sent to ${to}: ${subject}`);
  } catch (err) {
    console.error('Email send error:', err);
  }
}

function getTenantContext(req: TenantRequest): { tenantId: string; userId: string } {
  const tenantId = req.tenant?.id;
  const userId = req.user?.id;
  if (!tenantId) throw new Error('Tenant context required');
  return { tenantId, userId: userId || '' };
}

// ============================================================================
// DATABASE SETUP — Creates tables if they don't exist
// ============================================================================

async function ensurePortalTables(tenantId: string) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS auditor_portal_packages (
      id SERIAL PRIMARY KEY,
      tenant_id VARCHAR(100) NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      period VARCHAR(100),
      status VARCHAR(50) DEFAULT 'complete',
      prepared_by VARCHAR(255),
      prepared_date DATE DEFAULT CURRENT_DATE,
      engagement_id INTEGER,
      documents JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS auditor_portal_requests (
      id SERIAL PRIMARY KEY,
      tenant_id VARCHAR(100) NOT NULL,
      title VARCHAR(500) NOT NULL,
      description TEXT,
      category VARCHAR(100) DEFAULT 'Financial',
      priority VARCHAR(50) DEFAULT 'medium',
      status VARCHAR(50) DEFAULT 'pending',
      requested_by VARCHAR(255),
      requested_by_email VARCHAR(255),
      due_date DATE,
      response TEXT,
      response_by VARCHAR(255),
      response_date TIMESTAMPTZ,
      attachments JSONB DEFAULT '[]'::jsonb,
      email_sent BOOLEAN DEFAULT false,
      engagement_id INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS auditor_portal_messages (
      id SERIAL PRIMARY KEY,
      tenant_id VARCHAR(100) NOT NULL,
      sender_type VARCHAR(20) NOT NULL,
      sender_name VARCHAR(255) NOT NULL,
      sender_email VARCHAR(255),
      recipient_name VARCHAR(255),
      recipient_email VARCHAR(255),
      subject VARCHAR(500),
      body TEXT NOT NULL,
      attachment_name VARCHAR(500),
      attachment_url TEXT,
      email_sent BOOLEAN DEFAULT false,
      read BOOLEAN DEFAULT false,
      engagement_id INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_portal_packages_tenant ON auditor_portal_packages(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_portal_requests_tenant ON auditor_portal_requests(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_portal_messages_tenant ON auditor_portal_messages(tenant_id);
  `);
}

// ============================================================================
// AUDIT PACKAGES
// ============================================================================

/** GET /api/audit/portal/packages — List all audit packages */
export const getPackages = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId } = getTenantContext(req);
    await ensurePortalTables(tenantId);

    const result = await pool.query(
      `SELECT * FROM auditor_portal_packages WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );

    res.json({ success: true, data: result.rows });
  } catch (err: any) {
    console.error('getPackages error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/** POST /api/audit/portal/packages — Create audit package (client-side) */
export const createPackage = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId, userId } = getTenantContext(req);
    await ensurePortalTables(tenantId);

    const { name, description, period, documents, engagement_id, prepared_by } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Package name required' });

    const result = await pool.query(
      `INSERT INTO auditor_portal_packages (tenant_id, name, description, period, documents, engagement_id, prepared_by)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7) RETURNING *`,
      [tenantId, name, description || null, period || null, JSON.stringify(documents || []), engagement_id || null, prepared_by || 'System']
    );

    // Notify auditor(s) that a new package is available
    sendPortalEmail(
      'auditor@firm.co.za', // In production, look up auditor emails from engagement
      `Audit Package Ready: ${name}`,
      `<h2>New Audit Package Available</h2><p>A new audit package <strong>${name}</strong> has been prepared and is ready for download on the <a href="https://auditor.siyabusaerp.co.za">Auditor Portal</a>.</p><p>Period: ${period || 'N/A'}</p><p>Documents: ${(documents || []).length} files</p>`
    ).catch(() => {});

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    console.error('createPackage error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/** GET /api/audit/portal/packages/:id — Get single package with documents */
export const getPackageById = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId } = getTenantContext(req);
    const { id } = req.params;

    const result = await pool.query(
      `SELECT * FROM auditor_portal_packages WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );

    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Package not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================================================
// INFORMATION REQUESTS
// ============================================================================

/** GET /api/audit/portal/requests — List info requests */
export const getRequests = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId } = getTenantContext(req);
    await ensurePortalTables(tenantId);

    const { status } = req.query;
    let query = `SELECT * FROM auditor_portal_requests WHERE tenant_id = $1`;
    const params: any[] = [tenantId];

    if (status) {
      query += ` AND status = $2`;
      params.push(status);
    }
    query += ` ORDER BY created_at DESC`;

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** POST /api/audit/portal/requests — Create info request (auditor sends) */
export const createRequest = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId } = getTenantContext(req);
    await ensurePortalTables(tenantId);

    const { title, description, category, priority, due_date, engagement_id, requested_by, requested_by_email } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Request title required' });

    const result = await pool.query(
      `INSERT INTO auditor_portal_requests 
       (tenant_id, title, description, category, priority, due_date, engagement_id, requested_by, requested_by_email, email_sent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true) RETURNING *`,
      [tenantId, title, description || null, category || 'Financial', priority || 'medium',
       due_date || null, engagement_id || null, requested_by || 'Auditor', requested_by_email || null]
    );

    // Email client about new info request
    const clientEmail = process.env.ADMIN_EMAIL || 'sbuncele@gmail.com';
    sendPortalEmail(
      clientEmail,
      `Audit Request: ${title}`,
      `<h2>Information Request from Auditor</h2><p><strong>${requested_by || 'Auditor'}</strong> has requested: <strong>${title}</strong></p><p>${description || ''}</p><p>Priority: ${priority || 'medium'} | Due: ${due_date || 'ASAP'}</p><p><a href="https://platform.siyabusaerp.co.za">Respond in the ERP</a></p>`
    ).catch(() => {});

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** PUT /api/audit/portal/requests/:id — Update request (client responds, or status change) */
export const updateRequest = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId } = getTenantContext(req);
    const { id } = req.params;
    const { status, response, response_by, attachments } = req.body;

    const updates: string[] = [];
    const params: any[] = [tenantId, id];
    let idx = 3;

    if (status) { updates.push(`status = $${idx}`); params.push(status); idx++; }
    if (response) {
      updates.push(`response = $${idx}`); params.push(response); idx++;
      updates.push(`response_date = NOW()`);
      if (response_by) { updates.push(`response_by = $${idx}`); params.push(response_by); idx++; }
    }
    if (attachments) { updates.push(`attachments = $${idx}::jsonb`); params.push(JSON.stringify(attachments)); idx++; }
    updates.push(`updated_at = NOW()`);

    if (updates.length === 0) return res.status(400).json({ success: false, message: 'No fields to update' });

    const result = await pool.query(
      `UPDATE auditor_portal_requests SET ${updates.join(', ')} WHERE id = $2 AND tenant_id = $1 RETURNING *`,
      params
    );

    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Request not found' });

    // Email auditor about request update
    const updatedReq = result.rows[0];
    if (updatedReq.requested_by_email) {
      sendPortalEmail(
        updatedReq.requested_by_email,
        `Request Updated: ${updatedReq.title}`,
        `<h2>Information Request Updated</h2><p>Your request <strong>${updatedReq.title}</strong> has been updated to: <strong>${updatedReq.status}</strong></p>${updatedReq.response ? `<p>Response: ${updatedReq.response}</p>` : ''}<p><a href="https://auditor.siyabusaerp.co.za">View on Auditor Portal</a></p>`
      ).catch(() => {});
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================================================
// MESSAGES (email-mirrored)
// ============================================================================

/** GET /api/audit/portal/messages — List messages */
export const getMessages = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId } = getTenantContext(req);
    await ensurePortalTables(tenantId);

    const { engagement_id, unread_only } = req.query;
    let query = `SELECT * FROM auditor_portal_messages WHERE tenant_id = $1`;
    const params: any[] = [tenantId];
    let idx = 2;

    if (engagement_id) { query += ` AND engagement_id = $${idx}`; params.push(engagement_id); idx++; }
    if (unread_only === 'true') { query += ` AND read = false`; }
    query += ` ORDER BY created_at ASC`;

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** POST /api/audit/portal/messages — Send a message */
export const sendMessage = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId } = getTenantContext(req);
    await ensurePortalTables(tenantId);

    const { sender_type, sender_name, sender_email, recipient_name, recipient_email, subject, body, attachment_name, attachment_url, engagement_id } = req.body;
    if (!body || !sender_type) return res.status(400).json({ success: false, message: 'Message body and sender_type required' });

    const result = await pool.query(
      `INSERT INTO auditor_portal_messages 
       (tenant_id, sender_type, sender_name, sender_email, recipient_name, recipient_email, subject, body, attachment_name, attachment_url, email_sent, engagement_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, $11) RETURNING *`,
      [tenantId, sender_type, sender_name || 'Unknown', sender_email || null,
       recipient_name || null, recipient_email || null, subject || 'Audit Communication',
       body, attachment_name || null, attachment_url || null, engagement_id || null]
    );

    // Send email copy via Resend
    const emailTo = recipient_email || (sender_type === 'auditor' ? (process.env.ADMIN_EMAIL || 'sbuncele@gmail.com') : sender_email);
    if (emailTo) {
      sendPortalEmail(
        emailTo,
        subject || 'Audit Communication',
        `<h2>${subject || 'Audit Communication'}</h2><p><strong>From:</strong> ${sender_name}</p><p>${body.replace(/\n/g, '<br>')}</p>${attachment_name ? `<p>Attachment: ${attachment_name}</p>` : ''}<p style="color:#888;font-size:12px">This message was sent via the SiyaBusa ERP Auditor Portal. <a href="https://auditor.siyabusaerp.co.za">View in portal</a></p>`
      ).catch(() => {});
    }

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** PUT /api/audit/portal/messages/mark-read — Mark messages as read */
export const markMessagesRead = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId } = getTenantContext(req);
    const { ids, sender_type } = req.body; // Mark all from sender, or specific IDs

    if (ids && Array.isArray(ids)) {
      await pool.query(
        `UPDATE auditor_portal_messages SET read = true WHERE tenant_id = $1 AND id = ANY($2::int[])`,
        [tenantId, ids]
      );
    } else if (sender_type) {
      await pool.query(
        `UPDATE auditor_portal_messages SET read = true WHERE tenant_id = $1 AND sender_type = $2 AND read = false`,
        [tenantId, sender_type]
      );
    }

    res.json({ success: true, message: 'Messages marked as read' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================================================
// DASHBOARD (overview stats for both auditor portal and main ERP)
// ============================================================================

/** GET /api/audit/portal/dashboard — Aggregated stats */
export const getDashboard = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId } = getTenantContext(req);
    await ensurePortalTables(tenantId);

    const [packages, requests, messages, unread] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int as count FROM auditor_portal_packages WHERE tenant_id = $1`, [tenantId]),
      pool.query(`SELECT status, COUNT(*)::int as count FROM auditor_portal_requests WHERE tenant_id = $1 GROUP BY status`, [tenantId]),
      pool.query(`SELECT COUNT(*)::int as count FROM auditor_portal_messages WHERE tenant_id = $1`, [tenantId]),
      pool.query(`SELECT COUNT(*)::int as count FROM auditor_portal_messages WHERE tenant_id = $1 AND read = false`, [tenantId]),
    ]);

    const requestsByStatus: Record<string, number> = {};
    requests.rows.forEach((r: any) => { requestsByStatus[r.status] = r.count; });

    res.json({
      success: true,
      data: {
        totalPackages: packages.rows[0]?.count || 0,
        totalRequests: Object.values(requestsByStatus).reduce((a: number, b: number) => a + b, 0),
        pendingRequests: (requestsByStatus['pending'] || 0) + (requestsByStatus['in_progress'] || 0),
        fulfilledRequests: requestsByStatus['fulfilled'] || 0,
        totalMessages: messages.rows[0]?.count || 0,
        unreadMessages: unread.rows[0]?.count || 0,
        requestsByStatus,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};
