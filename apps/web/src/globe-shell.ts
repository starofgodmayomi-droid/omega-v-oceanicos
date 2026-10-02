export type GlobeRealityKind = 'VERIFIED' | 'DIVERGENT' | 'UNKNOWN' | 'NOT_EXECUTED';
export type GlobeEvidenceSource = 'LIVE' | 'UNREACHABLE' | 'EMPTY';

export type GlobeEvidence = {
  source: GlobeEvidenceSource;
  status: GlobeRealityKind;
  chainIntact: boolean | null;
};

export type GlobeEvidenceInput = {
  reachable: boolean | null;
  tipRouteStatus: string | null | undefined;
  tipEvidenceStatus: string | null | undefined;
  chainIntact: boolean | null;
};

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

/**
 * Bind globe caption to GET /v1/block/tip.
 * Fetch failure → UNKNOWN, never invented from cache, SSE mood, or ONLINE/healthy labels.
 * Route status ONLINE|DEGRADED is not a reality classification.
 * DEGRADED / broken chain → DIVERGENT, never VERIFIED.
 */
export function bindGlobeEvidence(input: GlobeEvidenceInput): GlobeEvidence {
  if (input.reachable === false) {
    return { source: 'UNREACHABLE', status: 'UNKNOWN', chainIntact: null };
  }
  if (input.reachable !== true) {
    return { source: 'EMPTY', status: 'UNKNOWN', chainIntact: null };
  }

  const route =
    typeof input.tipRouteStatus === 'string' ? input.tipRouteStatus.trim().toUpperCase() : '';
  const degraded = route === 'DEGRADED' || input.chainIntact === false;
  if (degraded) {
    return { source: 'LIVE', status: 'DIVERGENT', chainIntact: false };
  }

  if (input.tipEvidenceStatus == null || String(input.tipEvidenceStatus).trim() === '') {
    return { source: 'EMPTY', status: 'UNKNOWN', chainIntact: input.chainIntact };
  }

  return {
    source: 'LIVE',
    status: globeRealityKind(input.tipEvidenceStatus),
    chainIntact: input.chainIntact,
  };
}

export function globeShellCaptionFromEvidence(evidence: GlobeEvidence): string {
  if (evidence.source === 'UNREACHABLE') {
    return 'UI shell · /v1 unreachable · reality status UNKNOWN · not invented · globe view is not verification';
  }
  if (evidence.source === 'EMPTY') {
    return 'UI shell · no /v1 tip observed · reality status UNKNOWN · globe view is not verification';
  }
  if (evidence.chainIntact === false) {
    return 'UI shell · /v1 live · ledger chain DEGRADED · reality status DIVERGENT · globe view is not verification';
  }
  return `UI shell · /v1 live · reality status ${evidence.status} · globe view is not verification`;
}
