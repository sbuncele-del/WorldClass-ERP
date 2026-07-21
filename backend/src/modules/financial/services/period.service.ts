/**
 * Period Management Service
 * Business logic for fiscal years and accounting periods
 *
 * NOTE: This service works with production tables:
 *   - fiscal_years (with fiscal_year_id as primary key)
 *   - fiscal_periods (with period_id as primary key)
 *
 * Every method here takes tenantId explicitly and every query is scoped by
 * it. This wasn't always true - the service originally had zero tenant
 * scoping anywhere (reads returned every tenant's data, and
 * setCurrentFiscalYear/setCurrentPeriod reset the "current" flag across
 * ALL tenants whenever any one tenant set theirs). Both tables were empty
 * at the time of this rewrite, so there was no data to migrate.
 */

import { query } from '../../../config/database';
import {
  FiscalYear,
  AccountingPeriod,
  CreateFiscalYearDTO,
  CreatePeriodDTO,
  FiscalYearWithPeriods,
  PeriodSummary,
  PeriodValidation,
  PeriodStatus
} from '../models/period.model';

export class PeriodService {

  // ===== FISCAL YEARS =====

  async getAllFiscalYears(tenantId: string): Promise<FiscalYear[]> {
    const sql = `
      SELECT
        fiscal_year_id as id,
        tenant_id,
        year_code,
        year_name,
        start_date,
        end_date,
        status,
        is_current,
        created_by,
        created_at
      FROM fiscal_years
      WHERE tenant_id = $1
      ORDER BY start_date DESC
    `;
    const result = await query(sql, [tenantId]);
    return result.rows;
  }

  async getFiscalYearById(tenantId: string, id: string): Promise<FiscalYear | null> {
    const sql = `
      SELECT
        fiscal_year_id as id,
        tenant_id,
        year_code,
        year_name,
        start_date,
        end_date,
        status,
        is_current,
        created_by,
        created_at
      FROM fiscal_years
      WHERE fiscal_year_id = $1 AND tenant_id = $2
    `;
    const result = await query(sql, [id, tenantId]);
    return result.rows[0] || null;
  }

  async getFiscalYearByCode(tenantId: string, code: string): Promise<FiscalYear | null> {
    const sql = `
      SELECT
        fiscal_year_id as id,
        tenant_id,
        year_code,
        year_name,
        start_date,
        end_date,
        status,
        is_current,
        created_by,
        created_at
      FROM fiscal_years
      WHERE year_code = $1 AND tenant_id = $2
    `;
    const result = await query(sql, [code, tenantId]);
    return result.rows[0] || null;
  }

  async getCurrentFiscalYear(tenantId: string): Promise<FiscalYear | null> {
    const sql = `
      SELECT
        fiscal_year_id as id,
        tenant_id,
        year_code,
        year_name,
        start_date,
        end_date,
        status,
        is_current,
        created_by,
        created_at
      FROM fiscal_years
      WHERE is_current = true AND tenant_id = $1
      LIMIT 1
    `;
    const result = await query(sql, [tenantId]);
    return result.rows[0] || null;
  }

  async createFiscalYear(tenantId: string, data: CreateFiscalYearDTO): Promise<string> {
    const sql = `
      INSERT INTO fiscal_years (
        tenant_id, year_code, year_name, start_date, end_date,
        status, is_current, created_by
      ) VALUES ($1, $2, $3, $4, $5, 'OPEN', false, $6)
      RETURNING fiscal_year_id as id
    `;

    const result = await query(sql, [
      tenantId,
      data.year_code,
      data.year_name,
      data.start_date,
      data.end_date,
      data.user_id
    ]);

    return result.rows[0].id;
  }

  async setCurrentFiscalYear(tenantId: string, year_id: string, _user_id: string): Promise<void> {
    await query('UPDATE fiscal_years SET is_current = false WHERE is_current = true AND tenant_id = $1', [tenantId]);
    await query('UPDATE fiscal_years SET is_current = true WHERE fiscal_year_id = $1 AND tenant_id = $2', [year_id, tenantId]);
  }

  async closeFiscalYear(tenantId: string, year_id: string, _user_id: string): Promise<void> {
    const openPeriodsCheck = await query(
      'SELECT COUNT(*) as count FROM fiscal_periods WHERE fiscal_year_id = $1 AND tenant_id = $2 AND status != $3',
      [year_id, tenantId, 'CLOSED']
    );

    if (parseInt(openPeriodsCheck.rows[0].count) > 0) {
      throw new Error('Cannot close fiscal year: some periods are still open');
    }

    await query('UPDATE fiscal_years SET status = \'CLOSED\' WHERE fiscal_year_id = $1 AND tenant_id = $2', [year_id, tenantId]);
  }

  // ===== ACCOUNTING PERIODS (using fiscal_periods table) =====

  async getAllPeriods(tenantId: string, fiscal_year_id?: string): Promise<AccountingPeriod[]> {
    let sql = `
      SELECT
        period_id as id,
        tenant_id,
        fiscal_year_id,
        period_number,
        period_code,
        period_name,
        start_date,
        end_date,
        status,
        is_current,
        closed_by,
        closed_at,
        created_at
      FROM fiscal_periods
      WHERE tenant_id = $1
    `;
    const params: string[] = [tenantId];

    if (fiscal_year_id) {
      sql += ' AND fiscal_year_id = $2';
      params.push(fiscal_year_id);
    }

    sql += ' ORDER BY period_number ASC';

    const result = await query(sql, params);
    return result.rows;
  }

  async getPeriodById(tenantId: string, id: string): Promise<AccountingPeriod | null> {
    const sql = `
      SELECT
        period_id as id,
        tenant_id,
        fiscal_year_id,
        period_number,
        period_code,
        period_name,
        start_date,
        end_date,
        status,
        is_current,
        closed_by,
        closed_at,
        created_at
      FROM fiscal_periods
      WHERE period_id = $1 AND tenant_id = $2
    `;
    const result = await query(sql, [id, tenantId]);
    return result.rows[0] || null;
  }

  async getPeriodByCode(tenantId: string, code: string): Promise<AccountingPeriod | null> {
    const sql = `
      SELECT
        period_id as id,
        tenant_id,
        fiscal_year_id,
        period_number,
        period_code,
        period_name,
        start_date,
        end_date,
        status,
        is_current,
        closed_by,
        closed_at,
        created_at
      FROM fiscal_periods
      WHERE period_code = $1 AND tenant_id = $2
    `;
    const result = await query(sql, [code, tenantId]);
    return result.rows[0] || null;
  }

  async getCurrentPeriod(tenantId: string): Promise<AccountingPeriod | null> {
    const sql = `
      SELECT
        period_id as id,
        tenant_id,
        fiscal_year_id,
        period_number,
        period_code,
        period_name,
        start_date,
        end_date,
        status,
        is_current,
        closed_by,
        closed_at,
        created_at
      FROM fiscal_periods
      WHERE is_current = true AND tenant_id = $1
      LIMIT 1
    `;
    const result = await query(sql, [tenantId]);
    return result.rows[0] || null;
  }

  async getOpenPeriods(tenantId: string, fiscal_year_id?: string): Promise<AccountingPeriod[]> {
    let sql = `
      SELECT
        period_id as id,
        tenant_id,
        fiscal_year_id,
        period_number,
        period_code,
        period_name,
        start_date,
        end_date,
        status,
        is_current,
        closed_by,
        closed_at,
        created_at
      FROM fiscal_periods
      WHERE status = $1 AND tenant_id = $2
    `;
    const params: (string | PeriodStatus)[] = ['OPEN', tenantId];

    if (fiscal_year_id) {
      sql += ' AND fiscal_year_id = $3';
      params.push(fiscal_year_id);
    }

    sql += ' ORDER BY period_number ASC';

    const result = await query(sql, params);
    return result.rows;
  }

  async createPeriod(tenantId: string, data: CreatePeriodDTO): Promise<string> {
    const sql = `
      INSERT INTO fiscal_periods (
        tenant_id, fiscal_year_id, period_number, period_code, period_name,
        start_date, end_date, status, is_current
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'OPEN', false)
      RETURNING period_id as id
    `;

    const result = await query(sql, [
      tenantId,
      data.fiscal_year_id,
      data.period_number,
      data.period_code,
      data.period_name,
      data.start_date,
      data.end_date
    ]);

    return result.rows[0].id;
  }

  async openPeriod(tenantId: string, period_id: string, _user_id: string): Promise<void> {
    const period = await this.getPeriodById(tenantId, period_id);
    if (!period) throw new Error('Period not found');
    if (period.status === 'LOCKED') throw new Error('Cannot open a locked period');
    if (period.status === 'OPEN') throw new Error('Period is already open');

    await query('UPDATE fiscal_periods SET status = \'OPEN\' WHERE period_id = $1 AND tenant_id = $2', [period_id, tenantId]);
  }

  async closePeriod(tenantId: string, period_id: string, user_id: string, force: boolean = false): Promise<void> {
    const period = await this.getPeriodById(tenantId, period_id);
    if (!period) throw new Error('Period not found');
    if (period.status === 'LOCKED') throw new Error('Cannot close a locked period');
    if (period.status === 'CLOSED') throw new Error('Period is already closed');

    if (!force) {
      const validation = await this.validatePeriodClose(tenantId, period_id);
      if (!validation.can_close) {
        throw new Error(`Cannot close period: ${validation.errors.join(', ')}`);
      }
    }

    await query(`
      UPDATE fiscal_periods
      SET status = 'CLOSED',
          closed_at = CURRENT_TIMESTAMP,
          closed_by = $1,
          is_current = false
      WHERE period_id = $2 AND tenant_id = $3
    `, [user_id, period_id, tenantId]);

    await this.autoOpenNextPeriod(tenantId, period);
  }

  async lockPeriod(tenantId: string, period_id: string, _user_id: string): Promise<void> {
    const period = await this.getPeriodById(tenantId, period_id);
    if (!period) throw new Error('Period not found');
    if (period.status !== 'CLOSED') throw new Error('Period must be closed before locking');

    await query('UPDATE fiscal_periods SET status = \'LOCKED\' WHERE period_id = $1 AND tenant_id = $2', [period_id, tenantId]);
  }

  async setCurrentPeriod(tenantId: string, period_id: string, _user_id: string): Promise<void> {
    await query('UPDATE fiscal_periods SET is_current = false WHERE is_current = true AND tenant_id = $1', [tenantId]);
    await query('UPDATE fiscal_periods SET is_current = true WHERE period_id = $1 AND tenant_id = $2', [period_id, tenantId]);
  }

  // ===== VALIDATION & UTILITIES =====

  async validatePeriodClose(tenantId: string, period_id: string): Promise<PeriodValidation> {
    const validation: PeriodValidation = {
      can_open: false,
      can_close: true,
      can_lock: false,
      warnings: [],
      errors: [],
      pending_transactions: 0,
      unposted_entries: 0
    };

    try {
      const unpostedQuery = `
        SELECT COUNT(*) as count
        FROM journal_entries
        WHERE tenant_id = $1
          AND journal_date >= (SELECT start_date FROM fiscal_periods WHERE period_id = $2 AND tenant_id = $1)
          AND journal_date <= (SELECT end_date FROM fiscal_periods WHERE period_id = $2 AND tenant_id = $1)
          AND status != 'POSTED'
      `;

      const unpostedResult = await query(unpostedQuery, [tenantId, period_id]);
      validation.unposted_entries = parseInt(unpostedResult.rows[0].count);

      if (validation.unposted_entries > 0) {
        validation.errors.push(`${validation.unposted_entries} unposted journal entries found`);
        validation.can_close = false;
      }
    } catch (error) {
      console.log('Journal entries check failed, allowing close:', error);
      validation.can_close = true;
    }

    return validation;
  }

  private async autoOpenNextPeriod(tenantId: string, closedPeriod: AccountingPeriod): Promise<void> {
    const result = await query(`
      SELECT period_id as id
      FROM fiscal_periods
      WHERE fiscal_year_id = $1
        AND tenant_id = $2
        AND period_number = $3
        AND status = 'FUTURE'
    `, [closedPeriod.fiscal_year_id, tenantId, closedPeriod.period_number + 1]);

    if (result.rows.length > 0) {
      const nextPeriod = result.rows[0];
      await this.openPeriod(tenantId, nextPeriod.id, 'system');
      await this.setCurrentPeriod(tenantId, nextPeriod.id, 'system');
    }
  }

  async getFiscalYearWithPeriods(tenantId: string, year_id: string): Promise<FiscalYearWithPeriods | null> {
    const fiscalYear = await this.getFiscalYearById(tenantId, year_id);
    if (!fiscalYear) return null;

    const periods = await this.getAllPeriods(tenantId, year_id);
    return { ...fiscalYear, periods };
  }

  async getPeriodSummary(tenantId: string): Promise<PeriodSummary> {
    const fiscalYearsCount = await query('SELECT COUNT(*) as count FROM fiscal_years WHERE tenant_id = $1', [tenantId]);
    const totalPeriods = await query('SELECT COUNT(*) as count FROM fiscal_periods WHERE tenant_id = $1', [tenantId]);
    const openPeriods = await query('SELECT COUNT(*) as count FROM fiscal_periods WHERE status = $1 AND tenant_id = $2', ['OPEN', tenantId]);
    const closedPeriods = await query('SELECT COUNT(*) as count FROM fiscal_periods WHERE status = $1 AND tenant_id = $2', ['CLOSED', tenantId]);
    const futurePeriods = await query('SELECT COUNT(*) as count FROM fiscal_periods WHERE status = $1 AND tenant_id = $2', ['FUTURE', tenantId]);
    const lockedPeriods = await query('SELECT COUNT(*) as count FROM fiscal_periods WHERE status = $1 AND tenant_id = $2', ['LOCKED', tenantId]);

    const currentPeriod = await this.getCurrentPeriod(tenantId);
    const currentFiscalYear = await this.getCurrentFiscalYear(tenantId);

    return {
      fiscal_years: parseInt(fiscalYearsCount.rows[0].count),
      total_periods: parseInt(totalPeriods.rows[0].count),
      open_periods: parseInt(openPeriods.rows[0].count),
      closed_periods: parseInt(closedPeriods.rows[0].count),
      future_periods: parseInt(futurePeriods.rows[0].count),
      locked_periods: parseInt(lockedPeriods.rows[0].count),
      current_period: currentPeriod,
      current_fiscal_year: currentFiscalYear
    };
  }
}
