import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
import { createApp } from '../../apps/api/dist/index.js';

const require = createRequire(import.meta.url);
const {
  compressSingleBody,
  expandSingleBody,
  verifySingleBodyRoundTrip,
  SINGLE_BODY_CAPACITY,
} = require('../../packages/mini/dist/index.js');

const bodyEntry = (overrides: Record<string, unknown> = {}) => ({
  id: 'sensory',
  name: 'Sensory runtime',
  source: 'observer-runtime',
  status: 'OBSERVED',
  layer: 'reality',
  organ: 'sense',
  form: 'runtime',
  evidence: 'SUPPORTED',
  ...overrides,
});

test('One Body ecosystem status binds full-stack organs to bounded evidence', async () => {
  const app = createApp(':memory:', false);
  try {
    await app.ready();
    const response = await app.inject({ method: 'GET', url: '/v1/ecosystem/status' });
    assert.equal(response.statusCode, 200);
    const body = response.json();
    assert.equal(body.oneBody.name, 'Ω∞v Oceanicos');
    assert.equal(body.oneBody.invariant, 'VERIFY(ΔREALITY)');
    assert.equal(body.oneBody.stage, 'FULL STACK → ECOSYSTEM');
    assert.equal(body.oneBody.evidenceStatus, 'SUPPORTED');
    assert.equal(body.oneBody.evidence, 'runtime-observed');
    assert.ok(body.oneBody.organs.some((organ: { name: string }) => organ.name === 'Reality Observation'));
    assert.ok(body.oneBody.organs.some((organ: { name: string }) => organ.name === 'API & Web Interface'));
    assert.ok(body.oneBody.organs.some((organ: { name: string }) => organ.name === 'External Connectors'));
    assert.ok(body.oneBody.limitations.some((item: string) => item.includes('not live GitHub')));
  } finally {
    await app.close();
  }
});

test('Single body compresses into a 4×4×4×4 space and expands losslessly', async () => {
  const app = createApp(':memory:', false, { allowUnsignedCycle: true });
  try {
    await app.ready();
    const response = await app.inject({ method: 'GET', url: '/v1/ecosystem/body' });
    assert.equal(response.statusCode, 200);
    const compression = response.json().compression;

    assert.equal(compression.space.notation, '4×4×4×4');
    assert.equal(compression.space.rank, 4);
    assert.deepEqual(compression.space.shape, [4, 4, 4, 4]);
    assert.equal(compression.space.capacity, 256);
    assert.equal(compression.count, 7);
    assert.equal(compression.filled, 7);
    assert.equal(compression.empty, 249);
    assert.match(compression.digest, /^[a-f0-9]{64}$/);
    assert.equal(compression.expansion.status, 'VERIFIED');
    assert.equal(compression.expansion.lossless, true);

    const expanded = await app.inject({
      method: 'POST',
      url: '/v1/ecosystem/body/expand',
      payload: { compression },
    });
    assert.equal(expanded.statusCode, 200);
    const expansion = expanded.json();
    assert.equal(expansion.status, 'EXPANDED');
    assert.equal(expansion.digest, compression.digest);
    assert.equal(expansion.digestMatches, true);
    assert.deepEqual(
      expansion.entries.map((entry: { id: string }) => entry.id),
      ['sensory', 'verification', 'memory', 'mesh', 'kernel', 'governance', 'interface'],
    );
    assert.equal(expansion.entries[0].layer, 'reality');
    assert.equal(expansion.entries[5].form, 'boundary');
  } finally {
    await app.close();
  }
});

test('Single body expansion refuses a compressed body whose digest was tampered with', async () => {
  const app = createApp(':memory:', false, { allowUnsignedCycle: true });
  try {
    await app.ready();
    const response = await app.inject({ method: 'GET', url: '/v1/ecosystem/body' });
    const compression = response.json().compression;

    const expanded = await app.inject({
      method: 'POST',
      url: '/v1/ecosystem/body/expand',
      payload: { compression: { ...compression, digest: '0'.repeat(64) } },
    });
    assert.equal(expanded.statusCode, 400);
    const body = expanded.json();
    assert.equal(body.status, 'INVALID');
    assert.equal(body.issues[0].code, 'DIGEST_MISMATCH');
  } finally {
    await app.close();
  }
});

test('Single body holds several records in one cell and restores their order', () => {
  const entries = [
    bodyEntry({ id: 'first', name: 'First' }),
    bodyEntry({ id: 'second', name: 'Second' }),
    bodyEntry({ id: 'third', name: 'Third', status: 'READY' }),
  ];

  const compression = compressSingleBody(entries);
  assert.equal(compression.status, 'COMPRESSED');
  assert.equal(compression.body.filled, 1);
  assert.deepEqual(
    compression.body.cells[0].entries.map((entry: { id: string }) => entry.id),
    ['first', 'second', 'third'],
  );

  const expansion = expandSingleBody(compression.body);
  assert.equal(expansion.status, 'EXPANDED');
  assert.deepEqual(expansion.entries, entries);
  assert.equal(verifySingleBodyRoundTrip(entries).status, 'VERIFIED');
});

test('Single body refuses overflow, unknown coordinates, duplicate ids, and tampered cells', () => {
  const overflow = Array.from({ length: SINGLE_BODY_CAPACITY + 1 }, (_value, index) =>
    bodyEntry({ id: `entry-${index}` }),
  );
  assert.equal(compressSingleBody(overflow).status, 'INVALID');
  assert.equal(compressSingleBody(overflow).issues[0].code, 'BODY_OVER_CAPACITY');

  const unknown = compressSingleBody([bodyEntry({ organ: 'imagine' })]);
  assert.equal(unknown.status, 'INVALID');
  assert.equal(unknown.issues[0].code, 'UNKNOWN_COORDINATE');

  const duplicate = compressSingleBody([bodyEntry(), bodyEntry()]);
  assert.equal(duplicate.status, 'INVALID');
  assert.equal(duplicate.issues[0].code, 'DUPLICATE_ENTRY_ID');

  const compression = compressSingleBody([bodyEntry()]);
  const tampered = JSON.parse(JSON.stringify(compression.body));
  tampered.cells[0].entries[0].status = 'VERIFIED';
  assert.equal(expandSingleBody(tampered).status, 'INVALID');
  assert.equal(expandSingleBody(tampered).issues[0].code, 'DIGEST_MISMATCH');
});
