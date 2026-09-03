/**
 * Advanced Analytics & Insights System
 * Enterprise-grade analytics with event analysis, trend detection, and insight generation
 */

export type MetricType = 'counter' | 'gauge' | 'histogram' | 'duration' | 'rate';
export type TrendDirection = 'up' | 'down' | 'stable';
export type InsightType = 'anomaly' | 'trend' | 'correlation' | 'pattern' | 'recommendation';
export type AggregationPeriod = '1m' | '5m' | '15m' | '1h' | '1d' | '1w' | '1mo';

export interface AnalyticsEvent {
  id: string;
  eventType: string;
  timestamp: number;
  userId?: string;
  sessionId?: string;
  metadata: Record<string, any>;
}

export interface Metric {
  name: string;
  type: MetricType;
  value: number;
  timestamp: number;
  labels?: Record<string, string>;
}

export interface AggregatedMetric {
  name: string;
  period: AggregationPeriod;
  timestamp: number;
  count: number;
  sum: number;
  avg: number;
  min: number;
  max: number;
  p50: number;
  p95: number;
  p99: number;
}

export interface Trend {
  metricName: string;
  period: AggregationPeriod;
  direction: TrendDirection;
  strength: number;
  duration: number;
  startValue: number;
  endValue: number;
  percentageChange: number;
}

export interface Insight {
  id: string;
  type: InsightType;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  confidence: number;
  metrics: string[];
  evidence: Record<string, any>;
  timestamp: number;
  resolved?: boolean;
}

export interface Report {
  id: string;
  title: string;
  period: { start: number; end: number };
  summary: string;
  metrics: Record<string, AggregatedMetric>;
  trends: Trend[];
  insights: Insight[];
  generatedAt: number;
}

/**
 * AnalyticsCollector: Collect events and metrics
 */
export class AnalyticsCollector {
  private events: AnalyticsEvent[] = [];
  private metrics: Metric[] = [];
  private eventTypeIndex: Map<string, AnalyticsEvent[]> = new Map();

  recordEvent(
    eventType: string,
    metadata: Record<string, any>,
    userId?: string,
    sessionId?: string
  ): AnalyticsEvent {
    const event: AnalyticsEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      eventType,
      timestamp: Date.now(),
      userId,
      sessionId,
      metadata,
    };

    this.events.push(event);

    if (!this.eventTypeIndex.has(eventType)) {
      this.eventTypeIndex.set(eventType, []);
    }
    this.eventTypeIndex.get(eventType)!.push(event);

    return event;
  }

  recordMetric(
    name: string,
    value: number,
    type: MetricType = 'gauge',
    labels?: Record<string, string>
  ): Metric {
    const metric: Metric = {
      name,
      type,
      value,
      timestamp: Date.now(),
      labels,
    };

    this.metrics.push(metric);
    return metric;
  }

  getEvents(eventType?: string, since?: number, limit: number = 1000): AnalyticsEvent[] {
    let filtered = eventType ? this.eventTypeIndex.get(eventType) || [] : this.events;

    if (since) {
      filtered = filtered.filter((e) => e.timestamp >= since);
    }

    return filtered.slice(-limit);
  }

  getMetrics(name?: string, since?: number, limit: number = 1000): Metric[] {
    let filtered = name ? this.metrics.filter((m) => m.name === name) : this.metrics;

    if (since) {
      filtered = filtered.filter((m) => m.timestamp >= since);
    }

    return filtered.slice(-limit);
  }

  getUserEvents(userId: string, limit: number = 1000): AnalyticsEvent[] {
    return this.events.filter((e) => e.userId === userId).slice(-limit);
  }

  getEventTypeStats(): Record<string, number> {
    const stats: Record<string, number> = {};

    for (const [eventType, events] of this.eventTypeIndex.entries()) {
      stats[eventType] = events.length;
    }

    return stats;
  }

  async clear(): Promise<void> {
    this.events = [];
    this.metrics = [];
    this.eventTypeIndex.clear();
  }
}

/**
 * MetricsAggregator: Aggregate metrics by time windows
 */
export class MetricsAggregator {
  private aggregated: Map<string, AggregatedMetric[]> = new Map();

  aggregate(metrics: Metric[], name: string, period: AggregationPeriod): AggregatedMetric {
    const values = metrics.map((m) => m.value);

    if (values.length === 0) {
      return {
        name,
        period,
        timestamp: Date.now(),
        count: 0,
        sum: 0,
        avg: 0,
        min: 0,
        max: 0,
        p50: 0,
        p95: 0,
        p99: 0,
      };
    }

    const sorted = values.sort((a, b) => a - b);

    const aggregated: AggregatedMetric = {
      name,
      period,
      timestamp: Date.now(),
      count: values.length,
      sum: values.reduce((a, b) => a + b, 0),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p50: this.percentile(sorted, 0.5),
      p95: this.percentile(sorted, 0.95),
      p99: this.percentile(sorted, 0.99),
    };

    if (!this.aggregated.has(name)) {
      this.aggregated.set(name, []);
    }
    this.aggregated.get(name)!.push(aggregated);

    return aggregated;
  }

  private percentile(sorted: number[], p: number): number {
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, index)];
  }

  getAggregated(name: string, limit: number = 100): AggregatedMetric[] {
    return (this.aggregated.get(name) || []).slice(-limit);
  }

  async clear(): Promise<void> {
    this.aggregated.clear();
  }
}

/**
 * TrendDetector: Identify trends in metrics
 */
export class TrendDetector {
  private trends: Map<string, Trend[]> = new Map();

  detectTrend(
    aggregated: AggregatedMetric[],
    period: AggregationPeriod,
    minDuration: number = 3
  ): Trend | undefined {
    if (aggregated.length < minDuration) return undefined;

    const recent = aggregated.slice(-minDuration);
    const values = recent.map((m) => m.avg);

    const direction = this.calculateDirection(values);
    const strength = this.calculateStrength(values);
    const startValue = values[0];
    const endValue = values[values.length - 1];
    const percentageChange = ((endValue - startValue) / startValue) * 100;

    const trend: Trend = {
      metricName: aggregated[0].name,
      period,
      direction,
      strength,
      duration: recent.length,
      startValue,
      endValue,
      percentageChange,
    };

    const key = aggregated[0].name;
    if (!this.trends.has(key)) {
      this.trends.set(key, []);
    }
    this.trends.get(key)!.push(trend);

    return trend;
  }

  private calculateDirection(values: number[]): TrendDirection {
    const deltas = [];
    for (let i = 1; i < values.length; i++) {
      const percentChange = (values[i] - values[i - 1]) / values[i - 1];
      deltas.push(percentChange);
    }

    const avgDelta = deltas.reduce((a, b) => a + b, 0) / deltas.length;

    if (Math.abs(avgDelta) < 0.02) return 'stable';
    return avgDelta > 0 ? 'up' : 'down';
  }

  private calculateStrength(values: number[]): number {
    const deltas = [];
    for (let i = 1; i < values.length; i++) {
      deltas.push(Math.abs(values[i] - values[i - 1]) / values[i - 1]);
    }

    return deltas.reduce((a, b) => a + b, 0) / deltas.length;
  }

  getTrends(metricName?: string, limit: number = 100): Trend[] {
    if (metricName) {
      return (this.trends.get(metricName) || []).slice(-limit);
    }

    const allTrends: Trend[] = [];
    for (const trends of this.trends.values()) {
      allTrends.push(...trends);
    }

    return allTrends.slice(-limit);
  }

  async clear(): Promise<void> {
    this.trends.clear();
  }
}

/**
 * InsightEngine: Generate insights and recommendations
 */
export class InsightEngine {
  private insights: Map<string, Insight[]> = new Map();

  detectAnomaly(
    metricName: string,
    currentValue: number,
    expectedValue: number,
    tolerance: number = 0.2
  ): Insight | undefined {
    const deviation = Math.abs(currentValue - expectedValue) / expectedValue;

    if (deviation <= tolerance) return undefined;

    const insight: Insight = {
      id: `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'anomaly',
      title: `Anomaly detected in ${metricName}`,
      description: `${metricName} deviated by ${(deviation * 100).toFixed(2)}% from expected value`,
      severity: deviation > 0.5 ? 'critical' : 'warning',
      confidence: Math.min(1, deviation),
      metrics: [metricName],
      evidence: { currentValue, expectedValue, deviation },
      timestamp: Date.now(),
    };

    this.storeInsight(metricName, insight);
    return insight;
  }

  detectCorrelation(
    metric1: Metric[],
    metric2: Metric[],
    threshold: number = 0.7
  ): Insight | undefined {
    const correlation = this.calculateCorrelation(
      metric1.map((m) => m.value),
      metric2.map((m) => m.value)
    );

    if (Math.abs(correlation) < threshold) return undefined;

    const insight: Insight = {
      id: `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'correlation',
      title: `Correlation detected between metrics`,
      description: `Strong ${correlation > 0 ? 'positive' : 'negative'} correlation detected`,
      severity: 'info',
      confidence: Math.abs(correlation),
      metrics: [],
      evidence: { correlation },
      timestamp: Date.now(),
    };

    this.storeInsight('correlations', insight);
    return insight;
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length);
    if (n < 2) return 0;

    const meanX = x.slice(0, n).reduce((a, b) => a + b, 0) / n;
    const meanY = y.slice(0, n).reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denominatorX = 0;
    let denominatorY = 0;

    for (let i = 0; i < n; i++) {
      const dx = x[i] - meanX;
      const dy = y[i] - meanY;
      numerator += dx * dy;
      denominatorX += dx * dx;
      denominatorY += dy * dy;
    }

    const denominator = Math.sqrt(denominatorX * denominatorY);
    return denominator === 0 ? 0 : numerator / denominator;
  }

  private storeInsight(key: string, insight: Insight): void {
    if (!this.insights.has(key)) {
      this.insights.set(key, []);
    }
    this.insights.get(key)!.push(insight);
  }

  getInsights(limit: number = 100): Insight[] {
    const all: Insight[] = [];
    for (const insights of this.insights.values()) {
      all.push(...insights);
    }
    return all.slice(-limit);
  }

  resolveInsight(insightId: string): boolean {
    for (const insights of this.insights.values()) {
      const insight = insights.find((i) => i.id === insightId);
      if (insight) {
        insight.resolved = true;
        return true;
      }
    }
    return false;
  }

  async clear(): Promise<void> {
    this.insights.clear();
  }
}

/**
 * ReportGenerator: Generate comprehensive reports
 */
export class ReportGenerator {
  generateReport(
    title: string,
    startTime: number,
    endTime: number,
    metrics: Record<string, AggregatedMetric>,
    trends: Trend[],
    insights: Insight[]
  ): Report {
    const report: Report = {
      id: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title,
      period: { start: startTime, end: endTime },
      summary: this.generateSummary(metrics, trends, insights),
      metrics,
      trends,
      insights,
      generatedAt: Date.now(),
    };

    return report;
  }

  private generateSummary(
    metrics: Record<string, AggregatedMetric>,
    trends: Trend[],
    insights: Insight[]
  ): string {
    const metricCount = Object.keys(metrics).length;
    const trendCount = trends.length;
    const insightCount = insights.length;
    const criticalCount = insights.filter((i) => i.severity === 'critical').length;

    return `Report contains ${metricCount} metrics, ${trendCount} trends, and ${insightCount} insights (${criticalCount} critical).`;
  }
}

/**
 * AnalyticsHub: Unified analytics orchestration
 */
export class AnalyticsHub {
  private collector: AnalyticsCollector;
  private aggregator: MetricsAggregator;
  private trendDetector: TrendDetector;
  private insightEngine: InsightEngine;
  private reportGenerator: ReportGenerator;

  constructor() {
    this.collector = new AnalyticsCollector();
    this.aggregator = new MetricsAggregator();
    this.trendDetector = new TrendDetector();
    this.insightEngine = new InsightEngine();
    this.reportGenerator = new ReportGenerator();
  }

  getCollector(): AnalyticsCollector {
    return this.collector;
  }

  getAggregator(): MetricsAggregator {
    return this.aggregator;
  }

  getTrendDetector(): TrendDetector {
    return this.trendDetector;
  }

  getInsightEngine(): InsightEngine {
    return this.insightEngine;
  }

  getReportGenerator(): ReportGenerator {
    return this.reportGenerator;
  }

  recordAndAnalyze(
    eventType: string,
    metadata: Record<string, any>,
    userId?: string,
    sessionId?: string
  ): AnalyticsEvent {
    const event = this.collector.recordEvent(eventType, metadata, userId, sessionId);

    if (metadata.metricName && metadata.metricValue !== undefined) {
      this.collector.recordMetric(metadata.metricName, metadata.metricValue, 'gauge');
    }

    return event;
  }

  analyzeMetrics(
    metricName: string,
    period: AggregationPeriod = '1h',
    since?: number
  ): {
    aggregated: AggregatedMetric | undefined;
    trend: Trend | undefined;
  } {
    const metrics = this.collector.getMetrics(metricName, since);
    const aggregated =
      metrics.length > 0 ? this.aggregator.aggregate(metrics, metricName, period) : undefined;

    const allAggregated = this.aggregator.getAggregated(metricName);
    const trend =
      allAggregated.length > 0 ? this.trendDetector.detectTrend(allAggregated, period) : undefined;

    return { aggregated, trend };
  }

  generateInsights(metricsData: Record<string, Metric[]>): Insight[] {
    const insights: Insight[] = [];

    for (const [metricName, metrics] of Object.entries(metricsData)) {
      if (metrics.length > 0) {
        const values = metrics.map((m) => m.value);
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const stdDev = Math.sqrt(
          values.reduce((sq, n) => sq + Math.pow(n - avg, 2), 0) / values.length
        );

        const lastValue = values[values.length - 1];
        if (Math.abs(lastValue - avg) > 3 * stdDev) {
          const anomaly = this.insightEngine.detectAnomaly(metricName, lastValue, avg, 0.3);
          if (anomaly) insights.push(anomaly);
        }
      }
    }

    return insights;
  }

  generateFullReport(
    title: string,
    startTime: number,
    endTime: number,
    metricNames: string[]
  ): Report {
    const metrics: Record<string, AggregatedMetric> = {};

    for (const metricName of metricNames) {
      const agg = this.aggregator.getAggregated(metricName, 1);
      if (agg.length > 0) {
        metrics[metricName] = agg[0];
      }
    }

    const trends = this.trendDetector.getTrends();
    const insights = this.insightEngine.getInsights();

    return this.reportGenerator.generateReport(
      title,
      startTime,
      endTime,
      metrics,
      trends,
      insights
    );
  }

  async clear(): Promise<void> {
    await this.collector.clear();
    await this.aggregator.clear();
    await this.trendDetector.clear();
    await this.insightEngine.clear();
  }
}
