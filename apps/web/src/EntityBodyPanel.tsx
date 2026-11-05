import { useEffect, useState } from 'react';
import { theme } from './oceanicosTheme';

/*
 * ENTITY OS BODY — the seven organs as this machine actually holds them.
 *
 * Every row is read from `/v1/entity/body`, which stats the real file and
 * hashes it. Nothing here is narrated: a missing organ reads MISSING.
 */

const API_BASE_URL = (import.meta.env?.VITE_API_URL || '/api').replace(/\/$/, '');

type Organ = {
  layer: number;
  organ: string;
  role: string;
  implementation: string;
  path: string;
  status: 'PRESENT' | 'MISSING';
  bytes: number | null;
  digest: string | null;
};

type Body = {
  status: 'ALIVE' | 'INCOMPLETE';
  brandChecksum: string;
  law: string;
  bodyDigest: string;
  organs: Organ[];
  missing: string[];
  evaluatedAt: string;
};

const ORGAN_TONE: Record<string, string> = {
  Soul: theme.accentWarm,
  Face: theme.accent,
  Mind: theme.accent,
  Shield: '#22c55e',
  Hands: theme.accentWarm,
  Judge: '#a78bfa',
  Memory: theme.accent,
};

export function EntityBodyPanel() {
  const [body, setBody] = useState<Body | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/v1/entity/body`);
        if (!response.ok) throw new Error(`Anatomy unread (${response.status})`);
        const payload = await response.json();
        if (!active) return;
        setBody(payload?.body ?? null);
        setError(payload?.body ? null : 'Anatomy unread from the API.');
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Anatomy unread from the API.');
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const alive = body?.status === 'ALIVE';
  const tone = body ? (alive ? '#22c55e' : theme.warning) : theme.unknown;

  return (
    <section
      aria-label="Entity OS body anatomy"
      style={{
        border: `1px solid ${theme.border}`,
        borderRadius: theme.radius,
        background: 'rgba(2, 6, 23, 0.62)',
        padding: '14px 16px',
        marginBottom: '20px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
          marginBottom: '12px',
        }}
      >
        <span
          style={{
            fontFamily: theme.fontMono,
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '0.24em',
            color: theme.accent,
            textTransform: 'uppercase',
          }}
        >
          Entity OS Body · Seven Organs
        </span>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            fontFamily: theme.fontMono,
            fontSize: '9.5px',
            letterSpacing: '0.1em',
            color: theme.textDim,
          }}
        >
          <span>CHECKSUM {body?.brandChecksum ?? '30013030'}</span>
          <span data-state={body?.status ?? 'UNKNOWN'} style={{ color: tone, fontWeight: 700 }}>
            {error ? 'UNREAD' : (body?.status ?? '…')}
          </span>
        </div>
      </div>

      {error ? (
        <p style={{ margin: 0, color: theme.textMuted, fontSize: '12px' }}>
          {error} — the anatomy is not asserted from memory.
        </p>
      ) : (
        <>
          {body?.soul && (
            <div
              style={{
                marginBottom: '12px',
                padding: '10px 12px',
                border: `1px dashed ${theme.border}`,
                borderRadius: '6px',
                background: 'rgba(2, 6, 23, 0.72)',
              }}
            >
              <div
                style={{
                  fontFamily: theme.fontMono,
                  fontSize: '8.5px',
                  letterSpacing: '0.16em',
                  color: theme.accentWarm,
                  marginBottom: '6px',
                }}
              >
                THE ROOT IT ANSWERS TO · 00_SOUL/human_root.txt
              </div>
              <pre
                aria-label="Entity soul intent"
                style={{
                  margin: 0,
                  maxHeight: '150px',
                  overflowY: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontFamily: theme.fontMono,
                  fontSize: '9.5px',
                  lineHeight: 1.6,
                  color: theme.textMuted,
                }}
              >
                {body.soul.trim()}
              </pre>
            </div>
          )}
          <ul
            className="entity-organ-grid"
            style={{ display: 'grid', listStyle: 'none', gap: '8px', margin: 0, padding: 0 }}
          >
            {(body?.organs ?? []).map((organ) => (
              <li
                key={organ.layer}
                style={{
                  padding: '8px 10px',
                  borderLeft: `2px solid ${ORGAN_TONE[organ.organ] ?? theme.accent}`,
                  borderRadius: '6px',
                  background: 'rgba(15, 23, 42, 0.5)',
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    gap: '6px',
                  }}
                >
                  <span style={{ fontSize: '11px', color: theme.text, fontWeight: 600 }}>
                    L{organ.layer} · {organ.organ}
                  </span>
                  <span
                    style={{
                      fontFamily: theme.fontMono,
                      fontSize: '8.5px',
                      letterSpacing: '0.08em',
                      color: organ.status === 'PRESENT' ? '#22c55e' : theme.divergent,
                    }}
                  >
                    {organ.status}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: '10.5px',
                    color: theme.textMuted,
                    lineHeight: 1.45,
                    marginTop: '3px',
                  }}
                >
                  {organ.role}
                </div>
                <div
                  title={organ.path}
                  style={{
                    fontFamily: theme.fontMono,
                    fontSize: '8.5px',
                    color: theme.textDim,
                    marginTop: '5px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {organ.path} · {organ.digest ? `${organ.digest.slice(0, 10)}…` : 'unread'}
                </div>
              </li>
            ))}
          </ul>
          <p
            style={{
              margin: '10px 0 0',
              fontFamily: theme.fontMono,
              fontSize: '9px',
              letterSpacing: '0.06em',
              color: theme.textDim,
            }}
          >
            BODY · {body ? `${body.bodyDigest.slice(0, 16)}…` : '—'} ·{' '}
            {body?.law ?? 'Ω∞v ::= VERIFY(ΔREALITY)'}
            {body?.missing.length ? ` · MISSING ${body.missing.join(', ')}` : ''}
          </p>
        </>
      )}
    </section>
  );
}
