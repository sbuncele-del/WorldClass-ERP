/**
 * Logistics API Service
 * Centralized service for all logistics module API calls
 */

import { getApiUrl, apiFetch, uploadFile } from '../utils/api';

export interface Trip {
  trip_id: string;
  customer: string;
  origin: string;
  destination: string;
  driver: string;
  vehicle_reg: string;
  status: 'Planned' | 'Assigned' | 'Loading' | 'In Transit' | 'Delivered' | 'Cancelled';
  pod_status: 'Pending' | 'Received';
  eta: string;
  created_at?: string;
  updated_at?: string;
}

export interface Vehicle {
  vehicle_id: number;
  vehicle_number: string;
  registration_number: string;
  make: string;
  model: string;
  vehicle_type: string;
  year_of_manufacture: number;
  status: string;
  current_driver: string;
  last_service_date: string;
  next_service_date: string;
  next_service_km: number;
  current_odometer: number;
  license_expiry: string;
  roadworthy_expiry: string;
  insurance_expiry: string;
}

export interface FuelTransaction {
  id: number;
  vehicle_reg: string;
  driver: string;
  liters: number;
  cost: number;
  odometer: number;
  station: string;
  date: string;
  status: 'pending' | 'reconciled';
}

export interface DocumentExtraction {
  success: boolean;
  message: string;
  filename: string;
  extractedText: string;
  parsedData: any;
  confidence: number;
  processedAt: string;
}

/**
 * Trips API
 */
export const tripsAPI = {
  /**
   * Get all trips with optional filters
   */
  async getTrips(filters?: {
    status?: string;
    pod_status?: string;
    customer?: string;
    driver?: string;
    from_date?: string;
    to_date?: string;
  }): Promise<{ trips: Trip[]; total: number }> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
    }

    const url = `/api/logistics/trips${params.toString() ? `?${params.toString()}` : ''}`;
    return apiFetch(url);
  },

  /**
   * Get single trip by ID
   */
  async getTripById(tripId: string): Promise<Trip> {
    return apiFetch(`/api/logistics/trips/${tripId}`);
  },

  /**
   * Create new trip
   */
  async createTrip(tripData: Partial<Trip>): Promise<Trip> {
    return apiFetch('/api/logistics/trips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tripData),
    });
  },

  /**
   * Update trip
   */
  async updateTrip(tripId: string, tripData: Partial<Trip>): Promise<Trip> {
    return apiFetch(`/api/logistics/trips/${tripId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tripData),
    });
  },

  /**
   * Update trip status
   */
  async updateTripStatus(tripId: string, status: Trip['status']): Promise<void> {
    return apiFetch(`/api/logistics/trips/${tripId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
  },

  /**
   * Start trip
   */
  async startTrip(tripId: string): Promise<void> {
    return apiFetch(`/api/logistics/trips/${tripId}/start`, {
      method: 'POST',
    });
  },

  /**
   * Complete trip
   */
  async completeTrip(tripId: string, podData?: any): Promise<void> {
    return apiFetch(`/api/logistics/trips/${tripId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(podData || {}),
    });
  },
};

/**
 * Fuel Management API
 */
export const fuelAPI = {
  /**
   * Get all fuel transactions
   */
  async getFuelTransactions(filters?: {
    vehicle_reg?: string;
    driver?: string;
    from_date?: string;
    to_date?: string;
  }): Promise<FuelTransaction[]> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
    }

    const url = `/api/logistics/fuel${params.toString() ? `?${params.toString()}` : ''}`;
    return apiFetch(url);
  },

  /**
   * Create fuel transaction
   */
  async createFuelTransaction(data: Partial<FuelTransaction>): Promise<FuelTransaction> {
    return apiFetch('/api/logistics/fuel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  /**
   * Reconcile fuel transaction
   */
  async reconcileFuelTransaction(id: number): Promise<void> {
    return apiFetch(`/api/logistics/fuel/${id}/reconcile`, {
      method: 'POST',
    });
  },
};

/**
 * Loads API
 */
export const loadsAPI = {
  /**
   * Get all loads
   */
  async getLoads(): Promise<any[]> {
    return apiFetch('/api/logistics/loads');
  },

  /**
   * Get load by ID
   */
  async getLoadById(loadId: string): Promise<any> {
    return apiFetch(`/api/logistics/loads/${loadId}`);
  },

  /**
   * Create new load
   */
  async createLoad(loadData: any): Promise<any> {
    return apiFetch('/api/logistics/loads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loadData),
    });
  },

  /**
   * Update load status
   */
  async updateLoadStatus(loadId: string, status: string): Promise<void> {
    return apiFetch(`/api/logistics/loads/${loadId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
  },
};

/**
 * Maintenance API
 */
export const maintenanceAPI = {
  /**
   * Get maintenance records
   */
  async getMaintenanceRecords(vehicleReg?: string): Promise<any[]> {
    const url = vehicleReg 
      ? `/api/logistics/maintenance?vehicle_reg=${vehicleReg}`
      : '/api/logistics/maintenance';
    return apiFetch(url);
  },

  /**
   * Create maintenance record
   */
  async createMaintenanceRecord(data: any): Promise<any> {
    return apiFetch('/api/logistics/maintenance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },
};

/**
 * Document Processing API
 */
export const documentsAPI = {
  /**
   * Extract data from document using AWS Textract
   */
  async extractDocument(file: File, onProgress?: (progress: number) => void): Promise<DocumentExtraction> {
    return uploadFile('/api/logistics/documents/extract', file, onProgress);
  },
};

/**
 * Dashboard API
 */
export const dashboardAPI = {
  /**
   * Get logistics dashboard statistics
   */
  async getDashboardStats(): Promise<any> {
    return apiFetch('/api/logistics/dashboard');
  },
};

/**
 * Vehicles API
 */
export const vehiclesAPI = {
  /**
   * Get all vehicles with optional filters
   */
  async getVehicles(filters?: {
    status?: string;
    vehicle_type?: string;
    search?: string;
  }): Promise<{ vehicles: Vehicle[]; total: number }> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
    }

    const url = `/api/logistics/vehicles${params.toString() ? `?${params.toString()}` : ''}`;
    return apiFetch(url);
  },

  /**
   * Get single vehicle by ID
   */
  async getVehicleById(vehicleId: number): Promise<Vehicle> {
    return apiFetch(`/api/logistics/vehicles/${vehicleId}`);
  },

  /**
   * Create new vehicle
   */
  async createVehicle(vehicleData: Partial<Vehicle>): Promise<Vehicle> {
    return apiFetch('/api/logistics/vehicles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(vehicleData),
    });
  },

  /**
   * Update vehicle
   */
  async updateVehicle(vehicleId: number, vehicleData: Partial<Vehicle>): Promise<Vehicle> {
    return apiFetch(`/api/logistics/vehicles/${vehicleId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(vehicleData),
    });
  },

  /**
   * Delete vehicle
   */
  async deleteVehicle(vehicleId: number): Promise<void> {
    return apiFetch(`/api/logistics/vehicles/${vehicleId}`, {
      method: 'DELETE',
    });
  },
};

/**
 * Drivers API
 */
export const driversAPI = {
  /**
   * Get all drivers with optional filters
   */
  async getDrivers(filters?: {
    status?: string;
    license_class?: string;
    search?: string;
  }): Promise<{ drivers: any[]; total: number }> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
    }

    const url = `/api/logistics/drivers${params.toString() ? `?${params.toString()}` : ''}`;
    return apiFetch(url);
  },

  /**
   * Get single driver by ID
   */
  async getDriverById(driverId: number): Promise<any> {
    return apiFetch(`/api/logistics/drivers/${driverId}`);
  },

  /**
   * Create new driver
   */
  async createDriver(driverData: any): Promise<any> {
    return apiFetch('/api/logistics/drivers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(driverData),
    });
  },

  /**
   * Update driver
   */
  async updateDriver(driverId: number, driverData: any): Promise<any> {
    return apiFetch(`/api/logistics/drivers/${driverId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(driverData),
    });
  },

  /**
   * Delete driver
   */
  async deleteDriver(driverId: number): Promise<void> {
    return apiFetch(`/api/logistics/drivers/${driverId}`, {
      method: 'DELETE',
    });
  },
};

/**
 * Workspace API
 */
export const workspaceAPI = {
  /**
   * Get logistics workspace data
   */
  async getWorkspace(): Promise<any> {
    return apiFetch('/api/logistics/workspace');
  },
};

export default {
  trips: tripsAPI,
  fuel: fuelAPI,
  loads: loadsAPI,
  maintenance: maintenanceAPI,
  documents: documentsAPI,
  dashboard: dashboardAPI,
  vehicles: vehiclesAPI,
  drivers: driversAPI,
  workspace: workspaceAPI,
};
