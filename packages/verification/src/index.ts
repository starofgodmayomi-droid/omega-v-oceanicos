import { Observation, VerificationResult, VerificationRule, EvidenceStep } from '@omega-v/types';

/** The outcome of executing one rule against one observation. */
type RuleOutcome = {
  passed: boolean;
  confidence: number;
  details?: string;
  evidencePath: EvidenceStep[];
};

/**
 * A rule this engine can actually execute.
 *
 * `requires` names the observation metadata the rule reads. It is checked
 * before evaluation so a missing field is reported as "could not evaluate"
 * rather than silently defaulting to a value that happens to pass.
 */
type RuleImplementation = {
  requires: string[];
  evaluate: (rule: VerificationRule, observation: Observation, stepStart: number) => RuleOutcome;
};

/**
 * The rules this engine can execute, by name.
 *
 * Registering a rule does not make it executable — a `VerificationRule` is a
 * declaration, and its `definition` string is not yet a language this engine
 * interprets. This table is the honest boundary between the two, and
 * {@link VerificationEngine.getExecutableRuleNames} publishes it so callers
 * can tell a rule that will be checked from one that will only be recorded.
 */
const RULE_IMPLEMENTATIONS: Record<string, RuleImplementation> = {
  'response-time-threshold': {
    requires: ['responseTime'],
    evaluate: (rule, observation, stepStart) => {
      const responseTime = observation.metadata.responseTime as number;
      const threshold = 100;
      const passed = responseTime < threshold;

      return {
        passed,
        confidence: passed ? 0.95 : 0.7,
        evidencePath: [
          {
            step: stepStart,
            rule: rule.name,
            condition: `responseTime < ${threshold}`,
            value: responseTime,
            expected: threshold,
            passed,
            reasoning: passed
              ? `Response time ${responseTime}ms is below ${threshold}ms threshold`
              : `Response time ${responseTime}ms exceeds ${threshold}ms threshold`,
            severity: passed ? undefined : 'warning',
          },
        ],
      };
    },
  },
  'status-code-check': {
    requires: ['statusCode'],
    evaluate: (rule, observation, stepStart) => {
      const statusCode = observation.metadata.statusCode as number;
      const expected = 200;
      const passed = statusCode === expected;

      return {
        passed,
        confidence: passed ? 0.98 : 0.1,
        evidencePath: [
          {
            step: stepStart,
            rule: rule.name,
            condition: `statusCode === ${expected}`,
            value: statusCode,
            expected,
            passed,
            reasoning: passed
              ? `Status code is ${statusCode} (expected)`
              : `Status code is ${statusCode} (expected ${expected})`,
            severity: passed ? undefined : 'critical',
          },
        ],
      };
    },
  },
};

/**
 * VerificationEngine: Applies rules to observations and produces evidence
 *
 * Step 2 of the verification loop
 */
export class VerificationEngine {
  private ruleRegistry: Map<string, VerificationRule> = new Map();
  private resultCache: Map<string, { result: VerificationResult; time: number }> = new Map();

  /**
   * Create a new verification engine
   */
  constructor(private readonly cacheTtl: number = 60000) {}

  /**
   * Register a verification rule
   */
  public registerRule(rule: VerificationRule): void {
    const key = `${rule.name}:${rule.version}`;
    this.ruleRegistry.set(key, rule);
  }

  /**
   * Get applicable rules for an observation
   */
  public getApplicableRules(observation: Observation): VerificationRule[] {
    const applicable: VerificationRule[] = [];

    for (const rule of this.ruleRegistry.values()) {
      if (rule.active && rule.appliesTo.includes(observation.claim.category)) {
        applicable.push(rule);
      }
    }

    return applicable;
  }

  /**
   * Verify an observation against registered rules
   */
  public verify(observation: Observation): VerificationResult {
    // Check cache first
    const cached = this.getFromCache(observation.id);
    if (cached) {
      return cached;
    }

    // Get applicable rules
    const rules = this.getApplicableRules(observation);

    // Execute each rule
    const evidencePath: EvidenceStep[] = [];
    const ruleResults: Array<{
      name: string;
      passed: boolean;
      confidence: number;
      details?: string;
    }> = [];
    const ruleVersions: Record<string, string> = {};

    let stepNumber = 1;
    let allPassed = true;

    for (const rule of rules) {
      const result = this.executeRule(rule, observation, stepNumber);

      ruleResults.push({
        name: rule.name,
        passed: result.passed,
        confidence: result.confidence,
        details: result.details,
      });

      evidencePath.push(...result.evidencePath);
      ruleVersions[rule.name] = rule.version;

      if (!result.passed) {
        allPassed = false;
      }

      stepNumber += result.evidencePath.length;
    }

    // Create verification result
    const verificationResult: VerificationResult = {
      id: this.generateVerificationId(),
      observationId: observation.id,
      timestamp: new Date().toISOString(),
      summary: {
        passed: allPassed,
        confidence: observation.confidence,
        rulesApplied: rules.length,
        rulesPassed: ruleResults.filter((r) => r.passed).length,
        rulesFailed: ruleResults.filter((r) => !r.passed).length,
      },
      rules: ruleResults,
      evidencePath,
      ruleVersions,
      status: 'completed',
    };

    // Cache result
    this.setInCache(observation.id, verificationResult);

    return verificationResult;
  }

  /**
   * Execute a single rule and return evidence.
   *
   * A rule this engine has no implementation for does not pass. Neither does
   * a rule whose input is missing from the observation. Both are recorded as
   * failures naming what could not be checked.
   *
   * The alternative — the behaviour this replaces — was to return passed:true
   * for any unrecognised rule, and to read a missing numeric field as 0. Both
   * turn absent evidence into favourable evidence, and that verdict does not
   * stay local: it reaches summary.passed, then a signed attestation with
   * verified:true, then action authorisation. A signature over a claim nobody
   * checked is an assertion wearing a proof's clothes, which is the one thing
   * this system exists to not do.
   */
  private executeRule(
    rule: VerificationRule,
    observation: Observation,
    stepStart: number
  ): {
    passed: boolean;
    confidence: number;
    details?: string;
    evidencePath: EvidenceStep[];
  } {
    const implementation = RULE_IMPLEMENTATIONS[rule.name];

    if (!implementation) {
      return {
        passed: false,
        confidence: 0,
        details: `No implementation registered for rule "${rule.name}"`,
        evidencePath: [
          {
            step: stepStart,
            rule: rule.name,
            condition: 'rule-not-executable',
            value: null,
            passed: false,
            reasoning:
              `This engine has no implementation for "${rule.name}", so the rule was ` +
              `not evaluated. An unevaluated rule is recorded as a failure rather ` +
              `than assumed to pass.`,
            severity: 'critical',
          },
        ],
      };
    }

    const missing = implementation.requires.filter(
      (field) => observation.metadata[field] === undefined || observation.metadata[field] === null
    );

    if (missing.length > 0) {
      return {
        passed: false,
        confidence: 0,
        details: `Observation is missing ${missing.join(', ')}`,
        evidencePath: [
          {
            step: stepStart,
            rule: rule.name,
            condition: `requires ${implementation.requires.join(', ')}`,
            value: null,
            expected: implementation.requires,
            passed: false,
            reasoning:
              `Observation does not carry ${missing.join(', ')}, so "${rule.name}" ` +
              `could not be evaluated. Absent input is recorded as a failure rather ` +
              `than read as a passing value.`,
            severity: 'critical',
          },
        ],
      };
    }

    return implementation.evaluate(rule, observation, stepStart);
  }

  /**
   * Generate a unique verification ID
   */
  private generateVerificationId(): string {
    return `ver-${new Date().toISOString().split('T')[0]}-${Math.random()
      .toString(36)
      .substring(7)}`;
  }

  /**
   * Get a cached verification result
   */
  private getFromCache(observationId: string): VerificationResult | null {
    const cached = this.resultCache.get(observationId);
    if (!cached) {
      return null;
    }

    if (Date.now() - cached.time > this.cacheTtl) {
      this.resultCache.delete(observationId);
      return null;
    }

    return cached.result;
  }

  /**
   * Store a verification result in cache
   */
  private setInCache(observationId: string, result: VerificationResult): void {
    this.resultCache.set(observationId, {
      result,
      time: Date.now(),
    });
  }

  /**
   * Clear the cache
   */
  public clearCache(): void {
    this.resultCache.clear();
  }

  /**
   * List every registered rule, regardless of category or active state.
   *
   * getApplicableRules answers "which rules apply to this observation";
   * this answers "what is registered". Conflating the two is how /rules
   * came to report zero: it queried applicability with an empty category
   * that no rule could ever match.
   */
  public getRules(): VerificationRule[] {
    return Array.from(this.ruleRegistry.values());
  }

  /**
   * Get the number of registered rules
   */
  public getRuleCount(): number {
    return this.ruleRegistry.size;
  }

  /**
   * The rule names this engine can actually execute.
   *
   * Registration accepts any rule; execution is implemented for these. A
   * registered rule outside this set is not silently tolerated — it fails
   * verification — so publishing the list lets a caller find out before
   * submitting an observation rather than from a failed verdict afterwards.
   */
  public getExecutableRuleNames(): string[] {
    return Object.keys(RULE_IMPLEMENTATIONS);
  }

  /**
   * Whether {@link verify} can evaluate this rule, as opposed to merely
   * holding it in the registry.
   */
  public canExecute(ruleName: string): boolean {
    return ruleName in RULE_IMPLEMENTATIONS;
  }
}

export default VerificationEngine;
