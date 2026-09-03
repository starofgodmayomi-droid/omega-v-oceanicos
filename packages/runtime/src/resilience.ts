/**
 * Resilience utilities for production-grade error handling and recovery
 */

export interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  successThreshold: number;
  timeoutMs: number;
}

export enum CircuitState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half-open',
}

/**
 * Retry logic with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {},
): Promise<T> {
  const finalConfig: RetryConfig = {
    maxAttempts: config.maxAttempts ?? 3,
    initialDelayMs: config.initialDelayMs ?? 100,
    maxDelayMs: config.maxDelayMs ?? 5000,
    backoffMultiplier: config.backoffMultiplier ?? 2,
  };

  let lastError: Error | null = null;
  let delayMs = finalConfig.initialDelayMs;

  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt < finalConfig.maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
        delayMs = Math.min(delayMs * finalConfig.backoffMultiplier, finalConfig.maxDelayMs);
      }
    }
  }

  throw lastError || new Error('Retry failed');
}

/**
 * Circuit breaker pattern for fault tolerance
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime: number = 0;
  private readonly config: CircuitBreakerConfig;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = {
      failureThreshold: config.failureThreshold ?? 5,
      successThreshold: config.successThreshold ?? 2,
      timeoutMs: config.timeoutMs ?? 60000,
    };
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastFailureTime > this.config.timeoutMs) {
        this.state = CircuitState.HALF_OPEN;
        this.successCount = 0;
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();

      if (this.state === CircuitState.HALF_OPEN) {
        this.successCount++;
        if (this.successCount >= this.config.successThreshold) {
          this.state = CircuitState.CLOSED;
          this.failureCount = 0;
          this.successCount = 0;
        }
      } else {
        this.failureCount = 0;
      }

      return result;
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = Date.now();

      if (this.failureCount >= this.config.failureThreshold) {
        this.state = CircuitState.OPEN;
      }

      throw error;
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  getMetrics() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
    };
  }

  reset() {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
  }
}

/**
 * Health check result
 */
export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: {
    observer: boolean;
    verification: boolean;
    attestation: boolean;
    eventLog: boolean;
  };
  metrics?: {
    avgLoopTime: number;
    successRate: number;
    errorRate: number;
  };
}

/**
 * Error classification for proper handling
 */
export class VerificationError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 400,
    public context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'VerificationError';
  }
}

/**
 * Create typed error responses
 */
export const ErrorTypes = {
  INVALID_INPUT: new VerificationError('INVALID_INPUT', 'Invalid input', 400),
  VERIFICATION_FAILED: new VerificationError('VERIFICATION_FAILED', 'Verification failed', 400),
  ATTESTATION_FAILED: new VerificationError('ATTESTATION_FAILED', 'Attestation failed', 400),
  DATABASE_ERROR: new VerificationError('DATABASE_ERROR', 'Database error', 500),
  TIMEOUT: new VerificationError('TIMEOUT', 'Operation timeout', 504),
  CIRCUIT_OPEN: new VerificationError('CIRCUIT_OPEN', 'Service temporarily unavailable', 503),
};

/**
 * Rate limiter for API protection
 */
export class RateLimiter {
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private requests: Map<string, number[]> = new Map();

  constructor(maxRequests: number = 100, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  isAllowed(key: string): boolean {
    const now = Date.now();
    const times = this.requests.get(key) || [];

    const recentRequests = times.filter(time => now - time < this.windowMs);

    if (recentRequests.length < this.maxRequests) {
      recentRequests.push(now);
      this.requests.set(key, recentRequests);
      return true;
    }

    return false;
  }

  getStatus(key: string) {
    const now = Date.now();
    const times = this.requests.get(key) || [];
    const recentRequests = times.filter(time => now - time < this.windowMs);

    return {
      remaining: Math.max(0, this.maxRequests - recentRequests.length),
      resetAt: recentRequests.length > 0 ? recentRequests[0] + this.windowMs : now + this.windowMs,
    };
  }
}

/**
 * Graceful shutdown handler
 */
export class GracefulShutdown {
  private handlers: Array<() => Promise<void>> = [];

  register(handler: () => Promise<void>) {
    this.handlers.push(handler);
  }

  async shutdown(timeoutMs: number = 30000): Promise<void> {
    await Promise.race([
      Promise.all(this.handlers.map(h => h().catch(e => console.error('Shutdown error:', e)))),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Shutdown timeout')), timeoutMs)),
    ]);
  }
}
