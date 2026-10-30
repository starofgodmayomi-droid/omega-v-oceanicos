import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const { evaluateEcosystemFixpoint } = require('../../packages/mini/dist/index.js');

const matched = {
  expected: 'digest-a',
  observed: 'digest-a',
  evidence: ['SUPPORTED'],
  authority: 1,
  requiredAuthority: 1,
  classifiedScam: false,
  mayRemember: true,
};

test('empty evidence halts UNKNOWN and writes nothing', () => {
  const result = evaluateEcosystemFixpoint({ ...matched, evidence: [] });
  assert.equal(result.status, 'UNKNOWN');
  assert.equal(result.roundTrip, 'UNKNOWN');
  assert.equal(result.admission, 'HALT');
  assert.equal(result.written, false);
  assert.equal(result.digest, null);
});

test('a classified scam halts DIVERGENT even when the fields match', () => {
  const result = evaluateEcosystemFixpoint({ ...matched, classifiedScam: true });
  assert.equal(result.status, 'DIVERGENT');
  assert.equal(result.admission, 'HALT');
  assert.equal(result.written, false);
});

test('a field mismatch halts DIVERGENT', () => {
  const result = evaluateEcosystemFixpoint({ ...matched, observed: 'digest-b' });
  assert.equal(result.roundTrip, 'DIVERGENT');
  assert.equal(result.status, 'DIVERGENT');
  assert.equal(result.digest, null);
});

test('a matching round trip stays unwritten when memory is not authorized', () => {
  const result = evaluateEcosystemFixpoint({ ...matched, mayRemember: false, authority: 0, requiredAuthority: 1 });
  assert.equal(result.roundTrip, 'VERIFIED');
  assert.equal(result.admission, 'HALT');
  assert.equal(result.status, 'NOT_EXECUTED');
  assert.equal(result.written, false);
  assert.equal(result.digest, createHash('sha256').update('digest-a').digest('hex'));
});

test('a matching authorized delta is admitted and still not written by the function', () => {
  const result = evaluateEcosystemFixpoint(matched);
  assert.equal(result.admission, 'ADMIT');
  assert.equal(result.status, 'VERIFIED');
  assert.equal(result.written, false);
  assert.match(result.digest, /^[a-f0-9]{64}$/);
});
