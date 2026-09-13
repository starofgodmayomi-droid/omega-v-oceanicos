#!/usr/bin/env node
const { spawn } = require('node:child_process');
const http = require('node:http');
const { resolve } = require('node:path');

const root = resolve(__dirname, '..');
const apiRoot = resolve(root, 'apps/api');
const port = Number(process.env.SMOKE_API_PORT || 3210);
const api = spawn(process.execPath, ['dist/index.js'], {
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

let output = '';
api.stdout.on('data', (chunk) => { output += chunk.toString(); });
api.stderr.on('data', (chunk) => { output += chunk.toString(); });

const stop = (code) => {
  if (!api.killed) api.kill('SIGTERM');
  setTimeout(() => process.exit(code), 100);
};

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
    await new Promise((resolveWait) => setTimeout(resolveWait, 250));
  }
  throw new Error(`API did not become healthy. Output:\n${output}`);
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
  try {
    const health = await waitForHealth();
    if (health.body.status !== 'ok' || health.body.service !== 'omega-v-oceanicos-api') {
      throw new Error('Health contract did not report the expected API service');
    }

    const firstCycle = await request('POST', '/v1/cycle', {});
    if (firstCycle.status !== 200 || firstCycle.body.success !== true) {
      throw new Error(`Initial cycle failed with HTTP ${firstCycle.status}`);
    }

    const tip = await request('GET', '/v1/block/tip');
    if (tip.status !== 200 || tip.body.status !== 'ONLINE') {
      throw new Error(`Ledger tip contract failed with HTTP ${tip.status}`);
    }

    const mood = await request('GET', '/v1/mood');
    if (mood.status !== 200 || mood.body.status !== 'MAX GOOD-O') {
      throw new Error(`Mood contract failed with HTTP ${mood.status}`);
    }

    const streamEvents = openStream();
    await new Promise((resolveReady) => setTimeout(resolveReady, 150));
    const secondCycle = await request('POST', '/v1/cycle', {});
    if (secondCycle.status !== 200 || secondCycle.body.success !== true) {
      throw new Error(`Streaming cycle failed with HTTP ${secondCycle.status}`);
    }
    const events = await streamEvents;

    console.log(JSON.stringify({
      health: health.body.status,
      ledger: tip.body.status,
      mood: mood.body.status,
      telemetry: { endpoint: '/v1/stream', events },
      verified: true,
    }, null, 2));
    stop(0);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    console.error(output);
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
