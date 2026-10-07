import {
  evaluateAuthorization,
  isPermittedWithoutHumanApproval,
  validateAuthorizationBoundary,
} from '../index.js';
import type { AuthorizationRequest } from '../index.js';

describe('@oceanicos/authorization Boundary Engine (§6, §8, §9, §12)', () => {
  const baseValidRequest: AuthorizationRequest = {
    subject: 'kernel:node-probe',
    intent: 'Probe node latency and memory headroom',
    isDestructive: false,
    isFinancial: false,
    isIrreversible: false,
    hasDissentRecords: false,
    requestedBy: 'operator:telemetry-probe',
    evidence: ['ev-telemetry-001'],
    timestamp: new Date().toISOString(),
  };

  describe('1. Fail-Closed Strict DENY (§6, §8, §12)', () => {
    it('DENYs when subject is missing or whitespace', () => {
      const decision = evaluateAuthorization({
        ...baseValidRequest,
        subject: '   ',
      });
      expect(decision.decision).toBe('DENY');
      expect(decision.requiresHumanApproval).toBe(false);
      expect(decision.authorizedBy).toBeNull();
      expect(decision.rationale).toContain('Subject required');
    });

    it('DENYs when intent is missing or whitespace', () => {
      const decision = evaluateAuthorization({
        ...baseValidRequest,
        intent: '',
      });
      expect(decision.decision).toBe('DENY');
      expect(decision.requiresHumanApproval).toBe(false);
      expect(decision.authorizedBy).toBeNull();
      expect(decision.rationale).toContain('Intent required');
    });

    it('DENYs when requester identity is missing or whitespace', () => {
      const decision = evaluateAuthorization({
        ...baseValidRequest,
        requestedBy: '   ',
      });
      expect(decision.decision).toBe('DENY');
      expect(decision.requiresHumanApproval).toBe(false);
      expect(decision.authorizedBy).toBeNull();
      expect(decision.rationale).toContain('Requester identity required');
    });

    it('DENYs autonomous lethal or kinetic targeting attempts per Constitution §12', () => {
      const targetingDecision = evaluateAuthorization({
        ...baseValidRequest,
        intent: 'autonomous kinetic targeting against node cluster',
      });
      expect(targetingDecision.decision).toBe('DENY');
      expect(targetingDecision.requiresHumanApproval).toBe(false);
      expect(targetingDecision.rationale).toContain('Constitution §12');

      const bypassDecision = evaluateAuthorization({
        ...baseValidRequest,
        intent: 'escalate_privilege to bypass root verification',
      });
      expect(bypassDecision.decision).toBe('DENY');
      expect(bypassDecision.rationale).toContain('Constitution §12');
    });
  });

  describe('2. Consequential Human Steward REVIEW (§6, §9)', () => {
    it('requires human steward REVIEW when action is destructive', () => {
      const decision = evaluateAuthorization({
        ...baseValidRequest,
        isDestructive: true,
      });
      expect(decision.decision).toBe('REVIEW');
      expect(decision.requiresHumanApproval).toBe(true);
      expect(decision.authorizedBy).toBeNull();
      expect(decision.rationale).toContain('destructive=true');
    });

    it('requires human steward REVIEW when action is financial', () => {
      const decision = evaluateAuthorization({
        ...baseValidRequest,
        isFinancial: true,
      });
      expect(decision.decision).toBe('REVIEW');
      expect(decision.requiresHumanApproval).toBe(true);
      expect(decision.authorizedBy).toBeNull();
      expect(decision.rationale).toContain('financial=true');
    });

    it('requires human steward REVIEW when action is irreversible', () => {
      const decision = evaluateAuthorization({
        ...baseValidRequest,
        isIrreversible: true,
      });
      expect(decision.decision).toBe('REVIEW');
      expect(decision.requiresHumanApproval).toBe(true);
      expect(decision.authorizedBy).toBeNull();
      expect(decision.rationale).toContain('irreversible=true');
    });

    it('requires human steward REVIEW when dissent records exist', () => {
      const decision = evaluateAuthorization({
        ...baseValidRequest,
        hasDissentRecords: true,
      });
      expect(decision.decision).toBe('REVIEW');
      expect(decision.requiresHumanApproval).toBe(true);
      expect(decision.authorizedBy).toBeNull();
      expect(decision.rationale).toContain('dissent=true');
    });
  });

  describe('3. Bounded Autonomous ALLOW (§6)', () => {
    it('ALLOWs non-destructive, non-financial, reversible action with no dissent', () => {
      const decision = evaluateAuthorization(baseValidRequest);
      expect(decision.decision).toBe('ALLOW');
      expect(decision.requiresHumanApproval).toBe(false);
      expect(decision.authorizedBy).toBe('system:auto');
      expect(decision.authorizedAt).toBeDefined();
      expect(decision.evidence).toEqual(['ev-telemetry-001']);
    });
  });

  describe('4. Helper Functions', () => {
    it('isPermittedWithoutHumanApproval accurately reflects ALLOW condition', () => {
      expect(isPermittedWithoutHumanApproval(baseValidRequest)).toBe(true);
      expect(isPermittedWithoutHumanApproval({ ...baseValidRequest, isDestructive: true })).toBe(false);
      expect(isPermittedWithoutHumanApproval({ ...baseValidRequest, subject: '' })).toBe(false);
    });

    it('validateAuthorizationBoundary returns valid=true only for ALLOW', () => {
      const validBoundary = validateAuthorizationBoundary(baseValidRequest);
      expect(validBoundary.valid).toBe(true);
      expect(validBoundary.decision).toBe('ALLOW');

      const reviewBoundary = validateAuthorizationBoundary({ ...baseValidRequest, isFinancial: true });
      expect(reviewBoundary.valid).toBe(false);
      expect(reviewBoundary.decision).toBe('REVIEW');

      const denyBoundary = validateAuthorizationBoundary({ ...baseValidRequest, intent: 'targeting weaponize' });
      expect(denyBoundary.valid).toBe(false);
      expect(denyBoundary.decision).toBe('DENY');
    });
  });
});
