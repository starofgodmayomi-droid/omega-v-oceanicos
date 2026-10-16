#!/usr/bin/env node
/**
 * Ω∞v Oceanicos developer operator.
 *
 * This is a finite, allowlisted local tool. It inspects the checkout and can
 * run repository-owned verification phases. It never deploys, publishes,
 * mutates Git history, contacts external services, or promotes local evidence
 * into production health.
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const exec = promisify(execFile);
const root = resolve(new URL('..', import.meta.url).pathname);
const args = process.argv.slice(2);
const json = args.includes('--json');
const command = args.find((arg) => !arg.startsWith('--')) ?? 'verify';
const timeoutMs = 120_000;

const allowedCommands = new Set(['inspect', 'verify', 'help']);
if (!allowedCommands.has(command)) {
  console.error(`Unknown dev tool command: ${command}`);
  console.error('Use: pnpm dev:tool [inspect|verify] [--json]');
  process.exit(2);
}

const run = async (file, fileArgs, options = {}) => {
  const startedAt = Date.now();
  try {
    const result = await exec(file, fileArgs, {
      cwd: root,
      timeout: timeoutMs,
      maxBuffer: 2 * 1024 * 1024,
      ...options,
    });
    return {
      status: 'PASS',
      command: [file, ...fileArgs].join(' '),
      durationMs: Date.now() - startedAt,
      stdout: result.stdout.trim(),
      stderr: result.stderr.trim(),
    };
  } catch (error) {
    return {
      status: 'FAIL',
      command: [file, ...fileArgs].join(' '),
      durationMs: Date.now() - startedAt,
      stdout: error.stdout?.trim() ?? '',
      stderr: error.stderr?.trim() ?? error.message,
      code: error.code ?? 'UNKNOWN',
    };
  }
};

const observeRuntime = async () => {
  const baseUrl = process.env.OMEGA_DEV_API_URL?.trim() || 'http://127.0.0.1:5000';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2_000);
  try {
    const [healthResponse, bodyResponse] = await Promise.all([
      fetch(`${baseUrl}/health`, { signal: controller.signal }),
      fetch(`${baseUrl}/v1/ecosystem/body`, { signal: controller.signal }),
    ]);
    const health = await healthResponse.json();
    const body = await bodyResponse.json();
    const checks = health.checks ?? {};
    const policy = health.policy ?? {};
    return {
      status: healthResponse.ok && bodyResponse.ok ? 'OBSERVED' : 'DIVERGENT',
      baseUrl,
      endpoints: {
        health: { status: healthResponse.status, readiness: health.readiness ?? null },
        ecosystemBody: { status: bodyResponse.status, bodyStatus: body.status ?? null },
      },
      readiness: {
        observer: checks.observer ?? 'UNKNOWN',
        verifier: checks.verifier ?? 'UNKNOWN',
        attester: checks.attester ?? 'UNKNOWN',
        memory: checks.memory?.status ?? 'UNKNOWN',
        authMode: policy.authMode ?? 'UNKNOWN',
        readAuthConfigured: policy.readAuthConfigured ?? null,
        adminAuthConfigured: policy.adminAuthConfigured ?? null,
        persistenceEncryption: policy.persistenceEncryption ?? 'UNKNOWN',
      },
      evidenceBoundary: 'LOCAL_RUNTIME_HTTP_ONLY',
    };
  } catch (error) {
    return {
      status: 'UNKNOWN',
      baseUrl,
      reason: error instanceof Error ? error.message : String(error),
      evidenceBoundary: 'LOCAL_RUNTIME_HTTP_ONLY',
    };
  } finally {
    clearTimeout(timeout);
  }
};

const inspect = async () => {
  const [branch, head, status, packageJson, workspace, packageDirectories, runtime] = await Promise.all([
    run('git', ['branch', '--show-current']),
    run('git', ['rev-parse', 'HEAD']),
    run('git', ['-c', 'color.ui=false', 'status', '--short', '--branch']),
    readFile(resolve(root, 'package.json'), 'utf8').then(JSON.parse),
    readFile(resolve(root, 'pnpm-workspace.yaml'), 'utf8'),
    readdir(join(root, 'packages'), { withFileTypes: true }).then((entries) =>
      entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort(),
    ),
    observeRuntime(),
  ]);
  const workspacePatterns = [...workspace.matchAll(/^\s*-\s*['"]([^'"]+)['"]$/gm)].map(
    (match) => match[1],
  );
  return {
    repository: root,
    branch: branch.stdout,
    head: head.stdout,
    status: status.stdout,
    workspacePatterns,
    packageDirectories,
    runtime,
    scripts: ['build', 'typecheck', 'test', 'verify:full', 'smoke:api', 'dev:tool'].map((name) => ({
      name,
      present: typeof packageJson.scripts?.[name] === 'string',
    })),
  };
};

const phases = [
  ['format', 'pnpm', ['run', 'format:check']],
  ['ci-contracts', 'pnpm', ['run', 'validate:ci']],
  ['skill-contracts', 'pnpm', ['run', 'validate:skills']],
  ['build', 'pnpm', ['run', 'build']],
  ['change-calculus', 'pnpm', ['run', 'test:change-calculus']],
];

const help = () => ({
  tool: 'oceanicos-dev-tool',
  usage: 'pnpm dev:tool [inspect|verify] [--json]',
  commands: {
    inspect: 'Read current repository identity, status, workspace, and required scripts.',
    verify: 'Run the finite allowlisted local verification spine.',
  },
  boundaries: [
    'No deploy, publish, push, merge, deletion, or external mutation.',
    'Local checks are evidence for this checkout and revision only.',
    'Production health and external reality remain UNKNOWN unless separately observed.',
  ],
});

const main = async () => {
  if (command === 'help') {
    const result = help();
    console.log(json ? JSON.stringify(result, null, 2) : `${result.tool}\n${result.usage}`);
    return;
  }

  const startedAt = new Date().toISOString();
  const snapshot = await inspect();
  if (command === 'inspect') {
    const result = { status: 'OBSERVED', startedAt, snapshot, evidenceBoundary: 'LOCAL_CHECKOUT_AND_OPTIONAL_RUNTIME_OBSERVATION' };
    console.log(json ? JSON.stringify(result, null, 2) : JSON.stringify(result, null, 2));
    return;
  }

  const results = [];
  for (const [name, file, fileArgs] of phases) {
    const result = await run(file, fileArgs);
    results.push({ name, ...result });
    if (result.status === 'FAIL') break;
  }
  const passed = results.length === phases.length && results.every((result) => result.status === 'PASS');
  const result = {
    status: passed ? 'VERIFIED' : 'BLOCKED',
    startedAt,
    completedAt: new Date().toISOString(),
    snapshot,
    phases: results,
    evidenceBoundary: 'LOCAL_CHECKOUT_BUILD_CONTRACTS_AND_OPTIONAL_RUNTIME_OBSERVATION',
    deployment: 'NOT_EXECUTED',
    productionHealth: 'UNKNOWN',
    nextAction: passed ? 'Review diff, then commit or open a reviewable change.' : 'Inspect the first failed phase before proceeding.',
  };
  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`Ω∞v DEV TOOL: ${result.status}`);
    console.log(`Repository: ${snapshot.repository}`);
    console.log(`Revision: ${snapshot.head}`);
    for (const phase of results) console.log(`${phase.status === 'PASS' ? '✓' : '✗'} ${phase.name} (${phase.durationMs}ms)`);
    console.log(`Deployment: ${result.deployment} · Production health: ${result.productionHealth}`);
  }
  if (!passed) process.exitCode = 1;
};

await main();
