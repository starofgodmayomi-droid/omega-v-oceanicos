export type GlobeRealityKind = 'VERIFIED' | 'DIVERGENT' | 'UNKNOWN' | 'NOT_EXECUTED';

const KNOWN: readonly GlobeRealityKind[] = ['VERIFIED', 'DIVERGENT', 'UNKNOWN', 'NOT_EXECUTED'];

/**
 * Globe view is a UI density mode. It never invents a reality classification.
 * Missing or unrecognized status stays UNKNOWN.
 */
export function globeRealityKind(status: string | null | undefined): GlobeRealityKind {
  if (typeof status !== 'string') return 'UNKNOWN';
  const normalized = status.trim().toUpperCase().replace(/\s+/g, '_');
  return (KNOWN as readonly string[]).includes(normalized)
    ? (normalized as GlobeRealityKind)
    : 'UNKNOWN';
}

export function globeShellCaption(status: string | null | undefined): string {
  const kind = globeRealityKind(status);
  return `UI shell · reality status ${kind} · globe view is not verification`;
}
