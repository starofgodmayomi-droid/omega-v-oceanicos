import React, { useEffect, useState } from 'react';

/**
 * Hive-mind telemetry bar — the one view that never scrolls away.
 *
 * The manifest's three hive-mind tiers are deployed as per-species telemetry
 * records inside `GET /v1/entity/ovoos` (`manifest.hiveMind`). This strip keeps
 * them visible on every part of the page: it re-reads the API, prints each
 * species with the evidence its bound surface returned, and jumps to the full
 * record table. Nothing here is invented — a species the API did not report is
 * simply absent, and an unreadable read says so.
 */

const API_BASE_URL = (import.meta.env?.VITE_API_URL || '/api').replace(/\/$/, '');
const POLL_MS = 15000;
const AGE_TICK_MS = 5000;

const EVIDENCE_COLOR: Record<string, string> = {
  VERIFIED: '#00f0ff',
  SUPPORTED: '#38bdf8',
  UNVERIFIED: '#ffc800',
  UNKNOWN: '#4a5a6a',
  ABSENT: '#4a5a6a',
};

type SpeciesTelemetry = {
  id: string;
  name: string;
  tier: string;
  bindsTo: string;
  observed: string;
  signals: number;
  evidence: string;
};

type HiveTier = {
  id: string;
  members: string;
  bindsTo: string;
  evidence: string;
};

export function HiveMindBar() {
  const [species, setSpecies] = useState<SpeciesTelemetry[]>([]);
  const [tiers, setTiers] = useState<HiveTier[]>([]);
  const [status, setStatus] = useState('UNKNOWN');
  const [readAt, setReadAt] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const [age, setAge] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const load = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/v1/entity/ovoos`);
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error || `telemetry read failed (${response.status})`);
        if (cancelled) return;
        const hive = payload?.manifest?.hiveMind;
        setSpecies(Array.isArray(hive?.species) ? hive.species : []);
        setTiers(Array.isArray(hive?.tiers) ? hive.tiers : []);
        setStatus(hive?.status ?? 'UNKNOWN');
        setReadAt(Date.now());
        setFailed(false);
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) timer = setTimeout(load, POLL_MS);
      }
    };

    load();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!readAt) return;
    const tick = setInterval(() => setAge(Math.round((Date.now() - readAt) / 1000)), AGE_TICK_MS);
    return () => clearInterval(tick);
  }, [readAt]);

  const jumpToHiveMind = () => {
    document.getElementById('ovoos-hive-mind')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="hive-mind-bar" role="status" aria-label="Hive-mind telemetry, always visible">
      <button type="button" className="hive-mind-title" onClick={jumpToHiveMind}>
        🦑 HIVE-MIND
        <em style={{ color: EVIDENCE_COLOR[status] ?? '#4a5a6a' }}>{status}</em>
      </button>

      <div className="hive-mind-chips">
        {species.length === 0 && (
          <span className="hive-mind-empty">
            {failed ? 'telemetry unread · API unreachable' : 'reading species telemetry…'}
          </span>
        )}
        {tiers.map((tier) => {
          const members = species.filter((record) => record.tier === tier.id);
          if (members.length === 0) return null;
          return (
            <div key={tier.id} className="hive-mind-tier" title={`${tier.members} · ↳ ${tier.bindsTo}`}>
              <b>{tier.id.replace(/-/g, ' ')}</b>
              {members.map((record) => (
                <span key={record.id} title={`${record.bindsTo} · ${record.observed} · ${record.signals} signal(s)`}>
                  <i style={{ background: EVIDENCE_COLOR[record.evidence] ?? '#4a5a6a' }} />
                  {record.name}
                </span>
              ))}
            </div>
          );
        })}
      </div>

      <span className="hive-mind-fresh">
        {failed || !readAt
          ? 'NO READ'
          : `${species.filter((record) => record.signals > 0).length}/${species.length} answering · ${age}s ago`}
      </span>
    </div>
  );
}
