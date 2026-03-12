/**
 * Usage Cap Controller (V2)
 * Endpoints for viewing and managing usage limits and consumption.
 */

import { Response } from 'express';
import { TenantRequest } from '../types';
import { UsageCapService } from '../services/usage-cap.service';

function getTenantContext(req: TenantRequest): { tenantId: string; userId: string } {
  const tenantId = req.tenant?.id;
  if (!tenantId) throw new Error('Tenant context required');
  return { tenantId, userId: req.user?.id || '' };
}

/**
 * GET /usage — Get all usage statuses for the current tenant
 */
export const getUsageSummary = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId } = getTenantContext(req);
    const usage = await UsageCapService.getAllUsage(tenantId);
    res.json({ success: true, data: usage });
  } catch (error: any) {
    if (error.message === 'Tenant context required') {
      return res.status(401).json({ success: false, error: 'Unauthorized - tenant not found' });
    }
    console.error('Get usage summary error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch usage summary' });
  }
};

/**
 * GET /usage/:resourceType — Check usage for a specific resource
 */
export const getResourceUsage = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId } = getTenantContext(req);
    const { resourceType } = req.params;

    const validTypes = ['ai_queries', 'video_minutes', 'emails', 'storage_gb'];
    if (!validTypes.includes(resourceType)) {
      return res.status(400).json({ success: false, error: `Invalid resource type. Valid: ${validTypes.join(', ')}` });
    }

    const status = await UsageCapService.checkUsage(tenantId, null, resourceType);
    res.json({ success: true, data: status });
  } catch (error: any) {
    if (error.message === 'Tenant context required') {
      return res.status(401).json({ success: false, error: 'Unauthorized - tenant not found' });
    }
    console.error('Get resource usage error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch resource usage' });
  }
};

/**
 * GET /usage/history — Get usage history for billing
 */
export const getUsageHistory = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId } = getTenantContext(req);
    const months = parseInt(req.query.months as string) || 6;
    const history = await UsageCapService.getUsageHistory(tenantId, Math.min(months, 24));
    res.json({ success: true, data: history });
  } catch (error: any) {
    if (error.message === 'Tenant context required') {
      return res.status(401).json({ success: false, error: 'Unauthorized - tenant not found' });
    }
    console.error('Get usage history error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch usage history' });
  }
};

/**
 * PUT /usage/limits/:resourceType — Update usage limit (admin only)
 */
export const updateUsageLimit = async (req: TenantRequest, res: Response) => {
  try {
    const { tenantId } = getTenantContext(req);
    const { resourceType } = req.params;
    const { monthly_limit, overage_rate, is_hard_cap } = req.body;

    const validTypes = ['ai_queries', 'video_minutes', 'emails', 'storage_gb'];
    if (!validTypes.includes(resourceType)) {
      return res.status(400).json({ success: false, error: `Invalid resource type. Valid: ${validTypes.join(', ')}` });
    }

    if (typeof monthly_limit !== 'number' || monthly_limit < 0) {
      return res.status(400).json({ success: false, error: 'monthly_limit must be a non-negative number' });
    }

    await UsageCapService.updateLimit(
      tenantId,
      resourceType,
      monthly_limit,
      typeof overage_rate === 'number' ? overage_rate : 0,
      typeof is_hard_cap === 'boolean' ? is_hard_cap : false
    );

    res.json({ success: true, message: `Usage limit updated for ${resourceType}` });
  } catch (error: any) {
    if (error.message === 'Tenant context required') {
      return res.status(401).json({ success: false, error: 'Unauthorized - tenant not found' });
    }
    console.error('Update usage limit error:', error);
    res.status(500).json({ success: false, error: 'Failed to update usage limit' });
  }
};

export default {
  getUsageSummary,
  getResourceUsage,
  getUsageHistory,
  updateUsageLimit,
};
