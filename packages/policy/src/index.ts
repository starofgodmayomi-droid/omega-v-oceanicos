import * as crypto from 'crypto';

export type PolicyOperator =
  | 'EQUALS'
  | 'NOT_EQUALS'
  | 'GREATER_THAN'
  | 'GREATER_OR_EQUAL'
  | 'LESS_THAN'
  | 'LESS_OR_EQUAL'
  | 'IN'
  | 'NOT_IN'
  | 'CONTAINS'
  | 'REGEX';

export type PolicySeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface PolicyRule {
  id: string;
  name: string;
  description: string;
  field: string; // e.g. "confidence", "metadata.responseTime", "source.environment"
  operator: PolicyOperator;
  value: unknown;
  severity: PolicySeverity;
}

export interface PolicyDocument {
  id: string;
  name: string;
  domain: string;
  version: string;
  rules: PolicyRule[];
  active: boolean;
  createdAt: string;
}

export interface RuleEvaluationDetail {
  ruleId: string;
  name: string;
  field: string;
  operator: PolicyOperator;
  expectedValue: unknown;
  actualValue: unknown;
  passed: boolean;
  severity: PolicySeverity;
  reason?: string;
}

export interface PolicyComplianceReceipt {
  receiptId: string;
  policyId: string;
  policyName: string;
  compliant: boolean;
  evaluatedAt: string;
  passedRules: number;
  failedRules: number;
  ruleResults: RuleEvaluationDetail[];
  signature: string;
}

/**
 * OceanicosPolicyEngine: Declarative Compliance Policies,
 * Constraint Bundles & Cryptographic Compliance Receipts.
 *
 * ```
 * 💧 Ω∞v ::= Verification Payload ⇄ Declarative Policy Bundle ⇄ CEL/Rule Evaluation ⇄ Compliance Receipt
 * ```
 */
export class OceanicosPolicyEngine {
  private policies: Map<string, PolicyDocument> = new Map();
  private complianceLedger: Map<string, PolicyComplianceReceipt> = new Map();
  private secretKey: string;

  constructor(secretKey?: string) {
    this.secretKey = secretKey || 'Ω∞v-POLICY-COMPLIANCE-SIGNING-SECRET-v1';
    this.bootstrapCanonicalPolicies();
  }

  private bootstrapCanonicalPolicies(): void {
    this.registerPolicy({
      id: 'enterprise-sla-policy',
      name: 'Enterprise Production Verification SLA Policy',
      domain: 'production-sla',
      version: '1.0.0',
      active: true,
      rules: [
        {
          id: 'rule-confidence-min',
          name: 'Minimum Confidence Bound',
          description: 'Confidence score must be at least 0.90',
          field: 'confidence',
          operator: 'GREATER_OR_EQUAL',
          value: 0.9,
          severity: 'CRITICAL',
        },
        {
          id: 'rule-latency-max',
          name: 'Maximum Response Latency',
          description: 'Response time must not exceed 100ms',
          field: 'metadata.responseTime',
          operator: 'LESS_OR_EQUAL',
          value: 100,
          severity: 'HIGH',
        },
        {
          id: 'rule-env-prod',
          name: 'Approved Environment',
          description: 'Environment must be production or staging',
          field: 'source.environment',
          operator: 'IN',
          value: ['production', 'staging'],
          severity: 'MEDIUM',
        },
      ],
    });

    this.registerPolicy({
      id: 'data-residency-policy',
      name: 'Sovereign Data Residency & Jurisdiction Guard',
      domain: 'data-residency',
      version: '1.1.0',
      active: true,
      rules: [
        {
          id: 'rule-allowed-regions',
          name: 'Allowed Data Regions',
          description: 'Region must reside in US or EU clusters',
          field: 'metadata.region',
          operator: 'IN',
          value: ['us-east-1', 'us-west-2', 'eu-central-1', 'eu-west-1'],
          severity: 'CRITICAL',
        },
      ],
    });
  }

  /**
   * Register a new policy document
   */
  public registerPolicy(
    policy: Omit<PolicyDocument, 'createdAt'> & { createdAt?: string }
  ): PolicyDocument {
    const doc: PolicyDocument = {
      ...policy,
      createdAt: policy.createdAt || new Date().toISOString(),
    };
    this.policies.set(doc.id, doc);
    return doc;
  }

  /**
   * Get all registered policies
   */
  public getPolicies(): PolicyDocument[] {
    return Array.from(this.policies.values());
  }

  /**
   * Get policy by id
   */
  public getPolicy(id: string): PolicyDocument | undefined {
    return this.policies.get(id);
  }

  /**
   * Extract nested field from context object using dot-notation
   */
  private extractField(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let curr: any = obj;
    for (const part of parts) {
      if (curr === null || curr === undefined || typeof curr !== 'object') {
        return undefined;
      }
      curr = curr[part];
    }
    return curr;
  }

  /**
   * Evaluate a single rule
   */
  private evaluateRule(rule: PolicyRule, context: Record<string, unknown>): RuleEvaluationDetail {
    const actualValue = this.extractField(context, rule.field);
    let passed = false;
    let reason: string | undefined;

    if (actualValue === undefined) {
      return {
        ruleId: rule.id,
        name: rule.name,
        field: rule.field,
        operator: rule.operator,
        expectedValue: rule.value,
        actualValue: undefined,
        passed: false,
        severity: rule.severity,
        reason: `Field '${rule.field}' is missing in evaluation context`,
      };
    }

    switch (rule.operator) {
      case 'EQUALS':
        passed = actualValue === rule.value;
        break;
      case 'NOT_EQUALS':
        passed = actualValue !== rule.value;
        break;
      case 'GREATER_THAN':
        passed = typeof actualValue === 'number' && actualValue > (rule.value as number);
        break;
      case 'GREATER_OR_EQUAL':
        passed = typeof actualValue === 'number' && actualValue >= (rule.value as number);
        break;
      case 'LESS_THAN':
        passed = typeof actualValue === 'number' && actualValue < (rule.value as number);
        break;
      case 'LESS_OR_EQUAL':
        passed = typeof actualValue === 'number' && actualValue <= (rule.value as number);
        break;
      case 'IN':
        passed = Array.isArray(rule.value) && rule.value.includes(actualValue);
        break;
      case 'NOT_IN':
        passed = Array.isArray(rule.value) && !rule.value.includes(actualValue);
        break;
      case 'CONTAINS':
        passed = typeof actualValue === 'string' && actualValue.includes(String(rule.value));
        break;
      case 'REGEX':
        passed = new RegExp(String(rule.value)).test(String(actualValue));
        break;
      default:
        passed = false;
        reason = `Unknown operator: ${rule.operator}`;
    }

    if (!passed && !reason) {
      reason = `Condition violated: '${rule.field}' (${JSON.stringify(actualValue)}) ${rule.operator} ${JSON.stringify(rule.value)}`;
    }

    return {
      ruleId: rule.id,
      name: rule.name,
      field: rule.field,
      operator: rule.operator,
      expectedValue: rule.value,
      actualValue,
      passed,
      severity: rule.severity,
      reason,
    };
  }

  /**
   * Evaluate a policy bundle against an execution or observation context
   */
  public evaluate(policyId: string, context: Record<string, unknown>): PolicyComplianceReceipt {
    const policy = this.policies.get(policyId);
    if (!policy) {
      throw new Error(`Policy '${policyId}' not found`);
    }

    const ruleResults = policy.rules.map((rule) => this.evaluateRule(rule, context));
    const passedRules = ruleResults.filter((r) => r.passed).length;
    const failedRules = ruleResults.length - passedRules;
    const compliant = failedRules === 0;

    const receiptId = `receipt-pol-${crypto.randomBytes(6).toString('hex')}`;
    const evaluatedAt = new Date().toISOString();

    const signaturePayload = `${receiptId}:${policyId}:${compliant}:${passedRules}:${failedRules}:${evaluatedAt}`;
    const signature = `0x${crypto.createHmac('sha256', this.secretKey).update(signaturePayload).digest('hex')}`;

    const receipt: PolicyComplianceReceipt = {
      receiptId,
      policyId,
      policyName: policy.name,
      compliant,
      evaluatedAt,
      passedRules,
      failedRules,
      ruleResults,
      signature,
    };

    this.complianceLedger.set(receipt.receiptId, receipt);
    return receipt;
  }

  /**
   * Get compliance audit history
   */
  public getComplianceHistory(): PolicyComplianceReceipt[] {
    return Array.from(this.complianceLedger.values());
  }
}

export default OceanicosPolicyEngine;
