import { VerificationEngine } from '@omega-v/verification';
import type { Observation, VerificationRule } from '@omega-v/types';
import { failingLoop, passingLoop } from './harness';

/**
 * The dashboard fixtures must describe evidence the engine actually
 * produces.
 *
 * `failingLoop()` used to shape its unevaluated step as `passed: false`
 * and nothing else. The engine reports `evaluated: false` alongside that,
 * so the fixture described a shape the engine no longer emits — and the
 * dom test built on it asserted a rendering the real system would never
 * show. It passed the whole time, on both sides of the change that
 * introduced the flag.
 *
 * A fixture that drifts from the contract tests the fixture. Correcting it
 * once fixes today; this makes the next drift fail instead of pass.
 *
 * Stated limitation: this compares the fields the dashboard reads from an
 * evidence step, on the two cases the fixtures cover. It is not a general
 * schema check, and a fixture could still diverge in a field no assertion
 * here names.
 */
describe('dashboard fixtures match what the engine emits', () => {
  const rule = (over: Partial<VerificationRule> = {}): VerificationRule => ({
    name: 'status-code-check',
    version: '1.0.0',
    appliesTo: ['http'],
    definition: 'statusCode === 200',
    description: 'Checks the HTTP status code',
    createdAt: '2026-08-16T00:00:00.000Z',
    active: true,
    ...over,
  });

  const observation = (metadata: Record<string, unknown>): Observation => ({
    id: 'obs-fixture-contract',
    claim: { statement: 'service responded', category: 'http' },
    source: { system: 'test', version: '0.1.0', environment: 'test' },
    timestamp: '2026-08-16T00:00:00.000Z',
    observedBy: 'fixture-contract',
    metadata,
    confidence: 0.9,
    confidenceReason: 'fixture',
    status: 'normalized',
  });

  /** Run the real engine and return the step for one rule. */
  const engineStep = (ruleName: string, metadata: Record<string, unknown>) => {
    const engine = new VerificationEngine();
    engine.registerRule(rule({ name: ruleName, appliesTo: ['http'] }));
    const result = engine.verify(observation(metadata));
    const step = result.evidencePath.find((entry) => entry.rule === ruleName);
    if (!step) throw new Error(`engine produced no step for ${ruleName}`);
    return step;
  };

  it('marks a rule the engine could not run the way the engine marks it', () => {
    // The exact case the fixture models: the rule is registered, the
    // observation does not carry the input it reads.
    const fromEngine = engineStep('response-time-threshold', { statusCode: 200 });
    const fromFixture = failingLoop().verification.evidencePath.find(
      (step) => step.rule === 'response-time-threshold'
    );

    expect(fromEngine.evaluated).toBe(false);
    expect(fromEngine.passed).toBe(false);
    expect(fromFixture?.evaluated).toBe(fromEngine.evaluated);
    expect(fromFixture?.passed).toBe(fromEngine.passed);
  });

  it('marks a rule the engine did run the way the engine marks it', () => {
    const fromEngine = engineStep('status-code-check', { statusCode: 200 });
    const fromFixture = failingLoop().verification.evidencePath.find(
      (step) => step.rule === 'status-code-check'
    );

    expect(fromEngine.evaluated).toBe(true);
    expect(fromFixture?.evaluated).toBe(fromEngine.evaluated);
    expect(fromFixture?.passed).toBe(fromEngine.passed);
  });

  it('leaves no fixture step without the flag the engine always sets', () => {
    // The drift was an absent field, not a wrong one, so absence is the
    // thing to catch. The engine sets `evaluated` on every step it emits;
    // a fixture step missing it describes evidence that cannot occur.
    for (const fixture of [passingLoop(), failingLoop()]) {
      for (const step of fixture.verification.evidencePath) {
        expect(typeof step.evaluated).toBe('boolean');
      }
    }
  });
});
