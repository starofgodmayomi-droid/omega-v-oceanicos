#!/usr/bin/env node
/**
 * scripts/covenant-smoke.mjs
 * Proactive End-to-End Smoke Test for Biblical Engine & V1111 Singularity Upgrade
 *
 * Verifies:
 * 1. /health subsystem checks include covenant & upgrade readiness.
 * 2. /v1/covenant Genesis Covenant is seated in HOLY_OF_HOLIES.
 * 3. Lifecycle state machine: PROMISED -> SEALED -> TESTED -> FULFILLED.
 * 4. Reality-First rule: FULFILLED without receipts strictly fails closed (403).
 * 5. Sanctum access gating: HOLY_OF_HOLIES denied without Human Steward signature.
 * 6. /v1/upgrade single-current convergence status.
 */

const baseUrl = (process.env.OMEGA_API_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');

const STEWARD_DID = 'did:omega:human:starofgodmayomi';

async function request(path, method = 'GET', body) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(3000),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

console.log('💧 [COVENANT SMOKE] Probing Biblical Engine & V1111 Singularity Upgrade...');

// 1. Health Probe
console.log('1. Checking /health subsystems readiness...');
const health = await request('/health');
if (!health.ok) {
  throw new Error(`Health probe failed: ${health.status}`);
}
if (health.data.checks?.covenant !== 'ready') {
  throw new Error(`Expected covenant check 'ready', got: ${health.data.checks?.covenant}`);
}
if (health.data.checks?.upgrade !== 'ready') {
  throw new Error(`Expected upgrade check 'ready', got: ${health.data.checks?.upgrade}`);
}
console.log('   ✓ /health reports covenant: ready, upgrade: ready');

// 2. Genesis Covenant Check
console.log('2. Verifying Genesis Covenant in /v1/covenant...');
const list = await request('/v1/covenant');
if (!list.ok || !Array.isArray(list.data.covenants) || list.data.covenants.length === 0) {
  throw new Error('Failed to retrieve covenants list');
}
const genesis = list.data.covenants.find((c) => c.covenantId === 'cov-genesis-1111');
if (!genesis) {
  throw new Error('Genesis covenant cov-genesis-1111 not found');
}
if (genesis.thread?.sanctum !== 'HOLY_OF_HOLIES') {
  throw new Error(`Genesis covenant must be in HOLY_OF_HOLIES, got: ${genesis.thread?.sanctum}`);
}
console.log(`   ✓ Genesis Covenant verified in ${genesis.thread.sanctum} (State Hash: ${genesis.thread.covenantStateHash.slice(0, 16)}...)`);

// 3. Create New Covenant
const testId = `cov-smoke-${Date.now().toString(36)}`;
console.log(`3. Initializing new covenant: ${testId}...`);
const created = await request('/v1/covenant', 'POST', {
  covenantId: testId,
  title: 'Automated Smoke Test Living Covenant',
  terms: ['Empirical verification', 'Fail-closed on doubt', 'Truth-in-love'],
  sanctum: 'HOLY_PLACE',
});
if (created.status !== 201 || created.data.covenant?.status !== 'PROMISED') {
  throw new Error(`Failed to create covenant: status=${created.status}`);
}
console.log('   ✓ Covenant created in PROMISED status');

// 4. Sealing Gate
console.log('4. Sealing with Human Steward signature...');
const sealed = await request('/v1/covenant/transition', 'POST', {
  covenantId: testId,
  targetStatus: 'SEALED',
  requestedBy: STEWARD_DID,
  reason: 'Signed by Human Root during automated smoke run',
  stewardSignature: 'sig-steward-smoke-key',
});
if (!sealed.ok || sealed.data.newStatus !== 'SEALED' || !sealed.data.covenant?.attestationHash) {
  throw new Error(`Sealing failed: ${JSON.stringify(sealed.data)}`);
}
console.log(`   ✓ Covenant SEALED (Attestation Hash: ${sealed.data.covenant.attestationHash.slice(0, 16)}...)`);

// 5. Wilderness Testing Transition
console.log('5. Advancing to TESTED status...');
const tested = await request('/v1/covenant/transition', 'POST', {
  covenantId: testId,
  targetStatus: 'TESTED',
  requestedBy: 'operator:smoke-runner',
  reason: 'Wilderness verification probe',
});
if (!tested.ok || tested.data.newStatus !== 'TESTED') {
  throw new Error(`Testing transition failed: ${JSON.stringify(tested.data)}`);
}
console.log('   ✓ Covenant entered TESTED status');

// 6. Reality-First Fail-Closed Check (Empty Evidence Must Deny)
console.log('6. Testing Reality-First fail-closed invariant (Empty Evidence)...');
const emptyFulfill = await request('/v1/covenant/transition', 'POST', {
  covenantId: testId,
  targetStatus: 'FULFILLED',
  requestedBy: 'operator:smoke-runner',
  reason: 'Attempt fulfillment with no receipts',
  evidenceReceipts: [],
});
if (emptyFulfill.status !== 403 || emptyFulfill.data.error !== 'EVIDENCE_ABSENCE_DENIAL') {
  throw new Error(`Expected 403 EVIDENCE_ABSENCE_DENIAL, got: ${emptyFulfill.status}`);
}
console.log('   ✓ Correctly failed closed with 403 EVIDENCE_ABSENCE_DENIAL');

// 7. Legitimate Reality Fulfillment
console.log('7. Fulfilling with verified empirical receipts...');
const fulfilled = await request('/v1/covenant/transition', 'POST', {
  covenantId: testId,
  targetStatus: 'FULFILLED',
  requestedBy: 'operator:smoke-runner',
  reason: 'Physical reality execution confirmed',
  evidenceReceipts: ['receipt:covenant-smoke-pass', 'receipt:fastify:ok'],
});
if (!fulfilled.ok || fulfilled.data.newStatus !== 'FULFILLED') {
  throw new Error(`Fulfillment failed: ${JSON.stringify(fulfilled.data)}`);
}
console.log('   ✓ Covenant successfully FULFILLED with reality receipts');

// 8. Sanctum Access Probe
console.log('8. Probing Temple Thread Sanctum boundary rules...');
const unsignedHolyProbe = await request('/v1/covenant/sanctum/verify', 'POST', {
  sanctum: 'HOLY_OF_HOLIES',
  requesterDid: 'unauthorized:worker',
});
if (unsignedHolyProbe.status !== 403 || unsignedHolyProbe.data.allowed !== false) {
  throw new Error('Expected HOLY_OF_HOLIES to deny unauthorized entity with 403');
}

const signedHolyProbe = await request('/v1/covenant/sanctum/verify', 'POST', {
  sanctum: 'HOLY_OF_HOLIES',
  requesterDid: STEWARD_DID,
  stewardSignature: 'sig-valid-steward-root',
});
if (!signedHolyProbe.ok || signedHolyProbe.data.allowed !== true) {
  throw new Error('Expected HOLY_OF_HOLIES to allow signed Human Steward with 200');
}
console.log('   ✓ Sanctum gate: Unsigned DENIED (403), Steward Signed ALLOWED (200)');

// 9. V1111 Singularity Upgrade Status
console.log('9. Checking V1111 Singularity Upgrade /v1/upgrade...');
const upgrade = await request('/v1/upgrade');
if (!upgrade.ok || upgrade.data.contract !== 'Ω∞v-V1111-UPGRADE') {
  throw new Error('Upgrade endpoint check failed');
}
console.log(`   ✓ V1111 Upgrade Core active: ${upgrade.data.contract} (Tip: ${upgrade.data.tipHash.slice(0, 16)}...)`);

console.log('\n=================================================================================');
console.log('✓ [ALL COVENANT & V1111 SMOKE CHECKS PASSED] Tri-surface reality verified.');
console.log('=================================================================================\n');

console.log(JSON.stringify({
  verdict: 'PASS',
  testedCovenantId: testId,
  genesisSanctum: genesis.thread.sanctum,
  upgradeContract: upgrade.data.contract,
  timestamp: new Date().toISOString(),
}, null, 2));
