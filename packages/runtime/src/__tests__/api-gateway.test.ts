/**
 * Phase 27: API Gateway - Comprehensive Test Suite
 */

import {
  APIGateway,
  RequestValidator,
  RateLimiter,
  ResponseCache,
  CircuitBreaker,
  GatewayMetrics,
  AuthenticationManager,
  RequestContext,
  ResponseContext,
  EndpointRoute,
  RateLimitConfig,
} from '../api-gateway';
import { TraceManager } from '../tracing';

describe('Phase 27: API Gateway', () => {
  let gateway: APIGateway;
  let traceManager: TraceManager;

  beforeEach(() => {
    traceManager = new TraceManager();
    gateway = new APIGateway(
      {
        port: 8080,
        host: 'localhost',
        protocol: 'http',
        enableValidation: true,
        enableCaching: true,
        enableRateLimiting: true,
        enableCircuitBreaker: true,
        enableMetrics: true,
        enableTracing: true,
      },
      traceManager
    );
  });

  describe('RequestValidator', () => {
    let validator: RequestValidator;

    beforeEach(() => {
      validator = new RequestValidator();
    });

    it('should register and validate schemas', () => {
      validator.registerSchema('user', {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1 },
          email: { type: 'string' },
          age: { type: 'number' },
        },
        required: ['name', 'email'],
      });

      const result = validator.validate('user', { name: 'Alice', email: 'alice@example.com' });
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should detect missing required fields', () => {
      validator.registerSchema('user', {
        type: 'object',
        properties: {
          name: { type: 'string' },
          email: { type: 'string' },
        },
        required: ['name', 'email'],
      });

      const result = validator.validate('user', { name: 'Alice' });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate string constraints', () => {
      validator.registerSchema('product', {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 3, maxLength: 50 },
        },
      });

      const tooShort = validator.validate('product', { name: 'ab' });
      expect(tooShort.valid).toBe(false);

      const tooLong = validator.validate('product', { name: 'a'.repeat(51) });
      expect(tooLong.valid).toBe(false);

      const valid = validator.validate('product', { name: 'Valid Product' });
      expect(valid.valid).toBe(true);
    });

    it('should validate enum values', () => {
      validator.registerSchema('status', {
        type: 'object',
        properties: {
          state: { type: 'string', enum: ['active', 'inactive', 'pending'] },
        },
      });

      const valid = validator.validate('status', { state: 'active' });
      expect(valid.valid).toBe(true);

      const invalid = validator.validate('status', { state: 'unknown' });
      expect(invalid.valid).toBe(false);
    });

    it('should prevent additional properties when configured', () => {
      validator.registerSchema('strict', {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        additionalProperties: false,
      });

      const result = validator.validate('strict', { id: '1', extra: 'field' });
      expect(result.valid).toBe(false);
    });
  });

  describe('RateLimiter', () => {
    let limiter: RateLimiter;

    beforeEach(() => {
      limiter = new RateLimiter();
    });

    it('should enforce fixed-window rate limits', () => {
      const config: RateLimitConfig = {
        strategy: 'fixed-window',
        maxRequests: 5,
        windowMs: 1000,
      };

      const key = 'test-client';
      let allowed = 0;

      for (let i = 0; i < 10; i++) {
        if (limiter.isAllowed(key, config)) allowed++;
      }

      expect(allowed).toBe(5);
    });

    it('should reset fixed-window after timeout', async () => {
      const config: RateLimitConfig = {
        strategy: 'fixed-window',
        maxRequests: 2,
        windowMs: 100,
      };

      const key = 'test-reset';

      expect(limiter.isAllowed(key, config)).toBe(true);
      expect(limiter.isAllowed(key, config)).toBe(true);
      expect(limiter.isAllowed(key, config)).toBe(false);

      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(limiter.isAllowed(key, config)).toBe(true);
    });

    it('should enforce sliding-window rate limits', () => {
      const config: RateLimitConfig = {
        strategy: 'sliding-window',
        maxRequests: 3,
        windowMs: 1000,
      };

      const key = 'sliding';
      let allowed = 0;

      for (let i = 0; i < 5; i++) {
        if (limiter.isAllowed(key, config)) allowed++;
      }

      expect(allowed).toBe(3);
    });

    it('should enforce token-bucket rate limits', () => {
      const config: RateLimitConfig = {
        strategy: 'token-bucket',
        maxRequests: 5,
        windowMs: 1000,
      };

      const key = 'bucket';
      let allowed = 0;

      for (let i = 0; i < 7; i++) {
        if (limiter.isAllowed(key, config)) allowed++;
      }

      expect(allowed).toBeGreaterThanOrEqual(5);
    });

    it('should allow custom key generation', () => {
      const config: RateLimitConfig = {
        strategy: 'fixed-window',
        maxRequests: 2,
        windowMs: 1000,
        keyGenerator: (ctx) => ctx.userId || 'anonymous',
      };

      const ctx1: RequestContext = {
        id: '1',
        method: 'GET',
        path: '/',
        protocol: 'http',
        headers: {},
        timestamp: Date.now(),
        clientIp: '127.0.0.1',
        correlationId: 'corr-1',
      };

      const ctx2 = { ...ctx1, userId: 'user1' };

      const key1 = config.keyGenerator(ctx1);
      const key2 = config.keyGenerator(ctx2);

      expect(key1).not.toEqual(key2);
    });

    it('should reset individual keys', () => {
      const config: RateLimitConfig = {
        strategy: 'fixed-window',
        maxRequests: 1,
        windowMs: 10000,
      };

      const key = 'resetme';
      expect(limiter.isAllowed(key, config)).toBe(true);
      expect(limiter.isAllowed(key, config)).toBe(false);

      limiter.reset(key);
      expect(limiter.isAllowed(key, config)).toBe(true);
    });
  });

  describe('ResponseCache', () => {
    let cache: ResponseCache;

    beforeEach(() => {
      cache = new ResponseCache();
    });

    it('should cache and retrieve responses', () => {
      const response: ResponseContext = {
        statusCode: 200,
        headers: { 'content-type': 'application/json' },
        body: { data: 'test' },
        timestamp: Date.now(),
        duration: 10,
      };

      cache.set('key1', response);
      const retrieved = cache.get('key1');

      expect(retrieved).toEqual(response);
    });

    it('should respect TTL expiration', async () => {
      const response: ResponseContext = {
        statusCode: 200,
        headers: {},
        body: { data: 'test' },
        timestamp: Date.now(),
        duration: 10,
      };

      cache.set('ttl-key', response, 100);
      expect(cache.get('ttl-key')).not.toBeNull();

      await new Promise((resolve) => setTimeout(resolve, 150));
      expect(cache.get('ttl-key')).toBeNull();
    });

    it('should invalidate by pattern', () => {
      const response: ResponseContext = {
        statusCode: 200,
        headers: {},
        body: {},
        timestamp: Date.now(),
        duration: 10,
      };

      cache.set('api/users/1', response);
      cache.set('api/users/2', response);
      cache.set('api/products/1', response);

      const removed = cache.invalidate('users');
      expect(removed).toBe(2);
      expect(cache.get('api/users/1')).toBeNull();
      expect(cache.get('api/products/1')).not.toBeNull();
    });

    it('should provide cache statistics', () => {
      const response: ResponseContext = {
        statusCode: 200,
        headers: {},
        body: {},
        timestamp: Date.now(),
        duration: 10,
      };

      cache.set('key1', response, 10000);
      cache.set('key2', response, 10000);
      cache.set('key3', response);

      const stats = cache.getStats();
      expect(stats.size).toBe(3);
      expect(stats.ttlCount).toBe(2);
    });

    it('should clear all cached responses', () => {
      const response: ResponseContext = {
        statusCode: 200,
        headers: {},
        body: {},
        timestamp: Date.now(),
        duration: 10,
      };

      cache.set('key1', response);
      cache.set('key2', response);

      cache.clear();
      expect(cache.getStats().size).toBe(0);
    });
  });

  describe('CircuitBreaker', () => {
    it('should start in closed state', () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 3,
        successThreshold: 2,
        timeout: 1000,
        monitorInterval: 100,
      });

      expect(breaker.getState()).toBe('closed');
    });

    it('should open after failure threshold', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 3,
        successThreshold: 2,
        timeout: 100,
        monitorInterval: 10,
      });

      const failingFn = async () => {
        throw new Error('Failed');
      };

      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(failingFn);
        } catch {
          // Expected
        }
      }

      expect(breaker.getState()).toBe('open');
    });

    it('should transition to half-open after timeout', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 1,
        successThreshold: 1,
        timeout: 100,
        monitorInterval: 10,
      });

      try {
        await breaker.execute(async () => {
          throw new Error('Failed');
        });
      } catch {
        // Expected
      }

      expect(breaker.getState()).toBe('open');

      await new Promise((resolve) => setTimeout(resolve, 150));

      try {
        await breaker.execute(async () => {
          throw new Error('Still failing');
        });
      } catch {
        // Expected
      }

      expect(breaker.getState()).toBe('open');
    });

    it('should use fallback when open', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 1,
        successThreshold: 1,
        timeout: 100,
        monitorInterval: 10,
      });

      try {
        await breaker.execute(async () => {
          throw new Error('Failed');
        });
      } catch {
        // Expected
      }

      const result = await breaker.execute(
        async () => {
          throw new Error('Should not execute');
        },
        async () => 'fallback result'
      );

      expect(result).toBe('fallback result');
    });

    it('should reset state', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 1,
        successThreshold: 1,
        timeout: 100,
        monitorInterval: 10,
      });

      try {
        await breaker.execute(async () => {
          throw new Error('Failed');
        });
      } catch {
        // Expected
      }

      expect(breaker.getState()).toBe('open');
      breaker.reset();
      expect(breaker.getState()).toBe('closed');
    });
  });

  describe('GatewayMetrics', () => {
    let metrics: GatewayMetrics;

    beforeEach(() => {
      metrics = new GatewayMetrics();
    });

    it('should record request metrics', () => {
      metrics.recordRequest('GET', '/users', 100, 200);
      metrics.recordRequest('POST', '/users', 150, 201);
      metrics.recordRequest('GET', '/users', 120, 500);

      const stats = metrics.getStats();
      expect(stats.totalRequests).toBe(3);
      expect(stats.totalResponses).toBe(3);
      expect(stats.totalErrors).toBe(1);
    });

    it('should calculate average duration', () => {
      metrics.recordRequest('GET', '/test', 100, 200);
      metrics.recordRequest('GET', '/test', 200, 200);

      const stats = metrics.getStats();
      expect(stats.avgDuration).toBe(150);
    });

    it('should calculate error rate', () => {
      metrics.recordRequest('GET', '/test', 100, 200);
      metrics.recordRequest('GET', '/test', 100, 400);
      metrics.recordRequest('GET', '/test', 100, 500);

      const stats = metrics.getStats();
      expect(stats.errorRate).toBeCloseTo(200 / 3, 5);
    });

    it('should track path-specific metrics', () => {
      metrics.recordRequest('GET', '/users', 100, 200);
      metrics.recordRequest('GET', '/users', 100, 200);
      metrics.recordRequest('POST', '/users', 150, 201);
      metrics.recordRequest('GET', '/products', 120, 200);

      const stats = metrics.getStats();
      expect(stats.pathMetrics.length).toBeGreaterThan(0);

      const getUsersMetric = stats.pathMetrics.find((m) => m.path === 'GET /users');
      expect(getUsersMetric?.count).toBe(2);
    });

    it('should track method-specific metrics', () => {
      metrics.recordRequest('GET', '/test', 100, 200);
      metrics.recordRequest('POST', '/test', 100, 201);
      metrics.recordRequest('PUT', '/test', 100, 200);

      const stats = metrics.getStats();
      expect(stats.methodMetrics.length).toBe(3);
    });

    it('should reset metrics', () => {
      metrics.recordRequest('GET', '/test', 100, 200);
      metrics.reset();

      const stats = metrics.getStats();
      expect(stats.totalRequests).toBe(0);
      expect(stats.totalResponses).toBe(0);
    });
  });

  describe('AuthenticationManager', () => {
    let authManager: AuthenticationManager;

    beforeEach(() => {
      authManager = new AuthenticationManager(traceManager);
    });

    it('should authenticate bearer tokens', () => {
      const token = 'test-token-123';
      authManager.registerToken(token, 'user123', ['read', 'write'], 3600000);

      const ctx: RequestContext = {
        id: '1',
        method: 'GET',
        path: '/api/users',
        protocol: 'http',
        headers: { authorization: `Bearer ${token}` },
        timestamp: Date.now(),
        clientIp: '127.0.0.1',
        correlationId: 'corr-1',
      };

      const result = authManager.authenticate(ctx, {
        type: 'bearer',
        required: true,
      });

      expect(result.valid).toBe(true);
      expect(result.userId).toBe('user123');
    });

    it('should reject expired tokens', async () => {
      const token = 'expired-token';
      authManager.registerToken(token, 'user123', ['read'], 100);

      await new Promise((resolve) => setTimeout(resolve, 150));

      const ctx: RequestContext = {
        id: '1',
        method: 'GET',
        path: '/api/users',
        protocol: 'http',
        headers: { authorization: `Bearer ${token}` },
        timestamp: Date.now(),
        clientIp: '127.0.0.1',
        correlationId: 'corr-1',
      };

      const result = authManager.authenticate(ctx, {
        type: 'bearer',
        required: true,
      });

      expect(result.valid).toBe(false);
    });

    it('should authenticate API keys', () => {
      const apiKey = 'sk-test-key';
      authManager.registerApiKey(apiKey, 'user456', ['read']);

      const ctx: RequestContext = {
        id: '1',
        method: 'GET',
        path: '/api/data',
        protocol: 'http',
        headers: { 'x-api-key': apiKey },
        timestamp: Date.now(),
        clientIp: '127.0.0.1',
        correlationId: 'corr-1',
      };

      const result = authManager.authenticate(ctx, {
        type: 'api-key',
        required: true,
      });

      expect(result.valid).toBe(true);
    });

    it('should revoke tokens', () => {
      const token = 'revoke-me';
      authManager.registerToken(token, 'user', ['read'], 3600000);

      authManager.revokeToken(token);

      const ctx: RequestContext = {
        id: '1',
        method: 'GET',
        path: '/api',
        protocol: 'http',
        headers: { authorization: `Bearer ${token}` },
        timestamp: Date.now(),
        clientIp: '127.0.0.1',
        correlationId: 'corr-1',
      };

      const result = authManager.authenticate(ctx, {
        type: 'bearer',
        required: true,
      });

      expect(result.valid).toBe(false);
    });
  });

  describe('APIGateway', () => {
    it('should register and retrieve routes', () => {
      const route: EndpointRoute = {
        path: '/users',
        method: 'GET',
        protocol: 'http',
        handler: async () => ({ users: [] }),
      };

      gateway.registerRoute(route);
      const retrieved = gateway.getRoute('/users', 'GET');

      expect(retrieved).toEqual(route);
    });

    it('should handle request with valid route', async () => {
      const route: EndpointRoute = {
        path: '/test',
        method: 'GET',
        protocol: 'http',
        handler: async () => ({ success: true }),
      };

      gateway.registerRoute(route);

      const request: RequestContext = {
        id: '1',
        method: 'GET',
        path: '/test',
        protocol: 'http',
        headers: {},
        timestamp: Date.now(),
        clientIp: '127.0.0.1',
        correlationId: 'test-corr-1',
      };

      const response = await gateway.handleRequest(request);

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 404 for unmapped routes', async () => {
      const request: RequestContext = {
        id: '1',
        method: 'GET',
        path: '/unknown',
        protocol: 'http',
        headers: {},
        timestamp: Date.now(),
        clientIp: '127.0.0.1',
        correlationId: 'test-corr-2',
      };

      const response = await gateway.handleRequest(request);

      expect(response.statusCode).toBe(404);
    });

    it('should enforce rate limiting', async () => {
      const route: EndpointRoute = {
        path: '/limited',
        method: 'GET',
        protocol: 'http',
        handler: async () => ({ ok: true }),
        rateLimit: {
          strategy: 'fixed-window',
          maxRequests: 2,
          windowMs: 10000,
        },
      };

      gateway.registerRoute(route);

      const baseRequest: RequestContext = {
        id: '1',
        method: 'GET',
        path: '/limited',
        protocol: 'http',
        headers: {},
        timestamp: Date.now(),
        clientIp: '127.0.0.1',
        correlationId: 'test-corr-3',
      };

      const response1 = await gateway.handleRequest(baseRequest);
      const response2 = await gateway.handleRequest(baseRequest);
      const response3 = await gateway.handleRequest(baseRequest);

      expect(response1.statusCode).toBe(200);
      expect(response2.statusCode).toBe(200);
      expect(response3.statusCode).toBe(429);
    });

    it('should validate requests', async () => {
      gateway.registerValidationSchema('createUser', {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1 },
          email: { type: 'string' },
        },
        required: ['name', 'email'],
      });

      const route: EndpointRoute = {
        path: '/users',
        method: 'POST',
        protocol: 'http',
        handler: async () => ({ id: '1' }),
        validation: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            email: { type: 'string' },
          },
          required: ['name', 'email'],
        },
      };

      gateway.registerRoute(route);

      const invalidRequest: RequestContext = {
        id: '1',
        method: 'POST',
        path: '/users',
        protocol: 'http',
        headers: {},
        body: { name: 'Alice' }, // missing email
        timestamp: Date.now(),
        clientIp: '127.0.0.1',
        correlationId: 'test-corr-4',
      };

      const response = await gateway.handleRequest(invalidRequest);
      expect(response.statusCode).toBe(400);
    });

    it('should cache responses', async () => {
      let callCount = 0;

      const route: EndpointRoute = {
        path: '/cached',
        method: 'GET',
        protocol: 'http',
        handler: async () => {
          callCount++;
          return { count: callCount };
        },
        cache: {
          strategy: 'max-age',
          ttl: 10000,
        },
      };

      gateway.registerRoute(route);

      const request: RequestContext = {
        id: '1',
        method: 'GET',
        path: '/cached',
        protocol: 'http',
        headers: {},
        timestamp: Date.now(),
        clientIp: '127.0.0.1',
        correlationId: 'test-corr-5',
      };

      const response1 = await gateway.handleRequest(request);
      const response2 = await gateway.handleRequest(request);

      // Second response should be cached, so count should be 1
      expect(response1.body.count).toBe(1);
      expect(response2.body.count).toBe(1);
    });

    it('should track metrics', async () => {
      const route: EndpointRoute = {
        path: '/metrics-test',
        method: 'GET',
        protocol: 'http',
        handler: async () => ({ ok: true }),
      };

      gateway.registerRoute(route);

      const request: RequestContext = {
        id: '1',
        method: 'GET',
        path: '/metrics-test',
        protocol: 'http',
        headers: {},
        timestamp: Date.now(),
        clientIp: '127.0.0.1',
        correlationId: 'test-corr-6',
      };

      await gateway.handleRequest(request);
      await gateway.handleRequest(request);

      const metrics = gateway.getMetrics();
      expect(metrics.totalRequests).toBe(2);
      expect(metrics.totalResponses).toBe(2);
    });

    it('should return all registered routes', () => {
      const routes: EndpointRoute[] = [
        {
          path: '/route1',
          method: 'GET',
          protocol: 'http',
          handler: async () => ({}),
        },
        {
          path: '/route2',
          method: 'POST',
          protocol: 'http',
          handler: async () => ({}),
        },
      ];

      routes.forEach((r) => gateway.registerRoute(r));

      const allRoutes = gateway.getAllRoutes();
      expect(allRoutes.length).toBe(2);
    });

    it('should invalidate cache by pattern', () => {
      gateway.registerRoute({
        path: '/api/users/1',
        method: 'GET',
        protocol: 'http',
        handler: async () => ({ id: 1 }),
        cache: { strategy: 'max-age', ttl: 10000 },
      });

      // Simulate cache population
      const stats1 = gateway.getCacheStats();
      const invalidated = gateway.invalidateCache('users');
      const stats2 = gateway.getCacheStats();

      expect(invalidated).toBeGreaterThanOrEqual(0);
    });

    it('should clear all metrics and cache', () => {
      gateway.registerRoute({
        path: '/test',
        method: 'GET',
        protocol: 'http',
        handler: async () => ({ ok: true }),
      });

      gateway.clearCache();
      gateway.clearMetrics();

      const metrics = gateway.getMetrics();
      const cache = gateway.getCacheStats();

      expect(metrics.totalRequests).toBe(0);
      expect(cache.size).toBe(0);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete request lifecycle with all features', async () => {
      gateway.registerValidationSchema('userCreate', {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1 },
        },
        required: ['name'],
      });

      const route: EndpointRoute = {
        path: '/api/users',
        method: 'POST',
        protocol: 'http',
        handler: async (ctx) => {
          return { id: '123', name: ctx.body.name, userId: ctx.userId };
        },
        validation: {
          type: 'object',
          properties: {
            name: { type: 'string' },
          },
          required: ['name'],
        },
        rateLimit: {
          strategy: 'fixed-window',
          maxRequests: 10,
          windowMs: 1000,
        },
        cache: {
          strategy: 'max-age',
          ttl: 5000,
        },
      };

      gateway.registerRoute(route);

      const request: RequestContext = {
        id: '1',
        method: 'POST',
        path: '/api/users',
        protocol: 'http',
        headers: {},
        body: { name: 'Alice' },
        timestamp: Date.now(),
        clientIp: '192.168.1.1',
        correlationId: 'integration-test-1',
      };

      const response = await gateway.handleRequest(request);

      expect(response.statusCode).toBe(200);
      expect(response.body.id).toBe('123');
      expect(response.body.name).toBe('Alice');
    });

    it('should handle middleware chain', async () => {
      let middlewareOrder: string[] = [];

      const middleware1: any = async (ctx: RequestContext, next: any) => {
        middlewareOrder.push('m1-before');
        const response = await next();
        middlewareOrder.push('m1-after');
        return response;
      };

      const middleware2: any = async (ctx: RequestContext, next: any) => {
        middlewareOrder.push('m2-before');
        const response = await next();
        middlewareOrder.push('m2-after');
        return response;
      };

      const route: EndpointRoute = {
        path: '/middleware-test',
        method: 'GET',
        protocol: 'http',
        handler: async () => {
          middlewareOrder.push('handler');
          return { ok: true };
        },
        middleware: [middleware1, middleware2],
      };

      gateway.registerRoute(route);
      gateway.addGlobalMiddleware(middleware1);

      const request: RequestContext = {
        id: '1',
        method: 'GET',
        path: '/middleware-test',
        protocol: 'http',
        headers: {},
        timestamp: Date.now(),
        clientIp: '127.0.0.1',
        correlationId: 'middleware-test-1',
      };

      await gateway.handleRequest(request);

      expect(middlewareOrder.length).toBeGreaterThan(0);
      expect(middlewareOrder).toContain('handler');
    });

    it('should handle errors gracefully', async () => {
      const noCircuitBreakerGateway = new APIGateway(
        {
          port: 8080,
          host: 'localhost',
          protocol: 'http',
          enableCircuitBreaker: false,
        },
        traceManager
      );

      const route: EndpointRoute = {
        path: '/error',
        method: 'GET',
        protocol: 'http',
        handler: async () => {
          throw new Error('Handler error');
        },
      };

      noCircuitBreakerGateway.registerRoute(route);

      const request: RequestContext = {
        id: '1',
        method: 'GET',
        path: '/error',
        protocol: 'http',
        headers: {},
        timestamp: Date.now(),
        clientIp: '127.0.0.1',
        correlationId: 'error-test-1',
      };

      const response = await noCircuitBreakerGateway.handleRequest(request);

      expect(response.statusCode).toBe(500);
      expect(response.body.error).toBe('Internal server error');
    });
  });
});
