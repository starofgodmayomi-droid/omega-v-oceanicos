export interface OutwardRay {
  readonly id: string;
  readonly surface: string;
  readonly entry: string;
  readonly arm: string;
  readonly source: string;
}

export interface EquationFixpointSummary {
  readonly status: 'ABSENT' | 'READY';
  readonly evidenceScope: string;
  readonly admitted: number;
  readonly halted: number;
  readonly surfaces: readonly OutwardRay[];
  readonly boundary: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Shape a fixpoint payload for display. Unknown or partial payloads stay ABSENT
 * rather than being completed into a green projection.
 */
export function summarizeEquationFixpoint(fixpoint: unknown): EquationFixpointSummary {
  if (!isRecord(fixpoint) || !Array.isArray(fixpoint.expansion)) {
    return {
      status: 'ABSENT',
      evidenceScope: 'UNKNOWN',
      admitted: 0,
      halted: 0,
      surfaces: [],
      boundary: 'No fixpoint was carried on the body.',
    };
  }

  const surfaces: OutwardRay[] = [];
  for (const ray of fixpoint.expansion) {
    if (!isRecord(ray)) continue;
    if (ray.direction !== 'outward') continue;
    if (typeof ray.id !== 'string' || typeof ray.surface !== 'string' || typeof ray.entry !== 'string') continue;
    surfaces.push({
      id: ray.id,
      surface: ray.surface,
      entry: ray.entry,
      arm: typeof ray.arm === 'string' ? ray.arm : 'UNKNOWN',
      source: typeof ray.source === 'string' ? ray.source : '',
    });
  }

  const admitted = typeof fixpoint.admitted === 'number'
    ? fixpoint.admitted
    : Array.isArray(fixpoint.admitted) ? fixpoint.admitted.length : surfaces.length;
  const halted = typeof fixpoint.halted === 'number'
    ? fixpoint.halted
    : Array.isArray(fixpoint.halted) ? fixpoint.halted.length : 0;

  return {
    status: 'READY',
    evidenceScope: typeof fixpoint.evidenceScope === 'string' ? fixpoint.evidenceScope : 'UNKNOWN',
    admitted,
    halted,
    surfaces,
    boundary: typeof fixpoint.boundary === 'string'
      ? fixpoint.boundary
      : 'Local structure only. Not a reality claim.',
  };
}
