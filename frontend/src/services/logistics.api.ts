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
  transaction_id: string;
  transaction_number?: string;
  vehicle_id?: string;
  driver_id?: string;
  trip_id?: string;
  transaction_date: string;
  fuel_station?: string;
  location?: string;
  fuel_type?: string;
  litres: number;
  price_per_litre: number;
  total_amount: number;
  odometer_reading?: number;
  payment_method?: string;
  fuel_card_number?: string;
  created_by?: string;
  vehicle_registration?: string;
  driver_name?: string;
  reconciled?: boolean;
}

export interface FuelTransactionResponse {
  fuel_transactions: FuelTransaction[];
  total: number;
  page: number;
  totalPages: number;
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
    vehicle_id?: string;
    driver_id?: string;
    date_from?: string;
    date_to?: string;
    reconciled?: boolean | string;
    limit?: string;
    page?: string;
  }): Promise<FuelTransactionResponse> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) params.append(key, String(value));
      });
    }

    const url = `/api/logistics/fuel${params.toString() ? `?${params.toString()}` : ''}`;
    return apiFetch(url);
  },

  /**
   * Create fuel transaction
   */
  async createFuelTransaction(data: Partial<FuelTransaction>): Promise<{ fuel_transaction: FuelTransaction }> {
    return apiFetch('/api/logistics/fuel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  /**
   * Reconcile fuel transaction
   */
  async reconcileFuelTransaction(id: number | string): Promise<void> {
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

/**
 * Routes API
 */
export interface Route {
  route_id: number;
  route_name: string;
  route_code?: string;
  description?: string;
  origin_address: string;
  origin_lat?: number;
  origin_lng?: number;
  destination_address: string;
  destination_lat?: number;
  destination_lng?: number;
  distance_km?: number;
  estimated_duration_minutes?: number;
  toll_cost?: number;
  fuel_estimate_liters?: number;
  route_type: string;
  is_active: boolean;
  waypoints?: any[];
  restrictions?: any;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export const routesAPI = {
  async getRoutes(filters?: {
    is_active?: boolean;
    route_type?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ routes: Route[]; total: number; page: number; totalPages: number }> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) params.append(key, String(value));
      });
    }
    return apiFetch(`/api/logistics/routes${params.toString() ? `?${params}` : ''}`);
  },

  async getRouteById(routeId: number): Promise<Route> {
    return apiFetch(`/api/logistics/routes/${routeId}`);
  },

  async createRoute(data: Partial<Route>): Promise<Route> {
    return apiFetch('/api/logistics/routes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async updateRoute(routeId: number, data: Partial<Route>): Promise<Route> {
    return apiFetch(`/api/logistics/routes/${routeId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async deleteRoute(routeId: number): Promise<void> {
    return apiFetch(`/api/logistics/routes/${routeId}`, { method: 'DELETE' });
  },
};

/**
 * Incidents API
 */
export interface Incident {
  incident_id: number;
  incident_number?: string;
  incident_type: string;
  severity: string;
  status: string;
  trip_id?: number;
  vehicle_id?: number;
  driver_id?: number;
  location_address?: string;
  location_lat?: number;
  location_lng?: number;
  incident_date: string;
  description: string;
  cause?: string;
  injuries_count?: number;
  fatalities_count?: number;
  property_damage?: boolean;
  damage_estimate?: number;
  insurance_claim_number?: string;
  insurance_status?: string;
  police_report_filed?: boolean;
  police_report_number?: string;
  resolution_notes?: string;
  corrective_actions?: string;
  photos?: string[];
  documents?: string[];
  created_at?: string;
  updated_at?: string;
}

export const incidentsAPI = {
  async getIncidents(filters?: {
    status?: string;
    severity?: string;
    incident_type?: string;
    vehicle_id?: number;
    driver_id?: number;
    start_date?: string;
    end_date?: string;
    page?: number;
    limit?: number;
  }): Promise<{ incidents: Incident[]; total: number; page: number; totalPages: number }> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) params.append(key, String(value));
      });
    }
    return apiFetch(`/api/logistics/incidents${params.toString() ? `?${params}` : ''}`);
  },

  async getIncidentById(incidentId: number): Promise<Incident> {
    return apiFetch(`/api/logistics/incidents/${incidentId}`);
  },

  async createIncident(data: Partial<Incident>): Promise<Incident> {
    return apiFetch('/api/logistics/incidents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async updateIncident(incidentId: number, data: Partial<Incident>): Promise<Incident> {
    return apiFetch(`/api/logistics/incidents/${incidentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async deleteIncident(incidentId: number): Promise<void> {
    return apiFetch(`/api/logistics/incidents/${incidentId}`, { method: 'DELETE' });
  },
};

/**
 * Geofences API
 */
export interface Geofence {
  geofence_id: number;
  geofence_name: string;
  geofence_code?: string;
  geofence_type: string;
  geometry_type: string;
  center_lat?: number;
  center_lng?: number;
  radius_meters?: number;
  polygon_coordinates?: any[];
  is_active: boolean;
  alert_on_enter: boolean;
  alert_on_exit: boolean;
  alert_on_dwell: boolean;
  dwell_time_minutes?: number;
  speed_limit_kmh?: number;
  schedule?: any;
  alert_emails?: string[];
  alert_phone_numbers?: string[];
  customer_id?: number;
  address?: string;
  color?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface GeofenceEvent {
  event_id: number;
  geofence_id: number;
  vehicle_id?: number;
  driver_id?: number;
  event_type: string;
  event_time: string;
  lat?: number;
  lng?: number;
  speed_kmh?: number;
  alert_sent: boolean;
}

export const geofencesAPI = {
  async getGeofences(filters?: {
    is_active?: boolean;
    geofence_type?: string;
    customer_id?: number;
    page?: number;
    limit?: number;
  }): Promise<{ geofences: Geofence[]; total: number; page: number; totalPages: number }> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) params.append(key, String(value));
      });
    }
    return apiFetch(`/api/logistics/geofences${params.toString() ? `?${params}` : ''}`);
  },

  async getGeofenceById(geofenceId: number): Promise<Geofence> {
    return apiFetch(`/api/logistics/geofences/${geofenceId}`);
  },

  async createGeofence(data: Partial<Geofence>): Promise<Geofence> {
    return apiFetch('/api/logistics/geofences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async updateGeofence(geofenceId: number, data: Partial<Geofence>): Promise<Geofence> {
    return apiFetch(`/api/logistics/geofences/${geofenceId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async deleteGeofence(geofenceId: number): Promise<void> {
    return apiFetch(`/api/logistics/geofences/${geofenceId}`, { method: 'DELETE' });
  },

  async getGeofenceEvents(filters?: {
    geofence_id?: number;
    vehicle_id?: number;
    event_type?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
    limit?: number;
  }): Promise<{ events: GeofenceEvent[]; page: number }> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) params.append(key, String(value));
      });
    }
    return apiFetch(`/api/logistics/geofence-events${params.toString() ? `?${params}` : ''}`);
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
  routes: routesAPI,
  incidents: incidentsAPI,
  geofences: geofencesAPI,
};
