import { createServer, Server } from 'node:http';

describe('probe', () => {
  let server: Server;
  beforeAll(async () => {
    const app = (await import('../apps/api/src/server')).default as any;
    server = createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    console.log('probe listening');
  });
  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });
  it('works', async () => {
    expect(1).toBe(1);
  });
});
