/**
 * INVENTORY MANAGEMENT ROUTES
 * 
 * All routes for inventory module.
 * NOW USING REPOSITORY PATTERN (v2) for automatic tenant isolation.
 */

import express from 'express';
// Use v2 controller with Repository Pattern for multi-tenant safety
import * as inventoryController from '../controllers/inventory.controller.v2';
// Keep legacy controller for endpoints not yet migrated
import * as legacyController from '../controllers/inventory.controller';
import * as inventoryWorkspaceController from '../modules/inventory/controllers/inventory.workspace.controller';
import { tenantMiddleware } from '../middleware/tenant';

const router = express.Router();

// Apply tenant middleware to all inventory routes
router.use(tenantMiddleware);

// ============================================================================
// WORKSPACE
// ============================================================================
router.get('/workspace', inventoryWorkspaceController.getInventoryWorkspace);

// ============================================================================
// ITEM CATEGORIES (v2 - Repository Pattern)
// ============================================================================
router.get('/categories', inventoryController.getItemCategories);
router.get('/categories/tree', inventoryController.getItemCategoryTree);
router.get('/categories/:id', inventoryController.getItemCategory);
router.post('/categories', inventoryController.createItemCategory);
router.put('/categories/:id', inventoryController.updateItemCategory);
router.delete('/categories/:id', inventoryController.deleteItemCategory);

// ============================================================================
// WAREHOUSES (v2 - Repository Pattern)
// ============================================================================
router.get('/warehouses', inventoryController.getWarehouses);
router.get('/warehouses/:id', inventoryController.getWarehouse);
router.post('/warehouses', inventoryController.createWarehouse);
router.put('/warehouses/:id/default', inventoryController.setDefaultWarehouse);

// ============================================================================
// ITEMS (v2 - Repository Pattern)
// ============================================================================
router.get('/items', inventoryController.getItems);
router.get('/items/low-stock', inventoryController.getLowStockItems);
router.get('/items/:id', inventoryController.getItem);
router.post('/items', inventoryController.createItem);
router.put('/items/:id', inventoryController.updateItem);
router.delete('/items/:id', inventoryController.deleteItem);

// ============================================================================
// STOCK LEVELS (Legacy - pending migration)
// ============================================================================
router.get('/stock-levels', legacyController.getStockLevels);

// ============================================================================
// STOCK MOVEMENTS (v2 - Repository Pattern)
// ============================================================================
router.get('/stock-movements', inventoryController.getStockMovements);
router.get('/stock-movements/summary', inventoryController.getMovementSummary);
router.post('/stock-movements/receipt', inventoryController.createStockReceipt);
router.post('/stock-movements/issue', inventoryController.createStockIssue);
router.post('/stock-movements/transfer', inventoryController.createStockTransfer);

// Legacy endpoints (pending migration)
router.post('/stock-movements', legacyController.createStockMovement);
router.post('/stock-movements/:id/post', legacyController.postStockMovement);

// ============================================================================
// STOCK ADJUSTMENTS (Legacy - pending migration)
// ============================================================================
router.get('/stock-adjustments', legacyController.getStockAdjustments);
router.get('/stock-adjustments/:id', legacyController.getStockAdjustmentById);
router.post('/stock-adjustments', legacyController.createStockAdjustment);
router.post('/stock-adjustments/:id/post', legacyController.postStockAdjustment);

// ============================================================================
// STOCK TAKES (Legacy - pending migration)
// ============================================================================
router.get('/stock-takes', legacyController.getStockTakes);
router.post('/stock-takes', legacyController.createStockTake);
router.post('/stock-takes/:id/post', legacyController.postStockTake);

// ============================================================================
// BATCHES / SERIALS (Legacy - pending migration)
// ============================================================================
router.get('/batches', legacyController.getStockBatches);
router.get('/serials', legacyController.getSerialNumbers);

// ============================================================================
// REORDER SUGGESTIONS (Legacy - pending migration)
// ============================================================================
router.get('/reorder-suggestions', legacyController.getReorderSuggestions);
router.post('/reorder-suggestions/generate', legacyController.generateReorderSuggestions);

// ============================================================================
// DASHBOARD (Legacy - pending migration)
// ============================================================================
router.get('/dashboard', legacyController.getInventoryDashboard);

export default router;
