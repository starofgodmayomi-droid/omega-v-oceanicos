import { reconcile, STRICT_POLICY, type Opinion, type DissensusPolicy } from '../index';

const opinion = (over: Partial<Opinion> = {}): Opinion => ({
  verifierId: 'rules',
  verifierVersion: '1.0.0',
  passed: true,
  confidence: 0.9,
  reason: 'fixture',
  ...over,
});

const loose: DissensusPolicy = { humanOnSplit: false, minimumConfidence: 0, quorum: 1 };

describe('reconcile — agreement', () => {
  it('agrees and routes automatically when every verifier passes', () => {
    const result = reconcile([opinion(), opinion({ verifierId: 'model', confidence: 0.8 })]);

    expect(result.verdict).toBe('AGREED');
    expect(result.routing).toBe('AUTO');
    expect(result.agreed).toBe(true);
    expect(result.dissenting).toEqual([]);
  });

  it('agrees on a negative verdict just as readily as a positive one', () => {
    const result = reconcile([
      opinion({ passed: false }),
      opinion({ verifierId: 'model', passed: false }),
    ]);

    expect(result.verdict).toBe('AGREED');
    expect(result.agreed).toBe(false);
    expect(result.routing).toBe('AUTO');
  });

  it('reports the minimum confidence, never the mean', () => {
    const result = reconcile([
      opinion({ confidence: 1 }),
      opinion({ verifierId: 'model', confidence: 0.72 }),
    ]);

    // The mean would be 0.86 and would clear a 0.8 bar this should not.
    expect(result.confidence).toBe(0.72);
  });

  it('routes agreement to a human when it is not confident enough', () => {
    const result = reconcile([
      opinion({ confidence: 0.6 }),
      opinion({ verifierId: 'model', confidence: 0.65 }),
    ]);

    expect(result.verdict).toBe('AGREED');
    expect(result.routing).toBe('HUMAN');
    expect(result.reason).toContain('below');
  });
});

describe('reconcile — disagreement', () => {
  it('reports a split rather than choosing a side', () => {
    const result = reconcile([
      opinion({ passed: true }),
      opinion({ verifierId: 'model', passed: false }),
    ]);

    expect(result.verdict).toBe('SPLIT');
    expect(result.agreed).toBeNull();
    expect(result.routing).toBe('HUMAN');
  });

  it('refuses to resolve 2-1 by majority', () => {
    const result = reconcile([
      opinion({ verifierId: 'rules', passed: true }),
      opinion({ verifierId: 'model', passed: true }),
      opinion({ verifierId: 'second-model', passed: false, reason: 'contradicted by source' }),
    ]);

    // A majority vote would report AGREED and discard the objection.
    expect(result.verdict).toBe('SPLIT');
    expect(result.agreed).toBeNull();
    expect(result.dissenting.map((entry) => entry.verifierId)).toEqual(['second-model']);
  });

  it('keeps every opinion, including the ones it disagrees with', () => {
    const opinions = [opinion({ passed: true }), opinion({ verifierId: 'model', passed: false })];

    expect(reconcile(opinions).opinions).toEqual(opinions);
  });

  it('carries both sides as dissent when the split is even', () => {
    const result = reconcile([
      opinion({ verifierId: 'a', passed: true }),
      opinion({ verifierId: 'b', passed: false }),
    ]);

    expect(result.dissenting).toHaveLength(2);
  });

  it('can be told to proceed on a split, but only explicitly', () => {
    const result = reconcile(
      [opinion({ passed: true }), opinion({ verifierId: 'model', passed: false })],
      loose
    );

    expect(result.verdict).toBe('SPLIT');
    expect(result.routing).toBe('AUTO');
    // The verdict does not soften just because routing did.
    expect(result.agreed).toBeNull();
  });
});

describe('reconcile — the unknowable', () => {
  it('treats "could not determine" as dissent, not as agreement', () => {
    const result = reconcile([
      opinion({ passed: true }),
      opinion({ verifierId: 'model', passed: null, reason: 'no evidence retrieved' }),
    ]);

    expect(result.verdict).toBe('UNKNOWN');
    expect(result.agreed).toBeNull();
    expect(result.dissenting.map((entry) => entry.verifierId)).toContain('model');
  });

  it('reports UNKNOWN when nobody determined anything', () => {
    const result = reconcile([
      opinion({ passed: null }),
      opinion({ verifierId: 'model', passed: null }),
    ]);

    expect(result.verdict).toBe('UNKNOWN');
    expect(result.routing).toBe('HUMAN');
    expect(result.reason).toContain('no verifier reached a determination');
  });

  it('refuses a verdict below quorum', () => {
    const result = reconcile([opinion()]);

    expect(result.verdict).toBe('UNKNOWN');
    expect(result.routing).toBe('HUMAN');
    expect(result.reason).toContain('quorum');
  });

  it('reports UNKNOWN for an empty set rather than vacuous agreement', () => {
    const result = reconcile([]);

    expect(result.verdict).toBe('UNKNOWN');
    expect(result.confidence).toBe(0);
  });

  it('refuses to count one verifier answering twice as agreement', () => {
    const result = reconcile([opinion({ passed: true }), opinion({ passed: true })]);

    expect(result.verdict).toBe('UNKNOWN');
    expect(result.routing).toBe('HUMAN');
    expect(result.reason).toContain('more than once');
  });

  it.each([
    ['above one', 1.4],
    ['negative', -0.2],
    ['not a number', Number.NaN],
    ['infinite', Number.POSITIVE_INFINITY],
  ])('refuses a %s confidence rather than clamping it', (_label, confidence) => {
    const result = reconcile([opinion({ confidence }), opinion({ verifierId: 'model' })]);

    expect(result.verdict).toBe('UNKNOWN');
    expect(result.reason).toContain('outside 0..1');
  });
});

describe('the strict policy', () => {
  it('stops the loop on any disagreement by default', () => {
    expect(STRICT_POLICY.humanOnSplit).toBe(true);
    expect(STRICT_POLICY.quorum).toBeGreaterThanOrEqual(2);
  });

  it('is used when no policy is supplied', () => {
    const split = [opinion({ passed: true }), opinion({ verifierId: 'model', passed: false })];

    expect(reconcile(split)).toEqual(reconcile(split, STRICT_POLICY));
  });
});
