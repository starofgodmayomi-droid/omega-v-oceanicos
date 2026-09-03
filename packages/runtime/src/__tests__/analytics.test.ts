import {
  AnalyticsCollector,
  MetricsAggregator,
  TrendDetector,
  InsightEngine,
  ReportGenerator,
  AnalyticsHub,
  Metric,
  AggregatedMetric,
} from '../analytics';

describe('Advanced Analytics & Insights System', () => {
  describe('AnalyticsCollector', () => {
    let collector: AnalyticsCollector;

    beforeEach(() => {
      collector = new AnalyticsCollector();
    });

    afterEach(async () => {
      await collector.clear();
    });

    it('should record event', () => {
      const event = collector.recordEvent('user_login', { source: 'web' }, 'user1', 'session1');

      expect(event.id).toBeDefined();
      expect(event.eventType).toBe('user_login');
      expect(event.userId).toBe('user1');
      expect(event.sessionId).toBe('session1');
    });

    it('should record metric', () => {
      const metric = collector.recordMetric('response_time', 150, 'gauge');

      expect(metric.name).toBe('response_time');
      expect(metric.value).toBe(150);
      expect(metric.type).toBe('gauge');
    });

    it('should get events by type', () => {
      collector.recordEvent('user_login', { source: 'web' });
      collector.recordEvent('user_login', { source: 'mobile' });
      collector.recordEvent('user_logout', { reason: 'timeout' });

      const logins = collector.getEvents('user_login');

      expect(logins.length).toBe(2);
      expect(logins.every((e) => e.eventType === 'user_login')).toBe(true);
    });

    it('should get metrics by name', () => {
      collector.recordMetric('response_time', 100);
      collector.recordMetric('response_time', 150);
      collector.recordMetric('error_rate', 0.05);

      const times = collector.getMetrics('response_time');

      expect(times.length).toBe(2);
      expect(times.every((m) => m.name === 'response_time')).toBe(true);
    });

    it('should get user events', () => {
      collector.recordEvent('user_login', {}, 'user1');
      collector.recordEvent('user_logout', {}, 'user1');
      collector.recordEvent('user_login', {}, 'user2');

      const user1Events = collector.getUserEvents('user1');

      expect(user1Events.length).toBe(2);
      expect(user1Events.every((e) => e.userId === 'user1')).toBe(true);
    });

    it('should get event type statistics', () => {
      collector.recordEvent('user_login', {});
      collector.recordEvent('user_login', {});
      collector.recordEvent('user_logout', {});

      const stats = collector.getEventTypeStats();

      expect(stats['user_login']).toBe(2);
      expect(stats['user_logout']).toBe(1);
    });

    it('should filter events by time', () => {
      const since = Date.now();
      collector.recordEvent('old_event', {});

      const events = collector.getEvents(undefined, since + 1);

      expect(events.length).toBe(0);
    });
  });

  describe('MetricsAggregator', () => {
    let aggregator: MetricsAggregator;

    beforeEach(() => {
      aggregator = new MetricsAggregator();
    });

    afterEach(async () => {
      await aggregator.clear();
    });

    it('should aggregate metrics', () => {
      const metrics: Metric[] = [
        { name: 'latency', type: 'gauge', value: 100, timestamp: Date.now() },
        { name: 'latency', type: 'gauge', value: 150, timestamp: Date.now() },
        { name: 'latency', type: 'gauge', value: 200, timestamp: Date.now() },
      ];

      const agg = aggregator.aggregate(metrics, 'latency', '1h');

      expect(agg.count).toBe(3);
      expect(agg.avg).toBe(150);
      expect(agg.min).toBe(100);
      expect(agg.max).toBe(200);
    });

    it('should calculate percentiles', () => {
      const metrics: Metric[] = [];
      for (let i = 1; i <= 100; i++) {
        metrics.push({
          name: 'response_time',
          type: 'gauge',
          value: i,
          timestamp: Date.now(),
        });
      }

      const agg = aggregator.aggregate(metrics, 'response_time', '1h');

      expect(agg.p50).toBeDefined();
      expect(agg.p95).toBeGreaterThan(agg.p50);
      expect(agg.p99).toBeGreaterThan(agg.p95);
    });

    it('should handle empty metrics', () => {
      const agg = aggregator.aggregate([], 'empty', '1h');

      expect(agg.count).toBe(0);
      expect(agg.avg).toBe(0);
      expect(agg.sum).toBe(0);
    });

    it('should retrieve aggregated metrics', () => {
      const metrics: Metric[] = [
        { name: 'cpu', type: 'gauge', value: 50, timestamp: Date.now() },
        { name: 'cpu', type: 'gauge', value: 60, timestamp: Date.now() },
      ];

      aggregator.aggregate(metrics, 'cpu', '1h');
      const retrieved = aggregator.getAggregated('cpu');

      expect(retrieved.length).toBeGreaterThan(0);
      expect(retrieved[0].name).toBe('cpu');
    });
  });

  describe('TrendDetector', () => {
    let detector: TrendDetector;

    beforeEach(() => {
      detector = new TrendDetector();
    });

    afterEach(async () => {
      await detector.clear();
    });

    it('should detect upward trend', () => {
      const metrics: AggregatedMetric[] = [
        {
          name: 'requests',
          period: '1h',
          timestamp: Date.now(),
          count: 10,
          sum: 100,
          avg: 100,
          min: 100,
          max: 100,
          p50: 100,
          p95: 100,
          p99: 100,
        },
        {
          name: 'requests',
          period: '1h',
          timestamp: Date.now(),
          count: 10,
          sum: 110,
          avg: 110,
          min: 110,
          max: 110,
          p50: 110,
          p95: 110,
          p99: 110,
        },
        {
          name: 'requests',
          period: '1h',
          timestamp: Date.now(),
          count: 10,
          sum: 120,
          avg: 120,
          min: 120,
          max: 120,
          p50: 120,
          p95: 120,
          p99: 120,
        },
      ];

      const trend = detector.detectTrend(metrics, '1h');

      expect(trend?.direction).toBe('up');
      expect(trend?.percentageChange).toBeGreaterThan(0);
    });

    it('should detect downward trend', () => {
      const metrics: AggregatedMetric[] = [
        {
          name: 'errors',
          period: '1h',
          timestamp: Date.now(),
          count: 10,
          sum: 100,
          avg: 100,
          min: 100,
          max: 100,
          p50: 100,
          p95: 100,
          p99: 100,
        },
        {
          name: 'errors',
          period: '1h',
          timestamp: Date.now(),
          count: 10,
          sum: 80,
          avg: 80,
          min: 80,
          max: 80,
          p50: 80,
          p95: 80,
          p99: 80,
        },
        {
          name: 'errors',
          period: '1h',
          timestamp: Date.now(),
          count: 10,
          sum: 60,
          avg: 60,
          min: 60,
          max: 60,
          p50: 60,
          p95: 60,
          p99: 60,
        },
      ];

      const trend = detector.detectTrend(metrics, '1h');

      expect(trend?.direction).toBe('down');
      expect(trend?.percentageChange).toBeLessThan(0);
    });

    it('should detect stable trend', () => {
      const metrics: AggregatedMetric[] = [
        {
          name: 'stable',
          period: '1h',
          timestamp: Date.now(),
          count: 10,
          sum: 100,
          avg: 100,
          min: 100,
          max: 100,
          p50: 100,
          p95: 100,
          p99: 100,
        },
        {
          name: 'stable',
          period: '1h',
          timestamp: Date.now(),
          count: 10,
          sum: 100,
          avg: 100,
          min: 100,
          max: 100,
          p50: 100,
          p95: 100,
          p99: 100,
        },
        {
          name: 'stable',
          period: '1h',
          timestamp: Date.now(),
          count: 10,
          sum: 101,
          avg: 101,
          min: 101,
          max: 101,
          p50: 101,
          p95: 101,
          p99: 101,
        },
      ];

      const trend = detector.detectTrend(metrics, '1h');

      expect(trend?.direction).toBe('stable');
    });

    it('should retrieve trends', () => {
      const metrics: AggregatedMetric[] = [
        {
          name: 'cpu',
          period: '1h',
          timestamp: Date.now(),
          count: 10,
          sum: 100,
          avg: 100,
          min: 100,
          max: 100,
          p50: 100,
          p95: 100,
          p99: 100,
        },
        {
          name: 'cpu',
          period: '1h',
          timestamp: Date.now(),
          count: 10,
          sum: 120,
          avg: 120,
          min: 120,
          max: 120,
          p50: 120,
          p95: 120,
          p99: 120,
        },
        {
          name: 'cpu',
          period: '1h',
          timestamp: Date.now(),
          count: 10,
          sum: 140,
          avg: 140,
          min: 140,
          max: 140,
          p50: 140,
          p95: 140,
          p99: 140,
        },
      ];

      detector.detectTrend(metrics, '1h');
      const trends = detector.getTrends();

      expect(trends.length).toBeGreaterThan(0);
      expect(trends[0].metricName).toBe('cpu');
    });
  });

  describe('InsightEngine', () => {
    let engine: InsightEngine;

    beforeEach(() => {
      engine = new InsightEngine();
    });

    afterEach(async () => {
      await engine.clear();
    });

    it('should detect anomaly', () => {
      const insight = engine.detectAnomaly('response_time', 5000, 100, 0.2);

      expect(insight).toBeDefined();
      expect(insight?.type).toBe('anomaly');
      expect(insight?.severity).toBe('critical');
    });

    it('should not detect anomaly for normal values', () => {
      const insight = engine.detectAnomaly('response_time', 110, 100, 0.2);

      expect(insight).toBeUndefined();
    });

    it('should detect correlation', () => {
      const metric1: Metric[] = [
        { name: 'cpu', type: 'gauge', value: 10, timestamp: Date.now() },
        { name: 'cpu', type: 'gauge', value: 20, timestamp: Date.now() },
        { name: 'cpu', type: 'gauge', value: 30, timestamp: Date.now() },
      ];

      const metric2: Metric[] = [
        { name: 'memory', type: 'gauge', value: 100, timestamp: Date.now() },
        { name: 'memory', type: 'gauge', value: 200, timestamp: Date.now() },
        { name: 'memory', type: 'gauge', value: 300, timestamp: Date.now() },
      ];

      const insight = engine.detectCorrelation(metric1, metric2, 0.7);

      expect(insight).toBeDefined();
      expect(insight?.type).toBe('correlation');
    });

    it('should retrieve insights', () => {
      engine.detectAnomaly('metric1', 1000, 100);
      engine.detectAnomaly('metric2', 2000, 100);

      const insights = engine.getInsights();

      expect(insights.length).toBe(2);
    });

    it('should resolve insight', () => {
      const insight = engine.detectAnomaly('metric1', 1000, 100);

      const resolved = insight ? engine.resolveInsight(insight.id) : false;

      expect(resolved).toBe(true);
    });
  });

  describe('ReportGenerator', () => {
    let generator: ReportGenerator;

    beforeEach(() => {
      generator = new ReportGenerator();
    });

    it('should generate report', () => {
      const metrics: Record<string, AggregatedMetric> = {
        response_time: {
          name: 'response_time',
          period: '1h',
          timestamp: Date.now(),
          count: 100,
          sum: 10000,
          avg: 100,
          min: 50,
          max: 200,
          p50: 100,
          p95: 180,
          p99: 195,
        },
      };

      const report = generator.generateReport(
        'Performance Report',
        Date.now() - 3600000,
        Date.now(),
        metrics,
        [],
        []
      );

      expect(report.id).toBeDefined();
      expect(report.title).toBe('Performance Report');
      expect(report.summary).toBeDefined();
      expect(Object.keys(report.metrics).length).toBe(1);
    });

    it('should include metrics, trends, and insights in report', () => {
      const metrics: Record<string, AggregatedMetric> = {};
      const trends = [];
      const insights = [];

      const report = generator.generateReport(
        'Test Report',
        Date.now() - 3600000,
        Date.now(),
        metrics,
        trends,
        insights
      );

      expect(report.metrics).toEqual(metrics);
      expect(report.trends).toEqual(trends);
      expect(report.insights).toEqual(insights);
    });
  });

  describe('AnalyticsHub', () => {
    let hub: AnalyticsHub;

    beforeEach(() => {
      hub = new AnalyticsHub();
    });

    afterEach(async () => {
      await hub.clear();
    });

    it('should provide collector', () => {
      const collector = hub.getCollector();
      expect(collector).toBeDefined();
    });

    it('should provide aggregator', () => {
      const aggregator = hub.getAggregator();
      expect(aggregator).toBeDefined();
    });

    it('should provide trend detector', () => {
      const detector = hub.getTrendDetector();
      expect(detector).toBeDefined();
    });

    it('should provide insight engine', () => {
      const engine = hub.getInsightEngine();
      expect(engine).toBeDefined();
    });

    it('should provide report generator', () => {
      const generator = hub.getReportGenerator();
      expect(generator).toBeDefined();
    });

    it('should record and analyze', () => {
      const event = hub.recordAndAnalyze(
        'page_view',
        { metricName: 'page_load_time', metricValue: 150 },
        'user1',
        'session1'
      );

      expect(event.eventType).toBe('page_view');
      expect(event.userId).toBe('user1');
    });

    it('should analyze metrics', () => {
      hub.getCollector().recordMetric('response_time', 100);
      hub.getCollector().recordMetric('response_time', 150);
      hub.getCollector().recordMetric('response_time', 200);

      const { aggregated, trend } = hub.analyzeMetrics('response_time', '1h');

      expect(aggregated).toBeDefined();
      expect(aggregated?.avg).toBe(150);
    });

    it('should generate insights from metrics', () => {
      const metrics: Record<string, Metric[]> = {
        cpu: [
          { name: 'cpu', type: 'gauge', value: 50, timestamp: Date.now() },
          { name: 'cpu', type: 'gauge', value: 55, timestamp: Date.now() },
          { name: 'cpu', type: 'gauge', value: 500, timestamp: Date.now() },
        ],
      };

      const insights = hub.generateInsights(metrics);

      expect(Array.isArray(insights)).toBe(true);
    });

    it('should generate full report', () => {
      hub.recordAndAnalyze('event1', { metricName: 'metric1', metricValue: 100 });

      const report = hub.generateFullReport('Analytics Report', Date.now() - 3600000, Date.now(), [
        'metric1',
      ]);

      expect(report.id).toBeDefined();
      expect(report.title).toBe('Analytics Report');
      expect(report.generatedAt).toBeDefined();
    });

    it('should integrate all components', () => {
      for (let i = 0; i < 5; i++) {
        hub.recordAndAnalyze('api_call', {
          metricName: 'api_latency',
          metricValue: 100 + i * 10,
        });
      }

      const { aggregated, trend } = hub.analyzeMetrics('api_latency');
      const insights = hub.generateInsights({
        api_latency: hub.getCollector().getMetrics('api_latency'),
      });

      const report = hub.generateFullReport('Full Analytics', Date.now() - 3600000, Date.now(), [
        'api_latency',
      ]);

      expect(aggregated).toBeDefined();
      expect(report.generatedAt).toBeDefined();
    });
  });
});
