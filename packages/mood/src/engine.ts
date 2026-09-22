/**
 * AUTOPILOT MOOD — governed, bounded interaction engine.
 *
 * Loop (section 16):
 *   observe → classify → contextualize → preserveUncertainty
 *   → generateAdaptation → checkAuthority (safety gate) → propose
 *   → observe → reconcile → remember
 *
 * CORE LAW (section: MOOD ≠ TRUTH/AUTHORITY/CONSENT/PROOF):
 *   Mood may shape HOW the system communicates and proposes.
 *   Mood may never independently authorize WHAT the system is allowed to do.
 *   Inference is never silently upgraded into observation.
 *
 * This engine depends only on the existing bounded contract in ./autopilot.
 * It never grants consequential authority — normal Ω∞v admission remains the
 * gate for reality claims and consequent action (section 6, 19).
 */
import {
  createMoodContext,
  normalizeMoodSignal,
  proposeMoodAdaptation,
  type MoodAdaptationProposal,
  type MoodAutopilotLevel,
  type MoodContext,
  type MoodSignal,
  type MoodSignalStatus,
} from './autopilot';

/** Context labels (section 14) — not diagnoses. */
export type MoodStateLabel =
  | 'CALM'
  | 'FOCUSED'
  | 'EXPLORATORY'
  | 'CREATIVE'
  | 'URGENT'
  | 'UNCERTAIN'
  | 'FRUSTRATED'
  | 'OVERLOADED'
  | 'REFLECTIVE'
  | 'SOCIAL'
  | 'TASK_MODE'
  | 'UNKNOWN';

/** Autopilot level names (section 3). */
export const MOOD_AUTOPILOT_LEVEL_LABELS: Record<MoodAutopilotLevel, string> = {
  0: 'PASSIVE',
  1: 'REFLECTIVE',
  2: 'CONTEXTUAL',
  3: 'PROACTIVE',
  4: 'BOUNDED_ACTION',
  5: 'CONSEQUENTIAL',
};

/** A remembered mood signal with full provenance (section 12). */
export interface MoodMemoryEntry {
  signal: string;
  status: MoodSignalStatus;
  source: string;
  confidence: number;
  uncertainty: number;
  timestamp: string;
  provenance: string;
  userCorrection?: string;
}

/** Multi-agent mood summary (section 17): preserve sources, retain dissent. */
export interface MoodMultiAgentSummary {
  agents: number;
  signals: number;
  dissent: boolean;
  explicitSignal: boolean;
  statuses: MoodSignalStatus[];
}

/** The invariant governed contract — mood never becomes authority. */
export const MOOD_CORE_LAW = {
  moodNotTruth: true,
  moodNotAuthority: true,
  moodNotConsent: true,
  moodNotProof: true,
  inferenceNotFact: true,
} as const;

export interface MoodAutopilotSnapshot {
  state: MoodStateLabel;
  level: MoodAutopilotLevel;
  levelLabel: string;
  context: MoodContext;
  proposal: MoodAdaptationProposal;
  authority: 'UNCHANGED';
  memory: { entries: MoodMemoryEntry[]; count: number };
  multiAgent: MoodMultiAgentSummary;
  coreLaw: typeof MOOD_CORE_LAW;
  evaluatedAt: string;
}

export interface ObserveOptions {
  agentId?: string;
  language?: string;
  relationship?: string;
  values?: string[];
  intent?: string;
  context?: string;
}

export interface SafetyGateOptions {
  consequential?: boolean;
  unsafe?: boolean;
  preAuthorized?: boolean;
  reversible?: boolean;
}

const now = (): string => new Date().toISOString();

/** Keyword → state classifier (section 14). Explicit user statements win. */
function classifyByContent(signal: string): MoodStateLabel | null {
  const text = signal.toLowerCase();
  if (/\b(overwhelm|too much|too many|drown|flood|can'?t cope|stress)/.test(text)) return 'OVERLOADED';
  if (/\b(frustrat|annoy|angry|stuck|broken|not working|ugh)/.test(text)) return 'FRUSTRATED';
  if (/\b(urgent|asap|now|immediate|deadline|rush)/.test(text)) return 'URGENT';
  if (/\b(short|brief|concise|quick|quiet|less|summar)/.test(text)) return 'TASK_MODE';
  if (/\b(explore|curious|investigate|wonder|what if)/.test(text)) return 'EXPLORATORY';
  if (/\b(create|build|make|design|draft|imagine)/.test(text)) return 'CREATIVE';
  if (/\b(reflect|think|consider|ponder|review)/.test(text)) return 'REFLECTIVE';
  if (/\b(chat|talk|social|hi|hello|hey)/.test(text)) return 'SOCIAL';
  if (/\b(focus|concentrate|target|goal|aim)/.test(text)) return 'FOCUSED';
  return null;
}

export class MoodAutopilotEngine {
  private readonly memory: MoodMemoryEntry[] = [];
  private readonly agentSignals = new Map<string, MoodSignal[]>();
  private context: MoodContext = createMoodContext();
  private readonly maxMemory: number;

  constructor(maxMemory = 64) {
    this.maxMemory = maxMemory;
  }

  /** Observe a human/agent signal, classify, contextualize, and remember. */
  observe(
    input: Pick<MoodSignal, 'signal' | 'status'> & Partial<MoodSignal>,
    options: ObserveOptions = {},
  ): MoodContext {
    const signal = normalizeMoodSignal(input);
    const agentId = options.agentId ?? 'default';
    const bucket = this.agentSignals.get(agentId) ?? [];
    bucket.push(signal);
    this.agentSignals.set(agentId, bucket);
    this.remember(signal);

    const signals = this.gatherSignals();
    const state = this.classify(signals);
    this.context = createMoodContext({
      context: options.context ?? this.context.context,
      signals,
      language: options.language ?? this.context.language,
      relationship: options.relationship ?? this.context.relationship,
      values: options.values ?? this.context.values,
      intent: options.intent ?? options.context ?? signal.signal,
      status: this.dominantStatus(signals),
    });
    // Stamp the contextualized state onto the context description for transparency.
    (this.context as MoodContext & { stateLabel?: MoodStateLabel }).stateLabel = state;
    return this.context;
  }

  /** Classify the current signal set into a context label (section 14). */
  classify(signals: MoodSignal[] = this.gatherSignals()): MoodStateLabel {
    if (signals.length === 0) return 'UNKNOWN';

    const statuses = signals.map((signal) => signal.status);
    const explicit = signals.filter((signal) => signal.status === 'USER_STATED');
    const inferred = signals.filter((signal) => signal.status === 'INFERRED');

    // Multi-agent dissent (section 17): conflicting interpretations → UNCERTAIN.
    if (this.hasDissent(signals)) return 'UNCERTAIN';

    // Prefer the most recent explicit user statement for content classification.
    const latestExplicit = explicit[explicit.length - 1];
    if (latestExplicit) {
      const byContent = classifyByContent(latestExplicit.signal);
      if (byContent) return byContent;
      return 'FOCUSED';
    }

    // Inference only — never assert as fact; preserve uncertainty (section 2).
    if (inferred.length > 0 && explicit.length === 0) return 'UNCERTAIN';

    if (statuses.every((status) => status === 'DOCUMENTED')) return 'CALM';
    return 'UNKNOWN';
  }

  /** Contextualize through language + relationship + history + intent (section 4). */
  contextualize(input: Partial<MoodContext> = {}): MoodContext {
    this.context = createMoodContext({ ...this.context, ...input });
    return this.context;
  }

  /** Safety gate (section 13). Mood never authorizes consequential action. */
  safetyGate(options: SafetyGateOptions = {}): MoodAdaptationProposal['decision'] {
    if (options.unsafe) return 'DENY';
    if (options.consequential) return 'REVIEW'; // authority + policy + admission still required
    return 'ADAPT_ONLY';
  }

  /** Produce a presentation-only proposal. Delegates to the bounded contract. */
  propose(options: SafetyGateOptions = {}): MoodAdaptationProposal {
    return proposeMoodAdaptation(this.context, {
      consequential: options.consequential,
      unsafe: options.unsafe,
    });
  }

  /** Apply a user correction to memory (section 18: user-correct → update). */
  reconcile(signalText: string, correction: string): MoodMemoryEntry[] {
    const corrected: MoodMemoryEntry[] = [];
    for (const entry of this.memory) {
      if (entry.signal === signalText && !entry.userCorrection) {
        entry.userCorrection = correction;
        corrected.push(entry);
      }
    }
    return corrected;
  }

  /** Snapshot the full governed mood state for the UI/API (section 15). */
  snapshot(): MoodAutopilotSnapshot {
    const signals = this.gatherSignals();
    const state = this.classify(signals);
    const level = this.levelFor(state, signals);
    return {
      state,
      level,
      levelLabel: MOOD_AUTOPILOT_LEVEL_LABELS[level],
      context: this.context,
      proposal: this.propose(),
      authority: 'UNCHANGED',
      memory: { entries: [...this.memory], count: this.memory.length },
      multiAgent: this.summarizeAgents(),
      coreLaw: MOOD_CORE_LAW,
      evaluatedAt: now(),
    };
  }

  /** Reset all observed signals and memory (testing / fresh session). */
  clear(): void {
    this.memory.length = 0;
    this.agentSignals.clear();
    this.context = createMoodContext();
  }

  // ── internals ──

  private gatherSignals(): MoodSignal[] {
    const all: MoodSignal[] = [];
    for (const bucket of this.agentSignals.values()) for (const signal of bucket) all.push(signal);
    return all;
  }

  private remember(signal: MoodSignal): void {
    this.memory.push({
      signal: signal.signal,
      status: signal.status,
      source: signal.source,
      confidence: signal.confidence,
      uncertainty: signal.uncertainty,
      timestamp: signal.timestamp,
      provenance: signal.provenance,
      ...(signal.userCorrection ? { userCorrection: signal.userCorrection } : {}),
    });
    if (this.memory.length > this.maxMemory) this.memory.shift();
  }

  private dominantStatus(signals: MoodSignal[]): MoodSignalStatus {
    if (signals.some((signal) => signal.status === 'USER_STATED')) return 'USER_STATED';
    if (signals.some((signal) => signal.status === 'DOCUMENTED')) return 'DOCUMENTED';
    if (signals.some((signal) => signal.status === 'OBSERVED')) return 'OBSERVED';
    if (signals.some((signal) => signal.status === 'INFERRED')) return 'INFERRED';
    if (signals.some((signal) => signal.status === 'SIMULATED')) return 'SIMULATED';
    return 'UNKNOWN';
  }

  private hasDissent(signals: MoodSignal[]): boolean {
    const inferred = signals.filter((signal) => signal.status === 'INFERRED');
    if (inferred.length < 2) return false;
    // Distinct inferred interpretations from different agents = dissent.
    const sources = new Set(inferred.map((signal) => signal.source));
    const texts = new Set(inferred.map((signal) => signal.signal));
    return sources.size > 1 && texts.size > 1;
  }

  private summarizeAgents(): MoodMultiAgentSummary {
    const signals = this.gatherSignals();
    const statuses = signals.map((signal) => signal.status);
    return {
      agents: this.agentSignals.size,
      signals: signals.length,
      dissent: this.hasDissent(signals),
      explicitSignal: signals.some((signal) => signal.status === 'USER_STATED'),
      statuses,
    };
  }

  /**
   * Map a state + signals to an autopilot level (section 3).
   * Mood grants at most proactive suggestions (3). Bounded action (4) requires
   * explicit pre-authorization AND reversibility. Level 5 is NEVER granted by
   * mood — it requires normal Ω∞v admission.
   */
  private levelFor(state: MoodStateLabel, signals: MoodSignal[]): MoodAutopilotLevel {
    const explicit = signals.some((signal) => signal.status === 'USER_STATED');
    if (state === 'UNKNOWN' || (!explicit && state === 'UNCERTAIN')) return 0; // PASSIVE
    if (!explicit) return 0; // never act on inference alone
    const hasContext =
      Boolean(this.context.language && this.context.language !== 'unspecified') ||
      Boolean(this.context.relationship && this.context.relationship !== 'unspecified') ||
      signals.length > 1;
    if (state === 'URGENT' || state === 'OVERLOADED' || state === 'FRUSTRATED') return 3; // PROACTIVE: suggest breaks/clarification
    if (hasContext) return 2; // CONTEXTUAL
    return 1; // REFLECTIVE: adapt wording/pacing
  }
}

export default MoodAutopilotEngine;
