import crypto from 'crypto';
import { IObservation } from '@oceanicos/types';
import type { Observation } from '@oceanicos/types';

export type GlobalComputeTelemetry = IObservation;

export class ObserverEngine {
  private dedupWindowMs: number;
  private cache: Map<string, { id: string; timestamp: number }> = new Map();

  constructor(dedupWindowMs: number = 60000) {
    this.dedupWindowMs = dedupWindowMs;
  }

  /**
   * Observe a claim and return a normalized Observation.
   * Deduplicates within the configured window based on claim + source system.
   */
  public observe(input: {
    claim: string;
    category?: string;
    source: { system: string; version: string; environment: string };
    observedBy: string;
    metadata: Record<string, unknown>;
    confidence: number;
    confidenceReason: string;
    parentId?: string;
    lineage?: string[];
  }): Observation {
    // Validate input — collect all errors for a complete report.
    const errors: string[] = [];
    if (!input.claim || input.claim.trim() === '') errors.push('claim is required');
    if (!input.source?.system || input.source.system.trim() === '') errors.push('source.system is required');
    if (input.confidence === undefined || typeof input.confidence !== 'number' || Number.isNaN(input.confidence))
      errors.push('confidence is required and must be a number');
    if (!input.confidenceReason || input.confidenceReason.trim() === '') errors.push('confidenceReason is required');
    if (input.parentId !== undefined && input.parentId.trim() === '')
      errors.push('parentId must be a non-empty string when provided');
    if (input.lineage && input.lineage.length > 32)
      throw new Error('lineage must contain at most 32 entries');

    if (errors.length > 0) {
      throw new Error(`Observation validation failed: ${errors.join('; ')}`);
    }

    // Clamp confidence to [0, 1].
    const confidence = Math.max(0, Math.min(1, input.confidence));

    // Check deduplication.
    const dedupKey = `${input.claim}:${input.source.system}`;
    const now = Date.now();
    const existing = this.cache.get(dedupKey);
    if (existing && now - existing.timestamp < this.dedupWindowMs) {
      return {
        id: existing.id,
        claim: { statement: input.claim, category: input.category ?? 'unknown' },
        source: input.source,
        timestamp: new Date(existing.timestamp).toISOString(),
        observedBy: input.observedBy,
        metadata: { ...input.metadata, deduplicated: true },
        confidence,
        confidenceReason: input.confidenceReason,
        status: 'normalized',
        ...(input.parentId !== undefined ? { parentId: input.parentId } : {}),
        ...(input.lineage ? { lineage: input.lineage } : {}),
      };
    }

    // Evict expired entries.
    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp >= this.dedupWindowMs) this.cache.delete(key);
    }

    const id = `obs-${crypto.randomUUID()}`;
    this.cache.set(dedupKey, { id, timestamp: now });

    return {
      id,
      claim: { statement: input.claim, category: input.category ?? 'unknown' },
      source: input.source,
      timestamp: new Date(now).toISOString(),
      observedBy: input.observedBy,
      metadata: input.metadata,
      confidence,
      confidenceReason: input.confidenceReason,
      status: 'normalized',
      ...(input.parentId !== undefined ? { parentId: input.parentId } : {}),
      ...(input.lineage ? { lineage: input.lineage } : {}),
    };
  }

  /** Report cache statistics for testing and monitoring. */
  public getCacheStats(): { size: number; windowMs: number } {
    // Evict expired entries first for an accurate count.
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp >= this.dedupWindowMs) this.cache.delete(key);
    }
    return { size: this.cache.size, windowMs: this.dedupWindowMs };
  }

  public static generateTelemetry(): IObservation {
    return {
      uuid: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      siliconYield: 0.942,
      gridLoadMegawatts: 1250,
      acceleratorInventory: 989210,
    };
  }
}

export const observePlanetaryBase = ObserverEngine.generateTelemetry;

// Documented public name (README: `import { Observer } from '@omega-v/observer'`).
export { ObserverEngine as Observer };
