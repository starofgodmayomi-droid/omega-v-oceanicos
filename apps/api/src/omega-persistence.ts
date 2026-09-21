import { randomUUID } from 'node:crypto';

export type DurableWorker = {
  workerId: string;
  capabilities: string[];
  status: 'IDLE' | 'BUSY' | 'OFFLINE';
  lastHeartbeatAt: string;
  leaseCount: number;
};

export type WorkerLease = {
  leaseId: string;
  workerId: string;
  commandId: string;
  capability: string;
  leasedAt: string;
  expiresAt: string;
};

type SqliteDb = {
  exec(sql: string): void;
  prepare(sql: string): { get(...params: unknown[]): any; all(...params: unknown[]): any[]; run(...params: unknown[]): any };
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

export class OmegaDurableStore {
  private readonly db: SqliteDb;

  constructor(path = ':memory:') {
    this.db = openDatabase(path);
    this.db.exec(`
      PRAGMA busy_timeout = 5000;
      CREATE TABLE IF NOT EXISTS omega_commands (
        command_id TEXT PRIMARY KEY,
        idempotency_key TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL,
        command_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS omega_events (
        sequence INTEGER PRIMARY KEY AUTOINCREMENT,
        command_id TEXT,
        event_type TEXT NOT NULL,
        event_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS omega_workers (
        worker_id TEXT PRIMARY KEY,
        capabilities_json TEXT NOT NULL,
        status TEXT NOT NULL,
        last_heartbeat_at TEXT NOT NULL,
        lease_count INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS omega_leases (
        lease_id TEXT PRIMARY KEY,
        worker_id TEXT NOT NULL,
        command_id TEXT NOT NULL UNIQUE,
        capability TEXT NOT NULL,
        leased_at TEXT NOT NULL,
        expires_at TEXT NOT NULL
      );
    `);
  }

  getCommand(commandId: string): any | undefined {
    const row = this.db.prepare('SELECT command_json FROM omega_commands WHERE command_id = ?').get(commandId);
    return row ? JSON.parse(row.command_json) : undefined;
  }

  putCommand(command: any): void {
    const now = new Date().toISOString();
    this.db.prepare(`
      INSERT INTO omega_commands(command_id, idempotency_key, status, command_json, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(command_id) DO UPDATE SET status=excluded.status, command_json=excluded.command_json, updated_at=excluded.updated_at
    `).run(command.commandId, command.idempotencyKey, command.status, JSON.stringify(command), now);
  }

  appendEvent(event: Record<string, unknown>): void {
    this.db.prepare('INSERT INTO omega_events(command_id, event_type, event_json, created_at) VALUES (?, ?, ?, ?)').run(
      typeof event.commandId === 'string' ? event.commandId : null,
      typeof event.type === 'string' ? event.type : 'omega.event',
      JSON.stringify(event),
      typeof event.at === 'string' ? event.at : new Date().toISOString(),
    );
  }

  listEvents(commandId?: string): readonly Record<string, unknown>[] {
    const rows = commandId
      ? this.db.prepare('SELECT event_json FROM omega_events WHERE command_id = ? ORDER BY sequence ASC').all(commandId)
      : this.db.prepare('SELECT event_json FROM omega_events ORDER BY sequence ASC').all();
    return rows.map((row) => JSON.parse(row.event_json));
  }

  registerWorker(input: { workerId: string; capabilities: string[] }): DurableWorker {
    const now = new Date().toISOString();
    this.db.prepare(`
      INSERT INTO omega_workers(worker_id, capabilities_json, status, last_heartbeat_at, lease_count)
      VALUES (?, ?, 'IDLE', ?, 0)
      ON CONFLICT(worker_id) DO UPDATE SET capabilities_json=excluded.capabilities_json, status='IDLE', last_heartbeat_at=excluded.last_heartbeat_at
    `).run(input.workerId, JSON.stringify(input.capabilities), now);
    return this.getWorker(input.workerId)!;
  }

  heartbeatWorker(workerId: string): DurableWorker | undefined {
    const now = new Date().toISOString();
    this.db.prepare("UPDATE omega_workers SET last_heartbeat_at = ?, status = CASE WHEN status = 'OFFLINE' THEN 'IDLE' ELSE status END WHERE worker_id = ?").run(now, workerId);
    return this.getWorker(workerId);
  }

  getWorker(workerId: string): DurableWorker | undefined {
    const row = this.db.prepare('SELECT * FROM omega_workers WHERE worker_id = ?').get(workerId);
    return row ? { workerId: row.worker_id, capabilities: JSON.parse(row.capabilities_json), status: row.status, lastHeartbeatAt: row.last_heartbeat_at, leaseCount: row.lease_count } : undefined;
  }

  listWorkers(): readonly DurableWorker[] {
    return this.db.prepare('SELECT * FROM omega_workers ORDER BY worker_id').all().map((row) => ({ workerId: row.worker_id, capabilities: JSON.parse(row.capabilities_json), status: row.status, lastHeartbeatAt: row.last_heartbeat_at, leaseCount: row.lease_count }));
  }

  listLeases(): readonly WorkerLease[] {
    const now = new Date().toISOString();
    this.db.prepare('DELETE FROM omega_leases WHERE expires_at <= ?').run(now);
    return this.db.prepare('SELECT * FROM omega_leases ORDER BY expires_at ASC').all().map((row) => ({
      leaseId: row.lease_id,
      workerId: row.worker_id,
      commandId: row.command_id,
      capability: row.capability,
      leasedAt: row.leased_at,
      expiresAt: row.expires_at,
    }));
  }

  acquireLease(workerId: string, commandId: string, capability: string, durationMs = 30_000): WorkerLease | undefined {
    const worker = this.getWorker(workerId);
    if (!worker || !worker.capabilities.includes(capability)) return undefined;
    const now = new Date();
    const expires = new Date(now.getTime() + durationMs);
    const lease: WorkerLease = { leaseId: `lease-${randomUUID()}`, workerId, commandId, capability, leasedAt: now.toISOString(), expiresAt: expires.toISOString() };
    try {
      this.db.exec('BEGIN IMMEDIATE');
      this.db.prepare('DELETE FROM omega_leases WHERE expires_at <= ?').run(now.toISOString());
      const existing = this.db.prepare('SELECT lease_id FROM omega_leases WHERE command_id = ?').get(commandId);
      if (existing) { this.db.exec('ROLLBACK'); return undefined; }
      this.db.prepare('INSERT INTO omega_leases(lease_id, worker_id, command_id, capability, leased_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)').run(lease.leaseId, lease.workerId, lease.commandId, lease.capability, lease.leasedAt, lease.expiresAt);
      this.db.prepare("UPDATE omega_workers SET status='BUSY', lease_count=lease_count+1 WHERE worker_id = ?").run(workerId);
      this.db.exec('COMMIT');
      return lease;
    } catch {
      try { this.db.exec('ROLLBACK'); } catch { /* preserve original failure */ }
      return undefined;
    }
  }

  releaseLease(leaseId: string, workerId: string): boolean {
    try {
      this.db.exec('BEGIN IMMEDIATE');
      const lease = this.db.prepare('SELECT worker_id FROM omega_leases WHERE lease_id = ?').get(leaseId);
      if (!lease || lease.worker_id !== workerId) { this.db.exec('ROLLBACK'); return false; }
      this.db.prepare('DELETE FROM omega_leases WHERE lease_id = ?').run(leaseId);
      this.db.prepare("UPDATE omega_workers SET lease_count=CASE WHEN lease_count > 0 THEN lease_count-1 ELSE 0 END, status=CASE WHEN lease_count <= 1 THEN 'IDLE' ELSE 'BUSY' END WHERE worker_id = ?").run(workerId);
      this.db.exec('COMMIT');
      return true;
    } catch {
      try { this.db.exec('ROLLBACK'); } catch { /* preserve original failure */ }
      return false;
    }
  }
}
