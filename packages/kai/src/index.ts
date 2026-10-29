/**
 * KAI — the Mind of the Ω∞v body.
 *
 * Three bounded surfaces, no authority:
 *
 * ```text
 * REMEMBER  append a drop per observed evidence status
 * RECALL    retrieve by claim or source, never inventing a match
 * SHIELD    name scam signals; ALLOW is "no decisive signal", not an endorsement
 * ```
 *
 * A drop is memory. It is not proof, not permission, and not a verification. The
 * `memoryIsProof` field is typed `false` so no caller can quietly upgrade it.
 */

export const KAI_VERSION = 'kai.mind.v1' as const;

export type KaiStatus = 'VERIFIED' | 'DIVERGENT' | 'UNKNOWN' | 'NOT_EXECUTED';

export interface KaiDrop {
  readonly id: string;
  readonly version: typeof KAI_VERSION;
  readonly status: KaiStatus;
  readonly claim: string;
  readonly source: string;
  readonly provenance: readonly string[];
  readonly unknowns: readonly string[];
  readonly inferences: readonly string[];
  readonly memoryIsProof: false;
  readonly authority: 'human_and_reality';
  readonly recordedAt: string;
}

export interface KaiDropInput {
  claim: string;
  /** Evidence status as observed upstream. Never assumed. */
  evidence: { status: string; source: string };
  provenance?: readonly string[];
  unknowns?: readonly string[];
  inferences?: readonly string[];
}

export type KaiShieldDecision = 'ALLOW' | 'REVIEW' | 'BLOCK' | 'UNKNOWN';

export interface KaiShieldSignal {
  readonly id: string;
  readonly weight: 'DECISIVE' | 'CAUTION';
  readonly excerpt: string;
}

export interface KaiShieldVerdict {
  readonly decision: KaiShieldDecision;
  readonly signals: readonly KaiShieldSignal[];
  readonly reason: string;
  /** A shield pass is a bounded text check, not a guarantee about the counterparty. */
  readonly endorsement: false;
}

const statusFromEvidence = (status: string): KaiStatus => {
  switch (status.trim().toUpperCase()) {
    case 'PASS':
    case 'VERIFIED':
      return 'VERIFIED';
    case 'FAIL':
    case 'DIVERGENT':
    case 'HALTED':
      return 'DIVERGENT';
    case 'NOT_EXECUTED':
      return 'NOT_EXECUTED';
    default:
      return 'UNKNOWN';
  }
};

const SIGNALS: ReadonlyArray<{
  id: string;
  weight: KaiShieldSignal['weight'];
  pattern: RegExp;
}> = [
  {
    id: 'credential-request',
    weight: 'DECISIVE',
    pattern: /\b(seed phrase|recovery phrase|private key|mnemonic|wallet password)\b/i,
  },
  {
    id: 'guaranteed-return',
    weight: 'DECISIVE',
    pattern:
      /\b(guaranteed (profit|return|roi)|risk[- ]free (profit|return)|double your (money|investment))\b/i,
  },
  {
    id: 'upfront-payment',
    weight: 'DECISIVE',
    pattern:
      /\b(pay (a|the) (fee|deposit) (first|before)|send (money|crypto|payment) (first|before|to unlock)|upfront (payment|fee))\b/i,
  },
  {
    id: 'urgency-pressure',
    weight: 'CAUTION',
    pattern: /\b(act now|only today|limited slots|last chance|expires in minutes)\b/i,
  },
];

export class KaiMind {
  private readonly drops: KaiDrop[] = [];
  private sequence = 0;

  public remember(input: KaiDropInput): KaiDrop {
    const claim = input.claim.trim();
    const source = input.evidence.source.trim();
    const unknowns = [...(input.unknowns ?? [])];

    if (claim.length === 0) unknowns.push('claim was empty');
    if (source.length === 0) unknowns.push('evidence carried no source');

    const drop: KaiDrop = {
      id: `kai:drop:${++this.sequence}`,
      version: KAI_VERSION,
      status: statusFromEvidence(input.evidence.status),
      claim,
      source,
      provenance: [...(input.provenance ?? []), `sequence:${this.sequence}`],
      unknowns,
      inferences: [...(input.inferences ?? [])],
      memoryIsProof: false,
      authority: 'human_and_reality',
      recordedAt: new Date().toISOString(),
    };

    this.drops.push(drop);
    return drop;
  }

  /** Bounded recall: returns the drops whose claim or source contains the query. */
  public recall(query: string): readonly KaiDrop[] {
    const needle = query.trim().toLowerCase();
    if (needle.length === 0) return [];
    return this.drops.filter(
      (drop) =>
        drop.claim.toLowerCase().includes(needle) || drop.source.toLowerCase().includes(needle)
    );
  }

  /** Every drop recorded so far, oldest first. */
  public recorded(): readonly KaiDrop[] {
    return [...this.drops];
  }

  /** The Shield. Fails toward REVIEW/BLOCK/UNKNOWN; never toward confidence. */
  public shield(intent: string): KaiShieldVerdict {
    const text = intent.trim();
    if (text.length === 0) {
      return {
        decision: 'UNKNOWN',
        signals: [],
        reason: 'no intent text was supplied, so no signal could be evaluated',
        endorsement: false,
      };
    }

    const signals: KaiShieldSignal[] = [];
    for (const signal of SIGNALS) {
      const match = text.match(signal.pattern);
      if (match) signals.push({ id: signal.id, weight: signal.weight, excerpt: match[0] });
    }

    if (signals.some((signal) => signal.weight === 'DECISIVE')) {
      return {
        decision: 'BLOCK',
        signals,
        reason: 'a decisive scam signal matched; the intent is not carried further',
        endorsement: false,
      };
    }
    if (signals.length > 0) {
      return {
        decision: 'REVIEW',
        signals,
        reason: 'only caution signals matched; a human decides',
        endorsement: false,
      };
    }
    return {
      decision: 'ALLOW',
      signals: [],
      reason: 'no decisive scam signal was observed in this text; that is not an endorsement',
      endorsement: false,
    };
  }
}
