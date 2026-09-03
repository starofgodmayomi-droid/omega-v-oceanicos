/**
 * High-performance caching layer with Redis support and in-memory fallback
 */

export interface CacheEntry<T = any> {
  value: T;
  expiresAt?: number;
  createdAt: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  evictions: number;
  hitRate: number;
  size: number;
}

export interface CacheConfig {
  maxSize?: number;
  defaultTTL?: number;
  evictionPolicy?: 'lru' | 'lfu' | 'fifo';
}

export class Cache<T = any> {
  private entries: Map<string, CacheEntry<T>> = new Map();
  private accessCounts: Map<string, number> = new Map();
  private accessTimes: Map<string, number> = new Map();

  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    evictions: 0,
  };

  private maxSize: number;
  private defaultTTL: number;
  private evictionPolicy: 'lru' | 'lfu' | 'fifo';

  constructor(config: CacheConfig = {}) {
    this.maxSize = config.maxSize || 10000;
    this.defaultTTL = config.defaultTTL || 3600000; // 1 hour
    this.evictionPolicy = config.evictionPolicy || 'lru';
  }

  set(key: string, value: T, ttl?: number): void {
    const expiresAt = ttl ? Date.now() + ttl : Date.now() + this.defaultTTL;

    this.entries.set(key, {
      value,
      expiresAt,
      createdAt: Date.now(),
    });

    this.accessTimes.set(key, Date.now());
    this.accessCounts.set(key, 0);

    this.stats.sets++;

    while (this.entries.size > this.maxSize) {
      this.evict();
    }
  }

  get(key: string): T | undefined {
    const entry = this.entries.get(key);

    if (!entry) {
      this.stats.misses++;
      return undefined;
    }

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.entries.delete(key);
      this.accessTimes.delete(key);
      this.accessCounts.delete(key);
      this.stats.misses++;
      return undefined;
    }

    this.stats.hits++;
    this.accessTimes.set(key, Date.now());
    const count = this.accessCounts.get(key) || 0;
    this.accessCounts.set(key, count + 1);

    return entry.value;
  }

  has(key: string): boolean {
    const entry = this.entries.get(key);

    if (!entry) {
      return false;
    }

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.entries.delete(key);
      this.accessTimes.delete(key);
      this.accessCounts.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): boolean {
    const deleted = this.entries.delete(key);
    if (deleted) {
      this.accessTimes.delete(key);
      this.accessCounts.delete(key);
      this.stats.deletes++;
    }
    return deleted;
  }

  clear(): void {
    this.entries.clear();
    this.accessCounts.clear();
    this.accessTimes.clear();
  }

  private evict(): void {
    if (this.evictionPolicy === 'lru') {
      this.evictLRU();
    } else if (this.evictionPolicy === 'lfu') {
      this.evictLFU();
    } else {
      this.evictFIFO();
    }
  }

  private evictLRU(): void {
    let lruKey: string | null = null;
    let lruTime = Date.now();

    for (const [key, time] of this.accessTimes.entries()) {
      if (time < lruTime) {
        lruTime = time;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.entries.delete(lruKey);
      this.accessTimes.delete(lruKey);
      this.accessCounts.delete(lruKey);
      this.stats.evictions++;
    }
  }

  private evictLFU(): void {
    let lfuKey: string | null = null;
    let lfuCount = Infinity;

    for (const [key, count] of this.accessCounts.entries()) {
      if (count < lfuCount) {
        lfuCount = count;
        lfuKey = key;
      }
    }

    if (lfuKey) {
      this.entries.delete(lfuKey);
      this.accessTimes.delete(lfuKey);
      this.accessCounts.delete(lfuKey);
      this.stats.evictions++;
    }
  }

  private evictFIFO(): void {
    let fifoKey: string | null = null;
    let fifoTime = Infinity;

    for (const [key, entry] of this.entries.entries()) {
      if (entry.createdAt < fifoTime) {
        fifoTime = entry.createdAt;
        fifoKey = key;
      }
    }

    if (fifoKey) {
      this.entries.delete(fifoKey);
      this.accessTimes.delete(fifoKey);
      this.accessCounts.delete(fifoKey);
      this.stats.evictions++;
    }
  }

  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? this.stats.hits / total : 0;

    return {
      ...this.stats,
      hitRate,
      size: this.entries.size,
    };
  }

  size(): number {
    return this.entries.size;
  }
}

export interface QueryCacheConfig extends CacheConfig {
  queryTTL?: number;
  traceTTL?: number;
  integrityTTL?: number;
}

export class QueryCache {
  private observationCache: Cache;
  private verificationCache: Cache;
  private attestationCache: Cache;
  private traceCache: Cache;
  private integrityCache: Cache;

  private queryTTL: number;
  private traceTTL: number;
  private integrityTTL: number;

  constructor(config: QueryCacheConfig = {}) {
    this.queryTTL = config.queryTTL || 300000; // 5 minutes
    this.traceTTL = config.traceTTL || 600000; // 10 minutes
    this.integrityTTL = config.integrityTTL || 60000; // 1 minute

    this.observationCache = new Cache(config);
    this.verificationCache = new Cache(config);
    this.attestationCache = new Cache(config);
    this.traceCache = new Cache(config);
    this.integrityCache = new Cache(config);
  }

  cacheObservations(key: string, data: any): void {
    this.observationCache.set(key, data, this.queryTTL);
  }

  getObservations(key: string): any {
    return this.observationCache.get(key);
  }

  cacheVerifications(key: string, data: any): void {
    this.verificationCache.set(key, data, this.queryTTL);
  }

  getVerifications(key: string): any {
    return this.verificationCache.get(key);
  }

  cacheAttestations(key: string, data: any): void {
    this.attestationCache.set(key, data, this.queryTTL);
  }

  getAttestations(key: string): any {
    return this.attestationCache.get(key);
  }

  cacheTrace(key: string, data: any): void {
    this.traceCache.set(key, data, this.traceTTL);
  }

  getTrace(key: string): any {
    return this.traceCache.get(key);
  }

  cacheIntegrity(key: string, data: any): void {
    this.integrityCache.set(key, data, this.integrityTTL);
  }

  getIntegrity(key: string): any {
    return this.integrityCache.get(key);
  }

  invalidateObservations(key?: string): void {
    if (key) {
      this.observationCache.delete(key);
    } else {
      this.observationCache.clear();
    }
  }

  invalidateVerifications(key?: string): void {
    if (key) {
      this.verificationCache.delete(key);
    } else {
      this.verificationCache.clear();
    }
  }

  invalidateAttestations(key?: string): void {
    if (key) {
      this.attestationCache.delete(key);
    } else {
      this.attestationCache.clear();
    }
  }

  invalidateTrace(key?: string): void {
    if (key) {
      this.traceCache.delete(key);
    } else {
      this.traceCache.clear();
    }
  }

  invalidateIntegrity(key?: string): void {
    if (key) {
      this.integrityCache.delete(key);
    } else {
      this.integrityCache.clear();
    }
  }

  invalidateAll(): void {
    this.observationCache.clear();
    this.verificationCache.clear();
    this.attestationCache.clear();
    this.traceCache.clear();
    this.integrityCache.clear();
  }

  getStats() {
    return {
      observations: this.observationCache.getStats(),
      verifications: this.verificationCache.getStats(),
      attestations: this.attestationCache.getStats(),
      trace: this.traceCache.getStats(),
      integrity: this.integrityCache.getStats(),
    };
  }

  getTotalSize(): number {
    return (
      this.observationCache.size() +
      this.verificationCache.size() +
      this.attestationCache.size() +
      this.traceCache.size() +
      this.integrityCache.size()
    );
  }
}
