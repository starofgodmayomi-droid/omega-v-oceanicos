export type BoundedParallelAdmission = {
  /** Explicit upstream authority evidence; this runtime does not establish it. */
  readonly authorityVerified: boolean;
  /** Explicit upstream policy evidence; this runtime does not establish it. */
  readonly policySatisfied: boolean;
  /** Evidence references supporting the admission decision. */
  readonly evidence: readonly string[];
};

export type BoundedParallelAdmissionDecision = 'ALLOW' | 'DENY' | 'REVIEW';

export type BoundedParallelLane<T> = {
  readonly id: string;
  /**
   * Explicit per-lane admission boundary. It must return an already-observed
   * decision; the parallel runtime never discovers or grants authority.
   */
  readonly admit: () => Promise<BoundedParallelAdmissionDecision> | BoundedParallelAdmissionDecision;
  readonly run: () => Promise<T> | T;
};

export type BoundedParallelLaneResult<T> = {
  readonly id: string;
  readonly admission: BoundedParallelAdmissionDecision;
  readonly status: 'FULFILLED' | 'REJECTED' | 'DENIED' | 'REVIEW_REQUIRED';
  readonly value?: T;
  readonly error?: unknown;
};

export type BoundedParallelOptions = {
  /** Maximum number of lanes allowed to be active at once. */
  readonly maxConcurrency: number;
};

/**
 * Execute independently-admitted lanes with a finite concurrency bound.
 *
 * Admission is evaluated per lane before execution. DENY and REVIEW never call
 * the lane runner. Results preserve input order so reconciliation is
 * deterministic even when completion order differs. A failed lane never
 * silently changes sibling outcomes.
 */
export async function runBoundedParallel<T>(
  lanes: readonly BoundedParallelLane<T>[],
  options: BoundedParallelOptions,
): Promise<readonly BoundedParallelLaneResult<T>[]> {
  if (!Number.isInteger(options.maxConcurrency) || options.maxConcurrency < 1) {
    throw new Error('maxConcurrency must be a positive integer');
  }

  const maxConcurrency = Math.min(options.maxConcurrency, Math.max(1, lanes.length));
  const results: BoundedParallelLaneResult<T>[] = new Array(lanes.length);
  let nextIndex = 0;

  const runWorker = async (): Promise<void> => {
    while (true) {
      const index = nextIndex++;
      if (index >= lanes.length) return;
      const lane = lanes[index];

      try {
        const admission = await lane.admit();
        if (admission === 'DENY') {
          results[index] = { id: lane.id, admission, status: 'DENIED' };
          continue;
        }
        if (admission === 'REVIEW') {
          results[index] = { id: lane.id, admission, status: 'REVIEW_REQUIRED' };
          continue;
        }

        try {
          results[index] = {
            id: lane.id,
            admission,
            status: 'FULFILLED',
            value: await lane.run(),
          };
        } catch (error) {
          results[index] = { id: lane.id, admission, status: 'REJECTED', error };
        }
      } catch (error) {
        results[index] = {
          id: lane.id,
          admission: 'REVIEW',
          status: 'REVIEW_REQUIRED',
          error,
        };
      }
    }
  };

  await Promise.all(Array.from({ length: maxConcurrency }, () => runWorker()));
  return results;
}
