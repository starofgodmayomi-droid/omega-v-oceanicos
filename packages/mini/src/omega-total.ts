import { Observer } from '@omega-v/observer';
import { Remember } from '@omega-v/remember';
import { VerificationEngine } from '@omega-v/verification';
import {
  EventLogEntry,
  TotalityManifest,
  TotalityMetadata,
  VerificationRule,
} from '@omega-v/types';

/** Dependencies used by {@link OmegaTotalAdapter}. */
export type OmegaTotalAdapterOptions = {
  observer?: Observer;
  verification?: VerificationEngine;
  memory?: Remember;
  rules?: VerificationRule[];
};

/**
 * A small adapter for the bounded Observe → Verify → Remember cycle.
 *
 * The manifest reports the evidence produced by local components. It does not
 * create attestations, authorization decisions, provider identities, or
 * deployment/global-truth assertions.
 */
export class OmegaTotalAdapter {
  public readonly observer: Observer;
  public readonly verification: VerificationEngine;
  public readonly memory: Remember;

  constructor(options: OmegaTotalAdapterOptions = {}) {
    this.observer = options.observer ?? new Observer();
    this.verification = options.verification ?? new VerificationEngine();
    this.memory = options.memory ?? new Remember();

    for (const rule of options.rules ?? []) {
      this.verification.registerRule(rule);
    }
  }

  /** Run the standard Observe → Verify → Remember cycle. */
  public run(metadata: TotalityMetadata): TotalityManifest {
    this.validateMetadata(metadata);

    const observation = this.observer.observe(metadata);
    const verification = this.verification.verify(observation);
    const beforeSize = this.memory.size();
    const memory = this.memory.remember(observation, verification);
    const entries: EventLogEntry[] = [...this.memory.all().slice(beforeSize)];

    return {
      observation,
      verification,
      memory,
      entries,
      ...(hasVerifiedEvidence(verification)
        ? {
            completion: {
              observationId: observation.id,
              verificationId: verification.id,
              memoryId: memory.id,
            },
          }
        : {}),
    };
  }

  private validateMetadata(metadata: TotalityMetadata): void {
    const errors: string[] = [];

    if (!metadata || typeof metadata !== 'object') {
      throw new Error('Totality metadata validation failed: metadata must be an object');
    }

    if (!isNonEmptyString(metadata.claim)) errors.push('claim must be a non-empty string');
    if (metadata.category !== undefined && !isNonEmptyString(metadata.category)) {
      errors.push('category must be a non-empty string when provided');
    }
    if (!isNonEmptyString(metadata.source?.system))
      errors.push('source.system must be a non-empty string');
    if (!isNonEmptyString(metadata.source?.version))
      errors.push('source.version must be a non-empty string');
    if (!isNonEmptyString(metadata.source?.environment)) {
      errors.push('source.environment must be a non-empty string');
    }
    if (!isNonEmptyString(metadata.observedBy))
      errors.push('observedBy must be a non-empty string');
    if (!isPlainRecord(metadata.metadata)) errors.push('metadata must be a record');
    if (typeof metadata.confidence !== 'number' || !Number.isFinite(metadata.confidence)) {
      errors.push('confidence must be a finite number');
    }
    if (!isNonEmptyString(metadata.confidenceReason)) {
      errors.push('confidenceReason must be a non-empty string');
    }
    if (metadata.parentId !== undefined && !isNonEmptyString(metadata.parentId)) {
      errors.push('parentId must be a non-empty string when provided');
    }
    if (
      metadata.lineage !== undefined &&
      (!Array.isArray(metadata.lineage) ||
        metadata.lineage.length > 32 ||
        metadata.lineage.some((id) => !isNonEmptyString(id)))
    ) {
      errors.push('lineage must contain at most 32 non-empty string identifiers');
    }

    if (errors.length > 0) {
      throw new Error(`Totality metadata validation failed: ${errors.join('; ')}`);
    }
  }
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasVerifiedEvidence(verification: ReturnType<VerificationEngine['verify']>): boolean {
  return (
    verification.status === 'completed' &&
    verification.summary.passed &&
    verification.summary.rulesApplied > 0 &&
    verification.summary.rulesPassed === verification.summary.rulesApplied &&
    verification.evidencePath.length > 0 &&
    verification.evidencePath.every((step) => step.passed && step.evaluated === true)
  );
}
