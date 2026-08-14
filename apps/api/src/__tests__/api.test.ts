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
      headers: { 'Content-Type': 'application/json' },
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
    expect(loop.data.verification.summary.passed).toBe(true);
    expect(loop.data.attestation.verified).toBe(true);

    const events = (await (await fetch(`${baseUrl}/events`)).json()) as ApiResponse<
      Array<{ correlationId?: string }>
    >;
    const runs = (await (await fetch(`${baseUrl}/runs`)).json()) as ApiResponse<
      Array<{ observation: { id: string } }>
    >;

    expect(events.data).toHaveLength(4);
    expect(new Set(events.data.map((event) => event.correlationId)).size).toBe(1);
    expect(runs.data[0]?.observation.id).toBe(loop.data.observation.id);
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
