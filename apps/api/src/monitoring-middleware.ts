/**
 * Express middleware for monitoring, alerting, and compliance
 * Provides endpoints for alert management, SLA status, and compliance reporting
 */

import { Request, Response, NextFunction } from 'express';
import {
  AlertManager,
  SLAManager,
  ComplianceAuditor,
  HealthMonitor,
  MonitoringHub,
  AlertRule,
  SLAConfig,
  ComplianceLog,
} from '@omega-v/runtime';

export interface MonitoringMiddlewareOptions {
  hub: MonitoringHub;
}

declare global {
  namespace Express {
    interface Request {
      monitoring?: {
        alertManager: AlertManager;
        slaManager: SLAManager;
        complianceAuditor: ComplianceAuditor;
        healthMonitor: HealthMonitor;
      };
    }
  }
}

/**
 * Attach monitoring to request
 */
export function attachMonitoringMiddleware(options: MonitoringMiddlewareOptions) {
  return (req: Request, res: Response, next: NextFunction) => {
    req.monitoring = {
      alertManager: options.hub.getAlertManager(),
      slaManager: options.hub.getSLAManager(),
      complianceAuditor: options.hub.getComplianceAuditor(),
      healthMonitor: options.hub.getHealthMonitor(),
    };
    next();
  };
}

/**
 * Register alert rule endpoint
 */
export function registerAlertRuleEndpoint(hub: MonitoringHub) {
  return (req: Request, res: Response) => {
    const { id, name, description, enabled, severity, thresholds, actions, cooldownPeriod } =
      req.body;

    if (!id || !name || !severity || !thresholds) {
      return res.status(400).json({
        error: 'Missing required fields: id, name, severity, thresholds',
      });
    }

    const rule: AlertRule = {
      id,
      name,
      description: description || '',
      enabled: enabled !== false,
      severity,
      thresholds,
      actions: actions || [],
      cooldownPeriod: cooldownPeriod || 300000,
      createdAt: Date.now(),
    };

    try {
      const alertManager = hub.getAlertManager();
      alertManager.registerRule(rule);

      res.status(201).json({
        id: rule.id,
        message: 'Alert rule registered successfully',
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to register alert rule',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}

/**
 * Evaluate metric endpoint
 */
export function evaluateMetricEndpoint(hub: MonitoringHub) {
  return async (req: Request, res: Response) => {
    const { metric, value } = req.body;

    if (!metric || value === undefined) {
      return res.status(400).json({
        error: 'Missing required fields: metric, value',
      });
    }

    try {
      const alertManager = hub.getAlertManager();
      await alertManager.evaluateMetric(metric, value);

      res.json({
        metric,
        value,
        message: 'Metric evaluated successfully',
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to evaluate metric',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}

/**
 * Get active alerts endpoint
 */
export function getActiveAlertsEndpoint(hub: MonitoringHub) {
  return (req: Request, res: Response) => {
    try {
      const alertManager = hub.getAlertManager();
      const alerts = alertManager.getActiveAlerts();

      res.json({
        count: alerts.length,
        alerts: alerts.map((a) => ({
          id: a.id,
          ruleId: a.ruleId,
          ruleName: a.ruleName,
          severity: a.severity,
          status: a.status,
          message: a.message,
          metric: a.metric,
          value: a.value,
          triggeredAt: new Date(a.triggeredAt).toISOString(),
        })),
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to retrieve alerts',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}

/**
 * Acknowledge alert endpoint
 */
export function acknowledgeAlertEndpoint(hub: MonitoringHub) {
  return async (req: Request, res: Response) => {
    const { alertId, acknowledgedBy } = req.body;

    if (!alertId) {
      return res.status(400).json({
        error: 'Missing required field: alertId',
      });
    }

    try {
      const alertManager = hub.getAlertManager();
      const result = await alertManager.acknowledgeAlert(alertId, acknowledgedBy || 'system');

      res.json({
        alertId,
        acknowledged: result,
        message: result ? 'Alert acknowledged' : 'Alert not found',
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to acknowledge alert',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}

/**
 * Register SLA endpoint
 */
export function registerSLAEndpoint(hub: MonitoringHub) {
  return (req: Request, res: Response) => {
    const { id, name, metric, targetPercentage, window, enabled } = req.body;

    if (!id || !name || !metric || !targetPercentage || !window) {
      return res.status(400).json({
        error: 'Missing required fields: id, name, metric, targetPercentage, window',
      });
    }

    const sla: SLAConfig = {
      id,
      name,
      metric,
      targetPercentage,
      window,
      enabled: enabled !== false,
      createdAt: Date.now(),
    };

    try {
      const slaManager = hub.getSLAManager();
      slaManager.registerSLA(sla);

      res.status(201).json({
        id: sla.id,
        message: 'SLA registered successfully',
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to register SLA',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}

/**
 * Update SLA metric endpoint
 */
export function updateSLAMetricEndpoint(hub: MonitoringHub) {
  return (req: Request, res: Response) => {
    const { slaId, achieved, target } = req.body;

    if (!slaId || achieved === undefined || target === undefined) {
      return res.status(400).json({
        error: 'Missing required fields: slaId, achieved, target',
      });
    }

    try {
      const slaManager = hub.getSLAManager();
      slaManager.updateSLAMetric(slaId, achieved, target);

      const status = slaManager.getSLAStatus(slaId);

      res.json({
        slaId,
        status: status?.status,
        achievedPercentage: status?.achievedPercentage,
        targetPercentage: status?.targetPercentage,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to update SLA metric',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}

/**
 * Get SLA status endpoint
 */
export function getSLAStatusEndpoint(hub: MonitoringHub) {
  return (req: Request, res: Response) => {
    const { slaId } = req.params;

    try {
      const slaManager = hub.getSLAManager();
      const status = slaManager.getSLAStatus(slaId);

      if (!status) {
        return res.status(404).json({
          error: 'SLA not found',
          slaId,
        });
      }

      res.json({
        id: status.slaId,
        name: status.slaName,
        metric: status.metric,
        status: status.status,
        targetPercentage: status.targetPercentage,
        achievedPercentage: status.achievedPercentage,
        window: status.window,
        lastUpdated: new Date(status.lastUpdated).toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to retrieve SLA status',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}

/**
 * Get all SLA statuses endpoint
 */
export function getAllSLAStatusEndpoint(hub: MonitoringHub) {
  return (req: Request, res: Response) => {
    try {
      const slaManager = hub.getSLAManager();
      const statuses = slaManager.getAllSLAStatus();

      res.json({
        count: statuses.length,
        slas: statuses.map((s) => ({
          id: s.slaId,
          name: s.slaName,
          metric: s.metric,
          status: s.status,
          targetPercentage: s.targetPercentage,
          achievedPercentage: s.achievedPercentage,
        })),
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to retrieve SLA statuses',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}

/**
 * Get breached SLAs endpoint
 */
export function getBreachedSLAsEndpoint(hub: MonitoringHub) {
  return (req: Request, res: Response) => {
    try {
      const slaManager = hub.getSLAManager();
      const breached = slaManager.getBreachedSLAs();

      res.json({
        count: breached.length,
        slas: breached.map((s) => ({
          id: s.slaId,
          name: s.slaName,
          metric: s.metric,
          targetPercentage: s.targetPercentage,
          achievedPercentage: s.achievedPercentage,
        })),
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to retrieve breached SLAs',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}

/**
 * Log compliance event endpoint
 */
export function logComplianceEventEndpoint(hub: MonitoringHub) {
  return (req: Request, res: Response) => {
    const { type, action, actor, resource, result } = req.body;

    if (!type || !action || !actor || !resource || !result) {
      return res.status(400).json({
        error: 'Missing required fields: type, action, actor, resource, result',
      });
    }

    try {
      const auditor = hub.getComplianceAuditor();
      const event: Omit<ComplianceLog, 'id' | 'timestamp'> = {
        type: type as any,
        action,
        actor,
        resource,
        result: result as any,
      };

      auditor.logEvent(event);

      res.status(201).json({
        message: 'Compliance event logged successfully',
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to log compliance event',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}

/**
 * Generate compliance report endpoint
 */
export function generateComplianceReportEndpoint(hub: MonitoringHub) {
  return (req: Request, res: Response) => {
    const { framework } = req.body;

    if (!framework) {
      return res.status(400).json({
        error: 'Missing required field: framework',
      });
    }

    try {
      const auditor = hub.getComplianceAuditor();
      const report = auditor.generateReport(framework as any);

      res.status(201).json({
        id: report.id,
        framework: report.framework,
        complianceLevel: report.complianceLevel,
        score: report.score,
        findingCount: report.findings.length,
        generatedAt: new Date(report.generatedAt).toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to generate compliance report',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}

/**
 * Get compliance report endpoint
 */
export function getComplianceReportEndpoint(hub: MonitoringHub) {
  return (req: Request, res: Response) => {
    const { reportId } = req.params;

    try {
      const auditor = hub.getComplianceAuditor();
      const report = auditor.getReport(reportId);

      if (!report) {
        return res.status(404).json({
          error: 'Compliance report not found',
          reportId,
        });
      }

      res.json({
        id: report.id,
        framework: report.framework,
        complianceLevel: report.complianceLevel,
        score: report.score,
        findings: report.findings.map((f) => ({
          id: f.id,
          title: f.title,
          severity: f.severity,
          status: f.status,
        })),
        generatedAt: new Date(report.generatedAt).toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to retrieve compliance report',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}

/**
 * Record health metric endpoint
 */
export function recordMetricEndpoint(hub: MonitoringHub) {
  return (req: Request, res: Response) => {
    const { name, value, unit, labels } = req.body;

    if (!name || value === undefined) {
      return res.status(400).json({
        error: 'Missing required fields: name, value',
      });
    }

    try {
      const monitor = hub.getHealthMonitor();
      monitor.recordMetric({
        name,
        value,
        unit: unit || '',
        timestamp: Date.now(),
        labels,
      });

      res.json({
        message: 'Metric recorded successfully',
        metric: name,
        value,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to record metric',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}

/**
 * Get system health endpoint
 */
export function getSystemHealthEndpoint(hub: MonitoringHub) {
  return (req: Request, res: Response) => {
    try {
      const health = hub.getSystemHealth();

      res.json({
        status: health.status,
        activeAlerts: health.activeAlerts,
        breachedSLAs: health.breachedSLAs,
        anomalies: health.anomalies,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to retrieve system health',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}

/**
 * Initialize monitoring middleware stack
 */
export function initializeMonitoringMiddleware(
  options: MonitoringMiddlewareOptions,
  enableEndpoints?: boolean
) {
  const endpoints = [];

  if (enableEndpoints !== false) {
    endpoints.push((req: Request, res: Response, next: NextFunction) => {
      // Alert endpoints
      if (req.method === 'POST' && req.path === '/api/monitoring/alerts/rules') {
        return registerAlertRuleEndpoint(options.hub)(req, res);
      }
      if (req.method === 'POST' && req.path === '/api/monitoring/alerts/evaluate') {
        return evaluateMetricEndpoint(options.hub)(req, res);
      }
      if (req.method === 'GET' && req.path === '/api/monitoring/alerts') {
        return getActiveAlertsEndpoint(options.hub)(req, res);
      }
      if (req.method === 'POST' && req.path === '/api/monitoring/alerts/acknowledge') {
        return acknowledgeAlertEndpoint(options.hub)(req, res);
      }

      // SLA endpoints
      if (req.method === 'POST' && req.path === '/api/monitoring/slas') {
        return registerSLAEndpoint(options.hub)(req, res);
      }
      if (req.method === 'POST' && req.path === '/api/monitoring/slas/metric') {
        return updateSLAMetricEndpoint(options.hub)(req, res);
      }
      if (req.method === 'GET' && req.path.match(/^\/api\/monitoring\/slas\/[^\/]+$/)) {
        const slaId = req.path.split('/')[4];
        req.params.slaId = slaId;
        return getSLAStatusEndpoint(options.hub)(req, res);
      }
      if (req.method === 'GET' && req.path === '/api/monitoring/slas') {
        return getAllSLAStatusEndpoint(options.hub)(req, res);
      }
      if (req.method === 'GET' && req.path === '/api/monitoring/slas/breached') {
        return getBreachedSLAsEndpoint(options.hub)(req, res);
      }

      // Compliance endpoints
      if (req.method === 'POST' && req.path === '/api/monitoring/compliance/events') {
        return logComplianceEventEndpoint(options.hub)(req, res);
      }
      if (req.method === 'POST' && req.path === '/api/monitoring/compliance/reports') {
        return generateComplianceReportEndpoint(options.hub)(req, res);
      }
      if (
        req.method === 'GET' &&
        req.path.match(/^\/api\/monitoring\/compliance\/reports\/[^\/]+$/)
      ) {
        const reportId = req.path.split('/')[5];
        req.params.reportId = reportId;
        return getComplianceReportEndpoint(options.hub)(req, res);
      }

      // Health endpoints
      if (req.method === 'POST' && req.path === '/api/monitoring/metrics') {
        return recordMetricEndpoint(options.hub)(req, res);
      }
      if (req.method === 'GET' && req.path === '/api/monitoring/health') {
        return getSystemHealthEndpoint(options.hub)(req, res);
      }

      next();
    });
  }

  return [attachMonitoringMiddleware(options), ...endpoints];
}
