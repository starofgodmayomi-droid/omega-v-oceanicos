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
  prompt: string,
  requestedWorkers?: string[],
  context?: Record<string, unknown>
): Promise<{ success: boolean; command: OmegaCommandView; error?: string }> {
  const res = await fetch(`${API_BASE}/v1/omega/commands`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, requestedWorkers, context }),
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
  commandId: string
): Promise<{ success: boolean; verdict: 'ALLOW' | 'DENY' | 'REVIEW'; command: OmegaCommandView; reason?: string; error?: string }> {
  const res = await fetch(`${API_BASE}/v1/omega/commands/${commandId}/admit`, {
    method: 'POST',
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
