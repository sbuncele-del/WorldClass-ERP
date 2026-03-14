/**
 * Take-on Balances Routes
 */
import { Router } from 'express';
import * as ctrl from '../controllers/take-on-balances.controller.v2';
import { tenantMiddleware, requireEntity } from '../middleware/tenant';

const router = Router();
router.use(tenantMiddleware);
router.use(requireEntity);

// Summary dashboard
router.get('/summary', ctrl.getSummary);

// GL opening balances
router.get('/gl', ctrl.getGLBalances);
router.post('/gl', ctrl.saveGLBalances);

// Customer opening balances (AR)
router.get('/customers', ctrl.getCustomerBalances);
router.post('/customers', ctrl.saveCustomerBalances);

// Supplier opening balances (AP)
router.get('/suppliers', ctrl.getSupplierBalances);
router.post('/suppliers', ctrl.saveSupplierBalances);

// Bank account opening balances
router.get('/bank-accounts', ctrl.getBankBalances);
router.post('/bank-accounts', ctrl.saveBankBalances);

// Validation & finalization
router.post('/validate', ctrl.validateBalances);
router.post('/finalize', ctrl.finalizeBalances);

export default router;
