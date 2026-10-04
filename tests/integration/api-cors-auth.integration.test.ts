import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp, parseCorsOrigins } from '../../apps/api/dist/index.js';

test('required authentication CORS boundary', async (t) => {
  const originalEnvironment = { ...process.env };
  t.after(() => {
    process.env = originalEnvironment;
  });

  assert.equal(parseCorsOrigins(undefined, 'local'), '*');
  assert.equal(parseCorsOrigins(undefined, 'required'), false);
  assert.deepEqual(parseCorsOrigins('https://dashboard.example, https://ops.example', 'required'), [
    'https://dashboard.example',
    'https://ops.example',
  ]);
  assert.throws(
    () => parseCorsOrigins('*', 'required'),
    /OMEGA_CORS_ORIGINS must use explicit origins/
  );
  assert.throws(
    () => parseCorsOrigins('dashboard.example', 'required'),
    /OMEGA_CORS_ORIGINS contains an invalid origin/
  );

  process.env.NODE_ENV = 'production';
  process.env.OMEGA_AUTH_MODE = 'required';
  process.env.OMEGA_READ_TOKEN = 'read-token';
  process.env.OMEGA_ADMIN_TOKEN = 'admin-token';
  process.env.OMEGA_CORS_ORIGINS = 'https://dashboard.example';
  process.env.OMEGA_PERSISTENCE = 'off';

  const app = createApp(':memory:', false);
  t.after(async () => {
    await app.close();
  });

  const preflight = await app.inject({
    method: 'OPTIONS',
    url: '/v1/ecosystem/status',
    headers: {
      origin: 'https://dashboard.example',
      'access-control-request-method': 'GET',
    },
  });
  assert.notEqual(preflight.statusCode, 401);
  assert.equal(preflight.headers['access-control-allow-origin'], 'https://dashboard.example');

  const unauthenticatedRead = await app.inject({
    method: 'GET',
    url: '/v1/ecosystem/status',
    headers: { origin: 'https://dashboard.example' },
  });
  assert.equal(unauthenticatedRead.statusCode, 401);
  assert.deepEqual(unauthenticatedRead.json(), {
    success: false,
    error: 'READ_ACCESS_REQUIRED',
  });
});
