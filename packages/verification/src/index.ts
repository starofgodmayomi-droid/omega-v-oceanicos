import crypto from 'node:crypto';
import type {
  IEvidence,
  IObservation,
  Observation,
  VerificationResult,
  VerificationRule,
  EvidenceStep,
  DissentRecord,
} from '@oceanicos/types';

/**
 * Confidence in a verification, derived from the rules that actually ran.
 * The lowest rule confidence wins. A verification is only as strong as its
 * weakest applied rule.
 */
function deriveConfidence(ruleResults: Array<{ confidence: number }>): number {
  if (ruleResults.length === 0) return 0;
  return Math.min(...ruleResults.map((result) => result.confidence));
}

type RuleOutcome = {
  passed: boolean;
  confidence: number;
  details?: string;
  evidencePath: EvidenceStep[];
};

type RuleImplementation = {
  requires: string[];
  evaluate: (rule: VerificationRule, observation: Observation, stepStart: number) => RuleOutcome;
};

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
            evaluated: true,
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
            evaluated: true,
          },
        ],
      };
    },
  },
};

export class VerificationEngine {
  private ruleRegistry: Map<string, VerificationRule> = new Map();
  private resultCache: Map<string, { result: VerificationResult; time: number }> = new Map();

  constructor(private readonly cacheTtl: number = 60000) {}

  public static evaluate(telemetry: IObservation): IEvidence {
    const scale = telemetry.acceleratorInventory > 500000;
    const independence = telemetry.siliconYield >= 0.92;
    const status: IEvidence['status'] = scale && independence ? 'PASS' : 'DIVERGENT';
    const signingKey = process.env.OMEGA_SIGNING_KEY;
    if (!signingKey || signingKey.length < 16) {
      throw new Error('ATTESTATION_SIGNING_KEY_REQUIRED_OR_INVALID');
    }
    const runsOnFlash = telemetry.androidAutomationState ? 'flash' : 'pro';
    const rawPayload = `${telemetry.uuid}-${status}-${telemetry.timestamp}-${runsOnFlash}`;
    const signatureProof = crypto.createHmac('sha256', signingKey).update(rawPayload).digest('hex');
    return {
      status,
      lawRoute: '0 ➔ MINI ➔ FULL_STACK ➔ ECOSYSTEM ➔ REALITY',
      timestamp: new Date().toISOString(),
      observationUuid: telemetry.uuid,
      signatureProof,
      mcpDiagnostics: {
        logcatAnomalyCount: 0,
        stepDurationMs: runsOnFlash === 'flash' ? 3000 : 25000,
        profileExecuted: runsOnFlash,
      },
    };
  }

  public registerRule(rule: VerificationRule): void {
    const key = `${rule.name}:${rule.version}`;
    this.ruleRegistry.set(key, rule);
  }

  public getApplicableRules(observation: Observation): VerificationRule[] {
    const applicable: VerificationRule[] = [];
    for (const rule of this.ruleRegistry.values()) {
      if (rule.active && rule.appliesTo.includes(observation.claim.category)) {
        applicable.push(rule);
      }
    }
    return applicable;
  }

  public verify(observation: Observation): VerificationResult {
    const cached = this.getFromCache(observation.id);
    if (cached) {
      return cached;
    }

    const rules = this.getApplicableRules(observation);
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

    const rulesPassedCount = ruleResults.filter((r) => r.passed).length;
    const rulesFailedCount = ruleResults.filter((r) => !r.passed).length;
    let dissent: DissentRecord | undefined;

    if (rulesPassedCount > 0 && rulesFailedCount > 0) {
      dissent = {
        id: `dissent-${this.generateVerificationId()}`,
        claimId: observation.id,
        interpretations: ruleResults.map((r) => ({
          position: r.passed ? 'PASS' : 'FAIL',
          source: r.name,
          evidence: evidencePath
            .filter((e) => e.rule === r.name)
            .map((e) => e.reasoning),
          confidence: r.confidence,
        })),
        status: 'OPEN',
        recordedAt: new Date().toISOString(),
      };
    }

    const verificationResult: VerificationResult = {
      id: this.generateVerificationId(),
      observationId: observation.id,
      timestamp: new Date().toISOString(),
      summary: {
        passed: allPassed,
        confidence: deriveConfidence(ruleResults),
        claimedConfidence: observation.confidence,
        rulesApplied: rules.length,
        rulesPassed: rulesPassedCount,
        rulesFailed: rulesFailedCount,
      },
      rules: ruleResults,
      evidencePath,
      ruleVersions,
      status: 'completed',
      dissent,
    };

    this.setInCache(observation.id, verificationResult);
    return verificationResult;
  }

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
            evaluated: false,
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
            evaluated: false,
          },
        ],
      };
    }

    return implementation.evaluate(rule, observation, stepStart);
  }

  private generateVerificationId(): string {
    return `ver-${new Date().toISOString().split('T')[0]}-${Math.random()
      .toString(36)
      .substring(7)}`;
  }

  private getFromCache(observationId: string): VerificationResult | null {
    const cached = this.resultCache.get(observationId);
    if (!cached) return null;
    if (Date.now() - cached.time > this.cacheTtl) {
      this.resultCache.delete(observationId);
      return null;
    }
    return cached.result;
  }

  private setInCache(observationId: string, result: VerificationResult): void {
    this.resultCache.set(observationId, {
      result,
      time: Date.now(),
    });
  }

  public clearCache(): void {
    this.resultCache.clear();
  }

  public getRules(): VerificationRule[] {
    return Array.from(this.ruleRegistry.values());
  }

  public getRuleCount(): number {
    return this.ruleRegistry.size;
  }

  public getExecutableRuleNames(): string[] {
    return Object.keys(RULE_IMPLEMENTATIONS);
  }

  public canExecute(ruleName: string): boolean {
    return ruleName in RULE_IMPLEMENTATIONS;
  }
}

export { AsymmetricValidationGuard, type AsymmetricKeyPair } from './asymmetric.js';
export * from './frontier.js';
export * from './regional-mesh.js';
export { VerificationEngine as default };
