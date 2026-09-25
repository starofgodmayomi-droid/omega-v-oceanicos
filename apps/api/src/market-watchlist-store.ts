export type WatchItem = { symbol: string; thresholdPercent: number; createdAt: string };
export type AlertEvent = WatchItem & { id: number; severity: 'watch' | 'critical'; changePercent: number; price: number; source: string; observedAt: string };

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
        severity TEXT NOT NULL,
        change_percent REAL NOT NULL,
        price REAL NOT NULL,
        source TEXT NOT NULL,
        observed_at TEXT NOT NULL
      );
    `);
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
    this.db.prepare(`
      INSERT INTO market_watchlist(symbol, threshold_percent, created_at) VALUES (?, ?, ?)
      ON CONFLICT(symbol) DO UPDATE SET threshold_percent=excluded.threshold_percent
    `).run(symbol, thresholdPercent, createdAt);
    return this.db.prepare('SELECT symbol, threshold_percent AS thresholdPercent, created_at AS createdAt FROM market_watchlist WHERE symbol = ?').get(symbol) as WatchItem;
  }

  remove(symbol: string): boolean {
    return Number(this.db.prepare('DELETE FROM market_watchlist WHERE symbol = ?').run(symbol)?.changes ?? 0) > 0;
  }

  recordAlert(event: Omit<AlertEvent, 'id'>): AlertEvent {
    const result = this.db.prepare(`INSERT INTO market_alert_events(symbol, threshold_percent, severity, change_percent, price, source, observed_at) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(event.symbol, event.thresholdPercent, event.severity, event.changePercent, event.price, event.source, event.observedAt);
    return { ...event, id: Number(result?.lastInsertRowid ?? 0) };
  }

  history(limit = 50): AlertEvent[] {
    const bounded = Math.max(1, Math.min(200, Math.floor(limit)));
    return this.db.prepare('SELECT id, symbol, threshold_percent AS thresholdPercent, severity, change_percent AS changePercent, price, source, observed_at AS observedAt FROM market_alert_events ORDER BY id DESC LIMIT ?').all(bounded) as AlertEvent[];
  }
}
