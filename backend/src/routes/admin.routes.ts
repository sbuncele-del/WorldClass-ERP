import { Router } from 'express';
import AdminControllerV2 from '../controllers/admin.controller.v2';
// Legacy controller for endpoints not yet migrated to V2
import AdminController from '../controllers/admin.controller';
import * as adminWorkspaceController from '../modules/admin/controllers/admin.workspace.controller';
import { tenantMiddleware } from '../middleware/tenant';
import { requirePermission } from '../middleware/permissions';

const router = Router();

/**
 * Admin Routes - NOW USING V2 CONTROLLER for tenant isolation
 * 
 * All routes use tenant middleware for multi-tenant security
 */

// Apply tenant middleware to all routes
router.use(tenantMiddleware);

// ============================================================================
// WORKSPACE
// ============================================================================
router.get('/workspace', adminWorkspaceController.getAdminWorkspace);

// ============================================================================
// USER MANAGEMENT ROUTES (V2 - Tenant Isolated)
// ============================================================================

/**
 * @route   GET /api/admin/users
 * @desc    Get all users with filtering and pagination
 * @access  Admin (requires ADMIN_USERS_MANAGE permission)
 */
router.get(
  '/users',
  requirePermission('ADMIN_USERS_MANAGE'),
  AdminControllerV2.getAllUsers
);

/**
 * @route   GET /api/admin/users/:id
 * @desc    Get user by ID with roles
 * @access  Admin
 */
router.get(
  '/users/:id',
  requirePermission('ADMIN_USERS_MANAGE'),
  AdminControllerV2.getUserById
);

/**
 * @route   POST /api/admin/users
 * @desc    Create new user
 * @access  Admin
 */
router.post(
  '/users',
  requirePermission('ADMIN_USERS_MANAGE'),
  AdminControllerV2.createUser
);

/**
 * @route   PUT /api/admin/users/:id
 * @desc    Update user
 * @access  Admin
 */
router.put(
  '/users/:id',
  requirePermission('ADMIN_USERS_MANAGE'),
  AdminControllerV2.updateUser
);

/**
 * @route   DELETE /api/admin/users/:id
 * @desc    Delete user (soft delete)
 * @access  Admin
 */
router.delete(
  '/users/:id',
  requirePermission('ADMIN_USERS_MANAGE'),
  AdminControllerV2.deleteUser
);

/**
 * @route   POST /api/admin/users/:id/reset-password
 * @desc    Reset user password
 * @access  Admin
 */
router.post(
  '/users/:id/reset-password',
  requirePermission('ADMIN_USERS_MANAGE'),
  AdminController.resetPassword // Legacy - add to V2 later
);

// ============================================================================
// ROLE MANAGEMENT ROUTES (V2 - Tenant Isolated)
// ============================================================================

/**
 * @route   GET /api/admin/roles
 * @desc    Get all roles with user counts
 * @access  Admin (requires ADMIN_ROLES_MANAGE permission)
 */
router.get(
  '/roles',
  requirePermission('ADMIN_ROLES_MANAGE'),
  AdminControllerV2.getRoles
);

/**
 * @route   GET /api/admin/roles/:id
 * @desc    Get role by ID with permissions
 * @access  Admin
 */
router.get(
  '/roles/:id',
  requirePermission('ADMIN_ROLES_MANAGE'),
  AdminController.getRoleById // Legacy - add to V2 later
);

/**
 * @route   POST /api/admin/roles
 * @desc    Create new role
 * @access  Admin
 */
router.post(
  '/roles',
  requirePermission('ADMIN_ROLES_MANAGE'),
  AdminControllerV2.createRole
);

/**
 * @route   POST /api/admin/roles/:id/permissions
 * @desc    Update role permissions
 * @access  Admin
 */
router.post(
  '/roles/:id/permissions',
  requirePermission('ADMIN_ROLES_MANAGE'),
  AdminController.updateRolePermissions // Legacy - add to V2 later
);

// ============================================================================
// PERMISSION ROUTES
// ============================================================================

/**
 * @route   GET /api/admin/permissions
 * @desc    Get all permissions (grouped by module)
 * @access  Admin
 */
router.get(
  '/permissions',
  requirePermission('ADMIN_ROLES_MANAGE'),
  AdminController.getAllPermissions // Legacy - permissions are tenant-independent
);

// ============================================================================
// SYSTEM SETTINGS ROUTES (V2 - Tenant Isolated)
// ============================================================================

/**
 * @route   GET /api/admin/settings
 * @desc    Get all system settings
 * @access  Admin (requires ADMIN_SETTINGS_MANAGE permission)
 */
router.get(
  '/settings',
  requirePermission('ADMIN_SETTINGS_MANAGE'),
  AdminControllerV2.getSettings
);

/**
 * @route   PUT /api/admin/settings/:key
 * @desc    Update system setting
 * @access  Admin
 */
router.put(
  '/settings/:key',
  requirePermission('ADMIN_SETTINGS_MANAGE'),
  AdminControllerV2.updateSettings
);

// ============================================================================
// NOTIFICATION ROUTES (Legacy - needs V2 migration)
// ============================================================================

/**
 * @route   GET /api/admin/notifications
 * @desc    Get user notifications
 * @access  Authenticated users
 */
router.get(
  '/notifications',
  AdminController.getNotifications
);

/**
 * @route   PUT /api/admin/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Authenticated users
 */
router.put(
  '/notifications/:id/read',
  AdminController.markNotificationRead
);

// ============================================================================
// AUDIT LOG ROUTES (V2 - Tenant Isolated)
// ============================================================================

/**
 * @route   GET /api/admin/audit-logs
 * @desc    Get audit logs with filtering
 * @access  Admin
 */
router.get(
  '/audit-logs',
  requirePermission('ADMIN_USERS_MANAGE'),
  AdminControllerV2.getAuditLog
);

export default router;
