import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { ObserverEngine } from '../../packages/observer/src/index.js';
import {
  verifyPlanetarySovereignty,
  AsymmetricValidationGuard,
  MultiRegionMeshConvergence,
} from '../../packages/verification/src/index.js';
import { MAX_PROOF_OF_WORK_ATTEMPTS, PluralisticHashChain, RememberEngine } from '../../packages/remember/src/index.js';
import { MiniKernel, executeOceanicosMaxExpansion } from '../../packages/mini/src/index.js';
import { AttestationService } from '../../packages/attestation/src/index.js';
import { InferenceClient } from '../../packages/inference/src/index.js';
import { VectorMemory } from '../../packages/vector/src/index.js';
import { CopilotAntigravityController } from '../../packages/mood/src/index.js';
import { AuthorizedCommandExecutor } from '../../apps/api/src/omega/executor.js';
import { WorkerRegistry } from '../../apps/api/src/omega/registry.js';
import { createApp } from '../../apps/api/src/index.js';

describe('Ω∞v Oceanicos Max Compress Full-Stack E2E Suite', () => {
  let apiApp: any;

  before(async () => {
    process.env.OMEGA_SIGNING_KEY =
      process.env.OMEGA_SIGNING_KEY || 'omega-v-default-attestation-secret-key-2026';
    apiApp = createApp(':memory:', false, {
      allowUnsignedCycle: true,
      attestationSigningKey: 'integration-attestation-key-2026-strong',
    });
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

    const divergentTelemetry = {
      siliconYield: 0.85,
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

    const block = {
      index: 0,
      timestamp: new Date().toISOString(),
      observation: obs,
      evidence,
      previousHash: '8a3f91c2e4f9011b989210ffffffffff',
      hash: '00abc123456789',
      nonce: 42,
    };

    dbEngine.append(block);
    const tip = dbEngine.getTip();
    assert.ok(tip !== null);
    assert.strictEqual(tip?.hash, block.hash);
    assert.strictEqual(tip?.index, 0);
  });

  it('5a. Remember proof-of-work is finite and cancellable', () => {
    assert.strictEqual(MAX_PROOF_OF_WORK_ATTEMPTS, 1_000_000);
    const receipt = verifyPlanetarySovereignty({
      siliconYield: 0.94,
      gridLoadMegawatts: 1200,
      acceleratorInventory: 600000,
    });
    const chainController = new AbortController();
    chainController.abort();
    assert.throws(
      () => new PluralisticHashChain().commitState(receipt, { signal: chainController.signal }),
      /proof-of-work aborted/,
    );

    const engineController = new AbortController();
    engineController.abort();
    const engine = new RememberEngine(':memory:');
    assert.throws(
      () => engine.append(ObserverEngine.generateTelemetry(), { status: 'PASS' } as any, { signal: engineController.signal }),
      /proof-of-work aborted/,
    );
    engine.close();
  });

  it('6. MiniKernel executes full end-to-end cycle cleanly', () => {
    const db = new RememberEngine(':memory:');
    const kernel = new MiniKernel(db);

    const block = kernel.runCycle();
    assert.ok(block);
    assert.strictEqual(block.index, 0);
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
    const res = await apiApp.inject({ method: 'GET', url: '/v1/block/tip' });
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.status, 'ONLINE');
  });

  it('10. Fastify API POST /v1/cycle executes and returns newly mined block', async () => {
    const res = await apiApp.inject({ method: 'POST', url: '/v1/cycle' });
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.status, 'SYNCHRONIZED');
    assert.ok(body.block);
    assert.ok(body.block.hash.startsWith('00'));
  });

  it('11. Fastify API enforces Asymmetric Signature Guard on /v1/cycle', async () => {
    const keypair = AsymmetricValidationGuard.generateKeyPair();
    const strictApp = createApp(':memory:', false, { allowUnsignedCycle: false });
    await strictApp.ready();
    const unsigned = await strictApp.inject({ method: 'POST', url: '/v1/cycle' });
    assert.strictEqual(unsigned.statusCode, 401);
    assert.strictEqual(JSON.parse(unsigned.body).error, 'ASYMMETRIC_SIGNATURE_REQUIRED');
    await strictApp.close();

    const signatureOnly = await apiApp.inject({ method: 'POST', url: '/v1/cycle', headers: { 'x-omega-signature': 'deadbeef00112233' } });
    assert.strictEqual(signatureOnly.statusCode, 400);
    assert.strictEqual(JSON.parse(signatureOnly.body).error, 'INCOMPLETE_ASYMMETRIC_SIGNATURE');

    const publicKeyOnly = await apiApp.inject({ method: 'POST', url: '/v1/cycle', headers: { 'x-omega-public-key': keypair.publicKey } });
    assert.strictEqual(publicKeyOnly.statusCode, 400);
    assert.strictEqual(JSON.parse(publicKeyOnly.body).error, 'INCOMPLETE_ASYMMETRIC_SIGNATURE');

    const badRes = await apiApp.inject({
      method: 'POST',
      url: '/v1/cycle',
      headers: { 'x-omega-signature': 'deadbeef00112233', 'x-omega-public-key': keypair.publicKey },
    });
    assert.strictEqual(badRes.statusCode, 401);
    assert.strictEqual(JSON.parse(badRes.body).error, 'INVALID_ASYMMETRIC_SIGNATURE');

    const validSig = AsymmetricValidationGuard.sign('EXECUTE_OMNI_CYCLE', keypair.privateKey);
    const goodRes = await apiApp.inject({
      method: 'POST',
      url: '/v1/cycle',
      headers: { 'x-omega-signature': validSig, 'x-omega-public-key': keypair.publicKey },
    });
    assert.strictEqual(goodRes.statusCode, 200);
    assert.strictEqual(JSON.parse(goodRes.body).success, true);

    const encodedKeyRes = await apiApp.inject({
      method: 'POST',
      url: '/v1/cycle',
      headers: {
        'x-omega-signature': validSig,
        'x-omega-public-key': `base64:${Buffer.from(keypair.publicKey, 'utf8').toString('base64')}`,
      },
    });
    assert.strictEqual(encodedKeyRes.statusCode, 200);
    assert.strictEqual(JSON.parse(encodedKeyRes.body).success, true);
  });

  it('12. Fastify API Autonomous Background Miner endpoints operate correctly', async () => {
    const statusRes = await apiApp.inject({ method: 'GET', url: '/v1/miner/status' });
    assert.strictEqual(statusRes.statusCode, 200);
    const initialStatus = JSON.parse(statusRes.body);
    assert.strictEqual(initialStatus.miner.active, false);

    const startRes = await apiApp.inject({ method: 'POST', url: '/v1/miner/start', payload: { intervalMs: 2000 } });
    assert.strictEqual(startRes.statusCode, 200);
    const started = JSON.parse(startRes.body);
    assert.strictEqual(started.miner.active, true);
    assert.strictEqual(started.miner.intervalMs, 2000);

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

    const tampered = { ...att, verified: false };
    assert.strictEqual(hmacService.verify(tampered), false);

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

  it('18. Fastify API GET /v1/mood exposes the current bounded mood contract', async () => {
    const res = await apiApp.inject({ method: 'GET', url: '/v1/mood' });
    assert.strictEqual(res.statusCode, 200);
    const data = JSON.parse(res.body);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.status, 'MAX GOOD-O');
    assert.strictEqual(data.brand, 'Oceanicos Ω∞');
    assert.strictEqual(data.contract, 'Ω∞v totality / attest-dont-assert');
    assert.ok(data.ledger && typeof data.ledger.ready === 'boolean');
    assert.ok(typeof data.evaluatedAt === 'string');
  });

  it('19. Fastify API POST /v1/attest produces valid cryptographic attestation receipt', async () => {
    const originalSigningKey = process.env.OMEGA_SIGNING_KEY;
    delete process.env.OMEGA_SIGNING_KEY;
    try {
      const missingKeyApp = createApp(':memory:', false);
      await missingKeyApp.ready();
      const missingKey = await missingKeyApp.inject({ method: 'POST', url: '/v1/attest' });
      assert.strictEqual(missingKey.statusCode, 503);
      assert.strictEqual(JSON.parse(missingKey.body).error, 'ATTESTATION_SIGNING_KEY_REQUIRED');
      await missingKeyApp.close();
    } finally {
      if (originalSigningKey === undefined) delete process.env.OMEGA_SIGNING_KEY;
      else process.env.OMEGA_SIGNING_KEY = originalSigningKey;
    }

    const weakKeyApp = createApp(':memory:', false, { attestationSigningKey: 'too-short' });
    await weakKeyApp.ready();
    const weakKey = await weakKeyApp.inject({ method: 'POST', url: '/v1/attest' });
    assert.strictEqual(weakKey.statusCode, 503);
    assert.strictEqual(JSON.parse(weakKey.body).error, 'ATTESTATION_SIGNING_KEY_TOO_WEAK');
    await weakKeyApp.close();

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
    assert.match(decoder.decode(initial.value), /event\":\"TIP\"/);

    const cycle = await fetch(`${baseUrl}/v1/cycle`, { method: 'POST', body: '{}' });
    assert.strictEqual(cycle.status, 200);
    const next = await Promise.race([
      reader.read(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timed out waiting for SSE block frame')), 1000)
      ),
    ]);
    assert.match(decoder.decode(next.value), /event\":\"BLOCK_MINTED\"/);
    await reader.cancel();
    await apiApp.close();
  });

  it('21. Unified CLI "mood" and "attest" execute cleanly and attest to Singularity state', async () => {
    const { execFileSync } = await import('node:child_process');
    const path = await import('node:path');
    const cliPath = path.resolve(process.cwd(), 'bin/oceanicos.mjs');

    const moodStdout = execFileSync(process.execPath, [cliPath, 'mood'], { encoding: 'utf-8' });
    assert.ok(moodStdout.includes('MAXIMUM COMPRESSION MATRIX & MOOD'));
    assert.ok(moodStdout.includes('MAX GOOD-O'));
    assert.ok(moodStdout.includes('PIDGIN SPIRIT OVERRIDE'));
    assert.ok(moodStdout.includes('TERMINAL AXIOM'));

    const attestStdout = execFileSync(process.execPath, [cliPath, 'attest'], { encoding: 'utf-8' });
    assert.ok(attestStdout.includes('CRYPTOGRAPHIC ATTESTATION SERVICE'));
    assert.ok(attestStdout.includes('Cryptographic Attestation Generated'));
    assert.ok(attestStdout.includes('HMAC-SHA256'));
    assert.ok(attestStdout.includes('YES'));
  });

  it('21. @oceanicos/inference — InferenceClient returns deterministic stub when Ollama is offline', async () => {
    const client = new InferenceClient({
      host: 'http://127.0.0.1:19999',
      model: 'phi3:mini',
      fallbackToStub: true,
      timeoutMs: 500,
    });

    const available = await client.isAvailable();
    assert.strictEqual(available, false);

    const observation = ObserverEngine.generateTelemetry();
    const result = await client.analyzeObservation(observation);
    assert.ok(result);
    assert.strictEqual(result.source, 'STUB');
    assert.strictEqual(result.observationId, observation.uuid);
    assert.strictEqual(result.model, 'phi3:mini');
    assert.ok(result.confidence > 0 && result.confidence <= 1);
    assert.ok(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(result.riskLevel));
    assert.ok(result.recommendations.length > 0);
    assert.ok(result.proof.startsWith('0xΩ'));
  });

  it('22. @oceanicos/vector — VectorMemory returns empty results when Qdrant is offline', async () => {
    const vectorMem = new VectorMemory({
      url: 'http://127.0.0.1:19998',
      fallbackToEmpty: true,
      timeoutMs: 500,
    });

    const available = await vectorMem.isAvailable();
    assert.strictEqual(available, false);

    const status = await vectorMem.getStatus();
    assert.strictEqual(status.available, false);
    assert.strictEqual(status.vectorCount, 0);

    const dummyEmbedding = VectorMemory.generateSimpleEmbedding('test-block-query');
    assert.strictEqual(dummyEmbedding.length, 384);
    const recallResults = await vectorMem.recall(dummyEmbedding, 5);
    assert.deepStrictEqual(recallResults, []);
  });

  it('23. Fastify API GET /v1/inference/status and POST /v1/inference/analyze return valid responses', async () => {
    // 23a. Inference status
    const statusRes = await apiApp.inject({ method: 'GET', url: '/v1/inference/status' });
    assert.strictEqual(statusRes.statusCode, 200);
    const statusData = JSON.parse(statusRes.body);
    assert.strictEqual(statusData.success, true);
    assert.ok(statusData.inference);
    assert.strictEqual(typeof statusData.inference.available, 'boolean');

    // 23b. Direct telemetry analysis
    const analyzeRes = await apiApp.inject({
      method: 'POST',
      url: '/v1/inference/analyze',
      payload: {},
    });
    assert.strictEqual(analyzeRes.statusCode, 200);
    const analyzeData = JSON.parse(analyzeRes.body);
    assert.strictEqual(analyzeData.success, true);
    assert.ok(analyzeData.result);
    assert.ok(analyzeData.result.proof.startsWith('0xΩ'));
  });

  it('24. Fastify API GET /v1/memory/status and GET /v1/memory/search return status and search results', async () => {
    // 24a. Memory status
    const statusRes = await apiApp.inject({ method: 'GET', url: '/v1/memory/status' });
    assert.strictEqual(statusRes.statusCode, 200);
    const statusData = JSON.parse(statusRes.body);
    assert.strictEqual(statusData.success, true);
    assert.ok(statusData.memory);
    assert.strictEqual(typeof statusData.memory.available, 'boolean');

    // 24b. Vector search
    const searchRes = await apiApp.inject({ method: 'GET', url: '/v1/memory/search?q=silicon-yield' });
    assert.strictEqual(searchRes.statusCode, 200);
    const searchData = JSON.parse(searchRes.body);
    assert.strictEqual(searchData.success, true);
    assert.strictEqual(searchData.query, 'silicon-yield');
    assert.ok(Array.isArray(searchData.results));
  });

  it('25. Fastify API POST /v1/cycle enriches block with aiInsight in stub mode', async () => {
    const cycleRes = await apiApp.inject({ method: 'POST', url: '/v1/cycle' });
    assert.strictEqual(cycleRes.statusCode, 200);
    const data = JSON.parse(cycleRes.body);
    assert.strictEqual(data.success, true);
    assert.ok(data.block);
    assert.ok(data.aiInsight);
    assert.strictEqual(data.aiInsight.source, 'STUB');
    assert.strictEqual(data.aiInsight.observationId, data.block.observation.uuid);
    assert.ok(data.aiInsight.proof.startsWith('0xΩ'));
  });

  it('26. Copilot Antigravity Controller enforces bounded propulsion mode and signal translation', () => {
    const propulsion = CopilotAntigravityController.getPropulsionState('OMEGA FULL STACK');
    assert.ok(propulsion);
    assert.strictEqual(propulsion.authority, 'EVIDENCE_BOUND_PROPOSAL_ONLY');
    assert.strictEqual(propulsion.mode.copilot, true);
    assert.strictEqual(propulsion.mode.antigravity, true);
    assert.strictEqual(propulsion.mode.continuum, 'FINITE_VERIFIED_STEPS');
    assert.strictEqual(propulsion.mode.dissent, 'PRESERVE');
    assert.strictEqual(propulsion.mode.realityFirst, true);
    assert.ok(propulsion.invariant.includes('Ω∞v ≡ VERIFY(ΔREALITY)'));

    const frictionSignal = CopilotAntigravityController.processSignal('FRICTION', 'High latency on node 3');
    assert.strictEqual(frictionSignal.action, 'LOCALIZE');
    assert.strictEqual(frictionSignal.authorityCheck, 'CANNOT_SELF_AUTHORIZE');

    const uncertaintySignal = CopilotAntigravityController.processSignal('UNCERTAINTY', 'Unverified cache state');
    assert.strictEqual(uncertaintySignal.action, 'VERIFY');

    const transitionNumber = CopilotAntigravityController.recordTransition();
    assert.ok(transitionNumber > 0);
  });

  it('27. C5 Bounded Executor Engine computes state diffs and produces unforgeable ExecutionReceipt', async () => {
    const registry = new WorkerRegistry();
    const executor = new AuthorizedCommandExecutor(registry);

    // 27a. Test StateDiff calculation
    const beforeState = { mode: 'INITIAL', count: 1, deprecatedFlag: true };
    const afterState = { mode: 'MUTATED', count: 2, newFeature: 'ONLINE' };
    const diff = executor.calculateStateDiff(beforeState, afterState);

    assert.ok(diff.stateBeforeHash);
    assert.ok(diff.stateAfterHash);
    assert.strictEqual(diff.mutations.length, 4); // mode MODIFIED, count MODIFIED, deprecatedFlag DELETED, newFeature ADDED
    assert.ok(diff.summary.includes('delta(s) detected'));

    // 27b. Test Command execution and receipt generation
    const mockCommand: any = {
      commandId: 'cmd-test-c5-001',
      sessionId: 'sess-test',
      requestedBy: 'operator:admin',
      prompt: 'Verify kernel typecheck bounds',
      status: 'AUTHORIZED',
      requestedWorkers: ['worker-observer', 'worker-planner'],
      boundedContext: {},
      irPlan: {
        workerPlan: [
          { step: 1, workerId: 'worker-observer', action: 'observe', readOnly: true },
          { step: 2, workerId: 'worker-planner', action: 'plan', readOnly: true },
        ],
        transitionSpec: { target: 'kernel-state', action: 'plan-only' },
      },
      idempotencyKey: 'idem-test-c5-001',
      dryRun: false,
    };

    const receipt = await executor.executeWithReceipt(mockCommand, {
      signingKey: 'omega-v-default-attestation-secret-key-2026',
    });

    assert.ok(receipt);
    assert.ok(receipt.executionId.startsWith('exec_'));
    assert.strictEqual(receipt.commandId, 'cmd-test-c5-001');
    assert.strictEqual(receipt.status, 'SUCCESS');
    assert.strictEqual(receipt.isolationMode, 'sandboxed');
    assert.ok(receipt.executionAttestationDigest);
    assert.ok(receipt.stateDiff);
    assert.ok(receipt.outputSummary.includes('[worker-observer]'));

    // 27c. Fail-closed on unauthorized status
    const unauthorizedCommand: any = { ...mockCommand, status: 'PROPOSED' };
    await assert.rejects(
      async () => executor.execute(unauthorizedCommand),
      /EXECUTION_FORBIDDEN_STATUS_PROPOSED/
    );
  });

  it('28. Fastify API Command Lifecycle executes admitted command and attaches unforgeable receipt', async () => {
    // 28a. Propose a new command
    const proposeRes = await apiApp.inject({
      method: 'POST',
      url: '/v1/omega/commands',
      payload: {
        prompt: 'Run read-only observation slice',
        requestedBy: 'operator:e2e-test',
        requestedWorkers: ['worker-observer'],
      },
    });
    assert.strictEqual(proposeRes.statusCode, 201);
    const proposeData = JSON.parse(proposeRes.body);
    assert.strictEqual(proposeData.success, true);
    const cmdId = proposeData.command.commandId;
    assert.strictEqual(proposeData.command.status, 'PROPOSED');

    // 28b. Admit the command (read-only worker passes policy)
    const admitRes = await apiApp.inject({
      method: 'POST',
      url: `/v1/omega/commands/${cmdId}/admit`,
    });
    assert.strictEqual(admitRes.statusCode, 200);
    const admitData = JSON.parse(admitRes.body);
    assert.strictEqual(admitData.verdict, 'ALLOW');
    assert.strictEqual(admitData.command.status, 'AUTHORIZED');

    // 28c. Execute the admitted command via C5 Executor
    const execRes = await apiApp.inject({
      method: 'POST',
      url: `/v1/omega/commands/${cmdId}/execute`,
      payload: { executorIdentity: 'omega:e2e-runner' },
    });
    assert.strictEqual(execRes.statusCode, 200);
    const execData = JSON.parse(execRes.body);
    assert.strictEqual(execData.success, true);
    assert.strictEqual(execData.command.status, 'EXECUTED');
    assert.ok(execData.result);
    assert.ok(execData.result.receipt);
    assert.strictEqual(execData.result.receipt.status, 'SUCCESS');
    assert.strictEqual(execData.result.receipt.isolationMode, 'sandboxed');
    assert.ok(execData.result.receipt.executionAttestationDigest);
    assert.ok(execData.result.receipt.stateDiff);
  });

  it('29. C6 Reality Reconciliation reconciles execution receipt with observation and preserves divergence', async () => {
    // 29a. Setup: Propose, admit, execute
    const proposeRes = await apiApp.inject({
      method: 'POST',
      url: '/v1/omega/commands',
      payload: {
        prompt: 'Reconciliation test slice',
        requestedBy: 'operator:c6-tester',
        requestedWorkers: ['worker-observer'],
      },
    });
    const cmdId = JSON.parse(proposeRes.body).command.commandId;
    await apiApp.inject({ method: 'POST', url: `/v1/omega/commands/${cmdId}/admit` });
    await apiApp.inject({ method: 'POST', url: `/v1/omega/commands/${cmdId}/execute` });

    // 29b. Attempt reality verification before attaching observation -> UNKNOWN
    const verifyBeforeObs = await apiApp.inject({
      method: 'POST',
      url: `/v1/omega/commands/${cmdId}/verify-reality`,
    });
    assert.strictEqual(verifyBeforeObs.statusCode, 200);
    const verifyBeforeData = JSON.parse(verifyBeforeObs.body);
    assert.strictEqual(verifyBeforeData.verdict, 'UNKNOWN');
    assert.strictEqual(verifyBeforeData.command.status, 'UNKNOWN');

    // 29c. Attach valid matching observation
    const obsRes = await apiApp.inject({
      method: 'POST',
      url: `/v1/omega/commands/${cmdId}/observe`,
      payload: {
        observerType: 'state_snapshot',
        target: 'read_only_intent_record',
        observedData: { isClean: true, statusText: 'clean' },
      },
    });
    assert.strictEqual(obsRes.statusCode, 200);

    // 29d. Verify reality with matching observation -> VERIFIED
    const verifyAfterObs = await apiApp.inject({
      method: 'POST',
      url: `/v1/omega/commands/${cmdId}/verify-reality`,
    });
    assert.strictEqual(verifyAfterObs.statusCode, 200);
    const verifyAfterData = JSON.parse(verifyAfterObs.body);
    assert.strictEqual(verifyAfterData.verdict, 'VERIFIED');
    assert.strictEqual(verifyAfterData.command.status, 'VERIFIED');
    assert.strictEqual(verifyAfterData.result.realityVerdict.receiptVerified, true);
    assert.ok(verifyAfterData.result.realityVerdict.stateDiffSummary);

    // 29e. Prove non-collapse of divergence: if observer reports failure -> DIVERGENT
    const divergentCmdRes = await apiApp.inject({
      method: 'POST',
      url: '/v1/omega/commands',
      payload: {
        prompt: 'Divergence check slice',
        requestedBy: 'operator:c6-tester',
        requestedWorkers: ['worker-observer'],
      },
    });
    const divCmdId = JSON.parse(divergentCmdRes.body).command.commandId;
    await apiApp.inject({ method: 'POST', url: `/v1/omega/commands/${divCmdId}/admit` });
    await apiApp.inject({ method: 'POST', url: `/v1/omega/commands/${divCmdId}/execute` });
    await apiApp.inject({
      method: 'POST',
      url: `/v1/omega/commands/${divCmdId}/observe`,
      payload: {
        observerType: 'api_health',
        target: 'api_health',
        observedData: { failed: true, error: 'Connection refused on socket' },
      },
    });

    const divVerifyRes = await apiApp.inject({
      method: 'POST',
      url: `/v1/omega/commands/${divCmdId}/verify-reality`,
    });
    const divVerifyData = JSON.parse(divVerifyRes.body);
    assert.strictEqual(divVerifyData.verdict, 'DIVERGENT');
    assert.strictEqual(divVerifyData.command.status, 'DIVERGENT');
    assert.ok(divVerifyData.result.realityVerdict.discrepancies.length > 0);
  });
});
