import { Router } from 'express';
import auditTrailController from '../controllers/audit-trail.controller';

const router = Router();

// Get audit logs with filters
router.get('/', auditTrailController.getAuditLogs.bind(auditTrailController));

// Get single audit log
router.get('/:id', auditTrailController.getAuditLogById.bind(auditTrailController));

// Get entity history
router.get('/entity/:entity_type/:entity_id', auditTrailController.getEntityHistory.bind(auditTrailController));

// Get user activity
router.get('/user/:user_id/activity', auditTrailController.getUserActivity.bind(auditTrailController));

// Get audit summary statistics
router.get('/summary/statistics', auditTrailController.getAuditSummary.bind(auditTrailController));

// Create manual audit log
router.post('/', auditTrailController.createAuditLog.bind(auditTrailController));

// Export audit logs to CSV
router.get('/export/csv', auditTrailController.exportAuditLogs.bind(auditTrailController));

export default router;
