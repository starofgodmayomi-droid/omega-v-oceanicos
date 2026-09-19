import { createHash } from 'node:crypto';
import { AttestationService, type AttestationConfig } from './index.js';
import type { RealityAttestation, RealityVerificationStatus } from '@oceanicos/types';

export interface RealityAttestationInput {
  readonly changeId: string;
  readonly executionAttestationId?: string;
  readonly realityStatus: RealityVerificationStatus;
  readonly expectedState?: string;
  readonly observedState?: string;
  readonly evidence: string;
  readonly observedAt: string;
}

export interface RealityAttestationOptions {
  readonly attestedBy?: string;
  readonly attestedAt?: string;
}

/**
 * C7: bind a completed C6 reality reconciliation to a cryptographic
 * attestation without pretending that execution itself proved reality.
 *
 * The canonical payload is deliberately ordered and excludes the generated
 * id, key fingerprint, public key, and mutable status so those fields cannot
 * be used to change the meaning of an already-signed reality result.
 */
export class RealityAttestationService {
  private readonly signer: AttestationService;

  constructor(config?: AttestationConfig | string, keyVersion?: string) {
    this.signer = new AttestationService(config, keyVersion);
  }

  public attest(input: RealityAttestationInput, options: RealityAttestationOptions = {}): RealityAttestation {
    if ((input.realityStatus as string) === 'NOT_EXECUTED') {
      throw new Error('NOT_EXECUTED cannot receive a reality attestation');
    }
    if (!input.changeId.trim()) throw new Error('changeId is required');
    if (!input.evidence.trim()) throw new Error('reality evidence is required');
    if (input.realityStatus === 'VERIFIED' && input.observedState !== input.expectedState) {
      throw new Error('VERIFIED reality attestation requires observedState to match expectedState');
    }

    const attestedAt = options.attestedAt ?? new Date().toISOString();
    const attestedBy = options.attestedBy ?? 'reality-attestation-service';
    const keyInfo = this.signer.getKeyInfo();
    const payload = {
      changeId: input.changeId,
      executionAttestationId: input.executionAttestationId ?? null,
      realityStatus: input.realityStatus,
      expectedState: input.expectedState ?? null,
      observedState: input.observedState ?? null,
      evidence: input.evidence,
      observedAt: input.observedAt,
      attestedAt,
      attestedBy,
      keyVersion: keyInfo.version,
    };
    const signature = this.signer.signPayload(payload);
    const id = 'reality-attestation-' + createHash('sha256').update(JSON.stringify(payload)).digest('hex');

    return {
      id,
      changeId: input.changeId,
      ...(input.executionAttestationId ? { executionAttestationId: input.executionAttestationId } : {}),
      realityStatus: input.realityStatus,
      ...(input.expectedState !== undefined ? { expectedState: input.expectedState } : {}),
      ...(input.observedState !== undefined ? { observedState: input.observedState } : {}),
      evidence: input.evidence,
      observedAt: input.observedAt,
      attestedAt,
      attestedBy,
      signingKey: keyInfo.fingerprint,
      keyVersion: keyInfo.version,
      signingAlgorithm: keyInfo.algorithm,
      signature,
      ...(keyInfo.publicKey ? { verifyingPublicKey: keyInfo.publicKey } : {}),
      status: 'signed',
    };
  }

  public verify(attestation: RealityAttestation): boolean {
    if (attestation.status !== 'signed') return false;
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
    return this.signer.verifyPayload(payload, attestation.signature, attestation.keyVersion, attestation.signingAlgorithm);
  }
}
