import { Router } from 'express';
import { AnnualFinancialStatementsController } from '../controllers/afs.controller.v2';
import { tenantMiddleware, requireEntity } from '../middleware/tenant';

const router = Router();

// Apply tenant middleware to all AFS routes
router.use(tenantMiddleware);
router.use(requireEntity);

// Generate complete Annual Financial Statements
router.get('/generate', AnnualFinancialStatementsController.generate);

export default router;
