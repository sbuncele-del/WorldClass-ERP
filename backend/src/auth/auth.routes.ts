import { Router } from 'express';
import AuthController from './auth.controller';
import { tenantMiddleware } from '../middleware/tenant';
import { authenticateToken } from '../middleware/auth';
import * as ProfileController from '../controllers/profile.controller';

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

export default router;
