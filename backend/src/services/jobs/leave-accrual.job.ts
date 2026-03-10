/**
 * Leave Accrual Job
 *
 * - Monthly: Runs leave accrual calculations on the 1st of every month
 * - Year-end: Processes carryover on 1 January (March for fiscal-year tenants)
 * - Emails HR managers with accrual summary
 */

import { Job } from 'bull';
import { query } from '../../config/database';
import { registerJob, forEachTenant, SchedulerJobData } from '../scheduler.service';
import { processMonthlyAccruals, processYearEndCarryover } from '../../modules/hr/services/leave-accrual.service';
import { EmailQueueService } from '../email-queue.service';

registerJob({
  name: 'LEAVE_ACCRUAL',
  cron: '0 1 1 * *', // 1st of month at 01:00
  description: 'Monthly leave accrual & year-end carryover',
  enabled: true,
  handler: runLeaveAccrual,
});

async function runLeaveAccrual(job: Job<SchedulerJobData>) {
  const now = new Date();
  const month = now.getMonth(); // 0-indexed
  const stats = { processed: 0, carryoverProcessed: 0, forfeited: 0, errors: [] as string[] };

  await forEachTenant(async (tenantId) => {
    // 1. Monthly accrual (every month)
    try {
      const result = await processMonthlyAccruals(tenantId);
      stats.processed += result.processed;
      stats.errors.push(...result.errors);

      // Notify HR manager
      if (result.processed > 0) {
        const hrManagers = await query(
          `SELECT u.email, u.first_name FROM users u
           WHERE u.tenant_id = $1 AND u.role IN ('admin', 'hr_manager', 'hr_admin') AND u.is_active = true AND u.email IS NOT NULL`,
          [tenantId]
        );

        for (const mgr of hrManagers.rows) {
          const subj1 = `Leave Accrual Complete — ${result.processed} employees processed`;
          await EmailQueueService.queueLowPriority({
            to: mgr.email,
            subject: subj1,
            template: 'system-notification',
            variables: {
              subject: subj1,
              body: `
                <p>Hi ${mgr.first_name || 'HR Team'},</p>
                <p>Monthly leave accrual for ${now.toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })} has been processed:</p>
                <ul>
                  <li><strong>${result.processed}</strong> employee balances updated</li>
                  ${result.errors.length > 0 ? `<li style="color: #e74c3c"><strong>${result.errors.length}</strong> errors (see HR module for details)</li>` : ''}
                </ul>
                <p><a class="cta" href="${process.env.FRONTEND_URL || 'https://siyabusaerp.co.za'}/app/hr/leave">
                  View Leave Balances →
                </a></p>
              `,
            },
          });
        }
      }
    } catch (err: any) {
      console.error(`  Leave accrual error (tenant ${tenantId}):`, err.message);
      stats.errors.push(`Tenant ${tenantId}: ${err.message}`);
    }

    // 2. Year-end carryover — January (calendar-year companies)
    if (month === 0) {
      try {
        const previousYear = now.getFullYear() - 1;
        const result = await processYearEndCarryover(tenantId, previousYear, now.getFullYear());
        stats.carryoverProcessed += result.processed;
        stats.forfeited += result.forfeitedDays;

        if (result.processed > 0) {
          const hrManagers = await query(
            `SELECT u.email, u.first_name FROM users u
             WHERE u.tenant_id = $1 AND u.role IN ('admin', 'hr_manager', 'hr_admin') AND u.is_active = true AND u.email IS NOT NULL`,
            [tenantId]
          );

          for (const mgr of hrManagers.rows) {
            const subj2 = `Year-End Leave Carryover Complete — ${result.forfeitedDays} days forfeited`;
            await EmailQueueService.queueLowPriority({
              to: mgr.email,
              subject: subj2,
              template: 'system-notification',
              variables: {
                subject: subj2,
                body: `
                  <p>Hi ${mgr.first_name || 'HR Team'},</p>
                  <p>Year-end leave carryover from ${previousYear} to ${now.getFullYear()} is complete:</p>
                  <ul>
                    <li><strong>${result.processed}</strong> employees processed</li>
                    <li><strong>${result.forfeitedDays}</strong> total days forfeited (exceeded max carryover)</li>
                  </ul>
                  <p><a class="cta" href="${process.env.FRONTEND_URL || 'https://siyabusaerp.co.za'}/app/hr/leave">
                    View Leave Balances →
                  </a></p>
                `,
              },
            });
          }
        }
      } catch (err: any) {
        console.error(`  Year-end carryover error (tenant ${tenantId}):`, err.message);
        stats.errors.push(`Carryover ${tenantId}: ${err.message}`);
      }
    }

    // 3. Alert employees with high balances approaching cap (quarterly — March, June, Sep, Dec)
    if ([2, 5, 8, 11].includes(month)) {
      try {
        const highBalances = await query(
          `SELECT e.first_name, e.last_name, e.work_email,
                  lb.closing_balance, lt.leave_name, lt.max_balance
           FROM hr.employee_leave_balances lb
           JOIN hr.employees e ON lb.employee_id = e.employee_id AND lb.tenant_id = e.tenant_id
           JOIN hr.leave_types lt ON lb.leave_type_id = lt.leave_type_id
           WHERE lb.tenant_id = $1
             AND lb.year = $2
             AND lt.max_balance IS NOT NULL
             AND lb.closing_balance >= lt.max_balance * 0.85
             AND e.employment_status = 'active'
             AND e.work_email IS NOT NULL`,
          [tenantId, now.getFullYear()]
        );

        for (const emp of highBalances.rows) {
          const subj3 = `Leave Balance Alert: Your ${emp.leave_name} balance is at ${Math.round(emp.closing_balance)} days`;
          await EmailQueueService.queueLowPriority({
            to: emp.work_email,
            subject: subj3,
            template: 'system-notification',
            variables: {
              subject: subj3,
              body: `
                <p>Hi ${emp.first_name},</p>
                <p>Your <strong>${emp.leave_name}</strong> balance is <strong>${Math.round(emp.closing_balance)} / ${emp.max_balance} days</strong>.</p>
                <p>Unused leave exceeding the cap may be forfeited at year-end. Consider planning time off.</p>
                <p><a class="cta" href="${process.env.FRONTEND_URL || 'https://siyabusaerp.co.za'}/app/hr/leave/request">
                  Request Leave →
                </a></p>
              `,
            },
          });
        }
      } catch (err: any) {
        console.error(`  High balance alert error (tenant ${tenantId}):`, err.message);
      }
    }
  });

  return stats;
}

export default runLeaveAccrual;
