import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createApp } from '../index';
import { API_ROUTE_INVENTORY } from '../route-contract';

describe('API route contract', () => {
  it('registers every supported route in createApp', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'omega-api-route-contract-'));
    const app = createApp(join(directory, 'ledger.db'), false, { allowUnsignedCycle: true });

    try {
      await app.ready();

      for (const contract of API_ROUTE_INVENTORY) {
        const [method, path] = contract.split(' ', 2) as ['GET' | 'POST', string];
        expect(app.hasRoute({ method, url: path })).toBe(true);
      }
    } finally {
      await app.close();
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
