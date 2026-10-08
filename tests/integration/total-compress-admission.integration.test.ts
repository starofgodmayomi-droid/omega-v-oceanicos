import assert from 'node:assert/strict';
import { test } from '@jest/globals';
import { MAX_TOTAL_COMPRESSION_LEASE_MS, validateTotalCompressionRequest } from '../../packages/mini/dist/index.js';

const valid = () => ({
  archiveId: 'archive-2026-10-07',
  evolutionScope: 'CONVERSATION_HISTORIC_COMPRESSION',
  activePackages: ['mini', 'remember'],
  totalContextTokensProcessed: 12500,
  rigidLeaseBoundMs: 30000,
});
const codes = (result: ReturnType<typeof validateTotalCompressionRequest>) =>
  result.validation === 'INVALID' ? result.issues.map((issue) => issue.code) : [];

test('accepts a bounded compression request without executing it', () => {
  const result = validateTotalCompressionRequest(valid());
  assert.equal(result.validation, 'VALID');
  assert.equal(result.execution, 'NOT_STARTED');
  assert.equal(result.evidence, 'INPUT_STRUCTURE_ONLY');
  if (result.validation !== 'VALID') throw new Error('expected valid');
  assert.equal(Object.isFrozen(result.request), true);
  assert.equal(Object.isFrozen(result.request.activePackages), true);
  assert.deepEqual(result.issues, []);
});

test('rejects online actuation and unsupported authority-shaped fields', () => {
  const result = validateTotalCompressionRequest({
    ...valid(),
    evolutionScope: 'EVERYTHING_ONLINE_ACTUATION',
    allocatedGenerationalCapitalWei: '1',
    masterAsymmetricSignature: 'x'.repeat(64),
  });
  assert.deepEqual(codes(result), [
    'FINANCIAL_MUTATION_UNSUPPORTED',
    'SIGNATURE_VERIFICATION_UNSUPPORTED',
    'ACTUATION_SCOPE_UNSUPPORTED',
  ]);
});

test('rejects invalid package scope, token count, lease bound, and archive id', () => {
  const result = validateTotalCompressionRequest({
    ...valid(),
    archiveId: '../escape',
    activePackages: ['mini', 'mini', 'unknown'],
    totalContextTokensProcessed: -1,
    rigidLeaseBoundMs: MAX_TOTAL_COMPRESSION_LEASE_MS + 1,
  });
  assert.equal(result.validation, 'INVALID');
  assert.ok(codes(result).includes('INVALID_ARCHIVE_ID'));
  assert.ok(codes(result).includes('DUPLICATE_PACKAGE'));
  assert.ok(codes(result).includes('UNSUPPORTED_PACKAGE'));
  assert.ok(codes(result).includes('INVALID_TOKEN_COUNT'));
  assert.ok(codes(result).includes('INVALID_LEASE_BOUND'));
});

test('rejects unexpected fields and null input fail closed', () => {
  const unexpected = validateTotalCompressionRequest({ ...valid(), runtimeAuthority: true });
  assert.equal(unexpected.validation, 'INVALID');
  assert.ok(codes(unexpected).includes('UNSUPPORTED_FIELD'));
  assert.ok(codes(validateTotalCompressionRequest(null)).includes('INVALID_REQUEST_SHAPE'));
});

test('fails closed when input inspection throws', () => {
  const hostile = new Proxy({}, { ownKeys: () => { throw new Error('inspection denied'); } });
  const result = validateTotalCompressionRequest(hostile);
  assert.ok(codes(result).includes('REQUEST_INSPECTION_FAILED'));
});
