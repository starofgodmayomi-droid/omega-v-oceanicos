/**
 * KAI's Shield — a fail-closed admission gate for supplied intents.
 *
 * This repository holds no attested scam-detection model, so the shield does not
 * claim to classify intent. It returns REVIEW and grants no authority, in the
 * same posture as `observeCandidateChange` in `@oceanicos/mini`: a PASS from
 * verification is evidence, never permission. Human authority decides.
 */
export type IntentScreeningDecision = 'REVIEW';

export interface IntentScreeningInput {
  readonly intent: string;
  readonly subject: string;
  /** Signals the caller can attest to; the shield records them, it does not trust them. */
  readonly attestedSignals?: readonly string[];
}

export interface IntentScreening {
  readonly decision: IntentScreeningDecision;
  readonly authorized: false;
  readonly intent: string;
  readonly subject: string;
  readonly attestedSignals: readonly string[];
  readonly unknowns: readonly string[];
  readonly reason: string;
}

export const screenIntent = (input: IntentScreeningInput): IntentScreening => ({
  decision: 'REVIEW',
  authorized: false,
  intent: input.intent,
  subject: input.subject,
  attestedSignals: input.attestedSignals ?? [],
  unknowns: ['no attested scam classification exists in this repository'],
  reason: 'KAI holds no attested scam model; the shield returns REVIEW and grants no authority.',
});
