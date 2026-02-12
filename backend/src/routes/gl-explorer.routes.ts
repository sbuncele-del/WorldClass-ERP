import { Router } from 'express';
import GLExplorerControllerV2 from '../controllers/gl-explorer.controller.v2';
import { tenantMiddleware } from '../middleware/tenant';

const router = Router();

// Apply tenant middleware to all GL explorer routes
router.use(tenantMiddleware);

// Advanced search
router.get('/search', GLExplorerControllerV2.search);

// Account summary (balances by account)
router.get('/account-summary', GLExplorerControllerV2.getAccountSummary);

// Account ledger (transactions for one account) - both URL patterns
router.get('/account-ledger/:accountCode', GLExplorerControllerV2.getAccountLedger);
router.get('/account/:account_code/transactions', GLExplorerControllerV2.getAccountLedger);

// Filter options for dropdowns
router.get('/filter-options', GLExplorerControllerV2.getFilterOptions);

// Export
router.post('/export', GLExplorerControllerV2.exportResults);

export default router;
