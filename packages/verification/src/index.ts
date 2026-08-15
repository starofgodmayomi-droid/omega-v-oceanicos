import { Observation, VerificationResult, VerificationRule, EvidenceStep } from '@omega-v/types';

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
   * Execute a single rule and return evidence
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
    // For now, implement simple rule execution
    // In a real system, this would parse and execute bytecode

    const evidencePath: EvidenceStep[] = [];

    // Simple example: check if metadata contains expected values
    if (rule.name === 'response-time-threshold') {
      const responseTime = (observation.metadata.responseTime as number) || 0;
      const threshold = 100; // Simplified
      const passed = responseTime < threshold;

      evidencePath.push({
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
      });

      return {
        passed,
        confidence: passed ? 0.95 : 0.7,
        evidencePath,
      };
    }

    if (rule.name === 'status-code-check') {
      const statusCode = (observation.metadata.statusCode as number) || 0;
      const expected = 200;
      const passed = statusCode === expected;

      evidencePath.push({
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
      });

      return {
        passed,
        confidence: passed ? 0.98 : 0.1,
        evidencePath,
      };
    }

    // Default: unknown rule, pass with lower confidence
    evidencePath.push({
      step: stepStart,
      rule: rule.name,
      condition: 'unknown-rule',
      value: 'unknown',
      passed: true,
      reasoning: 'Unknown rule; assuming pass',
    });

    return {
      passed: true,
      confidence: 0.5,
      evidencePath,
    };
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
}

export default VerificationEngine;
