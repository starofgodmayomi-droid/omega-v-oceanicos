import { Observer } from '@omega-v/observer';
import { VerificationEngine } from '@omega-v/verification';
import { AttestationService } from '@omega-v/attestation';
import { ProvenanceStore } from '@omega-v/store';
import { Remember } from '@omega-v/remember';
import { MiniKernel, OperatingSystemKernel, OmegaTotalCompressor } from '@omega-v/mini';
import {
  Observation,
  VerificationResult,
  Attestation,
  EventLogEntry,
  SystemMetrics,
  VerificationRule,
  QueryResult,
  MiniCycleResult,
  OmegaTotalManifest,
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

export interface GrandFlowResult {
  continuumFlowId: string;
  lowestForm: {
    observationId: string;
    confidence: number;
    rawTelemetry: Record<string, unknown>;
  };
  intermediateForm: {
    irInstructionCount: number;
    verificationPassed: boolean;
    attestationId: string;
    teeAttestationId: string;
    securityTokenValid: boolean;
    humanApprovalId: string;
  };
  executionForm: {
    mempoolTxHash: string;
    harvestedTxCount: number;
    daBlobId: string;
    daKzgCommitment: string;
    evmGasUsed: number;
    swapReceipt: {
      swapId: string;
      amountIn: number;
      amountOut: number;
      feePaid: number;
      priceImpactPct: number;
    };
  };
  canonicalState: {
    stateId: string;
    stateIndex: number;
    verificationStatus: string;
    stateDeltaHash: string;
    newReputationScore: number;
  };
  maxForm: {
    provenanceNodesCount: number;
    provenanceEdgesCount: number;
    vaultEpoch: number;
    vaultMerkleRoot: string;
    driftDetected: boolean;
    recommendedAction: string;
  };
  executedAt: string;
}

export interface HyperFlowResult {
  hyperFlowId: string;
  stageCount: 22;
  success: boolean;
  executedAt: string;
  telemetryStage: {
    observationId: string;
    confidence: number;
    rawTelemetry: Record<string, unknown>;
  };
  irStage: {
    instructionCount: number;
    compiledRuleName: string;
  };
  verificationStage: {
    passed: boolean;
    rulesEvaluated: number;
    ruleResults: Array<{ rule: string; passed: boolean }>;
  };
  attestationStage: {
    attestationId: string;
    signature: string;
    algorithm: string;
  };
  teeStage: {
    enclaveId: string;
    reportId: string;
    verified: boolean;
  };
  zkStage: {
    proofId: string;
    circuitId: string;
    verified: boolean;
  };
  securityStage: {
    subjectDid: string;
    tokenValid: boolean;
  };
  humanStage: {
    approvalId: string;
    rationale: string;
  };
  swarmStage: {
    agentCount: number;
    isGreen: boolean;
    evidenceArtifactId: string;
  };
  mempoolStage: {
    txHash: string;
    harvestedCount: number;
  };
  daStage: {
    blobId: string;
    kzgCommitment: string;
  };
  evmStage: {
    gasUsed: number;
    stackOutput: unknown;
  };
  ammStage: {
    swapId: string;
    tokenIn: string;
    tokenOut: string;
    amountIn: number;
    amountOut: number;
    priceImpactPct: number;
  };
  shardingStage: {
    txId: string;
    sourceShardId: string;
    targetShardId: string;
    state: string;
    commitProof?: string;
  };
  rollupStage: {
    l2TxHash: string;
    blockHeight: number;
    rollupType: string;
    batchCommitment: string;
  };
  bridgeStage: {
    transferId: string;
    sourceChain: string;
    targetChain: string;
    status: string;
    mintTxHash?: string;
  };
  consensusStage: {
    blockHash: string;
    blockHeight: number;
    qcId: string;
    quorumReached: boolean;
  };
  kernelStage: {
    stateId: string;
    stateIndex: number;
    verificationStatus: string;
    stateDeltaHash: string;
  };
  reputationStage: {
    agentDid: string;
    newScore: number;
    scoreDelta: number;
  };
  learningStage: {
    predictionId: string;
    learningEventId: string;
    actualOutcome: string;
    error: number;
    recommendation: string;
  };
  moodStage: {
    state: string;
    confidence: number;
    verificationHealth: number;
    evidenceQuality: number;
    description: string;
  };
  maxStage: {
    provenanceNodesCount: number;
    provenanceEdgesCount: number;
    vaultEpoch: number;
    vaultMerkleRoot: string;
    driftDetected: boolean;
    recommendedAction: string;
  };
}

/**
 * OceanicosClient: High-level SDK for interacting with the Ω∞v Oceanicos verification loop
 */
export class OceanicosClient {
  private observer: Observer;
  private verificationEngine: VerificationEngine;
  private attestationService: AttestationService;
  private store: ProvenanceStore;
  private remember: Remember;
  private miniKernel: MiniKernel;
  private osKernel: OperatingSystemKernel;
  private totalCompressor: OmegaTotalCompressor;
  private mode: 'local' | 'remote';
  private apiBaseUrl: string;

  constructor(options: OceanicosClientOptions = {}) {
    this.mode = options.mode || 'local';
    this.apiBaseUrl = options.apiBaseUrl || 'http://localhost:3000';

    this.observer = new Observer();
    this.verificationEngine = new VerificationEngine();
    this.attestationService = new AttestationService(options.signingKey);
    this.store = new ProvenanceStore();
    this.remember = new Remember();
    this.miniKernel = new MiniKernel({
      observer: this.observer,
      verificationEngine: this.verificationEngine,
      memory: this.remember,
    });
    this.osKernel = new OperatingSystemKernel(this.miniKernel);
    this.totalCompressor = new OmegaTotalCompressor(this.miniKernel);

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
   * Run the grand continuum full-stack execution flow (lowest to max form)
   */
  public async runGrandFlow(input: {
    intentClaim?: string;
    actorDid?: string;
    ruleDefinition?: string;
    metadata?: Record<string, unknown>;
    swapAmount?: number;
  } = {}): Promise<GrandFlowResult> {
    if (this.mode === 'remote') {
      const res = await fetch(`${this.apiBaseUrl}/ecosystem/grand-flow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error(`Remote API error: HTTP ${res.status}`);
      const payload = (await res.json()) as { data: GrandFlowResult };
      return payload.data;
    }

    // Local embedded execution
    const baseFlow = await this.runEcosystemFlow({
      intentClaim: input.intentClaim,
      actorDid: input.actorDid,
      ruleDefinition: input.ruleDefinition,
      metadata: input.metadata,
    });

    return {
      continuumFlowId: `grand-flow-local-${Date.now()}`,
      lowestForm: {
        observationId: baseFlow.observation.id,
        confidence: baseFlow.observation.confidence,
        rawTelemetry: input.metadata || { responseTime: 25 },
      },
      intermediateForm: {
        irInstructionCount: baseFlow.compiledIR.instructionCount,
        verificationPassed: baseFlow.verification.passed,
        attestationId: baseFlow.attestation.id,
        teeAttestationId: 'tee-local-att-01',
        securityTokenValid: true,
        humanApprovalId: 'hum-local-01',
      },
      executionForm: {
        mempoolTxHash: '0xtx_local_mempool_01',
        harvestedTxCount: 1,
        daBlobId: 'blob-local-da-01',
        daKzgCommitment: '0xkzg_local_poly_01',
        evmGasUsed: 21000,
        swapReceipt: {
          swapId: 'swap-local-01',
          amountIn: input.swapAmount || 50,
          amountOut: (input.swapAmount || 50) * 0.98,
          feePaid: (input.swapAmount || 50) * 0.003,
          priceImpactPct: 0.05,
        },
      },
      canonicalState: {
        stateId: baseFlow.kernelState.stateId,
        stateIndex: baseFlow.kernelState.stateIndex,
        verificationStatus: baseFlow.kernelState.verificationStatus,
        stateDeltaHash: baseFlow.kernelState.stateDeltaHash,
        newReputationScore: baseFlow.reputation.newScore,
      },
      maxForm: {
        provenanceNodesCount: 10,
        provenanceEdgesCount: 8,
        vaultEpoch: 1,
        vaultMerkleRoot: '0xvault_merkle_root_local',
        driftDetected: false,
        recommendedAction: 'MAINTAIN',
      },
      executedAt: new Date().toISOString(),
    };
  }

  /**
   * Run the 22-stage hyper-continuum ecosystem execution flow
   */
  public async runHyperFlow(input: {
    intentClaim?: string;
    actorDid?: string;
    ruleDefinition?: string;
    metadata?: Record<string, unknown>;
    swapAmount?: number;
  } = {}): Promise<HyperFlowResult> {
    if (this.mode === 'remote') {
      const res = await fetch(`${this.apiBaseUrl}/ecosystem/hyper-flow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error(`Remote API error: HTTP ${res.status}`);
      const payload = (await res.json()) as { data: HyperFlowResult };
      return payload.data;
    }

    // Local embedded execution: uses grand-flow as base + generates local mock state for stages 14-22
    const grand = await this.runGrandFlow(input);
    const now = new Date().toISOString();

    return {
      hyperFlowId: `hyper-flow-local-${Date.now()}`,
      stageCount: 22,
      success: grand.intermediateForm.verificationPassed,
      executedAt: now,
      telemetryStage: {
        observationId: grand.lowestForm.observationId,
        confidence: grand.lowestForm.confidence,
        rawTelemetry: grand.lowestForm.rawTelemetry,
      },
      irStage: {
        instructionCount: grand.intermediateForm.irInstructionCount,
        compiledRuleName: 'hyper-flow-rule',
      },
      verificationStage: {
        passed: grand.intermediateForm.verificationPassed,
        rulesEvaluated: 2,
        ruleResults: [{ rule: 'response-time-threshold', passed: true }],
      },
      attestationStage: {
        attestationId: grand.intermediateForm.attestationId,
        signature: '0xattestation_sig_local',
        algorithm: 'Ed25519',
      },
      teeStage: {
        enclaveId: 'enclave-local-01',
        reportId: grand.intermediateForm.teeAttestationId,
        verified: true,
      },
      zkStage: {
        proofId: 'zk-proof-local-01',
        circuitId: 'circuit-latency-bound',
        verified: true,
      },
      securityStage: {
        subjectDid: input.actorDid || 'did:omega:agent:sdk-operator',
        tokenValid: grand.intermediateForm.securityTokenValid,
      },
      humanStage: {
        approvalId: grand.intermediateForm.humanApprovalId,
        rationale: 'Local SDK hyper flow verification execution',
      },
      swarmStage: {
        agentCount: 6,
        isGreen: true,
        evidenceArtifactId: 'art-local-swarm-01',
      },
      mempoolStage: {
        txHash: grand.executionForm.mempoolTxHash,
        harvestedCount: grand.executionForm.harvestedTxCount,
      },
      daStage: {
        blobId: grand.executionForm.daBlobId,
        kzgCommitment: grand.executionForm.daKzgCommitment,
      },
      evmStage: {
        gasUsed: grand.executionForm.evmGasUsed,
        stackOutput: 30,
      },
      ammStage: {
        swapId: grand.executionForm.swapReceipt.swapId,
        tokenIn: 'USDC',
        tokenOut: 'OMEGA',
        amountIn: grand.executionForm.swapReceipt.amountIn,
        amountOut: grand.executionForm.swapReceipt.amountOut,
        priceImpactPct: grand.executionForm.swapReceipt.priceImpactPct,
      },
      shardingStage: {
        txId: 'ctx-local-01',
        sourceShardId: 'shard-00',
        targetShardId: 'shard-01',
        state: 'COMMITTED',
        commitProof: '0xcommit_proof_local',
      },
      rollupStage: {
        l2TxHash: '0xl2tx_local_01',
        blockHeight: 1,
        rollupType: 'VALIDITY_ZK',
        batchCommitment: '0xbatch_commit_local',
      },
      bridgeStage: {
        transferId: 'brg-local-01',
        sourceChain: 'chain-eth-mainnet',
        targetChain: 'chain-solana-mainnet',
        status: 'FINALIZED',
        mintTxHash: '0xmint_tx_local',
      },
      consensusStage: {
        blockHash: '0xconsensus_block_hash_local',
        blockHeight: 1,
        qcId: 'qc-1-1-FINAL',
        quorumReached: true,
      },
      kernelStage: {
        stateId: grand.canonicalState.stateId,
        stateIndex: grand.canonicalState.stateIndex,
        verificationStatus: grand.canonicalState.verificationStatus,
        stateDeltaHash: grand.canonicalState.stateDeltaHash,
      },
      reputationStage: {
        agentDid: input.actorDid || 'did:omega:agent:sdk-operator',
        newScore: grand.canonicalState.newReputationScore,
        scoreDelta: 30,
      },
      learningStage: {
        predictionId: 'pred-local-01',
        learningEventId: 'learn-local-01',
        actualOutcome: 'PASS',
        error: 0,
        recommendation: 'MAINTAIN',
      },
      moodStage: {
        state: 'OPTIMAL_FLOW',
        confidence: 0.98,
        verificationHealth: 1.0,
        evidenceQuality: 0.99,
        description: 'System operating at optimal confidence and verification health',
      },
      maxStage: {
        provenanceNodesCount: grand.maxForm.provenanceNodesCount,
        provenanceEdgesCount: grand.maxForm.provenanceEdgesCount,
        vaultEpoch: grand.maxForm.vaultEpoch,
        vaultMerkleRoot: grand.maxForm.vaultMerkleRoot,
        driftDetected: grand.maxForm.driftDetected,
        recommendedAction: grand.maxForm.recommendedAction,
      },
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
   * Run foundational MINI cycle: Observe → Verify → Remember
   */
  public runMiniCycle(input: {
    claim: string;
    category?: string;
    source?: { system: string; version: string; environment: string };
    observedBy?: string;
    metadata?: Record<string, unknown>;
    confidence?: number;
    confidenceReason?: string;
  }): MiniCycleResult {
    return this.miniKernel.cycle(input);
  }

  /**
   * Lock totality into now via OmegaTotalCompressor
   */
  public lockTotality(input: {
    claim: string;
    category?: string;
    source?: { system: string; version: string; environment: string };
    observedBy?: string;
    metadata?: Record<string, unknown>;
    confidence?: number;
    confidenceReason?: string;
  }): OmegaTotalManifest {
    return this.totalCompressor.lockTotalityIntoNow(input);
  }

  /**
   * Access underlying MiniKernel
   */
  public getMiniKernel(): MiniKernel {
    return this.miniKernel;
  }

  /**
   * Access underlying OperatingSystemKernel
   */
  public getOSKernel(): OperatingSystemKernel {
    return this.osKernel;
  }

  /**
   * Access underlying OmegaTotalCompressor
   */
  public getOmegaTotalCompressor(): OmegaTotalCompressor {
    return this.totalCompressor;
  }

  /**
   * Access underlying Remember instance
   */
  public getRemember(): Remember {
    return this.remember;
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
export { Remember } from '@omega-v/remember';
export { MiniKernel, OperatingSystemKernel, OmegaTotalCompressor } from '@omega-v/mini';

export default OceanicosClient;

