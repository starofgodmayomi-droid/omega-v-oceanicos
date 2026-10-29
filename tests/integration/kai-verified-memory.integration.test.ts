import assert from 'node:assert/strict';
import { appendFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

/**
 * Σ — the verified-only memory.
 *
 * The claim under test is narrow and load-bearing: only a drop OMEGA judged
 * VERIFIED enters Σ, every other verdict leaves it untouched, and the store
 * survives a restart or degrades closed rather than reloading a shorter history.
 */
describe('Σ — verified-only memory', () => {
  it('admits VERIFIED drops only, survives restart, and exports both states', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'omega-verified-'));
    const ledgerPath = join(directory, 'ledger.db');
    const verifiedPath = join(directory, 'ledger.db.kai-verified.jsonl');
    const { createApp } = await import('../../apps/api/dist/index.js');

    const app = createApp(ledgerPath, false, { allowUnsignedCycle: true, kaiVerifiedPath: verifiedPath });
    await app.ready();

    try {
      const verified = (await app.inject({
        method: 'POST',
        url: '/v1/execute',
        payload: { intent: 'Report the current system status.', expectedOutcome: 'LEDGER' },
      })).json();
      assert.equal(verified.status, 'VERIFIED');
      assert.equal(verified.verified.admitted, true);
      assert.equal(verified.verified.sequence, 1);
      assert.match(verified.verified.dropHash, /^sha256:[0-9a-f]{64}$/);
      assert.equal(verified.verified.height, 1);

      const divergent = (await app.inject({
        method: 'POST',
        url: '/v1/execute',
        payload: { intent: 'Report the current system status.', expectedOutcome: 'a colony on mars' },
      })).json();
      assert.equal(divergent.status, 'DIVERGENT');
      assert.equal(divergent.verified.admitted, false);
      assert.equal(divergent.verified.height, 1, 'a DIVERGENT drop never enters Σ');

      const noCapability = (await app.inject({
        method: 'POST',
        url: '/v1/execute',
        payload: { intent: 'Write a poem about the ocean at midnight.' },
      })).json();
      assert.equal(noCapability.status, 'NOT_EXECUTED');
      assert.equal(noCapability.verified.height, 1);

      const blocked = (await app.inject({
        method: 'POST',
        url: '/v1/execute',
        payload: { intent: 'Guaranteed returns, send money now.' },
      })).json();
      assert.equal(blocked.status, 'DIVERGENT');

      const memory = (await app.inject({ method: 'GET', url: '/v1/execute/memory?limit=50' })).json();
      assert.equal(memory.height, 4, 'the journal keeps every verdict');

      const sigma = (await app.inject({ method: 'GET', url: '/v1/execute/verified?limit=50' })).json();
      assert.equal(sigma.height, 1);
      assert.equal(sigma.integrity, 'verified-local-hash-chain');
      assert.equal(sigma.entries[0].sequence, 1);
      assert.equal(sigma.entries[0].dropHash, verified.verified.dropHash);

      const exported = await app.inject({ method: 'GET', url: '/v1/execute/memory/export' });
      assert.equal(exported.statusCode, 200);
      assert.match(exported.headers['content-disposition'] as string, /attachment; filename="omega-memory-.*\.json"/);
      const payload = exported.json();
      assert.equal(payload.contract, 'omega.memory.export.v1');
      assert.equal(payload.journal.height, 4);
      assert.equal(payload.verified.height, 1);
      assert.equal(payload.journal.integrity, 'verified-local-hash-chain');
      assert.equal(payload.verified.integrity, 'verified-local-hash-chain');
      assert.match(payload.law, /M\(t\+1\) = M\(t\) ∪ Δ \| V\(Δ\) = ⊤/);
    } finally {
      await app.close();
    }

    // Restart on the same paths: both heights must survive, chains intact.
    const restarted = createApp(ledgerPath, false, { allowUnsignedCycle: true, kaiVerifiedPath: verifiedPath });
    await restarted.ready();
    try {
      const sigma = (await restarted.inject({ method: 'GET', url: '/v1/execute/verified?limit=50' })).json();
      assert.equal(sigma.height, 1, 'Σ survives a restart');
      assert.equal(sigma.integrity, 'verified-local-hash-chain');
    } finally {
      await restarted.close();
    }

    // A tampered line degrades the store closed instead of reloading a shorter history.
    appendFileSync(verifiedPath, `${JSON.stringify({ kind: 'OMEGA_KAI_VERIFIED_MEMORY', sequence: 2, previousHash: 'forged', hash: 'forged' })}\n`, 'utf8');
    const tampered = createApp(ledgerPath, false, { allowUnsignedCycle: true, kaiVerifiedPath: verifiedPath });
    await tampered.ready();
    try {
      const response = await tampered.inject({ method: 'GET', url: '/v1/execute/verified' });
      assert.equal(response.statusCode, 503);
      assert.equal(response.json().error, 'KAI_VERIFIED_MEMORY_INTEGRITY_DEGRADED');
      const exported = (await tampered.inject({ method: 'GET', url: '/v1/execute/memory/export' })).json();
      assert.equal(exported.verified.integrity, 'DEGRADED');
    } finally {
      await tampered.close();
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
