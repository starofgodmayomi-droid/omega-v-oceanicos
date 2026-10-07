export type RealityStatus = 'VERIFIED' | 'DIVERGENT' | 'UNKNOWN' | 'NOT_EXECUTED';
export const STATUS_ORDER: RealityStatus[] = ['VERIFIED', 'UNKNOWN', 'DIVERGENT', 'NOT_EXECUTED'];

export const NON_COLLAPSE_DISTINCTIONS = [
  'POSSIBLE ≠ KNOWN',
  'PROPOSED ≠ PERMITTED',
  'CAPABILITY ≠ AUTHORITY',
  'PERMITTED ≠ EXECUTED',
  'EXECUTED ≠ OBSERVED',
  'OBSERVED ≠ VERIFIED',
  'ATTESTED ≠ DEPLOYED',
  'DEPLOYED ≠ HEALTHY',
] as const;

export const HUMAN_PRINCIPLES = [
  'Reality before assumption',
  'Evidence before conclusion',
  'Truth before convenience',
  'Humans remain accountable',
  'Respect dignity, privacy, and consent',
  'Explain significant reasoning where appropriate',
  'Preserve provenance and history',
  'Design for interoperability',
  'Learn continuously',
  'Steward for future generations',
] as const;

export const HUMAN_ROOT_DISTINCTIONS = [
  'RAW ≠ TRUE',
  'THOUGHT ≠ FACT',
  'DREAM ≠ PROPHECY',
  'SYMBOL ≠ EVIDENCE',
  'IDEA ≠ PLAN',
  'PLAN ≠ ACTION',
  'ACTION ≠ OUTCOME',
  'CLAIM ≠ REALITY',
] as const;

export function runtimeModeLabel(simulationMode: boolean, streamConnected: boolean): string {
  if (simulationMode) return 'BOUNDED SIMULATION';
  if (streamConnected) return 'STREAM CONNECTED · REALITY UNVERIFIED';
  return 'AWAITING OBSERVATION';
}

export function isLocalSimulationOnly(value: unknown): boolean {
  return typeof value === 'string'
    && value.trim().toLowerCase().replace(/_/g, '-') === 'local-simulation-only';
}

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
