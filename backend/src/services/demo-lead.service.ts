import { Request, Response } from 'express';
import pool from '../config/database';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

/**
 * Demo Lead Controller
 * 
 * Handles the demo request flow:
 * 1. Visitor fills in form on main site (name, email, company, phone)
 * 2. System creates a demo user in the demo tenant
 * 3. Sends branded email with login credentials
 * 4. Tracks activity for lead scoring
 */

const DEMO_TENANT_ID = '00000000-0000-0000-0000-000000000001';
const DEMO_URL = process.env.DEMO_URL || 'https://demo.siyabusaerp.co.za';
const MAIN_SITE_URL = process.env.FRONTEND_URL || 'https://siyabusaerp.co.za';

/**
 * Generate a readable temporary password
 * Format: Word + 3 digits + special char (e.g., Demo847!)
 */
function generateTempPassword(): string {
  const words = ['Siyabusa', 'Welcome', 'Demo', 'Access', 'Start', 'Launch', 'Explore'];
  const word = words[Math.floor(Math.random() * words.length)];
  const digits = Math.floor(100 + Math.random() * 900);
  const specials = ['!', '@', '#', '$'];
  const special = specials[Math.floor(Math.random() * specials.length)];
  return `${word}${digits}${special}`;
}

/**
 * Build the branded demo welcome email HTML
 */
function buildDemoEmailHTML(name: string, email: string, password: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your SiyaBusa ERP Demo is Ready</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%); padding: 40px 30px; text-align: center;">
      <div style="width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: inline-flex; justify-content: center; align-items: center; margin-bottom: 16px;">
        <span style="font-size: 28px; color: white;">🚀</span>
      </div>
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Your Demo is Ready</h1>
      <p style="color: #94a3b8; margin: 8px 0 0; font-size: 14px;">SiyaBusa ERP — Built for South African Business</p>
    </div>

    <!-- Body -->
    <div style="padding: 32px 30px;">
      <p style="font-size: 16px; margin: 0 0 16px;">Hi <strong>${name}</strong>,</p>
      
      <p style="font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
        Thank you for your interest in SiyaBusa ERP. Your demo environment is live and loaded with 
        sample South African business data — invoices, bank statements, payroll, and more.
      </p>

      <!-- Credentials Box -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin: 0 0 24px;">
        <p style="font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin: 0 0 12px; font-weight: 600;">Your Login Credentials</p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-size: 14px; width: 80px;">URL</td>
            <td style="padding: 8px 0; font-size: 14px; font-weight: 600;">
              <a href="${DEMO_URL}" style="color: #667eea; text-decoration: none;">${DEMO_URL}</a>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Email</td>
            <td style="padding: 8px 0; font-size: 14px; font-weight: 600;">${email}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Password</td>
            <td style="padding: 8px 0; font-size: 14px; font-weight: 600; font-family: 'Courier New', monospace;">${password}</td>
          </tr>
        </table>
      </div>

      <!-- CTA Button -->
      <div style="text-align: center; margin: 0 0 24px;">
        <a href="${DEMO_URL}" 
           style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">
          Launch Your Demo →
        </a>
      </div>

      <!-- What to Explore -->
      <div style="margin: 0 0 24px;">
        <p style="font-size: 15px; font-weight: 600; margin: 0 0 12px;">What to explore:</p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 0; font-size: 14px; line-height: 1.5;">📊 <strong>Dashboard</strong> — Real-time KPIs and cash position</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-size: 14px; line-height: 1.5;">💰 <strong>Invoicing</strong> — Create and send professional invoices</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-size: 14px; line-height: 1.5;">🏦 <strong>Bank Reconciliation</strong> — Import statements and auto-match</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-size: 14px; line-height: 1.5;">👥 <strong>HR & Payroll</strong> — PAYE, UIF, and payslips</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-size: 14px; line-height: 1.5;">📋 <strong>SARS Compliance</strong> — VAT returns and tax reports</td>
          </tr>
        </table>
      </div>

      <p style="font-size: 14px; color: #64748b; line-height: 1.6;">
        Your demo is valid for <strong>7 days</strong> and resets daily with fresh data. 
        Everything you see is fully functional — test it like it's your own business.
      </p>
    </div>

    <!-- Footer -->
    <div style="background: #f8fafc; padding: 24px 30px; border-top: 1px solid #e2e8f0;">
      <p style="font-size: 14px; margin: 0 0 8px;">
        <strong>Questions?</strong> Reply to this email or reach us at:
      </p>
      <p style="font-size: 14px; margin: 0 0 4px;">
        📧 <a href="mailto:support@siyabusaerp.co.za" style="color: #667eea; text-decoration: none;">support@siyabusaerp.co.za</a>
      </p>
      <p style="font-size: 14px; margin: 0;">
        💬 <a href="https://wa.me/27XXXXXXXXX" style="color: #667eea; text-decoration: none;">WhatsApp Us</a>
      </p>
      
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;">
      
      <p style="font-size: 11px; color: #94a3b8; margin: 0; text-align: center;">
        &copy; ${new Date().getFullYear()} SiyaBusa ERP by SGBS Group (Pty) Ltd. All rights reserved.<br>
        This is a one-time email sent because you requested a demo.
      </p>
    </div>
  </div>
</body>
</html>`;
}

// =====================================================
// ENDPOINTS
// =====================================================

/**
 * POST /api/demo/request
 * Public endpoint - no auth required
 * Creates a demo lead, user, and sends credentials email
 */
export const requestDemo = async (req: Request, res: Response) => {
  try {
    const { fullName, email, companyName, phone, utmSource, utmMedium, utmCampaign, referrerUrl } = req.body;

    // Validate required fields
    if (!fullName || !email || !companyName) {
      res.status(400).json({
        success: false,
        message: 'Please provide your name, email, and company name.'
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.'
      });
      return;
    }

    // Check if lead already exists
    const existingLead = await pool.query(
      'SELECT id, status, demo_user_id FROM demo_leads WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingLead.rows.length > 0) {
      const lead = existingLead.rows[0];
      
      if (lead.status === 'active') {
        // Resend credentials
        res.status(200).json({
          success: true,
          message: 'You already have an active demo. We\'ve resent your login details to your email.',
          alreadyExists: true
        });
        
        // Resend email in background (don't await)
        resendDemoEmail(lead.id).catch(err => console.error('Resend demo email error:', err));
        return;
      }
      
      // If expired, let them re-request
      if (lead.status === 'expired' || lead.status === 'disqualified') {
        await pool.query('DELETE FROM demo_leads WHERE id = $1', [lead.id]);
        // Fall through to create new lead
      }
    }

    // Generate temp password
    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    // Begin transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Check if user with this email already exists in demo tenant
      const existingUser = await client.query(
        'SELECT id FROM users WHERE email = $1 AND tenant_id = $2',
        [email.toLowerCase(), DEMO_TENANT_ID]
      );

      let userId: string;

      if (existingUser.rows.length > 0) {
        // Update existing user's password
        userId = existingUser.rows[0].id;
        await client.query(
          `UPDATE users SET 
            password_hash = $1, 
            first_name = $2, 
            last_name = $3, 
            is_active = true, 
            status = 'active',
            email_verified = true,
            failed_login_attempts = 0,
            locked_until = NULL,
            updated_at = NOW()
          WHERE id = $4`,
          [passwordHash, fullName.split(' ')[0], fullName.split(' ').slice(1).join(' ') || '', userId]
        );
      } else {
        // Create new user in demo tenant
        const firstName = fullName.split(' ')[0];
        const lastName = fullName.split(' ').slice(1).join(' ') || '';
        
        const userResult = await client.query(
          `INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role, is_active, status, email_verified)
           VALUES ($1, $2, $3, $4, $5, 'admin', true, 'active', true)
           RETURNING id`,
          [DEMO_TENANT_ID, email.toLowerCase(), passwordHash, firstName, lastName]
        );
        userId = userResult.rows[0].id;
      }

      // Create demo lead record
      const leadResult = await client.query(
        `INSERT INTO demo_leads (
          full_name, email, company_name, phone, 
          demo_user_id, demo_tenant_id, temp_password,
          status, utm_source, utm_medium, utm_campaign, referrer_url
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', $8, $9, $10, $11)
        RETURNING id`,
        [
          fullName, email.toLowerCase(), companyName, phone || null,
          userId, DEMO_TENANT_ID, tempPassword,
          utmSource || null, utmMedium || null, utmCampaign || null, referrerUrl || null
        ]
      );

      await client.query('COMMIT');

      // Send email (don't block the response)
      sendDemoCredentialsEmail(fullName, email.toLowerCase(), tempPassword, leadResult.rows[0].id)
        .catch(err => console.error('Demo email send error:', err));

      res.status(201).json({
        success: true,
        message: 'Your demo is being prepared! Check your email for login details.',
        leadId: leadResult.rows[0].id
      });

    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

  } catch (error: any) {
    console.error('Demo request error:', error);
    
    // Handle duplicate email constraint
    if (error.code === '23505') {
      res.status(409).json({
        success: false,
        message: 'A demo has already been set up for this email address. Check your inbox for login details.'
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again or contact support@siyabusaerp.co.za'
    });
  }
};

/**
 * Send demo credentials email using production email service
 */
async function sendDemoCredentialsEmail(name: string, email: string, password: string, leadId: string): Promise<void> {
  try {
    const html = buildDemoEmailHTML(name, email, password);

    // Use production email service (Resend)
    const USE_PRODUCTION_EMAIL = !!(process.env.RESEND_API_KEY);
    
    if (USE_PRODUCTION_EMAIL) {
      const { emailService } = await import('./email-production.service');
      await emailService.send({
        to: email,
        subject: '🚀 Your SiyaBusa ERP Demo is Ready',
        html: html,
        replyTo: 'support@siyabusaerp.co.za'
      });
    } else {
      // Fallback: use the standard email service
      const { sendEmail } = await import('./email.service');
      await sendEmail({
        to: email,
        subject: '🚀 Your SiyaBusa ERP Demo is Ready',
        template: 'demo-welcome',
        variables: { name, email, password, demoUrl: DEMO_URL }
      });
    }

    // Mark email as sent
    await pool.query(
      'UPDATE demo_leads SET email_sent = true, email_sent_at = NOW() WHERE id = $1',
      [leadId]
    );

    console.log(`✅ Demo credentials email sent to ${email}`);
  } catch (error) {
    console.error(`❌ Failed to send demo email to ${email}:`, error);
    // Don't throw — the demo user was already created, they can still use it
  }
}

/**
 * Resend demo credentials to an existing lead
 */
async function resendDemoEmail(leadId: string): Promise<void> {
  const lead = await pool.query(
    'SELECT full_name, email, temp_password FROM demo_leads WHERE id = $1',
    [leadId]
  );
  
  if (lead.rows.length > 0) {
    const { full_name, email, temp_password } = lead.rows[0];
    if (temp_password) {
      await sendDemoCredentialsEmail(full_name, email, temp_password, leadId);
    }
  }
}

/**
 * POST /api/demo/track
 * Track demo user activity (called from frontend)
 * Public endpoint - uses session/lead info
 */
export const trackDemoActivity = async (req: Request, res: Response) => {
  try {
    const { email, eventType, module, feature, pagePath, sessionId, durationSeconds } = req.body;

    if (!email || !eventType) {
      res.status(400).json({ success: false, message: 'email and eventType required' });
      return;
    }

    // Find the lead
    const lead = await pool.query(
      'SELECT id FROM demo_leads WHERE email = $1',
      [email.toLowerCase()]
    );

    if (lead.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Lead not found' });
      return;
    }

    const leadId = lead.rows[0].id;

    // Insert analytics event
    await pool.query(
      `INSERT INTO demo_analytics (lead_id, event_type, module, feature, page_path, session_id, duration_seconds, user_agent, device_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        leadId,
        eventType,
        module || null,
        feature || null,
        pagePath || null,
        sessionId || null,
        durationSeconds || 0,
        req.headers['user-agent'] || null,
        detectDeviceType(req.headers['user-agent'] || '')
      ]
    );

    // Update lead activity
    await pool.query(
      `UPDATE demo_leads SET 
        last_login_at = CASE WHEN $1 = 'login' THEN NOW() ELSE last_login_at END,
        first_login_at = CASE WHEN first_login_at IS NULL AND $1 = 'login' THEN NOW() ELSE first_login_at END,
        login_count = CASE WHEN $1 = 'login' THEN login_count + 1 ELSE login_count END,
        total_time_spent_seconds = total_time_spent_seconds + $2,
        lead_score = lead_score + CASE 
          WHEN $1 = 'login' THEN 10
          WHEN $1 = 'module_visited' THEN 5
          WHEN $1 = 'feature_used' THEN 15
          WHEN $1 = 'action_taken' THEN 20
          ELSE 1
        END,
        updated_at = NOW()
      WHERE id = $3`,
      [eventType, durationSeconds || 0, leadId]
    );

    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Demo tracking error:', error);
    res.status(500).json({ success: false });
  }
};

/**
 * GET /api/demo/leads
 * Get all demo leads (for platform admin panel)
 * Protected - requires super admin auth
 */
export const getDemoLeads = async (req: Request, res: Response) => {
  try {
    const { status, search, sortBy = 'created_at', sortDir = 'DESC', page = 1, limit = 50 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const result = await pool.query(
      `SELECT 
        dl.*,
        COALESCE(
          (SELECT COUNT(DISTINCT module) FROM demo_analytics da WHERE da.lead_id = dl.id AND da.module IS NOT NULL),
          0
        ) as modules_explored,
        COALESCE(
          (SELECT string_agg(DISTINCT module, ', ') FROM demo_analytics da WHERE da.lead_id = dl.id AND da.module IS NOT NULL),
          'None yet'
        ) as modules_list,
        CASE 
          WHEN dl.expires_at < NOW() AND dl.status = 'active' THEN 'expired'
          ELSE dl.status
        END as effective_status
      FROM demo_leads dl
      WHERE ($1::VARCHAR IS NULL OR dl.status = $1)
        AND ($2::VARCHAR IS NULL OR dl.full_name ILIKE '%' || $2 || '%' OR dl.email ILIKE '%' || $2 || '%' OR dl.company_name ILIKE '%' || $2 || '%')
      ORDER BY dl.created_at DESC
      LIMIT $3 OFFSET $4`,
      [
        (status as string) || null,
        (search as string) || null,
        Number(limit),
        offset
      ]
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM demo_leads dl
       WHERE ($1::VARCHAR IS NULL OR dl.status = $1)
         AND ($2::VARCHAR IS NULL OR dl.full_name ILIKE '%' || $2 || '%' OR dl.email ILIKE '%' || $2 || '%')`,
      [(status as string) || null, (search as string) || null]
    );

    // Summary stats
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_leads,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
        COUNT(CASE WHEN first_login_at IS NOT NULL THEN 1 END) as logged_in,
        COUNT(CASE WHEN login_count > 2 THEN 1 END) as engaged,
        COUNT(CASE WHEN converted_to_trial THEN 1 END) as converted,
        AVG(lead_score) as avg_lead_score,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) as last_7_days
      FROM demo_leads
    `);

    res.json({
      success: true,
      data: {
        leads: result.rows,
        total: parseInt(countResult.rows[0].total),
        stats: stats.rows[0],
        page: Number(page),
        limit: Number(limit)
      }
    });
  } catch (error: any) {
    console.error('Get demo leads error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/demo/leads/:id/analytics
 * Get detailed analytics for a specific lead
 * Protected - requires super admin auth
 */
export const getLeadAnalytics = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const lead = await pool.query('SELECT * FROM demo_leads WHERE id = $1', [id]);
    if (lead.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Lead not found' });
      return;
    }

    const events = await pool.query(
      `SELECT * FROM demo_analytics WHERE lead_id = $1 ORDER BY created_at DESC LIMIT 200`,
      [id]
    );

    // Module breakdown
    const moduleBreakdown = await pool.query(
      `SELECT 
        module,
        COUNT(*) as visit_count,
        SUM(duration_seconds) as total_time,
        MIN(created_at) as first_visit,
        MAX(created_at) as last_visit
      FROM demo_analytics 
      WHERE lead_id = $1 AND module IS NOT NULL
      GROUP BY module
      ORDER BY visit_count DESC`,
      [id]
    );

    res.json({
      success: true,
      data: {
        lead: lead.rows[0],
        events: events.rows,
        moduleBreakdown: moduleBreakdown.rows,
        totalEvents: events.rows.length
      }
    });
  } catch (error: any) {
    console.error('Get lead analytics error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Detect device type from user agent
 */
function detectDeviceType(ua: string): string {
  if (/mobile|android|iphone|ipod/i.test(ua)) return 'mobile';
  if (/tablet|ipad/i.test(ua)) return 'tablet';
  return 'desktop';
}

export default {
  requestDemo,
  trackDemoActivity,
  getDemoLeads,
  getLeadAnalytics
};
