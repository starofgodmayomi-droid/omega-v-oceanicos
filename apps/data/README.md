# apps/data

Runtime data directory for the applications, kept empty in the repository.

Nothing in this directory is committed. Application state (for example the SQLite file the
API writes when `OMEGA_DB_PATH` points here) is created at run time and belongs to the
environment that produced it, not to source control.

```text
apps/data/        ← runtime artifacts (no committed content)
apps/api/         ← Fastify API
apps/web/         ← React/Vite dashboard
```

Do not treat the presence or absence of a file here as evidence that a service ran, is
healthy, or holds valid data. Observe the running service and read its own output.
