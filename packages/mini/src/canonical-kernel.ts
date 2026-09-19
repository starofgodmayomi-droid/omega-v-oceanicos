import { createHmac, randomUUID } from 'crypto';

/* ─── Oceanic IR & Constitutional Types ──────────────────────────── */

export type EpistemicClassification = 'FACT' | 'INFERENCE' | 'SPECULATION';

export interface OceanicIntentSpec {
  intentId: string;
  claim: string;
  actors: string[];
  inputs: Record<string, unknown>;
  expectedOutputs: Record<string, unknown>;
  constraints: string[];
  permissions: string[];
  dependencies: string[];
  maxRiskScore: number;
  economicTarget: {
    targetValue: number;
    resourceBudget: number;
  };
}

export interface StateObservation {
  observationId: string;
  source: string;
  observedAt: string;
  rawTelemetry: Record<string, unknown>;
  epistemicType: EpistemicClassification;
  confidence: number;
}

export interface EvidenceArtifact {
  evidenceId: string;
  claim: string;
  source: string;
  observationId: string;
  commandOrTest: string;
  status: 'PASSED' | 'FAILED' | 'INCONCLUSIVE';
  confidence: number;
}

export interface StateDissentRecord {
  dissentId: string;
  actor: string;
  claim: string;
  counterEvidence: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'BLOCKER';
  recordedAt: string;
}

export interface HumanAuthorizationGate {
  requiresHumanApproval: boolean;
  isAuthorized: boolean;
  authorizedByDid?: string;
  authorizationSignature?: string;
  authorizedAt?: string;
}

export interface CanonicalActionPlan {
  actionId: string;
  targetService: string;
  payload: Record<string, unknown>;
  isDestructive: boolean;
  isFinancial: boolean;
  gasLimit: number;
  reversibility: 'REVERSIBLE' | 'COMPENSATABLE' | 'IRREVERSIBLE';
  status: 'PENDING' | 'READY' | 'EXECUTING' | 'EXECUTED' | 'FAILED' | 'REVERTED';
}

export interface ObservedConsequence {
  consequenceId: string;
  actionId: string;
  observedStatus: 'SUCCESS' | 'FAILURE' | 'PARTIAL' | 'TIMEOUT';
  realizedEffects: Record<string, unknown>;
  executionDurationMs: number;
  verifiedValueGenerated: number;
  observedAt: string;
}

export interface KernelLearningSynthesis {
  learningId: string;
  successRateScore: number;
  meanVerificationLatencyMs: number;
  dissentResolutionRatio: number;
  recompilationTriggered: boolean;
  proposedNextIntentPrompt: string;
}

export interface CanonicalStateNode {
  stateId: string;
  stateIndex: number;
  parentStateHash: string;
  stateDeltaHash: string;
  attestationSignature: string;
  createdAt: string;
  intent: OceanicIntentSpec;
  observation: StateObservation;
  evidence: EvidenceArtifact[];
  verificationStatus: 'VERIFIED' | 'FALSIFIED' | 'UNCERTAIN';
  dissent: StateDissentRecord[];
  authorization: HumanAuthorizationGate;
  action: CanonicalActionPlan;
  consequence?: ObservedConsequence;
  learning?: KernelLearningSynthesis;
  settledAt?: string;
}

export interface KernelStats {
  totalTransitions: number;
  verifiedStatesCount: number;
  dissentRecordedCount: number;
  gatedActionsCount: number;
  currentRootStateHash: string;
}

/**
 * Structured integrity report for the kernel's hash-chain.
 * Returned by `verifyChainIntegrity()` — the kernel's self-audit primitive.
 */
export interface KernelIntegrityReport {
  valid: boolean;
  chainLength: number;
  checkedAt: string;
  firstBrokenLink?: {
    stateId: string;
    stateIndex: number;
    expectedParentHash: string;
    actualParentHash: string;
  };
  attestationFailures: string[];
}

/* ─── Helper Functions ───────────────────────────────────────────── */

function hmac(key: string, data: string): string {
  return createHmac('sha256', key).update(data).digest('hex');
}

/* ─── Oceanic Kernel Implementation ──────────────────────────────── */

export class OceanicosKernel {
  private readonly secret: string;
  private readonly states: CanonicalStateNode[] = [];
  private currentHeadHash: string;

  constructor(secret = 'oceanicos-canonical-kernel-root-secret') {
    this.secret = secret;
    this.currentHeadHash =
      '0x0000000000000000000000000000000000000000000000000000000000000000';
  }

  /* ── 1. Canonical State Transition Sn ── */

  transition(opts: {
    intent: Omit<OceanicIntentSpec, 'intentId'>;
    observation: Omit<StateObservation, 'observationId'>;
    evidenceItems: Omit<EvidenceArtifact, 'evidenceId'>[];
    dissentItems?: Omit<StateDissentRecord, 'dissentId' | 'recordedAt'>[];
    actionPlan: Omit<CanonicalActionPlan, 'actionId' | 'status'>;
    autoAuthorizeIfNonDestructive?: boolean;
  }): CanonicalStateNode {
    const nextIndex = this.states.length + 1;
    const stateId = `state-${nextIndex}-${randomUUID().slice(0, 8)}`;

    const fullIntent: OceanicIntentSpec = {
      intentId: `intent-${randomUUID().slice(0, 8)}`,
      ...opts.intent,
    };

    const fullObservation: StateObservation = {
      observationId: `obs-${randomUUID().slice(0, 8)}`,
      ...opts.observation,
    };

    const fullEvidence: EvidenceArtifact[] = opts.evidenceItems.map((e) => ({
      evidenceId: `ev-${randomUUID().slice(0, 8)}`,
      ...e,
    }));

    const fullDissent: StateDissentRecord[] = (opts.dissentItems || []).map((d) => ({
      dissentId: `dissent-${randomUUID().slice(0, 8)}`,
      recordedAt: new Date().toISOString(),
      ...d,
    }));

    // Verification evaluation
    const hasFailures = fullEvidence.some((e) => e.status === 'FAILED');
    const hasInconclusive = fullEvidence.some((e) => e.status === 'INCONCLUSIVE');
    const hasBlockerDissent = fullDissent.some((d) => d.severity === 'BLOCKER');

    let verificationStatus: 'VERIFIED' | 'FALSIFIED' | 'UNCERTAIN' = 'VERIFIED';
    if (hasFailures || hasBlockerDissent) {
      verificationStatus = 'FALSIFIED';
    } else if (hasInconclusive || fullEvidence.length === 0) {
      verificationStatus = 'UNCERTAIN';
    }

    // Human Authorization Gate
    const requiresApproval =
      opts.actionPlan.isDestructive ||
      opts.actionPlan.isFinancial ||
      opts.actionPlan.reversibility === 'IRREVERSIBLE' ||
      fullDissent.length > 0;

    const autoAuth =
      !requiresApproval && (opts.autoAuthorizeIfNonDestructive ?? true);

    const authorization: HumanAuthorizationGate = {
      requiresHumanApproval: requiresApproval,
      isAuthorized: autoAuth,
      authorizedByDid: autoAuth ? 'did:omega:kernel:auto' : undefined,
      authorizedAt: autoAuth ? new Date().toISOString() : undefined,
    };

    const action: CanonicalActionPlan = {
      actionId: `action-${randomUUID().slice(0, 8)}`,
      status: autoAuth ? 'READY' : 'PENDING',
      ...opts.actionPlan,
    };

    // State Delta Hashing & Attestation
    const parentStateHash = this.currentHeadHash;
    const statePayload = `${stateId}:${parentStateHash}:${fullIntent.intentId}:${fullObservation.observationId}:${verificationStatus}:${fullDissent.length}:${action.actionId}`;
    const stateDeltaHash = hmac(this.secret, statePayload);
    const createdAt = new Date().toISOString();
    const attestationSignature = hmac(
      this.secret,
      `ATTEST_STATE:${stateDeltaHash}:${createdAt}`
    );

    const stateNode: CanonicalStateNode = {
      stateId,
      stateIndex: nextIndex,
      parentStateHash,
      stateDeltaHash,
      attestationSignature,
      createdAt,
      intent: fullIntent,
      observation: fullObservation,
      evidence: fullEvidence,
      verificationStatus,
      dissent: fullDissent,
      authorization,
      action,
    };

    this.states.push(stateNode);
    this.currentHeadHash = stateDeltaHash;

    return { ...stateNode };
  }

  /* ── 2. Human Authorization of Gated Actions (Immutable) ── */

  authorizeAction(opts: {
    stateId: string;
    authorizerDid: string;
    authorizationSignature: string;
  }): CanonicalStateNode {
    const nodeIndex = this.states.findIndex((s) => s.stateId === opts.stateId);
    if (nodeIndex === -1) {
      throw new Error(`State node ${opts.stateId} not found`);
    }

    const node = this.states[nodeIndex];

    if (!opts.authorizerDid.startsWith('did:')) {
      throw new Error('Invalid authorizer DID format');
    }

    // Create a new immutable node instead of mutating the existing one.
    const authorizedNode: CanonicalStateNode = {
      ...node,
      authorization: {
        ...node.authorization,
        isAuthorized: true,
        authorizedByDid: opts.authorizerDid,
        authorizationSignature: opts.authorizationSignature,
        authorizedAt: new Date().toISOString(),
      },
      action: {
        ...node.action,
        status: 'READY',
      },
    };

    this.states[nodeIndex] = authorizedNode;
    return { ...authorizedNode };
  }

  /* ── 2b. Execute an Authorized Action ── */

  executeAction(opts: {
    stateId: string;
    executorDid?: string;
  }): CanonicalStateNode {
    const nodeIndex = this.states.findIndex((s) => s.stateId === opts.stateId);
    if (nodeIndex === -1) {
      throw new Error(`State node ${opts.stateId} not found`);
    }

    const node = this.states[nodeIndex];

    if (!node.authorization.isAuthorized) {
      throw new Error(
        `EXECUTION_DENIED: State ${opts.stateId} is not authorized. ` +
        `Human approval required: ${node.authorization.requiresHumanApproval}`
      );
    }

    if (node.action.status !== 'READY') {
      throw new Error(
        `EXECUTION_DENIED: Action ${node.action.actionId} status is ${node.action.status}, expected READY`
      );
    }

    const executingNode: CanonicalStateNode = {
      ...node,
      action: {
        ...node.action,
        status: 'EXECUTING',
      },
    };

    this.states[nodeIndex] = executingNode;
    return { ...executingNode };
  }

  /* ── 3. Record Action Consequence & Trigger Recompilation ── */

  applyConsequence(opts: {
    stateId: string;
    observedStatus: 'SUCCESS' | 'FAILURE' | 'PARTIAL' | 'TIMEOUT';
    realizedEffects: Record<string, unknown>;
    executionDurationMs: number;
    verifiedValueGenerated: number;
  }): CanonicalStateNode {
    const nodeIndex = this.states.findIndex((s) => s.stateId === opts.stateId);
    if (nodeIndex === -1) {
      throw new Error(`State node ${opts.stateId} not found`);
    }

    const node = this.states[nodeIndex];
    const consequenceId = `consequence-${randomUUID().slice(0, 8)}`;
    const consequence: ObservedConsequence = {
      consequenceId,
      actionId: node.action.actionId,
      observedStatus: opts.observedStatus,
      realizedEffects: opts.realizedEffects,
      executionDurationMs: opts.executionDurationMs,
      verifiedValueGenerated: opts.verifiedValueGenerated,
      observedAt: new Date().toISOString(),
    };

    // Calculate empirical learning feedback
    const learning: KernelLearningSynthesis = {
      learningId: `learn-${randomUUID().slice(0, 8)}`,
      successRateScore: opts.observedStatus === 'SUCCESS' ? 1.0 : 0.0,
      meanVerificationLatencyMs: opts.executionDurationMs,
      dissentResolutionRatio: node.dissent.length === 0 ? 1.0 : 0.5,
      recompilationTriggered: opts.observedStatus === 'FAILURE',
      proposedNextIntentPrompt:
        opts.observedStatus === 'SUCCESS'
          ? `Extend and optimize state ${node.stateId}`
          : `Remediate failure in state ${node.stateId}`,
    };

    const updatedNode: CanonicalStateNode = {
      ...node,
      action: {
        ...node.action,
        status: opts.observedStatus === 'SUCCESS' ? 'EXECUTED' : 'FAILED',
      },
      consequence,
      learning,
      settledAt: new Date().toISOString(),
    };

    this.states[nodeIndex] = updatedNode;
    return { ...updatedNode };
  }

  /* ── 4. Query States & Lineage ── */

  getState(stateId: string): CanonicalStateNode | undefined {
    const node = this.states.find((s) => s.stateId === stateId);
    return node ? { ...node } : undefined;
  }

  getStates(): CanonicalStateNode[] {
    return this.states.map((s) => ({ ...s }));
  }

  /* ── 5. Operational Statistics ── */

  getStats(): KernelStats {
    return {
      totalTransitions: this.states.length,
      verifiedStatesCount: this.states.filter((s) => s.verificationStatus === 'VERIFIED').length,
      dissentRecordedCount: this.states.reduce((acc, s) => acc + s.dissent.length, 0),
      gatedActionsCount: this.states.filter((s) => s.authorization.requiresHumanApproval).length,
      currentRootStateHash: this.currentHeadHash,
    };
  }

  /* ── 6. Chain Head & Length ── */

  getHead(): CanonicalStateNode | null {
    return this.states.length > 0 ? { ...this.states[this.states.length - 1] } : null;
  }

  getChainLength(): number {
    return this.states.length;
  }

  /* ── 7. Hash-Chain Integrity Verification ── */

  /**
   * Walk the entire state chain and verify every link:
   *  - Each node's `parentStateHash` must equal the previous node's `stateDeltaHash`
   *  - Each node's `attestationSignature` must be reproducible from its `stateDeltaHash`
   *  - The genesis node's `parentStateHash` must be the null hash
   *
   * This is the kernel's self-audit primitive. If it reports `valid: false`,
   * the chain has been tampered with and nothing above it is trustworthy.
   */
  verifyChainIntegrity(): KernelIntegrityReport {
    const report: KernelIntegrityReport = {
      valid: true,
      chainLength: this.states.length,
      checkedAt: new Date().toISOString(),
      attestationFailures: [],
    };

    if (this.states.length === 0) {
      return report;
    }

    const genesisHash =
      '0x0000000000000000000000000000000000000000000000000000000000000000';
    let expectedParentHash = genesisHash;

    for (const node of this.states) {
      // 1. Verify parent-hash linkage
      if (node.parentStateHash !== expectedParentHash) {
        report.valid = false;
        report.firstBrokenLink = {
          stateId: node.stateId,
          stateIndex: node.stateIndex,
          expectedParentHash,
          actualParentHash: node.parentStateHash,
        };
        return report;
      }

      // 2. Reproduce the state delta hash
      const statePayload = `${node.stateId}:${node.parentStateHash}:${node.intent.intentId}:${node.observation.observationId}:${node.verificationStatus}:${node.dissent.length}:${node.action.actionId}`;
      const expectedDeltaHash = hmac(this.secret, statePayload);

      if (node.stateDeltaHash !== expectedDeltaHash) {
        report.valid = false;
        report.firstBrokenLink = {
          stateId: node.stateId,
          stateIndex: node.stateIndex,
          expectedParentHash: expectedDeltaHash,
          actualParentHash: node.stateDeltaHash,
        };
        return report;
      }

      // 3. Verify attestation signature
      const expectedAttestation = hmac(
        this.secret,
        `ATTEST_STATE:${node.stateDeltaHash}:${node.createdAt}`
      );
      if (node.attestationSignature !== expectedAttestation) {
        report.attestationFailures.push(node.stateId);
      }

      expectedParentHash = node.stateDeltaHash;
    }

    if (report.attestationFailures.length > 0) {
      report.valid = false;
    }

    return report;
  }

  /* ── 8. State Persistence ── */

  /**
   * Serialize the kernel's full state chain into a JSON-safe snapshot.
   * The snapshot captures every `CanonicalStateNode` and the current head hash,
   * enabling lossless round-tripping via `deserialize()`.
   */
  serialize(): KernelSnapshot {
    return {
      version: 1,
      secret: this.secret,
      currentHeadHash: this.currentHeadHash,
      states: this.states.map((s) => ({ ...s })),
      serializedAt: new Date().toISOString(),
    };
  }

  /**
   * Restore a kernel from a previously serialized snapshot.
   * Validates the snapshot version and reconstitutes the full internal state.
   */
  static deserialize(snapshot: KernelSnapshot): OceanicosKernel {
    if (!snapshot || snapshot.version !== 1) {
      throw new Error('INVALID_SNAPSHOT: Unsupported or missing snapshot version');
    }
    const kernel = new OceanicosKernel(snapshot.secret);
    for (const state of snapshot.states) {
      (kernel as any).states.push({ ...state });
    }
    (kernel as any).currentHeadHash = snapshot.currentHeadHash;
    return kernel;
  }

  /**
   * Persist the kernel state to a JSON file on disk.
   * Creates parent directories if needed.
   */
  async saveToFile(filePath: string): Promise<void> {
    const { writeFile, mkdir } = await import('node:fs/promises');
    const { dirname } = await import('node:path');
    await mkdir(dirname(filePath), { recursive: true });
    const snapshot = this.serialize();
    await writeFile(filePath, JSON.stringify(snapshot, null, 2), 'utf-8');
  }

  /**
   * Load kernel state from a JSON file on disk.
   * Returns a new kernel at genesis if the file does not exist.
   */
  static async loadFromFile(filePath: string, fallbackSecret?: string): Promise<OceanicosKernel> {
    const { readFile } = await import('node:fs/promises');
    try {
      const raw = await readFile(filePath, 'utf-8');
      const snapshot: KernelSnapshot = JSON.parse(raw);
      return OceanicosKernel.deserialize(snapshot);
    } catch {
      return new OceanicosKernel(fallbackSecret);
    }
  }
}

/**
 * Serializable snapshot of the kernel's complete state chain.
 * Used for persistence across process restarts.
 */
export interface KernelSnapshot {
  version: number;
  secret: string;
  currentHeadHash: string;
  states: CanonicalStateNode[];
  serializedAt: string;
}

