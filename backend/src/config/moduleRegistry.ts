/**
 * Product Module Registry
 *
 * Source of truth for which standalone products can be carved out of the
 * ERP monorepo via entitlement shells (see Product Shells Platform initiative).
 *
 * Distinct from controllers/modules.controller.ts's MODULE_REGISTRY, which is
 * an industry-based UI discovery catalog and has no tie to tenant entitlements.
 */

export const PRODUCT_MODULES = ['projects', 'booking', 'fleet'] as const;

export type ProductModule = typeof PRODUCT_MODULES[number];

export const isProductModule = (value: string): value is ProductModule =>
  (PRODUCT_MODULES as readonly string[]).includes(value);

/** The tenant.features key that gates a given product module. */
export const moduleFeatureFlag = (module: ProductModule): string => `module_${module}`;
