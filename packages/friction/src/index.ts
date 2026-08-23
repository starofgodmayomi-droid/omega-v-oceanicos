import {
  FrictionEvent,
  FrictionCategory,
  DissentRecord,
  DissentInterpretation,
} from '@omega-v/types';

/**
 * FrictionTracker: Converts system friction into observable evidence (Pillar 20)
 *
 * When the system encounters error, latency, contradiction, missing evidence,
 * permission failure, test failure, security issue, or disagreement —
 * do not hide it. Convert it into an observable state:
 *
 *   FRICTION → EVIDENCE → DIAGNOSIS → RESPONSE → VERIFICATION → LEARNING
 */
export class FrictionTracker {
  private events: FrictionEvent[] = [];
  private dissents: DissentRecord[] = [];

  /** Record a friction event */
  public record(input: {
    category: FrictionCategory;
    source: string;
    description: string;
    evidence?: string[];
    severity?: 'info' | 'warning' | 'critical';
    correlationId?: string;
  }): FrictionEvent {
    const event: FrictionEvent = {
      id: `friction-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      category: input.category,
      source: input.source,
      description: input.description,
      evidence: input.evidence ?? [],
      severity: input.severity ?? 'warning',
      status: 'OPEN',
      correlationId: input.correlationId,
      recordedAt: new Date().toISOString(),
    };
    this.events.push(event);
    return event;
  }

  /** Diagnose an open friction event */
  public diagnose(frictionId: string, diagnosis: string): FrictionEvent | null {
    const event = this.events.find((e) => e.id === frictionId);
    if (!event) return null;
    event.status = 'DIAGNOSED';
    event.diagnosis = diagnosis;
    return event;
  }

  /** Resolve a friction event */
  public resolve(frictionId: string, resolution: string): FrictionEvent | null {
    const event = this.events.find((e) => e.id === frictionId);
    if (!event) return null;
    event.status = 'RESOLVED';
    event.resolution = resolution;
    return event;
  }

  /** Transition a resolved friction event to LEARNING */
  public learn(frictionId: string): FrictionEvent | null {
    const event = this.events.find((e) => e.id === frictionId);
    if (!event || event.status !== 'RESOLVED') return null;
    event.status = 'LEARNING';
    return event;
  }

  /**
   * Record a dissent — two or more interpretations of the same claim (Pillar 21)
   * Do not manufacture consensus. Do not suppress minority results.
   */
  public recordDissent(claimId: string, interpretations: DissentInterpretation[]): DissentRecord {
    const dissent: DissentRecord = {
      id: `dissent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      claimId,
      interpretations,
      status: 'OPEN',
      recordedAt: new Date().toISOString(),
    };
    this.dissents.push(dissent);
    return dissent;
  }

  /** Resolve a dissent */
  public resolveDissent(dissentId: string): DissentRecord | null {
    const d = this.dissents.find((r) => r.id === dissentId);
    if (!d) return null;
    d.status = 'RESOLVED';
    return d;
  }

  /** Query all friction events */
  public getFriction(opts?: {
    status?: FrictionEvent['status'];
    category?: FrictionCategory;
  }): FrictionEvent[] {
    let result = [...this.events];
    if (opts?.status) result = result.filter((e) => e.status === opts.status);
    if (opts?.category) result = result.filter((e) => e.category === opts.category);
    return result;
  }

  /** Query all dissent records */
  public getDissent(opts?: { status?: DissentRecord['status'] }): DissentRecord[] {
    let result = [...this.dissents];
    if (opts?.status) result = result.filter((d) => d.status === opts.status);
    return result;
  }

  /** Summary metrics */
  public getMetrics(): {
    totalFriction: number;
    open: number;
    diagnosed: number;
    resolved: number;
    learning: number;
    totalDissent: number;
    openDissent: number;
  } {
    return {
      totalFriction: this.events.length,
      open: this.events.filter((e) => e.status === 'OPEN').length,
      diagnosed: this.events.filter((e) => e.status === 'DIAGNOSED').length,
      resolved: this.events.filter((e) => e.status === 'RESOLVED').length,
      learning: this.events.filter((e) => e.status === 'LEARNING').length,
      totalDissent: this.dissents.length,
      openDissent: this.dissents.filter((d) => d.status === 'OPEN').length,
    };
  }
}

export default FrictionTracker;
