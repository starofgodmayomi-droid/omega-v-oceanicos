import React, { useState, useEffect, useCallback } from 'react';
import { theme } from './oceanicosTheme';

/* ─────────── Types ─────────── */

interface MaxEquationMetadata {
  contract: string;
  governingEquation: string;
  optimizationFormula: string;
  priorityScoreFormula: string;
  feasibleSetRules: string[];
  tieBreakerHierarchy: string[];
  epsilon: number;
}

interface ScoredCandidate {
  id: string;
  intent: string;
  valueEstimate: number;
  evidenceQuality: number;
  riskEstimate: number;
  costEstimate: number;
  priorityScore: number;
  eligible: boolean;
  verdict: 'ALLOW' | 'DENY' | 'REVIEW';
  denialReasons: string[];
  rank: number;
}

interface OptimizationResult {
  contract: string;
  governingEquation: string;
  optimizationFormula: string;
  totalCandidates: number;
  eligibleCandidatesCount: number;
  optimalSlice: ScoredCandidate | null;
  rankedSlices: ScoredCandidate[];
  epsilon: number;
  evaluatedAt: string;
  evaluationHash: string;
}

/* ─────────── API helpers ─────────── */

const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' && window.location.port !== '5000'
    ? `http://${window.location.hostname}:5000`
    : '')
).replace(/\/$/, '');

function apiUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${API_BASE_URL}${path}`;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = apiUrl(path);
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (primaryErr: any) {
    try {
      response = await fetch(path, init);
    } catch {
      throw primaryErr;
    }
  }
  const text = await response.text();
  let payload: any;
  try { payload = text ? JSON.parse(text) : null; } catch { throw new Error(`Invalid JSON (${response.status})`); }
  if (!response.ok) throw new Error(payload?.error || `Request failed (${response.status})`);
  return payload as T;
}

/* ─────────── Preset candidate templates ─────────── */
const PRESET_CANDIDATES = [
  {
    id: 'frontend-max-panel',
    intent: 'Add Max Equation dashboard panel to web surface',
    valueEstimate: 8,
    evidenceQuality: 0.9,
    riskEstimate: 1,
    costEstimate: 2,
    authority: true,
    policy: true,
    scoped: true,
    acceptanceCriteria: ['Panel renders live data', 'Optimization results display correctly'],
  },
  {
    id: 'cli-attest-upgrade',
    intent: 'Upgrade CLI attest subcommand with signing key validation',
    valueEstimate: 6,
    evidenceQuality: 0.7,
    riskEstimate: 2,
    costEstimate: 3,
    authority: true,
    policy: true,
    scoped: true,
    acceptanceCriteria: ['CLI attest reports signing key status', 'Tests pass'],
  },
  {
    id: 'unscoped-example',
    intent: 'Rewrite entire API surface (unbounded scope example)',
    valueEstimate: 10,
    evidenceQuality: 0.4,
    riskEstimate: 9,
    costEstimate: 8,
    authority: true,
    policy: true,
    scoped: false,
    acceptanceCriteria: [],
  },
];

/* ─────────── Component ─────────── */

export interface MaxEquationPanelProps {
  latestTransition?: any | null;
}

export function MaxEquationPanel({ latestTransition }: MaxEquationPanelProps = {}) {
  const [metadata, setMetadata] = useState<MaxEquationMetadata | null>(null);
  const [metaLoading, setMetaLoading] = useState(false);
  const [metaError, setMetaError] = useState<string | null>(null);

  const [optimResult, setOptimResult] = useState<OptimizationResult | null>(null);
  const [optimLoading, setOptimLoading] = useState(false);
  const [optimError, setOptimError] = useState<string | null>(null);

  const [attestReceipt, setAttestReceipt] = useState<any | null>(null);
  const [attestLoading, setAttestLoading] = useState(false);
  const [attestError, setAttestError] = useState<string | null>(null);

  const [kaiReceipt, setKaiReceipt] = useState<any | null>(null);
  const [kaiLoading, setKaiLoading] = useState(false);
  const [kaiError, setKaiError] = useState<string | null>(null);

  const [psiA, setPsiA] = useState<string>('1, 2, 3, 4');
  const [psiB, setPsiB] = useState<string>('1, 1, 1, 1');
  const [psiC, setPsiC] = useState<number>(-10);
  const [psiS, setPsiS] = useState<number>(1);
  const [psiIntent, setPsiIntent] = useState<string>('MAX_TOTAL_CONVERGENCE_SINGULARITY');
  const [psiReality, setPsiReality] = useState<string>('MAX_TOTAL_CONVERGENCE_SINGULARITY');
  const [psiResult, setPsiResult] = useState<any | null>(null);
  const [psiLoading, setPsiLoading] = useState(false);
  const [psiError, setPsiError] = useState<string | null>(null);

  // Visual Singularity state
  const [visualMode, setVisualMode] = useState<'fluid' | 'crystalline'>('fluid');
  const [visualExpanded, setVisualExpanded] = useState<boolean>(true);

  // Recursive State Update Loop (O_{t+1}) state
  const [stepIntent, setStepIntent] = useState<string>('V1111_FLUID_COMPUTING_SINGULARITY');
  const [stepReality, setStepReality] = useState<string>('V1111_FLUID_COMPUTING_SINGULARITY');
  const [stepAuthority, setStepAuthority] = useState<boolean>(true);
  const [stepResult, setStepResult] = useState<any | null>(null);
  const [stepLoading, setStepLoading] = useState<boolean>(false);
  const [stepError, setStepError] = useState<string | null>(null);

  const fetchMetadata = useCallback(async () => {
    setMetaLoading(true);
    setMetaError(null);
    try {
      const data = await apiFetch<{ success: boolean; metadata: MaxEquationMetadata }>('/v1/verification/max-equation');
      if (data.success && data.metadata) setMetadata(data.metadata);
    } catch (err: any) {
      setMetaError(err.message);
    } finally {
      setMetaLoading(false);
    }
  }, []);

  const runOptimization = useCallback(async () => {
    setOptimLoading(true);
    setOptimError(null);
    setAttestReceipt(null);
    setKaiReceipt(null);
    try {
      const data = await apiFetch<{ success: boolean; result: OptimizationResult }>('/v1/verification/optimize-slice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidates: PRESET_CANDIDATES }),
      });
      if (data.success && data.result) setOptimResult(data.result);
    } catch (err: any) {
      setOptimError(err.message);
    } finally {
      setOptimLoading(false);
    }
  }, []);

  const handleAttestOptimalSlice = useCallback(async () => {
    if (!optimResult?.optimalSlice) return;
    setAttestLoading(true);
    setAttestError(null);
    try {
      const data = await apiFetch<any>('/v1/attest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (data.success && data.attestation) {
        setAttestReceipt(data.attestation);
      } else {
        throw new Error(data.error || 'Attestation generation failed');
      }
    } catch (err: any) {
      setAttestError(err.message);
    } finally {
      setAttestLoading(false);
    }
  }, [optimResult]);

  const handleCommitToKai = useCallback(async () => {
    if (!optimResult?.optimalSlice) return;
    setKaiLoading(true);
    setKaiError(null);
    try {
      const data = await apiFetch<any>('/v1/kai/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          distinction: 'OBSERVED',
          statement: `Max Equation optimal transition selected: ${optimResult.optimalSlice.intent}`,
          subject: optimResult.optimalSlice.id,
          source: 'oceanicos:max-equation',
          author: 'did:omega:human:starofgodmayomi',
          policyOrAuthority: 'AUTHORITY_VERIFIED',
          evidenceRef: optimResult.evaluationHash,
          metadata: {
            priorityScore: optimResult.optimalSlice.priorityScore,
            evaluationHash: optimResult.evaluationHash,
            rank: optimResult.optimalSlice.rank,
            valueEstimate: optimResult.optimalSlice.valueEstimate,
            evidenceQuality: optimResult.optimalSlice.evidenceQuality,
          },
        }),
      });
      if (data.success && data.record) {
        setKaiReceipt(data.record);
      } else {
        throw new Error(data.error || 'KAI recording failed');
      }
    } catch (err: any) {
      setKaiError(err.message);
    } finally {
      setKaiLoading(false);
    }
  }, [optimResult]);

  const handleEvaluatePsi = useCallback(async () => {
    setPsiLoading(true);
    setPsiError(null);
    try {
      const A = psiA.split(',').map((x) => Number(x.trim())).filter((x) => !isNaN(x));
      const B = psiB.split(',').map((x) => Number(x.trim())).filter((x) => !isNaN(x));
      const data = await apiFetch<any>('/v1/verification/convergence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          A,
          B,
          C: Number(psiC),
          S: Number(psiS),
          delta: { intent: psiIntent, reality: psiReality },
        }),
      });
      if (data.success && data.evaluation) {
        setPsiResult(data.evaluation);
      } else {
        throw new Error(data.error || 'Convergence evaluation failed');
      }
    } catch (err: any) {
      setPsiError(err.message);
    } finally {
      setPsiLoading(false);
    }
  }, [psiA, psiB, psiC, psiS, psiIntent, psiReality]);

  const handleExecuteStep = useCallback(async () => {
    setStepLoading(true);
    setStepError(null);
    try {
      const data = await apiFetch<any>('/v1/verification/step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidate: {
            id: `slice-${Date.now()}`,
            intent: stepIntent,
            valueEstimate: 99,
            evidenceQuality: 1.0,
            riskEstimate: 1,
            costEstimate: 2,
            authority: stepAuthority,
            policy: true,
            scoped: true,
            acceptanceCriteria: ['Continuous state update verifies with zero entropy loss'],
          },
          observedReality: stepReality,
        }),
      });
      if (data.success && data.step) {
        setStepResult(data.step);
      } else {
        throw new Error(data.error || 'Recursive step failed');
      }
    } catch (err: any) {
      setStepError(err.message);
    } finally {
      setStepLoading(false);
    }
  }, [stepIntent, stepReality, stepAuthority]);

  useEffect(() => {
    fetchMetadata();
  }, [fetchMetadata]);

  useEffect(() => {
    if (latestTransition?.step) {
      setStepResult(latestTransition.step);
    }
  }, [latestTransition]);

  const verdictColor = (v: string) =>
    v === 'ALLOW' ? '#00f5a0' : v === 'DENY' ? '#ef4444' : '#f59e0b';

  const scoreBarWidth = (score: number, max: number) =>
    max > 0 ? `${Math.min(100, (score / max) * 100)}%` : '0%';

  const maxScore = optimResult?.rankedSlices
    ? Math.max(1, ...optimResult.rankedSlices.map((s) => s.priorityScore))
    : 1;

  return (
    <div
      style={{
        padding: '20px',
        background: 'linear-gradient(145deg, rgba(0, 12, 28, 0.95) 0%, rgba(2, 24, 48, 0.92) 50%, rgba(0, 8, 20, 0.95) 100%)',
        border: '1px solid rgba(56, 189, 248, 0.25)',
        borderRadius: theme.radius,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Top glow line */}
      <div
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, height: '2px',
          background: 'linear-gradient(90deg, transparent 0%, rgba(0, 245, 160, 0.7) 30%, rgba(56, 189, 248, 0.7) 70%, transparent 100%)',
        }}
      />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#00f5a0', letterSpacing: '0.8px' }}>
            ⚡ MAX EQUATION — OPTIMIZATION ENGINE
          </span>
          {metadata && (
            <span style={{
              fontSize: '9px',
              padding: '2px 8px',
              borderRadius: '4px',
              background: 'rgba(0, 245, 160, 0.12)',
              border: '1px solid rgba(0, 245, 160, 0.3)',
              color: '#00f5a0',
              fontWeight: 600,
            }}>
              ✓ {metadata.contract}
            </span>
          )}
        </div>
        <button
          onClick={fetchMetadata}
          disabled={metaLoading}
          style={{
            padding: '4px 12px',
            borderRadius: theme.radiusPill,
            border: '1px solid rgba(56, 189, 248, 0.3)',
            background: 'rgba(56, 189, 248, 0.08)',
            color: '#38bdf8',
            fontSize: '10px',
            fontWeight: 600,
            cursor: metaLoading ? 'wait' : 'pointer',
            fontFamily: theme.fontSans,
          }}
        >
          {metaLoading ? '⏳' : '↻'} Refresh
        </button>
      </div>

      {metaError && (
        <div style={{
          padding: '8px 12px',
          borderRadius: '6px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#ef4444',
          fontSize: '11px',
          marginBottom: '12px',
        }}>
          ⚠ {metaError}
        </div>
      )}

      {/* Governing Equations */}
      {metadata && (
        <div style={{
          marginBottom: '16px',
          padding: '12px 14px',
          background: 'rgba(0, 245, 160, 0.04)',
          border: '1px solid rgba(0, 245, 160, 0.12)',
          borderRadius: '8px',
        }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#38bdf8', letterSpacing: '0.6px', marginBottom: '8px' }}>
            GOVERNING EQUATIONS
          </div>
          <div style={{ fontFamily: theme.fontMono, fontSize: '11px', color: '#e2e8f0', lineHeight: 1.8 }}>
            <div>📐 {metadata.governingEquation}</div>
            <div>📊 {metadata.optimizationFormula}</div>
            <div style={{ fontSize: '10px', color: '#94a3b8' }}>🔬 {metadata.priorityScoreFormula}</div>
          </div>
          <div style={{ marginTop: '10px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {metadata.feasibleSetRules.map((rule, i) => (
              <span
                key={i}
                style={{
                  padding: '2px 8px',
                  fontSize: '8px',
                  fontWeight: 600,
                  color: '#00f5a0',
                  background: 'rgba(0, 245, 160, 0.06)',
                  border: '1px solid rgba(0, 245, 160, 0.15)',
                  borderRadius: '4px',
                  fontFamily: theme.fontMono,
                }}
              >
                {rule.split(':')[0]}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Optimize Button */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', alignItems: 'center' }}>
        <button
          onClick={runOptimization}
          disabled={optimLoading}
          style={{
            padding: '10px 24px',
            borderRadius: theme.radiusPill,
            border: 'none',
            background: optimLoading
              ? 'rgba(0, 245, 160, 0.2)'
              : 'linear-gradient(135deg, #00f5a0 0%, #00d2ff 100%)',
            color: optimLoading ? '#64748b' : '#020d18',
            fontFamily: theme.fontSans,
            fontSize: '13px',
            fontWeight: 700,
            cursor: optimLoading ? 'wait' : 'pointer',
            boxShadow: optimLoading ? 'none' : '0 0 16px rgba(0, 245, 160, 0.3)',
            transition: 'all 0.2s ease',
          }}
        >
          {optimLoading ? '⏳ Optimizing...' : '⚡ Run Optimization (3 Candidate Slices)'}
        </button>
        {optimResult && (
          <span style={{ fontSize: '10px', color: '#64748b', fontFamily: theme.fontMono }}>
            {optimResult.eligibleCandidatesCount}/{optimResult.totalCandidates} eligible · hash:{optimResult.evaluationHash.slice(0, 10)}…
          </span>
        )}
      </div>

      {optimError && (
        <div style={{
          padding: '8px 12px',
          borderRadius: '6px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#ef4444',
          fontSize: '11px',
          marginBottom: '12px',
        }}>
          ⚠ {optimError}
        </div>
      )}

      {/* Optimal Slice Highlight */}
      {optimResult?.optimalSlice && (
        <div style={{
          marginBottom: '14px',
          padding: '14px 16px',
          background: 'linear-gradient(135deg, rgba(0, 245, 160, 0.08) 0%, rgba(0, 210, 255, 0.08) 100%)',
          border: '1.5px solid rgba(0, 245, 160, 0.4)',
          borderRadius: '10px',
          boxShadow: '0 0 20px rgba(0, 245, 160, 0.1)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '16px' }}>🏆</span>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#00f5a0', letterSpacing: '0.5px' }}>
              OPTIMAL Δ* — NEXT BEST VERIFIED TRANSITION
            </span>
          </div>
          <div style={{ fontSize: '13px', color: '#f8fafc', fontWeight: 600, marginBottom: '6px' }}>
            {optimResult.optimalSlice.intent}
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '11px', fontFamily: theme.fontMono }}>
            <span style={{ color: '#00f5a0' }}>
              Score: {optimResult.optimalSlice.priorityScore.toFixed(4)}
            </span>
            <span style={{ color: '#38bdf8' }}>
              V̂={optimResult.optimalSlice.valueEstimate}
            </span>
            <span style={{ color: '#a78bfa' }}>
              Q_E={optimResult.optimalSlice.evidenceQuality}
            </span>
            <span style={{ color: '#f59e0b' }}>
              R̂={optimResult.optimalSlice.riskEstimate}
            </span>
            <span style={{ color: '#94a3b8' }}>
              Ĉ={optimResult.optimalSlice.costEstimate}
            </span>
          </div>

          {/* Action Row: Attest & KAI Recording */}
          <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              onClick={handleAttestOptimalSlice}
              disabled={attestLoading}
              style={{
                padding: '6px 14px',
                borderRadius: theme.radiusPill,
                border: '1px solid rgba(0, 245, 160, 0.4)',
                background: attestLoading ? 'rgba(0, 245, 160, 0.1)' : 'rgba(0, 245, 160, 0.2)',
                color: '#00f5a0',
                fontSize: '11px',
                fontWeight: 600,
                cursor: attestLoading ? 'wait' : 'pointer',
                fontFamily: theme.fontSans,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>{attestLoading ? '⏳' : '📜'}</span>
              <span>{attestLoading ? 'Attesting...' : 'Attest Slice (Ω∞v Attester)'}</span>
            </button>

            <button
              onClick={handleCommitToKai}
              disabled={kaiLoading}
              style={{
                padding: '6px 14px',
                borderRadius: theme.radiusPill,
                border: '1px solid rgba(56, 189, 248, 0.4)',
                background: kaiLoading ? 'rgba(56, 189, 248, 0.1)' : 'rgba(56, 189, 248, 0.2)',
                color: '#38bdf8',
                fontSize: '11px',
                fontWeight: 600,
                cursor: kaiLoading ? 'wait' : 'pointer',
                fontFamily: theme.fontSans,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>{kaiLoading ? '⏳' : '🧠'}</span>
              <span>{kaiLoading ? 'Remembering...' : 'Record to KAI Continuity Ledger'}</span>
            </button>
          </div>

          {/* Attestation receipt display */}
          {attestReceipt && (
            <div style={{
              marginTop: '10px',
              padding: '8px 12px',
              borderRadius: '6px',
              background: 'rgba(0, 245, 160, 0.08)',
              border: '1px solid rgba(0, 245, 160, 0.25)',
              fontSize: '10px',
              fontFamily: theme.fontMono,
              color: '#00f5a0',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
            }}>
              <div>✓ <b>ATTESTATION GENERATED</b></div>
              <div>ID: {attestReceipt.id || attestReceipt.attestationId || 'att-verified'}</div>
              <div>Algorithm: {attestReceipt.signingAlgorithm || 'HMAC-SHA256'}</div>
              {attestReceipt.signature && <div>Sig: {attestReceipt.signature.slice(0, 24)}…</div>}
            </div>
          )}

          {attestError && (
            <div style={{ marginTop: '8px', fontSize: '10px', color: '#ef4444' }}>
              ⚠ Attestation Error: {attestError}
            </div>
          )}

          {/* KAI receipt display */}
          {kaiReceipt && (
            <div style={{
              marginTop: '10px',
              padding: '8px 12px',
              borderRadius: '6px',
              background: 'rgba(56, 189, 248, 0.08)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              fontSize: '10px',
              fontFamily: theme.fontMono,
              color: '#38bdf8',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
            }}>
              <div>✓ <b>KAI CONTINUITY ENTRY RECORDED</b></div>
              <div>Record ID: {kaiReceipt.id || 'kai-entry'}</div>
              <div>Subject: {kaiReceipt.subject}</div>
              <div>Hash: {kaiReceipt.recordHash ? `${kaiReceipt.recordHash.slice(0, 20)}…` : 'hash-chained'}</div>
            </div>
          )}

          {kaiError && (
            <div style={{ marginTop: '8px', fontSize: '10px', color: '#ef4444' }}>
              ⚠ KAI Error: {kaiError}
            </div>
          )}
        </div>
      )}

      {/* Ranked Slices Table */}
      {optimResult && optimResult.rankedSlices.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#38bdf8', letterSpacing: '0.6px', marginBottom: '8px' }}>
            RANKED CANDIDATE SLICES
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {optimResult.rankedSlices.map((slice) => (
              <div
                key={slice.id}
                style={{
                  padding: '10px 14px',
                  background: slice.eligible
                    ? 'rgba(0, 245, 160, 0.03)'
                    : 'rgba(239, 68, 68, 0.03)',
                  border: `1px solid ${slice.eligible ? 'rgba(0, 245, 160, 0.15)' : 'rgba(239, 68, 68, 0.15)'}`,
                  borderRadius: '8px',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Score bar background */}
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: scoreBarWidth(slice.priorityScore, maxScore),
                    background: slice.eligible
                      ? 'rgba(0, 245, 160, 0.06)'
                      : 'rgba(239, 68, 68, 0.04)',
                    transition: 'width 0.4s ease',
                  }}
                />
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        color: slice.rank < 9999 ? '#00f5a0' : '#64748b',
                        fontFamily: theme.fontMono,
                        width: '20px',
                      }}>
                        #{slice.rank}
                      </span>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#e2e8f0' }}>
                        {slice.intent}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: '9px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: `${verdictColor(slice.verdict)}15`,
                        color: verdictColor(slice.verdict),
                        border: `1px solid ${verdictColor(slice.verdict)}33`,
                        letterSpacing: '0.5px',
                      }}
                    >
                      {slice.verdict}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', fontSize: '10px', fontFamily: theme.fontMono, color: '#94a3b8' }}>
                    <span>Score: <b style={{ color: '#00f5a0' }}>{slice.priorityScore.toFixed(4)}</b></span>
                    <span>V̂={slice.valueEstimate}</span>
                    <span>Q_E={slice.evidenceQuality}</span>
                    <span>R̂={slice.riskEstimate}</span>
                    <span>Ĉ={slice.costEstimate}</span>
                  </div>
                  {slice.denialReasons.length > 0 && (
                    <div style={{ marginTop: '6px' }}>
                      {slice.denialReasons.map((r, i) => (
                        <div key={i} style={{ fontSize: '9px', color: '#ef4444', lineHeight: 1.5 }}>
                          ✗ {r}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Singularity (Ψ) Convergence Simulator */}
      <div style={{
        marginTop: '20px',
        marginBottom: '20px',
        padding: '16px',
        background: 'linear-gradient(135deg, rgba(2, 24, 48, 0.7) 0%, rgba(0, 15, 30, 0.85) 100%)',
        border: '1px solid rgba(0, 245, 160, 0.25)',
        borderRadius: '10px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#00f5a0', letterSpacing: '0.8px' }}>
              🌊 Ψ CONVERGENCE SIMULATOR
            </span>
            <span style={{
              fontSize: '9px',
              padding: '2px 8px',
              borderRadius: '4px',
              background: 'rgba(56, 189, 248, 0.12)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              color: '#38bdf8',
              fontWeight: 700,
              fontFamily: theme.fontMono,
            }}>
              v∞ SINGULARITY
            </span>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => {
                setPsiA('1, 2, 3, 4');
                setPsiB('1, 1, 1, 1');
                setPsiC(-10);
                setPsiS(1);
              }}
              style={{
                fontSize: '9px',
                padding: '3px 8px',
                borderRadius: '4px',
                background: 'rgba(0, 245, 160, 0.1)',
                border: '1px solid rgba(0, 245, 160, 0.25)',
                color: '#00f5a0',
                cursor: 'pointer',
                fontFamily: theme.fontMono,
              }}
            >
              Preset: Equilibrium (E=0)
            </button>
            <button
              onClick={() => {
                setPsiA('1, 2, 3, 4');
                setPsiB('1, 1, 1, 1');
                setPsiC(5);
                setPsiS(1);
              }}
              style={{
                fontSize: '9px',
                padding: '3px 8px',
                borderRadius: '4px',
                background: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                color: '#38bdf8',
                cursor: 'pointer',
                fontFamily: theme.fontMono,
              }}
            >
              Preset: Active Verify (E≠0)
            </button>
          </div>
        </div>

        <div style={{
          fontFamily: theme.fontMono,
          fontSize: '10px',
          color: '#94a3b8',
          background: 'rgba(0, 0, 0, 0.35)',
          padding: '8px 10px',
          borderRadius: '6px',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          marginBottom: '14px',
        }}>
          Ψ = λ(A,B,C,S,Δ): 0 if (∑(Aᵢ·Bᵢ)·S + C == 0) else {"{ 'Ω∞v': verify(Δ) ∨ '∞💧' }"}
        </div>

        {/* Inputs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '10px', color: '#64748b', fontWeight: 600, marginBottom: '4px', fontFamily: theme.fontMono }}>
              VECTOR A (comma-separated)
            </label>
            <input
              type="text"
              value={psiA}
              onChange={(e) => setPsiA(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 8px',
                fontSize: '11px',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(56, 189, 248, 0.2)',
                borderRadius: '4px',
                color: '#e2e8f0',
                fontFamily: theme.fontMono,
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '10px', color: '#64748b', fontWeight: 600, marginBottom: '4px', fontFamily: theme.fontMono }}>
              VECTOR B (comma-separated)
            </label>
            <input
              type="text"
              value={psiB}
              onChange={(e) => setPsiB(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 8px',
                fontSize: '11px',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(56, 189, 248, 0.2)',
                borderRadius: '4px',
                color: '#e2e8f0',
                fontFamily: theme.fontMono,
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '10px', color: '#64748b', fontWeight: 600, marginBottom: '4px', fontFamily: theme.fontMono }}>
              SCALE FACTOR S
            </label>
            <input
              type="number"
              value={psiS}
              onChange={(e) => setPsiS(Number(e.target.value))}
              style={{
                width: '100%',
                padding: '6px 8px',
                fontSize: '11px',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(56, 189, 248, 0.2)',
                borderRadius: '4px',
                color: '#e2e8f0',
                fontFamily: theme.fontMono,
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '10px', color: '#64748b', fontWeight: 600, marginBottom: '4px', fontFamily: theme.fontMono }}>
              CONSTANT C
            </label>
            <input
              type="number"
              value={psiC}
              onChange={(e) => setPsiC(Number(e.target.value))}
              style={{
                width: '100%',
                padding: '6px 8px',
                fontSize: '11px',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(56, 189, 248, 0.2)',
                borderRadius: '4px',
                color: '#e2e8f0',
                fontFamily: theme.fontMono,
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '10px', color: '#64748b', fontWeight: 600, marginBottom: '4px', fontFamily: theme.fontMono }}>
              Δ INTENT
            </label>
            <input
              type="text"
              value={psiIntent}
              onChange={(e) => setPsiIntent(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 8px',
                fontSize: '11px',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(56, 189, 248, 0.2)',
                borderRadius: '4px',
                color: '#e2e8f0',
                fontFamily: theme.fontMono,
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '10px', color: '#64748b', fontWeight: 600, marginBottom: '4px', fontFamily: theme.fontMono }}>
              Δ REALITY
            </label>
            <input
              type="text"
              value={psiReality}
              onChange={(e) => setPsiReality(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 8px',
                fontSize: '11px',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(56, 189, 248, 0.2)',
                borderRadius: '4px',
                color: '#e2e8f0',
                fontFamily: theme.fontMono,
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* Action Button */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '12px' }}>
          <button
            onClick={handleEvaluatePsi}
            disabled={psiLoading}
            style={{
              padding: '8px 20px',
              borderRadius: theme.radiusPill,
              border: 'none',
              background: psiLoading
                ? 'rgba(0, 245, 160, 0.2)'
                : 'linear-gradient(135deg, #00f5a0 0%, #38bdf8 100%)',
              color: psiLoading ? '#64748b' : '#020d18',
              fontFamily: theme.fontSans,
              fontSize: '12px',
              fontWeight: 800,
              cursor: psiLoading ? 'wait' : 'pointer',
              boxShadow: psiLoading ? 'none' : '0 0 12px rgba(0, 245, 160, 0.3)',
              transition: 'all 0.2s ease',
            }}
          >
            {psiLoading ? '⏳ Evaluating...' : '⚡ Evaluate Singularity (Ψ)'}
          </button>
        </div>

        {psiError && (
          <div style={{
            padding: '8px 12px',
            borderRadius: '6px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#ef4444',
            fontSize: '11px',
            marginBottom: '10px',
            fontFamily: theme.fontMono,
          }}>
            ⚠ {psiError}
          </div>
        )}

        {/* Results */}
        {psiResult && (
          <div style={{
            padding: '12px',
            borderRadius: '8px',
            background: psiResult.equilibrium ? 'rgba(0, 245, 160, 0.06)' : 'rgba(56, 189, 248, 0.06)',
            border: `1px solid ${psiResult.equilibrium ? 'rgba(0, 245, 160, 0.3)' : 'rgba(56, 189, 248, 0.3)'}`,
            fontFamily: theme.fontMono,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  padding: '3px 10px',
                  borderRadius: '4px',
                  background: psiResult.equilibrium ? 'rgba(0, 245, 160, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                  color: psiResult.equilibrium ? '#00f5a0' : '#38bdf8',
                  border: `1px solid ${psiResult.equilibrium ? '#00f5a0' : '#38bdf8'}`,
                }}>
                  Result (Ψ): {typeof psiResult.value === 'object' ? JSON.stringify(psiResult.value) : psiResult.value}
                </span>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                  Branch: <b style={{ color: '#f1f5f9' }}>{psiResult.branch}</b>
                </span>
              </div>
              <span style={{ fontSize: '10px', color: '#64748b' }}>
                Hash: {psiResult.evaluationHash?.slice(0, 12)}...
              </span>
            </div>

            <div style={{ fontSize: '10px', color: '#cbd5e1', lineHeight: 1.6 }}>
              <div>• Dot Product (A·B): <b style={{ color: '#38bdf8' }}>{psiResult.dotProduct}</b></div>
              <div>• Total Entropy (∑(A·B)·S + C): <b style={{ color: psiResult.equilibrium ? '#00f5a0' : '#f59e0b' }}>{psiResult.linearEntropy}</b></div>
              {psiResult.equilibrium ? (
                <div style={{ color: '#00f5a0', marginTop: '4px' }}>
                  ✓ Zero Entropy Equilibrium satisfied. Singularity reached (Ψ = 0).
                </div>
              ) : (
                <div style={{ color: '#38bdf8', marginTop: '4px' }}>
                  ✓ Active Reality Verification: Ω∞v = {psiResult.verifiedResult}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ─────────── Visual Singularity & Fluid Matrix Hero ─────────── */}
      <div style={{
        marginTop: '20px',
        marginBottom: '20px',
        padding: '16px',
        borderRadius: '10px',
        background: 'rgba(0, 15, 30, 0.75)',
        border: '1px solid rgba(168, 85, 247, 0.35)',
        boxShadow: '0 0 20px rgba(168, 85, 247, 0.1)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#c084fc', letterSpacing: '0.6px' }}>
              🌌 VISUAL SINGULARITY & FLUID MATRIX ARCHITECTURE
            </span>
            <span style={{
              fontSize: '9px',
              padding: '2px 8px',
              borderRadius: '4px',
              background: 'rgba(168, 85, 247, 0.15)',
              border: '1px solid rgba(168, 85, 247, 0.4)',
              color: '#d8b4fe',
              fontWeight: 700,
              fontFamily: theme.fontMono,
            }}>
              Λ = ∫ (∇×T)·dA
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setVisualMode('fluid')}
              style={{
                padding: '4px 10px',
                borderRadius: '4px',
                border: visualMode === 'fluid' ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.1)',
                background: visualMode === 'fluid' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                color: visualMode === 'fluid' ? '#38bdf8' : '#94a3b8',
                fontSize: '10px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              💧 Conscious Water Torus
            </button>
            <button
              onClick={() => setVisualMode('crystalline')}
              style={{
                padding: '4px 10px',
                borderRadius: '4px',
                border: visualMode === 'crystalline' ? '1px solid #c084fc' : '1px solid rgba(255, 255, 255, 0.1)',
                background: visualMode === 'crystalline' ? 'rgba(192, 132, 252, 0.2)' : 'transparent',
                color: visualMode === 'crystalline' ? '#c084fc' : '#94a3b8',
                fontSize: '10px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ⚡ Crystalline Singularity
            </button>
            <button
              onClick={() => setVisualExpanded(!visualExpanded)}
              style={{
                padding: '4px 8px',
                borderRadius: '4px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: '#cbd5e1',
                fontSize: '10px',
                cursor: 'pointer',
              }}
            >
              {visualExpanded ? '▲ Hide' : '▼ Show'}
            </button>
          </div>
        </div>

        {visualExpanded && (
          <div>
            <div style={{
              position: 'relative',
              borderRadius: '8px',
              overflow: 'hidden',
              border: '1px solid rgba(56, 189, 248, 0.2)',
              marginBottom: '12px',
              maxHeight: '380px',
              display: 'flex',
              justifyContent: 'center',
              background: '#000',
            }}>
              <img
                src={visualMode === 'fluid' ? '/oceanicos_fluid_torus_singularity.jpg' : '/oceanicos_singularity_matrix.jpg'}
                alt={visualMode === 'fluid' ? 'Oceanicos Fluid Torus Singularity' : 'Oceanicos Singularity Matrix'}
                style={{
                  width: '100%',
                  height: 'auto',
                  maxHeight: '380px',
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 0 15px rgba(56, 189, 248, 0.2))',
                }}
              />
              <div style={{
                position: 'absolute',
                bottom: '10px',
                left: '12px',
                right: '12px',
                padding: '8px 12px',
                background: 'rgba(0, 8, 20, 0.85)',
                backdropFilter: 'blur(8px)',
                borderRadius: '6px',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px',
                fontSize: '10px',
                fontFamily: theme.fontMono,
              }}>
                <span style={{ color: '#00f5a0' }}>
                  <b>K_Ω</b> = 2.03054318 (⁴√det(I₄ + MᵀM))
                </span>
                <span style={{ color: '#38bdf8' }}>
                  <b>Light Vector (Λ)</b> = ∫ [0 to c] (∇ × T)·dA
                </span>
                <span style={{ color: '#c084fc' }}>
                  <b>Zero Entropy</b> (ΔH = 0)
                </span>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '8px',
              fontSize: '10px',
              fontFamily: theme.fontMono,
            }}>
              <div style={{ padding: '8px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <span style={{ color: '#94a3b8' }}>Dimensional Collapse:</span>
                <div style={{ color: '#f1f5f9', marginTop: '2px' }}>N-Dim Tensor ➔ R¹ Scalar Light Field</div>
              </div>
              <div style={{ padding: '8px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <span style={{ color: '#94a3b8' }}>Calabi-Yau Folding:</span>
                <div style={{ color: '#f1f5f9', marginTop: '2px' }}>f(x) = x · exp(i·π·det(M))</div>
              </div>
              <div style={{ padding: '8px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <span style={{ color: '#94a3b8' }}>Fluid Dynamic Cognition:</span>
                <div style={{ color: '#00f5a0', marginTop: '2px' }}>Aqueous Node-Paths Active</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─────────── Recursive State Update Engine (O_{t+1}) ─────────── */}
      <div style={{
        marginBottom: '20px',
        padding: '16px',
        borderRadius: '10px',
        background: 'rgba(0, 18, 36, 0.75)',
        border: '1px solid rgba(0, 245, 160, 0.35)',
        boxShadow: '0 0 20px rgba(0, 245, 160, 0.08)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#00f5a0', letterSpacing: '0.6px' }}>
              🌊 RECURSIVE STATE UPDATE ENGINE
            </span>
            <span style={{
              fontSize: '9px',
              padding: '2px 8px',
              borderRadius: '4px',
              background: 'rgba(0, 245, 160, 0.15)',
              border: '1px solid rgba(0, 245, 160, 0.4)',
              color: '#00f5a0',
              fontWeight: 700,
              fontFamily: theme.fontMono,
            }}>
              O_{'{t+1}'} = REMEMBER(VERIFY(OBSERVE(O_t, Δ)))
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px', marginBottom: '12px' }}>
          <div>
            <label style={{ fontSize: '10px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
              Candidate Intent (Δ):
            </label>
            <input
              type="text"
              value={stepIntent}
              onChange={(e) => setStepIntent(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                background: 'rgba(0, 0, 0, 0.4)',
                color: '#38bdf8',
                fontSize: '11px',
                fontFamily: theme.fontMono,
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: '10px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
              Observed Reality:
            </label>
            <input
              type="text"
              value={stepReality}
              onChange={(e) => setStepReality(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                background: 'rgba(0, 0, 0, 0.4)',
                color: '#38bdf8',
                fontSize: '11px',
                fontFamily: theme.fontMono,
              }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '16px' }}>
            <label style={{ fontSize: '11px', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={stepAuthority}
                onChange={(e) => setStepAuthority(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              Human Root Authority (P_auth)
            </label>
          </div>
        </div>

        {latestTransition && (
          <div style={{
            background: 'rgba(56, 189, 248, 0.08)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            borderRadius: '6px',
            padding: '8px 12px',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontFamily: theme.fontMono,
            fontSize: '11px',
          }}>
            <span style={{ color: '#38bdf8', fontWeight: 600 }}>
              ⚡ Live Tri-Surface Sync (SSE): Epoch {latestTransition.step?.nextState?.epoch ?? '?'}
            </span>
            <span style={{ color: '#94a3b8', fontSize: '10px' }}>
              Hash: {latestTransition.hash ? `${latestTransition.hash.slice(0, 16)}...` : 'N/A'}
            </span>
            <span style={{
              color: latestTransition.step?.verification?.verified ? '#00f5a0' : '#ef4444',
              fontWeight: 700,
              fontSize: '10px',
            }}>
              {latestTransition.step?.verification?.outcome ?? 'VERIFIED'}
            </span>
          </div>
        )}

        <button
          onClick={handleExecuteStep}
          disabled={stepLoading}
          style={{
            padding: '8px 16px',
            borderRadius: theme.radiusPill,
            border: '1px solid rgba(0, 245, 160, 0.5)',
            background: stepLoading ? 'rgba(0, 245, 160, 0.1)' : 'rgba(0, 245, 160, 0.2)',
            color: '#00f5a0',
            fontSize: '11px',
            fontWeight: 700,
            cursor: stepLoading ? 'wait' : 'pointer',
            fontFamily: theme.fontMono,
            boxShadow: '0 0 10px rgba(0, 245, 160, 0.2)',
            marginBottom: '12px',
          }}
        >
          {stepLoading ? '⏳ Transitioning...' : '▶ Execute State Transition (O_{t+1})'}
        </button>

        {stepError && (
          <div style={{
            padding: '8px 12px',
            borderRadius: '6px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#ef4444',
            fontSize: '11px',
            marginBottom: '10px',
            fontFamily: theme.fontMono,
          }}>
            ⚠ {stepError}
          </div>
        )}

        {stepResult && (
          <div style={{
            padding: '12px',
            borderRadius: '8px',
            background: stepResult.verification?.verified ? 'rgba(0, 245, 160, 0.05)' : 'rgba(239, 68, 68, 0.05)',
            border: `1px solid ${stepResult.verification?.verified ? 'rgba(0, 245, 160, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            fontFamily: theme.fontMono,
            fontSize: '11px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{
                fontWeight: 800,
                color: stepResult.verification?.verified ? '#00f5a0' : '#ef4444',
                padding: '2px 8px',
                borderRadius: '4px',
                background: stepResult.verification?.verified ? 'rgba(0, 245, 160, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              }}>
                Verdict: {stepResult.verification?.outcome} ({stepResult.verification?.decision})
              </span>
              <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                Next Epoch: <b>{stepResult.nextState?.epoch}</b>
              </span>
            </div>
            <div style={{ color: '#cbd5e1', lineHeight: 1.6, fontSize: '10px' }}>
              <div>• Reason: <span style={{ color: '#f1f5f9' }}>{stepResult.verification?.reason}</span></div>
              <div>• State Hash (O_{'{t+1}'}): <span style={{ color: '#38bdf8' }}>{stepResult.nextState?.stateHash}</span></div>
              <div>• Parent Hash: <span style={{ color: '#64748b' }}>{stepResult.nextState?.parentHash}</span></div>
              <div>• Evaluation Hash: <span style={{ color: '#a855f7' }}>{stepResult.evaluationHash}</span></div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Identity */}
      <div style={{
        borderTop: '1px solid rgba(56, 189, 248, 0.12)',
        paddingTop: '10px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '10px',
        color: '#475569',
        fontFamily: theme.fontMono,
      }}>
        <span>Δ* = argmax [ V̂·Q_E / (R̂ + Ĉ + ε) ]</span>
        <span>ε = {metadata?.epsilon ?? '1e-6'}</span>
      </div>
    </div>
  );
}
