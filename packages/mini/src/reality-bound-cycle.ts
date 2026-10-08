import { createHash, randomUUID } from 'node:crypto';

export type OmegaGeneration = 'LIVING' | 'MATTER';
export type OmegaForm = 'HUMAN' | 'ANIMAL' | 'PLANT' | 'WATER';
export type OmegaMotion = 0 | 1;
export type OmegaScale = 'NEEDLE' | 'PLANET';
export type OmegaDecision = 'ALLOW' | 'DENY' | 'REVIEW';
export type OmegaRoute = 0 | 1;
export type OmegaVerification = 'VERIFIED' | 'DIVERGENT' | 'UNKNOWN' | 'NOT_EXECUTED';

export interface OmegaCoreState {
  readonly g: OmegaGeneration;
  readonly f: OmegaForm;
  readonly m: OmegaMotion;
  readonly s: OmegaScale;
}

export interface OmegaCycleInput extends OmegaCoreState {
  readonly evidence: boolean;
  readonly authority: boolean;
  readonly bounded: boolean;
  readonly observed?: boolean;
  readonly expectedMatchesActual?: boolean;
  readonly evidenceId?: string;
  readonly authorityId?: string;
  readonly policyId?: string;
}

export interface OmegaCycleResult {
  readonly decision: OmegaDecision;
  readonly route: OmegaRoute;
  readonly execution: 'EXECUTED' | 'NOT_EXECUTED';
  readonly verification: OmegaVerification;
  readonly eventId: string;
  readonly tx?: string;
  readonly observationId?: string;
  readonly reason?: string;
}

interface LedgerEntry {
  readonly eventId: string;
  readonly tx?: string;
  readonly decision: OmegaDecision;
  readonly route: OmegaRoute;
  readonly execution: 'EXECUTED' | 'NOT_EXECUTED';
  readonly verification: OmegaVerification;
  readonly state: OmegaCoreState;
  readonly previousHash: string;
  readonly hash: string;
}

const GEN: readonly OmegaGeneration[] = ['LIVING', 'MATTER'];
const FORM: readonly OmegaForm[] = ['HUMAN', 'ANIMAL', 'PLANT', 'WATER'];
const MOTION: readonly OmegaMotion[] = [0, 1];
const SCALE: readonly OmegaScale[] = ['NEEDLE', 'PLANET'];

export class OceanicosRealityMatrix {
  private readonly ledger: LedgerEntry[] = [];

  public cycle(input: OmegaCycleInput): OmegaCycleResult {
    const eventId = 'event_' + randomUUID();
    const invalid = this.validate(input);

    if (invalid) {
      this.append({
        eventId,
        decision: 'DENY',
        route: 0,
        execution: 'NOT_EXECUTED',
        verification: 'NOT_EXECUTED',
        state: this.stateOf(input),
        previousHash: this.tipHash(),
        hash: '',
      });
      this.sealLast();
      return {
        decision: 'DENY',
        route: 0,
        execution: 'NOT_EXECUTED',
        verification: 'NOT_EXECUTED',
        eventId,
        reason: invalid,
      };
    }

    const tx = 'tx_' + randomUUID();
    const observationId = input.observed === true ? 'obs_' + randomUUID() : undefined;
    const verification: OmegaVerification =
      input.observed !== true
        ? 'UNKNOWN'
        : input.expectedMatchesActual === true
          ? 'VERIFIED'
          : 'DIVERGENT';

    this.append({
      eventId,
      tx,
      decision: 'ALLOW',
      route: 1,
      execution: 'EXECUTED',
      verification,
      state: this.stateOf(input),
      previousHash: this.tipHash(),
      hash: '',
    });
    this.sealLast();

    return {
      decision: 'ALLOW',
      route: 1,
      execution: 'EXECUTED',
      verification,
      eventId,
      tx,
      observationId,
    };
  }

  public ledger(): readonly LedgerEntry[] {
    return this.ledger.map((entry) => ({ ...entry }));
  }

  public verifyLedger(): boolean {
    let previousHash = 'GENESIS';
    for (const entry of this.ledger) {
      const { hash, ...unsigned } = entry;
      if (entry.previousHash !== previousHash) return false;
      if (hash !== digest(unsigned)) return false;
      previousHash = hash;
    }
    return true;
  }

  private validate(input: OmegaCycleInput): string | null {
    if (!GEN.includes(input.g)) return 'INVALID_GENERATION';
    if (!FORM.includes(input.f)) return 'INVALID_FORM';
    if (!MOTION.includes(input.m)) return 'INVALID_MOTION';
    if (!SCALE.includes(input.s)) return 'INVALID_SCALE';
    if (!input.evidence) return 'MISSING_EVIDENCE';
    if (!input.authority) return 'MISSING_AUTHORITY';
    if (!input.bounded) return 'UNBOUNDED_TRANSITION';
    return null;
  }

  private stateOf(input: OmegaCycleInput): OmegaCoreState {
    return { g: input.g, f: input.f, m: input.m, s: input.s };
  }

  private tipHash(): string {
    return this.ledger.length ? this.ledger[this.ledger.length - 1].hash : 'GENESIS';
  }

  private append(entry: LedgerEntry): void {
    this.ledger.push(entry);
  }

  private sealLast(): void {
    const last = this.ledger[this.ledger.length - 1];
    const { hash, ...unsigned } = last;
    this.ledger[this.ledger.length - 1] = { ...unsigned, hash: digest(unsigned) };
  }
}

function digest(value: Omit<LedgerEntry, 'hash'>): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}
