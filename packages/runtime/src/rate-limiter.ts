/**
 * Rate limiting with sliding window and token bucket algorithms
 * Supports per-user, per-API-key, and global rate limits
 */

export interface RateLimitConfig {
  maxRequests?: number;
  windowMs?: number;
  keyGenerator?: (identifier: string) => string;
}

export interface RateLimitStatus {
  limit: number;
  remaining: number;
  resetAt: number;
  isLimited: boolean;
}

export interface RateLimiterStats {
  totalRequests: number;
  totalRejected: number;
  activeKeys: number;
  rejectionRate: number;
}

interface RequestRecord {
  timestamp: number;
  count: number;
}

interface KeyStatus {
  requests: number;
  firstRequestAt: number;
  resetAt: number;
}

export class SlidingWindowRateLimiter {
  private config: Required<RateLimitConfig>;
  private keyStatus: Map<string, KeyStatus> = new Map();

  private stats = {
    totalRequests: 0,
    totalRejected: 0,
  };

  constructor(config: RateLimitConfig = {}) {
    this.config = {
      maxRequests: config.maxRequests || 100,
      windowMs: config.windowMs || 60000, // 1 minute
      keyGenerator: config.keyGenerator || ((id) => id),
    };
  }

  /**
   * Check rate limit and track request
   */
  checkLimit(identifier: string): RateLimitStatus {
    const key = this.config.keyGenerator(identifier);
    const now = Date.now();

    let status = this.keyStatus.get(key);

    if (!status) {
      status = {
        requests: 0,
        firstRequestAt: now,
        resetAt: now + this.config.windowMs,
      };
    }

    if (now > status.resetAt) {
      status.requests = 0;
      status.firstRequestAt = now;
      status.resetAt = now + this.config.windowMs;
    }

    const isLimited = status.requests >= this.config.maxRequests;

    if (!isLimited) {
      status.requests++;
    } else {
      this.stats.totalRejected++;
    }

    this.stats.totalRequests++;
    this.keyStatus.set(key, status);

    return {
      limit: this.config.maxRequests,
      remaining: Math.max(0, this.config.maxRequests - status.requests),
      resetAt: status.resetAt,
      isLimited,
    };
  }

  /**
   * Reset limit for a specific identifier
   */
  reset(identifier: string): void {
    const key = this.config.keyGenerator(identifier);
    this.keyStatus.delete(key);
  }

  /**
   * Reset all limits
   */
  resetAll(): void {
    this.keyStatus.clear();
  }

  /**
   * Get current limit status for identifier
   */
  getStatus(identifier: string): RateLimitStatus {
    const key = this.config.keyGenerator(identifier);
    const now = Date.now();

    let status = this.keyStatus.get(key);

    if (!status) {
      return {
        limit: this.config.maxRequests,
        remaining: this.config.maxRequests,
        resetAt: now + this.config.windowMs,
        isLimited: false,
      };
    }

    if (now > status.resetAt) {
      return {
        limit: this.config.maxRequests,
        remaining: this.config.maxRequests,
        resetAt: now + this.config.windowMs,
        isLimited: false,
      };
    }

    return {
      limit: this.config.maxRequests,
      remaining: Math.max(0, this.config.maxRequests - status.requests),
      resetAt: status.resetAt,
      isLimited: status.requests >= this.config.maxRequests,
    };
  }

  /**
   * Get rate limiter statistics
   */
  getStats(): RateLimiterStats {
    const total = this.stats.totalRequests;
    const rejected = this.stats.totalRejected;
    const rejectionRate = total > 0 ? rejected / total : 0;

    return {
      totalRequests: this.stats.totalRequests,
      totalRejected: this.stats.totalRejected,
      activeKeys: this.keyStatus.size,
      rejectionRate,
    };
  }
}

export interface TokenBucketConfig {
  capacity?: number;
  refillRate?: number;
  refillIntervalMs?: number;
}

interface BucketState {
  tokens: number;
  lastRefillAt: number;
}

/**
 * Token bucket algorithm for rate limiting
 * Allows burst traffic up to capacity, then sustains at refill rate
 */
export class TokenBucket {
  private config: Required<TokenBucketConfig>;
  private buckets: Map<string, BucketState> = new Map();

  private stats = {
    totalRequests: 0,
    totalRejected: 0,
  };

  constructor(config: TokenBucketConfig = {}) {
    this.config = {
      capacity: config.capacity || 100,
      refillRate: config.refillRate || 10,
      refillIntervalMs: config.refillIntervalMs || 1000,
    };
  }

  /**
   * Consume tokens from bucket
   */
  consume(identifier: string, tokens: number = 1): RateLimitStatus {
    const now = Date.now();
    let bucket = this.buckets.get(identifier);

    if (!bucket) {
      bucket = {
        tokens: this.config.capacity,
        lastRefillAt: now,
      };
    }

    const timeSinceRefill = now - bucket.lastRefillAt;
    const refillCount = Math.floor(
      (timeSinceRefill / this.config.refillIntervalMs) * this.config.refillRate
    );

    if (refillCount > 0) {
      bucket.tokens = Math.min(this.config.capacity, bucket.tokens + refillCount);
      bucket.lastRefillAt = now + (timeSinceRefill % this.config.refillIntervalMs);
    }

    const canConsume = bucket.tokens >= tokens;

    if (canConsume) {
      bucket.tokens -= tokens;
    } else {
      this.stats.totalRejected++;
    }

    this.stats.totalRequests++;
    this.buckets.set(identifier, bucket);

    const resetAt = bucket.lastRefillAt + this.config.refillIntervalMs;

    return {
      limit: this.config.capacity,
      remaining: Math.floor(bucket.tokens),
      resetAt,
      isLimited: !canConsume,
    };
  }

  /**
   * Reset bucket for identifier
   */
  reset(identifier: string): void {
    this.buckets.delete(identifier);
  }

  /**
   * Reset all buckets
   */
  resetAll(): void {
    this.buckets.clear();
  }

  /**
   * Get bucket status
   */
  getStatus(identifier: string): RateLimitStatus {
    const now = Date.now();
    let bucket = this.buckets.get(identifier);

    if (!bucket) {
      return {
        limit: this.config.capacity,
        remaining: this.config.capacity,
        resetAt: now + this.config.refillIntervalMs,
        isLimited: false,
      };
    }

    const timeSinceRefill = now - bucket.lastRefillAt;
    const refillCount = Math.floor(
      (timeSinceRefill / this.config.refillIntervalMs) * this.config.refillRate
    );
    const currentTokens = Math.min(this.config.capacity, bucket.tokens + refillCount);
    const resetAt = bucket.lastRefillAt + this.config.refillIntervalMs;

    return {
      limit: this.config.capacity,
      remaining: Math.floor(currentTokens),
      resetAt,
      isLimited: currentTokens < 1,
    };
  }

  /**
   * Get token bucket statistics
   */
  getStats(): RateLimiterStats {
    const total = this.stats.totalRequests;
    const rejected = this.stats.totalRejected;
    const rejectionRate = total > 0 ? rejected / total : 0;

    return {
      totalRequests: this.stats.totalRequests,
      totalRejected: this.stats.totalRejected,
      activeKeys: this.buckets.size,
      rejectionRate,
    };
  }
}

/**
 * Tiered rate limiting with different limits per tier
 */
export interface TierConfig {
  name: string;
  maxRequests: number;
  windowMs: number;
}

export class TieredRateLimiter {
  private limiters: Map<string, SlidingWindowRateLimiter> = new Map();
  private userTiers: Map<string, string> = new Map();

  private stats = {
    totalRequests: 0,
    totalRejected: 0,
  };

  constructor(tiers: TierConfig[]) {
    for (const tier of tiers) {
      this.limiters.set(
        tier.name,
        new SlidingWindowRateLimiter({
          maxRequests: tier.maxRequests,
          windowMs: tier.windowMs,
        })
      );
    }
  }

  /**
   * Set user tier
   */
  setUserTier(userId: string, tierName: string): void {
    if (!this.limiters.has(tierName)) {
      throw new Error(`Unknown tier: ${tierName}`);
    }
    this.userTiers.set(userId, tierName);
  }

  /**
   * Check limit for user
   */
  checkLimit(userId: string, defaultTier: string = 'default'): RateLimitStatus {
    const tierName = this.userTiers.get(userId) || defaultTier;
    const limiter = this.limiters.get(tierName);

    if (!limiter) {
      throw new Error(`Unknown tier: ${tierName}`);
    }

    const status = limiter.checkLimit(userId);
    this.stats.totalRequests++;

    if (status.isLimited) {
      this.stats.totalRejected++;
    }

    return status;
  }

  /**
   * Get user tier
   */
  getUserTier(userId: string): string | undefined {
    return this.userTiers.get(userId);
  }

  /**
   * Get tiered rate limiter statistics
   */
  getStats(): Record<string, RateLimiterStats> {
    const stats: Record<string, RateLimiterStats> = {};

    for (const [tierName, limiter] of this.limiters.entries()) {
      stats[tierName] = limiter.getStats();
    }

    return stats;
  }
}
