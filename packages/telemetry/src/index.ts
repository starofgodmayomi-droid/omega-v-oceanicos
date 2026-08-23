import { SystemMetrics } from '@omega-v/types';
import * as crypto from 'crypto';

export type SpanStatus = 'OK' | 'ERROR' | 'UNSET';

export interface SpanEvent {
  name: string;
  time: number;
  data?: unknown;
}

export interface Span {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  startTime: number;
  endTime?: number;
  durationMs?: number;
  status: SpanStatus;
  attributes: Record<string, unknown>;
  events: SpanEvent[];
}

export interface TraceContext {
  traceId: string;
  spanId: string;
  traceFlags: number;
}

export interface SLOEvaluation {
  targetPassRate: number;
  actualPassRate: number;
  errorBudgetRemaining: number; // 0.0 - 1.0
  isHealthy: boolean;
  totalVerifications: number;
  evaluatedAt: string;
}

/**
 * TelemetryTracer: Distributed tracing with W3C TraceContext support
 */
export class TelemetryTracer {
  private spans: Span[] = [];

  /**
   * Start a new span. If parentContext is supplied, inherits traceId and sets parentSpanId.
   */
  public startSpan(
    name: string,
    parentContext?: TraceContext,
    attributes: Record<string, unknown> = {}
  ): Span {
    const traceId = parentContext?.traceId || crypto.randomBytes(16).toString('hex');
    const spanId = crypto.randomBytes(8).toString('hex');

    const span: Span = {
      traceId,
      spanId,
      parentSpanId: parentContext?.spanId,
      name,
      startTime: Date.now(),
      status: 'UNSET',
      attributes: { ...attributes },
      events: [],
    };

    this.spans.push(span);
    return span;
  }

  /**
   * End an active span and compute duration
   */
  public endSpan(span: Span, status: SpanStatus = 'OK'): Span {
    span.endTime = Date.now();
    span.durationMs = span.endTime - span.startTime;
    span.status = status;
    return span;
  }

  /**
   * Add an event to a span
   */
  public addEvent(span: Span, name: string, data?: unknown): void {
    span.events.push({
      name,
      time: Date.now(),
      data,
    });
  }

  /**
   * Inject TraceContext into a W3C traceparent header string (00-traceid-spanid-flags)
   */
  public injectTraceparent(context: TraceContext): string {
    const flags = context.traceFlags.toString(16).padStart(2, '0');
    return `00-${context.traceId}-${context.spanId}-${flags}`;
  }

  /**
   * Extract TraceContext from a W3C traceparent header string
   */
  public extractTraceparent(header: string): TraceContext | null {
    if (!header) return null;
    const parts = header.trim().split('-');
    if (parts.length !== 4 || parts[0] !== '00') return null;

    const traceId = parts[1];
    const spanId = parts[2];
    const traceFlags = parseInt(parts[3], 16);

    if (traceId.length !== 32 || spanId.length !== 16 || isNaN(traceFlags)) {
      return null;
    }

    return { traceId, spanId, traceFlags };
  }

  /**
   * Get all recorded spans
   */
  public getSpans(): Span[] {
    return [...this.spans];
  }

  /**
   * Clear all recorded spans
   */
  public clearSpans(): void {
    this.spans = [];
  }
}

/**
 * VerificationSLOEngine: Evaluates service-level objectives & error budgets
 */
export class VerificationSLOEngine {
  /**
   * Evaluate system metrics against verification pass-rate SLO
   */
  public evaluateSLO(metrics: SystemMetrics, targetPassRate = 0.99): SLOEvaluation {
    const actualPassRate = metrics.successRate;
    const allowedFailureRate = 1 - targetPassRate;
    const actualFailureRate = 1 - actualPassRate;

    // Remaining budget = 1 - (actualFailure / allowedFailure)
    let errorBudgetRemaining = 1.0;
    if (allowedFailureRate > 0) {
      errorBudgetRemaining = Math.max(
        0,
        (allowedFailureRate - actualFailureRate) / allowedFailureRate
      );
    }

    const isHealthy = actualPassRate >= targetPassRate;

    return {
      targetPassRate,
      actualPassRate,
      errorBudgetRemaining,
      isHealthy,
      totalVerifications: metrics.totalVerifications,
      evaluatedAt: new Date().toISOString(),
    };
  }
}

export default TelemetryTracer;
