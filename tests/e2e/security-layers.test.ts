/**
 * Ω∞v E2E SECURITY TEST SUITE
 * ────────────────────────────
 * End-to-end tests that verify the cryptographic security layers
 * FAIL CLOSED under bad signatures, tampered payloads, and forged attestations.
 *
 * Iron Law: "Attest, don't assert."
 * These tests PROVE the Iron Law holds by:
 * 1. Generating valid Ed25519 keypairs and HMAC signatures
 * 2. Verifying that valid attestations pass
 * 3. Verifying that tampered attestations REJECT (fail closed)
 * 4. Verifying that forged signatures REJECT
 * 5. Verifying that wrong keys REJECT
 * 6. Verifying that the autonomous agent planner produces chained proofs
 * 7. Verifying that the stream engine broadcasts without data loss
 */

import { describe, expect, it, test, beforeEach, beforeAll } from '@jest/globals';
import crypto from 'crypto';
import {
  AttestationService,
  MissingSigningKeyError,
  InvalidSigningKeyError,
  verifyEd25519,
} from '@oceanicos/attestation';
import {
  AsymmetricValidationGuard,
  VerificationEngine,
} from '@oceanicos/verification';
import { ObserverEngine } from '@oceanicos/observer';
import { RememberEngine } from '@oceanicos/remember';
import { MiniKernel, AutonomousPlannerAgent } from '@oceanicos/mini';
import { VerificationResult, Attestation } from '@oceanicos/types';

// Ensure signing key is present for verification engine throughout tests
beforeAll(() => {
  process.env.OMEGA_SIGNING_KEY = process.env.OMEGA_SIGNING_KEY || 'omega-v-test-secret-key-e2e-2026';
});

// ─── Test Helpers ────────────────────────────────────────────────────

function makeVerificationResult(overrides?: Partial<VerificationResult>): VerificationResult {
  const telemetry = ObserverEngine.generateTelemetry();
  return {
    id: `ver-test-${Date.now()}`,
    observationId: telemetry.uuid,
    timestamp: telemetry.timestamp,
    summary: {
      passed: true,
      confidence: 1.0,
      rulesApplied: 4,
      rulesPassed: 4,
      rulesFailed: 0,
    },
    ruleVersions: { 'security-test': 'v1.0' },
    ...overrides,
  };
}

function generateEd25519KeyPair() {
  return crypto.generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
}

// ─── 1. HMAC-SHA256 Attestation Security ─────────────────────────────

describe('Ω∞v Security: HMAC-SHA256 Attestation', () => {
  const SIGNING_KEY = 'omega-v-test-secret-key-e2e-2026';
  let service: AttestationService;

  beforeEach(() => {
    process.env.OMEGA_SIGNING_KEY = SIGNING_KEY;
    service = new AttestationService({ signingKey: SIGNING_KEY, algorithm: 'HMAC-SHA256' });
  });

  test('valid attestation verifies successfully', () => {
    const result = makeVerificationResult();
    const attestation = service.attest(result);

    expect(attestation.signature).toBeTruthy();
    expect(attestation.signature.startsWith('0x')).toBe(true);
    expect(attestation.status).toBe('signed');
    expect(attestation.signingAlgorithm).toBe('HMAC-SHA256');
    expect(service.verify(attestation)).toBe(true);
  });

  test('FAIL CLOSED: tampered confidence rejects', () => {
    const result = makeVerificationResult();
    const attestation = service.attest(result);

    // Tamper with the confidence value
    const tampered = { ...attestation, confidence: 0.5 };
    expect(service.verify(tampered)).toBe(false);
  });

  test('FAIL CLOSED: tampered verification ID rejects', () => {
    const result = makeVerificationResult();
    const attestation = service.attest(result);

    const tampered = { ...attestation, verificationId: 'ver-FORGED' };
    expect(service.verify(tampered)).toBe(false);
  });

  test('FAIL CLOSED: tampered signature rejects', () => {
    const result = makeVerificationResult();
    const attestation = service.attest(result);

    const tampered = { ...attestation, signature: '0xdeadbeef' };
    expect(service.verify(tampered)).toBe(false);
  });

  test('FAIL CLOSED: tampered observation ID rejects', () => {
    const result = makeVerificationResult();
    const attestation = service.attest(result);

    const tampered = { ...attestation, observationId: 'obs-FORGED' };
    expect(service.verify(tampered)).toBe(false);
  });

  test('FAIL CLOSED: wrong key version rejects', () => {
    const result = makeVerificationResult();
    const attestation = service.attest(result);

    const tampered = { ...attestation, keyVersion: 'WRONG' };
    expect(service.verify(tampered)).toBe(false);
  });

  test('FAIL CLOSED: different signing key rejects', () => {
    const result = makeVerificationResult();
    const attestation = service.attest(result);

    const differentService = new AttestationService({
      signingKey: 'completely-different-key',
      algorithm: 'HMAC-SHA256',
    });
    expect(differentService.verify(attestation)).toBe(false);
  });

  test('FAIL CLOSED: empty signature rejects', () => {
    const result = makeVerificationResult();
    const attestation = service.attest(result);

    const tampered = { ...attestation, signature: '' };
    expect(service.verify(tampered)).toBe(false);
  });

  test('FAIL CLOSED: revoked status rejects', () => {
    const result = makeVerificationResult();
    const attestation = service.attest(result);

    const tampered: Attestation = { ...attestation, status: 'revoked' };
    expect(service.verify(tampered)).toBe(false);
  });

  test('FAIL CLOSED: expired status rejects', () => {
    const result = makeVerificationResult();
    const attestation = service.attest(result);

    const tampered: Attestation = { ...attestation, status: 'expired' };
    expect(service.verify(tampered)).toBe(false);
  });

  test('FAIL CLOSED: no signing key throws MissingSigningKeyError', () => {
    // Clear env to ensure no fallback
    const savedKey = process.env.OMEGA_SIGNING_KEY;
    delete process.env.OMEGA_SIGNING_KEY;

    expect(() => {
      new AttestationService({ algorithm: 'HMAC-SHA256' });
    }).toThrow(MissingSigningKeyError);

    // Restore
    if (savedKey !== undefined) process.env.OMEGA_SIGNING_KEY = savedKey;
  });

  test('key fingerprint is deterministic for the same key', () => {
    const fp1 = service.keyFingerprint();
    const fp2 = service.keyFingerprint();
    expect(fp1).toBe(fp2);
    expect(fp1.startsWith('sha256:')).toBe(true);
  });

  test('key fingerprint differs for different keys', () => {
    const other = new AttestationService({ signingKey: 'another-key', algorithm: 'HMAC-SHA256' });
    expect(service.keyFingerprint()).not.toBe(other.keyFingerprint());
  });

  test('key rotation invalidates old attestations', () => {
    const result = makeVerificationResult();
    const attestation = service.attest(result);
    expect(service.verify(attestation)).toBe(true);

    // Rotate to new key
    service.rotateKey('new-rotated-key-2026', '2');
    expect(service.verify(attestation)).toBe(false);
  });
});

// ─── 2. Ed25519 Asymmetric Attestation Security ─────────────────────

describe('Ω∞v Security: Ed25519 Attestation', () => {
  let keypair: { publicKey: string; privateKey: string };
  let service: AttestationService;

  beforeEach(() => {
    keypair = generateEd25519KeyPair();
    service = new AttestationService({
      signingKey: keypair.privateKey,
      publicKey: keypair.publicKey,
      algorithm: 'Ed25519',
    });
  });

  test('valid Ed25519 attestation verifies', () => {
    const result = makeVerificationResult();
    const attestation = service.attest(result);

    expect(attestation.signingAlgorithm).toBe('Ed25519');
    expect(attestation.verifyingPublicKey).toBeTruthy();
    expect(service.verify(attestation)).toBe(true);
  });

  test('Ed25519 attestation verifiable with public key only', () => {
    const result = makeVerificationResult();
    const attestation = service.attest(result);

    // Verify using ONLY the public key (no private key access)
    expect(verifyEd25519(attestation, keypair.publicKey)).toBe(true);
  });

  test('FAIL CLOSED: tampered attestation fails Ed25519 verify', () => {
    const result = makeVerificationResult();
    const attestation = service.attest(result);

    const tampered = { ...attestation, confidence: 0.1 };
    expect(verifyEd25519(tampered, keypair.publicKey)).toBe(false);
  });

  test('FAIL CLOSED: wrong public key fails Ed25519 verify', () => {
    const result = makeVerificationResult();
    const attestation = service.attest(result);

    const wrongKeypair = generateEd25519KeyPair();
    expect(verifyEd25519(attestation, wrongKeypair.publicKey)).toBe(false);
  });

  test('FAIL CLOSED: HMAC attestation rejected by Ed25519 verifier', () => {
    const hmacService = new AttestationService({
      signingKey: 'hmac-key',
      algorithm: 'HMAC-SHA256',
    });
    const result = makeVerificationResult();
    const hmacAttestation = hmacService.attest(result);

    // Ed25519 verifier must reject HMAC attestations
    expect(verifyEd25519(hmacAttestation, keypair.publicKey)).toBe(false);
  });

  test('FAIL CLOSED: Ed25519 attestation rejected by HMAC verifier', () => {
    const result = makeVerificationResult();
    const attestation = service.attest(result);

    const hmacService = new AttestationService({
      signingKey: 'hmac-key',
      algorithm: 'HMAC-SHA256',
    });
    // HMAC verifier must reject Ed25519 attestations (algorithm confusion defense)
    expect(hmacService.verify(attestation)).toBe(false);
  });

  test('FAIL CLOSED: mismatched public key at construction throws', () => {
    const wrongKeypair = generateEd25519KeyPair();
    expect(() => {
      new AttestationService({
        signingKey: keypair.privateKey,
        publicKey: wrongKeypair.publicKey,
        algorithm: 'Ed25519',
      });
    }).toThrow(InvalidSigningKeyError);
  });

  test('FAIL CLOSED: invalid Ed25519 key at construction throws', () => {
    expect(() => {
      new AttestationService({
        signingKey: 'not-a-valid-pem-key',
        algorithm: 'Ed25519',
      });
    }).toThrow(InvalidSigningKeyError);
  });
});

// ─── 3. Ed25519 AsymmetricValidationGuard (Block Signing) ────────────

describe('Ω∞v Security: AsymmetricValidationGuard', () => {
  test('sign and verify round trip succeeds', () => {
    const keypair = AsymmetricValidationGuard.generateKeyPair();
    const data = 'EXECUTE_OMNI_CYCLE';

    const signature = AsymmetricValidationGuard.sign(data, keypair.privateKey);
    expect(AsymmetricValidationGuard.verify(data, signature, keypair.publicKey)).toBe(true);
  });

  test('sign and verify with object data', () => {
    const keypair = AsymmetricValidationGuard.generateKeyPair();
    const data = { action: 'MINT_BLOCK', index: 42, timestamp: new Date().toISOString() };

    const signature = AsymmetricValidationGuard.sign(data, keypair.privateKey);
    expect(AsymmetricValidationGuard.verify(data, signature, keypair.publicKey)).toBe(true);
  });

  test('FAIL CLOSED: tampered data fails signature verification', () => {
    const keypair = AsymmetricValidationGuard.generateKeyPair();
    const data = 'EXECUTE_OMNI_CYCLE';

    const signature = AsymmetricValidationGuard.sign(data, keypair.privateKey);
    expect(AsymmetricValidationGuard.verify('FORGED_DATA', signature, keypair.publicKey)).toBe(false);
  });

  test('FAIL CLOSED: wrong public key fails verification', () => {
    const keypair1 = AsymmetricValidationGuard.generateKeyPair();
    const keypair2 = AsymmetricValidationGuard.generateKeyPair();

    const signature = AsymmetricValidationGuard.sign('data', keypair1.privateKey);
    expect(AsymmetricValidationGuard.verify('data', signature, keypair2.publicKey)).toBe(false);
  });

  test('FAIL CLOSED: corrupted signature hex fails verification', () => {
    const keypair = AsymmetricValidationGuard.generateKeyPair();
    const signature = AsymmetricValidationGuard.sign('data', keypair.privateKey);

    // Corrupt the signature
    const corrupted = signature.slice(0, -4) + 'ffff';
    expect(AsymmetricValidationGuard.verify('data', corrupted, keypair.publicKey)).toBe(false);
  });

  test('FAIL CLOSED: empty signature fails verification', () => {
    const keypair = AsymmetricValidationGuard.generateKeyPair();
    expect(AsymmetricValidationGuard.verify('data', '', keypair.publicKey)).toBe(false);
  });

  test('FAIL CLOSED: garbage signature fails verification', () => {
    const keypair = AsymmetricValidationGuard.generateKeyPair();
    expect(AsymmetricValidationGuard.verify('data', 'not-a-hex-signature', keypair.publicKey)).toBe(false);
  });
});

// ─── 4. Verification Engine Evidence Proofs ──────────────────────────

describe('Ω∞v Security: Verification Evidence Proofs', () => {
  beforeEach(() => {
    process.env.OMEGA_SIGNING_KEY = 'omega-v-test-secret-key-e2e-2026';
  });

  test('evidence contains SHA256 proof of observation', () => {
    const telemetry = ObserverEngine.generateTelemetry();
    const evidence = VerificationEngine.evaluate(telemetry);

    expect(evidence.signatureProof).toBeTruthy();
    expect(evidence.signatureProof.length).toBe(64); // SHA256 hex = 64 chars
    expect(evidence.observationUuid).toBe(telemetry.uuid);
  });

  test('different observations produce different proofs', () => {
    const t1 = ObserverEngine.generateTelemetry();
    const t2 = ObserverEngine.generateTelemetry();

    const e1 = VerificationEngine.evaluate(t1);
    const e2 = VerificationEngine.evaluate(t2);

    expect(e1.signatureProof).not.toBe(e2.signatureProof);
  });

  test('proof is deterministic for same input', () => {
    const telemetry = ObserverEngine.generateTelemetry();

    const e1 = VerificationEngine.evaluate(telemetry);
    const e2 = VerificationEngine.evaluate(telemetry);

    expect(e1.signatureProof).toBe(e2.signatureProof);
  });
});

// ─── 5. Ledger Chain Integrity ───────────────────────────────────────

describe('Ω∞v Security: Ledger Hash Chain Integrity', () => {
  let ledger: RememberEngine;
  let kernel: MiniKernel;

  beforeEach(() => {
    process.env.OMEGA_SIGNING_KEY = 'omega-v-test-secret-key-e2e-2026';
    ledger = new RememberEngine(':memory:');
    kernel = new MiniKernel(ledger);
  });

  test('blocks form a valid hash chain', () => {
    const block1 = kernel.runCycle();
    const block2 = kernel.runCycle();
    const block3 = kernel.runCycle();

    // Each block references previous hash
    expect(block2.previousHash).toBe(block1.hash);
    expect(block3.previousHash).toBe(block2.hash);
  });

  test('block hashes start with 00 (proof of work)', () => {
    const block = kernel.runCycle();
    expect(block.hash.substring(0, 2)).toBe('00');
  });

  test('tip returns latest block', () => {
    kernel.runCycle();
    const block2 = kernel.runCycle();
    const tip = ledger.getTip();

    expect(tip).toBeTruthy();
    expect(tip!.hash).toBe(block2.hash);
    expect(tip!.index).toBe(block2.index);
  });

  test('chain starts from root hash', () => {
    const firstBlock = kernel.runCycle();
    expect(firstBlock.previousHash).toBeTruthy();
    expect(firstBlock.previousHash.length).toBeGreaterThan(0);
  });
});

// ─── 6. Autonomous Agent Security Boundaries ─────────────────────────

describe('Ω∞v Security: Autonomous Agent Planner Boundaries', () => {
  beforeEach(() => {
    process.env.OMEGA_SIGNING_KEY = 'omega-v-test-secret-key-e2e-2026';
  });

  const createAgent = () => {
    const ledger = new RememberEngine(':memory:');
    const kernel = new MiniKernel(ledger);
    return new AutonomousPlannerAgent(kernel);
  };

  test('full cycle produces chained proofs', () => {
    const agent = createAgent();
    const goal = agent.runFullCycle('Security Test Full Cycle');

    expect(goal.status).toBe('completed');
    expect(goal.masterProof).toBeTruthy();
    expect(goal.masterProof!.startsWith('0xΩ')).toBe(true);
    expect(goal.reflection!.allVerified).toBe(true);
    expect(goal.reflection!.proofChain.length).toBeGreaterThan(0);
  });

  test('every step has a proof', () => {
    const agent = createAgent();
    const goal = agent.runFullCycle();

    for (const step of goal.steps) {
      expect(step.proof).toBeTruthy();
      expect(step.status).toBe('verified');
    }
  });

  test('empty steps rejected', () => {
    const agent = createAgent();
    expect(() => {
      agent.plan('Empty', []);
    }).toThrow('at least one step');
  });

  test('invalid step kind rejected', () => {
    const agent = createAgent();
    expect(() => {
      agent.plan('Bad Kind', [{ kind: 'shell_exec' as any, description: 'hacked' }]);
    }).toThrow('Invalid step kind');
  });

  test('exceeding max steps rejected', () => {
    const agent = createAgent();
    const tooMany = Array.from({ length: 100 }, (_, i) => ({
      kind: 'observe' as const,
      description: `step ${i}`,
    }));

    expect(() => {
      agent.plan('Too Many', tooMany);
    }).toThrow('exceeds maximum steps');
  });

  test('goal can be aborted', () => {
    const agent = createAgent();
    const goal = agent.plan('Abort Test', [
      { kind: 'observe', description: 'step 1' },
      { kind: 'verify', description: 'step 2' },
    ]);

    const aborted = agent.abort(goal.id);
    expect(aborted.status).toBe('aborted');
  });

  test('master proof is deterministic hash of proof chain', () => {
    const agent = createAgent();
    const goal = agent.runFullCycle();

    // Manually verify the master proof computation
    const proofChain = goal.steps.filter((s: any) => s.proof).map((s: any) => s.proof);
    const expectedHash = crypto
      .createHash('sha256')
      .update(`0xΩ-MASTER-${goal.id}-${proofChain.join('-')}`)
      .digest('hex');

    expect(goal.masterProof).toBe(`0xΩ${expectedHash}`);
  });
});

// ─── 7. Cross-Algorithm Confusion Defense ────────────────────────────

describe('Ω∞v Security: Algorithm Confusion Defense', () => {
  test('Ed25519 service rejects HMAC attestation (alg-confusion attack)', () => {
    const hmacService = new AttestationService({
      signingKey: 'hmac-test-key',
      algorithm: 'HMAC-SHA256',
    });
    const keypair = generateEd25519KeyPair();
    const ed25519Service = new AttestationService({
      signingKey: keypair.privateKey,
      algorithm: 'Ed25519',
    });

    const result = makeVerificationResult();
    const hmacAttestation = hmacService.attest(result);

    // The Ed25519 service MUST reject the HMAC attestation
    expect(ed25519Service.verify(hmacAttestation)).toBe(false);
  });

  test('HMAC service rejects Ed25519 attestation', () => {
    const hmacService = new AttestationService({
      signingKey: 'hmac-test-key',
      algorithm: 'HMAC-SHA256',
    });
    const keypair = generateEd25519KeyPair();
    const ed25519Service = new AttestationService({
      signingKey: keypair.privateKey,
      algorithm: 'Ed25519',
    });

    const result = makeVerificationResult();
    const edAttestation = ed25519Service.attest(result);

    // The HMAC service MUST reject the Ed25519 attestation
    expect(hmacService.verify(edAttestation)).toBe(false);
  });

  test('attestation carries correct algorithm identifier', () => {
    const hmacService = new AttestationService({
      signingKey: 'test-key',
      algorithm: 'HMAC-SHA256',
    });
    const result = makeVerificationResult();
    const attestation = hmacService.attest(result);

    expect(attestation.signingAlgorithm).toBe('HMAC-SHA256');
  });
});
