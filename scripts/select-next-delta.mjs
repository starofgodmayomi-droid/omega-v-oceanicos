import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { compressRepository } from './compress-repo.mjs';

const EPSILON = 1e-9;
const EVIDENCE = new Set(['VERIFIED', 'DIVERGENT', 'UNKNOWN', 'NOT_EXECUTED', 'STATED']);

const finiteNonNegative = (value) =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

const text = (value) => typeof value === 'string' && value.trim().length > 0;

/**
 * Rank one feasible proposal. This does not execute it.
 * PriorityScore = estimatedValue * evidenceQuality / (risk + cost + ε)
 * Verified value stays null until evidence is VERIFIED and acceptance is met.
 */
export function selectNextDelta(candidates) {
  if (!Array.isArray(candidates)) {
    throw new Error('candidates must be an array');
  }
  const rejected = [];
  const held = [];
  const eligible = [];
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'object' || !text(candidate.id)) {
      rejected.push({ id: null, reason: 'INVALID_CANDIDATE' });
      continue;
    }
    const id = candidate.id.trim();
    if (candidate.alreadyApplied === true) {
      rejected.push({ id, reason: 'ALREADY_APPLIED' });
      continue;
    }
    if (candidate.authority === 'DENY') {
      rejected.push({ id, reason: 'DENY' });
      continue;
    }
    if (candidate.authority === 'REVIEW') {
      held.push({ id, reason: 'REVIEW' });
      continue;
    }
    if (candidate.authority !== 'ALLOW') {
      held.push({ id, reason: 'MISSING_AUTHORITY' });
      continue;
    }
    const gated =
      candidate.bounded === true &&
      candidate.policyChecked === true &&
      candidate.privacyChecked === true &&
      text(candidate.intent) &&
      text(candidate.acceptanceCriteria) &&
      text(candidate.rollback);
    if (!gated) {
      rejected.push({ id, reason: 'INELIGIBLE' });
      continue;
    }
    if (!EVIDENCE.has(candidate.evidence)) {
      rejected.push({ id, reason: 'EVIDENCE_NOT_LABELED' });
      continue;
    }
    if (
      !finiteNonNegative(candidate.estimatedValue) ||
      typeof candidate.evidenceQuality !== 'number' ||
      !Number.isFinite(candidate.evidenceQuality) ||
      candidate.evidenceQuality <= 0 ||
      candidate.evidenceQuality > 1 ||
      !finiteNonNegative(candidate.risk) ||
      !finiteNonNegative(candidate.cost)
    ) {
      rejected.push({ id, reason: 'INVALID_ESTIMATE' });
      continue;
    }
    const verifiedValue =
      candidate.evidence === 'VERIFIED' &&
      candidate.acceptanceMet === true &&
      finiteNonNegative(candidate.verifiedValue)
        ? candidate.verifiedValue
        : null;
    eligible.push({
      id,
      estimatedValue: candidate.estimatedValue,
      evidenceQuality: candidate.evidenceQuality,
      risk: candidate.risk,
      cost: candidate.cost,
      priorityScore:
        (candidate.estimatedValue * candidate.evidenceQuality) /
        (candidate.risk + candidate.cost + EPSILON),
      verifiedValue,
      safetyReduction: finiteNonNegative(candidate.safetyReduction) ? candidate.safetyReduction : 0,
      closesEvidenceGap: candidate.closesEvidenceGap === true,
      dependencyLeverage: finiteNonNegative(candidate.dependencyLeverage) ? candidate.dependencyLeverage : 0,
      reversibility: finiteNonNegative(candidate.reversibility) ? candidate.reversibility : 0,
      maintenance: finiteNonNegative(candidate.maintenance) ? candidate.maintenance : 0,
    });
  }
  eligible.sort((a, b) =>
    b.priorityScore - a.priorityScore ||
    b.safetyReduction - a.safetyReduction ||
    Number(b.closesEvidenceGap) - Number(a.closesEvidenceGap) ||
    b.dependencyLeverage - a.dependencyLeverage ||
    b.reversibility - a.reversibility ||
    a.maintenance - b.maintenance ||
    (a.id < b.id ? -1 : 1));
  if (!eligible.length) {
    return {
      equation: 'VERIFY(Δ(Intent, Reality))',
      decision: 'NONE',
      status: 'NOT_EXECUTED',
      execution: 'NOT_EXECUTED',
      selected: null,
      priorityScore: null,
      verifiedValue: null,
      held,
      rejected,
      limitation: 'A missing gate or a denied candidate is not ranked. Selection is not execution.',
    };
  }
  const selected = eligible[0];
  return {
    equation: 'VERIFY(Δ(Intent, Reality))',
    decision: 'SELECT',
    status: 'PROPOSED',
    execution: 'NOT_EXECUTED',
    selected: selected.id,
    priorityScore: selected.priorityScore,
    verifiedValue: selected.verifiedValue,
    held,
    rejected,
    limitation: 'PriorityScore ranks a proposal. It is not verified value and it is not authority to execute.',
  };
}

export function observeEcosystemDeltas(root) {
  const receipt = compressRepository(root);
  let skillEvidence = 'DIVERGENT';
  try {
    execFileSync(process.execPath, ['scripts/validate-skill-contracts.mjs'], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    skillEvidence = 'VERIFIED';
  } catch {
    skillEvidence = 'DIVERGENT';
  }
  const offWorkspace = receipt.observed.packageDirectories - receipt.observed.workspacePackages;
  const candidates = [
    {
      id: 'keep-skill-contract-gate',
      intent: 'Keep the published skill contracts inside the validator.',
      authority: 'ALLOW',
      bounded: true,
      policyChecked: true,
      privacyChecked: true,
      acceptanceCriteria: 'validate:skills exits 0',
      rollback: 'Revert the skill-list edit.',
      estimatedValue: 1,
      evidenceQuality: 1,
      risk: 1,
      cost: 1,
      evidence: skillEvidence,
      acceptanceMet: skillEvidence === 'VERIFIED',
      verifiedValue: skillEvidence === 'VERIFIED' ? 1 : null,
      alreadyApplied: skillEvidence === 'VERIFIED',
    },
    {
      id: 'promote-off-workspace-packages',
      intent: `Move ${offWorkspace} off-workspace package directories into the workspace.`,
      authority: 'DENY',
      bounded: false,
      evidence: 'NOT_EXECUTED',
      estimatedValue: offWorkspace,
      evidenceQuality: 0.2,
      risk: 8,
      cost: 5,
      alreadyApplied: false,
    },
    {
      id: 'deploy-cloud',
      intent: 'Deploy the repository.',
      authority: 'DENY',
      bounded: false,
      evidence: 'NOT_EXECUTED',
      estimatedValue: 100,
      evidenceQuality: 0.1,
      risk: 9,
      cost: 9,
      alreadyApplied: false,
    },
    {
      id: 'wire-production-admission-resolver',
      intent: 'Issue 486: connect a trusted production authority, policy, and approval source.',
      authority: 'REVIEW',
      bounded: false,
      evidence: 'UNKNOWN',
      estimatedValue: 8,
      evidenceQuality: 0.4,
      risk: 9,
      cost: 8,
      alreadyApplied: false,
    },
  ];
  return {
    receipt: {
      atom: receipt.atom,
      headSha: receipt.observed.headSha,
      deployment: receipt.claims.deployment,
      cloud: receipt.claims.cloud,
    },
    candidates,
    next: selectNextDelta(candidates),
  };
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  const observed = observeEcosystemDeltas(process.cwd());
  console.log(JSON.stringify(observed, null, 2));
}
