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

function serviceBlock(name) {
  const pattern = new RegExp(
    `^  ${name}:\\r?\\n([\\s\\S]*?)(?=^  [A-Za-z0-9_-]+:\\s*$|^volumes:\\s*$)`,
    'm',
  );
  return compose.match(pattern)?.[1] ?? '';
}

const services = Object.fromEntries(['api', 'web', 'qdrant', 'ollama'].map((name) => [name, serviceBlock(name)]));
for (const [name, block] of Object.entries(services)) {
  check(block.length > 0, `docker-compose.yml: service '${name}' must exist`);
}

const hostBinding = (variable, port) => `${'$'}{${variable}:-127.0.0.1}:${port}:${port}`;
check(services.api.includes(hostBinding('API_BIND_ADDRESS', 5000)), 'api host binding must default to 127.0.0.1');
check(services.web.includes(hostBinding('WEB_BIND_ADDRESS', 3000)), 'web host binding must default to 127.0.0.1');

for (const [port, description] of [[6333, 'Qdrant REST'], [6334, 'Qdrant gRPC'], [11434, 'Ollama API']]) {
  const service = port === 11434 ? services.ollama : services.qdrant;
  check(service.includes(`"127.0.0.1:${port}:${port}"`), `${description} host binding must be fixed to loopback`);
  check(!service.includes(`"${port}:${port}"`), `${description} must not bind all host interfaces`);
}

check(services.qdrant.includes('image: qdrant/qdrant:v1.19.2'), 'Qdrant image must use the reviewed version tag');
check(services.ollama.includes('image: ollama/ollama:0.40.3'), 'Ollama image must use the reviewed version tag');
check(!/(?:qdrant|ollama)\\/[^\\s:]+:latest(?:\\s|$)/m.test(compose), 'Qdrant/Ollama must not use mutable latest tags');

check(
  services.api.includes('OMEGA_CORS_ORIGINS=${OMEGA_CORS_ORIGINS:-http://localhost:3000}'),
  'API CORS must explicitly allow the local web origin by default',
);
for (const name of ['OMEGA_SIGNING_KEY', 'OMEGA_READ_TOKEN', 'OMEGA_ADMIN_TOKEN']) {
  check(services.api.includes(`${name}=${'$'}{${name}:?`), `api must require ${name} at Compose interpolation time`);
  check(new RegExp(`^${name}=.+$`, 'm').test(envExample), `.env.compose.example must document ${name}`);
}
for (const name of ['API_BIND_ADDRESS', 'WEB_BIND_ADDRESS', 'OMEGA_CORS_ORIGINS', 'VITE_API_URL']) {
  check(new RegExp(`^${name}=.+$`, 'm').test(envExample), `.env.compose.example must document ${name}`);
}
check(envExample.includes('API_BIND_ADDRESS=127.0.0.1'), 'environment template must default API binding to loopback');
check(envExample.includes('WEB_BIND_ADDRESS=127.0.0.1'), 'environment template must default web binding to loopback');
check(deploymentGuide.includes('loopback-only'), 'deployment guide must describe private inference/vector bindings');
check(deploymentGuide.includes('API_BIND_ADDRESS'), 'deployment guide must document explicit API exposure');
check(deploymentGuide.includes('OMEGA_CORS_ORIGINS'), 'deployment guide must document exact-origin CORS configuration');

if (failures.length > 0) {
  console.error(['COMPOSE_NETWORK_CONTRACT_INVALID', ...failures].join('\n'));
  process.exitCode = 1;
} else {
  console.log('validated local-first Compose bindings, service image versions, required secrets, and local CORS contract');
}
