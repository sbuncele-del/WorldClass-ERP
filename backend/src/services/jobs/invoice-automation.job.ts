/**
 * Invoice Automation Job
 *
 * - Sends payment reminders for invoices due within 3 days
 * - Marks overdue invoices and notifies customers
 * - Auto-generates recurring invoices from templates
 * - Sends overdue summary to finance manager
 */

import { Job } from 'bull';
import { query } from '../../config/database';
import { registerJob, forEachTenant, SchedulerJobData } from '../scheduler.service';
import { EmailQueueService } from '../email-queue.service';

registerJob({
  name: 'INVOICE_REMINDERS',
  cron: '0 8 * * 1-5', // Mon-Fri 08:00
  description: 'Invoice payment reminders & overdue notifications',
  enabled: true,
  handler: runInvoiceAutomation,
});

async function runInvoiceAutomation(job: Job<SchedulerJobData>) {
  const stats = { reminded: 0, markedOverdue: 0, recurring: 0 };

  await forEachTenant(async (tenantId) => {
    // 1. Send reminders for invoices due in 3 days
    const upcoming = await query(
      `SELECT i.invoice_id, i.invoice_number, i.total_amount, i.due_date,
              i.currency, c.name AS customer_name, c.email AS customer_email
       FROM invoices i
       LEFT JOIN customers c ON i.customer_id = c.customer_id AND i.tenant_id = c.tenant_id
       WHERE i.tenant_id = $1
         AND i.status IN ('sent', 'unpaid')
         AND i.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '3 days'`,
      [tenantId]
    );

    for (const inv of upcoming.rows) {
      if (!inv.customer_email) continue;
      const daysUntil = Math.ceil((new Date(inv.due_date).getTime() - Date.now()) / 86400000);

      await EmailQueueService.queueNormalPriority({
        to: inv.customer_email,
        subject: `Payment Reminder: Invoice ${inv.invoice_number} due ${daysUntil === 0 ? 'today' : `in ${daysUntil} day(s)`}`,
        template: 'invoice-notification',
        variables: {
          customerName: inv.customer_name || 'Customer',
          invoiceNumber: inv.invoice_number,
          amount: `${inv.currency || 'R'}${Number(inv.total_amount).toLocaleString()}`,
          dueDate: new Date(inv.due_date).toLocaleDateString('en-ZA'),
          message: `This is a friendly reminder that invoice ${inv.invoice_number} for ${inv.currency || 'R'}${Number(inv.total_amount).toLocaleString()} is due ${daysUntil === 0 ? 'today' : `in ${daysUntil} day(s)`}.`,
          actionUrl: process.env.FRONTEND_URL || 'https://siyabusaerp.co.za',
          actionText: 'View Invoice',
        },
      });
      stats.reminded++;
    }

    // 2. Mark overdue invoices
    const overdue = await query(
      `UPDATE invoices
       SET status = 'overdue', updated_at = NOW()
       WHERE tenant_id = $1
         AND status IN ('sent', 'unpaid')
         AND due_date < CURRENT_DATE
       RETURNING invoice_id`,
      [tenantId]
    );
    stats.markedOverdue += overdue.rowCount || 0;

    // 3. Generate recurring invoices from templates
    const recurringTemplates = await query(
      `SELECT *
       FROM recurring_invoice_templates
       WHERE tenant_id = $1
         AND is_active = true
         AND next_generation_date <= CURRENT_DATE`,
      [tenantId]
    );

    for (const tmpl of recurringTemplates.rows) {
      try {
        // Create new invoice from template
        await query(
          `INSERT INTO invoices (tenant_id, customer_id, invoice_number, issue_date, due_date,
                                 total_amount, currency, status, notes, created_at)
           SELECT $1, customer_id,
                  'INV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(nextval('invoice_seq')::text, 4, '0'),
                  CURRENT_DATE,
                  CURRENT_DATE + (payment_terms_days || 30)::int,
                  amount, currency, 'draft',
                  'Auto-generated from recurring template',
                  NOW()
           FROM recurring_invoice_templates
           WHERE template_id = $2 AND tenant_id = $1`,
          [tenantId, tmpl.template_id]
        );

        // Advance next generation date
        await query(
          `UPDATE recurring_invoice_templates
           SET next_generation_date = next_generation_date + (frequency_days || 30)::int,
               last_generated_date = CURRENT_DATE,
               updated_at = NOW()
           WHERE template_id = $1 AND tenant_id = $2`,
          [tmpl.template_id, tenantId]
        );

        stats.recurring++;
      } catch (err) {
        console.error(`  Recurring invoice error (template ${tmpl.template_id}):`, err);
      }
    }

    // 4. Send overdue summary to finance admins
    if ((overdue.rowCount || 0) > 0) {
      const admins = await query(
        `SELECT email, first_name FROM users
         WHERE tenant_id = $1 AND role IN ('admin', 'accountant', 'director') AND is_active = true AND email IS NOT NULL`,
        [tenantId]
      );

      const totalOverdue = await query(
        `SELECT COUNT(*) AS cnt, COALESCE(SUM(total_amount),0) AS total
         FROM invoices WHERE tenant_id = $1 AND status = 'overdue'`,
        [tenantId]
      );

      for (const admin of admins.rows) {
        await EmailQueueService.queueLowPriority({
          to: admin.email,
          subject: `⚠️ ${totalOverdue.rows[0].cnt} Overdue Invoices — R${Number(totalOverdue.rows[0].total).toLocaleString()}`,
          template: 'invoice-notification',
          variables: {
            customerName: admin.first_name || 'Finance Team',
            invoiceNumber: 'Overdue Summary',
            amount: `R${Number(totalOverdue.rows[0].total).toLocaleString()}`,
            dueDate: new Date().toLocaleDateString('en-ZA'),
            message: `There are ${totalOverdue.rows[0].cnt} overdue invoices totalling R${Number(totalOverdue.rows[0].total).toLocaleString()}. Please review and follow up.`,
            actionUrl: (process.env.FRONTEND_URL || 'https://siyabusaerp.co.za') + '/app/sales-hub',
            actionText: 'View Overdue Invoices',
          },
        });
      }
    }
  });

  return stats;
}

export default runInvoiceAutomation;
