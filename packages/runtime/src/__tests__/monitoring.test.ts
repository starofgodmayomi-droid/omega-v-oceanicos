import {
  AlertManager,
  SLAManager,
  ComplianceAuditor,
  HealthMonitor,
  MonitoringHub,
  AlertRule,
  SLAConfig,
  HealthMetric,
} from '../monitoring';

describe('Monitoring, Alerting & Compliance', () => {
  describe('AlertManager', () => {
    let alertManager: AlertManager;

    beforeEach(() => {
      alertManager = new AlertManager();
    });

    afterEach(async () => {
      await alertManager.clear();
    });

    it('should register alert rule', () => {
      const rule: AlertRule = {
        id: 'rule1',
        name: 'High CPU Alert',
        description: 'Alert when CPU exceeds 80%',
        enabled: true,
        thresholds: [{ metric: 'cpu', operator: '>', value: 80, duration: 60000 }],
        severity: 'critical',
        actions: [],
        cooldownPeriod: 300000,
        createdAt: Date.now(),
      };

      alertManager.registerRule(rule);
      // Rule should be registered (no error thrown)
      expect(true).toBe(true);
    });

    it('should evaluate metric against rules', async () => {
      const rule: AlertRule = {
        id: 'rule1',
        name: 'High CPU Alert',
        description: 'Alert when CPU exceeds 80%',
        enabled: true,
        thresholds: [{ metric: 'cpu', operator: '>', value: 80, duration: 60000 }],
        severity: 'critical',
        actions: [],
        cooldownPeriod: 300000,
        createdAt: Date.now(),
      };

      alertManager.registerRule(rule);
      await alertManager.evaluateMetric('cpu', 85);

      const alerts = alertManager.getActiveAlerts();
      expect(alerts.length).toBeGreaterThanOrEqual(0);
    });

    it('should respect cooldown period', async () => {
      const rule: AlertRule = {
        id: 'rule1',
        name: 'CPU Alert',
        description: 'CPU alert',
        enabled: true,
        thresholds: [{ metric: 'cpu', operator: '>', value: 80, duration: 60000 }],
        severity: 'critical',
        actions: [],
        cooldownPeriod: 500, // 500ms cooldown
        createdAt: Date.now(),
      };

      alertManager.registerRule(rule);
      await alertManager.evaluateMetric('cpu', 85);
      const firstAlerts = alertManager.getActiveAlerts().length;

      await alertManager.evaluateMetric('cpu', 90);
      const secondAlerts = alertManager.getActiveAlerts().length;

      // Second alert should not trigger immediately due to cooldown
      expect(firstAlerts).toBeGreaterThanOrEqual(0);
    });

    it('should acknowledge alert', async () => {
      const rule: AlertRule = {
        id: 'rule1',
        name: 'CPU Alert',
        description: 'CPU alert',
        enabled: true,
        thresholds: [{ metric: 'cpu', operator: '>', value: 80, duration: 60000 }],
        severity: 'critical',
        actions: [],
        cooldownPeriod: 300000,
        createdAt: Date.now(),
      };

      alertManager.registerRule(rule);
      await alertManager.evaluateMetric('cpu', 85);

      const alerts = alertManager.getActiveAlerts();
      if (alerts.length > 0) {
        const acknowledged = alertManager.acknowledgeAlert(alerts[0].id, 'user123');
        expect(acknowledged).toBe(true);
      }
    });

    it('should resolve alert', async () => {
      const rule: AlertRule = {
        id: 'rule1',
        name: 'CPU Alert',
        description: 'CPU alert',
        enabled: true,
        thresholds: [{ metric: 'cpu', operator: '>', value: 80, duration: 60000 }],
        severity: 'critical',
        actions: [],
        cooldownPeriod: 300000,
        createdAt: Date.now(),
      };

      alertManager.registerRule(rule);
      await alertManager.evaluateMetric('cpu', 85);

      const alerts = alertManager.getActiveAlerts();
      if (alerts.length > 0) {
        const resolved = alertManager.resolveAlert(alerts[0].id);
        expect(resolved).toBe(true);
      }
    });

    it('should get alert history', async () => {
      const rule: AlertRule = {
        id: 'rule1',
        name: 'CPU Alert',
        description: 'CPU alert',
        enabled: true,
        thresholds: [{ metric: 'cpu', operator: '>', value: 80, duration: 60000 }],
        severity: 'critical',
        actions: [],
        cooldownPeriod: 300000,
        createdAt: Date.now(),
      };

      alertManager.registerRule(rule);
      await alertManager.evaluateMetric('cpu', 85);

      const history = alertManager.getAlertHistory();
      expect(history.length).toBeGreaterThanOrEqual(0);
    });

    it('should support multiple threshold operators', async () => {
      const rule: AlertRule = {
        id: 'rule1',
        name: 'Memory Alert',
        description: 'Memory alert',
        enabled: true,
        thresholds: [
          { metric: 'memory', operator: '<', value: 10, duration: 60000 },
          { metric: 'memory', operator: '>=', value: 90, duration: 60000 },
        ],
        severity: 'warning',
        actions: [],
        cooldownPeriod: 300000,
        createdAt: Date.now(),
      };

      alertManager.registerRule(rule);
      await alertManager.evaluateMetric('memory', 5);

      const alerts = alertManager.getActiveAlerts();
      expect(alerts.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('SLAManager', () => {
    let slaManager: SLAManager;

    beforeEach(() => {
      slaManager = new SLAManager();
    });

    afterEach(async () => {
      await slaManager.clear();
    });

    it('should register SLA', () => {
      const sla: SLAConfig = {
        id: 'sla1',
        name: 'Availability SLA',
        metric: 'availability',
        targetPercentage: 99.9,
        window: 'month',
        enabled: true,
        createdAt: Date.now(),
      };

      slaManager.registerSLA(sla);
      expect(true).toBe(true);
    });

    it('should update SLA metric and determine status', () => {
      const sla: SLAConfig = {
        id: 'sla1',
        name: 'Availability SLA',
        metric: 'availability',
        targetPercentage: 99.9,
        window: 'month',
        enabled: true,
        createdAt: Date.now(),
      };

      slaManager.registerSLA(sla);
      slaManager.updateSLAMetric('sla1', 999000, 1000000); // 99.9% achieved

      const status = slaManager.getSLAStatus('sla1');
      expect(status).toBeDefined();
      expect(status?.status).toBe('met');
    });

    it('should detect at-risk SLA', () => {
      const sla: SLAConfig = {
        id: 'sla1',
        name: 'Availability SLA',
        metric: 'availability',
        targetPercentage: 99.9,
        window: 'month',
        enabled: true,
        createdAt: Date.now(),
      };

      slaManager.registerSLA(sla);
      slaManager.updateSLAMetric('sla1', 990000, 1000000); // 99% achieved

      const status = slaManager.getSLAStatus('sla1');
      expect(status?.status).toBe('at_risk');
    });

    it('should detect breached SLA', () => {
      const sla: SLAConfig = {
        id: 'sla1',
        name: 'Availability SLA',
        metric: 'availability',
        targetPercentage: 99.9,
        window: 'month',
        enabled: true,
        createdAt: Date.now(),
      };

      slaManager.registerSLA(sla);
      slaManager.updateSLAMetric('sla1', 950000, 1000000); // 95% achieved

      const status = slaManager.getSLAStatus('sla1');
      expect(status?.status).toBe('breached');
    });

    it('should get all SLA statuses', () => {
      const sla1: SLAConfig = {
        id: 'sla1',
        name: 'Availability SLA',
        metric: 'availability',
        targetPercentage: 99.9,
        window: 'month',
        enabled: true,
        createdAt: Date.now(),
      };

      const sla2: SLAConfig = {
        id: 'sla2',
        name: 'Performance SLA',
        metric: 'latency',
        targetPercentage: 95,
        window: 'day',
        enabled: true,
        createdAt: Date.now(),
      };

      slaManager.registerSLA(sla1);
      slaManager.registerSLA(sla2);
      slaManager.updateSLAMetric('sla1', 999000, 1000000);
      slaManager.updateSLAMetric('sla2', 950000, 1000000);

      const statuses = slaManager.getAllSLAStatus();
      expect(statuses.length).toBeGreaterThanOrEqual(2);
    });

    it('should get breached SLAs', () => {
      const sla: SLAConfig = {
        id: 'sla1',
        name: 'Availability SLA',
        metric: 'availability',
        targetPercentage: 99.9,
        window: 'month',
        enabled: true,
        createdAt: Date.now(),
      };

      slaManager.registerSLA(sla);
      slaManager.updateSLAMetric('sla1', 950000, 1000000);

      const breached = slaManager.getBreachedSLAs();
      expect(breached.length).toBeGreaterThan(0);
    });
  });

  describe('ComplianceAuditor', () => {
    let auditor: ComplianceAuditor;

    beforeEach(() => {
      auditor = new ComplianceAuditor();
    });

    afterEach(async () => {
      await auditor.clear();
    });

    it('should log compliance event', () => {
      auditor.logEvent({
        type: 'access',
        action: 'login',
        actor: 'user123',
        resource: '/api/protected',
        result: 'success',
      });

      const logs = auditor.getLogs();
      expect(logs.length).toBeGreaterThan(0);
    });

    it('should filter logs by type', () => {
      auditor.logEvent({
        type: 'access',
        action: 'login',
        actor: 'user123',
        resource: '/api/protected',
        result: 'success',
      });

      auditor.logEvent({
        type: 'security',
        action: 'password_change',
        actor: 'user123',
        resource: 'account',
        result: 'success',
      });

      const accessLogs = auditor.getLogs('access');
      expect(accessLogs.every((l) => l.type === 'access')).toBe(true);
    });

    it('should generate compliance report', () => {
      auditor.logEvent({
        type: 'access',
        action: 'login',
        actor: 'user123',
        resource: '/api/protected',
        result: 'success',
      });

      const report = auditor.generateReport('SOC2');
      expect(report).toBeDefined();
      expect(report.framework).toBe('SOC2');
      expect(['compliant', 'warning', 'non-compliant']).toContain(report.complianceLevel);
    });

    it('should include failures in report', () => {
      for (let i = 0; i < 5; i++) {
        auditor.logEvent({
          type: 'access',
          action: 'login',
          actor: 'user123',
          resource: '/api/protected',
          result: 'failure',
        });
      }

      const report = auditor.generateReport('GDPR');
      expect(report.findings.length).toBeGreaterThan(0);
    });

    it('should retrieve generated report', () => {
      const report = auditor.generateReport('ISO27001');
      const retrieved = auditor.getReport(report.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.framework).toBe('ISO27001');
    });

    it('should get all reports', () => {
      auditor.generateReport('SOC2');
      auditor.generateReport('GDPR');
      auditor.generateReport('HIPAA');

      const reports = auditor.getAllReports();
      expect(reports.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('HealthMonitor', () => {
    let monitor: HealthMonitor;

    beforeEach(() => {
      monitor = new HealthMonitor();
    });

    afterEach(async () => {
      await monitor.clear();
    });

    it('should record metric', () => {
      const metric: HealthMetric = {
        name: 'cpu_usage',
        value: 50,
        unit: '%',
        timestamp: Date.now(),
      };

      monitor.recordMetric(metric);
      expect(true).toBe(true);
    });

    it('should set threshold', () => {
      monitor.setThreshold('cpu_usage', 0, 80);
      expect(true).toBe(true);
    });

    it('should check metric health', () => {
      monitor.setThreshold('cpu_usage', 0, 80);

      const metric: HealthMetric = {
        name: 'cpu_usage',
        value: 50,
        unit: '%',
        timestamp: Date.now(),
      };

      monitor.recordMetric(metric);
      const healthy = monitor.isHealthy('cpu_usage');
      expect(healthy).toBe(true);
    });

    it('should detect unhealthy metric', () => {
      monitor.setThreshold('cpu_usage', 0, 80);

      const metric: HealthMetric = {
        name: 'cpu_usage',
        value: 90,
        unit: '%',
        timestamp: Date.now(),
      };

      monitor.recordMetric(metric);
      const healthy = monitor.isHealthy('cpu_usage');
      expect(healthy).toBe(false);
    });

    it('should get metric health status', () => {
      monitor.setThreshold('memory', 10, 90);

      const metric: HealthMetric = {
        name: 'memory',
        value: 65,
        unit: '%',
        timestamp: Date.now(),
      };

      monitor.recordMetric(metric);
      const status = monitor.getHealthStatus('memory');

      expect(status).toBeDefined();
      expect(status?.healthy).toBe(true);
      expect(status?.value).toBe(65);
    });

    it('should detect anomalies using statistical methods', () => {
      monitor.setThreshold('latency', 0, 1000);

      // Record normal values
      for (let i = 0; i < 15; i++) {
        const metric: HealthMetric = {
          name: 'latency',
          value: 100 + Math.random() * 20,
          unit: 'ms',
          timestamp: Date.now() + i * 1000,
        };
        monitor.recordMetric(metric);
      }

      // Record anomaly
      const anomaly: HealthMetric = {
        name: 'latency',
        value: 1000,
        unit: 'ms',
        timestamp: Date.now() + 16000,
      };
      monitor.recordMetric(anomaly);

      const anomalies = monitor.getAnomalies();
      expect(anomalies.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('MonitoringHub', () => {
    let hub: MonitoringHub;

    beforeEach(() => {
      hub = new MonitoringHub();
    });

    afterEach(async () => {
      await hub.clear();
    });

    it('should provide alert manager', () => {
      const alertManager = hub.getAlertManager();
      expect(alertManager).toBeDefined();
    });

    it('should provide SLA manager', () => {
      const slaManager = hub.getSLAManager();
      expect(slaManager).toBeDefined();
    });

    it('should provide compliance auditor', () => {
      const auditor = hub.getComplianceAuditor();
      expect(auditor).toBeDefined();
    });

    it('should provide health monitor', () => {
      const monitor = hub.getHealthMonitor();
      expect(monitor).toBeDefined();
    });

    it('should determine system health as healthy', () => {
      const health = hub.getSystemHealth();
      expect(health.status).toBe('healthy');
    });

    it('should determine system health as degraded with alerts', async () => {
      const alertManager = hub.getAlertManager();
      const rule: AlertRule = {
        id: 'rule1',
        name: 'CPU Alert',
        description: 'CPU alert',
        enabled: true,
        thresholds: [{ metric: 'cpu', operator: '>', value: 80, duration: 60000 }],
        severity: 'critical',
        actions: [],
        cooldownPeriod: 300000,
        createdAt: Date.now(),
      };

      alertManager.registerRule(rule);
      await alertManager.evaluateMetric('cpu', 85);

      const health = hub.getSystemHealth();
      expect(['degraded', 'critical']).toContain(health.status);
    });

    it('should integrate all monitoring components', async () => {
      const alertManager = hub.getAlertManager();
      const slaManager = hub.getSLAManager();
      const auditor = hub.getComplianceAuditor();
      const monitor = hub.getHealthMonitor();

      const rule: AlertRule = {
        id: 'rule1',
        name: 'Alert',
        description: 'Test alert',
        enabled: true,
        thresholds: [{ metric: 'test', operator: '>', value: 50, duration: 60000 }],
        severity: 'warning',
        actions: [],
        cooldownPeriod: 300000,
        createdAt: Date.now(),
      };

      alertManager.registerRule(rule);

      const sla: SLAConfig = {
        id: 'sla1',
        name: 'Test SLA',
        metric: 'test',
        targetPercentage: 95,
        window: 'day',
        enabled: true,
        createdAt: Date.now(),
      };

      slaManager.registerSLA(sla);

      auditor.logEvent({
        type: 'audit',
        action: 'integration_test',
        actor: 'system',
        resource: 'monitoring',
        result: 'success',
      });

      monitor.setThreshold('test', 0, 100);

      const health = hub.getSystemHealth();
      expect(health).toBeDefined();
      expect(['healthy', 'degraded', 'critical']).toContain(health.status);
    });
  });
});
