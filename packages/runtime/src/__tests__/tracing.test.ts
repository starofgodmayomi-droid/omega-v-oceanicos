import {
  TraceManager,
  Span,
  ConsoleTraceExporter,
  InMemoryTraceExporter,
  generateTraceId,
  generateSpanId,
  generateCorrelationId,
  parseTraceContext,
  formatTraceContext,
} from '../tracing';

describe('Distributed Tracing', () => {
  describe('Span Operations', () => {
    it('should create span with metadata', () => {
      const traceId = generateTraceId();
      const span = new Span(traceId, 'test-operation');

      expect(span.spanId).toBeDefined();
      expect(span.spanId.length).toBeGreaterThan(0);
    });

    it('should set attributes on span', () => {
      const traceId = generateTraceId();
      const span = new Span(traceId, 'test-op');

      span.setAttribute('user_id', '123');
      span.setAttribute('operation_type', 'verification');

      const json = span.toJSON();
      expect(json.attributes.user_id).toBe('123');
      expect(json.attributes.operation_type).toBe('verification');
    });

    it('should add events to span', () => {
      const traceId = generateTraceId();
      const span = new Span(traceId, 'test-op');

      span.addEvent('operation_started', { timestamp: Date.now() });
      span.addEvent('operation_completed', { result: 'success' });

      const json = span.toJSON();
      expect(json.events.length).toBe(2);
      expect(json.events[0].name).toBe('operation_started');
      expect(json.events[1].name).toBe('operation_completed');
    });

    it('should track span duration', () => {
      const traceId = generateTraceId();
      const span = new Span(traceId, 'test-op');

      const startDuration = span.getDuration();
      expect(startDuration).toBeGreaterThanOrEqual(0);

      span.end();
      const endDuration = span.getDuration();
      expect(endDuration).toBeGreaterThanOrEqual(startDuration);
    });

    it('should set span status', () => {
      const traceId = generateTraceId();
      const span = new Span(traceId, 'test-op');

      span.setStatus('success');
      let json = span.toJSON();
      expect(json.status).toBe('success');

      span.setStatus('error');
      json = span.toJSON();
      expect(json.status).toBe('error');
    });

    it('should support parent-child span relationships', () => {
      const traceId = generateTraceId();
      const parentId = generateSpanId();
      const childSpan = new Span(traceId, 'child-op', parentId);

      const json = childSpan.toJSON();
      expect(json.parentSpanId).toBe(parentId);
    });
  });

  describe('TraceManager', () => {
    it('should create trace with root span', () => {
      const manager = new TraceManager();
      const traceId = manager.createTrace('test-trace');

      expect(traceId).toBeDefined();
      expect(traceId.length).toBeGreaterThan(0);
    });

    it('should manage span stack', () => {
      const manager = new TraceManager();
      const traceId = manager.createTrace('test-trace');

      const currentSpan = manager.getCurrentSpan();
      expect(currentSpan).toBeDefined();
    });

    it('should create child spans', () => {
      const manager = new TraceManager();
      const traceId = manager.createTrace('test-trace');
      const childSpan = manager.createChildSpan(traceId, 'child-op');

      expect(childSpan).toBeDefined();
      const json = childSpan.toJSON();
      expect(json.parentSpanId).toBeDefined();
    });

    it('should end spans properly', () => {
      const manager = new TraceManager();
      const traceId = manager.createTrace('test-trace');
      const span = manager.getCurrentSpan();

      span?.end();
      manager.endSpan(span!);

      expect(manager.getCurrentSpan()).toBeUndefined();
    });

    it('should retrieve traces during active period', () => {
      const manager = new TraceManager();
      const traceId = manager.createTrace('test-trace');
      const span = manager.getCurrentSpan();

      const trace = manager.getTrace(traceId);
      expect(trace).toBeDefined();
      expect(trace!.length).toBeGreaterThan(0);

      span?.end();
      manager.endSpan(span!);
    });

    it('should export traces to exporters', async () => {
      const manager = new TraceManager();
      const exporter = new InMemoryTraceExporter();
      manager.addExporter(exporter);

      const traceId = manager.createTrace('test-trace');
      const span = manager.getCurrentSpan();
      span?.end();
      manager.endSpan(span!);

      await new Promise((resolve) => setTimeout(resolve, 10));

      const traces = exporter.getTraces();
      expect(traces.length).toBeGreaterThan(0);
    });

    it('should handle multiple exporters', async () => {
      const manager = new TraceManager();
      const exporter1 = new InMemoryTraceExporter();
      const exporter2 = new InMemoryTraceExporter();

      manager.addExporter(exporter1);
      manager.addExporter(exporter2);

      const traceId = manager.createTrace('test-trace');
      const span = manager.getCurrentSpan();
      span?.end();
      manager.endSpan(span!);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(exporter1.getTraces().length).toBeGreaterThan(0);
      expect(exporter2.getTraces().length).toBeGreaterThan(0);
    });
  });

  describe('ID Generation', () => {
    it('should generate valid trace IDs', () => {
      const traceId = generateTraceId();

      expect(traceId).toBeDefined();
      expect(traceId.length).toBe(32);
      expect(/^[a-f0-9]+$/.test(traceId)).toBe(true);
    });

    it('should generate valid span IDs', () => {
      const spanId = generateSpanId();

      expect(spanId).toBeDefined();
      expect(spanId.length).toBeGreaterThanOrEqual(13);
      expect(spanId.length).toBeLessThanOrEqual(16);
      expect(/^[a-f0-9]+$/.test(spanId)).toBe(true);
    });

    it('should generate unique IDs', () => {
      const ids = new Set();

      for (let i = 0; i < 100; i++) {
        ids.add(generateTraceId());
      }

      expect(ids.size).toBe(100);
    });

    it('should generate correlation IDs', () => {
      const corrId = generateCorrelationId();

      expect(corrId).toBeDefined();
      expect(corrId.startsWith('cor-')).toBe(true);
    });
  });

  describe('W3C Trace Context', () => {
    it('should parse valid trace context header', () => {
      const header = 'abc123-def456-01-xyz789';
      const context = parseTraceContext(header);

      expect(context.traceId).toBe('abc123');
      expect(context.spanId).toBe('def456');
      expect(context.traceFlags).toBe(1);
      expect(context.traceState).toBe('xyz789');
    });

    it('should generate valid trace context header from object', () => {
      const context = {
        traceId: 'abc123',
        spanId: 'def456',
        traceFlags: 1,
      };

      const header = formatTraceContext(context);
      expect(header).toBe('abc123-def456-01');
    });

    it('should handle missing headers gracefully', () => {
      const context = parseTraceContext();

      expect(context.traceId).toBeDefined();
      expect(context.spanId).toBeDefined();
      expect(context.traceFlags).toBe(1);
    });

    it('should preserve trace state in header', () => {
      const context = {
        traceId: 'abc123',
        spanId: 'def456',
        traceFlags: 1,
        traceState: 'custom=value',
      };

      const header = formatTraceContext(context);
      expect(header).toContain('custom=value');

      const parsed = parseTraceContext(header);
      expect(parsed.traceState).toBe('custom=value');
    });
  });

  describe('Exporters', () => {
    it('should export traces with ConsoleTraceExporter', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const exporter = new ConsoleTraceExporter();

      const traceData = [
        {
          traceId: 'test-id',
          spanId: 'span-1',
          startTime: Date.now(),
          duration: 100,
          status: 'success' as const,
          attributes: { op: 'test' },
          events: [],
        },
      ];

      await exporter.export(traceData);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should store traces with InMemoryTraceExporter', async () => {
      const exporter = new InMemoryTraceExporter();

      const traceData = [
        {
          traceId: 'test-id',
          spanId: 'span-1',
          startTime: Date.now(),
          duration: 100,
          status: 'success' as const,
          attributes: { op: 'test' },
          events: [],
        },
      ];

      await exporter.export(traceData);

      const traces = exporter.getTraces();
      expect(traces.length).toBe(1);
      expect(traces[0].traceId).toBe('test-id');
    });

    it('should clear stored traces', async () => {
      const exporter = new InMemoryTraceExporter();

      const traceData = [
        {
          traceId: 'test-id',
          spanId: 'span-1',
          startTime: Date.now(),
          duration: 100,
          status: 'success' as const,
          attributes: { op: 'test' },
          events: [],
        },
      ];

      await exporter.export(traceData);
      expect(exporter.getTraces().length).toBe(1);

      exporter.clear();
      expect(exporter.getTraces().length).toBe(0);
    });
  });

  describe('Integration Scenarios', () => {
    it('should trace multi-level operations', async () => {
      const manager = new TraceManager();
      const exporter = new InMemoryTraceExporter();
      manager.addExporter(exporter);

      const traceId = manager.createTrace('request');
      const rootSpan = manager.getCurrentSpan();

      const childSpan1 = manager.createChildSpan(traceId, 'validate');
      childSpan1?.setAttribute('status', 'ok');
      manager.endSpan(childSpan1!);

      const childSpan2 = manager.createChildSpan(traceId, 'process');
      childSpan2?.addEvent('processing_started');
      manager.endSpan(childSpan2!);

      rootSpan?.end();
      manager.endSpan(rootSpan!);

      await new Promise((resolve) => setTimeout(resolve, 10));

      const traces = exporter.getTraces();
      expect(traces.length).toBeGreaterThanOrEqual(1);
    });
  });
});
