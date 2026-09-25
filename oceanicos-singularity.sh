#!/usr/bin/env bash
set -Eeuo pipefail

# Oceanicos Ω∞ workspace bootstrap
# Usage: ./oceanicos-singularity.sh [target-directory]
# Creates a local monorepo and optionally installs dependencies.

ROOT_DIR="${1:-oceanicos}"
ROOT_DIR="$(mkdir -p "$ROOT_DIR" && cd "$ROOT_DIR" && pwd)"

log() { printf '\n[ oceanicos ] %s\n' "$*"; }
write_file() {
  local path="$1"
  mkdir -p "$(dirname "$ROOT_DIR/$path")"
  cat > "$ROOT_DIR/$path"
}

log "Creating Ω∞ Oceanicos workspace at $ROOT_DIR"

write_file pnpm-workspace.yaml <<'EOF'
packages:
  - 'packages/*'
  - 'apps/*'
EOF

write_file package.json <<'EOF'
{
  "name": "omega-v-oceanicos",
  "version": "1.0.0",
  "private": true,
  "description": "Ω∞v Oceanicos Formless Constitutional Full-Stack Engine",
  "scripts": {
    "install:all": "pnpm install",
    "build": "pnpm --recursive run build",
    "typecheck": "pnpm --recursive run typecheck",
    "dev": "pnpm --filter @oceanicos/api dev",
    "verify:full": "pnpm build && pnpm test:e2e",
    "test:e2e": "jest tests/e2e --runInBand",
    "cli": "tsx bin/oceanicos.ts"
  },
  "engines": { "node": ">=20.0.0", "pnpm": ">=8.0.0" },
  "devDependencies": {
    "@types/jest": "^29.5.12",
    "@types/node": "^20.11.24",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.2",
    "tsx": "^4.19.2",
    "typescript": "^5.3.3"
  }
}
EOF

write_file tsconfig.json <<'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "noEmit": true,
    "types": ["node", "jest"]
  }
}
EOF

write_file jest.config.cjs <<'EOF'
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.test.ts']
};
EOF

write_file .env.example <<'EOF'
NODE_ENV=development
PORT=5000
HOST=0.0.0.0
LEDGER_PATH=./data/oceanicos.jsonl
# Required for /v1/cycle. Use a secret of at least 16 characters.
OMEGA_SIGNING_KEY=replace-with-a-local-secret-at-least-16-characters
EOF

write_file .gitignore <<'EOF'
node_modules/
dist/
.env
.data/
data/
*.db
*.jsonl
EOF

write_file packages/types/package.json <<'EOF'
{
  "name": "@oceanicos/types",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "exports": "./src/index.ts",
  "scripts": { "build": "tsc --noEmit", "typecheck": "tsc --noEmit" }
}
EOF
write_file packages/types/src/index.ts <<'EOF'
export interface IObservation {
  uuid: string;
  timestamp: string;
  siliconYield: number;
  gridLoadMegawatts: number;
  acceleratorInventory: number;
}

export interface IEvidence {
  status: 'PASS' | 'FAIL' | 'DIVERGENT';
  lawRoute: string;
  timestamp: string;
  observationUuid: string;
  signatureProof: string;
}

export interface IMiniBlock {
  index: number;
  timestamp: string;
  observation: IObservation;
  evidence: IEvidence;
  previousHash: string;
  hash: string;
  nonce: number;
}
EOF

write_file packages/verification/package.json <<'EOF'
{
  "name": "@oceanicos/verification",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "exports": "./src/index.ts",
  "scripts": { "build": "tsc --noEmit", "typecheck": "tsc --noEmit" },
  "dependencies": { "@oceanicos/types": "workspace:*" }
}
EOF
write_file packages/verification/src/index.ts <<'EOF'
import crypto from 'node:crypto';
import type { IEvidence, IObservation } from '@oceanicos/types';

export class VerificationEngine {
  public static evaluate(telemetry: IObservation): IEvidence {
    const scaleClearance = telemetry.acceleratorInventory > 500000;
    const nodeIndependence = telemetry.siliconYield >= 0.92;
    const status: IEvidence['status'] = scaleClearance && nodeIndependence ? 'PASS' : 'DIVERGENT';
    const signingKey = process.env.OMEGA_SIGNING_KEY;
    if (!signingKey || signingKey.length < 16) {
      throw new Error('ATTESTATION_SIGNING_KEY_REQUIRED_OR_INVALID');
    }
    const rawPayload = `${telemetry.uuid}-${status}-${telemetry.timestamp}`;
    const signatureProof = crypto.createHmac('sha256', signingKey).update(rawPayload).digest('hex');
    return {
      status,
      lawRoute: '0 ➔ MINI ➔ FULL_STACK ➔ ECOSYSTEM ➔ REALITY',
      timestamp: new Date().toISOString(),
      observationUuid: telemetry.uuid,
      signatureProof
    };
  }
}
EOF

write_file packages/remember/package.json <<'EOF'
{
  "name": "@oceanicos/remember",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "exports": "./src/index.ts",
  "scripts": { "build": "tsc --noEmit", "typecheck": "tsc --noEmit" },
  "dependencies": { "@oceanicos/types": "workspace:*" }
}
EOF
write_file packages/remember/src/index.ts <<'EOF'
import fs from 'node:fs';
import path from 'node:path';
import type { IMiniBlock } from '@oceanicos/types';

export class RememberEngine {
  private readonly file: string;
  private blocks: IMiniBlock[] = [];

  constructor(file = './data/oceanicos.jsonl') {
    this.file = file;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    if (fs.existsSync(file)) {
      this.blocks = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((line) => JSON.parse(line) as IMiniBlock);
    }
  }

  append(block: IMiniBlock): void {
    this.blocks.push(block);
    fs.appendFileSync(this.file, `${JSON.stringify(block)}\n`);
  }

  getTip(): IMiniBlock | null { return this.blocks.at(-1) ?? null; }
  get height(): number { return this.blocks.length; }
}
EOF

write_file packages/mini/package.json <<'EOF'
{
  "name": "@oceanicos/mini",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "exports": "./src/index.ts",
  "scripts": { "build": "tsc --noEmit", "typecheck": "tsc --noEmit" },
  "dependencies": { "@oceanicos/remember": "workspace:*", "@oceanicos/types": "workspace:*", "@oceanicos/verification": "workspace:*" }
}
EOF
write_file packages/mini/src/index.ts <<'EOF'
import crypto from 'node:crypto';
import type { IObservation, IMiniBlock } from '@oceanicos/types';
import { VerificationEngine } from '@oceanicos/verification';
import { RememberEngine } from '@oceanicos/remember';

export class MiniKernel {
  constructor(private readonly ledger: RememberEngine) {}

  runCycle(io = 'EXEC'): IMiniBlock {
    const observation: IObservation = {
      uuid: crypto.randomUUID(), timestamp: new Date().toISOString(),
      siliconYield: io === 'TEST_MUTATION' ? 0.91 : 0.95,
      gridLoadMegawatts: 42, acceleratorInventory: io === 'TEST_MUTATION' ? 100 : 600000
    };
    const evidence = VerificationEngine.evaluate(observation);
    const previousHash = this.ledger.getTip()?.hash ?? 'GENESIS';
    const body = JSON.stringify({ observation, evidence, previousHash });
    const block: IMiniBlock = {
      index: this.ledger.height, timestamp: new Date().toISOString(), observation, evidence,
      previousHash, hash: crypto.createHash('sha256').update(body).digest('hex'), nonce: 0
    };
    this.ledger.append(block);
    return block;
  }
}
EOF

write_file apps/api/package.json <<'EOF'
{
  "name": "@oceanicos/api",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": { "dev": "tsx watch src/index.ts", "build": "tsc --noEmit", "typecheck": "tsc --noEmit" },
  "dependencies": {
    "@fastify/cors": "^10.0.1",
    "@oceanicos/mini": "workspace:*",
    "@oceanicos/remember": "workspace:*",
    "fastify": "^5.2.1"
  }
}
EOF
write_file apps/api/src/index.ts <<'EOF'
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { RememberEngine } from '@oceanicos/remember';
import { MiniKernel } from '@oceanicos/mini';

export const fastify = Fastify({ logger: true });
const ledgerMemory = new RememberEngine(process.env.LEDGER_PATH ?? './data/oceanicos.jsonl');
const kernel = new MiniKernel(ledgerMemory);
fastify.register(cors, { origin: '*' });

fastify.post('/v1/cycle', async (request: { body?: { io?: string } }, reply) => {
  try { return { success: true, block: kernel.runCycle(request.body?.io ?? 'EXEC') }; }
  catch (error) {
    if (error instanceof Error && error.message === 'ATTESTATION_SIGNING_KEY_REQUIRED_OR_INVALID') {
      return reply.code(503).send({ success: false, error: 'ATTESTATION_SIGNING_KEY_REQUIRED' });
    }
    return reply.code(500).send({ success: false, error: 'INTERNAL_SERVER_ERROR' });
  }
});
fastify.get('/v1/block/tip', async () => ({ success: true, tip: ledgerMemory.getTip() }));

if (import.meta.url === `file://${process.argv[1]}`) {
  fastify.listen({ port: Number(process.env.PORT ?? 5000), host: process.env.HOST ?? '0.0.0.0' }).catch(() => process.exit(1));
}
EOF

write_file apps/web/package.json <<'EOF'
{
  "name": "@oceanicos/web",
  "version": "1.0.0",
  "private": true,
  "scripts": { "build": "mkdir -p dist && cp index.html dist/index.html", "typecheck": "tsc --noEmit" }
}
EOF
write_file apps/web/index.html <<'EOF'
<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Oceanicos Ω∞</title><style>body{font:16px system-ui;background:#07121c;color:#dff8ff;max-width:60rem;margin:12vh auto;padding:2rem}a{color:#7ee8ff}</style></head><body><h1>Oceanicos Telemetry</h1><p>Constitutional runtime dashboard online.</p><p>API: <a href="http://localhost:5000/v1/block/tip">view ledger tip</a></p></body></html>
EOF

write_file tests/e2e/security.test.ts <<'EOF'
import { afterAll, describe, expect, it } from '@jest/globals';
import { fastify } from '../../apps/api/src/index.js';

describe('Oceanicos fail-closed attestation', () => {
  afterAll(async () => { await fastify.close(); });
  it('rejects a cycle when the signing key is absent', async () => {
    const original = process.env.OMEGA_SIGNING_KEY;
    delete process.env.OMEGA_SIGNING_KEY;
    try {
      await fastify.ready();
      const response = await fastify.inject({ method: 'POST', url: '/v1/cycle', payload: { io: 'TEST_MUTATION' } });
      expect(response.statusCode).toBe(503);
      expect(JSON.parse(response.body).error).toBe('ATTESTATION_SIGNING_KEY_REQUIRED');
    } finally {
      if (original === undefined) delete process.env.OMEGA_SIGNING_KEY;
      else process.env.OMEGA_SIGNING_KEY = original;
    }
  });
});
EOF

write_file Dockerfile <<'EOF'
FROM node:22-bookworm-slim
RUN corepack enable
WORKDIR /app
COPY . .
RUN pnpm install --no-frozen-lockfile
ENV NODE_ENV=production PORT=5000 HOST=0.0.0.0 LEDGER_PATH=/app/data/oceanicos.jsonl
RUN mkdir -p /app/data
EXPOSE 5000
CMD ["pnpm", "--filter", "@oceanicos/api", "dev"]
EOF

write_file docker-compose.yml <<'EOF'
services:
  api:
    build: .
    ports:
      - "5000:5000"
    environment:
      NODE_ENV: production
      PORT: 5000
      HOST: 0.0.0.0
      OMEGA_SIGNING_KEY: ${OMEGA_SIGNING_KEY:?Set OMEGA_SIGNING_KEY in .env}
      LEDGER_PATH: /app/data/oceanicos.jsonl
    volumes:
      - ledger-storage:/app/data
  web:
    build: .
    ports:
      - "3000:3000"
    command: pnpm --filter @oceanicos/web build && pnpm dlx serve apps/web/dist -l 3000
    depends_on:
      - api
volumes:
  ledger-storage:
EOF

write_file README.md <<'EOF'
# Ω∞v Oceanicos

Local-first monorepo for shared observation types, fail-closed attestation, an append-only ledger, a mini-kernel, Fastify API routes, and a static web dashboard.

## Install and verify

```bash
corepack enable
pnpm install
pnpm build
pnpm test:e2e
```

The API requires `OMEGA_SIGNING_KEY` with at least 16 characters for successful attestation. Without it, `POST /v1/cycle` intentionally returns HTTP 503 with `ATTESTATION_SIGNING_KEY_REQUIRED`.

## Run locally

```bash
cp .env.example .env
set -a; . ./.env; set +a
pnpm dev
```

The API listens on port 5000. To run the staging containers, set `OMEGA_SIGNING_KEY` in `.env` and use `docker compose up --build`.
EOF

if command -v corepack >/dev/null 2>&1; then
  log "Installing dependencies"
  (cd "$ROOT_DIR" && corepack pnpm install --no-frozen-lockfile)
else
  log "Corepack unavailable; run 'corepack enable && pnpm install' inside $ROOT_DIR"
fi

log "Bootstrap complete"
printf 'Next steps:\n  cd %q\n  cp .env.example .env\n  pnpm build\n  pnpm test:e2e\n  pnpm dev\n' "$ROOT_DIR"
