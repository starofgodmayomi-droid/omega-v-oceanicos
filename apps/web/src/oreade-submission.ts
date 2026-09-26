export type OreadSubmissionRequest = {
  symbolicIntent: string;
  requestedBy: string;
  targetScope: string[];
  stopCondition: string;
  expectedObservation: string;
};

export type OreadSubmissionPayload = OreadSubmissionRequest & {
  idempotencyKey: string;
};

export type OreadSubmissionIdentity = {
  fingerprint: string;
  idempotencyKey: string;
  sequence: number;
};

export const initialOreadSubmissionIdentity = (): OreadSubmissionIdentity => ({
  fingerprint: '',
  idempotencyKey: '',
  sequence: 0,
});

export function prepareOreadSubmission(
  request: OreadSubmissionRequest,
  current: OreadSubmissionIdentity,
  now = Date.now(),
): { payload: OreadSubmissionPayload; identity: OreadSubmissionIdentity } {
  const boundedRequest = {
    ...request,
    targetScope: [...request.targetScope],
  };
  const fingerprint = JSON.stringify(boundedRequest);
  if (current.fingerprint === fingerprint && current.idempotencyKey) {
    return { payload: { ...boundedRequest, idempotencyKey: current.idempotencyKey }, identity: current };
  }

  const sequence = current.sequence + 1;
  const identity = {
    fingerprint,
    idempotencyKey: `oreade-${now}-${sequence}`,
    sequence,
  };
  return { payload: { ...boundedRequest, idempotencyKey: identity.idempotencyKey }, identity };
}
