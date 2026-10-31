import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createApp } from '../index';
import { API_ROUTE_INVENTORY } from '../route-contract';

const registrationSources = [
  'apps/api/src/index.ts',
  'apps/api/src/omega.ts',
  'apps/api/src/reality.ts',
  'apps/api/src/pipeline-route.ts',
];

/** Route literals a module registers with `fastify.<method>('path', ...)`. */
const registeredRouteLiterals = (): Set<string> => {
  const found = new Set<string>();
  for (const file of registrationSources) {
    const source = readFileSync(join(process.cwd(), file), 'utf8');
    for (const match of source.matchAll(/fastify\.(get|post)\('([^']+)'/g)) {
      found.add(`${match[1].toUpperCase()} ${match[2]}`);
    }
  }
  return found;
};

/** Substitute the placeholder segments a contract route uses. */
const requestPath = (path: string): string =>
  path
    .replace(':workerId', 'worker-probe')
    .replace(':leaseId', 'lease-probe')
    .replace(':id', 'command-probe')
    .replace(':jobId', 'job-probe')
    .replace('*', 'probe.js');

describe('API route contract', () => {
  let directory: string;

  beforeAll(() => {
    directory = mkdtempSync(join(tmpdir(), 'omega-api-route-contract-'));
  });

  afterAll(() => {
    rmSync(directory, { recursive: true, force: true });
  });

  it('serves every route in the inventory', async () => {
    const app = createApp(join(directory, 'probe.db'), false, { allowUnsignedCycle: true });

    try {
      await app.ready();
      const unreachable: string[] = [];

      for (const contract of API_ROUTE_INVENTORY) {
        const [method, path] = contract.split(' ', 2);
        // The SSE route holds the connection open by design; the literal
        // registration scan below covers it.
        if (path === '/v1/stream') continue;
        const response = await app.inject({ method: method as 'GET' | 'POST', url: requestPath(path) });
        const body = response.json() as { code?: string; error?: string };
        // A registered route may still answer 4xx (validation, unknown id,
        // missing static client); only the router's own miss is a failure.
        const routed = response.statusCode !== 404 || body.error !== 'NOT_FOUND';
        if (!routed) unreachable.push(contract);
      }

      expect(unreachable).toEqual([]);
    } finally {
      await app.close();
    }
  });

  it('documents every route a module registers', () => {
    const registered = [...registeredRouteLiterals()].sort();
    const inventory = [...API_ROUTE_INVENTORY].sort();

    expect(registered).toEqual(inventory);
  });
});
