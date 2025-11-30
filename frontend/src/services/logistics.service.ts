/**
 * Logistics Module API Service
 * Handles all logistics-related API calls to the backend
 */

import { apiGet, apiPost, apiPut, apiDelete, apiUpload, API_BASE_URL } from './api.service';

// ============================================================================
// TYPES
// ============================================================================

export interface Vehicle {
  vehicle_id: string;
  vehicle_registration: string;
  vin_number?: string;
  make: string;
  model: string;
  vehicle_type: string;
  year_of_manufacture?: number;
  payload_capacity_kg?: number;
  volume_capacity_m3?: number;
  fuel_type?: string;
  fuel_tank_capacity_litres?: number;
  status: string;
  current_location?: string;
  driver_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Driver {
  driver_id: string;
  employee_id?: string;
  first_name: string;
  last_name: string;
  id_number?: string;
  phone?: string;
  email?: string;
  license_number?: string;
  license_type?: string;
  license_expiry_date?: string;
  prdp_number?: string;
  prdp_expiry_date?: string;
  employment_status: string;
  current_vehicle_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Trip {
  trip_id: string;
  trip_number: string;
  sales_order_id?: string;
  customer_id?: string;
  vehicle_id?: string;
  driver_id?: string;
  route_id?: string;
  trip_date: string;
  planned_start_time?: string;
  planned_end_time?: string;
  actual_start_time?: string;
  actual_end_time?: string;
  pickup_location?: string;
  pickup_contact_name?: string;
  pickup_contact_phone?: string;
  delivery_location?: string;
  delivery_contact_name?: string;
  delivery_contact_phone?: string;
  cargo_description?: string;
  cargo_weight_kg?: number;
  cargo_volume_m3?: number;
  number_of_items?: number;
  planned_distance_km?: number;
  actual_distance_km?: number;
  status: string;
  pod_received?: boolean;
  pod_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface FuelTransaction {
  transaction_id: string;
  vehicle_id: string;
  driver_id?: string;
  trip_id?: string;
  transaction_date: string;
  transaction_number?: string;
  fuel_station?: string;
  location?: string;
  fuel_type?: string;
  litres: number;
  price_per_litre: number;
  total_amount: number;
  odometer_reading?: number;
  payment_method?: string;
  reconciled: boolean;
}

export interface Load {
  load_id: string;
  load_number: string;
  load_date: string;
  vehicle_id?: string;
  driver_id?: string;
  total_weight_kg?: number;
  total_volume_m3?: number;
  number_of_orders?: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceRecord {
  maintenance_id: string;
  vehicle_id: string;
  maintenance_type: string;
  maintenance_date: string;
  odometer_reading?: number;
  service_provider?: string;
  invoice_number?: string;
  cost?: number;
  description?: string;
  status: string;
}

export interface DashboardStats {
  vehicles: Array<{ status: string; count: number }>;
  drivers: Array<{ total: number; status: string }>;
  trips_today: Array<{ status: string; count: number }>;
  fuel_this_month: { total_fuel_cost: number; total_litres: number };
  pending_loads: number;
}

export interface PaginatedResponse<T> {
  total: number;
  page: number;
  totalPages: number;
}

export interface VehiclesResponse extends PaginatedResponse<Vehicle> {
  vehicles: Vehicle[];
}

export interface DriversResponse extends PaginatedResponse<Driver> {
  drivers: Driver[];
}

export interface TripsResponse extends PaginatedResponse<Trip> {
  trips: Trip[];
}

export interface FuelTransactionsResponse extends PaginatedResponse<FuelTransaction> {
  fuel_transactions: FuelTransaction[];
}

export interface LoadsResponse extends PaginatedResponse<Load> {
  loads: Load[];
}

// ============================================================================
// DASHBOARD
// ============================================================================

export const getDashboardStats = (): Promise<DashboardStats> => {
  return apiGet<DashboardStats>('/api/logistics/dashboard');
};

// ============================================================================
// VEHICLES / FLEET
// ============================================================================

export const getVehicles = (params?: {
  page?: number;
  limit?: number;
  status?: string;
  vehicle_type?: string;
  search?: string;
}): Promise<VehiclesResponse> => {
  return apiGet<VehiclesResponse>('/api/logistics/vehicles', params);
};

export const getVehicleById = (id: string): Promise<{ vehicle: Vehicle }> => {
  return apiGet<{ vehicle: Vehicle }>(`/api/logistics/vehicles/${id}`);
};

export const createVehicle = (data: Partial<Vehicle>): Promise<{ vehicle: Vehicle }> => {
  return apiPost<{ vehicle: Vehicle }>('/api/logistics/vehicles', data);
};

export const updateVehicle = (id: string, data: Partial<Vehicle>): Promise<{ vehicle: Vehicle }> => {
  return apiPut<{ vehicle: Vehicle }>(`/api/logistics/vehicles/${id}`, data);
};

export const deleteVehicle = (id: string): Promise<{ message: string }> => {
  return apiDelete<{ message: string }>(`/api/logistics/vehicles/${id}`);
};

// ============================================================================
// DRIVERS
// ============================================================================

export const getDrivers = (params?: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}): Promise<DriversResponse> => {
  return apiGet<DriversResponse>('/api/logistics/drivers', params);
};

export const getDriverById = (id: string): Promise<{ driver: Driver }> => {
  return apiGet<{ driver: Driver }>(`/api/logistics/drivers/${id}`);
};

export const createDriver = (data: Partial<Driver>): Promise<{ driver: Driver }> => {
  return apiPost<{ driver: Driver }>('/api/logistics/drivers', data);
};

export const updateDriver = (id: string, data: Partial<Driver>): Promise<{ driver: Driver }> => {
  return apiPut<{ driver: Driver }>(`/api/logistics/drivers/${id}`, data);
};

export const deleteDriver = (id: string): Promise<{ message: string }> => {
  return apiDelete<{ message: string }>(`/api/logistics/drivers/${id}`);
};

// ============================================================================
// TRIPS
// ============================================================================

export const getTrips = (params?: {
  page?: number;
  limit?: number;
  status?: string;
  vehicle_id?: string;
  driver_id?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}): Promise<TripsResponse> => {
  return apiGet<TripsResponse>('/api/logistics/trips', params);
};

export const getTripById = (id: string): Promise<{ trip: Trip & { stops?: any[] } }> => {
  return apiGet<{ trip: Trip & { stops?: any[] } }>(`/api/logistics/trips/${id}`);
};

export const createTrip = (data: Partial<Trip> & { stops?: any[] }): Promise<{ trip: Trip }> => {
  return apiPost<{ trip: Trip }>('/api/logistics/trips', data);
};

export const updateTrip = (id: string, data: Partial<Trip>): Promise<{ trip: Trip }> => {
  return apiPut<{ trip: Trip }>(`/api/logistics/trips/${id}`, data);
};

export const startTrip = (id: string, odometer_reading?: number): Promise<{ trip: Trip; message: string }> => {
  return apiPost<{ trip: Trip; message: string }>(`/api/logistics/trips/${id}/start`, { odometer_reading });
};

export const completeTrip = (
  id: string,
  data: {
    actual_distance_km?: number;
    pod_signature_path?: string;
    pod_photo_path?: string;
    pod_notes?: string;
  }
): Promise<{ trip: Trip; message: string }> => {
  return apiPost<{ trip: Trip; message: string }>(`/api/logistics/trips/${id}/complete`, data);
};

// ============================================================================
// FUEL MANAGEMENT
// ============================================================================

export const getFuelTransactions = (params?: {
  page?: number;
  limit?: number;
  vehicle_id?: string;
  driver_id?: string;
  date_from?: string;
  date_to?: string;
  reconciled?: boolean;
}): Promise<FuelTransactionsResponse> => {
  return apiGet<FuelTransactionsResponse>('/api/logistics/fuel', params);
};

export const createFuelTransaction = (data: Partial<FuelTransaction>): Promise<{ fuel_transaction: FuelTransaction }> => {
  return apiPost<{ fuel_transaction: FuelTransaction }>('/api/logistics/fuel', data);
};

export const reconcileFuelTransaction = (
  id: string,
  data?: { variance_litres?: number; variance_amount?: number }
): Promise<{ fuel_transaction: FuelTransaction; message: string }> => {
  return apiPost<{ fuel_transaction: FuelTransaction; message: string }>(`/api/logistics/fuel/${id}/reconcile`, data);
};

// ============================================================================
// LOAD PLANNING
// ============================================================================

export const getLoads = (params?: {
  page?: number;
  limit?: number;
  status?: string;
  date_from?: string;
  date_to?: string;
}): Promise<LoadsResponse> => {
  return apiGet<LoadsResponse>('/api/logistics/loads', params);
};

export const getLoadById = (id: string): Promise<{ load: Load & { items?: any[] } }> => {
  return apiGet<{ load: Load & { items?: any[] } }>(`/api/logistics/loads/${id}`);
};

export const createLoad = (data: Partial<Load> & { items?: any[] }): Promise<{ load: Load }> => {
  return apiPost<{ load: Load }>('/api/logistics/loads', data);
};

export const updateLoadStatus = (id: string, status: string): Promise<{ load: Load }> => {
  return apiPut<{ load: Load }>(`/api/logistics/loads/${id}/status`, { status });
};

// ============================================================================
// MAINTENANCE
// ============================================================================

export const getMaintenanceRecords = (params?: {
  vehicle_id?: string;
  date_from?: string;
  date_to?: string;
}): Promise<{ maintenance_records: MaintenanceRecord[] }> => {
  return apiGet<{ maintenance_records: MaintenanceRecord[] }>('/api/logistics/maintenance', params);
};

export const createMaintenanceRecord = (data: Partial<MaintenanceRecord>): Promise<{ maintenance_record: MaintenanceRecord }> => {
  return apiPost<{ maintenance_record: MaintenanceRecord }>('/api/logistics/maintenance', data);
};

// ============================================================================
// DOCUMENT PROCESSING (OCR)
// ============================================================================

export const extractDocumentData = async (formData: FormData): Promise<any> => {
  return apiUpload('/api/logistics/documents/extract', formData);
};

// ============================================================================
// WORKSPACE
// ============================================================================

export const getLogisticsWorkspace = (): Promise<any> => {
  return apiGet('/api/logistics/workspace');
};

// ============================================================================
// EXPORT ALL AS DEFAULT OBJECT
// ============================================================================

const logisticsService = {
  // Dashboard
  getDashboardStats,
  
  // Vehicles
  getVehicles,
  getVehicleById,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  
  // Drivers
  getDrivers,
  getDriverById,
  createDriver,
  updateDriver,
  deleteDriver,
  
  // Trips
  getTrips,
  getTripById,
  createTrip,
  updateTrip,
  startTrip,
  completeTrip,
  
  // Fuel
  getFuelTransactions,
  createFuelTransaction,
  reconcileFuelTransaction,
  
  // Loads
  getLoads,
  getLoadById,
  createLoad,
  updateLoadStatus,
  
  // Maintenance
  getMaintenanceRecords,
  createMaintenanceRecord,
  
  // Documents
  extractDocumentData,
  
  // Workspace
  getLogisticsWorkspace,
};

export default logisticsService;
