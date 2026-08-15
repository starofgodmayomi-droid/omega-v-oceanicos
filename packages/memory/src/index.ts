import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { EventLogEntry } from '@omega-v/types';

/**
 * The data payloads that can be recorded in memory.
 * Every entry is one step of the verification loop.
 */
export type EventPayload = EventLogEntry['data'];
export type EventType = EventLogEntry['type'];

/** Hash of the genesis state before any entry is recorded */
export const GENESIS_HASH = '0'.repeat(64);

/**
 * FileMemoryStore: durable JSON-lines persistence for the provenance chain.
 *
 * Each line of the backing file is one JSON-serialized EventLogEntry.
 * Writes are atomic (temp file + rename) so a crash mid-write can never
 * leave a truncated chain on disk.
 */
export class FileMemoryStore {
  constructor(private readonly filePath: string) {}

  /**
   * The path this store persists to.
   */
  public get path(): string {
    return this.filePath;
  }

  /**
   * Load every recorded entry from disk.
   * Returns an empty list when no chain has been persisted yet.
   * Throws when the file exists but cannot be parsed — a corrupted
   * provenance log must surface loudly instead of being silently dropped.
   */
  public load(): EventLogEntry[] {
    let raw: string;
    try {
      raw = readFileSync(this.filePath, 'utf8');
    } catch {
      return [];
    }

    return raw
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .map((line, index) => {
        try {
          return JSON.parse(line) as EventLogEntry;
        } catch (error) {
          throw new Error(
            `Refusing to load memory from ${this.filePath}: ` +
              `line ${index + 1} is not valid JSON ` +
              `(${error instanceof Error ? error.message : String(error)})`
          );
        }
      });
  }

  /**
   * Persist the full chain atomically.
   */
  public save(entries: EventLogEntry[]): void {
    mkdirSync(dirname(this.filePath), { recursive: true });
    const temporaryPath = `${this.filePath}.tmp`;
    const lines = entries.map((entry) => JSON.stringify(entry)).join('\n');
    writeFileSync(temporaryPath, lines.length > 0 ? `${lines}\n` : '');
    renameSync(temporaryPath, this.filePath);
  }
}

/**
 * Options accepted by the Memory constructor.
 */
export interface MemoryOptions {
  /**
   * Previously recorded entries to rehydrate from (default: `[]`).
   * The chain is verified before the entries are trusted.
   */
  existingEntries?: EventLogEntry[];

  /**
   * Path of a JSON-lines file the chain is persisted to after every record.
   * On startup the file is loaded and integrity-checked before use.
   * When omitted, memory stays process-local (the zero-state default).
   */
  persistPath?: string;
}

/**
 * Memory: append-only, hash-chained provenance store
 *
 * Step 4 of the mini kernel (OBSERVER + VERIFIER + EVIDENCE + MEMORY).
 * Nothing is deleted; every entry is linked to its predecessor so
 * tampering with history is detectable by re-hashing the chain.
 */
export class Memory {
  private entries: EventLogEntry[] = [];
  private readonly store?: FileMemoryStore;

  /**
   * Create a new memory log.
   * Accepts prior entries so a persisted log can be rehydrated;
   * the chain is verified before the entries are trusted.
   */
  constructor(existingEntries?: EventLogEntry[]);
  constructor(options?: MemoryOptions);
  constructor(existingEntriesOrOptions: EventLogEntry[] | MemoryOptions = []) {
    const options: MemoryOptions = Array.isArray(existingEntriesOrOptions)
      ? { existingEntries: existingEntriesOrOptions }
      : existingEntriesOrOptions;

    if (options.persistPath) {
      this.store = new FileMemoryStore(options.persistPath);
    }

    const initialEntries =
      options.existingEntries !== undefined ? options.existingEntries : (this.store?.load() ?? []);
    if (initialEntries.length > 0 && !Memory.verifyChain(initialEntries)) {
      throw new Error('Refusing to load memory: hash chain integrity check failed');
    }
    this.entries = [...initialEntries];
  }

  /**
   * Record an event. The log is append-only: entries can never
   * be modified or removed once recorded.
   */
  public record(type: EventType, data: EventPayload): EventLogEntry {
    const previousHash =
      this.entries.length === 0 ? GENESIS_HASH : this.entries[this.entries.length - 1].hash;

    const entry: EventLogEntry = {
      id: this.entries.length + 1,
      type,
      data,
      recordedAt: new Date().toISOString(),
      previousHash,
      hash: '',
    };
    entry.hash = Memory.hashEntry(entry);

    this.entries.push(entry);
    this.store?.save(this.entries);
    return { ...entry };
  }

  /**
   * Recompute every hash and confirm each entry links to its predecessor.
   * Returns true only if the entire chain is intact.
   */
  public verifyIntegrity(): boolean {
    return Memory.verifyChain(this.entries);
  }

  /**
   * Read entries, optionally filtered by event type.
   * Entries are returned in insertion order (oldest first).
   */
  public query(type?: EventType): EventLogEntry[] {
    const matches = type ? this.entries.filter((entry) => entry.type === type) : this.entries;
    return matches.map((entry) => ({ ...entry }));
  }

  /**
   * The most recently recorded entry, or undefined when empty.
   */
  public latest(): EventLogEntry | undefined {
    const latest = this.entries[this.entries.length - 1];
    return latest ? { ...latest } : undefined;
  }

  /**
   * Number of recorded entries.
   */
  public size(): number {
    return this.entries.length;
  }

  /**
   * Export the full chain as copies, oldest first.
   * Suitable for handing to a persistence adapter or another Memory.
   */
  public export(): EventLogEntry[] {
    return this.entries.map((entry) => ({ ...entry }));
  }

  /**
   * Verify the integrity of any entry chain, e.g. one loaded from disk.
   */
  public static verifyChain(entries: EventLogEntry[]): boolean {
    let expectedPrevious = GENESIS_HASH;

    for (let index = 0; index < entries.length; index++) {
      const entry = entries[index];
      if (entry.id !== index + 1) {
        return false;
      }
      if (entry.previousHash !== expectedPrevious) {
        return false;
      }
      if (entry.hash !== Memory.hashEntry(entry)) {
        return false;
      }
      expectedPrevious = entry.hash;
    }

    return true;
  }

  /**
   * Compute the integrity hash for an entry.
   * The hash covers the id, type, data, timestamp, and previous hash,
   * which binds each entry to the full history before it.
   */
  public static hashEntry(entry: EventLogEntry): string {
    const payload = JSON.stringify({
      id: entry.id,
      type: entry.type,
      data: entry.data,
      recordedAt: entry.recordedAt,
      previousHash: entry.previousHash,
    });
    return createHash('sha256').update(payload).digest('hex');
  }
}

export default Memory;
