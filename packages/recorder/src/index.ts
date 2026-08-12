import { createHash } from 'crypto';
import {
  EventLogEntry,
  Observation,
  VerificationResult,
  Attestation,
  QueryResult,
} from '@omega-v/types';

/**
 * EventLog: Immutable append-only event store with cryptographic integrity
 *
 * Step 4 of the verification loop: Record
 * Creates a tamper-evident chain of observations, verifications, and attestations
 */
export class EventLog {
  private events: EventLogEntry[] = [];
  private eventIndex: Map<string, number> = new Map(); // id -> index
  private sequenceId: number = 0;

  /**
   * Record an observation in the event log
   */
  public recordObservation(observation: Observation): EventLogEntry {
    const entry: EventLogEntry = {
      id: this.sequenceId++,
      type: 'OBSERVATION',
      data: observation,
      recordedAt: new Date().toISOString(),
      hash: '',
      previousHash: this.getLastHash(),
    };

    entry.hash = this.computeHash(entry);
    this.events.push(entry);
    this.eventIndex.set(observation.id, entry.id);

    return entry;
  }

  /**
   * Record a verification result in the event log
   */
  public recordVerification(verification: VerificationResult): EventLogEntry {
    const entry: EventLogEntry = {
      id: this.sequenceId++,
      type: 'VERIFICATION',
      data: verification,
      recordedAt: new Date().toISOString(),
      hash: '',
      previousHash: this.getLastHash(),
    };

    entry.hash = this.computeHash(entry);
    this.events.push(entry);
    this.eventIndex.set(verification.id, entry.id);

    return entry;
  }

  /**
   * Record an attestation in the event log
   */
  public recordAttestation(attestation: Attestation): EventLogEntry {
    const entry: EventLogEntry = {
      id: this.sequenceId++,
      type: 'ATTESTATION',
      data: attestation,
      recordedAt: new Date().toISOString(),
      hash: '',
      previousHash: this.getLastHash(),
    };

    entry.hash = this.computeHash(entry);
    this.events.push(entry);
    this.eventIndex.set(attestation.id, entry.id);

    return entry;
  }

  /**
   * Get all events of a specific type
   */
  public queryByType(
    type: 'OBSERVATION' | 'VERIFICATION' | 'ATTESTATION',
    options?: { limit?: number; offset?: number }
  ): QueryResult {
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    const filtered = this.events.filter((e) => e.type === type);
    const paginated = filtered.slice(offset, offset + limit);

    return {
      events: paginated,
      totalCount: filtered.length,
      pagination: {
        offset,
        limit,
        hasMore: offset + limit < filtered.length,
      },
      queriedAt: new Date().toISOString(),
    };
  }

  /**
   * Get a single event by ID
   */
  public queryById(id: string): EventLogEntry | null {
    const sequenceId = this.eventIndex.get(id);
    if (sequenceId === undefined) {
      return null;
    }

    return this.events[sequenceId] || null;
  }

  /**
   * Get complete trace for an observation (observation → verifications → attestations)
   */
  public getTraceForObservation(observationId: string): {
    observation: EventLogEntry | null;
    verifications: EventLogEntry[];
    attestations: EventLogEntry[];
  } {
    const observation = this.queryById(observationId);
    if (!observation) {
      return { observation: null, verifications: [], attestations: [] };
    }

    const verifications: EventLogEntry[] = [];
    const attestations: EventLogEntry[] = [];

    for (const event of this.events) {
      if (event.type === 'VERIFICATION') {
        const ver = event.data as VerificationResult;
        if (ver.observationId === observationId) {
          verifications.push(event);
        }
      } else if (event.type === 'ATTESTATION') {
        const att = event.data as Attestation;
        if (att.observationId === observationId) {
          attestations.push(event);
        }
      }
    }

    return { observation, verifications, attestations };
  }

  /**
   * Verify the integrity of the event log by checking the hash chain
   */
  public verifyIntegrity(): { valid: boolean; brokenAt?: number } {
    if (this.events.length === 0) {
      return { valid: true };
    }

    for (let i = 0; i < this.events.length; i++) {
      const event = this.events[i];
      const expectedHash = this.computeHash(event);

      if (event.hash !== expectedHash) {
        return { valid: false, brokenAt: i };
      }

      if (i > 0) {
        const previousEvent = this.events[i - 1];
        if (event.previousHash !== previousEvent.hash) {
          return { valid: false, brokenAt: i };
        }
      }
    }

    return { valid: true };
  }

  /**
   * Get statistics about the event log
   */
  public getStats(): {
    totalEvents: number;
    observations: number;
    verifications: number;
    attestations: number;
  } {
    let observations = 0;
    let verifications = 0;
    let attestations = 0;

    for (const event of this.events) {
      if (event.type === 'OBSERVATION') observations++;
      else if (event.type === 'VERIFICATION') verifications++;
      else if (event.type === 'ATTESTATION') attestations++;
    }

    return {
      totalEvents: this.events.length,
      observations,
      verifications,
      attestations,
    };
  }

  /**
   * Export the complete event log (for audit/backup)
   */
  public exportEventLog(): EventLogEntry[] {
    return JSON.parse(JSON.stringify(this.events));
  }

  /**
   * Compute SHA-256 hash for an event (for integrity verification)
   * @private
   */
  private computeHash(event: Omit<EventLogEntry, 'hash'>): string {
    const payload = {
      id: event.id,
      type: event.type,
      data: event.data,
      recordedAt: event.recordedAt,
      previousHash: event.previousHash,
    };

    const payloadString = JSON.stringify(payload);
    return createHash('sha256').update(payloadString).digest('hex');
  }

  /**
   * Get the hash of the last event in the chain
   * @private
   */
  private getLastHash(): string {
    if (this.events.length === 0) {
      return '0'.repeat(64); // Genesis block hash
    }

    return this.events[this.events.length - 1].hash;
  }
}

export default EventLog;
