import { MoodAutopilotEngine } from '../engine';

describe('MoodAutopilotEngine — governed autopilot loop', () => {
  it('starts PASSIVE/UNKNOWN with no signals and never asserts authority', () => {
    const engine = new MoodAutopilotEngine();
    const snapshot = engine.snapshot();

    expect(snapshot.state).toBe('UNKNOWN');
    expect(snapshot.level).toBe(0);
    expect(snapshot.levelLabel).toBe('PASSIVE');
    expect(snapshot.authority).toBe('UNCHANGED');
    expect(snapshot.proposal.adaptation).toBe('PRESERVE_DEFAULT');
    expect(snapshot.coreLaw.moodNotAuthority).toBe(true);
  });

  it('observes an explicit user signal, adapts experience only, keeps authority unchanged', () => {
    const engine = new MoodAutopilotEngine();
    const context = engine.observe(
      { signal: 'keep responses short today', status: 'USER_STATED', source: 'conversation', provenance: 'explicit-user-expression' },
    );
    const snapshot = engine.snapshot();

    expect(context.status).toBe('USER_STATED');
    expect(snapshot.state).toBe('TASK_MODE');
    expect(snapshot.level).toBe(1); // REFLECTIVE — adapt wording/pacing
    expect(snapshot.proposal.decision).toBe('ADAPT_ONLY');
    expect(snapshot.proposal.adaptation).toBe('ADAPT_EXPERIENCE');
    expect(snapshot.authority).toBe('UNCHANGED');
  });

  it('never upgrades an inference into an observation or acts on inference alone', () => {
    const engine = new MoodAutopilotEngine();
    engine.observe({ signal: 'user may be rushed', status: 'INFERRED', source: 'timing' });
    const snapshot = engine.snapshot();

    expect(snapshot.state).toBe('UNCERTAIN');
    expect(snapshot.level).toBe(0); // PASSIVE — no adaptation on inference alone
    expect(snapshot.context.status).toBe('INFERRED');
    expect(snapshot.proposal.adaptation).toBe('PRESERVE_DEFAULT');
  });

  it('preserves multi-agent dissent as UNCERTAINTY rather than forcing consensus', () => {
    const engine = new MoodAutopilotEngine();
    engine.observe({ signal: 'user appears rushed', status: 'INFERRED', source: 'agent-a' }, { agentId: 'a' });
    engine.observe({ signal: 'user appears frustrated', status: 'INFERRED', source: 'agent-b' }, { agentId: 'b' });
    const snapshot = engine.snapshot();

    expect(snapshot.state).toBe('UNCERTAIN');
    expect(snapshot.multiAgent.dissent).toBe(true);
    expect(snapshot.multiAgent.agents).toBe(2);
    expect(snapshot.level).toBe(0);
  });

  it('escalates to PROACTIVE for overloaded/urgent signals but still cannot authorize', () => {
    const engine = new MoodAutopilotEngine();
    engine.observe({ signal: 'I am overwhelmed, just give me the next step', status: 'USER_STATED', source: 'conversation' });
    const snapshot = engine.snapshot();

    expect(snapshot.state).toBe('OVERLOADED');
    expect(snapshot.level).toBe(3); // PROACTIVE: suggest breaks/clarification
    expect(snapshot.authority).toBe('UNCHANGED');
  });

  it('safety gate denies unsafe and routes consequential to REVIEW', () => {
    const engine = new MoodAutopilotEngine();
    engine.observe({ signal: 'keep it short', status: 'USER_STATED', source: 'conversation' });

    expect(engine.safetyGate({ unsafe: true })).toBe('DENY');
    expect(engine.safetyGate({ consequential: true })).toBe('REVIEW');
    expect(engine.safetyGate({})).toBe('ADAPT_ONLY');
    expect(engine.propose({ consequential: true }).decision).toBe('REVIEW');
    expect(engine.propose({ unsafe: true }).decision).toBe('DENY');
  });

  it('remembers signals with provenance and accepts user corrections', () => {
    const engine = new MoodAutopilotEngine();
    engine.observe({ signal: 'keep responses short today', status: 'USER_STATED', source: 'conversation', provenance: 'explicit-user-expression' });
    engine.observe({ signal: 'actually, normal length is fine', status: 'USER_STATED', source: 'conversation' });

    expect(engine.snapshot().memory.count).toBe(2);
    const corrected = engine.reconcile('keep responses short today', 'user retracted short preference');
    expect(corrected).toHaveLength(1);
    expect(corrected[0].userCorrection).toBe('user retracted short preference');
  });

  it('uses context (language/relationship/history) to reach CONTEXTUAL level', () => {
    const engine = new MoodAutopilotEngine();
    engine.observe(
      { signal: 'explain this', status: 'USER_STATED', source: 'conversation' },
      { language: 'pidgin', relationship: 'peer', intent: 'understand' },
    );
    const snapshot = engine.snapshot();

    expect(snapshot.level).toBe(2); // CONTEXTUAL
    expect(snapshot.context.language).toBe('pidgin');
  });
});
