export type RealityStatus = 'VERIFIED' | 'DIVERGENT' | 'UNKNOWN' | 'NOT_EXECUTED';
export const STATUS_ORDER: RealityStatus[] = ['VERIFIED', 'UNKNOWN', 'DIVERGENT', 'NOT_EXECUTED'];

export function boundedStatus(value: unknown): RealityStatus {
  const normalized = typeof value === 'string' ? value.trim().toUpperCase().replace(/\s+/g, '_') : '';
  return STATUS_ORDER.includes(normalized as RealityStatus) ? normalized as RealityStatus : 'UNKNOWN';
}

export function statusCounts(
  history: Array<{ evidence?: { status?: string } }>,
  current: unknown,
): Record<RealityStatus, number> {
  const counts = Object.fromEntries(STATUS_ORDER.map((status) => [status, 0])) as Record<RealityStatus, number>;
  const observed = [current, ...history.map((item) => item.evidence?.status)].filter(Boolean);
  if (observed.length === 0) counts.UNKNOWN = 1;
  for (const value of observed) counts[boundedStatus(value)] += 1;
  return counts;
}

export type LucidFieldSignal = {
  label: string;
  status: unknown;
  source: string;
};

export type LucidFieldSummary = {
  total: number;
  verifiedCount: number;
  unresolved: Array<{
    label: string;
    status: RealityStatus;
    source: string;
  }>;
  summaryText: string;
};

/** Summarize only the supplied, view-local signals; never infer unseen sources. */
export function summarizeLucidField(signals: readonly LucidFieldSignal[]): LucidFieldSummary {
  const normalized = signals.map((signal) => ({ ...signal, status: boundedStatus(signal.status) }));
  const verifiedCount = normalized.filter((signal) => signal.status === 'VERIFIED').length;
  const unresolved = normalized.filter((signal) => signal.status !== 'VERIFIED');
  const total = normalized.length;

  let summaryText: string;
  if (total === 0) {
    summaryText = 'No signals are available in this view.';
  } else if (unresolved.length === 0) {
    summaryText = `All ${total} listed signals are marked VERIFIED in this view.`;
  } else {
    summaryText = `${verifiedCount} of ${total} listed signals are marked VERIFIED in this view; ${unresolved.length} are not marked VERIFIED.`;
  }

  return { total, verifiedCount, unresolved, summaryText };
}


export type ElionIdentitySignalsInput = {
  streamConnected: boolean;
  realityStatus: unknown;
  ledgerIntegrity: { valid: boolean; height: number } | null;
  ecosystemStatus: unknown;
};

export type ElionIdentitySignal = {
  label: string;
  status: RealityStatus;
  source: string;
};

/** Map only current-view evidence into bounded ELION display states. */
export function deriveElionIdentitySignals(input: ElionIdentitySignalsInput): ElionIdentitySignal[] {
  return [
    {
      label: 'Reality signal',
      status: boundedStatus(input.realityStatus),
      source: 'current runtime evidence status',
    },
    {
      label: 'Event stream',
      status: input.streamConnected ? 'VERIFIED' : 'UNKNOWN',
      source: input.streamConnected ? 'SSE connection observed' : 'SSE connection not observed',
    },
    {
      label: 'Ledger integrity',
      status: input.ledgerIntegrity ? (input.ledgerIntegrity.valid ? 'VERIFIED' : 'DIVERGENT') : 'UNKNOWN',
      source: input.ledgerIntegrity ? `integrity check · height ${input.ledgerIntegrity.height}` : 'no integrity result observed',
    },
    {
      label: 'Ecosystem endpoint',
      status: boundedStatus(input.ecosystemStatus),
      source: 'GET /v1/ecosystem/body · recognized status only',
    },
  ];
}
