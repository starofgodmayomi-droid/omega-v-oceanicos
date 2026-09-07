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
