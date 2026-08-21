import { Observation } from '@omega-v/types';

/**
 * Observer: Captures events and prepares them for verification
 *
 * Step 1 of the verification loop
 */
export class Observer {
  private observationCounter: number = 0;
  private deduplicationCache: Map<string, { time: number; id: string }> = new Map();

  /**
   * Create a new observer instance
   */
  constructor(private readonly deduplicationWindow: number = 60000) {}

  /**
   * Observe a claim and normalize it for verification
   *
   * @param claim - The claim being made
   * @param source - Information about the source
   * @param metadata - Supporting evidence
   * @param confidence - How confident in this observation? (0-1)
   * @param confidenceReason - Why this confidence level?
   * @returns Normalized observation ready for verification
   */
  public observe(input: {
    claim: string;
    category?: string;
    source: {
      system: string;
      version: string;
      environment: string;
    };
    observedBy: string;
    metadata: Record<string, unknown>;
    confidence: number;
    confidenceReason: string;
    parentId?: string;
    lineage?: string[];
  }): Observation {
    // Validate input
    this.validateObservation(input);

    // Check for duplicates
    const deduplicationKey = this.createDeduplicationKey(input.claim, input.source.system);
    const existingObservation = this.checkDuplicate(deduplicationKey);
    if (existingObservation) {
      return this.createDeduplicatedResponse(existingObservation);
    }

    // Generate unique ID
    const id = this.generateObservationId();

    // Create normalized observation
    const observation: Observation = {
      id,
      claim: {
        statement: input.claim,
        category: input.category || 'unknown',
      },
      source: input.source,
      timestamp: new Date().toISOString(),
      observedBy: input.observedBy,
      metadata: input.metadata,
      confidence: Math.max(0, Math.min(1, input.confidence)), // Clamp 0-1
      confidenceReason: input.confidenceReason,
      ...(input.parentId ? { parentId: input.parentId } : {}),
      ...(input.lineage ? { lineage: [...input.lineage] } : {}),
      status: 'normalized',
    };

    // Cache for deduplication
    this.deduplicationCache.set(deduplicationKey, {
      time: Date.now(),
      id: observation.id,
    });

    // Clean old cache entries
    this.cleanDeduplicationCache();

    return observation;
  }

  /**
   * Validate observation input against required schema
   */
  private validateObservation(input: {
    claim: string;
    source: {
      system: string;
      version: string;
      environment: string;
    };
    observedBy: string;
    metadata: Record<string, unknown>;
    confidence: number;
    confidenceReason: string;
    parentId?: string;
    lineage?: string[];
  }): void {
    const errors: string[] = [];

    if (!input.claim || typeof input.claim !== 'string') {
      errors.push('claim is required and must be a string');
    }

    if (!input.source?.system) {
      errors.push('source.system is required');
    }

    if (typeof input.confidence !== 'number') {
      errors.push('confidence is required and must be a number');
    }

    if (!input.confidenceReason) {
      errors.push('confidenceReason is required');
    }
    if (
      input.parentId !== undefined &&
      (typeof input.parentId !== 'string' || !input.parentId.trim())
    ) {
      errors.push('parentId must be a non-empty string when provided');
    }
    if (
      input.lineage !== undefined &&
      (!Array.isArray(input.lineage) ||
        input.lineage.length > 32 ||
        input.lineage.some((id) => typeof id !== 'string' || !id.trim()))
    ) {
      errors.push('lineage must contain at most 32 non-empty string identifiers');
    }

    if (errors.length > 0) {
      throw new Error(`Observation validation failed: ${errors.join('; ')}`);
    }
  }

  /**
   * Create a key for deduplication logic
   */
  private createDeduplicationKey(claim: string, system: string): string {
    return `${system}:${claim}`;
  }

  /**
   * Check if we've seen this observation recently
   */
  private checkDuplicate(key: string): string | null {
    const cached = this.deduplicationCache.get(key);
    if (!cached) {
      return null;
    }

    const age = Date.now() - cached.time;
    if (age < this.deduplicationWindow) {
      return cached.id;
    }

    this.deduplicationCache.delete(key);
    return null;
  }

  /**
   * Create a response indicating a duplicate was found
   */
  private createDeduplicatedResponse(originalId: string): Observation {
    // Return the original observation ID
    // In real implementation, would fetch from storage
    return {
      id: originalId,
      claim: {
        statement: 'Deduplicated',
        category: 'system',
      },
      source: {
        system: 'observer',
        version: '0.1.0',
        environment: 'production',
      },
      timestamp: new Date().toISOString(),
      observedBy: 'observer',
      metadata: { deduplicated: true, originalId },
      confidence: 1.0,
      confidenceReason: 'Exact duplicate of recent observation',
      lineage: [originalId],
      status: 'normalized',
    };
  }

  /**
   * Generate a unique observation ID
   */
  private generateObservationId(): string {
    this.observationCounter++;
    return `obs-${new Date().toISOString().split('T')[0]}-${this.observationCounter}`;
  }

  /**
   * Remove old entries from deduplication cache
   */
  private cleanDeduplicationCache(): void {
    const now = Date.now();
    for (const [key, value] of this.deduplicationCache.entries()) {
      if (now - value.time > this.deduplicationWindow) {
        this.deduplicationCache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics (useful for monitoring)
   */
  public getCacheStats(): { size: number; windowMs: number } {
    return {
      size: this.deduplicationCache.size,
      windowMs: this.deduplicationWindow,
    };
  }
}

export default Observer;
