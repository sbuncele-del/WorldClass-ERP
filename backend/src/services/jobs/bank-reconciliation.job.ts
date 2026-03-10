/**
 * Bank Reconciliation Job
 *
 * Runs auto-matching on all unreconciled bank statements
 * using the existing MatchingService (exact match + rule-based)
 */

import { Job } from 'bull';
import { query } from '../../config/database';
import { registerJob, forEachTenant, SchedulerJobData } from '../scheduler.service';
import { EmailQueueService } from '../email-queue.service';

registerJob({
  name: 'BANK_RECONCILIATION',
  cron: '0 7 * * 1-5', // Mon-Fri 07:00
  description: 'Auto-match unreconciled bank statement lines',
  enabled: true,
  handler: runBankReconciliation,
});

async function runBankReconciliation(job: Job<SchedulerJobData>) {
  const stats = { totalMatched: 0, totalSuggestions: 0 };

  await forEachTenant(async (tenantId) => {
    // Find open statements with unmatched lines
    const openStatements = await query(
      `SELECT DISTINCT s.statement_id, s.statement_number, ba.account_name
       FROM cash_bank_statements s
       JOIN cash_bank_accounts ba ON s.bank_account_id = ba.account_id AND s.tenant_id = ba.tenant_id
       JOIN cash_bank_statement_lines sl ON s.statement_id = sl.statement_id AND s.tenant_id = sl.tenant_id
       WHERE s.tenant_id = $1
         AND s.status IN ('imported', 'in_progress')
         AND sl.is_matched = false`,
      [tenantId]
    );

    if (openStatements.rows.length === 0) return;

    let tenantMatched = 0;
    let tenantSuggestions = 0;

    for (const stmt of openStatements.rows) {
      try {
        // Get unmatched lines per statement
        const unmatchedLines = await query(
          `SELECT line_id, amount, transaction_date, description, reference
           FROM cash_bank_statement_lines
           WHERE statement_id = $1 AND tenant_id = $2 AND is_matched = false`,
          [stmt.statement_id, tenantId]
        );

        for (const line of unmatchedLines.rows) {
          // Try exact match: same amount, date within 3 days, matching reference
          const exactMatch = await query(
            `SELECT transaction_id, amount, transaction_date, reference, description
             FROM cash_transactions
             WHERE tenant_id = $1
               AND is_reconciled = false
               AND ABS(amount - $2) < 0.01
               AND transaction_date BETWEEN $3::date - INTERVAL '3 days' AND $3::date + INTERVAL '3 days'
             ORDER BY ABS(EXTRACT(EPOCH FROM (transaction_date - $3::date))) ASC
             LIMIT 1`,
            [tenantId, line.amount, line.transaction_date]
          );

          if (exactMatch.rows.length > 0) {
            const match = exactMatch.rows[0];
            await query(
              `INSERT INTO bank_reconciliation_matches (
                 tenant_id, statement_line_id, transaction_id,
                 match_type, confidence, matched_at
               ) VALUES ($1, $2, $3, 'auto_exact', 100, NOW())
               ON CONFLICT DO NOTHING`,
              [tenantId, line.line_id, match.transaction_id]
            );
            await query(
              `UPDATE cash_bank_statement_lines SET is_matched = true, matched_transaction_id = $3, updated_at = NOW()
               WHERE line_id = $1 AND tenant_id = $2`,
              [line.line_id, tenantId, match.transaction_id]
            );
            await query(
              `UPDATE cash_transactions SET is_reconciled = true, updated_at = NOW()
               WHERE transaction_id = $1 AND tenant_id = $2`,
              [match.transaction_id, tenantId]
            );
            tenantMatched++;
          } else {
            // Try fuzzy match: same amount, wider date window
            const fuzzyMatch = await query(
              `SELECT transaction_id, amount, description
               FROM cash_transactions
               WHERE tenant_id = $1
                 AND is_reconciled = false
                 AND ABS(amount - $2) < 0.01
               ORDER BY transaction_date DESC
               LIMIT 3`,
              [tenantId, line.amount]
            );
            if (fuzzyMatch.rows.length > 0) {
              for (const suggestion of fuzzyMatch.rows) {
                await query(
                  `INSERT INTO bank_reconciliation_matches (
                     tenant_id, statement_line_id, transaction_id,
                     match_type, confidence, matched_at
                   ) VALUES ($1, $2, $3, 'auto_suggestion', 60, NOW())
                   ON CONFLICT DO NOTHING`,
                  [tenantId, line.line_id, suggestion.transaction_id]
                );
              }
              tenantSuggestions += fuzzyMatch.rows.length;
            }
          }
        }
      } catch (err) {
        console.error(`  Auto-match error (statement ${stmt.statement_id}):`, err);
      }
    }

    stats.totalMatched += tenantMatched;
    stats.totalSuggestions += tenantSuggestions;

    // Notify finance team of results
    if (tenantMatched > 0 || tenantSuggestions > 0) {
      const admins = await query(
        `SELECT email, first_name FROM users
         WHERE tenant_id = $1 AND role IN ('admin', 'accountant', 'director') AND is_active = true AND email IS NOT NULL`,
        [tenantId]
      );

      for (const admin of admins.rows) {
        await EmailQueueService.queueLowPriority({
          to: admin.email,
          subject: `Bank Reconciliation: ${tenantMatched} auto-matched, ${tenantSuggestions} suggestions`,
          template: 'system-notification',
          variables: {
            subject: `Bank Reconciliation: ${tenantMatched} auto-matched, ${tenantSuggestions} suggestions`,
            body: `
              <p>Hi ${admin.first_name || 'Team'},</p>
              <p>The overnight bank reconciliation job completed:</p>
              <ul>
                <li><strong>${tenantMatched}</strong> transactions auto-matched with high confidence</li>
                <li><strong>${tenantSuggestions}</strong> suggestions for your review</li>
              </ul>
              <p><a class="cta" href="${process.env.FRONTEND_URL || 'https://siyabusaerp.co.za'}/app/cash-management/reconciliation">
                Review Matches →
              </a></p>
            `,
          },
        });
      }
    }
  });

  return stats;
}

export default runBankReconciliation;
