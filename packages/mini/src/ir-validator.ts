import type { OmegaIR } from '@oceanicos/types';

export type OmegaIRValidationIssue = {
  readonly path: string;
  readonly message: string;
};

export type OmegaIRValidation = {
  readonly valid: boolean;
  readonly issues: readonly OmegaIRValidationIssue[];
};

const nonEmpty = (value: unknown): boolean => typeof value === 'string' && value.trim().length > 0;

export function validateOmegaIR(ir: OmegaIR): OmegaIRValidation {
  const issues: OmegaIRValidationIssue[] = [];

  if (ir.version !== 'omega-ir.v1') issues.push({ path: 'version', message: 'unsupported Omega IR version' });
  if (!nonEmpty(ir.intent)) issues.push({ path: 'intent', message: 'intent must be non-empty' });

  ir.evidenceRefs.forEach((ref, index) => {
    if (!nonEmpty(ref.id)) issues.push({ path: `evidenceRefs[${index}].id`, message: 'id must be non-empty' });
    if (!nonEmpty(ref.kind)) issues.push({ path: `evidenceRefs[${index}].kind`, message: 'kind must be non-empty' });
    if (!nonEmpty(ref.source)) issues.push({ path: `evidenceRefs[${index}].source`, message: 'source must be non-empty' });
    if (ref.digest !== undefined && !nonEmpty(ref.digest)) issues.push({ path: `evidenceRefs[${index}].digest`, message: 'digest must be non-empty when supplied' });
  });

  ir.sourceRefs?.forEach((ref, index) => {
    if (!nonEmpty(ref.id)) issues.push({ path: `sourceRefs[${index}].id`, message: 'id must be non-empty' });
    if (!nonEmpty(ref.kind)) issues.push({ path: `sourceRefs[${index}].kind`, message: 'kind must be non-empty' });
    if (!nonEmpty(ref.locator)) issues.push({ path: `sourceRefs[${index}].locator`, message: 'locator must be non-empty' });
    if (!['DISCOVERED', 'RETRIEVED', 'TRUSTED', 'AUTHORIZED', 'EXECUTED', 'OBSERVED', 'VERIFIED'].includes(ref.state)) {
      issues.push({ path: `sourceRefs[${index}].state`, message: 'unsupported source state' });
    }
    if (!nonEmpty(ref.provenance)) issues.push({ path: `sourceRefs[${index}].provenance`, message: 'provenance must be non-empty' });
    if (ref.state === 'AUTHORIZED' && !nonEmpty(ref.authority)) issues.push({ path: `sourceRefs[${index}].authority`, message: 'authorized source requires authority' });
    if (ref.state === 'VERIFIED' && !nonEmpty(ref.evidenceRef)) issues.push({ path: `sourceRefs[${index}].evidenceRef`, message: 'verified source requires evidenceRef' });
  });

  ir.policyRefs.forEach((ref, index) => {
    if (!nonEmpty(ref.id)) issues.push({ path: `policyRefs[${index}].id`, message: 'id must be non-empty' });
    if (!nonEmpty(ref.version)) issues.push({ path: `policyRefs[${index}].version`, message: 'version must be non-empty' });
    if (!nonEmpty(ref.requirement)) issues.push({ path: `policyRefs[${index}].requirement`, message: 'requirement must be non-empty' });
  });

  ir.workerPlan.forEach((worker, index) => {
    if (!nonEmpty(worker.workerId)) issues.push({ path: `workerPlan[${index}].workerId`, message: 'workerId must be non-empty' });
    if (!nonEmpty(worker.version)) issues.push({ path: `workerPlan[${index}].version`, message: 'version must be non-empty' });
    if (!nonEmpty(worker.capability)) issues.push({ path: `workerPlan[${index}].capability`, message: 'capability must be non-empty' });
    if (!['read-only', 'build-test', 'local-mutating', 'external-consequence'].includes(worker.mode)) issues.push({ path: `workerPlan[${index}].mode`, message: 'unsupported worker mode' });
    if (typeof worker.approvalRequired !== 'boolean') issues.push({ path: `workerPlan[${index}].approvalRequired`, message: 'approvalRequired must be boolean' });
  });

  if (!nonEmpty(ir.transitionSpec.subject)) issues.push({ path: 'transitionSpec.subject', message: 'subject must be non-empty' });
  if (!nonEmpty(ir.transitionSpec.intent)) issues.push({ path: 'transitionSpec.intent', message: 'intent must be non-empty' });
  if (!nonEmpty(ir.transitionSpec.stateBefore)) issues.push({ path: 'transitionSpec.stateBefore', message: 'stateBefore must be non-empty' });
  if (ir.transitionSpec.requestedStateAfter !== undefined && !nonEmpty(ir.transitionSpec.requestedStateAfter)) issues.push({ path: 'transitionSpec.requestedStateAfter', message: 'requestedStateAfter must be non-empty when supplied' });
  if (ir.transitionSpec.consequence !== undefined && !nonEmpty(ir.transitionSpec.consequence)) issues.push({ path: 'transitionSpec.consequence', message: 'consequence must be non-empty when supplied' });
  if (typeof ir.transitionSpec.dryRun !== 'boolean') issues.push({ path: 'transitionSpec.dryRun', message: 'dryRun must be boolean' });

  if (!nonEmpty(ir.observationSpec.observerId)) issues.push({ path: 'observationSpec.observerId', message: 'observerId must be non-empty' });
  ir.observationSpec.targets.forEach((target, index) => {
    if (!nonEmpty(target)) issues.push({ path: `observationSpec.targets[${index}]`, message: 'target must be non-empty' });
  });
  ir.observationSpec.evidenceRequired.forEach((evidence, index) => {
    if (!nonEmpty(evidence)) issues.push({ path: `observationSpec.evidenceRequired[${index}]`, message: 'required evidence must be non-empty' });
  });

  return { valid: issues.length === 0, issues };
}
