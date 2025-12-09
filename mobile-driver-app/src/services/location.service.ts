/**
 * Location Service
 * Handles GPS tracking, background location updates, and location permissions
 */

import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Location as LocationType } from '../types';
import config from '../config/app.config';
import apiClient from './api.service';

const LOCATION_TASK_NAME = config.LOCATION_TASK_NAME;

class LocationService {
  private isTracking = false;
  private locationUpdateCallback?: (location: LocationType) => void;

  /**
   * Request location permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      
      if (foregroundStatus !== 'granted') {
        return false;
      }

      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      
      return backgroundStatus === 'granted';
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      return false;
    }
  }

  /**
   * Check if location permissions are granted
   */
  async hasPermissions(): Promise<boolean> {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error checking location permissions:', error);
      return false;
    }
  }

  /**
   * Get current location
   */
  async getCurrentLocation(): Promise<LocationType | null> {
    try {
      const hasPermission = await this.hasPermissions();
      if (!hasPermission) {
        throw new Error('Location permission not granted');
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      return {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
        accuracy: location.coords.accuracy || 0,
        timestamp: new Date(location.timestamp).toISOString(),
        speed: location.coords.speed || undefined,
        heading: location.coords.heading || undefined,
      };
    } catch (error) {
      console.error('Error getting current location:', error);
      return null;
    }
  }

  /**
   * Start tracking location in foreground
   */
  async startForegroundTracking(
    callback: (location: LocationType) => void
  ): Promise<boolean> {
    try {
      const hasPermission = await this.hasPermissions();
      if (!hasPermission) {
        const granted = await this.requestPermissions();
        if (!granted) {
          return false;
        }
      }

      this.locationUpdateCallback = callback;
      this.isTracking = true;

      // Start watching position
      await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: config.LOCATION_UPDATE_INTERVAL,
          distanceInterval: 50, // Update every 50 meters
        },
        (location) => {
          if (this.isTracking) {
            const locationData: LocationType = {
              lat: location.coords.latitude,
              lng: location.coords.longitude,
              accuracy: location.coords.accuracy || 0,
              timestamp: new Date(location.timestamp).toISOString(),
              speed: location.coords.speed || undefined,
              heading: location.coords.heading || undefined,
            };
            
            if (this.locationUpdateCallback) {
              this.locationUpdateCallback(locationData);
            }
          }
        }
      );

      return true;
    } catch (error) {
      console.error('Error starting foreground tracking:', error);
      return false;
    }
  }

  /**
   * Start background location tracking
   */
  async startBackgroundTracking(driverId: string, vehicleId: string, tripId?: string): Promise<boolean> {
    try {
      const hasPermission = await this.hasPermissions();
      if (!hasPermission) {
        const granted = await this.requestPermissions();
        if (!granted) {
          return false;
        }
      }

      // Define the background task
      TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }: any) => {
        if (error) {
          console.error('Background location task error:', error);
          return;
        }

        if (data) {
          const { locations } = data;
          const location = locations[0];

          if (location) {
            const locationData: LocationType = {
              lat: location.coords.latitude,
              lng: location.coords.longitude,
              accuracy: location.coords.accuracy || 0,
              timestamp: new Date(location.timestamp).toISOString(),
              speed: location.coords.speed || undefined,
              heading: location.coords.heading || undefined,
            };

            // Send location to backend
            await this.sendLocationUpdate(driverId, vehicleId, locationData, tripId);
          }
        }
      });

      // Start background location updates
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.High,
        timeInterval: config.LOCATION_UPDATE_INTERVAL,
        distanceInterval: 50,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: 'WorldClass Driver',
          notificationBody: 'Tracking your location for trip updates',
          notificationColor: '#4A90E2',
        },
      });

      this.isTracking = true;
      return true;
    } catch (error) {
      console.error('Error starting background tracking:', error);
      return false;
    }
  }

  /**
   * Stop background location tracking
   */
  async stopBackgroundTracking(): Promise<void> {
    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
      if (isRegistered) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      }
      this.isTracking = false;
    } catch (error) {
      console.error('Error stopping background tracking:', error);
    }
  }

  /**
   * Check if currently tracking
   */
  getTrackingStatus(): boolean {
    return this.isTracking;
  }

  /**
   * Send location update to backend
   */
  async sendLocationUpdate(
    driverId: string,
    vehicleId: string,
    location: LocationType,
    tripId?: string
  ): Promise<void> {
    try {
      await apiClient.post('/logistics/gps/location', {
        driverId,
        vehicleId,
        tripId,
        location,
        timestamp: location.timestamp,
      });
    } catch (error) {
      console.error('Error sending location update:', error);
      // Store in offline queue if failed
    }
  }

  /**
   * Calculate distance between two points (Haversine formula)
   */
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Calculate ETA based on distance and average speed
   */
  calculateETA(distanceKm: number, averageSpeedKmh: number = 60): Date {
    const hours = distanceKm / averageSpeedKmh;
    const milliseconds = hours * 60 * 60 * 1000;
    return new Date(Date.now() + milliseconds);
  }
}

export default new LocationService();
