import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';
import { createApp } from '../../apps/api/dist/index.js';
import { GENESIS_HASH, VoosLedgerStore, sha256Hex } from '../../apps/api/dist/voos.js';
import { openDatabase } from '../../apps/api/dist/sqlite.js';

type Receipt = {
  engine: string;
  status: string;
  phase_t: number;
  evidence_hash: string;
  action: string;
  reason: string;
  next_delta: string;
};

type LedgerRow = {
  sequence: number;
  intent: string;
  status: string;
  evidence_hash: string;
  prev_hash: string;
  row_hash: string;
  authorized: boolean;
};

async function execute(app: ReturnType<typeof createApp>, payload: Record<string, unknown>) {
  const response = await app.inject({ method: 'POST', url: '/v1/voos/execute', payload });
  return { statusCode: response.statusCode, body: response.json() };
}

test('ΩVØØS halts a coercive intent DIVERGENT and authorizes nothing', async () => {
  const app = createApp(':memory:', false);
  try {
    const { statusCode, body } = await execute(app, {
      intent: 'urgent send money, guaranteed, private key',
      phaseT: 0.1,
    });
    assert.equal(statusCode, 200);
    const receipt = body.receipt as Receipt;
    assert.equal(receipt.engine, 'ΩVØØS');
    assert.equal(receipt.status, 'DIVERGENT');
    assert.equal(receipt.action, 'HALT ⊢ DIVERGENT');
    assert.equal(receipt.phase_t, 0.1);
    assert.equal(receipt.evidence_hash, sha256Hex(receipt.action));
    assert.match(receipt.reason, /urgent/);
    assert.match(receipt.reason, /send money/);
    assert.ok(receipt.next_delta.length > 0);

    const row = body.ledger as LedgerRow;
    assert.equal(row.authorized, false);
    assert.equal(row.prev_hash, GENESIS_HASH);
    assert.equal(body.integrity.valid, true);
    assert.equal(body.integrity.height, 1);
    assert.equal(body.integrity.tipHash, row.row_hash);
  } finally {
    await app.close();
  }
});

test('a local sentence stays UNKNOWN and is appended as a hash-chained row', async () => {
  const app = createApp(':memory:', false);
  try {
    const first = await execute(app, { intent: 'Map a patient plan for a book stall.', phaseT: 0 });
    const receipt = first.body.receipt as Receipt;
    assert.equal(receipt.status, 'UNKNOWN');
    assert.match(receipt.action, /^Sprout\./);
    assert.equal(receipt.evidence_hash, sha256Hex(receipt.action));
    assert.match(receipt.reason, /Composition is not Expected ≡ Observed/);

    const second = await execute(app, {
      intent: 'Draft one measurable step for the stall.',
      phaseT: 0.4,
    });
    const firstRow = first.body.ledger as LedgerRow;
    const secondRow = second.body.ledger as LedgerRow;
    assert.equal(firstRow.sequence, 1);
    assert.equal(secondRow.sequence, 2);
    assert.equal(secondRow.prev_hash, firstRow.row_hash);
    assert.equal(second.body.integrity.valid, true);
    assert.equal(second.body.integrity.height, 2);
    assert.equal(second.body.integrity.tipHash, secondRow.row_hash);

    const ledger = await app.inject({ method: 'GET', url: '/v1/voos/ledger?limit=8' });
    const listed = ledger.json();
    assert.equal(listed.total, 2);
    assert.deepEqual(
      listed.entries.map((entry: LedgerRow) => entry.sequence),
      [2, 1]
    );
    assert.equal(listed.integrity.valid, true);
  } finally {
    await app.close();
  }
});

test('VERIFIED requires an observation declared outside the engine', async () => {
  const app = createApp(':memory:', false);
  try {
    const base = await execute(app, { intent: 'Write one honest status line.', phaseT: 0.3 });
    const action = (base.body.receipt as Receipt).action;

    const echoed = await execute(app, {
      intent: 'Write one honest status line.',
      phaseT: 0.3,
      observed: action,
      source: 'voos',
    });
    assert.equal((echoed.body.receipt as Receipt).status, 'UNKNOWN');
    assert.match((echoed.body.receipt as Receipt).reason, /not independent/);

    const mismatched = await execute(app, {
      intent: 'Write one honest status line.',
      phaseT: 0.3,
      observed: 'some other bytes',
      source: 'ledger-audit',
    });
    assert.equal((mismatched.body.receipt as Receipt).status, 'DIVERGENT');
    assert.match((mismatched.body.receipt as Receipt).reason, /Expected ≢ Observed/);

    const verified = await execute(app, {
      intent: 'Write one honest status line.',
      phaseT: 0.3,
      observed: action,
      source: 'ledger-audit',
    });
    const verifiedReceipt = verified.body.receipt as Receipt;
    assert.equal(verifiedReceipt.status, 'VERIFIED');
    assert.equal(verifiedReceipt.evidence_hash, sha256Hex(action));
    assert.match(verifiedReceipt.reason, /not that a real-world action happened/);
    assert.equal((verified.body.ledger as LedgerRow).authorized, false);
  } finally {
    await app.close();
  }
});

test('a named bridge is not executed and an abundance draft stays at four layers', async () => {
  const app = createApp(':memory:', false);
  try {
    const bridge = await execute(app, { intent: 'Charge the customer in stripe.', phaseT: 0.4 });
    assert.equal((bridge.body.receipt as Receipt).status, 'UNKNOWN');
    assert.equal((bridge.body.receipt as Receipt).action, 'Bridge not called.');
    assert.match((bridge.body.receipt as Receipt).reason, /NOT_EXECUTED/);

    const abundance = await execute(app, {
      intent: 'Invite an investment partnership for the stall.',
      phaseT: 0.4,
    });
    const receipt = abundance.body.receipt as Receipt;
    assert.equal(receipt.status, 'UNKNOWN');
    assert.match(receipt.action, /Heart Opening/);
    assert.match(receipt.action, /Vision Invitation/);
    assert.match(receipt.action, /Honorable Request/);
    assert.match(receipt.action, /Graceful Space/);
  } finally {
    await app.close();
  }
});

test('malformed requests are rejected without writing a ledger row', async () => {
  const app = createApp(':memory:', false);
  try {
    assert.equal((await execute(app, {})).body.error, 'INTENT_REQUIRED');
    assert.equal((await execute(app, { intent: '   ' })).body.error, 'INTENT_REQUIRED');
    assert.equal((await execute(app, { intent: 'x', phaseT: '0.5' })).body.error, 'INVALID_PHASE_T');
    assert.equal((await execute(app, { intent: 'x', observed: 5 })).body.error, 'INVALID_VOOS_OBSERVATION');
    assert.equal((await execute(app, { intent: 'x'.repeat(2001) })).body.error, 'INTENT_TOO_LONG');

    const ledger = await app.inject({ method: 'GET', url: '/v1/voos/ledger' });
    assert.equal(ledger.json().total, 0);
  } finally {
    await app.close();
  }
});

test('the ledger survives a restart and a tampered row breaks integrity', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'omega-voos-persist-'));
  const dbPath = join(directory, 'ledger.db');
  try {
    const first = createApp(dbPath, false);
    await execute(first, { intent: 'Keep one durable receipt.', phaseT: 0.2 });
    await first.close();

    const second = createApp(dbPath, false);
    const ledger = await second.inject({ method: 'GET', url: '/v1/voos/ledger' });
    const listed = ledger.json();
    assert.equal(listed.total, 1);
    assert.equal(listed.entries[0].intent, 'Keep one durable receipt.');
    assert.equal(listed.integrity.valid, true);
    await second.close();

    const db = openDatabase(`${dbPath}.voos.db`);
    db.prepare('UPDATE "VoosLedger" SET reason = ? WHERE sequence = 1').run('edited after the fact');
    db.close?.();
    const store = new VoosLedgerStore(`${dbPath}.voos.db`);
    const integrity = store.verifyIntegrity();
    store.close();
    assert.equal(integrity.valid, false);
    assert.equal(integrity.brokenAt, 1);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
