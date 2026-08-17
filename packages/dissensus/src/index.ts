/**
 * Reconcile several verifiers' opinions into one reported state.
 *
 * Pure by design: no I/O, no clock, no network. Whether a verifier is a rule
 * engine, a model, or a person is not this module's concern — it receives
 * opinions and decides what may be said about them.
 *
 * Two things it deliberately does not do.
 *
 * It never takes a majority vote. Three verifiers at 2–1 is a disagreement,
 * not a decision, and collapsing it discards the one signal worth having.
 * The minority opinion is carried in the result.
 *
 * It never averages confidence. A confident verifier would carry a doubtful
 * one across a threshold, which is the direction that overstates trust. The
 * reported confidence is the minimum, for the same reason the verification
 * engine already takes the minimum across rules.
 */

export type Verdict = 'AGREED' | 'SPLIT' | 'UNKNOWN';

export type Routing = 'AUTO' | 'HUMAN';

export interface Opinion {
  verifierId: string;
  verifierVersion: string;
  /** null means the verifier could not determine an answer, not "false". */
  passed: boolean | null;
  /** 0..1. Values outside the range are treated as unusable. */
  confidence: number;
  reason: string;
}

/**
 * Where a policy's numbers came from.
 *
 * This matters more than it looks. A threshold chosen by whoever wrote the
 * code and a threshold derived from observed outcomes are different kinds
 * of claim, and a reader cannot tell them apart from the number alone.
 * Every other unearned figure in this system was removed for exactly that
 * reason; this one is declared instead, because a routing threshold has to
 * exist before there is any data to derive it from.
 */
export type PolicyProvenance =
  /** Chosen by an author. Not measured. Not evidence. */
  | 'default'
  /** Set by an operator who accepted responsibility for it. */
  | 'configured'
  /** Computed from recorded outcomes. Nothing produces this yet. */
  | 'derived';

export interface DissensusPolicy {
  /** Route to a human whenever verifiers disagree at all. */
  humanOnSplit: boolean;
  /** Route to a human when an agreed verdict is less confident than this. */
  minimumConfidence: number;
  /** Opinions required before any verdict may be reported. */
  quorum: number;
  /** How these numbers were arrived at. Never inferred from the values. */
  provenance: PolicyProvenance;
}

export class InvalidPolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidPolicyError';
  }
}

/**
 * Build a policy from strings, refusing anything unusable.
 *
 * Values are not clamped. Clamping an out-of-range threshold would invent a
 * number nobody chose and then apply it to routing decisions, which is the
 * failure this whole module exists to avoid.
 */
export function policyFromEnvironment(
  env: Record<string, string | undefined> = {}
): DissensusPolicy {
  const raw = {
    minimumConfidence: env.OMEGA_DISSENSUS_MIN_CONFIDENCE,
    quorum: env.OMEGA_DISSENSUS_QUORUM,
    humanOnSplit: env.OMEGA_DISSENSUS_HUMAN_ON_SPLIT,
  };

  if (
    raw.minimumConfidence === undefined &&
    raw.quorum === undefined &&
    raw.humanOnSplit === undefined
  ) {
    return STRICT_POLICY;
  }

  const minimumConfidence =
    raw.minimumConfidence === undefined
      ? STRICT_POLICY.minimumConfidence
      : Number(raw.minimumConfidence);

  if (!Number.isFinite(minimumConfidence) || minimumConfidence < 0 || minimumConfidence > 1) {
    throw new InvalidPolicyError(
      `OMEGA_DISSENSUS_MIN_CONFIDENCE must be between 0 and 1, received ${JSON.stringify(
        raw.minimumConfidence
      )}`
    );
  }

  const quorum = raw.quorum === undefined ? STRICT_POLICY.quorum : Number(raw.quorum);

  if (!Number.isInteger(quorum) || quorum < 1) {
    throw new InvalidPolicyError(
      `OMEGA_DISSENSUS_QUORUM must be a positive integer, received ${JSON.stringify(raw.quorum)}`
    );
  }

  if (raw.humanOnSplit !== undefined && !['true', 'false'].includes(raw.humanOnSplit)) {
    throw new InvalidPolicyError(
      `OMEGA_DISSENSUS_HUMAN_ON_SPLIT must be "true" or "false", received ${JSON.stringify(
        raw.humanOnSplit
      )}`
    );
  }

  return {
    minimumConfidence,
    quorum,
    humanOnSplit:
      raw.humanOnSplit === undefined ? STRICT_POLICY.humanOnSplit : raw.humanOnSplit === 'true',
    // An operator set these, so they are answerable for them. That is a
    // stronger claim than 'default' and a weaker one than 'derived'.
    provenance: 'configured',
  };
}

/**
 * The conservative default: any disagreement stops the loop.
 *
 * This is the expensive choice and it is deliberate. Loosening it is a
 * policy decision with consequences, so it must be made explicitly by a
 * caller rather than inherited from a default nobody chose.
 */
export const STRICT_POLICY: DissensusPolicy = {
  humanOnSplit: true,
  // Chosen, not measured. There is no outcome data to derive it from yet,
  // and pretending otherwise would make it look like evidence. The
  // provenance field says so wherever this policy is reported.
  minimumConfidence: 0.7,
  quorum: 2,
  provenance: 'default',
};

export interface Dissensus {
  verdict: Verdict;
  /** The policy applied, including where its numbers came from. */
  policy: DissensusPolicy;
  routing: Routing;
  /** null whenever the verdict is not AGREED. */
  agreed: boolean | null;
  /** Minimum across usable opinions. 0 when there is nothing to report. */
  confidence: number;
  /** Every opinion received, in the order received. Never filtered. */
  opinions: Opinion[];
  /** Opinions differing from the majority position, or all when tied. */
  dissenting: Opinion[];
  reason: string;
}

const usable = (opinion: Opinion): boolean =>
  Number.isFinite(opinion.confidence) && opinion.confidence >= 0 && opinion.confidence <= 1;

const duplicateIds = (opinions: Opinion[]): string[] => {
  const seen = new Set<string>();
  const repeated = new Set<string>();
  for (const opinion of opinions) {
    if (seen.has(opinion.verifierId)) repeated.add(opinion.verifierId);
    seen.add(opinion.verifierId);
  }
  return Array.from(repeated).sort();
};

export function reconcile(opinions: Opinion[], policy: DissensusPolicy = STRICT_POLICY): Dissensus {
  const base = { opinions, policy, dissenting: [] as Opinion[], agreed: null, confidence: 0 };

  // One verifier answering twice is not two verifiers agreeing. Counting it
  // as agreement would manufacture consensus from a configuration mistake.
  const repeated = duplicateIds(opinions);
  if (repeated.length > 0) {
    return {
      ...base,
      verdict: 'UNKNOWN',
      routing: 'HUMAN',
      reason: `the same verifier answered more than once: ${repeated.join(', ')}`,
    };
  }

  const unusable = opinions.filter((opinion) => !usable(opinion));
  if (unusable.length > 0) {
    return {
      ...base,
      verdict: 'UNKNOWN',
      routing: 'HUMAN',
      dissenting: unusable,
      reason: `confidence outside 0..1 from: ${unusable
        .map((opinion) => opinion.verifierId)
        .join(', ')}`,
    };
  }

  if (opinions.length < policy.quorum) {
    return {
      ...base,
      verdict: 'UNKNOWN',
      routing: 'HUMAN',
      reason: `quorum is ${policy.quorum}, received ${opinions.length}`,
    };
  }

  const determined = opinions.filter((opinion) => opinion.passed !== null);
  const undetermined = opinions.filter((opinion) => opinion.passed === null);

  if (determined.length === 0) {
    return {
      ...base,
      verdict: 'UNKNOWN',
      routing: 'HUMAN',
      dissenting: undetermined,
      reason: 'no verifier reached a determination',
    };
  }

  const confidence = Math.min(...determined.map((opinion) => opinion.confidence));
  const positive = determined.filter((opinion) => opinion.passed === true);
  const negative = determined.filter((opinion) => opinion.passed === false);

  // A verifier that could not determine an answer is not agreement. It is
  // preserved as dissent so the gap stays visible.
  const split = positive.length > 0 && negative.length > 0;

  if (split || undetermined.length > 0) {
    const minority =
      positive.length === negative.length
        ? [...positive, ...negative]
        : positive.length < negative.length
          ? positive
          : negative;

    return {
      opinions,
      policy,
      verdict: split ? 'SPLIT' : 'UNKNOWN',
      routing: policy.humanOnSplit ? 'HUMAN' : 'AUTO',
      agreed: null,
      confidence,
      dissenting: [...minority, ...undetermined],
      reason: split
        ? `verifiers disagree: ${positive.length} passed, ${negative.length} failed`
        : `${undetermined.length} verifier(s) could not determine an answer`,
    };
  }

  const agreed = positive.length > 0;

  if (confidence < policy.minimumConfidence) {
    return {
      opinions,
      policy,
      verdict: 'AGREED',
      routing: 'HUMAN',
      agreed,
      confidence,
      dissenting: [],
      reason: `agreed, but confidence ${confidence} is below the ${policy.minimumConfidence} threshold`,
    };
  }

  return {
    opinions,
    policy,
    verdict: 'AGREED',
    routing: 'AUTO',
    agreed,
    confidence,
    dissenting: [],
    reason: `all ${determined.length} verifiers agree`,
  };
}
