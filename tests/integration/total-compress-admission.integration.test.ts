import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  MAX_TOTAL_COMPRESSION_LEASE_MS,
  validateTotalCompressionRequest,
} from '../../packages/mini/dist/index.js';

const validRequest = () => ({
  archiveId: 'archive-2026-10-03',
  evolutionScope: 'CONVERSATION_HISTORIC_COMPRESSION',
  activePackages: ['mini', 'remember'],
  totalContextTokensProcessed: 12_500,
  rigidLeaseBoundMs: 30_000,
});

const issueCodes = (result: ReturnType<typeof validateTotalCompressionRequest>) =>
  result.validation === 'INVALID' ? result.issues.map((issue) => issue.code) : [];

test('validates a bounded compression request without executing or claiming external evidence', () => {
  const input = validRequest();
  const result = validateTotalCompressionRequest(input);

  assert.equal(result.validation, 'VALID');
  assert.equal(result.execution, 'NOT_STARTED');
  assert.equal(result.evidence, 'INPUT_STRUCTURE_ONLY');
  if (result.validation !== 'VALID') throw new Error('expected valid request');
  assert.deepEqual(result.request, input);
  assert.equal(Object.isFrozen(result.request), true);
  assert.equal(Object.isFrozen(result.request.activePackages), true);
  assert.deepEqual(result.issues, []);
});

test('rejects online actuation scope', () => {
  const result = validateTotalCompressionRequest({
    ...validRequest(),
    evolutionScope: 'EVERYTHING_ONLINE_ACTUATION',
  });

  assert.equal(result.validation, 'INVALID');
  assert.ok(issueCodes(result).includes('ACTUATION_SCOPE_UNSUPPORTED'));
  assert.equal(result.execution, 'NOT_STARTED');
});

test('rejects financial mutation and unverified signature fields from the proposal', () => {
  const result = validateTotalCompressionRequest({
    ...validRequest(),
    allocatedGenerationalCapitalWei: '1',
    masterAsymmetricSignature: 'x'.repeat(64),
  });

  assert.deepEqual(issueCodes(result), [
    'FINANCIAL_MUTATION_UNSUPPORTED',
    'SIGNATURE_VERIFICATION_UNSUPPORTED',
  ]);
});

test('enforces finite lease, safe integer token count, and supported unique package scope', () => {
  for (const invalidLease of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, MAX_TOTAL_COMPRESSION_LEASE_MS + 1]) {
    const result = validateTotalCompressionRequest({ ...validRequest(), rigidLeaseBoundMs: invalidLease });
    assert.ok(issueCodes(result).includes('INVALID_LEASE_BOUND'));
  }

  for (const invalidTokenCount of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1]) {
    const result = validateTotalCompressionRequest({
      ...validRequest(),
      totalContextTokensProcessed: invalidTokenCount,
    });
    assert.ok(issueCodes(result).includes('INVALID_TOKEN_COUNT'));
  }

  const unsupportedPackage = validateTotalCompressionRequest({
    ...validRequest(),
    activePackages: ['mini', 'not-a-package'],
  });
  assert.ok(issueCodes(unsupportedPackage).includes('UNSUPPORTED_PACKAGE'));

  const duplicatePackage = validateTotalCompressionRequest({
    ...validRequest(),
    activePackages: ['mini', 'mini'],
  });
  assert.ok(issueCodes(duplicatePackage).includes('DUPLICATE_PACKAGE'));
});

test('rejects malformed IDs, empty scopes, and unexpected fields', () => {
  const malformed = validateTotalCompressionRequest({
    ...validRequest(),
    archiveId: '../escape',
    activePackages: [],
    runtimeAuthority: true,
  });

  assert.equal(malformed.validation, 'INVALID');
  assert.ok(issueCodes(malformed).includes('INVALID_ARCHIVE_ID'));
  assert.ok(issueCodes(malformed).includes('INVALID_PACKAGE_LIST'));
  assert.ok(issueCodes(malformed).includes('UNSUPPORTED_FIELD'));
});

test('rejects null and fails closed when an input object cannot be inspected', () => {
  assert.ok(issueCodes(validateTotalCompressionRequest(null)).includes('INVALID_REQUEST_SHAPE'));
  const hostile = new Proxy({}, { ownKeys: () => { throw new Error('inspection denied'); } });
  assert.ok(issueCodes(validateTotalCompressionRequest(hostile)).includes('REQUEST_INSPECTION_FAILED'));
});
