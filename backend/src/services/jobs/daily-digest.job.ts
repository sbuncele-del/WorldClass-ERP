/**
 * Daily Digest Job
 *
 * Sends a morning email to every active user with their personalized summary:
 *  - Tasks due today & overdue
 *  - Pending approvals
 *  - Upcoming compliance deadlines (next 7 days)
 *  - Unreconciled bank items
 *  - Low stock alerts
 *  - Key financial KPIs
 */

import { Job } from 'bull';
import { query } from '../../config/database';
import { registerJob, forEachTenant, SchedulerJobData } from '../scheduler.service';
import { EmailQueueService } from '../email-queue.service';

// ── Self-register ───────────────────────────────────────

registerJob({
  name: 'DAILY_DIGEST',
  cron: '30 6 * * 1-5', // Mon-Fri at 06:30
  description: 'Morning email digest to all active users',
  enabled: true,
  handler: runDailyDigest,
});

// ── Main handler ────────────────────────────────────────

async function runDailyDigest(job: Job<SchedulerJobData>) {
  const stats = await forEachTenant(async (tenantId) => {
    await sendDigestsForTenant(tenantId);
  });
  return { ...stats, jobType: 'DAILY_DIGEST' };
}

async function sendDigestsForTenant(tenantId: string) {
  // Get users who have email and are active
  const users = await query(
    `SELECT id, email, first_name, last_name, role
     FROM users
     WHERE tenant_id = $1
       AND COALESCE(is_active, true) = true
       AND email IS NOT NULL AND email != ''
     ORDER BY first_name`,
    [tenantId]
  );

  if (users.rows.length === 0) return;

  // Gather tenant-level data once
  const [
    overdueInvoices,
    pendingApprovals,
    complianceDeadlines,
    unreconciledCount,
    lowStockItems,
    financialSummary,
    overdueTasks,
  ] = await Promise.all([
    getOverdueInvoices(tenantId),
    getPendingApprovals(tenantId),
    getUpcomingDeadlines(tenantId),
    getUnreconciledCount(tenantId),
    getLowStockCount(tenantId),
    getFinancialSnapshot(tenantId),
    getOverdueTasks(tenantId),
  ]);

  for (const user of users.rows) {
    const firstName = user.first_name || 'Team Member';
    const sections: string[] = [];

    // Greeting
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

    // 1. Tasks
    if (overdueTasks.total > 0) {
      sections.push(`
        <div class="section">
          <h3>📋 Tasks</h3>
          <p><strong>${overdueTasks.dueToday}</strong> due today · <strong style="color:#ef4444">${overdueTasks.overdue}</strong> overdue</p>
          ${overdueTasks.items.slice(0, 5).map(t =>
            `<div class="item ${t.overdue ? 'urgent' : ''}">${t.title} <span class="meta">Due: ${t.dueDate}</span></div>`
          ).join('')}
        </div>
      `);
    }

    // 2. Pending Approvals
    if (pendingApprovals.total > 0) {
      sections.push(`
        <div class="section">
          <h3>✅ Pending Approvals</h3>
          <p><strong>${pendingApprovals.total}</strong> items waiting for approval${pendingApprovals.stale > 0 ? ` · <strong style="color:#ef4444">${pendingApprovals.stale}</strong> older than 3 days` : ''}</p>
          ${pendingApprovals.items.slice(0, 5).map(a =>
            `<div class="item">${a.type}: ${a.description} <span class="meta">R${Number(a.amount || 0).toLocaleString()}</span></div>`
          ).join('')}
        </div>
      `);
    }

    // 3. Compliance Deadlines
    if (complianceDeadlines.length > 0) {
      sections.push(`
        <div class="section">
          <h3>📅 Compliance Deadlines (Next 7 Days)</h3>
          ${complianceDeadlines.map(d =>
            `<div class="item ${d.daysUntil <= 2 ? 'urgent' : ''}">${d.name} <span class="meta">${d.authority} · Due: ${d.dueDate} (${d.daysUntil === 0 ? 'TODAY' : d.daysUntil + 'd'})</span></div>`
          ).join('')}
        </div>
      `);
    }

    // 4. Banking
    if (unreconciledCount > 0) {
      sections.push(`
        <div class="section">
          <h3>🏦 Bank Reconciliation</h3>
          <p><strong>${unreconciledCount}</strong> unreconciled transactions need attention</p>
        </div>
      `);
    }

    // 5. Invoices
    if (overdueInvoices.total > 0) {
      sections.push(`
        <div class="section">
          <h3>💰 Overdue Invoices</h3>
          <p><strong>${overdueInvoices.total}</strong> invoices overdue · Total: <strong>R${overdueInvoices.totalAmount.toLocaleString()}</strong></p>
        </div>
      `);
    }

    // 6. Stock Alerts
    if (lowStockItems > 0) {
      sections.push(`
        <div class="section">
          <h3>📦 Low Stock Alerts</h3>
          <p><strong>${lowStockItems}</strong> items below reorder point</p>
        </div>
      `);
    }

    // 7. Financial KPIs (for managers/directors)
    if (['director', 'executive', 'manager', 'accountant', 'admin'].includes(user.role?.toLowerCase?.())) {
      if (financialSummary) {
        sections.push(`
          <div class="section kpi-section">
            <h3>📊 Financial Snapshot</h3>
            <div class="kpi-grid">
              <div class="kpi"><span class="kpi-value">R${financialSummary.cashPosition.toLocaleString()}</span><span class="kpi-label">Cash Position</span></div>
              <div class="kpi"><span class="kpi-value">R${financialSummary.receivables.toLocaleString()}</span><span class="kpi-label">Receivables</span></div>
              <div class="kpi"><span class="kpi-value">R${financialSummary.payables.toLocaleString()}</span><span class="kpi-label">Payables</span></div>
            </div>
          </div>
        `);
      }
    }

    // Skip email if nothing to report
    if (sections.length === 0) continue;

    const today = new Date().toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    await EmailQueueService.queueNormalPriority({
      to: user.email,
      subject: `${greeting}, ${firstName} — Your Daily Briefing`,
      template: 'daily-digest',
      variables: {
        greeting,
        firstName,
        today,
        sections: sections.join(''),
        loginUrl: process.env.FRONTEND_URL || 'https://siyabusaerp.co.za',
      },
    });
  }
}

// ── Data fetchers ───────────────────────────────────────

async function getOverdueTasks(tenantId: string) {
  try {
    const result = await query(
      `SELECT title, due_date, status, assigned_to
       FROM tasks
       WHERE tenant_id = $1
         AND status NOT IN ('completed', 'cancelled')
         AND due_date <= CURRENT_DATE + INTERVAL '1 day'
       ORDER BY due_date ASC
       LIMIT 20`,
      [tenantId]
    );
    const today = new Date().toISOString().split('T')[0];
    const items = result.rows.map((r: any) => ({
      title: r.title,
      dueDate: r.due_date ? new Date(r.due_date).toISOString().split('T')[0] : '-',
      overdue: r.due_date && new Date(r.due_date).toISOString().split('T')[0] < today,
    }));
    return {
      total: items.length,
      dueToday: items.filter(i => i.dueDate === today).length,
      overdue: items.filter(i => i.overdue).length,
      items,
    };
  } catch { return { total: 0, dueToday: 0, overdue: 0, items: [] }; }
}

async function getOverdueInvoices(tenantId: string) {
  try {
    const result = await query(
      `SELECT COUNT(*) AS total, COALESCE(SUM(total_amount), 0) AS total_amount
       FROM invoices
       WHERE tenant_id = $1
         AND status IN ('sent', 'overdue', 'unpaid')
         AND due_date < CURRENT_DATE`,
      [tenantId]
    );
    return {
      total: Number(result.rows[0]?.total || 0),
      totalAmount: Number(result.rows[0]?.total_amount || 0),
    };
  } catch { return { total: 0, totalAmount: 0 }; }
}

async function getPendingApprovals(tenantId: string) {
  try {
    const result = await query(
      `SELECT
         'Journal Entry' AS type, description, total_amount AS amount, created_at
       FROM journal_entries
       WHERE tenant_id = $1 AND status = 'pending_approval'
       ORDER BY created_at ASC LIMIT 10`,
      [tenantId]
    );
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000);
    const items = result.rows.map((r: any) => ({
      type: r.type,
      description: r.description || 'No description',
      amount: r.amount,
    }));
    return {
      total: items.length,
      stale: result.rows.filter((r: any) => new Date(r.created_at) < threeDaysAgo).length,
      items,
    };
  } catch { return { total: 0, stale: 0, items: [] }; }
}

async function getUpcomingDeadlines(tenantId: string) {
  try {
    const result = await query(
      `SELECT name, authority, due_date
       FROM regulatory_filings
       WHERE tenant_id = $1
         AND status NOT IN ('submitted', 'completed')
         AND due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
       ORDER BY due_date ASC
       LIMIT 10`,
      [tenantId]
    );
    return result.rows.map((r: any) => ({
      name: r.name,
      authority: r.authority,
      dueDate: r.due_date ? new Date(r.due_date).toISOString().split('T')[0] : '-',
      daysUntil: r.due_date ? Math.ceil((new Date(r.due_date).getTime() - Date.now()) / 86400000) : 99,
    }));
  } catch { return []; }
}

async function getUnreconciledCount(tenantId: string) {
  try {
    const result = await query(
      `SELECT COUNT(*) AS cnt
       FROM bank_transactions
       WHERE tenant_id = $1 AND COALESCE(is_reconciled, false) = false`,
      [tenantId]
    );
    return Number(result.rows[0]?.cnt || 0);
  } catch { return 0; }
}

async function getLowStockCount(tenantId: string) {
  try {
    const result = await query(
      `SELECT COUNT(*) AS cnt
       FROM inventory_items
       WHERE tenant_id = $1
         AND quantity_on_hand <= COALESCE(reorder_point, 0)
         AND COALESCE(is_active, true) = true`,
      [tenantId]
    );
    return Number(result.rows[0]?.cnt || 0);
  } catch { return 0; }
}

async function getFinancialSnapshot(tenantId: string) {
  try {
    const result = await query(
      `SELECT
         COALESCE(SUM(CASE WHEN account_type = 'asset' AND UPPER(COALESCE(tax_type,'')) LIKE '%BANK%' THEN balance ELSE 0 END), 0) AS cash_position,
         COALESCE(SUM(CASE WHEN account_type = 'asset' AND sub_type = 'accounts_receivable' THEN balance ELSE 0 END), 0) AS receivables,
         COALESCE(SUM(CASE WHEN account_type = 'liability' AND sub_type = 'accounts_payable' THEN balance ELSE 0 END), 0) AS payables
       FROM chart_of_accounts
       WHERE tenant_id = $1`,
      [tenantId]
    );
    const r = result.rows[0];
    return {
      cashPosition: Number(r?.cash_position || 0),
      receivables: Number(r?.receivables || 0),
      payables: Number(r?.payables || 0),
    };
  } catch { return null; }
}

export default runDailyDigest;
