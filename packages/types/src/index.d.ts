/**
 * Shared type definitions for Ω∞v Oceanicos
 * This package defines the core data structures that flow through the verification loop
 */
/**
 * An observation is a claim about the state of the system
 * It includes metadata that makes it verifiable and traceable
 */
export interface Observation {
  /** Unique identifier for this observation */
  id: string;
  /** The claim being made */
  claim: {
    statement: string;
    category: string;
  };
  /** Information about where this observation came from */
  source: {
    system: string;
    version: string;
    environment: string;
  };
  /** When was this observed? */
  timestamp: string;
  observedBy: string;
  /** Additional data supporting the observation */
  metadata: Record<string, unknown>;
  /** How confident are we in this observation? (0-1) */
  confidence: number;
  confidenceReason: string;
  /** Optional immediate predecessor in the evidence lineage */
  parentId?: string;
  /** Optional bounded lineage of predecessor observation identifiers */
  lineage?: string[];
  /** Status of the observation */
  status: 'normalized' | 'verified' | 'failed';
}
/**
 * A verification rule defines how to test an observation
 */
export interface VerificationRule {
  /** Unique name of this rule */
  name: string;
  /** Version for tracking rule evolution */
  version: string;
  /** Which observation categories does this apply to? */
  appliesTo: string[];
  /** The rule definition (high-level) */
  definition: string;
  /** Compiled bytecode (if applicable) */
  bytecode?: string;
  /** Human-readable description */
  description: string;
  /** When was this rule created? */
  createdAt: string;
  /** Is this rule currently active? */
  active: boolean;
}
/**
 * A single step in the evidence path showing how verification was done
 */
export interface EvidenceStep {
  /** Step number in the verification sequence */
  step: number;
  /** Which rule produced this step? */
  rule: string;
  /** The condition being tested */
  condition: string;
  /** What was the actual value? */
  value: unknown;
  /** What was expected? */
  expected?: unknown;
  /** Did this step pass? */
  passed: boolean;
  /**
   * Did the engine actually run this rule?
   *
   * `passed: false` covers two facts that are not the same: the rule ran
   * and the claim did not hold, and the rule could not be run at all. Both
   * must deny an action — an unevaluated rule is never a passing rule —
   * but a reader acts differently on each. One says the system checked and
   * found something wrong; the other says the system did not check.
   *
   * Optional so evidence recorded before this field existed stays readable.
   * Absent means unknown, and unknown must not be rendered as evaluated:
   * treating a missing signal as the favourable one is the defect this
   * whole field exists to expose.
   */
  evaluated?: boolean;
  /** Human-readable explanation */
  reasoning: string;
  /** How severe is a failure? (if failed) */
  severity?: 'info' | 'warning' | 'critical';
}
/**
 * A verification result shows whether an observation is true
 * It includes the evidence path that proves or disproves the claim
 */
export interface VerificationResult {
  /** Unique identifier for this verification */
  id: string;
  /** Which observation did we verify? */
  observationId: string;
  /** When was this verification performed? */
  timestamp: string;
  /** Summary of the result */
  summary: {
    passed: boolean;
    /**
     * Confidence produced by the rules that ran — the lowest of them.
     *
     * This is the verifier's number, not the claimant's. It is derived from
     * rule outcomes and is `0` when no rule ran, because nothing was checked.
     *
     * A verification is only as strong as its weakest applied rule, so the
     * minimum is used rather than a mean: averaging lets a confident rule
     * carry a doubtful one, which is the direction that produces overstated
     * trust.
     */
    confidence: number;
    /**
     * Confidence the observation asserted about itself, carried through
     * unchanged.
     *
     * Kept separate from `confidence` and never signed as a verification
     * result. It is an input to be weighed, not evidence — a submitter can
     * put any number here, and for a while this value *was* `confidence`,
     * which meant an attestation cryptographically signed a figure no rule
     * had produced.
     */
    claimedConfidence: number;
    rulesApplied: number;
    rulesPassed: number;
    rulesFailed: number;
  };
  /** Results from each rule */
  rules: Array<{
    name: string;
    passed: boolean;
    confidence: number;
    details?: string;
  }>;
  /** Complete evidence showing the reasoning */
  evidencePath: EvidenceStep[];
  /** Which rule versions were used? */
  ruleVersions: Record<string, string>;
  /** Status of this verification */
  status: 'pending' | 'completed' | 'failed';
  /** Preserved dissent record if rules or verifiers disagree */
  dissent?: DissentRecord;
}
/**
 * An attestation is a cryptographically signed verification result
 * It creates unforgeable proof that a verification happened at a specific time
 */
export interface Attestation {
  /** Unique identifier for this attestation */
  id: string;
  /** Which verification result is being attested? */
  verificationId: string;
  /** Which observation is being attested? */
  observationId: string;
  /** Was the verification successful? */
  verified: boolean;
  /** Confidence in the verification */
  confidence: number;
  /** The cryptographic signature */
  signature: string;
  /** Which key signed this? */
  signingKey: string;
  /** Version of the signing key */
  keyVersion: string;
  /** Algorithm used for signing */
  signingAlgorithm: string;
  /** When was this signed? */
  attestedAt: string;
  /** Which service performed the attestation? */
  attestedBy: string;
  /** Rule versions used at time of attestation */
  ruleVersions: Record<string, string>;
  /** Public key for verification */
  verifyingPublicKey?: string;
  /** Status of the attestation */
  status: 'signed' | 'revoked' | 'expired';
}
/**
 * A recorded event in the immutable event log
 * The system maintains an append-only log of all observations, verifications, and attestations
 *
 * In the MINI kernel (Observe → Verify → Remember), memory entries are
 * OBSERVATION and VERIFICATION only. ATTESTATION is an earned expansion.
 */
export interface EventLogEntry {
  /** Sequential ID in the event log */
  id: number;
  /** Type of event */
  type: 'OBSERVATION' | 'VERIFICATION' | 'ATTESTATION' | 'MEMORY';
  /** The actual data */
  data: Observation | VerificationResult | Attestation | MemoryRecord;
  /** When was this recorded? */
  recordedAt: string;
  /** Immutable hash for integrity checking */
  hash: string;
  /** Hash of the previous entry (creating a chain) */
  previousHash: string;
}
/**
 * A memory record is what the MINI kernel 🧠 stores after observe + verify.
 * It is the smallest durable unit of verified experience.
 */
export interface MemoryRecord {
  /** Unique identifier for this memory */
  id: string;
  /** Linked observation id */
  observationId: string;
  /** Linked verification id */
  verificationId: string;
  /** Did verification pass? */
  verified: boolean;
  /** Confidence carried from verification */
  confidence: number;
  /** Optional human-readable summary */
  summary?: string;
  /** When this memory was formed */
  rememberedAt: string;
}
/**
 * Result of one MINI kernel cycle: Observe → Verify → Remember
 */
export interface MiniCycleResult {
  /** Normalized observation */
  observation: Observation;
  /** Verification evidence */
  verification: VerificationResult;
  /** Durable memory of the cycle */
  memory: MemoryRecord;
  /** Append-only log entries written during this cycle */
  entries?: EventLogEntry[];
  /** Did the full cycle pass? */
  passed: boolean;
  /** Cycle confidence */
  confidence: number;
  /** Timestamp of cycle completion */
  completedAt: string;
}
/**
 * OmegaTotalManifest: Output of OmegaTotal compression
 * Proves that a MINI cycle achieved verified totality
 */
export interface OmegaTotalManifest {
  /** State root (always 'Ø' — the empty axiom) */
  stateRoot: 'Ø';
  /** The stewardship axiom */
  stewardshipAxiom: 'TOOLS_FOR_EVOLUTION_NOT_WAR';
  /** The MINI cycle that was compressed */
  cycleResult: MiniCycleResult;
  /** Memory integrity at time of compression */
  memoryIntegrityValid: boolean;
  /** Total entries in memory at time of compression */
  memorySize: number;
  /** When was totality locked? */
  lockedAt: string;
}
/**
 * A query result from the event store
 * Allows temporal and categorical searches through the verification history
 */
export interface QueryResult {
  /** Events matching the query */
  events: EventLogEntry[];
  /** Total count of matching events */
  totalCount: number;
  /** Pagination information */
  pagination: {
    offset: number;
    limit: number;
    hasMore: boolean;
  };
  /** When was this query executed? */
  queriedAt: string;
}
/**
 * Configuration for the verification engine
 */
export interface VerificationConfig {
  /** Rules to apply */
  rules: VerificationRule[];
  /** Observation categories to process */
  categories: string[];
  /** Enable caching of verification results */
  enableCache: boolean;
  /** Cache TTL in milliseconds */
  cacheTtl: number;
  /** Maximum number of parallel verifications */
  maxConcurrency: number;
  /** Enable learning from verification results */
  enableLearning: boolean;
}
/**
 * Options for attestation
 */
export interface AttestationOptions {
  /** The verification result to attest */
  verificationResult: VerificationResult;
  /** Signing key to use */
  signingKey?: string;
  /** Identity of the attestor */
  attestedBy: string;
  /** Algorithm for signing */
  algorithm?: string;
}
/**
 * Learning insight extracted from verification history
 */
export interface LearningInsight {
  /** What was learned? */
  description: string;
  /** Confidence in this learning (0-1) */
  confidence: number;
  /** Which rule does this apply to? */
  affectedRule?: string;
  /** Recommended action */
  recommendation?: string;
  /** When was this learned? */
  learnedAt: string;
}
/**
 * System health and metrics
 */
export interface SystemMetrics {
  /** Total observations processed */
  totalObservations: number;
  /** Total verifications performed */
  totalVerifications: number;
  /** Average verification time (ms) */
  avgVerificationTime: number;
  /** Verification success rate (0-1) */
  successRate: number;
  /** Total attestations created */
  totalAttestations: number;
  /** Current system confidence */
  systemConfidence: number;
  /** When were these metrics last updated? */
  lastUpdated: string;
}
/**
 * Error response structure
 */
export interface ErrorResponse {
  /** Error code for categorization */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Additional context */
  details?: Record<string, unknown>;
  /** When did the error occur? */
  timestamp: string;
  /** Request ID for tracing */
  requestId?: string;
}
/**
 * Success response structure
 */
export interface SuccessResponse<T> {
  /** The returned data */
  data: T;
  /** Additional metadata */
  meta?: Record<string, unknown>;
  /** When was this created? */
  timestamp: string;
}
/**
 * SystemMood: Measurable system state (Pillar 19)
 */
export type MoodState =
  'OPTIMAL_FLOW' | 'HIGH_INTEGRITY' | 'EVIDENCE_SEARCH' | 'FRICTION_DETECTED' | 'RECOMPILING';
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
/**
 * VerificationStatus: Granular verification outcomes (Pillar 10)
 * Never collapse these into a single boolean.
 */
export type VerificationStatus =
  'VERIFIED' | 'PARTIALLY_VERIFIED' | 'UNVERIFIED' | 'CONTRADICTED' | 'UNKNOWN' | 'DISSENT';
/**
 * FrictionEvent: Observable system friction (Pillar 20)
 * Friction is information, not failure.
 */
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
/**
 * DissentRecord: Explicit disagreement representation (Pillar 21)
 * Do not manufacture consensus. Do not suppress minority results.
 */
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
/**
 * Provenance Graph Types (Section XIV)
 * Bidirectional cause-and-effect lineage graph.
 */
export interface ProvenanceGraphNode {
  id: string;
  type:
    | 'OBSERVATION'
    | 'VERIFICATION'
    | 'ATTESTATION'
    | 'MEMORY'
    | 'ACTION'
    | 'OUTCOME'
    | 'LEARNING'
    | 'FRICTION'
    | 'DISSENT';
  label: string;
  hash: string;
  recordedAt: string;
  metadata: Record<string, unknown>;
}
export interface ProvenanceGraphEdge {
  id: string;
  sourceId: string;
  targetId: string;
  relation:
    'PRODUCED' | 'VERIFIED_BY' | 'ATTESTED_BY' | 'RESULTED_IN' | 'SUPERSEDES' | 'CONTRADICTS';
  timestamp: string;
}
export interface GraphTraversalResult {
  rootId: string;
  direction: 'FORWARD' | 'BACKWARD' | 'BIDIRECTIONAL';
  nodes: ProvenanceGraphNode[];
  edges: ProvenanceGraphEdge[];
  depth: number;
}
/**
 * Security & Authorization Types (Sections XVIII & XIX)
 * Least privilege, capability scoping, identity verification.
 */
export type SecurityPermission =
  | 'CAN_OBSERVE'
  | 'CAN_VERIFY'
  | 'CAN_ATTEST'
  | 'CAN_PROPOSE'
  | 'CAN_ACT'
  | 'CAN_AUDIT'
  | 'CAN_RECOMPILE';
export interface IdentitySubject {
  id: string;
  type: 'HUMAN' | 'AGENT' | 'SYSTEM';
  name: string;
  permissions: SecurityPermission[];
  issuedAt: string;
}
export interface SecurityToken {
  subjectId: string;
  permissions: SecurityPermission[];
  signature: string;
  expiresAt: string;
}
export interface AuthorizationResult {
  allowed: boolean;
  subjectId: string;
  requiredPermission: SecurityPermission;
  reason: string;
  timestamp: string;
}
/**
 * Evolution & Recompilation Types (Section XXVII)
 * Controlled rule updates driven by drift detection and evidence.
 */
export interface DriftAnalysis {
  ruleName: string;
  totalExecutions: number;
  failureRate: number;
  driftDetected: boolean;
  recommendedAction: 'MAINTAIN' | 'ADJUST_THRESHOLD' | 'RECOMPILE_DSL';
}
export interface EvolutionProposal {
  id: string;
  targetRule: string;
  previousDefinition: string;
  candidateDefinition: string;
  rationale: string;
  simulatedSuccessRate: number;
  status: 'PROPOSED' | 'TESTED' | 'PROMOTED' | 'REJECTED';
  proposedAt: string;
}
/**
 * Learning Engine Types (Section XXVI)
 * Learning must be grounded in observed outcomes compared to predictions.
 */
export interface Prediction {
  id: string;
  expectedOutcome: string;
  confidence: number;
  basedOnRule: string;
  madeAt: string;
}
export interface LearningEvent {
  id: string;
  predictionId: string;
  prediction: Prediction;
  actualOutcome: string;
  error: number;
  insight: LearningInsight;
  recordedAt: string;
}
/**
 * Governance Engine Types (Section XXIX)
 * Governance constrains power.
 */
export type GovernanceAction =
  'AGENT_AUTONOMY' | 'DATA_ACCESS' | 'MODEL_DEPLOYMENT' | 'EMERGENCY_ACTION' | 'ROLLBACK';
export interface GovernanceRule {
  id: string;
  action: GovernanceAction;
  requiresHumanApproval: boolean;
  minimumConfidenceThreshold: number;
  maximumRiskThreshold: number;
  active: boolean;
}
export interface GovernanceDecision {
  id: string;
  action: GovernanceAction;
  requestedBy: string;
  context: Record<string, unknown>;
  allowed: boolean;
  reason: string;
  requiresHumanApproval: boolean;
  decidedAt: string;
}
/**
 * Evidence Artifact Types (Section XXIV)
 */
export interface EvidenceArtifact {
  id: string;
  verificationId: string;
  commitHash?: string;
  environment: string;
  toolVersions: Record<string, string>;
  lineageHash: string;
  payload: Record<string, unknown>;
  createdAt: string;
}
/**
 * GREEN Rule Types (Section XXV)
 */
export interface GreenEvaluation {
  isGreen: boolean;
  allChecksPassed: boolean;
  evidenceExists: boolean;
  lineageExists: boolean;
  attestationExists: boolean;
  noCriticalFailures: boolean;
  reason: string;
  evaluatedAt: string;
}
/**
 * Human Intelligence Types (Section XXVIII)
 * Humans are participants in the loop.
 */
export type HumanActionType =
  | 'DREAM'
  | 'THOUGHT'
  | 'INTENTION'
  | 'VALUE_JUDGMENT'
  | 'ACTION'
  | 'FEEDBACK'
  | 'DISSENT'
  | 'APPROVAL';
export interface HumanInput {
  id: string;
  type: HumanActionType;
  humanId: string;
  contextId?: string;
  payload: Record<string, unknown>;
  rationale: string;
  recordedAt: string;
}
/**
 * A bounded local job ledger record. This is operational evidence, not a
 * distributed queue or proof of durable execution.
 */
export type LocalJobState = 'queued' | 'running' | 'succeeded' | 'failed' | 'unknown';
export type LocalJobEventType = 'created' | 'started' | 'completed' | 'failed' | 'unknown';
export interface LocalJobProvenance {
  source: 'local' | 'api' | 'unknown';
  actor: string | null;
  requestId: string | null;
  correlationId: string | null;
  observedAt: string;
  schemaVersion: '1';
}
export interface LocalJob {
  id: string;
  kind: 'synthetic-observe';
  state: LocalJobState;
  idempotencyKey: string;
  payloadDigest: string;
  sourceUri: string;
  actor: string;
  workerId: string | null;
  attempt: number;
  createdAt: string;
  updatedAt: string;
  finishedAt: string | null;
  resultSummary: string | null;
  errorClass: string | null;
  provenance: LocalJobProvenance;
}
export interface LocalJobEvent {
  id: string;
  jobId: string;
  type: LocalJobEventType;
  sequence: number;
  at: string;
  provenance: LocalJobProvenance;
  details: {
    state: LocalJobState;
    message: string;
  };
}
export interface LocalJobLedgerStatus {
  enabled: boolean;
  durable: boolean;
  source: 'memory' | 'file';
  encryption: 'disabled' | 'aes-256-gcm';
  counts: Record<LocalJobState, number>;
  recentWindow: number;
}
export type LocalJobCreateInput = {
  kind: 'synthetic-observe';
  idempotencyKey: string;
  sourceUri: string;
  actor: string;
};
export type LocalJobMutationResult = {
  job: LocalJob;
  event: LocalJobEvent;
};
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
 * Bounded runtime coordination evidence. These declarations describe the
 * configured coordination boundary only; they never prove distributed
 * consistency, leader election, replica agreement, or external coordination.
 */
export type PersistenceCoordinationMode =
  'local-single-process' | 'operator-coordinated' | 'external-coordinator' | 'invalid';
export interface PersistenceCoordinationPolicy {
  mode: PersistenceCoordinationMode;
  reference: string | null;
  reason: string | null;
  verified: false;
}
//# sourceMappingURL=index.d.ts.map
