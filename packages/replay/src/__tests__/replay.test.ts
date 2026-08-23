import { VerificationReplayEngine } from '@omega-v/replay';
import { OceanicosClient, FullLoopResult } from '@omega-v/sdk';

describe('@omega-v/replay — VerificationReplayEngine', () => {
  let engine: VerificationReplayEngine;
  let sdk: OceanicosClient;

  beforeEach(() => {
    engine = new VerificationReplayEngine();
    sdk = new OceanicosClient({ mode: 'local' });
  });

  describe('Capture', () => {
    it('should capture a loop result as a fingerprinted snapshot', async () => {
      const result = await sdk.runLoop({
        claim: 'Replay capture test',
        category: 'replay-test',
        observedBy: 'test-harness',
        sourceSystem: 'jest',
      });

      const snapshot = engine.capture('Replay capture test', result, 'Test Run 1', ['test']);

      expect(snapshot.id).toMatch(/^replay-/);
      expect(snapshot.label).toBe('Test Run 1');
      expect(snapshot.claim).toBe('Replay capture test');
      expect(snapshot.fingerprint).toHaveLength(64); // SHA-256 hex
      expect(snapshot.status).toBe('CAPTURED');
      expect(snapshot.tags).toContain('test');
      expect(snapshot.result.verification.summary.passed).toBe(true);
    });

    it('should auto-label snapshots when no label is provided', async () => {
      const result = await sdk.runLoop({
        claim: 'Auto-label test',
        category: 'replay-test',
        observedBy: 'test-harness',
        sourceSystem: 'jest',
      });

      const snap = engine.capture('Auto-label test', result);
      expect(snap.label).toBe('Snapshot 1');

      const snap2 = engine.capture('Auto-label test 2', result);
      expect(snap2.label).toBe('Snapshot 2');
    });
  });

  describe('Diff', () => {
    it('should report identical fingerprints for the same result', async () => {
      const result = await sdk.runLoop({
        claim: 'Identical diff test',
        category: 'replay-test',
        observedBy: 'test-harness',
        sourceSystem: 'jest',
      });

      const snapA = engine.capture('Identical diff test', result, 'A');
      const snapB = engine.capture('Identical diff test', result, 'B');

      const diff = engine.diff(snapA.id, snapB.id);

      expect(diff.identical).toBe(true);
      expect(diff.regressionDetected).toBe(false);
      expect(diff.snapshotA).toBe(snapA.id);
      expect(diff.snapshotB).toBe(snapB.id);
      expect(diff.computedAt).toBeDefined();
    });

    it('should detect differences between two different runs', async () => {
      const resultA = await sdk.runLoop({
        claim: 'Diff test A',
        category: 'replay-test',
        observedBy: 'test-harness',
        sourceSystem: 'jest',
      });

      const resultB = await sdk.runLoop({
        claim: 'Diff test B',
        category: 'replay-test',
        observedBy: 'test-harness',
        sourceSystem: 'jest',
      });

      const snapA = engine.capture('Diff test A', resultA, 'Run A');
      const snapB = engine.capture('Diff test B', resultB, 'Run B');

      const diff = engine.diff(snapA.id, snapB.id);

      // Both should pass, so no regression, but signatures will differ
      expect(diff.regressionDetected).toBe(false);
      expect(diff.changes.length).toBeGreaterThanOrEqual(1);
      // Attestation signature always differs
      const sigChange = diff.changes.find((c) => c.path === 'attestation.signature');
      expect(sigChange).toBeDefined();
      expect(sigChange?.severity).toBe('INFO');
    });

    it('should throw when diffing nonexistent snapshots', () => {
      expect(() => engine.diff('no-such-a', 'no-such-b')).toThrow(
        'Cannot diff: snapshot(s) not found'
      );
    });
  });

  describe('Replay', () => {
    it('should replay a snapshot and produce a diff against the original', async () => {
      const result = await sdk.runLoop({
        claim: 'Replay round-trip test',
        category: 'replay-test',
        observedBy: 'test-harness',
        sourceSystem: 'jest',
      });

      const original = engine.capture('Replay round-trip test', result, 'Original');

      const replayResult = await engine.replay(original.id, sdk);

      expect(replayResult.original.id).toBe(original.id);
      expect(replayResult.replayed.status).toBe('REPLAYED');
      expect(replayResult.replayed.tags).toContain('replay');
      expect(replayResult.diff).toBeDefined();
      expect(replayResult.durationMs).toBeGreaterThanOrEqual(0);
      expect(replayResult.diff.regressionDetected).toBe(false);
    });

    it('should throw when replaying a nonexistent snapshot', async () => {
      await expect(engine.replay('no-such-id', sdk)).rejects.toThrow(
        'Replay snapshot not found'
      );
    });
  });

  describe('Query', () => {
    it('should list all snapshots', async () => {
      const result = await sdk.runLoop({
        claim: 'Query test',
        category: 'replay-test',
        observedBy: 'test-harness',
        sourceSystem: 'jest',
      });

      engine.capture('Query 1', result, 'S1', ['alpha']);
      engine.capture('Query 2', result, 'S2', ['beta']);
      engine.capture('Query 3', result, 'S3', ['alpha', 'beta']);

      expect(engine.getSnapshots()).toHaveLength(3);
    });

    it('should filter snapshots by tag', async () => {
      const result = await sdk.runLoop({
        claim: 'Tag filter test',
        category: 'replay-test',
        observedBy: 'test-harness',
        sourceSystem: 'jest',
      });

      engine.capture('Tag 1', result, 'S1', ['prod']);
      engine.capture('Tag 2', result, 'S2', ['staging']);
      engine.capture('Tag 3', result, 'S3', ['prod', 'staging']);

      expect(engine.getSnapshotsByTag('prod')).toHaveLength(2);
      expect(engine.getSnapshotsByTag('staging')).toHaveLength(2);
      expect(engine.getSnapshotsByTag('dev')).toHaveLength(0);
    });

    it('should return summary statistics', async () => {
      const result = await sdk.runLoop({
        claim: 'Summary test',
        category: 'replay-test',
        observedBy: 'test-harness',
        sourceSystem: 'jest',
      });

      engine.capture('Claim A', result, 'S1', ['x']);
      engine.capture('Claim B', result, 'S2', ['y']);
      engine.capture('Claim A', result, 'S3', ['x', 'y']);

      const summary = engine.getSummary();
      expect(summary.totalSnapshots).toBe(3);
      expect(summary.uniqueClaims).toBe(2); // 'Claim A' and 'Claim B'
      expect(summary.tags).toContain('x');
      expect(summary.tags).toContain('y');
    });

    it('should get a single snapshot by ID', async () => {
      const result = await sdk.runLoop({
        claim: 'Single get test',
        category: 'replay-test',
        observedBy: 'test-harness',
        sourceSystem: 'jest',
      });

      const snap = engine.capture('Single get test', result, 'Target');
      expect(engine.getSnapshot(snap.id)?.label).toBe('Target');
      expect(engine.getSnapshot('nonexistent')).toBeNull();
    });
  });
});
