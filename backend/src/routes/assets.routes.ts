/**
 * Asset Management Routes
 * API endpoints for fixed assets, depreciation, disposals, transfers, and maintenance
 */

import { Router } from 'express';
import * as assetsController from '../controllers/assets.controller';
import * as assetsWorkspaceController from '../modules/assets/controllers/assets.workspace.controller';

const router = Router();

// ==================================================
// WORKSPACE
// ==================================================
router.get('/workspace', assetsWorkspaceController.getAssetsWorkspace);

// ==================================================
// FIXED ASSETS
// ==================================================

// Get all assets (with filtering/pagination)
router.get('/assets', assetsController.getAllAssets);

// Get single asset by ID
router.get('/assets/:id', assetsController.getAssetById);

// Create new asset
router.post('/assets', assetsController.createAsset);

// Update asset
router.put('/assets/:id', assetsController.updateAsset);

// ==================================================
// DEPRECIATION
// ==================================================

// Calculate depreciation for specific asset and period
router.post('/assets/:id/depreciation/calculate', assetsController.calculateDepreciation);

// Batch calculate depreciation for all assets
router.post('/assets/depreciation/batch', assetsController.batchCalculateDepreciation);

export default router;
