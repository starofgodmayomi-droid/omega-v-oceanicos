import { HealthChecker, HealthChecks, HealthStatus } from '../health';

describe('Health Check System', () => {
  let healthChecker: HealthChecker;

  beforeEach(() => {
    healthChecker = new HealthChecker();
  });

  describe('HealthChecker', () => {
    it('should create health checker instance', () => {
      expect(healthChecker).toBeDefined();
      expect(healthChecker.getCheckCount()).toBe(0);
    });

    it('should register health checks', () => {
      const check = HealthChecks.alive('test');
      healthChecker.registerCheck('test', check);

      expect(healthChecker.getCheckCount()).toBe(1);
    });

    it('should run single health check', async () => {
      const check = HealthChecks.alive('test-service');
      healthChecker.registerCheck('test-service', check);

      const result = await healthChecker.runChecks();

      expect(result.status).toBe('healthy');
      expect(result.components).toHaveLength(1);
      expect(result.components[0].name).toBe('test-service');
      expect(result.components[0].status).toBe('healthy');
    });

    it('should run multiple health checks', async () => {
      healthChecker.registerCheck('service1', HealthChecks.alive('service1'));
      healthChecker.registerCheck('service2', HealthChecks.alive('service2'));
      healthChecker.registerCheck('service3', HealthChecks.alive('service3'));

      const result = await healthChecker.runChecks();

      expect(result.components).toHaveLength(3);
      expect(result.status).toBe('healthy');
    });

    it('should determine unhealthy status when any component is unhealthy', async () => {
      healthChecker.registerCheck('healthy', HealthChecks.alive('healthy'));
      healthChecker.registerCheck(
        'unhealthy',
        HealthChecks.threshold('unhealthy', async () => false),
      );

      const result = await healthChecker.runChecks();

      expect(result.status).toBe('unhealthy');
      expect(result.components.find(c => c.name === 'unhealthy')!.status).toBe('unhealthy');
    });

    it('should determine degraded status when any component is degraded', async () => {
      const degradedCheck = async () => ({
        name: 'degraded',
        status: 'degraded' as HealthStatus,
        timestamp: new Date().toISOString(),
        responseTime: 100,
      });

      healthChecker.registerCheck('healthy', HealthChecks.alive('healthy'));
      healthChecker.registerCheck('degraded', degradedCheck);

      const result = await healthChecker.runChecks();

      expect(result.status).toBe('degraded');
    });

    it('should record last results', async () => {
      healthChecker.registerCheck('service', HealthChecks.alive('service'));

      await healthChecker.runChecks();
      const lastResults = healthChecker.getLastResults();

      expect(lastResults.components).toHaveLength(1);
      expect(lastResults.components[0].name).toBe('service');
    });

    it('should handle check errors gracefully', async () => {
      const errorCheck = async () => {
        throw new Error('Check failed');
      };

      healthChecker.registerCheck('failing-service', errorCheck);

      const result = await healthChecker.runChecks();

      expect(result.components[0].status).toBe('unhealthy');
      expect(result.components[0].message).toContain('Check failed');
    });
  });

  describe('Built-in Health Checks', () => {
    it('should create alive check', async () => {
      const check = HealthChecks.alive('test');
      healthChecker.registerCheck('test', check);

      const result = await healthChecker.runChecks();

      expect(result.components[0].status).toBe('healthy');
      expect(result.components[0].message).toBe('Service is running');
    });

    it('should create threshold check (passing)', async () => {
      const check = HealthChecks.threshold('threshold-service', async () => true);
      healthChecker.registerCheck('threshold-service', check);

      const result = await healthChecker.runChecks();

      expect(result.components[0].status).toBe('healthy');
    });

    it('should create threshold check (failing)', async () => {
      const check = HealthChecks.threshold('threshold-service', async () => false);
      healthChecker.registerCheck('threshold-service', check);

      const result = await healthChecker.runChecks();

      expect(result.components[0].status).toBe('unhealthy');
    });

    it('should create memory check', async () => {
      const check = HealthChecks.memory('memory', { threshold: 0.9 });
      healthChecker.registerCheck('memory', check);

      const result = await healthChecker.runChecks();

      expect(result.components[0].status).toBeDefined();
      expect(result.components[0].details).toBeDefined();
      expect(result.components[0].details!.heapUsed).toBeGreaterThan(0);
      expect(result.components[0].details!.heapTotal).toBeGreaterThan(0);
    });

    it('should detect high memory usage', async () => {
      const check = HealthChecks.memory('memory', { threshold: 0.01 });
      healthChecker.registerCheck('memory', check);

      const result = await healthChecker.runChecks();

      expect(result.components[0].status).toBe('degraded');
    });

    it('should create response time check', async () => {
      const check = HealthChecks.responseTime('response-time', async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      }, { threshold: 100 });

      healthChecker.registerCheck('response-time', check);
      const result = await healthChecker.runChecks();

      expect(result.components[0].status).toBe('healthy');
      expect(result.components[0].responseTime).toBeGreaterThan(0);
    });

    it('should detect slow response times', async () => {
      const check = HealthChecks.responseTime('response-time', async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      }, { threshold: 10 });

      healthChecker.registerCheck('response-time', check);
      const result = await healthChecker.runChecks();

      expect(result.components[0].status).toBe('degraded');
    });

    it('should create counter check', async () => {
      let count = 0;
      const check = HealthChecks.counter('counter', () => ++count);

      healthChecker.registerCheck('counter', check);

      const result1 = await healthChecker.runChecks();
      expect(result1.components[0].status).toBeDefined();

      const result2 = await healthChecker.runChecks();
      expect(result2.components[0].details).toBeDefined();
      expect(result2.components[0].details!.count).toBeGreaterThan(0);
    });
  });

  describe('System Health', () => {
    it('should return system health with version', async () => {
      healthChecker.registerCheck('service', HealthChecks.alive('service'));

      const result = await healthChecker.runChecks();

      expect(result.version).toBe('0.1.0');
      expect(result.timestamp).toBeDefined();
      expect(result.overallResponseTime).toBeGreaterThanOrEqual(0);
    });

    it('should include component response times', async () => {
      const slowCheck = HealthChecks.responseTime('slow', async () => {
        await new Promise(resolve => setTimeout(resolve, 5));
      });

      healthChecker.registerCheck('slow', slowCheck);
      const result = await healthChecker.runChecks();

      expect(result.components[0].responseTime).toBeGreaterThanOrEqual(0);
    });

    it('should track overall response time', async () => {
      healthChecker.registerCheck('service1', HealthChecks.alive('service1'));
      healthChecker.registerCheck('service2', HealthChecks.alive('service2'));

      const result = await healthChecker.runChecks();

      expect(result.overallResponseTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Component Health Details', () => {
    it('should include message in component health', async () => {
      const check = HealthChecks.alive('test');
      healthChecker.registerCheck('test', check);

      const result = await healthChecker.runChecks();

      expect(result.components[0].message).toBeDefined();
    });

    it('should include details in component health', async () => {
      const check = HealthChecks.memory('memory');
      healthChecker.registerCheck('memory', check);

      const result = await healthChecker.runChecks();

      expect(result.components[0].details).toBeDefined();
    });

    it('should include timestamp in component health', async () => {
      const check = HealthChecks.alive('test');
      healthChecker.registerCheck('test', check);

      const result = await healthChecker.runChecks();

      expect(result.components[0].timestamp).toBeDefined();
      expect(new Date(result.components[0].timestamp).getTime()).toBeGreaterThan(0);
    });
  });

  describe('Integration Scenarios', () => {
    it('should monitor typical service stack', async () => {
      healthChecker.registerCheck('api', HealthChecks.alive('api'));
      healthChecker.registerCheck('database', HealthChecks.alive('database'));
      healthChecker.registerCheck('cache', HealthChecks.alive('cache'));
      healthChecker.registerCheck('memory', HealthChecks.memory('memory'));

      const result = await healthChecker.runChecks();

      expect(result.components.length).toBeGreaterThan(0);
      expect(result.status).toBeDefined();
    });

    it('should handle mixed healthy and degraded components', async () => {
      healthChecker.registerCheck('healthy-1', HealthChecks.alive('healthy-1'));
      healthChecker.registerCheck('healthy-2', HealthChecks.alive('healthy-2'));

      const degradedCheck = async () => ({
        name: 'degraded',
        status: 'degraded' as HealthStatus,
        timestamp: new Date().toISOString(),
        responseTime: 100,
      });

      healthChecker.registerCheck('degraded', degradedCheck);

      const result = await healthChecker.runChecks();

      expect(result.status).toBe('degraded');
      expect(result.components.filter(c => c.status === 'healthy')).toHaveLength(2);
      expect(result.components.filter(c => c.status === 'degraded')).toHaveLength(1);
    });
  });
});
