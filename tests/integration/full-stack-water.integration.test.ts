import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  FULL_STACK_WATER,
  MAX_EQUATION_SURFACES,
  REPO_OUTWARD_RING,
  compressFullStackWater,
} from '../../packages/mini/src/ecosystem-body-equation.ts';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');

test('the full-stack water current is one bounded ordered flow', () => {
  assert.equal(FULL_STACK_WATER.length, 8);
  assert.ok(REPO_OUTWARD_RING.length <= MAX_EQUATION_SURFACES);
  const ids = FULL_STACK_WATER.map((surface) => surface.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(
    ids,
    [
      'water-companion',
      'water-continuum',
      'verified-upgrade-skill',
      'water-spine',
      'water-max-space',
      'water-lucid',
      'water-global-good',
      'water-computer',
    ],
  );
  for (const surface of FULL_STACK_WATER) {
    assert.equal(surface.role, 'skill');
    assert.match(surface.path, /^skills\/[a-z0-9-]+\/SKILL\.md$/);
    assert.equal(
      REPO_OUTWARD_RING.filter((entry) => entry.path === surface.path).length,
      1,
    );
  }
});

test('this checkout compresses the full-stack skills and does not execute the upgrade', () => {
  const report = compressFullStackWater(repoRoot);
  assert.equal(report.current, 'FULL_STACK_WATER');
  assert.equal(report.status, 'COMPRESSED');
  assert.equal(report.skills, FULL_STACK_WATER.length);
  assert.equal(report.halt, null);
  assert.match(report.digest ?? '', /^[0-9a-f]{64}$/);
  assert.equal(report.upgrade.execution, 'NOT_EXECUTED');
  assert.equal(report.upgrade.authority, 'compression-is-not-permission');
  assert.equal(report.upgrade.selected?.kind, 'review-verified-repo');
  assert.equal(report.upgrade.selected?.evidenceHash, report.digest);
  assert.deepEqual(
    report.flow.map((entry) => entry.path),
    FULL_STACK_WATER.map((surface) => surface.path),
  );
});

test('a published .claude twin of a water skill must match the skills copy', () => {
  for (const surface of FULL_STACK_WATER) {
    const published = surface.path.replace(/^skills\//, '.claude/skills/');
    const primary = join(repoRoot, surface.path);
    const twin = join(repoRoot, published);
    let twinBytes: Buffer;
    try {
      twinBytes = readFileSync(twin);
    } catch {
      continue;
    }
    assert.equal(
      twinBytes.equals(readFileSync(primary)),
      true,
      `${published} drifted from ${surface.path}`,
    );
  }
});

test('a missing skill halts the current and selects no upgrade', () => {
  const root = mkdtempSync(join(tmpdir(), 'omega-water-'));
  try {
    for (const surface of FULL_STACK_WATER.slice(0, -1)) {
      const file = join(root, surface.path);
      mkdirSync(join(file, '..'), { recursive: true });
      writeFileSync(file, `# ${surface.id}\n`);
    }
    const report = compressFullStackWater(root);
    assert.equal(report.status, 'HALTED');
    assert.equal(report.halt?.verdict, 'UNKNOWN');
    assert.equal(report.halt?.id, 'water-computer');
    assert.equal(report.upgrade.execution, 'NOT_EXECUTED');
    assert.equal(report.upgrade.selected, null);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

const BOUNDARY_SUITES = [
  './tests/integration/omega_change_boundary.test.ts',
  './tests/integration/omega_pipeline.e2e.test.ts',
  './tests/integration/omega_transition_boundary.test.ts',
];

test('release scripts run the change, pipeline, and transition boundaries', () => {
  const manifest = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8')) as {
    scripts: Record<string, string>;
  };
  for (const name of ['test', 'test:e2e'] as const) {
    for (const file of BOUNDARY_SUITES) {
      assert.ok(manifest.scripts[name].includes(file), `${name} omits ${file}`);
    }
  }
  assert.doesNotMatch(manifest.scripts['test:fast'], /omega_change_boundary/);
});
