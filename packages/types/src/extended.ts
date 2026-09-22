/**
 * Extended type definitions for Ω∞v Oceanicos
 * Types not defined in index.ts or re-exported modules.
 */
import type { VerificationResult, Attestation } from './index.js';

export interface Observation {
  id: string;
  claim: { statement: string; category: string };
  source: { system: string; version: string; environment: string };
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
  evaluated?: boolean;
  reasoning: string;
  severity?: 'info' | 'warning' | 'critical';
}

export interface MemoryRecord {
  id: string;
  observationId: string;
  verificationId: string;
  verified: boolean;
  confidence: number;
  summary?: string;
  rememberedAt: string;
}

export interface EventLogEntry {
  id: number;
  type: 'OBSERVATION' | 'VERIFICATION' | 'ATTESTATION' | 'MEMORY';
  data: Observation | VerificationResult | Attestation | MemoryRecord;
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

export interface QueryResult {
  events: EventLogEntry[];
  totalCount: number;
  pagination: { offset: number; limit: number; hasMore: boolean };
  queriedAt: string;
}

export interface VerificationConfig {
  rules: VerificationRule[];
  categories: string[];
  enableCache: boolean;
  cacheTtl: number;
  maxConcurrency: number;
  enableLearning: boolean;
}

export interface AttestationOptions {
  verificationResult: VerificationResult;
  signingKey?: string;
  attestedBy: string;
  algorithm?: string;
}

export interface LearningInsight {
  description: string;
  confidence: number;
  affectedRule?: string;
  recommendation?: string;
  learnedAt: string;
}

export interface SystemMetrics {
  totalObservations: number;
  totalVerifications: number;
  avgVerificationTime: number;
  successRate: number;
  totalAttestations: number;
  systemConfidence: number;
  lastUpdated: string;
}

export interface ErrorResponse {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
  requestId?: string;
}

export interface SuccessResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
  timestamp: string;
}

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

export type VerificationStatus =
  'VERIFIED' | 'PARTIALLY_VERIFIED' | 'UNVERIFIED' | 'CONTRADICTED' | 'UNKNOWN' | 'DISSENT';

export type FrictionCategory =
  | 'ERROR' | 'LATENCY' | 'CONTRADICTION' | 'MISSING_EVIDENCE'
  | 'PERMISSION_FAILURE' | 'TEST_FAILURE' | 'SECURITY_ISSUE'
  | 'MODEL_DISAGREEMENT' | 'HUMAN_DISAGREEMENT';

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

export interface DissentInterpretation {
  position: string;
  source: string;
  evidence: string[];
  confidence: number;
}

export interface DissentRecord {
  id: string;
  claimId: string;
  interpretations: DissentInterpretation[];
  status: 'OPEN' | 'RESOLVED' | 'ACCEPTED';
  recordedAt: string;
}

export interface ProvenanceGraphNode {
  id: string;
  type: 'OBSERVATION' | 'VERIFICATION' | 'ATTESTATION' | 'MEMORY' | 'ACTION' | 'OUTCOME' | 'LEARNING' | 'FRICTION' | 'DISSENT';
  label: string;
  hash: string;
  recordedAt: string;
  metadata: Record<string, unknown>;
}

export interface ProvenanceGraphEdge {
  id: string;
  sourceId: string;
  targetId: string;
  relation: 'PRODUCED' | 'VERIFIED_BY' | 'ATTESTED_BY' | 'RESULTED_IN' | 'SUPERSEDES' | 'CONTRADICTS';
  timestamp: string;
}

export interface GraphTraversalResult {
  rootId: string;
  direction: 'FORWARD' | 'BACKWARD' | 'BIDIRECTIONAL';
  nodes: ProvenanceGraphNode[];
  edges: ProvenanceGraphEdge[];
  depth: number;
}

export type SecurityPermission =
  | 'CAN_OBSERVE' | 'CAN_VERIFY' | 'CAN_ATTEST' | 'CAN_PROPOSE'
  | 'CAN_ACT' | 'CAN_AUDIT' | 'CAN_RECOMPILE';

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

export type HumanActionType =
  | 'DREAM' | 'THOUGHT' | 'INTENTION' | 'VALUE_JUDGMENT'
  | 'ACTION' | 'FEEDBACK' | 'DISSENT' | 'APPROVAL';

export interface HumanInput {
  id: string;
  type: HumanActionType;
  humanId: string;
  contextId?: string;
  payload: Record<string, unknown>;
  rationale: string;
  recordedAt: string;
}

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
  details: { state: LocalJobState; message: string };
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

export type PersistenceCoordinationMode =
  'local-single-process' | 'operator-coordinated' | 'external-coordinator' | 'invalid';

export interface PersistenceCoordinationPolicy {
  mode: PersistenceCoordinationMode;
  reference: string | null;
  reason: string | null;
  verified: false;
}
