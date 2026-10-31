import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export type SqliteDb = {
  exec(sql: string): void;
  prepare(sql: string): {
    get(...params: unknown[]): any;
    all(...params: unknown[]): any[];
    run(...params: unknown[]): any;
  };
  close?: () => void;
};

/**
 * Open the local SQLite file used by the API's durable stores.
 *
 * `better-sqlite3` is used when the package is installed; otherwise the
 * built-in `node:sqlite` runtime is the fallback. Both expose the same
 * `exec`/`prepare` surface this module declares.
 */
export function openDatabase(path: string): SqliteDb {
  try {
    const BetterSqlite = require('better-sqlite3');
    return new BetterSqlite(path) as SqliteDb;
  } catch {
    const { DatabaseSync } = require('node:sqlite');
    return new DatabaseSync(path) as SqliteDb;
  }
}
