/**
 * Xero Integration Routes
 * OAuth2 connect/callback/disconnect + manual sync against a tenant's Xero org.
 */
import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenant';
import {
  connectXero,
  xeroCallback,
  getXeroStatus,
  disconnectXero,
  syncXeroNow,
  recalculateXeroBalances,
  getXeroSyncHistory,
} from '../controllers/xero.controller';

const router = Router();

// Public - Xero's redirect carries no JWT, tenant identity comes from the
// signed state param verified inside the controller. Must be registered
// before the auth middleware below, and must never be behind it.
router.get('/callback', xeroCallback);

router.use(authenticateToken);
router.use(tenantMiddleware);

router.get('/connect', connectXero);
router.get('/status', getXeroStatus);
router.post('/disconnect', disconnectXero);
router.post('/sync', syncXeroNow);
router.post('/recalculate-balances', recalculateXeroBalances);
router.get('/sync-history', getXeroSyncHistory);

export default router;
