import express from 'express';
import * as hrController from '../controllers/hrController';

const router = express.Router();

/**
 * ============================================================================
 * HR & PAYROLL ROUTES
 * ============================================================================
 */

// ============================================================================
// DEPARTMENT ROUTES
// ============================================================================
router.get('/departments', hrController.getDepartments);
router.get('/departments/:id', hrController.getDepartmentById);
router.post('/departments', hrController.createDepartment);
router.put('/departments/:id', hrController.updateDepartment);

// ============================================================================
// POSITION ROUTES
// ============================================================================
router.get('/positions', hrController.getPositions);
router.post('/positions', hrController.createPosition);

// ============================================================================
// EMPLOYEE ROUTES
// ============================================================================
router.get('/employees', hrController.getEmployees);
router.get('/employees/:id', hrController.getEmployeeById);
router.post('/employees', hrController.createEmployee);
router.put('/employees/:id', hrController.updateEmployee);

// ============================================================================
// PAYROLL ROUTES
// ============================================================================
router.get('/payroll/periods', hrController.getPayrollPeriods);
router.post('/payroll/periods', hrController.createPayrollPeriod);
router.post('/payroll/process', hrController.processPayroll);
router.get('/payroll/runs/:run_id', hrController.getPayrollRunDetails);
router.post('/payroll/post-to-gl', hrController.postPayrollToGL);

// ============================================================================
// LEAVE MANAGEMENT ROUTES
// ============================================================================
router.get('/leave/requests', hrController.getLeaveRequests);
router.post('/leave/requests', hrController.createLeaveRequest);
router.put('/leave/requests/:request_id/process', hrController.processLeaveRequest);
router.get('/leave/balances/:employee_id', hrController.getLeaveBalances);

// ============================================================================
// ATTENDANCE ROUTES
// ============================================================================
router.post('/attendance/clock', hrController.recordAttendance);
router.get('/attendance/records', hrController.getAttendanceRecords);

// ============================================================================
// DASHBOARD ROUTES
// ============================================================================
router.get('/dashboard', hrController.getHRDashboard);

export default router;
