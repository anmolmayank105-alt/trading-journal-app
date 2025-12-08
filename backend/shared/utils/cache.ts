/**
 * Cache Utilities
 * Based on Part 5 LLD - Redis Cache Layer
 */

import Redis from 'ioredis';
import { md5 } from './crypto';
import { logger } from './logger';

// ============= Cache Configuration =============

export interface CacheConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
  defaultTTL?: number;
  maxRetries?: number;
  enabled?: boolean;
}

const DEFAULT_CONFIG: Partial<CacheConfig> = {
  host: 'localhost',
  port: 6379,
  db: 0,
  keyPrefix: 'stk:',
  defaultTTL: 300, // 5 minutes
  maxRetries: 3,
  enabled: process.env.REDIS_ENABLED !== 'false',
};

// ============= Redis Client Factory =============

let redisClient: Redis | null = null;
let redisEnabled = process.env.REDIS_ENABLED !== 'false';

export function createRedisClient(config: Partial<CacheConfig> = {}): Redis | null {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  if (!finalConfig.enabled) {
    logger.info('Redis disabled, using no-op cache');
    return null;
  }
  
  const client = new Redis({
    host: finalConfig.host,
    port: finalConfig.port,
    password: finalConfig.password,
    db: finalConfig.db,
    keyPrefix: finalConfig.keyPrefix,
    lazyConnect: true, // Don't connect immediately
    maxRetriesPerRequest: 1,
    retryStrategy: (times) => {
      if (times > (finalConfig.maxRetries || 3)) {
        redisEnabled = false; // Disable after max retries
        logger.warn('Redis connection failed, cache disabled');
        return null; // Stop retrying
      }
      return Math.min(times * 100, 3000);
    },
    reconnectOnError: (err) => {
      const targetError = 'READONLY';
      return err.message.includes(targetError);
    },
  });
  
  client.on('connect', () => {
    logger.info('Redis connected');
    redisEnabled = true;
  });
  
  client.on('error', (err) => {
    if (redisEnabled) {
      logger.error({ err }, 'Redis error');
    }
  });
  
  client.on('reconnecting', () => {
    logger.info('Redis reconnecting');
  });
  
  client.on('close', () => {
    redisEnabled = false;
  });
  
  return client;
}

export function getRedisClient(): Redis | null {
  if (!redisEnabled) return null;
  
  if (!redisClient) {
    redisClient = createRedisClient({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
    });
  }
  return redisClient;
}

// ============= Cache Service =============

export class CacheService {
  private client: Redis | null;
  private defaultTTL: number;
  private memoryCache: Map<string, { value: unknown; expiry: number }> = new Map();
  
  constructor(client?: Redis | null, defaultTTL: number = 300) {
    // Don't auto-connect to Redis - only use if explicitly passed
    this.client = client !== undefined ? client : null;
    this.defaultTTL = defaultTTL;
  }
  
  // Initialize Redis connection (call this explicitly if needed)
  initRedis(): void {
    if (this.client === null && redisEnabled) {
      this.client = getRedisClient();
    }
  }
  
  private isEnabled(): boolean {
    return this.client !== null;
  }
  
  // Fallback memory cache methods
  private memoryGet<T>(key: string): T | null {
    const item = this.memoryCache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiry) {
      this.memoryCache.delete(key);
      return null;
    }
    return item.value as T;
  }
  
  private memorySet<T>(key: string, value: T, ttl: number): void {
    this.memoryCache.set(key, { value, expiry: Date.now() + ttl * 1000 });
  }
  
  private memoryDelete(key: string): void {
    this.memoryCache.delete(key);
  }
  
  // ============= Basic Operations =============
  
  async get<T>(key: string): Promise<T | null> {
    if (!this.isEnabled()) {
      return this.memoryGet<T>(key);
    }
    try {
      const value = await this.client!.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error({ error, key }, 'Cache get error');
      return this.memoryGet<T>(key);
    }
  }
  
  async set<T>(key: string, value: T, ttl?: number): Promise<boolean> {
    const expiry = ttl || this.defaultTTL;
    if (!this.isEnabled()) {
      this.memorySet(key, value, expiry);
      return true;
    }
    try {
      const serialized = JSON.stringify(value);
      await this.client!.setex(key, expiry, serialized);
      return true;
    } catch (error) {
      logger.error({ error, key }, 'Cache set error');
      this.memorySet(key, value, expiry);
      return false;
    }
  }
  
  async delete(key: string): Promise<boolean> {
    this.memoryDelete(key);
    if (!this.isEnabled()) return true;
    try {
      await this.client!.del(key);
      return true;
    } catch (error) {
      logger.error({ error, key }, 'Cache delete error');
      return false;
    }
  }
  
  async exists(key: string): Promise<boolean> {
    if (!this.isEnabled()) {
      return this.memoryCache.has(key);
    }
    try {
      const result = await this.client!.exists(key);
      return result === 1;
    } catch (error) {
      logger.error({ error, key }, 'Cache exists error');
      return this.memoryCache.has(key);
    }
  }
  
  async ttl(key: string): Promise<number> {
    if (!this.isEnabled()) return -1;
    try {
      return await this.client!.ttl(key);
    } catch (error) {
      logger.error({ error, key }, 'Cache TTL error');
      return -1;
    }
  }
  
  async expire(key: string, ttl: number): Promise<boolean> {
    if (!this.isEnabled()) return true;
    try {
      await this.client!.expire(key, ttl);
      return true;
    } catch (error) {
      logger.error({ error, key }, 'Cache expire error');
      return false;
    }
  }
  
  // ============= Hash Operations =============
  
  async hget<T>(key: string, field: string): Promise<T | null> {
    if (!this.isEnabled()) return null;
    try {
      const value = await this.client!.hget(key, field);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error({ error, key, field }, 'Cache hget error');
      return null;
    }
  }
  
  async hset<T>(key: string, field: string, value: T): Promise<boolean> {
    if (!this.isEnabled()) return true;
    try {
      await this.client!.hset(key, field, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.error({ error, key, field }, 'Cache hset error');
      return false;
    }
  }
  
  async hgetall<T>(key: string): Promise<Record<string, T> | null> {
    if (!this.isEnabled()) return null;
    try {
      const data = await this.client!.hgetall(key);
      if (!data || Object.keys(data).length === 0) return null;
      
      const result: Record<string, T> = {};
      for (const [field, value] of Object.entries(data)) {
        result[field] = JSON.parse(value);
      }
      return result;
    } catch (error) {
      logger.error({ error, key }, 'Cache hgetall error');
      return null;
    }
  }
  
  async hmset<T>(key: string, data: Record<string, T>, ttl?: number): Promise<boolean> {
    if (!this.isEnabled()) return true;
    try {
      const pipeline = this.client!.pipeline();
      for (const [field, value] of Object.entries(data)) {
        pipeline.hset(key, field, JSON.stringify(value));
      }
      if (ttl) {
        pipeline.expire(key, ttl);
      }
      await pipeline.exec();
      return true;
    } catch (error) {
      logger.error({ error, key }, 'Cache hmset error');
      return false;
    }
  }
  
  async hdel(key: string, ...fields: string[]): Promise<boolean> {
    if (!this.isEnabled()) return true;
    try {
      await this.client!.hdel(key, ...fields);
      return true;
    } catch (error) {
      logger.error({ error, key, fields }, 'Cache hdel error');
      return false;
    }
  }
  
  // ============= List Operations =============
  
  async lpush<T>(key: string, ...values: T[]): Promise<number> {
    if (!this.isEnabled()) return values.length;
    try {
      const serialized = values.map((v) => JSON.stringify(v));
      return await this.client!.lpush(key, ...serialized);
    } catch (error) {
      logger.error({ error, key }, 'Cache lpush error');
      return 0;
    }
  }
  
  async rpush<T>(key: string, ...values: T[]): Promise<number> {
    if (!this.isEnabled()) return values.length;
    try {
      const serialized = values.map((v) => JSON.stringify(v));
      return await this.client!.rpush(key, ...serialized);
    } catch (error) {
      logger.error({ error, key }, 'Cache rpush error');
      return 0;
    }
  }
  
  async lrange<T>(key: string, start: number, stop: number): Promise<T[]> {
    if (!this.isEnabled()) return [];
    try {
      const values = await this.client!.lrange(key, start, stop);
      return values.map((v) => JSON.parse(v));
    } catch (error) {
      logger.error({ error, key }, 'Cache lrange error');
      return [];
    }
  }
  
  async llen(key: string): Promise<number> {
    if (!this.isEnabled()) return 0;
    try {
      return await this.client!.llen(key);
    } catch (error) {
      logger.error({ error, key }, 'Cache llen error');
      return 0;
    }
  }
  
  // ============= Set Operations =============
  
  async sadd(key: string, ...members: string[]): Promise<number> {
    if (!this.isEnabled()) return members.length;
    try {
      return await this.client!.sadd(key, ...members);
    } catch (error) {
      logger.error({ error, key }, 'Cache sadd error');
      return 0;
    }
  }
  
  async smembers(key: string): Promise<string[]> {
    if (!this.isEnabled()) return [];
    try {
      return await this.client!.smembers(key);
    } catch (error) {
      logger.error({ error, key }, 'Cache smembers error');
      return [];
    }
  }
  
  async sismember(key: string, member: string): Promise<boolean> {
    if (!this.isEnabled()) return false;
    try {
      const result = await this.client!.sismember(key, member);
      return result === 1;
    } catch (error) {
      logger.error({ error, key }, 'Cache sismember error');
      return false;
    }
  }
  
  async srem(key: string, ...members: string[]): Promise<number> {
    if (!this.isEnabled()) return members.length;
    try {
      return await this.client!.srem(key, ...members);
    } catch (error) {
      logger.error({ error, key }, 'Cache srem error');
      return 0;
    }
  }
  
  // ============= Pattern Operations =============
  
  async keys(pattern: string): Promise<string[]> {
    if (!this.isEnabled()) return [];
    try {
      return await this.client!.keys(pattern);
    } catch (error) {
      logger.error({ error, pattern }, 'Cache keys error');
      return [];
    }
  }
  
  async deletePattern(pattern: string): Promise<number> {
    if (!this.isEnabled()) return 0;
    try {
      const keys = await this.keys(pattern);
      if (keys.length === 0) return 0;
      return await this.client!.del(...keys);
    } catch (error) {
      logger.error({ error, pattern }, 'Cache deletePattern error');
      return 0;
    }
  }
  
  // ============= Distributed Lock =============
  
  async acquireLock(key: string, ttl: number = 30): Promise<string | null> {
    if (!this.isEnabled()) return `local_${Date.now()}`;
    const lockKey = `lock:${key}`;
    const lockValue = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      const result = await this.client!.set(lockKey, lockValue, 'EX', ttl, 'NX');
      return result === 'OK' ? lockValue : null;
    } catch (error) {
      logger.error({ error, key }, 'Cache acquireLock error');
      return null;
    }
  }
  
  async releaseLock(key: string, lockValue: string): Promise<boolean> {
    if (!this.isEnabled()) return true;
    const lockKey = `lock:${key}`;
    const luaScript = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    
    try {
      const result = await this.client!.eval(luaScript, 1, lockKey, lockValue);
      return result === 1;
    } catch (error) {
      logger.error({ error, key }, 'Cache releaseLock error');
      return false;
    }
  }
  
  async withLock<T>(
    key: string,
    fn: () => Promise<T>,
    options: { ttl?: number; retries?: number; retryDelay?: number } = {}
  ): Promise<T> {
    const { ttl = 30, retries = 3, retryDelay = 100 } = options;
    
    let lockValue: string | null = null;
    let attempts = 0;
    
    while (attempts < retries) {
      lockValue = await this.acquireLock(key, ttl);
      if (lockValue) break;
      
      attempts++;
      await new Promise((resolve) => setTimeout(resolve, retryDelay * attempts));
    }
    
    if (!lockValue) {
      throw new Error(`Failed to acquire lock for ${key}`);
    }
    
    try {
      return await fn();
    } finally {
      await this.releaseLock(key, lockValue);
    }
  }
  
  // ============= Cache-Aside Pattern =============
  
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }
    
    const value = await fetchFn();
    await this.set(key, value, ttl);
    return value;
  }
  
  // ============= Health Check =============
  
  async ping(): Promise<boolean> {
    if (!this.isEnabled()) return false;
    try {
      const result = await this.client!.ping();
      return result === 'PONG';
    } catch (error) {
      logger.error({ error }, 'Cache ping error');
      return false;
    }
  }
  
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
    }
  }
}

// ============= Cache Key Builders =============

export const CacheKeys = {
  // User
  user: (userId: string) => `user:${userId}`,
  userSession: (sessionId: string) => `session:${sessionId}`,
  userSessions: (userId: string) => `user:${userId}:sessions`,
  
  // Trade
  trade: (tradeId: string) => `trade:${tradeId}`,
  userTrades: (userId: string) => `user:${userId}:trades`,
  
  // Analytics
  analytics: (userId: string, period: string) => `analytics:${userId}:${period}`,
  analyticsHash: (userId: string, query: object) => 
    `analytics:${userId}:${md5(JSON.stringify(query))}`,
  
  // Market Data
  quote: (exchange: string, symbol: string) => `market:quote:${exchange}:${symbol}`,
  index: (name: string) => `market:index:${name}`,
  candle: (exchange: string, symbol: string, interval: string) =>
    `market:candle:${exchange}:${symbol}:${interval}`,
  
  // Broker
  brokerSync: (brokerAccountId: string) => `broker:sync:${brokerAccountId}`,
  brokerSyncLock: (brokerAccountId: string) => `broker:sync:lock:${brokerAccountId}`,
  
  // Rate Limiting
  rateLimit: (userId: string, endpoint: string) => `ratelimit:${userId}:${endpoint}`,
  
  // Token Blacklist
  tokenBlacklist: (jti: string) => `token:blacklist:${jti}`,
};

// ============= Default Instance =============
// Create a lazy cache instance that only connects when first used
let _cacheInstance: CacheService | null = null;

export function getCache(): CacheService {
  if (!_cacheInstance) {
    _cacheInstance = new CacheService();
  }
  return _cacheInstance;
}

// Export a proxy cache that doesn't connect until used
export const cache = new CacheService(null, 300);
