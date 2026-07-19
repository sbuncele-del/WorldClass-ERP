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

// IMAP/SMTP dependencies – loaded eagerly so sync works
let imapSimple: any = null;
let simpleParser: any = null;
try {
  imapSimple = require('imap-simple');
} catch { /* will be installed at deploy time */ }
try {
  simpleParser = require('mailparser').simpleParser;
} catch { /* will be installed at deploy time */ }

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

// Smart password decrypt - handles both plain text and base64-encoded passwords
// The JS handler (email-api-handler.js) stored base64-encoded passwords
// The TS controller (addAccount) used to store plain text
function decryptPassword(encrypted: string): string {
  if (!encrypted) return '';
  
  // Check if string contains non-base64 characters → definitely plain text
  const base64Regex = /^[A-Za-z0-9+/=]+$/;
  if (!base64Regex.test(encrypted)) {
    return encrypted; // Plain text (has special chars like }, ~, [, *)
  }
  
  // Could be base64 — try to decode and verify result is printable
  try {
    const decoded = Buffer.from(encrypted, 'base64').toString('utf8');
    // Check if decoded result is printable ASCII (no control chars except tab/newline)
    const isPrintable = /^[\x20-\x7E]+$/.test(decoded);
    if (isPrintable && decoded.length > 0) {
      return decoded;
    }
  } catch { /* not valid base64 */ }
  
  // Fallback: return as-is (plain text)
  return encrypted;
}

// Track active syncs to avoid duplicate concurrent syncs
const activeSyncs = new Map<string, boolean>();

// ============================================================================
// BACKGROUND IMAP SYNC (non-blocking helper)
// ============================================================================
async function backgroundImapSync(tenantId: string, account: any): Promise<number> {
  if (!imapSimple) {
    console.error('[Email Sync] imap-simple not installed – cannot sync');
    return 0;
  }
  const syncKey = `${account.id}:INBOX`;
  if (activeSyncs.get(syncKey)) {
    return 0; // already syncing
  }
  activeSyncs.set(syncKey, true);
  let newCount = 0;
  try {
    const password = decryptPassword(account.password_encrypted);
    const config = {
      imap: {
        user: account.username,
        password,
        host: account.imap_host,
        port: account.imap_port,
        tls: account.imap_secure,
        tlsOptions: { rejectUnauthorized: false },
        authTimeout: 15000
      }
    };
    const connection = await imapSimple.connect(config);
    await connection.openBox('INBOX');

    // Fetch emails from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const searchCriteria = [['SINCE', thirtyDaysAgo]];
    const fetchOptions = { bodies: ['HEADER', 'TEXT', ''], markSeen: false, struct: true };
    const messages = await connection.search(searchCriteria, fetchOptions);

    for (const msg of messages) {
      try {
        const allPart = msg.parts.find((p: any) => p.which === '');
        if (!allPart) continue;

        let parsed: any;
        if (simpleParser) {
          parsed = await simpleParser(allPart.body);
        } else {
          // Fallback: parse from HEADER part
          const header = msg.parts.find((p: any) => p.which === 'HEADER');
          if (!header) continue;
          parsed = {
            messageId: (header.body['message-id'] || [''])[0],
            subject: (header.body['subject'] || ['(No Subject)'])[0],
            from: { value: [{ address: (header.body['from'] || [''])[0], name: '' }] },
            to: { value: [{ address: (header.body['to'] || [''])[0] }] },
            cc: { value: [] },
            date: new Date((header.body['date'] || [''])[0]),
            text: msg.parts.find((p: any) => p.which === 'TEXT')?.body || '',
            html: '',
            attachments: []
          };
        }

        const messageId = parsed.messageId || `uid-${msg.attributes.uid}`;

        // Check if already cached
        const existing = await pool.query(
          'SELECT id FROM email_messages WHERE account_id = $1 AND message_id = $2',
          [account.id, messageId]
        );
        if (existing.rows.length === 0) {
          const fromAddr = parsed.from?.value?.[0]?.address || '';
          const fromName = parsed.from?.value?.[0]?.name || fromAddr;
          const toAddrs = (parsed.to?.value || []).map((t: any) => t.address).join(', ');
          const ccAddrs = (parsed.cc?.value || []).map((t: any) => t.address).join(', ');
          const flags = (msg.attributes.flags || []).join(',');
          const isRead = flags.includes('\\Seen');
          const isStarred = flags.includes('\\Flagged');
          const hasAttachments = parsed.attachments && parsed.attachments.length > 0;
          const attachmentsJson = hasAttachments ? JSON.stringify(parsed.attachments.map((a: any) => ({
            filename: a.filename, size: a.size, contentType: a.contentType
          }))) : null;

          await pool.query(
            `INSERT INTO email_messages
              (tenant_id, account_id, message_id, folder, from_address, from_name,
               to_addresses, cc_addresses, subject, body_text, body_html, date,
               is_read, is_starred, has_attachments, attachments_json, uid)
             VALUES ($1, $2, $3, 'INBOX', $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
             ON CONFLICT DO NOTHING`,
            [
              tenantId, account.id, messageId, fromAddr, fromName, toAddrs, ccAddrs,
              parsed.subject || '(No Subject)',
              (parsed.text || '').substring(0, 50000),
              (parsed.html || '').substring(0, 200000),
              parsed.date || new Date(),
              isRead, isStarred, hasAttachments || false, attachmentsJson,
              msg.attributes.uid
            ]
          );
          newCount++;
        }
      } catch (parseErr: any) {
        console.error('[Email Sync] Parse error:', parseErr.message);
      }
    }

    await connection.end();
    await pool.query('UPDATE email_accounts SET last_sync_at = NOW() WHERE id = $1', [account.id]);
    console.log(`[Email Sync] ✅ ${account.email_address} – ${newCount} new emails (${messages.length} checked)`);
  } catch (imapErr: any) {
    console.error(`[Email Sync] ❌ ${account.email_address}: ${imapErr.message}`);
    // Still update last_sync_at to prevent hammering on errors
    await pool.query('UPDATE email_accounts SET last_sync_at = NOW() WHERE id = $1', [account.id]).catch(() => {});
  } finally {
    activeSyncs.delete(syncKey);
  }
  return newCount;
}

// ============================================================================
// BACKGROUND AUTO-SYNC INTERVAL
// Every 5 minutes, sync all active email accounts across all tenants
// ============================================================================
setInterval(async () => {
  try {
    const accounts = await pool.query(
      `SELECT * FROM email_accounts WHERE is_active = true
       AND (last_sync_at IS NULL OR last_sync_at < NOW() - INTERVAL '5 minutes')`
    );
    for (const account of accounts.rows) {
      backgroundImapSync(account.tenant_id, account).catch((err: any) => {
        console.error(`[Email AutoSync] Error for ${account.email_address}:`, err.message);
      });
    }
  } catch (err: any) {
    console.error('[Email AutoSync] Interval error:', err.message);
  }
}, 5 * 60 * 1000); // 5 minutes

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
        tenantId, userId, email_address, display_name || '', username,
        Buffer.from(password).toString('base64'),
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

    // Trigger background sync if stale (> 2 minutes since last sync)
    let syncing = false;
    const isImapFolder = !['starred', 'all', 'Sent', 'Drafts', 'Trash'].includes(folder);
    if (isImapFolder && imapSimple) {
      try {
        const acctResult = await pool.query(
          `SELECT * FROM email_accounts WHERE tenant_id = $1 AND is_active = true
           AND (last_sync_at IS NULL OR last_sync_at < NOW() - INTERVAL '2 minutes')
           ORDER BY is_default DESC`,
          [tenantId]
        );
        for (const acct of acctResult.rows) {
          syncing = true;
          backgroundImapSync(tenantId, acct).catch(() => {});
        }
      } catch { /* ignore sync trigger errors */ }
    }

    res.json({
      success: true,
      data: result.rows,
      total,
      syncing
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
          pass: decryptPassword(account.password_encrypted)
        },
        tls: { rejectUnauthorized: false },
        connectionTimeout: 8000,
        greetingTimeout: 8000,
        socketTimeout: 8000
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

    if (!imapSimple) {
      return res.status(500).json({
        success: false,
        message: 'IMAP library not available. Contact admin to install imap-simple.'
      });
    }

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

    // Fire-and-forget background syncs for all accounts
    let totalStarted = 0;
    for (const account of accountResult.rows) {
      totalStarted++;
      backgroundImapSync(tenantId, account).catch((err: any) => {
        console.error(`[Email Sync] Manual sync failed for ${account.email_address}:`, err.message);
      });
    }

    res.json({
      success: true,
      message: `Sync started for ${totalStarted} account(s). New emails will appear shortly.`,
      synced: 0
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
