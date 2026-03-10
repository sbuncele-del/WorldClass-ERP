/**
 * Compliance Alerts Job
 *
 * Sends email alerts for upcoming SARS and regulatory deadlines:
 * - 7 days before: informational
 * - 3 days before: warning
 * - 1 day before: urgent
 * - On the day: critical
 * - Overdue: escalation to admin
 */

import { Job } from 'bull';
import { query } from '../../config/database';
import { registerJob, forEachTenant, SchedulerJobData } from '../scheduler.service';
import { EmailQueueService } from '../email-queue.service';

registerJob({
  name: 'COMPLIANCE_ALERTS',
  cron: '30 7 * * 1-5', // Mon-Fri 07:30
  description: 'SARS & regulatory deadline alerts',
  enabled: true,
  handler: runComplianceAlerts,
});

interface DeadlineRow {
  deadline_type: string;
  description: string;
  frequency: string;
  due_day_of_month: number;
  due_month: number | null;
}

function computeNextDueDate(d: DeadlineRow): Date | null {
  const now = new Date();
  const freq = (d.frequency || '').toLowerCase();
  const day = d.due_day_of_month || 1;

  if (freq === 'monthly') {
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), day);
    if (thisMonth >= now) return thisMonth;
    return new Date(now.getFullYear(), now.getMonth() + 1, day);
  }
  if (freq === 'bi-monthly' || freq === 'bimonthly') {
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), day);
    if (thisMonth >= now && now.getMonth() % 2 === ((d.due_month || 1) - 1) % 2) return thisMonth;
    const nextMonth = now.getMonth() + (now.getMonth() % 2 === 0 ? 1 : 2);
    return new Date(now.getFullYear(), nextMonth, day);
  }
  if (freq === 'annual' || freq === 'annually') {
    const month = (d.due_month || 1) - 1;
    const thisYear = new Date(now.getFullYear(), month, day);
    if (thisYear >= now) return thisYear;
    return new Date(now.getFullYear() + 1, month, day);
  }
  return null;
}

async function runComplianceAlerts(job: Job<SchedulerJobData>) {
  const stats = { alertsSent: 0 };

  await forEachTenant(async (tenantId) => {
    // Get active deadlines from SARS calendar
    const deadlines = await query(
      `SELECT deadline_type, description, frequency, due_day_of_month, due_month
       FROM sars_deadline_calendar
       WHERE is_active = true`,
      []
    );

    if (deadlines.rows.length === 0) return;

    // Get compliance-responsible users
    const recipients = await query(
      `SELECT email, first_name, role FROM users
       WHERE tenant_id = $1
         AND role IN ('admin', 'director', 'accountant', 'compliance_officer', 'hr_manager')
         AND is_active = true AND email IS NOT NULL`,
      [tenantId]
    );

    if (recipients.rows.length === 0) return;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    for (const deadline of deadlines.rows as DeadlineRow[]) {
      const dueDate = computeNextDueDate(deadline);
      if (!dueDate) continue;

      const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / 86400000);

      // only alert at specific intervals
      let urgency: string | null = null;
      let emoji = '';

      if (daysUntil < 0 && daysUntil >= -7) {
        urgency = 'OVERDUE';
        emoji = '🚨';
      } else if (daysUntil === 0) {
        urgency = 'DUE TODAY';
        emoji = '🔴';
      } else if (daysUntil === 1) {
        urgency = 'DUE TOMORROW';
        emoji = '🟠';
      } else if (daysUntil === 3) {
        urgency = '3 DAYS';
        emoji = '🟡';
      } else if (daysUntil === 7) {
        urgency = '7 DAYS';
        emoji = '🔵';
      }

      if (!urgency) continue;

      const priority = daysUntil <= 1 ? 'high' : 'normal';

      for (const user of recipients.rows) {
        const queueFn = priority === 'high'
          ? EmailQueueService.queueHighPriority.bind(EmailQueueService)
          : EmailQueueService.queueNormalPriority.bind(EmailQueueService);

        const subj = `${urgency}: ${deadline.deadline_type} — ${deadline.description}`;
        await queueFn({
          to: user.email,
          subject: subj,
          template: 'system-notification',
          variables: {
            subject: subj,
            body: `
              <p>Hi ${user.first_name || 'Team'},</p>
              <p style="font-size: 16px; font-weight: bold; color: ${daysUntil <= 0 ? '#e74c3c' : daysUntil <= 3 ? '#f39c12' : '#3498db'}">
                ${deadline.deadline_type}: ${deadline.description}
              </p>
              <p>
                <strong>Due:</strong> ${dueDate.toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}<br>
                <strong>Status:</strong> ${urgency}
                ${daysUntil < 0 ? `<br><span style="color: #e74c3c; font-weight: bold">This deadline is ${Math.abs(daysUntil)} day(s) overdue!</span>` : ''}
              </p>
              <p><a class="cta" href="${process.env.FRONTEND_URL || 'https://siyabusaerp.co.za'}/app/compliance/regulatory-hub">
                View Compliance Hub →
              </a></p>
            `,
          },
        });
        stats.alertsSent++;
      }
    }
  });

  return stats;
}

export default runComplianceAlerts;
