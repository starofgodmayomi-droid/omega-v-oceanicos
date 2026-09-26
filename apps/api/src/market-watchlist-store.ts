export type WatchItem = { symbol: string; thresholdPercent: number; createdAt: string };
export type AlertDirection = 'up' | 'down';
export type AlertEvent = WatchItem & { id: number; direction: AlertDirection; severity: 'watch' | 'critical'; changePercent: number; price: number; source: string; observedAt: string };
export type ScanRun = { id: number; scanId: string; status: 'completed' | 'failed'; startedAt: string; completedAt: string; live: boolean; providerCount: number; assetCount: number; candidateCount: number; recordedCount: number; suppressedCount: number; error?: string };

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
        observed_at TEXT NOT NULL
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
    `);
    const columns = this.db.prepare('PRAGMA table_info(market_alert_events)').all() as Array<{ name: string }>;
    if (!columns.some(column => column.name === 'direction')) this.db.exec("ALTER TABLE market_alert_events ADD COLUMN direction TEXT NOT NULL DEFAULT 'up'");
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
    return this.db.prepare('SELECT id, symbol, threshold_percent AS thresholdPercent, direction, severity, change_percent AS changePercent, price, source, observed_at AS observedAt FROM market_alert_events ORDER BY id DESC LIMIT ?').all(bounded) as AlertEvent[];
  }

  recordScanRun(run: Omit<ScanRun, 'id'>): ScanRun {
    const result = this.db.prepare(`INSERT INTO market_scan_runs(scan_id, status, started_at, completed_at, live, provider_count, asset_count, candidate_count, recorded_count, suppressed_count, error) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(run.scanId, run.status, run.startedAt, run.completedAt, run.live ? 1 : 0, run.providerCount, run.assetCount, run.candidateCount, run.recordedCount, run.suppressedCount, run.error ?? null);
    return { ...run, id: Number(result?.lastInsertRowid ?? 0) };
  }

  scanHistory(limit = 25): ScanRun[] {
    const bounded = Math.max(1, Math.min(100, Math.floor(limit)));
    return this.db.prepare('SELECT id, scan_id AS scanId, status, started_at AS startedAt, completed_at AS completedAt, live = 1 AS live, provider_count AS providerCount, asset_count AS assetCount, candidate_count AS candidateCount, recorded_count AS recordedCount, suppressed_count AS suppressedCount, error FROM market_scan_runs ORDER BY id DESC LIMIT ?').all(bounded).map((row: any) => ({ ...row, live: Boolean(row.live) })) as ScanRun[];
  }
}
