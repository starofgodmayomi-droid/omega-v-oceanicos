import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync, appendFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

async function removeTemporaryDirectory(directory: string): Promise<void> {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      rmSync(directory, { recursive: true, force: true, maxRetries: 2, retryDelay: 100 });
      return;
    } catch (error: any) {
      if (error?.code !== 'EBUSY' && error?.code !== 'EPERM') throw error;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
  rmSync(directory, { recursive: true, force: true });
}

const proposalPayload = (subject: string) => ({
  subject,
  intent: 'test one bounded value hypothesis',
  stateBefore: 'proposal',
  expectedOutcome: '3 users complete the test',
  evidence: ['stated: local discovery notes'],
  valuePotentialScore: 62,
  valuePotentialBasis: 'operator prioritization estimate',
});

describe('Value Navigator → durable OmegaChangeRecord', () => {
  it('keeps proposals REVIEW/unauthorized, rejects client authority/status, and appends observations', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'omega-value-navigator-'));
    const dbPath = join(directory, 'ledger.db');
    const journalPath = join(directory, 'value-navigator.jsonl');
    const { createApp } = await import('../../apps/api/dist/index.js');
    let app = createApp(dbPath, false, { allowUnsignedCycle: true, valueNavigatorPath: journalPath });
    await app.ready();

    let proposalId = '';
    try {
      const unauthorizedClaim = await app.inject({
        method: 'POST',
        url: '/v1/value-navigator/proposals',
        payload: { ...proposalPayload('claimed authority'), authorized: true },
      });
      assert.equal(unauthorizedClaim.statusCode, 400);
      assert.equal(unauthorizedClaim.json().error, 'PROPOSAL_CANNOT_SET_DECISION_AUTHORITY_OR_STATUS');

      const verifiedClaim = await app.inject({
        method: 'POST',
        url: '/v1/value-navigator/proposals',
        payload: { ...proposalPayload('claimed verification'), status: 'VERIFIED' },
      });
      assert.equal(verifiedClaim.statusCode, 400);

      const created = await app.inject({
        method: 'POST',
        url: '/v1/value-navigator/proposals',
        payload: proposalPayload('Local interview scheduling friction'),
      });
      assert.equal(created.statusCode, 201);
      const original = created.json().entry;
      proposalId = original.proposalId;
      assert.equal(original.phase, 'PROPOSAL');
      assert.equal(original.record.decision, 'REVIEW');
      assert.equal(original.record.authorized, false);
      assert.equal(original.reconciliationStatus, 'NOT_EXECUTED');
      assert.equal(original.valuePotentialHypothesis.kind, 'hypothesis');
      assert.equal(original.valuePotentialHypothesis.score, 62);
      assert.match(original.valuePotentialHypothesis.limitation, /not evidence of demand, revenue, or earnings/);

      const listing = await app.inject({ method: 'GET', url: '/v1/value-navigator/proposals' });
      assert.equal(listing.statusCode, 200);
      assert.equal(listing.json().entries.length, 1);
      assert.equal(listing.json().total, 1);
      assert.equal(listing.json().truncated, false);

      const observation = await app.inject({
        method: 'POST',
        url: `/v1/value-navigator/proposals/${encodeURIComponent(proposalId)}/observe`,
        payload: {
          observedOutcome: ' 3 USERS   COMPLETE THE TEST ',
          source: 'operator observation log',
          evidence: 'three completed local test records',
        },
      });
      assert.equal(observation.statusCode, 201);
      const observed = observation.json().entry;
      assert.equal(observed.reconciliationStatus, 'VERIFIED');
      assert.equal(observed.verificationScope, 'hypothesis-reconciliation-only');
      assert.equal(observed.record.decision, 'REVIEW');
      assert.equal(observed.record.authorized, false);
      assert.equal(observed.supersedesId, original.record.id);
      assert.notEqual(observed.record.id, original.record.id);
      assert.equal(observation.json().history.length, 2);

      const originalReadable = await app.inject({ method: 'GET', url: `/v1/value-navigator/proposals/${encodeURIComponent(proposalId)}` });
      assert.equal(originalReadable.statusCode, 200);
      assert.equal(originalReadable.json().entries[0].record.id, original.record.id);
      assert.equal(originalReadable.json().entries[0].reconciliationStatus, 'NOT_EXECUTED');
      assert.equal(originalReadable.json().entries[1].record.id, observed.record.id);

      const mismatchCreated = await app.inject({
        method: 'POST', url: '/v1/value-navigator/proposals', payload: proposalPayload('Mismatch case'),
      });
      const mismatchId = mismatchCreated.json().entry.proposalId;
      const mismatch = await app.inject({
        method: 'POST', url: `/v1/value-navigator/proposals/${encodeURIComponent(mismatchId)}/observe`,
        payload: { observedOutcome: 'no users finished', source: 'operator log', evidence: 'zero completion records' },
      });
      assert.equal(mismatch.json().entry.reconciliationStatus, 'DIVERGENT');

      const unknownCreated = await app.inject({
        method: 'POST', url: '/v1/value-navigator/proposals', payload: proposalPayload('Unavailable observation case'),
      });
      const unknownId = unknownCreated.json().entry.proposalId;
      const unknown = await app.inject({
        method: 'POST', url: `/v1/value-navigator/proposals/${encodeURIComponent(unknownId)}/observe`,
        payload: { error: 'observer unavailable' },
      });
      assert.equal(unknown.json().entry.reconciliationStatus, 'UNKNOWN');
    } finally {
      await app.close();
    }

    app = createApp(dbPath, false, { allowUnsignedCycle: true, valueNavigatorPath: journalPath });
    await app.ready();
    try {
      const replayed = await app.inject({ method: 'GET', url: `/v1/value-navigator/proposals/${encodeURIComponent(proposalId)}` });
      assert.equal(replayed.statusCode, 200);
      assert.equal(replayed.json().entries.length, 2);
      assert.equal(replayed.json().entries[0].reconciliationStatus, 'NOT_EXECUTED');
      assert.equal(replayed.json().entries[1].reconciliationStatus, 'VERIFIED');
      assert.equal(replayed.json().entries[0].record.authorized, false);
    } finally {
      await app.close();
      await removeTemporaryDirectory(directory);
    }
  });

  it('fails closed on a corrupt local journal and uses no undeclared network or shell observer', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'omega-value-navigator-integrity-'));
    const dbPath = join(directory, 'ledger.db');
    const journalPath = join(directory, 'value-navigator.jsonl');
    const { createApp } = await import('../../apps/api/dist/index.js');
    let app = createApp(dbPath, false, { allowUnsignedCycle: true, valueNavigatorPath: journalPath });
    await app.ready();
    await app.close();
    appendFileSync(journalPath, '{corrupt record}\n');
    app = createApp(dbPath, false, { allowUnsignedCycle: true, valueNavigatorPath: journalPath });
    await app.ready();
    try {
      const response = await app.inject({ method: 'GET', url: '/v1/value-navigator/proposals' });
      assert.equal(response.statusCode, 503);
      assert.equal(response.json().error, 'VALUE_NAVIGATOR_JOURNAL_INTEGRITY_DEGRADED');

      const routeSource = readFileSync(join(process.cwd(), 'apps/api/src/value-navigator-route.ts'), 'utf8');
      const miniSource = readFileSync(join(process.cwd(), 'packages/mini/src/value-navigator.ts'), 'utf8');
      assert.doesNotMatch(routeSource + miniSource, /node:child_process|\bfetch\s*\(|https?:\/\//i);
      const webSource = readFileSync(join(process.cwd(), 'apps/web/src/ValueNavigatorPanel.tsx'), 'utf8');
      assert.match(webSource, /type Status = 'VERIFIED' \| 'DIVERGENT' \| 'UNKNOWN' \| 'NOT_EXECUTED'/);
      const miniContract = readFileSync(join(process.cwd(), 'packages/mini/src/value-navigator.ts'), 'utf8');
      assert.match(miniContract, /ValueNavigatorStatus = 'VERIFIED' \| 'DIVERGENT' \| 'UNKNOWN' \| 'NOT_EXECUTED'/);
      const skill = readFileSync(join(process.cwd(), 'skills/oceanicos-value-navigator/SKILL.md'), 'utf8');
      for (const status of ['VERIFIED', 'DIVERGENT', 'UNKNOWN', 'NOT_EXECUTED']) assert.match(skill, new RegExp(status));
      assert.match(skill, /does \*\*not\*\* fetch URLs/);
    } finally {
      await app.close();
      await removeTemporaryDirectory(directory);
    }
  });
});
