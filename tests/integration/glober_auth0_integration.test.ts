import test from 'node:test';
import assert from 'node:assert/strict';

const API_BASE = 'http://localhost:5000';

test('🌐 Glober AI & Enterprise Auth0 Full-Stack Integration Suite', async (t) => {
  // Ensure authenticated session at start of suite
  await fetch(`${API_BASE}/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'elion@oceanicos.network',
      name: 'Elion Varel',
      tenantId: 'tenant-oceanicos-sovereign',
      provider: 'auth0',
    }),
  });

  await t.test('GET /v1/auth/session returns active tenant session and fail-closed security', async () => {
    const res = await fetch(`${API_BASE}/v1/auth/session`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.authenticated, true);
    assert.equal(data.user.name, 'Elion Varel');
    assert.equal(data.tenant.isolationMode, 'fail-closed');
    assert.equal(data.security.failClosed, true);
    assert.ok(Array.isArray(data.security.supportedProviders));
  });

  await t.test('POST /v1/auth/login switches tenant context cleanly', async () => {
    const res = await fetch(`${API_BASE}/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'collaborator@oceanicos.network',
        tenantId: 'tenant-oceanicos-collaborative',
        provider: 'corporate-sso',
      }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.user.tenantId, 'tenant-oceanicos-collaborative');
    assert.equal(data.user.provider, 'corporate-sso');
    assert.ok(data.sessionToken.startsWith('omega-token-'));
  });

  await t.test('POST /v1/auth/logout enforces allowed logout URLs with fail-closed policy', async () => {
    // Attempt unauthorized redirect
    const badRes = await fetch(`${API_BASE}/v1/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ returnTo: 'https://malicious-phishing-site.com' }),
    });
    assert.equal(badRes.status, 400);
    const badData = await badRes.json();
    assert.equal(badData.error, 'INVALID_LOGOUT_REDIRECT_URI');

    // Authorized redirect
    const goodRes = await fetch(`${API_BASE}/v1/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ returnTo: 'http://localhost:3000' }),
    });
    assert.equal(goodRes.status, 200);
    const goodData = await goodRes.json();
    assert.equal(goodData.success, true);

    // Re-authenticate sovereign session for subsequent tests and UI
    await fetch(`${API_BASE}/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'elion@oceanicos.network',
        name: 'Elion Varel',
        tenantId: 'tenant-oceanicos-sovereign',
        provider: 'auth0',
      }),
    });
  });

  await t.test('GET /v1/glober/status returns Glober AI state and active goals', async () => {
    const res = await fetch(`${API_BASE}/v1/glober/status`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.service, 'glober-ai-dual-engine');
    assert.ok(data.state.mode);
    assert.ok(Array.isArray(data.state.activeGoals));
    assert.equal(data.doctrine, 'ATTEST, DONT ASSERT');
    assert.equal(data.checksum, '30013030');
  });

  await t.test('POST /v1/glober/mode switches to autonomous agentic mode', async () => {
    const res = await fetch(`${API_BASE}/v1/glober/mode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'autonomous',
        subMode: 'goal',
        model: 'gemini',
      }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.mode, 'autonomous');
    assert.equal(data.subMode, 'goal');
    assert.equal(data.hitlRequired, false);
  });

  await t.test('POST /v1/glober/goal queues a persistent background goal', async () => {
    const res = await fetch(`${API_BASE}/v1/glober/goal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Autonomous Swarm Market Liquidity Monitor',
        description: 'Continuously track XAU/USD gold spreads and SegWit reserve proofs',
        mode: 'autonomous',
      }),
    });
    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.goal.id.startsWith('goal-'));
    assert.equal(data.goal.title, 'Autonomous Swarm Market Liquidity Monitor');
  });

  await t.test('GET /v1/glober/news returns live multi-world AI news ticker feed', async () => {
    const res = await fetch(`${API_BASE}/v1/glober/news`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.sensoryFeed, 'real-time-global-ai-news');
    assert.ok(Array.isArray(data.signals));
    assert.ok(data.signals.length >= 4);
  });

  await t.test('POST /v1/glober/execute enforces HITL for consequential actions in collaborative mode', async () => {
    // First switch back to collaborative mode
    await fetch(`${API_BASE}/v1/glober/mode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'collaborative', subMode: 'chat' }),
    });

    // Consequential action without user approval
    const blockedRes = await fetch(`${API_BASE}/v1/glober/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'GIT_PUSH', userApproved: false }),
    });
    assert.equal(blockedRes.status, 403);
    const blockedData = await blockedRes.json();
    assert.equal(blockedData.error, 'HITL_APPROVAL_REQUIRED');

    // Consequential action WITH user approval
    const approvedRes = await fetch(`${API_BASE}/v1/glober/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'GIT_PUSH', userApproved: true }),
    });
    assert.equal(approvedRes.status, 200);
    const approvedData = await approvedRes.json();
    assert.equal(approvedData.success, true);
    assert.equal(approvedData.receipt.status, 'EXECUTED_SUCCESSFULLY');
  });
});
