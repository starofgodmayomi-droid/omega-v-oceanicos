import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createApp } from '../index';
import { listenApi } from '../../../../tests/helpers/api-server';

/**
 * Provenance and authority must outlive the process.
 *
 * Both engines used to be in-memory singletons in `governance-route.ts`: every
 * restart reset the hash chain to genesis and forgot which subjects had been
 * granted or revoked authority. These tests drive the real HTTP routes against
 * a journal on disk and then build a *second* app over the same store, which is
 * what a restart looks like from the outside.
 */

type StartedApp = Awaited<ReturnType<typeof listenApi>>;

const startApp = async (dbPath: string): Promise<{ server: StartedApp; base: string }> => {
  const app = createApp(dbPath, false);
  const server = await listenApi(app as any);
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('API server did not start');
  return { server, base: `http://127.0.0.1:${address.port}` };
};

const post = async (base: string, path: string, body: unknown) => {
  const response = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: (await response.json()) as any };
};

const get = async (base: string, path: string) => {
  const response = await fetch(`${base}${path}`);
  return { status: response.status, body: (await response.json()) as any };
};

describe('governance state survives a restart', () => {
  const previousPersistence = process.env.OMEGA_PERSISTENCE;
  const previousKey = process.env.OMEGA_PERSISTENCE_KEY;
  let dir = '';

  before(() => {
    process.env.OMEGA_PERSISTENCE = 'on';
    delete process.env.OMEGA_PERSISTENCE_KEY;
    dir = mkdtempSync(join(tmpdir(), 'omega-governance-'));
  });

  after(() => {
    if (previousPersistence === undefined) delete process.env.OMEGA_PERSISTENCE;
    else process.env.OMEGA_PERSISTENCE = previousPersistence;
    if (previousKey === undefined) delete process.env.OMEGA_PERSISTENCE_KEY;
    else process.env.OMEGA_PERSISTENCE_KEY = previousKey;
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it('resumes the provenance chain and the grant ledger after a restart', async () => {
    const dbPath = join(dir, 'restart.db');
    const first = await startApp(dbPath);
    let secondEntryHash = '';
    let keptGrantId = '';
    let revokedGrantId = '';

    try {
      const append1 = await post(first.base, '/v1/provenance/append', {
        changeId: 'restart-1',
        source: 'durability-test',
        attributedTo: 'human-1',
      });
      assert.equal(append1.status, 200);
      assert.equal(append1.body.entry.sequence, 1);
      assert.equal(append1.body.durable, true, 'the entry must reach the journal');

      const append2 = await post(first.base, '/v1/provenance/append', {
        changeId: 'restart-2',
        source: 'durability-test',
        attributedTo: 'human-1',
      });
      assert.equal(append2.body.entry.sequence, 2);
      secondEntryHash = append2.body.entry.hash;

      const kept = await post(first.base, '/v1/authorization/grant', {
        subject: 'agent-1',
        scope: 'oceanicos:*',
        grantedBy: 'human-1',
      });
      assert.equal(kept.status, 200);
      keptGrantId = kept.body.grant.id;

      const revoked = await post(first.base, '/v1/authorization/grant', {
        subject: 'agent-2',
        scope: 'oceanicos:*',
        grantedBy: 'human-1',
      });
      revokedGrantId = revoked.body.grant.id;

      const revoke = await post(first.base, '/v1/authorization/revoke', {
        grantId: revokedGrantId,
        revokedBy: 'human-1',
      });
      assert.equal(revoke.status, 200);
      assert.equal(revoke.body.durable, true);
    } finally {
      await first.server.close();
    }

    // ── restart ───────────────────────────────────────────────────────
    const second = await startApp(dbPath);
    try {
      const verify = await get(second.base, '/v1/provenance/verify');
      assert.equal(verify.body.integrity, true);
      assert.equal(verify.body.length, 2, 'the chain resumes instead of restarting at genesis');

      const tip = await get(second.base, '/v1/provenance/tip');
      assert.equal(tip.body.tip.changeId, 'restart-2');
      assert.equal(tip.body.tip.hash, secondEntryHash);

      const lineage = await get(second.base, '/v1/provenance/lineage/restart-1');
      assert.equal(lineage.status, 200);

      const grants = await get(second.base, '/v1/authorization/grants');
      assert.equal(grants.body.grants.length, 2);
      assert.equal(grants.body.activeCount, 1);
      assert.equal(
        grants.body.grants.find((grant: any) => grant.id === revokedGrantId)?.revoked,
        true,
        'a revocation must survive the restart'
      );

      // The engine is fail-closed on evidence, so a request carries evidence
      // the same way the dashboard's admission gate does.
      const allowed = await post(second.base, '/v1/authorization/evaluate', {
        changeId: 'eval-1',
        subject: 'agent-1',
        scope: 'oceanicos:worker:test',
        evidence: ['attestation-durability-1'],
      });
      assert.equal(allowed.body.authorization.authorized, true);
      assert.equal(allowed.body.authorization.grantId, keptGrantId);

      const denied = await post(second.base, '/v1/authorization/evaluate', {
        changeId: 'eval-2',
        subject: 'agent-2',
        scope: 'oceanicos:worker:test',
        evidence: ['attestation-durability-1'],
      });
      assert.equal(denied.body.authorization.authorized, false);

      const next = await post(second.base, '/v1/provenance/append', {
        changeId: 'restart-3',
        source: 'durability-test',
        attributedTo: 'human-1',
      });
      assert.equal(next.body.entry.sequence, 3);
      assert.equal(next.body.entry.previousHash, secondEntryHash);
      const reverify = await get(second.base, '/v1/provenance/verify');
      assert.equal(reverify.body.integrity, true);
      assert.equal(reverify.body.length, 3);
    } finally {
      await second.server.close();
    }
  });

  it('reports durable=false and keeps nothing when persistence is off', async () => {
    process.env.OMEGA_PERSISTENCE = 'off';
    const dbPath = join(dir, 'memory-only.db');

    const first = await startApp(dbPath);
    try {
      const append = await post(first.base, '/v1/provenance/append', {
        changeId: 'volatile-1',
        source: 'durability-test',
      });
      assert.equal(append.status, 200, 'the entry is still accepted in memory');
      assert.equal(append.body.durable, false, 'and it is not claimed to be durable');
    } finally {
      await first.server.close();
    }

    const second = await startApp(dbPath);
    try {
      const verify = await get(second.base, '/v1/provenance/verify');
      assert.equal(verify.body.length, 0);
      assert.equal(verify.body.durable, false);
      const grants = await get(second.base, '/v1/authorization/grants');
      assert.equal(grants.body.grants.length, 0);
    } finally {
      await second.server.close();
      process.env.OMEGA_PERSISTENCE = 'on';
    }
  });
});
