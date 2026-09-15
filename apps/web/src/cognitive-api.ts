/**
 * Typed client for the Ω∞v Cognitive Verification API.
 *
 * Keeps fetch calls and error handling out of React components.
 * Every function targets the Fastify API at the same origin/port
 * the rest of App.tsx already uses.
 */

const API_BASE = 'http://localhost:5000';

// ── Response shapes (mirror packages/types, kept local to avoid
//    build-time coupling between the web bundle and Node packages) ──

export interface CognitiveObservation {
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
  status: string;
}

export interface CognitiveEvidenceStep {
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

export interface CognitiveVerification {
  id: string;
  observationId: string;
  timestamp?: string;
  summary: {
    passed: boolean;
    confidence: number;
    claimedConfidence?: number;
    rulesApplied?: number;
    rulesPassed?: number;
    rulesFailed?: number;
  };
  rules?: Array<{
    name: string;
    passed: boolean;
    confidence?: number;
    evidence?: unknown[];
    reason?: string;
  }>;
  evidencePath?: CognitiveEvidenceStep[] | string;
  ruleVersions?: Record<string, string>;
  status?: string;
}

export interface CognitiveMemoryRecord {
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

export interface CognitiveAttestation {
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
  status: string;
}

export interface CognitiveRule {
  name: string;
  version: string;
  appliesTo: string[];
  definition: string;
  description: string;
  createdAt: string;
  active: boolean;
}

// ── Cycle results ──

export interface MiniCycleResponse {
  success: boolean;
  observation: CognitiveObservation;
  verification: CognitiveVerification;
  memory: CognitiveMemoryRecord;
  entries?: unknown[];
  passed: boolean;
  confidence: number;
  completedAt: string;
  error?: string;
}

export interface CompleteLoopResponse extends MiniCycleResponse {
  attestation: CognitiveAttestation;
}

export interface RulesResponse {
  success: boolean;
  count: number;
  rules: CognitiveRule[];
  error?: string;
}

export interface MemoryResponse {
  success: boolean;
  entries: CognitiveMemoryRecord[];
  size: number;
  error?: string;
}

export interface IntegrityResponse {
  success: boolean;
  valid: boolean;
  size: number;
  error?: string;
}

// ── API functions ──

export async function runCognitiveLoop(
  claim: string,
  opts?: {
    category?: string;
    source?: { system: string; version: string; environment: string };
    observedBy?: string;
    metadata?: Record<string, unknown>;
    confidence?: number;
    confidenceReason?: string;
  }
): Promise<MiniCycleResponse> {
  const res = await fetch(`${API_BASE}/v1/mini/cycle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ claim, ...opts }),
  });
  return res.json();
}

export async function runCompleteLoop(
  claim: string,
  opts?: {
    category?: string;
    confidence?: number;
  }
): Promise<CompleteLoopResponse> {
  const res = await fetch(`${API_BASE}/v1/complete-loop`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ claim, ...opts }),
  });
  return res.json();
}

export async function fetchRules(): Promise<RulesResponse> {
  const res = await fetch(`${API_BASE}/v1/rules`);
  return res.json();
}

export async function fetchMemory(): Promise<MemoryResponse> {
  const res = await fetch(`${API_BASE}/v1/memory/all`);
  return res.json();
}

export async function fetchIntegrity(): Promise<IntegrityResponse> {
  const res = await fetch(`${API_BASE}/v1/mini/integrity`);
  return res.json();
}
