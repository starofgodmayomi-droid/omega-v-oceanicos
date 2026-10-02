import assert from 'node:assert/strict';
import test from 'node:test';
import {
  NAVIGATOR_EVIDENCE_CONTRACT,
  parseNavigatorEvidenceSnapshot,
} from '../../packages/types/dist/index.js';

const source = {
  repository: 'starofgodmayomi-droid/omega-v-oceanicos',
  commit: 'abc1234',
  branch: 'main',
  observedAt: '2026-09-28T12:00:00.000Z',
  locator: 'packages/types/src/navigator-contract.ts',
};

const valid = {
  contract: NAVIGATOR_EVIDENCE_CONTRACT,
  generatedAt: '2026-09-28T12:00:00.000Z',
  source,
  overallStatus: 'SUPPORTED',
  readOnly: true,
  evidence: [
    {
      id: 'evidence-contract-1',
      status: 'SUPPORTED',
      claim: 'The read-only adapter contract is present in the Omega source tree.',
      observedAt: source.observedAt,
      source,
      policyVersion: 'navigator-display.v1',
      limitations: ['This does not prove a deployed runtime or frontend binding.'],
    },
  ],
};

test('accepts a provenance-bearing read-only snapshot', () => {
  const parsed = parseNavigatorEvidenceSnapshot(valid);
  assert.equal(parsed.readOnly, true);
  assert.equal(parsed.evidence[0]?.status, 'SUPPORTED');
});

test('rejects a snapshot that tries to claim health without evidence', () => {
  assert.throws(
    () => parseNavigatorEvidenceSnapshot({ ...valid, overallStatus: 'HEALTHY' }),
    /Invalid omega-navigator-evidence\.v1 snapshot/,
  );
});

test('rejects a mutable or missing-provenance snapshot', () => {
  assert.throws(
    () => parseNavigatorEvidenceSnapshot({ ...valid, readOnly: false }),
    /Invalid omega-navigator-evidence\.v1 snapshot/,
  );
  assert.throws(
    () => parseNavigatorEvidenceSnapshot({ ...valid, source: { ...source, locator: '' } }),
    /Invalid omega-navigator-evidence\.v1 snapshot/,
  );
});
