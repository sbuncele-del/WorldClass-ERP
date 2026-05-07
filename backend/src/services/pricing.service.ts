/**
 * Subscription Pricing Calculator
 * Single source of truth for all plan pricing.
 *
 * Pricing model: base fee + per-user seat fee
 *   total = baseFee + (seatsAboveIncluded * pricePerExtraSeat)
 *
 * Each plan includes a number of "included seats".
 * Seats beyond the included amount are charged per-seat.
 * Annual billing = 10 months (2 months free).
 */

import pool from '../config/database';

// ─── Plan definitions ────────────────────────────────────────────────────────

export interface PlanDefinition {
  id: string;
  name: string;
  baseFeeMonthly: number;    // ZAR – flat monthly base
  includedSeats: number;     // seats already covered by the base fee
  pricePerExtraSeat: number; // ZAR per additional user / month
  maxSeats: number | null;   // null = unlimited
  features: string[];
  limits: {
    storage: number;    // GB
    transactions: number;
  };
}

export const PLANS: Record<string, PlanDefinition> = {
  starter: {
    id: 'starter',
    name: 'Starter',
    baseFeeMonthly: 299,
    includedSeats: 5,
    pricePerExtraSeat: 49,
    maxSeats: 20,
    features: [
      '5 included users',
      'R49/extra user up to 20',
      'Inventory & Sales',
      'Basic Financial Accounting',
      'Email Support',
    ],
    limits: { storage: 10, transactions: 5000 },
  },
  professional: {
    id: 'professional',
    name: 'Professional',
    baseFeeMonthly: 799,
    includedSeats: 15,
    pricePerExtraSeat: 39,
    maxSeats: 100,
    features: [
      '15 included users',
      'R39/extra user up to 100',
      'All Starter features',
      'HR & Payroll',
      'Manufacturing & WMS',
      'Priority Support',
    ],
    limits: { storage: 50, transactions: 25000 },
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    baseFeeMonthly: 1999,
    includedSeats: 50,
    pricePerExtraSeat: 29,
    maxSeats: null,
    features: [
      '50 included users',
      'R29/extra user (unlimited)',
      'All modules',
      'Multi-entity & Consolidation',
      'Dedicated Account Manager',
      'SLA-backed Support',
    ],
    limits: { storage: 500, transactions: 999999 },
  },
};

// ─── Calculation ─────────────────────────────────────────────────────────────

export interface PricingBreakdown {
  plan: string;
  planName: string;
  userCount: number;
  includedSeats: number;
  extraSeats: number;
  baseFee: number;
  extraSeatFee: number;
  monthlyTotal: number;
  annualTotal: number;       // 10 months (2 free)
  annualSaving: number;
  currency: 'ZAR';
  pricePerExtraSeat: number;
}

/**
 * Calculate the monthly and annual price for a plan + user count.
 */
export function calculatePrice(planId: string, userCount: number): PricingBreakdown {
  const plan = PLANS[planId];
  if (!plan) throw new Error(`Unknown plan: ${planId}`);

  const clampedUsers = Math.max(1, userCount);
  const extraSeats = Math.max(0, clampedUsers - plan.includedSeats);
  const extraSeatFee = extraSeats * plan.pricePerExtraSeat;
  const monthlyTotal = plan.baseFeeMonthly + extraSeatFee;
  const annualTotal = monthlyTotal * 10; // 2 months free
  const annualSaving = monthlyTotal * 2;

  return {
    plan: planId,
    planName: plan.name,
    userCount: clampedUsers,
    includedSeats: plan.includedSeats,
    extraSeats,
    baseFee: plan.baseFeeMonthly,
    extraSeatFee,
    monthlyTotal,
    annualTotal,
    annualSaving,
    currency: 'ZAR',
    pricePerExtraSeat: plan.pricePerExtraSeat,
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
export async function getTenantPricing(tenantId: string, planId: string): Promise<PricingBreakdown> {
  const userCount = await getTenantUserCount(tenantId);
  return calculatePrice(planId, userCount);
}

/**
 * Get pricing breakdown for all plans at the given user count
 */
export function getAllPlanPricing(userCount: number): PricingBreakdown[] {
  return Object.keys(PLANS).map(planId => calculatePrice(planId, userCount));
}
