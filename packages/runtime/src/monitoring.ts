/**
 * Advanced Monitoring, Alerting & Compliance System
 * Comprehensive observability with adaptive thresholds, SLA tracking, and compliance audit
 */

export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertStatus = 'triggered' | 'acknowledged' | 'resolved';
export type ComplianceLevel = 'compliant' | 'warning' | 'non-compliant';

export interface MetricThreshold {
  metric: string;
  operator: '<' | '>' | '<=' | '>=' | '==';
  value: number;
  duration: number; // in milliseconds
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  thresholds: MetricThreshold[];
  severity: AlertSeverity;
  actions: AlertAction[];
  cooldownPeriod: number; // in milliseconds
  createdAt: number;
}

export interface AlertAction {
  type: 'webhook' | 'email' | 'slack' | 'pagerduty' | 'custom';
  config: Record<string, any>;
}

export interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: AlertSeverity;
  status: AlertStatus;
  message: string;
  metric: string;
  value: number;
  threshold: number;
  triggeredAt: number;
  acknowledgedAt?: number;
  resolvedAt?: number;
  acknowledgedBy?: string;
  metadata?: Record<string, any>;
}

export interface SLAConfig {
  id: string;
  name: string;
  metric: string;
  targetPercentage: number;
  window: 'hour' | 'day' | 'week' | 'month';
  enabled: boolean;
  createdAt: number;
}

export interface SLAStatus {
  slaId: string;
  slaName: string;
  metric: string;
  targetPercentage: number;
  achievedPercentage: number;
  status: 'met' | 'at_risk' | 'breached';
  window: string;
  incidents: number;
  lastUpdated: number;
}

export interface ComplianceLog {
  id: string;
  type: 'audit' | 'access' | 'change' | 'security' | 'data_retention';
  action: string;
  actor: string;
  resource: string;
  result: 'success' | 'failure';
  metadata?: Record<string, any>;
  timestamp: number;
}

export interface ComplianceReport {
  id: string;
  framework: 'SOC2' | 'GDPR' | 'HIPAA' | 'PCI-DSS' | 'ISO27001';
  period: { start: number; end: number };
  complianceLevel: ComplianceLevel;
  findings: ComplianceFinding[];
  score: number;
  generatedAt: number;
}

export interface ComplianceFinding {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  remediation: string;
  status: 'open' | 'in_progress' | 'resolved';
}

export interface HealthMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  labels?: Record<string, string>;
}

/**
 * Alert Manager: Handle alert rules and trigger management
 */
export class AlertManager {
  private rules: Map<string, AlertRule> = new Map();
  private alerts: Map<string, Alert> = new Map();
  private alertHistory: Alert[] = [];
  private lastAlertTime: Map<string, number> = new Map();
  private metrics: Map<string, HealthMetric[]> = new Map();

  /**
   * Register alert rule
   */
  registerRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * Evaluate metric against rules
   */
  async evaluateMetric(metric: string, value: number): Promise<void> {
    const timestamp = Date.now();

    if (!this.metrics.has(metric)) {
      this.metrics.set(metric, []);
    }
    this.metrics.get(metric)!.push({
      name: metric,
      value,
      unit: '',
      timestamp,
    });

    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;

      const triggered = this.checkThresholds(rule.thresholds, metric, value);

      if (triggered) {
        await this.triggerAlert(rule, metric, value);
      }
    }
  }

  /**
   * Check if thresholds are breached
   */
  private checkThresholds(thresholds: MetricThreshold[], metric: string, value: number): boolean {
    return thresholds.some((threshold) => {
      if (threshold.metric !== metric) return false;

      switch (threshold.operator) {
        case '<':
          return value < threshold.value;
        case '>':
          return value > threshold.value;
        case '<=':
          return value <= threshold.value;
        case '>=':
          return value >= threshold.value;
        case '==':
          return value === threshold.value;
        default:
          return false;
      }
    });
  }

  /**
   * Trigger alert with cooldown
   */
  private async triggerAlert(rule: AlertRule, metric: string, value: number): Promise<void> {
    const lastTime = this.lastAlertTime.get(rule.id) || 0;

    if (Date.now() - lastTime < rule.cooldownPeriod) {
      return;
    }

    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      status: 'triggered',
      message: rule.description,
      metric,
      value,
      threshold: rule.thresholds[0].value,
      triggeredAt: Date.now(),
    };

    this.alerts.set(alert.id, alert);
    this.alertHistory.push(alert);
    this.lastAlertTime.set(rule.id, Date.now());

    await this.executeActions(rule, alert);
  }

  /**
   * Execute alert actions
   */
  private async executeActions(rule: AlertRule, alert: Alert): Promise<void> {
    for (const action of rule.actions) {
      try {
        switch (action.type) {
          case 'webhook':
            await this.sendWebhook(action.config, alert);
            break;
          case 'email':
            await this.sendEmail(action.config, alert);
            break;
          case 'slack':
            await this.sendSlack(action.config, alert);
            break;
          case 'pagerduty':
            await this.sendPagerDuty(action.config, alert);
            break;
        }
      } catch (error) {
        // Action failed, continue with others
      }
    }
  }

  /**
   * Send webhook notification
   */
  private async sendWebhook(config: Record<string, any>, alert: Alert): Promise<void> {
    if (!config.url) return;

    try {
      await fetch(config.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alert),
      });
    } catch (error) {
      // Webhook failed
    }
  }

  /**
   * Send email notification
   */
  private async sendEmail(config: Record<string, any>, alert: Alert): Promise<void> {
    // Email sending would be implemented here
  }

  /**
   * Send Slack notification
   */
  private async sendSlack(config: Record<string, any>, alert: Alert): Promise<void> {
    // Slack integration would be implemented here
  }

  /**
   * Send PagerDuty notification
   */
  private async sendPagerDuty(config: Record<string, any>, alert: Alert): Promise<void> {
    // PagerDuty integration would be implemented here
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;

    alert.status = 'acknowledged';
    alert.acknowledgedAt = Date.now();
    alert.acknowledgedBy = acknowledgedBy;
    return true;
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;

    alert.status = 'resolved';
    alert.resolvedAt = Date.now();
    return true;
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values()).filter(
      (a) => a.status === 'triggered' || a.status === 'acknowledged',
    );
  }

  /**
   * Get alert history
   */
  getAlertHistory(limit: number = 100): Alert[] {
    return this.alertHistory.slice(-limit);
  }

  /**
   * Clear all alerts
   */
  async clear(): Promise<void> {
    this.rules.clear();
    this.alerts.clear();
    this.alertHistory = [];
    this.lastAlertTime.clear();
    this.metrics.clear();
  }
}

/**
 * SLA Manager: Track and monitor SLA compliance
 */
export class SLAManager {
  private slas: Map<string, SLAConfig> = new Map();
  private slaStatus: Map<string, SLAStatus> = new Map();
  private slaHistory: Array<{ slaId: string; status: SLAStatus; timestamp: number }> = [];

  /**
   * Register SLA
   */
  registerSLA(config: SLAConfig): void {
    this.slas.set(config.id, config);
  }

  /**
   * Update SLA metric
   */
  updateSLAMetric(slaId: string, achieved: number, target: number): void {
    const sla = this.slas.get(slaId);
    if (!sla) return;

    const achievedPercentage = (achieved / target) * 100;
    const status: SLAStatus = {
      slaId,
      slaName: sla.name,
      metric: sla.metric,
      targetPercentage: sla.targetPercentage,
      achievedPercentage,
      status:
        achievedPercentage >= sla.targetPercentage
          ? 'met'
          : achievedPercentage >= sla.targetPercentage * 0.99
            ? 'at_risk'
            : 'breached',
      window: sla.window,
      incidents: 0,
      lastUpdated: Date.now(),
    };

    this.slaStatus.set(slaId, status);
    this.slaHistory.push({ slaId, status, timestamp: Date.now() });
  }

  /**
   * Get SLA status
   */
  getSLAStatus(slaId: string): SLAStatus | undefined {
    return this.slaStatus.get(slaId);
  }

  /**
   * Get all SLA statuses
   */
  getAllSLAStatus(): SLAStatus[] {
    return Array.from(this.slaStatus.values());
  }

  /**
   * Get breached SLAs
   */
  getBreachedSLAs(): SLAStatus[] {
    return Array.from(this.slaStatus.values()).filter((s) => s.status === 'breached');
  }

  /**
   * Clear all SLAs
   */
  async clear(): Promise<void> {
    this.slas.clear();
    this.slaStatus.clear();
    this.slaHistory = [];
  }
}

/**
 * Compliance Auditor: Track and audit compliance events
 */
export class ComplianceAuditor {
  private logs: ComplianceLog[] = [];
  private reports: Map<string, ComplianceReport> = new Map();
  private retentionDays: number = 365;

  constructor(retentionDays: number = 365) {
    this.retentionDays = retentionDays;
  }

  /**
   * Log compliance event
   */
  logEvent(event: Omit<ComplianceLog, 'id' | 'timestamp'>): void {
    const log: ComplianceLog = {
      ...event,
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };

    this.logs.push(log);
  }

  /**
   * Get compliance logs
   */
  getLogs(type?: string, limit: number = 100): ComplianceLog[] {
    let filtered = this.logs;

    if (type) {
      filtered = filtered.filter((l) => l.type === type);
    }

    return filtered.slice(-limit);
  }

  /**
   * Generate compliance report
   */
  generateReport(framework: ComplianceReport['framework']): ComplianceReport {
    const now = Date.now();
    const monthAgo = now - 30 * 24 * 60 * 60 * 1000;
    const relevantLogs = this.logs.filter((l) => l.timestamp >= monthAgo);

    const failures = relevantLogs.filter((l) => l.result === 'failure').length;
    const total = relevantLogs.length;
    const successRate = total > 0 ? ((total - failures) / total) * 100 : 100;

    const findings: ComplianceFinding[] = [];
    if (failures > 0) {
      findings.push({
        id: `finding_${Date.now()}`,
        title: 'Authentication Failures Detected',
        description: `${failures} authentication failures in the past 30 days`,
        severity: failures > 10 ? 'critical' : failures > 5 ? 'high' : 'medium',
        category: 'Security',
        remediation: 'Review authentication logs and implement additional security measures',
        status: 'open',
      });
    }

    const report: ComplianceReport = {
      id: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      framework,
      period: { start: monthAgo, end: now },
      complianceLevel: successRate >= 95 ? 'compliant' : successRate >= 80 ? 'warning' : 'non-compliant',
      findings,
      score: Math.min(100, Math.round(successRate)),
      generatedAt: now,
    };

    this.reports.set(report.id, report);
    return report;
  }

  /**
   * Get report
   */
  getReport(reportId: string): ComplianceReport | undefined {
    return this.reports.get(reportId);
  }

  /**
   * Get all reports
   */
  getAllReports(): ComplianceReport[] {
    return Array.from(this.reports.values());
  }

  /**
   * Cleanup old logs
   */
  async cleanup(): Promise<void> {
    const cutoff = Date.now() - this.retentionDays * 24 * 60 * 60 * 1000;
    this.logs = this.logs.filter((l) => l.timestamp > cutoff);
  }

  /**
   * Clear all logs and reports
   */
  async clear(): Promise<void> {
    this.logs = [];
    this.reports.clear();
  }
}

/**
 * Health Monitor: Adaptive health monitoring with anomaly detection
 */
export class HealthMonitor {
  private metrics: Map<string, HealthMetric[]> = new Map();
  private thresholds: Map<string, { min: number; max: number }> = new Map();
  private anomalies: Array<{ metric: string; value: number; timestamp: number }> = [];
  private windowSize: number = 100;

  /**
   * Record metric
   */
  recordMetric(metric: HealthMetric): void {
    if (!this.metrics.has(metric.name)) {
      this.metrics.set(metric.name, []);
    }

    const history = this.metrics.get(metric.name)!;
    history.push(metric);

    if (history.length > this.windowSize) {
      history.shift();
    }

    this.detectAnomaly(metric);
  }

  /**
   * Detect anomalies using statistical methods
   */
  private detectAnomaly(metric: HealthMetric): void {
    const history = this.metrics.get(metric.name) || [];

    if (history.length < 10) return;

    const values = history.map((m) => m.value);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    if (Math.abs(metric.value - mean) > 3 * stdDev) {
      this.anomalies.push({
        metric: metric.name,
        value: metric.value,
        timestamp: metric.timestamp,
      });
    }
  }

  /**
   * Set threshold for metric
   */
  setThreshold(metric: string, min: number, max: number): void {
    this.thresholds.set(metric, { min, max });
  }

  /**
   * Check if metric is healthy
   */
  isHealthy(metric: string): boolean {
    const history = this.metrics.get(metric);
    if (!history || history.length === 0) return true;

    const threshold = this.thresholds.get(metric);
    if (!threshold) return true;

    const latestValue = history[history.length - 1].value;
    return latestValue >= threshold.min && latestValue <= threshold.max;
  }

  /**
   * Get metric health status
   */
  getHealthStatus(metric: string): { healthy: boolean; value: number; timestamp: number } | null {
    const history = this.metrics.get(metric);
    if (!history || history.length === 0) return null;

    const latest = history[history.length - 1];
    return {
      healthy: this.isHealthy(metric),
      value: latest.value,
      timestamp: latest.timestamp,
    };
  }

  /**
   * Get recent anomalies
   */
  getAnomalies(limit: number = 100): Array<{ metric: string; value: number; timestamp: number }> {
    return this.anomalies.slice(-limit);
  }

  /**
   * Clear all metrics
   */
  async clear(): Promise<void> {
    this.metrics.clear();
    this.anomalies = [];
  }
}

/**
 * Monitoring Hub: Unified monitoring coordination
 */
export class MonitoringHub {
  private alertManager: AlertManager;
  private slaManager: SLAManager;
  private complianceAuditor: ComplianceAuditor;
  private healthMonitor: HealthMonitor;

  constructor() {
    this.alertManager = new AlertManager();
    this.slaManager = new SLAManager();
    this.complianceAuditor = new ComplianceAuditor();
    this.healthMonitor = new HealthMonitor();
  }

  /**
   * Get alert manager
   */
  getAlertManager(): AlertManager {
    return this.alertManager;
  }

  /**
   * Get SLA manager
   */
  getSLAManager(): SLAManager {
    return this.slaManager;
  }

  /**
   * Get compliance auditor
   */
  getComplianceAuditor(): ComplianceAuditor {
    return this.complianceAuditor;
  }

  /**
   * Get health monitor
   */
  getHealthMonitor(): HealthMonitor {
    return this.healthMonitor;
  }

  /**
   * Get overall system health
   */
  getSystemHealth(): {
    status: 'healthy' | 'degraded' | 'critical';
    alerts: number;
    breachedSLAs: number;
    anomalies: number;
  } {
    const activeAlerts = this.alertManager.getActiveAlerts().length;
    const breachedSLAs = this.slaManager.getBreachedSLAs().length;
    const anomalies = this.healthMonitor.getAnomalies().length;

    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (activeAlerts > 0 || breachedSLAs > 0) status = 'degraded';
    if (activeAlerts > 5 || breachedSLAs > 2 || anomalies > 10) status = 'critical';

    return {
      status,
      alerts: activeAlerts,
      breachedSLAs,
      anomalies,
    };
  }

  /**
   * Clear all monitoring data
   */
  async clear(): Promise<void> {
    await this.alertManager.clear();
    await this.slaManager.clear();
    await this.complianceAuditor.clear();
    await this.healthMonitor.clear();
  }
}
