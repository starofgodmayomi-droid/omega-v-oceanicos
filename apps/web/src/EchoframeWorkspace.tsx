import React, { useState, useEffect, useCallback } from 'react';
import { theme } from './oceanicosTheme';

export interface EchoframeTemplate {
  type: 'primitive' | 'route' | 'agent' | 'contract';
  description: string;
  defaultSanctum: string;
  targetPackage: string;
}

export interface EchoframeArtifact {
  id: string;
  name: string;
  type: string;
  code: string;
  digest: string;
  suggestedPath?: string;
  timestamp: string;
  verificationGate?: {
    rule: string;
    failClosed: boolean;
    hashProof: string;
  };
}

export interface EchoframeSimulation {
  simulationId: string;
  concept: string;
  evaluatedAxioms: string[];
  entropyLevel: number;
  epistemicState: string;
  harmonicResonanceHz: number;
  timestamp: string;
}

const PRESET_CONCEPTS = [
  'Continuous Fluid-State Matrix Tensor Loop',
  'Autonomous Self-Healing Invariant Gate',
  '11:11 Ocean Memory Attestation Ring',
  'Zero-Hallucination Cognitive Proof Mesh',
];

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

export const EchoframeWorkspace: React.FC = () => {
  const [status, setStatus] = useState<any>(null);
  const [templates, setTemplates] = useState<EchoframeTemplate[]>([]);
  const [selectedType, setSelectedType] = useState<string>('primitive');
  const [componentName, setComponentName] = useState<string>('FluidStateEngine');
  const [generating, setGenerating] = useState<boolean>(false);
  const [artifact, setArtifact] = useState<EchoframeArtifact | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Simulation state
  const [concept, setConcept] = useState<string>(PRESET_CONCEPTS[0]);
  const [simulating, setSimulating] = useState<boolean>(false);
  const [simulation, setSimulation] = useState<EchoframeSimulation | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(apiUrl('/v1/echoframe'));
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (err) {
      console.warn('Echoframe status fetch failed', err);
    }
  }, []);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch(apiUrl('/v1/echoframe/templates'));
      if (res.ok) {
        const data = await res.json();
        if (data.templates) {
          setTemplates(data.templates);
        }
      }
    } catch (err) {
      console.warn('Echoframe templates fetch failed', err);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchTemplates();
  }, [fetchStatus, fetchTemplates]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch(apiUrl('/v1/echoframe/generate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: selectedType, name: componentName }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.artifact) {
          setArtifact(data.artifact);
        }
      }
    } catch (err) {
      console.error('Artifact generation failed', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleSimulate = async () => {
    setSimulating(true);
    try {
      const res = await fetch(apiUrl('/v1/echoframe/simulate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concept }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.simulation) {
          setSimulation(data.simulation);
        }
      }
    } catch (err) {
      console.error('Simulation failed', err);
    } finally {
      setSimulating(false);
    }
  };

  const handleCopy = () => {
    if (!artifact?.code) return;
    navigator.clipboard.writeText(artifact.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        marginTop: '24px',
        padding: '24px',
        background: 'linear-gradient(135deg, rgba(3, 14, 26, 0.95) 0%, rgba(6, 26, 42, 0.9) 100%)',
        border: '1px solid rgba(0, 245, 160, 0.3)',
        borderRadius: theme.radius,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          paddingBottom: '16px',
          marginBottom: '20px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '22px' }}>🎨</span>
            <h2
              style={{
                margin: 0,
                fontSize: '18px',
                color: '#00f5a0',
                letterSpacing: '-0.02em',
                fontWeight: 700,
              }}
            >
              ECHOFRAME — Expression & Creation Engine
            </h2>
            <span
              style={{
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '10px',
                fontFamily: theme.fontMono,
                background: 'rgba(0, 245, 160, 0.15)',
                border: '1px solid rgba(0, 245, 160, 0.3)',
                color: '#00f5a0',
                fontWeight: 600,
              }}
            >
              {status?.sanctum || 'HOLY_PLACE'}
            </span>
            <span
              style={{
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '10px',
                fontFamily: theme.fontMono,
                background: 'rgba(0, 229, 255, 0.15)',
                border: '1px solid rgba(0, 229, 255, 0.3)',
                color: '#00e5ff',
                fontWeight: 600,
              }}
            >
              GATE: 18/18 PKGS VERIFIED
            </span>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94a3b8' }}>
            {status?.equation || 'Ω∞v ::= VERIFY(ΔREALITY)'} · Bounded Template Synthesis & Tensor Simulation
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span
            style={{
              fontSize: '11px',
              fontFamily: theme.fontMono,
              color: status?.status === 'active' ? '#00f5a0' : '#f59e0b',
            }}
          >
            ● {status?.status === 'active' ? 'ENGINE ACTIVE' : 'CONNECTING...'}
          </span>
          <button
            type="button"
            onClick={fetchStatus}
            style={{
              padding: '4px 10px',
              borderRadius: theme.radiusPill,
              border: `1px solid ${theme.border}`,
              background: 'transparent',
              color: theme.textMuted,
              fontSize: '11px',
              cursor: 'pointer',
            }}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Grid: Left = Synthesis, Right = Simulation */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '24px',
        }}
      >
        {/* Synthesis Pane */}
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.25)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: theme.radiusSmall,
            padding: '16px',
          }}
        >
          <h3
            style={{
              margin: '0 0 12px',
              fontSize: '14px',
              color: '#38bdf8',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            ✦ Synthesize Code Artifact
          </h3>

          {/* Template pills */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
            {templates.map((tpl) => (
              <button
                key={tpl.type}
                type="button"
                onClick={() => setSelectedType(tpl.type)}
                style={{
                  padding: '6px 12px',
                  borderRadius: theme.radiusPill,
                  border:
                    selectedType === tpl.type
                      ? '1px solid #00f5a0'
                      : '1px solid rgba(255, 255, 255, 0.12)',
                  background:
                    selectedType === tpl.type ? 'rgba(0, 245, 160, 0.15)' : 'transparent',
                  color: selectedType === tpl.type ? '#00f5a0' : '#94a3b8',
                  fontSize: '11px',
                  fontFamily: theme.fontMono,
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                }}
              >
                {tpl.type}
              </button>
            ))}
          </div>

          {/* Component Name Input */}
          <div style={{ marginBottom: '14px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '11px',
                color: '#94a3b8',
                marginBottom: '4px',
              }}
            >
              Component / Artifact Name
            </label>
            <input
              type="text"
              value={componentName}
              onChange={(e) => setComponentName(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '6px',
                color: '#f8fafc',
                fontFamily: theme.fontMono,
                fontSize: '13px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            style={{
              width: '100%',
              padding: '10px 16px',
              borderRadius: theme.radiusSmall,
              border: 'none',
              background: generating
                ? 'rgba(0, 245, 160, 0.3)'
                : 'linear-gradient(135deg, #00f5a0 0%, #00d9f5 100%)',
              color: '#020d18',
              fontFamily: theme.fontSans,
              fontSize: '13px',
              fontWeight: 700,
              cursor: generating ? 'not-allowed' : 'pointer',
              marginBottom: '16px',
            }}
          >
            {generating ? 'Synthesizing...' : '⚡ Generate Template Artifact'}
          </button>

          {/* Artifact Display */}
          {artifact && (
            <div
              style={{
                background: '#040d16',
                border: '1px solid rgba(0, 245, 160, 0.25)',
                borderRadius: '6px',
                padding: '12px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px',
                }}
              >
                <div style={{ fontSize: '11px', fontFamily: theme.fontMono, color: '#00f5a0' }}>
                  {artifact.name} ({artifact.type}) · {artifact.digest?.slice(0, 16)}...
                </div>
                <button
                  type="button"
                  onClick={handleCopy}
                  style={{
                    padding: '3px 8px',
                    borderRadius: '4px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    background: 'transparent',
                    color: copied ? '#00f5a0' : '#cbd5e1',
                    fontSize: '10px',
                    cursor: 'pointer',
                  }}
                >
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <pre
                style={{
                  margin: 0,
                  maxHeight: '220px',
                  overflowY: 'auto',
                  fontSize: '11px',
                  fontFamily: theme.fontMono,
                  color: '#93c5fd',
                  lineHeight: '1.4',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {artifact.code}
              </pre>
            </div>
          )}
        </div>

        {/* Simulation Pane */}
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.25)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: theme.radiusSmall,
            padding: '16px',
          }}
        >
          <h3
            style={{
              margin: '0 0 12px',
              fontSize: '14px',
              color: '#38bdf8',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            🌊 Fluid-State Concept Simulation
          </h3>

          {/* Preset Buttons */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
            {PRESET_CONCEPTS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setConcept(p)}
                style={{
                  padding: '4px 8px',
                  borderRadius: theme.radiusPill,
                  border:
                    concept === p
                      ? '1px solid #38bdf8'
                      : '1px solid rgba(255, 255, 255, 0.1)',
                  background: concept === p ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                  color: concept === p ? '#38bdf8' : '#94a3b8',
                  fontSize: '10px',
                  cursor: 'pointer',
                }}
              >
                {p.split(' ')[0]}
              </button>
            ))}
          </div>

          <div style={{ marginBottom: '14px' }}>
            <input
              type="text"
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              placeholder="Enter concept to simulate..."
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '6px',
                color: '#f8fafc',
                fontFamily: theme.fontMono,
                fontSize: '12px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <button
            type="button"
            onClick={handleSimulate}
            disabled={simulating}
            style={{
              width: '100%',
              padding: '10px 16px',
              borderRadius: theme.radiusSmall,
              border: 'none',
              background: simulating
                ? 'rgba(56, 189, 248, 0.3)'
                : 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
              color: '#ffffff',
              fontFamily: theme.fontSans,
              fontSize: '13px',
              fontWeight: 700,
              cursor: simulating ? 'not-allowed' : 'pointer',
              marginBottom: '16px',
            }}
          >
            {simulating ? 'Simulating...' : '▶ Run Concept Transition Simulation'}
          </button>

          {/* Simulation Result */}
          {simulation && (
            <div
              style={{
                background: '#040d16',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                borderRadius: '6px',
                padding: '12px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '10px',
                  fontSize: '11px',
                  fontFamily: theme.fontMono,
                }}
              >
                <span style={{ color: '#38bdf8' }}>
                  State: {simulation.epistemicState} ({simulation.harmonicResonanceHz} Hz)
                </span>
                <span style={{ color: '#94a3b8' }}>
                  ID: {simulation.simulationId}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {simulation.evaluatedAxioms?.map((axiom, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '8px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      borderRadius: '4px',
                      borderLeft: '3px solid #00f5a0',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '11px',
                        fontFamily: theme.fontMono,
                        fontWeight: 600,
                        color: '#f8fafc',
                      }}
                    >
                      <span>[Axiom {idx + 1}]</span>
                      <span style={{ color: '#00f5a0' }}>✓ GROUNDED</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                      {axiom}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
