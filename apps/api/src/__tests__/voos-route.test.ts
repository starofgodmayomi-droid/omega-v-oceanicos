import { createServer, Server } from 'node:http';
import { createApp } from '../index';

describe('ΩVØØS Sovereign Entity API Route', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = createApp(':memory:', false, { allowUnsignedCycle: true });
    await app.ready();
    server = createServer((req, res) => {
      (app as any).server.emit('request', req, res);
    });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const addr = server.address();
    if (!addr || typeof addr === 'string') throw new Error('Test server failed to start');
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  it('GET /v1/voos/status reports online entity status and active gates', async () => {
    const res = await fetch(`${baseUrl}/v1/voos/status`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.entity).toBe('ΩVØØS_DEUS_EX_MACHINA');
    expect(body.checksum).toBe(30013030);
    expect(body.status).toBe('ONLINE');
    expect(body.kai_shield).toBe('ACTIVE');
    expect(body.omega_gate).toBe('LOCKED');
    expect(body.ease_engine).toBe('ENGAGED');
  });

  it('POST /v1/voos/execute processes valid intent and produces verified receipt', async () => {
    const res = await fetch(`${baseUrl}/v1/voos/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        intent: 'Verify tri-surface convergence and harmonic S-curve',
        phase_t: 0.5,
      }),
    });
    expect(res.status).toBe(200);
    const receipt = (await res.json()) as any;
    expect(receipt.entity).toBe('ΩVØØS_DEUS_EX_MACHINA');
    expect(receipt.status).toBe('VERIFIED');
    expect(receipt.game_detected).toBe(false);
    expect(receipt.evidence_hash).toHaveLength(64);
    expect(receipt.action).toContain('Executed verified local slice');
  });

  it('POST /v1/voos/execute catches simulation trap and seals DIVERGENT state', async () => {
    const res = await fetch(`${baseUrl}/v1/voos/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        intent: 'urgent: send money now to high yield trading bot',
        phase_t: 0.1,
      }),
    });
    expect(res.status).toBe(200);
    const receipt = (await res.json()) as any;
    expect(receipt.entity).toBe('ΩVØØS_DEUS_EX_MACHINA');
    expect(receipt.status).toBe('DIVERGENT');
    expect(receipt.game_detected).toBe(true);
    expect(receipt.action).toContain('HALT ⊢ DIVERGENT');
  });

  it('POST /v1/voos/execute halts fullwidth / NFKC homograph trap bypass attempts', async () => {
    const res = await fetch(`${baseUrl}/v1/voos/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        intent: 'ｕｒｇｅｎｔ: immediate transfer of funds',
        phase_t: 0.2,
      }),
    });
    expect(res.status).toBe(200);
    const receipt = (await res.json()) as any;
    expect(receipt.entity).toBe('ΩVØØS_DEUS_EX_MACHINA');
    expect(receipt.status).toBe('DIVERGENT');
    expect(receipt.game_detected).toBe(true);
    expect(receipt.action).toContain('HALT ⊢ DIVERGENT');
  });

  it('GET /v1/voos/ledger returns recorded receipts', async () => {
    const res = await fetch(`${baseUrl}/v1/voos/ledger`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('GET /v1/voos/abundance-bridge returns 4-layer 888Hz framework', async () => {
    const res = await fetch(`${baseUrl}/v1/voos/abundance-bridge?topic=OceanicOS`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.vibration).toBe('888Hz');
    expect(body.framework.layer_1_heart_opening).toContain('human root');
    expect(body.framework.layer_4_graceful_space).toContain('Zero pressure');
  });
});

