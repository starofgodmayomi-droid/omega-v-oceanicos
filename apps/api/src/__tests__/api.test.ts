import { createServer, Server } from 'node:http';
import app from '../index';

type ApiResponse<T> = { data: T };

type LoopPayload = {
  observation: { id: string };
  verification: { summary: { passed: boolean } };
  attestation: { id: string; verified: boolean };
};

describe('API runtime contracts', () => {
  let server: Server;
  let baseUrl: string;

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

  it('executes the loop and records its runtime lineage', async () => {
    const loopResponse = await fetch(`${baseUrl}/complete-loop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-request-id': 'request-contract-1' },
      body: JSON.stringify({
        claim: 'API contract test is healthy',
        category: 'health-check',
        source: { system: 'api-test', version: '0.1.0', environment: 'test' },
        observedBy: 'jest',
        metadata: { responseTime: 42, statusCode: 200 },
        confidence: 0.95,
        confidenceReason: 'Executable contract test',
      }),
    });
    const loop = (await loopResponse.json()) as ApiResponse<LoopPayload>;

    expect(loopResponse.status).toBe(201);
    expect(loopResponse.headers.get('x-request-id')).toBe('request-contract-1');
    expect(loop.data.verification.summary.passed).toBe(true);
    expect(loop.data.attestation.verified).toBe(true);

    const events = (await (await fetch(`${baseUrl}/events`)).json()) as ApiResponse<
      Array<{ correlationId?: string; requestId?: string }>
    >;
    const runs = (await (await fetch(`${baseUrl}/runs`)).json()) as ApiResponse<
      Array<{ observation: { id: string } }>
    >;
    const state = (await (await fetch(`${baseUrl}/state`)).json()) as ApiResponse<{
      trustBasis: {
        evidenceQuality: number | null;
        verificationCoverage: number | null;
        attestationValidity: number | null;
        serviceReadiness: number;
        recentFailures: number;
      };
    }>;

    expect(events.data).toHaveLength(4);
    expect(new Set(events.data.map((event) => event.correlationId)).size).toBe(1);
    expect(new Set(events.data.map((event) => event.requestId)).size).toBe(1);
    expect(events.data[0]?.requestId).toBe('request-contract-1');
    expect(runs.data[0]?.observation.id).toBe(loop.data.observation.id);
    expect(state.data.trustBasis.evidenceQuality).toBe(0.95);
    expect(state.data.trustBasis.verificationCoverage).toBe(1);
    expect(state.data.trustBasis.attestationValidity).toBe(1);
  });

  it('reports runtime provenance and memory evidence without secrets', async () => {
    await fetch(`${baseUrl}/complete-loop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-request-id': 'observability-contract-1' },
      body: JSON.stringify({
        claim: 'Observability contract test is healthy',
        category: 'health-check',
        source: { system: 'api-test', version: '0.1.0', environment: 'test' },
        observedBy: 'jest',
        metadata: { responseTime: 42, statusCode: 200 },
        confidence: 0.95,
        confidenceReason: 'Executable observability contract test',
      }),
    });

    const response = await fetch(`${baseUrl}/observability`);
    const body = (await response.json()) as ApiResponse<{
      runtime: { persistence: string; services: string[] };
      provenance: {
        durableEvents: number;
        completedRuns: number;
        lastRequestId: string | null;
      };
      trust: { attestationValidity: number | null };
      memory: { entries: number; intact: boolean; appendOnly: boolean };
    }>;

    expect(response.status).toBe(200);
    expect(body.data.runtime.services).toEqual(['observer', 'verifier', 'attester']);
    expect(body.data.provenance.durableEvents).toBeGreaterThanOrEqual(0);
    expect(body.data.provenance.completedRuns).toBeGreaterThan(0);
    expect(body.data.provenance.lastRequestId).toBe('observability-contract-1');
    expect(body.data.trust.attestationValidity).toBe(true);
    expect(body.data.memory.entries).toBeGreaterThan(0);
    expect(body.data.memory.intact).toBe(true);
    expect(body.data.memory.appendOnly).toBe(true);
    expect(JSON.stringify(body)).not.toMatch(/private|secret|seed|signing material/i);
  });

  it('exports bounded evidence without secrets', async () => {
    const response = await fetch(`${baseUrl}/evidence/export`);
    const body = (await response.json()) as {
      data: {
        observability: { memory: { intact: boolean; appendOnly: boolean } };
        events: unknown[];
        runs: unknown[];
      };
      meta: { bounded: boolean; eventWindow: number; runWindow: number };
    };

    expect(response.status).toBe(200);
    expect(body.meta).toEqual({ bounded: true, eventWindow: 40, runWindow: 10 });
    expect(body.data.observability.memory.intact).toBe(true);
    expect(body.data.observability.memory.appendOnly).toBe(true);
    expect(body.data.events.length).toBeLessThanOrEqual(40);
    expect(body.data.runs.length).toBeLessThanOrEqual(10);
    expect(JSON.stringify(body)).not.toMatch(/private|secret|seed|signing material/i);
  });

  it('verifies the attestation produced by the loop', async () => {
    const loopResponse = await fetch(`${baseUrl}/complete-loop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        claim: 'API attestation contract test',
        category: 'health-check',
        source: { system: 'api-test', version: '0.1.0', environment: 'test' },
        observedBy: 'jest',
        metadata: { responseTime: 42, statusCode: 200 },
        confidence: 0.95,
        confidenceReason: 'Executable contract test',
      }),
    });
    const loop = (await loopResponse.json()) as ApiResponse<LoopPayload>;
    const verificationResponse = await fetch(`${baseUrl}/attest/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attestation: loop.data.attestation }),
    });
    const verification = (await verificationResponse.json()) as ApiResponse<{ valid: boolean }>;

    expect(verificationResponse.status).toBe(200);
    expect(verification.data.valid).toBe(true);
  });

  it('enforces the opt-in read-only access token boundary', async () => {
    const previousToken = process.env.OMEGA_READ_TOKEN;
    process.env.OMEGA_READ_TOKEN = 'contract-read-token';
    try {
      const denied = await fetch(`${baseUrl}/observability`);
      const deniedBody = (await denied.json()) as { code: string; requestId: string };
      expect(denied.status).toBe(401);
      expect(deniedBody.code).toBe('READ_ACCESS_REQUIRED');

      const allowed = await fetch(`${baseUrl}/observability`, {
        headers: { Authorization: 'Bearer contract-read-token' },
      });
      expect(allowed.status).toBe(200);
    } finally {
      if (previousToken === undefined) delete process.env.OMEGA_READ_TOKEN;
      else process.env.OMEGA_READ_TOKEN = previousToken;
    }
  });

  it('sanitizes untrusted request IDs and emits baseline security headers', async () => {
    const response = await fetch(`${baseUrl}/health`, {
      headers: { 'x-request-id': 'bad id with spaces and\\ncontrol' },
    });

    const requestId = response.headers.get('x-request-id');
    expect(response.status).toBe(200);
    expect(requestId).toMatch(/^req-[0-9a-f-]{36}$/);
    expect(requestId).not.toContain(' ');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.get('x-frame-options')).toBe('DENY');
    expect(response.headers.get('referrer-policy')).toBe('no-referrer');
  });

  it('includes request provenance in error responses', async () => {
    const response = await fetch(`${baseUrl}/attest/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-request-id': 'error-contract-1' },
      body: JSON.stringify({}),
    });
    const error = (await response.json()) as { code: string; requestId: string };

    expect(response.status).toBe(400);
    expect(error.code).toBe('MISSING_ATTESTATION');
    expect(error.requestId).toBe('error-contract-1');
    expect(response.headers.get('x-request-id')).toBe('error-contract-1');
  });

  it('streams a ready frame and lifecycle events over SSE', async () => {
    const streamResponse = await fetch(`${baseUrl}/events/stream`);
    expect(streamResponse.headers.get('content-type')).toContain('text/event-stream');
    if (!streamResponse.body) throw new Error('SSE response has no body');

    const reader = streamResponse.body.getReader();
    const readyChunk = await reader.read();
    expect(new TextDecoder().decode(readyChunk.value)).toContain('event: ready');

    await fetch(`${baseUrl}/complete-loop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        claim: 'SSE contract test',
        category: 'health-check',
        source: { system: 'api-test', version: '0.1.0', environment: 'test' },
        observedBy: 'jest',
        metadata: { responseTime: 42, statusCode: 200 },
        confidence: 0.95,
        confidenceReason: 'Executable contract test',
      }),
    });

    const eventChunk = await Promise.race([
      reader.read(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timed out waiting for SSE lifecycle event')), 1000)
      ),
    ]);
    expect(new TextDecoder().decode(eventChunk.value)).toContain('observation.received');
    await reader.cancel();
  });

  it('authorizes an action only from a verified attestation', async () => {
    const loopResponse = await fetch(`${baseUrl}/complete-loop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        claim: 'API action contract test',
        category: 'health-check',
        source: { system: 'api-test', version: '0.1.0', environment: 'test' },
        observedBy: 'jest',
        metadata: { responseTime: 42, statusCode: 200 },
        confidence: 0.95,
        confidenceReason: 'Executable contract test',
      }),
    });
    const loop = (await loopResponse.json()) as ApiResponse<LoopPayload>;
    const actionResponse = await fetch(`${baseUrl}/act`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attestation: loop.data.attestation }),
    });
    const action = (await actionResponse.json()) as ApiResponse<{ id: string; status: string }>;

    expect(actionResponse.status).toBe(201);
    expect(action.data.status).toBe('authorized');

    const standaloneObservationResponse = await fetch(`${baseUrl}/observe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        claim: 'Standalone attestation must not act',
        category: 'health-check',
        source: { system: 'api-test', version: '0.1.0', environment: 'test' },
        observedBy: 'jest',
        metadata: { responseTime: 42, statusCode: 200 },
        confidence: 0.95,
        confidenceReason: 'Executable contract test',
      }),
    });
    const standaloneObservation = (
      (await standaloneObservationResponse.json()) as ApiResponse<Record<string, unknown>>
    ).data;
    const standaloneVerificationResponse = await fetch(`${baseUrl}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ observation: standaloneObservation }),
    });
    const standaloneVerification = (
      (await standaloneVerificationResponse.json()) as ApiResponse<Record<string, unknown>>
    ).data;
    const standaloneAttestationResponse = await fetch(`${baseUrl}/attest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verificationResult: standaloneVerification }),
    });
    const standaloneAttestation = (
      (await standaloneAttestationResponse.json()) as ApiResponse<{ id: string; verified: boolean }>
    ).data;
    const orphanActionResponse = await fetch(`${baseUrl}/act`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attestation: standaloneAttestation }),
    });

    expect(orphanActionResponse.status).toBe(404);

    const learningResponse = await fetch(`${baseUrl}/learn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actionId: action.data.id,
        outcome: 'success',
        note: 'The authorized record was accepted by the local runtime.',
      }),
    });
    const learning = (await learningResponse.json()) as ApiResponse<{
      actionId: string;
      outcome: string;
    }>;

    expect(learningResponse.status).toBe(201);
    expect(learning.data.actionId).toBe(action.data.id);
    expect(learning.data.outcome).toBe('success');

    const recompileResponse = await fetch(`${baseUrl}/recompile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ learningId: learning.data.actionId }),
    });
    expect(recompileResponse.status).toBe(404);

    const learningRecord = (await (await fetch(`${baseUrl}/learning`)).json()) as ApiResponse<
      Array<{ id: string }>
    >;
    const validRecompileResponse = await fetch(`${baseUrl}/recompile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ learningId: learningRecord.data[0]?.id }),
    });
    const proposal = (await validRecompileResponse.json()) as ApiResponse<{ status: string }>;

    expect(validRecompileResponse.status).toBe(201);
    expect(proposal.data.status).toBe('proposed');

    const failedLoopResponse = await fetch(`${baseUrl}/complete-loop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        claim: 'API action denial contract test',
        category: 'health-check',
        source: { system: 'api-test', version: '0.1.0', environment: 'test' },
        observedBy: 'jest',
        metadata: { responseTime: 120, statusCode: 200 },
        confidence: 0.95,
        confidenceReason: 'Executable contract test',
      }),
    });
    const failedLoop = (await failedLoopResponse.json()) as ApiResponse<LoopPayload>;
    const deniedResponse = await fetch(`${baseUrl}/act`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attestation: failedLoop.data.attestation }),
    });

    expect(deniedResponse.status).toBe(409);

    const missingLearningResponse = await fetch(`${baseUrl}/learn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actionId: 'act-missing', outcome: 'success' }),
    });
    expect(missingLearningResponse.status).toBe(404);
  });
});
