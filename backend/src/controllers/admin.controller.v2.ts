/**
 * Admin Controller V2 - Tenant-Hardened
 * 
 * Multi-tenant secure administration for users, roles,
 * permissions, and tenant settings.
 */

import { Response } from 'express';
import { pool } from '../config/database';
import bcrypt from 'bcrypt';
import { TenantRequest } from '../types';

// Helper to extract tenant context
function getTenantContext(req: TenantRequest): { tenantId: string; userId?: string } {
  const tenantId = req.tenant?.id;
  if (!tenantId) {
    throw new Error('Tenant context required');
  }
  return { tenantId, userId: req.user?.id };
}

export class AdminControllerV2 {
  /**
   * Get all users
   * GET /api/v2/admin/users
   */
  static async getAllUsers(req: TenantRequest, res: Response): Promise<void> {
    try {
      const { tenantId } = getTenantContext(req);
      const { status, role, search, limit = 50, offset = 0 } = req.query;

      let conditions: string[] = ['u.tenant_id = $1'];
      let params: any[] = [tenantId];
      let paramIndex = 2;

      if (status) {
        conditions.push(`u.is_active = $${paramIndex}`);
        params.push(status === 'active');
        paramIndex++;
      }

      if (search) {
        conditions.push(`(u.email ILIKE $${paramIndex} OR u.first_name ILIKE $${paramIndex} OR u.last_name ILIKE $${paramIndex})`);
        params.push(`%${search}%`);
        paramIndex++;
      }

      const query = `
        SELECT 
          u.user_id, u.email, u.username, u.first_name, u.last_name, u.display_name,
          u.phone, u.avatar_url, u.email_verified, u.mfa_enabled,
          u.last_login_at, u.last_active_at, u.is_active, u.is_super_admin,
          u.account_suspended, u.created_at,
          COALESCE(
            json_agg(
              DISTINCT jsonb_build_object('role_id', r.role_id, 'role_name', r.role_name, 'role_code', r.role_code)
            ) FILTER (WHERE r.role_id IS NOT NULL),
            '[]'
          ) as roles
        FROM users u
        LEFT JOIN user_roles ur ON u.user_id = ur.user_id AND ur.is_active = true
        LEFT JOIN roles r ON ur.role_id = r.role_id
        WHERE ${conditions.join(' AND ')}
        GROUP BY u.user_id
        ORDER BY u.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      params.push(limit, offset);
      const result = await pool.query(query, params);

      // Count total
      const countQuery = `SELECT COUNT(*) FROM users u WHERE ${conditions.slice(0, -2).join(' AND ') || 'u.tenant_id = $1'}`;
      const countResult = await pool.query(countQuery, params.slice(0, -2));

      res.json({
        success: true,
        users: result.rows,
        total: parseInt(countResult.rows[0].count),
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });

    } catch (error: any) {
      if (error.message === 'Tenant context required') {
        res.status(401).json({ success: false, message: 'Unauthorized: Tenant context required' });
        return;
      }
      console.error('[Admin] Get users error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch users' });
    }
  }

  /**
   * Get user by ID
   * GET /api/v2/admin/users/:id
   */
  static async getUserById(req: TenantRequest, res: Response): Promise<void> {
    try {
      const { tenantId } = getTenantContext(req);
      const { id } = req.params;

      const query = `
        SELECT 
          u.*,
          COALESCE(
            json_agg(
              DISTINCT jsonb_build_object('role_id', r.role_id, 'role_name', r.role_name, 'role_code', r.role_code)
            ) FILTER (WHERE r.role_id IS NOT NULL),
            '[]'
          ) as roles
        FROM users u
        LEFT JOIN user_roles ur ON u.user_id = ur.user_id AND ur.is_active = true
        LEFT JOIN roles r ON ur.role_id = r.role_id
        WHERE u.user_id = $1 AND u.tenant_id = $2
        GROUP BY u.user_id
      `;

      const result = await pool.query(query, [id, tenantId]);

      if (result.rows.length === 0) {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }

      // Remove sensitive fields
      const user = result.rows[0];
      delete user.password_hash;

      res.json({
        success: true,
        user
      });

    } catch (error: any) {
      if (error.message === 'Tenant context required') {
        res.status(401).json({ success: false, message: 'Unauthorized: Tenant context required' });
        return;
      }
      console.error('[Admin] Get user error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch user' });
    }
  }

  /**
   * Create a new user
   * POST /api/v2/admin/users
   */
  static async createUser(req: TenantRequest, res: Response): Promise<void> {
    const client = await pool.connect();
    try {
      const { tenantId, userId } = getTenantContext(req);
      const {
        email,
        username,
        password,
        first_name,
        last_name,
        phone,
        roles
      } = req.body;

      await client.query('BEGIN');

      // Check if email exists
      const existsResult = await client.query(
        'SELECT user_id FROM users WHERE email = $1',
        [email]
      );

      if (existsResult.rows.length > 0) {
        await client.query('ROLLBACK');
        res.status(400).json({ success: false, message: 'Email already exists' });
        return;
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);

      // Create user
      const userQuery = `
        INSERT INTO users (
          tenant_id, email, username, password_hash,
          first_name, last_name, phone, display_name,
          is_active, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9)
        RETURNING user_id, email, username, first_name, last_name, display_name, created_at
      `;

      const displayName = `${first_name} ${last_name}`.trim() || username;
      const userResult = await client.query(userQuery, [
        tenantId,
        email,
        username,
        passwordHash,
        first_name,
        last_name,
        phone,
        displayName,
        userId
      ]);

      const newUserId = userResult.rows[0].user_id;

      // Assign roles
      if (roles && roles.length > 0) {
        for (const roleId of roles) {
          await client.query(`
            INSERT INTO user_roles (user_id, role_id, assigned_by, is_active)
            VALUES ($1, $2, $3, true)
          `, [newUserId, roleId, userId]);
        }
      }

      await client.query('COMMIT');

      res.status(201).json({
        success: true,
        user: userResult.rows[0]
      });

    } catch (error: any) {
      await client.query('ROLLBACK');
      if (error.message === 'Tenant context required') {
        res.status(401).json({ success: false, message: 'Unauthorized: Tenant context required' });
        return;
      }
      console.error('[Admin] Create user error:', error);
      res.status(500).json({ success: false, message: 'Failed to create user' });
    } finally {
      client.release();
    }
  }

  /**
   * Update user
   * PUT /api/v2/admin/users/:id
   */
  static async updateUser(req: TenantRequest, res: Response): Promise<void> {
    try {
      const { tenantId, userId } = getTenantContext(req);
      const { id } = req.params;
      const {
        first_name,
        last_name,
        phone,
        is_active,
        roles
      } = req.body;

      // Verify user belongs to tenant
      const checkResult = await pool.query(
        'SELECT user_id FROM users WHERE user_id = $1 AND tenant_id = $2',
        [id, tenantId]
      );

      if (checkResult.rows.length === 0) {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }

      const updateQuery = `
        UPDATE users
        SET first_name = COALESCE($1, first_name),
            last_name = COALESCE($2, last_name),
            phone = COALESCE($3, phone),
            is_active = COALESCE($4, is_active),
            display_name = COALESCE(CONCAT($1, ' ', $2), display_name),
            updated_at = NOW()
        WHERE user_id = $5 AND tenant_id = $6
        RETURNING user_id, email, username, first_name, last_name, is_active
      `;

      const result = await pool.query(updateQuery, [
        first_name, last_name, phone, is_active, id, tenantId
      ]);

      // Update roles if provided
      if (roles) {
        await pool.query('UPDATE user_roles SET is_active = false WHERE user_id = $1', [id]);
        for (const roleId of roles) {
          await pool.query(`
            INSERT INTO user_roles (user_id, role_id, assigned_by, is_active)
            VALUES ($1, $2, $3, true)
            ON CONFLICT (user_id, role_id) DO UPDATE SET is_active = true
          `, [id, roleId, userId]);
        }
      }

      res.json({
        success: true,
        user: result.rows[0]
      });

    } catch (error: any) {
      if (error.message === 'Tenant context required') {
        res.status(401).json({ success: false, message: 'Unauthorized: Tenant context required' });
        return;
      }
      console.error('[Admin] Update user error:', error);
      res.status(500).json({ success: false, message: 'Failed to update user' });
    }
  }

  /**
   * Delete/deactivate user
   * DELETE /api/v2/admin/users/:id
   */
  static async deleteUser(req: TenantRequest, res: Response): Promise<void> {
    try {
      const { tenantId } = getTenantContext(req);
      const { id } = req.params;

      // Soft delete - deactivate user
      const result = await pool.query(`
        UPDATE users
        SET is_active = false, account_suspended = true, updated_at = NOW()
        WHERE user_id = $1 AND tenant_id = $2
        RETURNING user_id
      `, [id, tenantId]);

      if (result.rows.length === 0) {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }

      res.json({
        success: true,
        message: 'User deactivated'
      });

    } catch (error: any) {
      if (error.message === 'Tenant context required') {
        res.status(401).json({ success: false, message: 'Unauthorized: Tenant context required' });
        return;
      }
      console.error('[Admin] Delete user error:', error);
      res.status(500).json({ success: false, message: 'Failed to delete user' });
    }
  }

  /**
   * Get all roles
   * GET /api/v2/admin/roles
   */
  static async getRoles(req: TenantRequest, res: Response): Promise<void> {
    try {
      const { tenantId } = getTenantContext(req);

      const query = `
        SELECT 
          r.*,
          COUNT(DISTINCT ur.user_id) as user_count
        FROM roles r
        LEFT JOIN user_roles ur ON r.role_id = ur.role_id AND ur.is_active = true
        WHERE r.tenant_id = $1 OR r.is_system_role = true
        GROUP BY r.role_id
        ORDER BY r.role_name
      `;

      const result = await pool.query(query, [tenantId]);

      res.json({
        success: true,
        roles: result.rows
      });

    } catch (error: any) {
      if (error.message === 'Tenant context required') {
        res.status(401).json({ success: false, message: 'Unauthorized: Tenant context required' });
        return;
      }
      console.error('[Admin] Get roles error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch roles' });
    }
  }

  /**
   * Create a role
   * POST /api/v2/admin/roles
   */
  static async createRole(req: TenantRequest, res: Response): Promise<void> {
    try {
      const { tenantId, userId } = getTenantContext(req);
      const { role_name, role_code, description, permissions } = req.body;

      const query = `
        INSERT INTO roles (
          tenant_id, role_name, role_code, description,
          permissions, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;

      const result = await pool.query(query, [
        tenantId,
        role_name,
        role_code,
        description,
        JSON.stringify(permissions || []),
        userId
      ]);

      res.status(201).json({
        success: true,
        role: result.rows[0]
      });

    } catch (error: any) {
      if (error.message === 'Tenant context required') {
        res.status(401).json({ success: false, message: 'Unauthorized: Tenant context required' });
        return;
      }
      console.error('[Admin] Create role error:', error);
      res.status(500).json({ success: false, message: 'Failed to create role' });
    }
  }

  /**
   * Get audit log
   * GET /api/v2/admin/audit-log
   */
  static async getAuditLog(req: TenantRequest, res: Response): Promise<void> {
    try {
      const { tenantId } = getTenantContext(req);
      const { user_id, action, entity_type, date_from, date_to, limit = 100, offset = 0 } = req.query;

      let conditions: string[] = ['tenant_id = $1'];
      let params: any[] = [tenantId];
      let paramIndex = 2;

      if (user_id) {
        conditions.push(`user_id = $${paramIndex}`);
        params.push(user_id);
        paramIndex++;
      }

      if (action) {
        conditions.push(`action = $${paramIndex}`);
        params.push(action);
        paramIndex++;
      }

      if (entity_type) {
        conditions.push(`entity_type = $${paramIndex}`);
        params.push(entity_type);
        paramIndex++;
      }

      if (date_from) {
        conditions.push(`created_at >= $${paramIndex}`);
        params.push(date_from);
        paramIndex++;
      }

      if (date_to) {
        conditions.push(`created_at <= $${paramIndex}`);
        params.push(date_to);
        paramIndex++;
      }

      const query = `
        SELECT 
          al.*,
          u.email as user_email,
          u.display_name as user_name
        FROM audit_log al
        LEFT JOIN users u ON al.user_id = u.user_id
        WHERE ${conditions.join(' AND ')}
        ORDER BY al.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      params.push(limit, offset);
      const result = await pool.query(query, params);

      res.json({
        success: true,
        logs: result.rows
      });

    } catch (error: any) {
      if (error.message === 'Tenant context required') {
        res.status(401).json({ success: false, message: 'Unauthorized: Tenant context required' });
        return;
      }
      console.error('[Admin] Get audit log error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch audit log' });
    }
  }

  /**
   * Get tenant settings
   * GET /api/v2/admin/settings
   */
  static async getSettings(req: TenantRequest, res: Response): Promise<void> {
    try {
      const { tenantId } = getTenantContext(req);

      const query = `
        SELECT setting_key, setting_value, setting_type, description
        FROM tenant_settings
        WHERE tenant_id = $1
        ORDER BY setting_key
      `;

      const result = await pool.query(query, [tenantId]);

      res.json({
        success: true,
        settings: result.rows
      });

    } catch (error: any) {
      if (error.message === 'Tenant context required') {
        res.status(401).json({ success: false, message: 'Unauthorized: Tenant context required' });
        return;
      }
      console.error('[Admin] Get settings error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch settings' });
    }
  }

  /**
   * Update tenant settings
   * PUT /api/v2/admin/settings
   */
  static async updateSettings(req: TenantRequest, res: Response): Promise<void> {
    try {
      const { tenantId, userId } = getTenantContext(req);
      const { settings } = req.body;

      if (!settings || typeof settings !== 'object') {
        res.status(400).json({ success: false, message: 'Settings object required' });
        return;
      }

      for (const [key, value] of Object.entries(settings)) {
        await pool.query(`
          INSERT INTO tenant_settings (tenant_id, setting_key, setting_value, updated_by)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (tenant_id, setting_key)
          DO UPDATE SET setting_value = $3, updated_by = $4, updated_at = NOW()
        `, [tenantId, key, String(value), userId]);
      }

      res.json({
        success: true,
        message: 'Settings updated'
      });

    } catch (error: any) {
      if (error.message === 'Tenant context required') {
        res.status(401).json({ success: false, message: 'Unauthorized: Tenant context required' });
        return;
      }
      console.error('[Admin] Update settings error:', error);
      res.status(500).json({ success: false, message: 'Failed to update settings' });
    }
  }
}

export default AdminControllerV2;
