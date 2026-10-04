import crypto from 'node:crypto';
import type {
  IObservation,
  IEvidence,
  ObservationEnvelope,
  VerificationPredicate,
  VerificationReceipt,
} from '@oceanicos/types';

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

/** Declarative, fail-closed verification for canonical observation envelopes. */
export class DeclarativeVerificationEngine {
  private readonly activeRules = new Map<string, (payload: unknown) => boolean>();

  constructor() {
    this.registerRule('RULE_ACCELERATOR_INVENTORY', (payload) => this.numberField(payload, 'acceleratorInventory') > 500000);
    this.registerRule('RULE_SILICON_YIELD', (payload) => this.numberField(payload, 'siliconYield') >= 0.92);
  }

  public registerRule(id: string, predicateEvaluator: (payload: unknown) => boolean): void {
    if (!/^[A-Z0-9_:-]{1,128}$/.test(id)) throw new Error('verification rule id is invalid');
    if (this.activeRules.size >= 64 && !this.activeRules.has(id)) throw new Error('verification rule limit exceeded');
    this.activeRules.set(id, predicateEvaluator);
  }

  public async evaluateObservation(envelope: ObservationEnvelope): Promise<VerificationReceipt> {
    const passedPredicates: VerificationPredicate[] = [];
    const failedPredicates: VerificationPredicate[] = [];
    let status: VerificationReceipt['status'] = 'VERIFIED';

    for (const [ruleId, evaluator] of this.activeRules) {
      const evidencePath = `mem://evidence/obs-${envelope.id}/${ruleId}`;
      try {
        const evaluatedTrue = evaluator(envelope.payload);
        const predicate: VerificationPredicate = {
          ruleId,
          expression: evaluator.toString(),
          evaluatedTrue,
          evidencePath,
        };
        (evaluatedTrue ? passedPredicates : failedPredicates).push(predicate);
        if (!evaluatedTrue) status = 'DIVERGENT';
      } catch {
        failedPredicates.push({ ruleId, expression: evaluator.toString(), evaluatedTrue: false, evidencePath });
        status = 'UNKNOWN';
      }
    }

    const digestSource = JSON.stringify({ observationId: envelope.id, passedPredicates, failedPredicates, status });
    const digest = crypto.createHash('sha256').update(digestSource).digest('hex');
    return { observationId: envelope.id, verifiedAt: new Date().toISOString(), status, passedPredicates, failedPredicates, digest };
  }

  private numberField(payload: unknown, field: string): number {
    if (!payload || typeof payload !== 'object') throw new Error('payload is not an object');
    const value = (payload as Record<string, unknown>)[field];
    if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`payload field ${field} is missing or invalid`);
    return value;
  }
}

export * from './frontier.js';
export * from './asymmetric.js';
export * from './regional-mesh.js';
