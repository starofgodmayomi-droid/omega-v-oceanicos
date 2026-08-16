# Ω∞v CLI

The CLI reads the real API observability and runtime evidence contracts and exposes one explicit operator mutation for attestation revocation. When the API has `OMEGA_READ_TOKEN` configured, pass `--token TOKEN` or set `OMEGA_READ_TOKEN` so the CLI sends `Authorization: Bearer TOKEN`; this token is not a substitute for stronger administrative policy.

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

Export a bounded evidence package directly from the API:

```bash
node packages/cli/dist/index.js export --url http://localhost:3000 --token "$OMEGA_READ_TOKEN"
```

This reads `GET /evidence/export`, prints the returned JSON without synthesizing fields, and exits non-zero when the returned memory integrity is invalid.

## Attestation revocation

List recorded revocations without mutating state:

```bash
node packages/cli/dist/index.js revocations --url http://localhost:3000
```

Revoke a recorded attestation only when an authorized operator has supplied a reason:

```bash
node packages/cli/dist/index.js revoke attestation-id \
  --reason "Operator review found stale evidence" \
  --url http://localhost:3000 \
  --token "$OMEGA_READ_TOKEN"
```

The command calls `POST /attest/revoke`, sends `revokedBy=omega-cli`, and uses `--admin-token TOKEN` or `OMEGA_ADMIN_TOKEN` for the distinct administrative bearer credential. `--token` remains the read-only credential and is not reused for this mutation. The command prints the recorded revocation and returns a non-zero status for API failure. The API remains the authority for lineage, duplicate protection, persistence, and action denial; the CLI does not claim that a revocation is a cryptographic alteration of the original attestation.

Mobile capabilities remain future slices. The typed SDK is available separately as `@omega-v/sdk`, and accepts `{ readToken }` as its third constructor argument when the API read boundary is enabled.
