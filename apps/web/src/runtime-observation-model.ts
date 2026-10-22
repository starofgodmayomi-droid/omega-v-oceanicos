export interface RuntimeObservationInput {
  streamConnected: boolean;
  tipHash?: string | null;
  tipTimestamp?: string | number | null;
  evidenceStatus?: string | null;
  ledgerIntegrity?: {
    valid: boolean;
    height: number;
    reason?: string;
  } | null;
  historyCount: number;
  simulationMode: boolean;
  commandId?: string | null;
  commandStatus?: string | null;
  admissionDecision?: string | null;
  realityClassification?: string | null;
}

export interface RuntimeObservationRow {
  label: string;
  value: string;
}

export interface RuntimeObservationSummary {
  streamConnected: boolean;
  rows: RuntimeObservationRow[];
}

function displayValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return 'Unavailable';
  return String(value);
}

/**
 * Summarizes observed dashboard state only. It does not infer successful
 * execution or turn transport connectivity into evidence verification.
 */
export function summarizeRuntimeObservation(input: RuntimeObservationInput): RuntimeObservationSummary {
  const hash = input.tipHash ? input.tipHash : null;
  const ledger = input.ledgerIntegrity
    ? `${input.ledgerIntegrity.valid ? 'Integrity valid' : 'Integrity invalid'} · height ${input.ledgerIntegrity.height}`
    : 'Unavailable';

  return {
    streamConnected: input.streamConnected,
    rows: [
      { label: 'Latest record', value: hash ? (hash.length > 16 ? `${hash.slice(0, 16)}…` : hash) : 'Unavailable' },
      { label: 'Record timestamp', value: displayValue(input.tipTimestamp) },
      { label: 'Evidence status', value: displayValue(input.evidenceStatus) },
      { label: 'Ledger integrity', value: ledger },
      { label: 'Retained history', value: String(Math.max(0, input.historyCount)) },
      { label: 'Simulation flag', value: input.simulationMode ? 'Enabled' : 'Disabled' },
      { label: 'Omega command ID', value: displayValue(input.commandId) },
      { label: 'Command status', value: displayValue(input.commandStatus) },
      { label: 'Admission decision', value: displayValue(input.admissionDecision) },
      { label: 'Reality classification', value: displayValue(input.realityClassification) },
    ],
  };
}
