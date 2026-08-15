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

  it('rejects incomplete requests with provenance-bearing errors', async () => {
    const observeResponse = await fetch(`${baseUrl}/observe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const observeError = (await observeResponse.json()) as { code: string };

    expect(observeResponse.status).toBe(400);
    expect(observeError.code).toBe('OBSERVATION_FAILED');

    const verifyResponse = await fetch(`${baseUrl}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const verifyError = (await verifyResponse.json()) as { code: string };

    expect(verifyResponse.status).toBe(400);
    expect(verifyError.code).toBe('MISSING_OBSERVATION');

    const attestResponse = await fetch(`${baseUrl}/attest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const attestError = (await attestResponse.json()) as { code: string };

    expect(attestResponse.status).toBe(400);
    expect(attestError.code).toBe('MISSING_VERIFICATION');

    const actResponse = await fetch(`${baseUrl}/act`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const actError = (await actResponse.json()) as { code: string };

    expect(actResponse.status).toBe(400);
    expect(actError.code).toBe('MISSING_ATTESTATION');

    const invalidAttestationResponse = await fetch(`${baseUrl}/act`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        attestation: {
          id: 'att-forged',
          verificationId: 'ver-forged',
          observationId: 'obs-forged',
          verified: true,
          confidence: 1,
          signature: '0xdeadbeef',
          signingKey: 'forged-key',
          keyVersion: '1',
          signingAlgorithm: 'HMAC-SHA256',
          attestedAt: new Date().toISOString(),
          attestedBy: 'forger',
          ruleVersions: {},
          status: 'signed',
        },
      }),
    });
    const invalidAttestationError = (await invalidAttestationResponse.json()) as { code: string };

    expect(invalidAttestationResponse.status).toBe(403);
    expect(invalidAttestationError.code).toBe('INVALID_ATTESTATION');

    const learnResponse = await fetch(`${baseUrl}/learn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actionId: 'act-any', outcome: 'exploded' }),
    });
    const learnError = (await learnResponse.json()) as { code: string };

    expect(learnResponse.status).toBe(400);
    expect(learnError.code).toBe('INVALID_LEARNING');

    const loopFailureResponse = await fetch(`${baseUrl}/complete-loop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const loopFailureError = (await loopFailureResponse.json()) as { code: string };

    expect(loopFailureResponse.status).toBe(400);
    expect(loopFailureError.code).toBe('LOOP_FAILED');

    const state = (await (await fetch(`${baseUrl}/state`)).json()) as ApiResponse<{
      trustBasis: { recentFailures: number };
    }>;
    expect(state.data.trustBasis.recentFailures).toBeGreaterThan(0);

    const notFoundResponse = await fetch(`${baseUrl}/does-not-exist`);
    const notFoundError = (await notFoundResponse.json()) as { code: string };

    expect(notFoundResponse.status).toBe(404);
    expect(notFoundError.code).toBe('NOT_FOUND');
  });

  it('remembers each completed loop in the provenance memory chain', async () => {
    const loopResponse = await fetch(`${baseUrl}/complete-loop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        claim: 'API memory contract test',
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

    const memoryResponse = await fetch(`${baseUrl}/memory`);
    const memoryState = (await memoryResponse.json()) as ApiResponse<{
      entries: Array<{
        id: number;
        type: 'OBSERVATION' | 'VERIFICATION' | 'ATTESTATION';
        data: { id: string };
        hash: string;
        previousHash: string;
      }>;
      size: number;
      integrity: boolean;
    }>;

    expect(memoryResponse.status).toBe(200);
    expect(memoryState.data.integrity).toBe(true);

    const { entries } = memoryState.data;
    const observationIndex = entries.findIndex(
      (entry) => entry.type === 'OBSERVATION' && entry.data.id === loop.data.observation.id
    );
    expect(observationIndex).toBeGreaterThanOrEqual(0);

    const tail = entries.slice(observationIndex, observationIndex + 3);
    expect(tail.map((entry) => entry.type)).toEqual(['OBSERVATION', 'VERIFICATION', 'ATTESTATION']);
    expect((tail[1]?.data as { observationId?: string }).observationId).toBe(
      loop.data.observation.id
    );
    expect(tail[2]?.data.id).toBe(loop.data.attestation.id);

    for (let index = 1; index < entries.length; index++) {
      expect(entries[index]?.previousHash).toBe(entries[index - 1]?.hash);
    }
    expect(memoryState.data.size).toBe(entries.length);
  });
});
