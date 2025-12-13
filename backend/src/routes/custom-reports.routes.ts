import express from 'express';
import {
  getReportTemplates,
  getReportTemplateById,
  createReportTemplate,
  updateReportTemplate,
  deleteReportTemplate,
  cloneReportTemplate,
  executeReport,
  getReportCategories,
  getPopularReports,
  getReportExecutions,
  toggleFavorite
} from '../controllers/custom-reports.controller';
import { tenantMiddleware } from '../middleware/tenant';

const router = express.Router();

// Apply tenant middleware to all custom report routes
router.use(tenantMiddleware);

// Report template routes
router.get('/templates', getReportTemplates);
router.get('/templates/:id', getReportTemplateById);
router.post('/templates', createReportTemplate);
router.put('/templates/:id', updateReportTemplate);
router.delete('/templates/:id', deleteReportTemplate);
router.post('/templates/:id/clone', cloneReportTemplate);
router.post('/templates/:id/favorite', toggleFavorite);

// Report execution routes
router.post('/templates/:id/execute', executeReport);
router.get('/executions', getReportExecutions);

// Utility routes
router.get('/categories', getReportCategories);
router.get('/popular', getPopularReports);

export default router;
