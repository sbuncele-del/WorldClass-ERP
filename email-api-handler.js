/**
 * Email API Handler - IMAP/SMTP Integration
 * Provides endpoints for:
 *   - Email account management (IMAP/SMTP credentials)
 *   - Inbox fetching via IMAP
 *   - Email sending via SMTP (nodemailer)
 *   - Email caching in PostgreSQL
 */

const imapSimple = require('imap-simple');
const { simpleParser } = require('mailparser');
const nodemailer = require('nodemailer');

// Simple encryption for storing passwords (base64 + reverse - production should use proper AES)
function encryptPassword(pwd) {
  return Buffer.from(pwd).toString('base64');
}
function decryptPassword(encrypted) {
  return Buffer.from(encrypted, 'base64').toString('utf8');
}

/**
 * Register email routes on the Express app
 */
function registerEmailRoutes(app, pool) {

  // Import auth middleware
  let authenticateToken;
  try {
    authenticateToken = require('./middleware/auth').authenticateToken;
  } catch (e) {
    // Fallback: no-op middleware (should not happen in production)
    authenticateToken = (req, res, next) => next();
    console.warn('[Email API] Warning: Could not load auth middleware');
  }
  
  // ==========================================
  // EMAIL ACCOUNTS CRUD
  // ==========================================
  
  // GET /api/email/accounts - List email accounts for current user
  app.get('/api/email/accounts', authenticateToken, async (req, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;
      const userId = req.user?.id || req.user?.userId;
      if (!tenantId || !userId) {
        return res.status(400).json({ success: false, message: 'Missing tenant or user context' });
      }
      const result = await pool.query(
        `SELECT id, tenant_id, user_id, email_address, display_name, imap_host, imap_port, imap_secure,
                smtp_host, smtp_port, smtp_secure, username, is_default, is_active, last_sync_at, created_at
         FROM email_accounts WHERE tenant_id = $1 AND user_id = $2 ORDER BY is_default DESC, created_at DESC`,
        [tenantId, userId]
      );
      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('GET /api/email/accounts error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // POST /api/email/accounts - Add a new email account
  app.post('/api/email/accounts', authenticateToken, async (req, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;
      const userId = req.user?.id || req.user?.userId;
      if (!tenantId || !userId) {
        return res.status(400).json({ success: false, message: 'Missing tenant or user context' });
      }
      const {
        email_address, display_name,
        imap_host, imap_port = 993, imap_secure = true,
        smtp_host, smtp_port = 465, smtp_secure = true,
        username, password, is_default = false
      } = req.body;

      if (!email_address || !imap_host || !smtp_host || !username || !password) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
      }

      // Test IMAP connection first
      try {
        const config = {
          imap: {
            user: username,
            password: password,
            host: imap_host,
            port: imap_port,
            tls: imap_secure,
            tlsOptions: { rejectUnauthorized: false },
            authTimeout: 10000
          }
        };
        const connection = await imapSimple.connect(config);
        await connection.end();
      } catch (imapErr) {
        return res.status(400).json({ 
          success: false, 
          message: 'IMAP connection test failed: ' + imapErr.message,
          detail: 'Please verify your email credentials and server settings'
        });
      }

      // Test SMTP connection
      try {
        const transporter = nodemailer.createTransport({
          host: smtp_host,
          port: smtp_port,
          secure: smtp_secure,
          auth: { user: username, pass: password },
          tls: { rejectUnauthorized: false }
        });
        await transporter.verify();
        transporter.close();
      } catch (smtpErr) {
        return res.status(400).json({ 
          success: false, 
          message: 'SMTP connection test failed: ' + smtpErr.message,
          detail: 'IMAP works but SMTP failed. Please check SMTP settings.'
        });
      }

      // If default, unset others
      if (is_default) {
        await pool.query(
          'UPDATE email_accounts SET is_default = false WHERE tenant_id = $1 AND user_id = $2',
          [tenantId, userId]
        );
      }

      const result = await pool.query(
        `INSERT INTO email_accounts (tenant_id, user_id, email_address, display_name, 
         imap_host, imap_port, imap_secure, smtp_host, smtp_port, smtp_secure, 
         username, password_encrypted, is_default, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true)
         RETURNING id, email_address, display_name, is_default`,
        [tenantId, userId, email_address, display_name || email_address.split('@')[0],
         imap_host, imap_port, imap_secure, smtp_host, smtp_port, smtp_secure,
         username, encryptPassword(password), is_default]
      );

      res.json({ success: true, data: result.rows[0], message: 'Email account added and verified successfully' });
    } catch (error) {
      console.error('POST /api/email/accounts error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // DELETE /api/email/accounts/:id - Remove an email account
  app.delete('/api/email/accounts/:id', authenticateToken, async (req, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;
      const userId = req.user?.id || req.user?.userId;
      const { id } = req.params;
      await pool.query(
        'DELETE FROM email_accounts WHERE id = $1 AND tenant_id = $2 AND user_id = $3',
        [id, tenantId, userId]
      );
      res.json({ success: true, message: 'Email account removed' });
    } catch (error) {
      console.error('DELETE /api/email/accounts/:id error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // POST /api/email/accounts/:id/test - Test an existing account connection
  app.post('/api/email/accounts/:id/test', authenticateToken, async (req, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;
      const userId = req.user?.id || req.user?.userId;
      const { id } = req.params;
      
      const acct = await pool.query(
        'SELECT * FROM email_accounts WHERE id = $1 AND tenant_id = $2 AND user_id = $3',
        [id, tenantId, userId]
      );
      if (acct.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Account not found' });
      }
      const a = acct.rows[0];
      const password = decryptPassword(a.password_encrypted);
      
      // Test IMAP
      let imapOk = false;
      try {
        const conn = await imapSimple.connect({
          imap: { user: a.username, password, host: a.imap_host, port: a.imap_port, tls: a.imap_secure, tlsOptions: { rejectUnauthorized: false }, authTimeout: 10000 }
        });
        await conn.end();
        imapOk = true;
      } catch (e) { /* */ }

      // Test SMTP
      let smtpOk = false;
      try {
        const t = nodemailer.createTransport({ host: a.smtp_host, port: a.smtp_port, secure: a.smtp_secure, auth: { user: a.username, pass: password }, tls: { rejectUnauthorized: false } });
        await t.verify();
        t.close();
        smtpOk = true;
      } catch (e) { /* */ }

      res.json({ success: true, imap: imapOk, smtp: smtpOk });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // ==========================================
  // BACKGROUND IMAP SYNC (non-blocking)
  // ==========================================
  
  // Track active syncs to avoid duplicate syncs
  const activeSyncs = new Map();
  
  async function backgroundImapSync(pool, acct, password, folder, tenantId) {
    const syncKey = `${acct.id}:${folder}`;
    if (activeSyncs.get(syncKey)) {
      console.log(`[Email Sync] Already syncing ${acct.email_address}/${folder}, skipping`);
      return;
    }
    activeSyncs.set(syncKey, true);
    
    try {
      console.log(`[Email Sync] Starting background sync for ${acct.email_address}/${folder}...`);
      const config = {
        imap: {
          user: acct.username,
          password: password,
          host: acct.imap_host,
          port: acct.imap_port,
          tls: acct.imap_secure,
          tlsOptions: { rejectUnauthorized: false },
          authTimeout: 15000
        }
      };
      
      const connection = await imapSimple.connect(config);
      await connection.openBox(folder);
      
      // Fetch recent emails (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const searchCriteria = [['SINCE', thirtyDaysAgo]];
      const fetchOptions = { bodies: ['HEADER', 'TEXT', ''], markSeen: false, struct: true };
      
      const messages = await connection.search(searchCriteria, fetchOptions);
      let newCount = 0;
      
      for (const msg of messages) {
        try {
          const all = msg.parts.find(p => p.which === '');
          if (!all) continue;
          
          const parsed = await simpleParser(all.body);
          const messageId = parsed.messageId || `uid-${msg.attributes.uid}`;
          
          // Check if already cached
          const existing = await pool.query(
            'SELECT id FROM emails WHERE account_id = $1 AND message_id = $2',
            [acct.id, messageId]
          );
          
          if (existing.rows.length === 0) {
            const fromAddr = parsed.from?.value?.[0]?.address || '';
            const fromName = parsed.from?.value?.[0]?.name || fromAddr;
            const toAddrs = (parsed.to?.value || []).map(t => t.address).join(', ');
            const ccAddrs = (parsed.cc?.value || []).map(t => t.address).join(', ');
            const flags = (msg.attributes.flags || []).join(',');
            const isRead = flags.includes('\\Seen');
            const isStarred = flags.includes('\\Flagged');
            const hasAttachments = parsed.attachments && parsed.attachments.length > 0;
            const attachmentsJson = hasAttachments ? JSON.stringify(parsed.attachments.map(a => ({
              filename: a.filename, size: a.size, contentType: a.contentType
            }))) : null;

            await pool.query(
              `INSERT INTO emails (tenant_id, account_id, message_id, folder, from_address, from_name, 
               to_addresses, cc_addresses, subject, body_text, body_html, date, is_read, is_starred,
               has_attachments, attachments_json, uid, flags)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
               ON CONFLICT DO NOTHING`,
              [tenantId, acct.id, messageId, folder, fromAddr, fromName, toAddrs, ccAddrs,
               parsed.subject || '(No Subject)', 
               (parsed.text || '').substring(0, 50000),
               (parsed.html || '').substring(0, 200000),
               parsed.date || new Date(),
               isRead, isStarred, hasAttachments, attachmentsJson,
               msg.attributes.uid, flags]
            );
            newCount++;
          }
        } catch (parseErr) {
          console.error('Error parsing email:', parseErr.message);
        }
      }

      await connection.end();
      
      // Update last sync
      await pool.query(
        'UPDATE email_accounts SET last_sync_at = NOW() WHERE id = $1',
        [acct.id]
      );
      
      console.log(`[Email Sync] ✅ Sync complete for ${acct.email_address}/${folder} - ${newCount} new emails, ${messages.length} total checked`);
    } catch (imapErr) {
      console.error(`[Email Sync] ❌ IMAP sync error for ${acct.email_address}:`, imapErr.message);
    } finally {
      activeSyncs.delete(syncKey);
    }
  }
  
  // ==========================================
  // INBOX - Fetch emails (instant cache + background sync)
  // ==========================================
  
  // GET /api/email/inbox?account_id=...&folder=INBOX&limit=50&page=1
  app.get('/api/email/inbox', authenticateToken, async (req, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;
      const userId = req.user?.id || req.user?.userId;
      const { account_id, folder = 'INBOX', limit = 50, page = 1 } = req.query;

      // Get account
      let accountQuery = 'SELECT * FROM email_accounts WHERE tenant_id = $1 AND user_id = $2 AND is_active = true';
      const params = [tenantId, userId];
      if (account_id) {
        accountQuery += ' AND id = $3';
        params.push(account_id);
      } else {
        accountQuery += ' ORDER BY is_default DESC LIMIT 1';
      }
      const acctResult = await pool.query(accountQuery, params);
      if (acctResult.rows.length === 0) {
        return res.json({ success: true, data: [], total: 0, message: 'No email account configured. Please add one in Settings.' });
      }
      const acct = acctResult.rows[0];

      // ALWAYS return cached emails IMMEDIATELY from DB
      const offset = (parseInt(page) - 1) * parseInt(limit);
      
      // Build query based on folder type
      let emailsQuery, countQuery, emailsParams, countParams;
      
      if (folder === 'starred') {
        // Virtual folder: all starred emails (not in Trash)
        emailsQuery = `SELECT id, message_id, folder, from_address, from_name, to_addresses, cc_addresses,
                subject, date, is_read, is_starred, has_attachments, attachments_json
         FROM emails WHERE tenant_id = $1 AND account_id = $2 AND is_starred = true AND folder != 'Trash'
         ORDER BY date DESC LIMIT $3 OFFSET $4`;
        emailsParams = [tenantId, acct.id, parseInt(limit), offset];
        countQuery = `SELECT COUNT(*) as total FROM emails WHERE tenant_id = $1 AND account_id = $2 AND is_starred = true AND folder != 'Trash'`;
        countParams = [tenantId, acct.id];
      } else if (folder === 'all') {
        // All mail (everything except Trash)
        emailsQuery = `SELECT id, message_id, folder, from_address, from_name, to_addresses, cc_addresses,
                subject, date, is_read, is_starred, has_attachments, attachments_json
         FROM emails WHERE tenant_id = $1 AND account_id = $2 AND folder != 'Trash'
         ORDER BY date DESC LIMIT $3 OFFSET $4`;
        emailsParams = [tenantId, acct.id, parseInt(limit), offset];
        countQuery = `SELECT COUNT(*) as total FROM emails WHERE tenant_id = $1 AND account_id = $2 AND folder != 'Trash'`;
        countParams = [tenantId, acct.id];
      } else {
        // Specific folder: INBOX, Sent, Drafts, Trash
        emailsQuery = `SELECT id, message_id, folder, from_address, from_name, to_addresses, cc_addresses,
                subject, date, is_read, is_starred, has_attachments, attachments_json
         FROM emails WHERE tenant_id = $1 AND account_id = $2 AND folder = $3
         ORDER BY date DESC LIMIT $4 OFFSET $5`;
        emailsParams = [tenantId, acct.id, folder, parseInt(limit), offset];
        countQuery = `SELECT COUNT(*) as total FROM emails WHERE tenant_id = $1 AND account_id = $2 AND folder = $3`;
        countParams = [tenantId, acct.id, folder];
      }
      
      const emailsResult = await pool.query(emailsQuery, emailsParams);
      const countResult = await pool.query(countQuery, countParams);

      // Check if we should trigger a background sync (only for IMAP folders, not virtual ones)
      const isImapFolder = !['starred', 'all', 'Sent', 'Drafts', 'Trash'].includes(folder);
      const shouldSync = isImapFolder && (!acct.last_sync_at || 
        (new Date() - new Date(acct.last_sync_at)) > 120000); // older than 2 minutes

      if (shouldSync) {
        const password = decryptPassword(acct.password_encrypted);
        // Fire-and-forget background sync - DO NOT await
        backgroundImapSync(pool, acct, password, folder, tenantId).catch(err => {
          console.error('[Email Sync] Background sync failed:', err.message);
        });
      }

      const lastSync = acct.last_sync_at ? new Date(acct.last_sync_at).toISOString() : null;
      
      res.json({
        success: true,
        data: emailsResult.rows,
        total: parseInt(countResult.rows[0].total),
        page: parseInt(page),
        limit: parseInt(limit),
        syncing: shouldSync,
        lastSync: lastSync,
        account: { id: acct.id, email: acct.email_address, display_name: acct.display_name }
      });
    } catch (error) {
      console.error('GET /api/email/inbox error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // POST /api/email/sync - Manual sync trigger (for Sync Now button)
  app.post('/api/email/sync', authenticateToken, async (req, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;
      const userId = req.user?.id || req.user?.userId;
      const { account_id, folder = 'INBOX' } = req.body;

      let accountQuery = 'SELECT * FROM email_accounts WHERE tenant_id = $1 AND user_id = $2 AND is_active = true';
      const params = [tenantId, userId];
      if (account_id) {
        accountQuery += ' AND id = $3';
        params.push(account_id);
      } else {
        accountQuery += ' ORDER BY is_default DESC LIMIT 1';
      }
      const acctResult = await pool.query(accountQuery, params);
      if (acctResult.rows.length === 0) {
        return res.status(400).json({ success: false, message: 'No email account configured' });
      }
      const acct = acctResult.rows[0];
      const password = decryptPassword(acct.password_encrypted);

      // Fire-and-forget background sync
      backgroundImapSync(pool, acct, password, folder, tenantId).catch(err => {
        console.error('[Email Sync] Manual sync failed:', err.message);
      });

      res.json({ success: true, message: 'Sync started in background. New emails will appear shortly.' });
    } catch (error) {
      console.error('POST /api/email/sync error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // GET /api/email/sync-status - Check sync status
  app.get('/api/email/sync-status', authenticateToken, async (req, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;
      const userId = req.user?.id || req.user?.userId;
      
      const acctResult = await pool.query(
        'SELECT id, email_address, last_sync_at FROM email_accounts WHERE tenant_id = $1 AND user_id = $2 AND is_active = true ORDER BY is_default DESC LIMIT 1',
        [tenantId, userId]
      );
      if (acctResult.rows.length === 0) {
        return res.json({ success: true, syncing: false, lastSync: null });
      }
      const acct = acctResult.rows[0];
      const syncKey = `${acct.id}:INBOX`;
      const isSyncing = activeSyncs.get(syncKey) || false;
      
      const countResult = await pool.query(
        'SELECT COUNT(*) as total FROM emails WHERE tenant_id = $1 AND account_id = $2',
        [tenantId, acct.id]
      );
      
      res.json({
        success: true,
        syncing: isSyncing,
        lastSync: acct.last_sync_at ? new Date(acct.last_sync_at).toISOString() : null,
        totalEmails: parseInt(countResult.rows[0].total)
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // GET /api/email/message/:id - Get full email content
  app.get('/api/email/message/:id', authenticateToken, async (req, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;
      const { id } = req.params;
      
      const result = await pool.query(
        `SELECT * FROM emails WHERE id = $1 AND tenant_id = $2`,
        [id, tenantId]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Email not found' });
      }

      // Mark as read
      await pool.query('UPDATE emails SET is_read = true WHERE id = $1', [id]);

      const email = result.rows[0];
      email.is_read = true;
      
      res.json({ success: true, data: email });
    } catch (error) {
      console.error('GET /api/email/message/:id error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // PUT /api/email/message/:id/star - Toggle star
  app.put('/api/email/message/:id/star', authenticateToken, async (req, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;
      const { id } = req.params;
      await pool.query(
        'UPDATE emails SET is_starred = NOT is_starred WHERE id = $1 AND tenant_id = $2',
        [id, tenantId]
      );
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // DELETE /api/email/message/:id - Move email to Trash (soft delete), or permanently delete if already in Trash
  app.delete('/api/email/message/:id', authenticateToken, async (req, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;
      const { id } = req.params;
      
      // Check if already in Trash
      const check = await pool.query('SELECT folder FROM emails WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
      if (check.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Email not found' });
      }
      
      if (check.rows[0].folder === 'Trash') {
        // Permanently delete
        await pool.query('DELETE FROM emails WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
        res.json({ success: true, message: 'Email permanently deleted' });
      } else {
        // Move to Trash
        await pool.query('UPDATE emails SET folder = $1 WHERE id = $2 AND tenant_id = $3', ['Trash', id, tenantId]);
        res.json({ success: true, message: 'Email moved to Trash' });
      }
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // POST /api/email/message/:id/restore - Restore email from Trash back to original folder
  app.post('/api/email/message/:id/restore', authenticateToken, async (req, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;
      const { id } = req.params;
      await pool.query('UPDATE emails SET folder = $1 WHERE id = $2 AND tenant_id = $3', ['INBOX', id, tenantId]);
      res.json({ success: true, message: 'Email restored to Inbox' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // POST /api/email/draft - Save a draft email
  app.post('/api/email/draft', authenticateToken, async (req, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;
      const userId = req.user?.id || req.user?.userId;
      const { to, cc, subject, body, html, draft_id } = req.body;

      // Get default account
      const acctResult = await pool.query(
        'SELECT * FROM email_accounts WHERE tenant_id = $1 AND user_id = $2 AND is_active = true ORDER BY is_default DESC LIMIT 1',
        [tenantId, userId]
      );
      if (acctResult.rows.length === 0) {
        return res.status(400).json({ success: false, message: 'No email account configured' });
      }
      const acct = acctResult.rows[0];

      if (draft_id) {
        // Update existing draft
        await pool.query(
          `UPDATE emails SET to_addresses = $1, cc_addresses = $2, subject = $3, body_text = $4, body_html = $5, date = NOW()
           WHERE id = $6 AND tenant_id = $7 AND folder = 'Drafts'`,
          [to || '', cc || '', subject || '(No Subject)', body || '', html || body || '', draft_id, tenantId]
        );
        res.json({ success: true, message: 'Draft updated', data: { id: draft_id } });
      } else {
        // Create new draft
        const result = await pool.query(
          `INSERT INTO emails (tenant_id, account_id, message_id, folder, from_address, from_name,
           to_addresses, cc_addresses, subject, body_text, body_html, date, is_read)
           VALUES ($1, $2, $3, 'Drafts', $4, $5, $6, $7, $8, $9, $10, NOW(), true)
           RETURNING id`,
          [tenantId, acct.id, `draft-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
           acct.email_address, acct.display_name || acct.email_address,
           to || '', cc || '', subject || '(No Subject)', body || '', html || body || '']
        );
        res.json({ success: true, message: 'Draft saved', data: { id: result.rows[0].id } });
      }
    } catch (error) {
      console.error('POST /api/email/draft error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // GET /api/email/folder-counts - Get counts for all folders
  app.get('/api/email/folder-counts', authenticateToken, async (req, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;
      const userId = req.user?.id || req.user?.userId;

      const acctResult = await pool.query(
        'SELECT id FROM email_accounts WHERE tenant_id = $1 AND user_id = $2 AND is_active = true ORDER BY is_default DESC LIMIT 1',
        [tenantId, userId]
      );
      if (acctResult.rows.length === 0) {
        return res.json({ success: true, data: { inbox: 0, unread: 0, starred: 0, sent: 0, drafts: 0, trash: 0, all: 0 } });
      }
      const accountId = acctResult.rows[0].id;

      const countsResult = await pool.query(`
        SELECT 
          COUNT(*) FILTER (WHERE folder = 'INBOX') as inbox,
          COUNT(*) FILTER (WHERE folder = 'INBOX' AND is_read = false) as unread,
          COUNT(*) FILTER (WHERE is_starred = true AND folder != 'Trash') as starred,
          COUNT(*) FILTER (WHERE folder = 'Sent') as sent,
          COUNT(*) FILTER (WHERE folder = 'Drafts') as drafts,
          COUNT(*) FILTER (WHERE folder = 'Trash') as trash,
          COUNT(*) as all_mail
        FROM emails WHERE tenant_id = $1 AND account_id = $2
      `, [tenantId, accountId]);

      const counts = countsResult.rows[0];
      res.json({ 
        success: true, 
        data: {
          inbox: parseInt(counts.inbox),
          unread: parseInt(counts.unread),
          starred: parseInt(counts.starred),
          sent: parseInt(counts.sent),
          drafts: parseInt(counts.drafts),
          trash: parseInt(counts.trash),
          all: parseInt(counts.all_mail)
        }
      });
    } catch (error) {
      console.error('GET /api/email/folder-counts error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // ==========================================
  // SEND EMAIL via SMTP
  // ==========================================
  
  // POST /api/email/send
  app.post('/api/email/send', authenticateToken, async (req, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;
      const userId = req.user?.id || req.user?.userId;
      const { account_id, to, cc, bcc, subject, body, html, reply_to_id } = req.body;

      if (!to || !subject) {
        return res.status(400).json({ success: false, message: 'To and Subject are required' });
      }

      // Get account
      let accountQuery = 'SELECT * FROM email_accounts WHERE tenant_id = $1 AND user_id = $2 AND is_active = true';
      const params = [tenantId, userId];
      if (account_id) {
        accountQuery += ' AND id = $3';
        params.push(account_id);
      } else {
        accountQuery += ' ORDER BY is_default DESC LIMIT 1';
      }
      const acctResult = await pool.query(accountQuery, params);
      if (acctResult.rows.length === 0) {
        return res.status(400).json({ success: false, message: 'No email account configured' });
      }
      const acct = acctResult.rows[0];
      const password = decryptPassword(acct.password_encrypted);

      // Create transporter
      const transporter = nodemailer.createTransport({
        host: acct.smtp_host,
        port: acct.smtp_port,
        secure: acct.smtp_secure,
        auth: { user: acct.username, pass: password },
        tls: { rejectUnauthorized: false }
      });

      // Build mail options
      const mailOptions = {
        from: `"${acct.display_name || acct.email_address}" <${acct.email_address}>`,
        to: Array.isArray(to) ? to.join(', ') : to,
        subject: subject,
        text: body || '',
        html: html || body || ''
      };
      if (cc) mailOptions.cc = Array.isArray(cc) ? cc.join(', ') : cc;
      if (bcc) mailOptions.bcc = Array.isArray(bcc) ? bcc.join(', ') : bcc;

      // Send
      const info = await transporter.sendMail(mailOptions);
      transporter.close();

      // Cache sent email
      const toStr = Array.isArray(to) ? to.join(', ') : to;
      await pool.query(
        `INSERT INTO emails (tenant_id, account_id, message_id, folder, from_address, from_name,
         to_addresses, cc_addresses, subject, body_text, body_html, date, is_read)
         VALUES ($1, $2, $3, 'Sent', $4, $5, $6, $7, $8, $9, $10, NOW(), true)`,
        [tenantId, acct.id, info.messageId, acct.email_address, acct.display_name || acct.email_address,
         toStr, cc ? (Array.isArray(cc) ? cc.join(', ') : cc) : null,
         subject, body || '', html || body || '']
      );

      res.json({ success: true, message: 'Email sent successfully', messageId: info.messageId });
    } catch (error) {
      console.error('POST /api/email/send error:', error);
      res.status(500).json({ success: false, message: 'Failed to send email: ' + error.message });
    }
  });

  // GET /api/email/folders?account_id=... - List IMAP folders
  app.get('/api/email/folders', authenticateToken, async (req, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;
      const userId = req.user?.id || req.user?.userId;
      const { account_id } = req.query;

      let accountQuery = 'SELECT * FROM email_accounts WHERE tenant_id = $1 AND user_id = $2 AND is_active = true';
      const params = [tenantId, userId];
      if (account_id) { accountQuery += ' AND id = $3'; params.push(account_id); }
      else { accountQuery += ' ORDER BY is_default DESC LIMIT 1'; }
      
      const acctResult = await pool.query(accountQuery, params);
      if (acctResult.rows.length === 0) {
        return res.json({ success: true, data: ['INBOX', 'Sent', 'Drafts', 'Trash'] });
      }
      const acct = acctResult.rows[0];
      const password = decryptPassword(acct.password_encrypted);

      const connection = await imapSimple.connect({
        imap: { user: acct.username, password, host: acct.imap_host, port: acct.imap_port, tls: acct.imap_secure, tlsOptions: { rejectUnauthorized: false }, authTimeout: 10000 }
      });
      const boxes = await connection.getBoxes();
      await connection.end();
      
      const folderNames = Object.keys(boxes);
      res.json({ success: true, data: folderNames });
    } catch (error) {
      console.error('GET /api/email/folders error:', error);
      res.json({ success: true, data: ['INBOX', 'Sent', 'Drafts', 'Trash'] });
    }
  });

  console.log('[Email API] Routes registered: /api/email/accounts, /api/email/inbox, /api/email/sync, /api/email/sync-status, /api/email/send, /api/email/draft, /api/email/folder-counts, /api/email/message/:id, /api/email/folders');
}

module.exports = { registerEmailRoutes };
