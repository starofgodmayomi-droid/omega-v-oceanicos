#!/usr/bin/env node
/**
 * Ω∞v Oceanicos — Concurrent Dev Server Orchestrator
 *
 * Spawns both the Fastify API (port 5000) and the Vite Web dev server (port 3000)
 * simultaneously with ANSI-labeled output streams and graceful shutdown.
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m',
  dim: '\x1b[2m',
};

console.log(`
${ANSI.cyan}${ANSI.bold}╔══════════════════════════════════════════════════════════════╗
║     Ω∞v OCEANICOS DEV SERVER — CONCURRENT ORCHESTRATOR      ║
╚══════════════════════════════════════════════════════════════╝${ANSI.reset}
`);

// Determine the pnpm executable
const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

function spawnLabeled(label, color, args, cwd) {
  const prefix = `${color}[${label}]${ANSI.reset}`;
  const child = spawn(pnpm, args, {
    cwd,
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, FORCE_COLOR: '1' },
  });

  child.stdout.on('data', (data) => {
    const lines = data.toString().split('\n').filter(Boolean);
    for (const line of lines) {
      console.log(`${prefix} ${line}`);
    }
  });

  child.stderr.on('data', (data) => {
    const lines = data.toString().split('\n').filter(Boolean);
    for (const line of lines) {
      console.error(`${prefix} ${ANSI.dim}${line}${ANSI.reset}`);
    }
  });

  child.on('exit', (code) => {
    console.log(`${prefix} Process exited with code ${code}`);
  });

  return child;
}

console.log(`${ANSI.green}▸ Starting API server on http://localhost:5000${ANSI.reset}`);
console.log(`${ANSI.magenta}▸ Starting Web dev server on http://localhost:3000${ANSI.reset}`);
console.log(`${ANSI.dim}Press Ctrl+C to stop both servers.${ANSI.reset}\n`);

const apiProc = spawnLabeled('API ', ANSI.green, ['--filter', 'api', 'run', 'start'], root);
const webProc = spawnLabeled('WEB ', ANSI.magenta, ['--filter', 'web', 'run', 'dev'], root);

function shutdown() {
  console.log(`\n${ANSI.yellow}Shutting down dev servers...${ANSI.reset}`);
  apiProc.kill('SIGTERM');
  webProc.kill('SIGTERM');
  setTimeout(() => process.exit(0), 1500);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
