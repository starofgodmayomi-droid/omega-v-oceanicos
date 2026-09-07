export interface IObservation {
  uuid: string;
  timestamp: string;
  siliconYield: number;
  gridLoadMegawatts: number;
  acceleratorInventory: number;
}

export interface IEvidence {
  status: 'PASS' | 'FAIL' | 'DIVERGENT';
  lawRoute: string;
  timestamp: string;
  observationUuid: string;
  signatureProof: string;
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
