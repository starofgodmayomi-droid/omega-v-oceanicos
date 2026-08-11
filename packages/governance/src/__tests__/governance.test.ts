import { GovernanceEngine } from '../index';
import { GovernanceRule } from '@omega-v/types';

describe('GovernanceEngine (Section XXIX Governance)', () => {
  let engine: GovernanceEngine;

  beforeEach(() => {
    engine = new GovernanceEngine();
  });

  const mockRule: GovernanceRule = {
    id: 'rule-1',
    action: 'MODEL_DEPLOYMENT',
    requiresHumanApproval: false,
    minimumConfidenceThreshold: 0.9,
    maximumRiskThreshold: 0.2,
    active: true,
  };

  it('should deny action if no rule exists (fail closed)', () => {
    const decision = engine.requestAction('MODEL_DEPLOYMENT', 'user1', {});
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain('No active governance rules');
  });

  it('should allow action if confidence and risk thresholds are met', () => {
    engine.registerRule(mockRule);
    const decision = engine.requestAction('MODEL_DEPLOYMENT', 'user1', { confidence: 0.95, risk: 0.1 });
    expect(decision.allowed).toBe(true);
  });

  it('should deny action if confidence is too low', () => {
    engine.registerRule(mockRule);
    const decision = engine.requestAction('MODEL_DEPLOYMENT', 'user1', { confidence: 0.8, risk: 0.1 });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain('Confidence');
  });

  it('should deny action if risk is too high', () => {
    engine.registerRule(mockRule);
    const decision = engine.requestAction('MODEL_DEPLOYMENT', 'user1', { confidence: 0.95, risk: 0.5 });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain('Risk');
  });

  it('should deny action and indicate human approval is required', () => {
    engine.registerRule({ ...mockRule, requiresHumanApproval: true });
    const decision = engine.requestAction('MODEL_DEPLOYMENT', 'user1', { confidence: 0.95, risk: 0.1 });
    expect(decision.allowed).toBe(false);
    expect(decision.requiresHumanApproval).toBe(true);
    expect(decision.reason).toContain('requires human approval');
  });
});
