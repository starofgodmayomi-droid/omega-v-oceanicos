/**
 * Reality////Ω∞v — the operator's guards and its memory law.
 *
 *   Reality////Ω∞v := Y(λf. (M_{t+1} = M_t ∪ Δ | V(Δ) = ⊤)),  V ≡ (Expected ≡ Observed)
 *   HALT ⊢ VERIFIED | DIVERGENT | UNKNOWN | NOT_EXECUTED
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { decideContinuumDrop, runContinuum } from '../../packages/mini/dist/index.js';
import type { ContinuumDrop } from '../../packages/mini/dist/index.js';

const authorized = { authority: 2, requiredAuthority: 2 };

describe('Reality////Ω∞v fixed point', () => {
  it('admits only a Δ whose observation equals its expectation, then continues', () => {
    const run = runContinuum([
      { delta: 'S1', expected: 'tip=1', observed: 'tip=1', evidence: ['ev:1'], ...authorized },
      { delta: 'S2', expected: 'tip=2', observed: 'tip=2', evidence: ['ev:2'], ...authorized },
    ]);

    assert.equal(run.status, 'VERIFIED');
    assert.equal(run.halted, false, 'the supplied drops ran out, so the loop returns to wait for the next drop');
    assert.deepEqual(run.memory, ['S1', 'S2']);
    assert.deepEqual(
      run.steps.map((step) => step.admitted),
      [true, true],
    );
  });

  it('halts DIVERGENT on K(x) ∈ SCAM and remembers nothing', () => {
    const drop: ContinuumDrop<string> = {
      delta: 'scam-delta',
      expected: 'paid',
      observed: 'paid',
      evidence: ['ev:scam'],
      scam: true,
      ...authorized,
    };
    const run = runContinuum([{ delta: 'clean', expected: 1, observed: 1, evidence: ['ev:0'], ...authorized }, drop, {
      delta: 'never-reached',
      expected: 2,
      observed: 2,
      evidence: ['ev:2'],
      ...authorized,
    }]);

    assert.equal(run.status, 'DIVERGENT');
    assert.equal(run.halted, true);
    assert.deepEqual(run.memory, ['clean'], 'only the verified Δ before the halt is remembered');
    assert.equal(run.steps.length, 2, 'the loop stops at the halted drop');
    assert.match(run.steps[1].evidence, /SCAM/);
  });

  it('halts UNKNOWN when Evidence(x) is empty', () => {
    const run = runContinuum([
      { delta: 'S1', expected: 'tip=1', observed: 'tip=1', evidence: [], ...authorized },
    ]);

    assert.equal(run.status, 'UNKNOWN');
    assert.deepEqual(run.memory, []);
    assert.equal(run.steps[0].admitted, false);
  });

  it('halts NOT_EXECUTED when Authority(x) < Required, and keeps both sides of the difference', () => {
    const run = runContinuum([
      {
        delta: 'S1',
        expected: 'tip=1',
        observed: 'tip=1',
        evidence: ['ev:1'],
        authority: 1,
        requiredAuthority: 2,
      },
    ]);

    assert.equal(run.status, 'NOT_EXECUTED');
    assert.deepEqual(run.memory, []);
    assert.equal(run.steps[0].expected, 'tip=1');
    assert.equal(run.steps[0].observed, 'tip=1');
  });

  it('halts DIVERGENT when Expected ≠ Observed and keeps the conflict in the receipt', () => {
    const run = runContinuum([
      { delta: 'S1', expected: 'tip=1', observed: 'tip=7', evidence: ['ev:1'], ...authorized },
    ]);

    assert.equal(run.status, 'DIVERGENT');
    assert.deepEqual(run.memory, [], 'an unverified Δ is never remembered');
    assert.equal(run.steps[0].expected, 'tip=1');
    assert.equal(run.steps[0].observed, 'tip=7');
    assert.match(run.steps[0].evidence, /Expected ≠ Observed/);
  });

  it('does not compare an observation that was never supplied', () => {
    const decision = decideContinuumDrop({
      delta: 'S1',
      expected: 'tip=1',
      evidence: ['ev:1'],
      ...authorized,
    });

    assert.equal(decision.verdict, 'UNKNOWN');
  });

  it('carries M across passes as a union, without re-admitting an existing Δ', () => {
    const run = runContinuum(
      [
        { delta: 'S1', expected: 'tip=1', observed: 'tip=1', evidence: ['ev:1'], ...authorized },
        { delta: 'S2', expected: 'tip=2', observed: 'tip=2', evidence: ['ev:2'], ...authorized },
      ],
      { memory: ['S1'] },
    );

    assert.deepEqual(run.memory, ['S1', 'S2']);
    assert.deepEqual(
      run.steps.map((step) => step.admitted),
      [false, true],
    );
  });
});
