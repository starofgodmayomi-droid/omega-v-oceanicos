/**
 * Express middleware for distributed caching
 * Enables caching of API responses across multiple instances
 */

import { Request, Response, NextFunction } from 'express';
import { DistributedCacheManager, RedisClient } from '@omega-v/runtime';

export interface CacheMiddlewareOptions {
  cacheManager: DistributedCacheManager;
  cacheName?: string;
  excludePaths?: string[];
  excludeMethods?: string[];
  ttl?: number;
  keyGenerator?: (req: Request) => string;
}

declare global {
  namespace Express {
    interface Request {
      cacheKey?: string;
      bypassCache?: boolean;
    }
  }
}

/**
 * Response caching middleware
 */
export function responseCacheMiddleware(options: CacheMiddlewareOptions) {
  const {
    cacheManager,
    cacheName = 'responses',
    excludePaths = ['/health', '/metrics'],
    excludeMethods = ['POST', 'PUT', 'DELETE', 'PATCH'],
    keyGenerator = defaultKeyGenerator,
  } = options;

  const cache = cacheManager.getCache<{ status: number; body: any }>(cacheName);

  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip caching for excluded paths or methods
    if (
      excludePaths.some((path) => req.path.includes(path)) ||
      excludeMethods.includes(req.method)
    ) {
      return next();
    }

    const cacheKey = keyGenerator(req);
    req.cacheKey = cacheKey;

    // Check for bypass header
    if (req.headers['cache-control']?.includes('no-cache')) {
      req.bypassCache = true;
      return next();
    }

    try {
      // Check cache for GET/HEAD requests
      if (req.method === 'GET' || req.method === 'HEAD') {
        const cached = await cache.get(cacheKey);
        if (cached) {
          res.setHeader('X-Cache', 'HIT');
          return res.status(cached.status).json(cached.body);
        }
      }

      // Store original response methods
      const originalJson = res.json.bind(res);
      const originalSend = res.send.bind(res);

      // Override json to cache response
      res.json = function (body: any) {
        if (
          res.statusCode >= 200 &&
          res.statusCode < 300 &&
          (req.method === 'GET' || req.method === 'HEAD')
        ) {
          res.setHeader('X-Cache', 'MISS');
          cache.set(cacheKey, {
            status: res.statusCode,
            body,
          }).catch(() => {
            // Cache write failed, continue
          });
        }
        return originalJson(body);
      };

      // Override send to cache response
      res.send = function (body: any) {
        if (
          res.statusCode >= 200 &&
          res.statusCode < 300 &&
          (req.method === 'GET' || req.method === 'HEAD')
        ) {
          res.setHeader('X-Cache', 'MISS');
          cache.set(cacheKey, {
            status: res.statusCode,
            body,
          }).catch(() => {
            // Cache write failed, continue
          });
        }
        return originalSend(body);
      };

      next();
    } catch (error) {
      // On error, skip caching and continue
      next();
    }
  };
}

/**
 * Cache invalidation middleware
 */
export function cacheInvalidationMiddleware(
  cacheManager: DistributedCacheManager,
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Invalidate caches on mutations
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
      try {
        await cacheManager.clearAll();
        res.setHeader('X-Cache-Invalidated', 'true');
      } catch (error) {
        // Invalidation failed, continue
      }
    }

    next();
  };
}

/**
 * Cache statistics middleware
 */
export function cacheStatsMiddleware(cacheManager: DistributedCacheManager) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Add cache stats to response headers
    const stats = cacheManager.getStats();
    const totalHits = Object.values(stats).reduce((sum, s) => sum + s.totalHits, 0);
    const totalMisses = Object.values(stats).reduce((sum, s) => sum + s.totalMisses, 0);
    const totalRequests = totalHits + totalMisses;
    const overallHitRate = totalRequests > 0 ? totalHits / totalRequests : 0;

    res.setHeader('X-Cache-Overall-Hit-Rate', overallHitRate.toFixed(2));
    res.setHeader('X-Cache-Total-Hits', totalHits.toString());
    res.setHeader('X-Cache-Total-Misses', totalMisses.toString());

    next();
  };
}

/**
 * Redis connection middleware
 */
export function redisConnectionMiddleware(redisClient: RedisClient) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!redisClient.isConnected()) {
      res.setHeader('X-Cache-Backend', 'local');
    } else {
      res.setHeader('X-Cache-Backend', 'redis');
    }

    next();
  };
}

/**
 * Cache purge endpoint
 */
export function cachePurgeEndpoint(cacheManager: DistributedCacheManager) {
  return async (req: Request, res: Response) => {
    try {
      await cacheManager.clearAll();
      res.json({
        success: true,
        message: 'All caches purged',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to purge caches',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}

/**
 * Cache stats endpoint
 */
export function cacheStatsEndpoint(cacheManager: DistributedCacheManager) {
  return (req: Request, res: Response) => {
    const stats = cacheManager.getStats();

    const summary = {
      caches: Object.keys(stats),
      totalHits: 0,
      totalMisses: 0,
      overallHitRate: 0,
      totalItems: 0,
      totalMemoryUsage: 0,
      averageAccessTime: 0,
    };

    let accessTimesSum = 0;
    let accessTimesCount = 0;

    for (const cacheStats of Object.values(stats)) {
      summary.totalHits += cacheStats.totalHits;
      summary.totalMisses += cacheStats.totalMisses;
      summary.totalItems += cacheStats.itemCount;
      summary.totalMemoryUsage += cacheStats.memoryUsage;
      accessTimesSum += cacheStats.averageAccessTime;
      accessTimesCount++;
    }

    const totalRequests = summary.totalHits + summary.totalMisses;
    summary.overallHitRate =
      totalRequests > 0 ? summary.totalHits / totalRequests : 0;
    summary.averageAccessTime =
      accessTimesCount > 0 ? accessTimesSum / accessTimesCount : 0;

    res.json({
      summary,
      caches: stats,
    });
  };
}

/**
 * Default cache key generator
 */
export function defaultKeyGenerator(req: Request): string {
  const method = req.method.toUpperCase();
  const path = req.path;
  const query = Object.keys(req.query)
    .sort()
    .map((key) => `${key}=${req.query[key]}`)
    .join('&');

  const apiVersion = (req as any).apiVersion || '';

  if (query) {
    return `${method}:${path}:${query}:${apiVersion}`;
  }

  return `${method}:${path}:${apiVersion}`;
}

/**
 * Initialize distributed caching middleware stack
 */
export function initializeDistributedCaching(
  cacheManager: DistributedCacheManager,
  redisClient?: RedisClient,
) {
  return [
    redisClient ? redisConnectionMiddleware(redisClient) : ((_r: Request, _: Response, n: NextFunction) => n()),
    responseCacheMiddleware({ cacheManager }),
    cacheInvalidationMiddleware(cacheManager),
    cacheStatsMiddleware(cacheManager),
  ];
}
