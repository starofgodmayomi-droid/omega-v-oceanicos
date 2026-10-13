#!/usr/bin/env node
/**
 * Source-level contract for local Compose network exposure.
 * This validates repository configuration text; docker compose config and
 * runtime checks remain separate evidence.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const compose = readFileSync(join(root, 'docker-compose.yml'), 'utf8');
const envExample = readFileSync(join(root, '.env.compose.example'), 'utf8');
const deploymentGuide = readFileSync(join(root, 'docs/LOCAL_COMPOSE_DEPLOYMENT.md'), 'utf8');
const failures = [];

function check(condition, message) {
  if (!condition) failures.push(message);
}

function isTopLevelService(line) {
  if (!line.startsWith('  ') || line.startsWith('   ') || !line.endsWith(':')) return false;
  const key = line.slice(2, -1);
  return /^[A-Za-z0-9_-]+$/.test(key);
}

function serviceBlock(name) {
  const lines = compose.split('\n');
  const start = lines.findIndex((line) => line === '  ' + name + ':');
  if (start === -1) return '';
  let end = start + 1;
  while (end < lines.length && lines[end] !== 'volumes:' && !isTopLevelService(lines[end])) end += 1;
  return lines.slice(start + 1, end).join('\n');
}

function publishedPorts(block) {
  const lines = block.split('\n');
  const start = lines.findIndex((line) => line.trim() === 'ports:');
  if (start === -1) return [];
  const mappings = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim()) continue;
    const indentation = line.length - line.trimStart().length;
    if (indentation < 6) break;
    if (indentation === 6 && line.trimStart().startsWith('-')) {
      mappings.push(line.trimStart().slice(1).trim().replace(/^["']/, '').replace(/["']$/, ''));
    }
  }
  return mappings;
}

const services = Object.fromEntries(['api', 'web', 'qdrant', 'ollama'].map((name) => [name, serviceBlock(name)]));
for (const [name, block] of Object.entries(services)) {
  check(block.length > 0, "docker-compose.yml: service '" + name + "' must exist");
}

const hostBinding = (variable, port) => '$' + '{' + variable + ':-127.0.0.1}:' + port + ':' + port;
check(services.api.includes(hostBinding('API_BIND_ADDRESS', 5000)), 'api host binding must default to 127.0.0.1');
check(services.web.includes(hostBinding('WEB_BIND_ADDRESS', 3000)), 'web host binding must default to 127.0.0.1');

check(
  JSON.stringify(publishedPorts(services.qdrant)) === JSON.stringify(['127.0.0.1:6333:6333', '127.0.0.1:6334:6334']),
  'Qdrant must publish exactly its REST/gRPC ports to loopback',
);
check(
  JSON.stringify(publishedPorts(services.ollama)) === JSON.stringify(['127.0.0.1:11434:11434']),
  'Ollama must publish its API port to loopback only',
);

check(services.qdrant.includes('image: ghcr.io/qdrant/qdrant/qdrant:v1.19.2@sha256:86cdc262da7105228d8d42a9733ee95981b3abc3af891b49a0f89bdcb8bf3e0d'), 'Qdrant image must use the official reviewed release and immutable digest');
check(services.ollama.includes('image: ollama/ollama:0.35.1@sha256:292ee7945dfc3d5840a181f3ab86fedb1e66703e02c8af98b50f4da56b7e278c'), 'Ollama image must use the reviewed stable release and immutable digest');
check(
  !services.qdrant.includes('image: qdrant/qdrant:latest') &&
  !services.ollama.includes('image: ollama/ollama:latest'),
  'Qdrant/Ollama must not use mutable latest tags',
);

check(
  services.api.includes('OMEGA_CORS_ORIGINS=' + '$' + '{OMEGA_CORS_ORIGINS:-http://localhost:3000}'),
  'API CORS must explicitly allow the local web origin by default',
);
for (const name of ['OMEGA_SIGNING_KEY', 'OMEGA_READ_TOKEN', 'OMEGA_ADMIN_TOKEN']) {
  check(
    services.api.includes(name + '=' + '$' + '{' + name + ':?'),
    'api must require ' + name + ' at Compose interpolation time',
  );
  check(
    envExample.split('\n').some((line) => line.startsWith(name + '=')),
    '.env.compose.example must document ' + name,
  );
}
for (const name of ['API_BIND_ADDRESS', 'WEB_BIND_ADDRESS', 'OMEGA_CORS_ORIGINS', 'VITE_API_URL']) {
  check(
    envExample.split('\n').some((line) => line.startsWith(name + '=')),
    '.env.compose.example must document ' + name,
  );
}
check(envExample.includes('API_BIND_ADDRESS=127.0.0.1'), 'environment template must default API binding to loopback');
check(envExample.includes('WEB_BIND_ADDRESS=127.0.0.1'), 'environment template must default web binding to loopback');
check(deploymentGuide.includes('loopback-only'), 'deployment guide must describe private inference/vector bindings');
check(deploymentGuide.includes('API_BIND_ADDRESS'), 'deployment guide must document explicit API exposure');
check(deploymentGuide.includes('OMEGA_CORS_ORIGINS'), 'deployment guide must document exact-origin CORS configuration');
check(
  services.web.includes('OMEGA_API_INTERNAL_URL=http://api:5000'),
  'web gateway must target the API over the private Compose network',
);
check(
  services.web.includes('OMEGA_READ_TOKEN=' + '$' + '{OMEGA_READ_TOKEN:?'),
  'web gateway must receive the read token server-side',
);
check(
  !services.web.includes('OMEGA_ADMIN_TOKEN'),
  'web service must never receive the API admin token',
);
check(
  services.web.includes('/web-health'),
  'web service must healthcheck the production gateway',
);
check(
  envExample.includes('VITE_API_URL=/api'),
  'browser API URL must default to the same-origin /api gateway',
);
check(
  deploymentGuide.includes('read-only gateway') && deploymentGuide.includes('WEB_SESSION_REQUIRED'),
  'deployment guide must document the read-only gateway and mutation boundary',
);
check(
  !/^VITE_[A-Z0-9_]*TOKEN=/m.test(envExample),
  'environment template must not place bearer tokens in public Vite variables',
);

if (failures.length > 0) {
  console.error(['COMPOSE_NETWORK_CONTRACT_INVALID', ...failures].join('\n'));
  process.exitCode = 1;
} else {
  console.log('validated local-first Compose bindings, immutable image digests, server-held read credential, read-only web gateway, and mutation boundary');
}
