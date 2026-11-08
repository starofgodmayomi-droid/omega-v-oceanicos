import React, { useEffect, useMemo, useState } from 'react';

/**
 * ΩVØØS Entity — the visual architecture of one star topology.
 *
 * Reverse-engineered from the supplied image: a cybernetic squid at the
 * center (the VØØS orchestrator), OMEGA rings carrying the SHA-256 evidence
 * gate, golden KAI threads tethering every external call, sea life around the
 * rim (users, APIs, streams, markets) and the deep-water VØ underneath.
 *
 * Everything drawn here is bound to `GET /v1/entity/ovoos` and its own
 * observations. A ring is ACTIVE only when the gate region is VERIFIED, a
 * thread glows gold only when its record was observed, and the footer keeps
 * the evidence boundary visible. The image is a declaration, not a proof.
 */

const API_BASE_URL = (import.meta.env?.VITE_API_URL || '/api').replace(/\/$/, '');

const CYAN = '#00f0ff';
const GOLD = '#ffc800';
const NAVY = '#050a12';
const SLATE = '#4a5a6a';

const EVIDENCE_COLOR: Record<string, string> = {
  VERIFIED: CYAN,
  SUPPORTED: '#38bdf8',
  UNVERIFIED: GOLD,
  UNKNOWN: SLATE,
  ABSENT: SLATE,
};

type RegionRecord = {
  index: number;
  id: string;
  name: string;
  role: string;
  source: string;
  status: string;
  evidence: string;
};

type Region = { region: string; meaning: string; status: string; records: RegionRecord[] };

type EntityRead = {
  success: boolean;
  evaluatedAt?: string;
  status: string;
  entity: string;
  nodeTopology: string;
  gate: string;
  connections: string;
  phaseT: string;
  evidenceHash: string | null;
  synchrony: number;
  action: string;
  nextDelta: string;
  gameDetected: boolean;
  regions: Region[];
  upgrade: { execution: string; candidate: { action: string; digest: string } | null };
  evidenceBoundary: string;
  compression?: { count?: number; filled?: number; digest?: string; regions?: unknown[] };
  expansion?: { status: string; records: RegionRecord[]; digestMatches: boolean } | null;
};

const SHORT_LABEL: Record<string, string> = {
  'voos-orchestrator': 'VØØS',
  'expected-observed': 'EXPECTED ≡ OBSERVED',
  'sha256-evidence': 'SHA-256',
  'append-only-ledger': 'LEDGER',
  'kai-shield': 'KAI SHIELD',
  'authority-gate': 'AUTHORITY',
  'mesh-convergence': 'MESH',
  'public-interface': 'GLOBER',
  'sovereign-store': 'VØ',
};

/**
 * Declared ring placement: the star the supplied image draws. The
 * orchestrator is the center itself, so it carries the core caption instead
 * of a rim node.
 */
const NODE_PLACEMENT: Record<string, { angle: number; radius: number }> = {
  'expected-observed': { angle: 90, radius: 132 },
  'sha256-evidence': { angle: 20, radius: 78 },
  'append-only-ledger': { angle: 224, radius: 78 },
  'kai-shield': { angle: 318, radius: 145 },
  'authority-gate': { angle: 44, radius: 145 },
  'mesh-convergence': { angle: 138, radius: 145 },
  'public-interface': { angle: 250, radius: 182 },
  'sovereign-store': { angle: 298, radius: 182 },
};

const CENTER = { x: 280, y: 200 };
const VIEW = { width: 560, height: 400 };

const positionFor = (id: string) => {
  const placement = NODE_PLACEMENT[id] ?? { angle: 0, radius: 160 };
  const radians = (placement.angle * Math.PI) / 180;
  return {
    x: CENTER.x + Math.cos(radians) * placement.radius,
    y: CENTER.y - Math.sin(radians) * placement.radius,
  };
};

const gateWord = (gate: string) => (gate.replace('OMEGA_RINGS_', '') || 'UNKNOWN');
const threadWord = (threads: string) => (threads.replace('KAI_THREADS_', '') || 'UNKNOWN');

export function OvoosEntityPanel() {
  const [entity, setEntity] = useState<EntityRead | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<{ count: number; digestMatches: boolean } | null>(null);
  const [expanding, setExpanding] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/v1/entity/ovoos`);
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error || `entity read failed (${response.status})`);
        if (!cancelled) {
          setEntity(payload);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'entity unavailable');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const expand = async () => {
    if (!entity?.compression) return;
    setExpanding(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/v1/entity/ovoos/expand`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ compression: entity.compression }),
      });
      const payload = await response.json();
      if (!response.ok || payload?.status !== 'EXPANDED') {
        throw new Error(payload?.issues?.[0]?.message || `expansion refused (${response.status})`);
      }
      setExpanded({ count: payload.records?.length ?? 0, digestMatches: Boolean(payload.digestMatches) });
    } catch (err) {
      setExpanded(null);
      setError(err instanceof Error ? err.message : 'expansion unavailable');
    } finally {
      setExpanding(false);
    }
  };

  const records = useMemo(
    () => (entity?.regions ?? []).flatMap((region) => region.records),
    [entity],
  );

  const orchestrator = records.find((record) => record.id === 'voos-orchestrator');
  const rimRecords = records.filter((record) => record.id !== 'voos-orchestrator');

  /** Aural spectrum derived from the evidence digest — not a measurement of sound. */
  const spectrum = useMemo(() => {
    const hex = entity?.evidenceHash ?? '';
    const bytes = hex.match(/.{1,2}/g) ?? [];
    return bytes.slice(0, 32).map((pair, index) => {
      const value = parseInt(pair, 16);
      return { index, height: Number.isFinite(value) ? 4 + (value % 26) : 4 };
    });
  }, [entity?.evidenceHash]);

  const statusColor =
    entity?.status === 'VERIFIED'
      ? CYAN
      : entity?.status === 'DIVERGENT'
        ? '#ef4444'
        : GOLD;

  return (
    <section className="ovoos-entity" aria-label="ΩVØØS entity architecture">
      <header className="ovoos-header">
        <div>
          <h3>THE OCEANICOS</h3>
          <p>ΩVØØS ENTITY · ULTIMATE FULL-STACK MARINE INTELLIGENCE</p>
        </div>
        <span className="ovoos-contract">{entity?.entity ?? 'ΩVØØS_CYBERNETIC_SQUID'}</span>
      </header>

      <div className="ovoos-body">
        <div className="ovoos-diagram">
          <svg
            viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
            role="img"
            aria-label={`ΩVØØS entity: ${entity?.status ?? 'UNKNOWN'}; OMEGA gate ${gateWord(entity?.gate ?? '')}; KAI threads ${threadWord(entity?.connections ?? '')}`}
          >
            <defs>
              <radialGradient id="ovoos-core" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={CYAN} stopOpacity="0.42" />
                <stop offset="60%" stopColor={CYAN} stopOpacity="0.08" />
                <stop offset="100%" stopColor={CYAN} stopOpacity="0" />
              </radialGradient>
              <linearGradient id="ovoos-ray" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={GOLD} stopOpacity="0.16" />
                <stop offset="100%" stopColor={GOLD} stopOpacity="0" />
              </linearGradient>
              <pattern id="ovoos-grid" width="34" height="34" patternUnits="userSpaceOnUse">
                <path d="M 34 0 L 0 0 0 34" fill="none" stroke={CYAN} strokeOpacity="0.07" strokeWidth="1" />
              </pattern>
            </defs>

            <rect width={VIEW.width} height={VIEW.height} fill={NAVY} />
            <rect width={VIEW.width} height={VIEW.height} fill="url(#ovoos-grid)" />
            {[110, 210, 310, 410, 510].map((x) => (
              <polygon key={x} points={`${x - 40},0 ${x + 40},0 ${x + 150},400 ${x - 150},400`} fill="url(#ovoos-ray)" opacity="0.35" />
            ))}
            <circle cx={CENTER.x} cy={CENTER.y} r="150" fill="url(#ovoos-core)" />

            {/* OMEGA rings — the SHA-256 gate */}
            <g className="ovoos-ring" style={{ transformOrigin: `${CENTER.x}px ${CENTER.y}px` }}>
              <circle cx={CENTER.x} cy={CENTER.y} r="96" fill="none" stroke={CYAN} strokeOpacity="0.42" strokeWidth="1.4" strokeDasharray="2 7" />
              <circle cx={CENTER.x} cy={CENTER.y} r="96" fill="none" stroke={CYAN} strokeOpacity="0.9" strokeWidth="1.4" strokeDasharray="46 420" />
            </g>
            <g className="ovoos-ring ovoos-ring-slow" style={{ transformOrigin: `${CENTER.x}px ${CENTER.y}px` }}>
              <circle cx={CENTER.x} cy={CENTER.y} r="78" fill="none" stroke={GOLD} strokeOpacity="0.86" strokeWidth="2" />
              <circle cx={CENTER.x} cy={CENTER.y} r="72" fill="none" stroke={GOLD} strokeOpacity="0.3" strokeWidth="1" strokeDasharray="1 5" />
            </g>
            <circle cx={CENTER.x} cy={CENTER.y} r="62" fill="none" stroke={CYAN} strokeOpacity="0.2" strokeWidth="1" />

            {/* The squid — VØØS at the center */}
            <g className="ovoos-squid" transform="translate(-60 0)" stroke={CYAN} strokeOpacity="0.85" strokeWidth="1.4" fill={CYAN} fillOpacity="0.07">
              <path d="M340 128 C374 130 390 162 385 196 C380 224 362 238 340 238 C318 238 300 224 295 196 C290 162 306 130 340 128 Z" />
              <path d="M340 128 C356 134 368 150 372 170 C374 184 372 196 368 206 C384 190 392 168 386 150 C378 132 360 126 340 128 Z" fill="none" />
              <path d="M340 128 C324 134 312 150 308 170 C306 184 308 196 312 206 C296 190 288 168 294 150 C302 132 320 126 340 128 Z" fill="none" />
              <circle cx="326" cy="158" r="3.4" fill={GOLD} fillOpacity="0.9" stroke="none" />
              <circle cx="354" cy="158" r="3.4" fill={GOLD} fillOpacity="0.9" stroke="none" />
              {[0, 1, 2, 3, 4, 5].map((tentacle) => {
                const startX = 314 + tentacle * 10.4;
                const drift = (tentacle - 2.5) * 14;
                return (
                  <path
                    key={tentacle}
                    d={`M${startX} 236 C${startX + drift} 262 ${startX - drift} 288 ${startX + drift * 1.3} 318`}
                    fill="none"
                    strokeOpacity={0.55 + tentacle * 0.05}
                  />
                );
              })}
              <path d="M296 300 L340 288 L384 300" fill="none" stroke={GOLD} strokeOpacity="0.4" strokeDasharray="3 4" />
            </g>

            {/* The orchestrator is the center: one caption, no rim node. */}
            <text
              x={CENTER.x}
              y="336"
              textAnchor="middle"
              fill={CYAN}
              fontSize="11"
              fontFamily="'JetBrains Mono', 'DM Mono', monospace"
              letterSpacing="0.1em"
            >
              VØØS ORCHESTRATOR · {orchestrator?.status ?? 'UNKNOWN'}
            </text>

            {/* Golden threads — KAI Shield tethering every record */}
            {rimRecords.map((record) => {
              const point = positionFor(record.id);
              const color = EVIDENCE_COLOR[record.evidence] ?? SLATE;
              return (
                <g key={`thread-${record.id}`}>
                  <line
                    x1={CENTER.x}
                    y1={CENTER.y}
                    x2={point.x}
                    y2={point.y}
                    stroke={GOLD}
                    strokeOpacity={record.evidence === 'VERIFIED' ? 0.62 : record.evidence === 'SUPPORTED' ? 0.4 : 0.22}
                    strokeWidth="1"
                    strokeDasharray={record.evidence === 'VERIFIED' ? undefined : '4 5'}
                  />
                  <circle cx={point.x} cy={point.y} r="2.6" fill={GOLD} />
                  <circle cx={point.x} cy={point.y} r="7" fill="none" stroke={color} strokeOpacity="0.7" strokeWidth="1" />
                  <text
                    x={point.x}
                    y={point.y - 12}
                    textAnchor="middle"
                    fill={color}
                    fontSize="11"
                    fontFamily="'JetBrains Mono', 'DM Mono', monospace"
                    letterSpacing="0.06em"
                  >
                    {SHORT_LABEL[record.id] ?? record.id.toUpperCase()}
                  </text>
                  <text
                    x={point.x}
                    y={point.y + 19}
                    textAnchor="middle"
                    fill={SLATE}
                    fontSize="10"
                    fontFamily="'JetBrains Mono', 'DM Mono', monospace"
                  >
                    {record.status}
                  </text>
                </g>
              );
            })}

            {/* Targeting brackets around the core */}
            <path d={`M${CENTER.x - 112} ${CENTER.y - 76} h-14 v14`} fill="none" stroke={GOLD} strokeOpacity="0.6" />
            <path d={`M${CENTER.x + 112} ${CENTER.y - 76} h14 v14`} fill="none" stroke={GOLD} strokeOpacity="0.6" />
            <path d={`M${CENTER.x - 112} ${CENTER.y + 76} h-14 v-14`} fill="none" stroke={GOLD} strokeOpacity="0.6" />
            <path d={`M${CENTER.x + 112} ${CENTER.y + 76} h14 v-14`} fill="none" stroke={GOLD} strokeOpacity="0.6" />
          </svg>
        </div>

        <aside className="ovoos-readout" aria-label="Entity readout">
          <div className="ovoos-status" style={{ borderColor: statusColor, color: statusColor }}>
            SYSTEM STATUS · {entity?.status === 'VERIFIED' ? 'UNIFIED INTELLIGENCE ACTIVE' : entity?.status ?? 'UNKNOWN'}
          </div>
          {loading && <p className="ovoos-note">Reading the entity…</p>}
          {error && (
            <p className="ovoos-error" role="status">
              Entity read failed · {error}
            </p>
          )}

          <dl className="ovoos-metrics">
            <div>
              <dt>NEURAL SYNCHRONY</dt>
              <dd>{entity ? `${entity.synchrony}%` : '—'}</dd>
              <small>regions whose every record is VERIFIED</small>
            </div>
            <div>
              <dt>OMEGA GATE · SHA-256</dt>
              <dd style={{ color: entity?.gate === 'OMEGA_RINGS_ACTIVE' ? CYAN : GOLD }}>
                {entity ? gateWord(entity.gate) : '—'}
              </dd>
              <small>evidence digest rechecked on read</small>
            </div>
            <div>
              <dt>KAI THREADS</dt>
              <dd style={{ color: entity?.connections === 'KAI_THREADS_SECURED' ? CYAN : GOLD }}>
                {entity ? threadWord(entity.connections) : '—'}
              </dd>
              <small>every external call is tethered</small>
            </div>
            <div>
              <dt>PHASE T</dt>
              <dd>{entity?.phaseT ?? '—'}</dd>
              <small>declared label, not measured</small>
            </div>
          </dl>

          <div className="ovoos-wave" aria-label="Aural spectrum derived from the evidence digest">
            <span>4D ACOUSTIC SONAR ARRAY · HIGH-FREQUENCY CRANIAL MELON</span>
            <div>
              {spectrum.map((bar) => (
                <i key={bar.index} style={{ height: `${bar.height}px` }} />
              ))}
            </div>
            <small>aural spectrum derived from the evidence digest</small>
          </div>

          <div className="ovoos-actions">
            <button type="button" onClick={expand} disabled={expanding || !entity?.compression}>
              {expanding ? 'EXPANDING…' : 'EXPAND ENTITY'}
            </button>
            <span>
              {expanded
                ? `${expanded.count} records restored · digest ${expanded.digestMatches ? 'matches' : 'DIVERGENT'}`
                : entity?.evidenceHash
                  ? `digest ${entity.evidenceHash.slice(0, 12)}… · ${entity.compression?.count ?? 0} records in ${entity.compression?.filled ?? 0} regions`
                  : 'no compressed entity yet'}
            </span>
          </div>

          <p className="ovoos-upgrade">
            NEXT DELTA · {entity?.nextDelta ?? 'AWAITING EVIDENCE'} · UPGRADE {entity?.upgrade?.execution ?? 'NOT_EXECUTED'}
            {entity?.upgrade?.candidate ? ` · ${entity.upgrade.candidate.action}` : ''}
          </p>
          <p className="ovoos-action-line">{entity?.action ?? 'No entity observed yet.'}</p>
        </aside>
      </div>

      <div className="ovoos-regions">
        {(entity?.regions ?? []).map((region) => (
          <article key={region.region} className="ovoos-region">
            <header>
              <b>{region.region}</b>
              <span style={{ color: EVIDENCE_COLOR[region.status] ?? SLATE }}>{region.status}</span>
            </header>
            <p>{region.meaning}</p>
            <ul>
              {region.records.map((record) => (
                <li key={record.id}>
                  <span>{record.name}</span>
                  <em style={{ color: EVIDENCE_COLOR[record.evidence] ?? SLATE }}>{record.status}</em>
                  <small>{record.source}</small>
                </li>
              ))}
            </ul>
          </article>
        ))}
        {!entity?.regions?.length && !loading && (
          <p className="ovoos-note">The API has not answered with an entity yet.</p>
        )}
      </div>

      <footer className="ovoos-footer">
        <span>HABITAT RANGE: ALL OCEAN ZONES</span>
        <span>LIMB PROTOTYPE (TENTACLE): VARIABLE GEOMETRY</span>
        <span>{entity?.evidenceHash ? `EVIDENCE ${entity.evidenceHash.slice(0, 16)}…` : 'EVIDENCE UNKNOWN'}</span>
        <small>{entity?.evidenceBoundary ?? 'Coordinates are a declared projection, not inferred truth.'}</small>
      </footer>
    </section>
  );
}
