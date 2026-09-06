import { evidenceStepClassName, evidenceStepLabel } from '../evidence-step';

/**
 * The dashboard used to render every non-passing step as FAIL. A rule the
 * engine could not evaluate looked exactly like a rule that ran and found
 * the claim false — so the panel told a reader the system had checked
 * something it had not.
 *
 * The verdict was never wrong: an unevaluated rule denies the action. What
 * was wrong was the account given of it, which is the same defect as
 * reporting an unevaluated rule as a pass, pointed the other way.
 */
describe('evidence step labelling', () => {
  it('separates a rule that failed from a rule that never ran', () => {
    expect(evidenceStepLabel({ passed: false, evaluated: true })).toBe('FAIL');
    expect(evidenceStepLabel({ passed: false, evaluated: false })).toBe('NOT EVALUATED');
  });

  it('labels an evaluated pass as a pass', () => {
    expect(evidenceStepLabel({ passed: true, evaluated: true })).toBe('PASS');
  });

  it('does not read a missing flag as a skipped rule', () => {
    // Evidence recorded before the engine reported this carries no flag.
    // Inferring "not evaluated" from its absence would invent a claim about
    // what the engine did — the same move, in the opposite direction.
    expect(evidenceStepLabel({ passed: true })).toBe('PASS');
    expect(evidenceStepLabel({ passed: false })).toBe('FAIL');
  });

  it('never labels an unevaluated step as passing, whatever `passed` says', () => {
    // Defensive: `passed: true` with `evaluated: false` should not be
    // producible by the engine. If it ever is, the safe reading is that
    // nothing was checked, not that something passed.
    expect(evidenceStepLabel({ passed: true, evaluated: false })).toBe('NOT EVALUATED');
  });

  it('gives an unevaluated step its own class rather than the failure one', () => {
    // Colouring it like a failure restates the conflation the label removes.
    expect(evidenceStepClassName({ passed: false, evaluated: false })).toBe('evidence-unevaluated');
    expect(evidenceStepClassName({ passed: false, evaluated: true })).toBe('evidence-fail');
    expect(evidenceStepClassName({ passed: true, evaluated: true })).toBe('evidence-pass');
  });
});
