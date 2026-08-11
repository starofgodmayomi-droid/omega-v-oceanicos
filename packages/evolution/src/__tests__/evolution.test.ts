import { EvolutionEngine } from '../index';
import { VerificationRule } from '@omega-v/types';

describe('EvolutionEngine (Section XXVII Controlled Recompilation)', () => {
  let engine: EvolutionEngine;
  let rule: VerificationRule;

  beforeEach(() => {
    engine = new EvolutionEngine();
    rule = {
      name: 'latency-check',
      version: '1.0.0',
      appliesTo: ['health'],
      definition: 'responseTime < 100',
      description: 'Response time under 100ms',
      createdAt: new Date().toISOString(),
      active: true,
    };
  });

  describe('Drift Detection', () => {
    it('should report MAINTAIN when failure rate is low', () => {
      const history = [{ passed: true }, { passed: true }, { passed: true }];
      const drift = engine.analyzeDrift(rule.name, history);
      expect(drift.driftDetected).toBe(false);
      expect(drift.recommendedAction).toBe('MAINTAIN');
    });

    it('should detect drift when failure rate exceeds threshold', () => {
      const history = [{ passed: false }, { passed: false }, { passed: true }, { passed: false }];
      const drift = engine.analyzeDrift(rule.name, history);
      expect(drift.driftDetected).toBe(true);
      expect(drift.recommendedAction).toBe('RECOMPILE_DSL');
    });
  });

  describe('Controlled Recompilation & Proposal Promotion', () => {
    it('should create valid proposal after DSL syntax check', () => {
      const proposal = engine.proposeRecompilation(
        rule,
        'responseTime < 250',
        'Relax threshold to accommodate P99 surge'
      );

      expect(proposal.id).toMatch(/^evo-/);
      expect(proposal.status).toBe('PROPOSED');
      expect(proposal.candidateDefinition).toBe('responseTime < 250');
    });

    it('should throw error when proposing invalid DSL syntax', () => {
      expect(() => {
        engine.proposeRecompilation(rule, 'responseTime <<< 250', 'bad syntax');
      }).toThrow();
    });

    it('should promote proposal', () => {
      const proposal = engine.proposeRecompilation(rule, 'responseTime < 200', 'upgrade');
      const promoted = engine.promote(proposal.id);
      expect(promoted?.status).toBe('PROMOTED');
    });
  });
});
