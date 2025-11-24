import { Request, Response } from 'express';
import { query } from '../../../config/database';

/**
 * HR Workspace Controller
 * Provides aggregated data for the HR & Payroll dashboard
 */

/**
 * GET /api/hr/workspace
 * Returns all data needed for the HR & Payroll workspace dashboard
 */
export const getHRWorkspace = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenant?.id;

    if (!tenantId) {
      return res.status(401).json({
        success: false,
        error: 'Tenant ID not found',
      });
    }

    // Parallel queries for performance
    const [
      employeeHeadcount,
      leaveRequests,
      payrollStatus,
      recruitmentPipeline,
      recentHires,
      hrSummary,
    ] = await Promise.all([
      getEmployeeHeadcount(tenantId),
      getLeaveRequests(tenantId),
      getPayrollStatus(tenantId),
      getRecruitmentPipeline(tenantId),
      getRecentHires(tenantId),
      getHRSummary(tenantId),
    ]);

    res.json({
      success: true,
      data: {
        summary: hrSummary,
        headcount: employeeHeadcount,
        leave_requests: leaveRequests,
        payroll_status: payrollStatus,
        recruitment: recruitmentPipeline,
        recent_hires: recentHires,
      },
    });
  } catch (error: any) {
    console.error('HR workspace error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch HR workspace data',
    });
  }
};

/**
 * Get employee headcount by department
 */
async function getEmployeeHeadcount(tenantId: string) {
  const result = await query(
    `
    SELECT 
      department,
      COUNT(*) as employee_count,
      COUNT(CASE WHEN employment_status = 'active' THEN 1 END) as active_count,
      COUNT(CASE WHEN employment_status = 'on_leave' THEN 1 END) as on_leave_count
    FROM employees
    WHERE tenant_id = $1
    GROUP BY department
    ORDER BY employee_count DESC
    `,
    [tenantId]
  );

  return result.rows;
}

/**
 * Get pending leave requests
 */
async function getLeaveRequests(tenantId: string) {
  const result = await query(
    `
    SELECT 
      lr.id,
      lr.leave_type,
      lr.start_date,
      lr.end_date,
      lr.status,
      e.employee_number,
      e.first_name,
      e.last_name,
      e.department
    FROM leave_requests lr
    JOIN employees e ON lr.employee_id = e.id
    WHERE lr.tenant_id = $1 AND lr.status = 'pending'
    ORDER BY lr.start_date ASC
    LIMIT 10
    `,
    [tenantId]
  );

  return result.rows;
}

/**
 * Get payroll status for current month
 */
async function getPayrollStatus(tenantId: string) {
  const result = await query(
    `
    SELECT 
      pr.id,
      pr.payroll_period,
      pr.status,
      pr.total_gross_pay,
      pr.total_deductions,
      pr.total_net_pay,
      pr.payment_date,
      COUNT(pre.id) as employee_count
    FROM payroll_runs pr
    LEFT JOIN payroll_run_entries pre ON pr.id = pre.payroll_run_id
    WHERE pr.tenant_id = $1 
      AND pr.payroll_period >= DATE_TRUNC('month', CURRENT_DATE)
    GROUP BY pr.id, pr.payroll_period, pr.status, pr.total_gross_pay, pr.total_deductions, pr.total_net_pay, pr.payment_date
    ORDER BY pr.payroll_period DESC
    LIMIT 3
    `,
    [tenantId]
  );

  return result.rows;
}

/**
 * Get recruitment pipeline
 */
async function getRecruitmentPipeline(tenantId: string) {
  const result = await query(
    `
    SELECT 
      jp.id,
      jp.job_title,
      jp.department,
      jp.status,
      COUNT(ja.id) as applicant_count,
      COUNT(CASE WHEN ja.status = 'interview' THEN 1 END) as interview_count,
      COUNT(CASE WHEN ja.status = 'offer' THEN 1 END) as offer_count
    FROM job_postings jp
    LEFT JOIN job_applications ja ON jp.id = ja.job_posting_id
    WHERE jp.tenant_id = $1 AND jp.status = 'open'
    GROUP BY jp.id, jp.job_title, jp.department, jp.status
    ORDER BY applicant_count DESC
    LIMIT 10
    `,
    [tenantId]
  );

  return result.rows;
}

/**
 * Get recent hires (last 30 days)
 */
async function getRecentHires(tenantId: string) {
  const result = await query(
    `
    SELECT 
      id,
      employee_number,
      first_name,
      last_name,
      department,
      job_title,
      hire_date
    FROM employees
    WHERE tenant_id = $1 
      AND hire_date >= CURRENT_DATE - INTERVAL '30 days'
    ORDER BY hire_date DESC
    LIMIT 10
    `,
    [tenantId]
  );

  return result.rows;
}

/**
 * Get HR summary metrics
 */
async function getHRSummary(tenantId: string) {
  const result = await query(
    `
    SELECT 
      COUNT(DISTINCT e.id) as total_employees,
      COUNT(CASE WHEN e.employment_status = 'active' THEN 1 END) as active_employees,
      COUNT(CASE WHEN lr.status = 'pending' THEN 1 END) as pending_leave_requests,
      COUNT(CASE WHEN e.hire_date >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as new_hires_30d,
      COUNT(DISTINCT jp.id) as open_positions,
      COUNT(DISTINCT ja.id) as total_applications
    FROM employees e
    LEFT JOIN leave_requests lr ON e.id = lr.employee_id AND lr.tenant_id = $1
    LEFT JOIN job_postings jp ON jp.tenant_id = $1 AND jp.status = 'open'
    LEFT JOIN job_applications ja ON jp.id = ja.job_posting_id
    WHERE e.tenant_id = $1
    `,
    [tenantId]
  );

  return result.rows[0] || {
    total_employees: 0,
    active_employees: 0,
    pending_leave_requests: 0,
    new_hires_30d: 0,
    open_positions: 0,
    total_applications: 0,
  };
}
