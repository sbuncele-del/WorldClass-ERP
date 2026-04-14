/**
 * Siyabusa Financial Reporting Platform - Trial Balance Service
 * Manages working trial balance: import, link accounts, compute balances
 */

import pool from '../../../config/database';
import {
  AccountLink,
  TrialBalanceRow,
  TrialBalanceSummary,
  AccountCategory,
  ImportSource,
  ImportHistory,
} from '../types';

export class TrialBalanceService {
  /**
   * Get full working trial balance for an engagement
   */
  static async getTrialBalance(
    tenantId: string,
    engagementId: string
  ): Promise<{ rows: TrialBalanceRow[]; summary: TrialBalanceSummary }> {
    const result = await pool.query(
      `SELECT al.*, 
              lm.description as link_description_resolved,
              lm.statement,
              lm.section
       FROM reporting.account_links al
       LEFT JOIN reporting.link_mappings lm 
         ON al.link_number = lm.link_number 
         AND lm.framework = (
           SELECT reporting_framework FROM reporting.engagements WHERE id = $2 AND tenant_id = $1
         )
       WHERE al.engagement_id = $2 AND al.tenant_id = $1
       ORDER BY al.sort_order, al.account_code`,
      [tenantId, engagementId]
    );

    const rows: TrialBalanceRow[] = result.rows.map(row => {
      const opening = parseFloat(row.opening_balance) || 0;
      const transactions = parseFloat(row.transactions) || 0;
      const adjustments = parseFloat(row.adjustments) || 0;
      const computedClosing = opening + transactions + adjustments;
      const priorYear = parseFloat(row.prior_year_balance) || 0;

      return {
        ...row,
        opening_balance: opening,
        transactions,
        adjustments,
        closing_balance: parseFloat(row.closing_balance) || computedClosing,
        prior_year_balance: priorYear,
        computed_closing: computedClosing,
        variance: computedClosing - priorYear,
      };
    });

    // Compute summary
    let totalDebits = 0;
    let totalCredits = 0;
    let linkedCount = 0;

    for (const row of rows) {
      if (row.computed_closing >= 0) {
        totalDebits += row.computed_closing;
      } else {
        totalCredits += Math.abs(row.computed_closing);
      }
      if (row.is_linked) linkedCount++;
    }

    const summary: TrialBalanceSummary = {
      total_debits: totalDebits,
      total_credits: totalCredits,
      is_balanced: Math.abs(totalDebits - totalCredits) < 0.01,
      difference: totalDebits - totalCredits,
      account_count: rows.length,
      linked_count: linkedCount,
      unlinked_count: rows.length - linkedCount,
    };

    return { rows, summary };
  }

  /**
   * Add/update a single account in the trial balance
   */
  static async upsertAccount(
    tenantId: string,
    engagementId: string,
    data: Partial<AccountLink>
  ): Promise<AccountLink> {
    const result = await pool.query(
      `INSERT INTO reporting.account_links (
        tenant_id, engagement_id, account_code, account_name,
        link_number, link_description, category, fs_type,
        lead_schedule, lead_schedule_sub, wp_ref,
        opening_balance, transactions, adjustments, closing_balance, prior_year_balance,
        is_active, is_linked, sort_order
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      ON CONFLICT (engagement_id, account_code)
      DO UPDATE SET
        account_name = EXCLUDED.account_name,
        link_number = COALESCE(EXCLUDED.link_number, reporting.account_links.link_number),
        link_description = COALESCE(EXCLUDED.link_description, reporting.account_links.link_description),
        category = COALESCE(EXCLUDED.category, reporting.account_links.category),
        fs_type = COALESCE(EXCLUDED.fs_type, reporting.account_links.fs_type),
        lead_schedule = COALESCE(EXCLUDED.lead_schedule, reporting.account_links.lead_schedule),
        lead_schedule_sub = COALESCE(EXCLUDED.lead_schedule_sub, reporting.account_links.lead_schedule_sub),
        wp_ref = COALESCE(EXCLUDED.wp_ref, reporting.account_links.wp_ref),
        opening_balance = EXCLUDED.opening_balance,
        transactions = EXCLUDED.transactions,
        adjustments = EXCLUDED.adjustments,
        closing_balance = EXCLUDED.closing_balance,
        prior_year_balance = EXCLUDED.prior_year_balance,
        is_active = EXCLUDED.is_active,
        is_linked = EXCLUDED.is_linked,
        updated_at = NOW()
      RETURNING *`,
      [
        tenantId, engagementId,
        data.account_code, data.account_name,
        data.link_number || null,
        data.link_description || null,
        data.category || 'expenses',
        data.fs_type || 'income_statement',
        data.lead_schedule || null,
        data.lead_schedule_sub || null,
        data.wp_ref || null,
        data.opening_balance || 0,
        data.transactions || 0,
        data.adjustments || 0,
        data.closing_balance || (data.opening_balance || 0) + (data.transactions || 0) + (data.adjustments || 0),
        data.prior_year_balance || 0,
        data.is_active !== false,
        !!data.link_number,
        data.sort_order || 0,
      ]
    );

    return result.rows[0];
  }

  /**
   * Bulk import accounts from parsed data
   */
  static async bulkImport(
    tenantId: string,
    engagementId: string,
    accounts: Array<{
      account_code: string;
      account_name: string;
      opening_balance?: number;
      closing_balance?: number;
      prior_year_balance?: number;
      category?: AccountCategory;
    }>,
    source: ImportSource,
    userId?: string
  ): Promise<ImportHistory> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      let imported = 0;
      let matched = 0;
      let totalDebits = 0;
      let totalCredits = 0;

      for (const account of accounts) {
        const balance = account.closing_balance || 0;
        if (balance >= 0) totalDebits += balance;
        else totalCredits += Math.abs(balance);

        // Try to auto-link by matching known link descriptions
        let linkNumber: string | null = null;
        const linkResult = await client.query(
          `SELECT link_number FROM reporting.link_mappings 
           WHERE description ILIKE $1 
           AND framework = (SELECT reporting_framework FROM reporting.engagements WHERE id = $2 AND tenant_id = $3)
           LIMIT 1`,
          [`%${account.account_name}%`, engagementId, tenantId]
        );
        if (linkResult.rows[0]) {
          linkNumber = linkResult.rows[0].link_number;
          matched++;
        }

        // Infer category from account code ranges
        const category = account.category || this.inferCategory(account.account_code);
        const fsType = ['current_assets', 'non_current_assets', 'current_liabilities', 'non_current_liabilities', 'equity']
          .includes(category) ? 'balance_sheet' : 'income_statement';

        await client.query(
          `INSERT INTO reporting.account_links (
            tenant_id, engagement_id, account_code, account_name,
            link_number, category, fs_type,
            opening_balance, closing_balance, prior_year_balance,
            is_active, is_linked
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, $11)
          ON CONFLICT (engagement_id, account_code) DO UPDATE SET
            account_name = EXCLUDED.account_name,
            opening_balance = EXCLUDED.opening_balance,
            closing_balance = EXCLUDED.closing_balance,
            prior_year_balance = EXCLUDED.prior_year_balance,
            updated_at = NOW()`,
          [
            tenantId, engagementId,
            account.account_code, account.account_name,
            linkNumber, category, fsType,
            account.opening_balance || 0,
            account.closing_balance || 0,
            account.prior_year_balance || 0,
            !!linkNumber,
          ]
        );
        imported++;
      }

      // Record import history
      const historyResult = await client.query(
        `INSERT INTO reporting.import_history (
          tenant_id, engagement_id, source,
          accounts_imported, accounts_matched, accounts_unmatched,
          total_debits, total_credits, is_balanced,
          status, imported_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'completed', $10)
        RETURNING *`,
        [
          tenantId, engagementId, source,
          imported, matched, imported - matched,
          totalDebits, totalCredits, Math.abs(totalDebits - totalCredits) < 0.01,
          userId || null,
        ]
      );

      await client.query('COMMIT');
      return historyResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Link an account to a financial statement line item
   */
  static async linkAccount(
    tenantId: string,
    engagementId: string,
    accountCode: string,
    linkNumber: string
  ): Promise<AccountLink | null> {
    // Resolve link description from mappings
    const mappingResult = await pool.query(
      `SELECT description, statement, section FROM reporting.link_mappings 
       WHERE link_number = $1 
       AND framework = (SELECT reporting_framework FROM reporting.engagements WHERE id = $2 AND tenant_id = $3)`,
      [linkNumber, engagementId, tenantId]
    );

    const mapping = mappingResult.rows[0];

    const result = await pool.query(
      `UPDATE reporting.account_links 
       SET link_number = $4, 
           link_description = $5,
           is_linked = true,
           updated_at = NOW()
       WHERE engagement_id = $2 AND tenant_id = $1 AND account_code = $3
       RETURNING *`,
      [
        tenantId, engagementId, accountCode,
        linkNumber,
        mapping?.description || null,
      ]
    );

    return result.rows[0] || null;
  }

  /**
   * Unlink an account
   */
  static async unlinkAccount(
    tenantId: string,
    engagementId: string,
    accountCode: string
  ): Promise<boolean> {
    const result = await pool.query(
      `UPDATE reporting.account_links 
       SET link_number = NULL, link_description = NULL, is_linked = false, updated_at = NOW()
       WHERE engagement_id = $2 AND tenant_id = $1 AND account_code = $3
       RETURNING id`,
      [tenantId, engagementId, accountCode]
    );
    return result.rowCount > 0;
  }

  /**
   * Auto-link all unlinked accounts using smart matching
   */
  static async autoLink(tenantId: string, engagementId: string): Promise<{ matched: number; total: number }> {
    const unlinked = await pool.query(
      `SELECT id, account_code, account_name FROM reporting.account_links
       WHERE engagement_id = $2 AND tenant_id = $1 AND is_linked = false`,
      [tenantId, engagementId]
    );

    let matched = 0;
    const framework = await pool.query(
      `SELECT reporting_framework FROM reporting.engagements WHERE id = $1 AND tenant_id = $2`,
      [engagementId, tenantId]
    );
    const fw = framework.rows[0]?.reporting_framework || 'ifrs_sme';

    for (const account of unlinked.rows) {
      // Strategy 1: Exact name match
      let link = await pool.query(
        `SELECT link_number, description FROM reporting.link_mappings 
         WHERE framework = $1 AND LOWER(description) = LOWER($2)`,
        [fw, account.account_name]
      );

      // Strategy 2: Fuzzy match
      if (!link.rows[0]) {
        link = await pool.query(
          `SELECT link_number, description FROM reporting.link_mappings 
           WHERE framework = $1 AND description ILIKE $2
           ORDER BY LENGTH(description) ASC LIMIT 1`,
          [fw, `%${account.account_name}%`]
        );
      }

      if (link.rows[0]) {
        await pool.query(
          `UPDATE reporting.account_links 
           SET link_number = $3, link_description = $4, is_linked = true, updated_at = NOW()
           WHERE id = $1 AND tenant_id = $5`,
          [account.id, tenantId, link.rows[0].link_number, link.rows[0].description, tenantId]
        );
        matched++;
      }
    }

    return { matched, total: unlinked.rows.length };
  }

  /**
   * Update adjustments for an account (from adjusting entries)
   */
  static async recalculateAdjustments(tenantId: string, engagementId: string): Promise<void> {
    await pool.query(
      `UPDATE reporting.account_links al
       SET adjustments = COALESCE((
         SELECT SUM(ael.debit_amount - ael.credit_amount)
         FROM reporting.adjusting_entry_lines ael
         JOIN reporting.adjusting_entries ae ON ael.entry_id = ae.id
         WHERE ael.account_code = al.account_code
           AND ael.engagement_id = al.engagement_id
           AND ae.status = 'posted'
           AND ae.tenant_id = al.tenant_id
       ), 0),
       closing_balance = al.opening_balance + al.transactions + COALESCE((
         SELECT SUM(ael.debit_amount - ael.credit_amount)
         FROM reporting.adjusting_entry_lines ael
         JOIN reporting.adjusting_entries ae ON ael.entry_id = ae.id
         WHERE ael.account_code = al.account_code
           AND ael.engagement_id = al.engagement_id
           AND ae.status = 'posted'
           AND ae.tenant_id = al.tenant_id
       ), 0),
       updated_at = NOW()
       WHERE al.engagement_id = $1 AND al.tenant_id = $2`,
      [engagementId, tenantId]
    );
  }

  /**
   * Get available link numbers for the smart linking dropdown
   */
  static async getAvailableLinks(
    tenantId: string,
    engagementId: string,
    search?: string
  ): Promise<Array<{ link_number: string; description: string; statement: string; section: string }>> {
    let query = `
      SELECT link_number, description, statement, section
      FROM reporting.link_mappings
      WHERE framework = (SELECT reporting_framework FROM reporting.engagements WHERE id = $1 AND tenant_id = $2)
    `;
    const params: unknown[] = [engagementId, tenantId];

    if (search) {
      query += ` AND (link_number ILIKE $3 OR description ILIKE $3)`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY sort_order`;

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Import from Siyabusa ERP General Ledger (internal integration)
   */
  static async importFromGL(tenantId: string, engagementId: string, userId?: string): Promise<ImportHistory> {
    // Fetch account balances from the main ERP GL
    const engagement = await pool.query(
      `SELECT financial_year_start, financial_year_end FROM reporting.engagements WHERE id = $1 AND tenant_id = $2`,
      [engagementId, tenantId]
    );

    if (!engagement.rows[0]) throw new Error('Engagement not found');
    const { financial_year_start, financial_year_end } = engagement.rows[0];

    // Pull from the main accounting schema
    const glResult = await pool.query(
      `SELECT 
        coa.account_code,
        coa.account_name,
        COALESCE(SUM(
          CASE WHEN je.journal_date < $3 THEN jel.debit_amount - jel.credit_amount ELSE 0 END
        ), 0) as opening_balance,
        COALESCE(SUM(
          CASE WHEN je.journal_date BETWEEN $3 AND $4 THEN jel.debit_amount - jel.credit_amount ELSE 0 END
        ), 0) as period_movement,
        COALESCE(SUM(jel.debit_amount - jel.credit_amount), 0) as closing_balance
      FROM accounting.chart_of_accounts coa
      LEFT JOIN accounting.journal_entry_lines jel ON coa.account_code = jel.account_code AND jel.tenant_id = $1
      LEFT JOIN accounting.journal_entries je ON jel.journal_entry_id = je.entry_id AND je.tenant_id = $1
        AND je.is_posted = true
      WHERE coa.tenant_id = $1 AND coa.is_active = true
      GROUP BY coa.account_code, coa.account_name
      HAVING COALESCE(SUM(jel.debit_amount - jel.credit_amount), 0) != 0
      ORDER BY coa.account_code`,
      [tenantId, tenantId, financial_year_start, financial_year_end]
    );

    const accounts = glResult.rows.map(row => ({
      account_code: row.account_code,
      account_name: row.account_name,
      opening_balance: parseFloat(row.opening_balance) || 0,
      closing_balance: parseFloat(row.closing_balance) || 0,
    }));

    return this.bulkImport(tenantId, engagementId, accounts, 'siyabusa_gl', userId);
  }

  // ------------------------------------------------------------------
  // PRIVATE HELPERS
  // ------------------------------------------------------------------

  private static inferCategory(accountCode: string): AccountCategory {
    const code = parseInt(accountCode.replace(/\D/g, ''), 10);
    if (isNaN(code)) return 'expenses';

    // Standard SA account code ranges
    if (code >= 1000 && code < 2000) return 'non_current_assets';
    if (code >= 2000 && code < 3000) return 'current_assets';
    if (code >= 3000 && code < 4000) return 'equity';
    if (code >= 4000 && code < 5000) return 'revenue';
    if (code >= 5000 && code < 6000) return 'cost_of_sales';
    if (code >= 6000 && code < 7000) return 'expenses';
    if (code >= 7000 && code < 8000) return 'other_income';
    if (code >= 8000 && code < 9000) return 'current_liabilities';
    if (code >= 9000) return 'non_current_liabilities';
    return 'expenses';
  }
}
