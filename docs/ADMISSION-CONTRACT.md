# Crawler and Vector Admission Contract

> This document defines what a future crawler or embedding workflow must declare before it can be considered for implementation. It is a schema and governance boundary, not proof that external crawling, vector storage, retention deletion, or tenant authorization is currently enforced.

## Current status

The repository provides a local validation-only contract in `@omega-v/runtime` through `validateAdmissionContract`. It accepts only version `admission.v1`, requires an HTTPS source whose hostname is explicitly present in `allowedHosts`, and rejects empty or malformed provenance. The validator performs no network request, starts no worker, invokes no shell or subprocess, and writes no vector data.

## Required declarations

| Field               | Requirement                                                                         | Current meaning                                                                          |
| ------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `schemaVersion`     | Must be `admission.v1`                                                              | Versioned contract identity.                                                             |
| `sourceUri`         | Valid HTTPS URL, bounded to 2,048 characters                                        | Descriptive source reference; not a fetch authorization by itself.                       |
| `allowedHosts`      | At least one host name; source hostname must match                                  | Explicit admission allowlist; no network client is opened by validation.                 |
| `capabilities`      | One or more closed local values: `observe-local`, `embed-local`                     | No network, shell, subprocess, or arbitrary tool capability is admitted.                 |
| `embedding`         | Required for `embed-local`; bounded model, dimensions, IDs, checksum, and timestamp | Metadata only; no embedding model or vector backend is invoked.                          |
| `retention`         | `ephemeral`, `bounded-operational`, or `operator-reviewed`                          | Policy declaration; deletion enforcement is not implemented by this contract.            |
| `access`            | `operator-only` or `local-process`                                                  | Policy declaration; accounts, tenant identity, and remote authorization are not implied. |
| `provenance`        | Request ID, actor, observation time, and optional correlation ID                    | Trace metadata for later evidence; it does not authenticate a human.                     |
| `network` / `shell` | Both must be literal `false`                                                        | Fail-closed capability boundary.                                                         |

## Explicit non-claims

Passing validation does not establish that a source is trustworthy, that a caller is authorized to read it, that an embedding is correct, that a vector store is isolated, that retention is enforced, or that a job is durable. The current contract also does not provide rate limiting, user accounts, tenant isolation, external key custody, backup and restore, distributed coordination, or production deployment.

A later execution slice must add a separately reviewed worker identity, authenticated request context, source-fetch policy, content-size and rate limits, secret handling, vector-store access control, tenant-scoped persistence, retry and idempotency rules, audit events, and deployment evidence. No implementation should widen `network` or `shell` capability by changing this document alone.

## Proof required before execution

A future crawler or vector adapter must first demonstrate negative-path tests for missing allowlists, unauthorized sources, unknown capabilities, oversized content or embeddings, malformed provenance, cross-tenant access, replayed jobs, and contradictory durability claims. It must then pass the repository’s format, lint, type, test, build, security, and container smoke gates. A production claim additionally requires an authorized staging or production target, immutable artifact identity, secret-injection evidence without secret disclosure, retention and deletion evidence, rollback, monitoring, and an externally observed smoke test.
