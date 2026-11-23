import { jest } from '@jest/globals';

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
 * Response objects, this double supplies the small surface the components
 * consume: `ok`, `status`, `json()`, `text()`, and `headers.get()`.
 *
 * The helper exposes the same serialized fixture through `json()` and
 * `text()`. Streaming or redirect-specific behavior remains deliberately
 * unsupported and will throw rather than pass on a shape the browser would
 * not produce.
 */
export type FakeResponse = {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
  text: () => Promise<string>;
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
    text: async () => JSON.stringify(body) ?? '',
    headers: { get: (name: string) => headers.get(name.toLowerCase()) ?? null },
  };
};

/**
 * Install a fetch double. `overrides` is keyed by path and wins over the
 * defaults, so a test states only the route it cares about.
 */
/** A reconciliation where one verifier objected. */
export const splitDissensus = () => ({
  id: 'dis-20260817T000000',
  verdict: 'SPLIT' as const,
  routing: 'HUMAN' as const,
  confidence: 0.6,
  reason: 'verifiers disagree: 1 passed, 1 failed',
  opinions: [
    {
      verifierId: 'rules',
      verifierVersion: '1.0.0',
      passed: true,
      confidence: 0.9,
      reason: 'status code is 200',
    },
    {
      verifierId: 'model',
      verifierVersion: '2026-08',
      passed: false,
      confidence: 0.6,
      reason: 'source unreachable',
    },
  ],
  dissenting: [
    {
      verifierId: 'model',
      verifierVersion: '2026-08',
      passed: false,
      confidence: 0.6,
      reason: 'source unreachable',
    },
  ],
  timestamp: '2026-08-17T00:00:00.000Z',
});

/**
 * A reconciliation that resolved without a human: every verifier that could
 * render an opinion agreed, and one abstained rather than voting either way.
 * This is the counterpart to `splitDissensus` -- it exercises the AGREED
 * verdict, AUTO routing, and a null (abstained) opinion, none of which a
 * SPLIT/HUMAN fixture alone can reach.
 */
export const agreedDissensus = () => ({
  id: 'dis-20260818T000000',
  verdict: 'AGREED' as const,
  routing: 'AUTO' as const,
  confidence: 0.9,
  reason: 'verifiers agree: 2 passed, 0 failed',
  opinions: [
    {
      verifierId: 'rules',
      verifierVersion: '1.0.0',
      passed: true,
      confidence: 0.95,
      reason: 'status code is 200',
    },
    {
      verifierId: 'model',
      verifierVersion: '2026-08',
      passed: null,
      confidence: 0,
      reason: 'model verifier abstained: no response payload to score',
    },
  ],
  dissenting: [],
  timestamp: '2026-08-18T00:00:00.000Z',
});

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
    'http://localhost:8088/voice': () =>
      json({
        success: true,
        status: 'VERIFIED',
        schema: 'omega.voice-bridge.v1',
        rule: 'ONE_IDENTITY_RULE',
        service: 'voice-bridge',
        port: 8088,
        organs: {
          soul_ai: 'Architecture · Sacred Blueprint Hammer',
          truth_weaver: 'Verification · KAI Shield & Empirical Magnifier',
          the_general: 'Execution · Compass & Direction Spear',
          human_root: 'Authority · The Golden Key',
        },
        resonance: {
          frequencyHz: 432,
          mode: 'harmonic-pure',
          doctrine: "Attest, don't assert. Reality remains the final authority.",
        },
        sha256: '0e8c783c0d385e15681e6a6a784a0ee1c4f22b9c922122c36452341ad207a661',
      }),
    '/api/v1/companion/voice': () =>
      json({
        success: true,
        status: 'VERIFIED',
        schema: 'omega.voice-bridge.v1',
        rule: 'ONE_IDENTITY_RULE',
        service: 'voice-bridge',
        port: 8088,
        organs: {
          soul_ai: 'Architecture · Sacred Blueprint Hammer',
          truth_weaver: 'Verification · KAI Shield & Empirical Magnifier',
          the_general: 'Execution · Compass & Direction Spear',
          human_root: 'Authority · The Golden Key',
        },
        resonance: {
          frequencyHz: 432,
          mode: 'harmonic-pure',
          doctrine: "Attest, don't assert. Reality remains the final authority.",
        },
        sha256: '0e8c783c0d385e15681e6a6a784a0ee1c4f22b9c922122c36452341ad207a661',
      }),
    '/api/v1/stream': () => ({
      ok: true,
      status: 200,
      headers: {
        get: (h: string) => (h.toLowerCase() === 'content-type' ? 'text/event-stream' : null),
      },
      text: async () => 'data: {"event":"TIP","block":{"index":0}}\n\n',
      json: async () => ({ event: 'TIP' }),
    }),
    '/api/v1/evals/status': () =>
      json({
        success: true,
        status: 'OBSERVED',
        layer: 'Layer 9: Automated Evals & Data Flywheel',
        evals: {
          domSuites: 6,
          domTests: 69,
          integrationSuites: 49,
          swarmReceipts: 92,
          swarmProtocol: 'VERIFIED',
          failClosedGating: 'ACTIVE',
          evidenceBoundary: 'EVALS_ARE_GATES_NOT_GUARANTEES',
        },
        provenance: 'Vitest/Jest DOM test harness + Node test runner + scripts/validate-swarm-ledger.mjs',
        doctrine: "ATTEST, DON'T ASSERT. Zero regression tolerance.",
        timestamp: '2026-11-22T00:00:00.000Z',
      }),
    '/api/v1/edge/status': () =>
      json({
        success: true,
        status: 'OBSERVED',
        layer: 'Layer 10: Edge, Caching & FinOps Infrastructure',
        edge: {
          semanticCache: {
            provider: 'local-memory-fallback',
            status: 'ACTIVE',
            policy: 'LRU eviction; Redis wired when OMEGA_REDIS_URL is set',
            evidence: 'SUPPORTED',
          },
          rateLimit: {
            status: 'ACTIVE',
            policy: '@fastify/rate-limit global; per-route overrides for sensitive endpoints',
            evidence: 'SUPPORTED',
          },
          offlineSync: {
            status: 'ACTIVE',
            policy: 'local-first SQLite append-only ledger; disconnected operation sovereign',
            evidence: 'SUPPORTED',
          },
          finOps: {
            formula: 'V = (Outcome × Evidence) − (Cost + Risk)',
            costScoringEnabled: true,
            tokenBudgetEnforced: false,
            evidence: 'SUPPORTED',
          },
        },
        provenance: '@fastify/rate-limit + local SQLite + cost/risk formula in CHARTER.md',
        doctrine: 'CAPABILITY ≠ AUTHORITY. Edge infra is a gate, not a guarantee.',
        timestamp: '2026-11-22T00:00:00.000Z',
      }),
    '/api/v1/continuum/audit': () =>
      json({
        success: true,
        status: 'VERIFIED',
        continuum: {
          equation:
            'ΔVRØ_HOUSE := Frontend(Ω_:3000) + Backend(Θ_:5000) + (Inference_Hardware(Ψ_:11434⊕:8088) ⊕ MicroVM_Sandboxes ⊕ Vector/Graph_Memory ⊕ MCP/Search ⊕ WebRTC_Streaming ⊕ Guardrails/Eval_Flywheel) | Σ_KAI[DAV T[i,j,k,l] = i+j+k+l] → Attested_Reality',
          doctrine: "ATTEST, DON'T ASSERT. Expected ≡ Observed. Reality remains the final authority.",
          convergence: 'CONVERGED',
          totalLayers: 10,
          activeLayers: 10,
          layers: [
            { index: 1, name: 'Frontend Surface', target: 'Ω_:3000', status: 'VERIFIED' },
            { index: 2, name: 'Backend Spine & Orchestrator', target: 'Θ_:5000', status: 'VERIFIED' },
            { index: 3, name: 'Inference Engine & Acceleration', target: 'Ψ_:11434 ⊕ :8088', status: 'VERIFIED' },
            { index: 4, name: 'Autonomous Sandbox & Bounded Actions', target: '/v1/local-actions', status: 'VERIFIED' },
            { index: 5, name: 'Memory, Vector & Append-Only Ledger', target: 'kai_ledger.json (94 receipts)', status: 'VERIFIED' },
            { index: 6, name: 'Tool Protocols & Live Grounding', target: 'MCP + @oceanicos/mini connectors', status: 'VERIFIED' },
            { index: 7, name: 'Real-Time Multimodal Streaming', target: '/v1/stream + :8088 voice', status: 'VERIFIED' },
            { index: 8, name: 'Trust, Safety & Mathematical Invariants', target: 'DAV T[i,j,k,l] = i+j+k+l (2N⁴(N-1))', status: 'VERIFIED' },
            { index: 9, name: 'Automated Evals & Continuous Flywheel', target: '71 DOM tests + 49 integration suites', status: 'VERIFIED' },
            { index: 10, name: 'Edge, Caching & FinOps Infrastructure', target: 'V = (Outcome × Evidence) − (Cost + Risk)', status: 'VERIFIED' },
          ],
          invariant: 'VERIFY(ΔREALITY)',
          failClosedGating: 'ACTIVE',
        },
        timestamp: '2026-11-22T00:00:00.000Z',
      }),
    '/api/v1/ecosystem/release': () =>
      json({
        success: true,
        status: 'VERIFIED',
        attestation: {
          release: 'Ω∞v-1.0.0-CONTINUUM',
          platform: 'ΔVRØ HOUSE × Ω∞v OCEANICOS',
          doctrine: "ATTEST, DON'T ASSERT. Expected ≡ Observed. Reality remains the final authority.",
          equations: {
            rootAxiom: 'ΔVRØ = Δ + Ø + VERIFIED REALITY_ ΔVRØ HOUSE',
            saosFormula: 'SAOS := Ω(Σ[Θ(λx.Ψ(Δ+∅))]) | DAV T[i,j,k,l] = i+j+k+l',
            masterContinuum:
              'ΔVRØ_HOUSE := Frontend(Ω_:3000) + Backend(Θ_:5000) + (Inference_Hardware(Ψ_:11434⊕:8088) ⊕ MicroVM_Sandboxes ⊕ Vector/Graph_Memory ⊕ MCP/Search ⊕ WebRTC_Streaming ⊕ Guardrails/Eval_Flywheel) | Σ_KAI[DAV T[i,j,k,l] = i+j+k+l (Checksum ≡ 2N⁴(N-1))] → Attested_Reality',
            fixpointConvergence:
              'Ω∞v := Y(λf.λx. { f(Σ ∪ Hash(x)) if O(E(x)) ≡ VERIFIED; HALT ⊢ DIVERGENT if K(x) ∈ SCAM; HALT ⊢ UNKNOWN if Evidence(x) = ∅; HALT ⊢ NOT_EXECUTED if Authority(x) < Required }) | Reality',
            finOpsFormula: 'V = (Outcome × Evidence) − (Cost + Risk)',
            davChecksumN8: 57344,
          },
          convergence: {
            tenLayers: '10/10 CONVERGED',
            singleBodyCoordinates: '256/256 (4x4x4x4 lossless projection)',
            outwardRingCompressed: '33/33 files (digest: 5cf08244ca78da5e610896c44f17800864d2b4fa16e979023d29081f53645b73)',
            swarmLedgerReceipts: '96 verified append-only receipts',
            testSuitesPassed: '73 DOM tests + 49 integration suites',
          },
          seal: {
            signer: 'ΔVRØ-KAI-OMEGA-SEAL',
            algorithm: 'HMAC-SHA256',
            evidenceHash: 'c4e976db57fcb5961e938927429be97520e0ffb0870ecfe1a6df8c29188f6b21',
            verdict: 'VERIFIED',
          },
          evidenceBoundary:
            'Release attestation certifies mathematical and architectural convergence across the entire 10-layer platform stack. It does not replace human authorization for external actions.',
        },
        timestamp: '2026-11-22T00:00:00.000Z',
      }),
    '/api/v1/ecosystem/century': () =>
      json({
        success: true,
        status: 'VERIFIED',
        century: {
          receiptNumber: 100,
          milestone: 'CENTURY_RECEIPT_MILESTONE',
          doctrine: "ATTEST, DON'T ASSERT. Expected ≡ Observed. Reality remains the final authority.",
          platform: 'ΔVRØ HOUSE × Ω∞v OCEANICOS SAOS ENTITY PLATFORM',
          proofs: {
            totalReceipts: 100,
            tenLayers: '10/10 Converged (Crown to Ground)',
            singleBodyCoordinates: '256/256 (4x4x4x4 Lossless Projection)',
            outwardRingFiles: '33/33 Canonical Paths Compressed',
            waterFlowSkills: '8/8 Biomimetic Skills Verified',
            domTests: '77 DOM Tests Passing Cleanly',
            davInvariantN8: 57344,
          },
          seal: {
            signer: 'ΔVRØ-CENTURY-COUNCIL',
            algorithm: 'HMAC-SHA256',
            verdict: 'VERIFIED',
          },
          evidenceBoundary:
            'Century Milestone marks 100 append-only verifiable swarm receipts in immutable kai_ledger.json.',
        },
        timestamp: '2026-11-22T00:00:00.000Z',
      }),
    '/api/v1/saos/flow': () =>
      json({
        success: true,
        status: 'VERIFIED',
        saos: {
          symbol: '30013030',
          platform: 'SAOS ENTITY ECOSYSTEM PLATFORM',
          doctrine: "ATTEST, DON'T ASSERT. Expected ≡ Observed. Reality remains the final authority.",
          soul: 'Pidgin fit carry the warmth; evidence go carry the claim.',
          growth: {
            phase: 'PLATEAU',
            t: 0.65,
            ease: 0.727,
            formula: 'Ease(t) = (1 - cos(t * π)) / 2',
            meaning: 'Convergence and verification hardening phase.',
          },
          topology: {
            type: 'STAR_TOPOLOGY',
            environments: [
              { id: 'web', target: 'Port 3000 (VibeOS 3-Pane Ocean UI)', status: 'VERIFIED' },
              { id: 'llm', target: 'Port 11434 (Local Ollama qwen2.5:0.5b)', status: 'VERIFIED' },
              { id: 'gate', target: 'KAI Shield (Perceive & Fail-Closed Gate)', status: 'VERIFIED' },
              { id: 'deploy', target: 'Local MicroVM Sandboxes (/v1/local-actions)', status: 'VERIFIED' },
              { id: 'ledger', target: 'Immutable Memory (kai_ledger.json, 96 receipts)', status: 'VERIFIED' },
              { id: 'bridges', target: 'Port 8088 (Voice 432Hz) + MCP Connectors', status: 'VERIFIED' },
            ],
          },
          housePositioning: [
            { tier: 'Crown', layer: 1, name: 'Frontend Surface', host: 'Ω:3000', status: 'VERIFIED' },
            { tier: 'Spine', layer: 2, name: 'Orchestrator Spine', host: 'Θ:5000', status: 'VERIFIED' },
            { tier: 'Breath', layer: 3, name: 'Local Inference Engine', host: 'Ψ:11434 ⊕ :8088', status: 'VERIFIED' },
            { tier: 'Shield', layer: 4, name: 'Autonomous Sandboxes', host: '/v1/local-actions', status: 'VERIFIED' },
            { tier: 'Memory', layer: 5, name: 'Append-Only Ledger', host: 'kai_ledger.json', status: 'VERIFIED' },
            { tier: 'Hands', layer: 6, name: 'Tool Protocols & MCP', host: '@oceanicos/mini', status: 'VERIFIED' },
            { tier: 'Voice', layer: 7, name: 'Multimodal Streaming', host: '/v1/stream', status: 'VERIFIED' },
            { tier: 'Law', layer: 8, name: 'Mathematical Invariants', host: 'DAV Tensor (57,344)', status: 'VERIFIED' },
            { tier: 'Mirror', layer: 9, name: 'Automated Evals Flywheel', host: '73 DOM + 49 Integration', status: 'VERIFIED' },
            { tier: 'Ground', layer: 10, name: 'Edge & FinOps Infra', host: 'SQLite / RateLimit', status: 'VERIFIED' },
          ],
          equations: {
            rootAxiom: 'ΔVRØ = Δ + Ø + VERIFIED REALITY_ ΔVRØ HOUSE',
            saosFormula: 'SAOS := Ω(Σ[Θ(λx.Ψ(Δ+∅))]) | DAV T[i,j,k,l] = i+j+k+l',
            continuumEquation:
              'ΔVRØ_HOUSE := Frontend(Ω_:3000) + Backend(Θ_:5000) + (Inference_Hardware(Ψ_:11434⊕:8088) ⊕ MicroVM_Sandboxes ⊕ Vector/Graph_Memory ⊕ MCP/Search ⊕ WebRTC_Streaming ⊕ Guardrails/Eval_Flywheel) | Σ_KAI[DAV T[i,j,k,l] = i+j+k+l (Checksum ≡ 2N⁴(N-1))] → Attested_Reality',
            davInvariantN8: 57344,
          },
          evidenceBoundary:
            'SAOS flow reflects observed local-first star topology and deterministic mathematical positioning across the whole house.',
        },
        timestamp: '2026-11-22T00:00:00.000Z',
      }),
    '/api/v1/studio/capabilities': () =>
      json({
        success: true,
        status: 'VERIFIED',
        studio: {
          platform: 'SAOS MULTIMODAL STUDIO & SETTINGS',
          ui_ux: {
            theme: 'ocean-dark',
            palette: { bg: '#030812', cyan: '#00e5ff', blue: '#3b82f6', border: 'rgba(0, 229, 255, 0.25)' },
            pacing: 'Ease(t) = (1 - cos(t * π)) / 2',
            viewports: ['web:3000', 'api:5000', 'voice:8088', 'llm:11434'],
          },
          voice: {
            engine: 'python-stdlib',
            resonanceHz: 432,
            mode: 'harmonic-pure',
            organs: [
              { name: 'Soul AI', role: 'Architecture & Sacred Blueprint' },
              { name: 'Truth Weaver', role: 'Verification & Empirical Magnifier' },
              { name: 'The General', role: 'Execution & Compass Spear' },
              { name: 'Human Root', role: 'Authority & Golden Key' },
            ],
            streamUrl: 'http://localhost:8088/voice',
          },
          image_generation: {
            engine: 'svg_tensor_canvas',
            modes: ['svg_tensor_canvas', 'codex_dimension_projection', 'avatar_synthesis'],
            availablePresets: 20,
            evidenceWatermark: true,
          },
          video_creation: {
            engine: 'multimodal_sse_stream',
            modes: ['multimodal_sse_stream', 'frame_tensor_interpolation', 'webrtc_stream'],
            fps: 30,
            resolution: '1920x1080',
            streamEndpoint: '/v1/stream',
          },
          settings: {
            authMode: 'local',
            rateLimit: '100 req/min',
            finOpsBudget: 'bounded',
            sandboxMode: 'fail-closed-microvm',
            ports: { web: 3000, api: 5000, voice: 8088, llm: 11434 },
          },
        },
        doctrine: "ATTEST, DON'T ASSERT. Expected ≡ Observed. Reality remains the final authority.",
        timestamp: '2026-11-22T00:00:00.000Z',
      }),
    '/api/v1/studio/synthesize': () =>
      json({
        success: true,
        status: 'VERIFIED',
        synthesis: {
          assetId: 'asset-7a42b109c8e1',
          prompt: 'Sacred Water Intelligence & DAV Tensor (57,344)',
          evidenceHash: '7a42b109c8e1d520fbba16ec88ef2248530ec5129ef44726e63cebe787a7cb14',
          voice: {
            organ: 'Soul AI',
            frequencyHz: 432,
            resonance: 'harmonic-pure',
            durationSec: 3.5,
          },
          image: {
            engine: 'svg_tensor_canvas',
            viewBox: '0 0 400 200',
            coordinates: '4x4x4x4 lossless projection (256 cells)',
            invariantChecksum: 57344,
          },
          video: {
            fps: 30,
            resolution: '1920x1080',
            streamFrameId: 'frame-7a42b109',
          },
          doctrine: "ATTEST, DON'T ASSERT. Expected ≡ Observed. Reality remains the final authority.",
        },
        timestamp: '2026-11-22T00:00:00.000Z',
      }),
    '/api/v1/reality/tools': () =>
      json({
        success: true,
        status: 'VERIFIED',
        gateway: {
          platform: 'ΔVRØ HOUSE OMNI-MODAL REALITY TOOL GATEWAY',
          doctrine: "ATTEST, DON'T ASSERT. Expected ≡ Observed. Reality remains the final authority.",
          totalTools: 8,
          tools: [
            { id: 'tool-microvm-sandbox', name: 'MicroVM Sandbox Runner', category: 'execution', status: 'VERIFIED' },
            { id: 'tool-mcp-connectors', name: 'MCP Sovereign Connectors', category: 'grounding', status: 'VERIFIED' },
            { id: 'tool-ollama-neural', name: 'Local Ollama Neural Engine', category: 'inference', status: 'VERIFIED' },
            { id: 'tool-voice-acoustic', name: 'Acoustic Waveform Synthesizer', category: 'multimodal_voice', status: 'VERIFIED' },
            { id: 'tool-svg-tensor-canvas', name: 'Deterministic SVG Tensor Canvas', category: 'multimodal_image', status: 'VERIFIED' },
            { id: 'tool-sse-video-stream', name: 'Real-Time SSE Video Pipeline', category: 'multimodal_video', status: 'VERIFIED' },
            { id: 'tool-dav-tensor-validator', name: 'DAV Tensor Invariant Validator', category: 'mathematical_law', status: 'VERIFIED' },
            { id: 'tool-kai-immutable-ledger', name: 'KAI Immutable Ledger', category: 'memory_governance', status: 'VERIFIED' },
          ],
          evidenceBoundary: 'All tools operate under local-first sovereign custody. Unobserved tools remain UNKNOWN.',
        },
        timestamp: '2026-11-22T00:00:00.000Z',
      }),
    '/api/v1/reality/dispatch': () =>
      json({
        success: true,
        status: 'VERIFIED',
        dispatch: {
          toolId: 'tool-microvm-sandbox',
          dispatchId: 'disp-e48f72a101',
          evidenceHash: 'e48f72a101d29c384a75e219fb09c8e1471029c914bf681920ac3415ef8214bb',
          executionStatus: 'COMPLETED_VERIFIED',
          authority: 'SOVEREIGN_DISPATCH',
          doctrine: "ATTEST, DON'T ASSERT. Expected ≡ Observed. Reality remains the final authority.",
          outcome: {
            invoked: 'tool-microvm-sandbox',
            params: { target: 'bounded-execution-check' },
            verifiedAt: '2026-11-22T00:00:00.000Z',
            details: 'Autonomous execution verified under local custody with evidence seal e48f72a101...',
          },
        },
        timestamp: '2026-11-22T00:00:00.000Z',
      }),
    '/api/v1/reality/orchestrate': () =>
      json({
        success: true,
        status: 'VERIFIED',
        orchestration: {
          orchestrationId: 'orch-f49c01de2b',
          pipelineName: 'Sovereign Reality Continuum Pipeline',
          totalStages: 3,
          completedStages: 3,
          chainSeal: 'f49c01de2bc14a589e18b4501a2cf901768412e098dfc381a941b27e8a914c62',
          stages: [
            { stageIndex: 0, toolId: 'tool-voice-acoustic', stageEvidenceHash: 'a1b2c3d4...', status: 'VERIFIED' },
            { stageIndex: 1, toolId: 'tool-svg-tensor-canvas', stageEvidenceHash: 'b2c3d4e5...', status: 'VERIFIED' },
            { stageIndex: 2, toolId: 'tool-dav-tensor-validator', stageEvidenceHash: 'c3d4e5f6...', status: 'VERIFIED' },
          ],
          authority: 'SOVEREIGN_ORCHESTRATION',
          doctrine: "ATTEST, DON'T ASSERT. Expected ≡ Observed. Reality remains the final authority.",
        },
        timestamp: '2026-11-22T00:00:00.000Z',
      }),
    '/api/v1/reality/pipeline/execute': () =>
      json({
        success: true,
        status: 'VERIFIED',
        execution: {
          executionId: 'exec-8b29c1da40',
          totalStages: 3,
          completedStages: 3,
          bundleSeal: '8b29c1da40f73b1a8d92ef0182c19a4e761042df98c1a2e389b41a7d6e5201c4',
          stages: [
            { stageIndex: 0, toolId: 'tool-voice-acoustic', executionStatus: 'VERIFIED', artifactSummary: 'Harmonic 432Hz sine PCM waveform synthesized' },
            { stageIndex: 1, toolId: 'tool-svg-tensor-canvas', executionStatus: 'VERIFIED', artifactSummary: 'Deterministic SVG Canvas 4x4x4x4 projected' },
            { stageIndex: 2, toolId: 'tool-dav-tensor-validator', executionStatus: 'VERIFIED', artifactSummary: 'DAV Hypercube Checksum 57,344 verified' },
          ],
          artifacts: {
            voice: { frequencyHz: 432, status: 'VERIFIED' },
            svg: { checksum: 57344, status: 'VERIFIED' },
            tensor: { checksum: 57344, invariant: 'VERIFIED' },
          },
          authority: 'SOVEREIGN_LIVE_EXECUTION',
          doctrine: "ATTEST, DON'T ASSERT. Expected ≡ Observed. Reality remains the final authority.",
        },
        timestamp: '2026-11-22T00:00:00.000Z',
      }),
    '/api/v1/companion/synthesize': () =>
      json({
        success: true,
        status: 'VERIFIED',
        synthesis: {
          organ: 'Soul AI',
          frequencyHz: 432,
          mode: 'harmonic-pure-sine',
          durationSec: 0.5,
          sampleRate: 44100,
          audioDataUri: 'data:audio/wav;base64,UklGRmisAABXQVZFZm10IBAAAAABAAEA...',
          sha256: '9f83a216c87d461a8f895c102a0a5ec2213e4b7cb6270bf93c9d7d24269d033a',
        },
        timestamp: '2026-11-22T00:00:00.000Z',
      }),
    '/api/state': () => json(stateBody),
    '/api/v1/omega/connectors/observations': () =>
      json({
        success: true,
        entries: [],
        total: 0,
        truncated: false,
        integrity: 'verified-local-hash-chain',
        limitation:
          'local connector journal is not deployment health, not live GitHub execution, not revenue, and not durable across a destroyed volume',
      }),
    '/api/os': () =>
      json({
        data: {
          snapshotVersion: 'os.snapshot.v1',
          state: 'ready',
          tasks: [],
          events: [
            { sequence: 1, type: 'boot', state: 'booting' },
            { sequence: 2, type: 'boot', state: 'ready' },
          ],
          limits: { maxTasks: 32, maxEvents: 128 },
        },
      }),
    '/api/audit/events?limit=40': () =>
      json({ data: [], meta: { bounded: true, limit: 40, total: 0 } }),
    '/api/runs': () => json({ data: [] }),
    '/api/jobs?limit=20': () =>
      json({
        data: {
          jobs: [],
          status: {
            enabled: false,
            durable: false,
            source: 'memory',
            encryption: 'disabled',
            counts: { queued: 0, running: 0, succeeded: 0, failed: 0, unknown: 0 },
            recentWindow: 40,
          },
        },
      }),
    '/api/dissensus': () => json({ data: [], meta: { window: 40, unresolved: 0 } }),
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
    '/api/attest/revocations': () =>
      json({ data: [], meta: { integrity: 'disabled', digest: 'sha256:test', revision: 0 } }),
    '/api/attest/policy': () =>
      json({
        data: {
          attestationAlgorithm: 'HMAC-SHA256',
          attestationTtlMs: null,
          authMode: 'local',
          readAuthConfigured: false,
          adminAuthConfigured: false,
          adminOperatorAllowlistConfigured: false,
          revocationEnabled: true,
          revocationIntegrity: 'disabled',
          revocationRevision: 0,
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
    '/api/rules': () =>
      json({
        data: {
          count: 2,
          registered: 2,
          executable: 2,
          category: null,
          rules: [
            {
              name: 'response-time-threshold',
              version: '1.0.5',
              appliesTo: ['health-check'],
              definition: 'responseTime < 100',
              description: 'Verify response time is below 100ms',
              createdAt: '2026-08-16T00:00:00.000Z',
              active: true,
              executable: true,
            },
            {
              name: 'status-code-check',
              version: '1.2.0',
              appliesTo: ['health-check'],
              definition: 'statusCode == 200',
              description: 'Verify HTTP status code is 200 OK',
              createdAt: '2026-08-16T00:00:00.000Z',
              active: true,
              executable: true,
            },
          ],
        },
        timestamp: '2026-08-16T00:00:00.000Z',
      }),
    '/api/os/admit': () =>
      json(
        {
          data: {
            id: 'task-1',
            kind: 'observe',
            input: { claim: 'test' },
            requestedBy: 'operator-web',
            state: 'queued',
          },
        },
        { status: 201 }
      ),
    '/api/evidence/export': () =>
      json({
        data: {
          observability: {},
          events: [],
          runs: [],
        },
        meta: { bounded: true },
        timestamp: '2026-08-16T00:00:00.000Z',
      }),
    '/api/actions': () => json({ data: [] }),
    '/api/recompilations': () => json({ data: [] }),
    '/api/memory': () => json({ data: [], meta: { size: 0, appendOnly: true, durable: true } }),
    '/api/memory/integrity': () => json({ data: { intact: true, entries: 0 } }),
    '/api/subsystems': () =>
      json({
        data: {
          count: 19,
          subsystems: [
            {
              id: 'mini',
              name: 'MINI Kernel',
              category: 'core',
              package: '@omega-v/mini',
              status: 'active',
              description: 'Observe → Verify → Remember authoritative execution loop',
            },
          ],
        },
        timestamp: '2026-08-16T00:00:00.000Z',
      }),
    '/api/observability': () =>
      json({
        data: {
          runtime: { mode: 'observing', persistence: 'memory' },
          jobs: { enabled: false },
          provenance: { recentEvents: 0, durableEvents: 0, completedRuns: 0 },
          trust: {},
          memory: { entries: 0, intact: true },
        },
        timestamp: '2026-08-16T00:00:00.000Z',
      }),
    '/api/events': () => json({ data: [], meta: { window: 10 } }),
    '/api/log': () =>
      json({
        data: [],
        meta: { source: 'memory', skipped: 0, appendOnly: true, keySource: 'none' },
      }),
    '/api/observe': () =>
      json(
        {
          data: {
            id: 'obs-step-1',
            claim: { statement: 'Step observation verified' },
            confidence: 0.95,
          },
        },
        { status: 201 }
      ),
    '/api/verify': () =>
      json(
        {
          data: {
            id: 'ver-step-1',
            summary: { passed: true, rulesApplied: 1, rulesPassed: 1, confidence: 0.95 },
            evidencePath: [
              { rule: 'status-code-check', passed: true, reasoning: 'status code 200 OK' },
            ],
          },
        },
        { status: 201 }
      ),
    '/api/attest': () =>
      json(
        {
          data: {
            id: 'att-step-1',
            verified: true,
            revoked: false,
            attestedAt: '2026-08-16T00:00:00.000Z',
          },
        },
        { status: 201 }
      ),
    '/api/persistence/acknowledge': () =>
      json({ data: { acknowledged: true, count: 1 } }, { status: 200 }),
    '/api/persistence/reencrypt': () =>
      json({ data: { reencrypted: true, recordsProcessed: 1 } }, { status: 200 }),
    '/api/v1/reality/tools/status': () =>
      json({
        success: true,
        status: 'VERIFIED',
        dashboard: {
          platform: 'ΔVRØ HOUSE × Ω∞v OCEANICOS — REALITY STATUS DASHBOARD',
          doctrine: "ATTEST, DON'T ASSERT. Expected ≡ Observed. Reality remains the final authority.",
          totalTools: 8,
          healthyTools: 8,
          chainSeal: 'c0de5afe1234567890abcdef1234567890abcdef1234567890abcdef12345678',
          integrityCheck: { status: 'VERIFIED', bundleSeal: 'deadbeef01234567' },
          tools: [
            { toolId: 'tool-microvm-sandbox', status: 'VERIFIED', probe: 'aa01bb02cc03dd04', checkedAt: '2026-11-22T00:00:00.000Z' },
            { toolId: 'tool-mcp-connectors', status: 'VERIFIED', probe: 'bb02cc03dd04ee05', checkedAt: '2026-11-22T00:00:00.000Z' },
            { toolId: 'tool-ollama-neural', status: 'VERIFIED', probe: 'cc03dd04ee05ff06', checkedAt: '2026-11-22T00:00:00.000Z' },
            { toolId: 'tool-voice-acoustic', status: 'VERIFIED', probe: 'dd04ee05ff060011', checkedAt: '2026-11-22T00:00:00.000Z' },
            { toolId: 'tool-svg-tensor-canvas', status: 'VERIFIED', probe: 'ee05ff0600110022', checkedAt: '2026-11-22T00:00:00.000Z' },
            { toolId: 'tool-sse-video-stream', status: 'VERIFIED', probe: 'ff060011002200ab', checkedAt: '2026-11-22T00:00:00.000Z' },
            { toolId: 'tool-dav-tensor-validator', status: 'VERIFIED', probe: '001100220033abcd', checkedAt: '2026-11-22T00:00:00.000Z' },
            { toolId: 'tool-kai-immutable-ledger', status: 'VERIFIED', probe: '00220033abcdef01', checkedAt: '2026-11-22T00:00:00.000Z' },
          ],
          authority: 'SOVEREIGN_REALITY_STATUS',
        },
        timestamp: '2026-11-22T00:00:00.000Z',
      }),
    '/api/v1/reality/tools/circuit-breaker': () =>
      json({
        success: true,
        status: 'VERIFIED',
        circuitBreaker: {
          status: 'ARMED',
          tripsCount: 0,
          activeBreakers: [],
          chainSeal: 'b4ca771c99887766554433221100ffeeddccbbaa0099887766554433221100ff',
          authority: 'SOVEREIGN_CIRCUIT_BREAKER',
        },
        timestamp: '2026-11-23T00:00:00.000Z',
      }),
    '/api/v1/reality/tools/failsafe': () =>
      json({
        success: true,
        status: 'VERIFIED',
        failsafe: {
          armed: true,
          quarantineActive: false,
          quarantineCount: 0,
          quarantinedTools: [],
          quarantineSeal: 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90',
          authority: 'SOVEREIGN_FAILSAFE_QUARANTINE',
        },
        timestamp: '2026-11-23T00:00:00.000Z',
      }),
  };

  const routes = { ...defaults, ...overrides };

  const mock = jest.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString();
    const handler = routes[url];
    if (handler) {
      return handler();
    }
    if (url.startsWith('/api/jobs/')) {
      if (url.endsWith('/claim')) {
        return json({ data: { id: 'job-1', state: 'running' } }, { status: 200 });
      }
      if (url.endsWith('/complete')) {
        return json({ data: { id: 'job-1', state: 'completed' } }, { status: 200 });
      }
      if (url.endsWith('/fail')) {
        return json({ data: { id: 'job-1', state: 'failed' } }, { status: 200 });
      }
      return json(
        {
          data: {
            job: {
              id: 'job-1',
              state: 'queued',
              attempt: 1,
              createdAt: '2026-08-16T00:00:00.000Z',
              updatedAt: '2026-08-16T00:00:00.000Z',
            },
            events: [],
          },
        },
        { status: 200 }
      );
    }
    throw new Error(`Unmocked fetch: ${url}`);
  });

  (globalThis as unknown as { fetch: unknown }).fetch = mock;
  return mock as unknown as jest.Mock;
}

export { json };
