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
