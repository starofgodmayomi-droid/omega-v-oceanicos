# Universal Builder OS Kernel

## Scope

The Universal Builder OS begins as a finite control-plane kernel rather than an unrestricted operating system. Its first slice provides lifecycle management, bounded task admission, deterministic event sequencing, and a read-only API snapshot. It does not execute arbitrary shell commands, mutate remote systems, handle credentials, deploy artifacts, or bypass human authorization.

## Lifecycle contract

| State      | Meaning                                               | Allowed transition         |
| ---------- | ----------------------------------------------------- | -------------------------- |
| `offline`  | Constructed but not started                           | `booting` through `boot()` |
| `booting`  | Startup event is being recorded                       | `ready` through `boot()`   |
| `ready`    | Tasks may be admitted and completed                   | `degraded`, `stopping`     |
| `degraded` | A safety boundary was reached, such as the task limit | `stopping`                 |
| `stopping` | Shutdown is being recorded                            | `stopped`                  |
| `stopped`  | Terminal state; admitted work has been cleared        | none                       |

Boot is idempotent. Stop is idempotent. Admission fails closed while offline or stopped and when the finite task bound has been reached. A task contains only a typed kind, copied input, and requesting identity. The current allowed kinds are `observe`, `verify`, `remember`, and `report`. Runtime admission also fails closed for unsupported task kinds, blank or overlong requester identities, and task inputs containing more than 64 top-level keys. These checks protect the runtime boundary even when callers bypass TypeScript compile-time types. Admitted inputs are deeply cloned and reject cyclic graphs or graphs deeper than 8 levels or larger than 256 object/array nodes, preventing retained kernel state from sharing mutable nested references with callers.

## Evidence and determinism

The kernel retains a bounded event trace. Rejected admissions are recorded as `reject` events with a bounded reason, so failed requests remain inspectable without creating work. Event sequence numbers are monotonic even when older entries are evicted. Task identifiers are deterministic within a kernel instance (`task-1`, `task-2`, and so on). Returned snapshots copy task inputs and event arrays so callers cannot mutate kernel state through an alias.

These properties are tested in `packages/mini/src/os.test.ts`, including lifecycle boundaries, task limits, stop behavior, trace eviction, deterministic identifiers, runtime admission validation, rejected-admission evidence, deep input isolation, finite input-graph rejection, and the explicit capability boundary.
The API contract test in `apps/api/src/__tests__/api.test.ts` verifies that `GET /os` returns a ready boot trace with no admitted work. SDK and CLI tests verify typed consumption, URL construction, bearer propagation, capability output, and operator-readable output.

## API surface

`GET /os` returns the repository's standard JSON envelope:

```json
{
  "data": {
    "state": "ready",
    "tasks": [],
    "events": [
      { "sequence": 1, "type": "boot", "state": "booting" },
      { "sequence": 2, "type": "boot", "state": "ready" }
    ],
    "capabilities": {
      "shellExecution": false,
      "remoteMutation": false,
      "credentialHandling": false,
      "humanAuthorizationRequired": true
    }
  },
  "timestamp": "..."
}
```

The endpoint is read-only. The SDK exposes the same contract through `OmegaClient.getOperatingSystem()`, the CLI exposes it through `omega os [--url URL] [--token TOKEN]`, and the web dashboard renders the snapshot as a non-authoritative Builder kernel panel. The CLI and Web surfaces expose the finite `maxTasks` and `maxEvents` bounds so operators can distinguish bounded capacity from an unbounded runtime. The SDK now exposes the same four authoritative task kinds as the MINI kernel through `OperatingSystemTaskKind`; the previously stale SDK-only `recompile` member is no longer accepted by the typed contract.
The dashboard’s control-room ribbon explicitly labels `ROOT: LOCAL`, `MODE: READ-ONLY`, and `AUTHORITY: HUMAN-GATED`; these are interface labels, not proof of external execution or authorization. The Builder kernel panel also renders the latest bounded event type and any recorded rejection reason, so operators can distinguish a successful boot trace from a rejected request without treating the panel as an execution control.
All surfaces preserve the read bearer boundary and return failure rather than treating an unavailable snapshot as empty evidence. Future mutation endpoints must use explicit typed commands, policy checks, audit events, and a human authorization gate before any remote or consequential action.

## Earned runtime expansions

The merged repository now includes two bounded expansion packages that complement this control-plane kernel. `@omega-v/coordination` models local parallel worker and builder contracts with explicit concurrency and audit limits; `@omega-v/runtime` models a sequential agent loop and bounded append-only memory fabric. Their package contracts are independently tested and buildable, and their inventory is documented in `packages/README.md`. They remain local library surfaces: they do not execute shell commands, perform remote mutations, handle credentials, deploy artifacts, or replace the kernel's human-authorization boundary.

## Verification status

The slice was implemented in isolated worktree `/tmp/omega-os-kernel-slice` from base `55e8a952`. The latest local verification passed formatting, lint, TypeScript no-emit checking, the full Jest suite, the focused OS/API/SDK/CLI/Web contracts, the full workspace build, and API smoke. The smoke output reported `health: ready`, `deterministic: true`, `terminalState: return`, and `verified: false`. Full local verification proves only this isolated worktree and does not establish hosted CI, deployment, distributed consistency, or external execution.

## Lineage and rollback

The web-panel continuation is locally verified in `/tmp/omega-os-kernel-slice` and is not yet published. The earlier OS/API/SDK/CLI commits are present on PR #219, but the current session’s GitHub connector is disabled, so remote status cannot be refreshed here. This work remains not a claim about `main`, a merged pull request, a deployment, or production behavior. Rollback is deleting the isolated worktree changes or resetting the unpublished local commit. Push, pull-request publication, merge, and deployment require explicit human authorization.
