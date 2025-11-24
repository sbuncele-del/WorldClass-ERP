import express from 'express';
import ReportsController from '../controllers/reports.controller';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

/**
 * Reports & Analytics Routes
 * 
 * Self-service reporting and analytics infrastructure:
 * - Custom report execution
 * - Report scheduling
 * - Interactive dashboards
 * - KPI tracking
 * - Data exports
 */

// ============================================================================
// REPORT DEFINITIONS
// ============================================================================

/**
 * @route   GET /api/reports/definitions
 * @desc    Get all report definitions
 * @access  Private
 */
router.get('/definitions', authenticateToken, ReportsController.getReportDefinitions);

/**
 * @route   GET /api/reports/definitions/:id
 * @desc    Get report definition by ID
 * @access  Private
 */
router.get('/definitions/:id', authenticateToken, ReportsController.getReportDefinitionById);

/**
 * @route   POST /api/reports/execute
 * @desc    Execute a report
 * @access  Private
 */
router.post('/execute', authenticateToken, ReportsController.executeReport);

/**
 * @route   GET /api/reports/executions
 * @desc    Get report execution history
 * @access  Private
 */
router.get('/executions', authenticateToken, ReportsController.getExecutionHistory);

// ============================================================================
// DASHBOARDS
// ============================================================================

/**
 * @route   GET /api/reports/dashboards
 * @desc    Get all dashboards
 * @access  Private
 */
router.get('/dashboards', authenticateToken, ReportsController.getDashboards);

/**
 * @route   GET /api/reports/dashboards/:id
 * @desc    Get dashboard by ID with widgets
 * @access  Private
 */
router.get('/dashboards/:id', authenticateToken, ReportsController.getDashboardById);

/**
 * @route   POST /api/reports/widgets/execute
 * @desc    Execute widget query
 * @access  Private
 */
router.post('/widgets/execute', authenticateToken, ReportsController.executeWidget);

// ============================================================================
// KPIs
// ============================================================================

/**
 * @route   GET /api/reports/kpis
 * @desc    Get all KPI definitions
 * @access  Private
 */
router.get('/kpis', authenticateToken, ReportsController.getKPIs);

/**
 * @route   POST /api/reports/kpis/calculate
 * @desc    Calculate KPI value
 * @access  Private
 */
router.post('/kpis/calculate', authenticateToken, ReportsController.calculateKPI);

/**
 * @route   GET /api/reports/kpis/:id/history
 * @desc    Get KPI history
 * @access  Private
 */
router.get('/kpis/:id/history', authenticateToken, ReportsController.getKPIHistory);

// ============================================================================
// DATA EXPORTS
// ============================================================================

/**
 * @route   POST /api/reports/export
 * @desc    Export data
 * @access  Private
 */
router.post('/export', authenticateToken, ReportsController.exportData);

/**
 * @route   GET /api/reports/exports
 * @desc    Get export history
 * @access  Private
 */
router.get('/exports', authenticateToken, ReportsController.getExportHistory);

export default router;
