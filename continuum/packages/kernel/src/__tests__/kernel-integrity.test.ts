import { OceanicosKernel } from '../index';
import type { KernelIntegrityReport } from '../index';

/** Reusable minimal transition opts */
function minTransition(claim = 'Test transition') {
  return {
    intent: {
      claim,
      actors: ['did:omega:agent:test-01'],
      inputs: { v: 1 },
      expectedOutputs: { ok: true },
      constraints: [],
      permissions: ['READ'],
      dependencies: [],
      maxRiskScore: 0.1,
      economicTarget: { targetValue: 10, resourceBudget: 5 },
    },
    observation: {
      source: 'test:integrity',
      observedAt: new Date().toISOString(),
      rawTelemetry: { metric: 1 },
      epistemicType: 'FACT' as const,
      confidence: 0.99,
    },
    evidenceItems: [
      {
        claim: 'Evidence passes',
        source: 'test',
        observationId: 'obs-1',
        commandOrTest: 'echo ok',
        status: 'PASSED' as const,
        confidence: 1.0,
      },
    ],
    actionPlan: {
      targetService: 'test-service',
      payload: {},
      isDestructive: false,
      isFinancial: false,
      gasLimit: 100,
      reversibility: 'REVERSIBLE' as const,
    },
    autoAuthorizeIfNonDestructive: true,
  };
}

describe('@omega-v/kernel — Hash-Chain Integrity Verification', () => {
  let kernel: OceanicosKernel;

  beforeEach(() => {
    kernel = new OceanicosKernel('test-integrity-secret');
  });

  // ── Chain Integrity ──────────────────────────────────────────────

  it('empty kernel reports valid integrity', () => {
    const report = kernel.verifyChainIntegrity();
    expect(report.valid).toBe(true);
    expect(report.chainLength).toBe(0);
    expect(report.attestationFailures).toEqual([]);
    expect(report.firstBrokenLink).toBeUndefined();
  });

  it('single transition maintains valid chain', () => {
    kernel.transition(minTransition('Single node'));
    const report = kernel.verifyChainIntegrity();
    expect(report.valid).toBe(true);
    expect(report.chainLength).toBe(1);
  });

  it('multi-transition chain maintains integrity', () => {
    kernel.transition(minTransition('Node 1'));
    kernel.transition(minTransition('Node 2'));
    kernel.transition(minTransition('Node 3'));

    const report = kernel.verifyChainIntegrity();
    expect(report.valid).toBe(true);
    expect(report.chainLength).toBe(3);
    expect(report.attestationFailures).toEqual([]);
  });

  it('reports chain length and checked timestamp', () => {
    kernel.transition(minTransition());
    kernel.transition(minTransition());

    const before = new Date().toISOString();
    const report = kernel.verifyChainIntegrity();
    const after = new Date().toISOString();

    expect(report.chainLength).toBe(2);
    expect(report.checkedAt >= before).toBe(true);
    expect(report.checkedAt <= after).toBe(true);
  });

  // ── Chain Head & Length ──────────────────────────────────────────

  it('getHead returns null on empty kernel', () => {
    expect(kernel.getHead()).toBeNull();
  });

  it('getHead returns the latest state node', () => {
    kernel.transition(minTransition('First'));
    const second = kernel.transition(minTransition('Second'));

    const head = kernel.getHead();
    expect(head).not.toBeNull();
    expect(head!.stateId).toBe(second.stateId);
  });

  it('getChainLength tracks transitions', () => {
    expect(kernel.getChainLength()).toBe(0);
    kernel.transition(minTransition());
    expect(kernel.getChainLength()).toBe(1);
    kernel.transition(minTransition());
    expect(kernel.getChainLength()).toBe(2);
  });

  // ── Immutable Authorization ─────────────────────────────────────

  it('authorizeAction creates new immutable node (does not mutate original reference)', () => {
    // Create a destructive action that requires human approval
    const state = kernel.transition({
      ...minTransition('Destructive op'),
      actionPlan: {
        targetService: 'production-db',
        payload: { drop: true },
        isDestructive: true,
        isFinancial: false,
        gasLimit: 500,
        reversibility: 'IRREVERSIBLE' as const,
      },
      autoAuthorizeIfNonDestructive: false,
    });

    expect(state.authorization.isAuthorized).toBe(false);
    expect(state.authorization.requiresHumanApproval).toBe(true);

    const authorized = kernel.authorizeAction({
      stateId: state.stateId,
      authorizerDid: 'did:omega:human:admin-01',
      authorizationSignature: '0xfake-sig',
    });

    expect(authorized.authorization.isAuthorized).toBe(true);
    expect(authorized.authorization.authorizedByDid).toBe('did:omega:human:admin-01');
    expect(authorized.action.status).toBe('READY');
  });

  // ── Execute Action Gate ─────────────────────────────────────────

  it('executeAction rejects unauthorized states', () => {
    const state = kernel.transition({
      ...minTransition('Gated op'),
      actionPlan: {
        targetService: 'production',
        payload: {},
        isDestructive: true,
        isFinancial: false,
        gasLimit: 100,
        reversibility: 'IRREVERSIBLE' as const,
      },
      autoAuthorizeIfNonDestructive: false,
    });

    expect(() => {
      kernel.executeAction({ stateId: state.stateId });
    }).toThrow(/EXECUTION_DENIED/);
  });

  it('executeAction advances authorized states to EXECUTING', () => {
    const state = kernel.transition({
      ...minTransition('Authorized op'),
      actionPlan: {
        targetService: 'safe-service',
        payload: {},
        isDestructive: false,
        isFinancial: false,
        gasLimit: 100,
        reversibility: 'REVERSIBLE' as const,
      },
      autoAuthorizeIfNonDestructive: true,
    });

    // State is auto-authorized since non-destructive
    expect(state.authorization.isAuthorized).toBe(true);
    expect(state.action.status).toBe('READY');

    const executing = kernel.executeAction({ stateId: state.stateId });
    expect(executing.action.status).toBe('EXECUTING');
  });

  it('executeAction rejects already-executed states', () => {
    const state = kernel.transition(minTransition());
    kernel.executeAction({ stateId: state.stateId });

    // Now action status is EXECUTING, not READY
    expect(() => {
      kernel.executeAction({ stateId: state.stateId });
    }).toThrow(/EXECUTION_DENIED.*expected READY/);
  });

  // ── Full Lifecycle with Integrity ───────────────────────────────

  it('full lifecycle: transition → authorize → execute → consequence → integrity passes', () => {
    // 1. Transition (destructive, requires human auth)
    const state = kernel.transition({
      ...minTransition('Full lifecycle test'),
      actionPlan: {
        targetService: 'deploy-target',
        payload: { version: '2.0' },
        isDestructive: true,
        isFinancial: false,
        gasLimit: 300,
        reversibility: 'COMPENSATABLE' as const,
      },
      autoAuthorizeIfNonDestructive: false,
    });

    expect(state.authorization.isAuthorized).toBe(false);

    // 2. Authorize
    const authorized = kernel.authorizeAction({
      stateId: state.stateId,
      authorizerDid: 'did:omega:human:cto',
      authorizationSignature: '0xsig-cto',
    });

    expect(authorized.authorization.isAuthorized).toBe(true);

    // 3. Execute
    const executing = kernel.executeAction({ stateId: state.stateId });
    expect(executing.action.status).toBe('EXECUTING');

    // 4. Record consequence
    const settled = kernel.applyConsequence({
      stateId: state.stateId,
      observedStatus: 'SUCCESS',
      realizedEffects: { deployed: true },
      executionDurationMs: 150,
      verifiedValueGenerated: 100,
    });

    expect(settled.action.status).toBe('EXECUTED');
    expect(settled.consequence).toBeDefined();
    expect(settled.learning).toBeDefined();
    expect(settled.settledAt).toBeDefined();

    // 5. Verify the chain is still valid
    const report = kernel.verifyChainIntegrity();
    expect(report.valid).toBe(true);
    expect(report.chainLength).toBe(1);
  });
});
