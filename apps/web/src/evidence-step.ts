/**
 * How one evidence step should be labelled to a reader.
 *
 * `passed: false` covers two facts that are not the same:
 *
 *   - the engine ran the rule and the claim did not hold
 *   - the engine could not run the rule at all
 *
 * Both must deny an action — an unevaluated rule is never a passing rule,
 * and the verification engine is deliberately fail-closed about it. But a
 * reader acts differently on each. One says the system checked and found
 * something wrong. The other says the system did not check, and the person
 * reading needs to fix a configuration or supply missing input rather than
 * investigate a failure that never happened.
 *
 * Rendering both as FAIL tells a reader the system checked when it did
 * not. That is the same defect as reporting an unevaluated rule as a pass,
 * pointed the other way: the verdict is safe, the account of it is false.
 *
 * Extracted from the JSX so this decision can be tested as a decision.
 */
export type EvidenceStepView = {
  passed: boolean;
  /** Absent on evidence recorded before the engine reported this. */
  evaluated?: boolean;
};

export type EvidenceStepLabel = 'PASS' | 'FAIL' | 'NOT EVALUATED';

export function evidenceStepLabel(step: EvidenceStepView): EvidenceStepLabel {
  // Only an explicit `false` earns the third label. Absent means unknown,
  // and unknown falls back to the pass/fail reading rather than claiming
  // the engine skipped a rule it may well have run. Inferring "not
  // evaluated" from a missing flag would be the same move this file
  // exists to prevent, in the opposite direction.
  if (step.evaluated === false) return 'NOT EVALUATED';
  return step.passed ? 'PASS' : 'FAIL';
}

export function evidenceStepClassName(step: EvidenceStepView): string {
  if (step.evaluated === false) return 'evidence-unevaluated';
  return step.passed ? 'evidence-pass' : 'evidence-fail';
}
