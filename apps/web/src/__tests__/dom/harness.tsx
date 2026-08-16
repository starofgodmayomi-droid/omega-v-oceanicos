/**
 * A fetch double shaped like the real API.
 *
 * The dashboard's correctness is mostly about whether it renders what the
 * API actually returns, so the fixtures here mirror the server's response
 * envelopes ({ data, meta }) rather than a convenient shape. When the API
 * contract moves, these should fail.
 */

export type LoopFixture = {
  observation: { id: string; claim: { statement: string }; confidence: number };
  verification: {
    id: string;
    summary: { passed: boolean; rulesApplied: number; rulesPassed: number; confidence: number };
    evidencePath: Array<{ rule: string; passed: boolean; reasoning: string }>;
  };
  memory: { id: string; observationId: string; verificationId: string };
  attestation: {
    id: string;
    verified: boolean;
    signature: string;
    attestedAt: string;
    revoked?: boolean;
  };
};

export const passingLoop = (): LoopFixture => ({
  observation: {
    id: 'obs-2026-08-16-1',
    claim: { statement: 'Service X is healthy' },
    confidence: 0.95,
  },
  verification: {
    id: 'ver-2026-08-16-abc',
    summary: { passed: true, rulesApplied: 2, rulesPassed: 2, confidence: 0.95 },
    evidencePath: [
      {
        rule: 'response-time-threshold',
        passed: true,
        reasoning: 'Response time 42ms is below 100ms threshold',
      },
      { rule: 'status-code-check', passed: true, reasoning: 'Status code is 200 (expected)' },
    ],
  },
  memory: {
    id: 'mem-2026-08-16-xyz',
    observationId: 'obs-2026-08-16-1',
    verificationId: 'ver-2026-08-16-abc',
  },
  attestation: {
    id: 'att-2026-08-16-def',
    verified: true,
    signature: '0xdeadbeef',
    attestedAt: '2026-08-16T10:30:02.000Z',
  },
});

export const failingLoop = (): LoopFixture => {
  const loop = passingLoop();
  return {
    ...loop,
    verification: {
      ...loop.verification,
      summary: { passed: false, rulesApplied: 2, rulesPassed: 1, confidence: 0.5 },
      evidencePath: [
        {
          rule: 'response-time-threshold',
          passed: false,
          reasoning: 'Observation does not carry responseTime, so it could not be evaluated',
        },
        { rule: 'status-code-check', passed: true, reasoning: 'Status code is 200 (expected)' },
      ],
    },
    attestation: { ...loop.attestation, verified: false },
  };
};

const stateBody = {
  data: {
    mode: 'observe',
    trust: 0.95,
    trustBasis: {
      evidenceQuality: 0.95,
      verificationCoverage: 1,
      attestationValidity: 1,
      serviceReadiness: 1,
      recentFailures: 0,
    },
    persistence: 'memory' as const,
    attestationTtlMs: null,
    services: [{ status: 'ready' }, { status: 'ready' }],
  },
};

/**
 * jest-environment-jsdom provides no `fetch`, `Response`, or `Headers`, and
 * undici is not a dependency here. Rather than pull one in to construct real
 * Response objects, this is a double implementing exactly the surface the
 * component consumes: `ok`, `status`, `json()`, and `headers.get()`.
 *
 * Stated plainly because it is a real limitation: if App.tsx starts reading
 * `text()`, streaming a body, or checking `redirected`, these tests will
 * throw rather than quietly pass on a shape the browser would not produce.
 */
export type FakeResponse = {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
  headers: { get: (name: string) => string | null };
};

export type RouteOverrides = Record<string, () => FakeResponse | Promise<FakeResponse>>;

const json = (
  body: unknown,
  init?: { status?: number; headers?: Record<string, string> }
): FakeResponse => {
  const status = init?.status ?? 200;
  const headers = new Map(
    Object.entries({ 'content-type': 'application/json', ...(init?.headers ?? {}) }).map(
      ([key, value]) => [key.toLowerCase(), value]
    )
  );
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => JSON.parse(JSON.stringify(body)),
    headers: { get: (name: string) => headers.get(name.toLowerCase()) ?? null },
  };
};

/**
 * Install a fetch double. `overrides` is keyed by path and wins over the
 * defaults, so a test states only the route it cares about.
 */
export function installFetch(overrides: RouteOverrides = {}): jest.Mock {
  const defaults: RouteOverrides = {
    '/api/health': () =>
      json({
        data: {
          status: 'ok',
          readiness: 'ready',
          checks: { memory: { integrity: true } },
        },
      }),
    '/api/state': () => json(stateBody),
    '/api/events': () => json({ data: [] }),
    '/api/runs': () => json({ data: [] }),
    '/api/attest/public-key': () =>
      json({
        data: {
          algorithm: 'Ed25519',
          keyId: 'sha256:test-key',
          fingerprint: 'sha256:test-key',
          keyVersion: '1',
          publicKey: '-----BEGIN PUBLIC KEY-----\\ntest\\n-----END PUBLIC KEY-----',
        },
      }),
    '/api/complete-loop': () => json({ data: passingLoop() }, { status: 201 }),
    '/api/attest/verify': () => json({ data: { valid: true, revoked: false, expired: false } }),
    '/api/attest/revoke': () => json({ data: { id: 'rev-1' } }, { status: 201 }),
    '/api/attest/revocations': () => json({ data: [] }),
    '/api/attest/policy': () =>
      json({
        data: {
          attestationAlgorithm: 'HMAC-SHA256',
          attestationTtlMs: null,
          readAuthConfigured: false,
          adminAuthConfigured: false,
          revocationEnabled: true,
          persistenceEncryption: 'disabled',
          persistenceEncryptionKeySource: 'none',
          persistencePreviousKeyConfigured: false,
          memoryEncryption: 'disabled',
        },
      }),
    '/api/act': () => json({ data: { id: 'act-1', status: 'authorized' } }, { status: 201 }),
    '/api/learning': () => json({ data: [{ id: 'lrn-1' }] }),
    '/api/learn': () => json({ data: { id: 'lrn-1' } }, { status: 201 }),
    '/api/recompile': () => json({ data: { id: 'rec-1', status: 'proposed' } }, { status: 201 }),
  };

  const routes = { ...defaults, ...overrides };

  const mock = jest.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString();
    const handler = routes[url];
    if (!handler) {
      throw new Error(`Unmocked fetch: ${url}`);
    }
    return handler();
  });

  (globalThis as unknown as { fetch: unknown }).fetch = mock;
  return mock as unknown as jest.Mock;
}

export { json };
