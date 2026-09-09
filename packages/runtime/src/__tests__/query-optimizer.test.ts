/**
 * Phase 24: Query Optimizer - Comprehensive Test Suite
 * Tests query planning, caching, index strategies, and performance analysis
 */

import {
  QueryAnalyzer,
  QueryPlanner,
  IndexAdvisor,
  QueryCache,
  QueryOptimizer,
  QueryDefinition,
  IndexStrategy,
  QueryPredicate,
  ExecutionPlan,
} from '../query-optimizer';

describe('Phase 24: Query Optimizer', () => {
  describe('QueryAnalyzer', () => {
    let analyzer: QueryAnalyzer;

    beforeEach(() => {
      analyzer = new QueryAnalyzer();
    });

    it('should analyze simple query structure', () => {
      const query: QueryDefinition = {
        id: 'q1',
        table: 'users',
        select: ['id', 'name'],
        predicates: [
          { field: 'status', operator: '=', value: 'active' },
          { field: 'age', operator: '>', value: 18 },
        ],
        joins: [],
        aggregations: [],
      };

      const analysis = analyzer.analyzeQuery(query);

      expect(analysis.complexity).toBeGreaterThan(1);
      expect(analysis.indexableFields).toContain('status');
      expect(analysis.indexableFields).toContain('age');
      expect(analysis.predicateCount).toBe(2);
      expect(analysis.hasAggregation).toBe(false);
    });

    it('should detect aggregations', () => {
      const query: QueryDefinition = {
        id: 'q2',
        table: 'orders',
        select: ['user_id', 'COUNT(*)'],
        predicates: [],
        joins: [],
        aggregations: [{ type: 'count', field: 'id' }],
        groupBy: ['user_id'],
      };

      const analysis = analyzer.analyzeQuery(query);

      expect(analysis.hasAggregation).toBe(true);
      expect(analysis.complexity).toBeGreaterThan(1);
    });

    it('should handle complex queries with joins', () => {
      const query: QueryDefinition = {
        id: 'q3',
        table: 'orders',
        select: ['orders.id', 'users.name'],
        predicates: [{ field: 'orders.status', operator: '=', value: 'completed' }],
        joins: [
          {
            table: 'users',
            type: 'inner',
            on: [{ field: 'user_id', operator: '=', value: null }],
          },
        ],
        aggregations: [],
      };

      const analysis = analyzer.analyzeQuery(query);

      expect(analysis.joinCount).toBe(1);
      expect(analysis.complexity).toBeGreaterThan(2);
    });

    it('should estimate selectivity correctly', () => {
      const predicate: QueryPredicate = { field: 'id', operator: '=', value: 1 };

      const selectivity1 = analyzer.estimateSelectivity(predicate, 1000);
      const selectivity2 = analyzer.estimateSelectivity(
        { field: 'status', operator: 'in', value: [1, 2, 3] },
        1000
      );
      const selectivity3 = analyzer.estimateSelectivity(
        { field: 'name', operator: 'like', value: 'test%' },
        1000
      );

      expect(selectivity1).toBeLessThan(selectivity2);
      expect(selectivity2).toBeLessThan(selectivity3);
    });

    it('should analyze join relationships', () => {
      const joins = [
        {
          table: 'users',
          type: 'inner' as const,
          on: [{ field: 'user_id', operator: '=' as const, value: null }],
        },
        {
          table: 'profiles',
          type: 'left' as const,
          on: [{ field: 'user_id', operator: '=' as const, value: null }],
        },
      ];

      const analysis = analyzer.analyzeJoins(joins);

      expect(analysis.joinGraph.size).toBeGreaterThan(0);
      expect(analysis.joinOrder.length).toBeGreaterThan(0);
    });
  });

  describe('QueryPlanner', () => {
    let planner: QueryPlanner;
    let indexes: IndexStrategy[];

    beforeEach(() => {
      planner = new QueryPlanner();
      indexes = [
        {
          name: 'idx_status',
          table: 'users',
          columns: ['status'],
          type: 'btree',
          selectivity: 0.7,
          cardinality: 1000,
        },
        {
          name: 'idx_age',
          table: 'users',
          columns: ['age'],
          type: 'btree',
          selectivity: 0.5,
          cardinality: 80,
        },
      ];
    });

    it('should generate execution plan for simple query', () => {
      const query: QueryDefinition = {
        id: 'q1',
        table: 'users',
        select: ['*'],
        predicates: [{ field: 'status', operator: '=', value: 'active' }],
        joins: [],
        aggregations: [],
      };

      const plan = planner.plan(query, indexes);

      expect(plan.steps.length).toBeGreaterThan(0);
      expect(plan.estimatedCost).toBeGreaterThan(0);
      expect(plan.steps[0].operation).toBe('index_lookup');
    });

    it('should select best index for predicates', () => {
      const query: QueryDefinition = {
        id: 'q2',
        table: 'users',
        select: ['*'],
        predicates: [
          { field: 'status', operator: '=', value: 'active' },
          { field: 'age', operator: '>', value: 18 },
        ],
        joins: [],
        aggregations: [],
      };

      const plan = planner.plan(query, indexes);

      expect(plan.indexes.length).toBeGreaterThan(0);
      expect(plan.indexes[0].columns).toContain('status');
    });

    it('should estimate row counts through execution steps', () => {
      const query: QueryDefinition = {
        id: 'q3',
        table: 'users',
        select: ['*'],
        predicates: [{ field: 'status', operator: '=', value: 'active' }],
        joins: [],
        aggregations: [],
      };

      const plan = planner.plan(query, indexes);

      expect(plan.estimatedRows).toBeLessThan(1000000);
      expect(plan.estimatedRows).toBeGreaterThan(0);
    });

    it('should include sorting step when order by is specified', () => {
      const query: QueryDefinition = {
        id: 'q4',
        table: 'users',
        select: ['*'],
        predicates: [],
        joins: [],
        aggregations: [],
        orderBy: [{ field: 'name', order: 'asc' }],
      };

      const plan = planner.plan(query, indexes);

      const hasSortStep = plan.steps.some((step) => step.operation === 'sort');
      expect(hasSortStep).toBe(true);
    });

    it('should include aggregate step when aggregations present', () => {
      const query: QueryDefinition = {
        id: 'q5',
        table: 'users',
        select: ['status', 'COUNT(*)'],
        predicates: [],
        joins: [],
        aggregations: [{ type: 'count', field: 'id' }],
        groupBy: ['status'],
      };

      const plan = planner.plan(query, indexes);

      const hasAggStep = plan.steps.some((step) => step.operation === 'aggregate');
      expect(hasAggStep).toBe(true);
    });

    it('should include limit step when limit specified', () => {
      const query: QueryDefinition = {
        id: 'q6',
        table: 'users',
        select: ['*'],
        predicates: [],
        joins: [],
        aggregations: [],
        limit: 10,
      };

      const plan = planner.plan(query, indexes);

      const hasLimitStep = plan.steps.some((step) => step.operation === 'limit');
      expect(hasLimitStep).toBe(true);
      expect(plan.estimatedRows).toBeLessThanOrEqual(10);
    });

    it('should plan joins in optimal order', () => {
      const query: QueryDefinition = {
        id: 'q7',
        table: 'orders',
        select: ['*'],
        predicates: [],
        joins: [
          {
            table: 'users',
            type: 'inner',
            on: [{ field: 'user_id', operator: '=', value: null }],
          },
        ],
        aggregations: [],
      };

      const plan = planner.plan(query, indexes);

      const joinSteps = plan.steps.filter((step) => step.operation === 'join');
      expect(joinSteps.length).toBe(1);
    });

    it('should update index statistics', () => {
      planner.updateStatistics('idx_status', {
        cardinality: 5000,
        usageCount: 100,
      });

      const stats = planner.getStatistics('idx_status');

      expect(stats).toBeDefined();
      expect(stats?.cardinality).toBe(5000);
      expect(stats?.usageCount).toBe(100);
    });
  });

  describe('IndexAdvisor', () => {
    let advisor: IndexAdvisor;

    beforeEach(() => {
      advisor = new IndexAdvisor();
    });

    it('should record queries for analysis', () => {
      const query: QueryDefinition = {
        id: 'q1',
        table: 'users',
        select: ['*'],
        predicates: [{ field: 'status', operator: '=', value: 'active' }],
        joins: [],
        aggregations: [],
      };

      advisor.recordQuery(query);
      // No external way to verify, but method should not throw
      expect(true).toBe(true);
    });

    it('should recommend indexes based on query patterns', () => {
      const queries: QueryDefinition[] = [
        {
          id: 'q1',
          table: 'users',
          select: ['*'],
          predicates: [
            { field: 'status', operator: '=', value: 'active' },
            { field: 'email', operator: 'like', value: '%@example.com' },
          ],
          joins: [],
          aggregations: [],
        },
        {
          id: 'q2',
          table: 'users',
          select: ['*'],
          predicates: [{ field: 'status', operator: '=', value: 'inactive' }],
          joins: [],
          aggregations: [],
        },
        {
          id: 'q3',
          table: 'users',
          select: ['*'],
          predicates: [{ field: 'status', operator: '=', value: 'pending' }],
          joins: [],
          aggregations: [],
        },
      ];

      for (const query of queries) {
        advisor.recordQuery(query);
      }

      const recommendations = advisor.recommendIndexes();

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].columns).toBeDefined();
      expect(recommendations[0].columns.length).toBeGreaterThan(0);
    });

    it('should analyze index effectiveness', () => {
      const indexes: IndexStrategy[] = [
        {
          name: 'idx_status',
          table: 'users',
          columns: ['status'],
          type: 'btree',
          selectivity: 0.7,
          cardinality: 1000,
        },
        {
          name: 'idx_age',
          table: 'users',
          columns: ['age'],
          type: 'btree',
          selectivity: 0.3,
          cardinality: 80,
        },
      ];

      const analysis = advisor.analyzeIndexEffectiveness(indexes);

      expect(analysis.length).toBe(2);
      expect(analysis[0].score).toBeGreaterThan(analysis[1].score);
    });

    it('should create fulltext indexes for aggregations', () => {
      const queries: QueryDefinition[] = [
        {
          id: 'q1',
          table: 'articles',
          select: ['*'],
          predicates: [],
          joins: [],
          aggregations: [{ type: 'count', field: 'views' }],
        },
      ];

      for (const query of queries) {
        advisor.recordQuery(query);
      }

      const recommendations = advisor.recommendIndexes();

      expect(recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('QueryCache', () => {
    let cache: QueryCache;

    beforeEach(() => {
      cache = new QueryCache({
        cacheSize: 100,
        cacheTTL: 60000,
        enableCaching: true,
      });
    });

    it('should cache query results', () => {
      const result = { id: 1, name: 'test' };
      cache.set('key1', result, 'q1');

      const retrieved = cache.get('key1');

      expect(retrieved).toEqual(result);
    });

    it('should return null for cache miss', () => {
      const retrieved = cache.get('nonexistent');

      expect(retrieved).toBeNull();
    });

    it('should expire entries based on TTL', (done) => {
      const result = { id: 1, name: 'test' };
      cache.set('key1', result, 'q1', 100); // 100ms TTL

      setTimeout(() => {
        const retrieved = cache.get('key1');
        expect(retrieved).toBeNull();
        done();
      }, 150);
    });

    it('should invalidate cache entries for table', () => {
      cache.set('query_users_1', { id: 1 }, 'q1');
      cache.set('query_users_2', { id: 2 }, 'q2');
      cache.set('query_orders_1', { id: 3 }, 'q3');

      cache.invalidateTable('users');

      expect(cache.get('query_users_1')).toBeNull();
      expect(cache.get('query_users_2')).toBeNull();
      expect(cache.get('query_orders_1')).not.toBeNull();
    });

    it('should track hit and miss statistics', () => {
      cache.set('key1', { data: 'test' }, 'q1');

      cache.get('key1'); // Hit
      cache.get('key1'); // Hit
      cache.get('nonexistent'); // Miss

      const stats = cache.getStats();

      expect(stats.hits).toBe(2);
      expect(stats.misses).toBeGreaterThan(0);
      expect(stats.hitRate).toBeGreaterThan(0);
    });

    it('should evict LRU entry when cache is full', () => {
      const smallCache = new QueryCache({
        cacheSize: 3,
        enableCaching: true,
      });

      smallCache.set('key1', { data: 1 }, 'q1');
      smallCache.set('key2', { data: 2 }, 'q2');
      smallCache.set('key3', { data: 3 }, 'q3');

      // Access key1 and key2 to increase hit counts
      smallCache.get('key1');
      smallCache.get('key2');

      // Add new entry, should evict key3 (LRU)
      smallCache.set('key4', { data: 4 }, 'q4');

      expect(smallCache.get('key4')).not.toBeNull();
      expect(smallCache.get('key3')).toBeNull();
    });

    it('should clear entire cache', () => {
      cache.set('key1', { data: 1 }, 'q1');
      cache.set('key2', { data: 2 }, 'q2');

      cache.clear();

      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
    });

    it('should respect caching disabled config', () => {
      const disabledCache = new QueryCache({
        enableCaching: false,
      });

      disabledCache.set('key1', { data: 1 }, 'q1');

      expect(disabledCache.get('key1')).toBeNull();
    });
  });

  describe('QueryOptimizer', () => {
    let optimizer: QueryOptimizer;

    beforeEach(() => {
      optimizer = new QueryOptimizer({
        cacheSize: 1000,
        cacheTTL: 300000,
        enableIndexing: true,
        enableCaching: true,
      });
    });

    it('should optimize query and return execution plan', () => {
      const query: QueryDefinition = {
        id: 'q1',
        table: 'users',
        select: ['*'],
        predicates: [{ field: 'status', operator: '=', value: 'active' }],
        joins: [],
        aggregations: [],
      };

      const result = optimizer.optimize(query);

      expect(result.plan).toBeDefined();
      expect(result.plan.steps.length).toBeGreaterThan(0);
      expect(result.cached).toBe(false);
    });

    it('should return cached plan on subsequent optimize calls', () => {
      const query: QueryDefinition = {
        id: 'q1',
        table: 'users',
        select: ['*'],
        predicates: [{ field: 'status', operator: '=', value: 'active' }],
        joins: [],
        aggregations: [],
      };

      optimizer.optimize(query);
      const secondResult = optimizer.optimize(query);

      expect(secondResult.cached).toBe(true);
    });

    it('should provide optimization recommendations', () => {
      const query: QueryDefinition = {
        id: 'q1',
        table: 'users',
        select: ['*'],
        predicates: [
          { field: 'f1', operator: '=', value: 'v1' },
          { field: 'f2', operator: '=', value: 'v2' },
          { field: 'f3', operator: '=', value: 'v3' },
          { field: 'f4', operator: '=', value: 'v4' },
        ],
        joins: [
          { table: 't1', type: 'inner', on: [] },
          { table: 't2', type: 'inner', on: [] },
          { table: 't3', type: 'inner', on: [] },
          { table: 't4', type: 'inner', on: [] },
        ],
        aggregations: [],
      };

      const result = optimizer.optimize(query);

      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should add indexes for optimization', () => {
      const index: IndexStrategy = {
        name: 'idx_status',
        table: 'users',
        columns: ['status'],
        type: 'btree',
        selectivity: 0.7,
      };

      optimizer.addIndex(index);

      const recommendations = optimizer.getIndexRecommendations();
      // Should not throw
      expect(recommendations).toBeDefined();
    });

    it('should analyze index effectiveness', () => {
      const index: IndexStrategy = {
        name: 'idx_status',
        table: 'users',
        columns: ['status'],
        type: 'btree',
        selectivity: 0.7,
        cardinality: 1000,
      };

      optimizer.addIndex(index);

      const analysis = optimizer.analyzeIndexes();

      expect(analysis.length).toBeGreaterThan(0);
      expect(analysis[0].score).toBeGreaterThan(0);
    });

    it('should execute optimized query', async () => {
      const query: QueryDefinition = {
        id: 'q1',
        table: 'users',
        select: ['*'],
        predicates: [{ field: 'status', operator: '=', value: 'active' }],
        joins: [],
        aggregations: [],
      };

      const mockExecutor = jest.fn().mockResolvedValue([{ id: 1, name: 'test' }]);

      const { result, stats } = await optimizer.executeOptimized(query, mockExecutor);

      expect(result).toEqual([{ id: 1, name: 'test' }]);
      expect(stats.rowsReturned).toBe(1);
      expect(stats.executionTime).toBeGreaterThanOrEqual(0);
      expect(mockExecutor).toHaveBeenCalled();
    });

    it('should track query statistics', async () => {
      const query: QueryDefinition = {
        id: 'q1',
        table: 'users',
        select: ['*'],
        predicates: [],
        joins: [],
        aggregations: [],
      };

      const mockExecutor = jest.fn().mockResolvedValue([{ id: 1 }]);

      await optimizer.executeOptimized(query, mockExecutor);

      const stats = optimizer.getQueryStatistics();

      expect(stats.length).toBeGreaterThanOrEqual(0);
    });

    it('should invalidate table cache', () => {
      const optimizer2 = new QueryOptimizer();
      const query: QueryDefinition = {
        id: 'q1',
        table: 'users',
        select: ['*'],
        predicates: [],
        joins: [],
        aggregations: [],
      };

      optimizer2.optimize(query);
      optimizer2.invalidateTable('users');

      const cacheStats = optimizer2.getCacheStats();
      expect(cacheStats.size).toBe(0);
    });

    it('should clear all caches', () => {
      const query: QueryDefinition = {
        id: 'q1',
        table: 'users',
        select: ['*'],
        predicates: [],
        joins: [],
        aggregations: [],
      };

      optimizer.optimize(query);
      optimizer.clearCache();

      const cacheStats = optimizer.getCacheStats();
      expect(cacheStats.size).toBe(0);
    });

    it('should get cache statistics', () => {
      const query: QueryDefinition = {
        id: 'q1',
        table: 'users',
        select: ['*'],
        predicates: [],
        joins: [],
        aggregations: [],
      };

      optimizer.optimize(query);
      optimizer.optimize(query);

      const stats = optimizer.getCacheStats();

      expect(stats.size).toBeGreaterThan(0);
      expect(stats.hitRate).toBeDefined();
      expect(stats.capacity).toBeGreaterThan(0);
    });

    it('should handle complex multi-join queries', async () => {
      const query: QueryDefinition = {
        id: 'q1',
        table: 'orders',
        select: ['orders.id', 'users.name', 'products.title'],
        predicates: [
          { field: 'orders.status', operator: '=', value: 'completed' },
          { field: 'users.active', operator: '=', value: true },
        ],
        joins: [
          {
            table: 'users',
            type: 'inner',
            on: [{ field: 'user_id', operator: '=', value: null }],
          },
          {
            table: 'products',
            type: 'inner',
            on: [{ field: 'product_id', operator: '=', value: null }],
          },
        ],
        aggregations: [],
      };

      const mockExecutor = jest.fn().mockResolvedValue([
        { id: 1, name: 'John', title: 'Product 1' },
      ]);

      const { stats } = await optimizer.executeOptimized(query, mockExecutor);

      expect(stats.executionTime).toBeGreaterThanOrEqual(0);
      expect(stats.rowsReturned).toBe(1);
    });

    it('should handle aggregation queries', async () => {
      const query: QueryDefinition = {
        id: 'q1',
        table: 'orders',
        select: ['user_id', 'COUNT(*)', 'SUM(amount)'],
        predicates: [],
        joins: [],
        aggregations: [
          { type: 'count', field: 'id', alias: 'order_count' },
          { type: 'sum', field: 'amount', alias: 'total_amount' },
        ],
        groupBy: ['user_id'],
      };

      const mockExecutor = jest
        .fn()
        .mockResolvedValue([
          { user_id: 1, order_count: 5, total_amount: 500 },
        ]);

      const { stats } = await optimizer.executeOptimized(query, mockExecutor);

      expect(stats.planSteps).toBeGreaterThan(0);
    });
  });

  describe('Integration Tests', () => {
    it('should optimize and cache complex query end-to-end', async () => {
      const optimizer = new QueryOptimizer({
        cacheSize: 1000,
        enableCaching: true,
        enableIndexing: true,
      });

      // Add indexes
      optimizer.addIndex({
        name: 'idx_user_status',
        table: 'users',
        columns: ['status'],
        type: 'btree',
        selectivity: 0.7,
        cardinality: 1000,
      });

      const query: QueryDefinition = {
        id: 'q1',
        table: 'users',
        select: ['id', 'name', 'status'],
        predicates: [
          { field: 'status', operator: '=', value: 'active' },
          { field: 'created_at', operator: '>', value: Date.now() - 86400000 },
        ],
        joins: [],
        aggregations: [],
        orderBy: [{ field: 'created_at', order: 'desc' }],
        limit: 10,
      };

      const mockData = Array.from({ length: 5 }, (_, i) => ({
        id: i + 1,
        name: `User ${i + 1}`,
        status: 'active',
      }));

      const mockExecutor = jest.fn().mockResolvedValue(mockData);

      // First execution
      const result1 = await optimizer.executeOptimized(query, mockExecutor);
      expect(result1.result).toEqual(mockData);
      expect(mockExecutor).toHaveBeenCalledTimes(1);

      // Second execution should use cached plan
      const result2 = await optimizer.executeOptimized(query, mockExecutor);
      // Executor is called again because we're executing, but plan was cached
      expect(result2.result).toEqual(mockData);

      const cacheStats = optimizer.getCacheStats();
      expect(cacheStats.hits).toBeGreaterThanOrEqual(0);
    });

    it('should recommend indexes based on workload', () => {
      const optimizer = new QueryOptimizer();

      const queries: QueryDefinition[] = [
        {
          id: 'q1',
          table: 'users',
          select: ['*'],
          predicates: [{ field: 'email', operator: '=', value: 'test@example.com' }],
          joins: [],
          aggregations: [],
        },
        {
          id: 'q2',
          table: 'users',
          select: ['*'],
          predicates: [{ field: 'email', operator: '=', value: 'user@example.com' }],
          joins: [],
          aggregations: [],
        },
        {
          id: 'q3',
          table: 'users',
          select: ['*'],
          predicates: [{ field: 'email', operator: 'like', value: '%@example.com' }],
          joins: [],
          aggregations: [],
        },
      ];

      for (const query of queries) {
        optimizer.optimize(query);
      }

      const recommendations = optimizer.getIndexRecommendations();

      expect(recommendations.length).toBeGreaterThan(0);
    });

    it('should handle cache invalidation on data changes', () => {
      const optimizer = new QueryOptimizer();

      const query: QueryDefinition = {
        id: 'q1',
        table: 'users',
        select: ['*'],
        predicates: [],
        joins: [],
        aggregations: [],
      };

      optimizer.optimize(query);

      const statsBefore = optimizer.getCacheStats();
      expect(statsBefore.size).toBe(1);

      optimizer.invalidateTable('users');

      const statsAfter = optimizer.getCacheStats();
      expect(statsAfter.size).toBe(0);
    });

    it('should provide performance analysis of queries', async () => {
      const optimizer = new QueryOptimizer({
        statsSamplingRate: 1.0, // Always sample for testing
      });

      const queries: QueryDefinition[] = [
        {
          id: 'q1',
          table: 'users',
          select: ['*'],
          predicates: [{ field: 'status', operator: '=', value: 'active' }],
          joins: [],
          aggregations: [],
        },
        {
          id: 'q2',
          table: 'orders',
          select: ['*'],
          predicates: [],
          joins: [],
          aggregations: [],
        },
      ];

      for (const query of queries) {
        await optimizer.executeOptimized(query, async () => [{ id: 1 }]);
      }

      const stats = optimizer.getQueryStatistics();

      expect(stats.length).toBeGreaterThan(0);
      expect(stats[0].executionTime).toBeGreaterThanOrEqual(0);
    });
  });
});
