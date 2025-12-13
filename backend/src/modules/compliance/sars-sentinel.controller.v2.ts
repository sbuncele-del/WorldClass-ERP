/**
 * SARS Sentinel Controller V2
 * Tenant-aware handlers for South African Revenue Service compliance
 * 
 * IMPORTANT: Uses TenantRequest for typed tenant context from middleware.
 */

import { Response } from 'express';
import { TenantRequest } from '../../types';
import pool from '../../config/database';

/**
 * Tenant context helper
 */
function getTenantContext(req: TenantRequest): { tenantId: string; userId?: string } {
  const tenantId = req.tenant?.id;
  if (!tenantId) {
    throw new Error('Tenant ID not found');
  }
  return {
    tenantId,
    userId: req.user?.id
  };
}

// ============================================================================
// TAX RETURNS
// ============================================================================

export const getTaxReturns = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId } = getTenantContext(req);
    const { tax_year, return_type, status, page = '1', limit = '50' } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    let query = `
      SELECT * FROM sars.tax_returns
      WHERE tenant_id = $1
    `;
    const values: any[] = [tenantId];
    let paramCount = 2;

    if (tax_year) {
      query += ` AND tax_year = $${paramCount}`;
      values.push(tax_year);
      paramCount++;
    }

    if (return_type) {
      query += ` AND return_type = $${paramCount}`;
      values.push(return_type);
      paramCount++;
    }

    if (status) {
      query += ` AND status = $${paramCount}`;
      values.push(status);
      paramCount++;
    }

    query += ` ORDER BY tax_year DESC, due_date DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    values.push(parseInt(limit as string), offset);

    const result = await pool.query(query, values);

    res.json({ success: true, taxReturns: result.rows });
  } catch (error: any) {
    if (error.message === 'Tenant ID not found') {
      return res.status(401).json({ success: false, message: 'Unauthorized - tenant not found' });
    }
    console.error('Error fetching tax returns:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch tax returns', error: error.message });
  }
};

export const createTaxReturn = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId, userId } = getTenantContext(req);
    const returnData = req.body;

    const result = await pool.query(
      `INSERT INTO sars.tax_returns (
        tenant_id, return_type, tax_year, period_start, period_end,
        due_date, status, taxable_income, tax_payable, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        tenantId,
        returnData.return_type,
        returnData.tax_year,
        returnData.period_start,
        returnData.period_end,
        returnData.due_date,
        returnData.status || 'DRAFT',
        returnData.taxable_income,
        returnData.tax_payable,
        userId
      ]
    );

    res.status(201).json({ success: true, taxReturn: result.rows[0] });
  } catch (error: any) {
    if (error.message === 'Tenant ID not found') {
      return res.status(401).json({ success: false, message: 'Unauthorized - tenant not found' });
    }
    res.status(500).json({ success: false, message: 'Failed to create tax return', error: error.message });
  }
};

// ============================================================================
// VAT RETURNS
// ============================================================================

export const getVATReturns = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId } = getTenantContext(req);
    const { year, period, status, page = '1', limit = '50' } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    let query = `
      SELECT * FROM sars.vat_returns
      WHERE tenant_id = $1
    `;
    const values: any[] = [tenantId];
    let paramCount = 2;

    if (year) {
      query += ` AND EXTRACT(YEAR FROM period_end) = $${paramCount}`;
      values.push(year);
      paramCount++;
    }

    if (period) {
      query += ` AND vat_period = $${paramCount}`;
      values.push(period);
      paramCount++;
    }

    if (status) {
      query += ` AND status = $${paramCount}`;
      values.push(status);
      paramCount++;
    }

    query += ` ORDER BY period_end DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    values.push(parseInt(limit as string), offset);

    const result = await pool.query(query, values);

    res.json({ success: true, vatReturns: result.rows });
  } catch (error: any) {
    if (error.message === 'Tenant ID not found') {
      return res.status(401).json({ success: false, message: 'Unauthorized - tenant not found' });
    }
    res.status(500).json({ success: false, message: 'Failed to fetch VAT returns', error: error.message });
  }
};

export const createVATReturn = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId, userId } = getTenantContext(req);
    const vatData = req.body;

    const result = await pool.query(
      `INSERT INTO sars.vat_returns (
        tenant_id, vat_period, period_start, period_end, due_date,
        output_vat, input_vat, net_vat, status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        tenantId,
        vatData.vat_period,
        vatData.period_start,
        vatData.period_end,
        vatData.due_date,
        vatData.output_vat,
        vatData.input_vat,
        vatData.net_vat,
        vatData.status || 'DRAFT',
        userId
      ]
    );

    res.status(201).json({ success: true, vatReturn: result.rows[0] });
  } catch (error: any) {
    if (error.message === 'Tenant ID not found') {
      return res.status(401).json({ success: false, message: 'Unauthorized - tenant not found' });
    }
    res.status(500).json({ success: false, message: 'Failed to create VAT return', error: error.message });
  }
};

// ============================================================================
// PAYE SUBMISSIONS
// ============================================================================

export const getPAYESubmissions = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId } = getTenantContext(req);
    const { tax_year, month, status, page = '1', limit = '50' } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    let query = `
      SELECT * FROM sars.paye_submissions
      WHERE tenant_id = $1
    `;
    const values: any[] = [tenantId];
    let paramCount = 2;

    if (tax_year) {
      query += ` AND tax_year = $${paramCount}`;
      values.push(tax_year);
      paramCount++;
    }

    if (month) {
      query += ` AND month = $${paramCount}`;
      values.push(month);
      paramCount++;
    }

    if (status) {
      query += ` AND status = $${paramCount}`;
      values.push(status);
      paramCount++;
    }

    query += ` ORDER BY tax_year DESC, month DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    values.push(parseInt(limit as string), offset);

    const result = await pool.query(query, values);

    res.json({ success: true, payeSubmissions: result.rows });
  } catch (error: any) {
    if (error.message === 'Tenant ID not found') {
      return res.status(401).json({ success: false, message: 'Unauthorized - tenant not found' });
    }
    res.status(500).json({ success: false, message: 'Failed to fetch PAYE submissions', error: error.message });
  }
};

export const createPAYESubmission = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId, userId } = getTenantContext(req);
    const payeData = req.body;

    const result = await pool.query(
      `INSERT INTO sars.paye_submissions (
        tenant_id, tax_year, month, period_start, period_end, due_date,
        gross_remuneration, paye_deducted, uif_contribution, sdl_contribution,
        status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        tenantId,
        payeData.tax_year,
        payeData.month,
        payeData.period_start,
        payeData.period_end,
        payeData.due_date,
        payeData.gross_remuneration,
        payeData.paye_deducted,
        payeData.uif_contribution,
        payeData.sdl_contribution,
        payeData.status || 'DRAFT',
        userId
      ]
    );

    res.status(201).json({ success: true, payeSubmission: result.rows[0] });
  } catch (error: any) {
    if (error.message === 'Tenant ID not found') {
      return res.status(401).json({ success: false, message: 'Unauthorized - tenant not found' });
    }
    res.status(500).json({ success: false, message: 'Failed to create PAYE submission', error: error.message });
  }
};

// ============================================================================
// IRP5/IT3 CERTIFICATES
// ============================================================================

export const getTaxCertificates = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId } = getTenantContext(req);
    const { tax_year, certificate_type, employee_id, page = '1', limit = '50' } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    let query = `
      SELECT c.*, e.first_name, e.last_name
      FROM sars.tax_certificates c
      LEFT JOIN hr.employees e ON c.employee_id = e.id
      WHERE c.tenant_id = $1
    `;
    const values: any[] = [tenantId];
    let paramCount = 2;

    if (tax_year) {
      query += ` AND c.tax_year = $${paramCount}`;
      values.push(tax_year);
      paramCount++;
    }

    if (certificate_type) {
      query += ` AND c.certificate_type = $${paramCount}`;
      values.push(certificate_type);
      paramCount++;
    }

    if (employee_id) {
      query += ` AND c.employee_id = $${paramCount}`;
      values.push(employee_id);
      paramCount++;
    }

    query += ` ORDER BY c.tax_year DESC, c.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    values.push(parseInt(limit as string), offset);

    const result = await pool.query(query, values);

    res.json({ success: true, certificates: result.rows });
  } catch (error: any) {
    if (error.message === 'Tenant ID not found') {
      return res.status(401).json({ success: false, message: 'Unauthorized - tenant not found' });
    }
    res.status(500).json({ success: false, message: 'Failed to fetch certificates', error: error.message });
  }
};

// ============================================================================
// SARS DASHBOARD
// ============================================================================

export const getSARSDashboard = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId } = getTenantContext(req);
    const currentYear = new Date().getFullYear();

    // Get upcoming deadlines
    const upcomingDeadlines = await pool.query(
      `SELECT 'TAX' as type, return_type as name, due_date, status
       FROM sars.tax_returns
       WHERE tenant_id = $1 AND status NOT IN ('SUBMITTED', 'ACCEPTED') AND due_date >= CURRENT_DATE
       UNION ALL
       SELECT 'VAT' as type, 'VAT Return' as name, due_date, status
       FROM sars.vat_returns
       WHERE tenant_id = $1 AND status NOT IN ('SUBMITTED', 'ACCEPTED') AND due_date >= CURRENT_DATE
       UNION ALL
       SELECT 'PAYE' as type, 'PAYE ' || month || '/' || tax_year as name, due_date, status
       FROM sars.paye_submissions
       WHERE tenant_id = $1 AND status NOT IN ('SUBMITTED', 'ACCEPTED') AND due_date >= CURRENT_DATE
       ORDER BY due_date ASC
       LIMIT 10`,
      [tenantId]
    );

    // Get filing status summary
    const filingStatus = await pool.query(
      `SELECT 
        (SELECT COUNT(*) FROM sars.tax_returns WHERE tenant_id = $1 AND tax_year = $2) as tax_returns,
        (SELECT COUNT(*) FROM sars.vat_returns WHERE tenant_id = $1 AND EXTRACT(YEAR FROM period_end) = $2) as vat_returns,
        (SELECT COUNT(*) FROM sars.paye_submissions WHERE tenant_id = $1 AND tax_year = $2) as paye_submissions`,
      [tenantId, currentYear]
    );

    res.json({
      success: true,
      dashboard: {
        upcomingDeadlines: upcomingDeadlines.rows,
        filingStatus: filingStatus.rows[0]
      }
    });
  } catch (error: any) {
    if (error.message === 'Tenant ID not found') {
      return res.status(401).json({ success: false, message: 'Unauthorized - tenant not found' });
    }
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard', error: error.message });
  }
};

export default {
  getTaxReturns,
  createTaxReturn,
  getVATReturns,
  createVATReturn,
  getPAYESubmissions,
  createPAYESubmission,
  getTaxCertificates,
  getSARSDashboard
};
