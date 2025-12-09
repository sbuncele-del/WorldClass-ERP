import express from 'express';
import { 
  getDashboardStats, 
  getDimensionBreakdown, 
  getRecentEntries,
  getDashboardMetrics,
  getRecentActivity,
  getInventoryAlerts,
  getTopProducts
} from '../controllers/dashboard.controller';
import DashboardController from '../controllers/dashboard.controller';
import { tenantMiddleware } from '../middleware/tenant';

const router = express.Router();

/**
 * Dashboard Routes
 * Provides endpoints for financial dashboard data
 */

// Main Dashboard Endpoints (for Enterprise Dashboard)
router.get('/metrics', tenantMiddleware, DashboardController.getMetrics);
router.get('/tasks', tenantMiddleware, DashboardController.getTasks);
router.get('/alerts', tenantMiddleware, DashboardController.getAlerts);
router.get('/executive', tenantMiddleware, DashboardController.getExecutiveDashboard);

// Legacy Dashboard Endpoints
router.get('/stats', getDashboardStats);
router.get('/breakdown/:dimensionType', getDimensionBreakdown);
router.get('/recent-entries', getRecentEntries);
router.get('/activity', tenantMiddleware, getRecentActivity);
router.get('/inventory-alerts', tenantMiddleware, getInventoryAlerts);
router.get('/top-products', tenantMiddleware, getTopProducts);

export default router;
