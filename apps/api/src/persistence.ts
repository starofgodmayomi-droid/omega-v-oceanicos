import { appendFileSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

/**
 * Runtime persistence for the Ω∞v API.
 *
 * Extracted from apps/api/src/index.ts so it can be exercised directly.
 * Previously this logic lived inline behind `NODE_ENV !== 'test'`, which
 * meant the only code responsible for surviving a restart was the one piece
 * the test suite could never execute.
 */

export const SNAPSHOT_KEYS = ['events', 'runs', 'actions', 'learnings', 'recompilations'] as const;

export type SnapshotKey = (typeof SNAPSHOT_KEYS)[number];

export type AnySnapshot = Record<SnapshotKey, unknown[]>;

/**
 * Why the returned snapshot looks the way it does.
 *
 * A store that failed to parse and a store that was never written used to
 * produce identical empty results. Naming the difference is the point:
 * hidden uncertainty is worse than reported failure.
 */
export type SnapshotSource = 'disabled' | 'missing' | 'corrupt' | 'restored';

export interface LoadResult<T extends AnySnapshot> {
  snapshot: T;
  source: SnapshotSource;
  /** Present when source is 'corrupt' or 'missing'. */
  reason?: string;
}

export const emptySnapshot = <T extends AnySnapshot>(): T =>
  ({
    events: [],
    runs: [],
    actions: [],
    learnings: [],
    recompilations: [],
  }) as unknown as T;

const hasEveryArray = (value: Partial<AnySnapshot>): boolean =>
  SNAPSHOT_KEYS.every((key) => Array.isArray(value[key]));

/**
 * Read a snapshot from disk.
 *
 * Never throws. The caller learns what happened from `source` rather than
 * having every failure collapse into an empty object.
 */
export const loadSnapshot = <T extends AnySnapshot>(
  storePath: string,
  enabled: boolean
): LoadResult<T> => {
  if (!enabled) {
    return { snapshot: emptySnapshot<T>(), source: 'disabled' };
  }

  let raw: string;
  try {
    raw = readFileSync(storePath, 'utf8');
  } catch (error) {
    return {
      snapshot: emptySnapshot<T>(),
      source: 'missing',
      reason: error instanceof Error ? error.message : 'store could not be read',
    };
  }

  let parsed: Partial<AnySnapshot>;
  try {
    parsed = JSON.parse(raw) as Partial<AnySnapshot>;
  } catch (error) {
    return {
      snapshot: emptySnapshot<T>(),
      source: 'corrupt',
      reason: error instanceof Error ? error.message : 'store was not valid JSON',
    };
  }

  if (parsed === null || typeof parsed !== 'object' || !hasEveryArray(parsed)) {
    return {
      snapshot: emptySnapshot<T>(),
      source: 'corrupt',
      reason: 'store did not contain every expected collection as an array',
    };
  }

  return {
    snapshot: { ...emptySnapshot<T>(), ...parsed } as T,
    source: 'restored',
  };
};

/**
 * Write a snapshot atomically: serialise to a sibling temp file, then rename.
 * A crash mid-write leaves the previous store intact rather than truncated.
 *
 * Returns whether anything was written.
 */
export const saveSnapshot = (
  storePath: string,
  snapshot: AnySnapshot,
  enabled: boolean
): boolean => {
  if (!enabled) return false;

  mkdirSync(dirname(storePath), { recursive: true });
  const temporaryPath = `${storePath}.tmp`;
  writeFileSync(temporaryPath, JSON.stringify(snapshot, null, 2));
  renameSync(temporaryPath, storePath);
  return true;
};

/**
 * Append-only event log.
 *
 * Invariant 4 states that nothing is deleted and the event log is
 * append-only. The runtime arrays do not satisfy that: they are spliced to a
 * fixed length and the truncated result is what gets persisted, so history
 * was being destroyed both in memory and on disk.
 *
 * These functions provide the durable log the invariant describes. The
 * in-memory arrays remain a bounded recent window over it.
 */

export interface AppendOutcome {
  appended: boolean;
  reason?: string;
}

export type EventLogSource = 'disabled' | 'missing' | 'restored' | 'partial';

export interface EventLogRead<T> {
  entries: T[];
  source: EventLogSource;
  /** Lines that could not be parsed. Reported, never silently dropped. */
  skipped: number;
  reason?: string;
}

/**
 * Append one entry as a single JSON line.
 *
 * Uses O_APPEND so concurrent writers interleave whole lines rather than
 * corrupting each other, and never rewrites existing content.
 */
export const appendEvent = (logPath: string, entry: unknown, enabled: boolean): AppendOutcome => {
  if (!enabled) return { appended: false };

  try {
    mkdirSync(dirname(logPath), { recursive: true });
    appendFileSync(logPath, `${JSON.stringify(entry)}\n`);
    return { appended: true };
  } catch (error) {
    return {
      appended: false,
      reason: error instanceof Error ? error.message : 'append failed',
    };
  }
};

/**
 * Read the whole log back.
 *
 * A malformed line does not discard the rest of the history; it is counted
 * and the source becomes 'partial' so the caller knows the read was lossy.
 */
export const readEventLog = <T>(logPath: string, enabled: boolean): EventLogRead<T> => {
  if (!enabled) {
    return { entries: [], source: 'disabled', skipped: 0 };
  }

  let raw: string;
  try {
    raw = readFileSync(logPath, 'utf8');
  } catch (error) {
    return {
      entries: [],
      source: 'missing',
      skipped: 0,
      reason: error instanceof Error ? error.message : 'log could not be read',
    };
  }

  const entries: T[] = [];
  let skipped = 0;

  for (const line of raw.split('\n')) {
    if (line.trim() === '') continue;
    try {
      entries.push(JSON.parse(line) as T);
    } catch {
      skipped += 1;
    }
  }

  return {
    entries,
    source: skipped > 0 ? 'partial' : 'restored',
    skipped,
    reason: skipped > 0 ? `${skipped} line(s) could not be parsed` : undefined,
  };
};
