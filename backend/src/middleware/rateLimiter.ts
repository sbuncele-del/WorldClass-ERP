import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { getRedisClient } from '../config/redis-connection';

/**
 * Rate Limiting Middleware Configuration
 * 
 * Protects against brute force attacks and API abuse
 * Different limits for different endpoint types
 * 
 * Uses Redis for distributed state management across instances/processes.
 */

// Helper to create Redis Store
const createStore = (prefix: string) => {
  return new RedisStore({
    sendCommand: (...args: string[]) => (getRedisClient() as any).call(...args),
    prefix: `rl:${prefix}:`, // Unique prefix for each limiter
  });
};

// General API rate limiter - 1000 requests per 15 minutes
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: createStore('api'),
});

// Strict rate limiter for authentication endpoints - 5 requests per 15 minutes
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP, please try again after 15 minutes.'
  },
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  store: createStore('auth'),
});

// Moderate rate limiter for password reset - 3 requests per hour
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: {
    success: false,
    message: 'Too many password reset attempts, please try again after an hour.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: createStore('pwd_reset'),
});

// Demo access rate limiter - 10 demo accesses per hour per IP
export const demoLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: {
    success: false,
    message: 'Too many demo access attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: createStore('demo'),
});

// Payment webhook rate limiter - More generous for payment gateways
export const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 50,
  message: {
    success: false,
    message: 'Too many webhook requests.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: createStore('webhook'),
});

// Super admin endpoints - More generous for administrative tasks
export const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  message: {
    success: false,
    message: 'Too many admin requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: createStore('admin'),
});

// File upload rate limiter - 20 uploads per hour
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: {
    success: false,
    message: 'Too many file uploads, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: createStore('upload'),
});
