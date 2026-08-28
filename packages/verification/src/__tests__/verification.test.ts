import { VerificationEngine } from '../index';
import { Observation, VerificationRule } from '@omega-v/types';

const rule = (over: Partial<VerificationRule> = {}): VerificationRule => ({
  name: 'status-code-check',
  version: '1.0.0',
  appliesTo: ['http'],
  definition: 'statusCode === 200',
  description: 'Checks the HTTP status code',
  createdAt: '2026-08-14T00:00:00.000Z',
  active: true,
  ...over,
});

const observation = (metadata: Record<string, unknown> = {}, category = 'http'): Observation => ({
  id: `obs-${Math.random().toString(36).slice(2)}`,
  claim: { statement: 'service responded', category },
  source: { system: 'test', version: '0.1.0', environment: 'test' },
  timestamp: '2026-08-14T00:00:00.000Z',
  observedBy: 'verification-test',
  metadata,
  confidence: 0.9,
  confidenceReason: 'fixture',
  status: 'normalized',
});

describe('VerificationEngine — rule registry', () => {
  it('registers rules and reports the count', () => {
    const engine = new VerificationEngine();
    expect(engine.getRuleCount()).toBe(0);

    engine.registerRule(rule());
    engine.registerRule(rule({ name: 'response-time-threshold' }));
    expect(engine.getRuleCount()).toBe(2);
  });

  it('treats name+version as the registry key, so re-registering replaces', () => {
    const engine = new VerificationEngine();
    engine.registerRule(rule());
    engine.registerRule(rule({ description: 'updated' }));
    expect(engine.getRuleCount()).toBe(1);

    engine.registerRule(rule({ version: '2.0.0' }));
    expect(engine.getRuleCount()).toBe(2);
  });

  it('selects only active rules whose category matches the observation', () => {
    const engine = new VerificationEngine();
    engine.registerRule(rule());
    engine.registerRule(rule({ name: 'inactive-rule', active: false }));
    engine.registerRule(rule({ name: 'other-category', appliesTo: ['grpc'] }));

    const applicable = engine.getApplicableRules(observation({ statusCode: 200 }));
    expect(applicable.map((r) => r.name)).toEqual(['status-code-check']);
  });
});

describe('VerificationEngine — status-code-check', () => {
  it('passes and records evidence when the status code matches', () => {
    const engine = new VerificationEngine();
    engine.registerRule(rule());

    const result = engine.verify(observation({ statusCode: 200 }));

    expect(result.summary.passed).toBe(true);
    expect(result.summary.rulesApplied).toBe(1);
    expect(result.summary.rulesPassed).toBe(1);
    expect(result.summary.rulesFailed).toBe(0);
    expect(result.status).toBe('completed');
    expect(result.ruleVersions).toEqual({ 'status-code-check': '1.0.0' });
    expect(result.evidencePath).toHaveLength(1);
    expect(result.evidencePath[0]).toMatchObject({
      step: 1,
      rule: 'status-code-check',
      value: 200,
      expected: 200,
      passed: true,
    });
    expect(result.evidencePath[0].severity).toBeUndefined();
  });

  it('fails with critical severity when the status code differs', () => {
    const engine = new VerificationEngine();
    engine.registerRule(rule());

    const result = engine.verify(observation({ statusCode: 500 }));

    expect(result.summary.passed).toBe(false);
    expect(result.summary.rulesFailed).toBe(1);
    expect(result.evidencePath[0].severity).toBe('critical');
    expect(result.rules[0].confidence).toBeCloseTo(0.1);
  });

  it('reports a missing status code as unevaluated, not as a zero', () => {
    const engine = new VerificationEngine();
    engine.registerRule(rule());

    const result = engine.verify(observation({}));

    expect(result.summary.passed).toBe(false);
    // The old behaviour read the absent field as 0 and reported evidence
    // about a status code that was never observed.
    expect(result.evidencePath[0].value).toBeNull();
    expect(result.evidencePath[0].reasoning).toContain('does not carry statusCode');
    expect(result.rules[0].confidence).toBe(0);
    // Absent input and a failed check are both `passed: false`, and they
    // are not the same fact. This one is the engine saying it could not
    // look, which a reader must be able to see without reading prose.
    expect(result.evidencePath[0].evaluated).toBe(false);
  });
});

describe('VerificationEngine — response-time-threshold', () => {
  const timing = rule({ name: 'response-time-threshold', appliesTo: ['perf'] });

  it('passes below the threshold', () => {
    const engine = new VerificationEngine();
    engine.registerRule(timing);

    const result = engine.verify(observation({ responseTime: 40 }, 'perf'));

    expect(result.summary.passed).toBe(true);
    expect(result.rules[0].confidence).toBeCloseTo(0.95);
    expect(result.evidencePath[0].reasoning).toContain('below');
    expect(result.evidencePath[0].severity).toBeUndefined();
  });

  it('fails above the threshold with a warning', () => {
    const engine = new VerificationEngine();
    engine.registerRule(timing);

    const result = engine.verify(observation({ responseTime: 250 }, 'perf'));

    expect(result.summary.passed).toBe(false);
    expect(result.evidencePath[0].severity).toBe('warning');
    expect(result.evidencePath[0].reasoning).toContain('exceeds');
  });

  it('refuses to pass an observation carrying no timing data', () => {
    const engine = new VerificationEngine();
    engine.registerRule(timing);

    const result = engine.verify(observation({}, 'perf'));

    // Previously this passed: the absent field was read as 0ms, which is
    // below the threshold, so an observation with no timing evidence at all
    // produced a passing timing verdict.
    expect(result.summary.passed).toBe(false);
    expect(result.evidencePath[0].value).toBeNull();
    expect(result.evidencePath[0].severity).toBe('critical');
    expect(result.evidencePath[0].reasoning).toContain('does not carry responseTime');
  });
});

describe('VerificationEngine — unknown and empty rule sets', () => {
  it('fails a rule it has no implementation for', () => {
    const engine = new VerificationEngine();
    engine.registerRule(rule({ name: 'entirely-novel-rule' }));

    const result = engine.verify(observation({ statusCode: 200 }));

    // The critical property: an unevaluated rule must not report a pass.
    // That verdict becomes summary.passed, then a signed attestation with
    // verified:true, then action authorisation — a signature over a claim
    // nothing checked.
    expect(result.summary.passed).toBe(false);
    expect(result.rules[0].confidence).toBe(0);
    expect(result.evidencePath[0].condition).toBe('rule-not-executable');
    expect(result.evidencePath[0].severity).toBe('critical');
    expect(result.evidencePath[0].reasoning).toContain('not evaluated');
    // Machine-readable, not only prose. A reader of the evidence has to be
    // able to tell "checked and wrong" from "not checked" without parsing
    // an English sentence.
    expect(result.evidencePath[0].evaluated).toBe(false);
  });

  it('marks a rule that ran as evaluated, whether or not it passed', () => {
    // The flag must distinguish evaluation from outcome. If it tracked
    // `passed` it would carry no information at all.
    const engine = new VerificationEngine();
    engine.registerRule(rule());

    const failing = engine.verify(observation({ statusCode: 500 }));
    expect(failing.summary.passed).toBe(false);
    const failingStep = failing.evidencePath.find((entry) => entry.rule === 'status-code-check');
    expect(failingStep?.passed).toBe(false);
    expect(failingStep?.evaluated).toBe(true);

    const passing = engine.verify(observation({ statusCode: 200 }));
    const passingStep = passing.evidencePath.find((entry) => entry.rule === 'status-code-check');
    expect(passingStep?.passed).toBe(true);
    expect(passingStep?.evaluated).toBe(true);
  });

  it('does not let an unimplemented rule reach a passing attestation', () => {
    const engine = new VerificationEngine();
    engine.registerRule(rule()); // status-code-check: implemented, will pass
    engine.registerRule(rule({ name: 'entirely-novel-rule' })); // not implemented

    const result = engine.verify(observation({ statusCode: 200 }));

    // One genuinely passing rule must not carry an unevaluated one over the
    // line: attestation.verified is derived from summary.passed.
    expect(result.summary.rulesPassed).toBe(1);
    expect(result.summary.rulesFailed).toBe(1);
    expect(result.summary.passed).toBe(false);
  });

  it('publishes which rules it can execute, separately from what is registered', () => {
    const engine = new VerificationEngine();
    engine.registerRule(rule({ name: 'entirely-novel-rule' }));

    expect(engine.getRuleCount()).toBe(1);
    expect(engine.canExecute('entirely-novel-rule')).toBe(false);
    expect(engine.canExecute('status-code-check')).toBe(true);
    expect(engine.getExecutableRuleNames()).toEqual(
      expect.arrayContaining(['status-code-check', 'response-time-threshold'])
    );
  });

  it('returns a passing result with no evidence when no rules apply', () => {
    const engine = new VerificationEngine();

    const result = engine.verify(observation({ statusCode: 200 }));

    expect(result.summary.rulesApplied).toBe(0);
    expect(result.summary.passed).toBe(true);
    expect(result.evidencePath).toEqual([]);
    expect(result.ruleVersions).toEqual({});
  });

  it('numbers evidence steps sequentially across multiple rules', () => {
    const engine = new VerificationEngine();
    engine.registerRule(rule());
    engine.registerRule(rule({ name: 'response-time-threshold' }));

    const result = engine.verify(observation({ statusCode: 200, responseTime: 10 }));

    expect(result.summary.rulesApplied).toBe(2);
    expect(result.evidencePath.map((e) => e.step)).toEqual([1, 2]);
  });
});

describe('VerificationEngine — result cache', () => {
  it('returns the cached result for a repeated observation', () => {
    const engine = new VerificationEngine();
    engine.registerRule(rule());
    const obs = observation({ statusCode: 200 });

    const first = engine.verify(obs);
    const second = engine.verify(obs);

    expect(second).toBe(first);
  });

  it('discards entries older than the TTL', () => {
    const engine = new VerificationEngine(-1);
    engine.registerRule(rule());
    const obs = observation({ statusCode: 200 });

    const first = engine.verify(obs);
    const second = engine.verify(obs);

    expect(second).not.toBe(first);
    expect(second.id).not.toBe(first.id);
  });

  it('clearCache forces re-verification', () => {
    const engine = new VerificationEngine();
    engine.registerRule(rule());
    const obs = observation({ statusCode: 200 });

    const first = engine.verify(obs);
    engine.clearCache();
    const second = engine.verify(obs);

    expect(second.id).not.toBe(first.id);
    expect(second.summary).toEqual(first.summary);
  });

  it('caches per observation id, not globally', () => {
    const engine = new VerificationEngine();
    engine.registerRule(rule());

    const passing = engine.verify(observation({ statusCode: 200 }));
    const failing = engine.verify(observation({ statusCode: 503 }));

    expect(passing.summary.passed).toBe(true);
    expect(failing.summary.passed).toBe(false);
  });
});

describe('VerificationEngine — rule listing', () => {
  it('lists every registered rule regardless of category or active state', () => {
    const engine = new VerificationEngine();
    engine.registerRule(rule());
    engine.registerRule(rule({ name: 'inactive-rule', active: false }));
    engine.registerRule(rule({ name: 'other-category', appliesTo: ['grpc'] }));

    const listed = engine.getRules();

    expect(listed).toHaveLength(3);
    expect(listed.map((r) => r.name).sort()).toEqual([
      'inactive-rule',
      'other-category',
      'status-code-check',
    ]);
    expect(listed).toHaveLength(engine.getRuleCount());
  });

  it('returns an empty list before anything is registered', () => {
    expect(new VerificationEngine().getRules()).toEqual([]);
  });

  it('lists rules that no observation category would match', () => {
    const engine = new VerificationEngine();
    engine.registerRule(rule({ appliesTo: ['health-check'] }));

    expect(engine.getRules()).toHaveLength(1);
    expect(engine.getApplicableRules(observation({}, ''))).toHaveLength(0);
  });
});

/**
 * Confidence must come from the rules, not from the claim.
 *
 * The summary used to copy observation.confidence — a number the submitter
 * writes into the request body. It reached the attestation and sat inside the
 * signed payload, so the system issued unforgeable signatures over a figure no
 * rule had produced.
 *
 * The default fixtures hid this: for a passing health check the claimed 0.95
 * and the derived min(0.95, 0.98) are the same number. These tests separate
 * the two deliberately, because a test that cannot tell them apart is what let
 * the defect survive.
 */
describe('VerificationEngine — confidence is derived, not claimed', () => {
  const highClaim = (metadata: Record<string, unknown>): Observation => ({
    ...observation(metadata),
    confidence: 0.99,
    confidenceReason: 'the claimant is very sure of itself',
  });

  it('reports the rule confidence, not the number the claim asserted', () => {
    const engine = new VerificationEngine();
    engine.registerRule(rule());

    const result = engine.verify(highClaim({ statusCode: 200 }));

    // status-code-check yields 0.98 when it passes. The claim said 0.99.
    expect(result.summary.confidence).toBeCloseTo(0.98);
    expect(result.summary.confidence).not.toBeCloseTo(0.99);
  });

  it('preserves the claimed number separately rather than discarding it', () => {
    const engine = new VerificationEngine();
    engine.registerRule(rule());

    const result = engine.verify(highClaim({ statusCode: 200 }));

    // Still available to weigh — labelled as an input, not as a verdict.
    expect(result.summary.claimedConfidence).toBeCloseTo(0.99);
  });

  it('takes the weakest applied rule, not the average', () => {
    const engine = new VerificationEngine();
    engine.registerRule(rule()); // status-code-check: 0.98 passing
    engine.registerRule(rule({ name: 'response-time-threshold' })); // 0.95 passing

    const result = engine.verify(highClaim({ statusCode: 200, responseTime: 42 }));

    expect(result.summary.passed).toBe(true);
    expect(result.summary.confidence).toBeCloseTo(0.95); // min, not mean (0.965)
  });

  it('collapses confidence when a rule fails, however sure the claim was', () => {
    const engine = new VerificationEngine();
    engine.registerRule(rule());

    const result = engine.verify(highClaim({ statusCode: 500 }));

    // A failing status-code-check yields 0.1. The claim still said 0.99.
    expect(result.summary.passed).toBe(false);
    expect(result.summary.confidence).toBeCloseTo(0.1);
  });

  it('reports zero confidence when nothing was checked', () => {
    const engine = new VerificationEngine();

    const result = engine.verify(highClaim({ statusCode: 200 }));

    // No rule applied, so no rule produced confidence. This is deliberately
    // independent of `passed`: nothing was checked is not the same statement
    // as something failed.
    expect(result.summary.rulesApplied).toBe(0);
    expect(result.summary.confidence).toBe(0);
    expect(result.summary.claimedConfidence).toBeCloseTo(0.99);
  });

  it('does not let an unevaluable rule inherit the claim confidence', () => {
    const engine = new VerificationEngine();
    engine.registerRule(rule({ name: 'entirely-novel-rule' }));

    const result = engine.verify(highClaim({ statusCode: 200 }));

    expect(result.summary.confidence).toBe(0);
  });
});
