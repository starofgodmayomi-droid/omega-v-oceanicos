import { Observation } from '@omega-v/types';
/**
 * Observer: Captures events and prepares them for verification
 *
 * Step 1 of the verification loop
 */
export declare class Observer {
    private readonly deduplicationWindow;
    private observationCounter;
    private deduplicationCache;
    /**
     * Create a new observer instance
     */
    constructor(deduplicationWindow?: number);
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
    observe(input: {
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
    }): Observation;
    /**
     * Validate observation input against required schema
     */
    private validateObservation;
    /**
     * Create a key for deduplication logic
     */
    private createDeduplicationKey;
    /**
     * Check if we've seen this observation recently
     */
    private checkDuplicate;
    /**
     * Create a response indicating a duplicate was found
     */
    private createDeduplicatedResponse;
    /**
     * Generate a unique observation ID
     */
    private generateObservationId;
    /**
     * Remove old entries from deduplication cache
     */
    private cleanDeduplicationCache;
    /**
     * Get cache statistics (useful for monitoring)
     */
    getCacheStats(): {
        size: number;
        windowMs: number;
    };
}
export default Observer;
//# sourceMappingURL=index.d.ts.map