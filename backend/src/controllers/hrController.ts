import { Request, Response } from 'express';
import pool from '../config/database';

/**
 * ============================================================================
 * HR & PAYROLL CONTROLLER
 * ============================================================================
 * Comprehensive controller for HR & Payroll Management
 * 
 * Features:
 * - Department Management (hierarchical structure)
 * - Position Management (job titles, levels, requirements)
 * - Employee Management (full employee lifecycle)
 * - Payroll Processing (monthly payroll runs with SARS compliance)
 * - Leave Management (requests, approvals, balances)
 * - Attendance Tracking (clock in/out, overtime)
 * - Tax Calculations (SARS tax brackets, PAYE, UIF, SDL)
 * - GL Integration (automatic posting to General Ledger)
 * ============================================================================
 */

// ============================================================================
// DEPARTMENT MANAGEMENT
// ============================================================================

/**
 * Get all departments with hierarchy
 */
export const getDepartments = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        d.*,
        pd.department_name as parent_department_name,
        e.first_name || ' ' || e.last_name as manager_name,
        COUNT(DISTINCT emp.employee_id) as employee_count
      FROM hr.departments d
      LEFT JOIN hr.departments pd ON d.parent_department_id = pd.department_id
      LEFT JOIN hr.employees e ON d.manager_id = e.employee_id
      LEFT JOIN hr.employees emp ON emp.department_id = d.department_id
      WHERE d.is_active = TRUE
      GROUP BY d.department_id, pd.department_name, e.first_name, e.last_name
      ORDER BY d.department_name
    `);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error: any) {
    console.error('Error fetching departments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch departments',
      details: error.message
    });
  }
};

/**
 * Get department by ID
 */
export const getDepartmentById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT 
        d.*,
        pd.department_name as parent_department_name,
        e.first_name || ' ' || e.last_name as manager_name,
        COUNT(DISTINCT emp.employee_id) as employee_count,
        COUNT(DISTINCT p.position_id) as position_count
      FROM hr.departments d
      LEFT JOIN hr.departments pd ON d.parent_department_id = pd.department_id
      LEFT JOIN hr.employees e ON d.manager_id = e.employee_id
      LEFT JOIN hr.employees emp ON emp.department_id = d.department_id
      LEFT JOIN hr.positions p ON p.department_id = d.department_id
      WHERE d.department_id = $1
      GROUP BY d.department_id, pd.department_name, e.first_name, e.last_name
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Department not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error: any) {
    console.error('Error fetching department:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch department',
      details: error.message
    });
  }
};

/**
 * Create new department
 */
export const createDepartment = async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const {
      department_code,
      department_name,
      parent_department_id,
      manager_id,
      cost_center_code,
      description,
      is_active = true,
      created_by
    } = req.body;

    // Validate required fields
    if (!department_code || !department_name) {
      throw new Error('Department code and name are required');
    }

    // Check for duplicate code
    const existingDept = await client.query(
      'SELECT department_id FROM hr.departments WHERE department_code = $1',
      [department_code]
    );

    if (existingDept.rows.length > 0) {
      throw new Error('Department code already exists');
    }

    // Validate parent department exists
    if (parent_department_id) {
      const parentDept = await client.query(
        'SELECT department_id FROM hr.departments WHERE department_id = $1',
        [parent_department_id]
      );

      if (parentDept.rows.length === 0) {
        throw new Error('Parent department not found');
      }
    }

    // Create department
    const result = await client.query(`
      INSERT INTO departments (
        department_code,
        department_name,
        parent_department_id,
        manager_id,
        cost_center_code,
        description,
        is_active,
        created_by,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `, [
      department_code,
      department_name,
      parent_department_id,
      manager_id,
      cost_center_code,
      description,
      is_active,
      created_by
    ]);

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Department created successfully',
      data: result.rows[0]
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error creating department:', error);
    res.status(400).json({
      success: false,
      error: 'Failed to create department',
      details: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * Update department
 */
export const updateDepartment = async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const {
      department_code,
      department_name,
      parent_department_id,
      manager_id,
      cost_center_code,
      description,
      is_active,
      updated_by
    } = req.body;

    // Check department exists
    const existingDept = await client.query(
      'SELECT * FROM hr.departments WHERE department_id = $1',
      [id]
    );

    if (existingDept.rows.length === 0) {
      throw new Error('Department not found');
    }

    // Prevent circular reference
    if (parent_department_id && parent_department_id === parseInt(id)) {
      throw new Error('Department cannot be its own parent');
    }

    // Update department
    const result = await client.query(`
      UPDATE departments
      SET
        department_code = COALESCE($1, department_code),
        department_name = COALESCE($2, department_name),
        parent_department_id = $3,
        manager_id = $4,
        cost_center_code = $5,
        description = $6,
        is_active = COALESCE($7, is_active),
        updated_by = $8,
        updated_at = CURRENT_TIMESTAMP
      WHERE department_id = $9
      RETURNING *
    `, [
      department_code,
      department_name,
      parent_department_id,
      manager_id,
      cost_center_code,
      description,
      is_active,
      updated_by,
      id
    ]);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Department updated successfully',
      data: result.rows[0]
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error updating department:', error);
    res.status(400).json({
      success: false,
      error: 'Failed to update department',
      details: error.message
    });
  } finally {
    client.release();
  }
};

// ============================================================================
// POSITION MANAGEMENT
// ============================================================================

/**
 * Get all positions
 */
export const getPositions = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        position as position_name,
        position as position_code,
        COUNT(*) as employee_count
      FROM hr.employees
      WHERE position IS NOT NULL AND position != ''
      GROUP BY position
      ORDER BY position
    `);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error: any) {
    console.error('Error fetching positions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch positions',
      details: error.message
    });
  }
};

/**
 * Create new position
 */
export const createPosition = async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const {
      position_code,
      position_title,
      department_id,
      reports_to_position_id,
      job_level,
      job_category,
      description,
      requirements,
      is_active = true
    } = req.body;

    if (!position_code || !position_title) {
      throw new Error('Position code and title are required');
    }

    const result = await client.query(`
      INSERT INTO positions (
        position_code,
        position_title,
        department_id,
        reports_to_position_id,
        job_level,
        job_category,
        description,
        requirements,
        is_active,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `, [
      position_code,
      position_title,
      department_id,
      reports_to_position_id,
      job_level,
      job_category,
      description,
      requirements,
      is_active
    ]);

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Position created successfully',
      data: result.rows[0]
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error creating position:', error);
    res.status(400).json({
      success: false,
      error: 'Failed to create position',
      details: error.message
    });
  } finally {
    client.release();
  }
};

// ============================================================================
// EMPLOYEE MANAGEMENT
// ============================================================================

/**
 * Get all employees with summary
 */
export const getEmployees = async (req: Request, res: Response) => {
  try {
    const { department_id, status, search } = req.query;

    let query = `
      SELECT 
        e.employee_id,
        e.employee_number,
        e.first_name,
        e.last_name,
        e.id_number,
        e.email,
        e.phone,
        e.employment_status,
        e.hire_date,
        e.termination_date,
        e.department_id,
        d.department_name,
        e.position_id,
        p.position_title,
        e.basic_salary,
        e.tax_number,
        e.date_of_birth,
        e.created_at
      FROM hr.employees e
      LEFT JOIN hr.departments d ON e.department_id = d.department_id
      LEFT JOIN hr.positions p ON e.position_id = p.position_id
      WHERE 1=1
    `;
    
    const params: any[] = [];

    if (department_id) {
      params.push(department_id);
      query += ` AND department_id = $${params.length}`;
    }

    if (status) {
      params.push(status);
      query += ` AND employment_status = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (first_name ILIKE $${params.length} OR last_name ILIKE $${params.length} OR employee_number ILIKE $${params.length})`;
    }

    query += ` ORDER BY employee_number`;

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error: any) {
    console.error('Error fetching employees:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch employees',
      details: error.message
    });
  }
};

/**
 * Get employee by ID
 */
export const getEmployeeById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT * FROM hr.employees
      WHERE employee_id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Employee not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error: any) {
    console.error('Error fetching employee:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch employee',
      details: error.message
    });
  }
};

/**
 * Create new employee
 */
export const createEmployee = async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const {
      employee_number,
      first_name,
      middle_name,
      last_name,
      id_number,
      passport_number,
      date_of_birth,
      gender,
      nationality,
      tax_number,
      email,
      phone_mobile,
      phone_home,
      address_line1,
      address_line2,
      city,
      province,
      postal_code,
      country,
      department_id,
      position_id,
      employment_type,
      employment_status,
      hire_date,
      probation_end_date,
      contract_start_date,
      contract_end_date,
      reports_to_employee_id,
      basic_salary,
      payment_frequency,
      payment_method,
      bank_name,
      bank_branch_code,
      bank_account_number,
      bank_account_type,
      emergency_contact_name,
      emergency_contact_relationship,
      emergency_contact_phone,
      created_by
    } = req.body;

    // Validate required fields
    if (!employee_number || !first_name || !last_name || !id_number) {
      throw new Error('Employee number, first name, last name, and ID number are required');
    }

    // Check for duplicate employee number
    const existingEmp = await client.query(
      'SELECT employee_id FROM hr.employees WHERE employee_number = $1',
      [employee_number]
    );

    if (existingEmp.rows.length > 0) {
      throw new Error('Employee number already exists');
    }

    // Create employee
    const result = await client.query(`
      INSERT INTO employees (
        employee_number, first_name, middle_name, last_name,
        id_number, passport_number, date_of_birth, gender, nationality,
        tax_number, email, phone_mobile, phone_home,
        address_line1, address_line2, city, province, postal_code, country,
        department_id, position_id, employment_type, employment_status,
        hire_date, probation_end_date, contract_start_date, contract_end_date,
        reports_to_employee_id, basic_salary, payment_frequency, payment_method,
        bank_name, bank_branch_code, bank_account_number, bank_account_type,
        emergency_contact_name, emergency_contact_relationship, emergency_contact_phone,
        created_by, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
        $31, $32, $33, $34, $35, $36, $37, $38, $39,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      RETURNING *
    `, [
      employee_number, first_name, middle_name, last_name,
      id_number, passport_number, date_of_birth, gender, nationality,
      tax_number, email, phone_mobile, phone_home,
      address_line1, address_line2, city, province, postal_code, country,
      department_id, position_id, employment_type, employment_status,
      hire_date, probation_end_date, contract_start_date, contract_end_date,
      reports_to_employee_id, basic_salary, payment_frequency, payment_method,
      bank_name, bank_branch_code, bank_account_number, bank_account_type,
      emergency_contact_name, emergency_contact_relationship, emergency_contact_phone,
      created_by
    ]);

    // Initialize leave balances for the employee
    const leaveTypes = await client.query('SELECT leave_type_id, default_days FROM leave_types WHERE is_active = true');
    
    for (const leaveType of leaveTypes.rows) {
      await client.query(`
        INSERT INTO employee_leave_balances (
          employee_id, leave_type_id, year, opening_balance, accrued, taken, adjustment, closing_balance
        ) VALUES ($1, $2, EXTRACT(YEAR FROM CURRENT_DATE), $3, 0, 0, 0, $3)
      `, [result.rows[0].employee_id, leaveType.leave_type_id, leaveType.default_days || 0]);
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      data: result.rows[0]
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error creating employee:', error);
    res.status(400).json({
      success: false,
      error: 'Failed to create employee',
      details: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * Update employee
 */
export const updateEmployee = async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const updates = req.body;

    // Check employee exists
    const existingEmp = await client.query(
      'SELECT * FROM hr.employees WHERE employee_id = $1',
      [id]
    );

    if (existingEmp.rows.length === 0) {
      throw new Error('Employee not found');
    }

    // Build dynamic update query
    const fields = Object.keys(updates).filter(key => key !== 'employee_id');
    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');
    const values = fields.map(field => updates[field]);
    values.push(id);

    const result = await client.query(`
      UPDATE employees
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE employee_id = $${values.length}
      RETURNING *
    `, values);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Employee updated successfully',
      data: result.rows[0]
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error updating employee:', error);
    res.status(400).json({
      success: false,
      error: 'Failed to update employee',
      details: error.message
    });
  } finally {
    client.release();
  }
};

// ============================================================================
// PAYROLL PROCESSING
// ============================================================================

/**
 * Get payroll periods
 */
export const getPayrollPeriods = async (req: Request, res: Response) => {
  try {
    const { year, status } = req.query;

    let query = 'SELECT * FROM hr.payroll_periods WHERE 1=1';
    const params: any[] = [];

    if (year) {
      params.push(year);
      query += ` AND EXTRACT(YEAR FROM start_date) = $${params.length}`;
    }

    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }

    query += ' ORDER BY start_date DESC';

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error: any) {
    console.error('Error fetching payroll periods:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payroll periods',
      details: error.message
    });
  }
};

/**
 * Create payroll period
 */
export const createPayrollPeriod = async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const {
      period_code,
      period_name,
      period_start_date,
      period_end_date,
      payment_date,
      frequency,
      created_by
    } = req.body;

    if (!period_code || !period_start_date || !period_end_date || !payment_date) {
      throw new Error('Period code, start date, end date, and payment date are required');
    }

    const result = await client.query(`
      INSERT INTO payroll_periods (
        period_code, period_name, period_start_date, period_end_date,
        payment_date, frequency, status, created_by, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, 'Draft', $7, CURRENT_TIMESTAMP)
      RETURNING *
    `, [period_code, period_name, period_start_date, period_end_date, payment_date, frequency, created_by]);

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Payroll period created successfully',
      data: result.rows[0]
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error creating payroll period:', error);
    res.status(400).json({
      success: false,
      error: 'Failed to create payroll period',
      details: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * Calculate SARS PAYE tax
 */
const calculatePAYE = async (client: any, annualTaxableIncome: number): Promise<number> => {
  const brackets = await client.query(`
    SELECT * FROM sars_tax_brackets
    WHERE tax_year = EXTRACT(YEAR FROM CURRENT_DATE)
    ORDER BY min_income
  `);

  let tax = 0;
  
  for (const bracket of brackets.rows) {
    if (annualTaxableIncome > bracket.min_income) {
      const taxableAmount = bracket.max_income 
        ? Math.min(annualTaxableIncome - bracket.min_income, bracket.max_income - bracket.min_income)
        : annualTaxableIncome - bracket.min_income;
      
      tax += (taxableAmount * bracket.rate / 100);
    }
  }

  return tax / 12; // Monthly PAYE
};

/**
 * Process payroll run
 */
export const processPayroll = async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { period_id, employee_ids, created_by } = req.body;

    if (!period_id) {
      throw new Error('Payroll period is required');
    }

    // Get period details
    const period = await client.query(
      'SELECT * FROM hr.payroll_periods WHERE period_id = $1',
      [period_id]
    );

    if (period.rows.length === 0) {
      throw new Error('Payroll period not found');
    }

    if (period.rows[0].status !== 'Open') {
      throw new Error('Payroll period is not open for processing');
    }

    // Get employees to process
    let employeeQuery = `
      SELECT * FROM hr.employees 
      WHERE employment_employment_status = 'Active'
      AND basic_salary > 0
    `;

    if (employee_ids && employee_ids.length > 0) {
      employeeQuery += ` AND employee_id = ANY($1)`;
    }

    const employees = employee_ids && employee_ids.length > 0
      ? await client.query(employeeQuery, [employee_ids])
      : await client.query(employeeQuery);

    // Create payroll run
    const runResult = await client.query(`
      INSERT INTO payroll_runs (
        period_id, run_date, status, total_employees, total_gross,
        total_deductions, total_net, created_by, created_at
      ) VALUES ($1, CURRENT_DATE, 'Draft', $2, 0, 0, 0, $3, CURRENT_TIMESTAMP)
      RETURNING *
    `, [period_id, employees.rows.length, created_by]);

    const runId = runResult.rows[0].run_id;

    let totalGross = 0;
    let totalDeductions = 0;
    let totalNet = 0;

    // Process each employee
    for (const employee of employees.rows) {
      const basicSalary = parseFloat(employee.basic_salary);

      // Get recurring components for employee
      const recurringComponents = await client.query(`
        SELECT erc.*, pc.component_name, pc.component_type, pc.calculation_type, pc.amount, pc.percentage
        FROM employee_recurring_components erc
        JOIN payroll_components pc ON erc.component_id = pc.component_id
        WHERE erc.employee_id = $1 AND erc.is_active = true
      `, [employee.employee_id]);

      // Calculate earnings
      let grossPay = basicSalary;
      const earnings: any[] = [];
      const deductions: any[] = [];

      for (const comp of recurringComponents.rows) {
        let amount = 0;

        if (comp.calculation_type === 'Fixed') {
          amount = parseFloat(comp.employee_amount || comp.amount || 0);
        } else if (comp.calculation_type === 'Percentage') {
          const percentage = parseFloat(comp.employee_percentage || comp.percentage || 0);
          amount = basicSalary * (percentage / 100);
        }

        if (comp.component_type === 'Earning') {
          grossPay += amount;
          earnings.push({ component_id: comp.component_id, amount });
        } else {
          deductions.push({ component_id: comp.component_id, amount });
        }
      }

      // Calculate PAYE tax
      const annualGross = grossPay * 12;
      const paye = await calculatePAYE(client, annualGross);
      deductions.push({ component_id: null, component_name: 'PAYE', amount: paye });

      // Calculate UIF (1% of gross, capped at R177.12 per month)
      const uif = Math.min(grossPay * 0.01, 177.12);
      deductions.push({ component_id: null, component_name: 'UIF', amount: uif });

      // Calculate total deductions
      const totalEmpDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
      const netPay = grossPay - totalEmpDeductions;

      // Create payroll run detail
      const detailResult = await client.query(`
        INSERT INTO payroll_run_details (
          run_id, employee_id, basic_salary, gross_pay, total_deductions,
          net_pay, paye_tax, uif_deduction, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
        RETURNING *
      `, [runId, employee.employee_id, basicSalary, grossPay, totalEmpDeductions, netPay, paye, uif]);

      const detailId = detailResult.rows[0].detail_id;

      // Create payroll lines for earnings
      for (const earning of earnings) {
        await client.query(`
          INSERT INTO payroll_run_lines (
            detail_id, component_id, line_type, amount, created_at
          ) VALUES ($1, $2, 'Earning', $3, CURRENT_TIMESTAMP)
        `, [detailId, earning.component_id, earning.amount]);
      }

      // Create payroll lines for deductions
      for (const deduction of deductions) {
        await client.query(`
          INSERT INTO payroll_run_lines (
            detail_id, component_id, line_type, amount, description, created_at
          ) VALUES ($1, $2, 'Deduction', $3, $4, CURRENT_TIMESTAMP)
        `, [detailId, deduction.component_id, deduction.amount, deduction.component_name || null]);
      }

      totalGross += grossPay;
      totalDeductions += totalEmpDeductions;
      totalNet += netPay;
    }

    // Update payroll run totals
    await client.query(`
      UPDATE payroll_runs
      SET total_gross = $1, total_deductions = $2, total_net = $3
      WHERE run_id = $4
    `, [totalGross, totalDeductions, totalNet, runId]);

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Payroll processed successfully',
      data: {
        run_id: runId,
        total_employees: employees.rows.length,
        total_gross: totalGross,
        total_deductions: totalDeductions,
        total_net: totalNet
      }
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error processing payroll:', error);
    res.status(400).json({
      success: false,
      error: 'Failed to process payroll',
      details: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * Get payroll run details
 */
export const getPayrollRunDetails = async (req: Request, res: Response) => {
  try {
    const { run_id } = req.params;

    const runDetails = await pool.query(`
      SELECT 
        pr.*,
        pp.period_name,
        pp.period_start_date,
        pp.period_end_date,
        pp.payment_date
      FROM hr.payroll_runs pr
      JOIN payroll_periods pp ON pr.period_id = pp.period_id
      WHERE pr.run_id = $1
    `, [run_id]);

    if (runDetails.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Payroll run not found'
      });
    }

    const employeeDetails = await pool.query(`
      SELECT 
        prd.*,
        e.employee_number,
        e.first_name,
        e.last_name,
        d.department_name,
        p.position_title
      FROM payroll_run_details prd
      JOIN hr.employees e ON prd.employee_id = e.employee_id
      LEFT JOIN hr.departments d ON e.department_id = d.department_id
      LEFT JOIN hr.positions p ON e.position_id = p.position_id
      WHERE prd.run_id = $1
      ORDER BY e.employee_number
    `, [run_id]);

    // Get payroll lines for each employee
    for (const emp of employeeDetails.rows) {
      const lines = await pool.query(`
        SELECT 
          prl.*,
          pc.component_name
        FROM payroll_run_lines prl
        LEFT JOIN payroll_components pc ON prl.component_id = pc.component_id
        WHERE prl.detail_id = $1
        ORDER BY prl.line_type, prl.line_id
      `, [emp.detail_id]);

      emp.payroll_lines = lines.rows;
    }

    res.json({
      success: true,
      data: {
        run: runDetails.rows[0],
        employees: employeeDetails.rows
      }
    });
  } catch (error: any) {
    console.error('Error fetching payroll run details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payroll run details',
      details: error.message
    });
  }
};

/**
 * Post payroll to General Ledger
 */
export const postPayrollToGL = async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { run_id, posted_by } = req.body;

    // Get payroll run
    const run = await client.query(
      'SELECT * FROM hr.payroll_runs WHERE run_id = $1',
      [run_id]
    );

    if (run.rows.length === 0) {
      throw new Error('Payroll run not found');
    }

    if (run.rows[0].status === 'Posted') {
      throw new Error('Payroll run already posted to GL');
    }

    // Get period details
    const period = await client.query(
      'SELECT * FROM hr.payroll_periods WHERE period_id = $1',
      [run.rows[0].period_id]
    );

    // Create journal entry
    const jeResult = await client.query(`
      INSERT INTO journal_entries (
        entry_number, entry_date, entry_type, reference,
        description, status, created_by, created_at
      ) VALUES (
        'PAY' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || LPAD($1::TEXT, 4, '0'),
        CURRENT_DATE,
        'Payroll',
        'Run #' || $1,
        'Payroll for ' || $2,
        'Posted',
        $3,
        CURRENT_TIMESTAMP
      )
      RETURNING entry_id
    `, [run_id, period.rows[0].period_name, posted_by]);

    const entryId = jeResult.rows[0].entry_id;

    // Debit: Salaries & Wages Expense (total gross)
    await client.query(`
      INSERT INTO journal_entry_lines (
        entry_id, line_number, account_id, debit_amount, credit_amount,
        description, created_at
      ) VALUES (
        $1, 1, 
        (SELECT account_id FROM chart_of_accounts WHERE account_code = '6100'),
        $2, 0,
        'Salaries & Wages - ' || $3,
        CURRENT_TIMESTAMP
      )
    `, [entryId, run.rows[0].total_gross, period.rows[0].period_name]);

    // Credit: PAYE Payable
    const payeTotal = await client.query(`
      SELECT SUM(paye_tax) as total_paye
      FROM payroll_run_details
      WHERE run_id = $1
    `, [run_id]);

    await client.query(`
      INSERT INTO journal_entry_lines (
        entry_id, line_number, account_id, debit_amount, credit_amount,
        description, created_at
      ) VALUES (
        $1, 2,
        (SELECT account_id FROM chart_of_accounts WHERE account_code = '2110'),
        0, $2,
        'PAYE Payable',
        CURRENT_TIMESTAMP
      )
    `, [entryId, payeTotal.rows[0].total_paye]);

    // Credit: UIF Payable
    const uifTotal = await client.query(`
      SELECT SUM(uif_deduction) as total_uif
      FROM payroll_run_details
      WHERE run_id = $1
    `, [run_id]);

    await client.query(`
      INSERT INTO journal_entry_lines (
        entry_id, line_number, account_id, debit_amount, credit_amount,
        description, created_at
      ) VALUES (
        $1, 3,
        (SELECT account_id FROM chart_of_accounts WHERE account_code = '2120'),
        0, $2,
        'UIF Payable',
        CURRENT_TIMESTAMP
      )
    `, [entryId, uifTotal.rows[0].total_uif]);

    // Credit: Salaries Payable (net pay)
    await client.query(`
      INSERT INTO journal_entry_lines (
        entry_id, line_number, account_id, debit_amount, credit_amount,
        description, created_at
      ) VALUES (
        $1, 4,
        (SELECT account_id FROM chart_of_accounts WHERE account_code = '2100'),
        0, $2,
        'Salaries Payable',
        CURRENT_TIMESTAMP
      )
    `, [entryId, run.rows[0].total_net]);

    // Update payroll run status
    await client.query(`
      UPDATE payroll_runs
      SET status = 'Posted', gl_entry_id = $1, posted_by = $2, posted_at = CURRENT_TIMESTAMP
      WHERE run_id = $3
    `, [entryId, posted_by, run_id]);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Payroll posted to General Ledger successfully',
      data: {
        run_id,
        gl_entry_id: entryId
      }
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error posting payroll to GL:', error);
    res.status(400).json({
      success: false,
      error: 'Failed to post payroll to GL',
      details: error.message
    });
  } finally {
    client.release();
  }
};

// ============================================================================
// LEAVE MANAGEMENT
// ============================================================================

/**
 * Get leave requests
 */
export const getLeaveRequests = async (req: Request, res: Response) => {
  try {
    const { employee_id, status, from_date, to_date } = req.query;

    const result = await pool.query(`
      SELECT * FROM v_pending_leave_requests
      WHERE 1=1
      ${employee_id ? `AND employee_id = ${employee_id}` : ''}
      ${status ? `AND status = '${status}'` : ''}
      ORDER BY request_date DESC
    `);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error: any) {
    console.error('Error fetching leave requests:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch leave requests',
      details: error.message
    });
  }
};

/**
 * Create leave request
 */
export const createLeaveRequest = async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const {
      employee_id,
      leave_type_id,
      start_date,
      end_date,
      days_requested,
      reason,
      created_by
    } = req.body;

    if (!employee_id || !leave_type_id || !start_date || !end_date) {
      throw new Error('Employee, leave type, start date, and end date are required');
    }

    // Check leave balance
    const balance = await client.query(`
      SELECT closing_balance FROM employee_leave_balances
      WHERE employee_id = $1 AND leave_type_id = $2 AND year = EXTRACT(YEAR FROM CURRENT_DATE)
    `, [employee_id, leave_type_id]);

    if (balance.rows.length === 0 || balance.rows[0].closing_balance < days_requested) {
      throw new Error('Insufficient leave balance');
    }

    const result = await client.query(`
      INSERT INTO leave_requests (
        employee_id, leave_type_id, start_date, end_date, days_requested,
        reason, status, request_date, created_by, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, 'Pending', CURRENT_DATE, $7, CURRENT_TIMESTAMP)
      RETURNING *
    `, [employee_id, leave_type_id, start_date, end_date, days_requested, reason, created_by]);

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Leave request submitted successfully',
      data: result.rows[0]
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error creating leave request:', error);
    res.status(400).json({
      success: false,
      error: 'Failed to create leave request',
      details: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * Approve/reject leave request
 */
export const processLeaveRequest = async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { request_id } = req.params;
    const { action, approver_comments, approved_by } = req.body;

    if (!['Approved', 'Rejected'].includes(action)) {
      throw new Error('Invalid action. Must be Approved or Rejected');
    }

    // Get leave request
    const request = await client.query(
      'SELECT * FROM hr.leave_requests WHERE request_id = $1',
      [request_id]
    );

    if (request.rows.length === 0) {
      throw new Error('Leave request not found');
    }

    if (request.rows[0].status !== 'Pending') {
      throw new Error('Leave request already processed');
    }

    // Update request
    await client.query(`
      UPDATE leave_requests
      SET status = $1, approver_comments = $2, approved_by = $3,
          approval_date = CURRENT_DATE, updated_at = CURRENT_TIMESTAMP
      WHERE request_id = $4
    `, [action, approver_comments, approved_by, request_id]);

    // If approved, update leave balance
    if (action === 'Approved') {
      await client.query(`
        UPDATE employee_leave_balances
        SET taken = taken + $1,
            closing_balance = closing_balance - $1
        WHERE employee_id = $2 AND leave_type_id = $3 AND year = EXTRACT(YEAR FROM CURRENT_DATE)
      `, [request.rows[0].days_requested, request.rows[0].employee_id, request.rows[0].leave_type_id]);
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `Leave request ${action.toLowerCase()} successfully`
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error processing leave request:', error);
    res.status(400).json({
      success: false,
      error: 'Failed to process leave request',
      details: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * Get employee leave balances
 */
export const getLeaveBalances = async (req: Request, res: Response) => {
  try {
    const { employee_id } = req.params;

    const result = await pool.query(`
      SELECT * FROM v_leave_balance_summary
      WHERE employee_id = $1
      ORDER BY leave_type_name
    `, [employee_id]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error: any) {
    console.error('Error fetching leave balances:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch leave balances',
      details: error.message
    });
  }
};

// ============================================================================
// ATTENDANCE TRACKING
// ============================================================================

/**
 * Clock in/out
 */
export const recordAttendance = async (req: Request, res: Response) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { employee_id, clock_type, created_by } = req.body;

    if (!employee_id || !clock_type) {
      throw new Error('Employee ID and clock type are required');
    }

    if (!['In', 'Out'].includes(clock_type)) {
      throw new Error('Clock type must be In or Out');
    }

    // Check if already clocked in today
    const today = await client.query(`
      SELECT * FROM hr.attendance_records
      WHERE employee_id = $1 AND attendance_date = CURRENT_DATE
    `, [employee_id]);

    if (clock_type === 'In') {
      if (today.rows.length > 0 && today.rows[0].clock_in_time) {
        throw new Error('Already clocked in today');
      }

      if (today.rows.length > 0) {
        // Update existing record
        await client.query(`
          UPDATE attendance_records
          SET clock_in_time = CURRENT_TIME, updated_at = CURRENT_TIMESTAMP
          WHERE attendance_id = $1
        `, [today.rows[0].attendance_id]);
      } else {
        // Create new record
        await client.query(`
          INSERT INTO attendance_records (
            employee_id, attendance_date, clock_in_time, created_by, created_at
          ) VALUES ($1, CURRENT_DATE, CURRENT_TIME, $2, CURRENT_TIMESTAMP)
        `, [employee_id, created_by]);
      }
    } else {
      // Clock Out
      if (today.rows.length === 0 || !today.rows[0].clock_in_time) {
        throw new Error('Must clock in before clocking out');
      }

      if (today.rows[0].clock_out_time) {
        throw new Error('Already clocked out today');
      }

      // Calculate hours worked
      const clockIn = today.rows[0].clock_in_time;
      await client.query(`
        UPDATE attendance_records
        SET clock_out_time = CURRENT_TIME,
            hours_worked = EXTRACT(EPOCH FROM (CURRENT_TIME - $1::TIME)) / 3600,
            updated_at = CURRENT_TIMESTAMP
        WHERE attendance_id = $2
      `, [clockIn, today.rows[0].attendance_id]);
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `Clocked ${clock_type.toLowerCase()} successfully`
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error recording attendance:', error);
    res.status(400).json({
      success: false,
      error: 'Failed to record attendance',
      details: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * Get attendance records
 */
export const getAttendanceRecords = async (req: Request, res: Response) => {
  try {
    const { employee_id, from_date, to_date } = req.query;

    let query = `
      SELECT 
        ar.*,
        e.employee_number,
        e.first_name,
        e.last_name,
        d.department_name
      FROM hr.attendance_records ar
      JOIN hr.employees e ON ar.employee_id = e.employee_id
      LEFT JOIN hr.departments d ON e.department_id = d.department_id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (employee_id) {
      params.push(employee_id);
      query += ` AND ar.employee_id = $${params.length}`;
    }

    if (from_date) {
      params.push(from_date);
      query += ` AND ar.attendance_date >= $${params.length}`;
    }

    if (to_date) {
      params.push(to_date);
      query += ` AND ar.attendance_date <= $${params.length}`;
    }

    query += ' ORDER BY ar.attendance_date DESC, e.employee_number';

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error: any) {
    console.error('Error fetching attendance records:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch attendance records',
      details: error.message
    });
  }
};

// ============================================================================
// DASHBOARD & ANALYTICS
// ============================================================================

/**
 * Get HR dashboard summary
 */
export const getHRDashboard = async (req: Request, res: Response) => {
  try {
    // Total employees
    const totalEmployees = await pool.query(`
      SELECT COUNT(*) as count FROM hr.employees WHERE employment_status = 'Active'
    `);

    // Employees by department
    const byDepartment = await pool.query(`
      SELECT 
        d.department_name,
        COUNT(e.employee_id) as employee_count
      FROM hr.departments d
      LEFT JOIN hr.employees e ON d.department_id = e.department_id AND e.employment_status = 'Active'
      GROUP BY d.department_id, d.department_name
      ORDER BY employee_count DESC
    `);

    // Pending leave requests
    const pendingLeave = await pool.query(`
      SELECT COUNT(*) as count FROM hr.leave_requests WHERE employment_status = 'Pending'
    `);

    // Current month payroll summary
    const payrollSummary = await pool.query(`
      SELECT * FROM v_current_payroll_summary LIMIT 1
    `);

    // Headcount trend (last 12 months)
    const headcountTrend = await pool.query(`
      SELECT 
        TO_CHAR(hire_date, 'YYYY-MM') as month,
        COUNT(*) as new_hires
      FROM hr.employees
      WHERE hire_date >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY TO_CHAR(hire_date, 'YYYY-MM')
      ORDER BY month
    `);

    res.json({
      success: true,
      data: {
        total_employees: parseInt(totalEmployees.rows[0].count),
        by_department: byDepartment.rows,
        pending_leave_requests: parseInt(pendingLeave.rows[0].count),
        payroll_summary: payrollSummary.rows[0] || null,
        headcount_trend: headcountTrend.rows
      }
    });
  } catch (error: any) {
    console.error('Error fetching HR dashboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch HR dashboard',
      details: error.message
    });
  }
};
