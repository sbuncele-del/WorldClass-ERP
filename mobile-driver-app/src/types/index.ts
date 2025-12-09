/**
 * TypeScript Type Definitions
 * Core types for the driver mobile app
 */

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  driverId: string;
  tenantId: string;
  roles: string[];
}

export interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  biometricEnabled: boolean;
}

export interface Trip {
  trip_id: string;
  customer: string;
  origin: string;
  destination: string;
  driver: string;
  vehicle_reg: string;
  status: TripStatus;
  pod_status: PODStatus;
  eta: string;
  distance: number;
  created_at: string;
  updated_at: string;
  stops?: TripStop[];
  packages?: Package[];
}

export type TripStatus = 
  | 'pending'
  | 'assigned'
  | 'accepted'
  | 'in_progress'
  | 'completed'
  | 'delayed'
  | 'cancelled';

export type PODStatus =
  | 'pending'
  | 'captured'
  | 'verified'
  | 'rejected';

export interface TripStop {
  id: string;
  tripId: string;
  sequence: number;
  address: string;
  lat: number;
  lng: number;
  type: 'pickup' | 'delivery';
  status: 'pending' | 'completed' | 'failed';
  scheduledTime?: string;
  actualTime?: string;
  notes?: string;
}

export interface Package {
  id: string;
  trackingNumber: string;
  description: string;
  weight: number;
  dimensions: string;
  barcode?: string;
  status: string;
}

export interface ProofOfDelivery {
  id?: string;
  tripId: string;
  photos: string[];
  signature: string;
  timestamp: string;
  location: Location;
  recipientName?: string;
  notes?: string;
  packages: string[];
}

export interface Location {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: string;
  speed?: number;
  heading?: number;
}

export interface LocationUpdate {
  driverId: string;
  vehicleId: string;
  tripId?: string;
  location: Location;
  status: string;
}

export interface OfflineAction {
  id: string;
  type: string;
  payload: any;
  timestamp: string;
  retryCount: number;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
}

export interface AppState {
  auth: AuthState;
  trips: TripsState;
  location: LocationState;
  offline: OfflineState;
  notifications: NotificationState;
  settings: SettingsState;
}

export interface TripsState {
  trips: Trip[];
  currentTrip: Trip | null;
  isLoading: boolean;
  error: string | null;
  lastSync: string | null;
}

export interface LocationState {
  currentLocation: Location | null;
  isTracking: boolean;
  history: Location[];
  error: string | null;
}

export interface OfflineState {
  isOnline: boolean;
  queue: OfflineAction[];
  isSyncing: boolean;
  lastSync: string | null;
}

export interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
}

export interface Notification {
  id: string;
  type: 'trip_assigned' | 'trip_updated' | 'alert' | 'message';
  title: string;
  body: string;
  data?: any;
  read: boolean;
  timestamp: string;
}

export interface SettingsState {
  darkMode: boolean;
  notifications: boolean;
  locationTracking: boolean;
  biometric: boolean;
  language: string;
}

export interface WebSocketMessage {
  event: string;
  data: any;
  timestamp: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}
