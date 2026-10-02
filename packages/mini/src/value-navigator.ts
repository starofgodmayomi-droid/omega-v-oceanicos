import { randomUUID, createHash } from 'node:crypto';
import { appendFileSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { OmegaChangeRecord } from '@oceanicos/types';

export type ValueNavigatorStatus = 'VERIFIED' | 'DIVERGENT' | 'UNKNOWN' | 'NOT_EXECUTED';
export type ValueNavigatorPhase = 'PROPOSAL' | 'OBSERVATION';

export interface ValuePotentialHypothesis {
  readonly kind: 'hypothesis';
  readonly score: number;
  readonly basis: string;
  readonly limitation: 'not evidence of demand, revenue, or earnings';
}

export interface ValueNavigatorEntry {
  readonly kind: 'OMEGA_VALUE_NAVIGATOR';
  readonly proposalId: string;
  readonly phase: ValueNavigatorPhase;
  readonly record: OmegaChangeRecord;
  readonly expectedOutcome: string;
  readonly reconciliationStatus: ValueNavigatorStatus;
  readonly verificationScope: 'hypothesis-reconciliation-only';
  readonly evidenceStatus: 'STATED' | 'NOT_PROVIDED';
  readonly observation?: {
    readonly observedOutcome?: string;
    readonly source?: string;
    readonly evidence?: string;
    readonly error?: string;
    readonly normalizedMatch?: boolean;
  };
  readonly valuePotentialHypothesis?: ValuePotentialHypothesis;
  readonly supersedesId?: string;
  readonly sequence: number;
  readonly previousHash: string;
  readonly hash: string;
}

export type ValueNavigatorDraft = Omit<ValueNavigatorEntry, 'sequence' | 'previousHash' | 'hash'>;

export interface ValueNavigatorStore {
  append(entry: ValueNavigatorDraft): ValueNavigatorEntry;
  all(): readonly ValueNavigatorEntry[];
  history(proposalId: string): readonly ValueNavigatorEntry[];
  verifyIntegrity(): boolean;
}

const GENESIS = 'omega-value-navigator-genesis-v1';
const MAX_TEXT_LENGTH = 2000;
const MAX_JOURNAL_ENTRIES = 5000;
const MAX_OBSERVATIONS_PER_PROPOSAL = 100;

const hashEntry = (entry: Omit<ValueNavigatorEntry, 'hash'>): string =>
  createHash('sha256').update(JSON.stringify(entry)).digest('hex');

function requiredText(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > MAX_TEXT_LENGTH) {
    throw new Error(`${field} must be a non-empty string of at most ${MAX_TEXT_LENGTH} characters`);
  }
  return value.trim();
}

function optionalText(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined;
  return requiredText(value, field);
}

function validateEvidence(value: unknown): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 20) throw new Error('evidence must contain at most 20 strings');
  return value.map((item, index) => requiredText(item, `evidence[${index}]`));
}

export interface ValueNavigatorProposalInput {
  readonly subject: string;
  readonly intent: string;
  readonly stateBefore: string;
  readonly expectedOutcome: string;
  readonly beneficiary?: string;
  readonly evidence?: readonly string[];
  readonly valuePotentialScore?: number;
  readonly valuePotentialBasis?: string;
  readonly attributedTo?: string;
}

/** Create a proposal record only. It never grants authority or performs work. */
export function createValueNavigatorProposal(
  input: ValueNavigatorProposalInput,
  now: () => string = () => new Date().toISOString(),
): ValueNavigatorDraft {
  const subject = requiredText(input.subject, 'subject');
  const intent = requiredText(input.intent, 'intent');
  const stateBefore = requiredText(input.stateBefore, 'stateBefore');
  const expectedOutcome = requiredText(input.expectedOutcome, 'expectedOutcome');
  const beneficiary = optionalText(input.beneficiary, 'beneficiary');
  const evidence = validateEvidence(input.evidence);
  const attributedTo = optionalText(input.attributedTo, 'attributedTo') ?? null;
  let valuePotentialHypothesis: ValuePotentialHypothesis | undefined;
  if (input.valuePotentialScore !== undefined) {
    if (!Number.isFinite(input.valuePotentialScore) || input.valuePotentialScore < 0 || input.valuePotentialScore > 100) {
      throw new Error('valuePotentialScore must be a finite number from 0 to 100');
    }
    valuePotentialHypothesis = {
      kind: 'hypothesis',
      score: input.valuePotentialScore,
      basis: optionalText(input.valuePotentialBasis, 'valuePotentialBasis') ?? 'caller-supplied prioritization estimate',
      limitation: 'not evidence of demand, revenue, or earnings',
    };
  } else if (input.valuePotentialBasis !== undefined) {
    throw new Error('valuePotentialBasis requires valuePotentialScore');
  }

  const createdAt = now();
  const id = `value-proposal-${randomUUID()}`;
  const record: OmegaChangeRecord = {
    id,
    subject,
    intent,
    stateBefore,
    evidence,
    authority: null,
    policy: 'value-navigator-read-only-proposal',
    context: {
      ...(beneficiary ? { beneficiary } : {}),
      expectedOutcome,
      ...(valuePotentialHypothesis ? { valuePotentialHypothesis } : {}),
    },
    decision: 'REVIEW',
    authorized: false,
    provenance: {
      source: 'value-navigator-proposal',
      observedAt: createdAt,
      attributedTo,
      lineage: [],
    },
    createdAt,
  };

  return {
    kind: 'OMEGA_VALUE_NAVIGATOR',
    proposalId: id,
    phase: 'PROPOSAL',
    record,
    expectedOutcome,
    reconciliationStatus: 'NOT_EXECUTED',
    verificationScope: 'hypothesis-reconciliation-only',
    evidenceStatus: evidence.length ? 'STATED' : 'NOT_PROVIDED',
    ...(valuePotentialHypothesis ? { valuePotentialHypothesis } : {}),
  };
}

export interface ValueNavigatorObservationInput {
  readonly observedOutcome?: string;
  readonly source?: string;
  readonly evidence?: string;
  readonly error?: string;
}

const normalizeOutcome = (value: string): string => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US');

/**
 * Append a read-only observation of a proposal. VERIFIED means only that the
 * supplied observation matches the stated hypothesis; it is not an earning,
 * execution, or independently authenticated external-world claim.
 */
export function observeValueNavigatorProposal(
  proposal: ValueNavigatorEntry,
  previousEntry: ValueNavigatorEntry,
  input: ValueNavigatorObservationInput,
  now: () => string = () => new Date().toISOString(),
): ValueNavigatorDraft {
  if (proposal.phase !== 'PROPOSAL' || proposal.proposalId !== proposal.record.id) {
    throw new Error('value navigator observation requires an original proposal record');
  }
  if (previousEntry.proposalId !== proposal.proposalId) throw new Error('previous record does not belong to the proposal');

  const observedOutcome = optionalText(input.observedOutcome, 'observedOutcome');
  const source = optionalText(input.source, 'source');
  const evidence = optionalText(input.evidence, 'evidence');
  const error = optionalText(input.error, 'error');
  const hasObservation = Boolean(observedOutcome && source && evidence && !error);
  const normalizedMatch = hasObservation
    ? normalizeOutcome(proposal.expectedOutcome) === normalizeOutcome(observedOutcome!)
    : undefined;
  const reconciliationStatus: ValueNavigatorStatus = !hasObservation
    ? 'UNKNOWN'
    : normalizedMatch ? 'VERIFIED' : 'DIVERGENT';
  const createdAt = now();
  const id = `value-observation-${randomUUID()}`;
  const record: OmegaChangeRecord = {
    id,
    subject: proposal.record.subject,
    intent: `Read-only observation of value hypothesis ${proposal.proposalId}`,
    stateBefore: `proposal:${proposal.proposalId}`,
    evidence: evidence ? [evidence] : [],
    authority: null,
    policy: 'value-navigator-read-only-observation',
    context: {
      expectedOutcome: proposal.expectedOutcome,
      ...(observedOutcome ? { observedOutcome } : {}),
      reconciliationStatus,
      verificationScope: 'hypothesis-reconciliation-only',
      ...(source ? { observationSource: source } : {}),
      ...(error ? { observationError: error } : {}),
    },
    decision: 'REVIEW',
    authorized: false,
    provenance: {
      source: 'value-navigator-observation',
      observedAt: createdAt,
      attributedTo: null,
      lineage: [...(previousEntry.record.provenance.lineage ?? []), proposal.record.id, previousEntry.record.id],
    },
    consequence: reconciliationStatus === 'UNKNOWN'
      ? 'observation unavailable or incomplete; outcome remains unknown'
      : `submitted observation ${reconciliationStatus === 'VERIFIED' ? 'matches' : 'diverges from'} the hypothesis`,
    createdAt,
  };

  return {
    kind: 'OMEGA_VALUE_NAVIGATOR',
    proposalId: proposal.proposalId,
    phase: 'OBSERVATION',
    record,
    expectedOutcome: proposal.expectedOutcome,
    reconciliationStatus,
    verificationScope: 'hypothesis-reconciliation-only',
    evidenceStatus: evidence ? 'STATED' : 'NOT_PROVIDED',
    observation: {
      ...(observedOutcome ? { observedOutcome } : {}),
      ...(source ? { source } : {}),
      ...(evidence ? { evidence } : {}),
      ...(error ? { error } : {}),
      ...(normalizedMatch !== undefined ? { normalizedMatch } : {}),
    },
    ...(proposal.valuePotentialHypothesis ? { valuePotentialHypothesis: proposal.valuePotentialHypothesis } : {}),
    supersedesId: previousEntry.record.id,
  };
}

/** Local append-only JSONL journal with a tamper-evident hash chain. */
export class FileValueNavigatorStore implements ValueNavigatorStore {
  private entries: ValueNavigatorEntry[];
  private integrity = true;

  constructor(private readonly path: string) {
    this.entries = this.load();
  }

  append(draft: ValueNavigatorDraft): ValueNavigatorEntry {
    if (!this.integrity) throw new Error('value navigator journal integrity is degraded');
    if (draft.record.authorized !== false || draft.record.decision !== 'REVIEW') {
      throw new Error('value navigator store rejects records with authority or non-review decisions');
    }
    if (this.entries.length >= MAX_JOURNAL_ENTRIES) throw new Error('value navigator journal capacity exhausted');
    const history = this.history(draft.proposalId);
    if (draft.phase === 'PROPOSAL') {
      if (draft.proposalId !== draft.record.id || draft.reconciliationStatus !== 'NOT_EXECUTED' || history.length) {
        throw new Error('value navigator proposal record invariant failed');
      }
    } else {
      const original = history.find((entry) => entry.phase === 'PROPOSAL');
      const previous = history.at(-1);
      if (
        !original || !previous || draft.record.id === previous.record.id ||
        draft.supersedesId !== previous.record.id || history.filter((entry) => entry.phase === 'OBSERVATION').length >= MAX_OBSERVATIONS_PER_PROPOSAL
      ) throw new Error('value navigator observation must append a bounded superseding record');
    }
    const previousHash = this.entries.at(-1)?.hash ?? GENESIS;
    const unsigned = { ...draft, sequence: this.entries.length + 1, previousHash };
    const entry: ValueNavigatorEntry = { ...unsigned, hash: hashEntry(unsigned) };
    mkdirSync(dirname(this.path), { recursive: true, mode: 0o700 });
    appendFileSync(this.path, `${JSON.stringify(entry)}\n`, { encoding: 'utf8', flag: 'a', mode: 0o600 });
    this.entries.push(entry);
    return entry;
  }

  all(): readonly ValueNavigatorEntry[] {
    return [...this.entries];
  }

  history(proposalId: string): readonly ValueNavigatorEntry[] {
    return this.entries.filter((entry) => entry.proposalId === proposalId);
  }

  verifyIntegrity(): boolean {
    return this.integrity;
  }

  private load(): ValueNavigatorEntry[] {
    let raw: string;
    try {
      raw = readFileSync(this.path, 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      this.integrity = false;
      return [];
    }
    const loaded: ValueNavigatorEntry[] = [];
    let previousHash = GENESIS;
    try {
      for (const line of raw.split('\n')) {
        if (!line.trim()) continue;
        const parsed = JSON.parse(line) as ValueNavigatorEntry;
        const { hash, ...unsigned } = parsed;
        if (
          parsed.kind !== 'OMEGA_VALUE_NAVIGATOR' ||
          parsed.sequence !== loaded.length + 1 ||
          parsed.previousHash !== previousHash ||
          typeof parsed.proposalId !== 'string' ||
          parsed.record?.authorized !== false ||
          parsed.record?.decision !== 'REVIEW' ||
          !['VERIFIED', 'DIVERGENT', 'UNKNOWN', 'NOT_EXECUTED'].includes(parsed.reconciliationStatus) ||
          hashEntry(unsigned) !== hash
        ) throw new Error('value navigator journal integrity check failed');
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
