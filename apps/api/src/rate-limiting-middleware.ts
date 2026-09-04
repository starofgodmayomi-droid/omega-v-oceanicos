/**
 * Rate limiting middleware for Express
 * Supports per-user, per-API-key, and tiered rate limiting
 */

import { Request, Response, NextFunction } from 'express';
import {
  SlidingWindowRateLimiter,
  TokenBucket,
  TieredRateLimiter,
  RateLimitStatus,
} from '@omega-v/runtime';

export interface RateLimitOptions {
  type?: 'sliding-window' | 'token-bucket' | 'tiered';
  maxRequests?: number;
  windowMs?: number;
  capacity?: number;
  refillRate?: number;
  refillIntervalMs?: number;
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  onLimitReached?: (req: Request, res: Response, status: RateLimitStatus) => void;
}

/**
 * Per-user rate limiting middleware using sliding window
 */
export function rateLimitingMiddleware(options: RateLimitOptions = {}) {
  const {
    type = 'sliding-window',
    maxRequests = 100,
    windowMs = 60000,
    keyGenerator = defaultKeyGenerator,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    onLimitReached,
  } = options;

  let limiter: SlidingWindowRateLimiter | TokenBucket | TieredRateLimiter;

  if (type === 'token-bucket') {
    limiter = new TokenBucket({
      capacity: options.capacity || 100,
      refillRate: options.refillRate || 10,
      refillIntervalMs: options.refillIntervalMs || 1000,
    });
  } else if (type === 'tiered') {
    limiter = new TieredRateLimiter([
      { name: 'free', maxRequests: 10, windowMs: 60000 },
      { name: 'pro', maxRequests: 100, windowMs: 60000 },
      { name: 'enterprise', maxRequests: 1000, windowMs: 60000 },
    ]);
  } else {
    limiter = new SlidingWindowRateLimiter({ maxRequests, windowMs, keyGenerator });
  }

  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator(req);
    let status: RateLimitStatus;

    if (limiter instanceof TieredRateLimiter) {
      status = limiter.checkLimit(key, 'free');
    } else if (limiter instanceof TokenBucket) {
      status = limiter.consume(key, 1);
    } else {
      status = limiter.checkLimit(key);
    }

    res.setHeader('X-RateLimit-Limit', status.limit.toString());
    res.setHeader(
      'X-RateLimit-Remaining',
      status.remaining.toString(),
    );
    res.setHeader(
      'X-RateLimit-Reset',
      new Date(status.resetAt).toISOString(),
    );

    if (status.isLimited) {
      if (onLimitReached) {
        onLimitReached(req, res, status);
      } else {
        res.status(429).json({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded',
          retryAfter: Math.ceil((status.resetAt - Date.now()) / 1000),
        });
      }
      return;
    }

    res.on('finish', () => {
      const shouldSkip =
        (skipSuccessfulRequests && res.statusCode < 400) ||
        (skipFailedRequests && res.statusCode >= 400);

      if (shouldSkip && limiter instanceof SlidingWindowRateLimiter) {
        limiter.reset(key);
      }
    });

    next();
  };
}

/**
 * Default key generator - uses user ID or API key
 */
export function defaultKeyGenerator(req: Request): string {
  const userId = (req as any).userId;
  const apiKey = (req as any).apiKey;
  const ip = req.ip;

  if (userId) return `user:${userId}`;
  if (apiKey) return `key:${apiKey}`;
  return `ip:${ip}`;
}

/**
 * Per-endpoint rate limiting with different limits for different paths
 */
export interface EndpointLimit {
  path: string | RegExp;
  maxRequests: number;
  windowMs: number;
}

export function endpointRateLimitingMiddleware(
  endpoints: EndpointLimit[],
  options: Omit<RateLimitOptions, 'maxRequests' | 'windowMs'> = {},
) {
  const limiters = new Map<EndpointLimit, SlidingWindowRateLimiter>();

  for (const endpoint of endpoints) {
    limiters.set(
      endpoint,
      new SlidingWindowRateLimiter({
        maxRequests: endpoint.maxRequests,
        windowMs: endpoint.windowMs,
        keyGenerator: options.keyGenerator,
      }),
    );
  }

  return (req: Request, res: Response, next: NextFunction) => {
    const endpoint = endpoints.find((e) => {
      if (typeof e.path === 'string') {
        return req.path === e.path || req.path.startsWith(e.path);
      }
      return e.path.test(req.path);
    });

    if (!endpoint) {
      return next();
    }

    const limiter = limiters.get(endpoint)!;
    const key = (options.keyGenerator || defaultKeyGenerator)(req);
    const status = limiter.checkLimit(key);

    res.setHeader('X-RateLimit-Limit', status.limit.toString());
    res.setHeader(
      'X-RateLimit-Remaining',
      status.remaining.toString(),
    );
    res.setHeader(
      'X-RateLimit-Reset',
      new Date(status.resetAt).toISOString(),
    );

    if (status.isLimited) {
      return res.status(429).json({
        error: 'Too Many Requests',
        message: `Rate limit for ${endpoint.path} exceeded`,
        retryAfter: Math.ceil((status.resetAt - Date.now()) / 1000),
      });
    }

    next();
  };
}
