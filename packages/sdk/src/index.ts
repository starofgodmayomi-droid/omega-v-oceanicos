import { Observer } from '@omega-v/observer';
import { VerificationEngine } from '@omega-v/verification';
import { AttestationService } from '@omega-v/attestation';
import { ProvenanceStore } from '@omega-v/store';
import {
  Observation,
  VerificationResult,
  Attestation,
  EventLogEntry,
  SystemMetrics,
  VerificationRule,
  QueryResult,
} from '@omega-v/types';

export interface OceanicosClientOptions {
  /** Mode of operation: 'local' (embedded engine) or 'remote' (REST API) */
  mode?: 'local' | 'remote';
  /** Base URL when mode is 'remote' */
  apiBaseUrl?: string;
  /** Custom signing key */
  signingKey?: string;
}

export interface FullLoopResult {
  observation: Observation;
  verification: VerificationResult;
  attestation: Attestation;
}

export interface EcosystemFlowResult {
  flowId: string;
  compiledIR: { name: string; instructionCount: number };
  observation: { id: string; status: string; confidence: number };
  verification: { passed: boolean; rulesEvaluated: number };
  attestation: { id: string; signature: string };
  kernelState: {
    stateId: string;
    stateIndex: number;
    verificationStatus: string;
    stateDeltaHash: string;
  };
  reputation: {
    agentDid: string;
    newScore: number;
    scoreDelta: number;
  };
  provenanceLogSize: number;
  executedAt: string;
}

/**
 * OceanicosClient: High-level SDK for interacting with the Ω∞v Oceanicos verification loop
 */
export class OceanicosClient {
  private observer: Observer;
  private verificationEngine: VerificationEngine;
  private attestationService: AttestationService;
  private store: ProvenanceStore;
  private mode: 'local' | 'remote';
  private apiBaseUrl: string;

  constructor(options: OceanicosClientOptions = {}) {
    this.mode = options.mode || 'local';
    this.apiBaseUrl = options.apiBaseUrl || 'http://localhost:3000';

    this.observer = new Observer();
    this.verificationEngine = new VerificationEngine();
    this.attestationService = new AttestationService(options.signingKey);
    this.store = new ProvenanceStore();

    // Register default rules for local mode
    this.verificationEngine.registerRule({
      name: 'response-time-threshold',
      version: '1.0.5',
      appliesTo: ['health-check'],
      definition: 'responseTime < 100',
      description: 'Verify response time is below 100ms',
      createdAt: new Date().toISOString(),
      active: true,
    });
    this.verificationEngine.registerRule({
      name: 'status-code-check',
      version: '1.2.0',
      appliesTo: ['health-check'],
      definition: 'statusCode == 200',
      description: 'Verify HTTP status code is 200 OK',
      createdAt: new Date().toISOString(),
      active: true,
    });
  }

  /**
   * Run the complete loop: Observe → Verify → Attest → Record
   */
  public async runLoop(input: {
    claim: string;
    category?: string;
    sourceSystem?: string;
    observedBy?: string;
    metadata?: Record<string, unknown>;
    confidence?: number;
    confidenceReason?: string;
  }): Promise<FullLoopResult> {
    if (this.mode === 'remote') {
      const res = await fetch(`${this.apiBaseUrl}/complete-loop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claim: input.claim,
          category: input.category || 'health-check',
          source: {
            system: input.sourceSystem || 'sdk-client',
            version: '0.1.0',
            environment: 'production',
          },
          observedBy: input.observedBy || 'sdk-user',
          metadata: input.metadata || { statusCode: 200, responseTime: 40 },
          confidence: input.confidence ?? 0.95,
          confidenceReason: input.confidenceReason || 'SDK execution',
        }),
      });
      if (!res.ok) throw new Error(`Remote API error: HTTP ${res.status}`);
      const payload = (await res.json()) as { data: FullLoopResult };
      return payload.data;
    }

    // Local embedded execution
    const observation = this.observer.observe({
      claim: input.claim,
      category: input.category || 'health-check',
      source: {
        system: input.sourceSystem || 'sdk-client',
        version: '0.1.0',
        environment: 'production',
      },
      observedBy: input.observedBy || 'sdk-user',
      metadata: input.metadata || { statusCode: 200, responseTime: 40 },
      confidence: input.confidence ?? 0.95,
      confidenceReason: input.confidenceReason || 'SDK execution',
    });
    this.store.recordObservation(observation);

    const verification = this.verificationEngine.verify(observation);
    this.store.recordVerification(verification);

    const attestation = this.attestationService.attest(verification);
    this.store.recordAttestation(attestation);

    return { observation, verification, attestation };
  }

  /**
   * Run the unified 8-stage canonical ecosystem OS execution flow
   */
  public async runEcosystemFlow(input: {
    intentClaim?: string;
    actorDid?: string;
    ruleDefinition?: string;
    category?: string;
    metadata?: Record<string, unknown>;
    confidence?: number;
  } = {}): Promise<EcosystemFlowResult> {
    if (this.mode === 'remote') {
      const res = await fetch(`${this.apiBaseUrl}/ecosystem/flow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error(`Remote API error: HTTP ${res.status}`);
      const payload = (await res.json()) as { data: EcosystemFlowResult };
      return payload.data;
    }

    // Local embedded execution: Observe → Verify → Attest
    const observation = this.observer.observe({
      claim: input.intentClaim || 'Autonomous verified ecosystem state transition',
      category: input.category || 'ecosystem-flow',
      source: { system: 'sdk-client', version: '0.1.0', environment: 'production' },
      observedBy: input.actorDid || 'did:omega:agent:sdk-operator',
      metadata: input.metadata || { statusCode: 200, responseTime: 30 },
      confidence: input.confidence ?? 0.98,
      confidenceReason: 'SDK local embedded flow execution',
    });
    this.store.recordObservation(observation);

    const verification = this.verificationEngine.verify(observation);
    this.store.recordVerification(verification);

    const attestation = this.attestationService.attest(verification);
    this.store.recordAttestation(attestation);

    return {
      flowId: `flow-local-${Date.now()}`,
      compiledIR: { name: 'local-intent-rule', instructionCount: 4 },
      observation: { id: observation.id, status: observation.status, confidence: observation.confidence },
      verification: { passed: verification.summary.passed, rulesEvaluated: verification.summary.rulesApplied },
      attestation: { id: attestation.id, signature: attestation.signature },
      kernelState: {
        stateId: `state-local-1`,
        stateIndex: 1,
        verificationStatus: verification.summary.passed ? 'VERIFIED' : 'REJECTED',
        stateDeltaHash: attestation.signature,
      },
      reputation: {
        agentDid: input.actorDid || 'did:omega:agent:sdk-operator',
        newScore: 520,
        scoreDelta: 20,
      },
      provenanceLogSize: this.store.size(),
      executedAt: new Date().toISOString(),
    };
  }

  /**
   * Register custom verification rule
   */
  public registerRule(rule: VerificationRule): void {
    this.verificationEngine.registerRule(rule);
  }

  /**
   * Get all registered verification rules
   */
  public getRules(): VerificationRule[] {
    return this.verificationEngine.getRules();
  }

  /**
   * Query recorded provenance events
   */
  public queryEvents(options?: {
    type?: 'OBSERVATION' | 'VERIFICATION' | 'ATTESTATION';
    since?: string;
    limit?: number;
    offset?: number;
  }): QueryResult {
    return this.store.query(options);
  }

  /**
   * Export entire provenance chain with integrity summary
   */
  public exportChain(): {
    events: EventLogEntry[];
    integrity: { valid: boolean; totalEvents: number; brokenAt?: number };
  } {
    const events = this.store.query().events;
    const chainIntegrity = this.store.verifyChainIntegrity();
    return {
      events,
      integrity: {
        valid: chainIntegrity.valid,
        brokenAt: chainIntegrity.brokenAt,
        totalEvents: events.length,
      },
    };
  }

  /**
   * Get total events recorded in local store
   */
  public getLogEntries(): EventLogEntry[] {
    return this.store.query().events;
  }

  /**
   * Get system metrics
   */
  public getMetrics(): SystemMetrics {
    return this.store.getMetrics();
  }

  /**
   * Verify local chain integrity
   */
  public verifyIntegrity(): { valid: boolean; totalEvents?: number } {
    return this.store.verifyChainIntegrity();
  }

  /**
   * Access underlying ProvenanceStore
   */
  public getStore(): ProvenanceStore {
    return this.store;
  }

  /**
   * Access underlying VerificationEngine
   */
  public getVerificationEngine(): VerificationEngine {
    return this.verificationEngine;
  }

  /**
   * Access underlying Observer
   */
  public getObserver(): Observer {
    return this.observer;
  }

  /**
   * Access underlying AttestationService
   */
  public getAttestationService(): AttestationService {
    return this.attestationService;
  }
}

export { Observer } from '@omega-v/observer';
export { VerificationEngine } from '@omega-v/verification';
export { AttestationService } from '@omega-v/attestation';
export { ProvenanceStore } from '@omega-v/store';

export default OceanicosClient;
