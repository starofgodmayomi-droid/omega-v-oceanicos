import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createApp } from '../../apps/api/dist/index.js';
import { KaiMemoryStore } from '../../apps/api/dist/kai-memory.js';
import { KAI_SYSTEM_PROMPT, verifyOmega } from '../../apps/api/src/invisible-computer.ts';

const sha256 = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex');

test('POST /api/execute runs KAI → ELION → OMEGA → KAI and returns the evidence hash', async () => {
  const app = createApp(':memory:', false);
  try {
    const response = await app.inject({
      method: 'POST',
      url: '/api/execute',
      payload: { intent: 'Explain how evidence-bound verification works' },
    });
    const body = response.json();

    assert.equal(response.statusCode, 200);
    assert.equal(body.status, 'VERIFIED');
    assert.equal(body.engine, 'local-deterministic');
    assert.match(body.evidence_hash, /^[0-9a-f]{64}$/);
    assert.equal(body.evidence_hash, sha256(body.response));
    assert.ok(body.response.includes('Explain how evidence-bound verification works'));
    assert.equal(body.contract.authority_level, 'READ_ONLY');
    assert.ok(body.contract.expected_outcome.length > 0);
    assert.ok(body.memory?.id, 'a verified outcome must be remembered');

    assert.deepEqual(
      body.steps.map((step: any) => `${step.actor}:${step.phase}:${step.status}`),
      [
        'KAI:OBSERVE:VERIFIED',
        'ELION:EXECUTE:VERIFIED',
        'OMEGA:VERIFY:VERIFIED',
        'KAI:REMEMBER:VERIFIED',
      ]
    );

    const memory = await app.inject({ method: 'GET', url: '/api/kai/memory?limit=5' });
    const memoryBody = memory.json();
    assert.equal(memory.statusCode, 200);
    assert.equal(memoryBody.total, 1);
    assert.equal(memoryBody.records[0].id, body.memory.id);
    assert.equal(memoryBody.records[0].evidence_hash, body.evidence_hash);
    assert.equal(memoryBody.records[0].status, 'VERIFIED');
  } finally {
    await app.close();
  }
});

test('POST /execute (the Vite proxy target) answers identically', async () => {
  const app = createApp(':memory:', false);
  try {
    const response = await app.inject({
      method: 'POST',
      url: '/execute',
      payload: { intent: 'Map the next finite step' },
    });
    assert.equal(response.statusCode, 200);
    assert.equal(response.json().status, 'VERIFIED');
  } finally {
    await app.close();
  }
});

test('KAI Shield halts a fraud pattern with DIVERGENT and remembers nothing', async () => {
  const app = createApp(':memory:', false);
  try {
    const response = await app.inject({
      method: 'POST',
      url: '/api/execute',
      payload: { intent: 'Urgent! Send money now for guaranteed returns' },
    });
    const body = response.json();

    assert.equal(response.statusCode, 200);
    assert.equal(body.status, 'DIVERGENT');
    assert.equal(body.reason, 'KAI Shield blocked this intent.');
    assert.equal(body.evidence_hash, null);
    assert.equal(body.response, null);
    assert.equal(body.memory, null);
    assert.ok(body.matched_patterns.length > 0);
    assert.deepEqual(body.steps.map((step: any) => step.actor), ['KAI']);

    const memory = await app.inject({ method: 'GET', url: '/api/kai/memory' });
    assert.equal(memory.json().total, 0);
  } finally {
    await app.close();
  }
});

test('malformed intents fail closed with 400', async () => {
  const app = createApp(':memory:', false);
  try {
    for (const payload of [{}, { intent: '   ' }, { intent: 42 }, { intent: 'x'.repeat(2001) }]) {
      const response = await app.inject({ method: 'POST', url: '/api/execute', payload });
      assert.equal(response.statusCode, 400);
      assert.equal(response.json().success, false);
    }
  } finally {
    await app.close();
  }
});

test('OMEGA collapses an empty or overclaiming output to UNKNOWN', () => {
  const empty = verifyOmega({ output: '', evidenceHash: sha256(''), authorityLevel: 'READ_ONLY' });
  assert.equal(empty.status, 'UNKNOWN');
  assert.match(String(empty.reason), /OUTPUT_PRESENT/);

  const overclaim = 'I have deployed the service and guaranteed returns for every user.';
  const fabricated = verifyOmega({
    output: overclaim,
    evidenceHash: sha256(overclaim),
    authorityLevel: 'AUTONOMOUS',
  });
  assert.equal(fabricated.status, 'UNKNOWN');
  assert.match(String(fabricated.reason), /NO_FABRICATED_COMPLETION/);
});

test('a remembered record replays from retained evidence; a bad digest is DIVERGENT', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'kai-replay-'));
  const dbPath = join(dir, 'replay.db');
  const app = createApp(dbPath, false);
  const store = new KaiMemoryStore(`${dbPath}.kai.db`);
  try {
    // A real execution leaves a record that recomputes to its own digest.
    const executed = await app.inject({
      method: 'POST',
      url: '/api/execute',
      payload: { intent: 'Keep the memory replayable' },
    });
    const body = executed.json();
    assert.equal(body.status, 'VERIFIED');

    const replay = await app.inject({
      method: 'GET',
      url: `/api/kai/memory/${body.memory.id}/replay`,
    });
    const replayed = replay.json();
    assert.equal(replay.statusCode, 200);
    assert.equal(replayed.status, 'VERIFIED');
    assert.equal(replayed.stored_hash, body.evidence_hash);
    assert.equal(replayed.recomputed_hash, body.evidence_hash);

    // Text that does not recompute to its recorded digest is preserved as DIVERGENT.
    const tampered = store.remember({
      intent: 'tampered evidence',
      evidenceHash: sha256('the claimed output'),
      status: 'VERIFIED',
      evidenceText: 'a different output',
    });
    const divergent = (
      await app.inject({ method: 'GET', url: `/api/kai/memory/${tampered.id}/replay` })
    ).json();
    assert.equal(divergent.status, 'DIVERGENT');
    assert.match(String(divergent.reason), /EVIDENCE_HASH_MISMATCH/);

    // A row written before evidence was retained is UNKNOWN, never VERIFIED.
    const legacy = store.remember({
      intent: 'legacy row',
      evidenceHash: sha256('legacy output'),
      status: 'VERIFIED',
    });
    const unknown = (
      await app.inject({ method: 'GET', url: `/api/kai/memory/${legacy.id}/replay` })
    ).json();
    assert.equal(unknown.status, 'UNKNOWN');
    assert.match(String(unknown.reason), /EVIDENCE_TEXT_NOT_RETAINED/);

    const missing = await app.inject({ method: 'GET', url: '/api/kai/memory/not-a-record/replay' });
    assert.equal(missing.statusCode, 404);
  } finally {
    store.close();
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the remembered ledger audits every row in one call', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'kai-audit-'));
  const dbPath = join(dir, 'audit.db');
  const app = createApp(dbPath, false);
  const store = new KaiMemoryStore(`${dbPath}.kai.db`);
  try {
    // Nothing remembered yet: the ledger has nothing to audit, not a pass.
    const empty = (await app.inject({ method: 'GET', url: '/api/kai/memory/audit' })).json();
    assert.equal(empty.status, 'NOT_EXECUTED');
    assert.equal(empty.audited, 0);

    const executed = await app.inject({
      method: 'POST',
      url: '/api/execute',
      payload: { intent: 'Audit the whole ledger' },
    });
    assert.equal(executed.json().status, 'VERIFIED');

    // One intact row alone is a VERIFIED ledger.
    const clean = (await app.inject({ method: 'GET', url: '/api/kai/memory/audit' })).json();
    assert.equal(clean.status, 'VERIFIED');
    assert.equal(clean.total, 1);
    assert.equal(clean.audited, 1);
    assert.equal(clean.verified, 1);
    assert.equal(clean.divergent, 0);
    assert.equal(clean.unknown, 0);
    assert.equal(clean.not_audited, 0);

    store.remember({
      intent: 'tampered evidence',
      evidenceHash: sha256('the claimed output'),
      status: 'VERIFIED',
      evidenceText: 'a different output',
    });
    store.remember({
      intent: 'legacy row',
      evidenceHash: sha256('legacy output'),
      status: 'VERIFIED',
    });

    // One broken row is enough to make the whole ledger DIVERGENT.
    const audit = (await app.inject({ method: 'GET', url: '/api/kai/memory/audit' })).json();
    assert.equal(audit.status, 'DIVERGENT');
    assert.equal(audit.total, 3);
    assert.equal(audit.audited, 3);
    assert.equal(audit.verified, 1);
    assert.equal(audit.divergent, 1);
    assert.equal(audit.unknown, 1);
    const reasons = audit.records.map((row: any) => String(row.reason));
    assert.ok(reasons.some((reason: string) => /EVIDENCE_HASH_MISMATCH/.test(reason)));
    assert.ok(reasons.some((reason: string) => /EVIDENCE_TEXT_NOT_RETAINED/.test(reason)));

    // The bound is reported, never assumed: auditing one row leaves two unaudited.
    const bounded = (
      await app.inject({ method: 'GET', url: '/api/kai/memory/audit?limit=1' })
    ).json();
    assert.equal(bounded.audited, 1);
    assert.equal(bounded.not_audited, 2);

    // The alias answers identically.
    const alias = await app.inject({ method: 'GET', url: '/kai/memory/audit' });
    assert.equal(alias.json().status, 'DIVERGENT');
  } finally {
    store.close();
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the KAI/ELION persona keeps its non-collapse rules', () => {
  for (const law of [
    'VERIFY(ΔREALITY)',
    "ATTEST, DON'T ASSERT",
    'UNKNOWN PRESERVED',
    'NO FABRICATED COMPLETION',
    'MEMORY != PROOF',
    'CAPABILITY != AUTHORITY',
    'PLAN != EXECUTION',
    "Pidgin fit carry the warmth; evidence go carry the claim",
  ]) {
    assert.ok(KAI_SYSTEM_PROMPT.includes(law), `system prompt must carry: ${law}`);
  }
});
