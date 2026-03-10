import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import apiClient from '../services/api';

export interface Entity {
  id: string;
  name: string;
  code: string;
  entity_type: 'holding' | 'subsidiary' | 'branch' | 'division';
  parent_id: string | null;
  country: string;
  currency: string;
  ownership_percentage: number;
  is_active: boolean;
  created_at: string;
}

interface EntityContextType {
  // Current working entity
  currentEntity: Entity | null;
  // All entities user has access to
  entities: Entity[];
  // The root/holding company
  holdingCompany: Entity | null;
  // Loading state
  loading: boolean;
  // Switch to a different entity
  switchEntity: (entityId: string) => void;
  // Switch back to holding company
  switchToHolding: () => void;
  // Refresh entities list
  refreshEntities: () => Promise<void>;
  // Check if currently in a subsidiary
  isInSubsidiary: boolean;
  // Get parent chain (breadcrumb path)
  getEntityPath: () => Entity[];
  // Version counter that increments on each entity switch (use as useEffect dep)
  entityVersion: number;
}

const EntityContext = createContext<EntityContextType | undefined>(undefined);

export const EntityProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentEntity, setCurrentEntity] = useState<Entity | null>(null);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [holdingCompany, setHoldingCompany] = useState<Entity | null>(null);
  const [loading, setLoading] = useState(true);
  const [entityVersion, setEntityVersion] = useState(0);

  const fetchEntities = async () => {
    // Double-check token exists before making API call
    const token = localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('accessToken');
    if (!token) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const response = await apiClient.get('/api/v2/entities/hierarchy');
      if (response.data.success && response.data.data) {
        const allEntities = flattenEntities(response.data.data);
        setEntities(allEntities);
        
        // Find holding company (no parent or entity_type === 'holding')
        const holding = allEntities.find(e => !e.parent_id || e.entity_type === 'holding');
        setHoldingCompany(holding || null);
        
        // If no current entity selected, default to holding
        if (!currentEntity && holding) {
          setCurrentEntity(holding);
          localStorage.setItem('currentEntityId', holding.id);
        } else if (currentEntity) {
          // Refresh current entity data
          const updated = allEntities.find(e => e.id === currentEntity.id);
          if (updated) setCurrentEntity(updated);
        }
      }
    } catch (error) {
      // Silently fail - don't log or redirect
      console.error('Failed to fetch entities:', error);
    } finally {
      setLoading(false);
    }
  };

  // Flatten hierarchical entities into a flat list
  const flattenEntities = (entities: any[], result: Entity[] = []): Entity[] => {
    entities.forEach(entity => {
      result.push({
        id: entity.id,
        name: entity.name,
        code: entity.code,
        entity_type: entity.entity_type || 'subsidiary',
        parent_id: entity.parent_id,
        country: entity.country || 'ZA',
        currency: entity.currency || 'ZAR',
        ownership_percentage: entity.ownership_percentage || 100,
        is_active: entity.is_active !== false,
        created_at: entity.created_at,
      });
      if (entity.children && entity.children.length > 0) {
        flattenEntities(entity.children, result);
      }
    });
    return result;
  };

  const switchEntity = (entityId: string) => {
    const entity = entities.find(e => e.id === entityId);
    if (entity) {
      setCurrentEntity(entity);
      localStorage.setItem('currentEntityId', entityId);
      // Increment version to trigger re-fetches in consuming components
      setEntityVersion(v => v + 1);
      // Trigger a custom event so other components can react
      window.dispatchEvent(new CustomEvent('entityChanged', { detail: entity }));
      // Force all mounted components to refetch data with the new entity context
      // Small delay to ensure localStorage is set before refetch triggers
      setTimeout(() => {
        window.dispatchEvent(new Event('entityDataRefresh'));
      }, 100);
    }
  };

  const switchToHolding = () => {
    if (holdingCompany) {
      switchEntity(holdingCompany.id);
    }
  };

  const getEntityPath = (): Entity[] => {
    if (!currentEntity) return [];
    
    const path: Entity[] = [];
    let current: Entity | undefined = currentEntity;
    
    while (current) {
      path.unshift(current);
      current = entities.find(e => e.id === current?.parent_id);
    }
    
    return path;
  };

  // Load saved entity on mount
  useEffect(() => {
    const savedEntityId = localStorage.getItem('currentEntityId');
    if (savedEntityId && entities.length > 0) {
      const saved = entities.find(e => e.id === savedEntityId);
      if (saved) {
        setCurrentEntity(saved);
      }
    }
  }, [entities]);

  // Fetch entities on mount (only if authenticated)
  useEffect(() => {
    // Check if user is authenticated before fetching (check both keys)
    const token = localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('accessToken');
    if (token) {
      fetchEntities();
    } else {
      setLoading(false);
    }
  }, []);

  const value: EntityContextType = {
    currentEntity,
    entities,
    holdingCompany,
    loading,
    switchEntity,
    switchToHolding,
    refreshEntities: fetchEntities,
    isInSubsidiary: currentEntity?.entity_type !== 'holding' && currentEntity?.parent_id !== null,
    getEntityPath,
    entityVersion,
  };

  return (
    <EntityContext.Provider value={value}>
      {children}
    </EntityContext.Provider>
  );
};

export const useEntity = (): EntityContextType => {
  const context = useContext(EntityContext);
  if (!context) {
    throw new Error('useEntity must be used within an EntityProvider');
  }
  return context;
};

/**
 * Hook that calls a callback whenever the active entity changes.
 * Use this in any module to auto-refetch data on entity switch.
 * 
 * @example
 * useEntityRefresh(() => { fetchSalesData(); fetchDashboard(); });
 */
export const useEntityRefresh = (callback: () => void) => {
  const { entityVersion } = useEntity();
  const callbackRef = React.useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (entityVersion > 0) {
      callbackRef.current();
    }
  }, [entityVersion]);
};

export default EntityContext;
