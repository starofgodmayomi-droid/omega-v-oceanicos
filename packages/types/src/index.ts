export * from './omega-ir.js';
export * from './worker-registry.js';

export type ChangeDecision = 'ALLOW' | 'DENY' | 'REVIEW';

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

export type OmegaCommandStatus =
  | 'PROPOSED'
  | 'REVIEW'
  | 'DENIED'
  | 'AUTHORIZED'
  | 'EXECUTED'
  | 'ATTESTED'
  | 'VERIFIED'
  | 'DIVERGENT'
  | 'UNKNOWN'
  | 'FAILED';

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

export interface OmegaCommandIR {
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
    observerType: 'git_working_tree' | 'build_test' | 'api_health' | 'state_snapshot';
    target: string;
  };
}

export interface OmegaCommandApproval {
  approvedBy: string;
  approvedAt: string;
  rationale?: string;
  authProof?: string;
}

export interface OmegaCommand {
  commandId: string;
  sessionId: string;
  requestedBy: string;
  timestamp: string;
  prompt: string;
  boundedContext: Record<string, unknown>;
  requestedWorkers: string[];
  irPlan: OmegaCommandIR;
  idempotencyKey: string;
  dryRun: boolean;
  redacted: boolean;
  redactedFields: string[];
  status: OmegaCommandStatus;
  statusReason?: string;
  approval?: OmegaCommandApproval;
}

export interface OmegaObservation {
  observerId: string;
  observerType: 'git_working_tree' | 'build_test' | 'api_health' | 'state_snapshot';
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
}

export interface OmegaCommandResult {
  commandId: string;
  status: OmegaCommandStatus;
  statusReason?: string;
  stateBefore?: Record<string, unknown>;
  stateAfter?: Record<string, unknown>;
  consequence?: string;
  outputSummary?: string;
  attestationId?: string;
  attestationDigest?: string;
  provenance?: {
    lineage: string[];
    executedBy: string;
    timestamp: string;
  };
  observation?: OmegaObservation;
  realityVerdict?: OmegaRealityVerdict;
  dissentNotes?: string[];
  completedAt?: string;
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
  readonly reliabilityScore: number; // 0.0 to 1.0
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
