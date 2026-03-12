import apiClient from './api';

// ─── Base URL ────────────────────────────────────────────────────────────
// V2 routes are mounted at /api/v2 in the backend (v1Router.use('/v2', v2Routes))
const BASE = '/api/v2/assets';

// ─── Types ───────────────────────────────────────────────────────────────

export interface FixedAsset {
  asset_id: string;
  asset_number: string;
  asset_name: string;
  description?: string;
  category_id?: string;
  category_name?: string;
  category_code?: string;
  acquisition_cost: number;
  acquisition_date: string;
  in_service_date?: string;
  purchase_cost?: number;
  residual_value: number;
  useful_life_months: number;
  depreciation_method: string;
  accumulated_depreciation: number;
  book_value: number;
  asset_status: string;
  location_id?: string;
  department_id?: string;
  cost_center_id?: string;
  serial_number?: string;
  manufacturer?: string;
  model_number?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
  depreciation_schedule?: DepreciationEntry[];
  maintenance_history?: AssetMaintenance[];
}

export interface AssetCategory {
  category_id: string;
  category_code: string;
  category_name: string;
  description?: string;
  default_useful_life_years?: number;
  default_useful_life_months?: number;
  default_depreciation_method?: string;
  default_residual_value_percentage?: number;
  minimum_capitalization_amount?: number;
  is_active?: boolean;
  asset_count?: number | string;
  created_at?: string;
}

export interface AssetDisposal {
  disposal_id?: string;
  asset_id: string;
  asset_number?: string;
  asset_name?: string;
  disposal_date: string;
  disposal_type: string;
  disposal_amount: number;
  book_value_at_disposal?: number;
  gain_loss?: number;
  reason?: string;
  notes?: string;
  created_by?: string;
  created_at?: string;
}

export interface AssetTransfer {
  transfer_id?: string;
  asset_id: string;
  asset_number?: string;
  asset_name?: string;
  transfer_date: string;
  from_location_id?: string;
  to_location_id?: string;
  from_department_id?: string;
  to_department_id?: string;
  from_cost_center_id?: string;
  to_cost_center_id?: string;
  reason?: string;
  notes?: string;
  created_by?: string;
  created_at?: string;
}

export interface AssetMaintenance {
  maintenance_id?: string;
  asset_id: string;
  asset_number?: string;
  asset_name?: string;
  maintenance_type: string;
  maintenance_date: string;
  description?: string;
  cost?: number;
  vendor?: string;
  status?: string;
  next_maintenance_date?: string;
  notes?: string;
  created_by?: string;
  created_at?: string;
}

export interface DepreciationEntry {
  schedule_id?: string;
  asset_id?: string;
  period_number?: number;
  depreciation_amount?: number;
  accumulated_depreciation?: number;
  book_value?: number;
  is_posted?: boolean;
  posted_date?: string;
}

export interface AssetDashboard {
  summary: {
    total_assets: number;
    total_categories: number;
    total_acquisition_cost: number;
    total_book_value: number;
    total_accumulated_depreciation: number;
    active_assets: number;
    under_maintenance: number;
  };
  byCategory: any[];
  upcomingMaintenance: any[];
}

export interface AssetListResponse {
  success: boolean;
  data: FixedAsset[];
  total: number;
  page: number;
  limit: number;
  summary: {
    total_assets: string;
    total_acquisition_cost: string;
    active_assets: string;
    idle_assets: string;
    under_maintenance: string;
    disposed_assets: string;
  };
}

export interface AssetLocation {
  id: string;
  name: string;
  code?: string;
  address?: string;
  is_active?: boolean;
}

// ─── Helper ──────────────────────────────────────────────────────────────

const extractData = (response: any): any => {
  return response.data?.data || response.data || response;
};

// ─── Service ─────────────────────────────────────────────────────────────

export const assetService = {

  // ── Dashboard ────────────────────────────────────────────────────────
  async getDashboard(): Promise<AssetDashboard> {
    const { data } = await apiClient.get(`${BASE}/dashboard`);
    return data.data || data;
  },

  // ── Assets CRUD ──────────────────────────────────────────────────────
  async getAssets(params?: {
    page?: number;
    limit?: number;
    category_id?: string;
    asset_status?: string;
    location_id?: string;
    department_id?: string;
    cost_center_id?: string;
    search?: string;
    sort_by?: string;
    sort_order?: string;
  }): Promise<AssetListResponse> {
    const { data } = await apiClient.get(BASE, { params });
    return data;
  },

  async getAssetById(id: string): Promise<FixedAsset> {
    const { data } = await apiClient.get(`${BASE}/${id}`);
    return extractData({ data });
  },

  async createAsset(asset: Partial<FixedAsset>): Promise<FixedAsset> {
    const { data } = await apiClient.post(BASE, asset);
    return extractData({ data });
  },

  async updateAsset(id: string, asset: Partial<FixedAsset>): Promise<FixedAsset> {
    const { data } = await apiClient.put(`${BASE}/${id}`, asset);
    return extractData({ data });
  },

  async deleteAsset(id: string): Promise<any> {
    const { data } = await apiClient.delete(`${BASE}/${id}`);
    return data;
  },

  // ── Categories ───────────────────────────────────────────────────────
  async getCategories(): Promise<AssetCategory[]> {
    const { data } = await apiClient.get(`${BASE}/categories`);
    return data.data || data || [];
  },

  async createCategory(category: Partial<AssetCategory>): Promise<AssetCategory> {
    const { data } = await apiClient.post(`${BASE}/categories`, category);
    return extractData({ data });
  },

  // ── Locations ────────────────────────────────────────────────────────
  async getLocations(): Promise<AssetLocation[]> {
    const { data } = await apiClient.get(`${BASE}/locations`);
    return data.data || data || [];
  },

  // ── Depreciation ────────────────────────────────────────────────────
  async getDepreciationSchedule(): Promise<DepreciationEntry[]> {
    const { data } = await apiClient.get(`${BASE}/depreciation`);
    return data.data || data || [];
  },

  async runDepreciation(periodEndDate: string): Promise<{ success: boolean; message: string; data: { processedAssets: number; totalDepreciation: string } }> {
    const { data } = await apiClient.post(`${BASE}/depreciation/run`, { period_end_date: periodEndDate });
    return data;
  },

  // ── Disposals ────────────────────────────────────────────────────────
  async getDisposals(params?: { page?: number; limit?: number }): Promise<AssetDisposal[]> {
    const { data } = await apiClient.get(`${BASE}/disposals`, { params });
    return data.data || data || [];
  },

  async createDisposal(disposal: Partial<AssetDisposal>): Promise<AssetDisposal> {
    const { data } = await apiClient.post(`${BASE}/disposals`, disposal);
    return extractData({ data });
  },

  // ── Transfers ────────────────────────────────────────────────────────
  async getTransfers(params?: { page?: number; limit?: number }): Promise<AssetTransfer[]> {
    const { data } = await apiClient.get(`${BASE}/transfers`, { params });
    return data.data || data || [];
  },

  async createTransfer(transfer: Partial<AssetTransfer>): Promise<AssetTransfer> {
    const { data } = await apiClient.post(`${BASE}/transfers`, transfer);
    return extractData({ data });
  },

  // ── Maintenance ──────────────────────────────────────────────────────
  async getMaintenance(assetId: string, params?: { status?: string; page?: number; limit?: number }): Promise<AssetMaintenance[]> {
    const { data } = await apiClient.get(`${BASE}/${assetId}/maintenance`, { params });
    return data.data || data || [];
  },

  async createMaintenance(assetId: string, maintenance: Partial<AssetMaintenance>): Promise<AssetMaintenance> {
    const { data } = await apiClient.post(`${BASE}/${assetId}/maintenance`, maintenance);
    return extractData({ data });
  },
};
