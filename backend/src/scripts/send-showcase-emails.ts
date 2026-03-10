/**
 * Send showcase emails to sbuncele@gmail.com demonstrating all automation jobs
 * Uses Ethereal test SMTP (generates preview URLs you can view in browser)
 * 
 * Usage: npx ts-node src/scripts/send-showcase-emails.ts
 */

import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

const RECIPIENT = 'sbuncele@gmail.com';
const RECIPIENT_NAME = 'Ncele';

async function loadTemplate(name: string, vars: Record<string, string>): Promise<string> {
  const tplPath = path.join(__dirname, '../templates/email', `${name}.html`);
  let html: string;
  try {
    html = fs.readFileSync(tplPath, 'utf-8');
  } catch {
    // fallback for system-notification
    html = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:linear-gradient(135deg,#00D4AA,#00B894);color:#fff;padding:24px 30px"><h1 style="font-size:18px">{{subject}}</h1></div>
      <div style="padding:24px 30px">{{body}}</div>
      <div style="padding:16px 30px;background:#f8f9fa;text-align:center;font-size:12px;color:#999">SiyaBusa ERP — Work Smart, Not Hard</div>
    </body></html>`;
  }
  for (const [k, v] of Object.entries(vars)) {
    html = html.replace(new RegExp(`{{${k}}}`, 'g'), v);
  }
  return html;
}

interface Email {
  subject: string;
  html: string;
  description: string;
}

async function buildEmails(): Promise<Email[]> {
  const today = new Date().toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const emails: Email[] = [];

  // 1. Daily Digest
  const digestHtml = await loadTemplate('daily-digest', {
    firstName: RECIPIENT_NAME,
    dateFormatted: today,
    hasTasks: 'true',
    overdueTasks: '3',
    overdueTaskClass: 'red',
    dueTodayTasks: '7',
    hasApprovals: 'true',
    pendingApprovals: '5',
    staleApprovalClass: '',
    staleApprovals: '2',
    hasInvoices: 'true',
    overdueInvoiceCount: '12',
    overdueInvoiceTotal: 'R847,320',
    hasDeadlines: 'true',
    hasUnreconciled: 'true',
    unreconciledCount: '34',
    hasLowStock: 'true',
    lowStockCount: '8',
    hasFinancials: 'true',
    cashBalance: 'R2.4M',
    receivables: 'R1.8M',
    payables: 'R960K',
    dashboardUrl: 'https://siyabusaerp.co.za/app/dashboard',
    settingsUrl: 'https://siyabusaerp.co.za/app/settings/notifications',
    unsubscribeUrl: 'https://siyabusaerp.co.za/unsubscribe',
  });
  // Handlebars-style conditionals won't work with simple replace, so strip them
  const cleanDigest = digestHtml
    .replace(/\{\{#if \w+\}\}/g, '')
    .replace(/\{\{\/if\}\}/g, '')
    .replace(/\{\{#each \w+\}\}[\s\S]*?\{\{\/each\}\}/g, `
      <div style="padding:8px 12px;margin:4px 0;border-radius:4px;font-size:14px;background:#e8f4fd;color:#2980b9">
        <strong>VAT201 Return</strong> — Friday 15 March 2026
      </div>
      <div style="padding:8px 12px;margin:4px 0;border-radius:4px;font-size:14px;background:#e8f4fd;color:#2980b9">
        <strong>EMP201 Monthly</strong> — Monday 17 March 2026
      </div>
    `);
  emails.push({ subject: `☀️ Good Morning ${RECIPIENT_NAME} — Your Daily Digest`, html: cleanDigest, description: 'Daily Digest (Mon-Fri 06:30)' });

  // 2. Invoice Reminders
  emails.push({
    subject: 'Payment Reminder: Invoice INV-20260308-0042 due in 2 day(s)',
    html: await loadTemplate('system-notification', {
      subject: 'Payment Reminder: Invoice INV-20260308-0042 due in 2 day(s)',
      body: `
        <p>Hi ${RECIPIENT_NAME},</p>
        <p>This is a friendly reminder that invoice <strong>INV-20260308-0042</strong> for <strong>R24,500.00</strong> is due in <strong>2 day(s)</strong>.</p>
        <p>Please ensure timely payment to avoid any disruptions.</p>
        <p><a class="cta" href="https://siyabusaerp.co.za/app/sales-hub">View Invoice →</a></p>
      `,
    }),
    description: 'Invoice Payment Reminder (Mon-Fri 08:00)',
  });

  // 3. Overdue Invoice Summary  
  emails.push({
    subject: '⚠️ 12 Overdue Invoices — R847,320',
    html: await loadTemplate('system-notification', {
      subject: '12 Overdue Invoices — R847,320 Outstanding',
      body: `
        <p>Hi ${RECIPIENT_NAME},</p>
        <p>There are <strong>12 overdue invoices</strong> totalling <strong>R847,320</strong>. Please review and follow up with the customers.</p>
        <table>
          <tr style="background:#f8f9fa"><th style="padding:8px;text-align:left">Customer</th><th style="padding:8px;text-align:right">Amount</th><th style="padding:8px;text-align:center">Days Overdue</th></tr>
          <tr><td style="padding:6px 8px">Masaphokati Holdings</td><td style="padding:6px 8px;text-align:right">R245,000</td><td style="padding:6px 8px;text-align:center;color:#e74c3c">14</td></tr>
          <tr><td style="padding:6px 8px">Gauteng Mining Ltd</td><td style="padding:6px 8px;text-align:right">R180,500</td><td style="padding:6px 8px;text-align:center;color:#e74c3c">9</td></tr>
          <tr><td style="padding:6px 8px">Johannesburg Construction</td><td style="padding:6px 8px;text-align:right">R142,820</td><td style="padding:6px 8px;text-align:center;color:#f39c12">5</td></tr>
        </table>
        <p style="color:#666;font-size:13px">...and 9 more</p>
        <p><a class="cta" href="https://siyabusaerp.co.za/app/sales-hub">View All Overdue Invoices →</a></p>
      `,
    }),
    description: 'Overdue Invoice Summary (for Finance Team)',
  });

  // 4. Bank Reconciliation
  emails.push({
    subject: 'Bank Reconciliation: 28 auto-matched, 6 suggestions',
    html: await loadTemplate('system-notification', {
      subject: 'Bank Reconciliation: 28 auto-matched, 6 suggestions',
      body: `
        <p>Hi ${RECIPIENT_NAME},</p>
        <p>The overnight bank reconciliation job completed:</p>
        <ul>
          <li><strong>28</strong> transactions auto-matched with high confidence</li>
          <li><strong>6</strong> suggestions for your review</li>
        </ul>
        <p>Total unreconciled items remaining: <strong>34</strong></p>
        <p><a class="cta" href="https://siyabusaerp.co.za/app/cash-management/reconciliation">Review Matches →</a></p>
      `,
    }),
    description: 'Bank Reconciliation Report (Mon-Fri 07:00)',
  });

  // 5. Compliance Alert - SARS VAT
  emails.push({
    subject: '3 DAYS: VAT201 Return — Monthly VAT return submission to SARS',
    html: await loadTemplate('system-notification', {
      subject: '3 DAYS: VAT201 Return — Monthly VAT submission',
      body: `
        <p>Hi ${RECIPIENT_NAME},</p>
        <p style="font-size:16px;font-weight:bold;color:#f39c12">VAT201 Return: Monthly VAT return submission to SARS</p>
        <p>
          <strong>Due:</strong> Friday, 15 March 2026<br>
          <strong>Status:</strong> 3 DAYS
        </p>
        <p>Ensure your VAT calculations are up to date and submit via SARS eFiling before the deadline.</p>
        <p><a class="cta" href="https://siyabusaerp.co.za/app/compliance/regulatory-hub">View Compliance Hub →</a></p>
      `,
    }),
    description: 'SARS Compliance Alert (Mon-Fri 07:30)',
  });

  // 6. Approval Escalation
  emails.push({
    subject: 'Escalated Approval: JE-2026-0891 — R156,000',
    html: await loadTemplate('system-notification', {
      subject: 'Escalated Approval: JE-2026-0891 — R156,000',
      body: `
        <p>Hi ${RECIPIENT_NAME},</p>
        <p>The following entry has been <strong>escalated to you</strong> after waiting 52 hours at the <em>Finance Manager</em> level:</p>
        <table>
          <tr><td style="padding:4px 12px 4px 0;color:#666">Entry:</td><td><strong>JE-2026-0891</strong></td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666">Amount:</td><td>R156,000</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666">Description:</td><td>Capital expenditure — Johannesburg office renovation</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666">Workflow:</td><td>Executive Approval (4-level)</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666">Now at:</td><td>Director Level (Level 3)</td></tr>
        </table>
        <p><a class="cta" href="https://siyabusaerp.co.za/app/approvals">Review & Approve →</a></p>
      `,
    }),
    description: 'Approval Escalation (Mon-Fri 09:00)',
  });

  // 7. Low Stock Alert
  emails.push({
    subject: '8 item(s) below reorder point — 2 OUT OF STOCK',
    html: await loadTemplate('system-notification', {
      subject: '8 items below reorder point — 2 OUT OF STOCK',
      body: `
        <p>Hi ${RECIPIENT_NAME},</p>
        <p>The following inventory items need attention:</p>
        <h3 style="color:#e74c3c;margin:16px 0 4px">Out of Stock (2)</h3>
        <table style="font-size:14px">
          <tr style="background:#f8f9fa"><th style="padding:8px;text-align:left">Code</th><th style="padding:8px;text-align:left">Item</th><th style="padding:8px;text-align:center">Stock</th><th style="padding:8px;text-align:center">Reorder Pt</th></tr>
          <tr><td style="padding:6px 8px"><strong>PPE-0034</strong></td><td style="padding:6px 8px">Safety Helmets (White)</td><td style="padding:6px 8px;text-align:center;color:#e74c3c"><strong>0</strong></td><td style="padding:6px 8px;text-align:center">50</td></tr>
          <tr><td style="padding:6px 8px"><strong>CHM-0112</strong></td><td style="padding:6px 8px">Hydraulic Fluid 5L</td><td style="padding:6px 8px;text-align:center;color:#e74c3c"><strong>0</strong></td><td style="padding:6px 8px;text-align:center">20</td></tr>
        </table>
        <h3 style="color:#f39c12;margin:16px 0 4px">Low Stock (6)</h3>
        <table style="font-size:14px">
          <tr style="background:#f8f9fa"><th style="padding:8px;text-align:left">Code</th><th style="padding:8px;text-align:left">Item</th><th style="padding:8px;text-align:center">Stock</th><th style="padding:8px;text-align:center">Reorder Pt</th></tr>
          <tr><td style="padding:6px 8px"><strong>ELC-0067</strong></td><td>Cable Ties 300mm (box)</td><td style="padding:6px 8px;text-align:center;color:#f39c12"><strong>12</strong></td><td style="padding:6px 8px;text-align:center">50</td></tr>
          <tr><td style="padding:6px 8px"><strong>CEM-0023</strong></td><td>Portland Cement 50kg</td><td style="padding:6px 8px;text-align:center;color:#f39c12"><strong>8</strong></td><td style="padding:6px 8px;text-align:center">30</td></tr>
          <tr><td style="padding:6px 8px"><strong>MED-0089</strong></td><td>Disposable Gloves (L)</td><td style="padding:6px 8px;text-align:center;color:#f39c12"><strong>24</strong></td><td style="padding:6px 8px;text-align:center">100</td></tr>
        </table>
        <p style="color:#666;font-size:13px">...and 3 more items</p>
        <p><a class="cta" href="https://siyabusaerp.co.za/app/inventory">View Inventory →</a></p>
      `,
    }),
    description: 'Low Stock Alert (Daily 06:00)',
  });

  // 8. Leave Accrual
  emails.push({
    subject: 'Leave Accrual Complete — 47 employees processed',
    html: await loadTemplate('system-notification', {
      subject: 'Leave Accrual Complete — 47 employees processed',
      body: `
        <p>Hi ${RECIPIENT_NAME},</p>
        <p>Monthly leave accrual for <strong>March 2026</strong> has been processed:</p>
        <ul>
          <li><strong>47</strong> employee balances updated</li>
          <li><strong>0</strong> errors</li>
        </ul>
        <p>Annual leave: +1.25 days per employee<br>
        Sick leave: +1.0 days per employee</p>
        <p><a class="cta" href="https://siyabusaerp.co.za/app/hr/leave">View Leave Balances →</a></p>
      `,
    }),
    description: 'Leave Accrual Report (1st of month 01:00)',
  });

  // 9. Payroll Reminder
  emails.push({
    subject: '⏰ Payroll Cutoff Approaching: March 2026',
    html: await loadTemplate('system-notification', {
      subject: 'Payroll Cutoff Approaching: March 2026',
      body: `
        <p>Hi ${RECIPIENT_NAME},</p>
        <p><strong>Payroll cutoff is in 3 days.</strong> Please ensure all data is captured.</p>
        <p>Current payroll status: <strong>draft</strong> — R1,245,680 net</p>
        <h4>Checklist:</h4>
        <ul>
          <li>Verify overtime and commission entries</li>
          <li>Process any leave adjustments</li>
          <li>Capture bonus or ad-hoc payments</li>
          <li>Review new-joiner / termination documents</li>
          <li>Confirm salary changes effective this month</li>
        </ul>
        <p><a class="cta" href="https://siyabusaerp.co.za/app/hr/payroll">Go to Payroll →</a></p>
      `,
    }),
    description: 'Payroll Reminder (25th of month 08:00)',
  });

  return emails;
}

async function sendViaResend(apiKey: string, email: Email): Promise<string> {
  const fromDomain = process.env.RESEND_FROM_DOMAIN || 'siyabusaerp.co.za';
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `SiyaBusa ERP <noreply@${fromDomain}>`,
      to: [RECIPIENT],
      subject: email.subject,
      html: email.html,
    }),
  });

  if (!response.ok) {
    const err = await response.json() as any;
    throw new Error(`Resend ${response.status}: ${err.message || err.statusCode || JSON.stringify(err)}`);
  }

  const result = await response.json() as { id: string };
  return result.id;
}

async function sendViaEthereal(emails: Email[]): Promise<void> {
  console.log('📧 No RESEND_API_KEY found. Using Ethereal preview mode...');
  const testAccount = await nodemailer.createTestAccount();
  const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email', port: 587, secure: false,
    auth: { user: testAccount.user, pass: testAccount.pass },
  });

  for (let i = 0; i < emails.length; i++) {
    const email = emails[i];
    const info = await transporter.sendMail({
      from: '"SiyaBusa ERP" <noreply@siyabusaerp.co.za>',
      to: RECIPIENT, subject: email.subject, html: email.html,
    });
    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log(`  ${i + 1}. ✅ ${email.description}`);
    console.log(`     Preview: ${previewUrl}`);
  }
}

async function main() {
  console.log('🚀 SiyaBusa ERP — Automation Engine Showcase Emails\n');

  const emails = await buildEmails();
  const resendKey = process.env.RESEND_API_KEY;

  console.log('━'.repeat(70));
  console.log(`  Sending ${emails.length} emails to: ${RECIPIENT}`);
  console.log(`  Provider: ${resendKey ? 'Resend (LIVE delivery)' : 'Ethereal (preview only)'}`);
  console.log('━'.repeat(70) + '\n');

  if (resendKey) {
    let sent = 0;
    for (let i = 0; i < emails.length; i++) {
      const email = emails[i];
      try {
        const id = await sendViaResend(resendKey, email);
        console.log(`  ${i + 1}. ✅ ${email.description}`);
        console.log(`     Subject: ${email.subject}`);
        console.log(`     Resend ID: ${id}`);
        sent++;
        // Small delay to avoid rate limits
        if (i < emails.length - 1) await new Promise(r => setTimeout(r, 500));
      } catch (err: any) {
        console.error(`  ${i + 1}. ❌ ${email.description}: ${err.message}`);
      }
    }
    console.log(`\n${'━'.repeat(70)}`);
    console.log(`  ✅ ${sent}/${emails.length} emails sent to ${RECIPIENT} via Resend`);
    console.log(`  📬 Check your Gmail inbox (and spam folder)!`);
    console.log('━'.repeat(70) + '\n');
  } else {
    await sendViaEthereal(emails);
    console.log('\n  ⚠️  Emails captured in Ethereal (not delivered to Gmail).');
    console.log('  Set RESEND_API_KEY to send real emails.\n');
  }
}

main().catch(console.error);
