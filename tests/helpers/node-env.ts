/**
 * The API guards were written for Jest, which sets `NODE_ENV=test` for every
 * file. The node test runner leaves it unset, and `apps/api` reads it when it
 * chooses its default auth mode and whether persistence is on. Import this
 * module before any `apps/api` module so the guards see the same defaults they
 * were written against.
 *
 * `OMEGA_DB_PATH` defaults to an in-memory database: a guard that builds the
 * module-level app must not leave a SQLite file behind in the working tree.
 */
process.env.NODE_ENV ??= 'test';
process.env.OMEGA_DB_PATH ??= ':memory:';
