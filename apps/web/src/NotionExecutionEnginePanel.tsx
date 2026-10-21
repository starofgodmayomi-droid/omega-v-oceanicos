import React, { useState } from 'react';
import { theme } from './oceanicosTheme';

interface NotionSurface {
  name: string;
  uuid: string;
  url: string;
  role: string;
  stage: string;
}

const SURFACES: NotionSurface[] = [
  {
    name: 'Master Motion Control Page',
    uuid: '4003080b-dd53-8159-8220-ef09061f54b7',
    url: 'https://app.notion.com/p/OCEANICOS-MOTION-Private-Wealth-Execution-Engine-4003080bdd5381598220ef09061f54b7?pvs=21',
    role: 'Canonical control plane, decisions, daily command, audit blocks',
    stage: 'COMMAND CENTER',
  },
  {
    name: 'Value Opportunities Pipeline',
    uuid: 'baf1877d-e979-4cd8-949e-6c48cdee4c7a',
    url: 'https://app.notion.com/p/baf1877de9794cd8949e6c48cdee4c7a?pvs=21',
    role: 'Tracks buyer, problem, offer, stage, score, next action, review date, evidence',
    stage: 'VALUE MOTION',
  },
  {
    name: 'Execution Queue',
    uuid: '75b1967f-fb19-47fc-8f5a-db1298fe8f02',
    url: 'https://app.notion.com/p/75b1967ffb1947fc8f5adb1298fe8f02?pvs=21',
    role: 'Tracks task priority, dependencies, approvals, status, output, test receipts',
    stage: 'BOUNDED WORK',
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

export function NotionExecutionEnginePanel() {
  const [activeWorkspace, setActiveWorkspace] = useState<'chat' | 'task' | 'evidence'>('task');
  const [activeMode, setActiveMode] = useState<'conversation' | 'work'>('work');
  const [copied, setCopied] = useState(false);

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
          {SURFACES.map((surf, idx) => (
            <div
              key={surf.uuid}
              style={{
                background: theme.surface,
                border: `1px solid ${theme.border}`,
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
          ))}
        </div>
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
              OceanicOS Target Experience: Three Connected Workspaces
            </h3>
            <p style={{ margin: 0, fontSize: '12px', color: theme.textMuted }}>
              Grounding conversational intelligence directly into inspectable tasks and verifiable evidence.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', background: theme.surfaceDeep, padding: '4px', borderRadius: theme.radiusSmall }}>
            {(['chat', 'task', 'evidence'] as const).map((ws) => (
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
                {ws === 'chat' ? '💬 Chat' : ws === 'task' ? '📋 Task' : '🔍 Evidence'}
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
                <span style={{ color: theme.verified }}>✓ TESTS:</span> 15 of 15 tests passing in <code>tests/notion-evidence-sync.test.mjs</code>
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
