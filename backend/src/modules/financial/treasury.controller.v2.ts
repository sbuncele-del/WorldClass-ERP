/**
 * Treasury Controller V2
 * Tenant-aware handlers for treasury management, cash positions, and forecasting
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
// CASH POSITIONS
// ============================================================================

export const getCashPositions = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId } = getTenantContext(req);
    const { currency, as_of_date } = req.query;

    let query = `
      SELECT cp.*, ba.account_name, ba.account_number
      FROM treasury.cash_positions cp
      JOIN treasury.bank_accounts ba ON cp.bank_account_id = ba.id
      WHERE cp.tenant_id = $1
    `;
    const values: any[] = [tenantId];
    let paramCount = 2;

    if (currency) {
      query += ` AND cp.currency = $${paramCount}`;
      values.push(currency);
      paramCount++;
    }

    if (as_of_date) {
      query += ` AND cp.position_date <= $${paramCount}`;
      values.push(as_of_date);
      paramCount++;
    }

    query += ` ORDER BY cp.position_date DESC`;

    const result = await pool.query(query, values);

    res.json({ success: true, cashPositions: result.rows });
  } catch (error: any) {
    if (error.message === 'Tenant ID not found') {
      return res.status(401).json({ success: false, message: 'Unauthorized - tenant not found' });
    }
    console.error('Error fetching cash positions:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch cash positions', error: error.message });
  }
};

// ============================================================================
// CASH FORECASTS
// ============================================================================

export const getCashForecasts = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId } = getTenantContext(req);
    const { currency, start_date, end_date } = req.query;

    let query = `
      SELECT * FROM treasury.cash_forecasts
      WHERE tenant_id = $1
    `;
    const values: any[] = [tenantId];
    let paramCount = 2;

    if (currency) {
      query += ` AND currency = $${paramCount}`;
      values.push(currency);
      paramCount++;
    }

    if (start_date) {
      query += ` AND forecast_date >= $${paramCount}`;
      values.push(start_date);
      paramCount++;
    }

    if (end_date) {
      query += ` AND forecast_date <= $${paramCount}`;
      values.push(end_date);
      paramCount++;
    }

    query += ` ORDER BY forecast_date ASC`;

    const result = await pool.query(query, values);

    res.json({ success: true, forecasts: result.rows });
  } catch (error: any) {
    if (error.message === 'Tenant ID not found') {
      return res.status(401).json({ success: false, message: 'Unauthorized - tenant not found' });
    }
    console.error('Error fetching forecasts:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch forecasts', error: error.message });
  }
};

export const createCashForecast = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId, userId } = getTenantContext(req);
    const forecastData = req.body;

    const result = await pool.query(
      `INSERT INTO treasury.cash_forecasts (
        tenant_id, forecast_date, currency, expected_inflows, expected_outflows,
        net_position, confidence_level, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        tenantId,
        forecastData.forecast_date,
        forecastData.currency,
        forecastData.expected_inflows,
        forecastData.expected_outflows,
        forecastData.net_position,
        forecastData.confidence_level,
        forecastData.notes,
        userId
      ]
    );

    res.status(201).json({ success: true, forecast: result.rows[0] });
  } catch (error: any) {
    if (error.message === 'Tenant ID not found') {
      return res.status(401).json({ success: false, message: 'Unauthorized - tenant not found' });
    }
    res.status(500).json({ success: false, message: 'Failed to create forecast', error: error.message });
  }
};

// ============================================================================
// INTER-COMPANY TRANSFERS
// ============================================================================

export const getIntercompanyTransfers = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId } = getTenantContext(req);
    const { status, start_date, end_date } = req.query;

    let query = `
      SELECT * FROM treasury.intercompany_transfers
      WHERE tenant_id = $1
    `;
    const values: any[] = [tenantId];
    let paramCount = 2;

    if (status) {
      query += ` AND status = $${paramCount}`;
      values.push(status);
      paramCount++;
    }

    if (start_date) {
      query += ` AND transfer_date >= $${paramCount}`;
      values.push(start_date);
      paramCount++;
    }

    if (end_date) {
      query += ` AND transfer_date <= $${paramCount}`;
      values.push(end_date);
      paramCount++;
    }

    query += ` ORDER BY transfer_date DESC`;

    const result = await pool.query(query, values);

    res.json({ success: true, transfers: result.rows });
  } catch (error: any) {
    if (error.message === 'Tenant ID not found') {
      return res.status(401).json({ success: false, message: 'Unauthorized - tenant not found' });
    }
    res.status(500).json({ success: false, message: 'Failed to fetch transfers', error: error.message });
  }
};

export const createIntercompanyTransfer = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId, userId } = getTenantContext(req);
    const transferData = req.body;

    const result = await pool.query(
      `INSERT INTO treasury.intercompany_transfers (
        tenant_id, source_entity_id, target_entity_id, source_account_id, target_account_id,
        amount, currency, transfer_date, reference, status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        tenantId,
        transferData.source_entity_id,
        transferData.target_entity_id,
        transferData.source_account_id,
        transferData.target_account_id,
        transferData.amount,
        transferData.currency,
        transferData.transfer_date,
        transferData.reference,
        transferData.status || 'PENDING',
        userId
      ]
    );

    res.status(201).json({ success: true, transfer: result.rows[0] });
  } catch (error: any) {
    if (error.message === 'Tenant ID not found') {
      return res.status(401).json({ success: false, message: 'Unauthorized - tenant not found' });
    }
    res.status(500).json({ success: false, message: 'Failed to create transfer', error: error.message });
  }
};

// ============================================================================
// TREASURY DASHBOARD
// ============================================================================

export const getTreasuryDashboard = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId } = getTenantContext(req);
    const { currency = 'ZAR' } = req.query;

    // Get current cash position
    const cashPosition = await pool.query(
      `SELECT 
        SUM(balance) as total_balance,
        COUNT(DISTINCT bank_account_id) as account_count
       FROM treasury.cash_positions 
       WHERE tenant_id = $1 AND currency = $2
       AND position_date = (SELECT MAX(position_date) FROM treasury.cash_positions WHERE tenant_id = $1)`,
      [tenantId, currency]
    );

    // Get pending transfers
    const pendingTransfers = await pool.query(
      `SELECT COUNT(*) as count, SUM(amount) as total_amount
       FROM treasury.intercompany_transfers
       WHERE tenant_id = $1 AND status = 'PENDING'`,
      [tenantId]
    );

    // Get 7-day forecast summary
    const forecastSummary = await pool.query(
      `SELECT 
        SUM(expected_inflows) as total_inflows,
        SUM(expected_outflows) as total_outflows,
        SUM(net_position) as net_change
       FROM treasury.cash_forecasts
       WHERE tenant_id = $1 
       AND currency = $2
       AND forecast_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'`,
      [tenantId, currency]
    );

    res.json({
      success: true,
      dashboard: {
        cashPosition: cashPosition.rows[0],
        pendingTransfers: pendingTransfers.rows[0],
        weekForecast: forecastSummary.rows[0]
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
  getCashPositions,
  getCashForecasts,
  createCashForecast,
  getIntercompanyTransfers,
  createIntercompanyTransfer,
  getTreasuryDashboard
};
