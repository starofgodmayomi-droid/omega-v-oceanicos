import { createHash } from 'node:crypto';

export const MIRROR_WORKER_VERSION = 'omega.mirror.v1' as const;

export interface MirrorRepositorySnapshot {
  readonly repository: string;
  readonly ref: string;
  readonly headSha: string;
  readonly clean: boolean;
  readonly observedAt: string;
}

export interface MirrorObservation {
  readonly worker: 'mirror';
  readonly version: typeof MIRROR_WORKER_VERSION;
  readonly status: 'OBSERVED' | 'UNKNOWN';
  readonly snapshot?: MirrorRepositorySnapshot;
  readonly evidence: string;
  readonly limitations: readonly string[];
}

const bounded = (value: string, name: string, max = 256): string => {
  const normalized = value.trim();
  if (!normalized || normalized.length > max) {
    throw new Error(name + ' must be a non-empty bounded string');
  }
  return normalized;
};

const canonical = (snapshot: MirrorRepositorySnapshot): string =>
  JSON.stringify({
    repository: snapshot.repository,
    ref: snapshot.ref,
    headSha: snapshot.headSha,
    clean: snapshot.clean,
    observedAt: snapshot.observedAt,
  });

/** Normalize explicitly supplied repository observation; never reads, mutates, or infers. */
export function mirrorRepositoryState(
  input: MirrorRepositorySnapshot,
): MirrorObservation {
  if (typeof input.clean !== 'boolean') {
    throw new Error('clean must be boolean');
  }

  const snapshot: MirrorRepositorySnapshot = {
    repository: bounded(input.repository, 'repository'),
    ref: bounded(input.ref, 'ref'),
    headSha: bounded(input.headSha, 'headSha', 128),
    clean: input.clean,
    observedAt: bounded(input.observedAt, 'observedAt', 64),
  };

  const evidence =
    'sha256:' + createHash('sha256').update(canonical(snapshot)).digest('hex');

  return {
    worker: 'mirror',
    version: MIRROR_WORKER_VERSION,
    status: 'OBSERVED',
    snapshot,
    evidence,
    limitations: [
      'observation was supplied by an external repository observer',
      'evidence does not authorize mutation, merge, or deployment',
      'this worker does not claim runtime or external-world truth',
    ],
  };
}

export function unknownMirrorObservation(reason: string): MirrorObservation {
  const boundedReason = bounded(reason, 'reason', 512);
  const evidence =
    'sha256:' + createHash('sha256').update(boundedReason).digest('hex');

  return {
    worker: 'mirror',
    version: MIRROR_WORKER_VERSION,
    status: 'UNKNOWN',
    evidence,
    limitations: [
      boundedReason,
      'no repository state is promoted without observation',
    ],
  };
}
