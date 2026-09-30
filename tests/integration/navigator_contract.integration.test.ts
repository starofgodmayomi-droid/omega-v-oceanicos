import assert from 'node:assert/strict';
import test from 'node:test';
import { parseNavigatorEvidenceSnapshot } from '../../packages/types/src/navigator-contract.ts';

const source = {
  repository: 'starofgodmayomi-droid/omega-v-oceanicos',
  commit: '21a4abfb20f0d46698d1858c3fc61a9f00354292',
  branch: 'main',
  observedAt: '2026-09-30T02:01:25.000Z',
  locator: 'tests/integration/navigator_contract.integration.test.ts',
};

test('Navigator evidence contract accepts a provenance-bearing read-only snapshot', () => {
  const snapshot = parseNavigatorEvidenceSnapshot({
    contract: 'omega-navigator-evidence.v1',
    generatedAt: '2026-09-30T02:01:25.000Z',
    source,
    overallStatus: 'SUPPORTED',
    readOnly: true,
    evidence: [
      {
        id: 'github-repository-listing',
        status: 'VERIFIED',
        claim: 'The public repository listing was observed.',
        observedAt: '2026-09-30T02:01:25.000Z',
        source,
        policyVersion: 'navigator-display.v1',
        limitations: ['A listing is not a deploy.'],
      },
    ],
  });
  assert.equal(snapshot.readOnly, true);
  assert.equal(snapshot.evidence[0]?.status, 'VERIFIED');
});

test('Navigator evidence contract rejects mutable or over-claimed payloads', () => {
  assert.throws(() =>
    parseNavigatorEvidenceSnapshot({
      contract: 'omega-navigator-evidence.v1',
      generatedAt: '2026-09-30T02:01:25.000Z',
      source,
      overallStatus: 'HEALTHY',
      readOnly: true,
      evidence: [],
    }),
  );
  assert.throws(() =>
    parseNavigatorEvidenceSnapshot({
      contract: 'omega-navigator-evidence.v1',
      generatedAt: '2026-09-30T02:01:25.000Z',
      source,
      overallStatus: 'SUPPORTED',
      readOnly: false,
      evidence: [],
    }),
  );
});
