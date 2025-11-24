/**
 * Asset Management Routes
 */

import { Router } from 'express';
import assetsController from './controller';

const router = Router();

// Asset CRUD
router.post('/', assetsController.createAsset.bind(assetsController));
router.get('/', assetsController.listAssets.bind(assetsController));
router.get('/:id', assetsController.getAsset.bind(assetsController));

// Depreciation
router.post('/depreciation/calculate', assetsController.calculateDepreciation.bind(assetsController));
router.get('/:id/depreciation', assetsController.getDepreciationSchedule.bind(assetsController));

// Revaluation
router.post('/:id/revaluations', assetsController.createRevaluation.bind(assetsController));
router.post('/revaluations/:id/approve', assetsController.approveRevaluation.bind(assetsController));

export default router;
