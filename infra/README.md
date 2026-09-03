# Infrastructure

## What exists

One deployment artifact: a single container image serving the API and, when
built, the web client from the same origin.

- **[`../apps/api/Dockerfile`](../apps/api/Dockerfile)** — multi-stage build on
  `node:20-alpine`, runs as a non-root user, no signing key baked in.
- **[`../.github/workflows/verify.yml`](../.github/workflows/verify.yml)** — the
  `docker` job builds the image and smoke tests a running container on every
  pull request; the `publish` job pushes it to GHCR with a signed provenance
  attestation on every merge to `main`.

The Dockerfile lives beside the application it packages rather than here,
because it needs the workspace root as its build context and belongs with the
code it builds.

## Running the published image

```bash
docker run -p 3000:3000 \
  -e OMEGA_SIGNING_KEY="$(openssl rand -hex 32)" \
  ghcr.io/starofgodmayomi-droid/omega-v-oceanicos-api:latest
```

Verify its provenance before trusting it:

```bash
gh attestation verify \
  oci://ghcr.io/starofgodmayomi-droid/omega-v-oceanicos-api:latest \
  --repo starofgodmayomi-droid/omega-v-oceanicos
```

## Environment

| Variable                   | Required | Default                               | Purpose                                                                                                                               |
| -------------------------- | -------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `OMEGA_SIGNING_KEY`        | **yes**  | none                                  | HMAC key for attestations. The service refuses to start without it. A key shipped in an image is a key held by everyone who pulls it. |
| `API_PORT`                 | no       | `3000`                                | Listen port.                                                                                                                          |
| `OMEGA_RUNTIME_STORE_PATH` | no       | `/var/lib/omega-v/runtime.json`       | Runtime snapshot.                                                                                                                     |
| `OMEGA_EVENT_LOG_PATH`     | no       | derived from the store path           | Append-only event log.                                                                                                                |
| `OMEGA_MEMORY_PATH`        | no       | `/tmp/omega-v-oceanicos/memory.jsonl` | Kernel hash chain.                                                                                                                    |
| `OMEGA_PERSISTENCE`        | no       | on outside tests                      | `on` or `off`, overriding the default.                                                                                                |
| `OMEGA_WEB_DIST`           | no       | `apps/web/dist`                       | Client bundle to serve.                                                                                                               |

## What does not exist

Stated plainly, because this file previously described all of it as though it
did: there is no Compose file, no Kubernetes manifest, no Terraform, no
deployment script, no database and no cache. The image has never been deployed
to a host. Storage is the container filesystem, which means runtime state does
not survive a restart unless a volume is mounted at the paths above.

The project's own first rule is not to pretend anything exists until it has
been inspected or built. This file is now subject to it.

## Container healthcheck

The image declares a Docker `HEALTHCHECK` that requests `http://127.0.0.1:${API_PORT:-3000}/health` every 30 seconds after a 15-second start period. Docker marks the container unhealthy when the service is unreachable or the route returns a non-2xx response, including explicit degraded readiness. This is local process and API-probe evidence only; it does not prove deployment availability, replica agreement, persistence durability, external coordination, or production authorization.
