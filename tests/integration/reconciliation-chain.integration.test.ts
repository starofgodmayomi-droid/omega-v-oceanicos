import type { OmegaChangeRecord } from '@oceanicos/types';
import {
  OmegaReconciliationBoundary,
  createRealityObservation,
  OmegaAttestationMemory,
  executeAuthorizedTransition,
} from '@oceanicos/mini';

function makeChangeRecord(overrides: Partial<OmegaChangeRecord> = {}): OmegaChangeRecord {
  return {
    id: `change-${Math.random().toString(36).substring(2, 9)}`,
    subject: 'service:oceanicos-compute',
    intent: 'Apply operational state transition',
    stateBefore: 'STATE_A',
    evidence: ['ev:metric-nominal', 'ev:gate-passed'],
    authority: 'steward:godmayomi',
    policy: 'pol:zero-divergence',
    decision: 'ALLOW',
    authorized: true,
    transition: 'STATE_A -> STATE_B',
    stateAfter: 'STATE_B',
    consequence: 'System reached nominal steady state',
    provenance: {
      source: 'planner:intent-compiler',
      observedAt: new Date().toISOString(),
      attributedTo: 'steward:godmayomi',
      lineage: ['origin:intent-001'],
    },
    ...overrides,
  };
}

describe('Canonical Reconciliation Boundary Integration Suite', () => {
  let boundary: OmegaReconciliationBoundary;
  let memory: OmegaAttestationMemory;

  beforeEach(() => {
    memory = new OmegaAttestationMemory();
    boundary = new OmegaReconciliationBoundary(memory, 'kernel:steward-reconciler');
  });

  describe('Terminal State 1: VERIFIED', () => {
    it('proves VERIFIED terminal state across attestation, provenance, memory, and replay', () => {
      const change = makeChangeRecord({
        stateBefore: 'v1.0.0-unverified',
        stateAfter: 'v1.0.0-verified',
        transition: 'v1.0.0-unverified -> v1.0.0-verified',
      });

      const observation = createRealityObservation(
        'obs:probe-alpha',
        'v1.0.0-verified',
        'v1.0.0-verified',
        { probeRegion: 'eu-central' }
      );

      // Reconcile and bind
      const result = boundary.reconcileAndBind({
        change,
        observation,
        actor: 'steward:verifier',
      });

      // 1. Reconciliation contract check
      expect(result.reconciliation.verdict).toBe('VERIFIED');
      expect(result.reconciliation.discrepancies).toHaveLength(0);
      expect(result.reconciliation.claimedStateHash).toBe(observation.stateHash);
      expect(result.reconciliation.observedStateHash).toBe(observation.stateHash);

      // 2. Cryptographic Attestation check
      expect(result.attestation.attestationId).toMatch(/^attest-reconcile-[a-f0-9]{16}$/);
      expect(result.attestation.verdict).toBe('VERIFIED');
      expect(result.attestation.digest).toBeTruthy();
      expect(result.attestation.attestedBy).toBe('steward:verifier');

      // 3. Provenance Lineage check
      expect(result.change.attestationId).toBe(result.attestation.attestationId);
      expect(result.change.provenance.lineage).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/^reconcile:verified:[a-f0-9]{12}$/),
        ])
      );
      expect(result.change.provenance.source).toBe('canonical-reconciliation-boundary');

      // 4. Memory Chain check
      expect(result.entry.index).toBe(0);
      expect(result.entry.realityVerdict).toBe('VERIFIED');
      expect(result.entry.transitionStatus).toBe('EXECUTED');
      expect(result.entry.previousHash).toBe('0000000000000000000000000000000000000000000000000000000000000000');
      expect(result.memorySnapshot.height).toBe(1);
      expect(result.memorySnapshot.integrityValid).toBe(true);

      // 5. Replay verification
      const replayOutcome = boundary.replay(result.change, observation, result.entry);
      expect(replayOutcome.valid).toBe(true);
      expect(replayOutcome.verdictMatches).toBe(true);
      expect(replayOutcome.replayedVerdict).toBe('VERIFIED');
      expect(replayOutcome.hashMatches).toBe(true);
      expect(replayOutcome.chainIntegrityValid).toBe(true);
      expect(replayOutcome.discrepancies).toHaveLength(0);
    });
  });

  describe('Terminal State 2: DIVERGENT', () => {
    it('proves DIVERGENT terminal state preserves discrepancy evidence without rewriting history', () => {
      const change = makeChangeRecord({
        stateBefore: 'config:baseline',
        stateAfter: 'config:target-state',
        transition: 'config:baseline -> config:target-state',
      });

      // Divergent physical observation
      const observation = createRealityObservation(
        'obs:probe-beta',
        'config:target-state',
        'config:unexpected-corrupt-state',
        { probeRegion: 'us-east' }
      );

      const result = boundary.reconcileAndBind({
        change,
        observation,
        actor: 'steward:divergence-detector',
      });

      // 1. Reconciliation contract check
      expect(result.reconciliation.verdict).toBe('DIVERGENT');
      expect(result.reconciliation.discrepancies.length).toBeGreaterThan(0);
      expect(result.reconciliation.discrepancies[0]).toContain('State hash mismatch');

      // 2. Cryptographic Attestation binds discrepancy
      expect(result.attestation.verdict).toBe('DIVERGENT');
      expect(result.attestation.discrepancies).toEqual(result.reconciliation.discrepancies);

      // 3. Provenance Lineage records divergence event
      expect(result.change.provenance.lineage).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/^reconcile:divergent:[a-f0-9]{12}$/),
        ])
      );

      // 4. Memory Chain integrity preserved
      expect(result.entry.realityVerdict).toBe('DIVERGENT');
      expect(result.entry.discrepancies).toEqual(result.reconciliation.discrepancies);
      expect(result.memorySnapshot.integrityValid).toBe(true);

      // 5. Replay produces identical divergence
      const replayOutcome = boundary.replay(result.change, observation, result.entry);
      expect(replayOutcome.valid).toBe(true);
      expect(replayOutcome.replayedVerdict).toBe('DIVERGENT');
      expect(replayOutcome.verdictMatches).toBe(true);
      expect(replayOutcome.hashMatches).toBe(true);
    });

    it('proves DIVERGENT on target mismatch between transition and observation', () => {
      const change = makeChangeRecord({
        stateBefore: 'unscaled',
        stateAfter: 'scaled-target-1',
        transition: 'unscaled -> cluster-primary',
      });

      const observation = createRealityObservation(
        'obs:probe-gamma',
        'cluster-secondary', // Target mismatch!
        'scaled-target-1'
      );

      const result = boundary.reconcileAndBind({ change, observation });
      expect(result.reconciliation.verdict).toBe('DIVERGENT');
      expect(result.reconciliation.discrepancies.some((d) => d.includes('Target mismatch'))).toBe(true);
      expect(result.entry.realityVerdict).toBe('DIVERGENT');
    });
  });

  describe('Terminal State 3: UNKNOWN', () => {
    it('proves UNKNOWN terminal state when external observation is absent', () => {
      const change = makeChangeRecord({
        stateBefore: 'node:active',
        stateAfter: 'node:quarantined',
        transition: 'node:active -> node:quarantined',
      });

      // No observation supplied
      const result = boundary.reconcileAndBind({
        change,
        observation: undefined,
      });

      // 1. Contract check: UNKNOWN
      expect(result.reconciliation.verdict).toBe('UNKNOWN');
      expect(result.reconciliation.discrepancies).toContain(
        'No external reality observation supplied.'
      );
      expect(result.reconciliation.observedStateHash).toBe('');

      // 2. Attestation & Provenance check
      expect(result.attestation.verdict).toBe('UNKNOWN');
      expect(result.change.provenance.lineage).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/^reconcile:unknown:[a-f0-9]{12}$/),
        ])
      );

      // 3. Memory & Replay check
      expect(result.entry.realityVerdict).toBe('UNKNOWN');
      expect(result.memorySnapshot.integrityValid).toBe(true);

      const replayOutcome = boundary.replay(result.change, undefined, result.entry);
      expect(replayOutcome.valid).toBe(true);
      expect(replayOutcome.replayedVerdict).toBe('UNKNOWN');
      expect(replayOutcome.verdictMatches).toBe(true);
    });
  });

  describe('Terminal State 4: NOT_EXECUTED', () => {
    it('proves NOT_EXECUTED terminal state when change record lacks stateAfter', () => {
      const change = makeChangeRecord({
        decision: 'DENY',
        authorized: false,
        stateBefore: 'initial-state',
        stateAfter: undefined, // Never executed
        transition: undefined,
      });

      const observation = createRealityObservation('obs:test', 'target', 'some-observed');

      const result = boundary.reconcileAndBind({
        change,
        observation,
      });

      // 1. Contract check: NOT_EXECUTED
      expect(result.reconciliation.verdict).toBe('NOT_EXECUTED');
      expect(result.reconciliation.discrepancies).toContain(
        'Change has no recorded stateAfter — execution not proven.'
      );

      // 2. Attestation check
      expect(result.attestation.verdict).toBe('NOT_EXECUTED');
      expect(result.entry.transitionStatus).toBe('REFUSED');
      expect(result.entry.realityVerdict).toBe('NOT_EXECUTED');

      // 3. Provenance check
      expect(result.change.provenance.lineage).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/^reconcile:not_executed:[a-f0-9]{12}$/),
        ])
      );

      // 4. Memory & Replay check
      expect(result.memorySnapshot.integrityValid).toBe(true);

      const replayOutcome = boundary.replay(result.change, observation, result.entry);
      expect(replayOutcome.valid).toBe(true);
      expect(replayOutcome.replayedVerdict).toBe('NOT_EXECUTED');
      expect(replayOutcome.verdictMatches).toBe(true);
    });
  });

  describe('Replay Anti-Tampering & Regression Guard', () => {
    it('detects state tampering on replay if recorded state was altered', () => {
      const change = makeChangeRecord({
        stateBefore: 'initial',
        stateAfter: 'authentic-state',
        transition: 'initial -> authentic-state',
      });
      const obs = createRealityObservation('obs:legit', 'authentic-state', 'authentic-state');

      const result = boundary.reconcileAndBind({ change, observation: obs });
      expect(result.reconciliation.verdict).toBe('VERIFIED');

      // Attacker attempts to modify the change record retroactively
      const tamperedChange: OmegaChangeRecord = {
        ...result.change,
        stateAfter: 'forged-state',
      };

      const replayOutcome = boundary.replay(tamperedChange, obs, result.entry);
      expect(replayOutcome.valid).toBe(false);
      expect(replayOutcome.verdictMatches).toBe(false);
      expect(replayOutcome.hashMatches).toBe(false);
      expect(replayOutcome.discrepancies.some((d) => d.includes('Verdict mismatch'))).toBe(true);
    });

    it('replays multi-step chain across all 4 terminal states maintaining cryptographic integrity', () => {
      // 1. NOT_EXECUTED
      const c1 = makeChangeRecord({ id: 'c1', stateAfter: undefined, decision: 'DENY', authorized: false });
      boundary.reconcileAndBind({ change: c1 });

      // 2. UNKNOWN
      const c2 = makeChangeRecord({ id: 'c2', stateAfter: 'state-2' });
      boundary.reconcileAndBind({ change: c2, observation: undefined });

      // 3. DIVERGENT
      const c3 = makeChangeRecord({ id: 'c3', stateAfter: 'state-3-expected', transition: 'init -> target-3' });
      const obs3 = createRealityObservation('obs3', 'target-3', 'state-3-different');
      boundary.reconcileAndBind({ change: c3, observation: obs3 });

      // 4. VERIFIED
      const c4 = makeChangeRecord({ id: 'c4', stateAfter: 'state-4-good', transition: 'init -> target-4' });
      const obs4 = createRealityObservation('obs4', 'target-4', 'state-4-good');
      boundary.reconcileAndBind({ change: c4, observation: obs4 });

      // Verify chain
      const chainSummary = boundary.replayChain();
      expect(chainSummary.height).toBe(4);
      expect(chainSummary.integrityValid).toBe(true);
      expect(chainSummary.entries[0].realityVerdict).toBe('NOT_EXECUTED');
      expect(chainSummary.entries[1].realityVerdict).toBe('UNKNOWN');
      expect(chainSummary.entries[2].realityVerdict).toBe('DIVERGENT');
      expect(chainSummary.entries[3].realityVerdict).toBe('VERIFIED');

      // Verify cryptographic link from index 0 -> 1 -> 2 -> 3
      expect(chainSummary.entries[1].previousHash).toBe(chainSummary.entries[0].hash);
      expect(chainSummary.entries[2].previousHash).toBe(chainSummary.entries[1].hash);
      expect(chainSummary.entries[3].previousHash).toBe(chainSummary.entries[2].hash);
    });
  });
});
