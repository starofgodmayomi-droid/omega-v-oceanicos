/**
 * Distributed caching layer with Redis support
 * Enables cache sharing across multiple instances and horizontal scaling
 */

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  connectionTimeout?: number;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  createdAt: number;
  hitCount: number;
  lastAccessed: number;
}

export interface CacheStats {
  totalHits: number;
  totalMisses: number;
  hitRate: number;
  averageAccessTime: number;
  itemCount: number;
  memoryUsage: number;
}

/**
 * Distributed cache with local fallback
 */
export class DistributedCache<T = any> {
  private localCache: Map<string, CacheEntry<T>> = new Map();
  private remoteConnected = false;
  private stats = {
    hits: 0,
    misses: 0,
    accessTimes: [] as number[],
  };
  private maxLocalSize: number;
  private ttl: number;
  private redisClient: any;
  private keyPrefix: string;

  constructor(
    maxLocalSize: number = 10000,
    ttl: number = 300000,
    redisClient?: any,
    keyPrefix: string = 'cache:'
  ) {
    this.maxLocalSize = maxLocalSize;
    this.ttl = ttl;
    this.redisClient = redisClient;
    this.keyPrefix = keyPrefix;
    this.remoteConnected = !!redisClient;
  }

  /**
   * Get value from cache (checks remote first, then local)
   */
  async get(key: string): Promise<T | undefined> {
    const startTime = Date.now();

    try {
      // Try remote cache first
      if (this.remoteConnected && this.redisClient) {
        const remoteValue = await this.getFromRemote(key);
        if (remoteValue !== undefined) {
          this.stats.hits++;
          const accessTime = Date.now() - startTime;
          this.stats.accessTimes.push(accessTime);
          this.updateLocalCache(key, remoteValue);
          return remoteValue;
        }
      }

      // Fall back to local cache
      const localEntry = this.localCache.get(key);
      if (localEntry) {
        if (this.isExpired(localEntry)) {
          this.localCache.delete(key);
          this.stats.misses++;
          return undefined;
        }

        localEntry.hitCount++;
        localEntry.lastAccessed = Date.now();
        this.stats.hits++;
        const accessTime = Date.now() - startTime;
        this.stats.accessTimes.push(accessTime);
        return localEntry.value;
      }

      this.stats.misses++;
      return undefined;
    } catch (error) {
      // On remote error, fall back to local
      const localEntry = this.localCache.get(key);
      if (localEntry && !this.isExpired(localEntry)) {
        localEntry.hitCount++;
        localEntry.lastAccessed = Date.now();
        this.stats.hits++;
        return localEntry.value;
      }

      this.stats.misses++;
      return undefined;
    }
  }

  /**
   * Set value in cache (sets both local and remote)
   */
  async set(key: string, value: T): Promise<void> {
    const now = Date.now();
    const entry: CacheEntry<T> = {
      value,
      expiresAt: now + this.ttl,
      createdAt: now,
      hitCount: 0,
      lastAccessed: now,
    };

    // Update local cache
    this.localCache.set(key, entry);
    this.enforceLocalSize();

    // Update remote cache
    if (this.remoteConnected && this.redisClient) {
      try {
        await this.setRemote(key, value);
      } catch (error) {
        // Remote write failed, local cache is authoritative
      }
    }
  }

  /**
   * Delete from cache
   */
  async delete(key: string): Promise<void> {
    this.localCache.delete(key);

    if (this.remoteConnected && this.redisClient) {
      try {
        await this.deleteRemote(key);
      } catch (error) {
        // Remote delete failed
      }
    }
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    this.localCache.clear();

    if (this.remoteConnected && this.redisClient) {
      try {
        await this.clearRemote();
      } catch (error) {
        // Remote clear failed
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;

    const avgAccessTime =
      this.stats.accessTimes.length > 0
        ? this.stats.accessTimes.reduce((a, b) => a + b, 0) / this.stats.accessTimes.length
        : 0;

    let memoryUsage = 0;
    for (const entry of this.localCache.values()) {
      memoryUsage += JSON.stringify(entry).length;
    }

    return {
      totalHits: this.stats.hits,
      totalMisses: this.stats.misses,
      hitRate,
      averageAccessTime: avgAccessTime,
      itemCount: this.localCache.size,
      memoryUsage,
    };
  }

  /**
   * Set Redis client for remote caching
   */
  setRemoteClient(redisClient: any): void {
    this.redisClient = redisClient;
    this.remoteConnected = !!redisClient;
  }

  /**
   * Check if remote cache is connected
   */
  isRemoteConnected(): boolean {
    return this.remoteConnected;
  }

  /**
   * Private: Check if entry is expired
   */
  private isExpired(entry: CacheEntry<T>): boolean {
    return Date.now() > entry.expiresAt;
  }

  /**
   * Private: Update local cache from remote value
   */
  private updateLocalCache(key: string, value: T): void {
    const now = Date.now();
    this.localCache.set(key, {
      value,
      expiresAt: now + this.ttl,
      createdAt: now,
      hitCount: 1,
      lastAccessed: now,
    });
    this.enforceLocalSize();
  }

  /**
   * Private: Enforce local cache size limit (simple eviction)
   */
  private enforceLocalSize(): void {
    if (this.localCache.size > this.maxLocalSize) {
      // Remove oldest/least accessed items
      const sorted = Array.from(this.localCache.entries()).sort(
        ([, a], [, b]) => a.lastAccessed - b.lastAccessed
      );

      const toRemove = sorted.length - this.maxLocalSize;
      for (let i = 0; i < toRemove; i++) {
        this.localCache.delete(sorted[i][0]);
      }
    }
  }

  /**
   * Private: Get from remote cache
   */
  private async getFromRemote(key: string): Promise<T | undefined> {
    if (!this.redisClient) return undefined;

    try {
      const value = await this.redisClient.get(this.keyPrefix + key);
      return value ? JSON.parse(value) : undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Private: Set in remote cache
   */
  private async setRemote(key: string, value: T): Promise<void> {
    if (!this.redisClient) return;

    try {
      await this.redisClient.setex(
        this.keyPrefix + key,
        Math.floor(this.ttl / 1000),
        JSON.stringify(value)
      );
    } catch {
      // Remote write failed
    }
  }

  /**
   * Private: Delete from remote cache
   */
  private async deleteRemote(key: string): Promise<void> {
    if (!this.redisClient) return;

    try {
      await this.redisClient.del(this.keyPrefix + key);
    } catch {
      // Remote delete failed
    }
  }

  /**
   * Private: Clear remote cache
   */
  private async clearRemote(): Promise<void> {
    if (!this.redisClient) return;

    try {
      const keys = await this.redisClient.keys(this.keyPrefix + '*');
      if (keys.length > 0) {
        await this.redisClient.del(...keys);
      }
    } catch {
      // Remote clear failed
    }
  }
}

/**
 * Distributed cache manager for multiple cache types
 */
export class DistributedCacheManager {
  private caches: Map<string, DistributedCache<any>> = new Map();
  private redisClient: any;

  constructor(redisClient?: any) {
    this.redisClient = redisClient;
  }

  /**
   * Create or get a named cache
   */
  getCache<T>(name: string, maxSize: number = 10000, ttl: number = 300000): DistributedCache<T> {
    if (!this.caches.has(name)) {
      const cache = new DistributedCache<T>(maxSize, ttl, this.redisClient, `cache:${name}:`);
      this.caches.set(name, cache);
    }

    return this.caches.get(name) as DistributedCache<T>;
  }

  /**
   * Set Redis client for all caches
   */
  setRedisClient(redisClient: any): void {
    this.redisClient = redisClient;
    for (const cache of this.caches.values()) {
      cache.setRemoteClient(redisClient);
    }
  }

  /**
   * Get statistics for all caches
   */
  getStats(): Record<string, CacheStats> {
    const stats: Record<string, CacheStats> = {};

    for (const [name, cache] of this.caches.entries()) {
      stats[name] = cache.getStats();
    }

    return stats;
  }

  /**
   * Clear all caches
   */
  async clearAll(): Promise<void> {
    for (const cache of this.caches.values()) {
      await cache.clear();
    }
  }
}

/**
 * Redis client wrapper with connection pooling
 */
export class RedisClient {
  private client: any;
  private connected = false;
  private config: RedisConfig;
  private reconnectAttempts = 0;

  constructor(config: RedisConfig) {
    this.config = config;
  }

  /**
   * Connect to Redis
   */
  async connect(): Promise<void> {
    try {
      // Dynamic import to avoid dependency if not using Redis
      const redis = await import('redis');
      this.client = redis.createClient({
        socket: {
          host: this.config.host,
          port: this.config.port,
          connectTimeout: this.config.connectionTimeout || 5000,
        },
        password: this.config.password,
        database: this.config.db || 0,
      });

      this.client.on('error', (err: Error) => this.handleError(err));
      this.client.on('connect', () => this.handleConnect());
      this.client.on('disconnect', () => this.handleDisconnect());

      await this.client.connect();
      this.connected = true;
      this.reconnectAttempts = 0;
    } catch (error) {
      this.connected = false;
      throw error;
    }
  }

  /**
   * Get value from Redis
   */
  async get(key: string): Promise<string | null> {
    if (!this.connected) return null;
    return this.client.get(key);
  }

  /**
   * Set value with expiration
   */
  async setex(key: string, seconds: number, value: string): Promise<void> {
    if (!this.connected) return;
    await this.client.setEx(key, seconds, value);
  }

  /**
   * Delete key
   */
  async del(...keys: string[]): Promise<number> {
    if (!this.connected) return 0;
    return this.client.del(keys);
  }

  /**
   * Get keys matching pattern
   */
  async keys(pattern: string): Promise<string[]> {
    if (!this.connected) return [];
    return this.client.keys(pattern);
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.connected = false;
    }
  }

  /**
   * Private: Handle connection
   */
  private handleConnect(): void {
    this.connected = true;
    this.reconnectAttempts = 0;
  }

  /**
   * Private: Handle disconnection
   */
  private handleDisconnect(): void {
    this.connected = false;
    this.attemptReconnect();
  }

  /**
   * Private: Handle error
   */
  private handleError(error: Error): void {
    if (!this.connected) {
      this.attemptReconnect();
    }
  }

  /**
   * Private: Attempt to reconnect
   */
  private attemptReconnect(): void {
    const maxAttempts = this.config.maxReconnectAttempts || 5;
    if (this.reconnectAttempts >= maxAttempts) {
      return;
    }

    this.reconnectAttempts++;
    const delay = (this.config.reconnectInterval || 1000) * this.reconnectAttempts;

    setTimeout(async () => {
      try {
        await this.connect();
      } catch {
        this.attemptReconnect();
      }
    }, delay);
  }
}
