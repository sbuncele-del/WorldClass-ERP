/**
 * Support Tickets Controller V2 - Tenant-Hardened / Client Service Desk
 * 
 * CRUD for support tickets within a tenant.
 * Tickets linked to customers (from Sales/CRM or inline new client).
 * Email notifications to client & assigned staff on create/reply.
 */

import { Response } from 'express';
import { pool } from '../config/database';
import { TenantRequest } from '../types';
import { sendEmail } from '../services/email.service';

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
               t.customer_id, t.customer_name, t.customer_email, t.customer_phone,
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
      const { subject, description, category, priority, customer_id, customer_name, customer_email, customer_phone, assigned_to } = req.body;

      if (!subject || !description) {
        res.status(400).json({ success: false, message: 'Subject and description are required' });
        return;
      }

      // Resolve customer info: from existing customer or inline
      let resolvedName = customer_name || null;
      let resolvedEmail = customer_email || null;
      let resolvedPhone = customer_phone || null;
      let resolvedCustomerId = customer_id || null;

      if (customer_id) {
        // Pull customer details from customers table
        const custResult = await pool.query(
          'SELECT company_name, contact_person, email, phone FROM customers WHERE customer_id = $1 AND tenant_id = $2',
          [customer_id, tenantId]
        );
        if (custResult.rows.length > 0) {
          const cust = custResult.rows[0];
          resolvedName = cust.company_name || cust.contact_person || resolvedName;
          resolvedEmail = cust.email || resolvedEmail;
          resolvedPhone = cust.phone || resolvedPhone;
        }
      }

      // Generate ticket number
      const countResult = await pool.query(
        'SELECT COUNT(*) FROM support_tickets WHERE tenant_id = $1',
        [tenantId]
      );
      const count = parseInt(countResult.rows[0].count) + 1;
      const ticketNumber = `TKT-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;

      const result = await pool.query(`
        INSERT INTO support_tickets (tenant_id, ticket_number, subject, description, category, priority, status, created_by, assigned_to, customer_id, customer_name, customer_email, customer_phone)
        VALUES ($1, $2, $3, $4, $5, $6, 'open', $7, $8, $9, $10, $11, $12)
        RETURNING *
      `, [tenantId, ticketNumber, subject, description, category || 'general', priority || 'medium', userId, assigned_to || null, resolvedCustomerId, resolvedName, resolvedEmail, resolvedPhone]);

      const dashboardUrl = process.env.FRONTEND_URL || 'https://app.example.com';
      let notificationSent = false;

      // Send email notification to the CLIENT
      if (resolvedEmail) {
        try {
          await sendEmail({
            to: resolvedEmail,
            subject: `Ticket Created: ${ticketNumber} — ${subject}`,
            template: 'ticket-created',
            variables: {
              userName: resolvedName || 'Valued Client',
              ticketNumber,
              subject,
              description: description.length > 300 ? description.substring(0, 300) + '...' : description,
              category: category || 'general',
              priority: priority || 'medium',
              dashboardUrl,
            },
            category: 'support',
          });
          notificationSent = true;
        } catch (emailErr: any) {
          console.error('Failed to send client ticket email:', emailErr.message);
        }
      }

      // Send email notification to the ASSIGNED STAFF member (or tenant admin)
      try {
        let staffEmail: string | null = null;
        let staffName = 'Team';
        if (assigned_to) {
          const staffResult = await pool.query(
            'SELECT email, first_name, last_name FROM users WHERE id = $1',
            [assigned_to]
          );
          if (staffResult.rows.length > 0) {
            staffEmail = staffResult.rows[0].email;
            staffName = `${staffResult.rows[0].first_name || ''} ${staffResult.rows[0].last_name || ''}`.trim() || 'Team';
          }
        } else {
          // Notify tenant admin if no one assigned
          const adminResult = await pool.query(
            "SELECT email, first_name, last_name FROM users WHERE tenant_id = $1 AND role IN ('admin', 'super_admin') LIMIT 1",
            [tenantId]
          );
          if (adminResult.rows.length > 0) {
            staffEmail = adminResult.rows[0].email;
            staffName = `${adminResult.rows[0].first_name || ''} ${adminResult.rows[0].last_name || ''}`.trim() || 'Admin';
          }
        }
        if (staffEmail) {
          await sendEmail({
            to: staffEmail,
            subject: `New Ticket ${ticketNumber} from ${resolvedName || 'a user'}: ${subject}`,
            template: 'ticket-created',
            variables: {
              userName: staffName,
              ticketNumber,
              subject,
              description: description.length > 300 ? description.substring(0, 300) + '...' : description,
              category: category || 'general',
              priority: priority || 'medium',
              dashboardUrl,
              clientName: resolvedName || 'Not specified',
              clientEmail: resolvedEmail || 'Not specified',
            },
            category: 'support',
          });
        }
      } catch (emailErr: any) {
        console.error('Failed to send staff ticket email:', emailErr.message);
      }

      // Update notification_sent flag
      if (notificationSent) {
        await pool.query('UPDATE support_tickets SET notification_sent = true WHERE id = $1', [result.rows[0].id]);
      }

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
               t.customer_id, t.customer_name, t.customer_email, t.customer_phone,
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
        'SELECT id, status, customer_email, customer_name FROM support_tickets WHERE id = $1 AND tenant_id = $2',
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

      // Send email to the CLIENT about the reply
      try {
        const ticket = ticketCheck.rows[0];
        const ticketFull = await pool.query(
          'SELECT ticket_number, subject FROM support_tickets WHERE id = $1', [id]
        );
        const tkt = ticketFull.rows[0];

        const replyAuthorResult = await pool.query(
          'SELECT first_name, last_name FROM users WHERE id = $1', [userId]
        );
        const replyAuthor = replyAuthorResult.rows.length > 0
          ? `${replyAuthorResult.rows[0].first_name || ''} ${replyAuthorResult.rows[0].last_name || ''}`.trim()
          : 'Support Team';
        const dashboardUrl = process.env.FRONTEND_URL || 'https://app.example.com';

        // Notify client
        if (ticket.customer_email) {
          await sendEmail({
            to: ticket.customer_email,
            subject: `Update on ${tkt.ticket_number}: ${tkt.subject}`,
            template: 'ticket-reply',
            variables: {
              userName: ticket.customer_name || 'Valued Client',
              ticketNumber: tkt.ticket_number,
              subject: tkt.subject,
              replyAuthor,
              replyMessage: message.length > 500 ? message.substring(0, 500) + '...' : message,
              dashboardUrl,
            },
            category: 'support',
          });
        }

        // Also notify internal ticket creator if different from replier
        const creatorResult = await pool.query(
          `SELECT t.created_by, u.email, u.first_name, u.last_name
           FROM support_tickets t LEFT JOIN users u ON t.created_by = u.id
           WHERE t.id = $1`, [id]
        );
        if (creatorResult.rows.length > 0 && creatorResult.rows[0].email && creatorResult.rows[0].created_by !== userId) {
          const creator = creatorResult.rows[0];
          await sendEmail({
            to: creator.email,
            subject: `Reply on ${tkt.ticket_number}: ${tkt.subject}`,
            template: 'ticket-reply',
            variables: {
              userName: `${creator.first_name || ''} ${creator.last_name || ''}`.trim() || 'User',
              ticketNumber: tkt.ticket_number,
              subject: tkt.subject,
              replyAuthor,
              replyMessage: message.length > 500 ? message.substring(0, 500) + '...' : message,
              dashboardUrl,
            },
            category: 'support',
          });
        }
      } catch (emailErr: any) {
        console.error('Failed to send ticket reply email:', emailErr.message);
      }

      res.status(201).json({ success: true, reply: result.rows[0] });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

export default SupportTicketsControllerV2;
