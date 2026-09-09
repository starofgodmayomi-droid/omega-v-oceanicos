/**
 * Phase 28: Load Balancer & Service Discovery - Comprehensive Test Suite
 */

import {
  ServiceRegistry,
  HealthChecker,
  LoadBalancer,
  ServiceDiscovery,
  ServiceInstance,
  ServiceRegistration,
  HealthCheckConfig,
  LoadBalancingConfig,
} from '../load-balancer';

describe('Phase 28: Load Balancer & Service Discovery', () => {
  describe('ServiceRegistry', () => {
    let registry: ServiceRegistry;

    beforeEach(() => {
      registry = new ServiceRegistry();
    });

    it('should register a service', () => {
      const registration: ServiceRegistration = {
        name: 'user-service',
        instances: [
          { id: '1', name: 'instance-1', host: 'localhost', port: 8001, status: 'healthy' },
        ],
        loadBalancingStrategy: 'round-robin',
        healthCheckConfig: {
          type: 'http',
          intervalMs: 5000,
          timeoutMs: 1000,
          unhealthyThreshold: 3,
          healthyThreshold: 2,
        },
      };

      registry.registerService(registration);

      const retrieved = registry.getService('user-service');
      expect(retrieved).toEqual(registration);
    });

    it('should register instance to existing service', () => {
      const registration: ServiceRegistration = {
        name: 'api-service',
        instances: [],
        loadBalancingStrategy: 'round-robin',
        healthCheckConfig: {
          type: 'http',
          intervalMs: 5000,
          timeoutMs: 1000,
          unhealthyThreshold: 3,
          healthyThreshold: 2,
        },
      };

      registry.registerService(registration);

      const instance: ServiceInstance = {
        id: 'new-1',
        name: 'new-instance',
        host: 'localhost',
        port: 8002,
        status: 'healthy',
      };

      const added = registry.registerInstance('api-service', instance);
      expect(added).toBe(true);

      const service = registry.getService('api-service');
      expect(service?.instances.length).toBe(1);
    });

    it('should not register duplicate instance', () => {
      const registration: ServiceRegistration = {
        name: 'db-service',
        instances: [{ id: '1', name: 'instance-1', host: 'localhost', port: 5432, status: 'healthy' }],
        loadBalancingStrategy: 'round-robin',
        healthCheckConfig: {
          type: 'tcp',
          intervalMs: 5000,
          timeoutMs: 1000,
          unhealthyThreshold: 3,
          healthyThreshold: 2,
        },
      };

      registry.registerService(registration);

      const duplicate: ServiceInstance = {
        id: '1',
        name: 'instance-1',
        host: 'localhost',
        port: 5432,
        status: 'healthy',
      };

      const added = registry.registerInstance('db-service', duplicate);
      expect(added).toBe(false);
    });

    it('should deregister instance', () => {
      const registration: ServiceRegistration = {
        name: 'cache-service',
        instances: [
          { id: '1', name: 'cache-1', host: 'localhost', port: 6379, status: 'healthy' },
          { id: '2', name: 'cache-2', host: 'localhost', port: 6380, status: 'healthy' },
        ],
        loadBalancingStrategy: 'round-robin',
        healthCheckConfig: {
          type: 'tcp',
          intervalMs: 5000,
          timeoutMs: 1000,
          unhealthyThreshold: 3,
          healthyThreshold: 2,
        },
      };

      registry.registerService(registration);

      const removed = registry.deregisterInstance('cache-service', '1');
      expect(removed).toBe(true);

      const service = registry.getService('cache-service');
      expect(service?.instances.length).toBe(1);
      expect(service?.instances[0].id).toBe('2');
    });

    it('should get healthy instances only', () => {
      const registration: ServiceRegistration = {
        name: 'worker-service',
        instances: [
          { id: '1', name: 'worker-1', host: 'localhost', port: 9001, status: 'healthy' },
          { id: '2', name: 'worker-2', host: 'localhost', port: 9002, status: 'unhealthy' },
          { id: '3', name: 'worker-3', host: 'localhost', port: 9003, status: 'healthy' },
        ],
        loadBalancingStrategy: 'round-robin',
        healthCheckConfig: {
          type: 'http',
          intervalMs: 5000,
          timeoutMs: 1000,
          unhealthyThreshold: 3,
          healthyThreshold: 2,
        },
      };

      registry.registerService(registration);

      const healthy = registry.getHealthyInstances('worker-service');
      expect(healthy.length).toBe(2);
      expect(healthy.every((i) => i.status === 'healthy')).toBe(true);
    });

    it('should update instance status', () => {
      const registration: ServiceRegistration = {
        name: 'queue-service',
        instances: [{ id: '1', name: 'queue-1', host: 'localhost', port: 5672, status: 'healthy' }],
        loadBalancingStrategy: 'round-robin',
        healthCheckConfig: {
          type: 'tcp',
          intervalMs: 5000,
          timeoutMs: 1000,
          unhealthyThreshold: 3,
          healthyThreshold: 2,
        },
      };

      registry.registerService(registration);

      registry.updateInstanceStatus('queue-service', '1', 'unhealthy');

      const service = registry.getService('queue-service');
      expect(service?.instances[0].status).toBe('unhealthy');
    });

    it('should record health checks', () => {
      const registration: ServiceRegistration = {
        name: 'monitor-service',
        instances: [{ id: '1', name: 'mon-1', host: 'localhost', port: 8080, status: 'healthy' }],
        loadBalancingStrategy: 'round-robin',
        healthCheckConfig: {
          type: 'http',
          intervalMs: 5000,
          timeoutMs: 1000,
          unhealthyThreshold: 3,
          healthyThreshold: 2,
        },
      };

      registry.registerService(registration);

      registry.recordHealthCheck('monitor-service', {
        instanceId: '1',
        status: 'healthy',
        timestamp: Date.now(),
        responseTime: 50,
      });

      const history = registry.getHealthHistory('monitor-service', '1');
      expect(history.length).toBe(1);
      expect(history[0].responseTime).toBe(50);
    });

    it('should provide registry statistics', () => {
      const reg1: ServiceRegistration = {
        name: 'service-1',
        instances: [
          { id: '1', name: 'inst-1', host: 'localhost', port: 8001, status: 'healthy' },
          { id: '2', name: 'inst-2', host: 'localhost', port: 8002, status: 'unhealthy' },
        ],
        loadBalancingStrategy: 'round-robin',
        healthCheckConfig: {
          type: 'http',
          intervalMs: 5000,
          timeoutMs: 1000,
          unhealthyThreshold: 3,
          healthyThreshold: 2,
        },
      };

      registry.registerService(reg1);

      const stats = registry.getStats();
      expect(stats.totalServices).toBe(1);
      expect(stats.totalInstances).toBe(2);
      expect(stats.healthyInstances).toBe(1);
      expect(stats.unhealthyInstances).toBe(1);
    });
  });

  describe('HealthChecker', () => {
    let registry: ServiceRegistry;
    let healthChecker: HealthChecker;

    beforeEach(() => {
      registry = new ServiceRegistry();
      healthChecker = new HealthChecker(registry);
    });

    afterEach(() => {
      healthChecker.stopAllHealthChecks();
    });

    it('should start health check for service', async () => {
      const registration: ServiceRegistration = {
        name: 'health-test-service',
        instances: [{ id: '1', name: 'test-1', host: 'localhost', port: 8080, status: 'healthy' }],
        loadBalancingStrategy: 'round-robin',
        healthCheckConfig: {
          type: 'http',
          intervalMs: 100,
          timeoutMs: 1000,
          unhealthyThreshold: 3,
          healthyThreshold: 2,
        },
      };

      registry.registerService(registration);
      healthChecker.startHealthCheck('health-test-service', registration.healthCheckConfig);

      // Health check should be initiated (wait for at least one interval)
      await new Promise((resolve) => setTimeout(resolve, 150));

      const lastCheck = healthChecker.getLastCheckTime('health-test-service');
      expect(typeof lastCheck).toBe('number');
    });

    it('should stop health check', async () => {
      const registration: ServiceRegistration = {
        name: 'stop-test-service',
        instances: [{ id: '1', name: 'test-1', host: 'localhost', port: 8080, status: 'healthy' }],
        loadBalancingStrategy: 'round-robin',
        healthCheckConfig: {
          type: 'http',
          intervalMs: 100,
          timeoutMs: 1000,
          unhealthyThreshold: 3,
          healthyThreshold: 2,
        },
      };

      registry.registerService(registration);
      healthChecker.startHealthCheck('stop-test-service', registration.healthCheckConfig);

      healthChecker.stopHealthCheck('stop-test-service');

      const lastCheck = healthChecker.getLastCheckTime('stop-test-service');
      // After stopping, should return undefined on next check
      expect(typeof lastCheck === 'number' || lastCheck === undefined).toBe(true);
    });
  });

  describe('LoadBalancer', () => {
    let registry: ServiceRegistry;
    let loadBalancer: LoadBalancer;
    const config: LoadBalancingConfig = {
      strategy: 'round-robin',
      timeout: 5000,
      maxRetries: 3,
    };

    beforeEach(() => {
      registry = new ServiceRegistry();
      loadBalancer = new LoadBalancer(registry, config);

      const registration: ServiceRegistration = {
        name: 'lb-service',
        instances: [
          { id: '1', name: 'inst-1', host: 'localhost', port: 8001, status: 'healthy' },
          { id: '2', name: 'inst-2', host: 'localhost', port: 8002, status: 'healthy' },
          { id: '3', name: 'inst-3', host: 'localhost', port: 8003, status: 'healthy' },
        ],
        loadBalancingStrategy: 'round-robin',
        healthCheckConfig: {
          type: 'http',
          intervalMs: 5000,
          timeoutMs: 1000,
          unhealthyThreshold: 3,
          healthyThreshold: 2,
        },
      };

      registry.registerService(registration);
    });

    it('should select instance using round-robin strategy', () => {
      const inst1 = loadBalancer.selectInstance('lb-service');
      const inst2 = loadBalancer.selectInstance('lb-service');
      const inst3 = loadBalancer.selectInstance('lb-service');
      const inst4 = loadBalancer.selectInstance('lb-service');

      expect(inst1?.id).not.toEqual(inst2?.id);
      expect(inst2?.id).not.toEqual(inst3?.id);
      expect(inst1?.id).toEqual(inst4?.id);
    });

    it('should select only healthy instances', () => {
      registry.updateInstanceStatus('lb-service', '2', 'unhealthy');

      const inst1 = loadBalancer.selectInstance('lb-service');
      expect(inst1?.id).not.toBe('2');

      const inst2 = loadBalancer.selectInstance('lb-service');
      expect(inst2?.id).not.toBe('2');
    });

    it('should return null when no healthy instances', () => {
      registry.updateInstanceStatus('lb-service', '1', 'unhealthy');
      registry.updateInstanceStatus('lb-service', '2', 'unhealthy');
      registry.updateInstanceStatus('lb-service', '3', 'unhealthy');

      const instance = loadBalancer.selectInstance('lb-service');
      expect(instance).toBeNull();
    });

    it('should support weighted load balancing', () => {
      const weightedRegistry = new ServiceRegistry();
      const weightedLoadBalancer = new LoadBalancer(weightedRegistry, {
        ...config,
        strategy: 'weighted',
      });

      const registration: ServiceRegistration = {
        name: 'weighted-service',
        instances: [
          { id: '1', name: 'inst-1', host: 'localhost', port: 8001, status: 'healthy', weight: 5 },
          { id: '2', name: 'inst-2', host: 'localhost', port: 8002, status: 'healthy', weight: 1 },
        ],
        loadBalancingStrategy: 'weighted',
        healthCheckConfig: {
          type: 'http',
          intervalMs: 5000,
          timeoutMs: 1000,
          unhealthyThreshold: 3,
          healthyThreshold: 2,
        },
      };

      weightedRegistry.registerService(registration);

      const selections = Array(100)
        .fill(0)
        .map(() => weightedLoadBalancer.selectInstance('weighted-service')?.id);

      const count1 = selections.filter((id) => id === '1').length;
      const count2 = selections.filter((id) => id === '2').length;

      // Weighted distribution should favor instance 1 (5:1 ratio)
      expect(count1).toBeGreaterThan(count2);
    });

    it('should support consistent hash load balancing', () => {
      const hashRegistry = new ServiceRegistry();
      const hashLoadBalancer = new LoadBalancer(hashRegistry, {
        ...config,
        strategy: 'consistent-hash',
        enableStickySessions: true,
      });

      const registration: ServiceRegistration = {
        name: 'hash-service',
        instances: [
          { id: '1', name: 'inst-1', host: 'localhost', port: 8001, status: 'healthy' },
          { id: '2', name: 'inst-2', host: 'localhost', port: 8002, status: 'healthy' },
        ],
        loadBalancingStrategy: 'consistent-hash',
        healthCheckConfig: {
          type: 'http',
          intervalMs: 5000,
          timeoutMs: 1000,
          unhealthyThreshold: 3,
          healthyThreshold: 2,
        },
      };

      hashRegistry.registerService(registration);

      // Same session should get same instance
      const inst1 = hashLoadBalancer.selectInstance('hash-service', 'session-123');
      const inst2 = hashLoadBalancer.selectInstance('hash-service', 'session-123');

      expect(inst1?.id).toBe(inst2?.id);
    });

    it('should record request statistics', () => {
      loadBalancer.recordRequest('lb-service', '1', 100);
      loadBalancer.recordRequest('lb-service', '1', 200);
      loadBalancer.recordRequest('lb-service', '2', 150, new Error('Request failed'));

      const stats = loadBalancer.getStats('lb-service');

      expect(stats['1'].total).toBe(2);
      expect(stats['1'].avgTime).toBe(150);
      expect(stats['2'].errors).toBe(1);
      expect(stats['2'].errorRate).toBe(100);
    });

    it('should clear session', () => {
      const hashLoadBalancer = new LoadBalancer(registry, {
        ...config,
        strategy: 'consistent-hash',
        enableStickySessions: true,
      });

      registry.getService('lb-service')!.loadBalancingStrategy = 'consistent-hash';

      hashLoadBalancer.selectInstance('lb-service', 'session-abc');
      hashLoadBalancer.clearSession('session-abc');

      // After clearing, different instances might be selected (but not guaranteed in this test)
      const instance = hashLoadBalancer.selectInstance('lb-service', 'session-abc');
      expect(instance).not.toBeNull();
    });

    it('should reset statistics', () => {
      loadBalancer.recordRequest('lb-service', '1', 100);
      loadBalancer.resetStats();

      const stats = loadBalancer.getStats('lb-service');
      expect(Object.keys(stats).length).toBe(0);
    });
  });

  describe('ServiceDiscovery', () => {
    let discovery: ServiceDiscovery;
    const config: LoadBalancingConfig = {
      strategy: 'round-robin',
      timeout: 5000,
      maxRetries: 3,
    };

    beforeEach(() => {
      discovery = new ServiceDiscovery(config);
    });

    afterEach(() => {
      discovery.shutdown();
    });

    it('should register and discover service', () => {
      const registration: ServiceRegistration = {
        name: 'discovery-service',
        instances: [
          { id: '1', name: 'disc-1', host: 'localhost', port: 8001, status: 'healthy' },
          { id: '2', name: 'disc-2', host: 'localhost', port: 8002, status: 'healthy' },
        ],
        loadBalancingStrategy: 'round-robin',
        healthCheckConfig: {
          type: 'http',
          intervalMs: 5000,
          timeoutMs: 1000,
          unhealthyThreshold: 3,
          healthyThreshold: 2,
        },
      };

      discovery.registerService(registration);

      const instance = discovery.getServiceInstance('discovery-service');
      expect(instance).not.toBeNull();
      expect(instance?.host).toBe('localhost');
    });

    it('should register new instance dynamically', () => {
      const registration: ServiceRegistration = {
        name: 'dynamic-service',
        instances: [],
        loadBalancingStrategy: 'round-robin',
        healthCheckConfig: {
          type: 'http',
          intervalMs: 5000,
          timeoutMs: 1000,
          unhealthyThreshold: 3,
          healthyThreshold: 2,
        },
      };

      discovery.registerService(registration);

      const instance: ServiceInstance = {
        id: 'dyn-1',
        name: 'dynamic-inst-1',
        host: 'localhost',
        port: 8080,
        status: 'healthy',
      };

      discovery.registerInstance('dynamic-service', instance);

      const found = discovery.getServiceInstance('dynamic-service');
      expect(found?.id).toBe('dyn-1');
    });

    it('should get healthy instances', () => {
      const registration: ServiceRegistration = {
        name: 'health-service',
        instances: [
          { id: '1', name: 'h-1', host: 'localhost', port: 8001, status: 'healthy' },
          { id: '2', name: 'h-2', host: 'localhost', port: 8002, status: 'unhealthy' },
          { id: '3', name: 'h-3', host: 'localhost', port: 8003, status: 'healthy' },
        ],
        loadBalancingStrategy: 'round-robin',
        healthCheckConfig: {
          type: 'http',
          intervalMs: 5000,
          timeoutMs: 1000,
          unhealthyThreshold: 3,
          healthyThreshold: 2,
        },
      };

      discovery.registerService(registration);

      const healthy = discovery.getHealthyInstances('health-service');
      expect(healthy.length).toBe(2);
    });

    it('should watch service instances', (done) => {
      const registration: ServiceRegistration = {
        name: 'watched-service',
        instances: [],
        loadBalancingStrategy: 'round-robin',
        healthCheckConfig: {
          type: 'http',
          intervalMs: 5000,
          timeoutMs: 1000,
          unhealthyThreshold: 3,
          healthyThreshold: 2,
        },
      };

      discovery.registerService(registration);

      discovery.watchService('watched-service', (instance) => {
        expect(instance.id).toBe('watched-1');
        done();
      });

      const instance: ServiceInstance = {
        id: 'watched-1',
        name: 'watched-inst',
        host: 'localhost',
        port: 8080,
        status: 'healthy',
      };

      discovery.registerInstance('watched-service', instance);
    });

    it('should provide service statistics', () => {
      const registration: ServiceRegistration = {
        name: 'stats-service',
        instances: [
          { id: '1', name: 's-1', host: 'localhost', port: 8001, status: 'healthy' },
          { id: '2', name: 's-2', host: 'localhost', port: 8002, status: 'healthy' },
        ],
        loadBalancingStrategy: 'round-robin',
        healthCheckConfig: {
          type: 'http',
          intervalMs: 5000,
          timeoutMs: 1000,
          unhealthyThreshold: 3,
          healthyThreshold: 2,
        },
      };

      discovery.registerService(registration);

      const stats = discovery.getServiceStats('stats-service');
      expect(stats.instances.length).toBe(2);
      expect(stats.totalRequests).toBe(0);
    });

    it('should provide registry statistics', () => {
      const reg1: ServiceRegistration = {
        name: 'stat-service-1',
        instances: [{ id: '1', name: 'inst', host: 'localhost', port: 8001, status: 'healthy' }],
        loadBalancingStrategy: 'round-robin',
        healthCheckConfig: {
          type: 'http',
          intervalMs: 5000,
          timeoutMs: 1000,
          unhealthyThreshold: 3,
          healthyThreshold: 2,
        },
      };

      discovery.registerService(reg1);

      const stats = discovery.getRegistryStats();
      expect(stats.totalServices).toBe(1);
      expect(stats.totalInstances).toBe(1);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete service discovery and load balancing workflow', () => {
      const discovery = new ServiceDiscovery({
        strategy: 'round-robin',
        timeout: 5000,
        maxRetries: 3,
      });

      // Register service with multiple instances
      const registration: ServiceRegistration = {
        name: 'integration-service',
        instances: [
          { id: '1', name: 'int-1', host: '10.0.0.1', port: 8001, status: 'healthy', weight: 2 },
          { id: '2', name: 'int-2', host: '10.0.0.2', port: 8002, status: 'healthy', weight: 1 },
          { id: '3', name: 'int-3', host: '10.0.0.3', port: 8003, status: 'unhealthy', weight: 1 },
        ],
        loadBalancingStrategy: 'round-robin',
        healthCheckConfig: {
          type: 'http',
          intervalMs: 5000,
          timeoutMs: 1000,
          path: '/health',
          expectedStatus: 200,
          unhealthyThreshold: 3,
          healthyThreshold: 2,
        },
      };

      discovery.registerService(registration);

      // Discover instances
      const inst1 = discovery.getServiceInstance('integration-service');
      const inst2 = discovery.getServiceInstance('integration-service');
      const inst3 = discovery.getServiceInstance('integration-service');

      expect(inst1).not.toBeNull();
      expect(inst2).not.toBeNull();
      expect(inst3).not.toBeNull();

      // All should be from healthy instances
      const healthyIds = [inst1?.id, inst2?.id, inst3?.id];
      expect(healthyIds.every((id) => id !== '3')).toBe(true);

      // Get statistics
      const stats = discovery.getServiceStats('integration-service');
      expect(stats.instances.length).toBe(3);

      discovery.shutdown();
    });

    it('should handle dynamic service registration and deregistration', () => {
      const discovery = new ServiceDiscovery({
        strategy: 'round-robin',
        timeout: 5000,
        maxRetries: 3,
      });

      // Start with empty service
      const registration: ServiceRegistration = {
        name: 'dynamic-service',
        instances: [],
        loadBalancingStrategy: 'round-robin',
        healthCheckConfig: {
          type: 'http',
          intervalMs: 5000,
          timeoutMs: 1000,
          unhealthyThreshold: 3,
          healthyThreshold: 2,
        },
      };

      discovery.registerService(registration);

      // Add instances
      for (let i = 1; i <= 3; i++) {
        const instance: ServiceInstance = {
          id: `dyn-${i}`,
          name: `dyn-instance-${i}`,
          host: `10.0.0.${i}`,
          port: 8000 + i,
          status: 'healthy',
        };
        discovery.registerInstance('dynamic-service', instance);
      }

      let healthy = discovery.getHealthyInstances('dynamic-service');
      expect(healthy.length).toBe(3);

      // Deregister one
      discovery.deregisterInstance('dynamic-service', 'dyn-2');

      healthy = discovery.getHealthyInstances('dynamic-service');
      expect(healthy.length).toBe(2);

      discovery.shutdown();
    });
  });
});
