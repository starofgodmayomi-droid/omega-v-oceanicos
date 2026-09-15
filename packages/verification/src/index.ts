import crypto from 'node:crypto';
import type { IObservation, IEvidence } from '@oceanicos/types';

type AttestationProfile = 'flash' | 'pro';

function canonicalAttestationPayload(
  telemetryUuid: string,
  status: IEvidence['status'],
  profile: AttestationProfile
): string {
  return `${telemetryUuid}:${status}:${profile}`;
}

export class VerificationEngine {
  public static evaluate(telemetry: IObservation, privateKeyPem?: string): IEvidence {
    const scale = telemetry.acceleratorInventory > 500000;
    const independence = telemetry.siliconYield >= 0.92;
    const status: IEvidence['status'] = scale && independence ? 'PASS' : 'DIVERGENT';
    const profile: AttestationProfile = 'pro';
    const signingKey = privateKeyPem ?? process.env.OMEGA_PRIVATE_KEY;
    const proof = signingKey
      ? crypto
          .sign(
            null,
            Buffer.from(canonicalAttestationPayload(telemetry.uuid, status, profile)),
            crypto.createPrivateKey({ key: signingKey, format: 'pem' })
          )
          .toString('hex')
      : crypto
          .createHash('sha256')
          .update(`${telemetry.uuid}-${status}`)
          .digest('hex');
    return {
      status,
      lawRoute: '0 ➔ MINI ➔ FULL_STACK ➔ ECOSYSTEM',
      timestamp: new Date().toISOString(),
      observationUuid: telemetry.uuid,
      signatureProof: proof,
    };
  }

  /** Verify a proof without access to the private signing key. */
  public static verifyAttestation(
    telemetryUuid: string,
    status: IEvidence['status'],
    profile: AttestationProfile,
    signatureHex: string,
    publicKeyPem: string
  ): boolean {
    try {
      return crypto.verify(
        null,
        Buffer.from(canonicalAttestationPayload(telemetryUuid, status, profile)),
        crypto.createPublicKey({ key: publicKeyPem, format: 'pem' }),
        Buffer.from(signatureHex, 'hex')
      );
    } catch {
      return false;
    }
  }
}

export * from './frontier.js';
export * from './asymmetric.js';
export * from './regional-mesh.js';
