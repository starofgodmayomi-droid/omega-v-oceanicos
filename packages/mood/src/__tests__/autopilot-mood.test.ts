/**
 * 🔥 Autopilot Mood Engine — Unit Tests
 *
 * Tests per Constitution MOOD §§1-23:
 * - Signal creation with provenance (§2)
 * - Autopilot levels including Level 5 denial (§3)
 * - Context classification preferring USER_STATED (§14)
 * - Safety gate fail-closed behavior (§13)
 * - Memory recording with epistemic qualification (§12)
 * - Multi-agent signal merging with pluralism (§17)
 * - User correction / self-learning (§18)
 * - Full pipeline execution (§16)
 * - MOOD ≠ AUTHORITY invariant (§1)
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  AutopilotMoodEngine,
  createMoodSignal,
  classifyContextState,
  generateAdaptation,
  evaluateSafetyGate,
  recordMoodMemory,
  mergeAgentSignals,
  // Preserved exports
  OceanicosWaterKernel,
  CopilotAntigravityController,
  DEFAULT_COPILOT_MODE,
} from '../index.js';

/* ─── §2: Signal Creation ───────────────────────────────────────── */

describe('createMoodSignal (§2)', () => {
  it('creates a USER_STATED signal with confidence 1.0', () => {
    const sig = createMoodSignal({
      signal: 'I am overwhelmed',
      status: 'USER_STATED',
      source: 'conversation',
    });
    expect(sig.status).toBe('USER_STATED');
    expect(sig.confidence).toBe(1.0);
    expect(sig.uncertainty).toBe(0);
    expect(sig.id).toMatch(/^mood-signal-/);
    expect(sig.provenance).toBe('conversation');
  });

  it('creates an INFERRED signal with default confidence 0.5', () => {
    const sig = createMoodSignal({
      signal: 'possibly frustrated',
      status: 'INFERRED',
      source: 'tone-analysis',
    });
    expect(sig.status).toBe('INFERRED');
    expect(sig.confidence).toBe(0.5);
    expect(sig.uncertainty).toBe(0.5);
  });

  it('preserves custom confidence/uncertainty', () => {
    const sig = createMoodSignal({
      signal: 'user typing fast',
      status: 'OBSERVED',
      source: 'input-metrics',
      confidence: 0.8,
      uncertainty: 0.2,
    });
    expect(sig.confidence).toBe(0.8);
    expect(sig.uncertainty).toBe(0.2);
  });
});

/* ─── §14: Context Classification ────────────────────────────────── */

describe('classifyContextState (§14)', () => {
  it('prefers USER_STATED over INFERRED', () => {
    const inferred = createMoodSignal({ signal: 'frustrated', status: 'INFERRED', source: 'ai' });
    const stated = createMoodSignal({ signal: 'I am calm', status: 'USER_STATED', source: 'user' });
    const result = classifyContextState([inferred, stated]);
    expect(result.context).toBe('CALM');
    expect(result.status).toBe('USER_STATED');
  });

  it('returns UNKNOWN when no signals exist', () => {
    const result = classifyContextState([]);
    expect(result.context).toBe('UNKNOWN');
    expect(result.status).toBe('UNKNOWN');
    expect(result.confidence).toBe(0);
  });

  it('classifies OVERLOADED from user statement', () => {
    const sig = createMoodSignal({ signal: 'I am overwhelmed', status: 'USER_STATED', source: 'chat' });
    const result = classifyContextState([sig]);
    expect(result.context).toBe('OVERLOADED');
  });

  it('classifies TASK_MODE from explicit signals', () => {
    const sig = createMoodSignal({ signal: 'just give me the next step', status: 'USER_STATED', source: 'chat' });
    const result = classifyContextState([sig]);
    expect(result.context).toBe('TASK_MODE');
  });

  it('caps INFERRED confidence at 0.5', () => {
    const sig = createMoodSignal({ signal: 'seems urgent', status: 'INFERRED', source: 'ai', confidence: 0.9 });
    const result = classifyContextState([sig]);
    expect(result.confidence).toBeLessThanOrEqual(0.5);
  });
});

/* ─── §4 / §5: Adaptation Generation ────────────────────────────── */

describe('generateAdaptation (§4)', () => {
  it('generates minimal density for OVERLOADED', () => {
    const adaptation = generateAdaptation('OVERLOADED', 2);
    expect(adaptation.density).toBe('minimal');
    expect(adaptation.suggestBreak).toBe(true);
    expect(adaptation.tone).toBe('gentle');
  });

  it('generates concise density for FOCUSED', () => {
    const adaptation = generateAdaptation('FOCUSED', 1);
    expect(adaptation.density).toBe('concise');
    expect(adaptation.tone).toBe('precise');
  });

  it('generates neutral defaults for UNKNOWN', () => {
    const adaptation = generateAdaptation('UNKNOWN', 0);
    expect(adaptation.tone).toBe('neutral');
    expect(adaptation.density).toBe('standard');
  });

  it('suggests clarification for UNCERTAIN', () => {
    const adaptation = generateAdaptation('UNCERTAIN', 2);
    expect(adaptation.suggestClarification).toBe(true);
  });
});

/* ─── §13: Safety Gate ───────────────────────────────────────────── */

describe('evaluateSafetyGate (§13)', () => {
  it('DENIES consequential action from non-explicit signal', () => {
    const sig = createMoodSignal({ signal: 'maybe rushed', status: 'INFERRED', source: 'ai' });
    const result = evaluateSafetyGate({
      signal: sig,
      actionConsequential: true,
      authorityPresent: false,
      policyChecked: false,
    });
    expect(result.admissionResult).toBe('DENY');
    expect(result.signalExplicit).toBe(false);
  });

  it('sends consequential action to REVIEW when authority is missing', () => {
    const sig = createMoodSignal({ signal: 'I need this now', status: 'USER_STATED', source: 'user' });
    const result = evaluateSafetyGate({
      signal: sig,
      actionConsequential: true,
      authorityPresent: false,
      policyChecked: true,
    });
    expect(result.admissionResult).toBe('REVIEW');
  });

  it('ALLOWS non-consequential adaptation from explicit signal', () => {
    const sig = createMoodSignal({ signal: 'keep it short', status: 'USER_STATED', source: 'user' });
    const result = evaluateSafetyGate({
      signal: sig,
      actionConsequential: false,
      authorityPresent: false,
      policyChecked: false,
    });
    expect(result.admissionResult).toBe('ALLOW');
    expect(result.signalExplicit).toBe(true);
    expect(result.signalRelevant).toBe(true);
  });

  it('DENIES when policy not checked for consequential action', () => {
    const sig = createMoodSignal({ signal: 'do it', status: 'OBSERVED', source: 'ui' });
    const result = evaluateSafetyGate({
      signal: sig,
      actionConsequential: true,
      authorityPresent: true,
      policyChecked: false,
    });
    expect(result.admissionResult).toBe('DENY');
  });
});

/* ─── §12: Memory Recording ─────────────────────────────────────── */

describe('recordMoodMemory (§12)', () => {
  it('records signal with all provenance fields', () => {
    const sig = createMoodSignal({ signal: 'keep responses short', status: 'USER_STATED', source: 'conversation' });
    const record = recordMoodMemory(sig);
    expect(record.status).toBe('USER_STATED');
    expect(record.signal).toBe('keep responses short');
    expect(record.id).toMatch(/^mood-mem-/);
    expect(record.provenance).toBe('conversation');
  });
});

/* ─── §17: Multi-Agent Signal Merging ────────────────────────────── */

describe('mergeAgentSignals (§17)', () => {
  it('preserves disagreements between agents', () => {
    const agentA = createMoodSignal({ signal: 'user appears rushed', status: 'INFERRED', source: 'agent-A' });
    const agentB = createMoodSignal({ signal: 'user appears frustrated', status: 'INFERRED', source: 'agent-B' });
    const agentC = createMoodSignal({ signal: 'insufficient evidence', status: 'UNKNOWN', source: 'agent-C' });

    const result = mergeAgentSignals([agentA, agentB, agentC]);
    expect(result.disagreements.length).toBeGreaterThan(0);
    expect(result.inferredSignals.length).toBe(2);
    expect(result.confidence).toBeLessThanOrEqual(0.5);
  });

  it('prioritizes explicit USER_STATED signal over inferred', () => {
    const inferred = createMoodSignal({ signal: 'seems urgent', status: 'INFERRED', source: 'agent-A' });
    const stated = createMoodSignal({ signal: 'I want brevity', status: 'USER_STATED', source: 'user' });

    const result = mergeAgentSignals([inferred, stated]);
    expect(result.explicitSignals.length).toBe(1);
    expect(result.recommendedContext).not.toBe('UNKNOWN');
  });
});

/* ─── §3: Autopilot Levels ───────────────────────────────────────── */

describe('AutopilotMoodEngine Levels (§3)', () => {
  let engine: AutopilotMoodEngine;

  beforeEach(() => {
    engine = new AutopilotMoodEngine();
  });

  it('defaults to level 1 (REFLECTIVE)', () => {
    expect(engine.getLevel()).toBe(1);
  });

  it('allows setting levels 0-4', () => {
    for (const level of [0, 1, 2, 3, 4] as const) {
      engine.setLevel(level);
      expect(engine.getLevel()).toBe(level);
    }
  });

  it('THROWS on level 5 — MOOD NEVER GRANTS CONSEQUENTIAL', () => {
    expect(() => engine.setLevel(5)).toThrow('AUTOPILOT_LEVEL_DENIED');
  });
});

/* ─── §16: Full Pipeline ─────────────────────────────────────────── */

describe('AutopilotMoodEngine.runPipeline (§16)', () => {
  let engine: AutopilotMoodEngine;

  beforeEach(() => {
    engine = new AutopilotMoodEngine({ level: 2 });
  });

  it('runs full observe → classify → adapt → gate → remember pipeline', () => {
    const result = engine.runPipeline({
      signal: 'I am overwhelmed. Just give me the next step.',
      status: 'USER_STATED',
      source: 'conversation',
    });

    // Signal recorded
    expect(result.signal.status).toBe('USER_STATED');

    // Context classified
    expect(result.mood.context).toBe('OVERLOADED');
    expect(result.mood.status).toBe('USER_STATED');

    // Adaptation generated
    expect(result.adaptation.density).toBe('minimal');
    expect(result.adaptation.suggestBreak).toBe(true);

    // Safety gate — non-consequential by default
    expect(result.safetyGate.admissionResult).toBe('ALLOW');

    // Memory recorded
    expect(result.memoryRecords.length).toBeGreaterThan(0);
    expect(result.memoryRecords[0].status).toBe('USER_STATED');
  });

  it('sends consequential action to REVIEW even with explicit signal', () => {
    const result = engine.runPipeline({
      signal: 'deploy it now',
      status: 'USER_STATED',
      source: 'user',
      actionConsequential: true,
      authorityPresent: false,
    });
    expect(result.safetyGate.admissionResult).toBe('REVIEW');
  });

  it('DENIES consequential action from inferred signal', () => {
    const result = engine.runPipeline({
      signal: 'seems urgent based on typing speed',
      status: 'INFERRED',
      source: 'input-metrics',
      actionConsequential: true,
    });
    expect(result.safetyGate.admissionResult).toBe('DENY');
  });
});

/* ─── §18: User Correction / Self-Learning ───────────────────────── */

describe('AutopilotMoodEngine.applyUserCorrection (§18)', () => {
  it('creates USER_STATED correction and supersedes old memory', () => {
    const engine = new AutopilotMoodEngine();
    const original = engine.observe({ signal: 'seems rushed', status: 'INFERRED', source: 'ai' });
    engine.remember();

    const corrected = engine.applyUserCorrection(original.id, 'I am actually calm, just typing fast');
    expect(corrected).not.toBeNull();
    expect(corrected!.status).toBe('USER_STATED');
    expect(corrected!.confidence).toBe(1.0);
  });

  it('returns null for unknown signal ID', () => {
    const engine = new AutopilotMoodEngine();
    expect(engine.applyUserCorrection('nonexistent', 'whatever')).toBeNull();
  });
});

/* ─── §1: MOOD ≠ AUTHORITY Invariant ─────────────────────────────── */

describe('MOOD ≠ AUTHORITY Invariant (§1)', () => {
  it('safety gate never allows consequential action without authority', () => {
    const engine = new AutopilotMoodEngine({ level: 4 });

    // Even at max mood-autopilot level (4), consequential without authority → REVIEW/DENY
    const result = engine.runPipeline({
      signal: 'do it immediately please',
      status: 'USER_STATED',
      source: 'user',
      actionConsequential: true,
      authorityPresent: false,
      policyChecked: true,
    });
    expect(['REVIEW', 'DENY']).toContain(result.safetyGate.admissionResult);
  });
});

/* ─── Preserved Exports Backward Compatibility ───────────────────── */

describe('Preserved exports (backward compatibility)', () => {
  it('DEFAULT_COPILOT_MODE is frozen', () => {
    expect(Object.isFrozen(DEFAULT_COPILOT_MODE)).toBe(true);
    expect(DEFAULT_COPILOT_MODE.realityFirst).toBe(true);
    expect(DEFAULT_COPILOT_MODE.dissent).toBe('PRESERVE');
  });

  it('OceanicosWaterKernel.reflectMood returns valid liquid state', () => {
    const state = OceanicosWaterKernel.reflectMood('test');
    expect(state.velocity).toBeGreaterThan(0);
    expect(state.clarityVector).toBe(1.0);
    expect(state.blockAnchor).toHaveLength(64);
  });

  it('CopilotAntigravityController.processSignal returns correct structure', () => {
    const result = CopilotAntigravityController.processSignal('FRICTION', 'test-context');
    expect(result.signal).toBe('FRICTION');
    expect(result.action).toBe('LOCALIZE');
    expect(result.authorityCheck).toBe('CANNOT_SELF_AUTHORIZE');
  });
});
