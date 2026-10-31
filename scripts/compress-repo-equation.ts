import { observeOutwardFiles, compressRepoEquation, expandRepoEquation, reconcileOutwardExpansion, REPO_OUTWARD_RING } from '../packages/mini/src/ecosystem-body-equation.ts';

const root = process.argv[2] ?? process.cwd();
const observed = observeOutwardFiles(root, REPO_OUTWARD_RING);
const compression = compressRepoEquation(observed.surfaces);
const expansion = compression.body ? expandRepoEquation(compression.body) : null;
const reconciliation = expansion ? reconcileOutwardExpansion(root, expansion) : null;

const report = {
  root,
  law: 'ECOSYSTEM_BODY.md',
  ring: REPO_OUTWARD_RING.length,
  status: compression.status,
  digest: compression.body?.digest ?? null,
  remembered: compression.body?.memory.length ?? 0,
  halt: compression.body?.halt ?? null,
  upgrade: compression.upgrade,
  outward: expansion?.status === 'EXPANDED'
    ? expansion.entries.map((entry) => ({ path: entry.path, role: entry.role, hash: entry.observed }))
    : [],
  reconciliation: reconciliation?.status ?? null,
  issues: compression.issues,
  evidenceBoundary:
    'A COMPRESSED status means this process read each outward path and the bytes were non-empty. It is not a deploy, a merge, or permission to upgrade. upgrade.execution stays NOT_EXECUTED.',
};

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (compression.status === 'COMPRESSED' && reconciliation?.status === 'VERIFIED') process.exit(0);
if (compression.status === 'HALTED') process.exit(2);
process.exit(1);
