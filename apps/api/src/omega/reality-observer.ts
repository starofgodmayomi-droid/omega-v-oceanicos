import crypto from 'node:crypto';
import type {
  OmegaCommandResult,
  OmegaObservation,
  OmegaRealityVerdict,
} from '@oceanicos/types';

export class RealityObserverEngine {
  public static createObservation(
    observerType: OmegaObservation['observerType'],
    target: string,
    observedData: Record<string, unknown>
  ): OmegaObservation {
    const timestamp = new Date().toISOString();
    const serialized = JSON.stringify({ observerType, target, observedData });
    const stateHash = crypto.createHash('sha256').update(serialized).digest('hex');

    return {
      observerId: `obs_${crypto.randomUUID()}`,
      observerType,
      target,
      timestamp,
      observedData,
      stateHash,
    };
  }

  public static verifyReality(
    result: OmegaCommandResult,
    observation?: OmegaObservation
  ): OmegaRealityVerdict {
    const evaluatedAt = new Date().toISOString();

    if (result.status !== 'EXECUTED' && result.status !== 'ATTESTED') {
      return {
        verdict: 'NOT_EXECUTED',
        discrepancies: [`Command is in status ${result.status}, not EXECUTED.`],
        evaluatedAt,
      };
    }

    if (!observation) {
      return {
        verdict: 'UNKNOWN',
        discrepancies: ['No external reality observation was attached.'],
        evaluatedAt,
      };
    }

    // Hash of claimed state after
    const claimedSerialized = JSON.stringify(result.stateAfter || {});
    const claimedHash = crypto.createHash('sha256').update(claimedSerialized).digest('hex');
    const observedHash = observation.stateHash;

    const discrepancies: string[] = [];

    // Check target match
    const claimedTarget = result.stateAfter?.transitionTarget;
    if (claimedTarget && claimedTarget !== observation.target) {
      discrepancies.push(
        `Target mismatch: claimed "${claimedTarget}" but observed "${observation.target}".`
      );
    }

    // Check specific state observations if provided
    if (observation.observedData && typeof observation.observedData === 'object') {
      const isFailed = observation.observedData.failed === true || observation.observedData.error;
      if (isFailed) {
        discrepancies.push(`External observer reported failure: ${observation.observedData.error || 'unknown failure'}`);
      }
    }

    if (discrepancies.length > 0) {
      return {
        verdict: 'DIVERGENT',
        claimedStateHash: claimedHash,
        observedStateHash: observedHash,
        discrepancies,
        evaluatedAt,
      };
    }

    return {
      verdict: 'VERIFIED',
      claimedStateHash: claimedHash,
      observedStateHash: observedHash,
      discrepancies: [],
      evaluatedAt,
    };
  }
}
