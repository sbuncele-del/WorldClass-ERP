/**
 * Email Controller - IMAP/SMTP Email Integration
 *
 * Handles real email account management, inbox sync, sending, and folder operations.
 * The frontend CommunicationsHub calls these endpoints at /api/email/*.
 *
 * Endpoints:
 *  GET    /accounts           - List connected email accounts
 *  POST   /accounts           - Add a new IMAP/SMTP email account
 *  DELETE /accounts/:id       - Remove an email account
 *  GET    /inbox              - Fetch emails (supports folder & search)
 *  GET    /message/:id        - Get single email detail
 *  PUT    /message/:id/star   - Toggle star on an email
 *  DELETE /message/:id        - Move email to trash (or permanently delete if already in trash)
 *  POST   /message/:id/restore - Restore email from trash to inbox
 *  POST   /draft              - Save a draft email
 *  POST   /send               - Send an email via SMTP
 *  POST   /sync               - Trigger IMAP sync
 *  GET    /folder-counts      - Get counts per folder
 */

import { Request, Response } from 'express';
import pool from '../config/database';

// ============================================================================
// TABLE BOOTSTRAP
// Ensures the email_accounts and email_messages tables exist.
// This runs once on first import; uses IF NOT EXISTS so it is idempotent.
// ============================================================================
const ensureTablesExist = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_accounts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        user_id UUID,
        email_address VARCHAR(255) NOT NULL,
        display_name VARCHAR(255),
        imap_host VARCHAR(255) NOT NULL,
        imap_port INTEGER NOT NULL DEFAULT 993,
        imap_secure BOOLEAN DEFAULT true,
        smtp_host VARCHAR(255) NOT NULL,
        smtp_port INTEGER NOT NULL DEFAULT 465,
        smtp_secure BOOLEAN DEFAULT true,
        username VARCHAR(255) NOT NULL,
        password_encrypted TEXT NOT NULL,
        is_default BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        last_sync_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_email_accounts_tenant ON email_accounts(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_email_accounts_user ON email_accounts(user_id);

      CREATE TABLE IF NOT EXISTS email_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        account_id UUID REFERENCES email_accounts(id) ON DELETE CASCADE,
        message_id VARCHAR(500),
        folder VARCHAR(100) DEFAULT 'INBOX',
        from_address VARCHAR(255),
        from_name VARCHAR(255),
        to_addresses TEXT,
        cc_addresses TEXT,
        subject VARCHAR(1000),
        body_text TEXT,
        body_html TEXT,
        date TIMESTAMP,
        is_read BOOLEAN DEFAULT false,
        is_starred BOOLEAN DEFAULT false,
        is_deleted BOOLEAN DEFAULT false,
        has_attachments BOOLEAN DEFAULT false,
        attachments_json TEXT,
        uid INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_email_messages_tenant ON email_messages(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_email_messages_account ON email_messages(account_id);
      CREATE INDEX IF NOT EXISTS idx_email_messages_folder ON email_messages(folder);
      CREATE INDEX IF NOT EXISTS idx_email_messages_date ON email_messages(date DESC);
    `);
  } catch (err) {
    // Tables may already exist or DB not ready; log and continue
    console.error('Email tables bootstrap warning:', (err as Error).message);
  }
};

// Run on module load
ensureTablesExist();

// ============================================================================
// HELPERS
// ============================================================================
function getTenantUserId(req: Request): { tenantId: string; userId: string } {
  const tenantId = (req as any).tenantId || (req as any).tenant?.id;
  const userId = (req as any).userId || (req as any).user?.id || '';
  if (!tenantId) {
    throw new Error('Tenant context required');
  }
  return { tenantId, userId };
}

// ============================================================================
// GET /accounts - List email accounts for tenant/user
// ============================================================================
export const getAccounts = async (req: Request, res: Response) => {
  try {
    const { tenantId, userId } = getTenantUserId(req);

    const result = await pool.query(
      `SELECT id, tenant_id, email_address, display_name,
              imap_host, imap_port, imap_secure,
              smtp_host, smtp_port, smtp_secure,
              username, is_default, is_active, last_sync_at,
              created_at, updated_at
       FROM email_accounts
       WHERE tenant_id = $1
       ORDER BY is_default DESC, created_at ASC`,
      [tenantId]
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get email accounts error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch email accounts' });
  }
};

// ============================================================================
// POST /accounts - Add a new email account (IMAP/SMTP)
// ============================================================================
export const addAccount = async (req: Request, res: Response) => {
  try {
    const { tenantId, userId } = getTenantUserId(req);
    const {
      email_address, display_name, username, password,
      imap_host, imap_port, imap_secure,
      smtp_host, smtp_port, smtp_secure,
      is_default
    } = req.body;

    if (!email_address || !username || !password || !imap_host || !smtp_host) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: email_address, username, password, imap_host, smtp_host'
      });
    }

    // If setting as default, un-default others first
    if (is_default) {
      await pool.query(
        'UPDATE email_accounts SET is_default = false WHERE tenant_id = $1',
        [tenantId]
      );
    }

    const result = await pool.query(
      `INSERT INTO email_accounts
        (tenant_id, user_id, email_address, display_name, username, password_encrypted,
         imap_host, imap_port, imap_secure, smtp_host, smtp_port, smtp_secure, is_default, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true)
       RETURNING id, tenant_id, email_address, display_name,
                 imap_host, imap_port, imap_secure,
                 smtp_host, smtp_port, smtp_secure,
                 username, is_default, is_active, last_sync_at`,
      [
        tenantId, userId, email_address, display_name || '', username, password,
        imap_host, imap_port || 993, imap_secure !== false,
        smtp_host, smtp_port || 465, smtp_secure !== false,
        is_default || false
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Email account added successfully. Sync will begin shortly.',
      data: result.rows[0]
    });
  } catch (error: any) {
    console.error('Add email account error:', error);
    if (error.code === '23505') {
      return res.status(400).json({ success: false, message: 'This email account is already connected' });
    }
    res.status(500).json({ success: false, message: 'Failed to add email account' });
  }
};

// ============================================================================
// DELETE /accounts/:id - Remove an email account
// ============================================================================
export const deleteAccount = async (req: Request, res: Response) => {
  try {
    const { tenantId } = getTenantUserId(req);
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM email_accounts WHERE id = $1 AND tenant_id = $2 RETURNING id',
      [id, tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Email account not found' });
    }

    res.json({ success: true, message: 'Email account removed' });
  } catch (error) {
    console.error('Delete email account error:', error);
    res.status(500).json({ success: false, message: 'Failed to remove email account' });
  }
};

// ============================================================================
// GET /inbox - Fetch emails with folder and search support
// Frontend sends: ?limit=50&folder=INBOX (or Sent, Drafts, Trash, starred, all)
// ============================================================================
export const getInbox = async (req: Request, res: Response) => {
  try {
    const { tenantId } = getTenantUserId(req);
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = parseInt(req.query.offset as string) || 0;
    const folder = (req.query.folder as string) || 'INBOX';
    const search = req.query.search as string;

    let query = '';
    const params: any[] = [tenantId];

    if (folder === 'starred') {
      // Virtual folder: all starred emails
      query = `SELECT * FROM email_messages WHERE tenant_id = $1 AND is_starred = true AND is_deleted = false`;
    } else if (folder === 'all') {
      // Virtual folder: all emails
      query = `SELECT * FROM email_messages WHERE tenant_id = $1 AND is_deleted = false`;
    } else {
      // Real folder (INBOX, Sent, Drafts, Trash)
      params.push(folder);
      if (folder === 'Trash') {
        query = `SELECT * FROM email_messages WHERE tenant_id = $1 AND (folder = $2 OR is_deleted = true)`;
      } else {
        query = `SELECT * FROM email_messages WHERE tenant_id = $1 AND folder = $2 AND is_deleted = false`;
      }
    }

    // Search filter
    if (search) {
      params.push(`%${search}%`);
      const searchIdx = params.length;
      query += ` AND (subject ILIKE $${searchIdx} OR from_name ILIKE $${searchIdx} OR from_address ILIKE $${searchIdx} OR to_addresses ILIKE $${searchIdx})`;
    }

    // Count total
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM (${query}) sub`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Fetch page
    query += ` ORDER BY date DESC NULLS LAST LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      total,
      syncing: false
    });
  } catch (error) {
    console.error('Get inbox error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch emails', data: [], total: 0 });
  }
};

// ============================================================================
// GET /message/:id - Get single email detail
// ============================================================================
export const getMessage = async (req: Request, res: Response) => {
  try {
    const { tenantId } = getTenantUserId(req);
    const { id } = req.params;

    const result = await pool.query(
      `SELECT * FROM email_messages WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Email not found' });
    }

    // Mark as read
    await pool.query(
      'UPDATE email_messages SET is_read = true WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Get message error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch email' });
  }
};

// ============================================================================
// PUT /message/:id/star - Toggle star
// ============================================================================
export const toggleStar = async (req: Request, res: Response) => {
  try {
    const { tenantId } = getTenantUserId(req);
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE email_messages SET is_starred = NOT is_starred
       WHERE id = $1 AND tenant_id = $2
       RETURNING id, is_starred`,
      [id, tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Email not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Toggle star error:', error);
    res.status(500).json({ success: false, message: 'Failed to toggle star' });
  }
};

// ============================================================================
// DELETE /message/:id - Move to trash or permanently delete
// ============================================================================
export const deleteMessage = async (req: Request, res: Response) => {
  try {
    const { tenantId } = getTenantUserId(req);
    const { id } = req.params;

    // Check if already in trash
    const existing = await pool.query(
      `SELECT folder, is_deleted FROM email_messages WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Email not found' });
    }

    if (existing.rows[0].folder === 'Trash' || existing.rows[0].is_deleted) {
      // Permanently delete
      await pool.query(
        'DELETE FROM email_messages WHERE id = $1 AND tenant_id = $2',
        [id, tenantId]
      );
      res.json({ success: true, message: 'Email permanently deleted' });
    } else {
      // Move to trash
      await pool.query(
        `UPDATE email_messages SET folder = 'Trash', is_deleted = true WHERE id = $1 AND tenant_id = $2`,
        [id, tenantId]
      );
      res.json({ success: true, message: 'Email moved to Trash' });
    }
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete email' });
  }
};

// ============================================================================
// POST /message/:id/restore - Restore email from trash to inbox
// ============================================================================
export const restoreMessage = async (req: Request, res: Response) => {
  try {
    const { tenantId } = getTenantUserId(req);
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE email_messages SET folder = 'INBOX', is_deleted = false
       WHERE id = $1 AND tenant_id = $2
       RETURNING id`,
      [id, tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Email not found' });
    }

    res.json({ success: true, message: 'Email restored to Inbox' });
  } catch (error) {
    console.error('Restore message error:', error);
    res.status(500).json({ success: false, message: 'Failed to restore email' });
  }
};

// ============================================================================
// POST /draft - Save a draft email
// ============================================================================
export const saveDraft = async (req: Request, res: Response) => {
  try {
    const { tenantId, userId } = getTenantUserId(req);
    const { to, cc, subject, body } = req.body;

    // Get first account for this tenant
    const accountResult = await pool.query(
      'SELECT id, email_address, display_name FROM email_accounts WHERE tenant_id = $1 ORDER BY is_default DESC LIMIT 1',
      [tenantId]
    );

    const account = accountResult.rows[0];
    const fromAddress = account?.email_address || '';
    const fromName = account?.display_name || '';

    const result = await pool.query(
      `INSERT INTO email_messages
        (tenant_id, account_id, folder, from_address, from_name, to_addresses, cc_addresses,
         subject, body_text, date, is_read)
       VALUES ($1, $2, 'Drafts', $3, $4, $5, $6, $7, $8, NOW(), true)
       RETURNING id`,
      [tenantId, account?.id || null, fromAddress, fromName, to || '', cc || '', subject || '', body || '']
    );

    res.json({ success: true, message: 'Draft saved', data: result.rows[0] });
  } catch (error) {
    console.error('Save draft error:', error);
    res.status(500).json({ success: false, message: 'Failed to save draft' });
  }
};

// ============================================================================
// POST /send - Send an email via SMTP
// Currently stores the sent email in the database. Real SMTP sending can be
// integrated later with nodemailer when IMAP/SMTP libraries are added.
// ============================================================================
export const sendEmail = async (req: Request, res: Response) => {
  try {
    const { tenantId, userId } = getTenantUserId(req);
    const { to, cc, subject, body, html } = req.body;

    if (!to || (!body && !html)) {
      return res.status(400).json({ success: false, message: 'Recipients and message body are required' });
    }

    // Get the default account
    const accountResult = await pool.query(
      'SELECT id, email_address, display_name, smtp_host, smtp_port, smtp_secure, username, password_encrypted FROM email_accounts WHERE tenant_id = $1 ORDER BY is_default DESC LIMIT 1',
      [tenantId]
    );

    if (accountResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No email account configured. Please add an email account in Settings.'
      });
    }

    const account = accountResult.rows[0];
    const toAddresses = Array.isArray(to) ? to.join(', ') : to;
    const ccAddresses = cc ? (Array.isArray(cc) ? cc.join(', ') : cc) : null;

    // Attempt to send via SMTP using nodemailer if available
    let smtpSent = false;
    try {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        host: account.smtp_host,
        port: account.smtp_port,
        secure: account.smtp_secure,
        auth: {
          user: account.username,
          pass: account.password_encrypted
        },
        tls: { rejectUnauthorized: false }
      });

      await transporter.sendMail({
        from: account.display_name
          ? `"${account.display_name}" <${account.email_address}>`
          : account.email_address,
        to: toAddresses,
        cc: ccAddresses || undefined,
        subject: subject || '(No Subject)',
        text: body || '',
        html: html || undefined
      });

      smtpSent = true;
    } catch (smtpErr: any) {
      console.error('SMTP send error (falling back to DB store):', smtpErr.message);
      // If nodemailer is not installed or SMTP fails, we still store the email
    }

    // Store in sent folder
    await pool.query(
      `INSERT INTO email_messages
        (tenant_id, account_id, folder, from_address, from_name, to_addresses, cc_addresses,
         subject, body_text, body_html, date, is_read)
       VALUES ($1, $2, 'Sent', $3, $4, $5, $6, $7, $8, $9, NOW(), true)`,
      [
        tenantId, account.id, account.email_address, account.display_name || '',
        toAddresses, ccAddresses, subject || '(No Subject)', body || '', html || null
      ]
    );

    res.json({
      success: true,
      message: smtpSent ? 'Email sent successfully!' : 'Email saved to Sent folder (SMTP delivery pending - check server logs)'
    });
  } catch (error) {
    console.error('Send email error:', error);
    res.status(500).json({ success: false, message: 'Failed to send email' });
  }
};

// ============================================================================
// POST /sync - Trigger IMAP sync
// Connects to the configured IMAP server and fetches new emails.
// Falls back to a no-op acknowledgement if IMAP libraries are unavailable.
// ============================================================================
export const syncEmails = async (req: Request, res: Response) => {
  try {
    const { tenantId } = getTenantUserId(req);

    // Get configured accounts
    const accountResult = await pool.query(
      'SELECT * FROM email_accounts WHERE tenant_id = $1 AND is_active = true',
      [tenantId]
    );

    if (accountResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No email accounts configured. Add an account first.'
      });
    }

    let synced = 0;

    for (const account of accountResult.rows) {
      try {
        // Try IMAP sync via imap-simple or imapflow if available
        const Imap = require('imap-simple');

        const config = {
          imap: {
            user: account.username,
            password: account.password_encrypted,
            host: account.imap_host,
            port: account.imap_port,
            tls: account.imap_secure,
            tlsOptions: { rejectUnauthorized: false },
            authTimeout: 10000
          }
        };

        const connection = await Imap.connect(config);
        await connection.openBox('INBOX');

        // Fetch emails from the last 7 days (or since last sync)
        const searchCriteria = account.last_sync_at
          ? ['ALL', ['SINCE', new Date(account.last_sync_at).toISOString().split('T')[0]]]
          : ['ALL', ['SINCE', new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]]];

        const fetchOptions = {
          bodies: ['HEADER', 'TEXT', ''],
          markSeen: false,
          struct: true
        };

        const messages = await connection.search(searchCriteria, fetchOptions);

        for (const msg of messages) {
          const header = msg.parts.find((p: any) => p.which === 'HEADER');
          if (!header) continue;

          const parsedHeader = header.body;
          const messageId = (parsedHeader['message-id'] || [''])[0];
          const subject = (parsedHeader['subject'] || ['(No Subject)'])[0];
          const fromRaw = (parsedHeader['from'] || [''])[0];
          const toRaw = (parsedHeader['to'] || [''])[0];
          const ccRaw = (parsedHeader['cc'] || [''])[0];
          const dateRaw = (parsedHeader['date'] || [''])[0];

          // Extract name and address from "Name <email>" format
          const fromMatch = fromRaw.match(/^"?(.+?)"?\s*<(.+?)>$/) || [null, '', fromRaw];
          const fromName = fromMatch[1] || '';
          const fromAddress = fromMatch[2] || fromRaw;

          // Check for duplicates by message_id
          const exists = await pool.query(
            'SELECT id FROM email_messages WHERE tenant_id = $1 AND message_id = $2',
            [tenantId, messageId]
          );

          if (exists.rows.length === 0 && messageId) {
            // Get the text body
            const textPart = msg.parts.find((p: any) => p.which === 'TEXT');
            const bodyText = textPart?.body || '';

            await pool.query(
              `INSERT INTO email_messages
                (tenant_id, account_id, message_id, folder, from_address, from_name,
                 to_addresses, cc_addresses, subject, body_text, date, is_read, uid)
               VALUES ($1, $2, $3, 'INBOX', $4, $5, $6, $7, $8, $9, $10, false, $11)
               ON CONFLICT DO NOTHING`,
              [
                tenantId, account.id, messageId, fromAddress, fromName,
                toRaw, ccRaw, subject, bodyText,
                dateRaw ? new Date(dateRaw) : new Date(),
                msg.attributes?.uid || null
              ]
            );
            synced++;
          }
        }

        connection.end();

        // Update last sync timestamp
        await pool.query(
          'UPDATE email_accounts SET last_sync_at = NOW() WHERE id = $1',
          [account.id]
        );
      } catch (imapErr: any) {
        console.error(`IMAP sync error for ${account.email_address}:`, imapErr.message);
        // Update last sync attempt even on failure
        await pool.query(
          'UPDATE email_accounts SET last_sync_at = NOW() WHERE id = $1',
          [account.id]
        );
      }
    }

    res.json({
      success: true,
      message: synced > 0 ? `Synced ${synced} new emails` : 'Sync complete - no new emails',
      synced
    });
  } catch (error) {
    console.error('Sync emails error:', error);
    res.status(500).json({ success: false, message: 'Email sync failed' });
  }
};

// ============================================================================
// GET /folder-counts - Get email counts per folder
// ============================================================================
export const getFolderCounts = async (req: Request, res: Response) => {
  try {
    const { tenantId } = getTenantUserId(req);

    const result = await pool.query(
      `SELECT
        COUNT(*) FILTER (WHERE folder = 'INBOX' AND is_deleted = false) AS inbox,
        COUNT(*) FILTER (WHERE folder = 'INBOX' AND is_read = false AND is_deleted = false) AS unread,
        COUNT(*) FILTER (WHERE is_starred = true AND is_deleted = false) AS starred,
        COUNT(*) FILTER (WHERE folder = 'Sent' AND is_deleted = false) AS sent,
        COUNT(*) FILTER (WHERE folder = 'Drafts' AND is_deleted = false) AS drafts,
        COUNT(*) FILTER (WHERE folder = 'Trash' OR is_deleted = true) AS trash,
        COUNT(*) FILTER (WHERE is_deleted = false) AS all
       FROM email_messages
       WHERE tenant_id = $1`,
      [tenantId]
    );

    const counts = result.rows[0] || { inbox: 0, unread: 0, starred: 0, sent: 0, drafts: 0, trash: 0, all: 0 };

    // Convert string counts to numbers
    const data = {
      inbox: parseInt(counts.inbox) || 0,
      unread: parseInt(counts.unread) || 0,
      starred: parseInt(counts.starred) || 0,
      sent: parseInt(counts.sent) || 0,
      drafts: parseInt(counts.drafts) || 0,
      trash: parseInt(counts.trash) || 0,
      all: parseInt(counts.all) || 0
    };

    res.json({ success: true, data });
  } catch (error) {
    console.error('Folder counts error:', error);
    res.status(500).json({
      success: false,
      data: { inbox: 0, unread: 0, starred: 0, sent: 0, drafts: 0, trash: 0, all: 0 }
    });
  }
};
