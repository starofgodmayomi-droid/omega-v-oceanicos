import { Observer } from '@omega-v/observer';
import { VerificationEngine } from '@omega-v/verification';
import { AttestationService } from '@omega-v/attestation';
import { EventLog } from '@omega-v/recorder';
import PrometheusMetricsCollector from './prometheus-metrics';
import { TraceManager } from './tracing';
import {
  Observation,
  VerificationRule,
  VerificationResult,
  Attestation,
  QueryResult,
  SystemMetrics,
} from '@omega-v/types';

/**
 * VerificationRuntime: Unified orchestrator for the complete verification loop
 *
 * Coordinates: Observe → Verify → Attest → Record → Query
 * Provides a single entry point for complete verification workflows
 */
export class VerificationRuntime {
  private observer: Observer;
  private verificationEngine: VerificationEngine;
  private attestationService: AttestationService;
  private eventLog: EventLog;
  private metricsCollector: PrometheusMetricsCollector;
  private traceManager: TraceManager;

  private executionStats = {
    totalExecutions: 0,
    observations: 0,
    verifications: 0,
    attestations: 0,
    successCount: 0,
    failureCount: 0,
    totalConfidence: 0,
    totalVerificationTime: 0,
    totalAttestationTime: 0,
    totalLoopTime: 0,
  };

  /**
   * Initialize the unified runtime with all components
   */
  constructor() {
    this.observer = new Observer();
    this.verificationEngine = new VerificationEngine();
    this.attestationService = new AttestationService();
    this.eventLog = new EventLog();
    this.metricsCollector = new PrometheusMetricsCollector();
    this.traceManager = new TraceManager();
  }

  /**
   * Register a verification rule
   */
  public registerRule(rule: VerificationRule): void {
    this.verificationEngine.registerRule(rule);
  }

  /**
   * Execute the complete verification loop: Observe → Verify → Attest → Record
   * Returns the complete result with observation, verification, and attestation
   */
  public executeLoop(input: {
    claim: string;
    category: string;
    source: { system: string; version: string; environment: string };
    observedBy: string;
    metadata: Record<string, unknown>;
    confidence: number;
    confidenceReason: string;
  }): {
    observation: Observation;
    verification: VerificationResult;
    attestation: Attestation;
  } {
    const loopStartTime = Date.now();
    const traceId = this.traceManager.createTrace('verification-loop');
    const loopSpan = this.traceManager.getCurrentSpan();
    loopSpan?.setAttribute('claim', input.claim);
    loopSpan?.setAttribute('category', input.category);

    // Step 1: OBSERVE - Create normalized observation
    const observeSpan = this.traceManager.createChildSpan(traceId, 'observe');
    const observation = this.observer.observe({
      claim: input.claim,
      category: input.category,
      source: input.source,
      observedBy: input.observedBy,
      metadata: input.metadata,
      confidence: input.confidence,
      confidenceReason: input.confidenceReason,
    });
    observeSpan?.setAttribute('observation.id', observation.id);
    observeSpan?.setAttribute('observation.confidence', observation.confidence);
    this.traceManager.endSpan(observeSpan!);

    this.metricsCollector.incrementObservations();

    // Step 2: VERIFY - Apply verification rules
    const verifySpan = this.traceManager.createChildSpan(traceId, 'verify');
    const verifyStartTime = Date.now();
    const verification = this.verificationEngine.verify(observation);
    const verifyDuration = Date.now() - verifyStartTime;
    verifySpan?.setAttribute('verification.id', verification.id);
    verifySpan?.setAttribute('verification.passed', verification.summary.passed);
    verifySpan?.setAttribute('verification.confidence', verification.summary.confidence);
    verifySpan?.setAttribute('duration_ms', verifyDuration);
    this.traceManager.endSpan(verifySpan!);

    this.metricsCollector.incrementVerifications(verification.summary.passed);
    this.metricsCollector.recordVerificationDuration(verifyDuration);

    // Step 3: ATTEST - Create cryptographic proof
    const attestSpan = this.traceManager.createChildSpan(traceId, 'attest');
    const attestStartTime = Date.now();
    const attestation = this.attestationService.attest(verification);
    const attestDuration = Date.now() - attestStartTime;
    attestSpan?.setAttribute('attestation.id', attestation.id);
    attestSpan?.setAttribute('attestation.verified', attestation.verified);
    attestSpan?.setAttribute('attestation.algorithm', attestation.signingAlgorithm);
    attestSpan?.setAttribute('duration_ms', attestDuration);
    this.traceManager.endSpan(attestSpan!);

    this.metricsCollector.incrementAttestations(attestation.verified);
    this.metricsCollector.recordAttestationDuration(attestDuration);

    // Step 4: RECORD - Store in immutable event log
    this.eventLog.recordObservation(observation);
    this.eventLog.recordVerification(verification);
    this.eventLog.recordAttestation(attestation);

    // Update statistics
    this.executionStats.totalExecutions++;
    this.executionStats.observations++;
    this.executionStats.verifications++;
    this.executionStats.attestations++;
    this.executionStats.totalConfidence += verification.summary.confidence;
    this.executionStats.totalVerificationTime += verifyDuration;
    this.executionStats.totalAttestationTime += attestDuration;

    if (verification.summary.passed) {
      this.executionStats.successCount++;
    } else {
      this.executionStats.failureCount++;
    }

    const loopDuration = Date.now() - loopStartTime;
    this.metricsCollector.recordLoopDuration(loopDuration);
    this.executionStats.totalLoopTime += loopDuration;

    // Update gauge metrics
    const eventLogStats = this.eventLog.getStats();
    this.metricsCollector.setEventLogSize(eventLogStats.totalEvents);

    const successRate =
      this.executionStats.totalExecutions > 0
        ? this.executionStats.successCount / this.executionStats.totalExecutions
        : 0;
    this.metricsCollector.setSuccessRate(successRate);

    const avgConfidence =
      this.executionStats.totalExecutions > 0
        ? this.executionStats.totalConfidence / this.executionStats.totalExecutions
        : 0;
    this.metricsCollector.setSystemConfidence(avgConfidence);

    // End main loop span
    loopSpan?.setAttribute('duration_ms', loopDuration);
    loopSpan?.setAttribute('success', verification.summary.passed);
    loopSpan?.setStatus(verification.summary.passed ? 'success' : 'error');
    this.traceManager.endSpan(loopSpan!);

    return {
      observation,
      verification,
      attestation,
    };
  }

  /**
   * Query observations from event log
   */
  public queryObservations(options?: { limit?: number; offset?: number }): QueryResult {
    return this.eventLog.queryByType('OBSERVATION', options);
  }

  /**
   * Query verification results from event log
   */
  public queryVerifications(options?: { limit?: number; offset?: number }): QueryResult {
    return this.eventLog.queryByType('VERIFICATION', options);
  }

  /**
   * Query attestations from event log
   */
  public queryAttestations(options?: { limit?: number; offset?: number }): QueryResult {
    return this.eventLog.queryByType('ATTESTATION', options);
  }

  /**
   * Get a single event by ID
   */
  public getEvent(id: string) {
    return this.eventLog.queryById(id);
  }

  /**
   * Get complete trace for an observation (observation → verifications → attestations)
   */
  public getTrace(observationId: string) {
    return this.eventLog.getTraceForObservation(observationId);
  }

  /**
   * Verify the integrity of the event log
   */
  public verifyIntegrity() {
    return this.eventLog.verifyIntegrity();
  }

  /**
   * Get execution statistics
   */
  public getExecutionStats() {
    return { ...this.executionStats };
  }

  /**
   * Get system metrics
   */
  public getMetrics(): SystemMetrics {
    const stats = this.eventLog.getStats();
    const avgConfidence =
      this.executionStats.totalExecutions > 0
        ? this.executionStats.totalConfidence / this.executionStats.totalExecutions
        : 0;

    const successRate =
      this.executionStats.totalExecutions > 0
        ? this.executionStats.successCount / this.executionStats.totalExecutions
        : 0;

    const avgVerificationTime =
      this.executionStats.verifications > 0
        ? this.executionStats.totalVerificationTime / this.executionStats.verifications
        : 0;

    return {
      totalObservations: stats.observations,
      totalVerifications: stats.verifications,
      avgVerificationTime,
      successRate,
      totalAttestations: stats.attestations,
      systemConfidence: avgConfidence,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Get Prometheus-formatted metrics
   */
  public getPrometheusMetrics(): string {
    return this.metricsCollector.generatePrometheusMetrics();
  }

  /**
   * Get metrics as JSON (with statistics)
   */
  public getMetricsJSON() {
    return this.metricsCollector.generateMetricsJSON();
  }

  /**
   * Get the metrics collector instance (for advanced usage)
   */
  public getMetricsCollector(): PrometheusMetricsCollector {
    return this.metricsCollector;
  }

  /**
   * Get the trace manager instance (for advanced usage)
   */
  public getTraceManager(): TraceManager {
    return this.traceManager;
  }

  /**
   * Export complete event log for audit/backup
   */
  public exportEventLog() {
    return this.eventLog.exportEventLog();
  }
}

export {
  RateLimiter,
  CircuitBreaker,
  retryWithBackoff,
  GracefulShutdown,
  VerificationError,
} from './resilience';
export {
  TraceManager,
  Span,
  ConsoleTraceExporter,
  InMemoryTraceExporter,
  JaegerTraceExporter,
  generateTraceId,
  generateSpanId,
  generateCorrelationId,
  parseTraceContext,
  formatTraceContext,
} from './tracing';
export {
  GraphQLSchema,
  createVerificationSchema,
  getSchemaIntrospection,
} from './graphql';

export default VerificationRuntime;
