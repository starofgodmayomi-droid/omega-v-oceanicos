#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires */
const { spawn } = require('node:child_process');
const { request } = require('node:http');
const { resolve } = require('node:path');

const root = resolve(__dirname, '..');
const apiRoot = resolve(root, 'apps/api');
const port = Number(process.env.API_PORT || 3210);
const api = spawn(process.execPath, ['dist/server.js'], {
  cwd: apiRoot,
  env: {
    ...process.env,
    API_PORT: String(port),
    OMEGA_SIGNING_KEY: process.env.OMEGA_SIGNING_KEY || 'local-smoke-test-key',
    OMEGA_PERSISTENCE: 'off',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let output = '';
api.stdout.on('data', (chunk) => {
  output += chunk.toString();
});
api.stderr.on('data', (chunk) => {
  output += chunk.toString();
});

const stop = (code) => {
  if (!api.killed) api.kill('SIGTERM');
  setTimeout(() => process.exit(code), 100);
};

const call = (method, path, body) =>
  new Promise((resolveCall, reject) => {
    const payload = body === undefined ? undefined : JSON.stringify(body);
    const req = request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method,
        headers: payload ? { 'content-type': 'application/json' } : {},
      },
      (res) => {
        let response = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          response += chunk;
        });
        res.on('end', () => {
          try {
            resolveCall({ status: res.statusCode, body: JSON.parse(response) });
          } catch {
            reject(new Error(`invalid JSON from ${path}: ${response}`));
          }
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });

const waitForHealth = async () => {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await call('GET', '/health');
      if (response.status === 200) return response;
    } catch {
      // The process may still be compiling or binding its port.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 250));
  }
  throw new Error(`API did not become healthy. Output:\n${output}`);
};

(async () => {
  try {
    const health = await waitForHealth();
    const simulation = await call('POST', '/scene/simulate', {
      seed: 'portable-api-smoke',
      steps: 13,
    });
    const scene = simulation.body?.data;
    if (simulation.status !== 200 || !scene) {
      throw new Error(`scene simulation failed with status ${simulation.status}`);
    }
    if (health.body?.data?.readiness !== 'ready') {
      throw new Error(`health readiness was ${health.body?.data?.readiness}`);
    }
    if (scene.terminalState !== 'return' || scene.provenance?.verified !== false) {
      throw new Error('scene simulation evidence boundary did not match the contract');
    }
    console.log(
      JSON.stringify(
        {
          health: health.body.data.readiness,
          sceneId: scene.id,
          terminalState: scene.terminalState,
          deterministic: scene.provenance.deterministic,
          verified: scene.provenance.verified,
        },
        null,
        2
      )
    );
    stop(0);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    stop(1);
  }
})();

api.on('exit', (code) => {
  if (code && code !== 0) {
    console.error(`API exited with code ${code}.\n${output}`);
    process.exitCode = 1;
  }
});

process.on('SIGINT', () => stop(130));
process.on('SIGTERM', () => stop(143));
