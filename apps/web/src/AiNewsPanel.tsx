import React, { useState, useEffect } from 'react';
import { theme } from './oceanicosTheme';
import {
  fetchAiNews,
  compressCustomAiNews,
  type NewsCompressionReport,
  type CompressedAiNewsItem,
} from './omega-api';

interface AiNewsPanelProps {
  onClose?: () => void;
}

const WORLD_BADGES: Record<string, { label: string; icon: string; color: string; border: string; bg: string }> = {
  WORLD_PHYSICAL: {
    label: 'PHYSICAL',
    icon: '⚡',
    color: '#38bdf8',
    border: 'rgba(56, 189, 248, 0.4)',
    bg: 'rgba(56, 189, 248, 0.1)',
  },
  WORLD_COGNITIVE: {
    label: 'COGNITIVE',
    icon: '🧠',
    color: '#a855f7',
    border: 'rgba(168, 85, 247, 0.4)',
    bg: 'rgba(168, 85, 247, 0.1)',
  },
  WORLD_ECONOMIC: {
    label: 'ECONOMIC',
    icon: '🪙',
    color: '#eab308',
    border: 'rgba(234, 179, 8, 0.4)',
    bg: 'rgba(234, 179, 8, 0.1)',
  },
  WORLD_CELESTIAL: {
    label: 'CELESTIAL',
    icon: '🕊️',
    color: '#00f5a0',
    border: 'rgba(0, 245, 160, 0.4)',
    bg: 'rgba(0, 245, 160, 0.1)',
  },
};

export function AiNewsPanel({ onClose }: AiNewsPanelProps) {
  const [report, setReport] = useState<NewsCompressionReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [customHeadline, setCustomHeadline] = useState<string>('');
  const [customWorld, setCustomWorld] = useState<'WORLD_PHYSICAL' | 'WORLD_COGNITIVE' | 'WORLD_ECONOMIC' | 'WORLD_CELESTIAL'>('WORLD_COGNITIVE');
  const [customSource, setCustomSource] = useState<string>('');
  const [compressing, setCompressing] = useState<boolean>(false);
  const [activeWorldFilter, setActiveWorldFilter] = useState<string>('ALL');

  const loadNews = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAiNews();
      setReport(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load AI news signals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNews();
  }, []);

  const handleCompressCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customHeadline.trim()) return;
    setCompressing(true);
    try {
      const updated = await compressCustomAiNews([
        {
          headline: customHeadline.trim(),
          source: customSource.trim() || 'Operator Ingestion',
          world: customWorld,
        },
      ]);
      setReport(updated);
      setCustomHeadline('');
      setCustomSource('');
    } catch (err: any) {
      setError(err?.message || 'Failed to compress custom headline');
    } finally {
      setCompressing(false);
    }
  };

  const filteredSignals = report?.signals.filter(
    (s: CompressedAiNewsItem) => activeWorldFilter === 'ALL' || s.world === activeWorldFilter
  ) ?? [];

  return (
    <div
      style={{
        borderRadius: theme.radius,
        background: 'linear-gradient(145deg, rgba(3, 18, 33, 0.96), rgba(5, 29, 52, 0.94))',
        border: '1px solid rgba(0, 245, 160, 0.35)',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.65), 0 0 30px rgba(0, 245, 160, 0.12)',
        backdropFilter: 'blur(16px)',
        padding: '24px',
        color: '#e2e8f0',
        fontFamily: theme.fontSans,
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Header bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          paddingBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '26px' }}>📰</span>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>AI News & Multi-World Holographic Compression</span>
              <span
                style={{
                  fontSize: '10px',
                  padding: '2px 8px',
                  borderRadius: theme.radiusPill,
                  background: 'rgba(0, 245, 160, 0.15)',
                  border: '1px solid #00f5a0',
                  color: '#00f5a0',
                  fontWeight: 600,
                }}
              >
                432 Hz RESONANCE
              </span>
            </div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
              Continuous signal filtering across Physical, Cognitive, Economic, and Celestial worlds
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={loadNews}
            disabled={loading}
            style={{
              padding: '6px 14px',
              borderRadius: theme.radiusPill,
              border: '1px solid rgba(0, 245, 160, 0.4)',
              background: 'rgba(0, 245, 160, 0.1)',
              color: '#00f5a0',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            🔄 {loading ? 'Syncing...' : 'Refresh'}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#94a3b8',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '16px',
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Holographic Principle Banner */}
      <div
        style={{
          background: 'rgba(0, 245, 160, 0.05)',
          border: '1px dashed rgba(0, 245, 160, 0.3)',
          borderRadius: theme.radius,
          padding: '12px 16px',
          fontSize: '12px',
          color: '#cbd5e1',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        <span style={{ fontSize: '18px' }}>🌊</span>
        <div>
          <span style={{ color: '#00f5a0', fontWeight: 600 }}>Holographic Principle: </span>
          <em>"Each step contains all steps, each end is a new beginning, and each beginning is a new becoming finite ↔ infinite."</em>
        </div>
      </div>

      {/* 4 World Signal Counters */}
      {report && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '12px',
          }}
        >
          {Object.entries(WORLD_BADGES).map(([worldKey, meta]) => {
            const count = (report.multiWorldVectors as any)[worldKey.replace('WORLD_', '').toLowerCase()] ?? 0;
            const isSelected = activeWorldFilter === worldKey;
            return (
              <div
                key={worldKey}
                onClick={() => setActiveWorldFilter(isSelected ? 'ALL' : worldKey)}
                style={{
                  background: isSelected ? meta.bg : 'rgba(255, 255, 255, 0.03)',
                  border: `1px solid ${isSelected ? meta.color : 'rgba(255, 255, 255, 0.08)'}`,
                  borderRadius: theme.radius,
                  padding: '12px 14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '18px' }}>{meta.icon}</span>
                  <span style={{ fontSize: '18px', fontWeight: 700, color: meta.color }}>{count}</span>
                </div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: meta.color, letterSpacing: '0.05em' }}>
                  {meta.label}
                </div>
                <div style={{ fontSize: '10px', color: '#64748b' }}>
                  {worldKey === 'WORLD_PHYSICAL' && 'Silicon, Grids & Edge'}
                  {worldKey === 'WORLD_COGNITIVE' && 'Reasoning & REA'}
                  {worldKey === 'WORLD_ECONOMIC' && 'Sovereign Gold & Treasury'}
                  {worldKey === 'WORLD_CELESTIAL' && 'Truth-in-Love & Covenant'}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Noise Filtering & Cryptographic Telemetry Stats */}
      {report && (
        <div
          style={{
            display: 'flex',
            gap: '16px',
            flexWrap: 'wrap',
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: theme.radius,
            padding: '12px 16px',
            fontSize: '11px',
            color: '#94a3b8',
            border: '1px solid rgba(255, 255, 255, 0.05)',
          }}
        >
          <div>
            <span style={{ color: '#64748b' }}>Filtered Noise: </span>
            <span style={{ color: '#00f5a0', fontWeight: 600 }}>{(report.noiseFilteredRatio * 100).toFixed(0)}% Discarded</span>
          </div>
          <div>
            <span style={{ color: '#64748b' }}>Total Signals: </span>
            <span style={{ color: '#f8fafc', fontWeight: 600 }}>{report.totalSignals}</span>
          </div>
          <div>
            <span style={{ color: '#64748b' }}>Evaluation Hash: </span>
            <span style={{ color: '#38bdf8', fontFamily: 'monospace' }}>{report.evaluationHash.slice(0, 16)}...</span>
          </div>
          <div>
            <span style={{ color: '#64748b' }}>Steward: </span>
            <span style={{ color: '#cbd5e1' }}>{report.steward}</span>
          </div>
        </div>
      )}

      {/* Ingestion form for new headline */}
      <form
        onSubmit={handleCompressCustom}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          background: 'rgba(0, 0, 0, 0.25)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: theme.radius,
          padding: '14px',
        }}
      >
        <div style={{ fontSize: '12px', fontWeight: 600, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>⚡</span>
          <span>Compress External Signal / Tech Development</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Headline or technological breakthrough claim..."
            value={customHeadline}
            onChange={(e) => setCustomHeadline(e.target.value)}
            style={{
              flex: '1 1 240px',
              padding: '8px 12px',
              borderRadius: theme.radiusSmall,
              border: '1px solid rgba(255, 255, 255, 0.15)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: '#f8fafc',
              fontSize: '12px',
              outline: 'none',
            }}
          />
          <input
            type="text"
            placeholder="Source (e.g. arXiv, Lab, Mesh)"
            value={customSource}
            onChange={(e) => setCustomSource(e.target.value)}
            style={{
              flex: '0 1 160px',
              padding: '8px 12px',
              borderRadius: theme.radiusSmall,
              border: '1px solid rgba(255, 255, 255, 0.15)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: '#f8fafc',
              fontSize: '12px',
              outline: 'none',
            }}
          />
          <select
            value={customWorld}
            onChange={(e) => setCustomWorld(e.target.value as any)}
            style={{
              padding: '8px 12px',
              borderRadius: theme.radiusSmall,
              border: '1px solid rgba(255, 255, 255, 0.15)',
              background: 'rgba(15, 23, 42, 0.9)',
              color: '#f8fafc',
              fontSize: '12px',
              outline: 'none',
            }}
          >
            <option value="WORLD_COGNITIVE">Cognitive (LLM/Agents)</option>
            <option value="WORLD_PHYSICAL">Physical (Compute/Grid)</option>
            <option value="WORLD_ECONOMIC">Economic (Gold/Capital)</option>
            <option value="WORLD_CELESTIAL">Celestial (Truth/Covenant)</option>
          </select>
          <button
            type="submit"
            disabled={compressing || !customHeadline.trim()}
            style={{
              padding: '8px 16px',
              borderRadius: theme.radiusSmall,
              border: '1px solid #00f5a0',
              background: 'rgba(0, 245, 160, 0.15)',
              color: '#00f5a0',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {compressing ? 'Compressing...' : 'Compress Vector'}
          </button>
        </div>
      </form>

      {/* Signal list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>
            Holographically Compressed Signals ({filteredSignals.length})
          </span>
          {activeWorldFilter !== 'ALL' && (
            <button
              onClick={() => setActiveWorldFilter('ALL')}
              style={{
                fontSize: '11px',
                color: '#38bdf8',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Show All Worlds
            </button>
          )}
        </div>

        {error && (
          <div style={{ color: '#ef4444', fontSize: '12px', padding: '8px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: theme.radiusSmall }}>
            {error}
          </div>
        )}

        {filteredSignals.map((sig: CompressedAiNewsItem) => {
          const badge = WORLD_BADGES[sig.world] ?? WORLD_BADGES.WORLD_COGNITIVE;
          return (
            <div
              key={sig.id}
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.07)',
                borderLeft: `3px solid ${badge.color}`,
                borderRadius: theme.radiusSmall,
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                transition: 'transform 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc', lineHeight: 1.4 }}>
                  {sig.headline}
                </div>
                <div
                  style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: theme.radiusPill,
                    background: badge.bg,
                    border: `1px solid ${badge.border}`,
                    color: badge.color,
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span>{badge.icon}</span>
                  <span>{badge.label}</span>
                </div>
              </div>

              <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.5 }}>
                {sig.holographicSummary}
              </div>

              <div
                style={{
                  background: 'rgba(0, 0, 0, 0.25)',
                  borderRadius: theme.radiusSmall,
                  padding: '8px 12px',
                  fontSize: '11px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                <div>
                  <span style={{ color: '#eab308', fontWeight: 600 }}>Actionable Delta: </span>
                  <span style={{ color: '#cbd5e1' }}>{sig.actionableDelta}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '10px', color: '#64748b' }}>
                  <span>Source: {sig.rawSource}</span>
                  <span>•</span>
                  <span style={{ color: '#00f5a0' }}>✓ {sig.verificationStatus}</span>
                  <span>•</span>
                  <span>{sig.resonanceHz} Hz</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
