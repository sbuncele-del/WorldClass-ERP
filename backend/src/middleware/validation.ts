import { body, param, query, ValidationChain } from 'express-validator';

/**
 * Input Validation Rules
 * 
 * Centralized validation rules for all endpoints
 * Prevents SQL injection, XSS, and invalid data
 */

// Authentication Validation
export const signupValidation: ValidationChain[] = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('firstName')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('First name is required (max 100 characters)')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('First name can only contain letters, spaces, hyphens, and apostrophes'),
  body('lastName')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Last name is required (max 100 characters)')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes'),
  body('companyName')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Company name is required (max 255 characters)'),
  body('country')
    .optional()
    .isISO31661Alpha2()
    .withMessage('Country must be a valid ISO 3166-1 alpha-2 code'),
];

export const loginValidation: ValidationChain[] = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

export const passwordResetRequestValidation: ValidationChain[] = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
];

export const passwordResetValidation: ValidationChain[] = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
];

// Payment Validation
export const paymentSessionValidation: ValidationChain[] = [
  body('plan')
    .isIn(['trial', 'starter', 'professional', 'enterprise'])
    .withMessage('Valid plan is required'),
  body('billingCycle')
    .isIn(['monthly', 'annual'])
    .withMessage('Billing cycle must be monthly or annual'),
  body('country')
    .optional()
    .isISO31661Alpha2()
    .withMessage('Country must be a valid ISO 3166-1 alpha-2 code'),
];

// Subscription Validation
export const subscriptionUpgradeValidation: ValidationChain[] = [
  body('plan')
    .isIn(['starter', 'professional', 'enterprise'])
    .withMessage('Valid plan is required'),
];

export const subscriptionCancelValidation: ValidationChain[] = [
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Cancellation reason must be 500 characters or less'),
];

// UUID Validation (for params)
export const uuidValidation: ValidationChain[] = [
  param('id')
    .isUUID()
    .withMessage('Valid UUID is required'),
];

// Pagination Validation
export const paginationValidation: ValidationChain[] = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be 0 or greater'),
];

// Search Validation
export const searchValidation: ValidationChain[] = [
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters'),
];

// Tenant Management Validation (Super Admin)
export const tenantSuspendValidation: ValidationChain[] = [
  param('id').isUUID().withMessage('Valid tenant ID required'),
  body('reason')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Suspension reason must be between 10 and 500 characters'),
];

export const impersonationValidation: ValidationChain[] = [
  body('userId')
    .isUUID()
    .withMessage('Valid user ID is required'),
];

// Feature Flag Validation
export const featureFlagValidation: ValidationChain[] = [
  param('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .matches(/^[a-z0-9_]+$/)
    .withMessage('Feature flag name must be lowercase alphanumeric with underscores'),
  body('enabled')
    .isBoolean()
    .withMessage('enabled must be a boolean'),
  body('rolloutPercentage')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Rollout percentage must be between 0 and 100'),
];

// Financial Entry Validation
export const journalEntryValidation: ValidationChain[] = [
  body('date')
    .isISO8601()
    .withMessage('Valid date is required (ISO 8601 format)'),
  body('description')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Description is required (max 500 characters)'),
  body('lines')
    .isArray({ min: 2 })
    .withMessage('At least 2 journal entry lines are required'),
  body('lines.*.accountId')
    .isUUID()
    .withMessage('Valid account ID is required for each line'),
  body('lines.*.debit')
    .optional()
    .isDecimal({ decimal_digits: '0,2' })
    .withMessage('Debit must be a valid decimal number'),
  body('lines.*.credit')
    .optional()
    .isDecimal({ decimal_digits: '0,2' })
    .withMessage('Credit must be a valid decimal number'),
  body('lines.*.description')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Line description must be 255 characters or less'),
];

// Customer/Supplier Validation
export const customerValidation: ValidationChain[] = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Name is required (max 255 characters)'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('phone')
    .optional()
    .trim()
    .matches(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/)
    .withMessage('Valid phone number is required'),
  body('taxNumber')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Tax number must be 50 characters or less'),
];

// Product Validation
export const productValidation: ValidationChain[] = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Product name is required (max 255 characters)'),
  body('sku')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .matches(/^[A-Z0-9-]+$/)
    .withMessage('SKU must be uppercase alphanumeric with hyphens'),
  body('unitPrice')
    .isDecimal({ decimal_digits: '0,2' })
    .withMessage('Unit price must be a valid decimal number'),
  body('category')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Category must be 100 characters or less'),
];

// Invoice Validation
export const invoiceValidation: ValidationChain[] = [
  body('customerId')
    .isUUID()
    .withMessage('Valid customer ID is required'),
  body('date')
    .isISO8601()
    .withMessage('Valid invoice date is required'),
  body('dueDate')
    .isISO8601()
    .withMessage('Valid due date is required'),
  body('items')
    .isArray({ min: 1 })
    .withMessage('At least one invoice item is required'),
  body('items.*.productId')
    .optional()
    .isUUID()
    .withMessage('Valid product ID is required'),
  body('items.*.description')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Item description is required (max 255 characters)'),
  body('items.*.quantity')
    .isFloat({ min: 0.01 })
    .withMessage('Quantity must be greater than 0'),
  body('items.*.unitPrice')
    .isDecimal({ decimal_digits: '0,2' })
    .withMessage('Unit price must be a valid decimal number'),
];

// Date Range Validation
export const dateRangeValidation: ValidationChain[] = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be in ISO 8601 format'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be in ISO 8601 format'),
];

// File Upload Validation
export const fileUploadValidation: ValidationChain[] = [
  body('module')
    .optional()
    .isIn(['invoice', 'receipt', 'product', 'document'])
    .withMessage('Invalid module type'),
];

export default {
  signupValidation,
  loginValidation,
  passwordResetRequestValidation,
  passwordResetValidation,
  paymentSessionValidation,
  subscriptionUpgradeValidation,
  subscriptionCancelValidation,
  uuidValidation,
  paginationValidation,
  searchValidation,
  tenantSuspendValidation,
  impersonationValidation,
  featureFlagValidation,
  journalEntryValidation,
  customerValidation,
  productValidation,
  invoiceValidation,
  dateRangeValidation,
  fileUploadValidation,
};
