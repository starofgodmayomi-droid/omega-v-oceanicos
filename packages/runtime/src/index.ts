import { Observer } from '@omega-v/observer';
import { VerificationEngine } from '@omega-v/verification';
import { AttestationService } from '@omega-v/attestation';
import { EventLog } from '@omega-v/recorder';
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

  private executionStats = {
    totalExecutions: 0,
    observations: 0,
    verifications: 0,
    attestations: 0,
    successCount: 0,
    failureCount: 0,
    totalConfidence: 0,
  };

  /**
   * Initialize the unified runtime with all components
   */
  constructor() {
    this.observer = new Observer();
    this.verificationEngine = new VerificationEngine();
    this.attestationService = new AttestationService();
    this.eventLog = new EventLog();
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
    // Step 1: OBSERVE - Create normalized observation
    const observation = this.observer.observe({
      claim: input.claim,
      category: input.category,
      source: input.source,
      observedBy: input.observedBy,
      metadata: input.metadata,
      confidence: input.confidence,
      confidenceReason: input.confidenceReason,
    });

    // Step 2: VERIFY - Apply verification rules
    const verification = this.verificationEngine.verify(observation);

    // Step 3: ATTEST - Create cryptographic proof
    const attestation = this.attestationService.attest(verification);

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

    if (verification.summary.passed) {
      this.executionStats.successCount++;
    } else {
      this.executionStats.failureCount++;
    }

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

    return {
      totalObservations: stats.observations,
      totalVerifications: stats.verifications,
      avgVerificationTime: 0, // Would be collected in production
      successRate,
      totalAttestations: stats.attestations,
      systemConfidence: avgConfidence,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Export complete event log for audit/backup
   */
  public exportEventLog() {
    return this.eventLog.exportEventLog();
  }
}

export default VerificationRuntime;
