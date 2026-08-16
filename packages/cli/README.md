# Ω∞v CLI

The first CLI slice is a read-only status client for the real API observability contract.

## Usage

Build the workspace, then run:

```bash
pnpm --filter @omega-v/cli build
OMEGA_API_URL=http://localhost:3000 node packages/cli/dist/index.js status
```

The command also accepts `--url`:

```bash
node packages/cli/dist/index.js status --url http://localhost:3000
```

It reads `GET /observability` and prints runtime, service, trust, memory, provenance, lineage, and observation timestamp fields returned by the API. It does not synthesize missing values. The process exits with status `1` when the API is unavailable, memory integrity is false, append-only status is false, or attestation validity is explicitly false.

Broader query, evidence export, SDK, and mobile capabilities remain future slices and are not claimed by this package.
