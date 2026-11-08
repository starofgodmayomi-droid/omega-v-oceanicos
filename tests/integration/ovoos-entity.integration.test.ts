import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
import { createApp } from '../../apps/api/dist/index.js';

const require = createRequire(import.meta.url);
const {
  OVOOS_ENTITY_CONTRACT,
  OVOOS_ENTITY_NAME,
  OVOOS_REGION_ORDER,
  OVOOS_MANIFEST_VERSION,
  OVOOS_SECTION_ORDER,
  OVOOS_HIVE_SPECIES,
  compressOvoosEntity,
  expandOvoosEntity,
  summarizeOvoosEntity,
  summarizeOvoosManifest,
  verifyOvoosRoundTrip,
} = require('../../packages/mini/dist/index.js');

const record = (overrides: Record<string, unknown> = {}) => ({
  id: 'centre',
  name: 'Centre',
  region: 'center',
  role: 'declared role',
  source: 'test',
  status: 'READY',
  evidence: 'VERIFIED',
  ...overrides,
});

test('the entity contract compresses, expands, and refuses a tampered digest', () => {
  const records = [
    record({ id: 'a', region: 'center' }),
    record({ id: 'b', region: 'gate' }),
    record({ id: 'c', region: 'threads' }),
    record({ id: 'd', region: 'glober' }),
    record({ id: 'e', region: 'void' }),
  ];

  const compression = compressOvoosEntity(records);
  assert.equal(compression.status, 'COMPRESSED');
  assert.equal(compression.entity.contract, OVOOS_ENTITY_CONTRACT);
  assert.equal(compression.entity.entity, OVOOS_ENTITY_NAME);
  assert.deepEqual(
    compression.entity.regions.map((cell: any) => cell.region),
    [...OVOOS_REGION_ORDER],
  );

  const expansion = expandOvoosEntity(compression.entity);
  assert.equal(expansion.status, 'EXPANDED');
  assert.equal(expansion.digestMatches, true);
  assert.deepEqual(expansion.records, records);

  const tampered = expandOvoosEntity({ ...compression.entity, digest: '0'.repeat(64) });
  assert.equal(tampered.status, 'DIVERGENT');
  assert.equal(tampered.issues[0].code, 'DIGEST_MISMATCH');

  const roundTrip = verifyOvoosRoundTrip(records);
  assert.equal(roundTrip.status, 'VERIFIED');
  assert.equal(roundTrip.lossless, true);

  const unknownRegion = compressOvoosEntity([record({ region: 'abyss' })]);
  assert.equal(unknownRegion.status, 'INVALID');
  assert.equal(unknownRegion.issues[0].code, 'UNKNOWN_REGION');
});

test('an absent region keeps the entity UNKNOWN and names no upgrade', () => {
  const compression = compressOvoosEntity([
    record({ id: 'a', region: 'center' }),
    record({ id: 'b', region: 'gate' }),
  ]);
  assert.equal(compression.status, 'COMPRESSED');
  const summary = summarizeOvoosEntity({
    compression: compression.entity,
    expansion: expandOvoosEntity(compression.entity),
  });
  assert.equal(summary.status, 'UNKNOWN');
  assert.equal(summary.upgrade.execution, 'NOT_EXECUTED');
  assert.equal(summary.upgrade.candidate, null);
  assert.equal(summary.nextDelta, 'AWAITING EVIDENCE');
});

test('GET /v1/entity/ovoos compresses the runtime into five observed regions', async () => {
  const app = createApp(':memory:', false);
  try {
    const response = await app.inject({ method: 'GET', url: '/v1/entity/ovoos' });
    const body = response.json();

    assert.equal(response.statusCode, 200);
    assert.equal(body.success, true);
    assert.equal(body.contract, OVOOS_ENTITY_CONTRACT);
    assert.equal(body.entity, OVOOS_ENTITY_NAME);
    assert.equal(body.nodeTopology, 'STAR');
    assert.equal(body.status, 'VERIFIED');
    assert.equal(body.gameDetected, false);
    assert.equal(body.gate, 'OMEGA_RINGS_ACTIVE');
    assert.equal(body.connections, 'KAI_THREADS_SECURED');
    assert.equal(body.phaseT, 'BLOOM (0.5)');
    assert.equal(body.nextDelta, 'AWAITING INTENT');
    assert.equal(body.ledgerMutation, false);
    assert.match(body.evidenceHash, /^[0-9a-f]{64}$/);
    assert.deepEqual(body.regions.map((region: any) => region.region), [...OVOOS_REGION_ORDER]);
    assert.ok(body.regions.every((region: any) => region.records.length > 0));
    assert.equal(body.expansion.status, 'EXPANDED');
    assert.equal(body.expansion.digestMatches, true);
    assert.equal(body.roundTrip.status, 'VERIFIED');
    assert.deepEqual(body.upgrade, {
      execution: 'NOT_EXECUTED',
      candidate: {
        action: 'review-verified-entity',
        contract: OVOOS_ENTITY_CONTRACT,
        digest: body.evidenceHash,
      },
    });
    assert.match(body.evidenceBoundary, /Compression is not permission/);
  } finally {
    await app.close();
  }
});

test('the system manifest binds every organ to one observation and never measures its declared numbers', () => {
  const threads = [
    { id: 'kai-shield', evidence: 'SUPPORTED', status: 'BOUNDED' },
    { id: 'authority-gate', evidence: 'SUPPORTED', status: 'HUMAN_GATE_REQUIRED' },
    { id: 'mesh-convergence', evidence: 'VERIFIED', status: 'CONVERGED' },
    { id: 'public-interface', evidence: 'SUPPORTED', status: 'READY' },
  ];
  const sound = summarizeOvoosManifest({
    verificationStatus: 'VERIFIED',
    ledgerIntact: true,
    quorumReached: true,
    meshStatus: 'CONVERGED',
    remoteMutation: false,
    evidenceHash: 'a'.repeat(64),
    tethers: threads,
  });

  assert.equal(sound.version, OVOOS_MANIFEST_VERSION);
  assert.equal(sound.species, 'OCEANICOS');
  assert.equal(sound.habitat, 'ALL_OCEAN_ZONES');
  assert.deepEqual(sound.sections.map((section: any) => section.section), [...OVOOS_SECTION_ORDER]);
  assert.equal(sound.organs.length, 11);
  assert.equal(sound.sections.flatMap((section: any) => section.organs).length, 11);
  assert.deepEqual(sound.distributedNetwork.map((tier: any) => tier.id), ['apex-predators', 'cetaceans', 'pelagics-invertebrates']);
  assert.equal(sound.distributedNetwork[0].evidence, 'SUPPORTED');
  assert.deepEqual(sound.hydrodynamicEfficiency, { value: '98.7%', measured: false });
  assert.deepEqual(sound.neuralSynchronyTarget, { value: '100%', measured: false });
  assert.equal(sound.status, 'SUPPORTED');
  assert.match(sound.evidenceBoundary, /declared labels, not measurements/);

  // Hive-mind: each tier is expanded into live per-species telemetry records.
  assert.deepEqual(
    sound.hiveMind.species.map((entry: any) => entry.id),
    OVOOS_HIVE_SPECIES.map((entry: any) => entry.id),
  );
  assert.deepEqual(
    sound.hiveMind.tiers.map((tier: any) => tier.species),
    [['sharks', 'marlins'], ['whales', 'dolphins'], ['jellyfish', 'rays', 'baitballs']],
  );
  assert.ok(sound.hiveMind.species.every((entry: any) => (
    entry.bindsTo === sound.hiveMind.tiers.find((tier: any) => tier.id === entry.tier).bindsTo
  )));
  const shark = sound.hiveMind.species.find((entry: any) => entry.id === 'sharks');
  assert.equal(shark.observed, 'BOUNDED');
  assert.equal(shark.signals, 1);
  assert.equal(shark.evidence, 'SUPPORTED');
  assert.match(shark.recordDigest, /^[0-9a-f]{64}$/);
  assert.equal(sound.hiveMind.observedSpecies, 7);
  assert.equal(sound.hiveMind.status, 'SUPPORTED');

  const divergent = summarizeOvoosManifest({
    verificationStatus: 'DIVERGENT',
    ledgerIntact: false,
    quorumReached: false,
    meshStatus: 'DIVERGING',
    remoteMutation: true,
    evidenceHash: null,
    tethers: [],
  });
  assert.equal(divergent.status, 'UNKNOWN');
  assert.equal(divergent.distributedNetwork[0].evidence, 'UNKNOWN');
  assert.equal(divergent.organs.find((organ: any) => organ.id === 'bio-regeneration-core').evidence, 'UNVERIFIED');
  assert.equal(divergent.hiveMind.status, 'UNKNOWN');
  assert.equal(divergent.hiveMind.observedSpecies, 0);
  assert.ok(divergent.hiveMind.species.every((entry: any) => (
    entry.observed === 'NO_SIGNAL' && entry.signals === 0 && entry.evidence === 'UNKNOWN'
  )));
  assert.ok(divergent.hiveMind.species.every((entry: any) => /^[0-9a-f]{64}$/.test(entry.recordDigest)));
});

test('GET /v1/entity/ovoos carries the system manifest bound to this runtime', async () => {
  const app = createApp(':memory:', false);
  try {
    const response = await app.inject({ method: 'GET', url: '/v1/entity/ovoos' });
    const body = response.json();

    assert.equal(response.statusCode, 200);
    assert.equal(body.manifest.version, OVOOS_MANIFEST_VERSION);
    assert.equal(body.manifest.species, 'OCEANICOS');
    assert.equal(body.manifest.sections.length, 4);
    assert.equal(body.manifest.organs.length, 11);
    assert.equal(body.manifest.distributedNetwork.length, 3);
    assert.ok(body.manifest.organs.every((organ: any) => typeof organ.bindsTo === 'string' && organ.bindsTo.length > 0));
    assert.ok(body.manifest.organs.every((organ: any) => typeof organ.declared === 'string' && organ.declared.length > 0));
    assert.deepEqual(body.manifest.hydrodynamicEfficiency, { value: '98.7%', measured: false });
    assert.deepEqual(body.manifest.neuralSynchronyTarget, { value: '100%', measured: false });
    assert.equal(body.manifest.status, 'SUPPORTED');
    assert.ok(body.manifest.distributedNetwork.every((tier: any) => tier.evidence !== 'UNKNOWN'));

    // The hive-mind is live: seven species records, each bound to its tier's surface.
    assert.equal(body.manifest.hiveMind.tiers.length, 3);
    assert.equal(body.manifest.hiveMind.species.length, 7);
    assert.equal(body.manifest.hiveMind.observedSpecies, 7);
    assert.ok(body.manifest.hiveMind.species.every((entry: any) => (
      entry.bindsTo === body.manifest.hiveMind.tiers.find((tier: any) => tier.id === entry.tier).bindsTo
      && entry.signals === 1
      && typeof entry.observed === 'string' && entry.observed.length > 0
      && entry.observed !== 'NO_SIGNAL'
      && /^[0-9a-f]{64}$/.test(entry.recordDigest)
    )));
    assert.notEqual(body.manifest.hiveMind.status, 'UNKNOWN');
    assert.equal(body.ledgerMutation, false);
  } finally {
    await app.close();
  }
});

test('POST /v1/entity/ovoos/expand restores the records and refuses a tampered digest', async () => {
  const app = createApp(':memory:', false);
  try {
    const read = await app.inject({ method: 'GET', url: '/v1/entity/ovoos' });
    const body = read.json();

    const expanded = await app.inject({
      method: 'POST',
      url: '/v1/entity/ovoos/expand',
      payload: { compression: body.compression },
    });
    const expandedBody = expanded.json();
    assert.equal(expanded.statusCode, 200);
    assert.equal(expandedBody.status, 'EXPANDED');
    assert.equal(expandedBody.digestMatches, true);
    assert.equal(expandedBody.records.length, body.compression.count);

    const tampered = await app.inject({
      method: 'POST',
      url: '/v1/entity/ovoos/expand',
      payload: { compression: { ...body.compression, digest: '0'.repeat(64) } },
    });
    const tamperedBody = tampered.json();
    assert.equal(tampered.statusCode, 400);
    assert.equal(tamperedBody.success, false);
    assert.equal(tamperedBody.status, 'DIVERGENT');
    assert.equal(tamperedBody.issues[0].code, 'DIGEST_MISMATCH');
  } finally {
    await app.close();
  }
});
