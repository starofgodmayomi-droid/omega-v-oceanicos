import {
  SlidingWindowRateLimiter,
  TokenBucket,
  TieredRateLimiter,
  RateLimitStatus,
} from '../rate-limiter';

describe('Rate Limiting System', () => {
  describe('RateLimiter - Sliding Window', () => {
    let limiter: SlidingWindowRateLimiter;

    beforeEach(() => {
      limiter = new SlidingWindowRateLimiter({
        maxRequests: 10,
        windowMs: 1000,
      });
    });

    it('should allow requests within limit', () => {
      for (let i = 0; i < 10; i++) {
        const status = limiter.checkLimit('user-1');
        expect(status.isLimited).toBe(false);
      }
    });

    it('should reject requests exceeding limit', () => {
      for (let i = 0; i < 10; i++) {
        limiter.checkLimit('user-1');
      }

      const status = limiter.checkLimit('user-1');
      expect(status.isLimited).toBe(true);
    });

    it('should track remaining requests', () => {
      for (let i = 0; i < 5; i++) {
        const status = limiter.checkLimit('user-1');
        expect(status.remaining).toBe(10 - (i + 1));
      }
    });

    it('should return correct limit information', () => {
      const status = limiter.checkLimit('user-1');

      expect(status.limit).toBe(10);
      expect(status.remaining).toBe(9);
      expect(status.resetAt).toBeDefined();
      expect(status.resetAt).toBeGreaterThan(Date.now());
    });

    it('should track multiple users independently', () => {
      for (let i = 0; i < 10; i++) {
        limiter.checkLimit('user-1');
      }

      expect(limiter.checkLimit('user-1').isLimited).toBe(true);
      expect(limiter.checkLimit('user-2').isLimited).toBe(false);
    });

    it('should reset limit for specific identifier', () => {
      for (let i = 0; i < 10; i++) {
        limiter.checkLimit('user-1');
      }

      expect(limiter.checkLimit('user-1').isLimited).toBe(true);

      limiter.reset('user-1');
      expect(limiter.checkLimit('user-1').isLimited).toBe(false);
    });

    it('should reset all limits', () => {
      for (let i = 0; i < 10; i++) {
        limiter.checkLimit('user-1');
        limiter.checkLimit('user-2');
      }

      limiter.resetAll();

      expect(limiter.checkLimit('user-1').isLimited).toBe(false);
      expect(limiter.checkLimit('user-2').isLimited).toBe(false);
    });

    it('should get current status without consuming', () => {
      limiter.checkLimit('user-1');
      limiter.checkLimit('user-1');

      const status = limiter.getStatus('user-1');
      expect(status.remaining).toBe(8);

      const status2 = limiter.getStatus('user-1');
      expect(status2.remaining).toBe(8);
    });

    it('should track statistics', () => {
      for (let i = 0; i < 5; i++) {
        limiter.checkLimit('user-1');
      }

      for (let i = 0; i < 10; i++) {
        limiter.checkLimit('user-1');
      }

      const stats = limiter.getStats();
      expect(stats.totalRequests).toBe(15);
      expect(stats.totalRejected).toBe(5);
      expect(stats.activeKeys).toBe(1);
      expect(stats.rejectionRate).toBeCloseTo(5 / 15, 2);
    });

    it('should reset window after expiration', (done) => {
      const fastLimiter = new SlidingWindowRateLimiter({
        maxRequests: 5,
        windowMs: 100,
      });

      for (let i = 0; i < 5; i++) {
        fastLimiter.checkLimit('user-1');
      }

      expect(fastLimiter.checkLimit('user-1').isLimited).toBe(true);

      setTimeout(() => {
        const status = fastLimiter.checkLimit('user-1');
        expect(status.isLimited).toBe(false);
        expect(status.remaining).toBe(4);
        done();
      }, 150);
    }, 5000);

    it('should support custom key generator', () => {
      const limiter2 = new SlidingWindowRateLimiter({
        maxRequests: 5,
        windowMs: 1000,
        keyGenerator: (id) => `api_${id}`,
      });

      for (let i = 0; i < 5; i++) {
        limiter2.checkLimit('user-1');
      }

      expect(limiter2.checkLimit('user-1').isLimited).toBe(true);
    });

    it('should handle zero identifier gracefully', () => {
      const status = limiter.checkLimit('');
      expect(status).toBeDefined();
      expect(status.isLimited).toBe(false);
    });

    it('should handle concurrent identifier requests', () => {
      const users = ['user-1', 'user-2', 'user-3', 'user-4', 'user-5'];

      for (let i = 0; i < 5; i++) {
        for (const user of users) {
          limiter.checkLimit(user);
        }
      }

      const stats = limiter.getStats();
      expect(stats.totalRequests).toBe(25);
      expect(stats.activeKeys).toBe(5);
    });
  });

  describe('TokenBucket', () => {
    let bucket: TokenBucket;

    beforeEach(() => {
      bucket = new TokenBucket({
        capacity: 100,
        refillRate: 10,
        refillIntervalMs: 1000,
      });
    });

    it('should allow consumption up to capacity', () => {
      const status = bucket.consume('user-1', 50);
      expect(status.isLimited).toBe(false);
      expect(status.remaining).toBe(50);
    });

    it('should reject consumption exceeding tokens', () => {
      bucket.consume('user-1', 100);
      const status = bucket.consume('user-1', 1);
      expect(status.isLimited).toBe(true);
    });

    it('should refill tokens over time', (done) => {
      bucket.consume('user-1', 100);
      expect(bucket.getStatus('user-1').isLimited).toBe(true);

      setTimeout(() => {
        const status = bucket.consume('user-1', 1);
        expect(status.isLimited).toBe(false);
        done();
      }, 1100);
    }, 5000);

    it('should track active buckets', () => {
      bucket.consume('user-1', 10);
      bucket.consume('user-2', 10);
      bucket.consume('user-3', 10);

      const stats = bucket.getStats();
      expect(stats.activeKeys).toBe(3);
    });

    it('should reset individual bucket', () => {
      bucket.consume('user-1', 100);
      expect(bucket.getStatus('user-1').isLimited).toBe(true);

      bucket.reset('user-1');
      const status = bucket.getStatus('user-1');
      expect(status.remaining).toBe(100);
      expect(status.isLimited).toBe(false);
    });

    it('should reset all buckets', () => {
      bucket.consume('user-1', 100);
      bucket.consume('user-2', 100);

      bucket.resetAll();

      expect(bucket.getStatus('user-1').isLimited).toBe(false);
      expect(bucket.getStatus('user-2').isLimited).toBe(false);
    });

    it('should track rejection statistics', () => {
      for (let i = 0; i < 15; i++) {
        bucket.consume('user-1', 10);
      }

      const stats = bucket.getStats();
      expect(stats.totalRequests).toBe(15);
      expect(stats.totalRejected).toBeGreaterThan(0);
      expect(stats.rejectionRate).toBeGreaterThan(0);
    });

    it('should allow burst traffic up to capacity', () => {
      const statuses = [];
      for (let i = 0; i < 6; i++) {
        statuses.push(bucket.consume('user-1', 20));
      }

      expect(statuses[0].isLimited).toBe(false);
      expect(statuses[4].isLimited).toBe(false);
      expect(statuses[5].isLimited).toBe(true);
    });

    it('should handle multiple tokens consumption', () => {
      bucket.consume('user-1', 30);
      bucket.consume('user-1', 40);

      const status = bucket.getStatus('user-1');
      expect(status.remaining).toBe(30);
    });

    it('should track consumption patterns', () => {
      const user = 'user-1';
      const statuses: RateLimitStatus[] = [];

      for (let i = 0; i < 12; i++) {
        statuses.push(bucket.consume(user, 10));
      }

      expect(statuses.some((s) => s.isLimited)).toBe(true);
    });
  });

  describe('TieredRateLimiter', () => {
    let limiter: TieredRateLimiter;

    beforeEach(() => {
      limiter = new TieredRateLimiter([
        { name: 'free', maxRequests: 10, windowMs: 60000 },
        { name: 'pro', maxRequests: 100, windowMs: 60000 },
        { name: 'enterprise', maxRequests: 1000, windowMs: 60000 },
      ]);
    });

    it('should apply default tier limits', () => {
      for (let i = 0; i < 10; i++) {
        const status = limiter.checkLimit('user-1', 'free');
        expect(status.isLimited).toBe(false);
      }

      const status = limiter.checkLimit('user-1', 'free');
      expect(status.isLimited).toBe(true);
    });

    it('should set user tier', () => {
      limiter.setUserTier('user-1', 'pro');
      expect(limiter.getUserTier('user-1')).toBe('pro');
    });

    it('should apply user tier limits', () => {
      limiter.setUserTier('user-1', 'pro');

      for (let i = 0; i < 100; i++) {
        const status = limiter.checkLimit('user-1');
        expect(status.isLimited).toBe(false);
      }

      const status = limiter.checkLimit('user-1');
      expect(status.isLimited).toBe(true);
    });

    it('should support different tiers for different users', () => {
      limiter.setUserTier('user-1', 'free');
      limiter.setUserTier('user-2', 'pro');

      for (let i = 0; i < 10; i++) {
        limiter.checkLimit('user-1');
      }

      expect(limiter.checkLimit('user-1').isLimited).toBe(true);
      expect(limiter.checkLimit('user-2').isLimited).toBe(false);
    });

    it('should reject unknown tier', () => {
      expect(() => {
        limiter.setUserTier('user-1', 'unknown');
      }).toThrow();
    });

    it('should return statistics per tier', () => {
      for (let i = 0; i < 5; i++) {
        limiter.checkLimit('user-1', 'free');
        limiter.checkLimit('user-2', 'pro');
      }

      const stats = limiter.getStats();
      expect(stats.free).toBeDefined();
      expect(stats.pro).toBeDefined();
      expect(stats.enterprise).toBeDefined();
    });

    it('should handle tier upgrades', () => {
      for (let i = 0; i < 10; i++) {
        limiter.checkLimit('user-1', 'free');
      }

      expect(limiter.checkLimit('user-1', 'free').isLimited).toBe(true);

      limiter.setUserTier('user-1', 'pro');
      expect(limiter.checkLimit('user-1').isLimited).toBe(false);
    });

    it('should use default tier when user tier not set', () => {
      for (let i = 0; i < 10; i++) {
        limiter.checkLimit('user-1', 'free');
      }

      expect(limiter.checkLimit('user-1', 'free').isLimited).toBe(true);
    });

    it('should enforce tier limits independently', () => {
      limiter.setUserTier('user-1', 'free');
      limiter.setUserTier('user-2', 'enterprise');

      for (let i = 0; i < 100; i++) {
        limiter.checkLimit('user-1');
        limiter.checkLimit('user-2');
      }

      expect(limiter.checkLimit('user-1').isLimited).toBe(true);
      expect(limiter.checkLimit('user-2').isLimited).toBe(false);
    });
  });

  describe('Rate Limiting Integration Scenarios', () => {
    it('should handle API endpoint rate limiting', () => {
      const limiter = new SlidingWindowRateLimiter({
        maxRequests: 30,
        windowMs: 60000,
      });

      for (let i = 0; i < 30; i++) {
        const status = limiter.checkLimit('api-client-1');
        expect(status.isLimited).toBe(false);
      }

      expect(limiter.checkLimit('api-client-1').isLimited).toBe(true);
    });

    it('should handle multi-user scenario', () => {
      const limiter = new SlidingWindowRateLimiter({
        maxRequests: 10,
        windowMs: 1000,
      });

      const users = Array.from({ length: 5 }, (_, i) => `user-${i + 1}`);

      for (let i = 0; i < 3; i++) {
        for (const user of users) {
          limiter.checkLimit(user);
        }
      }

      const stats = limiter.getStats();
      expect(stats.totalRequests).toBe(15);
      expect(stats.activeKeys).toBe(5);
    });

    it('should handle burst traffic with token bucket', () => {
      const bucket = new TokenBucket({
        capacity: 100,
        refillRate: 1,
        refillIntervalMs: 100,
      });

      const burst = [];
      for (let i = 0; i < 12; i++) {
        burst.push(bucket.consume('burst-user', 10));
      }

      expect(burst[0].isLimited).toBe(false);
      expect(burst.some((s) => s.isLimited)).toBe(true);
    });

    it('should support per-endpoint tier limits', () => {
      const limiter = new TieredRateLimiter([
        { name: 'read-heavy', maxRequests: 1000, windowMs: 60000 },
        { name: 'write-heavy', maxRequests: 100, windowMs: 60000 },
      ]);

      limiter.setUserTier('user-1', 'read-heavy');

      for (let i = 0; i < 500; i++) {
        limiter.checkLimit('user-1');
      }

      expect(limiter.checkLimit('user-1').isLimited).toBe(false);
    });

    it('should track rate limit across window resets', (done) => {
      const limiter = new SlidingWindowRateLimiter({
        maxRequests: 5,
        windowMs: 100,
      });

      for (let i = 0; i < 5; i++) {
        limiter.checkLimit('user-1');
      }

      expect(limiter.checkLimit('user-1').isLimited).toBe(true);

      setTimeout(() => {
        const status = limiter.checkLimit('user-1');
        expect(status.isLimited).toBe(false);
        expect(status.remaining).toBe(4);
        done();
      }, 150);
    }, 5000);

    it('should handle combined rate limit scenarios', () => {
      const globalLimiter = new SlidingWindowRateLimiter({
        maxRequests: 1000,
        windowMs: 60000,
      });

      const tieredLimiter = new TieredRateLimiter([
        { name: 'free', maxRequests: 10, windowMs: 60000 },
        { name: 'paid', maxRequests: 100, windowMs: 60000 },
      ]);

      tieredLimiter.setUserTier('user-1', 'free');

      for (let i = 0; i < 10; i++) {
        globalLimiter.checkLimit('global');
        tieredLimiter.checkLimit('user-1');
      }

      expect(globalLimiter.getStats().totalRequests).toBe(10);
      expect(tieredLimiter.checkLimit('user-1').isLimited).toBe(true);
    });

    it('should handle distributed rate limiting with key prefixes', () => {
      const limiter = new SlidingWindowRateLimiter({
        maxRequests: 100,
        windowMs: 60000,
        keyGenerator: (id) => `rate_limit:${id}`,
      });

      for (let i = 0; i < 50; i++) {
        limiter.checkLimit('user-1');
      }

      const stats = limiter.getStats();
      expect(stats.totalRequests).toBe(50);
      expect(stats.totalRejected).toBe(0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty identifier', () => {
      const limiter = new SlidingWindowRateLimiter({ maxRequests: 10 });
      const status = limiter.checkLimit('');
      expect(status.isLimited).toBe(false);
    });

    it('should handle very large request counts', () => {
      const limiter = new SlidingWindowRateLimiter({ maxRequests: 1000000 });

      for (let i = 0; i < 100000; i++) {
        limiter.checkLimit('user-1');
      }

      const stats = limiter.getStats();
      expect(stats.totalRequests).toBe(100000);
    });

    it('should handle bucket with small capacity', () => {
      const bucket = new TokenBucket({ capacity: 1 });
      bucket.consume('user-1', 1);
      const status = bucket.consume('user-1', 1);
      expect(status.isLimited).toBe(true);
    });

    it('should handle rapid successive requests', () => {
      const limiter = new SlidingWindowRateLimiter({ maxRequests: 100, windowMs: 1000 });

      for (let i = 0; i < 200; i++) {
        limiter.checkLimit('user-1');
      }

      const stats = limiter.getStats();
      expect(stats.totalRequests).toBe(200);
      expect(stats.totalRejected).toBeGreaterThan(0);
    });

    it('should handle key generator that returns same value', () => {
      const limiter = new SlidingWindowRateLimiter({
        maxRequests: 10,
        keyGenerator: () => 'global',
      });

      for (let i = 0; i < 5; i++) {
        limiter.checkLimit('user-1');
        limiter.checkLimit('user-2');
      }

      const status = limiter.checkLimit('user-3');
      expect(status.isLimited).toBe(true);
      expect(status.remaining).toBe(0);
    });

    it('should handle tiered limiter with single tier', () => {
      const limiter = new TieredRateLimiter([{ name: 'default', maxRequests: 10, windowMs: 1000 }]);

      for (let i = 0; i < 10; i++) {
        limiter.checkLimit('user-1', 'default');
      }

      expect(limiter.checkLimit('user-1', 'default').isLimited).toBe(true);
    });
  });
});
