/**
 * Approval Escalation Job
 *
 * - Detects stale approvals exceeding the level's escalation_hours
 * - Sends reminders to current approver
 * - Escalates to next level if timer expired
 * - Notifies the submitter that their item is being escalated
 */

import { Job } from 'bull';
import { query } from '../../config/database';
import { registerJob, forEachTenant, SchedulerJobData } from '../scheduler.service';
import { EmailQueueService } from '../email-queue.service';

registerJob({
  name: 'APPROVAL_ESCALATION',
  cron: '0 9 * * 1-5', // Mon-Fri 09:00
  description: 'Escalate stale approvals & send reminders',
  enabled: true,
  handler: runApprovalEscalation,
});

async function runApprovalEscalation(job: Job<SchedulerJobData>) {
  const stats = { reminded: 0, escalated: 0 };

  await forEachTenant(async (tenantId) => {
    // Find pending approvals that have exceeded escalation_hours
    const staleApprovals = await query(
      `SELECT je.id AS journal_entry_id, je.entry_number, je.description, je.total_amount,
              je.submitted_for_approval_at, je.current_approval_level,
              al.level_name, al.escalation_hours, al.role_required,
              w.name AS workflow_name,
              submitter.email AS submitter_email, submitter.first_name AS submitter_name
       FROM journal_entries je
       JOIN approval_workflows w ON je.workflow_id = w.id
       JOIN approval_levels al ON al.workflow_id = w.id AND al.level_number = je.current_approval_level
       LEFT JOIN users submitter ON je.created_by::text = submitter.id::text AND je.tenant_id = submitter.tenant_id
       WHERE je.tenant_id = $1
         AND je.approval_status = 'pending'
         AND je.submitted_for_approval_at IS NOT NULL
         AND je.submitted_for_approval_at < NOW() - (COALESCE(al.escalation_hours, 48) || ' hours')::INTERVAL`,
      [tenantId]
    );

    for (const entry of staleApprovals.rows) {
      const hoursStale = Math.round(
        (Date.now() - new Date(entry.submitted_for_approval_at).getTime()) / 3600000
      );

      // Check if there's a next level to escalate to
      const nextLevel = await query(
        `SELECT al.level_number, al.level_name, al.role_required
         FROM approval_levels al
         JOIN approval_workflows w ON al.workflow_id = w.id
         WHERE w.id = (SELECT workflow_id FROM journal_entries WHERE id = $1 AND tenant_id = $2)
           AND al.level_number = $3`,
        [entry.journal_entry_id, tenantId, (entry.current_approval_level || 1) + 1]
      );

      if (nextLevel.rows.length > 0) {
        // Escalate to next level
        await query(
          `UPDATE journal_entries SET current_approval_level = $3, updated_at = NOW()
           WHERE id = $1 AND tenant_id = $2`,
          [entry.journal_entry_id, tenantId, nextLevel.rows[0].level_number]
        );

        // Record escalation in history
        await query(
          `INSERT INTO approval_history (journal_entry_id, workflow_id, level_id, action, notes, performed_by, tenant_id, created_at)
           SELECT $1, je.workflow_id, al.id, 'ESCALATED',
                  $4, 'SYSTEM', $2, NOW()
           FROM journal_entries je
           JOIN approval_levels al ON al.workflow_id = je.workflow_id AND al.level_number = $3
           WHERE je.id = $1 AND je.tenant_id = $2`,
          [entry.journal_entry_id, tenantId, nextLevel.rows[0].level_number,
           `Auto-escalated after ${hoursStale}h (limit: ${entry.escalation_hours}h)`]
        );

        // Notify next-level approvers
        const nextApprovers = await query(
          `SELECT email, first_name FROM users
           WHERE tenant_id = $1 AND role = $2 AND is_active = true AND email IS NOT NULL`,
          [tenantId, nextLevel.rows[0].role_required]
        );

        for (const approver of nextApprovers.rows) {
          const subj = `Escalated Approval: ${entry.entry_number || 'Journal Entry'} — R${Number(entry.total_amount || 0).toLocaleString()}`;
          await EmailQueueService.queueHighPriority({
            to: approver.email,
            subject: subj,
            template: 'system-notification',
            variables: {
              subject: subj,
              body: `
                <p>Hi ${approver.first_name || 'Approver'},</p>
                <p>The following entry has been <strong>escalated to you</strong> after waiting ${hoursStale} hours at the <em>${entry.level_name}</em> level:</p>
                <table>
                  <tr><td style="padding: 4px 12px 4px 0; color: #666">Entry:</td><td><strong>${entry.entry_number || entry.journal_entry_id}</strong></td></tr>
                  <tr><td style="padding: 4px 12px 4px 0; color: #666">Amount:</td><td>R${Number(entry.total_amount || 0).toLocaleString()}</td></tr>
                  <tr><td style="padding: 4px 12px 4px 0; color: #666">Description:</td><td>${entry.description || '—'}</td></tr>
                  <tr><td style="padding: 4px 12px 4px 0; color: #666">Workflow:</td><td>${entry.workflow_name}</td></tr>
                  <tr><td style="padding: 4px 12px 4px 0; color: #666">Now at:</td><td>${nextLevel.rows[0].level_name} (Level ${nextLevel.rows[0].level_number})</td></tr>
                </table>
                <p><a class="cta" href="${process.env.FRONTEND_URL || 'https://siyabusaerp.co.za'}/app/approvals">
                  Review & Approve →
                </a></p>
              `,
            },
          });
        }

        // Notify submitter of escalation
        if (entry.submitter_email) {
          const subj2 = `Your submission ${entry.entry_number} has been escalated`;
          await EmailQueueService.queueNormalPriority({
            to: entry.submitter_email,
            subject: subj2,
            template: 'system-notification',
            variables: {
              subject: subj2,
              body: `
                <p>Hi ${entry.submitter_name || 'Team'},</p>
                <p>Your entry <strong>${entry.entry_number}</strong> has been automatically escalated from
                  <em>${entry.level_name}</em> to <em>${nextLevel.rows[0].level_name}</em> after ${hoursStale} hours without action.</p>
                <p>No action is required from you — the escalated approver has been notified.</p>
              `,
            },
          });
        }

        stats.escalated++;
      } else {
        // No next level — just send reminder to current approvers
        const approvers = await query(
          `SELECT email, first_name FROM users
           WHERE tenant_id = $1 AND role = $2 AND is_active = true AND email IS NOT NULL`,
          [tenantId, entry.role_required]
        );

        for (const approver of approvers.rows) {
          const subj3 = `Reminder: Approval pending ${hoursStale}h — ${entry.entry_number}`;
          await EmailQueueService.queueNormalPriority({
            to: approver.email,
            subject: subj3,
            template: 'system-notification',
            variables: {
              subject: subj3,
              body: `
                <p>Hi ${approver.first_name || 'Approver'},</p>
                <p>A journal entry is waiting for your approval for <strong>${hoursStale} hours</strong>:</p>
                <ul>
                  <li><strong>Entry:</strong> ${entry.entry_number || entry.journal_entry_id}</li>
                  <li><strong>Amount:</strong> R${Number(entry.total_amount || 0).toLocaleString()}</li>
                  <li><strong>Description:</strong> ${entry.description || '—'}</li>
                </ul>
                <p><a class="cta" href="${process.env.FRONTEND_URL || 'https://siyabusaerp.co.za'}/app/approvals">Review →</a></p>
              `,
            },
          });
        }

        stats.reminded++;
      }
    }
  });

  return stats;
}

export default runApprovalEscalation;
