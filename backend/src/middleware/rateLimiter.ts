import rateLimit from 'express-rate-limit';

/**
 * Rate Limiting Middleware Configuration
 * 
 * Protects against brute force attacks and API abuse
 * Different limits for different endpoint types
 */

// General API rate limiter - 1000 requests per 15 minutes (increased for testing/development)
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Strict rate limiter for authentication endpoints - 5 requests per 15 minutes
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login/signup attempts per windowMs
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP, please try again after 15 minutes.'
  },
  skipSuccessfulRequests: true, // Don't count successful requests
  standardHeaders: true,
  legacyHeaders: false,
});

// Moderate rate limiter for password reset - 3 requests per hour
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 password reset attempts per hour
  message: {
    success: false,
    message: 'Too many password reset attempts, please try again after an hour.'
  },
  standardHeaders: true,
  legacyHeaders: false,
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
});

// Payment webhook rate limiter - More generous for payment gateways
export const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 50, // 50 requests per minute (payment gateways can retry)
  message: {
    success: false,
    message: 'Too many webhook requests.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Super admin endpoints - More generous for administrative tasks
export const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // 500 requests per 15 minutes
  message: {
    success: false,
    message: 'Too many admin requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
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
});
