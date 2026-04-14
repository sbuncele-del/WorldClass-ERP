/**
 * Siyabusa Financial Reporting Platform - Frontend API Service
 * Communicates with /api/v2/reporting/* endpoints
 */

const API_BASE = '/api/v2/reporting';

function getHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: { ...getHeaders(), ...(options?.headers || {}) },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// ============================================================================
// ENGAGEMENTS
// ============================================================================

export interface EngagementListParams {
  status?: string;
  year?: number;
  search?: string;
}

export const engagementApi = {
  list: (params?: EngagementListParams) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.year) qs.set('year', String(params.year));
    if (params?.search) qs.set('search', params.search);
    const query = qs.toString();
    return request<ApiResponse>(`/engagements${query ? `?${query}` : ''}`);
  },

  get: (id: string) => request<ApiResponse>(`/engagements/${id}`),

  create: (data: Record<string, unknown>) =>
    request<ApiResponse>('/engagements', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: Record<string, unknown>) =>
    request<ApiResponse>(`/engagements/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  delete: (id: string) =>
    request<ApiResponse>(`/engagements/${id}`, { method: 'DELETE' }),

  lock: (id: string) =>
    request<ApiResponse>(`/engagements/${id}/lock`, { method: 'POST' }),

  unlock: (id: string) =>
    request<ApiResponse>(`/engagements/${id}/unlock`, { method: 'POST' }),

  rollForward: (id: string) =>
    request<ApiResponse>(`/engagements/${id}/roll-forward`, { method: 'POST' }),
};

// ============================================================================
// TRIAL BALANCE
// ============================================================================

export const trialBalanceApi = {
  get: (engagementId: string) =>
    request<ApiResponse>(`/engagements/${engagementId}/trial-balance`),

  upsertAccount: (engagementId: string, data: Record<string, unknown>) =>
    request<ApiResponse>(`/engagements/${engagementId}/trial-balance/accounts`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  bulkImport: (engagementId: string, accounts: unknown[], source: string) =>
    request<ApiResponse>(`/engagements/${engagementId}/trial-balance/import`, {
      method: 'POST',
      body: JSON.stringify({ accounts, source }),
    }),

  importFromGL: (engagementId: string) =>
    request<ApiResponse>(`/engagements/${engagementId}/trial-balance/import-gl`, {
      method: 'POST',
    }),

  linkAccount: (engagementId: string, accountCode: string, linkNumber: string) =>
    request<ApiResponse>(`/engagements/${engagementId}/trial-balance/link`, {
      method: 'PUT',
      body: JSON.stringify({ account_code: accountCode, link_number: linkNumber }),
    }),

  autoLink: (engagementId: string) =>
    request<ApiResponse>(`/engagements/${engagementId}/trial-balance/auto-link`, {
      method: 'POST',
    }),

  getAvailableLinks: (engagementId: string, search?: string) => {
    const qs = search ? `?search=${encodeURIComponent(search)}` : '';
    return request<ApiResponse>(`/engagements/${engagementId}/link-numbers${qs}`);
  },
};

// ============================================================================
// FINANCIAL STATEMENTS
// ============================================================================

export const statementsApi = {
  sofp: (engagementId: string) =>
    request<ApiResponse>(`/engagements/${engagementId}/statements/sofp`),

  soci: (engagementId: string) =>
    request<ApiResponse>(`/engagements/${engagementId}/statements/soci`),

  soce: (engagementId: string) =>
    request<ApiResponse>(`/engagements/${engagementId}/statements/soce`),

  scf: (engagementId: string) =>
    request<ApiResponse>(`/engagements/${engagementId}/statements/scf`),

  detailedIS: (engagementId: string) =>
    request<ApiResponse>(`/engagements/${engagementId}/statements/detailed-is`),

  taxComputation: (engagementId: string) =>
    request<ApiResponse>(`/engagements/${engagementId}/statements/tax-computation`),
};

// ============================================================================
// NOTES & DISCLOSURES
// ============================================================================

export const notesApi = {
  list: (engagementId: string) =>
    request<ApiResponse>(`/engagements/${engagementId}/notes`),

  update: (engagementId: string, noteId: string, data: Record<string, unknown>) =>
    request<ApiResponse>(`/engagements/${engagementId}/notes/${noteId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

export const disclosureApi = {
  list: (engagementId: string) =>
    request<ApiResponse>(`/engagements/${engagementId}/disclosures`),

  update: (engagementId: string, disclosureId: string, data: Record<string, unknown>) =>
    request<ApiResponse>(`/engagements/${engagementId}/disclosures/${disclosureId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// ============================================================================
// REFERENCE DATA
// ============================================================================

export const referenceApi = {
  frameworks: () => request<ApiResponse>('/frameworks'),
  workingPaperTypes: () => request<ApiResponse>('/working-paper-types'),
};

// ============================================================================
// TYPES
// ============================================================================

interface ApiResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  message?: string;
  meta?: { total?: number };
}
