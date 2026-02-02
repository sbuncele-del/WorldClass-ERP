/**
 * Period Management Service
 * Business logic for fiscal years and accounting periods
 * 
 * NOTE: This service works with production tables:
 *   - fiscal_years (with fiscal_year_id as primary key)
 *   - fiscal_periods (with period_id as primary key)
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

  async getAllFiscalYears(): Promise<FiscalYear[]> {
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
      ORDER BY start_date DESC
    `;
    const result = await query(sql);
    return result.rows;
  }

  async getFiscalYearById(id: string): Promise<FiscalYear | null> {
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
      WHERE fiscal_year_id = $1
    `;
    const result = await query(sql, [id]);
    return result.rows[0] || null;
  }

  async getFiscalYearByCode(code: string): Promise<FiscalYear | null> {
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
      WHERE year_code = $1
    `;
    const result = await query(sql, [code]);
    return result.rows[0] || null;
  }

  async getCurrentFiscalYear(): Promise<FiscalYear | null> {
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
      WHERE is_current = true 
      LIMIT 1
    `;
    const result = await query(sql);
    return result.rows[0] || null;
  }

  async createFiscalYear(data: CreateFiscalYearDTO): Promise<string> {
    const sql = `
      INSERT INTO fiscal_years (
        tenant_id, year_code, year_name, start_date, end_date,
        status, is_current, created_by
      ) VALUES ($1, $2, $3, $4, $5, 'OPEN', false, $6)
      RETURNING fiscal_year_id as id
    `;
    
    const result = await query(sql, [
      data.tenant_id || '00000000-0000-0000-0000-000000000001',
      data.year_code,
      data.year_name,
      data.start_date,
      data.end_date,
      data.user_id
    ]);
    
    return result.rows[0].id;
  }

  async setCurrentFiscalYear(year_id: string, user_id: string): Promise<void> {
    await query('UPDATE fiscal_years SET is_current = false WHERE is_current = true');
    await query('UPDATE fiscal_years SET is_current = true WHERE fiscal_year_id = $1', [year_id]);
  }

  async closeFiscalYear(year_id: string, user_id: string): Promise<void> {
    const openPeriodsCheck = await query(
      'SELECT COUNT(*) as count FROM fiscal_periods WHERE fiscal_year_id = $1 AND status != $2',
      [year_id, 'CLOSED']
    );
    
    if (parseInt(openPeriodsCheck.rows[0].count) > 0) {
      throw new Error('Cannot close fiscal year: some periods are still open');
    }

    await query('UPDATE fiscal_years SET status = \'CLOSED\' WHERE fiscal_year_id = $1', [year_id]);
  }

  // ===== ACCOUNTING PERIODS (using fiscal_periods table) =====

  async getAllPeriods(fiscal_year_id?: string): Promise<AccountingPeriod[]> {
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
    `;
    const params: string[] = [];
    
    if (fiscal_year_id) {
      sql += ' WHERE fiscal_year_id = $1';
      params.push(fiscal_year_id);
    }
    
    sql += ' ORDER BY period_number ASC';
    
    const result = await query(sql, params);
    return result.rows;
  }

  async getPeriodById(id: string): Promise<AccountingPeriod | null> {
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
      WHERE period_id = $1
    `;
    const result = await query(sql, [id]);
    return result.rows[0] || null;
  }

  async getPeriodByCode(code: string): Promise<AccountingPeriod | null> {
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
      WHERE period_code = $1
    `;
    const result = await query(sql, [code]);
    return result.rows[0] || null;
  }

  async getCurrentPeriod(): Promise<AccountingPeriod | null> {
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
      WHERE is_current = true 
      LIMIT 1
    `;
    const result = await query(sql);
    return result.rows[0] || null;
  }

  async getOpenPeriods(fiscal_year_id?: string): Promise<AccountingPeriod[]> {
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
      WHERE status = $1
    `;
    const params: (string | PeriodStatus)[] = ['OPEN'];
    
    if (fiscal_year_id) {
      sql += ' AND fiscal_year_id = $2';
      params.push(fiscal_year_id);
    }
    
    sql += ' ORDER BY period_number ASC';
    
    const result = await query(sql, params);
    return result.rows;
  }

  async createPeriod(data: CreatePeriodDTO): Promise<string> {
    const sql = `
      INSERT INTO fiscal_periods (
        tenant_id, fiscal_year_id, period_number, period_code, period_name,
        start_date, end_date, status, is_current
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'OPEN', false)
      RETURNING period_id as id
    `;
    
    const result = await query(sql, [
      data.tenant_id || '00000000-0000-0000-0000-000000000001',
      data.fiscal_year_id,
      data.period_number,
      data.period_code,
      data.period_name,
      data.start_date,
      data.end_date
    ]);
    
    return result.rows[0].id;
  }

  async openPeriod(period_id: string, user_id: string): Promise<void> {
    const period = await this.getPeriodById(period_id);
    if (!period) throw new Error('Period not found');
    if (period.status === 'LOCKED') throw new Error('Cannot open a locked period');
    if (period.status === 'OPEN') throw new Error('Period is already open');

    await query('UPDATE fiscal_periods SET status = \'OPEN\' WHERE period_id = $1', [period_id]);
  }

  async closePeriod(period_id: string, user_id: string, force: boolean = false): Promise<void> {
    const period = await this.getPeriodById(period_id);
    if (!period) throw new Error('Period not found');
    if (period.status === 'LOCKED') throw new Error('Cannot close a locked period');
    if (period.status === 'CLOSED') throw new Error('Period is already closed');

    if (!force) {
      const validation = await this.validatePeriodClose(period_id);
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
      WHERE period_id = $2
    `, [user_id, period_id]);

    await this.autoOpenNextPeriod(period);
  }

  async lockPeriod(period_id: string, user_id: string): Promise<void> {
    const period = await this.getPeriodById(period_id);
    if (!period) throw new Error('Period not found');
    if (period.status !== 'CLOSED') throw new Error('Period must be closed before locking');

    await query('UPDATE fiscal_periods SET status = \'LOCKED\' WHERE period_id = $1', [period_id]);
  }

  async setCurrentPeriod(period_id: string, user_id: string): Promise<void> {
    await query('UPDATE fiscal_periods SET is_current = false WHERE is_current = true');
    await query('UPDATE fiscal_periods SET is_current = true WHERE period_id = $1', [period_id]);
  }

  // ===== VALIDATION & UTILITIES =====

  async validatePeriodClose(period_id: string): Promise<PeriodValidation> {
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
        WHERE posting_date >= (SELECT start_date FROM fiscal_periods WHERE period_id = $1)
        AND posting_date <= (SELECT end_date FROM fiscal_periods WHERE period_id = $1)
        AND status != 'POSTED'
      `;
      
      const unpostedResult = await query(unpostedQuery, [period_id]);
      validation.unposted_entries = parseInt(unpostedResult.rows[0].count);

      if (validation.unposted_entries > 0) {
        validation.errors.push(`${validation.unposted_entries} unposted journal entries found`);
        validation.can_close = false;
      }
    } catch (error) {
      console.log('Journal entries table may not exist, allowing close');
      validation.can_close = true;
    }

    return validation;
  }

  private async autoOpenNextPeriod(closedPeriod: AccountingPeriod): Promise<void> {
    const result = await query(`
      SELECT period_id as id
      FROM fiscal_periods 
      WHERE fiscal_year_id = $1 
      AND period_number = $2
      AND status = 'FUTURE'
    `, [closedPeriod.fiscal_year_id, closedPeriod.period_number + 1]);

    if (result.rows.length > 0) {
      const nextPeriod = result.rows[0];
      await this.openPeriod(nextPeriod.id, 'system');
      await this.setCurrentPeriod(nextPeriod.id, 'system');
    }
  }

  async getFiscalYearWithPeriods(year_id: string): Promise<FiscalYearWithPeriods | null> {
    const fiscalYear = await this.getFiscalYearById(year_id);
    if (!fiscalYear) return null;

    const periods = await this.getAllPeriods(year_id);
    return { ...fiscalYear, periods };
  }

  async getPeriodSummary(): Promise<PeriodSummary> {
    const fiscalYearsCount = await query('SELECT COUNT(*) as count FROM fiscal_years');
    const totalPeriods = await query('SELECT COUNT(*) as count FROM fiscal_periods');
    const openPeriods = await query('SELECT COUNT(*) as count FROM fiscal_periods WHERE status = $1', ['OPEN']);
    const closedPeriods = await query('SELECT COUNT(*) as count FROM fiscal_periods WHERE status = $1', ['CLOSED']);
    const futurePeriods = await query('SELECT COUNT(*) as count FROM fiscal_periods WHERE status = $1', ['FUTURE']);
    const lockedPeriods = await query('SELECT COUNT(*) as count FROM fiscal_periods WHERE status = $1', ['LOCKED']);
    
    const currentPeriod = await this.getCurrentPeriod();
    const currentFiscalYear = await this.getCurrentFiscalYear();

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
