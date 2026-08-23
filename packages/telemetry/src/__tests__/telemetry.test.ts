import { TelemetryTracer, VerificationSLOEngine } from '../index';
import { SystemMetrics } from '@omega-v/types';

describe('@omega-v/telemetry', () => {
  describe('TelemetryTracer', () => {
    let tracer: TelemetryTracer;

    beforeEach(() => {
      tracer = new TelemetryTracer();
    });

    it('should start and end spans with duration', () => {
      const span = tracer.startSpan('verification-step', undefined, { component: 'engine' });
      expect(span.traceId).toHaveLength(32);
      expect(span.spanId).toHaveLength(16);
      expect(span.status).toBe('UNSET');

      tracer.addEvent(span, 'rule_evaluated', { passed: true });
      expect(span.events).toHaveLength(1);

      tracer.endSpan(span, 'OK');
      expect(span.status).toBe('OK');
      expect(span.endTime).toBeDefined();
      expect(typeof span.durationMs).toBe('number');
      expect(tracer.getSpans()).toHaveLength(1);
    });

    it('should propagate trace context and inject/extract W3C traceparent headers', () => {
      const parentSpan = tracer.startSpan('root-request');
      const traceContext = {
        traceId: parentSpan.traceId,
        spanId: parentSpan.spanId,
        traceFlags: 1,
      };

      const header = tracer.injectTraceparent(traceContext);
      expect(header).toMatch(/^00-[a-f0-9]{32}-[a-f0-9]{16}-01$/);

      const extracted = tracer.extractTraceparent(header);
      expect(extracted).not.toBeNull();
      expect(extracted?.traceId).toBe(parentSpan.traceId);
      expect(extracted?.spanId).toBe(parentSpan.spanId);
      expect(extracted?.traceFlags).toBe(1);

      // Start child span using extracted context
      const childSpan = tracer.startSpan('child-verify', extracted || undefined);
      expect(childSpan.traceId).toBe(parentSpan.traceId);
      expect(childSpan.parentSpanId).toBe(parentSpan.spanId);
    });

    it('should return null for invalid traceparent headers', () => {
      expect(tracer.extractTraceparent('invalid')).toBeNull();
      expect(tracer.extractTraceparent('01-abc-def-00')).toBeNull();
      expect(tracer.extractTraceparent('')).toBeNull();
    });
  });

  describe('VerificationSLOEngine', () => {
    let sloEngine: VerificationSLOEngine;

    beforeEach(() => {
      sloEngine = new VerificationSLOEngine();
    });

    it('should evaluate healthy SLO when successRate >= target', () => {
      const metrics: SystemMetrics = {
        totalObservations: 100,
        totalVerifications: 100,
        avgVerificationTime: 12,
        successRate: 0.995,
        totalAttestations: 100,
        systemConfidence: 0.98,
        lastUpdated: new Date().toISOString(),
      };

      const evaluation = sloEngine.evaluateSLO(metrics, 0.99);
      expect(evaluation.isHealthy).toBe(true);
      expect(evaluation.errorBudgetRemaining).toBeGreaterThan(0);
    });

    it('should evaluate degraded SLO when successRate < target', () => {
      const metrics: SystemMetrics = {
        totalObservations: 100,
        totalVerifications: 100,
        avgVerificationTime: 25,
        successRate: 0.95,
        totalAttestations: 95,
        systemConfidence: 0.85,
        lastUpdated: new Date().toISOString(),
      };

      const evaluation = sloEngine.evaluateSLO(metrics, 0.99);
      expect(evaluation.isHealthy).toBe(false);
      expect(evaluation.errorBudgetRemaining).toBe(0);
    });
  });
});
