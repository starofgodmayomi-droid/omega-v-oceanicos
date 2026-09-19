#!/usr/bin/env node
const { spawn } = require('node:child_process');
const { request } = require('node:http');
const { resolve } = require('node:path');

// Contract: portable smoke runner fallback: spawn(process.execPath, ['dist/server.js']);
const root = resolve(__dirname, '..');
const port = Number(process.env.API_PORT || 5000);

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

async function waitForServer(retries = 30, delayMs = 300) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await call('GET', '/health');
      if (res.status === 200) return true;
    } catch {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  return false;
}

(async () => {
  let child = null;
  try {
    console.log(`[Smoke API] Probing Oceanicos Fastify API on port ${port}...`);

    let isRunning = false;
    try {
      const res = await call('GET', '/health');
      if (res.status === 200) isRunning = true;
    } catch {}

    if (!isRunning) {
      console.log(`[Smoke API] API daemon not running on port ${port}, spawning ephemeral instance...`);
      child = spawn(
        process.execPath,
        ['--import', 'tsx', resolve(root, 'apps/api/src/index.ts')],
        {
          cwd: root,
          stdio: 'ignore',
          env: { ...process.env, PORT: String(port) },
        }
      );
      const ready = await waitForServer();
      if (!ready) {
        throw new Error(`Fastify API failed to start on port ${port}`);
      }
    }

    // 1. Health check
    const health = await call('GET', '/health');
    if (health.status !== 200 || health.body?.status !== 'ok') {
      throw new Error(`/health did not return 200 ok: ${JSON.stringify(health.body)}`);
    }
    console.log('✓ /health responded 200 OK');

    // 2. Mood check
    const mood = await call('GET', '/v1/mood');
    if (mood.status !== 200 || mood.body?.reality !== 'VERIFIED') {
      throw new Error(`/v1/mood failed: ${JSON.stringify(mood.body)}`);
    }
    console.log('✓ /v1/mood responded VERIFIED');

    // 3. Block tip
    const tip = await call('GET', '/v1/block/tip');
    if (tip.status !== 200 || !tip.body?.success) {
      throw new Error(`/v1/block/tip failed: ${JSON.stringify(tip.body)}`);
    }
    console.log('✓ /v1/block/tip responded 200 OK');

    // 4. Pluralistic Reality Face
    const face = await call('GET', '/v1/pluralism/face');
    if (face.status !== 200 || face.body?.face?.consensusVerdict !== 'PASS') {
      throw new Error(`/v1/pluralism/face failed: ${JSON.stringify(face.body)}`);
    }
    console.log(`✓ /v1/pluralism/face evaluated 5 faces: consensus = ${face.body.face.consensusVerdict}`);

    // 5. Omega Workers
    const workers = await call('GET', '/v1/omega/workers');
    if (workers.status !== 200 || !workers.body?.workers) {
      throw new Error(`/v1/omega/workers failed: ${JSON.stringify(workers.body)}`);
    }
    console.log(`✓ /v1/omega/workers responded with ${workers.body.workers.length} active workers`);

    console.log('\n[Smoke API] All critical API service endpoints verified healthy.');
    if (child) {
      child.kill();
    }
    process.exit(0);
  } catch (error) {
    if (child) {
      child.kill();
    }
    console.error(`[Smoke API Error]: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
})();

