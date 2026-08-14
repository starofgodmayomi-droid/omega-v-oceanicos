import { createHash } from 'node:crypto';
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
 * Memory: append-only, hash-chained provenance store
 *
 * Step 4 of the mini kernel (OBSERVER + VERIFIER + EVIDENCE + MEMORY).
 * Nothing is deleted; every entry is linked to its predecessor so
 * tampering with history is detectable by re-hashing the chain.
 */
export class Memory {
  private entries: EventLogEntry[] = [];

  /**
   * Create a new memory log.
   * Accepts prior entries so a persisted log can be rehydrated;
   * the chain is verified before the entries are trusted.
   */
  constructor(existingEntries: EventLogEntry[] = []) {
    if (existingEntries.length > 0 && !Memory.verifyChain(existingEntries)) {
      throw new Error('Refusing to load memory: hash chain integrity check failed');
    }
    this.entries = [...existingEntries];
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
