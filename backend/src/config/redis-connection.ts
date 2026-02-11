import Redis from 'ioredis';
import { redisConfig } from './redis.config';

// Allow test environments to swap in an in-memory Redis mock
const useMock = process.env.USE_REDIS_MOCK === 'true';
// Check if Redis is disabled
const isRedisDisabled = process.env.REDIS_ENABLED === 'false' || process.env.SKIP_REDIS === 'true';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const RedisCtor: typeof Redis = useMock ? require('ioredis-mock') : Redis;

export type RedisClient = InstanceType<typeof Redis>;

/**
 * Redis Connection Pooling & Management
 * 
 * We maintain two primary persistent connections:
 * 1. defaultClient: For general commands (SET, GET), caching, rate limiting, and publishing events.
 * 2. subscriberClient: Dedicated connection for subscribing to channels (Redis blocks this connection).
 * 
 * Bull queues will create their own connections using the 'createClient' factory.
 */

// Singleton instance for general operations
let defaultClient: RedisClient | null = null;

// Singleton instance for subscriptions
let subscriberClient: RedisClient | null = null;

// In-memory mock for disabled mode
class MockRedisClient {
  private store: Map<string, string> = new Map();
  
  async get(key: string): Promise<string | null> {
    return this.store.get(key) || null;
  }
  async set(key: string, value: string): Promise<'OK'> {
    this.store.set(key, value);
    return 'OK';
  }
  async del(...keys: string[]): Promise<number> {
    let deleted = 0;
    for (const key of keys) {
      if (this.store.delete(key)) deleted++;
    }
    return deleted;
  }
  async ping(): Promise<string> { return 'PONG'; }
  async quit(): Promise<'OK'> { return 'OK'; }
  async flushdb(): Promise<'OK'> { this.store.clear(); return 'OK'; }
  async keys(pattern: string): Promise<string[]> { return Array.from(this.store.keys()); }
  async exists(...keys: string[]): Promise<number> {
    return keys.filter(k => this.store.has(k)).length;
  }
  async setex(key: string, seconds: number, value: string): Promise<'OK'> {
    this.store.set(key, value);
    setTimeout(() => this.store.delete(key), seconds * 1000);
    return 'OK';
  }
  on(_event: string, _handler: Function): this { return this; }
  duplicate(): MockRedisClient { return new MockRedisClient(); }
}

export const getRedisClient = (): RedisClient => {
  if (isRedisDisabled) {
    if (!defaultClient) {
      console.log('🔌 Redis disabled - using in-memory mock');
      defaultClient = new MockRedisClient() as unknown as RedisClient;
    }
    return defaultClient;
  }
  
  if (!defaultClient) {
    console.log('🔌 Initializing Redis Default Client...');
    defaultClient = new RedisCtor(redisConfig as any);
    
    defaultClient.on('error', (err) => {
      console.error('❌ Redis Default Client Error:', err);
    });

    defaultClient.on('connect', () => {
      console.log('✅ Redis Default Client Connected');
    });
  }
  return defaultClient;
};

export const getRedisSubscriber = (): RedisClient => {
  if (isRedisDisabled) {
    if (!subscriberClient) {
      subscriberClient = new MockRedisClient() as unknown as RedisClient;
    }
    return subscriberClient;
  }
  
  if (!subscriberClient) {
    console.log('🔌 Initializing Redis Subscriber Client...');
    subscriberClient = new RedisCtor({
      ...redisConfig,
      enableReadyCheck: false,
      maxRetriesPerRequest: null,
    } as any);
    
    subscriberClient.on('error', (err) => {
      console.error('❌ Redis Subscriber Client Error:', err);
    });

    subscriberClient.on('connect', () => {
      console.log('✅ Redis Subscriber Client Connected');
    });
  }
  return subscriberClient;
};

/**
 * Factory function for libraries that need new connections (e.g., Bull)
 */
export const createRedisClient = (type: 'client' | 'subscriber' | 'bclient'): RedisClient => {
  if (isRedisDisabled) {
    return new MockRedisClient() as unknown as RedisClient;
  }
  
  const options = { ...redisConfig } as any;

  // Bull does not allow enableReadyCheck/maxRetriesPerRequest for subscriber/bclient
  if (type === 'subscriber' || type === 'bclient') {
    options.enableReadyCheck = false;
    options.maxRetriesPerRequest = null;
  }

  switch (type) {
    case 'client':
      return getRedisClient(); // Reuse default for 'client' type if possible, or create new if library demands
    case 'subscriber':
      return getRedisSubscriber(); // Reuse subscriber? Bull usually wants its own.
    case 'bclient':
      return new RedisCtor(options);
    default:
      return new RedisCtor(options);
  }
};

// Graceful shutdown
export const closeRedisConnections = async () => {
  if (defaultClient) {
    await defaultClient.quit();
    defaultClient = null;
  }
  if (subscriberClient) {
    await subscriberClient.quit();
    subscriberClient = null;
  }
};
