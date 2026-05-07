/**
 * Subscription Pricing
 * Flat R399 per user per month — all modules included.
 * Annual billing = 10 months (2 months free).
 */

import pool from '../config/database';

export const PRICE_PER_USER_MONTHLY = 399; // ZAR

export interface PricingBreakdown {
  userCount: number;
  pricePerUser: number;
  monthlyTotal: number;
  annualTotal: number;     // 10 months (2 months free)
  annualSaving: number;
  currency: 'ZAR';
}

/**
 * Calculate the monthly and annual price based on user count.
 */
export function calculatePrice(userCount: number): PricingBreakdown {
  const count = Math.max(1, userCount);
  const monthlyTotal = count * PRICE_PER_USER_MONTHLY;
  const annualTotal = monthlyTotal * 10;
  const annualSaving = monthlyTotal * 2;

  return {
    userCount: count,
    pricePerUser: PRICE_PER_USER_MONTHLY,
    monthlyTotal,
    annualTotal,
    annualSaving,
    currency: 'ZAR',
  };
}

/**
 * Get the active user count for a tenant from the database.
 */
export async function getTenantUserCount(tenantId: string): Promise<number> {
  const result = await pool.query(
    `SELECT COUNT(*) AS count
     FROM users
     WHERE tenant_id = $1
       AND deleted_at IS NULL
       AND is_active = true`,
    [tenantId]
  );
  return parseInt(result.rows[0]?.count ?? '1', 10) || 1;
}

/**
 * Get the calculated price for a tenant based on their actual user count.
 */
export async function getTenantPricing(tenantId: string): Promise<PricingBreakdown> {
  const userCount = await getTenantUserCount(tenantId);
  return calculatePrice(userCount);
}

