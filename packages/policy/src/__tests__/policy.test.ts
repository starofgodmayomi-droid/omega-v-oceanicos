import { OceanicosPolicyEngine } from '../index';

describe('@omega-v/policy — OceanicosPolicyEngine', () => {
  let policyEngine: OceanicosPolicyEngine;

  beforeEach(() => {
    policyEngine = new OceanicosPolicyEngine('test-policy-secret');
  });

  describe('Policy Registration & Discovery', () => {
    it('should bootstrap canonical policies', () => {
      const policies = policyEngine.getPolicies();
      expect(policies.length).toBeGreaterThanOrEqual(2);
      expect(policies.some((p) => p.id === 'enterprise-sla-policy')).toBe(true);
      expect(policies.some((p) => p.id === 'data-residency-policy')).toBe(true);
    });

    it('should register custom policy document', () => {
      const custom = policyEngine.registerPolicy({
        id: 'model-safety-policy',
        name: 'Model Safety & Non-Toxicity Policy',
        domain: 'ai-safety',
        version: '1.0.0',
        active: true,
        rules: [
          {
            id: 'rule-toxicity',
            name: 'Max Toxicity Score',
            description: 'Toxicity must be < 0.05',
            field: 'toxicityScore',
            operator: 'LESS_THAN',
            value: 0.05,
            severity: 'CRITICAL',
          },
        ],
      });

      expect(custom.id).toBe('model-safety-policy');
      expect(policyEngine.getPolicy('model-safety-policy')).toBeDefined();
    });
  });

  describe('Policy Evaluation & Receipts', () => {
    it('should evaluate compliant context and issue cryptographic receipt', () => {
      const context = {
        confidence: 0.96,
        metadata: {
          responseTime: 35,
        },
        source: {
          environment: 'production',
        },
      };

      const receipt = policyEngine.evaluate('enterprise-sla-policy', context);

      expect(receipt.receiptId).toMatch(/^receipt-pol-/);
      expect(receipt.compliant).toBe(true);
      expect(receipt.passedRules).toBe(3);
      expect(receipt.failedRules).toBe(0);
      expect(receipt.signature).toMatch(/^0x/);
    });

    it('should evaluate non-compliant context and record violations', () => {
      const violatingContext = {
        confidence: 0.75, // Fails rule-confidence-min (< 0.90)
        metadata: {
          responseTime: 180, // Fails rule-latency-max (> 100)
        },
        source: {
          environment: 'development', // Fails rule-env-prod (not in ['production', 'staging'])
        },
      };

      const receipt = policyEngine.evaluate('enterprise-sla-policy', violatingContext);

      expect(receipt.compliant).toBe(false);
      expect(receipt.passedRules).toBe(0);
      expect(receipt.failedRules).toBe(3);
      expect(receipt.ruleResults.every((r) => !r.passed)).toBe(true);
    });

    it('should handle nested field extraction and missing fields gracefully', () => {
      const emptyContext = {};
      const receipt = policyEngine.evaluate('data-residency-policy', emptyContext);

      expect(receipt.compliant).toBe(false);
      expect(receipt.ruleResults[0].reason).toContain('missing');
    });
  });

  describe('Audit History Ledger', () => {
    it('should record all evaluation receipts in history', () => {
      policyEngine.evaluate('enterprise-sla-policy', {
        confidence: 0.95,
        metadata: { responseTime: 20 },
        source: { environment: 'production' },
      });

      policyEngine.evaluate('data-residency-policy', {
        metadata: { region: 'us-east-1' },
      });

      const history = policyEngine.getComplianceHistory();
      expect(history.length).toBe(2);
    });
  });
});
