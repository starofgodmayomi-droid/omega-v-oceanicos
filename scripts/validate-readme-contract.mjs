import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';

const root = process.cwd();
const promptPath = resolve(root, 'WHOLE-ECOSYSTEM-MASTER-PROMPT.md');
const compatibilityPath = resolve(root, 'docs/WHOLE-ECOSYSTEM-MASTER-PROMPT.md');
const heading = '## Whole-ecosystem alignment';
const errors = [];

if (!existsSync(promptPath)) errors.push('missing root WHOLE-ECOSYSTEM-MASTER-PROMPT.md');

const prompt = existsSync(promptPath) ? readFileSync(promptPath, 'utf8') : '';
for (const marker of [
  '<!-- BEGIN PRESERVED USER SOURCE: pasted_content.txt -->',
  '<!-- END PRESERVED USER SOURCE: pasted_content.txt -->',
]) {
  if (!prompt.includes(marker)) errors.push(`root master prompt is missing source marker: ${marker}`);
}

if (!existsSync(compatibilityPath)) {
  errors.push('missing docs/WHOLE-ECOSYSTEM-MASTER-PROMPT.md compatibility pointer');
} else {
  const compatibility = readFileSync(compatibilityPath, 'utf8');
  if (!compatibility.includes('../WHOLE-ECOSYSTEM-MASTER-PROMPT.md')) {
    errors.push('docs/WHOLE-ECOSYSTEM-MASTER-PROMPT.md does not point to the root master prompt');
  }
}

let trackedFiles;
try {
  trackedFiles = execFileSync(
    'git',
    ['ls-files', '-z', ':(icase,glob)**/readme*'],
    { cwd: root },
  ).toString('utf8').split('\0');
} catch (error) {
  console.error('Unable to enumerate tracked files with git ls-files.');
  console.error(error);
  process.exit(1);
}

const readmes = trackedFiles
  .filter((file) => file && basename(file).toLowerCase().startsWith('readme'))
  .sort();

if (readmes.length === 0) errors.push('no tracked README files found');

for (const file of readmes) {
  const absolutePath = resolve(root, file);
  const text = readFileSync(absolutePath, 'utf8');
  const relativeLabel = file.replaceAll('\\', '/');

  if (text.split(heading).length - 1 !== 1) {
    errors.push(`${relativeLabel}: expected exactly one "${heading}" section`);
  }

  if (!text.includes('SOURCE → ROOT → SUCCESS')) {
    errors.push(`${relativeLabel}: missing SOURCE → ROOT → SUCCESS alignment`);
  }
  if (!text.includes('`UNKNOWN`') || !text.includes('`DIVERGENT`')) {
    errors.push(`${relativeLabel}: must keep UNKNOWN and DIVERGENT explicit`);
  }

  const links = Array.from(text.matchAll(/\[Whole-Ecosystem Master Prompt\]\(([^)]+)\)/g));
  if (links.length !== 1) {
    errors.push(`${relativeLabel}: expected exactly one canonical master-prompt link, found ${links.length}`);
    continue;
  }

  const target = links[0][1];
  if (/^(?:https?:|mailto:|\/)/i.test(target)) {
    errors.push(`${relativeLabel}: master-prompt link must be repository-relative`);
    continue;
  }

  let resolvedTarget;
  try {
    resolvedTarget = resolve(dirname(absolutePath), decodeURIComponent(target));
  } catch {
    errors.push(`${relativeLabel}: master-prompt link has invalid URI encoding`);
    continue;
  }

  if (resolvedTarget !== promptPath || !existsSync(resolvedTarget)) {
    errors.push(`${relativeLabel}: master-prompt link must resolve to the root canonical prompt`);
  }
}

if (errors.length > 0) {
  console.error(`README ecosystem contract validation failed (${errors.length} issue(s)):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`validated ${readmes.length} tracked README ecosystem contracts and the canonical source prompt`);
