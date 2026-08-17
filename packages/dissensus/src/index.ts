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

export interface DissensusPolicy {
  /** Route to a human whenever verifiers disagree at all. */
  humanOnSplit: boolean;
  /** Route to a human when an agreed verdict is less confident than this. */
  minimumConfidence: number;
  /** Opinions required before any verdict may be reported. */
  quorum: number;
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
  minimumConfidence: 0.7,
  quorum: 2,
};

export interface Dissensus {
  verdict: Verdict;
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
  const base = { opinions, dissenting: [] as Opinion[], agreed: null, confidence: 0 };

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
    verdict: 'AGREED',
    routing: 'AUTO',
    agreed,
    confidence,
    dissenting: [],
    reason: `all ${determined.length} verifiers agree`,
  };
}
