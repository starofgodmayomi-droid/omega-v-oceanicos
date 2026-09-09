/**
 * Phase 28: Load Balancer & Service Discovery
 * Distributed request routing with service registry, health checking,
 * and multiple load balancing strategies for horizontal scaling
 */

export type LoadBalancingStrategy = 'round-robin' | 'least-connections' | 'weighted' | 'consistent-hash' | 'random';
export type ServiceStatus = 'healthy' | 'unhealthy' | 'draining' | 'offline';
export type HealthCheckType = 'http' | 'tcp' | 'grpc' | 'custom';

export interface ServiceInstance {
  id: string;
  name: string;
  host: string;
  port: number;
  status: ServiceStatus;
  weight?: number;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface ServiceRegistration {
  name: string;
  instances: ServiceInstance[];
  loadBalancingStrategy: LoadBalancingStrategy;
  healthCheckConfig: HealthCheckConfig;
  maxRetries?: number;
  timeoutMs?: number;
}

export interface HealthCheckConfig {
  type: HealthCheckType;
  intervalMs: number;
  timeoutMs: number;
  unhealthyThreshold: number;
  healthyThreshold: number;
  path?: string;
  expectedStatus?: number;
}

export interface LoadBalancingConfig {
  strategy: LoadBalancingStrategy;
  timeout: number;
  maxRetries: number;
  connectionPoolSize?: number;
  enableStickySessions?: boolean;
}

export interface ServiceEndpoint {
  service: string;
  instance: ServiceInstance;
  connectionId?: string;
}

export interface HealthCheckResult {
  instanceId: string;
  status: ServiceStatus;
  timestamp: number;
  responseTime: number;
  error?: string;
}

/**
 * ServiceRegistry: Track and manage service instances
 */
export class ServiceRegistry {
  private services: Map<string, ServiceRegistration> = new Map();
  private instanceHealth: Map<string, HealthCheckResult[]> = new Map();
  private registryCallbacks: ((service: string, action: 'added' | 'removed' | 'updated') => void)[] = [];

  registerService(registration: ServiceRegistration): void {
    this.services.set(registration.name, registration);
    this.notifyCallbacks(registration.name, 'added');

    // Initialize health tracking
    for (const instance of registration.instances) {
      const key = `${registration.name}:${instance.id}`;
      if (!this.instanceHealth.has(key)) {
        this.instanceHealth.set(key, []);
      }
    }
  }

  registerInstance(serviceName: string, instance: ServiceInstance): boolean {
    const service = this.services.get(serviceName);
    if (!service) {
      return false;
    }

    // Check if instance already exists
    const exists = service.instances.some((i) => i.id === instance.id);
    if (!exists) {
      service.instances.push(instance);
      const key = `${serviceName}:${instance.id}`;
      this.instanceHealth.set(key, []);
      this.notifyCallbacks(serviceName, 'added');
      return true;
    }

    return false;
  }

  deregisterInstance(serviceName: string, instanceId: string): boolean {
    const service = this.services.get(serviceName);
    if (!service) {
      return false;
    }

    const initialLength = service.instances.length;
    service.instances = service.instances.filter((i) => i.id !== instanceId);

    if (service.instances.length < initialLength) {
      const key = `${serviceName}:${instanceId}`;
      this.instanceHealth.delete(key);
      this.notifyCallbacks(serviceName, 'removed');
      return true;
    }

    return false;
  }

  getService(name: string): ServiceRegistration | undefined {
    return this.services.get(name);
  }

  getHealthyInstances(serviceName: string): ServiceInstance[] {
    const service = this.services.get(serviceName);
    if (!service) {
      return [];
    }

    return service.instances.filter((i) => i.status === 'healthy');
  }

  updateInstanceStatus(serviceName: string, instanceId: string, status: ServiceStatus): void {
    const service = this.services.get(serviceName);
    if (!service) {
      return;
    }

    const instance = service.instances.find((i) => i.id === instanceId);
    if (instance) {
      instance.status = status;
      this.notifyCallbacks(serviceName, 'updated');
    }
  }

  recordHealthCheck(serviceName: string, result: HealthCheckResult): void {
    const key = `${serviceName}:${result.instanceId}`;
    const checks = this.instanceHealth.get(key);

    if (checks) {
      checks.push(result);
      // Keep only last 100 checks per instance
      if (checks.length > 100) {
        checks.shift();
      }
    }
  }

  getHealthHistory(serviceName: string, instanceId: string, limit: number = 10): HealthCheckResult[] {
    const key = `${serviceName}:${instanceId}`;
    const checks = this.instanceHealth.get(key);
    return checks ? checks.slice(-limit) : [];
  }

  getAllServices(): ServiceRegistration[] {
    return Array.from(this.services.values());
  }

  onServiceChange(callback: (service: string, action: 'added' | 'removed' | 'updated') => void): void {
    this.registryCallbacks.push(callback);
  }

  private notifyCallbacks(service: string, action: 'added' | 'removed' | 'updated'): void {
    for (const callback of this.registryCallbacks) {
      callback(service, action);
    }
  }

  getStats(): {
    totalServices: number;
    totalInstances: number;
    healthyInstances: number;
    unhealthyInstances: number;
  } {
    let totalServices = 0;
    let totalInstances = 0;
    let healthyInstances = 0;
    let unhealthyInstances = 0;

    for (const service of this.services.values()) {
      totalServices++;
      totalInstances += service.instances.length;
      healthyInstances += service.instances.filter((i) => i.status === 'healthy').length;
      unhealthyInstances += service.instances.filter((i) => i.status === 'unhealthy').length;
    }

    return {
      totalServices,
      totalInstances,
      healthyInstances,
      unhealthyInstances,
    };
  }

  clear(): void {
    this.services.clear();
    this.instanceHealth.clear();
  }
}

/**
 * HealthChecker: Monitor service instance health
 */
export class HealthChecker {
  private checks: Map<string, NodeJS.Timeout> = new Map();
  private registry: ServiceRegistry;
  private lastCheckTime: Map<string, number> = new Map();

  constructor(registry: ServiceRegistry) {
    this.registry = registry;
  }

  startHealthCheck(serviceName: string, config: HealthCheckConfig): void {
    const key = `${serviceName}`;
    const service = this.registry.getService(serviceName);

    if (!service) {
      return;
    }

    // Stop existing check if any
    this.stopHealthCheck(serviceName);

    const check = setInterval(() => {
      this.performHealthChecks(serviceName, config);
    }, config.intervalMs);

    this.checks.set(key, check);
  }

  private async performHealthChecks(serviceName: string, config: HealthCheckConfig): Promise<void> {
    const service = this.registry.getService(serviceName);
    if (!service) {
      return;
    }

    this.lastCheckTime.set(serviceName, Date.now());

    for (const instance of service.instances) {
      try {
        const startTime = Date.now();
        const responseTime = await this.checkInstanceHealth(instance, config);
        const duration = Date.now() - startTime;

        const result: HealthCheckResult = {
          instanceId: instance.id,
          status: 'healthy',
          timestamp: Date.now(),
          responseTime: Math.min(duration, responseTime),
        };

        this.registry.recordHealthCheck(serviceName, result);
        this.updateInstanceStatus(serviceName, instance, config, result);
      } catch (error) {
        const result: HealthCheckResult = {
          instanceId: instance.id,
          status: 'unhealthy',
          timestamp: Date.now(),
          responseTime: config.timeoutMs,
          error: error instanceof Error ? error.message : 'Health check failed',
        };

        this.registry.recordHealthCheck(serviceName, result);
        this.updateInstanceStatus(serviceName, instance, config, result);
      }
    }
  }

  private async checkInstanceHealth(instance: ServiceInstance, config: HealthCheckConfig): Promise<number> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Health check timeout'));
      }, config.timeoutMs);

      try {
        // Simulate health check - in production would make actual HTTP/TCP call
        const startTime = Date.now();

        // For demo purposes, mark as healthy if instance is in healthy state
        if (instance.status === 'offline') {
          reject(new Error('Instance offline'));
        } else {
          const duration = Date.now() - startTime;
          clearTimeout(timeout);
          resolve(duration);
        }
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  private updateInstanceStatus(
    serviceName: string,
    instance: ServiceInstance,
    config: HealthCheckConfig,
    result: HealthCheckResult
  ): void {
    const history = this.registry.getHealthHistory(serviceName, instance.id, config.healthyThreshold);

    if (result.status === 'healthy') {
      const healthyCount = history.filter((h) => h.status === 'healthy').length;
      if (healthyCount >= config.healthyThreshold - 1) {
        this.registry.updateInstanceStatus(serviceName, instance.id, 'healthy');
      }
    } else {
      const unhealthyCount = history.filter((h) => h.status === 'unhealthy').length;
      if (unhealthyCount >= config.unhealthyThreshold - 1) {
        this.registry.updateInstanceStatus(serviceName, instance.id, 'unhealthy');
      }
    }
  }

  stopHealthCheck(serviceName: string): void {
    const key = serviceName;
    const check = this.checks.get(key);

    if (check) {
      clearInterval(check);
      this.checks.delete(key);
    }
  }

  stopAllHealthChecks(): void {
    for (const check of this.checks.values()) {
      clearInterval(check);
    }
    this.checks.clear();
  }

  getLastCheckTime(serviceName: string): number | undefined {
    return this.lastCheckTime.get(serviceName);
  }
}

/**
 * LoadBalancer: Route requests to service instances using multiple strategies
 */
export class LoadBalancer {
  private registry: ServiceRegistry;
  private config: LoadBalancingConfig;
  private currentIndex: Map<string, number> = new Map();
  private connectionSessions: Map<string, string> = new Map();
  private requestStats: Map<string, { total: number; errors: number; totalTime: number }> = new Map();

  constructor(registry: ServiceRegistry, config: LoadBalancingConfig) {
    this.registry = registry;
    this.config = config;
  }

  selectInstance(serviceName: string, sessionId?: string): ServiceInstance | null {
    const service = this.registry.getService(serviceName);
    if (!service) {
      return null;
    }

    const healthyInstances = this.registry.getHealthyInstances(serviceName);
    if (healthyInstances.length === 0) {
      return null;
    }

    const strategy = service.loadBalancingStrategy || this.config.strategy;

    switch (strategy) {
      case 'round-robin':
        return this.selectRoundRobin(serviceName, healthyInstances);
      case 'least-connections':
        return this.selectLeastConnections(healthyInstances);
      case 'weighted':
        return this.selectWeighted(healthyInstances);
      case 'consistent-hash':
        return this.selectConsistentHash(serviceName, sessionId || '', healthyInstances);
      case 'random':
        return this.selectRandom(healthyInstances);
      default:
        return healthyInstances[0];
    }
  }

  private selectRoundRobin(serviceName: string, instances: ServiceInstance[]): ServiceInstance {
    let index = this.currentIndex.get(serviceName) || 0;
    const instance = instances[index % instances.length];
    this.currentIndex.set(serviceName, index + 1);
    return instance;
  }

  private selectLeastConnections(instances: ServiceInstance[]): ServiceInstance {
    // In production, would track active connections per instance
    return instances[0];
  }

  private selectWeighted(instances: ServiceInstance[]): ServiceInstance {
    const totalWeight = instances.reduce((sum, i) => sum + (i.weight || 1), 0);
    let random = Math.random() * totalWeight;

    for (const instance of instances) {
      random -= instance.weight || 1;
      if (random <= 0) {
        return instance;
      }
    }

    return instances[0];
  }

  private selectConsistentHash(serviceName: string, sessionId: string, instances: ServiceInstance[]): ServiceInstance {
    if (this.config.enableStickySessions && sessionId) {
      const cached = this.connectionSessions.get(sessionId);
      if (cached) {
        const instance = instances.find((i) => i.id === cached);
        if (instance) {
          return instance;
        }
      }
    }

    // Simple hash-based selection
    const hash = this.hashFunction(sessionId || serviceName);
    const index = hash % instances.length;
    const selected = instances[index];

    if (this.config.enableStickySessions && sessionId) {
      this.connectionSessions.set(sessionId, selected.id);
    }

    return selected;
  }

  private selectRandom(instances: ServiceInstance[]): ServiceInstance {
    return instances[Math.floor(Math.random() * instances.length)];
  }

  private hashFunction(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  recordRequest(serviceName: string, instanceId: string, duration: number, error?: Error): void {
    const key = instanceId;

    if (!this.requestStats.has(key)) {
      this.requestStats.set(key, { total: 0, errors: 0, totalTime: 0 });
    }

    const stats = this.requestStats.get(key)!;
    stats.total++;
    stats.totalTime += duration;

    if (error) {
      stats.errors++;
    }
  }

  getStats(serviceName?: string): {
    [instanceId: string]: { total: number; errors: number; avgTime: number; errorRate: number };
  } {
    const stats: any = {};

    if (serviceName) {
      const service = this.registry.getService(serviceName);
      if (service) {
        for (const instance of service.instances) {
          const key = instance.id;
          const stat = this.requestStats.get(key);
          if (stat) {
            stats[key] = {
              total: stat.total,
              errors: stat.errors,
              avgTime: stat.total > 0 ? stat.totalTime / stat.total : 0,
              errorRate: stat.total > 0 ? (stat.errors / stat.total) * 100 : 0,
            };
          }
        }
      }
    } else {
      for (const [key, stat] of this.requestStats.entries()) {
        stats[key] = {
          total: stat.total,
          errors: stat.errors,
          avgTime: stat.total > 0 ? stat.totalTime / stat.total : 0,
          errorRate: stat.total > 0 ? (stat.errors / stat.total) * 100 : 0,
        };
      }
    }

    return stats;
  }

  clearSession(sessionId: string): void {
    this.connectionSessions.delete(sessionId);
  }

  resetStats(): void {
    this.requestStats.clear();
  }
}

/**
 * ServiceDiscovery: Unified service registry and discovery interface
 */
export class ServiceDiscovery {
  private registry: ServiceRegistry;
  private healthChecker: HealthChecker;
  private loadBalancer: LoadBalancer;
  private watchers: Map<string, ((instance: ServiceInstance) => void)[]> = new Map();

  constructor(config: LoadBalancingConfig) {
    this.registry = new ServiceRegistry();
    this.healthChecker = new HealthChecker(this.registry);
    this.loadBalancer = new LoadBalancer(this.registry, config);

    // Watch for service changes
    this.registry.onServiceChange((service, action) => {
      if (action === 'added' || action === 'updated') {
        const serviceReg = this.registry.getService(service);
        if (serviceReg) {
          this.healthChecker.startHealthCheck(service, serviceReg.healthCheckConfig);
        }
      }
    });
  }

  registerService(registration: ServiceRegistration): void {
    this.registry.registerService(registration);
    this.healthChecker.startHealthCheck(registration.name, registration.healthCheckConfig);
  }

  registerInstance(serviceName: string, instance: ServiceInstance): void {
    const added = this.registry.registerInstance(serviceName, instance);
    if (added && this.watchers.has(serviceName)) {
      for (const watcher of this.watchers.get(serviceName)!) {
        watcher(instance);
      }
    }
  }

  deregisterInstance(serviceName: string, instanceId: string): void {
    this.registry.deregisterInstance(serviceName, instanceId);
  }

  getServiceInstance(serviceName: string, sessionId?: string): ServiceInstance | null {
    return this.loadBalancer.selectInstance(serviceName, sessionId);
  }

  getHealthyInstances(serviceName: string): ServiceInstance[] {
    return this.registry.getHealthyInstances(serviceName);
  }

  watchService(serviceName: string, callback: (instance: ServiceInstance) => void): void {
    if (!this.watchers.has(serviceName)) {
      this.watchers.set(serviceName, []);
    }
    this.watchers.get(serviceName)!.push(callback);
  }

  getServiceStats(serviceName: string): {
    instances: { id: string; status: ServiceStatus; avgResponseTime: number }[];
    totalRequests: number;
    errorRate: number;
  } {
    const service = this.registry.getService(serviceName);
    if (!service) {
      return { instances: [], totalRequests: 0, errorRate: 0 };
    }

    const stats = this.loadBalancer.getStats(serviceName);
    let totalRequests = 0;
    let totalErrors = 0;

    const instances = service.instances.map((inst) => {
      const instStats = stats[inst.id];
      totalRequests += instStats?.total || 0;
      totalErrors += instStats?.errors || 0;

      return {
        id: inst.id,
        status: inst.status,
        avgResponseTime: instStats?.avgTime || 0,
      };
    });

    return {
      instances,
      totalRequests,
      errorRate: totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0,
    };
  }

  getRegistryStats() {
    return this.registry.getStats();
  }

  shutdown(): void {
    this.healthChecker.stopAllHealthChecks();
    this.loadBalancer.resetStats();
  }
}
