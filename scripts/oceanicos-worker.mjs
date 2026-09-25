#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const continuous = args.has('--continuous');
const verify = args.has('--verify');
const MAX_CYCLES = 32;
const MAX_INTERVAL_MS = 60 * 60 * 1000;

function parseBoundedInteger(name, rawValue, defaultValue, minimum, maximum) {
  const value = rawValue === undefined ? defaultValue : Number(rawValue);
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`[Ω∞ WORKER] ${name} must be an integer between ${minimum} and ${maximum}; received ${rawValue ?? 'undefined'}.`);
  }
  return value;
}

const maxCycles = parseBoundedInteger('OMEGA_WORKER_CYCLES', process.env.OMEGA_WORKER_CYCLES, 1, 1, MAX_CYCLES);
const intervalMs = parseBoundedInteger('OMEGA_WORKER_INTERVAL_MS', process.env.OMEGA_WORKER_INTERVAL_MS, 5000, 0, MAX_INTERVAL_MS);
const pnpmCommand = process.platform === 'win32'
  ? path.join(process.env.PNPM_HOME || '', 'pnpm.cmd')
  : 'pnpm';
const pnpmArgs = (script) => [script];
const commands = verify
  ? [
      ['build', pnpmCommand, pnpmArgs('build')],
      ['typecheck', pnpmCommand, pnpmArgs('typecheck')],
      ['test', pnpmCommand, pnpmArgs('test:e2e')],
    ]
  : [['inspect', process.platform === 'win32' ? 'cmd.exe' : 'sh', process.platform === 'win32'
      ? ['/d', '/c', 'git status --short --branch']
      : ['-lc', 'git status --short --branch']]];

function run(label, command, commandArgs) {
  return new Promise((resolve) => {
    console.log(`\n[Ω∞ WORKER] ${label}`);
    console.log(`[Ω∞ WORKER] ${command} ${commandArgs.join(' ')}`);

    const child = spawn(command, commandArgs, {
      cwd: root,
      stdio: 'inherit',
      shell: process.platform === 'win32',
      windowsHide: true,
    });

    child.on('close', (code, signal) => {
      const ok = code === 0;
      console.log(`[Ω∞ WORKER] ${label}: ${ok ? 'VERIFIED' : 'FAILED'}${signal ? ` (${signal})` : ''}`);
      resolve(ok);
    });

    child.on('error', (error) => {
      console.error(`[Ω∞ WORKER] ${label}: ERROR — ${error.message}`);
      resolve(false);
    });
  });
}

function printMode() {
  console.log('\n💧 Ω∞v | OCEANICOS — BOUNDED FULL-STACK WORKER');
  console.log('MODE=FULL_STACK');
  console.log('MOOD=PROACTIVE');
  console.log(`MOTION=${continuous ? 'CONTINUOUS_BOUNDED' : 'FINITE'}`);
  console.log('AUTHORITY=EVIDENCE_BOUND');
  console.log('HUMAN_ROUTING=ON');
  console.log('NO_SPECULATION=ON');
  console.log('EXTERNAL_ACTION=OFF');
  console.log('GIT_WRITE=OFF');
  console.log(`VERIFY=${verify ? 'ON' : 'OFF'}`);
}

async function executeCycle(index) {
  console.log(`\n=== WORKER CYCLE ${index} ===`);
  console.log('OBSERVE → MAP → BUILD/VERIFY → REPORT → STOP');

  if (!existsSync(path.join(root, 'package.json'))) {
    console.error('[Ω∞ WORKER] package.json not found; refusing to operate.');
    return false;
  }

  let allPassed = true;
  for (const [label, command, commandArgs] of commands) {
    const passed = await run(label, command, commandArgs);
    allPassed &&= passed;
    if (!passed && verify) break;
  }

  console.log(`\n[Ω∞ WORKER] CYCLE ${index}: ${allPassed ? 'VERIFIED' : 'NOT VERIFIED'}`);
  return allPassed;
}

printMode();

let cycleIndex = 0;
let success = true;

while (cycleIndex < maxCycles) {
  cycleIndex += 1;
  success = await executeCycle(cycleIndex);

  if (!continuous || !success || cycleIndex >= maxCycles) break;
  await new Promise((resolve) => setTimeout(resolve, intervalMs));
}

console.log('\n[Ω∞ WORKER] FINAL STATE');
console.log(success ? 'READY FOR NEXT VERIFIED ITERATION.' : 'STOPPED ON UNVERIFIED/FAILED STATE.');
process.exitCode = success ? 0 : 1;
