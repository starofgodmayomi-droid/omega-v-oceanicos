import { createServer, Server } from 'node:http';
import app from '../index';

type Body<T> = { data: T; meta?: Record<string, unknown> };
type Entry = { id: number; type: string; hash: string; previousHash: string };

/**
 * packages/remember was fully verified and imported by nothing. These
 * assert the API is genuinely a consumer of the kernel's chain, rather
 * than keeping a parallel record beside it.
 */
describe('API kernel memory', () => {
  let server: Server;
  let baseUrl: string;

  const loop = async (claim: string): Promise<Response> =>
    fetch(`${baseUrl}/complete-loop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        claim,
        category: 'health-check',
        source: { system: 'memory-test', version: '0.1.0', environment: 'test' },
        observedBy: 'jest',
        metadata: { statusCode: 200, responseTime: 11 },
        confidence: 0.95,
        confidenceReason: 'memory fixture',
      }),
    });

  beforeAll(async () => {
    server = createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Test server did not start');
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  });

  it('starts from zero with an intact empty chain', async () => {
    const memory = (await (await fetch(`${baseUrl}/memory`)).json()) as Body<Entry[]>;
    expect(memory.data).toEqual([]);
    expect(memory.meta?.size).toBe(0);
    expect(memory.meta?.appendOnly).toBe(true);

    const integrity = await fetch(`${baseUrl}/memory/integrity`);
    expect(integrity.status).toBe(200);
    expect(((await integrity.json()) as Body<{ intact: boolean }>).data.intact).toBe(true);
  });

  it('records three linked entries for each completed loop', async () => {
    await loop('first claim');

    const memory = (await (await fetch(`${baseUrl}/memory`)).json()) as Body<Entry[]>;

    expect(memory.data).toHaveLength(3);
    expect(memory.data.map((entry) => entry.type)).toEqual([
      'OBSERVATION',
      'VERIFICATION',
      'MEMORY',
    ]);
    expect(memory.data.map((entry) => entry.id)).toEqual([1, 2, 3]);
    expect(memory.data[1].previousHash).toBe(memory.data[0].hash);
    expect(memory.data[2].previousHash).toBe(memory.data[1].hash);
  });

  it('continues the same chain across loops rather than restarting', async () => {
    await loop('second claim');

    const memory = (await (await fetch(`${baseUrl}/memory`)).json()) as Body<Entry[]>;

    expect(memory.data).toHaveLength(6);
    expect(memory.meta?.size).toBe(6);
    expect(memory.data[3].previousHash).toBe(memory.data[2].hash);
    expect(new Set(memory.data.map((entry) => entry.hash)).size).toBe(6);
  });

  it('reports the chain intact after recording', async () => {
    const response = await fetch(`${baseUrl}/memory/integrity`);
    const body = (await response.json()) as Body<{ intact: boolean; entries: number }>;

    expect(response.status).toBe(200);
    expect(body.data.intact).toBe(true);
    expect(body.data.entries).toBe(6);
  });

  it('links the loop response to the memory record it created', async () => {
    const before = (await (await fetch(`${baseUrl}/memory`)).json()) as Body<Entry[]>;
    await loop('third claim');
    const after = (await (await fetch(`${baseUrl}/memory`)).json()) as Body<Entry[]>;

    expect(after.data).toHaveLength(before.data.length + 3);

    const events = (await (await fetch(`${baseUrl}/events`)).json()) as Body<
      Array<{ type: string; details?: { memoryId?: string } }>
    >;
    const attested = events.data.find((event) => event.type === 'attestation.created');

    expect(attested?.details?.memoryId).toMatch(/^mem-/);
  });
});
