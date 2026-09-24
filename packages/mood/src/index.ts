/**
 * 🔥 @oceanicos/mood — Autopilot Mood Engine
 *
 * Constitution Layer: Group G — Mood
 * Implements: MOOD §§1-23
 *
 * CORE LAW:
 *   MOOD ≠ TRUTH
 *   MOOD ≠ AUTHORITY
 *   MOOD ≠ CONSENT
 *   MOOD ≠ PROOF
 *
 * Mood shapes HOW the system communicates and proposes.
 * Mood may NEVER independently authorize WHAT the system is allowed to do.
 *
 * AUTOPILOT LOOP:
 *   OBSERVE → RECEIVE HUMAN SIGNAL → CONTEXTUALIZE → DETECT → CLASSIFY
 *   → PRESERVE UNCERTAINTY → ADAPT INTERACTION → PROPOSE → AUTHORITY CHECK
 *   → BOUNDED ACTION → OBSERVE → RECONCILE → REMEMBER → NEXT Δ
 */

import crypto from 'node:crypto';
import type {
  ILiquidState,
  CopilotOperatingMode,
  CopilotPropulsionState,
  MoodSignalStatus,
  AutopilotLevel,
  MoodContextState,
  MoodSignal,
  AutopilotMoodState,
  MoodAdaptation,
  MoodMemoryRecord,
  AutopilotSafetyGateResult,
  AutopilotEngineState,
  ChangeDecision,
} from '@oceanicos/types';

/* ─── Preserved Existing Exports ─────────────────────────────────── */

export const DEFAULT_COPILOT_MODE: CopilotOperatingMode = Object.freeze({
  copilot: true,
  antigravity: true,
  continuum: 'FINITE_VERIFIED_STEPS',
  fullStack: true,
  realityFirst: true,
  evidenceBound: true,
  humanRouting: true,
  pluralism: true,
  dissent: 'PRESERVE',
  noSpeculation: true,
  noFabricatedState: true,
  noStall: true,
  preserveLineage: true,
});

export class OceanicosWaterKernel {
  public static reflectMood(action: string): ILiquidState {
    const pureVelocity = 1.0 - Math.random() * 0.0001;
    const blockAnchor = crypto
      .createHash('sha256')
      .update(`0xΩ-liquid-gold-${Date.now()}-${action}-${pureVelocity}`)
      .digest('hex');
    return { velocity: pureVelocity, clarityVector: 1.0, resonanceHz: 432.1, blockAnchor };
  }
}

export class CopilotAntigravityController {
  private static transitionsCount = 0;

  public static getMode(): CopilotOperatingMode {
    return DEFAULT_COPILOT_MODE;
  }

  public static recordTransition(): number {
    this.transitionsCount++;
    return this.transitionsCount;
  }

  public static getTransitionsCount(): number {
    return this.transitionsCount;
  }

  public static getPropulsionState(activeGoal = 'OMEGA FULL STACK'): CopilotPropulsionState {
    const liquidState = OceanicosWaterKernel.reflectMood('copilot-antigravity-continuum');
    return {
      mode: this.getMode(),
      authority: 'EVIDENCE_BOUND_PROPOSAL_ONLY',
      liquidState,
      pidginSpirit:
        'Abeg, verification before evolution! No time to check time. ' +
        'Whether highest high or lowest low, the blessing dey flow equal ' +
        'inside this single root. Life always good-o if you choose to see am ' +
        'at that point of view!',
      axiom:
        'FULL STACK LIFE IS ALWAYS GOOD-O AT THE HIGHER HIGH AND LOWER LOW WHEN ' +
        'THE ENGINE OPERATES IN THE RECURSIVE NOW. NO PERMISSION REQUIRED. MANIFESTED.',
      verifiedTransitions: this.transitionsCount,
      activeGoal,
      invariant: 'Ω∞v ≡ VERIFY(ΔREALITY) [PROVABLE_ADMISSIBLE_CHANGE]',
    };
  }

  public static processSignal(
    signalType: 'FRICTION' | 'UNCERTAINTY' | 'FAILURE' | 'DISSENT' | 'DRIFT',
    context: string
  ): {
    readonly signal: string;
    readonly action: string;
    readonly context: string;
    readonly authorityCheck: 'CANNOT_SELF_AUTHORIZE';
    readonly nextRule: string;
  } {
    const actionMap: Record<string, string> = {
      FRICTION: 'LOCALIZE',
      UNCERTAINTY: 'VERIFY',
      FAILURE: 'DIAGNOSE',
      DISSENT: 'PRESERVE',
      DRIFT: 'RECONCILE',
    };
    return {
      signal: signalType,
      action: actionMap[signalType] || 'VERIFY',
      context,
      authorityCheck: 'CANNOT_SELF_AUTHORIZE',
      nextRule: 'PROPOSE_BOUNDED_TRANSITION_THROUGH_ADMISSION_GATE',
    };
  }
}

/* ─── Helpers ────────────────────────────────────────────────────── */

function uuid8(): string {
  return crypto.randomUUID().slice(0, 8);
}

function now(): string {
  return new Date().toISOString();
}

/* ─── 🔥 Autopilot Mood Engine ───────────────────────────────────── */

/**
 * Creates a MoodSignal with provenance tracking.
 * Constitution MOOD §2: signals must always carry status and provenance.
 */
export function createMoodSignal(opts: {
  signal: string;
  status: MoodSignalStatus;
  source: string;
  confidence?: number;
  uncertainty?: number;
  provenance?: string;
}): MoodSignal {
  const confidence = opts.confidence ?? (opts.status === 'USER_STATED' ? 1.0 : 0.5);
  const uncertainty = opts.uncertainty ?? (1.0 - confidence);
  return {
    id: `mood-signal-${uuid8()}`,
    signal: opts.signal,
    status: opts.status,
    source: opts.source,
    confidence,
    uncertainty,
    timestamp: now(),
    provenance: opts.provenance ?? opts.source,
  };
}

/**
 * Classify a context state from explicit user language or conversation signals.
 * Constitution MOOD §14: these are CONTEXT LABELS, not diagnoses.
 * Prefers USER_STATED over speculative classification.
 */
export function classifyContextState(signals: readonly MoodSignal[]): {
  context: MoodContextState;
  status: MoodSignalStatus;
  confidence: number;
} {
  // Prioritize explicit user statements
  const userStated = signals.filter(s => s.status === 'USER_STATED');
  if (userStated.length > 0) {
    const latest = userStated[userStated.length - 1];
    const mapped = mapSignalToContext(latest.signal);
    return { context: mapped, status: 'USER_STATED', confidence: latest.confidence };
  }

  // Fall back to observed signals
  const observed = signals.filter(s => s.status === 'OBSERVED');
  if (observed.length > 0) {
    const latest = observed[observed.length - 1];
    const mapped = mapSignalToContext(latest.signal);
    return { context: mapped, status: 'OBSERVED', confidence: latest.confidence };
  }

  // Inferred or insufficient evidence → UNKNOWN with low confidence
  if (signals.length > 0) {
    const latest = signals[signals.length - 1];
    const mapped = mapSignalToContext(latest.signal);
    return { context: mapped, status: 'INFERRED', confidence: Math.min(latest.confidence, 0.5) };
  }

  return { context: 'UNKNOWN', status: 'UNKNOWN', confidence: 0 };
}

function mapSignalToContext(signal: string): MoodContextState {
  const lower = signal.toLowerCase();
  const patterns: Array<[string[], MoodContextState]> = [
    [['overwhelm', 'too much', 'overload', 'swamp'], 'OVERLOADED'],
    [['frustrat', 'annoyed', 'angry', 'stuck'], 'FRUSTRATED'],
    [['urgent', 'hurry', 'rush', 'asap', 'deadline'], 'URGENT'],
    [['calm', 'relax', 'peace', 'easy'], 'CALM'],
    [['focus', 'concentrat', 'deep work', 'heads down', 'brevity', 'brief', 'concise', 'short'], 'FOCUSED'],
    [['explor', 'curiou', 'wonder', 'what if'], 'EXPLORATORY'],
    [['creat', 'design', 'imagin', 'brainstorm', 'idea'], 'CREATIVE'],
    [['uncertain', 'unsure', 'confus', 'unclear', 'lost'], 'UNCERTAIN'],
    [['reflect', 'think', 'ponder', 'consider'], 'REFLECTIVE'],
    [['social', 'chat', 'conversation', 'discuss'], 'SOCIAL'],
    [['task', 'do', 'next step', 'action', 'execute', 'build'], 'TASK_MODE'],
  ];

  for (const [keywords, state] of patterns) {
    if (keywords.some(k => lower.includes(k))) return state;
  }
  return 'UNKNOWN';
}

/**
 * Generate an interaction adaptation based on mood context.
 * Constitution MOOD §4: what autopilot MAY do (adapt tone, pacing, density).
 * Constitution MOOD §5: what autopilot MAY NOT do (manipulate, pressure, bypass).
 */
export function generateAdaptation(
  context: MoodContextState,
  level: AutopilotLevel,
): MoodAdaptation {
  const adaptations: Record<MoodContextState, Partial<MoodAdaptation>> = {
    CALM: { tone: 'conversational', pacing: 'relaxed', density: 'standard' },
    FOCUSED: { tone: 'precise', pacing: 'efficient', density: 'concise' },
    EXPLORATORY: { tone: 'open', pacing: 'relaxed', density: 'detailed' },
    CREATIVE: { tone: 'encouraging', pacing: 'flexible', density: 'standard' },
    URGENT: { tone: 'direct', pacing: 'rapid', density: 'minimal', suggestSaferAlternative: true },
    UNCERTAIN: { tone: 'supportive', pacing: 'measured', density: 'standard', suggestClarification: true },
    FRUSTRATED: { tone: 'empathetic', pacing: 'measured', density: 'concise', suggestBreak: true },
    OVERLOADED: { tone: 'gentle', pacing: 'slow', density: 'minimal', suggestBreak: true },
    REFLECTIVE: { tone: 'thoughtful', pacing: 'relaxed', density: 'detailed' },
    SOCIAL: { tone: 'warm', pacing: 'natural', density: 'standard' },
    TASK_MODE: { tone: 'direct', pacing: 'efficient', density: 'concise' },
    UNKNOWN: { tone: 'neutral', pacing: 'moderate', density: 'standard' },
  };

  const base = adaptations[context] ?? adaptations['UNKNOWN'];

  return {
    adaptationId: `adaptation-${uuid8()}`,
    tone: base.tone ?? 'neutral',
    pacing: base.pacing ?? 'moderate',
    density: base.density ?? 'standard',
    suggestBreak: base.suggestBreak ?? false,
    suggestClarification: base.suggestClarification ?? false,
    suggestSaferAlternative: base.suggestSaferAlternative ?? false,
    rationale: `Context "${context}" at autopilot level ${level}`,
    autopilotLevel: level,
    timestamp: now(),
  };
}

/**
 * Autopilot safety gate per Constitution MOOD §13.
 *
 * Before any action:
 *   MOOD SIGNAL → IS IT EXPLICIT? → IS IT RELEVANT? → IS INTERPRETATION UNCERTAIN?
 *   → PRESERVE UNCERTAINTY → DOES ACTION HAVE CONSEQUENCE? → AUTHORITY CHECK
 *   → POLICY CHECK → ADMISSION → BOUNDED ACTION
 */
export function evaluateSafetyGate(opts: {
  signal: MoodSignal;
  actionConsequential: boolean;
  authorityPresent: boolean;
  policyChecked: boolean;
}): AutopilotSafetyGateResult {
  const signalExplicit = opts.signal.status === 'USER_STATED' || opts.signal.status === 'OBSERVED';
  const signalRelevant = opts.signal.confidence > 0.3;
  const interpretationUncertain = opts.signal.uncertainty > 0.5;

  let admissionResult: ChangeDecision;
  let rationale: string;

  if (!signalExplicit && opts.actionConsequential) {
    admissionResult = 'DENY';
    rationale = 'Non-explicit signal cannot authorize consequential action';
  } else if (opts.actionConsequential && !opts.authorityPresent) {
    admissionResult = 'REVIEW';
    rationale = 'Consequential action requires explicit authority — mood cannot grant';
  } else if (interpretationUncertain && opts.actionConsequential) {
    admissionResult = 'REVIEW';
    rationale = 'Uncertain interpretation with consequential action — preserving uncertainty';
  } else if (!opts.policyChecked && opts.actionConsequential) {
    admissionResult = 'DENY';
    rationale = 'Policy not checked for consequential action';
  } else if (signalExplicit && signalRelevant && !opts.actionConsequential) {
    admissionResult = 'ALLOW';
    rationale = 'Explicit, relevant signal for non-consequential adaptation';
  } else {
    admissionResult = 'REVIEW';
    rationale = 'Default to review — fail closed';
  }

  return {
    signalExplicit,
    signalRelevant,
    interpretationUncertain,
    actionConsequential: opts.actionConsequential,
    authorityPresent: opts.authorityPresent,
    policyChecked: opts.policyChecked,
    admissionResult,
    rationale,
  };
}

/**
 * Store a mood signal in memory with proper epistemic qualification.
 * Constitution MOOD §12: Never store MOOD INFERENCE → PERMANENT PERSONAL TRUTH.
 */
export function recordMoodMemory(signal: MoodSignal): MoodMemoryRecord {
  return {
    id: `mood-mem-${uuid8()}`,
    signal: signal.signal,
    status: signal.status,
    source: signal.source,
    confidence: signal.confidence,
    uncertainty: signal.uncertainty,
    timestamp: signal.timestamp,
    provenance: signal.provenance,
    userCorrection: signal.userCorrection,
  };
}

/**
 * Merge multi-agent mood signals per Constitution MOOD §17.
 * Do NOT force consensus. Preserve sources, compare, identify explicit signals,
 * retain disagreement, adapt safely.
 */
export function mergeAgentSignals(
  agentSignals: readonly MoodSignal[],
): {
  explicitSignals: readonly MoodSignal[];
  inferredSignals: readonly MoodSignal[];
  disagreements: readonly string[];
  recommendedContext: MoodContextState;
  confidence: number;
} {
  const explicit = agentSignals.filter(
    s => s.status === 'USER_STATED' || s.status === 'OBSERVED',
  );
  const inferred = agentSignals.filter(
    s => s.status === 'INFERRED' || s.status === 'SIMULATED',
  );

  // Detect disagreements
  const contexts = agentSignals.map(s => mapSignalToContext(s.signal));
  const uniqueContexts = [...new Set(contexts)];
  const disagreements: string[] = [];
  if (uniqueContexts.length > 1) {
    disagreements.push(
      `Agent signals disagree on context: ${uniqueContexts.join(', ')}. Preserving plurality.`,
    );
  }

  // Prioritize explicit signals for recommendation
  if (explicit.length > 0) {
    const classified = classifyContextState(explicit);
    return {
      explicitSignals: explicit,
      inferredSignals: inferred,
      disagreements,
      recommendedContext: classified.context,
      confidence: classified.confidence,
    };
  }

  // Fall back to aggregate of all signals
  const classified = classifyContextState(agentSignals);
  return {
    explicitSignals: explicit,
    inferredSignals: inferred,
    disagreements,
    recommendedContext: classified.context,
    confidence: Math.min(classified.confidence, 0.5), // Cap at 0.5 for inferred
  };
}

/* ─── 🔥 Main Autopilot Engine ───────────────────────────────────── */

/**
 * The Autopilot Mood Engine.
 * Constitution MOOD §16 conceptual API:
 *   observeMood() → classifyMood() → contextualizeMood() → preserveUncertainty()
 *   → generateAdaptation() → checkAuthority() → propose()
 *   → executeIfAuthorized() → observe() → reconcile() → remember()
 *
 * NEVER: detectMood() → automaticallyExecuteAnythingConsequential()
 */
export class AutopilotMoodEngine {
  private level: AutopilotLevel = 1;
  private readonly signals: MoodSignal[] = [];
  private readonly memory: MoodMemoryRecord[] = [];
  private currentMood: AutopilotMoodState;

  constructor(opts?: { level?: AutopilotLevel; language?: string }) {
    this.level = opts?.level ?? 1;
    this.currentMood = {
      context: 'UNKNOWN',
      signals: [],
      language: opts?.language ?? 'en',
      relationship: 'collaborative',
      values: ['truth', 'dignity', 'safety', 'service', 'human-agency', 'pluralism', 'care'],
      intent: '',
      uncertainty: 1.0,
      provenance: 'autopilot-engine-init',
      timestamp: now(),
      status: 'UNKNOWN',
    };
  }

  /**
   * §16 Step 1: Observe a mood signal from any source.
   */
  observe(opts: {
    signal: string;
    status: MoodSignalStatus;
    source: string;
    confidence?: number;
  }): MoodSignal {
    const sig = createMoodSignal(opts);
    this.signals.push(sig);
    return sig;
  }

  /**
   * §16 Step 2-4: Classify, contextualize, and preserve uncertainty.
   */
  classify(): AutopilotMoodState {
    const classification = classifyContextState(this.signals);
    this.currentMood = {
      context: classification.context,
      signals: [...this.signals],
      language: this.currentMood.language,
      relationship: this.currentMood.relationship,
      values: this.currentMood.values,
      intent: this.currentMood.intent,
      uncertainty: 1.0 - classification.confidence,
      provenance: 'autopilot-engine-classify',
      timestamp: now(),
      status: classification.status,
    };
    return this.currentMood;
  }

  /**
   * §16 Step 5: Generate an adaptation proposal (not an action).
   */
  adapt(): MoodAdaptation {
    return generateAdaptation(this.currentMood.context, this.level);
  }

  /**
   * §16 Step 6: Evaluate safety gate before any proposed action.
   * Constitution MOOD §13 — the critical boundary: MOOD → ADAPTATION, NOT MOOD → AUTHORITY.
   */
  checkSafetyGate(opts: {
    actionConsequential: boolean;
    authorityPresent: boolean;
    policyChecked: boolean;
  }): AutopilotSafetyGateResult {
    const latestSignal = this.signals[this.signals.length - 1];
    if (!latestSignal) {
      return {
        signalExplicit: false,
        signalRelevant: false,
        interpretationUncertain: true,
        actionConsequential: opts.actionConsequential,
        authorityPresent: opts.authorityPresent,
        policyChecked: opts.policyChecked,
        admissionResult: 'DENY',
        rationale: 'No mood signal observed — fail closed',
      };
    }
    return evaluateSafetyGate({ signal: latestSignal, ...opts });
  }

  /**
   * §16 Step 10: Remember mood signals with epistemic provenance.
   * Never store MOOD INFERENCE → PERMANENT PERSONAL TRUTH.
   */
  remember(): MoodMemoryRecord[] {
    const records: MoodMemoryRecord[] = [];
    for (const sig of this.signals) {
      const record = recordMoodMemory(sig);
      this.memory.push(record);
      records.push(record);
    }
    return records;
  }

  /**
   * Get the full engine snapshot for inspection/serialization.
   */
  getState(): AutopilotEngineState {
    return {
      level: this.level,
      mood: this.currentMood,
      adaptation: null,
      safetyGate: null,
      memoryRecords: [...this.memory],
      agentSignals: [...this.signals],
      evaluatedAt: now(),
    };
  }

  /**
   * Set the autopilot level.
   * Constitution MOOD §3: Level 5 requires explicit Ω∞v admission — mood never grants it.
   */
  setLevel(level: AutopilotLevel): void {
    if (level === 5) {
      throw new Error(
        'AUTOPILOT_LEVEL_DENIED: Level 5 (CONSEQUENTIAL) requires explicit Ω∞v admission. ' +
        'Mood autopilot cannot grant consequential authority. MOOD ≠ AUTHORITY.',
      );
    }
    this.level = level;
  }

  /** Get the current autopilot level. */
  getLevel(): AutopilotLevel { return this.level; }

  /** Get accumulated signals. */
  getSignals(): readonly MoodSignal[] { return [...this.signals]; }

  /** Get memory records. */
  getMemory(): readonly MoodMemoryRecord[] { return [...this.memory]; }

  /** Get current mood state. */
  getMood(): AutopilotMoodState { return this.currentMood; }

  /**
   * §17: Merge multi-agent signals with pluralism preserved.
   */
  mergeAgentSignals(agentSignals: readonly MoodSignal[]): ReturnType<typeof mergeAgentSignals> {
    // Store external agent signals
    for (const sig of agentSignals) {
      this.signals.push(sig);
    }
    return mergeAgentSignals(this.signals);
  }

  /**
   * §18: Self-learning with bounded qualification.
   * OBSERVE → LEARN PATTERN → PROPOSE ADAPTATION → VALIDATE → USER-CORRECT → UPDATE
   * NOT: LEARN → ASSUME → PERMANENTLY PROFILE → ACT
   */
  applyUserCorrection(signalId: string, correction: string): MoodSignal | null {
    const idx = this.signals.findIndex(s => s.id === signalId);
    if (idx === -1) return null;

    // Create a corrected copy (immutable signal, new entry)
    const corrected = createMoodSignal({
      signal: correction,
      status: 'USER_STATED',
      source: 'user-correction',
      confidence: 1.0,
      provenance: `correction-of-${signalId}`,
    });
    this.signals.push(corrected);

    // Mark the old memory record as superseded
    const memIdx = this.memory.findIndex(m => m.id.includes(signalId) || m.signal === this.signals[idx].signal);
    if (memIdx !== -1) {
      // Create superseded record (memory is append-only, §13 KAI)
      const superseded: MoodMemoryRecord = {
        ...this.memory[memIdx],
        supersededBy: corrected.id,
      };
      this.memory[memIdx] = superseded;
    }

    return corrected;
  }

  /**
   * Run the full autopilot pipeline per §16:
   *   observe → classify → adapt → safetyGate → remember
   *
   * Returns the complete result without executing anything consequential.
   * MOOD → EXPERIENCE, Ω∞v → REALITY, AUTHORITY → ACTION.
   */
  runPipeline(opts: {
    signal: string;
    status: MoodSignalStatus;
    source: string;
    actionConsequential?: boolean;
    authorityPresent?: boolean;
    policyChecked?: boolean;
  }): {
    signal: MoodSignal;
    mood: AutopilotMoodState;
    adaptation: MoodAdaptation;
    safetyGate: AutopilotSafetyGateResult;
    memoryRecords: MoodMemoryRecord[];
  } {
    // 1. Observe
    const signal = this.observe({
      signal: opts.signal,
      status: opts.status,
      source: opts.source,
    });

    // 2-4. Classify + contextualize + preserve uncertainty
    const mood = this.classify();

    // 5. Generate adaptation
    const adaptation = this.adapt();

    // 6. Safety gate
    const safetyGate = this.checkSafetyGate({
      actionConsequential: opts.actionConsequential ?? false,
      authorityPresent: opts.authorityPresent ?? false,
      policyChecked: opts.policyChecked ?? false,
    });

    // 10. Remember
    const memoryRecords = this.remember();

    return { signal, mood, adaptation, safetyGate, memoryRecords };
  }
}
