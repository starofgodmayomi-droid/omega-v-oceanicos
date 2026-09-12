export interface IObservation {
  readonly uuid: string;
  readonly timestamp: string;
  readonly siliconYield: number;
  readonly gridLoadMegawatts: number;
  readonly acceleratorInventory: number;
}

export interface IEvidence {
  readonly status: 'PASS' | 'FAIL' | 'DIVERGENT';
  readonly lawRoute: string;
  readonly timestamp: string;
  readonly observationUuid: string;
  readonly signatureProof: string;
}

export interface IMiniBlock {
  readonly index: number;
  readonly timestamp: string;
  readonly observation: IObservation;
  readonly evidence: IEvidence;
  readonly previousHash: string;
  readonly hash: string;
  readonly nonce: number;
}

export interface VerificationResultSummary {
  readonly passed: boolean;
  readonly confidence: number;
  readonly rulesApplied?: number;
  readonly rulesPassed?: number;
  readonly rulesFailed?: number;
}

export interface VerificationResult {
  readonly id: string;
  readonly observationId: string;
  readonly timestamp?: string;
  readonly summary: VerificationResultSummary;
  readonly ruleVersions?: Record<string, string>;
  readonly status?: 'pending' | 'completed' | 'failed';
}

export interface Attestation {
  id: string;
  verificationId: string;
  observationId: string;
  verified: boolean;
  confidence: number;
  signature: string;
  signingKey: string;
  keyVersion: string;
  signingAlgorithm: string;
  attestedAt: string;
  attestedBy: string;
  ruleVersions?: Record<string, string>;
  verifyingPublicKey?: string;
  status: 'signed' | 'revoked' | 'expired';
}
