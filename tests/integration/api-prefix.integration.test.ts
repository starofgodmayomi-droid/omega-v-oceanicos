import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp, rewriteApiPrefix } from '../../apps/api/dist/index.js';

/*
 * The /api prefix started life as a Vite dev-server rewrite. A production
 * build has no dev server, so the shipped bundle called /api/* and nothing
 * answered: the routes worked on the development path and not the one that
 * ships. These assert the API strips the prefix itself.
 *
 * Migrated from apps/api/src/__tests__/api.prefix.test.ts (Jest, never run —
 * Jest is not installed in this workspace) onto node:test + app.inject. That
 * file's route list (/rules, /state, /events, /log, /memory, /complete-loop)
 * is not the surface this API serves any more, so the cases below use routes
 * that exist today; the prefix rule they check is the same.
 */

const READ_ROUTES = ['/health', '/v1/ecosystem/status', '/v1/mesh/nodes', '/v1/kernel/capabilities'];

test('read paths answer identically with and without the /api prefix', async () => {
  const app = createApp(':memory:', false);
  try {
    for (const path of READ_ROUTES) {
      const bare = await app.inject({ method: 'GET', url: path });
      const prefixed = await app.inject({ method: 'GET', url: `/api${path}` });

      assert.equal(bare.statusCode, 200, `${path}: not served without the prefix`);
      assert.equal(prefixed.statusCode, bare.statusCode, `${path}: status diverged under the prefix`);
      assert.deepEqual(
        Object.keys(prefixed.json()).sort(),
        Object.keys(bare.json()).sort(),
        `${path}: response shape diverged under the prefix`
      );
    }
  } finally {
    await app.close();
  }
});

test('accepts a POST through the prefix', async () => {
  const app = createApp(':memory:', false, { allowUnsignedCycle: true });
  try {
    const response = await app.inject({ method: 'POST', url: '/api/v1/cycle', payload: {} });
    assert.equal(response.statusCode, 200, response.body);
  } finally {
    await app.close();
  }
});

test('a bare /api resolves exactly like root, and an unknown prefixed path still 404s', async () => {
  const app = createApp(':memory:', false);
  try {
    const bare = await app.inject({ method: 'GET', url: '/' });
    const prefixed = await app.inject({ method: 'GET', url: '/api' });

    assert.equal(prefixed.statusCode, bare.statusCode, '/api must resolve like /');
    assert.equal(prefixed.body, bare.body, '/api must produce exactly the root response');

    const unknown = await app.inject({ method: 'GET', url: '/api/no-such-endpoint' });
    assert.equal(unknown.statusCode, 404);
    assert.equal(unknown.json().error, 'NOT_FOUND');
  } finally {
    await app.close();
  }
});

test('rewriteApiPrefix strips only a real /api segment', () => {
  assert.equal(rewriteApiPrefix('/api/health'), '/health');
  assert.equal(rewriteApiPrefix('/api'), '/');
  assert.equal(rewriteApiPrefix('/api?siliconYield=1'), '/?siliconYield=1');
  assert.equal(
    rewriteApiPrefix('/apiary'),
    '/apiary',
    'a path merely starting with "api" is not stripped'
  );
  assert.equal(rewriteApiPrefix('/apix/health'), '/apix/health');
  assert.equal(rewriteApiPrefix('/health'), '/health');
});
