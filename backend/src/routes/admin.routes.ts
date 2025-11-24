import { Router } from 'express';
import AdminController from '../controllers/admin.controller';
import * as adminWorkspaceController from '../modules/admin/controllers/admin.workspace.controller';
import { authenticateToken } from '../middleware/auth';
import { requirePermission } from '../middleware/permissions';

const router = Router();

/**
 * Admin Routes
 * 
 * All routes require authentication
 * Most routes require specific permissions
 */

// ============================================================================
// WORKSPACE
// ============================================================================
router.get('/workspace', authenticateToken, adminWorkspaceController.getAdminWorkspace);

// ============================================================================
// USER MANAGEMENT ROUTES
// ============================================================================

/**
 * @route   GET /api/admin/users
 * @desc    Get all users with filtering and pagination
 * @access  Admin (requires ADMIN_USERS_MANAGE permission)
 */
router.get(
  '/users',
  authenticateToken,
  requirePermission('ADMIN_USERS_MANAGE'),
  AdminController.getAllUsers
);

/**
 * @route   GET /api/admin/users/:id
 * @desc    Get user by ID with roles
 * @access  Admin
 */
router.get(
  '/users/:id',
  authenticateToken,
  requirePermission('ADMIN_USERS_MANAGE'),
  AdminController.getUserById
);

/**
 * @route   POST /api/admin/users
 * @desc    Create new user
 * @access  Admin
 */
router.post(
  '/users',
  authenticateToken,
  requirePermission('ADMIN_USERS_MANAGE'),
  AdminController.createUser
);

/**
 * @route   PUT /api/admin/users/:id
 * @desc    Update user
 * @access  Admin
 */
router.put(
  '/users/:id',
  authenticateToken,
  requirePermission('ADMIN_USERS_MANAGE'),
  AdminController.updateUser
);

/**
 * @route   DELETE /api/admin/users/:id
 * @desc    Delete user (soft delete)
 * @access  Admin
 */
router.delete(
  '/users/:id',
  authenticateToken,
  requirePermission('ADMIN_USERS_MANAGE'),
  AdminController.deleteUser
);

/**
 * @route   POST /api/admin/users/:id/reset-password
 * @desc    Reset user password
 * @access  Admin
 */
router.post(
  '/users/:id/reset-password',
  authenticateToken,
  requirePermission('ADMIN_USERS_MANAGE'),
  AdminController.resetPassword
);

// ============================================================================
// ROLE MANAGEMENT ROUTES
// ============================================================================

/**
 * @route   GET /api/admin/roles
 * @desc    Get all roles with user counts
 * @access  Admin (requires ADMIN_ROLES_MANAGE permission)
 */
router.get(
  '/roles',
  authenticateToken,
  requirePermission('ADMIN_ROLES_MANAGE'),
  AdminController.getAllRoles
);

/**
 * @route   GET /api/admin/roles/:id
 * @desc    Get role by ID with permissions
 * @access  Admin
 */
router.get(
  '/roles/:id',
  authenticateToken,
  requirePermission('ADMIN_ROLES_MANAGE'),
  AdminController.getRoleById
);

/**
 * @route   POST /api/admin/roles
 * @desc    Create new role
 * @access  Admin
 */
router.post(
  '/roles',
  authenticateToken,
  requirePermission('ADMIN_ROLES_MANAGE'),
  AdminController.createRole
);

/**
 * @route   POST /api/admin/roles/:id/permissions
 * @desc    Update role permissions
 * @access  Admin
 */
router.post(
  '/roles/:id/permissions',
  authenticateToken,
  requirePermission('ADMIN_ROLES_MANAGE'),
  AdminController.updateRolePermissions
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
  authenticateToken,
  requirePermission('ADMIN_ROLES_MANAGE'),
  AdminController.getAllPermissions
);

// ============================================================================
// SYSTEM SETTINGS ROUTES
// ============================================================================

/**
 * @route   GET /api/admin/settings
 * @desc    Get all system settings
 * @access  Admin (requires ADMIN_SETTINGS_MANAGE permission)
 */
router.get(
  '/settings',
  authenticateToken,
  requirePermission('ADMIN_SETTINGS_MANAGE'),
  AdminController.getAllSettings
);

/**
 * @route   PUT /api/admin/settings/:key
 * @desc    Update system setting
 * @access  Admin
 */
router.put(
  '/settings/:key',
  authenticateToken,
  requirePermission('ADMIN_SETTINGS_MANAGE'),
  AdminController.updateSetting
);

// ============================================================================
// NOTIFICATION ROUTES
// ============================================================================

/**
 * @route   GET /api/admin/notifications
 * @desc    Get user notifications
 * @access  Authenticated users
 */
router.get(
  '/notifications',
  authenticateToken,
  AdminController.getNotifications
);

/**
 * @route   PUT /api/admin/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Authenticated users
 */
router.put(
  '/notifications/:id/read',
  authenticateToken,
  AdminController.markNotificationRead
);

// ============================================================================
// AUDIT LOG ROUTES
// ============================================================================

/**
 * @route   GET /api/admin/audit-logs
 * @desc    Get audit logs with filtering
 * @access  Admin
 */
router.get(
  '/audit-logs',
  authenticateToken,
  requirePermission('ADMIN_USERS_MANAGE'), // Or specific AUDIT permission
  AdminController.getAuditLogs
);

export default router;
