import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const skills = [
  'voice-bridge',
  'oread-pidgin-harmonizer',
  'kai-companion',
  'omega-mirror-water-universal-body',
  'oceanicos-full-stack',
  'oceanicos-framework',
  'oceanicos-value-navigator',
  'omega-v-full-stack',
];
const required = [
  'POSSIBLE',
  'AUTHORITY',
  'OBSERV',
  'VERIFIED',
  'DIVERGENT',
  'UNKNOWN',
  'NOT_EXECUTED',
];

for (const skill of skills) {
  const path = join(root, 'skills', skill, 'SKILL.md');
  const source = readFileSync(path, 'utf8');
  const normalized = source.toUpperCase();
  if (!source.startsWith('---\n')) throw new Error(`${skill}: missing YAML frontmatter`);
  const end = source.indexOf('\n---\n', 4);
  if (end < 0) throw new Error(`${skill}: unterminated YAML frontmatter`);
  const frontmatter = source.slice(4, end);
  for (const key of ['name:', 'description:']) {
    if (!frontmatter.split('\n').some((line) => line.startsWith(key))) {
      throw new Error(`${skill}: missing ${key}`);
    }
  }
  for (const token of required) {
    if (!normalized.includes(token)) throw new Error(`${skill}: missing contract token ${token}`);
  }
}

const names = skills.map((skill) => {
  const source = readFileSync(join(root, 'skills', skill, 'SKILL.md'), 'utf8');
  return source.match(/^name:\s*(.+)$/m)?.[1]?.trim();
});
if (new Set(names).size !== names.length) throw new Error('skill names must be unique');

const masterPrompt = join(root, 'skills', 'oceanicos-full-stack', 'references', 'master-prompt.md');
const sourceRegister = readFileSync(
  join(root, 'skills', 'oceanicos-full-stack', 'references', 'SOURCE_REGISTER.md'),
  'utf8',
);
const expectedHash = sourceRegister.match(/\| `sha256` \| `([0-9a-f]{64})` \|/)?.[1];
const actualHash = createHash('sha256').update(readFileSync(masterPrompt)).digest('hex');
if (!expectedHash || expectedHash !== actualHash) {
  throw new Error('oceanicos-full-stack: master prompt hash does not match SOURCE_REGISTER.md');
}
console.log(`validated ${skills.length} Oceanicos skill contracts`);
