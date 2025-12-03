import { Router, Request, Response } from 'express';
import AuthController from './auth.controller';
import { tenantMiddleware } from '../middleware/tenant';
import { authenticateToken } from '../middleware/auth';
import * as ProfileController from '../controllers/profile.controller';
import { getUserPermissions, RolePermissions } from '../middleware/rbac.middleware';

const router = Router();

/**
 * Public Authentication Routes
 */

// Company signup (creates tenant + admin user)
router.post('/signup', AuthController.signup);

// User login
router.post('/login', AuthController.login);

// Refresh access token
router.post('/refresh', AuthController.refresh);

// Logout (revoke refresh token)
router.post('/logout', AuthController.logout);

// Forgot password (request reset token)
router.post('/forgot-password', AuthController.forgotPassword);

// Reset password with token
router.post('/reset-password', AuthController.resetPassword);

// Verify email address
router.get('/verify-email/:token', AuthController.verifyEmail);

// Resend email verification
router.post('/resend-verification', AuthController.resendVerification);

/**
 * Protected Routes (require authentication)
 */

// Get current user info
router.get('/me', tenantMiddleware, AuthController.me);

// Profile management
router.get('/profile', authenticateToken, ProfileController.getProfile);
router.patch('/profile', authenticateToken, ProfileController.updateProfile);
router.post('/change-password', authenticateToken, ProfileController.changePassword);
router.post('/avatar', authenticateToken, ProfileController.uploadAvatar);
router.delete('/avatar', authenticateToken, ProfileController.deleteAvatar);

// Get user's effective permissions (for UI feature toggling)
router.get('/permissions', authenticateToken, (req: Request, res: Response) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  const roles = user.roles || ['VIEWER'];
  const permissions = getUserPermissions(roles);
  
  res.json({
    userId: user.userId,
    email: user.email,
    roles,
    permissions,
    availableRoles: Object.keys(RolePermissions),
  });
});

export default router;
