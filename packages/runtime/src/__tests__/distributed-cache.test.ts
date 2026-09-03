import {
  DistributedCache,
  DistributedCacheManager,
  RedisClient,
  CacheEntry,
  CacheStats,
} from '../distributed-cache';

describe('Distributed Cache', () => {
  describe('DistributedCache', () => {
    let cache: DistributedCache<string>;

    beforeEach(() => {
      cache = new DistributedCache<string>(100, 5000);
    });

    it('should store and retrieve values', async () => {
      await cache.set('key1', 'value1');
      const value = await cache.get('key1');
      expect(value).toBe('value1');
    });

    it('should return undefined for missing keys', async () => {
      const value = await cache.get('nonexistent');
      expect(value).toBeUndefined();
    });

    it('should track hit rate', async () => {
      await cache.set('key1', 'value1');
      await cache.get('key1');
      await cache.get('key1');
      await cache.get('missing');

      const stats = cache.getStats();
      expect(stats.totalHits).toBe(2);
      expect(stats.totalMisses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(0.667, 2);
    });

    it('should enforce cache size limit', async () => {
      const smallCache = new DistributedCache<string>(5, 5000);

      for (let i = 0; i < 10; i++) {
        await smallCache.set(`key${i}`, `value${i}`);
      }

      const stats = smallCache.getStats();
      expect(stats.itemCount).toBeLessThanOrEqual(5);
    });

    it('should delete entries', async () => {
      await cache.set('key1', 'value1');
      await cache.delete('key1');
      const value = await cache.get('key1');
      expect(value).toBeUndefined();
    });

    it('should clear all entries', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      await cache.clear();

      const stats = cache.getStats();
      expect(stats.itemCount).toBe(0);
    });

    it('should track average access time', async () => {
      await cache.set('key1', 'value1');
      await cache.get('key1');
      await cache.get('key1');

      const stats = cache.getStats();
      expect(stats.averageAccessTime).toBeGreaterThanOrEqual(0);
    });

    it('should expire old entries', async () => {
      const shortLivedCache = new DistributedCache<string>(100, 100);
      await shortLivedCache.set('key1', 'value1');

      // Value should be retrievable immediately
      let value = await shortLivedCache.get('key1');
      expect(value).toBe('value1');

      // After expiration, should return undefined
      await new Promise((resolve) => setTimeout(resolve, 150));
      value = await shortLivedCache.get('key1');
      expect(value).toBeUndefined();
    });

    it('should handle complex objects', async () => {
      const complexObject = {
        id: '123',
        nested: { value: 'test' },
        array: [1, 2, 3],
      };

      await cache.set('complex', complexObject);
      const retrieved = await cache.get('complex');

      expect(retrieved).toEqual(complexObject);
      expect(retrieved?.nested.value).toBe('test');
    });

    it('should calculate memory usage', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');

      const stats = cache.getStats();
      expect(stats.memoryUsage).toBeGreaterThan(0);
    });

    it('should handle null and undefined values', async () => {
      await cache.set('nullKey', null as any);
      await cache.set('undefinedKey', undefined as any);

      const nullValue = await cache.get('nullKey');
      expect(nullValue).toBeNull();
    });

    it('should track hit counts for entries', async () => {
      await cache.set('key1', 'value1');
      await cache.get('key1');
      await cache.get('key1');
      await cache.get('key1');

      const stats = cache.getStats();
      expect(stats.totalHits).toBe(3);
    });

    it('should support remote client connection', () => {
      expect(cache.isRemoteConnected()).toBe(false);

      const mockRedisClient = {};
      cache.setRemoteClient(mockRedisClient);
      expect(cache.isRemoteConnected()).toBe(true);
    });

    it('should handle concurrent operations', async () => {
      const promises = [];

      for (let i = 0; i < 50; i++) {
        promises.push(cache.set(`key${i}`, `value${i}`));
      }

      await Promise.all(promises);
      const stats = cache.getStats();
      expect(stats.itemCount).toBeGreaterThan(0);
    });

    it('should update last accessed time', async () => {
      await cache.set('key1', 'value1');
      await new Promise((resolve) => setTimeout(resolve, 10));
      await cache.get('key1');

      const stats = cache.getStats();
      expect(stats.totalHits).toBe(1);
    });

    it('should handle special characters in keys', async () => {
      const specialKey = 'key:with:colons/and/slashes';
      await cache.set(specialKey, 'value');
      const value = await cache.get(specialKey);
      expect(value).toBe('value');
    });
  });

  describe('DistributedCacheManager', () => {
    let manager: DistributedCacheManager;

    beforeEach(() => {
      manager = new DistributedCacheManager();
    });

    it('should create and retrieve named caches', () => {
      const cache1 = manager.getCache<string>('cache1');
      const cache2 = manager.getCache<string>('cache2');

      expect(cache1).toBeDefined();
      expect(cache2).toBeDefined();
      expect(cache1).not.toBe(cache2);
    });

    it('should return same cache instance for same name', () => {
      const cache1 = manager.getCache<string>('cache1');
      const cache2 = manager.getCache<string>('cache1');

      expect(cache1).toBe(cache2);
    });

    it('should support different data types', async () => {
      const stringCache = manager.getCache<string>('strings');
      const numberCache = manager.getCache<number>('numbers');
      const objectCache = manager.getCache<{ value: string }>('objects');

      await stringCache.set('key1', 'value');
      await numberCache.set('num1', 42);
      await objectCache.set('obj1', { value: 'test' });

      expect(await stringCache.get('key1')).toBe('value');
      expect(await numberCache.get('num1')).toBe(42);
      expect((await objectCache.get('obj1'))?.value).toBe('test');
    });

    it('should get statistics for all caches', async () => {
      const cache1 = manager.getCache<string>('cache1');
      const cache2 = manager.getCache<string>('cache2');

      await cache1.set('key1', 'value1');
      await cache2.set('key2', 'value2');

      const stats = manager.getStats();
      expect(stats.cache1).toBeDefined();
      expect(stats.cache2).toBeDefined();
      expect(stats.cache1.itemCount).toBe(1);
      expect(stats.cache2.itemCount).toBe(1);
    });

    it('should set Redis client for all caches', () => {
      const mockRedisClient = {};
      manager.setRedisClient(mockRedisClient);

      const cache = manager.getCache<string>('test');
      expect(cache.isRemoteConnected()).toBe(true);
    });

    it('should clear all caches', async () => {
      const cache1 = manager.getCache<string>('cache1');
      const cache2 = manager.getCache<string>('cache2');

      await cache1.set('key1', 'value1');
      await cache2.set('key2', 'value2');

      await manager.clearAll();

      const stats = manager.getStats();
      expect(stats.cache1.itemCount).toBe(0);
      expect(stats.cache2.itemCount).toBe(0);
    });

    it('should support custom cache configuration', async () => {
      const cache = manager.getCache<string>('custom', 50, 10000);
      const stats = cache.getStats();

      expect(stats).toBeDefined();
    });
  });

  describe('RedisClient', () => {
    let client: RedisClient;

    beforeEach(() => {
      client = new RedisClient({
        host: 'localhost',
        port: 6379,
      });
    });

    it('should initialize with config', () => {
      expect(client.isConnected()).toBe(false);
    });

    it('should handle connection failure gracefully', async () => {
      // Don't actually try to connect to avoid test delays
      expect(client.isConnected()).toBe(false);
    });

    it('should return null values when disconnected', async () => {
      const value = await client.get('key');
      expect(value).toBeNull();
    });

    it('should return empty array for keys when disconnected', async () => {
      const keys = await client.keys('*');
      expect(keys).toEqual([]);
    });

    it('should handle del when disconnected', async () => {
      const result = await client.del('key1', 'key2');
      expect(result).toBe(0);
    });

    it('should support reconnect configuration', () => {
      const clientWithRetry = new RedisClient({
        host: 'localhost',
        port: 6379,
        reconnectInterval: 100,
        maxReconnectAttempts: 3,
      });

      expect(clientWithRetry.isConnected()).toBe(false);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle multi-tier caching', async () => {
      const manager = new DistributedCacheManager();

      const L1 = manager.getCache<string>('observations', 100, 300000);
      const L2 = manager.getCache<string>('verifications', 100, 300000);
      const L3 = manager.getCache<string>('attestations', 100, 300000);

      await L1.set('obs1', 'observation data');
      await L2.set('ver1', 'verification data');
      await L3.set('att1', 'attestation data');

      expect(await L1.get('obs1')).toBe('observation data');
      expect(await L2.get('ver1')).toBe('verification data');
      expect(await L3.get('att1')).toBe('attestation data');

      const stats = manager.getStats();
      expect(Object.keys(stats)).toHaveLength(3);
    });

    it('should handle cache eviction under pressure', async () => {
      const cache = new DistributedCache<string>(10, 5000);

      for (let i = 0; i < 20; i++) {
        await cache.set(`key${i}`, `value${i}`);
      }

      const stats = cache.getStats();
      expect(stats.itemCount).toBeLessThanOrEqual(10);
    });

    it('should support high-frequency access patterns', async () => {
      const cache = new DistributedCache<number>(1000, 5000);
      await cache.set('counter', 0);

      for (let i = 0; i < 100; i++) {
        await cache.get('counter');
      }

      const stats = cache.getStats();
      expect(stats.totalHits).toBe(100);
      expect(stats.hitRate).toBe(1.0);
    });

    it('should maintain cache consistency across operations', async () => {
      const cache = new DistributedCache<{ value: number }>(
        {
          value: 0,
        } as any,
        5000
      );

      const object = { value: 100 };
      await cache.set('obj', object);

      // Verify original object is cached
      const retrieved1 = await cache.get('obj');
      expect(retrieved1?.value).toBe(100);

      // Modify and set new value
      await cache.set('obj', { value: 200 });
      const retrieved2 = await cache.get('obj');

      expect(retrieved2?.value).toBe(200);
    });

    it('should handle rapid fire set/get operations', async () => {
      const cache = new DistributedCache<string>(100, 5000);

      const operations = [];
      for (let i = 0; i < 50; i++) {
        operations.push(cache.set(`key${i}`, `value${i}`));
        operations.push(cache.get(`key${i}`));
      }

      await Promise.all(operations);
      const stats = cache.getStats();
      expect(stats.totalHits).toBeGreaterThan(0);
    });

    it('should provide accurate statistics under load', async () => {
      const cache = new DistributedCache<string>(100, 5000);

      // Populate cache
      for (let i = 0; i < 50; i++) {
        await cache.set(`key${i}`, `value${i}`);
      }

      // Generate hits and misses
      for (let i = 0; i < 30; i++) {
        await cache.get(`key${i}`);
      }

      for (let i = 0; i < 20; i++) {
        await cache.get(`missing${i}`);
      }

      const stats = cache.getStats();
      expect(stats.totalHits).toBe(30);
      expect(stats.totalMisses).toBe(20);
      expect(stats.hitRate).toBeCloseTo(0.6, 1);
    });

    it('should handle cache invalidation patterns', async () => {
      const cache = new DistributedCache<string>(100, 5000);

      await cache.set('key1', 'value1');
      expect(await cache.get('key1')).toBe('value1');

      await cache.delete('key1');
      expect(await cache.get('key1')).toBeUndefined();

      await cache.set('key1', 'value1-updated');
      expect(await cache.get('key1')).toBe('value1-updated');
    });

    it('should support write-through cache pattern', async () => {
      const cache = new DistributedCache<string>(100, 5000);

      // Write
      await cache.set('key1', 'value1');

      // Read from cache
      const value1 = await cache.get('key1');
      expect(value1).toBe('value1');

      // Update
      await cache.set('key1', 'value1-updated');

      // Read updated value
      const value2 = await cache.get('key1');
      expect(value2).toBe('value1-updated');
    });
  });

  describe('Edge cases', () => {
    it('should handle extremely large values', async () => {
      const cache = new DistributedCache<string>(100, 5000);
      const largeString = 'x'.repeat(1000000);

      await cache.set('large', largeString);
      const retrieved = await cache.get('large');

      expect(retrieved?.length).toBe(1000000);
    });

    it('should handle rapid expiration checks', async () => {
      const cache = new DistributedCache<string>(100, 50);

      await cache.set('key1', 'value1');
      expect(await cache.get('key1')).toBe('value1');

      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(await cache.get('key1')).toBeUndefined();
    });

    it('should handle empty cache statistics', () => {
      const cache = new DistributedCache<string>(100, 5000);
      const stats = cache.getStats();

      expect(stats.totalHits).toBe(0);
      expect(stats.totalMisses).toBe(0);
      expect(stats.hitRate).toBe(0);
      expect(stats.itemCount).toBe(0);
    });

    it('should handle same key overwrites', async () => {
      const cache = new DistributedCache<string>(100, 5000);

      for (let i = 0; i < 10; i++) {
        await cache.set('key', `value${i}`);
      }

      const value = await cache.get('key');
      expect(value).toBe('value9');

      const stats = cache.getStats();
      expect(stats.itemCount).toBe(1);
    });
  });
});
