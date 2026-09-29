import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { inspectGithubUpgrade } from '../../packages/mini/dist/index.js';

const snapshot = {
  owner: 'starofgodmayomi-droid',
  repo: 'omega-v-oceanicos',
  defaultBranch: 'main',
  observedBranch: 'main',
  headSha: '1d28d4f5beaae91b5797f9cee66eb4d33ed197f8',
  headShaObserved: true,
  workingTreeClean: true,
  openPullRequestsObserved: true,
  openPullRequests: [],
  tests: { observed: false },
  build: { observed: false },
  ci: { observed: false },
  deployment: { observed: false },
  runtime: { observed: false },
  observedAt: '2026-09-29T03:00:00.000Z',
};

const intent = {
  id: 'upgrade.github-inspector.v1',
  subject: 'classify observed GitHub HEAD without mutating the repository',
  expectedConsequence: 'source layer classified from observed SHA',
  affectedComponents: ['packages/mini'],
  rollback: 'discard the inspection record; no repository mutation occurred',
  claimedLayer: 'source' as const,
  mutating: false,
};

describe('Ω GitHub upgrade inspector boundary', () => {
  it('classifies observed source without executing a GitHub mutation', () => {
    const result = inspectGithubUpgrade({
      intent,
      snapshot,
      authorityVerified: true,
      policySatisfied: true,
    });

    assert.equal(result.decision, 'ALLOW');
    assert.equal(result.admitted, true);
    assert.equal(result.executed, false);
    assert.equal(result.status, 'VERIFIED');
    assert.equal(result.layers.find((layer) => layer.layer === 'runtime')?.status, 'UNVERIFIED');
  });

  it('denies missing authority and never executes', () => {
    const result = inspectGithubUpgrade({
      intent,
      snapshot,
      authorityVerified: false,
      policySatisfied: true,
    });

    assert.equal(result.decision, 'DENY');
    assert.equal(result.status, 'DENIED');
    assert.equal(result.executed, false);
    assert.ok(result.issues.includes('upgrade authority evidence is missing'));
  });

  it('refuses to treat CI success as runtime verification', () => {
    const result = inspectGithubUpgrade({
      intent: { ...intent, claimedLayer: 'runtime' },
      snapshot: {
        ...snapshot,
        ci: { observed: true, status: 'success', runUrl: 'https://example.test/ci/1' },
      },
      authorityVerified: true,
      policySatisfied: true,
    });

    assert.equal(result.executed, false);
    assert.equal(result.status, 'UNVERIFIED');
    assert.ok(result.issues.includes('CI success does not prove runtime health'));
  });
});
