import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { compressRepository } from './compress-repo.mjs';

const EVIDENCE = new Set(['VERIFIED', 'DIVERGENT', 'UNKNOWN', 'NOT_EXECUTED', 'STATED']);

const finiteNonNegative = (value) =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

/**
 * NEXT = argmax verifiedValue / (risk + cost)
 * Only VERIFIED evidence may compete. Selection is not execution.
 */
export function selectNextDelta(candidates) {
  if (!Array.isArray(candidates)) {
    throw new Error('candidates must be an array');
  }
  const rejected = [];
  const eligible = [];
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'object' || typeof candidate.id !== 'string' || !candidate.id.trim()) {
      rejected.push({ id: null, reason: 'INVALID_CANDIDATE' });
      continue;
    }
    const id = candidate.id.trim();
    if (!EVIDENCE.has(candidate.evidence)) {
      rejected.push({ id, reason: 'EVIDENCE_NOT_LABELED' });
      continue;
    }
    if (candidate.evidence !== 'VERIFIED') {
      rejected.push({ id, reason: 'EVIDENCE_NOT_VERIFIED' });
      continue;
    }
    if (candidate.alreadyApplied === true) {
      rejected.push({ id, reason: 'ALREADY_APPLIED' });
      continue;
    }
    if (!finiteNonNegative(candidate.verifiedValue)) {
      rejected.push({ id, reason: 'INVALID_VALUE' });
      continue;
    }
    if (!finiteNonNegative(candidate.risk) || !finiteNonNegative(candidate.cost) || candidate.risk + candidate.cost <= 0) {
      rejected.push({ id, reason: 'INVALID_DENOMINATOR' });
      continue;
    }
    eligible.push({
      id,
      verifiedValue: candidate.verifiedValue,
      risk: candidate.risk,
      cost: candidate.cost,
      score: candidate.verifiedValue / (candidate.risk + candidate.cost),
    });
  }
  eligible.sort((a, b) => b.score - a.score || a.risk - b.risk || (a.id < b.id ? -1 : 1));
  if (!eligible.length) {
    return {
      equation: 'VERIFY(Δ(Intent, Reality))',
      decision: 'NONE',
      status: 'NOT_EXECUTED',
      selected: null,
      score: null,
      rejected,
      limitation: 'No unverified, already-applied, or unscored delta is promoted to next.',
    };
  }
  return {
    equation: 'VERIFY(Δ(Intent, Reality))',
    decision: 'SELECT',
    status: 'PROPOSED',
    selected: eligible[0].id,
    score: eligible[0].score,
    rejected,
    limitation: 'A selected delta is not authorization to execute it.',
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
      verifiedValue: 1,
      risk: 1,
      cost: 1,
      evidence: skillEvidence,
      alreadyApplied: skillEvidence === 'VERIFIED',
    },
    {
      id: 'promote-off-workspace-packages',
      verifiedValue: offWorkspace,
      risk: 8,
      cost: 5,
      evidence: 'NOT_EXECUTED',
      alreadyApplied: false,
    },
    {
      id: 'deploy-cloud',
      verifiedValue: 100,
      risk: 9,
      cost: 9,
      evidence: 'NOT_EXECUTED',
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
  if (observed.next.decision === 'NONE') process.exitCode = 0;
}
