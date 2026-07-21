/**
 * Require Module Component
 * Gates a route/subtree on product-module entitlement (see EntitlementsContext).
 * Renders children unless the tenant has been explicitly denied the module.
 */

import { useEntitlements, ProductModule } from '../contexts/EntitlementsContext';

interface RequireModuleProps {
  module: ProductModule;
  children: React.ReactNode;
}

const RequireModule = ({ module, children }: RequireModuleProps) => {
  const { isModuleEntitled, isLoading } = useEntitlements();

  if (isLoading) {
    return null;
  }

  if (!isModuleEntitled(module)) {
    // TODO(Phase 2): replace with a branded upgrade/upsell page once the
    // product-shell signup flow exists.
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <h2>This module isn't included in your plan</h2>
        <p>Contact your account admin to upgrade and unlock it.</p>
      </div>
    );
  }

  return <>{children}</>;
};

export default RequireModule;
