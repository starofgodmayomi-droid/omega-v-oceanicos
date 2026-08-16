# Ω∞v CLI

The CLI is a read-only client for the real API observability and runtime evidence contracts. When the API has `OMEGA_READ_TOKEN` configured, pass `--token TOKEN` or set `OMEGA_READ_TOKEN` so the CLI sends `Authorization: Bearer TOKEN`.

## Usage

Build the workspace, then run:

```bash
pnpm --filter @omega-v/cli build
OMEGA_API_URL=http://localhost:3000 node packages/cli/dist/index.js status
```

The status command also accepts `--url`:

```bash
node packages/cli/dist/index.js status --url http://localhost:3000
```

It reads `GET /observability` and prints runtime, service, trust, memory, provenance, lineage, and observation timestamp fields returned by the API. It does not synthesize missing values. The process exits with status `1` when the API is unavailable, memory integrity is false, append-only status is false, or attestation validity is explicitly false.

## Event evidence

Read recent runtime events directly from the API:

```bash
node packages/cli/dist/index.js events --url http://localhost:3000
node packages/cli/dist/index.js events --url http://localhost:3000 --limit 10
```

This command reads `GET /events`, preserves the returned event objects, and optionally limits how many recent entries are printed. It does not mutate runtime state or invent event fields.

## Run evidence

Read recent completed runs and their verification/attestation status:

```bash
node packages/cli/dist/index.js runs --url http://localhost:3000
node packages/cli/dist/index.js runs --url http://localhost:3000 --limit 10
```

This command reads `GET /runs` and reports only the returned observation ID, verification status, and attestation status.

Broader evidence export and mobile capabilities remain future slices. The typed SDK is available separately as `@omega-v/sdk`, and accepts `{ readToken }` as its third constructor argument when the API read boundary is enabled.
