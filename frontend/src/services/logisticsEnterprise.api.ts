import { apiFetch } from '../utils/api';

export interface TransportationPlanPayload {
  planId?: string;
  planNumber?: string;
  planType?: string;
  status?: string;
  planningHorizon?: { start: string; end: string };
  strategy?: Record<string, unknown>;
  constraints?: Record<string, unknown>;
  capacitySummary?: Record<string, unknown>;
  costProjection?: number;
  serviceLevelTarget?: number;
  stops?: Array<{
    stopId?: string;
    sequence: number;
    stopType: string;
    location: { name: string; lat: number; lng: number; address?: string };
    serviceWindow?: { start: string; end: string };
    loadProfile?: Record<string, unknown>;
    slaMinutes?: number;
  }>;
}

export const logisticsEnterpriseAPI = {
  getFeatureGates: () => apiFetch('/api/logistics/enterprise/feature-gates'),
  getBenchmarks: () => apiFetch('/api/logistics/enterprise/benchmarks'),
  getInnovationRoadmap: () => apiFetch('/api/logistics/enterprise/innovation-roadmap'),

  listTransportationPlans: () => apiFetch('/api/logistics/enterprise/atms/plans'),
  upsertTransportationPlan: (payload: TransportationPlanPayload) =>
    apiFetch('/api/logistics/enterprise/atms/plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),

  getYardOverview: (params?: { zoneType?: string; includeMovements?: boolean }) => {
    const query = new URLSearchParams();
    if (params?.zoneType) query.append('zoneType', params.zoneType);
    if (params?.includeMovements) query.append('includeMovements', 'true');
    return apiFetch(`/api/logistics/enterprise/yard/overview${query.toString() ? `?${query}` : ''}`);
  },

  scheduleDockAppointment: (payload: Record<string, unknown>) =>
    apiFetch('/api/logistics/enterprise/yard/dock-appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),

  submitFreightAudit: (payload: Record<string, unknown>) =>
    apiFetch('/api/logistics/enterprise/freight/audits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),

  upsertCarrierContract: (payload: Record<string, unknown>) =>
    apiFetch('/api/logistics/enterprise/carriers/contracts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),

  scoreCarrierPerformance: (payload: Record<string, unknown>) =>
    apiFetch('/api/logistics/enterprise/carriers/scorecards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),

  recordRevenueRecognition: (payload: Record<string, unknown>) =>
    apiFetch('/api/logistics/enterprise/finance/revenue-recognition', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),

  getRouteProfitability: (params?: { routeId?: string; periodStart?: string; periodEnd?: string }) => {
    const query = new URLSearchParams();
    if (params?.routeId) query.append('routeId', params.routeId);
    if (params?.periodStart) query.append('periodStart', params.periodStart);
    if (params?.periodEnd) query.append('periodEnd', params.periodEnd);
    return apiFetch(`/api/logistics/enterprise/analytics/route-profitability${query.toString() ? `?${query}` : ''}`);
  },

  ingestIotEvent: (payload: Record<string, unknown>) =>
    apiFetch('/api/logistics/enterprise/iot/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),

  createPredictiveMaintenanceAlert: (payload: Record<string, unknown>) =>
    apiFetch('/api/logistics/enterprise/ai/predictive-maintenance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
};

export default logisticsEnterpriseAPI;
