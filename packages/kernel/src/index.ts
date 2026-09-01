/**
 * @omega-v/kernel — Oceanic Finite State Machine Kernel
 *
 * Implements the Canonical Verification-First Full-Stack State Machine Loop:
 *   S_n = (Intent + Observation + Evidence + Verification + Dissent + Provenance + Authorization)
 *         → Action → Consequence → Learning → S_{n+1}
 *
 * Constitutional Kernel Invariants:
 *   - TRUTH > PERSUASION
 *   - EVIDENCE > ASSUMPTION
 *   - UNCERTAINTY → VERIFY
 *   - FACT ≠ INFERENCE ≠ SPECULATION
 *   - ATTEST ≠ ASSERT
 *   - DISSENT = PRESERVE
 *   - FRICTION = SIGNAL
 *   - REALITY = TEST
 *   - HUMAN AGENCY = FINAL
 *   - MAX = VERIFIED_VALUE / (RISK + COMPLEXITY + COST + TIME + RESOURCE)
 *
 * Ω∞v ::= REALITY ⇄ OBSERVE ⇄ EVIDENCE ⇄ VERIFY ⇄ REMEMBER ⇄ REASON ⇄ INTEND ⇄ BUILD ⇄ TEST ⇄ ATTEST ⇄ ACT ⇄ CONSEQUENCE ⇄ LEARN ⇄ AUDIT ⇄ RECOMPILE ↺∞
 */

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

export interface MachineEvidence {
  evidenceId: string;
  claim: string;
  source: string;
  observationId: string;
  commandOrTest: string;
  status: 'PASSED' | 'FAILED' | 'INCONCLUSIVE';
  confidence: number;
  proofWitness: string; // HMAC cryptographic inclusion proof
  timestamp: string;
}

export interface PreservedDissent {
  dissentId: string;
  agentOrModelDid: string;
  dissentingHypothesis: string;
  dissentEvidenceProof: string;
  conflictWeight: number;
  timestamp: string;
}

export interface HumanAuthorizationGate {
  requiresHumanApproval: boolean;
  isAuthorized: boolean;
  authorizedByDid?: string;
  authorizationSignature?: string;
  authorizedAt?: string;
  rejectionReason?: string;
}

export interface ActionExecutionPlan {
  actionId: string;
  targetService: string;
  payload: Record<string, unknown>;
  isDestructive: boolean;
  isFinancial: boolean;
  gasLimit: number;
  reversibility: 'REVERSIBLE' | 'IRREVERSIBLE' | 'COMPENSATABLE';
  status: 'PENDING_AUTH' | 'READY' | 'EXECUTING' | 'EXECUTED' | 'FAILED' | 'ROLLED_BACK';
}

export interface MeasuredConsequence {
  consequenceId: string;
  actionId: string;
  observedStatus: 'SUCCESS' | 'FAILURE' | 'ANOMALOUS';
  realizedEffects: Record<string, unknown>;
  sideEffects: string[];
  executionDurationMs: number;
  verifiedValueGenerated: number;
  efficiencyRatio: number; // verifiedValue / (cost + time)
}

export interface AdaptiveLearningDelta {
  learningId: string;
  synthesizedRuleName?: string;
  hyperparameterAdjustments: Record<string, number>;
  recompileTriggered: boolean;
  rewardSignal: number;
  nextIterationGoal: string;
}

export interface CanonicalStateNode {
  stateId: string;
  stateIndex: number;
  parentStateHash: string;
  intent: OceanicIntentSpec;
  observation: StateObservation;
  evidence: MachineEvidence[];
  verificationStatus: 'VERIFIED' | 'REJECTED' | 'DISSENT_CONTAINED';
  dissent: PreservedDissent[];
  authorization: HumanAuthorizationGate;
  action: ActionExecutionPlan;
  consequence?: MeasuredConsequence;
  learning?: AdaptiveLearningDelta;
  stateDeltaHash: string;
  attestationSignature: string;
  createdAt: string;
  settledAt?: string;
}

export interface KernelStats {
  totalTransitions: number;
  verifiedStates: number;
  humanGatedAuthorizations: number;
  preservedDissentCount: number;
  recompilationsTriggered: number;
  avgEfficiencyRatio: number;
  currentRootStateHash: string;
}

/* ─── Helper Functions ───────────────────────────────────────────── */

function hmac(key: string, data: string): string {
  return '0x' + createHmac('sha256', key).update(data).digest('hex');
}

/* ─── Kernel Engine ──────────────────────────────────────────────── */

export class OceanicosKernel {
  private readonly secret: string;
  private states: CanonicalStateNode[] = [];
  private currentHeadHash = '0x0000000000000000000000000000000000000000000000000000000000000000';
  private recompileCount = 0;

  constructor(secret = 'oceanicos-canonical-kernel-secret') {
    this.secret = secret;
  }

  /* ── 1. Compile & Dispatch Canonical State Transition ── */

  transition(opts: {
    intent: Omit<OceanicIntentSpec, 'intentId'>;
    observation: Omit<StateObservation, 'observationId'>;
    evidenceItems: Array<Omit<MachineEvidence, 'evidenceId' | 'proofWitness' | 'timestamp'>>;
    dissentItems?: Array<Omit<PreservedDissent, 'dissentId' | 'dissentEvidenceProof' | 'timestamp'>>;
    actionPlan: Omit<ActionExecutionPlan, 'actionId' | 'status'>;
    autoAuthorizeIfNonDestructive?: boolean;
  }): CanonicalStateNode {
    const stateIndex = this.states.length + 1;
    const stateId = `state-${stateIndex}-${randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    // 1. Formalize Intent
    const intent: OceanicIntentSpec = {
      ...opts.intent,
      intentId: `intent-${randomUUID().slice(0, 8)}`,
    };

    // 2. Formalize Observation
    const observation: StateObservation = {
      ...opts.observation,
      observationId: `obs-${randomUUID().slice(0, 8)}`,
    };

    // 3. Collect Machine-Readable Evidence
    const evidence: MachineEvidence[] = opts.evidenceItems.map((e, idx) => {
      const evidenceId = `evi-${idx}-${randomUUID().slice(0, 6)}`;
      const proofWitness = hmac(this.secret, `PROOF:${evidenceId}:${e.claim}:${e.status}:${now}`);
      return {
        ...e,
        evidenceId,
        proofWitness,
        timestamp: now,
      };
    });

    // 4. Preserve Multi-Model Dissent without Averaging
    const dissent: PreservedDissent[] = (opts.dissentItems ?? []).map((d, idx) => {
      const dissentId = `dissent-${idx}-${randomUUID().slice(0, 6)}`;
      const dissentEvidenceProof = hmac(this.secret, `DISSENT:${dissentId}:${d.agentOrModelDid}:${d.dissentingHypothesis}`);
      return {
        ...d,
        dissentId,
        dissentEvidenceProof,
        timestamp: now,
      };
    });

    // 5. Verification Gate
    const passedEvidence = evidence.filter((e) => e.status === 'PASSED').length;
    const verificationStatus =
      passedEvidence === evidence.length
        ? dissent.length > 0
          ? 'DISSENT_CONTAINED'
          : 'VERIFIED'
        : 'REJECTED';

    // 6. Human-in-the-Loop Authorization Gate
    const isSensitive = opts.actionPlan.isDestructive || opts.actionPlan.isFinancial || opts.actionPlan.reversibility === 'IRREVERSIBLE';
    const humanGate: HumanAuthorizationGate = {
      requiresHumanApproval: isSensitive,
      isAuthorized: !isSensitive && !!opts.autoAuthorizeIfNonDestructive,
      authorizedByDid: !isSensitive && opts.autoAuthorizeIfNonDestructive ? 'did:omega:system:auto-pass' : undefined,
      authorizedAt: !isSensitive && opts.autoAuthorizeIfNonDestructive ? now : undefined,
    };

    // 7. Action Execution Plan
    const action: ActionExecutionPlan = {
      ...opts.actionPlan,
      actionId: `act-${randomUUID().slice(0, 8)}`,
      status: humanGate.isAuthorized ? 'READY' : 'PENDING_AUTH',
    };

    // 8. Cryptographic State Hash
    const parentStateHash = this.currentHeadHash;
    const statePayload = `${stateId}:${parentStateHash}:${intent.intentId}:${observation.observationId}:${verificationStatus}:${dissent.length}:${action.actionId}`;
    const stateDeltaHash = hmac(this.secret, statePayload);
    const attestationSignature = hmac(this.secret, `ATTEST_STATE:${stateDeltaHash}:${now}`);

    const stateNode: CanonicalStateNode = {
      stateId,
      stateIndex,
      parentStateHash,
      intent,
      observation,
      evidence,
      verificationStatus,
      dissent,
      authorization: humanGate,
      action,
      stateDeltaHash,
      attestationSignature,
      createdAt: now,
    };

    this.states.push(stateNode);
    this.currentHeadHash = stateDeltaHash;
    return { ...stateNode };
  }

  /* ── 2. Human Authorization of Gated Actions ── */

  authorizeAction(opts: {
    stateId: string;
    authorizerDid: string;
    authorizationSignature: string;
  }): CanonicalStateNode {
    const node = this.states.find((s) => s.stateId === opts.stateId);
    if (!node) {
      throw new Error(`State node ${opts.stateId} not found`);
    }

    if (!opts.authorizerDid.startsWith('did:')) {
      throw new Error('Invalid authorizer DID format');
    }

    node.authorization.isAuthorized = true;
    node.authorization.authorizedByDid = opts.authorizerDid;
    node.authorization.authorizationSignature = opts.authorizationSignature;
    node.authorization.authorizedAt = new Date().toISOString();
    node.action.status = 'READY';

    return { ...node };
  }

  /* ── 3. Record Action Consequence & Trigger Recompilation ── */

  applyConsequence(opts: {
    stateId: string;
    observedStatus: 'SUCCESS' | 'FAILURE' | 'ANOMALOUS';
    realizedEffects: Record<string, unknown>;
    sideEffects?: string[];
    executionDurationMs: number;
    verifiedValueGenerated: number;
    resourceCost?: number;
  }): CanonicalStateNode {
    const node = this.states.find((s) => s.stateId === opts.stateId);
    if (!node) {
      throw new Error(`State node ${opts.stateId} not found`);
    }

    const cost = opts.resourceCost ?? 10;
    const denom = cost + Math.max(1, Math.round(opts.executionDurationMs / 100));
    const efficiencyRatio = Math.round((opts.verifiedValueGenerated / denom) * 100) / 100;

    const consequence: MeasuredConsequence = {
      consequenceId: `csq-${randomUUID().slice(0, 8)}`,
      actionId: node.action.actionId,
      observedStatus: opts.observedStatus,
      realizedEffects: opts.realizedEffects,
      sideEffects: opts.sideEffects ?? [],
      executionDurationMs: opts.executionDurationMs,
      verifiedValueGenerated: opts.verifiedValueGenerated,
      efficiencyRatio,
    };

    node.consequence = consequence;
    node.action.status = opts.observedStatus === 'SUCCESS' ? 'EXECUTED' : 'FAILED';
    node.settledAt = new Date().toISOString();

    // 4. Adaptive Learning & Continuous Recompilation
    const shouldRecompile = opts.observedStatus === 'SUCCESS' || node.dissent.length > 0;
    if (shouldRecompile) {
      this.recompileCount++;
    }

    const learning: AdaptiveLearningDelta = {
      learningId: `learn-${randomUUID().slice(0, 8)}`,
      synthesizedRuleName: `auto-rule-${node.intent.claim.toLowerCase().replace(/\s+/g, '-').slice(0, 20)}`,
      hyperparameterAdjustments: {
        riskPenalty: node.dissent.length > 0 ? 0.05 : -0.01,
        confidenceThreshold: opts.observedStatus === 'SUCCESS' ? 0.95 : 0.99,
      },
      recompileTriggered: shouldRecompile,
      rewardSignal: opts.observedStatus === 'SUCCESS' ? 1.0 : -1.0,
      nextIterationGoal: `Optimize verified value/cost frontier for ${node.intent.claim}`,
    };

    node.learning = learning;
    return { ...node };
  }

  /* ── 4. Queries & Lineage ── */

  getStates(): CanonicalStateNode[] {
    return [...this.states];
  }

  getStateById(stateId: string): CanonicalStateNode | undefined {
    return this.states.find((s) => s.stateId === stateId);
  }

  getStateLineage(stateId: string): CanonicalStateNode[] {
    const lineage: CanonicalStateNode[] = [];
    let current = this.states.find((s) => s.stateId === stateId);
    while (current) {
      lineage.unshift(current);
      if (current.parentStateHash === '0x0000000000000000000000000000000000000000000000000000000000000000') {
        break;
      }
      current = this.states.find((s) => s.stateDeltaHash === current?.parentStateHash);
    }
    return lineage;
  }

  /* ── 5. Stats ── */

  getStats(): KernelStats {
    const verified = this.states.filter((s) => s.verificationStatus === 'VERIFIED' || s.verificationStatus === 'DISSENT_CONTAINED').length;
    const humanGated = this.states.filter((s) => s.authorization.requiresHumanApproval).length;
    const totalDissent = this.states.reduce((acc, s) => acc + s.dissent.length, 0);
    const consequences = this.states.filter((s) => s.consequence !== undefined);
    const avgEff = consequences.length > 0
      ? consequences.reduce((acc, s) => acc + (s.consequence?.efficiencyRatio || 0), 0) / consequences.length
      : 0;

    return {
      totalTransitions: this.states.length,
      verifiedStates: verified,
      humanGatedAuthorizations: humanGated,
      preservedDissentCount: totalDissent,
      recompilationsTriggered: this.recompileCount,
      avgEfficiencyRatio: Math.round(avgEff * 100) / 100,
      currentRootStateHash: this.currentHeadHash,
    };
  }
}
