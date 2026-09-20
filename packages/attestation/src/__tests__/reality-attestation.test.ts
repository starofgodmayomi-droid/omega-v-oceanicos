import { describe, expect, it } from '@jest/globals';
import { generateKeyPairSync, verify as nodeVerify } from 'node:crypto';
import { RealityAttestationService } from '../reality';

describe('C7 reality attestation', () => {
  const keyPair = generateKeyPairSync('ed25519');
  const privateKey = keyPair.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
  const publicKey = keyPair.publicKey.export({ type: 'spki', format: 'pem' }).toString();

  const service = new RealityAttestationService({
    algorithm: 'Ed25519',
    signingKey: privateKey,
    publicKey,
    keyVersion: 'reality-v1',
  });

  it('attests VERIFIED reality and verifies the signed reconciliation', () => {
    const attestation = service.attest({
      changeId: 'change-1',
      executionAttestationId: 'attestation-execution-1',
      realityStatus: 'VERIFIED',
      expectedState: 'S1',
      observedState: 'S1',
      evidence: 'sha256:reality-proof',
      observedAt: '2026-09-19T22:00:00.000Z',
    }, { attestedBy: 'test', attestedAt: '2026-09-19T22:01:00.000Z' });

    expect(attestation.id).toMatch(/^reality-attestation-[a-f0-9]{64}$/);
    expect(attestation.signature).toMatch(/^0x[a-f0-9]{128}$/);
    expect(service.verify(attestation)).toBe(true);

    const payload = {
      changeId: attestation.changeId,
      executionAttestationId: attestation.executionAttestationId ?? null,
      realityStatus: attestation.realityStatus,
      expectedState: attestation.expectedState ?? null,
      observedState: attestation.observedState ?? null,
      evidence: attestation.evidence,
      observedAt: attestation.observedAt,
      attestedAt: attestation.attestedAt,
      attestedBy: attestation.attestedBy,
      keyVersion: attestation.keyVersion,
    };
    expect(nodeVerify(null, Buffer.from(JSON.stringify(payload)), publicKey, Buffer.from(attestation.signature.slice(2), 'hex'))).toBe(true);
  });

  it('attests UNKNOWN without upgrading uncertainty into verification', () => {
    const attestation = service.attest({
      changeId: 'change-unknown',
      realityStatus: 'UNKNOWN',
      expectedState: 'S1',
      evidence: 'observation unavailable; reality could not be verified',
      observedAt: '2026-09-19T22:02:00.000Z',
    });
    expect(attestation.realityStatus).toBe('UNKNOWN');
    expect(service.verify(attestation)).toBe(true);
  });

  it('rejects tampering and refuses NOT_EXECUTED', () => {
    const attestation = service.attest({
      changeId: 'change-2',
      realityStatus: 'DIVERGENT',
      expectedState: 'S1',
      observedState: 'S2',
      evidence: 'sha256:divergence-proof',
      observedAt: '2026-09-19T22:03:00.000Z',
    });
    expect(service.verify({ ...attestation, observedState: 'S1' })).toBe(false);
    expect(() => service.attest({
      changeId: 'change-3',
      realityStatus: 'NOT_EXECUTED' as any,
      evidence: 'not executed',
      observedAt: '2026-09-19T22:04:00.000Z',
    })).toThrow('NOT_EXECUTED');
  });
});
