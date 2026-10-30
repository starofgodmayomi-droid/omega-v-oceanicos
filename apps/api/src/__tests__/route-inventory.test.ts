import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createApp } from '../index';
import { API_ROUTE_INVENTORY } from '../route-contract';

/**
 * Fastify prints its router as a tree. `commonPrefix: false` keeps each node's
 * segment intact, but children are still printed relative to their parent
 * (`/register`, `/:id`, or a bare `s` when the parent shares the prefix). This
 * walks the tree back into complete "METHOD /path" entries so the inventory
 * can assert whole routes instead of substrings of a radix tree.
 */
function registeredRoutes(tree: string): Set<string> {
  const routes = new Set<string>();
  const stack: string[] = [];

  for (const line of tree.split('\n')) {
    const match = line.match(/^([│ ]*)(?:├── |└── )(.+?) \(([A-Z, ]+)\)$/);
    if (!match) continue;

    const [, indent, segment, methods] = match;
    const depth = indent.length / 4;
    const parent = depth === 0 ? '' : (stack[depth - 1] ?? '');
    // Fastify's segments concatenate directly onto the parent: a child path
    // prints as `/register`, and a shared prefix splits into a bare `s`.
    const full = `${parent}${segment}`;
    stack[depth] = full;

    for (const method of methods.split(',').map((entry) => entry.trim())) {
      routes.add(`${method} ${full}`);
    }
  }

  return routes;
}

describe('API route contract', () => {
  it('registers every supported route in createApp', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'omega-api-route-contract-'));
    const app = createApp(join(directory, 'ledger.db'), false, { allowUnsignedCycle: true });

    try {
      await app.ready();
      const registered = registeredRoutes(app.printRoutes({ commonPrefix: false }));
      // Fastify prints every wildcard route as a bare `*` node, so `/assets/*`
      // can only be verified in that collapsed form.
      const isRegistered = (contract: string) => {
        if (registered.has(contract)) return true;
        if (!contract.endsWith('/*')) return false;
        const [method] = contract.split(' ');
        return registered.has(`${method} /*`) || registered.has(`${method} *`);
      };
      const missing = API_ROUTE_INVENTORY.filter((contract) => !isRegistered(contract));

      expect(missing).toEqual([]);
    } finally {
      await app.close();
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
