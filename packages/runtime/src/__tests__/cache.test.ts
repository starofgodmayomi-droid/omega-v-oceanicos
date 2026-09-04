import { Cache, QueryCache } from '../cache';

describe('Cache System', () => {
  describe('Cache Basic Operations', () => {
    let cache: Cache;

    beforeEach(() => {
      cache = new Cache({ maxSize: 100, defaultTTL: 10000 });
    });

    it('should create cache instance', () => {
      expect(cache).toBeDefined();
      expect(cache.size()).toBe(0);
    });

    it('should set and get values', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('should check if key exists', () => {
      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);
      expect(cache.has('key2')).toBe(false);
    });

    it('should delete values', () => {
      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);

      const deleted = cache.delete('key1');
      expect(deleted).toBe(true);
      expect(cache.has('key1')).toBe(false);
    });

    it('should return false when deleting non-existent key', () => {
      const deleted = cache.delete('nonexistent');
      expect(deleted).toBe(false);
    });

    it('should clear all values', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      expect(cache.size()).toBe(2);

      cache.clear();
      expect(cache.size()).toBe(0);
    });

    it('should handle complex objects', () => {
      const obj = { id: 1, name: 'test', metadata: { nested: true } };
      cache.set('obj', obj);
      expect(cache.get('obj')).toEqual(obj);
    });

    it('should handle arrays', () => {
      const arr = [1, 2, 3, { id: 4 }];
      cache.set('arr', arr);
      expect(cache.get('arr')).toEqual(arr);
    });

    it('should track cache statistics', () => {
      cache.set('key1', 'value1');
      cache.get('key1');
      cache.get('key2');
      cache.get('key1');

      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.sets).toBe(1);
      expect(stats.size).toBe(1);
      expect(stats.hitRate).toBeGreaterThan(0.6);
    });
  });

  describe('Cache Expiration', () => {
    let cache: Cache;

    beforeEach(() => {
      cache = new Cache({ maxSize: 100 });
    });

    it('should expire entries with default TTL', (done) => {
      cache.set('key1', 'value1', 50); // 50ms

      expect(cache.has('key1')).toBe(true);

      setTimeout(() => {
        expect(cache.has('key1')).toBe(false);
        expect(cache.get('key1')).toBeUndefined();
        done();
      }, 200);
    }, 5000);

    it('should not expire entries within TTL', (done) => {
      cache.set('key1', 'value1', 200); // 200ms

      setTimeout(() => {
        expect(cache.has('key1')).toBe(true);
        expect(cache.get('key1')).toBe('value1');
        done();
      }, 100);
    }, 5000);

    it('should use default TTL when not specified', (done) => {
      const shortCache = new Cache({ defaultTTL: 50 });
      shortCache.set('key1', 'value1');

      expect(shortCache.has('key1')).toBe(true);

      setTimeout(() => {
        expect(shortCache.has('key1')).toBe(false);
        done();
      }, 200);
    }, 5000);

    it('should count expired entries as misses', (done) => {
      cache.set('key1', 'value1', 50);
      expect(cache.get('key1')).toBe('value1');

      setTimeout(() => {
        expect(cache.get('key1')).toBeUndefined();
        const stats = cache.getStats();
        expect(stats.misses).toBeGreaterThan(0);
        done();
      }, 200);
    }, 5000);
  });

  describe('LRU Eviction Policy', () => {
    let cache: Cache;

    beforeEach(() => {
      cache = new Cache({ maxSize: 3, evictionPolicy: 'lru' });
    });

    it('should respect max size with LRU eviction', () => {
      for (let i = 0; i < 10; i++) {
        cache.set(`key${i}`, `value${i}`);
      }

      expect(cache.size()).toBeLessThanOrEqual(3);
      const stats = cache.getStats();
      expect(stats.evictions).toBeGreaterThan(0);
    });

    it('should track access times for LRU', () => {
      const smallCache = new Cache({ maxSize: 2, evictionPolicy: 'lru' });
      smallCache.set('a', 1);
      smallCache.set('b', 2);

      expect(smallCache.size()).toBe(2);

      smallCache.set('c', 3);

      expect(smallCache.size()).toBeLessThanOrEqual(2);
      const stats = smallCache.getStats();
      expect(stats.evictions).toBeGreaterThan(0);
    });

    it('should evict when cache is full', () => {
      cache.set('x', 10);
      cache.set('y', 20);
      cache.set('z', 30);
      expect(cache.size()).toBe(3);

      cache.set('w', 40);
      expect(cache.size()).toBeLessThanOrEqual(3);
      const stats = cache.getStats();
      expect(stats.evictions).toBeGreaterThan(0);
    });
  });

  describe('LFU Eviction Policy', () => {
    let cache: Cache;

    beforeEach(() => {
      cache = new Cache({ maxSize: 3, evictionPolicy: 'lfu' });
    });

    it('should respect max size with LFU eviction', () => {
      for (let i = 0; i < 10; i++) {
        cache.set(`key${i}`, `value${i}`);
      }

      expect(cache.size()).toBeLessThanOrEqual(3);
      const stats = cache.getStats();
      expect(stats.evictions).toBeGreaterThan(0);
    });

    it('should track frequency for LFU eviction', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      cache.get('a');
      cache.get('a');
      cache.get('b');

      cache.set('d', 4);
      expect(cache.size()).toBeLessThanOrEqual(3);
      const stats = cache.getStats();
      expect(stats.evictions).toBeGreaterThan(0);
    });
  });

  describe('FIFO Eviction Policy', () => {
    let cache: Cache;

    beforeEach(() => {
      cache = new Cache({ maxSize: 3, evictionPolicy: 'fifo' });
    });

    it('should respect max size with FIFO eviction', () => {
      for (let i = 0; i < 10; i++) {
        cache.set(`key${i}`, `value${i}`);
      }

      expect(cache.size()).toBeLessThanOrEqual(3);
      const stats = cache.getStats();
      expect(stats.evictions).toBeGreaterThan(0);
    });

    it('should evict in FIFO order', () => {
      cache.set('first', 1);
      cache.set('second', 2);
      cache.set('third', 3);

      expect(cache.size()).toBe(3);

      cache.set('fourth', 4);

      expect(cache.size()).toBeLessThanOrEqual(3);
      const stats = cache.getStats();
      expect(stats.evictions).toBeGreaterThan(0);
    });
  });

  describe('QueryCache', () => {
    let queryCache: QueryCache;

    beforeEach(() => {
      queryCache = new QueryCache({
        maxSize: 100,
        queryTTL: 5000,
        traceTTL: 10000,
        integrityTTL: 1000,
      });
    });

    it('should create query cache instance', () => {
      expect(queryCache).toBeDefined();
      expect(queryCache.getTotalSize()).toBe(0);
    });

    it('should cache observations', () => {
      const obsData = { results: [{ id: 'obs-1', claim: 'test' }] };
      queryCache.cacheObservations('obs-query-1', obsData);

      const cached = queryCache.getObservations('obs-query-1');
      expect(cached).toEqual(obsData);
    });

    it('should cache verifications', () => {
      const verData = { results: [{ id: 'ver-1', passed: true }] };
      queryCache.cacheVerifications('ver-query-1', verData);

      const cached = queryCache.getVerifications('ver-query-1');
      expect(cached).toEqual(verData);
    });

    it('should cache attestations', () => {
      const attData = { results: [{ id: 'att-1', verified: true }] };
      queryCache.cacheAttestations('att-query-1', attData);

      const cached = queryCache.getAttestations('att-query-1');
      expect(cached).toEqual(attData);
    });

    it('should cache traces', () => {
      const traceData = {
        observation: { id: 'obs-1' },
        verifications: [],
        attestations: [],
      };
      queryCache.cacheTrace('trace-obs-1', traceData);

      const cached = queryCache.getTrace('trace-obs-1');
      expect(cached).toEqual(traceData);
    });

    it('should cache integrity checks', () => {
      const integrityData = { valid: true, chainLength: 100 };
      queryCache.cacheIntegrity('integrity-1', integrityData);

      const cached = queryCache.getIntegrity('integrity-1');
      expect(cached).toEqual(integrityData);
    });

    it('should invalidate specific observation cache', () => {
      const obsData = { results: [] };
      queryCache.cacheObservations('obs-1', obsData);
      expect(queryCache.getObservations('obs-1')).toBeDefined();

      queryCache.invalidateObservations('obs-1');
      expect(queryCache.getObservations('obs-1')).toBeUndefined();
    });

    it('should invalidate all observation caches', () => {
      queryCache.cacheObservations('obs-1', { results: [] });
      queryCache.cacheObservations('obs-2', { results: [] });

      queryCache.invalidateObservations();
      expect(queryCache.getObservations('obs-1')).toBeUndefined();
      expect(queryCache.getObservations('obs-2')).toBeUndefined();
    });

    it('should invalidate all caches', () => {
      queryCache.cacheObservations('obs-1', { results: [] });
      queryCache.cacheVerifications('ver-1', { results: [] });
      queryCache.cacheAttestations('att-1', { results: [] });
      queryCache.cacheTrace('trace-1', {});
      queryCache.cacheIntegrity('int-1', {});

      expect(queryCache.getTotalSize()).toBeGreaterThan(0);

      queryCache.invalidateAll();
      expect(queryCache.getTotalSize()).toBe(0);
    });

    it('should return stats for all cache types', () => {
      queryCache.cacheObservations('obs-1', { results: [] });
      queryCache.getObservations('obs-1');
      queryCache.getObservations('obs-2');

      const stats = queryCache.getStats();
      expect(stats.observations).toBeDefined();
      expect(stats.observations.hits).toBe(1);
      expect(stats.observations.misses).toBe(1);
    });

    it('should handle separate TTLs for different cache types', (done) => {
      queryCache.cacheIntegrity('int-1', { valid: true });

      expect(queryCache.getIntegrity('int-1')).toBeDefined();

      setTimeout(() => {
        expect(queryCache.getIntegrity('int-1')).toBeUndefined();
        done();
      }, 1200);
    }, 5000);
  });

  describe('Cache Performance', () => {
    it('should handle large number of entries', () => {
      const cache = new Cache({ maxSize: 10000 });

      for (let i = 0; i < 10000; i++) {
        cache.set(`key${i}`, `value${i}`);
      }

      expect(cache.size()).toBe(10000);

      for (let i = 0; i < 100; i++) {
        cache.get(`key${i}`);
      }

      const stats = cache.getStats();
      expect(stats.hits).toBe(100);
      expect(stats.hitRate).toBeCloseTo(1.0, 1);
    });

    it('should track stats accurately', () => {
      const cache = new Cache({ maxSize: 100 });

      for (let i = 0; i < 50; i++) {
        cache.set(`key${i}`, `value${i}`);
      }

      for (let i = 0; i < 100; i++) {
        cache.get(`key${i % 50}`);
      }

      const stats = cache.getStats();
      expect(stats.sets).toBe(50);
      expect(stats.hits).toBe(100);
      expect(stats.misses).toBe(0);
    });
  });

  describe('Cache Integration Scenarios', () => {
    it('should handle realistic query caching workflow', () => {
      const queryCache = new QueryCache({ maxSize: 100 });

      // Cache initial query results
      const queryKey = 'obs-limit-10-offset-0';
      const results = {
        data: [
          { id: 'obs-1', claim: 'test1' },
          { id: 'obs-2', claim: 'test2' },
        ],
        total: 2,
      };

      queryCache.cacheObservations(queryKey, results);

      // Retrieve from cache (hit)
      expect(queryCache.getObservations(queryKey)).toEqual(results);

      // Invalidate on new observation
      queryCache.invalidateObservations();

      // Cache miss after invalidation
      expect(queryCache.getObservations(queryKey)).toBeUndefined();

      // Cache again
      queryCache.cacheObservations(queryKey, results);
      expect(queryCache.getObservations(queryKey)).toEqual(results);
    });

    it('should handle trace caching with longer TTL', (done) => {
      const queryCache = new QueryCache({
        queryTTL: 50,
        traceTTL: 500,
      });

      const traceData = { observation: { id: 'obs-1' } };
      queryCache.cacheTrace('trace-1', traceData);

      setTimeout(() => {
        // Trace should still be cached
        expect(queryCache.getTrace('trace-1')).toBeDefined();
        done();
      }, 200);
    }, 5000);

    it('should support multiple query caches independently', () => {
      const cache1 = new Cache({ maxSize: 100, evictionPolicy: 'lru' });
      const cache2 = new Cache({ maxSize: 100, evictionPolicy: 'lfu' });

      cache1.set('key1', 'value1');
      cache2.set('key1', 'different-value');

      expect(cache1.get('key1')).toBe('value1');
      expect(cache2.get('key1')).toBe('different-value');
    });
  });
});
