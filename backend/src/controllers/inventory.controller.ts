/**
 * INVENTORY MANAGEMENT CONTROLLER
 * 
 * Handles all inventory operations:
 * - Item master data management
 * - Stock level tracking
 * - Stock movements (receipts, issues, transfers, adjustments)
 * - Inventory valuation (FIFO/LIFO/Weighted Average)
 * - Reorder suggestions
 * - Integration with Purchase and Sales modules
 */

import { Request, Response } from 'express';
import { pool } from '../config/database';
import { PoolClient } from 'pg';

// ============================================================================
// ITEM CATEGORIES
// ============================================================================

export const getItemCategories = async (req: Request, res: Response) => {
  try {
    const { is_active } = req.query;
    
    let query = `
      SELECT 
        ic.*,
        pc.category_name as parent_category_name,
        (SELECT COUNT(*) FROM inventory.items WHERE category_id = ic.category_id AND is_active = true) as item_count
      FROM inventory.item_categories ic
      LEFT JOIN inventory.item_categories pc ON ic.parent_category_id = pc.category_id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    if (is_active !== undefined) {
      params.push(is_active === 'true');
      query += ` AND ic.is_active = $${params.length}`;
    }
    
    query += ` ORDER BY ic.category_code`;
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching item categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch item categories',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const createItemCategory = async (req: Request, res: Response) => {
  try {
    const {
      category_code,
      category_name,
      parent_category_id,
      description,
      is_active = true
    } = req.body;
    
    const result = await pool.query(
      `INSERT INTO item_categories (
        category_code, category_name, parent_category_id, description, is_active, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [category_code, category_name, parent_category_id, description, is_active, req.user?.id || 1]
    );
    
    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Item category created successfully'
    });
  } catch (error) {
    console.error('Error creating item category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create item category',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const updateItemCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      category_code,
      category_name,
      parent_category_id,
      description,
      is_active
    } = req.body;
    
    const result = await pool.query(
      `UPDATE item_categories 
      SET category_code = $1, category_name = $2, parent_category_id = $3,
          description = $4, is_active = $5, updated_at = CURRENT_TIMESTAMP,
          updated_by = $6
      WHERE category_id = $7
      RETURNING *`,
      [category_code, category_name, parent_category_id, description, is_active, req.user?.id || 1, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Item category not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Item category updated successfully'
    });
  } catch (error) {
    console.error('Error updating item category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update item category',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// ============================================================================
// WAREHOUSES
// ============================================================================

export const getWarehouses = async (req: Request, res: Response) => {
  try {
    const { is_active } = req.query;
    
    let query = `
      SELECT 
        w.*,
        (SELECT COUNT(DISTINCT sl.item_id) FROM inventory.stock_levels sl WHERE sl.warehouse_id = w.warehouse_id) as item_count,
        (SELECT SUM(sl.total_value) FROM inventory.stock_levels sl WHERE sl.warehouse_id = w.warehouse_id) as total_inventory_value
      FROM inventory.warehouses w
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    if (is_active !== undefined) {
      params.push(is_active === 'true');
      query += ` AND w.is_active = $${params.length}`;
    }
    
    query += ` ORDER BY w.warehouse_code`;
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching warehouses:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch warehouses',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const createWarehouse = async (req: Request, res: Response) => {
  try {
    const {
      warehouse_code,
      warehouse_name,
      warehouse_type,
      address_line1,
      address_line2,
      city,
      state_province,
      postal_code,
      country,
      phone,
      email,
      manager_name,
      is_active = true
    } = req.body;
    
    const result = await pool.query(
      `INSERT INTO warehouses (
        warehouse_code, warehouse_name, warehouse_type, address_line1, address_line2,
        city, state_province, postal_code, country, phone, email, manager_name,
        is_active, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [warehouse_code, warehouse_name, warehouse_type, address_line1, address_line2,
       city, state_province, postal_code, country, phone, email, manager_name,
       is_active, req.user?.id || 1]
    );
    
    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Warehouse created successfully'
    });
  } catch (error) {
    console.error('Error creating warehouse:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create warehouse',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const updateWarehouse = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateFields = req.body;
    
    const result = await pool.query(
      `UPDATE warehouses 
      SET warehouse_code = $1, warehouse_name = $2, warehouse_type = $3,
          address_line1 = $4, address_line2 = $5, city = $6,
          state_province = $7, postal_code = $8, country = $9,
          phone = $10, email = $11, manager_name = $12, is_active = $13,
          updated_at = CURRENT_TIMESTAMP, updated_by = $14
      WHERE warehouse_id = $15
      RETURNING *`,
      [updateFields.warehouse_code, updateFields.warehouse_name, updateFields.warehouse_type,
       updateFields.address_line1, updateFields.address_line2, updateFields.city,
       updateFields.state_province, updateFields.postal_code, updateFields.country,
       updateFields.phone, updateFields.email, updateFields.manager_name, updateFields.is_active,
       req.user?.id || 1, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Warehouse not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Warehouse updated successfully'
    });
  } catch (error) {
    console.error('Error updating warehouse:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update warehouse',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// ============================================================================
// ITEMS (Master Data)
// ============================================================================

export const getItems = async (req: Request, res: Response) => {
  try {
    const { is_active, search } = req.query;
    
    let query = `
      SELECT 
        item_id,
        item_code,
        item_name,
        description,
        unit_of_measure,
        reorder_level,
        reorder_quantity,
        is_active,
        created_at,
        updated_at
      FROM inventory_items
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    if (is_active !== undefined) {
      params.push(is_active === 'true');
      query += ` AND is_active = $${params.length}`;
    }
    
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (item_code ILIKE $${params.length} OR item_name ILIKE $${params.length})`;
    }
    
    query += ` ORDER BY item_code`;
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch items',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getItemById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `SELECT 
        i.*,
        ic.category_name,
        u.uom_code,
        u.uom_name
      FROM inventory.items i
      LEFT JOIN inventory.item_categories ic ON i.category_id = ic.category_id
      LEFT JOIN units_of_measure u ON i.base_uom_id = u.uom_id
      WHERE i.item_id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch item',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const createItem = async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const {
      item_code,
      item_name,
      description,
      category_id,
      item_type,
      base_uom_id,
      valuation_method = 'Weighted Average',
      standard_cost = 0,
      reorder_level = 0,
      reorder_quantity = 0,
      minimum_stock_level = 0,
      maximum_stock_level = 0,
      lead_time_days = 0,
      inventory_account_id,
      cogs_account_id,
      sales_account_id,
      barcode,
      sku,
      is_active = true,
      is_purchasable = true,
      is_saleable = true
    } = req.body;
    
    // Create item
    const itemResult = await client.query(
      `INSERT INTO items (
        item_code, item_name, description, category_id, item_type, base_uom_id,
        valuation_method, standard_cost, reorder_level, reorder_quantity,
        minimum_stock_level, maximum_stock_level, lead_time_days,
        inventory_account_id, cogs_account_id, sales_account_id,
        barcode, sku, is_active, is_purchasable, is_saleable, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      RETURNING *`,
      [item_code, item_name, description, category_id, item_type, base_uom_id,
       valuation_method, standard_cost, reorder_level, reorder_quantity,
       minimum_stock_level, maximum_stock_level, lead_time_days,
       inventory_account_id, cogs_account_id, sales_account_id,
       barcode, sku, is_active, is_purchasable, is_saleable, req.user?.id || 1]
    );
    
    const item = itemResult.rows[0];
    
    // Create stock levels for all active warehouses
    const warehousesResult = await client.query(
      `SELECT warehouse_id FROM inventory.warehouses WHERE is_active = true`
    );
    
    for (const warehouse of warehousesResult.rows) {
      await client.query(
        `INSERT INTO stock_levels (item_id, warehouse_id, on_hand_quantity, available_quantity)
        VALUES ($1, $2, 0, 0)`,
        [item.item_id, warehouse.warehouse_id]
      );
    }
    
    await client.query('COMMIT');
    
    res.status(201).json({
      success: true,
      data: item,
      message: 'Item created successfully'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create item',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    client.release();
  }
};

export const updateItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateFields = req.body;
    
    const result = await pool.query(
      `UPDATE items 
      SET item_code = $1, item_name = $2, description = $3, category_id = $4,
          item_type = $5, base_uom_id = $6, valuation_method = $7,
          standard_cost = $8, reorder_level = $9, reorder_quantity = $10,
          minimum_stock_level = $11, maximum_stock_level = $12, lead_time_days = $13,
          inventory_account_id = $14, cogs_account_id = $15, sales_account_id = $16,
          barcode = $17, sku = $18, is_active = $19, is_purchasable = $20,
          is_saleable = $21, updated_at = CURRENT_TIMESTAMP, updated_by = $22
      WHERE item_id = $23
      RETURNING *`,
      [updateFields.item_code, updateFields.item_name, updateFields.description, updateFields.category_id,
       updateFields.item_type, updateFields.base_uom_id, updateFields.valuation_method,
       updateFields.standard_cost, updateFields.reorder_level, updateFields.reorder_quantity,
       updateFields.minimum_stock_level, updateFields.maximum_stock_level, updateFields.lead_time_days,
       updateFields.inventory_account_id, updateFields.cogs_account_id, updateFields.sales_account_id,
       updateFields.barcode, updateFields.sku, updateFields.is_active, updateFields.is_purchasable,
       updateFields.is_saleable, req.user?.id || 1, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Item updated successfully'
    });
  } catch (error) {
    console.error('Error updating item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update item',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// ============================================================================
// STOCK LEVELS
// ============================================================================

export const getStockLevels = async (req: Request, res: Response) => {
  try {
    const { item_id, warehouse_id } = req.query;
    
    const result = await pool.query(
      `SELECT 
        i.item_id,
        i.item_code,
        i.item_name,
        i.unit_of_measure,
        COALESCE(SUM(CASE WHEN m.movement_type = 'IN' THEN m.quantity ELSE 0 END), 0) as total_in,
        COALESCE(SUM(CASE WHEN m.movement_type = 'OUT' THEN m.quantity ELSE 0 END), 0) as total_out,
        COALESCE(SUM(CASE WHEN m.movement_type = 'IN' THEN m.quantity ELSE -m.quantity END), 0) as quantity_on_hand,
        i.reorder_level,
        i.reorder_quantity,
        i.is_active,
        CASE 
          WHEN COALESCE(SUM(CASE WHEN m.movement_type = 'IN' THEN m.quantity ELSE -m.quantity END), 0) <= i.reorder_level THEN 'LOW_STOCK'
          WHEN COALESCE(SUM(CASE WHEN m.movement_type = 'IN' THEN m.quantity ELSE -m.quantity END), 0) = 0 THEN 'OUT_OF_STOCK'
          ELSE 'IN_STOCK'
        END as stock_status
      FROM inventory_items i
      LEFT JOIN inventory_movements m ON i.item_id = m.item_id
      WHERE ($1::INTEGER IS NULL OR i.item_id = $1)
      GROUP BY i.item_id, i.item_code, i.item_name, i.unit_of_measure, i.reorder_level, i.reorder_quantity, i.is_active
      ORDER BY i.item_code`,
      [item_id || null]
    );
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching stock levels:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stock levels',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getStockByItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `SELECT 
        i.item_id,
        i.item_code,
        i.item_name,
        i.unit_of_measure,
        COALESCE(SUM(CASE WHEN m.movement_type = 'IN' THEN m.quantity ELSE 0 END), 0) as total_in,
        COALESCE(SUM(CASE WHEN m.movement_type = 'OUT' THEN m.quantity ELSE 0 END), 0) as total_out,
        COALESCE(SUM(CASE WHEN m.movement_type = 'IN' THEN m.quantity ELSE -m.quantity END), 0) as quantity_on_hand,
        i.reorder_level,
        i.is_active
      FROM inventory_items i
      LEFT JOIN inventory_movements m ON i.item_id = m.item_id
      WHERE i.item_id = $1
      GROUP BY i.item_id, i.item_code, i.item_name, i.unit_of_measure, i.reorder_level, i.is_active`,
      [id]
    );
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching stock by item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stock by item',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// ============================================================================
// STOCK MOVEMENTS
// ============================================================================

export const getStockMovements = async (req: Request, res: Response) => {
  try {
    const { item_id, warehouse_id, movement_type, start_date, end_date } = req.query;
    
    let query = `SELECT * FROM inventory.v_stock_movement_history WHERE 1=1`;
    const params: any[] = [];
    
    if (item_id) {
      params.push(item_id);
      query += ` AND item_id = $${params.length}`;
    }
    
    if (warehouse_id) {
      params.push(warehouse_id);
      query += ` AND warehouse_id = $${params.length}`;
    }
    
    if (movement_type) {
      params.push(movement_type);
      query += ` AND movement_type = $${params.length}`;
    }
    
    if (start_date) {
      params.push(start_date);
      query += ` AND movement_date >= $${params.length}`;
    }
    
    if (end_date) {
      params.push(end_date);
      query += ` AND movement_date <= $${params.length}`;
    }
    
    query += ` ORDER BY movement_date DESC LIMIT 1000`;
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching stock movements:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stock movements',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const createStockMovement = async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const {
      movement_type,
      item_id,
      warehouse_id,
      quantity,
      uom_id,
      unit_cost = 0,
      reference_type,
      reference_id,
      reference_number,
      reason,
      notes
    } = req.body;
    
    // Generate movement number
    const movementNumberResult = await client.query(
      `SELECT COALESCE(MAX(CAST(SUBSTRING(movement_number FROM 5) AS INTEGER)), 0) + 1 as next_number
      FROM inventory.stock_movements 
      WHERE movement_number LIKE 'SM-%'`
    );
    const nextNumber = movementNumberResult.rows[0].next_number;
    const movement_number = `SM-${String(nextNumber).padStart(6, '0')}`;
    
    const total_value = quantity * unit_cost;
    
    // Create stock movement
    const movementResult = await client.query(
      `INSERT INTO stock_movements (
        movement_number, movement_date, movement_type, item_id, warehouse_id,
        quantity, uom_id, unit_cost, total_value,
        reference_type, reference_id, reference_number,
        reason, notes, status, created_by
      ) VALUES ($1, CURRENT_TIMESTAMP, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'Draft', $14)
      RETURNING *`,
      [movement_number, movement_type, item_id, warehouse_id, quantity, uom_id,
       unit_cost, total_value, reference_type, reference_id, reference_number,
       reason, notes, req.user?.id || 1]
    );
    
    await client.query('COMMIT');
    
    res.status(201).json({
      success: true,
      data: movementResult.rows[0],
      message: 'Stock movement created successfully'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating stock movement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create stock movement',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    client.release();
  }
};

export const postStockMovement = async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    
    // Get movement details
    const movementResult = await client.query(
      `SELECT * FROM inventory.stock_movements WHERE movement_id = $1 AND status = 'Draft'`,
      [id]
    );
    
    if (movementResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Stock movement not found or already posted'
      });
    }
    
    const movement = movementResult.rows[0];
    
    // Update stock level
    await updateStockLevel(client, movement.item_id, movement.warehouse_id, movement.quantity, movement.unit_cost);
    
    // Update movement status
    await client.query(
      `UPDATE stock_movements 
      SET status = 'Posted', posting_date = CURRENT_DATE, updated_at = CURRENT_TIMESTAMP
      WHERE movement_id = $1`,
      [id]
    );
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: 'Stock movement posted successfully'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error posting stock movement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to post stock movement',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    client.release();
  }
};

// ============================================================================
// STOCK ADJUSTMENTS
// ============================================================================

export const getStockAdjustments = async (req: Request, res: Response) => {
  try {
    const { warehouse_id, status } = req.query;
    
    let query = `
      SELECT 
        sa.*,
        w.warehouse_code,
        w.warehouse_name,
        (SELECT COUNT(*) FROM inventory.stock_adjustment_lines WHERE adjustment_id = sa.adjustment_id) as line_count
      FROM inventory.stock_adjustments sa
      JOIN inventory.warehouses w ON sa.warehouse_id = w.warehouse_id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    if (warehouse_id) {
      params.push(warehouse_id);
      query += ` AND sa.warehouse_id = $${params.length}`;
    }
    
    if (status) {
      params.push(status);
      query += ` AND sa.status = $${params.length}`;
    }
    
    query += ` ORDER BY sa.adjustment_date DESC, sa.adjustment_number DESC`;
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching stock adjustments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stock adjustments',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getStockAdjustmentById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const headerResult = await pool.query(
      `SELECT 
        sa.*,
        w.warehouse_code,
        w.warehouse_name
      FROM inventory.stock_adjustments sa
      JOIN inventory.warehouses w ON sa.warehouse_id = w.warehouse_id
      WHERE sa.adjustment_id = $1`,
      [id]
    );
    
    if (headerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Stock adjustment not found'
      });
    }
    
    const linesResult = await pool.query(
      `SELECT 
        sal.*,
        i.item_code,
        i.item_name,
        u.uom_code
      FROM inventory.stock_adjustment_lines sal
      JOIN inventory.items i ON sal.item_id = i.item_id
      LEFT JOIN units_of_measure u ON sal.uom_id = u.uom_id
      WHERE sal.adjustment_id = $1
      ORDER BY sal.line_number`,
      [id]
    );
    
    res.json({
      success: true,
      data: {
        header: headerResult.rows[0],
        lines: linesResult.rows
      }
    });
  } catch (error) {
    console.error('Error fetching stock adjustment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stock adjustment',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const createStockAdjustment = async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const {
      adjustment_date,
      adjustment_type,
      warehouse_id,
      reason,
      notes,
      lines
    } = req.body;
    
    // Generate adjustment number
    const adjNumberResult = await client.query(
      `SELECT COALESCE(MAX(CAST(SUBSTRING(adjustment_number FROM 5) AS INTEGER)), 0) + 1 as next_number
      FROM inventory.stock_adjustments 
      WHERE adjustment_number LIKE 'ADJ-%'`
    );
    const nextNumber = adjNumberResult.rows[0].next_number;
    const adjustment_number = `ADJ-${String(nextNumber).padStart(6, '0')}`;
    
    // Create adjustment header
    const headerResult = await client.query(
      `INSERT INTO stock_adjustments (
        adjustment_number, adjustment_date, adjustment_type, warehouse_id,
        reason, notes, status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, 'Draft', $7)
      RETURNING *`,
      [adjustment_number, adjustment_date, adjustment_type, warehouse_id, reason, notes, req.user?.id || 1]
    );
    
    const adjustment = headerResult.rows[0];
    let total_adjustment_value = 0;
    
    // Create adjustment lines
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const adjustment_value = line.adjustment_quantity * line.unit_cost;
      total_adjustment_value += adjustment_value;
      
      await client.query(
        `INSERT INTO stock_adjustment_lines (
          adjustment_id, line_number, item_id, system_quantity, counted_quantity,
          adjustment_quantity, uom_id, unit_cost, adjustment_value, reason, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [adjustment.adjustment_id, i + 1, line.item_id, line.system_quantity,
         line.counted_quantity, line.adjustment_quantity, line.uom_id,
         line.unit_cost, adjustment_value, line.reason, line.notes]
      );
    }
    
    // Update total
    await client.query(
      `UPDATE stock_adjustments SET total_adjustment_value = $1 WHERE adjustment_id = $2`,
      [total_adjustment_value, adjustment.adjustment_id]
    );
    
    await client.query('COMMIT');
    
    res.status(201).json({
      success: true,
      data: adjustment,
      message: 'Stock adjustment created successfully'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating stock adjustment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create stock adjustment',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    client.release();
  }
};

export const postStockAdjustment = async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    
    // Get adjustment header
    const headerResult = await client.query(
      `SELECT * FROM inventory.stock_adjustments WHERE adjustment_id = $1 AND status = 'Draft'`,
      [id]
    );
    
    if (headerResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Stock adjustment not found or already posted'
      });
    }
    
    const adjustment = headerResult.rows[0];
    
    // Get adjustment lines
    const linesResult = await client.query(
      `SELECT * FROM inventory.stock_adjustment_lines WHERE adjustment_id = $1 ORDER BY line_number`,
      [id]
    );
    
    // Post each line to stock movements and update stock levels
    for (const line of linesResult.rows) {
      // Create stock movement
      const movementNumberResult = await client.query(
        `SELECT COALESCE(MAX(CAST(SUBSTRING(movement_number FROM 5) AS INTEGER)), 0) + 1 as next_number
        FROM inventory.stock_movements 
        WHERE movement_number LIKE 'SM-%'`
      );
      const nextNumber = movementNumberResult.rows[0].next_number;
      const movement_number = `SM-${String(nextNumber).padStart(6, '0')}`;
      
      await client.query(
        `INSERT INTO stock_movements (
          movement_number, movement_date, movement_type, item_id, warehouse_id,
          quantity, uom_id, unit_cost, total_value, reference_type, reference_id,
          reference_number, reason, status, posting_date, created_by
        ) VALUES ($1, $2, 'Adjustment', $3, $4, $5, $6, $7, $8, 'Adjustment', $9, $10, $11, 'Posted', CURRENT_DATE, $12)`,
        [movement_number, adjustment.adjustment_date, line.item_id, adjustment.warehouse_id,
         line.adjustment_quantity, line.uom_id, line.unit_cost, line.adjustment_value,
         adjustment.adjustment_id, adjustment.adjustment_number, line.reason, req.user?.id || 1]
      );
      
      // Update stock level
      await updateStockLevel(client, line.item_id, adjustment.warehouse_id, line.adjustment_quantity, line.unit_cost);
    }
    
    // Update adjustment status
    await client.query(
      `UPDATE stock_adjustments 
      SET status = 'Posted', posting_date = CURRENT_DATE, 
          approved_by = $1, approved_at = CURRENT_TIMESTAMP
      WHERE adjustment_id = $2`,
      [req.user?.id || 1, id]
    );
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: 'Stock adjustment posted successfully'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error posting stock adjustment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to post stock adjustment',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    client.release();
  }
};

// ============================================================================
// REORDER SUGGESTIONS
// ============================================================================

export const getReorderSuggestions = async (req: Request, res: Response) => {
  try {
    const { priority, status } = req.query;
    
    let query = `SELECT * FROM inventory.v_reorder_required WHERE 1=1`;
    const params: any[] = [];
    
    if (priority) {
      params.push(priority);
      query += ` AND priority = $${params.length}`;
    }
    
    query += ` ORDER BY priority DESC, shortage_quantity DESC`;
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching reorder suggestions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reorder suggestions',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const generateReorderSuggestions = async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Clear old pending suggestions
    await client.query(
      `DELETE FROM reorder_suggestions WHERE status = 'Pending'`
    );
    
    // Generate new suggestions from reorder view
    const result = await client.query(
      `INSERT INTO reorder_suggestions (
        item_id, warehouse_id, current_stock, reorder_level, suggested_quantity, priority
      )
      SELECT 
        item_id, warehouse_id, available_quantity, reorder_level,
        CASE 
          WHEN available_quantity <= 0 THEN reorder_quantity * 2
          ELSE reorder_quantity
        END as suggested_quantity,
        priority::VARCHAR
      FROM inventory.v_reorder_required
      RETURNING *`
    );
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      data: result.rows,
      message: `Generated ${result.rows.length} reorder suggestions`
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error generating reorder suggestions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate reorder suggestions',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    client.release();
  }
};

// ============================================================================
// DASHBOARD & REPORTS
// ============================================================================

export const getInventoryDashboard = async (req: Request, res: Response) => {
  try {
    // Summary stats
    const summaryResult = await pool.query(`
      SELECT 
        COUNT(DISTINCT i.item_id) as total_items,
        COUNT(DISTINCT CASE WHEN i.is_active = true THEN i.item_id END) as active_items,
        SUM(sl.on_hand_quantity) as total_on_hand,
        SUM(sl.total_value) as total_inventory_value,
        COUNT(DISTINCT CASE WHEN sl.available_quantity <= 0 THEN i.item_id END) as out_of_stock_items
      FROM inventory.items i
      LEFT JOIN inventory.stock_levels sl ON i.item_id = sl.item_id
    `);
    
    // Reorder required
    const reorderResult = await pool.query(`
      SELECT COUNT(*) as reorder_count FROM inventory.v_reorder_required
    `);
    
    // Stock by category
    const categoryResult = await pool.query(`
      SELECT 
        ic.category_name,
        COUNT(DISTINCT i.item_id) as item_count,
        SUM(sl.total_value) as category_value
      FROM inventory.items i
      LEFT JOIN inventory.item_categories ic ON i.category_id = ic.category_id
      LEFT JOIN inventory.stock_levels sl ON i.item_id = sl.item_id
      WHERE i.is_active = true
      GROUP BY ic.category_id, ic.category_name
      ORDER BY category_value DESC
    `);
    
    // Stock by warehouse
    const warehouseResult = await pool.query(`
      SELECT 
        w.warehouse_code,
        w.warehouse_name,
        COUNT(DISTINCT sl.item_id) as item_count,
        SUM(sl.total_value) as warehouse_value
      FROM inventory.warehouses w
      LEFT JOIN inventory.stock_levels sl ON w.warehouse_id = sl.warehouse_id
      WHERE w.is_active = true
      GROUP BY w.warehouse_id, w.warehouse_code, w.warehouse_name
      ORDER BY warehouse_value DESC
    `);
    
    // Recent movements
    const movementsResult = await pool.query(`
      SELECT * FROM inventory.v_stock_movement_history
      ORDER BY movement_date DESC
      LIMIT 10
    `);
    
    res.json({
      success: true,
      data: {
        summary: summaryResult.rows[0],
        reorderRequired: reorderResult.rows[0].reorder_count,
        byCategory: categoryResult.rows,
        byWarehouse: warehouseResult.rows,
        recentMovements: movementsResult.rows
      }
    });
  } catch (error) {
    console.error('Error fetching inventory dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inventory dashboard',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function updateStockLevel(
  client: PoolClient,
  itemId: number,
  warehouseId: number,
  quantity: number,
  unitCost: number
) {
  // Get current stock level
  const stockResult = await client.query(
    `SELECT * FROM inventory.stock_levels WHERE item_id = $1 AND warehouse_id = $2`,
    [itemId, warehouseId]
  );
  
  if (stockResult.rows.length === 0) {
    // Create new stock level
    await client.query(
      `INSERT INTO stock_levels (item_id, warehouse_id, on_hand_quantity, available_quantity, average_cost, total_value)
      VALUES ($1, $2, $3, $3, $4, $5)`,
      [itemId, warehouseId, quantity, unitCost, quantity * unitCost]
    );
  } else {
    const currentStock = stockResult.rows[0];
    const newOnHand = parseFloat(currentStock.on_hand_quantity) + quantity;
    const newValue = parseFloat(currentStock.total_value) + (quantity * unitCost);
    const newAvgCost = newOnHand !== 0 ? newValue / newOnHand : 0;
    const newAvailable = newOnHand - parseFloat(currentStock.allocated_quantity);
    
    await client.query(
      `UPDATE stock_levels 
      SET on_hand_quantity = $1, available_quantity = $2, average_cost = $3, total_value = $4,
          last_receipt_date = CASE WHEN $5 > 0 THEN CURRENT_TIMESTAMP ELSE last_receipt_date END,
          last_issue_date = CASE WHEN $5 < 0 THEN CURRENT_TIMESTAMP ELSE last_issue_date END,
          updated_at = CURRENT_TIMESTAMP
      WHERE item_id = $6 AND warehouse_id = $7`,
      [newOnHand, newAvailable, newAvgCost, newValue, quantity, itemId, warehouseId]
    );
  }
  
  // Update item average cost
  await client.query(
    `UPDATE items 
    SET average_cost = (SELECT AVG(average_cost) FROM inventory.stock_levels WHERE item_id = $1),
        updated_at = CURRENT_TIMESTAMP
    WHERE item_id = $1`,
    [itemId]
  );
}
