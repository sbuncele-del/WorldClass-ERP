/**
 * Dimensions Service
 * Business logic for managing financial dimensions
 */

import { query } from '../../../config/database';
import {
  CostCenter,
  Department,
  Project,
  Product,
  Location,
  CreateCostCenterDTO,
  CreateDepartmentDTO,
  CreateProjectDTO,
  CreateProductDTO,
  CreateLocationDTO,
  DimensionSummary,
} from '../models/dimensions.model';

export class DimensionsService {
  // ===== COST CENTERS =====

  async getAllCostCenters(tenantId: string, includeInactive = false): Promise<CostCenter[]> {
    const activeClause = includeInactive ? '' : 'AND is_active = true';
    const result = await query(
      `SELECT * FROM cost_centers WHERE tenant_id = $1 ${activeClause} ORDER BY code`,
      [tenantId]
    );
    return result.rows;
  }

  async getCostCenterByCode(tenantId: string, code: string): Promise<CostCenter | null> {
    const result = await query(
      'SELECT * FROM cost_centers WHERE tenant_id = $1 AND code = $2',
      [tenantId, code]
    );
    return result.rows[0] || null;
  }

  async createCostCenter(tenantId: string, data: CreateCostCenterDTO, userId: string): Promise<string> {
    const result = await query(
      `INSERT INTO cost_centers (
        tenant_id, code, name, description, parent_cost_center_id, level,
        budget_amount, manager_id, manager_name, start_date, end_date,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING cost_center_id as id`,
      [
        tenantId,
        data.code,
        data.name,
        data.description,
        data.parent_cost_center_id,
        data.level || 1,
        data.budget_amount || 0,
        data.manager_id,
        data.manager_name,
        data.start_date,
        data.end_date,
        userId,
      ]
    );
    return result.rows[0].id;
  }

  async updateCostCenter(tenantId: string, code: string, data: Partial<CreateCostCenterDTO>, userId: string): Promise<void> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(data.name);
    }
    if (data.description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(data.description);
    }
    if (data.budget_amount !== undefined) {
      updates.push(`budget_amount = $${paramCount++}`);
      values.push(data.budget_amount);
    }
    if (data.manager_name !== undefined) {
      updates.push(`manager_name = $${paramCount++}`);
      values.push(data.manager_name);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    updates.push(`updated_by = $${paramCount++}`);
    values.push(userId);
    values.push(tenantId);
    values.push(code);

    await query(
      `UPDATE cost_centers SET ${updates.join(', ')} WHERE tenant_id = $${paramCount} AND code = $${paramCount + 1}`,
      values
    );
  }

  async deleteCostCenter(tenantId: string, code: string): Promise<void> {
    await query('UPDATE cost_centers SET is_active = false WHERE tenant_id = $1 AND code = $2', [tenantId, code]);
  }

  // ===== DEPARTMENTS =====

  async getAllDepartments(tenantId: string, includeInactive = false): Promise<Department[]> {
    const activeClause = includeInactive ? '' : 'AND is_active = true';
    const result = await query(
      `SELECT * FROM departments WHERE tenant_id = $1 ${activeClause} ORDER BY code`,
      [tenantId]
    );
    return result.rows;
  }

  async getDepartmentByCode(tenantId: string, code: string): Promise<Department | null> {
    const result = await query(
      'SELECT * FROM departments WHERE tenant_id = $1 AND code = $2',
      [tenantId, code]
    );
    return result.rows[0] || null;
  }

  async createDepartment(tenantId: string, data: CreateDepartmentDTO, userId: string): Promise<string> {
    const result = await query(
      `INSERT INTO departments (
        tenant_id, code, name, description, parent_department_id, level,
        manager_id, manager_name, cost_center_code,
        employee_count, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING department_id as id`,
      [
        tenantId,
        data.code,
        data.name,
        data.description,
        data.parent_department_id,
        data.level || 1,
        data.department_head_id,
        data.department_head_name,
        data.cost_center_id,
        data.employee_count || 0,
        userId,
      ]
    );
    return result.rows[0].id;
  }

  async updateDepartment(tenantId: string, code: string, data: Partial<CreateDepartmentDTO>, userId: string): Promise<void> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(data.name);
    }
    if (data.description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(data.description);
    }
    if (data.employee_count !== undefined) {
      updates.push(`employee_count = $${paramCount++}`);
      values.push(data.employee_count);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    updates.push(`updated_by = $${paramCount++}`);
    values.push(userId);
    values.push(tenantId);
    values.push(code);

    await query(
      `UPDATE departments SET ${updates.join(', ')} WHERE tenant_id = $${paramCount} AND code = $${paramCount + 1}`,
      values
    );
  }

  async deleteDepartment(tenantId: string, code: string): Promise<void> {
    await query('UPDATE departments SET is_active = false WHERE tenant_id = $1 AND code = $2', [tenantId, code]);
  }

  // ===== PROJECTS =====

  async getAllProjects(tenantId: string, includeInactive = false): Promise<Project[]> {
    const activeClause = includeInactive ? '' : 'AND is_active = true';
    const result = await query(
      `SELECT id, project_code as code, project_name as name, description, status, is_active, created_at, updated_at
       FROM projects WHERE tenant_id = $1 ${activeClause} ORDER BY project_code`,
      [tenantId]
    );
    return result.rows;
  }

  async getProjectByCode(tenantId: string, code: string): Promise<Project | null> {
    const result = await query(
      'SELECT id, project_code as code, project_name as name, description, status, is_active FROM projects WHERE tenant_id = $1 AND project_code = $2',
      [tenantId, code]
    );
    return result.rows[0] || null;
  }

  async createProject(tenantId: string, data: CreateProjectDTO, userId: string): Promise<string> {
    const result = await query(
      `INSERT INTO projects (
        tenant_id, project_code, project_name, description, project_type, status,
        client_id, client_name, manager_id,
        start_date, end_date, budget, priority, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id`,
      [
        tenantId,
        data.code,
        data.name,
        data.description,
        data.project_type,
        data.status || 'PLANNED',
        data.customer_id,
        data.customer_name,
        data.project_manager_id,
        data.start_date,
        data.end_date,
        data.planned_budget || 0,
        data.priority || 'MEDIUM',
        userId,
      ]
    );
    return result.rows[0].id;
  }

  async updateProject(tenantId: string, code: string, data: Partial<CreateProjectDTO>, userId: string): Promise<void> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.name !== undefined) {
      updates.push(`project_name = $${paramCount++}`);
      values.push(data.name);
    }
    if (data.description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(data.description);
    }
    if (data.status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      values.push(data.status);
    }
    if (data.planned_budget !== undefined) {
      updates.push(`budget = $${paramCount++}`);
      values.push(data.planned_budget);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(tenantId);
    values.push(code);

    await query(
      `UPDATE projects SET ${updates.join(', ')} WHERE tenant_id = $${paramCount} AND project_code = $${paramCount + 1}`,
      values
    );
  }

  async deleteProject(tenantId: string, code: string): Promise<void> {
    await query('UPDATE projects SET is_active = false WHERE tenant_id = $1 AND project_code = $2', [tenantId, code]);
  }

  // ===== PRODUCTS =====

  async getAllProducts(tenantId: string, includeInactive = false): Promise<Product[]> {
    const activeClause = includeInactive ? '' : 'AND is_active = true';
    const result = await query(
      `SELECT * FROM products WHERE tenant_id = $1 ${activeClause} ORDER BY code`,
      [tenantId]
    );
    return result.rows;
  }

  async getProductByCode(tenantId: string, code: string): Promise<Product | null> {
    const result = await query(
      'SELECT * FROM products WHERE tenant_id = $1 AND code = $2',
      [tenantId, code]
    );
    return result.rows[0] || null;
  }

  async createProduct(tenantId: string, data: CreateProductDTO, userId: string): Promise<string> {
    const result = await query(
      `INSERT INTO products (
        tenant_id, code, name, description, product_category, product_line,
        is_service, unit_of_measure, standard_cost, standard_price,
        supplier_id, supplier_name, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id`,
      [
        tenantId,
        data.code,
        data.name,
        data.description,
        data.product_category,
        data.product_line,
        data.is_service || false,
        data.unit_of_measure,
        data.standard_cost || 0,
        data.standard_price || 0,
        data.supplier_id,
        data.supplier_name,
        userId,
      ]
    );
    return result.rows[0].id;
  }

  async updateProduct(tenantId: string, code: string, data: Partial<CreateProductDTO>, userId: string): Promise<void> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(data.name);
    }
    if (data.description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(data.description);
    }
    if (data.standard_price !== undefined) {
      updates.push(`standard_price = $${paramCount++}`);
      values.push(data.standard_price);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    updates.push(`updated_by = $${paramCount++}`);
    values.push(userId);
    values.push(tenantId);
    values.push(code);

    await query(
      `UPDATE products SET ${updates.join(', ')} WHERE tenant_id = $${paramCount} AND code = $${paramCount + 1}`,
      values
    );
  }

  async deleteProduct(tenantId: string, code: string): Promise<void> {
    await query('UPDATE products SET is_active = false WHERE tenant_id = $1 AND code = $2', [tenantId, code]);
  }

  // ===== LOCATIONS =====

  async getAllLocations(tenantId: string, includeInactive = false): Promise<Location[]> {
    const activeClause = includeInactive ? '' : 'AND is_active = true';
    const result = await query(
      `SELECT * FROM locations WHERE tenant_id = $1 ${activeClause} ORDER BY code`,
      [tenantId]
    );
    return result.rows;
  }

  async getLocationByCode(tenantId: string, code: string): Promise<Location | null> {
    const result = await query(
      'SELECT * FROM locations WHERE tenant_id = $1 AND code = $2',
      [tenantId, code]
    );
    return result.rows[0] || null;
  }

  async createLocation(tenantId: string, data: CreateLocationDTO, userId: string): Promise<string> {
    const result = await query(
      `INSERT INTO locations (
        tenant_id, code, name, description, location_type, parent_location_id,
        address_line1, address_line2, city, state_province, postal_code,
        country, phone, email, manager_id, manager_name, opening_date,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING id`,
      [
        tenantId,
        data.code,
        data.name,
        data.description,
        data.location_type,
        data.parent_location_id,
        data.address_line1,
        data.address_line2,
        data.city,
        data.state_province,
        data.postal_code,
        data.country || 'South Africa',
        data.phone,
        data.email,
        data.manager_id,
        data.manager_name,
        data.opening_date,
        userId,
      ]
    );
    return result.rows[0].id;
  }

  async updateLocation(tenantId: string, code: string, data: Partial<CreateLocationDTO>, userId: string): Promise<void> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(data.name);
    }
    if (data.phone !== undefined) {
      updates.push(`phone = $${paramCount++}`);
      values.push(data.phone);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    updates.push(`updated_by = $${paramCount++}`);
    values.push(userId);
    values.push(tenantId);
    values.push(code);

    await query(
      `UPDATE locations SET ${updates.join(', ')} WHERE tenant_id = $${paramCount} AND code = $${paramCount + 1}`,
      values
    );
  }

  async deleteLocation(tenantId: string, code: string): Promise<void> {
    await query('UPDATE locations SET is_active = false WHERE tenant_id = $1 AND code = $2', [tenantId, code]);
  }

  // ===== SUMMARY =====

  async getDimensionSummary(tenantId: string): Promise<DimensionSummary> {
    const costCentersResult = await query('SELECT COUNT(*) as count FROM cost_centers WHERE tenant_id = $1 AND is_active = true', [tenantId]);
    const departmentsResult = await query('SELECT COUNT(*) as count FROM departments WHERE tenant_id = $1 AND is_active = true', [tenantId]);
    const projectsResult = await query('SELECT COUNT(*) as count FROM projects WHERE tenant_id = $1 AND is_active = true', [tenantId]);
    const productsResult = await query('SELECT COUNT(*) as count FROM products WHERE tenant_id = $1 AND is_active = true', [tenantId]);
    const locationsResult = await query('SELECT COUNT(*) as count FROM locations WHERE tenant_id = $1 AND is_active = true', [tenantId]);

    return {
      cost_centers: parseInt(costCentersResult.rows[0].count),
      departments: parseInt(departmentsResult.rows[0].count),
      projects: parseInt(projectsResult.rows[0].count),
      products: parseInt(productsResult.rows[0].count),
      locations: parseInt(locationsResult.rows[0].count),
    };
  }
}
