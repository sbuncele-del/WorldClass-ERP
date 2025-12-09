/**
 * WebSocket Service
 * Real-time communication with backend for trip assignments and updates
 */

import { io, Socket } from 'socket.io-client';
import config from '../config/app.config';
import authService from './auth.service';
import { Trip, WebSocketMessage } from '../types';

type EventCallback = (data: any) => void;

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = config.WS_MAX_RECONNECT_ATTEMPTS;
  private reconnectDelay = config.WS_RECONNECT_DELAY;
  private eventCallbacks: Map<string, EventCallback[]> = new Map();
  private isConnecting = false;

  /**
   * Connect to WebSocket server
   */
  async connect(): Promise<boolean> {
    if (this.socket?.connected || this.isConnecting) {
      console.log('WebSocket already connected or connecting');
      return true;
    }

    this.isConnecting = true;

    try {
      const token = await authService.getAccessToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      this.socket = io(config.WS_URL, {
        path: config.WS_PATH,
        auth: {
          token,
        },
        transports: ['websocket'],
        reconnection: true,
        reconnectionDelay: this.reconnectDelay,
        reconnectionAttempts: this.maxReconnectAttempts,
      });

      this.setupEventHandlers();

      return new Promise((resolve) => {
        this.socket?.on('connect', () => {
          console.log('WebSocket connected');
          this.reconnectAttempts = 0;
          this.isConnecting = false;
          resolve(true);
        });

        this.socket?.on('connect_error', (error) => {
          console.error('WebSocket connection error:', error);
          this.isConnecting = false;
          resolve(false);
        });
      });
    } catch (error) {
      console.error('WebSocket connection failed:', error);
      this.isConnecting = false;
      return false;
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.eventCallbacks.clear();
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('WebSocket connected successfully');
      this.reconnectAttempts = 0;
      this.triggerCallbacks('connected', { connected: true });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      this.triggerCallbacks('disconnected', { reason });
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('WebSocket reconnected after', attemptNumber, 'attempts');
      this.reconnectAttempts = 0;
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('WebSocket reconnection attempt:', attemptNumber);
      this.reconnectAttempts = attemptNumber;
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('WebSocket reconnection error:', error);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('WebSocket reconnection failed after max attempts');
      this.triggerCallbacks('reconnect_failed', {});
    });

    // Trip-related events
    this.socket.on('new.load.assigned', (data: Trip) => {
      console.log('New trip assigned:', data);
      this.triggerCallbacks('trip:assigned', data);
    });

    this.socket.on('trip.status.change', (data: any) => {
      console.log('Trip status changed:', data);
      this.triggerCallbacks('trip:updated', data);
    });

    this.socket.on('trip:update', (data: any) => {
      console.log('Trip update received:', data);
      this.triggerCallbacks('trip:updated', data);
    });

    // Vehicle location updates
    this.socket.on('vehicle.location.update', (data: any) => {
      this.triggerCallbacks('vehicle:location', data);
    });

    // Driver status updates
    this.socket.on('driver.status.update', (data: any) => {
      this.triggerCallbacks('driver:status', data);
    });

    // Alert notifications
    this.socket.on('alert:created', (data: any) => {
      console.log('Alert received:', data);
      this.triggerCallbacks('alert', data);
    });

    // System notifications
    this.socket.on('system:notification', (data: any) => {
      console.log('System notification:', data);
      this.triggerCallbacks('notification', data);
    });

    // Pong response
    this.socket.on('pong', (data: any) => {
      this.triggerCallbacks('pong', data);
    });
  }

  /**
   * Join a specific room (trip, vehicle, or driver)
   */
  joinRoom(roomType: 'trip' | 'vehicle' | 'driver', id: string): void {
    if (!this.socket?.connected) {
      console.warn('Cannot join room: WebSocket not connected');
      return;
    }

    this.socket.emit(`join:${roomType}`, id);
    console.log(`Joined ${roomType} room:`, id);
  }

  /**
   * Leave a specific room
   */
  leaveRoom(roomType: 'trip' | 'vehicle' | 'driver', id: string): void {
    if (!this.socket?.connected) {
      console.warn('Cannot leave room: WebSocket not connected');
      return;
    }

    this.socket.emit(`leave:${roomType}`, id);
    console.log(`Left ${roomType} room:`, id);
  }

  /**
   * Send ping to check connection health
   */
  ping(): void {
    if (!this.socket?.connected) {
      console.warn('Cannot ping: WebSocket not connected');
      return;
    }

    this.socket.emit('ping');
  }

  /**
   * Subscribe to an event
   */
  on(event: string, callback: EventCallback): void {
    if (!this.eventCallbacks.has(event)) {
      this.eventCallbacks.set(event, []);
    }
    this.eventCallbacks.get(event)?.push(callback);
  }

  /**
   * Unsubscribe from an event
   */
  off(event: string, callback?: EventCallback): void {
    if (!callback) {
      this.eventCallbacks.delete(event);
      return;
    }

    const callbacks = this.eventCallbacks.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Trigger callbacks for an event
   */
  private triggerCallbacks(event: string, data: any): void {
    const callbacks = this.eventCallbacks.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in callback for event ${event}:`, error);
        }
      });
    }
  }

  /**
   * Emit a custom event
   */
  emit(event: string, data: any): void {
    if (!this.socket?.connected) {
      console.warn('Cannot emit event: WebSocket not connected');
      return;
    }

    this.socket.emit(event, data);
  }

  /**
   * Get reconnection status
   */
  getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }
}

export default new WebSocketService();
