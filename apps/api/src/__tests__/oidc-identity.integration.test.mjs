import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import { createApp } from '../../dist/index.js';
import {
  createOidcIdentityVerifier,
  oidcIdentityConfigFromEnvironment,
} from '../../dist/oidc-identity.js';

const connector = {
  id: 'github.read-repository',
  version: '1.0.0',
  system: 'github',
  capability: 'read repository metadata',
  authRef: 'secret-ref:github-readonly',
  scope: ['repo:starofgodmayomi-droid/omega-v-oceanicos'],
  mode: 'read-only',
  policyRefs: ['policy:connector-read.v1'],
  stopCondition: 'stop after one bounded repository read',
  expectedObservation: 'github:starofgodmayomi-droid/omega-v-oceanicos:metadata',
  timeoutMs: 5000,
  maxAttempts: 1,
  rollbackSupported: false,
};

test('OIDC identity is verified but does not grant connector admission', async () => {
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const jwk = { ...(await exportJWK(publicKey)), kid: 'test-key', alg: 'RS256', use: 'sig' };
  const server = createServer((request, response) => {
    if (request.url !== '/jwks') {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ keys: [jwk] }));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const issuer = `http://127.0.0.1:${address.port}`;
  const audience = 'omega-api';
  const jwksUri = `${issuer}/jwks`;
  const signToken = ({
    tokenIssuer = issuer,
    tokenAudience = audience,
    expiresAt = '5m',
    authorizedParty,
  } = {}) => {
    let token = new SignJWT(authorizedParty ? { azp: authorizedParty } : {})
      .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
      .setIssuer(tokenIssuer)
      .setSubject('operator-123')
      .setAudience(tokenAudience)
      .setIssuedAt();
    if (expiresAt !== null) token = token.setExpirationTime(expiresAt);
    return token.sign(privateKey);
  };

  let fetchCalls = 0;
  let resolverCalls = 0;
  let seenIdentity;
  const originalAuthEnv = {
    OMEGA_AUTH_MODE: process.env.OMEGA_AUTH_MODE,
    OMEGA_READ_TOKEN: process.env.OMEGA_READ_TOKEN,
    OMEGA_ADMIN_TOKEN: process.env.OMEGA_ADMIN_TOKEN,
  };
  process.env.OMEGA_AUTH_MODE = 'required';
  process.env.OMEGA_READ_TOKEN = 'test-read-token';
  process.env.OMEGA_ADMIN_TOKEN = 'test-admin-token';
  const app = createApp(':memory:', false, {
    oidcIdentity: { issuer, audience, jwksUri },
    connectorAdmissionEvidence: (request) => {
      resolverCalls += 1;
      seenIdentity = request.omegaIdentity;
      return { authorityVerified: false, policySatisfied: false, approvalVerified: false };
    },
    githubFetch: async () => {
      fetchCalls += 1;
      return new Response('{}', { status: 200 });
    },
  });

  try {
    const validToken = await signToken();
    const validResponse = await app.inject({
      method: 'POST',
      url: '/v1/omega/connectors/observe',
      headers: { authorization: `Bearer ${validToken}` },
      payload: { connector, liveAdapter: 'github-public-repository' },
    });
    assert.equal(validResponse.statusCode, 200);
    assert.equal(validResponse.json().admission.admitted, false);
    assert.equal(seenIdentity.issuer, issuer);
    assert.equal(seenIdentity.subject, 'operator-123');
    assert.equal(seenIdentity.audience, audience);
    assert.equal(typeof seenIdentity.issuedAt, 'number');
    assert.ok(seenIdentity.expiresAt > Math.floor(Date.now() / 1000));

    const invalidTokens = [
      await signToken({ tokenAudience: 'different-api' }),
      await signToken({ expiresAt: Math.floor(Date.now() / 1000) - 1 }),
      await signToken({ expiresAt: null }),
      await signToken({ tokenAudience: [audience, 'another-api'] }),
      await signToken({ tokenAudience: [audience, 'another-api'], authorizedParty: 'another-api' }),
    ];
    for (const token of invalidTokens) {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/omega/connectors/observe',
        headers: { authorization: `Bearer ${token}` },
        payload: { connector, liveAdapter: 'github-public-repository' },
      });
      assert.equal(response.statusCode, 401);
      assert.equal(response.json().error, 'CONNECTOR_IDENTITY_INVALID');
    }

    const missingTokenResponse = await app.inject({
      method: 'POST',
      url: '/v1/omega/connectors/observe',
      payload: { connector, liveAdapter: 'github-public-repository' },
    });
    assert.equal(missingTokenResponse.statusCode, 401);
    assert.equal(missingTokenResponse.json().error, 'CONNECTOR_IDENTITY_REQUIRED');
    assert.equal(resolverCalls, 1);
    assert.equal(fetchCalls, 0);
    assert.equal(oidcIdentityConfigFromEnvironment({}), undefined);
    assert.deepEqual(oidcIdentityConfigFromEnvironment({
      OMEGA_OIDC_ISSUER: issuer,
      OMEGA_OIDC_AUDIENCE: audience,
      OMEGA_OIDC_JWKS_URI: jwksUri,
    }), { issuer, audience, jwksUri });
    assert.throws(
      () => oidcIdentityConfigFromEnvironment({ OMEGA_OIDC_ISSUER: issuer }),
      /must be configured together/,
    );

    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      assert.throws(
        () => createOidcIdentityVerifier({ issuer, audience, jwksUri }),
        /HTTPS URL/,
      );
    } finally {
      if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previousNodeEnv;
    }

    const unavailableJwksServer = createServer((_request, response) => {
      response.writeHead(503).end();
    });
    await new Promise((resolve) => unavailableJwksServer.listen(0, '127.0.0.1', resolve));
    const unavailableAddress = unavailableJwksServer.address();
    const unavailableApp = createApp(':memory:', false, {
      oidcIdentity: {
        issuer,
        audience,
        jwksUri: `http://127.0.0.1:${unavailableAddress.port}/jwks`,
      },
    });
    try {
      const response = await unavailableApp.inject({
        method: 'POST',
        url: '/v1/omega/connectors/observe',
        headers: { authorization: `Bearer ${validToken}` },
        payload: { connector, liveAdapter: 'github-public-repository' },
      });
      assert.equal(response.statusCode, 503);
      assert.equal(response.json().error, 'CONNECTOR_IDENTITY_UNAVAILABLE');
    } finally {
      await unavailableApp.close();
      await new Promise((resolve, reject) => unavailableJwksServer.close((error) => (error ? reject(error) : resolve())));
    }
  } finally {
    await app.close();
    for (const [key, value] of Object.entries(originalAuthEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});
