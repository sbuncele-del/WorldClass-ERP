import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

/**
 * Authentication Middleware
 * 
 * Verifies JWT tokens and adds user info to request
 */

export interface AuthRequest extends Request {
  user?: {
    userId: number;
    tenantId: number;
    email: string;
    role: string;
  };
}

/**
 * Authenticate JWT token middleware
 * 
 * Verifies the Authorization header and decodes the JWT token.
 * Adds user information to req.user if valid.
 */
export function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Access token required',
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: number;
      tenantId: number;
      email: string;
      role: string;
    };

    req.user = decoded;
    next();
  } catch (error) {
    res.status(403).json({
      success: false,
      error: 'Invalid or expired token',
    });
    return;
  }
}
