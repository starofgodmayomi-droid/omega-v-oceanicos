import assert from 'node:assert/strict';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const script = resolve(fileURLToPath(new URL('.', import.meta.url)), 'elion-veral.sh');

function findBash() {
  if (process.platform === 'win32') {
    const candidates = [
      'C:\\Program Files\\Git\\bin\\bash.exe',
      'C:\\Program Files\\Git\\usr\\bin\\bash.exe',
      'C:\\Git\\bin\\bash.exe',
      'C:\\Git\\usr\\bin\\bash.exe',
    ];
    for (const c of candidates) {
      if (existsSync(c)) return c;
    }
  }
  return 'bash';
}

function installFakePnpm(directory) {
  const executable = join(directory, 'pnpm');
  writeFileSync(
    executable,
    `#!/usr/bin/env bash
set -eu
printf '%s\\n' "$*" >>"$FAKE_PNPM_CALLS"
case "$*" in
  "--filter web run build")
    touch "$FAKE_PNPM_STATE/web-started"
    ;;
  "--filter api... run build")
    touch "$FAKE_PNPM_STATE/api-started"
    ;;
esac
if [[ "$*" == "--filter web run build" || "$*" == "--filter api... run build" ]]; then
  for _ in {1..100}; do
    if [[ -f "$FAKE_PNPM_STATE/web-started" && -f "$FAKE_PNPM_STATE/api-started" ]]; then
      break
    fi
    sleep 0.02
  done
  [[ -f "$FAKE_PNPM_STATE/web-started" && -f "$FAKE_PNPM_STATE/api-started" ]]
fi
if [[ "\${FAKE_PNPM_FAIL:-}" == "$*" ]]; then
  exit 17
fi
`
  );
  chmodSync(executable, 0o755);
  return executable;
}

function toPosix(p) {
  return p.replace(/\\/g, '/');
}

function runOrchestrator({ failOn } = {}) {
  const directory = mkdtempSync(join(tmpdir(), 'elion-veral-'));
  const state = toPosix(join(directory, 'state'));
  const calls = toPosix(join(directory, 'calls.log'));
  const bin = toPosix(join(directory, 'bin'));
  const originalPath = process.env.PATH;
  const originalState = process.env.FAKE_PNPM_STATE;
  const originalCalls = process.env.FAKE_PNPM_CALLS;
  const originalFailure = process.env.FAKE_PNPM_FAIL;

  try {
    mkdirSync(join(directory, 'state'));
    mkdirSync(join(directory, 'bin'));
    installFakePnpm(join(directory, 'bin'));
    const bashCmd = findBash();
    const pathSep = process.platform === 'win32' ? ';' : ':';
    const result = spawnSync(bashCmd, [toPosix(script)], {
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${join(directory, 'bin')}${pathSep}${originalPath ?? ''}`,
        FAKE_PNPM_STATE: state,
        FAKE_PNPM_CALLS: calls,
        ...(failOn ? { FAKE_PNPM_FAIL: failOn } : {}),
      },
      timeout: 15_000,
    });
    return {
      result,
      calls: readFileSync(join(directory, 'calls.log'), 'utf8').trim().split('\n').filter(Boolean),
    };
  } finally {
    if (originalPath === undefined) delete process.env.PATH;
    else process.env.PATH = originalPath;
    if (originalState === undefined) delete process.env.FAKE_PNPM_STATE;
    else process.env.FAKE_PNPM_STATE = originalState;
    if (originalCalls === undefined) delete process.env.FAKE_PNPM_CALLS;
    else process.env.FAKE_PNPM_CALLS = originalCalls;
    if (originalFailure === undefined) delete process.env.FAKE_PNPM_FAIL;
    else process.env.FAKE_PNPM_FAIL = originalFailure;
    rmSync(directory, { recursive: true, force: true });
  }
}

test('ELION builds run concurrently before VERAL serial gates', () => {
  const { result, calls } = runOrchestrator();

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(calls.slice(0, 2).sort(), [
    '--filter api... run build',
    '--filter web run build',
  ]);
  assert.deepEqual(calls.slice(2), ['lint', 'test', 'validate:swarm']);
  assert.match(result.stdout, /Ledger mutation: NONE/);
  assert.match(result.stdout, /Upgrade execution: NOT_EXECUTED/);
});

test('ELION build failure stops before serial verification', () => {
  const { result, calls } = runOrchestrator({ failOn: '--filter web run build' });

  assert.equal(result.status, 1);
  assert.deepEqual(calls.slice(0, 2).sort(), [
    '--filter api... run build',
    '--filter web run build',
  ]);
  assert.deepEqual(calls.slice(2), []);
  assert.match(result.stderr, /DIVERGENT: parallel build failed/);
});

test('ELION API and dependency build failure stops before serial verification', () => {
  const { result, calls } = runOrchestrator({ failOn: '--filter api... run build' });

  assert.equal(result.status, 1);
  assert.deepEqual(calls.slice(0, 2).sort(), [
    '--filter api... run build',
    '--filter web run build',
  ]);
  assert.deepEqual(calls.slice(2), []);
  assert.match(result.stderr, /DIVERGENT: parallel build failed/);
});

test('VERAL serial gate failure stops later verification gates', () => {
  const { result, calls } = runOrchestrator({ failOn: 'lint' });

  assert.equal(result.status, 17);
  assert.deepEqual(calls.slice(0, 2).sort(), [
    '--filter api... run build',
    '--filter web run build',
  ]);
  assert.deepEqual(calls.slice(2), ['lint']);
  assert.doesNotMatch(result.stdout, /VERIFIED:/);
  assert.match(result.stderr, /DIVERGENT: lint failed \(exit 17\); subsequent gates were not run/);
});

test('VERAL test failure skips swarm validation and reports earlier gates', () => {
  const { result, calls } = runOrchestrator({ failOn: 'test' });

  assert.equal(result.status, 17);
  assert.deepEqual(calls.slice(2), ['lint', 'test']);
  assert.match(result.stdout, /\[VERAL\] lint passed\./);
  assert.doesNotMatch(result.stdout, /VERIFIED:/);
  assert.match(result.stderr, /DIVERGENT: test failed \(exit 17\); subsequent gates were not run/);
});

test('VERAL swarm validation failure preserves earlier results and does not report success', () => {
  const { result, calls } = runOrchestrator({ failOn: 'validate:swarm' });

  assert.equal(result.status, 17);
  assert.deepEqual(calls.slice(2), ['lint', 'test', 'validate:swarm']);
  assert.match(result.stdout, /\[VERAL\] lint passed\./);
  assert.match(result.stdout, /\[VERAL\] test passed\./);
  assert.doesNotMatch(result.stdout, /VERIFIED:/);
  assert.match(
    result.stderr,
    /DIVERGENT: validate:swarm failed \(exit 17\); subsequent gates were not run/
  );
});
