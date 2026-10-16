import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export const REPO_COMPRESS_VERSION = 'omega.repo-compress.v1';

const SKILL_TOKENS = [
  'POSSIBLE',
  'AUTHORITY',
  'OBSERV',
  'VERIFIED',
  'DIVERGENT',
  'UNKNOWN',
  'NOT_EXECUTED',
];

const directories = (root, name) =>
  readdirSync(join(root, name), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

const workspaceMembers = (yaml) => {
  const members = [];
  let inPackages = false;
  for (const line of yaml.split('\n')) {
    if (line.startsWith('packages:')) {
      inPackages = true;
      continue;
    }
    if (inPackages && /^\S/.test(line)) break;
    const match = line.match(/^\s*-\s*['"]?([^'"\s]+)['"]?\s*$/);
    if (inPackages && match) members.push(match[1]);
  }
  return members;
};

export const readValidatedSkillNames = (root) => {
  const source = readFileSync(join(root, 'scripts', 'validate-skill-contracts.mjs'), 'utf8');
  const block = source.match(/const skills = \[([\s\S]*?)\];/);
  if (!block) throw new Error('skill contract list was not observed');
  const names = [...block[1].matchAll(/'([a-z0-9-]+)'/g)].map((match) => match[1]);
  if (names.length === 0) throw new Error('skill contract list was empty');
  return names;
};

const missingTokens = (source) => {
  const normalized = source.toUpperCase();
  return SKILL_TOKENS.filter((token) => !normalized.includes(token));
};

const headSha = (root) => {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
};

const boundedClaim = (value, name) => {
  if (value == null || value === '') return null;
  if (typeof value !== 'string') throw new Error(`${name} must be text`);
  const claim = value.trim();
  if (!claim || claim.length > 240) throw new Error(`${name} must be 1-240 characters`);
  return claim;
};

/**
 * Compress one observed repository tree into a receipt.
 * Stated deploy/cloud claims stay stated. This function does not deploy,
 * push, merge, or rewrite skills.
 */
export function compressRepository(root, stated = {}) {
  const deploymentClaim = boundedClaim(stated.deployment, 'deployment claim');
  const cloudClaim = boundedClaim(stated.cloud, 'cloud claim');
  const pidgin = stated.pidgin === true;

  const packageDirectories = directories(root, 'packages').filter((name) => {
    try {
      readFileSync(join(root, 'packages', name, 'package.json'));
      return true;
    } catch {
      return false;
    }
  });
  const skillDirectories = directories(root, 'skills').filter((name) => {
    try {
      readFileSync(join(root, 'skills', name, 'SKILL.md'));
      return true;
    } catch {
      return false;
    }
  });
  const members = workspaceMembers(readFileSync(join(root, 'pnpm-workspace.yaml'), 'utf8'));
  const workspacePackages = members.filter((path) => path.startsWith('packages/')).sort();
  const workspaceApps = members.filter((path) => path.startsWith('apps/')).sort();
  const validatedSkills = readValidatedSkillNames(root);
  const validated = new Set(validatedSkills);

  const uncheckedSkills = skillDirectories
    .filter((name) => !validated.has(name))
    .map((name) => ({
      name,
      missingTokens: missingTokens(readFileSync(join(root, 'skills', name, 'SKILL.md'), 'utf8')),
    }));

  const discarded = [];
  if (deploymentClaim) {
    discarded.push(
      `Deployment claim kept as stated, not observed: ${deploymentClaim}`,
    );
  }
  if (cloudClaim) {
    discarded.push(`Cloud claim kept as stated, not observed: ${cloudClaim}`);
  }

  const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const repository =
    typeof manifest.name === 'string' && manifest.name.trim() ? manifest.name.trim() : 'UNKNOWN';
  const observedHead = headSha(root);
  const offWorkspace = packageDirectories.length - workspacePackages.length;
  const body = {
    version: REPO_COMPRESS_VERSION,
    kernel: '0 → drop → field → sink → return',
    atom: `${packageDirectories.length} package dirs, ${workspacePackages.length} workspace packages, ${offWorkspace} off workspace, ${workspaceApps.length} apps, ${skillDirectories.length} skills, ${uncheckedSkills.length} unchecked, deploy NOT_EXECUTED`,
    observed: {
      repository,
      headSha: observedHead ?? 'UNKNOWN',
      headStatus: observedHead ? 'OBSERVED' : 'UNKNOWN',
      packageDirectories: packageDirectories.length,
      workspacePackages: workspacePackages.length,
      workspaceApps: workspaceApps.length,
      skillsOnDisk: skillDirectories.length,
      skillsValidated: validatedSkills.length,
    },
    claims: {
      deployment: 'NOT_EXECUTED',
      cloud: 'NOT_EXECUTED',
      totality: 'NOT_EXECUTED',
      voice: pidgin ? 'STATED' : 'NOT_EXECUTED',
    },
    uncheckedSkills,
    discarded,
    voice: pidgin
      ? 'Drop don compress. Deploy no run. Cloud no run. Skills wey never pass contract still dey outside.'
      : null,
    expansion: {
      status: 'PROPOSED',
      next:
        uncheckedSkills.length > 0
          ? `Leave ${uncheckedSkills.map((skill) => skill.name).join(', ')} outside pnpm validate:skills until each file carries the contract tokens. This receipt does not edit them and does not deploy.`
          : 'No unchecked skill remains. The next transition needs a new observation, not another slogan.',
    },
    limitations: [
      'directory presence is not import, build, test, or runtime proof',
      'workspace membership is not deployment',
      'a skill token check is not proof the skill was followed',
      'this command does not push, merge, deploy, or spend authority',
    ],
  };

  const evidence = `sha256:${createHash('sha256').update(JSON.stringify(body)).digest('hex')}`;
  return { ...body, evidence };
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  const args = process.argv.slice(2);
  const claimAfter = (flag) => {
    const index = args.indexOf(flag);
    if (index < 0) return undefined;
    const value = args[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`${flag} needs text`);
    return value;
  };
  try {
    const receipt = compressRepository(process.cwd(), {
      deployment: claimAfter('--claim-deployment'),
      cloud: claimAfter('--claim-cloud'),
      pidgin: args.includes('--pidgin'),
    });
    console.log(JSON.stringify(receipt, null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'compress failed');
    process.exitCode = 2;
  }
}
