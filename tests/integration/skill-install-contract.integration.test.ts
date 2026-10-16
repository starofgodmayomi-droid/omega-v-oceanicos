import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

const root = process.cwd();
const installedDir = join(root, '.claude', 'skills');

const loadable = [
  'oceanicos-full-stack-companion',
  'oceanicos-max-space-full-stack',
  'oceanicos-verified-upgrade',
  'omega-v-os',
  'lucid-continuum',
] as const;

test('published Oceanicos skill contracts validate', () => {
  const output = execFileSync(process.execPath, ['scripts/validate-skill-contracts.mjs'], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.match(output, /validated 13 Oceanicos skill contracts/);
});

test('CI runs the skill contract check', () => {
  const workflow = readFileSync(join(root, '.github', 'workflows', 'verify.yml'), 'utf8');
  assert.match(workflow, /pnpm validate:skills/);
});

test('installed skills match the hashes the README records', () => {
  const readme = readFileSync(join(installedDir, 'README.md'), 'utf8');
  const recorded = new Map(
    Array.from(readme.matchAll(/^\|\s*`([a-z0-9-]+)`\s*\|\s*`([0-9a-f]{64})`\s*\|/gm)).map(
      (match) => [match[1], match[2]] as const,
    ),
  );
  const installed = readdirSync(installedDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  assert.ok(recorded.size >= 8);
  assert.deepEqual([...recorded.keys()].sort(), installed);
  for (const skill of installed) {
    const source = readFileSync(join(installedDir, skill, 'SKILL.md'));
    const digest = createHash('sha256').update(source).digest('hex');
    assert.equal(digest, recorded.get(skill), skill);
    const text = source.toString('utf8');
    assert.equal(text.startsWith('---\n'), true);
    assert.match(text, new RegExp(`^name:\\s*${skill}\\s*$`, 'm'));
    assert.match(text, /^description:\s*\S/m);
  }
});

test('the five OS skills are the same bytes published and installed', () => {
  for (const skill of loadable) {
    const published = join(root, 'skills', skill, 'SKILL.md');
    const installed = join(installedDir, skill, 'SKILL.md');
    assert.equal(existsSync(published), true, published);
    assert.equal(existsSync(installed), true, installed);
    assert.equal(readFileSync(published).equals(readFileSync(installed)), true, skill);
  }
});

test('expanded companion reference files stay byte-identical when published and installed', () => {
  const skill = 'oceanicos-full-stack-companion';
  const publishedDir = join(root, 'skills', skill, 'references');
  const installedSkillDir = join(installedDir, skill, 'references');
  const publishedExists = existsSync(publishedDir);
  const installedExists = existsSync(installedSkillDir);

  // The current mainline companion has no reference pack yet. When either side
  // introduces one, require both copies to exist and remain structurally identical.
  assert.equal(publishedExists, installedExists, 'published and installed reference directories must both exist');
  if (!publishedExists) return;

  const publishedFiles = readdirSync(publishedDir).sort();
  const installedFiles = readdirSync(installedSkillDir).sort();
  assert.ok(publishedFiles.length > 0, 'expanded companion reference pack must not be empty');
  assert.deepEqual(installedFiles, publishedFiles, 'published and installed reference file sets must match');

  for (const file of publishedFiles) {
    const published = readFileSync(join(publishedDir, file));
    const installed = readFileSync(join(installedSkillDir, file));
    assert.equal(installed.equals(published), true, `reference drift: ${skill}/references/${file}`);
  }
});
