import express from 'express';
import * as hrController from '../controllers/hrController';
import * as hrWorkspaceController from '../modules/hr/controllers/hr.workspace.controller';
import * as hrComplianceController from '../modules/hr/controllers/hr.compliance.controller';

const router = express.Router();

/**
 * ============================================================================
 * HR & PAYROLL ROUTES
 * ============================================================================
 */

// ============================================================================
// WORKSPACE
// ============================================================================
router.get('/workspace', hrWorkspaceController.getHRWorkspace);

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
// EMPLOYEE DOCUMENTS ROUTES
// ============================================================================
router.get('/employees/:employee_id/documents', hrComplianceController.getEmployeeDocuments);
router.post('/employees/:employee_id/documents', hrComplianceController.uploadDocument);
router.delete('/documents/:document_id', hrComplianceController.deleteDocument);
router.get('/documents/expiring', hrComplianceController.getExpiringDocuments);

// ============================================================================
// EMPLOYEE CONTRACTS ROUTES
// ============================================================================
router.get('/employees/:employee_id/contracts', hrComplianceController.getEmployeeContracts);
router.post('/employees/:employee_id/contracts', hrComplianceController.createContract);
router.post('/contracts/:contract_id/terminate', hrComplianceController.terminateContract);
router.get('/contracts/expiring', hrComplianceController.getExpiringContracts);

// ============================================================================
// PAYROLL ROUTES
// ============================================================================
router.get('/payroll/periods', hrController.getPayrollPeriods);
router.post('/payroll/periods', hrController.createPayrollPeriod);
router.post('/payroll/process', hrController.processPayroll);
router.get('/payroll/runs/:run_id', hrController.getPayrollRunDetails);
router.post('/payroll/post-to-gl', hrController.postPayrollToGL);

// ============================================================================
// PAYSLIP ROUTES
// ============================================================================
router.get('/payslips/:employee_id/:run_id', hrComplianceController.getPayslip);
router.get('/payslips/:employee_id/:run_id/html', hrComplianceController.getPayslipHTML);

// ============================================================================
// TAX CALCULATION ROUTES
// ============================================================================
router.post('/tax-calculator', hrComplianceController.calculateTax);
router.get('/tax-brackets/:tax_year', hrComplianceController.getTaxBrackets);

// ============================================================================
// LEAVE MANAGEMENT ROUTES
// ============================================================================
router.get('/leave/requests', hrController.getLeaveRequests);
router.post('/leave/requests', hrController.createLeaveRequest);
router.put('/leave/requests/:request_id/process', hrController.processLeaveRequest);
router.get('/leave/balances/:employee_id', hrController.getLeaveBalances);
router.get('/leave/calendar/:department_id', hrComplianceController.getLeaveCalendar);
router.post('/leave/process-accruals', hrComplianceController.processLeaveAccruals);
router.post('/leave/year-end-carryover', hrComplianceController.processYearEndCarryover);

// ============================================================================
// ATTENDANCE ROUTES
// ============================================================================
router.post('/attendance/clock', hrController.recordAttendance);
router.get('/attendance/records', hrController.getAttendanceRecords);

// ============================================================================
// COMPLIANCE & STATUTORY REPORTING ROUTES
// ============================================================================
router.get('/compliance/irp5/:employee_id/:tax_year', hrComplianceController.getIRP5);
router.get('/compliance/emp501/:tax_year', hrComplianceController.getEMP501);
router.get('/compliance/bcea-check/:employee_id', hrComplianceController.checkBCEACompliance);
router.get('/compliance/report', hrComplianceController.getComplianceReport);

// ============================================================================
// DASHBOARD ROUTES
// ============================================================================
router.get('/dashboard', hrController.getHRDashboard);

export default router;
