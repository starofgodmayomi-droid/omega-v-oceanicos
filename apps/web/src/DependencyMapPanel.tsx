import { useState, useEffect, useCallback } from 'react';
import { theme } from './oceanicosTheme';

/*
 * DependencyMapPanel — visualizes the workspace package dependency graph.
 *
 * Shows which packages are earned (BUILT) vs not-yet-earned (SOURCE-ONLY / STUB),
 * the dependency edges between them, and promotion risk classification.
 *
 * Migration path step 2: INVENTORY → DEPENDENCY MAP → CONTRACT MAP
 */

const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

type Classification = 'BUILT' | 'SOURCE-ONLY' | 'STUB';

interface DependencyNode {
  name: string;
  package: string;
  classification: Classification;
  specRole: string;
  dependsOn: string[];
  lines: number;
}

interface DependencyMapData {
  success: true;
  contract: {
    name: string;
    version: string;
    migrationStep: string;
    invariant: string;
    evaluatedAt: string;
  };
  nodes: DependencyNode[];
  summary: {
    built: number;
    sourceOnly: number;
    stub: number;
    total: number;
    lowestRiskPromotions: string[];
    blockedBySdk: string[];
    archiveCandidates: number;
  };
}

const CLASS_COLORS: Record<Classification, string> = {
  BUILT: theme.verified,
  'SOURCE-ONLY': theme.warning,
  STUB: theme.unknown,
};

const CLASS_LABELS: Record<Classification, string> = {
  BUILT: 'Earned',
  'SOURCE-ONLY': 'Source-only',
  STUB: 'Stub',
};

export function DependencyMapPanel() {
  const [data, setData] = useState<DependencyMapData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | Classification>('all');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/v1/dependencies`);
      const text = await res.text();
      const json = text ? JSON.parse(text) : null;
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'dependency map unavailable');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredNodes = data
    ? filter === 'all'
      ? data.nodes
      : data.nodes.filter((n) => n.classification === filter)
    : [];

  return (
    <div style={{ padding: '20px 22px', fontFamily: theme.fontSans }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: theme.accent }}>
            🗺 Dependency Map
          </div>
          <div style={{ fontSize: '11px', color: theme.textDim, marginTop: '3px' }}>
            {data?.contract.migrationStep ?? 'Loading…'} · EARNED COMPLEXITY audit
          </div>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          style={{
            background: theme.surfaceRaised,
            color: theme.accent,
            border: `1px solid ${theme.borderBright}`,
            borderRadius: theme.radiusSmall,
            padding: '6px 12px',
            fontSize: '11px',
            fontWeight: 600,
            cursor: loading ? 'wait' : 'pointer',
            opacity: loading ? 0.5 : 1,
          }}
        >
          {loading ? '…' : '↻'}
        </button>
      </div>

      {error && (
        <div style={{ color: theme.divergent, fontSize: '11px', marginBottom: '10px' }}>
          ⚠ {error}
        </div>
      )}

      {data && (
        <>
          {/* Summary stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '8px', marginBottom: '14px' }}>
            {([
              { label: 'Built', count: data.summary.built, color: theme.verified },
              { label: 'Source-only', count: data.summary.sourceOnly, color: theme.warning },
              { label: 'Stub', count: data.summary.stub, color: theme.unknown },
              { label: 'Archive candidates', count: data.summary.archiveCandidates, color: theme.divergent },
            ]).map((stat) => (
              <div
                key={stat.label}
                style={{
                  padding: '10px 12px',
                  background: theme.surfaceDeep,
                  border: `1px solid ${stat.color}33`,
                  borderRadius: theme.radiusSmall,
                }}
              >
                <div style={{ fontSize: '20px', fontWeight: 700, color: stat.color }}>
                  {stat.count}
                </div>
                <div style={{ fontSize: '10px', color: theme.textDim, marginTop: '2px' }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          {/* Filter buttons */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
            {(['all', 'BUILT', 'SOURCE-ONLY', 'STUB'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: '4px 12px',
                  borderRadius: theme.radiusPill,
                  border: `1px solid ${filter === f ? theme.accent : theme.border}`,
                  background: filter === f ? `${theme.accent}15` : 'transparent',
                  color: filter === f ? theme.accent : theme.textMuted,
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {f === 'all' ? 'All' : CLASS_LABELS[f]}
              </button>
            ))}
          </div>

          {/* Promotion risk summary */}
          <div
            style={{
              padding: '12px 14px',
              background: theme.surfaceDeep,
              border: `1px solid ${theme.border}`,
              borderRadius: theme.radiusSmall,
              marginBottom: '14px',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 600, color: theme.textMuted, marginBottom: '6px' }}>
              Promotion Risk
            </div>
            <div style={{ fontSize: '11px', color: theme.textDim, marginBottom: '6px' }}>
              <span style={{ color: theme.verified, fontWeight: 600 }}>Lowest-risk:</span>{' '}
              {data.summary.lowestRiskPromotions.length} packages depend only on `types`
            </div>
            <div style={{ fontSize: '11px', color: theme.textDim }}>
              <span style={{ color: theme.warning, fontWeight: 600 }}>Blocked by sdk:</span>{' '}
              {data.summary.blockedBySdk.length} packages require sdk promotion first
            </div>
          </div>

          {/* Package list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {filteredNodes.map((node) => {
              const color = CLASS_COLORS[node.classification];
              const isLowestRisk = data.summary.lowestRiskPromotions.includes(node.name);
              const isBlocked = data.summary.blockedBySdk.includes(node.name);
              return (
                <div
                  key={node.name}
                  style={{
                    padding: '10px 12px',
                    background: theme.surfaceDeep,
                    border: `1px solid ${color}22`,
                    borderRadius: theme.radiusSmall,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                  }}
                >
                  {/* Status dot */}
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: color,
                      flexShrink: 0,
                      marginTop: '4px',
                    }}
                  />
                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: theme.text, fontFamily: theme.fontMono }}>
                        {node.name}
                      </span>
                      <span
                        style={{
                          padding: '1px 8px',
                          borderRadius: theme.radiusPill,
                          fontSize: '9px',
                          fontWeight: 700,
                          color,
                          background: `${color}12`,
                          border: `1px solid ${color}33`,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {CLASS_LABELS[node.classification]}
                      </span>
                      {isLowestRisk && (
                        <span style={{ fontSize: '9px', color: theme.verified, fontWeight: 600 }}>
                          ↓ lowest-risk
                        </span>
                      )}
                      {isBlocked && (
                        <span style={{ fontSize: '9px', color: theme.warning, fontWeight: 600 }}>
                          ⛔ blocked by sdk
                        </span>
                      )}
                      <span style={{ fontSize: '10px', color: theme.textDim, marginLeft: 'auto' }}>
                        {node.lines} lines
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: theme.textMuted, marginTop: '3px' }}>
                      {node.specRole}
                    </div>
                    {node.dependsOn.length > 0 && (
                      <div style={{ fontSize: '10px', color: theme.textDim, marginTop: '4px', fontFamily: theme.fontMono }}>
                        ← {node.dependsOn.map((d) => d.replace('@oceanicos/', '').replace('@omega-v/', '')).join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
