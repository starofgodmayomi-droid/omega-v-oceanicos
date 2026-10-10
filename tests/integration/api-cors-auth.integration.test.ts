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
    url: '/v1/auth/browser-session',
    headers: {
      origin: 'https://dashboard.example',
      'access-control-request-method': 'POST',
      'access-control-request-headers': 'authorization',
    },
  });
  assert.notEqual(preflight.statusCode, 401);
  assert.equal(preflight.headers['access-control-allow-origin'], 'https://dashboard.example');
  assert.equal(preflight.headers['access-control-allow-credentials'], 'true');

  for (const url of ['/v1/ecosystem/status', '/v1/ecosystem/body']) {
    const unauthenticatedRead = await app.inject({
      method: 'GET',
      url,
      headers: { origin: 'https://dashboard.example' },
    });
    assert.equal(unauthenticatedRead.statusCode, 401, `${url} must deny anonymous reads`);
    assert.deepEqual(unauthenticatedRead.json(), {
      success: false,
      error: 'READ_ACCESS_REQUIRED',
    });

    const authenticatedRead = await app.inject({
      method: 'GET',
      url,
      headers: { origin: 'https://dashboard.example', authorization: 'Bearer read-token' },
    });
    assert.equal(authenticatedRead.statusCode, 200, `${url} must admit the configured read bearer`);
    const body = authenticatedRead.json();
    const boundary = url.endsWith('/status') ? body.oneBody.evidenceBoundary : body.evidenceBoundary;
    assert.equal(boundary.externalRealityStatus, 'UNKNOWN');
  }

  const rejectedOriginExchange = await app.inject({
    method: 'POST',
    url: '/v1/auth/browser-session',
    headers: { origin: 'https://untrusted.example', authorization: 'Bearer read-token' },
  });
  assert.equal(rejectedOriginExchange.statusCode, 403);
  assert.equal(rejectedOriginExchange.json().error, 'BROWSER_SESSION_ORIGIN_NOT_ALLOWED');

  const exchange = await app.inject({
    method: 'POST',
    url: '/v1/auth/browser-session',
    headers: { origin: 'https://dashboard.example', authorization: 'Bearer read-token' },
  });
  assert.equal(exchange.statusCode, 201);
  assert.equal(exchange.json().expiresInSeconds, 900);
  const setCookieHeader = exchange.headers['set-cookie'];
  assert.equal(typeof setCookieHeader, 'string');
  assert.match(String(setCookieHeader), /^__Host-omega-read-session=[A-Za-z0-9_-]+;/);
  assert.match(String(setCookieHeader), /HttpOnly; Secure; SameSite=None/);
  assert.doesNotMatch(String(setCookieHeader), /read-token|admin-token/);
  const browserCookie = String(setCookieHeader).split(';', 1)[0];

  const sessionRead = await app.inject({
    method: 'GET',
    url: '/v1/ecosystem/body',
    headers: { origin: 'https://dashboard.example', cookie: browserCookie },
  });
  assert.equal(sessionRead.statusCode, 200);
  assert.equal(sessionRead.json().evidenceBoundary.externalRealityStatus, 'UNKNOWN');

  const sessionCannotReadOtherRoutes = await app.inject({
    method: 'GET',
    url: '/v1/block/tip',
    headers: { origin: 'https://dashboard.example', cookie: browserCookie },
  });
  assert.equal(sessionCannotReadOtherRoutes.statusCode, 401);
  assert.equal(sessionCannotReadOtherRoutes.json().error, 'READ_ACCESS_REQUIRED');

  const sessionCannotMutate = await app.inject({
    method: 'POST',
    url: '/persistence/acknowledge',
    headers: { origin: 'https://dashboard.example', cookie: browserCookie },
    payload: { reason: 'read session must not authorize writes' },
  });
  assert.equal(sessionCannotMutate.statusCode, 401);
  assert.equal(sessionCannotMutate.json().error, 'ADMIN_ACCESS_REQUIRED');

  const logout = await app.inject({
    method: 'POST',
    url: '/v1/auth/browser-session/logout',
    headers: { origin: 'https://dashboard.example', cookie: browserCookie },
  });
  assert.equal(logout.statusCode, 204);
  assert.match(String(logout.headers['set-cookie']), /Max-Age=0/);

  const revokedSessionRead = await app.inject({
    method: 'GET',
    url: '/v1/ecosystem/status',
    headers: { origin: 'https://dashboard.example', cookie: browserCookie },
  });
  assert.equal(revokedSessionRead.statusCode, 401);

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
