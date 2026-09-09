/**
 * Phase 27: API Gateway
 * Enterprise-grade API entry point with routing, rate limiting, authentication,
 * request/response transformation, and comprehensive traffic management
 */

import { TraceManager } from './tracing';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
export type ProtocolType = 'http' | 'grpc' | 'websocket';
export type RateLimitStrategy = 'fixed-window' | 'sliding-window' | 'token-bucket';
export type AuthType = 'bearer' | 'basic' | 'api-key' | 'oauth2' | 'jwt';
export type CacheStrategy = 'none' | 'etag' | 'max-age' | 'conditional';
export type CircuitBreakerState = 'closed' | 'open' | 'half-open';

export interface RequestContext {
  id: string;
  method: HttpMethod;
  path: string;
  protocol: ProtocolType;
  headers: Record<string, string>;
  body?: any;
  query?: Record<string, string | string[]>;
  params?: Record<string, string>;
  timestamp: number;
  clientIp: string;
  userId?: string;
  correlationId: string;
}

export interface ResponseContext {
  statusCode: number;
  headers: Record<string, string>;
  body?: any;
  timestamp: number;
  duration: number;
}

export interface EndpointRoute {
  path: string;
  method: HttpMethod;
  protocol: ProtocolType;
  handler: (ctx: RequestContext) => Promise<any>;
  middleware?: Middleware[];
  rateLimit?: RateLimitConfig;
  authentication?: AuthConfig;
  validation?: ValidationSchema;
  cache?: CacheConfig;
  timeout?: number;
  description?: string;
}

export interface RateLimitConfig {
  strategy: RateLimitStrategy;
  maxRequests: number;
  windowMs: number;
  keyGenerator?: (ctx: RequestContext) => string;
}

export interface AuthConfig {
  type: AuthType;
  required: boolean;
  scope?: string[];
  roles?: string[];
  permissions?: string[];
}

export interface ValidationSchema {
  type: 'object' | 'array';
  properties?: Record<string, ValidationProperty>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface ValidationProperty {
  type: string;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  enum?: any[];
  required?: boolean;
}

export interface CacheConfig {
  strategy: CacheStrategy;
  ttl?: number;
  key?: string;
  condition?: (ctx: RequestContext, response: ResponseContext) => boolean;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
  monitorInterval: number;
}

export interface GatewayConfig {
  port: number;
  host: string;
  protocol: ProtocolType;
  basePath?: string;
  enableValidation?: boolean;
  enableCaching?: boolean;
  enableRateLimiting?: boolean;
  enableCircuitBreaker?: boolean;
  requestTimeout?: number;
  maxBodySize?: number;
  corsEnabled?: boolean;
  corsOrigins?: string[];
  enableMetrics?: boolean;
  enableTracing?: boolean;
}

export type Middleware = (
  ctx: RequestContext,
  next: () => Promise<ResponseContext>
) => Promise<ResponseContext>;

/**
 * RequestValidator: Validate incoming requests against schema
 */
export class RequestValidator {
  private schemas: Map<string, ValidationSchema> = new Map();

  registerSchema(name: string, schema: ValidationSchema): void {
    this.schemas.set(name, schema);
  }

  validate(schemaName: string, data: any): { valid: boolean; errors: string[] } {
    const schema = this.schemas.get(schemaName);
    if (!schema) {
      return { valid: false, errors: [`Schema ${schemaName} not found`] };
    }

    return this.validateData(data, schema);
  }

  private validateData(data: any, schema: ValidationSchema): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (schema.type === 'object') {
      if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        errors.push('Expected object');
        return { valid: false, errors };
      }

      // Check required properties
      if (schema.required) {
        for (const prop of schema.required) {
          if (!(prop in data)) {
            errors.push(`Missing required property: ${prop}`);
          }
        }
      }

      // Validate properties
      if (schema.properties) {
        for (const [propName, propSchema] of Object.entries(schema.properties)) {
          if (propName in data) {
            const propErrors = this.validateProperty(data[propName], propSchema);
            errors.push(...propErrors);
          }
        }
      }

      // Check additional properties
      if (schema.additionalProperties === false) {
        const allowedKeys = new Set(schema.properties ? Object.keys(schema.properties) : []);
        for (const key of Object.keys(data)) {
          if (!allowedKeys.has(key)) {
            errors.push(`Additional property not allowed: ${key}`);
          }
        }
      }
    } else if (schema.type === 'array') {
      if (!Array.isArray(data)) {
        errors.push('Expected array');
      }
    }

    return { valid: errors.length === 0, errors };
  }

  private validateProperty(value: any, schema: ValidationProperty): string[] {
    const errors: string[] = [];

    if (schema.type === 'string') {
      if (typeof value !== 'string') {
        errors.push(`Expected string, got ${typeof value}`);
        return errors;
      }

      if (schema.minLength && value.length < schema.minLength) {
        errors.push(`String length must be at least ${schema.minLength}`);
      }
      if (schema.maxLength && value.length > schema.maxLength) {
        errors.push(`String length must not exceed ${schema.maxLength}`);
      }
      if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
        errors.push(`String does not match pattern ${schema.pattern}`);
      }
      if (schema.enum && !schema.enum.includes(value)) {
        errors.push(`Value must be one of: ${schema.enum.join(', ')}`);
      }
    } else if (schema.type === 'number') {
      if (typeof value !== 'number') {
        errors.push(`Expected number, got ${typeof value}`);
      }
    } else if (schema.type === 'boolean') {
      if (typeof value !== 'boolean') {
        errors.push(`Expected boolean, got ${typeof value}`);
      }
    }

    return errors;
  }
}

/**
 * RateLimiter: Control request rates with multiple strategies
 */
export class RateLimiter {
  private windows: Map<string, { count: number; resetTime: number }> = new Map();
  private tokens: Map<string, { tokens: number; lastRefill: number }> = new Map();

  isAllowed(key: string, config: RateLimitConfig): boolean {
    switch (config.strategy) {
      case 'fixed-window':
        return this.checkFixedWindow(key, config);
      case 'sliding-window':
        return this.checkSlidingWindow(key, config);
      case 'token-bucket':
        return this.checkTokenBucket(key, config);
      default:
        return true;
    }
  }

  private checkFixedWindow(key: string, config: RateLimitConfig): boolean {
    const now = Date.now();
    const window = this.windows.get(key);

    if (!window || now >= window.resetTime) {
      this.windows.set(key, { count: 1, resetTime: now + config.windowMs });
      return true;
    }

    if (window.count < config.maxRequests) {
      window.count++;
      return true;
    }

    return false;
  }

  private checkSlidingWindow(key: string, config: RateLimitConfig): boolean {
    const now = Date.now();
    const cutoff = now - config.windowMs;

    // In production, this would use a more efficient data structure
    // For now, we track the count and allow if below threshold
    const window = this.windows.get(key);

    if (!window) {
      this.windows.set(key, { count: 1, resetTime: now });
      return true;
    }

    if (now - window.resetTime >= config.windowMs) {
      this.windows.set(key, { count: 1, resetTime: now });
      return true;
    }

    if (window.count < config.maxRequests) {
      window.count++;
      return true;
    }

    return false;
  }

  private checkTokenBucket(key: string, config: RateLimitConfig): boolean {
    const now = Date.now();
    const rate = config.maxRequests / (config.windowMs / 1000); // tokens per second

    let bucket = this.tokens.get(key);

    if (!bucket) {
      this.tokens.set(key, { tokens: config.maxRequests, lastRefill: now });
      bucket = this.tokens.get(key)!;
    }

    // Refill tokens based on time elapsed
    const timePassed = (now - bucket.lastRefill) / 1000;
    bucket.tokens = Math.min(config.maxRequests, bucket.tokens + rate * timePassed);
    bucket.lastRefill = now;

    if (bucket.tokens >= 1) {
      bucket.tokens--;
      return true;
    }

    return false;
  }

  reset(key: string): void {
    this.windows.delete(key);
    this.tokens.delete(key);
  }

  resetAll(): void {
    this.windows.clear();
    this.tokens.clear();
  }
}

/**
 * ResponseCache: Cache responses with multiple strategies
 */
export class ResponseCache {
  private cache: Map<string, { data: ResponseContext; timestamp: number }> = new Map();
  private ttls: Map<string, number> = new Map();

  set(key: string, response: ResponseContext, ttl?: number): void {
    this.cache.set(key, { data: response, timestamp: Date.now() });
    if (ttl) {
      this.ttls.set(key, ttl);
    }
  }

  get(key: string): ResponseContext | null {
    const cached = this.cache.get(key);
    if (!cached) {
      return null;
    }

    const ttl = this.ttls.get(key);
    if (ttl && Date.now() - cached.timestamp > ttl) {
      this.cache.delete(key);
      this.ttls.delete(key);
      return null;
    }

    return cached.data;
  }

  invalidate(pattern: string): number {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        this.ttls.delete(key);
        count++;
      }
    }
    return count;
  }

  clear(): void {
    this.cache.clear();
    this.ttls.clear();
  }

  getStats(): { size: number; ttlCount: number } {
    return {
      size: this.cache.size,
      ttlCount: this.ttls.size,
    };
  }
}

/**
 * CircuitBreaker: Protect against cascading failures
 */
export class CircuitBreaker {
  private state: CircuitBreakerState = 'closed';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime: number | null = null;
  private config: CircuitBreakerConfig;

  constructor(config: CircuitBreakerConfig) {
    this.config = config;
  }

  getState(): CircuitBreakerState {
    return this.state;
  }

  async execute<T>(
    fn: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    if (this.state === 'open') {
      // Check if we should transition to half-open
      if (
        this.lastFailureTime &&
        Date.now() - this.lastFailureTime >= this.config.timeout
      ) {
        this.state = 'half-open';
        this.successCount = 0;
        this.failureCount = 0;
      } else {
        if (fallback) {
          return fallback();
        }
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await Promise.race([
        fn(),
        new Promise<T>((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), this.config.timeout)
        ),
      ]);

      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      if (fallback) {
        return fallback();
      }
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === 'half-open') {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.state = 'closed';
        this.successCount = 0;
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = 'open';
    }
  }

  reset(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
  }
}

/**
 * GatewayMetrics: Track API gateway performance and usage
 */
export class GatewayMetrics {
  private requestCount = 0;
  private responseCount = 0;
  private errorCount = 0;
  private totalDuration = 0;
  private pathMetrics: Map<string, { count: number; duration: number; errors: number }> =
    new Map();
  private methodMetrics: Map<HttpMethod, { count: number; errors: number }> = new Map();

  recordRequest(method: HttpMethod, path: string, duration: number, status: number): void {
    this.requestCount++;
    this.responseCount++;
    this.totalDuration += duration;

    if (status >= 400) {
      this.errorCount++;
    }

    // Update path metrics
    const pathKey = `${method} ${path}`;
    const pathMetric = this.pathMetrics.get(pathKey) || { count: 0, duration: 0, errors: 0 };
    pathMetric.count++;
    pathMetric.duration += duration;
    if (status >= 400) pathMetric.errors++;
    this.pathMetrics.set(pathKey, pathMetric);

    // Update method metrics
    const methodMetric = this.methodMetrics.get(method) || { count: 0, errors: 0 };
    methodMetric.count++;
    if (status >= 400) methodMetric.errors++;
    this.methodMetrics.set(method, methodMetric);
  }

  getStats() {
    const avgDuration = this.responseCount > 0 ? this.totalDuration / this.responseCount : 0;
    const errorRate = this.responseCount > 0 ? (this.errorCount / this.responseCount) * 100 : 0;

    return {
      totalRequests: this.requestCount,
      totalResponses: this.responseCount,
      totalErrors: this.errorCount,
      avgDuration,
      errorRate,
      pathMetrics: Array.from(this.pathMetrics.entries()).map(([path, metric]) => ({
        path,
        ...metric,
        avgDuration: metric.duration / metric.count,
      })),
      methodMetrics: Array.from(this.methodMetrics.entries()).map(([method, metric]) => ({
        method,
        ...metric,
      })),
    };
  }

  reset(): void {
    this.requestCount = 0;
    this.responseCount = 0;
    this.errorCount = 0;
    this.totalDuration = 0;
    this.pathMetrics.clear();
    this.methodMetrics.clear();
  }
}

/**
 * AuthenticationManager: Handle various authentication schemes
 */
export class AuthenticationManager {
  private tokens: Map<string, { userId: string; scope: string[]; expiresAt: number }> =
    new Map();
  private apiKeys: Map<string, { userId: string; scope: string[] }> = new Map();
  private traceManager: TraceManager;

  constructor(traceManager: TraceManager) {
    this.traceManager = traceManager;
  }

  authenticate(ctx: RequestContext, config: AuthConfig): { valid: boolean; userId?: string } {
    const span = this.traceManager.createChildSpan(ctx.correlationId, 'authenticate');

    try {
      const authHeader = ctx.headers['authorization'] || '';

      switch (config.type) {
        case 'bearer':
          return this.authenticateBearer(authHeader, config);
        case 'basic':
          return this.authenticateBasic(authHeader, config);
        case 'api-key':
          return this.authenticateApiKey(ctx.headers['x-api-key'], config);
        case 'oauth2':
          return this.authenticateOAuth2(authHeader, config);
        case 'jwt':
          return this.authenticateJWT(authHeader, config);
        default:
          return { valid: false };
      }
    } finally {
      span?.setAttribute('auth_type', config.type);
      this.traceManager.endSpan(span!);
    }
  }

  private authenticateBearer(
    authHeader: string,
    config: AuthConfig
  ): { valid: boolean; userId?: string } {
    if (!authHeader.startsWith('Bearer ')) {
      return { valid: false };
    }

    const token = authHeader.substring(7);
    const tokenData = this.tokens.get(token);

    if (!tokenData || Date.now() > tokenData.expiresAt) {
      return { valid: false };
    }

    // Check scope
    if (config.scope) {
      const hasScope = config.scope.some((s) => tokenData.scope.includes(s));
      if (!hasScope) {
        return { valid: false };
      }
    }

    return { valid: true, userId: tokenData.userId };
  }

  private authenticateBasic(
    authHeader: string,
    _config: AuthConfig
  ): { valid: boolean; userId?: string } {
    if (!authHeader.startsWith('Basic ')) {
      return { valid: false };
    }

    try {
      const credentials = Buffer.from(authHeader.substring(6), 'base64').toString('utf-8');
      const [username] = credentials.split(':');
      return { valid: true, userId: username };
    } catch {
      return { valid: false };
    }
  }

  private authenticateApiKey(
    apiKey: string | undefined,
    config: AuthConfig
  ): { valid: boolean; userId?: string } {
    if (!apiKey) {
      return { valid: false };
    }

    const keyData = this.apiKeys.get(apiKey);
    if (!keyData) {
      return { valid: false };
    }

    // Check scope
    if (config.scope) {
      const hasScope = config.scope.some((s) => keyData.scope.includes(s));
      if (!hasScope) {
        return { valid: false };
      }
    }

    return { valid: true, userId: keyData.userId };
  }

  private authenticateOAuth2(
    authHeader: string,
    _config: AuthConfig
  ): { valid: boolean; userId?: string } {
    // Simplified OAuth2 validation - in production would call auth server
    if (!authHeader.startsWith('Bearer ')) {
      return { valid: false };
    }

    return { valid: true };
  }

  private authenticateJWT(
    authHeader: string,
    _config: AuthConfig
  ): { valid: boolean; userId?: string } {
    // Simplified JWT validation - in production would verify signature
    if (!authHeader.startsWith('Bearer ')) {
      return { valid: false };
    }

    return { valid: true };
  }

  registerToken(
    token: string,
    userId: string,
    scope: string[],
    expirationTime: number
  ): void {
    this.tokens.set(token, { userId, scope, expiresAt: Date.now() + expirationTime });
  }

  registerApiKey(apiKey: string, userId: string, scope: string[]): void {
    this.apiKeys.set(apiKey, { userId, scope });
  }

  revokeToken(token: string): void {
    this.tokens.delete(token);
  }

  revokeApiKey(apiKey: string): void {
    this.apiKeys.delete(apiKey);
  }
}

/**
 * APIGateway: Main gateway orchestrator
 */
export class APIGateway {
  private routes: Map<string, EndpointRoute> = new Map();
  private config: Required<GatewayConfig>;
  private validator: RequestValidator;
  private rateLimiter: RateLimiter;
  private responseCache: ResponseCache;
  private metrics: GatewayMetrics;
  private authManager: AuthenticationManager;
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private traceManager: TraceManager;
  private globalMiddleware: Middleware[] = [];
  private requestCount = 0;

  constructor(config: GatewayConfig, traceManager: TraceManager) {
    this.config = {
      port: config.port || 8080,
      host: config.host || 'localhost',
      protocol: config.protocol || 'http',
      basePath: config.basePath || '/api',
      enableValidation: config.enableValidation !== false,
      enableCaching: config.enableCaching !== false,
      enableRateLimiting: config.enableRateLimiting !== false,
      enableCircuitBreaker: config.enableCircuitBreaker !== false,
      requestTimeout: config.requestTimeout || 30000,
      maxBodySize: config.maxBodySize || 10 * 1024 * 1024, // 10MB
      corsEnabled: config.corsEnabled !== false,
      corsOrigins: config.corsOrigins || ['*'],
      enableMetrics: config.enableMetrics !== false,
      enableTracing: config.enableTracing !== false,
    };

    this.traceManager = traceManager;
    this.validator = new RequestValidator();
    this.rateLimiter = new RateLimiter();
    this.responseCache = new ResponseCache();
    this.metrics = new GatewayMetrics();
    this.authManager = new AuthenticationManager(traceManager);
  }

  registerRoute(route: EndpointRoute): void {
    const key = `${route.method} ${route.path}`;
    this.routes.set(key, route);

    // Create circuit breaker for the route
    if (this.config.enableCircuitBreaker) {
      this.circuitBreakers.set(key, new CircuitBreaker({
        failureThreshold: 5,
        successThreshold: 2,
        timeout: 60000,
        monitorInterval: 10000,
      }));
    }
  }

  registerValidationSchema(name: string, schema: ValidationSchema): void {
    this.validator.registerSchema(name, schema);
  }

  addGlobalMiddleware(middleware: Middleware): void {
    this.globalMiddleware.push(middleware);
  }

  async handleRequest(req: RequestContext): Promise<ResponseContext> {
    const startTime = Date.now();
    const requestId = `req_${++this.requestCount}_${Date.now()}`;
    const traceId = this.traceManager.createTrace(`api-gateway-${req.method}`);
    const span = this.traceManager.getCurrentSpan();

    span?.setAttribute('request.id', requestId);
    span?.setAttribute('request.path', req.path);
    span?.setAttribute('request.method', req.method);

    try {
      // Find matching route
      const routeKey = `${req.method} ${req.path}`;
      const route = this.routes.get(routeKey);

      if (!route) {
        return {
          statusCode: 404,
          headers: { 'content-type': 'application/json' },
          body: { error: 'Route not found' },
          timestamp: Date.now(),
          duration: Date.now() - startTime,
        };
      }

      // Check rate limiting
      if (this.config.enableRateLimiting && route.rateLimit) {
        const rateLimitKey = route.rateLimit.keyGenerator
          ? route.rateLimit.keyGenerator(req)
          : req.clientIp;

        if (!this.rateLimiter.isAllowed(rateLimitKey, route.rateLimit)) {
          return {
            statusCode: 429,
            headers: { 'content-type': 'application/json' },
            body: { error: 'Too many requests' },
            timestamp: Date.now(),
            duration: Date.now() - startTime,
          };
        }
      }

      // Check authentication
      if (route.authentication && route.authentication.required) {
        const authResult = this.authManager.authenticate(req, route.authentication);
        if (!authResult.valid) {
          return {
            statusCode: 401,
            headers: { 'content-type': 'application/json' },
            body: { error: 'Unauthorized' },
            timestamp: Date.now(),
            duration: Date.now() - startTime,
          };
        }
        req.userId = authResult.userId;
      }

      // Validate request
      if (this.config.enableValidation && route.validation) {
        const validation = this.validateDataAgainstSchema(req.body || {}, route.validation);
        if (!validation.valid) {
          return {
            statusCode: 400,
            headers: { 'content-type': 'application/json' },
            body: { error: 'Validation failed', details: validation.errors },
            timestamp: Date.now(),
            duration: Date.now() - startTime,
          };
        }
      }

      // Check cache
      if (this.config.enableCaching && route.cache) {
        const cacheKey = route.cache.key || `${req.method}:${req.path}`;
        const cached = this.responseCache.get(cacheKey);
        if (cached) {
          span?.setAttribute('cache', 'hit');
          return cached;
        }
      }

      // Build middleware chain
      const middlewareChain = [...this.globalMiddleware, ...(route.middleware || [])];
      let response: ResponseContext;

      if (middlewareChain.length > 0) {
        let index = 0;
        const next = async (): Promise<ResponseContext> => {
          if (index >= middlewareChain.length) {
            return this.executeRouteHandler(route, req, startTime);
          }
          const middleware = middlewareChain[index++];
          return middleware(req, next);
        };
        response = await next();
      } else {
        response = await this.executeRouteHandler(route, req, startTime);
      }

      // Cache response
      if (this.config.enableCaching && route.cache) {
        const shouldCache =
          !route.cache.condition ||
          route.cache.condition(req, response);
        if (shouldCache) {
          const cacheKey = route.cache.key || `${req.method}:${req.path}`;
          this.responseCache.set(cacheKey, response, route.cache.ttl);
          span?.setAttribute('cache', 'set');
        }
      }

      // Record metrics
      if (this.config.enableMetrics) {
        this.metrics.recordRequest(req.method, req.path, response.duration, response.statusCode);
      }

      span?.setAttribute('response.status', response.statusCode);
      span?.setAttribute('duration_ms', response.duration);
      span?.setStatus(response.statusCode < 400 ? 'success' : 'error');

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (this.config.enableMetrics) {
        this.metrics.recordRequest(req.method, req.path, duration, 500);
      }

      span?.setAttribute('error', errorMessage);
      span?.setStatus('error');

      return {
        statusCode: 500,
        headers: { 'content-type': 'application/json' },
        body: { error: 'Internal server error', message: errorMessage },
        timestamp: Date.now(),
        duration,
      };
    } finally {
      this.traceManager.endSpan(span!);
    }
  }

  private validateDataAgainstSchema(
    data: any,
    schema: ValidationSchema
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (schema.type === 'object') {
      if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        errors.push('Expected object');
        return { valid: false, errors };
      }

      // Check required properties
      if (schema.required) {
        for (const prop of schema.required) {
          if (!(prop in data)) {
            errors.push(`Missing required property: ${prop}`);
          }
        }
      }

      // Validate properties
      if (schema.properties) {
        for (const [propName, propSchema] of Object.entries(schema.properties)) {
          if (propName in data) {
            const propErrors = this.validatePropertyValue(data[propName], propSchema);
            errors.push(...propErrors);
          }
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  private validatePropertyValue(value: any, schema: ValidationProperty): string[] {
    const errors: string[] = [];

    if (schema.type === 'string') {
      if (typeof value !== 'string') {
        errors.push(`Expected string, got ${typeof value}`);
        return errors;
      }

      if (schema.minLength && value.length < schema.minLength) {
        errors.push(`String length must be at least ${schema.minLength}`);
      }
      if (schema.maxLength && value.length > schema.maxLength) {
        errors.push(`String length must not exceed ${schema.maxLength}`);
      }
    } else if (schema.type === 'number') {
      if (typeof value !== 'number') {
        errors.push(`Expected number, got ${typeof value}`);
      }
    }

    return errors;
  }

  private async executeRouteHandler(
    route: EndpointRoute,
    req: RequestContext,
    startTime: number
  ): Promise<ResponseContext> {
    const circuitBreaker = this.circuitBreakers.get(`${route.method} ${route.path}`);

    const handler = async () => {
      const result = await route.handler(req);
      return {
        statusCode: 200,
        headers: { 'content-type': 'application/json' },
        body: result,
        timestamp: Date.now(),
        duration: Date.now() - startTime,
      };
    };

    const fallback = async () => {
      return {
        statusCode: 503,
        headers: { 'content-type': 'application/json' },
        body: { error: 'Service unavailable' },
        timestamp: Date.now(),
        duration: Date.now() - startTime,
      };
    };

    if (circuitBreaker) {
      return circuitBreaker.execute(handler, fallback);
    }

    return handler();
  }

  getRoute(path: string, method: HttpMethod): EndpointRoute | undefined {
    return this.routes.get(`${method} ${path}`);
  }

  getAllRoutes(): EndpointRoute[] {
    return Array.from(this.routes.values());
  }

  getMetrics() {
    return this.metrics.getStats();
  }

  getCacheStats() {
    return this.responseCache.getStats();
  }

  invalidateCache(pattern: string): number {
    return this.responseCache.invalidate(pattern);
  }

  clearCache(): void {
    this.responseCache.clear();
  }

  clearMetrics(): void {
    this.metrics.reset();
  }

  getCircuitBreakerStatus(path: string, method: HttpMethod): CircuitBreakerState {
    const breaker = this.circuitBreakers.get(`${method} ${path}`);
    return breaker?.getState() || 'closed';
  }

  resetCircuitBreaker(path: string, method: HttpMethod): void {
    const breaker = this.circuitBreakers.get(`${method} ${path}`);
    breaker?.reset();
  }

  getConfig(): Required<GatewayConfig> {
    return this.config;
  }
}
