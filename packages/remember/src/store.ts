import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { appendFileSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { EventLogEntry } from '@omega-v/types';

/** Environment variable used to encrypt the kernel memory JSONL file. */
export const MEMORY_KEY_ENV = 'OMEGA_MEMORY_KEY';
const ENCRYPTED_PREFIX = 'omega-memory-v1';
const AES_ALGORITHM = 'aes-256-gcm';

const deriveKey = (secret: string): Buffer => createHash('sha256').update(secret).digest();

const encryptLine = (plaintext: string, secret?: string): string => {
  if (!secret) return plaintext;
  const iv = randomBytes(12);
  const cipher = createCipheriv(AES_ALGORITHM, deriveKey(secret), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    ENCRYPTED_PREFIX,
    iv.toString('base64url'),
    tag.toString('base64url'),
    ciphertext.toString('base64url'),
  ].join(':');
};

const decryptLine = (stored: string, secret?: string): string => {
  if (!stored.startsWith(`${ENCRYPTED_PREFIX}:`)) return stored;
  if (!secret) throw new Error('encrypted kernel memory requires OMEGA_MEMORY_KEY');
  const [, ivEncoded, tagEncoded, ciphertextEncoded] = stored.split(':');
  if (!ivEncoded || !tagEncoded || !ciphertextEncoded)
    throw new Error('encrypted kernel memory envelope is incomplete');
  const decipher = createDecipheriv(
    AES_ALGORITHM,
    deriveKey(secret),
    Buffer.from(ivEncoded, 'base64url')
  );
  decipher.setAuthTag(Buffer.from(tagEncoded, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextEncoded, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
};

/**
 * How a load went. A store that was never written and a store that failed
 * to parse or authenticate is different from a complete restore.
 */
export type StoreSource = 'missing' | 'partial' | 'restored';
export type EncryptionKeySource = 'none' | 'current' | 'previous';

/**
 * Pluggable persistence for the chain.
 *
 * Ported from the `packages/memory` candidate (PR #7/#10), whose streaming
 * loader threw ENOENT on a chain that had never been written; this one
 * reports `missing` instead.
 */
export interface MemoryStore {
  /** Every persisted entry, oldest first. Never throws on a cold start. */
  load(): EventLogEntry[];

  /** Append one entry durably. Never rewrites earlier content. */
  append(entry: EventLogEntry): void;
}

/**
 * JSON Lines file store: one entry per line, opened O_APPEND.
 *
 * When `OMEGA_MEMORY_KEY` (or the explicit constructor secret) is present,
 * each line is authenticated with AES-256-GCM. Legacy plaintext lines remain
 * readable so operators can migrate without silently destroying the chain;
 * new writes use the configured encrypted format.
 */
export class FileMemoryStore implements MemoryStore {
  private lastSource: StoreSource = 'missing';
  private lastSkipped = 0;
  private lastEncryptionKeySource: EncryptionKeySource = 'none';
  private readonly encryptionSecret?: string;
  private readonly previousEncryptionSecret?: string;

  constructor(
    private readonly path: string,
    encryptionSecret = process.env[MEMORY_KEY_ENV],
    previousEncryptionSecret = process.env.OMEGA_MEMORY_KEY_PREVIOUS
  ) {
    this.encryptionSecret = encryptionSecret?.trim() || undefined;
    this.previousEncryptionSecret = previousEncryptionSecret?.trim() || undefined;
  }

  public load(): EventLogEntry[] {
    let raw: string;
    try {
      raw = readFileSync(this.path, 'utf8');
    } catch {
      this.lastSource = 'missing';
      this.lastSkipped = 0;
      this.lastEncryptionKeySource = 'none';
      return [];
    }

    const entries: EventLogEntry[] = [];
    let skipped = 0;
    let usedPreviousKey = false;
    let usedCurrentKey = false;

    for (const line of raw.split('\n')) {
      if (line.trim() === '') continue;
      try {
        const stored = line.trim();
        let plaintext: string;
        try {
          plaintext = decryptLine(stored, this.encryptionSecret);
          if (stored.startsWith(`${ENCRYPTED_PREFIX}:`)) usedCurrentKey = true;
        } catch {
          plaintext = decryptLine(stored, this.previousEncryptionSecret);
          if (stored.startsWith(`${ENCRYPTED_PREFIX}:`)) usedPreviousKey = true;
        }
        entries.push(JSON.parse(plaintext) as EventLogEntry);
      } catch {
        skipped += 1;
      }
    }

    this.lastSkipped = skipped;
    this.lastSource = skipped > 0 ? 'partial' : 'restored';
    this.lastEncryptionKeySource = usedPreviousKey
      ? 'previous'
      : usedCurrentKey
        ? 'current'
        : 'none';
    return entries;
  }

  public append(entry: EventLogEntry): void {
    if (!this.encryptionSecret && this.previousEncryptionSecret) {
      throw new Error(`${MEMORY_KEY_ENV} is required when OMEGA_MEMORY_KEY_PREVIOUS is configured`);
    }
    mkdirSync(dirname(this.path), { recursive: true });
    const plaintext = JSON.stringify(entry);
    appendFileSync(this.path, `${encryptLine(plaintext, this.encryptionSecret)}\n`);
  }

  /** Whether new memory entries are written using authenticated encryption. */
  public encryptionEnabled(): boolean {
    return Boolean(this.encryptionSecret);
  }

  /** Which key successfully authenticated the most recent encrypted load. */
  public encryptionKeySource(): EncryptionKeySource {
    return this.lastEncryptionKeySource;
  }

  /** Outcome of the most recent load. */
  public source(): StoreSource {
    return this.lastSource;
  }

  /** Lines the most recent load could not parse or authenticate. */
  public skipped(): number {
    return this.lastSkipped;
  }
}
