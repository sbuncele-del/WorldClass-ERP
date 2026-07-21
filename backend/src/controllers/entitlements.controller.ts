/**
 * Entitlements Controller
 *
 * Reports which product modules the current tenant is entitled to, computed
 * from tenant.features. A missing module_* flag counts as entitled, so this
 * is safe to call for every existing tenant without any data backfill.
 */

import { Response } from 'express';
import { TenantRequest } from '../types';
import { PRODUCT_MODULES, moduleFeatureFlag } from '../config/moduleRegistry';

export const getEntitlements = async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    if (!req.tenant) {
      res.status(401).json({ success: false, error: 'Tenant context required' });
      return;
    }

    const modules = Object.fromEntries(
      PRODUCT_MODULES.map((module) => [module, req.tenant!.features[moduleFeatureFlag(module)] !== false])
    );

    res.json({
      success: true,
      subscriptionPlan: req.tenant.subscription_plan,
      modules,
    });
  } catch (error: any) {
    console.error('Error fetching entitlements:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch entitlements', message: error.message });
  }
};
