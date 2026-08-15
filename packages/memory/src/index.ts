import { createHash } from 'node:crypto';
import {
  appendFileSync,
  createReadStream,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import { dirname } from 'node:path';
import { createInterface } from 'node:readline';
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
 * MemoryStore: pluggable persistence contract for the provenance chain.
 *
 * Any backend (JSON-lines file, SQLite, object storage, in-memory) can
 * satisfy this interface and be handed to `Memory`. The chain stays
 * append-only and hash-chained regardless of the backend.
 */
export interface MemoryStore {
  /**
   * Load every recorded entry, oldest first.
   * Returns an empty list when nothing has been persisted yet.
   */
  load(): EventLogEntry[];

  /**
   * Stream entries oldest first without holding the whole chain in memory.
   * Backends that cannot stream may fall back to `load()`.
   */
  stream(): AsyncIterable<EventLogEntry>;

  /**
   * Append a single entry durably.
   */
  append(entry: EventLogEntry): void;

  /**
   * Replace the entire persisted chain (used for compaction / migration).
   */
  save(entries: EventLogEntry[]): void;
}

/**
 * Parse one JSON-lines payload into entries, surfacing the line number
 * of any corruption instead of failing with an opaque error.
 */
const parseJsonLines = (raw: string, source: string): EventLogEntry[] =>
  raw
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line, index) => {
      try {
        return JSON.parse(line) as EventLogEntry;
      } catch (error) {
        throw new Error(
          `Refusing to load memory from ${source}: ` +
            `line ${index + 1} is not valid JSON ` +
            `(${error instanceof Error ? error.message : String(error)})`
        );
      }
    });

/**
 * FileMemoryStore: durable JSON-lines persistence for the provenance chain.
 *
 * Each line of the backing file is one JSON-serialized EventLogEntry.
 * Appends are O(1) (single line) while full rewrites stay atomic
 * (temp file + rename) so a crash mid-rewrite can never leave a
 * truncated chain on disk.
 */
export class FileMemoryStore implements MemoryStore {
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

    return parseJsonLines(raw, this.filePath);
  }

  /**
   * Stream entries oldest first, one JSON-lines row at a time.
   * Never materializes the full chain, so arbitrarily large logs
   * can be replayed or audited within a constant memory footprint.
   */
  public async *stream(): AsyncIterable<EventLogEntry> {
    let reader: ReturnType<typeof createInterface>;
    try {
      reader = createInterface({
        input: createReadStream(this.filePath, { encoding: 'utf8' }),
        crlfDelay: Infinity,
      });
    } catch {
      return;
    }

    let lineNumber = 0;
    for await (const line of reader) {
      if (line.trim().length === 0) continue;
      lineNumber += 1;
      try {
        yield JSON.parse(line) as EventLogEntry;
      } catch (error) {
        throw new Error(
          `Refusing to stream memory from ${this.filePath}: ` +
            `line ${lineNumber} is not valid JSON ` +
            `(${error instanceof Error ? error.message : String(error)})`
        );
      }
    }
  }

  /**
   * Append a single entry as one JSON-lines row.
   */
  public append(entry: EventLogEntry): void {
    mkdirSync(dirname(this.filePath), { recursive: true });
    appendFileSync(this.filePath, `${JSON.stringify(entry)}\n`);
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

  /**
   * A pluggable persistence backend satisfying the MemoryStore contract.
   * Takes precedence over `persistPath` when both are provided.
   */
  store?: MemoryStore;
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
  private readonly store?: MemoryStore;

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

    if (options.store) {
      this.store = options.store;
    } else if (options.persistPath) {
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
    this.store?.append(entry);
    return entry;
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
   * Stream entries oldest first, verifying the hash chain incrementally
   * as each entry is yielded. When the chain is persisted, reads come
   * straight from the store so arbitrarily large histories can be
   * replayed without being held in memory; otherwise the in-process
   * chain is streamed. Streaming stops at the first integrity violation.
   */
  public async *stream(): AsyncIterable<EventLogEntry> {
    let expectedPrevious = GENESIS_HASH;
    let expectedId = 1;

    const source: AsyncIterable<EventLogEntry> = this.store
      ? this.store.stream()
      : (async function* (entries: EventLogEntry[]) {
          for (const entry of entries) yield { ...entry };
        })(this.entries);

    for await (const entry of source) {
      if (entry.id !== expectedId) {
        throw new Error(
          `Streaming halted at entry ${entry.id}: expected sequential id ${expectedId}`
        );
      }
      if (entry.previousHash !== expectedPrevious) {
        throw new Error(`Streaming halted at entry ${entry.id}: hash chain link is broken`);
      }
      if (entry.hash !== Memory.hashEntry(entry)) {
        throw new Error(`Streaming halted at entry ${entry.id}: entry hash does not match`);
      }
      expectedPrevious = entry.hash;
      expectedId += 1;
      yield { ...entry };
    }
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
