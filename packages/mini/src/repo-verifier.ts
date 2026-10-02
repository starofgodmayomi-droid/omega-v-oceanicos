import { createHash } from 'node:crypto';
import type { MirrorRepositorySnapshot } from './mirror-worker.js';

export type RepositoryReconciliationStatus = 'VERIFIED' | 'DIVERGENT' | 'UNKNOWN';

export interface RepositoryReconciliation {
  readonly worker: 'repo-verifier';
  readonly status: RepositoryReconciliationStatus;
  readonly expected: MirrorRepositorySnapshot;
  readonly observed?: MirrorRepositorySnapshot;
  readonly evidence: string;
  readonly issues: readonly string[];
  readonly verificationScope: 'repository-state-only';
}

const digest = (value: unknown): string =>
  'sha256:' + createHash('sha256').update(JSON.stringify(value)).digest('hex');

/** Reconcile declared repository state against an independently supplied observation. */
export function reconcileRepositoryState(
  expected: MirrorRepositorySnapshot,
  observed?: MirrorRepositorySnapshot,
): RepositoryReconciliation {
  if (!observed) {
    return {
      worker: 'repo-verifier', status: 'UNKNOWN', expected, evidence: digest({ expected, observed: null }),
      issues: ['repository observation is unavailable'], verificationScope: 'repository-state-only',
    };
  }
  const matches = expected.repository === observed.repository &&
    expected.ref === observed.ref && expected.headSha === observed.headSha && expected.clean === observed.clean;
  return {
    worker: 'repo-verifier', status: matches ? 'VERIFIED' : 'DIVERGENT', expected, observed,
    evidence: digest({ expected, observed }),
    issues: matches ? [] : ['observed repository state differs from the declared expected state'],
    verificationScope: 'repository-state-only',
  };
}