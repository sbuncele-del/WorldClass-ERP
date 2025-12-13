/**
 * INVENTORY MANAGEMENT CONTROLLER (Repository Pattern)
 * 
 * This controller demonstrates the proper multi-tenant pattern using repositories.
 * All data operations go through the repository which automatically handles tenant isolation.
 * 
 * IMPORTANT: This uses TenantRequest to get tenant context from middleware.
 */

import { Response } from 'express';
import { TenantRequest } from '../types';
import { TenantContext } from '../repositories/BaseRepository';
import {
  itemCategoryRepository,
  inventoryItemRepository,
  warehouseRepository,
  stockMovementRepository
} from '../repositories/inventory';

/**
 * Helper to extract tenant context from request
 * The tenantMiddleware ensures req.tenant is always present for protected routes
 */
function getTenantContext(req: TenantRequest): TenantContext {
  if (!req.tenant) {
    throw new Error('Tenant context not available');
  }
  return {
    tenantId: req.tenant.id,
    userId: req.user?.id
  };
}

// ============================================================================
// ITEM CATEGORIES
// ============================================================================

export const getItemCategories = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    const { is_active, search, page, limit } = req.query;
    
    let result;
    
    if (search) {
      // Search categories
      result = await itemCategoryRepository.search(ctx, search as string, {
        page: Number(page) || 1,
        limit: Number(limit) || 50
      });
    } else if (is_active === 'true') {
      // Get active categories only
      const categories = await itemCategoryRepository.getActiveCategories(ctx);
      result = { data: categories, pagination: { page: 1, limit: categories.length, total: categories.length, totalPages: 1 } };
    } else {
      // Get all categories with pagination
      result = await itemCategoryRepository.findAll(ctx, {}, {
        page: Number(page) || 1,
        limit: Number(limit) || 50,
        sortBy: 'name',
        sortOrder: 'ASC'
      });
    }
    
    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
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

export const getItemCategoryTree = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    const tree = await itemCategoryRepository.getCategoryTree(ctx);
    
    res.json({
      success: true,
      data: tree
    });
  } catch (error) {
    console.error('Error fetching category tree:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch category tree',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getItemCategory = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    const { id } = req.params;
    
    const category = await itemCategoryRepository.findById(ctx, id);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    res.json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch category',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const createItemCategory = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    const { code, name, description, parent_id, is_active = true } = req.body;
    
    // Check if code is unique
    const isUnique = await itemCategoryRepository.isCodeUnique(ctx, code);
    if (!isUnique) {
      return res.status(400).json({
        success: false,
        message: 'Category code already exists'
      });
    }
    
    const category = await itemCategoryRepository.create(ctx, {
      code,
      name,
      description,
      parent_id,
      is_active
    });
    
    res.status(201).json({
      success: true,
      data: category,
      message: 'Category created successfully'
    });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create category',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const updateItemCategory = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    const { id } = req.params;
    const { code, name, description, parent_id, is_active } = req.body;
    
    // Check if code is unique (excluding this category)
    if (code) {
      const isUnique = await itemCategoryRepository.isCodeUnique(ctx, code, id);
      if (!isUnique) {
        return res.status(400).json({
          success: false,
          message: 'Category code already exists'
        });
      }
    }
    
    const category = await itemCategoryRepository.update(ctx, id, {
      code,
      name,
      description,
      parent_id,
      is_active
    });
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    res.json({
      success: true,
      data: category,
      message: 'Category updated successfully'
    });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update category',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const deleteItemCategory = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    const { id } = req.params;
    
    // Check if category has items
    const items = await inventoryItemRepository.getByCategory(ctx, id);
    if (items.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete category with associated items'
      });
    }
    
    // Check if category has subcategories
    const subcategories = await itemCategoryRepository.getSubcategories(ctx, id);
    if (subcategories.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete category with subcategories'
      });
    }
    
    const deleted = await itemCategoryRepository.delete(ctx, id);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete category',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// ============================================================================
// INVENTORY ITEMS
// ============================================================================

export const getItems = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    const { search, category_id, is_active, page, limit, warehouse_id } = req.query;
    
    if (search) {
      const result = await inventoryItemRepository.search(
        ctx,
        search as string,
        {
          categoryId: category_id as string,
          isActive: is_active === 'true'
        },
        {
          page: Number(page) || 1,
          limit: Number(limit) || 50
        }
      );
      
      return res.json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });
    }
    
    // Get items with stock levels
    const result = await inventoryItemRepository.getItemsWithStock(
      ctx,
      warehouse_id as string,
      {
        page: Number(page) || 1,
        limit: Number(limit) || 50
      }
    );
    
    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
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

export const getItem = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    const { id } = req.params;
    
    const item = await inventoryItemRepository.findById(ctx, id);
    
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }
    
    // Get stock levels for this item
    const stockLevels = await inventoryItemRepository.getStockLevels(ctx, id);
    
    res.json({
      success: true,
      data: {
        ...item,
        stock_levels: stockLevels
      }
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

export const createItem = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    const itemData = req.body;
    
    // Check if code is unique
    const isUnique = await inventoryItemRepository.isCodeUnique(ctx, itemData.code);
    if (!isUnique) {
      return res.status(400).json({
        success: false,
        message: 'Item code already exists'
      });
    }
    
    const item = await inventoryItemRepository.create(ctx, itemData);
    
    res.status(201).json({
      success: true,
      data: item,
      message: 'Item created successfully'
    });
  } catch (error) {
    console.error('Error creating item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create item',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const updateItem = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    const { id } = req.params;
    const itemData = req.body;
    
    // Check if code is unique (excluding this item)
    if (itemData.code) {
      const isUnique = await inventoryItemRepository.isCodeUnique(ctx, itemData.code, id);
      if (!isUnique) {
        return res.status(400).json({
          success: false,
          message: 'Item code already exists'
        });
      }
    }
    
    const item = await inventoryItemRepository.update(ctx, id, itemData);
    
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }
    
    res.json({
      success: true,
      data: item,
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

export const deleteItem = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    const { id } = req.params;
    
    // Check if item has stock
    const stockLevels = await inventoryItemRepository.getStockLevels(ctx, id);
    const totalStock = stockLevels.reduce((sum, sl) => sum + sl.quantity_on_hand, 0);
    
    if (totalStock > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete item with stock on hand'
      });
    }
    
    const deleted = await inventoryItemRepository.delete(ctx, id);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Item deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete item',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getLowStockItems = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    const items = await inventoryItemRepository.getLowStockItems(ctx);
    
    res.json({
      success: true,
      data: items
    });
  } catch (error) {
    console.error('Error fetching low stock items:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch low stock items',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// ============================================================================
// WAREHOUSES
// ============================================================================

export const getWarehouses = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    const { is_active } = req.query;
    
    if (is_active === 'true') {
      const warehouses = await warehouseRepository.getActiveWarehouses(ctx);
      return res.json({ success: true, data: warehouses });
    }
    
    const result = await warehouseRepository.findAll(ctx);
    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
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

export const getWarehouse = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    const { id } = req.params;
    
    const warehouse = await warehouseRepository.getWarehouseWithStock(ctx, id);
    
    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: 'Warehouse not found'
      });
    }
    
    res.json({
      success: true,
      data: warehouse
    });
  } catch (error) {
    console.error('Error fetching warehouse:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch warehouse',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const createWarehouse = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    const warehouseData = req.body;
    
    // Check if code is unique
    const isUnique = await warehouseRepository.isCodeUnique(ctx, warehouseData.code);
    if (!isUnique) {
      return res.status(400).json({
        success: false,
        message: 'Warehouse code already exists'
      });
    }
    
    const warehouse = await warehouseRepository.create(ctx, warehouseData);
    
    res.status(201).json({
      success: true,
      data: warehouse,
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

export const setDefaultWarehouse = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    const { id } = req.params;
    
    await warehouseRepository.setDefaultWarehouse(ctx, id);
    
    res.json({
      success: true,
      message: 'Default warehouse updated successfully'
    });
  } catch (error) {
    console.error('Error setting default warehouse:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to set default warehouse',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// ============================================================================
// STOCK MOVEMENTS
// ============================================================================

export const getStockMovements = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    const { item_id, warehouse_id, start_date, end_date, movement_type, page, limit } = req.query;
    
    if (start_date && end_date) {
      const result = await stockMovementRepository.getMovementsByDateRange(
        ctx,
        new Date(start_date as string),
        new Date(end_date as string),
        {
          itemId: item_id as string,
          warehouseId: warehouse_id as string,
          movementType: movement_type as any
        },
        {
          page: Number(page) || 1,
          limit: Number(limit) || 50
        }
      );
      
      return res.json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });
    }
    
    if (item_id) {
      const result = await stockMovementRepository.getItemMovements(ctx, item_id as string);
      return res.json({ success: true, data: result.data, pagination: result.pagination });
    }
    
    if (warehouse_id) {
      const result = await stockMovementRepository.getWarehouseMovements(ctx, warehouse_id as string);
      return res.json({ success: true, data: result.data, pagination: result.pagination });
    }
    
    const result = await stockMovementRepository.findAll(ctx, {}, {
      page: Number(page) || 1,
      limit: Number(limit) || 50,
      sortBy: 'created_at',
      sortOrder: 'DESC'
    });
    
    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
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

export const createStockReceipt = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    const { item_id, warehouse_id, quantity, reference_type, reference_id, unit_cost, batch_number, notes } = req.body;
    
    const movement = await stockMovementRepository.createReceipt(ctx, {
      itemId: item_id,
      warehouseId: warehouse_id,
      quantity,
      referenceType: reference_type,
      referenceId: reference_id,
      unitCost: unit_cost,
      batchNumber: batch_number,
      notes
    });
    
    // Update stock level
    await inventoryItemRepository.updateStockLevel(ctx, item_id, warehouse_id, quantity, 'Receipt');
    
    res.status(201).json({
      success: true,
      data: movement,
      message: 'Stock receipt recorded successfully'
    });
  } catch (error) {
    console.error('Error creating stock receipt:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create stock receipt',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const createStockIssue = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    const { item_id, warehouse_id, quantity, reference_type, reference_id, reason, notes } = req.body;
    
    // Check if sufficient stock
    const stockLevels = await inventoryItemRepository.getStockLevels(ctx, item_id);
    const warehouseStock = stockLevels.find(sl => sl.warehouse_id === warehouse_id);
    
    if (!warehouseStock || warehouseStock.quantity_available < quantity) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient stock available'
      });
    }
    
    const movement = await stockMovementRepository.createIssue(ctx, {
      itemId: item_id,
      warehouseId: warehouse_id,
      quantity,
      referenceType: reference_type,
      referenceId: reference_id,
      reason,
      notes
    });
    
    // Update stock level (negative quantity)
    await inventoryItemRepository.updateStockLevel(ctx, item_id, warehouse_id, -quantity, 'Issue');
    
    res.status(201).json({
      success: true,
      data: movement,
      message: 'Stock issue recorded successfully'
    });
  } catch (error) {
    console.error('Error creating stock issue:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create stock issue',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const createStockTransfer = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    const { item_id, from_warehouse_id, to_warehouse_id, quantity, notes } = req.body;
    
    // Check if sufficient stock
    const stockLevels = await inventoryItemRepository.getStockLevels(ctx, item_id);
    const sourceStock = stockLevels.find(sl => sl.warehouse_id === from_warehouse_id);
    
    if (!sourceStock || sourceStock.quantity_available < quantity) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient stock in source warehouse'
      });
    }
    
    const { outMovement, inMovement } = await stockMovementRepository.createTransfer(ctx, {
      itemId: item_id,
      fromWarehouseId: from_warehouse_id,
      toWarehouseId: to_warehouse_id,
      quantity,
      notes
    });
    
    res.status(201).json({
      success: true,
      data: { outMovement, inMovement },
      message: 'Stock transfer completed successfully'
    });
  } catch (error) {
    console.error('Error creating stock transfer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create stock transfer',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getMovementSummary = async (req: TenantRequest, res: Response) => {
  try {
    const ctx = getTenantContext(req);
    const { start_date, end_date } = req.query;
    
    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }
    
    const summary = await stockMovementRepository.getMovementSummary(
      ctx,
      new Date(start_date as string),
      new Date(end_date as string)
    );
    
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error fetching movement summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch movement summary',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
