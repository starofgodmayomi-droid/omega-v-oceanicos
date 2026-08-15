import { VerificationEngine } from '@omega-v/verification';
import { Observation, VerificationRule } from '@omega-v/types';

describe('VerificationEngine', () => {
  let engine: VerificationEngine;

  beforeEach(() => {
    engine = new VerificationEngine(5000); // 5 second cache TTL
  });

  describe('Rule Registration', () => {
    it('should register a verification rule', () => {
      const rule: VerificationRule = {
        name: 'test-rule',
        version: '1.0.0',
        appliesTo: ['health-check'],
        definition: 'Simple test rule',
        description: 'A rule for testing',
        createdAt: new Date().toISOString(),
        active: true,
      };

      engine.registerRule(rule);
      expect(engine.getRuleCount()).toBe(1);
    });

    it('should register multiple rules', () => {
      const rule1: VerificationRule = {
        name: 'rule-1',
        version: '1.0.0',
        appliesTo: ['health-check'],
        definition: 'Rule 1',
        description: 'First rule',
        createdAt: new Date().toISOString(),
        active: true,
      };

      const rule2: VerificationRule = {
        name: 'rule-2',
        version: '1.0.0',
        appliesTo: ['health-check'],
        definition: 'Rule 2',
        description: 'Second rule',
        createdAt: new Date().toISOString(),
        active: true,
      };

      engine.registerRule(rule1);
      engine.registerRule(rule2);
      expect(engine.getRuleCount()).toBe(2);
    });

    it('should allow updating a rule (same name, different version)', () => {
      const rule1: VerificationRule = {
        name: 'status-code-check',
        version: '1.0.0',
        appliesTo: ['health-check'],
        definition: 'Check status code',
        description: 'Version 1',
        createdAt: new Date().toISOString(),
        active: true,
      };

      const rule2: VerificationRule = {
        name: 'status-code-check',
        version: '2.0.0',
        appliesTo: ['health-check'],
        definition: 'Check status code v2',
        description: 'Version 2',
        createdAt: new Date().toISOString(),
        active: true,
      };

      engine.registerRule(rule1);
      engine.registerRule(rule2);
      // Should have 2 versions registered
      expect(engine.getRuleCount()).toBe(2);
    });
  });

  describe('Rule Selection', () => {
    it('should get applicable rules for an observation category', () => {
      const rule1: VerificationRule = {
        name: 'health-check-rule',
        version: '1.0.0',
        appliesTo: ['health-check'],
        definition: 'Rule for health checks',
        description: 'Health check rule',
        createdAt: new Date().toISOString(),
        active: true,
      };

      const rule2: VerificationRule = {
        name: 'performance-rule',
        version: '1.0.0',
        appliesTo: ['performance'],
        definition: 'Rule for performance',
        description: 'Performance rule',
        createdAt: new Date().toISOString(),
        active: true,
      };

      engine.registerRule(rule1);
      engine.registerRule(rule2);

      const observation: Observation = {
        id: 'obs-123',
        claim: { statement: 'Service is healthy', category: 'health-check' },
        source: { system: 'test', version: '1.0.0', environment: 'test' },
        timestamp: new Date().toISOString(),
        observedBy: 'test-observer',
        metadata: {},
        confidence: 0.9,
        confidenceReason: 'Test',
        status: 'normalized',
      };

      const applicable = engine.getApplicableRules(observation);
      expect(applicable.length).toBe(1);
      expect(applicable[0].name).toBe('health-check-rule');
    });

    it('should exclude inactive rules from applicable rules', () => {
      const activeRule: VerificationRule = {
        name: 'active-rule',
        version: '1.0.0',
        appliesTo: ['health-check'],
        definition: 'Active',
        description: 'Active rule',
        createdAt: new Date().toISOString(),
        active: true,
      };

      const inactiveRule: VerificationRule = {
        name: 'inactive-rule',
        version: '1.0.0',
        appliesTo: ['health-check'],
        definition: 'Inactive',
        description: 'Inactive rule',
        createdAt: new Date().toISOString(),
        active: false,
      };

      engine.registerRule(activeRule);
      engine.registerRule(inactiveRule);

      const observation: Observation = {
        id: 'obs-456',
        claim: { statement: 'Test', category: 'health-check' },
        source: { system: 'test', version: '1.0.0', environment: 'test' },
        timestamp: new Date().toISOString(),
        observedBy: 'test-observer',
        metadata: {},
        confidence: 0.9,
        confidenceReason: 'Test',
        status: 'normalized',
      };

      const applicable = engine.getApplicableRules(observation);
      expect(applicable.length).toBe(1);
      expect(applicable[0].name).toBe('active-rule');
    });
  });

  describe('Verification with Status Code Rule', () => {
    beforeEach(() => {
      const rule: VerificationRule = {
        name: 'status-code-check',
        version: '1.0.0',
        appliesTo: ['health-check'],
        definition: 'HTTP 200 expected',
        description: 'Verify status code is 200',
        createdAt: new Date().toISOString(),
        active: true,
      };
      engine.registerRule(rule);
    });

    it('should pass verification when status code is 200', () => {
      const observation: Observation = {
        id: 'obs-200',
        claim: { statement: 'Service returned 200', category: 'health-check' },
        source: { system: 'api', version: '1.0.0', environment: 'test' },
        timestamp: new Date().toISOString(),
        observedBy: 'health-check',
        metadata: { statusCode: 200, responseTime: 45 },
        confidence: 0.95,
        confidenceReason: 'Multiple successful checks',
        status: 'normalized',
      };

      const result = engine.verify(observation);

      expect(result.summary.passed).toBe(true);
      expect(result.summary.rulesApplied).toBe(1);
      expect(result.summary.rulesPassed).toBe(1);
      expect(result.summary.rulesFailed).toBe(0);
      expect(result.evidencePath.length).toBeGreaterThan(0);
      expect(result.evidencePath[0].passed).toBe(true);
    });

    it('should fail verification when status code is not 200', () => {
      const observation: Observation = {
        id: 'obs-500',
        claim: { statement: 'Service returned 500', category: 'health-check' },
        source: { system: 'api', version: '1.0.0', environment: 'test' },
        timestamp: new Date().toISOString(),
        observedBy: 'health-check',
        metadata: { statusCode: 500, responseTime: 1200 },
        confidence: 0.8,
        confidenceReason: 'Error response observed',
        status: 'normalized',
      };

      const result = engine.verify(observation);

      expect(result.summary.passed).toBe(false);
      expect(result.summary.rulesApplied).toBe(1);
      expect(result.summary.rulesPassed).toBe(0);
      expect(result.summary.rulesFailed).toBe(1);
      expect(result.evidencePath[0].passed).toBe(false);
    });
  });

  describe('Verification with Response Time Rule', () => {
    beforeEach(() => {
      const rule: VerificationRule = {
        name: 'response-time-threshold',
        version: '1.0.0',
        appliesTo: ['performance'],
        definition: 'Response time < 100ms',
        description: 'Verify response time is below 100ms',
        createdAt: new Date().toISOString(),
        active: true,
      };
      engine.registerRule(rule);
    });

    it('should pass when response time is below threshold', () => {
      const observation: Observation = {
        id: 'obs-fast',
        claim: { statement: 'Response is fast', category: 'performance' },
        source: { system: 'api', version: '1.0.0', environment: 'test' },
        timestamp: new Date().toISOString(),
        observedBy: 'performance-monitor',
        metadata: { responseTime: 45 },
        confidence: 0.95,
        confidenceReason: 'Measured directly',
        status: 'normalized',
      };

      const result = engine.verify(observation);

      expect(result.summary.passed).toBe(true);
      expect(result.evidencePath[0].passed).toBe(true);
    });

    it('should fail when response time exceeds threshold', () => {
      const observation: Observation = {
        id: 'obs-slow',
        claim: { statement: 'Response is slow', category: 'performance' },
        source: { system: 'api', version: '1.0.0', environment: 'test' },
        timestamp: new Date().toISOString(),
        observedBy: 'performance-monitor',
        metadata: { responseTime: 500 },
        confidence: 0.85,
        confidenceReason: 'Measured directly',
        status: 'normalized',
      };

      const result = engine.verify(observation);

      expect(result.summary.passed).toBe(false);
      expect(result.evidencePath[0].passed).toBe(false);
    });
  });

  describe('Evidence Path Generation', () => {
    it('should generate a complete evidence path', () => {
      const rule: VerificationRule = {
        name: 'status-code-check',
        version: '1.0.0',
        appliesTo: ['health-check'],
        definition: 'Check status code',
        description: 'Verify status code is 200',
        createdAt: new Date().toISOString(),
        active: true,
      };
      engine.registerRule(rule);

      const observation: Observation = {
        id: 'obs-evidence',
        claim: { statement: 'Service is healthy', category: 'health-check' },
        source: { system: 'api', version: '1.0.0', environment: 'test' },
        timestamp: new Date().toISOString(),
        observedBy: 'monitor',
        metadata: { statusCode: 200 },
        confidence: 0.95,
        confidenceReason: 'Direct measurement',
        status: 'normalized',
      };

      const result = engine.verify(observation);

      expect(result.evidencePath).toBeDefined();
      expect(result.evidencePath.length).toBeGreaterThan(0);

      const step = result.evidencePath[0];
      expect(step.step).toBeDefined();
      expect(step.rule).toBe('status-code-check');
      expect(step.condition).toBeDefined();
      expect(step.value).toBeDefined();
      expect(step.passed).toBeDefined();
      expect(step.reasoning).toBeDefined();
    });

    it('should include reasoning in evidence steps', () => {
      const rule: VerificationRule = {
        name: 'status-code-check',
        version: '1.0.0',
        appliesTo: ['health-check'],
        definition: 'Check status code',
        description: 'Verify status code',
        createdAt: new Date().toISOString(),
        active: true,
      };
      engine.registerRule(rule);

      const observation: Observation = {
        id: 'obs-reasoning',
        claim: { statement: 'Status check', category: 'health-check' },
        source: { system: 'test', version: '1.0.0', environment: 'test' },
        timestamp: new Date().toISOString(),
        observedBy: 'test',
        metadata: { statusCode: 200 },
        confidence: 0.9,
        confidenceReason: 'Test',
        status: 'normalized',
      };

      const result = engine.verify(observation);

      expect(result.evidencePath[0].reasoning).toContain('Status code');
    });

    it('should mark failures with severity', () => {
      const rule: VerificationRule = {
        name: 'status-code-check',
        version: '1.0.0',
        appliesTo: ['health-check'],
        definition: 'Check status code',
        description: 'Verify status code is 200',
        createdAt: new Date().toISOString(),
        active: true,
      };
      engine.registerRule(rule);

      const observation: Observation = {
        id: 'obs-failure',
        claim: { statement: 'Status check failed', category: 'health-check' },
        source: { system: 'test', version: '1.0.0', environment: 'test' },
        timestamp: new Date().toISOString(),
        observedBy: 'test',
        metadata: { statusCode: 500 },
        confidence: 0.8,
        confidenceReason: 'Error observed',
        status: 'normalized',
      };

      const result = engine.verify(observation);

      expect(result.evidencePath[0].passed).toBe(false);
      expect(result.evidencePath[0].severity).toBe('critical');
    });
  });

  describe('Multiple Rules', () => {
    beforeEach(() => {
      const rule1: VerificationRule = {
        name: 'status-code-check',
        version: '1.0.0',
        appliesTo: ['health-check'],
        definition: 'Check status code',
        description: 'Status code must be 200',
        createdAt: new Date().toISOString(),
        active: true,
      };

      const rule2: VerificationRule = {
        name: 'response-time-threshold',
        version: '1.0.0',
        appliesTo: ['health-check'],
        definition: 'Check response time',
        description: 'Response time must be < 100ms',
        createdAt: new Date().toISOString(),
        active: true,
      };

      engine.registerRule(rule1);
      engine.registerRule(rule2);
    });

    it('should apply all applicable rules and pass if all pass', () => {
      const observation: Observation = {
        id: 'obs-multi-pass',
        claim: { statement: 'Service is healthy', category: 'health-check' },
        source: { system: 'api', version: '1.0.0', environment: 'test' },
        timestamp: new Date().toISOString(),
        observedBy: 'monitor',
        metadata: { statusCode: 200, responseTime: 45 },
        confidence: 0.95,
        confidenceReason: 'Direct measurement',
        status: 'normalized',
      };

      const result = engine.verify(observation);

      expect(result.summary.rulesApplied).toBe(2);
      expect(result.summary.rulesPassed).toBe(2);
      expect(result.summary.rulesFailed).toBe(0);
      expect(result.summary.passed).toBe(true);
    });

    it('should fail overall if any rule fails', () => {
      const observation: Observation = {
        id: 'obs-multi-fail',
        claim: { statement: 'Service is healthy', category: 'health-check' },
        source: { system: 'api', version: '1.0.0', environment: 'test' },
        timestamp: new Date().toISOString(),
        observedBy: 'monitor',
        metadata: { statusCode: 200, responseTime: 500 }, // Fast status, slow response
        confidence: 0.9,
        confidenceReason: 'Measurement',
        status: 'normalized',
      };

      const result = engine.verify(observation);

      expect(result.summary.rulesApplied).toBe(2);
      expect(result.summary.rulesPassed).toBe(1);
      expect(result.summary.rulesFailed).toBe(1);
      expect(result.summary.passed).toBe(false);
    });

    it('should include version information for all rules', () => {
      const observation: Observation = {
        id: 'obs-versions',
        claim: { statement: 'Health check', category: 'health-check' },
        source: { system: 'api', version: '1.0.0', environment: 'test' },
        timestamp: new Date().toISOString(),
        observedBy: 'monitor',
        metadata: { statusCode: 200, responseTime: 45 },
        confidence: 0.95,
        confidenceReason: 'Direct',
        status: 'normalized',
      };

      const result = engine.verify(observation);

      expect(Object.keys(result.ruleVersions).length).toBe(2);
      expect(result.ruleVersions['status-code-check']).toBe('1.0.0');
      expect(result.ruleVersions['response-time-threshold']).toBe('1.0.0');
    });
  });

  describe('Verification Result Structure', () => {
    it('should include required fields in verification result', () => {
      const rule: VerificationRule = {
        name: 'status-code-check',
        version: '1.0.0',
        appliesTo: ['health-check'],
        definition: 'Check status',
        description: 'Verify status',
        createdAt: new Date().toISOString(),
        active: true,
      };
      engine.registerRule(rule);

      const observation: Observation = {
        id: 'obs-structure',
        claim: { statement: 'Test', category: 'health-check' },
        source: { system: 'test', version: '1.0.0', environment: 'test' },
        timestamp: new Date().toISOString(),
        observedBy: 'test',
        metadata: { statusCode: 200 },
        confidence: 0.9,
        confidenceReason: 'Test',
        status: 'normalized',
      };

      const result = engine.verify(observation);

      expect(result.id).toBeDefined();
      expect(result.id).toMatch(/^ver-/);
      expect(result.observationId).toBe(observation.id);
      expect(result.timestamp).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.rules).toBeDefined();
      expect(result.evidencePath).toBeDefined();
      expect(result.ruleVersions).toBeDefined();
      expect(result.status).toBe('completed');
    });
  });

  describe('Cache Management', () => {
    it('should cache verification results', () => {
      const rule: VerificationRule = {
        name: 'status-code-check',
        version: '1.0.0',
        appliesTo: ['health-check'],
        definition: 'Check',
        description: 'Verify',
        createdAt: new Date().toISOString(),
        active: true,
      };
      engine.registerRule(rule);

      const observation: Observation = {
        id: 'obs-cache',
        claim: { statement: 'Test', category: 'health-check' },
        source: { system: 'test', version: '1.0.0', environment: 'test' },
        timestamp: new Date().toISOString(),
        observedBy: 'test',
        metadata: { statusCode: 200 },
        confidence: 0.9,
        confidenceReason: 'Test',
        status: 'normalized',
      };

      const result1 = engine.verify(observation);
      const result2 = engine.verify(observation);

      // Both should have the same ID (cached result)
      expect(result1.id).toBe(result2.id);
    });

    it('should allow clearing the cache', () => {
      const rule: VerificationRule = {
        name: 'status-code-check',
        version: '1.0.0',
        appliesTo: ['health-check'],
        definition: 'Check',
        description: 'Verify',
        createdAt: new Date().toISOString(),
        active: true,
      };
      engine.registerRule(rule);

      const observation: Observation = {
        id: 'obs-clear-cache',
        claim: { statement: 'Test', category: 'health-check' },
        source: { system: 'test', version: '1.0.0', environment: 'test' },
        timestamp: new Date().toISOString(),
        observedBy: 'test',
        metadata: { statusCode: 200 },
        confidence: 0.9,
        confidenceReason: 'Test',
        status: 'normalized',
      };

      engine.verify(observation);
      engine.clearCache();
      expect(() => engine.verify(observation)).not.toThrow();
    });
  });

  describe('No Applicable Rules', () => {
    it('should handle observations with no applicable rules', () => {
      const observation: Observation = {
        id: 'obs-no-rules',
        claim: { statement: 'Unknown category', category: 'unknown-category' },
        source: { system: 'test', version: '1.0.0', environment: 'test' },
        timestamp: new Date().toISOString(),
        observedBy: 'test',
        metadata: {},
        confidence: 0.9,
        confidenceReason: 'Test',
        status: 'normalized',
      };

      const result = engine.verify(observation);

      expect(result.summary.rulesApplied).toBe(0);
      expect(result.summary.rulesPassed).toBe(0);
      expect(result.summary.rulesFailed).toBe(0);
      expect(result.summary.passed).toBe(true); // No rules to fail
    });
  });
});
