/**
 * Support Tickets Controller V2 - Tenant-Hardened
 * 
 * CRUD for support tickets within a tenant.
 * Tickets are scoped per tenant. Replies threaded per ticket.
 */

import { Response } from 'express';
import { pool } from '../config/database';
import { TenantRequest } from '../types';

function getTenantContext(req: TenantRequest): { tenantId: string; userId?: string } {
  const tenantId = req.tenant?.id;
  if (!tenantId) throw new Error('Tenant context required');
  return { tenantId, userId: req.user?.id };
}

export class SupportTicketsControllerV2 {

  /**
   * GET /api/v2/support-tickets
   */
  static async listTickets(req: TenantRequest, res: Response): Promise<void> {
    try {
      const { tenantId } = getTenantContext(req);
      const status = req.query.status as string;

      let query = `
        SELECT t.*, 
               u.first_name || ' ' || u.last_name AS created_by_name,
               a.first_name || ' ' || a.last_name AS assigned_to_name,
               (SELECT COUNT(*) FROM support_ticket_replies r WHERE r.ticket_id = t.id)::int AS replies_count
        FROM support_tickets t
        LEFT JOIN users u ON t.created_by = u.id
        LEFT JOIN users a ON t.assigned_to = a.id
        WHERE t.tenant_id = $1
      `;
      const params: any[] = [tenantId];

      if (status && status !== 'all') {
        params.push(status);
        query += ` AND t.status = $${params.length}`;
      }

      query += ' ORDER BY t.created_at DESC';

      const result = await pool.query(query, params);
      res.json({ success: true, tickets: result.rows });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * POST /api/v2/support-tickets
   */
  static async createTicket(req: TenantRequest, res: Response): Promise<void> {
    try {
      const { tenantId, userId } = getTenantContext(req);
      const { subject, description, category, priority } = req.body;

      if (!subject || !description) {
        res.status(400).json({ success: false, message: 'Subject and description are required' });
        return;
      }

      // Generate ticket number
      const countResult = await pool.query(
        'SELECT COUNT(*) FROM support_tickets WHERE tenant_id = $1',
        [tenantId]
      );
      const count = parseInt(countResult.rows[0].count) + 1;
      const ticketNumber = `TKT-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;

      const result = await pool.query(`
        INSERT INTO support_tickets (tenant_id, ticket_number, subject, description, category, priority, status, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, 'open', $7)
        RETURNING *
      `, [tenantId, ticketNumber, subject, description, category || 'general', priority || 'medium', userId]);

      res.status(201).json({ success: true, ticket: result.rows[0] });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/v2/support-tickets/:id
   */
  static async getTicket(req: TenantRequest, res: Response): Promise<void> {
    try {
      const { tenantId } = getTenantContext(req);
      const { id } = req.params;

      const result = await pool.query(`
        SELECT t.*, 
               u.first_name || ' ' || u.last_name AS created_by_name,
               a.first_name || ' ' || a.last_name AS assigned_to_name
        FROM support_tickets t
        LEFT JOIN users u ON t.created_by = u.id
        LEFT JOIN users a ON t.assigned_to = a.id
        WHERE t.id = $1 AND t.tenant_id = $2
      `, [id, tenantId]);

      if (result.rows.length === 0) {
        res.status(404).json({ success: false, message: 'Ticket not found' });
        return;
      }

      res.json({ success: true, ticket: result.rows[0] });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * PATCH /api/v2/support-tickets/:id
   */
  static async updateTicket(req: TenantRequest, res: Response): Promise<void> {
    try {
      const { tenantId } = getTenantContext(req);
      const { id } = req.params;
      const { status, priority, assigned_to } = req.body;

      const updates: string[] = [];
      const params: any[] = [id, tenantId];
      let idx = 3;

      if (status) { updates.push(`status = $${idx++}`); params.push(status); }
      if (priority) { updates.push(`priority = $${idx++}`); params.push(priority); }
      if (assigned_to !== undefined) { updates.push(`assigned_to = $${idx++}`); params.push(assigned_to || null); }
      updates.push(`updated_at = NOW()`);

      if (updates.length === 1) {
        res.status(400).json({ success: false, message: 'No updates provided' });
        return;
      }

      const result = await pool.query(`
        UPDATE support_tickets SET ${updates.join(', ')}
        WHERE id = $1 AND tenant_id = $2
        RETURNING *
      `, params);

      if (result.rows.length === 0) {
        res.status(404).json({ success: false, message: 'Ticket not found' });
        return;
      }

      res.json({ success: true, ticket: result.rows[0] });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /api/v2/support-tickets/:id/replies
   */
  static async listReplies(req: TenantRequest, res: Response): Promise<void> {
    try {
      const { tenantId } = getTenantContext(req);
      const { id } = req.params;

      // Verify ticket belongs to tenant
      const ticketCheck = await pool.query(
        'SELECT id FROM support_tickets WHERE id = $1 AND tenant_id = $2',
        [id, tenantId]
      );
      if (ticketCheck.rows.length === 0) {
        res.status(404).json({ success: false, message: 'Ticket not found' });
        return;
      }

      const result = await pool.query(`
        SELECT r.*, u.first_name || ' ' || u.last_name AS author_name, 
               CASE WHEN u.role = 'admin' OR u.role = 'super_admin' THEN true ELSE false END AS is_staff
        FROM support_ticket_replies r
        LEFT JOIN users u ON r.created_by = u.id
        WHERE r.ticket_id = $1
        ORDER BY r.created_at ASC
      `, [id]);

      res.json({ success: true, replies: result.rows });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * POST /api/v2/support-tickets/:id/replies
   */
  static async createReply(req: TenantRequest, res: Response): Promise<void> {
    try {
      const { tenantId, userId } = getTenantContext(req);
      const { id } = req.params;
      const { message } = req.body;

      if (!message) {
        res.status(400).json({ success: false, message: 'Message is required' });
        return;
      }

      // Verify ticket belongs to tenant
      const ticketCheck = await pool.query(
        'SELECT id, status FROM support_tickets WHERE id = $1 AND tenant_id = $2',
        [id, tenantId]
      );
      if (ticketCheck.rows.length === 0) {
        res.status(404).json({ success: false, message: 'Ticket not found' });
        return;
      }

      if (ticketCheck.rows[0].status === 'closed') {
        res.status(400).json({ success: false, message: 'Cannot reply to a closed ticket' });
        return;
      }

      const result = await pool.query(`
        INSERT INTO support_ticket_replies (ticket_id, message, created_by)
        VALUES ($1, $2, $3)
        RETURNING *
      `, [id, message, userId]);

      // Update ticket updated_at
      await pool.query(
        'UPDATE support_tickets SET updated_at = NOW() WHERE id = $1',
        [id]
      );

      res.status(201).json({ success: true, reply: result.rows[0] });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

export default SupportTicketsControllerV2;
