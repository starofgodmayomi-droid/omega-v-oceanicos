import { ObserverEngine } from '@oceanicos/observer';
import { VerificationEngine } from '@oceanicos/verification';
import type { OmegaChangeRecord } from '@oceanicos/types';

/**
 * Observe a candidate change without granting authority or executing it.
 *
 * The current MINI kernel has observation + evidence, but no repository-wide
 * authority/policy engine. Therefore this adapter deliberately returns REVIEW
 * and authorized=false. A PASS from verification is evidence, not permission.
 */
export function observeCandidateChange(input: {
  subject: string;
  intent: string;
  stateBefore: string;
  context?: Record<string, unknown>;
}): OmegaChangeRecord {
  const observation = ObserverEngine.generateTelemetry();
  const evidence = VerificationEngine.evaluate(observation);
  const createdAt = new Date().toISOString();

  return {
    id: `change-${observation.uuid}`,
    subject: input.subject,
    intent: input.intent,
    stateBefore: input.stateBefore,
    evidence: [evidence.signatureProof, evidence.lawRoute, evidence.status],
    authority: null,
    policy: null,
    context: input.context,
    decision: 'REVIEW',
    authorized: false,
    provenance: {
      source: 'mini-observation',
      observedAt: observation.timestamp,
      attributedTo: null,
      lineage: [observation.uuid],
    },
    createdAt,
  };
}
