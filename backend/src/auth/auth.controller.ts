import { Response } from 'express';
import { TenantRequest } from '../types';
import AuthService from './auth.service';
import WelcomeEmailService from '../services/welcome-email.service';
import fs from 'fs';

export class AuthController {
  /**
   * POST /api/auth/signup
   * Company signup (creates tenant + admin user)
   */
  static async signup(req: TenantRequest, res: Response): Promise<void> {
    try {
      const { 
        companyName, 
        companySlug, 
        email, 
        password, 
        firstName, 
        lastName,
        plan = 'starter',
        billingCycle = 'monthly'
      } = req.body;

      // Validation
      if (!companyName || !email || !password || !firstName || !lastName) {
        res.status(400).json({ 
          error: 'Missing required fields',
          required: ['companyName', 'email', 'password', 'firstName', 'lastName']
        });
        return;
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        res.status(400).json({ error: 'Invalid email format' });
        return;
      }

      // Password validation (min 8 chars, 1 uppercase, 1 lowercase, 1 number)
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
      if (!passwordRegex.test(password)) {
        res.status(400).json({ 
          error: 'Password must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 number' 
        });
        return;
      }

      // Plan validation
      const validPlans = ['starter', 'professional', 'enterprise'];
      if (!validPlans.includes(plan)) {
        res.status(400).json({ error: 'Invalid plan', validPlans });
        return;
      }

      const result = await AuthService.signup({
        companyName,
        companySlug,
        email,
        password,
        firstName,
        lastName,
        plan,
        billingCycle
      });

      // Send welcome email (non-blocking)
      WelcomeEmailService.sendWelcomeEmail(email, result.user.id)
        .catch(err => console.error('Failed to send welcome email:', err));

      res.status(201).json({
        success: true,
        message: 'Company account created successfully',
        data: result
      });
    } catch (error: any) {
      // EXPLICIT ERROR LOGGING TO FILE
      const errorLog = `
=== SIGNUP ERROR ${new Date().toISOString()} ===
Request body: ${JSON.stringify(req.body, null, 2)}
Error name: ${error?.name}
Error message: ${error?.message}
Error stack: ${error?.stack}
=== END SIGNUP ERROR ===
`;
      fs.appendFileSync('/tmp/signup-errors.log', errorLog);
      console.error('=== SIGNUP ERROR START ===');
      console.error('Error name:', error?.name);
      console.error('Error message:', error?.message);
      console.error('Error stack:', error?.stack);
      console.error('=== SIGNUP ERROR END ===');

      if (error.name === 'ConflictError') {
        res.status(409).json({ error: error.message });
      } else if (error.name === 'ValidationError') {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to create account', details: error?.message });
      }
    }
  }

  /**
   * POST /api/auth/login
   * User login (returns JWT tokens)
   */
  static async login(req: TenantRequest, res: Response): Promise<void> {
    try {
      const { email, password, tenantSlug } = req.body;

      if (!email || !password) {
        res.status(400).json({ 
          error: 'Email and password are required' 
        });
        return;
      }

      // Get device info from request
      const deviceInfo = {
        ip_address: req.ip || req.headers['x-forwarded-for'] || 'unknown',
        user_agent: req.headers['user-agent'] || 'unknown'
      };

      const result = await AuthService.login(
        { email, password, tenantSlug },
        deviceInfo
      );

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: result
      });
    } catch (error: any) {
      console.error('=== LOGIN ERROR START ===');
      console.error('Error name:', error?.name);
      console.error('Error message:', error?.message);
      console.error('Error stack:', error?.stack);
      console.error('=== LOGIN ERROR END ===');

      if (error.name === 'UnauthorizedError') {
        res.status(401).json({ error: error.message });
      } else if (error.name === 'ValidationError') {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Login failed', details: error?.message });
      }
    }
  }

  /**
   * POST /api/auth/refresh
   * Refresh access token
   */
  static async refresh(req: TenantRequest, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({ error: 'Refresh token is required' });
        return;
      }

      const tokens = await AuthService.refreshToken(refreshToken);

      res.status(200).json({
        success: true,
        data: tokens
      });
    } catch (error: any) {
      console.error('Refresh token error:', error);

      if (error.name === 'UnauthorizedError') {
        res.status(401).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Token refresh failed' });
      }
    }
  }

  /**
   * POST /api/auth/logout
   * Logout (revoke refresh token)
   */
  static async logout(req: TenantRequest, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (refreshToken) {
        await AuthService.logout(refreshToken);
      }

      res.status(200).json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error: any) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Logout failed' });
    }
  }

  /**
   * POST /api/auth/forgot-password
   * Request password reset
   */
  static async forgotPassword(req: TenantRequest, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      if (!email) {
        res.status(400).json({ error: 'Email is required' });
        return;
      }

      await AuthService.forgotPassword(email);

      // Always return success (don't reveal if email exists)
      res.status(200).json({
        success: true,
        message: 'If the email exists, a password reset link has been sent'
      });
    } catch (error: any) {
      console.error('Forgot password error:', error);
      res.status(500).json({ error: 'Request failed' });
    }
  }

  /**
   * POST /api/auth/reset-password
   * Reset password with token
   */
  static async resetPassword(req: TenantRequest, res: Response): Promise<void> {
    try {
      const { resetToken, newPassword } = req.body;

      if (!resetToken || !newPassword) {
        res.status(400).json({ error: 'Reset token and new password are required' });
        return;
      }

      // Password validation
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
      if (!passwordRegex.test(newPassword)) {
        res.status(400).json({ 
          error: 'Password must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 number' 
        });
        return;
      }

      await AuthService.resetPassword(resetToken, newPassword);

      res.status(200).json({
        success: true,
        message: 'Password reset successfully'
      });
    } catch (error: any) {
      console.error('Reset password error:', error);

      if (error.name === 'ValidationError') {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Password reset failed' });
      }
    }
  }

  /**
   * GET /api/auth/me
   * Get current user info (requires authentication)
   */
  static async me(req: TenantRequest, res: Response): Promise<void> {
    try {
      // User and tenant are already attached by tenantMiddleware
      if (!req.user || !req.tenant) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const userInfo = await AuthService.me(req.user.id, req.tenant.id);

      res.status(200).json({
        success: true,
        data: userInfo
      });
    } catch (error: any) {
      console.error('Get user error:', error);

      if (error.name === 'NotFoundError') {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to get user info' });
      }
    }
  }

  /**
   * GET /api/auth/verify-email/:token
   * Verify email address
   */
  static async verifyEmail(req: TenantRequest, res: Response): Promise<void> {
    try {
      const { token } = req.params;

      // TODO: Implement email verification
      // For now, return not implemented
      res.status(501).json({ 
        error: 'Email verification not yet implemented' 
      });
    } catch (error: any) {
      console.error('Email verification error:', error);
      res.status(500).json({ error: 'Verification failed' });
    }
  }

  /**
   * POST /api/auth/resend-verification
   * Resend email verification
   */
  static async resendVerification(req: TenantRequest, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      if (!email) {
        res.status(400).json({ error: 'Email is required' });
        return;
      }

      // TODO: Implement email verification
      res.status(501).json({ 
        error: 'Email verification not yet implemented' 
      });
    } catch (error: any) {
      console.error('Resend verification error:', error);
      res.status(500).json({ error: 'Request failed' });
    }
  }
}

export default AuthController;
