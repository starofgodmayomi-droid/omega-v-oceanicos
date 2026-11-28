# 3. Keep live state outside Cloudflare Container disks

- **Status:** proposed; no provider or production topology is selected
- **Date:** 2026-10-18
- **Supersedes:** nothing

## Context

The API does not have one persistence surface. `apps/api/src/index.ts` constructs the `RememberEngine` ledger, an `OmegaCommandStore`, encrypted runtime snapshots and event logs, an optional local job ledger, a value-navigator journal, and a connector-observation journal. The `packages/mini` package also exposes file-backed causal memory. Each store has different ordering, integrity, encryption, or atomicity requirements.

`RememberEngine` currently opens synchronous SQLite and appends a block after reading and verifying the current hash-chain tip. The command store also uses synchronous SQLite. Lease acquisition and release use explicit SQLite transactions, while command changes and their event records are exposed as separate operations. The file-backed journals verify sequence and hash continuity. A provider adapter must preserve these semantics rather than only preserve method names.

The API's `persistenceCoverage` contract currently reports `complete: false` and lists databases, object storage, backups, and external-service persistence as unverified. The repository's deploy workflow stages a release bundle marked `STAGED_ONLY`; it does not prove provider deployment or runtime durability.

Cloudflare documents that Container disks are ephemeral by default, that a stopped Container can restart with a fresh disk, and that an instance can restart on another location. Container snapshots are immutable point-in-time filesystem state, not a transactional live database. R2 FUSE does not provide full POSIX filesystem semantics or local-disk performance. Do not place the live SQLite files on a Container disk, an R2 FUSE mount, or a snapshot and call that durable database storage. [1] [2] [5]

## Proposed decision

Keep production deployment blocked until all authoritative state has a durable store and the API's atomic operations have been proven against that store. Do not treat a deployment artifact, a healthy HTTP listener, or a successful local SQLite test as evidence of cloud durability.

Cloudflare D1 is a reasonable candidate for relational state because its Worker binding supports prepared statements and `batch()` transactions. Cloudflare documents that a batch executes sequentially and rolls back the sequence if a statement fails. The D1 REST query reference documents SQL plus parameters for a query request, but the page reviewed does not establish equivalent multi-statement transaction guarantees for a Container calling that endpoint directly. Therefore, compound state changes must use a Worker-side adapter with the documented binding transaction semantics, or another selected database whose transaction contract is proven. Do not assume that D1's HTTP query endpoint is an atomic substitute for `batch()`. [3] [4]

The first architecture gate is to prove the Container-to-persistence call path. Either move the relevant persistence operations into a Worker-side adapter and expose a bounded, authenticated interface, or select a durable SQL service that the Container can reach over a documented transactional protocol. Keep the transport choice open until a proof of concept demonstrates authentication, timeout behavior, retries, idempotency, and transaction boundaries. Do not put a broad Cloudflare account API token in the Container merely to avoid designing that boundary.

## Required invariants

The production adapter should expose domain-level atomic operations, not only generic reads and writes. At minimum:

- A ledger append must commit one expected next index and previous hash. Concurrent writers must use a compare-and-swap or serialized writer so only one append can extend a verified tip; a losing writer must re-read and re-verify before retrying.
- Command creation or transition, idempotency state, and the corresponding event must share the intended transaction boundary. Idempotency conflicts must remain distinguishable from storage failures.
- Lease acquisition and release must atomically update the lease and worker state and record their event. The existing cleanup of expired leases must not leave worker capacity counters inconsistent.
- Revocations must have one authoritative store. Avoid a database row and an independently updated in-memory or snapshot copy becoming competing sources of truth.
- Hash-chained JSONL histories must retain their genesis values, sequence order, canonical hash inputs, duplicate rules, and fail-closed behavior when integrity is degraded.
- Encryption keys and signing keys remain distinct from data storage. Their custody, rotation, backup encryption, access policy, deletion behavior, and recovery procedure require explicit operator decisions.

File snapshots, event histories, and job state should be migrated to transactional records or to an explicitly designed append-only archive. R2 may be evaluated for encrypted, versioned backup exports and immutable artifacts. A backup is not authoritative until its manifest, checksum, retention, and restore procedure have been exercised. R2 FUSE must not serve as the live SQLite filesystem. [5]

## Migration gates

1. **Inventory and contract:** map every active and optional store to its owner, retention requirement, encryption/signature rule, query pattern, transaction boundary, and source of truth. Preserve the local SQLite implementation for development while adding asynchronous persistence ports; the existing synchronous API cannot be swapped to a remote database driver without changing callers.
2. **Transport proof:** build a small staging-only Worker/container proof of concept. Exercise a single authenticated mutation and read through the exact proposed path. Verify that secrets do not enter logs or artifacts and that timeouts and retries cannot duplicate a write.
3. **Adapter conformance:** run the same contract suite against local SQLite and the cloud adapter. Include parallel ledger appends, duplicate idempotency keys, lease races and expiry, command-plus-event atomicity, revocation uniqueness, corrupt-history recovery, and expected failure behavior when the provider is unavailable.
4. **Migration rehearsal:** export a consistent source snapshot, import it once, and compare row counts, event ordering, command/idempotency indexes, revocations, and complete hash-chain verification. Repeat the export/import and restore from the backup artifact. Define an operator-controlled single-writer cutover and rollback before production data is involved.
5. **Readiness evidence:** test Container sleep, forced stop, rollout, and restart with the external store in use. Record measured recovery behavior and backup restore evidence. Keep `persistenceCoverage.complete` false until every surfaced store and backup/restore path has evidence.

A staged deployment is not a production authorization. No Cloudflare account, secret, database, or live deployment was changed while writing this proposal.

## References

[1]: https://developers.cloudflare.com/containers/concepts/architecture/ "Cloudflare Containers architecture"
[2]: https://developers.cloudflare.com/containers/faq/ "Cloudflare Containers frequently asked questions"
[3]: https://developers.cloudflare.com/d1/worker-api/d1-database/ "Cloudflare D1 Worker API"
[4]: https://developers.cloudflare.com/api/resources/d1/subresources/database/methods/query/ "Cloudflare D1 query API"
[5]: https://developers.cloudflare.com/containers/examples/r2-fuse-mount/ "Mount R2 buckets with FUSE"
