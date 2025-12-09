/**
 * Trip Service
 * Handles trip-related API calls and data management
 */

import apiClient from './api.service';
import { Trip, TripStatus, ProofOfDelivery, ApiResponse, PaginatedResponse } from '../types';
import * as FileSystem from 'expo-file-system';

class TripService {
  /**
   * Get all trips for the current driver
   */
  async getTrips(status?: TripStatus): Promise<ApiResponse<Trip[]>> {
    const params = status ? { status } : {};
    return await apiClient.get<Trip[]>('/logistics/trips', params);
  }

  /**
   * Get a specific trip by ID
   */
  async getTripById(tripId: string): Promise<ApiResponse<Trip>> {
    return await apiClient.get<Trip>(`/logistics/trips/${tripId}`);
  }

  /**
   * Accept a trip assignment
   */
  async acceptTrip(tripId: string): Promise<ApiResponse<Trip>> {
    return await apiClient.post<Trip>(`/logistics/trips/${tripId}/accept`);
  }

  /**
   * Start a trip
   */
  async startTrip(tripId: string, location: { lat: number; lng: number }): Promise<ApiResponse<Trip>> {
    return await apiClient.post<Trip>(`/logistics/trips/${tripId}/start`, {
      status: 'in_progress',
      startLocation: location,
      startTime: new Date().toISOString(),
    });
  }

  /**
   * Update trip status
   */
  async updateTripStatus(
    tripId: string,
    status: TripStatus,
    notes?: string
  ): Promise<ApiResponse<Trip>> {
    return await apiClient.patch<Trip>(`/logistics/trips/${tripId}/status`, {
      status,
      notes,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Complete a trip
   */
  async completeTrip(
    tripId: string,
    location: { lat: number; lng: number }
  ): Promise<ApiResponse<Trip>> {
    return await apiClient.post<Trip>(`/logistics/trips/${tripId}/complete`, {
      status: 'completed',
      endLocation: location,
      endTime: new Date().toISOString(),
    });
  }

  /**
   * Report trip delay
   */
  async reportDelay(
    tripId: string,
    reason: string,
    estimatedDelay: number
  ): Promise<ApiResponse<Trip>> {
    return await apiClient.post<Trip>(`/logistics/trips/${tripId}/delay`, {
      status: 'delayed',
      reason,
      estimatedDelay,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Submit proof of delivery
   */
  async submitProofOfDelivery(
    tripId: string,
    pod: ProofOfDelivery
  ): Promise<ApiResponse<any>> {
    try {
      const formData = new FormData();
      
      // Add photos
      for (let i = 0; i < pod.photos.length; i++) {
        const photoUri = pod.photos[i];
        const filename = `pod_photo_${i}_${Date.now()}.jpg`;
        
        // Read file and create blob
        const fileInfo = await FileSystem.getInfoAsync(photoUri);
        if (fileInfo.exists) {
          formData.append('photos', {
            uri: photoUri,
            type: 'image/jpeg',
            name: filename,
          } as any);
        }
      }

      // Add signature
      if (pod.signature) {
        const signatureFilename = `pod_signature_${Date.now()}.png`;
        formData.append('signature', {
          uri: pod.signature,
          type: 'image/png',
          name: signatureFilename,
        } as any);
      }

      // Add other POD data
      formData.append('tripId', tripId);
      formData.append('timestamp', pod.timestamp);
      formData.append('location', JSON.stringify(pod.location));
      
      if (pod.recipientName) {
        formData.append('recipientName', pod.recipientName);
      }
      
      if (pod.notes) {
        formData.append('notes', pod.notes);
      }

      if (pod.packages && pod.packages.length > 0) {
        formData.append('packages', JSON.stringify(pod.packages));
      }

      return await apiClient.upload(`/logistics/trips/${tripId}/pod`, formData);
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to submit proof of delivery',
      };
    }
  }

  /**
   * Scan package barcode
   */
  async scanPackage(
    tripId: string,
    barcode: string
  ): Promise<ApiResponse<any>> {
    return await apiClient.post(`/logistics/trips/${tripId}/scan-package`, {
      barcode,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Add notes to a trip
   */
  async addTripNotes(
    tripId: string,
    notes: string,
    type: 'driver' | 'incident' | 'general' = 'general'
  ): Promise<ApiResponse<any>> {
    return await apiClient.post(`/logistics/trips/${tripId}/notes`, {
      notes,
      type,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get trip history
   */
  async getTripHistory(
    page: number = 1,
    perPage: number = 20
  ): Promise<ApiResponse<PaginatedResponse<Trip>>> {
    return await apiClient.get<PaginatedResponse<Trip>>('/logistics/trips/history', {
      page,
      perPage,
    });
  }

  /**
   * Report incident during trip
   */
  async reportIncident(
    tripId: string,
    incident: {
      type: string;
      description: string;
      location: { lat: number; lng: number };
      photos?: string[];
    }
  ): Promise<ApiResponse<any>> {
    const formData = new FormData();
    
    formData.append('type', incident.type);
    formData.append('description', incident.description);
    formData.append('location', JSON.stringify(incident.location));
    formData.append('timestamp', new Date().toISOString());

    // Add incident photos if provided
    if (incident.photos) {
      for (let i = 0; i < incident.photos.length; i++) {
        const photoUri = incident.photos[i];
        const filename = `incident_photo_${i}_${Date.now()}.jpg`;
        
        formData.append('photos', {
          uri: photoUri,
          type: 'image/jpeg',
          name: filename,
        } as any);
      }
    }

    return await apiClient.upload(`/logistics/trips/${tripId}/incident`, formData);
  }
}

export default new TripService();
