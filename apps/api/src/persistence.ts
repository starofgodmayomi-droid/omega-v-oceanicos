import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
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

const ENCRYPTED_PREFIX = 'omega-v1';
const AES_KEY_BYTES = 32;
const AES_IV_BYTES = 12;
const AES_TAG_BYTES = 16;

type EncryptionKey = Buffer;
export type EncryptionKeySource = 'none' | 'current' | 'previous' | 'mixed';
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
