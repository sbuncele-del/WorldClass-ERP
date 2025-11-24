/**
 * Fixed Assets Controller
 * Handles CRUD operations for fixed assets, depreciation, disposals, transfers, and maintenance
 */

import { Request, Response } from 'express';
import pool from '../config/database';
import { DepreciationCalculator } from '../services/depreciation-calculator.service';
import {
  DepreciationMethod,
  AssetStatus,
  CreateFixedAssetDTO,
  UpdateFixedAssetDTO,
  CreateAssetDisposalDTO,
  CreateAssetTransferDTO,
  CreateAssetMaintenanceDTO
} from '../models/asset-management.model';

// =====================================================
// FIXED ASSETS CRUD
// =====================================================

/**
 * GET /api/assets
 * Get all fixed assets with filtering, pagination, and sorting
 */
export async function getAllAssets(req: Request, res: Response) {
  try {
    const {
      page = '1',
      limit = '50',
      category_id,
      asset_status,
      location_id,
      department_id,
      cost_center_id,
      search,
      sort_by = 'asset_number',
      sort_order = 'ASC'
    } = req.query;

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    let whereConditions: string[] = [];
    let queryParams: any[] = [];
    let paramIndex = 1;

    if (category_id) {
      whereConditions.push(`fa.category_id = $${paramIndex++}`);
      queryParams.push(category_id);
    }

    if (asset_status) {
      whereConditions.push(`fa.asset_status = $${paramIndex++}`);
      queryParams.push(asset_status);
    }

    if (location_id) {
      whereConditions.push(`fa.location_id = $${paramIndex++}`);
      queryParams.push(location_id);
    }

    if (department_id) {
      whereConditions.push(`fa.department_id = $${paramIndex++}`);
      queryParams.push(department_id);
    }

    if (cost_center_id) {
      whereConditions.push(`fa.cost_center_id = $${paramIndex++}`);
      queryParams.push(cost_center_id);
    }

    if (search) {
      whereConditions.push(`(
        fa.asset_number ILIKE $${paramIndex} OR 
        fa.asset_name ILIKE $${paramIndex} OR 
        fa.serial_number ILIKE $${paramIndex}
      )`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 
      ? 'WHERE ' + whereConditions.join(' AND ') 
      : '';

    // Main query
    const query = `
      SELECT 
        fa.*,
        ac.category_name,
        COUNT(*) OVER() as total_count
      FROM assets.fixed_assets fa
      LEFT JOIN assets.asset_categories ac ON fa.category_id = ac.category_id
      ${whereClause}
      ORDER BY fa.${sort_by} ${sort_order}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(parseInt(limit as string), offset);

    const result = await pool.query(query, queryParams);

    // Summary statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total_assets,
        SUM(purchase_cost) as total_acquisition_cost,
        COUNT(CASE WHEN asset_status = 'ACTIVE' THEN 1 END) as active_assets,
        COUNT(CASE WHEN asset_status = 'IDLE' THEN 1 END) as idle_assets,
        COUNT(CASE WHEN asset_status = 'UNDER_MAINTENANCE' THEN 1 END) as under_maintenance,
        COUNT(CASE WHEN asset_status = 'DISPOSED' THEN 1 END) as disposed_assets
      FROM assets.fixed_assets
      ${whereClause}
    `;

    const statsResult = await pool.query(statsQuery, queryParams.slice(0, -2));

    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      summary: statsResult.rows[0]
    });

  } catch (error: any) {
    console.error('Error fetching assets:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch assets',
      error: error.message
    });
  }
}

/**
 * GET /api/assets/:id
 * Get single asset with full details including depreciation schedule
 */
export async function getAssetById(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const assetResult = await pool.query(`
      SELECT 
        fa.*,
        ac.category_name,
        ac.category_code
      FROM assets.fixed_assets fa
      LEFT JOIN assets.asset_categories ac ON fa.category_id = ac.category_id
      WHERE fa.asset_id = $1
    `, [id]);

    if (assetResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Asset not found'
      });
    }

    const asset = assetResult.rows[0];

    // Get depreciation schedule
    const scheduleResult = await pool.query(`
      SELECT * FROM assets.asset_depreciation_schedule
      WHERE asset_id = $1
      ORDER BY period_year DESC, period_month DESC
      LIMIT 12
    `, [id]);

    // Get recent maintenance
    const maintenanceResult = await pool.query(`
      SELECT * FROM assets.asset_maintenance
      WHERE asset_id = $1
      ORDER BY maintenance_date DESC
      LIMIT 5
    `, [id]);

    // Get transfer history
    const transfersResult = await pool.query(`
      SELECT * FROM assets.asset_transfers
      WHERE asset_id = $1
      ORDER BY transfer_date DESC
      LIMIT 5
    `, [id]);

    res.json({
      success: true,
      data: asset,
      depreciation_schedule: scheduleResult.rows,
      recent_maintenance: maintenanceResult.rows,
      transfer_history: transfersResult.rows
    });

  } catch (error: any) {
    console.error('Error fetching asset:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch asset',
      error: error.message
    });
  }
}

/**
 * POST /api/assets
 * Create new fixed asset
 */
export async function createAsset(req: Request, res: Response) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const data: CreateFixedAssetDTO = req.body;

    // Generate asset number
    const numberResult = await client.query(`
      SELECT COALESCE(MAX(CAST(SUBSTRING(asset_number FROM 5) AS INTEGER)), 0) + 1 as next_number
      FROM assets.fixed_assets
      WHERE asset_number LIKE 'AST-%'
    `);
    const asset_number = `AST-${String(numberResult.rows[0].next_number).padStart(5, '0')}`;

    // Insert asset
    const result = await client.query(`
      INSERT INTO assets.fixed_assets (
        asset_number, asset_name, description, category_id,
        acquisition_date, acquisition_method, vendor_id, vendor_name,
        purchase_order_id, invoice_number,
        acquisition_cost, installation_cost, improvement_cost,
        depreciation_method, useful_life_years, useful_life_units,
        residual_value, depreciation_rate, depreciation_start_date,
        serial_number, manufacturer, model_number, year_of_manufacture, warranty_expiry_date,
        location_id, location_name, department_id, cost_center_id,
        custodian_employee_id, custodian_name,
        asset_status, condition_rating,
        is_insured, insurance_policy_number, insurance_value, insurance_expiry_date,
        notes, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19,
        $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
        $31, $32, $33, $34, $35, $36, $37, $38
      )
      RETURNING *
    `, [
      asset_number, data.asset_name, data.description, data.category_id,
      data.acquisition_date, data.acquisition_method, data.vendor_id, data.vendor_name,
      data.purchase_order_id, data.invoice_number,
      data.acquisition_cost, data.installation_cost || 0, data.improvement_cost || 0,
      data.depreciation_method, data.useful_life_years, data.useful_life_units,
      data.residual_value || 0, data.depreciation_rate, data.depreciation_start_date,
      data.serial_number, data.manufacturer, data.model_number, data.year_of_manufacture, data.warranty_expiry_date,
      data.location_id, data.location_name, data.department_id, data.cost_center_id,
      data.custodian_employee_id, data.custodian_name,
      'ACTIVE', data.condition_rating || 'GOOD',
      data.is_insured || false, data.insurance_policy_number, data.insurance_value, data.insurance_expiry_date,
      data.notes, req.user?.user_id || 'system'
    ]);

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Asset created successfully',
      data: result.rows[0]
    });

  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error creating asset:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create asset',
      error: error.message
    });
  } finally {
    client.release();
  }
}

/**
 * PUT /api/assets/:id
 * Update fixed asset
 */
export async function updateAsset(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const data: UpdateFixedAssetDTO = req.body;

    const allowedFields = [
      'asset_name', 'description', 'category_id', 'location_id', 'location_name',
      'department_id', 'cost_center_id', 'custodian_employee_id', 'custodian_name',
      'asset_status', 'condition_rating', 'is_insured', 'insurance_policy_number',
      'insurance_value', 'insurance_expiry_date', 'notes'
    ];

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(data).forEach(([key, value]) => {
      if (allowedFields.includes(key) && value !== undefined) {
        updates.push(`${key} = $${paramIndex++}`);
        values.push(value);
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
    }

    updates.push(`updated_at = NOW()`);
    updates.push(`updated_by = $${paramIndex++}`);
    values.push(req.user?.user_id || 'system');
    values.push(id);

    const result = await pool.query(`
      UPDATE fixed_assets
      SET ${updates.join(', ')}
      WHERE asset_id = $${paramIndex}
      RETURNING *
    `, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Asset not found'
      });
    }

    res.json({
      success: true,
      message: 'Asset updated successfully',
      data: result.rows[0]
    });

  } catch (error: any) {
    console.error('Error updating asset:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update asset',
      error: error.message
    });
  }
}

/**
 * POST /api/assets/:id/depreciation/calculate
 * Calculate and save depreciation for a specific period
 */
export async function calculateDepreciation(req: Request, res: Response) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { period_year, period_month, units_produced } = req.body;

    if (!period_year || !period_month) {
      return res.status(400).json({
        success: false,
        message: 'period_year and period_month are required'
      });
    }

    // Get asset details
    const assetResult = await client.query(`
      SELECT * FROM assets.fixed_assets WHERE asset_id = $1
    `, [id]);

    if (assetResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Asset not found'
      });
    }

    const asset = assetResult.rows[0];

    // Check if asset is depreciable
    if (asset.asset_status === 'DISPOSED' || asset.asset_status === 'WRITTEN_OFF') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Cannot depreciate disposed or written-off assets'
      });
    }

    // Check if depreciation already exists for this period
    const existingResult = await client.query(`
      SELECT * FROM assets.asset_depreciation_schedule
      WHERE asset_id = $1 AND period_year = $2 AND period_month = $3
    `, [id, period_year, period_month]);

    if (existingResult.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Depreciation already calculated for this period'
      });
    }

    // Get latest depreciation to calculate current accumulated depreciation
    const latestDepResult = await client.query(`
      SELECT accumulated_depreciation, closing_book_value 
      FROM assets.asset_depreciation_schedule
      WHERE asset_id = $1
      ORDER BY period_year DESC, period_month DESC
      LIMIT 1
    `, [id]);

    const accumulatedDep = latestDepResult.rows.length > 0 
      ? parseFloat(latestDepResult.rows[0].accumulated_depreciation)
      : 0;
    
    const currentBookValue = latestDepResult.rows.length > 0
      ? parseFloat(latestDepResult.rows[0].closing_book_value)
      : parseFloat(asset.purchase_cost);

    // Calculate depreciation
    const depreciationResult = DepreciationCalculator.calculateDepreciation(
      asset.depreciation_method as DepreciationMethod,
      {
        acquisition_cost: parseFloat(asset.purchase_cost),
        residual_value: parseFloat(asset.residual_value),
        useful_life_years: asset.useful_life_years,
        useful_life_units: asset.useful_life_units,
        depreciation_rate: asset.depreciation_rate,
        accumulated_depreciation: accumulatedDep,
        current_book_value: currentBookValue,
        period_year,
        period_month,
        units_produced_in_period: units_produced
      }
    );

    // Calculate period dates
    const period_start_date = new Date(period_year, period_month - 1, 1);
    const period_end_date = new Date(period_year, period_month, 0);

    // Insert depreciation schedule
    const scheduleResult = await client.query(`
      INSERT INTO assets.asset_depreciation_schedule (
        asset_id, period_year, period_month,
        opening_book_value, depreciation_amount, accumulated_depreciation, closing_book_value,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      id, period_year, period_month,
      currentBookValue,
      depreciationResult.depreciation_amount,
      depreciationResult.accumulated_depreciation,
      depreciationResult.closing_book_value,
      req.user?.user_id || 'system'
    ]);

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Depreciation calculated successfully',
      data: scheduleResult.rows[0]
    });

  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error calculating depreciation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate depreciation',
      error: error.message
    });
  } finally {
    client.release();
  }
}

/**
 * POST /api/assets/depreciation/batch
 * Calculate depreciation for all active assets for a given period
 */
export async function batchCalculateDepreciation(req: Request, res: Response) {
  const client = await pool.connect();
  
  try {
    const { period_year, period_month } = req.body;

    if (!period_year || !period_month) {
      return res.status(400).json({
        success: false,
        message: 'period_year and period_month are required'
      });
    }

    // Get all active depreciable assets
    const assetsResult = await client.query(`
      SELECT * FROM assets.fixed_assets
      WHERE asset_status IN ('ACTIVE', 'IDLE')
      AND purchase_date <= $1
    `, [new Date(period_year, period_month - 1, 1)]);

    const results = {
      total_assets: assetsResult.rows.length,
      successful: 0,
      failed: 0,
      total_depreciation: 0,
      errors: [] as any[]
    };

    for (const asset of assetsResult.rows) {
      try {
        await client.query('BEGIN');

        // Check if already calculated
        const existing = await client.query(`
          SELECT 1 FROM assets.asset_depreciation_schedule
          WHERE asset_id = $1 AND period_year = $2 AND period_month = $3
        `, [asset.asset_id, period_year, period_month]);

        if (existing.rows.length > 0) {
          await client.query('ROLLBACK');
          continue; // Skip already calculated
        }

        // Get latest depreciation
        const latestDepResult = await client.query(`
          SELECT accumulated_depreciation, closing_book_value 
          FROM assets.asset_depreciation_schedule
          WHERE asset_id = $1
          ORDER BY period_year DESC, period_month DESC
          LIMIT 1
        `, [asset.asset_id]);

        const accumulatedDep = latestDepResult.rows.length > 0 
          ? parseFloat(latestDepResult.rows[0].accumulated_depreciation)
          : 0;
        
        const currentBookValue = latestDepResult.rows.length > 0
          ? parseFloat(latestDepResult.rows[0].closing_book_value)
          : parseFloat(asset.purchase_cost);

        // Calculate depreciation
        const depreciationResult = DepreciationCalculator.calculateDepreciation(
          asset.depreciation_method as DepreciationMethod,
          {
            acquisition_cost: parseFloat(asset.purchase_cost),
            residual_value: parseFloat(asset.residual_value),
            useful_life_years: asset.useful_life_years,
            useful_life_units: asset.useful_life_units,
            depreciation_rate: asset.depreciation_rate,
            accumulated_depreciation: accumulatedDep,
            current_book_value: currentBookValue,
            period_year,
            period_month
          }
        );

        // Insert schedule
        await client.query(`
          INSERT INTO assets.asset_depreciation_schedule (
            asset_id, period_year, period_month,
            opening_book_value, depreciation_amount, accumulated_depreciation, closing_book_value,
            created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          asset.asset_id, period_year, period_month,
          currentBookValue,
          depreciationResult.depreciation_amount,
          depreciationResult.accumulated_depreciation,
          depreciationResult.closing_book_value,
          req.user?.user_id || 'system'
        ]);

        await client.query('COMMIT');

        results.successful++;
        results.total_depreciation += depreciationResult.depreciation_amount;

      } catch (error: any) {
        await client.query('ROLLBACK');
        results.failed++;
        results.errors.push({
          asset_number: asset.asset_number,
          asset_name: asset.asset_name,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Batch depreciation completed`,
      results
    });

  } catch (error: any) {
    console.error('Error in batch depreciation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate batch depreciation',
      error: error.message
    });
  } finally {
    client.release();
  }
}

export default {
  getAllAssets,
  getAssetById,
  createAsset,
  updateAsset,
  calculateDepreciation,
  batchCalculateDepreciation
};
