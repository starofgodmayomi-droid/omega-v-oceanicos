import { createHash } from 'node:crypto';
import { appendFileSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { ConnectorObservationResult, ConnectorRealityStatus } from './connector-observation.js';

export const CONNECTOR_OBSERVATION_GENESIS = 'omega-connector-observation-genesis-v1';
const MAX_JOURNAL_ENTRIES = 5000;
const STATUSES: readonly ConnectorRealityStatus[] = ['VERIFIED', 'DIVERGENT', 'UNKNOWN', 'NOT_EXECUTED'];

export interface ConnectorObservationJournalEntry {
  readonly kind: 'OMEGA_CONNECTOR_OBSERVATION';
  readonly connectorId: string;
  readonly system: string;
  readonly observation: ConnectorObservationResult;
  readonly sequence: number;
  readonly previousHash: string;
  readonly hash: string;
  readonly limitation: 'local-hash-chain-is-not-deployment-health-or-live-github';
}

export interface ConnectorObservationStore {
  append(connectorId: string, system: string, observation: ConnectorObservationResult): ConnectorObservationJournalEntry;
  all(): readonly ConnectorObservationJournalEntry[];
  verifyIntegrity(): boolean;
}

const hashEntry = (entry: Omit<ConnectorObservationJournalEntry, 'hash'>): string =>
  createHash('sha256').update(JSON.stringify(entry)).digest('hex');

/**
 * Local append-only JSONL journal for admitted-connector observations.
 * This is provenance, not the MINI silicon-yield ledger and not live GitHub.
 */
export class FileConnectorObservationStore implements ConnectorObservationStore {
  private entries: ConnectorObservationJournalEntry[];
  private integrity = true;
  private readonly persist: boolean;

  constructor(private readonly path: string) {
    this.persist = path !== ':memory:';
    this.entries = this.persist ? this.load() : [];
  }

  append(
    connectorId: string,
    system: string,
    observation: ConnectorObservationResult,
  ): ConnectorObservationJournalEntry {
    if (!this.integrity) throw new Error('connector observation journal integrity is degraded');
    if (!connectorId.trim() || !system.trim()) {
      throw new Error('connector observation journal requires connectorId and system');
    }
    if (!STATUSES.includes(observation.status)) {
      throw new Error('connector observation journal rejects unknown status values');
    }
    if (this.entries.length >= MAX_JOURNAL_ENTRIES) {
      throw new Error('connector observation journal capacity exhausted');
    }

    const previousHash = this.entries.at(-1)?.hash ?? CONNECTOR_OBSERVATION_GENESIS;
    const unsigned: Omit<ConnectorObservationJournalEntry, 'hash'> = {
      kind: 'OMEGA_CONNECTOR_OBSERVATION',
      connectorId: connectorId.trim(),
      system: system.trim(),
      observation,
      sequence: this.entries.length + 1,
      previousHash,
      limitation: 'local-hash-chain-is-not-deployment-health-or-live-github',
    };
    const entry: ConnectorObservationJournalEntry = { ...unsigned, hash: hashEntry(unsigned) };
    if (this.persist) {
      mkdirSync(dirname(this.path), { recursive: true, mode: 0o700 });
      appendFileSync(this.path, `${JSON.stringify(entry)}\n`, { encoding: 'utf8', flag: 'a', mode: 0o600 });
    }
    this.entries.push(entry);
    return entry;
  }

  all(): readonly ConnectorObservationJournalEntry[] {
    return [...this.entries];
  }

  verifyIntegrity(): boolean {
    return this.integrity;
  }

  private load(): ConnectorObservationJournalEntry[] {
    let raw: string;
    try {
      raw = readFileSync(this.path, 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      this.integrity = false;
      return [];
    }

    const loaded: ConnectorObservationJournalEntry[] = [];
    let previousHash = CONNECTOR_OBSERVATION_GENESIS;
    try {
      for (const line of raw.split('\n')) {
        if (!line.trim()) continue;
        const parsed = JSON.parse(line) as ConnectorObservationJournalEntry;
        const { hash, ...unsigned } = parsed;
        if (
          parsed.kind !== 'OMEGA_CONNECTOR_OBSERVATION' ||
          parsed.sequence !== loaded.length + 1 ||
          parsed.previousHash !== previousHash ||
          typeof parsed.connectorId !== 'string' ||
          typeof parsed.system !== 'string' ||
          !STATUSES.includes(parsed.observation?.status) ||
          parsed.limitation !== 'local-hash-chain-is-not-deployment-health-or-live-github' ||
          hashEntry(unsigned) !== hash
        ) {
          throw new Error('connector observation journal integrity check failed');
        }
        loaded.push(parsed);
        previousHash = parsed.hash;
      }
      this.integrity = true;
      return loaded;
    } catch {
      this.integrity = false;
      return loaded;
    }
  }
}
