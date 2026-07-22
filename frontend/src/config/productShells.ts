/**
 * Product Shell Registry
 *
 * Each standalone product deployment sets VITE_PRODUCT at build time (one
 * Vercel project per product). The default build (no VITE_PRODUCT set) is
 * the full ERP shell — this is what the existing siyabusaerp.co.za
 * deployment is and remains, unchanged.
 *
 * Mirrors backend/src/config/moduleRegistry.ts's PRODUCT_MODULES, but this
 * registry is a frontend/build-time concept (which shell is this build) —
 * actual access control still lives server-side via requireModule().
 */

import type { ProductModule } from '../contexts/EntitlementsContext';

export type ProductShellKey = 'erp' | 'projects' | 'booking' | 'fleet';

export interface ProductShell {
  key: ProductShellKey;
  brandName: string;
  /** 'all' for the ERP shell; a single module for a standalone product shell. */
  modules: ProductModule[] | 'all';
  /** Where an authenticated user lands inside /app for this shell. */
  homeRoute: string;
}

export const PRODUCT_SHELLS: Record<ProductShellKey, ProductShell> = {
  erp: {
    key: 'erp',
    brandName: 'SiyaBusa ERP',
    modules: 'all',
    homeRoute: '/app/dashboard',
  },
  projects: {
    key: 'projects',
    brandName: 'Flowspace',
    modules: ['projects'],
    homeRoute: '/app/projects/list',
  },
  booking: {
    key: 'booking',
    brandName: 'SiyaBusa Booking',
    modules: ['booking'],
    homeRoute: '/app/booking',
  },
  fleet: {
    key: 'fleet',
    brandName: 'SiyaBusa Fleet',
    modules: ['fleet'],
    homeRoute: '/app/fleet',
  },
};

export const getCurrentProductShell = (): ProductShell => {
  const key = (import.meta.env.VITE_PRODUCT as ProductShellKey | undefined) || 'erp';
  return PRODUCT_SHELLS[key] ?? PRODUCT_SHELLS.erp;
};
