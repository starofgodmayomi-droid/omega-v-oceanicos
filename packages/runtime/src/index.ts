import { Observer } from '@omega-v/observer';
import { VerificationEngine } from '@omega-v/verification';
import { AttestationService } from '@omega-v/attestation';
import { EventLog } from '@omega-v/recorder';
import PrometheusMetricsCollector from './prometheus-metrics';
import { TraceManager } from './tracing';
import { EventBroadcaster } from './websocket';
import { HealthChecker, HealthChecks } from './health';
import { QueryCache } from './cache';
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
  private eventBroadcaster: EventBroadcaster;
  private healthChecker: HealthChecker;
  private queryCache: QueryCache;

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
    this.eventBroadcaster = new EventBroadcaster();
    this.healthChecker = new HealthChecker();
    this.queryCache = new QueryCache({
      maxSize: 10000,
      queryTTL: 300000,
      traceTTL: 600000,
      integrityTTL: 60000,
    });

    this.initializeHealthChecks();
  }

  /**
   * Initialize health checks for all components
   */
  private initializeHealthChecks(): void {
    this.healthChecker.registerCheck(
      'observer',
      HealthChecks.alive('observer'),
    );
    this.healthChecker.registerCheck(
      'verification-engine',
      HealthChecks.alive('verification-engine'),
    );
    this.healthChecker.registerCheck(
      'attestation-service',
      HealthChecks.alive('attestation-service'),
    );
    this.healthChecker.registerCheck(
      'event-log',
      HealthChecks.alive('event-log'),
    );
    this.healthChecker.registerCheck(
      'metrics',
      HealthChecks.alive('metrics'),
    );
    this.healthChecker.registerCheck(
      'memory',
      HealthChecks.memory('memory', { threshold: 0.9 }),
    );
    this.healthChecker.registerCheck(
      'execution-health',
      HealthChecks.counter('execution-health', () => this.executionStats.totalExecutions),
    );
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
    this.eventBroadcaster.publish({
      type: 'observation',
      timestamp: new Date().toISOString(),
      id: observation.id,
      data: {
        claim: observation.claim.statement,
        category: observation.claim.category,
        confidence: observation.confidence,
        source: observation.source,
      },
      source: 'runtime',
    });

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
    this.eventBroadcaster.publish({
      type: 'verification',
      timestamp: new Date().toISOString(),
      id: verification.id,
      data: {
        observationId: observation.id,
        passed: verification.summary.passed,
        confidence: verification.summary.confidence,
        duration_ms: verifyDuration,
        rulesApplied: verification.rules.length,
      },
      source: 'runtime',
    });

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
    this.eventBroadcaster.publish({
      type: 'attestation',
      timestamp: new Date().toISOString(),
      id: attestation.id,
      data: {
        verificationId: verification.id,
        verified: attestation.verified,
        algorithm: attestation.signingAlgorithm,
        duration_ms: attestDuration,
      },
      source: 'runtime',
    });

    // Step 4: RECORD - Store in immutable event log
    this.eventLog.recordObservation(observation);
    this.eventLog.recordVerification(verification);
    this.eventLog.recordAttestation(attestation);

    // Invalidate relevant query caches
    this.queryCache.invalidateObservations();
    this.queryCache.invalidateVerifications();
    this.queryCache.invalidateAttestations();
    this.queryCache.invalidateIntegrity();

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
   * Query observations from event log with caching
   */
  public queryObservations(options?: { limit?: number; offset?: number }): QueryResult {
    const cacheKey = `obs-limit-${options?.limit || 50}-offset-${options?.offset || 0}`;
    const cached = this.queryCache.getObservations(cacheKey);

    if (cached) {
      return cached;
    }

    const result = this.eventLog.queryByType('OBSERVATION', options);
    this.queryCache.cacheObservations(cacheKey, result);
    return result;
  }

  /**
   * Query verification results from event log with caching
   */
  public queryVerifications(options?: { limit?: number; offset?: number }): QueryResult {
    const cacheKey = `ver-limit-${options?.limit || 50}-offset-${options?.offset || 0}`;
    const cached = this.queryCache.getVerifications(cacheKey);

    if (cached) {
      return cached;
    }

    const result = this.eventLog.queryByType('VERIFICATION', options);
    this.queryCache.cacheVerifications(cacheKey, result);
    return result;
  }

  /**
   * Query attestations from event log with caching
   */
  public queryAttestations(options?: { limit?: number; offset?: number }): QueryResult {
    const cacheKey = `att-limit-${options?.limit || 50}-offset-${options?.offset || 0}`;
    const cached = this.queryCache.getAttestations(cacheKey);

    if (cached) {
      return cached;
    }

    const result = this.eventLog.queryByType('ATTESTATION', options);
    this.queryCache.cacheAttestations(cacheKey, result);
    return result;
  }

  /**
   * Get a single event by ID
   */
  public getEvent(id: string) {
    return this.eventLog.queryById(id);
  }

  /**
   * Get complete trace for an observation with caching
   */
  public getTrace(observationId: string) {
    const cacheKey = `trace-${observationId}`;
    const cached = this.queryCache.getTrace(cacheKey);

    if (cached) {
      return cached;
    }

    const trace = this.eventLog.getTraceForObservation(observationId);
    this.queryCache.cacheTrace(cacheKey, trace);
    return trace;
  }

  /**
   * Verify the integrity of the event log with caching
   */
  public verifyIntegrity() {
    const cacheKey = 'integrity-check';
    const cached = this.queryCache.getIntegrity(cacheKey);

    if (cached) {
      return cached;
    }

    const integrity = this.eventLog.verifyIntegrity();
    this.queryCache.cacheIntegrity(cacheKey, integrity);
    return integrity;
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
   * Get the event broadcaster instance (for WebSocket integration)
   */
  public getEventBroadcaster(): EventBroadcaster {
    return this.eventBroadcaster;
  }

  /**
   * Get the health checker instance (for system health monitoring)
   */
  public getHealthChecker(): HealthChecker {
    return this.healthChecker;
  }

  /**
   * Get the query cache instance (for performance optimization)
   */
  public getQueryCache(): QueryCache {
    return this.queryCache;
  }

  /**
   * Run all health checks and get system status
   */
  public async checkHealth() {
    return this.healthChecker.runChecks();
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
export { EventBroadcaster, createMessage, parseFilter, generateEventId } from './websocket';
export type { VerificationEvent, Subscriber, WebSocketMessage } from './websocket';
export {
  HealthChecker,
  HealthChecks,
} from './health';
export type { HealthStatus, ComponentHealth, SystemHealth, HealthCheckFunction } from './health';
export { Cache, QueryCache } from './cache';
export type { CacheEntry, CacheStats, CacheConfig, QueryCacheConfig } from './cache';
export {
  DistributedCache,
  DistributedCacheManager,
  RedisClient,
} from './distributed-cache';
export type { RedisConfig, CacheEntry as DistributedCacheEntry, CacheStats as DistributedCacheStats } from './distributed-cache';
export {
  SlidingWindowRateLimiter,
  TokenBucket,
  TieredRateLimiter,
} from './rate-limiter';
export type {
  RateLimitConfig,
  RateLimitStatus,
  RateLimiterStats,
  TokenBucketConfig,
  TierConfig,
} from './rate-limiter';
export {
  RequestSignature,
  WebhookSignature,
  OutboundRequestSigner,
} from './request-signature';
export type {
  SignatureConfig,
  SignatureVerifyResult,
  RequestSignatureOptions,
} from './request-signature';
export {
  parseVersion,
  compareVersions,
  isVersionSupported,
  formatVersion,
  VersionRegistry,
  VersionNegotiator,
  FeatureFlagManager,
  VersionMigration,
} from './api-versioning';
export type {
  VersionFormat,
  VersionSource,
  Version,
  VersionMetadata,
  VersionNegotiationOptions,
  VersionFeature,
} from './api-versioning';

export default VerificationRuntime;
