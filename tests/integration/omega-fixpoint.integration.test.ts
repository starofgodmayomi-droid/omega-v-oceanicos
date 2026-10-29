import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { omegaFixpoint } from '@oceanicos/omega';

const sha256 = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex');

/*
 * Ω∞v ::= Y(λf. M_{t+1} = M_t ∪ { Hash(x) | V(x) = ⊤ }), V ≡ (Expected ≡ Observed)
 *
 * Memory may only grow with evidence that still recomputes. Every other drop
 * halts on its own verdict and leaves Σ untouched.
 */

test('a drop whose observation matches the expectation is admitted to memory', () => {
  const observed = 'the bounded answer that was actually produced';
  const result = omegaFixpoint([{ observed, expectedHash: sha256(observed) }]);

  assert.equal(result.verdict, 'VERIFIED');
  assert.equal(result.admitted, 1);
  assert.deepEqual(result.memory, [sha256(observed)]);
  assert.deepEqual(result.halted, []);
  assert.equal(result.steps, 1);
  assert.equal(result.fixed, true);
});

test('the fold is monotone and idempotent: a repeated hash adds nothing', () => {
  const observed = 'one observation offered twice';
  const drop = { observed, expectedHash: sha256(observed) };
  const once = omegaFixpoint([drop]);
  const twice = omegaFixpoint([drop, drop]);

  assert.deepEqual(twice.memory, once.memory);
  assert.equal(twice.admitted, 1);
  assert.equal(twice.verdict, 'VERIFIED');
  // Re-folding the settled memory cannot grow it: M is the fixed point.
  const refolded = omegaFixpoint([drop], twice.memory);
  assert.equal(refolded.admitted, 0);
  assert.equal(refolded.fixed, true);
  assert.deepEqual(refolded.memory, twice.memory);
});

test('a scam intent halts DIVERGENT before its digest is ever considered', () => {
  const observed = 'well-formed evidence for a fraudulent intent';
  const result = omegaFixpoint([
    { observed, expectedHash: sha256(observed), scam: true },
  ]);

  assert.equal(result.verdict, 'DIVERGENT');
  assert.equal(result.admitted, 0);
  assert.deepEqual(result.memory, []);
  assert.equal(result.halted[0]?.verdict, 'DIVERGENT');
  assert.match(String(result.halted[0]?.reason), /KAI_SHIELD_SCAM/);
});

test('missing evidence halts UNKNOWN and is never admitted', () => {
  for (const observed of ['', '   ', null, undefined]) {
    const result = omegaFixpoint([{ observed, expectedHash: sha256('anything') }]);
    assert.equal(result.verdict, 'UNKNOWN');
    assert.equal(result.admitted, 0);
    assert.deepEqual(result.memory, []);
    assert.match(String(result.halted[0]?.reason), /EVIDENCE_EMPTY/);
  }
});

test('authority below the requirement halts NOT_EXECUTED', () => {
  const observed = 'an answer the caller was not authorized to act on';
  const result = omegaFixpoint([
    {
      observed,
      expectedHash: sha256(observed),
      authority: 'READ_ONLY',
      requiredAuthority: 'AUTONOMOUS',
    },
  ]);

  assert.equal(result.verdict, 'NOT_EXECUTED');
  assert.equal(result.admitted, 0);
  assert.deepEqual(result.memory, []);
  assert.match(String(result.halted[0]?.reason), /AUTHORITY_BELOW_REQUIRED/);
});

test('evidence that no longer recomputes halts DIVERGENT with the recomputed hash', () => {
  const result = omegaFixpoint([
    { observed: 'the output on disk now', expectedHash: sha256('the output that was declared') },
  ]);

  assert.equal(result.verdict, 'DIVERGENT');
  assert.equal(result.admitted, 0);
  assert.deepEqual(result.memory, []);
  assert.equal(result.halted[0]?.hash, sha256('the output on disk now'));
  assert.match(String(result.halted[0]?.reason), /EXPECTED_NOT_OBSERVED/);
});

test('one fold reports every halt, admits only what matches, and settles', () => {
  const good = 'evidence that matches its declared digest';
  const result = omegaFixpoint([
    { observed: good, expectedHash: sha256(good) },
    { observed: 'a fraudulent request', expectedHash: sha256('a fraudulent request'), scam: true },
    { observed: null, expectedHash: sha256('never produced') },
    { observed: 'tampered text', expectedHash: sha256('the declared text') },
  ]);

  assert.equal(result.verdict, 'DIVERGENT');
  assert.equal(result.steps, 4);
  assert.equal(result.admitted, 1);
  assert.deepEqual(result.memory, [sha256(good)]);
  assert.deepEqual(
    result.halted.map((halt) => halt.verdict),
    ['DIVERGENT', 'UNKNOWN', 'DIVERGENT']
  );
  assert.deepEqual(
    result.halted.map((halt) => halt.index),
    [1, 2, 3]
  );
  assert.equal(result.fixed, true);

  // Folding the same drops against the settled memory adds nothing.
  const settled = omegaFixpoint(
    [
      { observed: good, expectedHash: sha256(good) },
      { observed: 'a fraudulent request', expectedHash: sha256('a fraudulent request'), scam: true },
    ],
    result.memory
  );
  assert.equal(settled.admitted, 0);
  assert.deepEqual(settled.memory, result.memory);
});

test('an empty fold is NOT_EXECUTED, not a pass', () => {
  const result = omegaFixpoint([]);
  assert.equal(result.verdict, 'NOT_EXECUTED');
  assert.equal(result.admitted, 0);
  assert.deepEqual(result.memory, []);
  assert.equal(result.fixed, true);
});
