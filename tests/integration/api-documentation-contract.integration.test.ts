import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { API_ROUTE_INVENTORY } from '../../apps/api/src/route-contract.ts';

/*
 * Documentation drift is a correctness problem, not a cosmetic one.
 *
 * `GET /log` once shipped without ever reaching this README, and the documented
 * attestation example published a signing key that had been removed for being
 * forgeable. Both were found by reading, which does not scale and does not run
 * in CI. This asserts the README describes the routes the API actually serves,
 * using `src/route-contract.ts` as the single source of truth.
 *
 * Migrated from apps/api/src/__tests__/documentation.test.ts (Jest, never run
 * in this workspace). The startup-banner half of that file was dropped: the
 * banner it asserted on ("Available endpoints:") no longer exists in
 * `src/index.ts`, so the assertion had no subject. See docs/TEST-MIGRATION.md.
 */

const root = process.cwd();
const readme = readFileSync(join(root, 'apps/api/README.md'), 'utf8');

test('finds the inventory it is meant to check', () => {
  assert.ok(API_ROUTE_INVENTORY.length > 10, 'the inventory must not be empty');
  assert.ok(
    API_ROUTE_INVENTORY.includes('GET /health'),
    'the inventory must contain the health route'
  );
});

test('the README documents every inventoried route path', () => {
  const paths = API_ROUTE_INVENTORY.map((contract) => contract.slice(contract.indexOf(' ') + 1));
  const undocumented = paths.filter((path) => !readme.includes(path));
  assert.deepEqual(undocumented, [], `README is missing: ${undocumented.join(', ')}`);
});

test('documents the environment variables the API depends on', () => {
  for (const variable of [
    'OMEGA_SIGNING_KEY',
    'OMEGA_RUNTIME_STORE_PATH',
    'OMEGA_EVENT_LOG_PATH',
    'OMEGA_PERSISTENCE',
  ]) {
    assert.ok(readme.includes(variable), `README does not document ${variable}`);
  }
});

test('does not advertise a signing key value', () => {
  assert.ok(!readme.includes('key-2026-08-production-v1'), 'a removed signing key is advertised');
  assert.ok(
    !/"signingkey":\s*"(?!sha256:)/i.test(readme),
    'the README publishes a raw signing key value'
  );
});
