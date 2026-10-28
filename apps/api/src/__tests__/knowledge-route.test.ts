import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createApp } from '../index.js';

describe('📜 Knowledge Envelope Route & Fail-Closed Sanitizer Suite', () => {
  let directory: string;
  let app: ReturnType<typeof createApp>;

  beforeAll(async () => {
    directory = mkdtempSync(join(tmpdir(), 'omega-api-knowledge-test-'));
    app = createApp(join(directory, 'ledger.db'), false, { allowUnsignedCycle: true });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    rmSync(directory, { recursive: true, force: true });
  });

  it('GET /v1/knowledge/envelope/schema returns canonical schema definition and invariants', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/knowledge/envelope/schema',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.contract).toBe('Ω∞v-KNOWLEDGE-ENVELOPE-V4');
    expect(body.steward).toBe('did:omega:human:starofgodmayomi');
    expect(body.kinds).toContain('decision');
    expect(body.kinds).toContain('principle');
    expect(body.states).toContain('VERIFIED');
    expect(body.visibilities).toContain('private');
    expect(body.invariants.failClosed).toBe(true);
    expect(body.invariants.forbidsRawSourceLeaks).toBe(true);
  });

  it('POST /v1/knowledge/envelope/validate validates a valid reviewed knowledge envelope', async () => {
    const validEnvelope = {
      id: 'env-notion-001',
      kind: 'decision',
      summary: 'Admit 5-buyer interview prompts to stage gate VALIDATE',
      state: 'VERIFIED',
      source: {
        system: 'notion',
        reference: 'page:4003080b-dd53-8159-8220-ef09061f54b7',
        revision: 'rev-42',
        capturedAt: '2026-10-28T08:00:00Z',
      },
      capturedAt: '2026-10-28T08:00:00Z',
      owner: 'starofgodmayomi',
      visibility: 'internal',
      policy: {
        reviewedForPublicRelease: true,
        containsRawSourceContent: false,
        sensitivity: 'reviewed',
        approvalReference: 'auth:did:omega:human:starofgodmayomi',
      },
      relations: [
        { type: 'implements', targetId: 'env-root-000' },
      ],
      evidence: [
        { type: 'test', status: 'PRESENT', reference: 'tests/notion-evidence-sync.test.mjs' },
      ],
      tags: ['notion', 'wealth', 'stage-gate-validate'],
    };

    const res = await app.inject({
      method: 'POST',
      url: '/v1/knowledge/envelope/validate',
      payload: validEnvelope,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.validation).toBe('VALID');
    expect(body.publicExportAllowed).toBe(false); // internal visibility prevents public export
    expect(body.envelope.id).toBe('env-notion-001');

    // Test with public visibility
    const publicRes = await app.inject({
      method: 'POST',
      url: '/v1/knowledge/envelope/validate',
      payload: { ...validEnvelope, id: 'env-public-002', visibility: 'public' },
    });
    expect(publicRes.statusCode).toBe(200);
    const publicBody = JSON.parse(publicRes.payload);
    expect(publicBody.validation).toBe('VALID');
    expect(publicBody.publicExportAllowed).toBe(true);
  });

  it('POST /v1/knowledge/envelope/validate rejects forbidden raw source leaks and fails closed', async () => {
    const hostileEnvelope = {
      id: 'env-hostile-002',
      kind: 'observation',
      summary: 'Attempted leak',
      state: 'OBSERVED',
      source: { system: 'notion', reference: 'leak-target' },
      capturedAt: '2026-10-28T08:00:00Z',
      visibility: 'public',
      policy: { reviewedForPublicRelease: true, containsRawSourceContent: false },
      relations: [],
      evidence: [],
      rawSourceContent: 'SECRET_UNREVIEWED_INTERNAL_DATA', // FORBIDDEN!
    };

    const res = await app.inject({
      method: 'POST',
      url: '/v1/knowledge/envelope/validate',
      payload: hostileEnvelope,
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(false);
    expect(body.validation).toBe('INVALID');
    expect(body.publicExportAllowed).toBe(false);
    expect(body.issues.length).toBeGreaterThan(0);
  });
});
