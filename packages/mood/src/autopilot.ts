export type MoodSignalStatus =
  | 'OBSERVED'
  | 'USER_STATED'
  | 'DOCUMENTED'
  | 'INFERRED'
  | 'SIMULATED'
  | 'UNKNOWN';

export type MoodAutopilotLevel = 0 | 1 | 2 | 3 | 4 | 5;

export type MoodAuthorityDecision = 'ADAPT_ONLY' | 'REVIEW' | 'DENY';

export interface MoodSignal {
  signal: string;
  status: MoodSignalStatus;
  source: string;
  confidence: number;
  uncertainty: number;
  timestamp: string;
  provenance: string;
  userCorrection?: string;
}

export interface MoodContext {
  context: string;
  signals: MoodSignal[];
  language: string;
  relationship: string;
  values: string[];
  intent: string;
  uncertainty: number;
  provenance: string;
  timestamp: string;
  status: MoodSignalStatus;
}

export interface MoodAdaptationProposal {
  decision: MoodAuthorityDecision;
  level: MoodAutopilotLevel;
  adaptation: 'PRESERVE_DEFAULT' | 'ADAPT_EXPERIENCE';
  reason: string;
  authority: 'UNCHANGED';
  contextStatus: MoodSignalStatus;
  uncertainty: number;
}

const clampUnit = (value: number, fallback: number): number =>
  Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback;

const now = (): string => new Date().toISOString();

/**
 * Normalize a signal without upgrading an inference into an observation.
 * Mood is interaction context only; it never establishes truth or permission.
 */
export function normalizeMoodSignal(input: Partial<MoodSignal> & Pick<MoodSignal, 'signal' | 'status'>): MoodSignal {
  return {
    signal: input.signal,
    status: input.status,
    source: input.source ?? 'unspecified',
    confidence: clampUnit(input.confidence ?? 0, 0),
    uncertainty: clampUnit(input.uncertainty ?? (input.status === 'USER_STATED' ? 0 : 1), 1),
    timestamp: input.timestamp ?? now(),
    provenance: input.provenance ?? 'unattributed',
    ...(input.userCorrection ? { userCorrection: input.userCorrection } : {}),
  };
}

/**
 * Build a context record with explicit provenance and uncertainty defaults.
 */
export function createMoodContext(input: Partial<MoodContext> = {}): MoodContext {
  const signals = (input.signals ?? []).map((signal) => normalizeMoodSignal(signal));
  const uncertainty = clampUnit(
    input.uncertainty ?? (signals.length === 0 ? 1 : Math.max(...signals.map((signal) => signal.uncertainty))),
    1,
  );
  const status = input.status ?? (signals.some((signal) => signal.status === 'USER_STATED') ? 'USER_STATED' : 'UNKNOWN');

  return {
    context: input.context ?? '',
    signals,
    language: input.language ?? 'unspecified',
    relationship: input.relationship ?? 'unspecified',
    values: input.values ?? [],
    intent: input.intent ?? '',
    uncertainty,
    provenance: input.provenance ?? 'mood-context',
    timestamp: input.timestamp ?? now(),
    status,
  };
}

/**
 * Produce a presentation-only proposal. This function never returns permission
 * to execute a consequential action; normal Ω∞v admission remains authoritative.
 */
export function proposeMoodAdaptation(
  context: MoodContext,
  options: { consequential?: boolean; unsafe?: boolean } = {},
): MoodAdaptationProposal {
  if (options.unsafe) {
    return {
      decision: 'DENY',
      level: 0,
      adaptation: 'PRESERVE_DEFAULT',
      reason: 'Unsafe adaptation request is denied.',
      authority: 'UNCHANGED',
      contextStatus: context.status,
      uncertainty: context.uncertainty,
    };
  }

  if (options.consequential) {
    return {
      decision: 'REVIEW',
      level: 3,
      adaptation: 'PRESERVE_DEFAULT',
      reason: 'Mood may propose context adaptation but cannot authorize consequential action.',
      authority: 'UNCHANGED',
      contextStatus: context.status,
      uncertainty: context.uncertainty,
    };
  }

  const canAdapt = context.signals.length > 0 && context.status !== 'UNKNOWN';
  return {
    decision: 'ADAPT_ONLY',
    level: canAdapt ? 1 : 0,
    adaptation: canAdapt ? 'ADAPT_EXPERIENCE' : 'PRESERVE_DEFAULT',
    reason: canAdapt ? 'Adapt wording or pacing only; truth and authority remain unchanged.' : 'No sufficiently grounded mood signal; preserve the default interaction.',
    authority: 'UNCHANGED',
    contextStatus: context.status,
    uncertainty: context.uncertainty,
  };
}

export default {
  createMoodContext,
  normalizeMoodSignal,
  proposeMoodAdaptation,
};
