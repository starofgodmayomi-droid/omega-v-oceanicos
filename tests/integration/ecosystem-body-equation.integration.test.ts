import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  ECOSYSTEM_BODY_EQUATION_ID,
  EQUATION_LAW_OBSERVATION,
  MAX_EQUATION_SURFACES,
  REPO_OUTWARD_RING,
  compressRepoEquation,
  compressRepoTowardUpgrade,
  expandRepoEquation,
  observeOutwardFiles,
  reconcileOutwardExpansion,
} from '../../packages/mini/src/ecosystem-body-equation.ts';

const surface = (overrides: Record<string, unknown> = {}) => ({
  id: 'equation',
  path: 'ECOSYSTEM_BODY.md',
  role: 'contract',
  evidence: 'in-process constant; not a filesystem read',
  scam: false,
  authority: 1,
  required: 1,
  expected: 'same',
  observed: 'same',
  ...overrides,
});

test('the in-process law compresses to one unexecuted upgrade and expands', () => {
  const compression = compressRepoEquation([EQUATION_LAW_OBSERVATION]);
  assert.equal(compression.status, 'COMPRESSED');
  assert.equal(compression.body?.law, ECOSYSTEM_BODY_EQUATION_ID);
  assert.equal(compression.body?.memory.length, 1);
  assert.equal(compression.body?.memory[0].path, 'ECOSYSTEM_BODY.md');
  assert.equal(compression.upgrade.execution, 'NOT_EXECUTED');
  assert.equal(compression.upgrade.authority, 'compression-is-not-permission');
  assert.equal(compression.upgrade.selected?.kind, 'review-verified-repo');
  assert.equal(compression.upgrade.selected?.evidenceHash, compression.body?.digest);
  assert.equal(compression.upgrade.selected?.id, `upgrade.${compression.body?.digest.slice(0, 16)}`);

  const expansion = expandRepoEquation({ compression: compression.body });
  assert.equal(expansion.status, 'EXPANDED');
  assert.equal(expansion.digestMatches, true);
  assert.equal(expansion.digest, compression.body?.digest);
  assert.deepEqual(
    expansion.entries.map((entry) => entry.path),
    ['ECOSYSTEM_BODY.md'],
  );
  assert.equal(compressRepoTowardUpgrade(compression.body).selected?.id, compression.upgrade.selected?.id);
});

test('the equation halts on scam, empty evidence, missing authority, and reality mismatch', () => {
  const scam = compressRepoEquation([surface({ scam: true, evidence: null })]);
  assert.equal(scam.status, 'HALTED');
  assert.equal(scam.body?.halt?.verdict, 'DIVERGENT');
  assert.equal(scam.body?.memory.length, 0);
  assert.equal(scam.upgrade.selected, null);

  const unknown = compressRepoEquation([surface({ evidence: '   ' })]);
  assert.equal(unknown.body?.halt?.verdict, 'UNKNOWN');

  const denied = compressRepoEquation([surface({ authority: 0, required: 1 })]);
  assert.equal(denied.body?.halt?.verdict, 'NOT_EXECUTED');

  const divergent = compressRepoEquation([surface({ expected: 'a', observed: 'b' })]);
  assert.equal(divergent.body?.halt?.verdict, 'DIVERGENT');
  assert.match(divergent.body?.halt?.reason ?? '', /Expected/);
  assert.equal(divergent.upgrade.execution, 'NOT_EXECUTED');
  assert.equal(divergent.upgrade.selected, null);
});

test('a halt keeps the verified prefix and expansion refuses a tampered digest', () => {
  const compression = compressRepoEquation([
    surface({ id: 'kept', path: 'README.md', role: 'docs' }),
    surface({ id: 'blocked', path: 'secret', scam: true }),
  ]);
  assert.equal(compression.status, 'HALTED');
  assert.equal(compression.body?.memory.length, 1);
  assert.equal(compression.body?.memory[0].id, 'kept');
  assert.equal(compression.upgrade.selected, null);

  const expansion = expandRepoEquation(compression.body);
  assert.equal(expansion.status, 'EXPANDED');
  assert.equal(expansion.halt?.id, 'blocked');

  const tampered = JSON.parse(JSON.stringify(compression.body));
  tampered.memory[0].observed = 'other';
  assert.equal(expandRepoEquation(tampered).status, 'INVALID');
  assert.equal(expandRepoEquation(tampered).issues[0].code, 'DIGEST_MISMATCH');
});

test('shape errors refuse the fold instead of truncating it', () => {
  const overflow = Array.from({ length: MAX_EQUATION_SURFACES + 1 }, (_value, index) =>
    surface({ id: `s${index}`, path: `docs/s${index}.md` }),
  );
  assert.equal(compressRepoEquation(overflow).status, 'INVALID');
  assert.equal(compressRepoEquation(overflow).issues[0].code, 'BODY_OVER_CAPACITY');
  assert.equal(compressRepoEquation([]).issues[0].code, 'EMPTY_BODY');
  assert.equal(compressRepoEquation([surface(), surface()]).issues[0].code, 'DUPLICATE_ID');
  assert.equal(compressRepoEquation([surface({ path: '../ECOSYSTEM_BODY.md' })]).issues[0].code, 'INVALID_PATH');
  assert.equal(compressRepoEquation([surface({ role: 'imagine' })]).issues[0].code, 'INVALID_ROLE');
});

test('filesystem observation compresses the outward ring and reconciliation catches drift', () => {
  const root = mkdtempSync(join(tmpdir(), 'omega-equation-'));
  try {
    const ring = [
      { id: 'equation', path: 'ECOSYSTEM_BODY.md', role: 'contract' as const },
      { id: 'readme', path: 'README.md', role: 'docs' as const },
    ];
    writeFileSync(join(root, 'ECOSYSTEM_BODY.md'), 'equation\n');
    writeFileSync(join(root, 'README.md'), 'outward\n');
    const observed = observeOutwardFiles(root, ring);
    const compression = compressRepoEquation(observed.surfaces);
    assert.equal(compression.status, 'COMPRESSED');
    assert.equal(compression.upgrade.execution, 'NOT_EXECUTED');
    assert.ok(compression.upgrade.selected);

    const expansion = expandRepoEquation(compression.body);
    assert.equal(reconcileOutwardExpansion(root, expansion).status, 'VERIFIED');

    writeFileSync(join(root, 'README.md'), 'changed\n');
    const drifted = reconcileOutwardExpansion(root, expansion);
    assert.equal(drifted.status, 'DIVERGENT');
    assert.equal(drifted.issues[0].code, 'DIGEST_MISMATCH');

    const missing = observeOutwardFiles(root, [
      ...ring,
      { id: 'gone', path: 'docs/missing.md', role: 'docs' as const },
    ]);
    mkdirSync(join(root, 'docs'));
    const halted = compressRepoEquation(missing.surfaces);
    assert.equal(halted.status, 'HALTED');
    assert.equal(halted.body?.halt?.verdict, 'UNKNOWN');
    assert.equal(halted.body?.halt?.path, 'docs/missing.md');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('the declared outward ring stays inside this repository', () => {
  assert.ok(REPO_OUTWARD_RING.length > 0);
  assert.ok(REPO_OUTWARD_RING.length <= MAX_EQUATION_SURFACES);
  assert.ok(REPO_OUTWARD_RING.some((surface) => surface.path === 'ECOSYSTEM_BODY.md'));
  for (const surface of REPO_OUTWARD_RING) {
    assert.equal(surface.path.includes('..'), false);
    assert.equal(surface.path.startsWith('/'), false);
  }
  const source = readFileSync(new URL('../../packages/mini/src/ecosystem-body-equation.ts', import.meta.url), 'utf8');
  assert.match(source, /ECOSYSTEM_BODY\.md/);
  assert.match(source, /NOT_EXECUTED/);
});
