import { OceanicosSandboxEngine } from '../index';
import { Observation, VerificationRule } from '@omega-v/types';

describe('@omega-v/sandbox — OceanicosSandboxEngine', () => {
  let sandbox: OceanicosSandboxEngine;

  beforeEach(() => {
    sandbox = new OceanicosSandboxEngine();
  });

  describe('Static Safety Validation', () => {
    it('should allow benign mathematical and boolean expressions', () => {
      const check = sandbox.validateSafeCode('responseTime < 100 && statusCode === 200');
      expect(check.safe).toBe(true);
      expect(check.threats).toHaveLength(0);
    });

    it('should detect and block dangerous identifiers (process, require, eval, globalThis)', () => {
      expect(sandbox.validateSafeCode('process.exit(1)').safe).toBe(false);
      expect(sandbox.validateSafeCode('require("fs").readFileSync("/etc/passwd")').safe).toBe(
        false
      );
      expect(sandbox.validateSafeCode('eval("2 + 2")').safe).toBe(false);
      expect(sandbox.validateSafeCode('globalThis.hacked = true').safe).toBe(false);
    });

    it('should detect prototype pollution vectors', () => {
      expect(sandbox.validateSafeCode('Object.__proto__.polluted = true').safe).toBe(false);
    });
  });

  describe('Safe Expression Execution', () => {
    it('should execute benign expression and return computed result', () => {
      const res = sandbox.executeExpression('responseTime < 100 && statusCode === 200', {
        responseTime: 45,
        statusCode: 200,
      });

      expect(res.success).toBe(true);
      expect(res.result).toBe(true);
      expect(res.executionTimeMs).toBeGreaterThanOrEqual(0);
      expect(res.gasConsumed).toBeGreaterThan(0);
    });

    it('should block execution of forbidden code without throwing', () => {
      const res = sandbox.executeExpression('process.cwd()', {});
      expect(res.success).toBe(false);
      expect(res.violation).toBe('FORBIDDEN_IDENTIFIER');
      expect(res.error).toContain('process');
    });

    it('should handle syntax errors safely', () => {
      const res = sandbox.executeExpression('responseTime <<< 100', { responseTime: 20 });
      expect(res.success).toBe(false);
      expect(res.violation).toBe('EXECUTION_ERROR');
    });
  });

  describe('Rule Execution & Telemetry Stats', () => {
    it('should execute a VerificationRule against an Observation in sandbox', () => {
      const rule: VerificationRule = {
        name: 'test-latency-rule',
        version: '1.0.0',
        appliesTo: ['health-check'],
        definition: 'responseTime <= 50 && confidence >= 0.9',
        description: 'Check latency and confidence',
        createdAt: new Date().toISOString(),
        active: true,
      };

      const obs: Observation = {
        id: 'obs-sand-01',
        claim: { category: 'health-check', statement: 'API is healthy' },
        source: { system: 'test', version: '0.1.0', environment: 'production' },
        observedBy: 'tester',
        timestamp: new Date().toISOString(),
        metadata: { responseTime: 30 },
        status: 'normalized',
        confidence: 0.95,
        confidenceReason: 'Test observation',
      };

      const res = sandbox.executeRule(rule, obs);
      expect(res.success).toBe(true);
      expect(res.result).toBe(true);

      const stats = sandbox.getStats();
      expect(stats.totalRuns).toBeGreaterThanOrEqual(1);
      expect(stats.successfulRuns).toBeGreaterThanOrEqual(1);
    });
  });
});
