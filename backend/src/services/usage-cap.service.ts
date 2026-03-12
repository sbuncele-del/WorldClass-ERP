/**
 * Usage Cap Service
 * Tracks resource consumption per tenant and enforces monthly limits.
 * Resources: ai_queries, video_minutes, emails, storage_gb
 */

import pool from '../config/database';

export interface UsageStatus {
  resource_type: string;
  used: number;
  limit: number;
  remaining: number;
  overage: number;
  overage_cost: number;
  is_hard_cap: boolean;
  blocked: boolean;
}

interface UsageLimit {
  resource_type: string;
  monthly_limit: number;
  overage_rate: number;
  is_hard_cap: boolean;
}

const DEFAULT_LIMITS: Record<string, { limit: number; rate: number; hard: boolean }> = {
  ai_queries:    { limit: 50,   rate: 0.25, hard: false },
  video_minutes: { limit: 200,  rate: 0.50, hard: false },
  emails:        { limit: 1000, rate: 0.05, hard: false },
  storage_gb:    { limit: 5,    rate: 10.0, hard: false },
};

function getPeriodStart(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

export class UsageCapService {

  /**
   * Record usage and check if within limits.
   * Returns { allowed, status } — allowed=false means hard cap reached.
   */
  static async recordUsage(
    tenantId: string,
    userId: string | null,
    resourceType: string,
    units: number = 1,
    metadata?: Record<string, unknown>
  ): Promise<{ allowed: boolean; status: UsageStatus }> {
    const periodStart = getPeriodStart();

    // Get limit for this resource
    const limitResult = await pool.query(
      `SELECT monthly_limit, overage_rate, is_hard_cap FROM usage_limits
       WHERE tenant_id = $1 AND resource_type = $2`,
      [tenantId, resourceType]
    );

    const limit: UsageLimit = limitResult.rows[0] || {
      resource_type: resourceType,
      monthly_limit: DEFAULT_LIMITS[resourceType]?.limit ?? 100,
      overage_rate: DEFAULT_LIMITS[resourceType]?.rate ?? 0,
      is_hard_cap: DEFAULT_LIMITS[resourceType]?.hard ?? false,
    };

    // Get or create tracking row (upsert)
    const trackResult = await pool.query(
      `INSERT INTO usage_tracking (tenant_id, user_id, resource_type, period_start, usage_count)
       VALUES ($1, $2, $3, $4, 0)
       ON CONFLICT (tenant_id, user_id, resource_type, period_start) DO NOTHING
       RETURNING usage_count`,
      [tenantId, userId, resourceType, periodStart]
    );

    // Fetch current count
    const currentResult = await pool.query(
      `SELECT usage_count FROM usage_tracking
       WHERE tenant_id = $1 AND COALESCE(user_id::text, '') = COALESCE($2::text, '') AND resource_type = $3 AND period_start = $4`,
      [tenantId, userId, resourceType, periodStart]
    );

    const currentUsage = currentResult.rows[0]?.usage_count ?? 0;
    const newTotal = currentUsage + units;
    const wouldExceed = newTotal > limit.monthly_limit;

    // If hard cap and would exceed, block
    if (wouldExceed && limit.is_hard_cap) {
      const status: UsageStatus = {
        resource_type: resourceType,
        used: currentUsage,
        limit: limit.monthly_limit,
        remaining: Math.max(0, limit.monthly_limit - currentUsage),
        overage: Math.max(0, currentUsage - limit.monthly_limit),
        overage_cost: Math.max(0, currentUsage - limit.monthly_limit) * limit.overage_rate,
        is_hard_cap: true,
        blocked: true,
      };
      return { allowed: false, status };
    }

    // Record the event
    await pool.query(
      `INSERT INTO usage_events (tenant_id, user_id, resource_type, units, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [tenantId, userId, resourceType, units, metadata ? JSON.stringify(metadata) : null]
    );

    // Update tracking
    const overage = Math.max(0, newTotal - limit.monthly_limit);
    const overageCost = overage * limit.overage_rate;

    await pool.query(
      `UPDATE usage_tracking 
       SET usage_count = usage_count + $1, 
           overage_count = GREATEST(0, usage_count + $1 - $5),
           overage_cost = GREATEST(0, usage_count + $1 - $5) * $6::numeric,
           updated_at = NOW()
       WHERE tenant_id = $2 AND COALESCE(user_id::text, '') = COALESCE($3::text, '') AND resource_type = $4 AND period_start = $7`,
      [units, tenantId, userId, resourceType, limit.monthly_limit, limit.overage_rate, periodStart]
    );

    const status: UsageStatus = {
      resource_type: resourceType,
      used: newTotal,
      limit: limit.monthly_limit,
      remaining: Math.max(0, limit.monthly_limit - newTotal),
      overage,
      overage_cost: overageCost,
      is_hard_cap: limit.is_hard_cap,
      blocked: false,
    };

    return { allowed: true, status };
  }

  /**
   * Check usage without recording — read-only check.
   */
  static async checkUsage(tenantId: string, userId: string | null, resourceType: string): Promise<UsageStatus> {
    const periodStart = getPeriodStart();

    const [limitResult, trackResult] = await Promise.all([
      pool.query(
        `SELECT monthly_limit, overage_rate, is_hard_cap FROM usage_limits WHERE tenant_id = $1 AND resource_type = $2`,
        [tenantId, resourceType]
      ),
      pool.query(
        `SELECT usage_count, overage_count, overage_cost FROM usage_tracking
         WHERE tenant_id = $1 AND COALESCE(user_id::text, '') = COALESCE($2::text, '') AND resource_type = $3 AND period_start = $4`,
        [tenantId, userId, resourceType, periodStart]
      ),
    ]);

    const limit = limitResult.rows[0] || {
      monthly_limit: DEFAULT_LIMITS[resourceType]?.limit ?? 100,
      overage_rate: DEFAULT_LIMITS[resourceType]?.rate ?? 0,
      is_hard_cap: DEFAULT_LIMITS[resourceType]?.hard ?? false,
    };

    const used = trackResult.rows[0]?.usage_count ?? 0;

    return {
      resource_type: resourceType,
      used,
      limit: limit.monthly_limit,
      remaining: Math.max(0, limit.monthly_limit - used),
      overage: Math.max(0, used - limit.monthly_limit),
      overage_cost: trackResult.rows[0]?.overage_cost ?? 0,
      is_hard_cap: limit.is_hard_cap,
      blocked: limit.is_hard_cap && used >= limit.monthly_limit,
    };
  }

  /**
   * Get all usage statuses for a tenant (dashboard view).
   */
  static async getAllUsage(tenantId: string): Promise<UsageStatus[]> {
    const periodStart = getPeriodStart();

    const result = await pool.query(
      `SELECT l.resource_type, l.monthly_limit, l.overage_rate, l.is_hard_cap,
              COALESCE(t.usage_count, 0) as used,
              COALESCE(t.overage_count, 0) as overage,
              COALESCE(t.overage_cost, 0) as overage_cost
       FROM usage_limits l
       LEFT JOIN usage_tracking t 
         ON l.tenant_id = t.tenant_id AND l.resource_type = t.resource_type 
         AND t.period_start = $2 AND t.user_id IS NULL
       WHERE l.tenant_id = $1
       ORDER BY l.resource_type`,
      [tenantId, periodStart]
    );

    return result.rows.map(row => ({
      resource_type: row.resource_type,
      used: parseInt(row.used, 10),
      limit: row.monthly_limit,
      remaining: Math.max(0, row.monthly_limit - row.used),
      overage: parseInt(row.overage, 10),
      overage_cost: parseFloat(row.overage_cost),
      is_hard_cap: row.is_hard_cap,
      blocked: row.is_hard_cap && row.used >= row.monthly_limit,
    }));
  }

  /**
   * Update limits for a tenant (admin action).
   */
  static async updateLimit(
    tenantId: string,
    resourceType: string,
    monthlyLimit: number,
    overageRate: number,
    isHardCap: boolean
  ): Promise<void> {
    await pool.query(
      `INSERT INTO usage_limits (tenant_id, resource_type, monthly_limit, overage_rate, is_hard_cap, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (tenant_id, resource_type) DO UPDATE
       SET monthly_limit = $3, overage_rate = $4, is_hard_cap = $5, updated_at = NOW()`,
      [tenantId, resourceType, monthlyLimit, overageRate, isHardCap]
    );
  }

  /**
   * Initialize default limits for a new tenant.
   */
  static async initializeTenantLimits(tenantId: string): Promise<void> {
    for (const [resourceType, config] of Object.entries(DEFAULT_LIMITS)) {
      await pool.query(
        `INSERT INTO usage_limits (tenant_id, resource_type, monthly_limit, overage_rate, is_hard_cap)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (tenant_id, resource_type) DO NOTHING`,
        [tenantId, resourceType, config.limit, config.rate, config.hard]
      );
    }
  }

  /**
   * Get usage history (monthly breakdown) for billing.
   */
  static async getUsageHistory(tenantId: string, months: number = 6): Promise<any[]> {
    const result = await pool.query(
      `SELECT resource_type, period_start, usage_count, overage_count, overage_cost
       FROM usage_tracking
       WHERE tenant_id = $1 AND user_id IS NULL AND period_start >= (CURRENT_DATE - ($2 || ' months')::interval)
       ORDER BY period_start DESC, resource_type`,
      [tenantId, months]
    );
    return result.rows;
  }
}
