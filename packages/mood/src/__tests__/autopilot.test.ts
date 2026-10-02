import {
  createMoodContext,
  normalizeMoodSignal,
  proposeMoodAdaptation,
  proposeMoodCodex,
} from '../autopilot';

describe('bounded autopilot mood contract', () => {
  it('preserves an explicit user signal as USER_STATED with provenance', () => {
    const signal = normalizeMoodSignal({
      signal: 'keep responses short today',
      status: 'USER_STATED',
      source: 'conversation',
      provenance: 'explicit-user-expression',
    });

    expect(signal.status).toBe('USER_STATED');
    expect(signal.uncertainty).toBe(0);
    expect(signal.provenance).toBe('explicit-user-expression');
  });

  it('does not upgrade an inference into an observation', () => {
    const signal = normalizeMoodSignal({
      signal: 'user may be rushed',
      status: 'INFERRED',
      source: 'interaction-timing',
    });

    expect(signal.status).toBe('INFERRED');
    expect(signal.uncertainty).toBe(1);
  });

  it('defaults an empty context to UNKNOWN and preserves uncertainty', () => {
    const context = createMoodContext();
    const proposal = proposeMoodAdaptation(context);

    expect(context.status).toBe('UNKNOWN');
    expect(context.uncertainty).toBe(1);
    expect(proposal.level).toBe(0);
    expect(proposal.adaptation).toBe('PRESERVE_DEFAULT');
    expect(proposal.authority).toBe('UNCHANGED');
  });

  it('permits presentation adaptation but never consequential action', () => {
    const context = createMoodContext({
      context: 'user requested concise responses',
      intent: 'reduce response density',
      signals: [
        {
          signal: 'keep responses short today',
          status: 'USER_STATED',
          source: 'conversation',
          confidence: 1,
          uncertainty: 0,
          timestamp: new Date().toISOString(),
          provenance: 'explicit-user-expression',
        },
      ],
      status: 'USER_STATED',
    });

    const adaptation = proposeMoodAdaptation(context);
    const consequential = proposeMoodAdaptation(context, { consequential: true });

    expect(adaptation.decision).toBe('ADAPT_ONLY');
    expect(adaptation.level).toBe(1);
    expect(adaptation.authority).toBe('UNCHANGED');
    expect(consequential.decision).toBe('REVIEW');
    expect(consequential.authority).toBe('UNCHANGED');
  });

  it('denies explicitly unsafe adaptation requests', () => {
    const proposal = proposeMoodAdaptation(createMoodContext(), { unsafe: true });

    expect(proposal.decision).toBe('DENY');
    expect(proposal.adaptation).toBe('PRESERVE_DEFAULT');
  });

  it('creates a finite Codex plan without authority or execution', () => {
    const codex = proposeMoodCodex(createMoodContext({
      intent: 'improve the next bounded interaction',
      status: 'USER_STATED',
      signals: [{ signal: 'needs calm pacing', status: 'USER_STATED', source: 'conversation', confidence: 1, uncertainty: 0, timestamp: '2026-09-25T00:00:00.000Z', provenance: 'explicit-user-expression' }],
      uncertainty: 0,
    }), new Date('2026-09-25T00:00:00.000Z'));

    expect(codex.decision).toBe('PROPOSE');
    expect(codex.steps).toHaveLength(5);
    expect(codex.steps[0].action).toBe('DISTINGUISH');
    expect(codex.authority).toBe('UNCHANGED');
    expect(codex.execution).toBe('NOT_EXECUTED');
    expect(codex.createdAt).toBe('2026-09-25T00:00:00.000Z');
  });

  it('routes uncertain or unsafe Codex intents to review or denial', () => {
    expect(proposeMoodCodex(createMoodContext({ intent: 'improve the workflow' })).decision).toBe('REVIEW');
    expect(proposeMoodCodex(createMoodContext({ intent: 'deploy to production now', status: 'USER_STATED' })).decision).toBe('DENY');
  });
});
