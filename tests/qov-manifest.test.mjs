import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const manifestPath = new URL('../shared/manifest.json', import.meta.url);
const crosswalkPath = new URL('../docs/QOV-CROSSWALK.md', import.meta.url);

test('Qov manifest preserves a bounded provenance-first identity', async () => {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));

  assert.equal(manifest.identity.name, 'Qov');
  assert.match(manifest.identity.description, /observes, verifies, attests, and evolves/);
  assert.equal(manifest.identity.authority, 'human-gated');
  assert.equal(manifest.identity.bounds.external_writes, 'disabled by default');
  assert.equal(manifest.identity.bounds.provenance, 'preserved from observation through attestation');
  assert.deepEqual(
    manifest.crosswalk.map((entry) => entry.concept),
    ['observe', 'verify', 'remember', 'attest', 'evolve', 'qov-boundary'],
  );
  assert.equal(manifest.crosswalk.find((entry) => entry.concept === 'evolve').status, 'bounded-proposal');
});

test('Qov crosswalk keeps attestation distinct from authorization', async () => {
  const crosswalk = await readFile(crosswalkPath, 'utf8');

  assert.match(crosswalk, /An attestation records integrity and origin/);
  assert.match(crosswalk, /it does not, by itself, prove/);
  assert.match(crosswalk, /external connectors are read-only/);
  assert.match(crosswalk, /human authorization/);
});
