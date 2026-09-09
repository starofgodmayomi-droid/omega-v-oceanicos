import { EventLogEntry, Observation, VerificationResult, Attestation, QueryResult } from '@omega-v/types';
/**
 * EventLog: Immutable append-only event store with cryptographic integrity
 *
 * Step 4 of the verification loop: Record
 * Creates a tamper-evident chain of observations, verifications, and attestations
 */
export declare class EventLog {
    private events;
    private eventIndex;
    private sequenceId;
    /**
     * Record an observation in the event log
     */
    recordObservation(observation: Observation): EventLogEntry;
    /**
     * Record a verification result in the event log
     */
    recordVerification(verification: VerificationResult): EventLogEntry;
    /**
     * Record an attestation in the event log
     */
    recordAttestation(attestation: Attestation): EventLogEntry;
    /**
     * Get all events of a specific type
     */
    queryByType(type: 'OBSERVATION' | 'VERIFICATION' | 'ATTESTATION', options?: {
        limit?: number;
        offset?: number;
    }): QueryResult;
    /**
     * Get a single event by ID
     */
    queryById(id: string): EventLogEntry | null;
    /**
     * Get complete trace for an observation (observation → verifications → attestations)
     */
    getTraceForObservation(observationId: string): {
        observation: EventLogEntry | null;
        verifications: EventLogEntry[];
        attestations: EventLogEntry[];
    };
    /**
     * Verify the integrity of the event log by checking the hash chain
     */
    verifyIntegrity(): {
        valid: boolean;
        brokenAt?: number;
    };
    /**
     * Get statistics about the event log
     */
    getStats(): {
        totalEvents: number;
        observations: number;
        verifications: number;
        attestations: number;
    };
    /**
     * Export the complete event log (for audit/backup)
     */
    exportEventLog(): EventLogEntry[];
    /**
     * Compute SHA-256 hash for an event (for integrity verification)
     * @private
     */
    private computeHash;
    /**
     * Get the hash of the last event in the chain
     * @private
     */
    private getLastHash;
}
export default EventLog;
//# sourceMappingURL=index.d.ts.map