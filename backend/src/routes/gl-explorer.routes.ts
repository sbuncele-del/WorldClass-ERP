import { Router } from 'express';
import glExplorerController from '../controllers/gl-explorer.controller';

const router = Router();

// Advanced search
router.get('/search', glExplorerController.search.bind(glExplorerController));

// Account tree/hierarchy
router.get('/account-tree', glExplorerController.getAccountTree.bind(glExplorerController));

// Account drill-down
router.get('/account/:account_code/transactions', glExplorerController.getAccountDrillDown.bind(glExplorerController));

// Filter options for dropdowns
router.get('/filter-options', glExplorerController.getFilterOptions.bind(glExplorerController));

export default router;
