export type BoundedParallelLane<T> = {
  readonly id: string;
  readonly run: () => Promise<T> | T;
};

export type BoundedParallelLaneResult<T> = {
  readonly id: string;
  readonly status: 'FULFILLED' | 'REJECTED';
  readonly value?: T;
  readonly error?: unknown;
};

export type BoundedParallelOptions = {
  /** Maximum number of lanes allowed to be active at once. */
  readonly maxConcurrency?: number;
};

/**
 * Execute independently-authorized lanes with a finite concurrency bound.
 *
 * This is an orchestration primitive, not an authority mechanism: every lane
 * owns its own admission/authorization boundary. Results preserve input order
 * so reconciliation remains deterministic even when completion order differs.
 * A rejected lane does not silently cancel or mark sibling lanes successful.
 */
export async function runBoundedParallel<T>(
  lanes: readonly BoundedParallelLane<T>[],
  options: BoundedParallelOptions = {},
): Promise<readonly BoundedParallelLaneResult<T>[]> {
  if (!Number.isInteger(options.maxConcurrency) || (options.maxConcurrency ?? 0) < 1) {
    throw new Error('maxConcurrency must be a positive integer');
  }

  const maxConcurrency = Math.min(options.maxConcurrency!, Math.max(1, lanes.length));
  const results: BoundedParallelLaneResult<T>[] = new Array(lanes.length);
  let nextIndex = 0;

  const runWorker = async (): Promise<void> => {
    while (true) {
      const index = nextIndex++;
      if (index >= lanes.length) return;
      const lane = lanes[index];
      try {
        results[index] = { id: lane.id, status: 'FULFILLED', value: await lane.run() };
      } catch (error) {
        results[index] = { id: lane.id, status: 'REJECTED', error };
      }
    }
  };

  await Promise.all(Array.from({ length: maxConcurrency }, () => runWorker()));
  return results;
}
