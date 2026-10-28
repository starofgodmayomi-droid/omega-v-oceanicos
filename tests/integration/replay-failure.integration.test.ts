import assert from 'node:assert/strict';
import test from 'node:test';
import { VerificationReplayEngine } from '../../packages/replay/src/index.ts';

type CaptureResult = Parameters<VerificationReplayEngine['capture']>[1];

const stubResult = (passed = true): CaptureResult =>
  ({
    observation: { confidence: 0.9 },
    verification: { summary: { passed, rulesApplied: 1, rulesPassed: passed ? 1 : 0 } },
    attestation: { signature: 'stub-signature', verified: passed },
  }) as unknown as CaptureResult;

test('a failed replay leaves the snapshot CAPTURED and records no phantom snapshot', async () => {
  const engine = new VerificationReplayEngine();
  const original = engine.capture('failed replay claim', stubResult(), 'Original');
  const unavailable = {
    runLoop: async () => {
      throw new Error('replay source unavailable');
    },
  } as unknown as Parameters<VerificationReplayEngine['replay']>[1];

  await assert.rejects(() => engine.replay(original.id, unavailable), /replay source unavailable/);

  // ATTEMPTED ≠ EXECUTED: the captured evidence is unchanged by a failed
  // attempt, and the snapshot must not be left stuck mid-replay.
  assert.equal(engine.getSnapshot(original.id)?.status, 'CAPTURED');
  assert.equal(engine.getSnapshots().length, 1);
});

test('a successful replay still records a REPLAYED snapshot with a diff', async () => {
  const engine = new VerificationReplayEngine();
  const original = engine.capture('successful replay claim', stubResult(), 'Original');
  const client = {
    runLoop: async () => stubResult(),
  } as unknown as Parameters<VerificationReplayEngine['replay']>[1];

  const result = await engine.replay(original.id, client);

  assert.equal(result.original.status, 'CAPTURED');
  assert.equal(result.replayed.status, 'REPLAYED');
  assert.equal(result.diff.regressionDetected, false);
  assert.equal(engine.getSnapshots().length, 2);
});
