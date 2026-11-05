import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { FastifyInstance } from 'fastify';

/*
 * ENTITY OS BODY — the seven organs, observed.
 *
 * The anatomy is not narrated. Each layer points at the file that actually
 * implements it on this machine; the route reads every path and reports its
 * digest. A missing organ is reported MISSING, never assumed alive.
 */

/** Declared brand checksum, not a computed value. */
export const ENTITY_BRAND_CHECKSUM = '30013030';
export const ENTITY_LAW = 'Ω∞v ::= VERIFY(ΔREALITY)';
export const ENTITY_SOUL_PATH = '00_SOUL/human_root.txt';

export type EntityOrgan = {
  layer: number;
  organ: string;
  role: string;
  implementation: string;
  path: string;
};

export const ENTITY_ORGANS: readonly EntityOrgan[] = [
  {
    layer: 1,
    organ: 'Soul',
    role: 'The raw, unflattened human intent (Pidgin Spirit).',
    implementation: 'human_root.txt',
    path: ENTITY_SOUL_PATH,
  },
  {
    layer: 2,
    organ: 'Face',
    role: 'The Clean Ocean command center: intent, ledger, execution log.',
    implementation: 'React three-pane surface',
    path: 'apps/web/src/InvisibleComputer.tsx',
  },
  {
    layer: 3,
    organ: 'Mind',
    role: 'Runs the four-step loop and halts on anything it cannot verify.',
    implementation: 'Fastify state machine',
    path: 'apps/api/src/execute-route.ts',
  },
  {
    layer: 4,
    organ: 'Shield',
    role: 'Scans and blocks scam, crisis and money-transfer patterns. Fails closed.',
    implementation: 'KAI Shield (regex)',
    path: 'apps/api/src/invisible-computer.ts',
  },
  {
    layer: 5,
    organ: 'Hands',
    role: 'Executes the safe intent with the locally available mind.',
    implementation: 'ELION (local composer / model call)',
    path: 'apps/api/src/invisible-computer.ts',
  },
  {
    layer: 6,
    organ: 'Judge',
    role: 'Generates SHA-256 evidence and verifies it against the contract.',
    implementation: 'OMEGA (SHA-256)',
    path: 'apps/api/src/invisible-computer.ts',
  },
  {
    layer: 7,
    organ: 'Memory',
    role: 'Append-only record of verified actions.',
    implementation: 'SQLite ledger (KaiMemory)',
    path: 'data/oceanicos.db.kai.db',
  },
];

export type OrganObservation = EntityOrgan & {
  status: 'PRESENT' | 'MISSING';
  bytes: number | null;
  digest: string | null;
};

/**
 * `apps/api/src` and `apps/api/dist` both sit three levels below the repo
 * root, so the same resolution works from compiled output and from tests that
 * load the TypeScript source directly. The API is ESM, so the module URL is
 * the only location anchor (`__dirname` does not exist here).
 */
export function entityRootDir(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
}

function observe(organ: EntityOrgan, root: string): OrganObservation {
  const absolute = join(root, organ.path);
  if (!existsSync(absolute)) {
    return { ...organ, status: 'MISSING', bytes: null, digest: null };
  }
  try {
    const bytes = statSync(absolute).size;
    const digest = createHash('sha256').update(readFileSync(absolute)).digest('hex');
    return { ...organ, status: 'PRESENT', bytes, digest };
  } catch {
    return { ...organ, status: 'MISSING', bytes: null, digest: null };
  }
}

export type EntityBodyObservation = {
  status: 'ALIVE' | 'INCOMPLETE';
  brandChecksum: string;
  law: string;
  bodyDigest: string;
  organs: OrganObservation[];
  missing: string[];
  soul: string | null;
  evaluatedAt: string;
};

/**
 * Read the body from disk. The digest covers what was actually read, so a
 * changed organ changes the body digest; the brand checksum is declared, so it
 * stays fixed.
 */
export function observeEntityBody(rootDir = entityRootDir()): EntityBodyObservation {
  const organs = ENTITY_ORGANS.map((organ) => observe(organ, rootDir));
  const missing = organs.filter((organ) => organ.status === 'MISSING').map((organ) => organ.organ);
  const bodyDigest = createHash('sha256')
    .update(organs.map((organ) => `${organ.layer}:${organ.path}:${organ.digest ?? 'MISSING'}`).join('\n'))
    .digest('hex');

  let soul: string | null = null;
  try {
    soul = readFileSync(join(rootDir, ENTITY_SOUL_PATH), 'utf8');
  } catch {
    soul = null;
  }

  return {
    status: missing.length === 0 ? 'ALIVE' : 'INCOMPLETE',
    brandChecksum: ENTITY_BRAND_CHECKSUM,
    law: ENTITY_LAW,
    bodyDigest,
    organs,
    missing,
    soul,
    evaluatedAt: new Date().toISOString(),
  };
}

export function registerEntityBodyRoute(fastify: FastifyInstance): void {
  const handler = async () => ({ success: true, body: observeEntityBody() });
  fastify.get('/v1/entity/body', handler);
  fastify.get('/api/v1/entity/body', handler);
}
