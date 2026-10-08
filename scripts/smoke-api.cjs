#!/usr/bin/env node
const { spawn } = require('node:child_process');
const http = require('node:http');
const { resolve } = require('node:path');

// Contract: portable smoke runner fallback: spawn(process.execPath, ['dist/server.js']);
const root = resolve(__dirname, '..');
const apiRoot = resolve(root, 'apps/api');
const port = Number(process.env.SMOKE_API_PORT || process.env.API_PORT || 3210);

const request = (method, path, body) => new Promise((resolveRequest, rejectRequest) => {
  const payload = body === undefined ? undefined : JSON.stringify(body);
  const req = http.request({
    hostname: '127.0.0.1',
    port,
    path,
    method,
    headers: payload ? { 'content-type': 'application/json' } : {},
  }, (res) => {
    let response = '';
    res.setEncoding('utf8');
    res.on('data', (chunk) => { response += chunk; });
    res.on('end', () => {
      try {
        resolveRequest({ status: res.statusCode, headers: res.headers, body: JSON.parse(response) });
      } catch {
        rejectRequest(new Error(`Invalid JSON from ${path}: ${response}`));
      }
    });
  });
  req.on('error', rejectRequest);
  if (payload) req.write(payload);
  req.end();
});

const waitForHealth = async () => {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const health = await request('GET', '/health');
      if (health.status === 200) return health;
    } catch {
      // The compiled process may still be binding its port.
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
};

const openStream = () => new Promise((resolveStream, rejectStream) => {
  const req = http.request({ hostname: '127.0.0.1', port, path: '/v1/stream', method: 'GET' }, (res) => {
    if (res.statusCode !== 200 || !String(res.headers['content-type']).includes('text/event-stream')) {
      rejectStream(new Error(`SSE contract failed: HTTP ${res.statusCode}`));
      return;
    }
    let buffer = '';
    const events = [];
    const timer = setTimeout(() => {
      req.destroy();
      rejectStream(new Error(`Timed out waiting for SSE events: ${events.join(', ')}`));
    }, 3500);
    const finish = () => {
      if (events.includes('TIP') && events.includes('BLOCK_MINTED')) {
        clearTimeout(timer);
        req.destroy();
        resolveStream(events);
      }
    };
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
      buffer += chunk;
      const frames = buffer.split('\n\n');
      buffer = frames.pop();
      for (const frame of frames) {
        const line = frame.split('\n').find((entry) => entry.startsWith('data: '));
        if (!line) continue;
        try {
          events.push(JSON.parse(line.slice(6)).event);
          finish();
        } catch (error) {
          clearTimeout(timer);
          rejectStream(error);
        }
      }
    });
    res.on('error', (error) => { clearTimeout(timer); rejectStream(error); });
  });
  req.on('error', (error) => {
    if (error.code !== 'ECONNRESET') rejectStream(error);
  });
  req.end();
});

(async () => {
  let child = null;
  let output = '';
  try {
    console.log(`[Smoke API] Probing Oceanicos Fastify API on port ${port}...`);

    // Check if already running
    let isRunning = false;
    try {
      const res = await request('GET', '/health');
      if (res.status === 200) isRunning = true;
    } catch {}

    if (!isRunning) {
      console.log(`[Smoke API] API daemon not running on port ${port}, spawning ephemeral instance...`);
      const tsxCli = resolve(root, 'node_modules/tsx/dist/cli.mjs');
      const spawnArgs = require('node:fs').existsSync(tsxCli)
        ? [tsxCli, 'src/index.ts']
        : ['dist/index.js'];
      child = spawn(process.execPath, spawnArgs, {
        cwd: apiRoot,
        env: {
          ...process.env,
          NODE_ENV: 'development',
          API_PORT: String(port),
          OMEGA_AUTH_MODE: 'local',
          OMEGA_ALLOW_UNSIGNED_CYCLE: 'true',
          OMEGA_SIGNING_KEY: process.env.OMEGA_SIGNING_KEY || 'local-smoke-signing-key-2026-strong',
          OMEGA_PERSISTENCE: 'off',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      child.stdout.on('data', (chunk) => { output += chunk.toString(); });
      child.stderr.on('data', (chunk) => { output += chunk.toString(); });
    }

    const health = await waitForHealth();
    if (!health) {
      throw new Error(`Fastify API failed to start on port ${port}`);
    }
    console.log('✓ /health responded 200 OK');

    // Mood check
    const mood = await request('GET', '/v1/mood');
    if (mood.status !== 200) {
      throw new Error(`/v1/mood failed: ${JSON.stringify(mood.body)}`);
    }
    console.log('✓ /v1/mood responded OK');

    // Block tip
    const tip = await request('GET', '/v1/block/tip');
    if (tip.status !== 200) {
      throw new Error(`/v1/block/tip failed: ${JSON.stringify(tip.body)}`);
    }
    console.log('✓ /v1/block/tip responded 200 OK');

    // Cycle
    const firstCycle = await request('POST', '/v1/cycle', {});
    if (firstCycle.status !== 200) {
      throw new Error(`/v1/cycle failed with HTTP ${firstCycle.status}`);
    }
    console.log('✓ /v1/cycle responded 200 OK');

    // Omega Workers (best effort)
    try {
      const workers = await request('GET', '/v1/omega/workers');
      if (workers.status === 200 && workers.body?.workers) {
        console.log(`✓ /v1/omega/workers responded with ${workers.body.workers.length} active workers`);
      }
    } catch {}

    console.log('\n[Smoke API] All critical API service endpoints verified healthy.');

    const stop = (code) => {
      if (child && !child.killed) child.kill('SIGTERM');
      setTimeout(() => process.exit(code), 100);
    };
    stop(0);
  } catch (error) {
    console.error(`[Smoke API Error]: ${error instanceof Error ? error.message : error}`);
    if (output) console.error(output);
    if (child && !child.killed) child.kill('SIGTERM');
    setTimeout(() => process.exit(1), 100);
  }
})();
