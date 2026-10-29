import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { describe, it } from 'node:test';

const sha256 = (text: string) => `sha256:${createHash('sha256').update(text, 'utf8').digest('hex')}`;

/**
 * The Ω∞v law as one finite function:
 *
 *   Y = λf.λx.  f(Σ ∪ Hash(x)) if O(E(x)) ≡ VERIFIED
 *               HALT ⊢ DIVERGENT | UNKNOWN | NOT_EXECUTED otherwise
 *   M(t+1) = M(t) ∪ Δ only when V(Δ) = ⊤, V ≡ (Expected ≡ Observed)
 *
 * Each branch below is a separate claim: the loop continues only on VERIFIED,
 * every halt preserves memory exactly, and a halt stops the loop.
 */
describe('Ω∞v reality fixed point — the loop as one law', () => {
  it('continues only on VERIFIED and absorbs Hash(x) into Σ', async () => {
    const { runRealityFixedPoint } = await import('../../packages/mini/dist/index.js');
    const run = runRealityFixedPoint([
      { id: 'read-ledger', scam: false, evidence: ['ledger height 4'], authority: { held: 1, required: 1 }, expected: 'height 4', observed: 'height 4' },
      { id: 'read-workers', scam: false, evidence: ['3 workers'], authority: { held: 2, required: 1 }, expected: '3 workers', observed: '3 workers' },
    ]);

    assert.equal(run.halted, null);
    assert.equal(run.unreached, 0);
    assert.equal(run.memory.drops.length, 2);
    assert.deepEqual(run.steps.map((step: any) => step.verdict), ['VERIFIED', 'VERIFIED']);
    assert.ok(run.steps.every((step: any) => step.admitted));
    assert.match(run.memory.drops[0], /^sha256:[0-9a-f]{64}$/);
    assert.match(run.law, /M\(t\+1\) = M\(t\) ∪ Δ \| V\(Δ\) = ⊤/);
  });

  it('halts DIVERGENT on K(x) ∈ SCAM and leaves Σ untouched', async () => {
    const { runRealityFixedPoint, EMPTY_REALITY_MEMORY } = await import('../../packages/mini/dist/index.js');
    const run = runRealityFixedPoint(
      [
        { id: 'scam', scam: true, evidence: ['promise'], authority: { held: 3, required: 1 }, expected: null, observed: null },
        { id: 'never-reached', scam: false, evidence: ['state'], authority: { held: 1, required: 1 }, expected: null, observed: 'state' },
      ],
      EMPTY_REALITY_MEMORY,
    );

    assert.equal(run.halted.verdict, 'DIVERGENT');
    assert.equal(run.halted.reason, 'SCAM');
    assert.equal(run.halted.admitted, false);
    assert.equal(run.unreached, 1, 'a halt stops the loop; later drops are not executed');
    assert.equal(run.memory, EMPTY_REALITY_MEMORY, 'M(t+1) = M(t) when V(Δ) ≠ ⊤');
    assert.deepEqual(run.memory.drops, []);
  });

  it('halts UNKNOWN when Evidence(x) = ∅', async () => {
    const { judgeDrop } = await import('../../packages/mini/dist/index.js');
    const judged = judgeDrop({
      id: 'no-evidence',
      scam: false,
      evidence: ['   '],
      authority: { held: 1, required: 1 },
      expected: 'anything',
      observed: 'anything',
    });

    assert.equal(judged.verdict, 'UNKNOWN');
    assert.equal(judged.reason, 'EVIDENCE_EMPTY');
  });

  it('halts NOT_EXECUTED when Authority(x) < Required', async () => {
    const { judgeDrop } = await import('../../packages/mini/dist/index.js');
    const judged = judgeDrop({
      id: 'unauthorized',
      scam: false,
      evidence: ['state'],
      authority: { held: 0, required: 1 },
      expected: null,
      observed: 'state',
    });

    assert.equal(judged.verdict, 'NOT_EXECUTED');
    assert.equal(judged.reason, 'AUTHORITY_INSUFFICIENT');
  });

  it('halts DIVERGENT when Observed ≢ Expected, and never rewrites the observation', async () => {
    const { judgeDrop, runRealityFixedPoint } = await import('../../packages/mini/dist/index.js');
    const divergent = judgeDrop({
      id: 'mismatch',
      scam: false,
      evidence: ['LEDGER · height 2'],
      authority: { held: 1, required: 1 },
      expected: 'height 9',
      observed: 'LEDGER · height 2',
    });
    assert.equal(divergent.verdict, 'DIVERGENT');
    assert.equal(divergent.reason, 'OBSERVED_DIVERGES_FROM_EXPECTED');
    assert.equal(divergent.matched, false);

    const run = runRealityFixedPoint([
      { id: 'mismatch', scam: false, evidence: ['LEDGER · height 2'], authority: { held: 1, required: 1 }, expected: 'height 9', observed: 'LEDGER · height 2' },
    ]);
    assert.equal(run.steps[0].admitted, false);
    assert.equal(run.memory.drops.length, 0);
  });

  it('resolves simultaneous halts fail-closed: SCAM → AUTHORITY → EVIDENCE', async () => {
    const { judgeDrop } = await import('../../packages/mini/dist/index.js');
    const scamOutranksAll = judgeDrop({
      id: 'everything-wrong',
      scam: true,
      evidence: [],
      authority: { held: 0, required: 5 },
      expected: 'a',
      observed: 'b',
    });
    assert.equal(scamOutranksAll.verdict, 'DIVERGENT');

    const authorityOutranksEvidence = judgeDrop({
      id: 'no-authority-no-evidence',
      scam: false,
      evidence: [],
      authority: { held: 0, required: 5 },
      expected: 'a',
      observed: 'b',
    });
    assert.equal(authorityOutranksEvidence.verdict, 'NOT_EXECUTED');
  });

  it('is a fixed point: verifying nothing leaves memory identical', async () => {
    const { runRealityFixedPoint, EMPTY_REALITY_MEMORY, rememberVerified, hashDrop } = await import('../../packages/mini/dist/index.js');
    const memory = { drops: [sha256('seed')] };
    const unverified = { id: 'x', scam: false, evidence: [], authority: { held: 1, required: 1 }, expected: null, observed: null };

    assert.equal(rememberVerified(memory, unverified), memory);
    const run = runRealityFixedPoint([unverified], memory);
    assert.equal(run.memory, memory);
    assert.equal(run.memory.drops.length, 1);

    const verified = { id: 'y', scam: false, evidence: ['ok'], authority: { held: 1, required: 1 }, expected: 'ok', observed: 'ok' };
    assert.equal(rememberVerified(EMPTY_REALITY_MEMORY, verified).drops[0], hashDrop(verified));
    assert.equal(hashDrop(verified), hashDrop({ ...verified }));
  });
});
