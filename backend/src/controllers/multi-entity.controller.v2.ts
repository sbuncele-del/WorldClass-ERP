/**
 * Multi-Entity Controller V2
 * Tenant-hardened API for multi-entity/subsidiary management
 * 
 * Features:
 * - Legal entity CRUD
 * - Entity hierarchy management
 * - Inter-company transactions
 * - Entity permissions
 */

import { Response } from 'express';
import { TenantRequest } from '../types';
import { pool } from '../config/database';

/**
 * Tenant context helper
 */
function getTenantContext(req: TenantRequest): { tenantId: string; userId: string } {
  const tenantId = req.tenant?.id;
  const userId = req.user?.id;
  if (!tenantId) {
    throw new Error('Tenant context required');
  }
  return { tenantId, userId: userId || '' };
}

// ============================================================================
// LEGAL ENTITIES
// ============================================================================

/**
 * Get all legal entities for tenant
 */
export const getEntities = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId } = getTenantContext(req);
    const { includeInactive = false } = req.query;

    let query = `
      SELECT 
        e.*,
        pe.name as parent_name,
        (SELECT COUNT(*) FROM legal_entities ce WHERE ce.parent_id = e.id) as child_count
      FROM legal_entities e
      LEFT JOIN legal_entities pe ON e.parent_id = pe.id
      WHERE e.tenant_id = $1
    `;

    if (!includeInactive) {
      query += ` AND e.status = 'active'`;
    }

    query += ` ORDER BY e.level, e.name`;

    const result = await pool.query(query, [tenantId]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error: any) {
    if (error.message === 'Tenant context required') {
      return res.status(401).json({ success: false, error: 'Unauthorized - tenant not found' });
    }
    console.error('Get entities error:', error);
    res.status(500).json({ success: false, error: 'Failed to get entities' });
  }
};

/**
 * Get single entity by ID
 */
export const getEntity = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId } = getTenantContext(req);
    const { id } = req.params;

    const result = await pool.query(
      `SELECT e.*, pe.name as parent_name
       FROM legal_entities e
       LEFT JOIN legal_entities pe ON e.parent_id = pe.id
       WHERE e.id = $1 AND e.tenant_id = $2`,
      [id, tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Entity not found' });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error: any) {
    if (error.message === 'Tenant context required') {
      return res.status(401).json({ success: false, error: 'Unauthorized - tenant not found' });
    }
    console.error('Get entity error:', error);
    res.status(500).json({ success: false, error: 'Failed to get entity' });
  }
};

/**
 * Create new legal entity
 */
export const createEntity = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId, userId } = getTenantContext(req);
    const {
      name,
      code,
      type,
      registrationNumber,
      vatNumber,
      parentId,
      address,
      city,
      province,
      postalCode,
      country,
      currency,
      chartOfAccountsId
    } = req.body;

    // Validate required fields
    if (!name || !code) {
      return res.status(400).json({ success: false, error: 'Name and code are required' });
    }

    // Check for duplicate code
    const existingCode = await pool.query(
      `SELECT id FROM legal_entities WHERE tenant_id = $1 AND code = $2`,
      [tenantId, code]
    );
    if (existingCode.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'Entity code already exists' });
    }

    // Validate parent if provided
    let level = 0;
    if (parentId) {
      const parentResult = await pool.query(
        `SELECT id, level FROM legal_entities WHERE id = $1 AND tenant_id = $2`,
        [parentId, tenantId]
      );
      if (parentResult.rows.length === 0) {
        return res.status(400).json({ success: false, error: 'Parent entity not found' });
      }
      level = parentResult.rows[0].level + 1;
    }

    const result = await pool.query(
      `INSERT INTO legal_entities 
        (tenant_id, name, code, type, registration_number, vat_number,
         parent_id, level, address, city, province, postal_code, country,
         currency, chart_of_accounts_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING *`,
      [tenantId, name, code, type || 'subsidiary', registrationNumber, vatNumber,
       parentId, level, address, city, province, postalCode, country || 'ZA',
       currency || 'ZAR', chartOfAccountsId, userId]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Entity created'
    });
  } catch (error: any) {
    if (error.message === 'Tenant context required') {
      return res.status(401).json({ success: false, error: 'Unauthorized - tenant not found' });
    }
    console.error('Create entity error:', error);
    res.status(500).json({ success: false, error: 'Failed to create entity' });
  }
};

/**
 * Update legal entity
 */
export const updateEntity = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId, userId } = getTenantContext(req);
    const { id } = req.params;
    const updates = req.body;

    // Verify entity exists and belongs to tenant
    const existingEntity = await pool.query(
      `SELECT * FROM legal_entities WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );

    if (existingEntity.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Entity not found' });
    }

    // Build dynamic update query
    const allowedFields = ['name', 'type', 'registration_number', 'vat_number',
      'address', 'city', 'province', 'postal_code', 'country', 'currency',
      'chart_of_accounts_id', 'status'];
    
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      if (allowedFields.includes(snakeKey)) {
        updateFields.push(`${snakeKey} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid fields to update' });
    }

    updateFields.push(`updated_by = $${paramIndex}`);
    values.push(userId);
    paramIndex++;

    updateFields.push(`updated_at = NOW()`);

    values.push(id, tenantId);

    const result = await pool.query(
      `UPDATE legal_entities SET ${updateFields.join(', ')}
       WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
       RETURNING *`,
      values
    );

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Entity updated'
    });
  } catch (error: any) {
    if (error.message === 'Tenant context required') {
      return res.status(401).json({ success: false, error: 'Unauthorized - tenant not found' });
    }
    console.error('Update entity error:', error);
    res.status(500).json({ success: false, error: 'Failed to update entity' });
  }
};

/**
 * Delete (deactivate) legal entity
 */
export const deleteEntity = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId, userId } = getTenantContext(req);
    const { id } = req.params;

    // Check for child entities
    const childCheck = await pool.query(
      `SELECT id FROM legal_entities WHERE parent_id = $1 AND tenant_id = $2 AND status = 'active'`,
      [id, tenantId]
    );

    if (childCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete entity with active child entities'
      });
    }

    // Soft delete
    const result = await pool.query(
      `UPDATE legal_entities SET 
        status = 'inactive',
        updated_by = $3,
        updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2
       RETURNING id`,
      [id, tenantId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Entity not found' });
    }

    res.json({
      success: true,
      message: 'Entity deactivated'
    });
  } catch (error: any) {
    if (error.message === 'Tenant context required') {
      return res.status(401).json({ success: false, error: 'Unauthorized - tenant not found' });
    }
    console.error('Delete entity error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete entity' });
  }
};

// ============================================================================
// HIERARCHY
// ============================================================================

/**
 * Get entity hierarchy (tree structure)
 */
export const getEntityHierarchy = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId } = getTenantContext(req);

    // Get all entities
    const result = await pool.query(
      `SELECT id, name, code, type, parent_id, level, status
       FROM legal_entities
       WHERE tenant_id = $1 AND status = 'active'
       ORDER BY level, name`,
      [tenantId]
    );

    // Build tree structure
    const entities = result.rows;
    const entityMap = new Map<string, any>();
    const roots: any[] = [];

    // Create map
    for (const entity of entities) {
      entityMap.set(entity.id, { ...entity, children: [] });
    }

    // Build tree
    for (const entity of entities) {
      const node = entityMap.get(entity.id);
      if (entity.parent_id && entityMap.has(entity.parent_id)) {
        entityMap.get(entity.parent_id).children.push(node);
      } else {
        roots.push(node);
      }
    }

    res.json({
      success: true,
      data: roots
    });
  } catch (error: any) {
    if (error.message === 'Tenant context required') {
      return res.status(401).json({ success: false, error: 'Unauthorized - tenant not found' });
    }
    console.error('Get entity hierarchy error:', error);
    res.status(500).json({ success: false, error: 'Failed to get entity hierarchy' });
  }
};

/**
 * Move entity to new parent
 */
export const moveEntity = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId, userId } = getTenantContext(req);
    const { id } = req.params;
    const { newParentId } = req.body;

    // Validate entity
    const entity = await pool.query(
      `SELECT * FROM legal_entities WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );

    if (entity.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Entity not found' });
    }

    // Prevent circular reference
    if (newParentId === id) {
      return res.status(400).json({ success: false, error: 'Entity cannot be its own parent' });
    }

    // Get new parent level
    let newLevel = 0;
    if (newParentId) {
      const parent = await pool.query(
        `SELECT level FROM legal_entities WHERE id = $1 AND tenant_id = $2`,
        [newParentId, tenantId]
      );
      if (parent.rows.length === 0) {
        return res.status(400).json({ success: false, error: 'Parent entity not found' });
      }
      newLevel = parent.rows[0].level + 1;

      // Check for circular reference (new parent shouldn't be descendant of current entity)
      const descendants = await pool.query(
        `WITH RECURSIVE entity_tree AS (
          SELECT id FROM legal_entities WHERE id = $1
          UNION ALL
          SELECT e.id FROM legal_entities e
          JOIN entity_tree t ON e.parent_id = t.id
        )
        SELECT id FROM entity_tree WHERE id = $2`,
        [id, newParentId]
      );

      if (descendants.rows.length > 0) {
        return res.status(400).json({ success: false, error: 'Cannot move to descendant entity' });
      }
    }

    // Update entity
    await pool.query(
      `UPDATE legal_entities SET
        parent_id = $3,
        level = $4,
        updated_by = $5,
        updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId, newParentId, newLevel, userId]
    );

    // Update descendant levels recursively
    await pool.query(
      `WITH RECURSIVE entity_tree AS (
        SELECT id, 1 as depth FROM legal_entities WHERE parent_id = $1 AND tenant_id = $2
        UNION ALL
        SELECT e.id, t.depth + 1 FROM legal_entities e
        JOIN entity_tree t ON e.parent_id = t.id
      )
      UPDATE legal_entities SET level = $3 + entity_tree.depth
      FROM entity_tree
      WHERE legal_entities.id = entity_tree.id`,
      [id, tenantId, newLevel]
    );

    res.json({
      success: true,
      message: 'Entity moved successfully'
    });
  } catch (error: any) {
    if (error.message === 'Tenant context required') {
      return res.status(401).json({ success: false, error: 'Unauthorized - tenant not found' });
    }
    console.error('Move entity error:', error);
    res.status(500).json({ success: false, error: 'Failed to move entity' });
  }
};

/**
 * Get entity ancestors
 */
export const getEntityAncestors = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId } = getTenantContext(req);
    const { id } = req.params;

    const result = await pool.query(
      `WITH RECURSIVE ancestors AS (
        SELECT id, name, code, parent_id, level, 0 as distance
        FROM legal_entities WHERE id = $1 AND tenant_id = $2
        UNION ALL
        SELECT e.id, e.name, e.code, e.parent_id, e.level, a.distance + 1
        FROM legal_entities e
        JOIN ancestors a ON e.id = a.parent_id
      )
      SELECT id, name, code, level, distance
      FROM ancestors
      WHERE distance > 0
      ORDER BY distance`,
      [id, tenantId]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error: any) {
    if (error.message === 'Tenant context required') {
      return res.status(401).json({ success: false, error: 'Unauthorized - tenant not found' });
    }
    console.error('Get entity ancestors error:', error);
    res.status(500).json({ success: false, error: 'Failed to get entity ancestors' });
  }
};

/**
 * Get entity descendants
 */
export const getEntityDescendants = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId } = getTenantContext(req);
    const { id } = req.params;

    const result = await pool.query(
      `WITH RECURSIVE descendants AS (
        SELECT id, name, code, parent_id, level, 0 as distance
        FROM legal_entities WHERE id = $1 AND tenant_id = $2
        UNION ALL
        SELECT e.id, e.name, e.code, e.parent_id, e.level, d.distance + 1
        FROM legal_entities e
        JOIN descendants d ON e.parent_id = d.id
        WHERE e.tenant_id = $2
      )
      SELECT id, name, code, parent_id, level, distance
      FROM descendants
      WHERE distance > 0
      ORDER BY level, name`,
      [id, tenantId]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error: any) {
    if (error.message === 'Tenant context required') {
      return res.status(401).json({ success: false, error: 'Unauthorized - tenant not found' });
    }
    console.error('Get entity descendants error:', error);
    res.status(500).json({ success: false, error: 'Failed to get entity descendants' });
  }
};

// ============================================================================
// ENTITY PERMISSIONS
// ============================================================================

/**
 * Get user entity permissions
 */
export const getUserEntityPermissions = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId } = getTenantContext(req);
    const { userId } = req.params;

    const result = await pool.query(
      `SELECT 
        ep.entity_id,
        e.name as entity_name,
        e.code as entity_code,
        ep.can_view,
        ep.can_edit,
        ep.can_post,
        ep.can_approve
       FROM entity_permissions ep
       JOIN legal_entities e ON ep.entity_id = e.id
       WHERE ep.user_id = $1 AND e.tenant_id = $2`,
      [userId, tenantId]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error: any) {
    if (error.message === 'Tenant context required') {
      return res.status(401).json({ success: false, error: 'Unauthorized - tenant not found' });
    }
    console.error('Get user entity permissions error:', error);
    res.status(500).json({ success: false, error: 'Failed to get entity permissions' });
  }
};

/**
 * Update user entity permissions
 */
export const updateUserEntityPermissions = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId, userId: currentUserId } = getTenantContext(req);
    const { userId } = req.params;
    const { permissions } = req.body;

    if (!Array.isArray(permissions)) {
      return res.status(400).json({ success: false, error: 'Permissions must be an array' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const perm of permissions) {
        // Verify entity belongs to tenant
        const entityCheck = await client.query(
          `SELECT id FROM legal_entities WHERE id = $1 AND tenant_id = $2`,
          [perm.entityId, tenantId]
        );

        if (entityCheck.rows.length === 0) {
          continue; // Skip invalid entities
        }

        await client.query(
          `INSERT INTO entity_permissions 
            (user_id, entity_id, can_view, can_edit, can_post, can_approve, updated_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (user_id, entity_id) DO UPDATE SET
             can_view = $3,
             can_edit = $4,
             can_post = $5,
             can_approve = $6,
             updated_by = $7,
             updated_at = NOW()`,
          [userId, perm.entityId, perm.canView ?? true, perm.canEdit ?? false,
           perm.canPost ?? false, perm.canApprove ?? false, currentUserId]
        );
      }

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'Entity permissions updated'
      });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error: any) {
    if (error.message === 'Tenant context required') {
      return res.status(401).json({ success: false, error: 'Unauthorized - tenant not found' });
    }
    console.error('Update user entity permissions error:', error);
    res.status(500).json({ success: false, error: 'Failed to update entity permissions' });
  }
};

export default {
  getEntities,
  getEntity,
  createEntity,
  updateEntity,
  deleteEntity,
  getEntityHierarchy,
  moveEntity,
  getEntityAncestors,
  getEntityDescendants,
  getUserEntityPermissions,
  updateUserEntityPermissions
};
