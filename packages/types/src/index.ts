export * from './omega-ir.js';
export * from './worker-registry.js';
export * from './executor.js';
export * from './omega-command.js';
export * from './scene.js';
import type { ExecutionReceipt } from './executor.js';
import type { OmegaCommandStatus } from './omega-command.js';

export type ChangeDecision = 'ALLOW' | 'DENY' | 'REVIEW';

/**
 * Independent lifecycle evidence state. `UNKNOWN` is intentional: absence of
 * an observation must never be upgraded to a positive claim.
 */
export type OmegaLifecycleStatus = 'YES' | 'NO' | 'UNKNOWN';

/**
 * Status vector for a consequential change. These fields are deliberately
 * separate so local implementation or execution cannot imply deployment or
 * health.
 */
export interface OmegaStatusVector {
  readonly declared: OmegaLifecycleStatus;
  readonly represented: OmegaLifecycleStatus;
  readonly implemented: OmegaLifecycleStatus;
  readonly tested: OmegaLifecycleStatus;
  readonly admitted: OmegaLifecycleStatus;
  readonly executed: OmegaLifecycleStatus;
  readonly observed: OmegaLifecycleStatus;
  readonly verified: OmegaLifecycleStatus;
  readonly attested: OmegaLifecycleStatus;
  readonly deployed: OmegaLifecycleStatus;
  readonly healthy: OmegaLifecycleStatus;
}

export interface OmegaChangeRecord {
  readonly id: string;
  readonly subject: string;
  readonly intent: string;
  readonly stateBefore: string;
  readonly evidence: readonly string[];
  readonly authority: string | null;
  readonly policy: string | null;
  readonly context?: Record<string, unknown>;
  readonly decision: ChangeDecision;
  readonly authorized: boolean;
  readonly transition?: string;
  readonly stateAfter?: string;
  readonly consequence?: string;
  readonly attestationId?: string;
  readonly provenance: {
    readonly source: string;
    readonly observedAt: string;
    readonly attributedTo: string | null;
    readonly lineage?: readonly string[];
  };
  readonly epistemic?: OmegaEpistemicPredicates;
  readonly dissentNotes?: readonly string[];
  readonly timestamp?: string;
  readonly createdAt?: string;
}

export interface IPCState {
  cpu: number;
  ram: number;
  io: string;
  ts: string;
}

export interface INewsArticle {
  source: string;
  headline: string;
  timestamp: string;
  impactMetric: number;
}

export interface IHiggsfieldJob {
  jobId: string;
  modelType: string;
  status: 'pending' | 'completed' | 'failed';
  resultUrl?: string;
}

export interface IRegionalFaceStream {
  nodeId: string;
  regionCode: string;
  telemetryMetric: number;
  storyPayload: string;
  timestamp: string;
}

export interface IUnifiedConsensus {
  consensusId: string;
  activeFacesCount: number;
  agreementRatio: number;
  convergedHash: string;
  verdict: 'PASS' | 'FAIL' | 'DIVERGENT';
}

export interface IObservation {
  uuid: string;
  timestamp: string;
  siliconYield: number;
  gridLoadMegawatts: number;
  acceleratorInventory: number;
  hardwareState: IPCState;
  globalNewsFeed: INewsArticle[];
  higgsfieldTelemetry?: IHiggsfieldJob;
  androidAutomationState?: {
    deviceSerial: string;
    currentApp: string;
    screenshotHash: string;
  };
  decentralizedStreams?: IRegionalFaceStream[];
  unifiedConsensus?: IUnifiedConsensus;
}

export interface IEvidence {
  status: 'PASS' | 'FAIL' | 'DIVERGENT';
  lawRoute: string;
  timestamp: string;
  observationUuid: string;
  signatureProof: string;
  mcpDiagnostics: {
    logcatAnomalyCount: number;
    stepDurationMs: number;
    profileExecuted: 'flash' | 'pro';
  };
}

export interface IMiniBlock {
  index: number;
  timestamp: string;
  observation: IObservation;
  evidence: IEvidence;
  previousHash: string;
  hash: string;
  nonce: number;
}

export interface ILiquidState {
  velocity: number;
  clarityVector: number;
  resonanceHz: number;
  blockAnchor: string;
}

export interface CopilotOperatingMode {
  readonly copilot: boolean;
  readonly antigravity: boolean;
  readonly continuum: 'FINITE_VERIFIED_STEPS';
  readonly fullStack: boolean;
  readonly realityFirst: boolean;
  readonly evidenceBound: boolean;
  readonly humanRouting: boolean;
  readonly pluralism: boolean;
  readonly dissent: 'PRESERVE';
  readonly noSpeculation: boolean;
  readonly noFabricatedState: boolean;
  readonly noStall: boolean;
  readonly preserveLineage: boolean;
}

export interface CopilotPropulsionState {
  readonly mode: CopilotOperatingMode;
  readonly authority: 'EVIDENCE_BOUND_PROPOSAL_ONLY';
  readonly liquidState: ILiquidState;
  readonly pidginSpirit: string;
  readonly axiom: string;
  readonly verifiedTransitions: number;
  readonly activeGoal: string;
  readonly invariant: string;
}

export interface VerificationResultSummary {
  readonly passed: boolean;
  readonly confidence: number;
  readonly claimedConfidence?: number;
  readonly rulesApplied?: number;
  readonly rulesPassed?: number;
  readonly rulesFailed?: number;
}

export interface VerificationResult {
  readonly id: string;
  readonly observationId: string;
  readonly timestamp?: string;
  readonly summary: VerificationResultSummary;
  readonly rules?: Array<{
    name: string;
    passed: boolean;
    confidence?: number;
    evidence?: unknown[];
    reason?: string;
  }>;
  readonly evidencePath?: EvidenceStep[] | string;
  readonly ruleVersions?: Record<string, string>;
  readonly status?: 'pending' | 'completed' | 'failed';
  readonly dissent?: DissentRecord;
}

export interface Attestation {
  id: string;
  verificationId: string;
  observationId: string;
  verified: boolean;
  confidence: number;
  signature: string;
  signingKey: string;
  keyVersion: string;
  signingAlgorithm: string;
  attestedAt: string;
  attestedBy: string;
  ruleVersions?: Record<string, string>;
  verifyingPublicKey?: string;
  status: 'signed' | 'revoked' | 'expired';
}

export type GlobalComputeTelemetry = IObservation;

export interface Observation {
  id: string;
  claim: {
    statement: string;
    category: string;
  };
  source: {
    system: string;
    version: string;
    environment: string;
  };
  timestamp: string;
  observedBy: string;
  metadata: Record<string, unknown>;
  confidence: number;
  confidenceReason: string;
  parentId?: string;
  lineage?: string[];
  status: 'normalized' | 'verified' | 'failed';
}

export interface VerificationRule {
  name: string;
  version: string;
  appliesTo: string[];
  definition: string;
  bytecode?: string;
  description: string;
  createdAt: string;
  active: boolean;
}

export interface EvidenceStep {
  step: number;
  rule: string;
  condition: string;
  value: unknown;
  expected?: unknown;
  passed: boolean;
  reasoning: string;
  severity?: 'info' | 'warning' | 'critical';
  evaluated?: boolean;
}

export interface MemoryRecord {
  id: string;
  observationId: string;
  verificationId: string;
  verified: boolean;
  confidence: number;
  hash?: string;
  summary?: string;
  recordedAt?: string;
  rememberedAt?: string;
}

export interface EventLogEntry {
  id: number;
  type: 'OBSERVATION' | 'VERIFICATION' | 'ATTESTATION' | 'MEMORY';
  data: IObservation | Observation | VerificationResult | Attestation | MemoryRecord;
  recordedAt: string;
  hash: string;
  previousHash: string;
}

export interface MiniCycleResult {
  observation: Observation;
  verification: VerificationResult;
  memory: MemoryRecord;
  entries?: EventLogEntry[];
  kaiRecord?: KaiProvenanceRecord;
  passed: boolean;
  confidence: number;
  completedAt: string;
}

export interface OmegaTotalManifest {
  stateRoot: 'Ø';
  stewardshipAxiom: 'TOOLS_FOR_EVOLUTION_NOT_WAR';
  cycleResult: MiniCycleResult;
  memoryIntegrityValid: boolean;
  memorySize: number;
  lockedAt: string;
  pluralisticRealityFace?: IPluralisticRealityFace;
}

export type MoodState =
  | 'OPTIMAL_FLOW'
  | 'HIGH_INTEGRITY'
  | 'EVIDENCE_SEARCH'
  | 'FRICTION_DETECTED'
  | 'RECOMPILING';

export interface SystemMood {
  state: MoodState;
  confidence: number;
  uncertainty: number;
  verificationHealth: number;
  evidenceQuality: number;
  errorRate: number;
  dissentCount: number;
  description: string;
  evaluatedAt: string;
}

// ---------------------------------------------------------------------------
// 🔥 Autopilot Mood — Constitution §§ MOOD 1-23
// MOOD ≠ TRUTH | MOOD ≠ AUTHORITY | MOOD ≠ CONSENT | MOOD ≠ PROOF
// ---------------------------------------------------------------------------

export type MoodSignalStatus =
  | 'OBSERVED'
  | 'USER_STATED'
  | 'DOCUMENTED'
  | 'INFERRED'
  | 'SIMULATED'
  | 'UNKNOWN';

export type AutopilotLevel =
  | 0  // PASSIVE — observe only
  | 1  // REFLECTIVE — detect explicit signals, adapt wording
  | 2  // CONTEXTUAL — combine language, history, task state
  | 3  // PROACTIVE — suggest next actions, rest, clarification
  | 4  // BOUNDED ACTION — pre-authorized, low-risk, reversible
  | 5; // CONSEQUENTIAL — requires explicit Ω∞v admission

export type MoodContextState =
  | 'CALM'
  | 'FOCUSED'
  | 'EXPLORATORY'
  | 'CREATIVE'
  | 'URGENT'
  | 'UNCERTAIN'
  | 'FRUSTRATED'
  | 'OVERLOADED'
  | 'REFLECTIVE'
  | 'SOCIAL'
  | 'TASK_MODE'
  | 'UNKNOWN';

export interface MoodSignal {
  readonly id: string;
  readonly signal: string;
  readonly status: MoodSignalStatus;
  readonly source: string;
  readonly confidence: number;
  readonly uncertainty: number;
  readonly timestamp: string;
  readonly provenance: string;
  readonly userCorrection?: string;
}

export interface AutopilotMoodState {
  readonly context: MoodContextState;
  readonly signals: readonly MoodSignal[];
  readonly language: string;
  readonly relationship: string;
  readonly values: readonly string[];
  readonly intent: string;
  readonly uncertainty: number;
  readonly provenance: string;
  readonly timestamp: string;
  readonly status: MoodSignalStatus;
}

export interface MoodAdaptation {
  readonly adaptationId: string;
  readonly tone: string;
  readonly pacing: string;
  readonly density: 'minimal' | 'concise' | 'standard' | 'detailed' | 'comprehensive';
  readonly suggestBreak: boolean;
  readonly suggestClarification: boolean;
  readonly suggestSaferAlternative: boolean;
  readonly rationale: string;
  readonly autopilotLevel: AutopilotLevel;
  readonly timestamp: string;
}

export interface MoodMemoryRecord {
  readonly id: string;
  readonly signal: string;
  readonly status: MoodSignalStatus;
  readonly source: string;
  readonly confidence: number;
  readonly uncertainty: number;
  readonly timestamp: string;
  readonly provenance: string;
  readonly userCorrection?: string;
  readonly supersededBy?: string;
}

export interface AutopilotSafetyGateResult {
  readonly signalExplicit: boolean;
  readonly signalRelevant: boolean;
  readonly interpretationUncertain: boolean;
  readonly actionConsequential: boolean;
  readonly authorityPresent: boolean;
  readonly policyChecked: boolean;
  readonly admissionResult: 'ALLOW' | 'DENY' | 'REVIEW';
  readonly rationale: string;
}

export interface AutopilotEngineState {
  readonly level: AutopilotLevel;
  readonly mood: AutopilotMoodState;
  readonly adaptation: MoodAdaptation | null;
  readonly safetyGate: AutopilotSafetyGateResult | null;
  readonly memoryRecords: readonly MoodMemoryRecord[];
  readonly agentSignals: readonly MoodSignal[];
  readonly evaluatedAt: string;
}

export type FrictionCategory =
  | 'ERROR'
  | 'LATENCY'
  | 'CONTRADICTION'
  | 'MISSING_EVIDENCE'
  | 'PERMISSION_FAILURE'
  | 'TEST_FAILURE'
  | 'SECURITY_ISSUE'
  | 'MODEL_DISAGREEMENT'
  | 'HUMAN_DISAGREEMENT';

export interface FrictionEvent {
  id: string;
  category: FrictionCategory;
  source: string;
  description: string;
  evidence: string[];
  severity: 'info' | 'warning' | 'critical';
  status: 'OPEN' | 'DIAGNOSED' | 'RESOLVED' | 'LEARNING';
  correlationId?: string;
  diagnosis?: string;
  resolution?: string;
  recordedAt: string;
}

export interface DissentRecord {
  id: string;
  claimId: string;
  interpretations: DissentInterpretation[];
  status: 'OPEN' | 'RESOLVED' | 'ACCEPTED';
  recordedAt: string;
}

export interface DissentInterpretation {
  position: string;
  source: string;
  evidence: string[];
  confidence: number;
}

export type GeopoliticalRegion = 'US' | 'CN' | 'EU' | 'ME';

export interface RegionalAssertion {
  region: GeopoliticalRegion;
  complianceRule: string;
  hasLocalClearance: boolean;
}

export interface AdvancedVerificationReceipt {
  status: 'PASS' | 'FAIL' | 'DIVERGENT';
  lawRoute: string;
  assertions: RegionalAssertion[];
  evidencePath: string;
}

// ---------------------------------------------------------------------------
// Ω‑ƆREADƆS OS v∞ — Unified Command & Reality-First Contracts
// ---------------------------------------------------------------------------

export type OmegaWorkerRole =
  | 'observer'
  | 'researcher'
  | 'planner'
  | 'tester'
  | 'security-reviewer'
  | 'governance-reviewer'
  | 'github-inspector';

export type OmegaWorkerClassification = 'read-only' | 'local-mutating' | 'externally-consequential';

export interface OmegaWorkerDefinition {
  id: string;
  version: string;
  role: OmegaWorkerRole;
  classification: OmegaWorkerClassification;
  description: string;
  capabilities: string[];
  requiresApproval: boolean;
  timeoutMs: number;
  maxOutputBytes: number;
  maxRetries: number;
}

export interface OmegaCommandPlanIR {
  irVersion: '1.0';
  intent: string;
  requestedWorkers: string[];
  evidenceRefs: string[];
  policyRefs: string[];
  workerPlan: Array<{
    step: number;
    workerId: string;
    action: string;
    readOnly: boolean;
  }>;
  transitionSpec: {
    target: string;
    action: string;
    rollbackSupported: boolean;
  };
  observationSpec: {
    observerType: 'git_working_tree' | 'build_test' | 'api_health' | 'state_snapshot' | 'coordination_probe';
    target: string;
  };
}

export interface OmegaCommandApproval {
  approvedBy: string;
  approvedAt: string;
  rationale?: string;
  authProof?: string;
}

export interface OmegaCommandPlan {
  commandId: string;
  sessionId: string;
  requestedBy: string;
  timestamp: string;
  prompt: string;
  boundedContext: Record<string, unknown>;
  requestedWorkers: string[];
  irPlan: OmegaCommandPlanIR;
  idempotencyKey: string;
  dryRun: boolean;
  redacted: boolean;
  redactedFields: string[];
  status: OmegaCommandStatus;
  statusReason?: string;
  approval?: OmegaCommandApproval;
}

export type PersistenceCoordinationMode =
  | 'local-single-process'
  | 'operator-coordinated'
  | 'external-coordinator'
  | 'invalid';

export interface PersistenceCoordinationPolicy {
  mode: PersistenceCoordinationMode;
  reference: string | null;
  reason: string | null;
  evidence: 'runtime-observed';
  scope: 'single-process';
  limitations: readonly string[];
  verified: false;
}

export interface OmegaObservation {
  observerId: string;
  observerType: 'git_working_tree' | 'build_test' | 'api_health' | 'state_snapshot' | 'coordination_probe';
  target: string;
  timestamp: string;
  observedData: Record<string, unknown>;
  stateHash: string;
}

export interface OmegaRealityVerdict {
  verdict: 'VERIFIED' | 'DIVERGENT' | 'UNKNOWN' | 'NOT_EXECUTED';
  claimedStateHash?: string;
  observedStateHash?: string;
  discrepancies: string[];
  evaluatedAt: string;
  receiptVerified?: boolean;
  stateDiffSummary?: string;
  reconciliationDetails?: Record<string, unknown>;
}


export interface OmegaDiscrepancyGroup {
  readonly kind: string;
  readonly count: number;
  readonly samples: readonly string[];
}

export interface OmegaLearningFeedback {
  readonly totalEvaluated: number;
  readonly completedCount: number;
  readonly refusedCount: number;
  readonly verifiedCount: number;
  readonly divergentCount: number;
  readonly unknownCount: number;
  readonly reliabilityScore: number;
  readonly workerReliability: Record<string, number>;
  readonly recurrentDiscrepancies: readonly OmegaDiscrepancyGroup[];
  readonly recommendations: readonly string[];
  readonly analyzedAt: string;
}

export interface OmegaNextSliceProposal {
  readonly sourceCommandId?: string;
  readonly trigger: 'REALITY_VERIFIED' | 'REALITY_DIVERGENT' | 'TRANSITION_REFUSED' | 'OPERATOR_INITIATIVE';
  readonly actionType: 'ADVANCE' | 'REMEDIATE' | 'POLICY_ESCALATION' | 'HARDEN';
  readonly rationale: string;
  readonly proposedIntent: string;
  readonly suggestedWorkers: readonly OmegaWorkerRole[];
  readonly suggestedObservationType: 'git_working_tree' | 'build_test' | 'api_health' | 'state_snapshot';
  readonly suggestedObservationTarget: string;
  readonly urgency: 'routine' | 'elevated' | 'critical';
  readonly generatedAt: string;
}

export type OmegaEventType =
  | 'COMMAND_PROPOSED'
  | 'COMMAND_ADMITTED'
  | 'COMMAND_REVIEW_REQUIRED'
  | 'COMMAND_APPROVED'
  | 'COMMAND_DENIED'
  | 'COMMAND_EXECUTED'
  | 'REALITY_OBSERVED'
  | 'REALITY_VERIFIED'
  | 'LEARNING_SYNTHESIZED'
  | 'NEXT_SLICE_PROPOSED'
  | 'LOOP_RECOMPILED';

export interface OmegaLifecycleEvent {
  readonly eventId: string;
  readonly eventType: OmegaEventType;
  readonly commandId?: string;
  readonly status?: OmegaCommandStatus;
  readonly actor: string;
  readonly payload: Record<string, unknown>;
  readonly timestamp: string;
}

export interface OmegaEpistemicPredicates {
  readonly observed: boolean;
  readonly intended: boolean;
  readonly authorized: boolean;
  readonly executed: boolean;
  readonly attested: boolean;
  readonly verified: boolean;
  readonly healthy: boolean;
}

export interface OmegaTransition {
  readonly transitionId: string;
  readonly commandId?: string;
  readonly subject: string;
  readonly intent: string;
  readonly stateBefore: string | Record<string, unknown>;
  readonly evidenceRefs: readonly string[];
  readonly authority: string | null;
  readonly policyRefs: readonly string[];
  readonly decision: ChangeDecision;
  readonly actor: string;
  readonly worker?: string;
  readonly action?: string;
  readonly stateAfter?: string | Record<string, unknown>;
  readonly consequence?: string;
  readonly observation?: OmegaObservation;
  readonly attestationId?: string;
  readonly attestationDigest?: string;
  readonly realityVerdict?: OmegaRealityVerdict;
  readonly provenance: {
    readonly source: string;
    readonly observedAt: string;
    readonly attributedTo: string | null;
    readonly lineage?: readonly string[];
  };
  readonly epistemic?: OmegaEpistemicPredicates;
  readonly dissentNotes?: readonly string[];
  readonly timestamp?: string;
}

export type EpistemicFaceId = 'FORMAL' | 'PLURAL' | 'SYSTEM' | 'REALITY' | 'LIQUID_SOUL';

export interface IEpistemicFaceReport {
  readonly faceId: EpistemicFaceId;
  readonly name: string;
  readonly dimension: string;
  readonly score: number;
  readonly verified: boolean;
  readonly signatureProof: string;
  readonly telemetry: Record<string, unknown>;
  readonly dissensusNotes?: readonly string[];
}

export interface IPluralisticRealityFace {
  readonly faceMatrixId: string;
  readonly timestamp: string;
  readonly lawRoute: string;
  readonly overallHarmonicScore: number;
  readonly frictionDissolutionQuotient: number;
  readonly faces: readonly IEpistemicFaceReport[];
  readonly consensusVerdict: 'PASS' | 'DIVERGENT' | 'PLURAL_PRESERVED';
  readonly clusterAttestationDigest: string;
  readonly axiomProof: string;
}

export type SceneState =
  | 'darkness'
  | 'possibility'
  | 'ocean'
  | 'star'
  | 'water-form'
  | 'many-forms'
  | 'loneliness'
  | 'human-form'
  | 'misrecognition'
  | 'boundary'
  | 'question'
  | 'forest'
  | 'return';

export type SceneSimulationInput = {
  seed?: string;
  steps?: number;
  branches?: number;
};

export type SceneTrace = Array<{
  sequence: number;
  state: SceneState;
  from: SceneState | null;
  to: SceneState;
  transition: 'origin' | 'advance';
  status: 'observed' | 'verified';
  evidence: string;
}>;

export type SceneBranch = {
  id: string;
  index: number;
  perspective: string;
  states: SceneState[];
  terminalState: SceneState;
  trace: SceneTrace;
  divergenceEvidence: string;
};

export interface SceneSimulation {
  id: string;
  seed: string;
  equation: string;
  states: SceneState[];
  terminalState: SceneState;
  trace: SceneTrace;
  branches: SceneBranch[];
  branchCount: number;
  continuation: 'bounded-sample-of-infinite-potential';
  provenance: {
    source: 'local-simulation';
    ruleVersion: 'scene-equation.v2';
    deterministic: true;
    verified: false;
    note: string;
  };
  createdAt: string;
}

/**
 * Constitution Section 13: MEMORY / KAI
 * Hash-chain model: hashₙ = H(recordₙ + hashₙ₋₁)
 * Never silently convert INFERRED → OBSERVED.
 */
export type KaiMemoryDistinction =
  | 'OBSERVED'
  | 'USER-STATED'
  | 'DOCUMENTED'
  | 'INFERRED'
  | 'PROPOSED'
  | 'VERIFIED'
  | 'DIVERGENT'
  | 'UNKNOWN'
  | 'BLOCKED'
  | 'NOT-AUTHORIZED'
  | 'CORRECTED';

export interface KaiProvenanceRecord {
  id: string;
  index: number;
  timestamp: string;
  distinction: KaiMemoryDistinction;
  statement: string;
  subject: string;
  source: string;
  author: string;
  policyOrAuthority?: string;
  evidenceRef?: string;
  previousHash: string;
  hash: string;
  metadata?: Record<string, unknown>;
}

export interface KaiIntegrityReport {
  valid: boolean;
  count: number;
  genesisHash: string;
  tipHash: string;
  distinctions: Record<KaiMemoryDistinction, number>;
  evaluatedAt: string;
}
