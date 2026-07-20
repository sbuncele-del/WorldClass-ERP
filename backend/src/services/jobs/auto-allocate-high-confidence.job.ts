/**
 * Auto-Allocate High-Confidence Bank Transactions
 *
 * Runs hourly: for every tenant, categorizes unmatched bank statement lines
 * (Groq -> Claude cascade, falling back to keyword rules) and automatically
 * posts a journal entry for anything the categorizer is >=90% confident
 * about. Everything below that threshold is left as an AI suggestion for
 * manual review in Banking Hub - this only auto-posts the near-certain
 * matches, not everything, since a wrong auto-posted journal entry is a
 * real bookkeeping problem, not just noise.
 */

import { Job } from 'bull';
import { query } from '../../config/database';
import { registerJob, forEachTenant, SchedulerJobData } from '../scheduler.service';
import { categorizeTransactions } from '../../modules/cash-management/services/bank-categorization.service';
import { allocateStatementLineToGL } from '../../modules/cash-management/services/bank-allocation.service';
import { EmailQueueService } from '../email-queue.service';

const AUTO_ALLOCATE_CONFIDENCE_THRESHOLD = 90;
const CATEGORIZE_BATCH_SIZE = 40;
const MAX_LINES_PER_TENANT_PER_RUN = 400; // bound cost/runtime per hourly run

registerJob({
  name: 'AUTO_ALLOCATE_HIGH_CONFIDENCE',
  cron: '0 * * * *', // every hour, on the hour
  description: 'Auto-post bank transactions to GL when AI confidence is 90%+',
  enabled: true,
  handler: runAutoAllocateHighConfidence,
});

async function runAutoAllocateHighConfidence(_job: Job<SchedulerJobData>) {
  const stats = { totalAllocated: 0, totalReviewed: 0 };

  await forEachTenant(async (tenantId) => {
    const linesResult = await query(
      `SELECT l.line_id as line_id, l.description,
              COALESCE(l.credit_amount, 0) - COALESCE(l.debit_amount, 0) as amount,
              l.transaction_date, l.reference,
              CASE WHEN COALESCE(l.debit_amount, 0) > 0 THEN true ELSE false END as is_debit
       FROM cash_bank_statement_lines l
       JOIN cash_bank_statements s ON l.statement_id = s.statement_id
       WHERE s.tenant_id = $1 AND l.is_matched = false
       ORDER BY l.transaction_date DESC
       LIMIT $2`,
      [tenantId, MAX_LINES_PER_TENANT_PER_RUN]
    );

    const lines = linesResult.rows;
    if (lines.length === 0) return;

    let tenantAllocated = 0;
    let tenantReviewed = 0;

    for (let i = 0; i < lines.length; i += CATEGORIZE_BATCH_SIZE) {
      const batch = lines.slice(i, i + CATEGORIZE_BATCH_SIZE);
      try {
        const { suggestions } = await categorizeTransactions(tenantId, batch);
        tenantReviewed += suggestions.length;

        for (const s of suggestions) {
          if (!s.suggested_account_id || s.confidence < AUTO_ALLOCATE_CONFIDENCE_THRESHOLD) continue;

          const result = await allocateStatementLineToGL(
            tenantId,
            undefined, // system-triggered, not a specific user
            s.line_id,
            s.suggested_account_id,
            undefined
          );
          if (result.ok) {
            tenantAllocated++;
          } else {
            console.warn(`  [AUTO_ALLOCATE_HIGH_CONFIDENCE] line ${s.line_id} failed:`, result.error);
          }
        }
      } catch (err) {
        console.error(`  [AUTO_ALLOCATE_HIGH_CONFIDENCE] batch error (tenant ${tenantId}):`, (err as Error).message);
      }
    }

    stats.totalAllocated += tenantAllocated;
    stats.totalReviewed += tenantReviewed;

    if (tenantAllocated === 0) return;

    const admins = await query(
      `SELECT email, first_name FROM users
       WHERE tenant_id = $1 AND role IN ('admin', 'accountant', 'director') AND is_active = true AND email IS NOT NULL`,
      [tenantId]
    );

    for (const admin of admins.rows) {
      await EmailQueueService.queueLowPriority({
        to: admin.email,
        subject: `Auto-Allocation: ${tenantAllocated} bank transactions posted to GL`,
        template: 'system-notification',
        variables: {
          subject: `Auto-Allocation: ${tenantAllocated} bank transactions posted to GL`,
          body: `
            <p>Hi ${admin.first_name || 'Team'},</p>
            <p>The hourly auto-allocation job just ran on your bank feed:</p>
            <ul>
              <li><strong>${tenantAllocated}</strong> transactions auto-posted to the general ledger (AI confidence ${AUTO_ALLOCATE_CONFIDENCE_THRESHOLD}%+)</li>
              <li><strong>${Math.max(0, tenantReviewed - tenantAllocated)}</strong> left for your review (below the confidence threshold)</li>
            </ul>
            <p><a class="cta" href="${process.env.FRONTEND_URL || 'https://siyabusaerp.co.za'}/app/banking-hub">
              Review Bank Reconciliation →
            </a></p>
          `,
        },
      });
    }
  });

  return stats;
}

export default runAutoAllocateHighConfidence;
