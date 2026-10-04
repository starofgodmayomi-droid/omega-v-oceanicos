import crypto from 'node:crypto';
import type { IMiniBlock } from '@oceanicos/types';

export const KAI_VERSION = 'kai.continuity.v1' as const;

export type KaiStatus = 'OBSERVED' | 'VERIFIED' | 'DIVERGENT' | 'UNKNOWN' | 'NOT_EXECUTED';

export interface KaiDrop {
  id: string;
  version: typeof KAI_VERSION;
  status: KaiStatus;
  source: string;
  observation: IMiniBlock['observation'];
  evidence: IMiniBlock['evidence'];
  provenance: string[];
  unknowns: string[];
  inferences: string[];
  memoryIsProof: false;
  authority: 'human_and_reality';
  persisted: boolean;
  createdAt: string;
  corrects?: string;
}

export interface KaiSource {
  source: string;
  observedAt?: string;
}

const dropId = (block: IMiniBlock, source: string): string =>
  `kai:${crypto.createHash('sha256').update(`${source}|${block.hash}`).digest('hex')}`;

const statusFromBlock = (block: IMiniBlock): KaiStatus => {
  const status = String((block.evidence as Record<string, unknown>)?.status ?? '').toUpperCase();
  if (status === 'PASS' || status === 'VERIFIED') return 'VERIFIED';
  if (status === 'DIVERGENT' || status === 'FAIL') return 'DIVERGENT';
  return 'UNKNOWN';
};

/**
 * KAI is a continuity layer over verified memory. It does not create evidence,
 * authorize actions, or promote memory into reality.
 */
export const kaiFromBlock = (block: IMiniBlock, source: KaiSource): KaiDrop => ({
  id: dropId(block, source.source),
  version: KAI_VERSION,
  status: statusFromBlock(block),
  source: source.source,
  observation: block.observation,
  evidence: block.evidence,
  provenance: [`remember:index:${block.index}`, `remember:hash:${block.hash}`],
  unknowns: [],
  inferences: [],
  memoryIsProof: false,
  authority: 'human_and_reality',
  persisted: true,
  createdAt: source.observedAt ?? block.timestamp,
});

export const kaiUnknown = (reason: string, source: KaiSource): KaiDrop => ({
  id: `kai:unknown:${crypto.createHash('sha256').update(`${source.source}|${reason}`).digest('hex')}`,
  version: KAI_VERSION,
  status: 'UNKNOWN',
  source: source.source,
  observation: { reason },
  evidence: { status: 'UNKNOWN', reason },
  provenance: [`source:${source.source}`],
  unknowns: [reason],
  inferences: [],
  memoryIsProof: false,
  authority: 'human_and_reality',
  persisted: false,
  createdAt: source.observedAt ?? new Date().toISOString(),
});

export class KaiContinuity {
  private readonly drops: KaiDrop[] = [];

  public capture(block: IMiniBlock, source: KaiSource): KaiDrop {
    const drop = kaiFromBlock(block, source);
    this.drops.push(drop);
    return drop;
  }

  public unknown(reason: string, source: KaiSource): KaiDrop {
    const drop = kaiUnknown(reason, source);
    this.drops.push(drop);
    return drop;
  }

  /**
   * Corrections append a new Drop and preserve the previous lineage.
   * Historical memory is never silently rewritten.
   */
  public correct(previous: KaiDrop, correction: Omit<KaiDrop, 'id' | 'corrects'>): KaiDrop {
    const corrected: KaiDrop = {
      ...correction,
      id: `kai:correction:${crypto.createHash('sha256').update(`${previous.id}|${JSON.stringify(correction)}`).digest('hex')}`,
      corrects: previous.id,
    };
    this.drops.push(corrected);
    return corrected;
  }

  public all(): readonly KaiDrop[] {
    return this.drops;
  }

  public latest(): KaiDrop | null {
    return this.drops[this.drops.length - 1] ?? null;
  }
}
