import type { OmegaEvidenceEnvelope } from '@oceanicos/types';

export type WatchItem = { symbol: string; thresholdPercent: number; createdAt: string };
export type AlertDirection = 'up' | 'down';
export type AlertEvent = WatchItem & { id: number; direction: AlertDirection; severity: 'watch' | 'critical'; changePercent: number; price: number; source: string; observedAt: string; acknowledgedAt?: string | null };
export type ScanRun = { id: number; scanId: string; status: 'completed' | 'failed'; startedAt: string; completedAt: string; live: boolean; providerCount: number; assetCount: number; candidateCount: number; recordedCount: number; suppressedCount: number; error?: string };
export type EvidenceRecord = OmegaEvidenceEnvelope & { recordId: number; linkedScanId?: string | null };

type SqliteDb = {
  exec(sql: string): void;
  prepare(sql: string): { get(...params: unknown[]): any; all(...params: unknown[]): any[]; run(...params: unknown[]): any };
  close?: () => void;
};

function openDatabase(path: string): SqliteDb {
  try {
    const BetterSqlite = require('better-sqlite3');
    return new BetterSqlite(path) as SqliteDb;
  } catch {
    const { DatabaseSync } = require('node:sqlite');
    return new DatabaseSync(path) as SqliteDb;
  }
}

export class MarketWatchlistStore {
  private readonly db: SqliteDb;

  constructor(path = ':memory:') {
    this.db = openDatabase(path);
    this.db.exec(`
      PRAGMA busy_timeout = 5000;
      CREATE TABLE IF NOT EXISTS market_watchlist (
        symbol TEXT PRIMARY KEY,
        threshold_percent REAL NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS market_alert_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT NOT NULL,
        threshold_percent REAL NOT NULL,
        direction TEXT NOT NULL DEFAULT 'up',
        severity TEXT NOT NULL,
        change_percent REAL NOT NULL,
        price REAL NOT NULL,
        source TEXT NOT NULL,
        observed_at TEXT NOT NULL,
        acknowledged_at TEXT
      );
      CREATE TABLE IF NOT EXISTS market_scan_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        scan_id TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL,
        started_at TEXT NOT NULL,
        completed_at TEXT NOT NULL,
        live INTEGER NOT NULL,
        provider_count INTEGER NOT NULL,
        asset_count INTEGER NOT NULL,
        candidate_count INTEGER NOT NULL,
        recorded_count INTEGER NOT NULL,
        suppressed_count INTEGER NOT NULL,
        error TEXT
      );
      CREATE TABLE IF NOT EXISTS market_evidence_events (
        record_id INTEGER PRIMARY KEY AUTOINCREMENT,
        evidence_id TEXT NOT NULL UNIQUE,
        kind TEXT NOT NULL,
        subject TEXT NOT NULL,
        status TEXT NOT NULL,
        source TEXT NOT NULL,
        observed_at TEXT NOT NULL,
        confidence TEXT NOT NULL,
        verified INTEGER NOT NULL,
        provenance_json TEXT NOT NULL,
        limitations_json TEXT NOT NULL,
        linked_scan_id TEXT
      );
    `);
    const columns = this.db.prepare('PRAGMA table_info(market_alert_events)').all() as Array<{ name: string }>;
    if (!columns.some(column => column.name === 'direction')) this.db.exec("ALTER TABLE market_alert_events ADD COLUMN direction TEXT NOT NULL DEFAULT 'up'");
    if (!columns.some(column => column.name === 'acknowledged_at')) this.db.exec('ALTER TABLE market_alert_events ADD COLUMN acknowledged_at TEXT');
    const count = this.db.prepare('SELECT COUNT(*) AS count FROM market_watchlist').get();
    if (Number(count?.count ?? 0) === 0) {
      const now = new Date().toISOString();
      const insert = this.db.prepare('INSERT INTO market_watchlist(symbol, threshold_percent, created_at) VALUES (?, ?, ?)');
      insert.run('NVDA', 2, now);
      insert.run('BTC', 3, now);
    }
  }

  close(): void { this.db.close?.(); }

  list(): WatchItem[] {
    return this.db.prepare('SELECT symbol, threshold_percent AS thresholdPercent, created_at AS createdAt FROM market_watchlist ORDER BY symbol').all() as WatchItem[];
  }

  upsert(symbol: string, thresholdPercent: number): WatchItem {
    const createdAt = new Date().toISOString();
    this.db.prepare(`INSERT INTO market_watchlist(symbol, threshold_percent, created_at) VALUES (?, ?, ?) ON CONFLICT(symbol) DO UPDATE SET threshold_percent=excluded.threshold_percent`).run(symbol, thresholdPercent, createdAt);
    return this.db.prepare('SELECT symbol, threshold_percent AS thresholdPercent, created_at AS createdAt FROM market_watchlist WHERE symbol = ?').get(symbol) as WatchItem;
  }

  remove(symbol: string): boolean {
    return Number(this.db.prepare('DELETE FROM market_watchlist WHERE symbol = ?').run(symbol)?.changes ?? 0) > 0;
  }

  recordAlertIfEligible(event: Omit<AlertEvent, 'id'>, cooldownMs = 15 * 60 * 1000): AlertEvent | null {
    const previous = this.db.prepare('SELECT observed_at AS observedAt FROM market_alert_events WHERE symbol = ? AND direction = ? AND severity = ? ORDER BY id DESC LIMIT 1').get(event.symbol, event.direction, event.severity);
    if (previous?.observedAt && Date.now() - Date.parse(String(previous.observedAt)) < cooldownMs) return null;
    const result = this.db.prepare(`INSERT INTO market_alert_events(symbol, threshold_percent, direction, severity, change_percent, price, source, observed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(event.symbol, event.thresholdPercent, event.direction, event.severity, event.changePercent, event.price, event.source, event.observedAt);
    return { ...event, id: Number(result?.lastInsertRowid ?? 0) };
  }

  history(limit = 50): AlertEvent[] {
    const bounded = Math.max(1, Math.min(200, Math.floor(limit)));
    return this.db.prepare('SELECT id, symbol, threshold_percent AS thresholdPercent, direction, severity, change_percent AS changePercent, price, source, observed_at AS observedAt, acknowledged_at AS acknowledgedAt FROM market_alert_events ORDER BY id DESC LIMIT ?').all(bounded) as AlertEvent[];
  }

  acknowledgeAlert(id: number): AlertEvent | null {
    const acknowledgedAt = new Date().toISOString();
    const result = this.db.prepare('UPDATE market_alert_events SET acknowledged_at = ? WHERE id = ? AND acknowledged_at IS NULL').run(acknowledgedAt, id);
    if (Number(result?.changes ?? 0) === 0) return this.db.prepare('SELECT id, symbol, threshold_percent AS thresholdPercent, direction, severity, change_percent AS changePercent, price, source, observed_at AS observedAt, acknowledged_at AS acknowledgedAt FROM market_alert_events WHERE id = ?').get(id) as AlertEvent | null;
    return this.db.prepare('SELECT id, symbol, threshold_percent AS thresholdPercent, direction, severity, change_percent AS changePercent, price, source, observed_at AS observedAt, acknowledged_at AS acknowledgedAt FROM market_alert_events WHERE id = ?').get(id) as AlertEvent | null;
  }

  recordScanRun(run: Omit<ScanRun, 'id'>): ScanRun {
    const result = this.db.prepare(`INSERT INTO market_scan_runs(scan_id, status, started_at, completed_at, live, provider_count, asset_count, candidate_count, recorded_count, suppressed_count, error) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(run.scanId, run.status, run.startedAt, run.completedAt, run.live ? 1 : 0, run.providerCount, run.assetCount, run.candidateCount, run.recordedCount, run.suppressedCount, run.error ?? null);
    return { ...run, id: Number(result?.lastInsertRowid ?? 0) };
  }

  scanHistory(limit = 25): ScanRun[] {
    const bounded = Math.max(1, Math.min(100, Math.floor(limit)));
    return this.db.prepare('SELECT id, scan_id AS scanId, status, started_at AS startedAt, completed_at AS completedAt, live = 1 AS live, provider_count AS providerCount, asset_count AS assetCount, candidate_count AS candidateCount, recorded_count AS recordedCount, suppressed_count AS suppressedCount, error FROM market_scan_runs ORDER BY id DESC LIMIT ?').all(bounded).map((row: any) => ({ ...row, live: Boolean(row.live) })) as ScanRun[];
  }

  recordEvidence(envelope: OmegaEvidenceEnvelope, linkedScanId: string | null = null): EvidenceRecord {
    this.db.prepare(`INSERT INTO market_evidence_events(evidence_id, kind, subject, status, source, observed_at, confidence, verified, provenance_json, limitations_json, linked_scan_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(evidence_id) DO NOTHING`).run(envelope.id, envelope.kind, envelope.subject, envelope.status, envelope.source, envelope.observedAt, envelope.confidence, envelope.verified ? 1 : 0, JSON.stringify(envelope.provenance), JSON.stringify(envelope.limitations), linkedScanId);
    return this.evidenceHistory(100).find(record => record.id === envelope.id) as EvidenceRecord;
  }

  evidenceHistory(limit = 25): EvidenceRecord[] {
    const bounded = Math.max(1, Math.min(100, Math.floor(limit)));
    return this.db.prepare('SELECT record_id AS recordId, evidence_id AS id, kind, subject, status, source, observed_at AS observedAt, confidence, verified, provenance_json AS provenanceJson, limitations_json AS limitationsJson, linked_scan_id AS linkedScanId FROM market_evidence_events ORDER BY record_id DESC LIMIT ?').all(bounded).map((row: any) => ({ ...row, verified: Boolean(row.verified), provenance: JSON.parse(row.provenanceJson), limitations: JSON.parse(row.limitationsJson), provenanceJson: undefined, limitationsJson: undefined })).map(({ provenanceJson: _p, limitationsJson: _l, ...record }: any) => record) as EvidenceRecord[];
  }
}
