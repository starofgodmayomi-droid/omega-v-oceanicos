import { appendFileSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { EventLogEntry } from '@omega-v/types';

/**
 * How a load went. A store that was never written and a store that failed
 * to parse are different events and must not collapse into the same empty
 * result.
 */
export type StoreSource = 'missing' | 'partial' | 'restored';

/**
 * Pluggable persistence for the chain.
 *
 * Ported from the `packages/memory` candidate (PR #7/#10), whose
 * MemoryStore abstraction was the better idea in that pair. Its streaming
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
 */
export class FileMemoryStore implements MemoryStore {
  private lastSource: StoreSource = 'missing';
  private lastSkipped = 0;

  constructor(private readonly path: string) {}

  public load(): EventLogEntry[] {
    let raw: string;
    try {
      raw = readFileSync(this.path, 'utf8');
    } catch {
      this.lastSource = 'missing';
      this.lastSkipped = 0;
      return [];
    }

    const entries: EventLogEntry[] = [];
    let skipped = 0;

    for (const line of raw.split('\n')) {
      if (line.trim() === '') continue;
      try {
        entries.push(JSON.parse(line) as EventLogEntry);
      } catch {
        skipped += 1;
      }
    }

    this.lastSkipped = skipped;
    this.lastSource = skipped > 0 ? 'partial' : 'restored';
    return entries;
  }

  public append(entry: EventLogEntry): void {
    mkdirSync(dirname(this.path), { recursive: true });
    appendFileSync(this.path, `${JSON.stringify(entry)}\n`);
  }

  /** Outcome of the most recent load. */
  public source(): StoreSource {
    return this.lastSource;
  }

  /** Lines the most recent load could not parse. Counted, never hidden. */
  public skipped(): number {
    return this.lastSkipped;
  }
}
