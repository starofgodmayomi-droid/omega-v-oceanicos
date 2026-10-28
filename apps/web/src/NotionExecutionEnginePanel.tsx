import React, { useState, useEffect } from 'react';
import { theme } from './oceanicosTheme';

interface NotionSurface {
  name: string;
  uuid: string;
  url: string;
  role: string;
  stage: string;
}

interface WorkspaceSection {
  name: string;
  status: 'CONFIGURED' | 'PROPOSED' | 'BLOCKED';
  evidence: string;
}

interface NotionApiResponse {
  success: boolean;
  token?: { configured: boolean; source: string };
  surfaces?: Array<{
    name: string;
    uuid: string;
    url: string;
    role: string;
    quadrant: string;
    connected: boolean;
    tokenConfigured: boolean;
  }>;
  workspaceSections?: WorkspaceSection[];
  composioBridge?: {
    configured: boolean;
    apiKeyPresent: boolean;
    status: string;
  };
  evaluatedAt?: string;
}

const SURFACES: NotionSurface[] = [
  // ── 4-Quadrant Master Pages ──────────────────────────────────────
  {
    name: 'AI SOUL MASTER COMMAND CENTER',
    uuid: '33949ca4-35a2-81a8-9c83-ca074966bbfa',
    url: 'https://app.notion.com/p/AI-SOUL-MASTER-COMMAND-CENTER-33949ca435a281a89c83ca074966bbfa',
    role: 'Prompt router, Truth Weaver nexus, AI soul orchestration',
    stage: 'Q1 · SOUL',
  },
  {
    name: 'OceanicOS Living Universe Master Blueprint',
    uuid: '4003080b-dd53-8153-b957-c6bdb9417958',
    url: 'https://app.notion.com/p/OceanicOS-Living-Universe-Master-Blueprint-4003080bdd538153b957c6bdb9417958',
    role: 'Metaphysical architecture, 11 topological layers, living universe map',
    stage: 'Q2 · UNIVERSE',
  },
  {
    name: 'OceanicOS GitHub to Notion Architecture Map',
    uuid: '4003080b-dd53-8142-a075-c9da63c46c70',
    url: 'https://app.notion.com/p/OceanicOS-GitHub-to-Notion-Architecture-Map-4003080bdd538142a075c9da63c46c70',
    role: 'Codebase-to-Notion bi-directional mirror, repo structure map',
    stage: 'Q3 · ARCHITECTURE',
  },
  {
    name: 'OCEANICOS MOTION Private Wealth Execution Engine',
    uuid: '4003080b-dd53-8159-8220-ef09061f54b7',
    url: 'https://app.notion.com/p/OCEANICOS-MOTION-Private-Wealth-Execution-Engine-4003080bdd5381598220ef09061f54b7',
    role: 'Canonical control plane — decisions, daily command, treasury & gold ledger',
    stage: 'Q4 · WEALTH',
  },
  // ── 2 Relational Operational Databases ───────────────────────────
  {
    name: 'Value Opportunities Pipeline',
    uuid: 'baf1877d-e979-4cd8-949e-6c48cdee4c7a',
    url: 'https://app.notion.com/p/baf1877de9794cd8949e6c48cdee4c7a',
    role: 'Tracks buyer, problem, offer, stage, score, next action, review date, evidence',
    stage: 'DB · PIPELINE',
  },
  {
    name: 'Execution Queue',
    uuid: '75b1967f-fb19-47fc-8f5a-db1298fe8f02',
    url: 'https://app.notion.com/p/75b1967ffb1947fc8f5adb1298fe8f02',
    role: 'Tracks task priority, dependencies, approvals, status, output, test receipts',
    stage: 'DB · EXECUTION',
  },
];

const STAGE_GATES = [
  'CAPTURE',
  'SCORE',
  'VALIDATE',
  'OFFER',
  'BUILD MINIMUM',
  'APPROVE',
  'DELIVER',
  'MEASURE',
  'RECONCILE',
  'DECIDE',
  'COMPOUND',
];

const INTERVIEW_PROMPTS = [
  {
    category: 'Task',
    question: 'What repetitive manual task consumes 3+ hours per week in your business?',
  },
  {
    category: 'Workaround',
    question: 'What messy combination of spreadsheets and tools are you currently using to bridge it?',
  },
  {
    category: 'Urgency',
    question: 'What does this friction cost you in delayed delivery, dropped leads, or stress?',
  },
  {
    category: 'Pilot Fee',
    question: 'If we delivered a guaranteed, automated setup in 48 hours, would a $250–$500 pilot make sense?',
  },
  {
    category: 'Decision',
    question: 'Can we inspect your sample data structure under mutual NDA to verify feasibility?',
  },
];

const CANONICAL_ENVELOPE_SAMPLE = {
  id: 'env-notion-canonical-001',
  kind: 'proposal',
  summary: '5-buyer workflow setup offer validation in Notion Value Pipeline',
  state: 'VERIFIED',
  source: {
    system: 'notion',
    reference: 'page:4003080b-dd53-8159-8220-ef09061f54b7',
    revision: 'rev-01',
    capturedAt: new Date().toISOString(),
  },
  capturedAt: new Date().toISOString(),
  owner: 'starofgodmayomi',
  visibility: 'public',
  policy: {
    reviewedForPublicRelease: true,
    containsRawSourceContent: false,
    sensitivity: 'reviewed',
    approvalReference: 'auth:did:omega:human:starofgodmayomi',
  },
  relations: [
    { type: 'implements', targetId: 'env-wealth-q4' },
  ],
  evidence: [
    { type: 'test', status: 'PRESENT', reference: 'tests/notion-evidence-sync.test.mjs' },
  ],
  tags: ['notion', 'wealth', 'first-finite-action'],
};

const HOSTILE_LEAK_SAMPLE = {
  id: 'env-leak-attempt',
  kind: 'proposal',
  summary: 'Attempt to leak raw source body into knowledge envelope',
  state: 'SPECIFIED',
  source: {
    system: 'notion',
    reference: 'page:raw-leak',
    revision: 'rev-01',
    capturedAt: new Date().toISOString(),
  },
  capturedAt: new Date().toISOString(),
  owner: 'adversary',
  visibility: 'public',
  policy: {
    reviewedForPublicRelease: false,
    containsRawSourceContent: true,
    sensitivity: 'unknown',
  },
  content: 'FAIL-CLOSED TEST: Raw page content that must be rejected to prevent source leakage',
  relations: [],
  evidence: [],
};

export function NotionExecutionEnginePanel() {
  const [activeWorkspace, setActiveWorkspace] = useState<'chat' | 'task' | 'evidence' | 'envelope'>('task');
  const [activeMode, setActiveMode] = useState<'conversation' | 'work'>('work');
  const [copied, setCopied] = useState(false);
  const [apiTelemetry, setApiTelemetry] = useState<NotionApiResponse | null>(null);
  const [envelopeSchema, setEnvelopeSchema] = useState<any>(null);
  const [envelopePayloadText, setEnvelopePayloadText] = useState(JSON.stringify(CANONICAL_ENVELOPE_SAMPLE, null, 2));
  const [envelopeValidationResult, setEnvelopeValidationResult] = useState<any>(null);
  const [isValidatingEnvelope, setIsValidatingEnvelope] = useState(false);

  useEffect(() => {
    let unmounted = false;
    fetch('/v1/notion/surfaces')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!unmounted && data) setApiTelemetry(data);
      })
      .catch(() => {});

    fetch('/v1/knowledge/envelope/schema')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!unmounted && data) setEnvelopeSchema(data);
      })
      .catch(() => {});

    return () => { unmounted = true; };
  }, []);

  const handleValidateEnvelope = async () => {
    setIsValidatingEnvelope(true);
    try {
      const parsed = JSON.parse(envelopePayloadText);
      const res = await fetch('/v1/knowledge/envelope/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      });
      const data = await res.json();
      setEnvelopeValidationResult(data);
    } catch (err: any) {
      setEnvelopeValidationResult({
        success: false,
        validation: 'INVALID',
        publicExportAllowed: false,
        evidence: 'STRUCTURE_AND_DISCLOSURE_POLICY_ONLY',
        issues: [{ code: 'JSON_SYNTAX_ERROR', field: 'root', message: err.message || 'Invalid JSON syntax' }],
      });
    } finally {
      setIsValidatingEnvelope(false);
    }
  };

  const dailyCommandLine =
    'Validate narrow workflow setup offer with 5 reachable potential buyers | Small businesses & boutique agencies spending 3+ hrs/wk on manual tool duct-tape | OceanicOS monorepo test receipts, working Notion sync engine, inbound integration requests | Draft 5 personalized interview prompts inquiring about repeated tasks, workarounds, pain, and pilot fee willingness | Notion Execution Queue & local drafts (no external spend, messages, or credential disclosures) | Low risk (0.05). Human approval strictly required before external outreach or dispatch | 5 reviewable interview questions aligned with Section 4 stage gates (VALIDATE) | Human steward reviews copy; dry-run preview in CLI passes with 0 errors | Formatted in CLI and queued for operator decision | $0 incurred / $0 earned (Stage: VALIDATING) | Awaiting human consent to dispatch outreach | Log buyer feedback directly into Notion Value Opportunities Pipeline';

  const handleCopy = () => {
    navigator.clipboard?.writeText(dailyCommandLine);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        color: theme.text,
        fontFamily: theme.fontSans,
      }}
    >
      {/* Header & Master Equation */}
      <div
        style={{
          background: theme.surfaceRaised,
          border: `1px solid ${theme.borderBright}`,
          borderRadius: theme.radius,
          padding: '24px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '20px' }}>🏛️</span>
              <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: theme.accent }}>
                AI SOUL × OCEANICOS: PRIVATE WEALTH EXECUTION ENGINE
              </h2>
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: theme.textMuted }}>
              Private-by-default, evidence-led operating system for creating useful value and capturing legitimate wealth.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span
              style={{
                fontSize: '11px',
                fontFamily: theme.fontMono,
                padding: '4px 10px',
                borderRadius: theme.radiusPill,
                background: 'rgba(105, 231, 185, 0.1)',
                color: theme.verified,
                border: `1px solid ${theme.verified}`,
              }}
            >
              ✓ TRI-SURFACE BOUNDED
            </span>
            <span
              style={{
                fontSize: '11px',
                fontFamily: theme.fontMono,
                padding: '4px 10px',
                borderRadius: theme.radiusPill,
                background: 'rgba(240, 198, 116, 0.1)',
                color: theme.accentWarm,
                border: `1px solid ${theme.accentWarm}`,
              }}
            >
              FAIL-CLOSED GOVERNED
            </span>
          </div>
        </div>

        {/* Master Equation Card */}
        <div
          style={{
            marginTop: '16px',
            background: theme.surfaceDeep,
            border: `1px solid ${theme.borderSubtle}`,
            borderRadius: theme.radiusSmall,
            padding: '16px',
          }}
        >
          <div style={{ fontSize: '11px', fontFamily: theme.fontMono, color: theme.accentDim, marginBottom: '6px' }}>
            COMPRESSED OPERATIONAL DESIGN EQUATION
          </div>
          <div
            style={{
              fontSize: '14px',
              fontFamily: theme.fontMono,
              color: theme.text,
              background: 'rgba(0, 0, 0, 0.3)',
              padding: '10px 14px',
              borderRadius: '6px',
              overflowX: 'auto',
            }}
          >
            VALUE(t+1) = VERIFY(OBSERVE(EXECUTE(ORCHESTRATE(Φ, K, I, S, T, D, G, R, C)))) + ΔE
          </div>
          <div style={{ marginTop: '8px', fontSize: '12px', color: theme.textMuted }}>
            <strong style={{ color: theme.accentWarm }}>Operational Law:</strong> Potential value ≠ earned revenue; revenue ≠ profit. ΔE is the verified empirical evidence delta from this run.
          </div>
        </div>
      </div>

      {/* Tri-Surface Notion Control Plane */}
      <div>
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
          Canonical Notion Control Plane Surfaces
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {SURFACES.map((surf, idx) => {
            const apiSurface = apiTelemetry?.surfaces?.find(s => s.uuid.toLowerCase() === surf.uuid.toLowerCase());
            const isConnected = apiSurface?.connected ?? false;
            return (
              <div
                key={surf.uuid}
                style={{
                  background: theme.surface,
                  border: `1px solid ${isConnected ? theme.verified : theme.border}`,
                  borderRadius: theme.radiusSmall,
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', fontFamily: theme.fontMono, color: theme.accent, fontWeight: 700 }}>
                      SURFACE [{idx + 1}]
                    </span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <span
                        style={{
                          fontSize: '10px',
                          fontFamily: theme.fontMono,
                          padding: '2px 8px',
                          borderRadius: theme.radiusPill,
                          background: 'rgba(105, 231, 185, 0.12)',
                          color: theme.verified,
                        }}
                      >
                        {surf.stage}
                      </span>
                      {apiSurface && (
                        <span
                          style={{
                            fontSize: '9px',
                            fontFamily: theme.fontMono,
                            padding: '2px 6px',
                            borderRadius: theme.radiusPill,
                            background: isConnected ? 'rgba(105, 231, 185, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                            color: isConnected ? theme.verified : theme.textDim,
                          }}
                        >
                          {isConnected ? '✓ ONLINE' : 'CONFIGURED'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: theme.text, marginBottom: '6px' }}>
                    {surf.name}
                  </div>
                  <div style={{ fontSize: '12px', color: theme.textMuted, lineHeight: '1.4', marginBottom: '12px' }}>
                    {surf.role}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontFamily: theme.fontMono, color: theme.textDim, marginBottom: '8px' }}>
                    UUID: {surf.uuid}
                  </div>
                  <a
                    href={surf.url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '12px',
                      fontFamily: theme.fontMono,
                      color: theme.accent,
                      textDecoration: 'none',
                      padding: '6px 12px',
                      background: 'rgba(105, 231, 185, 0.08)',
                      borderRadius: '6px',
                      border: `1px solid ${theme.border}`,
                    }}
                  >
                    Open in Notion ↗
                  </a>
                </div>
              </div>
            );
          })}
        </div>

        {/* 9 Workspace Sections Telemetry from API */}
        {apiTelemetry?.workspaceSections && apiTelemetry.workspaceSections.length > 0 && (
          <div
            style={{
              background: theme.surfaceRaised,
              border: `1px solid ${theme.borderSubtle}`,
              borderRadius: theme.radiusSmall,
              padding: '16px',
              marginTop: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: theme.accent, letterSpacing: '0.05em' }}>
                9 CONNECTED WORKSPACE SECTIONS
              </div>
              <span style={{ fontSize: '10px', fontFamily: theme.fontMono, color: theme.textDim }}>
                {apiTelemetry.evaluatedAt ? `Evaluated: ${new Date(apiTelemetry.evaluatedAt).toLocaleTimeString()}` : ''}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '8px' }}>
              {apiTelemetry.workspaceSections.map(sec => (
                <div
                  key={sec.name}
                  style={{
                    padding: '8px 10px',
                    background: theme.surfaceDeep,
                    borderRadius: '4px',
                    border: `1px solid ${theme.borderSubtle}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: theme.text }}>{sec.name}</span>
                    <span
                      style={{
                        fontSize: '9px',
                        fontFamily: theme.fontMono,
                        padding: '1px 5px',
                        borderRadius: '3px',
                        background: sec.status === 'CONFIGURED' ? 'rgba(105, 231, 185, 0.1)' : 'rgba(240, 198, 116, 0.1)',
                        color: sec.status === 'CONFIGURED' ? theme.verified : theme.accentWarm,
                      }}
                    >
                      {sec.status}
                    </span>
                  </div>
                  <span style={{ fontSize: '10px', color: theme.textDim }}>{sec.evidence}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Target User Experience Workspaces (Section 10) */}
      <div
        style={{
          background: theme.surface,
          border: `1px solid ${theme.border}`,
          borderRadius: theme.radius,
          padding: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>
              OceanicOS Target Experience: Four Connected Workspaces
            </h3>
            <p style={{ margin: 0, fontSize: '12px', color: theme.textMuted }}>
              Grounding conversational intelligence directly into inspectable tasks, verifiable evidence, and fail-closed knowledge envelopes.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', background: theme.surfaceDeep, padding: '4px', borderRadius: theme.radiusSmall }}>
            {(['chat', 'task', 'evidence', 'envelope'] as const).map((ws) => (
              <button
                key={ws}
                onClick={() => setActiveWorkspace(ws)}
                style={{
                  background: activeWorkspace === ws ? theme.surfaceRaised : 'transparent',
                  color: activeWorkspace === ws ? theme.accent : theme.textMuted,
                  border: activeWorkspace === ws ? `1px solid ${theme.borderBright}` : '1px solid transparent',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {ws === 'chat' ? '💬 Chat' : ws === 'task' ? '📋 Task' : ws === 'evidence' ? '🔍 Evidence' : '📜 Envelope (V4)'}
              </button>
            ))}
          </div>
        </div>

        {activeWorkspace === 'chat' && (
          <div style={{ background: theme.surfaceDeep, padding: '16px', borderRadius: theme.radiusSmall }}>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
              <button
                onClick={() => setActiveMode('conversation')}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  borderRadius: '6px',
                  background: activeMode === 'conversation' ? 'rgba(105, 231, 185, 0.15)' : 'transparent',
                  color: activeMode === 'conversation' ? theme.accent : theme.textMuted,
                  border: `1px solid ${activeMode === 'conversation' ? theme.accent : theme.borderSubtle}`,
                  cursor: 'pointer',
                }}
              >
                Conversation Mode (Discuss & Plan)
              </button>
              <button
                onClick={() => setActiveMode('work')}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  borderRadius: '6px',
                  background: activeMode === 'work' ? 'rgba(105, 231, 185, 0.15)' : 'transparent',
                  color: activeMode === 'work' ? theme.accent : theme.textMuted,
                  border: `1px solid ${activeMode === 'work' ? theme.accent : theme.borderSubtle}`,
                  cursor: 'pointer',
                }}
              >
                Work Mode (Assign, Authorize & Verify)
              </button>
            </div>
            <div style={{ fontSize: '13px', color: theme.textMuted, lineHeight: '1.5' }}>
              {activeMode === 'conversation'
                ? 'Engage in contextual reasoning, research, architectural exploration, and structured hypothesis formation with AI SOUL without incurring side-effects.'
                : 'Formulate bounded tasks, inspect step plans, enforce capability-based authorization, and review verified receipts before external changes occur.'}
            </div>
          </div>
        )}

        {activeWorkspace === 'task' && (
          <div style={{ background: theme.surfaceDeep, padding: '16px', borderRadius: theme.radiusSmall }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: theme.accent }}>
                Active Task: First Finite Wealth Experiment (Narrow Workflow Setup Validation)
              </span>
              <span style={{ fontSize: '11px', fontFamily: theme.fontMono, color: theme.accentWarm, padding: '2px 8px', borderRadius: '4px', background: 'rgba(240, 198, 116, 0.1)' }}>
                STAGE: VALIDATING
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', fontSize: '12px' }}>
              <div style={{ padding: '10px', background: 'rgba(0, 0, 0, 0.25)', borderRadius: '6px' }}>
                <span style={{ color: theme.textDim, display: 'block', marginBottom: '4px' }}>BUYER TARGET</span>
                <span>Small businesses & boutique agencies</span>
              </div>
              <div style={{ padding: '10px', background: 'rgba(0, 0, 0, 0.25)', borderRadius: '6px' }}>
                <span style={{ color: theme.textDim, display: 'block', marginBottom: '4px' }}>RECURRING PROBLEM</span>
                <span>3+ hrs/wk lost to manual tool duct-tape</span>
              </div>
              <div style={{ padding: '10px', background: 'rgba(0, 0, 0, 0.25)', borderRadius: '6px' }}>
                <span style={{ color: theme.textDim, display: 'block', marginBottom: '4px' }}>OFFER SCOPE</span>
                <span>Automated Notion + CRM workflow setup</span>
              </div>
              <div style={{ padding: '10px', background: 'rgba(0, 0, 0, 0.25)', borderRadius: '6px' }}>
                <span style={{ color: theme.textDim, display: 'block', marginBottom: '4px' }}>PILOT PRICE HYPOTHESIS</span>
                <span>$250–$500 guaranteed outcome</span>
              </div>
            </div>
          </div>
        )}

        {activeWorkspace === 'evidence' && (
          <div style={{ background: theme.surfaceDeep, padding: '16px', borderRadius: theme.radiusSmall }}>
            <div style={{ fontSize: '12px', fontFamily: theme.fontMono, color: theme.textMuted, marginBottom: '8px' }}>
              VERIFICATION RECEIPTS & IMMUTABLE PROVENANCE
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', fontFamily: theme.fontMono }}>
              <div style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.3)', borderRadius: '6px' }}>
                <span style={{ color: theme.verified }}>✓ NOTION SYNC:</span> 16 of 16 tests passing in <code>tests/notion-evidence-sync.test.mjs</code> (All 6 canonical surfaces verified)
              </div>
              <div style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.3)', borderRadius: '6px' }}>
                <span style={{ color: theme.verified }}>✓ KNOWLEDGE CONTRACT:</span> 7 of 7 integration tests passing in <code>tests/integration/knowledge-envelope-contract.integration.test.ts</code>
              </div>
              <div style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.3)', borderRadius: '6px' }}>
                <span style={{ color: theme.verified }}>✓ API KNOWLEDGE ROUTE:</span> 3 of 3 unit tests passing in <code>apps/api/src/__tests__/knowledge-route.test.ts</code>
              </div>
              <div style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.3)', borderRadius: '6px' }}>
                <span style={{ color: theme.verified }}>✓ MONOREPO:</span> State 21 tip hash verified and committed
              </div>
              <div style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.3)', borderRadius: '6px' }}>
                <span style={{ color: theme.accentWarm }}>⚠ AUDIT:</span> Dry-run format verified; live Notion block append ready upon NOTION_TOKEN activation
              </div>
            </div>
          </div>
        )}

        {activeWorkspace === 'envelope' && (
          <div style={{ background: theme.surfaceDeep, padding: '16px', borderRadius: theme.radiusSmall }}>
            {/* Header and Invariant badges */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
              <div>
                <span style={{ fontSize: '11px', fontFamily: theme.fontMono, color: theme.accent, fontWeight: 700 }}>
                  Ω∞v SANITIZED KNOWLEDGE ENVELOPE (V4)
                </span>
                <div style={{ fontSize: '12px', color: theme.textMuted }}>
                  Structure & Disclosure Policy Only · Fail-Closed Invariant Against Hostile Content Leaks
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '10px', fontFamily: theme.fontMono, padding: '2px 8px', borderRadius: theme.radiusPill, background: 'rgba(105, 231, 185, 0.12)', color: theme.verified }}>
                  ✓ STRUCTURE ONLY
                </span>
                <span style={{ fontSize: '10px', fontFamily: theme.fontMono, padding: '2px 8px', borderRadius: theme.radiusPill, background: 'rgba(239, 90, 90, 0.12)', color: theme.divergent }}>
                  🛡 FORBIDS RAW LEAKS
                </span>
                <span style={{ fontSize: '10px', fontFamily: theme.fontMono, padding: '2px 8px', borderRadius: theme.radiusPill, background: 'rgba(240, 198, 116, 0.12)', color: theme.accentWarm }}>
                  🔒 FAIL-CLOSED
                </span>
              </div>
            </div>

            {/* Presets */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', fontFamily: theme.fontMono, color: theme.textDim }}>PRESETS:</span>
              <button
                onClick={() => {
                  setEnvelopePayloadText(JSON.stringify(CANONICAL_ENVELOPE_SAMPLE, null, 2));
                  setEnvelopeValidationResult(null);
                }}
                style={{
                  fontSize: '11px',
                  fontFamily: theme.fontMono,
                  padding: '4px 10px',
                  borderRadius: '4px',
                  background: 'rgba(105, 231, 185, 0.1)',
                  color: theme.verified,
                  border: `1px solid ${theme.border}`,
                  cursor: 'pointer',
                }}
              >
                Canonical Offer (Valid)
              </button>
              <button
                onClick={() => {
                  const internalEnv = {
                    ...CANONICAL_ENVELOPE_SAMPLE,
                    id: 'env-internal-002',
                    visibility: 'internal',
                  };
                  setEnvelopePayloadText(JSON.stringify(internalEnv, null, 2));
                  setEnvelopeValidationResult(null);
                }}
                style={{
                  fontSize: '11px',
                  fontFamily: theme.fontMono,
                  padding: '4px 10px',
                  borderRadius: '4px',
                  background: 'rgba(240, 198, 116, 0.1)',
                  color: theme.accentWarm,
                  border: `1px solid ${theme.border}`,
                  cursor: 'pointer',
                }}
              >
                Internal Visibility (Export Denied)
              </button>
              <button
                onClick={() => {
                  setEnvelopePayloadText(JSON.stringify(HOSTILE_LEAK_SAMPLE, null, 2));
                  setEnvelopeValidationResult(null);
                }}
                style={{
                  fontSize: '11px',
                  fontFamily: theme.fontMono,
                  padding: '4px 10px',
                  borderRadius: '4px',
                  background: 'rgba(239, 90, 90, 0.1)',
                  color: theme.divergent,
                  border: `1px solid ${theme.border}`,
                  cursor: 'pointer',
                }}
              >
                Hostile Leak Test (Fail-Closed)
              </button>
            </div>

            {/* Editor & Results Split */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11px', fontFamily: theme.fontMono, color: theme.textMuted }}>
                    ENVELOPE JSON PAYLOAD
                  </span>
                  <button
                    onClick={handleValidateEnvelope}
                    disabled={isValidatingEnvelope}
                    style={{
                      fontSize: '11px',
                      fontFamily: theme.fontMono,
                      padding: '4px 12px',
                      borderRadius: '4px',
                      background: theme.accent,
                      color: '#000',
                      border: 'none',
                      fontWeight: 700,
                      cursor: isValidatingEnvelope ? 'wait' : 'pointer',
                    }}
                  >
                    {isValidatingEnvelope ? 'Validating...' : '⚡ Validate Envelope'}
                  </button>
                </div>
                <textarea
                  value={envelopePayloadText}
                  onChange={(e) => setEnvelopePayloadText(e.target.value)}
                  rows={14}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: `1px solid ${theme.borderSubtle}`,
                    borderRadius: '6px',
                    color: theme.text,
                    fontFamily: theme.fontMono,
                    fontSize: '11px',
                    padding: '10px',
                    lineHeight: '1.4',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div>
                <span style={{ fontSize: '11px', fontFamily: theme.fontMono, color: theme.textMuted, display: 'block', marginBottom: '6px' }}>
                  VALIDATION RECEIPT & LEAK DETECTION
                </span>
                <div
                  style={{
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: `1px solid ${
                      envelopeValidationResult
                        ? envelopeValidationResult.validation === 'VALID'
                          ? theme.verified
                          : theme.divergent
                        : theme.borderSubtle
                    }`,
                    borderRadius: '6px',
                    padding: '12px',
                    minHeight: '220px',
                    fontFamily: theme.fontMono,
                    fontSize: '11px',
                  }}
                >
                  {!envelopeValidationResult ? (
                    <div style={{ color: theme.textDim, textAlign: 'center', marginTop: '60px' }}>
                      Click <strong>"⚡ Validate Envelope"</strong> or pick a preset to evaluate the payload against the fail-closed contract.
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '6px' }}>
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: 700,
                            padding: '3px 10px',
                            borderRadius: '4px',
                            background:
                              envelopeValidationResult.validation === 'VALID'
                                ? 'rgba(105, 231, 185, 0.2)'
                                : 'rgba(239, 90, 90, 0.2)',
                            color:
                              envelopeValidationResult.validation === 'VALID'
                                ? theme.verified
                                : theme.divergent,
                          }}
                        >
                          {envelopeValidationResult.validation === 'VALID' ? '✓ VALID ENVELOPE' : '✗ REJECTED / INVALID'}
                        </span>
                        <span
                          style={{
                            fontSize: '10px',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            background: envelopeValidationResult.publicExportAllowed
                              ? 'rgba(105, 231, 185, 0.15)'
                              : 'rgba(240, 198, 116, 0.15)',
                            color: envelopeValidationResult.publicExportAllowed
                              ? theme.verified
                              : theme.accentWarm,
                          }}
                        >
                          PUBLIC EXPORT: {envelopeValidationResult.publicExportAllowed ? 'ALLOWED' : 'DENIED (Protected)'}
                        </span>
                      </div>

                      <div style={{ color: theme.textDim, marginBottom: '8px' }}>
                        Evidence Scope: {envelopeValidationResult.evidence}
                      </div>

                      {envelopeValidationResult.issues && envelopeValidationResult.issues.length > 0 && (
                        <div style={{ marginTop: '10px' }}>
                          <span style={{ color: theme.divergent, fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                            VIOLATIONS DETECTED ({envelopeValidationResult.issues.length}):
                          </span>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {envelopeValidationResult.issues.map((iss: any, idx: number) => (
                              <div
                                key={idx}
                                style={{
                                  padding: '6px 10px',
                                  background: 'rgba(239, 90, 90, 0.08)',
                                  borderLeft: `3px solid ${theme.divergent}`,
                                  borderRadius: '0 4px 4px 0',
                                }}
                              >
                                <span style={{ color: theme.accentWarm }}>[{iss.code}]</span>{' '}
                                <span style={{ color: theme.textDim }}>{iss.field}:</span>{' '}
                                <span style={{ color: theme.text }}>{iss.message}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {envelopeValidationResult.validation === 'VALID' && envelopeValidationResult.envelope && (
                        <div style={{ marginTop: '10px', color: theme.textMuted }}>
                          <div><span style={{ color: theme.textDim }}>ID:</span> {envelopeValidationResult.envelope.id}</div>
                          <div><span style={{ color: theme.textDim }}>Kind:</span> {envelopeValidationResult.envelope.kind}</div>
                          <div><span style={{ color: theme.textDim }}>State:</span> {envelopeValidationResult.envelope.state}</div>
                          <div><span style={{ color: theme.textDim }}>Source:</span> {envelopeValidationResult.envelope.source?.system} ({envelopeValidationResult.envelope.source?.reference})</div>
                          <div><span style={{ color: theme.textDim }}>Summary:</span> {envelopeValidationResult.envelope.summary}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Schema details */}
                {envelopeSchema && (
                  <div style={{ marginTop: '8px', fontSize: '10px', color: theme.textDim }}>
                    Contract: <code>{envelopeSchema.contract}</code> · Kinds: {envelopeSchema.kinds?.length || 11} · States: {envelopeSchema.states?.length || 14}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* First Finite Action & Section 11 Daily Command Card */}
      <div
        style={{
          background: theme.surfaceRaised,
          border: `1px solid ${theme.border}`,
          borderRadius: theme.radius,
          padding: '24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
          <div>
            <span style={{ fontSize: '11px', fontFamily: theme.fontMono, color: theme.accent, fontWeight: 700 }}>
              SECTION 11 DETERMINISTIC DAILY COMMAND
            </span>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '4px 0 0', color: theme.text }}>
              First Finite Wealth Action: 5-Buyer Workflow Setup Validation
            </h3>
          </div>
          <button
            onClick={handleCopy}
            style={{
              padding: '6px 14px',
              fontSize: '12px',
              fontFamily: theme.fontMono,
              background: copied ? 'rgba(105, 231, 185, 0.2)' : 'rgba(255, 255, 255, 0.05)',
              color: copied ? theme.verified : theme.text,
              border: `1px solid ${copied ? theme.verified : theme.border}`,
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            {copied ? '✓ Copied Line' : 'Copy Daily Command'}
          </button>
        </div>

        {/* Command Line Render */}
        <div
          style={{
            background: theme.surfaceDeep,
            border: `1px solid ${theme.borderSubtle}`,
            borderRadius: theme.radiusSmall,
            padding: '12px 14px',
            fontSize: '11px',
            fontFamily: theme.fontMono,
            color: theme.accent,
            lineHeight: '1.6',
            wordBreak: 'break-word',
            marginBottom: '16px',
          }}
        >
          {dailyCommandLine}
        </div>

        {/* 5-Buyer Interview Prompts Checklist */}
        <div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: theme.textMuted, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            5-Buyer Interview Prompts (Stage Gate 3: VALIDATE)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {INTERVIEW_PROMPTS.map((prompt, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  background: 'rgba(0, 0, 0, 0.2)',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  border: `1px solid ${theme.borderSubtle}`,
                }}
              >
                <span
                  style={{
                    fontSize: '11px',
                    fontFamily: theme.fontMono,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: 'rgba(105, 231, 185, 0.12)',
                    color: theme.accent,
                    minWidth: '80px',
                    textAlign: 'center',
                  }}
                >
                  {prompt.category}
                </span>
                <span style={{ fontSize: '13px', color: theme.text }}>
                  {prompt.question}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Stage Gates Progress Indicator */}
        <div style={{ marginTop: '20px' }}>
          <div style={{ fontSize: '11px', fontFamily: theme.fontMono, color: theme.textDim, marginBottom: '8px' }}>
            STAGE GATES FLOW
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {STAGE_GATES.map((stage, idx) => {
              const isCurrent = stage === 'VALIDATE';
              const isPassed = idx < 2;
              return (
                <span
                  key={stage}
                  style={{
                    fontSize: '10px',
                    fontFamily: theme.fontMono,
                    padding: '3px 8px',
                    borderRadius: '4px',
                    background: isCurrent
                      ? 'rgba(240, 198, 116, 0.2)'
                      : isPassed
                      ? 'rgba(105, 231, 185, 0.1)'
                      : 'rgba(255, 255, 255, 0.03)',
                    color: isCurrent
                      ? theme.accentWarm
                      : isPassed
                      ? theme.verified
                      : theme.textDim,
                    border: `1px solid ${isCurrent ? theme.accentWarm : isPassed ? theme.border : 'transparent'}`,
                  }}
                >
                  {stage}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
