import { appendFileSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { createHmac, createHash, timingSafeEqual } from 'node:crypto';
import type { OmegaChangeRecord } from '@oceanicos/types';
import type { RealityVerification } from './reality.js';
import type { TransitionMemory } from './transition.js';

export type RealityAttestationStatus = 'VERIFIED' | 'DIVERGENT' | 'UNKNOWN' | 'NOT_EXECUTED';

export interface RealityAttestation {
  readonly id: string;
  readonly changeId: string;
  readonly executionAttestationId?: string;
  readonly status: RealityAttestationStatus;
  readonly expectedState?: string;
  readonly observedState?: string;
  readonly evidence: string;
  readonly observedAt: string;
  readonly attestedAt: string;
  readonly signerId: string;
  readonly keyVersion: string;
  readonly signingAlgorithm: 'HMAC-SHA256';
  readonly signature: string;
  readonly provenanceLineage: readonly string[];
}

export interface CausalMemoryEntry {
  readonly kind: 'OMEGA_CAUSAL';
  readonly sequence: number;
  readonly record: OmegaChangeRecord;
  readonly reality: RealityVerification;
  readonly attestation: RealityAttestation;
  readonly previousHash: string;
  readonly hash: string;
}

export interface CausalMemory {
  append(record: OmegaChangeRecord): void;
  appendCausal(record: OmegaChangeRecord, reality: RealityVerification, attestation: RealityAttestation): void;
}

const GENESIS = 'omega-causal-memory-genesis-v1';

const canonicalAttestation = (attestation: Omit<RealityAttestation, 'signature'>): string =>
  JSON.stringify({
    id: attestation.id,
    changeId: attestation.changeId,
    executionAttestationId: attestation.executionAttestationId ?? null,
    status: attestation.status,
    expectedState: attestation.expectedState ?? null,
    observedState: attestation.observedState ?? null,
    evidence: attestation.evidence,
    observedAt: attestation.observedAt,
    attestedAt: attestation.attestedAt,
    signerId: attestation.signerId,
    keyVersion: attestation.keyVersion,
    signingAlgorithm: attestation.signingAlgorithm,
    provenanceLineage: attestation.provenanceLineage,
  });

export function createRealityAttestation(
  record: OmegaChangeRecord,
  reality: RealityVerification,
  options: { key: string; signerId?: string; keyVersion?: string; attestedAt?: string },
): RealityAttestation {
  if (!options.key.trim()) throw new Error('reality attestation signing key is required');
  const attestedAt = options.attestedAt ?? new Date().toISOString();
  const signerId = options.signerId?.trim() || 'mini-reality-attestor';
  const keyVersion = options.keyVersion?.trim() || '1';
  const base = {
    id: '',
    changeId: record.id,
    executionAttestationId: record.attestationId,
    status: reality.status,
    expectedState: reality.expectedState,
    observedState: reality.observedState,
    evidence: reality.evidence,
    observedAt: reality.record.createdAt,
    attestedAt,
    signerId,
    keyVersion,
    signingAlgorithm: 'HMAC-SHA256' as const,
    provenanceLineage: [...(reality.record.provenance.lineage ?? [])],
  };
  const id = `reality-attestation-${createHash('sha256').update(canonicalAttestation(base)).digest('hex').slice(0, 32)}`;
  const unsigned = { ...base, id };
  const signature = `0x${createHmac('sha256', options.key).update(canonicalAttestation(unsigned)).digest('hex')}`;
  return { ...unsigned, signature };
}

export function verifyRealityAttestation(attestation: RealityAttestation, key: string): boolean {
  if (!key.trim() || !attestation.id || !attestation.changeId || attestation.signingAlgorithm !== 'HMAC-SHA256') return false;
  const { signature, ...unsigned } = attestation;
  const expected = Buffer.from(`0x${createHmac('sha256', key).update(canonicalAttestation(unsigned)).digest('hex')}`, 'utf8');
  const actual = Buffer.from(signature, 'utf8');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

const hashEntry = (entry: Omit<CausalMemoryEntry, 'hash'>): string =>
  createHash('sha256').update(JSON.stringify(entry)).digest('hex');

export class FileCausalMemory implements CausalMemory {
  private readonly entries: CausalMemoryEntry[];
  private readonly signingKey: string;
  private readonly signerId: string;
  private readonly keyVersion: string;
  private integrity = true;

  constructor(private readonly path: string, options: { key: string; signerId?: string; keyVersion?: string }) {
    if (!options.key.trim()) throw new Error('causal memory signing key is required');
    this.signingKey = options.key;
    this.signerId = options.signerId?.trim() || 'mini-reality-attestor';
    this.keyVersion = options.keyVersion?.trim() || '1';
    this.entries = this.load();
  }

  public append(record: OmegaChangeRecord): void {
    throw new Error('causal memory requires a C6 reality result; NOT_EXECUTED is not attestable');
  }

  public appendCausal(record: OmegaChangeRecord, reality: RealityVerification, attestation: RealityAttestation): void {
    if (attestation.changeId !== record.id || attestation.status !== reality.status || !verifyRealityAttestation(attestation, this.signingKey)) {
      throw new Error('causal memory rejected an unverifiable or mismatched reality attestation');
    }
    this.appendRaw(record, reality, attestation);
  }

  public all(): readonly CausalMemoryEntry[] { return [...this.entries]; }
  public reload(): readonly CausalMemoryEntry[] { return this.load(); }
  public verifyIntegrity(): boolean { return this.integrity; }
  public replay(changeId: string): CausalMemoryEntry | undefined {
    const entry = this.entries.find((candidate) => candidate.record.id === changeId);
    if (!entry || !verifyRealityAttestation(entry.attestation, this.signingKey)) return undefined;
    return entry;
  }

  private appendRaw(record: OmegaChangeRecord, reality: RealityVerification, attestation: RealityAttestation): void {
    if (!this.integrity) throw new Error('causal memory integrity is degraded');
    const previousHash = this.entries.at(-1)?.hash ?? GENESIS;
    const unsigned = { kind: 'OMEGA_CAUSAL' as const, sequence: this.entries.length + 1, record, reality, attestation, previousHash };
    const entry = { ...unsigned, hash: hashEntry(unsigned) };
    mkdirSync(dirname(this.path), { recursive: true });
    appendFileSync(this.path, `${JSON.stringify(entry)}\n`);
    this.entries.push(entry);
  }

  private load(): CausalMemoryEntry[] {
    let raw: string;
    try { raw = readFileSync(this.path, 'utf8'); } catch { this.integrity = true; return []; }
    const loaded: CausalMemoryEntry[] = [];
    let previousHash = GENESIS;
    try {
      for (const line of raw.split('\n')) {
        if (!line.trim()) continue;
        const parsed = JSON.parse(line) as CausalMemoryEntry;
        const { hash, ...unsigned } = parsed;
        if (parsed.kind !== 'OMEGA_CAUSAL' || parsed.sequence !== loaded.length + 1 || parsed.previousHash !== previousHash || hashEntry(unsigned) !== hash || !verifyRealityAttestation(parsed.attestation, this.signingKey) || parsed.attestation.changeId !== parsed.record.id) throw new Error('causal memory integrity check failed');
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
