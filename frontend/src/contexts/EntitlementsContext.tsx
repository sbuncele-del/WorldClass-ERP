import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { apiFetch } from '../utils/api';

export type ProductModule = 'projects' | 'booking' | 'fleet';

interface EntitlementsState {
  modules: Record<ProductModule, boolean>;
  subscriptionPlan?: string;
  isLoading: boolean;
  error?: string;
  refresh: () => Promise<void>;
  isModuleEntitled: (module: ProductModule) => boolean;
}

// Modules default to entitled until the fetch resolves (or if it never runs,
// e.g. logged out) so nothing renders a false "not entitled" flash for the
// existing ERP experience.
const DEFAULT_MODULES: Record<ProductModule, boolean> = {
  projects: true,
  booking: true,
  fleet: true,
};

const DEFAULT_STATE: EntitlementsState = {
  modules: DEFAULT_MODULES,
  isLoading: false,
  refresh: async () => undefined,
  isModuleEntitled: () => true,
};

const EntitlementsContext = createContext<EntitlementsState | undefined>(undefined);

export const EntitlementsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<EntitlementsState>(DEFAULT_STATE);

  const loadEntitlements = useCallback(async () => {
    const token = localStorage.getItem('token') || localStorage.getItem('authToken');
    if (!token) {
      setState((prev) => ({ ...prev, isLoading: false, refresh: loadEntitlements }));
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: undefined }));
    try {
      const response = await apiFetch('/api/entitlements');
      const modules = { ...DEFAULT_MODULES, ...response.modules };
      setState({
        modules,
        subscriptionPlan: response.subscriptionPlan,
        isLoading: false,
        refresh: loadEntitlements,
        isModuleEntitled: (module: ProductModule) => modules[module] !== false,
      });
    } catch (error: any) {
      console.error('Failed to load entitlements', error);
      // Fail open: keep the default all-entitled state so an outage never
      // locks tenants out of modules they already have access to.
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error?.message || 'Failed to load entitlements',
        refresh: loadEntitlements,
      }));
    }
  }, []);

  useEffect(() => {
    loadEntitlements();
  }, [loadEntitlements]);

  return (
    <EntitlementsContext.Provider value={state}>
      {children}
    </EntitlementsContext.Provider>
  );
};

export const useEntitlements = (): EntitlementsState => {
  const ctx = useContext(EntitlementsContext);
  if (!ctx) {
    throw new Error('useEntitlements must be used within an EntitlementsProvider');
  }
  return ctx;
};
