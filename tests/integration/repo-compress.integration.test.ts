import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { compressRepository } from '../../scripts/compress-repo.mjs';

const root = process.cwd();

test('compression receipt refuses stated deployment and cloud claims', () => {
  const receipt = compressRepository(root, {
    deployment: '100% DEPLOYED',
    cloud: 'move everything go cloud',
    pidgin: true,
  });
  assert.equal(receipt.claims.deployment, 'NOT_EXECUTED');
  assert.equal(receipt.claims.cloud, 'NOT_EXECUTED');
  assert.equal(receipt.claims.totality, 'NOT_EXECUTED');
  assert.equal(receipt.claims.voice, 'STATED');
  assert.equal(receipt.expansion.status, 'PROPOSED');
  assert.match(receipt.evidence, /^sha256:[a-f0-9]{64}$/);
  assert.ok(receipt.discarded.some((line) => line.includes('100% DEPLOYED')));
  assert.ok(receipt.discarded.some((line) => line.includes('move everything go cloud')));
  assert.equal(receipt.observed.repository, 'omega-v-oceanicos');
  assert.ok(receipt.observed.packageDirectories > receipt.observed.workspacePackages);
  assert.deepEqual(
    receipt.uncheckedSkills.map((skill) => skill.name),
    [],
  );
  assert.equal(
    receipt.uncheckedSkills.some((skill) => skill.name === 'omega-reality-first'),
    false,
  );
});

test('the compress command is wired and prints the same refusal', () => {
  const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
    scripts: Record<string, string>;
  };
  const testPath = './tests/integration/repo-compress.integration.test.ts';
  assert.equal(manifest.scripts['compress:repo'], 'node scripts/compress-repo.mjs');
  for (const script of ['test', 'test:e2e']) {
    assert.ok(manifest.scripts[script]?.includes(testPath), `${script} must run ${testPath}`);
  }
  const output = execFileSync(
    process.execPath,
    ['scripts/compress-repo.mjs', '--claim-deployment', '100% DEPLOYED', '--pidgin'],
    { cwd: root, encoding: 'utf8' },
  );
  const receipt = JSON.parse(output);
  assert.equal(receipt.claims.deployment, 'NOT_EXECUTED');
  assert.equal(receipt.claims.voice, 'STATED');
  assert.match(receipt.atom, /deploy NOT_EXECUTED$/);
});

test('omega-reality-first is inside the skill contract gate', () => {
  const output = execFileSync(process.execPath, ['scripts/validate-skill-contracts.mjs'], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.match(output, /validated 16 Oceanicos skill contracts/);
  const source = readFileSync(join(root, 'scripts', 'validate-skill-contracts.mjs'), 'utf8');
  assert.match(source, /'omega-reality-first'/);
});
