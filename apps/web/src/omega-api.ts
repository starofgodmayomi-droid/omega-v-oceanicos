import { API_BASE } from './cognitive-api';

export interface OmegaWorkerInfo {
  id: string;
  version: string;
  role: string;
  classification: 'read-only' | 'local-mutating' | 'externally-consequential';
  description: string;
  capabilities: string[];
  requiresApproval: boolean;
  timeoutMs: number;
}

export interface OmegaCommandIRView {
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
    observerType: string;
    target: string;
  };
}

export interface OmegaCommandView {
  commandId: string;
  sessionId: string;
  requestedBy: string;
  timestamp: string;
  prompt: string;
  boundedContext: Record<string, unknown>;
  requestedWorkers: string[];
  irPlan: OmegaCommandIRView;
  idempotencyKey: string;
  dryRun: boolean;
  redacted: boolean;
  redactedFields: string[];
  status:
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
  statusReason?: string;
  approval?: {
    approvedBy: string;
    approvedAt: string;
    rationale?: string;
  };
}

export interface OmegaObservationView {
  observerId: string;
  observerType: string;
  target: string;
  timestamp: string;
  observedData: Record<string, unknown>;
  stateHash: string;
}

export interface OmegaRealityVerdictView {
  verdict: 'VERIFIED' | 'DIVERGENT' | 'UNKNOWN' | 'NOT_EXECUTED';
  claimedStateHash?: string;
  observedStateHash?: string;
  discrepancies: string[];
  evaluatedAt: string;
  receiptVerified?: boolean;
  stateDiffSummary?: string;
}

export interface OmegaCommandResultView {
  commandId: string;
  status: string;
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
  observation?: OmegaObservationView;
  realityVerdict?: OmegaRealityVerdictView;
  dissentNotes?: string[];
  completedAt?: string;
  receipt?: {
    executionId: string;
    status: string;
    isolationMode: string;
    exitCode: number;
    durationMs: number;
    outputSummary: string;
    stateDiff: {
      stateBeforeHash: string;
      stateAfterHash: string;
      mutations: Array<{ path: string; mutationType: string; nextValue?: unknown }>;
      summary: string;
    };
    executionAttestationDigest: string;
  };
}

export async function fetchOmegaWorkers(): Promise<{ success: boolean; workers: OmegaWorkerInfo[] }> {
  const res = await fetch(`${API_BASE}/v1/omega/workers`);
  return res.json();
}

export async function fetchOmegaCommands(limit: number = 20): Promise<{ success: boolean; commands: OmegaCommandView[] }> {
  const res = await fetch(`${API_BASE}/v1/omega/commands?limit=${limit}`);
  return res.json();
}

export async function proposeOmegaCommand(
  intentOrPrompt: string,
  requestedWorkersOrOptions?: string[] | {
    requestedBy?: string;
    workers?: string[];
    idempotencyKey?: string;
    context?: Record<string, unknown>;
  },
  context?: Record<string, unknown>
): Promise<{ success: boolean; command: OmegaCommandView; error?: string }> {
  let body: Record<string, unknown>;
  if (requestedWorkersOrOptions && !Array.isArray(requestedWorkersOrOptions)) {
    // New canonical form: proposeOmegaCommand('intent', { requestedBy, workers, ... })
    body = {
      intent: intentOrPrompt,
      requestedBy: requestedWorkersOrOptions.requestedBy ?? 'dashboard-user',
      workers: requestedWorkersOrOptions.workers ?? [],
      idempotencyKey: requestedWorkersOrOptions.idempotencyKey ?? `idem_${Date.now()}`,
      context: requestedWorkersOrOptions.context,
    };
  } else {
    // Legacy compat: proposeOmegaCommand('prompt', ['worker-a'], { ... })
    body = {
      prompt: intentOrPrompt,
      requestedWorkers: requestedWorkersOrOptions,
      context,
    };
  }
  const res = await fetch(`${API_BASE}/v1/omega/commands`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function inspectOmegaCommand(
  commandId: string
): Promise<{ success: boolean; command: OmegaCommandView; result?: OmegaCommandResultView; error?: string }> {
  const res = await fetch(`${API_BASE}/v1/omega/commands/${commandId}`);
  return res.json();
}

export async function admitOmegaCommand(
  commandId: string,
  evidence?: {
    authority?: string;
    policy?: string;
    authorityVerified?: boolean;
    policySatisfied?: boolean;
  }
): Promise<{ success: boolean; verdict: 'ALLOW' | 'DENY' | 'REVIEW'; command: OmegaCommandView; reason?: string; error?: string }> {
  const res = await fetch(`${API_BASE}/v1/omega/commands/${commandId}/admit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(evidence ?? {}),
  });
  return res.json();
}

export async function approveOmegaCommand(
  commandId: string,
  approvedBy?: string,
  rationale?: string
): Promise<{ success: boolean; command: OmegaCommandView; error?: string }> {
  const res = await fetch(`${API_BASE}/v1/omega/commands/${commandId}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ approvedBy, rationale }),
  });
  return res.json();
}

export async function executeOmegaCommand(
  commandId: string
): Promise<{ success: boolean; command: OmegaCommandView; result: OmegaCommandResultView; error?: string }> {
  const res = await fetch(`${API_BASE}/v1/omega/commands/${commandId}/execute`, {
    method: 'POST',
  });
  return res.json();
}

export async function observeOmegaCommand(
  commandId: string,
  observedData?: Record<string, unknown>,
  observerType?: string,
  target?: string
): Promise<{ success: boolean; command: OmegaCommandView; observation: OmegaObservationView; error?: string }> {
  const res = await fetch(`${API_BASE}/v1/omega/commands/${commandId}/observe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ observedData, observerType, target }),
  });
  return res.json();
}

export async function verifyRealityOmegaCommand(
  commandId: string
): Promise<{ success: boolean; verdict: string; command: OmegaCommandView; result: OmegaCommandResultView; error?: string }> {
  const res = await fetch(`${API_BASE}/v1/omega/commands/${commandId}/verify-reality`, {
    method: 'POST',
  });
  return res.json();
}

export interface OmegaLearningView {
  totalEvaluated: number;
  completedCount: number;
  refusedCount: number;
  verifiedCount: number;
  divergentCount: number;
  unknownCount: number;
  reliabilityScore: number;
  workerReliability: Record<string, number>;
  recurrentDiscrepancies: Array<{ kind: string; count: number; samples: string[] }>;
  recommendations: string[];
  analyzedAt: string;
}

export interface OmegaNextSliceProposalView {
  sourceCommandId?: string;
  trigger: string;
  actionType: string;
  rationale: string;
  proposedIntent: string;
  suggestedWorkers: string[];
  suggestedObservationType: string;
  suggestedObservationTarget: string;
  urgency: string;
  generatedAt: string;
}

export async function fetchOmegaLearning(): Promise<{ success: boolean; learning: OmegaLearningView }> {
  const res = await fetch(`${API_BASE}/v1/omega/learning`);
  return res.json();
}

export async function fetchOmegaNextSlice(
  commandId?: string
): Promise<{ success: boolean; proposal: OmegaNextSliceProposalView; feedback: OmegaLearningView }> {
  const url = commandId
    ? `${API_BASE}/v1/omega/commands/${commandId}/next-slice`
    : `${API_BASE}/v1/omega/next-slice`;
  const res = await fetch(url);
  return res.json();
}

export interface OmegaLifecycleEventView {
  eventId: string;
  eventType: string;
  commandId?: string;
  status?: string;
  actor: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

export async function fetchOmegaEvents(
  limit: number = 20,
  commandId?: string
): Promise<{ success: boolean; events: OmegaLifecycleEventView[] }> {
  const url = commandId
    ? `${API_BASE}/v1/omega/events?limit=${limit}&commandId=${encodeURIComponent(commandId)}`
    : `${API_BASE}/v1/omega/events?limit=${limit}`;
  const res = await fetch(url);
  return res.json();
}

export function subscribeToOmegaEvents(
  onEvent: (event: OmegaLifecycleEventView) => void,
  commandId?: string
): () => void {
  if (typeof EventSource === 'undefined') {
    return () => {};
  }
  const url = commandId
    ? `${API_BASE}/v1/omega/events?stream=true&commandId=${encodeURIComponent(commandId)}`
    : `${API_BASE}/v1/omega/events?stream=true`;
  const eventSource = new EventSource(url);

  eventSource.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      if (data && data.eventId) {
        onEvent(data);
      }
    } catch {
      // ignore non-json lines
    }
  };

  return () => {
    eventSource.close();
  };
}

export interface CopilotPropulsionView {
  mode: {
    copilot: boolean;
    antigravity: boolean;
    continuum: string;
    fullStack: boolean;
    realityFirst: boolean;
    evidenceBound: boolean;
    humanRouting: boolean;
    pluralism: boolean;
    dissent: string;
    noSpeculation: boolean;
    noFabricatedState: boolean;
    noStall: boolean;
    preserveLineage: boolean;
  };
  authority: string;
  liquidState: {
    velocity: number;
    clarityVector: number;
    resonanceHz: number;
    blockAnchor: string;
  };
  pidginSpirit: string;
  axiom: string;
  verifiedTransitions: number;
  activeGoal: string;
  invariant: string;
}

export async function fetchCopilotMode(): Promise<{ success: boolean } & CopilotPropulsionView> {
  const res = await fetch(`${API_BASE}/v1/copilot/mode`);
  return res.json();
}

export interface KernelIntegrityReportView {
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

export interface KernelStatusView {
  success: boolean;
  chainLength: number;
  head: {
    stateId: string;
    stateIndex: number;
    parentStateHash: string;
    stateDeltaHash: string;
    attestationSignature: string;
    createdAt: string;
    verificationStatus: string;
  } | null;
  stats: {
    totalTransitions: number;
    verifiedStatesCount: number;
    dissentRecordedCount: number;
    gatedActionsCount: number;
    currentRootStateHash: string;
  };
}

export async function fetchKernelStatus(): Promise<KernelStatusView> {
  const res = await fetch(`${API_BASE}/v1/omega/kernel/status`);
  return res.json();
}

export async function fetchKernelIntegrity(): Promise<{ success: boolean; report: KernelIntegrityReportView }> {
  const res = await fetch(`${API_BASE}/v1/omega/kernel/integrity`);
  return res.json();
}

export interface CanonicalStateNodeView {
  stateId: string;
  stateIndex: number;
  parentStateHash: string;
  stateDeltaHash: string;
  attestationSignature: string;
  createdAt: string;
  verificationStatus: 'VERIFIED' | 'FALSIFIED' | 'UNCERTAIN';
  action: {
    actionId: string;
    targetService: string;
    payload: Record<string, unknown>;
    status: string;
  };
  consequence?: {
    consequenceId: string;
    actionId: string;
    observedStatus: 'SUCCESS' | 'FAILURE' | 'PARTIAL' | 'TIMEOUT';
    realizedEffects: Record<string, unknown>;
    executionDurationMs: number;
    verifiedValueGenerated: number;
    observedAt: string;
  };
  learning?: {
    learningId: string;
    successRateScore: number;
    meanVerificationLatencyMs: number;
    dissentResolutionRatio: number;
    recompilationTriggered: boolean;
    proposedNextIntentPrompt: string;
  };
  settledAt?: string;
}

export async function fetchKernelStates(): Promise<{ success: boolean; states: CanonicalStateNodeView[] }> {
  const res = await fetch(`${API_BASE}/v1/omega/kernel/states`);
  return res.json();
}

// ─── Canonical Store Client Functions ─────────────────────────────────

export interface OmegaProvenanceView {
  commandId: string;
  intent: string;
  requestedBy: string;
  createdAt: string;
  context?: Record<string, string>;
  workers: string[];
  status: string;
  ir?: unknown;
  change?: unknown;
  execution?: unknown;
  reality?: unknown;
  events: Array<Record<string, unknown>>;
  lineage: Array<{ type: string; at: string; status: string }>;
  redacted: boolean;
}

export async function fetchOmegaProvenance(
  commandId: string
): Promise<{ success: boolean; provenance: OmegaProvenanceView; error?: string }> {
  const res = await fetch(`${API_BASE}/v1/omega/commands/${commandId}/provenance`);
  return res.json();
}

export interface TotalCompressionRequestView {
  archiveId: string;
  evolutionScope: string;
  activePackages: string[];
  totalContextTokensProcessed: number;
  rigidLeaseBoundMs: number;
}

export interface TotalCompressionResultView {
  success: boolean;
  validation: 'VALID' | 'INVALID';
  execution: string;
  evidence: string;
  request?: TotalCompressionRequestView;
  issues: Array<{ code: string; field: string; message: string }>;
}

export async function compressOmegaContext(
  request: TotalCompressionRequestView
): Promise<TotalCompressionResultView> {
  const res = await fetch(`${API_BASE}/v1/omega/compress`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  return res.json();
}

export async function leaseExecuteOmegaCommand(
  commandId: string,
  workerId: string,
  capability: string
): Promise<{
  success: boolean;
  lease: { leaseId: string; workerId: string; released: boolean };
  command: OmegaCommandView;
  status: string;
  execution?: unknown;
  reality?: unknown;
  nextAction: string;
  error?: string;
}> {
  const res = await fetch(`${API_BASE}/v1/omega/commands/${commandId}/lease-execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workerId, capability }),
  });
  return res.json();
}

export async function recompileOmegaSlice(
  proposal?: OmegaNextSliceProposalView
): Promise<{
  success: boolean;
  proposal: OmegaNextSliceProposalView;
  compileInput: unknown;
}> {
  const res = await fetch(`${API_BASE}/v1/omega/recompile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(proposal ? { proposal } : {}),
  });
  return res.json();
}

