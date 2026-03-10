/**
 * Payroll Reminder Job
 *
 * - On the 20th: Warn HR/Payroll to prepare payroll data
 * - On the 25th: Remind that payroll cutoff is approaching
 * - On the 28th: Alert if no payroll run has been created for the month
 * - On the 1st: Check if previous month payroll is approved & paid
 */

import { Job } from 'bull';
import { query } from '../../config/database';
import { registerJob, forEachTenant, SchedulerJobData } from '../scheduler.service';
import { EmailQueueService } from '../email-queue.service';

registerJob({
  name: 'PAYROLL_REMINDER',
  cron: '0 8 1,20,25,28 * *', // 1st, 20th, 25th, 28th of month at 08:00
  description: 'Payroll cutoff reminders & status checks',
  enabled: true,
  handler: runPayrollReminder,
});

async function runPayrollReminder(job: Job<SchedulerJobData>) {
  const now = new Date();
  const dayOfMonth = now.getDate();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const monthName = now.toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' });
  const stats = { notified: 0 };

  await forEachTenant(async (tenantId) => {
    // Get payroll-responsible users
    const payrollTeam = await query(
      `SELECT email, first_name, role FROM users
       WHERE tenant_id = $1
         AND role IN ('admin', 'hr_manager', 'hr_admin', 'payroll_admin', 'accountant', 'director')
         AND is_active = true AND email IS NOT NULL`,
      [tenantId]
    );

    if (payrollTeam.rows.length === 0) return;

    // Check current month's payroll status
    const payrollStatus = await query(
      `SELECT pr.run_id, pr.status, pr.run_number, pr.total_net_pay, pp.period_name
       FROM hr.payroll_runs pr
       JOIN hr.payroll_periods pp ON pr.period_id = pp.period_id
       WHERE pr.tenant_id = $1
         AND EXTRACT(MONTH FROM pp.start_date) = $2
         AND EXTRACT(YEAR FROM pp.start_date) = $3
       ORDER BY pr.created_at DESC
       LIMIT 1`,
      [tenantId, currentMonth, currentYear]
    );

    const hasPayrollRun = payrollStatus.rows.length > 0;
    const currentStatus = hasPayrollRun ? payrollStatus.rows[0].status : null;

    let subject = '';
    let message = '';
    let urgency: 'low' | 'normal' | 'high' = 'normal';

    if (dayOfMonth === 20) {
      subject = `📋 Payroll Preparation: ${monthName} — Start gathering data`;
      message = `
        <p>Payroll for <strong>${monthName}</strong> should be prepared over the next week.</p>
        <h4>Checklist:</h4>
        <ul>
          <li>Verify overtime and commission entries</li>
          <li>Process any leave adjustments</li>
          <li>Capture bonus or ad-hoc payments</li>
          <li>Review new-joiner / termination documents</li>
          <li>Confirm salary changes effective this month</li>
        </ul>
        ${hasPayrollRun ? `<p>✅ A payroll run already exists (status: <strong>${currentStatus}</strong>)</p>` : '<p>⚠️ No payroll run has been created yet for this month.</p>'}
      `;
    } else if (dayOfMonth === 25) {
      urgency = 'high';
      subject = `⏰ Payroll Cutoff Approaching: ${monthName}`;
      message = `
        <p><strong>Payroll cutoff is in 3 days.</strong> Please ensure all data is captured.</p>
        ${hasPayrollRun
          ? `<p>Current payroll status: <strong>${currentStatus}</strong> — R${Number(payrollStatus.rows[0].total_net_pay || 0).toLocaleString()}</p>`
          : '<p style="color: #e74c3c"><strong>⚠️ No payroll run created yet! Please create one urgently.</strong></p>'
        }
      `;
    } else if (dayOfMonth === 28) {
      if (!hasPayrollRun) {
        urgency = 'high';
        subject = `🚨 URGENT: No Payroll Run for ${monthName}`;
        message = `
          <p style="color: #e74c3c; font-size: 16px"><strong>No payroll run has been created for ${monthName}!</strong></p>
          <p>Employees expect payment by month-end. Please create and process payroll immediately.</p>
        `;
      } else if (currentStatus === 'draft') {
        urgency = 'high';
        subject = `⚠️ Payroll Still in Draft: ${monthName}`;
        message = `
          <p>Payroll run <strong>${payrollStatus.rows[0].run_number}</strong> is still in <strong>draft</strong> status.</p>
          <p>Please process, approve, and submit for payment before month-end.</p>
        `;
      } else {
        return; // Payroll is processing/approved/paid — no alert needed
      }
    } else if (dayOfMonth === 1) {
      // Check if PREVIOUS month's payroll was completed
      const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;

      const prevPayroll = await query(
        `SELECT pr.status, pr.run_number, pr.total_net_pay
         FROM hr.payroll_runs pr
         JOIN hr.payroll_periods pp ON pr.period_id = pp.period_id
         WHERE pr.tenant_id = $1
           AND EXTRACT(MONTH FROM pp.start_date) = $2
           AND EXTRACT(YEAR FROM pp.start_date) = $3
         ORDER BY pr.created_at DESC
         LIMIT 1`,
        [tenantId, prevMonth, prevYear]
      );

      if (prevPayroll.rows.length === 0 || !['paid', 'approved'].includes(prevPayroll.rows[0]?.status)) {
        urgency = 'high';
        const prevMonthName = new Date(prevYear, prevMonth - 1).toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' });
        subject = `🚨 Previous Month Payroll Incomplete: ${prevMonthName}`;
        message = `
          <p>The payroll for <strong>${prevMonthName}</strong> has not been marked as paid.</p>
          <p>Status: <strong>${prevPayroll.rows[0]?.status || 'NOT CREATED'}</strong></p>
          <p>Please resolve this before starting the new month's payroll.</p>
        `;
      } else {
        return; // Previous month payroll is fine
      }
    }

    if (!subject) return;

    const queueFn = urgency === 'high'
      ? EmailQueueService.queueHighPriority.bind(EmailQueueService)
      : EmailQueueService.queueNormalPriority.bind(EmailQueueService);

    for (const user of payrollTeam.rows) {
      await queueFn({
        to: user.email,
        subject,
        template: 'system-notification',
        variables: {
          subject,
          body: `
            <p>Hi ${user.first_name || 'Payroll Team'},</p>
            ${message}
            <p style="margin-top: 16px">
              <a class="cta" href="${process.env.FRONTEND_URL || 'https://siyabusaerp.co.za'}/app/hr/payroll">
                Go to Payroll →
              </a>
            </p>
          `,
        },
      });
      stats.notified++;
    }
  });

  return stats;
}

export default runPayrollReminder;
