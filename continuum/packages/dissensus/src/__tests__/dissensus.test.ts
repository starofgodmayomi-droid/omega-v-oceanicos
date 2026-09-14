import {
  InvalidPolicyError,
  policyFromEnvironment,
  reconcile,
  STRICT_POLICY,
  type DissensusPolicy,
  type Opinion,
} from '../index';

const opinion = (over: Partial<Opinion> = {}): Opinion => ({
  verifierId: 'rules',
  verifierVersion: '1.0.0',
  passed: true,
  confidence: 0.9,
  reason: 'fixture',
  ...over,
});

const loose: DissensusPolicy = {
  humanOnSplit: false,
  minimumConfidence: 0,
  quorum: 1,
  provenance: 'configured',
};

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

  it('carries the minority as the passing side when failures are the majority', () => {
    // The 2-1 case above always had passes outnumbering failures, so the
    // minority there was the failing side. That leaves the mirror case
    // untested: when failures outnumber passes, the minority computation
    // has to swing the other way and single out the pass instead.
    const result = reconcile([
      opinion({ verifierId: 'rules', passed: false }),
      opinion({ verifierId: 'model', passed: false }),
      opinion({ verifierId: 'second-model', passed: true, reason: 'lone dissent' }),
    ]);

    expect(result.verdict).toBe('SPLIT');
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

describe('policy provenance', () => {
  it('marks the built-in threshold as chosen rather than measured', () => {
    // 0.7 was picked by whoever wrote the module. Nothing observed it.
    expect(STRICT_POLICY.provenance).toBe('default');
  });

  it('reports the policy alongside every verdict', () => {
    const result = reconcile([opinion(), opinion({ verifierId: 'model' })]);

    // A routing decision without its threshold is unreadable: a reader
    // cannot tell whether HUMAN meant "they disagreed" or "the bar was high".
    expect(result.policy).toEqual(STRICT_POLICY);
    expect(result.policy.provenance).toBe('default');
  });

  it('carries the policy through every branch, including refusals', () => {
    expect(reconcile([]).policy.provenance).toBe('default');
    expect(reconcile([opinion(), opinion()]).policy).toBeDefined();
    expect(
      reconcile([opinion({ confidence: 5 }), opinion({ verifierId: 'm' })]).policy
    ).toBeDefined();
  });

  it('returns the default policy when nothing is configured', () => {
    expect(policyFromEnvironment({})).toEqual(STRICT_POLICY);
  });

  it('returns the default policy when called with no argument at all', () => {
    // Every other case here, including the one above, passes an explicit
    // object, even an empty one. Calling with nothing is what actually
    // exercises the parameter's own default value rather than a value
    // supplied by the caller, and that had never run.
    expect(policyFromEnvironment()).toEqual(STRICT_POLICY);
  });

  it('marks an operator-set policy as configured, not default', () => {
    const policy = policyFromEnvironment({ OMEGA_DISSENSUS_MIN_CONFIDENCE: '0.9' });

    expect(policy.minimumConfidence).toBe(0.9);
    // Someone accepted responsibility for this number. That is a stronger
    // claim than 'default' and a weaker one than 'derived'.
    expect(policy.provenance).toBe('configured');
  });

  it('keeps unset fields at their defaults while marking the rest configured', () => {
    const policy = policyFromEnvironment({ OMEGA_DISSENSUS_QUORUM: '3' });

    expect(policy.quorum).toBe(3);
    expect(policy.minimumConfidence).toBe(STRICT_POLICY.minimumConfidence);
    expect(policy.humanOnSplit).toBe(STRICT_POLICY.humanOnSplit);
  });

  it('accepts an explicit decision to proceed on splits', () => {
    expect(policyFromEnvironment({ OMEGA_DISSENSUS_HUMAN_ON_SPLIT: 'false' }).humanOnSplit).toBe(
      false
    );
  });

  it.each([
    ['above one', '1.5'],
    ['negative', '-0.1'],
    ['not a number', 'high'],
    ['empty', ''],
  ])('refuses a %s confidence rather than clamping it', (_label, value) => {
    // Clamping would invent a number nobody chose and then route on it.
    expect(() => policyFromEnvironment({ OMEGA_DISSENSUS_MIN_CONFIDENCE: value })).toThrow(
      InvalidPolicyError
    );
  });

  it.each([
    ['zero', '0'],
    ['negative', '-2'],
    ['fractional', '2.5'],
    ['not a number', 'two'],
  ])('refuses a %s quorum', (_label, value) => {
    expect(() => policyFromEnvironment({ OMEGA_DISSENSUS_QUORUM: value })).toThrow(
      InvalidPolicyError
    );
  });

  it.each([
    ['confidence', 'OMEGA_DISSENSUS_MIN_CONFIDENCE'],
    ['quorum', 'OMEGA_DISSENSUS_QUORUM'],
    ['split flag', 'OMEGA_DISSENSUS_HUMAN_ON_SPLIT'],
  ])('refuses an empty %s rather than coercing it', (_label, variable) => {
    // Number('') is 0 and 0 is a valid confidence, so an empty value would
    // otherwise install the most permissive threshold there is.
    expect(() => policyFromEnvironment({ [variable]: '' })).toThrow(InvalidPolicyError);
    expect(() => policyFromEnvironment({ [variable]: '   ' })).toThrow(InvalidPolicyError);
  });

  it('refuses an ambiguous split flag rather than guessing', () => {
    // 'yes' probably means true. Probably is not good enough for a flag
    // that decides whether a human is consulted.
    expect(() => policyFromEnvironment({ OMEGA_DISSENSUS_HUMAN_ON_SPLIT: 'yes' })).toThrow(
      InvalidPolicyError
    );
  });

  it('names the variable in the error, so an operator can fix it', () => {
    expect(() => policyFromEnvironment({ OMEGA_DISSENSUS_QUORUM: 'two' })).toThrow(
      /OMEGA_DISSENSUS_QUORUM/
    );
  });

  it('has no way to report a derived policy yet, and does not pretend otherwise', () => {
    const provenances = [
      STRICT_POLICY.provenance,
      policyFromEnvironment({ OMEGA_DISSENSUS_QUORUM: '2' }).provenance,
    ];

    // 'derived' exists in the type because it is the goal. Nothing produces
    // it, because no outcome data has been collected. When /learn feeds
    // back, this expectation is what should change.
    expect(provenances).not.toContain('derived');
  });
});
