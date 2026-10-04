import type { IEvidence, IMiniBlock, IObservation } from '@oceanicos/types';

export const KAI_VERSION = 'kai.continuity.v1' as const;
export type KaiStatus = 'OBSERVED' | 'VERIFIED' | 'DIVERGENT' | 'UNKNOWN' | 'NOT_EXECUTED';

export interface KaiDrop {
  readonly id: string;
  readonly version: typeof KAI_VERSION;
  readonly status: KaiStatus;
  readonly source: string;
  readonly observation: IObservation | null;
  readonly evidence: IEvidence | null;
  readonly provenance: readonly string[];
  readonly unknowns: readonly string[];
  readonly memoryIsProof: false;
  readonly authority: 'human_and_reality';
  readonly persisted: boolean;
  readonly corrects?: string;
}

export function kaiFromBlock(block: IMiniBlock, source = 'oceanicos-runtime'): KaiDrop {
  const evidence = block.evidence;
  const status: KaiStatus =
    evidence.status === 'PASS' ? 'VERIFIED' :
    evidence.status === 'DIVERGENT' || evidence.status === 'FAIL' ? 'DIVERGENT' :
    'UNKNOWN';
  return {
    id: `kai-${block.index}-${status.toLowerCase()}`,
    version: KAI_VERSION,
    status,
    source,
    observation: block.observation,
    evidence,
    provenance: [`remember:index:${block.index}`, `remember:hash:${block.hash}`],
    unknowns: status === 'UNKNOWN' ? ['evidence status is not classifiable'] : [],
    memoryIsProof: false,
    authority: 'human_and_reality',
    persisted: true,
  };
}

export function kaiUnknown(reason: string, source = 'unknown'): KaiDrop {
  const bounded = reason.trim();
  if (!bounded) throw new Error('KAI UNKNOWN reason is required');
  return {
    id: `kai-unknown-${bounded.length}`,
    version: KAI_VERSION,
    status: 'UNKNOWN',
    source,
    observation: null,
    evidence: null,
    provenance: [],
    unknowns: [bounded],
    memoryIsProof: false,
    authority: 'human_and_reality',
    persisted: false,
  };
}

export class KaiContinuity {
  capture(block: IMiniBlock, source = 'oceanicos-runtime'): KaiDrop {
    return kaiFromBlock(block, source);
  }
  unknown(reason: string, source = 'unknown'): KaiDrop {
    return kaiUnknown(reason, source);
  }
  correct(prior: KaiDrop, replacement: KaiDrop): KaiDrop {
    if (!prior.id) throw new Error('KAI correction requires a prior Drop');
    return {
      ...replacement,
      id: `${replacement.id}-corrects-${prior.id}`,
      corrects: prior.id,
      provenance: [...replacement.provenance, `corrects:${prior.id}`],
    };
  }
}
