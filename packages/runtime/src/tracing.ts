/**
 * OpenTelemetry distributed tracing integration for observability
 * Provides automatic instrumentation of verification loop with correlation IDs
 */

import { randomUUID } from 'crypto';

export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  startTime: number;
  duration?: number;
  status: 'pending' | 'success' | 'error';
  attributes: Record<string, unknown>;
}

export interface TraceEvent {
  timestamp: number;
  name: string;
  attributes: Record<string, unknown>;
}

/**
 * Span for tracing individual operations
 */
export class Span {
  readonly traceId: string;
  readonly spanId: string;
  readonly parentSpanId?: string;
  private startTime: number;
  private endTime?: number;
  private status: 'pending' | 'success' | 'error' = 'pending';
  private attributes: Map<string, unknown> = new Map();
  private events: TraceEvent[] = [];

  constructor(traceId: string, name: string, parentSpanId?: string) {
    this.traceId = traceId;
    this.spanId = generateSpanId();
    this.parentSpanId = parentSpanId;
    this.startTime = Date.now();
    this.setAttribute('span.name', name);
  }

  setAttribute(key: string, value: unknown): void {
    this.attributes.set(key, value);
  }

  addEvent(name: string, attributes: Record<string, unknown> = {}): void {
    this.events.push({
      timestamp: Date.now(),
      name,
      attributes,
    });
  }

  setStatus(status: 'success' | 'error'): void {
    this.status = status;
  }

  end(): void {
    this.endTime = Date.now();
  }

  getDuration(): number {
    return (this.endTime || Date.now()) - this.startTime;
  }

  toJSON(): TraceContext & { events: TraceEvent[] } {
    return {
      traceId: this.traceId,
      spanId: this.spanId,
      parentSpanId: this.parentSpanId,
      startTime: this.startTime,
      duration: this.getDuration(),
      status: this.status,
      attributes: Object.fromEntries(this.attributes),
      events: this.events,
    };
  }
}

/**
 * Trace context for distributed tracing
 */
export class TraceManager {
  private traces: Map<string, Span[]> = new Map();
  private spanStack: Span[] = [];
  private exporters: TraceExporter[] = [];

  createTrace(name: string): string {
    const traceId = generateTraceId();
    const span = new Span(traceId, name);
    this.traces.set(traceId, [span]);
    this.spanStack.push(span);
    return traceId;
  }

  createChildSpan(traceId: string, name: string): Span {
    const parentSpan = this.spanStack[this.spanStack.length - 1];
    const span = new Span(traceId, name, parentSpan?.spanId);

    if (!this.traces.has(traceId)) {
      this.traces.set(traceId, []);
    }
    this.traces.get(traceId)!.push(span);
    this.spanStack.push(span);

    return span;
  }

  getCurrentSpan(): Span | undefined {
    return this.spanStack[this.spanStack.length - 1];
  }

  endSpan(span: Span): void {
    span.end();
    this.spanStack.pop();

    if (this.spanStack.length === 0) {
      const traceId = span.traceId;
      const trace = this.traces.get(traceId);
      if (trace) {
        this.exportTrace(trace);
        this.traces.delete(traceId);
      }
    }
  }

  addExporter(exporter: TraceExporter): void {
    this.exporters.push(exporter);
  }

  private exportTrace(spans: Span[]): void {
    const traceData = spans.map((s) => s.toJSON());
    this.exporters.forEach((exporter) => {
      exporter.export(traceData).catch((e) => console.error('Trace export error:', e));
    });
  }

  getTrace(traceId: string): Span[] | undefined {
    return this.traces.get(traceId);
  }
}

/**
 * Trace exporter interface for different backends
 */
export interface TraceExporter {
  export(spans: Array<TraceContext & { events: TraceEvent[] }>): Promise<void>;
}

/**
 * Console trace exporter for development
 */
export class ConsoleTraceExporter implements TraceExporter {
  async export(spans: Array<TraceContext & { events: TraceEvent[] }>): Promise<void> {
    console.log('[Trace]', JSON.stringify(spans, null, 2));
  }
}

/**
 * In-memory trace exporter for testing
 */
export class InMemoryTraceExporter implements TraceExporter {
  private traces: Array<TraceContext & { events: TraceEvent[] }> = [];

  async export(spans: Array<TraceContext & { events: TraceEvent[] }>): Promise<void> {
    this.traces.push(...spans);
  }

  getTraces(): Array<TraceContext & { events: TraceEvent[] }> {
    return [...this.traces];
  }

  clear(): void {
    this.traces = [];
  }
}

/**
 * Jaeger-compatible trace exporter (HTTP endpoint)
 */
export class JaegerTraceExporter implements TraceExporter {
  constructor(private endpoint: string = 'http://localhost:14268/api/traces') {}

  async export(spans: Array<TraceContext & { events: TraceEvent[] }>): Promise<void> {
    try {
      const payload = {
        resourceSpans: spans.map((span) => ({
          resource: {
            attributes: [{ key: 'service.name', value: { stringValue: 'omega-v' } }],
          },
          scopeSpans: [
            {
              scope: { name: 'omega-v-tracer' },
              spans: [
                {
                  traceId: span.traceId,
                  spanId: span.spanId,
                  parentSpanId: span.parentSpanId || '',
                  name: span.attributes['span.name'] || 'unknown',
                  startTimeUnixNano: span.startTime * 1000000,
                  endTimeUnixNano: (span.startTime + span.duration!) * 1000000,
                  status: {
                    code: span.status === 'error' ? 2 : 1,
                  },
                },
              ],
            },
          ],
        })),
      };

      await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error('Jaeger export error:', error);
    }
  }
}

/**
 * Correlation ID generator for request tracing
 */
export function generateCorrelationId(): string {
  return `cor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate trace ID (compatible with W3C and Jaeger formats)
 */
export function generateTraceId(): string {
  return randomUUID().replace(/-/g, '');
}

/**
 * Generate span ID
 */
export function generateSpanId(): string {
  return Math.random().toString(16).substr(2, 16);
}

/**
 * W3C Trace Context header parser
 */
export interface W3CTraceContext {
  traceId: string;
  spanId: string;
  traceFlags: number;
  traceState?: string;
}

export function parseTraceContext(header?: string): W3CTraceContext {
  if (!header) {
    return {
      traceId: generateTraceId(),
      spanId: generateSpanId(),
      traceFlags: 1,
    };
  }

  const parts = header.split('-');
  return {
    traceId: parts[0] || generateTraceId(),
    spanId: parts[1] || generateSpanId(),
    traceFlags: parseInt(parts[2], 16) || 1,
    traceState: parts[3],
  };
}

/**
 * Format trace context as W3C header
 */
export function formatTraceContext(context: W3CTraceContext): string {
  return `${context.traceId}-${context.spanId}-${context.traceFlags.toString(16).padStart(2, '0')}${context.traceState ? `-${context.traceState}` : ''}`;
}
