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

export * from './scene.js';

export type SceneState =
  | 'darkness'
  | 'possibility'
  | 'ocean'
  | 'star'
  | 'water-form'
  | 'many-forms'
  | 'loneliness'
  | 'human-form'
  | 'misrecognition'
  | 'boundary'
  | 'question'
  | 'forest'
  | 'return';

export type SceneSimulationInput = {
  seed?: string;
  steps?: number;
  branches?: number;
};

export type SceneTrace = Array<{
  sequence: number;
  state: SceneState;
  from: SceneState | null;
  to: SceneState;
  transition: 'origin' | 'advance';
  status: 'observed' | 'verified';
  evidence: string;
}>;

export type SceneBranch = {
  id: string;
  index: number;
  perspective: string;
  states: SceneState[];
  terminalState: SceneState;
  trace: SceneTrace;
  divergenceEvidence: string;
};

export interface SceneSimulation {
  id: string;
  seed: string;
  equation: string;
  states: SceneState[];
  terminalState: SceneState;
  trace: SceneTrace;
  branches: SceneBranch[];
  branchCount: number;
  continuation: 'bounded-sample-of-infinite-potential';
  provenance: {
    source: 'local-simulation';
    ruleVersion: 'scene-equation.v2';
    deterministic: true;
    verified: false;
    note: string;
  };
  createdAt: string;
}
