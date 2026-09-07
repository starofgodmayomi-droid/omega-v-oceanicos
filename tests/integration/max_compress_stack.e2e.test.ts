import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ObserverEngine } from '../../packages/observer/dist/index.js';
import {
  verifyPlanetarySovereignty,
  AsymmetricValidationGuard,
  MultiRegionMeshConvergence,
} from '../../packages/verification/dist/index.js';
import { PluralisticHashChain, RememberEngine } from '../../packages/remember/dist/index.js';
import { MiniKernel, executeOceanicosMaxExpansion } from '../../packages/mini/dist/index.js';

describe('Ω∞v Oceanicos Max Compress Full-Stack E2E Suite', () => {
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
});
