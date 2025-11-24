/**
 * INVENTORY MANAGEMENT ROUTES
 * 
 * All routes for inventory module
 */

import express from 'express';
import * as inventoryController from '../controllers/inventory.controller';
import * as inventoryWorkspaceController from '../modules/inventory/controllers/inventory.workspace.controller';

const router = express.Router();

// ============================================================================
// WORKSPACE
// ============================================================================
router.get('/workspace', inventoryWorkspaceController.getInventoryWorkspace);

// ============================================================================
// ITEM CATEGORIES
// ============================================================================
router.get('/categories', inventoryController.getItemCategories);
router.post('/categories', inventoryController.createItemCategory);
router.put('/categories/:id', inventoryController.updateItemCategory);

// ============================================================================
// WAREHOUSES
// ============================================================================
router.get('/warehouses', inventoryController.getWarehouses);
router.post('/warehouses', inventoryController.createWarehouse);
router.put('/warehouses/:id', inventoryController.updateWarehouse);

// ============================================================================
// ITEMS
// ============================================================================
router.get('/items', inventoryController.getItems);
router.get('/items/:id', inventoryController.getItemById);
router.post('/items', inventoryController.createItem);
router.put('/items/:id', inventoryController.updateItem);
router.get('/items/:id/stock', inventoryController.getStockByItem);

// ============================================================================
// STOCK LEVELS
// ============================================================================
router.get('/stock-levels', inventoryController.getStockLevels);

// ============================================================================
// STOCK MOVEMENTS
// ============================================================================
router.get('/stock-movements', inventoryController.getStockMovements);
router.post('/stock-movements', inventoryController.createStockMovement);
router.post('/stock-movements/:id/post', inventoryController.postStockMovement);

// ============================================================================
// STOCK ADJUSTMENTS
// ============================================================================
router.get('/stock-adjustments', inventoryController.getStockAdjustments);
router.get('/stock-adjustments/:id', inventoryController.getStockAdjustmentById);
router.post('/stock-adjustments', inventoryController.createStockAdjustment);
router.post('/stock-adjustments/:id/post', inventoryController.postStockAdjustment);

// ============================================================================
// REORDER SUGGESTIONS
// ============================================================================
router.get('/reorder-suggestions', inventoryController.getReorderSuggestions);
router.post('/reorder-suggestions/generate', inventoryController.generateReorderSuggestions);

// ============================================================================
// DASHBOARD
// ============================================================================
router.get('/dashboard', inventoryController.getInventoryDashboard);

export default router;
