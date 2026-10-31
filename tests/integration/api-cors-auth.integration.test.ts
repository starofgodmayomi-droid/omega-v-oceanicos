import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp, operatorIdentityAllowed, parseCorsOrigins } from '../../apps/api/dist/index.js';

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

  assert.equal(operatorIdentityAllowed(undefined, []), true);
  assert.equal(operatorIdentityAllowed('operator-a', [], true), false);
  assert.equal(operatorIdentityAllowed('operator-a', ['operator-a'], true), true);
  assert.equal(operatorIdentityAllowed('operator-b', ['operator-a'], true), false);

  process.env.OMEGA_ADMIN_OPERATOR_ALLOWLIST = 'trusted-operator';
  delete process.env.OMEGA_ADMIN_REQUIRE_ALLOWLIST;
  const adminHeaders = { authorization: 'Bearer admin-token' };
  const bodyOnlyRevocation = await app.inject({
    method: 'POST',
    url: '/attest/revoke',
    headers: adminHeaders,
    payload: {
      attestationId: 'att-allowlist-body-only',
      reason: 'body identity must not substitute',
      revokedBy: 'trusted-operator',
    },
  });
  assert.equal(bodyOnlyRevocation.statusCode, 403);
  assert.equal(bodyOnlyRevocation.json().error, 'ADMIN_OPERATOR_NOT_ALLOWED');

  const headerWinsRevocation = await app.inject({
    method: 'POST',
    url: '/attest/revoke',
    headers: { ...adminHeaders, 'x-omega-operator-id': 'trusted-operator' },
    payload: {
      attestationId: 'att-allowlist-header-wins',
      reason: 'the validated request identity is the audit actor',
      revokedBy: 'forged-body-operator',
    },
  });
  assert.equal(headerWinsRevocation.statusCode, 201);
  assert.equal(headerWinsRevocation.json().data.revokedBy, 'trusted-operator');

  for (const url of ['/persistence/acknowledge', '/persistence/reencrypt']) {
    const bodyOnlyOperator = await app.inject({
      method: 'POST',
      url,
      headers: adminHeaders,
      payload: { operatorId: 'trusted-operator', reason: 'body identity must not substitute' },
    });
    assert.equal(bodyOnlyOperator.statusCode, 403);
    assert.equal(bodyOnlyOperator.json().error, 'ADMIN_OPERATOR_NOT_ALLOWED');
  }

  delete process.env.OMEGA_ADMIN_OPERATOR_ALLOWLIST;
  process.env.OMEGA_ADMIN_REQUIRE_ALLOWLIST = 'on';
  const requiredWithoutList = await app.inject({
    method: 'POST',
    url: '/attest/revoke',
    headers: { ...adminHeaders, 'x-omega-operator-id': 'trusted-operator' },
    payload: { attestationId: 'att-strict-no-list', reason: 'missing configured allowlist' },
  });
  assert.equal(requiredWithoutList.statusCode, 403);
  assert.equal(requiredWithoutList.json().error, 'ADMIN_OPERATOR_NOT_ALLOWED');

  process.env.OMEGA_ADMIN_OPERATOR_ALLOWLIST = 'trusted-operator';
  const listedHeader = await app.inject({
    method: 'POST',
    url: '/persistence/reencrypt',
    headers: { ...adminHeaders, 'x-omega-operator-id': 'trusted-operator' },
    payload: { reason: 'authorized identity reaches readiness gate' },
  });
  assert.equal(listedHeader.statusCode, 409);
  assert.equal(listedHeader.json().error, 'PERSISTENCE_REENCRYPTION_NOT_READY');
});

test('required mode keeps the job ledger credential separate from the admin bearer', async (t) => {
  const originalEnvironment = { ...process.env };
  t.after(() => {
    process.env = originalEnvironment;
  });

  process.env.NODE_ENV = 'production';
  process.env.OMEGA_AUTH_MODE = 'required';
  process.env.OMEGA_READ_TOKEN = 'read-token';
  process.env.OMEGA_ADMIN_TOKEN = 'admin-token';
  process.env.OMEGA_PERSISTENCE = 'off';
  process.env.OMEGA_LOCAL_JOB_LEDGER = 'on';
  process.env.OMEGA_LOCAL_JOB_LEDGER_TOKEN = 'job-token';

  const app = createApp(':memory:', false);
  t.after(async () => {
    await app.close();
  });

  // The admin and read bearers are not the job credential, so the ledger does
  // not become a side door into job records for an otherwise privileged caller.
  for (const token of ['admin-token', 'read-token']) {
    const denied = await app.inject({
      method: 'GET',
      url: '/jobs',
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(denied.statusCode, 401);
    assert.equal(denied.json().error, 'JOB_ACCESS_REQUIRED');
  }

  // A job token is sufficient for the job routes in required mode. Before the
  // hook learned to step aside, the admin gate consumed the same header and
  // this request could never succeed.
  const created = await app.inject({
    method: 'POST',
    url: '/jobs',
    headers: {
      authorization: 'Bearer job-token',
      'x-omega-operator-id': 'operator-a',
    },
    payload: {
      kind: 'synthetic-observe',
      idempotencyKey: 'job-auth-1',
      actor: 'operator-a',
      sourceUri: 'local://job-auth',
    },
  });
  assert.equal(created.statusCode, 201);

  // The same job token grants nothing on the admin surface.
  const rejected = await app.inject({
    method: 'POST',
    url: '/attest/revoke',
    headers: { authorization: 'Bearer job-token' },
    payload: { attestationId: 'att-job-token', reason: 'job token is not admin authority' },
  });
  assert.equal(rejected.statusCode, 401);
  assert.equal(rejected.json().error, 'ADMIN_ACCESS_REQUIRED');
});
