/**
 * Asset Management Routes
 * API endpoints for fixed assets, depreciation, disposals, transfers, and maintenance
 * IAS 16 compliant asset lifecycle management
 */

import { Router } from 'express';
import assetsController from '../controllers/assets.controller';
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

// Get depreciation schedule projection for asset
router.get('/assets/:asset_id/depreciation/schedule', assetsController.getDepreciationSchedule);

// Batch calculate depreciation for all assets
router.post('/assets/depreciation/batch', assetsController.batchCalculateDepreciation);

// Post depreciation to GL
router.post('/depreciation/post-to-gl', assetsController.postDepreciationToGL);

// ==================================================
// DISPOSAL WORKFLOWS (IAS 16.67-72)
// ==================================================

// Dispose asset (sale, scrapping, write-off)
router.post('/assets/:asset_id/dispose', assetsController.disposeAsset);

// ==================================================
// REVALUATION & IMPAIRMENT (IAS 16.31-42, IAS 36)
// ==================================================

// Get revaluation/impairment history
router.get('/assets/:asset_id/valuations', assetsController.getRevaluations);

// Record revaluation (IAS 16 revaluation model)
router.post('/assets/:asset_id/revaluations', assetsController.createRevaluation);

// Record impairment (IAS 36)
router.post('/assets/:asset_id/impairments', assetsController.createImpairment);

// ==================================================
// CAPITAL VS EXPENSE CLASSIFICATION (IAS 16.7-14)
// ==================================================

// Classify expenditure as capital or expense
router.post('/classify-expenditure', assetsController.classifyExpenditure);

export default router;
