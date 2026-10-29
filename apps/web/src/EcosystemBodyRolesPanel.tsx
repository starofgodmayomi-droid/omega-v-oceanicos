import React from 'react';
import { theme } from './oceanicosTheme';

/**
 * KAI / ELION / OMEGA status, read from `GET /v1/body` (see ECOSYSTEM_BODY.md).
 *
 * Each role reports only what the API process observed: KAI's recorded
 * continuity, ELION's bound executor, and OMEGA's judgment of the local ledger.
 * None of it is deployment health, and none of it grants authority.
 */
type Props = {
  roles: any;
};

const UNKNOWN_LABEL = 'UNKNOWN';

const statusColor = (status: string): string => {
  switch (status) {
    case 'VERIFIED':
    case 'BOUND':
      return theme.verified;
    case 'DIVERGENT':
      return theme.divergent;
    case 'NOT_EXECUTED':
      return theme.warning;
    default:
      return theme.unknown;
  }
};

const upper = (value: unknown): string =>
  typeof value === 'string' && value.trim() ? value.trim().toUpperCase() : UNKNOWN_LABEL;

function RoleCard({ glyph, name, role, status, detail }: {
  glyph: string;
  name: string;
  role: string;
  status: string;
  detail: string;
}) {
  return (
    <div className="body-role">
      <div className="body-role-head">
        <b aria-hidden="true">{glyph}</b>
        <span className="body-role-name">{name}</span>
        <small>{role}</small>
      </div>
      <strong className="body-role-status" style={{ color: statusColor(status) }}>{status}</strong>
      <small className="body-role-detail">{detail}</small>
    </div>
  );
}

export function EcosystemBodyRolesPanel({ roles }: Props) {
  const kai = roles?.kai;
  const elion = roles?.elion;
  const omega = roles?.omega;

  const recorded = typeof kai?.recorded === 'number' ? kai.recorded : null;
  const latest = kai?.latest;
  const kaiStatus = latest ? upper(latest.status) : UNKNOWN_LABEL;
  const kaiDetail = recorded === null
    ? 'no continuity reported by the API'
    : `${recorded} cycle(s) recorded · ${latest?.source ?? 'no drop yet'}`;

  const elionStatus = elion?.executor ? 'BOUND' : UNKNOWN_LABEL;
  const elionDetail = elion?.executor
    ? `${elion.executor} · executes only authorized records`
    : 'no executor reported by the API';

  const judgment = omega?.judgment;
  const omegaStatus = upper(judgment?.status);
  const omegaDetail = judgment?.evidence ?? 'no judgment reported by the API';

  return (
    <section className="body-roles" aria-label="KAI, ELION and OMEGA status">
      <div className="body-roles-heading">
        <span>ECOSYSTEM BODY · MIND · HANDS · JUDGE</span>
        <small>Reported by this API process · not deployment health</small>
      </div>
      <div className="body-roles-grid">
        <RoleCard glyph="🧬" name="KAI" role="MIND" status={kaiStatus} detail={kaiDetail} />
        <RoleCard glyph="🖐" name="ELION" role="HANDS" status={elionStatus} detail={elionDetail} />
        <RoleCard glyph="Ω" name="OMEGA" role="JUDGE" status={omegaStatus} detail={omegaDetail} />
      </div>
    </section>
  );
}
