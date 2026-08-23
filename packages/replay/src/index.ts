import { FullLoopResult, OceanicosClient } from '@omega-v/sdk';
import * as crypto from 'crypto';

// ─── Replay Types ─────────────────────────────────────────────────────────────

export type ReplayStatus = 'CAPTURED' | 'REPLAYING' | 'REPLAYED' | 'FAILED';

/**
 * A frozen snapshot of a single verification loop execution —
 * observation + verification + attestation — with its full metadata.
 */
export interface ReplaySnapshot {
  /** Unique snapshot identifier */
  id: string;
  /** Human-readable label for this snapshot */
  label: string;
  /** The claim that was verified */
  claim: string;
  /** Frozen loop result */
  result: FullLoopResult;
  /** SHA-256 fingerprint of the serialized result */
  fingerprint: string;
  /** When this snapshot was captured */
  capturedAt: string;
  /** Arbitrary tags for filtering / grouping */
  tags: string[];
  /** Status of the snapshot */
  status: ReplayStatus;
  /** Optional: metadata from the original run context */
  metadata: Record<string, unknown>;
}

/**
 * Diff between two replay snapshots
 */
export interface ReplayDiff {
  snapshotA: string; // id
  snapshotB: string; // id
  labelA: string;
  labelB: string;
  identical: boolean;
  /** Field-level differences */
  changes: ReplayChange[];
  /** Whether the pass/fail outcome regressed */
  regressionDetected: boolean;
  /** When this diff was computed */
  computedAt: string;
}

export interface ReplayChange {
  path: string;
  valueA: unknown;
  valueB: unknown;
  severity: 'INFO' | 'WARNING' | 'REGRESSION';
}

/**
 * Result of replaying a snapshot (re-executing the same claim)
 */
export interface ReplayResult {
  original: ReplaySnapshot;
  replayed: ReplaySnapshot;
  diff: ReplayDiff;
  durationMs: number;
}

// ─── Replay Engine ────────────────────────────────────────────────────────────

/**
 * VerificationReplayEngine: Capture, store, replay, and diff
 * past verification loop executions for temporal regression detection.
 *
 * ```
 * 💧 Ω∞v ::= capture(loop) → snapshot → replay → diff → detect
 * ```
 */
export class VerificationReplayEngine {
  private snapshots: Map<string, ReplaySnapshot> = new Map();

  // ── Capture ───────────────────────────────────────────────────────────────

  /**
   * Capture a verification loop result as a frozen, fingerprinted snapshot
   */
  public capture(
    claim: string,
    result: FullLoopResult,
    label?: string,
    tags: string[] = [],
    metadata: Record<string, unknown> = {}
  ): ReplaySnapshot {
    const id = `replay-${crypto.randomBytes(8).toString('hex')}`;
    const fingerprint = this.computeFingerprint(result);

    const snapshot: ReplaySnapshot = {
      id,
      label: label || `Snapshot ${this.snapshots.size + 1}`,
      claim,
      result,
      fingerprint,
      capturedAt: new Date().toISOString(),
      tags,
      status: 'CAPTURED',
      metadata,
    };

    this.snapshots.set(id, snapshot);
    return snapshot;
  }

  // ── Replay ────────────────────────────────────────────────────────────────

  /**
   * Replay a snapshot: re-execute the same claim and diff against the original
   */
  public async replay(
    snapshotId: string,
    client: OceanicosClient
  ): Promise<ReplayResult> {
    const original = this.snapshots.get(snapshotId);
    if (!original) {
      throw new Error(`Replay snapshot not found: ${snapshotId}`);
    }

    // Mark as replaying
    original.status = 'REPLAYING';

    const start = Date.now();
    const freshResult = await client.runLoop({
      claim: original.claim,
      category: 'replay-verification',
      observedBy: 'replay-engine',
      sourceSystem: 'omega-v-replay',
      metadata: { originalSnapshotId: snapshotId },
    });
    const durationMs = Date.now() - start;

    // Capture the replayed result as a new snapshot
    const replayed = this.capture(
      original.claim,
      freshResult,
      `Replay of ${original.label}`,
      [...original.tags, 'replay'],
      { replayedFrom: snapshotId }
    );
    replayed.status = 'REPLAYED';
    original.status = 'CAPTURED'; // reset original status

    // Diff the two
    const diff = this.diff(original.id, replayed.id);

    return { original, replayed, diff, durationMs };
  }

  // ── Diff ──────────────────────────────────────────────────────────────────

  /**
   * Compute a structured diff between two snapshots
   */
  public diff(snapshotAId: string, snapshotBId: string): ReplayDiff {
    const a = this.snapshots.get(snapshotAId);
    const b = this.snapshots.get(snapshotBId);
    if (!a || !b) {
      throw new Error(
        `Cannot diff: snapshot(s) not found (${snapshotAId}, ${snapshotBId})`
      );
    }

    const changes: ReplayChange[] = [];
    const identical = a.fingerprint === b.fingerprint;

    // Compare pass/fail outcome
    const passedA = a.result.verification.summary.passed;
    const passedB = b.result.verification.summary.passed;
    if (passedA !== passedB) {
      changes.push({
        path: 'verification.summary.passed',
        valueA: passedA,
        valueB: passedB,
        severity: passedA && !passedB ? 'REGRESSION' : 'WARNING',
      });
    }

    // Compare rules applied vs passed
    const rulesA = a.result.verification.summary;
    const rulesB = b.result.verification.summary;
    if (rulesA.rulesApplied !== rulesB.rulesApplied) {
      changes.push({
        path: 'verification.summary.rulesApplied',
        valueA: rulesA.rulesApplied,
        valueB: rulesB.rulesApplied,
        severity: 'INFO',
      });
    }
    if (rulesA.rulesPassed !== rulesB.rulesPassed) {
      changes.push({
        path: 'verification.summary.rulesPassed',
        valueA: rulesA.rulesPassed,
        valueB: rulesB.rulesPassed,
        severity:
          rulesA.rulesPassed > rulesB.rulesPassed ? 'REGRESSION' : 'WARNING',
      });
    }

    // Compare confidence
    const confA = a.result.observation.confidence;
    const confB = b.result.observation.confidence;
    if (confA !== confB) {
      changes.push({
        path: 'observation.confidence',
        valueA: confA,
        valueB: confB,
        severity: Math.abs(confA - confB) > 0.1 ? 'WARNING' : 'INFO',
      });
    }

    // Compare attestation signatures (they WILL differ, informational)
    if (a.result.attestation.signature !== b.result.attestation.signature) {
      changes.push({
        path: 'attestation.signature',
        valueA: a.result.attestation.signature,
        valueB: b.result.attestation.signature,
        severity: 'INFO',
      });
    }

    // Compare attestation verified status
    if (a.result.attestation.verified !== b.result.attestation.verified) {
      changes.push({
        path: 'attestation.verified',
        valueA: a.result.attestation.verified,
        valueB: b.result.attestation.verified,
        severity: 'REGRESSION',
      });
    }

    const regressionDetected = changes.some((c) => c.severity === 'REGRESSION');

    return {
      snapshotA: a.id,
      snapshotB: b.id,
      labelA: a.label,
      labelB: b.label,
      identical,
      changes,
      regressionDetected,
      computedAt: new Date().toISOString(),
    };
  }

  // ── Query ─────────────────────────────────────────────────────────────────

  /**
   * Get all captured snapshots
   */
  public getSnapshots(): ReplaySnapshot[] {
    return Array.from(this.snapshots.values());
  }

  /**
   * Get a single snapshot by ID
   */
  public getSnapshot(id: string): ReplaySnapshot | null {
    return this.snapshots.get(id) || null;
  }

  /**
   * Filter snapshots by tag
   */
  public getSnapshotsByTag(tag: string): ReplaySnapshot[] {
    return this.getSnapshots().filter((s) => s.tags.includes(tag));
  }

  /**
   * Get summary statistics for the replay store
   */
  public getSummary(): {
    totalSnapshots: number;
    totalReplays: number;
    uniqueClaims: number;
    tags: string[];
  } {
    const snapshots = this.getSnapshots();
    const replays = snapshots.filter((s) => s.tags.includes('replay'));
    const uniqueClaims = new Set(snapshots.map((s) => s.claim)).size;
    const allTags = new Set(snapshots.flatMap((s) => s.tags));

    return {
      totalSnapshots: snapshots.length,
      totalReplays: replays.length,
      uniqueClaims,
      tags: Array.from(allTags),
    };
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  private computeFingerprint(result: FullLoopResult): string {
    const canonical = JSON.stringify({
      passed: result.verification.summary.passed,
      rulesApplied: result.verification.summary.rulesApplied,
      rulesPassed: result.verification.summary.rulesPassed,
      confidence: result.observation.confidence,
      verified: result.attestation.verified,
    });
    return crypto.createHash('sha256').update(canonical).digest('hex');
  }
}

export default VerificationReplayEngine;
