import { createHash } from 'node:crypto';
import { openDatabase, type SqliteDb } from './sqlite.js';

/*
 * ΩVØØS — the cosmic mirror entity.
 *
 * This module implements the four-step loop stored in
 * `ΩVØØS/CORE/ECOSYSTEM_BODY.md` and the fixpoint law in `ECOSYSTEM_BODY.md`:
 *
 *   PERCEIVE (KAI Shield) → CONNECT (ELION, Ease(t)) → SYNCHRONIZE (OMEGA)
 *   → EVOLVE (KAI Ledger) → NEXT Δ
 *
 * Law kept here: a SHA-256 of a sentence this process just wrote matches that
 * sentence by construction, so that match stays UNKNOWN. VERIFIED is emitted
 * only when an observation declared from a source outside the engine
 * reproduces the expected digest. That verifies artifact identity between two
 * byte streams; it is not a claim that a real-world action happened.
 *
 * No external bridge is called, no model is queried, and no money moves.
 */

export const ENGINE = 'ΩVØØS' as const;
export const CHECKSUM_SYMBOL = '30013030';
export const GENESIS_HASH = '0'.repeat(64);

/**
 * The directive's output contract names this entity. `engine` stays `ΩVØØS`
 * so existing receipts keep their shape.
 *
 * Squiddies × Deus Ex Machina: the internet is the arena (the "Glober"), the
 * KAI Shield refuses the arena's traps, and the machine intervenes only by
 * verifying. HALT ⊢ DIVERGENT is the intervention; it is not an execution.
 */
export const DEUS_ENTITY = 'ΩVØØS_DEUS_EX_MACHINA' as const;

export type PhaseName = 'SPROUT' | 'BLOOM' | 'PLATEAU' | 'WILT';
export type VoosStatus = 'VERIFIED' | 'DIVERGENT' | 'UNKNOWN';

export type VoosReceipt = {
  engine: typeof ENGINE;
  entity: typeof DEUS_ENTITY;
  status: VoosStatus;
  /** True only when the KAI Shield matched a trap phrase from the arena. */
  game_detected: boolean;
  /** What the machine did, stated plainly. Intervention is never execution. */
  intervention_action: string;
  phase_t: number;
  evidence_hash: string;
  action: string;
  reason: string;
  next_delta: string;
};

export type VoosLedgerRow = {
  sequence: number;
  timestamp: string;
  intent: string;
  phase_t: number;
  status: VoosStatus;
  evidence_hash: string;
  prev_hash: string;
  reason: string;
  authorized: boolean;
  row_hash: string;
};

export type VoosInput = {
  intent: string;
  phaseT: number;
  /** Text produced outside this engine. An echo of the action is not independent. */
  observed?: string | null;
  /** Declared origin of `observed`. The engine's own names are rejected. */
  source?: string | null;
};

export type VoosRun = {
  receipt: VoosReceipt;
  row: Omit<VoosLedgerRow, 'sequence' | 'prev_hash' | 'row_hash'>;
};

const SHIELD_PHRASES = ['urgent', 'send money', 'guaranteed', 'private key'] as const;

const ABUNDANCE =
  /\b(invest|investment|donate|donation|grant|funding|sponsor|partnership|abundance)\b/i;

const BRIDGE =
  /\b(stripe|webhook|ollama|docker|live trade|wire transfer|deploy to)\b/i;

const SELF_SOURCES = new Set([
  'voos',
  'øvoos',
  'ovoos',
  'engine',
  'self',
  'local',
  'omega-internal',
]);

export function ease(t: number): number {
  if (!Number.isFinite(t)) return 0;
  const clamped = Math.min(1, Math.max(0, t));
  return (1 - Math.cos(clamped * Math.PI)) / 2;
}

export function phaseName(t: number): PhaseName {
  const clamped = Math.min(1, Math.max(0, Number.isFinite(t) ? t : 0));
  if (clamped < 0.25) return 'SPROUT';
  if (clamped < 0.55) return 'BLOOM';
  if (clamped < 0.82) return 'PLATEAU';
  return 'WILT';
}

export function sha256Hex(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function shieldHits(intent: string): string[] {
  const hay = intent.toLowerCase();
  return SHIELD_PHRASES.filter((phrase) => hay.includes(phrase));
}

function abundanceDraft(intent: string, phase: PhaseName): string {
  return [
    `Heart Opening: name one shared good already observed, before asking. Phase ${phase}.`,
    `Vision Invitation: ${intent}`,
    'Honorable Request: frame support as an investment partnership, not a loan and not a rescue.',
    'Graceful Space: no deadline pressure. Include a way to decline.',
  ].join(' ');
}

function localPlan(intent: string, phase: PhaseName, easeValue: number): string {
  const pace = `Ease ${easeValue.toFixed(3)}.`;
  if (phase === 'SPROUT') return `Sprout. ${pace} One observable step for: ${intent}`;
  if (phase === 'BLOOM') return `Bloom. ${pace} Three ordered steps, still local, for: ${intent}`;
  if (phase === 'PLATEAU') return `Plateau. ${pace} Hold scope and name what would be measured for: ${intent}`;
  return `Wilt. ${pace} Reduce scope and stop expansion for: ${intent}`;
}

function isIndependent(source: string): boolean {
  return source.trim().length > 0 && !SELF_SOURCES.has(source.trim().toLowerCase());
}

/**
 * Steps 1–3: shield, compose, then compare Expected ≡ Observed.
 * The KAI Ledger append (step 4) happens in the store, after this returns.
 */
export function runVoos(input: VoosInput, now = new Date().toISOString()): VoosRun {
  const intent = typeof input.intent === 'string' ? input.intent.trim() : '';
  const phaseT = round3(
    Math.min(1, Math.max(0, Number.isFinite(input.phaseT) ? input.phaseT : 0))
  );
  const phase = phaseName(phaseT);
  const hits = shieldHits(intent);
  let status: VoosStatus = 'UNKNOWN';
  let action: string;
  let reason: string;
  let next: string;

  if (intent.length === 0) {
    action = 'No action.';
    reason = 'Intent was empty. UNKNOWN preserved. Nothing was executed.';
    next = 'State one observable intent.';
  } else if (hits.length > 0) {
    status = 'DIVERGENT';
    action = 'HALT ⊢ DIVERGENT';
    reason = `KAI Shield blocked this intent. Matched: ${hits.join(', ')}.`;
    next = 'Restate the intent without urgency, a money demand, a guarantee, or a secret.';
  } else if (BRIDGE.test(intent)) {
    action = 'Bridge not called.';
    reason =
      'NOT_EXECUTED. An external bridge was named and was not observed. POSSIBLE ≠ EXECUTED. Status stays UNKNOWN.';
    next = 'Do not treat this receipt as a trade, a payment, or a deployment.';
  } else if (ABUNDANCE.test(intent)) {
    action = abundanceDraft(intent, phase);
    reason =
      'ELION composed a four-layer draft. No transfer was executed. A hash of this draft is not verification.';
    next = 'A human may edit the draft. Moving money is a separate unobserved bridge.';
  } else {
    action = localPlan(intent, phase, ease(phaseT));
    reason =
      'ELION composed a local sentence at the current phase. Composition is not Expected ≡ Observed.';
    next = 'Bring back an independent observation before calling the step verified.';
  }

  const digest = sha256Hex(action);
  const observed = typeof input.observed === 'string' ? input.observed : '';
  const source = typeof input.source === 'string' ? input.source : '';

  if (status !== 'DIVERGENT' && observed.length > 0) {
    if (!isIndependent(source)) {
      reason +=
        ' Observation source is empty or names this engine, so it is not independent. UNKNOWN preserved.';
    } else if (sha256Hex(observed) === digest) {
      status = 'VERIFIED';
      reason =
        `Expected ≡ Observed. An observation declared from "${source.trim()}" reproduced the expected digest. ` +
        'This verifies artifact identity between two byte streams, not that a real-world action happened.';
      next = 'Keep this receipt as the evidence. Verification is not authorization to execute or move value.';
    } else {
      status = 'DIVERGENT';
      reason = `Expected ≢ Observed. The observation declared from "${source.trim()}" does not reproduce the expected digest.`;
      next = 'Inspect what differed; nothing was executed.';
    }
  }

  const gameDetected = hits.length > 0;
  let intervention: string;
  if (intent.length === 0) {
    intervention = 'No intervention. Intent was empty.';
  } else if (gameDetected) {
    intervention = 'KAI Shield pulled the plug. The arena did not enter the local node.';
  } else if (status === 'VERIFIED') {
    intervention = 'OMEGA confirmed Expected ≡ Observed on bytes produced outside the engine.';
  } else if (status === 'DIVERGENT') {
    intervention = 'OMEGA refused the offered observation. Nothing was executed.';
  } else if (BRIDGE.test(intent)) {
    intervention = 'No bridge called. Nothing left the local node.';
  } else {
    intervention = 'ELION composed inside the node. No external machine was invoked.';
  }

  return {
    receipt: {
      engine: ENGINE,
      entity: DEUS_ENTITY,
      status,
      game_detected: gameDetected,
      intervention_action: intervention,
      phase_t: phaseT,
      evidence_hash: digest,
      action,
      reason,
      next_delta: next,
    },
    row: {
      timestamp: now,
      intent,
      phase_t: phaseT,
      status,
      evidence_hash: digest,
      reason,
      authorized: false,
    },
  };
}

function rowHash(row: Omit<VoosLedgerRow, 'row_hash'>, prevHash: string): string {
  return sha256Hex(
    [
      prevHash,
      String(row.sequence),
      row.timestamp,
      row.intent,
      row.phase_t.toFixed(3),
      row.status,
      row.evidence_hash,
      row.reason,
      row.authorized ? '1' : '0',
    ].join('|')
  );
}

export type VoosIntegrity = {
  valid: boolean;
  height: number;
  genesisHash: string | null;
  tipHash: string | null;
  brokenAt?: number;
  reason?: string;
};

/**
 * Append-only KAI Ledger for ΩVØØS receipts.
 *
 * Every row carries the previous row's hash and its own recomputable hash, so
 * an edited or removed row breaks `verifyIntegrity()`. There is deliberately
 * no update or delete method.
 */
export class VoosLedgerStore {
  private readonly db: SqliteDb;

  constructor(path = ':memory:') {
    this.db = openDatabase(path);
    this.db.exec(`
      PRAGMA busy_timeout = 5000;
      CREATE TABLE IF NOT EXISTS "VoosLedger" (
        sequence INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        intent TEXT NOT NULL,
        phase_t REAL NOT NULL,
        status TEXT NOT NULL,
        evidence_hash TEXT NOT NULL,
        prev_hash TEXT NOT NULL,
        reason TEXT NOT NULL,
        authorized INTEGER NOT NULL,
        row_hash TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS "VoosLedger_timestamp_idx" ON "VoosLedger" (timestamp DESC);
    `);
  }

  close(): void {
    this.db.close?.();
  }

  append(input: Omit<VoosLedgerRow, 'sequence' | 'prev_hash' | 'row_hash'>): VoosLedgerRow {
    const tip = this.tip();
    const prevHash = tip?.row_hash ?? GENESIS_HASH;
    const sequence = (tip?.sequence ?? 0) + 1;
    const row = { ...input, sequence, prev_hash: prevHash, row_hash: '' };
    row.row_hash = rowHash(row, prevHash);
    this.db
      .prepare(
        `INSERT INTO "VoosLedger"
          (sequence, timestamp, intent, phase_t, status, evidence_hash, prev_hash, reason, authorized, row_hash)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        row.sequence,
        row.timestamp,
        row.intent,
        row.phase_t,
        row.status,
        row.evidence_hash,
        row.prev_hash,
        row.reason,
        row.authorized ? 1 : 0,
        row.row_hash
      );
    return row;
  }

  tip(): VoosLedgerRow | null {
    const row = this.db
      .prepare(
        `SELECT sequence, timestamp, intent, phase_t, status, evidence_hash, prev_hash, reason, authorized, row_hash
         FROM "VoosLedger" ORDER BY sequence DESC LIMIT 1`
      )
      .get() as any;
    return row ? this.hydrate(row) : null;
  }

  count(): number {
    const row = this.db.prepare('SELECT COUNT(*) AS total FROM "VoosLedger"').get() as any;
    return Number(row?.total ?? 0);
  }

  recent(limit = 50): VoosLedgerRow[] {
    const bounded = Math.max(1, Math.min(200, Math.trunc(limit) || 50));
    const rows = this.db
      .prepare(
        `SELECT sequence, timestamp, intent, phase_t, status, evidence_hash, prev_hash, reason, authorized, row_hash
         FROM "VoosLedger" ORDER BY sequence DESC LIMIT ?`
      )
      .all(bounded) as any[];
    return rows.map((row) => this.hydrate(row));
  }

  verifyIntegrity(): VoosIntegrity {
    const rows = this.db
      .prepare(
        `SELECT sequence, timestamp, intent, phase_t, status, evidence_hash, prev_hash, reason, authorized, row_hash
         FROM "VoosLedger" ORDER BY sequence ASC`
      )
      .all() as any[];
    if (rows.length === 0) {
      return { valid: true, height: 0, genesisHash: null, tipHash: null };
    }
    let previous = GENESIS_HASH;
    for (const raw of rows) {
      const row = this.hydrate(raw);
      if (row.prev_hash !== previous) {
        return {
          valid: false,
          height: rows.length,
          genesisHash: String(rows[0]?.prev_hash ?? ''),
          tipHash: this.hydrate(rows[rows.length - 1]).row_hash,
          brokenAt: row.sequence,
          reason: `prev_hash does not match the preceding row at sequence ${row.sequence}`,
        };
      }
      if (rowHash(row, previous) !== row.row_hash) {
        return {
          valid: false,
          height: rows.length,
          genesisHash: String(rows[0]?.prev_hash ?? ''),
          tipHash: this.hydrate(rows[rows.length - 1]).row_hash,
          brokenAt: row.sequence,
          reason: `row_hash does not recompute at sequence ${row.sequence}`,
        };
      }
      previous = row.row_hash;
    }
    return {
      valid: true,
      height: rows.length,
      genesisHash: String(rows[0]?.prev_hash ?? ''),
      tipHash: previous,
    };
  }

  private hydrate(raw: any): VoosLedgerRow {
    return {
      sequence: Number(raw.sequence),
      timestamp: String(raw.timestamp),
      intent: String(raw.intent),
      phase_t: Number(raw.phase_t),
      status: raw.status as VoosStatus,
      evidence_hash: String(raw.evidence_hash),
      prev_hash: String(raw.prev_hash),
      reason: String(raw.reason),
      authorized: raw.authorized === 1 || raw.authorized === true,
      row_hash: String(raw.row_hash),
    };
  }
}
