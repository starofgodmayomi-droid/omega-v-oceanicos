import type { ProposalPayload } from './api';

export type SubmissionRequest = Omit<ProposalPayload, 'idempotencyKey'>;
export interface SubmissionIdentity {
  fingerprint: string;
  idempotencyKey: string;
  sequence: number;
}
export interface SubmissionLedger {
  byFingerprint: Map<string, SubmissionIdentity>;
  sequence: number;
}

export const createSubmissionLedger = (): SubmissionLedger => ({
  byFingerprint: new Map(),
  sequence: 0,
});

export function submissionFingerprint(request: SubmissionRequest): string {
  return JSON.stringify({ ...request, targetScope: [...request.targetScope] });
}

export function prepareSubmission(
  request: SubmissionRequest,
  ledger: SubmissionLedger,
  now = Date.now(),
): { payload: ProposalPayload; identity: SubmissionIdentity } {
  const boundedRequest: SubmissionRequest = { ...request, targetScope: [...request.targetScope] };
  const fingerprint = submissionFingerprint(boundedRequest);
  const existing = ledger.byFingerprint.get(fingerprint);
  if (existing) {
    return { payload: { ...boundedRequest, idempotencyKey: existing.idempotencyKey }, identity: existing };
  }
  ledger.sequence += 1;
  const identity: SubmissionIdentity = {
    fingerprint,
    idempotencyKey: `mobile-oreade-${now}-${ledger.sequence}`,
    sequence: ledger.sequence,
  };
  ledger.byFingerprint.set(fingerprint, identity);
  return { payload: { ...boundedRequest, idempotencyKey: identity.idempotencyKey }, identity };
}
