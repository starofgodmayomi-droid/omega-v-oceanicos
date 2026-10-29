import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';
import { createApp } from '../../apps/api/dist/index.js';
import {
  evaluateRepoAccess,
  issueRepoAccessCapability,
  type RepoAccessCapability,
} from '../../apps/api/dist/repo-access.js';

const KEY = 'repo-access-test-key-'.padEnd(48, 'x');
const SCOPE = 'starofgodmayomi-droid/omega-v-oceanicos';
const OPERATION = 'repo:file:read';

const withApp = async (run: (app: ReturnType<typeof createApp>, directory: string) => Promise<void>) => {
  const directory = mkdtempSync(join(tmpdir(), 'omega-repo-access-'));
  const app = createApp(join(directory, 'ledger.db'), false, { allowUnsignedCycle: true });
  try {
    await run(app, directory);
  } finally {
    await app.close();
    rmSync(directory, { recursive: true, force: true });
  }
};

const issued = (operation: string = OPERATION, scope: string = SCOPE, subject = 'elion-agent') => {
  const result = issueRepoAccessCapability({ subject, operation, scope, ttlSeconds: 600 }, KEY);
  assert.equal(result.ok, true);
  return (result as { ok: true; capability: RepoAccessCapability }).capability;
};

test('repository access policy is read-only and never claims execution', async () => {
  process.env.OMEGA_REPO_ACCESS_KEY = KEY;
  await withApp(async (app) => {
    const response = await app.inject({ method: 'GET', url: '/v1/repo/access/policy' });
    assert.equal(response.statusCode, 200);
    const body = response.json();
    assert.equal(body.contract, 'omega-repo-access.v1');
    assert.equal(body.executed, false);
    assert.equal(body.capabilityKeyConfigured, true);
    assert.deepEqual(body.operations, ['repo:metadata:read', 'repo:file:read', 'repo:file:write', 'repo:merge']);
    assert.equal(body.defaultScope, SCOPE);

    const mutation = await app.inject({ method: 'POST', url: '/v1/repo/access/policy', payload: {} });
    assert.equal(mutation.statusCode, 404);
  });
});

test('a scoped capability admits exactly one matching operation and is audited', async () => {
  process.env.OMEGA_REPO_ACCESS_KEY = KEY;
  await withApp(async (app) => {
    const grant = await app.inject({
      method: 'POST',
      url: '/v1/repo/access/grant',
      payload: { subject: 'elion-agent', operation: OPERATION, scope: SCOPE },
    });
    assert.equal(grant.statusCode, 201);
    const capability = grant.json().capability as RepoAccessCapability;
    assert.equal(grant.json().executed, false);

    const evaluate = await app.inject({
      method: 'POST',
      url: '/v1/repo/access/evaluate',
      payload: { subject: 'elion-agent', operation: OPERATION, scope: SCOPE, capability },
    });
    assert.equal(evaluate.statusCode, 200);
    const body = evaluate.json();
    assert.equal(body.decision, 'ALLOW');
    assert.equal(body.reason, 'CAPABILITY_VERIFIED');
    assert.equal(body.capability, 'VERIFIED');
    assert.equal(body.executed, false);

    const audit = await app.inject({ method: 'GET', url: '/v1/repo/access/audit' });
    assert.equal(audit.statusCode, 200);
    const entries = audit.json().entries;
    assert.equal(entries.length, 2);
    assert.deepEqual(entries.map((entry: { decision: string }) => entry.decision), ['ISSUED', 'ALLOW']);
    assert.equal(entries[1].id, body.audit.id);
    assert.equal(audit.json().integrity, 'verified-local-hash-chain');
    assert.ok(entries.every((entry: { executed: boolean }) => entry.executed === false));
  });
});

test('denials are fail-closed, ordered, and recorded with their reason', async () => {
  process.env.OMEGA_REPO_ACCESS_KEY = KEY;
  await withApp(async (app) => {
    const evaluate = async (payload: Record<string, unknown>) =>
      (await app.inject({ method: 'POST', url: '/v1/repo/access/evaluate', payload })).json();

    const absent = await evaluate({ subject: 'elion-agent', operation: OPERATION, scope: SCOPE });
    assert.equal(absent.decision, 'DENY');
    assert.equal(absent.reason, 'CAPABILITY_REQUIRED');
    assert.equal(absent.capability, 'ABSENT');

    const unregistered = await evaluate({ subject: 'elion-agent', operation: 'repo:push:force', scope: SCOPE });
    assert.equal(unregistered.reason, 'OPERATION_NOT_REGISTERED');

    const valid = issued();
    const tampered = await evaluate({
      subject: 'elion-agent',
      operation: OPERATION,
      scope: SCOPE,
      capability: { ...valid, signature: 'f'.repeat(64) },
    });
    assert.equal(tampered.reason, 'CAPABILITY_INVALID');
    assert.equal(tampered.capability, 'INVALID');

    const expiredIssue = issueRepoAccessCapability(
      { subject: 'elion-agent', operation: OPERATION, scope: SCOPE, ttlSeconds: 60 },
      KEY,
      Date.now() - 120_000,
    );
    assert.equal(expiredIssue.ok, true);
    const expired = await evaluate({
      subject: 'elion-agent',
      operation: OPERATION,
      scope: SCOPE,
      capability: expiredIssue.ok ? expiredIssue.capability : null,
    });
    assert.equal(expired.reason, 'CAPABILITY_EXPIRED');

    const otherSubject = await evaluate({
      subject: 'kai-agent',
      operation: OPERATION,
      scope: SCOPE,
      capability: valid,
    });
    assert.equal(otherSubject.reason, 'SUBJECT_MISMATCH');

    const otherOperation = await evaluate({
      subject: 'elion-agent',
      operation: 'repo:merge',
      scope: SCOPE,
      capability: valid,
    });
    assert.equal(otherOperation.reason, 'OPERATION_MISMATCH');

    const otherScope = await evaluate({
      subject: 'elion-agent',
      operation: OPERATION,
      scope: 'someone-else/other-repo',
      capability: valid,
    });
    assert.equal(otherScope.reason, 'SCOPE_MISMATCH');

    const audit = await app.inject({ method: 'GET', url: '/v1/repo/access/audit?limit=3' });
    assert.equal(audit.statusCode, 200);
    assert.equal(audit.json().entries.length, 3);
    assert.equal(audit.json().truncated, true);
  });
});

test('a missing capability key fails closed instead of admitting', async () => {
  const previousRepoKey = process.env.OMEGA_REPO_ACCESS_KEY;
  const previousSigningKey = process.env.OMEGA_SIGNING_KEY;
  delete process.env.OMEGA_REPO_ACCESS_KEY;
  delete process.env.OMEGA_SIGNING_KEY;
  try {
    assert.equal(evaluateRepoAccess({ subject: 'elion-agent', operation: OPERATION, scope: SCOPE }, null).reason, 'CAPABILITY_KEY_UNAVAILABLE');
    await withApp(async (app) => {
      const grant = await app.inject({
        method: 'POST',
        url: '/v1/repo/access/grant',
        payload: { subject: 'elion-agent', operation: OPERATION, scope: SCOPE },
      });
      assert.equal(grant.statusCode, 503);
      assert.equal(grant.json().error, 'CAPABILITY_KEY_UNAVAILABLE');

      const evaluate = await app.inject({
        method: 'POST',
        url: '/v1/repo/access/evaluate',
        payload: { subject: 'elion-agent', operation: OPERATION, scope: SCOPE },
      });
      assert.equal(evaluate.json().reason, 'CAPABILITY_KEY_UNAVAILABLE');

      const policy = await app.inject({ method: 'GET', url: '/v1/repo/access/policy' });
      assert.equal(policy.json().capabilityKeyConfigured, false);
    });
  } finally {
    if (previousRepoKey !== undefined) process.env.OMEGA_REPO_ACCESS_KEY = previousRepoKey;
    if (previousSigningKey !== undefined) process.env.OMEGA_SIGNING_KEY = previousSigningKey;
  }
});

test('grant rejects unregistered operations, malformed subjects, and caller-supplied claims', async () => {
  process.env.OMEGA_REPO_ACCESS_KEY = KEY;
  await withApp(async (app) => {
    const post = (payload: Record<string, unknown>) =>
      app.inject({ method: 'POST', url: '/v1/repo/access/grant', payload });

    assert.equal((await post({ subject: 'elion-agent', operation: 'repo:push:force', scope: SCOPE })).json().error, 'OPERATION_NOT_REGISTERED');
    assert.equal((await post({ subject: '   ', operation: OPERATION, scope: SCOPE })).json().error, 'INVALID_SUBJECT');
    assert.equal((await post({ subject: 'elion-agent', operation: OPERATION, scope: SCOPE, ttlSeconds: 0 })).json().error, 'INVALID_TTL');
    assert.equal((await post({ subject: 'elion-agent', operation: OPERATION, scope: SCOPE, authorized: true })).json().error, 'UNSUPPORTED_FIELDS');
  });
});

test('a tampered audit journal is reported as degraded instead of verified', async () => {
  process.env.OMEGA_REPO_ACCESS_KEY = KEY;
  const directory = mkdtempSync(join(tmpdir(), 'omega-repo-access-tamper-'));
  const dbPath = join(directory, 'ledger.db');
  const app = createApp(dbPath, false, { allowUnsignedCycle: true });
  try {
    const grant = await app.inject({
      method: 'POST',
      url: '/v1/repo/access/grant',
      payload: { subject: 'elion-agent', operation: OPERATION, scope: SCOPE },
    });
    assert.equal(grant.statusCode, 201);
  } finally {
    await app.close();
  }

  try {
    appendFileSync(join(directory, 'ledger.db.repo-access.jsonl'), '{"kind":"OMEGA_REPO_ACCESS","sequence":99}\n');
    const restored = createApp(dbPath, false, { allowUnsignedCycle: true });
    try {
      const audit = await restored.inject({ method: 'GET', url: '/v1/repo/access/audit' });
      assert.equal(audit.statusCode, 503);
      assert.equal(audit.json().error, 'REPO_ACCESS_AUDIT_INTEGRITY_DEGRADED');
    } finally {
      await restored.close();
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
