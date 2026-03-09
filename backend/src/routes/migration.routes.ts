/**
 * Migration Routes — Data import from QuickBooks, Xero, Sage, Pastel
 * Handles file upload, validation, column mapping, and batch import.
 */
import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenant';
import multer from 'multer';
import MigrationController from '../controllers/migration.controller.v2';

const router = Router();
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.csv', '.xlsx', '.xls'];
    const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));
    cb(null, allowed.includes(ext));
  }
});

// All routes require authentication and tenant context
router.use(authenticateToken);
router.use(tenantMiddleware);

// Import data file (with column mappings)
router.post('/import', upload.single('file'), MigrationController.importData);

// Validate uploaded file
router.post('/validate', upload.single('file'), MigrationController.validateData);

// Get migration history
router.get('/history', MigrationController.getHistory);

// Get import templates/samples
router.get('/templates/:dataType', MigrationController.getTemplate);

// Get migration status
router.get('/status', MigrationController.getStatus);

export default router;
