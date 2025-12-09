/**
 * Offline Service
 * Handles offline data storage and synchronization with SQLite
 */

import * as SQLite from 'expo-sqlite';
import * as Network from 'expo-network';
import { OfflineAction } from '../types';

class OfflineService {
  private db: SQLite.WebSQLDatabase | null = null;
  private readonly DB_NAME = 'worldclass_driver.db';

  /**
   * Initialize database
   */
  async init(): Promise<void> {
    try {
      this.db = SQLite.openDatabase(this.DB_NAME);

      await this.createTables();
      console.log('Offline database initialized');
    } catch (error) {
      console.error('Error initializing offline database:', error);
    }
  }

  /**
   * Create database tables
   */
  private createTables(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.transaction((tx) => {
        // Offline queue table
        tx.executeSql(
          `CREATE TABLE IF NOT EXISTS offline_queue (
            id TEXT PRIMARY KEY,
            type TEXT NOT NULL,
            payload TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            retry_count INTEGER DEFAULT 0,
            status TEXT DEFAULT 'pending'
          )`
        );

        // Trips cache table
        tx.executeSql(
          `CREATE TABLE IF NOT EXISTS trips_cache (
            trip_id TEXT PRIMARY KEY,
            data TEXT NOT NULL,
            updated_at TEXT NOT NULL
          )`
        );

        // Location history table
        tx.executeSql(
          `CREATE TABLE IF NOT EXISTS location_history (
            id TEXT PRIMARY KEY,
            trip_id TEXT,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            accuracy REAL,
            speed REAL,
            heading REAL,
            timestamp TEXT NOT NULL,
            synced INTEGER DEFAULT 0
          )`
        );

        // POD cache table
        tx.executeSql(
          `CREATE TABLE IF NOT EXISTS pod_cache (
            id TEXT PRIMARY KEY,
            trip_id TEXT NOT NULL,
            data TEXT NOT NULL,
            created_at TEXT NOT NULL,
            synced INTEGER DEFAULT 0
          )`
        );
      }, reject, resolve);
    });
  }

  /**
   * Add action to offline queue
   */
  async addToQueue(action: Omit<OfflineAction, 'id'>): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      this.db.transaction((tx) => {
        tx.executeSql(
          `INSERT INTO offline_queue (id, type, payload, timestamp, retry_count, status)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            id,
            action.type,
            JSON.stringify(action.payload),
            action.timestamp,
            action.retryCount,
            action.status,
          ],
          () => resolve(id),
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  }

  /**
   * Get all pending actions from queue
   */
  async getQueuedActions(): Promise<OfflineAction[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.transaction((tx) => {
        tx.executeSql(
          `SELECT * FROM offline_queue WHERE status = 'pending' OR status = 'failed'
           ORDER BY timestamp ASC`,
          [],
          (_, { rows }) => {
            const actions: OfflineAction[] = [];
            for (let i = 0; i < rows.length; i++) {
              const row = rows.item(i);
              actions.push({
                id: row.id,
                type: row.type,
                payload: JSON.parse(row.payload),
                timestamp: row.timestamp,
                retryCount: row.retry_count,
                status: row.status,
              });
            }
            resolve(actions);
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  }

  /**
   * Update action status
   */
  async updateActionStatus(
    id: string,
    status: OfflineAction['status'],
    retryCount?: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.transaction((tx) => {
        const sql = retryCount !== undefined
          ? `UPDATE offline_queue SET status = ?, retry_count = ? WHERE id = ?`
          : `UPDATE offline_queue SET status = ? WHERE id = ?`;
        
        const params = retryCount !== undefined
          ? [status, retryCount, id]
          : [status, id];

        tx.executeSql(
          sql,
          params,
          () => resolve(),
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  }

  /**
   * Remove action from queue
   */
  async removeFromQueue(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.transaction((tx) => {
        tx.executeSql(
          `DELETE FROM offline_queue WHERE id = ?`,
          [id],
          () => resolve(),
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  }

  /**
   * Cache trip data
   */
  async cacheTrip(tripId: string, data: any): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.transaction((tx) => {
        tx.executeSql(
          `INSERT OR REPLACE INTO trips_cache (trip_id, data, updated_at)
           VALUES (?, ?, ?)`,
          [tripId, JSON.stringify(data), new Date().toISOString()],
          () => resolve(),
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  }

  /**
   * Get cached trip
   */
  async getCachedTrip(tripId: string): Promise<any | null> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.transaction((tx) => {
        tx.executeSql(
          `SELECT data FROM trips_cache WHERE trip_id = ?`,
          [tripId],
          (_, { rows }) => {
            if (rows.length > 0) {
              resolve(JSON.parse(rows.item(0).data));
            } else {
              resolve(null);
            }
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  }

  /**
   * Save location to history
   */
  async saveLocation(location: {
    tripId?: string;
    lat: number;
    lng: number;
    accuracy?: number;
    speed?: number;
    heading?: number;
    timestamp: string;
  }): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const id = `loc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      this.db.transaction((tx) => {
        tx.executeSql(
          `INSERT INTO location_history 
           (id, trip_id, latitude, longitude, accuracy, speed, heading, timestamp, synced)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
          [
            id,
            location.tripId || null,
            location.lat,
            location.lng,
            location.accuracy || null,
            location.speed || null,
            location.heading || null,
            location.timestamp,
          ],
          () => resolve(),
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  }

  /**
   * Check network status
   */
  async isOnline(): Promise<boolean> {
    try {
      const networkState = await Network.getNetworkStateAsync();
      return networkState.isConnected && networkState.isInternetReachable;
    } catch (error) {
      console.error('Error checking network status:', error);
      return false;
    }
  }

  /**
   * Clear all offline data
   */
  async clearAll(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.transaction((tx) => {
        tx.executeSql('DELETE FROM offline_queue');
        tx.executeSql('DELETE FROM trips_cache');
        tx.executeSql('DELETE FROM location_history');
        tx.executeSql('DELETE FROM pod_cache');
      }, reject, resolve);
    });
  }
}

export default new OfflineService();
