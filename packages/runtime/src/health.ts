/**
 * Component health check system for operational monitoring
 */

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface ComponentHealth {
  name: string;
  status: HealthStatus;
  timestamp: string;
  responseTime: number;
  message?: string;
  details?: Record<string, any>;
}

export interface SystemHealth {
  status: HealthStatus;
  timestamp: string;
  components: ComponentHealth[];
  overallResponseTime: number;
  version: string;
}

/**
 * Health check function type
 */
export type HealthCheckFunction = () => Promise<ComponentHealth>;

/**
 * Health checker that monitors component status
 */
export class HealthChecker {
  private checks: Map<string, HealthCheckFunction> = new Map();
  private lastResults: Map<string, ComponentHealth> = new Map();

  constructor(_checkInterval: number = 30000) {
    // Check interval reserved for future use (polling-based health monitoring)
  }

  /**
   * Register a health check
   */
  registerCheck(name: string, check: HealthCheckFunction): void {
    this.checks.set(name, check);
  }

  /**
   * Run all health checks
   */
  async runChecks(): Promise<SystemHealth> {
    const startTime = Date.now();
    const results: ComponentHealth[] = [];

    const checkPromises = Array.from(this.checks.entries()).map(
      async ([name, checkFn]) => {
        try {
          const result = await checkFn();
          this.lastResults.set(name, result);
          return result;
        } catch (error) {
          const result: ComponentHealth = {
            name,
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            responseTime: Date.now() - startTime,
            message: error instanceof Error ? error.message : 'Unknown error',
          };
          this.lastResults.set(name, result);
          return result;
        }
      },
    );

    const checkResults = await Promise.all(checkPromises);
    results.push(...checkResults);

    const overallStatus = this.determineOverallStatus(results);
    const overallResponseTime = Date.now() - startTime;

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      components: results,
      overallResponseTime,
      version: '0.1.0',
    };
  }

  /**
   * Get last check results
   */
  getLastResults(): SystemHealth {
    const components = Array.from(this.lastResults.values());
    return {
      status: this.determineOverallStatus(components),
      timestamp: new Date().toISOString(),
      components,
      overallResponseTime: 0,
      version: '0.1.0',
    };
  }

  /**
   * Determine overall status from component statuses
   */
  private determineOverallStatus(components: ComponentHealth[]): HealthStatus {
    if (components.length === 0) {
      return 'healthy';
    }

    const hasUnhealthy = components.some(c => c.status === 'unhealthy');
    if (hasUnhealthy) {
      return 'unhealthy';
    }

    const hasDegraded = components.some(c => c.status === 'degraded');
    if (hasDegraded) {
      return 'degraded';
    }

    return 'healthy';
  }

  /**
   * Get number of registered checks
   */
  getCheckCount(): number {
    return this.checks.size;
  }
}

/**
 * Built-in health check factories
 */
export const HealthChecks = {
  /**
   * Simple alive check
   */
  alive: (name: string): HealthCheckFunction => {
    return async () => {
      const startTime = Date.now();
      return {
        name,
        status: 'healthy' as HealthStatus,
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        message: 'Service is running',
      };
    };
  },

  /**
   * Check with threshold
   */
  threshold: (
    name: string,
    check: () => Promise<boolean>,
    _options: { healthy?: boolean; responseTimeThreshold?: number } = {},
  ): HealthCheckFunction => {
    return async () => {
      const startTime = Date.now();
      const responseTime = Date.now() - startTime;

      try {
        const result = await check();
        const status = result ? 'healthy' : 'unhealthy';

        return {
          name,
          status,
          timestamp: new Date().toISOString(),
          responseTime,
        };
      } catch (error) {
        return {
          name,
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          responseTime,
          message: error instanceof Error ? error.message : 'Check failed',
        };
      }
    };
  },

  /**
   * Memory usage check
   */
  memory: (name: string, options: { threshold?: number } = {}): HealthCheckFunction => {
    const threshold = options.threshold || 0.85;

    return async () => {
      const startTime = Date.now();
      const memUsage = process.memoryUsage();
      const heapPercent = memUsage.heapUsed / memUsage.heapTotal;

      return {
        name,
        status: heapPercent > threshold ? 'degraded' : 'healthy',
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        details: {
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
          heapPercent: Math.round(heapPercent * 100),
        },
        message: `Heap usage: ${Math.round(heapPercent * 100)}%`,
      };
    };
  },

  /**
   * Response time check
   */
  responseTime: (
    name: string,
    check: () => Promise<void>,
    options: { threshold?: number } = {},
  ): HealthCheckFunction => {
    const threshold = options.threshold || 1000;

    return async () => {
      const startTime = Date.now();

      try {
        await check();
        const responseTime = Date.now() - startTime;
        const status = responseTime > threshold ? 'degraded' : 'healthy';

        return {
          name,
          status,
          timestamp: new Date().toISOString(),
          responseTime,
          message: `Response time: ${responseTime}ms`,
        };
      } catch (error) {
        return {
          name,
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          responseTime: Date.now() - startTime,
          message: error instanceof Error ? error.message : 'Check failed',
        };
      }
    };
  },

  /**
   * Counter-based check (count events, ensure not stuck)
   */
  counter: (
    name: string,
    getCount: () => number,
    _options: { interval?: number; threshold?: number } = {},
  ): HealthCheckFunction => {
    let lastCount = 0;
    let lastCheckTime = Date.now();

    return async () => {
      const startTime = Date.now();
      const currentCount = getCount();
      const timeDiff = startTime - lastCheckTime;
      const countDiff = currentCount - lastCount;

      lastCount = currentCount;
      lastCheckTime = startTime;

      const interval = 60000;
      const threshold = 0;

      const status =
        timeDiff < interval && countDiff < threshold ? 'degraded' : 'healthy';

      return {
        name,
        status,
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        details: {
          count: currentCount,
          countDiff,
          timeDiff,
        },
        message: `Count: ${currentCount}, Delta: ${countDiff}/${timeDiff}ms`,
      };
    };
  },
};
