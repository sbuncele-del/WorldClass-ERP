import Redis from 'ioredis';
import { createRedisClient, RedisClient } from '../config/redis-connection';

/**
 * RedisService
 * Shared Redis utilities for caching, health, and pub/sub helpers.
 */
export class RedisService {
  private client: RedisClient;

  constructor(client?: RedisClient) {
    this.client = client ?? createRedisClient('client');
  }

  getClient(): RedisClient {
    return this.client;
  }

  async ping(): Promise<boolean> {
    const result = await this.client.ping();
    return result === 'PONG';
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    const value = await this.client.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  async set<T = unknown>(key: string, value: T, ttlSeconds?: number): Promise<'OK' | null> {
    const payload = JSON.stringify(value);
    if (ttlSeconds && ttlSeconds > 0) {
      return this.client.set(key, payload, 'EX', ttlSeconds);
    }
    return this.client.set(key, payload);
  }

  async del(key: string | string[]): Promise<number> {
    return this.client.del(Array.isArray(key) ? key : [key]);
  }

  async ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }

  async flushPrefix(prefix: string): Promise<number> {
    const keys = await this.client.keys(`${prefix}*`);
    if (!keys.length) return 0;
    const pipeline = this.client.pipeline();
    keys.forEach((k) => pipeline.del(k));
    const results = await pipeline.exec();
    return results.length;
  }
}

export async function redisHealthCheck(): Promise<{ status: 'up' | 'down'; latencyMs: number }> {
  const client: RedisClient = createRedisClient('client');
  const start = Date.now();
  try {
    await client.ping();
    const latencyMs = Date.now() - start;
    await client.quit();
    return { status: 'up', latencyMs };
  } catch (error) {
    console.error('Redis health check failed:', error);
    await client.quit();
    return { status: 'down', latencyMs: -1 };
  }
}

export const redisService = new RedisService();

/**
 * Helper to build new pub/sub clients (Socket.IO adapter)
 */
export const buildPubSubClients = (): { pubClient: RedisClient; subClient: RedisClient } => {
  const pubClient = createRedisClient('client');
  const subClient = createRedisClient('subscriber');
  return { pubClient, subClient };
};
