export interface IPCState {
  cpu: number;
  ram: number;
  io: string;
  ts: string;
}

export interface INewsArticle {
  source: string;
  headline: string;
  timestamp: string;
  impactMetric: number;
}

export interface IHiggsfieldJob {
  jobId: string;
  modelType: string;
  status: 'pending' | 'completed' | 'failed';
  resultUrl?: string;
}

export interface IObservation {
  uuid: string;
  timestamp: string;
  siliconYield: number;
  gridLoadMegawatts: number;
  acceleratorInventory: number;
  hardwareState: IPCState;
  globalNewsFeed: INewsArticle[];
  higgsfieldTelemetry?: IHiggsfieldJob;
  androidAutomationState?: {
    deviceSerial: string;
    currentApp: string;
    screenshotHash: string;
  };
}

export interface IEvidence {
  status: 'PASS' | 'FAIL' | 'DIVERGENT';
  lawRoute: string;
  timestamp: string;
  observationUuid: string;
  signatureProof: string;
  mcpDiagnostics: {
    logcatAnomalyCount: number;
    stepDurationMs: number;
    profileExecuted: 'flash' | 'pro';
  };
}

export interface IMiniBlock {
  index: number;
  timestamp: string;
  observation: IObservation;
  evidence: IEvidence;
  previousHash: string;
  hash: string;
  nonce: number;
}

export interface ILiquidState {
  velocity: number;
  clarityVector: number;
  resonanceHz: number;
  blockAnchor: string;
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

