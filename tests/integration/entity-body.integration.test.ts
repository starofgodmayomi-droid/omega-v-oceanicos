import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createApp } from '../../apps/api/dist/index.js';
import {
  ENTITY_BRAND_CHECKSUM,
  ENTITY_LAW,
  ENTITY_ORGANS,
  ENTITY_SOUL_PATH,
  entityRootDir,
  observeEntityBody,
} from '../../apps/api/src/entity-body.ts';

/*
 * The anatomy is observed, not narrated: every organ points at a real path, a
 * file that is absent reads MISSING, and the body is INCOMPLETE while any organ
 * is missing. The Memory organ is the ledger file, which exists only once the
 * KaiMemory store has opened it.
 */
const LEDGER_ORGAN = 'Memory';
const CODE_ORGANS = ENTITY_ORGANS.filter((organ) => organ.organ !== LEDGER_ORGAN);

test('reads the six source organs from disk and reports the ledger honestly', () => {
  const body = observeEntityBody();
  const root = entityRootDir();

  assert.equal(body.organs.length, 7);
  assert.deepEqual(
    body.organs.map((organ) => organ.layer),
    [1, 2, 3, 4, 5, 6, 7]
  );
  assert.equal(body.brandChecksum, ENTITY_BRAND_CHECKSUM);
  assert.equal(body.law, ENTITY_LAW);
  assert.match(body.bodyDigest, /^[0-9a-f]{64}$/);

  for (const organ of CODE_ORGANS) {
    const observed = body.organs.find((entry) => entry.layer === organ.layer);
    assert.ok(observed, `layer ${organ.layer} must be reported`);
    assert.equal(observed.status, 'PRESENT', `${organ.organ} must exist in the checkout`);
    assert.match(observed.digest ?? '', /^[0-9a-f]{64}$/);
    assert.ok((observed.bytes ?? 0) > 0);
  }

  // The ledger file is created on boot, so a fresh checkout reports it MISSING
  // and the whole body INCOMPLETE. Either reading is honest; assuming it alive
  // would not be.
  const ledgerPresent =
    body.organs.find((organ) => organ.organ === LEDGER_ORGAN)?.status === 'PRESENT';
  assert.equal(body.status, ledgerPresent ? 'ALIVE' : 'INCOMPLETE');
  assert.deepEqual(body.missing, ledgerPresent ? [] : [LEDGER_ORGAN]);
  const soul = body.organs.find((organ) => organ.path === ENTITY_SOUL_PATH);
  assert.equal(soul?.status, 'PRESENT', 'the soul file anchors the body');
  assert.match(body.soul ?? '', /Pidgin fit carry the warmth/);
});

test('serves the observed anatomy over both API paths', async () => {
  const app = createApp(':memory:', false);
  try {
    const observed = observeEntityBody();
    for (const url of ['/v1/entity/body', '/api/v1/entity/body']) {
      const response = await app.inject({ method: 'GET', url });
      const payload = response.json();

      assert.equal(response.statusCode, 200, `${url} must answer 200`);
      assert.equal(payload.success, true);
      assert.equal(payload.body.brandChecksum, ENTITY_BRAND_CHECKSUM);
      assert.equal(payload.body.law, ENTITY_LAW);
      assert.deepEqual(
        payload.body.organs.map((organ: { organ: string }) => organ.organ),
        ENTITY_ORGANS.map((organ) => organ.organ)
      );
      assert.equal(payload.body.status, observed.status);
      assert.deepEqual(payload.body.missing, observed.missing);
    }
  } finally {
    await app.close();
  }
});

test('a missing organ reads MISSING instead of being assumed alive', () => {
  const root = mkdtempSync(join(tmpdir(), 'entity-body-'));
  try {
    mkdirSync(join(root, '00_SOUL'), { recursive: true });
    writeFileSync(join(root, ENTITY_SOUL_PATH), 'the root intent\n', 'utf8');

    const body = observeEntityBody(root);

    assert.equal(body.status, 'INCOMPLETE');
    assert.equal(body.soul, 'the root intent\n');
    assert.equal(body.organs.find((organ) => organ.organ === 'Soul')?.status, 'PRESENT');
    assert.deepEqual(
      body.missing,
      ENTITY_ORGANS.filter((organ) => organ.organ !== 'Soul').map((organ) => organ.organ)
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('an absent root reports every organ MISSING and no soul', () => {
  const body = observeEntityBody(join(tmpdir(), 'entity-body-absent-root'));

  assert.equal(body.status, 'INCOMPLETE');
  assert.equal(body.soul, null);
  assert.deepEqual(
    body.missing,
    ENTITY_ORGANS.map((organ) => organ.organ)
  );
  assert.equal(
    body.organs.every((organ) => organ.status === 'MISSING'),
    true
  );
});
