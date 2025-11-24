import { Router } from 'express';
import { ImportEntriesController } from '../controllers/import-entries.controller';

const router = Router();

// Validate import file
router.post('/validate', ImportEntriesController.validateImport);

// Import journal entries
router.post('/import', ImportEntriesController.importEntries);

// Get CSV template
router.get('/template', ImportEntriesController.getTemplate);

// Get import history
router.get('/history', ImportEntriesController.getImportHistory);

export default router;
