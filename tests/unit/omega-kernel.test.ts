import { describe, it, expect } from '@jest/globals';
import {
  compileOmegaIntent,
  validateOmegaIR,
  createOmegaWorkerRegistry,
  getOmegaWorker,
  resolveChangeAdmission,
  admitOmegaIR,
  executeAuthorizedTransition,
  createRealityObservation,
  reconcileReality,
  OmegaAttestationMemory,
  synthesizeOmegaLearning,
  proposeNextOmegaSlice,
  compileNextLoopIntent,
} from '@oceanicos/mini';

import type {
  OmegaChangeRecord,
  OmegaWorkerCapability,
} from '@oceanicos/types';

// ─── Helpers ─────────────────────────────────────────────────────────

function makeWorker(overrides: Partial<OmegaWorkerCapability> = {}): OmegaWorkerCapability {
  return {
    id: 'worker-observer',
    version: '1.0.0',
    role: 'observer',
    mode: 'read-only',
    description: 'Test observer',
    inputSchema: 'string',
    outputSchema: 'string',
    authorityRequired: false,
    approvalRequired: false,
    policyRefs: ['policy-safety-v1'],
    evidenceRequired: ['git-status'],
    timeoutMs: 5000,
    maxOutputBytes: 4096,
    retries: 0,
    dryRunSupported: true,
    rollbackSupported: false,
    ...overrides,
  };
}

function makeChange(overrides: Partial<OmegaChangeRecord> = {}): OmegaChangeRecord {
  return {
    id: 'change-001',
    subject: 'test-subject',
    intent: 'Run unit tests',
    stateBefore: 'clean',
    evidence: ['git-status-clean'],
    authority: 'human:steward',
    policy: 'policy-safety-v1',
    decision: 'REVIEW',
    authorized: false,
    provenance: {
      source: 'test',
      observedAt: new Date().toISOString(),
      attributedTo: 'test-suite',
    },
    ...overrides,
  };
}

// ─── C1: Compiler ────────────────────────────────────────────────────

describe('C1 — compileOmegaIntent', () => {
  it('produces deterministic IR v1 from valid input', () => {
    const ir = compileOmegaIntent({
      intent: 'Run full test suite',
      subject: 'monorepo',
      stateBefore: 'clean',
      evidenceRefs: [{ id: 'ev1', kind: 'git-status', source: 'local' }],
      policyRefs: [{ id: 'pol1', version: '1.0', requirement: 'read-only workers only' }],
      workerPlan: [{
        workerId: 'worker-observer',
        version: '1.0.0',
        capability: 'observe',
        mode: 'read-only',
        approvalRequired: false,
      }],
      transition: { dryRun: false },
      observation: { observerId: 'obs1', targets: ['monorepo'], evidenceRequired: ['git-status'] },
    });

    expect(ir.version).toBe('omega-ir.v1');
    expect(ir.intent).toBe('Run full test suite');
    expect(ir.workerPlan).toHaveLength(1);
    expect(ir.transitionSpec.dryRun).toBe(false);
  });

  it('rejects empty intent', () => {
    expect(() => compileOmegaIntent({
      intent: '   ',
      subject: 'x',
      stateBefore: 'y',
      evidenceRefs: [],
      policyRefs: [],
      workerPlan: [],
      transition: { dryRun: true },
      observation: { observerId: 'o', targets: [], evidenceRequired: [] },
    })).toThrow('non-empty intent');
  });
});

// ─── C2: Validator ───────────────────────────────────────────────────

describe('C2 — validateOmegaIR', () => {
  it('validates correct IR', () => {
    const ir = compileOmegaIntent({
      intent: 'Build the project',
      subject: 'monorepo',
      stateBefore: 'clean',
      evidenceRefs: [{ id: 'e1', kind: 'build-output', source: 'local' }],
      policyRefs: [{ id: 'p1', version: '1.0', requirement: 'pass build' }],
      workerPlan: [{
        workerId: 'worker-planner',
        version: '1.0.0',
        capability: 'plan',
        mode: 'read-only',
        approvalRequired: false,
      }],
      transition: { dryRun: true },
      observation: { observerId: 'obs', targets: ['build'], evidenceRequired: ['build-output'] },
    });

    const result = validateOmegaIR(ir);
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('rejects unsupported IR version', () => {
    const badIR = { version: 'omega-ir.v99' as any, intent: 'x', evidenceRefs: [], policyRefs: [], workerPlan: [], transitionSpec: { subject: 'a', intent: 'b', stateBefore: 'c', dryRun: true }, observationSpec: { observerId: 'o', targets: [], evidenceRequired: [] } };
    const result = validateOmegaIR(badIR);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.path === 'version')).toBe(true);
  });
});

// ─── C3: Worker Registry ─────────────────────────────────────────────

describe('C3 — createOmegaWorkerRegistry', () => {
  it('creates a valid registry', () => {
    const worker = makeWorker();
    const registry = createOmegaWorkerRegistry([worker]);
    expect(registry.version).toBe('omega-workers.v1');
    expect(registry.workers).toHaveLength(1);
  });

  it('rejects duplicate worker ids', () => {
    const w = makeWorker();
    expect(() => createOmegaWorkerRegistry([w, w])).toThrow('Duplicate worker id');
  });

  it('retrieves workers by id', () => {
    const w = makeWorker({ id: 'worker-test' });
    const registry = createOmegaWorkerRegistry([w]);
    expect(getOmegaWorker(registry, 'worker-test')?.id).toBe('worker-test');
    expect(getOmegaWorker(registry, 'nonexistent')).toBeUndefined();
  });
});

// ─── C4: Admission ──────────────────────────────────────────────────

describe('C4 — resolveChangeAdmission + admitOmegaIR', () => {
  it('ALLOW when both gates are satisfied', () => {
    const change = makeChange();
    const admitted = resolveChangeAdmission(change, { authorityVerified: true, policySatisfied: true });
    expect(admitted.decision).toBe('ALLOW');
    expect(admitted.authorized).toBe(true);
  });

  it('DENY when authority is not verified', () => {
    const change = makeChange();
    const admitted = resolveChangeAdmission(change, { authorityVerified: false, policySatisfied: true });
    expect(admitted.decision).toBe('DENY');
    expect(admitted.authorized).toBe(false);
  });

  it('DENY when policy is not satisfied', () => {
    const change = makeChange();
    const admitted = resolveChangeAdmission(change, { authorityVerified: true, policySatisfied: false });
    expect(admitted.decision).toBe('DENY');
  });

  it('admitOmegaIR bridges IR validation to admission gate', () => {
    const worker = makeWorker();
    const registry = createOmegaWorkerRegistry([worker]);
    const ir = compileOmegaIntent({
      intent: 'Observe system',
      subject: 'monorepo',
      stateBefore: 'clean',
      evidenceRefs: [{ id: 'e1', kind: 'git-status', source: 'local' }],
      policyRefs: [{ id: 'policy-safety-v1', version: '1.0', requirement: 'read-only' }],
      workerPlan: [{
        workerId: 'worker-observer',
        version: '1.0.0',
        capability: 'observe',
        mode: 'read-only',
        approvalRequired: false,
      }],
      transition: { dryRun: true },
      observation: { observerId: 'obs', targets: ['system'], evidenceRequired: ['git-status'] },
    });
    const change = makeChange();
    const result = admitOmegaIR({
      ir,
      registry,
      change,
      authorityVerified: true,
      policySatisfied: true,
    });
    expect(result.registryMatched).toBe(true);
    expect(result.change.decision).toBe('ALLOW');
  });
});

// ─── C5: Transition Executor ────────────────────────────────────────

describe('C5 — executeAuthorizedTransition', () => {
  it('executes an ALLOW record and produces attestation', () => {
    const change = makeChange({ decision: 'ALLOW', authorized: true });
    const execution = executeAuthorizedTransition(change, ({ stateBefore }) => ({
      stateAfter: `${stateBefore}-tested`,
      consequence: 'Tests passed',
    }));
    expect(execution.status).toBe('EXECUTED');
    expect(execution.record.stateAfter).toBe('clean-tested');
    expect(execution.attestationId).toBeDefined();
    expect(execution.attestationId).toMatch(/^attestation-/);
  });

  it('refuses a DENY record', () => {
    const change = makeChange({ decision: 'DENY', authorized: false });
    const execution = executeAuthorizedTransition(change, () => ({ stateAfter: 'x' }));
    expect(execution.status).toBe('REFUSED');
    expect(execution.reason).toContain('not authorized');
  });

  it('refuses REVIEW record when not yet authorized (fail-closed)', () => {
    const change = makeChange({ decision: 'REVIEW', authorized: false });
    const execution = executeAuthorizedTransition(change, () => ({ stateAfter: 'x' }));
    // Fail-closed: unauthorized is checked before decision, so REFUSED not REVIEW_REQUIRED
    expect(execution.status).toBe('REFUSED');
  });

  it('rejects empty stateAfter from handler', () => {
    const change = makeChange({ decision: 'ALLOW', authorized: true });
    expect(() => executeAuthorizedTransition(change, () => ({ stateAfter: '  ' }))).toThrow('non-empty stateAfter');
  });
});

// ─── C6: Reality Reconciler ─────────────────────────────────────────

describe('C6 — createRealityObservation + reconcileReality', () => {
  it('creates a valid observation', () => {
    const obs = createRealityObservation('obs1', 'monorepo', 'clean-tested');
    expect(obs.observerId).toBe('obs1');
    expect(obs.stateHash).toBeTruthy();
    expect(obs.timestamp).toBeTruthy();
  });

  it('rejects empty observerId', () => {
    expect(() => createRealityObservation('  ', 'target', 'state')).toThrow('observerId is required');
  });

  it('VERIFIED when hashes match', () => {
    const change = makeChange({ decision: 'ALLOW', authorized: true, stateAfter: 'clean-tested' });
    const obs = createRealityObservation('obs1', 'monorepo', 'clean-tested');
    const reconciliation = reconcileReality(change, obs);
    expect(reconciliation.verdict).toBe('VERIFIED');
    expect(reconciliation.discrepancies).toHaveLength(0);
  });

  it('DIVERGENT when hashes differ', () => {
    const change = makeChange({ decision: 'ALLOW', authorized: true, stateAfter: 'claimed-state' });
    const obs = createRealityObservation('obs1', 'monorepo', 'different-observed-state');
    const reconciliation = reconcileReality(change, obs);
    expect(reconciliation.verdict).toBe('DIVERGENT');
    expect(reconciliation.discrepancies.length).toBeGreaterThan(0);
  });

  it('NOT_EXECUTED when no stateAfter', () => {
    const change = makeChange({ stateAfter: undefined });
    const reconciliation = reconcileReality(change);
    expect(reconciliation.verdict).toBe('NOT_EXECUTED');
  });

  it('UNKNOWN when no observation', () => {
    const change = makeChange({ stateAfter: 'some-state' });
    const reconciliation = reconcileReality(change);
    expect(reconciliation.verdict).toBe('UNKNOWN');
  });
});

// ─── C7: Attestation Memory ────────────────────────────────────────

describe('C7 — OmegaAttestationMemory', () => {
  it('appends entries with chain integrity', () => {
    const memory = new OmegaAttestationMemory();
    const change = makeChange({ decision: 'ALLOW', authorized: true });
    const execution = executeAuthorizedTransition(change, () => ({
      stateAfter: 'clean-tested',
      consequence: 'Tests passed',
    }));

    const entry = memory.append(change, execution);
    expect(entry.index).toBe(0);
    expect(entry.changeId).toBe('change-001');
    expect(entry.transitionStatus).toBe('EXECUTED');
    expect(entry.hash).toBeTruthy();
    expect(memory.height).toBe(1);
  });

  it('chains entries with previous hash linking', () => {
    const memory = new OmegaAttestationMemory();
    const change1 = makeChange({ id: 'c1', decision: 'ALLOW', authorized: true });
    const change2 = makeChange({ id: 'c2', decision: 'ALLOW', authorized: true });
    const handler = () => ({ stateAfter: 'done', consequence: 'ok' });

    const exec1 = executeAuthorizedTransition(change1, handler);
    const exec2 = executeAuthorizedTransition(change2, handler);

    const entry1 = memory.append(change1, exec1);
    const entry2 = memory.append(change2, exec2);

    expect(entry2.previousHash).toBe(entry1.hash);
    expect(entry2.index).toBe(1);
  });

  it('verifies chain integrity', () => {
    const memory = new OmegaAttestationMemory();
    const change = makeChange({ decision: 'ALLOW', authorized: true });
    const execution = executeAuthorizedTransition(change, () => ({
      stateAfter: 'tested',
    }));

    memory.append(change, execution);
    memory.append(change, execution);
    memory.append(change, execution);

    expect(memory.verifyIntegrity()).toBe(true);
  });

  it('records reality reconciliation in entries', () => {
    const memory = new OmegaAttestationMemory();
    const change = makeChange({ decision: 'ALLOW', authorized: true, stateAfter: 'clean-tested' });
    const execution = executeAuthorizedTransition(change, () => ({
      stateAfter: 'clean-tested',
    }));
    const obs = createRealityObservation('obs1', 'monorepo', 'clean-tested');
    const reconciliation = reconcileReality(
      { ...change, stateAfter: execution.record.stateAfter! },
      obs,
    );

    const entry = memory.append(change, execution, reconciliation);
    expect(entry.realityVerdict).toBe('VERIFIED');
    expect(entry.discrepancies).toHaveLength(0);
  });

  it('snapshot returns immutable copy', () => {
    const memory = new OmegaAttestationMemory();
    const change = makeChange({ decision: 'ALLOW', authorized: true });
    const execution = executeAuthorizedTransition(change, () => ({
      stateAfter: 'done',
    }));
    memory.append(change, execution);

    const snap = memory.snapshot();
    expect(snap.height).toBe(1);
    expect(snap.integrityValid).toBe(true);
    expect(snap.tipHash).toBe(memory.tip()?.hash);
  });

  it('findByChangeId returns matching entries', () => {
    const memory = new OmegaAttestationMemory();
    const handler = () => ({ stateAfter: 'done' });
    const c1 = makeChange({ id: 'find-me', decision: 'ALLOW', authorized: true });
    const c2 = makeChange({ id: 'not-me', decision: 'ALLOW', authorized: true });

    memory.append(c1, executeAuthorizedTransition(c1, handler));
    memory.append(c2, executeAuthorizedTransition(c2, handler));
    memory.append(c1, executeAuthorizedTransition(c1, handler));

    const results = memory.findByChangeId('find-me');
    expect(results).toHaveLength(2);
  });
});

// ─── Full Pipeline Integration ──────────────────────────────────────

describe('Full Ω Kernel Pipeline: Compile → Validate → Admit → Execute → Observe → Reconcile → Attest', () => {
  it('completes the full intent-to-attestation loop', () => {
    // C1: Compile
    const ir = compileOmegaIntent({
      intent: 'Verify monorepo build',
      subject: 'omega-v-oceanicos',
      stateBefore: 'clean',
      evidenceRefs: [{ id: 'e1', kind: 'git-status', source: 'local', digest: 'abc123' }],
      policyRefs: [{ id: 'policy-safety-v1', version: '1.0', requirement: 'read-only only' }],
      workerPlan: [{
        workerId: 'worker-observer',
        version: '1.0.0',
        capability: 'observe',
        mode: 'read-only',
        approvalRequired: false,
      }],
      transition: { dryRun: false, requestedStateAfter: 'build-verified' },
      observation: { observerId: 'obs1', targets: ['build'], evidenceRequired: ['git-status'] },
    });
    expect(ir.version).toBe('omega-ir.v1');

    // C2: Validate
    const validation = validateOmegaIR(ir);
    expect(validation.valid).toBe(true);

    // C3: Registry
    const worker = makeWorker();
    const registry = createOmegaWorkerRegistry([worker]);

    // C4: Admit
    const change = makeChange();
    const admission = admitOmegaIR({
      ir, registry, change,
      authorityVerified: true,
      policySatisfied: true,
    });
    expect(admission.registryMatched).toBe(true);
    expect(admission.change.decision).toBe('ALLOW');

    // C5: Execute
    const execution = executeAuthorizedTransition(admission.change, ({ stateBefore }) => ({
      stateAfter: 'build-verified',
      consequence: 'All packages compiled with 0 errors',
    }));
    expect(execution.status).toBe('EXECUTED');

    // C6: Observe + Reconcile
    // The observation state must exactly match the executed stateAfter for VERIFIED
    const executedState = execution.record.stateAfter!;
    const observation = createRealityObservation('obs1', executedState, executedState);
    const reconciliation = reconcileReality(
      { ...execution.record },
      observation,
    );
    expect(reconciliation.verdict).toBe('VERIFIED');

    // C7: Attest to Memory
    const memory = new OmegaAttestationMemory();
    const entry = memory.append(change, execution, reconciliation);
    expect(entry.transitionStatus).toBe('EXECUTED');
    expect(entry.realityVerdict).toBe('VERIFIED');
    expect(memory.verifyIntegrity()).toBe(true);

    const snapshot = memory.snapshot();
    expect(snapshot.height).toBe(1);
    expect(snapshot.integrityValid).toBe(true);
  });
});

// ─── C8: Omega Learning Engine ──────────────────────────────────────

describe('C8 — synthesizeOmegaLearning', () => {
  it('handles empty attestation history with default baseline', () => {
    const feedback = synthesizeOmegaLearning([]);
    expect(feedback.totalEvaluated).toBe(0);
    expect(feedback.reliabilityScore).toBe(1.0);
    expect(feedback.recurrentDiscrepancies).toHaveLength(0);
    expect(feedback.recommendations[0]).toContain('No historical attestations');
  });

  it('computes empirical reliability score and recurrent discrepancies', () => {
    const memory = new OmegaAttestationMemory();
    const change = makeChange({ decision: 'ALLOW', authorized: true });

    // Entry 1: Executed and verified
    const ex1 = executeAuthorizedTransition(change, () => ({ stateAfter: 'state1' }));
    const obs1 = createRealityObservation('obs1', 'state1', 'state1');
    const rec1 = reconcileReality(ex1.record, obs1);
    memory.append(change, ex1, rec1);

    // Entry 2: Executed but divergent
    const ex2 = executeAuthorizedTransition(change, () => ({ stateAfter: 'state2' }));
    const obs2 = createRealityObservation('obs1', 'state2-diff', 'state2-diff');
    const rec2 = reconcileReality(ex2.record, obs2);
    memory.append(change, ex2, rec2);

    const feedback = synthesizeOmegaLearning(memory.snapshot().entries);
    expect(feedback.totalEvaluated).toBe(2);
    expect(feedback.completedCount).toBe(2);
    expect(feedback.verifiedCount).toBe(1);
    expect(feedback.divergentCount).toBe(1);
    expect(feedback.reliabilityScore).toBeGreaterThan(0.5);
    expect(feedback.reliabilityScore).toBeLessThan(1.0);
    expect(feedback.recurrentDiscrepancies.length).toBeGreaterThan(0);
    expect(feedback.recommendations.some((r) => r.includes('Reality divergence'))).toBe(true);
  });
});

// ─── C9: Omega Loop Recompiler & Next Slice ─────────────────────────

describe('C9 — proposeNextOmegaSlice & compileNextLoopIntent', () => {
  it('proposes remediation slice on reality divergence', () => {
    const feedback = synthesizeOmegaLearning([]);
    const proposal = proposeNextOmegaSlice({
      latestEntry: {
        index: 0,
        changeId: 'c1',
        transitionStatus: 'completed',
        attestationId: 'att-1',
        realityVerdict: 'DIVERGENT',
        claimedStateHash: 'hash-a',
        observedStateHash: 'hash-b',
        discrepancies: ['State hash mismatch: expected hash-a, observed hash-b'],
        previousHash: '000',
        hash: '111',
        timestamp: new Date().toISOString(),
      },
      feedback,
    });

    expect(proposal.trigger).toBe('REALITY_DIVERGENT');
    expect(proposal.actionType).toBe('REMEDIATE');
    expect(proposal.urgency).toBe('elevated');
    expect(proposal.proposedIntent).toContain('Remediate');
  });

  it('proposes policy escalation on refused transition', () => {
    const feedback = synthesizeOmegaLearning([]);
    const proposal = proposeNextOmegaSlice({
      latestEntry: {
        index: 0,
        changeId: 'c2',
        transitionStatus: 'refused',
        attestationId: undefined,
        realityVerdict: undefined,
        claimedStateHash: '',
        observedStateHash: '',
        discrepancies: [],
        previousHash: '000',
        hash: '222',
        timestamp: new Date().toISOString(),
      },
      feedback,
    });

    expect(proposal.trigger).toBe('TRANSITION_REFUSED');
    expect(proposal.actionType).toBe('POLICY_ESCALATION');
    expect(proposal.urgency).toBe('critical');
    expect(proposal.suggestedWorkers).toContain('governance-reviewer');
  });

  it('proposes advancement slice on verified reality', () => {
    const feedback = synthesizeOmegaLearning([]);
    const proposal = proposeNextOmegaSlice({
      latestEntry: {
        index: 0,
        changeId: 'c3',
        transitionStatus: 'completed',
        attestationId: 'att-3',
        realityVerdict: 'VERIFIED',
        claimedStateHash: 'hash-c',
        observedStateHash: 'hash-c',
        discrepancies: [],
        previousHash: '000',
        hash: '333',
        timestamp: new Date().toISOString(),
      },
      feedback,
    });

    expect(proposal.trigger).toBe('REALITY_VERIFIED');
    expect(proposal.actionType).toBe('ADVANCE');
    expect(proposal.urgency).toBe('routine');
    expect(proposal.proposedIntent).toContain('Advance next');
  });

  it('compiles next loop intent directly back into C1 compiler (Loop closure: C9 -> C1)', () => {
    const feedback = synthesizeOmegaLearning([]);
    const proposal = proposeNextOmegaSlice({
      latestEntry: {
        index: 0,
        changeId: 'c4',
        transitionStatus: 'completed',
        attestationId: 'att-4',
        realityVerdict: 'VERIFIED',
        claimedStateHash: 'hash-d',
        observedStateHash: 'hash-d',
        discrepancies: [],
        previousHash: '000',
        hash: '444',
        timestamp: new Date().toISOString(),
      },
      feedback,
    });

    const compileInput = compileNextLoopIntent(proposal);
    const nextIR = compileOmegaIntent(compileInput);
    const validation = validateOmegaIR(nextIR);

    expect(validation.valid).toBe(true);
    expect(nextIR.intent).toBe(proposal.proposedIntent);
    expect(nextIR.observationSpec.targets).toContain(proposal.suggestedObservationTarget);
  });
});
