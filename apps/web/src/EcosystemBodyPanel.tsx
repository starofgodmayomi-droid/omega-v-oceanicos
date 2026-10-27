import React, { useState, useEffect } from 'react';
import { theme } from './oceanicosTheme';

/* ── Types matching the API response ─────────────────────────────────── */

interface BodyPart {
  organ: string;
  role: string;
  description: string;
  status: 'IMPLEMENTED' | 'PARTIALLY_IMPLEMENTED' | 'PROPOSED' | 'BLOCKED';
  capabilities: string[];
  evidence: string;
  provenance: string[];
}

interface PlatformLayer {
  layer: string;
  description: string;
  status: 'IMPLEMENTED' | 'PARTIALLY_IMPLEMENTED' | 'PROPOSED' | 'BLOCKED';
  components: string[];
  evidence: string;
}

interface ConnectedDomain {
  id: number;
  name: string;
  status: 'IMPLEMENTED' | 'PARTIALLY_IMPLEMENTED' | 'PROPOSED' | 'BLOCKED';
  evidence: string;
}

interface EcosystemBodyData {
  identity: { product: string; principle: string; vision: string; invariant: string };
  operatingLoop: string[];
  body: BodyPart[];
  architecture: PlatformLayer[];
  domains: ConnectedDomain[];
  implementationTruth: {
    totalParts: number;
    implemented: number;
    partiallyImplemented: number;
    proposed: number;
    blocked: number;
    completionRatio: number;
  };
  evaluatedAt: string;
}

/* ── Organ emoji map ─────────────────────────────────────────────────── */

const ORGAN_EMOJI: Record<string, string> = {
  Mind: '🧠',
  Eyes: '👁',
  Memory: '📚',
  Hands: '🤲',
  Heart: '❤️',
  'Nervous System': '⚡',
  'Immune System': '🛡️',
  'Growth System': '🌱',
  Deconstruction: '🔍',
  Compass: '🧭',
};

/* ── Status badge ────────────────────────────────────────────────────── */

function statusColor(status: string): string {
  switch (status) {
    case 'IMPLEMENTED': return theme.verified;
    case 'PARTIALLY_IMPLEMENTED': return theme.warning;
    case 'PROPOSED': return theme.textDim;
    case 'BLOCKED': return theme.divergent;
    default: return theme.unknown;
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case 'IMPLEMENTED': return '✓ Implemented';
    case 'PARTIALLY_IMPLEMENTED': return '◐ Partial';
    case 'PROPOSED': return '○ Proposed';
    case 'BLOCKED': return '✗ Blocked';
    default: return status;
  }
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 10px',
        borderRadius: theme.radiusPill,
        fontSize: '0.7rem',
        fontFamily: theme.fontMono,
        fontWeight: 600,
        letterSpacing: '0.04em',
        color: statusColor(status),
        background: `${statusColor(status)}18`,
        border: `1px solid ${statusColor(status)}40`,
      }}
    >
      {statusLabel(status)}
    </span>
  );
}

/* ── Main panel ──────────────────────────────────────────────────────── */

const API_BASE_URL = (
  (import.meta as any).env?.VITE_API_URL ||
  (typeof window !== 'undefined' && window.location.port !== '5000'
    ? `http://${window.location.hostname}:5000`
    : '')
).replace(/\/$/, '');

export function EcosystemBodyPanel() {
  const [data, setData] = useState<EcosystemBodyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'body' | 'architecture' | 'domains'>('body');
  const [expandedOrgan, setExpandedOrgan] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/v1/ecosystem/body`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!cancelled) { setData(json); setError(null); }
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Failed to load ecosystem body');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 30_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const panelStyle: React.CSSProperties = {
    background: theme.surface,
    border: `1px solid ${theme.border}`,
    borderRadius: theme.radius,
    padding: '28px',
    marginBottom: '20px',
    fontFamily: theme.fontSans,
    color: theme.text,
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '6px',
  };

  if (loading) {
    return (
      <div style={panelStyle}>
        <h2 style={{ ...headerStyle, color: theme.accent }}>🌊 Ecosystem Body</h2>
        <p style={{ color: theme.textMuted, fontFamily: theme.fontMono, fontSize: '0.85rem' }}>
          Loading ecosystem body status…
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={panelStyle}>
        <h2 style={{ ...headerStyle, color: theme.accent }}>🌊 Ecosystem Body</h2>
        <p style={{ color: theme.divergent, fontFamily: theme.fontMono, fontSize: '0.85rem' }}>
          {error || 'No data available'}
        </p>
      </div>
    );
  }

  const truth = data.implementationTruth;

  return (
    <div style={panelStyle}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={headerStyle}>
        <span style={{ fontSize: '1.6rem' }}>🌊</span>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.3rem', color: theme.accent, letterSpacing: '-0.02em' }}>
            {data.identity.product} — Ecosystem Body
          </h2>
          <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: theme.textMuted, fontStyle: 'italic' }}>
            {data.identity.principle}
          </p>
        </div>
      </div>

      {/* ── Operating Loop ─────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        gap: '6px',
        flexWrap: 'wrap',
        margin: '14px 0',
        padding: '10px 14px',
        background: `${theme.accent}08`,
        borderRadius: theme.radiusSmall,
        border: `1px solid ${theme.borderSubtle}`,
      }}>
        {data.operatingLoop.map((step, i) => (
          <React.Fragment key={step}>
            <span style={{
              fontFamily: theme.fontMono,
              fontSize: '0.75rem',
              fontWeight: 600,
              color: theme.accent,
              padding: '2px 8px',
              background: `${theme.accent}12`,
              borderRadius: theme.radiusPill,
            }}>
              {step}
            </span>
            {i < data.operatingLoop.length - 1 && (
              <span style={{ color: theme.textDim, fontSize: '0.75rem' }}>→</span>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* ── Implementation Truth Summary ───────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
        gap: '8px',
        marginBottom: '16px',
      }}>
        {[
          { label: 'Implemented', value: truth.implemented, color: theme.verified },
          { label: 'Partial', value: truth.partiallyImplemented, color: theme.warning },
          { label: 'Proposed', value: truth.proposed, color: theme.textDim },
          { label: 'Blocked', value: truth.blocked, color: theme.divergent },
          { label: 'Completion', value: `${Math.round(truth.completionRatio * 100)}%`, color: theme.accent },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            textAlign: 'center',
            padding: '8px',
            background: `${color}08`,
            borderRadius: theme.radiusSmall,
            border: `1px solid ${color}20`,
          }}>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color, fontFamily: theme.fontMono }}>
              {value}
            </div>
            <div style={{ fontSize: '0.7rem', color: theme.textMuted, marginTop: '2px' }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* ── Tab navigation ─────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
        {([
          { key: 'body' as const, label: '🫀 Body Parts', count: data.body.length },
          { key: 'architecture' as const, label: '🏗 Architecture', count: data.architecture.length },
          { key: 'domains' as const, label: '🌐 Domains', count: data.domains.length },
        ]).map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            style={{
              flex: 1,
              padding: '8px 12px',
              border: `1px solid ${activeTab === key ? theme.accent + '50' : theme.borderSubtle}`,
              borderRadius: theme.radiusSmall,
              background: activeTab === key ? `${theme.accent}12` : 'transparent',
              color: activeTab === key ? theme.accent : theme.textMuted,
              fontFamily: theme.fontSans,
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {label} ({count})
          </button>
        ))}
      </div>

      {/* ── Body Parts Tab ─────────────────────────────────────── */}
      {activeTab === 'body' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {data.body.map(part => {
            const expanded = expandedOrgan === part.organ;
            return (
              <div
                key={part.organ}
                style={{
                  padding: '12px 14px',
                  background: expanded ? `${theme.accent}06` : theme.surfaceDeep,
                  border: `1px solid ${expanded ? theme.borderBright : theme.borderSubtle}`,
                  borderRadius: theme.radiusSmall,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onClick={() => setExpandedOrgan(expanded ? null : part.organ)}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.3rem' }}>{ORGAN_EMOJI[part.organ] || '🔵'}</span>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{part.organ}</span>
                      <span style={{ color: theme.textMuted, fontSize: '0.78rem', marginLeft: '8px' }}>
                        {part.role}
                      </span>
                    </div>
                  </div>
                  <StatusBadge status={part.status} />
                </div>
                {expanded && (
                  <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: `1px solid ${theme.borderSubtle}` }}>
                    <p style={{ fontSize: '0.8rem', color: theme.textMuted, margin: '0 0 8px', lineHeight: 1.5 }}>
                      {part.description}
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
                      {part.capabilities.map(cap => (
                        <span key={cap} style={{
                          fontFamily: theme.fontMono,
                          fontSize: '0.68rem',
                          padding: '1px 6px',
                          background: `${theme.accent}10`,
                          borderRadius: theme.radiusPill,
                          color: theme.accent,
                          border: `1px solid ${theme.accent}20`,
                        }}>
                          {cap}
                        </span>
                      ))}
                    </div>
                    <p style={{
                      fontSize: '0.75rem',
                      color: theme.textMuted,
                      fontFamily: theme.fontMono,
                      margin: '0 0 4px',
                      lineHeight: 1.5,
                    }}>
                      📋 {part.evidence}
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {part.provenance.map(p => (
                        <span key={p} style={{
                          fontSize: '0.65rem',
                          fontFamily: theme.fontMono,
                          color: theme.textDim,
                          padding: '1px 4px',
                          background: `${theme.textDim}10`,
                          borderRadius: '4px',
                        }}>
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Architecture Tab ───────────────────────────────────── */}
      {activeTab === 'architecture' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {data.architecture.map((layer, i) => (
            <div key={layer.layer} style={{
              padding: '12px 14px',
              background: theme.surfaceDeep,
              border: `1px solid ${theme.borderSubtle}`,
              borderRadius: theme.radiusSmall,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>
                  L{i} — {layer.layer}
                </span>
                <StatusBadge status={layer.status} />
              </div>
              <p style={{ fontSize: '0.78rem', color: theme.textMuted, margin: '0 0 6px' }}>
                {layer.description}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '6px' }}>
                {layer.components.map(c => (
                  <span key={c} style={{
                    fontFamily: theme.fontMono,
                    fontSize: '0.66rem',
                    padding: '1px 5px',
                    background: `${theme.accent}10`,
                    borderRadius: '4px',
                    color: theme.accentDim,
                  }}>
                    {c}
                  </span>
                ))}
              </div>
              <p style={{ fontSize: '0.72rem', fontFamily: theme.fontMono, color: theme.textDim, margin: 0 }}>
                {layer.evidence}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ── Domains Tab ────────────────────────────────────────── */}
      {activeTab === 'domains' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {data.domains.map(domain => (
            <div key={domain.id} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              background: theme.surfaceDeep,
              border: `1px solid ${theme.borderSubtle}`,
              borderRadius: theme.radiusSmall,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.84rem', fontWeight: 600, marginBottom: '2px' }}>
                  <span style={{ color: theme.textDim, fontFamily: theme.fontMono, marginRight: '6px' }}>
                    {domain.id}.
                  </span>
                  {domain.name}
                </div>
                <div style={{ fontSize: '0.7rem', fontFamily: theme.fontMono, color: theme.textDim }}>
                  {domain.evidence}
                </div>
              </div>
              <StatusBadge status={domain.status} />
            </div>
          ))}
        </div>
      )}

      {/* ── Footer ─────────────────────────────────────────────── */}
      <div style={{
        marginTop: '16px',
        paddingTop: '10px',
        borderTop: `1px solid ${theme.borderSubtle}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ fontSize: '0.68rem', fontFamily: theme.fontMono, color: theme.textDim }}>
          {data.identity.invariant}
        </span>
        <span style={{ fontSize: '0.68rem', fontFamily: theme.fontMono, color: theme.textDim }}>
          Evaluated: {new Date(data.evaluatedAt).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}
