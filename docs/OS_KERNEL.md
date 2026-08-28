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

Boot is idempotent. Stop is idempotent. Admission fails closed while offline or stopped and when the finite task bound has been reached. A task contains only a typed kind, copied input, and requesting identity. The current allowed kinds are `observe`, `verify`, `remember`, `report`, and `recompile`.

## Evidence and determinism

The kernel retains a bounded event trace. Event sequence numbers are monotonic even when older entries are evicted. Task identifiers are deterministic within a kernel instance (`task-1`, `task-2`, and so on). Returned snapshots copy task inputs and event arrays so callers cannot mutate kernel state through an alias.

These properties are tested in `packages/mini/src/os.test.ts`, including lifecycle boundaries, task limits, stop behavior, trace eviction, and deterministic identifiers. The API contract test in `apps/api/src/__tests__/api.test.ts` verifies that `GET /os` returns a ready boot trace with no admitted work.

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
    ]
  },
  "timestamp": "..."
}
```

The endpoint is read-only. Future mutation endpoints must use explicit typed commands, policy checks, audit events, and a human authorization gate before any remote or consequential action.

## Verification status

The slice was implemented in isolated worktree `/tmp/omega-os-kernel-slice` from base `55e8a952`. Formatting, lint, TypeScript no-emit checking, focused API/kernel tests, build, and API smoke passed. The smoke output reported `health: ready`, `deterministic: true`, `terminalState: return`, and `verified: false`. A post-integration full-suite rerun was interrupted before an aggregate result; therefore no claim of a completed full-suite attestation is made here.

## Lineage and rollback

This work remains unpublished and is not a claim about `main`, CI, a merged pull request, a deployment, or production behavior. The isolated worktree preserves the base lineage. Rollback is deleting the isolated worktree changes or resetting the unpublished local commit. Push, pull-request publication, merge, and deployment require explicit human authorization.
