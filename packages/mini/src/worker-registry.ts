import type { OmegaWorkerCapability, OmegaWorkerRegistry } from '@oceanicos/types';

const validateWorker = (worker: OmegaWorkerCapability): void => {
  if (!worker.id.trim()) throw new Error('Worker id is required');
  if (!worker.version.trim()) throw new Error(`Worker ${worker.id} version is required`);
  if (!worker.role.trim()) throw new Error(`Worker ${worker.id} role is required`);
  if (!worker.description.trim()) throw new Error(`Worker ${worker.id} description is required`);
  if (!worker.inputSchema.trim()) throw new Error(`Worker ${worker.id} inputSchema is required`);
  if (!worker.outputSchema.trim()) throw new Error(`Worker ${worker.id} outputSchema is required`);
  if (worker.timeoutMs <= 0) throw new Error(`Worker ${worker.id} timeoutMs must be positive`);
  if (worker.maxOutputBytes <= 0) throw new Error(`Worker ${worker.id} maxOutputBytes must be positive`);
  if (worker.retries < 0) throw new Error(`Worker ${worker.id} retries cannot be negative`);
};

export const createOmegaWorkerRegistry = (
  workers: readonly OmegaWorkerCapability[],
): OmegaWorkerRegistry => {
  const ids = new Set<string>();
  for (const worker of workers) {
    validateWorker(worker);
    if (ids.has(worker.id)) throw new Error(`Duplicate worker id: ${worker.id}`);
    ids.add(worker.id);
  }

  return {
    version: 'omega-workers.v1',
    workers: workers.map((worker) => ({
      ...worker,
      policyRefs: [...worker.policyRefs],
      evidenceRequired: [...worker.evidenceRequired],
    })),
  };
};

export const getOmegaWorker = (
  registry: OmegaWorkerRegistry,
  workerId: string,
): OmegaWorkerCapability | undefined => registry.workers.find((worker) => worker.id === workerId);
