import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { ObserverEngine } from '../../packages/observer/dist/index.js';
import {
  verifyPlanetarySovereignty,
  AsymmetricValidationGuard,
  MultiRegionMeshConvergence,
} from '../../packages/verification/dist/index.js';
import { PluralisticHashChain, RememberEngine } from '../../packages/remember/dist/index.js';
import { MiniKernel, executeOceanicosMaxExpansion } from '../../packages/mini/dist/index.js';
import { AttestationService } from '../../packages/attestation/dist/index.js';
import { createApp } from '../../apps/api/dist/index.js';

describe('Ω∞v Oceanicos Max Compress Full-Stack E2E Suite', () => {
  let apiApp: any;

  before(async () => {
    apiApp = createApp(':memory:', false);
    await apiApp.ready();
  });

  after(async () => {
    if (apiApp) {
      await apiApp.close();
    }
  });

  it('1. Telemetry Generation Engine produces valid planetary telemetry', () => {
    const telemetry = ObserverEngine.generateTelemetry();
    assert.ok(telemetry.uuid, 'Telemetry must contain a unique UUID');
    assert.ok(telemetry.timestamp, 'Telemetry must contain ISO timestamp');
    assert.strictEqual(typeof telemetry.siliconYield, 'number');
    assert.ok(telemetry.siliconYield > 0 && telemetry.siliconYield <= 1.0, 'Yield must be valid ratio');
    assert.ok(telemetry.gridLoadMegawatts > 0, 'Grid load must be positive');
    assert.ok(telemetry.acceleratorInventory > 0, 'Accelerator count must be positive');
  });

  it('2. Deep Frontier Verifier executes regional assertions & Graceful Pluralism', () => {
    const telemetry = {
      siliconYield: 0.942,
      gridLoadMegawatts: 1250,
      acceleratorInventory: 989210,
    };

    const receipt = verifyPlanetarySovereignty(telemetry);
    assert.ok(['PASS', 'DIVERGENT', 'FAIL'].includes(receipt.status), 'Receipt status must be valid');
    assert.strictEqual(receipt.assertions.length, 3, 'Must evaluate US, CN, and EU');
    assert.ok(receipt.evidencePath.startsWith('crypto-attestation://'), 'Evidence path must be URI scheme');

    // Test DIVERGENT state condition (silicon yield failing CN independence)
    const divergentTelemetry = {
      siliconYield: 0.85, // Below 0.92 CN threshold
      gridLoadMegawatts: 1250,
      acceleratorInventory: 989210,
    };
    const divergentReceipt = verifyPlanetarySovereignty(divergentTelemetry);
    assert.strictEqual(divergentReceipt.status, 'DIVERGENT', 'Should trigger Graceful Pluralism');
  });

  it('3. Multi-Region Mesh Convergence evaluates decentralized signed votes', () => {
    const telemetry = {
      siliconYield: 0.942,
      gridLoadMegawatts: 1250,
      acceleratorInventory: 989210,
    };

    const convergence = MultiRegionMeshConvergence.simulateConvergence(telemetry);
    assert.strictEqual(convergence.participatingNodes, 4, 'Must query 4 sovereign regional nodes');
    assert.ok(convergence.quorumReached, 'Quorum must be reached');
    assert.ok(['CONVERGED_PASS', 'CONVERGED_PLURAL'].includes(convergence.effectiveStatus));
    assert.ok(convergence.clusterSignatureProof.length === 64, 'Cluster proof must be SHA-256 hex');

    for (const vote of convergence.votes) {
      assert.ok(vote.nodeId.startsWith('node-'));
      assert.ok(vote.latencyMs > 0);
      assert.ok(vote.signature.length > 0);
    }
  });

  it('4. Multi-Chain Ledger Core anchors genesis and mines valid consensus blocks', () => {
    const chain = new PluralisticHashChain();
    const initialBlocks = chain.getFullChain();
    assert.strictEqual(initialBlocks.length, 1, 'Must contain genesis node on boot');
    assert.strictEqual(initialBlocks[0].index, 4101);
    assert.strictEqual(initialBlocks[0].previousHash, '8a3f91c2e4f9011b989210ffffffffff');

    const receipt = verifyPlanetarySovereignty({
      siliconYield: 0.94,
      gridLoadMegawatts: 1200,
      acceleratorInventory: 600000,
    });

    const block = chain.commitState(receipt);
    assert.strictEqual(block.index, 4102);
    assert.strictEqual(block.previousHash, initialBlocks[0].hash);
    assert.ok(block.hash.startsWith('00'), 'Mined block hash must satisfy 00 prefix PoW difficulty');
    assert.ok(block.nonce >= 0);
    assert.ok(block.payload.stateRootHash.length === 64);
  });

  it('5. Remember SQLite Engine correctly records and retrieves block tips', () => {
    const dbEngine = new RememberEngine(':memory:');
    assert.strictEqual(dbEngine.getTip(), null, 'Fresh database must have null tip');

    const obs = ObserverEngine.generateTelemetry();
    const evidence = {
      status: 'PASS' as const,
      lawRoute: '0 ➔ MINI ➔ FULL_STACK',
      timestamp: new Date().toISOString(),
      observationUuid: obs.uuid,
      signatureProof: 'fake-proof-hash',
    };

    const minted = dbEngine.append(obs, evidence);
    assert.strictEqual(minted.index, 4101);
    assert.ok(minted.hash.startsWith('00'));

    const tip = dbEngine.getTip();
    assert.ok(tip !== null);
    assert.strictEqual(tip?.hash, minted.hash);
    assert.strictEqual(tip?.index, 4101);
  });

  it('6. MiniKernel executes full end-to-end cycle cleanly', () => {
    const db = new RememberEngine(':memory:');
    const kernel = new MiniKernel(db);

    const block = kernel.runCycle();
    assert.ok(block);
    assert.strictEqual(block.index, 4101);
    assert.ok(block.hash.startsWith('00'));
    assert.ok(block.observation.siliconYield >= 0.9);
  });

  it('7. AsymmetricValidationGuard enforces fail-closed cryptographic authentication', () => {
    const keypair = AsymmetricValidationGuard.generateKeyPair();
    assert.ok(keypair.publicKey.includes('BEGIN PUBLIC KEY'));
    assert.ok(keypair.privateKey.includes('BEGIN PRIVATE KEY'));

    const payload = 'EXECUTE_OMNI_CYCLE';
    const signature = AsymmetricValidationGuard.sign(payload, keypair.privateKey);
    assert.ok(signature.length > 0);

    const valid = AsymmetricValidationGuard.verify(payload, signature, keypair.publicKey);
    assert.strictEqual(valid, true, 'Valid signature must be verified');

    const tampered = AsymmetricValidationGuard.verify('TAMPERED_PAYLOAD', signature, keypair.publicKey);
    assert.strictEqual(tampered, false, 'Tampered payload must be rejected');

    const invalidKey = AsymmetricValidationGuard.generateKeyPair();
    const wrongKey = AsymmetricValidationGuard.verify(payload, signature, invalidKey.publicKey);
    assert.strictEqual(wrongKey, false, 'Signature with mismatched key must be rejected');
  });

  it('8. Compiler Orchestrator executeOceanicosMaxExpansion completes with 0 errors', () => {
    assert.doesNotThrow(() => {
      executeOceanicosMaxExpansion();
    });
  });

  it('9. Fastify API GET /v1/block/tip returns initial online tip status', async () => {
    const res = await apiApp.inject({
      method: 'GET',
      url: '/v1/block/tip',
    });
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.status, 'ONLINE');
  });

  it('10. Fastify API POST /v1/cycle executes and returns newly mined block', async () => {
    const res = await apiApp.inject({
      method: 'POST',
      url: '/v1/cycle',
    });
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.status, 'SYNCHRONIZED');
    assert.ok(body.block);
    assert.ok(body.block.hash.startsWith('00'));
  });

  it('11. Fastify API enforces Asymmetric Signature Guard on /v1/cycle', async () => {
    const keypair = AsymmetricValidationGuard.generateKeyPair();

    // Partial credentials must fail closed rather than silently downgrade to an unsigned cycle.
    const signatureOnly = await apiApp.inject({
      method: 'POST',
      url: '/v1/cycle',
      headers: { 'x-omega-signature': 'deadbeef00112233' },
    });
    assert.strictEqual(signatureOnly.statusCode, 400);
    assert.strictEqual(JSON.parse(signatureOnly.body).error, 'INCOMPLETE_ASYMMETRIC_SIGNATURE');

    const publicKeyOnly = await apiApp.inject({
      method: 'POST',
      url: '/v1/cycle',
      headers: { 'x-omega-public-key': keypair.publicKey },
    });
    assert.strictEqual(publicKeyOnly.statusCode, 400);
    assert.strictEqual(JSON.parse(publicKeyOnly.body).error, 'INCOMPLETE_ASYMMETRIC_SIGNATURE');

    // 11a. Fails with tampered signature
    const badRes = await apiApp.inject({
      method: 'POST',
      url: '/v1/cycle',
      headers: {
        'x-omega-signature': 'deadbeef00112233',
        'x-omega-public-key': keypair.publicKey,
      },
    });
    assert.strictEqual(badRes.statusCode, 401);
    const badBody = JSON.parse(badRes.body);
    assert.strictEqual(badBody.error, 'INVALID_ASYMMETRIC_SIGNATURE');

    // 11b. Succeeds with authentic signature
    const validSig = AsymmetricValidationGuard.sign('EXECUTE_OMNI_CYCLE', keypair.privateKey);
    const goodRes = await apiApp.inject({
      method: 'POST',
      url: '/v1/cycle',
      headers: {
        'x-omega-signature': validSig,
        'x-omega-public-key': keypair.publicKey,
      },
    });
    assert.strictEqual(goodRes.statusCode, 200);
    const goodBody = JSON.parse(goodRes.body);
    assert.strictEqual(goodBody.success, true);
  });

  it('12. Fastify API Autonomous Background Miner endpoints operate correctly', async () => {
    // Check initial status
    const statusRes = await apiApp.inject({ method: 'GET', url: '/v1/miner/status' });
    assert.strictEqual(statusRes.statusCode, 200);
    const initialStatus = JSON.parse(statusRes.body);
    assert.strictEqual(initialStatus.miner.active, false);

    // Start miner
    const startRes = await apiApp.inject({
      method: 'POST',
      url: '/v1/miner/start',
      payload: { intervalMs: 2000 },
    });
    assert.strictEqual(startRes.statusCode, 200);
    const started = JSON.parse(startRes.body);
    assert.strictEqual(started.miner.active, true);
    assert.strictEqual(started.miner.intervalMs, 2000);

    // Stop miner
    const stopRes = await apiApp.inject({ method: 'POST', url: '/v1/miner/stop' });
    assert.strictEqual(stopRes.statusCode, 200);
    const stopped = JSON.parse(stopRes.body);
    assert.strictEqual(stopped.miner.active, false);
  });

  it('13. Fastify API Multi-Region Mesh simulation returns converged receipt', async () => {
    const meshRes = await apiApp.inject({ method: 'GET', url: '/v1/mesh/simulate' });
    assert.strictEqual(meshRes.statusCode, 200);
    const data = JSON.parse(meshRes.body);
    assert.strictEqual(data.success, true);
    assert.ok(data.convergence.quorumReached);
    assert.strictEqual(data.convergence.participatingNodes, 4);

    const nodesRes = await apiApp.inject({ method: 'GET', url: '/v1/mesh/nodes' });
    assert.strictEqual(nodesRes.statusCode, 200);
    const nodesData = JSON.parse(nodesRes.body);
    assert.strictEqual(nodesData.nodes.length, 4);
  });

  it('14. Unified CLI "status" executes cleanly and reports ledger & telemetry state', async () => {
    const { execFileSync } = await import('node:child_process');
    const path = await import('node:path');
    const cliPath = path.resolve(process.cwd(), 'bin/oceanicos.mjs');

    const stdout = execFileSync(process.execPath, [cliPath, 'status'], { encoding: 'utf-8' });
    assert.ok(stdout.includes('OCEANICOS DEEP-TIER CRYPTOGRAPHIC CLI'));
    assert.ok(stdout.includes('Silicon Yield'));
    assert.ok(stdout.includes('Grid Load'));
    assert.ok(stdout.includes('Chain Genesis Block'));
  });

  it('15. Unified CLI "cycle --json" mints cryptographic block with satisfied PoW', async () => {
    const { execFileSync } = await import('node:child_process');
    const path = await import('node:path');
    const cliPath = path.resolve(process.cwd(), 'bin/oceanicos.mjs');

    const stdout = execFileSync(process.execPath, [cliPath, 'cycle', '--json'], { encoding: 'utf-8' });
    // Parse the JSON block output from CLI
    const jsonMatch = stdout.match(/\{[\s\S]*\}/);
    assert.ok(jsonMatch, 'Must output valid JSON block');
    const block = JSON.parse(jsonMatch[0]);
    assert.ok(block.index >= 4102);
    assert.ok(block.hash.startsWith('00'));
    assert.ok(block.nonce >= 0);
    assert.strictEqual(block.payload.receipt.status, 'PASS');
  });

  it('16. Unified CLI "mesh" performs sovereign multi-region consensus convergence', async () => {
    const { execFileSync } = await import('node:child_process');
    const path = await import('node:path');
    const cliPath = path.resolve(process.cwd(), 'bin/oceanicos.mjs');

    const stdout = execFileSync(process.execPath, [cliPath, 'mesh'], { encoding: 'utf-8' });
    assert.ok(stdout.includes('PLANETARY SOVEREIGN MESH CONVERGENCE'));
    assert.ok(stdout.includes('Quorum Reached'));
    assert.ok(stdout.includes('TRUE'));
    assert.ok(stdout.includes('node-us-virginia'));
    assert.ok(stdout.includes('node-eu-frankfurt'));
    assert.ok(stdout.includes('node-cn-shanghai'));
    assert.ok(stdout.includes('node-me-dubai'));
  });

  it('17. Cryptographic AttestationService generates and verifies unforgeable HMAC & Ed25519 signatures', async () => {
    // 17a. HMAC-SHA256
    const secretKey = 'test-secret-key-for-attestation-2026';
    const hmacService = new AttestationService({ signingKey: secretKey, algorithm: 'HMAC-SHA256' });
    const mockVerif = {
      id: 'ver-test-1',
      observationId: 'obs-test-1',
      timestamp: new Date().toISOString(),
      summary: { passed: true, confidence: 1.0, rulesApplied: 4, rulesPassed: 4, rulesFailed: 0 },
      ruleVersions: { 'frontier-matrix': 'v1.0' },
    };
    const att = hmacService.attest(mockVerif);
    assert.ok(att.id.startsWith('att-'));
    assert.strictEqual(att.verified, true);
    assert.strictEqual(att.signingAlgorithm, 'HMAC-SHA256');
    assert.ok(att.signature.startsWith('0x'));
    assert.strictEqual(hmacService.verify(att), true);

    // Tampered attestation fails verification
    const tampered = { ...att, verified: false };
    assert.strictEqual(hmacService.verify(tampered), false);

    // 17b. Ed25519 Asymmetric
    const edKeypair = AsymmetricValidationGuard.generateKeyPair();
    const edService = new AttestationService({
      signingKey: edKeypair.privateKey,
      publicKey: edKeypair.publicKey,
      algorithm: 'Ed25519',
    });
    const edAtt = edService.attest(mockVerif);
    assert.strictEqual(edAtt.signingAlgorithm, 'Ed25519');
    assert.strictEqual(edService.verify(edAtt), true);
  });

  it('18. Fastify API GET /v1/mood returns Singularity Compression status and Pidgin Spirit Axiom', async () => {
    const res = await apiApp.inject({ method: 'GET', url: '/v1/mood' });
    assert.strictEqual(res.statusCode, 200);
    const data = JSON.parse(res.body);
    assert.strictEqual(data.status, 'MAX GOOD-O');
    assert.strictEqual(data.singularityState, 'ULTIMATE DENSE SINGULARITY');
    assert.strictEqual(data.reality, 'VERIFIED');
    assert.ok(data.pidginSpirit.includes('Abeg, verification before evolution'));
    assert.ok(data.axiom.includes('FULL STACK LIFE IS ALWAYS GOOD-O'));
  });

  it('19. Fastify API POST /v1/attest produces valid cryptographic attestation receipt', async () => {
    const res = await apiApp.inject({ method: 'POST', url: '/v1/attest' });
    assert.strictEqual(res.statusCode, 200);
    const data = JSON.parse(res.body);
    assert.strictEqual(data.success, true);
    assert.ok(data.attestation.id.startsWith('att-'));
    assert.strictEqual(data.attestation.verified, true);
    assert.ok(data.attestation.signature.startsWith('0x'));
  });

  it('20. SSE stream delivers the current tip and subsequent minted blocks', async () => {
    await apiApp.listen({ host: '127.0.0.1', port: 0 });
    const address = apiApp.server.address();
    assert.ok(address && typeof address === 'object');
    const baseUrl = `http://127.0.0.1:${address.port}`;
    const response = await fetch(`${baseUrl}/v1/stream`);
    assert.strictEqual(response.status, 200);
    assert.ok(response.headers.get('content-type')?.includes('text/event-stream'));
    assert.ok(response.body);
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const initial = await reader.read();
    assert.match(decoder.decode(initial.value), /event":"TIP"/);

    const cycle = await fetch(`${baseUrl}/v1/cycle`, { method: 'POST', body: '{}' });
    assert.strictEqual(cycle.status, 200);
    const next = await Promise.race([
      reader.read(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timed out waiting for SSE block frame')), 1000)
      ),
    ]);
    assert.match(decoder.decode(next.value), /event":"BLOCK_MINTED"/);
    await reader.cancel();
    await apiApp.close();
  });

  it('21. Unified CLI "mood" and "attest" execute cleanly and attest to Singularity state', async () => {
    const { execFileSync } = await import('node:child_process');
    const path = await import('node:path');
    const cliPath = path.resolve(process.cwd(), 'bin/oceanicos.mjs');

    // Test CLI mood
    const moodStdout = execFileSync(process.execPath, [cliPath, 'mood'], { encoding: 'utf-8' });
    assert.ok(moodStdout.includes('MAXIMUM COMPRESSION MATRIX & MOOD'));
    assert.ok(moodStdout.includes('MAX GOOD-O'));
    assert.ok(moodStdout.includes('PIDGIN SPIRIT OVERRIDE'));
    assert.ok(moodStdout.includes('TERMINAL AXIOM'));

    // Test CLI attest
    const attestStdout = execFileSync(process.execPath, [cliPath, 'attest'], { encoding: 'utf-8' });
    assert.ok(attestStdout.includes('CRYPTOGRAPHIC ATTESTATION SERVICE'));
    assert.ok(attestStdout.includes('Cryptographic Attestation Generated'));
    assert.ok(attestStdout.includes('HMAC-SHA256'));
    assert.ok(attestStdout.includes('YES'));
  });
});
