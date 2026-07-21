/**
 * Entitlements Routes
 * Reports which product modules the current tenant can access.
 */

import { Router } from 'express';
import { tenantMiddleware } from '../middleware/tenant';
import { getEntitlements } from '../controllers/entitlements.controller';

const router = Router();

/**
 * GET /api/entitlements
 * Get the current tenant's product-module entitlements
 */
router.get('/', tenantMiddleware, getEntitlements);

export default router;
