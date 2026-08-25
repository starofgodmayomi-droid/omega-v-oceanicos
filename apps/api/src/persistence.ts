import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from 'node:crypto';
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
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

const ENCRYPTED_PREFIX = 'omega-v1';
const AES_KEY_BYTES = 32;
const AES_IV_BYTES = 12;
const AES_TAG_BYTES = 16;

type EncryptionKey = Buffer;
export type EncryptionKeySource = 'none' | 'current' | 'previous' | 'mixed';
export type PersistenceKeyFingerprint = string | null;
export type PersistenceRecoveryMode =
  'unavailable' | 'operator-provided' | 'external-reference' | 'invalid';
export type PersistenceRecoveryPolicy = {
  mode: PersistenceRecoveryMode;
  reference: string | null;
  reason: string | null;
};
export type PersistenceDeletionMode =
  'unavailable' | 'unlink-only' | 'overwrite-unlink' | 'invalid';
export type PersistenceDeletionPolicy = {
  mode: PersistenceDeletionMode;
  reason: string | null;
  verified: false;
};
export type PersistenceCustodyMode =
  'unverified-local' | 'operator-managed' | 'hsm-kms' | 'external-reference' | 'invalid';
export type PersistenceCustodyPolicy = {
  mode: PersistenceCustodyMode;
  reference: string | null;
  reason: string | null;
  verified: false;
};
export type PersistenceCoordinationMode =
  'local-single-process' | 'operator-coordinated' | 'external-coordinator' | 'invalid';
export type PersistenceCoordinationPolicy = {
  mode: PersistenceCoordinationMode;
  reference: string | null;
  reason: string | null;
  verified: false;
};
export type PersistenceCoverage = {
  complete: false;
  surfaces: Array<{
    name: 'runtime-snapshot' | 'event-log' | 'kernel-memory' | 'local-job-ledger';
    encryption: 'aes-256-gcm' | 'disabled';
    keySource: EncryptionKeySource;
    evidence: 'runtime-observed';
  }>;
  unverifiedSurfaces: string[];
  unverifiedReasons: string[];
};

export const persistenceCoverage = (input: {
  enabled: boolean;
  snapshotEncrypted: boolean;
  snapshotKeySource: EncryptionKeySource;
  eventLogEncrypted: boolean;
  eventLogKeySource: EncryptionKeySource;
  memoryEncrypted: boolean;
  memoryKeySource: EncryptionKeySource;
  jobLedgerEncrypted: boolean;
  jobLedgerKeySource: EncryptionKeySource;
}): PersistenceCoverage => ({
  complete: false,
  surfaces: [
    {
      name: 'runtime-snapshot',
      encryption: input.enabled && input.snapshotEncrypted ? 'aes-256-gcm' : 'disabled',
      keySource: input.enabled ? input.snapshotKeySource : 'none',
      evidence: 'runtime-observed',
    },
    {
      name: 'event-log',
      encryption: input.enabled && input.eventLogEncrypted ? 'aes-256-gcm' : 'disabled',
      keySource: input.enabled ? input.eventLogKeySource : 'none',
      evidence: 'runtime-observed',
    },
    {
      name: 'kernel-memory',
      encryption: input.enabled && input.memoryEncrypted ? 'aes-256-gcm' : 'disabled',
      keySource: input.enabled ? input.memoryKeySource : 'none',
      evidence: 'runtime-observed',
    },
    {
      name: 'local-job-ledger',
      encryption: input.jobLedgerEncrypted ? 'aes-256-gcm' : 'disabled',
      keySource: input.jobLedgerKeySource,
      evidence: 'runtime-observed',
    },
  ],
  unverifiedSurfaces: ['databases', 'object storage', 'backups', 'external services'],
  unverifiedReasons: [
    'no database persistence adapter is configured',
    'no object-storage persistence adapter is configured',
    'backup encryption and restore evidence are not connected to this runtime',
    'external-service persistence and key custody are outside this process boundary',
  ],
});

/**
 * Parses a declared recovery policy without verifying the referenced operator
 * or custodian. Invalid declarations remain visible and never become ready.
 */
export const parsePersistenceDeletionPolicy = (mode?: string): PersistenceDeletionPolicy => {
  const normalizedMode = mode?.trim() || 'unavailable';
  if (normalizedMode === 'unavailable') {
    return { mode: 'unavailable', reason: null, verified: false };
  }
  if (normalizedMode === 'unlink-only' || normalizedMode === 'overwrite-unlink') {
    return { mode: normalizedMode, reason: null, verified: false };
  }
  return { mode: 'invalid', reason: 'unsupported deletion policy mode', verified: false };
};

export const parsePersistenceCustodyPolicy = (
  mode?: string,
  reference?: string
): PersistenceCustodyPolicy => {
  const normalizedMode = mode?.trim() || 'unverified-local';
  const normalizedReference = reference?.trim() || null;
  if (normalizedMode === 'unverified-local') {
    return { mode: normalizedMode, reference: null, reason: null, verified: false };
  }
  if (
    normalizedMode !== 'operator-managed' &&
    normalizedMode !== 'hsm-kms' &&
    normalizedMode !== 'external-reference'
  ) {
    return {
      mode: 'invalid',
      reference: null,
      reason: 'unsupported custody policy mode',
      verified: false,
    };
  }
  if (
    !normalizedReference ||
    normalizedReference.length > 256 ||
    /[\r\n]/.test(normalizedReference)
  ) {
    return {
      mode: 'invalid',
      reference: null,
      reason: 'custody policy reference is missing or invalid',
      verified: false,
    };
  }
  return { mode: normalizedMode, reference: normalizedReference, reason: null, verified: false };
};

export const parsePersistenceCoordinationPolicy = (
  mode?: string,
  reference?: string
): PersistenceCoordinationPolicy => {
  const normalizedMode = mode?.trim() || 'local-single-process';
  const normalizedReference = reference?.trim() || null;
  if (normalizedMode === 'local-single-process') {
    return { mode: normalizedMode, reference: null, reason: null, verified: false };
  }
  if (normalizedMode !== 'operator-coordinated' && normalizedMode !== 'external-coordinator') {
    return {
      mode: 'invalid',
      reference: null,
      reason: 'unsupported coordination policy mode',
      verified: false,
    };
  }
  if (
    !normalizedReference ||
    normalizedReference.length > 256 ||
    /[\r\n]/.test(normalizedReference)
  ) {
    return {
      mode: 'invalid',
      reference: null,
      reason: 'coordination policy reference is missing or invalid',
      verified: false,
    };
  }
  return { mode: normalizedMode, reference: normalizedReference, reason: null, verified: false };
};

export const parsePersistenceRecoveryPolicy = (
  mode?: string,
  reference?: string
): PersistenceRecoveryPolicy => {
  const normalizedMode = mode?.trim() || 'unavailable';
  const normalizedReference = reference?.trim() || null;
  if (normalizedMode === 'unavailable') {
    return { mode: 'unavailable', reference: null, reason: null };
  }
  if (normalizedMode !== 'operator-provided' && normalizedMode !== 'external-reference') {
    return { mode: 'invalid', reference: null, reason: 'unsupported recovery policy mode' };
  }
  if (
    !normalizedReference ||
    normalizedReference.length > 256 ||
    /[\r\n]/.test(normalizedReference)
  ) {
    return {
      mode: 'invalid',
      reference: null,
      reason: 'recovery policy reference is missing or invalid',
    };
  }
  return { mode: normalizedMode, reference: normalizedReference, reason: null };
};

/**
 * Returns a short, non-secret identifier for configured key equality checks.
 * It is provenance about the local configured secret only; it is not custody,
 * key recovery, HSM/KMS, or deployment evidence.
 */
export const persistenceKeyFingerprint = (secret?: string): PersistenceKeyFingerprint =>
  secret ? createHash('sha256').update(secret, 'utf8').digest('hex').slice(0, 16) : null;

/**
 * A rotation is pending when a configured previous key was actually needed to
 * authenticate any restored local persistence. This is diagnostic evidence;
 * it does not perform or claim automated re-encryption.
 */
export const persistenceRotationPending = (
  previousKeyConfigured: boolean,
  ...sources: EncryptionKeySource[]
): boolean =>
  previousKeyConfigured && sources.some((source) => source === 'previous' || source === 'mixed');
type EncryptionSecrets = string | { current?: string; previous?: string };

type DecryptedText = { plaintext: string; keySource: EncryptionKeySource };

const deriveEncryptionKey = (secret?: string): EncryptionKey | undefined => {
  if (!secret) return undefined;
  return createHash('sha256').update(secret, 'utf8').digest();
};

const encryptText = (plaintext: string, secret?: string): string => {
  const key = deriveEncryptionKey(secret);
  if (!key) return plaintext;

  const iv = randomBytes(AES_IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    ENCRYPTED_PREFIX,
    iv.toString('base64url'),
    tag.toString('base64url'),
    ciphertext.toString('base64url'),
  ].join(':');
};

const normalizeSecrets = (secrets?: EncryptionSecrets): { current?: string; previous?: string } =>
  typeof secrets === 'string' || secrets === undefined
    ? { current: secrets }
    : { current: secrets.current, previous: secrets.previous };

const combineKeySources = (sources: Set<EncryptionKeySource>): EncryptionKeySource => {
  if (sources.has('current') && sources.has('previous')) return 'mixed';
  if (sources.has('current')) return 'current';
  if (sources.has('previous')) return 'previous';
  return 'none';
};

const decryptText = (stored: string, secrets?: EncryptionSecrets): DecryptedText => {
  if (!stored.startsWith(`${ENCRYPTED_PREFIX}:`)) return { plaintext: stored, keySource: 'none' };

  const { current, previous } = normalizeSecrets(secrets);
  const candidates: Array<{ secret?: string; source: 'current' | 'previous' }> = [
    { secret: current, source: 'current' },
    { secret: previous, source: 'previous' },
  ];

  const [, ivEncoded, tagEncoded, ciphertextEncoded] = stored.split(':');
  if (!ivEncoded || !tagEncoded || !ciphertextEncoded) {
    throw new Error('encrypted persistence record is malformed');
  }

  const iv = Buffer.from(ivEncoded, 'base64url');
  const tag = Buffer.from(tagEncoded, 'base64url');
  const ciphertext = Buffer.from(ciphertextEncoded, 'base64url');
  if (iv.length !== AES_IV_BYTES || tag.length !== AES_TAG_BYTES || ciphertext.length === 0) {
    throw new Error('encrypted persistence record has invalid lengths');
  }

  let lastError: unknown;
  for (const candidate of candidates) {
    const key = deriveEncryptionKey(candidate.secret);
    if (!key) continue;
    try {
      const decipher = createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(tag);
      return {
        plaintext: Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8'),
        keySource: candidate.source,
      };
    } catch (error) {
      lastError = error;
    }
  }

  if (!current && !previous) {
    throw new Error('encrypted persistence requires OMEGA_PERSISTENCE_KEY');
  }
  throw lastError instanceof Error
    ? lastError
    : new Error('encrypted persistence could not be decrypted');
};

/**
 * Why the returned snapshot looks the way it does.
 *
 * A store that failed to parse and a store that was never written used to
 * produce identical empty results. Naming the difference is the point:
 * hidden uncertainty is worse than reported failure.
 */
export type SnapshotSource = 'disabled' | 'missing' | 'corrupt' | 'restored';

/**
 * Whether the runtime has a usable persisted snapshot for readiness purposes.
 * An enabled but missing store is a valid cold start; an enabled corrupt store
 * is not silently treated as ready because the loaded runtime is incomplete.
 */
export const persistenceReady = (enabled: boolean, source: SnapshotSource): boolean =>
  !enabled || source !== 'corrupt';

export type PersistenceOperatorAction =
  | 'none'
  | 'review-partial-recovery'
  | 'review-key-rotation'
  | 'review-partial-recovery-and-key-rotation';

/**
 * Classifies the next human review boundary from already-observable local
 * evidence. It routes attention; it does not repair, acknowledge, or authorize
 * persistence changes.
 */
export const persistenceOperatorAction = (
  snapshotSource: SnapshotSource,
  eventLogSource: EventLogSource,
  rotationPending: boolean
): PersistenceOperatorAction => {
  const partialRecovery = snapshotSource === 'corrupt' || eventLogSource === 'partial';
  if (partialRecovery && rotationPending) return 'review-partial-recovery-and-key-rotation';
  if (partialRecovery) return 'review-partial-recovery';
  if (rotationPending) return 'review-key-rotation';
  return 'none';
};

export interface LoadResult<T extends AnySnapshot> {
  snapshot: T;
  source: SnapshotSource;
  /** Present when source is 'corrupt' or 'missing'. */
  reason?: string;
  keySource: EncryptionKeySource;
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
 * having every failure collapse into an empty object. When a key is supplied,
 * encrypted snapshots are authenticated before JSON parsing; legacy plaintext
 * snapshots remain readable for controlled migration.
 */
export const loadSnapshot = <T extends AnySnapshot>(
  storePath: string,
  enabled: boolean,
  encryptionSecret?: string,
  previousEncryptionSecret?: string
): LoadResult<T> => {
  if (!enabled) {
    return { snapshot: emptySnapshot<T>(), source: 'disabled', keySource: 'none' };
  }

  let stored: string;
  try {
    stored = readFileSync(storePath, 'utf8').trim();
  } catch (error) {
    return {
      snapshot: emptySnapshot<T>(),
      source: 'missing',
      reason: error instanceof Error ? error.message : 'store could not be read',
      keySource: 'none',
    };
  }

  let raw: string;
  let keySource: EncryptionKeySource = 'none';
  try {
    const decrypted = decryptText(
      stored,
      previousEncryptionSecret
        ? { current: encryptionSecret, previous: previousEncryptionSecret }
        : encryptionSecret
    );
    raw = decrypted.plaintext;
    keySource = decrypted.keySource;
  } catch (error) {
    return {
      snapshot: emptySnapshot<T>(),
      source: 'corrupt',
      reason: error instanceof Error ? error.message : 'store could not be decrypted',
      keySource: 'none',
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
      keySource,
    };
  }

  if (parsed === null || typeof parsed !== 'object' || !hasEveryArray(parsed)) {
    return {
      snapshot: emptySnapshot<T>(),
      source: 'corrupt',
      reason: 'store did not contain every expected collection as an array',
      keySource,
    };
  }

  return {
    snapshot: { ...emptySnapshot<T>(), ...parsed } as T,
    source: 'restored',
    keySource,
  };
};

/**
 * Write a snapshot atomically: serialise to a sibling temp file, then rename.
 * A crash mid-write leaves the previous store intact rather than truncated.
 *
 * Returns whether anything was written. With an encryption secret, the file
 * contains an authenticated AES-256-GCM envelope rather than JSON plaintext.
 */
export const saveSnapshot = (
  storePath: string,
  snapshot: AnySnapshot,
  enabled: boolean,
  encryptionSecret?: string
): boolean => {
  if (!enabled) return false;

  mkdirSync(dirname(storePath), { recursive: true });
  const temporaryPath = `${storePath}.tmp`;
  const plaintext = JSON.stringify(snapshot, null, 2);
  writeFileSync(temporaryPath, encryptText(plaintext, encryptionSecret));
  renameSync(temporaryPath, storePath);
  return true;
};

export type PersistenceReencryptionResult = {
  rewritten: boolean;
  snapshotRecords: number;
  eventRecords: number;
  snapshotKeySource: EncryptionKeySource;
  eventLogKeySource: EncryptionKeySource;
};

export type ReencryptionRecoveryResult = {
  status: 'none' | 'recovered' | 'blocked';
  reason?: string;
};

type ReencryptionJournal = {
  version: 1;
  storePath: string;
  logPath: string;
  snapshotTemporaryPath: string;
  logTemporaryPath: string;
  phase: 'staged' | 'snapshot-committed';
};

export const reencryptionJournalPath = (storePath: string): string =>
  `${storePath}.reencryption-journal.json`;

/**
 * Reconciles an interrupted local re-encryption before the runtime reads its
 * stores. The journal is local crash evidence, not distributed coordination.
 * Missing or malformed transaction artifacts remain blocked rather than being
 * guessed into a ready state.
 */
export const reconcileReencryptionJournal = (journalPath: string): ReencryptionRecoveryResult => {
  if (!existsSync(journalPath)) return { status: 'none' };

  let journal: ReencryptionJournal;
  try {
    journal = JSON.parse(readFileSync(journalPath, 'utf8')) as ReencryptionJournal;
  } catch {
    return { status: 'blocked', reason: 're-encryption journal is unreadable' };
  }
  if (
    journal.version !== 1 ||
    typeof journal.storePath !== 'string' ||
    typeof journal.logPath !== 'string' ||
    typeof journal.snapshotTemporaryPath !== 'string' ||
    typeof journal.logTemporaryPath !== 'string' ||
    (journal.phase !== 'staged' && journal.phase !== 'snapshot-committed')
  ) {
    return { status: 'blocked', reason: 're-encryption journal is malformed' };
  }
  if (!existsSync(journal.logTemporaryPath)) {
    return {
      status: 'blocked',
      reason: 're-encryption transaction is missing its staged event log',
    };
  }
  if (journal.phase === 'staged' && !existsSync(journal.snapshotTemporaryPath)) {
    return {
      status: 'blocked',
      reason: 're-encryption transaction is missing its staged snapshot',
    };
  }

  try {
    if (journal.phase === 'staged') renameSync(journal.snapshotTemporaryPath, journal.storePath);
    renameSync(journal.logTemporaryPath, journal.logPath);
    unlinkSync(journalPath);
    return { status: 'recovered' };
  } catch {
    return { status: 'blocked', reason: 're-encryption transaction could not be committed' };
  }
};

/**
 * Re-encrypts authenticated local persistence from the configured previous key
 * into the current key. Logical event history is preserved, but ciphertext is
 * rewritten through sibling temporary files and renamed only after both inputs
 * have been fully validated. Partial/corrupt evidence is never rewritten.
 */
export const reencryptPersistence = (
  storePath: string,
  logPath: string,
  enabled: boolean,
  currentEncryptionSecret?: string,
  previousEncryptionSecret?: string
): PersistenceReencryptionResult => {
  if (!enabled || !currentEncryptionSecret || !previousEncryptionSecret) {
    return {
      rewritten: false,
      snapshotRecords: 0,
      eventRecords: 0,
      snapshotKeySource: 'none',
      eventLogKeySource: 'none',
    };
  }

  const snapshotResult = loadSnapshot<AnySnapshot>(
    storePath,
    enabled,
    currentEncryptionSecret,
    previousEncryptionSecret
  );
  const eventLogResult = readEventLog<unknown>(
    logPath,
    enabled,
    currentEncryptionSecret,
    previousEncryptionSecret
  );

  if (snapshotResult.source === 'corrupt' || eventLogResult.source === 'partial') {
    throw new Error('persistence re-encryption requires complete authenticated local evidence');
  }

  const shouldRewrite =
    snapshotResult.keySource === 'previous' ||
    snapshotResult.keySource === 'mixed' ||
    eventLogResult.keySource === 'previous' ||
    eventLogResult.keySource === 'mixed';
  if (!shouldRewrite) {
    return {
      rewritten: false,
      snapshotRecords: 0,
      eventRecords: 0,
      snapshotKeySource: snapshotResult.keySource,
      eventLogKeySource: eventLogResult.keySource,
    };
  }

  const snapshotTemporaryPath = `${storePath}.${randomUUID()}.reencrypt.tmp`;
  const logTemporaryPath = `${logPath}.${randomUUID()}.reencrypt.tmp`;
  const journalPath = reencryptionJournalPath(storePath);
  const journal: ReencryptionJournal = {
    version: 1,
    storePath,
    logPath,
    snapshotTemporaryPath,
    logTemporaryPath,
    phase: 'staged',
  };
  mkdirSync(dirname(storePath), { recursive: true });
  mkdirSync(dirname(logPath), { recursive: true });
  writeFileSync(
    snapshotTemporaryPath,
    encryptText(JSON.stringify(snapshotResult.snapshot, null, 2), currentEncryptionSecret)
  );
  writeFileSync(
    logTemporaryPath,
    eventLogResult.entries
      .map((entry) => encryptText(JSON.stringify(entry), currentEncryptionSecret))
      .join('\n') + (eventLogResult.entries.length > 0 ? '\n' : '')
  );
  writeFileSync(journalPath, JSON.stringify(journal), { mode: 0o600 });
  renameSync(snapshotTemporaryPath, storePath);
  writeFileSync(journalPath, JSON.stringify({ ...journal, phase: 'snapshot-committed' }), {
    mode: 0o600,
  });
  renameSync(logTemporaryPath, logPath);
  unlinkSync(journalPath);

  return {
    rewritten: true,
    snapshotRecords: Object.values(snapshotResult.snapshot).reduce(
      (total, collection) => total + collection.length,
      0
    ),
    eventRecords: eventLogResult.entries.length,
    snapshotKeySource: snapshotResult.keySource,
    eventLogKeySource: eventLogResult.keySource,
  };
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

/**
 * Partial durable-log recovery is usable for inspection but not ready for
 * production claims because one or more historical entries were skipped.
 */
export const eventLogReady = (enabled: boolean, source: EventLogSource): boolean =>
  !enabled || source !== 'partial';

export interface EventLogRead<T> {
  entries: T[];
  source: EventLogSource;
  /** Lines that could not be parsed. Reported, never silently dropped. */
  skipped: number;
  reason?: string;
  keySource: EncryptionKeySource;
}

/**
 * Append one entry as a single JSON line.
 *
 * Uses O_APPEND so concurrent writers interleave whole lines rather than
 * corrupting each other, and never rewrites existing content. Encryption is
 * applied per line so the append-only boundary remains observable.
 */
export const appendEvent = (
  logPath: string,
  entry: unknown,
  enabled: boolean,
  encryptionSecret?: string
): AppendOutcome => {
  if (!enabled) return { appended: false };

  try {
    mkdirSync(dirname(logPath), { recursive: true });
    const plaintext = JSON.stringify(entry);
    appendFileSync(logPath, `${encryptText(plaintext, encryptionSecret)}\n`);
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
 * A malformed or unauthenticated line does not discard the rest of the
 * history; it is counted and the source becomes 'partial' so the caller knows
 * the read was lossy.
 */
export const readEventLog = <T>(
  logPath: string,
  enabled: boolean,
  encryptionSecret?: string,
  previousEncryptionSecret?: string
): EventLogRead<T> => {
  if (!enabled) {
    return { entries: [], source: 'disabled', skipped: 0, keySource: 'none' };
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
      keySource: 'none',
    };
  }

  const entries: T[] = [];
  const keySources = new Set<EncryptionKeySource>();
  let skipped = 0;

  for (const line of raw.split('\n')) {
    if (line.trim() === '') continue;
    try {
      const decrypted = decryptText(
        line.trim(),
        previousEncryptionSecret
          ? { current: encryptionSecret, previous: previousEncryptionSecret }
          : encryptionSecret
      );
      keySources.add(decrypted.keySource);
      entries.push(JSON.parse(decrypted.plaintext) as T);
    } catch {
      skipped += 1;
    }
  }

  return {
    entries,
    source: skipped > 0 ? 'partial' : 'restored',
    skipped,
    reason: skipped > 0 ? `${skipped} line(s) could not be parsed` : undefined,
    keySource: combineKeySources(keySources),
  };
};

export const ENCRYPTION_FORMAT = ENCRYPTED_PREFIX;
export const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
export const encryptionEnabled = (secret?: string): boolean => Boolean(deriveEncryptionKey(secret));
export const encryptionKeyLength = AES_KEY_BYTES;
export const encryptionFormat = ENCRYPTED_PREFIX;
